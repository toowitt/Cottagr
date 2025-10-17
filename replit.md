# Cottagr - Cottage Management Platform

## Overview
Cottagr is a comprehensive cottage/vacation property management system built with Next.js, Supabase, and Prisma. It provides families with a single operating system for managing stays, expenses, and shared knowledge about their properties.

## Recent Changes
**October 17, 2025** - CottagrBlog Implementation
- Built native blog functionality inside the authenticated area
- Created blog database schema with categories, tags, and article management
- Implemented admin interface for creating and managing blog articles
- Created public blog listing and article reading pages with dark mode support
- Added 4 default categories: Legalities, How-Tos, Wills & Inheritance, Family Transitions
- Seeded sample article about cottage co-ownership
- Integrated blog navigation in header for authenticated users

**October 17, 2025** - Theme System Implementation
- Implemented automatic light/dark mode based on OS preferences
- Tailwind dark mode responds to system `prefers-color-scheme` media query
- CSS variables automatically update based on OS theme setting
- Smooth 200ms transitions for all theme-related properties
- No manual toggle - theme follows OS preferences automatically

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
│   │   ├── blog/    # Blog article management
│   │   ├── bookings/
│   │   ├── expenses/
│   │   └── knowledge-hub/
│   ├── api/         # API routes
│   │   ├── blog/    # Blog API endpoints
│   │   ├── bookings/
│   │   └── expenses/
│   ├── blog/        # Public blog pages
│   │   └── [slug]/  # Individual article pages
│   ├── bookings/    # Booking management
│   ├── expenses/    # Expense tracking
│   ├── knowledge-hub/ # Shared knowledge base
│   ├── login/       # Authentication
│   ├── layout.tsx   # Root layout with theme support
│   └── globals.css  # Global styles with CSS variables
├── components/      # Reusable React components
│   └── SiteHeader.tsx     # Header with navigation
└── lib/            # Utility functions and clients
    ├── auth/       # Authentication helpers
    ├── supabase/   # Supabase client configurations
    ├── money.ts    # Money/currency utilities
    ├── prisma.ts   # Prisma client setup
    └── validation.ts # Zod schemas
```

## Theme System
The app implements automatic light/dark mode based on OS preferences:
- **OS Integration**: Automatically follows system `prefers-color-scheme` setting
- **CSS Variables**: Core colors defined in `globals.css` with media query overrides
- **Tailwind Dark Mode**: Uses `media` strategy to respond to OS preferences
- **Smooth Transitions**: 200ms cubic-bezier transitions on all color changes
- **No Manual Toggle**: Theme changes when user switches OS light/dark mode
- **Clean Implementation**: No JavaScript theme management, purely CSS-based

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
- `npx tsx prisma/seed-blog.ts` - Seed blog categories and sample article

## Blog Feature (CottagrBlog)
CottagrBlog is a native content management system for cottage-related articles:

**Features:**
- Article management with draft, published, and archived states
- Category system for organizing content (Legalities, How-Tos, etc.)
- Tag support for flexible content organization
- Reading time estimation
- View count tracking
- Related articles suggestions
- Dark mode support

**Admin Access:**
- Manage articles at `/admin/blog`
- Create categories and articles
- Publish, unpublish, archive, or delete content
- Edit existing articles with markdown support

**Public Access:**
- Browse articles at `/blog`
- Filter by category
- Read individual articles at `/blog/[slug]`
- View related articles

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
