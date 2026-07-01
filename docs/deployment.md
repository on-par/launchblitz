# Deployment

This document defines the simplest production deployment for the LaunchBlitz MVP.

## Recommended stack

- `Vercel` for `apps/web`
- `Neon Postgres` or `Supabase Postgres` for the main application database
- `Clerk` for authentication
- `Stripe` for billing

Defer GitHub export and sandboxed build environments until after the MVP is live and validated.

## Vercel project setup

Create a Vercel project connected to:

- GitHub repo: `patrob/launchblitz`
- Framework preset: `Next.js`
- Root Directory: `apps/web`

Recommended build settings:

- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave default for Next.js

Because this repo is a monorepo, Vercel should build from `apps/web` while still resolving the workspace packages in `packages/`.

## Required environment variables

Set these in Vercel for `Production`, `Preview`, and local development as needed:

### App

- `NEXT_PUBLIC_APP_URL`

### Database

- `DATABASE_URL`

### Clerk

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Stripe

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### AI providers

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `PERPLEXITY_API_KEY`

## Local development

1. Copy `.env.example` to `.env.local` at the repo root.
2. Fill in the real credentials.
3. Install dependencies with `npm install`.
4. Start the monorepo with `npm run dev`.
5. Open `http://localhost:3000`.

## Database setup

The DB package is configured for Postgres via Drizzle:

- config: `packages/db/drizzle.config.ts`
- schema: `packages/db/src/schema.ts`

For MVP deployment:

1. Create a Postgres database in Neon or Supabase.
2. Set `DATABASE_URL` in local env and in Vercel.
3. Run Drizzle generation/migration commands from the repo root or `packages/db` once those scripts are added or finalized.

Current code is scaffold-first, so treat the database and auth providers as infrastructure prerequisites while the workflow moves from placeholder to live state.

## MVP deployment flow

1. Push the repo to GitHub.
2. Connect the repo to Vercel.
3. Set the root directory to `apps/web`.
4. Add environment variables.
5. Deploy to a preview URL.
6. Verify:
   - `/` loads the marketing page
   - `/builds` loads the signed-in shell
   - build succeeds with no TypeScript errors
7. Promote to production once the environment is stable.

## What not to add yet

Do not block the MVP on:

- Daytona or per-build sandbox infrastructure
- GitHub export automation
- artifact object storage
- background orchestration beyond what the app strictly needs

Add those only after the deployed MVP proves that the workflow and export model are worth extending.
