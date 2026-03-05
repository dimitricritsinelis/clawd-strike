# progress.md — MVP Blockout Branch

## Current Status (<=10 lines)
- Design packet root confirmed: `/Users/dimitri/Desktop/clawd-strike/docs/map-design`.
- Runtime map is generated from `docs/map-design/specs/map_spec.json` into `apps/client/public/maps/bazaar-map/` via `pnpm --filter @clawd-strike/client gen:maps`.
- Loading-screen handoff starts visible-asset warmup immediately and runtime blocks on warmup completion (fail-open warnings on warmup errors).
- Timer HUD is hard-locked to top-center (`14px`) and no longer shifts for pointer-lock/fullscreen banner heuristics.
- Agent-mode automation is headless-safe and verified in bundled Chromium: runtime reaches `mode:"runtime"` with `map.loaded===true` even when `render.webgl===false`, and agent APIs continue to work.
- Death/reset transition is verified: `Play Again` no longer causes `gameOver.visible` flicker during respawn transition.
- `/skills.md` now provides copy/pasteable UI + autostart flows and a headless-safe Playwright harness (Chrome channel fallback to bundled Chromium).
- Map approval remains pending traversal/readability signoff.

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
- Title: Complete spawn outer buildings — add enclosure geometry (branch: map-dev-2)
- Problem: Spawn outer buildings (2-story, 6m) looked like flat facade walls with floating 4m-deep roof overhangs — no back wall or side return walls to close off the building volume
- Fix: Added `placeBuildingEnclosure(ctx)` function in `wallDetailPlacer.ts` that places 3 boxes per qualifying wall segment: back wall (parallel, offset 4m inward), and 2 return walls (perpendicular, at segment endpoints). Gated to `isSpawnOuterWall` (spawn_plaza non-entry walls) and `isConnectorSpawnFacing` (connector walls facing spawn, not main lane)
- New constant: `ENCLOSURE_WALL_THICKNESS = 0.25` (visual only, thinner than collision walls)
- New context fields: `isSpawnOuterWall`, `isConnectorSpawnFacing` on `SegmentDecorContext`
- File changed: `apps/client/src/runtime/map/wallDetailPlacer.ts`
- Verified: `pnpm typecheck` + `pnpm build` clean; A-spawn and B-spawn buildings look like complete 2-story structures from all angles; roof caps sit on solid enclosed volumes; no floating geometry; no console errors

## Previous Completed Prompt
- Title: Direction-based connector wall heights — fix deleted 3rd story regression (branch: map-dev-2)
- Problem: Previous blanket `2 * STORY_HEIGHT_M` for all connector walls also reduced the back faces of 3-story main-lane buildings that resolve to connector zones, deleting their top story; side-hall sightlines to spawn building backs looked fake
- Fix: Added `isConnectorMainLaneFacing` boolean (dot product of wall inward normal with zone→mapCenter vector) to `resolveSegmentWallHeight()` — main-lane-facing connector walls stay at 9m (3 stories), spawn-facing connector walls at 6m (2 stories)
- All 4 connectors verified: CONN_SW/SE north walls (z=12) → 9m, south walls (z=8) → 6m; CONN_NW/NE south walls (z=70) → 9m, north walls (z=74) → 6m
- File changed: `apps/client/src/runtime/map/wallDetailPlacer.ts`
- Verified: `pnpm typecheck` + `pnpm build` clean; A-spawn and B-spawn correct; no 3-story towers at spawn corners; main-lane building 3rd story preserved; no console errors

## Previous Completed Prompt
- Title: Fix 3-story connector towers at spawn corners (branch: map-dev-2)
- Change: `resolveSegmentWallHeight()` connector case lowered from `3 * STORY_HEIGHT_M` (9m) to `2 * STORY_HEIGHT_M` (6m)
- All 4 connector zones (CONN_SW/SE/NW/NE) now match the adjacent spawn outer wall height (6m / 2 stories)
- Side-hall inner walls (9m) and spawn entry walls (9m) unchanged — the height step at the connector/side-hall junction is at an interior corner and reads naturally
- File changed: `apps/client/src/runtime/map/wallDetailPlacer.ts`
- Verified: `pnpm typecheck` + `pnpm build` clean; no 3-story towers at spawn corners; both A-spawn and B-spawn verified; main lane unaffected

## Previous Completed Prompt (Facade Overhaul)
- Title: Bazaar facade overhaul — Dust2-quality plaster-dominant walls (branch: map-dev-2)
- Step 1: All wall segments now render PBR when `wallMode=pbr` — removed zone-type filter that kept spawns/connectors/cuts as blockout Lambert
- Step 2: Extended material combos to all 16 zones; flipped stone-wall zones (spawns, connectors, cuts) to plaster walls with stone trim only at base + corners
- Step 3: Re-tagged trim materials — cornice, parapet, roof cap, string course, pilaster now use wall plaster (not stone); only plinth_strip + corner_pier + balcony keep stone trim
- Step 4: Pilasters skip placement on all zones except spawn_plaza; string courses limited to 1 per facade
- Step 5: Added dirt/age ground gradient shader — quadratic darkening + roughness boost within 0.8m of floor, wired into both wall and detail PBR paths
- Step 6: Added 3 material manifest variants (ph_whitewashed_brick_cool, ph_whitewashed_brick_warm, ph_sandstone_blocks_06) for per-zone differentiation without new texture files
- Files changed: `buildBlockout.ts`, `wallMaterialAssignment.ts`, `wallDetailPlacer.ts`, `applyWallShaderTweaks.ts`, `buildPbrWalls.ts`, `wallDetailKit.ts`, `materials.json`
- Verified: `pnpm typecheck` + `pnpm build` clean; all walls PBR; plaster-dominant facades; stone at base+corners only; no pilaster grid; dirt gradient visible

## Previous Completed Prompt
- Title: Desert lighting overhaul — Dust2-style atmosphere (branch: map-dev-2)
- Phase 1: Fixed shadow reliability — `shadowMap.needsUpdate=true` on init + 20-frame warmup counter in bootstrap step loop
- Phase 2: Desert lighting rig — reduced ambient (0.52→0.15), hemi (1.0→0.45), cool blue fill (0xBFD9FF, 0.18), stronger sun (2.0, 4096 shadow map), fog density 0.005
- Phase 3: Procedural Sky via Three.js `Sky` object (turbidity=10, rayleigh=1.0, desert-tuned)
- Phase 4: SSAO contact shadows via EffectComposer pipeline (RenderPass→SSAOPass→OutputPass), toggleable with `ao=0/1` URL param (default on)
- Shader fix: PBR wall/glass `onBeforeCompile` hooks now compute world position locally (`wallWp`/`glassWp`) instead of relying on `worldPosition` (conditional on `USE_SHADOWMAP`)
- Files changed: `Renderer.ts`, `Game.ts`, `bootstrap.ts`, `UrlParams.ts`, `applyWallShaderTweaks.ts`, `applyWindowGlassShaderTweaks.ts`
- Verified: `pnpm typecheck` + `pnpm build` clean; SSAO on/off both error-free; shadows, sky gradient, contact darkening all visible

## Previous Completed Prompt
- Title: Spawn outer buildings reduced to 2 stories (branch: map-dev-2)
- Change: `resolveSegmentWallHeight()` now returns `2 * STORY_HEIGHT_M` (6 m) for `spawn_plaza` outer walls (back wall + side walls) and `3 * STORY_HEIGHT_M` (9 m) for the entry wall (the bazaar-facing boundary). Entry wall detected via `(centerZ − spawnCenterZ) × (mapCenterZ − spawnCenterZ) > 0`. Verified with runtime console logs: back walls (Z=82/Z=4) → 6 m, side walls (Z=78/Z=10) → 6 m, entry walls (Z=69/Z=13) → 9 m.
- File changed: `apps/client/src/runtime/map/wallDetailPlacer.ts`
- Verified: `pnpm typecheck` + `pnpm build` clean; spawn side/back buildings visibly 2-story; no console errors

## Previous Completed Prompt
- Title: Center windows vertically between trim pieces (branch: map-dev-2)
- Change: Windows now center vertically in the clear space between the horizontal trim below (plinth for ground floor, string course for upper floors) and the trim above (string course or cornice). Replaced fixed `sillOffset` RNG with per-story computation: `sillY = midpoint(belowTrimTop, aboveTrimBottom) - windowH/2`. Side-hall windows (no plinth) center from Y=0. RNG call preserved for determinism.
- File changed: `apps/client/src/runtime/map/wallDetailPlacer.ts`
- Verified: `pnpm typecheck` + `pnpm build` clean; ground floor windows visibly more centered; no console errors

## Previous Completed Prompt
- Title: Clean 90° corner trim — corner piers wrap building corners (branch: map-dev-2)
- Change: Reverted bad strip/roof-cap extensions that jutted 4m past building edges. Instead, corner piers now serve as the corner-wrapping element: at detected 90° corners (perpendicular segment junctions), piers sit flush at the segment boundary (marginM→0) and their depth is increased to `max(pierD, plinthD, courseD, corniceD, parapetD)` so they protrude past all strip faces, visually bridging the perpendicular wall junction. Horizontal strips unchanged (use `ctx.frame.lengthM`, no extensions).
- File changed: `apps/client/src/runtime/map/wallDetailPlacer.ts`
- Verified: `pnpm typecheck` + `pnpm build` clean; no overhanging geometry; corner piers form solid 90° blocks; no console errors

## Previous Completed Prompt
- Title: Standardize trim dimensions by story class (branch: map-dev-2)
- Change: replaced per-segment `rng.range()` dim calls with a `TRIM_DIMS` lookup table keyed by story count (1/2/3). All RNG calls still made (values discarded) to preserve determinism. Corner piers now run full wall height — removed floating cap geometry while still consuming its RNG.
- Affected functions: `placeCornerPiers`, `placeParapetCap`, `placePlinthStrip`, `placeStringCourses`, `placeCorniceStrip`, `placePilasters`
- File changed: `apps/client/src/runtime/map/wallDetailPlacer.ts`
- Verified: `pnpm typecheck` + `pnpm build` clean; all 3-story buildings show identical trim proportions; no console errors

## Previous Completed Prompt
- Title: Disable PBR wall texture on main lanes + spawns; keep on side halls (branch: map-dev-2)
- Change: `buildBlockout.ts` now splits `wallSegments` by zone type when `wallMode === "pbr"`: `side_hall` segments go to `buildPbrWalls`; all others fall back to `createWallInstances` (blockout color)
- Exported `toSegmentFrame` + `resolveSegmentZone` from `buildPbrWalls.ts` for the split logic
- Files changed: `apps/client/src/runtime/map/buildBlockout.ts`, `apps/client/src/runtime/map/buildPbrWalls.ts`
- Verified: `pnpm typecheck` clean; main lane/spawn walls = flat blockout; side hall walls = PBR texture retained

## Previous Completed Prompt
- Title: Port window placement density from map-dev → map-dev-2 (branch: map-dev-2)
- Change: secondary (doorless) walls now place windows at every other bay from center (`dist = 1, step +2`) instead of every 3rd bay (`dist = 3, step +3`) — matches map-dev `computeFacadeSpec` logic
- File changed: `apps/client/src/runtime/map/wallDetailPlacer.ts` (line ~613)
- Verified: `pnpm typecheck` clean, visual check at canonical URL confirms denser window pattern on all doorless building facades

## Previous Completed Prompt
- Title: Fix see-through PBR walls — port winding-order fix from map-dev (branch: map-dev-2)
- Root cause: `appendSegmentFace()` used a fixed triangle winding order. When `sign(end−start) × outward` was negative, the face was back-facing and culled by Three.js, making the wall invisible.
- Fix: compute `product = (segment.end - segment.start) * segment.outward`; flip index order when winding disagrees with outward normal.
- File changed: `apps/client/src/runtime/map/buildPbrWalls.ts` (lines 99–106 → winding-flip block)
- Verified: `pnpm typecheck` + `pnpm build` clean

## Previous Completed Prompt
- Title: Make Agent Mode headless-safe + update /skills.md playbook
- Implemented:
  - `Renderer` now runs with a no-WebGL fallback canvas; render calls no-op and perf counters return zeros when WebGL is unavailable; `hasWebGL` is exposed.
  - Runtime text state now includes `render.webgl`; death-screen re-show is suppressed during respawn transitions to prevent reset flicker.
  - Weapon audio extension probing now prefers `.mp3` before `.ogg`.
  - `apps/client/public/skills.md` includes UI selectors flow, autostart URL flow, headless-safe Playwright harness, readiness detection via `render_game_to_text()`, reset guidance, and `s.render.webgl` note.
- Touched files: `apps/client/src/runtime/render/Renderer.ts`, `apps/client/src/runtime/bootstrap.ts`, `apps/client/src/runtime/audio/WeaponAudio.ts`, `apps/client/public/skills.md`, `progress.md`.
- Validation completed: `pnpm typecheck` and `pnpm build` passed.
- Smoke checks completed:
  - `BASE_URL=http://127.0.0.1:5174 AGENT_NAME=SmokeRunner pnpm --filter @clawd-strike/client smoke:agent` passed.
  - Bundled Chromium headless probe passed in both default and forced no-WebGL (`--disable-gpu --disable-webgl`) runs; runtime remained operational and agent loop APIs worked.
  - Respawn probe passed (`sawDeath=true`, `clickedPlayAgain=true`, `transitionedAlive=true`, `flickerDetected=false`).
  - Audio probe in Chrome channel reported zero `.ogg` requests and zero `.ogg` 404s.
- Screenshots:
  - `artifacts/screenshots/2026-03-02-agent-mode-headless-safe/before.png`
  - `artifacts/screenshots/2026-03-02-agent-mode-headless-safe/after.png`

## Next 3 Tasks
1. Add decals/props for storytelling (posters, painted numbers, stains under windows, cloth awnings) to break wall uniformity.
2. Add fog/haze pass for warm dusty atmosphere that compresses contrast at distance.
3. Run a manual desktop pointer-lock pass (non-headless) to verify movement/look/collision UX and no console noise.

## Known Issues / Risks
- `gen:maps` still emits expected clear-zone anchor warnings for several landmarks/open-node anchors.
- Automated checks cannot fully validate OS/browser pointer-lock UX; manual verification remains required.
- Warmup is fail-open by design: if an asset preload fails, runtime continues with warning + fallback behavior.
- Headless automation may run with `s.render.webgl === false`; screenshot-based checks should prefer headed/system Chrome when visuals matter.
- SSAO is enabled by default (`ao=1`); toggle off with `ao=0` if performance is a concern on lower-end hardware.
