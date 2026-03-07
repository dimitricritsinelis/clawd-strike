Audience: human, implementation-agent
Authority: status
Read when: map, visuals, ai, gameplay, ui, public-contract, perf, tooling, docs
Owns: current branch state, active change tag, canonical run commands, next tasks, known risks
Do not use for: workflow policy, durable rationale, public contract details, archive history
Last updated: 2026-03-07

# progress.md — Clawd Strike Status

## Active Change Tag
- `bot-ai`

## Current Status (<=10 lines)
- Fixed 3 critical bugs in the hunt pressure system (DEC-008) that prevented bots from converging on the player.
- Bug 1: OVERWATCH range formula was inverted — shrinking the threshold made MORE bots enter OVERWATCH. Fixed by gating OVERWATCH on `huntPressure < 0.5` instead.
- Bug 2: Full hunt override required `knowledge` but bots had no knowledge when player was behind walls or memory expired. Fixed by injecting synthetic knowledge from player position when `huntPressure > 0`.
- Bug 3: Hysteresis reverted hunt-forced state changes. Fixed by moving the full hunt override AFTER the hysteresis block.
- Bots now converge toward the player starting at 45s (synthetic knowledge), with OVERWATCH bypass at 112s, collapse at 134s, and full hunt at 180s.
- `pnpm typecheck`, `pnpm build`, and `bot:smoke` all pass.
- Map approval is still pending a real human pointer-lock/combat pass on the current runtime defaults.

## Canonical Playtest URL
- `http://127.0.0.1:5174/?map=bazaar-map&autostart=human`

## Map Approval Status
- `NOT APPROVED`

## How to Run (real commands only)
```bash
pnpm dev
pnpm --filter @clawd-strike/client gen:maps
pnpm --filter @clawd-strike/client gen:layout-reference
pnpm typecheck
pnpm build
pnpm test:playwright
pnpm smoke:no-context
pnpm verify:skills-contract
pnpm qa:completion
pnpm --filter @clawd-strike/client bot:smoke
BASE_URL=http://127.0.0.1:5174 AGENT_NAME=SmokeRunner pnpm --filter @clawd-strike/client smoke:agent
BASE_URL=http://127.0.0.1:5174 pnpm --filter @clawd-strike/client capture:shots
BASE_URL=http://127.0.0.1:5174 pnpm qa:autonomous
```

## Last Completed Prompt
- Title: Fix hunt pressure bugs — bots still passive at 3+ minutes
- Changed: fixed 3 bugs in `EnemyManager.ts`: (1) gated OVERWATCH node shortcut and state on `huntPressure < 0.5` instead of inverted range formula, (2) injected synthetic knowledge from player position when `huntPressure > 0` and no natural knowledge, (3) moved full hunt override after hysteresis so it cannot be reverted.
- Files: `apps/client/src/runtime/enemies/EnemyManager.ts`, `progress.md`
- Validation: `pnpm typecheck`, `pnpm build`, `pnpm --filter @clawd-strike/client bot:smoke`

## Next 3 Tasks
1. Run a real human pointer-lock/combat pass and confirm bots converge within ~90s and full hunt kills an idle player by 180s.
2. Implement zone-based visibility culling using `map_spec.json` zone adjacency (highest remaining perf gain: 2-5ms in corridor views).
3. Pre-compress floor/wall textures to KTX2 (BC7/ETC2) to cut VRAM 4-6x and improve load times.

## Known Issues / Risks
- `gen:maps` still emits expected clear-zone anchor warnings for several landmark/open-node anchors.
- `qa:completion` still reports advisory warnings on `SHOT_09_BZ_M2_EAST_FACADE` and `SHOT_03_SPAWN_B_TO_BAZAAR` because those views do not surface landmark anchors in-frame, even though the visual review passes.
- CI still only enforces install, `gen:maps`, runtime map diff, `pnpm typecheck`, and `pnpm build`; the new tag matrix remains a local completion policy until a separate `tooling` update lands.
- Automated Chrome in this environment still would not grant a true human pointer-lock playtest, so combat feel still needs a manual pass even though traversal and bot smoke are green.
- The generic skill-client canvas capture still returns a non-WebGL black or blank frame on this runtime; project Playwright helpers were used for the real visual and perf review path.
- If runtime warmup times out, the game now falls back to blockout-safe surfaces before spawn; that avoids late streaming but still needs a human sanity check on extremely slow machines.
- The new headshot perf smoke exercises the queued feedback path via an internal debug-only emitter; it validates the hitch fix deterministically but does not replace full live-combat coverage.
- The preview or prod rollout could not be executed here because `vercel whoami` reports `No existing credentials found`; live-site acceptance is still pending that authentication step.
- The current bot overhaul is still wave-survival AI, not full T/CT objective bots; there is no bomb logic, grenade usage, jump-spot system, or objective planner yet.
