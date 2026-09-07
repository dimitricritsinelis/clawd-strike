# unit-tea-terrace · Tea house, ramp, terrace, stairs and landing

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: tea house, Tea Terrace, tea ramp, tea stairs, tea landing (shoot units unit-tea-ramp, unit-tea-terrace, unit-tea-stairs, unit-tea-landing).

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The raised route: ramp up from Caravan Court, the tea house on the terrace at +1.4 with its serving recess, table and stools under a shade sail, stairs down to the landing and the west-upper link. The retaining screens on the west stay tall and quiet. Warm aged plaster, threshold polish and tea service marks make it lived-in without clutter. All tea-house heights are relative to the 1.4 floor.

## 2. Site

### Site · `TEA_RAMP` (Tea Terrace Ramp)

- Rect x 11..19, y 48..56 (8 × 8 m); ramp along y: z 0 → 1.4; floor `large_sandstone_blocks_01`; authored clear width **4 m** (protected).
- Connects: CARAVAN_COURT, TEA_TERRACE.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`architectural_cut_edge`): The 4.00m supported run on the 8.00m south edge frames the ramp entry and is not a served facade plane.
- `east` edge: exempt (`retaining_wall`): The 8.00m east wall follows and retains the complete authored ramp grade.
- `west` edge: exempt (`retaining_wall`): The 8.00m west wall follows and retains the complete authored ramp grade.

### Site · `TEA_TERRACE` (Tea Terrace)

- Rect x 11..19, y 56..66 (8 × 10 m); floor z = 1.4; floor `patterned_cobblestone`; authored clear width **4 m** (protected).
- Connects: TEA_RAMP, TEA_STAIRS.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m south edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`retaining_wall`): The complete 10.00m west wall retains the raised terrace and is not a served opening plane.
- `east` edge: frontage `FRONTAGE_TEA_TERRACE_EAST` → `BLD_TEA_HOUSE`.

### Site · `TEA_STAIRS` (Tea Terrace Stairs)

- Rect x 11..19, y 66..72 (8 × 6 m); ramp along y: z 1.4 → 0; floor `large_sandstone_blocks_01`; authored clear width **4 m** (protected).
- Connects: TEA_LANDING, TEA_TERRACE.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m south edge; the full face remains an authored traversal opening.
- `east` edge: exempt (`retaining_wall`): The 6.00m east wall follows and retains the complete authored stair grade.
- `west` edge: exempt (`retaining_wall`): The 6.00m west wall follows and retains the complete authored stair grade.

### Site · `TEA_LANDING` (Tea Terrace Landing)

- Rect x 11..19, y 72..76.5 (8 × 4.5 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **4.5 m** (protected).
- Connects: LINK_WEST_UPPER, TEA_STAIRS.
- `north` edge: exempt (`short_wall_return`): Only 2.00m of the 8.00m north edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 8.00m south edge; the full face remains an authored traversal opening.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 4.50m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`retaining_wall`): The 4.00m wall run on the 4.50m west edge retains the authored raised landing grade.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| KEEP existing runtime; no package | `TEA_RAMP` | none | none |
| `assets/source/unit-tea-terrace/` | `TEA_TERRACE` | `["east"]` | `unit-tea-terrace.glb` |
| KEEP existing runtime; no package | `TEA_STAIRS` | none | none |
| `assets/source/unit-tea-landing/` | `TEA_LANDING` | `[]` | `unit-tea-landing.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** No unit folder yet.

## 3. Walls

### FRONTAGE_TEA_TERRACE_EAST  ·  BLD_TEA_HOUSE (tea house, 2 storeys)

- **Role:** tea house. Tea serving recess and closed entry beneath louvered and woven upper closures; the existing raised terrace, tea furniture and high shade remain.
- **Wall line:** east edge of `TEA_TERRACE`; x = 19, y = 56.8 .. 65.2 (a runs south to north); length **8.4 m**; street side -X (street lies west of the wall); kit `Wall(F, (19, 56.8), (19, 65.2), faces='W')`.
- **Retained massing `MASSING_MID_MIXED`:** wall top 7 local / 8.4 absolute, depth 4.8 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_beige_wall_002`, trim `ph_stone_trim_white`, timber `ph_worn_planks`; hardware `ph_rusty_metal_02`.
- **Corners:** `open`. Ground head datum 2.7 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** ALL heights here are above the terrace floor z = 1.4 (add 1.4 for absolute): plinth 0..0.28; awning ledger 2.85; signboard centre 3.05, nominal span 2.86..3.24; sill course 3.50..3.62; coping 6.84..7.0 (absolute 8.4); S2 roof base 8.4, cap 9.59 absolute.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `shop_recess_market` | tea serving recess (brass/porcelain/linen shelves) | 1.8 | (19, 58.6) | 2.4 × 1.35 × 2.7 | 0 / 2.7 | 0 |
| `STORY_1_WINDOW_01` | `window_shuttered` | SH-L louvered teal (placed `ASSET_SHUTTER_LOUVERED`) | 1.8 | (19, 58.6) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 |
| `GROUND_02` | `door_shop_timber` | closed tea-house entry | 6.6 | (19, 63.4) | 1.15 × 0.22 × 2.7 | 0 / 2.7 | 0 |
| `STORY_1_WINDOW_02` | `window_shuttered` | SH-W woven infill (placed `ASSET_SHUTTER_WOVEN`) | 6.6 | (19, 63.4) | 1.6 × 0.24 × 1.65 | 3.68 / 5.33 | 1 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.8, 2.4, 0, 2.7), (1.8, 1.6, 3.68, 1.65), (6.6, 1.15, 0, 2.7), (6.6, 1.6, 3.68, 1.65)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_SHUTTER_LOUVERED` at MOUNT_TEA_WINDOW_1; `ASSET_SHUTTER_WOVEN` at MOUNT_TEA_WINDOW_2.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish with its origin on the terrace floor (z 1.4): skin `ph_beige_wall_002`, plinth sandstone 0..0.28, sill course 3.50..3.62, coping 6.84..7.0; corners `open`: the north end meets the stairs' retaining stone with a 0.16 quoin strip, the south end the ramp's. Completion: the tea house reads as a two-storey house on a raised street.
2. CREATE `GROUND_01` serving recess 2.4 × 2.7 × 1.35 at a=1.80: stone jambs, timber head, three timber shelves at 0.85 / 1.4 / 1.95 carrying brass pots, porcelain and folded linen (model 12 small items from the CC0 brass pot and simple lathe cups, all inside the recess), counter top at 0.90 × 0.34 deep, closed panel front. This recess is modelled in the GLB (no placed counter here). Completion: a tea counter with visible stock, nothing beyond the wall plane except the counter top's 0.10.
3. CREATE `GROUND_02` closed entry door 1.15 × 2.7 at a=6.6 (SD-05). Completion: closed.
4. CREATE two rebates `STORY_1_WINDOW_01/02` 1.6 × 1.65 at sill 3.68 / head 5.33 over a=1.80 and a=6.6 for the placed `ASSET_SHUTTER_LOUVERED` and `ASSET_SHUTTER_WOVEN` (absolute z 5.08). Completion: shutters seated.
5. SD-08 awning: timber ledger 0.08 × 0.08 at z 2.85 spanning a=0.55..3.05, projection 1.10 m, hem drop 0.25, sag 0.12, two 45° timber brackets at the span ends, cloth `ph_fabric_leather_02` over `GROUND_01` only (the tea house uses plain cream cloth, no stripes). Completion: one awning.
6. CREATE sign brackets for `TEA_E_SIGN_1` (a=1.80, centre absolute z 4.45, span 4.26..4.64) at local z 3.24 (absolute 4.64). `TEA_E_SIGN_2` dormant. Completion: one sign.
7. CREATE the lantern bracket at a=3.7: it starts at (19.0, 60.5, 4.915), reaches 0.50 m into the street to the placed lantern handle at (18.5, 60.5, 4.915), and carries `LANTERN_TEA_01` centred at (18.5, 60.5, 4.65). Completion: lantern hangs from the bracket.
8. KEEP the tea service, table, three stools and stall at their placed transforms (they sit on the terrace against this wall, outside the 4 m clear width). Completion: nothing new on the terrace.
9. APPLY wear: dust band on the plinth, tea-stain drips 0..0.3 under the recess, polish at the door, seat polish on the wall at 0.4..0.9 m behind the stools. Completion: as listed.
10. KEEP the existing runtime-owned shared S2 roof over x=19..24 and y=56.8..62.72: absolute base 8.4, cap 9.59. The Tea section finish stops at its 8.4 m absolute coping and adds no `upper_room`, slab, coping or parapet above it; the Textile west section finish likewise adds none over the shared strip. Completion: one continuous stepped roof with no double slab or cap above 9.59.

**Why it exists (reality check):** A tea house serves the raised terrace from a counter recess and has its own street door; the owners live above behind louvres (ventilation for the kitchen room) and woven reed (the bedroom).

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

#### `TEA_RAMP`

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_EAST` | `ASSET_SIGNBOARD` | `TEA_RAMP_SIGN_EAST` | (18.75, 54.3, 3.65) | 1.2 × 0.12 × 0.38 | 270 | KEEP (route sign) |
| `PLACE_TEA_RAMP_SIGNS_TEA_RAMP_SIGN_WEST` | `ASSET_SIGNBOARD` | `TEA_RAMP_SIGN_WEST` | (11.25, 51.2, 3.05) | 1.1 × 0.12 × 0.38 | 90 | KEEP (route sign) |

#### `TEA_TERRACE`

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_TEA_TERRACE_01` | landmark | (14.2, 61.3, 1.4) | 2.2 × 2.4 | 0 | Tea service landmark on the shared elevated route. |
| `COVER_TEA_01` | cover_cluster | (12.2, 63.8, 1.4) | 1.5 × 1.1 | 90 | Low tea crates provide elevated cover. |
| `LANTERN_TEA_01` | lantern_anchor | (18.5, 60.5, 4.65) | 0.42 × 0.72 | 270 | CC0 wooden lantern above the raised tea route. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_TEA_LANTERN_LANTERN_TEA_01` | `ASSET_CC0_LANTERN` | `LANTERN_TEA_01` | (18.5, 60.5, 4.65) | 0.221 × 0.235 × 0.53 | 270 | KEEP at this transform |
| `PLACE_TEA_STOOL_EAST_LMK_TEA_TERRACE_01` | `ASSET_CC0_TEA_STOOL` | `LMK_TEA_TERRACE_01` | (17.88, 61.3, 1.4) | 0.385 × 0.406 × 0.579 | 270 | KEEP at this transform |
| `PLACE_TEA_STOOL_WEST_NORTH_LMK_TEA_TERRACE_01` | `ASSET_CC0_TEA_STOOL` | `LMK_TEA_TERRACE_01` | (16.45, 61.75, 1.4) | 0.385 × 0.406 × 0.579 | 110 | KEEP at this transform |
| `PLACE_TEA_STOOL_WEST_SOUTH_LMK_TEA_TERRACE_01` | `ASSET_CC0_TEA_STOOL` | `LMK_TEA_TERRACE_01` | (16.45, 60.85, 1.4) | 0.385 × 0.406 × 0.579 | 70 | KEEP at this transform |
| `PLACE_TEA_TABLE_LMK_TEA_TERRACE_01` | `ASSET_CC0_TEA_TABLE` | `LMK_TEA_TERRACE_01` | (17.15, 61.3, 1.4) | 1.134 × 0.706 × 0.8 | 90 | KEEP at this transform |
| `PLACE_TEA_TERRACE_SHADE_TEA_TERRACE_SHADE_01` | `ASSET_CLOTH_CANOPY` | `TEA_TERRACE_SHADE_01` | (15, 62.4, 5.7) | 1.9 × 6.8 × 0.18 | 90 | KEEP at this transform |
| `PLACE_TEA_COVER_COVER_TEA_01` | `ASSET_COVER_GOODS` | `COVER_TEA_01` | (12.2, 63.8, 1.4) | 1.5 × 0.75 × 1 | 90 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_L34_TEA_STALL_L34_TEA_STALL_01` | `ASSET_MARKET_STALL` | `L34_TEA_STALL_01` | (16.9, 64.7, 1.4) | 1.98 × 1.215 × 1.98 | 270 | KEEP at this transform |
| `PLACE_TEA_WINDOW_1_MOUNT_TEA_WINDOW_1` | `ASSET_SHUTTER_LOUVERED` | `MOUNT_TEA_WINDOW_1` | (19.015, 58.6, 5.08) | 1.6 × 0.24 × 1.65 | 90 | KEEP at this transform |
| `PLACE_TEA_WINDOW_2_MOUNT_TEA_WINDOW_2` | `ASSET_SHUTTER_WOVEN` | `MOUNT_TEA_WINDOW_2` | (19.015, 63.4, 5.08) | 1.6 × 0.24 × 1.65 | 90 | KEEP at this transform |
| `PLACE_TEA_SIGNS_TEA_E_SIGN_1` | `ASSET_SIGNBOARD` | `TEA_E_SIGN_1` | (18.88, 58.6, 4.45) | 2.2 × 0.12 × 0.38 | 270 | KEEP (centre absolute z 4.45, nominal board span 4.26..4.64; masonry stubs meet its top at z 4.64) |
| `PLACE_TEA_SERVICE_LMK_TEA_TERRACE_01` | `ASSET_TEA_SERVICE` | `LMK_TEA_TERRACE_01` | (18.55, 62, 1.4) | 1.2 × 0.55 × 0.9 | 90 | KEEP (shifted 2026-09-07 by 0.65 m south to y 62.0, out of the entry door service floor; waiver CW-F70D65F7D790 retired) |

#### `TEA_STAIRS`

#### `TEA_LANDING`

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `TEA_TERRACE_SHADE_01` | (11.6, 62.4, 5.75) | (18.4, 62.4, 5.65) | 1.9 | Tea terrace shade sail slung across the elevated route between both wall faces. Seated 4.2 m above the terrace surface so the hem stays clear of the 4 m route and every stair and landing below it. Narrowed to 1.9 m and lifted: at 3 m across a 4 m terrace the sail read as a ceiling rather than an awning, filling the upper third of the route camera and burying the tea frontage it is meant to shade. |

`TEA_TERRACE_SHADE_01` runs from the retaining screen (11.6, 62.4, 5.75) to the tea house (18.4, 62.4, 5.65): iron eye on the screen, 1.2 m ledger on the house at local z 4.25. Cloth `ph_fabric_leather_02` (plain cream). Hem ≥ 4.2 over the terrace floor.

## 6. Ground, wear and drainage

KEEP the ramp (z 0..1.4 over 8 m), the terrace `patterned_cobblestone`, the ten visual treads and the landing; material seams at the top of the ramp and the top of the stairs only; polish on the tread nosings; tea-stain patch under the service at (18.55, 62.65).

**`TEA_RAMP` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

KEEP the existing grade and surface; no added wear mesh on this ramp or stair run.

**`TEA_TERRACE` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(14.5, 56.05, 0.014), (15.5, 56.05, 0.014), (15.5, 65.95, 0.014), (14.5, 65.95, 0.014)], 'polish')
wear_patch(F, [(18.25, 62.4, 0.014), (18.85, 62.4, 0.014), (18.85, 62.9, 0.014), (18.25, 62.9, 0.014)], 'damp')
wear_patch(F, [(17.5875, 63.63, 0.014), (17.5875, 65.77, 0.014), (16.2125, 65.77, 0.014), (16.2125, 63.63, 0.014)], 'dust')
wear_patch(F, [(11.745, 64.63, 0.014), (11.745, 62.97, 0.014), (12.655, 62.97, 0.014), (12.655, 64.63, 0.014)], 'dust')
wear_patch(F, [(18.195, 62.68, 0.014), (18.195, 61.32, 0.014), (18.905, 61.32, 0.014), (18.905, 62.68, 0.014)], 'dust')
wear_patch(F, [(18.163037, 61.027581, 0.014), (18.163037, 61.572419, 0.014), (17.596963, 61.572419, 0.014), (17.596963, 61.027581, 0.014)], 'dust')
wear_patch(F, [(16.277205, 62.102794, 0.014), (16.090859, 61.590815, 0.014), (16.622795, 61.397206, 0.014), (16.809141, 61.909185, 0.014)], 'dust')
wear_patch(F, [(16.090859, 61.009185, 0.014), (16.277205, 60.497206, 0.014), (16.809141, 60.690815, 0.014), (16.622795, 61.202794, 0.014)], 'dust')
wear_patch(F, [(16.716988, 61.947208, 0.014), (16.716988, 60.652792, 0.014), (17.583012, 60.652792, 0.014), (17.583012, 61.947208, 0.014)], 'dust')
```

**`TEA_STAIRS` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

KEEP the existing grade and surface; no added wear mesh on this ramp or stair run.

**`TEA_LANDING` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(14.5, 72.05, 0.014), (15.5, 72.05, 0.014), (15.5, 72.35, 0.014), (14.5, 72.35, 0.014)], 'polish')
```

## 7. Roofs and skyline

Tea house roof base 8.4, cap 9.59: the shared Textile north-wing roof remains runtime-owned with no face-GLB roof geometry. Retaining screens stay 7.0 / 7.89. The overlook remains outside this render-only scope.

## 8. Required result

- [ ] Serving recess with stocked shelves and a 0.90 counter; closed entry door; two shutters seated at absolute z 5.08.
- [ ] Lantern and sign on brackets; shade sail ends bear on an eye and a ledger.
- [ ] Ramp and stairs untouched; nothing on the treads or the inside corners.
- [ ] Every scheduled finished-frontage opening exists at its `a`, sill and head; Dogleg door, windows and vents remain the matching runtime-owned modules.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] Wear follows cause: dirt band at the base, streak under every spout, hand-polish at door jambs 0.9–1.4 m, cart scuffs at store doors, sun bleach on south and west upper fields only.

Record `built` in the progress index after applying the package. Gameplay, visual and performance validation occur in the later validation task.

