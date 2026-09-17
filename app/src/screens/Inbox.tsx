import { useState } from 'react';
import { ArrowLeft, Bell, ChevronRight, MessageCircle, VolumeX } from 'lucide-react';
import { useActions, useNexus } from '../repo/store';
import { navigate, useRoute } from '../routerStore';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';

function timestamp(at: number) {
  const today = new Date(at).toDateString() === new Date().toDateString();
  return new Date(at).toLocaleString(undefined, today ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric' });
}

export function Inbox() {
  const actions = useActions();
  const state = useNexus();
  const { route } = useRoute();
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'messages' | 'requests'>(route.param === 'requests' ? 'requests' : 'messages');
  const me = state.users.find(user => user.id === state.meId);
  const locked = !state.signedIn || !me || !!me.suspended;
  const pending = state.requests.filter(request => request.status === 'pending' && (request.fromUserId === state.meId || request.toUserId === state.meId));
  const incoming = pending.filter(request => request.toUserId === state.meId);
  const outgoing = pending.filter(request => request.fromUserId === state.meId);
  const conversations = state.conversations.filter(conversation => conversation.memberIds.includes(state.meId)).map(conversation => {
    const user = state.users.find(person => person.id === conversation.memberIds.find(id => id !== state.meId));
    const messages = state.messages.filter(message => message.conversationId === conversation.id).sort((a, b) => a.createdAt - b.createdAt);
    return { conversation, user, latest: messages.at(-1), unread: messages.filter(message => message.senderId !== state.meId && message.readAt === null).length };
  }).sort((a, b) => (b.latest?.createdAt ?? b.conversation.createdAt) - (a.latest?.createdAt ?? a.conversation.createdAt));
  const run = (action: () => void) => {
    setError('');
    try { action(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.'); }
  };

  return <main className="space-y-6 px-5 pt-5 pb-8">
    <header className="flex items-center gap-2">
      <button className="btn btn-ghost min-w-11 !px-2" aria-label="Back to Home" onClick={() => navigate('home')}><ArrowLeft size={21} /></button>
      <div className="flex-1"><p className="eyebrow">Good things start here</p><h1 className="text-3xl font-bold tracking-tight">Inbox</h1></div>
      <button className="btn btn-secondary min-w-11 !px-2" aria-label="Notifications" onClick={() => navigate('notifications')}><Bell size={20} /></button>
    </header>
    <p className="text-sm leading-relaxed text-[var(--text-2)]">Less small talk. More reasons to connect.</p>
    {locked && <p role="status" className="rounded-2xl bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">{me?.suspended ? 'Your account is suspended. Messaging and requests are unavailable.' : 'Sign in to manage conversations and requests.'}</p>}
    {error && <p role="alert" className="rounded-2xl bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">{error}</p>}
    <div role="tablist" aria-label="Inbox sections" className="flex gap-2 rounded-2xl bg-[var(--surface-2)] p-1">
      {(['messages', 'requests'] as const).map(name => <button key={name} id={`inbox-${name}`} role="tab" aria-selected={tab === name} aria-controls={`inbox-panel-${name}`} onClick={() => setTab(name)} className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold ${tab === name ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-2)]'}`}>
        {name === 'messages' ? 'Messages' : `Requests${incoming.length ? ` · ${incoming.length}` : ''}`}
      </button>)}
    </div>
    <section id={`inbox-panel-${tab}`} role="tabpanel" aria-labelledby={`inbox-${tab}`} className="space-y-3">
      {tab === 'messages' ? <>
        {conversations.length === 0 && <EmptyState title="Your next conversation starts with a reason" description="Find someone whose skills and goals complement yours, then send a thoughtful connection request." actionLabel="Discover people" onAction={() => navigate('discover')} />}
        {conversations.map(({ conversation, user, latest, unread }) => {
          const isBlocked = state.blockedUsers.some(item => item.userId === user?.id);
          const unavailable = locked || !user || user.suspended || isBlocked;
          return <button key={conversation.id} disabled={!!unavailable} onClick={() => run(() => { actions.messages.markRead(conversation.id); navigate('chat', conversation.id); })} className="card flex min-h-24 w-full items-center gap-3 p-4 text-left disabled:cursor-not-allowed disabled:opacity-60" aria-label={`${user?.name ?? 'Unavailable person'}${unread ? `, ${unread} unread messages` : ''}${unavailable ? ', unavailable' : ''}`}>
            {user ? <Avatar user={user} size={50} /> : <MessageCircle size={40} />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2"><h2 className="truncate font-semibold">{user?.name ?? 'Unavailable person'}</h2><time dateTime={new Date(latest?.createdAt ?? conversation.createdAt).toISOString()} className="shrink-0 text-[11px] text-[var(--text-2)]">{timestamp(latest?.createdAt ?? conversation.createdAt)}</time></div>
              <p className={`mt-1 line-clamp-2 text-sm ${unread ? 'text-[var(--text)]' : 'text-[var(--text-2)]'}`}>{isBlocked ? 'You blocked this person.' : user?.suspended ? 'This account is unavailable.' : latest ? `${latest.senderId === state.meId ? 'You: ' : latest.senderId === 'nexus' ? 'NEXUS: ' : ''}${latest.text}` : 'Your introduction is ready. Say hello.'}</p>
              <div className="mt-2 flex items-center gap-2">{conversation.muted && <span className="inline-flex items-center gap-1 text-xs text-[var(--text-2)]"><VolumeX size={12} />Muted</span>}{unread > 0 && !unavailable && <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--accent-text)]">{unread} new</span>}</div>
            </div>
            <ChevronRight size={16} className="shrink-0 text-[var(--text-2)]" />
          </button>;
        })}
      </> : <>
        <h2 className="text-lg font-bold">People reaching out <span className="text-[var(--text-2)]">· {incoming.length}</span></h2>
        {incoming.length === 0 && <EmptyState title="No new requests" description="Thoughtful introductions will appear here. You decide who to connect with." />}
        {[{ title: '', requests: incoming, isOutgoing: false }, { title: 'Sent requests', requests: outgoing, isOutgoing: true }].map(group => <div key={group.isOutgoing ? 'outgoing' : 'incoming'} className="space-y-3">
          {group.title && <h2 className="pt-4 text-lg font-bold">{group.title} <span className="text-[var(--text-2)]">· {group.requests.length}</span></h2>}
          {group.requests.map(request => {
            const user = state.users.find(person => person.id === (group.isOutgoing ? request.toUserId : request.fromUserId));
            const unavailable = locked || !user || user.suspended || state.blockedUsers.some(item => item.userId === user.id);
            return <article key={request.id} className="card space-y-3 p-4">
              <div className="flex items-center gap-3">{user && <Avatar user={user} size={44} />}<div className="min-w-0 flex-1"><h3 className="font-semibold">{user?.name ?? 'Unavailable person'}</h3><p className="truncate text-xs text-[var(--text-2)]">{user?.headline}</p></div><time className="shrink-0 text-xs text-[var(--text-2)]" dateTime={new Date(request.createdAt).toISOString()}>{timestamp(request.createdAt)}</time></div>
              <p className="text-sm leading-relaxed text-[var(--text-2)]">“{request.why}”</p>
              {unavailable && <p className="text-xs text-[var(--danger)]">This request is unavailable while an account is blocked, suspended, or signed out.</p>}
              {group.isOutgoing ? <div className="space-y-2 rounded-xl bg-[var(--accent-soft)] p-3"><p className="text-xs leading-relaxed text-[var(--accent-text)]"><strong>Demo preview.</strong> Waiting for a reply. In this local demo, you can simulate their acceptance to explore the introduction and chat. No real person is accepting.</p><button disabled={!!unavailable} className="btn btn-secondary w-full !text-sm" onClick={() => run(() => { const conversation = actions.connections.demoAcceptOutgoing(request.id); navigate('chat', conversation.id); })}>Accept as {user?.name.split(' ')[0] ?? 'recipient'} (demo)</button></div> : <div className="flex gap-2"><button disabled={!!unavailable} className="btn btn-primary flex-1" onClick={() => run(() => { const conversation = actions.connections.accept(request.id); navigate('chat', conversation.id); })}>Accept & chat</button><button disabled={!!unavailable} className="btn btn-secondary" onClick={() => run(() => actions.connections.pass(request.id))}>Pass</button></div>}
            </article>;
          })}
          {group.isOutgoing && group.requests.length === 0 && <p className="text-sm text-[var(--text-2)]">No requests waiting for a reply. Find your next collaborator in Discover.</p>}
        </div>)}
      </>}
    </section>
  </main>;
}

export default Inbox;
