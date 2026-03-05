# progress.md — MVP Blockout Branch

## Current Status (<=10 lines)
- Design packet root confirmed: `/Users/dimitri/Desktop/clawd-strike/docs/map-design`.
- Runtime map is generated from `docs/map-design/specs/map_spec.json` into `apps/client/public/maps/bazaar-map/` via `pnpm --filter @clawd-strike/client gen:maps`.
- Canonical runtime remains `bazaar-map` on the Vite client at port `5174`.
- Spawn hero facade pass is in: `ph_whitewashed_brick_warm` remains the spawn hero wall, spawn transition facades now use one dustier sibling, and trim hierarchy is calmer.
- Spawn facades now use deterministic hero states (`clean`, `balcony_light`, `balcony_heavy`) derived from runtime window patterns instead of the old mirrored odd-distance fill.
- Balcony language is now thin-slab + parapet + rail + bracket, not boxed wall extrusions.
- Hero plaster shader profile now adds top bleach, bottom dust tint, lower-frequency roughness breakup, and trim contact darkening.
- `pnpm typecheck` and `pnpm build` pass on this state.
- Workspace state for the spawn hero facade pass is now committed and pushed on `map-dev-2` (2026-03-05).
- Map approval still pending traversal/readability signoff.

## Canonical Playtest URL
- `http://127.0.0.1:5174/?map=bazaar-map&autostart=human`

## Map Approval Status
- `NOT APPROVED`

## How to Run (real commands only)
```bash
pnpm dev
pnpm typecheck
pnpm build
BASE_URL=http://127.0.0.1:5174 AGENT_NAME=SmokeRunner pnpm --filter @clawd-strike/client smoke:agent
```

## Last Completed Prompt
- Title: Spawn hero facade hierarchy pass
- Changed: localized spawn-facing wall palette to hero warm + dusty sibling; reduced continuous stone edge armor; removed spawn pilasters; added deterministic spawn facade states and non-mirrored window/balcony rhythm; rebuilt balconies with dedicated slab/parapet/end-cap/bracket pieces; added plaster-specific shader controls for top bleach, dust tint, roughness breakup, and trim contact darkening.
- Files touched: `apps/client/src/runtime/map/wallDetailPlacer.ts`, `apps/client/src/runtime/map/wallDetailKit.ts`, `apps/client/src/runtime/map/buildPbrWalls.ts`, `apps/client/src/runtime/map/wallMaterialAssignment.ts`, `apps/client/src/runtime/map/wallShaderProfiles.ts`, `apps/client/src/runtime/render/materials/applyWallShaderTweaks.ts`, `apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/materials.json`
- Screenshots: `artifacts/screenshots/P148_spawn_hero_facade_hierarchy/before.png`, `artifacts/screenshots/P148_spawn_hero_facade_hierarchy/after.png`
- Validation: `pnpm typecheck` + `pnpm build` clean; compare shot updated; agent-mode movement/collision smoke clean with no console warnings/errors.

## Next 3 Tasks
1. Roll the approved hero-facade grammar into the next visible main-lane facades without widening into a full material-library churn pass.
2. Add story props and decals that support the calmer plaster facades instead of competing with them.
3. Run a true desktop human-mode pointer-lock smoke outside automation to confirm click-to-lock and mouse-look UX.

## Known Issues / Risks
- `gen:maps` still emits expected clear-zone anchor warnings for several landmark/open-node anchors.
- Automated Chrome in this environment would not grant human-mode pointer lock, so movement/collision were re-verified through agent mode and compare-shot captures instead.
- Warmup remains fail-open by design: asset preload failures warn and continue with fallback behavior.
