# BZ-04 / R7 caravan court facade-centered upper openings · Caravan Court

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `CARAVAN_COURT`

Receiving and packing stores with a legible closed delivery entrance. The rejected rear palm is removed; every existing maneuvering area and route mouth stays clear.

Primary focus: Wide receiving bay and existing packing workfront. Low storehouse proportions, high lights and a coherent loading lintel establish use; garden wall remains an enclosure..

## Architecture and craftsmanship

**Primary:** A grounded receiving entrance and lower store roofline

**Supporting:** Packing activity and the enclosed court edges; no palm or new planting obstacle

**Quiet fields and limits:** Keep the full courtyard breathing room and existing cover. No decorative warehouse windows or freestanding carts.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `cc-n` / `ASM_CARAVAN_TRANSITIONS` | boundary-assembly | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Caravan transition returns enclosure return |
| `cc-es` / `ASM_CARAVAN_GARDEN_WALLS` | boundary-assembly | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Caravan garden enclosure enclosure return |
| `cc-es-part-2` / `BLD_MADRASA_SERVICE` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Closed secondary face of Guildhall service house; its entrance and floor hierarchy are defined on the principal elevation |
| `cc-en` / `BLD_MADRASA` | building | `ph_bz04_sandstone_blocks_05`; civic-stepped; CF-ENVELOPE / CF-JOINT | Guildhall rear shares the paired upper rooms of the Fountain front; its central hall high light stays plain timber. |
| `cc-s` / `BLD_SPICE_SERVICE_COMPOUND` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Closed secondary face of Spice south service compound; its entrance and floor hierarchy are defined on the principal elevation |
| `cc-s-part-2` / `ASM_CARAVAN_TRANSITIONS` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Caravan transition returns enclosure return |
| `cc-w` / `BLD_CARAVAN_STORES` | building | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | The high-light pair at 34.5 and 43.5 centers on 39 across the continuous 30..48 facade. The receiving door and packing workfront retain their access positions. |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_CC_PACK_RECESS` | packing desk composition for this tenancy | 7 / CF-FURNITURE, CF-ROLLED-CLOTH, CF-TIMBER | Build the named parts as packing desk composition for this tenancy. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_CARAVAN_COURT` | `cc-es`, `cc-s-part-2`, `cc-w` | none |
| `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cc-en`, `cc-es-part-2`, `cs-wn`, `cs-ws`, `lem-n`, `lem-s`, `lwm-n`, `lwm-s`, `tr-s` | `F_E_HOUSE`, `F_E_LOGGIA`, `F_W_HALL`, `F_W_SERVICE`, `cs-wn`, `cs-ws`, `lem-n`, `lem-s`, `lwm-n`, `lwm-s`, `tr-s` |
| `ROOF_BUNDLE_UNIT_SERVICE_SOUTH` | `cc-s`, `lsw-n`, `ss-e`, `ss-s`, `ss-w` | `lsw-n`, `ss-e`, `ss-s`, `ss-w` |

**Required craft recipes:** CF-ENVELOPE, CF-FLOOR, CF-FURNITURE, CF-JOINT, CF-OPEN, CF-R4-PORTAL, CF-ROLLED-CLOTH, CF-TIMBER

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `CARAVAN_COURT` · `north`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **3..15 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 10..11 | collider-backed solid | COLLIDER_WALL_022 |
| 3..10 | **ZERO BUILD protected opening** | SERVICE_NORTH |
| 11..15 | **ZERO BUILD protected opening** | TEA_RAMP |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `cc-n` | 10..11 | (10, 48, 11, 48.5) | Caravan transition returns enclosure return | 4.5 | 0.5 | `ph_bz04_plastered_wall` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `CARAVAN_COURT` · `east`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **30..48 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 30..36 | collider-backed solid | COLLIDER_WALL_074 |
| 41..48 | collider-backed solid | COLLIDER_WALL_075 |
| 36..41 | **ZERO BUILD protected opening** | LINK_WEST_MID |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `cc-es` | 30..32 | (15, 30, 15.6, 32) | Caravan garden enclosure enclosure return | 4.9 | 0.6 | `ph_bz04_plastered_wall` | slab 4.9..5.02; parapet 5.02; cap 5.02; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `cc-es-part-2` | 32..36 | (15, 32, 15.6, 36) | Closed secondary face of Guildhall service house; its entrance and floor hierarchy are defined on the principal elevation | 9.9 | 0.6 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `cc-en` | 41..48 | (15, 41, 15.6, 48) | Guildhall rear shares the paired upper rooms of the Fountain front; its central hall high light stays plain timber. | 11.4 | 0.6 | `ph_bz04_sandstone_blocks_05` | slab 11.4..11.58; parapet 12.03; cap 12.13; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `cc-es-part-2-F_W_SERVICE-L1-W1` | `cc-es-part-2` | window | 34 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 15 | `SD-07`; closed double paneled timber shutters | caretaker room; daylight on its measured room axis |
| `cc-es-part-2-F_W_SERVICE-L2-W1` | `cc-es-part-2` | vent | 34 | 8.73 / 9.38 | 1.25 × 0.65 × 0.3 | 15 | `SD-07`; closed timber louver | dry guild supplies; high ventilation |
| `cc-en-F_W_HALL-HIGH-LIGHT` | `cc-en` | vent | 44.5 | 5.75 / 7.05 | 2.15 × 1.3 × 0.24 | 15 | `SD-07`; closed vertical slat timber screen | Plain high ventilation on the hall service side |
| `cc-en-F_W_HALL-L1-W1` | `cc-en` | window | 42.15 | 8.45 / 10.15 | 1.1 × 1.7 × 0.4 | 15 | `SD-07`; closed double paneled timber shutters | registry and guild offices; daylight on its measured room axis |
| `cc-en-F_W_HALL-L1-W3` | `cc-en` | window | 46.85 | 8.45 / 10.15 | 1.1 × 1.7 × 0.4 | 15 | `SD-07`; closed double paneled timber shutters | registry and guild offices; daylight on its measured room axis |

### `CARAVAN_COURT` · `south`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **3..15 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 10..15 | collider-backed solid | COLLIDER_WALL_013 |
| 3..10 | **ZERO BUILD protected opening** | SERVICE_SOUTH |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `cc-s` | 10..13.6 | (10, 29.5, 13.6, 30) | Closed secondary face of Spice south service compound; its entrance and floor hierarchy are defined on the principal elevation | 4.9 | 0.5 | `ph_bz04_plastered_wall` | slab 4.9..5.08; parapet 5.53; cap 5.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `cc-s-part-2` | 13.6..15 | (13.6, 29.5, 15, 30) | Caravan transition returns enclosure return | 4.5 | 0.5 | `ph_bz04_plastered_wall` | slab 4.5..4.62; parapet 4.62; cap 4.62; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| — | — | — | — | — | — | — | — | No openings scheduled |

### `CARAVAN_COURT` · `west`

Quiet background: Keep route mouths and lower wall fields legible; detail belongs only to the listed openings and groups..

Protected wall interval: **30..48 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 30..48 | collider-backed solid | COLLIDER_WALL_048 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `cc-w` | 30..48 | (-0.6, 30, 3, 48) | The high-light pair at 34.5 and 43.5 centers on 39 across the continuous 30..48 facade. The receiving door and packing workfront retain their access positions. | 4.8 | 3.6 | `ph_bz04_sandstone_blocks_06` | slab 4.8..4.98; parapet 5.43; cap 5.53; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `CC_PACK_RECESS` | `cc-w` | shop | 44.4 | 0 / 2.75 | 2.6 × 2.75 × 1.9 | 3 | `SD-08`; closed backed shopfront with a continuous counter; side-door clear 0.8 m → `cc-w-STAFF-DOOR` | pack workfront |
| `cc-w-STAFF-DOOR` | `cc-w` | door | 35.4 | 0 / 2.8 | 2.4 × 2.8 × 0.4 | 3 | `SD-05`; closed double timber loading leaves; architecturalDetail: `{"profile":"planked-receiving","surroundWidthM":0.18,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | Closed receiving/staff threshold serving the named storage bay; no new gameplay passage |
| `cc-w-CLERESTORY-1` | `cc-w` | vent | 34.5 | 3.55 / 4.25 | 1.35 × 0.7 × 0.22 | 3 | `SD-07`; closed timber louver | wide receiving bay and separate packing workfront daylight and ventilation |
| `cc-w-CLERESTORY-2` | `cc-w` | vent | 43.5 | 3.55 / 4.25 | 1.35 × 0.7 × 0.22 | 3 | `SD-07`; closed timber louver | wide receiving bay and separate packing workfront daylight and ventilation |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `CARAVAN_COURT` floor | `bz04_large_sandstone_blocks_01` | {'receiver': 'bz04_large_sandstone_blocks_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'CARAVAN_COURT-CLEAR', 'x': 6.75, 'y': 30, 'w': 4.5, 'h': 18, 'heightM': 2.2, 'floorSource': 'CARAVAN_COURT'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `CARAVAN_COURT` | `G_CC_PACK_RECESS` / `AG-PACK` | west/cc-w/CC_PACK_RECESS | (1.1, 43.14, 0.04) → (3.28, 45.66, 2.65) | Build the named parts as packing desk composition for this tenancy. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `CARAVAN_COURT` | `CARAVAN_COURT-CLEAR` | **CLEAR ROUTE** | (6.75, 30) → (11.25, 48) | Protected empty region | Do not place geometry |

### Fixed composition `G_CC_PACK_RECESS`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `left-trestle` | framed-timber-trestle / `CF-FURNITURE` | [-0.74, -0.4, 0] / [-0.64, 0.15, 0.82] | `ph_bz04_worn_planks` | recess deck |
| `right-trestle` | framed-timber-trestle / `CF-FURNITURE` | [0.64, -0.4, 0] / [0.74, 0.15, 0.82] | `ph_bz04_worn_planks` | recess deck |
| `worktop` | plank-worktop / `CF-TIMBER` | [-1.25, -0.55, 0.82] / [1.25, 0.15, 0.9] | `ph_bz04_worn_planks` | both trestles |
| `packing-box` | slatted-wood-box / `CF-FURNITURE` | [-0.74, -0.36, 0.9] / [-0.13, 0.12, 1.25] | `ph_bz04_worn_planks` | worktop |
| `wrapped-order` | tied-cloth-parcel / `CF-ROLLED-CLOTH` | [0.18, -0.3, 0.9] / [0.73, 0.12, 1.16] | `ph_bz04_fine_linen` | worktop |
| `empty-storage` | lidded-wood-box / `CF-FURNITURE` | [-0.4, -0.38, 0] / [0.4, 0.1, 0.5] | `ph_bz04_worn_planks` | recess deck |
| `counter-apron` | timber-apron / `CF-TIMBER` | [-1.25, 0.1, 0.65] / [1.25, 0.15, 0.82] | `ph_bz04_worn_planks` | worktop and grounded trestles |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| — | — | — | No fixtures scheduled | — | — |

| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `CARAVAN_COURT` | 48000 | 12 | 13 | 8 |

Section origin (design coordinates): `{'x': 3, 'y': 30, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-3.8, -0.02, -0.7], 'max': [12.8, 11.42, 18.7]}`.
Required bindings: `bz04_large_sandstone_blocks_01`, `ph_bz04_beige_wall_002`, `ph_bz04_dark_wood`, `ph_bz04_fine_linen`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `CARAVAN_COURT-travel-reverse` | `CARAVAN_COURT` | (9, 47.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `CARAVAN_COURT-travel-forward` | `CARAVAN_COURT` | (9, 30.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `CARAVAN_COURT-north-cc-n-s1-base` | `CARAVAN_COURT` | (10.5, 30.35, 1.7) | 180° / 0.78° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `CARAVAN_COURT-east-cc-es_cc-es-part-2-s1-base` | `CARAVAN_COURT` | (3.35, 33, 1.7) | 270° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `CARAVAN_COURT-east-cc-en-s1-base` | `CARAVAN_COURT` | (3.35, 44.5, 1.7) | 270° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `CARAVAN_COURT-east-cc-en-s1-upper` | `CARAVAN_COURT` | (3.35, 44.5, 1.7) | 270° / 40.3° / 75° | upper facade, parapet and roof-step coverage |
| `CARAVAN_COURT-south-cc-s_cc-s-part-2-s1-base` | `CARAVAN_COURT` | (12.5, 47.65, 1.7) | 0° / 1.623° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `CARAVAN_COURT-west-cc-w-s1-base` | `CARAVAN_COURT` | (14.65, 39, 1.7) | 90° / 2.458° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `CARAVAN_COURT-R3-craft-detail` | `CARAVAN_COURT` | (6.5, 35.4, 1.7) | 90° / 1.637° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: cc-w-STAFF-DOOR |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `CARAVAN_COURT` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `CARAVAN_COURT` cells: `ROOF_CELL_004`, `ROOF_CELL_005`, `ROOF_CELL_047`, `ROOF_CELL_058`, `ROOF_CELL_059`, `ROOF_CELL_070`.
- `CARAVAN_COURT` bundles: `ROOF_BUNDLE_UNIT_CARAVAN_COURT`, `ROOF_BUNDLE_UNIT_FOUNTAIN_COURT`, `ROOF_BUNDLE_UNIT_SERVICE_SOUTH`.
- `CARAVAN_COURT` interfaces: `ROOF_INTERFACE_ROOF_STEP_001`, `ROOF_INTERFACE_ROOF_STEP_002`, `ROOF_INTERFACE_ROOF_STEP_020`, `ROOF_INTERFACE_ROOF_STEP_021`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_plastered_wall` | `ph_plastered_wall` | <span style="color:#ddd0b3">■</span> `#ddd0b3` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | <span style="color:#bda985">■</span> `#bda985` | 2 / 0.45 / 0.94 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |
|---|---|---|---|---|
| `BG-08` | `CARAVAN_COURT` | shared-environment | (-7, 33, 0) → (-1, 42, 9.1) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_CARAVAN_COVER_COVER_CARAVAN_01` | `CARAVAN_COURT` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_CARAVAN_LOAD_NORTH_LMK_CARAVAN_DISTRICT` | `CARAVAN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_CARAVAN_LOAD_SHADE_CARAVAN_LOAD_SHADE_01` | `CARAVAN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_CARAVAN_LOAD_SOUTH_LMK_CARAVAN_DISTRICT` | `CARAVAN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_CARAVAN_LOAD_TOP_LMK_CARAVAN_DISTRICT` | `CARAVAN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_CARAVAN_CART_L34_CARAVAN_CART_01` | `CARAVAN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_L34_CARAVAN_PACK_LINE_L34_CARAVAN_PACK_LINE_01` | `CARAVAN_COURT` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_CARAVAN_COURT_EAST_NORTH_BAY_01` | `CARAVAN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_CARAVAN_COURT_EAST_NORTH_MASSING` | `CARAVAN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_CARAVAN_COURT_EAST_SOUTH_BAY_01` | `CARAVAN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_CARAVAN_COURT_EAST_SOUTH_MASSING` | `CARAVAN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_DOOR_N` | `CARAVAN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_DOOR_S` | `CARAVAN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_NICHE_AXIS` | `CARAVAN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_NICHE_N` | `CARAVAN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_CARAVAN_COURT_WEST_BAY_NICHE_S` | `CARAVAN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_CARAVAN_COURT_WEST_MASSING` | `CARAVAN_COURT` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_CARAVAN_COURT_north` | `CARAVAN_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_CARAVAN_COURT_east` | `CARAVAN_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_CARAVAN_COURT_south` | `CARAVAN_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_CARAVAN_COURT_west` | `CARAVAN_COURT` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [CARAVAN_COURT dimensioned plan](drawings/caravan_court-plan.svg), [CARAVAN_COURT four elevations](drawings/caravan_court-elevations.svg), and [CARAVAN_COURT roof axonometric](drawings/caravan_court-axon.svg)
- [Master plan](drawings/master-plan.svg)
