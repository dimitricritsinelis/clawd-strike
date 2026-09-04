---
name: map-polish
description: SWAT loop for the Bazaar map. Pick a unit, shoot it, name the worst thing, fix it in map_spec, reshoot, move on. The owner commits. Fast iterations, no survey, no orchestration.
---

# Map Polish

**The bar is a shipped Counter-Strike 2 map.** Mirage, Anubis, Dust 2 finish: every wall reads as designed, every prop is placed for a reason, materials hold up at arm's length. Everything on this map currently needs work, so do not survey or rank it. Go to a unit and make it better. Follow `AGENTS.md` for safety and `docs/map-design/quality-bar.md` for judgment.

## The loop

1. **Pick a unit.** `pnpm map:shoot` lists all 25 with their view ids. Take the one the owner named, otherwise `random`. Do not return to a unit you touched this session unless asked. If the worst thing is a shared part, do a part iteration instead (below).
2. **Shoot it.** `pnpm map:shoot <unit>` boots the game headless and captures every player-eye view of that unit in about 10 seconds, plus a north-up plan crop, and prints the zone's spec context: its record, its frontages, its exempt faces, and the zones it connects to. Read `primary`, `context`, the `plan.png`, and the `elev:*` view of whichever wall you will work on. Read the rest only if you need them. The plan is north up with east on the right; in game, looking north puts east on your left, so the plan is mirrored relative to what the player sees. A face listed as `elev:north` rather than `elev:FRONTAGE_*` has no frontage. Its exemption reason says who owns it: `architectural_cut_edge` and `sealed_perimeter` faces can take a frontage (delete the exemption); `short_wall_return` and `open_traversal_face` have no wall to compose; `retaining_wall` is terrain; `system_articulated_boundary` faces are identity planes drawn by `pushCoreBoundaryFacadeGrammar` in `apps/client/src/runtime/map/v3Architecture.ts` with no spec lever, so they are code work (a part iteration).
3. **Name the worst thing.** One sentence. Judge macro before micro: is the wall composed (axis, held corners, paired or marching openings, datums that line up with the neighbour)? Then assemblies (are stalls, windows, awnings complete and supported)? Then materials and wear. A blank plane, a door jammed in a corner, or a floating awning outranks any texture complaint.
4. **Design the fix from the plan, then implement it.** Decide where openings and elements belong from `plan.png` and the zone's neighbours, not from where a spacing rule left room. Edit `docs/map-design/specs/map_spec.json` (frontages and `layoutIntent`, facade modules and profiles, massing, `wall_details`, `exterior_wall_patches`, dressing clusters and placements, materials, asset registry) or render-only runtime code under `apps/client/src/runtime/map/`. Before editing a code file, copy it into the unit's before directory; that copy is your revert. Prefer `layoutIntent.mode: "authored"` for any wall a player reads (rules below). Overhead dressing (canopies, laundry and dye lines) is allowed; the runtime gives it no collider and drops any hung under 2.2 m. Edit the JSON by text insertion, not by reserialising the file; it mixes one-line and multi-line objects and a reserialise touches a thousand unrelated lines. Use `DeterministicRng` for variation. New textures and models are CC0 with provenance in the owning manifest.
5. **Check and reshoot.** `pnpm map:check` regenerates maps and fails if collision, routes, spawns, doorway dimensions, cover, or protected runtime files changed. If you edited code, also `pnpm typecheck` (map:check does not). Then `pnpm map:shoot <unit> --tag after`, which reuses the exact before poses and prints how much each view changed; read the changed views and compare. Better in the target view and no regression elsewhere: keep. Otherwise revert by copying back the snapshots in `artifacts/map-shoot/<unit>/before/` (the spec, and any code file you copied there) over the originals. Never `git checkout`; earlier kept changes are still uncommitted in those files. Then try a different idea or move on.
6. **Move on.** Do not commit. Kept changes accumulate in the worktree and the owner commits after reviewing. Keep a running list of `unit: what changed and why` and the before/after paths, and report it when the session ends or the owner asks.

Run `pnpm validate:map-layout` (12 traversal routes, about 2.5 minutes) only when you added colliding geometry, props, or dressing into the floor area of a route, and once before the session ends. Wall modules and facade changes do not need it per iteration. A still frame cannot see a snag. Fix or revert anything that breaks a route.

## Part iterations

When the worst thing on a wall is a part every wall shares, fix the part, not the wall. A part is a facade module (`facade_modules[]`: kind, dimensions, material slot), a profile (`facade_profiles[]`: which modules a wall may use), a material, or the render code that builds them in `apps/client/src/runtime/map/`. Trigger: the same defect on two or more walls, or a module whose render contradicts its label.

1. Shoot two or three units that show the part, `pnpm map:shoot <unit> --tag <part>-before`. Judge the square-on `elev:*` view for composition and an oblique view (`primary`, `cross-*`, `upper`) for depth, reveals, and shadow; a recess or frame change is invisible square on.
2. Fix the part once. Widen a profile's `moduleIds` rather than creating a new profile.
3. `pnpm map:check`, then reshoot the same units with `--tag <part>-after`. Every wall using the part must improve; one regression means revert from the `<part>-before` snapshot.

Do part iterations first while the parts are weak. Known weak parts: `door_storage_heavy` renders a steel stall frame, a corrugated awning that punches through the string course, and loose goods, so every storage frontage reads as a shanty stall; `vent_service` is a dark square with no surround, floating at head height; the relief profiles allow no window or door, so a quiet wall cannot have an opening where the plan wants one; the `arch_pointed_frame` surround (Dogleg gate, arcade arches) renders as a solid pale slab with a slit; stone frames around openings read as flat cards; the `blind_niche` recess is now plaster but its arris is a bright flat strip. When a module renders wrong, the render code is `v3Architecture.ts`, materials are `kitMaterials.ts`, both under `apps/client/src/runtime/map/`; only the cutout branches render, the non-cutout twins are dead.

## Authored facade rules

The grammar in `apps/client/scripts/lib/facade-layout-grammar.mjs` validates every frontage. What it enforces, so you do not have to read it:

- **Modules come from the profile.** Authored bays may only use the `facadeProfileId`'s `moduleIds`. The `*_relief` profiles allow only `blind_niche` + `pilaster_facade` (or the coverage pair); a wall that should have doors or windows needs `quiet_residential`, `active_merchant`, `service_storage`, or another full profile. Generated mode is looser and picks by family, so a generated twin is not proof a module is allowed.
- **Two storeys need upper modules.** Massings of 5.4 m or more generate an upper storey from the family's upper candidates (residential: windows; service: vents then niches). A relief profile on a two-storey massing fails unless `accentModuleId` names an allowed module (`blind_niche` for high blind recesses).
- **Positions.** `columns[].along` is 0..1 along the frontage, west to east on north/south faces and south to north on east/west faces. Bays are centred on their column. Keep 0.6 m edge margin and 0.42 m between bays.
- **Corners.** `held` keeps a solid 1.2 m pier at each end; `pilaster` needs a pilaster within 0.9 m of each end; `open` must be justified in `composition`.
- **Mirrors.** `mirrorOf` pairs must sit symmetric about the frontage centre within 0.03 m.
- **Heads line up.** Every ground bay's top equals `groundHeadM`. Doors stand on the ground at their own height, so on a wall with doors `groundHeadM` must equal the door height (2.5 m for `door_storage_heavy`, 2.25 residential, 2.7 shop) and a 3.4 m `pilaster_facade` cannot share that storey. Other modules hang from the head, so a 1.8 m niche under a 2.5 m head has its sill at 0.7 m.
- **Storeys** come from the massing height (`resolveStoryCount`: under 5.4 m is one storey), not from you. On a one-storey massing nothing can sit above a door in the same column; a vent beside a door at head height is the only option, and the composition test rejects it, so leave vents off such walls. Upper openings on taller massings are generated over the ground bays.
- **Segments.** `elev:<FRONTAGE>:1` is the segment nearest the camera's left when facing the wall, which on a west face is the north half, opposite to the `along` direction.
- **The composition sentence is unchecked prose.** The grammar validates only its length and punctuation. Write it from the numbers you actually placed.
- **`composition`** is one sentence, under 240 characters, ending in . ! or ?, stating the ordering idea.
- **Module labels lie about materials.** `blind_niche` renders as a dark timber board in a stone frame, not plaster; three of them read as boarded windows. Shoot a wall that already uses a module before you commit a design to it.

## The building test

Every frontage names a building in `buildings[]`; `map:shoot` prints it under the frontage. Each building carries `walls[]`: the wall schedule. Per frontage it gives the corner treatment, the ground head, every bay with its module and its position in metres and as `along`, the dressing assets and where they sit, the assets that do not exist yet (`needs`), and a note stating the rule. **The schedule is the design. A unit iteration implements it**: write the `layoutIntent` from the scheduled bays (`columns[].along` from `along`, `mirrorOf` for symmetric pairs, `story: 1` for upper bays), place the scheduled dressing, shoot, and judge the render against the note. Deviate only when the render proves the schedule wrong, and then change the schedule too, with the reason in its note. The type table in `docs/map-design/quality-bar.md` says what each type needs. A frontage with no building fails `map:check`: assign one first. Splitting a face into buildings is one frontage per building with its own `start`/`end`, `buildingId`, profile, and massing; the parapet steps where the massing changes.

Before keeping a change, answer from the after image:

- **Is it its type?** Door count equals building count. A house has one door and paired windows; a store row has many equal doors; a compound wall has none; a service back has a hatch at most.
- **Where does one building end and the next begin?** A material change, a parapet step, or a party-wall pier. If you cannot point to it, the two buildings read as one long wall.
- **Neighbours differ, correlated.** Same rule, different stone or window or storey count. Not clones, not strangers.

## The composition test

Passing the grammar is not composition. A wall can mirror perfectly in the JSON and still look random, because the eye reads rendered sizes, frames, and datums, not column fractions. Before keeping a change, look at the after image as a stranger and answer from the picture alone:

- **Can you state the rule in one sentence?** "Niche, door, niche, door, niche at one gap under one head, doors mirrored about the axis." If the sentence needs the word "then" more than once, there is no rule.
- **Like with like.** Rhythm is made of equal elements at equal spacing. A door, a 0.5 m vent, and a niche spaced evenly are three different things, not a rhythm. Pair doors with doors, niches with niches; put service elements (vents, hatches) above or inside the bay they serve, not beside it.
- **Datums hold.** Sills, heads, string courses, and cornices are continuous lines. Nothing attached to an opening (awning, canopy, sign, frame) may cross the string course above it or hang below the sill line of its neighbours.
- **Every opening is framed and grounded.** No dark rectangle floating in a wall. A vent has a surround; a niche has a sill; a door has a threshold and a lintel.
- **Attachments belong to one opening.** An awning spans its own door, sits under the head, and is supported from the wall. If a module brings a projecting frame, posts, or goods with it, judge those as part of the wall.
- **Edges, not centres.** Check the gaps between element edges are equal or clearly graded; equal centre spacing with unequal widths reads as drift.

If any answer is no, the change is not done. Fix the composition or the part; do not keep "better than before".

## What good looks like

- **Intentional, not decorated.** Symmetry, alignment, and repetition are evidence of design. Irregularity is fine when it has a cause: circulation, terrain, ownership, repair, use. Randomness without provenance is noise.
- **Complete assemblies.** Windows have jambs, heads, sills, reveals, closures. Stalls have structure, counter, cover, stock, ground contact. Awnings are attached, supported, tensioned. Nothing floats, clips, or reads paper-thin.
- **Walls without doors still say something.** A service face is blank because access is elsewhere, and shows it with niches, vents, pilasters, a string course, drainage, and wear where water and hands go.
- **Density at the edges.** Dressing belongs against wall bases, in recesses, on counters and sills, and above head height. The walking envelope stays clear whether or not the prop collides.
- **A swap is not a design.** Changing a profile, material, or rhythm without deciding where things belong is not a fix.

## Do not

- Survey the whole map, rate units, or write reports before working.
- Build orchestration, state files, planners, reviewers, or tests for an aesthetic choice.
- Hand-edit generated files under `apps/client/public/maps/` or the layout reference. `map:shoot` and `map:check` regenerate them.
- Touch collision, spawns, routes, traversal surfaces, gameplay cover, doorway dimensions, or sightlines. `map:check` blocks these; if you need one, stop and ask the owner.
- Commit, or use `git reset`, `stash`, `clean`, `checkout`, or `restore` at all. Reverting is done from the before snapshot.
