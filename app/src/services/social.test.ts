import { beforeEach, describe, expect, it } from 'vitest';
import { db, exportState, importState, resetDemo } from '../repo/db';
import { auth, blocks, connections, follows, posts } from './repo';
import { profileFollowUsers, profilePosts, profileStats } from './profileStats';

beforeEach(async () => { await resetDemo(); auth.demoSignIn(); });

const outgoing = () => db.getState().requests.find(item => item.fromUserId === 'me' && item.status === 'pending')!;

describe('sent request cancellation', () => {
  it('removes only the sent pending request; allows resending and persists', () => {
    const request = outgoing();
    const before = db.getState();
    connections.cancel(request.id);
    expect(db.getState().requests).toEqual(before.requests.filter(item => item.id !== request.id));
    expect(db.getState().connections).toBe(before.connections);
    expect(db.getState().conversations).toBe(before.conversations);
    expect(db.getState().messages).toBe(before.messages);
    importState(exportState());
    expect(db.getState().requests.some(item => item.id === request.id)).toBe(false);
    expect(connections.request(request.toUserId, 'A fresh reason').id).not.toBe(request.id);
  });
  it('rejects recipients and unrelated actors without mutation', () => {
    const incoming = db.getState().requests.find(item => item.toUserId === 'me' && item.status === 'pending')!;
    const before = db.getState();
    expect(() => connections.cancel(incoming.id)).toThrow(/Only the sender/);
    expect(db.getState()).toBe(before);
    const request = outgoing();
    db.setState({ meId: 'aarav' });
    expect(() => connections.cancel(request.id)).toThrow(/Only the sender/);
  });
  it('cannot cancel accepted or declined requests, including stale pending connected pairs', () => {
    const request = outgoing();
    connections.demoAcceptOutgoing(request.id);
    const accepted = db.getState();
    expect(() => connections.cancel(request.id)).toThrow(/Only pending/);
    expect(db.getState()).toBe(accepted);
    db.setState({ requests: accepted.requests.map(item => item.id === request.id ? { ...item, status: 'pending' } : item) });
    expect(() => connections.cancel(request.id)).toThrow(/Only pending/);
    db.setState({ connections: [], requests: accepted.requests.map(item => item.id === request.id ? { ...item, status: 'declined' } : item) });
    expect(() => connections.cancel(request.id)).toThrow(/Only pending/);
  });
  it('requires an active signed-in sender but permits withdrawal from an unavailable target', () => {
    const request = outgoing();
    auth.signOut();
    expect(() => connections.cancel(request.id)).toThrow(/Sign in/);
    auth.demoSignIn();
    db.setState(state => ({ users: state.users.map(user => user.id === 'me' ? { ...user, suspended: true } : user) }));
    expect(() => connections.cancel(request.id)).toThrow(/suspended/);
    db.setState(state => ({ users: state.users.map(user => ({ ...user, suspended: user.id === request.toUserId })) }));
    expect(() => connections.cancel(request.id)).not.toThrow();
    expect(() => connections.demoAcceptOutgoing(request.id)).toThrow(/could not be found/);
  });
});

describe('local directional follows and profile stats', () => {
  it('starts with zero follows despite seed connections, updates independently and idempotently', () => {
    expect(db.getState().connections.length).toBeGreaterThan(0);
    expect(profileStats(db.getState(), 'me')).toMatchObject({ followers: 0, following: 0 });
    const first = follows.follow('aarav');
    expect(follows.follow('aarav').id).toBe(first.id);
    expect(profileStats(db.getState(), 'me')?.following).toBe(1);
    expect(profileStats(db.getState(), 'aarav')?.followers).toBe(1);
    expect(profileStats(db.getState(), 'me')?.followers).toBe(0);
    const before = db.getState();
    follows.unfollow('aarav'); follows.unfollow('aarav');
    expect(db.getState().follows).toEqual([]);
    expect(db.getState().connections).toBe(before.connections);
    expect(db.getState().conversations).toBe(before.conversations);
  });
  it('counts actual posts, not Moments or reputation, and updates after publishing', () => {
    const state = db.getState();
    const before = profileStats(state, 'me')!.posts;
    posts.create('share', 'A real post', 'This is an actual post.');
    expect(profileStats(db.getState(), 'me')!.posts).toBe(before + 1);
    expect(profileStats(db.getState(), 'me')!.followers).toBe(0);
  });
  it('hides inaccessible circle posts and unavailable profiles', () => {
    const state = db.getState();
    const base = state.posts[0];
    const circle = { ...state.circles[0], id: 'private', privacy: 'closed' as const, memberIds: ['aarav'] };
    db.setState({ circles: [circle], posts: [{ ...base, id: 'public', userId: 'aarav', circleId: null }, { ...base, id: 'private', userId: 'aarav', circleId: circle.id }] });
    expect(profileStats(db.getState(), 'aarav')!.posts).toBe(1);
    db.setState({ circles: [{ ...circle, memberIds: ['aarav', 'me'] }] });
    expect(profileStats(db.getState(), 'aarav')!.posts).toBe(2);
    blocks.add('aarav');
    expect(profileStats(db.getState(), 'aarav')).toBeNull();
  });
  it('lists the requested profile’s directional follows, not the viewer’s connections', () => {
    db.setState({ follows: [
      { id: 'incoming', fromUserId: 'zoya', toUserId: 'me', createdAt: 1 },
      { id: 'outgoing', fromUserId: 'me', toUserId: 'aarav', createdAt: 2 },
      { id: 'other', fromUserId: 'aarav', toUserId: 'isha', createdAt: 3 },
    ] });
    expect(profileFollowUsers(db.getState(), 'me', 'followers')?.map(user => user.id)).toEqual(['zoya']);
    expect(profileFollowUsers(db.getState(), 'me', 'following')?.map(user => user.id)).toEqual(['aarav']);
    expect(profileFollowUsers(db.getState(), 'aarav', 'following')?.map(user => user.id)).toEqual(['isha']);
    expect(profileFollowUsers(db.getState(), 'zoya', 'followers')).toEqual([]);
  });
  it('gates direct lists and filters unavailable follow rows without changing local counts', () => {
    const base = db.getState();
    const graph = ['zoya', 'isha', 'kabir'].map((id, i) => ({ id: `f${i}`, fromUserId: 'aarav', toUserId: id, createdAt: i }));
    db.setState({ follows: graph, blockedUsers: [{ userId: 'kabir', blockedAt: 1 }], users: base.users.map(user =>
      user.id === 'zoya' ? { ...user, privacy: { ...user.privacy, discoverable: false } }
        : user.id === 'isha' ? { ...user, suspended: true } : user) });
    expect(profileStats(db.getState(), 'aarav')?.following).toBe(3);
    expect(profileFollowUsers(db.getState(), 'aarav', 'following')).toEqual([]);
    for (const id of ['zoya', 'isha', 'kabir', 'missing']) {
      expect(profileFollowUsers(db.getState(), id, 'followers')).toBeNull();
      expect(profileFollowUsers(db.getState(), id, 'following')).toBeNull();
      expect(profilePosts(db.getState(), id)).toBeNull();
    }
    db.setState({ signedIn: false });
    expect(profileFollowUsers(db.getState(), 'me', 'followers')).toBeNull();
    expect(profilePosts(db.getState(), 'me')).toBeNull();
    db.setState({ signedIn: true, users: base.users.map(user => user.id === 'me' ? { ...user, suspended: true } : user) });
    expect(profileStats(db.getState(), 'me')).toBeNull();
    expect(profilePosts(db.getState(), 'me')).toBeNull();
  });
  it('lists only visible posts in newest-first order using the same rules as counts', () => {
    const state = db.getState();
    const base = state.posts[0];
    const circle = { ...state.circles[0], id: 'private', privacy: 'closed' as const, memberIds: ['aarav'] };
    db.setState({ circles: [circle], posts: [
      { ...base, id: 'old', userId: 'aarav', circleId: null, createdAt: 1 },
      { ...base, id: 'private', userId: 'aarav', circleId: 'private', createdAt: 3 },
      { ...base, id: 'new', userId: 'aarav', circleId: null, createdAt: 2 },
      { ...base, id: 'missing-circle', userId: 'aarav', circleId: 'missing', createdAt: 4 },
      { ...base, id: 'another-user', userId: 'me', circleId: null, createdAt: 5 },
    ] });
    expect(profilePosts(db.getState(), 'aarav')?.map(post => post.id)).toEqual(['new', 'old']);
    expect(profileStats(db.getState(), 'aarav')?.posts).toBe(2);
    db.setState({ circles: [{ ...circle, memberIds: ['aarav', 'me'] }] });
    expect(profilePosts(db.getState(), 'aarav')?.map(post => post.id)).toEqual(['private', 'new', 'old']);
  });
  it('enforces nonself, sign-in, suspension, hidden-profile and block rules', () => {
    expect(() => follows.follow('me')).toThrow(/another person/);
    auth.signOut(); expect(() => follows.follow('aarav')).toThrow(/Sign in/); auth.demoSignIn();
    db.setState(state => ({ users: state.users.map(user => user.id === 'aarav' ? { ...user, privacy: { ...user.privacy, discoverable: false } } : user) }));
    expect(() => follows.follow('aarav')).toThrow(/not available/);
    expect(profileStats(db.getState(), 'aarav')).toBeNull();
    db.setState(state => ({ users: state.users.map(user => user.id === 'aarav' ? { ...user, suspended: true } : user) }));
    expect(() => follows.follow('aarav')).toThrow(/suspended/);
    blocks.add('zoya'); expect(() => follows.follow('zoya')).toThrow(/Unblock/);
  });
  it('blocking removes both directions, not other follows; unblocking does not restore them', () => {
    follows.follow('aarav'); follows.follow('zoya');
    db.setState(state => ({ follows: [...state.follows, { id: 'reverse', fromUserId: 'aarav', toUserId: 'me', createdAt: Date.now() }] }));
    blocks.add('aarav');
    expect(db.getState().follows).toHaveLength(1);
    expect(db.getState().follows[0].toUserId).toBe('zoya');
    blocks.remove('aarav');
    expect(profileStats(db.getState(), 'aarav')?.followers).toBe(0);
  });
  it('round trips follows and migrates old backups to empty graph', () => {
    follows.follow('aarav');
    importState(exportState());
    expect(profileStats(db.getState(), 'me')?.following).toBe(1);
    const legacy = JSON.parse(exportState()); delete legacy.follows;
    importState(legacy);
    expect(db.getState().follows).toEqual([]);
  });
  it('rejects malformed follow tables, duplicate pairs, self follows and dangling users atomically', () => {
    follows.follow('aarav');
    const before = db.getState(); const follow = before.follows[0];
    for (const invalid of [null, [{ ...follow, toUserId: 'me' }], [{ ...follow, toUserId: 'missing' }], [follow, { ...follow, id: 'duplicate' }], [{ ...follow, createdAt: 'today' }]]) {
      expect(() => importState({ ...before, follows: invalid })).toThrow();
      expect(db.getState()).toBe(before);
    }
  });
});
