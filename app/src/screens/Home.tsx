import { Bell, Check, ChevronRight, MessageSquare, Plus } from 'lucide-react';
import { useState } from 'react';
import { useBlockedIds, useCircles, useConnections, useIntents, useMe, useMutedIds, useNotifications, usePassedIds, usePosts, useUsers } from '../repo/store';
import { matchPeople } from '../services/intelligence';
import { navigate } from '../routerStore';
import { PersonCard } from '../components/PersonCard';
import { PostCard } from '../components/PostCard';
import { EmptyState } from '../components/EmptyState';
import { Moments } from '../components/Moments';

const FEED_LIMIT = 8;

export function Home() {
  const me = useMe();
  const users = useUsers();
  const intents = useIntents();
  const posts = usePosts();
  const connections = useConnections();
  const circles = useCircles();
  const blocked = useBlockedIds();
  const muted = useMutedIds();
  const passed = usePassedIds();
  const notifications = useNotifications();
  const [filter, setFilter] = useState<'all' | 'following'>('all');

  if (!me) return <div className="p-5"><EmptyState title="Preparing your day…" loading /></div>;

  const connectedIds = connections
    .filter(c => c.aUserId === me.id || c.bUserId === me.id)
    .map(c => c.aUserId === me.id ? c.bUserId : c.aUserId);
  const matches = matchPeople(me, users, intents, [...blocked, ...muted, ...passed, ...connectedIds]).slice(0, 3);
  // Apply safety and circle access before either feed selection or the own-post slot.
  const visiblePosts = posts.filter(post => {
    const author = users.find(user => user.id === post.userId);
    const circle = circles.find(item => item.id === post.circleId);
    return author && !author.suspended && !blocked.includes(author.id) && !muted.includes(author.id)
      && (!post.circleId || (circle && (circle.privacy === 'open' || circle.memberIds.includes(me.id))));
  }).sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
  // Following is this app's accepted connections, plus your own updates.
  const candidates = visiblePosts.filter(post => filter === 'all' || post.userId === me.id || connectedIds.includes(post.userId));
  const feed = candidates.slice(0, FEED_LIMIT);
  const latestOwn = candidates.find(post => post.userId === me.id);
  // A busy demo feed must never hide the user's latest eligible contribution.
  if (latestOwn && !feed.some(post => post.id === latestOwn.id)) {
    feed[FEED_LIMIT - 1] = latestOwn;
  }
  const unread = notifications.filter(notification => !notification.read).length;
  const inboxUnread = notifications.filter(notification => !notification.read && notification.kind === 'new-message').length;
  const iconControl = 'relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-[var(--surface-2)]';

  const suggestions = <section aria-labelledby="home-suggestions-heading" className="min-w-0 space-y-3 py-2">
    <div className="flex items-center justify-between gap-3">
      <h2 id="home-suggestions-heading" className="text-base font-bold">People worth meeting</h2>
      <button type="button" className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-[var(--accent-text)]" onClick={() => navigate('discover')}>
        Explore <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
    <div role="region" aria-label="Suggested people" tabIndex={0} className="flex min-w-0 gap-4 overflow-x-auto snap-x snap-mandatory pb-3">
      {matches.map(match => <div key={match.user.id} className="w-[85%] min-w-0 shrink-0 snap-start sm:w-80"><PersonCard match={match} compact /></div>)}
    </div>
    {!matches.length && <p className="text-sm text-[var(--text-2)]">Your current introductions are covered. Discover more people when you're ready.</p>}
  </section>;

  return <div className="min-w-0 space-y-5 p-5 pb-8">
    <header className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black tracking-[.2em] text-[var(--text-3)]">NEXUS</span>
        <div className="flex shrink-0 gap-1">
          <button type="button" className={iconControl} onClick={() => navigate('inbox')} aria-label={`Open inbox, ${inboxUnread} unread`}>
            <MessageSquare size={21} aria-hidden="true" />
            {inboxUnread > 0 && <span aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--accent)]" />}
          </button>
          <button type="button" className={iconControl} onClick={() => navigate('notifications')} aria-label={`Notifications, ${unread} unread`}>
            <Bell size={21} aria-hidden="true" />
            {unread > 0 && <span aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--accent)]" />}
          </button>
        </div>
      </div>
      <h1 className="text-2xl font-bold leading-tight tracking-tight">Good things start with your people<span className="text-[var(--accent)]">.</span></h1>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--text-2)]">Small updates. Real connections.</p>
        <button type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50" onClick={() => navigate('create')} disabled={me.suspended}>
          <Plus size={18} aria-hidden="true" />Create
        </button>
      </div>
    </header>

    <Moments />

    <section aria-label="Home feed" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-4">
        <h2 className="text-lg font-bold">Your feed</h2>
        <div role="group" aria-label="Feed filter" className="inline-flex rounded-full bg-[var(--surface-2)] p-1">
          {(['all', 'following'] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${filter === value ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-2)]'}`}>
            {value === 'all' ? 'All' : 'Following'}
          </button>)}
        </div>
      </div>
      {filter === 'following' && <p className="text-xs text-[var(--text-3)]">Updates from your connections, and you.</p>}
      {feed.slice(0, 2).map(post => <PostCard key={post.id} post={post} />)}
      {!feed.length && <EmptyState
        title={filter === 'following' ? 'A quiet moment with your people' : 'A little space for something new'}
        description={filter === 'following' ? 'Updates from your connections and your own posts will appear here.' : 'Share an idea, a question, or a small step forward.'}
        actionLabel={filter === 'following' ? 'See all posts' : 'Create a post'}
        onAction={() => filter === 'following' ? setFilter('all') : navigate('create')}
      />}
      {filter === 'all' && suggestions}
      {feed.slice(2).map(post => <PostCard key={post.id} post={post} />)}
    </section>

    {feed.length > 0 && <footer className="flex items-center justify-center gap-3 border-t border-[var(--line)] py-5">
      <Check size={19} className="shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
      <div><h2 className="text-sm font-semibold">You're caught up</h2><p className="text-xs text-[var(--text-2)]">A few updates, then back to what matters.</p></div>
    </footer>}
  </div>;
}

export default Home;
