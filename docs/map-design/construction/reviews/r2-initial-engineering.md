**ENGINEERING: CHANGES REQUIRED**

Reviewed BZ-04 / R2-building-first package SHA256:
`a5ed1304b5bd49163cf9547b441d41bd28a1845d1c2016ada923eb19d596f821`

All 193 controlled files match. No frozen-package changes detected.

1. **Roof ownership references are broken.** Every one of the 103 `areas[].roofCellIds` references in [design.json](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/design.json:3114) is unresolved against the current 78-cell schedule. This is more than zero-padding: current `ROOF_CELL_078` combines Textile, Tea Ramp, and Tea Terrace sources. Its building owner does not establish an installation owner for those phases. **Remedy:** reconcile cell IDs, assign each cell or explicit slice to one output unit, and update interface dependencies, bounds, and allocations. Validate this mapping against [integration.md §4](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/integration.md:58).

2. **Two arched shop displays lack resolved clearance.** In [G_T_E_ARCH2](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/design.json:10697), the frame reaches absolute z=2.49 at along offset ±0.90; SD-11’s arch permits approximately z=2.079 there. [G_T_E_ARCH3](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/design.json:10925) similarly reaches z=2.39 where its arch permits approximately z=2.088. The elevation draws these frames across the arch shoulders. Group-box containment does not resolve their fit against the shaped reveal. **Remedy:** dimension the actual recess section and receiver geometry, then either revise the fixed frames or explicitly establish a larger rear cavity and correct the drawn occlusion. Leave no cavity invention or stock resizing to construction.

3. **Graded wall bases have conflicting definitions.** `tr-w-lower-field` and `ts-w-lower-field` specify absolute z=0..0.30 despite the 0..1.40 floor profiles. Their current elevations visibly draw horizontal material fields below the sloping wall base. **Remedy:** reconcile these [material regions](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/design.json:24322) with the scheduled base detail and actual floor profile, including clipping in the drawings.

Verified: fresh runtime-derived coverage matches the frozen survey, excluding timestamp; both baseline spec hashes match; document/building validators, five negative fixtures, roof/camera reproducibility, and 174 in-memory generated-document comparisons pass. Actual references and all 25 zone elevation images were inspected.

Implementation-stage conditions remain narrowly as scheduled: verify coordinate fixtures, loader metadata propagation, material/shadow behavior, producer retirement, exported triangle clearances, unchanged colliders, and measured game performance. Those checks do not require a shipped map for document approval; the three unresolved document defects above do prevent handoff approval.