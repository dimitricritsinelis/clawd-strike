import assert from "node:assert/strict";
import test from "node:test";
import type { ActiveBuffSnapshot } from "../buffs/BuffManager";
import { DESKTOP_HUMAN_GAMEPLAY_TUNING } from "../tuning/gameplayTuning";
import { createBuffDisplayCopy } from "./BuffDisplayCopy";
import { getDisplayedBuffTypes } from "./BuffTextHud";

function active(type: ActiveBuffSnapshot["type"]): ActiveBuffSnapshot {
  return { type, remainingS: 15, durationS: 15, persistent: false };
}

test("buff effect text matches the shared gameplay baseline", () => {
  const copy = createBuffDisplayCopy(DESKTOP_HUMAN_GAMEPLAY_TUNING);

  assert.deepEqual(copy.compactEffects, {
    speed_boost: "+20% Speed",
    rapid_fire: "0.08s Fire \u00B7 1.35\u00D7 Reload",
    unlimited_ammo: "Free Reloads",
    health_boost: "+30 HP",
  });
  assert.deepEqual(copy.detailedEffects, {
    speed_boost: "+20% movement speed",
    rapid_fire: "0.08 s fire interval, 1.35\u00D7 reload speed",
    unlimited_ammo: "Reloads never drain reserve ammo",
    health_boost: "+30 bonus health, lasts until shot off (absorbs damage first)",
  });
  assert.equal(copy.standardDurationLabel, "10s");
  assert.deepEqual(copy.durationLabels, {
    speed_boost: "10s",
    rapid_fire: "10s",
    unlimited_ammo: "10s",
    health_boost: "Until broken",
  });
  assert.equal(
    copy.perfectWaveDescription,
    "Score 10 headshot kills in a single wave to activate all four buffs simultaneously (Iron Skin lasts until broken) for 15 seconds at the start of the next wave.",
  );
});

test("buff copy follows a future profile tuning instead of retaining baseline numbers", () => {
  const divergentTuning = {
    ...DESKTOP_HUMAN_GAMEPLAY_TUNING,
    buffs: {
      ...DESKTOP_HUMAN_GAMEPLAY_TUNING.buffs,
      standardDurationS: 8,
      speedMultiplier: 1.1,
      rapidFireIntervalS: 0.09,
      rapidReloadSpeedMultiplier: 1.2,
      freeReloads: false,
      shieldHealth: 25,
      shieldPersistsUntilBroken: false,
      perfectWave: { mode: "all-four" as const, durationS: 12 },
    },
  };
  const copy = createBuffDisplayCopy(divergentTuning);

  assert.equal(copy.compactEffects.speed_boost, "+10% Speed");
  assert.equal(copy.compactEffects.rapid_fire, "0.09s Fire \u00B7 1.2\u00D7 Reload");
  assert.equal(copy.compactEffects.unlimited_ammo, "Standard Ammo");
  assert.equal(copy.compactEffects.health_boost, "+25 HP");
  assert.equal(copy.detailedEffects.health_boost, "+25 overshield (absorbs damage first)");
  assert.equal(copy.standardDurationLabel, "8s");
  assert.equal(copy.durationLabels.health_boost, "8s");
  assert.equal(
    copy.perfectWaveDescription,
    "Score 10 headshot kills in a single wave to activate all four buffs simultaneously for 12 seconds at the start of the next wave.",
  );
});

test("single-buff Rallying Cry displays its actual selected buff instead of all four effects", () => {
  assert.deepEqual(getDisplayedBuffTypes([active("rapid_fire")]), ["rapid_fire"]);
});

test("displayed active effects stay unique and follow canonical HUD order", () => {
  assert.deepEqual(
    getDisplayedBuffTypes([
      active("health_boost"),
      active("speed_boost"),
      active("health_boost"),
    ]),
    ["speed_boost", "health_boost"],
  );
});
