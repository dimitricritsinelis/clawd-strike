**CHANGES REQUIRED — Game Studio Map Design discipline**

Reviewed: **BZ-04 / R2-building-first**  
Package SHA256: `a5ed1304b5bd49163cf9547b441d41bd28a1845d1c2016ada923eb19d596f821`

All **193 controlled file hashes match**. Source/runtime map hashes also match the recorded baseline. No frozen-package drift detected.

Two blocking findings:

1. **Textile display frames exceed their prescribed arch profiles.** In [design.json](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/design.json:10796), `G_T_E_ARCH2.instanceLayout.parts[top-rail]` reaches absolute z **2.49 m** at along offsets ±0.90 m; the SD-11 opening profile there reaches only **2.079 m**. Likewise, `G_T_E_ARCH3.parts[head]` reaches **2.39 m** at ±0.87 m against **2.088 m** clearance. The [issued elevation](</Users/dimitri2/Desktop/clawdstrike/artifacts/bazaar-doc-revamp/review-images/textile_arcade-elevations.png>) visibly draws these frames across the arch surrounds. No larger cavity behind the arch is defined to resolve this. **Remedy:** coordinate the frame, goods and opening envelopes, or explicitly design the deeper cavity and resulting occlusion. Update the elevations/sections and check against the curved opening, not only its rectangular bounding box.

2. **Issued boundary elevations omit their designed composition.** `design.json::areas[SERVICE_NORTH].faces[east].parcels[sn-es/sn-et/sn-en].structuralGrid` specifies BC-01; Tea’s west boundary uses it too. [Details §7](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/details.md:115) requires **0.32 m piers, 0.045 m recessed fields, a 0.60 m base and 0.50 m upper band**. The [Service North elevation](</Users/dimitri2/Desktop/clawdstrike/artifacts/bazaar-doc-revamp/review-images/service_north-elevations.png>) instead shows unarticulated fields. This prevents review of the intended untextured composition across a dominant long route wall. **Remedy:** depict the authored BC-01 geometry in the affected plans/elevations, with a representative section and correct grade contact.

The broader direction is materially stronger: complete building hierarchies, closed shop semantics, restrained activity pockets, protected transitions and explicit retirement phasing. The stored failed B before/after sheets confirm why replacing only its entrance wings was insufficient; R2 addresses the dominant perimeter.

The four read-only design/building/roof/camera checks passed. They do not detect the findings above.

Implementation-stage conditions remain appropriately concrete in [integration.md](/Users/dimitri2/Desktop/clawdstrike/docs/map-design/construction/integration.md:62): verify coordinate fixtures and shared ownership; preserve matched before/after cameras with reverse, turning and elevated context; test exported triangles and actual runtime colliders; measure material response, separate-model draw/shadow costs and desktop/mobile performance. Those later tests establish implemented quality and support user art acceptance. They are not prerequisites for document approval once these document defects are corrected.

No files edited, assets regenerated, game launched or agents spawned.

