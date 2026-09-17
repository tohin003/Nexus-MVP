import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, exportState, importState, resetDemo } from '../repo/db';
import { auth, posts, stories } from './repo';
import { MAX_POST_PHOTOS, MAX_STORY_BATCH, postPhotos, prepareImages } from './image';
const A = 'data:image/jpeg;base64,AAAA';
const B = 'data:image/jpeg;base64,BBBB';
beforeEach(async () => { vi.unstubAllGlobals(); await resetDemo(); auth.demoSignIn(); });

describe('ordered post media', () => {
  it('retains legacy single photos and supports text-only posts', () => {
    expect(postPhotos({ photo: A })).toEqual([A]);
    expect(postPhotos(posts.create('share', 'Text', 'Body'))).toEqual([]);
    const single = posts.create('share', 'Single', 'Body', [], null, undefined, A);
    expect(single.photo).toBe(A); expect(single.photos).toEqual([A]);
  });
  it('copies arrays, preserves order and persists 20 photos', () => {
    const selected = Array.from({ length: MAX_POST_PHOTOS }, (_, i) => i % 2 ? B : A);
    const post = posts.create('share', 'Twenty', 'Body', [], null, undefined, selected);
    selected.reverse();
    expect(post.photos?.[0]).toBe(A); expect(post.photo).toBe(A);
    const restored = importState(exportState()).posts.find(item => item.id === post.id)!;
    expect(restored.photos).toHaveLength(20); expect(restored.photos?.[1]).toBe(B);
  });
  it('rejects oversized or mixed invalid batches without writing', () => {
    const before = exportState();
    expect(() => posts.create('share', 'Bad', 'Body', [], null, undefined, Array(21).fill(A))).toThrow(/20/);
    expect(() => posts.create('share', 'Bad', 'Body', [], null, undefined, [A, 'https://x.test/a.jpg'])).toThrow();
    expect(exportState()).toBe(before);
  });
  it('rejects malformed imported arrays and mismatched legacy covers atomically', () => {
    const post = posts.create('share', 'Photo', 'Body', [], null, undefined, [A, B]);
    const before = exportState();
    for (const photos of [null, 'bad', [], [A, 2], Array(21).fill(A), [B, A]]) {
      const state = JSON.parse(before);
      state.posts.find((item: { id: string }) => item.id === post.id).photos = photos;
      expect(() => importState(state)).toThrow(); expect(exportState()).toBe(before);
    }
  });
});

describe('atomic separate story frames', () => {
  it('creates 20 frames in selection order with independent seen/delete and 24h expiry', () => {
    const batch = stories.createBatch(Array.from({ length: MAX_STORY_BATCH }, (_, i) => i % 2 ? B : A), ' shared ');
    expect(batch).toHaveLength(20); expect(new Set(batch.map(item => item.id)).size).toBe(20);
    expect(stories.list().slice(0, 20).map(item => item.id)).toEqual(batch.map(item => item.id));
    expect(batch.every(item => item.caption === 'shared' && item.expiresAt - item.createdAt === 86_400_000)).toBe(true);
    stories.markSeen(batch[0].id); expect(stories.list().find(item => item.id === batch[1].id)?.seenByMe).toBe(false);
    stories.delete(batch[0].id); expect(stories.list().some(item => item.id === batch[1].id)).toBe(true);
    expect(importState(exportState()).stories.find(item => item.id === batch[1].id)?.photo).toBe(B);
  });
  it('rejects empty, over-cap, bad media and bad captions without partial creation', () => {
    const before = exportState();
    for (const batch of [[], Array(21).fill(A), [A, 'bad']]) expect(() => stories.createBatch(batch)).toThrow();
    expect(() => stories.createBatch([A, B], 'a'.repeat(281))).toThrow();
    expect(exportState()).toBe(before);
  });
  it('leaves posts and stories untouched when actual browser storage throws', () => {
    const before = exportState();
    vi.stubGlobal('window', { localStorage: { setItem: () => { throw new Error('quota'); } } });
    expect(() => stories.createBatch([A, B])).toThrow(/storage|save/i);
    expect(() => posts.create('share', 'Photo', 'Body', [], null, undefined, [A, B])).toThrow(/storage|save/i);
    expect(exportState()).toBe(before);
  });
  it('rejects aggregate storage overflow before publishing any frames', () => {
    const before = exportState(); const big = `data:image/jpeg;base64,${'A'.repeat(200_000)}`;
    expect(() => stories.createBatch(Array(20).fill(big))).toThrow(/storage is full/i);
    expect(db.getState().stories).toEqual(JSON.parse(before).stories);
  });
});

describe('selection validation before decode', () => {
  it('rejects over-count and bad MIME across the entire batch', async () => {
    await expect(prepareImages(Array(21).fill({ type: 'image/jpeg', size: 10 } as File))).rejects.toThrow(/20/);
    await expect(prepareImages([{ type: 'image/jpeg', size: 10 }, { type: 'text/plain', size: 10 }] as File[])).rejects.toThrow(/JPEG/);
  });
  it('rejects per-file and aggregate input size limits', async () => {
    await expect(prepareImages([{ type: 'image/jpeg', size: 11 * 1024 * 1024 }] as File[])).rejects.toThrow(/10 MB/);
    await expect(prepareImages(Array(9).fill({ type: 'image/jpeg', size: 10 * 1024 * 1024 } as File))).rejects.toThrow(/80 MB/);
  });
});
