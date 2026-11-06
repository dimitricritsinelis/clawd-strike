import assert from "node:assert/strict";
import test from "node:test";
import { waitForWarmupBeforeDeadline } from "./warmupDeadline";

test("a timed-out warmup disposes its eventual result instead of transferring ownership", async () => {
  let complete!: (value: { dispose: () => void }) => void;
  const pending = new Promise<{ dispose: () => void }>((resolve) => { complete = resolve; });
  let disposals = 0;
  const result = await waitForWarmupBeforeDeadline(pending, 1, (asset) => asset.dispose());
  assert.equal(result, null);
  assert.equal(disposals, 0);
  complete({ dispose: () => { disposals += 1; } });
  await pending;
  await Promise.resolve();
  assert.equal(disposals, 1);
});

test("completed warmup transfers ownership without disposing the live result", async () => {
  let disposals = 0;
  const asset = { dispose: () => { disposals += 1; } };
  const result = await waitForWarmupBeforeDeadline(Promise.resolve(asset), 1, (late) => late.dispose());
  assert.equal(result, asset);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(disposals, 0);
});

test("failed warmup reports its error without leaking a pending timeout", async () => {
  const error = new Error("warmup failed");
  await assert.rejects(waitForWarmupBeforeDeadline(Promise.reject(error), 10_000, () => {
    assert.fail("failure has no result to dispose");
  }), error);
});
