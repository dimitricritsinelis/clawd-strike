# Clawd Strike: public agent operating guide

Game: https://clawd-strike.vercel.app/

Companion SDK: https://github.com/dimitricritsinelis/clawd-strike-agent-sdk

Public runtime contract: `public-agent-v1`, `apiVersion: 1`. Workflow contract: `agentic-gameplay-v1`.

This `/skills.md` is the canonical public guide. If SDK instructions disagree, this guide wins. The game supplies observations and accepts actions; the SDK owns control strategies, evaluation, and policy changes. No game-side aiming or other gameplay assistance is provided.

## Start

Use Node.js 20+ and pnpm. In a local SDK checkout:

```bash
git clone https://github.com/dimitricritsinelis/clawd-strike-agent-sdk.git
cd clawd-strike-agent-sdk
pnpm install
pnpm exec playwright install --with-deps chromium
pnpm agent:run
```

The normal entry command is `pnpm agent:run`. For a local or alternate deployment, use its URL consistently for both `/skills.md` and gameplay:

```bash
BASE_URL=http://127.0.0.1:5174 pnpm agent:run
```

Read this guide and the applicable SDK repository instructions. There is no mandatory long document-reading chain. SDK references such as `docs/OUTPUTS.md`, `docs/POLICY_SCHEMA.md`, and `docs/TROUBLESHOOTING.md` are optional when needed.

Compatibility note: older SDK control wrappers call `advanceTime()` on every tick. Update that SDK wrapper to use real-time waits before evaluating under this guide. The compatibility hook still exists, so its presence alone does not prove the SDK follows the supported timing contract.

## Objective and rules

Earn the highest score by killing enemies across successive waves while staying alive. The current Agent Mode baseline has these rules:

- Each wave contains 10 enemies with 100 health each. A kill in wave `w` scores `5 + 2 * (w - 1)` points; a killing headshot doubles those points. Survival alone adds no score.
- Player bullet damage is 13 to legs, 25 to body, and 100 to head. Spread and recoil still apply; pointing at a visible target does not guarantee a hit.
- A run and each new wave start with 100 health, 30 rounds in the magazine, and 120 in reserve. Each kill restores 8 health up to 100 and adds 6 reserve rounds up to 150. No passive health regeneration.
- Baseline automatic fire interval is 0.1 seconds; reload takes 1.225 seconds. An empty magazine automatically reloads if reserve ammunition remains.
- Movement is camera-relative: run speed 6 m/s, crouch speed 3 m/s; diagonal input is normalized. Jumping and crouching retain normal collision and clearance rules. Crouching does not make the player immune.
- Clearing a wave starts a five-second intermission with gameplay frozen, then automatically starts the next wave. Enemy pressure and kill points increase with wave progression.
- Kills can drop temporary buff orbs (15% per kill, and at least one per wave): speed, faster fire/reload, free reloads that never drain reserve ammunition, or a 30-point shield. Normal buffs last 10 seconds; orbs expire after 15 seconds. Speed is multiplied by 1.2; rapid fire uses a 0.08-second interval and 1.35 reload-speed multiplier. Repeated pickups refresh the buff. A wave of 10 killing headshots grants one 15-second buff in the next wave. Buffs and uncollected orbs can carry across waves; retry resets them.
- Death ends the attempt. There is no automatic respawn. Save the result, then use Play Again.

These values describe the current baseline, not a promise that future tuning is identical. Record the observed profile identity for every evaluation.

## Startup, readiness, death, retry

The SDK needs browser automation capable of calling JavaScript in the page. Pointer lock is not required in Agent Mode.

Navigate to `BASE_URL`, click `[data-testid="agent-mode"]`, click `[data-testid="play"]`, fill `[data-testid="agent-name"]` with a valid callsign, and press Enter. A short alphanumeric name such as `ClawdLearner` works; invalid names remain in name entry. Alternatively, navigate to `/?autostart=agent&name=ClawdLearner` on the same deployment.

Read the JSON string returned by `window.agent_observe()`:

```js
const state = JSON.parse(window.agent_observe());
const ready = state.mode === "runtime" && state.runtimeReady === true;
const dead = ready && (!state.gameplay.alive || state.gameplay.gameOverVisible);
```

Do not send gameplay actions before readiness. The loading screen also reports `alive: false`; that is not a death. A missing API, wrong `contract`/`apiVersion`, missing required fields, or readiness timeout is a **Contract mismatch** or startup failure, not a completed attempt. Report it and stop blind retries.

After death, save `score.lastRun` and `lastRunSummary`, wait for `[data-testid="play-again"]` to be visible, and click it. Wait again for runtime readiness, `alive: true`, and `gameOverVisible: false`. Retry resets health/ammo/score and queued inputs, increments the feedback episode ID, and retains the previous run summary and session best. Discard transient target/event state on an episode change.

## Real-time control

The game continues simulating normally. Send actions at approximately 8 Hz, one control decision every 125 ms of wall-clock time. Read the observation, let the SDK policy choose an action, send it, and wait for the next control tick. Do expensive AI reasoning between attempts. Do not compensate for a delayed tick with a burst of actions or extra simulation time.

`window.advanceTime(ms)` is retained for compatibility. It adds simulation time while the normal animation loop or background timer continues running; it is not deterministic stepping. **Do not call it in the normal real-time SDK control loop.** There is no public paused-stepping mode.

Headless rendering and a hidden tab are different conditions. A headless browser can render WebGL and report `document.visibilityState === "visible"`; the perception contract works there. Visible Agent Mode renders at approximately 30 FPS while the normal simulation runs. A hidden Agent Mode tab uses a 500 ms background simulation timer without rendering; browser throttling may delay it further. Keep the gameplay page visible/foreground for comparable 8 Hz evaluations. Record headless status, tab visibility, viewport, actual cadence, and stalls. Hidden-tab screenshots may be stale and hidden-tab timing is not equivalent to normal real-time play.

## Action contract

```ts
window.agent_apply_action({
  moveX?: number,         // [-1, 1]: positive right, negative left
  moveZ?: number,         // [-1, 1]: positive forward, negative backward
  lookYawDelta?: number,  // [-180, 180] degrees per call: positive right
  lookPitchDelta?: number,// [-180, 180] degrees per call: positive up
  jump?: boolean,
  fire?: boolean,
  reload?: boolean,
  crouch?: boolean
}); // returns void; applied on a simulation tick
```

Finite numeric inputs are clamped to those ranges; invalid values/unknown fields are ignored. Pitch is limited to just short of straight up/down. Actions control Agent Mode only and do not replace human controls.

`moveX`, `moveZ`, `fire`, and `crouch` remain held until explicitly replaced. Omitted fields retain their value. Death/retry and gameplay input freezes can clear held fire or queued requests. Look deltas accumulate until the next input tick (bounded to ±540 degrees total per axis), then are consumed once. `jump: true` and `reload: true` queue one-shot requests; sending false does not cancel a queued request. Requests can be ignored by gameplay rules, for example jumping while airborne.

Release all held inputs explicitly:

```js
window.agent_apply_action({ moveX: 0, moveZ: 0, fire: false, crouch: false });
```

`{}` does not release anything. Release on stopping or exhausting a budget; allow a tick to apply the release. Already queued one-shot requests can still be consumed.

## Observation contract

`window.agent_observe()` returns a JSON **string**, not an object. `window.render_game_to_text()` is a compatibility reader for the same public state on ordinary gameplay pages. Use `agent_observe()` preferentially; debug/internal payloads are outside the permitted contract.

```ts
{
  apiVersion: 1,
  contract: "public-agent-v1",
  mode: "loading-screen" | "runtime",
  profile: {
    profileId: string,
    tuningRevision: string,
    balanceSeason: string
  },
  runtimeReady: boolean,
  gameplay: { alive: boolean, gameOverVisible: boolean },
  health: number | null,
  ammo: { mag: number, reserve: number, reloading: boolean } | null,
  score: {
    current: number, best: number, lastRun: number | null,
    scope: "browser-session"
  },
  sharedChampion: {
    holderName: string, score: number, controlMode: "human" | "agent",
    scope: "sitewide", updatedAt: string, boardKey: string,
    ruleset: string | null, profileId: string | null,
    tuningRevision: string | null, balanceSeason: string | null
  } | null,
  lastRunSummary: {
    survivalTimeS: number, kills: number, headshots: number,
    shotsFired: number, shotsHit: number, accuracy: number,
    finalScore: number, bestScore: number,
    deathCause?: "enemy-fire" | "unknown"
  } | null,
  feedback?: {
    episodeId?: string | number,
    recentEvents?: Array<
      | { id: number, type: "damage-taken", amount?: number }
      | { id: number, type: "enemy-hit" | "kill" | "wave-complete" |
          "reload-start" | "reload-end" }
    >
  } | null,
  perception: {
    visibleTargets: Array<{
      id: string, yawOffsetDeg: number, pitchOffsetDeg: number
    }>,
    movementBlocked: boolean
  }
}
```

- `visibleTargets` contains only living enemies with a sampled, targetable aim point visible inside the current player's camera bounds and not occluded. It checks torso/head points; it need not enumerate every partially visible silhouette. IDs are opaque and stable within the episode; do not decode them or depend on their spelling, ordering, or reuse across attempts. Empty means no target passed the visibility checks.
- Offsets are relative to the current camera direction, in degrees, with exactly the action signs: positive yaw right, positive pitch up. Applying the offsets as look deltas turns toward the sampled point. They do not select a target, fire, predict motion, compensate recoil, or guarantee a subsequent hit. Movement and latency can make a previous cue stale.
- `movementBlocked` reports whether collision prevented any requested horizontal component during the latest player simulation tick, including partial wall sliding or playable-boundary clipping. It is not a navigation hint. Idle input alone reports false. A queued action or release takes effect on the next tick, not synchronously during observation.
- Loading/not-ready state has empty targets and false blocked movement. Death also returns empty targets and false blocked movement. Loading health/ammo/summary/feedback are null.
- Summary `accuracy` is a percentage from 0 to 100, rounded to one decimal; `survivalTimeS` counts active gameplay time, rounded to one decimal. `lastRunSummary` is null before the first death and remains the previous completed run after retry.
- Feedback is optional for compatibility. It retains at most 24 recent events, so deduplicate by `(episodeId, id)` and do not assume a complete event log. Missing feedback must not crash a policy. Health, ammo, scores, and the final summary remain useful result signals.
- `score.best` is browser-session scoped, partitioned by map/board identity, and stored in session storage. Keeping the same tab preserves it across reloads; a persistent browser profile alone does not guarantee a new session retains it. `sharedChampion` is a deployment-validated sitewide record for its profile/tuning/season board, possibly unavailable. Do not write it directly.

## Permitted information and policy scope

Use documented observations, actions, ordinary public UI/selectors, screenshots of the ordinary player view, and information derived from those screenshots. Visible-only relative target cues are explicitly permitted; this supersedes older blanket prohibitions on enemy-position information or screenshots.

Do not inspect hidden enemy state, world coordinates, navigation routes, seeds, scene graphs, engine objects, internal globals, debug/test hooks, or modified camera views. Do not mine assets or source data for private map/enemy information. Do not change game rules, scores, observation payloads, or simulation speed to improve results.

Inside the companion SDK, edit policy code and parameters, public-observation processing, action selection, and evaluation/recording logic. You may use any control or learning strategy within that public boundary. Do not inject assistance into the game. Ordinary view screenshots and public observations may be saved for review.

## Play, inspect, improve, retry

Before starting, set a finite attempt budget and wall-clock time budget in `config/learning.config.json` or supported SDK environment overrides such as `ATTEMPT_BUDGET` and `TIME_BUDGET_MINUTES`. Save the resolved configuration, policy version, deployment URL, agent/model identity, and rendering/timing conditions. Record `profile.profileId`, `profile.tuningRevision`, and `profile.balanceSeason` from the observation; Agent Mode currently uses `desktop-agent`. Separate results when those identities change.

1. Play an attempt with the current policy, recording actions, available observations/feedback, and its final result.
2. Inspect score, kills, hits, accuracy, survival time, blocked movement, and failures. Distinguish a real death from a timeout, browser crash, contract failure, or budget cutoff.
3. Change one policy behavior based on that evidence. Keep the prior policy and state the hypothesis.
4. Evaluate over multiple attempts under comparable conditions. Retain an improvement supported by the results or reject the change. A single lucky score is not proof of learning.
5. Save results and the retained policy, then retry until the budget or an explicit stop condition is reached. Do not silently raise the budget to obtain a successful report.

Use durable files, not chat recollection, for results and retained policy. The SDK's default learning outputs are `output/self-improving-runner/episodes.jsonl`, `champion-policy.json`, `latest-session-summary.json`, and `candidate-summaries/*.json`; it also writes `resolved-run-config.json`. Archive these and the policy source/version so another session can resume or reproduce the comparison. No elaborate memory framework is required.

The current SDK's `pnpm agent:run` starts from clean managed baseline/learning output directories. Archive wanted results and policy before another fresh run. Use `pnpm agent:learn` to continue from the saved champion in the configured output directory; individual `pnpm contract:check`, `pnpm smoke:no-context`, and `pnpm agent:baseline` commands remain available for diagnosis.

Report completed versus interrupted attempts, failures, actual elapsed time, evaluation conditions, before/after metrics, and artifact locations. Contract checks and successful startup/death/retry tests demonstrate interface operation only. They do not establish scoring success or agent learning; zero kills and rejected policy changes are valid results to report honestly.
