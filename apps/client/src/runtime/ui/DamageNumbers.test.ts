import assert from "node:assert/strict";
import test from "node:test";
import { PerspectiveCamera } from "three";
import {
  DAMAGE_NUMBER_TUNING,
  DamageNumbers,
  canStackDamage,
  damageNumberFontRem,
  damageNumberOpacity,
  damageNumberPunchScale,
} from "./DamageNumbers";

type FakeElement = {
  style: Record<string, string>;
  textContent: string;
  append: (...nodes: FakeElement[]) => void;
  remove: () => void;
};

function createFakeElement(): FakeElement {
  return {
    style: {},
    textContent: "",
    append: () => {},
    remove: () => {},
  };
}

function withFakeDom<T>(run: () => T): T {
  const globalRef = globalThis as unknown as { document?: unknown; window?: unknown };
  const previousDocument = globalRef.document;
  const previousWindow = globalRef.window;
  globalRef.document = { createElement: () => createFakeElement() };
  globalRef.window = { innerHeight: 900 };
  try {
    return run();
  } finally {
    globalRef.document = previousDocument;
    globalRef.window = previousWindow;
  }
}

function createCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(75, 16 / 9, 0.1, 1000);
  camera.position.set(0, 1.6, 0);
  camera.lookAt(0, 1.6, -10);
  camera.updateMatrixWorld(true);
  return camera;
}

const close = (actual: number, expected: number, epsilon = 1e-6): void => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${expected}, got ${actual}`);
};

const HIT = { x: 0, y: 1.4, z: -8 };

test("punch scales 1.25 -> 1.0 over 80 ms with an ease-out", () => {
  close(damageNumberPunchScale(0), 1.25);
  close(damageNumberPunchScale(0.08), 1.0);
  close(damageNumberPunchScale(0.5), 1.0);
  const mid = damageNumberPunchScale(0.04);
  assert.ok(mid > 1.0 && mid < 1.125, `ease-out leads, got ${mid}`);
});

test("font size grows with damage and caps at 2.0 rem", () => {
  close(damageNumberFontRem(25), 1 + 25 / 120);
  close(damageNumberFontRem(100), 1 + 100 / 120);
  close(damageNumberFontRem(120), 2.0);
  close(damageNumberFontRem(400), 2.0);
});

test("opacity fades from 1 to 0 over the fade window", () => {
  close(damageNumberOpacity(DAMAGE_NUMBER_TUNING.fadeS), 1);
  close(damageNumberOpacity(0), 0);
  assert.ok(damageNumberOpacity(0.375) < 0.5);
});

test("stacking requires the same enemy within 0.4 s of the last add", () => {
  const stack = { enemyId: "e1", isKill: false, lastAddClockS: 1, timerS: 0.5 };
  assert.equal(canStackDamage(stack, "e1", 1.4), true);
  assert.equal(canStackDamage(stack, "e1", 1.41), false);
  assert.equal(canStackDamage(stack, "e2", 1.1), false);
  assert.equal(canStackDamage(stack, undefined, 1.1), false);
  assert.equal(canStackDamage({ ...stack, isKill: true }, "e1", 1.1), false);
  assert.equal(canStackDamage({ ...stack, enemyId: null }, null, 1.1), false);
});

test("a 4-shot kill on one enemy shows one number ending at 100 in the kill colour", () => {
  withFakeDom(() => {
    const numbers = new DamageNumbers(createFakeElement() as unknown as HTMLElement);
    const camera = createCamera();
    for (let shot = 0; shot < 4; shot += 1) {
      numbers.spawn(HIT, camera, 25, false, "enemy-3");
      const [only] = numbers.getSnapshot();
      close(only!.scale, 1.25);
      numbers.update(1 / 60);
      numbers.update(0.1 - 1 / 60);
    }
    let snapshot = numbers.getSnapshot();
    assert.equal(snapshot.length, 1);
    assert.equal(snapshot[0]!.total, 100);
    assert.equal(snapshot[0]!.isKill, false);

    assert.equal(numbers.markKill("enemy-3"), true);
    snapshot = numbers.getSnapshot();
    assert.equal(snapshot[0]!.color, DAMAGE_NUMBER_TUNING.killColor);
    close(snapshot[0]!.timerS, DAMAGE_NUMBER_TUNING.fadeS);
    close(snapshot[0]!.scale, 1.25);

    // A later hit on the killed enemy never merges into the kill total.
    numbers.spawn(HIT, camera, 25, false, "enemy-3");
    assert.equal(numbers.getSnapshot().length, 2);
  });
});

test("merging restarts the fade and punch; the punch settles after 80 ms", () => {
  withFakeDom(() => {
    const numbers = new DamageNumbers(createFakeElement() as unknown as HTMLElement);
    const camera = createCamera();
    numbers.spawn(HIT, camera, 25, false, "a");
    numbers.update(1 / 60);
    numbers.update(0.3);
    assert.ok(numbers.getSnapshot()[0]!.timerS < 0.5);
    numbers.spawn(HIT, camera, 100, true, "a");
    const merged = numbers.getSnapshot()[0]!;
    assert.equal(merged.total, 125);
    assert.equal(merged.isHeadshot, true);
    close(merged.fontRem, 2.0);
    close(merged.timerS, DAMAGE_NUMBER_TUNING.fadeS);
    numbers.update(1 / 60); // spawn frame holds the full punch
    close(numbers.getSnapshot()[0]!.scale, 1.25);
    numbers.update(0.08);
    close(numbers.getSnapshot()[0]!.scale, 1.0);
  });
});

test("hits outside the window, on other enemies, or without an id spawn new numbers", () => {
  withFakeDom(() => {
    const numbers = new DamageNumbers(createFakeElement() as unknown as HTMLElement);
    const camera = createCamera();
    numbers.spawn(HIT, camera, 25, false, "a");
    numbers.spawn(HIT, camera, 25, false, "b");
    numbers.spawn(HIT, camera, 25, false);
    numbers.spawn(HIT, camera, 25, false);
    assert.equal(numbers.getSnapshot().length, 4);
    numbers.update(0.41);
    numbers.spawn(HIT, camera, 25, false, "a");
    assert.equal(numbers.getSnapshot().length, 5);
  });
});

test("markKillNear marks the nearest live number within range", () => {
  withFakeDom(() => {
    const numbers = new DamageNumbers(createFakeElement() as unknown as HTMLElement);
    const camera = createCamera();
    numbers.spawn({ x: -1, y: 1.4, z: -8 }, camera, 25, false, "left");
    numbers.spawn({ x: 1, y: 1.4, z: -8 }, camera, 25, false, "right");
    assert.equal(numbers.markKillNear({ x: 0, y: 0, z: -20 }), false);
    assert.equal(numbers.markKillNear({ x: 0.8, y: 0, z: -8.1 }), true);
    const byId = new Map(numbers.getSnapshot().map((entry) => [entry.enemyId, entry]));
    assert.equal(byId.get("right")!.isKill, true);
    assert.equal(byId.get("left")!.isKill, false);
    assert.equal(numbers.markKill("missing"), false);
  });
});

test("spawn with isKill shows a kill total immediately", () => {
  withFakeDom(() => {
    const numbers = new DamageNumbers(createFakeElement() as unknown as HTMLElement);
    numbers.spawn(HIT, createCamera(), 100, true, "k", true);
    const [entry] = numbers.getSnapshot();
    assert.equal(entry!.color, DAMAGE_NUMBER_TUNING.killColor);
    assert.equal(entry!.total, 100);
  });
});
