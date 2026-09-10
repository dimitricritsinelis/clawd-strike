# Bazaar selected materials and asset evidence

**The R6 material decisions remain in the active R7 engineering source.** R7 corrects upper-window composition independently of offset ground access. The selected sources, colors, texture repeats and material recipes are unchanged. The game and original source assets were not changed by this documentation task.

## Current review documents

- [R7 complete visual atlas](../../output/pdf/bazaar-r7-complete-visual-atlas.pdf): all areas, measured opening schedules, perspectives, roof and skyline context.
- [Selected material specification](../../output/pdf/bazaar-material-review.pdf): current palette, source comparisons, owner/paving map, horizontal-ground and shaded-accent comparisons, linen/trim close samples, retained models and local wear.
- [Active engineering source](../../docs/map-design/construction/design.json) and [generated material schedule](../../docs/map-design/construction/runtime-materials.md): the exact construction authority.
- [R6 material selection](../bazaar-r6-design-review/material-selection.md), [selected numerical recipes](r6-selected-materials.json), [field mapping](../bazaar-r6-design-review/material-field-mapping.json) and [material verification](../bazaar-r6-design-review/material-verification.json).

## Selected changes

- All 58 building/assembly owners, 25 floors, 15 background targets and the backlot ground have a selected material assignment. Real owner finishes wrap their adjoining faces; existing construction bands and property joints remain meaningful.
- Sand plaster uses the quieter existing plaster source. Public flags are somewhat darker than the wall fields and use one 2.4 m repeat. Service paving remains a separate related family. No mandatory dark stripe is added around every building.
- Teal `#5d9c8a` and indigo `#53799f` increase chroma while retaining their previous approximate lightness. They stay on existing assigned joinery. Only the existing Spice shade `SHADE_S_W_SHOP_1` changes to muted rust; other shades remain cream and existing stock colors are retained.
- Fine domestic linen uses the existing hessian source at 0.09 m repeat and normal strength 0.10. Shade/sackcloth uses 0.27 m and normal 0.18. Both have an explicit neutral-grain and calibrated vertex-color path, so cream is not multiplied into rust or other stock colors twice.
- One-piece stone sills, threshold caps and straight trim use the exact mortar-free crop and normal-correct mirrored maps. Masonry arch rings retain coherent voussoir joints. The original source images and provenance remain unchanged.
- Minor plaster erosion, repairs, threshold wear and sand are tied to actual use and the existing scheduled receivers. There is no new spout, scatter, dirt quota or second procedural macro mask.
- Material recipe modes, export names and crop requirements are included in the area handoff. Installed aliases, URL texture reuse and static roof batching are reused; the implementing agent does not repeat that setup.

## Evidence and limits

The R6 samples show vertical walls against horizontal paving, the prior and selected accents under a shared hood, and close-scale cloth/timber/trim. They demonstrate selected source treatment and scale. They are not the shipped game lighting, final gameplay readability or frame-time proof. Existing runtime macro variation is omitted from the controlled samples and must not be added a second time during implementation.

The retained basket, barrel, ceramic pot and crate renders use their actual existing source models. The patterned Project-Original rug remains unmodified. Most complete R6 district models are not built. A source inventory does not establish visual approval of a nonexistent finished assembly.

The earlier inventory measured 84 installed wall/floor IDs resolving to 38 source triplets and 40.54 MB redundant embedded-image bytes across 37 Bazaar GLBs, including legacy/superseded models. Those figures are baseline disk inventories, not active GPU memory or guaranteed savings. The 177-record texture provenance audit and selected source-hash checks are separate from model and game verification. No texture-compression rollout or FPS improvement is claimed.

## Historical review evidence

The following files record the review that led to R6. Their old palette values, unresolved-item statements and source hashes are historical; the active R6 source and selected numerical recipes supersede them.

- [Material art review](material-art-review.md) and [original owner/floor proposal](material-art-proposal.json).
- [Original joinery/shade/stock proposal](accent-assignments-proposal.md), with [machine-readable rows](accent-assignments-proposal.json). R6 supersedes the two joinery color values while retaining owner assignments.
- [Wear and transition rationale](wear-and-transitions-proposal.md), with [receiver records](wear-and-transitions-proposal.json). Current source carries this bounded intent beside the unchanged exact treatment geometry.
- [Original background proposal](background-material-proposal.json).
- [Engineering review](engineering-review.md), [inventory](inventory.json), [embedded-image duplication](embedded-images.json), [old palette footprint](palette-footprint.json) and [provenance audit](provenance-check.json).
- [Asset/model readiness review](asset-model-review.md) and [measured model costs](model-costs.json).
- [Earlier experimental swatches](calibrated-swatches.json) and [earlier coupon notes](material-panel-notes.json).
- [Conditional source leads](conditional-source-candidates.json): neither was downloaded or required for the selected R6 treatments.

Implementation remains: build the complete named area from its frozen handoff, perform one consolidated end review, correct observed defects and rerun affected checks. These documents do not authorize a whole-map build or a new approval ladder.
