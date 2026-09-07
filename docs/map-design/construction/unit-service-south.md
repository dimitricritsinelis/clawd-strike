# unit-service-south · Service South

Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot unit-service-south --tag r1-before` prints the same walls and must agree. Also called: Service South, south service alley.

**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.

## 1. Design intent

A quiet 7 m service lane: whitewashed yard wall with three high panels on the east, sealed perimeter west and south. Wear tells the story: one spout, one stain, a basket and a pot at the wall.

## 2. Site

### Site · `SERVICE_SOUTH` (Service South)

- Rect x 3..10, y 10..30 (7 × 20 m); floor z = 0; floor `large_sandstone_blocks_01`; authored clear width **4.5 m** (protected).
- Connects: CARAVAN_COURT, LINK_SOUTH_WEST.
- `north` edge: exempt (`open_traversal_face`): No collision-wall span exists on the 7.00m north edge; the full face remains an authored traversal opening.
- `south` edge: exempt (`sealed_perimeter`): The 7.00m wall run on the 7.00m south edge is a deliberately sealed back-of-house boundary.
- `west` edge: exempt (`sealed_perimeter`): The 20.00m west wall is the deliberately sealed outer service perimeter.
- `east` edge: frontage `FRONTAGE_SERVICE_SOUTH_EAST` → `BLD_SPICE_BACKS`.

**Existing source.** `assets/source/unit-service-south/` holds one GLB and an unapplied package; reference only.

## 3. Walls

### FRONTAGE_SERVICE_SOUTH_EAST  ·  BLD_SPICE_BACKS (service back, 2 storeys)

- **Role:** compound/service wall. Blank, two high vents, one hatch, drain staining at the base, one string course.
- **Wall line:** east edge of `SERVICE_SOUTH`; x = 10, y = 13.6 .. 29.4 (a runs south to north); length **15.8 m**; street side -X (street lies west of the wall); kit `Wall(F, (10, 13.6), (10, 29.4), faces='W')`.
- **Massing `MASSING_FRONTAGE_RELIEF`:** wall top 4.9 m, depth 0.96 m, roof `flat_parapet`, roof setback 0.08 m, parapet +0.45 m; baseline survey: roof base 4.9, parapet cap 5.790, emitted max 7.918.
- **Facade GLB frame:** width 15.8 m × height 4.9 m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.
- **Materials (profile `quiet_residential_warmwash_relief`):** wall `ph_whitewashed_brick_warm`, trim `ph_trim_sanded_01`, roof `ph_worn_plaster_sun`, timber `ph_rough_pine_door`, metal `tm_balcony_painted_metal`, accent `ph_band_beige_001`.
- **Corners:** `held`; solid end piers reserved: 3.42 m at a=0, 3.42 m at a=L. Ground head datum 3.4 m.
- **Horizontal datums (SD-01..SD-03 unless overridden):** plinth 0..0.44; string course 2.90; coping 4.74..4.9.

| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |
|---|---|---|---:|---|---|---|---:|---|
| `BAY_01` | `blind_niche` |  | 3.95 | (10, 17.55) | 1.05 × 0.18 × 1.8 | 1.6 / 3.4 | 0 |  |
| `BAY_02` | `blind_niche` |  | 7.9 | (10, 21.5) | 1.05 × 0.18 × 1.8 | 1.6 / 3.4 | 0 |  |
| `BAY_03` | `blind_niche` |  | 11.85 | (10, 25.45) | 1.05 × 0.18 × 1.8 | 1.6 / 3.4 | 0 |  |

Open `needs` in the spec (close them with this sheet): `drain_stain: base staining decal under a drain spout`.

**Composition.** The service-yard enclosure uses three high blind panels and a stained base, with no public access on this side.

**Construction tasks (ordered; each has an observable completion):**

1. CREATE the face GLB: skin `ph_whitewashed_brick_warm`, plinth 0..0.44 sandstone, course 2.84..2.96, coping 4.74..4.9; end piers 0.45. Completion: quiet whitewashed service-yard wall.
2. CREATE `BAY_01/02/03` niches 1.05 × 1.8 at sill 1.60, a=3.95/7.9/11.85. No hatch. Completion: three high panels.
3. CREATE one drain spout (SD-13, terracotta 0.12) at a=13.9 with the base stain under it (closes the `drain_stain` need); APPLY wear: dirt band, damp 0..0.6 at the spout end only. KEEP basket and pot at (9.5, 20.7) / (9.48, 22.15). Completion: one spout, one stain.

**Why it exists (reality check):** A service-yard wall: nothing opens onto the lane; the roof behind drains through one spout.

## 4. Free placements (dressing, cover, landmarks)

Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.

| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |
|---|---|---|---|---|---:|---|
| `PLACE_L34_SERVICE_SOUTH_BASKET_L34_SERVICE_SOUTH_BASKET_01` | `ASSET_CC0_BASKET` | `L34_SERVICE_SOUTH_BASKET_01` | (9.5, 20.7, 0) | 0.41 × 0.29 × 0.24 | 262 | KEEP at this transform |
| `PLACE_L34_SERVICE_SOUTH_POTTERY_L34_SERVICE_SOUTH_POTTERY_01` | `ASSET_CC0_POTTERY` | `L34_SERVICE_SOUTH_POTTERY_01` | (9.48, 22.15, 0) | 0.6 × 0.46 × 0.34 | 281 | KEEP at this transform |

## 5. Overheads

Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.

None scheduled. Do not add one.

## 6. Ground, wear and drainage

KEEP `large_sandstone_blocks_01`; polish along the centre; damp patch under the spout at (10, 27.5) 0.6 m across; flush seams at both link mouths.

## 7. Roofs and skyline

Baseline roofs per the massing table above (roof base = wall top, parapet per profile, coping SD-03). No new rooftop props. Perimeter skyline placements, if any, are listed in [skyline.md](skyline.md).

## 8. Completion checks

- [ ] Three panels at sill 1.6; one spout; nothing else on the wall.
- [ ] Basket and pot within 0.5 m of the east wall.
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

