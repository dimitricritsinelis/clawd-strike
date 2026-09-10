# AK reload animation: selected grip, lessons and workflow

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
