Audience: implementation-agent
Authority: normative
Read when: implementation work
Owns: durable repository-wide invariants and validation routing
Do not use for: active task status, production-cell procedure, public browser details
Last updated: 2026-07-25

# AGENTS.md — Clawd Strike Operating Contract

## Contract and precedence

- This is the only normative repository-wide implementation policy. Do not duplicate it in entry points, briefs, skills, or subsystem notes.
- Specs, schemas, runtime contracts, and verification scripts outrank explanatory prose.
- `docs/decisions.md` owns durable rationale. `docs/agent/active-brief.md` owns short-lived map-finaling context; it is not durable history.
- For map-visual work, read the active brief and the skill it links. Read only the owning spec, contract, references, and code needed for the bounded task.
- `progress.md` is deprecated; do not create, read, or update it. `REFACTOR_LOG.md` is allowed only for an explicitly requested PR-review or refactor trace.

## Sources of truth

- Map authority is `docs/map-design/specs/map_spec.json`. `docs/map-design/shots.json` owns review cameras and shot requirements.
- `docs/map-design/quality-bar.md` owns durable visual targets, performance budgets, and map-finaling hard failures.
- Generated map outputs, layout references, top-down views, screenshots, and artifacts are evidence, never authority.
- Regenerate map outputs with `pnpm --filter @clawd-strike/client gen:layout-reference` and `pnpm --filter @clawd-strike/client gen:maps`. Never hand-edit generated map files.
- `apps/client/public/skills.md` is the browser-only contract. Internal tooling and hidden map data must not leak into it.

## Branch and worktree safety

- Stay on the current branch unless the user explicitly instructs otherwise.
- Before any git operation that could change `HEAD`, inspect `git status --short` and `git branch --show-current`.
- Preserve unrelated worktree changes. Never switch branches, commit, push, reset, stash, auto-stash, discard, or overwrite unrelated changes unless explicitly authorized.
- If isolation would require moving branches or worktrees, stop and ask.

## Determinism and assets

- Preserve deterministic behavior, stable seeds, and stable generation order wherever runtime or generated output depends on them.
- Use the repository's `DeterministicRng` path for seeded visual variation; do not introduce unseeded procedural variation.
- Preserve and populate `userData.visualQa` or `userData.visualQaInstances` on QA-visible generated meshes.
- New external textures and models must be CC0 and recorded in the owning manifest with source, license, and MD5 provenance.
- Prefer reusable parameterized templates, loaded material libraries, and instancing over location-specific geometry or duplicate assets.

## Map safety

- Treat layout, collision, traversal surfaces, spawns, sightlines, cover, and authored routes as locked unless the task explicitly authorizes the relevant map-geometry change.
- Render-only work must use render-only paths and must not silently change gameplay geometry or navigation.
- Player, bot, projectile, LOS, grounding, and elevation behavior must remain consistent with the authored map contract.
- Keep routes and openings usable and visually legible. Do not occlude doors or windows, float geometry, leave unsupported structures, or introduce visible intersections.
- Determine intersections from final transformed/rendered geometry, including instancing, deformation, and shader-visible displacement—not only source placement metadata or nominal AABBs.
- Visible polish must preserve FPS readability, callout clarity, and practical movement space.

## Change types and validation routing

Use one primary change tag: `map-geometry`, `map-visual`, `movement-sim`, `combat-gameplay`, `bot-ai`, `ui-flow`, `public-contract`, `perf`, `tooling`, or `docs`.

- `map-geometry`: read map authority; regenerate maps; verify the generated-map diff; run targeted geometry tests, all authored traversal routes, manual traversal, deterministic reference review, and `pnpm qa:completion`.
- `map-visual`: read the active brief, linked map-polish skill, quality bar, fixed-camera definitions, and touched files; regenerate maps; run `pnpm typecheck`, focused QA, and exact-camera before/after review. Run `pnpm qa:completion` for a full visual checkpoint or when the active brief requires it.
- `movement-sim`, `combat-gameplay`, `ui-flow`: run the smallest targeted tests plus `pnpm smoke:game`; add human pointer-lock/menu/input smoke when feel or UX changes.
- `bot-ai`: run targeted tests, `pnpm --filter @clawd-strike/client bot:smoke`, and `pnpm smoke:game`.
- `perf`: record comparable before/after measurements and run the owning runtime smoke.
- `public-contract`: read the public contract and touched public state/API code; run `pnpm verify:skills-contract` and `pnpm smoke:no-context`.
- `tooling`: read the touched package scripts and `.github/workflows/ci.yml`; run the smallest targeted script or CI check plus any gate for changed runtime output.
- `docs`: read only the authority being corrected and linked durable decision when needed; run targeted reference/link scans. Add runtime-facing validation only if the documentation changes a public or executable contract.

## Completion

- A failing hard check blocks completion. Do not reinterpret `failed: true`, partial evidence, or isolated retries as a pass.
- Visible map, look-development, material, prop, lighting, and signoff-sensitive HUD changes require rendered inspection against their references.
- Passing CI does not replace tag-specific local validation.
- Use `pnpm qa:release` for release candidates.
