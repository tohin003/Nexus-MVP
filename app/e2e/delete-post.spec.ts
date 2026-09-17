import { expect, test } from '@playwright/test';
import { buildSeed } from '../src/data/seed';

test('author can cancel then confirm post deletion, disappearing from feed and profile after reload', async ({ page }) => {
  const state = buildSeed();
  state.signedIn = true;
  state.onboardingComplete = true;
  state.authMode = 'demo';
  await page.addInitScript(state => {
    if (!localStorage.getItem('nexus-mvp-state-v1')) localStorage.setItem('nexus-mvp-state-v1', JSON.stringify(state));
  }, state);
  await page.goto('/#create');
  const title = 'My removable community post';
  await page.getByRole('textbox', { name: 'What would you like to share?' }).fill(title);
  await page.getByRole('textbox', { name: 'Tell the story. What did you learn or make?' }).fill('This post should disappear when I delete it.');
  await page.getByRole('button', { name: 'Publish post', exact: true }).click();
  await page.getByRole('button', { name: 'Go to feed', exact: true }).click();
  const post = page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(post).toHaveCount(1);
  const otherPost = page.getByRole('article').filter({ has: page.getByRole('heading', { name: state.posts[0].title, exact: true }) });
  await expect(otherPost).toHaveCount(1);
  await expect(otherPost.getByRole('button', { name: 'Delete post', exact: true })).toHaveCount(0);
  await post.getByRole('button', { name: 'Delete post', exact: true }).click();
  await expect(post.getByText('Delete this post from this browser? This cannot be undone.', { exact: true })).toBeVisible();
  await expect(post).toHaveCount(1);
  await post.getByRole('button', { name: 'Keep post', exact: true }).click();
  await expect(post.getByRole('button', { name: 'Confirm delete', exact: true })).toHaveCount(0);
  await expect(post).toHaveCount(1);

  await page.goto('/#me');
  await page.getByRole('button', { name: /View my \d+ posts/ }).click();
  await expect(post).toHaveCount(1);
  await post.getByRole('button', { name: 'Delete post', exact: true }).click();
  await post.getByRole('button', { name: 'Confirm delete', exact: true }).click();
  await expect(post).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Posts', exact: true })).toBeVisible();
  await expect(post).toHaveCount(0);
  await page.goto('/#home');
  await expect(post).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Moments', exact: true })).toBeVisible();
  await expect(post).toHaveCount(0);
  expect(await page.evaluate(title => {
    const saved = JSON.parse(localStorage.getItem('nexus-mvp-state-v1')!);
    return saved.posts.some((item: { title: string }) => item.title === title);
  }, title)).toBe(false);
});
