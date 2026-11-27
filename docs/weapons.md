# Weapon gameplay and animation

The game uses separate modules for ammunition and reload state, firing cadence, first-person animation and visual motion. Wave ammunition comes from the gameplay profile. Use the public contract for player-facing values and update it with balance changes. [Weapon modules](../apps/client/src/runtime/weapons/) · [Gameplay tuning](../apps/client/src/runtime/tuning/gameplayTuning.ts) · [Hit zones](../apps/client/src/runtime/combat/enemyHitZone.ts) · [Public contract](../apps/client/public/skills.md)

## Reload behavior

Gameplay, the Blender clip and reload audio share one timeline. The base duration is 1.7 seconds for partial and empty magazines. Reload-speed buffs scale the whole timeline. The support hand and magazine follow one authored clip. [Reload marks](../apps/client/src/runtime/weapons/ak47ReloadMarks.ts) · [Ammunition state](../apps/client/src/runtime/weapons/Ak47Weapon.ts)

| Fresh fire input | Result at base speed |
|---|---|
| Before `release` (0.30 s) | With rounds left, cancel and fire from the old magazine. An empty magazine remembers the press. |
| From `release` until `latch` (1.10 s) | Remember the press and fire at the latch if the trigger is still held. |
| From `latch` to `end` (1.70 s) | The new ammunition has committed once. A fresh press skips the remaining animation and fires. |

Idle and Reload share an endpoint pose. When a reload stops, the viewmodel follows the clip backward before release and forward afterward. A new `reloadSerial` lets a restarted reload catch up without blending through the model. Reload audio schedules cues from the same marks. [Viewmodel](../apps/client/src/runtime/weapons/Ak47AnimatedViewModel.ts) · [Audio](../apps/client/src/runtime/audio/WeaponAudio.ts) · [Foley sources](../assets/source/audio/reload-foley.provenance.json)

## Blender source and export

To export the retained, finished scene, run from the repository root with Blender on PATH:

```sh
blender --background --python-exit-code 1 --python assets/source/ak47/build.py
```

The [exporter](../assets/source/ak47/build.py) checks the authored marks and glove finish, then installs `ak47.glb` and provenance under `apps/client/public/assets/models/weapons/ak47-next/`. Its `--blend` option selects the input scene. The output still goes to the runtime asset directory.

Rebuilding the authored clip requires its original v1 scene. The checked-in scene already contains the upgrade and the authoring script rejects it as input.

1. In a shallow checkout missing the v1 revision, run `git fetch --depth=1 origin 828ad9c88762b0303a7a7a62b0c43bc19ddaf443`. Extract the source into a separate scratch directory with `git show 828ad9c:assets/source/ak47/ak47.blend > /path/to/scratch/v1.blend`.
2. Run [viewmodel_v2.py](../assets/source/ak47/viewmodel_v2.py) with headless Blender and `-- --in <scratch-v1.blend> --out assets/source/ak47/ak47.blend`. It uses the [grip data](../assets/source/ak47/grips/) and [hand pose calibration](../assets/source/ak47/hand_pose.py).
3. Run [glove_finish.py](../assets/source/ak47/glove_finish.py) through headless Blender on the reauthored scene, then run the exporter above.

The Python tools parse TypeScript literals for `AK47_RELOAD_DURATION_S`, `AK47_RELOAD_MARKS = Object.freeze({...})`, `BASE_POSITION = new Vector3(...)`, `BASE_ROLL`, `VIEWMODEL_SCALE`, `viewModelCamera = new PerspectiveCamera(...)` and `this.modelRoot.rotation.y = Math.PI / 2`. Update the readers when changing declaration syntax. Use a separate headless process for authoring to protect an open Blender scene.

## Verification

Run the relevant weapon unit tests and both focused browser specs. The viewmodel spec measures thumb contact, magazine visibility, glove intersection, trigger framing and cancel/restart continuity. Listen to shots, reload interruptions and ambient balance after audio edits. These specs run outside the CI smoke subset. [Viewmodel spec](../apps/client/playwright/weapon-viewmodel.spec.ts) · [Audio spec](../apps/client/playwright/weapon-audio.spec.ts) · [Test commands](development.md#focused-browser-checks)

The reload thumb-wrap test fails for the asset at `17e4376`. Across 38 sampled poses, 0% of the measured thumb-pad vertices came within 2 mm of the held magazine. The test requires at least 20%. Recheck this assertion when changing the grip.
