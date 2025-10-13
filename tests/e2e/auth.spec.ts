import { test, expect } from '@playwright/test';

test('auth form toggles between sign-in and sign-up modes', async ({ page }) => {
  await page.goto('/login');

  const signInToggle = page.getByRole('button', { name: 'Sign in', exact: true }).first();
  await expect(signInToggle).toBeVisible();

  const signUpToggle = page.getByRole('button', { name: 'Sign up', exact: true }).first();
  await signUpToggle.click();

  await expect(page.getByLabel(/name/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
});
