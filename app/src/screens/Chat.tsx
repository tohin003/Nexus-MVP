import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Ban, Check, CheckCheck, Flag, MoreHorizontal, Send, Sparkles, VolumeX } from 'lucide-react';
import { useActions, useMessages, useNexus } from '../repo/store';
import { navigate, useRoute } from '../routerStore';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ReportDialog } from '../components/ReportDialog';
import { Sheet } from '../components/Sheet';
import { Modal } from '../components/Modal';

const starters = [
  { label: 'Discuss a project', text: 'I’d love to discuss a small project we could try together. What are you working on right now?' },
  { label: 'Share your work', text: 'I’d love to share what I’m working on and hear your thoughts. Would you like to trade a little feedback?' },
  { label: 'Ask about collaboration', text: 'Would you be open to collaborating? Let’s find one small first step that works for both of us.' },
];
const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export function Chat({ id, conversationId }: { id?: string; conversationId?: string } = {}) {
  const actions = useActions();
  const { route } = useRoute();
  const selectedId = conversationId ?? id ?? route.param;
  const state = useNexus();
  const messages = useMessages(selectedId);
  const conversation = state.conversations.find(item => item.id === selectedId && item.memberIds.includes(state.meId));
  const other = state.users.find(user => user.id === conversation?.memberIds.find(member => member !== state.meId));
  const me = state.users.find(user => user.id === state.meId);
  const blocked = state.blockedUsers.some(item => item.userId === other?.id);
  const muted = !!conversation?.muted || state.mutedUsers.some(item => item.userId === other?.id);
  const restricted = !state.signedIn || !me || !!me.suspended || !other || !!other.suspended || blocked;
  const canMessage = !!conversation && !restricted && (!!conversation.connectionId || other?.privacy.whoCanMessage === 'anyone');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [typingId, setTypingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const activeId = useRef(selectedId);
  const unread = messages.filter(message => message.senderId !== state.meId && message.readAt === null).length;
  const unreadNotice = state.notifications.some(item => item.meta?.conversationId === selectedId && !item.read);

  useEffect(() => {
    activeId.current = selectedId;
    setDraft(''); setError(''); setTypingId(null); setMenuOpen(false); setReportOpen(false); setBlockOpen(false);
    return () => { activeId.current = undefined; };
  }, [selectedId]);
  useEffect(() => {
    if (!canMessage || !selectedId || (!unread && !unreadNotice)) return;
    try { actions.messages.markRead(selectedId); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not mark this conversation as read.'); }
  }, [selectedId, canMessage, unread, unreadNotice]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end', behavior: 'auto' }); }, [selectedId, messages.length, typingId]);

  const run = (action: () => void) => {
    setError('');
    try { action(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.'); }
  };
  const send = async () => {
    if (!canMessage || !selectedId || !draft.trim()) return;
    const sentTo = selectedId;
    setError('');
    try {
      actions.messages.send(sentTo, draft);
      setDraft('');
      setTypingId(sentTo);
      await actions.messages.typingSim(sentTo);
    } catch (caught) {
      if (activeId.current === sentTo) setError(caught instanceof Error ? caught.message : 'Your message could not be sent. Please try again.');
    } finally {
      if (activeId.current === sentTo) setTypingId(null);
    }
  };

  if (!conversation || !other) return <main className="p-5"><button onClick={() => navigate('inbox')} className="btn btn-ghost"><ArrowLeft size={20} />Inbox</button><EmptyState title="Conversation unavailable" description="This conversation may no longer exist or may not belong to your profile." actionLabel="Back to Inbox" onAction={() => navigate('inbox')} /></main>;

  return <main className="flex min-h-full flex-col">
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-3 py-3">
      <button className="btn btn-ghost min-w-11 !px-2" aria-label="Back to Inbox" onClick={() => navigate('inbox')}><ArrowLeft size={21} /></button>
      <button disabled={restricted} onClick={() => navigate('user', other.id)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left disabled:cursor-not-allowed"><Avatar user={other} size={42} /><span className="min-w-0"><span className="block truncate font-bold">{other.name}</span><span className="block truncate text-xs text-[var(--text-2)]">{blocked ? 'Blocked' : other.suspended ? 'Account unavailable' : muted ? 'Notifications muted' : 'Connected with a reason'}</span></span></button>
      <button disabled={restricted} className="btn btn-ghost min-w-11 !px-2" aria-label="Conversation options" onClick={() => setMenuOpen(true)}><MoreHorizontal size={22} /></button>
    </header>
    <div className="flex-1 space-y-5 px-5 py-5">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--accent-soft)] p-4">
        <h1 className="flex items-center gap-2 text-sm font-bold text-[var(--accent-text)]"><Sparkles size={17} />You connected because…</h1>
        {conversation.sharedContext.length ? <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--text-2)]">{conversation.sharedContext.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--text-2)]">You both chose to connect. Start by sharing what you’d like to create, learn, or explore together.</p>}
      </section>
      <p className="text-center text-[11px] leading-relaxed text-[var(--text-2)]">Local demo · Seeded personas use simulated replies and read receipts. No real person is receiving these messages.</p>
      {restricted && <div role="status" className="rounded-2xl bg-[var(--danger-soft)] p-4 text-sm leading-relaxed text-[var(--danger)]">{blocked ? 'You blocked this person. Messages and conversation actions are disabled. You can manage blocked accounts in Settings.' : me?.suspended ? 'Your account is suspended. Messages and conversation actions are disabled.' : other.suspended ? 'This account is suspended. Messages and conversation actions are disabled.' : 'Sign in to interact with this conversation.'}</div>}
      {!restricted && !canMessage && <p role="status" className="rounded-2xl bg-[var(--surface-2)] p-4 text-sm text-[var(--text-2)]">This person accepts messages from connections only. Connect before sending a message.</p>}
      {error && <p role="alert" className="rounded-2xl bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">{error}</p>}
      {messages.length === 0 && <EmptyState title="A good reason. A fresh start." description="Say hello, share an idea, or pick a conversation starter below." />}
      <div role="log" aria-label="Messages" aria-live="polite" aria-relevant="additions" className="space-y-4">
        {messages.map((message, index) => {
          const mine = message.senderId === state.meId;
          const system = message.kind !== 'text' || message.senderId === 'nexus';
          const day = new Date(message.createdAt).toDateString();
          const showDate = index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== day;
          return <div key={message.id}>
            {showDate && <p className="my-5 text-center text-[11px] font-medium text-[var(--text-2)]">{new Date(message.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
            <article className={`flex ${system ? 'justify-center' : mine ? 'justify-end' : 'justify-start'}`} aria-label={system ? 'NEXUS introduction' : mine ? 'Your message' : `${other.name}'s message`}>
              <div className={`${system ? 'w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]' : mine ? 'max-w-[88%] rounded-2xl rounded-br-md bg-[var(--accent-strong)] text-white' : 'max-w-[88%] rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--surface)]'} px-4 py-3`}>
                {system && <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--accent-text)]">NEXUS · {message.kind === 'intro' ? 'Your introduction' : 'Conversation note'}</p>}
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{message.text}</p>
                <div className={`mt-2 flex items-center justify-end gap-1.5 text-[10px] ${mine ? 'text-white/90' : 'text-[var(--text-2)]'}`}><time dateTime={new Date(message.createdAt).toISOString()}>{time(message.createdAt)}</time>{mine && <span className="inline-flex items-center gap-1" aria-label={message.readAt ? 'Read' : message.deliveredAt ? 'Delivered' : 'Sent'}>{message.readAt || message.deliveredAt ? <CheckCheck size={14} /> : <Check size={14} />}{message.readAt ? 'Read' : message.deliveredAt ? 'Delivered' : 'Sent'}</span>}</div>
              </div>
            </article>
          </div>;
        })}
      </div>
      {typingId === selectedId && canMessage && <p role="status" className="flex items-center gap-2 text-xs text-[var(--text-2)]"><span className="rounded-full bg-[var(--surface-2)] px-3 py-2 tracking-[0.2em]">•••</span>{other.name.split(' ')[0]} is typing · demo</p>}
      <div ref={bottom} />
    </div>
    <footer className="sticky bottom-0 space-y-3 border-t border-[var(--line)] bg-[var(--surface)] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div aria-label="Conversation starters" className="flex flex-wrap gap-2">{starters.map(starter => <button key={starter.label} disabled={!canMessage} className="chip min-h-11 !text-xs disabled:cursor-not-allowed disabled:opacity-45" onClick={() => { setDraft(starter.text); input.current?.focus(); }}>{starter.label}</button>)}</div>
      <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); void send(); }}>
        <label className="sr-only" htmlFor="chat-message">Message {other.name}</label>
        <textarea ref={input} id="chat-message" rows={2} maxLength={5000} disabled={!canMessage} value={draft} onChange={event => setDraft(event.target.value)} placeholder={canMessage ? 'Start something good…' : 'Messaging unavailable'} className="input min-h-11 resize-none disabled:opacity-50" onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
        <button type="submit" disabled={!canMessage || !draft.trim()} aria-label="Send message" className="btn btn-primary min-h-12 min-w-12 !px-3"><Send size={19} /></button>
      </form>
    </footer>
    <Sheet open={menuOpen && !restricted} onClose={() => setMenuOpen(false)} title="Conversation options">
      <div className="space-y-3"><button className="btn btn-secondary w-full justify-start" onClick={() => run(() => { if (muted) actions.mutes.remove(other.id); else actions.mutes.add(other.id); setMenuOpen(false); })}><VolumeX size={18} />{muted ? 'Unmute notifications' : 'Mute notifications'}</button><button className="btn btn-secondary w-full justify-start" onClick={() => { setMenuOpen(false); setReportOpen(true); }}><Flag size={18} />Report {other.name.split(' ')[0]}</button><button className="btn btn-danger w-full justify-start" onClick={() => { setMenuOpen(false); setBlockOpen(true); }}><Ban size={18} />Block {other.name.split(' ')[0]}</button><p className="text-xs leading-relaxed text-[var(--text-2)]">Muting silences notifications. Blocking prevents further interactions. Reports are reviewed in this demo’s local moderation queue.</p></div>
    </Sheet>
    <Modal open={blockOpen && !restricted} onClose={() => setBlockOpen(false)} title={`Block ${other.name.split(' ')[0]}?`}><p className="mb-5 text-sm leading-relaxed text-[var(--text-2)]">You won’t be able to message or interact with this person. Pending requests will be declined. Your existing conversation stays in your history. You can unblock them in Settings.</p><div className="flex gap-2"><button className="btn btn-secondary flex-1" onClick={() => setBlockOpen(false)}>Cancel</button><button className="btn btn-danger flex-1" onClick={() => run(() => { actions.blocks.add(other.id); setBlockOpen(false); })}>Block person</button></div></Modal>
    <ReportDialog open={reportOpen && !restricted} onClose={() => setReportOpen(false)} targetKind="user" targetId={other.id} targetLabel={other.name} />
  </main>;
}

export default Chat;
