import { useId, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { prepareImage } from '../services/image';

type Props = { label: string; value: string; onChange: (value: string) => void; onBusyChange?: (busy: boolean) => void; variant?: 'avatar' | 'photo' };
export function ImageUpload({ label, value, onChange, onBusyChange, variant = 'photo' }: Props) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  return <div className="space-y-3 rounded-2xl border border-[var(--line)] p-4">
    <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold"><ImagePlus size={18} />{label}</label>
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="block w-full min-w-0 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--accent-soft)] file:px-4 file:py-3 file:font-semibold file:text-[var(--accent-text)]" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file) return;
      const token = ++sequence.current;
      setError(''); setBusy(true); onBusyChange?.(true);
      try { const image = await prepareImage(file, variant); if (token === sequence.current) onChange(image); }
      catch (cause) { if (token === sequence.current) setError(cause instanceof Error ? cause.message : 'Could not prepare this image.'); }
      finally { if (token === sequence.current) { setBusy(false); onBusyChange?.(false); } }
    }} />
    <p className="text-xs leading-relaxed text-[var(--text-2)]">JPEG, PNG or WebP · up to 10 MB. Resized and saved only in this browser, not uploaded to a server.</p>
    {busy && <p role="status" className="text-sm">Preparing photo…</p>}
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    {value && <div className="space-y-2">
      {variant === 'photo' && <img src={value} alt={`${label} preview`} className="max-h-72 w-full rounded-xl object-contain bg-[var(--surface-2)]" />}
      <button type="button" disabled={busy} className="btn btn-ghost !text-sm" onClick={() => { onChange(''); setError(''); }}><X size={16} />Remove {variant === 'avatar' ? 'profile photo' : 'photo'}</button>
    </div>}
  </div>;
}
