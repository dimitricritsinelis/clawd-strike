Audience: human, implementation-agent
Authority: status
Read when: map, visuals, ai, gameplay, ui, public-contract, perf, tooling, docs
Owns: repo-wide short-lived coordination state, active task claims, current blockers, recent completed outcomes
Do not use for: workflow policy, durable rationale, archive history, product truth already owned by specs/contracts
Schema version: stm-v2
Canonical playtest URL: http://127.0.0.1:4174/?map=bazaar-map
Map approval status: NOT APPROVED
Last compacted: 2026-03-12T00:38:50Z

# short_term_memory.md - Clawd Strike Status

## Active Snapshot
<!-- GENERATED START: active-snapshot -->
- STM-20260309-154233-codex | active | codex | ui-flow | Loading-screen champion b... | next: Wait for review or make a...
- STM-20260309-223704-codex | blocked | codex | docs | Lean AGENTS and mirror docs | next: Resolve the blocked build...
<!-- GENERATED END: active-snapshot -->

## Shared Ephemera
- none

## Task Cards

### STM-20260309-154233-codex | active | ui-flow | Loading-screen champion badge typography
Owner: codex
Branch: codex/champion-badge-font
Goal: Keep the loading-screen shared-champion badge typography update ready for review or typography-only follow-up.
Done when: Review lands or any requested typography-only adjustment is applied without moving badge placement or alignment.
Authority:
- apps/client/src/styles.css
Files:
- apps/client/src/styles.css
Context:
- Only loading-screen shared-champion badge typography changed.
- Placement and alignment stayed unchanged.
- Longer names ellipsize sooner because badge width stayed fixed.
Next:
- Wait for review or make a typography-only adjustment if requested.
Blockers:
- none
Recent Notes:
- 2026-03-09T15:42:33Z | claim | Claimed task.

### STM-20260309-223704-codex | blocked | docs | Lean AGENTS and mirror docs
Owner: codex
Branch: map-dev
Goal: Keep the STM-based policy surfaces lean by trimming AGENTS.md and removing duplicate authority prose from the mirror docs.
Done when: AGENTS.md stays under 6 KB, mirror docs stay lean, DEC-001 and DEC-002 stay durable, and the required validation gates pass.
Authority:
- AGENTS.md
- docs/decisions.md
Files:
- AGENTS.md
- README.md
- docs/decisions.md
Next:
- Resolve the blocked build gate or confirm it is unrelated to the docs rewrite.
Blockers:
- none
Recent Notes:
- 2026-03-09T22:37:09Z | blocker | Blocked on pnpm build hanging after Vite reports 96 modules transformed.
- 2026-03-09T22:37:09Z | progress | Trimmed AGENTS to 79 lines and 6141 bytes; cleaned README and CLAUDE; rewrote DEC-001 and DEC-002.
- 2026-03-09T22:37:04Z | claim | Claimed task.

## Recent Completed Rollup
<!-- TOOL-MANAGED START: completed-rollup -->
- STM-20260312-003607-codex | map-visual | Restore balcony arch cap | 2026-03-12 | Set the Spawn B balcony hero stone and glass arch starts to 8.2m, raised the opening and surround heights to restore visible arch cap, sharpened the hero curve, and qa:completion passed.
- STM-20260312-003035-codex | map-visual | Set balcony arch start to 8m | 2026-03-12 | Set the Spawn B balcony hero stone and glass arch starts to 8.0m by updating the hero spring-line values; pnpm qa:completion passed.
- STM-20260312-002235-codex | map-visual | Align arch to parapet top | 2026-03-12 | Aligned the Spawn B balcony hero window arch start to the top of the visible parapet trim above the roofline; pnpm qa:completion passed.
- STM-20260312-001800-codex | map-visual | Raise balcony arch start | 2026-03-12 | Corrected the balcony hero window arch start by raising the spring line while preserving the current placement and overall height; pnpm qa:completion passed.
- STM-20260312-000854-codex | map-visual | Lift balcony window again | 2026-03-12 | Raised the Spawn B balcony hero window another 0.35m without changing its shape so the arch start moves closer to the roofline; pnpm qa:completion passed.
<!-- TOOL-MANAGED END: completed-rollup -->
