Audience: human, implementation-agent
Authority: normative
Read when: map, visuals, ai, gameplay, ui, public-contract, perf, tooling, docs
Owns: durable internal decisions that future tasks should not rediscover
Do not use for: current task status, temporary bug lists, per-task notes, public browser-agent behavior details
Last updated: 2026-09-04

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
- Map-design authority lives in structured files and approved refs, not prose packet docs.
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

## DEC-011: Direct champion writes are internal-only
- `GET /api/high-score` remains public and read-only, but browser clients may no longer write arbitrary champion scores directly.
- Public champion submissions now use a server-issued run token plus a server-side validator over run summary stats before any overwrite attempt.
- Public run submissions stay enabled by default once the validated run-token flow exists; `SHARED_CHAMPION_ENABLE_PUBLIC_RUNS=false` is an emergency kill switch, and direct `POST /api/high-score` remains internal admin-only behind a secret.

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

## DEC-023 (superseded by DEC-025): Map-polish is engine-agnostic with a per-pass engine pin and a code-owned loop
- The workflow owns correctness: the bounded loop, gates, and validators live in code (`map:loop` → planner → `map:run` → `map:verify`); agents launch it and babysit its stop reasons, they do not orchestrate.
- A single ModelEngine abstraction (`--engine codex|claude`, env fallback `MAP_POLISH_ENGINE`) serves four roles — planner, survey, writer, reviewer — with generalized per-call telemetry `{engine, role, model, effort, wallMs, usage, costUsd?}`.
- The engine is pinned in state at survey time; `map:run`/`map:loop` refuse a different engine unless the pass is resurveyed. A failed call is a workflow failure, never a cross-engine fallback; no mid-pass switch.
- Claude runs the Claude Code CLI headless (`--bare`, pinned `claude-fable-5`, per-role `--effort`/`--max-budget-usd`); images are read via its Read tool, not an image flag. Survey/reviewer/planner are isolated in a fresh temp dir with only image copies and `--allowedTools Read` — blindness by directory plus tool allowlist, not a hard sandbox. The writer edits the repo under `acceptEdits` with Read/Edit/Write/Glob/Grep and no Bash.
- Tests never make real model calls; they use fake binaries via `CODEX_BIN`/`CLAUDE_BIN`.

## DEC-024 (superseded by DEC-025): Survey wall coverage is a fail-closed survey gate
- Geometry-derived named views (`primary`, `context`, `elev:*`, `cross-a`/`cross-b`, `upper`) must cover every wall face: a sample is usable when it sits inside a view's horizontal wedge at ≤30 m with incidence ≤60°, and full-height when the frame reaches the wall top.
- Thresholds block `map:survey` and `map:verify` when unmet: every wall face ≥6 m needs ≥80% usable; every authored frontage needs ≥90% usable and ≥85% full-height; map-wide full-height must be ≥85%. `pnpm map:coverage` prints the per-face table.
- `SURVEY_POSE_RULESET_VERSION` is hashed into survey authority, so pose-rule changes invalidate old surveys and force resurvey.
- Acceptance recaptures the same named poses, so a wall no view can see can never be silently unrated-and-unacceptable.
- Remaining blind spots — overhead/canopy interiors and rooftops — are documented, not gated.

## DEC-025: Map polish is a fast in-session loop, not an orchestrated pipeline
- The survey/schedule/plan/write/verify/blind-review pipeline (DEC-023, DEC-024) shipped one accepted change in 18 days across roughly 11,000 lines of orchestration. It is removed. Everything on the map needs work, so ranking it first is wasted motion.
- The loop is the agent in the session: choose a bounded building or shared defect, capture with a unique `<task>-before` tag, name visible acceptance criteria, fix the owning spec or render code, check, reshoot with the matching `<task>-after` tag, keep or restore the immediate snapshot. The owner reviews and commits; agents do not commit.
- `map:check` is a static protected-authority check against HEAD, not proof of all gameplay safety. Matching captures also compare actual runtime collider hashes and retain performance evidence. Traversal and visual route clearance remain necessary. `pnpm validate:map-layout` runs 12 blockout routes plus bot smoke after route-adjacent changes, including render-only projections, and before handing off kept map changes.
- Quality judgment uses the same model, matching before/after views, and the shipped-game references in `docs/map-design/quality-bar.md`. Accept a resolved defect and complete affected assembly without claiming the entire unit finished. Performance uses the existing budget; repeatable regressions block acceptance. No scheduler, ratings, engine pins, or mandatory blind reviewer.
- Goal mode uses a finite list of outcomes and explicit evidence, not "keep polishing until CS2 quality." Keep related iterations in one task; start fresh at a building-batch or unrelated part boundary. One writer per checkout prevents captures from reading another writer's transient spec. Missing dependencies remain incomplete work, not a reason for endless retries.
- The bar is a shipped Counter-Strike 2 map.

## DEC-026: Every wall belongs to a building
- `buildings[]` in `map_spec.json` is the design layer above frontages: id, type (shop, shop row, house, tea house, workshop, store row, landmark, arcade, service back, compound wall), storeys, a one-line brief, and the zone faces it owns. Every frontage carries `buildingId`; `map:check` fails a frontage without one. Code-owned identity planes are registered as buildings with faces and no frontage.
- A face that holds more than one building is split into one frontage per building. Three faces were split on 2026-09-04: Dyers Alley west (dye works, dyers' house), North Court east (two houses), Service North spine (stores back, tea house back, yard wall). Spice Street keeps one frontage per side as a shop row because its dressing anchors bind to generated bay ids.
- The type table in `docs/map-design/quality-bar.md` is the design authority for what a wall of each type needs; the skill's building test judges the after image against it. Generated layout mode is retired face by face as each building is authored.
- Massing heights on the Service North retaining spine were left at 7 m: the spine holds the raised Tea Terrace's sightline and height is a gameplay matter.
- Addendum 2026-09-04: every building carries `walls[]`, the wall schedule: per frontage the corners, ground head, every bay with module and position (metres and `along`), dressing assets with placement, assets still needed, and a one-line rule. 40 walls, 123 bays, 54 dressing items scheduled. Compound walls are one blind niche on the axis (two on spans over 6 m), never a lone pilaster: a 2.25 m pilaster module standing alone reads as a bollard. Eleven frontages are authored from the schedule; the remaining 27 are implemented by the loop, one building per iteration. The runtime no longer invents upper openings; upper bays come only from compiled STORY_ placements.
- Audit clarification 2026-09-04: schedules are design proposals checked against the building, compiler, and render. Correct contradictions during the owning building task; do not blindly implement schedules or weaken safety checks. Authored uppers require explicit `story`; generated layouts still choose uppers automatically. An implemented schedule alone does not establish visual signoff.
