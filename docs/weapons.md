# Weapons and reload

## Runtime ownership

[Ak47Weapon.ts](../apps/client/src/runtime/weapons/Ak47Weapon.ts) owns ammunition and reload state. [Ak47FireController.ts](../apps/client/src/runtime/weapons/Ak47FireController.ts) owns shot timing and firing behavior. [Ak47AnimatedViewModel.ts](../apps/client/src/runtime/weapons/Ak47AnimatedViewModel.ts) plays the authored first-person assembly. [ak47FeelTuning.ts](../apps/client/src/runtime/weapons/ak47FeelTuning.ts) holds visual/feel tuning; gameplay balance and hit-zone damage have separate owners.

Current base values are a 0.1 s fire interval (600 RPM), a 30-round magazine, and 25 body damage. [enemyHitZone.ts](../apps/client/src/runtime/combat/enemyHitZone.ts) applies head damage ×4 and leg damage ×0.5 rounded to an integer. The gameplay profile supplies 120 reserve rounds at wave start; the weapon constructor's standalone fallback is 90, so do not mistake it for the configured game economy. Check [gameplayTuning.ts](../apps/client/src/runtime/tuning/gameplayTuning.ts) and the public contract before changing balance. Fingerprinted profile changes affect leaderboard board identity.

## One reload timeline

[ak47ReloadMarks.ts](../apps/client/src/runtime/weapons/ak47ReloadMarks.ts) is the single source for gameplay, clip authoring, and audio. The base duration is 1.7 seconds. A reload-speed modifier scales every mark by the same factor. Both partial and empty magazines use one `Reload` clip with a magazine change and no charging-handle action.

| Mark | Base seconds | Behavior |
|---|---|---|
| `leaveHandguard` | 0.00 | Support hand leaves the handguard |
| `grip` | 0.24 | Hand grips the seated magazine |
| `release` | 0.30 | Paddle release |
| `rockedOut` | 0.42 | Magazine rocked forward |
| `drop` | 0.56 | Old magazine released out of frame |
| `newMagazineInView` | 0.76 | Fresh magazine enters view |
| `hook` | 0.98 | Front lug engages |
| `latch` | 1.10 | New rounds commit once |
| `gripOpens` | 1.16 | Support grip opens after seating |
| `handOnHandguard` | 1.40 | Hand returns to the handguard |
| `end` | 1.70 | Rifle settles at idle |

Before `release`, a fresh fire press can cancel if the old magazine still contains rounds; the shot then consumes a round normally, without committing new reserve ammunition. From `release` to `latch`, the old magazine is already out, so a fresh press is remembered and fires at the latch only if still held. An early press with an empty magazine is remembered the same way. After `latch`, a fresh press ends the reload early and fires from the updated magazine. Holding the trigger is not a new press. `reloading` and the HUD progress continue to the end unless interrupted.

The viewmodel samples the clip from reload progress. `Idle` and `Reload` share the same endpoint pose and never blend joints during the transition. A stopped reload plays the clip home: backward before `release` at up to 2× speed, forward from `release` at up to 3×. `reloadSerial` detects restarts: a backward return joins the new progress where they meet; a forward return reaches the idle endpoint, wraps, and catches the new reload at up to 4×. Snapshots without a serial can scrub progress without implying a restart. Preserve these rules when refactoring animation state.

## Authoring and export

[viewmodel_v2.py](../assets/source/ak47/viewmodel_v2.py) requires the original v1 blend from commit `828ad9c`; it rejects an already-upgraded input. It does not retrieve that old file automatically. The safe regeneration sequence is:

1. Preserve the current source before rebuilding. Extract `828ad9c:assets/source/ak47/ak47.blend` into a separate scratch file with `git show`.
2. Run `viewmodel_v2.py` through headless Blender with `-- --in <scratch-v1.blend> --out assets/source/ak47/ak47.blend`.
3. Run [glove_finish.py](../assets/source/ak47/glove_finish.py) to apply the authored finish.
4. Run [build.py](../assets/source/ak47/build.py) to export and install `apps/client/public/assets/models/weapons/ak47-next/ak47.glb` and its provenance.

This sequence changes the active source and runtime asset. Use it for an authorized asset change, not as a routine TypeScript check. `build.py` checks the authored reload marks against TypeScript and refuses to export an unfinished glove or mismatched timeline. Its `--blend` option selects an input blend but still uses the exporter's configured runtime destination.

The authoring inputs include [grips](../assets/source/ak47/grips/) and [hand_pose.py](../assets/source/ak47/hand_pose.py). The current script uses `grips/reload-fit.json` plus the idle grip and calibrated joint axes; do not reconstruct a grip from rounded prose. Preserve `JOINT_LIMITS`, the anatomical thumb hinge, both idle endpoints, magazine visibility, and left/right-hand behavior.

The Python tools parse these exact TypeScript declaration forms: `AK47_RELOAD_DURATION_S = <number>;`, `AK47_RELOAD_MARKS = Object.freeze({...});`, `BASE_POSITION = new Vector3(...)`, `BASE_ROLL`, `VIEWMODEL_SCALE`, `viewModelCamera = new PerspectiveCamera(...)`, and `this.modelRoot.rotation.y = Math.PI / 2;`. Refactoring their syntax requires updating the parsers and verifying the export, even when TypeScript still compiles.

## Audio

[WeaponAudio.ts](../apps/client/src/runtime/audio/WeaponAudio.ts) and [ak47AudioDsp.ts](../apps/client/src/runtime/audio/ak47AudioDsp.ts) own loading, scheduling, and processing. Extension probing uses `.mp3`, `.ogg`, then `.wav`. Reload voices use the same timeline marks as the gameplay/clip. The reload foley's source cuts and processing are recorded in [reload-foley.provenance.json](../assets/source/audio/reload-foley.provenance.json).

Keep trigger cadence, muzzle flash, and shot audio synchronized. Listen to single shots, bursts, a full magazine, reload interruptions, and ambient balance after audio changes; browser assertions do not establish audible quality.

## Tests and current limitation

The full browser suite includes [weapon-viewmodel.spec.ts](../apps/client/playwright/weapon-viewmodel.spec.ts) and [weapon-audio.spec.ts](../apps/client/playwright/weapon-audio.spec.ts); the four-spec CI smoke does not. The viewmodel spec checks timing/provenance, magazine visibility, glove intersections, framing, thumb contact, and cancel/restart continuity. Unit tests cover ammunition and timing logic separately.

The thumb-wrap test is a known unresolved asset-quality failure. The September 26 recorded run found zero pad-side contact share across 38 samples despite passing bone-space bend checks, with additional game-camera bend and thumb/index ring failures. Those are historical measurements, not a fresh result for every later asset. The active test retains its thresholds; run it against the current bytes before claiming a fix. Passing reload timing or intersection checks alone does not prove a convincing thumb grip.

Earlier Case 04 studies, old 1.225-second reload instructions, hashes, and scratch reports are archived in Git. They do not describe the current 1.7-second magazine-only pipeline.
