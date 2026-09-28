import assert from "node:assert/strict";
import test from "node:test";
import { ak47FeelTuning } from "../weapons/ak47FeelTuning";
import { ViewPunch } from "./ViewPunch";

const DEG = Math.PI / 180;
const base = ak47FeelTuning.viewPunch;
const noJitter = { ...base, jitter: 0, yawDeg: 0 };

function trace(punch: ViewPunch, seconds: number, dt: number): { t: number; pitch: number; roll: number }[] {
  const out: { t: number; pitch: number; roll: number }[] = [];
  for (let t = dt; t <= seconds + 1e-9; t += dt) {
    punch.step(dt);
    out.push({ t, pitch: punch.getPitchRad(), roll: punch.getRollRad() });
  }
  return out;
}

test("a first shot peaks at its tuned pitch about 26 ms later and is about -7% at 100 ms", () => {
  const punch = new ViewPunch(3, noJitter);
  punch.addShot(true);
  const samples = trace(punch, 0.1, 0.0005);
  const peak = samples.reduce((a, b) => (b.pitch > a.pitch ? b : a));
  assert.ok(Math.abs(peak.pitch - base.firstShot.pitchDeg * DEG) < 1e-4 * DEG + 1e-7, `peak ${peak.pitch / DEG} deg`);
  assert.ok(peak.t > 0.022 && peak.t < 0.03, `peak at ${peak.t} s`);
  const at100 = samples[samples.length - 1]!.pitch / peak.pitch;
  assert.ok(at100 < 0 && at100 > -0.1, `100 ms residual ${at100}`);
  const rollPeak = Math.max(...samples.map((s) => Math.abs(s.roll)));
  assert.ok(Math.abs(rollPeak - base.firstShot.rollDeg * DEG) < 1e-3 * DEG, `roll peak ${rollPeak / DEG}`);
});

test("follow-up shots use the smaller peaks", () => {
  const punch = new ViewPunch(3, noJitter);
  punch.addShot(false);
  const peak = Math.max(...trace(punch, 0.1, 0.0005).map((s) => s.pitch));
  assert.ok(Math.abs(peak - base.followShot.pitchDeg * DEG) < 1e-3 * DEG, `peak ${peak / DEG}`);
});

test("the step is exact: 20, 60 and 100 fps agree at the same time", () => {
  const at = (fps: number): number => {
    const punch = new ViewPunch(9);
    punch.addShot(true);
    for (let i = 0; i < Math.round(0.05 * fps); i += 1) punch.step(1 / fps);
    return punch.getPitchRad();
  };
  const reference = (() => {
    const punch = new ViewPunch(9);
    punch.addShot(true);
    punch.step(0.05);
    return punch.getPitchRad();
  })();
  for (const fps of [20, 60, 100]) assert.ok(Math.abs(at(fps) - reference) < 1e-12, `${fps} fps`);
});

test("a 600 RPM spray does not build a standing offset and stays inside the caps", () => {
  const punch = new ViewPunch(5);
  let maxPitch = 0;
  let maxRoll = 0;
  let maxYaw = 0;
  const dt = 1 / 240;
  const endOfGap: number[] = [];
  for (let shot = 0; shot < 30; shot += 1) {
    punch.addShot(shot === 0);
    for (let i = 0; i < 24; i += 1) {
      punch.step(dt);
      maxPitch = Math.max(maxPitch, Math.abs(punch.getPitchRad()));
      maxRoll = Math.max(maxRoll, Math.abs(punch.getRollRad()));
      maxYaw = Math.max(maxYaw, Math.abs(punch.getYawRad()));
    }
    endOfGap.push(punch.getPitchRad());
  }
  assert.ok(maxPitch <= base.pitchCapDeg * DEG + 1e-12);
  assert.ok(maxRoll <= base.rollCapDeg * DEG + 1e-12);
  assert.ok(maxYaw <= base.yawCapDeg * DEG + 1e-12);
  const followPeak = base.followShot.pitchDeg * DEG * (1 + base.jitter);
  for (const residual of endOfGap) assert.ok(Math.abs(residual) < 0.15 * followPeak, `residual ${residual / DEG} deg`);
  // It settles fully after the trigger is released.
  for (let i = 0; i < 120; i += 1) punch.step(dt);
  assert.ok(Math.abs(punch.getPitchRad()) < 1e-4 * DEG);
});

test("scale 0 disables the punch", () => {
  const punch = new ViewPunch(1, { ...base, scale: 0 });
  punch.addShot(true);
  punch.step(0.026);
  assert.equal(punch.getPitchRad(), 0);
  assert.equal(punch.getRollRad(), 0);
  assert.equal(punch.getYawRad(), 0);
});

test("roll alternates sides most of the time and reset replays the same sequence", () => {
  const signs = (punch: ViewPunch): number[] => {
    const out: number[] = [];
    for (let shot = 0; shot < 40; shot += 1) {
      punch.addShot(shot === 0);
      punch.step(0.02);
      out.push(Math.sign(punch.getRollRad()));
      punch.step(1);
    }
    return out;
  };
  const punch = new ViewPunch(11);
  const first = signs(punch);
  let flips = 0;
  for (let i = 1; i < first.length; i += 1) if (first[i] !== first[i - 1]) flips += 1;
  assert.ok(flips >= 20 && flips <= 36, `${flips} flips in 39`);
  punch.reset();
  assert.deepEqual(signs(punch), first);
});
