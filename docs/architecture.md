# Architecture

## Startup and runtime

[main.ts](../apps/client/src/main.ts) owns the launch state and loading-screen transition. It starts asset warmup while the loading UI is visible. On launch it dynamically imports [bootstrap.ts](../apps/client/src/runtime/bootstrap.ts), awaits any warmup result, and creates the runtime before revealing the canvas. A failed launch returns an error banner to the loading screen.

The runtime assembles the map, renderer, player/input, weapon/audio, enemies, HUD, and public agent hooks. Helpers under [runtime/bootstrap](../apps/client/src/runtime/bootstrap/) separate asset loading, HUD creation, score storage, runtime state types, and map/scene telemetry from the startup coordinator. [OrientationGuard.ts](../apps/client/src/shared/OrientationGuard.ts) shares the loading-screen and gameplay rotation overlay; `src/shared/runtimeTextApi.ts` owns their shared text-API version. [Game.ts](../apps/client/src/runtime/game/Game.ts) owns core simulation/rendering behavior; bootstrap connects those systems and their lifecycle. Browser startup and shader readiness are separate from the first user interaction that unlocks audio or pointer lock.

Software GL stages shader compilation and texture uploads, then completes and retires one hidden initialization draw before reporting ready. The draw initializes geometry, shadow and postprocessing paths that compilation alone leaves lazy. Software uses single-sample framebuffers; hardware retains supported MSAA and canvas antialiasing. Both paths keep the complete scene and its effects.

## Map and asset flow

Map modules are grouped by responsibility under `runtime/map/`: `spec`, `world`, `floors`, `walls`, `architecture`, `sections`, `props`, and `atmosphere`.

The source files in [assets-src/maps/bazaar-map](../apps/client/assets-src/maps/bazaar-map/) pass through [gen-map-runtime.mjs](../apps/client/scripts/gen-map-runtime.mjs). It validates and compiles the spec and writes the committed `public/maps/bazaar-map/map_spec.json` and `shots.json`, with source provenance. The build uses those outputs; `check:maps` detects drift.

[loadMap.ts](../apps/client/src/runtime/map/spec/loadMap.ts) loads and validates runtime data. `buildBlockout` creates the collision foundation, traversal geometry, and base visuals. Authored facade models replace designated procedural spans. `buildProps` installs compiled dressing and the authored shop colliders. The atmosphere overlay adds render-only market details, clutter, palms, and overhead elements. [Map](map.md) describes the ownership and clearance boundaries.

The loaders select map-used model/material IDs rather than treating each catalog as a request list. Model URLs, direct texture consumers, shared facade textures, and warmup all matter when removing an asset. Runtime readiness checks are not a substitute for inspecting missing or incorrect visuals.

## Rendering

The scene uses a desert daylight rig, authored surface materials, weathering, and a separate weapon viewmodel camera. [SceneDepthGtaoPass.ts](../apps/client/src/runtime/render/SceneDepthGtaoPass.ts) reuses scene depth, evaluates ambient occlusion on a CSS-pixel grid, and upsamples it with depth awareness.

Facade GLBs reference content-addressed shared textures. [glbTextures.mjs](../scripts/assets/lib/glbTextures.mjs) writes them; [sharedGltfTextures.ts](../apps/client/src/runtime/render/models/sharedGltfTextures.ts) shares runtime texture instances to avoid duplicate uploads.

Desktop `quality=high` uses a pixel-ratio cap of 2, 2k surface textures by default, and GTAO. `quality=standard` caps the ratio at 1.1, defaults to 1k textures, and leaves GTAO off unless requested. Device DPR still limits the actual ratio, and mobile has separate caps. [DynamicResolution.ts](../apps/client/src/runtime/render/DynamicResolution.ts) lowers resolution in steps when frame time misses the target, then probes upward; a reduction that does not help is reversed. QA, review shots, and agent runs default to fixed resolution. These policies are code behavior, not performance guarantees for a particular device.

## Enemies and combat

`EnemyManager` owns the active enemy population. `EnemyController`, `TacticalGraph`, and `enemyLineOfSight` provide decision making, navigation, and visibility. `EnemyVisual` loads the skinned raider and uses a capsule fallback if that visual is unavailable. Weapon firing, reload state, hit-zone damage, and feel tuning are separate modules; see [weapons](weapons.md).

The gameplay tuning profile supplies player economy and bot behavior. Its fingerprint is part of the shared-champion board identity. Cosmetic changes must not accidentally alter that baseline.

## Public browser contract

[skills.md](../apps/client/public/skills.md) is authoritative for the public API and permitted observations. The entry points include `window.agent_observe`, `agent_apply_action`, `render_game_to_text`, and `advanceTime`; `?autostart=agent&name=...` selects an agent run. Internal QA state is not part of this public contract.

Compatibility time advances keep the 60 Hz simulation and weapon-animation substeps, then render only the final state of the batch. A 500 ms advance therefore submits one frame rather than thirty synchronous full-map frames. The normal animation loop continues independently, as documented in the public contract.

The exporter in `scripts/sdk/` packages a legacy helper snapshot. Its [README](../scripts/sdk/template/README.md) records the missing current learning-workflow features; exporting it does not establish full `agentic-gameplay-v1` conformance.

## URL controls

[UrlParams.ts](../apps/client/src/runtime/utils/UrlParams.ts) parses map, mode/autostart, name, spawn, shot, seed, debug/perf, viewmodel visibility, floor/wall modes, surface resolution, god mode, AO, quality/gfx, and dynamic-resolution settings. The same module owns launch/loading parameters, QA profile selection, and the `audio`, `shadows`, `bootGate`, and `qaTargets` controls. Check their consumers and parser tests before adding or renaming a flag.

Use `floors=blockout&walls=blockout` for material diagnostics. Local runs use normal combat unless `god=1` explicitly requests unlimited health. Automated and agent runs normally suppress audio; `audio=1` requests it subject to browser audio activation rules.

## Backend

Vercel handlers under [api](../api/) call shared server modules:

- `GET /api/high-score` reads the champion. Direct `POST /api/high-score` returns 403.
- `/api/run/start` and `/api/run/finish` implement validated run submission.
- `/api/admin/stats/overview`, `/runs`, `/names`, and `/daily` require the stats admin bearer token.

[highScoreStoreImpl.ts](../server/highScoreStoreImpl.ts) preserves the store entry points. Implementations under [server/store](../server/store/) separate types, SQL, record conversion, connection selection, in-memory storage, schema maintenance, and Postgres operations. The deployed store uses Postgres. Privacy hashing uses `PRIVACY_HASH_SECRET`. [highScoreVitePlugin.ts](../server/highScoreVitePlugin.ts) exposes the same handlers during development with an explicit in-memory store. It is not a local Postgres integration test. See [deployment](deployment.md) for environment and operational boundaries.
