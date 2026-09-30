import { atmosphereAppliesTo } from "../atmosphere/buildStreetAtmosphere";
import { buildWallFootClutter } from "../atmosphere/buildWallFootClutter";
import {
  Box3,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
  Vector3,
} from "three";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import type { RuntimeColliderAabb } from "../../sim/collision/WorldColliders";
import type { PropModelLibrary } from "../../render/models/PropModelLibrary";
import { resolveRuntimeSeed } from "../../utils/Rng";
import { designToWorldVec3, designYawDegToWorldYawRad, type WorldVec3 } from "../world/coordinateTransforms";
import type {
  RuntimeAnchorsSpec,
  RuntimeBlockoutSpec,
  RuntimeDressingPlacement,
  RuntimeRect,
} from "../spec/types";
import { buildAuthoredPropColliders } from "./authoredColliders";
import { createCoverCrateGeometry, createCoverTarpGeometry, createUnitRopeGeometry } from "./families/coverDressing";
import {
  FOUNTAIN_REFERENCE_DIAMETER_M,
  FOUNTAIN_STONE_MATERIAL_ID,
  FOUNTAIN_VISUAL_HEIGHT_M,
  FOUNTAIN_WATER_MATERIAL_INPUTS,
  createFountainBronzeGeometry,
  createFountainCourtAccentGeometry,
  createFountainDetailGeometry,
  createFountainRippleNormalTexture,
  createFountainWaterGeometry,
  createModularFountainStoneGeometry,
  createModularFountainTileGeometry,
} from "./families/fountain";
import {
  BAZAAR_STRIPED_CLOTH_TEXTURE_URL,
  createBatch,
  createGlazedFountainTileTexture,
  loadTiledTexture,
  type InstanceBatch,
  type InstanceSpec,
  type PropPlacementKind,
} from "./families/propsCore";
import { createGroundRugGeometry } from "./families/textilesWallArt";

const CLEAR_ZONE_EPSILON = 0.0001;
const BOUNDS_EPSILON = 0.0001;
const GAP_RULE_MIN_PASSAGE_M = 1.7;

function stablePlacementVariantSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export type PropsBuildStats = {
  seed: number;
  candidatesTotal: number;
  collidersPlaced: number;
  rejectedClearZone: number;
  rejectedBounds: number;
  rejectedGapRule: number;
};

export type PropsBuildResult = {
  root: Group;
  colliders: RuntimeColliderAabb[];
  stats: PropsBuildStats;
  renderedAnchorIds: string[];
  renderedPlacements: RenderedPropPlacement[];
};

export type RenderedPropPlacement = {
  placementId: string;
  anchorId: string;
  assetId: string;
  moduleId: string;
  semanticClass: string;
  representation: "model" | "module" | "procedural-proxy" | "placeholder";
  materialMode: "pbr" | "standard" | "unlit" | "debug";
  center: { x: number; y: number; z: number };
  dimensionsM: { width: number; depth: number; height: number };
  groundingGapM: number;
  shadowMode: "cast_receive" | "cast_only" | "receive_only" | "none";
};

export type BuildPropsOptions = {
  mapId: string;
  blockout: RuntimeBlockoutSpec;
  anchors: RuntimeAnchorsSpec;
  seedOverride: number | null;
  propModels: PropModelLibrary | null;
};

function overlapsRect2d(collider: RuntimeColliderAabb, rect: RuntimeRect): boolean {
  const minX = collider.min.x + CLEAR_ZONE_EPSILON;
  const maxX = collider.max.x - CLEAR_ZONE_EPSILON;
  const minZ = collider.min.z + CLEAR_ZONE_EPSILON;
  const maxZ = collider.max.z - CLEAR_ZONE_EPSILON;

  if (maxX <= rect.x || minX >= rect.x + rect.w) return false;
  if (maxZ <= rect.y || minZ >= rect.y + rect.h) return false;
  return true;
}

function overlapLength(minA: number, maxA: number, minB: number, maxB: number): number {
  return Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
}

const HANGING_KINDS = new Set<PropPlacementKind>([
  "canopy",
  "serviceDoor",
  "signage",
  "heroLintel",
  "lantern",
]);

const RUG_MODEL_IDS = new Set<string>([
  "pp_rug",
  "pp_round_rug",
  "pp_rug_rectangle",
]);

function applyRenderStabilityTweaks(
  model: Group,
  kind: PropPlacementKind,
  modelId: string,
): void {
  const isRugLike = RUG_MODEL_IDS.has(modelId) || kind === "thresholdRug";
  const isHanging = HANGING_KINDS.has(kind);

  model.traverse((node) => {
    const mesh = node as {
      isMesh?: boolean;
      castShadow?: boolean;
      receiveShadow?: boolean;
      frustumCulled?: boolean;
      material?: unknown;
    };
    if (!mesh.isMesh) return;

    mesh.frustumCulled = true;

    if (isRugLike || isHanging || kind === "filler") {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material || typeof material !== "object") continue;
      const stableMaterial = material as {
        transparent?: boolean;
        depthWrite?: boolean;
        side?: number;
        polygonOffset?: boolean;
        polygonOffsetFactor?: number;
        polygonOffsetUnits?: number;
        needsUpdate?: boolean;
      };

      if (isRugLike) {
        stableMaterial.polygonOffset = true;
        stableMaterial.polygonOffsetFactor = -1;
        stableMaterial.polygonOffsetUnits = -1;
      }

      if (isHanging && stableMaterial.transparent === true) {
        stableMaterial.depthWrite = false;
      }

      if (kind === "canopy") {
        stableMaterial.side = DoubleSide;
      }

      stableMaterial.needsUpdate = true;
    }
  });
}

function applyShadowPolicy(
  model: Group,
  policy: RuntimeDressingPlacement["shadowPolicy"],
): void {
  const castShadow = policy === "cast_receive";
  const receiveShadow = policy === "cast_receive" || policy === "receive_only";
  model.traverse((node) => {
    const mesh = node as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
    if (!mesh.isMesh) return;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
  });
}

/**
 * A batch that declares `vertexColors` gets its per-instance tint through the
 * vertex color channel. Procedural geometry that never authored a `color`
 * attribute then samples the WebGL default — black — which multiplies both the
 * texture and the authored tint to zero. That is what renders the cover-goods
 * tarp as an untextured black wedge instead of striped cloth.
 */
function ensureBatchVertexColors(geometry: BufferGeometry, vertexColors: boolean): BufferGeometry {
  if (!vertexColors || geometry.hasAttribute("color")) return geometry;
  const vertexCount = geometry.getAttribute("position").count;
  geometry.setAttribute("color", new Float32BufferAttribute(new Float32Array(vertexCount * 3).fill(1), 3));
  return geometry;
}

type CompiledDressingBuild = {
  root: Group;
  renderedPlacements: RenderedPropPlacement[];
  // Gameplay cover fitted to the rendered solid pieces, one box per piece, so
  // bullets and movement stop where the player sees goods rather than at an
  // envelope around them.
  colliders: RuntimeColliderAabb[];
};

type CompiledCollisionPiece = {
  placement: RuntimeDressingPlacement;
  source:
    | { kind: "instance"; batch: InstanceBatch; instance: InstanceSpec }
    | { kind: "object"; object: Object3D };
};

function instanceSharedStaticModelMeshes(
  root: Group,
  renderedPlacements: readonly RenderedPropPlacement[],
): void {
  const buckets = new Map<string, Mesh[]>();
  const canonicalPlacementByMesh = new WeakMap<Mesh, RenderedPropPlacement>();
  const preexistingInstancedPlacementIds = new Set<string>();
  root.traverse((object) => {
    const instances = object.userData.visualQaInstances;
    if (!Array.isArray(instances)) return;
    for (const instance of instances) {
      if (instance && typeof instance.placementId === "string") {
        preexistingInstancedPlacementIds.add(instance.placementId);
      }
    }
  });
  const renderedPlacementById = new Map(
    renderedPlacements
      .filter((placement) => (
        placement.representation === "model"
        && !preexistingInstancedPlacementIds.has(placement.placementId)
      ))
      .map((placement) => [placement.placementId, placement]),
  );
  const isShareableMesh = (object: Object3D): object is Mesh => {
    if (!(object instanceof Mesh) || object instanceof InstancedMesh) return false;
    if ((object as Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh) return false;
    if (Array.isArray(object.material)) return false;
    const morphAttributes = object.geometry.morphAttributes;
    return !Object.values(morphAttributes).some((attributes) => Array.isArray(attributes) && attributes.length > 0);
  };

  root.traverse((object) => {
    if (!object.name.startsWith("v3-dressing-")) return;
    const placement = renderedPlacementById.get(object.name.slice("v3-dressing-".length));
    if (!placement) return;
    let canonicalMesh: Mesh | null = null;
    object.traverse((child) => {
      if (!canonicalMesh && isShareableMesh(child)) canonicalMesh = child;
    });
    if (canonicalMesh) canonicalPlacementByMesh.set(canonicalMesh, placement);
  });
  root.updateMatrixWorld(true);

  root.traverse((object) => {
    if (!isShareableMesh(object)) return;
    const material = object.material;
    if (Array.isArray(material)) return;
    if (material.transparent && material.side === DoubleSide) {
      material.forceSinglePass = true;
      material.needsUpdate = true;
    }
    const key = [
      object.geometry.uuid,
      material.uuid,
      object.castShadow ? "cast" : "no-cast",
      object.receiveShadow ? "receive" : "no-receive",
      object.renderOrder,
    ].join("|");
    const bucket = buckets.get(key);
    if (bucket) bucket.push(object);
    else buckets.set(key, [object]);
  });

  const rootInverse = new Matrix4().copy(root.matrixWorld).invert();
  const localMatrix = new Matrix4();
  const simplifyModifier = new SimplifyModifier();
  const simplifiedGeometryCache = new Map<string, BufferGeometry>();
  const resolveRepeatedPropGeometry = (mesh: Mesh): BufferGeometry => {
    const name = mesh.name.toLowerCase();
    const keepRatio = name.includes("wicker_basket_02_base")
      ? 0.32
      : name.includes("wicker_basket_02_lid")
        ? 0.34
        : name.includes("wooden_crate_01")
          ? 0.45
          : name === "cube001"
            ? 0.5
            : name.includes("brass_pot_01") || name.includes("ceramic_pot")
              ? 0.72
              : name.includes("wine_barrel_01")
                ? 0.45
                : 1;
    if (keepRatio >= 1) return mesh.geometry;
    const cached = simplifiedGeometryCache.get(mesh.geometry.uuid);
    if (cached) return cached;
    const positions = mesh.geometry.getAttribute("position");
    const removeCount = Math.max(0, Math.floor(positions.count * (1 - keepRatio)));
    if (removeCount < 8) return mesh.geometry;
    const simplified = simplifyModifier.modify(mesh.geometry.clone(), removeCount);
    simplified.userData.sourceGeometryUuid = mesh.geometry.uuid;
    simplified.userData.lodKeepRatio = keepRatio;
    simplifiedGeometryCache.set(mesh.geometry.uuid, simplified);
    return simplified;
  };
  let batchIndex = 0;
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const first = meshes[0]!;
    if (Array.isArray(first.material)) continue;
    const batch = new InstancedMesh(resolveRepeatedPropGeometry(first), first.material, meshes.length);
    batch.name = `v3-shared-model-batch-${batchIndex++}-${first.name || "mesh"}`;
    const meshName = first.name.toLowerCase();
    const usesPrimaryGroundingShadow = !(
      meshName.includes("wicker_basket_02_lid")
      || meshName.includes("ceramic_pot")
      || meshName.includes("wooden_lantern_01_handle")
      || meshName.includes("painted_wooden_stool")
      || meshName === "cube001"
      || meshName === "cube004"
    );
    batch.castShadow = first.castShadow && usesPrimaryGroundingShadow;
    batch.receiveShadow = first.receiveShadow;
    batch.renderOrder = first.renderOrder;
    batch.frustumCulled = true;
    batch.userData.materialId = first.userData.materialId;
    const visualQaInstances = meshes.map((mesh) => {
      const placement = canonicalPlacementByMesh.get(mesh);
      if (!placement) return null;
      return {
        placementId: placement.placementId,
        anchorId: placement.anchorId,
        assetId: placement.assetId,
        moduleId: placement.moduleId,
        semanticClass: placement.semanticClass,
        representation: placement.representation,
        materialMode: placement.materialMode,
        groundingGapM: placement.groundingGapM,
        dimensions: {
          x: placement.dimensionsM.width,
          y: placement.dimensionsM.height,
          z: placement.dimensionsM.depth,
        },
        shadowMode: placement.shadowMode,
      };
    });
    if (visualQaInstances.some(Boolean)) batch.userData.visualQaInstances = visualQaInstances;
    for (let index = 0; index < meshes.length; index += 1) {
      const mesh = meshes[index]!;
      localMatrix.multiplyMatrices(rootInverse, mesh.matrixWorld);
      batch.setMatrixAt(index, localMatrix);
      mesh.parent?.remove(mesh);
    }
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingBox();
    batch.computeBoundingSphere();
    root.add(batch);
  }

  const pruneEmptyGroups = (parent: Object3D): void => {
    for (const child of [...parent.children]) {
      pruneEmptyGroups(child);
      if (child instanceof Group && child.children.length === 0) parent.remove(child);
    }
  };
  pruneEmptyGroups(root);
}

/**
 * Objects resting on the pavement have no ambient occlusion of their own: the
 * sun is high, so a shaded cluster casts almost nothing, and every crate, pot
 * and rug meets the flagstones on a hard unshaded seam that reads as a decal
 * pasted onto the ground. A soft radial occlusion quad under each grounded
 * dressing footprint supplies the contact the lighting rig cannot.
 */
function createGroundContactTexture(): DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size - 0.5;
      const ny = (y + 0.5) / size - 0.5;
      const radial = Math.min(1, Math.hypot(nx, ny) / 0.5);
      // Hold the occlusion across the footprint and release it over the outer
      // third, so the darkening still reads where an object actually meets the
      // ground instead of fading out before it clears the object's silhouette.
      // A real contact seam is dark and short: it holds full strength right up
      // to the silhouette and dies within a fraction of the object's own size.
      // A wide, weak apron only reads under a zoom and looks like a decal at
      // playing distance.
      const t = Math.max(0, Math.min(1, (1 - radial) / 0.28));
      const core = t * t * (3 - 2 * t);
      // Dust and sweepings gather in a broken ring around anything that has sat
      // still, so the outer falloff carries a little grain rather than fading
      // as a perfect circle.
      const drift = 0.88 + 0.12 * Math.sin(Math.atan2(ny, nx) * 5.5 + radial * 7.3);
      const alpha = Math.max(0, Math.min(0.82, core * 0.82 * drift));
      const offset = (y * size + x) * 4;
      data[offset] = 38;
      data[offset + 1] = 30;
      data[offset + 2] = 22;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.name = "prop-ground-contact-occlusion";
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createGroundContactGeometry(): BufferGeometry {
  const geometry = new PlaneGeometry(1, 1, 1, 1);
  geometry.rotateX(-Math.PI * 0.5);
  return geometry;
}

function buildCompiledDressing(
  options: BuildPropsOptions,
  placements: readonly RuntimeDressingPlacement[],
): CompiledDressingBuild {
  const root = new Group();
  root.name = "map-props-v3-compiled";
  const renderedPlacements: RenderedPropPlacement[] = [];
  const anchorTypeById = new Map(options.anchors.anchors.map((anchor) => [anchor.id, anchor.type.toLowerCase()]));
  const batches = {
    canopyEdgeRopes: createBatch("v3-canopy-edge-ropes", 0x96734d, "canopy", () => createUnitRopeGeometry("z"), {
      castShadow: false,
      roughness: 0.93,
    }),
    groundContact: createBatch("v3-prop-ground-contact", 0xffffff, "thresholdRug", createGroundContactGeometry, {
      castShadow: false,
      receiveShadow: false,
      roughness: 1,
      metalness: 0,
      albedoBoost: 1,
      textureGenerator: "prop-ground-contact",
    }),
    groundRug: createBatch("v3-main-lane-ground-rugs", 0xffffff, "thresholdRug", () => createGroundRugGeometry(0), {
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg",
      textureRepeat: [1.05, 1.35],
      roughness: 0.98,
      albedoBoost: 1.45,
    }),
    coverTarp: createBatch("v3-cover-goods-draped-tarp", 0xffffff, "thresholdRug", createCoverTarpGeometry, {
      castShadow: true,
      receiveShadow: true,
      doubleSided: true,
      textureUrl: BAZAAR_STRIPED_CLOTH_TEXTURE_URL,
      textureRepeat: [0.72, 0.72],
      roughness: 0.97,
      albedoBoost: 1.05,
      vertexColors: true,
    }),
    coverCrateHorizontal: createBatch("v3-cover-crate-horizontal-slat", 0xffffff, "filler", () => createCoverCrateGeometry(0), {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/rough_pine_door/rough_pine_door_arm_1k.jpg",
      textureRepeat: [1.6, 1.35],
      materialId: "ph_rough_pine_door",
      roughness: 0.9,
      normalScale: 0.34,
      // Crate albedo was left at the source texture's dim interior exposure, so
      // the bazaar's most repeated cover prop read as charcoal against sunlit
      // limestone. Lifted to the honey softwood the reference shows; the
      // texture, wear and normal response are unchanged.
      albedoBoost: 1.58,
      vertexColors: true,
    }),
    coverCratePainted: createBatch("v3-cover-crate-painted-vertical-slat", 0xffffff, "filler", () => createCoverCrateGeometry(1), {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/models/environment/bazaar/props/wooden_crate_02/textures/wooden_crate_02_diff_1k.jpg",
      normalTextureUrl: "/assets/models/environment/bazaar/props/wooden_crate_02/textures/wooden_crate_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/models/environment/bazaar/props/wooden_crate_02/textures/wooden_crate_02_arm_1k.jpg",
      textureRepeat: [1.1, 1.65],
      materialId: "ph_wooden_crate_02",
      roughness: 0.84,
      normalScale: 0.38,
      albedoBoost: 2.05,
      vertexColors: true,
    }),
    coverCrateBraced: createBatch("v3-cover-crate-diagonal-braced", 0xffffff, "filler", () => createCoverCrateGeometry(2), {
      castShadow: true,
      receiveShadow: true,
      textureUrl: "/assets/models/environment/bazaar/props/wooden_crate_01/textures/wooden_crate_01_diff_1k.jpg",
      normalTextureUrl: "/assets/models/environment/bazaar/props/wooden_crate_01/textures/wooden_crate_01_nor_gl_1k.jpg",
      armTextureUrl: "/assets/models/environment/bazaar/props/wooden_crate_01/textures/wooden_crate_01_arm_1k.jpg",
      textureRepeat: [1.45, 1.2],
      materialId: "ph_wooden_crate_01",
      roughness: 0.94,
      normalScale: 0.3,
      albedoBoost: 2.3,
      vertexColors: true,
    }),
    fountainStone: createBatch("v3-fountain-modular-stone", 0xd0bd9c, "fountainStone", createModularFountainStoneGeometry, {
      castShadow: true,
      receiveShadow: true,
      materialId: FOUNTAIN_STONE_MATERIAL_ID,
      textureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/white_sandstone_blocks_02/white_sandstone_blocks_02_arm_1k.jpg",
      textureRepeat: [3.1, 2.7],
      roughness: 0.9,
      normalScale: 0.38,
      albedoBoost: 0.82,
      vertexColors: true,
    }),
    fountainTile: createBatch("v3-fountain-glazed-tile-segments", 0xffead0, "fountainTile", createModularFountainTileGeometry, {
      receiveShadow: true,
      textureGenerator: "glazed-fountain-tile",
      roughness: 0.24,
      albedoBoost: 1,
      vertexColors: true,
      doubleSided: true,
    }),
    fountainDetails: createBatch("v3-fountain-damp-contact", 0xc8beaa, "fountainStone", createFountainDetailGeometry, {
      castShadow: false,
      receiveShadow: true,
      roughness: 0.58,
      metalness: 0,
      vertexColors: true,
    }),
    fountainWater: createBatch("v3-fountain-shallow-water", 0x2f7476, "fountainWater", createFountainWaterGeometry, {
      receiveShadow: true,
      materialStyle: "water",
      roughness: 0.12,
      metalness: 0.02,
    }),
    fountainBronze: createBatch("v3-fountain-bronze-spouts", 0x8f6332, "fountainTile", createFountainBronzeGeometry, {
      castShadow: true,
      roughness: 0.34,
      metalness: 0.68,
    }),
    // The apron is the court floor immediately around the basin, wetted by the
    // fountain — not a separate object set on top of it. It previously carried a
    // wall-block texture whose horizontal courses read as plank grain, over a
    // base tint darkened three times (base colour, then vertex tint, then
    // albedo boost), which landed it on a red-brown that belongs to no other
    // material in the court. It now uses the court's own paving at the court's
    // own world scale, held in the same hue and dropped in value the way damp
    // stone actually is.
    fountainCourtAccent: createBatch("v3-fountain-court-tile-apron", 0xd6c5a4, "thresholdRug", createFountainCourtAccentGeometry, {
      receiveShadow: true,
      // Damp stone is glossier than the dry court around it. Dropping value
      // alone reads as shade; the sheen is what says water.
      roughness: 0.62,
      textureUrl: "/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_diff_1k.jpg",
      normalTextureUrl: "/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_nor_gl_1k.jpg",
      armTextureUrl: "/assets/textures/environment/bazaar/floors/bazaar_floor_textures_pack_v4/court_flagstone_01/court_flagstone_01_arm_1k.jpg",
      // The apron geometry is world-UV'd at 1.25 m, so this repeat resolves the
      // 2.6 m coursed flagstone tile at the same size Fountain Court draws it.
      // North Court deliberately keeps the broader 4.4 m limestone grid; using
      // that scale here would collapse the two district floor identities again.
      // Any other
      // value makes the apron read as a different, smaller paving.
      textureRepeat: [0.4808, 0.4808],
      normalScale: 0.52,
      albedoBoost: 0.92,
      vertexColors: true,
    }),
  };

  const compiledBatches = Object.values(batches);
  const bbox = new Box3();

  const record = (
    placement: RuntimeDressingPlacement,
    representation: RenderedPropPlacement["representation"],
    center: { x: number; y: number; z: number },
  ): void => {
    renderedPlacements.push({
      placementId: placement.id,
      anchorId: placement.anchorId,
      assetId: placement.assetId,
      moduleId: placement.runtime.id,
      semanticClass: placement.semanticClass,
      representation,
      materialMode: "pbr",
      center,
      dimensionsM: placement.dimensionsM,
      groundingGapM: 0,
      shadowMode: placement.shadowPolicy,
    });
  };

  const pushLocalInstance = (
    batch: InstanceBatch,
    origin: WorldVec3,
    yawRad: number,
    local: { x: number; y: number; z: number; yaw?: number; tintHex?: number; visualQa?: InstanceSpec["visualQa"] },
    size: { x: number; y: number; z: number },
  ): InstanceSpec => {
    const cos = Math.cos(yawRad);
    const sin = Math.sin(yawRad);
    const instance: InstanceSpec = {
      x: origin.x + local.x * cos + local.z * sin,
      y: origin.y + local.y,
      z: origin.z - local.x * sin + local.z * cos,
      sx: size.x,
      sy: size.y,
      sz: size.z,
      yawRad: yawRad + (local.yaw ?? 0),
    };
    if (local.tintHex !== undefined) instance.tintHex = local.tintHex;
    if (local.visualQa) instance.visualQa = local.visualQa;
    batch.instances.push(instance);
    return instance;
  };

  const collisionPieces: CompiledCollisionPiece[] = [];
  // Only hard goods authored as gameplay cover block; rugs, baskets and pots in
  // the same cluster stay walk-through.
  const collidesAsCover = (placement: RuntimeDressingPlacement): boolean =>
    placement.classification === "gameplay_cover" && placement.semanticClass === "cover";

  const addPrefabModel = (
    parent: Group,
    modelId: string,
    local: { x: number; y: number; z: number; yaw: number },
    target: { x: number; y: number; z: number },
    shadowPolicy: RuntimeDressingPlacement["shadowPolicy"],
  ): Group => {
    if (!options.propModels?.hasModel(modelId)) {
      throw new Error(`[map-props] compiled prefab requires CC0 model '${modelId}'`);
    }
    const model = options.propModels.instantiate(modelId);
    model.updateMatrixWorld(true);
    bbox.setFromObject(model);
    const naturalSize = bbox.getSize(new Vector3());
    model.scale.set(
      target.x / Math.max(0.001, naturalSize.x),
      target.y / Math.max(0.001, naturalSize.y),
      target.z / Math.max(0.001, naturalSize.z),
    );
    model.updateMatrixWorld(true);
    bbox.setFromObject(model);
    model.position.x -= (bbox.min.x + bbox.max.x) * 0.5;
    model.position.z -= (bbox.min.z + bbox.max.z) * 0.5;
    model.position.y -= bbox.min.y;
    applyRenderStabilityTweaks(model, "filler", modelId);
    applyShadowPolicy(model, shadowPolicy);
    const itemRoot = new Group();
    itemRoot.name = `market-stall-goods-${modelId}`;
    itemRoot.position.set(local.x, local.y, local.z);
    itemRoot.rotation.y = local.yaw;
    itemRoot.add(model);
    parent.add(itemRoot);
    return itemRoot;
  };

  for (const placement of placements) {
    const world = designToWorldVec3(placement.position);
    const yawRad = designYawDegToWorldYawRad(placement.yawDeg);
    const { width, depth, height } = placement.dimensionsM;
    const anchorType = anchorTypeById.get(placement.anchorId) ?? "";
  const centeredAtAnchor = anchorType === "signage_anchor"
      || anchorType === "lantern_anchor"
      || anchorType === "cloth_canopy_span";
    const center = {
      x: world.x,
      y: centeredAtAnchor ? world.y : world.y + height * 0.5,
      z: world.z,
    };

    // Ground-resting dressing gets a contact-occlusion footprint. Overhead and
    // wall-mounted placements are excluded: they have nothing to sit on.
    //
    // The fountain keeps this even though it also authors its own wetted apron.
    // Removing it was tried and reverted: the generic disc is what actually
    // seats the basin, and without it the apron's own octagonal mesh edge
    // becomes a hard dashed outline on the floor — a straight high-frequency
    // artifact that, unlike an over-soft wash, does not fall off with distance.
    // A ground rug is already the contact plane: it receives the shadows from
    // the goods resting on it, while those goods retain their own compact
    // contact decals. Giving the low-profile textile another 1.55x footprint
    // stacks a broad rectangular wash beneath the whole cluster and exposes a
    // hard grey apron beyond the rug edge in close review.
    const isGroundRug = placement.runtime.id === "bazaar_ground_rug";
    if (!centeredAtAnchor && anchorType !== "window_anchor" && placement.classification !== "overhead" && !isGroundRug) {
      const footprintM = Math.max(width, depth);
      if (footprintM >= 0.34) {
        batches.groundContact.instances.push({
          x: world.x,
          y: world.y + 0.012,
          z: world.z,
          yawRad,
          sx: width * 1.55,
          sy: 1,
          sz: depth * 1.55,
        });
      }
    }

    if (placement.runtime.id === "bazaar_cover_goods") {
      const placementRoot = new Group();
      placementRoot.name = `v3-dressing-${placement.id}`;
      placementRoot.position.set(world.x, world.y, world.z);
      placementRoot.rotation.y = yawRad;
      const coverSeed = stablePlacementVariantSeed(`${placement.id}:cover-layout`);
      const coverVariant = coverSeed % 3;
      const mirror = coverVariant === 1 ? -1 : 1;
      const crateSpecs = [
        { x: mirror * -width * (0.22 + coverVariant * 0.025), y: 0, z: depth * (coverVariant === 2 ? -0.04 : 0.02), yaw: mirror * (0.035 + coverVariant * 0.035), width: width * (0.52 - coverVariant * 0.025), height: height * (0.38 + coverVariant * 0.018), depth: depth * 0.8, tintHex: [0xa99b88, 0x91aa9e, 0xb79a7c][coverVariant]! },
        // Tucked inboard and back of the sack it used to pass through. The
        // sack is the cluster's authored cover volume, so the crate moves
        // rather than the sack.
        { x: mirror * width * (0.24 + coverVariant * 0.02), y: 0, z: -depth * (0.36 - coverVariant * 0.03), yaw: mirror * (0.18 - coverVariant * 0.035), width: width * (0.26 + coverVariant * 0.016), height: height * (0.22 + coverVariant * 0.016), depth: depth * (0.44 + coverVariant * 0.04), tintHex: [0xd4bb91, 0xb9c9bd, 0xd0a77f][coverVariant]! },
        { x: mirror * width * (coverVariant === 2 ? 0.18 : -0.03), y: height * (0.39 + coverVariant * 0.018), z: depth * (coverVariant === 1 ? -0.08 : -0.02), yaw: mirror * (0.09 + coverVariant * 0.055), width: width * (0.36 + coverVariant * 0.025), height: height * (0.22 - coverVariant * 0.012), depth: depth * (0.52 - coverVariant * 0.035), tintHex: [0xb7d1c5, 0xc6a783, 0x9fb8ae][coverVariant]! },
      ];
      const crateBatches = [batches.coverCrateBraced, batches.coverCrateHorizontal, batches.coverCratePainted] as const;
      for (const [crateIndex, spec] of crateSpecs.entries()) {
        const crateBatch = crateBatches[(crateIndex + coverVariant) % crateBatches.length]!;
        const crateInstance = pushLocalInstance(
          crateBatch,
          world,
          yawRad,
          {
            x: spec.x,
            y: spec.y + spec.height * 0.5,
            z: spec.z,
            yaw: spec.yaw,
            tintHex: spec.tintHex,
            ...(crateIndex === 0 ? {
              visualQa: {
                placementId: placement.id,
                anchorId: placement.anchorId,
                assetId: placement.assetId,
                moduleId: placement.runtime.id,
                semanticClass: placement.semanticClass,
                representation: "module" as const,
                materialMode: "pbr" as const,
                groundedGapM: 0,
                dimensions: { x: width, y: height, z: depth },
                shadowMode: placement.shadowPolicy,
              },
            } : {}),
          },
          { x: spec.width, y: spec.height, z: spec.depth },
        );
        if (collidesAsCover(placement)) {
          collisionPieces.push({ placement, source: { kind: "instance", batch: crateBatch, instance: crateInstance } });
        }
      }
      for (const sack of [
        {
          x: mirror * width * (0.4 + coverVariant * 0.025),
          z: -depth * (0.24 - coverVariant * 0.045),
          yaw: mirror * (-0.12 - coverVariant * 0.06),
          scale: 0.29 + coverVariant * 0.025,
        },
      ]) {
        const sackRoot = addPrefabModel(
          placementRoot,
          "cc0_spice_sack",
          { x: sack.x, y: 0, z: sack.z, yaw: sack.yaw },
          { x: width * sack.scale, y: height * sack.scale * 1.15, z: depth * sack.scale * 1.9 },
          placement.shadowPolicy,
        );
        if (collidesAsCover(placement)) {
          collisionPieces.push({ placement, source: { kind: "object", object: sackRoot } });
        }
      }
      const tarpSupport = crateSpecs[2]!;
      const tarpScale = { x: width * 0.39, y: height * 0.32, z: depth * 0.55 };
      // The tarp surface is authored around local y=.18. Seat that datum on
      // the selected upper crate so its draped edges overlap a real support;
      // the former independent offset left variant 2 hovering 96 mm above the
      // lower crate and almost entirely beside the upper one.
      const tarpCenterX = tarpSupport.x;
      const tarpCenterY = tarpSupport.y + tarpSupport.height - tarpScale.y * 0.18;
      const tarpCenterZ = tarpSupport.z;
      pushLocalInstance(
        batches.coverTarp,
        world,
        yawRad,
        {
          x: tarpCenterX,
          y: tarpCenterY,
          z: tarpCenterZ,
          yaw: tarpSupport.yaw,
          tintHex: [0xd88f62, 0x78aaa0, 0xc6a04e][coverVariant]!,
        },
        tarpScale,
      );
      for (const side of [-1, 1] as const) {
        const tieX = tarpCenterX + side * width * 0.13;
        pushLocalInstance(
          batches.canopyEdgeRopes,
          world,
          yawRad,
          { x: tieX, y: tarpCenterY + height * 0.08, z: tarpCenterZ },
          { x: 0.014, y: 0.014, z: depth * 0.39 },
        );
      }
      root.add(placementRoot);
      record(placement, "model", center);
      continue;
    }

    if (placement.runtime.id === "bazaar_spawn_cover") {
      const crateModelId = "ph_wooden_crate_01";
      if (!options.propModels?.hasModel(crateModelId)) {
        throw new Error(`[map-props] CC0 spawn-cover crate is unavailable for placement '${placement.id}'`);
      }
      const placementRoot = new Group();
      placementRoot.name = `v3-spawn-cover-prefab-${placement.id}`;
      placementRoot.position.set(world.x, world.y, world.z);
      placementRoot.rotation.y = yawRad;
      const variant = [...placement.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2;
      const crateSpecs = [
        { width: width * 0.43, depth: depth * 0.88, height: height * 0.46, x: -width * 0.255, y: 0, z: depth * 0.035, yaw: variant === 0 ? -0.05 : 0.045 },
        { width: width * 0.43, depth: depth * 0.88, height: height * 0.46, x: width * 0.255, y: 0, z: -depth * 0.025, yaw: variant === 0 ? 0.045 : -0.05 },
        { width: width * 0.43, depth: depth * 0.82, height: height * 0.46, x: -width * 0.255, y: height * 0.52, z: -depth * 0.045, yaw: variant === 0 ? 0.065 : -0.06 },
        { width: width * 0.43, depth: depth * 0.82, height: height * 0.46, x: width * 0.255, y: height * 0.52, z: depth * 0.045, yaw: variant === 0 ? -0.06 : 0.065 },
      ];
      for (let index = 0; index < crateSpecs.length; index += 1) {
        const spec = crateSpecs[index]!;
        const model = options.propModels.instantiate(crateModelId);
        model.updateMatrixWorld(true);
        bbox.setFromObject(model);
        const naturalSize = bbox.getSize(new Vector3());
        model.scale.set(
          spec.width / Math.max(0.001, naturalSize.x),
          spec.height / Math.max(0.001, naturalSize.y),
          spec.depth / Math.max(0.001, naturalSize.z),
        );
        model.updateMatrixWorld(true);
        bbox.setFromObject(model);
        model.position.x -= (bbox.min.x + bbox.max.x) * 0.5;
        model.position.z -= (bbox.min.z + bbox.max.z) * 0.5;
        model.position.y -= bbox.min.y;
        applyRenderStabilityTweaks(model, "cover", crateModelId);
        applyShadowPolicy(model, placement.shadowPolicy);
        const crateRoot = new Group();
        crateRoot.name = `spawn-cover-crate-${index + 1}`;
        crateRoot.position.set(spec.x, spec.y, spec.z);
        crateRoot.rotation.y = spec.yaw;
        crateRoot.add(model);
        placementRoot.add(crateRoot);
        if (collidesAsCover(placement)) {
          collisionPieces.push({ placement, source: { kind: "object", object: crateRoot } });
        }
      }
      root.add(placementRoot);
      record(placement, "model", center);
      continue;
    }

    if (placement.runtime.mode === "model") {
      if (!options.propModels?.hasModel(placement.runtime.id)) {
        throw new Error(`[map-props] final asset '${placement.runtime.id}' is not loaded for placement '${placement.id}'`);
      }
      const model = options.propModels.instantiate(placement.runtime.id);
      model.scale.set(placement.scale.x, placement.scale.z, placement.scale.y);
      model.updateMatrixWorld(true);
      bbox.setFromObject(model);
      model.position.x -= (bbox.min.x + bbox.max.x) * 0.5;
      model.position.z -= (bbox.min.z + bbox.max.z) * 0.5;
      model.position.y -= centeredAtAnchor
        ? (bbox.min.y + bbox.max.y) * 0.5
        : bbox.min.y;
      applyRenderStabilityTweaks(model, placement.semanticClass === "lighting" ? "lantern" : "filler", placement.runtime.id);
      applyShadowPolicy(model, placement.shadowPolicy);
      const placementRoot = new Group();
      placementRoot.name = `v3-dressing-${placement.id}`;
      placementRoot.position.set(world.x, centeredAtAnchor ? world.y : world.y, world.z);
      placementRoot.rotation.y = yawRad;
      placementRoot.add(model);
      root.add(placementRoot);
      if (collidesAsCover(placement)) {
        collisionPieces.push({ placement, source: { kind: "object", object: placementRoot } });
      }
      record(placement, "model", center);
      continue;
    }

    switch (placement.runtime.id) {
      case "bazaar_ground_rug": {
        const rugSeed = stablePlacementVariantSeed(placement.id);
        // Two of these were a teal (0x73b7b0) and a sage green (0x8eb47c), which
        // put saturated cool mats on the ground of a warm sunlit bazaar. The
        // grounding closeup measured green-dominant pixels at 0.79% of frame
        // against 0.01% in its target - a 79x excess, and the single most
        // out-of-palette element in that view. Replaced with warm members so the
        // run still varies in value and hue without leaving the target's family.
        const rugTints = [0xffb783, 0x9c5f45, 0xd5a56f, 0xb66d58, 0xc39a63] as const;
        const rugAspect = [0.9, 0.96, 1, 1.06, 1.12][(rugSeed >>> 5) % 5]!;
        batches.groundRug.instances.push({
          x: center.x,
          y: world.y + 0.0175,
          z: center.z,
          sx: width * rugAspect,
          sy: 0.035,
          sz: depth / Math.sqrt(rugAspect),
          yawRad,
          tintHex: rugTints[rugSeed % rugTints.length]!,
        });
        break;
      }
      case "bazaar_fountain_octagonal": {
        const footprintScaleX = width / FOUNTAIN_REFERENCE_DIAMETER_M;
        const footprintScaleZ = depth / FOUNTAIN_REFERENCE_DIAMETER_M;
        const parts = [
          batches.fountainStone,
          batches.fountainTile,
          batches.fountainDetails,
          batches.fountainWater,
          batches.fountainBronze,
          batches.fountainCourtAccent,
        ];
        for (const batch of parts) {
          const instance: InstanceSpec = {
            x: world.x,
            y: world.y,
            z: world.z,
            sx: footprintScaleX,
            sy: 1,
            sz: footprintScaleZ,
            yawRad,
          };
          // The stone assembly owns placement telemetry so one authoritative
          // module represents the full four-material landmark in scene QA.
          if (batch === batches.fountainStone) {
            instance.visualQa = {
              placementId: placement.id,
              anchorId: placement.anchorId,
              assetId: placement.assetId,
              moduleId: placement.runtime.id,
              semanticClass: placement.semanticClass,
              representation: "module",
              materialMode: "pbr",
              groundedGapM: 0,
              dimensions: { x: width, y: FOUNTAIN_VISUAL_HEIGHT_M, z: depth },
              shadowMode: "cast_receive",
            };
          }
          batch.instances.push(instance);
        }
        break;
      }
      default:
        throw new Error(`[map-props] unsupported compiled dressing module '${placement.runtime.id}' for placement '${placement.id}'`);
    }
    record(placement, "module", center);
  }

  const dummy = new Object3D();
  const geometryByBatch = new Map<InstanceBatch, BufferGeometry>();
  for (const batch of compiledBatches) {
    if (batch.instances.length === 0) continue;
    const geometry = ensureBatchVertexColors(batch.createGeometry(), batch.vertexColors);
    geometryByBatch.set(batch, geometry);
    const textureMap = batch.textureUrl
      ? loadTiledTexture(batch.textureUrl, batch.textureRepeat)
      : batch.textureGenerator === "glazed-fountain-tile"
        ? createGlazedFountainTileTexture()
        : batch.textureGenerator === "prop-ground-contact"
          ? createGroundContactTexture()
          : null;
    const normalMap = batch.normalTextureUrl
      ? loadTiledTexture(batch.normalTextureUrl, batch.textureRepeat, "normal")
      : null;
    const armMap = batch.armTextureUrl
      ? loadTiledTexture(batch.armTextureUrl, batch.textureRepeat, "arm")
      : null;
    if (armMap && geometry.getAttribute("uv")) {
      const uv = geometry.getAttribute("uv");
      if (!geometry.getAttribute("uv1")) geometry.setAttribute("uv1", uv.clone());
      if (!geometry.getAttribute("uv2")) geometry.setAttribute("uv2", uv.clone());
    }
    const material = batch.materialStyle === "water"
      ? new MeshPhysicalMaterial({
        color: FOUNTAIN_WATER_MATERIAL_INPUTS.color,
        emissive: 0x000000,
        emissiveIntensity: FOUNTAIN_WATER_MATERIAL_INPUTS.emissiveIntensity,
        roughness: FOUNTAIN_WATER_MATERIAL_INPUTS.roughness,
        metalness: FOUNTAIN_WATER_MATERIAL_INPUTS.metalness,
        transmission: FOUNTAIN_WATER_MATERIAL_INPUTS.transmission,
        transparent: FOUNTAIN_WATER_MATERIAL_INPUTS.transparent,
        opacity: FOUNTAIN_WATER_MATERIAL_INPUTS.opacity,
        depthWrite: false,
        clearcoat: FOUNTAIN_WATER_MATERIAL_INPUTS.clearcoat,
        clearcoatRoughness: FOUNTAIN_WATER_MATERIAL_INPUTS.clearcoatRoughness,
        ior: FOUNTAIN_WATER_MATERIAL_INPUTS.ior,
        reflectivity: FOUNTAIN_WATER_MATERIAL_INPUTS.reflectivity,
        thickness: FOUNTAIN_WATER_MATERIAL_INPUTS.thickness,
        attenuationColor: FOUNTAIN_WATER_MATERIAL_INPUTS.attenuationColor,
        attenuationDistance: FOUNTAIN_WATER_MATERIAL_INPUTS.attenuationDistance,
        envMapIntensity: FOUNTAIN_WATER_MATERIAL_INPUTS.envMapIntensity,
        specularIntensity: FOUNTAIN_WATER_MATERIAL_INPUTS.specularIntensity,
        specularColor: FOUNTAIN_WATER_MATERIAL_INPUTS.specularColor,
        normalMap: createFountainRippleNormalTexture(),
      })
      : new MeshStandardMaterial({
        color: batch.color,
        map: textureMap,
        emissive: 0x000000,
        emissiveMap: null,
        emissiveIntensity: 0,
        normalMap,
        aoMap: armMap,
        roughnessMap: armMap,
        roughness: batch.roughness,
        metalness: batch.metalness,
        vertexColors: batch.vertexColors,
      });
    if (material instanceof MeshStandardMaterial && normalMap) {
      material.normalScale.set(batch.normalScale, batch.normalScale);
    }
    if (batch.materialStyle === "water" && material instanceof MeshPhysicalMaterial) {
      material.normalScale.set(
        FOUNTAIN_WATER_MATERIAL_INPUTS.normalScale,
        FOUNTAIN_WATER_MATERIAL_INPUTS.normalScale,
      );
      const baseOnBeforeCompile = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        baseOnBeforeCompile.call(material, shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <opaque_fragment>",
          `
            float fountainFresnel = pow(
              1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0),
              3.0
            );
            outgoingLight += vec3(0.38, 0.42, 0.40)
              * fountainFresnel
              * ${FOUNTAIN_WATER_MATERIAL_INPUTS.fresnelStrength.toFixed(2)};
            diffuseColor.a = mix(
              diffuseColor.a,
              min(0.52, diffuseColor.a + 0.18),
              fountainFresnel
            );
            #include <opaque_fragment>
          `,
        );
      };
      material.customProgramCacheKey = () => "fountain-water-fresnel-v1";
      material.userData.fountainWaterShader = {
        response: "view-dependent-fresnel",
        fresnelStrength: FOUNTAIN_WATER_MATERIAL_INPUTS.fresnelStrength,
        rippleNormal: "procedural-scrolling",
      };
    }
    if (batch.textureGenerator === "prop-ground-contact" && material instanceof MeshStandardMaterial) {
      material.transparent = true;
      material.depthWrite = false;
      material.alphaTest = 0.004;
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      material.polygonOffsetUnits = -3;
      material.needsUpdate = true;
    }
    // The fountain collar carries its fade in the alpha channel of its vertex
    // colours, which only reaches the frame through a blended material. Depth
    // writes stay off so the court paving keeps resolving through the thinning
    // edge instead of being punched out by it.
    if (batch.id === "v3-fountain-court-tile-apron" && material instanceof MeshStandardMaterial) {
      material.transparent = true;
      material.depthWrite = false;
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      material.polygonOffsetUnits = -2;
      material.needsUpdate = true;
    }
    if (material instanceof MeshStandardMaterial && batch.albedoBoost !== 1) {
      material.color.multiplyScalar(batch.albedoBoost);
    }
    if (material instanceof MeshStandardMaterial && armMap) {
      material.aoMapIntensity = 0.28;
    }
    material.userData.materialId = batch.materialId;
    material.userData.textureSet = {
      albedo: batch.textureUrl,
      normal: batch.normalTextureUrl,
      arm: batch.armTextureUrl,
    };
    if (batch.doubleSided) material.side = DoubleSide;
    const mesh = new InstancedMesh(geometry, material, batch.instances.length);
    mesh.name = batch.id;
    mesh.userData.materialId = batch.materialId;
    if (batch.materialStyle === "water" && material instanceof MeshPhysicalMaterial && material.normalMap) {
      let rippleFrame = 0;
      const rippleNormal = material.normalMap;
      mesh.onBeforeRender = () => {
        rippleFrame += 1;
        rippleNormal.offset.x = (
          rippleFrame * FOUNTAIN_WATER_MATERIAL_INPUTS.rippleScrollPerFrame.x
        ) % 1;
        rippleNormal.offset.y = (
          rippleFrame * FOUNTAIN_WATER_MATERIAL_INPUTS.rippleScrollPerFrame.y
        ) % 1;
      };
      mesh.userData.fountainWaterAnimation = {
        clock: "render-frame",
        scrollPerFrame: FOUNTAIN_WATER_MATERIAL_INPUTS.rippleScrollPerFrame,
      };
    }
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    for (let index = 0; index < batch.instances.length; index += 1) {
      const instance = batch.instances[index]!;
      dummy.position.set(instance.x, instance.y, instance.z);
      dummy.rotation.set(0, instance.yawRad, 0);
      dummy.scale.set(instance.sx, instance.sy, instance.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (typeof instance.tintHex === "number") mesh.setColorAt(index, new Color(instance.tintHex));
    }
    if (batch.instances.some((instance) => instance.visualQa)) {
      mesh.userData.visualQaInstances = batch.instances.map((instance) => instance.visualQa ?? null);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.frustumCulled = true;
    root.add(mesh);
  }

  // Measure before shared-model instancing detaches the prefab objects.
  root.updateMatrixWorld(true);
  const colliders: RuntimeColliderAabb[] = [];
  const pieceCountByAnchor = new Map<string, number>();
  const pieceBounds = new Box3();
  for (const piece of collisionPieces) {
    if (piece.source.kind === "object") {
      pieceBounds.setFromObject(piece.source.object, true);
    } else {
      const geometry = geometryByBatch.get(piece.source.batch)!;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const { instance } = piece.source;
      dummy.position.set(instance.x, instance.y, instance.z);
      dummy.rotation.set(0, instance.yawRad, 0);
      dummy.scale.set(instance.sx, instance.sy, instance.sz);
      dummy.updateMatrix();
      pieceBounds.copy(geometry.boundingBox!).applyMatrix4(dummy.matrix);
    }
    if (pieceBounds.isEmpty()) continue;
    const index = (pieceCountByAnchor.get(piece.placement.anchorId) ?? 0) + 1;
    pieceCountByAnchor.set(piece.placement.anchorId, index);
    colliders.push({
      id: `${piece.placement.anchorId}-cover-${index}`,
      kind: "prop",
      min: { x: pieceBounds.min.x, y: pieceBounds.min.y, z: pieceBounds.min.z },
      max: { x: pieceBounds.max.x, y: pieceBounds.max.y, z: pieceBounds.max.z },
    });
  }

  instanceSharedStaticModelMeshes(root, renderedPlacements);

  return { root, renderedPlacements, colliders };
}

export function buildProps(options: BuildPropsOptions): PropsBuildResult {
  const root = new Group();
  root.name = "map-props";
  const authoredColliders = buildAuthoredPropColliders(options.blockout, options.anchors);
  const stats: PropsBuildStats = {
    seed: resolveRuntimeSeed(options.mapId, options.seedOverride),
    candidatesTotal: 0,
    collidersPlaced: 0,
    rejectedClearZone: 0,
    rejectedBounds: 0,
    rejectedGapRule: 0,
  };

  const explicitClearTravelRects = options.blockout.zones
    .filter((zone) => zone.type === "clear_travel_zone")
    .map((zone) => zone.rect);
  const derivedClearTravelRects = options.blockout.zones
    .filter((zone) => typeof zone.clearWidthM === "number")
    .map((zone): RuntimeRect => {
      if (zone.type === "connector" || zone.type === "cut") return zone.rect;
      const clearWidthM = Math.min(zone.rect.w, zone.clearWidthM!);
      return {
        x: zone.rect.x + (zone.rect.w - clearWidthM) * 0.5,
        y: zone.rect.y,
        w: clearWidthM,
        h: zone.rect.h,
      };
    });
  const clearTravelRects = [...explicitClearTravelRects, ...derivedClearTravelRects];
  const narrowPassageRects = options.blockout.zones
    .filter((zone) => zone.type === "cut" || zone.type === "connector")
    .map((zone) => zone.rect);

  const boundary = options.blockout.playable_boundary;

  function rejectReason(collider: RuntimeColliderAabb): "clear" | "bounds" | "gap" | null {
    for (const rect of clearTravelRects) {
      if (overlapsRect2d(collider, rect)) {
        return "clear";
      }
    }

    const minX = boundary.x + BOUNDS_EPSILON;
    const maxX = boundary.x + boundary.w - BOUNDS_EPSILON;
    const minZ = boundary.y + BOUNDS_EPSILON;
    const maxZ = boundary.y + boundary.h - BOUNDS_EPSILON;
    if (collider.min.x < minX || collider.max.x > maxX || collider.min.z < minZ || collider.max.z > maxZ) {
      return "bounds";
    }

    for (const rect of narrowPassageRects) {
      if (!overlapsRect2d(collider, rect)) {
        continue;
      }

      const overlapX = overlapLength(collider.min.x, collider.max.x, rect.x, rect.x + rect.w);
      const overlapZ = overlapLength(collider.min.z, collider.max.z, rect.y, rect.y + rect.h);
      if (overlapX <= 0 || overlapZ <= 0) {
        continue;
      }

      const narrowAlongX = rect.w <= rect.h;
      const occupiedAcross = narrowAlongX ? overlapX : overlapZ;
      const availableAcross = (narrowAlongX ? rect.w : rect.h) - occupiedAcross;
      if (availableAcross < GAP_RULE_MIN_PASSAGE_M) {
        return "gap";
      }
    }

    return null;
  }

  function registerRejection(reason: "clear" | "bounds" | "gap"): void {
    if (reason === "clear") {
      stats.rejectedClearZone += 1;
    } else if (reason === "bounds") {
      stats.rejectedBounds += 1;
    } else {
      stats.rejectedGapRule += 1;
    }
  }

  const dressingPlacements = options.blockout.dressingPlacements ?? [];
  const compiledDressing = buildCompiledDressing(options, dressingPlacements);
  root.add(compiledDressing.root);
  // Cover collides with its rendered pieces under the route and clearance
  // rules. A cluster is solid as a whole or not at all, so a lane never gets
  // half a stack.
  const rejectedAnchorIds = new Set<string>();
  for (const collider of compiledDressing.colliders) {
    stats.candidatesTotal += 1;
    const reason = rejectReason(collider);
    if (!reason) continue;
    registerRejection(reason);
    rejectedAnchorIds.add(collider.id.replace(/-cover-\d+$/, ""));
  }
  const fittedCover = compiledDressing.colliders
    .filter((collider) => !rejectedAnchorIds.has(collider.id.replace(/-cover-\d+$/, "")));
  const colliders = [...authoredColliders, ...fittedCover];
  stats.collidersPlaced = colliders.length;
  // R8 wall-foot goods (render-only; records from the frozen R8 atmosphere overlay).
  if (dressingPlacements.length > 0 && options.propModels && atmosphereAppliesTo(options.blockout.mapId)) {
    root.add(buildWallFootClutter(options.propModels));
  }
  const renderedPlacements = compiledDressing.renderedPlacements;

  return {
    root,
    colliders,
    stats,
    renderedAnchorIds: [...new Set(renderedPlacements.map((placement) => placement.anchorId))].sort(),
    renderedPlacements,
  };
}
