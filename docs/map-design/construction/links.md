# links · The eight link passages

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: the links, cross-links, link passages (one shoot unit per zone: unit-link-south-west, unit-link-south-east, unit-link-west-mid, unit-link-east-mid, unit-link-west-upper, unit-link-east-upper, unit-link-north-west, unit-link-north-east).

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

Eight quiet passages. They carry no shops, signs, awnings, props or overheads. Only two of them own a wall (the north-west and north-east garden walls); the rest are open faces, cut edges and short returns finished to match their neighbours' warm aged surfaces. Their job is to read as passages and keep their clear widths.

**Character schedule (build with the numbered tasks):**

- Keep the eight passages clear and quieter than adjoining trades. Their short exposed returns carry the material and softened edges of their named owner; do not introduce a repeated decorative niche, rug or sign in every connector.
- North-west and north-east garden walls retain their matching geometry and warm lime. Their scheduled drains are already at opposite ends; use that actual difference to locate wear, with SD-21 edge finish and broken base dust. The other six passages receive only their scheduled ground/return finish.

## 2. Site

### Site · `LINK_SOUTH_WEST` (South West Link)

- Rect x 10..17, y 8..13 (7 × 5 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **3.5 m** (protected).
- Connects: SERVICE_SOUTH, SPAWN_A_COURTYARD.
- `north` edge: exempt (`architectural_cut_edge`): The 7.00m north wall caps an authored connector and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 7.00m south wall caps an authored connector and is not a served facade plane.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`short_wall_return`): Only 2.00m of the 5.00m west edge is collision wall; no continuous return reaches the 2.50m frontage minimum.

### Site · `LINK_SOUTH_EAST` (South East Link)

- Rect x 39..46, y 8..13 (7 × 5 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **3.5 m** (protected).
- Connects: DYERS_ALLEY, SPAWN_A_COURTYARD.
- `north` edge: exempt (`architectural_cut_edge`): The 7.00m north wall caps an authored connector and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 7.00m south wall caps an authored connector and is not a served facade plane.
- `east` edge: exempt (`short_wall_return`): Only 2.00m of the 5.00m east edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `west` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m west edge; the full face remains an authored traversal opening.

### Site · `LINK_WEST_MID` (West Mid Link)

- Rect x 15..20, y 36..41 (5 × 5 m); floor z = 0; floor `cobblestone_pavement`; authored clear width **3.5 m** (protected).
- Connects: CARAVAN_COURT, FOUNTAIN_COURT.
- `north` edge: exempt (`architectural_cut_edge`): The 5.00m north wall caps an authored connector and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 5.00m south wall caps an authored connector and is not a served facade plane.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m west edge; the full face remains an authored traversal opening.

### Site · `LINK_EAST_MID` (East Mid Link)

- Rect x 36..41, y 39..44 (5 × 5 m); floor z = 0; floor `cobblestone_pavement`; authored clear width **3.5 m** (protected).
- Connects: COVERED_SOUK, FOUNTAIN_COURT.
- `north` edge: exempt (`architectural_cut_edge`): The 5.00m north wall caps an authored connector and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 5.00m south wall caps an authored connector and is not a served facade plane.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m west edge; the full face remains an authored traversal opening.

### Site · `LINK_WEST_UPPER` (West Upper Link)

- Rect x 19..21, y 72..76.5 (2 × 4.5 m); floor z = 0; floor `cobblestone_pavement`; authored clear width **4.5 m** (protected).
- Connects: RUG_GATE, TEA_LANDING.
- `north` edge: exempt (`short_wall_return`): The complete north wall is only 2.00m long, below the 2.50m frontage minimum.
- `south` edge: exempt (`short_wall_return`): The complete south wall is only 2.00m long, below the 2.50m frontage minimum.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 4.50m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 4.50m west edge; the full face remains an authored traversal opening.

### Site · `LINK_EAST_UPPER` (East Upper Link)

- Rect x 34..41, y 67..72 (7 × 5 m); floor z = 0; floor `cobblestone_pavement`; authored clear width **3.5 m** (protected).
- Connects: NORTH_COURT, RUG_GATE.
- `north` edge: exempt (`architectural_cut_edge`): The 7.00m north wall caps an authored connector and is not a served facade plane.
- `south` edge: exempt (`architectural_cut_edge`): The 7.00m south wall caps an authored connector and is not a served facade plane.
- `east` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m east edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 5.00m west edge; the full face remains an authored traversal opening.

### Site · `LINK_NORTH_WEST` (North West Link)

- Rect x 10..17, y 76..81 (7 × 5 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **3.5 m** (protected).
- Connects: SERVICE_NORTH, SPAWN_B_COURTYARD.
- `south` edge: exempt (`short_wall_return`): Only 1.00m of the 7.00m south edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `east` edge: exempt (`short_wall_return`): Only 1.50m of the 5.00m east edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `west` edge: exempt (`short_wall_return`): Only 1.00m of the 5.00m west edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `north` edge: frontage `FRONTAGE_LINK_NORTH_WEST_NORTH` → `BLD_LINK_WALL_NW`.

### Site · `LINK_NORTH_EAST` (North East Link)

- Rect x 39..46, y 76..81 (7 × 5 m); floor z = 0; floor `court_limestone_flags_01`; authored clear width **3.5 m** (protected).
- Connects: NORTH_COURT, SPAWN_B_COURTYARD.
- `south` edge: exempt (`short_wall_return`): Only 2.00m of the 7.00m south edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `east` edge: exempt (`short_wall_return`): Only 1.00m of the 5.00m east edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `west` edge: exempt (`short_wall_return`): Only 2.00m of the 5.00m west edge is collision wall; no continuous return reaches the 2.50m frontage minimum.
- `north` edge: frontage `FRONTAGE_LINK_NORTH_EAST_NORTH` → `BLD_LINK_WALL_NE`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-link-south-west/` | `LINK_SOUTH_WEST` | `[]` | `unit-link-south-west.glb` |
| `assets/source/unit-link-south-east/` | `LINK_SOUTH_EAST` | `[]` | `unit-link-south-east.glb` |
| `assets/source/unit-link-west-mid/` | `LINK_WEST_MID` | `[]` | `unit-link-west-mid.glb` |
| `assets/source/unit-link-east-mid/` | `LINK_EAST_MID` | `[]` | `unit-link-east-mid.glb` |
| `assets/source/unit-link-west-upper/` | `LINK_WEST_UPPER` | `[]` | `unit-link-west-upper.glb` |
| `assets/source/unit-link-east-upper/` | `LINK_EAST_UPPER` | `[]` | `unit-link-east-upper.glb` |
| `assets/source/unit-link-north-west/` | `LINK_NORTH_WEST` | `["north"]` | `unit-link-north-west.glb` |
| `assets/source/unit-link-north-east/` | `LINK_NORTH_EAST` | `["north"]` | `unit-link-north-east.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** `assets/source/example-section/` is the kit demonstration on the north-east link wall and is the template for every section GLB.

## 3. Walls

### FRONTAGE_LINK_NORTH_WEST_NORTH  ·  BLD_LINK_WALL_NW (compound wall, 1 storey)

- **Role:** compound wall. A garden wall closing the north-west passage; the house behind it is off-map.
- **Wall line:** north edge of `LINK_NORTH_WEST`; y = 81, x = 10.56 .. 16.44 (a runs west to east); length **5.88 m**; street side -Y (street lies south); kit `Wall(F, (10.56, 81), (16.44, 81), faces='S')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_NICHE_AXIS` | `blind_niche` |  | 2.94 | (13.5, 81) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.94, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_whitewashed_brick_warm`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45 turning the two short returns. CREATE `BAY_NICHE_AXIS` niche 1.05 × 1.8 at sill 1.30, a=2.94 (repaired full height, keep). One spout at a=0.5. Completion: one centred niche, continuous cap.

**Why it exists (reality check):** A garden wall closing the north-west passage; the house behind it is off-map.

### FRONTAGE_LINK_NORTH_EAST_NORTH  ·  BLD_LINK_WALL_NE (compound wall, 1 storey)

- **Role:** compound wall. Matching garden wall on the north-east passage.
- **Wall line:** north edge of `LINK_NORTH_EAST`; y = 81, x = 39.56 .. 45.44 (a runs west to east); length **5.88 m**; street side -Y (street lies south); kit `Wall(F, (39.56, 81), (45.44, 81), faces='S')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `blind_niche` |  | 2.94 | (42.5, 81) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.94, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_whitewashed_brick_warm`, plinth, course, coping 4.74..4.9 (closes `coping`); end piers 0.45. CREATE `GROUND_01` niche 1.05 × 1.8 raised to sill 1.30 (matching the west wall), a=2.94. One spout at a=5.4. The example section `assets/source/example-section` shows the kit on this exact wall. Completion: as stated.

**Why it exists (reality check):** Matching garden wall on the north-east passage.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. New free placements go in `placements[]` with their scheduled coordinates. Fitted details such as the named repair skins and back-wall textiles travel inside the owning section; do not duplicate them as placements.

#### `LINK_SOUTH_WEST`

#### `LINK_SOUTH_EAST`

#### `LINK_WEST_MID`

#### `LINK_EAST_MID`

#### `LINK_WEST_UPPER`

#### `LINK_EAST_UPPER`

#### `LINK_NORTH_WEST`

#### `LINK_NORTH_EAST`

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP each floor material; flush seams at both mouths; polish along the centre; no curbs, grates or trenches.

**`LINK_SOUTH_WEST` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(10.2, 10.25, 0.014), (16.8, 10.25, 0.014), (16.8, 10.75, 0.014), (10.2, 10.75, 0.014)], 'polish')
```

**`LINK_SOUTH_EAST` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(39.2, 10.25, 0.014), (45.8, 10.25, 0.014), (45.8, 10.75, 0.014), (39.2, 10.75, 0.014)], 'polish')
```

**`LINK_WEST_MID` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(15.2, 38.25, 0.014), (19.8, 38.25, 0.014), (19.8, 38.75, 0.014), (15.2, 38.75, 0.014)], 'polish')
```

**`LINK_EAST_MID` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(36.2, 41.25, 0.014), (40.8, 41.25, 0.014), (40.8, 41.75, 0.014), (36.2, 41.75, 0.014)], 'polish')
```

**`LINK_WEST_UPPER` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(19.75, 72.2, 0.014), (20.25, 72.2, 0.014), (20.25, 76.3, 0.014), (19.75, 76.3, 0.014)], 'polish')
```

**`LINK_EAST_UPPER` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(34.2, 69.25, 0.014), (40.8, 69.25, 0.014), (40.8, 69.75, 0.014), (34.2, 69.75, 0.014)], 'polish')
```

**`LINK_NORTH_WEST` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(10.2, 78.25, 0.014), (16.8, 78.25, 0.014), (16.8, 78.75, 0.014), (10.2, 78.75, 0.014)], 'polish')
```

**`LINK_NORTH_EAST` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(39.2, 78.25, 0.014), (45.8, 78.25, 0.014), (45.8, 78.75, 0.014), (39.2, 78.75, 0.014)], 'polish')
```

## 7. Roofs and skyline

Nothing on the link roofs.

## 8. Required result

- [ ] Each link keeps its clear width (3.5 m; 4.5 m at the west-upper link); no geometry inside the swept turn.
- [ ] Short returns and cut edges carry only plinth, field, coping matching the adjoining owner.
- [ ] Every scheduled opening exists at its `a`, sill and head; retained code-owned openings in this area stay unchanged. No requirement imports work from another area.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Inspect one close-up of every distinct assembly and one assembled context view with retained roofs, overheads, signs, dressing and ground. Confirm receiving surfaces, export materials, and no unintended coplanar faces; counts alone are insufficient.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] The character schedule is present: distinct material fields, supported textiles where scheduled, sound softened edges, and localized wear. SD-12 bands are maximum receiving envelopes, never uniform brown strips; bleach follows the explicitly named exposed face.

Record `built` after package application and the bounded construction inspection in README.md. Report export, assembly/interface evidence and any unavailable checks separately. Gameplay, aesthetic and performance acceptance remain the later validation task.

