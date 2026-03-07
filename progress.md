Audience: human, implementation-agent
Authority: status
Read when: map, visuals, ai, gameplay, ui, public-contract, perf, tooling, docs
Owns: current branch state, active change tag, canonical run commands, next tasks, known risks
Do not use for: workflow policy, durable rationale, public contract details, archive history
Last updated: 2026-03-07

# progress.md — Clawd Strike Status

## Active Change Tag
- `public-contract`

## Current Status (<=10 lines)
- Added a sitewide shared champion flow with `/api/high-score`, a Postgres-backed Vercel store, and local Vite dev middleware for `/api/high-score`.
- Loading screen, HUD, death screen, and `agent_observe()` now expose the same `sharedChampion` record without changing local `score.best`.
- The overwrite rule is strict-greater only; ties keep the existing holder.
- Added Playwright coverage for API overwrite rules, cross-context champion visibility, and API-unavailable fallback.
- `pnpm typecheck`, `pnpm build`, `BASE_URL=http://127.0.0.1:5175 pnpm verify:skills-contract`, `BASE_URL=http://127.0.0.1:5175 pnpm smoke:no-context`, and `pnpm test:playwright` all pass locally.
- Neon Postgres is attached in Vercel, `sql/shared_champion.sql` has been applied, and `https://clawd-strike.vercel.app/api/high-score` now returns `200 {"champion":null}`.
- Production now shows `No champion yet` / `First score claims the board` instead of `OFFLINE`, so the first real higher score will create the shared champion record.

## Canonical Playtest URL
- `http://127.0.0.1:5174/?map=bazaar-map&autostart=human`

## Map Approval Status
- `NOT APPROVED`

## How to Run (real commands only)
```bash
pnpm dev
pnpm --filter @clawd-strike/client gen:maps
pnpm --filter @clawd-strike/client gen:layout-reference
pnpm typecheck
pnpm build
pnpm test:playwright
pnpm smoke:no-context
pnpm verify:skills-contract
pnpm qa:completion
pnpm --filter @clawd-strike/client bot:smoke
BASE_URL=http://127.0.0.1:5174 AGENT_NAME=SmokeRunner pnpm --filter @clawd-strike/client smoke:agent
BASE_URL=http://127.0.0.1:5174 pnpm --filter @clawd-strike/client capture:shots
BASE_URL=http://127.0.0.1:5174 pnpm qa:autonomous
```

## Last Completed Prompt
- Title: Add a sitewide shared champion record backed by Vercel API storage
- Changed: added `/api/high-score`, shared champion storage/middleware/client state, loading-screen and runtime champion UI, `sharedChampion` public payloads, `/skills.md` contract updates, and Playwright coverage for overwrite rules and cross-context visibility.
- Files: `api/high-score.ts`, `server/highScore*.ts`, `apps/shared/highScore.ts`, loading-screen/runtime UI + contract files, `progress.md`, `docs/decisions.md`
- Validation: `pnpm typecheck`, `pnpm build`, `BASE_URL=http://127.0.0.1:5175 pnpm verify:skills-contract`, `BASE_URL=http://127.0.0.1:5175 pnpm smoke:no-context`, `pnpm test:playwright`

## Next 3 Tasks
1. Verify a real run on production creates the first shared champion and that a second browser context sees the same holder and score.
2. Add a small protected admin/debug seed route or internal script only if you need deterministic champion seeding without gameplay.
3. Start phase 2 anti-cheat work by extracting deterministic run verification inputs and a headless score-validation path before accepting champion submissions.

## Known Issues / Risks
- `gen:maps` still emits expected clear-zone anchor warnings for several landmark/open-node anchors.
- The implementation assumes the Vercel project root is the repo root so `api/high-score.ts` is deployed; if the dashboard root directory is `apps/client`, the route must be moved or the setting changed.
- CI still does not enforce the `public-contract` local gates (`verify:skills-contract`, `smoke:no-context`, Playwright); those are only local completion policy right now.
- Port `5174` was already occupied in this environment during validation, so contract and smoke checks were run against a clean Vite instance on `5175` via `BASE_URL=http://127.0.0.1:5175`.
- Production was deployed from a clean rsynced workspace under `/tmp/clawd-strike-vercel-fJKlKw` to avoid oversized local artifact uploads; future direct CLI deploys should keep `artifacts/` out of the upload set.
- The current bot overhaul is still wave-survival AI, not full T/CT objective bots; there is no bomb logic, grenade usage, jump-spot system, or objective planner yet.
