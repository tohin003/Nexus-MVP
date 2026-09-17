import { useMemo } from 'react';
import { useStore } from 'zustand/react';
import { useShallow } from 'zustand/react/shallow';
import { db } from './db';
import type { AppState } from './db';
import { repo } from '../services/repo';

export { db, exportState, importState, resetDemo, STATE_VERSION, STORAGE_KEY } from './db';
export type { AppState, AnalyticsEvent } from './db';
export {
  auth, completeOnboarding, profile, intents, connections, messages, blocks, mutes,
  reports, circles, posts, stories, notifications, privacy, moderation, repo,
} from '../services/repo';
export type { ProfileFields, IntentOverrides, CircleFields } from '../services/repo';

const identity = (state: AppState) => state;
export function useNexus(): AppState;
export function useNexus<T>(selector: (state: AppState) => T): T;
export function useNexus<T = AppState>(selector: (state: AppState) => T = identity as (state: AppState) => T): T {
  // Shallow-stable snapshots also make inline filter/map/object selectors safe in Zustand 5.
  return useStore(db, useShallow(selector));
}

export const useMe = () => useNexus((state) => state.users.find((user) => user.id === state.meId)!);
export const useUsers = () => useNexus((state) => state.users);
export const useUser = (id?: string | null) => useNexus((state) => state.users.find((user) => user.id === id));
export const useIntents = () => useNexus((state) => state.intents);
export const useConnections = () => useNexus((state) => state.connections);
export const useRequests = () => useNexus((state) => state.requests);
export const useConversations = () => useNexus((state) => state.conversations);
export function useMessages(convId?: string | null) {
  const all = useNexus((state) => state.messages);
  return useMemo(() => all.filter((message) => message.conversationId === convId)
    .sort((a, b) => a.createdAt - b.createdAt), [all, convId]);
}
export const usePosts = () => useNexus((state) => state.posts);
export const useCircles = () => useNexus((state) => state.circles);
/** People discovery view: discoverable, not suspended, not blocked, not already passed. */
export function useDiscoverableUsers() {
  const meId = useNexus((state) => state.meId);
  const passed = useNexus((state) => state.passedUserIds);
  const blockedIds = useBlockedIds();
  return useNexus((state) => state.users.filter((user) => user.id !== meId
    && user.privacy.discoverable && !user.suspended && !blockedIds.includes(user.id) && !passed.includes(user.id)));
}
export const useCircleEvents = () => useNexus((state) => state.circleEvents);
export const useCircleProjects = () => useNexus((state) => state.circleProjects);
export const useNotifications = () => useNexus((state) => state.notifications);
export const useReports = () => useNexus((state) => state.reports);
export const useBlockedIds = () => useNexus((state) => state.blockedUsers.map((item) => item.userId));
export const useMutedIds = () => useNexus((state) => state.mutedUsers.map((item) => item.userId));
export const usePassedIds = () => useNexus((state) => state.passedUserIds);
export const useAnalyticsEvents = () => useNexus((state) => state.analyticsEvents);

/** Stable namespace wrappers; do not store functions inside persisted AppState. */
export const actions = {
  auth: repo.auth,
  completeOnboarding: repo.completeOnboarding,
  profile: repo.profile,
  intents: repo.intents,
  connections: repo.connections,
  follows: repo.follows,
  messages: repo.messages,
  blocks: repo.blocks,
  mutes: repo.mutes,
  reports: repo.reports,
  circles: repo.circles,
  posts: repo.posts,
  stories: repo.stories,
  notifications: repo.notifications,
  privacy: repo.privacy,
  moderation: repo.moderation,
};
export const useActions = () => actions;
