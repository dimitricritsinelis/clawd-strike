import assert from "node:assert/strict";
import test from "node:test";
import { parseRuntimeUrlParams, resolveDesktopMaxPixelRatio, parseAutoStartSelection, parseLoadingUrlParams, resolveQaAssetProfile, resolveQaAssetTimeoutMs } from "./UrlParams";

test("high quality tier is the default: native resolution, 2k surfaces, AO in live play", () => {
  const params = parseRuntimeUrlParams("?map=bazaar-map");
  assert.equal(params.quality, "high");
  assert.equal(params.floorQuality, "2k");
  assert.equal(params.ao, true);
  assert.equal(resolveDesktopMaxPixelRatio("?map=bazaar-map"), 2);
});

test("standard tier restores the earlier budget", () => {
  const params = parseRuntimeUrlParams("?quality=standard");
  assert.equal(params.quality, "standard");
  assert.equal(params.floorQuality, "1k");
  assert.equal(params.ao, false);
  assert.equal(resolveDesktopMaxPixelRatio("?quality=standard"), 1.1);
});

test("explicit floorRes and ao still win over the tier", () => {
  const params = parseRuntimeUrlParams("?floorRes=1k&ao=0");
  assert.equal(params.floorQuality, "1k");
  assert.equal(params.ao, false);
  assert.equal(parseRuntimeUrlParams("?quality=standard&shot=SHOT_1").ao, true);
});


test("launch parsing validates names and preserves auto-start precedence", () => {
  assert.deepEqual(parseAutoStartSelection("?autostart=AGENT&mode=human&name=Agent+One"), {
    runtimeLaunchSelection: { mode: "agent", playerName: "Agent One" },
    initialNameEntry: null,
  });
  assert.equal(parseAutoStartSelection("?mode=agent&name=Agent").runtimeLaunchSelection, null);
  const invalid = parseAutoStartSelection("?autostart=human&name=%3Cbad%3E");
  assert.equal(invalid.runtimeLaunchSelection, null);
  assert.equal(invalid.initialNameEntry?.mode, "human");
  assert.notEqual(invalid.initialNameEntry?.validationReason, "valid");
});

test("menu agent detection retains raw-query behavior independently of runtime mode", () => {
  for (const search of ["?mode=human&autostart=agent", "?MODE=AGENT", "?mode=human&mode=agent"]) {
    assert.equal(parseLoadingUrlParams(search).runtimeUrlIsAgent, true);
  }
  for (const search of ["?mode=%61gent", "?mode=agent%20", "?mode=agent-extra"]) {
    assert.equal(parseLoadingUrlParams(search).runtimeUrlIsAgent, false);
  }
  assert.equal(parseRuntimeUrlParams("?mode=human&autostart=agent").controlMode, "human");
});

test("boot flags keep exact matching, duplicate-key precedence and QA bounds", () => {
  const params = parseRuntimeUrlParams("?qaTargets=one,,+two+,one&shadows=0&audio=0&audio=1&bootGate=1&gfx=standard&god=0");
  assert.deepEqual(params.qaTargets, ["one", "two", "one"]);
  assert.equal(params.shadows, false);
  assert.equal(params.audioForced, "0");
  assert.equal(params.forceHumanBootGate, true);
  assert.equal(params.quality, "standard");
  assert.equal(params.unlimitedHealthExplicit, false);
  assert.equal(parseRuntimeUrlParams("?shadows=false&bootGate=true").shadows, true);
  assert.equal(parseRuntimeUrlParams("?bootGate=true").forceHumanBootGate, false);
  assert.equal(parseLoadingUrlParams("?audio=0&audio=1").audioForced, "0");
  assert.equal(resolveQaAssetProfile("?qa=1&shot="), "cell-review");
  assert.equal(resolveQaAssetProfile("?qa=true"), null);
  assert.equal(resolveQaAssetTimeoutMs("?qaAssetTimeoutMs=2000junk"), 2000);
  assert.equal(resolveQaAssetTimeoutMs("?qaAssetTimeoutMs=-1"), 1000);
});
