Audience: implementation-agent
Authority: visual quality contract
Read when: map-visual or map-geometry work
Owns: Bazaar reference roles, finish criteria, and screenshot acceptance
Do not use for: task status, iteration procedure, or historical scores
Last updated: 2026-07-26

# Bazaar Map Quality Bar

## Visual target

The target is a high-quality shipped Middle Eastern bazaar, not a collection of loosely placed procedural decorations. Preserve the map's overall identity and general layout by default, while allowing a bounded section to be refined, rebuilt, or locally redesigned when that clearly improves the result.

Use [`bazaar_main_hall_reference.png`](refs/bazaar_main_hall_reference.png) for bazaar identity: layered architecture, market density, hanging cloth, stalls, facade vocabulary, and the feeling of a place built as a whole. Its dusk darkness and saturation are not lighting targets.

Use the five [`cs2_daylight_ref_1.png`](refs/cs2_daylight_ref_1.png) through [`cs2_daylight_ref_5.png`](refs/cs2_daylight_ref_5.png) images for bright desert daylight, readable shade, value separation, material clarity, and shipped-game finish. Judge the references holistically; a metric or source declaration does not outrank a visibly stronger render.

## Complete visual assemblies

Architecture and dressing should feel intentionally built together. Walls, openings, reveals, frames, windows, doors, stalls, banners, awnings, canopies, supports, thresholds, plinths, props, and ground contact should form complete assemblies.

Incomplete props and decoration systems are a major current weakness. In particular:

- Windows must feel fully framed and integrated, with resolved jambs, heads, sills, reveals, glazing or closures, and surrounding wall junctions.
- Stalls must feel complete and functional, with a credible structure, counter or display, cover, stock or dressing, support, and ground contact.
- Overhead banners, awnings, and canopies must feel attached, supported, tensioned, and finished at their edges and connection points.
- Signs, fixtures, goods, and incidental dressing must belong to the architecture or stall they serve instead of reading as disconnected add-ons.

Reject decoration that looks pasted on, under-supported, floating, clipped, paper-thin, or only partially resolved. Prefer real depth, thickness, bevels, reveals, supports, seams, fasteners, grounding, and believable load paths over flat cards or endless parameter tuning.

## Composition

Each fixed-camera view should have a deliberate foreground, middle ground, and background; clear visual anchors; useful vertical breakup; and intentional framing. Facade rhythm, overhead elements, stalls, openings, and prop clusters should reinforce one another rather than compete or leave accidental dead zones.

Local structural changes are allowed when composition needs them. Do not preserve every local shape or prop arrangement at the expense of quality, and do not infer a map-wide redesign from a bounded section task. A directly coupled shared visual system may change when it is the real cause of the visible weakness.

## Materials, assets, and detail

- Materials need correct world scale plus visible variation at large, medium, and fine scales.
- Color shifts or renamed materials do not create real diversity when they reuse the same weak source texture or surface response.
- Close-range surfaces need readable texture, roughness, normal response, edge treatment, clean junctions, and intentional wear.
- Authored hero assets, rebuilt local assemblies, higher-resolution textures, more geometry, and reasonable render-cost increases are welcome when the fixed-camera screenshots clearly improve.
- Reuse, parameterization, and instancing are useful tools, but they must not force a visibly worse result.

## Acceptance and final validation

Rendered before/after screenshots from the same fixed cameras are the primary quality signal. Accept a change when the section reads more clearly as a finished bazaar and the camera set shows a material improvement in composition, assembly, depth, and finish.

Floating or intersecting geometry, blocked openings, unsupported structures, broken load paths, exposed unfinished surfaces, placeholder-looking materials, and disconnected dressing block visual acceptance when visible in the review cameras.

Complete the visual loop before final smoke and completion QA. Performance may be checked and optimized after the section is visually finished, but it is not an intermediate veto and optimization must preserve the accepted visible improvement.
