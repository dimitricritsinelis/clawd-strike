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
- Sitewide champion submissions are enabled by default again, so production no longer hard-rejects `/api/run/start` and `/api/run/finish` on `https://clawd-strike.vercel.app/`.
- `pnpm typecheck`, `pnpm build`, `pnpm verify:skills-contract`, `pnpm smoke:no-context`, and `pnpm --filter @clawd-strike/client exec playwright test playwright/shared-champion.spec.ts` all passed on `2026-03-07`.
- A production deploy was shipped with `.vercelignore` excluding local evidence bundles that were previously breaking `vercel deploy --prod --yes` on the 100 MB file limit.
- Live verification on `2026-03-07` succeeded: `POST /api/run/start` returned `200`, `POST /api/run/finish` accepted a validated `Dimitri` human run at `100`, and `GET /api/high-score` now returns `100`.

## Canonical Playtest URL
- `http://127.0.0.1:5174/?map=bazaar-map&autostart=human`

## Map Approval Status
- `NOT APPROVED`

## How to Run (real commands only)
```bash
pnpm dev
pnpm --filter @clawd-strike/client gen:maps
pnpm typecheck
pnpm build
pnpm verify:skills-contract
pnpm smoke:no-context
pnpm --filter @clawd-strike/client smoke:wave-ammo-reset
pnpm --filter @clawd-strike/client bot:smoke
BASE_URL=http://127.0.0.1:5174 pnpm --filter @clawd-strike/client capture:shots
BASE_URL=http://127.0.0.1:5174 pnpm qa:autonomous
```

## Last Completed Prompt
- Title: Restore production world-champion writes so death-time highscores update sitewide
- Changed: removed the production-only public-run block, updated the public contract and durable decision text, made Playwright use production-like server env for champion coverage, added `.vercelignore` for deploy hygiene, and redeployed Vercel.
- Files: `.vercelignore`, `apps/client/playwright.config.ts`, `apps/client/public/skills.md`, `docs/decisions.md`, `server/highScoreApi.ts`, `server/highScoreRunApi.ts`, `server/highScoreSecurity.ts`
- Validation: `pnpm typecheck`, `pnpm build`, `pnpm verify:skills-contract`, `pnpm smoke:no-context`, `pnpm --filter @clawd-strike/client exec playwright test playwright/shared-champion.spec.ts`, plus live production probes against `/api/run/start`, `/api/run/finish`, and `/api/high-score`.

## Next 3 Tasks
1. Add a repo-routed server/API validation step to local completion and CI so Vercel-only type errors in `api/` or `server/` cannot slip past client-only builds again.
2. Add a small explicit smoke that asserts production-default `run/start` stays enabled when `SHARED_CHAMPION_ENABLE_PUBLIC_RUNS` is unset.
3. Do a quick live browser sanity pass on the canonical site to confirm the HUD/death surfaces visibly refresh the new `100` champion without a hard reload.

## Known Issues / Risks
- Local `pnpm build` still validates only the client bundle; Vercel surfaced a server-side TypeScript warning path that local completion did not cover.
- This machine still cannot provide a true subjective human combat pass from headless automation because pointer lock and WebGL visuals are limited in that path.
