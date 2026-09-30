# Bazaar map

## Source and coordinates

[map_spec.json](../apps/client/assets-src/maps/bazaar-map/map_spec.json) is the source of truth for the shipped format-version 3 map. Its playable boundary is 56 by 92 metres. It defines three tactical lanes, 25 named zones, and two authored spawn sets. The source coordinates use X east, Y north, and Z up, with the origin at the southwest corner and yaw zero facing north. [coordinateTransforms.ts](../apps/client/src/runtime/map/world/coordinateTransforms.ts) converts these to the runtime's Y-up frame; do not swap axes ad hoc.

The zone aliases below come from `layout_reference.zone_aliases`:

| Zone ID | Label |
|---|---|
| `SPAWN_A_COURTYARD` | Spawn A Courtyard |
| `SPICE_STREET` | Spice Street |
| `FOUNTAIN_COURT` | Fountain Court |
| `TEXTILE_ARCADE` | Textile Arcade |
| `RUG_GATE` | Rug Gate |
| `SPAWN_B_COURTYARD` | Spawn B Courtyard |
| `SERVICE_SOUTH` | Service South |
| `CARAVAN_COURT` | Caravan Court |
| `SERVICE_NORTH` | Service North |
| `TEA_RAMP` | Tea Terrace Ramp |
| `TEA_TERRACE` | Tea Terrace |
| `TEA_STAIRS` | Tea Terrace Stairs |
| `TEA_LANDING` | Tea Terrace Landing |
| `DYERS_ALLEY` | Dyers Alley |
| `COVERED_SOUK` | Covered Dyers Souk |
| `DYERS_DOGLEG` | Dyers Dogleg |
| `NORTH_COURT` | North Court |
| `LINK_WEST_MID` | West Mid Link |
| `LINK_EAST_MID` | East Mid Link |
| `LINK_WEST_UPPER` | West Upper Link |
| `LINK_EAST_UPPER` | East Upper Link |
| `LINK_SOUTH_WEST` | South West Link |
| `LINK_SOUTH_EAST` | South East Link |
| `LINK_NORTH_WEST` | North West Link |
| `LINK_NORTH_EAST` | North East Link |

## Build data

The [map source directory](../apps/client/assets-src/maps/bazaar-map/) contains the source spec, schemas, composition waivers, and authored review cameras. [gen-map-runtime.mjs](../apps/client/scripts/gen-map-runtime.mjs) validates them and writes committed runtime JSON under `apps/client/public/maps/bazaar-map/`. Generated provenance records source hashes. Run:

```sh
pnpm --filter @clawd-strike/client gen:maps
pnpm check:maps
```

Review both source and generated output. Never hand-edit `public/maps/`. The generator path is itself part of the provenance schema contract.

Two exact composition waivers remain in [composition_waivers.json](../apps/client/assets-src/maps/bazaar-map/composition_waivers.json), both in Spice Street: `CW-7599CB836F04` records the barrel/cover-core hard overlap; `CW-13333D7BED23` records the rug-cover opening-service conflict. They preserve named historical exceptions, not general permission for new overlaps.

## Gameplay boundary and guards

`buildBlockout` owns the map collision foundation and traversal geometry. `buildProps` also contributes specific authored shop colliders. Render-only facades, roof dressing, weathering, and atmosphere must stay within their clearance envelope and must not quietly change playable routes or cover.

[mapGuard.ts](../scripts/lib/mapGuard.ts) protects dimensions, traversal surfaces, lane/connectivity data, authored spawns, constraints, zone geometry, doorway dimensions, and gameplay source-file patterns. `pnpm map:check` also evaluates authored placement geometry. It compares with an existing task baseline or HEAD; an intentionally scoped change to a protected source file still needs review. The collider snapshot in [mapColliders.snapshot.test.ts](../apps/client/src/runtime/map/world/mapColliders.snapshot.test.ts) provides a separate runtime geometry regression check. Neither mechanism proves visual quality or successful traversal by itself.

Run `pnpm test:e2e:traversal` for canonical final-map traversal and `pnpm capture:shots` for the cameras in source `shots.json`. Use the full completion/release checks described in [development](development.md) when handing off a map change.

## Visual layers and clearance

Authored facade and roof GLBs use shared textures; compiled dressing places specific procedural details and models. The atmosphere overlay adds market furnishings, wall-foot clutter, palms, and overhead spans. Its tests enforce shallow clutter projection (at most 0.30 m), awning valances at least 2.45 m above the authored datum, overhead spans at least 4.20 m, and palms away from playable floor. Preserve door approaches and route clearance as well; not every art-direction condition has its own assertion.

The visual target is a readable FPS bazaar: clear routes and cover, aged plaster/stone, timber and cloth, purposeful trading groups, and wear following contact and use. Dust2 informs readability; Souq Waqif and Mutrah inform architecture and craft. Avoid random scatter, texture repetition used as composition, and invented or pseudo-Arabic script. Labels use Latin characters.

## Frozen construction pipeline

Map construction documents, drawings, design data, `handoff.py`, `roof-coordination.json`, and the original atmosphere generator are archived at `archive/bazaar-map-dev`. The retained unit/shared-environment builders depend on that bundle; they are not standalone current-checkout regeneration commands. The atmosphere data in [atmosphere.json](../apps/client/src/runtime/map/atmosphere/atmosphere.json) is frozen generated data, guarded by runtime tests.

To reproduce historical facade or atmosphere output, use a separate checkout of the archive tag and its complete inputs, then follow the instructions at that revision. The historical pipeline used Blender's Python 3.13 for the construction generators and validators. Do not copy one generator into the current tree and assume its path, schema, or design dependencies match.

The archive records the BZ-04 R1–R8 whole-map construction work across all 25 zones. An archived screenshot or successful historical test is evidence for that revision, not final acceptance of later assets or code.
