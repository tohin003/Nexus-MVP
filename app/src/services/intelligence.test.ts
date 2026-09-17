import { describe, expect, it } from "vitest";
import type { Intent, User } from "../domain/types";
import { interpretIntent, introduction, matchPeople, matchPerson } from "./intelligence";

function user(id: string, patch: Partial<User> = {}): User {
  return {
    id, name: id === "me" ? "Prince" : "Aarav", username: id, roles: ["creator"], headline: "", avatar: "", accentHue: 200,
    city: "", bio: "", currently: "", interests: [], skills: [], needs: [], availability: "mornings", experience: "beginner",
    reputation: { helpfulness: 0, reliability: 0, meaningfulConnections: 0, peopleHelped: 0, projectsCompleted: 0, collaborations: 0 },
    trustBadges: [], privacy: { discoverable: true, whoCanMessage: "anyone", showCity: true, showInLocalSuggestions: true }, joinedAt: 1,
    ...patch,
  };
}
function intent(userId: string, text: string, patch: Partial<Intent> = {}): Intent {
  return { id: `${userId}-intent`, userId, originalText: text, interpretation: interpretIntent(text), title: text, status: "active", createdAt: 10, expiresAt: null, visibility: "public", interestedCount: 0, ...patch };
}

describe("interpretIntent: deterministic local extraction", () => {
  it("preserves wording and understands the filmmaking/editor sample", () => {
    const text = "I want to start a YouTube channel about filmmaking but need someone who's good at editing.";
    const result = interpretIntent(text);
    expect(result.goal).toBe(text);
    expect(result.domain).toBe("filmmaking");
    expect(result.skillsNeeded).toContain("video-editing");
    expect(result.skillsOffered).toEqual([]);
    expect(result.relationship).toBe("collaboration");
    expect(interpretIntent(text)).toEqual(result);
  });
  it.each(["good at", "skilled at", "skilled in", "experienced at", "experienced in"])("keeps find someone %s editing as a need in the onboarding phrase", (description) => {
    const result = interpretIntent(`I want to start a filmmaking YouTube channel and find someone ${description} video editing in Jaipur. I can offer storytelling.`);
    expect(result.skillsNeeded).toEqual(["video-editing"]);
    expect(result.skillsOffered).toEqual(["storytelling"]);
    expect(result.location).toBe("Jaipur");
  });
  it("keeps descriptive skills governed by their nearest request or self declaration", () => {
    expect(interpretIntent("Find someone good at editing but I can offer storytelling")).toMatchObject({ skillsNeeded: ["video-editing"], skillsOffered: ["storytelling"] });
    expect(interpretIntent("Need marketing but I'm good at video editing")).toMatchObject({ skillsNeeded: ["content-marketing-skill"], skillsOffered: ["video-editing"] });
    expect(interpretIntent("I'm not looking for someone experienced in video editing").skillsNeeded).toEqual([]);
    expect(interpretIntent("I'm not looking for someone experienced in video editing").skillsOffered).toEqual([]);
  });
  it("extracts city, genre, time and request from the horror short sample", () => {
    const result = interpretIntent("I want somebody around Jaipur who knows video editing and wants to make horror shorts this weekend.");
    expect(result).toMatchObject({ domain: "filmmaking", intentType: "find-collaborator", location: "Jaipur", genre: "horror", time: "weekend", remoteAllowed: false });
    expect(result.skillsNeeded).toEqual(["video-editing"]);
  });
  it("does not conflate offers and needs in the Android education app sample", () => {
    const result = interpretIntent("Looking for an Android developer to build an education app. I can offer content + marketing. Remote, paid, evenings.");
    expect(result).toMatchObject({ domain: "mobile-dev", intentType: "build", location: "anywhere", remoteAllowed: true, compensation: "paid", time: "evenings" });
    expect(result.skillsNeeded).toEqual(["android-development"]);
    expect(result.skillsOffered).toEqual(["storytelling", "content-marketing-skill"]);
    expect(result.skillsNeeded).not.toContain("content-marketing-skill");
  });
  it("recognizes direct Android help requests without assuming experience", () => {
    expect(interpretIntent("Someone who can help me build an Android app.")).toMatchObject({ skillsNeeded: ["android-development"], experience: "any", relationship: "collaboration" });
  });
  it("understands an editor offering skills while seeking work", () => {
    const result = interpretIntent("I'm a video editor. I can offer Premiere Pro; looking for paid work.");
    expect(result.intentType).toBe("find-opportunities");
    expect(result.skillsOffered).toEqual(["video-editing", "premiere-pro"]);
    expect(result.skillsNeeded).toEqual([]);
  });
  it("recognizes declarative video-editing offers without treating document editing as video", () => {
    expect(interpretIntent("I edit YouTube videos.").skillsOffered).toEqual(["video-editing"]);
    expect(interpretIntent("I edit documents.").skillsOffered).not.toContain("video-editing");
  });
  it("keeps music learning and music offers distinct", () => {
    expect(interpretIntent("I want to learn guitar together")).toMatchObject({ domain: "music", intentType: "learn", skillsNeeded: ["guitar-playing"], skillsOffered: [] });
    expect(interpretIntent("I can teach guitar but need a singer for our band")).toMatchObject({ domain: "music", skillsOffered: ["guitar-playing"], skillsNeeded: ["singing"] });
  });
  it("understands fitness and mentorship without inventing skills", () => {
    expect(interpretIntent("Want to start working out consistently with a buddy this weekend")).toMatchObject({ domain: "fitness", intentType: "improve-self", relationship: "activity", skillsOffered: [] });
    expect(interpretIntent("Looking for a mentor to learn Python online for free")).toMatchObject({ domain: "coding", intentType: "learn", relationship: "mentorship", skillsNeeded: ["python-skill"], remoteAllowed: true, compensation: "free" });
  });
  it("handles negation and mixed clauses conservatively", () => {
    const result = interpretIntent("I don't need an editor; I can offer marketing but need web development. Not paid. No remote.");
    expect(result.skillsNeeded).toEqual(["web-development"]);
    expect(result.skillsOffered).toEqual(["content-marketing-skill"]);
    expect(result).toMatchObject({ compensation: "free", remoteAllowed: false });
  });
  it("uses a conservative fallback rather than guessing from the user's profile", () => {
    const me = user("me", { city: "Jaipur", interests: ["filmmaking"], skills: ["video-editing"] });
    expect(interpretIntent("  collect rare meteorites  ", me)).toMatchObject({ goal: "collect rare meteorites", domain: "general", skillsNeeded: [], skillsOffered: [], location: "anywhere", experience: "any", compensation: "unspecified" });
    expect(interpretIntent("   ").goal).toBe("");
    expect(interpretIntent("chair repair").domain).not.toBe("ai");
  });
  it("only uses a profile city for explicit local requests with opt-in", () => {
    const me = user("me", { city: "Jaipur" });
    expect(interpretIntent("Need a photographer near me", me).location).toBe("Jaipur");
    expect(interpretIntent("Need a photographer near me", { ...me, privacy: { ...me.privacy, showCity: false } }).location).toBe("anywhere");
    expect(interpretIntent("Need a photographer", me).location).toBe("anywhere");
  });
});

describe("matchPerson / matchPeople", () => {
  it("ranks complementarity above identical skills and supports marketing/development aliases", () => {
    const me = user("me", { skills: ["Marketing"], needs: ["Development"], interests: ["startups"] });
    const complement = user("b", { skills: ["android-development"], needs: ["content-marketing"], interests: ["startups"] });
    const twin = user("c", { skills: ["Marketing"], needs: ["Development"], interests: ["startups"] });
    const matches = matchPeople(me, [twin, complement], []);
    expect(matches[0].user.id).toBe("b");
    expect(matches[0].bidirectional).toEqual({ canHelpThem: ["content-marketing-skill"], theyCanHelpMe: ["development"] });
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });
  it("uses exactly 25 skill, 15 interest, 10 location, 10 availability and 10 trust points", () => {
    const me = user("me");
    const base = user("b", { availability: "evenings" });
    expect(matchPerson(me, base, []).score).toBe(0);
    expect(matchPerson({ ...me, skills: ["marketing"], needs: ["development"] }, { ...base, skills: ["development"], needs: ["marketing"] }, []).score).toBe(25);
    expect(matchPerson({ ...me, interests: ["music"] }, { ...base, interests: ["music"] }, []).score).toBe(15);
    expect(matchPerson({ ...me, city: "Jaipur" }, { ...base, city: "jaipur" }, []).score).toBe(10);
    expect(matchPerson(me, { ...base, availability: "mornings" }, []).score).toBe(10);
    expect(matchPerson(me, { ...base, reputation: { ...base.reputation, helpfulness: 100, reliability: 100 } }, []).score).toBe(10);
  });
  it("has exactly 30 intent points and can reach 100 without exceeding it", () => {
    const me = user("me", { city: "Jaipur", interests: ["coding"], skills: ["marketing"], needs: ["development"] });
    const other = user("b", { city: "Jaipur", interests: ["coding"], skills: ["development"], needs: ["marketing"], reputation: { ...me.reputation, helpfulness: 100, reliability: 100 } });
    const intents = [intent("me", "Build an app. Need development. I can offer marketing."), intent("b", "Build an app. Need marketing. I can offer development.")];
    expect(matchPerson(me, other, []).score).toBe(70);
    expect(matchPerson(me, other, intents).score).toBe(100);
    expect(matchPerson(me, other, intents).fit).toBe("GREAT FIT");
  });
  it("normalizes duplicate entries and clamps malformed reputation", () => {
    const me = user("me", { skills: ["marketing", "marketing"], needs: ["development", "development"] });
    const other = user("b", { skills: ["development", "development"], needs: ["marketing", "marketing"], reputation: { ...me.reputation, helpfulness: Infinity, reliability: -100 } });
    expect(matchPerson(me, other, []).score).toBe(35);
    expect(matchPerson(me, other, []).bidirectional.canHelpThem).toEqual(["content-marketing-skill"]);
    for (const helpfulness of [-100, 0, 50, 100, 1e9, NaN]) {
      const score = matchPerson(me, { ...other, reputation: { ...other.reputation, helpfulness } }, []).score;
      expect(Number.isFinite(score)).toBe(true); expect(score).toBeGreaterThanOrEqual(0); expect(score).toBeLessThanOrEqual(100);
    }
  });
  it("uses hierarchical interests, including ontology child aliases", () => {
    const me = user("me", { interests: ["filmmaking"] });
    const other = user("b", { interests: ["horror"] });
    expect(matchPerson(me, other, []).sharedInterests).toContain("filmmaking");
    expect(matchPerson(user("me", { interests: ["music"] }), user("b", { interests: ["music-production"] }), []).sharedInterests).toContain("music");
    expect(matchPerson(user("me", { interests: ["ai"] }), user("b", { interests: ["ai-agents"] }), []).sharedInterests).toContain("ai");
  });
  it("never equates neighboring skills just because they share a domain", () => {
    const result = matchPerson(user("me", { needs: ["music-production-skill", "android-development"] }), user("b", { skills: ["singing", "web-development", "development"] }), []);
    expect(result.bidirectional.theyCanHelpMe).toEqual([]);
    expect(result.reasons.some((r) => r.text.includes("offers skills"))).toBe(false);
  });
  it("matches explicit active intent needs against profile offers", () => {
    const me = user("me");
    const other = user("b", { skills: ["premiere-pro"] });
    const result = matchPerson(me, other, [intent("me", "Need an editor for a horror short film")]);
    expect(result.bidirectional.theyCanHelpMe).toEqual(["video-editing"]);
    expect(result.intentSummary).toContain("active Filmmaking intent");
  });
  it("explains only evidence, not collaboration promises or invented availability", () => {
    const me = user("me", { needs: ["video-editing"], availability: "weekends" });
    const other = user("b", { skills: ["video-editing"], availability: "evenings" });
    const result = matchPerson(me, other, []);
    expect(result.reasons).toEqual([{ icon: "sparkles", text: "Aarav offers skills you're looking for: Video Editing." }]);
    expect(result.intentSummary).toBe("");
    expect(JSON.stringify(result.reasons)).not.toMatch(/%|verified|collaborat|nearby|both available/);
  });
  it("filters self, exclusions, non-discoverable users and duplicates", () => {
    const me = user("me"), b = user("b"), c = user("c"), hidden = user("h");
    hidden.privacy.discoverable = false;
    expect(matchPeople(me, [me, b, b, c, hidden], [], ["c"]).map((m) => m.user.id)).toEqual(["b"]);
    expect(matchPerson(me, hidden, []).score).toBe(0);
    expect(matchPerson(me, me, []).reasons).toEqual([]);
  });
  it("excludes suspended users in both matching entry points", () => {
    const me = user("me"), other = { ...user("b"), suspended: true };
    expect(matchPeople(me, [other], [])).toEqual([]);
    expect(matchPerson(me, other, []).score).toBe(0);
    expect(matchPerson(me, other, []).reasons).toEqual([]);
    expect(matchPeople({ ...me, ...{ suspended: true } }, [user("b")], [])).toEqual([]);
  });
  it.each(["showCity", "showInLocalSuggestions"] as const)("respects %s optout without scoring or leaking city", (flag) => {
    const me = user("me", { city: "Jaipur" });
    const other = user("b", { city: "Jaipur" });
    other.privacy[flag] = false;
    const result = matchPerson(me, other, []);
    expect(result.score).toBe(10); // availability only
    expect(result.user.city).toBe("");
    expect(JSON.stringify(result.reasons)).not.toContain("Jaipur");
    expect(other.city).toBe("Jaipur"); // no input mutation
    expect(matchPerson({ ...me, privacy: { ...me.privacy, [flag]: false } }, user("c", { city: "Jaipur" }), []).score).toBe(10);
  });
  it("does not use private, circle-only, expired or inactive peer intents", () => {
    const me = user("me", { skills: ["marketing"] }), other = user("b");
    const hidden = [intent("b", "Need marketing", { visibility: "private" }), intent("b", "Need marketing", { visibility: "circles" }), intent("b", "Need marketing", { expiresAt: 1 }), intent("b", "Need marketing", { status: "completed" })];
    expect(matchPerson(me, other, hidden)).toEqual(matchPerson(me, other, []));
  });
  it("uses public activity only to break ties and is stable otherwise", () => {
    const me = user("me"), a = user("a"), b = user("b");
    expect(matchPeople(me, [b, a], []).map((m) => m.user.id)).toEqual(["a", "b"]);
    expect(matchPeople(me, [a, b], [intent("b", "Collect meteorites", { createdAt: 20 })]).map((m) => m.user.id)).toEqual(["b", "a"]);
    expect(matchPeople(me, [a, b], [intent("b", "Collect meteorites", { visibility: "private", createdAt: 20 })]).map((m) => m.user.id)).toEqual(["a", "b"]);
  });
});

describe("introduction", () => {
  it("composes one handoff message from real context, not an ongoing assistant", () => {
    const a = user("me"), b = user("b");
    const text = introduction(a, b, ["You offer skills Aarav is looking for: Marketing."]);
    expect(text).toContain("Prince, meet Aarav 👋");
    expect(text).toContain("suggested to Prince");
    expect(text).toContain("I'll leave the conversation to you two");
    expect(text).not.toMatch(/agreed|perfect match|%/);
    expect(introduction(a, b, [])).toBe(introduction(a, b, []));
  });
  it("falls back to evidenced skills, then interests, then a neutral opener", () => {
    expect(introduction(user("me", { needs: ["video-editing"] }), user("b", { skills: ["premiere-pro"] }), [])).toContain("lists matching skills");
    expect(introduction(user("me", { interests: ["music"] }), user("b", { interests: ["guitar"] }), [])).toContain("share an interest in Music");
    const fallback = introduction(user("me"), user("b"), ["", "  "]);
    expect(fallback).toContain("no pressure to commit");
    expect(fallback).not.toMatch(/both love|both want|collaborators|undefined/);
  });
  it("drops stale context that would reveal a now-hidden city", () => {
    const other = user("b", { city: "Jaipur" }); other.privacy.showCity = false;
    expect(introduction(user("me"), other, ["You're both in Jaipur."])).not.toContain("Jaipur");
  });
});
