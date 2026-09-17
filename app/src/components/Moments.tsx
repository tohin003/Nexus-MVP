import { useEffect, useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { stories, useNexus } from '../repo/store';
import { MultiImageUpload } from './MultiImageUpload';
import { SnapPager } from './MediaCarousel';
import { HorizontalRail } from './HorizontalRail';
import { MAX_STORY_BATCH } from '../services/image';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import type { User } from '../domain/types';
import { groupStories, type StoryGroup } from '../services/storyGroups';

function MomentGroupRing({ group, owner, isMine, onOpen }: { group: StoryGroup; owner: User; isMine: boolean; onOpen: () => void }) {
  return <button type="button" className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-xl py-1 text-xs" onClick={onOpen} aria-label={`View ${isMine ? 'your' : owner.name + '’s'} Moment, ${group.hasUnseen ? 'unseen' : 'seen'}`}>
    <span className="block h-[68px] w-[68px] rounded-full border-[3px] p-[3px]" style={{ borderColor: group.hasUnseen ? 'var(--accent)' : 'var(--line)' }}><span className="flex h-full w-full overflow-hidden rounded-full"><Avatar user={owner} size={56} /></span></span>
    <span className="w-full truncate font-semibold">{isMine ? 'You' : owner.name.split(' ')[0]}</span>
    <span className="text-[10px] text-[var(--text-3)]">{group.hasUnseen ? 'New' : 'Seen'}</span>
  </button>;
}

/** Local-only, manually advanced photo updates; no autoplay or remote publishing. */
export function Moments() {
  const state = useNexus();
  const [clock, setClock] = useState(Date.now);
  const [composer, setComposer] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const captionId = useId();
  const visible = stories.list(state, clock);
  const groups = groupStories(visible);
  const active = visible.find((story) => story.id === activeId);
  const frames = groups.find((group) => group.userId === active?.userId)?.frames ?? [];
  const index = frames.findIndex((story) => story.id === activeId);
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
    <HorizontalRail label="Recent Moments">
      <button type="button" className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-xl py-1 text-xs font-semibold" disabled={!state.signedIn || me?.suspended} onClick={() => { setComposer(true); setError(''); setStatus(''); }} aria-label="Add a Moment">
        <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"><Plus size={25} /></span><span>Your moment</span>
      </button>
      {groups.map((group) => {
        const owner = state.users.find((user) => user.id === group.userId)!;
        return <MomentGroupRing key={group.userId} group={group} owner={owner} isMine={owner.id === state.meId} onOpen={() => open(group.frames[0].id)} />;
      })}
    </HorizontalRail>
    {!visible.length && <p className="text-sm text-[var(--text-2)]">A fresh day, a fresh start. Add your first Moment.</p>}
    {error && !composer && !activeId && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    {status && <p role="status" className="text-sm text-[var(--text-2)]">{status}</p>}
    <Modal open={composer} onClose={() => { if (!busy) { setComposer(false); setError(''); } }} title="Add a Moment">
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        try {
          const batch = stories.createBatch(photos, caption);
          setPhotos([]); setCaption(''); setComposer(false); setError(''); refreshClock(); setStatus(`${batch.length} Moment${batch.length === 1 ? '' : 's'} saved in order in this browser for 24 hours.`);
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save your Moment. Your draft is still here.'); }
      }}>
        <p className="text-sm text-[var(--text-2)]">Choose up to 20 photos per NEXUS batch. Each becomes a separate Moment, in your chosen order, with the caption below. This is our demo batch limit, not an Instagram Stories limit.</p>
        <MultiImageUpload label="Moment photos" value={photos} onChange={setPhotos} onBusyChange={setBusy} limit={MAX_STORY_BATCH} />
        <label htmlFor={captionId} className="block text-sm font-semibold">Caption <span className="font-normal text-[var(--text-3)]">(optional)</span></label>
        <textarea id={captionId} className="input w-full" rows={3} maxLength={280} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="A small thing worth sharing…" />
        <p className="text-xs text-[var(--text-3)]">{caption.length}/280 · Visible for 24 hours. Turning off profile discovery hides your Moments from others.</p>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !photos.length}>{photos.length > 1 ? `Share ${photos.length} Moments` : 'Share Moment'}</button>
      </form>
    </Modal>
    <Modal open={activeId !== null} onClose={closeViewer} title={author ? `${author.id === state.meId ? 'Your' : author.name + '’s'} Moment` : 'Moment unavailable'}>
      {active ? <div className="space-y-4">
        <SnapPager key={active.userId} label="Moment" activeIndex={index} onIndexChange={next => { if (frames[next]) open(frames[next].id); }}>
          {frames.map(story => <img key={story.id} src={story.photo} alt={story.caption || 'Shared Moment photo'} className="h-[40dvh] w-full rounded-2xl bg-[var(--surface-2)] object-contain" />)}
        </SnapPager>
        {active.caption && <p className="whitespace-pre-wrap break-words text-sm">{active.caption}</p>}
        <p className="text-xs text-[var(--text-3)]">{Math.max(1, Math.ceil((active.expiresAt - clock) / 3_600_000))}h remaining · Local demo · {active.photo.startsWith('/avatars/') ? 'Illustrative portrait, not a real update.' : 'Only saved in this browser.'}</p>
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
