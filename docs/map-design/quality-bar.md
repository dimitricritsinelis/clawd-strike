# Bazaar Map Quality Bar

Judge macro before meso before micro: massing and sequence, then facade rhythm and assemblies, then materials, joints and wear.

## Buildings and facades

Every wall belongs to a building in `buildings[]`; its construction sheet decides the current openings, ownership and character. Preserve the measured axes, service floors, corner fields and roof datums. Symmetry belongs where the sheet specifies it, especially civic buildings; it is not a rule for every house, shop or repair. Adjacent tenancies should read as different owners through their scheduled plaster grain and color, stonework, joinery, cloth and maintenance history. Preserve existing differences in height and frontage depth. Do not move protected geometry or add niches to a blank wall to manufacture variety.

| Type | The wall needs |
|---|---|
| shop | Complete scheduled trade display, service access and supported shade; sign only where scheduled; stock belongs to that trade and remains inside its envelope |
| shop row | Measured bay rhythm with distinct tenancies; differing scheduled finishes, cloth curves and handling marks; do not repeat one cabinet and one stain as every trade |
| house | Scheduled door and closures, domestic care and privacy; preserve pairs where measured, but do not invent symmetry, a balcony or extra goods |
| tea house | Wide openings onto the terrace; screened gallery above; lanterns, cloth shade, seating at the wall |
| workshop | One wide working door; high small vents; worn, stained lower wall; tools clustered at the door |
| store row | Scheduled closed storage doors and piers; similar envelopes can show different grain, repairs and receiving-door wear |
| landmark | One grand arched door on axis, taller than the street; few high windows; roofline steps up |
| arcade | Arches on one rhythm, piers between, no doors in arches; goods and cloth inside the arches |
| service back | Blank plaster or stone, one hatch at most, high vents, drain and base staining, one string course |
| compound wall | Coping, one string course, no openings, at most one niche on axis; lower than its neighbours |

## Complete assemblies

Windows have jambs, heads, sills, reveals, closures and wall junctions. Stalls have structure, counter, cover, stock, support and ground contact. Awnings and canopies are attached, supported, tensioned and finished at their edges. Signs, fixtures and goods belong to the architecture or stall they serve. Reject anything pasted on, floating, clipped, paper-thin, unsupported or half-resolved.

Sound construction can have hand-cut edges, trowelled returns and cloth folds. SD-21/22 in the [construction README](construction/README.md) bound that craft without moving structural bearings or opening envelopes. Reject uniformly beveled cubes, black plank slots, coplanar door faces and stain cards without a receiving surface. Inspect both distinct assemblies and their retained context; isolated elevations omit roof and overhead interfaces.

## Materials

Correct world scale with variation at building, hand and grain scale. Renamed or tinted copies of one weak texture are not diversity. Close-range surfaces need readable texture, roughness, normal response, edge treatment and intentional wear. Warm cream, sandy ivory, tan, ochre and occasional faded earth-red plaster sit beside cut and rubble sandstone; gritty earth-toned repairs are part of the wall, not a full-height dirt layer. Retain rust-red, teal-green and indigo textiles as concentrated color. Compare materials under the same neutral daylight; do not use warm grading to conceal uniform surfaces.

The market is flourishing, heavily used and maintained. Retained rugs, rolled and hanging textiles, stocked counters, pottery, seating, planted sills and laundry show daily life. Their composition follows the sheet, not random scatter. Rugs have weight, a pattern at believable scale, finished edges and support; cloth is neither a rigid rectangle nor a torn rag. No crowds or new systems are required to communicate occupancy.

Foot traffic polishes the swept routes and thresholds; dust collects in joints, sheltered feet and stock contacts. Wear bands are receiving limits, not continuous stripes. Repairs differ in outline and scale because they have different causes. Dye and water stay at their workstations and drains. Keep most wall fields legible and intact, with quieter civic faces. No garbage, sewage, rubble heaps, uniform brown wash, sepia post-process or full-height grunge. Above-human-height marks need a scheduled drain, vent source or sun exposure.

## Completion

Release validation may set an area to `complete` only when every construction-sheet task meets its stated completion condition in the actual game, including its character schedule, supporting views and movement, with no regressions on neighbours. A construction pass sets `built` only after the construction README's bounded assembly/interface inspection; a successful export and `map:check` alone do not establish that. Keep correctable defects or incomplete construction evidence at `building`, and exact unresolved conflicts at `blocked`. A previously applied package does not automatically satisfy a revised sheet. Floating or intersecting geometry, blocked openings, unsupported structures, exposed unfinished surfaces, placeholder materials, disconnected dressing or anything in the walking envelope blocks release completion.
