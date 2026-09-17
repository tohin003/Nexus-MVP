import { describe, it, expect } from 'vitest';
import { entryRoute } from './entry';

describe('restore demo navigation', () => {
  it('does not send an onboarded demo back to Welcome on reload', () => {
    expect(entryRoute(true, true, 'welcome')).toBe('home');
  });
  it('resumes onboarding for an incomplete signed-in demo', () => {
    expect(entryRoute(true, false, 'home')).toBe('onboarding');
  });
  it('protects private screens while signed out', () => {
    expect(entryRoute(false, false, 'chat')).toBe('welcome');
  });
  it('preserves the current destination of an onboarded demo', () => {
    expect(entryRoute(true, true, 'circle')).toBe('circle');
  });
});
