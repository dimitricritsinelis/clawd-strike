# BZ-04 | Bazaar construction documents

**Whole-map visual design issue.** Scope: 25 zones, all 100 zone faces, every protected opening, the Tea elevation, eight links, target roofs/backgrounds and all legacy visual dispositions. This issue supersedes the previous frontage-only sheets and their blanket KEEP decisions. It does not alter the live map or certify a constructed result.

The user has authorized comprehensive render-only redesign. Preserve gameplay colliders, routes, cover silhouettes, spawns and playable elevation. The intended style is a simple, readable Counter-Strike-like environment with traditional bazaar character, discreet utilities, balanced plaster/stone and deliberately composed activity. [Design basis](design-basis.md) defines the visual hierarchy and reference use.

**Current revision: R6 design and material coordination.** The verified external review prompted a bounded Textile/Tea composition correction, a shared-access clarification, selected material recipes and clearer measured drawings. The prior R5 whole-building layout remains the basis; B retains its building layout and focal balcony. R6 incorporates material assignments into the authoring source, resolves the fine cloth/stone-trim source treatments and adds roof/skyline context. Start with the current [visual atlas](../../../output/pdf/bazaar-r6-complete-visual-atlas.pdf), [material specification](../../../output/pdf/bazaar-material-review.pdf), [building catalog](building-catalog.md) and [window review](reviews/r6-window-review.md). These are design documents, not a game build or user art acceptance.

## Document register

| Document | Purpose | Authority |
|---|---|---|
| [design-basis.md](design-basis.md) | Commission, visual hierarchy, architectural identity and reference register | Design intent |
| [design.json](design.json) | Complete numerical target: parcels, openings, roofs, groups, materials, cameras, budgets and dispositions | Authoring source |
| [building-catalog.md](building-catalog.md) | Complete building uses, storeys, bay grids, principal entrances, neutral elevations and sections | Generated architecture register |
| [coverage.json](coverage.json) | Frozen wall-collider spans/heights, open transitions, floor grades and source provenance | Gameplay-envelope reference |
| [cameras.json](cameras.json) | Fixed player-eye poses and adapter batch aliases | Generated evidence plan |
| [roof-coordination.json](roof-coordination.json) | Exact clipped roof surfaces, shared returns, facade masks and concealed collectors | Generated geometry coordination |
| [roof-bundles.md](roof-bundles.md) | Installation owner, stable model/placement, bounds, materials and dependencies for every roof bundle | Generated construction schedule |
| [details.md](details.md) | Material factors, assembly recipes, supports, joinery and wear | Standard details |
| [craftsmanship.md](craftsmanship.md) | R6 room-led opening families and selected finishes, material profiles, exact part recipes and all-area composition | Shared R6 craft standard |
| [runtime-materials.md](runtime-materials.md) | Exact pack/floor shader aliases, embedded PBR bindings and render allocation | Generated material schedule |
| [integration.md](integration.md) | Exact producer/asset replacement paths and required verification | Implementation contract |
| [drawings/master-plan.svg](drawings/master-plan.svg) | Whole-map location and ownership overview | Generated drawing |
| [Complete visual atlas](../../../output/pdf/bazaar-r6-complete-visual-atlas.pdf) | All 25 areas, measured opening schedules, 12 schematic perspectives, roof/skyline context and B details | R6 visual review package |
| [Material specification](../../../output/pdf/bazaar-material-review.pdf) | Selected sources, color, trim/linen samples, continuity and wear | R6 finish review package |
| [Roof context](drawings/roof-ownership-context.svg) | Roof ownership, level relationships and interfaces | Generated context |
| [Skyline context](drawings/skyline-compass-context.svg) | All 15 background targets in compass views | Generated context |
| [Perspective notes](../../../artifacts/bazaar-r6-design-review/perspectives/render-notes.json) | Exact source cameras, image hashes and schematic omissions | Preview evidence |
| [skyline.md](skyline.md) | Fixed background volumes and retired legacy shell IDs | Generated schedule |
| [audits.md](audits.md) | R6 verified corrections and inherited R5 review; earlier history | Document-review evidence |
| [../development-plan/README.md](../development-plan/README.md) | Implementation status and evidence per area | Progress record only |

| Sheet | Zones / scope |
|---|---|
| [Spawn A](unit-spawn-a-courtyard.md) | Whole Spawn A courtyard, all four faces and its skyline |
| [Spice Street](unit-spice-street.md) | Complete west/east tenancies, floor, shade and open mouths |
| [Fountain Court](unit-fountain-court.md) | Civic and domestic faces, returns, fountain context and skyline |
| [Textile Arcade](unit-textile-arcade.md) | Both complete arcades, end return, textile groups and roofs |
| [Rug Gate](unit-rug-gate.md) | Gate approach, merchant and gatekeeper faces, returns and gateway interface |
| [Spawn B](unit-spawn-b-courtyard.md) | Whole courtyard including all dominant perimeter faces |
| [Service South](unit-service-south.md) | Both long faces, closed south wall and open north transition |
| [Caravan Court](unit-caravan-court.md) | Stores, garden boundaries, exact cut edges and loading context |
| [Tea elevation](unit-tea-terrace.md) | Ramp, terrace, stairs and landing as one coordinated assignment |
| [Service North](unit-service-north.md) | Retaining/service faces, north closure and transitions |
| [Dyers Alley](unit-dyers-alley.md) | Works, home, drying/work fronts and south closure |
| [Covered Souk](unit-covered-souk.md) | All trading faces, north/south closures and roof context |
| [Dyers Dogleg](unit-dyers-dogleg.md) | Both complete identity faces and open ends |
| [North Court](unit-north-court.md) | Hammam, home, drying work, enclosure and skyline |
| [Links](links.md) | Eight individually identified passages, every return and clear mouth |

Each zone has a dimensioned plan and four elevations under `drawings/`. Each real building also has a neutral principal elevation and relevant transverse section in the building catalog. They show target geometry, not a photorealistic promise. The parcel/opening IDs connect drawing, schedule and implementation. Read the exact table values; do not estimate dimensions from a perspective or scale a screenshot.

## Authority and change control

1. The live [source map](../specs/map_spec.json), its runtime collision derivation and the recorded baseline define protected gameplay. Some existing visual profile heights also feed colliders; preserve the frozen collider envelope even when their rendered appearance is replaced.
2. BZ-04 `design.json` defines the new visual target. Current registered frontage counts, exemptions, legacy asset placements and producer boundaries are existing implementation facts, not visual approval.
3. The generated sheets/drawings reproduce the target source. A mismatch is a document defect: correct the source and regenerate, never silently choose one.
4. Standard details fill only the workmanship decisions they explicitly cover. The builder may resolve mesh topology, UV layout and bounded edge treatment; the builder may not invent building composition, object quantity, purpose, material family, placement or a new passage.
5. Earlier AI boards, the Revision 3 atlas and old `development-plan/drawings/BLD_*` images are superseded design studies. They do not add scope or override this issue. The failed Spice/B trials are implementation evidence for their previous sheets, not BZ-04 acceptance.

Maintain one issue ID and one machine-readable target. A substantive design change updates only the affected targets and regenerates their drawings/schedules. User-requested independent design review is bounded to that change; it is not a recurring implementation gate. Numerical correction of a demonstrated mismatch is not a new approval ladder. No material defect is hidden by rebaselining, dropping a check or changing a completion label.

## Required design review before construction

The user requires a dedicated window-design subagent to inspect every one of the 100 zone faces. Each face has an explicit PASS or REVISE, including a reason for quiet and zero-build faces, in the [current review record](reviews/r6-window-review.json). A whole-map summary or passing validator cannot replace those individual decisions. The record identifies its source hash and exact drawings. Unchanged opening geometry carries its prior individual decision only after an exact geometry/room/axis comparison; the changed Textile and Tea faces require a fresh visual decision. Material and diagram-label changes do not imply that every unaltered window was redesigned. If a wall changes, re-review that wall and any affected shared-building faces; do not carry an old decision onto changed geometry.

Common-sense review checks actual ground contact, occupied space, doorway approach, room grouping and complete supports. The master plan now includes closed-building footprints and retained cover. Source-driven schematic perspectives expose recess depth, adjoining walls, shade and ground relationships; their simplified materials and cover envelopes are not in-game quality evidence.

## Reading and building one area

The execution order is **implement, review, then quickly correct**. The engineering package should make the first complete implementation mostly correct. Do not add mid-build aesthetic reviews, repeated planning, review subagents, or approval gates.

1. Read the named area once with only its referenced details and dependencies. Preserve one before capture set and runtime authority. Resolve a proven blocking contradiction if encountered; do not perform a new whole-map audit or redesign an approved composition.
2. Build and integrate the complete requested design in one continuous pass. Reuse the existing deterministic builder, licensed materials, installed shared assets, integration helpers and capture runner. Construct only affected outputs. Cheap export assertions can run with the build; they are not separate review milestones.
3. At the end, perform one consolidated review: assemblies and receivers, exported clear volumes, matched game views, collider identity, movement, relevant regressions and desktop/mobile-emulation performance. Establish final source/integrated/production hash equality and package idempotence in this pass.
4. Correct concrete defects in a short targeted iteration. Rerun only checks and views affected by those corrections. Do not restart the full survey, rebuild unchanged shared assets, recreate before evidence, or send a routine correction through multiple reviewers. If a real failure remains, report it precisely rather than weakening a check.
5. Report the result, remaining work and elapsed build/review time concisely. Separate first-use shared infrastructure from area construction. On a user stop request, stop starting new work, preserve the last tested state and promptly return remaining work; do not finish optional refinements first.

Headless Blender is the reproducible shipping path. Live Blender MCP may support inspection/prototyping, but a live session or viewport image is not the source recipe. Reuse licensed source textures/models and record source files, actual exported dimensions, pivots, transforms and checksums. Do not overwrite the user's live Blender scene.

## Coverage and clearance

Every face is partitioned into explicit target parcels or immutable zero-build transitions. This includes short returns and faces without frontage records. The numeric collider top is not necessarily the old visual parapet height. Target opacity must cover that collider; no invisible wall may protrude above a shortened facade.

All dimensions are absolute design metres unless explicitly identified as local. x east, y north, z up. See [integration.md](integration.md) for the section and free-model transforms and the Tea floor conversion.

The clear-route polygons, open transition intervals and door service floors are empty design space. They are intentional, not unused decoration capacity. New low groups sit in supported recesses, with no more than 0.30 m street projection below 2.2 m. Keep the existing guard's 0.35 m ceiling. Door approaches stay clear for 0.8 m; no new group occupies a protected cover silhouette or an inside turn. Existing gameplay objects are listed separately and are not erased by a clear-route diagram.

Awnings remain above 2.45 m and cross-route cloth above 4.20 m relative to the highest floor underneath. Exact receivers and endpoints govern; a nominal height alone cannot establish attachment. Keep the original spec clearances and existing collision/cover waivers unless their specific soft-visual object is removed; a waiver is not transferable to a new object.

[B-04 root-cause review and verified corrective work](b04-process-review.md) records the evidence behind this workflow. It is a retrospective, not another required read on every build.

## Durable implementation commands

Extract the named handoff once. Preserve that file and its scoped `inputSha256` with the before evidence; confirm that hash again before integration. Another task may revise the live design while a build is running. The full-map `designSha256` is provenance; unrelated area changes do not invalidate the scoped input hash. An unsupported feature, craft recipe or changed phase is a concrete compatibility failure, not permission to omit it or guess a substitute. The extraction includes shared craft standards and required capabilities; it resolves grouped Tea/link sheets to their real filenames.

```sh
python3 docs/map-design/construction/handoff.py --unit unit-spawn-b-courtyard --output artifacts/b-next-trial/handoff.json
python3 docs/map-design/construction/cameras.py --unit unit-spawn-b-courtyard --capture-plan artifacts/b-next-trial/camera-plan.json
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 --python assets/source/unit-spawn-b-courtyard/build.py -- self-test
pnpm build
node apps/client/scripts/bz04-trial.mjs --plan artifacts/b-next-trial/camera-plan.json --output artifacts/b-next-trial/before
```

The before capture does not build or integrate new assets. The same runner captures after integration with a new `--output` directory and `--baseline artifacts/b-next-trial/before`; add `--movement` for the B courtyard’s exit and cover routes. `--views id,id` restricts an affected recapture to existing frozen poses. Use `--lighting flat` for a separate neutral material inspection; before/after comparisons must share the same lighting. It refuses to overwrite a capture directory. Capture and performance evidence is produced by tracked tooling; dated artifact scripts are historical records.

A B-04-compatible section build uses `build.py -- section-only --handoff artifacts/b-next-trial/handoff.json` and the existing `integrate.py`. Its default export also emits the two B-local caps. Do not use that builder for a later finish until it implements every scheduled feature: the current B-05 draped-rug requirement is deliberately rejected rather than silently ignored. Small fixture tests never install assets. Export budgets are checked before replacing `.blend`/GLB files, and final inspection counts come from the actual GLB.

Use `verify.py <evidence-directory> --design <frozen-design.json>` for the exact triangle-volume checks against that issue. Keep source/installed/production hash and manifest checks with the final capture. Technical changes to the geometry helpers require their small fixtures; they do not require another design review.

A sufficient implementation prompt is: “Implement **<unit and issue>** from the frozen handoff and its active installation phase. Preserve gameplay. Use the tracked build, fixture and capture commands. Build the complete area, review the integrated result once, correct observed defects, and return matched views plus failed/unverified conditions. Stop at this scope.” Repeating the architectural and tooling contract in the prompt is unnecessary.

## What makes a handoff ready to implement

A handoff needs both a coherent architectural target and an executable, bounded construction recipe. The named builder must support its feature types, the complete recipe must fit the unchanged hard budgets, and its material finish must have a representative in-game witness view. A coordinate-complete drawing or plausible tint table alone proves none of those conditions.

Use the existing target triangle budget as working headroom; approaching the hard ceiling is a warning to remove hidden/redundant topology, not permission to erase openings or decorative voids. Record assembly costs in the source inventory. Validate the topology after any simplification with the same tests used on the original mesh.

Material acceptance compares a real receiver under shipped and neutral lighting. Specify whether a finish is stain multiplied by the wood albedo or opaque paint that retains normal/roughness grain. Never infer painted appearance from the tint swatch. The selected R6 paint/glass recipes are design targets; the shipped material graph must prove those targets in the final game review.

Performance uses one full deterministic update/render per browser animation frame, with 60 warmup and 180 measured frames per view. Browser cadence, CPU work, draw/triangle counts and physical-device performance are separate measures. Relative CPU acceptance requires matching measurement modes and at least 120 samples; an old render-only baseline is unverified, not interchangeable. Report raw failures and distribution overlap; repeat only a predefined affected measurement when needed, never until it passes.

## Generation and document checks

`gen.py` reads `design.json` and `coverage.json` and writes documentation only. It must not invoke the runtime compiler, alter `map_spec.json`, rebuild assets or apply a package.

```sh
python3 docs/map-design/construction/validate.py
python3 docs/map-design/construction/roofs.py
python3 docs/map-design/construction/validate_buildings.py
python3 docs/map-design/construction/gen.py
python3 docs/map-design/construction/gen.py --check
python3 docs/map-design/construction/cameras.py --check
python3 docs/map-design/construction/roofs.py --check
python3 docs/map-design/construction/validate_buildings.py --self-test
node --import tsx docs/map-design/construction/verify-transforms.ts
```

To verify the frozen survey without changing it, run `node --import tsx docs/map-design/construction/survey.ts /tmp/bz04-survey-check.json` and compare its data with `coverage.json`, excluding only `generatedFrom.generatedAt`. The survey imports the real runtime geometry derivation; it does not compile or alter the map. Never overwrite the frozen issue baseline from a later implementation state.

The document validator checks complete face partitions, protected openings, wall/collider compatibility, roof levels, opening fit, material references, supported group bounds, clear routes and all legacy dispositions. These are design-data checks, not tests of future meshes. Inspect rendered drawings as well as machine output.

The building validator additionally checks unique building ownership, connected footprints, separation between real buildings, bay-axis membership, room/floor/window coordination, exact instance bounds and roof reproducibility. Negative fixtures check that material defects are rejected. A passing coordinate check does not make a facade composition convincing: the untextured architectural drawing remains a required review artifact.

## Review and readiness

Historical R2.2 engineering, architecture and game-studio reviews are recorded in [audits.md](audits.md). They do not approve R6 or the current B courtyard finish. The user-requested R3 and R4 engineering, architecture, decoration and Middle Eastern culture advisors used GPT-6 Astra at medium reasoning; their findings and corrections are recorded in audits.md. New independent reviewers are used only when requested; ordinary document checks and the author’s end review do not require repeated signoffs. These are AI technical reviews, not licensed P.E. signatures or legal seals. A successful document review does not establish actual-game acceptance; the user's artistic rejection cannot be overruled by a numerical check.

Known prior issues remain part of the implementation baseline: the B/Spice trial state, global runtime/tooling failures and the capture/package fixes are recorded in the progress index and task evidence. Recheck affected paths in the actual implementation task; do not claim the whole game is passing because this document package validates.
