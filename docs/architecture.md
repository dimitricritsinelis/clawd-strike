# Architecture

## Launch and simulation

The loading screen starts asset warmup, collects a control mode and player name, then imports the runtime. Startup failures return to name entry with a retry message. Bootstrap assembles the scene, input, HUD, audio, enemies and score tracking, and owns the browser hooks and their teardown. [Entry point](../apps/client/src/main.ts) · [Bootstrap](../apps/client/src/runtime/bootstrap.ts)

| Change | Start here |
|---|---|
| Player movement and collision | [PlayerController](../apps/client/src/runtime/sim/PlayerController.ts), [collision solver](../apps/client/src/runtime/sim/collision/Solver.ts) |
| Simulation, weapon updates and drawing | [Game](../apps/client/src/runtime/game/Game.ts), [weapon and animation guide](weapons.md) |
| Enemy behavior, movement and animation | [EnemyManager, EnemyController, TacticalGraph and RaiderAnimation](../apps/client/src/runtime/enemies/) |
| Touch and desktop controls | [Input](../apps/client/src/runtime/input/), [in-game HUD and menus](../apps/client/src/runtime/ui/) |
| Economy, waves and competitive balance | [Gameplay tuning](../apps/client/src/runtime/tuning/gameplayTuning.ts), [shared profile identity](../apps/shared/gameplayProfile.ts) |

Desktop human, mobile human and desktop agent runs have separate profile identities. The balance fingerprint contributes to the tuning revision and leaderboard board key. Update the public gameplay contract when documented mechanics change. [Board keys](../apps/shared/highScore.ts) · [Public contract](../apps/client/public/skills.md)

## World and rendering

The client loads the committed Bazaar map, builds traversal geometry and colliders, then installs facade models, props and atmosphere dressing. The map guide identifies the source for each layer. Asset loading selects model and material IDs used by the scene. Some textures also have direct runtime consumers. [Map](map.md) · [Asset loading](../apps/client/src/runtime/bootstrap/assetLoading.ts) · [Asset pipeline](assets.md)

The world and first-person weapon have separate cameras. Desktop quality controls surface resolution, pixel ratio and ambient occlusion. Mobile uses its own pixel-ratio budget, skips the whole-scene shader warmup and disables shadows, AO and postprocessing. Software GL stages its initialization draw and uses a GPU fence to limit outstanding frames. QA, shots and agent runs default to fixed resolution. [Renderer](../apps/client/src/runtime/render/Renderer.ts) · [Quality and URL controls](../apps/client/src/runtime/utils/UrlParams.ts)

## Browser agents

Agent runs enter through the loading screen or `?autostart=agent&name=...`. The SDK reads `agent_observe()` and sends actions through `agent_apply_action()` on a real-time cadence. The compatibility hook `advanceTime()` advances simulation and animation before drawing the final state. Keep internal QA observations out of the public API. To preview the bundled legacy SDK export, run `pnpm sdk:export -- --dry-run --out <directory>` with a new path outside the game repository. [Contract](../apps/client/public/skills.md) · [SDK compatibility](../scripts/sdk/template/README.md)

## Shared champion

The client starts and finishes scored runs through the API. `GET /api/high-score` reads the champion. The server validates submissions through `/api/run/start` and `/api/run/finish`. Admin stats require bearer authentication. The Vercel handlers use the shared server modules and Postgres. Vite uses the same handlers with an in-memory store scoped to the dev server process. [Client lifecycle](../apps/client/src/shared/sharedChampionRunLifecycle.ts) · [API routes](../api/) · [Stores](../server/store/) · [Deployment](deployment.md)
