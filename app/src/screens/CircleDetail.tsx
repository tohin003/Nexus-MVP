import { useState } from 'react';
import { ArrowLeft, CalendarDays, Flag, FolderKanban, LockKeyhole, MapPin, MessageCircle, Plus, Users } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { PostCard } from '../components/PostCard';
import { useActions, useNexus } from '../repo/store';
import { navigate, useRoute } from '../routerStore';

type Tab = 'Discuss' | 'People' | 'Projects' | 'Events';
export function CircleDetail({ id, circleId }: { id?: string; circleId?: string } = {}) {
  const { route } = useRoute();
  const state = useNexus();
  const actions = useActions();
  const [tab, setTab] = useState<Tab>('Discuss');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const circle = state.circles.find(item => item.id === (circleId ?? id ?? route.param));
  if (!circle) return <main className="px-5 py-8"><EmptyState title="Circle not found" description="This circle may no longer be available." actionLabel="Browse circles" onAction={() => navigate('circles')} /></main>;
  const joined = circle.memberIds.includes(state.meId);
  const owner = circle.ownerUserId === state.meId;
  const canView = joined || circle.privacy === 'open';
  const ended = circle.endDate !== null && circle.endDate <= Date.now();
  const full = circle.memberIds.length >= circle.memberLimit;
  const restrictedIds = new Set([...state.blockedUsers, ...state.mutedUsers].map(item => item.userId));
  const posts = state.posts.filter(post => post.circleId === circle.id && !restrictedIds.has(post.userId)).sort((a, b) => b.createdAt - a.createdAt);
  const members = state.users.filter(user => circle.memberIds.includes(user.id) && !state.blockedUsers.some(block => block.userId === user.id));
  const projects = state.circleProjects.filter(project => project.circleId === circle.id);
  const events = state.circleEvents.filter(event => event.circleId === circle.id).sort((a, b) => a.at - b.at);
  const totalDays = circle.endDate === null ? null : Math.max(1, Math.ceil((circle.endDate - circle.startDate) / 86400000));
  const elapsedDays = Math.max(circle.dayNumber, Math.floor((Date.now() - circle.startDate) / 86400000) + 1, 1);
  const day = totalDays ? Math.min(totalDays, elapsedDays) : elapsedDays;
  const progress = totalDays ? Math.min(100, day / totalDays * 100) : null;

  function membership() {
    if (!circle) return;
    setError(''); setNotice('');
    try {
      if (joined) actions.circles.leave(circle.id);
      else actions.circles.join(circle.id);
      setNotice(joined ? 'You left this circle.' : 'You’re in! Say hello in Discuss.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update your membership. Try again.');
    }
  }
  const createPost = () => navigate('create', `post:${circle.id}`);

  return <main className="space-y-5 px-5 pb-8 pt-5">
    <button className="btn btn-ghost -ml-3 px-3" onClick={() => navigate('circles')}><ArrowLeft size={19} /> Circles</button>
    <header className="space-y-3">
      <div className="flex items-center justify-between"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent-soft)] text-3xl" aria-hidden="true">{circle.emoji}</span><span className="eyebrow">{circle.category}</span></div>
      <h1 className="text-3xl font-bold leading-tight tracking-tight">{circle.name}</h1>
      <p className="text-sm leading-relaxed text-[var(--text-2)]">{circle.description}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--text-2)]"><span className="flex items-center gap-1"><Users size={15} /> {circle.memberIds.length} / {circle.memberLimit} members</span><span className="flex items-center gap-1"><MapPin size={15} /> {circle.city || 'Anywhere'}</span><span className="flex items-center gap-1"><LockKeyhole size={15} /> {circle.privacy === 'open' ? 'Open circle' : 'Invitation only'}</span></div>
    </header>
    <section className="card space-y-3 p-4" style={{ background: 'var(--accent-soft)' }}>
      <div className="flex items-center gap-2 text-[var(--accent-text)]"><Flag size={17} /><h2 className="eyebrow text-[var(--accent-text)]">OUR SHARED GOAL</h2></div>
      <p className="font-semibold">{circle.goal}</p>
      <p className="text-sm text-[var(--text-2)]">{circle.purpose}</p>
      <div className="flex justify-between gap-2 text-xs font-semibold"><span>{ended ? 'Completed timeline' : 'Current'}: Day {day}{totalDays ? ` of ${totalDays}` : ''}</span><span>{circle.endDate ? new Date(circle.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Ongoing circle'}</span></div>
      {progress !== null && <div role="progressbar" aria-label="Circle timeline progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} /></div>}
    </section>
    <div className="flex gap-2">
      <button className={`btn flex-1 ${joined ? 'btn-secondary' : 'btn-primary'}`} disabled={owner || (!joined && (circle.privacy !== 'open' || ended || full))} onClick={membership}>{owner ? 'You’re the host' : joined ? 'Leave circle' : ended ? 'Circle ended' : full ? 'Circle full' : circle.privacy !== 'open' ? 'Invitation only' : 'Join circle'}</button>
      {joined && <button className="btn btn-primary flex-1" onClick={createPost}><Plus size={18} /> Post</button>}
    </div>
    {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}
    {notice && <p role="status" className="text-sm text-[var(--good)]">{notice}</p>}
    {!canView ? <EmptyState title="A space for circle members" description="An invitation is required to see discussions, people, projects, and events in this circle." /> : <>
      <div className="grid grid-cols-4 border-b border-[var(--line)]" role="tablist" aria-label="Circle sections">
        {([{ name: 'Discuss', Icon: MessageCircle }, { name: 'People', Icon: Users }, { name: 'Projects', Icon: FolderKanban }, { name: 'Events', Icon: CalendarDays }] as const).map(({ name, Icon }) => <button key={name} role="tab" aria-selected={tab === name} className={`flex min-h-14 flex-col items-center justify-center gap-1 border-b-2 text-xs font-semibold ${tab === name ? 'border-[var(--accent)] text-[var(--accent-text)]' : 'border-transparent text-[var(--text-2)]'}`} onClick={() => setTab(name)}><Icon size={17} />{name}</button>)}
      </div>
      <section role="tabpanel" aria-label={tab} className="space-y-4">
        {tab === 'Discuss' && <>{posts.map(post => <PostCard key={post.id} post={post} />)}{!posts.length && <EmptyState title="Start the conversation" description="Share an update, ask for help, or introduce yourself." actionLabel={joined ? 'Write a post' : undefined} onAction={joined ? createPost : undefined} />}</>}
        {tab === 'People' && <>{members.map(user => <button key={user.id} className="card flex min-h-20 w-full items-center gap-3 p-4 text-left" onClick={() => navigate(user.id === state.meId ? 'me' : 'user', user.id === state.meId ? undefined : user.id)}><Avatar user={user} size={44} /><span className="min-w-0"><span className="block font-semibold">{user.name}{user.id === circle.ownerUserId && <span className="ml-2 text-xs text-[var(--accent-text)]">Host</span>}</span><span className="block truncate text-xs text-[var(--text-2)]">{user.headline}</span></span></button>)}{!members.length && <EmptyState title="No visible members" />}</>}
        {tab === 'Projects' && <>{projects.map(project => <article key={project.id} className="card space-y-2 p-4"><div className="flex items-start justify-between gap-2"><FolderKanban size={20} className="text-[var(--accent-text)]" /><span className="eyebrow">{project.status === 'done' ? 'Completed' : 'In progress'}</span></div><h3 className="font-semibold">{project.title}</h3><p className="text-xs text-[var(--text-2)]">Led by {state.users.find(user => user.id === project.ownerUserId)?.name ?? 'a circle member'}</p></article>)}{!projects.length && <EmptyState title="The next project starts here" description="Propose an idea in Discuss and find someone to build it with." actionLabel={joined ? 'Share an idea' : undefined} onAction={joined ? createPost : undefined} />}</>}
        {tab === 'Events' && <>{events.map(event => <article key={event.id} className="card space-y-3 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-text)]"><CalendarDays size={17} />{new Date(event.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p><h3 className="font-semibold">{event.title}</h3><p className="text-sm text-[var(--text-2)]">{event.detail}</p><p className="flex items-center gap-2 text-xs text-[var(--text-2)]"><MapPin size={15} />{event.location}</p><p className="text-xs text-[var(--text-2)]">{event.goingIds.length} going{event.goingIds.includes(state.meId) ? ' · You’re going' : ''}</p></article>)}{!events.length && <EmptyState title="Make time for your circle" description="Suggest a meetup in Discuss. A little time together goes a long way." actionLabel={joined ? 'Suggest a meetup' : undefined} onAction={joined ? createPost : undefined} />}</>}
      </section>
    </>}
  </main>;
}

export default CircleDetail;
