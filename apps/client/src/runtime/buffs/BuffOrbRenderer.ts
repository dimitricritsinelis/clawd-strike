import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  UniformsLib,
  UniformsUtils,
  type Material,
  type PerspectiveCamera,
  type Scene,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { BuffOrb } from "./BuffOrb";
import {
  BUFF_DEFINITIONS,
  ORB_BOB_AMPLITUDE_M,
  ORB_BOB_FREQUENCY_HZ,
  ORB_SPAWN_HEIGHT_OFFSET_M,
  type BuffType,
} from "./BuffTypes";

/**
 * Buff orbs are drawn as a pierced brass souk lantern around a colored glass
 * core, with a soft halo, the lantern pattern cast as light on the ground and a
 * spark burst on pickup.
 *
 * Every orb lives in a slot of five persistent instanced meshes (one draw call
 * per layer regardless of orb count or buff type). All motion - rise-in, bob,
 * spin, expiry warning, pickup dissolve and sparks - is evaluated in the vertex
 * shaders from per-slot timestamps and one shared time uniform. The CPU touches
 * GPU buffers only when an orb spawns, is collected or is freed, and then only
 * that slot's range. Nothing is allocated, compiled or added to the scene on
 * drop or pickup, and the meshes are hidden while no slot is live.
 */

const INITIAL_CAPACITY = 24;
const CAPACITY_CHUNK = 8;
const NEVER = 1.0e6;

/** Seconds for the lantern to rise out of the drop point and settle. */
const SPAWN_S = 0.55;
/** Seconds for the lantern to flare and dissolve after pickup. */
const COLLECT_S = 0.3;
/** Seconds the pickup sparks live; the slot is recycled after this. */
const BURST_S = 0.75;
const WARN_S = 2.5;
const EXPIRE_OUT_S = 0.35;
const CAGE_SPIN_RAD_PER_S = 0.8;
const SPARK_COUNT = 14;

const CAGE_RADIUS_M = 0.24;
const CORE_RADIUS_M = 0.155;
const HALO_SIZE_M = 1.05;
/** Uniform size of the whole lantern relative to the authored geometry. */
const ORB_VISUAL_SCALE = 1.35;
const POOL_SIZE_M = 1.2;

const BRASS_COLOR = 0xa27a3f;

const TYPE_INDEX: Record<BuffType, number> = {
  speed_boost: 0,
  rapid_fire: 1,
  unlimited_ammo: 2,
  health_boost: 3,
};

function glslFloat(value: number): string {
  const text = String(value);
  return text.includes(".") || text.includes("e") ? text : `${text}.0`;
}

// Shared by every layer: per-slot attributes and the animation state machine.
const ORB_STATE_GLSL = /* glsl */ `
uniform float uOrbTime;
attribute vec3 iOrigin;
attribute vec3 iColor;
attribute vec3 iDeep;
attribute vec4 iTimes; // spawn, end, collect, phase

const float ORB_TAU = 6.28318530718;
const float ORB_SPAWN_S = ${glslFloat(SPAWN_S)};
const float ORB_COLLECT_S = ${glslFloat(COLLECT_S)};
const float ORB_BURST_S = ${glslFloat(BURST_S)};
const float ORB_WARN_S = ${glslFloat(WARN_S)};
const float ORB_EXPIRE_OUT_S = ${glslFloat(EXPIRE_OUT_S)};
const float ORB_SPIN = ${glslFloat(CAGE_SPIN_RAD_PER_S)};
const float ORB_BOB_M = ${glslFloat(ORB_BOB_AMPLITUDE_M)};
const float ORB_BOB_HZ = ${glslFloat(ORB_BOB_FREQUENCY_HZ)};
const float ORB_HOVER_M = ${glslFloat(ORB_SPAWN_HEIGHT_OFFSET_M)};
const float ORB_SIZE = ${glslFloat(ORB_VISUAL_SCALE)};

struct OrbState {
  vec3 center;
  float scale;
  float spin;
  float glow;
  float collect;
  float visible;
};

float orbEaseOutCubic(float x) {
  float y = 1.0 - x;
  return 1.0 - y * y * y;
}

float orbEaseOutBack(float x) {
  float y = x - 1.0;
  return 1.0 + 2.70158 * y * y * y + 1.70158 * y * y;
}

vec3 orbCenterAt(float t) {
  float age = max(t - iTimes.x, 0.0);
  float rise = orbEaseOutCubic(clamp(age / ORB_SPAWN_S, 0.0, 1.0));
  float bob = sin(age * ORB_TAU * ORB_BOB_HZ + iTimes.w) * ORB_BOB_M * rise;
  float sink = 1.0 - clamp((iTimes.y - t) / ORB_EXPIRE_OUT_S, 0.0, 1.0);
  return iOrigin + vec3(0.0, -(ORB_HOVER_M - 0.14) * (1.0 - rise) + bob - sink * 0.2, 0.0);
}

OrbState orbState() {
  OrbState s;
  float t = uOrbTime;
  float age = t - iTimes.x;
  float toEnd = iTimes.y - t;
  float collectAge = t - iTimes.z;
  s.visible = step(0.0, age) * step(0.0, toEnd) * step(collectAge, ORB_COLLECT_S);
  float p = clamp(age / ORB_SPAWN_S, 0.0, 1.0);
  float c = clamp(collectAge / ORB_COLLECT_S, 0.0, 1.0);
  float leaving = clamp(toEnd / ORB_EXPIRE_OUT_S, 0.0, 1.0);
  s.center = orbCenterAt(min(t, iTimes.z));
  s.scale = s.visible * ORB_SIZE
    * mix(0.2, 1.0, orbEaseOutBack(p))
    * leaving * leaving * (3.0 - 2.0 * leaving)
    * (1.0 + 0.3 * orbEaseOutCubic(c));
  s.spin = age * ORB_SPIN + iTimes.w + 3.2 * orbEaseOutCubic(p);
  float warn = 1.0 - clamp(toEnd / ORB_WARN_S, 0.0, 1.0);
  float blink = 0.5 + 0.5 * sin(230.0 / (toEnd + 1.0));
  float spawnFlash = (1.0 - p) * (1.0 - p);
  float collectFlash = step(0.0, collectAge) * (1.0 - c);
  // Slow breathing that swells to a bright peak and settles back.
  float breath = 0.5 + 0.5 * sin(age * 2.3 + iTimes.w * 3.0);
  s.glow = (0.8 + 0.95 * breath * breath)
    * (1.0 + 1.3 * spawnFlash + 2.0 * collectFlash)
    * (1.0 - warn * 0.6 * blink);
  s.collect = c;
  return s;
}

vec3 orbRotateY(vec3 v, float a) {
  float cs = cos(a);
  float sn = sin(a);
  return vec3(cs * v.x + sn * v.z, v.y, -sn * v.x + cs * v.z);
}
`;

// Additive layers fade toward black in fog instead of toward the fog color.
const ADDITIVE_FOG_GLSL = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float orbFog = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    float orbFog = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  orbColor *= 1.0 - orbFog;
#endif
`;

function createCageMaterial(timeUniform: { value: number }): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: BRASS_COLOR,
    metalness: 0.7,
    roughness: 0.38,
    side: DoubleSide,
  });
  material.name = "buff-orb-cage";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uOrbTime = timeUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
${ORB_STATE_GLSL}
attribute float aPierce;
varying vec3 vCagePos;
varying vec3 vOrbColor;
varying float vOrbGlow;
varying float vOrbCollect;
varying float vPierce;`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `OrbState orb = orbState();
vec3 objectNormal = orbRotateY(normal, orb.spin);
#ifdef USE_TANGENT
  vec3 objectTangent = orbRotateY(tangent.xyz, orb.spin);
#endif
vCagePos = position;
vOrbColor = iColor;
vOrbGlow = orb.glow;
vOrbCollect = orb.collect;
vPierce = aPierce;`,
      )
      .replace(
        "#include <begin_vertex>",
        "vec3 transformed = orbRotateY(position, orb.spin) * orb.scale + orb.center;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
const float ORB_TAU = 6.28318530718;
varying vec3 vCagePos;
varying vec3 vOrbColor;
varying float vOrbGlow;
varying float vOrbCollect;
varying float vPierce;

float orbHash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}`,
      )
      .replace(
        "#include <alphatest_fragment>",
        `#include <alphatest_fragment>
vec3 orbEmission = vec3(0.0);
{
  float hole = 0.0;
  float edge = 0.0;
  float engrave = 0.0;
  float holeLod = 1.0;
  float farGlow = 0.0;
  if (vPierce > 0.5) {
    vec3 n = normalize(vCagePos);
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float lon = atan(n.z, n.x);
    float al = abs(lat);
    float coslat = max(cos(lat), 0.05);
    float d = 2.0;
    float r = 0.0;
    if (al > 0.075 && al < 0.98) {
      // Two rows of twelve cells between the equator rib and the caps: an
      // eight-point khatam star with small drilled dots between the stars,
      // then staggered teardrops that point toward the poles.
      float rowT = (al - 0.075) / 0.4525;
      float row = floor(rowT);
      float fv = (fract(rowT) - 0.5) * 0.4525;
      float cellW = ORB_TAU / 12.0 * coslat;
      float cu = lon / ORB_TAU * 12.0 + row * 0.5;
      float fu = (fract(cu) - 0.5) * cellW;
      vec2 q = vec2(fu, fv);
      if (row < 0.5) {
        vec2 r45 = vec2(q.x + q.y, q.x - q.y) * 0.70710678;
        float star = min(max(abs(q.x), abs(q.y)), max(abs(r45.x), abs(r45.y))) / 0.1;
        float drill = length(vec2(abs(q.x) - cellW * 0.5, q.y)) / 0.026;
        d = min(star, drill);
      } else {
        vec2 a = vec2(q.x / 0.075, (q.y + 0.02) / 0.15);
        d = length(vec2(a.x * (1.0 + max(a.y, 0.0) * 2.6), a.y));
      }
      r = 1.0;
    } else if (al > 1.06 && al < 1.26) {
      // A ring of small round piercings in each cap.
      float fv = al - 1.16;
      float fu = (fract(lon / ORB_TAU * 16.0) - 0.5) * (ORB_TAU / 16.0) * coslat;
      d = length(vec2(fu, fv)) / 0.042;
      r = 1.0;
    }
    r *= 1.0 + vOrbCollect * 2.4;
    float aa = max(fwidth(d), 1.0e-4);
    hole = (1.0 - smoothstep(r - aa, r + aa, d)) * step(0.001, r);
    edge = (1.0 - smoothstep(r, r * 1.35, d)) * step(0.001, r);
    // A chased line just outside each piercing, as on hand-worked brass.
    engrave = smoothstep(r * 1.42, r * 1.5, d) * (1.0 - smoothstep(r * 1.58, r * 1.66, d)) * step(0.001, r);
    // Once a piercing is only a few pixels wide a hard cut would shimmer, so
    // the pattern turns into filtered glowing light on the shell, and further
    // out into its average coverage.
    float footprint = length(fwidth(vCagePos));
    holeLod = 1.0 - smoothstep(0.005, 0.013, footprint);
    if (hole * holeLod > 0.5) discard;
    float clarity = 1.0 - smoothstep(0.015, 0.04, footprint);
    farGlow = mix(0.3, hole, clarity) * (1.0 - holeLod);
  }
  if (orbHash(floor(vCagePos * 70.0)) < vOrbCollect * vOrbCollect * 1.15) discard;
  vec3 glowColor = vOrbColor * vOrbGlow;
  if (gl_FrontFacing) {
    diffuseColor.rgb *= 1.0 - 0.45 * engrave * holeLod;
    orbEmission += glowColor * edge * holeLod * 0.55;
  } else {
    diffuseColor.rgb *= 0.35;
    orbEmission += glowColor * 0.85 * vPierce;
  }
  diffuseColor.rgb *= 1.0 - farGlow;
  orbEmission += glowColor * farGlow * 1.1;
  orbEmission += vOrbColor * vOrbCollect * 1.6;
}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance += orbEmission;`,
      );
  };
  material.customProgramCacheKey = () => "buff-orb-cage-v1";
  return material;
}

function createCoreMaterial(timeUniform: { value: number }): ShaderMaterial {
  const material = new ShaderMaterial({
    name: "buff-orb-core",
    uniforms: UniformsUtils.merge([UniformsLib.fog]),
    fog: true,
    vertexShader: /* glsl */ `
#include <common>
#include <fog_pars_vertex>
${ORB_STATE_GLSL}
varying vec3 vViewNormal;
varying vec3 vViewDir;
varying vec3 vLocal;
varying vec3 vColor;
varying vec3 vDeep;
varying float vGlow;

void main() {
  OrbState orb = orbState();
  // The glass pops outward slightly harder than the cage, then vanishes.
  float coreScale = orb.scale * (1.0 + 0.5 * orb.collect) * (1.0 - orb.collect * orb.collect);
  float coreSpin = -orb.spin * 0.6;
  vec3 world = orbRotateY(position, coreSpin) * coreScale + orb.center;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  vViewNormal = normalize((viewMatrix * vec4(orbRotateY(normal, coreSpin), 0.0)).xyz);
  vViewDir = -mvPosition.xyz;
  vLocal = position / ${glslFloat(CORE_RADIUS_M)};
  vColor = iColor;
  vDeep = iDeep;
  vGlow = orb.glow;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uOrbTime;
varying vec3 vViewNormal;
varying vec3 vViewDir;
varying vec3 vLocal;
varying vec3 vColor;
varying vec3 vDeep;
varying float vGlow;

void main() {
  float ndv = clamp(dot(normalize(vViewNormal), normalize(vViewDir)), 0.0, 1.0);
  // Slow flame-like movement inside the glass.
  float swirl = 0.5 + 0.5 * sin(vLocal.y * 6.0 + uOrbTime * 2.1 + sin(vLocal.x * 4.0 - uOrbTime * 1.6) * 1.8);
  // Deep saturated glass at the rim, the lit colour through the body and a
  // small warm flame at the heart.
  vec3 body = mix(vDeep, vColor * 1.3, smoothstep(0.05, 0.8, ndv));
  vec3 heart = vColor * 1.6 + vec3(0.35, 0.22, 0.08);
  vec3 color = mix(body, heart, smoothstep(0.75, 1.0, ndv) * (0.55 + 0.25 * swirl));
  color *= vGlow;
  color += vColor * pow(1.0 - ndv, 3.0) * 0.3;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`,
  });
  material.uniforms.uOrbTime = timeUniform;
  return material;
}

function createHaloMaterial(timeUniform: { value: number }): ShaderMaterial {
  const material = new ShaderMaterial({
    name: "buff-orb-halo",
    uniforms: UniformsUtils.merge([UniformsLib.fog]),
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
#include <common>
#include <fog_pars_vertex>
${ORB_STATE_GLSL}
varying vec2 vUv;
varying vec3 vColor;
varying float vStrength;

void main() {
  OrbState orb = orbState();
  float c = orb.collect;
  vec4 mvPosition = viewMatrix * vec4(orb.center, 1.0);
  // Sit just behind the lantern: the brass occludes the middle and the glow
  // reads as a corona around it and through its piercings.
  mvPosition.xyz -= normalize(-mvPosition.xyz) * 0.3;
  float size = ${glslFloat(HALO_SIZE_M)} * orb.scale * (1.0 + 1.1 * c);
  mvPosition.xy += position.xy * size;
  vUv = uv;
  vColor = iColor;
  // The corona swells harder than the lantern so the breathing peak reads.
  vStrength = pow(orb.glow, 1.5) * (1.0 - c);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: /* glsl */ `
#include <common>
#include <fog_pars_fragment>
varying vec2 vUv;
varying vec3 vColor;
varying float vStrength;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float falloff = 1.0 - clamp(d, 0.0, 1.0);
  vec3 orbColor = vColor * falloff * falloff * 0.42 * vStrength;
  ${ADDITIVE_FOG_GLSL}
  gl_FragColor = vec4(orbColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  material.uniforms.uOrbTime = timeUniform;
  return material;
}

function createPoolMaterial(timeUniform: { value: number }): ShaderMaterial {
  const material = new ShaderMaterial({
    name: "buff-orb-pool",
    uniforms: UniformsUtils.merge([UniformsLib.fog]),
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: /* glsl */ `
#include <common>
#include <fog_pars_vertex>
${ORB_STATE_GLSL}
varying vec2 vPool;
varying vec3 vColor;
varying float vStrength;
varying float vSpin;

void main() {
  OrbState orb = orbState();
  float size = ${glslFloat(POOL_SIZE_M)} * min(orb.scale, ORB_SIZE);
  float groundY = iOrigin.y - ORB_HOVER_M + 0.02;
  vec3 world = vec3(orb.center.x + position.x * size, groundY, orb.center.z - position.y * size);
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  vPool = position.xy * 2.0;
  vColor = iColor;
  // Closer to the ground the cast pattern is brighter.
  float height = clamp((orb.center.y - groundY) / ORB_HOVER_M, 0.3, 1.6);
  vStrength = orb.glow * (1.0 - orb.collect) / height;
  vSpin = orb.spin;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: /* glsl */ `
#include <common>
#include <fog_pars_fragment>
varying vec2 vPool;
varying vec3 vColor;
varying float vStrength;
varying float vSpin;

void main() {
  float r = length(vPool);
  if (r > 1.0) discard;
  float ang = atan(vPool.y, vPool.x) + vSpin;
  // Light thrown through the two rows of piercings, turning with the cage.
  float a1 = (fract(ang / 6.28318530718 * 12.0) - 0.5) * 0.524 * r;
  float a2 = (fract(ang / 6.28318530718 * 12.0 + 0.5) - 0.5) * 0.524 * r;
  float specks = exp(-(a1 * a1 + (r - 0.38) * (r - 0.38)) / 0.0022)
    + 0.7 * exp(-(a2 * a2 * 2.2 + (r - 0.7) * (r - 0.7) * 0.6) / 0.0016);
  float pool = exp(-r * r * 4.0) * 0.4 + specks * 0.42;
  pool *= 1.0 - smoothstep(0.82, 1.0, r);
  vec3 orbColor = vColor * pool * 0.55 * vStrength;
  ${ADDITIVE_FOG_GLSL}
  gl_FragColor = vec4(orbColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  material.uniforms.uOrbTime = timeUniform;
  return material;
}

function createSparkMaterial(timeUniform: { value: number }): ShaderMaterial {
  const material = new ShaderMaterial({
    name: "buff-orb-sparks",
    uniforms: UniformsUtils.merge([UniformsLib.fog]),
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
#include <common>
#include <fog_pars_vertex>
${ORB_STATE_GLSL}
attribute float aSpark;
varying vec2 vUv;
varying vec3 vColor;
varying float vStrength;

vec3 orbHash3(float n) {
  return fract(sin(vec3(n, n + 1.7, n + 3.1) * vec3(43758.5453, 22578.145, 19642.349)));
}

void main() {
  float age = uOrbTime - iTimes.z;
  if (age < 0.0 || age > ORB_BURST_S) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }
  float life = age / ORB_BURST_S;
  vec3 h = orbHash3(aSpark * 7.13 + iTimes.w * 3.7);
  vec3 dir = normalize(vec3(h.x * 2.0 - 1.0, 0.25 + h.y * 1.1, h.z * 2.0 - 1.0));
  float speed = 2.0 + h.x * 1.8;
  float travel = speed * (1.0 - exp(-age * 4.5)) / 4.5;
  vec3 world = orbCenterAt(iTimes.z) + dir * (0.12 * ORB_SIZE + travel) - vec3(0.0, 2.4 * age * age, 0.0);
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  mvPosition.xy += position.xy * (0.05 + 0.03 * h.z) * (1.0 - life);
  vUv = uv;
  vColor = mix(vec3(1.0, 0.72, 0.36), iColor, 0.3 + 0.5 * h.y);
  vStrength = (1.0 - life) * 2.2;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: /* glsl */ `
#include <common>
#include <fog_pars_fragment>
varying vec2 vUv;
varying vec3 vColor;
varying float vStrength;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float falloff = 1.0 - clamp(d, 0.0, 1.0);
  vec3 orbColor = vColor * falloff * falloff * vStrength;
  ${ADDITIVE_FOG_GLSL}
  gl_FragColor = vec4(orbColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  material.uniforms.uOrbTime = timeUniform;
  return material;
}

function withPierce(geometry: BufferGeometry, pierce: number): BufferGeometry {
  const count = geometry.getAttribute("position").count;
  geometry.setAttribute("aPierce", new BufferAttribute(new Float32Array(count).fill(pierce), 1));
  return geometry;
}

/** Pierced shell, equator rib and the collar, finial and hanging loop of a souk lantern. */
function createCageGeometry(): BufferGeometry {
  const r = CAGE_RADIUS_M;
  const parts: BufferGeometry[] = [
    withPierce(new SphereGeometry(r, 28, 20), 1),
    withPierce(new TorusGeometry(r + 0.002, 0.008, 6, 48).rotateX(Math.PI / 2), 0),
    withPierce(new CylinderGeometry(0.07, 0.09, 0.035, 20).translate(0, r - 0.01, 0), 0),
    withPierce(new CylinderGeometry(0.018, 0.068, 0.07, 20).translate(0, r + 0.042, 0), 0),
    withPierce(new SphereGeometry(0.022, 12, 8).translate(0, r + 0.09, 0), 0),
    withPierce(new TorusGeometry(0.03, 0.0065, 6, 16).translate(0, r + 0.135, 0), 0),
    withPierce(new CylinderGeometry(0.09, 0.07, 0.03, 20).translate(0, -r + 0.008, 0), 0),
    withPierce(new CylinderGeometry(0.06, 0.006, 0.11, 20).translate(0, -r - 0.062, 0), 0),
    withPierce(new SphereGeometry(0.018, 10, 6).translate(0, -r - 0.125, 0), 0),
  ];
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("buff orb cage geometry merge failed");
  return merged;
}

function createSparkGeometry(): BufferGeometry {
  const positions = new Float32Array(SPARK_COUNT * 4 * 3);
  const uvs = new Float32Array(SPARK_COUNT * 4 * 2);
  const sparkIds = new Float32Array(SPARK_COUNT * 4);
  const indices: number[] = [];
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]] as const;
  for (let spark = 0; spark < SPARK_COUNT; spark += 1) {
    for (let corner = 0; corner < 4; corner += 1) {
      const vertex = spark * 4 + corner;
      positions[vertex * 3] = corners[corner]![0];
      positions[vertex * 3 + 1] = corners[corner]![1];
      uvs[vertex * 2] = corners[corner]![0] + 0.5;
      uvs[vertex * 2 + 1] = corners[corner]![1] + 0.5;
      sparkIds[vertex] = spark;
    }
    const base = spark * 4;
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setAttribute("aSpark", new BufferAttribute(sparkIds, 1));
  geometry.setIndex(indices);
  return geometry;
}

type SlotAttributes = {
  origin: InstancedBufferAttribute;
  color: InstancedBufferAttribute;
  deep: InstancedBufferAttribute;
  times: InstancedBufferAttribute;
};

function createSlotAttributes(capacity: number, previous?: SlotAttributes): SlotAttributes {
  const make = (itemSize: number, old?: InstancedBufferAttribute): InstancedBufferAttribute => {
    const array = new Float32Array(capacity * itemSize);
    if (old) {
      array.set(old.array as Float32Array);
    }
    return new InstancedBufferAttribute(array, itemSize);
  };
  const attributes = {
    origin: make(3, previous?.origin),
    color: make(3, previous?.color),
    deep: make(3, previous?.deep),
    times: make(4, previous?.times),
  };
  const times = attributes.times.array as Float32Array;
  const firstNew = previous ? previous.times.count : 0;
  for (let slot = firstNew; slot < capacity; slot += 1) {
    times[slot * 4] = NEVER;
    times[slot * 4 + 1] = -NEVER;
    times[slot * 4 + 2] = NEVER;
  }
  return attributes;
}

// Linear-space glass colors per buff, indexed like TYPE_INDEX.
const GLASS_COLORS: readonly { bright: Color; deep: Color }[] = (
  ["speed_boost", "rapid_fire", "unlimited_ammo", "health_boost"] as const
).map((type) => ({
  bright: new Color(BUFF_DEFINITIONS[type].orbColor),
  deep: new Color(BUFF_DEFINITIONS[type].orbEmissive),
}));

export class BuffOrbRenderer {
  private readonly scene: Scene;
  private readonly timeUniform = { value: 0 };
  private readonly layers: Mesh<InstancedBufferGeometry, Material>[] = [];
  private readonly materials: Material[] = [];
  private attributes: SlotAttributes;
  private capacity: number;
  /** Seconds at which a slot no longer draws anything; NaN when free. */
  private releaseAt: Float64Array;
  private slotOwner: (BuffOrb | null)[];
  private freeSlots: number[] = [];
  private liveSlots = 0;
  private highWater = 0;
  private warmupSlot = -1;

  constructor(scene: Scene, initialCapacity = INITIAL_CAPACITY) {
    this.scene = scene;
    this.capacity = Math.max(1, initialCapacity);
    this.attributes = createSlotAttributes(this.capacity);
    this.releaseAt = new Float64Array(this.capacity).fill(Number.NaN);
    this.slotOwner = new Array<BuffOrb | null>(this.capacity).fill(null);
    for (let slot = this.capacity - 1; slot >= 0; slot -= 1) this.freeSlots.push(slot);

    const time = this.timeUniform;
    const cageBase = createCageGeometry();
    const coreBase = new SphereGeometry(CORE_RADIUS_M, 20, 14);
    const quadBase = new PlaneGeometry(1, 1);
    const sparkBase = createSparkGeometry();
    const specs: [BufferGeometry, Material, number][] = [
      [cageBase, createCageMaterial(time), 0],
      [coreBase, createCoreMaterial(time), 0],
      [quadBase, createPoolMaterial(time), 1],
      [quadBase, createHaloMaterial(time), 2],
      [sparkBase, createSparkMaterial(time), 3],
    ];
    for (const [base, material, renderOrder] of specs) {
      const geometry = new InstancedBufferGeometry().copy(base as InstancedBufferGeometry);
      geometry.instanceCount = 0;
      const mesh = new Mesh(geometry, material);
      mesh.name = `buff-orb-${material.name}`;
      mesh.frustumCulled = false;
      mesh.renderOrder = renderOrder;
      mesh.matrixAutoUpdate = false;
      mesh.visible = false;
      if (material instanceof MeshStandardMaterial) {
        mesh.receiveShadow = true;
      }
      this.layers.push(mesh);
      this.materials.push(material);
      scene.add(mesh);
    }
    cageBase.dispose();
    coreBase.dispose();
    quadBase.dispose();
    sparkBase.dispose();
    this.bindAttributes();
  }

  getCapacity(): number {
    return this.capacity;
  }

  spawn(orb: BuffOrb): void {
    if (orb.renderSlot >= 0) return;
    const slot = this.allocateSlot();
    const colors = GLASS_COLORS[TYPE_INDEX[orb.getBuffType()]]!;
    const position = orb.getPosition();
    const now = this.timeUniform.value;
    const end = now + orb.getLifetime() - orb.getAge();
    this.writeVec3(this.attributes.origin, slot, position.x, position.y, position.z);
    this.writeVec3(this.attributes.color, slot, colors.bright.r, colors.bright.g, colors.bright.b);
    this.writeVec3(this.attributes.deep, slot, colors.deep.r, colors.deep.g, colors.deep.b);
    this.writeTimes(slot, now - orb.getAge(), end, NEVER, orb.bobPhase);
    this.slotOwner[slot] = orb;
    this.releaseAt[slot] = end;
    orb.renderSlot = slot;
  }

  /** Starts the pickup flare and sparks; the slot frees itself when they finish. */
  collect(orb: BuffOrb): void {
    const slot = orb.renderSlot;
    if (slot < 0) return;
    orb.renderSlot = -1;
    this.slotOwner[slot] = null;
    const now = this.timeUniform.value;
    const times = this.attributes.times.array as Float32Array;
    times[slot * 4 + 1] = Math.max(times[slot * 4 + 1]!, now + COLLECT_S);
    times[slot * 4 + 2] = now;
    this.markDirty(this.attributes.times, slot);
    this.releaseAt[slot] = now + BURST_S;
  }

  /** Frees an orb's slot without a burst (expiry or clearing). */
  remove(orb: BuffOrb): void {
    const slot = orb.renderSlot;
    if (slot < 0) return;
    orb.renderSlot = -1;
    this.freeSlot(slot);
  }

  clear(): void {
    for (let slot = 0; slot < this.capacity; slot += 1) {
      const owner = this.slotOwner[slot];
      if (owner) owner.renderSlot = -1;
      if (!Number.isNaN(this.releaseAt[slot]!)) this.freeSlot(slot);
    }
    this.warmupSlot = -1;
  }

  update(deltaSeconds: number): void {
    const now = this.timeUniform.value + deltaSeconds;
    this.timeUniform.value = now;
    if (this.liveSlots === 0) return;
    for (let slot = 0; slot < this.highWater; slot += 1) {
      const releaseAt = this.releaseAt[slot]!;
      if (!Number.isNaN(releaseAt) && releaseAt <= now && this.slotOwner[slot] === null && slot !== this.warmupSlot) {
        this.freeSlot(slot);
      }
    }
  }

  /**
   * Shows one idle lantern in front of the camera so boot-time compilation and
   * the hidden warmup render build every orb program and upload its buffers.
   * The returned function removes it.
   */
  warmup(camera: PerspectiveCamera): () => void {
    if (this.warmupSlot < 0) {
      const slot = this.allocateSlot();
      const forward = camera.getWorldDirection(camera.position.clone());
      const colors = GLASS_COLORS[0]!;
      this.writeVec3(
        this.attributes.origin,
        slot,
        camera.position.x + forward.x * 4,
        camera.position.y - 0.35,
        camera.position.z + forward.z * 4,
      );
      this.writeVec3(this.attributes.color, slot, colors.bright.r, colors.bright.g, colors.bright.b);
      this.writeVec3(this.attributes.deep, slot, colors.deep.r, colors.deep.g, colors.deep.b);
      const now = this.timeUniform.value;
      this.writeTimes(slot, now - 1, now + NEVER, NEVER, 0);
      this.releaseAt[slot] = now + NEVER;
      this.warmupSlot = slot;
    }
    return () => {
      if (this.warmupSlot >= 0) {
        this.freeSlot(this.warmupSlot);
        this.warmupSlot = -1;
      }
    };
  }

  dispose(): void {
    for (const mesh of this.layers) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const material of this.materials) material.dispose();
    this.layers.length = 0;
    this.materials.length = 0;
    this.liveSlots = 0;
    this.highWater = 0;
  }

  private allocateSlot(): number {
    if (this.freeSlots.length === 0) this.grow();
    // Lowest free slot first keeps the drawn range compact.
    let bestIndex = 0;
    for (let index = 1; index < this.freeSlots.length; index += 1) {
      if (this.freeSlots[index]! < this.freeSlots[bestIndex]!) bestIndex = index;
    }
    const slot = this.freeSlots[bestIndex]!;
    this.freeSlots[bestIndex] = this.freeSlots[this.freeSlots.length - 1]!;
    this.freeSlots.pop();
    this.liveSlots += 1;
    if (slot + 1 > this.highWater) this.setHighWater(slot + 1);
    return slot;
  }

  private freeSlot(slot: number): void {
    if (Number.isNaN(this.releaseAt[slot]!)) return;
    this.releaseAt[slot] = Number.NaN;
    this.slotOwner[slot] = null;
    this.writeTimes(slot, NEVER, -NEVER, NEVER, 0);
    this.freeSlots.push(slot);
    this.liveSlots -= 1;
    let highWater = this.highWater;
    while (highWater > 0 && Number.isNaN(this.releaseAt[highWater - 1]!)) highWater -= 1;
    this.setHighWater(highWater);
  }

  private setHighWater(highWater: number): void {
    this.highWater = highWater;
    for (const mesh of this.layers) {
      mesh.geometry.instanceCount = highWater;
      mesh.visible = highWater > 0;
    }
  }

  private grow(): void {
    const nextCapacity = this.capacity + CAPACITY_CHUNK;
    this.attributes = createSlotAttributes(nextCapacity, this.attributes);
    const releaseAt = new Float64Array(nextCapacity).fill(Number.NaN);
    releaseAt.set(this.releaseAt);
    this.releaseAt = releaseAt;
    for (let slot = nextCapacity - 1; slot >= this.capacity; slot -= 1) {
      this.slotOwner.push(null);
      this.freeSlots.push(slot);
    }
    this.capacity = nextCapacity;
    for (const mesh of this.layers) {
      // Release the old per-slot buffers before binding the larger ones.
      mesh.geometry.dispose();
    }
    this.bindAttributes();
  }

  private bindAttributes(): void {
    for (const mesh of this.layers) {
      const geometry = mesh.geometry;
      geometry.setAttribute("iOrigin", this.attributes.origin);
      geometry.setAttribute("iColor", this.attributes.color);
      geometry.setAttribute("iDeep", this.attributes.deep);
      geometry.setAttribute("iTimes", this.attributes.times);
      geometry.instanceCount = this.highWater;
    }
  }

  private writeVec3(attribute: InstancedBufferAttribute, slot: number, x: number, y: number, z: number): void {
    const array = attribute.array as Float32Array;
    array[slot * 3] = x;
    array[slot * 3 + 1] = y;
    array[slot * 3 + 2] = z;
    this.markDirty(attribute, slot);
  }

  private writeTimes(slot: number, spawn: number, end: number, collect: number, phase: number): void {
    const array = this.attributes.times.array as Float32Array;
    array[slot * 4] = spawn;
    array[slot * 4 + 1] = end;
    array[slot * 4 + 2] = collect;
    array[slot * 4 + 3] = phase;
    this.markDirty(this.attributes.times, slot);
  }

  private markDirty(attribute: InstancedBufferAttribute, slot: number): void {
    attribute.addUpdateRange(slot * attribute.itemSize, attribute.itemSize);
    attribute.needsUpdate = true;
  }
}
