import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, ShieldCheck, Sun, Moon, Monitor, UserRound, Ban, VolumeX, RotateCcw, LogOut, LockKeyhole, ChartNoAxesColumn, Flag } from 'lucide-react';
import type { Privacy, Report } from '../domain/types';
import { useMe, useNexus, resetDemo, db } from '../repo/store';
import { auth, privacy, blocks, mutes, moderation } from '../services/repo';
import { api } from '../services/api';
import { navigate } from '../routerStore';

type Theme = 'light' | 'dark' | 'system';
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
function Header({ title, to = 'settings' }: { title: string; to?: 'settings' | 'me' }) {
  return <header className="flex items-center gap-3 py-4"><button className="btn btn-ghost !p-3" aria-label={`Back to ${to === 'me' ? 'your profile' : 'settings'}`} onClick={() => navigate(to)}><ArrowLeft size={21} /></button><h1 className="text-xl font-bold tracking-tight">{title}</h1></header>;
}
function Feedback({ error, success }: { error: string; success: string }) {
  return <>{error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}{success && <p role="status" className="rounded-xl bg-[var(--accent-soft)] p-3 text-sm text-[var(--accent-text)]">{success}</p>}</>;
}

export function Settings() {
  const me = useMe();
  const { signedIn, blockedUsers, mutedUsers } = useNexus();
  const [theme, setTheme] = useState<Theme>(() => {
    try { const saved = localStorage.getItem('nexus-theme'); return saved === 'light' || saved === 'dark' ? saved : 'system'; } catch { return 'system'; }
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('theme-dark', theme === 'dark' || (theme === 'system' && media.matches));
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  function changeTheme(next: Theme) {
    setError(''); setSuccess(''); setTheme(next);
    try { localStorage.setItem('nexus-theme', next); window.dispatchEvent(new Event('nexus-theme-change')); setSuccess('Appearance saved on this device.'); }
    catch { setError('Appearance changed for now, but browser storage is unavailable.'); }
  }
  function changePrivacy(next: Partial<Privacy>) {
    setError(''); setSuccess('');
    try { privacy.update(next); setSuccess('Privacy preferences updated.'); } catch (error) { setError(errorText(error)); }
  }
  async function reset() {
    setResetting(true); setError(''); setSuccess('');
    try { await resetDemo(); navigate('welcome'); }
    catch (error) { setError(errorText(error)); setResetting(false); }
  }
  const toggles = [
    { key: 'discoverable' as const, title: 'Discoverable profile', detail: 'Let people find you in people discovery.' },
    { key: 'showCity' as const, title: 'Show my city', detail: 'City only. Never your precise location.' },
    { key: 'showInLocalSuggestions' as const, title: 'Local suggestions', detail: 'Include your profile in nearby recommendations.' },
  ];
  return <main className="space-y-5 px-5 pb-8">
    <Header title="Settings" to="me" />
    <Feedback error={error} success={success} />
    <section className="card space-y-4 p-5" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading" className="font-semibold">Make it feel like you</h2>
      <fieldset><legend className="mb-3 text-sm text-[var(--text-2)]">Appearance</legend><div className="grid grid-cols-3 gap-2">{([{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Monitor }] as const).map(({ value, label, icon: Icon }) => <label key={value} className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border p-3 text-xs font-medium ${theme === value ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]' : 'border-[var(--line)] text-[var(--text-2)]'}`}><Icon size={22} /><span>{label}</span><input className="accent-[var(--accent)]" type="radio" name="theme" value={value} checked={theme === value} onChange={() => changeTheme(value)} /></label>)}</div></fieldset>
    </section>
    {signedIn ? <>
      <button className="card flex min-h-16 w-full items-center gap-3 p-5 text-left" onClick={() => navigate('edit-profile')}><UserRound size={21} className="text-[var(--accent-text)]" /><span className="flex-1 font-semibold">Edit profile</span><ChevronRight size={18} /></button>
      <section className="card space-y-4 p-5" aria-labelledby="privacy-heading"><h2 id="privacy-heading" className="flex items-center gap-2 font-semibold"><LockKeyhole size={19} />Privacy & discovery</h2>
        {toggles.map(({ key, title, detail }) => <label key={key} className="flex cursor-pointer items-center justify-between gap-4 border-b border-[var(--line)] pb-4"><span><span className="block text-sm font-medium">{title}</span><span className="mt-1 block text-xs leading-relaxed text-[var(--text-2)]">{detail}</span></span><input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--accent)]" checked={me.privacy[key]} onChange={event => changePrivacy({ [key]: event.target.checked })} /></label>)}
        <label className="block text-sm font-medium">Who can message me<select className="input mt-2" value={me.privacy.whoCanMessage} onChange={event => changePrivacy({ whoCanMessage: event.target.value as Privacy['whoCanMessage'] })}><option value="anyone">Anyone</option><option value="connections-only">Connections only</option></select></label>
      </section>
      <button className="card flex w-full items-center gap-3 p-5 text-left" onClick={() => navigate('blocked')}><Ban size={21} className="text-[var(--accent-text)]" /><span className="flex-1"><span className="block font-semibold">Blocked & muted</span><span className="text-xs text-[var(--text-2)]">{blockedUsers.length} blocked · {mutedUsers.length} muted</span></span><ChevronRight size={18} /></button>
      {me.isAdmin && <button className="card flex w-full items-center gap-3 p-5 text-left" onClick={() => navigate('admin')}><ShieldCheck size={21} className="text-[var(--accent-text)]" /><span className="flex-1"><span className="block font-semibold">Admin workspace</span><span className="text-xs text-[var(--text-2)]">Reports & local demo analytics</span></span><ChevronRight size={18} /></button>}
    </> : <section className="card p-5"><p className="mb-3 text-sm text-[var(--text-2)]">Sign in to manage profile and privacy settings.</p><button className="btn btn-primary" onClick={() => navigate('welcome')}>Go to welcome</button></section>}
    <section className="rounded-2xl bg-[var(--accent-soft)] p-5 text-sm leading-relaxed"><h2 className="mb-2 font-semibold text-[var(--accent-text)]">18+ · A local-only demo</h2><p className="text-[var(--text-2)]">NEXUS is for adults 18 and older. Profiles, conversations, reports, and settings in this demo stay in this browser. Other people are demo personas; there is no live network, verified identity, or real moderation team. Please don’t enter sensitive information.</p></section>
    <section className="card space-y-3 p-5"><h2 className="font-semibold">Demo & account</h2>
      {!confirmReset ? <button className="btn btn-danger w-full" onClick={() => { setConfirmReset(true); setSuccess(''); }}><RotateCcw size={18} />Reset demo</button> : <div className="space-y-3 rounded-xl border border-[var(--danger)] p-4" role="group" aria-label="Confirm demo reset"><h3 className="font-semibold">Start fresh?</h3><p className="text-sm text-[var(--text-2)]">This permanently removes your local edits, messages, connections, and reports and restores the demo. This cannot be undone. Your appearance preference is kept.</p><div className="flex flex-wrap gap-2"><button className="btn btn-danger" disabled={resetting} onClick={reset}>{resetting ? 'Resetting…' : 'Yes, reset demo'}</button><button className="btn btn-secondary" disabled={resetting} onClick={() => setConfirmReset(false)}>Cancel</button></div></div>}
      {signedIn && <button className="btn btn-secondary w-full" disabled={resetting} onClick={async () => { const wasAccount = db.getState().authMode === 'account'; auth.signOut(); if (wasAccount) await api.signout(); navigate('welcome'); }}><LogOut size={18} />Sign out</button>}
      <p className="text-xs leading-relaxed text-[var(--text-2)]">Signing out keeps your demo data on this device. Reset the demo to remove your changes.</p>
    </section>
  </main>;
}

export function Blocked() {
  const { signedIn, users, blockedUsers, mutedUsers, conversations, meId } = useNexus();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mutedIds = [...new Set([...mutedUsers.map(item => item.userId), ...conversations.filter(item => item.muted && item.memberIds.includes(meId)).flatMap(item => item.memberIds.filter(id => id !== meId))])];
  function remove(id: string, kind: 'blocked' | 'muted') {
    setError(''); setSuccess('');
    try { if (kind === 'blocked') blocks.remove(id); else mutes.remove(id); setSuccess(`${users.find(user => user.id === id)?.name ?? 'Person'} ${kind === 'blocked' ? 'unblocked' : 'unmuted'}.`); }
    catch (error) { setError(errorText(error)); }
  }
  return <main className="space-y-5 px-5 pb-8"><Header title="Blocked & muted" /><Feedback error={error} success={success} />
    {!signedIn ? <section className="card p-5"><p className="mb-3">Sign in to manage blocked and muted people.</p><button className="btn btn-primary" onClick={() => navigate('welcome')}>Go to welcome</button></section> : <>
      <p className="text-sm leading-relaxed text-[var(--text-2)]">Your boundaries, your choice. Unblocking does not restore declined connection requests.</p>
      {([{ kind: 'blocked', title: 'Blocked people', ids: blockedUsers.map(item => item.userId), icon: Ban, explanation: 'Blocked people are excluded from discovery and interactions.', empty: 'No blocked people.' }, { kind: 'muted', title: 'Muted people', ids: mutedIds, icon: VolumeX, explanation: 'Muting hides their posts and silences their demo message notifications.', empty: 'No muted people.' }] as const).map(({ kind, title, ids, icon: Icon, explanation, empty }) => <section className="card space-y-4 p-5" key={kind}><h2 className="flex items-center gap-2 font-semibold"><Icon size={19} />{title}<span className="ml-auto text-sm text-[var(--text-2)]">{ids.length}</span></h2><p className="text-xs leading-relaxed text-[var(--text-2)]">{explanation}</p>{ids.length === 0 ? <p className="rounded-xl bg-[var(--surface-2)] p-4 text-sm text-[var(--text-2)]">{empty}</p> : ids.map(id => { const user = users.find(item => item.id === id); return <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3" key={id}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] font-semibold text-[var(--accent-text)]">{user?.name.charAt(0) ?? '?'}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{user?.name ?? 'Unavailable profile'}</span><span className="block truncate text-xs text-[var(--text-2)]">{user ? `@${user.username}` : id}</span></span><button className="btn btn-secondary !px-3 !text-xs" onClick={() => remove(id, kind)}>{kind === 'blocked' ? 'Unblock' : 'Unmute'}</button></div>; })}</section>)}
    </>}
  </main>;
}

const funnel = [
  ['demo_sign_in', 'Demo sign-ins'], ['onboarding_completed', 'Onboarding completions'], ['intent_created', 'Intents created'], ['connection_requested', 'Connection requests'], ['connection_accepted', 'Accepted connections'], ['message_sent', 'Messages sent'], ['circle_joined', 'Circle joins'], ['help_offered', 'Help offers'],
] as const;
export function Admin() {
  const { signedIn, users, meId, reports, analyticsEvents, posts, messages, intents } = useNexus();
  const me = users.find(user => user.id === meId);
  const [filter, setFilter] = useState<'all' | Report['status']>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function act(reportId: string, action: 'review' | 'dismiss' | 'warn' | 'suspend') {
    setError(''); setSuccess(''); setBusy(reportId);
    try { await (action === 'suspend' ? moderation.suspend(reportId, 'Suspended by an administrator from the NEXUS admin workspace.') : moderation[action](reportId)); setSuspendId(null); setSuccess(`Report ${action === 'review' ? 'marked as reviewing' : action === 'dismiss' ? 'dismissed' : action === 'warn' ? 'resolved with a local warning' : 'resolved with a local account suspension'}.`); }
    catch (error) { setError(errorText(error)); }
    finally { setBusy(null); }
  }
  function targetOwner(report: Report) {
    const id = report.targetKind === 'user' ? report.targetId : report.targetKind === 'post' ? posts.find(item => item.id === report.targetId)?.userId : report.targetKind === 'message' ? messages.find(item => item.id === report.targetId)?.senderId : intents.find(item => item.id === report.targetId)?.userId;
    return users.find(user => user.id === id);
  }
  if (!signedIn || !me?.isAdmin) return <main className="space-y-5 px-5 pb-8"><Header title="Admin workspace" /><section className="card space-y-3 p-5"><ShieldCheck size={30} className="text-[var(--accent-text)]" /><h2 className="font-semibold">Admin access required</h2><p className="text-sm text-[var(--text-2)]">Only a signed-in administrator can view reports and analytics.</p><button className="btn btn-secondary" onClick={() => navigate('settings')}>Back to settings</button></section></main>;
  const visible = reports.filter(report => filter === 'all' || report.status === filter).sort((a, b) => b.createdAt - a.createdAt);
  return <main className="space-y-5 px-5 pb-8"><Header title="Admin workspace" /><p className="text-sm leading-relaxed text-[var(--text-2)]">Local demo tools. Actions update this browser only and do not notify real users or a safety team.</p><Feedback error={error} success={success} />
    <section className="card space-y-4 p-5"><h2 className="flex items-center gap-2 font-semibold"><ChartNoAxesColumn size={20} />Demo activity funnel</h2><p className="text-xs leading-relaxed text-[var(--text-2)]">Counts from the retained local event log (up to 200 events). These are actions, not unique people or conversion rates. Seeded content is not evidence of product success, meaningful relationships, or completed collaborations.</p><dl className="grid grid-cols-2 gap-2">{funnel.map(([event, label]) => <div className="rounded-xl bg-[var(--surface-2)] p-3" key={event}><dd className="text-2xl font-bold tabular-nums">{analyticsEvents.filter(item => item.name === event).length}</dd><dt className="mt-1 text-xs text-[var(--text-2)]">{label}</dt></div>)}</dl><p className="text-xs text-[var(--text-2)]">{analyticsEvents.length} events retained · No outcome validation in this demo.</p></section>
    <section className="space-y-4" aria-labelledby="reports-heading"><div className="flex items-center justify-between gap-3"><h2 id="reports-heading" className="flex items-center gap-2 font-semibold"><Flag size={19} />Reports ({reports.length})</h2><label className="text-xs text-[var(--text-2)]"><span className="sr-only">Filter report status</span><select className="input !py-2 !text-sm" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="all">All statuses</option><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option></select></label></div>
      {visible.length === 0 && <div className="card p-6 text-center"><ShieldCheck size={28} className="mx-auto mb-3 text-[var(--accent-text)]" /><h3 className="font-semibold">No {filter === 'all' ? '' : `${filter} `}reports</h3><p className="mt-2 text-sm text-[var(--text-2)]">Reports submitted in this demo appear here.</p></div>}
      {visible.map(report => { const owner = targetOwner(report); return <article key={report.id} className="card space-y-3 p-5"><div className="flex items-start justify-between gap-2"><h3 className="min-w-0 break-words font-semibold">{report.targetLabel || report.targetId}</h3><span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs capitalize text-[var(--accent-text)]">{report.status}</span></div><dl className="space-y-2 break-words text-sm"><div><dt className="text-xs text-[var(--text-2)]">Target</dt><dd className="capitalize">{report.targetKind} · {report.targetId}</dd></div><div><dt className="text-xs text-[var(--text-2)]">Reporter</dt><dd>{report.reporterName} <span className="text-xs text-[var(--text-2)]">({report.reporterId})</span></dd></div><div><dt className="text-xs text-[var(--text-2)]">Reason</dt><dd>{report.reason}</dd></div><div><dt className="text-xs text-[var(--text-2)]">Detail</dt><dd className="whitespace-pre-wrap">{report.detail || 'No additional detail provided.'}</dd></div><div><dt className="text-xs text-[var(--text-2)]">Action</dt><dd className="capitalize">{report.action === 'none' ? 'No action taken' : report.action}</dd>{report.actionNote && <dd className="whitespace-pre-wrap">{report.actionNote}</dd>}</div></dl><p className="text-xs text-[var(--text-2)]">Filed {new Date(report.createdAt).toLocaleString()}</p>
        {report.status !== 'resolved' && <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-3"><button className="btn btn-secondary !px-3 !text-xs" disabled={busy !== null || report.status === 'reviewing'} onClick={() => act(report.id, 'review')}>{report.status === 'reviewing' ? 'Reviewing' : 'Review'}</button><button className="btn btn-secondary !px-3 !text-xs" disabled={busy !== null} onClick={() => act(report.id, 'dismiss')}>Dismiss</button><button className="btn btn-secondary !px-3 !text-xs" disabled={busy !== null || !owner || owner.id === meId} onClick={() => act(report.id, 'warn')}>Warn</button><button className="btn btn-danger !px-3 !text-xs" disabled={busy !== null || !owner || owner.id === meId || owner.suspended} onClick={() => setSuspendId(report.id)}>{owner?.suspended ? 'Suspended' : 'Suspend'}</button></div>}
        {report.status !== 'resolved' && (!owner || owner.id === meId) && <p className="text-xs text-[var(--text-2)]">Warning and suspension require an available account other than your own.</p>}
        {suspendId === report.id && <div className="space-y-3 rounded-xl border border-[var(--danger)] p-3" role="group" aria-label="Confirm suspension"><h4 className="font-semibold">Suspend {owner?.name ?? 'this account'}?</h4><p className="text-sm text-[var(--text-2)]">This restricts the target account in this local demo and resolves the report. There is no undo control here.</p><div className="flex flex-wrap gap-2"><button className="btn btn-danger !px-3 !text-xs" disabled={busy !== null} onClick={() => act(report.id, 'suspend')}>{busy === report.id ? 'Applying…' : 'Confirm suspension'}</button><button className="btn btn-secondary !px-3 !text-xs" disabled={busy !== null} onClick={() => setSuspendId(null)}>Cancel</button></div></div>}
      </article>; })}
    </section>
  </main>;
}
