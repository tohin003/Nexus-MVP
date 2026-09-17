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

import { exportState, importState, resetDemo } from '../repo/db';
import { auth, posts, profile, stories } from './repo';
import { groupStories } from './storyGroups';

const signIn = () => auth.demoSignIn();
const MEDIA = `data:image/jpeg;base64,${'A'.repeat(200_000)}`;
const OVERSIZE = `data:image/jpeg;base64,${'A'.repeat(230_000)}`;

beforeEach(async () => { memoryStore.clear(); await resetDemo(); });
afterEach(() => { vi.useRealTimers(); });

describe('stories', () => {
  it('requires sign-in and validates uploaded media on create', () => {
    expect(() => stories.create(MEDIA, 'hi')).toThrow(/sign in/i);
    signIn();
    expect(() => stories.create(OVERSIZE)).toThrow();
    expect(() => stories.create('https://example.com/photo.jpg')).toThrow();
    expect(stories.list()).toHaveLength(3);
  });

  it('creates a Moment with 24-hour expiry and caption', () => {
    signIn();
    const before = stories.list().length;
    const story = stories.create(MEDIA, '  One small share.  ');
    expect(story.photo).toBe(MEDIA);
    expect(story.caption).toBe('One small share.');
    expect(story.expiresAt - story.createdAt).toBe(86_400_000);
    expect(story.seenByMe).toBe(false);
    expect(stories.list()).toHaveLength(before + 1);
  });

  it('hides expired Moments and clears them on the next create', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-01T10:00:00Z'));
    signIn();
    const story = stories.create(MEDIA, 'Gone soon');
    expect(stories.list().some((item) => item.id === story.id)).toBe(true);
    vi.setSystemTime(new Date('2024-05-02T10:00:01Z'));
    expect(stories.list().some((item) => item.id === story.id)).toBe(false);
    const second = stories.create(MEDIA, 'Fresh');
    expect(dbState().stories.some((item) => item.id === story.id)).toBe(false);
    expect(second.caption).toBe('Fresh');
  });

  it('marks Moments seen and only deletes your own', () => {
    signIn();
    const seeded = stories.list().find((item) => item.userId !== 'me')!;
    stories.markSeen(seeded.id);
    expect(stories.list().find((item) => item.id === seeded.id)?.seenByMe).toBe(true);
    stories.markSeen(seeded.id); // idempotent
    expect(() => stories.delete(seeded.id)).toThrow(/own/i);
    const mine = stories.create(MEDIA, 'Mine');
    stories.delete(mine.id);
    expect(stories.list().some((item) => item.id === mine.id)).toBe(false);
  });

  it('groups three frames into one user ring while keeping other users separate', () => {
    signIn();
    const batch = stories.createBatch([MEDIA, MEDIA, MEDIA]);
    const visible = stories.list();
    const groups = groupStories(visible);
    expect(groups).toHaveLength(new Set(visible.map((frame) => frame.userId)).size);
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.filter((group) => group.userId === batch[0].userId)).toHaveLength(1);
    expect(groups.find((group) => group.userId === batch[0].userId)?.frames.map((frame) => frame.id)).toEqual(batch.map((frame) => frame.id));
    // Grouping is only a view: no frame storage or ordering changes.
    expect(stories.list()).toEqual(visible);
  });

  it('keeps a group unseen until every frame is seen, including after persistence', () => {
    signIn();
    const batch = stories.createBatch([MEDIA, MEDIA, MEDIA]);
    const group = () => groupStories(stories.list()).find((item) => item.userId === batch[0].userId)!;
    expect(group().hasUnseen).toBe(true);
    stories.markSeen(batch[0].id);
    expect(group().frames.map((frame) => frame.seenByMe)).toEqual([true, false, false]);
    expect(group().hasUnseen).toBe(true);
    stories.markSeen(batch[1].id);
    expect(group().hasUnseen).toBe(true);
    stories.markSeen(batch[2].id);
    expect(group().hasUnseen).toBe(false);
    importState(exportState());
    expect(group().hasUnseen).toBe(false);
    const fresh = stories.create(MEDIA);
    expect(group().hasUnseen).toBe(true);
    stories.delete(fresh.id);
    expect(group().hasUnseen).toBe(false);
    stories.delete(batch[1].id);
    expect(group().frames.map((frame) => frame.id)).toEqual([batch[0].id, batch[2].id]);
  });

  it('filters blocked, muted, suspended and non-discoverable authors', () => {
    signIn();
    const snapshot = JSON.parse(exportState()) as { users: { id: string; privacy: { discoverable: boolean }; suspended?: boolean }[]; stories: { userId: string }[]; blockedUsers: unknown[]; mutedUsers: unknown[] };
    const hidden = snapshot.stories.map((story) => story.userId).filter((id) => id !== 'me');
    importState(JSON.stringify({
      ...snapshot,
      users: snapshot.users.map((user) => hidden.includes(user.id) ? { ...user, privacy: { ...user.privacy, discoverable: false } } : user),
      stories: [
        ...snapshot.stories,
        { id: 'moment-hidden', userId: 'ananya', photo: '/avatars/ananya.jpg', caption: '', createdAt: Date.now() - 3_600_000, expiresAt: Date.now() + 86_400_000 - 3_600_000, seenByMe: false },
        { id: 'moment-suspended', userId: 'aarav', photo: '/avatars/aarav.jpg', caption: '', createdAt: Date.now() - 3_600_000, expiresAt: Date.now() + 86_400_000 - 3_600_000, seenByMe: false },
      ],
      blockedUsers: [{ userId: 'aarav', blockedAt: Date.now() }],
      mutedUsers: [{ userId: 'kabir', mutedAt: Date.now() }],
    }));
    expect(stories.list().some((item) => item.id === 'moment-hidden')).toBe(false);
    expect(stories.list().some((item) => item.id === 'moment-suspended')).toBe(false);
  });
});

describe('posts with photos', () => {
  it('stores an optional photo on create', () => {
    signIn();
    const post = posts.create('share', 'With a photo', 'Body', [], null, undefined, MEDIA);
    expect(post.photo).toBe(MEDIA);
  });

  it('rejects invalid or oversized post photos', () => {
    signIn();
    expect(() => posts.create('share', 'Bad', 'Body', [], null, undefined, OVERSIZE)).toThrow();
    expect(() => posts.create('share', 'Bad', 'Body', [], null, undefined, '/avatars/kabir.jpg')).toThrow();
    expect(() => posts.create('share', 'Bad', 'Body', [], null, undefined, `not-data:image/jpeg;base64,${'A'.repeat(100)}`)).toThrow();
  });
});

describe('profile avatar media validation', () => {
  it('accepts an uploaded avatar and rejects invalid media', () => {
    signIn();
    profile.update({ avatar: MEDIA });
    expect(state().users.find((user) => user.id === 'me')?.avatar).toBe(MEDIA);
    expect(() => profile.update({ avatar: OVERSIZE })).toThrow();
    expect(() => profile.update({ avatar: 'https://example.com/a.jpg' })).toThrow();
  });
});

describe('persistence migration', () => {
  it('migrates backups missing stories to an empty list', () => {
    signIn();
    const snapshot = JSON.parse(exportState()) as { stories?: unknown };
    delete snapshot.stories;
    const restored = importState(JSON.stringify(snapshot));
    expect(restored.stories).toEqual([]);
  });

  it('rejects malformed Moment rows instead of guessing', () => {
    signIn();
    const snapshot = JSON.parse(exportState());
    (snapshot as { stories: unknown }).stories = [{ id: 'bad', userId: 'me', photo: '/avatars/aarav.jpg', caption: '' }];
    expect(() => importState(JSON.stringify(snapshot))).toThrow(/Moment/i);
  });

  it('keeps illustrative seed Moments through a round-trip', () => {
    signIn();
    const snapshot = exportState();
    const restored = importState(snapshot);
    expect(restored.stories.length).toBeGreaterThan(0);
    expect(restored.stories.every((story) => story.photo.startsWith('/avatars/'))).toBe(true);
  });
});

// Tiny helper reading fresh state without importing the store twice.
function dbState() { return JSON.parse(exportState()) as { stories: { id: string }[] }; }
function state() { return dbState() as unknown as { users: { id: string; avatar: string }[] }; }
