# AGENTS.md

## Remaining work

Finish the Bazaar map one named area at a time via TRANSFORM in [.claude/skills/map-polish/SKILL.md](.claude/skills/map-polish/SKILL.md). [docs/map-design/construction/README.md](docs/map-design/construction/README.md) is the canonical handoff: each sheet fixes the layout, assemblies and character schedule, with bounded craft discretion in SD-21/22. TRANSFORM builds the sheet, performs its bounded assembly/interface inspection, and marks it `built` only with that construction evidence. A request for one named area stops there; continue only through an explicit user-provided area queue. Gameplay and aesthetic validation are a later user-authorized task. Each area should leave as a professional piece of environment design; rebuild whatever the sheet needs.

## Agent configuration

Preferred implementing model: GPT-6 Astra. One implementing owner per area. Ask for approval before spawning subagents unless their configuration is already authorized in the current task; the user's preferred supporting configuration is Terra with high reasoning. This preference is not blanket permission to spawn. For a one-area implementation trial, use the main agent only unless the user requests otherwise.

## Art direction

An active, flourishing Middle Eastern desert bazaar with the crafted realism and readability of a polished FPS environment. Heavy foot traffic, maintained businesses and occupied homes; worn and cared for, never sterile or filthy.

- Palette: warm sandstone, sandy ivory and cream-to-tan aged lime plaster with occasional scheduled faded earth-red fields, weathered brown timber, cream shade cloth, controlled rust-red / teal-green / indigo-blue textile accents. The base reads sun-aged and occupied, never newly whitewashed.
- Preserve layered street depth, occupied upper volumes, distinct trades, quiet service faces and clear routes. Measured layout does not imply identical buildings: use the scheduled differences in plaster grain and color, stonework, repairs, rugs, joinery and cloth sag to give each tenancy its own history.
- Build complete openings, joinery, displays, cloth supports and ground contacts. Keep junctions sound and support planes exact; hand-cut edges and trowelled plaster can soften visible right angles within the scheduled envelope. Surface aging follows use: base accumulation, use-polish at hands and feet, and localized drips or cloth-edge grime. Civic faces stay quieter than trades and services. Do not weather above human height except at drains or sun bleach.
- Retained rugs, hanging and rolled textiles, stocked counters, pottery, benches, planted sills and laundry supply life. Add only the character details scheduled in the sheets. Earth-toned coarse plaster is a wall material, not a full-height dirt overlay; dirt collects in joints and sheltered feet, while busy paths are swept and polished.
- Avoid flat procedural decoration, identical repair masks, uniformly beige or cold-white surfaces, uniform brown washes, sepia post-process, random clutter and cinematic effects that disguise weak assets. Never randomize the protected plan or move retained assets to achieve irregularity.

Finish criteria: [docs/map-design/quality-bar.md](docs/map-design/quality-bar.md).

## References

Open the actual images at the start of every map session; a path is not visual inspection. Subagents do not inherit visual context: hand any delegated map task this art direction and the relevant images.

1. [docs/map-design/refs/bazaar_main_hall_reference.png](docs/map-design/refs/bazaar_main_hall_reference.png): founding reference and primary authority for warm aged cream/tan surfaces, trade patina, street depth and composition.
2. [docs/map-design/development-plan/references/](docs/map-design/development-plan/references/): per-district geometry, craft and trade-role studies. Never a texture, blueprint or stall template.
3. [docs/map-design/refs/](docs/map-design/refs/) `cs2_daylight_ref_1..5.png`: finish and gameplay readability.
4. [docs/map-design/development-plan/design-atlas.pdf](docs/map-design/development-plan/design-atlas.pdf) and [drawings/](docs/map-design/development-plan/drawings/): review elevations and massing proposals per building.

The [tracked engineering proof](docs/map-design/refs/spice-bay-engineering-proof.png) demonstrates one built Spice bay; its limits and the later trial defects are recorded in the construction README and progress index. It does not establish the revised finish quality. It is supporting evidence, not a replacement for the founding reference or the full area sheet.

Images communicate appearance, never dimensions or gameplay. Dimensions come from the construction sheets and `map_spec.json`.

## Blender

Two ways to drive Blender. Pick by need, not habit.

- **Headless `bpy` (default for anything shipped).** `assets/source/<unit>/build.py` run with `/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python <script>`. Deterministic, reproducible, needs nothing running. Facades and section shells always ship this way.
- **Blender MCP (live).** Talks to the addon inside the open Blender window on port 9876. Use it to inspect a scene, read real dimensions, take viewport screenshots, try geometry or materials, and preview Poly Haven assets. Prototype live, then port to `build.py` before shipping. One-off props and dressing may ship from a live-authored GLB when the `.blend` is committed next to it in the unit folder and `package.json` names that `.blend` as the model's `source`.

Setup state on this machine (done 2026-09-07): Blender 5.2.1 LTS, addon `blender_mcp` 1.6 (protocol 5) installed and enabled, telemetry consent off, a startup script auto-starts the server whenever Blender opens with a window. This records the setup checked on that date, not a guarantee of a live connection in a new task. If a task uses MCP, first call addon-status or scene-info once; open Blender if it is unavailable. Headless construction needs no live MCP server and performs no new design survey. Several agents may be connected at once; commands run one at a time on Blender's main thread and the UI freezes while one runs.

Clients: Claude Code uses `.mcp.json` (`uvx blender-mcp`, all tools). Codex uses `~/.codex/config.toml` `[mcp_servers.blender]`: the five core tools plus the three Poly Haven tools, `tool_timeout_sec = 180`, approvals `auto`. Hyper3D, Sketchfab, Hunyuan and Poly Pizza stay off everywhere; generated meshes fail the quality bar and the licence check.

Codex sandbox (measured 2026-09-07): inside Codex's macOS sandbox headless Blender crashes at GPU backend detection and Playwright's Chromium cannot start, so `build.py`, `preview.py` and `pnpm map:shoot` all fail there while `pnpm map:check` runs. `.codex/config.toml` (git-ignored, local) therefore sets `sandbox_mode = "danger-full-access"` and `approval_policy = "never"` for this repo; on a fresh clone recreate it or pick Agent (full access) per thread. MCP calls are unaffected; the server runs outside the sandbox against the already open Blender.

Using it well:

- `get_scene_info` lists only the first 10 objects. For anything else run `execute_blender_code` and `print()` what you need: names, `dimensions`, bounding boxes, poly counts. `get_object_info` gives one object's world bounding box, materials and counts.
- Each `execute_blender_code` call runs in a fresh namespace; only the scene carries over. Keep a call well under the 180 s cap, split heavy work, and leave real builds to headless `build.py`.
- Screenshots show the viewport as it is, so frame first. With `A` the VIEW_3D area and `R` its WINDOW region: `with bpy.context.temp_override(window=bpy.context.window_manager.windows[0], area=A, region=R): bpy.ops.view3d.view_selected()` (or `view_all()`); `A.spaces.active.shading.type = 'MATERIAL'` shows textures. Then `get_viewport_screenshot`.
- `user_prompt` on every tool is telemetry metadata only. Any short task string is fine.
- Poly Haven is a per-file toggle (`bpy.context.scene.blendermcp_use_polyhaven`, default off). `search_polyhaven_assets` then `download_polyhaven_asset` import at 1k into the live scene for a look; nothing lands in the repo. Ship textures with `node scripts/fetch-cc0-texture.mjs <id> --res 1k` and props with `node scripts/fetch-cc0-model.mjs <id>`; both record source, licence and md5. A fetched prop is used by adding its id to a pool in `MODEL_POOLS_BY_KIND` (`apps/client/src/runtime/map/buildProps.ts`) or by importing its gltf in a unit `build.py`.
- Author in metres, Z up, origin at the base centre, export with `export_yup`. Facades put the wall plane at Y=0 with the street along -Y.
- The live scene is the user's file. Do not save over it; export GLBs to the unit folder and keep the build in `build.py`.

## Locks

- `pnpm map:check` guards gameplay, collision, traversal, spawns and anchors during the later validation task. Never weaken the guard or rebaseline to hide a failure.
- Gameplay baseline stands. New connectors or playable elevation need a separate user-authorized task. Everything render-only is open: walls, floors, materials, balconies, overheads, dressing, skyline, lighting.
- [docs/map-design/specs/map_spec.json](docs/map-design/specs/map_spec.json) owns implemented state and protected measurements. The construction sheet decides the render-only work; use `scripts/apply-facade-package.mjs` to apply its package. Do not change the spec or design layer to fill a gap in a sheet. [docs/map-design/shots.json](docs/map-design/shots.json) owns later signoff cameras.
