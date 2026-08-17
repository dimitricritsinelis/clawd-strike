Audience: human, implementation-agent
Authority: normative workflow; runtime values remain authoritative in code
Read when: gameplay, balance, AI, player economy, buffs, rounds, input profiles, scoring, records
Owns: shared-baseline policy and the procedure for intentional profile divergence
Do not use for: map design, temporary playtest notes, or unapproved tuning experiments
Last updated: 2026-08-16

# Gameplay Balancing

## Baseline rule

`Desktop Human` is the canonical gameplay balance baseline. `Mobile Human`,
`Desktop Human`, and `Desktop Agent` must start with the same balance-bearing
configuration. Platform or control capabilities may differ, but difficulty may
not drift merely because a profile uses touch, mouse/keyboard, or agent input.

The code authority is `DESKTOP_HUMAN_BALANCE_BASELINE` in
`apps/client/src/runtime/tuning/gameplayTuning.ts`. Every current profile shares
its exact immutable `waves`, `enemy`, `player`, `buffs`, and `flow` objects.
Focused tests enforce reference equality, deep equality, and the baseline
fingerprint `5aed687b2c66`. Every tuning revision embeds that fingerprint, so a
mechanic change cannot retain an old competitive board identity.

## Current profile relationship

| Profile | Balance baseline | Allowed capability difference | Tuning revision |
|---|---|---|---|
| Mobile Human | Desktop Human | Touch input enabled | `mobile-human-baseline-5aed687b2c66-r2` |
| Desktop Human | Desktop Human | Mouse/keyboard input | `desktop-human-baseline-5aed687b2c66-r2` |
| Desktop Agent | Desktop Human | Agent control contract | `desktop-agent-baseline-5aed687b2c66-r2` |

Touch availability is not a difficulty adjustment. At this baseline, touch aim
assist remains disabled and all numeric touch settings are neutral capability
settings rather than compensating balance changes.

The following may differ without entering the balance divergence register:

- profile identity, display label, tuning revision, and record-board key;
- touch versus pointer-lock input plumbing and touch ergonomics;
- mobile HUD, orientation handling, and render-quality selection;
- the agent public control/observation contract and automated-session audio.

These capability differences must not silently change waves, combat, movement,
health, ammunition, AI, buffs, scoring, or round/death flow.

## Balance-bearing fields

The following sections must remain identical until a profile-specific change is
explicitly approved:

- `waves`: tier progression, hunt-pressure timing, attacker limits, and burst
  staggering. Enemy count is represented here but remains structural as noted
  below.
- `enemy`: health, damage, accuracy, reaction, bursts, reloads, movement spread,
  sight, memory, reacquisition, sharing, and hearing.
- `player`: health, ammunition, kill sustain, regeneration, and wave resets.
- `buffs`: drops, pity, selection, carryover, durations, effect strength, shield,
  and perfect-wave reward.
- `flow`: intermission, skip timing, simulation freeze, summary, and death restart.

Player movement constants are currently global and therefore common to all
profiles. Before movement can diverge, it must first become an explicit field
of the shared baseline; a mode-specific hidden constant is not acceptable.

Enemy count is currently a structural constant of 10, coupled to spawning,
wave completion, scoring, record validation, and UI copy. It may not be used as
a profile override until all of those consumers are plumbed in one revisioned
change. Until then, validation rejects any non-10 `waves.enemiesPerWave` value.

Scoring rules currently remain common, while records remain isolated by profile,
ruleset, balance season, and tuning revision. Equal tuning does not merge boards.

## Current shared baseline summary

- Waves 1–2 start at tier 0; difficulty rises one tier every two waves and
  reaches tier 5 at wave 11. Slow clears do not add hidden tier bonuses.
- Simultaneous attackers scale `1, 2, 2, 3, 3, 4` with tier and burst starts are
  staggered `450, 400, 350, 300, 250, 200` ms.
- Hunt pressure is wave-banded: `30/75`, `25/60`, `20/50`, then `15/40` seconds
  for search start/full pressure.
- Enemies deal 20 damage, use circular spread, require direct sight and aim
  alignment, and have a 120-degree vision cone with 4 m proximity awareness.
- Players have 100 health, 30/120 starting ammunition, a 150 reserve cap, and
  receive 8 health plus 6 reserve rounds per kill.
- Buffs use a 30% seeded drop rate, force the fourth drop after three misses,
  carry through waves, grant 50 shield, and award one deterministic 15-second
  buff for a perfect headshot wave.
- Intermission lasts 5 seconds, freezes gameplay, and allows Continue after 2
  seconds. Death requires an explicit restart.

## How to tune a profile in the future

1. Start from `DESKTOP_HUMAN_BALANCE_BASELINE`, never from an older divergent
   profile or copied historical constants.
2. State the playtest evidence, target outcome, and smallest fields that need to
   move. Do not add hidden adaptive difficulty or mutate tuning during a run.
3. Obtain explicit approval for the profile divergence.
4. Override only the approved paths and add them to the divergence register
   below. Unlisted balance differences are defects.
5. Bump the affected profile's `tuningRevision`. If the shared baseline changes,
   recompute `GAMEPLAY_BALANCE_BASELINE_FINGERPRINT`, embed it in every affected
   revision, and bump their revision suffixes. The fingerprint regression test
   must fail until this is done. Never place changed mechanics on an old board.
6. Update UI descriptions, shared score-validation bounds, gameplay QA scripts,
   unit tests, and profile-specific end-to-end tests in the same change.
7. Verify unchanged profiles still equal the baseline except for registered
   paths, and preserve deterministic seeds and simulation-time behavior.

## Approved divergence register

There are currently no approved balance divergences.

| Profile | Tuning path | Baseline value | Override | Evidence/approval |
|---|---|---:|---:|---|
| — | — | — | — | — |

Platform capability differences such as `mobile-human.touch.enabled = true` do
not belong in this register unless they begin changing combat outcomes through
assistance, movement, health, damage, economy, AI, buffs, scoring, or flow.
