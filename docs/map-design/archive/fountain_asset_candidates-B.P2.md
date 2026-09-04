Audience: implementation-agent
Authority: archive
Read when: tracing the retired roadmap's fountain work, or hunting CC0 fountain/water sources
Owns: the completed B.P2 scouting record (CC0 source list, superseded constraints)
Do not use for: active instructions — B.P2 shipped and its budgets/bans are superseded
Last updated: 2026-08-16

> **Archived.** Roadmap card B.P2 was completed and the roadmap retired. The constraint
> lines below (restyle ban, 1.6M scene cap, per-asset tri/texture caps) reflect that era's
> budgets and are NOT current policy. Current procedure lives in the
> [map-polish skill](../../../.claude/skills/map-polish/SKILL.md); current design proposals live in the
> [development plan](../development-plan/README.md). The current user task owns scope and status; the CC0 source list remains historical evidence.

# B.P2 fountain asset scouting brief

Goal: replace the procedural extrusion fountain (capability ceiling, 5 failed restyle rounds — restyling is BANNED) with a modeled asset + real water material. This brief pre-answers the search so B.P2 starts at evaluation, not discovery.

## Where to hunt (in order)

1. Sketchfab — search "fountain", filters: Downloadable + License = CC0. Verify EACH candidate's license badge says CC0 on its own page before downloading; most fountain results are CC-BY (attribution) or worse — those are NOT usable under the repo's CC0-only rule. https://sketchfab.com/tags/fountain
2. OpenGameArt — https://opengameart.org, filter license = CC0, search "fountain". Quality varies; check tri count.
3. Kenney / Quaternius CC0 packs — game-ready and license-safe but stylized low-poly; acceptable only if the read at SHOT_16 closeup survives (likely too toylike — treat as last resort before fallback).
4. Poly Haven — checked 2026-07-14: models/structures has NO standalone fountain (only fountains inside HDRIs). Do not spend time here; their stone/rock models MAY serve as basin trim garnish. https://polyhaven.com/models
5. ambientCG — mostly materials, occasionally models; good source for the glazed-tile + worn-stone PBR textures if retexturing a candidate.

## Hard constraints for any candidate (fail any = reject)

- License: CC0 ONLY. Record source URL + license + MD5 in the owning pack manifest (AGENTS.md provenance rule).
- Format: GLTF/GLB preferred (props pipeline already loads GLTF under `apps/client/public/assets/models/environment/bazaar/props/`); OBJ/FBX acceptable only with a conversion step noted in provenance.
- Budget: <= ~40k triangles (scene cap is 1.6M total — the hero gets <= ~3%); textures <= 2K, PBR maps (baseColor + normal + roughness/ORM). Draw calls: single-digit after material merge.
- Fit: multi-tier Levantine/Mediterranean stone fountain, footprint ~3-4.5 m, silhouette reads at SHOT_03 distance (~20 m) AND survives SHOT_16 closeup (carved/curved profiles, weathered edges — not straight extrusions).
- Integration: keep the EXISTING center, envelope, and legacy collider exactly (card constraint) — the model is render-only; scale to the envelope, never move it.

## Water material spec (in-engine, not from the asset)

- Transparent disc/annulus with normal-map scroll or two offset ripple normals; specular highlight from the sun direction; slight fresnel; NO opaque emissive cyan (the banned look).
- Basin interior gets a darker wet-stone tint below the waterline; contact ring (subtle foam/ripple ring) where jets land.
- Keep it one material, no per-frame CPU work; a scrolling-normal PBR material is enough at these cameras.

## Fallback if no asset passes (acceptable, pre-approved)

Procedural is allowed ONLY as a lathe-profile rebuild: curved swept tier profiles (LatheGeometry-style), carved-edge normal detail, glazed-tile inlay bands — i.e., new curved geometry, not another re-texture of the existing stacked extrusions. Same budget and water spec apply.
