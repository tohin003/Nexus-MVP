import { useState } from 'react';
import { ArrowUpRight, Check, Target } from 'lucide-react';
import type { Intent } from '../domain/types';
import { skillLabel } from '../domain/ontology';
import { useActions, useBlockedIds, useMe, useUser } from '../repo/store';
import { navigate } from '../routerStore';
import { Avatar } from './Avatar';
export function IntentCard({ intent }: { intent: Intent }) {
  const user = useUser(intent.userId); const me = useMe(); const blocked = useBlockedIds(); const actions = useActions(); const [error, setError] = useState('');
  if (!user || user.suspended || blocked.includes(user.id) || (intent.visibility !== 'public' && user.id !== me.id)) return null;
  const expired = intent.expiresAt !== null && intent.expiresAt <= Date.now();
  return <article className="card p-5 space-y-3"><div className="eyebrow flex gap-2 items-center" style={{ color: 'var(--accent-text)' }}><Target size={15} />{intent.interpretation.intentType.replace(/-/g, ' ')}</div><h3 className="text-lg font-bold">{intent.title}</h3><p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{intent.details || intent.originalText}</p><div className="flex flex-wrap gap-2">{intent.interpretation.skillsNeeded.slice(0, 3).map(s => <span className="chip" style={{ cursor: 'default' }} key={s}>{skillLabel(s)}</span>)}</div><p className="text-xs" style={{ color: 'var(--text-3)' }}>{intent.interpretation.location} · {intent.interpretation.remoteAllowed ? 'Remote welcome' : 'In person'}{intent.interpretation.compensation === 'paid' ? ' · Paid' : ''}</p><button className="flex items-center gap-2 min-h-11 text-sm" onClick={() => navigate('user', user.id)}><Avatar user={user} size={30} />{user.name}<ArrowUpRight size={14} /></button>{error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}{user.id !== me.id && <button className="btn btn-primary w-full" disabled={me.suspended || intent.interestedByMe || expired || !['active', 'matched'].includes(intent.status)} onClick={() => { try { actions.intents.expressInterest(intent.id); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Could not express interest. Try again.'); } }}>{intent.interestedByMe ? <><Check size={16} />Interest shared</> : expired ? 'Opportunity ended' : "I'm interested"}</button>}</article>;
}
export default IntentCard;
