import { test, expect } from '@playwright/test';

const AUTH_EMAIL = process.env.PLAYWRIGHT_AUTH_EMAIL;
const AUTH_PASSWORD = process.env.PLAYWRIGHT_AUTH_PASSWORD;

test('auth form toggles between sign-in and sign-up modes', async ({ page }) => {
  await page.goto('/login');

  const signInToggle = page.getByRole('button', { name: 'Sign in', exact: true }).first();
  await expect(signInToggle).toBeVisible();

  const signUpToggle = page.getByRole('button', { name: 'Sign up', exact: true }).first();
  await signUpToggle.click();

  await expect(page.getByLabel(/name/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
});

test('@auth login reaches dashboard and supports logout', async ({ page }) => {
  test.skip(!AUTH_EMAIL || !AUTH_PASSWORD, 'PLAYWRIGHT_AUTH_EMAIL and PLAYWRIGHT_AUTH_PASSWORD must be set.');

  await page.goto('/login');

  await page.getByLabel(/email/i).fill(AUTH_EMAIL!);
  await page.getByLabel(/password/i).fill(AUTH_PASSWORD!);
  await page.getByRole('button', { name: /^sign in$/i }).click();

  await page.waitForURL(/\/admin(\/|$)/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: /owner dashboard/i })).toBeVisible();

  await page.goto('/logout');
  await page.waitForURL(/\/login(\/|$)/, { timeout: 10_000 });
  await expect(page.getByText(/signed out/i)).toBeVisible();
});
