import { createStore } from 'zustand/vanilla';
import type {
  BlockedUser, Circle, CircleEvent, CircleProject, Connection, ConnectionRequest,
  Conversation, Intent, Message, MutedUser, Notification, Post, Report, Story, User,
} from '../domain/types';
import { isUploadedImage, validateMedia } from '../services/image';

export const STATE_VERSION = 1 as const;
export const STORAGE_KEY = 'nexus-mvp-state-v1';
export type AnalyticsEvent = {
  id: string;
  name: string;
  at: number;
  properties?: Record<string, string | number | boolean | null>;
};
export type AppState = {
  version: typeof STATE_VERSION;
  meId: string;
  signedIn: boolean;
  onboardingComplete: boolean;
  users: User[];
  intents: Intent[];
  requests: ConnectionRequest[];
  connections: Connection[];
  conversations: Conversation[];
  messages: Message[];
  posts: Post[];
  stories: Story[];
  circles: Circle[];
  circleEvents: CircleEvent[];
  circleProjects: CircleProject[];
  notifications: Notification[];
  reports: Report[];
  blockedUsers: BlockedUser[];
  mutedUsers: MutedUser[];
  passedUserIds: string[];
  analyticsEvents: AnalyticsEvent[];
};

function storage(): Storage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
const rows = (value: unknown, fields: string[]) => Array.isArray(value) && value.every((row) =>
  isRecord(row) && fields.every((key) => typeof row[key] === 'string'));

export const MEDIA_STATE_BUDGET = 1_800_000;
// Only these existing, bundled portraits may appear in illustrative seed Moments.
const demoPhotos = new Set(['/avatars/aarav.jpg', '/avatars/kabir.jpg', '/avatars/ananya.jpg']);

/** Write the actual replacement key before committing media, so quota errors are atomic. */
export function preflightMedia(state: AppState): void {
  const json = JSON.stringify(state);
  if (json.length > MEDIA_STATE_BUDGET) throw new Error('Demo photo storage is full. Delete a Moment or remove a photo before trying again. Your draft has not been saved.');
  if (typeof window === 'undefined') return;
  try {
    const target = window.localStorage;
    if (!target) throw new Error('Storage unavailable');
    target.setItem(STORAGE_KEY, json);
  } catch {
    throw new Error('This browser could not save the photo. Storage may be full or disabled. Your draft is still here; free some space and try again.');
  }
}

/** Reject incompatible/corrupt backups before replacing any live data. */
function validate(value: unknown): asserts value is AppState {
  if (!isRecord(value) || value.version !== STATE_VERSION) {
    throw new Error('This backup is not a supported NEXUS version.');
  }
  // Version 1 predates Moments: migrate only an absent table, never malformed data.
  if (!Object.hasOwn(value, 'stories')) value.stories = [];
  const tableFields: Record<string, string[]> = {
    stories: ['id', 'userId', 'photo', 'caption'],
    users: ['id', 'name', 'username'], intents: ['id', 'userId', 'originalText', 'title'],
    requests: ['id', 'fromUserId', 'toUserId', 'why', 'status'],
    connections: ['id', 'aUserId', 'bUserId'], conversations: ['id'],
    messages: ['id', 'conversationId', 'senderId', 'text', 'kind'],
    posts: ['id', 'userId', 'kind', 'title', 'body'], circles: ['id', 'name', 'ownerUserId'],
    circleEvents: ['id', 'circleId', 'title'], circleProjects: ['id', 'circleId', 'title'],
    notifications: ['id', 'kind', 'text'], reports: ['id', 'targetKind', 'targetId', 'reason'],
    blockedUsers: ['userId'], mutedUsers: ['userId'], analyticsEvents: ['id', 'name'],
  };
  if (typeof value.meId !== 'string' || typeof value.signedIn !== 'boolean'
    || typeof value.onboardingComplete !== 'boolean' || !strings(value.passedUserIds)
    || !Object.entries(tableFields).every(([key, fields]) => rows(value[key], fields))) {
    throw new Error('The NEXUS backup has missing or invalid state fields.');
  }
  const users = value.users as Record<string, unknown>[];
  const validUsers = users.some((user) => user.id === value.meId) && users.every((user) =>
    ['roles', 'interests', 'skills', 'needs', 'trustBadges'].every((key) => strings(user[key]))
    && isRecord(user.privacy) && typeof user.privacy.discoverable === 'boolean'
    && typeof user.privacy.showCity === 'boolean' && typeof user.privacy.showInLocalSuggestions === 'boolean'
    && ['anyone', 'connections-only'].includes(String(user.privacy.whoCanMessage))
    && isRecord(user.reputation));
  const validIntents = (value.intents as Record<string, unknown>[]).every((intent) =>
    isRecord(intent.interpretation) && typeof intent.interestedCount === 'number'
    && ['skillsNeeded', 'skillsOffered', 'keywords'].every((key) => strings((intent.interpretation as Record<string, unknown>)[key])));
  const validConversations = (value.conversations as Record<string, unknown>[]).every((conversation) =>
    strings(conversation.memberIds) && conversation.memberIds.length === 2 && strings(conversation.sharedContext));
  const validPosts = (value.posts as Record<string, unknown>[]).every((post) =>
    strings(post.tags) && strings(post.helpedBy) && Array.isArray(post.comments) && isRecord(post.reactions)
    && ['useful', 'interesting', 'lets-do-it', 'support'].every((key) =>
      typeof (post.reactions as Record<string, unknown>)[key] === 'number'));
  if (!validUsers || !validIntents || !validConversations || !validPosts
    || !(value.circles as Record<string, unknown>[]).every((circle) => strings(circle.memberIds))) {
    throw new Error('The NEXUS backup contains malformed profile or content data.');
  }
  for (const key of Object.keys(tableFields)) {
    if (key === 'blockedUsers' || key === 'mutedUsers') continue;
    const items = value[key] as { id: string }[];
    if (new Set(items.map((item) => item.id)).size !== items.length) {
      throw new Error(`The NEXUS backup contains duplicate ${key} IDs.`);
    }
  }
  for (const user of value.users as Record<string, unknown>[]) {
    if (typeof user.avatar !== 'string') throw new Error('Invalid profile photo.');
    if (user.avatar.startsWith('data:')) validateMedia(user.avatar);
  }
  for (const post of value.posts as Record<string, unknown>[]) {
    if (post.photo !== undefined) {
      if (typeof post.photo !== 'string') throw new Error('Invalid post photo.');
      validateMedia(post.photo);
    }
  }
  for (const story of value.stories as Record<string, unknown>[]) {
    if (!users.some((user) => user.id === story.userId)
      || typeof story.createdAt !== 'number' || !Number.isFinite(story.createdAt)
      || typeof story.expiresAt !== 'number' || !Number.isFinite(story.expiresAt)
      || story.expiresAt - story.createdAt !== 86_400_000
      || typeof story.seenByMe !== 'boolean' || String(story.caption).length > 280) {
      throw new Error('The NEXUS backup contains a malformed Moment.');
    }
    if (!demoPhotos.has(story.photo as string)) validateMedia(story.photo as string);
  }
}

async function freshSeed(): Promise<AppState> {
  // Dynamic import avoids a runtime cycle: seed may import AppState as a type.
  const { buildSeed } = await import('../data/seed');
  const state = buildSeed();
  validate(state);
  return state;
}

function hydrate(): AppState | undefined {
  try {
    const json = storage()?.getItem(STORAGE_KEY);
    if (!json) return undefined;
    const state: unknown = JSON.parse(json);
    validate(state);
    return state;
  } catch {
    // Invalid, old-version, or inaccessible storage must never prevent startup.
    return undefined;
  }
}

// Module initialization awaits the lazy seed only when no valid backup exists.
// Components always observe a complete state, never an empty placeholder user.
const initialState = hydrate() ?? await freshSeed();
export const db = createStore<AppState>(() => initialState);
let generation = 0;
/** Lets delayed demo effects discard work after reset/import. */
export const getDatabaseGeneration = () => generation;
let suppressPersistence = false;
db.subscribe((state) => {
  if (suppressPersistence) return;
  try { storage()?.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* Storage quota/privacy restrictions leave the in-memory app usable. */ }
});

export async function resetDemo(): Promise<AppState> {
  const state = await freshSeed();
  generation += 1;
  try { storage()?.removeItem(STORAGE_KEY); } catch { /* Optional storage. */ }
  try { globalThis.sessionStorage?.removeItem('nexus-onboarding-draft-v1'); } catch { /* Optional tab storage. */ }
  // Keep the key cleared until the next genuine user mutation.
  suppressPersistence = true;
  try { db.setState(state, true); } finally { suppressPersistence = false; }
  return state;
}

export function exportState(): string {
  return JSON.stringify(db.getState(), null, 2);
}

export function importState(input: string | unknown): AppState {
  // Clone object input as well: callers cannot mutate the store through a backup reference.
  const state: unknown = JSON.parse(typeof input === 'string' ? input : JSON.stringify(input));
  validate(state);
  if (state.users.some((user) => isUploadedImage(user.avatar))
    || state.posts.some((post) => post.photo !== undefined)
    || state.stories.some((story) => isUploadedImage(story.photo))) preflightMedia(state);
  generation += 1;
  db.setState(state, true);
  return db.getState();
}
