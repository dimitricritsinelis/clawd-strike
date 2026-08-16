import assert from "node:assert/strict";
import test from "node:test";
import { Scene } from "three";
import { BuffManager } from "./BuffManager";
import type { BuffType } from "./BuffTypes";

function makeManager(): { manager: BuffManager; activations: BuffType[]; expiries: BuffType[] } {
  const manager = new BuffManager(new Scene());
  const activations: BuffType[] = [];
  const expiries: BuffType[] = [];
  manager.setOnBuffActivated((type) => activations.push(type));
  manager.setOnBuffExpired((type) => expiries.push(type));
  return { manager, activations, expiries };
}

// Regression: re-picking up an already-active buff only refreshed the timer.
// For Iron Skin that meant a shield already shot off was never restored — the
// player paid for a pickup that visibly did nothing.
test("re-picking up an active buff re-applies its effect, not just the timer", () => {
  const { manager, activations } = makeManager();

  manager.debugActivateBuff("health_boost");
  assert.deepEqual(activations, ["health_boost"]);

  const result = manager.debugActivateBuff("health_boost");
  assert.equal(result, "refreshed");
  assert.deepEqual(
    activations,
    ["health_boost", "health_boost"],
    "refreshing must re-fire the activation handler so the shield is restored",
  );
});

test("refreshing a buff restores its full duration", () => {
  const { manager } = makeManager();
  manager.debugActivateBuff("speed_boost");
  const full = manager.getActiveBuffs()[0]!.durationS;

  manager.update(4, { x: 0, y: 0, z: 0 }, null as never);
  const partial = manager.getActiveBuffs()[0]!.remainingS;
  assert.ok(partial < full, `expected the timer to burn down, got ${partial}/${full}`);

  manager.debugActivateBuff("speed_boost");
  assert.equal(manager.getActiveBuffs()[0]!.remainingS, full);
});

// Regression: per-wave headshot tallies are run-scoped. They used to survive a
// death/restart, so a 10/10 wave in a previous run handed out a free Rallying
// Cry (all four buffs) at the next run's first wave boundary.
test("wave headshot progress does not survive a run restart", () => {
  const { manager } = makeManager();

  for (let i = 0; i < 10; i += 1) manager.recordKill(true);
  manager.onNewWave();
  assert.equal(manager.checkRallyingCry(), true, "a perfect wave should arm Rallying Cry");

  manager.resetWaveProgress();
  assert.equal(
    manager.checkRallyingCry(),
    false,
    "restarting the run must drop the pending Rallying Cry",
  );

  // A fresh partial wave must not re-arm it either.
  for (let i = 0; i < 4; i += 1) manager.recordKill(true);
  manager.onNewWave();
  assert.equal(manager.checkRallyingCry(), false);
});

test("clearing buffs leaves an earned Rallying Cry intact for the wave boundary", () => {
  const { manager } = makeManager();

  for (let i = 0; i < 10; i += 1) manager.recordKill(true);
  manager.onNewWave();
  manager.clearAllBuffs();

  assert.equal(
    manager.checkRallyingCry(),
    true,
    "the wave-boundary buff clear must not eat the reward it is about to grant",
  );
});

test("clearing buffs expires every active buff exactly once", () => {
  const { manager, expiries } = makeManager();

  manager.debugActivateBuff("speed_boost");
  manager.debugActivateBuff("rapid_fire");
  manager.clearAllBuffs();

  assert.deepEqual(expiries.sort(), ["rapid_fire", "speed_boost"]);
  assert.deepEqual(manager.getActiveBuffs(), []);
  assert.equal(manager.isRallyingCryActive(), false);
});
