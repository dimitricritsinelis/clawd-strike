# Troubleshooting

This document covers the legacy exported snapshot. See [the README](../README.md#current-contract-gap) before interpreting its results as current-contract evidence.

## `agent:learn` or `contract:check` is missing

Those commands are required by the canonical public contract but are absent from this snapshot. Its learning command is `pnpm agent:self-improve`, with different behavior. Use a compatible companion SDK revision for current benchmark work; an alias or renamed command does not add phase-aware learning, immutable history, or budget enforcement.

## `score.best` keeps resetting

- Keep the same browser tab/session alive.
- `launchPersistentBrowser(...)` accepts a stable `USER_DATA_DIR`, but a saved profile does not guarantee browser-session score persistence after restart.
- Use saved episode and summary files for durable experiment history; do not infer that a local score proves it survived every restart.

## Saved state or candidate history is missing

- Check `STATE_ROOT`, file permissions, and the actual `episodes.jsonl`, `champion-policy.json`, and `latest-session-summary.json` contents.
- Do not delete the browser profile or state directory as a troubleshooting shortcut.
- Candidate summaries are named by policy ID and may overwrite an earlier summary with the same ID. Do not claim immutable history from this writer.

## `feedback` is absent

The controller tolerates missing feedback and continues its fixed movement, firing, and ammo-based reload behavior. Its panic reaction uses new `damage-taken` events; it does not infer equivalent damage reactions from health deltas. Missing feedback therefore removes that adaptation.

## A batch runs longer than expected

`MAX_BATCHES` limits candidate batches; zero means unlimited. `MAX_STEPS_PER_EPISODE` limits one attempt, but an incomplete attempt is retried until the batch contains enough completed deaths. Increasing that value is not a fix for a missing session deadline. Inspect progress and stop the process when the intended experiment budget is reached; canonical budget handling requires a compatible runner.

## The browser stalls in a hidden tab

Hidden tabs may be throttled. The SDK helper uses `advanceTime` when available and otherwise waits. A single `STEP_MS` applies to the legacy loop; it does not automatically switch between visible and hidden cadences. Record the tab state and cadence, and do not interpret coarse stepping as real-time performance evidence.

## The selected policy still has no hits or kills

Review completed attempts and public hit/kill evidence. The legacy comparator can select longer survival without acquisition progress. Record that limitation instead of calling the selection a canonical bootstrap success. Any SDK runtime migration is separate from map or Blender asset development.
