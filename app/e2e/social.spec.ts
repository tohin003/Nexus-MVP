import { test, expect, type Page } from '@playwright/test';
import { buildSeed } from '../src/data/seed';

async function open(page: Page, route: string, customize?: (state: ReturnType<typeof buildSeed>) => void) {
  const state = buildSeed();
  customize?.(state);
  state.signedIn = true;
  state.onboardingComplete = true;
  state.authMode = 'demo';
  await page.addInitScript(state => {
    if (!localStorage.getItem('nexus-mvp-state-v1')) localStorage.setItem('nexus-mvp-state-v1', JSON.stringify(state));
  }, state);
  await page.goto(`/#${route}`);
}

test('sent cancellation works from Inbox and profile, persists and allows resend', async ({ page }) => {
  await open(page, 'inbox/requests');
  const sent = page.locator('article').filter({ hasText: 'Zoya' });
  await sent.getByRole('button', { name: 'Cancel request', exact: true }).click();
  await expect(sent).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Connection request cancelled');
  await page.reload();
  await expect(sent).toHaveCount(0);
  await page.goto('/#user/zoya');
  await page.getByRole('button', { name: 'Connect with Zoya', exact: true }).click();
  await page.getByRole('button', { name: 'Send connection request', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Connection requested', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel request', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Connect with Zoya', exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Cancel request', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Connect with Zoya', exact: true }).click();
  await page.getByRole('button', { name: 'Send connection request', exact: true }).click();
  await page.goto('/#inbox/requests');
  await page.getByRole('button', { name: 'Accept as Zoya (demo)' }).click();
  await page.goto('/#user/zoya');
  await expect(page.getByRole('button', { name: 'Open conversation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel request', exact: true })).toHaveCount(0);
});

test('Me followers and another profile’s following open local user lists with back navigation', async ({ page }) => {
  await open(page, 'me', state => {
    state.follows = [
      { id: 'incoming', fromUserId: 'aarav', toUserId: 'me', createdAt: 1 },
      { id: 'mine', fromUserId: 'me', toUserId: 'zoya', createdAt: 2 },
      { id: 'other', fromUserId: 'aarav', toUserId: 'isha', createdAt: 3 },
    ];
  });
  const followers = page.getByRole('button', { name: 'View followers', exact: true });
  const box = await followers.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  await followers.click();
  await expect(page).toHaveURL(/#user-followers\/me$/);
  const list = page.getByRole('list', { name: 'Followers', exact: true });
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Aarav');
  await expect(list).toContainText('@aarav');
  await expect(page.getByText(/On this device/)).toBeVisible();
  await list.getByRole('button', { name: 'View profile', exact: true }).click();
  await expect(page).toHaveURL(/#user\/aarav$/);
  await page.getByRole('button', { name: 'View following', exact: true }).click();
  await expect(page).toHaveURL(/#user-following\/aarav$/);
  const following = page.getByRole('list', { name: 'Following', exact: true });
  await expect(following.getByRole('listitem')).toHaveCount(2);
  await expect(following).toContainText('Isha');
  await expect(following).not.toContainText('Zoya');
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(page).toHaveURL(/#user\/aarav$/);
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(page).toHaveURL(/#user-followers\/me$/);
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(page).toHaveURL(/#me$/);
});

test('post drill-downs reuse post cards, keep zero stats disabled, and handle direct empty lists', async ({ page }) => {
  await open(page, 'me', state => {
    const base = state.posts[0];
    state.posts = [
      { ...base, id: 'own-visible', userId: 'me', circleId: null, title: 'My visible post' },
      { ...base, id: 'other-visible', userId: 'aarav', circleId: null, title: 'Aarav visible post' },
    ];
  });
  await expect(page.getByRole('button', { name: 'View followers', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'View following', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'View my 1 posts', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'My visible post', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Report post', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(page).toHaveURL(/#me$/);
  await page.goto('/#user/aarav');
  await page.getByRole('button', { name: 'View 1 posts', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Aarav visible post', exact: true })).toBeVisible();
  await page.goto('/#user-followers/me');
  await expect(page.getByText('No visible followers', { exact: true })).toBeVisible();
});

for (const unavailable of ['hidden', 'suspended', 'blocked'] as const) {
  test(`${unavailable} profiles do not expose direct drill-down lists`, async ({ page }) => {
    await open(page, 'user/aarav', state => {
      state.follows = [{ id: 'private-follow', fromUserId: 'aarav', toUserId: 'isha', createdAt: 1 }];
      const user = state.users.find(user => user.id === 'aarav')!;
      if (unavailable === 'hidden') user.privacy.discoverable = false;
      if (unavailable === 'suspended') user.suspended = true;
      if (unavailable === 'blocked') state.blockedUsers = [{ userId: 'aarav', blockedAt: 1 }];
    });
    await expect(page.getByRole('region', { name: 'Profile stats' })).toHaveCount(0);
    for (const kind of ['following', 'followers', 'posts']) {
      await page.goto(`/#user-${kind}/aarav`);
      await expect(page.getByText('Profile unavailable', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'View profile', exact: true })).toHaveCount(0);
      await expect(page.getByRole('article')).toHaveCount(0);
    }
  });
}

test('incoming profile cannot cancel; posts and directional follows update both profiles', async ({ page }) => {
  await open(page, 'user/isha');
  await expect(page.getByRole('button', { name: 'Incoming connection request' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cancel request', exact: true })).toHaveCount(0);
  await page.goto('/#user/aarav');
  const stats = page.getByRole('region', { name: 'Profile stats' });
  await expect(stats.locator('[data-stat="followers"]')).toHaveText('0');
  await expect(stats.locator('[data-stat="posts"]')).not.toHaveText('0');
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(stats.locator('[data-stat="followers"]')).toHaveText('1');
  await expect(stats.locator('[data-stat="following"]')).toHaveText('0');
  await page.goto('/#me');
  await expect(stats.locator('[data-stat="following"]')).toHaveText('1');
  await expect(stats.locator('[data-stat="followers"]')).toHaveText('0');
  await page.reload();
  await expect(stats.locator('[data-stat="following"]')).toHaveText('1');
  await page.goto('/#user/aarav');
  await page.getByRole('button', { name: 'Unfollow', exact: true }).click();
  await expect(stats.locator('[data-stat="followers"]')).toHaveText('0');
});
