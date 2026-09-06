# Tuning Guide

These are the parameters implemented by the legacy `adaptive-sweeper` policy in this snapshot. The [README](../README.md#current-contract-gap) records its differences from the current public learning contract.

## Implemented controller parameters

- `strafeWidth`: lateral movement amplitude.
- `strafePeriodTicks`: period of lateral movement.
- `sweepAmplitudeDeg`: horizontal look-delta amplitude.
- `sweepPeriodTicks`: period of the horizontal look sweep.
- `burstLengthTicks`: trigger ticks in a burst.
- `burstCooldownTicks`: cooldown ticks between bursts.
- `reloadThreshold`: magazine threshold that triggers reloading when reserve ammo remains.
- `panicTurnDeg`: extra yaw delta after a new public damage event.
- `panicHoldTicks`: duration of that damage reaction.
- `reverseStrafeAfterDamage`: whether a new public damage event reverses strafe direction.
- `crouchEveryTicks` and `crouchHoldTicks`: optional crouch cadence.

The policy has no pitch-sweep or hit-settle parameters. Unsupported fields are not made functional by adding them to a parameter file. Tick-based settings depend on `STEP_MS`; record it when comparing runs. The example defaults to 500 ms, while the live contract recommends a faster visible-tab cadence.

## Legacy comparison order

`compareBatchMetrics` compares these fields lexicographically:

1. More kill-positive episodes.
2. More total kills.
3. Higher best score.
4. Higher median score.
5. Higher mean score.
6. Higher mean survival time.
7. Higher mean accuracy when mean shot volume is within 20% of `max(1, champion mean shots fired)`.

This describes current code, not the canonical promotion policy. It can reward survival when both policies have no hits or kills. The current public contract forbids that during bootstrap and requires separate first-hit, first-kill, and score phases. Do not treat the legacy comparator's selection as evidence those phases passed.

## Experiment discipline

- Preserve the actual policy, cadence, completed-attempt count, and observed hit/kill evidence with each result.
- Change one or two implemented parameters at a time when inspecting the legacy policy.
- Treat zero-hit runs as acquisition failures; longer survival alone does not resolve them.
- A canonical learning run needs a compatible SDK implementation. Do not change game balance, public observations, validation, or map geometry to compensate for this snapshot's controller limitations.
