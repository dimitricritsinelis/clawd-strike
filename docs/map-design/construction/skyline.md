# skyline · Perimeter roofs and skyline

Construction sheet for everything above the parapets and beyond the playable boundary. Read [README.md](README.md) first. There is no shoot unit for the skyline: placements with role `skyline` travel in the package of the adjoining unit, and every unit's section 7 names its own roofs.

**Scope lock.** Render-only. The 120 background shells (`resolveBackgroundShellPlacements`), the three minaret flags, the sealed perimeter walls and every roof slab are retained as built. No accessible roof, no new connector, no roof props.

## 1. Design intent

The map reads as a district of a larger city: stepped flat roofs with parapets and copings, a few occupied upper rooms, water tanks and one minaret vista, palms at the courts. Near the routes the roofs step with the buildings (S1 Spice, S2 Textile and Tea); beyond the boundary the shells stay quiet and economical. Sky gaps between canopies stay open; no continuous cloth ceiling.

## 2. Adopted roof profiles (absolute z)

| Building / frontage | Roof base | Parapet cap | Rule |
|---|---:|---:|---|
| Spice west, south parcel (y 15.44..21.56) | 7.60 | 8.79 | S1, placed `ASSET_SPICE_ROOF_SOUTH` at (18.6, 18.5, 7.0) |
| Spice west, middle parcel (y 21.56..27.32) | 8.40 | 9.59 | S1, placed `ASSET_SPICE_ROOF_MIDDLE` at (18.6, 24.44, 7.0) |
| Spice west, north parcel (y 27.32..30.56) | 7.00 | 8.19 | S1, placed `ASSET_SPICE_ROOF_NORTH` at (18.6, 28.94, 7.0) |
| Spice east | 4.50 | 5.59 | baseline; setback room `ASSET_SPICE_UPPER_ROOM` (35.7, 27.28, 4.76), cap 7.71 |
| Madrasa (both faces) | 9.50 | 10.79 | baseline; minaret vista retained |
| Merchant house / Souk west wings | 7.00 | 8.19 | one roof owner (Souk massing); no second slab |
| Textile west, south (y 49.28..56.8) | 7.00 | 8.19 | S2, built in the Textile west GLB |
| Textile west north wing / Tea house (y 56.8..62.72) | 8.40 | 9.59 | S2, one stepped roof: Tea GLB owns x 19..24 |
| Tea house beyond y 62.72 to 65.2 | 8.40 | 9.59 | Tea GLB |
| Textile east | 4.50 | 5.59 | flat, two roof ties |
| Rug merchant | 7.00 | 8.19 | baseline (emitted 8.87 kept) |
| Gatekeeper | 4.50 | 5.59 | baseline |
| Caravan stores | 4.50 | 5.59 | baseline |
| Caravan yard walls, Souk yard wall, North Court walls, link walls, Spawn B wings, Spice backs, Dyers Alley east | 4.90 | 5.79 | compound walls, coping 4.74..4.9 |
| Service North spines (three) | 7.00 | 7.89 | retaining screens, coping 6.84..7.0 |
| Dyers arcade east (B18) | 4.50 (slab 4.76) | 5.59 | roof-access room placed at (55.5, 42.8, 4.76), cap 7.35; two vent boxes per the Souk sheet |
| Dye works | 7.00 | 8.19 | party wall above the house stays blank stone |
| Dyers house | 4.50 (slab 4.76) | 5.59 | roof hatch placed at (42.9, 23.5, 4.76) |
| Dogleg boundary planes | 7.00 | 7.00 | code-owned |
| Hammam | 7.00 | 8.19 | no dome |
| Spawn A kits | as built | gate turret 11.9; backs 9.25 / 7.75 / 6.5; works chimney 12.55; returns 7.6 | retained kits |
| Spawn B | 4.90 | 5.79 | plus placed upper rooms at z 9.85..10.0 and the skyline palm (17.1, 89.6, 7.4) |

## 3. Tasks

1. KEEP every placement in the table; the face GLBs stop at their copings and never add a second slab under a placed roof asset. Completion: no double slab or floating roof base anywhere in `pnpm map:shoot` roof views.
2. CREATE the S2 stepped roofs in the Textile west and Tea GLBs as their sheets specify (one owner per x range). Completion: from Fountain Court looking north the west side steps 8.19 → 9.59; from the Tea terrace the house roof is continuous with the wing.
3. KEEP the 120 background shells, their tanks and the three minarets. The conditional near-city upper closures (two backed windows per selected ring-0 shell) are deferred until the visible shell ids are recorded from a shoot; do not add them speculatively. Completion: no change in the background shell set.
4. Sky gaps: no new canopy, line or roof volume closes the gap between the Spice canopies, between the Textile canopy and lines, or over any court. Completion: sky visible between spans from both ends of Spice and Textile.

## 4. Completion checks

- [ ] Every roof base and cap in the table matches the emitted geometry within 0.05 m.
- [ ] No roof props, antennas, water tanks or domes added near the routes.
- [ ] Minaret vista from Fountain Court unchanged.
- [ ] Worst view within the performance budget.
