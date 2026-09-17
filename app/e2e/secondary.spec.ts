import { test, expect, type Page } from '@playwright/test';
import type { AppState } from '../src/repo/db';

const STORAGE_KEY = 'nexus-mvp-state-v1';

// Start on the existing app origin before touching storage. A demo sign-in
// materializes its real seed; only session flags/admin fixture are changed.
async function seedSession(page: Page, admin = false) {
  await page.goto('/');
  await page.getByRole('button', { name: /Continue with Demo/i }).click();
  await page.evaluate(({ key, admin }) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.signedIn = true;
    state.onboardingComplete = true;
    state.users.find((user: { id: string }) => user.id === state.meId).isAdmin = admin;
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: STORAGE_KEY, admin });
  await page.reload();
  await page.goto('/#settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
}

async function state(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
}

async function reportAarav(page: Page, detail: string) {
  await page.goto('/#user/aarav');
  await expect(page.getByRole('heading', { name: 'Aarav Mehta', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Profile options' }).click();
  await page.getByRole('button', { name: /Report/i }).click();
  await page.getByRole('combobox', { name: 'Reason', exact: true }).selectOption('Harassment or abuse');
  await page.getByRole('textbox', { name: 'Details (optional)', exact: true }).fill(detail);
  await page.getByRole('button', { name: 'Submit report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Report received' })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
}

test('privacy and light/dark/system appearance persist across reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await seedSession(page);
  for (const name of [/Discoverable profile/, /Show my city/, /Local suggestions/]) {
    await page.getByRole('checkbox', { name }).uncheck();
  }
  await page.getByRole('combobox', { name: 'Who can message me' }).selectOption('anyone');
  await expect(page.getByRole('status')).toHaveText('Privacy preferences updated.');
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await expect(page.locator('html')).toHaveClass(/theme-dark/);
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();
  await expect(page.locator('html')).toHaveClass(/theme-dark/);
  for (const name of [/Discoverable profile/, /Show my city/, /Local suggestions/]) {
    await expect(page.getByRole('checkbox', { name })).not.toBeChecked();
  }
  await expect(page.getByRole('combobox', { name: 'Who can message me' })).toHaveValue('anyone');
  await page.getByRole('radio', { name: 'Light', exact: true }).check();
  await expect(page.locator('html')).not.toHaveClass(/theme-dark/);
  await page.getByRole('radio', { name: 'System', exact: true }).check();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/theme-dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/theme-dark/);
  await page.reload();
  await expect(page.getByRole('radio', { name: 'System', exact: true })).toBeChecked();
  const saved = await state(page);
  expect(saved.users.find(user => user.id === saved.meId)?.privacy).toEqual({ discoverable: false, showCity: false, showInLocalSuggestions: false, whoCanMessage: 'anyone' });
});

test('profile validates, saves identity and selections, reloads, and discards unsaved edits', async ({ page }) => {
  await seedSession(page);
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeDisabled();
  await page.getByRole('textbox', { name: /^Name/ }).fill('');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('alert')).toHaveText('Please enter your name.');
  await page.getByRole('textbox', { name: /^Name/ }).fill('Secondary Tester');
  await page.getByRole('textbox', { name: /^Username/ }).fill('secondary.tester');
  await page.getByLabel('Headline', { exact: true }).fill('A careful local demo editor');
  await page.getByRole('combobox', { name: /^City/ }).fill('Remote');
  await page.getByRole('textbox', { name: /^About you/ }).fill('Profile persistence checked through the UI.');
  await page.getByRole('textbox', { name: 'Currently working on', exact: true }).fill('A small collaboration.');
  await page.getByRole('combobox', { name: 'Experience', exact: true }).selectOption('experienced');
  await page.getByRole('checkbox', { name: 'developer', exact: true }).check();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Your profile has been updated in this local demo.');
  await page.reload();
  await expect(page.getByRole('textbox', { name: /^Name/ })).toHaveValue('Secondary Tester');
  await expect(page.getByRole('textbox', { name: /^Username/ })).toHaveValue('secondary.tester');
  await expect(page.getByLabel('Headline', { exact: true })).toHaveValue('A careful local demo editor');
  await expect(page.getByRole('combobox', { name: /^City/ })).toHaveValue('Remote');
  await expect(page.getByRole('combobox', { name: 'Experience', exact: true })).toHaveValue('experienced');
  await expect(page.getByRole('checkbox', { name: 'developer', exact: true })).toBeChecked();
  await page.getByRole('textbox', { name: /^Name/ }).fill('Unsaved name');
  await page.getByRole('button', { name: 'Cancel changes', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Discard unsaved changes' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByRole('textbox', { name: /^Name/ })).toHaveValue('Unsaved name');
  await page.getByRole('button', { name: 'Cancel changes', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Secondary Tester', exact: true })).toBeVisible();
  const saved = await state(page);
  expect(saved.users.find(user => user.id === saved.meId)).toMatchObject({ name: 'Secondary Tester', bio: 'Profile persistence checked through the UI.', currently: 'A small collaboration.', roles: ['creator', 'student', 'developer'] });
});

test('block requires confirmation, survives reload, and can be undone from settings', async ({ page }) => {
  await seedSession(page);
  await page.goto('/#user/aarav');
  await page.getByRole('button', { name: 'Profile options' }).click();
  await page.getByRole('button', { name: /Block/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /Cancel/i }).click();
  expect((await state(page)).blockedUsers).toEqual([]);
  await page.getByRole('button', { name: 'Profile options' }).click();
  await page.getByRole('button', { name: /Block/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Block/i }).click();
  await expect(page.getByRole('status')).toContainText('You have blocked this person.');
  await page.reload();
  await expect(page.getByRole('status')).toContainText('You have blocked this person.');
  await page.goto('/#settings');
  await page.getByRole('button', { name: /Blocked & muted/ }).click();
  await expect(page.getByText('Aarav Mehta', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Unblock', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Aarav Mehta unblocked.');
  await expect(page.getByText('No blocked people.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('No blocked people.', { exact: true })).toBeVisible();
  expect((await state(page)).blockedUsers).toEqual([]);
});

for (const action of ['Dismiss', 'Warn', 'Suspend'] as const) {
  test(`report submission, admin review and ${action.toLowerCase()} persist`, async ({ page }) => {
    await seedSession(page, true);
    const detail = `Secondary E2E ${action.toLowerCase()} report.`;
    await reportAarav(page, detail);
    await page.goto('/#settings');
    await page.getByRole('button', { name: /Admin workspace/ }).click();
    await expect(page.getByRole('heading', { name: 'Demo activity funnel' })).toBeVisible();
    const report = page.getByRole('article').filter({ hasText: detail });
    await expect(report).toContainText('Harassment or abuse');
    await expect(report).toContainText('Prince');
    await report.getByRole('button', { name: 'Review', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Report marked as reviewing.');
    await page.getByRole('combobox', { name: 'Filter report status' }).selectOption('open');
    await expect(report).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Filter report status' }).selectOption('reviewing');
    await expect(report.getByRole('button', { name: 'Reviewing', exact: true })).toBeDisabled();
    await report.getByRole('button', { name: action, exact: true }).click();
    if (action === 'Suspend') {
      await expect(page.getByRole('group', { name: 'Confirm suspension' })).toBeVisible();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await report.getByRole('button', { name: 'Suspend', exact: true }).click();
      await page.getByRole('button', { name: 'Confirm suspension', exact: true }).click();
    }
    await expect(page.getByRole('status')).toContainText(action === 'Dismiss' ? 'Report dismissed.' : action === 'Warn' ? 'local warning' : 'local account suspension');
    await page.getByRole('combobox', { name: 'Filter report status' }).selectOption('resolved');
    await expect(report).toBeVisible();
    await page.reload();
    await expect(report).toContainText('resolved');
    expect((await state(page)).reports[0]).toMatchObject({ detail, status: 'resolved', action: action === 'Dismiss' ? 'dismissed' : action === 'Warn' ? 'warned' : 'suspended' });
    if (action === 'Suspend') {
      await page.goto('/#user/aarav');
      await expect(page.getByRole('status')).toContainText('This account is suspended.');
    }
  });
}

test('non-admin cannot open admin tools', async ({ page }) => {
  await seedSession(page);
  await expect(page.getByRole('button', { name: /Admin workspace/ })).toHaveCount(0);
  await page.goto('/#admin');
  await expect(page.getByRole('heading', { name: 'Admin access required' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Filter report status' })).toHaveCount(0);
});

test('reset can be cancelled then restores demo while keeping appearance', async ({ page }) => {
  await seedSession(page);
  await page.getByRole('checkbox', { name: /Discoverable profile/ }).uncheck();
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Confirm demo reset' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Discoverable profile/ })).not.toBeChecked();
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, reset demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Find your people/i })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('nexus-theme'))).toBe('dark');
  await page.reload();
  await expect(page.getByRole('heading', { name: /Find your people/i })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/theme-dark/);
});

test('signout keeps profile data but gates protected screens after reload', async ({ page }) => {
  await seedSession(page);
  await page.getByRole('checkbox', { name: /Show my city/ }).uncheck();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Find your people/i })).toBeVisible();
  await page.reload();
  const saved = await state(page);
  expect(saved.signedIn).toBe(false);
  expect(saved.onboardingComplete).toBe(true);
  expect(saved.users.find(user => user.id === saved.meId)?.privacy.showCity).toBe(false);
  await page.goto('/#edit-profile');
  await expect(page.getByRole('button', { name: 'Save profile' })).toHaveCount(0);
  await page.goto('/#welcome');
  await page.getByRole('button', { name: /Continue with Demo/i }).click();
  await page.goto('/#settings');
  await expect(page.getByRole('checkbox', { name: /Show my city/ })).not.toBeChecked();
});
