# MVP

This document defines the initial LaunchBlitz product scope that should be documented and deployable before secondary exports are added.

## Goal

LaunchBlitz helps a founder move from a raw business idea to a launch-ready landing page handoff in one guided session.

For MVP, the priority is:

- a clear public landing page
- a signed-in dashboard shell
- a staged workflow structure
- a documented deployment path

GitHub export can come later.

## Product shape

### Core flow

1. Idea capture
2. Market validation
3. Customer avatar
4. Positioning
5. Copy deck
6. Brand inputs
7. Lovable export handoff
8. Launch kit

### Public surface

- marketing homepage at `/`
- pricing and FAQ on the homepage
- waitlist capture UX with local confirmation state

### Signed-in surface

- builds list at `/builds`
- build session detail view
- key vault page
- billing page

## MVP outputs

The MVP should treat the workflow as producing structured launch assets, even if some stages are still scaffolded:

- market validation summary
- customer avatar
- positioning notes
- copy deck
- brand input bundle
- Lovable-ready landing page prompt
- launch kit summary

## Deferred features

These are intentionally out of scope until the MVP is deployed and validated:

- GitHub export
- repo scaffolding and commit automation
- per-build sandbox environments
- advanced background job orchestration
- large artifact storage pipeline

## Success criteria

The MVP is ready when:

- the repo is documented clearly enough for setup and deployment
- `apps/web` deploys cleanly to Vercel
- the marketing site is branded and responsive
- the signed-in shell reflects the product direction
- the workflow stages are understandable in-product
- the stack can evolve later without re-platforming
