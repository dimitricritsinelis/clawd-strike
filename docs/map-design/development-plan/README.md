# Bazaar construction progress

Progress index for [TRANSFORM](../../../.claude/skills/map-polish/SKILL.md). [../construction/README.md](../construction/README.md) and its sheets are the canonical handoff. Status values: `not-started`, `building`, `built`, `complete`, `blocked`. `building` includes applied work with known construction defects or a revised sheet still to build. `built` means the current sheet is applied with the bounded assembly/interface inspection recorded and awaits later validation; only that later task may set `complete`. Resolve a named area with the Also-called column. A single-area request stops at that row; continue only through an explicit user-provided queue.

| Area | Also called | Status | Construction sheet | Remaining blocker |
|---|---|---|---|---|
| unit-spawn-a-courtyard | spawn A, A spawn, south spawn | not-started | [sheet](../construction/unit-spawn-a-courtyard.md) | |
| unit-spice-street | Spice Street, spice row | building | [sheet](../construction/unit-spice-street.md) | Earlier trial package applied; revised character schedule not built. Audit found coplanar door faces, unsupported east tie-foot stains, wrong niche backing and missing assembled-context evidence. |
| unit-fountain-court | Fountain Court, the fountain | not-started | [sheet](../construction/unit-fountain-court.md) | |
| unit-textile-arcade | Textile Arcade, textiles | not-started | [sheet](../construction/unit-textile-arcade.md) | |
| unit-rug-gate | Rug Gate, the gate | not-started | [sheet](../construction/unit-rug-gate.md) | |
| unit-spawn-b-courtyard | spawn B, B spawn, north spawn | not-started | [sheet](../construction/unit-spawn-b-courtyard.md) | |
| unit-service-south | Service South, south service alley | not-started | [sheet](../construction/unit-service-south.md) | |
| unit-caravan-court | Caravan Court, caravan yard | not-started | [sheet](../construction/unit-caravan-court.md) | |
| unit-tea-ramp + unit-tea-terrace + unit-tea-stairs + unit-tea-landing | tea house, Tea Terrace, tea ramp, tea stairs, tea landing | not-started | [sheet](../construction/unit-tea-terrace.md) | One named area; build terrace and landing outputs, retain ramp and stairs. |
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

`skyline.md` is a shared roof-ownership schedule, not a TRANSFORM row. Its scheduled render-only work travels with the adjoining named area that owns the roof or placement.

## Current implementation basis

- **2026-09-07 document revision:** keep the measured plan; require distinct tenancy materials, hand finish, fitted textiles and localized wear under the sheets' character schedules and SD-21/22. The three earlier AI boards illustrate the old direction and are not approved finish references.
- **Spice trial evidence:** the previous task recorded a successful export/application and one `map:check` pass with protected authority unchanged. Its later read-only audit found the defects listed above; the isolated previews omitted roofs, floors, overheads and other retained interfaces. That is why the row is `building`, not construction-accepted. This documentation revision changes no map assets and starts no rebuild. The next authorized Spice implementation must repair the known defects and build the revised schedule.

- Live compiled geometry and placements are the construction source. Existing `frontages` outputs are legacy tooling; future named-area work uses section exports only.
- The Revision 3 assemblies are placed: shutters, screens, counters, rug displays, dye counters, packing cabinets, the S1 Spice roofs and roof ties, the B18 roof room, the Dyers house pieces and the Spawn B rooms all render through `dressing_placements`. The sheets keep them and tell section outputs to leave the rebates they sit in.
- Six of nine legacy composition waivers were resolved on 2026-09-07 by moving a sign, canopy, line, planter or the tea service in the spec; three remain by decision (cover cluster, palm, barrel). `buildings[].walls[]` now matches the sheets.

## Design reference

- [../construction/README.md](../construction/README.md): canonical handoff, conventions, standard details, module envelopes, variants, materials and construction constraints. Sheets carry every number the build needs.
- [design-atlas.pdf](design-atlas.pdf), [overview.svg](overview.svg), [assembly-fit.svg](assembly-fit.svg), `drawings/*.svg`: historical appearance references, never implementation instructions. Their footers cite `buildings.md` and `assets.md`; both were folded into the construction sheets and deleted. Only adopted values repeated in a construction sheet are construction; E1 and G1 remain out of scope.
- [map_spec.json](../specs/map_spec.json): implemented geometry and every measured dimension. Outranks the atlas for what exists today; the sheets say where to go.
- Performance: the later release-validation task checks the budgets in `apps/client/scripts/lib/performanceAcceptance.mjs`.

### Reference images

R00 is the founding reference and owns the map-wide warm aged cream/tan surface, traffic polish and trade patina. R01--R08 are district studies for geometry, craft and trade role; they do not set the surface finish.

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
