import assert from "node:assert/strict";
import test from "node:test";
import { AdditiveBlending, Color, Mesh, NormalBlending, Scene, ShaderMaterial } from "three";
import {
  CHIP_GRAVITY_MPS2,
  CHIP_LIFETIME_S,
  CHIP_SIZE_M,
  CHIP_SPEED_MAX_MPS,
  CHIP_SPEED_MIN_MPS,
  CHIPS_PER_IMPACT,
  END_SCALE,
  FLASH_DUST_HEX,
  FLASH_LIFETIME_S,
  FLASH_METAL_HEX,
  FLASH_SIZE_M,
  ImpactParticle,
  PARTICLE_LIFETIME_S,
  POOL_SIZE,
  START_OPACITY,
  dustOpacityAt,
} from "./ImpactParticle";

const WALL = { x: 1, y: 1.5, z: 2 };
const NORMAL = { x: 0, y: 0, z: 1 };

function particleMeshes(scene: Scene): Mesh[] {
  const meshes: Mesh[] = [];
  scene.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
  return meshes;
}

function closeTo(actual: number, expected: number, tolerance = 1e-6): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test("impacts use one normal-blended instanced mesh, so draw calls stay flat", () => {
  const scene = new Scene();
  const particles = new ImpactParticle(scene, 7);
  const meshes = particleMeshes(scene);
  assert.equal(meshes.length, 1);
  const material = meshes[0]!.material as ShaderMaterial;
  assert.equal(material.blending, NormalBlending);
  assert.notEqual(material.blending, AdditiveBlending);
  assert.equal(material.depthWrite, false);
  assert.equal(material.fog, true, "impacts fade into the scene fog like the old sprites");
  assert.ok(material.uniforms.fogColor && material.uniforms.fogNear && material.uniforms.fogFar);
  assert.match(material.vertexShader, /#include <fog_vertex>/);
  assert.match(material.fragmentShader, /#include <fog_fragment>/);
  assert.equal(meshes[0]!.visible, false, "nothing is submitted at rest");

  for (let i = 0; i < 4; i++) particles.emit({ x: i, y: 1, z: 0 }, NORMAL);
  assert.equal(particleMeshes(scene).length, 1, "four simultaneous hits add no objects");
  assert.equal(meshes[0]!.visible, true);
  assert.equal(particles.getInstanceCount(), 4 * (3 + 1 + CHIPS_PER_IMPACT));
});

test("a wall impact spawns dust, a one-frame off-white flash and four debris chips", () => {
  const particles = new ImpactParticle(new Scene(), 3);
  particles.emit(WALL, NORMAL);
  const dust = particles.getActiveParticles("dust");
  const flash = particles.getActiveParticles("flash");
  const chips = particles.getActiveParticles("chip");
  assert.equal(dust.length, 3);
  assert.equal(flash.length, 1);
  assert.equal(chips.length, CHIPS_PER_IMPACT);

  for (const p of dust) {
    assert.equal(p.life, PARTICLE_LIFETIME_S);
    closeTo(p.opacity, START_OPACITY);
    // About 15% darker than the old (210,195,168) texture centre.
    const srgb = new Color(p.r, p.g, p.b).getHex();
    assert.equal(srgb, 0xb3a68f);
  }

  const expectedFlash = new Color(FLASH_DUST_HEX);
  closeTo(flash[0]!.scale, FLASH_SIZE_M);
  assert.equal(flash[0]!.life, FLASH_LIFETIME_S);
  closeTo(flash[0]!.r, expectedFlash.r);
  closeTo(flash[0]!.g, expectedFlash.g);
  closeTo(flash[0]!.b, expectedFlash.b);

  for (const chip of chips) {
    closeTo(chip.scale, CHIP_SIZE_M);
    assert.equal(chip.life, CHIP_LIFETIME_S);
    const speed = Math.hypot(chip.vx, chip.vy, chip.vz);
    assert.ok(speed >= CHIP_SPEED_MIN_MPS - 1e-9 && speed <= CHIP_SPEED_MAX_MPS + 1e-9, `${speed}`);
    assert.ok(chip.vz > 0, "chips leave the surface along its normal");
  }
});

test("the impact flash turns orange only on metal", () => {
  const particles = new ImpactParticle(new Scene(), 3);
  particles.emit(WALL, NORMAL, "metal");
  const flash = particles.getActiveParticles("flash")[0]!;
  const metal = new Color(FLASH_METAL_HEX);
  closeTo(flash.r, metal.r);
  closeTo(flash.g, metal.g);
  closeTo(flash.b, metal.b);
});

test("the flash is always rendered once, then gone after 0.04 s", () => {
  const particles = new ImpactParticle(new Scene(), 3);
  particles.emit(WALL, NORMAL);
  // Spawned mid-frame at 20 fps: the frame's dt must not erase it unseen.
  particles.update(0.05);
  assert.equal(particles.getActiveParticles("flash").length, 1);
  particles.update(0.05);
  assert.equal(particles.getActiveParticles("flash").length, 0);
});

test("dust fades with (1 - t)^1.5 and grows to END_SCALE over 0.6 s", () => {
  closeTo(dustOpacityAt(0), START_OPACITY);
  closeTo(dustOpacityAt(0.5), START_OPACITY * 0.5 ** 1.5);
  closeTo(dustOpacityAt(1), 0);
  const particles = new ImpactParticle(new Scene(), 5);
  particles.emit(WALL, NORMAL);
  particles.update(1 / 60);
  const dt = 0.3;
  particles.update(dt);
  for (const p of particles.getActiveParticles("dust")) {
    const t = p.age / PARTICLE_LIFETIME_S;
    closeTo(p.opacity, dustOpacityAt(t));
    assert.ok(p.scale > 0.08 && p.scale < END_SCALE);
    assert.ok(p.z > WALL.z, "dust drifts off the wall");
    assert.ok(p.z - WALL.z < 0.4, "drag keeps the puff near the wall");
  }
  particles.update(0.31);
  assert.equal(particles.getActiveParticles("dust").length, 0);
});

test("chips fall under gravity and expire after 0.5 s", () => {
  const particles = new ImpactParticle(new Scene(), 9);
  particles.emit(WALL, NORMAL);
  particles.update(0);
  const before = particles.getActiveParticles("chip").map((chip) => chip.vy);
  particles.update(0.1);
  const after = particles.getActiveParticles("chip").map((chip) => chip.vy);
  after.forEach((vy, index) => closeTo(before[index]! - vy, CHIP_GRAVITY_MPS2 * 0.1, 1e-9));
  particles.update(0.41);
  assert.equal(particles.getActiveParticles("chip").length, 0);
});

test("impact randomness is deterministic per seed and restarts on clear", () => {
  const sample = (particles: ImpactParticle) => particles.getActiveParticles()
    .map((p) => [p.kind, p.vx, p.vy, p.vz].join(",")).join(";");
  const first = new ImpactParticle(new Scene(), 11);
  const second = new ImpactParticle(new Scene(), 11);
  first.emit(WALL, NORMAL);
  second.emit(WALL, NORMAL);
  assert.equal(sample(first), sample(second));
  const reference = sample(first);
  first.clear();
  assert.equal(first.getActiveParticles().length, 0);
  assert.equal(first.getInstanceCount(), 0);
  first.emit(WALL, NORMAL);
  assert.equal(sample(first), reference);
});

test("a sustained spray steals the oldest dust instead of dropping new impacts", () => {
  const particles = new ImpactParticle(new Scene(), 2);
  const impacts = POOL_SIZE / 3 + 4;
  for (let i = 0; i < impacts; i++) particles.emit({ x: i, y: 1, z: 0 }, NORMAL);
  const dust = particles.getActiveParticles("dust");
  assert.equal(dust.length, POOL_SIZE);
  assert.ok(dust.some((p) => p.x === impacts - 1), "the newest impact has dust");
  assert.ok(!dust.some((p) => p.x === 0), "the oldest impact was recycled");
});
