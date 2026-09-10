# BZ-04 / R7 spawn a courtyard facade-centered upper openings · Spawn A Courtyard

Controlled issue status: **PROPOSED**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.

Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.

## Design intent

### `SPAWN_A_COURTYARD`

Carved ceremonial entrance and a broad registry-room window. Plain related office windows, one central archive vent and the shaded household seat.

Primary focus: Ceremonial gate as the main address. The taller watch house, lower keeper house and existing family seat support arrival; east work bays read as a dye compound..

## Architecture and craftsmanship

**Primary:** Carved ceremonial entrance and a broad registry-room window

**Supporting:** Plain related office windows, one central archive vent and the shaded household seat

**Quiet fields and limits:** North return walls belong to the Spice buildings; the open north route remains the route, not a decorative gateway.

[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.

| Parcel / owner | Role | Envelope finish | Architectural limit |
|---|---|---|---|
| `A_NW_RETURN` / `BLD_A_SPICE_WEST` | building | `ph_bz04_sandstone_blocks_06`; single-drip; CF-ENVELOPE / CF-JOINT | Spice shop and household - coordinated wing or return |
| `A_NE_RETURN` / `BLD_A_SPICE_EAST` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Single return vent serves one sack sorting room; do not duplicate a front bay grid on this 6m return. One loft vent stacked over sorting vent. |
| `A_E_VATS` / `BLD_A_DYEWORKS` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | The compact upper preparation-room light at2.175 balances the broad drying-room light at4.9 across the complete0..8 facade; the ground field stays quiet. |
| `A_E_DRYING` / `BLD_A_DYEWORKS` | building | `ph_bz04_plastered_wall`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | The upper broad/narrow group has outside bounds1.85..6.15 centered at4.0; its individual axes4.9/2.175 reflect unequal widths. The smaller loft vent centers independently at4.0. Ground workfront4.605 and staff door6.9 remain unchanged. |
| `A_E_CAP` / `ASM_A_E_NORTH_CAP` | boundary-assembly | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Spawn A east boundary cap enclosure return |
| `A_S_WATCH` / `BLD_A_WATCH` | building | `ph_bz04_sandstone_blocks_05`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Bab al-Suq gate compound - coordinated wing or return |
| `A_S_GATE` / `BLD_A_GATE` | building | `ph_bz04_painted_plaster_warm`; civic-stepped; CF-ENVELOPE / CF-JOINT | Carved portal is the landmark. Registry room is a single broad rectangular timber light; flanking office windows share head/sill. One central high vent serves the archive above the registry room. |
| `A_S_KEEPER` / `BLD_A_KEEPER` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | Bab al-Suq gate compound - coordinated wing or return |
| `A_W_SOUTH` / `BLD_A_DOMESTIC_REAR` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | The south upper stack at1.5 and north stack at6.5 balance the complete0..8 household facade. The seat1.5 and entrance4.2 retain their independent ground positions. |
| `A_W_MID` / `BLD_A_DOMESTIC_REAR` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | The central doorway remains at4.2. Upper household lights belong to the two ends of the complete0..8 facade, not to the door axis. |
| `A_W_NORTH` / `BLD_A_DOMESTIC_REAR` | building | `ph_bz04_beige_wall_002`; single-drip; CF-ENVELOPE / CF-JOINT | The north upper stack at6.5 balances the south stack at1.5 across the complete0..8 household facade. |
| `A_W_CAP` / `ASM_A_W_NORTH_CAP` | boundary-assembly | `ph_bz04_sandstone_blocks_06`; existing-roof-cap-only; CF-ENVELOPE / CF-JOINT | Spawn A west boundary cap enclosure return |

| Group | Actual trade | Parts / recipes | Acceptance |
|---|---|---|---|
| `G_A_E_DYE_RECESS` | sample dye preparation and finishing | 6 / CF-CERAMIC, CF-CLOTH, CF-DYE-VESSEL, CF-FURNITURE, CF-STONE, CF-TIMBER | The visible recess supports sample dye preparation/finishing; bulk wet work belongs inside the compound. Build only the listed vessel, lidded companion, table and cloth. |
| `G_A_W_SEAT` | seat display | 7 / CF-CLOTH, CF-FURNITURE, CF-TIMBER | Build the named parts as seat display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. |

**Roof installation readiness:** The whole-map permanent design is complete geometry, but a standalone area build can activate only supported roof pieces. Use a dimensioned implementationPhase where supplied (B). Otherwise preserve the affected legacy roof and report that named interface deferred until its receiver prerequisites are included in the authorized queue. Do not install a floating bundle, invent temporary caps or silently build another area. A requested fully complete one-area sample with unavailable receivers needs its exact phase detail authored before that build.

| Bundle | Required receivers | Receivers outside this area |
|---|---|---|
| `ROOF_BUNDLE_UNIT_SPAWN_A_COURTYARD` | `A_E_CAP`, `A_E_DRYING`, `A_E_VATS`, `A_S_GATE`, `A_S_KEEPER`, `A_S_WATCH`, `A_W_CAP`, `A_W_MID`, `A_W_NORTH`, `A_W_SOUTH`, `lse-s`, `lsw-s-part-2` | `lse-s`, `lsw-s-part-2` |
| `ROOF_BUNDLE_UNIT_SPICE_STREET` | `A_NE_RETURN`, `A_NW_RETURN`, `F_SE`, `F_SW`, `S_E_MID`, `S_E_NORTH`, `S_E_SOUTH`, `S_W_MID`, `S_W_NORTH`, `S_W_SOUTH` | `F_SE`, `F_SW`, `S_E_MID`, `S_E_NORTH`, `S_E_SOUTH`, `S_W_MID`, `S_W_NORTH`, `S_W_SOUTH` |

**Required craft recipes:** CF-CERAMIC, CF-CLOTH, CF-DYE-VESSEL, CF-ENVELOPE, CF-FLOOR, CF-FURNITURE, CF-INSCRIPTION, CF-JOINT, CF-OPEN, CF-R4-PORTAL, CF-STONE, CF-TIMBER

Review complete buildings in neutral elevation/section and the full area at the saved player poses. Detail diagrams must show backs, bearings, rebates, hems and grade contact, not only outer boxes.

## Site, protected faces, and parcels

### `SPAWN_A_COURTYARD` · `north`

Quiet background: x=21..33 is the exact clear Spice opening..

Protected wall interval: **17..39 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 17..21 | collider-backed solid | COLLIDER_WALL_011 |
| 33..39 | collider-backed solid | COLLIDER_WALL_012 |
| 21..33 | **ZERO BUILD protected opening** | SPICE_STREET |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `A_NW_RETURN` | 17..21 | (17, 14, 21, 16.4) | Spice shop and household - coordinated wing or return | 9.9 | 2.4 | `ph_bz04_painted_plaster_warm` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `A_NE_RETURN` | 33..39 | (33, 14, 39, 16.4) | Single return vent serves one sack sorting room; do not duplicate a front bay grid on this 6m return. One loft vent stacked over sorting vent. | 10.2 | 2.4 | `ph_bz04_sandstone_blocks_05` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `A_NW_RETURN-L1-W1` | `A_NW_RETURN` | window | 19 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 14 | `SD-07`; closed double paneled timber shutters | family rooms; daylight on its measured room axis |
| `A_NW_RETURN-L2-W1` | `A_NW_RETURN` | vent | 19 | 8.73 / 9.38 | 1.25 × 0.65 × 0.3 | 14 | `SD-07`; closed timber louver | dry spice and household stores; high ventilation |
| `A_NE_RETURN-L1-W1` | `A_NE_RETURN` | vent | 36 | 5.55 / 6.25 | 1.6 × 0.7 × 0.3 | 14 | `SD-07`; closed timber louver | sack sorting floor; high ventilation |
| `A_NE_RETURN-L2-W1` | `A_NE_RETURN` | vent | 36 | 8.95 / 9.65 | 1.6 × 0.7 × 0.3 | 14 | `SD-07`; closed timber louver | dry bulk loft; high ventilation |

### `SPAWN_A_COURTYARD` · `east`

Quiet background: Tall, working east volumes with restrained colour..

Protected wall interval: **0..14 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 0..8 | collider-backed solid | COLLIDER_WALL_112 |
| 13..14 | collider-backed solid | COLLIDER_WALL_113 |
| 8..13 | **ZERO BUILD protected opening** | LINK_SOUTH_EAST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `A_E_VATS` | 0..3.15 | (39, 0, 42, 3.15) | The compact upper preparation-room light at2.175 balances the broad drying-room light at4.9 across the complete0..8 facade; the ground field stays quiet. | 10.2 | 3 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `A_E_DRYING` | 3.15..8 | (39, 3.15, 42.2, 8) | The upper broad/narrow group has outside bounds1.85..6.15 centered at4.0; its individual axes4.9/2.175 reflect unequal widths. The smaller loft vent centers independently at4.0. Ground workfront4.605 and staff door6.9 remain unchanged. | 10.2 | 3.2 | `ph_bz04_plastered_wall` | slab 10.2..10.38; parapet 10.83; cap 10.93; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `A_E_CAP` | 13..14 | (39, 13, 40.8, 14) | Spawn A east boundary cap enclosure return | 9.6 | 1.8 | `ph_bz04_sandstone_blocks_05` | slab 9.6..9.72; parapet 9.72; cap 9.72; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `A_E_DRYING-L1-W2` | `A_E_VATS` | window | 2.175 | 4.6 / 5.7 | 0.65 × 1.1 × 0.38 | 39 | `SD-07`; Closed 1-panel timber shutters | Small high light over the private staff stair, leaving a full corner pier |
| `A_E_DYE_RECESS` | `A_E_DRYING` | shop | 4.605 | 0 / 2.75 | 2.51 × 2.75 × 1.9 | 39 | `SD-08`; locked half-height timber lattice gate and opaque recess back; side-door clear 0.8 m → `A_E_DRYING-STAFF-DOOR` | dye workfront |
| `A_E_DRYING-STAFF-DOOR` | `A_E_DRYING` | door | 6.9 | 0 / 2.55 | 0.98 × 2.55 × 0.22 | 39 | `SD-05`; closed timber leaves | staff stair and store entrance |
| `A_E_DRYING-L1-W1` | `A_E_DRYING` | window | 4.9 | 4.35 / 5.95 | 2.5 × 1.6 × 0.38 | 39 | `SD-07`; Closed 3-panel timber shutters | sample preparation and staff workroom; daylight on its measured room axis |
| `A_E_DRYING-COMMON-LOFT-VENT` | `A_E_DRYING` | vent | 4 | 8.9 / 9.6 | 1.4 × 0.7 × 0.3 | 39 | `SD-07`; closed timber louver | ventilated drying loft; high ventilation |

### `SPAWN_A_COURTYARD` · `south`

Quiet background: Full south collider is a solid, layered civic facade..

Protected wall interval: **17..39 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 17..39 | collider-backed solid | COLLIDER_WALL_002, COLLIDER_WALL_004 |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `A_S_WATCH` | 17..21.45 | (17, -3.2, 21.45, 0) | Bab al-Suq gate compound - coordinated wing or return | 11.6 | 3.2 | `ph_bz04_sandstone_blocks_05` | slab 11.6..11.78; parapet 12.23; cap 12.33; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `A_S_GATE` | 21.45..34.55 | (21.45, -3.4, 34.55, 0) | Carved portal is the landmark. Registry room is a single broad rectangular timber light; flanking office windows share head/sill. One central high vent serves the archive above the registry room. | 10.8 | 3.4 | `ph_bz04_painted_plaster_warm` | slab 10.8..10.98; parapet 11.43; cap 11.53; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `A_S_KEEPER` | 34.55..39 | (34.55, -2.5, 39, 0) | Bab al-Suq gate compound - coordinated wing or return | 9.9 | 2.5 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `A_S_WATCH-ENTRANCE` | `A_S_WATCH` | door | 19.225 | 0 / 2.55 | 1.2 × 2.55 × 0.22 | 0 | `SD-05`; closed timber leaves | principal entrance and internal stair |
| `A_S_WATCH-L1-W1` | `A_S_WATCH` | window | 19.225 | 5.05 / 6.2 | 0.8 × 1.15 × 0.3 | 0 | `SD-07`; closed timber louver | watch room; daylight on its measured room axis |
| `A_S_WATCH-L2-W1` | `A_S_WATCH` | window | 19.225 | 8.65 / 10.1 | 1.45 × 1.45 × 0.38 | 0 | `SD-07`; closed timber louver | high observation room; daylight on its measured room axis |
| `A_S_GATE-PRINCIPAL` | `A_S_GATE` | door | 28 | 0 / 4.1 | 2.8 × 4.1 × 0.24 | 0 | `SD-11+SD-05`; closed timber leaves with a fixed opaque transom; architecturalDetail: `{"profile":"carved-timber-portal","surroundWidthM":0.22,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false,"frameColorSrgb":"#8f775d","frameMaterialId":"ph_bz04_weathered_brown_planks","materialProfile":"warmTimber","carving":{"pattern":"running-lozenge","modulePitchM":0.12,"moduleWidthM":0.085,"moduleHeightM":0.05,"incisionWidthM":0.006,"incisionDepthM":0.006,"placement":"One centered vertical chain on each outer timber jamb; stop 0.18 m above sill and 0.18 m below the arch spring/head. The head retains two continuous nested bands. No floral alternative."}}` | Closed ceremonial bazaar gate |
| `A_S_GATE-RELIEVING-1` | `A_S_GATE` | niche | 23.45 | 1.1 / 3.2 | 1.6 × 2.1 × 0.3 | 0 | `SD-11-BLIND`; opaque plaster blind arch over stone sill | Small blind relieving recess, visibly solid and subordinate to the ceremonial gate |
| `A_S_GATE-RELIEVING-2` | `A_S_GATE` | niche | 32.55 | 1.1 / 3.2 | 1.6 × 2.1 × 0.3 | 0 | `SD-11-BLIND`; opaque plaster blind arch over stone sill | Small blind relieving recess, visibly solid and subordinate to the ceremonial gate |
| `A_S_GATE-L1-W1` | `A_S_GATE` | window | 23.45 | 5.95 / 7.65 | 1.1 × 1.7 × 0.4 | 0 | `SD-07`; Closed 2-panel timber shutters | gate registry office; daylight on its measured room axis |
| `A_S_GATE-L1-W2` | `A_S_GATE` | window | 28 | 5.95 / 7.65 | 2.5 × 1.7 × 0.48 | 0 | `SD-07`; Closed 3-panel timber shutters | Principal registry room over the ceremonial gate |
| `A_S_GATE-L1-W3` | `A_S_GATE` | window | 32.55 | 5.95 / 7.65 | 1.1 × 1.7 × 0.4 | 0 | `SD-07`; Closed 2-panel timber shutters | gate registry office; daylight on its measured room axis |
| `A_S_GATE-L2-W2` | `A_S_GATE` | vent | 28 | 9.6 / 10.3 | 1.8 × 0.7 × 0.3 | 0 | `SD-07`; closed timber louver | archive and gate maintenance; high ventilation |
| `A_S_KEEPER-ENTRANCE` | `A_S_KEEPER` | door | 36.775 | 0 / 2.55 | 1.2 × 2.55 × 0.22 | 0 | `SD-05`; closed timber leaves | principal entrance and internal stair |
| `A_S_KEEPER-L1-W1` | `A_S_KEEPER` | window | 36.775 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 0 | `SD-07`; closed double paneled timber shutters | family room; daylight on its measured room axis |
| `A_S_KEEPER-L2-W1` | `A_S_KEEPER` | window | 36.775 | 7.55 / 9.15 | 1.1 × 1.6 × 0.34 | 0 | `SD-07`; closed double paneled timber shutters | bedroom; daylight on its measured room axis |

### `SPAWN_A_COURTYARD` · `west`

Quiet background: One coherent domestic property uses three aligned room bays; the side connector stays open..

Protected wall interval: **0..14 m**; floor grade: **z 0 m**.

| Baseline interval | Status | Notes |
|---|---|---|
| 0..8 | collider-backed solid | COLLIDER_WALL_076 |
| 13..14 | collider-backed solid | COLLIDER_WALL_077 |
| 8..13 | **ZERO BUILD protected opening** | LINK_SOUTH_WEST |

| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |
|---|---:|---|---|---:|---:|---|---|---|
| `A_W_SOUTH` | 0..2.75 | (14.4, 0, 17, 2.75) | The south upper stack at1.5 and north stack at6.5 balance the complete0..8 household facade. The seat1.5 and entrance4.2 retain their independent ground positions. | 9.9 | 2.6 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `A_W_MID` | 2.75..5.65 | (14, 2.75, 17, 5.65) | The central doorway remains at4.2. Upper household lights belong to the two ends of the complete0..8 facade, not to the door axis. | 9.9 | 3 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `A_W_NORTH` | 5.65..8 | (13.9, 5.65, 17, 8) | The north upper stack at6.5 balances the south stack at1.5 across the complete0..8 household facade. | 9.9 | 3.1 | `ph_bz04_beige_wall_002` | slab 9.9..10.08; parapet 10.53; cap 10.63; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |
| `A_W_CAP` | 13..14 | (15.2, 13, 17, 14) | Spawn A west boundary cap enclosure return | 9.6 | 1.8 | `ph_bz04_sandstone_blocks_06` | slab 9.6..9.72; parapet 9.72; cap 9.72; setback 0 | Opaque enclosed volume; every roof step has a closed return. All additions are the explicit openings, groups and fixtures in this issue. |

BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg).

| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |
|---|---|---|---:|---:|---|---|---|---|
| `A_W_SEAT` | `A_W_SOUTH` | niche | 1.5 | 0 / 2.7 | 1.8 × 2.7 × 0.5 | 17 | `SD-09-SEAT`; opaque recessed plaster niche | integrated household seat |
| `A_W_SOUTH-L1-W1` | `A_W_SOUTH` | window | 1.5 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 17 | `SD-07`; Closed 2-panel timber shutters | family sitting rooms; daylight on its measured room axis |
| `A_W_SOUTH-L2-W1` | `A_W_SOUTH` | window | 1.5 | 7.55 / 9.15 | 1.1 × 1.6 × 0.34 | 17 | `SD-07`; Closed 2-panel timber shutters | private sleeping rooms; daylight on its measured room axis |
| `A_W_MID-ENTRANCE` | `A_W_MID` | door | 4.2 | 0 / 2.55 | 1.2 × 2.55 × 0.22 | 17 | `SD-05`; closed timber leaves; architecturalDetail: `{"profile":"painted-domestic","surroundWidthM":0.14,"incisionDepthM":0.006,"receiverRule":"Cut carving and joinery inside this complete frame; keep the opening, back and bearing planes continuous.","includeThreshold":false}` | principal entrance and internal stair |
| `A_W_MID-L1-W1` | `A_W_NORTH` | window | 6.5 | 4.25 / 5.85 | 1.1 × 1.6 × 0.34 | 17 | `SD-07`; closed double paneled timber shutters | family sitting rooms; daylight on its measured room axis |
| `A_W_MID-L2-W1` | `A_W_NORTH` | window | 6.5 | 7.55 / 9.15 | 1.1 × 1.6 × 0.34 | 17 | `SD-07`; closed double paneled timber shutters | private sleeping rooms; daylight on its measured room axis |

## Surface and floor treatments

| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |
|---|---|---|---:|---|
| `SPAWN_A_COURTYARD` floor | `bz04_court_limestone_flags_01` | {'receiver': 'bz04_court_limestone_flags_01', 'base': 'Original paving texture with full world-scale UVs; no added all-over tint or noise', 'trafficRegion': {'id': 'SPAWN_A_COURTYARD-CLEAR', 'x': 25.0, 'y': 0, 'w': 6, 'h': 14, 'heightM': 2.2, 'floorSource': 'SPAWN_A_COURTYARD'}, 'trafficRoughnessDelta': -0.025, 'trafficAlbedoDelta': 0, 'edgeDust': {'widthM': 0.18, 'maxAlpha': 0.06, 'extent': 'Only the solid face intervals; subtract door service rectangles and every open transition', 'featherM': 0.06}, 'colliderChange': False} | — | Original paving texture with full world-scale UVs; no added all-over tint or noise |
## Activity groups and protected route regions

| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |
|---|---|---|---|---|---|
| `SPAWN_A_COURTYARD` | `G_A_E_DYE_RECESS` / `AG-DYE` | east/A_E_DRYING/A_E_DYE_RECESS | (38.72, 3.39, 0.04) → (40.9, 5.82, 2.65) | The visible recess supports sample dye preparation/finishing; bulk wet work belongs inside the compound. Build only the listed vessel, lidded companion, table and cloth. | SD-08 deck at absolute z=0.04, closed back at wall plane minus recess depth; all counter feet grounded |
| `SPAWN_A_COURTYARD` | `G_A_W_SEAT` / `AG-SEAT` | west/A_W_SOUTH/A_W_SEAT | (16.85, 0.7, 0.04) → (17.3, 2.3, 0.55) | Build the named parts as seat display. The kind-specific craft recipe defines finished shape; localBox is a limit, not permission to ship a raw box. | Two grounded supports on the SD-09 niche deck; no unlisted floor props |
| `SPAWN_A_COURTYARD` | `SPAWN_A_COURTYARD-CLEAR` | **CLEAR ROUTE** | (25, 0) → (31, 14) | Protected empty region | Do not place geometry |

### Fixed composition `G_A_E_DYE_RECESS`

along offsets from served opening centre; out positive to street; z above group bbox min (the finished deck). Dimensions are final part envelopes. This part list replaces the generic recipe contents, with the same workmanship and support standards.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `vessel-plinth` | stone-plinth / `CF-STONE` | [-0.85, -0.48, 0] / [0.2, 0.14, 0.13] | `ph_bz04_stone_trim_sandstone` | recess deck |
| `dye-vessel` | rounded-ceramic-vessel / `CF-DYE-VESSEL` | [-0.75, -0.42, 0.13] / [-0.18, 0.12, 0.84] | `bz04_ceramic_project_original`; albedo #d6c9b2 | vessel-plinth |
| `lidded-vessel` | lidded-ceramic-vessel / `CF-CERAMIC` | [-0.1, -0.38, 0.13] / [0.2, -0.08, 0.57] | `bz04_ceramic_project_original`; albedo #d6c9b2 | vessel-plinth |
| `side-table` | grounded-timber-table / `CF-FURNITURE` | [0.3, -0.4, 0] / [0.83, 0.15, 0.88] | `ph_bz04_worn_planks` | recess deck |
| `folded-work` | folded-cloth / `CF-CLOTH` | [0.38, -0.32, 0.88] / [0.75, 0.1, 1.02] | `ph_bz04_fine_linen` | side-table |
| `closed-work-gate` | locked-timber-lattice-gate / `CF-TIMBER` | [-1.205, 0.18, 0] / [1.205, 0.23, 1.15] | `ph_bz04_worn_planks` | opening jambs: two hinge straps and one locked latch |

### Fixed composition `G_A_W_SEAT`

Along offsets from served opening centre (or group centre for a plant); out positive toward street; z above group bbox min, the finished deck. Build exactly these parts with their stated receivers.

| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |
|---|---|---|---|---|
| `end-frame-1` | framed-timber-end / `CF-FURNITURE` | [-0.78, -0.12, 0] / [-0.7, 0.27, 0.42] | `ph_bz04_worn_planks` | recess deck |
| `end-frame-2` | framed-timber-end / `CF-FURNITURE` | [0.7, -0.12, 0] / [0.78, 0.27, 0.42] | `ph_bz04_worn_planks` | recess deck |
| `seat-board-1` | plank-board / `CF-TIMBER` | [-0.8, -0.15, 0.42] / [0.8, -0.02, 0.46] | `ph_bz04_worn_planks` | two end frames |
| `seat-board-2` | plank-board / `CF-TIMBER` | [-0.8, 0.01, 0.42] / [0.8, 0.14, 0.46] | `ph_bz04_worn_planks` | two end frames |
| `seat-board-3` | plank-board / `CF-TIMBER` | [-0.8, 0.17, 0.42] / [0.8, 0.3, 0.46] | `ph_bz04_worn_planks` | two end frames |
| `stretcher` | timber-member / `CF-TIMBER` | [-0.74, -0.025, 0.18] / [0.74, 0.025, 0.23] | `ph_bz04_worn_planks` | two end frames |
| `fitted-cushion` | fitted-cloth-cushion / `CF-CLOTH` | [-0.625, -0.1, 0.46] / [0.625, 0.25, 0.51] | `ph_bz04_fine_linen` | seat boards |

## Fixtures, receivers, budgets, and critical views

| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |
|---|---|---|---|---|---|
| `SPAWN_A_COURTYARD` | `R4-SHADE-A_W_SEAT` | `SD-12` | west/A_W_SOUTH/A_W_SEAT | (16.92, 0.6, 2.56) → (17.675, 2.4, 3.165) | Supported cream shade makes the fixed sitting pocket usable; no ground posts. |
| | `R4-SHADE-A_W_SEAT` dimensions/supports | | | {'interval': [0.6, 2.4], 'ledgerZ': 3.1, 'armAxesM': [0.7, 2.3], 'projectionM': 0.65, 'dropM': 0.16, 'sagM': 0.08} | Exact instance values override the standard defaults. |

**R4-SHADE-A_W_SEAT membrane-only bounds:** `{'min': [17, 0.6, 2.8520000000000003], 'max': [17.65, 2.4, 3.1]}`. Whole-assembly bounds above include the following supports:

| Component | World bounds |
|---|---|
| ledger | `{'min': [16.92, 0.6, 3.06], 'max': [17.04, 2.4, 3.14]}` |
| arm-knee-1 | `{'min': [16.96, 0.6649999999999999, 2.56], 'max': [17.675, 0.735, 3.165]}` |
| arm-knee-2 | `{'min': [16.96, 2.2649999999999997, 2.56], 'max': [17.675, 2.335, 3.165]}` |
| cloth-and-hem | `{'min': [17, 0.6, 2.827], 'max': [17.65, 2.4, 3.1]}` |


| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |
|---|---:|---:|---:|---:|
| `SPAWN_A_COURTYARD` | 48000 | 14 | 16 | 9 |

Section origin (design coordinates): `{'x': 17, 'y': 0, 'z': 0, 'source': 'gen-map-runtime.mjs resolves the traversal surface at the zone rectangle centre'}`.
Declared export bounds (glTF local x, up, north): `{'min': [-3.299999999999999, -0.02, -3.6], 'max': [25.400000000000006, 11.62, 16.599999999999998]}`.
Required bindings: `bz04_ceramic_project_original`, `bz04_court_limestone_flags_01`, `ph_bz04_beige_wall_002`, `ph_bz04_dark_wood`, `ph_bz04_fine_linen`, `ph_bz04_hessian_230`, `ph_bz04_painted_plaster_warm`, `ph_bz04_plastered_wall`, `ph_bz04_sandstone_blocks_05`, `ph_bz04_sandstone_blocks_06`, `ph_bz04_stone_trim_sandstone`, `ph_bz04_trim_sanded_01`, `ph_bz04_weathered_brown_planks`, `ph_bz04_worn_planks`.


| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |
|---|---|---|---|---|
| `SPAWN_A_COURTYARD-travel-reverse` | `SPAWN_A_COURTYARD` | (28, 13.35, 1.7) | 0° / 0° / 75° | Reverse arrival and district transition |
| `SPAWN_A_COURTYARD-travel-forward` | `SPAWN_A_COURTYARD` | (28, 0.65, 1.7) | 180° / 0° / 75° | Forward travel, route opening and whole-area focus |
| `SPAWN_A_COURTYARD-north-A_NW_RETURN-s1-base` | `SPAWN_A_COURTYARD` | (19, 0.35, 1.7) | 180° / 2.098° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_A_COURTYARD-north-A_NE_RETURN-s1-base` | `SPAWN_A_COURTYARD` | (36, 0.35, 1.7) | 180° / 2.098° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_A_COURTYARD-east-A_E_VATS_A_E_DRYING-s1-base` | `SPAWN_A_COURTYARD` | (17.35, 4, 1.7) | 270° / 1.323° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_A_COURTYARD-east-A_E_CAP-s1-base` | `SPAWN_A_COURTYARD` | (17.35, 13.5, 1.7) | 270° / 1.323° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_A_COURTYARD-south-A_S_WATCH_A_S_GATE_A_S_KEEPER-s1-base` | `SPAWN_A_COURTYARD` | (28, 13.65, 1.7) | 0° / 2.098° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_A_COURTYARD-west-A_W_SOUTH_A_W_MID_A_W_NORTH-s1-base` | `SPAWN_A_COURTYARD` | (38.65, 4, 1.7) | 90° / 1.323° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_A_COURTYARD-west-A_W_CAP-s1-base` | `SPAWN_A_COURTYARD` | (38.65, 13.5, 1.7) | 90° / 1.323° / 75° | lower and mid facade coverage with adjacent approach/return context |
| `SPAWN_A_COURTYARD-R3-craft-detail` | `SPAWN_A_COURTYARD` | (28, 3.5, 1.7) | 0° / 21.801° / 75° | R3 receiver, joinery, support, material and trade-detail inspection: A_S_GATE-PRINCIPAL |

## Landmarks and shared dependencies

| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |
|---|---|---|---|
| **shared dependency** `BZ04-SHARED-ENVIRONMENT` | `SPAWN_A_COURTYARD` | Must remain coordinated with owner | No duplicate landmark or filled route opening |

## Roof installation references

Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.

- `SPAWN_A_COURTYARD` cells: `ROOF_CELL_001`, `ROOF_CELL_002`, `ROOF_CELL_029`, `ROOF_CELL_030`, `ROOF_CELL_031`, `ROOF_CELL_032`, `ROOF_CELL_033`, `ROOF_CELL_034`, `ROOF_CELL_035`, `ROOF_CELL_036`, `ROOF_CELL_037`, `ROOF_CELL_038`, `ROOF_CELL_039`.
- `SPAWN_A_COURTYARD` bundles: `ROOF_BUNDLE_UNIT_SPAWN_A_COURTYARD`, `ROOF_BUNDLE_UNIT_SPICE_STREET`.
- `SPAWN_A_COURTYARD` interfaces: `ROOF_INTERFACE_ROOF_STEP_004`, `ROOF_INTERFACE_ROOF_STEP_019`, `ROOF_INTERFACE_ROOF_STEP_022`, `ROOF_INTERFACE_ROOF_STEP_041`, `ROOF_INTERFACE_ROOF_STEP_043`, `ROOF_INTERFACE_ROOF_STEP_047`.

## Material key

| Alias | Source material | Color | Tile / normal / roughness / albedo |
|---|---|---|---|
| `ph_bz04_beige_wall_002` | `ph_plastered_wall` | <span style="color:#d3bb93">■</span> `#d3bb93` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_painted_plaster_warm` | `ph_painted_plaster_warm` | <span style="color:#d8c4a0">■</span> `#d8c4a0` | 1.8 / 0.3 / 0.92 / 1 |
| `ph_bz04_plastered_wall` | `ph_plastered_wall` | <span style="color:#ddd0b3">■</span> `#ddd0b3` | 2 / 0.25 / 0.93 / 1 |
| `ph_bz04_sandstone_blocks_05` | `ph_sandstone_blocks_05` | <span style="color:#bda985">■</span> `#bda985` | 2 / 0.45 / 0.94 / 1 |
| `ph_bz04_sandstone_blocks_06` | `ph_sandstone_blocks_06` | <span style="color:#b6a185">■</span> `#b6a185` | 1.8 / 0.42 / 0.94 / 1 |

## Skyline and legacy producer dispositions

| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |
|---|---|---|---|---|
| `BG-01` | `SPAWN_A_COURTYARD` | shared-environment | (12, -8, 0) → (19, -3, 10.8) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |
| `BG-02` | `SPAWN_A_COURTYARD` | shared-environment | (23, -10, 0) → (31, -4, 12.2) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |
| `BG-03` | `SPAWN_A_COURTYARD` | shared-environment | (35, -8, 0) → (44, -3, 11.3) | Distant inhabited city block; broad quiet surfaces and a stepped parapet, no visible loose roof tank or unsupported ornament. |

| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |
|---|---|---|---|---|
| `PLACE_SPAWN_A_COVER_SPAWN_A_COVER_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | retain_gameplay | Retain exact geometry, transform and cover silhouette; common material calibration only. |
| `PLACE_SPAWN_A_EAST_WORKS_LMK_SPAWN_A_EAST_WORKS_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_BARREL_LMK_SPAWN_A_EAST_WORKS_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_CRATE_LMK_SPAWN_A_EAST_WORKS_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_POT_LMK_SPAWN_A_EAST_WORKS_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_EDGE_EAST_WORKS_TOP_POT_LMK_SPAWN_A_EAST_WORKS_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_EDGE_EXIT_EAST_CRATE_LMK_SPAWN_A_EXIT_EAST_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_EDGE_EXIT_EAST_POT_LMK_SPAWN_A_EXIT_EAST_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_EDGE_WEST_BACKS_BARREL_LMK_SPAWN_A_WEST_BACKS_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_EDGE_WEST_BACKS_POT_LMK_SPAWN_A_WEST_BACKS_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_EXIT_EAST_LMK_SPAWN_A_EXIT_EAST_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_EXIT_WEST_LMK_SPAWN_A_EXIT_WEST_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_GATE_LMK_SPAWN_A_GATE_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `PLACE_SPAWN_A_WEST_BACKS_LMK_SPAWN_A_WEST_BACKS_01` | `SPAWN_A_COURTYARD` | buildProps.ts / dressing_placements / asset_registry | remove | Retire old visual when this owner is implemented; replace only with explicit target parcels/groups. Do not add an overlay duplicate. |
| `ARCH_FRONTAGE_SPAWN_A_NORTH_EAST_GROUND_01` | `SPAWN_A_COURTYARD` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPAWN_A_NORTH_EAST_MASSING` | `SPAWN_A_COURTYARD` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPAWN_A_NORTH_WEST_GROUND_01` | `SPAWN_A_COURTYARD` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `ARCH_FRONTAGE_SPAWN_A_NORTH_WEST_MASSING` | `SPAWN_A_COURTYARD` | v3Architecture.ts / architecturePlacements | replace_visual_only | Target face parcels and roof volumes; suppress previous render emission only and preserve collider production. |
| `BOUNDARY_SPAWN_A_COURTYARD_north` | `SPAWN_A_COURTYARD` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SPAWN_A_COURTYARD_east` | `SPAWN_A_COURTYARD` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SPAWN_A_COURTYARD_south` | `SPAWN_A_COURTYARD` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |
| `BOUNDARY_SPAWN_A_COURTYARD_west` | `SPAWN_A_COURTYARD` | buildBlockout.ts boundary finish, wallDetailPlacer.ts and v3Architecture.ts core boundary grammar | replace_visual_only | Target closed intervals exactly; no geometry over immutable openings. |


## Drawings

- [SPAWN_A_COURTYARD dimensioned plan](drawings/spawn_a_courtyard-plan.svg), [SPAWN_A_COURTYARD four elevations](drawings/spawn_a_courtyard-elevations.svg), and [SPAWN_A_COURTYARD roof axonometric](drawings/spawn_a_courtyard-axon.svg)
- [Master plan](drawings/master-plan.svg)
