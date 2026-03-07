Audience: human, implementation-agent
Authority: status
Read when: map, visuals, ai, gameplay, ui, public-contract, perf, tooling, docs
Owns: current branch state, active change tag, canonical run commands, next tasks, known risks
Do not use for: workflow policy, durable rationale, public contract details, archive history
Last updated: 2026-03-07

# progress.md — Clawd Strike Status

## Active Change Tag
- `ui-flow`

## Current Status (<=10 lines)
- Adjusted the kill notification HUD so it matches the score HUD width and horizontal alignment instead of using a separate narrower fixed width.
- `apps/client/src/runtime/ui/KillFeed.ts` now measures the anchored score HUD and mirrors its width plus left edge.
- Local visual verification passed with a debug-injected headshot kill screenshot under `apps/artifacts/hud-width-check-20260307T1221/shot-0.png`.
- The focused geometry probe reports exact symmetry: score HUD width `332px`, kill notification width `332px`, same left/right bounds.
- Required gates pass for this task: `pnpm typecheck`, `pnpm build`, and `pnpm test:playwright` (`11 passed`, `1 skipped` manual pointer-lock spec).
- Commit `ede1a26` is on `main`, pushed to `origin/main`, and Vercel production deployment `clawd-strike-3nkr6pc3o-dimitri-projects.vercel.app` completed successfully.
- `https://clawd-strike.vercel.app` is serving the new production build as of 2026-03-07 12:29 PM America/Chicago.

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
- Title: Make the kill notification HUD match the score HUD width
- Changed: updated `apps/client/src/runtime/ui/KillFeed.ts` to anchor width and horizontal alignment to the score HUD instead of hardcoding a smaller notification width, then committed/pushed the change and let Vercel roll the new production deployment.
- Files: `apps/client/src/runtime/ui/KillFeed.ts`, `progress.md`
- Validation: `node ~/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js` local client pass under `artifacts/hud-width-client-pass-20260307T1220/`, focused debug screenshot + width probe under `apps/artifacts/hud-width-check-20260307T1221/`, `pnpm typecheck`, `pnpm build`, `pnpm test:playwright`, `vercel ls clawd-strike`, and `curl -I https://clawd-strike.vercel.app`.

## Next 3 Tasks
1. Do a real pointer-lock human pass on the live site to confirm the AK/enemy materials and the adjusted HUD spacing both look correct in an actual WebGL session.
2. Resume the separate `bot:smoke` stall investigation now that the production visual regression is cleared.
3. Consider excluding large local artifact folders from manual Vercel CLI uploads to avoid multi-GB source deployments.

## Known Issues / Risks
- Any future CSP tightening must preserve `blob:` under `connect-src` while embedded-texture `.glb` assets remain in use.
- The separate `bot:smoke` stall remains unresolved and is unrelated to this visual regression.
