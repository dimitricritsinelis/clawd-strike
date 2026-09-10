# BZ-04 / R7 dyers dogleg facade-centered upper openings · Dyers Dogleg

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `DYERS_DOGLEG`

The centered domestic entrance and simple supported balcony. A plain closed upper door, quiet side rooms and a working annex; no repeated colored glass.

Primary focus: Working annex opposite a quiet dyer house. The existing sample-drying frame identifies the working side of the turn; ordinary domestic shutters remain calm..

## Architecture and craftsmanship

**Primary:** The centered domestic entrance and simple supported balcony

**Supporting:** A plain closed upper door, quiet side rooms and a working annex; no repeated colored glass

**Quiet fields and limits:** Keep drying samples in the serviceable workfront. The former high crossing line is omitted rather than inventing a loading balcony or a speculative hauling mechanism.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `dd-e` / `BLD_DOGLEG_EAST_HOUSE` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Balcony is the house focus; use one rectangular double-leaf balcony door, not a colored-glass paired-window motif. Side room windows remain plain and aligned. |
| `dd-w` / `BLD_DOGLEG_WEST_ANNEX` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | The unequal broad and service light pair at 51.85 and 58.85 has balanced outer margins in the 48..62 facade. The single full-width drying-loft vent centers independently at 55. Ground access remains unchanged. |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_DD_WORKS_RECESS` | sample drying composition for this tenancy | 8 / CF-CLOTH, CF-FURNITURE, CF-TIMBER | Build the named parts as sample drying composition for this tenancy. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_DYERS_DOGLEG` | `cs-n-part-2`, `dd-e`, `dd-w`, `nc-s` | `cs-n-part-2`, `nc-s` |

**Required craft recipes:** CF-CLOTH, CF-ENVELOPE, CF-FLOOR, CF-FURNITURE, CF-JOINT, CF-OPEN, CF-R4-BALCONY, CF-R4-PORTAL, CF-TIMBER

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

### Supported shallow balcony

```json
{
  "id": "R4-DOGLEG-HOUSE-BALCONY",
  "zone": "DYERS_DOGLEG",
  "receiverParcel": "dd-e",
  "receiverFace": "east",
  "wallPlaneM": 53,
  "kind": "supported-shallow-balcony",
  "alongM": 55,
  "alongBoundsM": [
    53.8,
    56.2
  ],
  "outM": [
    -0.18,
    0.55
  ],
  "zM": [
    3.06,
    4.65
  ],
  "widthM": 2.4,
  "deck": {
    "topZM": 3.6,
    "bottomZM": 3.46,
    "outM": [
      -0.1,
      0.55
    ],
    "alongBoundsM": [
      53.8,
      56.2
    ]
  },
  "joists": {
    "alongAxesM": [
      54.15,
      55.85
    ],
    "sectionM": [
      0.12,
      0.14
    ],
    "outM": [
      -0.18,
      0.55
    ],
    "zM": [
      3.32,
      3.46
    ]
  },
  "braces": {
    "alongAxesM": [
      54.15,
      55.85
    ],
    "sectionM": 0.08,
    "centerlineOutZ": [
      [
        -0.02,
        3.1
      ],
      [
        0.45,
        3.32
      ]
    ],
    "lowestZM": 3.06,
    "attachment": "Housed into the wall and underside of each joist; backed wall plates remain within the declared receiver envelope."
  },
  "balustrade": {
    "zM": [
      3.6,
      4.65
    ],
    "postSectionM": 0.07,
    "railSectionM": 0.07,
    "infill": "Plain vertical timber balusters0.025m at0.14m pitch; no copied B star ornament",
    "frontOutM": 0.515,
    "sideOutM": [
      -0.02,
      0.55
    ],
    "endPostAxesM": [
      53.835,
      56.165
    ],
    "balusterSectionM": 0.025,
    "balusterPitchM": 0.14
  },
  "materials": "Weathered timber structure and closed indigo paneled balcony doors. No colored-glass upper heads, rug or canopy.",
  "clearances": {
    "lowestGeometryAboveGroundM": 3.06,
    "projectedXRangeM": [
      52.45,
      53.18
    ],
    "protectedRouteEastEdgeX": 51.75,
    "horizontalGapToProtectedRouteM": 0.7,
    "clearMasonryAtHouseEndsM": 5.8,
    "upperDoorHeadBelowCeilingM": 0.73
  },
  "gameplay": "Nonplayable render-only assembly; closed upper doors, no new access/collider/route. Actual triangle clearance and protected silhouette check remain required.",
  "detail": "CF-R4-BALCONY",
  "materialId": "ph_bz04_weathered_brown_planks",
  "bbox": {
    "min": [
      52.45,
      53.8,
      3.06
    ],
    "max": [
      53.18,
      56.2,
      4.65
    ]
  },
  "servedOpening": "dd-e-L1-W2"
}
```

## Site, protected faces, and parcels

### `DYERS_DOGLEG` · `north`

Quiet background: open x=46..53.

Protected wall interval: **46..53 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 46..53 | **ZERO BUILD protected opening** | NORTH_COURT |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `DYERS_DOGLEG` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **48..62 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 48..62 | collider-backed solid | COLLIDER_WALL_125 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `dd-e` | 48..62 | (53, 48, 56.6, 62) | Balcony is the house focus; use one rectangular double-leaf balcony door, not a colored-glass paired-window motif. Side room windows remain plain and aligned. | 7.2 | 3.6 | `ph_bz04_beige_wall_002` | slab 7.2..7.38; parapet 7.83; cap 7.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `dd-e-ENTRANCE` | `dd-e` | door | 55 | 0 / 2.65 | 1.6 × 2.65 × 0.38 | 53 | `SD-05`; Closed timber double leaves with a restrained carved fixed upper head | Principal family-house entrance centered below its private upper balcony |
| `dd-e-L1-W1` | `dd-e` | window | 50.1 | 4.55 / 6.15 | 1.1 × 1.6 × 0.34 | 53 | `SD-07`; closed double paneled timber shutters | family sleeping rooms; daylight on its measured room axis |
| `dd-e-L1-W2` | `dd-e` | door | 55 | 3.6 / 6.25 | 1.5 × 2.65 × 0.4 | 53 | `SD-07`; Closed 2-panel timber balcony door | Closed upper sitting-room balcony doors on the same axis as the principal entrance |
| `dd-e-L1-W3` | `dd-e` | window | 59.9 | 4.55 / 6.15 | 1.1 × 1.6 × 0.34 | 53 | `SD-07`; closed double paneled timber shutters | family sleeping rooms; daylight on its measured room axis |
| `dd-e-GROUND-ROOM-0` | `dd-e` | window | 50.1 | 0.95 / 2.55 | 0.95 × 1.6 × 0.22 | 53 | `SD-07`; closed paneled timber shutter | ground family room |
| `dd-e-GROUND-ROOM-2` | `dd-e` | window | 59.9 | 0.95 / 2.55 | 0.95 × 1.6 × 0.22 | 53 | `SD-07`; closed paneled timber shutter | ground family room |

### `DYERS_DOGLEG` · `south`

Quiet background: open x=46..53.

Protected wall interval: **46..53 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 46..53 | **ZERO BUILD protected opening** | COVERED_SOUK |

No target parcel is scheduled on this face. Preserve the baseline condition above.

### `DYERS_DOGLEG` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **48..62 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 48..62 | collider-backed solid | COLLIDER_WALL_120 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `dd-w` | 48..62 | (42.4, 48, 46, 62) | The unequal broad and service light pair at 51.85 and 58.85 has balanced outer margins in the 48..62 facade. The single full-width drying-loft vent centers independently at 55. Ground access remains unchanged. | 9.9 | 3.6 | `ph_bz04_sandstone_blocks_06` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `DD_WORKS_RECESS` | `dd-w` | shop | 52.2 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 46 | `SD-08`; locked half-height timber lattice gate and opaque recess back; side-door clear 0.8 m → `dd-w-STAFF-DOOR` | dye workfront |
| `dd-w-STAFF-DOOR` | `dd-w` | door | 59.2 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 46 | `SD-05`; closed timber leaves | staff stair and store entrance |
| `dd-w-L1-W1` | `dd-w` | window | 51.85 | 4.3 / 5.95 | 2.3 × 1.65 × 0.38 | 46 | `SD-07`; Closed 2-panel timber shutters | sample sorting room; daylight on its measured room axis |
| `dd-w-L1-W2` | `dd-w` | window | 58.85 | 4.3 / 5.95 | 0.9 × 1.65 × 0.38 | 46 | `SD-07`; Closed 2-panel timber shutters | sample sorting room; daylight on its measured room axis |
| `dd-w-LOFT-VENT` | `dd-w` | vent | 55 | 8.65 / 9.35 | 1.8 × 0.7 × 0.3 | 46 | `SD-07`; closed timber louver | ventilated drying loft; high ventilation |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `DYERS_DOGLEG` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'DYERS_DOGLEG-CLEAR', 'x': 47.25, 'y': 48, 'w': 4.5, 'h': 14, 'heightM': 2.2, 'floorSource': 'DYERS_DOGLEG'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `DYERS_DOGLEG` | `G_DD_WORKS_RECESS` / `AG-DYE` | west/dd-w/DD_WORKS_RECESS | (44.1, 50.94, 0.04) → (46.28, 53.46, 2.65) | Build the named parts as sample drying composition for this tenancy. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `DYERS_DOGLEG` | `DYERS_DOGLEG-CLEAR` | **CLEAR ROUTE** | (47.25, 48) → (51.75, 62) | Protected empty region | Do not place geometry |

### Fixed composition `G_DD_WORKS_RECESS`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `left-post` | timber-member / `CF-TIMBER` | [-0.86, -0.3, 0] / [-0.79, -0.23, 2.36] | `ph_bz04_worn_planks` | recess deck |
| `right-post` | timber-member / `CF-TIMBER` | [0.79, -0.3, 0] / [0.86, -0.23, 2.36] | `ph_bz04_worn_planks` | recess deck |
| `drying-rail` | timber-member / `CF-TIMBER` | [-0.86, -0.3, 2.27] / [0.86, -0.23, 2.36] | `ph_bz04_worn_planks` | left-post and right-post |
| `sample-1` | hanging-cloth / `CF-CLOTH` | [-0.74, -0.285, 1.35] / [-0.38000000000000006, -0.255, 2.25] | `ph_bz04_fine_linen`; albedo #66778c | two ties to drying-rail |
| `sample-2` | hanging-cloth / `CF-CLOTH` | [-0.2, -0.285, 0.95] / [0.2, -0.255, 2.25] | `ph_bz04_fine_linen`; albedo #ba8d75 | two ties to drying-rail |
| `sample-3` | hanging-cloth / `CF-CLOTH` | [0.41999999999999993, -0.285, 1.2] / [0.72, -0.255, 2.25] | `ph_bz04_fine_linen`; albedo #d6c9b2 | two ties to drying-rail |
| `folding-bench` | grounded-timber-bench / `CF-FURNITURE` | [-0.82, -0.4, 0] / [0.82, 0.15, 0.48] | `ph_bz04_worn_planks` | recess deck |
| `closed-work-gate` | locked-timber-lattice-gate / `CF-TIMBER` | [-1.25, 0.18, 0] / [1.25, 0.23, 1.15] | `ph_bz04_worn_planks` | opening jambs: two hinge straps and one locked latch |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| — | — | — | No fixtures scheduled | — | — |

| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `DYERS_DOGLEG` | 48000 | 10 | 12 | 7 |

Section origin (design coordinates): `{'x': 46, 'y': 48, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-3.8000000000000043, -0.02, -0.20000000000000284], 'max': [10.800000000000004, 9.92, 14.200000000000003]}`.
Required bindings: `bz04_court_limestone_flags_01`, `bz04_levantine_rug_project_original`, `ph_bz04_beige_wall_002`, `ph_bz04_fine_linen`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `DYERS_DOGLEG-travel-reverse` | `DYERS_DOGLEG` | (49.5, 61.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `DYERS_DOGLEG-travel-forward` | `DYERS_DOGLEG` | (49.5, 48.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `DYERS_DOGLEG-east-dd-e-s1-base` | `DYERS_DOGLEG` | (46.35, 51.5, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `DYERS_DOGLEG-east-dd-e-s1-upper` | `DYERS_DOGLEG` | (46.35, 51.5, 1.7) | 270° / 40.502° / 75° | upper facade, parapet and roof-step coverage |
| `DYERS_DOGLEG-east-dd-e-s2-base` | `DYERS_DOGLEG` | (46.35, 58.5, 1.7) | 270° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `DYERS_DOGLEG-east-dd-e-s2-upper` | `DYERS_DOGLEG` | (46.35, 58.5, 1.7) | 270° / 40.502° / 75° | upper facade, parapet and roof-step coverage |
| `DYERS_DOGLEG-west-dd-w-s1-base` | `DYERS_DOGLEG` | (52.65, 51.5, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `DYERS_DOGLEG-west-dd-w-s1-upper` | `DYERS_DOGLEG` | (52.65, 51.5, 1.7) | 90° / 51.566° / 75° | upper facade, parapet and roof-step coverage |
| `DYERS_DOGLEG-west-dd-w-s2-base` | `DYERS_DOGLEG` | (52.65, 58.5, 1.7) | 90° / 4.3° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `DYERS_DOGLEG-west-dd-w-s2-upper` | `DYERS_DOGLEG` | (52.65, 58.5, 1.7) | 90° / 51.566° / 75° | upper facade, parapet and roof-step coverage |
| `DYERS_DOGLEG-R3-craft-detail` | `DYERS_DOGLEG` | (49.5, 52.2, 1.7) | 90° / 0° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: DD_WORKS_RECESS |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `DYERS_DOGLEG` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `DYERS_DOGLEG` cells: `ROOF_CELL_048`, `ROOF_CELL_049`, `ROOF_CELL_050`.
- `DYERS_DOGLEG` bundles: `ROOF_BUNDLE_UNIT_DYERS_DOGLEG`.
- `DYERS_DOGLEG` interfaces: `ROOF_INTERFACE_ROOF_STEP_046`, `ROOF_INTERFACE_ROOF_STEP_053`, `ROOF_INTERFACE_ROOF_STEP_054`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |
|---|---|---|---|---|
| `BG-13` | `DYERS_DOGLEG` | shared-environment | (59, 53, 0) → (64, 61, 9.8) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_L34_DOGLEG_DYERS_LINE_L34_DOGLEG_DYERS_LINE_01` | `DYERS_DOGLEG` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_DOGLEG_VAT_02_L34_DOGLEG_VAT_02` | `DYERS_DOGLEG` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_DOGLEG_VAT_L34_DOGLEG_VAT_01` | `DYERS_DOGLEG` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_DOGLEG_WALL_RACK_L34_DOGLEG_WALL_RACK_01` | `DYERS_DOGLEG` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_DOGLEG_WORKSTATION_L34_DOGLEG_WORKSTATION_01` | `DYERS_DOGLEG` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `BOUNDARY_DYERS_DOGLEG_north` | `DYERS_DOGLEG` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_DYERS_DOGLEG_east` | `DYERS_DOGLEG` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_DYERS_DOGLEG_south` | `DYERS_DOGLEG` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | retain_open | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_DYERS_DOGLEG_west` | `DYERS_DOGLEG` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [DYERS_DOGLEG dimensioned plan](drawings/dyers_dogleg-plan.svg), [DYERS_DOGLEG four elevations](drawings/dyers_dogleg-elevations.svg), and [DYERS_DOGLEG roof axonometric](drawings/dyers_dogleg-axon.svg)
- [Master plan](drawings/master-plan.svg)
