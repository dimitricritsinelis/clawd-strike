import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Box3, Group, Mesh, type Material, type MeshStandardMaterial, type Object3D } from "three";
import { applyWallShaderTweaks } from "../../render/materials/applyWallShaderTweaks";
import type { WallMaterialLibrary, WallTextureQuality } from "../../render/materials/WallMaterialLibrary";
import type { PropModelLibrary } from "../../render/models/PropModelLibrary";
import { deriveSubSeed } from "../../utils/Rng";
import { designToWorldVec3, designYawDegToWorldYawRad } from "../world/coordinateTransforms";
import type { RuntimeAuthoredPlacement, RuntimeSectionModel } from "../spec/types";
import { resolveAuthoredWallShaderProfile } from "../walls/wallShaderProfiles";

export type PackMaterialBinding = {
  wallMaterials: WallMaterialLibrary | null;
  quality: WallTextureQuality;
  seed: number;
};

/**
 * High-tier relief: per-unit bz07 finishes embed their pack source's normal map
 * untouched at 1k. When the 2k tier is active, bind the same photograph at 2k
 * (already served by the wall pack) instead of re-baking every GLB. Albedo and
 * ARM stay on their calibrated bakes. Clones keep glTF's flipY=false so the
 * authored UVs map identically.
 */
function upgradeSourceNormal(material: MeshStandardMaterial, binding: PackMaterialBinding, done: WeakSet<object>): void {
  const library = binding.wallMaterials;
  const sourceId = material.userData.bz07SourceMaterial;
  if (!library || binding.quality !== "2k" || done.has(material) || !material.normalMap || typeof sourceId !== "string") return;
  if (!library.getMaterialIds().includes(sourceId)) return;
  done.add(material);
  const embedded = material.normalMap;
  library.loadTextureSet(sourceId, "2k").then((set) => {
    if (material.normalMap !== embedded) return;
    const normal = set.normal.clone();
    normal.flipY = embedded.flipY;
    normal.wrapS = embedded.wrapS;
    normal.wrapT = embedded.wrapT;
    normal.channel = embedded.channel;
    normal.needsUpdate = true;
    material.normalMap = normal;
  }).catch(() => undefined);
}

const upgradedNormals = new WeakSet<object>();

/**
 * Authored GLBs ship without textures. A mesh material named after a wall-pack id
 * (`ph_*`, from assets/source/facade_materials.py) is swapped for the kit's own
 * material: same textures, tint, dirt band and macro variation as the kit walls,
 * shared in memory instead of packed per asset.
 */
function rebindPackMaterials(
  root: Object3D,
  binding: PackMaterialBinding,
  floorTopY: number,
): void {
  const library = binding.wallMaterials;
  if (!library) return;
  const ids = new Set(library.getMaterialIds());
  const cache = new Map<string, MeshStandardMaterial>();
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!(mesh as { isMesh?: boolean }).isMesh) return;
    const swap = (material: Material): Material => {
      const id = (material.name ?? "").split(".")[0] ?? "";
      const sourceId = material.userData.bz04SourceMaterial;
      if (id.startsWith("bz06_") && typeof sourceId === "string" && sourceId.startsWith("ph_bz04_")) {
        let derived = cache.get(id);
        if (!derived) {
          derived = material.clone() as MeshStandardMaterial;
          // The calibrated albedo and COLOR_0 already contain the selected paint.
          // Add the approved source macro once without rebinding or tinting it.
          applyWallShaderTweaks(derived, {
            albedoBoost: 1,
            macroSeed: deriveSubSeed(binding.seed, `authored:${sourceId}`),
            tileSizeM: Number(material.userData.tileSizeM),
            floorTopY,
            ...resolveAuthoredWallShaderProfile(sourceId),
          });
          cache.set(id, derived);
        }
        return derived;
      }
      if (!ids.has(id)) {
        if ((material as MeshStandardMaterial).isMeshStandardMaterial) upgradeSourceNormal(material as MeshStandardMaterial, binding, upgradedNormals);
        return material;
      }
      let replacement = cache.get(id);
      if (!replacement) {
        replacement = library.createStandardMaterial(id, binding.quality);
        replacement.name = id;
        if (id.startsWith("ph_bz04_")) replacement.vertexColors = true;
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
          ...resolveAuthoredWallShaderProfile(id),
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
    const declared = model.userData.bz04VisualBounds;
    if (declared) validateSectionBounds(model, section.modelId);
    else {
    if (_bbox.min.y < -0.05) {
      console.warn(`[section-models] '${section.modelId}' dips ${(-_bbox.min.y).toFixed(2)} m below the zone floor; author z=0 at the floor.`);
    }
    const slack = 1.5;
    if (_bbox.min.x < -slack || _bbox.max.x > section.sizeM.width + slack || _bbox.min.z < -slack || _bbox.max.z > section.sizeM.depth + slack) {
      console.warn(`[section-models] '${section.modelId}' extends beyond ${section.zoneId}'s rect (${section.sizeM.width} x ${section.sizeM.depth} m) by more than ${slack} m; check the Frame origin and plan axes.`);
    }
    }
    const origin = designToWorldVec3(section.origin);
    model.position.set(origin.x, origin.y, origin.z);
    rebindPackMaterials(model, binding, origin.y);
    root.add(model);
  }
  return root;
}

/**
 * Mounts free render-only GLBs from area packages: balconies, roof furniture,
 * skyline massing, props. Design metres with the model's base centre at
 * `position`; the GLB is authored Y-up with its front along +Z, as facades are.
 */
export function buildAuthoredPlacements(placements: readonly RuntimeAuthoredPlacement[], library: PropModelLibrary, binding: PackMaterialBinding): Group {
  const root = new Group();
  root.name = "map-authored-placements";
  for (const placement of placements) {
    if (!library.hasModel(placement.modelId)) {
      console.warn(`[authored-placements] '${placement.modelId}' for ${placement.id} is not loaded`);
      continue;
    }
    const model = library.instantiate(placement.modelId);
    model.name = `${placement.role}:${placement.id}`;
    _bbox.setFromObject(model);
    if (Math.abs(_bbox.min.y) > 0.05) {
      console.warn(`[authored-placements] '${placement.modelId}' base sits at y=${_bbox.min.y.toFixed(2)}; author the origin at the model's base.`);
    }
    const origin = designToWorldVec3(placement.position);
    model.position.set(origin.x, origin.y, origin.z);
    model.rotation.y = designYawDegToWorldYawRad(placement.yawDeg);
    rebindPackMaterials(model, binding, origin.y);
    root.add(model);
  }
  // Roof bundles share scanned materials and static transforms. Keep their
  // provenance before merging by exact attribute signature and shadow class.
  const batches = new Map<string, { material: Material; shadow: boolean; geometry: import("three").BufferGeometry[]; contributors: string[] }>();
  let roofPhaseAllowance = 0;
  for (const model of [...root.children]) {
    if (!model.userData.bz04RoofBundle) continue;
    const allowance = model.userData.bz04RoofPhasePrimitiveAllowance ?? 0;
    if (!Number.isInteger(allowance) || allowance < 0) throw new Error("Invalid per-area roof primitive allowance");
    roofPhaseAllowance += allowance;
    validateSectionBounds(library.instantiate(placements.find(p => model.name.endsWith(p.id))!.modelId), model.name);
    model.updateMatrixWorld(true);
    model.traverse(node => {
      if (!(node instanceof Mesh) || Array.isArray(node.material)) return;
      const signature = Object.entries((node.geometry as import("three").BufferGeometry).attributes).map(([k,v]) => `${k}:${v.itemSize}:${v.normalized}`).sort().join("|");
      // Blender may suffix an identical alias across files. The reduced-detail
      // mobile path keeps embedded materials instead of rebinding the pack.
      const materialId = node.material.name.split(".")[0];
      const key = `${materialId}:${node.castShadow}:${signature}`;
      const batch: { material: Material; shadow: boolean; geometry: import("three").BufferGeometry[]; contributors: string[] } = batches.get(key) ?? { material: node.material, shadow: node.castShadow, geometry: [], contributors: [] };
      batch.geometry.push(node.geometry.clone().applyMatrix4(node.matrixWorld));
      batch.contributors.push(model.userData.bz04RoofBundle);
      batches.set(key,batch);
    });
    root.remove(model);
  }
  for (const [key,batch] of batches) {
    const geometry = mergeGeometries(batch.geometry, false);
    if (!geometry) throw new Error(`BZ-04 roof batching failed: ${key}`);
    const mesh = new Mesh(geometry,batch.material);
    mesh.name = `bz04-roof-batch:${key}`; mesh.castShadow=batch.shadow; mesh.receiveShadow=true;
    mesh.userData.bz04Contributors=[...new Set(batch.contributors)]; root.add(mesh);
    for (const source of batch.geometry) source.dispose();
  }
  // Construction retains measured costs; performance acceptance is a later task.
  root.userData.bz04RoofPrimitiveCounts = { actual: batches.size, planning: 11, phasedAreaAllowance: roofPhaseAllowance, performanceDeferred: true };
  return root;
}

export function validateSectionBounds(model: Object3D, id: string): void {
  const value = model.userData.bz04VisualBounds;
  if (!value || !Array.isArray(value.min) || !Array.isArray(value.max)
      || value.min.length !== 3 || value.max.length !== 3
      || ![...value.min,...value.max].every(Number.isFinite)) throw new Error(`Missing or invalid BZ-04 bounds: ${id}`);
  const actual = new Box3().setFromObject(model);
  for (let i=0;i<3;i++) {
    if (value.min[i] > value.max[i] || actual.min.getComponent(i)<value.min[i]-.002 || actual.max.getComponent(i)>value.max[i]+.002)
      throw new Error(`BZ-04 bounds mismatch: ${id}`);
  }
}

const _bbox = new Box3();
