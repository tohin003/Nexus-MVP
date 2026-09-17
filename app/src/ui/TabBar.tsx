import { Home, Compass, Circle, UserRound, MessageCircle } from 'lucide-react';
import { navigate, useRoute } from '../routerStore';
import { useNexus } from '../repo/store';

export function TabBar() {
  const { route } = useRoute();
  const ready = useNexus(s => s.signedIn && s.onboardingComplete);
  const unread = useNexus(s => s.notifications.filter(n => !n.read && n.kind === 'new-message').length);
  if (!ready || ['welcome','onboarding','building','chat'].includes(route.name)) return null;
  const tabs = [
    { name: 'home' as const, label: 'Home', icon: Home },
    { name: 'discover' as const, label: 'Discover', icon: Compass },
    { name: 'inbox' as const, label: 'Inbox', icon: MessageCircle, badge: unread },
    { name: 'circles' as const, label: 'Circles', icon: Circle },
    { name: 'me' as const, label: 'You', icon: UserRound },
  ];
  return <nav aria-label="Main navigation" className="flex shrink-0 items-center justify-around border-t border-[var(--line)] bg-[var(--surface)] px-1 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
    {tabs.map(({ name, label, icon: Icon, badge }) => <button key={name} aria-label={badge ? `${label}, ${badge} unread` : label} aria-current={route.name === name ? 'page' : undefined} onClick={() => navigate(name)} className={`relative flex min-h-14 min-w-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold ${route.name === name ? 'text-[var(--accent-text)]' : 'text-[var(--text-2)]'}`}>
      <Icon size={21} strokeWidth={route.name === name ? 2.4 : 1.7} />
      {label}
      {badge ? <span className="absolute right-1 top-0.5 min-w-4 rounded-full px-1 text-[9px] font-bold leading-4 text-white" style={{ background: 'var(--accent)' }}>{badge}</span> : null}
    </button>)}
  </nav>;
}
