import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Check, Search, Save, UserRound, Sparkles, HandHeart, Compass } from 'lucide-react';
import type { Availability, ExperienceLevel, Role, User } from '../domain/types';
import { INTERESTS, SKILLS, AVAILABILITY_LABELS, CITIES, interestLabel, skillLabel } from '../domain/ontology';
import { useMe, useNexus } from '../repo/store';
import { profile } from '../services/repo';
import { navigate } from '../routerStore';
import { ImageUpload } from '../components/ImageUpload';
import { isUploadedImage } from '../services/image';

type Draft = Pick<User, 'name' | 'username' | 'headline' | 'avatar' | 'accentHue' | 'city' | 'bio' | 'currently' | 'roles' | 'interests' | 'skills' | 'needs' | 'availability' | 'experience'>;
const ROLES: Role[] = ['student', 'creator', 'founder', 'freelancer', 'professional', 'developer', 'designer', 'artist', 'educator', 'explorer'];
const makeDraft = (me: User): Draft => ({ name: me.name, username: me.username, headline: me.headline, avatar: me.avatar, accentHue: me.accentHue, city: me.city, bio: me.bio, currently: me.currently, roles: [...me.roles], interests: [...me.interests], skills: [...me.skills], needs: [...me.needs], availability: me.availability, experience: me.experience });

function Selection({ label, hint, options, selected, onChange, labelFor }: { label: string; hint: string; options: { id: string; label: string; category: string }[]; selected: string[]; onChange: (next: string[]) => void; labelFor: (id: string) => string }) {
  const [query, setQuery] = useState('');
  const id = useId();
  const filtered = options.filter(option => `${option.label} ${option.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  function toggle(value: string) { onChange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]); }
  return <fieldset className="space-y-3"><legend className="font-semibold">{label}</legend><p className="text-xs leading-relaxed text-[var(--text-2)]">{hint}</p>
    {selected.length > 0 && <div className="flex flex-wrap gap-2" aria-label={`Selected ${label.toLowerCase()}`}>{selected.map(value => <button key={value} type="button" className="chip !min-h-10" data-selected="true" aria-label={`Remove ${labelFor(value)} from ${label.toLowerCase()}`} onClick={() => toggle(value)}>{labelFor(value)}<span aria-hidden="true">×</span></button>)}</div>}
    <label htmlFor={id} className="sr-only">Search {label.toLowerCase()}</label><div className="relative"><Search aria-hidden="true" size={17} className="pointer-events-none absolute top-4 left-3 text-[var(--text-2)]" /><input id={id} className="input !pl-10" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}…`} /></div>
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--line)] p-2" role="group" aria-label={`${label} options`}>{filtered.length ? filtered.map(option => <label key={option.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${selected.includes(option.id) ? 'bg-[var(--accent-soft)]' : ''}`}><input type="checkbox" className="h-4 w-4 shrink-0 accent-[var(--accent)]" checked={selected.includes(option.id)} onChange={() => toggle(option.id)} /><span className="flex-1 text-sm">{option.label}</span><span className="text-[10px] text-[var(--text-2)]">{option.category}</span></label>) : <p className="p-3 text-sm text-[var(--text-2)]">No matches. Try a broader topic.</p>}</div><p className="text-xs text-[var(--text-2)]">{selected.length} selected · Choose what matters to you.</p>
  </fieldset>;
}

export function EditProfile() {
  const me = useMe();
  const signedIn = useNexus(state => state.signedIn);
  const [draft, setDraft] = useState<Draft>(() => makeDraft(me));
  const [baseline, setBaseline] = useState(() => JSON.stringify(makeDraft(me)));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const dirty = JSON.stringify(draft) !== baseline;
  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(current => ({ ...current, [key]: value })); setSuccess(''); setError(''); }
  function toggleRole(role: Role) {
    if (!draft.roles.includes(role) && draft.roles.length >= 3) { setError('Choose up to three roles. Remove one before adding another.'); return; }
    update('roles', draft.roles.includes(role) ? draft.roles.filter(item => item !== role) : [...draft.roles, role]);
  }
  function leave() { if (dirty) setDiscard(true); else navigate('me'); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSuccess('');
    if (!draft.name.trim()) { setError('Please enter your name.'); return; }
    const username = draft.username.trim().replace(/^@/, '');
    if (!username || username.length > 40 || !/^[a-zA-Z0-9_.-]+$/.test(username)) { setError('Enter a username of up to 40 letters, numbers, dots, dashes, or underscores.'); return; }
    if (draft.roles.length === 0) { setError('Choose at least one role to describe yourself.'); return; }
    if (!Number.isFinite(draft.accentHue) || draft.accentHue < 0 || draft.accentHue > 360) { setError('Choose an avatar color between 0 and 360.'); return; }
    const avatar = draft.avatar.trim();
    if (avatar && !isUploadedImage(avatar) && !avatar.startsWith('gradient') && !avatar.startsWith('/') && !/^https?:\/\//i.test(avatar)) { setError('Use an image URL beginning with https://, a local path beginning with /, or leave the avatar blank for initials.'); return; }
    setSaving(true);
    try {
      const saved = await profile.update({ ...draft, name: draft.name.trim(), username, headline: draft.headline.trim(), city: draft.city.trim(), bio: draft.bio.trim(), currently: draft.currently.trim(), avatar });
      const next = makeDraft(saved); setDraft(next); setBaseline(JSON.stringify(next)); setSuccess('Your profile has been updated in this local demo.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save your profile. Please try again.'); }
    finally { setSaving(false); }
  }
  const avatarImage = draft.avatar && !draft.avatar.startsWith('gradient') && !imageFailed;
  return <main className="space-y-5 px-5 pb-8"><header className="flex items-center gap-3 py-4"><button type="button" className="btn btn-ghost !p-3" aria-label="Back to your profile" onClick={leave}><ArrowLeft size={21} /></button><h1 className="text-xl font-bold tracking-tight">Edit profile</h1></header>
    {!signedIn ? <section className="card space-y-3 p-5"><UserRound size={28} className="text-[var(--accent-text)]" /><h2 className="font-semibold">Sign in to edit your profile</h2><button className="btn btn-primary" onClick={() => navigate('welcome')}>Go to welcome</button></section> : <>
      <div><p className="eyebrow">A person, not a popularity score</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Let the right people find you.</h2><p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">Show what you care about, what you can offer, and what you’d love to learn.</p></div>
      {discard && <section className="card space-y-3 !border-[var(--warn)] p-5" role="group" aria-label="Discard unsaved changes"><h2 className="font-semibold">Leave without saving?</h2><p className="text-sm text-[var(--text-2)]">Your unsaved profile changes will be lost.</p><div className="flex flex-wrap gap-2"><button className="btn btn-secondary" onClick={() => setDiscard(false)}>Keep editing</button><button className="btn btn-danger" onClick={() => navigate('me')}>Discard changes</button></div></section>}
      <form noValidate onSubmit={save} className="space-y-5">
        <fieldset disabled={saving} className="card space-y-4 p-5"><legend className="sr-only">Identity</legend><h2 className="flex items-center gap-2 font-semibold"><UserRound size={19} />Your identity</h2>
          <div className="flex items-center gap-4"><span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl text-2xl font-bold text-white" style={{ background: `linear-gradient(145deg,hsl(${draft.accentHue} 60% 65%),hsl(${draft.accentHue + 35} 55% 38%))` }}>{avatarImage ? <img className="h-full w-full object-cover" src={draft.avatar} alt="Profile preview" onError={() => setImageFailed(true)} /> : draft.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() || <UserRound size={30} />}</span><div className="min-w-0"><p className="truncate font-semibold">{draft.name || 'Your name'}</p><p className="text-xs text-[var(--text-2)]">A little more you.</p></div></div>
          <ImageUpload label="Upload profile photo" variant="avatar" value={draft.avatar} onBusyChange={setImageBusy} onChange={value => { setImageFailed(false); update('avatar', value); }} />
          <label className="block text-sm font-medium">Name <span className="text-[var(--danger)]">*</span><input className="input mt-2" autoComplete="name" required maxLength={100} value={draft.name} onChange={event => update('name', event.target.value)} /></label>
          <label className="block text-sm font-medium">Username <span className="text-[var(--danger)]">*</span><input className="input mt-2" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={40} value={draft.username} onChange={event => update('username', event.target.value)} /><span className="mt-1 block text-xs font-normal text-[var(--text-2)]">Your unique handle, without the @.</span></label>
          <label className="block text-sm font-medium">Headline<input className="input mt-2" maxLength={160} placeholder="Video editor · Curious builder" value={draft.headline} onChange={event => update('headline', event.target.value)} /></label>
          <label className="block text-sm font-medium">City<input className="input mt-2" list="profile-cities" autoComplete="address-level2" maxLength={100} placeholder="Your city or Remote" value={draft.city} onChange={event => update('city', event.target.value)} /><datalist id="profile-cities">{CITIES.map(city => <option value={city} key={city} />)}</datalist><span className="mt-1 block text-xs font-normal text-[var(--text-2)]">City only, never a street address. Visibility is controlled in settings.</span></label>
          <label className="block text-sm font-medium">About you<textarea className="input mt-2 min-h-28 resize-y" maxLength={1200} placeholder="What makes you, you?" value={draft.bio} onChange={event => update('bio', event.target.value)} /><span className="mt-1 block text-right text-xs font-normal text-[var(--text-2)]">{draft.bio.length}/1200</span></label>
          <label className="block text-sm font-medium">Currently working on<textarea className="input mt-2 min-h-24 resize-y" maxLength={300} placeholder="Learning color grading and planning a short film…" value={draft.currently} onChange={event => update('currently', event.target.value)} /></label>
          <details className="rounded-xl border border-[var(--line)] p-3"><summary className="cursor-pointer text-sm font-medium">Avatar image & color</summary><div className="mt-4 space-y-4"><label className="block text-sm font-medium">Image URL or local path<input className="input mt-2" type="text" maxLength={2000} placeholder="/images/avatar.jpg or https://…" value={draft.avatar} onChange={event => { setImageFailed(false); update('avatar', event.target.value); }} /><span className="mt-1 block text-xs font-normal text-[var(--text-2)]">Leave blank for initials. External images may contact their host.</span></label>{imageFailed && <p className="text-xs text-[var(--warn)]">Image could not load. Your initials will be shown instead.</p>}<label className="block text-sm font-medium">Initials background color<input className="mt-3 w-full accent-[var(--accent)]" type="range" min={0} max={360} step={1} value={draft.accentHue} onChange={event => update('accentHue', Number(event.target.value))} /><span className="text-xs font-normal text-[var(--text-2)]">Hue: {draft.accentHue}°</span></label></div></details>
        </fieldset>
        <fieldset disabled={saving} className="card space-y-4 p-5"><legend className="sr-only">Roles and experience</legend><h2 className="font-semibold">What describes you?</h2><p className="text-xs text-[var(--text-2)]">Choose 1–3 roles. You don’t have to fit in one box.</p><div className="flex flex-wrap gap-2">{ROLES.map(role => <label key={role} className="chip !min-h-11 capitalize" data-selected={draft.roles.includes(role)}><input type="checkbox" className="accent-[var(--accent)]" checked={draft.roles.includes(role)} disabled={!draft.roles.includes(role) && draft.roles.length >= 3} onChange={() => toggleRole(role)} />{role}</label>)}</div><p className="text-xs text-[var(--text-2)]">{draft.roles.length}/3 roles selected</p><label className="block text-sm font-medium">Experience<select className="input mt-2" value={draft.experience} onChange={event => update('experience', event.target.value as ExperienceLevel)}><option value="beginner">Beginner — finding my footing</option><option value="intermediate">Intermediate — growing my craft</option><option value="experienced">Experienced — ready to share</option></select></label><label className="block text-sm font-medium">Availability<select className="input mt-2" value={draft.availability} onChange={event => update('availability', event.target.value as Availability)}>{Object.entries(AVAILABILITY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></fieldset>
        <fieldset disabled={saving} className="card space-y-4 p-5"><legend className="sr-only">Interests</legend><div className="flex items-center gap-2 text-[var(--accent-text)]"><Compass size={20} /><span className="eyebrow">Your world</span></div><Selection label="Interests" hint="Explore broad interests and deeper topics. These help explain your matches." options={INTERESTS} selected={draft.interests} onChange={value => update('interests', value)} labelFor={interestLabel} /></fieldset>
        <fieldset disabled={saving} className="card space-y-4 p-5"><legend className="sr-only">Skills you offer</legend><div className="flex items-center gap-2 text-[var(--accent-text)]"><HandHeart size={20} /><span className="eyebrow">I can help with</span></div><Selection label="Skills" hint="What can people come to you for? Everyday skills count, too." options={SKILLS} selected={draft.skills} onChange={value => update('skills', value)} labelFor={skillLabel} /></fieldset>
        <fieldset disabled={saving} className="card space-y-4 p-5"><legend className="sr-only">Help you need</legend><div className="flex items-center gap-2 text-[var(--accent-text)]"><Sparkles size={20} /><span className="eyebrow">I’m looking for</span></div><Selection label="Needs" hint="What could you use help with? This makes matching a two-way exchange." options={SKILLS} selected={draft.needs} onChange={value => update('needs', value)} labelFor={skillLabel} /></fieldset>
        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">{error}</p>}
        {success && <div role="status" className="space-y-3 rounded-xl bg-[var(--accent-soft)] p-4 text-sm text-[var(--accent-text)]"><p className="flex items-start gap-2"><Check size={18} className="shrink-0" />{success}</p><button type="button" className="btn btn-secondary w-full" onClick={() => navigate('me')}>View my profile</button></div>}
        <div className="space-y-3"><button type="submit" className="btn btn-primary w-full" disabled={saving || imageBusy || !dirty}><Save size={18} />{saving ? 'Saving…' : 'Save profile'}</button><button type="button" className="btn btn-secondary w-full" disabled={saving} onClick={leave}>{dirty ? 'Cancel changes' : 'Back to my profile'}</button><button type="button" className="btn btn-ghost w-full !text-sm" disabled={saving || dirty} onClick={() => navigate('settings')}>Privacy & account settings</button>{dirty && <p className="text-center text-xs text-[var(--text-2)]">Save or cancel your changes before opening settings.</p>}</div>
      </form>
    </>}
  </main>;
}
