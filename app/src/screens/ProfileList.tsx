import { ArrowLeft } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { PostCard } from '../components/PostCard';
import { useNexus } from '../repo/store';
import { back, navigate, useRoute } from '../routerStore';
import { canViewProfileLists, profileFollowUsers, profilePosts } from '../services/profileStats';

export function ProfileList({ kind }: { kind: 'posts' | 'followers' | 'following' }) {
  const { route } = useRoute();
  const state = useNexus();
  const userId = route.param ?? '';
  const user = state.users.find((item) => item.id === userId);
  const available = canViewProfileLists(state, userId);
  const title = kind[0].toUpperCase() + kind.slice(1);
  const posts = kind === 'posts' ? profilePosts(state, userId) : null;
  const people = kind !== 'posts' ? profileFollowUsers(state, userId, kind) : null;
  return <div className="p-5 pb-8 space-y-5">
    <header className="flex items-center gap-3">
      <button type="button" className="btn btn-ghost min-h-11 px-3" onClick={back} aria-label="Go back"><ArrowLeft size={21} /></button>
      <h1 className="text-2xl font-bold">{title}</h1>
    </header>
    {!available || !user ? <EmptyState title="Profile unavailable" description="These lists are private or no longer available." /> : <>
      <p className="text-sm text-[var(--text-2)]">{userId === state.meId ? 'Your' : `${user.name}’s`} {kind}</p>
      <p className="text-xs text-[var(--text-3)]">On this device · Posts visible to you · Follows are separate from connections. Unavailable profiles are not shown.</p>
      {posts && <section aria-label="Profile posts" className="space-y-4">
        {posts.map((post) => <PostCard key={post.id} post={post} />)}
        {!posts.length && <EmptyState title="No visible posts" description="There are no posts available to you here yet." />}
      </section>}
      {people && <ul aria-label={title} className="space-y-3">
        {people.map((person) => <li key={person.id} className="card p-4 flex flex-wrap items-center gap-3">
          <Avatar user={person} size={44} />
          <div className="min-w-0 flex-1 break-words"><h2 className="font-semibold">{person.name}</h2><p className="text-sm text-[var(--text-2)]">@{person.username}</p></div>
          <button type="button" className="btn btn-secondary min-h-11" onClick={() => navigate('user', person.id)}>View profile</button>
        </li>)}
        {!people.length && <li><EmptyState title={`No visible ${kind}`} description="There are no available profiles in this on-device list yet." /></li>}
      </ul>}
    </>}
  </div>;
}
