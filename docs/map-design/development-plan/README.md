# Bazaar construction progress

Progress index for [TRANSFORM](../../../.claude/skills/map-polish/SKILL.md). BZ-04 [construction/design.json](../construction/design.json) is the canonical visual target; [construction/README.md](../construction/README.md), [design-basis.md](../construction/design-basis.md), [details.md](../construction/details.md) and [integration.md](../construction/integration.md) define its document, craft and implementation contracts. This table records implementation status and evidence only. Status values: `not-started`, `building`, `built`, `complete`, `blocked`. `building` includes applied work with known construction defects or a revised target still to build. `built` means the current target is applied with bounded assembly/interface inspection recorded. The approved full-map task includes actual-game validation and ends ready for final user art review; `complete` additionally requires user art acceptance. Resolve a named area with the Also-called column. Follow the [canonical approved R7 queue](../construction/README.md#approved-whole-map-queue-and-readiness), continuing automatically after each area’s end review and targeted corrections without routine human approval. A separately requested single-area task stops at that row.

| Area | Also called | Status | Construction sheet | Remaining blocker |
|---|---|---|---|---|
| unit-spawn-a-courtyard | spawn A, A spawn, south spawn | not-started | [sheet](../construction/unit-spawn-a-courtyard.md) | |
| unit-spice-street | Spice Street, spice row | building | [sheet](../construction/unit-spice-street.md) | Earlier trial package applied; revised character schedule not built. Audit found coplanar door faces, unsupported east tie-foot stains, wrong niche backing and missing assembled-context evidence. |
| unit-fountain-court | Fountain Court, the fountain | not-started | [sheet](../construction/unit-fountain-court.md) | |
| unit-textile-arcade | Textile Arcade, textiles | not-started | [sheet](../construction/unit-textile-arcade.md) | |
| unit-rug-gate | Rug Gate, the gate | not-started | [sheet](../construction/unit-rug-gate.md) | |
| unit-spawn-b-courtyard | spawn B, B spawn, north spawn | building | [sheet](../construction/unit-spawn-b-courtyard.md) | B-04 trial implemented; user supports the composition. B-05 finish is documented but not implemented: readable shutters, craft trim/materials and textiles. User-authorized B cap 64,000 triangles, working target 56,000; runtime limits unchanged. Saved B-04 evidence: 47,860 triangles, 155 unchanged colliders, seven movement passes; paired CPU acceptance remains open; the active workflow task is fixing the historical AABB/material issues. See local `artifacts/b04-trial-20260909/report.md` and the [finish sheet](../construction/unit-spawn-b-courtyard-finish.md). |
| unit-service-south | Service South, south service alley | not-started | [sheet](../construction/unit-service-south.md) | |
| unit-caravan-court | Caravan Court, caravan yard | not-started | [sheet](../construction/unit-caravan-court.md) | |
| unit-tea-ramp + unit-tea-terrace + unit-tea-stairs + unit-tea-landing | tea house, Tea Terrace, tea ramp, tea stairs, tea landing | not-started | [sheet](../construction/unit-tea-terrace.md) | One named area comprising all four zones. BZ-04 redesigns the ramp, terrace, stairs and landing faces; the prior retain-ramp/stairs scope is superseded. |
| unit-service-north | Service North, north service alley | not-started | [sheet](../construction/unit-service-north.md) | |
| unit-dyers-alley | Dyers Alley | not-started | [sheet](../construction/unit-dyers-alley.md) | |
| unit-covered-souk | Covered Souk, Covered Dyers Souk, the souk | not-started | [sheet](../construction/unit-covered-souk.md) | |
| unit-dyers-dogleg | Dyers Dogleg, the dogleg | not-started | [sheet](../construction/unit-dyers-dogleg.md) | |
| unit-north-court | North Court | not-started | [sheet](../construction/unit-north-court.md) | |
| unit-link-south-west | south-west link | not-started | [sheet](../construction/links.md) | |
| unit-link-south-east | south-east link | not-started | [sheet](../construction/links.md) | |
| unit-link-west-mid | west-mid link | not-started | [sheet](../construction/links.md) | |
| unit-link-east-mid | east-mid link | not-started | [sheet](../construction/links.md) | |
| unit-link-west-upper | west-upper link | not-started | [sheet](../construction/links.md) | |
| unit-link-east-upper | east-upper link | not-started | [sheet](../construction/links.md) | |
| unit-link-north-west | north-west link | not-started | [sheet](../construction/links.md) | |
| unit-link-north-east | north-east link | not-started | [sheet](../construction/links.md) | |

`skyline.md` defines the shared background installation, not a separate TRANSFORM row. The canonical approved queue explicitly includes `BZ04-SHARED-ENVIRONMENT` and its R7 target finishes; reuse compatible installed geometry. Roof work follows the exact receiver dependencies and ownership in `roof-bundles.md`, coordinating the already-authorized queued facades before activating their bundles.

## Current implementation basis

- **Approved R7 design:** the user approved the engineering documents, including facade-centered upper openings and the retained R6 finish recipes. Read the existing [100-face review record](../construction/reviews/r7-window-review.json); unchanged approved geometry needs no fresh design-review gate. This approval starts no build and supplies no actual-game acceptance. The progress rows remain implementation evidence, not document status.

- **BZ-04 predesign:** the 25-zone, full-face target supersedes the Revision 3 atlas, historical `drawings/BLD_*` elevations and earlier AI boards for target appearance. Those materials remain historical studies and prior-trial context; they do not define target geometry, materials, activity or acceptance. BZ-04 changes no live map asset and does not mark any row implemented.
- **B trial evidence:** the retained trial measurements and tooling passes describe the rejected earlier implementation. The B-04 trial is implemented; R7 includes the approved subsequent B-05 finish target, still requiring implementation. Earlier trial evidence does not establish B-05 finish acceptance.
- **Spice trial evidence:** the previous task recorded a successful export/application and one `map:check` pass with protected authority unchanged. Its later read-only audit found the defects listed above; the isolated previews omitted roofs, floors, overheads and other retained interfaces. That is why the row is `building`, not construction-accepted. This documentation revision changes no map assets and starts no rebuild. The next authorized Spice implementation must repair the known defects and build the revised schedule.

- The compiled runtime records existing implementation and collision evidence. BZ-04 controls the new visuals; frontage registration does not limit the redesign.
- Revision 3 assemblies remain current implementation facts: shutters, screens, counters, rug displays, dye counters, packing cabinets, the S1 Spice roofs and roof ties, the B18 roof room, the Dyers house pieces and the Spawn B rooms render through `dressing_placements`. BZ-04 gives each visual disposition; this statement does not approve their current appearance or retire any asset before implementation.
- Six of nine legacy composition waivers were resolved on 2026-09-07 by moving a sign, canopy, line, planter or the tea service in the spec; three remain by decision (cover cluster, palm, barrel). Those adjustments describe the prior implementation. They do not establish that the old `buildings[].walls[]` matches the BZ-04 building register.

## Design reference

- [../construction/design.json](../construction/design.json): BZ-04 canonical numerical visual target. It owns parcel, opening, roof, activity, fixture, material, disposition and camera values.
- [../construction/README.md](../construction/README.md), [design-basis.md](../construction/design-basis.md), [details.md](../construction/details.md), [integration.md](../construction/integration.md): BZ-04 document register, reference intent, workmanship and integration proof requirements.
- [design-atlas.pdf](design-atlas.pdf), [overview.svg](overview.svg), [assembly-fit.svg](assembly-fit.svg), `drawings/*.svg` including `drawings/BLD_*`: superseded Revision 3 studies. They remain evidence of prior intent and trial context only; they are not BZ-04 target or implementation instructions.
- [map_spec.json](../specs/map_spec.json): implemented geometry and protected measurements. It outranks historical studies for what exists today; BZ-04 must preserve its gameplay authority.
- Performance: the approved implementation task checks the budgets in `apps/client/scripts/lib/performanceAcceptance.mjs` during each consolidated end review and final whole-map verification.

### Reference images

The table below preserves the historical Revision 3 reference annotations. BZ-04 adopts only the elements explicitly recorded in its current design basis and schedules. Former retained-asset decisions, opening counts and BLD/B-number references below do not constrain the current target.

| ID | Image / owning scope | Adopt | Do not infer |
|---|---|---|---|
| R00 | [Founding Bazaar street](../refs/bazaar_main_hall_reference.png) | Primary authority: warm varied cream/tan surfaces, irregular hand finish, traffic polish, trade patina, layered depth, occupied upper rooms and supported shade; flourishing and maintained. | Ambiguous cable endpoints, blocked walking space, lettering or exact dimensions are not construction requirements. |
| R01 | [Spice Street](references/spice-street.png) | Three distinct trades, rich west / quiet east, and finished craft assemblies. | Cabinet depth, incidental background openings, cover cabinet silhouette and its cleaner surface finish are not approved geometry or material direction. |
| R02 | [Fountain Court](references/fountain-court.png) | Civic masonry, readable shade, restrained blue waterline, contact and carving. | Fountain size/position and background opening counts remain the measured source values. |
| R03 | [Textile Arcade](references/textile-arcade.png) | Hanging galleries versus roll chests, supported shade, quiet piers. | No extra arch bays, projected floor stock or changed walking width. |
| R04 | [Rug Gate](references/rug-gate.png) | Voussoirs, cornice, blue accent and quiet receiving backdrop. | No new step under the portal, changed arch span or narrowed sightline. |
| R05 | [Caravan / Tea Terrace](references/tea-terrace.png) | Serving joinery, brass/porcelain/linen, wall repairs and overhead support. | Furniture quantity, cloth low points and all route grades come from the spec. |
| R06 | [Covered Dyers Souk](references/covered-souk.png) | Exactly three different trade compositions in one retained arcade. | The approved center booth stays its existing asset; the generated depiction does not revise its geometry. |
| R07 | [Dyers House study](references/dyers-house.png) | One dwelling, one door, two screens, quiet side wall and flush entrance. | Dimensions come from B21, not perspective measurement; no new route or extra window. |
| R08 | [Construction and trade study](references/craft-and-trade.png) | Finished frames, lattice, supported cloth, trade-specific cabinets and stock. | Detail study only: panel photographs are not measured sections or production textures. |
