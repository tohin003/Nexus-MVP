import type { RouteName } from '../routerStore';

/**
 * Where the app should land on load or route change.
 * Rules: private screens require a signed-in demo; an onboarded demo resumes
 * where it was instead of falling back to Welcome; an incomplete demo resumes
 * onboarding. Welcome is only for signed-out visitors.
 */
export function entryRoute(signedIn: boolean, onboardingComplete: boolean, current: RouteName): RouteName {
  if (!signedIn) return 'welcome';
  if (!onboardingComplete) return 'onboarding';
  if (current === 'welcome' || current === 'onboarding') return 'home';
  return current;
}
