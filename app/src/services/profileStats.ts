import type { AppState } from '../repo/db';

/** Owners may see their own private passport, but unavailable profiles expose no lists. */
export function canViewProfileLists(state: AppState, userId: string) {
  const user = state.users.find((item) => item.id === userId);
  return !!(state.signedIn && user && !user.suspended
    && (userId === state.meId || (user.privacy.discoverable
      && !state.blockedUsers.some((item) => item.userId === userId))));
}

export function profilePosts(state: AppState, userId: string) {
  if (!canViewProfileLists(state, userId)) return null;
  return state.posts.filter((post) => {
    if (post.userId !== userId) return false;
    if (!post.circleId) return true;
    const circle = state.circles.find((item) => item.id === post.circleId);
    return !!circle && (circle.privacy === 'open' || circle.memberIds.includes(state.meId));
  }).sort((a, b) => b.createdAt - a.createdAt);
}

/** Direction is always relative to the requested profile, never implicitly the viewer. */
export function profileFollowUsers(state: AppState, userId: string, kind: 'followers' | 'following') {
  if (!canViewProfileLists(state, userId)) return null;
  const ids = new Set(state.follows.filter((follow) => kind === 'followers'
    ? follow.toUserId === userId : follow.fromUserId === userId)
    .map((follow) => kind === 'followers' ? follow.fromUserId : follow.toUserId));
  return state.users.filter((user) => ids.has(user.id) && canViewProfileLists(state, user.id));
}

/** Counts local records only; connections, Moments, and reputation are not follows/posts. */
export function profileStats(state: AppState, userId: string) {
  const posts = profilePosts(state, userId);
  if (!posts) return null;
  return {
    posts: posts.length,
    followers: state.follows.filter((item) => item.toUserId === userId).length,
    following: state.follows.filter((item) => item.fromUserId === userId).length,
  };
}
