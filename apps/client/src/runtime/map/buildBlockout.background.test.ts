import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBackgroundCourseFootprint,
  resolveBackgroundMassingPlan,
  resolveBackgroundShellPlacements,
  type BackgroundShellPlacement,
} from "./buildBlockout";
import type { RuntimeRect } from "./types";

const PLAYABLE_BOUNDARY: RuntimeRect = { x: 0, y: 0, w: 56, h: 92 };
const EPSILON = 1e-8;

function groupKey(shell: BackgroundShellPlacement): string {
  return `${shell.side}:${shell.ring}:${shell.clusterIndex}`;
}

function radialInterval(shell: BackgroundShellPlacement): [number, number] {
  if (shell.side === "south") {
    return [-shell.z - shell.d * 0.5, -shell.z + shell.d * 0.5];
  }
  if (shell.side === "north") {
    return [shell.z - PLAYABLE_BOUNDARY.h - shell.d * 0.5, shell.z - PLAYABLE_BOUNDARY.h + shell.d * 0.5];
  }
  if (shell.side === "west") {
    return [-shell.x - shell.w * 0.5, -shell.x + shell.w * 0.5];
  }
  if (shell.side === "east") {
    return [shell.x - PLAYABLE_BOUNDARY.w - shell.w * 0.5, shell.x - PLAYABLE_BOUNDARY.w + shell.w * 0.5];
  }
  throw new Error("corner placements do not have one radial axis");
}

function alongInterval(shell: BackgroundShellPlacement): [number, number] {
  return shell.alongAxis === "x"
    ? [shell.x - shell.w * 0.5, shell.x + shell.w * 0.5]
    : [shell.z - shell.d * 0.5, shell.z + shell.d * 0.5];
}

test("background massing plan is deterministic and preserves the 120 stable shell ordinals", () => {
  const first = resolveBackgroundShellPlacements(PLAYABLE_BOUNDARY);
  const second = resolveBackgroundShellPlacements(PLAYABLE_BOUNDARY);

  assert.deepEqual(first, second);
  assert.equal(first.length, 120);
  assert.deepEqual(first.map((shell) => shell.shellIndex), [...first.keys()]);
});

test("background party-wall clusters remain strictly outside gameplay and retain real alleys", () => {
  const placements = resolveBackgroundShellPlacements(PLAYABLE_BOUNDARY);
  for (const shell of placements) {
    assert.ok([shell.x, shell.z, shell.w, shell.d, shell.h].every(Number.isFinite));
    assert.ok(shell.w > 0 && shell.d > 0 && shell.h > 0);
    if (shell.side === "south" || shell.side === "corner") {
      const south = shell.z + shell.d * 0.5;
      if (shell.side === "south" || shell.z < PLAYABLE_BOUNDARY.y) {
        assert.ok(south < PLAYABLE_BOUNDARY.y, `${shell.shellIndex} crosses the south gameplay edge`);
      }
    }
    if (shell.side === "north" || shell.side === "corner") {
      const north = shell.z - shell.d * 0.5;
      if (shell.side === "north" || shell.z > PLAYABLE_BOUNDARY.y + PLAYABLE_BOUNDARY.h) {
        assert.ok(north > PLAYABLE_BOUNDARY.y + PLAYABLE_BOUNDARY.h, `${shell.shellIndex} crosses the north gameplay edge`);
      }
    }
    if (shell.side === "west" || shell.side === "corner") {
      const west = shell.x + shell.w * 0.5;
      if (shell.side === "west" || shell.x < PLAYABLE_BOUNDARY.x) {
        assert.ok(west < PLAYABLE_BOUNDARY.x, `${shell.shellIndex} crosses the west gameplay edge`);
      }
    }
    if (shell.side === "east" || shell.side === "corner") {
      const east = shell.x - shell.w * 0.5;
      if (shell.side === "east" || shell.x > PLAYABLE_BOUNDARY.x + PLAYABLE_BOUNDARY.w) {
        assert.ok(east > PLAYABLE_BOUNDARY.x + PLAYABLE_BOUNDARY.w, `${shell.shellIndex} crosses the east gameplay edge`);
      }
    }
  }

  const edgePlacements = placements.filter((shell) => shell.side !== "corner");
  const groups = new Map<string, BackgroundShellPlacement[]>();
  for (const shell of edgePlacements) {
    const key = groupKey(shell);
    const group = groups.get(key);
    if (group) group.push(shell);
    else groups.set(key, [shell]);
  }
  for (const cluster of groups.values()) {
    assert.ok(cluster.length === 2 || cluster.length === 3);
    assert.ok(cluster.every((shell) => shell.clusterSize === cluster.length));
    const ordered = [...cluster].sort((left, right) => (
      left.alongAxis === "x" ? left.x - right.x : left.z - right.z
    ));
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1]!;
      const current = ordered[index]!;
      const previousEnd = previous.alongAxis === "x"
        ? previous.x + previous.w * 0.5
        : previous.z + previous.d * 0.5;
      const currentStart = current.alongAxis === "x"
        ? current.x - current.w * 0.5
        : current.z - current.d * 0.5;
      assert.ok(Math.abs(previousEnd - currentStart) <= EPSILON, `${groupKey(current)} is not party-wall joined`);
    }
  }

  for (const side of ["south", "north", "west", "east"] as const) {
    for (let ring = 0; ring < 4; ring += 1) {
      const clusters = [...groups.values()]
        .filter((cluster) => cluster[0]!.side === side && cluster[0]!.ring === ring)
        .sort((left, right) => left[0]!.clusterIndex - right[0]!.clusterIndex);
      for (let index = 1; index < clusters.length; index += 1) {
        const previous = clusters[index - 1]!.at(-1)!;
        const current = clusters[index]![0]!;
        const gap = previous.alongAxis === "x"
          ? current.x - current.w * 0.5 - (previous.x + previous.w * 0.5)
          : current.z - current.d * 0.5 - (previous.z + previous.d * 0.5);
        assert.ok(gap >= 0.7, `${side}:${ring} cluster alley collapsed to ${gap}`);
      }
    }
  }

  for (const side of ["south", "north", "west", "east"] as const) {
    for (let ring = 0; ring < 3; ring += 1) {
      const inner = edgePlacements.filter((shell) => shell.side === side && shell.ring === ring);
      const outer = edgePlacements.filter((shell) => shell.side === side && shell.ring === ring + 1);
      for (const innerShell of inner) {
        const innerAlong = alongInterval(innerShell);
        for (const outerShell of outer) {
          const outerAlong = alongInterval(outerShell);
          if (innerAlong[1] <= outerAlong[0] + EPSILON || outerAlong[1] <= innerAlong[0] + EPSILON) continue;
          const innerRadial = radialInterval(innerShell);
          const outerRadial = radialInterval(outerShell);
          assert.ok(
            outerRadial[0] - innerRadial[1] >= 0.17,
            `${side}:${ring}->${ring + 1} rings overlap by ${innerRadial[1] - outerRadial[0]}m`,
          );
        }
      }
    }
  }
});

test("party-wall masonry courses meet without overlapping internal members", () => {
  const placements = resolveBackgroundShellPlacements(PLAYABLE_BOUNDARY)
    .filter((shell) => shell.side !== "corner");
  const groups = new Map<string, BackgroundShellPlacement[]>();
  for (const shell of placements) {
    const key = groupKey(shell);
    const group = groups.get(key);
    if (group) group.push(shell);
    else groups.set(key, [shell]);
  }
  for (const cluster of groups.values()) {
    const ordered = [...cluster].sort((left, right) => (
      left.alongAxis === "x" ? left.x - right.x : left.z - right.z
    ));
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = resolveBackgroundCourseFootprint(ordered[index - 1]!, 0.07);
      const current = resolveBackgroundCourseFootprint(ordered[index]!, 0.07);
      const previousEnd = ordered[index - 1]!.alongAxis === "x"
        ? previous.x + previous.w * 0.5
        : previous.z + previous.d * 0.5;
      const currentStart = ordered[index]!.alongAxis === "x"
        ? current.x - current.w * 0.5
        : current.z - current.d * 0.5;
      assert.ok(Math.abs(previousEnd - currentStart) <= EPSILON);
    }
  }
});

test("each skyline side carries varied profiles and every crown stays on its bearing block", () => {
  const placements = resolveBackgroundShellPlacements(PLAYABLE_BOUNDARY);
  for (const side of ["south", "north", "west", "east"] as const) {
    const sidePlacements = placements.filter((shell) => shell.side === side);
    assert.deepEqual(
      new Set(sidePlacements.map((shell) => shell.profile)),
      new Set(["party", "terrace", "rearStep", "tower"]),
    );
    const heights = sidePlacements.map((shell) => shell.h);
    assert.ok(Math.max(...heights) - Math.min(...heights) >= 4);
  }

  for (const shell of placements) {
    const { lowerH, crown } = resolveBackgroundMassingPlan(shell);
    assert.ok([lowerH, crown.x, crown.z, crown.w, crown.d, crown.h, crown.baseY, crown.topY].every(Number.isFinite));
    assert.ok(lowerH > 0 && crown.w > 0 && crown.d > 0 && crown.h > 0);
    assert.equal(crown.baseY, lowerH);
    assert.equal(crown.topY, shell.h);
    assert.ok(crown.x - crown.w * 0.5 >= shell.x - shell.w * 0.5 - EPSILON);
    assert.ok(crown.x + crown.w * 0.5 <= shell.x + shell.w * 0.5 + EPSILON);
    assert.ok(crown.z - crown.d * 0.5 >= shell.z - shell.d * 0.5 - EPSILON);
    assert.ok(crown.z + crown.d * 0.5 <= shell.z + shell.d * 0.5 + EPSILON);
    if (shell.waterTank) {
      const tankCenterX = crown.x - crown.w * 0.12;
      assert.ok(tankCenterX - 0.55 >= crown.x - crown.w * 0.5 - EPSILON);
      assert.ok(tankCenterX + 0.55 <= crown.x + crown.w * 0.5 + EPSILON);
      assert.ok(crown.d >= 1.1);
    }
  }
});
