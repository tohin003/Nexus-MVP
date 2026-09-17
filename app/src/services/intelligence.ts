import type { Intent, IntentInterpretation, IntentType, MatchReason, MatchResult, User } from "../domain/types";
import { CITIES, INTERESTS, interestLabel, skillLabel } from "../domain/ontology";

// Local, deterministic interpretation. No network, model key, or generated facts.
const unique = (items: string[]) => [...new Set(items.filter(Boolean))];
const normalized = (s: string) => s.toLowerCase().trim().replace(/[’‘]/g, "'").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
const slug = (s: string) => normalized(s).replace(/ /g, "-");
const clamp = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
const escapeRE = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type SkillRule = [string, RegExp];
const skillRules: SkillRule[] = [
  ["video-editing", /\b(?:video edit(?:ing|or)?s?|edit(?:ing)?(?: my| your| our| youtube)? videos?|editors?|editing)\b/gi],
  ["premiere-pro", /\bpremiere(?: pro)?\b/gi],
  ["storytelling", /\b(?:storytelling|story telling|content creation|content)\b/gi],
  ["screenwriting", /\b(?:screenwrit(?:ing|ers?)|screenplays?|scriptwrit(?:ing|ers?)|scripts?)\b/gi],
  ["cinematography-skill", /\b(?:cinematograph(?:y|ers?)|camera work|good with cameras)\b/gi],
  ["photography-skill", /\b(?:photograph(?:y|ers?)|portrait photography)\b/gi],
  ["thumbnail-design", /\bthumbnails?(?: design(?:ers?|ing)?)?\b/gi],
  ["ui-design-skill", /\b(?:ui(?:\/ux)?(?: design(?:ers?|ing)?)?|ux(?: design(?:ers?|ing)?)?|user interface)\b/gi],
  ["graphic-design", /\bgraphic design(?:ers?|ing)?\b/gi],
  ["android-development", /\b(?:android(?: app)?(?: develop(?:ment|ers?|ing))?|mobile (?:app|develop(?:ment|ers?)))\b/gi],
  ["web-development", /\b(?:web(?:site)? develop(?:ment|ers?|ing)|websites?|front ?end|react)\b/gi],
  ["development", /\b(?:develop(?:ment|ers?)|coding|programming|app development)\b/gi],
  ["python-skill", /\bpython\b/gi],
  ["llm-apps", /\b(?:llms?|ai apps?|ai agents?)\b/gi],
  ["content-marketing-skill", /\b(?:content marketing|marketing|marketers?)\b/gi],
  ["social-media-growth", /\b(?:social media(?: growth)?|youtube growth|grow(?:ing)? (?:my |your |a )?(?:youtube|channel))\b/gi],
  ["seo", /\b(?:seo|search engine optimi[sz]ation)\b/gi],
  ["business-strategy", /\b(?:business strategy|business advice)\b/gi],
  ["pitch-decks", /\bpitch decks?\b/gi],
  ["english-speaking", /\b(?:spoken english|english speaking|english)\b/gi],
  ["chemistry-skill", /\bchemistry(?: tutor(?:ing)?)?\b/gi],
  ["math-teaching", /\bmath(?:s|ematics)?(?: tutor(?:ing)?)?\b/gi],
  ["guitar-playing", /\bguitar(?:ist| playing)?s?\b/gi],
  ["music-production-skill", /\b(?:music produc(?:tion|ers?)|produc(?:e|ing) music|music mixing|beats?)\b/gi],
  ["singing", /\b(?:sing(?:ing|ers?)|vocalists?|vocals)\b/gi],
  ["fitness-coaching", /\b(?:fitness coach(?:ing|es)?|personal train(?:ing|ers?)|fitness|work(?:ing)? out|workouts?)\b/gi],
  ["football-coaching", /\bfootball coach(?:ing|es)?\b/gi],
  ["yoga", /\byoga\b/gi],
  ["cooking", /\b(?:cooking|chefs?)\b/gi],
  ["public-speaking", /\bpublic speaking\b/gi],
  ["career-advice", /\b(?:career(?: advice| guidance| mentor(?:ship)?)?|interview preparation)\b/gi],
  ["logo-design", /\blogo(?: design(?:ers?|ing)?)?s?\b/gi],
  ["game-dev-skill", /\bgame develop(?:ment|ers?)\b/gi],
  ["ecommerce-skill", /\be[ -]?commerce\b/gi],
  ["video-shooting", /\b(?:video shooting|shoot(?:ing)? videos?|videograph(?:y|ers?))\b/gi],
];

// A cue applies until the next cue or sentence boundary. This keeps "I can edit,
// but need marketing" separate, unlike a bag-of-keywords intent extractor.
const cuePattern = /\b(?:do not need|don't need|not looking for|no need for|don't want|do not want|not interested in|cannot|can't|don't know|do not know|not an?|need(?:s|ed)?|looking for|seeking|hiring|find(?:ing)?|learn(?:ing)?|improve|practice|someone who|someone to|somebody|can help me|help me|want someone|can offer|can help(?: you| others)?(?: with)?|i offer|offering|i know|i can|we can|i edit|i write|i shoot|i produce|i play|good at|skilled (?:at|in)|experienced (?:at|in)|i am an?|i'm an?|teach(?:ing)?|mentor(?:ing)? others)\b/gi;
const offerCue = /^(?:can offer|can help|i offer|offering|i know|i can|we can|i edit|i write|i shoot|i produce|i play|good at|skilled|experienced|i am|i'm|teach|mentor)/;
const negativeCue = /^(?:do not|don't|not |no need|cannot|can't)/;

function extractSkills(text: string): { needed: string[]; offered: string[] } {
  const needed: string[] = [], offered: string[] = [];
  for (const part of text.split(/[.!?;\n]+/)) {
    const clause = normalized(part);
    const cues = [...clause.matchAll(cuePattern)];
    const hits = skillRules.flatMap(([id, re]) => [...clause.matchAll(re)].map((m) => ({ id, index: m.index!, end: m.index! + m[0].length })));
    for (const hit of hits) {
      // A specific Android/web/game/Python role must not also imply generic development.
      if (hit.id === "development" && hits.some((h) => h.id !== hit.id && /development|python-skill|game-dev-skill/.test(h.id) && h.index <= hit.index && h.end >= hit.end)) continue;
      // "content marketing" is one skill, not an unsupported storytelling offer.
      if (hit.id === "storytelling" && hits.some((h) => h.id === "content-marketing-skill" && h.index === hit.index)) continue;
      const preceding = cues.filter((c) => c.index! <= hit.index);
      let cue = preceding.at(-1)?.[0] ?? "";
      // Descriptions inherit the closest governing cue: "find someone good at"
      // is a need, whereas "need marketing, but I'm good at editing" is an offer.
      if (/^(?:good at|skilled|experienced)/.test(cue)) {
        const descriptor = preceding.at(-1)!;
        const selfDescription = /\b(?:i am|i'm|we are|we're)\s*$/.test(clause.slice(0, descriptor.index));
        const governing = preceding.slice(0, -1).filter((c) => !/^(?:good at|skilled|experienced)/.test(c[0])).at(-1)?.[0];
        if (!selfDescription && governing) {
          cue = negativeCue.test(governing) ? governing
            : /^(?:someone|somebody|looking for|need|find|seeking|hiring|want someone|help me|can help me)/.test(governing) ? "need" : cue;
        }
      }
      if (!cue || negativeCue.test(cue)) continue;
      (offerCue.test(cue) && cue !== "can help me" ? offered : needed).push(hit.id);
    }
  }
  return { needed: unique(needed), offered: unique(offered) };
}

const domainRules: [string, RegExp][] = [
  ["filmmaking", /\b(?:film(?:making|maker|s)?|short films?|horror|cinematograph\w*|screenwrit\w*)\b/],
  ["mobile-dev", /\b(?:android|mobile app)\b/],
  ["music", /\b(?:music|guitar\w*|singing|singer|band|vocals|jam|beats)\b/],
  ["fitness", /\b(?:fitness|work(?:ing)? out|workout|gym|running|yoga|exercise)\b/],
  ["youtube", /\b(?:youtube|video edit\w*|editor|editing|thumbnails?)\b/],
  ["photography", /\bphotograph\w*\b/],
  ["design", /\b(?:design\w*|ui|ux|branding|logos?)\b/],
  ["ai", /\b(?:ai|llms?|artificial intelligence)\b/],
  ["coding", /\b(?:app|coding|programming|develop\w*|python|website|react)\b/],
  ["marketing", /\b(?:marketing|seo|social media)\b/],
  ["chemistry", /\bchemistry\b/],
  ["languages", /\b(?:english|french|language\w*)\b/],
  ["teaching", /\b(?:education|teaching|tutor\w*)\b/],
  ["startups", /\b(?:startup\w*|founder\w*|business|entrepreneur\w*)\b/],
  ["writing", /\b(?:writing|writer|blogging|storytelling)\b/],
  ["football", /\bfootball\b/], ["gaming", /\b(?:gaming|games?|esports)\b/],
  ["travel", /\b(?:travel|explore)\b/], ["food", /\b(?:cooking|food)\b/],
  ["movies", /\b(?:movies?|cinema)\b/], ["books", /\bbooks?\b/],
];

/** Preserve the author's wording in goal; unknown text stays general, not invented. */
export function interpretIntent(text: string, user?: User): IntentInterpretation {
  const goal = text.trim().replace(/\s+/g, " ");
  const lower = normalized(text);
  const { needed, offered } = extractSkills(text);
  const domain = domainRules.find(([, re]) => re.test(lower))?.[0] ?? "general";
  let intentType: IntentType = "meet-people";
  if (/\b(?:teach|teaching|mentor others|offer mentorship)\b/.test(lower)) intentType = "teach";
  else if (/\b(?:learn|learning|study|practice)\b/.test(lower)) intentType = "learn";
  else if (/\b(?:advice|feedback|guidance|mentor|mentorship)\b/.test(lower)) intentType = "get-advice";
  else if (/\b(?:looking for work|find work|paid work|freelance work|job|opportunities|clients)\b/.test(lower)) intentType = "find-opportunities";
  else if (/\b(?:build|building|develop|launch)\b/.test(lower)) intentType = "build";
  else if (/\b(?:challenge)\b/.test(lower)) intentType = "challenge";
  else if (/\b(?:work(?:ing)? out|fitness|improve myself|exercise|gym)\b/.test(lower)) intentType = "improve-self";
  else if (/\b(?:need|looking for|find|somebody|someone|collaborat\w*|hiring)\b/.test(lower)) intentType = "find-collaborator";
  else if (/\b(?:create|creating|make|making|start)\b/.test(lower)) intentType = "create";
  if (/\b(?:friends?|meet people|hang out)\b/.test(lower) && !needed.length) intentType = "meet-people";
  let relationship: IntentInterpretation["relationship"] = "collaboration";
  if (/\b(?:mentor\w*|teach\w*|learn\w*)\b/.test(lower)) relationship = "mentorship";
  else if (intentType === "get-advice") relationship = "advice";
  else if (/\b(?:cofounder|co founder|team(?:mate)?s?)\b/.test(lower)) relationship = "team";
  else if (/\b(?:friends?|hang out)\b/.test(lower) || domain === "general") relationship = "friendship";
  else if (/\b(?:together|buddy|partner|meetup|play|work(?:ing)? out|running|jam)\b/.test(lower)) relationship = "activity";
  const explicitCity = CITIES.filter((c) => c !== "Remote").find((city) => new RegExp(`\\b${escapeRE(city)}\\b`, "i").test(goal));
  const localOnly = /\b(?:in person|local only|nearby|near me|around me|no remote|not remote)\b/.test(lower);
  const location = explicitCity ?? (localOnly && user?.privacy.showCity && user.privacy.showInLocalSuggestions ? user.city : "anywhere");
  const remoteAllowed = !/\b(?:in person only|local only|no remote|not remote|cannot work remotely|can't work remotely)\b/.test(lower)
    && (/\b(?:remote|remotely|online|anywhere)\b/.test(lower) || (!explicitCity && !localOnly));
  const time = lower.match(/\b(?:weekends?|evenings?|mornings?|tonight|today|tomorrow|long term|full time)\b/)?.[0]?.replace(/^(weekend|evening|morning)s$/, "$1s") ?? null;
  const experience = /\b(?:beginner|first time|my first|new to)\b/.test(lower) ? "beginner"
    : /\bintermediate\b/.test(lower) ? "intermediate"
    : /\b(?:experienced|expert|advanced)\b/.test(lower) ? "experienced" : "any";
  const compensation = /\b(?:unpaid|free|volunteer|no pay|not paid)\b/.test(lower) ? "free"
    : /\b(?:paid|paying|budget|payment)\b/.test(lower) ? "paid" : "unspecified";
  const keywords = unique((lower.match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 2 && !new Set(["the", "and", "for", "with", "want", "someone", "who", "can", "looking", "need", "but", "that", "this", "have"]).has(w))).slice(0, 24);
  return { intentType, domain, goal, skillsNeeded: needed, skillsOffered: offered, relationship, location, remoteAllowed, experience, compensation, time, genre: /\bhorror\b/.test(lower) ? "horror" : null, keywords };
}

const aliases: Record<string, string> = {
  editing: "video-editing", editor: "video-editing", "video-editor": "video-editing",
  cinematography: "cinematography-skill", cinematographer: "cinematography-skill",
  photography: "photography-skill", photographer: "photography-skill",
  writing: "storytelling", writer: "storytelling", content: "storytelling",
  marketing: "content-marketing-skill", marketer: "content-marketing-skill", "content-marketing": "content-marketing-skill",
  developer: "development", developers: "development", coding: "development", programming: "development", "app-development": "development",
  android: "android-development", "android-developer": "android-development", "mobile-development": "android-development", "mobile-dev": "android-development",
  "web-dev": "web-development", "web-developer": "web-development",
  python: "python-skill", "ui-design": "ui-design-skill", "ui-designer": "ui-design-skill",
  guitar: "guitar-playing", guitarist: "guitar-playing", "music-production": "music-production-skill",
  fitness: "fitness-coaching", "fitness-coach": "fitness-coaching", chemistry: "chemistry-skill", "chemistry-tutoring": "chemistry-skill",
};
const canonicalSkill = (s: string) => aliases[slug(s)] ?? slug(s);
const canonicalInterest = (s: string) => ({ production: "music-production", agents: "ai-agents", street: "street-photo", android: "mobile-dev", development: "coding", education: "teaching" }[slug(s)] ?? slug(s));

/** Directional subsumption: a web developer can fill a general development need,
 * but a general "developer" claim is not evidence of Android expertise. Shared
 * domain alone never implies a skill (a singer isn't automatically a producer). */
function fulfills(offer: string, need: string): boolean {
  const a = canonicalSkill(offer), b = canonicalSkill(need);
  if (a === b) return true;
  if (b === "development") return ["web-development", "android-development", "python-skill", "game-dev-skill", "llm-apps"].includes(a);
  if (b === "video-editing") return a === "premiere-pro";
  if (b === "content-marketing-skill") return ["seo", "social-media-growth"].includes(a);
  return false;
}
function coverage(offers: string[], needs: string[]): number {
  const ns = unique(needs.map(canonicalSkill));
  return ns.length ? ns.filter((need) => offers.some((offer) => fulfills(offer, need))).length / ns.length : 0;
}
function matchingNeeds(offers: string[], needs: string[]) {
  return unique(needs.map(canonicalSkill)).filter((need) => offers.some((offer) => fulfills(offer, need)));
}
function ancestors(id: string): string[] {
  const visited = new Set<string>([canonicalInterest(id)]);
  for (const child of visited) {
    for (const node of INTERESTS) if (node.children?.some((c) => canonicalInterest(c) === child)) visited.add(node.id);
  }
  return [...visited];
}
function affinity(a: string, b: string): number {
  const aa = canonicalInterest(a), bb = canonicalInterest(b);
  if (!aa || !bb || aa === "general" || bb === "general") return 0;
  if (aa === bb) return 1;
  const as = ancestors(aa), bs = ancestors(bb);
  if (as.includes(bb) || bs.includes(aa)) return 0.75;
  return as.some((id) => bs.includes(id)) ? 0.4 : 0;
}
function interestScore(a: string[], b: string[]) {
  const aa = unique(a.map(canonicalInterest)), bb = unique(b.map(canonicalInterest));
  if (!aa.length || !bb.length) return 0;
  const direction = (x: string[], y: string[]) => x.reduce((sum, id) => sum + Math.max(0, ...y.map((other) => affinity(id, other))), 0) / x.length;
  return (direction(aa, bb) + direction(bb, aa)) / 2;
}
function activeIntents(user: User, intents: Intent[], viewerId: string, now: number) {
  return intents.filter((i) => i.userId === user.id && i.status === "active" && (i.expiresAt === null || i.expiresAt > now) && (i.visibility === "public" || user.id === viewerId));
}
function valueProfile(user: User, intents: Intent[]) {
  return {
    offers: unique([...user.skills, ...intents.flatMap((i) => i.interpretation.skillsOffered)].map(canonicalSkill)),
    needs: unique([...user.needs, ...intents.flatMap((i) => i.interpretation.skillsNeeded)].map(canonicalSkill)),
  };
}
function intentCompatibility(a: IntentInterpretation, b: IntentInterpretation): number {
  const domain = affinity(a.domain, b.domain);
  const value = Math.max(coverage(a.skillsOffered, b.skillsNeeded), coverage(b.skillsOffered, a.skillsNeeded));
  if (!domain && !value) return 0;
  const teaching = (a.intentType === "learn" && b.intentType === "teach") || (b.intentType === "learn" && a.intentType === "teach");
  const collaborative = ["build", "create", "find-collaborator"];
  const roles = teaching || (collaborative.includes(a.intentType) && collaborative.includes(b.intentType)) || (a.relationship === b.relationship && ["activity", "friendship"].includes(a.relationship));
  return clamp(domain * 0.4 + value * 0.4 + (roles ? 0.2 : 0));
}
function isSuspended(user: User) { return "suspended" in user && user.suspended === true; }
function cityVisible(user: User) { return user.privacy.showCity && user.privacy.showInLocalSuggestions; }
function publicUser(user: User): User { return cityVisible(user) ? user : { ...user, city: "" }; }
function blankMatch(other: User): MatchResult {
  return { user: publicUser(other), score: 0, fit: "POSSIBLE FIT", reasons: [], bidirectional: { canHelpThem: [], theyCanHelpMe: [] }, sharedInterests: [], intentSummary: "" };
}

/** Internal weighted rank only: 30 intent + 25 two-way value + 15 interests +
 * 10 location + 10 availability + 10 trust. Missing evidence earns zero, never
 * renormalizes the remaining weights. The returned score is not UI copy. */
export function matchPerson(me: User, other: User, intents: Intent[]): MatchResult {
  if (me.id === other.id || isSuspended(me) || isSuspended(other) || !other.privacy.discoverable) return blankMatch(other);
  const now = Date.now();
  const mine = activeIntents(me, intents, me.id, now), theirs = activeIntents(other, intents, me.id, now);
  const a = valueProfile(me, mine), b = valueProfile(other, theirs);
  const canHelpThem = matchingNeeds(a.offers, b.needs), theyCanHelpMe = matchingNeeds(b.offers, a.needs);
  const value = (coverage(a.offers, b.needs) + coverage(b.offers, a.needs)) / 2;
  const sharedInterests = unique(me.interests.flatMap(ancestors)).filter((id) => other.interests.flatMap(ancestors).includes(id));
  const interest = interestScore(me.interests, other.interests);
  const intentPairs = mine.flatMap((i) => theirs.map((j) => intentCompatibility(i.interpretation, j.interpretation)));
  // An explicit request can match profile evidence even when the helper has no active intent.
  const intentToProfile = (own: Intent[], target: User, offers: string[]) => own.map((i) => {
    const v = coverage(offers, i.interpretation.skillsNeeded);
    const d = Math.max(0, ...target.interests.map((id) => affinity(i.interpretation.domain, id)));
    return v * 0.7 + d * 0.3;
  });
  const intent = Math.max(0, ...intentPairs, ...intentToProfile(mine, other, b.offers), ...intentToProfile(theirs, me, a.offers));
  const sameCity = cityVisible(me) && cityVisible(other) && !!me.city.trim() && normalized(me.city) !== "remote" && normalized(me.city) === normalized(other.city);
  const availability = me.availability === other.availability ? 1 : [me.availability, other.availability].includes("flexible") ? 0.8 : 0;
  const trust = (clamp(other.reputation.helpfulness / 100) + clamp(other.reputation.reliability / 100)) / 2;
  const score = Math.round(clamp(intent * 0.30 + value * 0.25 + interest * 0.15 + (sameCity ? 1 : 0) * 0.10 + availability * 0.10 + trust * 0.10) * 10000) / 100;
  const reasons: MatchReason[] = [];
  if (theyCanHelpMe.length) reasons.push({ icon: "sparkles", text: `${other.name} offers skills you're looking for: ${theyCanHelpMe.map(skillLabel).join(", ")}.` });
  if (canHelpThem.length) reasons.push({ icon: "handshake", text: `You offer skills ${other.name} is looking for: ${canHelpThem.map(skillLabel).join(", ")}.` });
  if (sharedInterests.length) reasons.push({ icon: "layers", text: `Shared interests: ${sharedInterests.slice(0, 3).map(interestLabel).join(", ")}.` });
  const alignedMine = mine.find((i) => coverage(b.offers, i.interpretation.skillsNeeded) > 0 || other.interests.some((id) => affinity(i.interpretation.domain, id) > 0));
  const alignedTheirs = theirs.find((i) => coverage(a.offers, i.interpretation.skillsNeeded) > 0 || me.interests.some((id) => affinity(i.interpretation.domain, id) > 0));
  const intentSummary = alignedMine ? `Their profile connects with your active ${interestLabel(alignedMine.interpretation.domain)} intent.`
    : alignedTheirs ? `Your profile connects with their active ${interestLabel(alignedTheirs.interpretation.domain)} intent.` : "";
  if (intentSummary) reasons.push({ icon: "target", text: intentSummary });
  if (sameCity) reasons.push({ icon: "map-pin", text: `You're both in ${other.city}.` });
  if (availability === 1) reasons.push({ icon: "clock", text: `You both list ${me.availability.replace(/-/g, " ")} availability.` });
  else if (availability > 0) reasons.push({ icon: "clock", text: `${me.availability === "flexible" ? "You list" : `${other.name} lists`} flexible availability.` });
  if (other.trustBadges.includes("identity")) reasons.push({ icon: "shield-check", text: `${other.name} has an identity verification badge.` });
  return { user: publicUser(other), score, fit: score >= 75 ? "GREAT FIT" : score >= 50 ? "STRONG FIT" : "POSSIBLE FIT", reasons, bidirectional: { canHelpThem, theyCanHelpMe }, sharedInterests, intentSummary };
}

export function matchPeople(me: User, users: User[], intents: Intent[], excludedIds: string[] = []): MatchResult[] {
  if (isSuspended(me)) return [];
  const excluded = new Set([me.id, ...excludedIds]);
  const seen = new Set<string>();
  const now = Date.now();
  const activity = (id: string) => Math.max(0, ...intents.filter((i) => i.userId === id && i.visibility === "public" && i.status === "active" && (i.expiresAt === null || i.expiresAt > now)).map((i) => Number.isFinite(i.createdAt) ? i.createdAt : 0));
  return users.filter((u) => {
    if (excluded.has(u.id) || seen.has(u.id) || isSuspended(u) || !u.privacy.discoverable) return false;
    seen.add(u.id); return true;
  }).map((u) => matchPerson(me, u, intents)).sort((a, b) => b.score - a.score || activity(b.user.id) - activity(a.user.id) || a.user.id.localeCompare(b.user.id));
}

/** Compose once at conversation creation; persistence/idempotency belongs to the
 * conversation service (introMessageId). No ongoing bot participation or claims
 * that either person has already agreed to collaborate. */
export function introduction(a: User, b: User, context: string[]): string {
  const hiddenCities = [a, b].filter((u) => !cityVisible(u)).map((u) => normalized(u.city)).filter(Boolean);
  const safeContext = unique(context.map((line) => line.trim()).filter((line) => line && !hiddenCities.some((city) => normalized(line).includes(city)))).slice(0, 2);
  // Match explanations address the first user as "you"; make that perspective explicit.
  const evidence = safeContext.length ? `Why this connection was suggested to ${a.name}: ${safeContext.join(" ")}` : (() => {
    const valuesA = valueProfile(a, []), valuesB = valueProfile(b, []);
    const help = matchingNeeds(valuesB.offers, valuesA.needs);
    if (help.length) return `${a.name} is looking for ${help.map(skillLabel).join(", ")}; ${b.name} lists matching skills.`;
    const common = unique(a.interests.flatMap(ancestors)).filter((id) => b.interests.flatMap(ancestors).includes(id));
    return common.length ? `You share an interest in ${common.slice(0, 2).map(interestLabel).join(" and ")}.` : "Here's a space to get to know each other, with no pressure to commit.";
  })();
  return `${a.name}, meet ${b.name} 👋\n\n${evidence}\n\nA good place to start: what are you each hoping to explore or work on right now? I'll leave the conversation to you two.`;
}
