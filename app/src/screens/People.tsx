import { ArrowLeft, Sparkles } from 'lucide-react';
import { useBlockedIds, useConnections, useIntents, useMe, usePassedIds, useUsers } from '../repo/store';
import { matchPeople } from '../services/intelligence';
import { navigate } from '../routerStore';
import { PersonCard } from '../components/PersonCard';
import { EmptyState } from '../components/EmptyState';
export function People({ search = '', embedded = false, limit }: { search?: string; embedded?: boolean; limit?: number }) {
  const me = useMe(); const users = useUsers(); const intents = useIntents(); const blocked = useBlockedIds(); const passed = usePassedIds(); const connections = useConnections();
  if (!me) return <EmptyState loading title="Finding your people…" />;
  const connectedIds = connections.filter(c => [c.aUserId, c.bUserId].includes(me.id)).flatMap(c => [c.aUserId, c.bUserId]);
  const matches = matchPeople(me, users, intents, [...blocked, ...passed, ...connectedIds]).filter(({ user }) => `${user.name} ${user.headline} ${user.currently} ${user.interests.join(' ')} ${user.skills.join(' ')}`.toLowerCase().includes(search.toLowerCase())).slice(0, limit);
  return <div className={embedded ? 'space-y-4' : 'p-5 pb-8 space-y-5'}>{!embedded && <><button className="btn btn-ghost px-0" onClick={() => navigate('home')}><ArrowLeft size={18} />Back to today</button><header><div className="eyebrow flex gap-2 items-center"><Sparkles size={14} />Real reasons. New possibilities.</div><h1 className="text-3xl font-bold tracking-tight mt-2">People you should know</h1><p className="text-sm mt-3" style={{ color: 'var(--text-2)' }}>Not more people. The right people to learn, build, and grow with.</p></header><div className="nexus-line" /></>}{matches.map(match => <PersonCard key={match.user.id} match={match} />)}{matches.length === 0 && <EmptyState title={me.suspended ? 'Account access limited' : search ? 'No people found' : 'A little space for new possibilities'} description={me.suspended ? 'Your account is suspended. You can still view your passport and settings.' : search ? 'Try another name, interest, or skill.' : 'You’ve explored your current suggestions. Update your intent to find new common ground.'} actionLabel={me.suspended ? 'My passport' : 'Share an intent'} onAction={() => navigate(me.suspended ? 'me' : 'create')} />}</div>;
}
export default People;
