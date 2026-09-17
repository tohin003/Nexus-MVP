import { Compass, LoaderCircle } from 'lucide-react';
export function EmptyState({ title, description, actionLabel, onAction, loading = false }: { title: string; description?: string; actionLabel?: string; onAction?: () => void; loading?: boolean }) {
  return <section className="card p-6 text-center" role={loading ? 'status' : undefined}>
    {loading ? <LoaderCircle className="mx-auto mb-3" size={28} /> : <Compass className="mx-auto mb-3" size={28} style={{ color: 'var(--accent)' }} />}
    <h3 className="font-semibold text-lg">{title}</h3>
    {description && <p className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>{description}</p>}
    {actionLabel && onAction && <button className="btn btn-secondary mt-4" onClick={onAction}>{actionLabel}</button>}
    {loading && <div className="skeleton h-3 mt-4" />}
  </section>;
}
export default EmptyState;
