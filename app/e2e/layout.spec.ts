import { test, expect, type Page, type TestInfo } from '@playwright/test';

// DOM/geometry checks only: no screenshot or human visual-review claims.
// Uses the existing server. Run only this file: npx playwright test e2e/layout.spec.ts --workers=1
const sizes = [
  { width: 375, height: 812 }, { width: 390, height: 844 },
  { width: 393, height: 852 }, { width: 412, height: 915 },
  { width: 430, height: 932 }, { width: 1440, height: 1000 },
];
const key = 'nexus-mvp-state-v1';
type Evidence = { screen: string; heading: string[]; images: number; geometry: unknown };

async function audit(page: Page, screen: string, evidence: Evidence[]) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('h1'), `${screen}: one page heading`).toHaveCount(1);
  await expect(page.locator('h1'), `${screen}: heading exists and is rendered`).toBeVisible();
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image =>
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)),
  { message: `${screen}: all images load` }).toBe(true);
  const geometry = await page.evaluate(() => {
    const phone = document.querySelector('.phone')!.getBoundingClientRect();
    const app = document.querySelector('#app-scroll')!;
    const overflow = [...document.querySelectorAll<HTMLElement>('#app-scroll *')].filter(element => {
      const style = getComputedStyle(element);
      // Notification avatar badges deliberately extend 4px into their card's 12px gap.
      // Exempt only this decoration after checking it remains within its containing card.
      const card = element.closest('.card');
      const badge = element.querySelector<HTMLElement>(':scope > .absolute.-right-1');
      const cardBox = card?.getBoundingClientRect();
      const badgeBox = badge?.getBoundingClientRect();
      const containedBadge = element.matches('span.relative.shrink-0') && badgeBox && cardBox &&
        badgeBox.left >= cardBox.left && badgeBox.right <= cardBox.right;
      // Truncated text and native input text are intentionally internally clipped.
      const intentionalRail = style.overflowX === 'auto' &&
        ['Suggested people', 'Recent Moments'].includes(element.getAttribute('aria-label') || '');
      return !intentionalRail && !containedBadge && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1 &&
        !['INPUT', 'TEXTAREA', 'SELECT', 'SVG'].includes(element.tagName) &&
        !element.classList.contains('sr-only') && style.textOverflow !== 'ellipsis';
    }).map(element => ({ tag: element.tagName, class: element.className,
      width: element.clientWidth, scrollWidth: element.scrollWidth,
      text: element.textContent?.slice(0, 100) }));
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth, appWidth: app.clientWidth, appScrollWidth: app.scrollWidth,
      phone: { x: phone.x, right: phone.right, width: phone.width }, overflow };
  });
  evidence.push({ screen, heading: await page.locator('h1').allTextContents(),
    images: await page.locator('img').count(), geometry });
  expect.soft(geometry.documentWidth, `${screen}: document overflow`).toBeLessThanOrEqual(geometry.viewport + 1);
  expect.soft(geometry.bodyWidth, `${screen}: body overflow`).toBeLessThanOrEqual(geometry.viewport + 1);
  expect.soft(geometry.appScrollWidth, `${screen}: app overflow`).toBeLessThanOrEqual(geometry.appWidth + 1);
  expect.soft(geometry.phone.x, `${screen}: phone left edge`).toBeGreaterThanOrEqual(-1);
  expect.soft(geometry.phone.right, `${screen}: phone right edge`).toBeLessThanOrEqual(geometry.viewport + 1);
  expect.soft(geometry.overflow, `${screen}: nested horizontal overflow`).toEqual([]);
  expect.soft(await page.locator('img:not([alt])').count(), `${screen}: image alt attributes`).toBe(0);
  // Geometry and accessible names of fixed primary navigation.
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  if (await nav.count()) {
    await expect(nav.getByRole('button')).toHaveCount(5);
    for (const button of await nav.getByRole('button').all()) {
      await expect(button).toHaveAccessibleName(/.+/);
      const box = (await button.boundingBox())!;
      expect.soft(box.width).toBeGreaterThanOrEqual(44);
      expect.soft(box.height).toBeGreaterThanOrEqual(44);
      expect.soft(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    }
  }
}

async function keyboardDialog(page: Page, triggerName: string, evidence: Evidence[]) {
  const trigger = page.getByRole('button', { name: triggerName, exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/.+/);
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  const box = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect.soft(box.x).toBeGreaterThanOrEqual(0);
  expect.soft(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect.soft(box.y).toBeGreaterThanOrEqual(0);
  expect.soft(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  expect.soft(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const focusable = dialog.locator('button, input, textarea, select, a[href], [tabindex="0"]');
  const focusSteps = [];
  for (let index = 0; index < await focusable.count() + 2; index++) {
    await page.keyboard.press('Tab');
    const focus = await dialog.evaluate(element => ({ inside: element.contains(document.activeElement),
      tag: document.activeElement?.tagName, documentFocused: document.hasFocus(),
      text: document.activeElement?.textContent?.slice(0, 50) }));
    focusSteps.push(focus);
    // Native dialog may cycle through browser chrome (BODY + document.hasFocus=false).
    // Never allow a focusable background-page element to receive focus.
    expect(focus.inside || (focus.tag === 'BODY' && !focus.documentFocused), JSON.stringify(focus)).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(element => element.contains(document.activeElement) ||
    (document.activeElement === document.body && !document.hasFocus()))).toBe(true);
  evidence.push({ screen: `focus:${triggerName}`, heading: [], images: 0, geometry: focusSteps });
  evidence.push({ screen: `dialog:${triggerName}`, heading: [await dialog.getAttribute('aria-labelledby') || ''], images: await dialog.locator('img').count(), geometry: box });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await trigger.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
}

for (const colorScheme of ['light', 'dark'] as const) {
  for (const viewport of sizes) {
    test.describe(`${colorScheme} ${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport, colorScheme, reducedMotion: 'reduce' });
      test('main routes, loaded images, geometry and keyboard dialogs', async ({ page }, testInfo: TestInfo) => {
        test.setTimeout(120_000);
        const evidence: Evidence[] = [];
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
        page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
        // Also catch failed avatars that the UI could replace with initials before img inspection.
        page.on('response', response => { if (response.request().resourceType() === 'image' && response.status() >= 400) errors.push(`image HTTP ${response.status()}: ${response.url()}`); });
        page.on('requestfailed', request => { if (request.resourceType() === 'image') errors.push(`image request failed: ${request.url()}`); });
        try {
          await page.goto('/');
          await expect(page.getByRole('heading', { name: /Find your people/ })).toBeVisible();
          await expect(page.locator('html')).toHaveClass(colorScheme === 'dark' ? /theme-dark/ : /^(?!.*theme-dark).*$/);
          await audit(page, 'welcome', evidence);
          // A genuine UI mutation first persists the complete, versioned initial demo seed.
          await page.getByRole('button', { name: /Continue with Demo/ }).click();
          await page.waitForURL(/#onboarding/);
          await audit(page, 'onboarding:identity', evidence);
          const ids = await page.evaluate(storageKey => {
            const saved = JSON.parse(localStorage.getItem(storageKey)!);
            if (!saved.users?.length || !saved.conversations?.length || !saved.circles?.length) throw new Error('UI did not persist a complete demo seed');
            saved.signedIn = true;
            saved.onboardingComplete = true;
            localStorage.setItem(storageKey, JSON.stringify(saved));
            return { user: saved.users.find((user: { id: string }) => user.id !== saved.meId).id,
              circle: saved.circles.find((circle: { memberIds: string[] }) => circle.memberIds.includes(saved.meId)).id,
              chat: saved.conversations.find((conversation: { memberIds: string[] }) => conversation.memberIds.includes(saved.meId)).id };
          }, key);
          await page.reload();
          const routes = ['home', 'first-matches', 'discover', 'circles', `circle/${ids.circle}`, 'create', 'me',
            `user/${ids.user}`, 'inbox', 'inbox/requests', `chat/${ids.chat}`, 'notifications', 'settings', 'blocked', 'admin', 'edit-profile'];
          for (const route of routes) {
            await page.goto(`/#${route}`);
            await expect(page).toHaveURL(new RegExp(`#${route}$`));
            // The same Inbox component can retain its selected tab across hash changes.
            // Select through UI so this audit really covers request cards, not messages twice.
            if (route === 'inbox/requests') {
              const requests = page.getByRole('tab', { name: /^Requests/ });
              await requests.click();
              await expect(requests).toHaveAttribute('aria-selected', 'true');
            }
            await audit(page, route, evidence);
            if (route === 'discover') {
              for (const name of ['INTENTS', 'CIRCLES', 'PEOPLE']) {
                const tab = page.getByRole('tab', { name, exact: true });
                await tab.focus(); await page.keyboard.press('Enter');
                await expect(tab).toHaveAttribute('aria-selected', 'true');
                await audit(page, `discover:${name}`, evidence);
              }
            }
            if (route.startsWith('circle/')) {
              for (const name of ['People', 'Projects', 'Events', 'Discuss']) {
                const tab = page.getByRole('tab', { name, exact: true });
                await tab.focus(); await page.keyboard.press('Enter');
                await expect(tab).toHaveAttribute('aria-selected', 'true');
                await audit(page, `circle:${name}`, evidence);
              }
            }
            if (route === 'create') {
              await page.getByRole('tab', { name: 'Create Circle', exact: true }).click();
              await audit(page, 'create:circle', evidence);
            }
            if (route.startsWith('user/')) await keyboardDialog(page, 'Profile options', evidence);
            if (route.startsWith('chat/')) await keyboardDialog(page, 'Conversation options', evidence);
          }
          expect.soft(errors, 'browser console/runtime errors').toEqual([]);
        } finally {
          await testInfo.attach('dom-geometry-evidence', { body: JSON.stringify({ viewport, colorScheme, errors, evidence }, null, 2), contentType: 'application/json' });
        }
      });
    });
  }
}
