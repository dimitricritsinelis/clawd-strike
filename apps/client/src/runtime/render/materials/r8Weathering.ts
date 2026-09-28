import type { Material, Mesh, MeshStandardMaterial, Object3D, Texture, WebGLRenderer } from "three";
import { DataTexture, NoColorSpace, RepeatWrapping, RGBAFormat, SRGBColorSpace, Vector4 } from "three";
import type { RuntimeTraversalSurface } from "../../map/types";

/**
 * R8 weathering.
 *
 * A render-only surface-history pass layered on top of every finished material
 * family: broad sun-bleached mottling, a ragged grime and sand-splash band at
 * the wall foot measured from the local walking surface, rain streaks below
 * sills and copings, spalled plaster exposing the masonry beneath, and a warm
 * shift that stops lime plaster reading as clean white paint. Floors receive
 * wind-blown sand that softens the slab grid. Nothing here touches UVs,
 * geometry, colliders or authored vertex colour; it multiplies the finished
 * albedo after `color_fragment`, so pigment and baked contact occlusion stay.
 */

export type R8SurfaceClass = "plaster" | "masonry" | "timber" | "floor";

type MaterialShader = Parameters<NonNullable<MeshStandardMaterial["onBeforeCompile"]>>[0];

/**
 * Photographic close-range detail: a tiling normal adds grain the 1k facade
 * bakes cannot resolve, and the albedo's luminance drives grunge in place of
 * smooth procedural noise. Uniform objects are shared so textures that finish
 * loading after the first compile are picked up without recompiling.
 */
export type R8DetailSet = {
  normal: { value: Texture };
  grunge: { value: Texture };
  tileM: number;
};
export type R8DetailLayers = { plaster: R8DetailSet; stone: R8DetailSet };

export type R8WeatheringOptions = {
  traversalSurfaces?: readonly RuntimeTraversalSurface[];
  detail?: R8DetailLayers;
};

function flatTexture(rgba: [number, number, number, number], srgb: boolean): Texture {
  const texture = new DataTexture(new Uint8Array(rgba), 1, 1, RGBAFormat);
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/** Detail slots start neutral (flat normal, mid-grey grunge) until real maps load. */
export function createR8DetailSet(tileM: number): R8DetailSet {
  return {
    normal: { value: flatTexture([128, 128, 255, 255], false) },
    grunge: { value: flatTexture([128, 128, 128, 255], true) },
    tileM,
  };
}

export type R8WeatheringStats = Record<R8SurfaceClass | "skipped", number>;

const MAX_RAISED_SURFACES = 8;

// Per-class strengths. Plaster carries the most visible history; dressed stone
// keeps crisper arrises; timber mainly sun-greys.
const CLASS_PARAMS: Record<R8SurfaceClass, {
  detailNormal: number;
  grunge: number;
  normalBoost: number;
  roughnessCap: number;
  mottle: number;
  warm: number;
  grime: number;
  grimeHeight: number;
  streak: number;
  loss: number;
  dust: number;
}> = {
  plaster: { detailNormal: 0.55, grunge: 0.42, normalBoost: 2.6, roughnessCap: 0.9, mottle: 0.24, warm: 0.62, grime: 0.72, grimeHeight: 1.5, streak: 0.3, loss: 1, dust: 0.3 },
  masonry: { detailNormal: 0.45, grunge: 0.38, normalBoost: 1.8, roughnessCap: 0.82, mottle: 0.22, warm: 0.3, grime: 0.62, grimeHeight: 1.2, streak: 0.26, loss: 0, dust: 0.34 },
  timber: { detailNormal: 0, grunge: 0.2, normalBoost: 1.3, roughnessCap: 1, mottle: 0.2, warm: 0, grime: 0.35, grimeHeight: 0.8, streak: 0.12, loss: 0, dust: 0.2 },
  floor: { detailNormal: 0.4, grunge: 0.34, normalBoost: 1.6, roughnessCap: 0.86, mottle: 0.16, warm: 0.18, grime: 0, grimeHeight: 1, streak: 0, loss: 0, dust: 0.5 },
};

// Classified by the material's kind suffix, not the whole id: unit prefixes
// such as bz10_textile_* or bz11_rug_* name places, not surfaces.
const SKIP_KINDS = new Set(["cloth", "linen", "rug", "glass", "lens", "iron", "metal", "brass", "porcelain", "ceramic", "stoneware", "pot", "stock", "sack", "tile", "bath", "leather", "hessian", "fabric", "lantern", "carpet", "plant", "soil"]);
const TIMBER_KINDS = new Set(["timber", "wood", "plank", "planks", "door", "worktop", "pine"]);
const PLASTER_KINDS = new Set(["plaster", "lime", "ochre", "red", "sand", "beige"]);
const MASONRY_KINDS = new Set(["stone", "sandstone", "coping", "brick", "block", "blocks", "trim", "paving", "masonry"]);
const PLASTER_PATTERN = /(plaster|lime|ochre|beige_wall)/i;
const MASONRY_PATTERN = /(stone|brick|block|coping|trim)/i;
const TIMBER_PATTERN = /(timber|wood|plank|door|pine)/i;

export function classifyR8Material(materialName: string, isFloorMesh: boolean): R8SurfaceClass | null {
  if (isFloorMesh) return "floor";
  const name = (materialName.split(".")[0] ?? "").toLowerCase();
  const tokens = name.split("_").filter((token) => token.length > 0 && !/^\d+$/.test(token));
  let kind = tokens[tokens.length - 1] ?? "";
  if (kind === "original" && tokens.length >= 3) kind = tokens[tokens.length - 3]!;
  if (SKIP_KINDS.has(kind)) return null;
  if (TIMBER_KINDS.has(kind)) return "timber";
  if (PLASTER_KINDS.has(kind)) return "plaster";
  if (MASONRY_KINDS.has(kind)) return "masonry";
  // Pack ids end in a qualifier (ph_bz04_painted_plaster_warm, worn_plaster_wall).
  const body = name.replace(/^bz\d+_/, "");
  if (tokens.some((token) => SKIP_KINDS.has(token) && !["red", "sand"].includes(token))) return null;
  if (TIMBER_PATTERN.test(body)) return "timber";
  if (PLASTER_PATTERN.test(body)) return "plaster";
  if (MASONRY_PATTERN.test(body)) return "masonry";
  return null;
}

function isFloorMesh(mesh: Object3D): boolean {
  if (!mesh.name.startsWith("floor-") || mesh.name.startsWith("floor-edge")) return false;
  for (let node: Object3D | null = mesh.parent; node; node = node.parent) {
    if (node.name === "map-pbr-floors") return true;
  }
  return false;
}

function raisedSurfaceUniforms(surfaces: readonly RuntimeTraversalSurface[] | undefined): { rects: Vector4[]; elev: Vector4[]; count: number } {
  const rects: Vector4[] = [];
  const elev: Vector4[] = [];
  for (const surface of surfaces ?? []) {
    const raised = surface.kind === "flat"
      ? Math.abs(surface.elevationM) > 1e-3
      : Math.abs(surface.startElevationM) > 1e-3 || Math.abs(surface.endElevationM) > 1e-3;
    if (!raised || rects.length >= MAX_RAISED_SURFACES) continue;
    // Design x/y map to world x/z.
    rects.push(new Vector4(surface.rect.x, surface.rect.y, surface.rect.x + surface.rect.w, surface.rect.y + surface.rect.h));
    elev.push(surface.kind === "flat"
      ? new Vector4(surface.elevationM, surface.elevationM, 2, 0)
      : new Vector4(surface.startElevationM, surface.endElevationM, surface.axis === "x" ? 0 : 1, 0));
  }
  while (rects.length < MAX_RAISED_SURFACES) {
    rects.push(new Vector4(1e6, 1e6, 1e6, 1e6));
    elev.push(new Vector4(0, 0, 2, 0));
  }
  return { rects, elev, count: rects.length };
}

const NORMAL_BODY = /* glsl */ `
{
  vec2 duv; vec3 dt; vec3 db;
  float fade = 1.0 - smoothstep(10.0, 28.0, length(vViewPosition));
  // Beyond 28 m the detail contributes nothing; skip its fetch.
  if (fade > 0.0) {
    vec3 dn0 = normalize(vR8Normal);
    r8DetailFrame(vR8World, dn0, duv, dt, db);
    vec3 dn = texture2D(uR8DetailNormal, duv / uR8DetailTile).xyz * 2.0 - 1.0;
    vec3 perturb = (viewMatrix * vec4(dt * dn.x + db * dn.y, 0.0)).xyz;
    normal = normalize(normal + perturb * uR8DetailNormalStrength * fade);
  }
}`;

const VERTEX_HEADER = /* glsl */ `
varying vec3 vR8World;
varying vec3 vR8Normal;`;

const VERTEX_BODY = /* glsl */ `
{
  vec4 r8Wp = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    r8Wp = batchingMatrix * r8Wp;
  #endif
  #ifdef USE_INSTANCING
    r8Wp = instanceMatrix * r8Wp;
  #endif
  vR8World = (modelMatrix * r8Wp).xyz;
  vR8Normal = normalize(inverseTransformDirection(transformedNormal, viewMatrix));
}`;

const FRAGMENT_HEADER = /* glsl */ `
varying vec3 vR8World;
varying vec3 vR8Normal;
uniform vec4 uR8RaisedRect[${MAX_RAISED_SURFACES}];
uniform vec4 uR8RaisedElev[${MAX_RAISED_SURFACES}];
uniform float uR8Mottle;
uniform float uR8Warm;
uniform float uR8Grime;
uniform float uR8GrimeHeight;
uniform float uR8Streak;
uniform float uR8Loss;
uniform float uR8Dust;
uniform float uR8IsFloor;
uniform sampler2D uR8DetailNormal;
uniform sampler2D uR8DetailGrunge;
uniform float uR8DetailTile;
uniform float uR8DetailNormalStrength;
uniform float uR8GrungeStrength;

// Detail-map frame shared by albedo and normal: wall faces use (along, up),
// up-facing surfaces use the plan.
void r8DetailFrame(vec3 p, vec3 n, out vec2 uv, out vec3 t, out vec3 b) {
  if (abs(n.y) > 0.7) {
    uv = p.xz; t = vec3(1.0, 0.0, 0.0); b = vec3(0.0, 0.0, 1.0);
  } else if (abs(n.x) > abs(n.z)) {
    uv = vec2(p.z, p.y); t = vec3(0.0, 0.0, sign(n.x)); b = vec3(0.0, 1.0, 0.0);
  } else {
    uv = vec2(p.x, p.y); t = vec3(-sign(n.z), 0.0, 0.0); b = vec3(0.0, 1.0, 0.0);
  }
}

float r8Hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float r8Noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(r8Hash(i), r8Hash(i + vec2(1.0, 0.0)), u.x),
             mix(r8Hash(i + vec2(0.0, 1.0)), r8Hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float r8Fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * r8Noise(p);
    p = p * 2.03 + vec2(17.1, -9.7);
    a *= 0.5;
  }
  return v;
}
// Walking-surface elevation under a design-plan point (world x, world z).
float r8FloorAt(vec2 xz) {
  float floorY = 0.0;
  for (int i = 0; i < ${MAX_RAISED_SURFACES}; i++) {
    vec4 r = uR8RaisedRect[i];
    if (xz.x >= r.x && xz.x <= r.z && xz.y >= r.y && xz.y <= r.w) {
      vec4 e = uR8RaisedElev[i];
      float t = e.z < 0.5 ? (xz.x - r.x) / max(r.z - r.x, 0.001)
              : (e.z < 1.5 ? (xz.y - r.y) / max(r.w - r.y, 0.001) : 0.0);
      floorY = mix(e.x, e.y, clamp(t, 0.0, 1.0));
    }
  }
  return floorY;
}`;

const FRAGMENT_BODY = /* glsl */ `
{
  vec3 r8N = normalize(vR8Normal);
  vec3 r8P = vR8World;
  float r8Luma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  {
    vec2 duv; vec3 dt; vec3 db;
    r8DetailFrame(r8P, r8N, duv, dt, db);
    // Two scales of the same photograph de-correlate its repeat.
    vec3 g1 = texture2D(uR8DetailGrunge, duv / (uR8DetailTile * 2.7)).rgb;
    vec3 g2 = texture2D(uR8DetailGrunge, duv / (uR8DetailTile * 1.1) + vec2(0.37, 0.61)).rgb;
    float grunge = dot(g1 * 0.6 + g2 * 0.4, vec3(0.2126, 0.7152, 0.0722));
    diffuseColor.rgb *= 1.0 + (grunge - 0.5) * 1.6 * uR8GrungeStrength;
  }
  if (uR8IsFloor > 0.5) {
    vec2 q = r8P.xz;
    float mottle = r8Fbm(q * 0.18) - 0.5;
    diffuseColor.rgb *= 1.0 + mottle * uR8Mottle;
    // Wind-blown sand settles into joints and low patches, softening the
    // slab grid without hiding the walking surface.
    float drift = smoothstep(0.52, 0.7, r8Fbm(q * 0.3 + vec2(4.1, 7.3)));
    // Each gated term below is evaluated only where it can be non-zero; the
    // result is identical, the noise work is skipped elsewhere.
    if (drift > 0.0) {
      float grit = r8Noise(q * 9.0) * 0.6 + r8Noise(q * 23.0) * 0.4;
      drift *= smoothstep(0.25, 0.75, grit);
    }
    vec3 sandCol = diffuseColor.rgb * vec3(1.12, 1.02, 0.86) + vec3(0.04, 0.03, 0.01);
    diffuseColor.rgb = mix(diffuseColor.rgb, sandCol, drift * uR8Dust);
    float stain = smoothstep(0.62, 0.8, r8Fbm(q * 0.52 + vec2(-3.3, 1.9)));
    diffuseColor.rgb *= 1.0 - stain * 0.16;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.02, 0.95, 0.84), uR8Warm);
  } else {
    float upness = r8N.y;
    float vertical = 1.0 - smoothstep(0.45, 0.8, abs(upness));
    float along = abs(r8N.x) > abs(r8N.z) ? r8P.z : r8P.x;
    // Sample the walking surface just in front of the face it looks onto.
    float floorY = r8FloorAt(r8P.xz + r8N.xz * 0.6);
    float h = max(r8P.y - floorY, 0.0);
    vec2 wallUv = vec2(along, r8P.y);

    // Broad sun-bleached mottling and warm ochre wash.
    float mottle = r8Fbm(wallUv * vec2(0.32, 0.4)) - 0.5;
    diffuseColor.rgb *= 1.0 + mottle * uR8Mottle;
    float ochre = smoothstep(0.45, 0.8, r8Fbm(wallUv * 0.14 + vec2(9.2, 3.1)));
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.04, 0.9, 0.7), ochre * 0.35 * uR8Warm);
    // Lime plaster in low sun reads as warm cream, never bright white.
    float bright = smoothstep(0.42, 0.85, r8Luma);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.95, 0.84, 0.68), bright * uR8Warm);

    // Spalled render exposing brick/rubble masonry, concentrated low and at
    // storey bands, with a darker broken lip.
    float lossGate = uR8Loss > 0.0 && vertical > 0.0
      ? smoothstep(0.4, 0.58, r8Noise(wallUv * 0.16 + vec2(5.3, -2.1)))
      : 0.0;
    if (lossGate > 0.0) {
      float lossField = r8Fbm(wallUv * vec2(0.62, 0.78) + vec2(-21.3, 13.7));
      float lossBias = 0.05 * (1.0 - smoothstep(0.4, 2.4, h));
      float loss = smoothstep(0.675 - lossBias, 0.69 - lossBias, lossField) * lossGate * vertical * step(0.12, h);
      float lip = (smoothstep(0.65 - lossBias, 0.675 - lossBias, lossField) * lossGate * vertical - loss);
      vec2 brickUv = vec2(along * 4.2 + floor(r8P.y * 7.0) * 0.5, r8P.y * 7.0);
      float mortar = max(step(0.88, fract(brickUv.x)), step(0.8, fract(brickUv.y)));
      vec3 brick = mix(vec3(0.36, 0.29, 0.21), vec3(0.5, 0.41, 0.3), r8Hash(floor(brickUv)));
      brick *= 0.8 + 0.3 * r8Noise(brickUv * 3.1);
      brick = mix(brick, vec3(0.42, 0.37, 0.3), mortar * 0.7);
      // Recessed: exposed masonry sits behind the render and takes its shadow.
      brick *= 0.82;
      diffuseColor.rgb = mix(diffuseColor.rgb, brick, loss * uR8Loss);
      diffuseColor.rgb *= 1.0 - max(lip, 0.0) * 0.45 * uR8Loss;
    }

    // Rain streaks: narrow vertical lanes that fade downward from ledges.
    float lane = smoothstep(0.7, 0.92, r8Noise(vec2(along * 2.1, 0.0))) * vertical * smoothstep(0.8, 2.2, h);
    if (lane > 0.0) {
      float laneBreak = r8Noise(vec2(along * 5.3, r8P.y * 0.16));
      float streak = lane * smoothstep(0.35, 0.75, laneBreak);
      diffuseColor.rgb *= 1.0 - streak * uR8Streak;
    }

    // Ragged grime and sand-splash band at the wall foot.
    // The band top never exceeds 1.39x the grime height (fbm stays below
    // 0.9375), and the tide mark ends 0.06 m above it.
    if (vertical > 0.0 && h < max(uR8GrimeHeight * 1.39, 0.05) + 0.06) {
      float edge = uR8GrimeHeight * (0.45 + 1.0 * r8Fbm(vec2(along * 0.55, 3.7)));
      float grime = 1.0 - smoothstep(0.0, max(edge, 0.05), h);
      grime = pow(grime, 1.4) * vertical;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.66, 0.55, 0.42), grime * uR8Grime);
      // Rising-damp tide mark: a faint darker, salt-stained line at the band top.
      float tide = (smoothstep(edge - 0.12, edge - 0.02, h) - smoothstep(edge - 0.02, edge + 0.06, h)) * vertical;
      diffuseColor.rgb *= 1.0 - tide * 0.14 * uR8Grime;
    }
    float splash = (1.0 - smoothstep(0.0, 0.28, h)) * vertical;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.66, 0.53, 0.38), splash * 0.35 * uR8Grime);

    // Dust settles on up-facing ledges, sills and copings.
    float ledge = smoothstep(0.55, 0.9, upness);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.76, 0.64, 0.48), ledge * uR8Dust);
  }
}`;

function patchMaterial(
  material: MeshStandardMaterial,
  cls: R8SurfaceClass,
  raised: ReturnType<typeof raisedSurfaceUniforms>,
  detail: R8DetailSet,
): void {
  const params = CLASS_PARAMS[cls];
  // Authored relief was tuned for a flat, high-noon read; low sun needs it.
  material.normalScale.multiplyScalar(params.normalBoost);
  material.normalScale.clampScalar(-1.4, 1.4);
  material.roughness = Math.min(material.roughness, params.roughnessCap);
  // Capture the existing program key before replacing onBeforeCompile: the
  // default key is the callback source, which would otherwise collapse every
  // wrapped material onto one program regardless of its earlier patches.
  const previousKey = material.customProgramCacheKey();
  const previousOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader: MaterialShader, renderer: WebGLRenderer): void => {
    previousOnBeforeCompile.call(material, shader, renderer);
    shader.uniforms.uR8RaisedRect = { value: raised.rects };
    shader.uniforms.uR8RaisedElev = { value: raised.elev };
    shader.uniforms.uR8Mottle = { value: params.mottle };
    shader.uniforms.uR8Warm = { value: params.warm };
    shader.uniforms.uR8Grime = { value: params.grime };
    shader.uniforms.uR8GrimeHeight = { value: params.grimeHeight };
    shader.uniforms.uR8Streak = { value: params.streak };
    shader.uniforms.uR8Loss = { value: params.loss };
    shader.uniforms.uR8Dust = { value: params.dust };
    shader.uniforms.uR8IsFloor = { value: cls === "floor" ? 1 : 0 };
    shader.uniforms.uR8DetailNormal = detail.normal;
    shader.uniforms.uR8DetailGrunge = detail.grunge;
    shader.uniforms.uR8DetailTile = { value: detail.tileM };
    shader.uniforms.uR8DetailNormalStrength = { value: params.detailNormal };
    shader.uniforms.uR8GrungeStrength = { value: params.grunge };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>${VERTEX_HEADER}`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>${VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>${FRAGMENT_HEADER}`)
      .replace("#include <color_fragment>", `#include <color_fragment>${FRAGMENT_BODY}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>${NORMAL_BODY}`);
  };
  material.customProgramCacheKey = () => `${previousKey}|r8-weathering-v3`;
  material.userData.r8Weathering = cls;
  material.needsUpdate = true;
}

/**
 * Applies R8 weathering to every eligible material under `root`, once per
 * material instance. Materials are classified by their authored name, so a
 * shared material receives one consistent history wherever it is used.
 */
export function applyR8Weathering(root: Object3D, options: R8WeatheringOptions = {}): R8WeatheringStats {
  const stats: R8WeatheringStats = { plaster: 0, masonry: 0, timber: 0, floor: 0, skipped: 0 };
  const raised = raisedSurfaceUniforms(options.traversalSurfaces);
  const detail = options.detail ?? { plaster: createR8DetailSet(1.2), stone: createR8DetailSet(1.0) };
  const seen = new Set<Material>();
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!(mesh as { isMesh?: boolean }).isMesh) return;
    const floor = isFloorMesh(mesh);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (seen.has(material)) continue;
      seen.add(material);
      const standard = material as MeshStandardMaterial;
      if (!(standard as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial || material.userData.r8Weathering) {
        stats.skipped += 1;
        continue;
      }
      const cls = classifyR8Material(material.name ?? "", floor);
      if (!cls) {
        stats.skipped += 1;
        continue;
      }
      patchMaterial(standard, cls, raised, cls === "plaster" || cls === "timber" ? detail.plaster : detail.stone);
      stats[cls] += 1;
    }
  });
  return stats;
}
