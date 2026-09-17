import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, AtSign, Check, CheckCircle2, Compass, HeartHandshake, MapPin, Search, ShieldCheck, Sparkles, Users, WandSparkles } from 'lucide-react';
import { AVAILABILITY_LABELS, CITIES, INTEREST_CATEGORIES, INTEREST_MAP, INTERESTS, SKILLS, interestLabel, skillLabel } from '../domain/ontology';
import type { Availability, ExperienceLevel, GoalTag, IntentInterpretation, IntentType, Role, User } from '../domain/types';
import { db, useMe, useNexus } from '../repo/store';
import { auth, completeOnboarding, validateUsername } from '../services/repo';
import { interpretIntent, matchPeople } from '../services/intelligence';
import { navigate } from '../routerStore';

const DRAFT_KEY = 'nexus-onboarding-draft-v1';
const ROLES: Role[] = ['student', 'creator', 'founder', 'freelancer', 'professional', 'developer', 'designer', 'artist', 'educator', 'explorer'];
const GOALS: { id: GoalTag; label: string }[] = [
  { id: 'meet-people', label: 'Meet my people' }, { id: 'learn', label: 'Learn something' },
  { id: 'create', label: 'Create together' }, { id: 'build', label: 'Build an idea' },
  { id: 'find-opportunities', label: 'Find opportunities' }, { id: 'just-explore', label: 'Just explore' },
];
const INTENT_TYPES: IntentType[] = ['learn', 'build', 'find-collaborator', 'find-opportunities', 'meet-people', 'get-advice', 'improve-self', 'create', 'share', 'ask', 'teach', 'challenge', 'meet'];
const RELATIONSHIPS: IntentInterpretation['relationship'][] = ['collaboration', 'mentorship', 'friendship', 'team', 'advice', 'activity'];
const STAGES = ['You', 'Interests', 'Skills', 'Needs', 'Intent', 'Review'];
const TITLES = ['First, a little about you.', 'What lights you up?', 'What can people come to you for?', 'A little help goes a long way.', 'What do you want to do next?', 'Does this sound like you?'];
const DESCRIPTIONS = [
  'Not a résumé. Just a starting point for finding your people.',
  'Follow your curiosity. Pick a few interests, then go a little deeper.',
  'You don’t have to be an expert. What would you enjoy helping with?',
  'What would you love to learn, or get a hand with right now?',
  'Tell us in your own words. An idea, a small goal, or something you’d love to try.',
  'Here’s how NEXUS understood your intent. You’re in control — change anything before sharing.',
];
const pretty = (value: string) => value.replace(/-/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
const toggle = (values: string[], value: string) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
const unique = (values: string[]) => [...new Set(values)];
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const depthAlias: Record<string, string> = { street: 'street-photo', production: 'music-production', agents: 'ai-agents' };
const depthIds = new Set(INTERESTS.flatMap((interest) => interest.children?.map((id) => depthAlias[id] ?? id) ?? []));

type Draft = {
  userId: string; step: number; adult: boolean; name: string; username: string; city: string; roles: Role[];
  goals: GoalTag[]; interests: string[]; skills: string[]; needs: string[];
  availability: Availability; experience: ExperienceLevel; text: string;
  preview: IntentInterpretation | null;
};
function initialDraft(me: User): Draft {
  const empty: Draft = { userId: me.id, step: 0, adult: false, name: me.name, username: me.username, city: me.city, roles: me.roles.slice(0, 3), goals: [], interests: [], skills: [], needs: [], availability: me.availability, experience: me.experience, text: '', preview: null };
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return empty;
    const value = saved as Record<string, unknown>;
    if (value.userId !== me.id) return empty;
    const strings = (key: string): string[] => Array.isArray(value[key]) ? value[key].filter((item): item is string => typeof item === 'string') : [];
    const result: Draft = {
      ...empty,
      step: typeof value.step === 'number' && Number.isInteger(value.step) ? Math.max(0, Math.min(5, value.step)) : 0,
      adult: value.adult === true,
      name: typeof value.name === 'string' ? value.name.slice(0, 100) : empty.name,
      username: typeof value.username === 'string' ? value.username.slice(0, 41) : empty.username,
      city: typeof value.city === 'string' ? value.city.slice(0, 100) : empty.city,
      roles: strings('roles').filter((item): item is Role => ROLES.includes(item as Role)).slice(0, 3),
      goals: strings('goals').filter((item): item is GoalTag => GOALS.some((goal) => goal.id === item)),
      interests: strings('interests').filter((id) => INTEREST_MAP.has(id)),
      skills: strings('skills').filter((id) => SKILLS.some((skill) => skill.id === id)),
      needs: strings('needs').filter((id) => SKILLS.some((skill) => skill.id === id)),
      text: typeof value.text === 'string' ? value.text.slice(0, 3000) : '',
      availability: Object.keys(AVAILABILITY_LABELS).includes(String(value.availability)) ? value.availability as Availability : empty.availability,
      experience: ['beginner', 'intermediate', 'experienced'].includes(String(value.experience)) ? value.experience as ExperienceLevel : empty.experience,
    };
    // Keep editable interpretations through reloads, but reject malformed session data.
    const p = value.preview as IntentInterpretation | null;
    if (p && INTENT_TYPES.includes(p.intentType) && RELATIONSHIPS.includes(p.relationship)
      && ['domain', 'goal', 'location'].every((key) => typeof p[key as keyof IntentInterpretation] === 'string')
      && ['skillsNeeded', 'skillsOffered', 'keywords'].every((key) => Array.isArray(p[key as keyof IntentInterpretation]) && (p[key as 'keywords']).every((item) => typeof item === 'string'))
      && typeof p.remoteAllowed === 'boolean' && ['any', 'beginner', 'intermediate', 'experienced'].includes(p.experience)
      && ['paid', 'free', 'unspecified'].includes(p.compensation)
      && (p.time === null || typeof p.time === 'string') && (p.genre === null || typeof p.genre === 'string')) result.preview = p;
    if (result.step === 5 && !result.preview) result.step = 4;
    return result;
  } catch { return empty; }
}

function NetworkMotif({ compact = false }: { compact?: boolean }) {
  const gradient = useId().replace(/:/g, '');
  return <div aria-hidden="true" className={`relative mx-auto aspect-square ${compact ? 'w-60' : 'w-full max-w-[330px]'}`}>
    <div className="absolute inset-[16%] rounded-full bg-[var(--accent-soft)] blur-3xl" />
    <svg viewBox="0 0 320 320" className="relative h-full w-full overflow-visible" fill="none">
      <defs><linearGradient id={gradient} x1="70" y1="50" x2="245" y2="290" gradientUnits="userSpaceOnUse"><stop stopColor="var(--accent)" /><stop offset="1" stopColor="var(--accent)" stopOpacity=".15" /></linearGradient></defs>
      <circle cx="160" cy="160" r="132" stroke="var(--line-strong)" strokeDasharray="3 7" />
      <circle cx="160" cy="160" r="98" stroke={`url(#${gradient})`} strokeWidth="1.5" />
      <circle cx="160" cy="160" r="61" stroke="var(--accent)" strokeOpacity=".18" />
      <path d="M73 78 245 104 257 225 160 267 48 191 73 78ZM73 78 160 160 245 104M48 191 160 160 257 225M160 160 160 267" stroke={`url(#${gradient})`} strokeWidth="1.5" />
      {[[73, 78, 13], [245, 104, 19], [257, 225, 12], [160, 267, 9], [48, 191, 16]].map(([x, y, radius], index) => <g key={x}>
        <circle cx={x} cy={y} r={radius + 7} fill="var(--bg)" />
        <circle cx={x} cy={y} r={radius} fill={index % 2 ? 'var(--accent-soft)' : 'var(--accent)'} stroke="var(--accent)" strokeOpacity=".35" />
        <circle cx={x} cy={y - 3} r="3" fill={index % 2 ? 'var(--accent)' : '#fff'} />
        <path d={`M${x - 5} ${y + 6} Q${x} ${y - 1} ${x + 5} ${y + 6}`} stroke={index % 2 ? 'var(--accent)' : '#fff'} strokeWidth="2" strokeLinecap="round" />
      </g>)}
      <circle cx="160" cy="160" r="34" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M149 172V148L171 172V148" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="196" cy="35" r="4" fill="var(--accent)" opacity=".55" />
      <circle cx="30" cy="128" r="3" fill="var(--accent)" opacity=".4" />
    </svg>
    {!compact && <><span className="absolute top-[15%] right-0 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold tracking-wide shadow-sm">Shared interests</span><span className="absolute bottom-[20%] left-0 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold tracking-wide shadow-sm">Real possibilities</span></>}
  </div>;
}

export function Welcome() {
  const me = useMe();
  const hasSavedDemo = useNexus(s => s.onboardingComplete || s.analyticsEvents.some(event => event.name === 'demo_sign_in'));
  const onboardingComplete = useNexus(s => s.onboardingComplete);
  const [signInInfo, setSignInInfo] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function enter() {
    setBusy(true); setError('');
    try { auth.demoSignIn(); navigate(db.getState().onboardingComplete ? 'home' : 'onboarding'); }
    catch (cause) { setError(errorMessage(cause)); setBusy(false); }
  }
  return <main className="flex min-h-full flex-col px-7 pb-7 pt-8">
    <header className="flex items-center justify-between"><span className="text-lg font-extrabold tracking-[.25em]">NEXUS<span className="text-[var(--accent)]">.</span></span><span className="eyebrow rounded-full border border-[var(--line)] px-3 py-1.5">People → possibilities</span></header>
    <div className="my-auto py-5"><NetworkMotif /><div className="mt-3 text-center">
      <p className="mb-3 text-[10px] font-bold tracking-[.22em] text-[var(--accent-text)]">LESS SCROLLING. MORE CONNECTING.</p>
      <h1 className="text-[36px] leading-[1.12] font-semibold tracking-[-.055em]">Find your people.<br /><span className="text-[var(--accent-text)]">Do something<br />together.</span></h1>
      <p className="mx-auto mt-5 max-w-[280px] text-sm leading-relaxed text-[var(--text-2)]">A place for your interests, your ideas, and the people who help them grow.</p>
    </div></div>
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}
      {hasSavedDemo ? <button type="button" className="btn btn-primary w-full" onClick={enter} disabled={busy}>{onboardingComplete ? `Resume demo as ${me.name.split(' ')[0]}` : 'Resume demo setup'} <ArrowRight size={17} aria-hidden="true" /></button>
        : <button type="button" className="btn btn-primary w-full" onClick={enter} disabled={busy}>Get Started <ArrowRight size={17} aria-hidden="true" /></button>}
      {!hasSavedDemo && <button type="button" className="btn btn-secondary w-full" onClick={enter} disabled={busy}>Continue with Demo</button>}
      <p className="text-center text-xs text-[var(--text-2)]">Already here? <button type="button" onClick={() => hasSavedDemo ? enter() : setSignInInfo(true)} disabled={busy} className="min-h-11 px-2 font-semibold text-[var(--accent-text)]">Sign in</button></p>
      {signInInfo && <p role="status" className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm">No saved demo profile was found on this device. Choose Get Started or Continue with Demo to set one up. Online account sign-in is not available yet.</p>}
      <p className="text-center text-[10px] leading-relaxed text-[var(--text-2)]">18+ community · Local demo, no password needed.<br />{hasSavedDemo ? 'Sign in resumes your saved local demo; unfinished setup continues where you left off in this tab.' : 'Get Started and Continue with Demo both begin local profile setup, not guest browsing.'}</p>
    </div>
  </main>;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <div className="space-y-2"><label className="block space-y-2 text-sm font-medium"><span>{label}</span>{children}</label>{hint && <p className="text-xs font-normal leading-relaxed text-[var(--text-2)]">{hint}</p>}</div>;
}
function Choices({ label, options, selected, onToggle, max }: { label: string; options: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void; max?: number }) {
  return <fieldset><legend className="mb-3 text-sm font-medium">{label}{max && <span className="ml-2 text-xs font-normal text-[var(--text-2)]">Up to {max}</span>}</legend>
    <div className="flex flex-wrap gap-2">{options.map((option) => <button key={option.id} type="button" aria-pressed={selected.includes(option.id)} data-selected={selected.includes(option.id)} disabled={!!max && selected.length >= max && !selected.includes(option.id)} onClick={() => onToggle(option.id)} className="chip min-h-11 disabled:cursor-not-allowed disabled:opacity-40">{selected.includes(option.id) && <Check size={13} aria-hidden="true" />}{option.label}</button>)}</div>
  </fieldset>;
}
function SkillPicker({ selected, onToggle, label }: { selected: string[]; onToggle: (id: string) => void; label: string }) {
  const [query, setQuery] = useState('');
  const options = SKILLS.filter((skill) => skill.label.toLowerCase().includes(query.toLowerCase().trim()));
  return <div className="space-y-5"><Field label="Search skills"><div className="relative"><Search size={17} aria-hidden="true" className="pointer-events-none absolute top-4 left-4 text-[var(--text-2)]" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="input pl-11" placeholder="Editing, coding, guitar…" /></div></Field>
    <p className="text-xs text-[var(--text-2)]" aria-live="polite">{selected.length} selected · Optional, and always editable</p>
    {options.length ? <Choices label={label} options={options} selected={selected} onToggle={onToggle} /> : <p className="card p-4 text-sm text-[var(--text-2)]">No skills found. Try another word, or continue for now.</p>}
    {query && selected.length > 0 && <Choices label="Your selections" options={selected.map((id) => ({ id, label: skillLabel(id) }))} selected={selected} onToggle={onToggle} />}
  </div>;
}

export function Onboarding() {
  const me = useMe();
  const signedIn = useNexus((state) => state.signedIn);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(me));
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const { step, preview } = draft;
  const update = (fields: Partial<Draft>) => {
    const nextDraft = { ...draft, ...fields };
    setDraft(nextDraft);
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft)); setStorageWarning(false); }
    catch { setStorageWarning(true); }
  };
  useEffect(() => { if (!signedIn) navigate('welcome'); }, [signedIn]);
  useEffect(() => { heading.current?.focus(); document.getElementById('app-scroll')?.scrollTo({ top: 0, behavior: 'instant' }); }, [step]);
  function interpret(text = draft.text): IntentInterpretation {
    const result = interpretIntent(text, { ...me, name: draft.name, city: draft.city, interests: draft.interests, skills: draft.skills, needs: draft.needs });
    return { ...result, domain: result.domain === 'general' ? draft.interests[0] ?? 'general' : result.domain, skillsNeeded: unique([...result.skillsNeeded, ...draft.needs]), skillsOffered: unique([...result.skillsOffered, ...draft.skills]) };
  }
  function editPreview(fields: Partial<IntentInterpretation>) { if (preview) update({ preview: { ...preview, ...fields } }); }
  function profileError(): string {
    if (!draft.adult) return 'Please confirm you are 18 or older to continue.';
    if (!draft.name.trim()) return 'What should we call you? Add your name.';
    if (!draft.username.trim()) return 'Pick a username so people can find you.';
    try { validateUsername(draft.username); } catch (cause) { return cause instanceof Error ? cause.message : 'That username is not available.'; }
    if (!draft.city.trim()) return 'Add your city, or enter Remote.';
    if (!draft.roles.length) return 'Choose at least one role that describes you.';
    if (!draft.goals.length) return 'Choose what brings you here. Just exploring is welcome, too.';
    return '';
  }
  function next(event: FormEvent) {
    event.preventDefault(); setError('');
    if (step === 0) {
      const message = profileError();
      if (message) { setError(message); return; }
    }
    if (step === 1 && !draft.interests.length) { setError('Choose at least one interest so we have somewhere to start.'); return; }
    if (step === 4) {
      if (!draft.text.trim()) { setError('Tell us one thing you’d like to do, learn, or explore.'); return; }
      try { update({ step: 5, preview: interpret() }); } catch (cause) { setError(errorMessage(cause)); }
      return;
    }
    if (step < 5) { update({ step: step + 1 }); setQuery(''); return; }
    if (submitting.current) return;
    const message = profileError();
    if (message) { update({ step: 0 }); setError(message); return; }
    if (!preview || !draft.text.trim() || !preview.goal.trim() || !preview.location.trim()) { setError('Add your original intent, a goal, and a location before continuing.'); return; }
    submitting.current = true; setBusy(true);
    try {
      // Profile, username and intent commit atomically; failures publish no intent.
      completeOnboarding({ name: draft.name.trim(), username: draft.username.trim(), city: draft.city.trim(), roles: draft.roles, interests: draft.interests, skills: draft.skills, needs: draft.needs, availability: draft.availability, experience: draft.experience, currently: preview.goal, headline: draft.roles.map(pretty).join(' · ') }, { text: draft.text, interpretation: preview });
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* Completion must work without browser storage. */ }
      navigate('building');
    } catch (cause) { setError(errorMessage(cause)); submitting.current = false; setBusy(false); }
  }
  const shownInterests = INTERESTS.filter((interest) => query.trim() ? interest.label.toLowerCase().includes(query.trim().toLowerCase()) : !depthIds.has(interest.id));
  const depthParents = INTERESTS.filter((interest) => interest.children && draft.interests.includes(interest.id));
  const selectInterest = (id: string) => update({ interests: toggle(draft.interests, id) });
  return <main className="px-6 pb-7 pt-5">
    <header className="mb-7"><div className="mb-5 flex items-center justify-between"><button type="button" className="btn btn-ghost -ml-3 px-3" aria-label={step ? 'Previous step' : 'Back to welcome'} disabled={busy} onClick={() => { setError(''); setQuery(''); if (step) update({ step: step - 1 }); else { auth.signOut(); navigate('welcome'); } }}><ArrowLeft size={20} aria-hidden="true" /></button><span className="text-sm font-extrabold tracking-[.23em]">NEXUS<span className="text-[var(--accent)]">.</span></span><span className="text-xs text-[var(--text-2)]">{step + 1} of 6</span></div>
      <progress value={step + 1} max={6} aria-label={`Onboarding: ${STAGES[step]}, step ${step + 1} of 6`} className="sr-only" /><div className="flex gap-1.5" aria-hidden="true">{STAGES.map((stage, index) => <span key={stage} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'}`} />)}</div>
    </header>
    <div className="mb-7"><p className="mb-3 text-[10px] font-bold tracking-[.18em] text-[var(--accent-text)]">{step === 5 ? 'YOUR WORDS, MADE ACTIONABLE' : `LET’S START WITH ${STAGES[step].toUpperCase()}`}</p><h1 ref={heading} tabIndex={-1} className="text-[29px] leading-tight font-semibold tracking-[-.04em] outline-none">{TITLES[step]}</h1><p className="mt-3 text-sm leading-relaxed text-[var(--text-2)]">{DESCRIPTIONS[step]}</p></div>
    <form onSubmit={next} className="space-y-6">
      {step === 0 && <>
        <label className="card flex min-h-14 cursor-pointer items-start gap-3 p-4 text-sm"><input type="checkbox" checked={draft.adult} onChange={(event) => update({ adult: event.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" required /><span>I confirm I am 18 or older.<span className="mt-1 block text-xs text-[var(--text-2)]">NEXUS is a community for adults.</span></span></label>
        <Field label="What should we call you?"><input className="input" autoComplete="given-name" value={draft.name} onChange={(event) => update({ name: event.target.value })} placeholder="Your name" maxLength={100} required /></Field>
        <Field label="Pick a username" hint="Your unique handle, without the @. Letters, numbers, dots, dashes or underscores."><div className="relative"><AtSign size={17} aria-hidden="true" className="pointer-events-none absolute top-4 left-4 text-[var(--text-2)]" /><input className="input pl-11" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={draft.username} onChange={(event) => update({ username: event.target.value })} placeholder="e.g. prince.edits" maxLength={41} required /></div></Field>
        <Field label="Your city" hint="City only. We never need your precise location."><div className="relative"><MapPin size={17} aria-hidden="true" className="pointer-events-none absolute top-4 left-4 text-[var(--text-2)]" /><input className="input pl-11" autoComplete="address-level2" list="nexus-cities" value={draft.city} onChange={(event) => update({ city: event.target.value })} placeholder="Jaipur, or Remote" maxLength={100} required /><datalist id="nexus-cities">{CITIES.map((city) => <option key={city} value={city} />)}</datalist></div></Field>
        <Choices label="What describes you?" options={ROLES.map((id) => ({ id, label: pretty(id) }))} selected={draft.roles} onToggle={(id) => update({ roles: toggle(draft.roles, id) as Role[] })} max={3} />
        <Choices label="What brings you here?" options={GOALS} selected={draft.goals} onToggle={(id) => update({ goals: toggle(draft.goals, id) as GoalTag[] })} />
      </>}
      {step === 1 && <>
        <Field label="Search interests"><div className="relative"><Search size={17} aria-hidden="true" className="pointer-events-none absolute top-4 left-4 text-[var(--text-2)]" /><input className="input pl-11" type="search" placeholder="Try filmmaking, AI, or running…" value={query} onChange={(event) => setQuery(event.target.value)} /></div></Field>
        <p className="text-xs text-[var(--text-2)]" aria-live="polite">{draft.interests.length} selected · Choose at least one</p>
        {INTEREST_CATEGORIES.map((category) => { const options = shownInterests.filter((interest) => interest.category === category); return options.length ? <Choices key={category} label={category} options={options} selected={draft.interests} onToggle={selectInterest} /> : null; })}
        {!shownInterests.length && <p className="card p-4 text-sm">No interests found. Try a broader search.</p>}
        {draft.interests.length > 0 && <Choices label="Your interests" options={draft.interests.map((id) => ({ id, label: interestLabel(id) }))} selected={draft.interests} onToggle={selectInterest} />}
        {depthParents.length > 0 && <div className="card space-y-5 border-[var(--accent)] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-text)]"><Sparkles size={16} aria-hidden="true" />Let’s go a little deeper</div>{depthParents.map((parent) => <Choices key={parent.id} label={`What part of ${parent.label.toLowerCase()}?`} options={(parent.children ?? []).map((id) => depthAlias[id] ?? id).filter((id) => INTEREST_MAP.has(id)).map((id) => ({ id, label: interestLabel(id) }))} selected={draft.interests} onToggle={selectInterest} />)}</div>}
      </>}
      {step === 2 && <><div className="card flex gap-3 p-4 text-sm text-[var(--text-2)]"><HeartHandshake size={21} className="shrink-0 text-[var(--accent)]" aria-hidden="true" /><p>Something you know could be exactly what someone else needs.</p></div><SkillPicker key="offers" label="I can help with" selected={draft.skills} onToggle={(id) => update({ skills: toggle(draft.skills, id) })} /></>}
      {step === 3 && <><SkillPicker key="needs" label="I’m looking for help with" selected={draft.needs} onToggle={(id) => update({ needs: toggle(draft.needs, id) })} /><div className="grid grid-cols-2 gap-3"><Field label="Your availability"><select className="input" value={draft.availability} onChange={(event) => update({ availability: event.target.value as Availability })}>{Object.entries(AVAILABILITY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="Experience"><select className="input" value={draft.experience} onChange={(event) => update({ experience: event.target.value as ExperienceLevel })}>{['beginner', 'intermediate', 'experienced'].map((id) => <option key={id} value={id}>{pretty(id)}</option>)}</select></Field></div></>}
      {step === 4 && <>
        <Field label="Right now, I’d love to…" hint="Mention what you want to do, the help you need, and whether you’d like to meet locally or remotely."><textarea className="input min-h-40 resize-y leading-relaxed" value={draft.text} onChange={(event) => update({ text: event.target.value, preview: null })} placeholder="I want to start a filmmaking YouTube channel. I can edit, but I’d love to meet someone who can help with storytelling in Jaipur." maxLength={3000} required /></Field>
        <div className="flex justify-between text-xs text-[var(--text-2)]"><span>Your words stay yours.</span><span>{draft.text.length}/3000</span></div>
        <div className="card space-y-3 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-text)]"><WandSparkles size={15} aria-hidden="true" />Need a starting point?</p>{['I want to build a small app and find a design collaborator.', 'I’m looking for a running buddy in my city on weekends.', 'I want to learn filmmaking. I can help with video editing.'].map((example) => <button key={example} type="button" onClick={() => update({ text: example, preview: null })} className="block min-h-11 w-full rounded-lg p-2 text-left text-xs leading-relaxed text-[var(--text-2)] hover:bg-[var(--surface-2)]">“{example}” <ArrowRight size={12} className="inline" aria-hidden="true" /></button>)}</div>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-2)]"><ShieldCheck size={16} className="shrink-0" aria-hidden="true" />Local, rule-based interpretation — not a live AI service. Review everything before it becomes a public demo intent.</p>
      </>}
      {step === 5 && preview && <>
        <div className="rounded-2xl bg-[var(--accent-soft)] p-4 text-xs leading-relaxed text-[var(--accent-text)]"><Sparkles size={16} className="mb-2" aria-hidden="true" />A starting point, not a label. Your interests and the value you can exchange help us suggest people.</div>
        <Field label="Your original words" hint="Editing your words refreshes the interpretation below."><textarea className="input min-h-28 resize-y" value={draft.text} maxLength={3000} required onChange={(event) => update({ text: event.target.value, preview: interpret(event.target.value) })} /></Field>
        <div className="card space-y-5 p-4"><p className="eyebrow">Our interpretation · editable</p>
          <Field label="Your goal"><textarea className="input min-h-24" value={preview.goal} maxLength={3000} required onChange={(event) => editPreview({ goal: event.target.value })} /></Field>
          <Field label="Intent type"><select className="input" value={preview.intentType} onChange={(event) => editPreview({ intentType: event.target.value as IntentType })}>{INTENT_TYPES.map((type) => <option key={type} value={type}>{pretty(type)}</option>)}</select></Field>
          <Field label="Main interest"><select className="input" value={preview.domain} onChange={(event) => editPreview({ domain: event.target.value })}><option value="general">General / exploring</option>{!INTEREST_MAP.has(preview.domain) && preview.domain !== 'general' && <option value={preview.domain}>{interestLabel(preview.domain)}</option>}{INTERESTS.map((interest) => <option key={interest.id} value={interest.id}>{interest.label}</option>)}</select></Field>
          <Field label="The connection you want"><select className="input" value={preview.relationship} onChange={(event) => editPreview({ relationship: event.target.value as IntentInterpretation['relationship'] })}>{RELATIONSHIPS.map((id) => <option key={id} value={id}>{pretty(id)}</option>)}</select></Field>
          <Field label="Location"><input className="input" value={preview.location} maxLength={100} required onChange={(event) => editPreview({ location: event.target.value })} /></Field>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={preview.remoteAllowed} onChange={(event) => editPreview({ remoteAllowed: event.target.checked })} />Open to remote connections</label>
          <Choices label="Skills needed — tap to remove" options={preview.skillsNeeded.map((id) => ({ id, label: skillLabel(id) }))} selected={preview.skillsNeeded} onToggle={(id) => editPreview({ skillsNeeded: preview.skillsNeeded.filter((item) => item !== id) })} />
          <Field label="Add a needed skill"><select className="input" value="" onChange={(event) => { if (event.target.value) editPreview({ skillsNeeded: unique([...preview.skillsNeeded, event.target.value]) }); }}><option value="">Choose a skill…</option>{SKILLS.filter((skill) => !preview.skillsNeeded.includes(skill.id)).map((skill) => <option key={skill.id} value={skill.id}>{skill.label}</option>)}</select></Field>
          <Choices label="Skills offered — tap to remove" options={preview.skillsOffered.map((id) => ({ id, label: skillLabel(id) }))} selected={preview.skillsOffered} onToggle={(id) => editPreview({ skillsOffered: preview.skillsOffered.filter((item) => item !== id) })} />
          <Field label="Add an offered skill"><select className="input" value="" onChange={(event) => { if (event.target.value) editPreview({ skillsOffered: unique([...preview.skillsOffered, event.target.value]) }); }}><option value="">Choose a skill…</option>{SKILLS.filter((skill) => !preview.skillsOffered.includes(skill.id)).map((skill) => <option key={skill.id} value={skill.id}>{skill.label}</option>)}</select></Field>
          <details className="border-t border-[var(--line)] pt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Timing, experience & other details</summary><div className="space-y-4 pt-3">
            <Field label="When"><input className="input" value={preview.time ?? ''} placeholder="Not specified" maxLength={100} onChange={(event) => editPreview({ time: event.target.value || null })} /></Field>
            <Field label="Experience wanted"><select className="input" value={preview.experience} onChange={(event) => editPreview({ experience: event.target.value as IntentInterpretation['experience'] })}>{['any', 'beginner', 'intermediate', 'experienced'].map((id) => <option key={id} value={id}>{pretty(id)}</option>)}</select></Field>
            <Field label="Compensation"><select className="input" value={preview.compensation} onChange={(event) => editPreview({ compensation: event.target.value as IntentInterpretation['compensation'] })}><option value="unspecified">Not specified</option><option value="free">Free / unpaid</option><option value="paid">Paid</option></select></Field>
            <Field label="Genre or focus"><input className="input" value={preview.genre ?? ''} placeholder="Not specified" maxLength={100} onChange={(event) => editPreview({ genre: event.target.value || null })} /></Field>
            <Field label="Keywords (comma-separated)"><input className="input" value={preview.keywords.join(', ')} maxLength={500} onChange={(event) => editPreview({ keywords: event.target.value.split(',').map((word) => word.trim()) })} /></Field>
          </div></details>
        </div>
        <p className="text-xs leading-relaxed text-[var(--text-2)]">Continuing saves your profile and shares this intent publicly inside this local demo. Avoid phone numbers, addresses, or other sensitive information.</p>
      </>}
      {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}
      <footer className="space-y-3 border-t border-[var(--line)] pt-5"><button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Saving your intent…' : step === 5 ? 'Find my people' : step === 4 ? 'See my interpretation' : (step === 2 && !draft.skills.length) || (step === 3 && !draft.needs.length) ? 'Skip for now' : 'Continue'}<ArrowRight size={17} aria-hidden="true" /></button><p className="text-center text-[10px] leading-relaxed text-[var(--text-2)]" role="status">{storageWarning ? 'Draft can’t be saved in this browser. Keep this tab open.' : 'Your progress is saved in this tab. Take your time.'}</p></footer>
    </form>
  </main>;
}

export function Building() {
  const state = useNexus();
  const me = state.users.find((user) => user.id === state.meId);
  const matches = useMemo(() => me ? matchPeople(me, state.users, state.intents, unique([...state.blockedUsers.map((item) => item.userId), ...state.mutedUsers.map((item) => item.userId), ...state.passedUserIds])) : [], [me, state.users, state.intents, state.blockedUsers, state.mutedUsers, state.passedUserIds]);
  useEffect(() => {
    if (!state.signedIn) { navigate('welcome'); return; }
    if (!state.onboardingComplete) { navigate('onboarding'); return; }
    const timer = window.setTimeout(() => navigate('first-matches'), 2600);
    return () => window.clearTimeout(timer);
  }, [state.signedIn, state.onboardingComplete]);
  return <main className="flex min-h-full flex-col justify-center px-7 py-10 text-center">
    <p className="mb-8 text-sm font-extrabold tracking-[.25em]">NEXUS<span className="text-[var(--accent)]">.</span></p>
    <div className="motion-safe:animate-pulse"><NetworkMotif compact /></div>
    <p className="mt-7 text-[10px] font-bold tracking-[.2em] text-[var(--accent-text)]">YOUR NEXT CHAPTER STARTS HERE</p>
    <h1 className="mt-3 text-[30px] leading-tight font-semibold tracking-[-.04em]">Your network is<br />taking shape.</h1>
    <p className="mt-4 text-sm leading-relaxed text-[var(--text-2)]">Not just people like you.<br />People you can do something with.</p>
    <div className="card mt-7 space-y-4 p-5 text-left">
      <p className="flex items-center gap-3 text-sm"><CheckCircle2 size={18} className="text-[var(--good)]" aria-hidden="true" />Your profile and intent are saved</p>
      <p className="flex items-center gap-3 text-sm"><Compass size={18} className="text-[var(--accent)]" aria-hidden="true" />Interests, skills, and goals considered</p>
      <p className="flex items-center gap-3 text-sm" role="status"><Users size={18} className="text-[var(--accent)]" aria-hidden="true" /><span><strong>{matches.length}</strong> {matches.length === 1 ? 'person' : 'people'} in your demo suggestions</span></p>
    </div>
    <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => navigate('first-matches')}>{matches.length ? 'Meet my first matches' : 'Explore my network'}<ArrowRight size={17} aria-hidden="true" /></button>
    <p className="mt-4 text-[10px] leading-relaxed text-[var(--text-2)]">Based on actual demo profiles, not live people.<br />Opening your suggestions automatically…</p>
  </main>;
}
