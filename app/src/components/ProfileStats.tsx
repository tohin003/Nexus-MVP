import { useNexus } from '../repo/store';
import { navigate } from '../routerStore';
import { profileStats } from '../services/profileStats';

export function ProfileStats({ userId }: { userId: string }) {
  const stats = useNexus((state) => profileStats(state, userId));
  const own = useNexus((state) => state.meId === userId);
  if (!stats) return null;
  return <section aria-label="Profile stats" className="space-y-2">
    <div className="grid grid-cols-3 gap-2 py-3 text-center">
      {(['posts', 'followers', 'following'] as const).map((key) => <button
        key={key} type="button" disabled={stats[key] === 0}
        className="min-h-11 rounded-xl p-2 hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent-text)] disabled:opacity-40 disabled:cursor-default"
        aria-label={key === 'posts' ? `View ${own ? 'my ' : ''}${stats.posts} posts` : `View ${key}`}
        onClick={() => navigate(`user-${key}`, userId)}>
        <span className="block text-xs capitalize text-[var(--text-2)]">{key}</span>
        <span className="block text-xl font-bold tabular-nums" data-stat={key}>{stats[key]}</span>
      </button>)}
    </div>
    <p className="text-center text-xs text-[var(--text-3)]">On this device · Posts visible to you · Follows are separate from connections.</p>
  </section>;
}
