import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export type ModalProps = { open: boolean; onClose: () => void; title: string; children: ReactNode; sheet?: boolean };
export function Modal({ open, onClose, title, children, sheet = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return <dialog ref={ref} aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} style={{ width: 'min(94vw, 430px)', maxHeight: '85dvh', padding: 0, border: '1px solid var(--line)', borderRadius: sheet ? '24px 24px 16px 16px' : 24, background: 'var(--surface)', color: 'var(--text)', margin: sheet ? 'auto auto 16px' : 'auto', boxShadow: 'var(--shadow-float)' }}>
    <div className="p-5"><header className="flex items-center justify-between gap-3 mb-4"><h2 id={heading} className="text-xl font-bold">{title}</h2><button className="btn btn-ghost px-3" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header>{children}</div>
  </dialog>;
}
export default Modal;
