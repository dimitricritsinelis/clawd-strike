# unit-spawn-a-courtyard · Spawn A courtyard

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: spawn A, A spawn, south spawn.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

The civic arrival: Bab al-Suq closes the south, three house backs and the dye-works back close the sides, the two Spice corner kits frame the exit north. Everything is a retained kit; this unit's work is support skins, coping, ground and wear, with a quiet warm aged base and accumulated contact at the entry.

**Character schedule (build with the numbered tasks):**

- Keep the existing return kits, stock, spawn cover, gate and unequal background heights as the arrival composition. This sheet owns support skins and floor finish only; hidden support skins do not authorize repainting the retained kits.
- Heavy foot traffic appears in the scheduled worn centre and contact dust around edge stock. Break up wear within its printed footprint per SD-12, leaving joints and swept intervals visible. No new rugs or props in the exits; the active Spice frontage supplies the view beyond.

## 2. Site

### Site · `SPAWN_A_COURTYARD` (Spawn A Courtyard)

- Rect x 17..39, y 0..14 (22 × 14 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **6 m** (protected).
- Connects: LINK_SOUTH_EAST, LINK_SOUTH_WEST, SPICE_STREET.
- `south` edge: exempt (`sealed_perimeter`): The full 22.00m south wall is the deliberately sealed outer spawn boundary.
- `east` edge: exempt (`sealed_perimeter`): The 9.00m wall run on the 14.00m east edge seals the spawn enclosure outside its 5.00m connector.
- `west` edge: exempt (`sealed_perimeter`): The 9.00m wall run on the 14.00m west edge seals the spawn enclosure outside its 5.00m connector.
- `north` edge: frontage `FRONTAGE_SPAWN_A_NORTH_WEST` → `BLD_SPAWN_A_WALL_W`.
- `north` edge: frontage `FRONTAGE_SPAWN_A_NORTH_EAST` → `BLD_SPAWN_A_WALL_E`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-spawn-a-courtyard/` | `SPAWN_A_COURTYARD` | `["north"]` | `unit-spawn-a-courtyard.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** `assets/source/unit-spawn-a-courtyard/` holds two small support-skin GLBs and an unapplied package.

## 3. Walls

### FRONTAGE_SPAWN_A_NORTH_WEST  ·  BLD_SPAWN_A_WALL_W (compound wall, 1 storey)

- **Role:** compound wall. The south corner of the west Spice block, seen from the spawn court.
- **Wall line:** north edge of `SPAWN_A_COURTYARD`; y = 14, x = 17.66 .. 20.3 (a runs west to east); length **2.64 m**; street side -Y (street lies south); kit `Wall(F, (17.66, 14), (20.3, 14), faces='S')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `open`. Ground head datum 1.8 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** support shell only: the visible skin is the retained kit `ASSET_SPAWN_A_EXIT_WEST_RETURN` (3.5 × 2 × 7.6 at (18.75, 13.0)).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` | Not built: the retained return kit owns this visible bay. | 1.32 | (18.98, 14) | 1.05 × 0.18 × 1.8 | SUPPRESSED | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. KEEP the return kit as the visible corner front. CREATE the section finish only as a plain support skin `ph_sandstone_blocks_06` 0..4.9 with coping 4.74..4.9 behind the kit; do not build the covered frontage niche. Completion: no duplicate skin or shelf visible in the gate turn.

**Why it exists (reality check):** The south corner of the west Spice block, seen from the spawn court.

### FRONTAGE_SPAWN_A_NORTH_EAST  ·  BLD_SPAWN_A_WALL_E (compound wall, 1 storey)

- **Role:** compound wall. The south corner of the east Spice block.
- **Wall line:** north edge of `SPAWN_A_COURTYARD`; y = 14, x = 33.72 .. 38.34 (a runs west to east); length **4.62 m**; street side -Y (street lies south); kit `Wall(F, (33.72, 14), (38.34, 14), faces='S')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_plastered_wall`, trim `ph_stone_trim_white`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 1.8 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** support shell only: the visible skin is the retained kit `ASSET_SPAWN_A_EXIT_EAST_RETURN` (5.5 × 2 × 7.6 at (36.25, 13.0)).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` | Not built: the retained return kit owns this visible bay. | 2.31 | (36.03, 14) | 1.05 × 0.18 × 1.8 | SUPPRESSED | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. KEEP the return kit as the visible corner front. CREATE the support skin `ph_plastered_wall` 0..4.9 with coping 4.74..4.9 behind it; do not build the covered frontage niche. Completion: no duplicate skin, no new booth.

**Why it exists (reality check):** The south corner of the east Spice block.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. New free placements go in `placements[]` with their scheduled coordinates. Fitted details such as the named repair skins and back-wall textiles travel inside the owning section; do not duplicate them as placements.

| Anchor | Type | Position | W × H | Yaw | Note |
|---|---|---|---|---:|---|
| `LMK_SPAWN_A_EXIT_WEST_01` | hero_landmark | (18.75, 13, 0) | 3.5 × 7.6 | 180 | Merchant re-facing of the sealed west return that frames the main exit. Render-only; nothing below head height stands more than 0.28 m off the y=14 wall plane, so collision, exit width and sightlines are unchanged. |
| `LMK_SPAWN_A_EXIT_EAST_01` | hero_landmark | (36.25, 13, 0) | 5.5 × 7.6 | 180 | Merchant re-facing of the sealed east return that frames the main exit. Render-only; nothing below head height stands more than 0.28 m off the y=14 wall plane, so collision, exit width and sightlines are unchanged. |
| `LMK_SPAWN_A_EAST_WORKS_01` | hero_landmark | (38.2, 4, 0) | 8 × 12.8 | 90 | Dye-works back re-facing the sealed 8 m east wall run of the A spawn courtyard between its south-east corner and the connector mouth. Its boiler stack is the edge's skyline event and its drying rails carry the courtyard's only saturated colour. Render-only; nothing below head height stands more than 0.28 m off the x=39 wall plane, and the rails and cloth hang well above it, so collision, route width and sightlines are unchanged. |
| `LMK_SPAWN_A_WEST_BACKS_01` | hero_landmark | (17.8, 4, 0) | 8 × 9.8 | 270 | Three house backs re-facing the sealed 8 m west wall run of the A spawn courtyard between its south-west corner and the connector mouth. Render-only; nothing below head height stands more than 0.28 m off the x=17 wall plane, so collision, route width and sightlines are unchanged. |
| `LMK_SPAWN_A_GATE_01` | hero_landmark | (28, 0.85, 0) | 21.9 × 12 | 180 | Bab al-Suq: the sealed south gate re-facing the whole 22 m rear boundary of the A spawn courtyard. Render-only; nothing below head height stands more than 0.28 m off the y=0 wall plane, so the courtyard's walkable envelope, collision, grounding, and sightlines are unchanged. |
| `SPAWN_A_COVER_01` | spawn_cover | (20.2, 5.2, 0) | 2.2 × 1.3 | 0 | Spawn-side hard cover outside the exits. |

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_CRATE_LMK_SPAWN_A_EAST_WORKS_01` | `ASSET_DECORATIVE_CRATE` | `LMK_SPAWN_A_EAST_WORKS_01` | (38.15, 7, 0.15) | 0.908 × 0.45 × 0.385 | 90 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_EXIT_EAST_CRATE_LMK_SPAWN_A_EXIT_EAST_01` | `ASSET_DECORATIVE_CRATE` | `LMK_SPAWN_A_EXIT_EAST_01` | (38.35, 12.85, 0.15) | 0.908 × 0.45 × 0.385 | 180 | KEEP at this transform |
| `PLACE_SPAWN_A_EAST_WORKS_LMK_SPAWN_A_EAST_WORKS_01` | `ASSET_SPAWN_A_EAST_DYE_WORKS` | `LMK_SPAWN_A_EAST_WORKS_01` | (38.2, 4, 0) | 8 × 2.4 × 12.8 | 90 | KEEP (retained kit) |
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_BARREL_LMK_SPAWN_A_EAST_WORKS_01` | `ASSET_SPAWN_A_EDGE_BARREL` | `LMK_SPAWN_A_EAST_WORKS_01` | (38.2, 1.9, 0) | 0.705 × 0.718 × 0.828 | 90 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_WEST_BACKS_BARREL_LMK_SPAWN_A_WEST_BACKS_01` | `ASSET_SPAWN_A_EDGE_BARREL` | `LMK_SPAWN_A_WEST_BACKS_01` | (17.8, 2.2, 0) | 0.668 × 0.68 × 0.784 | 270 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_POT_LMK_SPAWN_A_EAST_WORKS_01` | `ASSET_SPAWN_A_EDGE_POT` | `LMK_SPAWN_A_EAST_WORKS_01` | (38.15, 2.75, 0) | 0.689 × 0.527 × 0.391 | 90 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_TOP_POT_LMK_SPAWN_A_EAST_WORKS_01` | `ASSET_SPAWN_A_EDGE_POT` | `LMK_SPAWN_A_EAST_WORKS_01` | (38.15, 7, 0.535) | 0.492 × 0.377 × 0.279 | 90 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_EXIT_EAST_POT_LMK_SPAWN_A_EXIT_EAST_01` | `ASSET_SPAWN_A_EDGE_POT` | `LMK_SPAWN_A_EXIT_EAST_01` | (37.55, 12.85, 0.15) | 0.656 × 0.502 × 0.372 | 180 | KEEP at this transform |
| `PLACE_SPAWN_A_EDGE_WEST_BACKS_POT_LMK_SPAWN_A_WEST_BACKS_01` | `ASSET_SPAWN_A_EDGE_POT` | `LMK_SPAWN_A_WEST_BACKS_01` | (17.82, 3.05, 0) | 0.656 × 0.502 × 0.372 | 270 | KEEP at this transform |
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

**`SPAWN_A_COURTYARD` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(27.0, 1.4, 0.014), (29.0, 1.4, 0.014), (29.0, 12.6, 0.014), (27.0, 12.6, 0.014)], 'polish')
wear_patch(F, [(19.02, 4.57, 0.014), (21.38, 4.57, 0.014), (21.38, 5.83, 0.014), (19.02, 5.83, 0.014)], 'dust')
wear_patch(F, [(37.760883, 2.332403, 0.014), (37.760883, 1.467597, 0.014), (38.639117, 1.467597, 0.014), (38.639117, 2.332403, 0.014)], 'dust')
wear_patch(F, [(37.80645, 3.1744, 0.014), (37.80645, 2.3256, 0.014), (38.49355, 2.3256, 0.014), (38.49355, 3.1744, 0.014)], 'dust')
wear_patch(F, [(18.220216, 1.786144, 0.014), (18.220216, 2.613856, 0.014), (17.379784, 2.613856, 0.014), (17.379784, 1.786144, 0.014)], 'dust')
wear_patch(F, [(18.151, 2.642, 0.014), (18.151, 3.458, 0.014), (17.489, 3.458, 0.014), (17.489, 2.642, 0.014)], 'dust')
```

## 7. Roofs and skyline

All kits as built (gate turret 11.9, backs 9.25 / 7.75 / 6.5, works chimney 12.55, returns 7.6). No additions.

## 8. Required result

- [ ] Both support skins invisible behind the kits; coping continuous where exposed.
- [ ] No new props; the three exits and both inside turns empty.
- [ ] Every scheduled opening exists at its `a`, sill and head; retained code-owned openings in this area stay unchanged. No requirement imports work from another area.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Inspect one close-up of every distinct assembly and one assembled context view with retained roofs, overheads, signs, dressing and ground. Confirm receiving surfaces, export materials, and no unintended coplanar faces; counts alone are insufficient.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] The character schedule is present: distinct material fields, supported textiles where scheduled, sound softened edges, and localized wear. SD-12 bands are maximum receiving envelopes, never uniform brown strips; bleach follows the explicitly named exposed face.

Record `built` after package application and the bounded construction inspection in README.md. Report export, assembly/interface evidence and any unavailable checks separately. Gameplay, aesthetic and performance acceptance remain the later validation task.

