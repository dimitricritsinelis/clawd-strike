import {
  Color,
  DataTexture,
  DynamicDrawUsage,
  FrontSide,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  MeshStandardMaterial,
  NoColorSpace,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  Vector2,
  Vector3,
  type Object3D,
  type Scene,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { DeterministicRng, deriveSubSeed } from "../utils/Rng";
import {
  BulletDecalSurfaces,
  createDecalSurfaceHit,
  type DecalSurfaceClass,
} from "./BulletDecalSurfaces";
import {
  BULLET_HOLE_ATLAS_ROWS,
  BULLET_HOLE_ATLAS_VARIANTS,
  BULLET_HOLE_MAX_DEPTH_UV,
  bulletHoleAtlasRow,
  generateBulletHoleAtlas,
  type BulletHoleAtlas,
} from "./bulletHoleAtlas";
import { ImpactParticle, type ImpactSurface } from "./ImpactParticle";

export const MAX_DECALS = 384;
/**
 * Decal quad edge length, including the faint powder halo. The punched core is
 * ~1.8 cm and the spall crater ~6 cm across on masonry, so a hole still reads
 * as a few dark pixels plus a light crater at 8-10 m.
 */
export const DECAL_SIZE_BASE_M = 0.22;
export const DECAL_SIZE_VARIATION = 0.2;
/** Per-surface scale: spall craters are wide, sheet metal and cloth punch clean. */
export const DECAL_CLASS_SIZE_SCALE: Record<DecalSurfaceClass, number> = {
  masonry: 1,
  wood: 0.9,
  metal: 0.62,
  glass: 1.3,
  soft: 0.6,
};
/**
 * Radius (fraction of the half-size) that must sit on flush surface. Beyond it
 * the texture is only faint powder that may overhang an edge harmlessly.
 */
const SUPPORT_RING_FRACTION: Record<DecalSurfaceClass, number> = {
  masonry: 0.5,
  wood: 0.55,
  metal: 0.4,
  glass: 0.6,
  soft: 0.35,
};
const SUPPORT_SCALES = [1, 0.78, 0.6, 0.45] as const;
const SUPPORT_PROBES = 8;
const DECAL_OFFSET_M = 0.003;
/** Nearest distance a bullet can mark (keeps holes off the player's own face). */
const SURFACE_SEARCH_NEAR_M = 0.05;
/**
 * The gameplay collider is a box around the art; recessed shop fronts sit up
 * to ~2.3 m behind theirs. A visible surface within this distance behind the
 * collider face is still what the player saw get hit.
 */
export const SURFACE_BEHIND_COLLIDER_TOLERANCE_M = 2.5;
const BVH_PREBUILD_BUDGET_MS = 2;
const TAU = Math.PI * 2;

// Linear-space colour of freshly split timber (tint for wood holes).
const FRESH_WOOD_LINEAR = new Color().setRGB(0.8, 0.62, 0.4);

type Vec3Like = { x: number; y: number; z: number };

export type ColliderShotHit = {
  distance: number;
  point: Vec3Like;
  normal: Vec3Like;
};

export type BulletHoleManagerOptions = {
  /** Render roots of the static world (blockout, facades, props). */
  getSurfaceRoots?: () => readonly Object3D[];
};

export type LastDecalInfo = {
  placement: "surface" | "collider" | "none";
  surface: DecalSurfaceClass | null;
  objectName: string | null;
  scale: number;
};

// Scratch objects — reused every spawn to avoid allocation
const _normal = new Vector3();
const _tangent = new Vector3();
const _bitangent = new Vector3();
const _position = new Vector3();
const _helper = new Vector3();
const _basis = new Matrix4();
const _tint = new Color();
const _hit = createDecalSurfaceHit();

/** Decal edge length for a uniform sample u in [0, 1). */
export function resolveDecalSizeM(u: number): number {
  return DECAL_SIZE_BASE_M * (1 + (u - 0.5) * 2 * DECAL_SIZE_VARIATION);
}

/**
 * Linear tint multiplied into the neutral atlas colours so the exposed crater,
 * powder and fibres match the struck material.
 */
export function resolveDecalTint(surface: DecalSurfaceClass, surfaceColor: Color, out: Color): Color {
  switch (surface) {
    case "masonry":
      // Freshly exposed plaster/stone is lighter than the weathered face.
      return out.setRGB(
        surfaceColor.r + (1 - surfaceColor.r) * 0.3,
        surfaceColor.g + (1 - surfaceColor.g) * 0.3,
        surfaceColor.b + (1 - surfaceColor.b) * 0.3,
      );
    case "wood":
      return out.copy(surfaceColor).lerp(FRESH_WOOD_LINEAR, 0.45);
    case "soft":
      return out.copy(surfaceColor).multiplyScalar(0.92);
    case "metal":
    case "glass":
      return out.setRGB(1, 1, 1);
  }
}

function createAtlasTexture(width: number, height: number, data: Uint8Array, srgb: boolean): DataTexture {
  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  texture.generateMipmaps = width > 1;
  texture.minFilter = width > 1 ? LinearMipmapLinearFilter : LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

const VERTEX_PARS = /* glsl */ `
attribute vec2 decalCell;
varying vec2 vDecalCell;
varying vec3 vDecalViewTangent;
varying vec3 vDecalTangent;
varying vec3 vDecalBitangent;
`;

const VERTEX_MAIN = /* glsl */ `
vDecalCell = decalCell;
mat3 decalBasis = mat3( modelMatrix ) * mat3( instanceMatrix );
vec3 decalT = normalize( decalBasis[ 0 ] );
vec3 decalB = normalize( decalBasis[ 1 ] );
vec3 decalN = normalize( decalBasis[ 2 ] );
vec3 decalToEye = cameraPosition - ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
vDecalViewTangent = vec3( dot( decalToEye, decalT ), dot( decalToEye, decalB ), dot( decalToEye, decalN ) );
vDecalTangent = normalize( mat3( viewMatrix ) * decalT );
vDecalBitangent = normalize( mat3( viewMatrix ) * decalB );
`;

const FRAGMENT_PARS = /* glsl */ `
uniform vec2 decalGrid;
uniform float decalDepth;
varying vec2 vDecalCell;
varying vec3 vDecalViewTangent;
varying vec3 vDecalTangent;
varying vec3 vDecalBitangent;
`;

// Parallax occlusion mapping inside the decal's atlas cell: the crater walls
// occlude its floor at grazing angles, so the hole has real depth.
const FRAGMENT_PARALLAX = /* glsl */ `
vec2 decalGradX = dFdx( vMapUv ) / decalGrid;
vec2 decalGradY = dFdy( vMapUv ) / decalGrid;
vec2 decalLocalUv = vMapUv;
{
  vec3 viewTs = normalize( vDecalViewTangent );
  const int DECAL_STEPS = 14;
  float layer = 1.0 / float( DECAL_STEPS );
  vec2 shift = viewTs.xy / max( viewTs.z, 0.3 ) * decalDepth * layer;
  float layerDepth = 0.0;
  float surfaceDepth = 1.0 - textureGrad( normalMap, ( clamp( decalLocalUv, 0.0, 1.0 ) + vDecalCell ) / decalGrid, decalGradX, decalGradY ).a;
  vec2 prevUv = decalLocalUv;
  float prevGap = surfaceDepth;
  for ( int i = 0; i < DECAL_STEPS; i ++ ) {
    if ( layerDepth >= surfaceDepth ) break;
    prevUv = decalLocalUv;
    prevGap = surfaceDepth - layerDepth;
    decalLocalUv -= shift;
    layerDepth += layer;
    surfaceDepth = 1.0 - textureGrad( normalMap, ( clamp( decalLocalUv, 0.0, 1.0 ) + vDecalCell ) / decalGrid, decalGradX, decalGradY ).a;
  }
  float overshoot = max( layerDepth - surfaceDepth, 0.0 );
  decalLocalUv = mix( decalLocalUv, prevUv, overshoot / max( overshoot + prevGap, 1e-4 ) );
}
vec2 decalUv = ( clamp( decalLocalUv, 0.004, 0.996 ) + vDecalCell ) / decalGrid;
`;

function patchDecalShader(shader: WebGLProgramParametersWithUniforms): void {
  shader.uniforms.decalGrid = { value: new Vector2(BULLET_HOLE_ATLAS_VARIANTS, BULLET_HOLE_ATLAS_ROWS) };
  shader.uniforms.decalDepth = { value: BULLET_HOLE_MAX_DEPTH_UV };
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", `#include <common>\n${VERTEX_PARS}`)
    .replace("#include <project_vertex>", `#include <project_vertex>\n${VERTEX_MAIN}`);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
    .replace(
      "#include <map_fragment>",
      `${FRAGMENT_PARALLAX}\ndiffuseColor *= textureGrad( map, decalUv, decalGradX, decalGradY );`,
    )
    .replace(
      "#include <roughnessmap_fragment>",
      "float roughnessFactor = roughness * textureGrad( roughnessMap, decalUv, decalGradX, decalGradY ).g;",
    )
    .replace(
      "#include <metalnessmap_fragment>",
      "float metalnessFactor = metalness * textureGrad( metalnessMap, decalUv, decalGradX, decalGradY ).b;",
    )
    .replace(
      "#include <normal_fragment_maps>",
      `vec3 mapN = textureGrad( normalMap, decalUv, decalGradX, decalGradY ).xyz * 2.0 - 1.0;
mapN.xy *= normalScale;
normal = normalize( mat3( vDecalTangent, vDecalBitangent, normal ) * mapN );`,
    );
}

export class BulletHoleManager {
  private readonly mesh: InstancedMesh<PlaneGeometry, MeshStandardMaterial>;
  private readonly cells: InstancedBufferAttribute;
  private readonly rng: DeterministicRng;
  private readonly impactParticle: ImpactParticle;
  private readonly getSurfaceRoots: (() => readonly Object3D[]) | null;
  private readonly atlasSeed: number;
  private surfaces: BulletDecalSurfaces | null = null;
  private atlasReady = false;
  private atlasWorker: Worker | null = null;
  private nextIndex = 0;
  private count = 0;
  private lastDecal: LastDecalInfo = { placement: "none", surface: null, objectName: null, scale: 0 };

  constructor(scene: Scene, seed: number, options: BulletHoleManagerOptions = {}) {
    this.rng = new DeterministicRng(deriveSubSeed(seed, "bullet-holes"));
    this.getSurfaceRoots = options.getSurfaceRoots ?? null;
    this.atlasSeed = deriveSubSeed(seed, "bullet-hole-atlas");

    // 1x1 placeholders so the program compiles once with every map define;
    // the generated atlas replaces them without a recompile.
    const blank = () => createAtlasTexture(1, 1, new Uint8Array([0, 0, 0, 0]), false);
    const material = new MeshStandardMaterial({
      map: blank(),
      normalMap: blank(),
      roughnessMap: blank(),
      metalnessMap: blank(),
      roughness: 1,
      metalness: 1,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      side: FrontSide,
    });
    material.name = "bullet-hole-decal";
    material.onBeforeCompile = patchDecalShader;
    material.customProgramCacheKey = () => "bullet-hole-decal-v2";

    const geometry = new PlaneGeometry(1, 1);
    this.cells = new InstancedBufferAttribute(new Float32Array(MAX_DECALS * 2), 2);
    this.cells.setUsage(DynamicDrawUsage);
    geometry.setAttribute("decalCell", this.cells);

    this.mesh = new InstancedMesh(geometry, material, MAX_DECALS);
    this.mesh.name = "bullet-hole-decals";
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(MAX_DECALS * 3).fill(1), 3);
    this.mesh.instanceColor.setUsage(DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 1;
    // Headless runtimes (node tests) never render; skip the atlas there.
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.impactParticle = new ImpactParticle(scene, deriveSubSeed(seed, "impact-particles"));
    this.requestAtlas();
  }

  private requestAtlas(): void {
    if (typeof document === "undefined") return;
    if (typeof Worker !== "undefined") {
      try {
        const worker = new Worker(new URL("./bulletHoleAtlas.worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (event: MessageEvent<BulletHoleAtlas>) => {
          this.applyAtlas(event.data);
          worker.terminate();
          this.atlasWorker = null;
        };
        worker.onerror = () => {
          worker.terminate();
          this.atlasWorker = null;
          this.ensureAtlasSync();
        };
        worker.postMessage({ seed: this.atlasSeed });
        this.atlasWorker = worker;
        return;
      } catch {
        // Fall through to building on first use.
      }
    }
  }

  private ensureAtlasSync(): void {
    if (this.atlasReady || typeof document === "undefined") return;
    this.applyAtlas(generateBulletHoleAtlas(this.atlasSeed));
  }

  private applyAtlas(atlas: BulletHoleAtlas): void {
    if (this.atlasReady) return;
    const material = this.mesh.material;
    const surface = createAtlasTexture(atlas.width, atlas.height, atlas.surface, false);
    material.map?.dispose();
    material.normalMap?.dispose();
    material.roughnessMap?.dispose();
    material.metalnessMap?.dispose();
    material.map = createAtlasTexture(atlas.width, atlas.height, atlas.albedo, true);
    material.normalMap = createAtlasTexture(atlas.width, atlas.height, atlas.normalHeight, false);
    material.roughnessMap = surface;
    material.metalnessMap = surface;
    this.atlasReady = true;
    this.mesh.visible = true;
  }

  private resolveSurfaces(): BulletDecalSurfaces | null {
    if (!this.getSurfaceRoots) return null;
    const roots = this.getSurfaceRoots();
    if (roots.length === 0) return null;
    const current = this.surfaces;
    if (current && current.roots.length === roots.length && current.roots.every((root, i) => root === roots[i])) {
      return current;
    }
    this.surfaces = new BulletDecalSurfaces([...roots]);
    return this.surfaces;
  }

  /**
   * World shot that did not hit an enemy. Marks the first visible surface
   * along the bullet's path, up to just behind the gameplay collider it
   * struck (or the weapon's range when it struck none).
   */
  spawnFromShot(
    origin: Vec3Like,
    direction: Vec3Like,
    colliderHit: ColliderShotHit | null,
    maxDistance: number,
  ): void {
    const surfaces = this.resolveSurfaces();
    if (surfaces) {
      const far = colliderHit ? colliderHit.distance + SURFACE_BEHIND_COLLIDER_TOLERANCE_M : maxDistance;
      if (surfaces.raycast(origin, direction, SURFACE_SEARCH_NEAR_M, far, _hit)) {
        const scale = this.placeDecal(
          _hit.point,
          _hit.normal,
          _hit.surface,
          resolveDecalTint(_hit.surface, _hit.color, _tint),
          _hit.tangent,
          surfaces,
        );
        this.lastDecal = { placement: "surface", surface: _hit.surface, objectName: _hit.objectName, scale };
        this.impactParticle.emit(_hit.point, _hit.normal, impactSurfaceFor(_hit.surface));
        return;
      }
      // Invisible blocker (clip box with no art near it): no hole in thin air.
      this.lastDecal = { placement: "none", surface: null, objectName: null, scale: 0 };
      if (colliderHit) this.impactParticle.emit(colliderHit.point, colliderHit.normal, "default");
      return;
    }
    if (colliderHit) this.spawn(colliderHit.point, colliderHit.normal);
  }

  /**
   * Decal directly on a known point/normal (no surface lookup) plus dust puff,
   * impact flash and chips. Pass `surface: "metal"` for an orange flash.
   */
  spawn(
    hitPoint: Vec3Like,
    hitNormal: Vec3Like,
    options?: { surface?: ImpactSurface },
  ): void {
    _position.set(hitPoint.x, hitPoint.y, hitPoint.z);
    _normal.set(hitNormal.x, hitNormal.y, hitNormal.z).normalize();
    const surface: DecalSurfaceClass = options?.surface === "metal" ? "metal" : "masonry";
    const scale = this.placeDecal(_position, _normal, surface, _tint.setRGB(0.55, 0.47, 0.36), null, null);
    this.lastDecal = { placement: "collider", surface, objectName: null, scale };
    this.impactParticle.emit(hitPoint, hitNormal, options?.surface ?? "default");
  }

  private placeDecal(
    point: Vector3,
    normal: Vector3,
    surface: DecalSurfaceClass,
    tint: Color,
    grain: Vector3 | null,
    surfaces: BulletDecalSurfaces | null,
  ): number {
    if (!this.atlasReady) this.ensureAtlasSync();
    _normal.copy(normal);

    // Wood follows its grain (texture U) with a little jitter; other surfaces
    // spin freely so repeated variants never line up.
    if (surface === "wood" && grain && grain.lengthSq() > 0.5) {
      _tangent.copy(grain);
      const jitter = (this.rng.next() - 0.5) * 0.24 + (this.rng.next() < 0.5 ? 0 : Math.PI);
      rotateAboutNormal(_tangent, _normal, jitter);
    } else {
      _helper.set(0, 1, 0);
      if (Math.abs(_normal.y) > 0.9) _helper.set(1, 0, 0);
      _tangent.crossVectors(_helper, _normal).normalize();
      rotateAboutNormal(_tangent, _normal, this.rng.next() * TAU);
    }
    _bitangent.crossVectors(_normal, _tangent);

    let size = resolveDecalSizeM(this.rng.next()) * DECAL_CLASS_SIZE_SCALE[surface];
    let fit = 1;
    if (surfaces) {
      const ring = size * 0.5 * SUPPORT_RING_FRACTION[surface];
      fit = SUPPORT_SCALES[SUPPORT_SCALES.length - 1]!;
      for (const scale of SUPPORT_SCALES) {
        if (surfaces.ringIsSupported(point, _normal, _tangent, _bitangent, ring * scale, SUPPORT_PROBES)) {
          fit = scale;
          break;
        }
      }
      size *= fit;
    }

    _position.copy(point).addScaledVector(_normal, DECAL_OFFSET_M);
    _basis.makeBasis(_tangent, _bitangent, _normal).scale(_helper.set(size, size, size)).setPosition(_position);

    const index = this.nextIndex;
    this.mesh.setMatrixAt(index, _basis);
    this.mesh.setColorAt(index, tint);
    this.cells.setXY(index, this.rng.int(0, BULLET_HOLE_ATLAS_VARIANTS), bulletHoleAtlasRow(surface));
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
    this.cells.needsUpdate = true;

    if (this.count < MAX_DECALS) {
      this.count++;
      this.mesh.count = this.count;
    }
    this.nextIndex = (this.nextIndex + 1) % MAX_DECALS;
    return fit;
  }

  /** Live impact particles (tests and debug). */
  getImpactParticles(): ImpactParticle {
    return this.impactParticle;
  }

  /** Where and on what the most recent world hit left its mark (debug/QA). */
  getLastDecalInfo(): Readonly<LastDecalInfo> {
    return this.lastDecal;
  }

  getDecalCount(): number {
    return this.count;
  }

  update(dt: number): void {
    this.impactParticle.update(dt);
    // Index the world and build its BVHs in small slices ahead of the first
    // shots so a burst never waits on them.
    const surfaces = this.resolveSurfaces();
    if (surfaces && surfaces.pendingBuildCount > 0) surfaces.prebuild(BVH_PREBUILD_BUDGET_MS);
  }

  clear(): void {
    this.count = 0;
    this.nextIndex = 0;
    this.mesh.count = 0;
    this.rng.reset();
    this.impactParticle.clear();
    this.lastDecal = { placement: "none", surface: null, objectName: null, scale: 0 };
  }

  dispose(scene: Scene): void {
    this.atlasWorker?.terminate();
    this.atlasWorker = null;
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    const material = this.mesh.material;
    material.map?.dispose();
    material.normalMap?.dispose();
    material.roughnessMap?.dispose();
    material.dispose();
    this.impactParticle.dispose(scene);
  }
}

function impactSurfaceFor(surface: DecalSurfaceClass): ImpactSurface {
  return surface === "metal" ? "metal" : "default";
}

function rotateAboutNormal(vector: Vector3, normal: Vector3, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Rodrigues for a vector perpendicular to the unit axis.
  _helper.crossVectors(normal, vector);
  vector.multiplyScalar(cos).addScaledVector(_helper, sin).normalize();
}
