# BZ-04 | Bazaar design basis

R7 issue date: 2026-09-10. This is a virtual-environment design package for Clawdstrike, not a real-building permit or a professional engineering seal. Independent AI engineering, architecture and game-design reviews are recorded in [audits.md](audits.md). The user approved this R7 issue for the [canonical full-map implementation queue](README.md#approved-whole-map-queue-and-readiness). Approval of documents does not certify an exported model or an in-game result.

## 1. Commission and outcome

Design the complete visible Bazaar map before implementation: every area, enclosed face, exposed return, floor, roof, skyline volume and dressing group has one defined owner and target. Preserve the existing playable footprint, collision geometry, passage openings, cover, spawns and elevation. The user explicitly authorizes replacement of weak render-only content, including assets formerly marked KEEP.

The visual target is a polished, readable FPS environment with simple forms, finished materials and concentrated marketplace character. It is inspired by real markets and Dust2; it is not a reconstruction of any one marketplace. The era is predominantly traditional, with discreet modern utilities.

Earlier B/Spice trial versions remain historical evidence. The B-04 courtyard established the current architectural direction, with B-05 specifying its missing finish. R7 carries that use-led architecture and craftsmanship across the map; it does not copy the same balcony, window family or rug display everywhere.

## 2. Reference register and intended use

| Reference | Design lesson | Limits |
|---|---|---|
| [Dust2: creator's design account](https://www.johnsto.co.uk/design/making-dust2/) | Concise route structure; arches frame transitions; ground treatment guides movement; trim separates meaningful forms. | Do not import its route graph, bomb sites, timings or numerical dimensions. |
| [Valve: Dust2 remake](https://www.counter-strike.net/dust2/) | Player/background separation and predictable movement take priority over ornamental detail. Distinct districts can share one coherent palette. | The 2017 publication explains design decisions, not the current patch's exact geometry. |
| [Valve: CS2 comparisons](https://www.counter-strike.net/cs2) | Study Back Plat, Long A Doors, CT Spawn and Mid Doors for material hierarchy, legible openings and selective detail. | A high-fidelity screenshot is a finish reference, not proof our renderer or assets already match it. |
| [Souq Waqif](https://visitqatar.com/intl-en/things-to-do/shopping/souqs/souq-waqif) | Textured plaster, thick openings, timber shade, colored joinery, workshops and sheltered seating. | Do not copy tourist crowds, unrestricted stall encroachment or every ornament. |
| [Mutrah Souq](https://experienceoman.om/en/destinations/muscat/mutrah-souq) and [photographic field study](https://joussourtooman.com/mutrah-souq/) | Supported timber overheads, memorable covered junctions and trade-specific textile/incense displays. | Keep combat routes open and target backgrounds legible. No continuous dark ceiling over the map. |
| [Al Wakrah Old Souq](https://souqalwakra.qa/) | Related buildings with different heights, recessed entrances, integrated seating and small roof terraces. | Use its proportions and built relationships rather than an empty court as a template. |
| [Marrakech souks](https://www.visitmorocco.com/en/travel/marrakech/shopping) | Rolled, folded and hanging goods communicate different trades; selective slatted shade creates a second visual layer. | A secondary craft reference. Gulf-inspired architecture remains the map's coherent base. |
| [Founding Bazaar image](../refs/bazaar_main_hall_reference.png) | Warm aged surfaces, layered street depth, occupied upper volumes and concentrated color. | Illustrative only. No dimensions, ambiguous supports, blocked routes or illegible lettering are adopted. |
| [CS2 daylight image 1](../refs/cs2_daylight_ref_1.png) | Dust2 scale and gameplay readability. | Other `cs2_daylight_ref_*` files depict other CS environments; use them for finish, not as Dust2 evidence. |

## 3. Visual hierarchy

### R7 facade-centered upper openings

The user selected full facade redesign, coherent building-specific window families, a few distinctive district landmarks and mostly plain supporting openings. R4's repeated pointed colored-glass pair was another template. R5 removed redundant stair-sized lights and loft vent rows, grouped openings around actual occupied rooms and retained the few features that belong to their buildings. Glass is concentrated on the established B merchant pair and selected civic upper lights; it is not the standard showroom or household window.

R7 gives upper windows their own facade composition. Single lights and repeated vertical stacks center within the visible building or intentionally expressed facade section. Paired groups balance their complete outline, including unequal widths, while keeping coherent upper-floor relationships. Ground doors and shopfronts can stay offset for access; their axes do not automatically determine upper windows. A room label alone cannot justify a visually unbalanced elevation.

Both Textile elevations use the three section centers 50.825, 56.375 and 61.55. The west building has a south upper room and one shared central/north work and sitting hall; its reverse Tea gallery centers at 60, and the unequal upper pair has a combined center of 60. The Tea Ramp lower pair balances around 52, with one independently centered upper light at 52. Ground shops, stairs and staff entrances remain at their previous positions.

The selected finish palette is now part of the same authoring source. Public paving, stone bases and plaster receive distinct but related values; brighter-color joinery stays on its existing owners. Exact source crops and physical repeats distinguish solid-stone trim and fine cloth from their shared substrates. Source-level appearance is checked separately from lighting and retained runtime macro variation.

A facade has an entrance hierarchy, room groups and storey-specific axes. Ground shop piers are not an all-storey window grid. The controlled floorAxisSchedule distinguishes the ground facade from upper rooms. Textile/Tea uses one shared upper room registry: a south room and a longer central/north work and sitting hall. The front work light and rear sitting gallery address different ends of that same central hall, not overlapping fictional rooms. Fountain merchant and Souk reverse share their narrow entrance-side and broad main room identities. Canonical room volumes do not overlap one another.

Keep B's building layout, merchant balcony and trade groups. Simplified loft ventilation and corrected opening stacks remain subordinate to its main address. Do not scatter arches, colored panes or decorative shutters to make a blank wall seem designed.

The palm is removed. The apparent free bands at Caravan Court's edges are playable maneuvering space, and its outside edges are occupied by stores, enclosures or route mouths. A tree trunk there would add cover/collision or become pass-through scenery; the hidden rear tree also produced the rejected roof-mounted appearance. Do not reintroduce it without a separately resolved, clearly visible ground receiver that preserves gameplay.

The dedicated window reviewer record covers all 100 faces. The approved R7 record reviews window and door placement under the facade-centering criterion. It identifies the fresh visual checks for changed fields and the retained evidence for unchanged fields. Read that record without repeating the review during implementation. The separate review record controls its own decision and source hash; the source does not self-certify. The recorded common-sense check also covers depth and support in schematic perspectives or sections. These design reviews do not become recurring implementation gates.

Craft remains measured: the timber portal's running-lozenge jamb incision has a fixed module and depth, with continuous head bands. Rug Gate's 0.35 m arch ring appears in the drawings. Its BAZAAR inlay belongs to the north face, visible from B, and is not duplicated onto the south approach for presentation. Perspective occlusion must preserve that fact.

1. At distance, read the route, cover silhouette, primary entrance and building masses.
2. At movement distance, read the tenancy, shade, sign, opening depth and material boundary.
3. At close range, read joinery, hardware, cloth edge, tool marks and local wear.

Every area drawing identifies a primary focus, occupied pockets and deliberately quiet surfaces. Quiet means composed, correctly scaled and low in contrast; it never means an unassigned surface or unfinished box. Decorative roof volumes sit behind the playable boundary and do not imply access.

## 4. Architecture

Design the complete building before placing its openings. The controlled `buildings[]` register defines its use, physical footprint, storeys, floor structure, structural bay edges, principal entrance, shopfront program and roof. Its linked untextured elevation and section must explain those decisions without relying on textures or small wear marks.

Use a clear hierarchy and measured alignment. Openings sit on primary or documented subordinate bay axes; windows share sill/head datums within each named room-use group on a storey and clear the floor structure. Residential and civic fronts use symmetry where it suits their plan. Asymmetry follows a named stair, addition, loading bay or trade use. Different neighboring buildings may have different proportions and floor systems; windows are never shifted arbitrarily to manufacture variety. Opposite facades share physical rooms and floor structure but may have separately balanced opening groups; an offset entrance on one face does not impose its axis on the reverse.

The gate watch house, ceremonial gatehouse and keeper house are three attached buildings with intentionally different uses and floor systems. The Tea/Textile building has a raised rear ground entry and common upper floors. Narrow retaining spines and terminal walls are boundary assemblies, not fictitious houses. These relationships explain the massing before any decoration is added.

Use a balanced mixture of plaster and stone buildings. Materials change at a property joint, an addition, an exposed masonry base, an opening surround or a named repair. Do not alternate colors to satisfy a quota. A family dwelling, store, tea house, workshop and civic building need different opening and servicing logic.

Preserve straight load-bearing lines and clear floor grades. Hand-cut masonry, softened plaster returns, cloth sag, unequal parcel lengths and stepped roof volumes provide irregularity. Do not tilt buildings, offset random bricks, introduce jagged walkways or apply the same noise mask everywhere.

Each opening names the room or trade it serves. A decorative door is closed and visibly backed, with a grounded threshold and a clear approach; it never advertises a new playable route. Upper windows belong to a supported room volume. Screens, sills, signs, rugs and artwork have a stated receiver and attachment. No free-floating window frames, unsupported tree bases or decorative panels without a wall.

## 5. Occupation and restraint

Market activity is composed in small groups: goods plus their storage/display, seating plus shade, a workstation plus its tools, or planting plus a container and water-related wear. Each group belongs to a named building and has a fixed footprint. The space between groups remains intentionally open. Do not scatter props, repeat identical stalls on every face or fill all visible wall area.

Rugs are used as stock, shade-side domestic furnishings or fitted displays, with appropriate edges and supports. Textiles carry rust-red, muted teal and indigo accents. Primary combat backgrounds stay relatively quiet. The ground reads as walkable paving with swept joints, contact dust and localized use; it must not compete with the player silhouette.

## 6. Material and lighting control

The [material schedule in details.md](details.md) defines source scans, world scale and target shader parameters. Reuse source textures and materials map-wide. Grain follows the assembly; a scan spanning a slab is not a substitute for modelling a sill, reveal or join.

Compare materials first under fixed neutral daylight, then in the shipped game lighting. Do not compensate for a dark/brown material set with exposure, fog, bloom or a sepia grade. Keep current lighting controls available. Small material calibrations may be needed after the first built sample, but a builder may not silently change the palette, replace assets or redesign a whole face.

## 7. Review intent

The three disciplines review different questions:

- Engineering: is every target dimensioned, owned, supported, integrable and compatible with the protected gameplay envelope?
- Architecture: do the complete plans, elevations and roof relationships describe a coherent inhabited place with intentional proportions and variation?
- Game studio: does the composition make movement, targets, cover and location identity clear at actual player cameras, within the stated budgets?

A recorded document approval means ready to attempt implementation from these decisions. Construction defects, material response, visibility, collision and performance still require actual-game evidence. No document can guarantee a flawless first export. The workflow must expose and correct defects without inventing new design or weakening checks.
