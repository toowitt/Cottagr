# Cottagr - Cottage Management Platform

## Overview
Cottagr is a comprehensive cottage/vacation property management system built with Next.js, Supabase, and Prisma. It provides families with a single operating system for managing stays, expenses, and shared knowledge about their properties.

## Recent Changes
**October 17, 2025** - Theme System Overhaul
- Implemented seamless light/dark mode with zero flash on load
- Created blocking theme script that runs before page render
- Simplified CSS architecture using CSS custom properties
- Added smooth 200ms transitions for all theme-related properties
- Updated login page and core components to use theme-aware colors
- Integrated system preference detection with localStorage persistence

**October 16, 2025** - Migrated from Vercel to Replit
- Updated port configuration from 3000 to 5000 for Replit compatibility
- Configured development and production workflows
- Updated environment variable handling to use REPLIT_DEV_DOMAIN
- Set up deployment configuration for autoscale
- Verified all dependencies are installed and working

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **Authentication**: Supabase Auth with magic links
- **Database**: Prisma ORM with PostgreSQL (Supabase)
- **Styling**: Tailwind CSS 4
- **UI Components**: Lucide React icons
- **Testing**: Vitest for unit tests, Playwright for E2E tests

## Project Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── admin/       # Admin dashboard and management
│   ├── api/         # API routes
│   ├── bookings/    # Booking management
│   ├── expenses/    # Expense tracking
│   ├── knowledge-hub/ # Shared knowledge base
│   ├── login/       # Authentication
│   ├── layout.tsx   # Root layout with theme support
│   └── globals.css  # Global styles with CSS variables
├── components/      # Reusable React components
│   ├── ThemeProvider.tsx  # Client-side theme management
│   └── SiteHeader.tsx     # Header with theme toggle
└── lib/            # Utility functions and clients
    ├── auth/       # Authentication helpers
    ├── supabase/   # Supabase client configurations
    ├── money.ts    # Money/currency utilities
    ├── prisma.ts   # Prisma client setup
    └── validation.ts # Zod schemas
```

## Theme System
The app implements a clean light/dark mode system without hydration errors:
- **Dual Theme Support**: Uses both `data-theme` attribute (for CSS variables) and `dark` class (for Tailwind)
- **CSS Variables**: Core colors defined in `globals.css` using CSS custom properties
- **Tailwind Dark Mode**: Landing page components use Tailwind's `dark:` utility classes
- **Smooth Transitions**: 200ms cubic-bezier transitions on all color changes
- **Persistence**: Theme preference stored in localStorage as `cottagr-theme`
- **System Detection**: CSS media query fallback for `prefers-color-scheme: dark`
- **Toggle**: Moon/Sun icon button in the site header
- **No Hydration Errors**: Theme applied after React mount for clean server-side rendering

## Environment Variables
The following environment variables are required and stored securely in Replit Secrets:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `ADMIN_PASSWORD` - Password for admin section access

Optional:
- `NEXT_PUBLIC_APP_URL` - Override the app URL for magic links
- `NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO` - Custom redirect for email confirmations

## Development
The development server runs on port 5000 and binds to 0.0.0.0 for Replit compatibility:
```bash
npm run dev
```

## Production Deployment
The app is configured for autoscale deployment on Replit:
- **Build**: `npm run build`
- **Start**: `npm run start` (runs on port 5000)

## Database
This project uses Prisma with Supabase PostgreSQL. Schema is located in `prisma/schema.prisma`.

Key commands:
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed the database

## Security Notes
- Environment variables are properly separated (NEXT_PUBLIC_* for client, others for server)
- Admin routes protected with password authentication
- Supabase Row Level Security (RLS) enforced
- Magic link authentication for user sign-in
- Service role key only used server-side

## User Preferences
- Port 5000 required for Replit environment
- Uses npm as package manager (npm@10)
- Node.js version: >=20 <21
