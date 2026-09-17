import { useState } from 'react';
import { Compass, Plus, Search, Users } from 'lucide-react';
import { CircleCard } from '../components/CircleCard';
import { EmptyState } from '../components/EmptyState';
import { useCircles, useMe } from '../repo/store';
import { navigate } from '../routerStore';

export function Circles() {
  const circles = useCircles();
  const me = useMe();
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const [query, setQuery] = useState('');
  const mine = circles.filter(circle => circle.memberIds.includes(me.id));
  const visible = circles.filter(circle => (tab === 'mine' ? circle.memberIds.includes(me.id) : !circle.memberIds.includes(me.id)) && `${circle.name} ${circle.purpose} ${circle.category} ${circle.city ?? ''}`.toLowerCase().includes(query.toLowerCase()));

  return <main className="space-y-6 px-5 pb-8 pt-8">
    <header className="flex items-center justify-between gap-3">
      <div><p className="eyebrow mb-2">BETTER TOGETHER</p><h1 className="text-3xl font-bold tracking-tight">Your circles.</h1></div>
      <button className="btn btn-secondary min-w-11 px-3" aria-label="Create a circle" onClick={() => navigate('create', 'circle')}><Plus size={21} /></button>
    </header>
    <p className="text-sm leading-relaxed text-[var(--text-2)]">Small groups. A shared purpose. Real things made together.</p>
    <section className="card flex items-start gap-3 p-4" style={{ background: 'var(--accent-soft)' }}>
      <Users size={24} className="mt-1 shrink-0 text-[var(--accent-text)]" />
      <div><h2 className="font-semibold">Find your people. Build your momentum.</h2><p className="mt-1 text-sm text-[var(--text-2)]">You’re part of {mine.length} {mine.length === 1 ? 'circle' : 'circles'}. Every circle starts with a reason to come together.</p></div>
    </section>
    <div className="flex gap-2" role="tablist" aria-label="Circle lists">
      <button role="tab" aria-selected={tab === 'mine'} className="chip min-h-11 flex-1 justify-center" data-selected={tab === 'mine'} onClick={() => setTab('mine')}>My circles <span>{mine.length}</span></button>
      <button role="tab" aria-selected={tab === 'discover'} className="chip min-h-11 flex-1 justify-center" data-selected={tab === 'discover'} onClick={() => setTab('discover')}><Compass size={16} /> Discover</button>
    </div>
    <label className="relative block"><span className="sr-only">Search circles</span><Search size={18} className="pointer-events-none absolute left-4 top-4 text-[var(--text-3)]" /><input className="input min-h-11 pl-11" placeholder="Search by purpose, interest, or city" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <section className="space-y-4" aria-label={tab === 'mine' ? 'My circles' : 'Discover circles'}>
      {visible.map(circle => <CircleCard key={circle.id} circle={circle} />)}
      {!visible.length && <EmptyState title={query ? 'No circles match your search' : tab === 'mine' ? 'Your circle is out there' : 'You’re all caught up'} description={query ? 'Try another interest or city.' : tab === 'mine' ? 'Discover a small group working toward something you care about.' : 'Start a circle with a purpose of your own.'} actionLabel={query ? 'Clear search' : tab === 'mine' ? 'Discover circles' : 'Create a circle'} onAction={() => query ? setQuery('') : tab === 'mine' ? setTab('discover') : navigate('create', 'circle')} />}
    </section>
    <button className="btn btn-secondary w-full" onClick={() => navigate('create', 'circle')}><Plus size={18} /> Create a circle</button>
  </main>;
}

export default Circles;
