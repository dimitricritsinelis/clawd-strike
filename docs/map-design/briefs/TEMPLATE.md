# <unit id> · <zone label>

Score: <1-5> · Scope: <skip | finish only | named walls | every wall> · Cycles: <0-3>

## Walls to author (plan metres, from `pnpm map:shoot <unit> --tag r0-before`)
- Zone rect: x=<> y=<> w=<> h=<>
- <face>: (<x1>,<y1>) to (<x2>,<y2>), street side <N/S/E/W>, wall height <> m, massing depth <> m, parapet +<> m
- Faces the section owns: [<north>, ...]

## Protected (never moves)
- Collision, traversal, spawns, anchors, dimensions (checked by map:check)
- <locked assets on this zone, e.g. the original textile booth at ...>

## References
- docs/map-design/refs/bazaar_main_hall_reference.png, cs2_daylight_ref_1..5.png
- Optional inspiration: docs/map-design/targets/<unit>.png
- Current views: artifacts/map-shoot/<unit>/r0-before/units/<unit>/

## Atlas facts (from buildings.md / assets.md, read once here)
- Buildings: <B-id type, trade, storeys> ...
- Palette: <district palette line>
- Roof datum: <> · Decisions: <no door on the south face; keep the arch; ...>

## Problems, biggest first
1. <one visible sentence, with the view it is visible in>
2. <...>
3. <...>
