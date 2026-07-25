export const DEFAULT_CHILD_KILL_GRACE_MS = 5_000;
export const DEFAULT_SIGNAL_CLEANUP_TIMEOUT_MS = 45_000;

const SIGNAL_EXIT_CODES = Object.freeze({
  SIGINT: 130,
  SIGTERM: 143,
});

function positiveTimeout(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return parsed;
}

export function parseChildTimeout(value, fallback, label) {
  return positiveTimeout(value, fallback, label);
}

export function normalizeChildExitCode(code, signal) {
  if (Number.isInteger(code)) return code;
  return signal ? 1 : 0;
}

export async function waitForChildLifecycle(child, options = {}) {
  const {
    timeoutMs,
    killGraceMs = DEFAULT_CHILD_KILL_GRACE_MS,
    signalEmitter = process,
  } = options;
  const boundedTimeoutMs = positiveTimeout(timeoutMs, null, "child timeout");
  const boundedKillGraceMs = positiveTimeout(
    killGraceMs,
    DEFAULT_CHILD_KILL_GRACE_MS,
    "child kill grace",
  );

  return new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let forwardedSignal = null;
    let timeout = null;
    let escalation = null;
    let forcedSettlement = null;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (escalation) clearTimeout(escalation);
      if (forcedSettlement) clearTimeout(forcedSettlement);
      signalEmitter.removeListener("SIGINT", onSigint);
      signalEmitter.removeListener("SIGTERM", onSigterm);
      child.removeListener("error", onError);
      child.removeListener("exit", onExit);
    };
    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        timedOut,
        forwardedSignal,
        ...result,
      });
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const kill = (signal) => {
      try {
        child.kill(signal);
      } catch {
        // The exit/error event remains authoritative. Escalation below keeps
        // cleanup bounded even when a mocked or wedged child rejects kill().
      }
    };
    const beginTermination = (signal) => {
      if (settled || escalation) return;
      kill(signal);
      escalation = setTimeout(() => {
        if (settled) return;
        kill("SIGKILL");
        forcedSettlement = setTimeout(() => {
          finish({ code: null, signal: "SIGKILL", forced: true });
        }, boundedKillGraceMs);
      }, boundedKillGraceMs);
    };
    const onSigint = () => {
      forwardedSignal = "SIGINT";
      beginTermination("SIGINT");
    };
    const onSigterm = () => {
      forwardedSignal = "SIGTERM";
      beginTermination("SIGTERM");
    };
    const onError = (error) => fail(error);
    const onExit = (code, signal) => finish({ code, signal, forced: false });

    child.once("error", onError);
    child.once("exit", onExit);
    signalEmitter.once("SIGINT", onSigint);
    signalEmitter.once("SIGTERM", onSigterm);
    if (boundedTimeoutMs !== null) {
      timeout = setTimeout(() => {
        timedOut = true;
        beginTermination("SIGTERM");
      }, boundedTimeoutMs);
    }
  });
}

export function forceKillChild(child) {
  if (!child || child.exitCode != null || child.signalCode != null) return;
  try {
    child.kill("SIGKILL");
  } catch {
    // Best effort during outer cleanup.
  }
}

export function installSignalCleanup(cleanup, options = {}) {
  if (typeof cleanup !== "function") {
    throw new Error("signal cleanup must be a function");
  }
  const {
    signalEmitter = process,
    cleanupTimeoutMs = DEFAULT_SIGNAL_CLEANUP_TIMEOUT_MS,
    exit = (code) => process.exit(code),
    onError = (error, signal) => {
      console.error(
        `[qa-process] ${signal} cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    },
  } = options;
  const boundedCleanupTimeoutMs = positiveTimeout(
    cleanupTimeoutMs,
    DEFAULT_SIGNAL_CLEANUP_TIMEOUT_MS,
    "signal cleanup timeout",
  );
  let handlingSignal = false;
  let removed = false;

  const remove = () => {
    if (removed) return;
    removed = true;
    signalEmitter.removeListener("SIGINT", onSigint);
    signalEmitter.removeListener("SIGTERM", onSigterm);
  };
  const handleSignal = (signal) => {
    if (handlingSignal) return;
    handlingSignal = true;
    void (async () => {
      let timeout = null;
      try {
        await Promise.race([
          Promise.resolve().then(() => cleanup(signal)),
          new Promise((_, reject) => {
            timeout = setTimeout(() => {
              reject(new Error(`cleanup timed out after ${boundedCleanupTimeoutMs}ms`));
            }, boundedCleanupTimeoutMs);
          }),
        ]);
      } catch (error) {
        onError(error, signal);
      } finally {
        if (timeout) clearTimeout(timeout);
        remove();
        exit(SIGNAL_EXIT_CODES[signal] ?? 1);
      }
    })();
  };
  function onSigint() {
    handleSignal("SIGINT");
  }
  function onSigterm() {
    handleSignal("SIGTERM");
  }

  signalEmitter.on("SIGINT", onSigint);
  signalEmitter.on("SIGTERM", onSigterm);
  return remove;
}
