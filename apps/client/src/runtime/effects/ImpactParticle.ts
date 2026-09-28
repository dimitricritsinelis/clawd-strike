import {
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  type Scene,
  UniformsLib,
  UniformsUtils,
} from "three";
import { DeterministicRng } from "../utils/Rng";

/** Surface class reported by the caller; only metal changes the impact look. */
export type ImpactSurface = "default" | "metal";

export type ImpactParticleKind = "dust" | "flash" | "chip" | "puff";

// Dust puff (world impacts). Normal blending so the puff reads as dust against
// sunlit plaster instead of glowing like the old additive sprite.
export const POOL_SIZE = 36;
export const PARTICLE_LIFETIME_S = 0.6;
const DUST_PER_IMPACT = 3;
const DRIFT_SPEED_MPS = 1.2;
// Air drag on the dust drift so the longer-lived puff hangs near the wall
// (about 0.33 m total travel) instead of sliding 0.7 m out over 0.6 s.
const DUST_DRAG_PER_S = 3;
export const START_SCALE = 0.08;
export const END_SCALE = 0.5;
export const START_OPACITY = 0.55;
export const DUST_OPACITY_EXPONENT = 1.5;
// About 15% darker than the old texture stops (210,195,168 / 200,185,155).
const DUST_COLOR_HEX = 0xb3a68f;

// One-frame muzzle-side "tick" of the bullet striking: off-white dust flash,
// orange only when the collider is metal.
export const FLASH_POOL_SIZE = 12;
export const FLASH_SIZE_M = 0.06;
export const FLASH_LIFETIME_S = 0.04;
export const FLASH_DUST_HEX = 0xf2ede4;
export const FLASH_METAL_HEX = 0xffd08a;
const FLASH_OPACITY = 0.9;

// Debris chips thrown off the surface.
export const CHIPS_PER_IMPACT = 4;
export const CHIP_POOL_SIZE = 48;
export const CHIP_SIZE_M = 0.012;
export const CHIP_SPEED_MIN_MPS = 1.5;
export const CHIP_SPEED_MAX_MPS = 3;
export const CHIP_LIFETIME_S = 0.5;
export const CHIP_GRAVITY_MPS2 = 9.8;
const CHIP_COLOR_HEX = 0x4d4538;

// Enemy hit puff (decision D8: neutral dust/fabric, never blood). It shares
// the dust pool so an enemy hit costs no extra draw call.
export const ENEMY_PUFF_SIZE_M = 0.18;
export const ENEMY_PUFF_LIFETIME_S = 0.2;
export const ENEMY_PUFF_HEADSHOT_SCALE = 1.5;
export const ENEMY_PUFF_HEX = 0x9a9284;
const ENEMY_PUFF_PER_HIT = 2;
const ENEMY_PUFF_START_FRACTION = 0.55;
const ENEMY_PUFF_OPACITY = 0.7;
const ENEMY_PUFF_DRIFT_MPS = 0.6;

const CAPACITY = POOL_SIZE + FLASH_POOL_SIZE + CHIP_POOL_SIZE;

type Particle = {
  kind: ImpactParticleKind;
  active: boolean;
  /** Spawned since the last update: skip one aging step so it renders at least once. */
  fresh: boolean;
  age: number;
  life: number;
  /** Monotonic spawn order, used to steal the oldest slot when a pool is full. */
  serial: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  drag: number;
  gravity: number;
  startScale: number;
  endScale: number;
  startOpacity: number;
  r: number;
  g: number;
  b: number;
  scale: number;
  opacity: number;
};

export type ImpactParticleSnapshot = Readonly<Pick<Particle,
  "kind" | "age" | "life" | "x" | "y" | "z" | "vx" | "vy" | "vz" | "scale" | "opacity" | "r" | "g" | "b">>;

type Vec3Like = { x: number; y: number; z: number };

const _color = new Color();

/** Opacity of a dust particle at normalized age t in [0, 1]. */
export function dustOpacityAt(t: number): number {
  const remaining = Math.max(0, 1 - Math.min(1, Math.max(0, t)));
  return START_OPACITY * remaining ** DUST_OPACITY_EXPONENT;
}

const VERTEX_SHADER = /* glsl */ `
attribute vec4 particleOffset;
attribute vec4 particleColor;
varying vec2 vUv;
varying vec4 vColor;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vColor = particleColor;
  // Camera-facing quad: expand around the particle centre in view space.
  vec4 mvCenter = modelViewMatrix * vec4(particleOffset.xyz, 1.0);
  mvCenter.xy += position.xy * particleOffset.w;
  gl_Position = projectionMatrix * mvCenter;
  vec4 mvPosition = mvCenter;
  #include <fog_vertex>
}
`;

const FRAGMENT_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec4 vColor;
#include <fog_pars_fragment>
void main() {
  // Same radial alpha profile as the old 64 px dust texture (0.8, 0.4, 0).
  float d = length(vUv * 2.0 - 1.0);
  float a = d < 0.4 ? mix(0.8, 0.4, d / 0.4) : mix(0.4, 0.0, clamp((d - 0.4) / 0.6, 0.0, 1.0));
  a *= vColor.a;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor.rgb, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/**
 * Pooled world-impact particles: dust puffs, a one-frame impact flash, debris
 * chips and the enemy hit puff. Every particle lives in one instanced
 * camera-facing quad mesh, so any number of simultaneous impacts costs a
 * single draw call (none at rest).
 */
export class ImpactParticle {
  private readonly particles: Particle[];
  private readonly rng: DeterministicRng;
  private readonly geometry: InstancedBufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly offsets: InstancedBufferAttribute;
  private readonly colors: InstancedBufferAttribute;
  private serial = 0;
  private activeCount = 0;

  constructor(scene: Scene, seed = 1) {
    this.rng = new DeterministicRng(seed);
    this.particles = [];
    for (let i = 0; i < CAPACITY; i++) {
      const kind: ImpactParticleKind = i < POOL_SIZE ? "dust" : i < POOL_SIZE + FLASH_POOL_SIZE ? "flash" : "chip";
      this.particles.push({
        kind, active: false, fresh: false, age: 0, life: 1, serial: 0,
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, drag: 0, gravity: 0,
        startScale: 0, endScale: 0, startOpacity: 0, r: 1, g: 1, b: 1, scale: 0, opacity: 0,
      });
    }

    const quad = new PlaneGeometry(1, 1);
    this.geometry = new InstancedBufferGeometry();
    this.geometry.index = quad.index;
    this.geometry.setAttribute("position", quad.getAttribute("position"));
    this.geometry.setAttribute("uv", quad.getAttribute("uv"));
    this.offsets = new InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4);
    this.offsets.setUsage(DynamicDrawUsage);
    this.colors = new InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4);
    this.colors.setUsage(DynamicDrawUsage);
    this.geometry.setAttribute("particleOffset", this.offsets);
    this.geometry.setAttribute("particleColor", this.colors);
    this.geometry.instanceCount = 0;

    this.material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      blending: NormalBlending,
      depthWrite: false,
      // Scene fog (Game sets Fog 60-175 m); the old SpriteMaterial was fogged.
      fog: true,
      uniforms: UniformsUtils.clone(UniformsLib.fog),
    });

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = "ImpactParticles";
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }

  /** World surface impact: dust puff, impact flash and debris chips. */
  emit(position: Vec3Like, normal: Vec3Like, surface: ImpactSurface = "default"): void {
    const rng = this.rng;
    for (let n = 0; n < DUST_PER_IMPACT; n++) {
      const p = this.claim("dust");
      // Slight random offset to the drift direction around the surface normal.
      const jx = (rng.next() - 0.5) * 0.4;
      const jy = rng.next() * 0.3;
      const jz = (rng.next() - 0.5) * 0.4;
      this.place(p, position, PARTICLE_LIFETIME_S);
      p.vx = (normal.x + jx) * DRIFT_SPEED_MPS;
      p.vy = (normal.y + jy) * DRIFT_SPEED_MPS;
      p.vz = (normal.z + jz) * DRIFT_SPEED_MPS;
      p.drag = DUST_DRAG_PER_S;
      p.startScale = START_SCALE;
      p.endScale = END_SCALE;
      p.startOpacity = START_OPACITY;
      this.tint(p, DUST_COLOR_HEX);
    }

    const flash = this.claim("flash");
    this.place(flash, position, FLASH_LIFETIME_S);
    flash.startScale = flash.endScale = FLASH_SIZE_M;
    flash.startOpacity = FLASH_OPACITY;
    this.tint(flash, surface === "metal" ? FLASH_METAL_HEX : FLASH_DUST_HEX);

    for (let n = 0; n < CHIPS_PER_IMPACT; n++) {
      const chip = this.claim("chip");
      this.place(chip, position, CHIP_LIFETIME_S);
      // Cone around the normal, wide enough that chips fan out visibly.
      const dx = normal.x + (rng.next() - 0.5) * 1.4;
      const dy = normal.y + (rng.next() - 0.5) * 1.4 + 0.35;
      const dz = normal.z + (rng.next() - 0.5) * 1.4;
      const length = Math.hypot(dx, dy, dz) || 1;
      const speed = CHIP_SPEED_MIN_MPS + (CHIP_SPEED_MAX_MPS - CHIP_SPEED_MIN_MPS) * rng.next();
      chip.vx = (dx / length) * speed;
      chip.vy = (dy / length) * speed;
      chip.vz = (dz / length) * speed;
      chip.gravity = CHIP_GRAVITY_MPS2;
      chip.startScale = chip.endScale = CHIP_SIZE_M;
      chip.startOpacity = 1;
      this.tint(chip, CHIP_COLOR_HEX);
    }
    this.writeBuffers();
  }

  /**
   * Enemy hit puff at the bullet's entry point. Neutral dust/fabric colour
   * (no blood). `direction` is the bullet's travel direction; the puff drifts
   * back toward the shooter so it stays visible in front of the body.
   */
  emitEnemyHit(position: Vec3Like, headshot = false, direction?: Vec3Like | null): void {
    const rng = this.rng;
    const size = ENEMY_PUFF_SIZE_M * (headshot ? ENEMY_PUFF_HEADSHOT_SCALE : 1);
    let bx = 0;
    let bz = 0;
    if (direction) {
      const length = Math.hypot(direction.x, direction.y, direction.z);
      if (length > 1e-6) {
        bx = -direction.x / length;
        bz = -direction.z / length;
      }
    }
    for (let n = 0; n < ENEMY_PUFF_PER_HIT; n++) {
      const p = this.claim("puff");
      this.place(p, position, ENEMY_PUFF_LIFETIME_S);
      p.vx = (bx + (rng.next() - 0.5) * 0.6) * ENEMY_PUFF_DRIFT_MPS;
      p.vy = (0.35 + rng.next() * 0.3) * ENEMY_PUFF_DRIFT_MPS;
      p.vz = (bz + (rng.next() - 0.5) * 0.6) * ENEMY_PUFF_DRIFT_MPS;
      p.startScale = size * ENEMY_PUFF_START_FRACTION;
      p.endScale = size;
      p.startOpacity = ENEMY_PUFF_OPACITY;
      this.tint(p, ENEMY_PUFF_HEX);
    }
    this.writeBuffers();
  }

  update(dt: number): void {
    if (this.activeCount === 0) return;
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
    for (const p of this.particles) {
      if (!p.active) continue;
      if (p.fresh) {
        // Spawned mid-frame by a shot: the frame's full dt predates it, and a
        // 0.04 s flash would otherwise vanish unseen at low frame rates.
        p.fresh = false;
        continue;
      }
      p.age += step;
      if (p.age >= p.life) {
        p.active = false;
        continue;
      }
      if (p.gravity) p.vy -= p.gravity * step;
      if (p.drag) {
        const damping = Math.exp(-p.drag * step);
        p.vx *= damping;
        p.vy *= damping;
        p.vz *= damping;
      }
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.z += p.vz * step;
      this.shade(p);
    }
    this.writeBuffers();
  }

  clear(): void {
    for (const p of this.particles) p.active = false;
    this.rng.reset();
    this.serial = 0;
    this.writeBuffers();
  }

  dispose(scene: Scene): void {
    scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }

  /** Live particles, for tests and debug overlays. */
  getActiveParticles(kind?: ImpactParticleKind): ImpactParticleSnapshot[] {
    return this.particles.filter((p) => p.active && (kind === undefined || p.kind === kind));
  }

  /** Instanced quads submitted in the next frame (always one draw call). */
  getInstanceCount(): number {
    return this.mesh.visible ? this.geometry.instanceCount : 0;
  }

  private claim(kind: ImpactParticleKind): Particle {
    // Puffs share the dust slots; each other kind has its own slot range.
    const poolKind = kind === "puff" ? "dust" : kind;
    let oldest: Particle | null = null;
    for (let i = 0; i < CAPACITY; i++) {
      const p = this.particles[i]!;
      const slotKind = i < POOL_SIZE ? "dust" : i < POOL_SIZE + FLASH_POOL_SIZE ? "flash" : "chip";
      if (slotKind !== poolKind) continue;
      if (!p.active) {
        p.kind = kind;
        return p;
      }
      if (!oldest || p.serial < oldest.serial) oldest = p;
    }
    // Pool full: steal the oldest so a sustained spray always shows its newest hit.
    oldest!.kind = kind;
    return oldest!;
  }

  private place(p: Particle, position: Vec3Like, life: number): void {
    p.active = true;
    p.fresh = true;
    p.age = 0;
    p.life = life;
    p.serial = ++this.serial;
    p.x = position.x;
    p.y = position.y;
    p.z = position.z;
    p.vx = p.vy = p.vz = 0;
    p.drag = 0;
    p.gravity = 0;
  }

  private tint(p: Particle, hex: number): void {
    _color.setHex(hex);
    p.r = _color.r;
    p.g = _color.g;
    p.b = _color.b;
    this.shade(p);
  }

  private shade(p: Particle): void {
    const t = Math.min(1, p.age / p.life);
    p.scale = p.startScale + (p.endScale - p.startScale) * t;
    if (p.kind === "flash") {
      p.opacity = p.startOpacity;
    } else if (p.kind === "chip") {
      // Solid until the last 30% of life, then fade out.
      p.opacity = p.startOpacity * Math.min(1, (1 - t) / 0.3);
    } else {
      p.opacity = p.startOpacity * (1 - t) ** DUST_OPACITY_EXPONENT;
    }
  }

  private writeBuffers(): void {
    const offsets = this.offsets.array as Float32Array;
    const colors = this.colors.array as Float32Array;
    let count = 0;
    for (const p of this.particles) {
      if (!p.active) continue;
      const o = count * 4;
      offsets[o] = p.x;
      offsets[o + 1] = p.y;
      offsets[o + 2] = p.z;
      offsets[o + 3] = p.scale;
      colors[o] = p.r;
      colors[o + 1] = p.g;
      colors[o + 2] = p.b;
      colors[o + 3] = p.opacity;
      count++;
    }
    this.activeCount = count;
    this.geometry.instanceCount = count;
    this.mesh.visible = count > 0;
    if (count > 0) {
      this.offsets.clearUpdateRanges();
      this.offsets.addUpdateRange(0, count * 4);
      this.offsets.needsUpdate = true;
      this.colors.clearUpdateRanges();
      this.colors.addUpdateRange(0, count * 4);
      this.colors.needsUpdate = true;
    }
  }
}
