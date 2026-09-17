export const MAX_MEDIA_LENGTH = 220_000;
/** Feed matches Instagram's 20-photo limit. Story batch 20 is a NEXUS choice, not an Instagram claim. */
export const MAX_POST_PHOTOS = 20;
export const MAX_STORY_BATCH = 20;
export const MAX_BATCH_SOURCE_BYTES = 80 * 1024 * 1024;
export const postPhotos = (post: { photos?: string[]; photo?: string }): string[] => post.photos ?? (post.photo ? [post.photo] : []);

export function validateMediaBatch(values: readonly string[], limit = MAX_POST_PHOTOS, required = false): void {
  if (!Array.isArray(values) || values.length > limit || (required && !values.length)) throw new Error(`Choose ${required ? '1–' : 'up to '}${limit} photos.`);
  values.forEach(validateMedia);
}

/** Validate the entire selection first, then decode sequentially to bound memory; publish only on success. */
export async function prepareImages(files: File[], remaining = MAX_POST_PHOTOS): Promise<string[]> {
  if (!files.length || files.length > remaining) throw new Error(`You can add ${remaining} more photo${remaining === 1 ? '' : 's'} (20 total).`);
  files.forEach(validateImageFile);
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_BATCH_SOURCE_BYTES) throw new Error('Choose a batch under 80 MB total.');
  const result: string[] = [];
  for (const file of files) result.push(await prepareImage(file, 'photo', Math.min(MAX_MEDIA_LENGTH, Math.floor(1_200_000 / files.length))));
  return result;
}

function validateImageFile(file: File): void {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
}
export const isUploadedImage = (value: string) => /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
export function validateMedia(value: string): void {
  if (!isUploadedImage(value) || value.length > MAX_MEDIA_LENGTH) throw new Error('Choose a photo using the upload control (maximum 160 KB after resizing).');
}

/** Decode locally, strip metadata and re-encode a bounded JPEG. No network upload. */
export async function prepareImage(file: File, variant: 'avatar' | 'photo' = 'photo', maxLength = MAX_MEDIA_LENGTH): Promise<string> {
  validateImageFile(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new Error('This image could not be read. Try another JPEG, PNG, or WebP.'); }
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Choose a photo under 40 megapixels.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    let edge = variant === 'avatar' ? 384 : 1200;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL('image/jpeg', 0.78 - attempt * 0.08);
      if (result.length <= maxLength) { validateMedia(result); return result; }
      edge = Math.round(edge * 0.75);
    }
    throw new Error('This photo is too detailed for demo storage. Try a smaller image.');
  } finally { URL.revokeObjectURL(url); }
}
