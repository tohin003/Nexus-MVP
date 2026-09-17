import { useState } from 'react';
import { ArrowUpRight, Users, Target } from 'lucide-react';
import type { Circle } from '../domain/types';
import { useActions, useMe } from '../repo/store';
import { navigate } from '../routerStore';
export function CircleCard({ circle }: { circle: Circle }) {
  const me = useMe(); const actions = useActions(); const [error, setError] = useState('');
  const joined = circle.memberIds.includes(me.id); const owner = circle.ownerUserId === me.id;
  const ended = circle.endDate !== null && circle.endDate <= Date.now(); const full = circle.memberIds.length >= circle.memberLimit;
  return <article className="card p-5 space-y-3"><button className="flex gap-3 items-center text-left w-full min-h-11" onClick={() => navigate('circle', circle.id)}><span className="text-3xl rounded-xl p-2" style={{ background: 'var(--accent-soft)' }}>{circle.emoji}</span><span className="flex-1"><span className="eyebrow block">{circle.category} · Day {circle.dayNumber}</span><span className="font-bold text-lg">{circle.name}</span></span><ArrowUpRight size={18} /></button><p className="text-sm" style={{ color: 'var(--text-2)' }}>{circle.purpose}</p><p className="text-sm flex gap-2" style={{ color: 'var(--accent-text)' }}><Target size={16} className="shrink-0 mt-1" />{circle.goal}</p><div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}><Users size={15} />{circle.memberIds.length} / {circle.memberLimit} people · {circle.city || 'Anywhere'}</div>{error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}<div className="flex gap-2"><button className="btn btn-secondary flex-1" onClick={() => navigate('circle', circle.id)}>Explore circle</button><button className={`btn ${joined ? 'btn-ghost' : 'btn-primary'}`} disabled={me.suspended || owner || (!joined && (ended || full || circle.privacy !== 'open'))} onClick={() => { try { if (joined) actions.circles.leave(circle.id); else actions.circles.join(circle.id); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update membership.'); } }}>{owner ? 'Your circle' : joined ? 'Leave' : ended ? 'Ended' : full ? 'Full' : circle.privacy !== 'open' ? 'Invite only' : 'Join'}</button></div></article>;
}
export default CircleCard;
