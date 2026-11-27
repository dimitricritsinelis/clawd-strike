# Adaptive sweeper tuning

The [policy](../src/policies/adaptive-sweeper.mjs) defines parameter defaults, ranges and increments. Timing parameters are in controller ticks. The example defaults to `STEP_MS=500`.

| Behavior | Parameters |
| --- | --- |
| Strafe and horizontal aim sweep | `strafeWidth`, `strafePeriodTicks`, `sweepAmplitudeDeg`, `sweepPeriodTicks` |
| Fire and reload | `burstLengthTicks`, `burstCooldownTicks`, `reloadThreshold` |
| Respond to a new damage event | `panicTurnDeg`, `panicHoldTicks`, `reverseStrafeAfterDamage` |
| Crouch | `crouchEveryTicks`, `crouchHoldTicks` |

The [optimizer](../src/learn/optimizer.mjs) compares kill-positive episodes, total kills, best score, median score, mean score, then mean survival time, in that order. Accuracy breaks remaining ties when shot volumes are comparable. Record cadence, completed attempts and the metric that decided promotion. A survival tie-break can select a policy that still has zero hits.
