# BZ-04 / R7 service north facade-centered upper openings · Service North

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `SERVICE_NORTH`

Practical delivery and dry-stock fronts. Wider receiving doors, high upper vents and real masonry/coping joints distinguish stores from homes. The opposite grade spine is a retaining/service enclosure, not a blank house to decorate.

Primary focus: Practical delivery and dry-stock fronts. Wider receiving doors, high upper vents and real masonry/coping joints distinguish stores from homes..

## Architecture and craftsmanship

**Primary:** Practical delivery and dry-stock fronts

**Supporting:** Wider receiving doors, high upper vents and real masonry/coping joints distinguish stores from homes.

**Quiet fields and limits:** The opposite grade spine is a retaining/service enclosure, not a blank house to decorate.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `sn-n` / `ASM_NORTH_SERVICE_SPINE` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Tea and service-lane enclosure spine enclosure return |
| `sn-es` / `ASM_NORTH_SERVICE_SPINE` | boundary-assembly | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Tea and service-lane enclosure spine enclosure return |
| `sn-et` / `ASM_NORTH_SERVICE_SPINE` | boundary-assembly | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Tea and service-lane enclosure spine enclosure return |
| `sn-en` / `ASM_NORTH_SERVICE_SPINE` | boundary-assembly | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Tea and service-lane enclosure spine enclosure return |
| `sn-w` / `BLD_NORTH_SERVICE_COMPOUND` | building | `ph_bz04_beige_wall_002`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Three full receiving tenancies occupy 48..57.6, 57.6..70.4 and 70.4..80. Upper storage lights at 52.8, 64 and 75.2 center a balanced row across the 48..80 facade. Ground work windows and delivery doors retain their paired-bay positions. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_SERVICE_NORTH` | `sn-en`, `sn-es`, `sn-et`, `sn-n`, `sn-w` | none |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-JOINT, CF-OPEN

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `SERVICE_NORTH` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **3..10 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 3..10 | collider-backed solid | COLLIDER_WALL_038 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `sn-n` | 3..10 | (3, 80, 10, 80.7) | Tea and service-lane enclosure spine enclosure return | 7 | 0.7 | `ph_bz04_sandstone_blocks_06` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `SERVICE_NORTH` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **48..80 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 48..76 | collider-backed solid | COLLIDER_WALL_053 |
| 76..80 | **ZERO BUILD protected opening** | LINK_NORTH_WEST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `sn-es` | 48..57.344 | (10, 48, 11, 57.344) | Tea and service-lane enclosure spine enclosure return | 7 | 1 | `ph_bz04_sandstone_blocks_06` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `sn-et` | 57.344..66.656 | (10, 57.344, 11, 66.656) | Tea and service-lane enclosure spine enclosure return | 7 | 1 | `ph_bz04_sandstone_blocks_06` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `sn-en` | 66.656..76 | (10, 66.656, 10.8, 76) | Tea and service-lane enclosure spine enclosure return | 7 | 0.8 | `ph_bz04_sandstone_blocks_06` | slab 7..7.12; parapet 7.12; cap 7.12; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `SERVICE_NORTH` · `south`

Quiet background: open x=3..10.

Protected wall interval: **3..10 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 3..10 | **ZERO BUILD protected opening** | CARAVAN_COURT |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `SERVICE_NORTH` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **48..80 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 48..80 | collider-backed solid | COLLIDER_WALL_049 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `sn-w` | 48..80 | (-0.6, 48, 3, 80) | Three full receiving tenancies occupy 48..57.6, 57.6..70.4 and 70.4..80. Upper storage lights at 52.8, 64 and 75.2 center a balanced row across the 48..80 facade. Ground work windows and delivery doors retain their paired-bay positions. | 7.2 | 3.6 | `ph_bz04_beige_wall_002` | slab 7.2..7.38; parapet 7.83; cap 7.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `sn-w-DELIVERY-1` | `sn-w` | door | 55.2 | 0 / 2.85 | 2.1 × 2.85 × 0.35 | 3 | `SD-06`; closed double timber loading leaves | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `sn-w-GROUND-LIGHT-1` | `sn-w` | window | 50.4 | 1.35 / 2.6 | 1.05 × 1.25 × 0.24 | 3 | `SD-07`; closed timber louver | Caravan receiving workroom daylight above the storage bench |
| `sn-w-DELIVERY-2` | `sn-w` | door | 67.2 | 0 / 2.85 | 2.2 × 2.85 × 0.35 | 3 | `SD-06`; closed double timber loading leaves | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `sn-w-GROUND-LIGHT-2` | `sn-w` | window | 60.8 | 1.35 / 2.6 | 1.05 × 1.25 × 0.24 | 3 | `SD-07`; closed timber louver | Merchant dry stores workroom daylight above the storage bench |
| `sn-w-DELIVERY-3` | `sn-w` | door | 77.6 | 0 / 2.6 | 1.5 × 2.6 × 0.35 | 3 | `SD-06`; closed double timber loading leaves | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `sn-w-GROUND-LIGHT-3` | `sn-w` | window | 72.8 | 1.35 / 2.6 | 1.05 × 1.25 × 0.24 | 3 | `SD-07`; closed timber louver | Linen wash and storage workroom daylight above the storage bench |
| `sn-w-L1-W1` | `sn-w` | vent | 52.8 | 5.85 / 6.65 | 1.8 × 0.8 × 0.3 | 3 | `SD-07`; closed timber louver | high-ventilated dry storage; high ventilation |
| `sn-w-L1-W3` | `sn-w` | vent | 64 | 5.85 / 6.65 | 1.8 × 0.8 × 0.3 | 3 | `SD-07`; closed timber louver | high-ventilated dry storage; high ventilation |
| `sn-w-L1-W5` | `sn-w` | vent | 75.2 | 5.85 / 6.65 | 1.8 × 0.8 × 0.3 | 3 | `SD-07`; closed timber louver | high-ventilated dry storage; high ventilation |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `SERVICE_NORTH` floor | `bz04_large_sandstone_blocks_01` | {'receiver': 'bz04_large_sandstone_blocks_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'SERVICE_NORTH-CLEAR', 'x': 4.25, 'y': 48, 'w': 4.5, 'h': 32, 'heightM': 2.2, 'floorSource': 'SERVICE_NORTH'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `SERVICE_NORTH` | `SERVICE_NORTH-CLEAR` | **CLEAR ROUTE** | (4.25, 48) → (8.75, 80) | Protected empty region | Do not place geometry |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| — | — | — | No fixtures scheduled | — | — |

| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `SERVICE_NORTH` | 48000 | 9 | 9 | 7 |

Section origin (design coordinates): `{'x': 3, 'y': 48, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-3.8, -0.02, -0.20000000000000284], 'max': [8.2, 7.22, 32.900000000000006]}`.
Required bindings: `bz04_large_sandstone_blocks_01`, `ph_bz04_beige_wall_002`, `ph_bz04_painted_plaster_warm`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `SERVICE_NORTH-travel-reverse` | `SERVICE_NORTH` | (6.5, 79.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `SERVICE_NORTH-travel-forward` | `SERVICE_NORTH` | (6.5, 48.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `SERVICE_NORTH-north-sn-n-s1-base` | `SERVICE_NORTH` | (6.5, 48.35, 1.7) | 180° / 0.905° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_NORTH-east-sn-es-s1-base` | `SERVICE_NORTH` | (3.35, 52.672, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_NORTH-east-sn-et-s1-base` | `SERVICE_NORTH` | (3.35, 62, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_NORTH-east-sn-en-s1-base` | `SERVICE_NORTH` | (3.35, 71.328, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_NORTH-west-sn-w-s1-base` | `SERVICE_NORTH` | (9.65, 53.333, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_NORTH-west-sn-w-s1-upper` | `SERVICE_NORTH` | (9.65, 53.333, 1.7) | 90° / 40.502° / 75° | upper facade, parapet and roof-step coverage |
| `SERVICE_NORTH-west-sn-w-s2-base` | `SERVICE_NORTH` | (9.65, 64, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_NORTH-west-sn-w-s2-upper` | `SERVICE_NORTH` | (9.65, 64, 1.7) | 90° / 40.502° / 75° | upper facade, parapet and roof-step coverage |
| `SERVICE_NORTH-west-sn-w-s3-base` | `SERVICE_NORTH` | (9.65, 74.667, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SERVICE_NORTH-west-sn-w-s3-upper` | `SERVICE_NORTH` | (9.65, 74.667, 1.7) | 90° / 40.502° / 75° | upper facade, parapet and roof-step coverage |
| `SERVICE_NORTH-R3-craft-detail` | `SERVICE_NORTH` | (6.5, 55.2, 1.7) | 90° / 4.899° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: sn-w-DELIVERY-1 |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `SERVICE_NORTH` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `SERVICE_NORTH` cells: `ROOF_CELL_018`, `ROOF_CELL_019`, `ROOF_CELL_020`, `ROOF_CELL_021`, `ROOF_CELL_022`, `ROOF_CELL_063`.
- `SERVICE_NORTH` bundles: `ROOF_BUNDLE_UNIT_SERVICE_NORTH`.
- `SERVICE_NORTH` interfaces: `ROOF_INTERFACE_ROOF_SEAM_001`, `ROOF_INTERFACE_ROOF_SEAM_005`, `ROOF_INTERFACE_ROOF_STEP_002`, `ROOF_INTERFACE_ROOF_STEP_005`, `ROOF_INTERFACE_ROOF_STEP_007`, `ROOF_INTERFACE_ROOF_STEP_008`, `ROOF_INTERFACE_ROOF_STEP_009`, `ROOF_INTERFACE_ROOF_STEP_010`, `ROOF_INTERFACE_ROOF_STEP_011`, `ROOF_INTERFACE_ROOF_STEP_012`, `ROOF_INTERFACE_ROOF_STEP_013`, `ROOF_INTERFACE_ROOF_STEP_014`, `ROOF_INTERFACE_ROOF_STEP_016`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |
|---|---|---|---|---|
| `BG-09` | `SERVICE_NORTH` | shared-environment | (-6, 57, 0) → (-1, 66, 10.2) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |
| `BG-10` | `SERVICE_NORTH` | shared-environment | (-7, 75, 0) → (-1, 83, 9.5) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID_GROUND_01` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID_GROUND_02` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID_MASSING` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_MID_STORY_1_WINDOW_01` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_N_BAY_01` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_N_BAY_02` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_N_MASSING` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_GROUND_01` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_GROUND_02` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_MASSING` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_STORY_1_WINDOW_01` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_STORY_1_WINDOW_02` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SERVICE_NORTH_EAST_SPINE_S_STORY_1_WINDOW_03` | `SERVICE_NORTH` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_SERVICE_NORTH_north` | `SERVICE_NORTH` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SERVICE_NORTH_east` | `SERVICE_NORTH` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SERVICE_NORTH_south` | `SERVICE_NORTH` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SERVICE_NORTH_west` | `SERVICE_NORTH` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [SERVICE_NORTH dimensioned plan](drawings/service_north-plan.svg), [SERVICE_NORTH four elevations](drawings/service_north-elevations.svg), and [SERVICE_NORTH roof axonometric](drawings/service_north-axon.svg)
- [Master plan](drawings/master-plan.svg)
