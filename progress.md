Audience: human, implementation-agent
Authority: status
Read when: map, visuals, ai, gameplay, ui, public-contract, perf, tooling, docs
Owns: current branch state, active change tag, canonical run commands, next tasks, known risks
Do not use for: workflow policy, durable rationale, public contract details, archive history
Last updated: 2026-03-07

# progress.md — Clawd Strike Status

## Active Change Tag
- `tooling`

## Current Status (<=10 lines)
- Fixed the production CSP regression that was turning embedded-texture GLB models white on Vercel.
- Commit `7d4f723` is on `main` and has been pushed to `origin/main`.
- `https://clawd-strike.vercel.app` now serves the corrected CSP header with `connect-src 'self' blob:`.
- Required gates passed before release: `pnpm typecheck` and `pnpm build`.
- Local static-server validation with the patched CSP passed.
- A fresh live Playwright repro under `artifacts/weapon-white-live-fixed-20260307T1214/` no longer emits the CSP / `GLTFLoader` blob texture errors seen in `artifacts/weapon-white-live/`.

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
pnpm --filter @clawd-strike/client bot:smoke
BASE_URL=http://127.0.0.1:5174 pnpm --filter @clawd-strike/client capture:shots
BASE_URL=http://127.0.0.1:5174 pnpm qa:autonomous
```

## Last Completed Prompt
- Title: Commit, push, and roll out the CSP fix to production
- Changed: committed the CSP fix as `7d4f723`, pushed `main`, and verified that production now serves the corrected header plus no longer logs blob texture load failures in the live Playwright repro.
- Files: `vercel.json`, `docs/security.md`, `progress.md`
- Validation: `pnpm typecheck`, `pnpm build`, live header check via `curl -I https://clawd-strike.vercel.app`, local patched-CSP Playwright repro under `artifacts/weapon-white-local-csp-20260307T1206/`, and live Playwright repro under `artifacts/weapon-white-live-fixed-20260307T1214/`.

## Next 3 Tasks
1. Do a real pointer-lock human pass on the live site to confirm the AK and enemy materials look correct in an actual WebGL session.
2. Resume the separate `bot:smoke` stall investigation now that the production visual regression is cleared.
3. Consider excluding large local artifact folders from manual Vercel CLI uploads to avoid multi-GB source deployments.

## Known Issues / Risks
- Any future CSP tightening must preserve `blob:` under `connect-src` while embedded-texture `.glb` assets remain in use.
- The separate `bot:smoke` stall remains unresolved and is unrelated to this visual regression.
