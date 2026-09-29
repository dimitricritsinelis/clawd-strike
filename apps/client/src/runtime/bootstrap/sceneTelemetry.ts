import { Box3, InstancedMesh, Matrix4, Mesh, PerspectiveCamera, Quaternion, Raycaster, Vector3, type Object3D } from "three";
import type { Game } from "../game/Game";
import type { RuntimeBlockoutSpec } from "../map/spec/types";
import { resolveVisualSupport, type VisualSupportCandidate } from "../qa/visualSupport";

const OVERVIEW_MIN_VISIBLE_SPAN_M = 6;

export type ScenePerfSnapshot = {
  materials: number;
  instancedMeshes: number;
  instancedInstances: number;
  meshes: number;
  potentialTriangles: number;
  groups: Record<string, { meshes: number; instancedMeshes: number; instances: number; potentialTriangles: number }>;
  topMeshes: Array<{ name: string; instances: number; potentialTriangles: number }>;
};

function overviewQaSpan(object: Object3D): number | null {
  const records = Array.isArray(object.userData.visualQaInstances)
    ? object.userData.visualQaInstances
    : [object.userData.visualQa];
  let largest = Number.NEGATIVE_INFINITY;
  for (const raw of records) {
    if (!isRecordValue(raw) || !isRecordValue(raw.dimensions)) continue;
    const dimensions = raw.dimensions;
    for (const key of ["x", "y", "z"]) {
      const value = dimensions[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        largest = Math.max(largest, Math.abs(value));
      }
    }
  }
  return Number.isFinite(largest) ? largest : null;
}

function belongsToOverviewLandmark(object: Object3D): boolean {
  let current: Object3D | null = object;
  while (current) {
    const qa = isRecordValue(current.userData.visualQa) ? current.userData.visualQa : null;
    const placementId = typeof qa?.placementId === "string" ? qa.placementId : "";
    if (placementId.startsWith("LMK_") || placementId.includes("_LMK_")) return true;
    const instances = current === object ? current.userData.visualQaInstances : null;
    if (Array.isArray(instances) && instances.some((raw) => {
      if (!isRecordValue(raw)) return false;
      return typeof raw.placementId === "string"
        && (raw.placementId.startsWith("LMK_") || raw.placementId.includes("_LMK_"));
    })) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export function applyOverviewRenderLod(scene: Object3D): () => void {
  scene.updateMatrixWorld(true);
  const worldScale = new Vector3();
  const changedVisibility = new Map<Object3D, boolean>();
  scene.traverse((object) => {
    if (!(object instanceof Mesh) || !object.visible) return;
    if (belongsToOverviewLandmark(object)) return;

    const qaSpan = overviewQaSpan(object);
    if (qaSpan !== null) {
      if (qaSpan < OVERVIEW_MIN_VISIBLE_SPAN_M) {
        changedVisibility.set(object, object.visible);
        object.visible = false;
      }
      return;
    }

    if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
    const radius = object.geometry.boundingSphere?.radius;
    if (typeof radius !== "number" || !Number.isFinite(radius)) return;
    object.getWorldScale(worldScale);
    const diameterM = 2 * radius * Math.max(worldScale.x, worldScale.y, worldScale.z);
    if (diameterM < OVERVIEW_MIN_VISIBLE_SPAN_M) {
      changedVisibility.set(object, object.visible);
      object.visible = false;
    }
  });
  return () => {
    for (const [object, visible] of changedVisibility) {
      object.visible = visible;
    }
    changedVisibility.clear();
  };
}

type VisualQaDimensions = {
  width: number;
  depth: number;
  height: number;
};

type VisualQaPlacementSource = {
  placementId: string;
  anchorId?: string;
  assetId?: string;
  moduleId?: string;
  semanticClass: string;
  representation: string;
  materialMode: string;
  groundingGapM: number;
  supportPlacementId?: string;
  backingPlacementId?: string;
  structurallyBacked?: boolean;
  dimensionsM: VisualQaDimensions;
  shadowMode: string;
  center: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };
  sourceObject: Object3D | null;
  sourceInstanceId: number | null;
};

export type RuntimeVisibleAsset = Omit<
  VisualQaPlacementSource,
  "center" | "orientation" | "sourceObject" | "sourceInstanceId"
> & {
  screenAreaRatio: number;
  occluded: false;
};

const CANONICAL_VISUAL_ARTIFACT_TAGS = new Set([
  "backface",
  "duplicate-representation",
  "exposed-shell",
  "exterior-opening",
  "floor-gap",
  "interpenetration",
  "invalid-scale",
  "placeholder",
  "procedural-proxy",
  "unsupported-slab",
]);
const VISUAL_QA_OCCLUSION_EPSILON_M = 0.04;
const VISUAL_QA_MIN_SCREEN_AREA_RATIO = 1e-6;
const GROUNDED_PROP_SEMANTIC_CLASSES = new Set([
  "architecture",
  "container",
  "cover",
  "foliage",
  "furniture",
  "landmark",
]);

export function collectScenePerfSnapshot(worldScene: { traverse: (cb: (node: unknown) => void) => void }, viewModelScene: { traverse: (cb: (node: unknown) => void) => void } | null): ScenePerfSnapshot {
  const materials = new Set<unknown>();
  let instancedMeshes = 0;
  let instancedInstances = 0;
  let meshes = 0;
  let potentialTriangles = 0;
  const groups: ScenePerfSnapshot["groups"] = {};
  const meshCosts: ScenePerfSnapshot["topMeshes"] = [];

  const walk = (scene: { traverse: (cb: (node: unknown) => void) => void }): void => {
    scene.traverse((node) => {
      const mesh = node as {
        isMesh?: boolean;
        material?: unknown;
        isInstancedMesh?: boolean;
        count?: number;
      };
      if (!mesh.isMesh) return;
      meshes += 1;

      if (Array.isArray(mesh.material)) {
        for (const material of mesh.material) {
          if (material) materials.add(material);
        }
      } else if (mesh.material) {
        materials.add(mesh.material);
      }

      if (mesh.isInstancedMesh) {
        instancedMeshes += 1;
        instancedInstances += Math.max(0, mesh.count ?? 0);
      }

      const object = node as Object3D & { geometry?: { index?: { count: number } | null; getAttribute?: (name: string) => { count: number } | undefined }; count?: number };
      const vertexCount = object.geometry?.index?.count
        ?? object.geometry?.getAttribute?.("position")?.count
        ?? 0;
      const instanceCount = mesh.isInstancedMesh ? Math.max(0, mesh.count ?? 0) : 1;
      const triangles = (vertexCount / 3) * instanceCount;
      potentialTriangles += triangles;
      meshCosts.push({ name: object.name || object.type, instances: instanceCount, potentialTriangles: triangles });
      const lineage: string[] = [];
      let root: Object3D | null = object;
      while (root?.parent) {
        if (root.name) lineage.unshift(root.name);
        if (root.parent.type === "Scene") break;
        root = root.parent;
      }
      const groupName = lineage.slice(0, 2).join("/") || root?.type || "unnamed";
      const group = groups[groupName] ?? { meshes: 0, instancedMeshes: 0, instances: 0, potentialTriangles: 0 };
      group.meshes += 1;
      group.instancedMeshes += mesh.isInstancedMesh ? 1 : 0;
      group.instances += instanceCount;
      group.potentialTriangles += triangles;
      groups[groupName] = group;
    });
  };

  walk(worldScene);
  if (viewModelScene) {
    walk(viewModelScene);
  }

  return {
    materials: materials.size,
    instancedMeshes,
    instancedInstances,
    meshes,
    potentialTriangles,
    groups,
    topMeshes: meshCosts.sort((left, right) => right.potentialTriangles - left.potentialTriangles).slice(0, 20),
  };
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalArtifactTag(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replaceAll("_", "-");
  return CANONICAL_VISUAL_ARTIFACT_TAGS.has(normalized) ? normalized : null;
}

function collectDeclaredArtifactTags(object: Object3D, target: Set<string>): void {
  const qa = isRecordValue(object.userData.visualQa) ? object.userData.visualQa : null;
  const values = [
    object.userData.visualQaArtifactTags,
    object.userData.artifactTags,
    qa?.artifactTags,
  ];
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const candidate of value) {
      const tag = canonicalArtifactTag(candidate);
      if (tag) target.add(tag);
    }
  }
}

function resolveArchitectureShadowMode(mesh: Object3D, raw: unknown): string {
  if (mesh.castShadow && mesh.receiveShadow) return "cast_receive";
  if (mesh.castShadow) return "cast_only";
  if (mesh.receiveShadow) return "receive_only";
  if (raw === "cast") return "cast_only";
  if (raw === "receive") return "receive_only";
  return typeof raw === "string" && raw.length > 0 ? raw : "none";
}

function resolveSurfaceHeightAt(
  spec: RuntimeBlockoutSpec,
  x: number,
  z: number,
): number {
  let highest = Number.NEGATIVE_INFINITY;
  for (const surface of spec.traversalSurfaces ?? []) {
    if (
      x < surface.rect.x
      || x > surface.rect.x + surface.rect.w
      || z < surface.rect.y
      || z > surface.rect.y + surface.rect.h
    ) {
      continue;
    }
    if (surface.kind === "flat") {
      highest = Math.max(highest, surface.elevationM);
      continue;
    }
    const start = surface.axis === "x" ? surface.rect.x : surface.rect.y;
    const length = surface.axis === "x" ? surface.rect.w : surface.rect.h;
    const coordinate = surface.axis === "x" ? x : z;
    const t = Math.max(0, Math.min(1, (coordinate - start) / Math.max(length, 1e-6)));
    highest = Math.max(
      highest,
      surface.startElevationM + (surface.endElevationM - surface.startElevationM) * t,
    );
  }
  return Number.isFinite(highest) ? highest : spec.defaults.floor_height;
}

function collectVisualQaPlacementSources(
  game: Game,
  spec: RuntimeBlockoutSpec | null,
): { placements: VisualQaPlacementSource[]; declaredArtifactTags: Set<string> } {
  game.scene.updateMatrixWorld(true);
  const placements: VisualQaPlacementSource[] = [];
  const declaredArtifactTags = new Set<string>();
  const namedPropRoots = new Map<string, Object3D>();
  const instancedPlacementIds = new Set<string>();
  const instanceMatrix = new Matrix4();
  const worldMatrix = new Matrix4();
  const worldPosition = new Vector3();
  const worldScale = new Vector3();
  const worldQuaternion = game.camera.quaternion.clone();

  game.scene.traverse((object) => {
    if (!object.visible) return;
    collectDeclaredArtifactTags(object, declaredArtifactTags);
    if (object.name.startsWith("v3-dressing-")) {
      namedPropRoots.set(object.name.slice("v3-dressing-".length), object);
    }
    const rawInstances = object.userData.visualQaInstances;
    if (!Array.isArray(rawInstances)) return;
    const isInstancedMesh = object instanceof InstancedMesh;
    const batchedObject = object as Object3D & {
      isBatchedMesh?: boolean;
      getMatrixAt?: (index: number, target: Matrix4) => Matrix4;
    };
    const isBatchedMesh = batchedObject.isBatchedMesh === true && typeof batchedObject.getMatrixAt === "function";
    if (!isInstancedMesh && !isBatchedMesh) return;
    const instanceCount = isInstancedMesh ? Math.min(rawInstances.length, object.count) : rawInstances.length;
    for (let index = 0; index < instanceCount; index += 1) {
      const raw = rawInstances[index];
      if (!isRecordValue(raw)) continue;
      const placementId = typeof raw.placementId === "string" ? raw.placementId : "";
      const moduleId = typeof raw.moduleId === "string" ? raw.moduleId : "";
      const anchorId = typeof raw.anchorId === "string" ? raw.anchorId : undefined;
      const assetId = typeof raw.assetId === "string" ? raw.assetId : undefined;
      const semanticClass = typeof raw.semanticClass === "string" ? raw.semanticClass : "";
      const representation = typeof raw.representation === "string" ? raw.representation : "module";
      const materialMode = typeof raw.materialMode === "string" ? raw.materialMode : "debug";
      const backingPlacementId = typeof raw.backingPlacementId === "string" && raw.backingPlacementId.trim().length > 0
        ? raw.backingPlacementId.trim()
        : undefined;
      const structurallyBacked = typeof raw.structurallyBacked === "boolean"
        ? raw.structurallyBacked
        : undefined;
      const dimensions = isRecordValue(raw.dimensions) ? raw.dimensions : null;
      if (!placementId || !moduleId || !semanticClass || !dimensions) {
        declaredArtifactTags.add("invalid-scale");
        continue;
      }
      const width = dimensions.x;
      const height = dimensions.y;
      const depth = dimensions.z;
      if (
        typeof width !== "number"
        || typeof depth !== "number"
        || typeof height !== "number"
      ) {
        declaredArtifactTags.add("invalid-scale");
        continue;
      }

      const sourceInstanceMatrix = raw.sourceInstanceMatrix;
      if (Array.isArray(sourceInstanceMatrix) && sourceInstanceMatrix.length === 16
        && sourceInstanceMatrix.every((value) => typeof value === "number" && Number.isFinite(value))) {
        instanceMatrix.fromArray(sourceInstanceMatrix);
      } else if (isInstancedMesh) object.getMatrixAt(index, instanceMatrix);
      else batchedObject.getMatrixAt!(index, instanceMatrix);
      worldMatrix.multiplyMatrices(object.matrixWorld, instanceMatrix);
      worldMatrix.decompose(worldPosition, worldQuaternion, worldScale);
      const rawGroundingGap = raw.groundingGapM ?? raw.groundedGapM;
      placements.push({
        placementId,
        ...(anchorId ? { anchorId } : {}),
        ...(assetId ? { assetId } : {}),
        moduleId,
        semanticClass,
        representation,
        materialMode,
        groundingGapM: typeof rawGroundingGap === "number" ? rawGroundingGap : 0,
        ...(backingPlacementId ? { backingPlacementId } : {}),
        ...(typeof structurallyBacked === "boolean" ? { structurallyBacked } : {}),
        dimensionsM: { width, depth, height },
        shadowMode: resolveArchitectureShadowMode(object, raw.shadowMode),
        center: { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
        orientation: {
          x: worldQuaternion.x,
          y: worldQuaternion.y,
          z: worldQuaternion.z,
          w: worldQuaternion.w,
        },
        sourceObject: object,
        sourceInstanceId: index,
      });
      instancedPlacementIds.add(placementId);
    }
  });

  const renderedPropPlacements = game.getRenderedPropPlacements();
  const supportCandidates: VisualSupportCandidate[] = renderedPropPlacements.flatMap((placement) => {
    const sourceObject = namedPropRoots.get(placement.placementId);
    if (!sourceObject) return [];
    const bounds = new Box3().setFromObject(sourceObject);
    if (bounds.isEmpty()) return [];
    return [{ placementId: placement.placementId, bounds }];
  });

  for (const placement of renderedPropPlacements) {
    if (instancedPlacementIds.has(placement.placementId)) continue;
    const sourceObject = namedPropRoots.get(placement.placementId) ?? null;
    const sourceBounds = sourceObject ? new Box3().setFromObject(sourceObject) : null;
    let groundingGapM = placement.groundingGapM;
    let supportPlacementId: string | undefined;
    if (spec && GROUNDED_PROP_SEMANTIC_CLASSES.has(placement.semanticClass)) {
      const bottomY = sourceBounds && !sourceBounds.isEmpty()
        ? sourceBounds.min.y
        : placement.center.y - placement.dimensionsM.height * 0.5;
      const surfaceY = resolveSurfaceHeightAt(spec, placement.center.x, placement.center.z);
      const signedGapM = bottomY - surfaceY;
      const support = sourceBounds && signedGapM > 0.03
        ? resolveVisualSupport(placement.placementId, sourceBounds, supportCandidates)
        : null;
      if (support) {
        groundingGapM = support.gapM;
        supportPlacementId = support.supportPlacementId;
      } else {
        if (signedGapM < -0.03) declaredArtifactTags.add("interpenetration");
        groundingGapM = Math.max(0, signedGapM);
      }
    }
    const sourceOrientation = sourceObject
      ? sourceObject.getWorldQuaternion(new Quaternion())
      : new Quaternion();
    placements.push({
      placementId: placement.placementId,
      anchorId: placement.anchorId,
      assetId: placement.assetId,
      moduleId: placement.moduleId,
      semanticClass: placement.semanticClass,
      representation: placement.representation,
      materialMode: placement.materialMode,
      groundingGapM,
      ...(supportPlacementId ? { supportPlacementId } : {}),
      dimensionsM: placement.dimensionsM,
      shadowMode: placement.shadowMode,
      center: placement.center,
      orientation: {
        x: sourceOrientation.x,
        y: sourceOrientation.y,
        z: sourceOrientation.z,
        w: sourceOrientation.w,
      },
      sourceObject,
      sourceInstanceId: null,
    });
  }

  return { placements, declaredArtifactTags };
}

function hasValidVisualDimensions(dimensions: VisualQaDimensions): boolean {
  return [dimensions.width, dimensions.depth, dimensions.height].every((value) => (
    Number.isFinite(value) && value > 0
  ));
}

function projectedScreenAreaRatio(
  placement: VisualQaPlacementSource,
  camera: PerspectiveCamera,
): number {
  if (!hasValidVisualDimensions(placement.dimensionsM)) return 0;
  const { width, depth, height } = placement.dimensionsM;
  const halfX = width * 0.5;
  const halfY = height * 0.5;
  const halfZ = depth * 0.5;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let projectedCornerCount = 0;
  const worldCorner = new Vector3();
  const cameraCorner = new Vector3();
  const placementCenter = new Vector3(
    placement.center.x,
    placement.center.y,
    placement.center.z,
  );
  const orientation = new Quaternion(
    placement.orientation.x,
    placement.orientation.y,
    placement.orientation.z,
    placement.orientation.w,
  );

  for (const dx of [-halfX, halfX]) {
    for (const dy of [-halfY, halfY]) {
      for (const dz of [-halfZ, halfZ]) {
        worldCorner
          .set(dx, dy, dz)
          .applyQuaternion(orientation)
          .add(placementCenter);
        cameraCorner.copy(worldCorner).applyMatrix4(camera.matrixWorldInverse);
        if (-cameraCorner.z <= camera.near) continue;
        worldCorner.project(camera);
        if (!Number.isFinite(worldCorner.x) || !Number.isFinite(worldCorner.y)) continue;
        minX = Math.min(minX, worldCorner.x);
        minY = Math.min(minY, worldCorner.y);
        maxX = Math.max(maxX, worldCorner.x);
        maxY = Math.max(maxY, worldCorner.y);
        projectedCornerCount += 1;
      }
    }
  }

  if (projectedCornerCount === 0) return 0;
  const clippedMinX = Math.max(-1, minX);
  const clippedMaxX = Math.min(1, maxX);
  const clippedMinY = Math.max(-1, minY);
  const clippedMaxY = Math.min(1, maxY);
  if (clippedMaxX <= clippedMinX || clippedMaxY <= clippedMinY) return 0;
  return Math.min(1, ((clippedMaxX - clippedMinX) * (clippedMaxY - clippedMinY)) / 4);
}

function placementVisibilitySamples(placement: VisualQaPlacementSource): Vector3[] {
  const { width, depth, height } = placement.dimensionsM;
  const center = new Vector3(placement.center.x, placement.center.y, placement.center.z);
  const orientation = new Quaternion(
    placement.orientation.x,
    placement.orientation.y,
    placement.orientation.z,
    placement.orientation.w,
  );
  const sample = (x: number, y: number, z: number): Vector3 => (
    new Vector3(x, y, z).applyQuaternion(orientation).add(center)
  );
  const samples = [
    center.clone(),
    sample(0, height * 0.35, 0),
    sample(-width * 0.35, 0, 0),
    sample(width * 0.35, 0, 0),
    sample(0, 0, -depth * 0.35),
    sample(0, 0, depth * 0.35),
  ];
  // A long architectural volume can be center-occluded while one of its end
  // faces still cuts a large, obvious silhouette against the sky. Sampling
  // only the center axes made those visible end caps disappear from QA
  // telemetry. Probe the inset corners at mid-height and near the roofline so
  // the reported placement identity follows the pixels a reviewer can see.
  for (const xSign of [-1, 1]) {
    for (const zSign of [-1, 1]) {
      samples.push(
        sample(width * 0.42 * xSign, 0, depth * 0.42 * zSign),
        sample(width * 0.42 * xSign, height * 0.38, depth * 0.42 * zSign),
      );
    }
  }
  return samples;
}

function rayReachesPlacement(
  placement: VisualQaPlacementSource,
  sceneRoot: Object3D,
  camera: PerspectiveCamera,
  raycaster: Raycaster,
): Object3D[] {
  const direction = new Vector3();
  const reachedObjects = new Set<Object3D>();
  raycaster.camera = camera;
  const firstSceneHit = () => raycaster.intersectObject(sceneRoot, true).find((hit) => (
    (hit.object as Object3D & { isSprite?: boolean }).isSprite !== true
  ));
  for (const target of placementVisibilitySamples(placement)) {
    direction.copy(target).sub(camera.position);
    const distanceM = direction.length();
    if (distanceM <= camera.near) continue;
    direction.multiplyScalar(1 / distanceM);
    raycaster.set(camera.position, direction);
    raycaster.near = camera.near;

    const half = placement.dimensionsM;
    const supportM = (
      Math.abs(direction.x) * half.width
      + Math.abs(direction.y) * half.height
      + Math.abs(direction.z) * half.depth
    ) * 0.5;
    raycaster.far = distanceM + supportM + VISUAL_QA_OCCLUSION_EPSILON_M;

    if (placement.sourceObject) {
      const ownHit = raycaster.intersectObject(placement.sourceObject, true).find((hit) => (
        placement.sourceInstanceId === null
        || hit.instanceId === placement.sourceInstanceId
        || (hit as typeof hit & { batchId?: number }).batchId === placement.sourceInstanceId
      ));
      if (!ownHit) continue;
      const sceneHit = firstSceneHit();
      if (!sceneHit || ownHit.distance <= sceneHit.distance + VISUAL_QA_OCCLUSION_EPSILON_M) {
        reachedObjects.add(ownHit.object);
      }
      continue;
    }

    const nearBoundM = Math.max(camera.near, distanceM - supportM - VISUAL_QA_OCCLUSION_EPSILON_M);
    const farBoundM = distanceM + supportM + VISUAL_QA_OCCLUSION_EPSILON_M;
    const sceneHit = firstSceneHit();
    if (sceneHit && sceneHit.distance >= nearBoundM && sceneHit.distance <= farBoundM) {
      reachedObjects.add(sceneHit.object);
    }
  }
  return [...reachedObjects];
}

function collectRenderableObjects(
  placement: VisualQaPlacementSource,
  reachedObjects: readonly Object3D[],
): Object3D[] {
  if (!placement.sourceObject) return [...reachedObjects];
  const rendered: Object3D[] = [];
  placement.sourceObject.traverse((object) => {
    if ((object as Object3D & { isMesh?: boolean }).isMesh) rendered.push(object);
  });
  return rendered.length > 0 ? rendered : [...reachedObjects];
}

function actualShadowMode(
  placement: VisualQaPlacementSource,
  reachedObjects: readonly Object3D[],
): string {
  const rendered = collectRenderableObjects(placement, reachedObjects);
  const casts = rendered.some((object) => object.castShadow);
  const receives = rendered.some((object) => object.receiveShadow);
  if (casts && receives) return "cast_receive";
  if (casts) return "cast_only";
  if (receives) return "receive_only";
  return rendered.length > 0 ? "none" : placement.shadowMode;
}

function actualMaterialMode(
  placement: VisualQaPlacementSource,
  reachedObjects: readonly Object3D[],
): string {
  if (placement.materialMode === "debug") return "debug";
  let hasPbr = false;
  let hasLitStandard = false;
  let hasUnlit = false;
  const rendered = collectRenderableObjects(placement, reachedObjects);
  for (const object of rendered) {
    const materialValue = (object as Object3D & { material?: unknown }).material;
    const materials = Array.isArray(materialValue) ? materialValue : [materialValue];
    for (const material of materials) {
      if (!isRecordValue(material)) continue;
      if (material.isMeshPhysicalMaterial === true || material.isMeshStandardMaterial === true) {
        hasPbr = true;
      } else if (material.isMeshBasicMaterial === true) {
        hasUnlit = true;
      } else if (
        material.isMeshLambertMaterial === true
        || material.isMeshPhongMaterial === true
        || material.isMeshToonMaterial === true
      ) {
        hasLitStandard = true;
      }
    }
  }
  if (hasPbr) return "pbr";
  if (hasLitStandard) return "standard";
  if (hasUnlit) return "unlit";
  return placement.materialMode === "blockout" ? "standard" : placement.materialMode;
}

export function collectVisibleAssetTelemetry(
  game: Game,
  spec: RuntimeBlockoutSpec | null,
  qaTargets: ReadonlySet<string>,
): { visibleAssets: RuntimeVisibleAsset[]; artifactTags: string[] } {
  game.camera.updateMatrixWorld(true);
  game.camera.updateProjectionMatrix();
  const { placements, declaredArtifactTags } = collectVisualQaPlacementSources(game, spec);
  const artifactTags = new Set(declaredArtifactTags);
  const raycaster = new Raycaster();
  const visibleAssets: RuntimeVisibleAsset[] = [];
  const placementCounts = new Map<string, number>();
  for (const placement of placements) {
    placementCounts.set(placement.placementId, (placementCounts.get(placement.placementId) ?? 0) + 1);
  }

  for (const placement of placements) {
    if (!hasValidVisualDimensions(placement.dimensionsM)) {
      artifactTags.add("invalid-scale");
      continue;
    }
    const screenAreaRatio = projectedScreenAreaRatio(placement, game.camera);
    if (screenAreaRatio < VISUAL_QA_MIN_SCREEN_AREA_RATIO) continue;
    const isExplicitTarget = [
      placement.placementId,
      placement.assetId,
      placement.moduleId,
    ].some((value) => typeof value === "string" && qaTargets.has(value));
    const requiresArtifactProbe = (
      placement.representation === "placeholder"
      || placement.representation === "procedural-proxy"
      || placement.structurallyBacked === false
      || (placementCounts.get(placement.placementId) ?? 0) > 1
    );
    // Full-scene raycasts are the expensive part of state serialization. The
    // capture harness sends each shot's required telemetry selectors, while
    // artifact-risk candidates are always probed. Healthy unrelated placements
    // do not need dozens of whole-scene raycasts merely to prove they exist.
    if (!isExplicitTarget && !requiresArtifactProbe) continue;
    const reachedObjects = rayReachesPlacement(placement, game.scene, game.camera, raycaster);
    if (reachedObjects.length === 0) continue;
    visibleAssets.push({
      placementId: placement.placementId,
      ...(placement.anchorId ? { anchorId: placement.anchorId } : {}),
      ...(placement.assetId ? { assetId: placement.assetId } : {}),
      ...(placement.moduleId ? { moduleId: placement.moduleId } : {}),
      semanticClass: placement.semanticClass,
      representation: placement.representation,
      materialMode: actualMaterialMode(placement, reachedObjects),
      groundingGapM: placement.groundingGapM,
      ...(placement.supportPlacementId ? { supportPlacementId: placement.supportPlacementId } : {}),
      ...(placement.backingPlacementId ? { backingPlacementId: placement.backingPlacementId } : {}),
      ...(typeof placement.structurallyBacked === "boolean"
        ? { structurallyBacked: placement.structurallyBacked }
        : {}),
      dimensionsM: placement.dimensionsM,
      shadowMode: actualShadowMode(placement, reachedObjects),
      screenAreaRatio,
      occluded: false,
    });
  }

  visibleAssets.sort((left, right) => (
    left.placementId.localeCompare(right.placementId)
    || (left.assetId ?? "").localeCompare(right.assetId ?? "")
    || (left.moduleId ?? "").localeCompare(right.moduleId ?? "")
    || left.representation.localeCompare(right.representation)
  ));

  const visibleByPlacement = new Map<string, number>();
  for (const asset of visibleAssets) {
    visibleByPlacement.set(asset.placementId, (visibleByPlacement.get(asset.placementId) ?? 0) + 1);
    if (asset.representation === "placeholder") artifactTags.add("placeholder");
    if (asset.representation === "procedural-proxy") artifactTags.add("procedural-proxy");
  }
  if ([...visibleByPlacement.values()].some((count) => count > 1)) {
    artifactTags.add("duplicate-representation");
  }

  return {
    visibleAssets,
    artifactTags: [...artifactTags].filter((tag) => CANONICAL_VISUAL_ARTIFACT_TAGS.has(tag)).sort(),
  };
}
