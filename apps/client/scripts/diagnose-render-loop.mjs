// Temporary controlled Linux diagnosis. It observes existing rendering and
// changes only the named driver/compositor probe, never game source or quality.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";

const dir = "artifacts/render-loop-diagnosis";
mkdirSync(dir, { recursive: true });
const record = (event) => {
  const line = JSON.stringify({ at: new Date().toISOString(), ...event });
  appendFileSync(`${dir}/events.jsonl`, `${line}\n`);
  console.info(line);
};
const bounded = async (promise, ms, label) => {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms);
    })]);
  } finally { clearTimeout(timer); }
};
const browser = await chromium.launch({
  channel: "chromium", headless: true,
  args: [
    ...(process.env.PW_SOFTWARE_RENDERING === "1" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : []),

  ],
});
record({ source: process.env.DIAGNOSTIC_SOURCE, probe: process.env.DIAGNOSTIC_PROBE, browser: browser.version() });
const system = await browser.newBrowserCDPSession();
record({ system: await system.send("SystemInfo.getInfo") });
let gpuPid = null;
let processSampling = false;
const sampleProcesses = async () => {
  if (processSampling) return;
  processSampling = true;
  try {
    const processes = (await bounded(system.send("SystemInfo.getProcessInfo"), 1000, "process info")).processInfo;
    gpuPid = processes.find(entry => entry.type === "GPU")?.id ?? gpuPid;
    record({ processes });
  } catch (error) { record({ processInfoError: error.message }); }
  finally { processSampling = false; }
};
await sampleProcesses();
const processTimer = setInterval(sampleProcesses, 5000);
const context = await browser.newContext({
  viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 },
  deviceScaleFactor: 1, isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36",
});
const page = await context.newPage();
page.on("console", message => record({ console: message.text(), type: message.type() }));
page.on("pageerror", error => record({ pageerror: error.message }));
await page.addInitScript(({ probe }) => {
  const info = console.info.bind(console);
  let active = false;
  console.info = (...args) => {
    if (String(args[0]).includes("[runtime:boot] runtime active")) {
      active = true;

    }
    info(...args);
  };
  if (probe === "anisotropy-one") {
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const nativeParameter = prototype.texParameterf;
      prototype.texParameterf = function (target, parameter, value) {
        // EXT_texture_filter_anisotropic's immutable enum. Only this temporary
        // probe changes sampling cost; materials, texture resolution and scene stay fixed.
        return nativeParameter.call(this, target, parameter, parameter === 0x84fe ? 1 : value);
      };
    }
  }
  const nativeRaf = window.requestAnimationFrame.bind(window);
  let frame = 0;
  let inFrame = false;
  let observed = new Set();
  window.requestAnimationFrame = callback => nativeRaf(time => {
    const diagnose = active && callback.name === "animate" && frame < 3;
    if (!diagnose) return callback(time);
    frame += 1;
    observed = new Set();
    inFrame = true;
    const start = performance.now();
    info(`[diagnostic] frame ${frame} entered`);
    try { return callback(time); }
    finally {
      info(`[diagnostic] frame ${frame} exited ${(performance.now() - start).toFixed(1)}ms`);
      inFrame = false;

    }
  });
  for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    for (const name of ["bufferData", "bufferSubData", "texImage2D", "getProgramParameter", "drawElements", "drawArrays", "finish"]) {
      const native = prototype[name];
      prototype[name] = function (...args) {
        if (!inFrame) return native.apply(this, args);
        const first = !observed.has(name);
        observed.add(name);
        if (first) info(`[diagnostic] frame ${frame} GL ${name} entered`);
        const start = performance.now();
        try { return native.apply(this, args); }
        finally {
          const elapsed = performance.now() - start;
          if (first || elapsed > 500) info(`[diagnostic] frame ${frame} GL ${name} exited ${elapsed.toFixed(1)}ms`);
        }
      };
    }
  }
}, { probe: process.env.DIAGNOSTIC_PROBE });
const profiler = await context.newCDPSession(page);
await profiler.send("Profiler.enable");
await profiler.send("Profiler.setSamplingInterval", { interval: 10000 });
await profiler.send("Profiler.start");
try {
  const url = new URL("/?map=bazaar-map&autostart=human&name=HumanProbe&shot=SHOT_02_SPAWN_A_TO_BAZAAR&spawn=A&qaAssetTimeoutMs=60000&floors=pbr&walls=pbr&vm=0&perf=1", process.env.DIAGNOSTIC_BASE_URL ?? "http://127.0.0.1:4173");
  await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
  await bounded(page.waitForFunction(() => {
    try {
      const ready = window.__runtime_ready_state?.();
      if (ready) return ready.mapLoaded === true && ready.revealPhase === "active";
      const state = JSON.parse(window.render_game_to_text?.() ?? "null");
      return state?.mode === "runtime" && (state?.runtimeReady === true
        || (state?.map?.loaded === true && state?.boot?.revealPhase === "active"));
    } catch { return false; }
  }, undefined, { timeout: 90000, polling: 100 }), 92000, "runtime readiness");
  record({ ready: true });
  for (let frame = 0; frame < 10; frame += 1) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const state = await bounded(page.evaluate(() => window.render_game_to_text?.()), 9000, "runtime state");
    writeFileSync(`${dir}/last-runtime-state.json`, state ?? "null");
    const parsed = JSON.parse(state ?? "null");
    record({ sample: frame, mode: parsed?.mode, boot: parsed?.boot, profile: parsed?.profile });
  }
  record({ outcome: "passed" });
} catch (error) {
  record({ outcome: "failed", error: error.message });
  process.exitCode = 1;
} finally {
  clearInterval(processTimer);
  if (gpuPid) {
    try {
      const pid = String(gpuPid);
      writeFileSync(`${dir}/gpu-cwd.txt`, execFileSync("readlink", [`/proc/${pid}/cwd`], { timeout: 2000 }));
      writeFileSync(`${dir}/gpu-threads.txt`, execFileSync("ps", ["-L", "-p", pid, "-o", "pid,tid,pcpu,state,comm"], { timeout: 2000 }));
      writeFileSync(`${dir}/gpu-native-stack.txt`, execFileSync("sudo", ["gdb", "--batch", "-p", pid, "-ex", "set pagination off", "-ex", "thread apply all bt 12", "-ex", "detach"], { timeout: 15000, maxBuffer: 1024 * 1024 }));
      record({ nativeStackSaved: true });
    } catch (error) { record({ nativeStackError: error.message }); }
  }
  try {
    const profile = await bounded(profiler.send("Profiler.stop"), 5000, "profiler stop");
    writeFileSync(`${dir}/cpu-profile.json`, JSON.stringify(profile));
  } catch (error) { record({ profilerError: error.message }); }
  await bounded(browser.close(), 5000, "browser close").catch(error => record({ cleanupError: error.message }));
  process.exit(process.exitCode ?? 0);
}
