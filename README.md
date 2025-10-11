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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
