# unit-covered-souk · Covered Dyers Souk

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: Covered Souk, Covered Dyers Souk, the souk.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

Three fabric trades under repaired arches on the east (packing, the approved booth, dye samples), the merchant block's trade arch and north-wing door on the west, one shared canopy overhead, the 5 m structural end wall at the north. The B18 pilot roof room sits on the east roof. Warm aged plaster and stone frame concentrated fabric-trade wear at the arches and cloth edges.

## 2. Site

### Site · `COVERED_SOUK` (Covered Dyers Souk)

- Rect x 41..53, y 32..48 (12 × 16 m); floor z = 0; floor `court_limestone_flags_01`; authored clear width **4.5 m** (protected).
- Connects: DYERS_ALLEY, DYERS_DOGLEG, LINK_EAST_MID.
- `north` edge: exempt (`system_articulated_boundary`): The 5.00m north wall is articulated by the covered-souk structural arcade; another frontage would duplicate render geometry.
- `west` edge: frontage `FRONTAGE_COVERED_SOUK_WEST` → `BLD_DYERS_ARCADE_W`.
- `west` edge: frontage `FRONTAGE_COVERED_SOUK_WEST_NORTH` → `BLD_DYERS_ARCADE_W`.
- `east` edge: frontage `FRONTAGE_COVERED_SOUK_EAST` → `BLD_DYERS_ARCADE_E`.
- `south` edge: frontage `FRONTAGE_COVERED_SOUK_SOUTH` → `BLD_SOUK_YARD_WALL`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-covered-souk/` | `COVERED_SOUK` | `["east", "south", "west"]` | `unit-covered-souk.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** `assets/source/b18-counters/`, `central-screen-sc-c/`, `textile-booth/`, `b18-roof-access/` are the sources of the placed assets (keep). No wall GLBs yet.

## 3. Walls

### FRONTAGE_COVERED_SOUK_WEST  ·  BLD_DYERS_ARCADE_W (arcade, 2 storeys)

- **Role:** arcade. Two wings of one shared merchant block, with a clear mid-link, closed north entrances, a south loggia and dry dye display.
- **Wall line:** west edge of `COVERED_SOUK`; x = 41, y = 33.28 .. 39 (a runs south to north); length **5.72 m**; street side +X (street lies east of the wall); kit `Wall(F, (41, 33.28), (41, 39), faces='E')`.
- **Retained massing `MASSING_MID_MIXED`:** wall top 7 local / 7 absolute, depth 4.8 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_aged_plaster_ochre`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.55 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 4.15 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; impost 1.93; signboard centre 3.67, nominal span 3.52..3.82; no continuous sill course (SD-06 sills at 4.09); coping 6.84..7.0.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `STORY_1_WINDOW_01` | `window_screened` | SC-C fine crossed lattice (placed `ASSET_SCREEN_SC_C`) | 1.1 | (41, 34.38) | 1 × 0.24 × 1.4 | 4.15 / 5.55 | 1 |
| `GROUND_01` | `arch_arcade` | DY-S dye-sample counter (placed `ASSET_B18_DYE_COUNTER`) | 2.86 | (41, 36.14) | 2.6 × 0.42 × 3.55 | 0 / 3.55 | 0 |
| `STORY_1_WINDOW_02` | `window_screened` | SC-C fine crossed lattice (placed) | 4.62 | (41, 37.9) | 1 × 0.24 × 1.4 | 4.15 / 5.55 | 1 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.1, 1, 4.15, 1.4), (2.86, 2.6, 0, 3.55), (4.62, 1, 4.15, 1.4)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_SCREEN_SC_C` at assigned upper windows only; `ASSET_B18_DYE_COUNTER` at south-wing GROUND_01, unit scale on its threshold.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_aged_plaster_ochre`, plinth sandstone, impost band, coping; end piers 0.45 × 0.16 (`held`). Completion: the trade side of the central merchant block.
2. CREATE `GROUND_01` sealed arch 2.6 × 3.55 at a=2.86, floor deck 0.14, interior empty for the placed `ASSET_B18_DYE_COUNTER` (`CENTRAL_DYE_DISPLAY` at (40.83, 36.14, 0.14)). Completion: counter inside the arch.
3. CREATE two screen rebates `STORY_1_WINDOW_01/02` 1.0 × 1.4 at sill 4.15 / head 5.55, a=1.10 and a=4.62 (a pair about the arch axis) for the placed `ASSET_SCREEN_SC_C` (`CENTRAL_SCREEN_SOUTH_1/2` at (40.98, 34.38 / 37.90, 4.15)). Completion: screens seated.
4. SD-08 awning: timber ledger 0.08 × 0.08 at z 3.00 spanning a=1.41..4.31, projection 1.20 m, hem drop 0.25, sag 0.12, two 45° timber brackets at the span ends, cloth `ph_hessian_230` over `GROUND_01` (brackets on the piers at 2.55). Completion: one awning, hem 2.63, under the shared canopy above.
5. CREATE sign brackets for `DYE_W_SIGN_1` (a=2.86, board centre z 3.67, span 3.52..3.82) at z 3.82, ±0.9. Completion: one sign.
6. KEEP the cart at (43.10, 36.14) and the dormant rug anchor. APPLY wear: dust band, indigo drips 0..0.35 under the arch, polish on the jambs. Completion: as listed.

**Why it exists (reality check):** The merchant block's trade face onto the covered souk: a dye-sample seller in the arch, family rooms above behind fine lattice (the women's side looks onto the busy souk).

### FRONTAGE_COVERED_SOUK_WEST_NORTH  ·  BLD_DYERS_ARCADE_W (arcade, 2 storeys)

- **Role:** arcade. Two wings of one shared merchant block, with a clear mid-link, closed north entrances, a south loggia and dry dye display.
- **Wall line:** west edge of `COVERED_SOUK`; x = 41, y = 44 .. 46.72 (a runs south to north); length **2.72 m**; street side +X (street lies east of the wall); kit `Wall(F, (41, 44), (41, 46.72), faces='E')`.
- **Retained massing `MASSING_MID_MIXED`:** wall top 7 local / 7 absolute, depth 4.8 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_whitewashed_brick_cool`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `open`. Ground head datum 2.7 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 4.15 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; string course 3.35 (head 2.7); no sill course (SD-06 sill at 4.09); coping 6.84..7.0.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `door_shop_timber` | closed trade service door (north wing) | 1.36 | (41, 45.36) | 1.15 × 0.22 × 2.7 | 0 / 2.7 | 0 |
| `STORY_1_WINDOW_01` | `window_screened` | SC-C fine crossed lattice (placed) | 1.36 | (41, 45.36) | 1 × 0.24 × 1.4 | 4.15 / 5.55 | 1 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.36, 1.15, 0, 2.7), (1.36, 1, 4.15, 1.4)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_SCREEN_SC_C` at assigned upper windows only.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_whitewashed_brick_cool` (a muted aged limewash for the north wing: the correlated difference), plinth, course 3.29..3.41, coping; end piers 0.45. Completion: reads as the same block's north wing across the passage.
2. CREATE `GROUND_01` closed trade service door 1.15 × 2.7 at a=1.36 (SD-05), quiet: no sign (`DYE_W_SIGN_2` dormant), no awning. Completion: closed, quiet.
3. CREATE `STORY_1_WINDOW_01` rebate 1.0 × 1.4 at sill 4.15 / head 5.55, a=1.36 for the placed `ASSET_SCREEN_SC_C` (`CENTRAL_SCREEN_NORTH` at (40.98, 45.36, 4.15)). Completion: seated.
4. The shared canopy `CANOPY_DYERS_01` lands on this wall at a=1.36 (inset 0.3) at z 5.90: CREATE a 0.10 × 0.10 timber ledger 1.2 m long at z 5.90 with two iron eyes (0.35 above the screen head 5.55, 0.94 below the coping). Completion: the canopy end bears on the ledger above the screen; nothing crosses the screen.
5. APPLY wear: dust band, polish at the door. Completion: as listed.

**Why it exists (reality check):** The north wing's service door: goods in, nothing sold here. It serves only the north wing (the passage separates the wings).

### FRONTAGE_COVERED_SOUK_EAST  ·  BLD_DYERS_ARCADE_E (arcade, 1 storey)

- **Role:** arcade. Three repaired stone arches: packing south, the approved textile booth at center, dry dye samples north; one broad closed roof-access room.
- **Wall line:** east edge of `COVERED_SOUK`; x = 53, y = 33.28 .. 46.72 (a runs south to north); length **13.44 m**; street side -X (street lies west of the wall); kit `Wall(F, (53, 33.28), (53, 46.72), faces='W')`.
- **Retained massing `MASSING_LOW_MERCHANT`:** wall top 4.5 local / 4.5 absolute, depth 4.2 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_painted_plaster_warm`, trim `ph_stone_trim_white`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.55 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; impost 1.93; signboard centres 3.80 (span 3.65..3.95) over the booth and 3.67 (span 3.52..3.82) over the dye counter; coping 4.34..4.5; slab 4.76, parapet cap 5.59; B18 roof-access room behind (placed).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `arch_arcade` | packing bay (placed `ASSET_B18_PACKING_FINISH`) | 1.9 | (53, 35.18) | 2.6 × 0.42 × 3.55 | 0 / 3.55 | 0 |
| `GROUND_02` | `arch_arcade` | approved textile booth (placed `ASSET_TEXTILE_BOOTH`, untouchable) | 6.72 | (53, 40) | 2.6 × 0.42 × 3.55 | 0 / 3.55 | 0 |
| `GROUND_03` | `arch_arcade` | DY-S dye-sample counter (placed `ASSET_B18_DYE_COUNTER`) | 11.54 | (53, 44.82) | 2.6 × 0.42 × 3.55 | 0 / 3.55 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.9, 2.6, 0, 3.55), (6.72, 2.6, 0, 3.55), (11.54, 2.6, 0, 3.55)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_B18_PACKING_FINISH` at south GROUND_01, on the retained threshold; `ASSET_TEXTILE_BOOTH` at center GROUND_02; approved file and placement unchanged; `ASSET_B18_DYE_COUNTER` at north GROUND_03, front-served locked sample display; `ASSET_B18_ROOF_ACCESS` at roof room at x54.6..56.4, y40.9..44.7, base4.76, cap7.35.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_painted_plaster_warm`, plinth sandstone, impost band between the three arches, coping 4.34..4.5; end piers 0.60 × 0.16. Completion: low lime arcade of three repaired arches.
2. CREATE three sealed arches `GROUND_01/02/03` 2.6 × 3.55 at a=1.90/6.72/11.54 with floor deck 0.14. Interiors empty: `ASSET_B18_PACKING_FINISH` (a=1.90), the approved `ASSET_TEXTILE_BOOTH` (a=6.72, do not touch) and `ASSET_B18_DYE_COUNTER` (a=11.54) are placed. The booth's side braces seat on masonry at ±1.19 from its axis: give the `GROUND_02` piers a 0.05 flat seat at z 3.26. Completion: three different trades in three arches.
3. SD-08 awning: timber ledger 0.08 × 0.08 at z 3.00 spanning a=0.45..3.35, projection 1.20 m, hem drop 0.25, sag 0.12, two 45° timber brackets at the span ends, cloth `ph_hessian_230` over `GROUND_01` and the same over `GROUND_03` (a=10.09..12.99). None over `GROUND_02` (the booth carries its own). Completion: exactly two awnings.
4. CREATE sign brackets for `DYE_E_SIGN_1` (a=6.72, board centre z 3.80, span 3.65..3.95, brackets z 3.95) and `DYE_E_SIGN_2` (a=11.54, board centre z 3.67, span 3.52..3.82, brackets z 3.82). `GROUND_01` has no sign. Completion: two signs.
5. CREATE the lantern bracket at a=7.22: it starts at (53.0, 40.5, 4.365), reaches 0.50 m into the street to the placed lantern handle at (52.5, 40.5, 4.365), and carries `LANTERN_DYERS_01` centred at (52.5, 40.5, 4.10). Completion: lantern on a bracket.
6. KEEP `COVER_DYERS_01` (50.5, 43.6) and the process vessel at (51.98, 35.18). No floor stock. Completion: as stated.
7. KEEP the placed `ASSET_B18_ROOF_ACCESS` room at (55.5, 42.8, 4.76) (cap 7.35) and the roof tie `ASSET_ROOF_TIE_590` at y 45.36 on the parapet (the canopy's east seat; the GLB coping passes under its foot); CREATE the low service vent cluster on the roof toward y 38.3 as two 0.4 × 0.4 × 0.6 plaster boxes at (55.6, 38.2, 4.76) and (56.2, 38.6, 4.76) via `placements[]`. APPLY wear: dust band, indigo drips under `GROUND_03`, polish on jambs, west-facing bleach strong. Completion: as listed.

**Why it exists (reality check):** Three fabric businesses under repaired arches: a packer, the cloth booth and a dye-sample seller; their back store is off-map, the roof room is where the packer keeps bolts dry.

### FRONTAGE_COVERED_SOUK_SOUTH  ·  BLD_SOUK_YARD_WALL (compound wall, 1 storey)

- **Role:** compound wall. Coping and string course.
- **Wall line:** south edge of `COVERED_SOUK`; y = 32, x = 41.36 .. 45.56 (a runs west to east); length **4.2 m**; street side +Y (street lies north); kit `Wall(F, (41.36, 32), (45.56, 32), faces='N')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` |  | 2.1 | (43.46, 32) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.1, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_06`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.1. One spout at a=0.5. Completion: a garden wall with one niche.

**Why it exists (reality check):** The yard wall of the house behind the Souk's south end; the route passes beside it.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_DYERS_DISTRICT` | landmark | (43.1, 44.3, 0) | 1.5 × 1 | 0 | Sealed timber vats and a correctly scaled ceramic vessel identify the covered dyers route. |
| `COVER_DYERS_01` | cover_cluster | (50.5, 43.6, 0) | 1.8 × 1.2 | 75 | Dye pots and barrels stagger the route. |
| `LANTERN_DYERS_01` | lantern_anchor | (52.5, 40.5, 4.1) | 0.42 × 0.72 | 270 | CC0 wooden lantern under the dyers canopy. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_B18_DYE_COUNTER_B18_SAMPLE_DISPLAY` | `ASSET_B18_DYE_COUNTER` | `B18_SAMPLE_DISPLAY` | (53.17, 44.82, 0.14) | 1.48 × 0.34 × 2.11 | 90 | KEEP at this transform |
| `PLACE_CENTRAL_DYE_DISPLAY_CENTRAL_DYE_DISPLAY` | `ASSET_B18_DYE_COUNTER` | `CENTRAL_DYE_DISPLAY` | (40.83, 36.14, 0.14) | 1.48 × 0.34 × 2.11 | 270 | KEEP at this transform |
| `PLACE_B18_PACKING_FINISH_B18_PACKING_DISPLAY` | `ASSET_B18_PACKING_FINISH` | `B18_PACKING_DISPLAY` | (53.17, 35.18, 0.14) | 1.48 × 0.34 × 1.535 | 90 | KEEP at this transform |
| `PLACE_B18_ROOF_ACCESS_B18_ROOF_ACCESS` | `ASSET_B18_ROOF_ACCESS` | `B18_ROOF_ACCESS` | (55.5, 42.8, 4.76) | 1.8 × 3.8 × 2.59 | 180 | KEEP at this transform |
| `PLACE_L34_COVERED_SOUK_BASKET_LMK_DYERS_DISTRICT` | `ASSET_CC0_BASKET` | `LMK_DYERS_DISTRICT` | (42.38, 43.82, 0) | 0.413 × 0.298 × 0.24 | 348 | KEEP at this transform |
| `PLACE_DYERS_LANTERN_LANTERN_DYERS_01` | `ASSET_CC0_LANTERN` | `LANTERN_DYERS_01` | (52.5, 40.5, 4.1) | 0.221 × 0.235 × 0.53 | 270 | KEEP at this transform |
| `PLACE_DYERS_CANOPY_CANOPY_DYERS_01` | `ASSET_CLOTH_CANOPY` | `CANOPY_DYERS_01` | (47.15, 45.36, 5.9) | 4.4 × 11.7 × 0.18 | 90 | KEEP (raised 2026-09-07 to 5.90 at both ends: west on a ledger above the north-wing screen, east on a new roof tie; waiver CW-CCAEF9D05D21 retired) |
| `PLACE_DYERS_COVER_COVER_DYERS_01` | `ASSET_COVER_GOODS` | `COVER_DYERS_01` | (50.5, 43.6, 0) | 1.5 × 0.75 × 1 | 75 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_B4_SOUK_PROCESS_VESSEL_B4_SOUK_E_GOODS_GROUND_01` | `ASSET_DYERS_CERAMIC_VESSEL` | `B4_SOUK_E_GOODS_GROUND_01` | (51.98, 35.18, 0) | 0.551 × 0.422 × 0.312 | 277 | KEEP at this transform |
| `PLACE_DYERS_CERAMIC_VESSEL_LMK_DYERS_DISTRICT` | `ASSET_DYERS_CERAMIC_VESSEL` | `LMK_DYERS_DISTRICT` | (43.42, 43.88, 0) | 0.564 × 0.432 × 0.32 | 348 | KEEP at this transform |
| `PLACE_DYERS_VAT_EAST_LMK_DYERS_DISTRICT` | `ASSET_DYERS_SEALED_VAT` | `LMK_DYERS_DISTRICT` | (43.48, 44.5, 0) | 0.608 × 0.62 × 0.714 | 11 | KEEP at this transform |
| `PLACE_DYERS_VAT_WEST_LMK_DYERS_DISTRICT` | `ASSET_DYERS_SEALED_VAT` | `LMK_DYERS_DISTRICT` | (42.72, 44.42, 0) | 0.705 × 0.718 × 0.828 | 352 | KEEP at this transform |
| `PLACE_B4_SOUK_CART_B4_SOUK_W_CART_GROUND_01` | `ASSET_MARKET_CART` | `B4_SOUK_W_CART_GROUND_01` | (43.1, 36.14, 0) | 1.2 × 0.749 × 0.883 | 98 | KEEP at this transform |
| `PLACE_SUPPORT_CANOPY_DYERS_01_MOUNT_SUPPORT_CANOPY_DYERS_01` | `ASSET_ROOF_TIE_590` | `MOUNT_SUPPORT_CANOPY_DYERS_01` | (54.875, 45.36, 5.59) | 3.75 × 0.16 × 0.45 | 180 | KEEP at this transform |
| `PLACE_CENTRAL_SCREENS_COVERED_SOUK_CENTRAL_SCREEN_NORTH` | `ASSET_SCREEN_SC_C` | `CENTRAL_SCREEN_NORTH` | (40.985, 45.36, 4.15) | 1 × 0.24 × 1.4 | 270 | KEEP at this transform |
| `PLACE_CENTRAL_SCREENS_COVERED_SOUK_CENTRAL_SCREEN_SOUTH_1` | `ASSET_SCREEN_SC_C` | `CENTRAL_SCREEN_SOUTH_1` | (40.985, 34.38, 4.15) | 1 × 0.24 × 1.4 | 270 | KEEP at this transform |
| `PLACE_CENTRAL_SCREENS_COVERED_SOUK_CENTRAL_SCREEN_SOUTH_2` | `ASSET_SCREEN_SC_C` | `CENTRAL_SCREEN_SOUTH_2` | (40.985, 37.9, 4.15) | 1 × 0.24 × 1.4 | 270 | KEEP at this transform |
| `PLACE_DYERS_SIGNS_DYE_E_SIGN_1` | `ASSET_SIGNBOARD` | `DYE_E_SIGN_1` | (52.88, 40, 3.8) | 2.2 × 0.12 × 0.304 | 270 | KEEP (centre z 3.80, nominal board span 3.65..3.95; masonry stubs meet its top at z 3.95) |
| `PLACE_DYERS_SIGNS_DYE_E_SIGN_2` | `ASSET_SIGNBOARD` | `DYE_E_SIGN_2` | (52.88, 44.82, 3.67) | 2.2 × 0.12 × 0.304 | 270 | KEEP (centre z 3.67, nominal board span 3.52..3.82; masonry stubs meet its top at z 3.82) |
| `PLACE_DYERS_SIGNS_DYE_W_SIGN_1` | `ASSET_SIGNBOARD` | `DYE_W_SIGN_1` | (41.12, 36.14, 3.67) | 2.2 × 0.12 × 0.304 | 90 | KEEP (centre z 3.67, nominal board span 3.52..3.82; masonry stubs meet its top at z 3.82) |
| `PLACE_TEXTILE_BOOTH_DYE_E_TEXTILE_BOOTH` | `ASSET_TEXTILE_BOOTH` | `DYE_E_TEXTILE_BOOTH` | (52.735, 40, 0) | 2.683 × 1.291 × 3.64 | 90 | KEEP exactly (user-approved at this location; never move, scale or re-export) |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `CANOPY_DYERS_01` | (41, 45.36, 5.9) | (53, 45.36, 5.9) | 4.4 | Construction sheet 2026-09-07: both seats at 5.90, the west on a ledger above the north-wing screen (head 5.55), the east on a roof tie (ASSET_ROOF_TIE_590) behind the arcade parapet, as on Spice Street. Hem stays above 5.4 m. |

`CANOPY_DYERS_01` runs level at z 5.90 from the west north wing (41.3, 45.36) to the east parapet at a=0.899 (53, 45.36), the same construction as Spice Street: CREATE a 1.2 m ledger at z 5.90 on the west north wing; the east end bears on the placed roof tie `ASSET_ROOF_TIE_590` (`PLACE_SUPPORT_CANOPY_DYERS_01`, on the parapet cap 5.59 behind the arcade face). Cloth `ph_hessian_230`, sag ≤ 0.35, hem ≥ 5.4 over the sheltered floor.

## 6. Ground, wear and drainage

KEEP `court_limestone_flags_01`; polish along the centre; indigo drips under both dye counters; contact wear under the cover and vats; flush seams at y 32 / 48 and the east-mid link mouth.

**`COVERED_SOUK` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(46.7, 32.3, 0.014), (47.3, 32.3, 0.014), (47.3, 47.7, 0.014), (46.7, 47.7, 0.014)], 'polish')
wear_patch(F, [(41.02, 35.5, 0.014), (41.55, 35.5, 0.014), (41.55, 36.78, 0.014), (41.02, 36.78, 0.014)], 'dye')
wear_patch(F, [(52.45, 44.18, 0.014), (53.0, 44.18, 0.014), (53.0, 45.46, 0.014), (52.45, 45.46, 0.014)], 'dye')
wear_patch(F, [(42.74466, 36.876623, 0.014), (42.555384, 35.529858, 0.014), (43.45534, 35.403377, 0.014), (43.644616, 36.750142, 0.014)], 'dust')
wear_patch(F, [(52.225345, 34.791686, 0.014), (52.311999, 35.497426, 0.014), (51.734655, 35.568314, 0.014), (51.648001, 34.862574, 0.014)], 'dust')
wear_patch(F, [(43.127345, 43.515325, 0.014), (43.83568, 43.665886, 0.014), (43.712655, 44.244675, 0.014), (43.00432, 44.094114, 0.014)], 'dust')
wear_patch(F, [(49.845684, 44.283956, 0.014), (50.275324, 42.680519, 0.014), (51.154316, 42.916044, 0.014), (50.724676, 44.519481, 0.014)], 'dust')
wear_patch(F, [(43.028468, 44.190495, 0.014), (43.78271, 44.043885, 0.014), (43.931532, 44.809505, 0.014), (43.17729, 44.956115, 0.014)], 'dust')
wear_patch(F, [(42.352918, 43.924978, 0.014), (43.209308, 44.045335, 0.014), (43.087082, 44.915022, 0.014), (42.230692, 44.794665, 0.014)], 'dust')
wear_patch(F, [(42.147627, 43.536441, 0.014), (42.707617, 43.65547, 0.014), (42.612373, 44.103559, 0.014), (42.052383, 43.98453, 0.014)], 'dust')
wear_patch(F, [(52.0095, 41.4215, 0.014), (52.0095, 38.5785, 0.014), (53, 38.5785, 0.014), (53, 41.4215, 0.014)], 'dust')
```

## 7. Roofs and skyline

East: slab 4.76, parapet 5.59, the placed roof room (cap 7.35) and the two vent boxes; the Souk massing owns the west merchant-house shared 7.0 / 8.19 roof, so this GLB adds none. The north end wall (x 41..46, y 48) is an arcade end wall: quiet stone field, coping at 7.0, zero arches.

## 8. Required result

- [ ] Three east arches with three different trades; the booth untouched; two awnings (bays 01 and 03) and two signs on the east (z 3.80 over the booth, 3.67 over the dye counter).
- [ ] West: one arch with the dye counter, two seated screens, the north-wing door quiet; canopy ends on the west ledger and the east roof tie.
- [ ] Lantern on a bracket; the west-mid link turn empty.
- [ ] Every scheduled finished-frontage opening exists at its `a`, sill and head; Dogleg door, windows and vents remain the matching runtime-owned modules.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] Wear follows cause: dirt band at the base, streak under every spout, hand-polish at door jambs 0.9–1.4 m, cart scuffs at store doors, sun bleach on south and west upper fields only.

Record `built` in the progress index after applying the package. Gameplay, visual and performance validation occur in the later validation task.

