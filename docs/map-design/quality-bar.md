Audience: implementation-agent
Authority: visual quality contract
Read when: map-visual or map-geometry work
Owns: Bazaar reference roles, finish criteria, and screenshot acceptance
Do not use for: task status, iteration procedure, or historical scores
Last updated: 2026-08-17

# Bazaar Map Quality Bar

## Visual target

The target is a high-quality shipped Middle Eastern bazaar, not a collection of loosely placed procedural decorations. Preserve the map's overall identity and general layout by default, while allowing a bounded section to be refined, rebuilt, or locally redesigned when that clearly improves the result.

Use [`bazaar_main_hall_reference.png`](refs/bazaar_main_hall_reference.png) for bazaar identity: layered architecture, market density, hanging cloth, stalls, facade vocabulary, and the feeling of a place built as a whole. Its dusk darkness and saturation are not lighting targets.

Use the five [`cs2_daylight_ref_1.png`](refs/cs2_daylight_ref_1.png) through [`cs2_daylight_ref_5.png`](refs/cs2_daylight_ref_5.png) images for bright desert daylight, readable shade, value separation, material clarity, and shipped-game finish. Judge the references holistically; a metric or source declaration does not outrank a visibly stronger render.

## Design review model

Use **Purpose → Order → Exception → Evidence → Readability**. Every visible choice should feel either intentionally designed or causally inevitable.

- **Purpose and hierarchy:** Explain what the space is for, who built, uses, adapts, and maintains it, and what is visually primary, supporting, and quiet.
- **Place and continuity:** Give each district a legible function and identity within one cultural/construction grammar; rooftops, boundaries, vistas, and non-playable context should imply a larger city rather than a stage set.
- **Ordered bones:** Permanent architecture establishes human scale, proportion, axes, datum lines, bays, opening rhythm, alignment, repeated families, structural logic, and local symmetry where planned construction calls for it.
- **Justified exceptions:** Break that order only for a legible cause such as circulation, terrain, ownership, phased construction, commerce, climate response, repair, or daily occupation.
- **Correlated variation:** Repeat enough to establish a grammar, then vary a bounded subset by role and location. Prefer clustered use-driven differences over independent jitter, exact cloning, evenly distributed clutter, or making every instance unique.
- **Physical and historical evidence:** Supports, access, storage, drainage, shade, ventilation, wear, staining, damage, and repairs should follow construction, gravity, water, sun, traffic, touch, material behavior, and maintenance.
- **Readability and sequence:** Massing, silhouette, landmarks, thresholds, compression and reveal, value/light hierarchy, density gradients, transitions, and negative space should make the place and route understandable.

Review macro before meso before micro: massing, identity, and spatial sequence; then facade rhythm, assemblies, and use; then materials, joints, wear, and prop craft. Do not hide weak architecture with detail.

These are holistic judgment lenses, not numeric gates. Symmetry is evidence of design; asymmetry is evidence of site, history, adaptation, or use. A coherent irregular composition can beat a perfect grid, and disciplined repetition can beat forced novelty. Randomness without provenance is noise.

## Facade composition

A wall is a designed thing before it is a textured thing. For every frontage a player reads, decide from the plan — not from a corridor screenshot — what the wall faces, where people enter and look, and what the primary axis is; then place openings so the placement has a legible logic:

- **Axis and entrance:** the main opening sits on the axis of the space it serves or faces the approach that uses it (a storage door where carts turn in, a shop where the lane widens), not wherever a spacing rule left room.
- **Corners:** never jam an opening against a corner. Hold a solid pier of wall at each end, frame the ends with pilasters or quoins, or declare and justify the exception.
- **Pairs, rhythm, alignment:** repeat openings as mirrored pairs about the axis or as a marching rhythm at one spacing; align upper openings over lower ones and, where two walls face each other or meet, relate their datums and bays. Alignment to something visible is what makes symmetry read as design.
- **Walls without doors** still need a reason and articulation: a service face is blank because access is elsewhere, and says so with niches, vents, pilasters, a string course, drainage, or wear at the right places — not with nothing, and not with a door pasted on to fill the void.
- **Generated versus authored:** `layoutIntent.mode: "generated"` spreads modules evenly between the edge margins by rhythm and is acceptable only for quiet backdrops. Anything the player reads should be `authored`: named columns, declared mirrors about an axis, a declared corner treatment, and one sentence stating the ordering idea, checked by the same physical grammar.
- **A swap is not a design:** changing a facade profile, material, or rhythm without deciding where openings belong resolves nothing about intent or order, even when the result beats a blank wall in a blind comparison.

## Complete visual assemblies

Architecture and dressing should feel intentionally built together. Walls, openings, reveals, frames, windows, doors, stalls, banners, awnings, canopies, supports, thresholds, plinths, props, and ground contact should form complete assemblies.

Incomplete props and decoration systems are a major current weakness. In particular:

- Windows must feel fully framed and integrated, with resolved jambs, heads, sills, reveals, glazing or closures, and surrounding wall junctions.
- Stalls must feel complete and functional, with a credible structure, counter or display, cover, stock or dressing, support, and ground contact.
- Overhead banners, awnings, and canopies must feel attached, supported, tensioned, and finished at their edges and connection points.
- Signs, fixtures, goods, and incidental dressing must belong to the architecture or stall they serve instead of reading as disconnected add-ons.

Reject decoration that looks pasted on, under-supported, floating, clipped, paper-thin, or only partially resolved. Prefer real depth, thickness, bevels, reveals, supports, seams, fasteners, grounding, and believable load paths over flat cards or endless parameter tuning.

## Composition

Each review view should have a deliberate foreground, middle ground, and background; clear visual anchors; useful vertical breakup; and intentional framing. Facade rhythm, overhead elements, stalls, openings, and prop clusters should reinforce one another rather than compete or leave accidental dead zones.

Local structural changes are allowed when composition needs them. Do not preserve every local shape or prop arrangement at the expense of quality, and do not infer a map-wide redesign from a bounded section task. A directly coupled shared visual system may change when it is the real cause of the visible weakness.

## Materials, assets, and detail

- Materials need correct world scale plus visible variation at large, medium, and fine scales.
- Color shifts or renamed materials do not create real diversity when they reuse the same weak source texture or surface response.
- Close-range surfaces need readable texture, roughness, normal response, edge treatment, clean junctions, and intentional wear.
- Authored hero assets, rebuilt local assemblies, higher-resolution textures, and more geometry may support a stronger result when the review screenshots clearly improve.
- Reuse, parameterization, and instancing are useful tools, but they must not force a visibly worse result.

## Visual acceptance

Rendered before/after screenshots from the same deterministic camera poses are the primary quality signal. A stronger result reads more clearly as a finished bazaar and shows a material improvement in composition, assembly, depth, and finish.

Floating or intersecting geometry, blocked openings, unsupported structures, broken load paths, exposed unfinished surfaces, placeholder-looking materials, and disconnected dressing block visual acceptance when visible in the review views.
