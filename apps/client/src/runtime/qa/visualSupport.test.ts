import assert from "node:assert/strict";
import test from "node:test";
import { resolveVisualSupport, type VisualSupportBounds } from "./visualSupport";

function bounds(
  min: [number, number, number],
  max: [number, number, number],
): VisualSupportBounds {
  return {
    min: { x: min[0], y: min[1], z: min[2] },
    max: { x: max[0], y: max[1], z: max[2] },
  };
}

test("resolves tableware and stacked loading props against actual rendered support", () => {
  const table = bounds([-0.9, 0, -0.33], [0.9, 0.549, 0.33]);
  const pot = bounds([-0.15, 0.549, -0.15], [0.15, 0.84, 0.15]);
  assert.deepEqual(resolveVisualSupport("pot", pot, [{ placementId: "table", bounds: table }]), {
    supportPlacementId: "table",
    gapM: 0,
    overlapAreaM2: 0.09,
  });

  const lowerCrate = bounds([-0.45, 0, -0.22], [0.45, 0.378, 0.22]);
  const upperCrate = bounds([-0.37, 0.38, -0.18], [0.37, 0.695, 0.18]);
  const stacked = resolveVisualSupport("upper", upperCrate, [{ placementId: "lower", bounds: lowerCrate }]);
  assert.equal(stacked?.supportPlacementId, "lower");
  assert.ok(Math.abs((stacked?.gapM ?? 1) - 0.002) < 1e-9);
});

test("rejects nearby props without physical horizontal or vertical contact", () => {
  const target = bounds([0, 0.5, 0], [0.2, 0.8, 0.2]);
  assert.equal(resolveVisualSupport("target", target, [{
    placementId: "beside",
    bounds: bounds([0.3, 0, 0], [0.6, 0.5, 0.2]),
  }]), null);
  assert.equal(resolveVisualSupport("target", target, [{
    placementId: "too-low",
    bounds: bounds([0, 0, 0], [0.2, 0.4, 0.2]),
  }]), null);
});
