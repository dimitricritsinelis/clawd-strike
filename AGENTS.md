Audience: implementation-agent
Authority: normative
Read when: implementation work
Owns: durable repository-wide safeguards
Do not use for: task status, map-polish procedure, or historical rationale
Last updated: 2026-09-05

# AGENTS.md — Clawd Strike Operating Contract

## Task scope and instruction authority

- Apply this contract to repository work alongside global preferences. The user's explicit instructions define the current task; follow applicable system and developer instructions first.
- Carry forward authorization and decisions within the current task. A follow-up question or status request does not revoke them. Do not infer implementation approval from a proposal or historical record.
- Scale verification to the changed behavior. Documentation-only work needs document and diff checks, not captures. Map implementation is verified by the loop in the map-polish skill.

## Map development

- The loop is `.claude/skills/map-polish/SKILL.md`, run unattended by Codex with three roles: one orchestrator (GPT-6, xhigh) that owns scores, one stable brief per zone, integration, captures and keep/revert; one persistent builder per zone (GPT-6 Astra, high) that composes from `assets/source/facade_kit.py` with targeted custom geometry where the kit falls short; and a fresh judge per cycle (GPT-6 Astra, medium). No other subagents. Codex does not auto-load skill files: open them by path.
- Two steps. Step 1 (prepare) shoots every zone, scores it 1 to 5 against the founding image and the CS2 references, and writes one brief per zone in `docs/map-design/briefs/` from the before shots and the design atlas cards; this is the only time `docs/map-design/development-plan/` is read. The user may edit scores and briefs between steps. Step 2 (execute) runs the loop from the briefs alone. The score sets the scope (skip, finish only, named walls, every wall). Composition before detail. A closing sweep judges the sixteen signoff cameras in `docs/map-design/shots.json`.
- A cycle is: fresh `r-before`, `node scripts/apply-facade-package.mjs apply <unit>`, `r-after`, `critic/problems.md`, verdict per `.claude/skills/map-critic/SKILL.md`, keep or `revert`. Keep only when the after render wins, a named problem improved, and nothing regressed or blocks. `revert` restores the last accepted files. A zone never ends worse than it started.
- Builders write only `assets/source/<unit>/` and hand over `package.json` with one section GLB per zone that owns only the faces it names (`zones[].sectionModelId` + `sectionFaces`); the kit keeps its details on every other face, so a section never silently removes work outside its scope. Each wall face has one owning zone. Materials are pack ids only; the GLB carries names and the runtime rebinds them to the kit's wall materials. The orchestrator is the only writer of `map_spec.json`, manifests and runtime code.
- Scope without asking: everything render-only on the unit's faces (facades, upper volumes, cloth, awnings, signs, props). Shared systems (floor, sky, cloth canopy, prop library, shaders, lighting) and kit code deletion are logged in the row, not touched during a run.
- Never ask the user during a run. Never write status prose. The progress table in `docs/map-design/development-plan/README.md` is the only record: unit, cycles, result, remaining gap.
- `docs/map-design/development-plan/` is consumed into the briefs in step 1 and is not read during step 2. No building is frozen. Locked means the protected domain guarded by `pnpm map:check` plus the original textile booth files. On a guard failure, revert the package and continue.
- Performance is one line per shoot (`perf worst view`). Act only on `OVER BUDGET`; aim under 25k triangles per facade. The run ends with `pnpm validate:map-layout` and `pnpm qa:completion` once. A command failing three times in a row is a tooling defect to fix inside the map scripts or a unit to skip, never a stall.

## Branch and worktree safety

- Stay on the current branch and preserve unrelated worktree changes.
- Keep one writer for shared files: the orchestrator. Builders write only inside their own `assets/source/<unit>/`. Do not run a second agent session against this checkout while a map run is active; concurrent edits trip the protected guard.
- Before a Git operation that could change `HEAD`, inspect `git status --short` and `git branch --show-current`.
- Change branches, commit, or push only when the user explicitly authorizes that action for the current task.
- Never use destructive Git operations such as reset, clean, stash, or auto-stash, and never discard or overwrite unrelated changes. Never use checkout or restore as a rollback either. Revert your own edit by restoring the file from a snapshot taken before the edit (`map:shoot` before tags snapshot `map_spec.json`).

## Generated-file authority

- `docs/map-design/specs/map_spec.json` is map authority. `docs/map-design/shots.json` owns the authored fixed signoff cameras; the per-unit review cameras used by `pnpm map:shoot` are derived from the spec and do not belong there.
- Generated map files, layout references, top-down views, screenshots, and other artifacts are evidence, not authority.
- Regenerate map outputs with `pnpm map:check` (or `pnpm --filter @clawd-strike/client gen:maps` and `gen:layout-reference`). Never hand-edit generated map files.

## Determinism and asset provenance

- Preserve deterministic behavior, stable seeds, and stable generation order. Use the repository's `DeterministicRng` path for seeded visual variation; do not introduce unseeded procedural variation.
- New external textures and models must be CC0 and recorded in the owning manifest with source, license, and MD5 provenance. Project-original GLBs record their `build.py` source and dependencies the same way.

## Gameplay and system safety

- During map-visual work, broadly preserve layout, collision, traversal surfaces, spawns, routes, cover, sightlines, player movement, and combat unless the user explicitly changes that scope for the current task.
- Local structural composition, render-only geometry, materials, openings, attachments, props, dressing, and directly coupled shared visual systems may change when those safeguards remain intact.
- Render-only work must not silently change navigation, player or bot grounding, projectile collision, line of sight, opening clearance, or practical route width.

## Movement paths stay clear

Preserving traversal is not enough on its own. Anything placed in or near a route must also leave the path a player actually walks genuinely clear.

- Keep the walking envelope clear of geometry, props, and dressing. The authored clearances in `constraints` in `docs/map-design/specs/map_spec.json` are the floor, not the target; `no_block_zone` also requires dressing clusters to sit at authored edges.
- This applies whether or not the object collides. A colliding prop snags movement; a non-colliding one lets the player walk through it, which is a worse visual failure than not placing it at all.
- Clearance is measured through the whole body volume a player occupies while moving, not just at the object's own footprint: check standing and crouched height, the swept path through doorways, corners, and stair or ramp transitions, and the inside line of every turn.
- None of this is a reason to under-dress a section. Density belongs against wall bases, in recesses and alcoves, on counters and sills, on the outside of turns, and above head height. Push dressing to the edges rather than removing it.
- Fixed-camera review cannot detect this class of defect, because a still frame does not move through the space. The facade loader warns when relief below head height exceeds 0.35 m; the run's closing `validate:map-layout` and the critic's route views cover the rest.
