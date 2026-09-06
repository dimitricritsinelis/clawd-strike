Audience: human, implementation-agent
Authority: normative
Read when: map, visuals, ai, gameplay, ui, public-contract, perf, tooling, docs
Owns: durable internal decisions that future tasks should not rediscover
Do not use for: current task status, temporary bug lists, per-task notes, public browser-agent behavior details
Last updated: 2026-09-05

# Durable Decisions

## DEC-001: Authority surfaces are role-based
- `AGENTS.md` owns the durable repository-wide implementation safeguards.
- `docs/decisions.md` owns durable internal decisions, while the current user prompt owns the bounded task.
- `README.md` is quick start only, `docs/map-design/layout-reference.md` is generated reference evidence, and `apps/client/public/skills.md` is the public browser-only contract.
- Tool shims such as `CLAUDE.md` may point to authority surfaces, but they may not restate or redefine policy.

## DEC-002: Structured truth outranks prose summaries
- Durable structured truth lives in specs and contracts such as `docs/map-design/specs/map_spec.json`, `docs/map-design/shots.json`, and `apps/client/public/skills.md`.
- Generated views, artifacts, bundled skill docs, and other evidence surfaces are never authoritative over their owning specs and contracts.
- Prefer code, scripts, specs, and runtime contracts over new prose when they can answer the question.

## DEC-003: Map authority and runtime generation
- Map geometry authority is `docs/map-design/specs/map_spec.json`; the detailed birdseye and top-down layout are derived reference evidence.
- `docs/map-design/shots.json` owns the authored fixed signoff-shot contract. The per-unit review poses used by `pnpm map:shoot` are derived from the spec and do not enter that inventory.
- The source spec owns implemented map state. Approved building cards and references guide intended design; translate their decisions into the owning source records. Generated views and unapproved proposals cannot replace either authority.
- Runtime map data must be regenerated with `pnpm --filter @clawd-strike/client gen:maps`.
- Do not hand-maintain drift in `apps/client/public/maps/`.

## DEC-004: Public contract fairness boundary
- `apps/client/public/skills.md` is a browser-only public contract and must remain separate from internal process docs.
- The public contract must not expose coordinates, hidden enemy state, routes, seeds, landmark IDs, or other repo-only tactical truth.

## DEC-005: Visual cadence and repository validation have separate owners
- Package scripts and CI own the executable validation surface.
- `.claude/skills/map-polish/SKILL.md` is the sole map-polish procedure, the map quality bar owns visual judgment, `AGENTS.md` contains only durable repository safeguards, and Git history is the only record of what was done.
- Command cadence, temporary gate composition, and current CI coverage must not be frozen in this decision log.

## DEC-006: The Bazaar target is a finished Middle Eastern market
- Play-facing map work should read as a high-quality shipped Middle Eastern bazaar, with complete architecture, stalls, openings, overhead cloth, attachments, props, and material finish.
- Preserve overall map identity and general layout by default, but allow local rebuilding and changes to directly coupled visual systems when they materially improve the bounded section. This does not imply a map-wide overhaul.
- Rendered comparisons from the same deterministic camera poses are the primary evidence of improvement.

## DEC-007: Agent tooling stays out of the repo root surface
- Repo-local agent tooling is not game runtime code and is not part of the public `apps/client/public/skills.md` contract.
- Keep agent-only deploy or debug bundles outside the repo root unless agent-driven deploy or debug becomes an explicit repo workflow requirement.

## DEC-008: Hunt pressure prevents indefinite round stalling
- Bot behavior includes a profile-tuned hunt-pressure system that forces progressively more aggressive behavior over time within a round.
- Hunt pressure is independent of tier/difficulty — it ensures that no round can stall indefinitely regardless of how low the current difficulty is.
- The shared baseline uses search/full-pressure thresholds of 30/75s for waves 1–2, 25/60s for waves 3–4, 20/50s for waves 5–6, and 15/40s from wave 7 onward.
- Effects ramp continuously through the active profile window: OVERWATCH hold distance shrinks, flank budgets grow, shared-knowledge trust rises, collapse scoring strengthens, and directive commit windows shorten.
- The search-phase ladder compresses with that same window from caution through probe/sweep/collapse to full pinch.
- Hunt uses uncertain zone/node estimates with delayed squad sharing rather than exact player-coordinate injection. Full hunt must replan destinations into likely contact zones, not just relabel states.
- Zero-contact rounds must still bootstrap a believable search from enemy-spawn inference, cleared-zone elimination, and coordinated lane tasks; the squad may not wait forever for first sight or sound before beginning the hunt.
- This guarantees that idle or hidden players are eventually collapsed on without wallhack-like omniscience, which is required for both human gameplay feel and RL agent training signal.

## DEC-009: Layout reference catalog is generated evidence, not authority
- Fine-grained map naming authority for areas, frontages, walls, and corner callouts lives in `docs/map-design/specs/map_spec.json` under `layout_reference`.
- The human-readable catalog is generated into `docs/map-design/layout-reference.md` and `docs/map-design/layout-reference.svg` with `pnpm --filter @clawd-strike/client gen:layout-reference`.
- The generated catalog is reference evidence only. It must never outrank `docs/map-design/specs/map_spec.json`, `docs/map-design/shots.json`, or approved refs.

## DEC-010: Sitewide champion stays separate from local best
- The public agent contract keeps `score.best` scoped to the current browser context so local self-improvement loops and existing no-context agent behavior remain stable.
- The sitewide shared record is exposed separately as `sharedChampion`, shown on the loading screen and runtime score surfaces, and overwritten only by a strictly higher score.
- The shared record stores holder name, score, mode, and timestamp, but it is not a multi-entry leaderboard.

## DEC-011: Direct champion writes are retired
- `GET /api/high-score` remains public and read-only, but browser clients may no longer write arbitrary champion scores directly.
- Public champion submissions now use a server-issued run token plus a server-side validator over run summary stats before any overwrite attempt.
- Public run submissions stay enabled by default through `/api/run/start` and `/api/run/finish`; `SHARED_CHAMPION_ENABLE_PUBLIC_RUNS=false` is an emergency kill switch. Direct `POST /api/high-score` writes are retired, including the former admin-secret bypass. Admin stats access does not authorize champion writes.

## DEC-012: Validated run history is private server-side data
- Every accepted validated run is persisted as a first-class server-side run record rather than only as audit JSON or the single shared champion row.
- Public browser/game contracts stay unchanged; run history is exposed only through protected internal admin stats endpoints, not through `/skills.md` or public runtime payloads.
- Client/network metadata for stats storage uses privacy-preserving HMAC fingerprints, not raw IP addresses or raw user-agent strings.

## DEC-013: Shared champion storage accepts standard provider URL aliases
- Shared champion server routes prefer explicit overrides (`POSTGRES_WRITE_URL`, `POSTGRES_READ_URL`) but must also accept standard marketplace/provider aliases such as `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL`, and `NEON_DATABASE_URL`.
- Production compatibility with deployment-provided aliases is required for the public champion surface; do not narrow production back to a single env var name.
- The resolver behavior is covered by a server-side regression test and CI job so deploy-time config assumptions fail before release.

## DEC-014: Production shared-champion ops use explicit envs and fail-closed stats auth
- Production deployments should set explicit `POSTGRES_WRITE_URL` and `POSTGRES_READ_URL` even though runtime alias fallback remains supported for compatibility.
- Admin stats must fail closed in production when `STATS_ADMIN_TOKEN` is missing; the built-in fallback token is development-only.
- Shared champion schema/history reconciliation runs through a dedicated operator command using an unpooled Postgres URL rather than relying on the first live request to bootstrap storage.

## DEC-015: Public agent SDK is a separate repo fed by one-way export
- The public agent SDK lives in a separate git repository with its own history, package metadata, README, and CI.
- The game repo remains authoritative for the live `/skills.md` contract, the public browser/runtime API, and the export logic that produces SDK artifacts.
- Export flow is one-way from the game repo into the SDK repo. The game runtime must not import from the SDK repo, and the SDK repo must not become a workspace package, submodule, or subtree of the game repo.
- The exporter manages the public-safe SDK snapshot, including the mirrored `skills.md`, helper code, learning runner, README/docs, CI workflow, and manifest/checksums.

## DEC-016: Shared champion Postgres URLs normalize legacy SSL modes to verify-full
- Shared champion Postgres URLs may arrive from provider env vars with legacy `sslmode=prefer`, `sslmode=require`, or `sslmode=verify-ca`.
- Repo runtime behavior should normalize those modes to `sslmode=verify-full` before handing the URL to `pg`, preserving the repo’s current strict certificate-validation intent while avoiding the current driver warning.
- Production operators should validate shared-champion DB constraints through a dedicated command after reconcile reports a clean database, instead of relying on reconcile side effects.

## DEC-017: Buff-orb visuals must scale without dynamic per-orb lights
- Runtime buff orbs should preserve their glowing pickup readability, but they must render through pooled shared resources rather than per-orb scene graphs with dynamic lights and per-instance material allocation.
- Idle runtime performance and orb-scaling performance are both first-class perf surfaces; orb perf validation must include zero-orb baseline plus multi-count orb scenarios rather than a single fixed orb count.
- Future orb-look changes should preserve that scalability boundary unless a new owning perf decision explicitly replaces it.

## DEC-018: Bazaar v3 uses authored surfaces and explicit connectivity
- `bazaar-map` format v3 is a 56×92 m three-macro-lane layout whose zones, traversal surfaces, transitions, spawns, frontages, districts, dressing clusters, and asset metadata are authored in `docs/map-design/specs/map_spec.json` and compiled without silent clamps.
- Player grounding, bot grounding/navigation, floor collision, LOS, bullets, hit-zone classification, prop placement, and wall/cage heights must share the authored elevation contract. The Tea Terrace loop is a player-and-bot route at 1.4 m, not a visual-only platform.
- Exterior perimeter façades remain sealed. Inward openings are noninteractive dressing unless the spec identifies a connector footprint as a real passage.
- Runtime maps, layout references, topdown SVG, and review shots are generated evidence. The public map ID, ten-enemy wave/scoring contract, controls, and `/skills.md` payload remain unchanged.

## DEC-019: Daylight and Bazaar references have distinct roles
- The five CS2 screenshots `docs/map-design/refs/cs2_daylight_ref_1..5.png` are references for bright daylight, value discipline, clarity, material response, and shipped-game finish.
- `bazaar_main_hall_reference.png` is the identity and content reference for layered architecture, market density, stalls, facade vocabulary, and hanging cloth. Its dusk mood, darkness, and saturation are not targets.
- Evaluate rendered screenshots holistically rather than steering the map toward a metered color target.

## DEC-020: Historical map-process artifacts are not live instructions
- Historical map planning and process documents are evidence only. They do not define the current task or hold active workflow state.
- Current map-polish procedure lives only in `.claude/skills/map-polish/SKILL.md`; Git history holds what was done. The user prompt remains the task boundary.

## DEC-021: Gameplay profiles start from one shared balance baseline
- `Desktop Human` is the canonical gameplay balance baseline. `Mobile Human` and `Desktop Agent` share its exact balance-bearing waves, enemy, player, buffs, and flow configuration until an explicit profile-specific change is approved.
- Platform capability differences, such as mobile touch availability or the desktop agent control contract, do not authorize implicit difficulty differences.
- Profile identities and competitive boards remain separate even while mechanics are equal. Any approved mechanic change must bump the affected tuning revision rather than reusing an old board.
- `docs/gameplay-balancing.md` owns the baseline-first tuning procedure and divergence register; runtime values and equality enforcement remain authoritative in `apps/client/src/runtime/tuning/gameplayTuning.ts` and its tests.

## DEC-022: Facade composition is authored, evidenced in plan, and gated absolutely
- Where openings sit on a wall is a design decision, not a spacing rule. `frontages[].layoutIntent.mode` is `generated` (rhythm grammar, evenly spread between edge margins; quiet backdrops only) or `authored` (named columns, declared mirrors about an axis, a declared corner treatment, one ordering sentence). Both pass the same physical grammar in `apps/client/scripts/lib/facade-layout-grammar.mjs`; the runtime accepts `layoutSource` `generated | authored`.
- Where openings belong is decided from the plan (`pnpm map:shoot` renders a north-up plan crop of the unit) and its neighbours, never from a corridor screenshot alone. Better than blank is not the bar; arbitrary placement is not a fix.
- Units whose dominant faces are all exemptions need frontage or massing, which is an owner decision: ask rather than decorate.

## DEC-023 / DEC-024: Superseded map-polish orchestration and survey gates

The original decisions are preserved in the [historical archive](map-design/archive/map-polish-orchestration-decisions-2026-08-17.md). DEC-025 supersedes both; their commands, model pins and survey requirements are inactive.

## DEC-025: Map polish is a fast in-session loop, not an orchestrated pipeline
- The survey/schedule/plan/write/verify/blind-review pipeline (DEC-023, DEC-024) shipped one accepted change in 18 days across roughly 11,000 lines of orchestration. It is removed. Everything on the map needs work, so ranking it first is wasted motion.
- The [map-polish skill](../.claude/skills/map-polish/SKILL.md) owns the bounded implementation loop, snapshots, checks, performance comparison and task boundaries. [AGENTS.md](../AGENTS.md) owns branch, provenance, determinism, gameplay and clearance safeguards; the [quality bar](map-design/quality-bar.md) owns visual acceptance. Keep the procedure in those owners rather than duplicating it here.

## DEC-026: Every wall belongs to a building
- `buildings[]` in `map_spec.json` is the design layer above frontages: id, type (shop, shop row, house, tea house, workshop, store row, landmark, arcade, service back, compound wall), storeys, a one-line brief, and the zone faces it owns. Every frontage carries `buildingId`; `map:check` fails a frontage without one. Code-owned identity planes are registered as buildings with faces and no frontage.
- A face that holds more than one building is split into one frontage per building. Three faces were split on 2026-09-04: Dyers Alley west (dye works, dyers' house), North Court east (two houses), Service North spine (stores back, tea house back, yard wall). Spice Street keeps one frontage per side as a shop row because its dressing anchors bind to generated bay ids.
- The [development plan](map-design/development-plan/README.md) owns current design proposals and approval routing; the quality bar's type table is a judgment aid. Approved cards guide the owning building task, while the source spec owns implemented state. Generated layout mode is retired face by face as each building is authored.
- Massing heights on the Service North retaining spine were left at 7 m: the spine holds the raised Tea Terrace's sightline and height is a gameplay matter.
- Addendum 2026-09-04: every building carries `walls[]`, the wall schedule: per frontage the corners, ground head, every bay with module and position (metres and `along`), dressing assets with placement, assets still needed, and a one-line rule. 40 walls, 123 bays, 54 dressing items scheduled. Compound walls are one blind niche on the axis (two on spans over 6 m), never a lone pilaster: a 2.25 m pilaster module standing alone reads as a bollard. Eleven frontages are authored from the schedule; the remaining 27 are implemented by the loop, one building per iteration. The runtime no longer invents upper openings; upper bays come only from compiled STORY_ placements.
- Audit clarification 2026-09-04: schedules are design proposals checked against the building, compiler, and render. Correct contradictions during the owning building task; do not blindly implement schedules or weaken safety checks. Authored uppers require explicit `story`; generated layouts still choose uppers automatically. An implemented schedule alone does not establish visual signoff.

## DEC-027: The target is an image and the judge is not the builder
- Each review unit has a target image in `docs/map-design/targets/` (prompts in `targets.json`); the founding image is the fallback. `pnpm map:shoot <unit> --tag <x>-after` writes a blind A/B critic brief; a fresh-context critic (`.claude/skills/map-critic/SKILL.md`) picks the winner and names one gap. Acceptance is winning that comparison. The quality bar is the critic's rubric, not the builder's reading list.
- A frontage with `facadeModelId` hands its street face to an authored GLB registered in `apps/client/public/assets/models/environment/bazaar/facades/models.json`. The runtime keeps the wall mass, roof edge and collision and drops the kit's face modules and accessories for that frontage. This is the primary path to reference quality; kit layout authoring remains for quiet backdrops.
- `pnpm map:check --baseline` records the task-start state under `artifacts/map-shoot/.baseline/`; checks then fail only on protected changes made after it. Without a baseline the guard compares to HEAD as before.
- Performance is one worst-view number per section against the existing budget. Per-view CPU deltas and repeat-timing rules are retired; district completion keeps `validate:map-layout` and `qa:completion`.
- The design atlas, building cards, M01-M08 gates, graybox protocol and lifecycle states are reference, not loop reading. No building is frozen; locked means the protected domain plus the original textile booth files.
- Textures come from CC0 scans (`scripts/fetch-cc0-texture.mjs` records source, license and MD5) or image generation. Numpy-synthesized textures in build scripts are retired.
- Why: on 2026-09-04/05 the loop spent its turns on compliance (baselines, hashes, matched sets, verification prose) and the builder judged its own work; the working comparisons (Anshu's image-target loop, Shumer's blind builder/critic loop) differ on exactly these points.

## DEC-028: Orchestrator and builders, palette-matched facades, nothing ships worse
- The map run has two roles: an orchestrator (GPT-6, reasoning xhigh) that owns targets, ranking, briefs, integration (`scripts/apply-facade-package.mjs`), captures and the keep/revert verdict, and parallel Blender builders (GPT-6 Astra, reasoning medium) that each own one unit's `assets/source/<unit>/` and hand over `package.json`. Parallelism is by unit, never by layer within a unit.
- Facade materials come only from `assets/source/facade_materials.py`, which builds Blender materials from the wall pack's `materials.json` (tint x albedoBoost, world-scale cube UVs at tileSizeM, ARM roughness/metal/occlusion, normalScale). The 2026-09-05 run's pale facades came from raw scans bypassing the kit palette.
- Every cycle ends with a mechanical verdict; a losing cycle is reverted with `apply-facade-package.mjs revert`. Units are worked worst-first from a one-pass ranking against their targets; units already close are skipped.
- `preview.py` renders an asset alone before integration; the critic is folded into the orchestrator's screenshot step rather than a separate agent by default.
- Addendum 2026-09-05 (evening): ownership moved from frontages to zones. `zones[].sectionModelId` mounts one GLB at the rect's south-west corner on the zone floor and covers every face the zone sees, including the 74 exempt faces the frontage path could not reach. Builders compose from `assets/source/facade_kit.py` (Frame in plan metres, Wall parts: skin, plinth, course, coping, pilaster, corbels, door, window, lattice, arch, niche, awning, sign, upper_room). GLBs export without images; `buildFacadeModels.ts` rebinds `ph_*` material names to the wall pack with the kit's shader tweaks. The judge is a fresh Astra-medium subagent, not the orchestrator. Units start with one score-3 calibration unit, then worst-first; the score sets the scope. `preview.py --section W,H` renders the zone from its centre. Palette widened to 48 pack materials via `fetch-cc0-texture.mjs`.
- Addendum 2026-09-05 (senior review): sections own named faces only (`sectionFaces`), never the whole zone by default, so accepted work outside a brief's scope survives activation. Builders are persistent per zone at Astra high; the brief is written once and stays stable; generated target images are inspiration, not the bar; the judge reports which named problems improved and what regressed, and keep requires a win with no regressions. Composition before detail; targeted custom geometry allowed when the kit falls short; `build.py` stays the source of truth with Blender MCP for inspection only.
