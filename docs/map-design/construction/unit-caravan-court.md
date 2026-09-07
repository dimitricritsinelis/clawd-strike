# unit-caravan-court · Caravan Court

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: Caravan Court, caravan yard.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The loading yard: two store doors under one storage head on the west, garden walls with one niche each on the east, the crate stack and cart at the north end under the loading shade and pack line. Warm sun-aged surfaces and red sandstone paving carry wheel scuffs toward the receiving door.

**Character schedule (build with the numbered tasks):**

- Rubble stores, coarse lime garden walls, red paving and retained cart/crates distinguish a busy receiving yard. Door envelopes and hardware counts match, but grain, edge wear and handling marks differ; the south receiving door has the stronger polish and bumper scuffs.
- The three north-east repair fields are explicitly bounded in wall task 1 and use SD-21 irregular trowel edges; leave the south garden wall quieter. Wheel scuffs remain discontinuous color/roughness marks in their printed polygons, never grooves, muddy ruts or rubble piles.

## 2. Site

### Site · `CARAVAN_COURT` (Caravan Court)

- Rect x 3..15, y 30..48 (12 × 18 m); floor z = 0; floor `red_sandstone_pavement`; authored clear width **4.5 m** (protected).
- Connects: LINK_WEST_MID, SERVICE_NORTH, SERVICE_SOUTH, TEA_RAMP.
- `north` edge: exempt (`short_wall_return`): Only 1.00m of the 12.00m north edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `south` edge: exempt (`architectural_cut_edge`): The 5.00m supported run on the 12.00m south edge frames an authored connector cut and is not a served facade plane.
- `west` edge: frontage `FRONTAGE_CARAVAN_COURT_WEST` → `BLD_CARAVAN_STORES`.
- `east` edge: frontage `FRONTAGE_CARAVAN_COURT_EAST_SOUTH` → `BLD_CARAVAN_YARD_WALL_S`.
- `east` edge: frontage `FRONTAGE_CARAVAN_COURT_EAST_NORTH` → `BLD_CARAVAN_YARD_WALL_N`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-caravan-court/` | `CARAVAN_COURT` | `["east", "west"]` | `unit-caravan-court.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** `assets/source/unit-caravan-court/` holds three GLBs and previews but no `package.json`; reference only.

## 3. Walls

### FRONTAGE_CARAVAN_COURT_WEST  ·  BLD_CARAVAN_STORES (store row, 1 storey)

- **Role:** store row. Two locked caravanserai stores with handcart doors (1.35 m, not wagon gates) between blank bays; goods are handled in the yard, not stored against the wall.
- **Wall line:** west edge of `CARAVAN_COURT`; x = 3, y = 31.44 .. 46.56 (a runs south to north); length **15.12 m**; street side +X (street lies east of the wall); kit `Wall(F, (3, 31.44), (3, 46.56), faces='E')`.
- **Retained massing `MASSING_LOW_MERCHANT`:** wall top 4.5 local / 4.5 absolute, depth 4.2 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 2.5 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.28; one continuous storage head at 2.5 (the doors' lintel line runs the full length as a 0.20 stone band 2.50..2.70); coping 4.34..4.5; parapet +0.65.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_NICHE_S` | `blind_niche` |  | 2.07 | (3, 33.51) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |
| `BAY_DOOR_S` | `door_storage_heavy` | primary receiving door (closed, cart scuffs) | 4.815 | (3, 36.255) | 1.35 × 0.25 × 2.5 | 0 / 2.5 | 0 |
| `BAY_NICHE_AXIS` | `blind_niche` |  | 7.56 | (3, 39) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |
| `BAY_DOOR_N` | `door_storage_heavy` | second store door (closed) | 10.305 | (3, 41.745) | 1.35 × 0.25 × 2.5 | 0 / 2.5 | 0 |
| `BAY_NICHE_N` | `blind_niche` |  | 13.05 | (3, 44.49) | 1.05 × 0.18 × 1.8 | 0.7 / 2.5 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.069928, 1.05, 0.7, 1.8), (4.814964, 1.35, 0, 2.5), (7.56, 1.05, 0.7, 1.8), (10.305036, 1.35, 0, 2.5), (13.050072, 1.05, 0.7, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.

Bound dressing from the schedule (`walls[].dressing`): `ASSET_CARAVAN_LOAD_CRATE` at a stack beside each store door, on the pier side; `ASSET_COVER_GOODS` at existing COVER_CARAVAN_01, keep; `ASSET_LAUNDRY_LINE` at existing L34_CARAVAN_PACK_LINE_01, keep.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_06`, plinth, continuous lintel band `ph_stone_trim_white` 2.50..2.70 × 0.08 the full length, coping 4.34..4.5; corners `held`: end piers 0.45 × 0.16. Completion: one storage-yard head across five bays.
2. CREATE two heavy store doors `BAY_DOOR_S/N` 1.35 × 2.5 at a=4.815/10.305: double leaves `ph_weathered_brown_planks`, three iron straps each, a 0.6 m timber bumper rail at 0.35 m across each door (cart protection), SD-05 threshold. `BAY_DOOR_S` is the receiving door: heavier scuffs. Completion: two identical closed store doors, the south one more worn.
3. CREATE three blind niches `BAY_NICHE_S/AXIS/N` 1.05 × 1.8 at sill 0.70, a=2.07/7.56/13.05 (SD-18). Completion: read as bricked-up bays between the doors.
4. KEEP the loading cluster (crates at (13.7..14.5, 45.9..46.1), cart at (14.1, 45.05)) and the cover at (5.0, 34.2); the 0.8 m floors in front of both doors stay empty. No shop signs; no awning. Completion: as stated.
5. CREATE one drain spout (SD-13) at a=0.6 and one at a=14.5 with streaks; APPLY wear: dirt band, cart scuffs 0..0.6 at both doors, two 0.05 m wide wheel scuffs in colour and roughness only (ground task). Completion: as listed.

**Why it exists (reality check):** Two locked caravanserai stores with handcart doors (1.35 m, not wagon gates) between blank bays; goods are handled in the yard, not stored against the wall.

### FRONTAGE_CARAVAN_COURT_EAST_SOUTH  ·  BLD_CARAVAN_YARD_WALL_S (compound wall, 1 storey)

- **Role:** compound wall. A garden enclosure south of the west-mid link.
- **Wall line:** east edge of `CARAVAN_COURT`; x = 15, y = 30.54 .. 35.4 (a runs south to north); length **4.86 m**; street side -X (street lies west of the wall); kit `Wall(F, (15, 30.54), (15, 35.4), faces='W')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_plastered_wall`, trim `ph_stone_trim_white`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` |  | 2.43 | (15, 32.97) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.43, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_plastered_wall`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.43. One spout at a=0.4. Completion: garden wall, empty base.

**Why it exists (reality check):** A garden enclosure south of the west-mid link.

### FRONTAGE_CARAVAN_COURT_EAST_NORTH  ·  BLD_CARAVAN_YARD_WALL_N (compound wall, 1 storey)

- **Role:** compound wall. The north garden wall, patched where carts have hit it.
- **Wall line:** east edge of `CARAVAN_COURT`; x = 15, y = 41.52 .. 47.46 (a runs south to north); length **5.94 m**; street side -X (street lies west of the wall); kit `Wall(F, (15, 41.52), (15, 47.46), faces='W')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` |  | 2.97 | (15, 44.49) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.97, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_whitewashed_brick_warm` with three replacement-skin repairs in `ph_plastered_wall`: a=0.90..1.50, z=0.48..1.08; a=3.73..4.27, z=0.70..1.30; a=4.90..5.40, z=0.44..0.91 (SD-21; varying low cart-contact repairs, no overlay slabs), plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=2.97. The loading shade `CARAVAN_LOAD_SHADE_01` and pack line end at (13.8, 46.6, 4.32) / (14.65, 47.8, 4.35) on this wall's north pier: CREATE two iron eyes there. One spout at a=5.5. Completion: repaired plaster field, one niche, canopy ends bearing on eyes.

**Why it exists (reality check):** The north garden wall, patched where carts have hit it.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. New free placements go in `placements[]` with their scheduled coordinates. Fitted details such as the named repair skins and back-wall textiles travel inside the owning section; do not duplicate them as placements.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_CARAVAN_DISTRICT` | landmark | (14.1, 46, 0) | 1.8 × 1 | 0 | L3.4 authored east loading-bay override: the grounded crate stack joins the basket and pottery supply beat south of the ramp mouth, outside the 4.5 m court lane. |
| `OPEN_CARAVAN_CENTER` | open_node | (9.2, 39.2, 0) |  | 0 | Open caravan court turning pocket. |
| `COVER_CARAVAN_01` | cover_cluster | (5, 34.2, 0) | 1.8 × 1.25 | 20 | Cargo stack at the west edge. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_CARAVAN_LOAD_NORTH_LMK_CARAVAN_DISTRICT` | `ASSET_CARAVAN_LOAD_CRATE` | `LMK_CARAVAN_DISTRICT` | (14.52, 46.12, 0) | 0.792 × 0.393 × 0.336 | 9 | KEEP at this transform |
| `PLACE_CARAVAN_LOAD_SOUTH_LMK_CARAVAN_DISTRICT` | `ASSET_CARAVAN_LOAD_CRATE` | `LMK_CARAVAN_DISTRICT` | (13.7, 45.92, 0) | 0.891 × 0.442 × 0.378 | 353 | KEEP at this transform |
| `PLACE_CARAVAN_LOAD_TOP_LMK_CARAVAN_DISTRICT` | `ASSET_CARAVAN_LOAD_CRATE` | `LMK_CARAVAN_DISTRICT` | (14.07, 46, 0.38) | 0.743 × 0.368 × 0.315 | 4 | KEEP at this transform |
| `PLACE_CARAVAN_LOAD_SHADE_CARAVAN_LOAD_SHADE_01` | `ASSET_CLOTH_CANOPY` | `CARAVAN_LOAD_SHADE_01` | (9, 46.6, 4.41) | 2.2 × 9.6 × 0.18 | 90 | KEEP at this transform |
| `PLACE_CARAVAN_COVER_COVER_CARAVAN_01` | `ASSET_COVER_GOODS` | `COVER_CARAVAN_01` | (5, 34.2, 0) | 1.5 × 0.75 × 1 | 20 | KEEP (gameplay cover; silhouette and collider protected) |
| `PLACE_L34_CARAVAN_PACK_LINE_L34_CARAVAN_PACK_LINE_01` | `ASSET_LAUNDRY_LINE` | `L34_CARAVAN_PACK_LINE_01` | (9, 47.8, 4.375) | 1.2 × 11.3 × 0.85 | 90 | KEEP at this transform |
| `PLACE_L34_CARAVAN_CART_L34_CARAVAN_CART_01` | `ASSET_MARKET_CART` | `L34_CARAVAN_CART_01` | (14.1, 45.05, 0) | 1.3 × 0.811 × 0.957 | 261 | KEEP at this transform |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |
|---|---|---|---|---|
| `L34_CARAVAN_PACK_LINE_01` | (3.35, 47.8, 4.4) | (14.65, 47.8, 4.35) | 1.2 | L3.4 R4 zone-derived caravan pack-textile line spans opposing edge bands above a 3.5 m hem clearance, adding frame-scale loading identity without entering the 4.5 m court route. |
| `CARAVAN_LOAD_SHADE_01` | (4.2, 46.6, 4.5) | (13.8, 46.6, 4.32) | 2.2 | Loading shade spanning the yard between the two ramp-approach piers, seated in both edge bands above the 4.5 m court route so the caravan bay finally has a supported cover. |

## 6. Ground, wear and drainage

KEEP `red_sandstone_pavement`; two 0.05 m wide wheel scuffs in colour and roughness only run from the cart at (14.1, 45.05) toward `BAY_DOOR_S` at (3, 36.26), with no displacement; flush ramp transition at y 48; contact wear under the crates and cover.

**`CARAVAN_COURT` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(8.7, 30.3, 0.014), (9.3, 30.3, 0.014), (9.3, 47.7, 0.014), (8.7, 47.7, 0.014)], 'polish')
wear_patch(F, [(14.29, 44.76, 0.014), (14.33, 44.73, 0.014), (3.23, 35.94, 0.014), (3.19, 35.97, 0.014)], 'rut')
wear_patch(F, [(13.91, 45.37, 0.014), (13.87, 45.4, 0.014), (3.13, 36.64, 0.014), (3.17, 36.61, 0.014)], 'rut')
wear_patch(F, [(4.064436, 34.056317, 0.014), (5.624326, 33.488563, 0.014), (5.935564, 34.343683, 0.014), (4.375674, 34.911437, 0.014)], 'dust')
wear_patch(F, [(14.006508, 45.921587, 0.014), (14.947047, 45.772621, 0.014), (15, 46.318413, 0.014), (14.092953, 46.467379, 0.014)], 'dust')
wear_patch(F, [(13.214933, 45.557347, 0.014), (14.258392, 45.685468, 0.014), (14.185067, 46.282653, 0.014), (13.141608, 46.154532, 0.014)], 'dust')
wear_patch(F, [(14.693819, 44.404952, 0.014), (14.465424, 45.846977, 0.014), (13.506181, 45.695048, 0.014), (13.734576, 44.253023, 0.014)], 'dust')
```

## 7. Roofs and skyline

Stores 4.5 / 5.59; yard walls 4.9 / 5.79. Nothing on the roofs.

## 8. Required result

- [ ] Two identical store doors, the south one more worn; three niches at sill 0.7.
- [ ] Loading shade and pack line ends bear on eyes on the walls; nothing in the turning pocket at (9.2, 39.2).
- [ ] Every scheduled opening exists at its `a`, sill and head; retained code-owned openings in this area stay unchanged. No requirement imports work from another area.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Inspect one close-up of every distinct assembly and one assembled context view with retained roofs, overheads, signs, dressing and ground. Confirm receiving surfaces, export materials, and no unintended coplanar faces; counts alone are insufficient.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] The character schedule is present: distinct material fields, supported textiles where scheduled, sound softened edges, and localized wear. SD-12 bands are maximum receiving envelopes, never uniform brown strips; bleach follows the explicitly named exposed face.

Record `built` after package application and the bounded construction inspection in README.md. Report export, assembly/interface evidence and any unavailable checks separately. Gameplay, aesthetic and performance acceptance remain the later validation task.

