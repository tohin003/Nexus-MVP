import type { User } from '../domain/types';
import { db, importState, type AppState } from '../repo/db';
import type { ServerUser } from './api';

export function accountUser(user: ServerUser): User {
  return {
    id: user.id, username: user.username, name: user.name, city: user.city,
    avatar: user.avatar ?? '', roles: user.roles ?? [], interests: user.interests ?? [],
    skills: user.skills ?? [], needs: user.needs ?? [], availability: user.availability ?? 'flexible',
    experience: user.experience ?? 'beginner', privacy: user.privacy,
    headline: '', bio: '', currently: '', accentHue: 170, trustBadges: [],
    reputation: { helpfulness: 0, reliability: 0, meaningfulConnections: 0, peopleHelped: 0, projectsCompleted: 0, collaborations: 0 },
    joinedAt: Date.parse(user.createdAt ?? '') || Date.now(), isAdmin: user.isAdmin === true,
    suspended: user.suspended === true, isDemoUser: false,
  };
}

/** Never carry one account's conversations, demo persona, or permissions into another. */
export function activateAccount(user: ServerUser) {
  const current = db.getState();
  const own = accountUser(user);
  const state: AppState = {
    version: 1, meId: user.id, signedIn: true, authMode: 'account', onboardingComplete: true,
    users: [own], intents: [], requests: [], connections: [], follows: [], conversations: [], messages: [],
    posts: [], stories: [], circles: [], circleEvents: [], circleProjects: [], notifications: [],
    reports: [], blockedUsers: [], mutedUsers: [], passedUserIds: [], analyticsEvents: [],
  };
  // Retain only the same account's device-local workspace on cookie restoration.
  importState(current.authMode === 'account' && current.meId === user.id
    ? { ...current, signedIn: true, users: current.users.map(item => item.id === user.id ? { ...item, ...own } : item) }
    : state);
}
