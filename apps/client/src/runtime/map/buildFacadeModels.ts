import { Box3, Group, type Material, type Mesh, type MeshStandardMaterial, type Object3D, Vector3 } from "three";
import { applyWallShaderTweaks } from "../render/materials/applyWallShaderTweaks";
import type { WallMaterialLibrary, WallTextureQuality } from "../render/materials/WallMaterialLibrary";
import type { PropModelLibrary } from "../render/models/PropModelLibrary";
import { deriveSubSeed } from "../utils/Rng";
import { designToWorldVec3 } from "./coordinateTransforms";
import type { RuntimeSectionModel } from "./types";
import type { FacadeModelPlacement } from "./v3Architecture";
import { resolveWallShaderProfile } from "./wallShaderProfiles";

export type PackMaterialBinding = {
  wallMaterials: WallMaterialLibrary | null;
  quality: WallTextureQuality;
  seed: number;
};

/**
 * Authored GLBs ship without textures. A mesh material named after a wall-pack id
 * (`ph_*`, from assets/source/facade_materials.py) is swapped for the kit's own
 * material: same textures, tint, dirt band and macro variation as the kit walls,
 * shared in memory instead of packed per asset.
 */
function rebindPackMaterials(root: Object3D, binding: PackMaterialBinding, floorTopY: number): void {
  const library = binding.wallMaterials;
  if (!library) return;
  const ids = new Set(library.getMaterialIds());
  const cache = new Map<string, MeshStandardMaterial>();
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!(mesh as { isMesh?: boolean }).isMesh) return;
    const swap = (material: Material): Material => {
      const id = (material.name ?? "").split(".")[0] ?? "";
      if (!ids.has(id)) return material;
      let replacement = cache.get(id);
      if (!replacement) {
        replacement = library.createStandardMaterial(id, binding.quality);
        const albedoBoost = typeof replacement.userData.wallAlbedoBoost === "number" ? replacement.userData.wallAlbedoBoost : 1;
        applyWallShaderTweaks(replacement, {
          albedoBoost,
          macroColorAmplitude: 0.08,
          macroRoughnessAmplitude: 0.05,
          macroFrequency: 0.18,
          macroSeed: deriveSubSeed(binding.seed, `authored:${id}`),
          tileSizeM: library.getTileSizeM(id),
          dirtEnabled: true,
          floorTopY,
          dirtHeightM: 1.5,
          dirtDarken: 0.22,
          dirtRoughnessBoost: 0.12,
          ...resolveWallShaderProfile(id, "detail"),
        });
        cache.set(id, replacement);
      }
      return replacement;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
}

/**
 * Mounts authored zone section GLBs. Authoring frame (assets/source/facade_kit.py
 * Frame): plan x east, plan y north, origin at the zone rect's south-west corner
 * on the zone floor, exported Y-up with plan north along glTF -Z, which the
 * design-to-world mapping turns into +Z north with no rotation here.
 */
export function buildSectionModels(models: readonly RuntimeSectionModel[], library: PropModelLibrary, binding: PackMaterialBinding): Group {
  const root = new Group();
  root.name = "map-section-models";
  for (const section of models) {
    if (!library.hasModel(section.modelId)) {
      console.warn(`[section-models] '${section.modelId}' for ${section.zoneId} is not loaded; the kit shells render bare`);
      continue;
    }
    const model = library.instantiate(section.modelId);
    model.name = `section:${section.zoneId}`;
    _bbox.setFromObject(model);
    if (_bbox.min.y < -0.05) {
      console.warn(`[section-models] '${section.modelId}' dips ${(-_bbox.min.y).toFixed(2)} m below the zone floor; author z=0 at the floor.`);
    }
    const slack = 1.5;
    if (_bbox.min.x < -slack || _bbox.max.x > section.sizeM.width + slack || _bbox.min.z < -slack || _bbox.max.z > section.sizeM.depth + slack) {
      console.warn(`[section-models] '${section.modelId}' extends beyond ${section.zoneId}'s rect (${section.sizeM.width} x ${section.sizeM.depth} m) by more than ${slack} m; check the Frame origin and plan axes.`);
    }
    const origin = designToWorldVec3(section.origin);
    model.position.set(origin.x, origin.y, origin.z);
    rebindPackMaterials(model, binding, origin.y);
    root.add(model);
  }
  return root;
}

const _bbox = new Box3();
const _size = new Vector3();

/**
 * Mounts authored facade GLBs on their frontage's street-facing wall plane.
 *
 * GLB convention (Blender build.py: metres, Z up, front -Y, rear plane Y=0,
 * exported with export_yup): origin at the bottom-center of the wall plane,
 * +X to the viewer's right when standing in the street facing the wall,
 * +Z out of the wall toward the street, +Y up. The kit keeps the wall mass,
 * roof and collision; the GLB owns everything visible on the face.
 */
export function buildFacadeModels(
  placements: readonly FacadeModelPlacement[],
  library: PropModelLibrary,
  binding: PackMaterialBinding,
): Group {
  const root = new Group();
  root.name = "map-facade-models";
  for (const placement of placements) {
    if (!library.hasModel(placement.modelId)) {
      console.warn(`[facade-models] '${placement.modelId}' for ${placement.frontageId} is not loaded; its wall shell renders bare`);
      continue;
    }
    const model = library.instantiate(placement.modelId);
    model.name = `facade:${placement.frontageId}`;
    // Measure in the asset's own frame before placing it, so the checks read
    // the authored width and base regardless of the frontage's orientation.
    _bbox.setFromObject(model);
    _bbox.getSize(_size);
    if (Math.abs(_size.x - placement.widthM) > placement.widthM * 0.05) {
      console.warn(`[facade-models] '${placement.modelId}' is ${_size.x.toFixed(2)} m wide; ${placement.frontageId} is ${placement.widthM.toFixed(2)} m. Model the frontage length, do not scale.`);
    }
    if (Math.abs(_bbox.min.y) > 0.05) {
      console.warn(`[facade-models] '${placement.modelId}' base sits at y=${_bbox.min.y.toFixed(2)}; author the origin at the bottom of the wall plane.`);
    }
    // Relief is render-only and never collides, so deep relief below head height
    // is geometry the player walks through. Coarse whole-asset check.
    if (_bbox.max.z > 0.35 && _bbox.min.y < 2.2) {
      console.warn(`[facade-models] '${placement.modelId}' protrudes ${_bbox.max.z.toFixed(2)} m into the street; keep relief below 2.2 m within 0.35 m of the wall or move it above head height.`);
    }
    model.position.set(placement.base.x, placement.base.y, placement.base.z);
    // Rotate the asset's +Z (its front) onto the wall's street-facing direction.
    model.rotation.y = Math.atan2(placement.inward.x, placement.inward.z);
    rebindPackMaterials(model, binding, placement.base.y);
    root.add(model);
  }
  return root;
}
