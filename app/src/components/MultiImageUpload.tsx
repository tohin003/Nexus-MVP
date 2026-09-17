import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, X } from 'lucide-react';
import { MAX_POST_PHOTOS, prepareImages } from '../services/image';

export function MultiImageUpload({ label, value, onChange, onBusyChange, limit = MAX_POST_PHOTOS }: { label: string; value: string[]; onChange: (value: string[]) => void; onBusyChange?: (busy: boolean) => void; limit?: number }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current += 1; onBusyChange?.(false); }, [onBusyChange]);
  function move(index: number, delta: number) {
    const next = [...value];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  }
  return <fieldset className="min-w-0 space-y-3 rounded-2xl border border-[var(--line)] p-4" disabled={busy} aria-busy={busy}>
    <legend className="px-1 text-sm font-semibold">{label}</legend>
    <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold"><ImagePlus size={18} />{value.length ? 'Add more photos' : 'Choose photos'} <span className="ml-auto text-xs">{value.length}/{limit}</span></label>
    <input id={id} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy || value.length >= limit} className="block w-full min-w-0 text-sm file:mr-2 file:rounded-xl file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-3 file:font-semibold file:text-[var(--accent-text)]" onChange={async event => {
      const files = Array.from(event.target.files ?? []); event.target.value = '';
      if (!files.length) return;
      const token = ++sequence.current;
      setError(''); setBusy(true); onBusyChange?.(true);
      try { const prepared = await prepareImages(files, limit - value.length); if (token === sequence.current) onChange([...value, ...prepared]); }
      catch (cause) { if (token === sequence.current) setError(cause instanceof Error ? cause.message : 'Could not prepare these photos. No photos were added.'); }
      finally { if (token === sequence.current) { setBusy(false); onBusyChange?.(false); } }
    }} />
    <p className="text-xs leading-relaxed text-[var(--text-2)]">Select multiple files at once, or add more later. JPEG, PNG or WebP · 10 MB each · 80 MB per selection · up to {limit} photos. Resized locally; saved only in this browser.</p>
    {busy && <p role="status" className="text-sm">Preparing photos… Your selection is added only when every photo is ready.</p>}
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error} Your existing selection is unchanged.</p>}
    {!!value.length && <><p className="text-xs text-[var(--text-2)]">Order shown below is the publishing order. Use the arrow buttons to reorder.</p><ol className="grid grid-cols-2 gap-3">{value.map((photo, index) => <li key={`${index}-${photo.slice(-24)}`} className="min-w-0 rounded-xl bg-[var(--surface-2)] p-2">
      <img src={photo} alt={`Selected photo ${index + 1}`} className="h-24 w-full rounded-lg object-cover" />
      <p className="mt-1 text-center text-xs font-semibold">{index + 1}{index === 0 ? ' · First' : ''}</p>
      <div className="flex justify-center"><button type="button" className="min-h-11 min-w-9 rounded-lg" disabled={busy || index === 0} aria-label={`Move photo ${index + 1} earlier`} onClick={() => move(index, -1)}><ArrowLeft size={16} className="mx-auto" /></button><button type="button" className="min-h-11 min-w-9 rounded-lg" aria-label={`Remove photo ${index + 1}`} onClick={() => { onChange(value.filter((_, i) => i !== index)); setError(''); }}><X size={16} className="mx-auto" /></button><button type="button" className="min-h-11 min-w-9 rounded-lg" disabled={busy || index === value.length - 1} aria-label={`Move photo ${index + 1} later`} onClick={() => move(index, 1)}><ArrowRight size={16} className="mx-auto" /></button></div>
    </li>)}</ol></>}
  </fieldset>;
}
