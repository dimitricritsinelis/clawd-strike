# enemy_raider — source art and derivation

Shipping asset: `apps/client/public/assets/models/characters/enemy_raider/model.glb`

## Files here

| File | Tris | Textures | Purpose |
| --- | --- | --- | --- |
| `model_source_4k.glb` | 24,986 | 4096² | Original export (tripo3d.ai). Never ship this. |
| `model_lod_7k5.glb` | 7,492 | 4096² | Offline decimation of the source. Geometry donor. |

## How the shipping asset is derived

The shipping `model.glb` is **LOD geometry + 1k textures**:

- geometry, normals and UVs from `model_lod_7k5.glb`
- the three 1024² JPEG maps (Color / ORM / NormalGL) downscaled from `model_source_4k.glb`

Both derive from the same export, so the image names, material structure and UV
layout match and the 1k maps land correctly on the reduced mesh.

This combination matters. The two offline passes — decimation and texture
downscale — were originally run separately and never combined, so for a while
the shipped asset carried the source's 24,986 triangles *with* the 1k textures:
the texture win without the geometry win. At 10 enemies per wave that is
~250k triangles instead of ~75k.

Result: 7,492 tris, 1024² maps, 587 KB (was 1,133 KB).

## Rules

- Runtime decimation is forbidden. three's `SimplifyModifier` tears UV seams
  open and shreds the silhouette — it previously produced see-through enemies.
  All reduction happens offline, here.
- `MODEL_MAX_TRIS_WARN` in `apps/client/src/runtime/enemies/EnemyVisual.ts` is a
  ratchet and must stay just **above** whatever ships. A threshold at or above
  the shipping asset can never fire; that is how a 30,000 limit sat uselessly
  over a 24,986-tri model for a whole release cycle.
- After any re-export, verify the bounding box still matches the previous asset.
  `MODEL_TARGET_HEIGHT_M` scales the model by its bounds, so a changed envelope
  silently shifts the visual away from the collision box and the aim heights
  enemies shoot at.
- `art-source/` is excluded from the deploy by `.vercelignore`; it affects
  repository size only.
