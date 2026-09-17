import { useEffect, useId, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { stories, useNexus } from '../repo/store';
import { ImageUpload } from './ImageUpload';
import { Modal } from './Modal';

/** Local-only, manually advanced photo updates; no autoplay or remote publishing. */
export function Moments() {
  const state = useNexus();
  const [clock, setClock] = useState(Date.now);
  const [composer, setComposer] = useState(false);
  const [photo, setPhoto] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const captionId = useId();
  const visible = stories.list(state, clock);
  const index = visible.findIndex((story) => story.id === activeId);
  const active = visible[index];
  const author = state.users.find((user) => user.id === active?.userId);
  const me = state.users.find((user) => user.id === state.meId);

  useEffect(() => {
    const refresh = () => setClock(Date.now());
    const future = state.stories.map((story) => story.expiresAt).filter((at) => at > Date.now());
    const delay = Math.max(1, Math.min(60_000, ...future.map((at) => at - Date.now() + 1)));
    const timer = window.setTimeout(refresh, delay);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [state.stories, clock]);

  function open(id: string) {
    try { stories.markSeen(id); setActiveId(id); setError(''); setConfirmDelete(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open this Moment.'); }
  }
  function closeViewer() { setActiveId(null); setError(''); setConfirmDelete(false); }
  /** Event-handler-only clock refresh; React Compiler purity rules forbid render calls. */
  function refreshClock() { setClock(Date.now()); }

  return <section aria-label="Moments" className="min-w-0 space-y-3">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Moments</h2><span className="eyebrow">A glimpse of today</span></div>
    <p className="text-xs text-[var(--text-2)]">Local demo · photos stay in this browser and disappear from view after 24 hours.</p>
    <div className="flex gap-3 overflow-x-auto pb-2" aria-label="Recent Moments">
      <button type="button" className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-xl py-1 text-xs font-semibold" disabled={!state.signedIn || me?.suspended} onClick={() => { setComposer(true); setError(''); setStatus(''); }} aria-label="Add a Moment">
        <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"><Plus size={25} /></span><span>Your moment</span>
      </button>
      {visible.map((story) => {
        const owner = state.users.find((user) => user.id === story.userId)!;
        return <button type="button" key={story.id} className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-xl py-1 text-xs" onClick={() => open(story.id)} aria-label={`View ${owner.id === state.meId ? 'your' : owner.name + '’s'} Moment, ${story.seenByMe ? 'seen' : 'unseen'}`}>
          <span className="block h-[68px] w-[68px] rounded-full border-[3px] p-[3px]" style={{ borderColor: story.seenByMe ? 'var(--line)' : 'var(--accent)' }}><img src={story.photo} alt="" className="h-full w-full rounded-full object-cover" /></span>
          <span className="w-full truncate font-semibold">{owner.id === state.meId ? 'You' : owner.name.split(' ')[0]}</span>
          <span className="text-[10px] text-[var(--text-3)]">{story.seenByMe ? 'Seen' : 'New'}</span>
        </button>;
      })}
    </div>
    {!visible.length && <p className="text-sm text-[var(--text-2)]">A fresh day, a fresh start. Add your first Moment.</p>}
    {error && !composer && !activeId && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    {status && <p role="status" className="text-sm text-[var(--text-2)]">{status}</p>}
    <Modal open={composer} onClose={() => { if (!busy) { setComposer(false); setError(''); } }} title="Add a Moment">
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        try {
          stories.create(photo, caption);
          setPhoto(''); setCaption(''); setComposer(false); setError(''); refreshClock(); setStatus('Moment saved in this browser for 24 hours.');
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save your Moment. Your draft is still here.'); }
      }}>
        <p className="text-sm text-[var(--text-2)]">Share a photo and an optional caption. This is a browser-local demo, not a live social network.</p>
        <ImageUpload label="Moment photo" value={photo} onChange={setPhoto} onBusyChange={setBusy} variant="photo" />
        <label htmlFor={captionId} className="block text-sm font-semibold">Caption <span className="font-normal text-[var(--text-3)]">(optional)</span></label>
        <textarea id={captionId} className="input w-full" rows={3} maxLength={280} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="A small thing worth sharing…" />
        <p className="text-xs text-[var(--text-3)]">{caption.length}/280 · Visible for 24 hours. Turning off profile discovery hides your Moments from others.</p>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !photo}>Share Moment</button>
      </form>
    </Modal>
    <Modal open={activeId !== null} onClose={closeViewer} title={author ? `${author.id === state.meId ? 'Your' : author.name + '’s'} Moment` : 'Moment unavailable'}>
      {active ? <div className="space-y-4">
        <img src={active.photo} alt={active.caption || `Photo shared by ${author?.name ?? 'a community member'}`} className="max-h-[45dvh] w-full rounded-2xl bg-[var(--surface-2)] object-contain" />
        {active.caption && <p className="whitespace-pre-wrap break-words text-sm">{active.caption}</p>}
        <p className="text-xs text-[var(--text-3)]">{Math.max(1, Math.ceil((active.expiresAt - clock) / 3_600_000))}h remaining · Local demo · {active.photo.startsWith('/avatars/') ? 'Illustrative portrait, not a real update.' : 'Only saved in this browser.'}</p>
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn btn-ghost px-3" disabled={index <= 0} onClick={() => open(visible[index - 1].id)} aria-label="Previous Moment"><ChevronLeft size={18} />Previous</button>
          <span className="text-xs text-[var(--text-3)]">{index + 1}/{visible.length}</span>
          <button type="button" className="btn btn-ghost px-3" disabled={index >= visible.length - 1} onClick={() => open(visible[index + 1].id)} aria-label="Next Moment">Next<ChevronRight size={18} /></button>
        </div>
        {active.userId === state.meId && <div className="space-y-2">
          {confirmDelete && <p className="text-sm">Delete this Moment from this browser? This cannot be undone.</p>}
          <button type="button" className="btn btn-ghost text-[var(--danger)]" onClick={() => {
            if (!confirmDelete) { setConfirmDelete(true); return; }
            try { stories.delete(active.id); closeViewer(); setStatus('Moment deleted.'); }
            catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to delete this Moment.'); }
          }}><Trash2 size={16} />{confirmDelete ? 'Confirm delete' : 'Delete Moment'}</button>
          {confirmDelete && <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Keep Moment</button>}
        </div>}
      </div> : <p className="text-sm text-[var(--text-2)]">This Moment has expired or is no longer available.</p>}
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    </Modal>
  </section>;
}
export default Moments;
