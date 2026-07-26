Audience: implementation-agent
Authority: normative
Read when: implementation work
Owns: durable repository-wide safeguards
Do not use for: task status, map-polish procedure, or historical rationale
Last updated: 2026-07-26

# AGENTS.md — Clawd Strike Operating Contract

## Branch and worktree safety

- Stay on the current branch and preserve unrelated worktree changes.
- Before a Git operation that could change `HEAD`, inspect `git status --short` and `git branch --show-current`.
- Change branches, commit, or push only when the current user prompt includes that work.
- Never use destructive Git operations such as reset, clean, checkout/restore rollback, stash, or auto-stash. Never discard or overwrite unrelated changes.

## Generated-file authority

- `docs/map-design/specs/map_spec.json` is map authority. `docs/map-design/shots.json` owns review cameras and shot requirements.
- Generated map files, layout references, top-down views, screenshots, and other artifacts are evidence, not authority.
- Regenerate map outputs with `pnpm --filter @clawd-strike/client gen:layout-reference` and `pnpm --filter @clawd-strike/client gen:maps`. Never hand-edit generated map files.

## Determinism and asset provenance

- Preserve deterministic behavior, stable seeds, and stable generation order. Use the repository's `DeterministicRng` path for seeded visual variation; do not introduce unseeded procedural variation.
- New external textures and models must be CC0 and recorded in the owning manifest with source, license, and MD5 provenance.

## Gameplay and system safety

- During map-visual work, broadly preserve layout, collision, traversal surfaces, spawns, routes, cover, sightlines, player movement, and combat unless the current user prompt explicitly changes that scope.
- Local structural composition, render-only geometry, materials, openings, attachments, props, dressing, and directly coupled shared visual systems may change when those safeguards remain intact.
- Render-only work must not silently change navigation, player or bot grounding, projectile collision, line of sight, opening clearance, or practical route width.
