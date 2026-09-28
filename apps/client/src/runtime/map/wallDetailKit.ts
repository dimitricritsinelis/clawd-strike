import {
  BoxGeometry,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { applyWallShaderTweaks } from "../render/materials/applyWallShaderTweaks";
import { DeterministicRng, deriveSubSeed } from "../utils/Rng";
import { resolveWallShaderProfile } from "./wallShaderProfiles";
import { createFacadeWallShellGeometry } from "./wallDetailFamilies/facadeShells";
import { createPlinthTrimGeometry } from "./wallDetailFamilies/structuralTrims";
import {
  applyKitPlasterFinish,
  createWallDetailMaterialBank,
  type KitPbrMaterialOptions,
} from "./wallDetailFamilies/kitMaterials";
import type {
  BuildWallDetailMeshesOptions,
  DetailTemplate,
  WallDetailInstance,
  WallDetailMeshId,
} from "./wallDetailFamilies/kitCore";
export type {
  BuildWallDetailMeshesOptions,
  WallDetailInstance,
  WallDetailMeshId,
} from "./wallDetailFamilies/kitCore";

const WALL_DETAIL_RENDER_ORDER = 10;

/** Plinth trim samples the sandstone trim when its own material is missing,
 * and always projects its texture in world metres. */
const STONE_TRIM = { materialId: "ph_stone_trim_sandstone", roughness: 0.86, metalness: 0.01 } as const;

type DetailBucket = {
  meshId: WallDetailMeshId;
  materialId: string | null;
  uvProjection: "world" | "default";
  instances: WallDetailInstance[];
};

function resolveKitPbrOptions(
  options: BuildWallDetailMeshesOptions,
): KitPbrMaterialOptions | undefined {
  if (options.wallMode !== "pbr" || !options.wallMaterials) return undefined;
  return {
    wallMaterials: options.wallMaterials,
    quality: options.quality,
    seed: options.seed,
  };
}

function createTemplates(
  options: BuildWallDetailMeshesOptions,
): Record<WallDetailMeshId, DetailTemplate> {
  const { stonePrimary, stoneTrim, roofBitumen } = createWallDetailMaterialBank(resolveKitPbrOptions(options));
  return {
    plinth_strip: {
      geometry: createPlinthTrimGeometry(),
      material: stoneTrim,
    },
    facade_wall_shell: {
      geometry: createFacadeWallShellGeometry(),
      material: stonePrimary,
    },
    roof_slab: {
      geometry: new BoxGeometry(1, 1, 1),
      material: roofBitumen,
    },
  };
}

function resolveMaterialUvOffset(seed: number, materialId: string): { x: number; y: number } {
  const offsetSeed = deriveSubSeed(seed, `wall-uvoffset:${materialId}`);
  const offsetRng = new DeterministicRng(offsetSeed);
  return {
    x: offsetRng.int(0, 4),
    y: offsetRng.int(0, 4),
  };
}

function resolveSemanticClass(meshId: WallDetailMeshId): string {
  if (meshId === "facade_wall_shell") return "massing";
  if (meshId === "roof_slab") return "roof";
  return "facade_module";
}

function createDetailMesh(
  name: string,
  template: DetailTemplate,
  material: MeshStandardMaterial,
  meshId: WallDetailMeshId,
  instances: readonly WallDetailInstance[],
  materialMode: "blockout" | "pbr",
  uvProjection: "world" | "default",
): InstancedMesh {
  const mesh = new InstancedMesh(template.geometry, material, instances.length);
  mesh.name = name;
  // Surface trim receives shadow but does not cast it.
  mesh.castShadow = meshId !== "plinth_strip";
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.renderOrder = WALL_DETAIL_RENDER_ORDER;
  const shadowMode = mesh.castShadow ? "cast" : "receive";
  mesh.userData.visualQa = {
    moduleId: meshId,
    semanticClass: resolveSemanticClass(meshId),
    representation: "module",
    materialMode,
    shadowMode,
    ...(materialMode === "pbr" ? { uvProjection } : {}),
  };
  mesh.userData.visualQaInstances = instances.map((instance, index) => ({
    placementId: instance.placementId ?? `${name}:${index}`,
    moduleId: instance.moduleId ?? meshId,
    semanticClass: instance.semanticClass ?? resolveSemanticClass(meshId),
    representation: "module",
    materialMode,
    groundedGapM: 0,
    dimensions: { x: instance.scale.x, y: instance.scale.y, z: instance.scale.z },
    uvProjection,
    shadowMode,
  }));

  const dummy = new Object3D();
  for (let index = 0; index < instances.length; index += 1) {
    const instance = instances[index]!;
    dummy.position.set(instance.position.x, instance.position.y, instance.position.z);
    dummy.rotation.set(instance.pitchRad ?? 0, instance.yawRad, instance.rollRad ?? 0);
    dummy.scale.set(instance.scale.x, instance.scale.y, instance.scale.z);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function buildBlockoutDetailMeshes(
  instances: readonly WallDetailInstance[],
  templates: Record<WallDetailMeshId, DetailTemplate>,
  root: Group,
): void {
  const grouped = new Map<WallDetailMeshId, WallDetailInstance[]>();
  for (const instance of instances) {
    const existing = grouped.get(instance.meshId);
    if (existing) existing.push(instance);
    else grouped.set(instance.meshId, [instance]);
  }
  for (const [meshId, bucketInstances] of grouped) {
    const template = templates[meshId];
    root.add(createDetailMesh(
      `wall-detail-${meshId}`,
      template,
      template.material,
      meshId,
      bucketInstances,
      "blockout",
      "default",
    ));
  }
}

function buildPbrDetailMeshes(
  instances: readonly WallDetailInstance[],
  templates: Record<WallDetailMeshId, DetailTemplate>,
  root: Group,
  options: BuildWallDetailMeshesOptions,
): void {
  const wallMaterials = options.wallMaterials;
  if (!wallMaterials) return;

  const materialIds = wallMaterials.getMaterialIds();
  if (materialIds.length === 0) return;
  const fallbackMaterialId = materialIds[0]!;
  const availableMaterialIds = new Set(materialIds);

  const grouped = new Map<string, DetailBucket>();
  for (const instance of instances) {
    const isTrim = instance.meshId === "plinth_strip";
    const preferred = instance.trimMaterialId ?? instance.wallMaterialId;
    // Wall shells and trim inherit the first wall-pack material when their own
    // is missing; a roof slab falls back to its template material.
    const materialId = preferred && availableMaterialIds.has(preferred)
      ? preferred
      : isTrim && availableMaterialIds.has(STONE_TRIM.materialId)
        ? STONE_TRIM.materialId
        : instance.meshId !== "roof_slab"
          ? fallbackMaterialId
          : null;
    const uvProjection = isTrim && materialId ? "world" : "default";
    const key = `${instance.meshId}|${materialId ?? "template"}|${uvProjection}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.instances.push(instance);
      continue;
    }
    grouped.set(key, { meshId: instance.meshId, materialId, uvProjection, instances: [instance] });
  }

  const surfaceMaterialCache = new Map<string, MeshStandardMaterial>();
  const getSurfaceMaterial = (materialId: string, meshId: WallDetailMeshId): MeshStandardMaterial => {
    const cacheKey = `${materialId}|${meshId}`;
    const cached = surfaceMaterialCache.get(cacheKey);
    if (cached) return cached;

    const material = wallMaterials.createStandardMaterial(materialId, options.quality);
    material.userData.wallDetailPbrMaterialId = materialId;
    if (meshId === "plinth_strip") {
      material.roughness = STONE_TRIM.roughness;
      material.metalness = STONE_TRIM.metalness;
      material.userData.detailMaterialRole = "stone-trim";
    }
    const albedoBoost =
      typeof material.userData.wallAlbedoBoost === "number" && Number.isFinite(material.userData.wallAlbedoBoost)
        ? material.userData.wallAlbedoBoost
        : 1;
    material.emissive.setHex(0x000000);
    material.emissiveIntensity = 0;
    material.emissiveMap = null;
    applyWallShaderTweaks(material, {
      albedoBoost,
      macroColorAmplitude: 0.08,
      macroRoughnessAmplitude: 0.05,
      macroFrequency: 0.18,
      macroSeed: deriveSubSeed(options.seed, `wall-macro:${materialId}`),
      tileSizeM: wallMaterials.getTileSizeM(materialId),
      uvOffset: resolveMaterialUvOffset(options.seed, materialId),
      dirtEnabled: true,
      floorTopY: 0,
      dirtHeightM: 1.5,
      dirtDarken: 0.22,
      dirtRoughnessBoost: 0.12,
      // The wall shell is the building's wall plane, so it takes the wall
      // profile's streaks, chips and repairs; trim and roofs are detail.
      ...resolveWallShaderProfile(materialId, meshId === "facade_wall_shell" ? "wall" : "detail"),
    });
    if (meshId === "facade_wall_shell") applyKitPlasterFinish(material);
    if (meshId === "plinth_strip") {
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      material.polygonOffsetUnits = -1;
      material.needsUpdate = true;
    }
    surfaceMaterialCache.set(cacheKey, material);
    return material;
  };

  for (const bucket of grouped.values()) {
    const template = templates[bucket.meshId];
    const material = bucket.materialId
      ? getSurfaceMaterial(bucket.materialId, bucket.meshId)
      : template.material;
    if (bucket.uvProjection === "world") {
      // Manifest surfaces run through applyWallShaderTweaks, whose vertex
      // projection derives UVs from world position.
      material.userData.wallUvProjection = "world";
    }
    root.add(createDetailMesh(
      `wall-detail-${bucket.meshId}-${bucket.materialId ?? "template"}`,
      template,
      material,
      bucket.meshId,
      bucket.instances,
      "pbr",
      bucket.uvProjection,
    ));
  }
}

export function buildWallDetailMeshes(
  instances: readonly WallDetailInstance[],
  options: BuildWallDetailMeshesOptions,
): Group {
  const root = new Group();
  root.name = "map-wall-details";
  if (instances.length === 0) {
    return root;
  }

  const templates = createTemplates(options);
  if (options.wallMode !== "pbr" || !options.wallMaterials) {
    buildBlockoutDetailMeshes(instances, templates, root);
    return root;
  }

  buildPbrDetailMeshes(instances, templates, root, options);
  return root;
}
