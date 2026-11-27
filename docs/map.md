# Bazaar

Bazaar is a 56 × 92 m Levantine old-city market. Two spawn courtyards anchor the south and north ends. Three lanes cross 25 named zones. Mid and upper links let players change lanes. The map specification owns the zone IDs, connections, two player spawns and ten enemy spawn points. [Map specification](../apps/client/assets-src/maps/bazaar-map/map_spec.json)

## Layout and landmarks

| Route | What the player sees |
| --- | --- |
| Main | From Spawn A, Spice Street opens into Fountain Court around a low, tiered stone fountain. Textile Arcade has rugs displayed on the walls and strings of cloth banners overhead. Rug Gate frames the approach to Spawn B. |
| West | Service passages connect Caravan Court to Tea Terrace. A ramp and stairs connect the 1.4 m terrace to ground level. Large sandstone blocks distinguish the service yards from the limestone flagstones on the terrace. |
| East | Dyers Alley leads into the Covered Dyers Souk. Ochre plaster, dye vessels and the turn at Dyers Dogleg distinguish this route up to North Court. |

## Art direction

Pale plaster upper stories sit above sandstone shopfronts and warm stone paving. Muted green timber marks the herb shop on Spice Street. The fountain uses tan and ochre glazed tile. In Textile Arcade, dark blue rugs with red and yellow motifs stand out against the masonry. The late-afternoon light casts long shadows across the lanes. Preserve that contrast when changing an awning or an entrance. [Fountain materials](../apps/client/src/runtime/map/props/families/fountain.ts) · [Sky preset](../apps/client/src/runtime/render/DesertSky.ts)

For small dressing changes, use the existing cloth colours. The installed awnings use ochre `#c8973f`, rust `#b85a2c`, teal `#2f6d68`, blue `#35627a`, green `#3d6a4c` and sand `#d9c7a0`. Keep goods at counters and wall feet, weathering at contact points, and labels in Latin script. The full scene layers awnings, cables, laundry, rooftop equipment and palms around the playable routes. Its placement records are frozen generated data. [Atmosphere records](../apps/client/src/runtime/map/atmosphere/atmosphere.json) · [Retained Blender sources and recovery](../assets/source/README.md)

## Engineering ownership

- **Map data.** Edit the [source specification and shot cameras](../apps/client/assets-src/maps/bazaar-map/). Coordinates start in the southwest with X east, Y north and Z up. Yaw zero faces north. Use the [coordinate transforms](../apps/client/src/runtime/map/world/coordinateTransforms.ts) for the Three.js Y-up frame. Run `pnpm --filter @clawd-strike/client gen:maps` and review the generated diff under `apps/client/public/maps/bazaar-map/`. Run `pnpm check:maps` to verify freshness.
- **Geometry.** The world builder assembles traversal, boundary walls, section GLBs and roof placements. The prop builder adds the fountain, cover and shop colliders. Preserve routes, elevation, spawns and cover when changing finishes or dressing. [World builder](../apps/client/src/runtime/map/world/buildBlockout.ts) · [Prop builder](../apps/client/src/runtime/map/props/buildProps.ts) · [Facade model catalog](../apps/client/public/assets/models/environment/bazaar/facades/models.json)
- **Clearance.** The authored minimum widths are 6 m on the main lane, 4.5 m on side routes, 4 m on the elevated route and 3.5 m on cross-links. Wall-foot clutter projects up to 0.30 m. Awning valances clear 2.45 m and overhead spans clear 4.20 m above the authored datum. Keep door approaches open. The two Spice Street exceptions apply only to the placements named in the waiver file. [Atmosphere checks](../apps/client/src/runtime/map/atmosphere/atmosphere.test.ts) · [Composition waivers](../apps/client/assets-src/maps/bazaar-map/composition_waivers.json)
- **Verification.** Run `pnpm map:check` for protected geometry and source, `pnpm test:unit` for the collider snapshot and `pnpm test:e2e:traversal` for playable routes. Compare the affected authored camera views with `pnpm capture:shots` when changing the scene. [Development and QA](development.md)
