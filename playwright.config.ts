import { defineConfig, devices } from '@playwright/test';

const shouldStartServer = !process.env.PLAYWRIGHT_SKIP_WEB_SERVER;

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:5000',
  },
  webServer: shouldStartServer
    ? {
        command: 'bash -lc "npm run dev:test"',
        url: 'http://localhost:5000',
        reuseExistingServer: true,
        timeout: 180_000,
        env: {
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5000',
          ENABLE_TEST_MAILBOX: 'true',
          ENABLE_TEST_AUTH: 'true',
          NEXT_PUBLIC_ENABLE_TEST_AUTH: 'true',
          ...process.env,
        },
      }
    : undefined,
  projects: [
    {
      name: 'Desktop Chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iPhone 13',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'Pixel 7',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'iPad',
      use: { ...devices['iPad (gen 9)'] },
    },
  ],
});
