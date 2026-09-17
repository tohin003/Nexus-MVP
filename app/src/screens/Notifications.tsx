import { useState } from 'react';
import { ArrowLeft, Bell, CheckCheck, ChevronRight, CircleUserRound, MessageCircle, Sparkles, Target, UserPlus, Users } from 'lucide-react';
import type { Notification, NotificationKind } from '../domain/types';
import { useActions, useNexus } from '../repo/store';
import { navigate } from '../routerStore';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';

const kinds: Record<NotificationKind, { label: string; action: string; icon: typeof Bell }> = {
  'connection-request': { label: 'Connection request', action: 'Review requests', icon: UserPlus },
  'connection-accepted': { label: 'Connection accepted', action: 'Say hello', icon: CircleUserRound },
  'new-message': { label: 'New message', action: 'Open conversation', icon: MessageCircle },
  'intent-response': { label: 'Intent response', action: 'Meet this person', icon: Target },
  'new-match': { label: 'New match', action: 'See why you fit', icon: Sparkles },
  'circle-invite': { label: 'Circle invitation', action: 'Explore circle', icon: Users },
};
function timestamp(at: number) {
  const date = new Date(at);
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function Notifications() {
  const actions = useActions();
  const state = useNexus();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const me = state.users.find(user => user.id === state.meId);
  const locked = !state.signedIn || !me || !!me.suspended;
  const notifications = [...state.notifications].sort((a, b) => b.createdAt - a.createdAt);
  const unreadCount = notifications.filter(item => !item.read).length;
  const visible = notifications.filter(item => filter === 'all' || !item.read);
  const run = (action: () => void) => {
    setError(''); setFeedback('');
    try { action(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.'); }
  };
  const open = (notification: Notification) => run(() => {
    const meta = notification.meta;
    const userId = meta?.userId ?? notification.actorUserId ?? undefined;
    switch (notification.kind) {
      case 'connection-request':
        navigate('inbox', 'requests');
        break;
      case 'connection-accepted':
      case 'new-message': {
        const conversation = state.conversations.find(item => item.memberIds.includes(state.meId) && (meta?.conversationId ? item.id === meta.conversationId : !!userId && item.memberIds.includes(userId)));
        if (conversation) { actions.messages.markRead(conversation.id); navigate('chat', conversation.id); }
        else navigate('inbox');
        break;
      }
      case 'intent-response': {
        const owner = state.intents.find(intent => intent.id === meta?.intentId)?.userId;
        const target = userId ?? owner;
        if (target) navigate(target === state.meId ? 'me' : 'user', target === state.meId ? undefined : target);
        else navigate('discover');
        break;
      }
      case 'new-match':
        if (userId) navigate('user', userId);
        else navigate('discover');
        break;
      case 'circle-invite':
        if (meta?.circleId && state.circles.some(circle => circle.id === meta.circleId)) navigate('circle', meta.circleId);
        else navigate('circles');
        break;
    }
  });

  return <main className="space-y-6 px-5 pt-5 pb-8">
    <header className="flex items-center gap-2"><button className="btn btn-ghost min-w-11 !px-2" aria-label="Back to Home" onClick={() => navigate('home')}><ArrowLeft size={21} /></button><div className="min-w-0 flex-1"><p className="eyebrow">Your world, moving forward</p><h1 className="text-[28px] font-bold tracking-tight">Notifications</h1></div><span aria-label={`${unreadCount} unread notifications`} className="grid h-11 min-w-11 place-items-center rounded-2xl bg-[var(--accent-soft)] px-2 font-bold text-[var(--accent-text)]">{unreadCount}</span></header>
    <p className="text-sm leading-relaxed text-[var(--text-2)]">New connections, thoughtful replies, and a few possibilities worth your time.</p>
    {locked && <p role="status" className="rounded-2xl bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">{me?.suspended ? 'Your account is suspended. Notification actions are unavailable.' : 'Sign in to open notifications and mark them as read.'}</p>}
    {error && <p role="alert" className="rounded-2xl bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">{error}</p>}
    {feedback && <p role="status" className="text-sm text-[var(--accent-text)]">{feedback}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1 rounded-2xl bg-[var(--surface-2)] p-1" role="group" aria-label="Filter notifications"><button className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${filter === 'all' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-2)]'}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button><button className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${filter === 'unread' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-2)]'}`} aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>Unread</button></div>
      <button disabled={locked || unreadCount === 0} className="btn btn-ghost !px-2 !text-xs" onClick={() => run(() => { actions.notifications.markAllRead(); setFeedback('All notifications marked as read.'); })}><CheckCheck size={17} />Mark all read</button>
    </div>
    {visible.length === 0 ? <EmptyState title={filter === 'unread' ? 'You’re all caught up' : 'A little quiet, in a good way'} description={filter === 'unread' ? 'No unread updates. Come back when there’s something meaningful to explore.' : 'Requests, replies, new matches, and circle invitations will appear here.'} actionLabel={filter === 'unread' ? 'View all notifications' : 'Discover people'} onAction={() => filter === 'unread' ? setFilter('all') : navigate('discover')} /> : <section aria-label="Notifications" className="space-y-3">
      {visible.map(notification => {
        const presentation = kinds[notification.kind];
        const Icon = presentation.icon;
        const actorId = notification.actorUserId ?? notification.meta?.userId;
        const actor = state.users.find(user => user.id === actorId);
        const target = state.users.find(user => user.id === notification.meta?.userId);
        const unavailable = locked || !!actor?.suspended || !!target?.suspended || state.blockedUsers.some(item => item.userId === actorId || item.userId === target?.id);
        return <button key={notification.id} disabled={unavailable} onClick={() => open(notification)} className={`card flex min-h-24 w-full items-start gap-3 p-4 text-left disabled:cursor-not-allowed disabled:opacity-55 ${!notification.read ? '!border-[var(--line-strong)]' : ''}`} aria-label={`${presentation.label}: ${notification.text}${notification.read ? '' : ', unread'}${unavailable ? ', unavailable' : ''}`}>
          <span className="relative shrink-0">{actor ? <Avatar user={actor} size={44} /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]"><Bell size={22} /></span>}<span className="absolute -right-1 -bottom-1 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--surface)] bg-[var(--accent-soft)] text-[var(--accent-text)]"><Icon size={13} /></span></span>
          <span className="min-w-0 flex-1"><span className="mb-1 flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-[var(--accent-text)]">{presentation.label}</span>{!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />}</span><span className={`block break-words text-sm leading-relaxed ${notification.read ? 'text-[var(--text-2)]' : 'text-[var(--text)]'}`}>{notification.text}</span><time className="mt-2 block text-[11px] text-[var(--text-2)]" dateTime={new Date(notification.createdAt).toISOString()}>{timestamp(notification.createdAt)}</time><span className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${unavailable ? 'text-[var(--text-2)]' : 'text-[var(--accent-text)]'}`}>{unavailable ? 'Interaction unavailable' : presentation.action}{!unavailable && <ChevronRight size={14} />}</span></span>
        </button>;
      })}
    </section>}
    <p className="text-center text-xs leading-relaxed text-[var(--text-2)]">Only updates with a reason. Opening a conversation marks its messages as read; use “Mark all read” to clear the rest.</p>
  </main>;
}

export default Notifications;
