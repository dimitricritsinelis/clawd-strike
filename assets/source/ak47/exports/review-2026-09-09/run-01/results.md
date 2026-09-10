# Thumb grip experiment results

The diagnostic fixture and eight-case parallel experiment are implemented and executed. The experiment identified and corrected a thumb-control direction problem in the review generator. It did not produce an acceptable complete magazine grip. No experimental pose has replaced the saved checkpoint or been integrated into the reload.

**The movement finding**

The old contact sample was near an edge of the thumb padding, not the broad pulp center. Its normal differed by about 57 degrees from the independently measured broad padded surface. The original X curl bent toward that edge and passed the old sign test while looking like a sideways fold relative to the broader pulp.

The revised controls derive the flex axis from the segment direction crossed with the broad pad's transverse normal. In the existing bone-local frames, the positive axes are:

| Joint | Local flex axis |
|---|---|
| MCP | `(-0.1496623, -0.000000018, -0.9887372)` |
| IP | `(-0.0208323, 0.000000033, -0.9997830)` |

These change pose controls. Joint positions, bone lengths, rest rolls, body geometry, weights and UVs are unchanged. No Rigify regeneration or Preserve Volume substitution was used.

The intended-pulp interpretation is supported by the broad glove surface, neutral renders and the resulting movement, rather than by glove color alone. It is an authored functional interpretation, not a claim of complete anatomical certification.

![Same thumb and joint placement, different MCP control axes](/Users/dimitri2/Desktop/clawdstrike/assets/source/ak47/exports/review-2026-09-09/run-01/bend-direction-comparison.png)

**Diagnostic evidence**

- The derived controls bend into the palm and toward the broad pulp in isolated 35-degree tests.
- At 65/65 degrees, distal width changes from 17.22 to 17.15 mm and depth remains about 20.155 mm. The body stays rounded; inner reinforcement folds still need finish review.
- A direct pinch reaches 0.429 mm separation between fixed pad proxies. This demonstrates functional reach, not complete collision-free contact.
- Corresponding mirrored right-hand body tests pass the unchanged 0.01 mm tolerance. Maximum coordinate error is 0.0000334 mm.
- Restoring the diagnostic copy reproduces its starting geometry exactly.
- Aligning the derived hinge plane with the proposed magazine wrap uses CMC orientations about 39–41 degrees from the modeled rest orientation, compared with about 93 degrees in the prior wrap trial. These quaternion distances are descriptive, not clinical joint limits.

[Derived-axis and pinch measurements](/Users/dimitri2/Desktop/clawdstrike/assets/source/ak47/exports/review-2026-09-09/run-01/diagnostics/axis-comparison/diagnostics.json) · [Mirrored control](/Users/dimitri2/Desktop/clawdstrike/assets/source/ak47/exports/review-2026-09-09/run-01/diagnostics/axis-comparison/mirrored-body-control.json)

**The controlled batch**

All eight combinations use the same source, derived hinge axes, geometry, weights, materials, measurement regions and bounded finger-fitting method.

- P0 retains the current palm placement; P1 translates the complete left-arm pose 15 mm rearward, avoiding a stretched wrist.
- C0 is the calibrated opposition frame; C1 adds 15 degrees about the metacarpal's own length axis.
- F0 uses MCP/IP 55/45 degrees; F1 uses 45/55 degrees.

An unchanged control and an independent repeat accompany the eight cases. Evaluated geometry, left pose and protected-state records repeat exactly. Every official case shares the same baseline, manifest and worker-script hashes. Individual final evaluations took approximately 11–14 seconds, with two Blender processes running concurrently. Rendering used a single queue.

Two fitting biases were corrected during worker validation, then the entire batch was repeated with one shared final method. The fitter now starts from the accepted finger poses and contacts, and calibrates its proximity guides to the accepted spacing instead of imposing generic targets. Earlier validation outputs are preserved separately and are not mixed into the final comparison.

**Results**

| Case | Factors | Broad-pulp qualifying coverage | Affected triangle area across glove layers | Finger surface-intersection triangles |
|---|---|---:|---:|---:|
| 01 | P0 C0 F0 | 0% | 1,634.4 mm² | 0 |
| 02 | P0 C0 F1 | 0% | 1,637.7 mm² | 0 |
| 03 | P0 C1 F0 | 0% | 1,600.2 mm² | 0 |
| 04 | P0 C1 F1 | 0% | 1,583.6 mm² | 0 |
| 05 | P1 C0 F0 | 6.3% | 955.3 mm² | 27 |
| 06 | P1 C0 F1 | 0% | 935.6 mm² | 27 |
| 07 | P1 C1 F0 | 0% | 979.9 mm² | 27 |
| 08 | P1 C1 F1 | 0% | 946.7 mm² | 27 |

Coverage means pad triangle centroids within 1.5 mm of the far face and with opposing-normal alignment at least 0.8. It is an engineering screen, not a visual approval threshold. Affected area sums whole intersected triangles across garment layers, includes possible tangency, and is not penetration volume or unique damaged area. Marker-target displacement is also not a finger-pad surface gap.

The placement factor has the largest measured effect. The rearward cases average 954.4 mm² affected area, versus 1,614.0 mm² for the unshifted far-wrap cases, approximately 41% lower. The CMC and flex-distribution factors have much smaller effects within this tested range. This supports investigating hand stance further; it does not prove an optimum.

At P0, the final fitter keeps the accepted marker contacts within 0.032 mm and introduces no reported finger/weapon triangle intersections. P1 retains marker displacements of approximately 2.3–4.9 mm, some joint bounds are active, and its fits stall. The resulting contact locations must be judged from surfaces and renders. These solver outcomes do not prove that all rearward placements are impossible.

Case 05 is the strongest contact lead, with a connected qualifying pulp patch of about 15.84 mm². Case 06 has the lowest affected-area metric but no qualifying pulp patch. Neither is selected: both retain palm/web and thumb contact problems, and the visible thumb-base hook and glove contour need improvement.

![Matched back-side comparison](/Users/dimitri2/Desktop/clawdstrike/assets/source/ak47/exports/review-2026-09-09/run-01/comparison-back.png)

[Palm-side comparison](/Users/dimitri2/Desktop/clawdstrike/assets/source/ak47/exports/review-2026-09-09/run-01/comparison-palm.png) · [Gameplay-camera comparison](/Users/dimitri2/Desktop/clawdstrike/assets/source/ak47/exports/review-2026-09-09/run-01/comparison-gameplay.png) · [CSV measurements](/Users/dimitri2/Desktop/clawdstrike/assets/source/ak47/exports/review-2026-09-09/run-01/comparison.csv)

The gameplay views are Blender renders using the reconstructed runtime camera and reload transform. They are not new in-game captures or exported-asset verification.

**Measurement and preservation checks**

The source magazine has 587 unpaired edges after diagnostic welding. Nearest-face signed offsets are therefore labeled as guidance. The measurement module performs explicit triangle narrowphase after BVH culling and writes actual cross-section segments; its six small geometric checks cover crossing, coplanar, tangent, degenerate and disjoint cases. Triangle intersections are still reviewed visually to distinguish touching from crossing.

The sampled pulp region, bind coordinates and source centroids are fixed across cases. Protected checks cover mesh coordinates, topology, weights, UVs, material assignments, object transforms, rest bones, right-hand pose and action curves. The source file hashes remain:

- Canonical `ak47.blend`: `9acc1f46af78f2266c1516a5f7f2807169a61994dd0f29e56d8649e5e893fdbe`
- Saved review checkpoint: `7dd9bb95b29947d692720b512f02bbf13e9bd1dce430f8f8544099d6c37af73f`

No production source, runtime GLB, gameplay code or reload timing was changed. The legacy `reload.py` has not been rerun. Its integration should consume the reviewed grip and corrected control convention only after static review.

**Review boundary and next hypothesis**

This round stops with the comparison evidence. The control-direction change is useful and should be retained for subsequent experiments. The eight static poses are diagnostic results, not approved replacements.

The next targeted comparison should change whole-hand stance and permit finger contacts to move within valid magazine surface bands. A pure rearward translation with fixed landmark targets is too narrow to establish the best grip. Keep the derived thumb controls and current proportions fixed; do not resume arbitrary tip curl or redesign the entire hand without a demonstrated need. Glove cleanup should follow a viable static stance, and reload integration remains after static approval.

Review copies: [Case 05](/Users/dimitri2/Desktop/clawdstrike/assets/source/ak47/exports/review-2026-09-09/run-01/case-05-review.blend) · [Case 06](/Users/dimitri2/Desktop/clawdstrike/assets/source/ak47/exports/review-2026-09-09/run-01/case-06-review.blend). Their actions are retained and left-hand tracks remain muted for static inspection.

**Reproduction**

The frozen baseline is `/tmp/thumb-doe-20260909/baseline.blend`, copied byte-for-byte from the saved review checkpoint. Restore that exact copy if temporary files have been cleared. `prepare.py`, run inside Blender on that copy, regenerates the frozen manifest and finger references. The source diagnostic script no longer depends on the previous temporary candidate JSON.

From the repository root, the existing frozen batch can be repeated with:

```sh
python3 assets/source/ak47/exports/review-2026-09-09/run.py
python3 assets/source/ak47/exports/review-2026-09-09/run.py --render control case-01 case-02 case-03 case-04 case-05 case-06 case-07 case-08
python3 assets/source/ak47/exports/review-2026-09-09/summarize.py
```

The runner overwrites only its generated per-case review outputs. It launches independent Blender processes; it never installs an asset or saves the original live scene. Repeating the experiment requires an execution environment in which Blender can start; sandboxed startup on this machine crashed, while the authorized external launches succeeded.
