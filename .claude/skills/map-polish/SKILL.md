---
name: map-polish
description: Unattended Bazaar map run. An orchestrator (GPT-6, xhigh) scores zones, writes one stable brief per zone, integrates packages and keeps or reverts on a blind judge's verdict; one persistent Blender builder per zone (GPT-6 Astra, high) improves the actual map from the kit of parts; a fresh judge (GPT-6 Astra, medium) per cycle. Worst zones first, score sets scope, nothing ships worse than it started. Use for map implementation.
---

# Map Polish

Two steps. Step 1 prepares: shoot, score, and write one brief per zone from the before shots and the design atlas. Step 2 executes the loop from the briefs alone: build in Blender, inspect, export, compare in game, keep or revert, move on. Three roles, no others. Nobody asks the user anything. No status prose; the progress table in `docs/map-design/development-plan/README.md` is the record. This file and `AGENTS.md` are the whole reading list.

| Role | Model | Reasoning | Count | Owns |
|---|---|---|---|---|
| Orchestrator | GPT-6 | xhigh | 1 | step 1 entirely; in step 2 integration, captures, keep/revert, the table |
| Builder | GPT-6 Astra | high | one per zone, kept for all of that zone's cycles; 3 zones in flight | `assets/source/<unit>/` only |
| Judge | GPT-6 Astra | medium | fresh per cycle | `critic/verdict.json` per `.claude/skills/map-critic/SKILL.md` |

## Step 1: Prepare (orchestrator alone, one run, then a ten-minute human look)

1. `pnpm map:check --baseline`, then `pnpm map:shoot <unit> --tag r0-before` for every unit listed by `pnpm map:shoot`.
2. Score every unit 1 to 5 against the bar: `docs/map-design/refs/bazaar_main_hall_reference.png` and `cs2_daylight_ref_1..5.png`, inside the map's real constraints. Optional inspiration: one generated image per unit from its `primary.png` and the founding image (prompt in `targets.json`); never a spec.
3. Write `docs/map-design/briefs/<unit>.md`, one page, from three sources: the before output (zone rect, wall runs as plan points with street side and heights, exemptions, buildings), the current views, and the design atlas cards for that zone's buildings in `docs/map-design/development-plan/buildings.md` and `assets.md` (building type and trade, material palette, roof datums, explicit decisions such as no door on a face, locked assets). The brief holds: score and scope, faces the section will own, protected elements (collision, openings, spawns, anchors, the original textile booth), the reference set, the view paths, the atlas facts, and the two or three biggest visual problems in order. This is the only time the atlas is read.
4. Write the ranked table in `docs/map-design/development-plan/README.md` (`queued <score>`), calibration unit (a score 3) first, then 5s down to 2s, 1s as `skipped`. Post the table and the briefs folder and stop.

The score sets the scope:

| Score | Meaning | Scope of the brief | Cycles |
|---|---|---|---|
| 1 | Reads like a shipped section | Skip; row says `skipped`. | 0 |
| 2 | Right bones, weak finish | Re-skin, wear and dressing on named walls; no new volumes. | 1 |
| 3 | One wall or one system wrong | Only the named walls. | 2 |
| 4 to 5 | Nothing like it | Every wall the zone sees, upper volumes, cloth, props. | 3 |

Between steps the user may edit scores and briefs. Step 2 treats the briefs as final.

## Step 2: Execute (orchestrator, builders, judges; unattended)

Reads only `docs/map-design/briefs/`, the table, this file and `AGENTS.md`. Never the atlas. Three zones in flight; take the next `queued` row in table order.

5. Spawn one builder (Astra, high) per zone with this file's path and the brief; keep that builder for the zone's later cycles so it remembers what worked and what failed.
6. On a package: `pnpm map:shoot <unit> --tag r-before` (fresh), `node scripts/apply-facade-package.mjs apply <unit>`, `pnpm map:shoot <unit> --tag r-after` (`r-after2`, `r-after3` later). Write `critic/problems.md` (the brief's problems, one per line) into the after shoot's `critic/` folder. Guard failure or `[section-models]` loader warnings: `revert`, send the text back to the builder verbatim.
7. Spawn a fresh judge on `critic/brief.md`. Read `key.json` after `verdict.json` exists. **Keep** when the after render is the winner, at least one named problem improved, `regressions` and `blockers` are empty. Otherwise `revert` (restores the last accepted files) and send the builder the verdict's `biggestGap` and `regressions`, nothing else. Cycles per the score, then `open` at the best kept state. A zone never ends worse than it started.
8. Row: unit, cycles, `win` / `open` / `reverted`, remaining gap. Replace its `queued` row.

If a builder reports a material it needs and cannot find, run `node scripts/fetch-cc0-texture.mjs <polyhaven-id> --res 1k` and tell it the new id. Do not widen the pack or the kit preemptively.

Sweep, after the table is full: `pnpm qa:completion` captures the sixteen map-wide signoff cameras in `docs/map-design/shots.json`. Judge them against the founding image; any wall, roofline or corner no zone fixed gets a one-cycle brief to the owning zone's builder. Then `pnpm validate:map-layout`, `pnpm qa:completion`, post the table with both results.

Orchestrator rules: never model, never edit `build.py`, never fix gameplay or runtime code; you are the only writer of `map_spec.json`, manifests and the facades folder. Shared systems (floor, sky, cloth canopy, prop library, shaders, lighting) and kit code deletion are logged in the row, not touched. A command failing three times is a defect to fix inside the map scripts or a zone to skip, never a stall.

## Builder

You improve the actual map inside its constraints. The brief is stable; later cycles change only what the verdict names.

1. Read the brief, `artifacts/map-shoot/<unit>/r0-before/plan.png` (north up, east right) and every current view. Coordinates are plan metres; use them as printed.
2. Build in this order, and stop at the score's scope: large shapes and silhouette (upper volumes, parapets, piers), then openings and depth (arches, doors, windows, niches), then materials, then dressing (awnings, signs, corbels, props). Weak architecture is never fixed by adding props.
3. Write `assets/source/<unit>/build.py` with the kit:
   ```python
   from facade_kit import Frame, Wall, box, export_section
   F = Frame({'x': 39, 'y': 76, 'w': 7, 'h': 5})                 # zone rect from the brief
   n = Wall(F, (39.56, 81.0), (45.44, 81.0), faces='S')          # plan points; street side
   n.skin(4.9, 'ph_lime_plaster_sun'); n.plinth(0.44, 'ph_sandstone_blocks_05'); n.coping(4.9, 'ph_stone_trim_sandstone')
   n.arch(along=2.94, width=1.0, height=2.6, mat='ph_sandstone_blocks_05')
   export_section(F, OUT / '<unit>.glb')
   ```
   Parts: `skin plinth course coping pilaster corbels door window lattice arch niche awning sign upper_room` plus `box`. When the kit cannot make an important reference feature, write targeted `bmesh` geometry in the same file; do not expand the kit. Materials are pack ids from `materials.json`; the GLB carries names only and the runtime rebinds them to the kit's materials. Own only the faces the brief names (`section.faces`); the kit keeps its details on the others. Under 25k triangles per zone. Relief below 2.2 m stays within 0.35 m of the wall.
4. Inspect before you decide: `/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python assets/source/preview.py -- <unit>.glb <out>.png --section <W,H>` renders N/E/S/W from the zone centre. Open the PNGs and state in one line what is wrong before changing anything. Blender MCP is fine for inspecting or trying a focused edit, but every accepted change is written back into `build.py`; the script is the source of truth. Six previews, then hand over.
5. Write `assets/source/<unit>/package.json`:
   `{ "models": [ { "id": "section_<unit>", "file": "<unit>.glb", "source": "repo://assets/source/<unit>/build.py", "license": "Project-Original" } ], "section": { "zoneId": "<ZONE_ID>", "modelId": "section_<unit>", "faces": ["north", "east"] } }`
6. Return one line: unit, faces owned, triangle count, any missing material. Never touch `map_spec.json`, manifests, runtime code, or run captures. `assets/source/example-section/build.py` is a worked example.
