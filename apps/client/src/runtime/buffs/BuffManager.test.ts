import assert from "node:assert/strict";
import test from "node:test";
import { Scene } from "three";
import { BuffManager, type BuffDropResult } from "./BuffManager";
import type { BuffActivationContext } from "./BuffManager";
import {
  BUFF_TYPES,
  type BuffType,
} from "./BuffTypes";
import { DeterministicRng } from "../utils/Rng";
import { getGameplayTuning } from "../tuning/gameplayTuning";

const PLAYER_POSITION = { x: 0, y: 0, z: 0 } as const;
const DROP_POSITION = { x: 10, y: 0, z: 10 } as const;

function makeManager(seed = 1): {
  manager: BuffManager;
  activations: BuffType[];
  expiries: BuffType[];
} {
  const manager = new BuffManager(new Scene(), { seed });
  const activations: BuffType[] = [];
  const expiries: BuffType[] = [];
  manager.setOnBuffActivated((type) => activations.push(type));
  manager.setOnBuffExpired((type) => expiries.push(type));
  return { manager, activations, expiries };
}

function runDropSequence(seed: number, killCount: number): BuffDropResult[] {
  const { manager } = makeManager(seed);
  return Array.from({ length: killCount }, (_, enemyIndex) => (
    manager.onEnemyDeath(enemyIndex, DROP_POSITION, { waveClosing: true })
  ));
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

  manager.update(4, { x: 0, y: 0, z: 0 });
  const partial = manager.getActiveBuffs()[0]!.remainingS;
  assert.ok(partial < full, `expected the timer to burn down, got ${partial}/${full}`);

  manager.debugActivateBuff("speed_boost");
  assert.equal(manager.getActiveBuffs()[0]!.remainingS, full);
});

test("wave reapplication is distinct from activation and pickup refresh", () => {
  const manager = new BuffManager(new Scene(), { seed: 4 });
  const contexts: BuffActivationContext[] = [];
  manager.setOnBuffActivated((_type, context) => contexts.push(context));

  manager.debugActivateBuff("health_boost");
  manager.debugActivateBuff("health_boost");
  manager.reapplyActiveBuffEffects();

  assert.deepEqual(contexts, ["activated", "refreshed", "reapplied"]);
});

// Regression: per-wave headshot tallies are run-scoped. They used to survive a
// death/restart, so a 10/10 wave in a previous run handed out a free Rallying
// Cry at the next run's first wave boundary.
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

test("drop outcomes and buff choices are deterministic for a run seed", () => {
  const firstRun = runDropSequence(0x51a7, 40);
  const replay = runDropSequence(0x51a7, 40);
  const differentSeed = runDropSequence(0x51a8, 40);
  const injectedManager = new BuffManager(new Scene(), {
    rng: new DeterministicRng(0x51a7),
  });
  const injectedReplay = Array.from({ length: 40 }, (_, enemyIndex) => (
    injectedManager.onEnemyDeath(enemyIndex, DROP_POSITION, { waveClosing: true })
  ));

  assert.deepEqual(replay, firstRun);
  assert.deepEqual(injectedReplay, firstRun, "an injected root RNG should reproduce the same streams");
  assert.notDeepEqual(
    differentSeed,
    firstRun,
    "a distinct seed should not replay the same 40-kill drop sequence",
  );
});

test("a seventh consecutive would-be miss is converted into a guaranteed drop", () => {
  // Seed 2's first seven tagged drop-roll values are all >= 0.15. The first
  // six therefore miss and the seventh proves the dry-streak safeguard, which
  // is what guarantees at least one drop inside every 10-kill wave.
  const { manager } = makeManager(2);
  const maxMisses = getGameplayTuning("desktop-human").buffs.pity.maxConsecutiveMisses;
  assert.equal(maxMisses, 6);
  const results = Array.from({ length: (maxMisses ?? 0) + 1 }, (_, enemyIndex) => (
    manager.onEnemyDeath(enemyIndex, DROP_POSITION, { waveClosing: true })
  ));

  assert.deepEqual(
    results.slice(0, 6),
    Array.from({ length: 6 }, () => ({ dropped: false, forcedByPity: false })),
  );
  const forced = results[6]!;
  assert.equal(forced.dropped, true);
  if (!forced.dropped) assert.fail("the seventh kill should have dropped a buff");
  assert.equal(forced.forcedByPity, true);
  assert.equal(forced.disposition, "banked");
});

test("drop variety excludes both of the two most recent buff types", () => {
  const drops = runDropSequence(0xdecafbad, 120)
    .filter((result): result is Extract<BuffDropResult, { dropped: true }> => result.dropped)
    .map((result) => result.type);

  // Pity alone forces one drop per 7 kills, so 120 kills cannot yield fewer than 17.
  assert.ok(drops.length >= 17, `pity protection should yield at least 17 drops, got ${drops.length}`);
  for (let index = 0; index < drops.length; index += 1) {
    assert.notEqual(drops[index], drops[index - 1], "consecutive drops repeated a buff type");
    assert.notEqual(drops[index], drops[index - 2], "a buff repeated within the last two drops");
  }
});

test("resetting run progress clears pity, banked rewards and restores the seeded sequence", () => {
  // Seed 2 misses six times, so the seventh kill is the pity-forced bank.
  const { manager } = makeManager(2);
  const initial = Array.from({ length: 7 }, (_, enemyIndex) => (
    manager.onEnemyDeath(enemyIndex, DROP_POSITION, { waveClosing: true })
  ));
  assert.equal(manager.getWaveCarryoverSnapshot().bankedWaveClosingBuffs.length, 1);

  manager.resetWaveProgress();

  assert.deepEqual(manager.getWaveCarryoverSnapshot().bankedWaveClosingBuffs, []);
  const replay = Array.from({ length: 7 }, (_, enemyIndex) => (
    manager.onEnemyDeath(enemyIndex, DROP_POSITION, { waveClosing: true })
  ));
  assert.deepEqual(replay, initial, "a fresh run should replay from the injected seed");
});

test("dt=0 pauses buffs and leaves dropped-orb spawns untouched", () => {
  const { manager } = makeManager(18);
  manager.debugActivateBuff("speed_boost");
  const drop = manager.onEnemyDeath(0, DROP_POSITION);
  assert.equal(drop.dropped, true, "seed 18 should begin with a natural drop");

  const before = manager.getWaveCarryoverSnapshot();
  assert.equal(before.pendingOrbCount, 1);
  manager.update(0, PLAYER_POSITION);
  const after = manager.getWaveCarryoverSnapshot();

  assert.deepEqual(after, before, "paused simulation must not spawn, collect or age buff state");
});

test("dropped orbs expire on the profile lifetime using simulation time", () => {
  const tuning = {
    ...getGameplayTuning("desktop-human").buffs,
    orbLifetimeS: 0.25,
  };
  const manager = new BuffManager(new Scene(), { seed: 18, tuning });
  const drop = manager.onEnemyDeath(0, DROP_POSITION);
  assert.equal(drop.dropped, true, "seed 18 should begin with a natural drop");

  manager.update(0.1, PLAYER_POSITION);
  assert.equal(manager.getWaveCarryoverSnapshot().orbCount, 1);
  manager.update(0.14, PLAYER_POSITION);
  assert.equal(manager.getWaveCarryoverSnapshot().orbCount, 1);
  manager.update(0, PLAYER_POSITION);
  assert.equal(manager.getWaveCarryoverSnapshot().orbCount, 1, "paused time must not age the orb");
  manager.update(0.02, PLAYER_POSITION);
  assert.equal(manager.getWaveCarryoverSnapshot().orbCount, 0);
});

test("active buffs and dropped-orb state carry across a wave boundary", () => {
  const { manager } = makeManager(18);
  manager.debugActivateBuff("rapid_fire");
  const drop = manager.onEnemyDeath(0, DROP_POSITION);
  assert.equal(drop.dropped, true);
  const before = manager.getWaveCarryoverSnapshot();

  manager.onNewWave();

  assert.deepEqual(manager.getWaveCarryoverSnapshot(), before);
});

test("a wave-closing drop is banked and activates at the next active wave", () => {
  const { manager, activations } = makeManager(18);
  const drop = manager.onEnemyDeath(0, DROP_POSITION, { waveClosing: true });
  assert.equal(drop.dropped, true);
  if (!drop.dropped) assert.fail("seed 18 should begin with a natural drop");
  assert.equal(drop.disposition, "banked");
  assert.deepEqual(manager.getWaveCarryoverSnapshot(), {
    activeBuffs: [],
    orbCount: 0,
    pendingOrbCount: 0,
    bankedWaveClosingBuffs: [drop.type],
  });

  manager.onNewWave();
  assert.deepEqual(manager.getWaveCarryoverSnapshot().bankedWaveClosingBuffs, [drop.type]);
  assert.equal(manager.beginActiveWave(), drop.type);
  assert.equal(manager.isBuffActive(drop.type), true);
  assert.deepEqual(activations, [drop.type]);
  assert.deepEqual(manager.getWaveCarryoverSnapshot().bankedWaveClosingBuffs, []);
});

function makeSingleRallyManager(seed: number): ReturnType<typeof makeManager> {
  const base = getGameplayTuning("desktop-human").buffs;
  const tuning = { ...base, perfectWave: { ...base.perfectWave, mode: "single-deterministic" as const } };
  const manager = new BuffManager(new Scene(), { seed, tuning });
  const activations: BuffType[] = [];
  const expiries: BuffType[] = [];
  manager.setOnBuffActivated((type) => activations.push(type));
  manager.setOnBuffExpired((type) => expiries.push(type));
  return { manager, activations, expiries };
}

test("single-deterministic Rallying Cry selects one buff for 15 seconds", () => {
  const rallyDurationS = getGameplayTuning("desktop-human").buffs.perfectWave.durationS;
  // speed_boost keeps this on the timed path; Iron Skin has its own tests.
  let seed = 0xc1a0;
  while (makeSingleRallyManager(seed).manager.activateRallyingCry() === "health_boost") seed += 1;
  const first = makeSingleRallyManager(seed);
  const replay = makeSingleRallyManager(seed);
  const selected = first.manager.activateRallyingCry();

  assert.equal(replay.manager.activateRallyingCry(), selected);
  assert.equal(first.manager.isRallyingCryActive(), true);
  assert.equal(first.manager.getRallyingCryBuffType(), selected);
  assert.deepEqual(first.activations, [selected]);
  assert.deepEqual(first.manager.getActiveBuffs(), [{
    type: selected,
    remainingS: rallyDurationS,
    durationS: rallyDurationS,
    persistent: false,
  }]);

  first.manager.update(5, PLAYER_POSITION);
  assert.equal(first.manager.activateRallyingCry(), selected, "refresh should keep the active selection");
  assert.equal(first.manager.getActiveBuffs()[0]!.remainingS, rallyDurationS);
  assert.deepEqual(first.activations, [selected, selected]);
  assert.equal(first.manager.getActiveBuffs().length, 1, "Rallying Cry must not accumulate buffs");

  first.manager.update(rallyDurationS, PLAYER_POSITION);
  assert.equal(first.manager.isRallyingCryActive(), false);
  assert.equal(first.manager.getRallyingCryBuffType(), null);
  assert.deepEqual(first.manager.getActiveBuffs(), []);
  assert.deepEqual(first.expiries, [selected]);

  const nextSelection = first.manager.activateRallyingCry();
  assert.notEqual(nextSelection, selected, "successive Rallying Cries should preserve selection variety");
  assert.equal(first.manager.getActiveBuffs().length, 1);
});

test("baseline Rallying Cry grants all four buffs; timed ones last 15 seconds", () => {
  const rallyDurationS = getGameplayTuning("desktop-human").buffs.perfectWave.durationS;
  const { manager, expiries } = makeManager();

  assert.equal(manager.activateRallyingCry(), null);
  assert.equal(manager.isRallyingCryActive(), true);
  assert.deepEqual(
    manager.getActiveBuffs().map((buff) => buff.type).sort(),
    [...BUFF_TYPES].sort(),
  );
  for (const buff of manager.getActiveBuffs()) {
    if (buff.type === "health_boost") {
      assert.equal(buff.persistent, true);
    } else {
      assert.equal(buff.remainingS, rallyDurationS);
    }
  }

  manager.update(rallyDurationS, PLAYER_POSITION);
  assert.equal(manager.isRallyingCryActive(), false, "the badge ends with the timed buffs");
  assert.deepEqual(expiries.sort(), ["rapid_fire", "speed_boost", "unlimited_ammo"]);
  assert.deepEqual(manager.getActiveBuffs().map((buff) => buff.type), ["health_boost"]);
});

test("Iron Skin has no timer and ends only when its shield is consumed", () => {
  const { manager, expiries } = makeManager();
  manager.debugActivateBuff("health_boost");

  manager.update(600, PLAYER_POSITION);
  assert.deepEqual(manager.getActiveBuffs(), [{
    type: "health_boost",
    remainingS: 0,
    durationS: 0,
    persistent: true,
  }]);
  assert.deepEqual(expiries, []);

  manager.consumeBuff("health_boost");
  assert.equal(manager.isBuffActive("health_boost"), false);
  assert.deepEqual(expiries, ["health_boost"]);
});

test("a timed Iron Skin still expires when the profile disables persistence", () => {
  const tuning = { ...getGameplayTuning("desktop-human").buffs, shieldPersistsUntilBroken: false };
  const manager = new BuffManager(new Scene(), { seed: 1, tuning });
  manager.debugActivateBuff("health_boost");
  manager.update(tuning.standardDurationS, PLAYER_POSITION);
  assert.equal(manager.isBuffActive("health_boost"), false);
});

test("activateAllBuffs remains available as a compatibility/debug helper", () => {
  const { manager } = makeManager();

  manager.activateAllBuffs();

  assert.deepEqual(
    manager.getActiveBuffs().map((buff) => buff.type).sort(),
    [...BUFF_TYPES].sort(),
  );
  assert.equal(manager.isRallyingCryActive(), false);
});

test("mobile human and desktop agent use the same pity and Rallying Cry baseline", () => {
  const baselineTuning = getGameplayTuning("desktop-human").buffs;
  const profileIds = ["desktop-human", "mobile-human", "desktop-agent"] as const;
  let baselineResults: BuffDropResult[] | null = null;
  let baselineRallyType: BuffType | null = null;

  for (const profileId of profileIds) {
    const tuning = getGameplayTuning(profileId).buffs;
    const manager = new BuffManager(new Scene(), { seed: 2, tuning });
    const resultCount = (tuning.pity.maxConsecutiveMisses ?? 0) + 1;
    const results = Array.from({ length: resultCount }, (_, enemyIndex) => (
      manager.onEnemyDeath(enemyIndex, DROP_POSITION, { waveClosing: true })
    ));
    const rallyType = manager.activateRallyingCry();

    assert.equal(tuning, baselineTuning);
    assert.equal(results.at(-1)?.dropped, true, `${profileId} must retain pity protection`);
    assert.equal(manager.isRallyingCryActive(), true);
    assert.equal(rallyType, null, `${profileId} Rallying Cry must grant all four buffs`);
    assert.deepEqual(
      manager.getActiveBuffs().map((buff) => buff.type).sort(),
      [...BUFF_TYPES].sort(),
    );

    baselineResults ??= results;
    baselineRallyType ??= rallyType;
    assert.deepEqual(results, baselineResults);
    assert.equal(rallyType, baselineRallyType);
  }
});
