Audience: human, implementation-agent
Authority: status
Read when: map, visuals, ai, gameplay, ui, public-contract, perf, tooling, docs
Owns: current branch state, active change tag, canonical run commands, next tasks, known risks
Do not use for: workflow policy, durable rationale, public contract details, archive history
Last updated: 2026-03-08

# progress.md — Clawd Strike Status

## Active Change Tag
- `bot-ai`

## Current Status (<=10 lines)
- Bot spawning now validates actual enemy footprints against wall/prop colliders and zone interiors instead of only clamping to playable bounds.
- `spawn_cover` and `cover_cluster` anchors now project tactical stand points toward usable zone interior instead of using cover-object centers as literal bot feet positions.
- Final spawn correction now revalidates every placement and replaces any invalid point with the nearest safe tactical fallback before controller reset.
- `pnpm typecheck`, `pnpm build`, and `pnpm --filter @clawd-strike/client bot:smoke` all passed on `2026-03-08`.
- Bot smoke now explicitly fails if initial-spawn or adaptive-respawn bots spawn elevated, out of bounds, outside their expected zone, or intersect a blocking collider.

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
- Title: Stop bots from spawning inside walls, buildings, or on top of them
- Changed: replaced naive spawn jitter with safe footprint search, offset cover-anchor tactical nodes into walkable interior space, added final spawn fallback correction, and extended bot smoke with explicit spawn-validity assertions.
- Files: `apps/client/scripts/bot-intelligence-smoke.mjs`, `apps/client/src/runtime/bootstrap.ts`, `apps/client/src/runtime/enemies/EnemyController.ts`, `apps/client/src/runtime/enemies/EnemyManager.ts`, `apps/client/src/runtime/enemies/TacticalGraph.ts`
- Validation: `pnpm typecheck`, `pnpm build`, `pnpm --filter @clawd-strike/client bot:smoke`.

## Next 3 Tasks
1. Do a true interactive human combat pass from both spawns to confirm live feel and sightline readability remain good after the stricter spawn placement rules.
2. If any authored anchor still forces frequent fallback correction in future maps, promote that to a design-packet cleanup rather than growing runtime exceptions.
3. Consider exposing aggregate spawn-correction counts in a debug HUD so bad authored spawn areas are obvious during map iteration.

## Known Issues / Risks
- This machine still cannot provide a true subjective human combat pass from headless automation because pointer lock and WebGL visuals are limited in that path.
- Runtime spawn safety now depends on tactical nodes remaining present; if a future map graph has fewer than nine safe candidates, spawn will hard-fail instead of silently embedding bots in geometry.
