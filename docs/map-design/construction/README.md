# Bazaar construction documents

These are the canonical construction handoff for the Bazaar map, with one sheet per named area plus shared links and skyline schedules. An implementer (Codex, Claude, a person) builds what the sheet says; the design decisions are already made here. Use a cited standard detail only for an implementation detail the sheet delegates. If a required design choice or protected measurement is absent or conflicts with the spec, mark the area blocked in the progress index; do not invent a feature.

| Sheet | Area | Output unit(s) |
|---|---|---|
| [unit-spawn-a-courtyard.md](unit-spawn-a-courtyard.md) | Spawn A courtyard | `unit-spawn-a-courtyard` |
| [unit-spice-street.md](unit-spice-street.md) | Spice Street | `unit-spice-street` |
| [unit-fountain-court.md](unit-fountain-court.md) | Fountain Court | `unit-fountain-court` |
| [unit-textile-arcade.md](unit-textile-arcade.md) | Textile Arcade | `unit-textile-arcade` |
| [unit-rug-gate.md](unit-rug-gate.md) | Rug Gate | `unit-rug-gate` |
| [unit-spawn-b-courtyard.md](unit-spawn-b-courtyard.md) | Spawn B courtyard | `unit-spawn-b-courtyard` |
| [unit-service-south.md](unit-service-south.md) | Service South | `unit-service-south` |
| [unit-caravan-court.md](unit-caravan-court.md) | Caravan Court | `unit-caravan-court` |
| [unit-tea-terrace.md](unit-tea-terrace.md) | Tea house, ramp, terrace, stairs, landing | `unit-tea-ramp`, `unit-tea-terrace`, `unit-tea-stairs`, `unit-tea-landing` |
| [unit-service-north.md](unit-service-north.md) | Service North | `unit-service-north` |
| [unit-dyers-alley.md](unit-dyers-alley.md) | Dyers Alley | `unit-dyers-alley` |
| [unit-covered-souk.md](unit-covered-souk.md) | Covered Dyers Souk | `unit-covered-souk` |
| [unit-dyers-dogleg.md](unit-dyers-dogleg.md) | Dyers Dogleg | `unit-dyers-dogleg` |
| [unit-north-court.md](unit-north-court.md) | North Court | `unit-north-court` |
| [links.md](links.md) | The eight link passages | `unit-link-*` |
| [skyline.md](skyline.md) | Perimeter roofs and skyline | none (placements from the adjoining unit) |

The fourteen area sheets and `links.md` use the same eight sections: design intent, site, walls (one block per frontage with the bay table and ordered tasks), free placements, overheads, ground and wear, roofs and skyline, required result. `skyline.md` is the shared roof-ownership schedule; its work belongs to adjoining named areas.

## Sources and precedence

1. [`../specs/map_spec.json`](../specs/map_spec.json) owns implemented state and every protected number (zones, surfaces, clear widths, anchors of gameplay cover, module openings). `frontages[].layoutIntent` supplies compiled openings and datums; `buildings[].walls[]` indexes their building ownership. The generator rejects any active bay whose module or axis differs between them.
2. The sheets own design decisions: assemblies per bay, sills and heads, datums, awnings, signs, goods, overhead ends, wear, roofs.
3. [`../development-plan/design-atlas.pdf`](../development-plan/design-atlas.pdf) and [`../development-plan/drawings/`](../development-plan/drawings/) are historical appearance references only. They never add work, change a measurement or override a sheet. Their footers cite `buildings.md` and `assets.md`; those two documents were folded into these sheets and no longer exist.
4. [`../quality-bar.md`](../quality-bar.md) is the finish standard and `AGENTS.md` the art direction. The founding Bazaar image owns the warm aged surface and trade-patina target; district studies own geometry, craft and trade role only. Images never change construction measurements or scheduled work.

The sheets are generated from live compiled geometry and placements by [gen.py](gen.py) with the design layer in [overlay.py](overlay.py). No schedule snapshot or archive is a construction authority. Regenerate after a spec change that moves a wall or a bay (`python3 docs/map-design/construction/gen.py`); edit the design in `overlay.py`, not in the generated files.

## Coordinates and frames

- Design metres, x east, y north, z up, origin at the south-west corner of the 56 × 92 m playable boundary. Yaw 0 = +Y (north), 90 = +X (east).
- A zone's `west` face is its west edge, seen from inside the zone; the street lies east of it. Never derive a face from a camera.
- `a` (along) runs from the low coordinate of the frontage span: south to north on east and west faces, west to east on north and south faces. The bay table gives `a` and the world point of every bay axis.
- Frontage span = zone edge × `start..end`. Wall length = span length. All dimensions in the sheets are to the module envelope, not to trim.
- Tea Terrace heights are local to the terrace floor at z 1.4; every other zone's floor is z 0 except the ramp and stairs.
- **Legacy face GLB** (`frontages`): existing-tooling compatibility only. Do not create one for future named-area construction.
- **Section GLB** (the only future named-area export, bound with `section`): built in the plan frame with `facade_kit.Frame(zone rect)`; the runtime mounts it at the zone's south-west corner with no rotation. Include and package only the faces owned by the sheet; never claim every edge of a zone. A blank `owned faces[]` entry keeps the runtime wall and adds only the scheduled surface finish.
- The runtime retains shell apertures, shared backing, structural returns, roof slabs, parapets and roof copings. The section owns the flat face finish, apertured skin and the narrow below-wall-top cornice called `coping` in legacy tasks. Preserve every scheduled opening; never duplicate a full-footprint roof coping or create a roof mesh.
- **Free placement** (`placements[]`): any GLB, origin at its base centre, position in design metres, `yawDeg` as anchors. Render-only; `map:check` rejects anything that reaches into a lane beyond the rules below.
- **Placed assets** (`dressing_placements` in the spec) stay when a section is bound: shutters, screens, counters, sign boards, lanterns, goods. The section provides the rebate, floor or bracket they sit in and never duplicates them.

## Clearances and gameplay locks

- Route floors are protected: 6 m main lane, 4.5 m side halls, 4 m on the tea elevation, 3.5 m through links (4.5 m at the west-upper link). Nothing render-only enters the walking envelope: below 2.2 m, nothing projects more than 0.35 m from a wall into a route.
- Doors keep an empty 0.8 m service floor in front of them. Goods at a threshold stay inside the recess or within 0.9 m of the wall beside it, never in front of a door.
- Awning hems at or above 2.45 m over paving. Canopy and line hems at or above 4.2 m over a route floor. Every canopy end sits on a wall ledger or a roof tie; the validator treats a span as one box from its lower end to its upper end, so both ends of a span clear every window on its walls by 0.21 m.
- Spec clearances (`composition_rules.clearances`): opening lateral 0.08, canopy to opening 0.12, placement AABB 0.05, fixture 0.08, fixture axis tolerance 0.02, door service 0.8.
- Cover clusters, spawn covers, open nodes, landmarks, connectors and elevation are gameplay. E1 (tea overlook slot) and G1 (textile return) from the atlas are gameplay trials and are not built by any sheet.
- Soft-visual and overhead anchors and placements (signs, canopies, lines, planters, the tea service) are design and were moved on 2026-09-07 to resolve six legacy conflicts; three waivers remain by decision (cover cluster, palm, barrel). Gameplay-cover clusters are never edited. `pnpm map:check` is the lock.

## Standard details

Used by every sheet unless the sheet overrides the number. Materials are pack ids from `facade_materials.py` (`ph_*`); the runtime rebinds them to the shared wall pack.

| ID | Detail | Dimensions and rule |
|---|---|---|
| SD-01 | Plinth | 0.28 m high × 0.14 proud, stone (`ph_sandstone_blocks_05` unless the wall is stone, then the trim id). Relief walls, service backs and compound walls: 0.44 m. Runs the full wall and turns solid corners. |
| SD-02 | String course | 0.12 high × 0.10 proud, trim id. Walls with upper windows: a continuous sill course ending 0.06 m below the upper sill datum (3.50..3.62 for 3.68 sills, 4.97..5.09 for 5.15). Arcades (heads 3.55, sills 4.15) have no continuous course: the impost band at 1.87..1.99 and individual SD-06 sills carry the datum, leaving the sign band free. Walls without uppers: centred at ground head + 0.65 (2.90 for 2.25 heads, 3.35 for 2.7). |
| SD-03 | Coping | 0.16 high × 0.18 proud, trim id, as the narrow facade cornice immediately below the wall top. The runtime owns the roof coping and parapet; never duplicate them. Matches the neighbour where one building continues. |
| SD-04 | Corner piers | `held` or `pilaster` corners: end pier 0.45 wide × 0.16 proud full height at each end, inside the reserved end field; `open`: none (a kit or the next building owns the corner). |
| SD-05 | Door | Stone jambs 0.14 wide × 0.12 proud, head 0.14; leaf recessed 0.05. Residential leaves use `ph_rough_pine_door`, two iron straps and a ring pull at 1.05; store leaves use `ph_weathered_brown_planks`, three straps and a 0.06 × 0.06 bumper at z 0.35. Threshold width = opening + 0.28, thickness 0.04, top z 0.01; it creates no collision step. Doors stay closed. Sheet-specific plank counts and hardware take precedence. |
| SD-06 | Window | Stone frame 0.10, sill 0.06 high × 0.08 proud, reveal 0.135, dark plaster back; closure per variant (kit shutters or a placed shutter/screen). Dark recess windows: closed dark timber leaf. |
| SD-07 | Shop recess | 2.4 × 2.7 × 1.35: stone jambs 0.22 × 0.29 proud, stone lintel 2.9 × 0.25, timber head 0.17, dark timber back at depth 1.35; timber deck top z 0.08, with front edge 0.28 proud to seat the retained counter. Counter is a placed asset or, where the sheet says so, modelled with its top at 0.90 and its front no more than 0.10 proud of the wall plane. |
| SD-08 | Awning | Use `Wall.awning` with the exact span, ledger z and depth in the sheet. Ledger and arms are 0.08 square timber. Arms follow the cloth drop, their centres 0.04 below cloth; each knee has 0.35 m run and rise between outward offsets 0.05 and 0.40. Hem drop 0.25, sag 0.12; `ph_hessian_230` cream cloth, `ph_fabric_leather_02` at Tea. The lowest Spice knee is above 2.2 m; hems are ≥ 2.45. Only the scheduled openings receive awnings. |
| SD-09 | Sign | KEEP placed `ASSET_SIGNBOARD`. The runtime centres sign models at their anchor; the sheet gives the measured centre, board span and support top. Add two 0.06 square timber stubs, 0.18 proud, at ±0.9 from the bay axis and the listed support height. Do not reinterpret an anchor z as the board bottom. Only the scheduled boards exist. |
| SD-10 | Lantern bracket | KEEP the lantern transform. The runtime centres the CC0 lantern; its handle top is anchor z + 0.265 m. Build the iron bracket between the exact wall and hook coordinates in the sheet, with 0.04 square section and a 0.10 × 0.20 × 0.02 wall plate. Do not use anchor z as a hanging point. |
| SD-11 | Goods | Footprint within 0.9 m of the wall, height ≤ 1.3, never in a door floor, never within 1.2 m of a column or an inside turn. Only the assets and positions the sheet lists. |
| SD-12 | Wear | Use `Wall.wear(along, z0, width, height, kind, out=.025)` for wall marks and `wear_patch(F, corners, kind)` for the exact Section 6 floor calls. Both use untextured feathered vertexRGBA PBR roughness. Kinds: `dust`, `damp`, `polish`, `dye`, `spice`, `bleach`, `rut`. Dirt band 0..1.5 m; damp 0..0.8 on retaining walls; streak 0.25 wide × ≤ 0.45 under each spout; hand polish 0.9..1.4 at door jambs; cart scuffs 0..0.6 at store doors; dye only under workstations and racks; bleach only on south/west upper fields. `rut` is 0.05 m wide wheel-scuff shading, never floor displacement. |
| SD-13 | Drain spout | Terracotta or timber spout 0.12 × 0.4 proud at coping level, one per position the sheet names, with the SD-12 streak below. Only at the positions explicitly scheduled in the sheet. |
| SD-14 | Vent | 0.58 × 0.48, timber grille of 0.03 bars, deep dark back, sill per table. |
| SD-15 | Roof | Runtime-owned: roof base, slab, parapet and roof coping remain as built. S1 (Spice) and S2 (Textile, Tea) profiles in the sheets identify retained runtime or placed roof assets; section exports never mesh them. No rooftop props. |
| SD-16 | Upper room | KEEP the specifically named placed rooms and runtime roof volumes. No new upper-room mesh is scheduled; S1/S2 ownership and absolute heights are fixed in `skyline.md`. |
| SD-17 | Overhead ends | Wall end: timber ledger 0.10 × 0.10, 1.2 m long, two iron eyes, at the anchor height; roof end: the placed `ASSET_ROOF_TIE_*`. Sag ≤ 0.35 at mid-span. No poles in a route. |
| SD-18 | Blind niche | 1.05 × 1.8: stone jambs 0.16, head 0.20, 0.14 deep, dark plaster back, sill per table. Reads as a bricked-up opening; no door leaf, no shelf, no goods. |
| SD-19 | Column | 0.42 × 0.42 grounded, centred on the wall plane (0.21 proud), 0.08 base and 0.10 capital; height per bay table. |
| SD-20 | Retaining screen | 0.96 m deep massing: one quiet field, plinth 0.44, course, coping, damp base; niches or panels only where scheduled; never a door. |

## Module envelopes (from the spec)

| Module | W × D × H (m) | Notes |
|---|---|---|
| `shop_recess_market` | 2.4 × 1.35 × 2.7 | SD-07 |
| `door_shop_timber` | 1.15 × 0.22 × 2.7 | SD-05 |
| `door_residential_timber` | 1.05 × 0.20 × 2.25 | SD-05 |
| `door_storage_heavy` | 1.35 × 0.25 × 2.5 | SD-05, double leaves |
| `door_fortified_gate` | 2.012 × 0.339 × 2.965 | CC0 `large_castle_door` leaf, imported in `build.py` |
| `window_shuttered` | 1.6 × 0.24 × 1.65 | placed SH-L / SH-P / SH-W shutters |
| `window_screened` | 1.0 × 0.24 × 1.4 | placed SC-D / SC-V / SC-C screens |
| `window_dark_recess` | 0.9 × 0.28 × 1.25 | closed dark leaf |
| `window_landmark_stained` | 1.2 × 0.25 × 1.75 | `stained_glass_panel_001` |
| `vent_service` | 0.58 × 0.18 × 0.48 | SD-14 |
| `arch_arcade` | 2.6 × 0.42 × 3.55 | `Wall.arch(..., spring=1.93)`, pointed; total ring depth 0.42, front 0.18 proud |
| `arch_hero_courtyard` | 4.2 × 0.50 × 4.85 | `Wall.arch(..., spring=3.10)`, pointed and sealed; total ring depth 0.50, front 0.18 proud |
| `column_arcade` | 0.42 × 0.42 × 3.55 | SD-19 |
| `pilaster_facade` | 0.42 × 0.24 × 3.4 | grounded |
| `blind_niche` | 1.05 × 0.18 × 1.8 | SD-18 |
| `inspection_panel` | 1.35 × 0.035 × 0.85 | flush, sill 0.25 |

## Assembly variants (placed assets)

| Code | Asset | Envelope | Where |
|---|---|---|---|
| SH-L | `ASSET_SHUTTER_LOUVERED` | 1.6 × 0.24 × 1.65 | Spice west 01/03, Tea 01 |
| SH-P | `ASSET_SHUTTER_PANELED` | 1.6 × 0.24 × 1.65 | Spice west 02/05, Rug west 01 |
| SH-W | `ASSET_SHUTTER_WOVEN` | 1.6 × 0.24 × 1.65 | Spice west 04, Tea 02 |
| SC-D | `ASSET_DYERS_SCREEN_SC_D` | 1.0 × 0.24 × 1.4 | Dyers house S/N |
| SC-V | `ASSET_TEXTILE_SCREEN_SC_V` | 1.0 × 0.24 × 1.4 | Textile west 01/03/04 |
| SC-C | `ASSET_SCREEN_SC_C` | 1.0 × 0.24 × 1.4 | Souk west 01/02, Souk west-north, Fountain east-north |
| SP-D / SP-G / SP-A | `ASSET_SPICE_DRAWERS` / `ASSET_GRAIN_BALANCE` / `ASSET_APOTHECARY` | 1.72 × 0.50 × 1.70 | Spice west 01 / 03 / 04 |
| RG-H / RG-R | `ASSET_RUG_GALLERY` / `ASSET_RUG_ROLL_CHEST` | 1.48 × 0.32 × 2.30 | Textile west 01, east 03 / Textile west 03, Rug west 01 |
| DY-S | `ASSET_B18_DYE_COUNTER` | 1.48 × 0.34 × 2.11 | Souk east 03, Souk west 01 |
| PACK | `ASSET_B18_PACKING_FINISH` | 1.48 × 0.34 × 1.53 | Souk east 01, Textile west 04, Textile east 01 / 04 |
| BOOTH | `ASSET_TEXTILE_BOOTH` | 2.68 × 1.29 × 3.64 | Souk east 02 only (approved; unique on the map) |

Sources live in `assets/source/market-fixtures`, `textile-openings`, `rug-displays`, `dyers-house`, `central-screen-sc-c`, `b18-counters`, `textile-booth`, `bazaar-roofs`, `b18-roof-access`. Never scale, mirror or recolour them.

## Materials

Wall pack ids (48, `bazaar_wall_textures_pack_v5/materials.json`). The ones the sheets use:

- Stone: `ph_sandstone_blocks_05` (cut), `ph_sandstone_blocks_06` (rubble), trims `ph_stone_trim_sandstone`, `ph_stone_trim_white`, `ph_trim_sanded_01`.
- Plaster: `ph_painted_plaster_warm`, `ph_beige_wall_002`, `ph_plastered_wall`, `ph_aged_plaster_ochre`, `ph_lime_plaster_sun`, `ph_whitewashed_brick_warm`, `ph_whitewashed_brick_cool`, `ph_worn_plaster_ochre` (dark backs).
- Timber: `ph_rough_pine_door`, `ph_weathered_brown_planks`, `ph_worn_planks`, `ph_dark_wood`.
- Cloth: `ph_hessian_230` (cream awnings and canopies), `ph_fabric_leather_02` (tea house), `ph_dirty_carpet`. Textile motifs come from the placed assets, not from wall materials.
- Metal: `ph_rusty_metal_02`, `ph_painted_metal_shutter`.

The retained clerestory uses `from facade_materials import stained_glass`: append `stained_glass()` to its panel mesh and map 0..1 UVs once across the opening. This uses the existing `windows/stained_glass_panel_001` albedo, normal and roughness/metallic scans. Do not pass this id to the wall-pack material lookup.

`export_section` applies modifiers and joins static meshes into one primitive per material. It removes image nodes only from wall-pack materials, which the runtime rebinds. Imported CC0 door/glass textures stay embedded; wear keeps its RGBA `COLOR_0` attribute. Use the existing source files and their recorded provenance, not new downloads.

Floors: `large_sandstone_blocks_01`, `spice_laid_stone_01`, `patterned_cobblestone`, `cobblestone_color`, `cobblestone_pavement`, `red_sandstone_pavement`, `court_limestone_flags_01` (protected per zone; finish only).

### Surface and wear standard

Keep the scheduled material and asset placements. Bring surfaces together with a warm cream/tan, sun-aged base; accumulation at wall bases; use-polish at thresholds, counters and routes; and localized drain streaks or cloth-edge grime. Civic faces stay quieter than trade and service faces. Clean junctions describe sound construction; surfaces remain used and aged. Do not add garbage, unscheduled props, a uniform brown wash, sepia post-process, or weather above human height except drains and sun bleach.

## Construction constraints (apply per wall without adding design)

- Build the scheduled building role, openings, assemblies, datums, corners, supports, drainage, ground contact and wear exactly as listed.
- Preserve the sheet's route clearances, door floors, inside turns, `KEEP` placements and shared-roof ownership.
- Do not infer an extra opening, trade, awning, sign, prop, roof or wear condition from a reference image or neighbouring area.

## Construction pass (per sheet)

Start with **Spice Street** (`unit-spice-street`). Build once per progress row; do not run a survey or game check between areas.

1. Read the sheet and build its scheduled section output in `assets/source/<unit>/build.py`, starting from `assets/source/example-section/build.py`. Add free GLBs only for scheduled placements. The Tea sheet covers four zones: build the terrace and landing packages; retain the ramp and stairs without empty exports.
2. Write `assets/source/<unit>/package.json` and apply it with `node scripts/apply-facade-package.mjs apply <unit>`. Bind only the section output, faces and placements owned by the sheet.
3. Set the row in [`../development-plan/README.md`](../development-plan/README.md) to `built`, then stop after a single-area request. Continue only through an explicit user-provided area queue. `built` awaits a later user-authorized gameplay, performance and aesthetic validation task. Do not create a separate brief or start validation loops. Headless Blender builds are required. `pnpm build`, `map:check`, captures and playtests are deferred unless the user explicitly asks for a bounded check or preview; record such a check with the task result, not as another planning document.

Build command (replace `<unit>` with the package directory from the sheet):

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python assets/source/<unit>/build.py
node scripts/apply-facade-package.mjs apply <unit>
```

Package shape (one named section model; `faces` must equal the sheet's output table):

```json
{
  "models": [{"id": "section_<unit>", "file": "<unit>.glb", "source": "repo://assets/source/<unit>/build.py", "license": "Project-Original"}],
  "section": {"zoneId": "<ZONE_ID>", "modelId": "section_<unit>", "faces": ["west", "east"]}
}
```

The example demonstrates the real North East Link wall, not an alternative design. For each wall, pass its printed aperture list to `Wall.skin` before adding plinth/course/frames; skin, plinth and course then leave the opening clear. Wear corners in Section 6 already include the 0.014 m render offset and the zone-floor conversion. Do not add those offsets a second time. Wall wear sits 0.005 m in front of its receiving face: use `out=.025` on a 0.02 m skin and `out=.125` on a 0.12 m door jamb; use the scheduled projection + 0.005 for other frames.

## Starting a new task

Use this README and the named area sheet as the handoff; conversation history and ignored `artifacts/` files are not required construction inputs. Read `AGENTS.md` for model/subagent preferences and the reference images. A task can implement one complete area and stop. The progress index remains the only status record; `built` is not gameplay or visual signoff.

The [tracked Spice bay proof](../refs/spice-bay-engineering-proof.png) is a real Blender construction sample using the shared kit and retained assets. Its 2.40 m opening seats an unchanged 1.72 m counter with 0.34 m clearance on each side, at deck z 0.08; the lowest cloth surface is 2.466 m. The proof covers only a 3.60 m wall slice and omits the retained signboard, lantern, surrounding street and runtime roof. Build the full named sheet, not this cropped sample. Its renderer and geometry checks demonstrate the authoring path, not finished-map acceptance.

Fresh environments need the repository dependencies (`pnpm install --frozen-lockfile`) and Blender. The Blender executable path in the build command is for the configured Mac; local permission and MCP settings under `.codex/` are ignored and do not travel through Git. Headless construction does not require the live addon. If a required executable or dependency is absent, report that setup issue rather than changing the design.

Known validation limitations, recorded 2026-09-07:

- The full `v3Architecture.test.ts` suite has an existing failure in “Rug Gate threshold awnings derive separated east/west silhouettes from their served openings”. It also fails against the original baseline code. Preserve it for the later validation task; do not weaken the assertion or claim the full suite passes.
- Local `map:shoot` aborts on the analytics request `/_vercel/insights/script.js` returning 404. The game itself boots; earlier style comparisons were diagnostic captures that retained this error. Do not treat those captures as formal `map:shoot` signoff or suppress the guard to obtain a pass.

Neither limitation changes the construction dimensions or authorizes redesign. Recheck these only when the task needs the affected validation path.
