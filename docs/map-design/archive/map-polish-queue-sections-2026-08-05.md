Audience: implementation-agent
Authority: archive
Read when: tracing completed section-queue work or its REVISIT notes
Owns: record of the section-driven Bazaar polish queue completed 2026-08-05
Do not use for: active instructions, task status, or acceptance workflow
Last updated: 2026-08-16

> **Archived.** This geographic queue was completed on 2026-08-05 and reviewed at the final gate
> (verdict: HOLD — the remaining gap was systemic, not sectional). Current procedure lives in the
> [map-polish skill](../../../.claude/skills/map-polish/SKILL.md); current design proposals live in the
> [development plan](../development-plan/README.md). The current user task owns scope and status. The REVISIT notes below are historical evidence.

# Bazaar Target-Driven Visual Development Queue

This is the single ordered implementation queue for Bazaar visual development. Work one focus area at a time, compare the live result with its fixed-camera target, and leave the checkbox clear until the area is visually ready for owner review. The order establishes reusable merchant, attachment, ground, gate, and landmark systems first, then moves through the map geographically.

## 01 - Spice Street west merchant frontage

- [x] Ready for owner review
- Boundary: The continuous west façade from the southern arch return through the last visible merchant bay, including its upper windows, shop openings, stalls, awnings, plinth, and wall-base dressing.
- Primary camera: `AUDIT_07_SPICE_WEST_ELEVATION`
- Supporting cameras: `SHOT_11_SPICE_CANOPY`, `SHOT_13_CLOSEUP_MERCHANT_FACADE`
- Target: [target.jpg](visual-targets/01-spice-street-west-merchant-frontage/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/01-spice-street-west-merchant-frontage/current-target.jpg)

Implementation:

1. Recompose the frontage on one legible bay rhythm, keeping each bay to one door, shop opening, or shuttered window function.
2. Give every shop and door real reveal depth, dark backing, finished jambs, heads, sills, thresholds, and closures.
3. Rebuild the merchant stalls and awnings as complete timber assemblies with counters, shelves, stock, ledgers, braces, wall plates, bolts, and grounded feet.
4. Coordinate upper shutters, screens, projecting sills, canopy sockets, and horizontal datums so no attachment intersects an opening.
5. Carry the stone plinth and material scale through the whole run, then group restrained goods at the wall edge with clean floor contact.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/wallDetailFamilies/{shops,windows,doors,awningsFixtures,merchantGoods,structuralTrims}.ts`; `apps/client/src/runtime/map/propFamilies/{marketStalls,signsAwnings,goods}.ts`

Complete when: The live primary view materially matches the target’s façade hierarchy and every visible opening, stall, awning, and wall-base junction reads as a finished assembly.

## 02 - Spice Street east frontage and lane entry

- [x] Ready for owner review
- Boundary: The southern Spice Street threshold and the east-side merchant run visible from A Spawn, ending before Fountain Court.
- Primary camera: `SHOT_02_SPAWN_A_TO_BAZAAR`
- Supporting cameras: `SHOT_11_SPICE_CANOPY`, `AUDIT_07_SPICE_WEST_ELEVATION`
- Target: [target.jpg](visual-targets/02-spice-street-east-frontage-and-lane-entry/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/02-spice-street-east-frontage-and-lane-entry/current-target.jpg)

Implementation:

1. Resolve the southern arch, soffit, jambs, threshold, and both short returns as one deep entrance assembly around the unchanged lane opening.
2. Rebuild the east merchant bays with varied but aligned shop recesses, timber closures, framed windows, and continuous plinth and sill datums.
3. Replace pasted-on awnings and signs with supported wall ledgers, arms, braces, fasteners, finished cloth edges, and clear separation from openings.
4. Establish a deliberate foreground threshold, mid-lane shop rhythm, and distant landmark frame without introducing center-lane decoration.
5. Normalize stone, plaster, timber, cloth, and metal scale and carry the lane-edge curb, threshold, and wall contact consistently into the distance.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/propFamilies/{spiceGate,signsAwnings,marketStalls}.ts`; `apps/client/src/runtime/map/wallDetailFamilies/{facadeShells,doors,windows,structuralTrims}.ts`

Complete when: The fixed view reads as a finished six-metre bazaar entrance with a coherent east frontage and no unresolved opening, attachment, or lane-edge seam.

## 03 - Spice Street overhead canopy system

- [x] Ready for owner review
- Boundary: The overhead cloth, beams, ropes, wires, banners, and their attachment zones along Spice Street, excluding the shop interiors and ground prop clusters below.
- Primary camera: `SHOT_11_SPICE_CANOPY`
- Supporting cameras: `SHOT_15_CLOSEUP_CANOPY_ATTACHMENT`, `SHOT_02_SPAWN_A_TO_BAZAAR`
- Target: [target.jpg](visual-targets/03-spice-street-overhead-canopy-system/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/03-spice-street-overhead-canopy-system/current-target.jpg)

Implementation:

1. Establish a continuous sequence of long, short, high, and low shade spans that breaks the sky without obscuring the lane or distant route.
2. Replace thin cloth cards with static shaped panels that have believable sag, thickness, stitched hems, reinforced corners, and finished valances.
3. Carry every span through visible ropes or cables to timber beams, wall rings, plates, brackets, braces, and fasteners at both ends.
4. Re-key attachment heights against the existing windows, doors, signs, and stall roofs so no support crosses an opening.
5. Tune the cloth palette, roughness, translucency response, and cast-shadow density to create readable shade while preserving bright navigation surfaces.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/propFamilies/signsAwnings.ts`; `apps/client/src/runtime/map/wallDetailFamilies/awningsFixtures.ts`; `apps/client/src/runtime/map/buildProps.ts`

Complete when: The primary and closeup views show one believable load-bearing shade system with no floating pole, unsupported cloth edge, clipped opening, or isolated banner.

## 04 - Spice Street ground, cover, and thresholds

- [x] Ready for owner review
- Boundary: The lane floor and its two wall-edge bands from A Spawn’s exit to Fountain Court, including thresholds, gutters, cover clusters, and immediate ground-contact dressing.
- Primary camera: `SHOT_14_CLOSEUP_PROP_GROUNDING`
- Supporting cameras: `SHOT_02_SPAWN_A_TO_BAZAAR`, `SHOT_11_SPICE_CANOPY`
- Target: [target.jpg](visual-targets/04-spice-street-ground-cover-and-thresholds/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/04-spice-street-ground-cover-and-thresholds/current-target.jpg)

Implementation:

1. Recompose the paving as laid stone courses with intentional joint rhythm, curb and threshold changes, shallow gutters, and localized repair patches.
2. Resolve each doorway and shop opening with a sill, step or flush threshold, plinth return, and clean material transition into the lane.
3. Rebuild cover and stock clusters as compact edge compositions with credible crate construction, baskets, pottery, folded textiles, scale, pivots, and contact.
4. Consolidate wear, sand, drainage staining, and wall-base debris into authored bands rather than uniform noise across the route.
5. Remove floating, interpenetrating, duplicated, or center-lane props while preserving a strong foreground and useful cover silhouettes at authored edges.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/{buildPbrFloors,floorWearDecals,buildSandAccumulation,buildWallBaseDebris}.ts`; `apps/client/src/runtime/map/propFamilies/{coverDressing,goods}.ts`

Complete when: The closeup reaches the target’s material and grounding quality and the supporting views retain an uncluttered central walking envelope.

## 05 - A Spawn main exit façade

- [x] Ready for owner review
- Boundary: A Spawn’s complete north face: the monumental main arch, both flanking returns, parapets, base treatment, and the threshold into Spice Street.
- Primary camera: `AUDIT_01_SPAWN_A_NORTH_FRONTAGES`
- Supporting cameras: `SHOT_02_SPAWN_A_TO_BAZAAR`
- Target: [target.jpg](visual-targets/05-a-spawn-main-exit-facade/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/05-a-spawn-main-exit-facade/current-target.jpg)

Implementation:

1. Unify the arch and its flanking returns into one exit composition with continuous datums, stepped massing, and a clear dominant center.
2. Build the arch with layered voussoirs, deep jambs, a finished soffit, spring-line blocks, threshold stone, and complete wall thickness around the unchanged throat.
3. Turn the sealed side masses into finished architecture with shallow windows or niches, dark backing, coping, cornice, and restrained carved accents.
4. Attach lanterns, banners, canopy lines, signs, and base dressing through visible brackets, plates, sockets, and grounded supports.
5. Match stone course scale, plaster wear, shadow depth, and paving contact across the gate, returns, and courtyard threshold.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/propFamilies/{spawnAGate,spawnAExitReturns,boundaryKit}.ts`; `apps/client/src/runtime/map/buildProps.ts`; `apps/client/src/runtime/map/v3Architecture.ts`

Complete when: The exit reads as one monumental but buildable façade matching the target, with the original three-route access and central throat visibly unchanged.

## 06 - Fountain Court hero composition

- [x] Ready for owner review
- Boundary: The full Fountain Court release, centered on the off-axis fountain and including the palm, visible enclosing façades, edge life, and the northward frame.
- Primary camera: `SHOT_03_FOUNTAIN_COURT`
- Supporting cameras: `SHOT_16_CLOSEUP_FOUNTAIN_MATERIAL`, `SHOT_04_TEXTILE_ARCADE`
- Target: [target.jpg](visual-targets/06-fountain-court-hero-composition/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/06-fountain-court-hero-composition/current-target.jpg)

Implementation:

1. Strengthen the existing off-center fountain as the hero silhouette with a layered octagonal basin, readable rim thickness, restrained tile, and a clearly seated base.
2. Complete the visible court walls with coherent plinth, string, sill, and coping datums plus deep framed openings and dark closures.
3. Rebuild the palm and planter relationship so the trunk, soil, rim, drain, and paving contact read as one grounded landmark assembly.
4. Compose the existing stalls, planters, tea pieces, and cover into two restrained edge clusters that frame rather than fill the rotation pocket.
5. Balance sun, canopy shade, wall value separation, and material scale to preserve the fountain, north exit, and lateral routes as distinct visual layers.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/propFamilies/fountain.ts`; `apps/client/src/runtime/map/{buildDecorativePalms,v3Architecture,buildPbrFloors}.ts`; `apps/client/src/runtime/map/propFamilies/{marketStalls,teaService}.ts`

Complete when: The primary view approaches the target’s hero hierarchy and foreground-to-background depth while the court remains visually open around the unchanged fountain footprint.

## 07 - Fountain basin material and ground transition

- [x] Ready for owner review
- Boundary: The fountain basin, water, fittings, planter contact, and the immediate three-to-four-metre paving apron.
- Primary camera: `SHOT_16_CLOSEUP_FOUNTAIN_MATERIAL`
- Supporting cameras: `SHOT_03_FOUNTAIN_COURT`
- Target: [target.jpg](visual-targets/07-fountain-basin-material-and-ground-transition/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/07-fountain-basin-material-and-ground-transition/current-target.jpg)

Implementation:

1. Rebuild the basin profile as cut and laid stone with stepped courses, consistent radial joints, carved edge bands, real rim thickness, and a grounded plinth.
2. Give the shallow water a restrained normal and Fresnel response with a darkened wetted edge, preserving the static surface and existing fill level.
3. Resolve the tile band, dry outlets, drain, overflow, and metal fittings as small complete assemblies without simulated jets or fluid effects.
4. Author the apron as purpose-laid paving with radial or keyed cuts, drainage fall, damp staining, mineral deposits, and localized foot wear.
5. Correct the nearby planter and wall contacts so stone, water, soil, vegetation, and floor meet without gaps, clipping, or mismatched material scale.

- Likely ownership: `apps/client/src/runtime/map/propFamilies/fountain.ts`; `apps/client/src/runtime/map/{buildPbrFloors,floorWearDecals}.ts`; `apps/client/src/runtime/render/materials/{FloorMaterialLibrary,applyFloorShaderTweaks}.ts`

Complete when: The closeup materially matches the target’s stone, tile, water-edge, fitting, and apron finish with no primitive silhouette or unresolved seam.

## 08 - Textile Arcade south compression

- [ ] Ready for owner review [REVISIT: primary camera is dominated by tall pale reed/straw-looking wall panels whose emitter was not traced; arcade bays gained racked rug stock but sit outside this camera]
- Boundary: The covered main-lane segment from Fountain Court’s north threshold to the Rug Gate approach, including both arcade walls and the overhead textile roof.
- Primary camera: `SHOT_04_TEXTILE_ARCADE`
- Supporting cameras: `SHOT_03_FOUNTAIN_COURT`, `SHOT_09_RUG_GATE`
- Target: [target.jpg](visual-targets/08-textile-arcade-south-compression/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/08-textile-arcade-south-compression/current-target.jpg)

Implementation:

1. Establish a legible arcade order with real columns, arch recesses, spandrels, spring lines, plinths, and a continuous roof datum.
2. Turn the wall bays into deep textile shops with finished frames, dark backing, timber closures, counters, and clearly separated circulation openings.
3. Build rug and textile displays as framed racks, rolls, shelves, and hanging panels attached to the architecture instead of flat wall cards.
4. Replace the roof cover with layered battens, beams, ropes, and static cloth panels that have seams, thickness, sag, tension, and supported edges.
5. Coordinate shade, material value, floor wear, and the bright Rug Gate sightline so the six-metre route remains readable through the compression.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/wallDetailFamilies/arches.ts`; `apps/client/src/runtime/map/propFamilies/{textilesWallArt,signsAwnings,marketStalls}.ts`

Complete when: The fixed view matches the target’s covered-arcade depth and textile identity, with no thin cloth, incomplete bay, or ambiguous route opening.

## 09 - Rug Gate hero approach

- [x] Ready for owner review
- Boundary: The Rug Gate crown, piers, open throat, flanking rug displays, and immediate southern approach.
- Primary camera: `SHOT_09_RUG_GATE`
- Supporting cameras: `SHOT_04_TEXTILE_ARCADE`, `SHOT_12_SPAWN_B_RETURN`
- Target: [target.jpg](visual-targets/09-rug-gate-hero-approach/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/09-rug-gate-hero-approach/current-target.jpg)

Implementation:

1. Rebuild the gate silhouette with a layered stone crown, articulated voussoirs, piers, corbels, cornice, and restrained blue inlay inside the existing mass.
2. Give the open throat real jamb, spring-line, soffit, floor-threshold, and rear-edge depth without adding a leaf, grille, or closure.
3. Replace loose rugs with braced racks, shelves, hanging bars, rolled stock, feet, and wall ties positioned outside the portal envelope.
4. Add one asymmetric supported awning or sign assembly to break symmetry without competing with the gate crown.
5. Resolve gate-to-wall joints, plinth returns, paving cuts, material scale, and contact shadows across the whole approach.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/propFamilies/gateDressing.ts`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/propFamilies/{textilesWallArt,signsAwnings}.ts`

Complete when: The gate has the target’s hero hierarchy and complete construction while the original portal throat remains fully open and visually unchanged in width.

## 10 - Dyers Alley process wall and drainage

- [x] Ready for owner review
- Boundary: The east process wall and its lane-edge band from the A south-east connector to the Covered Souk threshold.
- Primary camera: `AUDIT_05_DYERS_ALLEY_EAST_FRONTAGE`
- Supporting cameras: `SHOT_07_COVERED_DYERS_SOUK`
- Target: [target.jpg](visual-targets/10-dyers-alley-process-wall-and-drainage/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/10-dyers-alley-process-wall-and-drainage/current-target.jpg)

Implementation:

1. Replace the blank run with a measured service rhythm of shallow recesses, timber doors, screened vents, small windows, plinth, cornice, and wall returns.
2. Build timber dye racks with posts, cross-bracing, pegs, wall plates, and static dyed cloth that hangs clear of doors and the walking envelope.
3. Compose vats, ceramic vessels, a work shelf, baskets, and barrels into compact process stations grounded against the wall.
4. Add a narrow drain, wet apron, splash staining, mineral deposits, and worn paving that visibly connect each process station to the floor.
5. Support the sparse shade and fixtures with ledgers, arms, rings, fasteners, and coherent ochre plaster, stone, timber, metal, and cloth response.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/propFamilies/{dyersWorkstation,textilesWallArt,signsAwnings,goods}.ts`; `apps/client/src/runtime/map/{buildPbrFloors,floorWearDecals}.ts`

Complete when: The wall matches the target’s readable dye-work sequence and every prop, rack, drain, and opening is complete without entering the clear route.

## 11 - Covered Dyers Souk arcade

- [x] Ready for owner review
- Boundary: The covered souk from its southern threshold through the shaded merchant/process run to the dogleg exit.
- Primary camera: `SHOT_07_COVERED_DYERS_SOUK`
- Supporting cameras: `AUDIT_06_COVERED_SOUK_SOUTH_FRONTAGE`, `SHOT_08_DYERS_DOGLEG`
- Target: [target.jpg](visual-targets/11-covered-dyers-souk-arcade/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/11-covered-dyers-souk-arcade/current-target.jpg)

Implementation:

1. Define the covered run with structural columns, arch or lintel bays, spandrels, plinths, and a continuous overhead bearing line.
2. Give the merchant and dye-process openings deep reveals, finished frames, dark backing, closures, counters, shelves, and thresholds.
3. Rebuild the overhead cover as beams, battens, supported static cloth, edge hems, tension lines, wall sockets, and deliberate light gaps.
4. Consolidate vats, dye baskets, hanging cloth, racks, carts, and stock into a few grounded edge workstations with clear purpose.
5. Unify ochre plaster, limestone, dark timber, colored cloth, paving wear, drainage, and readable shade toward the bright exit.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/wallDetailFamilies/arches.ts`; `apps/client/src/runtime/map/propFamilies/{dyersWorkstation,textilesWallArt,signsAwnings,goods}.ts`

Complete when: The primary view reaches the target’s enclosed market character and every bay, cover span, workstation, and floor junction reads as purpose-built.

## 12 - Dyers Dogleg residential turn

- [x] Ready for owner review
- Boundary: The continuous S-turn from the Covered Souk exit to North Court, including the inner corner, outer residential wall, and turn-edge dressing.
- Primary camera: `SHOT_08_DYERS_DOGLEG`
- Supporting cameras: `SHOT_07_COVERED_DYERS_SOUK`, `SHOT_10_NORTH_COURT`
- Target: [target.jpg](visual-targets/12-dyers-dogleg-residential-turn/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/12-dyers-dogleg-residential-turn/current-target.jpg)

Implementation:

1. Complete the inner corner and outer wall as interlocking plaster-and-stone masses with finished caps, returns, bases, and a deliberate S-shaped reveal.
2. Replace shallow openings with modest residential doors and windows that have real depth, timber screens or shutters, dark backing, and clean thresholds.
3. Add one small supported overhang, ledge, or screen assembly plus restrained utility lines fixed through visible brackets and wall anchors.
4. Keep dyed textiles, pottery, baskets, planters, and a small work surface in sparse clusters on the outside of turns.
5. Shift the district toward quiet sun-faded plaster, restrained timber, fine wall wear, and continuous ground drainage without weakening the corner silhouettes.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/wallDetailFamilies/{windows,doors,facadeShells,structuralTrims}.ts`; `apps/client/src/runtime/map/propFamilies/{textilesWallArt,goods}.ts`

Complete when: The view matches the target’s quiet residential contrast and layered turn while the inside line and full swept walking envelope remain visually clear.

## 13 - North Court release

- [x] Ready for owner review
- Boundary: North Court from its southern threshold to the two B Spawn connectors, including the enclosing façades, palm landmark, court floor, and edge work areas.
- Primary camera: `SHOT_10_NORTH_COURT`
- Supporting cameras: `SHOT_08_DYERS_DOGLEG`, `SHOT_12_SPAWN_B_RETURN`
- Target: [target.jpg](visual-targets/13-north-court-release/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/13-north-court-release/current-target.jpg)

Implementation:

1. Compose the enclosing walls into a low-mid-tall skyline with finished parapets, copings, stepped masses, and one dominant palm-backed anchor.
2. Build a coherent residential/service bay rhythm with deep doors, screened windows, shaded stoops, plinths, and continuous horizontal datums.
3. Resolve the south threshold and both north connector mouths with real jambs, heads, returns, floor cuts, and clear route hierarchy.
4. Group the existing dye workstation, rug stall, planters, vessels, and cover into restrained edge clusters that frame the rotation space.
5. Carry purposeful paving, drainage, wall-base wear, material scale, and sun/shade separation across the court without flattening the exits.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/{buildDecorativePalms,buildPbrFloors,floorWearDecals}.ts`; `apps/client/src/runtime/map/propFamilies/{dyersWorkstation,textilesWallArt,marketStalls,goods}.ts`

Complete when: The court matches the target’s release, skyline, and palm hierarchy while all three exits and the central rotation area remain immediately legible.

## 14 - Service South utility frontage

- [x] Ready for owner review
- Boundary: The long east wall and lane-edge band of Service South from the A south-west connector to Caravan Court.
- Primary camera: `AUDIT_03_SERVICE_SOUTH_EAST_FRONTAGE`
- Supporting cameras: `SHOT_06_CARAVAN_RAMP`
- Target: [target.jpg](visual-targets/14-service-south-utility-frontage/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/14-service-south-utility-frontage/current-target.jpg)

Implementation:

1. Replace the blank wall with a quiet repeated service order of buttresses, plinths, string courses, cornice, and finished end returns.
2. Build recessed storage doors, screened vents, and small windows with full frames, dark backing, thresholds, and believable hardware.
3. Add timber ledgers, brackets, plates, fasteners, and one shallow load alcove integrated into the bay rhythm.
4. Carry a continuous curb, drain, gutter staining, and wall-base wear along the lane edge and into the Caravan threshold.
5. Ground baskets, pottery, crates, and utility pieces in a few recess clusters without narrowing the north opening or central route.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/wallDetailFamilies/{doors,windows,structuralTrims}.ts`; `apps/client/src/runtime/map/propFamilies/goods.ts`; `apps/client/src/runtime/map/{buildPbrFloors,floorWearDecals}.ts`

Complete when: The elevation matches the target’s calm service rhythm and no blank panel, unresolved opening, floating prop, or obstructed lane edge remains.

## 15 - Caravan Court ramp and loading composition

- [x] Ready for owner review
- Boundary: Caravan Court’s load yard, east and west edges, ramp threshold, retaining faces, and the first visible rise toward Tea Terrace.
- Primary camera: `SHOT_06_CARAVAN_RAMP`
- Supporting cameras: `AUDIT_04_CARAVAN_EAST_FRONTAGES`, `SHOT_05_TEA_TERRACE`
- Target: [target.jpg](visual-targets/15-caravan-court-ramp-and-loading/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/15-caravan-court-ramp-and-loading/current-target.jpg)

Implementation:

1. Finish the ramp approach with capped retaining faces, plinth returns, clean elevation transitions, threshold cuts, and a readable crest.
2. Complete both service frontages with deep storage doors, modest windows, wall returns, coping, and coherent plaster-and-stone datums.
3. Build one supported loading shade with posts or wall arms, beams, cross-bracing, ropes, fasteners, and static textile cover.
4. Compose carts, crates, bundled goods, pack lines, and tying hardware into secured edge load groups with grounded wheels and feet.
5. Add wheel wear, drainage, sand accumulation, contact shadows, and material seams that connect the yard, façades, and ramp.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/propFamilies/{carts,goods,signsAwnings}.ts`; `apps/client/src/runtime/map/{buildPbrFloors,floorWearDecals,buildSandAccumulation}.ts`

Complete when: The court approaches the target’s load-yard composition and the ramp remains the dominant, clear route through fully grounded edge dressing.

## 16 - Tea Terrace elevated route

- [x] Ready for owner review
- Boundary: The ramp crest, tea-service frontage, raised terrace, stairs, landing, and north connector as one continuous elevated route.
- Primary camera: `SHOT_05_TEA_TERRACE`
- Supporting cameras: `SHOT_06_CARAVAN_RAMP`, `SHOT_12_SPAWN_B_RETURN`
- Target: [target.jpg](visual-targets/16-tea-terrace-elevated-route/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/16-tea-terrace-elevated-route/current-target.jpg)

Implementation:

1. Rebuild the tea frontage with deep framed openings, dark backing, timber screens, a built-in counter or sideboard, shelves, and complete thresholds.
2. Turn the existing stall into a braced timber tea-service assembly with grounded feet, canopy ledger, wall sockets, fasteners, trays, cups, and vessels.
3. Add a modest static shade panel with finished edges, sag, tension, wall plates, ropes, and arms that stays above the clear route.
4. Resolve ramp crest, terrace parapet or railing edges, retaining caps, stair treads, risers, landings, and floor-material transitions as one construction.
5. Place stools, tables, crates, and folded textiles only at the terrace edges and unify stone, plaster, timber, brass, cloth, wear, and contact shadows.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/{v3Architecture,buildPbrFloors}.ts`; `apps/client/src/runtime/map/propFamilies/{teaService,marketStalls,signsAwnings,goods}.ts`

Complete when: The elevated route matches the target’s tea-service identity and every stall, shade, railing, tread, landing, and wall contact reads as finished.

## 17 - B Spawn main entrance and return

- [ ] Ready for owner review [REVISIT: the tall exposed posts flanking the portal still read as bleached vertical planks; craze anisotropy and the west mass wall material were both corrected without changing them, so the post cladding has its own material path]
- Boundary: The open southern portal into B Spawn, its immediate returns, edge rug racks, courtyard threshold, and the framed view back through the main route.
- Primary camera: `SHOT_12_SPAWN_B_RETURN`
- Supporting cameras: `AUDIT_02_SPAWN_B_SOUTH_FRONTAGES`, `SHOT_09_RUG_GATE`
- Target: [target.jpg](visual-targets/17-b-spawn-main-entrance-and-return/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/17-b-spawn-main-entrance-and-return/current-target.jpg)

Implementation:

1. Finish the existing pointed portal inside its current contour with cut-stone courses, a layered arch ring, real jamb depth, soffit, base blocks, and threshold.
2. Complete both returns with cooler northern stone and plaster, recessed timber doors and screens, dark backing, plinths, sill datums, and copings.
3. Replace the edge displays with braced rug racks, shelves, rolled textiles, grounded feet, and restrained stock outside the passage.
4. Add modest lantern brackets, wall fixtures, shallow carved insets, and indigo accents attached through believable plates and fasteners.
5. Carry paving joints, wall-base seams, material scale, and readable daylight through the portal to the distant main-route anchor.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/wallDetailFamilies/{arches,doors,windows,structuralTrims}.ts`; `apps/client/src/runtime/map/propFamilies/{gateDressing,textilesWallArt,lanternsFixtures}.ts`

Complete when: The return view matches the target’s northern gate identity and the original portal silhouette, width, and background route remain recognizable and open.

## 18 - B Spawn south frontages

- [x] Ready for owner review
- Boundary: The paired south courtyard walls flanking B Spawn’s gate, including their towers, doors, windows, parapets, plinths, fixtures, and edge cover.
- Primary camera: `AUDIT_02_SPAWN_B_SOUTH_FRONTAGES`
- Supporting cameras: `SHOT_12_SPAWN_B_RETURN`, `SHOT_10_NORTH_COURT`
- Target: [target.jpg](visual-targets/18-b-spawn-south-frontages/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/18-b-spawn-south-frontages/current-target.jpg)

Implementation:

1. Recompose the paired masses with shared plinth, string, sill, cornice, and coping datums while preserving controlled left-right variation.
2. Convert the tall exposed posts into connected pilasters, buttresses, or capped roof stacks that visibly belong to each façade.
3. Build deep timber doors, screened windows, and shallow supported oriel assemblies with finished reveals, backing, sills, heads, and brackets.
4. Attach lanterns, drains, restrained textile accents, and northern identity details through visible hardware rather than flat decoration.
5. Consolidate rug rolls, racks, crates, pottery, and plants into grounded edge groups and resolve the gate, façade, and courtyard-floor seams.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/v3Architecture.ts`; `apps/client/src/runtime/map/wallDetailFamilies/{facadeShells,windows,doors,structuralTrims}.ts`; `apps/client/src/runtime/map/propFamilies/{gateDressing,textilesWallArt,goods}.ts`

Complete when: The paired frontages reach the target’s built northern character and no tower, opening, attachment, cover cluster, or ground junction reads as unfinished.

## 19 - Perimeter, rooftops, and skyline integration

- [x] Ready for owner review
- Boundary: The continuous sealed perimeter ring, all visible playable roofs, parapets, roof services, and the surrounding non-playable skyline belt; traversable layout and openings are excluded.
- Primary camera: `SHOT_01_TOPDOWN_ESTABLISHING`
- Supporting cameras: `SHOT_02_SPAWN_A_TO_BAZAAR`, `SHOT_12_SPAWN_B_RETURN`
- Target: [target.jpg](visual-targets/19-perimeter-rooftops-and-skyline-integration/target.jpg)
- Current → Target: [current-target.jpg](visual-targets/19-perimeter-rooftops-and-skyline-integration/current-target.jpg)

Implementation:

1. Replace the repeated outer shell field with a deliberate layered old-city belt that follows the existing footprints while varying height, setback, roof class, and material.
2. Finish every visible playable roof with coherent parapets, copings, drainage edges, roof-access hatches, and clean junctions to adjacent masses.
3. Distribute a restrained deterministic set of water tanks, vents, chimney pots, shade frames, utility lines, and service clusters with believable support.
4. Establish a low-mid-tall skyline rhythm with a few distant minaret, palm, and chimney silhouettes that frame rather than replace the sealed perimeter.
5. Unify district roof palettes, large-to-small material variation, sun/shade separation, fog depth, and contact shadows without flattening the three route identities.

- Likely ownership: `docs/map-design/specs/map_spec.json`; `apps/client/src/runtime/map/{buildBlockout,v3Architecture,buildPbrWalls,buildDecorativePalms}.ts`; `apps/client/src/runtime/render/{DesertSky,Renderer}.ts`; `apps/client/src/runtime/game/Game.ts`

Complete when: The top-down view approaches the target’s finished roof and city-edge composition while the authored map footprint, all routes, and every opening remain directly traceable.
