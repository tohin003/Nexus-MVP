import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Node test environment: stub window/localStorage BEFORE the store module loads.
// db.ts treats their absence as SSR; the stub exercises the persistence path.
const memoryStore = vi.hoisted(() => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, String(value)); },
    removeItem: (key: string) => { map.delete(key); },
    clear: () => { map.clear(); },
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() { return map.size; },
  };
});
vi.stubGlobal('localStorage', memoryStore);
vi.stubGlobal('window', { localStorage: memoryStore });

import { db, exportState, importState, resetDemo, STORAGE_KEY, STATE_VERSION } from '../repo/db';
import {
  auth, blocks, circles, completeOnboarding, connections, messages, moderation, mutes,
  notifications, posts, privacy, profile, repo, reports,
} from './repo';

const pair = (a: string, b: string, x: string, y: string) => (a === x && b === y) || (a === y && b === x);
const me = () => db.getState().users.find((item) => item.id === db.getState().meId)!;
const user = (id: string) => db.getState().users.find((item) => item.id === id)!;
const signIn = () => auth.demoSignIn();
function asAdmin() {
  db.setState((state) => ({ users: state.users.map((item) => item.id === state.meId ? { ...item, isAdmin: true } : item) }));
}
const firstConversation = () => db.getState().conversations[0].id;

// ── persistence ──────────────────────────────────────────────────────────────
describe('persistence', () => {
  beforeEach(async () => { memoryStore.clear(); await resetDemo(); });
  afterEach(() => { vi.useRealTimers(); });

  it('hydrates seeded state into the vanilla store', () => {
    expect(db.getState().version).toBe(STATE_VERSION);
    expect(db.getState().meId).toBe('me');
    expect(db.getState().users.length).toBeGreaterThan(5);
  });

  it('persists every mutation to localStorage', async () => {
    signIn();
    profile.update({ bio: 'Persisted bio.' });
    const persisted = JSON.parse(memoryStore.getItem(STORAGE_KEY)!) as { signedIn: boolean; users: { id: string; bio: string }[] };
    expect(persisted.signedIn).toBe(true);
    expect(persisted.users.find((item) => item.id === 'me')?.bio).toBe('Persisted bio.');
  });

  it('resetDemo clears storage and reseeds', async () => {
    signIn();
    profile.update({ bio: 'Changed.' });
    await resetDemo();
    expect(memoryStore.getItem(STORAGE_KEY)).toBeNull();
    expect(me().bio).not.toBe('Changed.');
  });

  it('exportState → importState round-trips and rejects tampering', () => {
    signIn();
    connections.request('aarav', 'Round-trip test reason');
    const snapshot = exportState();
    const parsed = JSON.parse(snapshot) as { version: number; requests: { why: string }[] };
    expect(parsed.requests.length).toBeGreaterThan(0);
    expect(parsed.requests.every((item) => typeof item.why === 'string')).toBe(true);
    expect(() => importState(JSON.stringify({ ...parsed, version: 99 }))).toThrow(/supported NEXUS version/i);
    expect(() => importState(JSON.stringify({ ...parsed, users: [] }))).toThrow();
    // A rejected import must leave live state untouched.
    expect(db.getState().requests).toHaveLength(parsed.requests.length);
    importState(snapshot);
    const imported = JSON.parse(exportState()) as { requests: { why: string }[] };
    expect(imported.requests.map((item) => item.why)).toEqual(parsed.requests.map((item) => item.why));
  });

  it('importState rejects duplicate ids', () => {
    const snapshot = JSON.parse(exportState()) as { users: { id: string }[] };
    expect(() => importState(JSON.stringify({ ...snapshot, users: [snapshot.users[0], snapshot.users[0]] }))).toThrow(/duplicate/i);
  });
});

// ── auth & onboarding ────────────────────────────────────────────────────────
describe('auth and onboarding', () => {
  beforeEach(async () => { memoryStore.clear(); await resetDemo(); });

  it('demoSignIn signs in; onboarding persists profile fields', () => {
    expect(db.getState().signedIn).toBe(false);
    auth.demoSignIn();
    expect(db.getState().signedIn).toBe(true);
    completeOnboarding({ name: 'Prince K', roles: ['creator'], city: 'Jaipur' });
    expect(me().name).toBe('Prince K');
    expect(db.getState().onboardingComplete).toBe(true);
  });

  it('a suspended user can sign in (suspension screen) but cannot mutate', () => {
    asAdmin();
    auth.demoSignIn();
    db.setState((state) => ({ users: state.users.map((item) => item.id === state.meId ? { ...item, suspended: true } : item) }));
    expect(() => auth.demoSignIn()).not.toThrow();
    expect(() => profile.update({ bio: 'Nope' })).toThrow(/suspended/i);
    expect(me().bio).not.toBe('Nope');
  });

  it('mutations require sign-in', () => {
    expect(() => posts.create('share', 'Hello', 'Body')).toThrow(/sign in/i);
    expect(() => connections.request('aarav', 'Reason')).toThrow(/sign in/i);
    signIn();
    expect(() => posts.create('share', 'Hello', 'Body')).not.toThrow();
  });

  it('profile.update validates usernames and role limit', () => {
    signIn();
    expect(() => profile.update({ roles: ['creator', 'student', 'founder', 'developer'] })).toThrow(/three/i);
    expect(() => profile.update({ username: 'not valid!' })).toThrow(/username/i);
    profile.update({ username: 'prince' });
    expect(me().username).toBe('prince');
  });
});

// ── intents ──────────────────────────────────────────────────────────────────
describe('intents', () => {
  beforeEach(async () => { memoryStore.clear(); await resetDemo(); signIn(); });

  it('create interprets text, keeps original verbatim, tracks analytics', () => {
    const intent = connections && posts && intentsCreate();
    expect(intent.originalText).toContain('filmmaking YouTube channel');
    expect(intent.interpretation.intentType).toBeTruthy();
    expect(intent.title.length).toBeGreaterThan(0);
    expect(db.getState().analyticsEvents.some((event) => event.name === 'intent_created')).toBe(true);
    function intentsCreate() {
      const { intents } = repo;
      return intents.create('I want to start a filmmaking YouTube channel and need a video editor');
    }
  });

  it('create applies overrides on top of the interpretation', () => {
    const intent = repo.intents.create('Help me find a collaborator', {
      interpretation: { location: 'Delhi', remoteAllowed: true },
      title: 'Custom title', visibility: 'circles',
    });
    expect(intent.interpretation.location).toBe('Delhi');
    expect(intent.title).toBe('Custom title');
    expect(intent.visibility).toBe('circles');
  });

  it('interpretPreview does not mutate state', () => {
    const before = db.getState().intents.length;
    repo.intents.interpretPreview('learn chemistry with a study partner in Pune');
    expect(db.getState().intents).toHaveLength(before);
  });

  it('expressInterest on someone else’s active intent is idempotent', () => {
    const otherIntent = db.getState().intents.find((item) => item.userId !== 'me' && item.status === 'active');
    expect(otherIntent).toBeTruthy();
    const baseline = otherIntent!.interestedCount;
    const once = repo.intents.expressInterest(otherIntent!.id);
    expect(once.interestedByMe).toBe(true);
    expect(once.interestedCount).toBe(baseline + 1); // existing demo interest counts preserved
    expect(repo.intents.expressInterest(otherIntent!.id).interestedCount).toBe(baseline + 1);
  });

  it('rejects empty intent text', () => {
    expect(() => repo.intents.create('   ')).toThrow(/Intent is required/i);
  });
});

// ── connections ──────────────────────────────────────────────────────────────
describe('connections', () => {
  beforeEach(async () => { memoryStore.clear(); await resetDemo(); signIn(); });

  it('request dedupes concurrent pending invites', () => {
    const first = connections.request('aarav', 'Your editing skills fit my channel');
    expect(first.status).toBe('pending');
    const again = connections.request('aarav', 'Different wording');
    expect(again.id).toBe(first.id);
    expect(db.getState().requests.filter((item) => item.toUserId === 'aarav' && item.status === 'pending')).toHaveLength(1);
  });

  it('accept builds shared context, conversation, connection and exactly one intro', () => {
    const incoming = db.getState().requests.find((item) => item.fromUserId === 'isha')!;
    const conversation = connections.accept(incoming.id);
    expect(conversation.memberIds).toEqual(['me', 'isha']);
    expect(conversation.sharedContext.length).toBeGreaterThan(0);
    expect(conversation.connectionId).toBeTruthy();
    const intro = db.getState().messages.find((message) => message.id === conversation.introMessageId)!;
    expect(intro.kind).toBe('intro');
    expect(intro.senderId).toBe('nexus');
    expect(db.getState().requests.find((item) => item.id === incoming.id)?.status).toBe('connected');
    expect(db.getState().connections.some((item) => pair(item.aUserId, item.bUserId, 'me', 'isha'))).toBe(true);
    const again = connections.accept(incoming.id);
    expect(again.id).toBe(conversation.id);
    expect(db.getState().messages.filter((message) => message.conversationId === conversation.id && message.kind === 'intro')).toHaveLength(1);
  });

  it('decline never creates a connection', () => {
    const incoming = db.getState().requests.find((item) => item.fromUserId === 'simran')!;
    connections.decline(incoming.id);
    expect(db.getState().requests.find((item) => item.id === incoming.id)?.status).toBe('declined');
    expect(db.getState().connections.some((item) => pair(item.aUserId, item.bUserId, 'me', 'simran'))).toBe(false);
  });

  it('demoAcceptOutgoing simulates the recipient without changing meId', () => {
    const outgoing = db.getState().requests.find((item) => item.fromUserId === 'me' && item.toUserId === 'zoya')!;
    const conversation = connections.demoAcceptOutgoing(outgoing.id);
    expect(db.getState().meId).toBe('me');
    expect(conversation.memberIds).toEqual(['me', 'zoya']);
    expect(conversation.introMessageId).toBeTruthy();
    expect(db.getState().requests.find((item) => item.id === outgoing.id)?.status).toBe('connected');
  });

  it('demoAcceptOutgoing is idempotent — one intro only', () => {
    const outgoing = db.getState().requests.find((item) => item.fromUserId === 'me' && item.toUserId === 'zoya')!;
    const first = connections.demoAcceptOutgoing(outgoing.id);
    const second = connections.demoAcceptOutgoing(outgoing.id);
    expect(second.id).toBe(first.id);
    expect(db.getState().messages.filter((message) => message.conversationId === first.id && message.kind === 'intro')).toHaveLength(1);
  });

  it('rejects blocked and self targets', () => {
    blocks.add('rohan');
    expect(() => connections.request('rohan', 'Should fail')).toThrow(/unblock/i);
    expect(() => connections.request('me', 'Self request')).toThrow(/another person/i);
  });

  it('pass() records passed user ids', () => {
    connections.pass('rohan');
    expect(db.getState().passedUserIds).toContain('rohan');
  });
});

// ── messages ─────────────────────────────────────────────────────────────────
describe('messages', () => {
  beforeEach(async () => { memoryStore.clear(); await resetDemo(); signIn(); });
  afterEach(() => vi.useRealTimers());

  it('send records delivered then read timing for demo recipients', async () => {
    vi.useFakeTimers();
    const conversationId = firstConversation();
    const sent = messages.send(conversationId, 'Testing delivery timing.');
    expect(sent.deliveredAt).toBeNull();
    vi.advanceTimersByTime(500);
    expect(db.getState().messages.find((item) => item.id === sent.id)?.deliveredAt).not.toBeNull();
    vi.advanceTimersByTime(1500);
    expect(db.getState().messages.find((item) => item.id === sent.id)?.readAt).not.toBeNull();
  });

  it('markRead stamps readAt and readies conversation notifications', () => {
    const conversationId = firstConversation();
    messages.markRead(conversationId);
    const unread = db.getState().messages.filter((item) => item.conversationId === conversationId && item.senderId !== 'me' && item.readAt === null);
    expect(unread).toHaveLength(0);
    expect(db.getState().notifications.filter((item) => item.meta?.conversationId === conversationId && !item.read)).toHaveLength(0);
  });

  it('typingSim rotates two canned contextual replies', async () => {
    vi.useFakeTimers();
    const conversationId = firstConversation();
    const pending = messages.typingSim(conversationId);
    vi.advanceTimersByTime(2300);
    const first = await pending;
    expect(first?.senderId).not.toBe('me');
    const secondPending = messages.typingSim(conversationId);
    vi.advanceTimersByTime(2300);
    const second = await secondPending;
    expect(second?.text).not.toBe(first?.text);
    const thirdPending = messages.typingSim(conversationId);
    vi.advanceTimersByTime(2300);
    const third = await thirdPending;
    expect(third?.text).toBe(first?.text);
  });

  it('typingSim dedupes concurrent calls into one pending reply', async () => {
    vi.useFakeTimers();
    const conversationId = firstConversation();
    const first = messages.typingSim(conversationId);
    const second = messages.typingSim(conversationId);
    vi.advanceTimersByTime(2500);
    const [a, b] = await Promise.all([first, second]);
    expect(a?.id).toBe(b?.id);
  });

  it('rejects empty text and blocked recipients', () => {
    const conversationId = firstConversation();
    expect(() => messages.send(conversationId, '   ')).toThrow(/Message is required/i);
    blocks.add('kabir');
    expect(() => messages.send('conversation-kabir', 'Hello?')).toThrow(/unblock/i);
  });
});

// ── blocks, mutes, reports ───────────────────────────────────────────────────
describe('blocks mutes and reports', () => {
  beforeEach(async () => { memoryStore.clear(); await resetDemo(); signIn(); });

  it('blocks.add prevents interaction until removed', () => {
    blocks.add('isha');
    expect(db.getState().blockedUsers.some((item) => item.userId === 'isha')).toBe(true);
    expect(() => connections.request('isha', 'Blocked attempt')).toThrow(/unblock/i);
    blocks.remove('isha');
    expect(() => connections.request('isha', 'Works again')).not.toThrow();
  });

  it('mutes.add silences and mutes.remove restores conversations', () => {
    mutes.add('kabir');
    expect(db.getState().conversations.find((item) => item.id === 'conversation-kabir')?.muted).toBe(true);
    mutes.remove('kabir');
    expect(db.getState().conversations.find((item) => item.id === 'conversation-kabir')?.muted).toBe(false);
  });

  it('reports.file records reporter and opens the report', () => {
    const report = reports.file('post', db.getState().posts[0].id, 'Spam', 'Repeated promotional posts');
    expect(report.status).toBe('open');
    expect(report.reporterId).toBe('me');
    expect(db.getState().reports).toHaveLength(1);
    expect(() => reports.file('post', 'missing-id', 'Spam')).toThrow(/could not be found/i);
  });
});

// ── moderation ───────────────────────────────────────────────────────────────
describe('moderation', () => {
  beforeEach(async () => { memoryStore.clear(); await resetDemo(); signIn(); });

  it('review and resolve are admin-gated', () => {
    const report = reports.file('user', 'rohan', 'Harassment', 'test');
    // The seed account is a demo admin; force a non-admin actor to verify the gate itself.
    db.setState((state) => ({ users: state.users.map((item) => item.id === state.meId ? { ...item, isAdmin: false } : item) }));
    expect(() => moderation.review(report.id)).toThrow(/admin/i);
    asAdmin();
    expect(moderation.review(report.id).status).toBe('reviewing');
    expect(() => moderation.dismiss(report.id)).not.toThrow();
    expect(db.getState().reports.find((item) => item.id === report.id)?.action).toBe('dismissed');
  });

  it('suspend resolves a post report by suspending its author', () => {
    const post = posts.create('ask', 'Test post', 'Body');
    const report = reports.file('post', post.id, 'Spam', 'test');
    asAdmin();
    moderation.suspend(report.id, 'Repeated violations');
    expect(user('me').suspended).toBe(true);
    expect(db.getState().reports.find((item) => item.id === report.id)?.action).toBe('suspended');
    expect(() => posts.create('share', 'Again', 'Body')).toThrow(/suspended/i);
  });

  it('unsuspend restores interaction with a suspended user', () => {
    asAdmin();
    db.setState((state) => ({ users: state.users.map((item) => item.id === 'aarav' ? { ...item, suspended: true } : item) }));
    expect(() => connections.request('aarav', 'Should fail while suspended')).toThrow(/suspended/i);
    moderation.unsuspend('aarav');
    expect(user('aarav').suspended).toBeFalsy();
    expect(() => connections.request('aarav', 'Works after unsuspend')).not.toThrow();
  });
});

// ── circles, posts, notifications, privacy ───────────────────────────────────
describe('circles posts notifications privacy', () => {
  beforeEach(async () => { memoryStore.clear(); await resetDemo(); signIn(); });

  it('circles.join/leave respect privacy, limits and ownership', () => {
    const open = db.getState().circles.find((circle) => circle.privacy === 'open')!;
    circles.join(open.id);
    expect(db.getState().circles.find((item) => item.id === open.id)?.memberIds).toContain('me');
    circles.leave(open.id);
    expect(db.getState().circles.find((item) => item.id === open.id)?.memberIds).not.toContain('me');
    const joined = circles.join(open.id);
    joined.memberIds.push('nope'); // returned object is a copy — store untouched
    expect(db.getState().circles.find((item) => item.id === open.id)?.memberIds).toContain('me');
    const owned = circles.create({ name: 'My test circle', purpose: 'Owned by me for the test' });
    expect(() => circles.leave(owned.id)).toThrow(/owner/i);
  });

  it('circles.create validates purpose and member limit', () => {
    expect(() => circles.create({ name: 'X', purpose: '   ' })).toThrow(/purpose/i);
    expect(() => circles.create({ name: 'X', purpose: 'Why', memberLimit: 1 })).toThrow(/between 2 and 500/i);
    const circle = circles.create({ name: 'Test circle', purpose: 'Testing purposefully', emoji: '🧪' });
    expect(circle.memberIds).toEqual(['me']);
    expect(circle.dayNumber).toBe(1);
  });

  it('posts lifecycle: create → react → comment → icanHelp', () => {
    const post = posts.create('share', 'First post', 'Body text', ['film'], null, { skillsNeeded: ['video-editing'], location: 'Jaipur', time: 'weekends', paid: false });
    expect(post.reactions.useful).toBe(0);
    posts.react(post.id, 'useful');
    expect(db.getState().posts[0].reactions.useful).toBe(1);
    posts.react(post.id, 'useful');
    expect(db.getState().posts[0].reactions.useful).toBe(0);
    posts.comment(post.id, 'Nice one');
    expect(db.getState().posts[0].comments).toHaveLength(1);
    const otherPost = db.getState().posts.find((item) => item.userId !== 'me')!;
    expect(posts.icanHelp(otherPost.id).iCanHelp).toBe(true);
    expect(() => posts.icanHelp(post.id)).toThrow(/someone else/i);
  });

  it('notifications.markAllRead reads everything', () => {
    expect(db.getState().notifications.some((item) => !item.read)).toBe(true);
    notifications.markAllRead();
    expect(db.getState().notifications.every((item) => item.read)).toBe(true);
  });

  it('privacy.update validates values and applies them', () => {
    const next = privacy.update({ whoCanMessage: 'connections-only', discoverable: false });
    expect(next.whoCanMessage).toBe('connections-only');
    expect(next.discoverable).toBe(false);
    expect(() => privacy.update({ whoCanMessage: 'everyone' as never })).toThrow(/Invalid messaging privacy/i);
    expect(() => privacy.update({ showCity: 'yes' as never })).toThrow(/boolean/i);
  });

  it('closed-circle content and posting are member-only', () => {
    const closed = db.getState().circles.find((circle) => circle.privacy === 'closed' && !circle.memberIds.includes('me'))
      ?? db.getState().circles.find((circle) => circle.privacy !== 'open' && !circle.memberIds.includes('me'));
    if (closed) {
      expect(circles.postsInCircle(closed.id)).toEqual([]);
      expect(() => posts.create('share', 'Inside', 'Body', [], closed.id)).toThrow(/Join the circle/i);
    }
  });
});

// ── repo surface ─────────────────────────────────────────────────────────────
describe('repo surface', () => {
  it('exposes every documented namespace and demo helper', () => {
    for (const key of ['auth', 'profile', 'intents', 'connections', 'messages', 'blocks', 'mutes', 'reports', 'circles', 'posts', 'notifications', 'privacy', 'moderation']) {
      expect(repo).toHaveProperty(key);
    }
    expect(repo.connections.demoAcceptOutgoing).toBeTypeOf('function');
    expect(repo.moderation.suspend).toBeTypeOf('function');
  });

  it('persisted state version is validated', () => {
    expect(STATE_VERSION).toBe(1);
    expect(() => importState('not json')).toThrow();
  });
});
