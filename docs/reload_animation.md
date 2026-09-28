# AK reload animation

## Current: magazine-only reload (one 1.7 s clip, September 26, 2026)

The user rejected the two-magazine v2 reload: too slow, it racked the charging handle, and the hand held the magazine with a thumb that did not move like a human thumb. The replacement is a quick, arcade-style magazine change with no charging handle, played by one clip for every reload.

[viewmodel_v2.py](../assets/source/ak47/viewmodel_v2.py) authors it into `ak47.blend`; [build.py](../assets/source/ak47/build.py) exports the runtime GLB (`apps/client/public/assets/models/weapons/ak47-next/ak47.glb`, MD5 `fdb4654c679085fd7afcfea49cc3f23a`). The GLB carries `Idle`, `Fire` and `Reload`. `ReloadTactical`, `ReloadEmpty` and every charging-handle, knob and bolt-rack key are gone, and the runtime throws on load if `Reload` is missing.

### One timeline for gameplay, animation and audio

[ak47ReloadMarks.ts](../apps/client/src/runtime/weapons/ak47ReloadMarks.ts) is the single source of truth. `AK47_RELOAD_DURATION_S = 1.7`; a reload-speed buff scales every mark by the same factor.

| Mark | s | What happens |
|---|---|---|
| `leaveHandguard` | 0.00 | Support hand leaves the handguard; the rifle starts its cant |
| `grip` | 0.24 | Hand closed on the seated magazine, index on the front edge, thumb pad behind the paddle |
| `release` | 0.30 | Thumb presses the paddle release (click) |
| `rockedOut` | 0.42 | Magazine rocked forward about its front lug |
| `drop` | 0.56 | Magazine carried down and back-left out of the bottom-left of frame and let go there (no fall, no impact sound) |
| `newMagazineInView` | 0.76 | Fresh magazine enters view tilted for the hook, after 0.58–0.76 s off-screen |
| `hook` | 0.98 | Front lug hooked in the magazine well |
| `latch` | 1.10 | Rocked back into the latch (click). **Rounds are committed here.** |
| `gripOpens` | 1.16 | After a 2.8 mm / 1.6° seat tap, the grip opens |
| `handOnHandguard` | 1.40 | Hand back on the handguard |
| `end` | 1.70 | Rifle untilted and settled after a small damped overshoot (-6% / +1.8%) |

- **Asset:** `viewmodel_v2.py` parses the marks from the `.ts` file with a regex and raises on a missing key, a non-increasing mark or an end/duration mismatch. `build.py` refuses to export when the marks stored in `ak47.blend` differ from the file, and writes them to `provenance.json` as `reload.audioMarks`. After any change to the marks, rerun `viewmodel_v2.py`, then `build.py`.
- **Gameplay** (`Ak47Weapon.ts`): one reload kind of `AK47_RELOAD_DURATION_S / speed`. Magazine and reserve update once, on the frame the timer passes `latch`; `reloading` stays true until 1.7. A fire press before the latch cancels (old count kept, reserve untouched). A press after the latch ends the reload early (`onReloadEnd`, no cancel) and fires from the new magazine. A held trigger is not a press. The HUD bar still runs to 1.7 s.
- **Viewmodel** (`Ak47AnimatedViewModel.ts`): clip time is `reloadT01 * 1.7`. The viewmodel switches between `Idle` and `Reload` only at the clip's ends, which are the idle pose, and never blends joints between them: the earlier 0.12 s crossfade swept the glove up to 16 mm into the rifle and 11 mm into the held magazine. A stopped reload plays the clip home: backwards to its start before `release` (up to 2×), forwards to its end from `release` on (up to 3×). `Ak47Weapon` bumps `reloadSerial` at every reload start; a new serial while the old reload is still shown (a pre-release press that fires the last round and reloads on the same frame) plays the old one home. Going backwards (before `release`), the return stops where it meets the new reload's progress and follows it from there. Going forwards (from `release`), the return wraps through the clip's end, which is the idle pose, and the new reload then catches up to its time at 4×. Snapshots without a serial never restart, so tests can scrub `reloadT01`. The hand's contact occlusion lifts from `leaveHandguard + 0.04–0.12` and returns over `handOnHandguard − 0.08` to `handOnHandguard`.
- **Audio** (`WeaponAudio.ts`): reload voices are scheduled on the same marks.

### Clip and rig

- **Magazines:** `Magazine` is seated and visible at time 0. It rocks about the front lug, which the geometry puts at (0.008, 0, 0.055) in `AK47_Rig` space, not the (0.066, 0, 0.056) of the brief. It is hidden (scale 1e-4) from about 0.61 s to the latch frame. `MagazineSpare` appears at 0.64 s, is carried rigidly to the seat and hidden from about 1.117 s. Both are co-located at the seat for one frame, so a magazine is always at full size whenever the runtime samples between frames.
- **Rifle:** the cant, seat tap and settle are authored on `AK47_Rig`, pivoting about the pistol grip. The clip has no `Bolt` or `Trigger` channels.
- **Left arm:** IK against hand targets with the shoulder anchored in camera space, baked to FK, running for the whole clip. The forearm carries all of the hand's roll away from idle (a quarter at `L_forearm`, the rest at `L_forearm.001`), so wrist twist is 0. Forearm roll peaks at 168°, wrist ulnar deviation at about 31°. During the grip phases the elbow pole is `POLE_GRIP` (0, 0.15, 0.20), out and slightly up; off-screen it is (0, 0.05, −0.15). The grips' own dropped-elbow `pole_offset` needed 185–196° of roll on the canted rifle. The IK pole calibration is 133.4°, so the IK arm at rest matches the FK idle and the clip starts and ends exactly on the idle pose.
- **Transitions:** the handguard-to-magazine (0–0.24 s) and magazine-to-handguard (1.16–1.40 s) paths are via-point paths searched against a glove-penetration test. While the hand carries a magazine between beats it keeps its wrist relation to the forearm.

### Grips and the anatomical findings

All digit rotations now come from anatomical joint angles through [hand_pose.py](../assets/source/ak47/hand_pose.py) (`digit_quaternions`, `validate`, `anatomy_from_quaternions`; MD5 `bee44db6206f96546a2f849df19cde04`). Its calibration found:

- **The thumb MCP and IP were bent about the wrong axis.** The shipped rig flexed `L_thumb.02/.03` about bone +X, which bends the thumb sideways out of the palm plane. The measured flexion hinge is perpendicular to the thumb's suede pad, `THUMB_HINGE ≈ (0.32, 0, −0.95)` in bone space (about bone −Z). Rotation about it curls the tip toward the pad.
- **Finger joints:** MCP flexion about the abducted finger's lateral axis (about bone +X), abduction about the palm normal (about bone +Z), PIP/DIP about bone +X. The thumb CMC has flexion across the palm, palmar abduction and axial rotation about the metacarpal.
- **Limits** (`JOINT_LIMITS`): finger `mcp` −10…90, `mcp_abduct` ±20, `pip` 0…105, `dip` 0…80; thumb `cmc_flex` −20…45, `cmc_abduct` 0…60, `cmc_rot` −15…45, `mcp` 0…60, `ip` −15…80. A round trip of 200 random poses returns within 0.005°, with no residual side-bend.

Grip specifications, with digits as anatomy dicts and the hand pose relative to the magazine (`hand_in_mag`), are in [grips/](../assets/source/ak47/grips/):

| File | Use |
|---|---|
| `reach.json` | Pre-grip: the removal grip opened about 80% and backed off so the fingers pass in front of the magazine, thumb pre-shaped toward the paddle |
| `remove.json` | Removal power grip. Palm high on the near face, index hooked under the receiver on the front edge, middle/ring/pinky wrapped onto the far face, thumb pad on the rear face of the paddle. Four frames before `release` the thumb is 6° less flexed at MCP and 6° less abducted at CMC, then presses. |
| `insert.json` | Insertion power grip on the fresh magazine, hand about 39 mm below the feed lips so the top can hook the lug, thumb opposed on the rear-near corner. Held through hook, rock and seat. |
| `idle.json` | Handguard support grip, digits only |

Deviations in the bake (the approved files are unchanged): REMOVE ring MCP abduction +6°, because the approved grip crossed middle and ring glove surfaces (328 triangle pairs). During the rock the thumb slides off the paddle, and the index changes by MCP −3°, PIP +5° and abduction −6° to clear the pinch between magazine and receiver.

**The idle grip, which the player sees almost all the time, is corrected.** `Idle_LeftHand_B` had 24.5° of residual side-bend at `L_thumb.02`, 13.3° at `L_thumb.03`, and 25.5° of pinky abduction (limit 20). Its 15 digit rotations are re-authored through `hand_pose` from `grips/idle.json`: side-bend 0 on every bone and pinky abduction 20. Each digit was re-fitted against the wood (penetration ≤ 0.3 mm, pad in contact). Hand placement is unchanged, so the thumb now lies along the near side of the handguard instead of curling over it. The palm heel stays 6.9 mm into the wood in the approved placement (the old idle was 7.25 mm).

### Tests and evidence

Every reload sample in `apps/client/playwright/weapon-viewmodel.spec.ts` advances two render frames (`updateFromMainCamera(camera, 0.1)` twice) and asserts that the `Reload` action has weight 1, so it measures the clip, not the idle pose. Before September 26 the finger and framing tests called `updateFromMainCamera(camera, 0)` and measured the idle pose. A sample earlier than the previous one starts a fresh reload; snapshots without `reloadSerial` never count as restarts.

**First test, "magazine-only reload on the shared marks":**

- The clip is named `Reload` and lasts `AK47_RELOAD_DURATION_S`. `provenance.json` lists `Idle`/`Fire`/`Reload`, `clips {Reload: 1.7}` and `audioMarks` equal to `AK47_RELOAD_MARKS`.
- The clip starts and ends on the idle hand, with the magazine seated and visible, the spare hidden and the bolt at rest. The bolt never moves.
- **Rigid holds:** the old magazine from `release + 0.025` to `drop − 0.02` and the spare from `newMagazineInView` to `latch − 0.01`, drift < 1 mm and < 0.5°, both at full size while held. During the paddle press (`grip + 0.02` to `release + 0.025`) the magazine is still latched and the hand shifts on it while the thumb pushes, so that stretch has its own looser limit of 5 mm. The window used to start at `grip + 0.02`; the fix-round-0 GLB shifts the hand 3.4 mm during the press and returns it by 0.335 s, and from `release + 0.025` the drift is 0.05 mm.
- **Magazine visibility:** from `hook` to the end, sampled at 240 Hz, one magazine is always at full size. At every 1/240 s of the clip each magazine is either at full size or hidden, never in between: the game samples between the clip's 120 Hz keys, and a linearly interpolated scale key draws a half-size magazine for a frame. At `drop + 0.1` the old magazine is gone, the spare is in hand and contact occlusion is off. After the latch the magazine is seated and visible and the spare hidden.
- **Continuity:** arm-bone steps stay under 10° per 120 Hz frame, digit joints do not translate, and wrists have no scale or shear.
- The ready-grip, firing, casing, texture, arm-budget and legacy-viewmodel assertions.

**"reload glove fingers do not intersect one another or sink into the magazines":**

- 15 samples on the beats (0.12, `grip`, `release`, 0.374, `rockedOut`, `drop − 0.02`, `newMagazineInView + 0.02`, 0.85, `hook`, `latch`, `latch + 0.03`, `gripOpens`, 1.28, `handOnHandguard`, 1.55 s). Digit/digit surface crossings and thumb/palm self-intersection must be zero.
- **Welded self-intersection.** The glTF export splits glove vertices along UV and normal seams (7,817 vertices, 7,525 positions), so neighbours across a seam share a position but no index, and the old adjacency test counted them as crossings: 17–28 thumb/palm "crossings" at every sample and 27 at idle. The check now welds vertices by bind position before deciding adjacency. Welded, the fix-round-0 GLB scores 0 at every sample. A mutation that folds the thumb into the palm (L_thumb.01 ±40–70° about bone Z plus L_thumb.02 about the hinge) still scores 69–412.
- **Magazines** (tolerance proposed by the specs owner, not yet confirmed by the asset owner): no glove vertex may sit more than 1 mm (`SHALLOW_CONTACT_M`) inside the old or the fresh magazine while it is shown, on the 15 beats and on every 1/240 s from `grip` to `gripOpens + 0.04`. Inside/outside comes from the generalized winding number, which stays reliable on the magazine's open top and the receiver's open and non-manifold edges; depth is the distance to the nearest surface in the magazine's local (rig) units. The tolerance matches the asset owner's Blender LBS check (at most 0.45 mm).

**"reload thumb wraps each held magazine" (the top acceptance criterion):** contact distances alone passed at 0.45 mm while the thumb lay straight along the near face and ran past the rear edge toward the trigger guard as one flat lobe. This test samples the held windows every 1/60 s: the old magazine from `release + 0.04` (0.34 s; the tip may sit behind the rear edge on the paddle during the press, about 0.26–0.33 s) to `drop − 0.02`, and the fresh one from `newMagazineInView` to `gripOpens`. On each sample:

| Check | Limit | How it is measured |
|---|---|---|
| IP bend | ≥ 30° | Segment angle from the proximal phalanx (`L_thumb.02` head to `L_thumb.03` head) to the distal phalanx (`L_thumb.03` +Y), projected on the plane of the calibrated hinge `THUMB_HINGE` (0.32, 0, −0.948) in `L_thumb.02` space. A bend about bone +X shows up as side-bend, not flexion |
| MCP bend | ≥ 15° | The same, from the metacarpal (`L_thumb.01` to `.02` heads) to the proximal phalanx |
| Side-bend | ≤ 15° | Out-of-plane angle at MCP and IP. A 30° IP bend about bone +X measures 25–27° side-bend |
| Distal pad | ≤ 2 mm | Nearest `L_thumb.03` vertex (weight > 0.5, glove and suede overlay) to the held magazine |
| Pad-side share | ≥ 20% | Share of the suede-facing distal vertices within 2 mm of the held magazine. Suede-facing: bind normal within 60° of the measured pad direction (suede overlay centroid minus glove centroid on `L_thumb.03`, in bone space); 161 of 623 distal vertices |
| Proximal phalanx | ≤ 3 mm | Nearest `L_thumb.02` vertex to the held magazine |
| Thumb tip vs rear edge | ≤ 2 mm behind | The glove vertex farthest along `L_thumb.03`, in `Magazine_Surfaces` local x, against the magazine's rearmost point in a 4 mm band at the tip's height |
| Game-camera IP bend | ≥ 35° | In the game's own viewmodel camera at 960×540: the turn angle between the projected `L_thumb02`→`L_thumb03` and `L_thumb03`→`GripContact_thumb` segments |
| Game-camera MCP bend | ≥ 20° | The same, between `L_thumb01`→`L_thumb02` and `L_thumb02`→`L_thumb03` |
| Thumb/index ring | ≥ 80% magazine | ID render in the game camera (magazines green, meshes of the left skin red, everything else blue, background black). The ring is the projected polygon thumb CMC → MCP → IP → tip → index tip → DIP → PIP → MCP → back across the thumb-index web. Of its interior pixels not covered by the left hand, the share that is magazine. Daylight or rifle seen through the ring lowers it; fewer than 50 uncovered pixels count as fully closed |

The screen checks exist because the bone-space bends passed (MCP 23–38°, IP 43–55° on the e1655347 GLB) while the player saw a thumb bent into depth, projecting to 20–27° at the IP on the old magazine while in frame, and a thumb/index "OK ring" pinching air with daylight inside it. A screen angle is skipped on a sample where one of its three points is out of frame (the old magazine is carried out of the bottom-left before the let-go), and more than half of the held samples must be judged.

**Why the pad-side share replaced the 20% all-vertex share (proposed, pending the lead's sign-off).** The 20% share of all distal vertices is out of reach within the 1 mm depth limit, and it rewards the wrong contact. Evidence, from `L_thumb.03`'s own vertices (scratch scripts `specs4/padmax.mjs`, `sweep.mjs`, `contact.mjs` in the session scratchpad):

- **Flat-face bound:** a plane against the distal phalanx with its deepest vertex 0.5–1 mm inside. Pad laid square on it: 6.9–9.0% of all distal vertices within 2 mm, 19.9–26.1% of the suede-facing ones. Best orientation (pad tilted 24–28° along its curve): 15–20% of all, 43–56% of suede-facing.
- **Depth-limited sweep on the clip** (extra CMC ±20°, MCP −20…+30°, IP −20…+40° about the hinge, hand placement fixed): best all-vertex share with every thumb vertex ≤ 1 mm deep was 17.7% on the old magazine (0.40 s) and 13.3% on the fresh one (0.90 s). Without the depth limit it reached 31–37% at 3–4 mm penetration; the earlier 26.5% sweep had no depth limit.
- **The contact is the wrong side.** On e1655347 the thumb touches the magazine with its side: the mean normal of the contacting distal vertices points along the hinge (−0.90 to −0.96) and away from the suede pad (−0.52 to −0.64). That side contact scores 10–15% of all distal vertices, more than a correctly placed pad does, and 0% of the suede-facing ones.

So the all-vertex share could not tell a pad on the magazine from a thumb pinching it with its side. The pad-side share at 20% is reachable by a pad laid square at 0.5–1 mm (19.9–26.1%, more when it follows the pad's curve) and fails a side or nail contact.

The test first checks the bone-axis convention on the bind pose: `L_thumb.02` +Y runs to the `L_thumb.03` head (0.000°), and `THUMB_HINGE × +Y` points at the distal suede pad within 45° (measured 29.6°; a swapped or flipped axis would be 90–180°). It also requires at least 100 suede-facing distal vertices. A node sweep on the fix-round-0 clip moved each metric the right way: adding 30° IP and 20° MCP flexion about the hinge in the old-magazine hold gave IP 43.5°, MCP 29.8°, an all-vertex distal share of 26.5% (without a depth limit) and the tip 5.5 mm in front of the rear edge.

**"reload cancel and restart play the hand home along the clip"** (replaces the crossfade test). The runtime no longer blends joints between `Idle` and `Reload`; a stopped reload plays the clip home, backwards before `release` at up to 2× and forwards from it at up to 3×. On a restart a backwards return follows the new reload from where it meets it; a forwards return wraps through the idle pose and the new reload catches up at 4×.

- **Cancel** at 0.1, 0.27, 0.374, 0.5, 0.66, 0.9, 1.05, 1.13, 1.3 and 1.55 s, stepped at 120 Hz until `Idle` is back. Checks: the hand is home within 0.6 s; the two actions are never blended; clip time moves at no more than 3× and only in the expected direction. Idle counts as clip time 0, which is also the end, so any faster jump is a snap and must move every left-arm bone and both magazines less than 1 mm and 0.5°. Both clip ends are checked against the idle pose, digits included (< 0.1 mm, < 0.1°). After the return the idle hand, seated magazine, hidden spare, bolt and contact occlusion 1 are restored.
- **Penetration on the way home,** every third frame, from 0.374, 0.5, 0.66, 0.9 and 1.13 s: at most 1 mm into a magazine, and no deeper into the rifle than either end pose plus 1 mm.
- **Restart** from 0.1, 0.5 and 1.13 s, on the same frame and three frames into a cancel, with a new `reloadSerial`. The same no-blend and snap checks apply, with the rate at up to 4×. The new reload catches up, has weight 1 and time equal to its target, and matches a fresh reload within 0.1 mm.

Results of the September 26 run on GLB MD5 `e1655347f3442f784d23cdc3d608afae` and `Ak47AnimatedViewModel.ts` MD5 `9ba41ae406d22ea4c4299b5b832e3708`, both unchanged during the run (`weapon-viewmodel.spec.ts` with `weapon-audio.spec.ts`: 10 passed, 1 failed):

| Test | Result | Measured |
|---|---|---|
| First test | Pass | Magazines are full size or hidden at every 1/240 s |
| Fingers and magazines | Pass | 15 beats and the 240 Hz scan |
| Thumb wrap | **Fail** at all 38 samples | Bone space passes: IP 43–55°, MCP 23–38°, side-bend ≤ 0.1°, distal pad ≤ 0.05 mm, proximal 2.5–2.9 mm, tip 34–64 mm in front of the rear edge. The player's view fails. **Pad-side share 0%** at every sample: the thumb touches with its side, and all-vertex share is 10.4–15.1%. **Game-camera IP** 20–27° on the old magazine and 26–34° on the fresh one until 0.943 s, passing 36–76° from 0.96 s (19 failures). **Game-camera MCP** 11–16° on the old magazine and 14.4–19.7° on the fresh one from 0.86 s (28 failures). **Ring** 17–47% magazine on the old magazine, with 940–1,340 px of background inside the ring, which is the see-through "OK ring". On the fresh magazine it falls from 88% at 0.76 s to 10–11% at 1.09–1.16 s, where 229–381 px of daylight show between thumb and index (34 failures). Out of frame, not judged: MCP at 0.49–0.54 and 0.76–0.81 s, IP at 0.51–0.54 and 0.76–0.79 s |
| Framing | Pass | All 10 samples |
| Cancel and restart | Pass | |


Asset evidence (the asset owner's scratch outputs, session `90febd89`, under `/private/tmp/claude-503/-Users-dimitri2-Desktop-AGENTS-clawdstrike/90febd89-45ce-4e34-b2d1-8a2cfad709ac/scratchpad/`):

- **Game-view frames:** `rebuild/frames/*-game.png` every 0.05 s, with the contact sheet `rebuild/sheet-game.png`.
- **Arm frames:** `rebuild/frames/arm-*.png`, with the sheet `rebuild/sheet-arm.png`.
- **Grip close-ups:** `rebuild/closeups/reload-*.png` (left/right/rear at 0.24, 0.30, 0.42, 0.98 and 1.10 s), with `rebuild/sheet-closeups.png`.
- **Idle before and after:** `rebuild/sheet-idle-before-after.png` and `rebuild/idle-game-before-after.png`.
- **Every-frame bake check:** `rebuild/verify-final.json`. Max arm step 7.09°, wrist twist 0, endpoints 0.0° from idle, digit penetration ≤ 0.45 mm.
- **Framing emulation:** `rebuild/framing-final.txt`.
- **Calibration:** `grip/hand_pose.md` and `grip/calib/`. The approved-grip renders are `grip/final/render_{remove,insert,reach}/`.

Known limits:

- On the way to the magazine and back (about 0.10–0.15 s and 1.25–1.30 s), the path planner swings the open hand out to the left to clear the rifle, which reads as a small flourish.
- The sleeve creases at the elbow when it bends to 78–123°. The elbow stays off-screen in the game view.
- `build.py`'s `runtimePose.position` (0.151, −0.143, −0.30) is stale; the runtime uses `BASE_POSITION` (0.147, −0.128, −0.30).

## History: two-magazine v2 reload (superseded September 26, 2026)

v2 replaced Case 04 with two clips on `AK47_Rig`: `ReloadTactical` (2.4 s) and `ReloadEmpty` (2.9 s), which added an over-the-top charging-handle rack. It reused the Case 04 grip relative to each magazine, with the thumb CMC opened 28° and the index relaxed, and decimated the arms from 634k to about 110k triangles. The user rejected it as too slow, the rack as unnecessary, and the magazine grip's thumb as non-anatomical. The thumb fault was the +X MCP/IP bend described above.

The sections below are the history of the Case 04 grip that v2 replaced.

## History: Case 04 grip, lessons and workflow

The user selected Case 04 from the September 9, 2026 comparison and approved installing it. The selected static pose is the reference for the reload. Do not resume grip optimization or replace it with the case that scores best on a contact metric.

**Installation status: installed and verified.** Case 04 is now in the active source and runtime asset. The installed game loaded the expected HTTP-served bytes, completed a real reload, and passed the sampled source-to-renderer, endpoint and cancellation checks. Two unchanged legacy geometry tests still fail on the selected pose's overlaps; those limitations are recorded below. The preview export's `installed: false` remains its correct historical status.

The preserved selection is [left-hand-case04.blend](../assets/source/ak47/left-hand-case04.blend), identified by [selection.json](../assets/source/ak47/exports/selected-case04/selection.json). Its SHA-256 is `1980b29ba9eed0f2eb46c447ca1661eca9f5b43d08af958d15799551d14ec1b3`. [reload.py](../assets/source/ak47/reload.py) consumes that selection; [build.py](../assets/source/ak47/build.py) exports the active `ak47.blend` and updates the local runtime asset. The selected checkpoint is not a scratch file.

## What went wrong with the thumb

The thumb controls represent a metacarpal and two phalanges:

| Control | Anatomical role | Intended movement |
|---|---|---|
| `L_thumb.01` | First metacarpal, moving at the CMC joint | Compound opposition and opening relative to the palm |
| `L_thumb.02` | Proximal phalanx, moving at MCP | Flexion toward the broad thumb pulp |
| `L_thumb.03` | Distal phalanx, moving at IP | Distal flexion toward the pulp |

CMC opposition includes coupled axial rotation. Its anatomical axes are oblique and offset; it is not a finger hinge, nor a universal 90-degree rotation. The CMC pose also carries the MCP/IP bend planes into the object's frame. A correctly directed local bend can therefore move toward the wrong magazine face if the metacarpal orientation is wrong. [Hollister et al.](https://pubmed.ncbi.nlm.nih.gov/1569508/) and [Halilaj et al.](https://pubmed.ncbi.nlm.nih.gov/23681597/) support this movement model, not a particular set of Blender angles.

The old contact points, including suede vertex `9356`, sampled near an edge of the thumb padding. Its normal was about 57 degrees from the independently measured broad padded surface. Positive local-X flexion moved toward that small edge patch, so the old sign check passed even though the broader thumb looked as though it folded sideways.

A positive dot product establishes a direction component. It does not establish the anatomical bend plane, pivot location, allowable motion, broad-pad orientation or healthy deformation. A normal derived from the same bone frame being tested is also not an independent anatomical reference. The glove's gray material covers a curved region; averaging all reinforcement normals is no substitute for identifying a local padded face and inspecting its opposite surface.

The useful comparison kept the mesh, joints and weights fixed. It treated the broad padded face as the intended pulp, explicitly as a design inference supported by the neutral shape and movement. The positive flex axis was derived as:

```text
pad_transverse = normalize(pad_normal - bone_y * dot(pad_normal, bone_y))
axis_rest = normalize(cross(bone_y, pad_transverse))
axis_local = inverse(rest_rotation) * axis_rest
```

The resulting bone-local axes are:

| Joint | Positive flex axis |
|---|---|
| MCP | `(-0.1496623, -0.000000018, -0.9887372)` |
| IP | `(-0.0208323, 0.000000033, -0.9997830)` |

Apply `Quaternion(axis_local, angle_radians)`. These are pose-control changes, not rest-roll edits. Joint centers, lengths, topology, geometry, weights and UVs remain unchanged. Exact axes and sample quaternions are in [derived-axes.json](../assets/source/ak47/exports/review-2026-09-09/run-01/diagnostics/axis-comparison/derived-axes.json).

The previous CMC frame had partly compensated for the wrong downstream bend direction. Reorienting the CMC around its length to align the derived hinge plane with the intended wrap reduced its modeled rest-to-pose quaternion distance from about 93 degrees to approximately 39–41 degrees. These are descriptive rig rotations, not clinical joint angles or universal limits. Published MCP range measurements vary widely across individuals; a fixed 90-degree rule would be unjustified. [Yoshida et al.](https://pubmed.ncbi.nlm.nih.gov/14507504/)

## Tests that localized the problem

The accepted right thumb was a valuable visual reference. Exact mirrored rest geometry, weights and bone frames established consistency, but did not prove that the shared control convention was anatomically correct. Both sides can share the same wrong convention.

[diagnostics.py](../assets/source/ak47/exports/review-2026-09-09/diagnostics.py) runs on an isolated checkpoint copy. It identifies fixed surface regions independently of changing weights, retains the old contact patch as a separate reference, and measures pad frames, cross-section bands, region areas and landmark trajectories. Cross-section bands follow selected tissue; they are not fresh medical cross-sections or segmented muscles.

The decisive tests compared existing X flexion with the derived axes at MCP-only 35 degrees, IP-only 35 degrees and both joints at 35 degrees, with the entire hand neutral. The derived controls bent toward the broad pulp and palm. A subsequent 65/65-degree bound retained a rounded body: distal width changed from 17.22 to 17.15 mm, while depth remained about 20.155 mm. These are tested engineering poses, not a certification of every possible intermediate or maximal human motion.

A direct pinch used derived thumb flexion of 35/35 degrees, index flexion of 60/55/25 degrees and one CMC swing toward the index pad. Fixed pad proxies reached 0.429 mm separation. This showed functional reach without a new optimizer; it did not certify complete surface clearance. Inner reinforcement creases remained visible and were kept separate from the control-axis finding.

The mirrored body control used actual right-body geometry with corresponding triangles to avoid nearest-face ambiguity across opposite quad diagonals. Rest geometry mirrored exactly. Maximum posed coordinate error was 0.0000334 mm, below the unchanged 0.01 mm engineering tolerance; joint lengths agreed within 0.000004 mm. The earlier independent nearest-face result is retained because it explains why normal sampling initially produced a slightly different axis.

Evidence: [axis comparison and pinch](../assets/source/ak47/exports/review-2026-09-09/run-01/diagnostics/axis-comparison/diagnostics.json), [mirrored body control](../assets/source/ak47/exports/review-2026-09-09/run-01/diagnostics/axis-comparison/mirrored-body-control.json), and [bend comparison](../assets/source/ak47/exports/review-2026-09-09/run-01/bend-direction-comparison.png).

Earlier trial scenes had separate faults, including incorrect Euler/quaternion usage, bad rolls and a large active contact morph. Those findings applied to those scenes. They were not evidence that the clean canonical mirrored rig had the same faults. Check rotation modes, active actions, constraints, shape keys and modifiers in each actual input before attributing a defect to anatomy. Quaternion components themselves are not anatomical flexion angles.

## Whole-hand placement, contact measurements and controlled comparisons

Whole-hand placement matters. Curling the distal thumb cannot relocate hand-driven web tissue. Weight changes cannot solve a placement problem when both relevant rigid influence predictions already occupy the problematic region. Likewise, moving the palm while retaining old finger targets can make a plausible placement look impossible.

The earlier A/B comparison changed palm placement and MCP flexion together, so it could not identify which change caused the result. The later eight-case experiment separated three two-level factors:

| Factor | Levels |
|---|---|
| Whole-hand placement | Current placement; complete arm translated 15 mm rearward |
| CMC frame | Calibrated frame; 15-degree local longitudinal adjustment |
| Flex distribution | MCP/IP 55/45 degrees; 45/55 degrees |

Workers read one immutable baseline and frozen manifest, used common measurement regions and the same bounded finger fit, and wrote separate outputs. Two evaluation processes and one render queue avoided live-scene conflicts. The unchanged control repeated exactly. This was a bounded local comparison, not a global optimum search or statistical population study.

Worker validation exposed two finger-fitting biases: starting from generic rather than accepted finger poses/contacts, and imposing generic separation targets rather than preserving the accepted spacing. These were corrected once in the common fitter, then the entire batch was repeated. Earlier outputs remain in separate directories. Do not compare a corrected case against an earlier case generated under a different fitter or reference.

The magazine is not a certified closed solid: the source audit found 587 unpaired edges after diagnostic welding. A nearest-face value `(point - nearest_point).dot(normal)` is local signed-offset guidance, not a dependable inside/outside test or penetration depth. The measurement tool uses BVH candidates followed by explicit triangle tests and cross-section segments. Touching can still produce intersections. Whole intersected triangle area is neither penetration volume nor unique damaged surface area, especially when garment layers are summed.

The batch's broad-pulp coverage screen required centroid distance within 1.5 mm and opposing-normal alignment at least 0.8. Case 04 scored 0% on that particular screen. This did not nullify the user's subsequent visual selection. The historical [results report](../assets/source/ak47/exports/review-2026-09-09/run-01/results.md) initially recommended other contact leads and further investigation; its unselected status and next-step recommendation were superseded by the explicit Case 04 selection. Retain the report as history, not as authority to reopen the selected pose.

The full method is in the [experiment plan](../assets/source/ak47/exports/review-2026-09-09/experiment-plan.md), [frozen manifest](../assets/source/ak47/exports/review-2026-09-09/run-01/manifest.json), [worker](../assets/source/ak47/exports/review-2026-09-09/worker.py) and [measurement tool](../assets/source/ak47/exports/review-2026-09-09/measure.py).

## The selected reload and its preservation checks

Case 04 is P0/C1/F1: unchanged whole-hand placement, the second CMC frame and derived MCP/IP flexion of 45/55 degrees. The saved source owns all fitted digit transforms. Do not reconstruct the selected grip from rounded numbers when the exact source is available.

The bake retains the existing arm/wrist trajectory, magazine motion, right hand, original actions and duration. Only the digit channels needed to enter and leave the selected grip are authored. The reload spans frames 1–148 at 120 fps, or 1.225 seconds between endpoints. Frames 33–119 retain the selected grip relative to the magazine.

The opening target is identity at CMC in its existing local rest frame and derived-axis MCP/IP flexion of 3/2 degrees. This replaces the old CMC `opened = rotation` no-op. The existing smooth opening envelope provides:

| Frames | Behavior |
|---|---|
| 1–3 | Original idle |
| 3–12 | Open while approaching |
| 12–24 | Maintain the opening pose |
| 24–33 | Close into Case 04 |
| 33–119 | Maintain the selected magazine-relative grip |
| 119–126 | Open during release |
| 126–137 | Maintain opening |
| 137–148 | Return to original idle |

The [source validation](../assets/source/ak47/exports/selected-case04/source-validation.json) records maximum selected-static surface error of `1.83714e-7 m`, hold-matrix error of `1.25170e-6`, and exactly zero evaluated endpoint surface error at frames 1 and 148. Original actions and arm/wrist curves remain unchanged. Matrix error is a matrix-component comparison, not a distance in metres.

The ordered gameplay and close stills showed progressive closure and release without an obvious inversion or severe contortion. They cannot establish continuous playback smoothness or exclude a brief crossing between samples. Minor curled stitching is visible at the open thumb web, particularly in close frames 24 and 126, and is inconspicuous at gameplay scale. Preserve the selected pose; treat any approved local stitch cleanup separately from grip design.

## Export and runtime verification

Keep the evaluated deformation compatible with the renderer. Blender Armature Preserve Volume uses quaternion deformation; the installed Three.js path uses linear matrix skinning. Turning Preserve Volume on can make Blender look better while the exported game disagrees. Baking bone transforms does not bake that surface difference. If a corrective morph is ever explicitly selected, export its animation and verify its reset as well as its contact pose. [Blender Armature documentation](https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/armature.html), [Three.js r181 skinning](https://raw.githubusercontent.com/mrdoob/three.js/r181/src/renderers/shaders/ShaderChunk/skinning_vertex.glsl.js), [glTF specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).

glTF can split vertices, so raw source indices are not a reliable export correspondence. The isolated preview [parity report](../assets/source/ak47/exports/selected-case04/parity.json) matched source samples to exported vertices and made 43,428 position comparisons across 14 frames. Maximum error was approximately `0.0032235 mm`; poses were finite, endpoints and cancellation checks passed, and the report contained no failures. This verifies sampled skinning behavior, not anatomy or contact quality.

The [game preview capture](../assets/source/ak47/exports/selected-case04/game-preview/capture.json) records matching served, local and loaded preview asset hashes. Its [video](../assets/source/ak47/exports/selected-case04/game-preview/reload-in-game.mp4) uses the isolated preview GLB. That proves which preview was supplied to the game, not that the active asset had already been replaced. Final installation must verify the bytes served for the active runtime path separately.

### Installed-asset evidence

The [installation record](../assets/source/ak47/exports/selected-case04/installation.json) identifies the active files:

| File | SHA-256 |
|---|---|
| `assets/source/ak47/ak47.blend` | `c9378cefec1e7e582a37f663dc388aa7dd5839748f893d67cb65cf94fd622b66` |
| `apps/client/public/assets/models/weapons/ak47-next/ak47.glb` | `37e5be628a4b12ff92bea6f3711d3e621f2cc333c2d900443cf177f5de1311d7` |

The runtime GLB is 77,375,584 bytes. Its MD5 and the source blend's MD5 match the installed provenance. The [installed parity check](../assets/source/ak47/exports/selected-case04/installed/parity.json) made 43,428 comparisons across 14 source frames, with maximum error approximately 0.003223 mm. All 148 sampled poses were finite, endpoint error was approximately 0.000055 mm, and all six cancellation errors were zero.

The [installed game capture](../assets/source/ak47/exports/selected-case04/installed/capture.json) reads the normal runtime URL. Instrumentation hashes the actual server response and returns those same bytes to the browser; it does not substitute the preview file. The served/loaded hash matches the runtime hash above. Real input changed ammunition from 30 to 29, reloaded to 30, and reduced reserve from 120 to 119. No browser errors were reported. The [installed reload video](../assets/source/ak47/exports/selected-case04/installed/reload-in-game.mp4) contains 149 frames at 60 fps with pre/post idle; decoding passed. Grip, return and restored-idle frames were inspected.

### Legacy regression limits

The unchanged `weapon-viewmodel.spec.ts` was run against the installed asset: **one test passed and two failed**. Trigger/index framing passed. The failures were:

- `L_GloveAndForearm/thumb must not enter the magazine` at line 450. Its local signed-offset estimate was `-0.0127042519 m` against a `-0.00005 m` threshold. Because the magazine is an open assembly, this is not a certified solid penetration depth.
- `Crossing glove surfaces at reload 0.22` at line 653. The surface test reported 1,095 thumb/magazine pairs and 51 thumb/palm self-intersection pairs. These are real geometry-test failures, not dismissed as angle-convention problems.

The test's Euler-X thumb flexion and off-axis assertions also assume the old control convention and do not describe the derived near-Z axes. They were not the first reported failure and were not relaxed. Do not label contact failures as obsolete merely because some angle assertions are obsolete. An early failure in the first monolithic test leaves its later assertions unverified; the separate installed parity/cancellation check supplies the fresh endpoint evidence above.

The approved visual selection was preserved rather than changed to satisfy those historical thresholds. Installation and renderer fidelity are complete; the selected pose is not claimed to be intersection-free. Minor web-stitch curling in magnified transition views also remains. Any further geometry cleanup must preserve the approved silhouette and be reviewed as a separate change.

## Reproduction and installation

Run these commands from the repository root. Blender may require the authorized execution path outside a sandbox on this machine; a documented sandbox startup crash was resolved by that path. Do not change global permissions to accommodate an asset build.

Generate the isolated bake from the preserved selection:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python-exit-code 1 --python assets/source/ak47/reload.py
```

Export and render the isolated preview:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b assets/source/ak47/exports/selected-case04/case04-reload-preview.blend --python-exit-code 1 --python assets/source/ak47/exports/selected-case04/preview.py -- export
/Applications/Blender.app/Contents/MacOS/Blender -b assets/source/ak47/exports/selected-case04/case04-reload-preview.blend --python-exit-code 1 --python assets/source/ak47/exports/selected-case04/preview.py -- frames
```

After explicit installation approval, bake/install the selected animation into the active source and export the runtime asset:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python-exit-code 1 --python assets/source/ak47/reload.py -- --install
/Applications/Blender.app/Contents/MacOS/Blender -b --python-exit-code 1 --python assets/source/ak47/build.py
```

The install form promotes the baked animation to `ak47.blend`; the selected checkpoint remains its input. Preserve a copy of the previous active source before promotion. `build.py` exports `assets/source/ak47/exports/ak47.glb` and updates `apps/client/public/assets/models/weapons/ak47-next/`; it does not solve or improve the grip.

Before reporting installation complete, verify the active source and runtime asset, rerun appropriate export/runtime checks, inspect the in-game reload and cancellation behavior, and record actual served-asset identity. Preserve the exact idle endpoints, 1.225-second duration, magazine timing, selected grip and right-hand behavior. Stop when those checks pass; do not launch another pose family to improve historical metric scores.
