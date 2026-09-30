import assert from "node:assert/strict";
import test from "node:test";
import {
  HIT_MARKER_STYLE,
  HitMarker,
  hitMarkerDurationS,
  hitMarkerOpacity,
  hitMarkerRingSizePx,
  hitMarkerScale,
} from "./HitMarker";

type FakeElement = {
  style: Record<string, string>;
  children: FakeElement[];
  append: (...nodes: FakeElement[]) => void;
  remove: () => void;
};

function createFakeElement(): FakeElement {
  const el: FakeElement = {
    style: {},
    children: [],
    append: (...nodes) => {
      el.children.push(...nodes);
    },
    remove: () => {},
  };
  return el;
}

function withFakeDocument<T>(run: () => T): T {
  const globalRef = globalThis as unknown as { document?: unknown };
  const previous = globalRef.document;
  globalRef.document = { createElement: () => createFakeElement() };
  try {
    return run();
  } finally {
    globalRef.document = previous;
  }
}

function createMarker(): { marker: HitMarker; root: FakeElement } {
  const crosshair = createFakeElement();
  const marker = new HitMarker(crosshair as unknown as HTMLElement);
  return { marker, root: crosshair.children[0]! };
}

function scaleOf(root: FakeElement): number {
  const match = /scale\(([-\d.]+)\)/.exec(root.style.transform ?? "");
  assert.ok(match, `expected a scale() transform, got ${root.style.transform}`);
  return Number(match[1]);
}

const close = (actual: number, expected: number, epsilon = 1e-6): void => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${expected}, got ${actual}`);
};

test("hit marker pops 1.2 -> 1.0 over 50 ms, holds 0.05 s, then fades linearly over 0.15 s", () => {
  close(hitMarkerScale("hit", 0), 1.2);
  close(hitMarkerScale("hit", 0.05), 1.0);
  close(hitMarkerScale("hit", 0.12), 1.0);
  const mid = hitMarkerScale("hit", 0.025);
  assert.ok(mid < 1.2 && mid > 1.0);
  // ease-out: more than half of the pop is done at the halfway point
  assert.ok(mid < 1.1, `pop should lead, got ${mid}`);

  close(hitMarkerOpacity("hit", 0), 1);
  close(hitMarkerOpacity("hit", 0.05), 1);
  close(hitMarkerOpacity("hit", 0.125), 0.5);
  close(hitMarkerOpacity("hit", 0.2), 0);
  close(hitMarkerDurationS("hit"), 0.2);
  // linear fade
  const a = hitMarkerOpacity("hit", 0.08);
  const b = hitMarkerOpacity("hit", 0.11);
  const c = hitMarkerOpacity("hit", 0.14);
  close(a - b, b - c, 1e-9);
});

test("kill marker starts at 1.6x and lasts 0.35 s", () => {
  close(hitMarkerScale("kill", 0), 1.6);
  close(hitMarkerDurationS("kill"), 0.35);
  assert.ok(hitMarkerScale("kill", 1 / 60) >= 1.3, "kill X still reads at >= 1.3x one 60 fps frame later");
  close(hitMarkerOpacity("kill", 0.2), 1);
  close(hitMarkerOpacity("kill", 0.35), 0);
  assert.ok(hitMarkerOpacity("kill", 0.3) > 0);
});

test("headshot ring expands 26 -> 34 px over the marker life", () => {
  close(hitMarkerRingSizePx("hit", 0), 26);
  close(hitMarkerRingSizePx("hit", 0.2), 34);
  close(hitMarkerRingSizePx("kill", 0.35), 34);
  let previous = 0;
  for (let t = 0; t <= 0.35; t += 0.01) {
    const size = hitMarkerRingSizePx("kill", t);
    assert.ok(size >= previous);
    previous = size;
  }
});

test("trigger frame shows the start pose, then the marker animates and hides", () => {
  withFakeDocument(() => {
    const { marker, root } = createMarker();
    marker.trigger();
    close(scaleOf(root), 1.2, 1e-3);
    assert.equal(root.style.opacity, "1.000");

    marker.update(1 / 60); // same step as the trigger: start pose held
    close(scaleOf(root), 1.2, 1e-3);
    assert.equal(marker.getState().elapsedS, 0);

    marker.update(0.05);
    close(scaleOf(root), 1.0, 1e-3);
    marker.update(0.075);
    close(Number(root.style.opacity), 0.5, 1e-3);
    marker.update(0.1);
    assert.equal(root.style.opacity, "0");
    assert.equal(marker.getState().mode, null);
  });
});

test("600 RPM hit stream never lets the marker go invisible", () => {
  withFakeDocument(() => {
    const { marker, root } = createMarker();
    const dt = 1 / 60;
    let nextShotS = 0;
    for (let frame = 0; frame < 120; frame += 1) {
      const nowS = frame * dt;
      if (nowS + 1e-9 >= nextShotS) {
        marker.trigger();
        nextShotS += 0.1;
      }
      marker.update(dt);
      assert.ok(Number(root.style.opacity) > 0.3, `frame ${frame} opacity ${root.style.opacity}`);
    }
  });
});

test("kill trigger shows the red X; headshot kill keeps the gold ring", () => {
  withFakeDocument(() => {
    const { marker, root } = createMarker();
    const [ring, arm1, arm2] = root.children;
    marker.trigger(true);
    marker.trigger(true, true);
    assert.equal(marker.getState().mode, "kill");
    close(scaleOf(root), 1.6, 1e-3);
    for (const arm of [arm1!, arm2!]) {
      assert.equal(arm.style.background, HIT_MARKER_STYLE.killColor);
      assert.equal(arm.style.width, "26px");
      assert.equal(arm.style.height, "3px");
    }
    assert.equal(ring!.style.display, "block");
    assert.equal(ring!.style.width, "26.00px");

    marker.update(1 / 60);
    marker.update(0.35);
    assert.equal(ring!.style.display, "none");
    assert.equal(marker.getState().mode, null);
  });
});

test("a plain hit during a live kill X keeps the kill X", () => {
  withFakeDocument(() => {
    const { marker, root } = createMarker();
    const arm1 = root.children[1]!;
    marker.trigger(false, true);
    marker.update(1 / 60);
    marker.update(0.1);
    marker.trigger(false);
    assert.equal(marker.getState().mode, "kill");
    assert.equal(arm1.style.background, HIT_MARKER_STYLE.killColor);
    close(marker.getState().elapsedS, 0.1, 1e-9);

    marker.update(0.3); // kill expires
    marker.trigger(false);
    assert.equal(marker.getState().mode, "hit");
    assert.equal(arm1.style.background, HIT_MARKER_STYLE.hitColor);
  });
});

test("600 RPM stream carried past a kill never lets the marker go invisible", () => {
  withFakeDocument(() => {
    const { marker, root } = createMarker();
    const arm1 = root.children[1]!;
    const dt = 1 / 60;
    marker.trigger(false);
    marker.trigger(false, true);
    marker.update(dt);
    let nextShotS = 0.1;
    let freshHitAfterKill = false;
    for (let frame = 1; frame < 60; frame += 1) {
      const nowS = frame * dt;
      if (nowS + 1e-9 >= nextShotS) {
        const killFading = marker.getState().mode === "kill" && marker.getState().elapsedS > 0.2;
        marker.trigger(false);
        if (killFading) {
          // A hit during the kill fade gives a fresh confirmation, not the fading X.
          assert.equal(marker.getState().mode, "hit", `frame ${frame}`);
          assert.equal(root.style.opacity, "1.000", `frame ${frame}`);
          assert.equal(arm1.style.background, HIT_MARKER_STYLE.hitColor);
          freshHitAfterKill = true;
        }
        nextShotS += 0.1;
      }
      marker.update(dt);
      assert.notEqual(marker.getState().mode, null, `frame ${frame} marker hidden`);
      assert.ok(Number(root.style.opacity) > 0.3, `frame ${frame} opacity ${root.style.opacity}`);
    }
    assert.ok(freshHitAfterKill, "stream should reach the kill fade");
  });
});

test("legacy trigger(isHeadshot) still shows the gold headshot marker", () => {
  withFakeDocument(() => {
    const { marker, root } = createMarker();
    const [ring, arm1] = root.children;
    marker.trigger(true);
    assert.equal(marker.getState().mode, "hit");
    assert.equal(arm1!.style.background, HIT_MARKER_STYLE.headshotColor);
    assert.equal(ring!.style.display, "block");
    marker.clear();
    assert.equal(root.style.opacity, "0");
    assert.equal(ring!.style.display, "none");
  });
});
