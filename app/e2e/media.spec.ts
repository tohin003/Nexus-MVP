import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Continue with Demo/i }).click();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('nexus-mvp-state-v1')!);
    state.onboardingComplete = true;
    localStorage.setItem('nexus-mvp-state-v1', JSON.stringify(state));
  });
  await page.reload();
}
const photo = 'public/avatars/aarav.jpg';

test('photo posts appear in own Home feed and persist; suggestions scroll horizontally', async ({ page }) => {
  await signIn(page);
  await page.goto('/#create');
  await page.getByRole('textbox', { name: 'What would you like to share?' }).fill('A photo of progress');
  await page.getByRole('textbox', { name: 'Tell the story. What did you learn or make?' }).fill('One small step on our shared project.');
  await page.locator('input[type=file]').setInputFiles(photo);
  await expect(page.getByAltText('Selected photo 1')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await page.getByRole('button', { name: 'Publish post', exact: true }).click();
  await page.getByRole('button', { name: 'Go to feed' }).click();
  await expect(page.getByAltText('Photo 1 for A photo of progress')).toBeVisible();
  await page.reload();
  await expect(page.getByAltText('Photo 1 for A photo of progress')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  const rail = page.getByRole('region', { name: 'Suggested people', exact: true }).locator('.nexus-pager-track');
  expect(await rail.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await rail.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('profile photo uploads, previews, persists and can be removed', async ({ page }) => {
  await signIn(page);
  await page.goto('/#edit-profile');
  await page.getByLabel('Upload profile photo', { exact: true }).setInputFiles(photo);
  await expect(page.getByAltText('Profile preview')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('profile has been updated');
  await page.reload();
  await expect(page.getByAltText('Profile preview')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await expect(page.getByAltText('Profile preview')).toHaveJSProperty('naturalWidth', 300);
  await page.getByLabel('Upload profile photo', { exact: true }).setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('not a photo') });
  await expect(page.getByRole('alert')).toContainText('JPEG, PNG, or WebP');
  await page.getByRole('button', { name: 'Remove profile photo' }).click();
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.reload();
  await expect(page.getByAltText('Profile preview')).toHaveCount(0);
});
