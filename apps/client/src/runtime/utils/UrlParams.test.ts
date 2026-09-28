import assert from "node:assert/strict";
import test from "node:test";
import { parseRuntimeUrlParams, resolveDesktopMaxPixelRatio } from "./UrlParams";

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
