# unit-spawn-b-courtyard · Spawn B courtyard

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: spawn B, B spawn, north spawn.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The quiet receiving court: two low enclosure wings either side of the gate, benches and pots at the west wall, shade over the two sealed north doors, three upper rooms and a palm on the skyline behind the sealed walls. It stays comparatively quiet, with a warm aged base and contact wear.

**Character schedule (build with the numbered tasks):**

- Two enclosure wings already differ in cut stone west versus rubble east. Keep the bench, pottery, shade, upper rooms and palm: these are signs of settled daily life around an open receiving court.
- Use SD-21 smaller dressed edges on the west wing and broader hand-cut edges on the east. Localize dust to wall feet and retained object contacts; keep the bench approach swept. Do not match both wings with a new plaster wash or add a shop row.

## 2. Site

### Site · `SPAWN_B_COURTYARD` (Spawn B Courtyard)

- Rect x 17..39, y 78..92 (22 × 14 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **6 m** (protected).
- Connects: LINK_NORTH_EAST, LINK_NORTH_WEST, RUG_GATE.
- `north` edge: exempt (`sealed_perimeter`): The full 22.00m north wall is the deliberately sealed outer spawn boundary.
- `east` edge: exempt (`sealed_perimeter`): The 11.00m wall run on the 14.00m east edge seals the spawn enclosure outside its 3.00m connector.
- `west` edge: exempt (`sealed_perimeter`): The 11.00m wall run on the 14.00m west edge seals the spawn enclosure outside its 3.00m connector.
- `south` edge: frontage `FRONTAGE_SPAWN_B_SOUTH_WEST` → `BLD_SPAWN_B_WALL_W`.
- `south` edge: frontage `FRONTAGE_SPAWN_B_SOUTH_EAST` → `BLD_SPAWN_B_WALL_E`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-spawn-b-courtyard/` | `SPAWN_B_COURTYARD` | `["south"]` | `unit-spawn-b-courtyard.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** `assets/source/unit-spawn-b-courtyard/` holds the two wing GLBs (unapplied) plus bench, shade and upper-room GLBs that ARE placed today through the registry (`ASSET_SPAWN_B_*`). Keep those; rebuild only the two wing faces.

## 3. Walls

### FRONTAGE_SPAWN_B_SOUTH_WEST  ·  BLD_SPAWN_B_WALL_W (compound wall, 1 storey)

- **Role:** compound wall. A small enclosure wing framing the north arrival.
- **Wall line:** south edge of `SPAWN_B_COURTYARD`; y = 78, x = 17.66 .. 20.3 (a runs west to east); length **2.64 m**; street side +Y (street lies north); kit `Wall(F, (17.66, 78), (20.3, 78), faces='N')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `open`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` |  | 1.32 | (18.98, 78) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.32, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_05`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=1.32. One spout at a=0.4. Completion: quiet wing beside the gate; the placed `ASSET_SPAWN_B_SHADE` at (17.78, 83.5, 3.5) on the west perimeter is unrelated to this face.

**Why it exists (reality check):** A small enclosure wing framing the north arrival.

### FRONTAGE_SPAWN_B_SOUTH_EAST  ·  BLD_SPAWN_B_WALL_E (compound wall, 1 storey)

- **Role:** compound wall. The longer enclosure wing east of the gate.
- **Wall line:** south edge of `SPAWN_B_COURTYARD`; y = 78, x = 34.6 .. 38.34 (a runs west to east); length **3.74 m**; street side +Y (street lies north); kit `Wall(F, (34.6, 78), (38.34, 78), faces='N')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` |  | 1.87 | (36.47, 78) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(1.87, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_06`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=1.87 (centred on the wall). One spout at a=3.3. Completion: as stated.

**Why it exists (reality check):** The longer enclosure wing east of the gate.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. New free placements go in `placements[]` with their scheduled coordinates. Fitted details such as the named repair skins and back-wall textiles travel inside the owning section; do not duplicate them as placements.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `SPAWN_B_COVER_01` | spawn_cover | (35.2, 86, 0) | 2.2 × 1.3 | 180 | Spawn-side hard cover outside the exits. |
| `MOUNT_SPAWN_B_SKYLINE_PALM` | decorative_palm | (17.1, 89.6, 7.4) | 1 × 6.2 | 0 | Render-only skyline behind sealed north wall. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_SPAWN_B_NORTH_POT_MOUNT_SPAWN_B_NORTH_POT` | `ASSET_SPAWN_A_EDGE_POT` | `MOUNT_SPAWN_B_NORTH_POT` | (18.4, 91.5, 0) | 0.82 × 0.627 × 0.465 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_NORTH_POT_SMALL_MOUNT_SPAWN_B_NORTH_POT_SMALL` | `ASSET_SPAWN_A_EDGE_POT` | `MOUNT_SPAWN_B_NORTH_POT_SMALL` | (19.1, 91.6, 0) | 0.722 × 0.552 × 0.409 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_WEST_POT_MOUNT_SPAWN_B_WEST_POT` | `ASSET_SPAWN_A_EDGE_POT` | `MOUNT_SPAWN_B_WEST_POT` | (17.5, 89.4, 0) | 0.82 × 0.627 × 0.465 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_WEST_BENCH_MOUNT_SPAWN_B_WEST_BENCH` | `ASSET_SPAWN_B_BENCH` | `MOUNT_SPAWN_B_WEST_BENCH` | (17.43, 87.8, 0) | 1.8 × 0.42 × 0.495 | 90 | KEEP at this transform |
| `PLACE_SPAWN_B_DOOR_SHADE_E_MOUNT_SPAWN_B_DOOR_SHADE_E` | `ASSET_SPAWN_B_SHADE` | `MOUNT_SPAWN_B_DOOR_SHADE_E` | (32.4, 91.24, 3.25) | 2.18 × 1.19 × 0.6 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_DOOR_SHADE_W_MOUNT_SPAWN_B_DOOR_SHADE_W` | `ASSET_SPAWN_B_SHADE` | `MOUNT_SPAWN_B_DOOR_SHADE_W` | (23.6, 91.24, 3.25) | 2.18 × 1.19 × 0.6 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_PASSAGE_SHADE_MOUNT_SPAWN_B_PASSAGE_SHADE` | `ASSET_SPAWN_B_SHADE` | `MOUNT_SPAWN_B_PASSAGE_SHADE` | (17.78, 83.5, 3.5) | 2.725 × 1.487 × 0.75 | 270 | KEEP at this transform |
| `PLACE_SPAWN_B_SKYLINE_PALM_MOUNT_SPAWN_B_SKYLINE_PALM` | `ASSET_SPAWN_B_SKYLINE_PALM` | `MOUNT_SPAWN_B_SKYLINE_PALM` | (17.1, 89.6, 7.4) | 2.85 × 2.85 × 5.85 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_NORTH_UPPER_ROOM_MOUNT_SPAWN_B_NORTH_UPPER_ROOM` | `ASSET_SPAWN_B_UPPER_ROOM` | `MOUNT_SPAWN_B_NORTH_UPPER_ROOM` | (21.3, 93.25, 10) | 3.3 × 2.68 × 2.95 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_SECOND_UPPER_ROOM_MOUNT_SPAWN_B_SECOND_UPPER_ROOM` | `ASSET_SPAWN_B_UPPER_ROOM` | `MOUNT_SPAWN_B_SECOND_UPPER_ROOM` | (35.5, 93.25, 9.85) | 3.3 × 2.68 × 2.95 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_WEST_UPPER_ROOM_MOUNT_SPAWN_B_WEST_UPPER_ROOM` | `ASSET_SPAWN_B_UPPER_ROOM` | `MOUNT_SPAWN_B_WEST_UPPER_ROOM` | (15.75, 86.9, 9.85) | 3.795 × 3.082 × 3.393 | 270 | KEEP at this transform |
| `PLACE_SPAWN_B_COVER_SPAWN_B_COVER_01` | `ASSET_SPAWN_COVER` | `SPAWN_B_COVER_01` | (35.2, 86, 0) | 2.2 × 1.1 × 1.3 | 180 | KEEP (gameplay cover) |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `large_sandstone_blocks_01`; flush seams; contact wear under the bench, pots and spawn cover.

**`SPAWN_B_COURTYARD` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(27.0, 78.3, 0.014), (29.0, 78.3, 0.014), (29.0, 91.7, 0.014), (27.0, 91.7, 0.014)], 'polish')
wear_patch(F, [(36.38, 86.63, 0.014), (34.02, 86.63, 0.014), (34.02, 85.37, 0.014), (36.38, 85.37, 0.014)], 'dust')
wear_patch(F, [(17.91, 91.10625, 0.014), (18.89, 91.10625, 0.014), (18.89, 91.89375, 0.014), (17.91, 91.89375, 0.014)], 'dust')
wear_patch(F, [(18.6592, 91.2439, 0.014), (19.5408, 91.2439, 0.014), (19.5408, 91.9561, 0.014), (18.6592, 91.9561, 0.014)], 'dust')
wear_patch(F, [(17.14, 88.78, 0.014), (17.14, 86.82, 0.014), (17.72, 86.82, 0.014), (17.72, 88.78, 0.014)], 'dust')
wear_patch(F, [(17.01, 89.00625, 0.014), (17.99, 89.00625, 0.014), (17.99, 89.79375, 0.014), (17.01, 89.79375, 0.014)], 'dust')
```

## 7. Roofs and skyline

KEEP the three placed upper rooms (z 9.85..10.0) and the skyline palm at (17.1, 89.6, 7.4). Nothing else.

## 8. Required result

- [ ] Both wing niches at sill 1.30; copings at 4.9 continuous into the gate abutments.
- [ ] No market rows, no overhead.
- [ ] Every scheduled opening exists at its `a`, sill and head; retained code-owned openings in this area stay unchanged. No requirement imports work from another area.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Inspect one close-up of every distinct assembly and one assembled context view with retained roofs, overheads, signs, dressing and ground. Confirm receiving surfaces, export materials, and no unintended coplanar faces; counts alone are insufficient.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] The character schedule is present: distinct material fields, supported textiles where scheduled, sound softened edges, and localized wear. SD-12 bands are maximum receiving envelopes, never uniform brown strips; bleach follows the explicitly named exposed face.

Record `built` after package application and the bounded construction inspection in README.md. Report export, assembly/interface evidence and any unavailable checks separately. Gameplay, aesthetic and performance acceptance remain the later validation task.

