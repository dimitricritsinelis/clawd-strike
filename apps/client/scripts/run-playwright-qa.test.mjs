import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { normalizeChildExitCode, runPlaywrightQa } from "./run-playwright-qa.mjs";

test("normalizes Playwright failure and signal exits to nonzero", () => {
  assert.equal(normalizeChildExitCode(7, null), 7);
  assert.equal(normalizeChildExitCode(null, "SIGTERM"), 1);
  assert.equal(normalizeChildExitCode(0, null), 0);
});

test("propagates a Playwright failure exit code and still closes the server", async () => {
  let closed = 0;
  const startServer = async () => ({
    baseUrl: "http://127.0.0.1:43210/",
    async close() {
      closed += 1;
    },
  });
  const spawnImpl = () => {
    const child = new EventEmitter();
    child.exitCode = null;
    child.signalCode = null;
    child.kill = () => {};
    queueMicrotask(() => child.emit("exit", 7, null));
    return child;
  };
  const exitCode = await runPlaywrightQa(["test"], { startServer, spawnImpl });
  assert.equal(exitCode, 7);
  assert.equal(closed, 1);
});

test("passes only the owned URL and server identity to Playwright", async () => {
  let spawnedOptions;
  const startServer = async () => ({
    baseUrl: "http://127.0.0.1:43210/",
    runToken: "run-token",
    fingerprint: { profile: "qa" },
    async close() {},
  });
  const spawnImpl = (_command, _args, options) => {
    spawnedOptions = options;
    const child = new EventEmitter();
    child.exitCode = null;
    child.signalCode = null;
    child.kill = () => {};
    queueMicrotask(() => child.emit("exit", 0, null));
    return child;
  };
  const previous = {
    ALLOW_EXTERNAL_QA_SERVER: process.env.ALLOW_EXTERNAL_QA_SERVER,
    BASE_URL: process.env.BASE_URL,
    QA_BASE_URL: process.env.QA_BASE_URL,
    QA_EXTERNAL_RUN_TOKEN: process.env.QA_EXTERNAL_RUN_TOKEN,
  };
  Object.assign(process.env, {
    ALLOW_EXTERNAL_QA_SERVER: "1",
    BASE_URL: "http://stale.example/",
    QA_BASE_URL: "http://stale-qa.example/",
    QA_EXTERNAL_RUN_TOKEN: "stale-external-token",
  });
  try {
    const exitCode = await runPlaywrightQa(["test"], { startServer, spawnImpl });
    assert.equal(exitCode, 0);
    assert.equal(spawnedOptions.env.PW_BASE_URL, "http://127.0.0.1:43210/");
    assert.equal(spawnedOptions.env.BASE_URL, undefined);
    assert.equal(spawnedOptions.env.QA_BASE_URL, undefined);
    assert.equal(spawnedOptions.env.ALLOW_EXTERNAL_QA_SERVER, undefined);
    assert.equal(spawnedOptions.env.QA_EXTERNAL_RUN_TOKEN, undefined);
    assert.equal(spawnedOptions.env.QA_SERVER_RUN_TOKEN, "run-token");
    assert.equal(spawnedOptions.env.QA_SERVER_FINGERPRINT, JSON.stringify({ profile: "qa" }));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  test(`forwards ${signal} and closes the server`, async () => {
    const signalEmitter = new EventEmitter();
    let killedWith = null;
    let closed = 0;
    const child = new EventEmitter();
    child.exitCode = null;
    child.signalCode = null;
    child.kill = (receivedSignal) => {
      killedWith = receivedSignal;
      child.signalCode = receivedSignal;
      queueMicrotask(() => child.emit("exit", null, receivedSignal));
    };
    const running = runPlaywrightQa(["test"], {
      signalEmitter,
      startServer: async () => ({
        baseUrl: "http://127.0.0.1:43210/",
        async close() {
          closed += 1;
        },
      }),
      spawnImpl: () => child,
    });
    queueMicrotask(() => signalEmitter.emit(signal));
    assert.equal(await running, 1);
    assert.equal(killedWith, signal);
    assert.equal(closed, 1);
  });
}

test("closes the server when spawning Playwright fails", async () => {
  let closed = 0;
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.kill = () => {
    child.signalCode = "SIGTERM";
  };
  await assert.rejects(
    runPlaywrightQa(["test"], {
      startServer: async () => ({
        baseUrl: "http://127.0.0.1:43210/",
        async close() {
          closed += 1;
        },
      }),
      spawnImpl: () => {
        queueMicrotask(() => child.emit("error", new Error("spawn failed")));
        return child;
      },
    }),
    /spawn failed/,
  );
  assert.equal(closed, 1);
});

test("bounds a non-exiting Playwright child and escalates SIGTERM to SIGKILL", async () => {
  const signalEmitter = new EventEmitter();
  const signals = [];
  let closed = 0;
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.kill = (signal) => {
    signals.push(signal);
    if (signal === "SIGKILL") {
      child.signalCode = signal;
      queueMicrotask(() => child.emit("exit", null, signal));
    }
  };

  const exitCode = await runPlaywrightQa(["test"], {
    childTimeoutMs: 1,
    killGraceMs: 1,
    signalEmitter,
    startServer: async () => ({
      baseUrl: "http://127.0.0.1:43210/",
      async close() {
        closed += 1;
      },
    }),
    spawnImpl: () => child,
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(signals, ["SIGTERM", "SIGKILL"]);
  assert.equal(closed, 1);
});
