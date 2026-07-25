import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { installSignalCleanup } from "./childLifecycle.mjs";

test("direct QA process signals await cleanup once and preserve conventional exit codes", async () => {
  const signalEmitter = new EventEmitter();
  const cleanupSignals = [];
  const exitCode = new Promise((resolve) => {
    const remove = installSignalCleanup(async (signal) => {
      cleanupSignals.push(signal);
      await Promise.resolve();
    }, {
      signalEmitter,
      exit: resolve,
    });
    signalEmitter.emit("SIGTERM");
    signalEmitter.emit("SIGINT");
    remove();
  });

  assert.equal(await exitCode, 143);
  assert.deepEqual(cleanupSignals, ["SIGTERM"]);
  assert.equal(signalEmitter.listenerCount("SIGINT"), 0);
  assert.equal(signalEmitter.listenerCount("SIGTERM"), 0);
});

test("direct QA process signals remain bounded when cleanup hangs", async () => {
  const signalEmitter = new EventEmitter();
  const errors = [];
  const exitCode = new Promise((resolve) => {
    installSignalCleanup(() => new Promise(() => {}), {
      signalEmitter,
      cleanupTimeoutMs: 1,
      exit: resolve,
      onError: (error, signal) => errors.push({ error, signal }),
    });
    signalEmitter.emit("SIGINT");
  });

  assert.equal(await exitCode, 130);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].signal, "SIGINT");
  assert.match(errors[0].error.message, /cleanup timed out/);
});
