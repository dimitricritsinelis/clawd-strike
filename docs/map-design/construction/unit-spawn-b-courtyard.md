# unit-spawn-b-courtyard · Spawn B courtyard

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-spawn-b-courtyard --tag r1-before` prints the same walls and must agree. Also called: spawn B, B spawn, north spawn.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The quiet receiving court: two low enclosure wings either side of the gate, benches and pots at the west wall, shade over the two sealed north doors, three upper rooms and a palm on the skyline behind the sealed walls.

## 2. Site

### Site · `SPAWN_B_COURTYARD` (Spawn B Courtyard)

- Rect x 17..39, y 78..92 (22 × 14 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **6 m** (protected).
- Connects: LINK_NORTH_EAST, LINK_NORTH_WEST, RUG_GATE.
- `north` edge: exempt (`sealed_perimeter`): The full 22.00m north wall is the deliberately sealed outer spawn boundary.
- `east` edge: exempt (`sealed_perimeter`): The 11.00m wall run on the 14.00m east edge seals the spawn enclosure outside its 3.00m connector.
- `west` edge: exempt (`sealed_perimeter`): The 11.00m wall run on the 14.00m west edge seals the spawn enclosure outside its 3.00m connector.
- `south` edge: frontage `FRONTAGE_SPAWN_B_SOUTH_WEST` → `BLD_SPAWN_B_WALL_W`.
- `south` edge: frontage `FRONTAGE_SPAWN_B_SOUTH_EAST` → `BLD_SPAWN_B_WALL_E`.

**Existing source.** `assets/source/unit-spawn-b-courtyard/` holds the two wing GLBs (unapplied) plus bench, shade and upper-room GLBs that ARE placed today through the registry (`ASSET_SPAWN_B_*`). Keep those; rebuild only the two wing faces.

## 3. Walls

### FRONTAGE_SPAWN_B_SOUTH_WEST  ·  BLD_SPAWN_B_WALL_W (compound wall, 1 storey)

- **Role:** compound/service wall. Spawn edge wall: coping only, no openings, no string course; the buildings behind it carry the skyline.
- **Wall line:** south edge of `SPAWN_B_COURTYARD`; y = 78, x = 17.66 .. 20.3 (a runs west to east); length **2.64 m**; street side +Y (street lies north); kit `Wall(F, (17.66, 78), (20.3, 78), faces='N')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 2.64 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_cut_stone`):** wall `ph_sandstone_blocks_05`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `open`; solid end piers reserved: 0.8 m at a=0, 0.8 m at a=L. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `blind_niche` |  | 1.32 | (18.98, 78) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping`.

**Composition.** A small quiet enclosure wing frames the north arrival without competing with the Rug Gate.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_05`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=1.32. One spout at a=0.4. Completion: quiet wing beside the gate; the placed `ASSET_SPAWN_B_SHADE` at (17.78, 83.5, 3.5) on the west perimeter is unrelated to this face.

**Why it exists (reality check):** A small enclosure wing framing the north arrival.

### FRONTAGE_SPAWN_B_SOUTH_EAST  ·  BLD_SPAWN_B_WALL_E (compound wall, 1 storey)

- **Role:** compound/service wall. Spawn edge wall: coping only, no openings, no string course; the buildings behind it carry the skyline.
- **Wall line:** south edge of `SPAWN_B_COURTYARD`; y = 78, x = 34.6 .. 38.34 (a runs west to east); length **3.74 m**; street side +Y (street lies north); kit `Wall(F, (34.6, 78), (38.34, 78), faces='N')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 3.74 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_relief`):** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`.
- **Corners:** `held`; solid end piers reserved: 1.34 m at a=0, 1.34 m at a=L. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `blind_niche` |  | 1.87 | (36.47, 78) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping`.

**Composition.** A longer quiet enclosure wing balances the northern gate arrival with one offset-in-plan but centered-on-wall niche.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_sandstone_blocks_06`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `BAY_01` niche at sill 1.30, a=1.87 (centred on the wall). One spout at a=3.3. Completion: as stated.

**Why it exists (reality check):** The longer enclosure wing east of the gate.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `SPAWN_B_COVER_01` | spawn_cover | (35.2, 86, 0) | 2.2 × 1.3 | 180 | Spawn-side hard cover outside the exits. |
| `MOUNT_SPAWN_B_SKYLINE_PALM` | decorative_palm | (17.1, 89.6, 7.4) | 1 × 6.2 | 0 | Render-only skyline behind sealed north wall. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_SPAWN_B_NORTH_POT_MOUNT_SPAWN_B_NORTH_POT` | `ASSET_SPAWN_A_EDGE_POT` | `MOUNT_SPAWN_B_NORTH_POT` | (18.4, 91.5, 0) | 0.82 × 0.63 × 0.46 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_NORTH_POT_SMALL_MOUNT_SPAWN_B_NORTH_POT_SMALL` | `ASSET_SPAWN_A_EDGE_POT` | `MOUNT_SPAWN_B_NORTH_POT_SMALL` | (19.1, 91.6, 0) | 0.72 × 0.55 × 0.41 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_WEST_POT_MOUNT_SPAWN_B_WEST_POT` | `ASSET_SPAWN_A_EDGE_POT` | `MOUNT_SPAWN_B_WEST_POT` | (17.5, 89.4, 0) | 0.82 × 0.63 × 0.46 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_WEST_BENCH_MOUNT_SPAWN_B_WEST_BENCH` | `ASSET_SPAWN_B_BENCH` | `MOUNT_SPAWN_B_WEST_BENCH` | (17.43, 87.8, 0) | 1.8 × 0.42 × 0.49 | 90 | KEEP at this transform |
| `PLACE_SPAWN_B_DOOR_SHADE_E_MOUNT_SPAWN_B_DOOR_SHADE_E` | `ASSET_SPAWN_B_SHADE` | `MOUNT_SPAWN_B_DOOR_SHADE_E` | (32.4, 91.24, 3.25) | 2.18 × 1.19 × 0.6 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_DOOR_SHADE_W_MOUNT_SPAWN_B_DOOR_SHADE_W` | `ASSET_SPAWN_B_SHADE` | `MOUNT_SPAWN_B_DOOR_SHADE_W` | (23.6, 91.24, 3.25) | 2.18 × 1.19 × 0.6 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_PASSAGE_SHADE_MOUNT_SPAWN_B_PASSAGE_SHADE` | `ASSET_SPAWN_B_SHADE` | `MOUNT_SPAWN_B_PASSAGE_SHADE` | (17.78, 83.5, 3.5) | 2.73 × 1.49 × 0.75 | 270 | KEEP at this transform |
| `PLACE_SPAWN_B_SKYLINE_PALM_MOUNT_SPAWN_B_SKYLINE_PALM` | `ASSET_SPAWN_B_SKYLINE_PALM` | `MOUNT_SPAWN_B_SKYLINE_PALM` | (17.1, 89.6, 7.4) | 2.85 × 2.85 × 5.85 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_NORTH_UPPER_ROOM_MOUNT_SPAWN_B_NORTH_UPPER_ROOM` | `ASSET_SPAWN_B_UPPER_ROOM` | `MOUNT_SPAWN_B_NORTH_UPPER_ROOM` | (21.3, 93.25, 10) | 3.3 × 2.68 × 2.95 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_SECOND_UPPER_ROOM_MOUNT_SPAWN_B_SECOND_UPPER_ROOM` | `ASSET_SPAWN_B_UPPER_ROOM` | `MOUNT_SPAWN_B_SECOND_UPPER_ROOM` | (35.5, 93.25, 9.85) | 3.3 × 2.68 × 2.95 | 0 | KEEP at this transform |
| `PLACE_SPAWN_B_WEST_UPPER_ROOM_MOUNT_SPAWN_B_WEST_UPPER_ROOM` | `ASSET_SPAWN_B_UPPER_ROOM` | `MOUNT_SPAWN_B_WEST_UPPER_ROOM` | (15.75, 86.9, 9.85) | 3.79 × 3.08 × 3.39 | 270 | KEEP at this transform |
| `PLACE_SPAWN_B_COVER_SPAWN_B_COVER_01` | `ASSET_SPAWN_COVER` | `SPAWN_B_COVER_01` | (35.2, 86, 0) | 2.2 × 1.1 × 1.3 | 180 | KEEP (gameplay cover) |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `large_sandstone_blocks_01`; flush seams; contact wear under the bench, pots and spawn cover.

## 7. Roofs and skyline

KEEP the three placed upper rooms (z 9.85..10.0) and the skyline palm at (17.1, 89.6, 7.4). Nothing else.

## 8. Completion checks

- [ ] Both wing niches at sill 1.30; copings at 4.9 continuous into the gate abutments.
- [ ] No market rows, no overhead.
- [ ] `pnpm map:check` passes with no new reasons; `[section-models]`, `[facade-models]` and `[authored-placements]` print no warnings.
- [ ] Every opening in the bay tables exists in the GLB at its `a`, sill and head; nothing else opens the wall.
- [ ] Every placed asset in section 4 still sits in a rebate or on a floor the GLB provides (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and coping run the full wall and turn the solid corners; coping matches the neighbour where the same building continues.
- [ ] Wear follows cause: dirt band at the base, streak under every spout, hand-polish at door jambs 0.9–1.4 m, cart scuffs at store doors, sun bleach on south and west upper fields only.
- [ ] Worst view of `pnpm map:shoot` stays inside the budget (1,500 draws / 2.2 M tris / 12.5 ms).
- [ ] Fresh-eyes verdict passes all three tiers on every view; a fail is another round.

## 9. Verification record

| Date | Check or view | Result | Evidence |
|---|---|---|---|
| | `pnpm map:check` | | |
| | movement check standing and crouched | | |
| | fresh-eyes verdict (massing / facade / materials) | | |

