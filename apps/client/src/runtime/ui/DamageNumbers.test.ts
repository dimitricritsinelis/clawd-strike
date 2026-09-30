import assert from "node:assert/strict";
import test from "node:test";
import { PerspectiveCamera } from "three";
import {
  DAMAGE_NUMBER_TUNING,
  DamageNumbers,
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

test("every hit spawns its own number; the spawn frame holds the full punch, which settles after 80 ms", () => {
  withFakeDom(() => {
    const numbers = new DamageNumbers(createFakeElement() as unknown as HTMLElement);
    const camera = createCamera();
    numbers.spawn(HIT, camera, 25, false);
    numbers.spawn(HIT, camera, 100, true);
    const [body, head] = numbers.getSnapshot();
    assert.equal(numbers.getSnapshot().length, 2);
    assert.equal(body!.total, 25);
    assert.equal(body!.color, DAMAGE_NUMBER_TUNING.bodyColor);
    assert.equal(head!.total, 100);
    assert.equal(head!.isHeadshot, true);
    assert.equal(head!.color, DAMAGE_NUMBER_TUNING.headshotColor);
    close(head!.fontRem, damageNumberFontRem(100));
    close(head!.timerS, DAMAGE_NUMBER_TUNING.fadeS);
    close(head!.scale, 1.25);
    numbers.update(1 / 60); // spawn frame holds the full punch
    close(numbers.getSnapshot()[1]!.scale, 1.25);
    numbers.update(0.08);
    close(numbers.getSnapshot()[1]!.scale, 1.0);
  });
});
