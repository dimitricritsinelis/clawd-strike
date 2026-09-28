import assert from "node:assert/strict";
import test from "node:test";
import { Ak47Motion } from "./Ak47Motion";
import { ak47FeelTuning, type Ak47MotionTuning } from "./ak47FeelTuning";

const DEG = Math.PI / 180;
const base = ak47FeelTuning.motion;
/** The nominal kick, without the per-shot size jitter. */
const nominal: Ak47MotionTuning = { ...base, kick: { ...base.kick, scaleJitter: 0 } };
/** No idle figure-8, so walk-minus-idle isolates the walk bob. */
const noFigure8: Ak47MotionTuning = {
  ...base, breath: { ...base.breath, figure8X: 0, figure8Pitch: 0, figure8Yaw: 0, figure8Roll: 0 },
};
const kickBack = (m: Ak47Motion) => m.back.value + m.sustainBack.value;
const kickPitch = (m: Ak47Motion) => m.pitch.value + m.sustainPitch.value;

test("steady walking keeps the approved 40 percent reduction in sway, bounce, and roll", () => {
  // Re-baselined reference: the idle comparison has the figure-8 disabled, because the
  // default idle figure-8 fades out while walking. Walking uses the default tuning.
  for (const fps of [30, 60, 144]) {
    const walking = new Ak47Motion(), idle = new Ak47Motion(noFigure8);
    const peaks = { x: 0, y: 0, roll: 0 };
    for (let frame = 0; frame < fps * 6; frame++) {
      walking.update(1 / fps, 5, true, 0, 0);
      idle.update(1 / fps, 0, true, 0, 0);
      if (frame < fps * 2) continue;
      for (const axis of ["x", "y", "roll"] as const) {
        peaks[axis] = Math.max(peaks[axis], Math.abs(walking.pose[axis] - idle.pose[axis]));
      }
    }
    for (const [axis, expected] of [["x", .0036], ["y", .0033], ["roll", .0054]] as const) {
      assert.ok(Math.abs(peaks[axis] - expected) < expected * .01, `${axis} walking amplitude at ${fps} FPS: ${peaks[axis]}`);
    }
  }
});

test("one shot has a snappy shoulder kick, a firm muzzle rise, and a small springy rebound", () => {
  const motion = new Ak47Motion(nominal);
  motion.shot();
  let peakBack = 0, peakPitch = 0, rebound = 0, firstFrameBack = 0;
  for (let i = 0; i < 720; i++) {
    motion.update(1 / 720, 0, true, 0, 0);
    if (i === 11) firstFrameBack = kickBack(motion); // one 60 Hz frame in
    peakBack = Math.max(peakBack, kickBack(motion));
    peakPitch = Math.max(peakPitch, kickPitch(motion));
    rebound = Math.min(rebound, kickPitch(motion));
  }
  assert.ok(peakBack > .015 && peakBack < .017, `15-17 mm shoulder kick: ${peakBack}`);
  assert.ok(peakPitch > 1.9 * DEG && peakPitch < 2.1 * DEG, `1.9-2.1 degrees muzzle rise: ${peakPitch / DEG}`);
  assert.ok(-rebound > .03 * peakPitch && -rebound < .08 * peakPitch, `3-8 percent rebound: ${-rebound / peakPitch}`);
  assert.ok(firstFrameBack > .6 * peakBack, "most of the kick lands on the first frame");
  assert.ok(Math.abs(kickBack(motion)) < .00001);
  assert.ok(Math.abs(kickPitch(motion)) < .00001);

  const follow = new Ak47Motion(nominal);
  follow.shot({ isFirstShot: false, burstIndex: 1 });
  let followPitch = 0;
  for (let i = 0; i < 720; i++) {
    follow.update(1 / 720, 0, true, 0, 0);
    followPitch = Math.max(followPitch, kickPitch(follow));
  }
  assert.ok(followPitch > 1.3 * DEG && followPitch < 1.5 * DEG, `1.3-1.5 degrees follow-up rise: ${followPitch / DEG}`);
});

test("shot yaw and roll vary within their caps; roll leans clockwise and yaw follows the view's pattern", () => {
  const motion = new Ak47Motion();
  let clockwise = 0, withPattern = 0;
  const shots = 200;
  for (let n = 0; n < shots; n++) {
    const pattern = n % 2 ? .12 : -.12;
    motion.shot({ isFirstShot: true, patternYawDeg: pattern });
    let yawPeak = 0, rollPeak = 0, rollSigned = 0, backPeak = 0;
    for (let i = 0; i < 720; i++) {
      motion.update(1 / 720, 0, true, 0, 0);
      if (Math.abs(motion.yaw.value) > Math.abs(yawPeak)) yawPeak = motion.yaw.value;
      if (Math.abs(motion.roll.value) > rollPeak) { rollPeak = Math.abs(motion.roll.value); rollSigned = motion.roll.value; }
      backPeak = Math.max(backPeak, kickBack(motion));
    }
    assert.ok(Math.abs(yawPeak) > .15 * DEG && Math.abs(yawPeak) < .45 * DEG, `yaw peak ${yawPeak / DEG}`);
    assert.ok(rollPeak > .3 * DEG && rollPeak < .75 * DEG, `roll peak ${rollPeak / DEG}`);
    assert.ok(backPeak > .0163 * .88 && backPeak < .0163 * 1.12, `kick size varies about 10 percent: ${backPeak}`);
    if (rollSigned < 0) clockwise++;
    if (Math.sign(yawPeak) === Math.sign(pattern)) withPattern++;
  }
  assert.ok(clockwise / shots > .6 && clockwise / shots < .8, `about 70 percent clockwise: ${clockwise / shots}`);
  assert.equal(withPattern, shots);
});

test("without a shot event the motion applies the fire controller's first-shot rule itself", () => {
  const implicit = new Ak47Motion(), explicit = new Ak47Motion();
  const fire = (gapS: number, event: Parameters<Ak47Motion["shot"]>[0]) => {
    for (const motion of [implicit, explicit]) {
      for (let t = 0; t < gapS - 1e-9; t += 1 / 60) motion.update(1 / 60, 0, true, 0, 0);
    }
    implicit.shot();
    explicit.shot(event);
  };
  fire(0, { isFirstShot: true, burstIndex: 0 });
  fire(.1, { isFirstShot: false, burstIndex: 1 });
  fire(.1, { isFirstShot: false, burstIndex: 2 });
  fire(.35, { isFirstShot: true, burstIndex: 0 });
  fire(.1, { isFirstShot: false, burstIndex: 1 });
  for (let frame = 0; frame < 5; frame++) {
    implicit.update(1 / 60, 0, true, 0, 0);
    explicit.update(1 / 60, 0, true, 0, 0);
  }
  assert.equal(JSON.stringify(implicit), JSON.stringify(explicit));
});

test("several shots in one frame share one kick instead of stacking", () => {
  const single = new Ak47Motion(nominal), hitch = new Ak47Motion(nominal);
  single.shot({ isFirstShot: true, burstIndex: 0, shotsThisFrame: 1 });
  hitch.shot({ isFirstShot: true, burstIndex: 0, shotsThisFrame: 3 });
  hitch.shot({ isFirstShot: false, burstIndex: 1, shotsThisFrame: 3 });
  hitch.shot({ isFirstShot: false, burstIndex: 2, shotsThisFrame: 3 });
  let singlePeak = 0, hitchPeak = 0;
  for (let i = 0; i < 72; i++) {
    single.update(1 / 720, 0, true, 0, 0);
    hitch.update(1 / 720, 0, true, 0, 0);
    singlePeak = Math.max(singlePeak, kickPitch(single));
    hitchPeak = Math.max(hitchPeak, kickPitch(hitch));
  }
  assert.ok(hitchPeak < singlePeak, `hitch ${hitchPeak} against single ${singlePeak}`);
});

test("recoil and constant look speed agree at 30, 60, and 144 FPS", () => {
  const poses = [30, 60, 144].map((fps) => {
    const motion = new Ak47Motion();
    motion.shot();
    for (let frame = 0; frame < fps / 2; frame++) motion.update(1 / fps, 0, true, .8, -.4);
    return [motion.back.value, motion.pitch.value, motion.lookYaw.value, motion.lookPitch.value];
  });
  for (const pose of poses.slice(1)) {
    pose.forEach((value, i) => assert.ok(Math.abs(value - poses[0]![i]!) < 1e-10));
  }
});

test("a held spray digs in and wanders, then settles after release, at 30, 60, and 144 FPS", () => {
  const sustainMeans: number[][] = [];
  for (const fps of [30, 60, 144]) {
    const motion = new Ak47Motion();
    let fired = 0, lastShotS = 0, settledAfterS = 0;
    let back = 0, pitch = 0, sustainBack = 0, sustainPitch = 0, samples = 0;
    for (let frame = 0; frame < fps * 4; frame++) {
      // 600 RPM, fired on the first frame at or after each ideal shot time.
      let due = 0;
      while (fired + due < 30 && (fired + due) * 100 <= frame * 1000 / fps + 1e-6) due++;
      for (let i = 0; i < due; i++, fired++) {
        motion.shot({ isFirstShot: fired === 0, burstIndex: fired, shotsThisFrame: due });
      }
      if (due) lastShotS = frame / fps;
      motion.update(1 / fps, 0, true, 0, 0);
      const t = (frame + 1) / fps;
      if (t >= 1.5 && t <= 3) {
        back += kickBack(motion); pitch += kickPitch(motion);
        sustainBack += motion.sustainBack.value; sustainPitch += motion.sustainPitch.value;
        samples++;
      }
      if (fired === 30 && (Math.abs(kickBack(motion)) > .1 * base.sustain.back
        || Math.abs(kickPitch(motion)) > .1 * base.sustain.pitch)) settledAfterS = t - lastShotS;
    }
    back /= samples; pitch /= samples;
    assert.ok(back > .010 && back < .013, `mean back ${back} at ${fps} FPS`);
    assert.ok(pitch > 1.2 * DEG && pitch < 1.6 * DEG, `mean pitch ${pitch / DEG} at ${fps} FPS`);
    assert.ok(settledAfterS < .4, `within 10 percent of sustain ${settledAfterS}s after the last shot at ${fps} FPS`);
    sustainMeans.push([sustainBack / samples, sustainPitch / samples]);
  }
  for (const means of sustainMeans.slice(1)) {
    assert.ok(Math.abs(means[0]! - sustainMeans[0]![0]!) < .03 * base.sustain.back);
    assert.ok(Math.abs(means[1]! - sustainMeans[0]![1]!) < .03 * base.sustain.pitch);
  }
});

test("sustained fire stays bounded and a paused frame changes nothing", () => {
  const motion = new Ak47Motion();
  for (let frame = 0; frame < 360; frame++) {
    if (frame % 6 === 0) motion.shot();
    motion.update(1 / 60, 5, true, 0, 0);
    assert.ok(Math.abs(motion.back.value) < .025);
    assert.ok(Math.abs(motion.pitch.value) < .05);
  }
  const snapshot = JSON.stringify(motion);
  motion.update(0, 0, false, 3, 3);
  assert.equal(JSON.stringify(motion), snapshot);
});

test("a fast flick swings the rifle with a small overshoot and settles quickly at 30, 60, and 144 FPS", () => {
  for (const fps of [30, 60, 144]) {
    const motion = new Ak47Motion();
    let peak = 0, overshoot = 0, lastOutside = 0, flickEnd = 0;
    for (let frame = 0; frame < fps * 1.5; frame++) {
      const flicking = frame / fps < .1 - 1e-9;
      if (flicking) flickEnd = (frame + 1) / fps;
      motion.update(1 / fps, 0, true, flicking ? -600 * DEG : 0, 0);
      peak = Math.max(peak, motion.lookYaw.value);
      overshoot = Math.min(overshoot, motion.lookYaw.value);
      if (Math.abs(motion.lookYaw.value) > .1 * peak) lastOutside = (frame + 1) / fps;
    }
    assert.ok(peak < base.sway.yawLimit, "tanh-shaped target never exceeds its limit");
    assert.ok(-overshoot > .05 * peak && -overshoot < .08 * peak, `5-8 percent overshoot at ${fps} FPS: ${-overshoot / peak}`);
    assert.ok(lastOutside - flickEnd < .4, `settles within 400 ms of the flick at ${fps} FPS`);
  }
});

test("jittery 1000 Hz mouse input leaves the rifle steady during a constant turn", () => {
  for (const fps of [60, 144, 240]) {
    for (const degPerS of [10, 45, 180]) {
      const motion = new Ak47Motion();
      const countsPerS = degPerS * DEG / .002;
      let reported = 0, sum = 0, sumSq = 0, n = 0;
      for (let frame = 0; frame < fps * 3; frame++) {
        // Integer counts per 1 ms poll, plus deterministic poll-timing noise of one count.
        const polls = Math.floor((frame + 1) * 1000 / fps + 1e-9);
        const total = Math.floor(polls / 1000 * countsPerS) + (frame % 3 === 0 ? 1 : 0);
        const delta = total - reported;
        reported = total;
        motion.update(1 / fps, 0, true, -delta * .002 * fps, 0);
        if (frame < fps) continue;
        sum += motion.pose.yaw; sumSq += motion.pose.yaw ** 2; n++;
      }
      const rms = Math.sqrt(Math.max(0, sumSq / n - (sum / n) ** 2));
      assert.ok(rms < .05 * DEG, `rest jitter ${rms / DEG} deg at ${fps} FPS and ${degPerS} deg/s`);
    }
  }
});

test("turning rolls the rifle with the yaw sway", () => {
  const motion = new Ak47Motion(noFigure8);
  for (let frame = 0; frame < 120; frame++) motion.update(1 / 60, 0, true, -90 * DEG, 0);
  assert.ok(motion.lookYaw.value > 0);
  assert.ok(Math.abs(motion.pose.roll - motion.lookYaw.value * base.sway.yawToRoll) < 1e-6);
});

test("footsteps lock the bob: trough to trough equals the footstep interval", () => {
  for (const fps of [60, 144]) {
    const walking = new Ak47Motion(), idle = new Ak47Motion();
    let timer = 0, previous = Number.NaN, falling = false, lastTrough = Number.NaN;
    const steps: number[] = [];
    const gaps: [number, number][] = [];
    const troughs: number[] = [];
    for (let frame = 0; frame < fps * 10; frame++) {
      const speed = frame < fps * 4 ? 6 : 3;
      // Mirrors the bootstrap footstep timer, which stays the cadence authority.
      timer -= 1 / fps;
      if (timer <= 0) {
        timer = speed > 4.5 ? .45 : .65;
        walking.onFootstep(timer);
        steps.push(frame / fps);
      }
      walking.update(1 / fps, speed, true, 0, 0);
      idle.update(1 / fps, 0, true, 0, 0);
      const bounce = walking.pose.y - idle.pose.y;
      if (!Number.isNaN(previous)) {
        if (falling && bounce > previous) {
          const t = (frame - 1) / fps;
          const footstepGap = steps.at(-1)! - steps.at(-2)!;
          if (!Number.isNaN(lastTrough) && t > 1.5 && Math.abs(t - 4) > 1) {
            gaps.push([t - lastTrough, footstepGap]);
            troughs.push(t);
          }
          lastTrough = t;
        }
        falling = bounce < previous;
      }
      previous = bounce;
    }
    assert.ok(gaps.length > 8);
    for (const [gap, footstepGap] of gaps) {
      assert.ok(Math.abs(gap - footstepGap) < .01, `trough gap ${gap}s against footstep gap ${footstepGap}s at ${fps} FPS`);
    }
    for (const t of troughs) {
      const nearest = Math.min(...steps.map((step) => Math.abs(step - t)));
      assert.ok(nearest < .035, `trough at ${t}s is ${nearest}s from a footstep at ${fps} FPS`);
    }
  }
});

test("idle breathing traces a figure-8 that fades out while walking", () => {
  const idle = new Ak47Motion(), plain = new Ak47Motion(noFigure8);
  const walking = new Ak47Motion(), walkingPlain = new Ak47Motion(noFigure8);
  const peaks = { x: 0, pitch: 0, yaw: 0, roll: 0 };
  let walkingLeak = 0;
  for (let frame = 0; frame < 60 * 8; frame++) {
    for (const m of [idle, plain]) m.update(1 / 60, 0, true, 0, 0);
    for (const m of [walking, walkingPlain]) m.update(1 / 60, 5, true, 0, 0);
    for (const axis of ["x", "pitch", "yaw", "roll"] as const) {
      peaks[axis] = Math.max(peaks[axis], Math.abs(idle.pose[axis] - plain.pose[axis]));
      if (frame > 120) walkingLeak = Math.max(walkingLeak, Math.abs(walking.pose[axis] - walkingPlain.pose[axis]));
    }
  }
  const { figure8X, figure8Pitch, figure8Yaw, figure8Roll } = base.breath;
  for (const [axis, expected] of [["x", figure8X], ["pitch", figure8Pitch], ["yaw", figure8Yaw], ["roll", figure8Roll]] as const) {
    assert.ok(Math.abs(peaks[axis] - expected) < expected * .02, `${axis} figure-8 amplitude ${peaks[axis]}`);
  }
  assert.ok(walkingLeak < 1e-6, `figure-8 while walking ${walkingLeak}`);
});

test("landing and stop transitions settle; reset restores deterministic shots", () => {
  const motion = new Ak47Motion();
  motion.update(.02, 4, false, 0, 0);
  motion.update(.02, 4, true, 0, 0);
  assert.ok(motion.landing.value < 0);
  for (let frame = 0; frame < 180; frame++) motion.update(1 / 60, 0, true, 0, 0);
  assert.ok(Math.abs(motion.landing.value) < .00001);
  assert.ok(Math.abs(motion.movement.value) < .00001);
  motion.reset();
  motion.shot();
  const first = [motion.yaw.velocity, motion.roll.velocity, motion.side.velocity];
  motion.onFootstep(.45);
  motion.update(1 / 60, 6, true, 2, 1);
  motion.reset();
  motion.shot();
  assert.deepEqual([motion.yaw.velocity, motion.roll.velocity, motion.side.velocity], first);
});
