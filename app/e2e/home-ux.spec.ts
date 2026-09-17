import { test, expect, type Page } from '@playwright/test';
import type { AppState } from '../src/repo/db';

const STORAGE_KEY = 'nexus-mvp-state-v1';

// Authenticate through the real UI, then complete only the unrelated onboarding
// gate using the app's persisted seed (never replace it with a partial store).
async function openHome(page: Page, fixture: 'seed' | 'no-following' | 'visibility' = 'seed') {
  await page.goto('/');
  await page.getByRole('button', { name: /Continue with Demo/i }).click();
  await page.waitForURL(/onboarding/);
  await page.evaluate(({ key, fixture }) => {
    const state = JSON.parse(localStorage.getItem(key)!) as AppState;
    if (!state.signedIn) throw new Error('Demo authentication did not persist');
    state.onboardingComplete = true;
    if (fixture === 'no-following') {
      state.connections = [];
      state.posts = state.posts.filter(post => post.userId !== state.meId);
    }
    if (fixture === 'visibility') {
      const [author, blocked, muted, suspended] = state.users.filter(user => user.id !== state.meId);
      state.blockedUsers = [{ userId: blocked.id, blockedAt: Date.now() }];
      state.mutedUsers = [{ userId: muted.id, mutedAt: Date.now() }];
      suspended.suspended = true;
      const baseCircle = state.circles[0];
      state.circles = [
        { ...baseCircle, id: 'ux-open', privacy: 'open', memberIds: [author.id] },
        { ...baseCircle, id: 'ux-member', privacy: 'closed', memberIds: [author.id, state.meId] },
        { ...baseCircle, id: 'ux-private', privacy: 'closed', memberIds: [author.id] },
        { ...baseCircle, id: 'ux-invite', privacy: 'invite', memberIds: [author.id] },
      ];
      const template = state.posts[0];
      const post = (id: string, userId: string, createdAt: number, circleId: string | null = null) => ({
        ...template, id, title: id, body: 'A small update from the persisted demo fixture.',
        userId, createdAt, circleId, photo: undefined, comments: [], helpedBy: [], myReaction: null,
      });
      const now = Date.now();
      state.posts = [
        ...Array.from({ length: 12 }, (_, i) => post(`ux-public-${i}`, author.id, now - i * 1000)),
        post('ux-own-older', state.meId, now - 100_000),
        post('ux-open-visible', author.id, now + 1000, 'ux-open'),
        post('ux-member-visible', author.id, now + 2000, 'ux-member'),
        post('ux-private-hidden', author.id, now + 3000, 'ux-private'),
        post('ux-invite-hidden', author.id, now + 4000, 'ux-invite'),
        post('ux-missing-circle-hidden', author.id, now + 5000, 'ux-missing'),
        post('ux-blocked-hidden', blocked.id, now + 6000),
        post('ux-muted-hidden', muted.id, now + 7000),
        post('ux-suspended-hidden', suspended.id, now + 8000),
        // Even an own post must not bypass the circle access check.
        post('ux-own-private-hidden', state.meId, now + 9000, 'ux-private'),
      ];
    }
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: STORAGE_KEY, fixture });
  await page.goto('/#home');
  await page.reload();
  await expect(page.getByRole('heading', { name: /Good things start with your people/ })).toBeVisible();
}

const feedPosts = (page: Page) => page.getByRole('region', { name: 'Home feed', exact: true }).locator(':scope > article');

test.use({ viewport: { width: 390, height: 844 } });

test('Home prioritizes the feed, with accessible inbox and Create beside five native tabs', async ({ page }) => {
  await openHome(page);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('button')).toHaveCount(5);
  for (const name of [/^Home$/, /^Discover$/, /^Inbox(?:, \d+ unread)?$/, /^Circles$/, /^You$/]) {
    await expect(nav.getByRole('button', { name })).toBeVisible();
  }
  await expect(nav.getByRole('button', { name: 'Create', exact: true })).toHaveCount(0);
  const inbox = page.getByRole('button', { name: /^Open inbox/ });
  const create = page.getByRole('button', { name: 'Create', exact: true });
  await expect(inbox).toBeVisible();
  await expect(create).toBeVisible();
  for (const control of [inbox, create, page.getByRole('button', { name: /^Notifications,/ })]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByRole('region', { name: 'Moments', exact: true })).toBeVisible();
  // Measure before any scroll-into-view action; hidden/offscreen cards cannot
  // pass this test simply because Playwright scrolled down to them.
  await expect(feedPosts(page).first()).toBeAttached();
  const firstPost = await feedPosts(page).first().boundingBox();
  expect(firstPost).not.toBeNull();
  expect(firstPost!.y).toBeGreaterThanOrEqual(0);
  expect(firstPost!.y).toBeLessThan(900);
  const order = await page.getByRole('region', { name: 'Suggested people', exact: true }).evaluate(rail => {
    const feed = document.querySelector('section[aria-label="Home feed"]')!;
    const posts = Array.from(feed.children).filter(child => child.tagName === 'ARTICLE');
    return posts.slice(0, 2).length === 2 && posts.slice(0, 2).every(post => !!(post.compareDocumentPosition(rail) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(order).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('#app-scroll').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await inbox.click();
  await expect(page).toHaveURL(/#inbox$/);
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();
  await nav.getByRole('button', { name: 'Home', exact: true }).click();
  await create.click();
  await expect(page).toHaveURL(/#create$/);
  await page.getByRole('textbox', { name: 'What would you like to share?' }).fill('A small Home UX update');
  await page.getByRole('textbox', { name: 'Tell the story. What did you learn or make?' }).fill('Made a little room for real connections today.');
  await page.getByRole('button', { name: 'Publish post', exact: true }).click();
  await page.getByRole('button', { name: 'Go to feed', exact: true }).click();
  await expect(feedPosts(page).first().getByRole('heading', { name: 'A small Home UX update', exact: true })).toBeVisible();
});

test('Following has an honest empty state and an explicit way back to All', async ({ page }) => {
  await openHome(page, 'no-following');
  const filters = page.getByRole('group', { name: 'Feed filter' });
  await filters.getByRole('button', { name: 'Following', exact: true }).click();
  await expect(filters.getByRole('button', { name: 'Following', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'A quiet moment with your people' })).toBeVisible();
  await expect(feedPosts(page)).toHaveCount(0);
  await expect(page.getByText('Updates from your connections and your own posts will appear here.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'See all posts', exact: true }).click();
  await expect(filters.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(feedPosts(page).first()).toBeVisible();
});

test('Home bounds the feed to eight, includes own posts and respects safety and circle access', async ({ page }) => {
  await openHome(page, 'visibility');
  await expect(feedPosts(page)).toHaveCount(8);
  for (const title of ['ux-own-older', 'ux-open-visible', 'ux-member-visible']) {
    await expect(feedPosts(page).filter({ has: page.getByRole('heading', { name: title, exact: true }) })).toHaveCount(1);
  }
  for (const title of ['ux-private-hidden', 'ux-invite-hidden', 'ux-missing-circle-hidden', 'ux-blocked-hidden', 'ux-muted-hidden', 'ux-suspended-hidden', 'ux-own-private-hidden']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  }
  await page.reload();
  await expect(feedPosts(page)).toHaveCount(8);
  await expect(page.getByRole('heading', { name: 'ux-own-older', exact: true })).toHaveCount(1);
  await page.getByRole('group', { name: 'Feed filter' }).getByRole('button', { name: 'Following', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ux-own-older', exact: true })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'ux-own-private-hidden', exact: true })).toHaveCount(0);
  expect(await feedPosts(page).count()).toBeLessThanOrEqual(8);
});
