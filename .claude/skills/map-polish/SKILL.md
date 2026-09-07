---
name: map-polish
description: Bazaar named-area workflow. TRANSFORM <area> looks at the area in the game and the design documents, plans, builds, and verifies in the actual game. No approval stop. Any request that names a bazaar area, however phrased (improve, polish, fix, finish, build, dress), is TRANSFORM <area>.
---

# Bazaar area TRANSFORM

One implementing owner per area. Read `AGENTS.md`, open its reference images, then read `docs/map-design/construction/README.md` and the area's construction sheet `docs/map-design/construction/<unit>.md`. The sheet is the design: every wall, bay, datum, awning, sign, placement and wear item is decided there with numbers. TRANSFORM implements the sheet and verifies it in the game; it does not redesign. The goal is a professional piece of environment design, not a minimal diff: rebuild walls, floors, materials, openings, overheads, dressing and skyline as far as the sheet says.

Capture tags come in pairs and each pair is unique per round: `--tag r1-before` then `--tag r1-after` (`r2-…` for the next round). An `after` shoot reuses the `before` poses.

## TRANSFORM <area>

1. Resolve the area to its unit id with the Also-called column in `docs/map-design/development-plan/README.md` (`pnpm map:shoot` with no argument lists every unit). Then `pnpm map:check --baseline` and `pnpm map:shoot <unit> --tag r1-before`. The before shoot prints the resolution: the zone, every frontage with its `buildings[]` owner and brief, the facade GLB width and wall height, the wall schedule (`buildings[].walls[]`: `groundHeadM`, `bays[]`), exemptions and connected zones. Other measured dimensions live in `docs/map-design/specs/map_spec.json`: `facade_modules[].dimensionsM`, `massing_profiles[]`, `traversal_surfaces[].elevationM` and `composition_rules.clearances`. The atlas sheet and `drawings/` give the massing intent.
2. Look: open the captures in `artifacts/map-shoot/<unit>/r1-before/` (`contact-sheets/` holds the overview and the reference board) and the area's references. Check the printed walls against section 3 of the construction sheet; if a wall, bay or length differs, stop and report it (the spec moved). Judge the current state against `docs/map-design/quality-bar.md`: massing and sequence first, then facade rhythm and assemblies, then materials, joints and wear.
3. Plan: copy the sheet's construction tasks into `docs/map-design/briefs/<unit>.md` from the template below as the audit trail, in the sheet's order, and record any item the sheet leaves open under Unresolved with the standard detail you applied. Do not add, drop or resize scheduled items; do not wait on the brief.
4. Build exactly what the sheet says. Own the faces and ground of the area plus anything render-only the sheet adds around it.
   - Facades and section shells: `assets/source/<unit>/build.py` composed with `assets/source/facade_kit.py` (`Frame`, `box`, `Wall` parts: skin, plinth, course, coping, pilaster, corbels, slab, door, window, lattice, arch, niche, recess_back, awning, sign, upper_room). Write targeted `bmesh` in the same file when the kit falls short. Start from `assets/source/example-section/build.py`.
   - Free placements (balconies, roof furniture, skyline massing, props, cloth, fixtures): any GLB, placed with `placements[]` in the package. Design coordinates in metres, origin at the model's base centre, `yawDeg` as for `anchors[].yawDeg`.
   - Materials are pack ids resolved by `assets/source/facade_materials.py`, which lists valid ids on error. New CC0 scan: `node scripts/fetch-cc0-texture.mjs <polyhaven-id> --res 1k`. New CC0 prop: `node scripts/fetch-cc0-model.mjs <polyhaven-id>`, then use its id in a `MODEL_POOLS_BY_KIND` pool or import the gltf in `build.py`.
   - Blender: headless `bpy` scripts are the default; the `blender` MCP server is for live inspection, prototyping and Poly Haven previews. Rules and setup in `AGENTS.md`, section Blender.
   - Keep render-only relief below 2.2 m within 0.35 m of a wall and nothing inside the walking envelope; `map:check` rejects a placement that reaches further into the lane or floats above its surface. Standing surfaces, connectors and playable elevation are gameplay and stay out of scope unless the user asked for them.
   - A bound face GLB replaces every runtime kit module on that face (openings, awnings, base apron, door models) but not the placed dressing assets (shutters, screens, counters, sign boards, lanterns). Model the rebates and brackets they sit in; never duplicate them.
   - The spec design layer (`buildings[]`, soft-visual and overhead anchors, waivers) already matches the sheets; do not edit it during TRANSFORM. If a sheet number and the spec disagree, stop and report.
5. Write `assets/source/<unit>/package.json` (shape documented at the top of `scripts/apply-facade-package.mjs`; `assets/source/example-section/package.json` is a working example). Apply with `node scripts/apply-facade-package.mjs apply <unit>`; `revert <unit>` undoes it. Preview one GLB: `/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python assets/source/preview.py -- assets/source/<unit>/<file>.glb <out>.png --section <W,H>`.
6. Verify: `pnpm map:shoot <unit> --tag r1-after`. Read the guard output and the `[section-models]`, `[facade-models]` and `[authored-placements]` console warnings; open `pairs.png` (every view, before left and after right) and the full images. Then start `playtest-dev` with `preview_start` and move through the area standing and crouched: corners, openings, stairs, ramps. Fix defects and iterate rounds (`r2-…`) until every task's completion condition and every item in the sheet's section 8 holds in the game. On the final round only, `pnpm build` and walk the area again on `playtest-preview`, which serves the shipped build. The performance summary printed by `map:shoot` is information; note it in the brief.
7. Fresh eyes before completion: start an Agent with a clean context and hand it only the final round's `pairs.png` and after captures, `docs/map-design/quality-bar.md`, the Art direction section of `AGENTS.md` and the area's reference images (subagents inherit no visual context). Ask for a verdict per quality-bar tier (massing and sequence; facade rhythm and assemblies; materials, joints and wear) naming the views that fail. A fail is another round, not a note in the brief.
8. Record evidence and the verdict in the brief and in section 9 of the construction sheet, set the area to `complete` (or `blocked` with the reason) in `docs/map-design/development-plan/README.md`, and stop at the named area.

## Brief template

```markdown
# <unit id> · <area label>

## Identity
- Unit/zone ids; buildings and owned faces; adjoining owners
- Status: <not-started | building | complete | blocked>
- Current-state evidence: <artifacts/map-shoot/<unit>/r1-before/...>

## Selected composition
- The finished area in a few sentences: massing, trades, palette, overheads, ground, skyline.

## Construction tasks (ordered, copied from docs/map-design/construction/<unit>.md)
Each task: KEEP / REPAIR / CREATE / REPLACE / REMOVE · owner/face/bay or placement · source or asset id · placement and dimensions · materials · observable completion.

## Protected elements and unresolved facts
- Protected: `map:check` domain; <area-specific locks>
- Unresolved: <items the sheet leaves open, with the standard detail (SD-xx) applied; facts needing measurement or a user decision>

## Verification record
- <date> · <check or view> · pass | fail | unavailable · <evidence path>
- Movement check (standing and crouched): <result>
- Completion or remaining blocker: <...>
```
