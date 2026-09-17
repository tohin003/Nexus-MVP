import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, BookOpen, Check, CirclePlus, Flag, Handshake, HelpCircle, MapPin, Send, Sparkles } from 'lucide-react';
import type { Circle, IntentType, PostKind } from '../domain/types';
import { useActions, useCircles, useMe } from '../repo/store';
import { navigate, useRoute } from '../routerStore';

const kinds = [
  { kind: 'share', label: 'Share', Icon: Sparkles, hint: 'An idea, a discovery, or a little progress.', title: 'What would you like to share?', body: 'Tell the story. What did you learn or make?', intent: 'share' },
  { kind: 'ask', label: 'Ask', Icon: HelpCircle, hint: 'Good questions bring the right people closer.', title: 'What could you use help with?', body: 'Give some context and explain what you have tried.', intent: 'ask' },
  { kind: 'collaborate', label: 'Collaborate', Icon: Handshake, hint: 'Find someone to make something meaningful with.', title: 'What do you want to build together?', body: 'Describe the project, what you bring, and who you need.', intent: 'find-collaborator' },
  { kind: 'teach', label: 'Teach', Icon: BookOpen, hint: 'Something you know could unlock someone’s next step.', title: 'What can you help someone learn?', body: 'What will people learn, and who is this for?', intent: 'teach' },
  { kind: 'challenge', label: 'Challenge', Icon: Flag, hint: 'A shared challenge. A little accountability.', title: 'What is the challenge?', body: 'Set a clear goal, the rules, and a finish line.', intent: 'challenge' },
  { kind: 'meet', label: 'Meet', Icon: MapPin, hint: 'Make a little room for a real connection.', title: 'What would you like to do together?', body: 'Describe the plan and who you would love to meet.', intent: 'meet' },
] as const;
const split = (value: string) => [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];

export function Create() {
  const { route } = useRoute();
  const actions = useActions();
  const me = useMe();
  const circles = useCircles();
  const [mode, setMode] = useState<'post' | 'circle'>(route.param === 'circle' ? 'circle' : 'post');
  const [kind, setKind] = useState<PostKind>('share');
  const [publishAs, setPublishAs] = useState<'post' | 'intent'>('post');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [circleId, setCircleId] = useState(route.param?.startsWith('post:') ? route.param.slice(5) : '');
  const [skills, setSkills] = useState('');
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('');
  const [paid, setPaid] = useState(false);
  const [remote, setRemote] = useState(true);
  const [extra, setExtra] = useState('');
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [goal, setGoal] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('◎');
  const [category, setCategory] = useState('Creative');
  const [city, setCity] = useState('');
  const [limit, setLimit] = useState('20');
  const [privacy, setPrivacy] = useState<Circle['privacy']>('open');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ title: string; description: string; destination: 'home' | 'circle' | 'discover'; id?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const config = kinds.find(item => item.kind === kind)!;
  const myCircles = circles.filter(circle => circle.memberIds.includes(me.id));
  const extraLabel = kind === 'ask' ? 'What would a helpful answer look like?' : kind === 'teach' ? 'Format and experience level' : kind === 'challenge' ? 'Duration and success criteria' : kind === 'share' ? 'Link or resource (optional)' : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || success) return;
    setError(''); setBusy(true);
    try {
      if (mode === 'circle') {
        if (!goal.trim()) throw new Error('Add a shared goal so members know what they’re working toward.');
        const end = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;
        if (end !== null && !Number.isFinite(end)) throw new Error('Choose a valid end date.');
        const circle = actions.circles.create({ name, purpose, goal, description, emoji, category, city: city.trim() || null, memberLimit: Number(limit), privacy, endDate: end });
        setSuccess({ title: 'Your circle starts here.', description: 'You’re the host. Introduce the purpose and share your first update.', destination: 'circle', id: circle.id });
      } else {
        if (!title.trim() || !body.trim()) throw new Error('Add a title and a little context before publishing.');
        const structured = kind === 'collaborate' || kind === 'meet' ? { skillsNeeded: kind === 'collaborate' ? split(skills) : [], location: location.trim() || (remote ? 'Anywhere' : null), time: time.trim() || null, paid: kind === 'collaborate' && paid } : undefined;
        const finalBody = `${body.trim()}${extra.trim() && extraLabel ? `\n\n${extraLabel}: ${extra.trim()}` : ''}`;
        if (publishAs === 'intent') {
          const originalText = `${title.trim()}\n\n${finalBody}`;
          if (originalText.length > 3000) throw new Error('Keep your intent title and details under 3,000 characters combined.');
          actions.intents.create(originalText, {
            title: title.trim(), details: finalBody, visibility: 'public', intentType: config.intent as IntentType,
            ...(structured ? { skillsNeeded: structured.skillsNeeded, location: location.trim() || 'anywhere', remoteAllowed: remote, time: structured.time, compensation: paid && kind === 'collaborate' ? 'paid' as const : 'free' as const } : {}),
          });
          setSuccess({ title: 'Your intent is out there.', description: 'Your original words are saved. Discover people whose goals complement yours.', destination: 'discover' });
        } else {
          const post = actions.posts.create(kind, title, finalBody, split(tags), circleId || null, structured);
          setSuccess({ title: 'A little spark, shared.', description: circleId ? 'Your post is live in your circle.' : 'Your post is live in the community feed.', destination: post.circleId ? 'circle' : 'home', id: post.circleId ?? undefined });
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish. Your draft is still here; please try again.');
    } finally { setBusy(false); }
  }

  if (success) return <main className="space-y-5 px-6 py-12 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]"><Check size={36} /></span><h1 className="text-3xl font-bold tracking-tight">{success.title}</h1><p className="text-sm leading-relaxed text-[var(--text-2)]">{success.description}</p><button className="btn btn-primary w-full" onClick={() => navigate(success.destination, success.id)}>{success.destination === 'circle' ? 'Go to circle' : success.destination === 'discover' ? 'Find your people' : 'Go to feed'}</button><button className="btn btn-ghost w-full" onClick={() => { setSuccess(null); setTitle(''); setBody(''); setExtra(''); setName(''); setPurpose(''); setGoal(''); setDescription(''); }}>Create something else</button></main>;

  return <main className="space-y-5 px-5 pb-8 pt-5">
    <button className="btn btn-ghost -ml-3 px-3" onClick={() => navigate(circleId ? 'circle' : 'home', circleId || undefined)}><ArrowLeft size={19} /> Back</button>
    <header><p className="eyebrow mb-2">A SMALL STEP STARTS SOMETHING</p><h1 className="text-3xl font-bold tracking-tight">Put it out there.</h1><p className="mt-2 text-sm text-[var(--text-2)]">An idea. A question. A reason to come together.</p></header>
    <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Create type"><button type="button" role="tab" aria-selected={mode === 'post'} className="chip min-h-11 justify-center" data-selected={mode === 'post'} onClick={() => { setMode('post'); setError(''); }}><Send size={16} /> Create a post</button><button type="button" role="tab" aria-selected={mode === 'circle'} className="chip min-h-11 justify-center" data-selected={mode === 'circle'} onClick={() => { setMode('circle'); setError(''); }}><CirclePlus size={16} /> Create Circle</button></div>
    <form className="space-y-5" onSubmit={submit}>
      {mode === 'post' ? <>
        <fieldset><legend className="eyebrow mb-3">WHAT’S YOUR INTENT?</legend><div className="grid grid-cols-3 gap-2">{kinds.map(({ kind: value, label, Icon }) => <button key={value} type="button" aria-pressed={kind === value} className="chip min-h-20 flex-col justify-center gap-2 rounded-2xl px-1" data-selected={kind === value} onClick={() => { setKind(value); setExtra(''); }}><Icon size={21} />{label}</button>)}</div></fieldset>
        <p className="text-sm text-[var(--text-2)]">{config.hint}</p>
        <label className="block space-y-2 text-sm font-medium"><span>{config.title}</span><input className="input min-h-11" value={title} maxLength={200} required onChange={event => setTitle(event.target.value)} placeholder={kind === 'collaborate' ? 'Looking for a designer to build a tiny app' : 'Start with a clear, specific title'} /></label>
        <label className="block space-y-2 text-sm font-medium"><span>{config.body}</span><textarea className="input min-h-36 resize-y" value={body} maxLength={publishAs === 'intent' ? 2800 : 8500} required onChange={event => setBody(event.target.value)} placeholder="A little context helps the right people find you…" /></label>
        {extraLabel && <label className="block space-y-2 text-sm font-medium"><span>{extraLabel}</span><input className="input min-h-11" value={extra} maxLength={500} onChange={event => setExtra(event.target.value)} /></label>}
        {(kind === 'collaborate' || kind === 'meet') && <fieldset className="card space-y-4 p-4"><legend className="px-1 text-sm font-semibold">Make it easy to say yes</legend>
          {kind === 'collaborate' && <label className="block space-y-2 text-sm"><span>Skills needed (comma separated)</span><input className="input min-h-11" value={skills} maxLength={400} onChange={event => setSkills(event.target.value)} placeholder="React, design, video editing" /></label>}
          <label className="block space-y-2 text-sm"><span>Location</span><input className="input min-h-11" value={location} maxLength={150} onChange={event => setLocation(event.target.value)} placeholder="City, venue, or online" /></label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input className="h-5 w-5 accent-[var(--accent)]" type="checkbox" checked={remote} onChange={event => setRemote(event.target.checked)} />Remote / online is welcome</label>
          <label className="block space-y-2 text-sm"><span>{kind === 'meet' ? 'When are you meeting?' : 'Time commitment / timeline'}</span><input className="input min-h-11" value={time} maxLength={200} onChange={event => setTime(event.target.value)} placeholder={kind === 'meet' ? 'Saturday, 10 am · local time' : 'A few hours on weekends, for a month'} /></label>
          {kind === 'collaborate' && <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input className="h-5 w-5 accent-[var(--accent)]" type="checkbox" checked={paid} onChange={event => setPaid(event.target.checked)} />This is a paid opportunity</label>}
        </fieldset>}
        <label className="block space-y-2 text-sm font-medium"><span>Publish as</span><select className="input min-h-11" value={publishAs} onChange={event => setPublishAs(event.target.value as 'post' | 'intent')}><option value="post">Community post — start a conversation</option><option value="intent">Matching intent — find the right people</option></select></label>
        {publishAs === 'post' ? <>
          <label className="block space-y-2 text-sm font-medium"><span>Share with</span><select className="input min-h-11" value={circleId} onChange={event => setCircleId(event.target.value)}><option value="">Everyone · community feed</option>{myCircles.map(circle => <option key={circle.id} value={circle.id}>{circle.emoji} {circle.name}</option>)}</select></label>
          <label className="block space-y-2 text-sm font-medium"><span>Tags (optional, comma separated)</span><input className="input min-h-11" value={tags} maxLength={300} onChange={event => setTags(event.target.value)} placeholder="Design, filmmaking, building" /></label>
        </> : <p className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm text-[var(--accent-text)]">Your public intent helps surface relevant people. It is saved separately from community posts, with your original words intact.</p>}
      </> : <>
        <p className="text-sm text-[var(--text-2)]">Not another group chat. A small community with a clear reason to exist.</p>
        <div className="grid grid-cols-[70px_1fr] gap-3"><label className="block space-y-2 text-sm font-medium"><span>Icon</span><input aria-label="Circle emoji" className="input min-h-11 px-3" value={emoji} maxLength={12} onChange={event => setEmoji(event.target.value)} /></label><label className="block space-y-2 text-sm font-medium"><span>Circle name</span><input className="input min-h-11" required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Weekend filmmakers" /></label></div>
        <label className="block space-y-2 text-sm font-medium"><span>Why does this circle exist?</span><textarea className="input min-h-24" required maxLength={1000} value={purpose} onChange={event => setPurpose(event.target.value)} placeholder="Bring local filmmakers together to learn by making." /></label>
        <label className="block space-y-2 text-sm font-medium"><span>Shared goal</span><input className="input min-h-11" required maxLength={300} value={goal} onChange={event => setGoal(event.target.value)} placeholder="Make one short film in 30 days" /></label>
        <label className="block space-y-2 text-sm font-medium"><span>Description (optional)</span><textarea className="input min-h-24" maxLength={1500} value={description} onChange={event => setDescription(event.target.value)} placeholder="Who is this for? How will you spend your time together?" /></label>
        <label className="block space-y-2 text-sm font-medium"><span>Category</span><select className="input min-h-11" value={category} onChange={event => setCategory(event.target.value)}>{['Creative', 'Technology', 'Business', 'Learning', 'Wellbeing', 'Community', 'Other'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="block space-y-2 text-sm font-medium"><span>City (optional)</span><input className="input min-h-11" maxLength={100} value={city} onChange={event => setCity(event.target.value)} placeholder="Leave blank for anywhere" /></label>
        <div className="grid grid-cols-2 gap-3"><label className="block space-y-2 text-sm font-medium"><span>Member limit</span><input className="input min-h-11" type="number" min={2} max={500} step={1} required value={limit} onChange={event => setLimit(event.target.value)} /></label><label className="block space-y-2 text-sm font-medium"><span>Privacy</span><select className="input min-h-11" value={privacy} onChange={event => setPrivacy(event.target.value as Circle['privacy'])}><option value="open">Open</option><option value="invite">Invitation only</option><option value="closed">Closed</option></select></label></div>
        {privacy !== 'open' && <p className="text-xs text-[var(--text-2)]">Only members can see circle content. Invitation delivery is not available in this local demo; choose Open to let people join.</p>}
        <label className="block space-y-2 text-sm font-medium"><span>End date (optional)</span><input className="input min-h-11" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
        <p className="text-xs leading-relaxed text-[var(--text-2)]">Your circle begins today. You’ll be its first member and host.</p>
      </>}
      {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}><Send size={18} />{busy ? 'Publishing…' : mode === 'circle' ? 'Create circle' : publishAs === 'intent' ? 'Publish intent' : 'Publish post'}</button>
      <p className="text-center text-xs text-[var(--text-3)]">Be specific. Be kind. Something good could start here.</p>
    </form>
  </main>;
}

export default Create;
