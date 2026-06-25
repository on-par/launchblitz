# LaunchBlitz

Monorepo scaffold for a multi-stage AI product that takes a user from idea capture to launch assets.

Packages are published under the `@launchblitz/*` scope. The intended production
domain is **launchblitz.online** (reserved for future DNS work).

## Workspace

- `apps/web` - Next.js 16 application shell (`@launchblitz/web`)
- `packages/workflow` - Stage runners and provider adapters (`@launchblitz/workflow`)
- `packages/ui` - Shared UI primitives for stage editing (`@launchblitz/ui`)
- `packages/db` - Drizzle schema and DB entrypoint (`@launchblitz/db`)
- `e2e` - Playwright smoke coverage

## First steps

1. Install dependencies with `npm install`.
2. Copy `.env.example` into `.env.local` where needed.
3. Start the app with `npm run dev`.

## Scripts

Run from the repo root; all fan out across the workspace via Turborepo:

- `npm run dev` - start the Next.js app in development
- `npm run build` - production build of every package and the app
- `npm run lint` - ESLint (app) and type-aware lint (packages)
- `npm run typecheck` - `tsc --noEmit` across the workspace
- `npm run test` - Vitest unit tests
- `npm run test:e2e` - Playwright smoke tests (boots the app automatically)
