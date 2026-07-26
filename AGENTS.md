Audience: implementation-agent
Authority: normative
Read when: implementation work
Owns: durable repository-wide invariants and validation routing
Do not use for: active task status, public browser details
Last updated: 2026-07-25

# AGENTS.md — Clawd Strike Operating Contract

## Contract and precedence

- This is the only normative repository-wide implementation policy. Do not duplicate it in entry points, skills, or subsystem notes.
- Specs, schemas, runtime contracts, and verification scripts outrank explanatory prose.
- `docs/decisions.md` owns durable rationale. The current user prompt owns the bounded task.
- For map-visual work, read `.claude/skills/map-polish/SKILL.md`, the quality bar, the named fixed-camera definitions, and only the source files needed for the bounded area.
- `progress.md` is deprecated; do not create, read, or update it. `REFACTOR_LOG.md` is allowed only for an explicitly requested PR-review or refactor trace.

## Sources of truth

- Map authority is `docs/map-design/specs/map_spec.json`. `docs/map-design/shots.json` owns review cameras and shot requirements.
- `docs/map-design/quality-bar.md` owns durable visual targets, final-signoff performance budgets, and map-finaling hard failures.
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
- Prefer reusable parameterized templates, loaded material libraries, and instancing when they meet the visible quality target. An appropriate authored hero asset is better than a visibly inferior reusable substitute.

## Map safety

- Treat layout, collision, traversal surfaces, spawns, sightlines, cover, authored routes, opening clearance widths, player movement, and combat as locked unless the user explicitly authorizes the relevant change.
- Within those locks, map-visual work may change render-only geometry, placement, materials, textures, lighting response, attachments, and authored one-off assets. Ordinary visual edits within the user-defined area do not require additional permission.
- Authored facade composition is not part of the layout lock. Which facade module occupies which bay, opening and fixture positions and centerlines, span and sign attachment heights, and facade rhythm may change when composition requires it, through map authority and its owning generators, provided collision, route width, and sightlines are unchanged. Do not defer a composition defect on the assumption that the spec is immutable.
- Render-only work must use render-only paths and must not silently change gameplay geometry or navigation.
- Player, bot, projectile, LOS, grounding, and elevation behavior must remain consistent with the authored map contract.
- Keep routes and openings usable and visually legible. Do not occlude doors or windows, float geometry, leave unsupported structures, or introduce visible intersections.
- Determine intersections from final transformed/rendered geometry, including instancing, deformation, and shader-visible displacement—not only source placement metadata or nominal AABBs.
- Visible polish must preserve FPS readability, callout clarity, and practical movement space.

## Change types and validation routing

Use one primary change tag: `map-geometry`, `map-visual`, `movement-sim`, `combat-gameplay`, `bot-ai`, `ui-flow`, `public-contract`, `perf`, `tooling`, or `docs`.

- `map-geometry`: read map authority; regenerate maps; verify the generated-map diff; run targeted geometry tests, all authored traversal routes, manual traversal, deterministic reference review, and `pnpm qa:completion`.
- `map-visual`: the user prompt defines the bounded area, allowed scope, and fixed cameras. Visible improvement in those cameras is the primary objective. Resolve composition before finish: run the computed composition audit below and clear its findings before any material, lighting, or dressing work on that area. The camera set must include one near-flat-on elevation of the whole area at a distance where bay rhythm, datum lines, and alignment are legible; add it through the authored shot schema when the existing set has none. Use the map-polish skill and quality bar for the iteration method and final validation.
- Composition audit (map-visual, map-geometry): compute it from map authority, never by eye. For the bounded frontage, tabulate every architecture and dressing placement with its centerline, width, sill height, and head height, plus the attachment height of every span, sign, and cable, then report attachments at or below an opening head, bays whose centerline misses the nearest upper-storey opening centerline by more than 0.15 m, bays carrying more than one primary function, fixtures with an ambiguous or absent served opening, and outliers in the bay-width and spacing series. Oblique and close-range cameras cannot show these defects; do not substitute them for the audit.
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
