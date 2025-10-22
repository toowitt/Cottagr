import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const mobileProjects = new Set(['iPhone_13', 'Pixel_7']);

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const docOverflow = doc.scrollWidth - doc.clientWidth;
    const bodyOverflow = body.scrollWidth - body.clientWidth;
    return docOverflow > 1 || bodyOverflow > 1;
  });
}

test.describe('Responsive layout (mobile)', () => {
  test('no horizontal scroll on key routes', async ({ page }, testInfo) => {
    test.skip(!mobileProjects.has(testInfo.project.name), 'Mobile viewport only');

    const routes = ['/login', '/bookings', '/expenses', '/responsive-test'];

    for (const route of routes) {
      await page.goto(route);
      const overflow = await hasHorizontalOverflow(page);
      expect(overflow, `${route} should not overflow horizontally`).toBeFalsy();
    }
  });

  test('navigation drawer traps focus and returns to trigger', async ({ page }, testInfo) => {
    test.skip(!mobileProjects.has(testInfo.project.name), 'Mobile viewport only');

    await page.goto('/responsive-test');

    const menuButton = page.getByRole('button', { name: /menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    await expect.poll(async () => {
      return page.evaluate(() => {
        const active = document.activeElement;
        return Boolean(active && active.closest('[role="dialog"]'));
      });
    }).toBe(true);

    await page.keyboard.press('Tab');
    await expect.poll(async () => {
      return page.evaluate(() => {
        const active = document.activeElement;
        return Boolean(active && active.closest('[role="dialog"]'));
      });
    }).toBe(true);

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(menuButton).toBeFocused();

    const primaryAction = page.getByRole('button', { name: /add booking/i });
    let focused = false;
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press('Tab');
      focused = await primaryAction.evaluate((element) => element === document.activeElement);
      if (focused) {
        break;
      }
    }
    expect(focused, 'Primary action should be reachable via keyboard').toBeTruthy();
  });

  test('tables render as cards on mobile', async ({ page }, testInfo) => {
    test.skip(!mobileProjects.has(testInfo.project.name), 'Mobile viewport only');

    await page.goto('/responsive-test');

    const cards = page.locator('article[data-container-name="datagrid-card"]');
    const table = page.locator('table');

    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
    await expect(table).toBeHidden();
  });
});

test.describe('Responsive layout (desktop)', () => {
  test('renders table layout on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop', 'Desktop viewport only');

    await page.goto('/responsive-test');

    const table = page.locator('table');
    await expect(table).toBeVisible();
    await expect(page.locator('article[data-container-name="datagrid-card"]')).toBeHidden();
  });
});
