# AGENTS.md

## Remaining work

[docs/map-design/construction/README.md](docs/map-design/construction/README.md) is the BZ-04 whole-map construction handoff. Its [design.json](docs/map-design/construction/design.json), complete zone drawings, assembly/material details and integration contract define the target. All 25 zones and 100 faces are designed, including boundaries, short returns, roofs and background. A frontage exemption is not visual approval.

The user authorizes comprehensive redesign of weak render-only visuals, including old KEEP items. Preserve gameplay colliders, routes, cover silhouettes, spawns and playable elevation. Some existing massing heights drive collision; do not change them casually. New visual targets must cover the fixed collider envelope.

Documentation work changes only the design handoff. The approved R7 full-map build follows [.claude/skills/map-polish/SKILL.md](.claude/skills/map-polish/SKILL.md) and the canonical [whole-map queue and readiness contract](docs/map-design/construction/README.md#approved-whole-map-queue-and-readiness). Continue automatically through that queue after each area’s end review and targeted corrections; routine human approval is not an area boundary. Complete builds require bounded source-to-game evidence; a user-requested construction-only task records the deferred checks honestly. The prior Spice and B trials do not satisfy BZ-04.

Implementation follows **implement, review at the end, then quickly correct**. Read the approved area documents and required dependencies once; keep mid-build review minimal. Reuse installed shared assets and tooling. One consolidated end review covers correctness, visuals and gameplay, followed by targeted corrections and affected checks only. No recurring review agents or approval ladder. Stop promptly when the user asks; preserve the last tested state and report remaining work.

The current R7 task completes construction of all 25 areas and shared scope before performance work. Defer performance benchmarking and optimization to a separate task after the full map is implemented. Triangle, material, primitive, shadow and draw-call budgets remain numerical reference targets and are informational during construction, not export, integration or completion gates. Record readily available counts without budget approval loops, repeated measurements or new optimization infrastructure. Use the existing `bz04-trial.mjs --capture-only` path. Preserve geometry validity, declared bounds, route clearance, asset-load checks, gameplay identity and relevant regressions.

The B-04 trial is installed; its evidence is not final visual acceptance. The approved R7 B sheet uses `B-05-finish-only`; the B-04-only builder needs the scheduled implementation work before it can consume that phase. Historical PROPOSED labels do not reopen the user’s R7 approval. Read designRevision and implementationPhase from the active handoff. Never treat an installed older issue as implementing a newer proposal, and never silently skip unsupported feature kinds.

## Agent configuration

For the approved whole-map task, the user authorizes bounded subagents when they directly advance the current area or its required dependencies. Suggested configuration: GPT-6 Astra with high reasoning for the lead and medium reasoning for implementation workers; this is guidance, not a concurrency cap. Work through the canonical README queue one area at a time, with one implementing owner per area; the lead owns integration and shared registries. Assign disjoint source/output files to parallel workers, coordinate dependencies, and serialize heavy Blender jobs and live-game verification. A separately requested one-area trial stays with the main agent unless the user requests delegation.

## Art direction

A simple, readable FPS environment with traditional bazaar character and discreet modern utilities. Dust2 guides clear forms, routes, cover and selective detail. Souq Waqif and Mutrah guide architecture and craft, with selected Al Wakrah and Marrakech references. The map is inspired by these places, not a literal reconstruction.

- Design complete buildings first: use, storeys, structural bay axes, principal entrance, shopfront and roof. Align openings through the storeys; use symmetry where appropriate. Any asymmetry follows a specific stair, addition or trade function. During document authoring, judge the untextured elevation and section before materials or wear. During implementation, build the approved composition and review the complete result at the end.
- Balanced aged plaster and stone, weathered timber, cream cloth, and concentrated rust/teal/indigo accents. Distinct owners, building ages and rooflines; no alternating-material formula or uniformly brown scene.
- Compose the whole player view. Routes, cover and entrances read first; tenancies and shade second; joinery and wear at close range. Quiet fields are designed and finished, not unassigned blank walls.
- Life comes from supported, purposeful groups: trading stock, rugs, seating, pottery, planting, storage and work. Keep breathing room between groups and every protected walkway clear. No random scatter or decorative quota.
- Complete openings, closures, supports and ground contacts. Keep structural lines sound; softened plaster, hand-cut edges, unequal parcels and cloth curves supply irregularity. Do not distort gameplay geometry to simulate age.
- Use the target material aliases/scales and actual licensed source scans. Dirt follows contact and use; it cannot repair weak proportions or hide a repeated texture. Avoid full-height grunge, artificial wear stripes, sepia grading and cinematic effects that conceal unfinished assets.

Read [design-basis.md](docs/map-design/construction/design-basis.md) and [quality-bar.md](docs/map-design/quality-bar.md).

## References and drawings

Open the actual relevant images and current BZ-04 drawings; a path is not visual inspection. Hand delegated visual work this direction and the relevant images.

1. [Current master plan](docs/map-design/construction/drawings/master-plan.svg) and per-zone plans/elevations linked by the area sheet: measured target composition.
2. [Reference register](docs/map-design/construction/design-basis.md): exact source links and what may be borrowed from each.
3. [Founding Bazaar image](docs/map-design/refs/bazaar_main_hall_reference.png): warmth, street depth and trade character. Images never supply dimensions or new gameplay.
4. [CS2 daylight reference 1](docs/map-design/refs/cs2_daylight_ref_1.png): Dust2 gameplay readability; the other CS2 images are finish references from other maps.

The Revision 3 atlas, old building drawings, earlier AI boards and cropped Spice proof are superseded studies. They are not BZ-04 design or finish acceptance. Use the current target drawings and the three-discipline review record.

## Blender

Two ways to drive Blender. Pick by need, not habit.

- **Headless `bpy` (default for anything shipped).** `assets/source/<unit>/build.py` run with `/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 --python <script>`. Deterministic, reproducible, needs nothing running. Facades and section shells always ship this way.
- **Blender MCP (live).** Talks to the addon inside the open Blender window on port 9876. Use it to inspect a scene, read real dimensions, take viewport screenshots, try geometry or materials, and preview Poly Haven assets. Prototype live, then port to `build.py` before shipping. One-off props and dressing may ship from a live-authored GLB when the `.blend` is committed next to it in the unit folder and `package.json` names that `.blend` as the model's `source`.

Setup state on this machine (done 2026-09-07): Blender 5.2.1 LTS, addon `blender_mcp` 1.6 (protocol 5) installed and enabled, telemetry consent off, a startup script auto-starts the server whenever Blender opens with a window. This records the setup checked on that date, not a guarantee of a live connection in a new task. If a task uses MCP, first call addon-status or scene-info once; open Blender if it is unavailable. Headless construction needs no live MCP server and performs no new design survey. Several agents may be connected at once; commands run one at a time on Blender's main thread and the UI freezes while one runs.

Clients: Claude Code uses `.mcp.json` (`uvx blender-mcp`, all tools). Codex uses `~/.codex/config.toml` `[mcp_servers.blender]`: the five core tools plus the three Poly Haven tools, `tool_timeout_sec = 180`, approvals `auto`. Hyper3D, Sketchfab, Hunyuan and Poly Pizza stay off everywhere; generated meshes fail the quality bar and the licence check.

Codex sandbox: local QA servers, Chromium and headless Blender may require session-approved execution outside the sandbox. Follow the actual session permissions; a repository configuration is not evidence that those permissions are active. Use the authorized escalation path when a concrete launch error occurs. Do not change global sandbox settings as part of an area build.

Using it well:

- `get_scene_info` lists only the first 10 objects. For anything else run `execute_blender_code` and `print()` what you need: names, `dimensions`, bounding boxes, poly counts. `get_object_info` gives one object's world bounding box, materials and counts.
- Each `execute_blender_code` call runs in a fresh namespace; only the scene carries over. Keep a call well under the 180 s cap, split heavy work, and leave real builds to headless `build.py`.
- Screenshots show the viewport as it is, so frame first. With `A` the VIEW_3D area and `R` its WINDOW region: `with bpy.context.temp_override(window=bpy.context.window_manager.windows[0], area=A, region=R): bpy.ops.view3d.view_selected()` (or `view_all()`); `A.spaces.active.shading.type = 'MATERIAL'` shows textures. Then `get_viewport_screenshot`.
- `user_prompt` on every tool is telemetry metadata only. Any short task string is fine.
- Poly Haven is a per-file toggle (`bpy.context.scene.blendermcp_use_polyhaven`, default off). `search_polyhaven_assets` then `download_polyhaven_asset` import at 1k into the live scene for a look; nothing lands in the repo. Ship textures with `node scripts/fetch-cc0-texture.mjs <id> --res 1k` and props with `node scripts/fetch-cc0-model.mjs <id>`; both record source, licence and md5. A fetched prop is used by adding its id to a pool in `MODEL_POOLS_BY_KIND` (`apps/client/src/runtime/map/buildProps.ts`) or by importing its gltf in a unit `build.py`.
- Author in metres, Z up, origin at the base centre, export with `export_yup`. Facades put the wall plane at Y=0 with the street along -Y.
- The live scene is the user's file. Do not save over it; export GLBs to the unit folder and keep the build in `build.py`.

## Locks

- `pnpm map:check` guards gameplay, collision, traversal, spawns and anchors during implementation and validation. Never weaken the guard or rebaseline to hide a failure.
- Gameplay baseline stands. New connectors or playable elevation need a separate user-authorized task. Everything render-only is open: walls, floors, materials, balconies, overheads, dressing, skyline, lighting.
- [docs/map-design/specs/map_spec.json](docs/map-design/specs/map_spec.json) owns implemented state and protected measurements. BZ-04 decides the render-only work. Use `scripts/apply-facade-package.mjs` for supported section/placement bindings and follow `construction/integration.md` for explicit registry and producer replacements. Do not invent changes to fill a design gap or weaken a guard. [docs/map-design/shots.json](docs/map-design/shots.json) owns later signoff cameras.
