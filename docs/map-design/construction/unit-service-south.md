# unit-service-south · Service South

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: Service South, south service alley.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

A quiet 7 m service lane: warm aged limewashed yard wall with three high panels on the east, sealed perimeter west and south. Wear tells the story: one spout, one stain, a basket and a pot at the wall; use stays localized to service contact and drainage.

**Character schedule (build with the numbered tasks):**

- Keep three high blind niches, no vents and no hatch. The service wall is maintained sandy lime over older masonry; basket, pottery and drainage tell its use without filling the route.
- Replace FRONTAGE_SERVICE_SOUTH_EAST skin fields a=0.65..2.15, z=0.44..1.28 and a=8.95..10.05, z=0.44..0.94 with `ph_beige_wall_002` (SD-21). Retain `ph_whitewashed_brick_warm` elsewhere. These earth-toned, coarse repairs differ in size and height; no uniform brown base band. Damp is confined to the scheduled drain end.

## 2. Site

### Site · `SERVICE_SOUTH` (Service South)

- Rect x 3..10, y 10..30 (7 × 20 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **4.5 m** (protected).
- Connects: CARAVAN_COURT, LINK_SOUTH_WEST.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 7.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`sealed_perimeter`): The 7.00m wall run on the 7.00m south edge is a deliberately sealed back-of-house boundary.
- `west` edge: exempt (`sealed_perimeter`): The 20.00m west wall is the deliberately sealed outer service perimeter.
- `east` edge: frontage `FRONTAGE_SERVICE_SOUTH_EAST` → `BLD_SPICE_BACKS`.

### Package outputs

| Package directory | Section zone | Owned runtime faces | Section GLB |
|---|---|---|---|
| `assets/source/unit-service-south/` | `SERVICE_SOUTH` | `["east"]` | `unit-service-south.glb` |

Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.

**Existing source.** `assets/source/unit-service-south/` holds one GLB and an unapplied package; reference only.

## 3. Walls

### FRONTAGE_SERVICE_SOUTH_EAST  ·  BLD_SPICE_BACKS (service back, 2 storeys)

- **Role:** service back. A service-yard wall: nothing opens onto the lane; the roof behind drains through one spout.
- **Wall line:** east edge of `SERVICE_SOUTH`; x = 10, y = 13.6 .. 29.4 (a runs south to north); length **15.8 m**; street side -X (street lies west of the wall); kit `Wall(F, (10, 13.6), (10, 29.4), faces='W')`.
- **Retained massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 local / 4.9 absolute, depth 0.96 m; roof and parapet stay runtime-owned per section 7.
- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.
- **Blender materials:** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, timber `ph_rough_pine_door`; hardware `ph_rusty_metal_02`.
- **Corners:** `held`. Ground head datum 3.4 m. Exact end piers and finish datums are in the tasks below.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |
|---|---|---|---:|---|---|---|---:|
| `BAY_01` | `blind_niche` |  | 3.95 | (10, 17.55) | 1.05 × 0.18 × 1.8 | 1.6 / 3.4 | 0 |
| `BAY_02` | `blind_niche` |  | 7.9 | (10, 21.5) | 1.05 × 0.18 × 1.8 | 1.6 / 3.4 | 0 |
| `BAY_03` | `blind_niche` |  | 11.85 | (10, 25.45) | 1.05 × 0.18 × 1.8 | 1.6 / 3.4 | 0 |

Skin aperture input for `Wall.skin(..., openings=...)`: `[(3.95, 1.05, 1.6, 1.8), (7.9, 1.05, 1.6, 1.8), (11.85, 1.05, 1.6, 1.8)]`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.


**Construction tasks (ordered; each has an observable completion):**

1. CREATE the section finish: skin `ph_whitewashed_brick_warm`, plinth 0..0.44 sandstone, course 2.84..2.96, coping 4.74..4.9; end piers 0.45. Completion: quiet aged-limewashed service-yard wall.
2. CREATE `BAY_01/02/03` niches 1.05 × 1.8 at sill 1.60, a=3.95/7.9/11.85. No hatch. Completion: three high panels.
3. CREATE one drain spout (SD-13, terracotta 0.12) at a=13.9 with the base stain under it (closes the `drain_stain` need); APPLY wear: dirt band, damp 0..0.6 at the spout end only. KEEP basket and pot at (9.5, 20.7) / (9.48, 22.15). Completion: one spout, one stain.

**Why it exists (reality check):** A service-yard wall: nothing opens onto the lane; the roof behind drains through one spout.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. New free placements go in `placements[]` with their scheduled coordinates. Fitted details such as the named repair skins and back-wall textiles travel inside the owning section; do not duplicate them as placements.

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_L34_SERVICE_SOUTH_BASKET_L34_SERVICE_SOUTH_BASKET_01` | `ASSET_CC0_BASKET` | `L34_SERVICE_SOUTH_BASKET_01` | (9.5, 20.7, 0) | 0.405 × 0.293 × 0.235 | 262 | KEEP at this transform |
| `PLACE_L34_SERVICE_SOUTH_POTTERY_L34_SERVICE_SOUTH_POTTERY_01` | `ASSET_CC0_POTTERY` | `L34_SERVICE_SOUTH_POTTERY_01` | (9.48, 22.15, 0) | 0.604 × 0.462 × 0.342 | 281 | KEEP at this transform |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `large_sandstone_blocks_01`; polish along the centre; damp patch under the spout at (10, 27.5) 0.6 m across; flush seams at both link mouths.

**`SERVICE_SOUTH` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):

```python
wear_patch(F, [(6.2, 10.3, 0.014), (6.8, 10.3, 0.014), (6.8, 29.7, 0.014), (6.2, 29.7, 0.014)], 'polish')
wear_patch(F, [(9.65, 27.2, 0.014), (10.0, 27.2, 0.014), (10.0, 27.8, 0.014), (9.65, 27.8, 0.014)], 'damp')
wear_patch(F, [(9.763454, 20.45175, 0.014), (9.684821, 21.011251, 0.014), (9.236546, 20.94825, 0.014), (9.315179, 20.388749, 0.014)], 'dust')
wear_patch(F, [(9.712364, 21.715928, 0.014), (9.858051, 22.46542, 0.014), (9.247636, 22.584072, 0.014), (9.101949, 21.83458, 0.014)], 'dust')
```

## 7. Roofs and skyline

Baseline roofs per the massing table above (roof base = wall top, parapet per profile, coping SD-03). No new rooftop props. Perimeter skyline placements, if any, are listed in [skyline.md](skyline.md).

## 8. Required result

- [ ] Three panels at sill 1.6; one spout; nothing else on the wall.
- [ ] Basket and pot within 0.5 m of the east wall.
- [ ] Every scheduled opening exists at its `a`, sill and head; retained code-owned openings in this area stay unchanged. No requirement imports work from another area.
- [ ] Every placed asset in section 4 still sits in a rebate, floor or retained runtime plane that provides its seat (no shutter floating in front of plaster, no counter clipping a jamb).
- [ ] No render-only geometry inside the walking envelope: nothing lower than 2.2 m projects more than 0.35 m from a wall into a route; awning hems are at or above 2.45 m; canopy hems at or above 4.2 m.
- [ ] Doors have thresholds, jambs, heads and hardware and read closed; windows have jambs, heads, sills, reveals and a closure; no black holes, no paper-thin cards.
- [ ] Inspect one close-up of every distinct assembly and one assembled context view with retained roofs, overheads, signs, dressing and ground. Confirm receiving surfaces, export materials, and no unintended coplanar faces; counts alone are insufficient.
- [ ] Corners: solid piers as scheduled; no opening within the reserved end fields; pilasters reach the ground.
- [ ] Plinth, course and below-wall-top facade cornice run the full wall and turn solid corners; the retained runtime coping continues the roofline without a second full-footprint slab.
- [ ] The character schedule is present: distinct material fields, supported textiles where scheduled, sound softened edges, and localized wear. SD-12 bands are maximum receiving envelopes, never uniform brown strips; bleach follows the explicitly named exposed face.

Record `built` after package application and the bounded construction inspection in README.md. Report export, assembly/interface evidence and any unavailable checks separately. Gameplay, aesthetic and performance acceptance remain the later validation task.

