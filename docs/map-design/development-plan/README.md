# Bazaar development plan

Progress index for [TRANSFORM](../../../.claude/skills/map-polish/SKILL.md). Status values: not-started, building, complete, blocked. Resolve a request to a unit with the Also-called column; `pnpm map:shoot` with no argument lists every unit id. Every area has a construction sheet in [../construction/](../construction/README.md); TRANSFORM builds the sheet, the brief is its audit trail.

| Area | Also called | Status | Construction sheet | Brief | Remaining blocker |
|---|---|---|---|---|---|
| unit-spawn-a-courtyard | spawn A, A spawn, south spawn | not-started | [sheet](../construction/unit-spawn-a-courtyard.md) | | |
| unit-spice-street | Spice Street, spice row | not-started | [sheet](../construction/unit-spice-street.md) | | |
| unit-fountain-court | Fountain Court, the fountain | not-started | [sheet](../construction/unit-fountain-court.md) | | |
| unit-textile-arcade | Textile Arcade, textiles | not-started | [sheet](../construction/unit-textile-arcade.md) | | |
| unit-rug-gate | Rug Gate, the gate | not-started | [sheet](../construction/unit-rug-gate.md) | | |
| unit-spawn-b-courtyard | spawn B, B spawn, north spawn | not-started | [sheet](../construction/unit-spawn-b-courtyard.md) | | |
| unit-service-south | Service South, south service alley | not-started | [sheet](../construction/unit-service-south.md) | | |
| unit-caravan-court | Caravan Court, caravan yard | not-started | [sheet](../construction/unit-caravan-court.md) | | |
| unit-tea-ramp, unit-tea-terrace, unit-tea-stairs, unit-tea-landing | tea house, Tea Terrace, tea ramp, tea stairs, tea landing (one unit per shoot) | not-started | [sheet](../construction/unit-tea-terrace.md) | | |
| unit-service-north | Service North, north service alley | not-started | [sheet](../construction/unit-service-north.md) | | |
| unit-dyers-alley | Dyers Alley | not-started | [sheet](../construction/unit-dyers-alley.md) | | |
| unit-covered-souk | Covered Souk, Covered Dyers Souk, the souk | not-started | [sheet](../construction/unit-covered-souk.md) | | |
| unit-dyers-dogleg | Dyers Dogleg, the dogleg | not-started | [sheet](../construction/unit-dyers-dogleg.md) | | |
| unit-north-court | North Court | not-started | [sheet](../construction/unit-north-court.md) | | |
| unit-link-west-mid, unit-link-east-mid, unit-link-west-upper, unit-link-east-upper, unit-link-north-east, unit-link-north-west, unit-link-south-east, unit-link-south-west | the links, cross-links, link passages (one unit per shoot) | not-started | [sheet](../construction/links.md) | | |
| Perimeter rooftops and skyline | skyline, rooftops, roofline (no shoot unit: placements with role `skyline` from the adjoining unit) | not-started | [sheet](../construction/skyline.md) | | |

## State of the build (2026-09-07)

- No facade GLB is bound in the game: `apps/client/public/assets/models/environment/bazaar/facades/models.json` lists no models and no frontage carries `facadeModelId`. Every wall the player sees is still the runtime kit. The eight unit folders under `assets/source/unit-*` hold hand-modelled GLBs and packages that were never applied; the sheets treat them as reference only.
- The Revision 3 assemblies are placed: shutters, screens, counters, rug displays, dye counters, packing cabinets, the S1 Spice roofs and roof ties, the B18 roof room, the Dyers house pieces and the Spawn B rooms all render through `dressing_placements`. The sheets keep them and tell the face GLBs to leave the rebates they sit in.
- Six of nine legacy composition waivers were resolved on 2026-09-07 by moving a sign, canopy, line, planter or the tea service in the spec; three remain by decision (cover cluster, palm, barrel). `buildings[].walls[]` now matches the sheets.

## Design reference

- [../construction/README.md](../construction/README.md): conventions, standard details, module envelopes, variants, materials, reality checklist. Sheets carry every number the build needs.
- [design-atlas.pdf](design-atlas.pdf), [overview.svg](overview.svg), [assembly-fit.svg](assembly-fit.svg), `drawings/*.svg`: review elevations and massing proposals per building (Revision 3, 2026-09-04). Their footers cite `buildings.md` and `assets.md`; both were folded into the construction sheets and deleted. S1 and S2 roofs are adopted as construction; E1 and G1 are gameplay trials and stay out of the sheets.
- [map_spec.json](../specs/map_spec.json): implemented geometry and every measured dimension. Outranks the atlas for what exists today; the sheets say where to go.
- Performance: stay within the budgets in `apps/client/scripts/lib/performanceAcceptance.mjs`; `map:shoot` prints the worst view against them.

### Reference images

| ID | Image / owning scope | Adopt | Do not infer |
|---|---|---|---|
| R00 | [Founding Bazaar street](../refs/bazaar_main_hall_reference.png) | Primary authority: layered depth, occupied upper rooms, supported shade interpretation, trade edges and warmth. | Ambiguous cable endpoints, blocked walking space, lettering or exact dimensions are not construction requirements. |
| R01 | [Spice Street](references/spice-street.png) | District palette, three distinct trades, rich west / quiet east. | Cabinet depth, incidental background openings and the cover cabinet silhouette are not approved geometry. |
| R02 | [Fountain Court](references/fountain-court.png) | Civic masonry, readable shade, restrained blue waterline, contact and carving. | Fountain size/position and background opening counts remain the measured source values. |
| R03 | [Textile Arcade](references/textile-arcade.png) | Hanging galleries versus roll chests, supported shade, quiet piers. | No extra arch bays, projected floor stock or changed walking width. |
| R04 | [Rug Gate](references/rug-gate.png) | Voussoirs, cornice, blue accent and quiet receiving backdrop. | No new step under the portal, changed arch span or narrowed sightline. |
| R05 | [Caravan / Tea Terrace](references/tea-terrace.png) | Serving joinery, brass/porcelain/linen, wall repairs and overhead support. | Furniture quantity, cloth low points and all route grades come from the spec. |
| R06 | [Covered Dyers Souk](references/covered-souk.png) | Exactly three different trade compositions in one retained arcade. | The approved center booth stays its existing asset; the generated depiction does not revise its geometry. |
| R07 | [Dyers House study](references/dyers-house.png) | One dwelling, one door, two screens, quiet side wall and flush entrance. | Dimensions come from B21, not perspective measurement; no new route or extra window. |
| R08 | [Construction and trade study](references/craft-and-trade.png) | Finished frames, lattice, supported cloth, trade-specific cabinets and stock. | Detail study only: panel photographs are not measured sections or production textures. |
