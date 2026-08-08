Audience: implementation-agent
Authority: active implementation queue
Read when: executing the current Bazaar polish wave
Owns: the ordered system-driven polish queue and its wave authorizations
Do not use for: workflow policy (see the map-polish skill), quality criteria (see quality-bar.md), or history (see archive/)
Last updated: 2026-08-08

# Bazaar System-Driven Polish Queue

The 2026-08-05 final-gate audit of the completed [section queue](archive/map-polish-queue-sections-2026-08-05.md) found that the remaining gap to the quality bar is carried by a small set of shared visual systems, not by any one section: independent per-area critics converged on the same causes in every district. This queue works those systems directly, ordered by map-wide impact. Fixing one card improves every camera that system serves.

Work one card at a time, in order, using the map-polish skill loop with the card's named cameras as the fixed review set. A card's boundary is the system wherever it appears in the map — touching every section a system serves is the point of this wave, while layout, traversal, and gameplay remain protected by `AGENTS.md`. Leave the checkbox clear until the card's complete-when line is met in the rendered evidence. If a card stalls under the skill's stop rule before that line is met, record the remaining gap in a short note under the card, leave its box unchecked, and move to the next card; stalled cards are decided at the final owner review, not by grinding further rounds.

## Wave authorizations

These owner decisions are pre-approved for this wave. They remove known blockers; use them when a card needs them.

- Performance budgets serve the frame, not the reverse. Triangle and draw-call ceilings in the QA acceptance config, and per-prop unit-test budgets, may be raised when the change visibly improves the review cameras and the `qa:completion` frame-time median stays within 12.5 ms (currently 7.2 ms).
- Selective texture promotion to 2k is approved for any material where 1k is the visible ceiling in a review camera. Both 1k enforcement points may be updated with the same explicit allowlist — the capture harness's 1k policy and the model-variant quality pin in `apps/client/scripts/lib/asset-provenance.test.mjs`. The map-wide default stays 1k.
- Exiting the sealed legacy composition-waiver archive is approved. When a card must change a waived frontage, perform the supported wholesale exit: convert all legacy waivers in `docs/map-design/specs/composition_waivers.json` to `approval.status: "approved"` with the approver recorded as the owner and this queue as the ticket reference, set `legacyMigration.recordCount` to zero, and update `legacyMigration.recordsSha256` to the hash of the now-empty legacy record set (sha256 of an empty JSON array: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`), keeping `legacyMigration.closed` true, per the schema and `apps/client/scripts/lib/composition-waivers.mjs`.
- Sun direction is settled. The azimuth trade-off was measured both ways; leave `SUN_POS` as is and do not spend rounds re-tuning it.
- Capture reliability: a shot that fails inside a batch capture must be retried solo before it is treated as a map regression, and builds must not run concurrently with captures.

## P1 - Pier, post, and trim material identity

- [ ] Complete
- Boundary: The pale straw/plank-reading trim material family wherever it wraps piers, pilasters, arcade posts, gate corners, and portal-flanking posts across the map — including the Textile Arcade's tall reed-looking wall panels and the B Spawn portal post cladding (the two REVISIT notes carried over from the section queue).
- Primary camera: `SHOT_04_TEXTILE_ARCADE`
- Supporting cameras: `SHOT_12_SPAWN_B_RETURN`, `SHOT_09_RUG_GATE`, `AUDIT_02_SPAWN_B_SOUTH_FRONTAGES`
- Targets: [08](visual-targets/08-textile-arcade-south-compression/target.jpg), [17](visual-targets/17-b-spawn-main-entrance-and-return/target.jpg), [09](visual-targets/09-rug-gate-hero-approach/target.jpg)

Direction:

1. Trace the actual emitters first — the section queue twice corrected adjacent materials without moving these surfaces, so the cladding has its own assignment path.
2. Replace the source with masonry, plaster, or timber that matches the architecture each element belongs to, at correct world scale.
3. Keep seeded variation between repeated members so no two adjacent piers read identical.

- Likely ownership: `apps/client/src/runtime/map/wallDetailFamilies/kitMaterials.ts`; `apps/client/src/runtime/map/wallDetailKit.ts`; `apps/client/src/runtime/map/v3Architecture.ts`; the prop family that clads the B Spawn portal posts

Complete when: No pier, post, or trim in the four cameras reads as unfinished pale planking, and both archived REVISIT notes are visibly resolved.

Stalled 2026-08-08 — partial. Resolved and confirmed by blind critic on all four cameras: the whole
boundary-finish trim family (corner piers, gate corners, terminal returns, copings, base courses,
cornice fascias) was instancing one unit-box UV set at wildly different scales, which squeezed the
coursing into vertical streaks and produced the pale straw planking on every tall thin member —
including the B Spawn portal post cladding REVISIT note, now coursed masonry. Both Rug Gate throat
posts were also fixed (projected UVs plus a sandstone-family tint and boost); a second critic pass
confirmed the family and course scale, and a third round lifted them out of the shade muddiness that
pass found. Remaining gap: the Textile Arcade bay faces (`SHOT_04`, frame-left and each bay down the
left arcade) still read as vertically smeared pale planking. The emitter is confirmed by material
substitution to be the `arch_pointed_frame` surface of `ARCH_FRONTAGE_TEXTILE_ARCADE_*_GROUND_*`, but
two attempts failed to move it: swapping its source to `ph_sandstone_blocks_05` with a seeded per-bay
tone, and reserving the shader's plan-projection branch for genuinely horizontal faces. Both were
restored. The striping is constant down the surface's height while the macro noise varies with it,
which points at the UV path for that one bucket rather than at the material. Worth a fresh look with
the frame's normals and batch UVs inspected directly in the running game.

## P2 - Kit timber surface response

- [x] Complete
- Boundary: Every kit-built timber element map-wide — lattices, shutters, screens, window frames, pergola members — whose surface response, not shape, is the defect.
- Primary camera: `SHOT_13_CLOSEUP_MERCHANT_FACADE`
- Supporting cameras: `SHOT_11_SPICE_CANOPY`, `AUDIT_07_SPICE_WEST_ELEVATION`
- Targets: [01](visual-targets/01-spice-street-west-merchant-frontage/target.jpg), [03](visual-targets/03-spice-street-overhead-canopy-system/target.jpg)

Direction:

1. Remove the metallic/low-roughness response that currently reads as copper-pink plastic under sun.
2. Fix the vertically smeared UVs so grain follows each member's length at a believable scale.
3. Add restrained tone variation between members so assemblies read as built, not extruded.

- Likely ownership: `apps/client/src/runtime/map/wallDetailFamilies/kitMaterials.ts`; `apps/client/src/runtime/map/wallDetailFamilies/windows.ts`

Complete when: Closeup timber reads as dry weathered or painted wood with directional grain, in sun and in shade.

Done 2026-08-08. The copper-pink read was never gloss or albedo: kit timber carried 7-9x the
plaster's `envMapIntensity`, so a large share of each member's light arrived as a warm sky
reflection laid over the whole surface. Cutting that (`Game.ts`), halving the arris catch, and
darkening the merchant frame tint resolved it; a blind review preferred the result on all three
cameras and measured the highlight now desaturating like a dielectric rather than gaining
saturation like metal. Repeated members also carry a seeded per-member tone so a run of shutters or
shelves is no longer one albedo. Two items carried forward rather than closed: the tier value
scales were left as they were, because three sweeps that raised them toward the target's measured
luminance all read worse (at target value this family's red bias reads as copper, and desaturating
it there reads as mauve) — shaded timber therefore still sits under the target, which is the shade
deficit P5 owns; and per-member texel density (direction 2) was not touched, so a 52 mm bar and a
2 m panel still share one tile scale per finish tier.

## P3 - Door family rebuild

- [ ] Complete
- Boundary: The shared ground-floor door meshes and materials everywhere they instance — currently flat grey slabs with no construction.
- Primary camera: `SHOT_13_CLOSEUP_MERCHANT_FACADE`
- Supporting cameras: `SHOT_08_DYERS_DOGLEG`, `AUDIT_03_SERVICE_SOUTH_EAST_FRONTAGE`, `AUDIT_05_DYERS_ALLEY_EAST_FRONTAGE`
- Targets: [01](visual-targets/01-spice-street-west-merchant-frontage/target.jpg), [12](visual-targets/12-dyers-dogleg-residential-turn/target.jpg), [14](visual-targets/14-service-south-utility-frontage/target.jpg)

Direction:

1. Rebuild the family as planked timber doors with battens, edge framing, and visible hardware, seated in their existing jambs and thresholds.
2. Give each instance seeded variation in tone and wear so repeated doors along a lane differ.
3. Keep recess depth and dark backing so closed doors still read as openings, not wall decals.

- Likely ownership: `apps/client/src/runtime/map/wallDetailFamilies/kitCore.ts`; `apps/client/src/runtime/map/wallDetailFamilies/doors.ts`

Complete when: No camera shows a flat featureless door slab; every visible door reads as a built, hung assembly.

Stalled 2026-08-08 — partial, and the accepted work is kept: a blind review preferred the result on
three of the four cameras and found none worse. What landed: the leaf and the reveal now carry
separate tints, so the jambs and head read as a mouth while the leaf sits at timber value instead of
absorbing the doorway's darkness into its own albedo (which had crushed every board, rail and fitting
to the same near-black); strap hinges with pintles on the hanging stile; joinery layers spread across
the depth envelope so the frame stands ~12 mm proud of the boards rather than 5.6 mm; and a wider
board-tone spread. The hero door in `SHOT_13` now reads as framed, rail-divided and hung.

Remaining gap: the leaf FACES are still flat. Measured, a leaf panel varies about ±2/255 across its
whole area, so neither the plank vertex tones nor the board relief in
`createPaneledDoorGeometry` reach the render at all — three separate changes to those tones and
offsets moved the rendered leaf by nothing, while changes to the same geometry's hardware and framing
showed up immediately. That points at the vertex-colour or per-instance-tint path for the
`door_panel_*` buckets rather than at the geometry, and it is the thing to establish first. Worst
cases: the `AUDIT_03` centre-left double gate and the narrow gate right of it (both
`timber_coverage_closure`), and the `SHOT_08` background doors. One caution recorded on the way: the
first version of the strap hinges used 8-segment cylinder pintles and stalled the runtime's first
frame — `SHOT_13` froze at frameCounter 16 and failed camera verification. This family instances
across every frontage, so its per-leaf part count is the budget that matters.

## P4 - Canopy, awning, and textile system

- [ ] Complete
- Boundary: All overhead cloth — canopies, awnings, banners — plus the rigging that carries it, map-wide.
- Primary camera: `SHOT_15_CLOSEUP_CANOPY_ATTACHMENT`
- Supporting cameras: `SHOT_11_SPICE_CANOPY`, `SHOT_04_TEXTILE_ARCADE`, `SHOT_02_SPAWN_A_TO_BAZAAR`
- Targets: [03](visual-targets/03-spice-street-overhead-canopy-system/target.jpg), [08](visual-targets/08-textile-arcade-south-compression/target.jpg)

Direction:

1. Replace the single blank cream cloth source with a small woven/striped family (CC0, recorded with provenance in the owning manifest), assigned with seeded variety.
2. Give spans thickness, stitched hems, and believable sag; kill the paper-card read.
3. Carry every span through visible ropes, rings, or timber to real anchor points — the primary camera exists to prove attachment and currently fails on its own subject.

- Likely ownership: texture pack manifests; `apps/client/src/runtime/map/propFamilies/signsAwnings.ts`; `apps/client/src/runtime/map/wallDetailFamilies/awningsFixtures.ts`; `apps/client/src/runtime/map/buildProps.ts`

Complete when: The attachment closeup shows a supported, tensioned, finished span, and no blank cream sail remains in any camera.

Stalled 2026-08-08 — the cloth clause is met, the attachment clause is not; the accepted work is kept
(blind review preferred it on all four cameras). Two woven shade-cloth bolts replace the single blank
sheet the long spans drew — project-original, provenance recorded in the textiles `sources.json`, with
warp, weft, slub and narrow selvedge stripes, assigned so neighbouring plain spans never share a bolt.
The review counted 16-20 legible stripe lines per span against 3-7 before, and confirmed `SHOT_15` and
`SHOT_11` no longer read as blank sails. Adding the two cloth URLs to the QA direct-texture inventory
also cleared a pre-existing `test:map-runtime` failure, since the sheet they replaced had never been
listed there.

Remaining gap on attachment: the intermediate lashings added along each wall edge do read as cordage
over the ledger, but the review still finds nothing that visibly *ties* the cloth's hem to the timber
corbels, no point-load pucker anywhere on the span, and the near/left free edge in `SHOT_15`
terminating in mid-air with no batten or anchor — that edge is the most exposed and least finished
thing in the frame. Also carried forward: overhead cloth is monochrome cream/ochre map-wide where the
targets alternate saturated bolts against the cream, and the free edges are clean geometric arcs with
no weighted hem, fringe or repair. Note `buildProps.test.ts` still expects 16 canopy corner ties and
the fixture now builds 24 — a stale count from before this card, worth reconciling in the sweep.

## P5 - Shade, occlusion, and grounding light pass

- [ ] Complete
- Boundary: The global light model as it affects shade readability — ambient/environment balance, occlusion, prop-cast shadows, opening interiors, and contact darkening. This is a light-model card, not a per-section tuning card.
- Primary camera: `SHOT_03_FOUNTAIN_COURT`
- Supporting cameras: `SHOT_07_COVERED_DYERS_SOUK`, `SHOT_02_SPAWN_A_TO_BAZAAR`, `SHOT_13_CLOSEUP_MERCHANT_FACADE`
- Targets: [06](visual-targets/06-fountain-court-hero-composition/target.jpg), [11](visual-targets/11-covered-dyers-souk-arcade/target.jpg)

Direction:

1. Extend cast shadows to the major shade-makers — canopies, palms, large props — so sunlit ground carries their shapes; watch the frame-time median per change, since shadow casters are the one cost class in this wave that can move it. Running `pnpm qa:completion` mid-card to read that median is the intended exception to the skill's finish-checks-once rule.
2. Add contact darkening where objects meet the ground so nothing floats on bright paving.
3. Resolve black-void shop openings with lit interior backing values and depth, not emissive surfaces.
4. Keep the bright desert key and current sun direction; the goal is luminous, occupied shadow, not a darker map.

- Likely ownership: `apps/client/src/runtime/game/Game.ts`; `apps/client/src/runtime/render/Renderer.ts`; `apps/client/src/runtime/render/models/PropModelLibrary.ts` shadow flags; opening-backing geometry in `v3Architecture.ts`

Complete when: Shade zones read as luminous occupied shadow rather than grey mud, openings show interior depth instead of pure black, and props sit in their own contact shadows.

Stopped mid-card 2026-08-08 at the owner's request; the wave was halted here, so P6-P10 were not
started. What landed on this card:

- The most useful finding: the "black-void openings" are **not** missing interior geometry. Probed
  live in `SHOT_07`, every black rectangle is a *timber* surface — `ordinary_door`, `window_screen`,
  `covered_arcade_return_screen`, `grammar_served_boundary_varied_closure` — crushed to black by the
  kit timber tier value scales. The voids and recess interiors sit behind them and were never what
  the camera was seeing. This card's third direction and P2's carried-forward shade-value gap are one
  problem, not two.
- Acting on that, the `timber-screen` tier went 0.10 -> 0.20 with its chroma held at 0.86 — the
  pairing P2 had already validated as the point where the tier shows depth without going copper.
  Screened windows in `SHOT_07` now read as grilles with depth behind them instead of black slots.
- Interior backing values were raised out of the near-black they sat at (one was `0x151713`, which the
  recess finish's 0.34 multiplier took to effectively zero), and the six shared opening-void materials
  moved off one cool near-black to a warm dim interior value. Correct in principle, but they did not
  move the review cameras, for the reason above.

Not started: cast shadows for the remaining shade-makers (direction 1) and contact darkening for
props that are not compiled dressing placements (direction 2 — the existing `prop-ground-contact`
disc only reaches compiled placements with a footprint over 0.34 m, which is why the fountain, palms,
barrels and carts still sit without a contact seam). `pnpm qa:completion` passes with no shadow
casters added, so direction 1 still has its full frame-time headroom: 838 draws, 2.096M tris,
7.6 ms median against a 12.5 ms budget.

Resumed and stalled 2026-08-08 — partial; the accepted work is kept. The plaster environment
response had a source mismatch: the measured `0.28` / `0.24` kit/detail values documented beside
the constants had never replaced the old `0.10` / `0.08` values. Correcting that was preferred by
a blind critic on all four fixed cameras (decisively in `SHOT_07` and `SHOT_13`): shaded plaster and
storefront planes now carry readable midtones while the bright desert key remains unchanged.

The next two separable rounds both failed to improve the fixed set and were restored, triggering the
skill stop rule: sizing the palm contact decal from its planter support instead of its crown envelope
was visually indistinguishable, and restoring the renderer's bounded three-frame shadow refresh did
not change any cast-shadow shape. The review confirms that canopy, palm, fountain, cart, and barrel
casters are already present; the remaining gap is articulation, not missing flags. Openings in
`SHOT_13` still approach black because foreground timber closures cover the authored lining, and the
Fountain Court palm/building/contact shadows still merge into one broad dark mass. Those gaps and
stronger local prop grounding remain for the final owner decision.

## P6 - Hero gate dressing

- [ ] Complete
- Boundary: The dressing of both hero gates — the Spawn A / Spice gate and the Rug Gate — gables, crenellation, and inlay, inside their existing silhouettes and open throats.
- Primary camera: `SHOT_09_RUG_GATE`
- Supporting cameras: `SHOT_02_SPAWN_A_TO_BAZAAR`, `AUDIT_01_SPAWN_A_NORTH_FRONTAGES`
- Targets: [09](visual-targets/09-rug-gate-hero-approach/target.jpg), [05](visual-targets/05-a-spawn-main-exit-facade/target.jpg)

Direction:

1. Texture the pale untextured gable faces to match their stone coursing and material scale.
2. Seat the crenellation so it belongs to the parapet instead of hovering above it.
3. Replace the flat teal decal accents with recessed carved or tiled inlay that has real depth and restrained color.

- Likely ownership: `apps/client/src/runtime/map/propFamilies/spiceGate.ts`; `apps/client/src/runtime/map/propFamilies/gateDressing.ts`

Complete when: Both gates read as authored stone hero assemblies from their cameras, with no untextured face, floating cap, or pasted-on accent.

Stalled 2026-08-08 — partial; the accepted work is kept. The Spawn A / Spice gate already passed
the fixed review as a textured, open-throated stone assembly. On the Rug Gate, all thirteen pale
plaster-inherited tympanum courses now use world-projected `sandstone_blocks_05`; the per-course rake
stones sit fully on their supports; and a continuous projecting cornice, two shoulder bonds, and an
apex bond close the stepped pediment. Blind review clearly preferred the coursed gable and then the
bonded cornice in `SHOT_09`, with both support cameras unchanged and both throats preserved.

The broad flat teal shapes were also split into one restrained deterministic glazed-tile draw,
jointed bands, dark beds, and smaller stone-bezeled medallions. This was the best retained inlay state,
but it still reads too shallow against the chalk-pale lower fascia to clear the pasted-accent clause.
The next two revisions both failed and were restored, triggering the map-polish stop rule: a deep
rectangular stone frame read as two attached placards, while true cut-through recesses made the tile
band convincing but clipped the medallions into turquoise crescents and lost the round motif. The
remaining owner decision is whether to accept the restrained relief or fund a deeper rebuild of the
lower crown/entablature so the mosaic can be cut into newly authored masonry rather than layered on
the current radial spandrel.

The retained tile family raises the focused Rug Gate from the former 4,200-triangle ceiling to a
measured 5,118 (tight pre-approved ceiling: 5,200) and adds one draw. `pnpm typecheck`, the focused Rug
Gate/runtime regressions, and all five `smoke:game` checks pass, including canonical traversal. A
transient `SHOT_13` runtime-state timeout failed the first completion run and its required solo retry;
the clean rerun passed all 3 routes and 16 shots at 847 desktop draws, 2.110M triangles, and 7.3 ms
median (403 / 1.240M / 6.9 ms mobile), below the authorized 12.5 ms ceiling. Evidence:
`artifacts/playwright/map-shots/P6-best-stalled/` and
`artifacts/playwright/completion-gate/2026-08-08T18-22-30-654Z/`.

## P7 - Floor system rebuild

- [x] Complete
- Boundary: Lane and court floor materials, macro variation, and zone transitions map-wide.
- Primary camera: `SHOT_14_CLOSEUP_PROP_GROUNDING`
- Supporting cameras: `SHOT_03_FOUNTAIN_COURT`, `SHOT_10_NORTH_COURT`, `SHOT_06_CARAVAN_RAMP`
- Targets: [04](visual-targets/04-spice-street-ground-cover-and-thresholds/target.jpg), [13](visual-targets/13-north-court-release/target.jpg), [15](visual-targets/15-caravan-court-ramp-and-loading/target.jpg)

Direction:

1. Rebalance the sunlit cobble so it reads as warm laid stone instead of bleached noise.
2. Break visible tiling repeats with macro variation and authored wear rather than uniform grime.
3. Move courts to a calm flagstone-class material so courts and lanes have distinct floor identities.
4. Author zone seams as curbs, thresholds, or material steps instead of hard texture edges.

- Likely ownership: `apps/client/src/runtime/map/buildPbrFloors.ts`; `apps/client/src/runtime/map/floorWearDecals.ts`; texture pack manifests; `apps/client/src/runtime/render/materials/FloorMaterialLibrary.ts`

Complete when: Floors show a laid-stone identity per district with no visible repeat pattern or unauthored hard seam in the cameras.

Done 2026-08-08. The accepted fixed set separates the reviewed districts into three deliberate
laid-stone systems: Spice Street now owns a warmer, larger-scale `spice_laid_stone_01`; Fountain Court
uses the tighter coursed flagstone scale; and North Court keeps the calmer broad limestone grid. The
court manifest now points at the project-owned `court_flagstone_01` source with an honest 2k fallback
instead of reusing the lane cobble, while the fountain apron matches its surrounding paving scale.
The prop-grounding closeup also lost the broad grey contact wash beneath its low-profile rug; the rug
still receives the real shadows and the goods retain their compact contact decals.

Blind review preferred the final Spice pass and marked all four fixed cameras PASS: `SHOT_14` gained a
clear warm laid-stone identity without an obvious repeat, and `SHOT_03`, `SHOT_10`, and `SHOT_06`
retained their accepted seams and district identities. `pnpm typecheck`, map generation checks, the
focused material/contact regressions, and all twelve canonical final traversal checks pass. The
completion gate passed all three routes and sixteen cameras at 850 desktop draws, 2.110M triangles,
and 7.4 ms median (403 / 1.240M / 7.2 ms mobile). Evidence:
`artifacts/playwright/map-shots/P7-a6/` and
`artifacts/playwright/completion-gate/2026-08-08T19-09-02-453Z/`.

## P8 - Water and vegetation

- [ ] Complete
- Boundary: The fountain water surface and every palm and planter planting map-wide.
- Primary camera: `SHOT_16_CLOSEUP_FOUNTAIN_MATERIAL`
- Supporting cameras: `SHOT_03_FOUNTAIN_COURT`, `SHOT_10_NORTH_COURT`
- Targets: [07](visual-targets/07-fountain-basin-material-and-ground-transition/target.jpg), [06](visual-targets/06-fountain-court-hero-composition/target.jpg)

Direction:

1. Rework the water as shaded basin water — darker, desaturated, with a subtle normal response, Fresnel, a wetted edge, and no visible UV seam.
2. Add at least one more palm silhouette variant and seed rotation and scale so no two identical palms share a frame.
3. Resolve planter soil, rim, and trunk contact so plantings read as grounded assemblies.

- Likely ownership: `apps/client/src/runtime/map/propFamilies/fountain.ts`; `apps/client/src/runtime/map/buildDecorativePalms.ts`; `apps/client/src/runtime/render/models/PropModelLibrary.ts`

Complete when: The water closeup reads as believable still basin water and no camera contains two identical palm instances.

Stalled 2026-08-08 — no revision was retained. The current water path already has a scrolling
procedural normal, view-dependent Fresnel, transmission, restrained specular response, and a separate
wetted basin contact. Each fixed camera also contains at most one palm, and the two authored palms
already receive anchor-ID-seeded trunk, crown, frond, rotation, and scale variation. The fixed set
therefore does not expose an identical pair, but the close review remains split on whether the bright
cyan/mosaic pool reads as shaded water or as the lining seen through a nearly clear lid.

Two water-only revisions were captured and restored as visual ties, triggering the map-polish stop
rule. The first conservatively lowered transmission and saturation; the second made absorption and
surface tint strong enough to change the light path. Neither produced a clear preference in
`SHOT_16`, while both support cameras were unchanged. The remaining causes are now narrow: the
procedural ripple uses non-periodic wave terms despite repeat wrapping, so its normal field has a
measurable wrap-edge discontinuity; pools and thin jets share one material, constraining deeper basin
absorption; and the two palms still share one fixed 14/12/10-frond whole-crown recipe even though their
individual matrices differ. Their soil top also stops 17.5 mm below the trunk base. A future pass
should start with a seam-safe toroidal normal and two deterministic whole-crown profiles, not more
global optical nudging. Evidence: `artifacts/playwright/map-shots/P8-before/`,
`artifacts/playwright/map-shots/P8-a1/`, and `artifacts/playwright/map-shots/P8-a2/`.

## P9 - Named finish defects

- [x] Complete
- Boundary: Four located defects plus a like-kind sweep: the North Court checkerboard floor patch, the Tea Terrace z-fighting streaks, the Covered Souk floating rug, and the Service South bright metallic flashing band.
- Primary camera: `SHOT_10_NORTH_COURT`
- Supporting cameras: `SHOT_05_TEA_TERRACE`, `SHOT_07_COVERED_DYERS_SOUK`, `AUDIT_03_SERVICE_SOUTH_EAST_FRONTAGE`
- Targets: [13](visual-targets/13-north-court-release/target.jpg), [16](visual-targets/16-tea-terrace-elevated-route/target.jpg)

Direction:

1. Fix each named defect at its cause (coplanar surfaces, misassigned material, unseated prop) rather than hiding it with dressing.
2. Then capture the wave review set once (`SHOT_01`–`SHOT_16` plus `AUDIT_01`–`AUDIT_07`, selected via explicit `SHOT_IDS`) and sweep it for the same defect classes — z-fighting, floating props, material misassignments — fixing what the sweep finds.

- Likely ownership: follows each defect; expect `buildPbrFloors.ts`, `v3Architecture.ts`, and the owning prop families

Complete when: All four named defects are gone and the sweep finds no remaining defect of the same classes.

Done 2026-08-08. Each defect was repaired at its owning cause. The overlapping North-East connector
now inherits North Court's flagstone instead of exposing an L-shaped checked cobble remainder; the
Tea Terrace's render-only retaining volume stops 2 cm below its authoritative paving plane, removing
the coplanar streaks without changing elevation or collision; and all eight cover-goods layouts now
use deterministic seed variants with their flexible tarps seated on supporting crates. Quiet-
residential rooflines use one wall-material masonry course rather than a three-part molded plinth, so
the long Service South cornice no longer reads as bright metal flashing.

The required 23-camera sweep found one like-kind authority error at the North-West connector. It now
matches the large sandstone shared by Tea Landing and Spawn B Courtyard, removing the second isolated
checked material tongue. Fresh blind review marked all 23 final sweep cameras PASS for z-fighting,
floating props, and accidental material islands. `pnpm typecheck`, generated-map freshness, the
focused material/architecture/cover regressions, and all twelve canonical final traversal checks
pass. The completion gate passed all three routes and sixteen shots at 841 desktop draws, 2.109M
triangles, and 7.3 ms median (403 / 1.239M / 7.3 ms mobile). Evidence:
`artifacts/playwright/map-shots/P9-final/` and
`artifacts/playwright/completion-gate/2026-08-08T20-12-48-988Z/`.

## P10 - Skyline and top-down integration

- [ ] Complete
- Boundary: The perimeter belt, visible roofs, fog depth, and establishing composition — a final integration pass after the wave's material and light changes, with traversable layout excluded as always.
- Primary camera: `SHOT_01_TOPDOWN_ESTABLISHING`
- Supporting cameras: `SHOT_02_SPAWN_A_TO_BAZAAR`, `SHOT_12_SPAWN_B_RETURN`
- Targets: [19](visual-targets/19-perimeter-rooftops-and-skyline-integration/target.jpg)

Direction:

1. Rebalance roof and perimeter palettes against the wave's corrected materials so districts stay distinct from above.
2. Tune fog and depth layering so the skyline frames the play space at eye level without flattening it.
3. Keep perimeter-shell detail lean — background roof clutter has previously stalled the runtime's first frame, and only the merchant-facade closeup capture catches it, so recapture `SHOT_13_CLOSEUP_MERCHANT_FACADE` after any perimeter geometry change.

- Likely ownership: `apps/client/src/runtime/map/buildBlockout.ts`; `apps/client/src/runtime/render/DesertSky.ts`; `apps/client/src/runtime/render/Renderer.ts`; `apps/client/src/runtime/game/Game.ts`

Complete when: The establishing view reads as one coherent old city under the wave's light, and all captures — including the merchant-facade closeup — still pass.

Stalled 2026-08-08 — no revision was retained. Two separable rounds failed to produce a clear
fixed-set improvement and were fully restored, triggering the map-polish stop rule. The first moved
playable roofs into restrained construction-family tint bands and reduced the background roof deck
to the existing worn-plaster pair; blind review preferred the baseline in `SHOT_01` because the
result became one dark embossed roof carpet, while `SHOT_02` and `SHOT_12` were visual ties. The
second kept the perimeter's exact primitive, triangle, material, texture, and draw budgets while
recomposing its forty two-box service clusters as broad roof hatches and enlarging the sixteen
existing instanced tanks. The critic found a narrow top-down occupation gain but rejected it as too
minor and token-like; all three ground/close cameras were ties. It too was restored.

The remaining gap is structural integration: the 120-shell belt still reads as repeated capped
boxes with low, nearly flat eye-level rooflines, sparse believable occupation, no perimeter shadow
layering, and an abrupt transition to featureless beige surround. The existing `Fog(82, 190)` was
left alone because bringing it forward enough to separate the belt would also fog the primary
camera's ground from its 95 m elevation. Likewise, simply enabling belt shadow casting would not
work: the sun shadow fit excludes the distant belt, and expanding its 4k bounds would trade away
resolution across every accepted playable-map camera. A future owner-approved rebuild should start
with a lean, explicitly budgeted skyline/massing plan rather than another palette adjustment or
token roof marks. Evidence: `artifacts/playwright/map-shots/P10-before/` (with the exact-state
`SHOT_13` fallback in `P9-final/`), `artifacts/playwright/map-shots/P10-a1/`, and
`artifacts/playwright/map-shots/P10-a2/`; the rejected A2 set itself passed all four capture checks in
one run.

## After the last card

Run `pnpm qa:completion`, recapture the wave review set — `SHOT_01`–`SHOT_16` plus `AUDIT_01`–`AUDIT_07` (23 cameras, selected via explicit `SHOT_IDS`) — and stop for owner review. That review is the only owner stop in the wave, and it also decides any cards noted as stalled.
