import { Sparkles } from 'lucide-react';
import type { FitLabel } from '../domain/types';
export function FitBadge({ fit, label }: { fit?: FitLabel; label?: FitLabel }) {
  const value = fit ?? label ?? 'POSSIBLE FIT';
  return <span className={`fit-badge ${value === 'GREAT FIT' ? 'fit-great' : value === 'STRONG FIT' ? 'fit-strong' : 'fit-possible'}`}><Sparkles size={12} aria-hidden="true" />{value}</span>;
}
export default FitBadge;
