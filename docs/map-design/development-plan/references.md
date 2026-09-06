# Curated design references

**Revision 3 / proposed.** These eight GPT-generated images are secondary design-review proposals. The [original Bazaar main-hall image](../refs/bazaar_main_hall_reference.png) remains the primary artistic reference, as defined by the [quality bar](../quality-bar.md#visual-target). The numbered concepts are preserved in the [historical archive](../archive/README.md); they are not current design targets. Keep the five authentic CS2 daylight screenshots as external finish/readability benchmarks and the original booth game images as approval evidence.

The generated references show **visual character and craft**. Dimensioned building cards/drawings determine geometry, counts, clearances and placement. No image is evidence of an implemented map, collision safety, performance, exact dimensions or visual approval. Reject image-only changes to openings, supports, thresholds, cover or skyline. Do not silently reinterpret a generated detail as an approved feature.

## Revision 3 interpretation

The founding image opens the revised atlas. Read close trade edges, staggered broad upper rooms, alternating supported cloth/sky gaps and a distant arch as one sequence. S1/S2 translate those relationships into dimensioned roofs while preserving the ground route baseline. Warm sunlight on stone/plaster and readable bounced shade are the active direction. No golden haze, crushed black shade or global orange overlay is prescribed.

R01/R03 retain joinery and trade vocabulary but do not set corridor breadth or skyline. R05 supplies tea materials; E1 replaces its enclosed-corridor premise as a test. R06 supplies the three-business idea; the actual center booth asset remains authoritative. R07's door-to-wall proportion does not match B21: keep the2.25 m door and4.5 m wall, add the specified loft/roof treatment, and do not scale the image into a building. B18 becomes the complete-building pilot.

All eight image files and exact historical prompts below are preserved. Their instructions to keep heights fixed and use neutral daylight are provenance, not the current design brief. Their incidental supports, shutters, paving and cloth are not measurements. Compare proposed silhouettes and warm-light readability through M07 in README.md before any engine tuning.

## Reference register and visual review

| ID | Image / owning scope | Adopt | Do not infer |
|---|---|---|---|
| R00 | [Founding Bazaar street](../refs/bazaar_main_hall_reference.png) | Primary authority: layered depth, occupied upper rooms, supported shade interpretation, trade edges and warmth. | Ambiguous cable endpoints, blocked walking space, lettering or exact dimensions are not construction requirements. |
| R01 | [Spice Street](references/spice-street.png) | District palette, three distinct trades, rich west / quiet east. | Cabinet depth, incidental background openings and the cover cabinet silhouette are not approved geometry. |
| R02 | [Fountain Court](references/fountain-court.png) | Civic masonry, readable shade, restrained blue waterline, contact and carving. | Fountain size/position and background opening counts remain the measured source values. |
| R03 | [Textile Arcade](references/textile-arcade.png) | Hanging galleries versus roll chests, supported shade, quiet piers. | No extra arch bays, projected floor stock or changed walking width. |
| R04 | [Rug Gate](references/rug-gate.png) | Voussoirs, cornice, blue accent and quiet receiving backdrop. | No new step under the portal, changed arch span or narrowed sightline. |
| R05 | [Caravan / Tea Terrace](references/tea-terrace.png) | Serving joinery, brass/porcelain/linen, wall repairs and overhead support. | Furniture quantity, cloth low points and all route grades require the source schedule and M02/M03. |
| R06 | [Covered Dyers Souk](references/covered-souk.png) | Exactly three different trade compositions in one retained arcade. | The approved center booth stays its existing asset; the generated depiction does not revise its geometry. |
| R07 | [Dyers House study](references/dyers-house.png) | One dwelling, one door, two screens, quiet side wall and flush entrance. | Dimensions come from B21, not perspective measurement; no new route or extra window. |
| R08 | [Construction and trade study](references/craft-and-trade.png) | Finished frames, lattice, supported cloth, trade-specific cabinets and stock. | Detail study only: panel photographs are not measured sections or production textures. |

All eight final images were visually reviewed. R07 had one targeted correction: its initial raised entrance was removed so the final door meets continuous paving. No repeated redesign cycle was used. R06 keeps the approved booth as the source-of-truth asset and assigns the north bay a different dye-sample seller. The first six images use existing game views as spatial references; their lighting/materials are artistic proposals.

## Previous-target routing

| Previous target numbers | Current design reference / drawing |
|---|---|
| 01-04 Spice | R01 + B01/B02 and P02 sheets; R08 construction details |
| 05 Spawn-A exit | O04 and B32/B33 sheets; R01 material vocabulary |
| 06-07 Fountain | R02 + B03/B04 and P03 |
| 08 Textile | R03 + B05/B06 and P04 |
| 09 Rug Gate | R04 + B07/B08, O05/O06 and P05 |
| 10 Dyers Alley | R07/R08 + B20/B21/B22 and P14 |
| 11 Covered Souk | R06 + B17/B18/B19 and P15 |
| 12 Dogleg | B23/B24 and P16; R07 domestic craft, R08 work details |
| 13 North Court | B25-B29 and P17; R02 civic / R06 workshop materials |
| 14 Service South | B13/P07; R05 quiet plaster/contact treatment |
| 15-16 Caravan / Tea | R05/R08 + B09-B16 and P08-P13 |
| 17-18 Spawn B | R04 + B34/B35, O06 and P06 |
| 19 Skyline | O08/O09 and masterplan; S1/S2 roof sections and owner-specific M proposals govern proposed silhouettes |

## Generation provenance and prompts

Generated with the built-in OpenAI image-generation tool on 2026-09-04. The tool did not expose a model-version identifier. These are original generated **design references**, not CC0 production textures or photogrammetry sources. Production geometry/material resources still follow the repository's original/CC0 provenance policy. The selected images are saved in this package; originals remain in the Codex generated-image directory. MD5 below identifies each selected file. Prompts are preserved verbatim for review, not a new automation pipeline.

### R01 · Spice Street

File: `references/spice-street.png` · MD5 `ed64eb64ac66372a00304db0d0e3d173`.

Spatial input: `artifacts/map-shoot/unit-spice-street/audit-before/units/unit-spice-street/primary.png`.

<details>
<summary>Exact generation prompt</summary>

Use case: stylized-concept. Create a premium architectural visualization for Clawdstrike's Levantine old-city Bazaar, suitable for a professional game environment design book. The supplied game screenshot is ONLY a spatial/camera reference, not a style target. Preserve its street footprint, openings between districts, landmark positions, relative building heights and clear walking space. Replace the primitive visual quality with physically convincing hand-built architecture: deep supported reveals, carefully coursed pale limestone, lime plaster with restrained repairs, fine carpentry, finished corners and parapets, realistic textiles with stitching and attachment hardware. Distinct buildings and trades; no repetitive copied storefronts. Bright neutral desert daylight, clear readable shade, natural color, precise PBR materials; no dusk, orange grading, atmospheric fog, depth of field or exaggerated ruin. Professional architectural photography / high-end Blender visualization, excellent craftsmanship. A composed but genuinely usable place. No people, weapons, text overlays, dimensions, logos, giant signs, plants or clutter in the route. This is a proposed artistic reference, not a screenshot of implemented work. Landscape 3:2 composition, high resolution. Scene: south-to-north view of Spice Street, 12 m wide, with an entirely clear 6 m central route. Right/west frontage is a two-storey spice merchant block: three stocked recessed shops interleaved with two closed household doors, five upper windows on the same floor, mixed louvered teal shutters, solid honey-brown shutters and woven screens. Each shop expresses a different dry trade: spice drawers and jars; brass balance and grain bins; small apothecary tins. All goods stay inside the recesses or fixed wall-edge cabinets. Left/east frontage is a quieter single-storey wholesale warehouse with closed timber doors and blind plaster panels. Existing high cross-street cloth shades are cream with narrow muted rust stripes, properly tensioned to roof/wall supports; individual merchant awnings visibly braced. Keep the off-axis fountain glimpse and distant route framing. Building-scale composition is the hero, not scattered pots.

</details>

### R02 · Fountain Court

File: `references/fountain-court.png` · MD5 `66d6284479af1dfbd5a7d07bcee2b427`.

Spatial input: `artifacts/map-shoot/unit-fountain-court/review-arch-perf-after/units/unit-fountain-court/primary.png`.

<details>
<summary>Exact generation prompt</summary>

Use case: stylized-concept. Create a premium architectural visualization for Clawdstrike's Levantine old-city Bazaar, suitable for a professional game environment design book. The supplied game screenshot is ONLY a spatial/camera reference, not a style target. Preserve its street footprint, openings between districts, landmark positions, relative building heights and clear walking space. Replace the primitive visual quality with physically convincing hand-built architecture: deep supported reveals, carefully coursed pale limestone, lime plaster with restrained repairs, fine carpentry, finished corners and parapets, realistic textiles with stitching and attachment hardware. Distinct buildings and trades; no repetitive copied storefronts. Bright neutral desert daylight, clear readable shade, natural color, precise PBR materials; no dusk, orange grading, atmospheric fog, depth of field or exaggerated ruin. Professional architectural photography / high-end Blender visualization, excellent craftsmanship. A composed but genuinely usable place. No people, weapons, text overlays, dimensions, logos, giant signs, plants or clutter in the route. This is a proposed artistic reference, not a screenshot of implemented work. Landscape 3:2 composition, high resolution. Scene: Fountain Court, a 16 by16 m civic square. Retain the off-axis low carved fountain and nearby existing palm at the right of this camera; the central circulation stays fully empty. Tall madrasa volume on the right: one large backed pointed arch, one small stained clerestory above, quiet lower ashlar and restrained turquoise accent, no new dome or additional windows. Opposite merchant dwelling should be a restrained plaster loggia with finely made timber screens. Richness comes from limestone carving at the fountain lip, water contact, subtle blue glazed lining, deep arch moldings, warm plaster and precise paving joints. Align paving with existing routes. Keep the route through the smaller Textile arcade toward the distant gate open. No additional palms, new stalls in the square, unsupported banners, palace ornament or invented routes.

</details>

### R03 · Textile Arcade

File: `references/textile-arcade.png` · MD5 `25b8ab2115fad2daaaec06fed18d3dec`.

Spatial input: `artifacts/map-shoot/unit-textile-arcade/review-arch-perf-after/units/unit-textile-arcade/primary.png`.

<details>
<summary>Exact generation prompt</summary>

Use case: stylized-concept. Create a premium architectural visualization for Clawdstrike's Levantine old-city Bazaar, suitable for a professional game environment design book. The supplied game screenshot is ONLY a spatial/camera reference, not a style target. Preserve its street footprint, openings between districts, landmark positions, relative building heights and clear walking space. Replace the primitive visual quality with physically convincing hand-built architecture: deep supported reveals, carefully coursed pale limestone, lime plaster with restrained repairs, fine carpentry, finished corners and parapets, realistic textiles with stitching and attachment hardware. Distinct buildings and trades; no repetitive copied storefronts. Bright neutral desert daylight, clear readable shade, natural color, precise PBR materials; no dusk, orange grading, atmospheric fog, depth of field or exaggerated ruin. Professional architectural photography / high-end Blender visualization, excellent craftsmanship. A composed but genuinely usable place. No people, weapons, text overlays, dimensions, logos, giant signs, plants or clutter in the route. This is a proposed artistic reference, not a screenshot of implemented work. Landscape 3:2 composition, high resolution. Scene: Textile Arcade, an11 m wide passage with clear6 m walking route; higher ochre-plaster rug merchants on one side, lower limewashed cloth traders opposite. Keep the existing three arch bays and intervening masonry/pier composition on each side. Give each bay a distinct finished trade composition: gallery of two large hanging rugs with a low folded-rug chest; horizontal rolled rug rack with bound bundles; quiet packing bay with closed storage. One south-east light-fabric booth with cream braced awning and hanging cotton samples, not every shop the same booth. Strong thick stone arches with real joints; backed interiors not traversable tunnels, finished counter legs/cabinets to ground, no metal prison grilles obscuring trade displays. Three discreet upper timber screens on the taller side only. Existing broad high cream shade and sparse drying textiles have visible ties and clear gaps of blue sky. Preserve the distant northern gate silhouette and uncluttered center.

</details>

### R04 · Rug Gate

File: `references/rug-gate.png` · MD5 `7eef8d0979091f531ef9c2232113cef6`.

Spatial input: `artifacts/map-shoot/unit-rug-gate/sched-after/units/unit-rug-gate/primary.png`.

<details>
<summary>Exact generation prompt</summary>

Use case: stylized-concept. Make a premium architectural visualization for a professional design atlas of Clawdstrike's Levantine old-city Bazaar. The input game screenshot provides the camera and physical layout only. Upgrade primitive materials and construction into believable hand-crafted architecture while preserving building heights, route width, current large openings, landmark positions, existing stairs and level changes. Limestone coursing, restrained limewash repairs, precise stone and timber junctions, supported heavy frames, true textile folds and hems. Refined building-specific detail, never a street of identical kiosks. Bright neutral desert daylight, readable soft-bounced shade, realistic roughness and material scale, no orange grade or dusk. High-end Blender architectural visualization, natural architectural photographic composition. Empty walking envelopes, no people, no weapons, no text overlays, no new route clutter, no speculative domes or balconies. Landscape 3:2, high resolution. Artistic proposal only. Scene: northern Rug Gate, a low broad existing stone portal opening onto quiet Spawn B. Preserve the existing gate's outline, clear underpass and side connections; no door across the actual route. Improve the arch with precise wedge-shaped voussoirs and coherent carved cornice, small restrained blue glazed roundels, grounded piers and resolved returns, no broken-heart arch. The foreground merchant bay at right has one refined indigo-rust rug roll cabinet and one supported timber awning, its neighboring service door closed and plain. Across the portal, the receiving-house backdrop is low, quiet, worn ochre plaster with two closed timber doors and one backed decorative opening. No added shops, no castle turrets, no floor clutter. Distinguish the gate's civic stonework from the merchant's joinery. Preserve the open central route and quiet arrival.

</details>

### R05 · Caravan / Tea Terrace

File: `references/tea-terrace.png` · MD5 `487c1b98fd3e97add30d261761de6b43`.

Spatial input: `artifacts/map-shoot/unit-tea-terrace/stall-after/units/unit-tea-terrace/primary.png`.

<details>
<summary>Exact generation prompt</summary>

Use case: stylized-concept. Make a premium architectural visualization for a professional design atlas of Clawdstrike's Levantine old-city Bazaar. The input game screenshot provides the camera and physical layout only. Upgrade primitive materials and construction into believable hand-crafted architecture while preserving building heights, route width, current large openings, landmark positions, existing stairs and level changes. Limestone coursing, restrained limewash repairs, precise stone and timber junctions, supported heavy frames, true textile folds and hems. Refined building-specific detail, never a street of identical kiosks. Bright neutral desert daylight, readable soft-bounced shade, realistic roughness and material scale, no orange grade or dusk. High-end Blender architectural visualization, natural architectural photographic composition. Empty walking envelopes, no people, no weapons, no text overlays, no new route clutter, no speculative domes or balconies. Landscape 3:2, high resolution. Artistic proposal only. Scene: Tea Terrace and the Caravan district. Camera at player-eye on the raised1.4 m terrace. Preserve the existing path and walls, with a fully clear4 m walkway. Left-side tea-house serving recess and closed entrance, two upper windows on one floor, one louvered shutter and one framed woven ventilation closure. One beautiful small timber tea sideboard with brass tray/cups, a modest existing table and stools clustered against the wall; no additional seating or booth in the path. Upgrade the little existing service stand into coherent tea joinery contained at its existing edge. High narrow cream canopy is tied to masonry with believable beams and knotted rope, never loose floating cloth. Right wall is intentionally quiet repaired lime plaster over grounded stone base with restrained damp/contact wear, no new doors or windows. End wall keeps one high blind niche. Visible stone paving joints and all existing route transitions remain flush. Material richness comes from polished contact points on wood, hammered brass, porcelain and linen, not decorative clutter.

</details>

### R06 · Covered Dyers Souk

File: `references/covered-souk.png` · MD5 `b9c9c0ba05baac79154a2bbcb7756e8d`.

Spatial input: `artifacts/map-shoot/unit-covered-souk/textile-booth-final/units/unit-covered-souk/cross-b.png`.

<details>
<summary>Exact generation prompt</summary>

Use case: stylized-concept. Make a premium architectural visualization for a professional design atlas of Clawdstrike's Levantine old-city Bazaar. The input game screenshot provides the camera and physical layout only. Upgrade primitive materials and construction into believable hand-crafted architecture while preserving building heights, route width, current large openings, landmark positions, existing stairs and level changes. Limestone coursing, restrained limewash repairs, precise stone and timber junctions, supported heavy frames, true textile folds and hems. Refined building-specific detail, never a street of identical kiosks. Bright neutral desert daylight, readable soft-bounced shade, realistic roughness and material scale, no orange grade or dusk. High-end Blender architectural visualization, natural architectural photographic composition. Empty walking envelopes, no people, no weapons, no text overlays, no new route clutter, no speculative domes or balconies. Landscape 3:2, high resolution. Artistic proposal only. Scene: FRONT ELEVATION perspective of the east Covered Souk frontage. Strictly keep exactly THREE pointed stone arch display bays on the existing axes, wide blank piers, low4.5 m one-storey wall, flat parapet and roof silhouette. No windows or extra arches. Preserve the CENTER existing textile booth's visible design, cabinetry, cream braced awning, hanging cream/green/rust fabric samples and folded stock; it is the approved reference asset. Elevate presentation but do not redesign this central booth. SOUTH/LEFT bay is a quiet closed packing cabinet with a few orderly bolts, no metal prison grille. NORTH/RIGHT bay is a DISTINCT dye-sample merchant: low stout timber counter, ceramic color-sample jars and a narrow hanging rail of indigo and madder test strips, complete attached awning and framed closed backing. Do NOT copy the center booth into this bay. Existing high green street canopy enters from upper right, with an actual tension tie to the solid roof/wall. Remove visual mess from the walking path; keep all displays in the recesses and route clear. Delicate stone joints, weathered cream plaster, convincing cabinet feet and seam details, short modest blank painted signboards above bays without garbled lettering. The entire elevation should read as three different businesses sharing one built arcade.

</details>

### R07 · Dyers House study

File: `references/dyers-house.png` · MD5 `46c31055bf5bdea813b1f7e11c547c71`.

No source image; generated from the explicit design brief.

<details>
<summary>Exact generation prompt</summary>

Use case: stylized-concept. Create a professional architectural design reference of a modest Levantine old-city dyer's house for Clawdstrike Bazaar, isolated enough to understand its full composition but integrated into a stone-paved alley. High-end architectural photograph / premium Blender rendering, neutral bright desert daylight, natural muted palette and readable shade, no orange grade. Three-quarter view from the front and its north side, with the whole building visible, 3:2 landscape. This is a SMALL SINGLE-STOREY RECTANGULAR HOUSE, facade 8.25 metres long, depth4.2 metres, wall height4.5 metres, simple flat parapet roof, no additional stories, dome or balcony. EXACTLY ONE CLOSED timber entrance door on the facade center, and EXACTLY TWO square-ish timber diamond-lattice windows, one on each side at equal spacing. Door1.05 m wide2.25 m high; windows1.0 m wide1.4 high, sill.85 m. Axes measured from facade left: window1.8 m, door4.125 m, window6.45 m. No text/dimensions in image. Recessed supported frames and pale stone sill with drip, deep door jambs, quiet continuous stone base, fine-grained lime plaster/soft warm limestone, coherent corner returns. Both visible side wall and rear wall have NO openings or added decorative niches. A taller workshop is barely visible adjoining one end, its exposed party wall blank. Keep a broad empty alley, no steps, planters, benches, awnings, loose pots, carts, overhead cloth or props. High craft: actual mortise-tenon door, forged iron hinges and latch, carefully fitted timber lattice with dark closed backing, subtle material variation, capped wall top, finished junctions and contact. House reads as a inhabited but closed dwelling, not another retail stall. Exact floor-plan/opening decisions matter more than picturesque extras.

</details>

<details>
<summary>Targeted entrance correction</summary>

Edit this architectural reference. Change ONLY the entrance threshold and ground junction: extend the central closed timber door and its two jambs DOWN to meet the alley paving at exactly the same continuous ground level. There must be no raised stone wall/base below the doorway, no step up, no ramp, no stair and no floating door. The stone base may continue under the two windows but MUST STOP at the door jambs. Keep the door top unchanged so the corrected door is taller. The final door sill is a flush thin stone joint in the paving. Preserve the entire rest of the image exactly: one-storey house, two lattice windows, plain side wall, wall/roof outline, neighboring workshop, camera, daylight, materials and empty alley. This correction is required for a game map with an unchanged ground plane.

</details>

### R08 · Construction and trade study

File: `references/craft-and-trade.png` · MD5 `59d1e713182625fbe4f338f33b7d9364`.

No source image; generated from the explicit design brief.

<details>
<summary>Exact generation prompt</summary>

Use case: stylized-concept. A professional game-environment art-direction reference board, landscape3:2. Six distinct high-resolution closeup architectural photographs arranged in a clean precise3column2row grid with thin warm-white gutters, no text, no numbers, no logos. Shared visual identity: Levantine bazaar, pale limestone, lime plaster, warm timber, muted indigo/teal/rust cloth, neutral bright daylight, strong believable material definition. Top left: one closed teal LOUVERED timber window with stone sill/drip and two proper hinges in thick plaster reveal. Top middle: one warm walnut DIAMOND LATTICE window with inset opaque shadow backing, carefully joined frame and same stone family. Top right: supported cream merchant AWNING attachment: masonry seat, rear ledger, diagonally braced timber rafter, bolts, rope tie and sewn hem, shown from below close enough to verify the load path. Bottom left: SPICE DRAWER counter with small named-by-shape brass tins, three grain/spice bins and a brass balance, grounded joinery, do not display letters. Bottom middle: low RUG ROLL CHEST, rolled woven rugs and bound folded stock on two shelves, crafted timber ends, no loose fabric in walking space. Bottom right: DYE SAMPLE COUNTER with ceramic glaze/color jars organized in a shallow cabinet, a rail of short indigo and madder dyed strips held by clips; distinct from rug and spice trades. Each panel is a complete convincing detail with material scale, edge thickness, joints, contact and support. No people, computer screens, white CAD geometry, clutter spilling out, fake brass noise, grunge overlay or fantastical ornament. This is intended to guide original production assets and geometry, not provide production textures. Make it look like an architectural studio's beautifully photographed material and construction study.

</details>
