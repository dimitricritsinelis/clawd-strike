Audience: implementation-agent
Authority: visual quality contract
Read when: map-visual or map-geometry work
Owns: reference roles, measured image bands, budgets, map locks, and finish failures
Do not use for: task status, iteration procedure, or historical scores
Last updated: 2026-07-25

# Bazaar Map Quality Bar

## Reference roles

The five CS2 daylight images are the primary references for lighting, value discipline, clarity, and finish:

- [`cs2_daylight_ref_1.png`](refs/cs2_daylight_ref_1.png): Mirage A site; primary daylight and value target. Luma 0.602, contrast 0.213, saturation 0.319.
- [`cs2_daylight_ref_2.png`](refs/cs2_daylight_ref_2.png): Anubis lane at player height; open-lane readability. Luma 0.534, contrast 0.163, saturation 0.396.
- [`cs2_daylight_ref_3.png`](refs/cs2_daylight_ref_3.png): Anubis hard shadows; luminous-shade and directional-shadow bar. Luma 0.370, contrast 0.195, saturation 0.282.
- [`cs2_daylight_ref_4.png`](refs/cs2_daylight_ref_4.png): Inferno shaded lane; covered-corridor readability. Luma 0.361, contrast 0.159, saturation 0.346.
- [`cs2_daylight_ref_5.png`](refs/cs2_daylight_ref_5.png): Inferno wall at close range; two-metre material-finish bar. Luma 0.435, contrast 0.140, saturation 0.307.

Classify each review frame by what it visibly shows and compare it only with the matching band:

| Frame class | Luma | Contrast | Saturation |
| --- | ---: | ---: | ---: |
| Sunlit wide | 0.53–0.62 | 0.14–0.22 | 0.30–0.40 |
| Shaded scene | 0.34–0.40 | 0.14–0.22 | 0.26–0.36 |
| Close-up | 0.40–0.47 | 0.14–0.22 | 0.28–0.34 |

Moderate contrast is intentional. Clarity must come from value separation and clean planes rather than contrast cranking. The target is bright, high-sun desert daylight with readable luminous shade and distance haze only.

[`bazaar_main_hall_reference.png`](refs/bazaar_main_hall_reference.png) is for theme and content only: architectural vocabulary, layered facades, dense market dressing, and hanging cloth. Its dusk mood, darkness, and saturation are not targets.

## Performance budgets

Measure the fixed review cameras with the ship profile. FPS is not a substitute for frame time.

| Profile | Draw calls | Triangles | Median frame time | Boot-ready time |
| --- | ---: | ---: | ---: | ---: |
| Desktop | ≤ 1,500 | ≤ 2.2M | ≤ 12.5 ms | < 10 s |
| Mobile | ≤ 500 | ≤ 1.3M | No separate absolute cap; pass the focused mobile gate | < 10 s |

Crossing any applicable budget is a hard failure. A stricter hard limit named by the active brief also applies.

## Locked gameplay surfaces

- Layout, collision, traversal surfaces, spawns, sightlines, cover, and authored routes are locked during map-visual work.
- Changing a locked surface requires an explicit map-geometry scope and its full validation route.
- Render-only changes must not alter player or bot grounding, navigation, projectile collision, LOS, opening clearance, or route width.
- Fixed-camera polish does not justify moving gameplay geometry.

## Production-quality close-range finish

Production quality means real textured PBR materials with world-scaled UVs; correct physical scale; readable roughness, normal, and material separation; grounded contact; finished edges, backs, supports, fasteners, and attachments; and clean junctions without gaps or halos. Repeated families must retain deterministic, parameterized variation and plausible architectural placement. Flat-color or placeholder-reading surfaces at player height do not meet the bar.

Judge the final rendered result, not just source declarations or placement metadata. Visible mesh intersections, floating geometry, blocked doors or windows, unsupported structures, broken load paths, and exposed unfinished geometry are hard failures.
