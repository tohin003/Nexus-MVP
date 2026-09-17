import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDemo } from '../repo/db';
import { auth, completeOnboarding, intents, profile, validateUsername } from './repo';

beforeEach(async () => { await resetDemo(); });

describe('shared local username validation', () => {
  it('normalizes whitespace and one leading @ before enforcing length', () => {
    expect(validateUsername('  @Some.Handle-1_  ')).toBe('Some.Handle-1_');
    expect(validateUsername(`@${'x'.repeat(40)}`)).toBe('x'.repeat(40));
    expect(() => validateUsername('x'.repeat(41))).toThrow(/40 characters/);
  });
  it.each(['', ' ', '@', 'has spaces', 'two@@', 'slash/name', 'éclair'])('rejects invalid username %j without mutation', input => {
    const before = db.getState();
    expect(() => validateUsername(input)).toThrow();
    expect(db.getState()).toBe(before);
  });
  it('checks every seeded persona case-insensitively and permits the current handle', () => {
    for (const user of db.getState().users.filter(user => user.id !== db.getState().meId)) {
      expect(() => validateUsername(`@${user.username.toUpperCase()}`)).toThrow('That username is already in use.');
    }
    expect(validateUsername('PRINCE.CREATES')).toBe('PRINCE.CREATES');
  });
  it('shares normalization and collision checks with profile saves', () => {
    auth.demoSignIn();
    expect(profile.update({ username: `@${'x'.repeat(40)}` }).username).toBe('x'.repeat(40));
    expect(() => profile.update({ username: 'AARAV.NEXUS' })).toThrow(/already in use/);
  });
});

describe('atomic onboarding profile and first intent', () => {
  const firstIntent = () => ({ text: 'Build a small app together', interpretation: intents.interpretPreview('Build a small app together') });
  it.each([{ username: 'AARAV.NEXUS' }, { name: ' ' }, { username: '@' }])('does not publish or complete an invalid profile %j', fields => {
    auth.demoSignIn();
    const before = db.getState();
    expect(() => completeOnboarding(fields, firstIntent())).toThrow();
    expect(db.getState()).toBe(before);
    expect(db.getState().onboardingComplete).toBe(false);
  });
  it('does not save the profile when the intent is invalid', () => {
    auth.demoSignIn();
    const before = db.getState();
    expect(() => completeOnboarding({ username: 'new.handle' }, { ...firstIntent(), text: ' ' })).toThrow(/Intent is required/);
    expect(db.getState()).toBe(before);
  });
  it('commits one normalized profile and public intent together, with existing analytics', () => {
    auth.demoSignIn();
    const previousCount = db.getState().intents.length;
    const observations: { complete: boolean; count: number }[] = [];
    const stop = db.subscribe(state => observations.push({ complete: state.onboardingComplete, count: state.intents.length }));
    const saved = completeOnboarding({ name: 'Demo Tester', username: ' @demo.tester ' }, firstIntent());
    stop();
    expect(saved.username).toBe('demo.tester');
    expect(observations).toEqual([{ complete: true, count: previousCount + 1 }]);
    expect(db.getState().intents[0]).toMatchObject({ userId: 'me', visibility: 'public' });
    expect(db.getState().analyticsEvents.slice(-2).map(event => event.name)).toEqual(['intent_created', 'onboarding_completed']);
  });
  it('retains the existing profile-only completion API', () => {
    auth.demoSignIn();
    const count = db.getState().intents.length;
    completeOnboarding({ name: 'Legacy caller' });
    expect(db.getState().onboardingComplete).toBe(true);
    expect(db.getState().intents).toHaveLength(count);
  });
});
