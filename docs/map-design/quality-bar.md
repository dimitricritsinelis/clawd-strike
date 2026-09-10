# Bazaar Map Quality Bar

BZ-04 R7 is the approved whole-map architecture and craftsmanship design. Its target is [construction/design.json](construction/design.json): 25 zones, 100 zone faces, every target parcel/opening, roof, activity group, fixture, background and retained gameplay interface. The issue defines a design target; it does not claim that any target has been implemented or accepted.

Judge complete building composition and route readability first. Its use, storeys, bay axes, principal entrance and roof must be convincing in the neutral elevation and section. Then judge the integrated shopfront/activity and finally assemblies and material finish. Do not accept a polished sample that leaves an unowned return, exempt wall, open-side backing, roof edge, or high field unresolved.

## Readable bazaar character

The map should read as a simple, legible Counter-Strike environment. Routes, cover silhouettes, door service floors, transition mouths and elevated grades remain immediately understandable. Traditional Souq Waqif and Mutrah cues come through varied warm sandstone, sandy cream and tan plaster, timber joinery, restrained shade cloth, discreet modern utilities, and maintained use. They do not justify added routes, cover, floor stock, random clutter, or cinematic grading.

Every visible face has a deliberate final role. Merchant and workshop faces get a specific trade composition only where BZ-04 schedules a supported recess and activity group. Service walls, links, retaining walls and combat backgrounds remain quiet but complete: material field, base, coping/roof relation, closed panel or opening treatment where scheduled, and sound returns. Quiet does not mean unfinished or unassigned.

Each building has ordered, aligned openings with coordinated floor structure and plausible room relationships. Common sill/head datums apply within named room-use groups; explicitly scheduled stairs, ventilation, galleries and bedroom openings may use different proportions and levels. Symmetry is welcome. A stair, addition or trade function must explain asymmetry; arbitrary offsets are not character. Buildings must read as distinct owners. Vary plaster grain and repair geometry, stone type, joinery, roof step and limited textile accent within their scheduled parcel. Keep the palette balanced: aged plaster and stone are the base; teal, indigo and rust-red are small trade cues. Avoid uniform beige blocks, repeated cabinets, repeated repair masks, full-height grime, sepia post-process and arbitrary ornaments.

## Finished craft

Use the exact [current craft recipes](construction/craftsmanship.md) and named instance bindings. Frames have real rebates and correct grain; civic doors retain their fixed transoms; loggias retain dado, slats and depth; shelves include their brackets; furniture is assembled from members; vessels have useful profiles and interiors; plain dye samples differ from finished rugs; weaving sample frames remain visibly unfinished. Cloth field tints, bound edges, ties and rolled ends must survive export.

Judge the whole player view first, then the named close-detail pose. Repetition within a coherent house, warehouse or boundary is appropriate. Different window shapes, colors or props are not a substitute for a credible program. The requested R3 advisors inform this document revision; they do not become recurring implementation reviewers.

The user rejected R3's remaining generic compositions. A regular grid is not sufficient: each main district needs a readable leading feature and smaller useful supporting details. Check full trim-to-corner masonry, door approaches and complete vertical stacks. Selected colored-glass upper lights, carved portals and balcony/window assemblies must be visible in the drawings and the actual game; no generic rectangle may substitute for their shape, webs or depth. Ordinary rectangular openings and quiet service walls remain valid when deliberately composed.

The approved R7 design has its 100 individual window-review decisions in the [current review record](construction/reviews/r7-window-review.json). Read those decisions; do not commission a new review of unchanged approved geometry. Coherent room grouping, entrance relationships, aligned storey datums and believable corner masonry are the criteria; a material change or a different arch profile is insufficient. Shared buildings use one room registry across their faces. Ground pier grids are scoped to the ground frontage, not copied onto every storey. No root, support or doorway is accepted without its real occupied-space and contact relationship being visible in a plan, section or perspective.

## Complete construction

Every target parcel must be visible from its fixed review cameras. Build a complete opaque shell with receiving surfaces, supported roof relation, closed backs and all exposed side/return faces. Open intervals remain open. Preserve frozen collider spans, active opening envelopes, clear widths, cover, spawns and playable elevation.

Doors, windows, screens, niches, vents, counters, awnings, signs, lanterns and activity groups require their specified jambs, heads, reveals, closures, supports and ground or wall contact. Activity stays inside its scheduled recess and bbox; below 2.2 m it projects no more than 0.30 m into the street. Keep the 0.8 m door service floor and every open transition clear.

Hand finish may soften edges and plaster, never bearing lines, opening envelopes, roof boxes or protected movement geometry. Wear follows use: sweep-polish on routes, local contact at hands and feet, dye or water at its stated receiver, and drains where scheduled. The bazaar is occupied and cared for, not sterile or filthy.

## Design acceptance and end-of-build review

1. **Approved design review.** Consume the approved R7 documents and existing per-face decisions for full-face ownership, numeric consistency, construction feasibility, material/assembly completeness, camera coverage and producer replacement plan. Resolve concrete contradictions when encountered; do not repeat the approved design audit. Independent AI reviewers are used only when requested, and document approval does not establish implementation quality.
2. **Actual-game implementation review.** After a target is built, inspect it from saved before/after poses and reverse approaches in the game. Verify geometry, receivers, joins, openings, route clearance, runtime collider authority, performance and neighbour interfaces. A source export, `map:check`, or AI image is not actual-game proof.
3. **User art acceptance.** The user judges the final in-game area against the intended readable bazaar character and gameplay readability. Tooling passes and AI review do not substitute for this decision.

Implementation follows the [canonical full-map queue](construction/README.md#approved-whole-map-queue-and-readiness): a continuous build-and-integrate pass per area, followed by one consolidated review, quick targeted corrections and automatic continuation. Final user art acceptance is separate and does not require routine approval between areas. Do not insert mid-build aesthetic reviews or recurring signoff cycles. Preserve all actual correctness, gameplay and performance checks; run them at the end and rerun only affected checks after a correction.

## Before, document, after audit

Every implementation follows this bottleneck audit:

1. Save before captures, camera poses, source revision and baseline runtime authority.
2. Build and integrate the complete scheduled area; compare it to the parcel, activity and camera schedule during the consolidated end review, including unowned or duplicate visible faces.
3. Capture after from the same poses plus the scheduled reverse/context views. Inspect the complete route, including long-wall segments, high fields, returns and shared interfaces.
4. Record pass, fail, unavailable and baseline-only failures separately. Keep an area `building` or `built` until the required evidence exists; set `complete` only after actual-game validation and user art acceptance.

The construction [README](construction/README.md), [design basis](construction/design-basis.md), [details](construction/details.md) and [integration contract](construction/integration.md) provide the target-specific numbers and implementation proof requirements.
