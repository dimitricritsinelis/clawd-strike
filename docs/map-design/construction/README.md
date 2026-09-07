# Bazaar construction documents

These are the construction drawings for the Bazaar map, one sheet per named area. An implementer (Codex, Claude, a person) builds what the sheet says and verifies it in the game; the design decisions are already made here. If a sheet is silent on something, the standard details below decide it. If neither decides it, record it under **Unresolved** in the area brief and use the nearest standard detail; do not invent a feature.

| Sheet | Area | Shoot unit(s) |
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

Each sheet has the same nine sections: design intent, site, walls (one block per frontage with the bay table and ordered tasks), free placements, overheads, ground and wear, roofs and skyline, completion checks, verification record.

## Sources and precedence

1. [`../specs/map_spec.json`](../specs/map_spec.json) owns implemented state and every protected number (zones, surfaces, clear widths, anchors of gameplay cover, module openings). `buildings[].walls[]` was synced to the sheets on 2026-09-07 (same bay ids, modules and positions), so spec and sheet agree; a sheet never contradicts the spec's protected numbers.
2. The sheets own design decisions: assemblies per bay, sills and heads, datums, awnings, signs, goods, overhead ends, wear, roofs.
3. [`../development-plan/design-atlas.pdf`](../development-plan/design-atlas.pdf) and [`../development-plan/drawings/`](../development-plan/drawings/) are the review drawings behind the sheets (elevations, context plans, roof proposals S1/S2). Their footers cite `buildings.md` and `assets.md`; those two documents were folded into these sheets and no longer exist.
4. [`../quality-bar.md`](../quality-bar.md) is the finish standard and `AGENTS.md` the art direction; the reference images are appearance only.

The sheets were generated from the spec, the former schedule and the compiled placements by [gen.py](gen.py) with the design layer in [overlay.py](overlay.py). Regenerate after a spec change that moves a wall or a bay (`python3 docs/map-design/construction/gen.py`); edit the design in `overlay.py`, not in the generated files.

## Coordinates and frames

- Design metres, x east, y north, z up, origin at the south-west corner of the 56 × 92 m playable boundary. Yaw 0 = +Y (north), 90 = +X (east).
- A zone's `west` face is its west edge, seen from inside the zone; the street lies east of it. Never derive a face from a camera.
- `a` (along) runs from the low coordinate of the frontage span: south to north on east and west faces, west to east on north and south faces. The bay table gives `a` and the world point of every bay axis.
- Frontage span = zone edge × `start..end`. Wall length = span length. All dimensions in the sheets are to the module envelope, not to trim.
- Tea Terrace heights are local to the terrace floor at z 1.4; every other zone's floor is z 0 except the ramp and stairs.
- **Face GLB** (bound with `package.json` `frontages`): width = wall length, height = massing wall top; origin at the bottom centre of the street face, +Z toward the street, Y up (`export_yup`). When a face is bound, the runtime keeps the wall shell and the roofline and skips every kit face module, base apron and door model. The GLB must therefore carry all openings, frames, thresholds, courses, coping, awnings and brackets itself.
- **Section GLB** (bound with `section`): built in the plan frame with `facade_kit.Frame(zone rect)`; the runtime mounts it at the zone's south-west corner with no rotation.
- **Free placement** (`placements[]`): any GLB, origin at its base centre, position in design metres, `yawDeg` as anchors. Render-only; `map:check` rejects anything that reaches into a lane beyond the rules below.
- **Placed assets** (`dressing_placements` in the spec) stay when a face is bound: shutters, screens, counters, sign boards, lanterns, goods. The GLB provides the rebate, floor or bracket they sit in and never duplicates them.

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
| SD-03 | Coping | 0.16 high × 0.18 proud, trim id, at the wall top; parapet above per massing profile. Matches the neighbour where one building continues. |
| SD-04 | Corner piers | `held` or `pilaster` corners: end pier 0.45 wide × 0.16 proud full height at each end, inside the reserved end field; `open`: none (a kit or the next building owns the corner). |
| SD-05 | Door | Stone jambs 0.14 × 0.12 proud, head 0.14; leaf recessed 0.05, vertical planks (`ph_rough_pine_door` residential, `ph_weathered_brown_planks` storage), two or three iron straps, ring pull at 1.05; threshold 0.06 high, width + 0.28, flush with paving. Storage doors add a bumper rail 0.06 × 0.06 at 0.35. Always closed. |
| SD-06 | Window | Stone frame 0.10, sill 0.06 high × 0.08 proud, reveal 0.135, dark plaster back; closure per variant (kit shutters or a placed shutter/screen). Dark recess windows: closed dark timber leaf. |
| SD-07 | Shop recess | 2.4 × 2.7 × 1.35: stone jambs 0.22 × 0.29 proud, stone lintel 2.9 × 0.25, timber head 0.17, dark timber back, timber deck 0.08. Counter is a placed asset or, where the sheet says so, modelled with its top at 0.90 and its front no more than 0.10 proud of the wall plane. |
| SD-08 | Awning | Timber ledger 0.08 × 0.08 at ground head + 0.15 (2.85 for 2.7 heads; 3.00 for arcades, brackets on the piers), span = opening + 0.5, projection 1.10 (1.20 arcades), hem drop 0.25, sag 0.12, two 45° timber brackets at the span ends bearing on jamb stones; cloth `ph_hessian_230` (cream), `ph_fabric_leather_02` for the tea house. Hem ≥ 2.45 m. One awning per opening, never over a door, never two covers. |
| SD-09 | Sign | Placed `ASSET_SIGNBOARD` (1.8..2.2 × 0.12 × 0.30 at placement scale z 0.8); the GLB adds two 0.06 × 0.06 timber stubs 0.18 proud at ±0.9 of the bay axis, 0.15 above the board's bottom edge. The layout grammar allows a board bottom from ground head + 0.12 to ground head + 0.72 (capped 0.12 under the upper sill): 3.20 on 2.7-head shop rows, 3.67 on arcades (3.80 over the Souk booth), 3.10 on the rug merchant, 3.05 on the tea house. One sign per named trade, none on quiet faces. |
| SD-10 | Lantern bracket | Iron bracket 0.35 proud at z 3.8..4.25 (route lanterns) or head + 0.30 (door lanterns), reaching the hook of the placed `ASSET_CC0_LANTERN`. |
| SD-11 | Goods | Footprint within 0.9 m of the wall, height ≤ 1.3, never in a door floor, never within 1.2 m of a column or an inside turn. Only the assets and positions the sheet lists. |
| SD-12 | Wear | Dirt band 0..1.5 m (runtime dirt), damp 0..0.8 on retaining walls, streak 0.25 wide × ≤ 0.45 under every spout, hand polish at door jambs 0.9..1.4, cart scuffs 0..0.6 at store doors, dye splashes 0..0.9 only under workstations and racks, sun bleach on south- and west-facing upper fields only. Nothing above 1.5 m except bleach and streaks. |
| SD-13 | Drain spout | Terracotta or timber spout 0.12 × 0.4 proud at coping level, one per position the sheet names, with the SD-12 streak below. Only on service, compound and retaining walls; never on shop rows. |
| SD-14 | Vent | 0.58 × 0.48, timber grille of 0.03 bars, deep dark back, sill per table. |
| SD-15 | Roof | Roof base = wall top; parapet per massing (0.65 / 0.75 / 0.85 / 0.45), coping SD-03; S1 (Spice) and S2 (Textile, Tea) stepped roofs are construction and are placed or built as the sheets say. No rooftop props. |
| SD-16 | Upper room | Kit `upper_room`: rooftop volume behind the face, setback per sheet, its own coping; silhouette only. |
| SD-17 | Overhead ends | Wall end: timber ledger 0.10 × 0.10, 1.2 m long, two iron eyes, at the anchor height; roof end: the placed `ASSET_ROOF_TIE_*`. Sag ≤ 0.35 at mid-span. No poles in a route. |
| SD-18 | Blind niche | 1.05 × 1.8: stone jambs 0.16, head 0.20, 0.14 deep, dark plaster back, sill per table. Reads as a bricked-up opening; no door leaf, no shelf, no goods. |
| SD-19 | Column | 0.42 × 0.42 grounded, 0.08 base and 0.10 capital, full height to the impost band. |
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
| `arch_arcade` | 2.6 × 0.42 × 3.55 | pointed, spring 1.93 |
| `arch_hero_courtyard` | 4.2 × 0.50 × 4.85 | pointed, sealed |
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

Floors: `large_sandstone_blocks_01`, `spice_laid_stone_01`, `patterned_cobblestone`, `cobblestone_color`, `cobblestone_pavement`, `red_sandstone_pavement`, `court_limestone_flags_01` (protected per zone; finish only).

## Reality checklist (run per wall before exporting)

- Who lives or works behind this wall, and where do they get in? Every building has one legible entrance; a wall with none says so with a service face.
- Does each opening match its use? Shop 2.4 recess with a counter, house door 1.05, store door 1.35, workshop vents high, bath windows high.
- Are uppers over lowers, pairs mirrored, the main opening on the axis, corners solid?
- Does every awning shade an opening that needs it, and is it supported at both ends?
- Does every sign name a trade that has a counter under it?
- Does every hanging thing have something to hang from (ledger, tie, hook, bracket)?
- Does water go somewhere: coping, spout, streak, damp base?
- Is anything standing where a person or a cart would need to pass? Door floors, inside turns, route centre.
- Would this wall be built twice? Shared shells (merchant house / souk wing, tea house / textile wing) have one roof owner.

## Build and verify (per sheet)

1. `pnpm map:check --baseline`, then `pnpm map:shoot <unit> --tag r1-before`; the printed walls must match the sheet's section 3.
2. `assets/source/<unit>/build.py` from `assets/source/example-section/build.py`, composing `facade_kit` parts to the sheet; one GLB per frontage or section, free GLBs for placements. Preview with `assets/source/preview.py`.
3. `assets/source/<unit>/package.json`; `node scripts/apply-facade-package.mjs apply <unit>`.
4. `pnpm map:shoot <unit> --tag r1-after`; walk the area standing and crouched; fix; repeat rounds.
5. Fresh-eyes verdict, then fill the sheet's section 9 and set the row in [`../development-plan/README.md`](../development-plan/README.md).
