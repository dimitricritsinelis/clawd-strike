# BZ-04 / R7 service south facade-centered upper openings · Service South

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `SERVICE_SOUTH`

Receiving doors and high working light. Two low warehouse fronts use robust planks, dark straps, clean thresholds and consistent high vents. No new shop, decorative canopy, stock pile or route obstruction.

Primary focus: Receiving doors and high working light. Two low warehouse fronts use robust planks, dark straps, clean thresholds and consistent high vents..

## Architecture and craftsmanship

**Primary:** Receiving doors and high working light

**Supporting:** Two low warehouse fronts use robust planks, dark straps, clean thresholds and consistent high vents.

**Quiet fields and limits:** No new shop, decorative canopy, stock pile or route obstruction.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `ss-e` / `BLD_SPICE_SERVICE_COMPOUND` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Spice south service compound - principal frontage |
| `ss-s` / `ASM_SPICE_SOUTH_TERMINAL` | boundary-assembly | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed southern boundary of the service court; a separate enclosure wall, not the receiving-store building |
| `ss-w` / `BLD_SPICE_SERVICE_WEST` | building | `ph_bz04_beige_wall_002`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Two receiving suites retain their offset delivery doors. High lights at 15 and 25 center the pair across the continuous 10..30 facade and each complete receiving suite. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_SERVICE_SOUTH` | `cc-s`, `lsw-n`, `ss-e`, `ss-s`, `ss-w` | `cc-s`, `lsw-n` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT, CF-OPEN, CF-R4-PORTAL

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `SERVICE_SOUTH` · `north`

Quiet background: open x=3..10.

Protected wall interval: **3..10 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 3..10 | **ZERO BUILD protected opening** | CARAVAN_COURT |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `SERVICE_SOUTH` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **10..30 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 13..30 | collider-backed solid | COLLIDER_WALL_052 |
| 10..13 | **ZERO BUILD protected opening** | LINK_SOUTH_WEST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `ss-e` | 13..30 | (10, 13, 13.6, 30) | Spice south service compound - principal frontage | 4.9 | 3.6 | `ph_bz04_plastered_wall` | slab 4.9..5.08; parapet 5.53; cap 5.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `ss-e-ENTRANCE` | `ss-e` | door | 21.5 | 0 / 2.85 | 2.2 × 2.85 × 0.35 | 10 | `SD-05`; closed double timber loading leaves; architecturalDetail: `{"profile":"planked-receiving","surroundWidthM":0.16,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `ss-e-CLERESTORY-1` | `ss-e` | vent | 15.55 | 3.65 / 4.35 | 1.35 × 0.7 × 0.22 | 10 | `SD-07`; closed timber louver | receiving, sorting and high daylight daylight and ventilation |
| `ss-e-CLERESTORY-2` | `ss-e` | vent | 21.5 | 3.65 / 4.35 | 1.35 × 0.7 × 0.22 | 10 | `SD-07`; closed timber louver | receiving, sorting and high daylight daylight and ventilation |
| `ss-e-CLERESTORY-3` | `ss-e` | vent | 27.45 | 3.65 / 4.35 | 1.35 × 0.7 × 0.22 | 10 | `SD-07`; closed timber louver | receiving, sorting and high daylight daylight and ventilation |

### `SERVICE_SOUTH` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **3..10 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 3..10 | collider-backed solid | COLLIDER_WALL_007 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `ss-s` | 3..10 | (3, 9.4, 10, 10) | Closed southern boundary of the service court; a separate enclosure wall, not the receiving-store building | 4.9 | 0.6 | `ph_bz04_sandstone_blocks_06` | slab 4.9..5.02; parapet 5.02; cap 5.02; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `SERVICE_SOUTH` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **10..30 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 10..30 | collider-backed solid | COLLIDER_WALL_047 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `ss-w` | 10..30 | (-0.6, 10, 3, 30) | Two receiving suites retain their offset delivery doors. High lights at 15 and 25 center the pair across the continuous 10..30 facade and each complete receiving suite. | 4.9 | 3.6 | `ph_bz04_beige_wall_002` | slab 4.9..5.08; parapet 5.53; cap 5.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `ss-w-DELIVERY-1` | `ss-w` | door | 17.5 | 0 / 2.8 | 2 × 2.8 × 0.35 | 3 | `SD-06`; closed double timber loading leaves; architecturalDetail: `{"profile":"planked-receiving","surroundWidthM":0.16,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `ss-w-DELIVERY-2` | `ss-w` | door | 27.5 | 0 / 2.8 | 2.2 × 2.8 × 0.35 | 3 | `SD-06`; closed double timber loading leaves; architecturalDetail: `{"profile":"planked-receiving","surroundWidthM":0.16,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `ss-w-HIGH-LIGHT-1` | `ss-w` | vent | 15 | 3.65 / 4.35 | 1.35 × 0.7 × 0.24 | 3 | `SD-07`; closed timber louver | two receiving tenancies with high daylight daylight and ventilation |
| `ss-w-HIGH-LIGHT-3` | `ss-w` | vent | 25 | 3.65 / 4.35 | 1.35 × 0.7 × 0.24 | 3 | `SD-07`; closed timber louver | two receiving tenancies with high daylight daylight and ventilation |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `SERVICE_SOUTH` floor | `bz04_large_sandstone_blocks_01` | {'receiver': 'bz04_large_sandstone_blocks_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'SERVICE_SOUTH-CLEAR', 'x': 4.25, 'y': 10, 'w': 4.5, 'h': 20, 'heightM': 2.2, 'floorSource': 'SERVICE_SOUTH'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `SERVICE_SOUTH` | `SERVICE_SOUTH-CLEAR` | **CLEAR ROUTE** | (4.25, 10) → (8.75, 30) | Protected empty region | Do not place geometry |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| — | — | — | No fixtures scheduled | — | — |

| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `SERVICE_SOUTH` | 48000 | 8 | 8 | 6 |

Section origin (design coordinates): `{'x': 3, 'y': 10, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-3.8, -0.02, -0.7999999999999989], 'max': [10.799999999999999, 4.92, 20.2]}`.
Required bindings: `bz04_large_sandstone_blocks_01`, `ph_bz04_beige_wall_002`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `SERVICE_SOUTH-travel-reverse` | `SERVICE_SOUTH` | (6.5, 29.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `SERVICE_SOUTH-travel-forward` | `SERVICE_SOUTH` | (6.5, 10.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `SERVICE_SOUTH-east-ss-e-s1-base` | `SERVICE_SOUTH` | (3.35, 17.25, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_SOUTH-east-ss-e-s2-base` | `SERVICE_SOUTH` | (3.35, 25.75, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_SOUTH-south-ss-s-s1-base` | `SERVICE_SOUTH` | (6.5, 29.65, 1.7) | 0° / 1.191° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_SOUTH-west-ss-w-s1-base` | `SERVICE_SOUTH` | (9.65, 15, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_SOUTH-west-ss-w-s2-base` | `SERVICE_SOUTH` | (9.65, 25, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_SOUTH-R3-craft-detail` | `SERVICE_SOUTH` | (6.5, 21.5, 1.7) | 270° / 1.637° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: ss-e-ENTRANCE |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `SERVICE_SOUTH` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `SERVICE_SOUTH` cells: `ROOF_CELL_025`, `ROOF_CELL_070`, `ROOF_CELL_071`.
- `SERVICE_SOUTH` bundles: `ROOF_BUNDLE_UNIT_SERVICE_SOUTH`.
- `SERVICE_SOUTH` interfaces: `ROOF_INTERFACE_ROOF_STEP_001`, `ROOF_INTERFACE_ROOF_STEP_003`, `ROOF_INTERFACE_ROOF_STEP_018`, `ROOF_INTERFACE_ROOF_STEP_020`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_plastered_wall` | `ph_plastered_wall` | <span style="color:#ddd0b3">■</span> `#ddd0b3` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |
|---|---|---|---|---|
| `BG-07` | `SERVICE_SOUTH` | shared-environment | (-6, 13, 0) → (-1, 22, 8.4) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_L34_SERVICE_SOUTH_BASKET_L34_SERVICE_SOUTH_BASKET_01` | `SERVICE_SOUTH` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_SERVICE_SOUTH_POTTERY_L34_SERVICE_SOUTH_POTTERY_01` | `SERVICE_SOUTH` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_BAY_01` | `SERVICE_SOUTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_BAY_02` | `SERVICE_SOUTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_BAY_03` | `SERVICE_SOUTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_SOUTH_EAST_MASSING` | `SERVICE_SOUTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_SERVICE_SOUTH_north` | `SERVICE_SOUTH` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SERVICE_SOUTH_east` | `SERVICE_SOUTH` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SERVICE_SOUTH_south` | `SERVICE_SOUTH` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SERVICE_SOUTH_west` | `SERVICE_SOUTH` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [SERVICE_SOUTH dimensioned plan](drawings/service_south-plan.svg), [SERVICE_SOUTH four elevations](drawings/service_south-elevations.svg), and [SERVICE_SOUTH roof axonometric](drawings/service_south-axon.svg)
- [Master plan](drawings/master-plan.svg)
