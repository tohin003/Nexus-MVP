import { db, getDatabaseGeneration } from '../repo/db';
import type { AnalyticsEvent, AppState } from '../repo/db';
import type {
  Circle, ConnectionRequest, Conversation, Intent, IntentInterpretation, Message,
  Notification, Post, PostKind, Privacy, Reaction, Report, User,
} from '../domain/types';
import { interpretIntent, matchPeople, introduction } from './intelligence';

const uid = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
const now = () => Date.now();
function me(state = db.getState()): User {
  const user = state.users.find((item) => item.id === state.meId);
  if (!user) throw new Error('Your demo profile could not be found.');
  return user;
}
function requireActor(state = db.getState()): User {
  const actor = me(state);
  if (!state.signedIn) throw new Error('Sign in before making changes.');
  if (actor.suspended) throw new Error('Your account is suspended.');
  return actor;
}
type StateUpdate = AppState | Partial<AppState> | ((state: AppState) => AppState | Partial<AppState>);
function mutate(update: StateUpdate) {
  requireActor();
  db.setState(update);
}
function person(id: string, state = db.getState()): User {
  const user = state.users.find((item) => item.id === id);
  if (!user) throw new Error('This person could not be found.');
  return user;
}
function required(text: string, label: string, limit = 10000): string {
  const value = text.trim();
  if (!value) throw new Error(`${label} is required.`);
  if (value.length > limit) throw new Error(`${label} must be ${limit} characters or fewer.`);
  return value;
}
const blocked = (id: string, state = db.getState()) => state.blockedUsers.some((item) => item.userId === id);
const muted = (id: string, state = db.getState()) => state.mutedUsers.some((item) => item.userId === id);
function allowedOther(id: string, state = db.getState()) {
  requireActor(state);
  if (person(id, state).suspended) throw new Error('This account is suspended.');
  if (id === state.meId) throw new Error('Choose another person.');
  if (blocked(id, state)) throw new Error('Unblock this person before interacting.');
}
function track(state: AppState, name: string, properties?: AnalyticsEvent['properties']) {
  return [...state.analyticsEvents, { id: uid('event'), name, at: now(), properties }].slice(-200);
}
function notice(kind: Notification['kind'], actorUserId: string | null, text: string, meta?: Notification['meta']): Notification {
  return { id: uid('notification'), kind, actorUserId, text, meta, createdAt: now(), read: false };
}
const pair = (a: string, b: string, x: string, y: string) => (a === x && b === y) || (a === y && b === x);

export type ProfileFields = Partial<Pick<User,
  'name' | 'username' | 'headline' | 'avatar' | 'accentHue' | 'city' | 'bio' | 'currently'
  | 'roles' | 'interests' | 'skills' | 'needs' | 'availability' | 'experience'>>;
function profileFields(fields: ProfileFields): ProfileFields {
  const clean: ProfileFields = {};
  const keys: (keyof ProfileFields)[] = ['name', 'username', 'headline', 'avatar', 'accentHue', 'city', 'bio', 'currently', 'roles', 'interests', 'skills', 'needs', 'availability', 'experience'];
  for (const key of keys) {
    const value = fields[key];
    if (value !== undefined) Object.assign(clean, { [key]: Array.isArray(value) ? [...new Set(value)] : value });
  }
  if (clean.name !== undefined) clean.name = required(clean.name, 'Name', 100);
  if (clean.username !== undefined) {
    clean.username = required(clean.username, 'Username', 40).replace(/^@/, '');
    if (!/^[a-zA-Z0-9_.-]+$/.test(clean.username)) throw new Error('Use letters, numbers, dots, dashes, or underscores for your username.');
    if (db.getState().users.some((user) => user.id !== db.getState().meId && user.username.toLowerCase() === clean.username!.toLowerCase())) throw new Error('That username is already in use.');
  }
  if (clean.roles && clean.roles.length > 3) throw new Error('Choose up to three roles.');
  return clean;
}

export const auth = {
  demoSignIn(): User {
    const user = me();
    // Signing in is always allowed — a suspended user must reach the suspension screen.
    db.setState((state) => ({ signedIn: true, analyticsEvents: track(state, 'demo_sign_in') }));
    return user;
  },
  signOut() { db.setState({ signedIn: false }); },
  completeOnboarding(fields: ProfileFields) { return completeOnboarding(fields); },
};
export function completeOnboarding(fields: ProfileFields): User {
  const clean = profileFields(fields);
  mutate((state) => ({
    signedIn: true, onboardingComplete: true,
    users: state.users.map((user) => user.id === state.meId ? { ...user, ...clean } : user),
    analyticsEvents: track(state, 'onboarding_completed'),
  }));
  return me();
}
export const profile = {
  update(fields: ProfileFields): User {
    const clean = profileFields(fields);
    mutate((state) => ({ users: state.users.map((user) => user.id === state.meId ? { ...user, ...clean } : user) }));
    return me();
  },
};

export type IntentOverrides = Partial<IntentInterpretation> & {
  interpretation?: Partial<IntentInterpretation>;
  title?: string;
  details?: string;
  visibility?: Intent['visibility'];
  expiresAt?: number | null;
};
export const intents = {
  interpretPreview(text: string): IntentInterpretation { return interpretIntent(text, me()); },
  create(originalText: string, overrides: IntentOverrides = {}): Intent {
    required(originalText, 'Intent', 3000);
    const { title, details, visibility, expiresAt, interpretation: nested, ...interpretationFields } = overrides;
    const interpretation = { ...interpretIntent(originalText, me()), ...interpretationFields, ...nested };
    const intent: Intent = {
      id: uid('intent'), userId: db.getState().meId, originalText,
      interpretation, title: title?.trim() || interpretation.goal, details,
      status: 'active', createdAt: now(), expiresAt: expiresAt ?? null,
      visibility: visibility ?? 'public', interestedCount: 0, interestedByMe: false,
    };
    mutate((state) => ({ intents: [intent, ...state.intents], analyticsEvents: track(state, 'intent_created', { intentId: intent.id, type: interpretation.intentType }) }));
    return intent;
  },
  expressInterest(id: string): Intent {
    const intent = db.getState().intents.find((item) => item.id === id);
    if (!intent) throw new Error('This intent could not be found.');
    allowedOther(intent.userId);
    if (intent.status !== 'active' && intent.status !== 'matched') throw new Error('This intent is no longer active.');
    if (intent.expiresAt !== null && intent.expiresAt <= now()) throw new Error('This intent has expired.');
    if (intent.interestedByMe) return intent;
    const updated = { ...intent, interestedByMe: true, interestedCount: intent.interestedCount + 1 };
    mutate((state) => ({ intents: state.intents.map((item) => item.id === id ? updated : item), analyticsEvents: track(state, 'intent_interest', { intentId: id }) }));
    return updated;
  },
};

export const connections = {
  request(userId: string, why: string): ConnectionRequest {
    return connections.connect(db.getState().meId, userId, why);
  },
  connect(from: string, to: string, why: string): ConnectionRequest {
    const state = db.getState();
    if (from !== state.meId && to !== state.meId) throw new Error('A connection must include you.');
    const otherId = from === state.meId ? to : from;
    allowedOther(otherId, state);
    person(from, state); person(to, state);
    const reason = required(why, 'A reason to connect', 1000);
    if (state.connections.some((item) => pair(item.aUserId, item.bUserId, from, to))) throw new Error('You are already connected.');
    const pending = state.requests.find((item) => item.status === 'pending' && pair(item.fromUserId, item.toUserId, from, to));
    if (pending) return pending;
    const request: ConnectionRequest = { id: uid('request'), fromUserId: from, toUserId: to, why: reason, status: 'pending', createdAt: now() };
    const notification = notice('connection-request', otherId, to === state.meId ? `${person(from).name} wants to connect: ${reason}` : `Connection request sent to ${person(to).name}`, { userId: otherId });
    mutate((current) => ({ requests: [request, ...current.requests], notifications: [notification, ...current.notifications], analyticsEvents: track(current, 'connection_requested', { userId: otherId }) }));
    return request;
  },
  accept(id: string): Conversation { return connections.acceptRequest(id); },
  acceptRequest(id: string): Conversation {
    const state = db.getState();
    const request = state.requests.find((item) => item.id === id);
    if (!request) throw new Error('This connection request could not be found.');
    if (request.toUserId !== state.meId) throw new Error('Only the recipient can accept this request.');
    allowedOther(request.fromUserId, state);
    requireActor(state);
    const existing = state.conversations.find((item) => pair(...item.memberIds, request.fromUserId, request.toUserId));
    if (request.status === 'connected' && existing) return existing;
    if (request.status !== 'pending') throw new Error('This request is no longer pending.');
    const a = me(state), b = person(request.fromUserId, state);
    const matches = matchPeople(a, [b], state.intents, state.blockedUsers.map((item) => item.userId));
    const intentLines = state.intents.filter((intent) => [a.id, b.id].includes(intent.userId) && intent.status === 'active' && (intent.userId === a.id || intent.visibility === 'public'))
      .slice(0, 3).map((intent) => `${person(intent.userId, state).name}: ${intent.originalText}`);
    const sharedContext = [...new Set([request.why, ...(matches[0]?.reasons.map((reason) => reason.text) ?? []), ...intentLines])];
    const timestamp = now();
    const connection = state.connections.find((item) => pair(item.aUserId, item.bUserId, a.id, b.id))
      ?? { id: uid('connection'), aUserId: a.id, bUserId: b.id, createdAt: timestamp, level: 'connected' as const };
    const conversation: Conversation = existing ?? { id: uid('conversation'), memberIds: [a.id, b.id], createdAt: timestamp, connectionId: connection.id, sharedContext, introMessageId: null, muted: false };
    const intro: Message = { id: uid('message'), conversationId: conversation.id, senderId: 'nexus', text: introduction(a, b, sharedContext), kind: 'intro', createdAt: timestamp, deliveredAt: timestamp, readAt: null };
    const updated = { ...conversation, connectionId: connection.id, sharedContext, introMessageId: conversation.introMessageId ?? intro.id };
    mutate((current) => ({
      requests: current.requests.map((item) => item.id === id ? { ...item, status: 'connected' as const, respondedAt: timestamp } : item),
      connections: current.connections.some((item) => item.id === connection.id) ? current.connections : [connection, ...current.connections],
      conversations: existing ? current.conversations.map((item) => item.id === existing.id ? updated : item) : [updated, ...current.conversations],
      messages: conversation.introMessageId ? current.messages : [...current.messages, intro],
      notifications: [notice('connection-accepted', b.id, `You and ${b.name} are connected. Your introduction is ready.`, { userId: b.id, conversationId: conversation.id }), ...current.notifications.map((item) => item.kind === 'connection-request' && item.meta?.userId === b.id ? { ...item, read: true } : item)],
      analyticsEvents: track(current, 'connection_accepted', { userId: b.id, conversationId: conversation.id }),
    }));
    return updated;
  },
  decline(id: string) {
    const request = db.getState().requests.find((item) => item.id === id);
    if (!request) throw new Error('This connection request could not be found.');
    if (request.toUserId !== db.getState().meId) throw new Error('Only the recipient can decline this request.');
    if (request.status !== 'pending') return;
    mutate((state) => ({ requests: state.requests.map((item) => item.id === id ? { ...item, status: 'declined' as const, respondedAt: now() } : item), notifications: state.notifications.map((item) => item.kind === 'connection-request' && item.meta?.userId === request.fromUserId ? { ...item, read: true } : item) }));
  },
  pass(id: string) {
    if (db.getState().requests.some((item) => item.id === id)) return connections.decline(id);
    allowedOther(id);
    mutate((state) => ({ passedUserIds: [...new Set([...state.passedUserIds, id])], analyticsEvents: track(state, 'person_passed', { userId: id }) }));
  },
  /**
   * Demo-only: safely previews the recipient side of MY outgoing request without
   * switching meId or touching the other user's records — the recipient is a seeded demo persona.
   */
  demoAcceptOutgoing(id: string): Conversation {
    const state = db.getState();
    const request = state.requests.find((item) => item.id === id);
    if (!request) throw new Error('This connection request could not be found.');
    if (request.fromUserId !== state.meId) throw new Error('Only your own outgoing request can be demo-accepted.');
    const existing = state.conversations.find((item) => pair(...item.memberIds, request.fromUserId, request.toUserId));
    if (existing && request.status === 'connected') return existing; // already accepted — idempotent
    if (request.status !== 'pending' && request.status !== 'connected') throw new Error('This request is no longer pending.');
    const a = me(state);
    const b = person(request.toUserId, state);
    if (b.suspended) throw new Error('This account is suspended.');
    const matches = matchPeople(b, [a], state.intents, state.blockedUsers.map((item) => item.userId));
    const intentLines = state.intents.filter((intent) => [a.id, b.id].includes(intent.userId) && intent.status === 'active')
      .slice(0, 3).map((intent) => `${person(intent.userId, state).name}: ${intent.originalText}`);
    const sharedContext = [...new Set([request.why, ...(matches[0]?.reasons.map((reason) => reason.text) ?? []), ...intentLines])];
    const timestamp = now();
    const connection = state.connections.find((item) => pair(item.aUserId, item.bUserId, a.id, b.id))
      ?? { id: uid('connection'), aUserId: a.id, bUserId: b.id, createdAt: timestamp, level: 'connected' as const };
    const conversation: Conversation = state.conversations.find((item) => pair(...item.memberIds, a.id, b.id))
      ?? { id: uid('conversation'), memberIds: [a.id, b.id], createdAt: timestamp, connectionId: connection.id, sharedContext, introMessageId: null, muted: false };
    const intro: Message = { id: uid('message'), conversationId: conversation.id, senderId: 'nexus', text: introduction(b, a, sharedContext), kind: 'intro', createdAt: timestamp, deliveredAt: timestamp, readAt: null };
    const updated = { ...conversation, connectionId: connection.id, sharedContext, introMessageId: conversation.introMessageId ?? intro.id };
    db.setState((current) => ({
      requests: current.requests.map((item) => item.id === id ? { ...item, status: 'connected' as const, respondedAt: timestamp } : item),
      connections: current.connections.some((item) => item.id === connection.id) ? current.connections : [connection, ...current.connections],
      conversations: state.conversations.some((item) => item.id === conversation.id) ? current.conversations.map((item) => item.id === conversation.id ? updated : item) : [updated, ...current.conversations],
      messages: conversation.introMessageId ? current.messages : [...current.messages, intro],
      notifications: [notice('connection-accepted', b.id, `${b.name} accepted your request. Your introduction is ready.`, { userId: b.id, conversationId: conversation.id }), ...current.notifications.map((item) => item.kind === 'connection-request' && item.meta?.userId === b.id ? { ...item, read: true } : item)],
      analyticsEvents: track(current, 'connection_accepted', { userId: b.id, conversationId: conversation.id }),
    }));
    return updated;
  },
};

function chat(id: string, state = db.getState()): { conversation: Conversation; other: User } {
  const conversation = state.conversations.find((item) => item.id === id);
  if (!conversation || !conversation.memberIds.includes(state.meId)) throw new Error('This conversation is not available.');
  const other = person(conversation.memberIds.find((member) => member !== state.meId)!, state);
  allowedOther(other.id, state);
  if (!conversation.connectionId && other.privacy.whoCanMessage === 'connections-only') throw new Error('Connect with this person before messaging.');
  return { conversation, other };
}
// This local-only app's initial other-party profiles are seeded demo personas.
// New/unknown profiles never receive simulated messages or fabricated read receipts.
const demoPartyIds = new Set(db.getState().users.filter((user) => user.id !== db.getState().meId && !user.isDemoUser).map((user) => user.id));
const replyTurns = new Map<string, number>();
const pendingReplies = new Map<string, Promise<Message | null>>();
function delayedReceipt(id: string, convId: string, generation: number, read: boolean) {
  setTimeout(() => {
    if (generation !== getDatabaseGeneration()) return;
    try { chat(convId); } catch { return; }
    const timestamp = now();
    mutate((state) => ({ messages: state.messages.map((item) => item.id === id ? { ...item, deliveredAt: item.deliveredAt ?? timestamp, readAt: read ? item.readAt ?? timestamp : item.readAt } : item) }));
  }, read ? 1600 : 450);
}
export const messages = {
  send(convId: string, text: string): Message {
    const { other } = chat(convId);
    const message: Message = { id: uid('message'), conversationId: convId, senderId: db.getState().meId, text: required(text, 'Message', 5000), kind: 'text', createdAt: now(), deliveredAt: null, readAt: null };
    mutate((state) => ({ messages: [...state.messages, message], connections: state.connections.map((connection) => pair(connection.aUserId, connection.bUserId, state.meId, other.id) && connection.level === 'connected' ? { ...connection, level: 'interacted' as const } : connection), analyticsEvents: track(state, 'message_sent', { conversationId: convId }) }));
    delayedReceipt(message.id, convId, getDatabaseGeneration(), false);
    if (demoPartyIds.has(other.id)) delayedReceipt(message.id, convId, getDatabaseGeneration(), true);
    return message;
  },
  markRead(convId: string) {
    chat(convId);
    const timestamp = now();
    mutate((state) => ({ messages: state.messages.map((item) => item.conversationId === convId && item.senderId !== state.meId && item.readAt === null ? { ...item, deliveredAt: item.deliveredAt ?? timestamp, readAt: timestamp } : item), notifications: state.notifications.map((item) => item.meta?.conversationId === convId ? { ...item, read: true } : item) }));
  },
  typingSim(convId: string): Promise<Message | null> {
    const { other } = chat(convId);
    if (!demoPartyIds.has(other.id) || typeof window === 'undefined') return Promise.resolve(null);
    const generation = getDatabaseGeneration();
    const key = `${generation}:${convId}`;
    const pending = pendingReplies.get(key);
    if (pending) return pending;
    const promise = new Promise<Message | null>((resolve) => {
      setTimeout(() => {
        pendingReplies.delete(key);
        if (generation !== getDatabaseGeneration()) { resolve(null); return; }
        let conversation: Conversation;
        try { conversation = chat(convId).conversation; } catch { resolve(null); return; }
        const context = conversation.sharedContext[0]?.replace(/[.!?]+$/, '') || 'our shared interests';
        const turn = replyTurns.get(key) ?? 0;
        const replies = [
          `That sounds good! I’m glad we connected around ${context}. What’s one small thing we could try together?`,
          `I’d be happy to help. Let’s start with a quick exchange of ideas about ${context}, then pick a time that works for both of us.`,
        ];
        replyTurns.set(key, turn + 1);
        const timestamp = now();
        const message: Message = { id: uid('message'), conversationId: convId, senderId: other.id, text: replies[turn % 2], kind: 'text', createdAt: timestamp, deliveredAt: timestamp, readAt: null };
        mutate((state) => ({ messages: [...state.messages, message], notifications: conversation.muted || muted(other.id, state) ? state.notifications : [notice('new-message', other.id, `${other.name} sent you a demo reply`, { userId: other.id, conversationId: convId }), ...state.notifications] }));
        resolve(message);
      }, 2200);
    });
    pendingReplies.set(key, promise);
    return promise;
  },
};

export const blocks = {
  add(userId: string) {
    allowedOther(userId);
    mutate((state) => ({ blockedUsers: [...state.blockedUsers, { userId, blockedAt: now() }], requests: state.requests.map((item) => item.status === 'pending' && (item.fromUserId === userId || item.toUserId === userId) ? { ...item, status: 'declined' as const, respondedAt: now() } : item), notifications: state.notifications.filter((item) => item.actorUserId !== userId), analyticsEvents: track(state, 'user_blocked', { userId }) }));
  },
  remove(userId: string) { mutate((state) => ({ blockedUsers: state.blockedUsers.filter((item) => item.userId !== userId) })); },
};
export const mutes = {
  add(userId: string) {
    person(userId);
    if (userId === db.getState().meId) throw new Error('You cannot mute yourself.');
    mutate((state) => ({ mutedUsers: state.mutedUsers.some((item) => item.userId === userId) ? state.mutedUsers : [...state.mutedUsers, { userId, mutedAt: now() }], conversations: state.conversations.map((item) => item.memberIds.includes(userId) ? { ...item, muted: true } : item) }));
  },
  remove(userId: string) { mutate((state) => ({ mutedUsers: state.mutedUsers.filter((item) => item.userId !== userId), conversations: state.conversations.map((item) => item.memberIds.includes(userId) ? { ...item, muted: false } : item) })); },
};
export const reports = {
  file(targetKind: Report['targetKind'], targetId: string, reason: string, detail = ''): Report {
    const state = db.getState();
    const target = targetKind === 'user' ? state.users.find((item) => item.id === targetId)
      : targetKind === 'post' ? state.posts.find((item) => item.id === targetId)
      : targetKind === 'message' ? state.messages.find((item) => item.id === targetId)
      : state.intents.find((item) => item.id === targetId);
    if (!target) throw new Error('The reported item could not be found.');
    const targetLabel = 'name' in target ? target.name : 'title' in target ? target.title : target.text.slice(0, 100);
    const report: Report = { id: uid('report'), targetKind, targetId, targetLabel, reason: required(reason, 'Report reason', 200), detail: detail.trim().slice(0, 5000), reporterId: state.meId, reporterName: me(state).name, createdAt: now(), status: 'open', action: 'none' };
    mutate((current) => ({ reports: [report, ...current.reports], analyticsEvents: track(current, 'report_filed', { targetKind }) }));
    return report;
  },
};

export type CircleFields = Pick<Circle, 'name' | 'purpose'> & Partial<Pick<Circle, 'emoji' | 'description' | 'goal' | 'category' | 'memberLimit' | 'privacy' | 'city' | 'startDate' | 'endDate'>>;
export const circles = {
  join(id: string): Circle {
    const circle = db.getState().circles.find((item) => item.id === id);
    if (!circle) throw new Error('This circle could not be found.');
    if (circle.memberIds.includes(db.getState().meId)) return circle;
    if (circle.privacy !== 'open') throw new Error('This circle requires an invitation.');
    if (circle.memberIds.length >= circle.memberLimit) throw new Error('This circle is full.');
    if (circle.endDate !== null && circle.endDate <= now()) throw new Error('This circle has ended.');
    const updated = { ...circle, memberIds: [...circle.memberIds, db.getState().meId] };
    mutate((state) => ({ circles: state.circles.map((item) => item.id === id ? updated : item), analyticsEvents: track(state, 'circle_joined', { circleId: id }) }));
    return updated;
  },
  leave(id: string) {
    const circle = db.getState().circles.find((item) => item.id === id);
    if (!circle) throw new Error('This circle could not be found.');
    if (circle.ownerUserId === db.getState().meId) throw new Error('As the owner, stay in the circle to support its members.');
    mutate((state) => ({ circles: state.circles.map((item) => item.id === id ? { ...item, memberIds: item.memberIds.filter((member) => member !== state.meId) } : item) }));
  },
  create(fields: CircleFields): Circle {
    const timestamp = now();
    const memberLimit = fields.memberLimit ?? 20;
    if (!Number.isInteger(memberLimit) || memberLimit < 2 || memberLimit > 500) throw new Error('Circle size must be between 2 and 500.');
    const startDate = fields.startDate ?? timestamp;
    const endDate = fields.endDate ?? null;
    if (endDate !== null && endDate <= startDate) throw new Error('End date must be after the start date.');
    const circle: Circle = { id: uid('circle'), name: required(fields.name, 'Circle name', 100), purpose: required(fields.purpose, 'Circle purpose', 1000), emoji: fields.emoji || '◎', description: fields.description?.trim() || fields.purpose.trim(), goal: fields.goal?.trim() || fields.purpose.trim(), category: fields.category || 'Creative', ownerUserId: db.getState().meId, memberIds: [db.getState().meId], memberLimit, privacy: fields.privacy ?? 'open', city: fields.city ?? null, startDate, endDate, dayNumber: 1, createdAt: timestamp };
    mutate((state) => ({ circles: [circle, ...state.circles], analyticsEvents: track(state, 'circle_created', { circleId: circle.id }) }));
    return circle;
  },
  postsInCircle(id: string): Post[] {
    const state = db.getState();
    const circle = state.circles.find((item) => item.id === id);
    if (!circle || (circle.privacy !== 'open' && !circle.memberIds.includes(state.meId))) return [];
    return state.posts.filter((post) => post.circleId === id && !blocked(post.userId, state) && !muted(post.userId, state));
  },
};
function accessiblePost(id: string): Post {
  const state = db.getState();
  const post = state.posts.find((item) => item.id === id);
  if (!post || blocked(post.userId, state)) throw new Error('This post is not available.');
  if (post.circleId) {
    const circle = state.circles.find((item) => item.id === post.circleId);
    if (!circle || (circle.privacy !== 'open' && !circle.memberIds.includes(state.meId))) throw new Error('Join this circle to participate.');
  }
  return post;
}
export const posts = {
  create(kind: PostKind, title: string, body: string, tags: string[] = [], circleId: string | null = null, structured?: Post['structured']): Post {
    if (!['share', 'ask', 'collaborate', 'teach', 'challenge', 'meet'].includes(kind)) throw new Error('Choose a supported post type.');
    if (circleId) {
      const circle = db.getState().circles.find((item) => item.id === circleId);
      if (!circle?.memberIds.includes(db.getState().meId)) throw new Error('Join the circle before posting.');
    }
    const post: Post = { id: uid('post'), userId: db.getState().meId, kind, title: required(title, 'Post title', 200), body: required(body, 'Post body'), tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 12), circleId, createdAt: now(), structured: structured ? { ...structured, skillsNeeded: [...structured.skillsNeeded] } : undefined, reactions: { useful: 0, interesting: 0, 'lets-do-it': 0, support: 0 }, myReaction: null, comments: [], helpedBy: [], iCanHelp: false };
    mutate((state) => ({ posts: [post, ...state.posts], analyticsEvents: track(state, 'post_created', { postId: post.id, kind }) }));
    return post;
  },
  react(id: string, reaction: Reaction): Post {
    const post = accessiblePost(id);
    if (!['useful', 'interesting', 'lets-do-it', 'support'].includes(reaction)) throw new Error('Choose a supported reaction.');
    const counts = { ...post.reactions };
    if (post.myReaction) counts[post.myReaction] = Math.max(0, counts[post.myReaction] - 1);
    const myReaction = post.myReaction === reaction ? null : reaction;
    if (myReaction) counts[myReaction] += 1;
    const updated = { ...post, reactions: counts, myReaction };
    mutate((state) => ({ posts: state.posts.map((item) => item.id === id ? updated : item) }));
    return updated;
  },
  comment(id: string, text: string): Post['comments'][number] {
    accessiblePost(id);
    const comment = { id: uid('comment'), userId: db.getState().meId, text: required(text, 'Comment', 3000), createdAt: now() };
    mutate((state) => ({ posts: state.posts.map((item) => item.id === id ? { ...item, comments: [...item.comments, comment] } : item), analyticsEvents: track(state, 'comment_created', { postId: id }) }));
    return comment;
  },
  icanHelp(id: string): Post {
    const post = accessiblePost(id);
    if (post.userId === db.getState().meId) throw new Error('Offer your help on someone else’s post.');
    if (post.helpedBy.includes(db.getState().meId)) return post;
    const updated = { ...post, helpedBy: [...post.helpedBy, db.getState().meId], iCanHelp: true };
    mutate((state) => ({ posts: state.posts.map((item) => item.id === id ? updated : item), analyticsEvents: track(state, 'help_offered', { postId: id }) }));
    return updated;
  },
};
export const notifications = {
  markAllRead() { mutate((state) => ({ notifications: state.notifications.map((item) => ({ ...item, read: true })) })); },
};
export const privacy = {
  update(partial: Partial<Privacy>): Privacy {
    const allowed: Partial<Privacy> = {};
    for (const key of ['discoverable', 'showCity', 'showInLocalSuggestions'] as const) {
      if (partial[key] !== undefined) {
        if (typeof partial[key] !== 'boolean') throw new Error('Privacy settings must be boolean.');
        allowed[key] = partial[key];
      }
    }
    if (partial.whoCanMessage !== undefined) {
      if (!['anyone', 'connections-only'].includes(partial.whoCanMessage)) throw new Error('Invalid messaging privacy.');
      allowed.whoCanMessage = partial.whoCanMessage;
    }
    mutate((state) => ({ users: state.users.map((user) => user.id === state.meId ? { ...user, privacy: { ...user.privacy, ...allowed } } : user) }));
    return me().privacy;
  },
};

// ── Moderation (admin-gated) ────────────────────────────────────────────────
// Only an admin account can act; reports about content resolve the content
// author's suspension, and user reports resolve the target user directly.
function requireAdmin(state = db.getState()): User {
  const actor = requireActor(state);
  if (!actor.isAdmin) throw new Error('Admin access is required.');
  return actor;
}
function setSuspended(id: string, suspended: boolean): User {
  const state = db.getState();
  person(id, state);
  db.setState((current) => ({
    users: current.users.map((user) => user.id === id ? { ...user, suspended } : user),
    analyticsEvents: track(current, 'moderation_suspension', { userId: id, suspended }),
  }));
  return person(id);
}
export const moderation = {
  /** Open → reviewing. Admin-only: report metadata is internal moderation data. */
  review(reportId: string): Report {
    requireAdmin();
    const report = db.getState().reports.find((item) => item.id === reportId);
    if (!report) throw new Error('This report could not be found.');
    if (report.status !== 'open') throw new Error('This report is not open for review.');
    db.setState((state) => ({ reports: state.reports.map((item) => item.id === reportId ? { ...item, status: 'reviewing' } : item) }));
    return db.getState().reports.find((item) => item.id === reportId)!;
  },
  dismiss(reportId: string): Report {
    requireAdmin();
    const report = db.getState().reports.find((item) => item.id === reportId);
    if (!report) throw new Error('This report could not be found.');
    db.setState((state) => ({
      reports: state.reports.map((item) => item.id === reportId ? { ...item, status: 'resolved', action: 'dismissed' } : item),
      analyticsEvents: track(state, 'moderation_dismissed', { reportId }),
    }));
    return db.getState().reports.find((item) => item.id === reportId)!;
  },
  warn(reportId: string, note = ''): Report {
    requireAdmin();
    const report = db.getState().reports.find((item) => item.id === reportId);
    if (!report) throw new Error('This report could not be found.');
    db.setState((state) => ({
      reports: state.reports.map((item) => item.id === reportId ? { ...item, status: 'resolved', action: 'warned', actionNote: note.trim() || undefined } : item),
      analyticsEvents: track(state, 'moderation_warned', { reportId }),
    }));
    return db.getState().reports.find((item) => item.id === reportId)!;
  },
  suspend(reportId: string, note = ''): Report {
    requireAdmin();
    const state = db.getState();
    const report = state.reports.find((item) => item.id === reportId);
    if (!report) throw new Error('This report could not be found.');
    const targetId = report.targetKind === 'user' ? report.targetId
      : report.targetKind === 'post' ? person(state.posts.find((item) => item.id === report.targetId)?.userId ?? '', state).id
      : report.targetKind === 'message' ? person(state.messages.find((item) => item.id === report.targetId)?.senderId ?? '', state).id
      : person(state.intents.find((item) => item.id === report.targetId)?.userId ?? '', state).id;
    setSuspended(targetId, true);
    db.setState((current) => ({
      reports: current.reports.map((item) => item.id === reportId ? { ...item, status: 'resolved', action: 'suspended', actionNote: note.trim() || undefined } : item),
      analyticsEvents: track(current, 'moderation_suspended', { reportId, targetId }),
    }));
    return db.getState().reports.find((item) => item.id === reportId)!;
  },
  unsuspend(userId: string): User {
    requireAdmin();
    return setSuspended(userId, false);
  },
};

/** UI-facing repository: all writes above flow through the single vanilla store. */
export const repo = { auth, completeOnboarding, profile, intents, connections, messages, blocks, mutes, reports, circles, posts, notifications, privacy, moderation };
export default repo;
