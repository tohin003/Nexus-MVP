// ── NEXUS domain model ────────────────────────────────────────────────────────
// Mirrors the product spec: People → Intents → Circles → Content.

export type InterestNode = {
  id: string; // slug, e.g. "filmmaking"
  label: string;
  category: string; // top-level grouping, e.g. "Creative"
  children?: string[]; // deeper interest ids
};

export type Skill = { id: string; label: string; category: string };

export type Availability = "mornings" | "evenings" | "weekends" | "full-time" | "flexible";

export type ExperienceLevel = "beginner" | "intermediate" | "experienced";

export type Role = "student" | "creator" | "founder" | "freelancer" | "professional" | "developer" | "designer" | "artist" | "educator" | "explorer";

export type GoalTag =
  | "meet-people" | "learn" | "create" | "build"
  | "find-opportunities" | "just-explore";

export type Privacy = {
  discoverable: boolean; // appears in People discovery
  whoCanMessage: "anyone" | "connections-only";
  showCity: boolean; // approximate location visibility (city only, never precise)
  showInLocalSuggestions: boolean;
};

export type Reputation = {
  helpfulness: number; // 0..100
  reliability: number; // 0..100
  meaningfulConnections: number;
  peopleHelped: number;
  projectsCompleted: number;
  collaborations: number;
};

export type User = {
  id: string;
  name: string;
  username: string;
  roles: Role[]; // max 3 — "What describes you?"
  headline: string; // short identity line, e.g. "Video Editor • Filmmaker"
  avatar: string; // local asset path or generated gradient id
  accentHue: number; // deterministic gradient seed for avatar fallback
  city: string;
  bio: string;
  currently: string; // "CURRENTLY" — what they're doing now
  interests: string[]; // interest ids, may include depth ids
  skills: string[]; // "What can people come to you for?" (I CAN HELP WITH)
  needs: string[]; // "What could you use help with?" (I'M LOOKING FOR)
  availability: Availability;
  experience: ExperienceLevel;
  reputation: Reputation;
  trustBadges: ("identity" | "skill" | "community" | "collaborations")[];
  privacy: Privacy;
  joinedAt: number;
  isDemoUser?: boolean; // the persona the evaluator plays
  isAdmin?: boolean;
  suspended?: boolean;
};

export type IntentType =
  | "learn" | "build" | "find-collaborator" | "find-opportunities"
  | "meet-people" | "get-advice" | "improve-self" | "create"
  | "share" | "ask" | "teach" | "challenge" | "meet";

export type IntentStatus = "active" | "matched" | "completed" | "archived";

/** Structured interpretation — always stored alongside originalText. */
export type IntentInterpretation = {
  intentType: IntentType;
  domain: string; // primary interest id, e.g. "filmmaking"
  goal: string; // short goal phrase, e.g. "Start a filmmaking YouTube channel"
  skillsNeeded: string[]; // skill ids
  skillsOffered: string[];
  relationship: "collaboration" | "mentorship" | "friendship" | "team" | "advice" | "activity";
  location: string; // city or "anywhere"
  remoteAllowed: boolean;
  experience: ExperienceLevel | "any";
  compensation: "paid" | "free" | "unspecified";
  time: string | null; // "weekend" | "evenings" | ...
  genre: string | null; // e.g. "horror"
  keywords: string[];
};

export type Intent = {
  id: string;
  userId: string;
  originalText: string; // never destroyed
  interpretation: IntentInterpretation;
  title: string;
  details?: string;
  status: IntentStatus;
  createdAt: number;
  expiresAt: number | null;
  visibility: "public" | "circles" | "private";
  interestedCount: number;
  interestedByMe?: boolean;
};

export type ConnectionStatus = "pending" | "connected" | "declined";

export type ConnectionRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  why: string; // contextual reason — required
  status: ConnectionStatus;
  createdAt: number;
  respondedAt?: number;
};

export type Connection = {
  id: string;
  aUserId: string;
  bUserId: string;
  createdAt: number;
  // internal level ladder — never shown as a "social score"
  level: "connected" | "interacted" | "collaborated" | "trusted";
};

export type Conversation = {
  id: string;
  memberIds: [string, string];
  createdAt: number;
  connectionId: string | null; // null for non-connection chats (e.g. circle DM later)
  sharedContext: string[]; // "You connected because…" lines
  introMessageId: string | null;
  muted: boolean;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string; // "nexus" for the AI introduction
  text: string;
  kind: "text" | "intro" | "system";
  createdAt: number;
  deliveredAt: number | null;
  readAt: number | null;
};

export type PostKind = "share" | "ask" | "collaborate" | "teach" | "challenge" | "meet";

export type Reaction = "useful" | "interesting" | "lets-do-it" | "support";

export type Post = {
  id: string;
  userId: string;
  kind: PostKind;
  title: string;
  body: string;
  circleId: string | null;
  createdAt: number;
  tags: string[];
  structured?: { skillsNeeded: string[]; location: string | null; time: string | null; paid: boolean };
  reactions: Record<Reaction, number>;
  myReaction: Reaction | null;
  comments: { id: string; userId: string; text: string; createdAt: number }[];
  helpedBy: string[]; // userIds who clicked "I can help"
  iCanHelp?: boolean;
};

export type Circle = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  purpose: string; // WHY the group exists — required
  goal: string; // current outcome, e.g. "Make 5 short films this month"
  category: string;
  ownerUserId: string;
  memberIds: string[];
  memberLimit: number;
  privacy: "open" | "invite" | "closed";
  city: string | null;
  startDate: number;
  endDate: number | null;
  dayNumber: number; // "CURRENT: Day 18"
  createdAt: number;
};

export type CircleEvent = {
  id: string;
  circleId: string;
  title: string;
  detail: string;
  at: number;
  location: string;
  goingIds: string[];
};

export type CircleProject = {
  id: string;
  circleId: string;
  title: string;
  ownerUserId: string;
  status: "active" | "done";
};

export type Report = {
  id: string;
  targetKind: "user" | "post" | "message" | "intent";
  targetId: string;
  targetLabel: string;
  reason: string;
  detail: string;
  reporterId: string;
  reporterName: string;
  createdAt: number;
  status: "open" | "reviewing" | "resolved";
  action: "none" | "dismissed" | "warned" | "suspended";
  actionNote?: string;
};

export type NotificationKind =
  | "connection-request" | "connection-accepted" | "new-message"
  | "intent-response" | "new-match" | "circle-invite";

export type Notification = {
  id: string;
  kind: NotificationKind;
  actorUserId: string | null;
  text: string;
  meta?: { conversationId?: string; userId?: string; intentId?: string; circleId?: string };
  createdAt: number;
  read: boolean;
};

export type BlockedUser = { userId: string; blockedAt: number };
export type MutedUser = { userId: string; mutedAt: number };

export type FitLabel = "GREAT FIT" | "STRONG FIT" | "POSSIBLE FIT";

export type MatchReason = { icon: string; text: string };

export type MatchResult = {
  user: User;
  score: number; // 0..100 — internal, never displayed as a percentage
  fit: FitLabel;
  reasons: MatchReason[];
  bidirectional: { canHelpThem: string[]; theyCanHelpMe: string[] };
  sharedInterests: string[];
  intentSummary: string;
};
