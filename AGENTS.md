Audience: implementation-agent
Authority: normative
Read when: implementation work
Owns: durable repository-wide safeguards
Do not use for: task status, map-polish procedure, or historical rationale
Last updated: 2026-09-04

# AGENTS.md — Clawd Strike Operating Contract

## Map development

- Before designing or placing map assets, read [the development plan](docs/map-design/development-plan/README.md), then the relevant building card and asset assignments.
- Approved designs guide implementation; `docs/map-design/specs/map_spec.json` owns implemented state. A proposed document is not approval.
- The [map-design archive](docs/map-design/archive/README.md) preserves superseded designs and workflow evidence. Read it only for explicitly historical work; it does not guide current development.
- Surface design conflicts instead of improvising. The plan's authority notes resolve older roadmap, schedule, and prose guidance; historical documents do not create development requirements. All safeguards below remain in force.

## Branch and worktree safety

- Stay on the current branch and preserve unrelated worktree changes.
- Before a Git operation that could change `HEAD`, inspect `git status --short` and `git branch --show-current`.
- Change branches, commit, or push only when the current user prompt includes that work.
- Never use destructive Git operations such as reset, clean, stash, or auto-stash, and never discard or overwrite unrelated changes. Never use checkout or restore as a rollback either. Revert your own edit by restoring the file from a snapshot taken before the edit.

## Generated-file authority

- `docs/map-design/specs/map_spec.json` is map authority. `docs/map-design/shots.json` owns the authored fixed signoff cameras; the per-unit review cameras used by `pnpm map:shoot` are derived from the spec and do not belong there.
- Generated map files, layout references, top-down views, screenshots, and other artifacts are evidence, not authority.
- Regenerate map outputs with `pnpm --filter @clawd-strike/client gen:layout-reference` and `pnpm --filter @clawd-strike/client gen:maps`. Never hand-edit generated map files.

## Determinism and asset provenance

- Preserve deterministic behavior, stable seeds, and stable generation order. Use the repository's `DeterministicRng` path for seeded visual variation; do not introduce unseeded procedural variation.
- New external textures and models must be CC0 and recorded in the owning manifest with source, license, and MD5 provenance.

## Gameplay and system safety

- During map-visual work, broadly preserve layout, collision, traversal surfaces, spawns, routes, cover, sightlines, player movement, and combat unless the current user prompt explicitly changes that scope.
- Local structural composition, render-only geometry, materials, openings, attachments, props, dressing, and directly coupled shared visual systems may change when those safeguards remain intact.
- Render-only work must not silently change navigation, player or bot grounding, projectile collision, line of sight, opening clearance, or practical route width.

## Movement paths stay clear

Preserving traversal is not enough on its own. Anything placed in or near a route must also leave the path a player actually walks genuinely clear.

- Keep the walking envelope clear of geometry, props, and dressing. The authored clearances in `constraints` in `docs/map-design/specs/map_spec.json` are the floor, not the target; `no_block_zone` also requires dressing clusters to sit at authored edges.
- This applies whether or not the object collides. A colliding prop snags movement; a non-colliding one lets the player walk through it, which is a worse visual failure than not placing it at all.
- Clearance is measured through the whole body volume a player occupies while moving, not just at the object's own footprint: check standing and crouched height, the swept path through doorways, corners, and stair or ramp transitions, and the inside line of every turn.
- None of this is a reason to under-dress a section. Density belongs against wall bases, in recesses and alcoves, on counters and sills, on the outside of turns, and above head height. Push dressing to the edges rather than removing it.
- Fixed-camera review cannot detect this class of defect, because a still frame does not move through the space. Confirm clearance by traversal — the canonical route smoke run, an agent traversal pass, or moving through the section in the running game — before treating a section as finished.
