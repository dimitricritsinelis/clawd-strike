# Thumb opposition experiment plan

The recommended next round is a short diagnostic study followed by eight controlled static-grip candidates. Separate Blender processes can evaluate those candidates in parallel. One owner should define the candidates, preserve the approved checkpoint, compare the results and integrate the selected pose. Independent agents should review anatomy, deformation and export behavior against the same evidence.

The objective is a believable left-hand magazine grip and a smooth reload from the actual left-side gameplay camera. The thumb must reach the far/right magazine face, retain the accepted right thumb's apparent thickness and length, and preserve the glove design. Complete anatomical fidelity outside the required relaxed, pinch and gripping movements is not necessary. Weapon dimensions, right-hand appearance and gameplay timing remain protected.

This is a proposed experiment, not an implemented correction. No new pose, mesh, weight or animation changes were made during this research pass.

**1. What the evidence establishes, and what it does not**

The existing source maps `SupportHand`, `L_thumb.01`, `L_thumb.02` and `L_thumb.03` to the hand, thumb metacarpal, proximal phalanx and distal phalanx. The accepted checkpoint and canonical source have mirrored left/right neutral body geometry and corresponding thumb rest frames. This makes an immediate complete hand rebuild a poor first experiment: it would replace a useful control and introduce many variables.

The previous isolated tests applied small positive local-X increments at MCP and IP. The measured motion had a positive projection toward the identified pad surface, and the hinge heads did not drift. That supports the bend sign. It does not prove correct joint centers, the full bend plane, allowable working range, full pad orientation or healthy mesh deformation. A positive dot product can still conceal substantial sideways motion. The three existing pad samples also cluster in a small area; they cannot establish a broad contact patch.

The previous A/B comparison was confounded. A changed the CMC pose with the hand held fixed. B additionally moved the hand rearward by 15 mm and opened MCP by 10 degrees. The effects of hand placement and MCP change were not isolated. B also retained the old finger pose, so newly displaced finger contacts did not establish that the new hand placement was intrinsically unusable.

There is a further measurement limitation. A read-only audit of the current exported `Magazine_Surfaces` mesh found 5,507 triangles and two connected components after joining coincident positions for diagnosis. At both 0.1 and 1 micrometre coordinate quantization, the main component had 547 unpaired edges and the smaller component had 40. Paired edges had consistent winding in this test. This is not a certified watertight solid; unresolved T-junctions may contribute, and an unpaired edge is not necessarily a visible hole.

Consequently, the previous figures described as 9–10 mm penetration were local signed surface-offset estimates. The calculation was `(point - nearestPoint).dot(nearestFaceNormal)`. It is useful for locating suspicious regions, but it is not a reliable general inside/outside classifier for this assembly. The BVH interface supplies proximity, normals and intersection queries, not a guarantee of solid containment. Confirm suspected collisions with actual triangle intersections and local cross-sections before using their magnitudes as acceptance criteria. [Blender BVH documentation](https://docs.blender.org/api/3.0/mathutils.bvhtree.html)

**2. The thumb movement problem**

CMC opposition combines metacarpal movement away from and across the palm with axial rotation. Anatomical studies describe oblique, offset axes rather than a pair of perpendicular hinges intersecting at one point. A single Blender metacarpal control is a practical approximation, but its orientation must be assessed across the intended motion. A rule such as “rotate the thumb 90 degrees relative to the fingers” does not specify a correct rig. [Hollister et al., 1992](https://pubmed.ncbi.nlm.nih.gov/1569508/)

In-vivo research also reports coupled CMC rotations during functional tasks. This supports coordinated opposition, not a universal instruction to finish one rotation before starting the next. “Clear the edge, then close” is a useful collision-avoidance hypothesis for this magazine, not a complete anatomical model. [Halilaj et al., 2014](https://pubmed.ncbi.nlm.nih.gov/23681597/)

CMC orientation carries the MCP/IP bend axes into world space. A hinge can bend correctly relative to its own pad and still travel into the wrong magazine face because the metacarpal aims its bend plane incorrectly. Conversely, a plausible bone trajectory can coexist with an implausible web or thumb-base surface. Those are separate questions and require separate measurements.

Clinical angles cannot be copied directly into Blender Euler fields. Rotation order, rest orientation and anatomical neutral all matter. Report relative evaluated segment frames and independently identified mesh landmarks. One normal-volunteer study found a wide spread of MCP maximum flexion, so a universal numerical angle limit is not a defensible substitute for inspecting the working pose. Its observations are not target angles for this asset. [Yoshida et al., 2003](https://pubmed.ncbi.nlm.nih.gov/14507504/)

Static shape and movement path must also be separated. With the current linear skinning setup, identical final bone transforms, weights and mesh inputs produce the same final surface. Swinging outward before curling can improve intermediate clearance; it cannot cure final intersection while keeping the endpoint unchanged. This follows from the weighted bone-matrix calculation used by the installed Three.js 0.181.2 shader. [Three.js skinning source](https://raw.githubusercontent.com/mrdoob/three.js/r181/src/renderers/shaders/ShaderChunk/skinning_vertex.glsl.js)

**3. Diagnostic study before the candidate batch**

Create one immutable fixture from `left-hand-review-checkpoint.blend`. Record its hash, all active animation state, frame, object transforms, rest matrices, bone lengths, morph values, weights and modifier settings. Preserve the original live scene. A fresh independent run must reproduce the baseline's evaluated geometry within a declared numerical tolerance before candidate evaluation starts.

Identify mesh landmarks independently of the bone axes: distal pad center and distributed pad boundary samples, dorsal tip, radial and ulnar sides, MCP/IP crease centers, thenar apex, web saddle and the thumb/index attachments of the web. Validate these visually. Do not equate the average normal of the wrapped suede reinforcement with the anatomical pad direction.

Run three diagnostic families with the magazine hidden first:

| Test | Controlled movement | Required observations |
|---|---|---|
| MCP sweep | Neutral, small, intermediate and intended working flexion, then return; repeat with neutral and opposed CMC | Joint-center placement, full bend plane, pad-frame rotation, crease behavior and local thickness |
| IP sweep | Same bounded sampling with upstream joints fixed | Distal trajectory, pad orientation, unintended twist, local flattening and fixed upstream geometry |
| CMC opposition | Neutral, opening, partial opposition and intended working orientation with distal flexion fixed | Metacarpal orientation, separate web opening and pad rotation, thenar/web shape and seam attachment |

Compare the same tests on the mirrored right hand. Mirrored agreement establishes consistency, not independent anatomical truth. Then combine the verified motions into relaxed and thumb-to-index pinch poses before introducing the actual magazine.

Track cross-section width/depth, surface-area change in fixed anatomical regions and landmark trajectories. Engineering alerts should be calibrated against the accepted reference and repeatability, then frozen. They are not medical thresholds. A visible pinch, unexplained twist, discontinuity or incorrect pad identification stops the pose batch and identifies the appropriate repair branch.

Audit the evaluated source magazine as well as the export. Inspect boundary edges, T-junctions, components, winding and actual intersections. Use a few repeatable cross-sections through the thumb base, MCP and IP to resolve ambiguous proximity results. Do not modify or silently cap the weapon to make a collision test pass.

**4. Eight static candidates**

Use a two-level factorial design for three factors. This tests combinations and interactions instead of attributing a combined change to one variable. The proposed levels below are engineering starting points. Freeze the exact transforms after the diagnostic study; do not adjust them independently in individual workers. [NIST factorial-design guidance](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3331.htm)

| Factor | Level 0 | Level 1 | Question |
|---|---|---|---|
| P: whole-hand placement | Current wrist/palm placement | One rearward placement, initially the measured 15 mm offset | Does additional space for the thumb base improve the entire grip after equal finger fitting? |
| C: CMC bend-plane orientation | One verified reference opposition frame | One small verified axial-component change about the metacarpal's own length axis | Does changing the downstream hinge plane improve wrap without twisting the web? |
| F: flexion distribution | More MCP, less IP | Less MCP, more IP, with comparable total bend | Is the thumb closing too early at the knuckle? |

For example, 55/45 and 45/55 degree MCP/IP settings could bracket flexion distribution if both pass the diagnostic study. Equal angle sums do not guarantee identical endpoint orientation because the joint frames differ. These values are not prescribed anatomical limits. The CMC factor must be chosen from measured segment/pad frames, not guessed world-space angles or a desire to show a different glove surface.

| Candidate | Placement | CMC frame | Flexion distribution |
|---|---|---|---|
| 1 | P0 | C0 | F0 |
| 2 | P0 | C0 | F1 |
| 3 | P0 | C1 | F0 |
| 4 | P0 | C1 | F1 |
| 5 | P1 | C0 | F0 |
| 6 | P1 | C0 | F1 |
| 7 | P1 | C1 | F0 |
| 8 | P1 | C1 | F1 |

Include the untouched checkpoint as a separate control and repeat that control in a fresh process. These are deterministic comparisons, not a statistical population study. The factorial differences reveal local effects and interactions; they do not establish a global optimum or justify significance claims. Failure across eight configurations only rejects the tested range.

Keep geometry, rest axes, weights, materials, bone lengths, CMC translation relative to the hand, magazine transform, cameras and lighting fixed. No candidate gets private smoothing, a corrective shape, a shifted bone pivot or a different contact threshold.

Every candidate receives the same bounded finger-fitting pass while its hand placement and thumb remain fixed. Use identical starting finger poses, allowed motions, contact objectives and evaluation budget. Record results before and after fitting. A budget-limited failure to converge is unresolved, not proof that the pose is impossible. This also prevents an attractive thumb from receiving an arbitrary amount of bespoke help.

**5. What should run in parallel**

Use independent headless Blender processes and one directory per candidate. All workers read the same immutable input and shared parameter table. They write only their own candidate, measurement report and renders. They never save canonical assets, install a GLB, run the authoring script that overwrites the source, or alter the live scene.

Start with two geometry/evaluation workers and one render queue. Benchmark resource use before increasing concurrency: several simultaneous GPU renders may be slower. Parallelism should come from independent processes; Blender documents that its Python integration is not thread-safe. [Blender threading guidance](https://docs.blender.org/api/main/info_gotchas_threading.html)

The three supporting GPT-6 Astra medium roles should be movement/reference review, mesh/glove/measurement review, and experiment/export verification. One coordinator owns the common interpretation and integration. Multiple agents freely posing the same live MCP scene would create state conflicts and incomparable results.

Blender MCP remains useful for examining the baseline and selected results interactively. The shared scene should not serve as the experiment worker pool.

**6. Shared scorecard and review**

Use separate acceptance criteria rather than one weighted score that allows good contact to hide a visibly broken thumb.

| Criterion | Evidence |
|---|---|
| Left-side gameplay appearance | Matched original camera, scale and reload transform; believable bend, accepted apparent thumb proportions, curved web and recognizable grip |
| Far/right-face contact | A connected evaluated pad patch, surface-gap distribution and orientation against the actual contacted magazine face; no dorsal or isolated-point substitute |
| Whole-hand fit | Confirmed surface intersections and cross-sections for thumb base, web, palm and all fingers; include hand-dominant web regions |
| Glove finish | Body, suede, stitching and other affected patches remain attached; inspect seams and visible wrinkles at the same scale |
| Deformation | Fixed anatomical cross-sections and surface-area changes; no contact obtained through shrinking, flattening or extreme web stretch |
| Preservation | Semantic comparison of weapon, right hand, dimensions, UV/material assignments and protected action curves |

Numerical reports should separate local signed offsets, confirmed intersections and ambiguous samples. Report affected area and anatomical location, not just the worst vertex or raw vertex count. Sampling regions must remain fixed when weights change later; selecting only vertices above a thumb-weight threshold can hide hand-dominant web failures.

The left-side gameplay camera is the primary artistic decision view. Palm, back and rear-edge views diagnose hidden causes and provide export confidence. They do not create a new requirement to redesign the entire hand for unseen angles. Review the complete eight-case comparison sheet, then the best two at higher quality. Keep the existing middle-knuckle finish issue separate from newly introduced failures.

**7. When to change weights, geometry or the rig**

| Evidence | Next isolated intervention |
|---|---|
| Neutral bone motion or joint placement is wrong | Correct the demonstrated control/rest-frame/pivot issue, then rerun the diagnostic battery before grip fitting |
| Plausible bones but mesh fails in moderate poses away from the magazine | Compare a local weight repair against unchanged weights at identical bone transforms; inspect topology only where that comparison supports it |
| Neutral motion is usable but full tissue cannot clear the magazine | Revisit whole-hand stance and thumb opposition; do not try to fix hand-driven web vertices by curling IP |
| A viable grip exposes a local glove defect | Repair and rebind only the affected finish, preserving UV/material appearance |

The earlier rigid-influence probes sometimes placed both the hand-driven and CMC-driven predictions inside the suspicious region. That is evidence against assuming that reweighting alone will solve placement. Those locations must first be checked with the corrected collision method.

A small corrective shape may be appropriate if a repeatable deformation defect remains, but it must be a separate controlled intervention with relaxed, pinch, grip and transition checks. It must not shorten the thumb, mask an impossible whole-hand placement or stay accidentally active in idle.

**8. Motion and export after static selection**

Once the static grip is reviewed, compare two short approach/release paths with identical endpoints and duration: direct pose interpolation and an explicitly authored clearance waypoint. This tests movement independently from static geometry. Sample the web and pad throughout the path and inspect normal-speed playback. Do not infer smoothness from bone markers alone.

Judge candidates using runtime-compatible skinning. Blender's Preserve Volume option uses quaternion deformation; it can be a diagnostic comparison, but is not a shipping fix for the installed matrix-blending renderer. Baking bones does not bake away that difference. [Blender Armature modifier](https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/armature.html)

glTF supports linear blend skinning and explicit morph targets. If a corrective shape is selected, export its animation and verify its reset as well as its posed shape. An isolated Three.js export check should compare evaluated surfaces and actual rendered images before installation. Vertex splitting during export means that raw source/export vertex indices are not a reliable correspondence. [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

Integrate only the reviewed grip into the existing 1.225-second reload. Preserve the magazine animation and held-contact interval, inspect entry and exit transitions, then capture the actual-game video. A successful screen or attractive Blender still is not final reload proof.

The first round should end with one comparison sheet, the measured causes of failures, and at most two static candidates for review. If no candidate survives, report which assumption failed and propose one targeted follow-up branch. Do not start another uncontrolled grid or replace the neutral hand solely because the tested poses failed.

**Evidence and sources**

Local evidence used in this review:

- [Joint tests](/tmp/thumb-direction-20260909/joint-tests.json), [candidate A](/tmp/thumb-direction-20260909/candidate-a.json), [candidate B](/tmp/thumb-direction-20260909/candidate-b.json), and [regional audit](/tmp/thumb-direction-20260909/penetration-audit.json). Collision values in these older reports retain their original labels and require the qualification above.
- [Exported-magazine topology audit](/tmp/thumb-direction-20260909/exported-magazine-topology.json). Export SHA-256: `a28b09fc2f611ea2eec16aeaeb7b6ddf9fe78c641fbaa489096a12ebf8f21867`.
- [Current source authoring script](/Users/dimitri2/Desktop/clawdstrike/assets/source/ak47/reload.py), including its old fixed thumb pose and three-point contact test. It was inspected, not executed.
- [Installed Three.js skinning shader](/Users/dimitri2/Desktop/clawdstrike/apps/client/node_modules/three/src/renderers/shaders/ShaderChunk/skinning_vertex.glsl.js), version 0.181.2.

Primary research and official documentation:

1. Hollister A. et al. “The axes of rotation of the thumb carpometacarpal joint.” Journal of Orthopaedic Research, 1992. [PubMed](https://pubmed.ncbi.nlm.nih.gov/1569508/).
2. Halilaj E. et al. “In vivo kinematics of the thumb carpometacarpal joint during three isometric functional tasks.” Clinical Orthopaedics and Related Research, 2014. [PubMed](https://pubmed.ncbi.nlm.nih.gov/23681597/).
3. Yoshida R. et al. “Motion and morphology of the thumb metacarpophalangeal joint.” Journal of Hand Surgery, 2003. [PubMed](https://pubmed.ncbi.nlm.nih.gov/14507504/).
4. Blender Foundation. [Armature modifier](https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/armature.html), [Python threading guidance](https://docs.blender.org/api/main/info_gotchas_threading.html), and [BVH API](https://docs.blender.org/api/3.0/mathutils.bvhtree.html). The linked BVH page documents an older API version and is used only for the proximity-query semantics shared by the inspected code.
5. Three.js contributors. [r181 skinning shader](https://raw.githubusercontent.com/mrdoob/three.js/r181/src/renderers/shaders/ShaderChunk/skinning_vertex.glsl.js), cross-checked against the installed 0.181.2 implementation.
6. Khronos Group. [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), skinning, morph targets and animation sections.
7. NIST/SEMATECH. [Two-level full factorial designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3331.htm).

The earlier supplied YouTube links were attempted but could not be retrieved in this pass. No claim here depends on having watched them. The cited anatomical studies support the movement model; they cannot certify anatomical perfection of this particular asset. The proposed visual and geometric experiments remain necessary.
