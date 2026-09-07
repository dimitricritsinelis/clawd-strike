# unit-spawn-a-courtyard · Spawn A courtyard

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-spawn-a-courtyard --tag r1-before` prints the same walls and must agree. Also called: spawn A, A spawn, south spawn.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The civic arrival: Bab al-Suq closes the south, three house backs and the dye-works back close the sides, the two Spice corner kits frame the exit north. Everything is a retained kit; this unit's work is support skins, coping, ground and wear.

## 2. Site

### Site · `SPAWN_A_COURTYARD` (Spawn A Courtyard)

- Rect x 17..39, y 0..14 (22 × 14 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **6 m** (protected).
- Connects: LINK_SOUTH_EAST, LINK_SOUTH_WEST, SPICE_STREET.
- `south` edge: exempt (`sealed_perimeter`): The full 22.00m south wall is the deliberately sealed outer spawn boundary.
- `east` edge: exempt (`sealed_perimeter`): The 9.00m wall run on the 14.00m east edge seals the spawn enclosure outside its 5.00m connector.
- `west` edge: exempt (`sealed_perimeter`): The 9.00m wall run on the 14.00m west edge seals the spawn enclosure outside its 5.00m connector.
- `north` edge: frontage `FRONTAGE_SPAWN_A_NORTH_WEST` → `BLD_SPAWN_A_WALL_W`.
- `north` edge: frontage `FRONTAGE_SPAWN_A_NORTH_EAST` → `BLD_SPAWN_A_WALL_E`.

**Existing source.** `assets/source/unit-spawn-a-courtyard/` holds two small support-skin GLBs and an unapplied package.

## 3. Walls

### FRONTAGE_SPAWN_A_NORTH_WEST  ·  BLD_SPAWN_A_WALL_W (compound wall, 1 storey)

- **Role:** compound/service wall. Spawn edge wall: coping only, no openings, no string course; the buildings behind it carry the skyline.
- **Wall line:** north edge of `SPAWN_A_COURTYARD`; y = 14, x = 17.66 .. 20.3 (a runs west to east); length **2.64 m**; street side -Y (street lies south); kit `Wall(F, (17.66, 14), (20.3, 14), faces='S')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m.
- **Facade GLB frame:** width 2.64 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_niche_coverage_relief`):** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_lime_soft`.
- **Corners:** `open`. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** support shell only: the visible skin is the retained kit `ASSET_SPAWN_A_EXIT_WEST_RETURN` (3.5 × 2 × 7.6 at (18.75, 13.0)).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `blind_niche` | SUPPRESSED: hidden behind the return kit | 1.32 | (18.98, 14) | 1.05 × 0.18 × 1.8 | — | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping`.

**Composition.** The existing merchant return is the south corner front of the west spice block, not a freestanding compound facade.

**Construction tasks (ordered; each has an observable completion):**

1. KEEP the return kit as the visible corner front (one recess 2.1 wide at local x +0.35, two shuttered windows sill 4.3 / head 5.6). CREATE the face GLB only as a plain support skin `ph_sandstone_blocks_06` 0..4.9 with coping 4.74..4.9 (closes `coping`) behind the kit; suppress the frontage niche where the kit hides it. Completion: no duplicate skin or shelf visible in the gate turn.

**Why it exists (reality check):** The south corner of the west Spice block, seen from the spawn court.

### FRONTAGE_SPAWN_A_NORTH_EAST  ·  BLD_SPAWN_A_WALL_E (compound wall, 1 storey)

- **Role:** compound/service wall. Spawn edge wall: coping only, no openings, no string course; the buildings behind it carry the skyline.
- **Wall line:** north edge of `SPAWN_A_COURTYARD`; y = 14, x = 33.72 .. 38.34 (a runs west to east); length **4.62 m**; street side -Y (street lies south); kit `Wall(F, (33.72, 14), (38.34, 14), faces='S')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m.
- **Facade GLB frame:** width 4.62 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_ochre_niche_coverage_relief`):** wall `ph_plastered_wall`, trim `ph_stone_trim_white`, roof `ph_worn_plaster_ochre`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_plastered`.
- **Corners:** `held`. Ground head datum 3.1 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** support shell only: the visible skin is the retained kit `ASSET_SPAWN_A_EXIT_EAST_RETURN` (5.5 × 2 × 7.6 at (36.25, 13.0)).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `blind_niche` | SUPPRESSED: hidden behind the return kit | 2.31 | (36.03, 14) | 1.05 × 0.18 × 1.8 | — | 0 |  |

Open `needs` in the spec (close them with this sheet): `coping`.

**Composition.** A broader south corner front begins the east spice block with one display and one closed entrance.

**Construction tasks (ordered; each has an observable completion):**

1. KEEP the return kit (one recess 2.3 wide at local x −1.5, one door 1.2 wide at x +1.35, three shuttered windows sill 4.3 / head 5.6). CREATE the support skin `ph_plastered_wall` 0..4.9 with coping 4.74..4.9 (closes `coping`) behind it; suppress the niche under the kit. Completion: no duplicate skin, no new booth.

**Why it exists (reality check):** The south corner of the east Spice block.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_SPAWN_A_EXIT_WEST_01` | hero_landmark | (18.75, 13, 0) | 3.5 × 7.6 | 180 | Merchant re-facing of the sealed west return that frames the main exit. Render-only; nothing below head height stands more than 0.28 m off t |
| `LMK_SPAWN_A_EXIT_EAST_01` | hero_landmark | (36.25, 13, 0) | 5.5 × 7.6 | 180 | Merchant re-facing of the sealed east return that frames the main exit. Render-only; nothing below head height stands more than 0.28 m off t |
| `LMK_SPAWN_A_EAST_WORKS_01` | hero_landmark | (38.2, 4, 0) | 8 × 12.8 | 90 | Dye-works back re-facing the sealed 8 m east wall run of the A spawn courtyard between its south-east corner and the connector mouth. Its bo |
| `LMK_SPAWN_A_WEST_BACKS_01` | hero_landmark | (17.8, 4, 0) | 8 × 9.8 | 270 | Three house backs re-facing the sealed 8 m west wall run of the A spawn courtyard between its south-west corner and the connector mouth. Ren |
| `LMK_SPAWN_A_GATE_01` | hero_landmark | (28, 0.85, 0) | 21.9 × 12 | 180 | Bab al-Suq: the sealed south gate re-facing the whole 22 m rear boundary of the A spawn courtyard. Render-only; nothing below head height st |
| `SPAWN_A_COVER_01` | spawn_cover | (20.2, 5.2, 0) | 2.2 × 1.3 | 0 | Spawn-side hard cover outside the exits. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_CRATE_LMK_SPAWN_A_EAST_WORKS_01` | `ASSET_DECORATIVE_CRATE` | `LMK_SPAWN_A_EAST_WORKS_01` | (38.15, 7, 0.15) | 0.91 × 0.45 × 0.38 | 90 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_EXIT_EAST_CRATE_LMK_SPAWN_A_EXIT_EAST_01` | `ASSET_DECORATIVE_CRATE` | `LMK_SPAWN_A_EXIT_EAST_01` | (38.35, 12.85, 0.15) | 0.91 × 0.45 × 0.38 | 180 | KEEP at this transform |
| `PLACE_SPAWN_A_EAST_WORKS_LMK_SPAWN_A_EAST_WORKS_01` | `ASSET_SPAWN_A_EAST_DYE_WORKS` | `LMK_SPAWN_A_EAST_WORKS_01` | (38.2, 4, 0) | 8 × 2.4 × 12.8 | 90 | KEEP (retained kit) |
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_BARREL_LMK_SPAWN_A_EAST_WORKS_01` | `ASSET_SPAWN_A_EDGE_BARREL` | `LMK_SPAWN_A_EAST_WORKS_01` | (38.2, 1.9, 0) | 0.7 × 0.72 × 0.83 | 90 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_WEST_BACKS_BARREL_LMK_SPAWN_A_WEST_BACKS_01` | `ASSET_SPAWN_A_EDGE_BARREL` | `LMK_SPAWN_A_WEST_BACKS_01` | (17.8, 2.2, 0) | 0.67 × 0.68 × 0.78 | 270 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_POT_LMK_SPAWN_A_EAST_WORKS_01` | `ASSET_SPAWN_A_EDGE_POT` | `LMK_SPAWN_A_EAST_WORKS_01` | (38.15, 2.75, 0) | 0.69 × 0.53 × 0.39 | 90 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_TOP_POT_LMK_SPAWN_A_EAST_WORKS_01` | `ASSET_SPAWN_A_EDGE_POT` | `LMK_SPAWN_A_EAST_WORKS_01` | (38.15, 7, 0.54) | 0.49 × 0.38 × 0.28 | 90 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_EXIT_EAST_POT_LMK_SPAWN_A_EXIT_EAST_01` | `ASSET_SPAWN_A_EDGE_POT` | `LMK_SPAWN_A_EXIT_EAST_01` | (37.55, 12.85, 0.15) | 0.66 × 0.5 × 0.37 | 180 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_WEST_BACKS_POT_LMK_SPAWN_A_WEST_BACKS_01` | `ASSET_SPAWN_A_EDGE_POT` | `LMK_SPAWN_A_WEST_BACKS_01` | (17.82, 3.05, 0) | 0.66 × 0.5 × 0.37 | 270 | KEEP at this transform |
| `PLACE_SPAWN_A_EXIT_EAST_LMK_SPAWN_A_EXIT_EAST_01` | `ASSET_SPAWN_A_EXIT_EAST_RETURN` | `LMK_SPAWN_A_EXIT_EAST_01` | (36.25, 13, 0) | 5.5 × 2 × 7.6 | 180 | KEEP (corner front of the east Spice block) |
| `PLACE_SPAWN_A_EXIT_WEST_LMK_SPAWN_A_EXIT_WEST_01` | `ASSET_SPAWN_A_EXIT_WEST_RETURN` | `LMK_SPAWN_A_EXIT_WEST_01` | (18.75, 13, 0) | 3.5 × 2 × 7.6 | 180 | KEEP (corner front of the west Spice block) |
| `PLACE_SPAWN_A_GATE_LMK_SPAWN_A_GATE_01` | `ASSET_SPAWN_A_GATE` | `LMK_SPAWN_A_GATE_01` | (28, 0.85, 0) | 21.9 × 2.2 × 12 | 180 | KEEP (landmark kit; the GLB facades stop at its abutments) |
| `PLACE_SPAWN_A_WEST_BACKS_LMK_SPAWN_A_WEST_BACKS_01` | `ASSET_SPAWN_A_WEST_BACKS` | `LMK_SPAWN_A_WEST_BACKS_01` | (17.8, 4, 0) | 8 × 2.2 × 9.8 | 270 | KEEP (retained kit; three domestic rear parcels) |
| `PLACE_SPAWN_A_COVER_SPAWN_A_COVER_01` | `ASSET_SPAWN_COVER` | `SPAWN_A_COVER_01` | (20.2, 5.2, 0) | 2.2 × 1.1 × 1.3 | 0 | KEEP (gameplay cover) |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `large_sandstone_blocks_01`; a worn centre; flush seams at the three exits; contact wear under the spawn cover and edge props.

## 7. Roofs and skyline

All kits as built (gate turret 11.9, backs 9.25 / 7.75 / 6.5, works chimney 12.55, returns 7.6). No additions.

## 8. Completion checks

- [ ] Both support skins invisible behind the kits; coping continuous where exposed.
- [ ] No new props; the three exits and both inside turns empty.
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

