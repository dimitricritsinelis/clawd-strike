# unit-service-north · Service North

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: Service North, north service alley.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

A long quiet service run under the tea terrace: three retaining screens on the east (inspection panels, two niches, two niches), sealed perimeter west. Warm aged lime and localized damp base staining at the spouts; no props.

## 2. Site

### Site · `SERVICE_NORTH` (Service North)

- Rect x 3..10, y 48..80 (7 × 32 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **4.5 m** (protected).
- Connects: CARAVAN_COURT, LINK_NORTH_WEST.
- `north` edge: exempt (`sealed_perimeter`): The 7.00m wall run on the 7.00m north edge is a deliberately sealed back-of-house boundary.
- `south` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 7.00m south edge; the full face remains an authored traversal opening.
- `west` edge: exempt (`sealed_perimeter`): The 32.00m west wall is the deliberately sealed outer service perimeter.
- `east` edge: frontage `FRONTAGE_SERVICE_NORTH_EAST_SPINE_S` → `BLD_STORES_BACK`.
- `east` edge: frontage `FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID` → `BLD_TEA_HOUSE_BACK`.
- `east` edge: frontage `FRONTAGE_SERVICE_NORTH_EAST_SPINE_N` → `BLD_NORTH_YARD_WALL`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-service-north/` | `SERVICE_NORTH` | `["east"]` | `unit-service-north.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** No unit folder.

## 3. Walls

### FRONTAGE_SERVICE_NORTH_EAST_SPINE_S  ·  BLD_STORES_BACK (service back, 2 storeys)

- **Role:** service back. Solid retaining enclosure with two flush sealed inspection panels; no warehouse doors, visible upper vents or excavated interior.
- **Wall line:** east edge of `SERVICE_NORTH`; x = 10, y = 48.032 .. 57.344 (a runs south to north); length **9.312 m**; street side -X (street lies west of the wall); kit `Wall(F, (10, 48.032), (10, 57.344), faces='W')`.
- **Retained massing `MASSING_SERVICE_SPINE`:** wall top 7 local / 7 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_white`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 1.1 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 6.84..7.0 (retaining screen, keep tall).

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `inspection_panel` | sealed inspection panel 1.35 × 0.85 (flush, sill 0.25) | 2.328 | (10, 50.36) | 1.35 × 0.035 × 0.85 | 0.25 / 1.1 | 0 |
| `GROUND_02` | `inspection_panel` | sealed inspection panel 1.35 × 0.85 (flush, sill 0.25) | 6.984 | (10, 55.016) | 1.35 × 0.035 × 0.85 | 0.25 / 1.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(2.328, 1.35, 0.25, 0.85), (6.984, 1.35, 0.25, 0.85)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_06`, plinth 0..0.44, course 2.84..2.96, coping 6.84..7.0; end piers 0.45. Completion: a retaining spine, not a warehouse.
2. REPLACE the two 2.5 m door visuals with sealed inspection panels `GROUND_01/02` 1.35 × 0.85 at a=2.328/6.984, sill 0.25 (SD, flush timber board in a 0.06 stone frame, no depth). Do not build `STORY_1_*`: this retaining screen has two hatches and no upper vents. Completion: two hatches, no doors, no vents.
3. APPLY wear: dirt band 0..1.5 with damp staining 0..0.8 (retaining wall), one spout at a=0.6 and one at a=8.7. Completion: as listed.

**Why it exists (reality check):** The back of the caravan stores is a retaining wall under the tea ramp; two small hatches let the stores be inspected from the lane, nobody walks in.

### FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID  ·  BLD_TEA_HOUSE_BACK (service back, 2 storeys)

- **Role:** service back. Retaining screen with two high blind niches at thirds, a quiet lower field and the unchanged tall roofline; no overlook opening.
- **Wall line:** east edge of `SERVICE_NORTH`; x = 10, y = 57.344 .. 66.656 (a runs south to north); length **9.312 m**; street side -X (street lies west of the wall); kit `Wall(F, (10, 57.344), (10, 66.656), faces='W')`.
- **Retained massing `MASSING_SERVICE_SPINE`:** wall top 7 local / 7 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Upper sill datums:** 3.68 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 6.84..7.0.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `GROUND_01` | `blind_niche` |  | 3.104 | (10, 60.448) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |
| `GROUND_02` | `blind_niche` |  | 6.208 | (10, 63.552) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(3.104, 1.05, 1.3, 1.8), (6.208, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_whitewashed_brick_warm`, plinth 0..0.44, course, coping 6.84..7.0; end piers 0.45. Completion: a warm plaster screen between two stone ones.
2. CREATE `GROUND_01/02` niches 1.05 × 1.8 at sill 1.30, a=3.104/6.208 (thirds). No third niche or upper window. Completion: two niches.
3. The Tea shade `TEA_TERRACE_SHADE_01` lands on this wall's terrace side (x 11.6, y 62.4, z 5.75): CREATE an iron eye at that point on the terrace face. APPLY wear: dirt band, damp 0..0.8, one spout at a=4.65 (centre). Completion: as listed.

**Why it exists (reality check):** The aged-limewashed retaining screen beside the tea terrace; the E1 overlook is a separate gameplay trial and is not built here.

### FRONTAGE_SERVICE_NORTH_EAST_SPINE_N  ·  BLD_NORTH_YARD_WALL (compound wall, 2 storeys)

- **Role:** compound wall. Retaining spine, north third: cut stone with pilasters and coping toward the link. Reads as a wall, not a building.
- **Wall line:** east edge of `SERVICE_NORTH`; x = 10, y = 66.656 .. 75.968 (a runs south to north); length **9.312 m**; street side -X (street lies west of the wall); kit `Wall(F, (10, 66.656), (10, 75.968), faces='W')`.
- **Retained massing `MASSING_SERVICE_SPINE`:** wall top 7 local / 7 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_sandstone_blocks_06`, trim `ph_stone_trim_sandstone`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.1 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 6.84..7.0.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` |  | 3.104 | (10, 69.76) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |
| `BAY_02` | `blind_niche` |  | 6.208 | (10, 72.864) | 1.05 × 0.18 × 1.8 | 1.3 / 3.1 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(3.103969, 1.05, 1.3, 1.8), (6.208031, 1.05, 1.3, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_sandstone_blocks_06`, plinth, course, coping 6.84..7.0 (closes the `coping` need); end piers 0.45. Completion: tall stone screen.
2. CREATE `BAY_01/02` niches 1.05 × 1.8 at sill 1.30, a=3.104/6.208. Completion: two niches.
3. APPLY wear: dirt band, damp 0..0.8, one spout at a=8.7. The north-link corner stays clear. Completion: as listed.

**Why it exists (reality check):** The north yard's retaining wall; the terrain is higher behind it.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `large_sandstone_blocks_01`; damp band along the east base; polish along the centre; flush seams at y 48 and at the north-link turn.

**`SERVICE_NORTH` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(6.2, 48.3, 0.014), (6.8, 48.3, 0.014), (6.8, 79.7, 0.014), (6.2, 79.7, 0.014)], 'polish')
wear_patch(F, [(9.65, 48.33, 0.014), (10.0, 48.33, 0.014), (10.0, 48.93, 0.014), (9.65, 48.93, 0.014)], 'damp')
wear_patch(F, [(9.65, 56.43, 0.014), (10.0, 56.43, 0.014), (10.0, 57.03, 0.014), (9.65, 57.03, 0.014)], 'damp')
wear_patch(F, [(9.65, 61.69, 0.014), (10.0, 61.69, 0.014), (10.0, 62.29, 0.014), (9.65, 62.29, 0.014)], 'damp')
wear_patch(F, [(9.65, 75.06, 0.014), (10.0, 75.06, 0.014), (10.0, 75.66, 0.014), (9.65, 75.66, 0.014)], 'damp')
```

## 7. Roofs and skyline

Baseline roofs per the massing table above (roof base = wall top, parapet per profile, coping SD-03). No new rooftop props. Perimeter skyline placements, if any, are listed in [skyline.md](skyline.md).

## 8. Required result

- [ ] Two sealed panels replace the 2.5 m doors; no vents remain visible on the south screen.
- [ ] Two niches on each of the other screens at thirds; copings continuous at 7.0.
- [ ] Every scheduled finished-frontage opening exists at its `a`, sill and head; Dogleg door, windows and vents remain the matching runtime-owned modules.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] Wear follows cause: dirt band at the base, streak under every spout, hand-polish at door jambs 0.9–1.4 m, cart scuffs at store doors, sun bleach on south and west upper fields only.

Record `built` in the progress index after applying the package. Gameplay, visual and performance validation occur in the later validation task.

