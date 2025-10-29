## Development notes

### Supabase auth rate limiting

Supabase enforces strict rate limits on the password grant endpoint. The app now:

- Applies exponential backoff with jitter after failed sign-ins or 429 responses.
- Disables the password and magic-link buttons during the cooldown window to reduce repeated submissions.

To avoid hitting shared limits:

- Reuse the Supabase session that is already persisted by the auth helpers instead of logging out/in repeatedly during development.
- Stagger automated end-to-end tests or point them at a separate Supabase project; do not run the full auth flow in tight loops.
- Debounced UI actions are already in place, but keep an eye on extensions or scripts that may trigger background requests.
- If multiple developers are working simultaneously, consider provisioning per-developer Supabase projects or feature-branch environments.

If you still see 429 responses, wait for the cooldown (usually ~60 s) or adjust the rate-limit settings in the Supabase dashboard.

### UI layout primitives

Admin and marketing views now share a common set of components:

- `AppShell` (`src/components/ui/AppShell.tsx`) renders the responsive sidebar + bottom tab bar. Pass the server-derived nav array (`{ name, href, icon }[]`) and let the component hydrate icons on the client—do not send React elements across the boundary.
- `AdminPage`, `AdminSection`, `AdminCard`, `AdminMetric`, and `AdminMetricGrid` (`src/components/ui/AdminPage.tsx`) provide the page header, content sections, and cards used across dashboard routes. Reach for these instead of ad-hoc Tailwind wrappers when building new admin screens.
- Marketing pages use `MarketingSection` (`src/components/marketing/MarketingSection.tsx`) for consistent spacing, background variants, and optional dividers. Compose sections with this primitive rather than bespoke `section` styling.
- `SupportFooter` (`src/components/SupportFooter.tsx`) anchors support contact info and the Copilot teaser. Include it at the bottom of public pages and auth flows instead of duplicating markup.

When updating or adding pages, prefer these primitives so spacing, backgrounds, and breakpoints stay aligned across the app.

### Email confirmations & SMTP

### Testing

- Run `npm test` for vitest + React Testing Library coverage of the auth UI (Supabase calls are mocked).
- Run `npm run test:e2e` to smoke-test the auth toggles via Playwright (`npx playwright install` may be required once per machine). The test runner boots `npm run dev` automatically; ensure your `.env.local` is populated so the app can start.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:4001](http://localhost:4001) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
