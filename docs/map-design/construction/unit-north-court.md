# BZ-04 / R7 north court facade-centered upper openings · North Court

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `NORTH_COURT`

Hammam entrance and a coherent neighboring household. Two upper domestic stacks, fewer drying vents and an actual finishing workfront.

Primary focus: Hammam entrance pavilion and drying workfront. The bath entrance has a proportional portal and restrained inscription; the compound’s work/loft openings differ from the nearby family house..

## Architecture and craftsmanship

**Primary:** Hammam entrance and a coherent neighboring household

**Supporting:** Two upper domestic stacks, fewer drying vents and an actual finishing workfront

**Quiet fields and limits:** Do not imply a full bathhouse in the small pavilion, add a dome, or decorate every north wall.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `nc-n` / `BLD_NORTH_DYERS_COMPOUND` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Compound return serves one drying chamber; use a paired workroom row and one centered loft louver rather than the repeated three-by-two module. |
| `nc-eh` / `BLD_NORTH_EAST_HOUSE` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | North house does not need another pointed center pair. Two equal upper domestic stacks flank the principal entrance; leave a quiet central pier upstairs. Ground side windows remain smaller privacy openings. |
| `nc-ey` / `BLD_NORTH_DYERS_COMPOUND` | building | `ph_bz04_painted_plaster_warm`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | The unequal workroom and service light pair at 73.6 and 78.1 has balanced outer margins in the 71..80 facade. The single full-width drying-loft vent centers independently at 75.5. Ground access remains unchanged. |
| `nc-s` / `BLD_DOGLEG_WEST_ANNEX` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Annex return is one room width. One broad workroom opening and one stacked high louver replace the unnecessary two-by-two mini-grid. |
| `nc-ws` / `BLD_HAMMAM` | building | `ph_bz04_sandstone_blocks_05`; civic-stepped; CF-ENVELOPE / CF-JOINT | North Court hammam - principal frontage |
| `nc-wn` / `BLD_HAMMAM_STORES` | building | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Hammam service house - principal frontage |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_NC_DRY_RECESS` | domestic dye composition for this tenancy | 6 / CF-CERAMIC, CF-CLOTH, CF-DYE-VESSEL, CF-FURNITURE, CF-STONE, CF-TIMBER | Build the named parts as domestic dye composition for this tenancy. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_DYERS_DOGLEG` | `cs-n-part-2`, `dd-e`, `dd-w`, `nc-s` | `cs-n-part-2`, `dd-e`, `dd-w` |
| `ROOF_BUNDLE_UNIT_NORTH_COURT` | `leu-n-part-2`, `leu-s-part-3`, `lne-e`, `lne-s`, `nc-eh`, `nc-ey`, `nc-n`, `nc-wn`, `nc-ws` | `leu-n-part-2`, `leu-s-part-3`, `lne-e`, `lne-s` |

**Required craft recipes:** CF-CERAMIC, CF-CLOTH, CF-DYE-VESSEL, CF-ENVELOPE, CF-FLOOR, CF-FURNITURE, CF-INSCRIPTION, CF-JOINT, CF-OPEN, CF-R4-GLASS, CF-R4-PORTAL, CF-STONE, CF-TIMBER

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `NORTH_COURT` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **41..53 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 46..53 | collider-backed solid | COLLIDER_WALL_039 |
| 41..46 | **ZERO BUILD protected opening** | LINK_NORTH_EAST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `nc-n` | 46..53 | (46, 80, 56.6, 83.6) | Compound return serves one drying chamber; use a paired workroom row and one centered loft louver rather than the repeated three-by-two module. | 9.9 | 3.6 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `nc-n-L1-W1` | `nc-n` | window | 47.8 | 4.35 / 5.8 | 1.45 × 1.45 × 0.38 | 80 | `SD-07`; Closed 2-panel timber shutters | broad sorting workroom; daylight on its measured room axis |
| `nc-n-L1-W3` | `nc-n` | window | 51.2 | 4.35 / 5.8 | 1.45 × 1.45 × 0.38 | 80 | `SD-07`; Closed 2-panel timber shutters | broad sorting workroom; daylight on its measured room axis |
| `nc-n-L2-W2` | `nc-n` | vent | 49.5 | 8.7 / 9.4 | 2 × 0.7 × 0.3 | 80 | `SD-07`; closed timber louver | high-ventilated drying loft; high ventilation |

### `NORTH_COURT` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **62..80 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 62..80 | collider-backed solid | COLLIDER_WALL_126 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `nc-eh` | 62..71 | (53, 62, 56.6, 71) | North house does not need another pointed center pair. Two equal upper domestic stacks flank the principal entrance; leave a quiet central pier upstairs. Ground side windows remain smaller privacy openings. | 9.9 | 3.6 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `nc-ey` | 71..80 | (53, 71, 56.6, 80) | The unequal workroom and service light pair at 73.6 and 78.1 has balanced outer margins in the 71..80 facade. The single full-width drying-loft vent centers independently at 75.5. Ground access remains unchanged. | 9.9 | 3.6 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `nc-eh-ENTRANCE` | `nc-eh` | door | 66.5 | 0 / 2.55 | 1.4 × 2.55 × 0.22 | 53 | `SD-05`; closed timber leaves; architecturalDetail: `{"profile":"painted-domestic","surroundWidthM":0.16,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | principal entrance and internal stair |
| `nc-eh-L1-W1` | `nc-eh` | window | 63.7 | 4.25 / 5.85 | 1.3 × 1.6 × 0.34 | 53 | `SD-07`; Closed 2-panel timber shutters | sitting rooms; daylight on its measured room axis |
| `nc-eh-L1-W3` | `nc-eh` | window | 69.3 | 4.25 / 5.85 | 1.3 × 1.6 × 0.34 | 53 | `SD-07`; Closed 2-panel timber shutters | sitting rooms; daylight on its measured room axis |
| `nc-eh-L2-W1` | `nc-eh` | window | 63.7 | 7.55 / 9.15 | 1.3 × 1.6 × 0.34 | 53 | `SD-07`; Closed 2-panel timber shutters | bedrooms; daylight on its measured room axis |
| `nc-eh-L2-W3` | `nc-eh` | window | 69.3 | 7.55 / 9.15 | 1.3 × 1.6 × 0.34 | 53 | `SD-07`; Closed 2-panel timber shutters | bedrooms; daylight on its measured room axis |
| `nc-eh-GROUND-ROOM-0` | `nc-eh` | window | 63.7 | 0.95 / 2.55 | 0.95 × 1.6 × 0.22 | 53 | `SD-07`; Closed 2-panel timber shutters | ground family room |
| `nc-eh-GROUND-ROOM-2` | `nc-eh` | window | 69.3 | 0.95 / 2.55 | 0.95 × 1.6 × 0.22 | 53 | `SD-07`; Closed 2-panel timber shutters | ground family room |
| `NC_DRY_RECESS` | `nc-ey` | shop | 73.7 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 53 | `SD-08`; locked half-height timber lattice gate and opaque recess back; side-door clear 0.8 m → `nc-ey-STAFF-DOOR` | dye workfront |
| `nc-ey-STAFF-DOOR` | `nc-ey` | door | 78.2 | 0 / 2.55 | 1.1 × 2.55 × 0.22 | 53 | `SD-05`; closed timber leaves | staff stair and store entrance |
| `nc-ey-L1-W1` | `nc-ey` | window | 73.6 | 4.35 / 5.8 | 2.3 × 1.45 × 0.38 | 53 | `SD-07`; Closed 2-panel timber shutters | broad sorting workroom; daylight on its measured room axis |
| `nc-ey-L1-W2` | `nc-ey` | window | 78.1 | 4.35 / 5.8 | 0.9 × 1.45 × 0.38 | 53 | `SD-07`; Closed 2-panel timber shutters | broad sorting workroom; daylight on its measured room axis |
| `nc-ey-LOFT-VENT` | `nc-ey` | vent | 75.5 | 8.7 / 9.4 | 2 × 0.7 × 0.3 | 53 | `SD-07`; closed timber louver | high-ventilated drying loft; high ventilation |

### `NORTH_COURT` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **41..53 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 41..46 | collider-backed solid | COLLIDER_WALL_026 |
| 46..53 | **ZERO BUILD protected opening** | DYERS_DOGLEG |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `nc-s` | 41..46 | (41, 61.2, 46, 62) | Annex return is one room width. One broad workroom opening and one stacked high louver replace the unnecessary two-by-two mini-grid. | 9.9 | 0.8 | `ph_bz04_sandstone_blocks_06` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `nc-s-L1-W1` | `nc-s` | window | 43.5 | 4.3 / 5.95 | 1.8 × 1.65 × 0.38 | 62 | `SD-07`; Closed 2-panel timber shutters | sample sorting room; daylight on its measured room axis |
| `nc-s-L2-W1` | `nc-s` | vent | 43.5 | 8.65 / 9.35 | 1.5 × 0.7 × 0.3 | 62 | `SD-07`; closed timber louver | ventilated drying loft; high ventilation |

### `NORTH_COURT` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **62..80 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 62..67 | collider-backed solid | COLLIDER_WALL_117 |
| 72..76 | collider-backed solid | COLLIDER_WALL_118 |
| 67..72 | **ZERO BUILD protected opening** | LINK_EAST_UPPER |
| 76..80 | **ZERO BUILD protected opening** | LINK_NORTH_EAST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `nc-ws` | 62..67 | (38, 62, 41, 67) | North Court hammam - principal frontage | 9.8 | 3 | `ph_bz04_sandstone_blocks_05` | slab 9.8..9.98; parapet 10.43; cap 10.53; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `nc-wn` | 72..76 | (37.5, 72, 41, 76) | Hammam service house - principal frontage | 9.9 | 3.5 | `ph_bz04_sandstone_blocks_05` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `nc-ws-ENTRANCE` | `nc-ws` | door | 64.5 | 0 / 3.3 | 2.1 × 3.3 × 0.38 | 41 | `SD-11+SD-05`; Closed timber lower leaves and fixed colored-glass upper lights; architecturalDetail: `{"profile":"dressed-stone-portal","surroundWidthM":0.18,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false,"frameColorSrgb":"#c6b391","frameMaterialId":"ph_bz04_stone_trim_sandstone"}`; glazingProfile: `{"fromZM":2.3,"pattern":"plaster-tracery","paletteSrgb":["#d7ceb0","#ad8650","#6d8c87","#6c8096"],"paletteSequence":[0,1,0,2,0,3],"columnsPerLight":3,"rows":1,"webM":0.045,"glassThicknessM":0.006,"backing":"Opaque dark matte receiver at the scheduled recess back; no view through, emission or transmitted light.","materialProfile":"fixedGlass"}` | Principal hammam pavilion entrance |
| `nc-ws-L1-W1` | `nc-ws` | window | 63.35 | 6.15 / 7.3 | 0.8 × 1.15 × 0.3 | 41 | `SD-07`; closed timber louver | linen and ventilation room; daylight on its measured room axis |
| `nc-ws-L1-W2` | `nc-ws` | window | 65.65 | 6.15 / 7.3 | 0.8 × 1.15 × 0.3 | 41 | `SD-07`; closed timber louver | linen and ventilation room; daylight on its measured room axis |
| `nc-wn-ENTRANCE` | `nc-wn` | door | 74 | 0 / 2.7 | 1.6 × 2.7 × 0.35 | 41 | `SD-05`; closed double timber loading leaves | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `nc-wn-L1-W1` | `nc-wn` | window | 74 | 4.35 / 5.8 | 1.45 × 1.45 × 0.38 | 41 | `SD-07`; closed timber louver | linen sorting; daylight on its measured room axis |
| `nc-wn-L2-W1` | `nc-wn` | vent | 74 | 8.73 / 9.38 | 1.25 × 0.65 × 0.3 | 41 | `SD-07`; closed timber louver | high dry storage; high ventilation |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `NORTH_COURT` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'NORTH_COURT-CLEAR', 'x': 44.75, 'y': 62, 'w': 4.5, 'h': 18, 'heightM': 2.2, 'floorSource': 'NORTH_COURT'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `NORTH_COURT` | `G_NC_DRY_RECESS` / `AG-DYE` | east/nc-ey/NC_DRY_RECESS | (52.72, 72.44, 0.04) → (54.9, 74.96, 2.65) | Build the named parts as domestic dye composition for this tenancy. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `NORTH_COURT` | `NORTH_COURT-CLEAR` | **CLEAR ROUTE** | (44.75, 62) → (49.25, 80) | Protected empty region | Do not place geometry |

### Fixed composition `G_NC_DRY_RECESS`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `vessel-plinth` | stone-plinth / `CF-STONE` | [-0.85, -0.48, 0] / [0.2, 0.14, 0.13] | `ph_bz04_stone_trim_sandstone` | recess deck |
| `dye-vessel` | rounded-ceramic-vessel / `CF-DYE-VESSEL` | [-0.75, -0.42, 0.13] / [-0.18, 0.12, 0.84] | `bz04_ceramic_project_original`; albedo #d6c9b2 | vessel-plinth |
| `lidded-vessel` | lidded-ceramic-vessel / `CF-CERAMIC` | [-0.1, -0.38, 0.13] / [0.2, -0.08, 0.57] | `bz04_ceramic_project_original`; albedo #d6c9b2 | vessel-plinth |
| `side-table` | grounded-timber-table / `CF-FURNITURE` | [0.3, -0.4, 0] / [0.83, 0.15, 0.88] | `ph_bz04_worn_planks` | recess deck |
| `folded-work` | folded-cloth / `CF-CLOTH` | [0.38, -0.32, 0.88] / [0.75, 0.1, 1.02] | `ph_bz04_fine_linen` | side-table |
| `closed-work-gate` | locked-timber-lattice-gate / `CF-TIMBER` | [-1.25, 0.18, 0] / [1.25, 0.23, 1.15] | `ph_bz04_worn_planks` | opening jambs: two hinge straps and one locked latch |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| — | — | — | No fixtures scheduled | — | — |

| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `NORTH_COURT` | 48000 | 12 | 14 | 7 |

Section origin (design coordinates): `{'x': 41, 'y': 62, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-3.700000000000003, -0.02, -1.0], 'max': [15.800000000000004, 9.92, 21.799999999999997]}`.
Required bindings: `bz04_ceramic_project_original`, `bz04_court_limestone_flags_01`, `ph_bz04_beige_wall_002`, `ph_bz04_fine_linen`, `ph_bz04_painted_plaster_warm`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `NORTH_COURT-travel-reverse` | `NORTH_COURT` | (47, 79.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `NORTH_COURT-travel-forward` | `NORTH_COURT` | (47, 62.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `NORTH_COURT-north-nc-n-s1-base` | `NORTH_COURT` | (49.5, 62.35, 1.7) | 180° / 1.623° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `NORTH_COURT-east-nc-eh_nc-ey-s1-base` | `NORTH_COURT` | (41.35, 71, 1.7) | 270° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `NORTH_COURT-south-nc-s-s1-base` | `NORTH_COURT` | (43.5, 79.65, 1.7) | 0° / 1.623° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `NORTH_COURT-west-nc-ws-s1-base` | `NORTH_COURT` | (52.65, 64.5, 1.7) | 90° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `NORTH_COURT-west-nc-wn-s1-base` | `NORTH_COURT` | (52.65, 74, 1.7) | 90° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `NORTH_COURT-R3-craft-detail` | `NORTH_COURT` | (44.5, 64.5, 1.7) | 90° / 12.875° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: nc-ws-ENTRANCE |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `NORTH_COURT` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `NORTH_COURT` cells: `ROOF_CELL_049`, `ROOF_CELL_056`, `ROOF_CELL_057`, `ROOF_CELL_060`, `ROOF_CELL_061`, `ROOF_CELL_062`.
- `NORTH_COURT` bundles: `ROOF_BUNDLE_UNIT_DYERS_DOGLEG`, `ROOF_BUNDLE_UNIT_NORTH_COURT`.
- `NORTH_COURT` interfaces: `ROOF_INTERFACE_ROOF_SEAM_013`, `ROOF_INTERFACE_ROOF_SEAM_018`, `ROOF_INTERFACE_ROOF_SEAM_020`, `ROOF_INTERFACE_ROOF_STEP_039`, `ROOF_INTERFACE_ROOF_STEP_050`, `ROOF_INTERFACE_ROOF_STEP_054`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_painted_plaster_warm` | `ph_painted_plaster_warm` | <span style="color:#d8c4a0">■</span> `#d8c4a0` | 1.8 / 0.3 / 0.92 / 1 |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | <span style="color:#bda985">■</span> `#bda985` | 2 / 0.45 / 0.94 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |
|---|---|---|---|---|
| `BG-14` | `NORTH_COURT` | shared-environment | (60, 73, 0) → (66, 82, 11.1) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_L34_NORTH_PLANTER_EAST_L34_NORTH_PLANTER_EAST` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_NORTH_WORKSTATION_02_L34_NORTH_WORKSTATION_02` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L3R0_NORTH_DYERS_LINE_L3R0_NORTH_DYERS_LINE_01` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L3R0_NORTH_DYERS_WALL_RACK_L3R0_NORTH_DYERS_BAY_01` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L3R0_NORTH_EXIT_SIGN_L3R0_NORTH_EXIT_SIGN_01` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L3R0_NORTH_RUG_L3R0_NORTH_DYERS_BAY_01` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L3R0_NORTH_STALL_L3R0_NORTH_DYERS_BAY_01` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L3R0_NORTH_VAT_EAST_L3R0_NORTH_DYERS_BAY_01` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L3R0_NORTH_VAT_WEST_L34_NORTH_DYERS_BAY_02` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L3R0_NORTH_VESSEL_L34_NORTH_DYERS_BAY_02` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_NORTH_COVER_COVER_NORTH_01` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_NORTH_PALM_PALM_NORTH_01` | `NORTH_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_NORTH_COURT_EAST_N_BAY_NICHE_N` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_EAST_N_BAY_NICHE_S` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_EAST_N_MASSING` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_EAST_S_BAY_DOOR` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_EAST_S_BAY_WINDOW_N` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_EAST_S_BAY_WINDOW_S` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_EAST_S_MASSING` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_NORTH_BAY_01` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_NORTH_BAY_02` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_NORTH_MASSING` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_SOUTH_BAY_01` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_SOUTH_MASSING` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_WEST_GROUND_01` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_WEST_MASSING` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_GROUND_01` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_MASSING` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_WEST_SOUTH_STORY_1_WINDOW_01` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_NORTH_COURT_WEST_STORY_1_WINDOW_01` | `NORTH_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_NORTH_COURT_north` | `NORTH_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_NORTH_COURT_east` | `NORTH_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_NORTH_COURT_south` | `NORTH_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_NORTH_COURT_west` | `NORTH_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [NORTH_COURT dimensioned plan](drawings/north_court-plan.svg), [NORTH_COURT four elevations](drawings/north_court-elevations.svg), and [NORTH_COURT roof axonometric](drawings/north_court-axon.svg)
- [Master plan](drawings/master-plan.svg)
