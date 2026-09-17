export const MAX_MEDIA_LENGTH = 220_000;
export const isUploadedImage = (value: string) => /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
export function validateMedia(value: string): void {
  if (!isUploadedImage(value) || value.length > MAX_MEDIA_LENGTH) throw new Error('Choose a photo using the upload control (maximum 160 KB after resizing).');
}

/** Decode locally, strip metadata and re-encode a bounded JPEG. No network upload. */
export async function prepareImage(file: File, variant: 'avatar' | 'photo' = 'photo'): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
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
      if (result.length <= MAX_MEDIA_LENGTH) { validateMedia(result); return result; }
      edge = Math.round(edge * 0.75);
    }
    throw new Error('This photo is too detailed for demo storage. Try a smaller image.');
  } finally { URL.revokeObjectURL(url); }
}
