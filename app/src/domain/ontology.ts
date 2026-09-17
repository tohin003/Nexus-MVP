import type { InterestNode, Skill } from "./types";

// ── Interest Graph ────────────────────────────────────────────────────────────
// Lightweight two-level hierarchy: category → interest → depth topics.
// Depth ids are also valid interests (e.g. "horror" under "filmmaking").

export const INTEREST_CATEGORIES = ["Creative", "Tech", "Business", "Learning", "Life"] as const;

export const INTERESTS: InterestNode[] = [
  // Creative
  { id: "filmmaking", label: "Filmmaking", category: "Creative", children: ["horror", "directing", "cinematography", "screenwriting"] },
  { id: "horror", label: "Horror films", category: "Creative" },
  { id: "directing", label: "Directing", category: "Creative" },
  { id: "cinematography", label: "Cinematography", category: "Creative" },
  { id: "screenwriting", label: "Screenwriting", category: "Creative" },
  { id: "youtube", label: "YouTube", category: "Creative", children: ["video-essays", "editing"] },
  { id: "video-essays", label: "Video essays", category: "Creative" },
  { id: "editing", label: "Video editing", category: "Creative" },
  { id: "photography", label: "Photography", category: "Creative", children: ["portrait", "street-photo"] },
  { id: "portrait", label: "Portrait photography", category: "Creative" },
  { id: "street-photo", label: "Street photography", category: "Creative" },
  { id: "design", label: "Design", category: "Creative", children: ["ui-design", "branding"] },
  { id: "ui-design", label: "UI design", category: "Creative" },
  { id: "branding", label: "Branding", category: "Creative" },
  { id: "music", label: "Music", category: "Creative", children: ["guitar", "production"] },
  { id: "guitar", label: "Guitar", category: "Creative" },
  { id: "music-production", label: "Music production", category: "Creative" },
  { id: "writing", label: "Writing", category: "Creative", children: ["screenwriting", "blogging"] },
  { id: "blogging", label: "Blogging", category: "Creative" },
  { id: "art", label: "Drawing & art", category: "Creative" },
  // Tech
  { id: "ai", label: "AI", category: "Tech", children: ["llms", "agents"] },
  { id: "llms", label: "LLMs", category: "Tech" },
  { id: "ai-agents", label: "AI agents", category: "Tech" },
  { id: "coding", label: "Coding", category: "Tech", children: ["web-dev", "mobile-dev", "python"] },
  { id: "web-dev", label: "Web development", category: "Tech" },
  { id: "mobile-dev", label: "Android development", category: "Tech" },
  { id: "python", label: "Python", category: "Tech" },
  { id: "startups", label: "Startups", category: "Tech" },
  { id: "gaming", label: "Gaming", category: "Tech", children: ["esports", "game-dev"] },
  { id: "esports", label: "Esports", category: "Tech" },
  { id: "game-dev", label: "Game development", category: "Tech" },
  // Business
  { id: "entrepreneurship", label: "Entrepreneurship", category: "Business" },
  { id: "marketing", label: "Marketing", category: "Business", children: ["content-marketing", "social-media"] },
  { id: "content-marketing", label: "Content marketing", category: "Business" },
  { id: "ecommerce", label: "E-commerce", category: "Business" },
  { id: "freelancing", label: "Freelancing", category: "Business" },
  { id: "finance", label: "Personal finance", category: "Business" },
  // Learning
  { id: "chemistry", label: "Chemistry", category: "Learning" },
  { id: "languages", label: "Languages", category: "Learning", children: ["english-speaking", "french"] },
  { id: "english-speaking", label: "Spoken English", category: "Learning" },
  { id: "french", label: "French", category: "Learning" },
  { id: "teaching", label: "Teaching", category: "Learning" },
  // Life
  { id: "fitness", label: "Fitness", category: "Life", children: ["running", "gym"] },
  { id: "running", label: "Running", category: "Life" },
  { id: "gym", label: "Gym & strength", category: "Life" },
  { id: "football", label: "Football", category: "Life" },
  { id: "travel", label: "Travel", category: "Life" },
  { id: "food", label: "Food & cooking", category: "Life" },
  { id: "movies", label: "Movies", category: "Life" },
  { id: "books", label: "Books", category: "Life" },
];

export const INTEREST_MAP = new Map(INTERESTS.map((i) => [i.id, i]));

export const POPULAR_INTEREST_IDS = [
  "youtube", "filmmaking", "ai", "coding", "design", "photography", "fitness",
  "startups", "gaming", "music", "writing", "entrepreneurship", "chemistry",
  "languages", "football", "travel", "movies", "art",
];

// ── Skill ontology (Value Graph) ──────────────────────────────────────────────
// Each skill maps to related interest ids so offer↔need matching is semantic,
// not just string equality.

export const SKILL_MAP: Record<string, string[]> = {
  "video-editing": ["youtube", "filmmaking", "editing", "horror", "movies"],
  "premiere-pro": ["youtube", "filmmaking", "editing"],
  "storytelling": ["writing", "youtube", "filmmaking", "screenwriting", "blogging"],
  "screenwriting": ["filmmaking", "writing", "horror", "movies"],
  "cinematography-skill": ["filmmaking", "cinematography", "photography", "horror"],
  "photography-skill": ["photography", "portrait", "street-photo", "travel", "filmmaking"],
  "thumbnail-design": ["youtube", "design", "branding", "art"],
  "ui-design-skill": ["design", "ui-design", "coding", "startups"],
  "graphic-design": ["design", "art", "branding", "thumbnail-design"],
  "web-development": ["coding", "web-dev", "ai", "startups"],
  "android-development": ["coding", "mobile-dev", "startups", "gaming"],
  "python-skill": ["coding", "ai", "python", "data"],
  "llm-apps": ["ai", "llms", "ai-agents", "coding"],
  "content-marketing-skill": ["marketing", "content-marketing", "youtube", "writing", "entrepreneurship"],
  "social-media-growth": ["youtube", "marketing", "instagram", "content-marketing"],
  "seo": ["marketing", "blogging", "content-marketing"],
  "business-strategy": ["startups", "entrepreneurship", "ecommerce", "finance"],
  "pitch-decks": ["startups", "entrepreneurship", "finance"],
  "english-speaking": ["languages", "english-speaking", "teaching"],
  "chemistry-skill": ["chemistry", "teaching"],
  "math-teaching": ["teaching", "chemistry"],
  "guitar-playing": ["music", "guitar"],
  "music-production-skill": ["music", "music-production", "youtube"],
  "singing": ["music", "guitar"],
  "fitness-coaching": ["fitness", "gym", "running"],
  "football-coaching": ["football", "fitness"],
  "yoga": ["fitness", "gym"],
  "cooking": ["food", "travel"],
  "public-speaking": ["teaching", "storytelling", "english-speaking"],
  "career-advice": ["startups", "entrepreneurship", "freelancing"],
  "logo-design": ["design", "branding", "art", "thumbnail-design"],
  "game-dev-skill": ["gaming", "game-dev", "coding"],
  "ecommerce-skill": ["ecommerce", "marketing", "startups"],
  "video-shooting": ["filmmaking", "youtube", "cinematography", "photography"],
};

export const SKILL_CATEGORIES = ["Creative", "Tech", "Business", "Academic", "Life"];

export const SKILLS: Skill[] = Object.keys(SKILL_MAP).map((id) => ({
  id,
  label: id.replace(/-skill$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  category: SKILL_CATEGORIES.find((c) => c === categoryFor(id)) ?? "Tech",
}));

function categoryFor(id: string): string {
  const creative = ["video-editing", "premiere-pro", "storytelling", "screenwriting", "cinematography-skill", "photography-skill", "thumbnail-design", "ui-design-skill", "graphic-design", "guitar-playing", "music-production-skill", "singing", "logo-design", "game-dev-skill", "video-shooting", "cooking"];
  const business = ["content-marketing-skill", "social-media-growth", "seo", "business-strategy", "pitch-decks", "career-advice", "ecommerce-skill"];
  const academic = ["english-speaking", "chemistry-tutoring", "math-teaching", "public-speaking"];
  const life = ["fitness-coaching", "football-coaching", "yoga"];
  if (creative.includes(id)) return "Creative";
  if (business.includes(id)) return "Business";
  if (academic.includes(id)) return "Academic";
  if (life.includes(id)) return "Life";
  return "Tech";
}

export const POPULAR_SKILL_IDS = [
  "video-editing", "premiere-pro", "storytelling", "screenwriting", "photography-skill",
  "thumbnail-design", "ui-design-skill", "web-development", "android-development",
  "python-skill", "llm-apps", "content-marketing-skill", "social-media-growth",
  "business-strategy", "english-speaking", "chemistry-tutoring", "guitar-playing",
  "fitness-coaching", "cinematography-skill", "graphic-design",
];

export function skillLabel(id: string): string {
  return SKILLS.find((s) => s.id === id)?.label
    ?? id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function interestLabel(id: string): string {
  return INTEREST_MAP.get(id)?.label
    ?? id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function interestCategory(id: string): string {
  return INTEREST_MAP.get(id)?.category ?? "Life";
}

/** Sub-interests that imply knowledge of a parent (horror → filmmaking). */
export function interestAncestors(id: string): string[] {
  const out: string[] = [];
  for (const node of INTERESTS) {
    if (node.children?.includes(id)) out.push(node.id);
  }
  return out;
}

export function relatedInterests(id: string): string[] {
  const node = INTEREST_MAP.get(id);
  const out = new Set<string>([id, ...(node?.children ?? []), ...interestAncestors(id)]);
  for (const skillId of SKILL_MAP[id] ?? []) {
    for (const linked of SKILL_MAP[skillId] ?? []) out.add(linked);
  }
  return [...out];
}

export const CITIES = ["Jaipur", "Delhi", "Mumbai", "Bengaluru", "Pune", "Remote"];

export const AVAILABILITY_LABELS: Record<string, string> = {
  mornings: "Mornings",
  evenings: "Evenings",
  weekends: "Weekends",
  "full-time": "Full time",
  flexible: "Flexible",
};
