# unit-north-court · North Court

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: North Court.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The drying court and release: the hammam's heavy door and service wing on the west, a small house and the dyers' yard wall with the drying station on the east, garden walls north and south, the drying line and palm overhead. Open centre, warm aged surfaces, and activity limited to the drying station and service threshold.

**Character schedule (build with the numbered tasks):**

- The plaster hammam, stone service wing, rubble house and cut-stone drying wall remain distinct. The retained station rug, drying cloth, planter and palm show work and domestic care around a swept open court.
- Keep the hammam entry surround intact and eased per SD-21, with concentrated hand polish rather than a new plaster patch. Keep high walls quiet; bath steam stays by the low vent and dye stays at the drying station. Do not spread the wet-trade finish onto the home or the two garden walls.

## 2. Site

### Site · `NORTH_COURT` (North Court)

- Rect x 41..53, y 62..80 (12 × 18 m); floor z = 0; floor `court_limestone_flags_01`; authored clear width **4.5 m** (protected).
- Connects: DYERS_DOGLEG, LINK_EAST_UPPER, LINK_NORTH_EAST.
- `west` edge: frontage `FRONTAGE_NORTH_COURT_WEST` → `BLD_HAMMAM`.
- `west` edge: frontage `FRONTAGE_NORTH_COURT_WEST_SOUTH` → `BLD_HAMMAM`.
- `north` edge: frontage `FRONTAGE_NORTH_COURT_NORTH` → `BLD_NORTH_YARD_WALL_N`.
- `east` edge: frontage `FRONTAGE_NORTH_COURT_EAST_S` → `BLD_NORTH_HOUSE_S`.
- `east` edge: frontage `FRONTAGE_NORTH_COURT_EAST_N` → `BLD_NORTH_DYERS_YARD`.
- `south` edge: frontage `FRONTAGE_NORTH_COURT_SOUTH` → `BLD_NORTH_YARD_WALL_S`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-north-court/` | `NORTH_COURT` | `["east", "north", "south", "west"]` | `unit-north-court.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** No unit folder.

## 3. Walls

### FRONTAGE_NORTH_COURT_WEST  ·  BLD_HAMMAM (landmark, 1 storey)

- **Role:** landmark. A hammam: one heavy door, high windows for light and steam, a low vent for the furnace room.
- **Wall line:** west edge of `NORTH_COURT`; x = 41, y = 72 .. 76 (a runs south to north); length **4 m**; street side +X (street lies east of the wall); kit `Wall(F, (41, 72), (41, 76), faces='E')`.
- **Retained massing `MASSING_MID_MIXED`:** wall top 7 local / 7 absolute, depth 4.8 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_beige_wall_002`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `open`. Ground head datum 2.965 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 5.15 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; impost band 3.04..3.16; sill course 4.97..5.09; coping 6.84..7.0; parapet +0.75.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `door_fortified_gate` | heavy closed hammam door (`ASSET_CC0_LARGE_CASTLE_DOOR` model) | 2 | (41, 74) | 2.012 × 0.339 × 2.965 | 0 / 2.965 | 0 |
| `STORY_1_WINDOW_01` | `window_dark_recess` |  | 2 | (41, 74) | 0.9 × 0.28 × 1.25 | 5.15 / 6.4 | 1 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.0, 2.012, 0, 2.965), (2.0, 0.9, 5.15, 1.25)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_CC0_LANTERN` at flanking the gate at 0.50 m along, under the head; `ASSET_CC0_LANTERN` at flanking the gate at 3.50 m along, under the head.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_beige_wall_002`, plinth sandstone, impost band, sill course, coping; end piers 0.60. Completion: the bath hall, plain and tall.
2. CREATE `GROUND_01` the fortified door 2.012 × 2.965 at a=2.0: model the surround in the kit (stone jambs 0.20, pointed head, 0.34 reveal) and import the CC0 leaf `apps/client/public/assets/models/environment/bazaar/doors/large_castle_door/large_castle_door_2k.gltf` into `build.py` at the bay axis (a bound section finish suppresses the runtime's door-model placement, so the leaf must travel in the GLB). Completion: one heavy closed door, no gap under it.
3. CREATE `STORY_1_WINDOW_01` dark recess 0.9 × 1.25 at sill 5.15 / head 6.40, a=2.0. Completion: one high window.
4. No dome, no raised parapet, no awning, sign or props. APPLY wear: dust band, steam staining 0..0.6 at a=0.3 (a low vent grille 0.3 × 0.3 at z 0.5 there), polish at the door. Completion: as listed.

**Why it exists (reality check):** A hammam: one heavy door, high windows for light and steam, a low vent for the furnace room.

### FRONTAGE_NORTH_COURT_WEST_SOUTH  ·  BLD_HAMMAM (landmark, 1 storey)

- **Role:** landmark. The bath's service wing across the link: the stoker's door.
- **Wall line:** west edge of `NORTH_COURT`; x = 41, y = 63.44 .. 67 (a runs south to north); length **3.56 m**; street side +X (street lies east of the wall); kit `Wall(F, (41, 63.44), (41, 67), faces='E')`.
- **Retained massing `MASSING_MID_MIXED`:** wall top 7 local / 7 absolute, depth 4.8 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_05`, trim `ph_stone_trim_white`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 2.25 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 5.15 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; string course 2.90; sill course 4.97..5.09; coping 6.84..7.0.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `door_residential_timber` |  | 1.78 | (41, 65.22) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |
| `STORY_1_WINDOW_01` | `window_dark_recess` |  | 1.78 | (41, 65.22) | 0.9 × 0.28 × 1.25 | 5.15 / 6.4 | 1 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.78, 1.05, 0, 2.25), (1.78, 0.9, 5.15, 1.25)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_05` (stone wing to the plaster hall), plinth, course, sill course, coping; end piers 0.45. Completion: same coping as the hall.
2. CREATE `GROUND_01` closed door 1.05 × 2.25 at a=1.78 and `STORY_1_WINDOW_01` dark recess 0.9 × 1.25 at sill 5.15 / head 6.40, a=1.78. Completion: door and window on one axis.
3. APPLY wear: dust band, polish at the door. Nothing else. Completion: as listed.

**Why it exists (reality check):** The bath's service wing across the link: the stoker's door.

### FRONTAGE_NORTH_COURT_NORTH  ·  BLD_NORTH_YARD_WALL_N (compound wall, 1 storey)

- **Role:** compound wall. The north enclosure of the drying court.
- **Wall line:** north edge of `NORTH_COURT`; y = 80, x = 46 .. 52.04 (a runs west to east); length **6.04 m**; street side -Y (street lies south); kit `Wall(F, (46, 80), (52.04, 80), faces='S')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` |  | 2.013 | (48.013, 80) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |
| `BAY_02` | `blind_niche` |  | 4.027 | (50.027, 80) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.013313, 1.05, 1.3, 1.8), (4.026687, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_06`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01/02` niches at sill 1.30, a=2.013/4.027. No central gate. The drying line `L3R0_NORTH_DYERS_LINE_01` ends at (41.35, 75, 4.8) and (52.65, 75, 4.6) on the flanking walls, not on this one. One spout at a=5.5. Completion: two niches under an unbroken coping.

**Why it exists (reality check):** The north enclosure of the drying court.

### FRONTAGE_NORTH_COURT_EAST_S  ·  BLD_NORTH_HOUSE_S (house, 1 storey)

- **Role:** house. A one-room house on the court: door in the middle, a window each side, roof drains to the corner.
- **Wall line:** east edge of `NORTH_COURT`; x = 53, y = 63.44 .. 71 (a runs south to north); length **7.56 m**; street side -X (street lies west of the wall); kit `Wall(F, (53, 63.44), (53, 71), faces='W')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 2.25 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44 (relief wall); string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_WINDOW_S` | `window_dark_recess` |  | 1.7 | (53, 65.14) | 0.9 × 0.28 × 1.25 | 1 / 2.25 | 0 |
| `BAY_DOOR` | `door_residential_timber` |  | 3.78 | (53, 67.22) | 1.05 × 0.2 × 2.25 | 0 / 2.25 | 0 |
| `BAY_WINDOW_N` | `window_dark_recess` |  | 5.86 | (53, 69.3) | 0.9 × 0.28 × 1.25 | 1 / 2.25 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.700017, 0.9, 1, 1.25), (3.78, 1.05, 0, 2.25), (5.859983, 0.9, 1, 1.25)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_CC0_LANTERN` at over the door at 3.78 m along, under the head; `ASSET_CC0_POTTERY` at beside the door on the north side.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_06`, plinth 0..0.44, course 2.84..2.96, coping 4.74..4.9; end piers 0.45. Completion: a low stone house on the court.
2. CREATE `BAY_DOOR` 1.05 × 2.25 at a=3.78 (SD-05) and the mirrored pair `BAY_WINDOW_S/N` dark recesses 0.9 × 1.25 at sill 1.0 / head 2.25, a=1.70/5.86 with closed dark leaves and 0.06 sills. Completion: door on axis, windows mirrored.
3. No pottery at the threshold (old brief), no awning, sign, balcony. KEEP the court's planter at (52.0, 76.2) (it is North Court's, not this house's). APPLY wear: dust band, polish at the door, one spout SD-13 at a=0.5. Completion: as listed.

**Why it exists (reality check):** A one-room house on the court: door in the middle, a window each side, roof drains to the corner.

### FRONTAGE_NORTH_COURT_EAST_N  ·  BLD_NORTH_DYERS_YARD (workshop, 1 storey)

- **Role:** workshop. The dyers' drying yard wall: no door (access from the works behind), two blind bays, the rack where cloth dries in the sun.
- **Wall line:** east edge of `NORTH_COURT`; x = 53, y = 71 .. 78.56 (a runs south to north); length **7.56 m**; street side -X (street lies west of the wall); kit `Wall(F, (53, 71), (53, 78.56), faces='W')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 2.5 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_NICHE_S` | `blind_niche` |  | 2.345 | (53, 73.345) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |
| `BAY_NICHE_N` | `blind_niche` |  | 5.215 | (53, 76.215) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.345112, 1.05, 0.7, 1.8), (5.214888, 1.05, 0.7, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_DYERS_HANGING_TEXTILES` at existing rack L3R0_NORTH_DYERS_BAY_01, keep; `ASSET_DYERS_SEALED_VAT` at existing, keep; `ASSET_MARKET_STALL` at existing, keep; asset itself is on the parts list.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_05` (cut stone against the house's rubble: correlated difference), plinth, course, coping; end piers 0.45. Completion: as datums.
2. CREATE `BAY_NICHE_S/N` 1.05 × 1.8 at sill 0.70, a=2.345/5.215. Completion: two bricked-up bays framing the drying station.
3. KEEP the drying station at `L3R0_NORTH_DYERS_BAY_01` (stall (50.85, 73.2), rack (52.17, 73.3), vat, rug) as one bounded work area; CREATE two iron rack hooks in the wall at z 2.4, a=1.8 and a=2.8, from which the placed rack hangs. No new vats. Completion: the rack reads as hung from the wall.
4. APPLY wear: dust band, indigo drips 0..0.4 under the rack, one spout at a=7.0. Completion: as listed.

**Why it exists (reality check):** The dyers' drying yard wall: no door (access from the works behind), two blind bays, the rack where cloth dries in the sun.

### FRONTAGE_NORTH_COURT_SOUTH  ·  BLD_NORTH_YARD_WALL_S (compound wall, 1 storey)

- **Role:** compound wall. Yard wall closing the court's south side beside the dogleg arrival.
- **Wall line:** south edge of `NORTH_COURT`; y = 62, x = 41.36 .. 45.56 (a runs west to east); length **4.2 m**; street side +Y (street lies north); kit `Wall(F, (41.36, 62), (45.56, 62), faces='N')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` |  | 2.1 | (43.46, 62) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.1, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_whitewashed_brick_warm`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.1. One spout at a=3.7. Completion: as stated; the dogleg turn beside it stays empty.

**Why it exists (reality check):** Yard wall closing the court's south side beside the dogleg arrival.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. New free placements go in `placements[]` with their scheduled coordinates. Fitted details such as the named repair skins and back-wall textiles travel inside the owning section; do not duplicate them as placements.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `OPEN_NORTH_COURT` | open_node | (47.2, 70.2, 0) |  | 0 | Open dyers north-court rotation pocket. |
| `COVER_NORTH_01` | cover_cluster | (43.2, 66, 0) | 2.1 × 1.25 | 10 | Merchant crates obscure the cross-link sightline. |
| `PALM_NORTH_01` | decorative_palm | (50.6, 77.2, 0) | 7.8 | 0 | North court silhouette marker. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_L34_NORTH_PLANTER_EAST_L34_NORTH_PLANTER_EAST` | `ASSET_COURT_PLANTER` | `L34_NORTH_PLANTER_EAST` | (52, 76.2, 0) | 0.903 × 0.903 × 1.032 | 11 | KEEP at this transform |
| `PLACE_NORTH_COVER_COVER_NORTH_01` | `ASSET_COVER_GOODS` | `COVER_NORTH_01` | (43.2, 66, 0) | 1.5 × 0.75 × 1 | 10 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_L3R0_NORTH_VESSEL_L34_NORTH_DYERS_BAY_02` | `ASSET_DYERS_CERAMIC_VESSEL` | `L34_NORTH_DYERS_BAY_02` | (42.55, 73.75, 0) | 0.538 × 0.412 × 0.305 | 7 | KEEP at this transform |
| `PLACE_L3R0_NORTH_DYERS_WALL_RACK_L3R0_NORTH_DYERS_BAY_01` | `ASSET_DYERS_HANGING_TEXTILES` | `L3R0_NORTH_DYERS_BAY_01` | (52.17, 73.3, 1.18) | 2.475 × 0.176 × 1.705 | 90 | KEEP at this transform |
| `PLACE_L3R0_NORTH_VAT_EAST_L3R0_NORTH_DYERS_BAY_01` | `ASSET_DYERS_SEALED_VAT` | `L3R0_NORTH_DYERS_BAY_01` | (52.17, 74.3, 0) | 0.564 × 0.575 × 0.662 | 11 | KEEP at this transform |
| `PLACE_L3R0_NORTH_VAT_WEST_L34_NORTH_DYERS_BAY_02` | `ASSET_DYERS_SEALED_VAT` | `L34_NORTH_DYERS_BAY_02` | (42.55, 72.85, 0) | 0.608 × 0.62 × 0.714 | 351 | KEEP at this transform |
| `PLACE_L34_NORTH_WORKSTATION_02_L34_NORTH_WORKSTATION_02` | `ASSET_DYERS_WORKSTATION` | `L34_NORTH_WORKSTATION_02` | (42.1, 77, 0) | 2.94 × 1.522 × 2.31 | 90 | KEEP at this transform |
| `PLACE_L3R0_NORTH_RUG_L3R0_NORTH_DYERS_BAY_01` | `ASSET_GROUND_RUG` | `L3R0_NORTH_DYERS_BAY_01` | (51.45, 73.3, 0) | 2.357 × 1.15 × 0.042 | 358 | KEEP at this transform |
| `PLACE_L3R0_NORTH_DYERS_LINE_L3R0_NORTH_DYERS_LINE_01` | `ASSET_LAUNDRY_LINE` | `L3R0_NORTH_DYERS_LINE_01` | (47, 75.3, 4.7) | 1.3 × 11.3 × 0.85 | 90 | KEEP (shifted 2026-09-07 to y 75.3; garments clear the hammam window at y 73.55..74.45; waiver CW-1AD31D32494E retired) |
| `PLACE_L3R0_NORTH_STALL_L3R0_NORTH_DYERS_BAY_01` | `ASSET_MARKET_STALL` | `L3R0_NORTH_DYERS_BAY_01` | (50.85, 73.2, 0) | 2.09 × 1.282 × 2.09 | 90 | KEEP at this transform |
| `PLACE_NORTH_PALM_PALM_NORTH_01` | `ASSET_PALM` | `PALM_NORTH_01` | (50.6, 77.2, 0) | 3.8 × 3.8 × 7.8 | 0 | KEEP (silhouette marker) |
| `PLACE_L3R0_NORTH_EXIT_SIGN_L3R0_NORTH_EXIT_SIGN_01` | `ASSET_SIGNBOARD` | `L3R0_NORTH_EXIT_SIGN_01` | (41.28, 69.5, 2.35) | 1.4 × 0.12 × 0.38 | 90 | KEEP (route sign) |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `L3R0_NORTH_DYERS_LINE_01` | (41.35, 75.3, 4.8) | (52.65, 75.3, 4.6) | 1.3 | L3.R0 authored override: one dyed-textile workshop line seats 0.35 m into the opposing court walls above the 3.5 m clearance and marks the dyers identity without entering circulation. |

## 6. Ground, wear and drainage

KEEP `court_limestone_flags_01`; polish across the open centre; indigo drips under the drying station; contact wear under the cover, planter and workstation; flush seams into the three links.

**`NORTH_COURT` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(46.7, 62.3, 0.014), (47.3, 62.3, 0.014), (47.3, 79.7, 0.014), (46.7, 79.7, 0.014)], 'polish')
wear_patch(F, [(51.55, 72.65, 0.014), (53.0, 72.65, 0.014), (53.0, 73.95, 0.014), (51.55, 73.95, 0.014)], 'dye')
wear_patch(F, [(41.45, 76.35, 0.014), (42.85, 76.35, 0.014), (42.85, 77.65, 0.014), (41.45, 77.65, 0.014)], 'dye')
wear_patch(F, [(51.37685, 75.77968, 0.014), (52.42032, 75.57685, 0.014), (52.62315, 76.62032, 0.014), (51.57968, 76.82315, 0.014)], 'dust')
wear_patch(F, [(41.25875, 78.55, 0.014), (41.25875, 75.45, 0.014), (42.94125, 75.45, 0.014), (42.94125, 78.55, 0.014)], 'dust')
wear_patch(F, [(50.12875, 74.325, 0.014), (50.12875, 72.075, 0.014), (51.57125, 72.075, 0.014), (51.57125, 74.325, 0.014)], 'dust')
wear_patch(F, [(51.744644, 74.008513, 0.014), (52.45519, 73.870397, 0.014), (52.595356, 74.591487, 0.014), (51.88481, 74.729603, 0.014)], 'dust')
wear_patch(F, [(42.231556, 72.404728, 0.014), (42.990455, 72.524926, 0.014), (42.868444, 73.295272, 0.014), (42.109545, 73.175074, 0.014)], 'dust')
wear_patch(F, [(42.168808, 73.508838, 0.014), (42.861526, 73.423783, 0.014), (42.931192, 73.991162, 0.014), (42.238474, 74.076217, 0.014)], 'dust')
wear_patch(F, [(42.3036, 65.69604, 0.014), (43.938381, 65.407784, 0.014), (44.0964, 66.30396, 0.014), (42.461619, 66.592216, 0.014)], 'dust')
wear_patch(F, [(48.62, 75.22, 0.014), (52.58, 75.22, 0.014), (52.58, 79.18, 0.014), (48.62, 79.18, 0.014)], 'dust')
```

## 7. Roofs and skyline

Hammam 7.0 / 8.19 (no dome); east houses and walls 4.9 / 5.79; palm at (50.6, 77.2). Nothing else.

## 8. Required result

- [ ] Hammam door heavy and closed, high window over it; wing door and window on one axis.
- [ ] House: door centred, windows mirrored; yard wall: two niches, rack on hooks; north and south walls: niches at sill 1.3, no gate.
- [ ] Every scheduled opening exists at its `a`, sill and head; retained code-owned openings in this area stay unchanged. No requirement imports work from another area.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Inspect one close-up of every distinct assembly and one assembled context view with retained roofs, overheads, signs, dressing and ground. Confirm receiving surfaces, export materials, and no unintended coplanar faces; counts alone are insufficient.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] The character schedule is present: distinct material fields, supported textiles where scheduled, sound softened edges, and localized wear. SD-12 bands are maximum receiving envelopes, never uniform brown strips; bleach follows the explicitly named exposed face.

Record `built` after package application and the bounded construction inspection in README.md. Report export, assembly/interface evidence and any unavailable checks separately. Gameplay, aesthetic and performance acceptance remain the later validation task.

