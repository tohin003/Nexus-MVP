import { Home, Compass, Plus, Circle, UserRound } from 'lucide-react';
import { navigate, useRoute } from '../routerStore';
import { useNexus } from '../repo/store';

export function TabBar() {
  const { route } = useRoute();
  const ready = useNexus(s => s.signedIn && s.onboardingComplete);
  if (!ready || ['welcome','onboarding','building','chat'].includes(route.name)) return null;
  const tabs = [
    { name: 'home' as const, label: 'Home', icon: Home },
    { name: 'discover' as const, label: 'Discover', icon: Compass },
    { name: 'create' as const, label: 'Create', icon: Plus },
    { name: 'circles' as const, label: 'Circles', icon: Circle },
    { name: 'me' as const, label: 'You', icon: UserRound },
  ];
  return <nav aria-label="Main navigation" className="flex shrink-0 items-center justify-around border-t border-[var(--line)] bg-[var(--surface)] px-2 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
    {tabs.map(({ name, label, icon: Icon }) => <button key={name} aria-label={label} aria-current={route.name === name ? 'page' : undefined} onClick={() => navigate(name)} className={`flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold ${route.name === name ? 'text-[var(--accent-text)]' : 'text-[var(--text-2)]'}`}>
      <span className={name === 'create' ? 'grid h-10 w-12 place-items-center rounded-2xl bg-[var(--accent-strong)] text-white' : ''}><Icon size={22} strokeWidth={route.name === name ? 2.4 : 1.7} /></span>
      {name !== 'create' && label}
    </button>)}
  </nav>;
}
