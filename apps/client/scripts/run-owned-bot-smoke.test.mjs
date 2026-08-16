import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  normalizeChildExitCode,
  runOwnedBotSmoke,
} from "./run-owned-bot-smoke.mjs";

function createServer(overrides = {}) {
  let closeCount = 0;
  return {
    server: {
      baseUrl: "http://127.0.0.1:43210/",
      fingerprint: { profile: "bot-smoke", files: {} },
      owned: true,
      runToken: "owned-run-token",
      async close() {
        closeCount += 1;
      },
      ...overrides,
    },
    get closeCount() {
      return closeCount;
    },
  };
}

function createExitingChild(code = 0, signal = null) {
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.kill = (receivedSignal) => {
    child.signalCode = receivedSignal;
    queueMicrotask(() => child.emit("exit", null, receivedSignal));
  };
  queueMicrotask(() => {
    child.exitCode = code;
    child.emit("exit", code, signal);
  });
  return child;
}

test("normalizes child failure and signal exits to nonzero", () => {
  assert.equal(normalizeChildExitCode(7, null), 7);
  assert.equal(normalizeChildExitCode(null, "SIGTERM"), 1);
  assert.equal(normalizeChildExitCode(0, null), 0);
});

test("runs bot smoke against only the owned identified server", async () => {
  const fixture = createServer();
  let serverOptions = null;
  let spawned = null;
  const previous = {
    ALLOW_EXTERNAL_QA_SERVER: process.env.ALLOW_EXTERNAL_QA_SERVER,
    BASE_URL: process.env.BASE_URL,
    QA_BASE_URL: process.env.QA_BASE_URL,
    QA_SERVER_FINGERPRINT: process.env.QA_SERVER_FINGERPRINT,
    QA_SERVER_RUN_TOKEN: process.env.QA_SERVER_RUN_TOKEN,
  };
  Object.assign(process.env, {
    ALLOW_EXTERNAL_QA_SERVER: "1",
    BASE_URL: "http://stale-base.example/",
    QA_BASE_URL: "http://stale-qa.example/",
    QA_SERVER_FINGERPRINT: "stale-fingerprint",
    QA_SERVER_RUN_TOKEN: "stale-token",
  });

  try {
    const exitCode = await runOwnedBotSmoke({
      startServer: async (options) => {
        serverOptions = options;
        return fixture.server;
      },
      spawnImpl: (command, args, options) => {
        spawned = { command, args, options };
        return createExitingChild(0);
      },
    });

    assert.equal(exitCode, 0);
    assert.equal(serverOptions.allowExternal, false);
    assert.equal(serverOptions.baseUrlOverride, null);
    assert.equal(serverOptions.profile, "bot-smoke");
    assert.equal(spawned.command, process.execPath);
    assert.match(spawned.args[0], /bot-intelligence-smoke\.mjs$/);
    assert.equal(spawned.options.env.BASE_URL, fixture.server.baseUrl);
    assert.equal(spawned.options.env.QA_BASE_URL, undefined);
    assert.equal(spawned.options.env.ALLOW_EXTERNAL_QA_SERVER, undefined);
    assert.equal(spawned.options.env.QA_SERVER_RUN_TOKEN, fixture.server.runToken);
    assert.equal(
      spawned.options.env.QA_SERVER_FINGERPRINT,
      JSON.stringify(fixture.server.fingerprint),
    );
    assert.equal(fixture.closeCount, 1);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("propagates bot smoke failure and still closes the owned server", async () => {
  const fixture = createServer();
  const exitCode = await runOwnedBotSmoke({
    startServer: async () => fixture.server,
    spawnImpl: () => createExitingChild(7),
  });
  assert.equal(exitCode, 7);
  assert.equal(fixture.closeCount, 1);
});

test("closes the owned server when bot smoke spawning fails", async () => {
  const fixture = createServer();
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.kill = () => {
    child.signalCode = "SIGTERM";
  };

  await assert.rejects(
    runOwnedBotSmoke({
      startServer: async () => fixture.server,
      spawnImpl: () => {
        queueMicrotask(() => child.emit("error", new Error("spawn failed")));
        return child;
      },
    }),
    /spawn failed/,
  );
  assert.equal(fixture.closeCount, 1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  test(`forwards ${signal} and closes the owned server`, async () => {
    const fixture = createServer();
    const signalEmitter = new EventEmitter();
    let killedWith = null;
    const child = new EventEmitter();
    child.exitCode = null;
    child.signalCode = null;
    child.kill = (receivedSignal) => {
      killedWith = receivedSignal;
      child.signalCode = receivedSignal;
      queueMicrotask(() => child.emit("exit", null, receivedSignal));
    };

    const running = runOwnedBotSmoke({
      signalEmitter,
      startServer: async () => fixture.server,
      spawnImpl: () => child,
    });
    queueMicrotask(() => signalEmitter.emit(signal));

    assert.equal(await running, 1);
    assert.equal(killedWith, signal);
    assert.equal(fixture.closeCount, 1);
  });
}

test("terminates a timed-out bot smoke and closes the owned server", async () => {
  const fixture = createServer();
  let killedWith = null;
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.kill = (receivedSignal) => {
    killedWith = receivedSignal;
    child.signalCode = receivedSignal;
    queueMicrotask(() => child.emit("exit", null, receivedSignal));
  };

  const exitCode = await runOwnedBotSmoke({
    childTimeoutMs: 1,
    startServer: async () => fixture.server,
    spawnImpl: () => child,
  });

  assert.equal(exitCode, 1);
  assert.equal(killedWith, "SIGTERM");
  assert.equal(fixture.closeCount, 1);
});

test("escalates a non-exiting timed-out bot smoke from SIGTERM to SIGKILL", async () => {
  const fixture = createServer();
  const signals = [];
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

  const exitCode = await runOwnedBotSmoke({
    childTimeoutMs: 1,
    killGraceMs: 1,
    startServer: async () => fixture.server,
    spawnImpl: () => child,
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(signals, ["SIGTERM", "SIGKILL"]);
  assert.equal(fixture.closeCount, 1);
});

test("rejects an unidentified server and closes it without spawning", async () => {
  const fixture = createServer({ runToken: null });
  let spawned = false;
  await assert.rejects(
    runOwnedBotSmoke({
      startServer: async () => fixture.server,
      spawnImpl: () => {
        spawned = true;
        return createExitingChild(0);
      },
    }),
    /missing its run token/,
  );
  assert.equal(spawned, false);
  assert.equal(fixture.closeCount, 1);
});
