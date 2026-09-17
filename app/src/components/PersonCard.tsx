import { useState } from 'react';
import { ArrowUpRight, Check, MapPin, Sparkles } from 'lucide-react';
import type { MatchResult } from '../domain/types';
import { interestLabel } from '../domain/ontology';
import { useActions, useBlockedIds, useConnections, useMe, useRequests } from '../repo/store';
import { navigate } from '../routerStore';
import { Avatar } from './Avatar';
import { FitBadge } from './FitBadge';
import { Sheet } from './Sheet';
export function PersonCard({ match, compact = false }: { match: MatchResult; compact?: boolean }) {
  const { user, reasons } = match;
  const actions = useActions(); const me = useMe(); const blocked = useBlockedIds(); const requests = useRequests(); const connections = useConnections();
  const [open, setOpen] = useState(false); const [why, setWhy] = useState(''); const [error, setError] = useState('');
  const pending = requests.some(r => r.status === 'pending' && ((r.fromUserId === me.id && r.toUserId === user.id) || (r.toUserId === me.id && r.fromUserId === user.id)));
  const connected = connections.some(c => [c.aUserId, c.bUserId].includes(me.id) && [c.aUserId, c.bUserId].includes(user.id));
  const disabled = !!(me.suspended || user.suspended || blocked.includes(user.id));
  const run = (fn: () => void) => { try { fn(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); } };
  return <article className="card p-5 space-y-4">
    <div className="flex items-start justify-between gap-2"><FitBadge fit={match.fit} /><span className="eyebrow">A little more in common</span></div>
    <button className="flex items-center text-left gap-3 w-full min-h-11" onClick={() => navigate('user', user.id)}><Avatar user={user} size={compact ? 48 : 58} /><span className="min-w-0"><span className="block text-lg font-bold">{user.name}</span><span className="block text-sm" style={{ color: 'var(--text-2)' }}>{user.headline}</span>{user.privacy.showCity && user.city && <span className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--text-3)' }}><MapPin size={12} />{user.city}</span>}</span></button>
    {!compact && <><p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{user.currently || user.bio}</p><div className="flex flex-wrap gap-2">{user.interests.slice(0, 3).map(id => <span key={id} className="chip" style={{ cursor: 'default' }}>{interestLabel(id)}</span>)}</div></>}
    <div className="rounded-xl p-3 text-sm space-y-2" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>{reasons.slice(0, compact ? 1 : 2).map((r, i) => <p key={i} className="flex gap-2"><Sparkles size={15} className="shrink-0 mt-1" />{r.text}</p>)}{!reasons.length && <p>Explore what you could learn or build together.</p>}</div>
    {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
    <div className="flex gap-2"><button className="btn btn-primary flex-1" disabled={disabled || pending || connected} onClick={() => { setWhy(reasons.slice(0, 2).map(r => r.text).join(' ') || `I'd like to learn more about ${user.currently || user.headline}.`); setOpen(true); }}>{pending ? <><Check size={16} />Requested</> : connected ? 'Connected' : 'Connect'}</button><button className="btn btn-secondary flex-1" onClick={() => navigate('user', user.id)}>View profile<ArrowUpRight size={16} /></button></div>
    {!connected && !pending && <button className="btn btn-ghost w-full" disabled={disabled} onClick={() => run(() => actions.connections.pass(user.id))}>Maybe later</button>}
    <Sheet open={open} onClose={() => setOpen(false)} title={`Connect with ${user.name.split(' ')[0]}`}><form className="space-y-4" onSubmit={e => { e.preventDefault(); run(() => { actions.connections.request(user.id, why); setOpen(false); }); }}><p className="text-sm" style={{ color: 'var(--text-2)' }}>Good connections start with a reason. Make this one your own.</p><label className="block text-sm font-medium">Why would you like to connect?<textarea className="input mt-2" rows={5} maxLength={1000} value={why} onChange={e => setWhy(e.target.value)} required /></label>{error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}<button className="btn btn-primary w-full" disabled={!why.trim() || disabled}>Send connection request</button></form></Sheet>
  </article>;
}
export default PersonCard;
