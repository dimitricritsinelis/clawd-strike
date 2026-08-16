import assert from "node:assert/strict";
import test from "node:test";
import { resolveShot } from "./shots";
import type { RuntimeShotsSpec } from "./types";

const AUTHORED_SHOT_ID = "SHOT_02_AUTHORED_COMPARE";

function makeShotsSpec(): RuntimeShotsSpec {
  return {
    metadata: {},
    aliases: {
      compare: AUTHORED_SHOT_ID,
    },
    shots: [
      {
        id: AUTHORED_SHOT_ID,
        label: "Authored compare",
        description: "Fixture camera owned by the shot inventory.",
        camera: {
          pos: { x: 12, y: 34, z: 5 },
          lookAt: { x: 18, y: 40, z: 7 },
          fovDeg: 72,
        },
      },
    ],
  };
}

test("resolves the compare alias to its authored camera", () => {
  const resolved = resolveShot(makeShotsSpec(), "compare");

  assert.equal(resolved.id, AUTHORED_SHOT_ID);
  assert.deepEqual(resolved.cameraPose, {
    pos: { x: 12, y: 5, z: 34 },
    lookAt: { x: 18, y: 7, z: 40 },
    fovDeg: 72,
  });
  assert.equal(resolved.active, true);
  assert.equal(resolved.freezeInput, true);
  assert.equal(resolved.warning, null);
});

test("rejects unknown authored shot ids instead of synthesizing a camera", () => {
  const shotsSpec = makeShotsSpec();

  assert.throws(
    () => resolveShot(shotsSpec, "SHOT_UNKNOWN"),
    /\[shot-inventory\] unknown authored shot id 'SHOT_UNKNOWN'/,
  );
  assert.throws(
    () => resolveShot({ ...shotsSpec, aliases: {} }, "compare"),
    /\[shot-inventory\] authored alias 'compare' is not configured/,
  );
});
