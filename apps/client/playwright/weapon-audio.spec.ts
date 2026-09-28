import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("wind survives pending audio unlock, loops quietly, and respects mute", async ({ page }) => {
  await page.route("**/assets/audio/ambient/market-chatter.wav", (route) => route.abort());
  await page.route("**/__wind_test", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Wind test</title>",
  }));
  await page.goto("/__wind_test");
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/audio/WeaponAudio.ts";
    const { WeaponAudio } = await import(moduleUrl);
    const original = window.AudioContext;
    const ctx = new OfflineAudioContext(1, 48000 * 25, 48000);
    let contexts = 0;
    window.AudioContext = function () {
      contexts++;
      return ctx;
    } as unknown as typeof AudioContext;
    try {
      const muted = new WeaponAudio();
      muted.setMuted(true);
      muted.startAmbient();
      const mutedContexts = contexts;
      const audio = new WeaponAudio();
      // Offline contexts are suspended until rendering, just like pending unlock.
      audio.startAmbient();
      const source = audio.ambientSource;
      audio.startAmbient();
      const singleLoop = source !== null && source === audio.ambientSource;
      const output = await ctx.startRendering();
      const samples = output.getChannelData(0);
      const rms = (start: number, end: number) => {
        const segment = samples.subarray(start * 48000, end * 48000);
        return Math.sqrt(segment.reduce((sum, value) => sum + value * value, 0) / segment.length);
      };
      return { mutedContexts, singleLoop, onset: rms(0, 0.25), bed: rms(4, 8),
        repeated: rms(16, 20), peak: samples.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0) };
    } finally {
      window.AudioContext = original;
    }
  });
  expect(result.mutedContexts).toBe(0);
  expect(result.singleLoop).toBe(true);
  expect(result.bed).toBeGreaterThan(0.0005);
  expect(result.peak).toBeLessThan(0.02);
  expect(result.onset).toBeLessThan(result.bed * 0.2);
  expect(result.repeated / result.bed).toBeCloseTo(1, 2);
});

test("marketplace asset plays quietly, repeats, and stops on mute", async ({ page }) => {
  await page.route("**/__market_test", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Marketplace audio test</title>",
  }));
  await page.goto("/__market_test");
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/audio/WeaponAudio.ts";
    const { WeaponAudio } = await import(moduleUrl);
    const original = window.AudioContext;
    const ctx = new OfflineAudioContext(2, 48000 * 100, 48000);
    window.AudioContext = function () {
      return new Proxy(ctx, { get(target, key) {
        if (key === "close") return () => Promise.resolve();
        const value = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      } });
    } as unknown as typeof AudioContext;
    try {
      const audio = new WeaponAudio();
      audio.startAmbient();
      const pending = audio.marketplaceLoadPromise;
      audio.startAmbient();
      const singleLoad = pending === audio.marketplaceLoadPromise;
      await pending;
      const source = audio.marketplaceSource;
      if (!source) throw new Error("Marketplace asset did not load");
      audio.startAmbient();
      const singleSource = source === audio.marketplaceSource;
      audio.ambientGain.disconnect(); // Isolate the chatter's real output level.
      const output = await ctx.startRendering();
      const samples = output.getChannelData(0);
      const rms = (start: number, end: number) => {
        let energy = 0;
        for (let i = start * 48000; i < end * 48000; i++) energy += samples[i]! ** 2;
        return Math.sqrt(energy / ((end - start) * 48000));
      };
      let peak = 0, repeatError = 0;
      for (const value of samples) peak = Math.max(peak, Math.abs(value));
      for (let i = 4 * 48000; i < 48 * 48000; i++) {
        repeatError = Math.max(repeatError, Math.abs(samples[i]! - samples[i + 48 * 48000]!));
      }
      let stopped = false;
      const stop = source.stop.bind(source);
      source.stop = () => { stopped = true; stop(); };
      audio.setMuted(true);
      audio.startAmbient();
      return { singleLoad, singleSource, duration: source.buffer.duration,
        bed: rms(4, 48), onset: rms(0, 0.25), peak, repeatError, stopped,
        cleared: audio.marketplaceSource === null && audio.marketplaceGain === null && audio.audioContext === null };
    } finally { window.AudioContext = original; }
  });
  expect(result.singleLoad && result.singleSource).toBe(true);
  expect(result.duration).toBe(48);
  expect(result.bed).toBeGreaterThan(0.0001);
  expect(result.bed).toBeLessThan(0.0006);
  expect(result.onset).toBeLessThan(result.bed * 0.2);
  expect(result.peak).toBeLessThan(0.002);
  expect(result.repeatError).toBeLessThan(1e-7);
  expect(result.stopped && result.cleared).toBe(true);
});

test("late or failed marketplace loads preserve ambient lifecycle", async ({ page }) => {
  await page.route("**/__market_lifecycle", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Marketplace lifecycle test</title>",
  }));
  await page.goto("/__market_lifecycle");
  const results = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/audio/WeaponAudio.ts";
    const { WeaponAudio } = await import(moduleUrl);
    const original = window.AudioContext, originalFetch = window.fetch;
    const bytes = await (await fetch("/assets/audio/ambient/market-chatter.wav")).arrayBuffer();
    const results = [];
    try {
      for (const scenario of ["mute", "dispose", "failure"]) {
        const ctx = new OfflineAudioContext(2, 48000, 48000);
        window.AudioContext = function () {
          return new Proxy(ctx, { get(target, key) {
            if (key === "close") return () => Promise.resolve();
            const value = Reflect.get(target, key, target);
            return typeof value === "function" ? value.bind(target) : value;
          } });
        } as unknown as typeof AudioContext;
        let release!: (response: Response) => void;
        window.fetch = () => new Promise<Response>((resolve) => { release = resolve; });
        const audio = new WeaponAudio();
        audio.startAmbient();
        const pending = audio.marketplaceLoadPromise;
        if (scenario === "mute") audio.setMuted(true);
        if (scenario === "dispose") audio.dispose();
        release(new Response(scenario === "failure" ? null : bytes.slice(0), {
          status: scenario === "failure" ? 404 : 200,
        }));
        await pending;
        results.push({ scenario, noChatter: audio.marketplaceSource === null,
          windRunning: audio.ambientSource !== null });
        audio.dispose();
      }
    } finally { window.AudioContext = original; window.fetch = originalFetch; }
    return results;
  });
  for (const result of results) {
    expect(result.noChatter).toBe(true);
    expect(result.windRunning).toBe(result.scenario === "failure");
  }
});

test("each fired round schedules audio and keeps its flash on the shot frame", async ({ page }) => {
  await page.route("**/__weapon_sync_test", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Weapon sync test</title>",
  }));
  await page.goto("/__weapon_sync_test");
  const results = await page.evaluate(async () => {
    const audioUrl = "/src/runtime/audio/WeaponAudio.ts";
    const weaponUrl = "/src/runtime/weapons/Ak47Weapon.ts";
    const viewUrl = "/src/runtime/weapons/Ak47AnimatedViewModel.ts";
    const worldUrl = "/src/runtime/sim/collision/WorldColliders.ts";
    const { WeaponAudio } = await import(audioUrl);
    const { Ak47Weapon } = await import(weaponUrl);
    const { createAk47ViewModel } = await import(viewUrl);
    const { WorldColliders } = await import(worldUrl);
    const original = window.AudioContext;
    const ctx = new OfflineAudioContext(2, 48000 * 5, 48000);
    let time = 0;
    window.AudioContext = function () {
      return new Proxy(ctx, { get(target, key) {
        if (key === "currentTime") return time;
        if (key === "state") return "running";
        const value = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      } });
    } as unknown as typeof AudioContext;
    const results = [];
    try {
      const audio = new WeaponAudio();
      audio.ensureAudioGraph();
      audio.ensureBuffersLoaded();
      await audio.loadPromise;
      if (!audio.shotVariants) throw new Error("Gunshot asset did not load");
      const world = new WorldColliders([], { x: -100, y: -100, w: 200, h: 200 });
      for (const search of ["", "?weapon=legacy"]) {
        const vm = createAk47ViewModel({ vmDebug: false, search });
        if (!search) await vm.load();
        const camera = vm.viewModelCamera.clone(false);
        const flash = search ? vm.muzzleFlash : vm.viewModelScene.getObjectByName("MuzzleFlame");
        for (const fps of [144, 60, 30, 10]) for (const rate of [8, 12.5]) {
          const weapon = new Ak47Weapon({ seed: 7 });
          weapon.setFireIntervalS(1 / rate);
          let shots = 0, audioMatches = 0, visibleShotFrames = 0, shotFrames = 0;
          for (let frame = 0; frame < fps; frame++) {
            time += 1 / fps;
            let fired = false;
            weapon.update({
              deltaSeconds: 1 / fps, fireHeld: true, world,
              origin: camera.position, forward: camera.getWorldDirection(camera.position.clone()),
              grounded: true, speedMps: 0,
            }, () => {
              shots++;
              fired = true;
              vm.triggerShotFx();
              audio.playAk47Shot();
              if (audio.playerBurst.close?.startTime === time) audioMatches++;
            });
            vm.updateFromMainCamera(camera, 1 / fps);
            if (fired) {
              shotFrames++;
              if (flash.visible) visibleShotFrames++;
            }
          }
          vm.updateFromMainCamera(camera, .1);
          vm.updateFromMainCamera(camera, .1);
          results.push({ search, fps, rate, shots, audioMatches, shotFrames, visibleShotFrames, ended: !flash.visible });
        }
        vm.dispose();
      }
      return results;
    } finally {
      window.AudioContext = original;
    }
  });
  for (const result of results) {
    expect(result.shots, JSON.stringify(result)).toBeGreaterThanOrEqual(Math.floor(result.rate));
    expect(result.audioMatches, JSON.stringify(result)).toBe(result.shots);
    expect(result.visibleShotFrames, JSON.stringify(result)).toBe(result.shotFrames);
    expect(result.ended, JSON.stringify(result)).toBe(true);
  }
});

test("rebuilt AK layers, burst ducking, variations, and positional enemy mix", async ({ page }, testInfo) => {
  // Exercise real asset fetching, decoding, the Float32 rebuild and Web Audio without speaker output.
  await page.route("**/__weapon_audio_test", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Weapon audio test</title>",
  }));
  await page.goto("/__weapon_audio_test");
  const results = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/audio/WeaponAudio.ts";
    const { WeaponAudio } = await import(moduleUrl);
    const sampleRate = 48000;
    const originalConstructor = window.AudioContext;
    type Shot = { time: number; enemy?: string; distance?: number; pan?: number; behind?: number };
    async function render(shots: Shot[], seconds = 6) {
      const ctx = new OfflineAudioContext(2, sampleRate * seconds, sampleRate);
      let time = 0;
      const proxy = new Proxy(ctx, {
        get(target, key) {
          if (key === "currentTime") return time;
          if (key === "state") return "running";
          const value = Reflect.get(target, key, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      window.AudioContext = function () { return proxy; } as unknown as typeof AudioContext;
      const audio = new WeaponAudio();
      audio.ensureAudioGraph();
      audio.ensureBuffersLoaded();
      await audio.loadPromise;
      if (!audio.shotVariants) throw new Error("Gunshot assets did not load");
      const picks: number[] = [];
      for (const shot of shots) {
        time = shot.time;
        if (shot.enemy) {
          audio.playAk47ShotQuiet({ sourceId: shot.enemy, distanceM: shot.distance, pan: shot.pan, behind: shot.behind });
        } else {
          audio.playAk47Shot();
          picks.push(audio.lastPlayerVariant);
        }
      }
      const output = await ctx.startRendering();
      // Allow ended callbacks to release per-shooter tracking and connected nodes.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const samples = [output.getChannelData(0), output.getChannelData(1)];
      const range = (start: number, end: number) => [Math.round(start * sampleRate), Math.round(end * sampleRate)] as const;
      const energy = (channel: Float32Array, start: number, end: number) => {
        const [first, last] = range(start, end);
        let sum = 0;
        for (let i = first; i < last; i++) sum += channel[i]! ** 2;
        return sum / (last - first);
      };
      const rms = (start: number, end: number) => Math.sqrt((energy(samples[0]!, start, end) + energy(samples[1]!, start, end)) / 2);
      const channelDb = (start: number, end: number) =>
        10 * Math.log10(energy(samples[1]!, start, end) / Math.max(1e-30, energy(samples[0]!, start, end)));
      // First-difference energy over signal energy: a brightness proxy.
      const brightness = (start: number, end: number) => {
        const [first, last] = range(start, end);
        let diff = 0, sum = 0;
        for (const channel of samples) for (let i = first + 1; i < last; i++) {
          diff += (channel[i]! - channel[i - 1]!) ** 2; sum += channel[i]! ** 2;
        }
        return diff / Math.max(1e-30, sum);
      };
      let peak = 0, nearFullScale = 0;
      for (const channel of samples) for (const value of channel) {
        if (!Number.isFinite(value)) throw new Error("Non-finite audio sample");
        peak = Math.max(peak, Math.abs(value));
        if (Math.abs(value) >= 0.999) nearFullScale++;
      }
      const onsetSample = samples[0]!.findIndex((value, i) =>
        Math.max(Math.abs(value), Math.abs(samples[1]![i]!)) > peak * 0.01);
      return {
        rms, channelDb, brightness, peak, nearFullScale, picks, onsetS: onsetSample / sampleRate,
        variantCount: audio.shotVariants.length, activeEnemies: audio.enemyBursts.size,
        activePlayer: Object.keys(audio.playerBurst).filter((key) => key !== "lastVariant").length,
      };
    }
    const db = (ratio: number) => 20 * Math.log10(ratio);
    try {
      const solo = await render([{ time: 0.3 }]);
      const burstShots = Array.from({ length: 30 }, (_, i) => ({ time: 0.3 + i * 0.1 }));
      const burst = await render(burstShots, 7);
      const window20Ms: number[] = [];
      for (let t = 0.5; t < 3.2; t += 0.02) window20Ms.push(burst.rms(t, t + 0.02));
      const burstMean = burst.rms(0.5, 3.2);
      const picks = (await render(Array.from({ length: 40 }, (_, i) => ({ time: 0.3 + i * 0.1 })))).picks;
      const distances = [-5, 0, 2, 10, 22, 42, 62, 120];
      const enemies = [];
      for (const distance of distances) {
        const enemy = await render([{ time: 0.3, enemy: "a", distance }]);
        enemies.push({ distance, rms: enemy.rms(0.3, 1.1), lateShare: db(enemy.rms(0.8, 1.3) / enemy.rms(0.3, 0.4)),
          balanceDb: enemy.channelDb(0.3, 1.1), activeEnemies: enemy.activeEnemies });
      }
      const spatial = [];
      for (const [pan, behind] of [[0, 0], [1, 0], [-1, 0], [0, 1]] as const) {
        const enemy = await render([{ time: 0.3, enemy: "a", distance: 10, pan, behind }]);
        spatial.push({ pan, behind, rightOverLeftDb: enemy.channelDb(0.3, 0.6), rms: enemy.rms(0.3, 1.1),
          brightness: enemy.brightness(0.3, 0.5) });
      }
      const crowd = await render(burstShots.flatMap((shot) => Array.from({ length: 10 }, (_, i) => ({
        time: shot.time, enemy: `enemy-${i}`, distance: 0,
      }))));
      const sameShooter = await render([{ time: 0.3, enemy: "a", distance: 2 }, { time: 0.4, enemy: "a", distance: 2 }]);
      const separateShooters = await render([{ time: 0.3, enemy: "a", distance: 2 }, { time: 0.4, enemy: "b", distance: 2 }]);
      const invalid = await render([{ time: 0.3, enemy: "a", distance: NaN }, { time: 0.4, enemy: "a", distance: Infinity }]);
      return {
        variantCount: solo.variantCount,
        picks,
        soloPeak: solo.peak,
        soloPeakDb: db(solo.peak),
        soloNearFullScale: solo.nearFullScale,
        burstNearFullScale: burst.nearFullScale,
        soloOnsetDelayMs: (solo.onsetS - 0.3) * 1000,
        soloHeadRms: solo.rms(0.3, 0.35),
        soloDecayDb: db(solo.rms(0.6, 0.9) / solo.rms(0.3, 0.4)),
        soloRoomTailDb: db(solo.rms(1.3, 1.8) / solo.rms(0.3, 0.4)),
        soloEndedRms: solo.rms(2.7, 3.2),
        soloRms: solo.rms(0.3, 1.1),
        soloRmsDb: db(solo.rms(0.3, 1.1)),
        soloStereoDb: solo.channelDb(0.3, 1.1),
        playerBurstRms: burst.rms(0.8, 3.2),
        playerBurstRmsDb: db(burst.rms(0.8, 3.2)),
        burstPeakDb: db(burst.peak),
        burstMinWindowDb: db(Math.min(...window20Ms) / burstMean),
        finalTailRatioDb: db(burst.rms(3.7, 4.2) / solo.rms(0.8, 1.3)),
        burstEndedRms: burst.rms(6.0, 6.5),
        enemies, spatial,
        crowdPeak: crowd.peak, crowdRms: crowd.rms(0.8, 3.2),
        crowdActiveEnemies: crowd.activeEnemies, activePlayer: burst.activePlayer,
        independentShooterDb: db(separateShooters.rms(0.45, 0.7) / sameShooter.rms(0.45, 0.7)),
        invalidPeak: invalid.peak,
      };
    } finally {
      window.AudioContext = originalConstructor;
    }
  });
  await testInfo.attach("weapon-audio-measurements", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  console.info("Gunshot measurements:", JSON.stringify({
    soloPeakDb: results.soloPeakDb, soloRmsDb: results.soloRmsDb, burstRmsDb: results.playerBurstRmsDb,
    burstPeakDb: results.burstPeakDb, onsetMs: results.soloOnsetDelayMs,
  }));
  // Rebuilt variations: at least four, never the same one twice in a row.
  expect(results.variantCount).toBeGreaterThanOrEqual(4);
  expect(new Set(results.picks).size).toBeGreaterThanOrEqual(4);
  for (let i = 1; i < results.picks.length; i++) expect(results.picks[i]).not.toBe(results.picks[i - 1]);
  // Undelayed crack, no clipping, natural body decay and an audible room tail that then ends.
  expect(results.soloPeak).toBeGreaterThan(0);
  expect(results.soloPeak).toBeLessThan(1);
  expect(results.soloNearFullScale).toBe(0);
  expect(results.burstNearFullScale).toBe(0);
  expect(results.soloOnsetDelayMs).toBeGreaterThanOrEqual(0);
  expect(results.soloOnsetDelayMs).toBeLessThan(15);
  expect(results.soloDecayDb).toBeLessThan(-6);
  expect(results.soloRoomTailDb).toBeGreaterThan(-60);
  expect(results.soloRoomTailDb).toBeLessThan(results.soloDecayDb);
  expect(results.soloEndedRms).toBeLessThan(1e-7);
  // Stereo close layer is kept; it is not collapsed into one channel.
  expect(Math.abs(results.soloStereoDb)).toBeLessThan(3);
  // Player loudness stays in the previous ballpark (was peak -36.1 dBFS, rms -51.2 dB).
  expect(results.soloPeakDb).toBeGreaterThan(-39);
  expect(results.soloPeakDb).toBeLessThan(-33);
  expect(results.soloRmsDb).toBeGreaterThan(-54);
  expect(results.soloRmsDb).toBeLessThan(-48);
  // Sprays stay continuous (no dropouts between rounds) and the last tail rings out.
  expect(results.burstMinWindowDb).toBeGreaterThan(-12);
  expect(results.finalTailRatioDb).toBeGreaterThan(-3);
  expect(results.burstEndedRms).toBeLessThan(1e-7);
  // Enemies: distance falloff with crossfade toward the tail, centred when pan is 0.
  expect(results.enemies[2]!.rms / results.soloRms).toBeGreaterThan(0.32);
  expect(results.enemies[2]!.rms / results.soloRms).toBeLessThan(0.45);
  expect(results.enemies[0]!.rms).toBeCloseTo(results.enemies[2]!.rms, 8);
  expect(results.enemies[1]!.rms).toBeCloseTo(results.enemies[2]!.rms, 8);
  for (let i = 3; i < results.enemies.length; i++) {
    expect(results.enemies[i]!.rms).toBeLessThan(results.enemies[i - 1]!.rms);
  }
  expect(results.enemies[6]!.rms / results.enemies[2]!.rms).toBeGreaterThan(0.3);
  expect(results.enemies[6]!.rms / results.enemies[2]!.rms).toBeLessThan(0.6);
  expect(results.enemies[6]!.lateShare).toBeGreaterThan(results.enemies[2]!.lateShare + 3);
  for (const enemy of results.enemies) expect(Math.abs(enemy.balanceDb)).toBeLessThan(0.1);
  // Positional enemies: equal-power pan hard right/left, darker and quieter behind.
  const [front, right, left, behind] = results.spatial;
  expect(Math.abs(front!.rightOverLeftDb)).toBeLessThan(0.1);
  expect(right!.rightOverLeftDb).toBeGreaterThan(12);
  expect(left!.rightOverLeftDb).toBeLessThan(-12);
  expect(behind!.rms).toBeLessThan(front!.rms * 0.9);
  expect(behind!.brightness).toBeLessThan(front!.brightness * 0.8);
  expect(results.crowdPeak).toBeLessThan(results.soloPeak * 0.65);
  expect(results.crowdRms).toBeLessThan(results.playerBurstRms * 0.6);
  expect(results.independentShooterDb).toBeGreaterThan(0.2);
  expect(results.invalidPeak).toBe(0);
  expect(results.activePlayer).toBe(0);
  expect(results.crowdActiveEnemies).toBe(0);
  for (const enemy of results.enemies) expect(enemy.activeEnemies).toBe(0);
});

test("magazine-only reload audio follows the shared marks, scales without pitch, and cancels", async ({ page }, testInfo) => {
  await page.route("**/__weapon_audio_test", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Reload audio test</title>",
  }));
  await page.goto("/__weapon_audio_test");
  const results = await page.evaluate(async () => {
    const audioUrl = "/src/runtime/audio/WeaponAudio.ts";
    const marksUrl = "/src/runtime/weapons/ak47ReloadMarks.ts";
    const { WeaponAudio, AK47_RELOAD_AUDIO_TIMELINE } = await import(audioUrl);
    const { AK47_RELOAD_DURATION_S, AK47_RELOAD_MARKS } = await import(marksUrl);
    const originalConstructor = window.AudioContext;
    const sampleRate = 48000;
    const setup = async (seconds: number, outputLatency = 0) => {
      const ctx = new OfflineAudioContext(2, sampleRate * seconds, sampleRate);
      let time = 0;
      const proxy = new Proxy(ctx, {
        get(target, key) {
          if (key === "currentTime") return time;
          if (key === "state") return "running";
          if (key === "outputLatency") return outputLatency;
          const value = Reflect.get(target, key, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      window.AudioContext = function () { return proxy; } as unknown as typeof AudioContext;
      const audio = new WeaponAudio();
      audio.ensureAudioGraph();
      audio.ensureBuffersLoaded();
      await audio.loadPromise;
      if (!audio.reloadFoley || !audio.shotVariants) throw new Error("Weapon audio assets did not load");
      return { ctx, audio, setTime: (value: number) => { time = value; } };
    };
    const measure = (output: AudioBuffer) => {
      const samples = [output.getChannelData(0), output.getChannelData(1)];
      const span = (from: number, to: number) =>
        [Math.max(0, Math.round(from * sampleRate)), Math.min(output.length, Math.round(to * sampleRate))] as const;
      const rms = (from: number, to: number) => {
        const [first, last] = span(from, to);
        let energy = 0;
        for (const channel of samples) for (let i = first; i < last; i++) energy += channel[i]! ** 2;
        return Math.sqrt(energy / Math.max(1, (last - first) * 2));
      };
      const peak = (from: number, to: number) => {
        const [first, last] = span(from, to);
        let value = 0;
        for (const channel of samples) for (let i = first; i < last; i++) value = Math.max(value, Math.abs(channel[i]!));
        return value;
      };
      const peakTime = () => {
        let best = 0, at = 0;
        for (const channel of samples) for (let i = 0; i < channel.length; i++) {
          if (Math.abs(channel[i]!) > best) { best = Math.abs(channel[i]!); at = i / sampleRate; }
        }
        return at;
      };
      return { rms, peak, peakTime };
    };
    const wavBase64 = (output: AudioBuffer) => {
      const frames = output.length, channels = output.numberOfChannels;
      const bytes = new DataView(new ArrayBuffer(44 + frames * channels * 2));
      const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) bytes.setUint8(offset + i, value.charCodeAt(i)); };
      text(0, "RIFF"); bytes.setUint32(4, 36 + frames * channels * 2, true); text(8, "WAVE"); text(12, "fmt ");
      bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, channels, true);
      bytes.setUint32(24, sampleRate, true); bytes.setUint32(28, sampleRate * channels * 2, true);
      bytes.setUint16(32, channels * 2, true); bytes.setUint16(34, 16, true); text(36, "data"); bytes.setUint32(40, frames * channels * 2, true);
      // The game's master gain is 0.1; undo it so the listening file sits near the in-game level at full volume.
      for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) {
        const value = Math.max(-1, Math.min(1, output.getChannelData(c)[i]! * 10));
        bytes.setInt16(44 + (i * channels + c) * 2, Math.round(value * 32767), true);
      }
      let binary = "";
      const view = new Uint8Array(bytes.buffer);
      for (let i = 0; i < view.length; i += 0x8000) binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
      return btoa(binary);
    };

    const results = [];
    const listening: Record<string, string> = {};
    let shotPeak = 0;
    try {
      // Reference: the loudest of several single rendered shots (variants and level jitter differ per shot).
      for (let i = 0; i < 6; i++) {
        const { ctx, audio } = await setup(1.5);
        audio.lastPlayerVariant = i % audio.shotVariants.length;
        audio.playAk47Shot();
        shotPeak = Math.max(shotPeak, measure(await ctx.startRendering()).peak(0, 1.5));
      }
      const recordedFoley = (await setup(0.1)).audio.reloadFoley.get("liftCloth").buffers[0].duration;
      // Each case drives the reload the way the game does. `at` is a base-timeline position on the
      // audio clock: cancel = onReloadCancel -> stopReload(committed) (Ak47Weapon emits it before the
      // latch or on a reset, so the game passes the default false), early = onReloadEnd(true) (fire
      // after the latch), pause = setReloadPaused(true) held for `holdS` real seconds, death =
      // paused at `at`, the respawn reset cancels while paused, then the simulation resumes.
      type ReloadCase = {
        speed: number; kind: "full" | "cancel" | "early" | "pause" | "death";
        at?: number; holdS?: number; latency?: number; committed?: boolean;
      };
      const cases: ReloadCase[] = [
        { speed: 1, kind: "full" }, { speed: 1.35, kind: "full" },
        { speed: 1, kind: "cancel", at: 0.9 }, { speed: 1.35, kind: "cancel", at: 0.9 },
        // A caller that has committed the rounds: the clack rings out.
        { speed: 1, kind: "cancel", at: 1.2, committed: true },
        // Frame hitch: the audio clock is past the latch but the weapon has not latched (dt is
        // clamped), so it cancels pre-latch. The weapon's state decides: everything fades.
        { speed: 1, kind: "cancel", at: 1.2, committed: false },
        // Pre-latch cancels inside the old latency-compensation window: the seat is scheduled on the
        // uncompensated clock, so none of it has been rendered and none is heard.
        { speed: 1, kind: "cancel", at: 1.07, latency: 0.06 },
        { speed: 1, kind: "cancel", at: 1.098, latency: 0.04 },
        // Pre-release fire-press cancels: the release click is scheduled on the uncompensated clock,
        // so it has not been rendered when the weapon cancels just before the release mark.
        { speed: 1, kind: "cancel", at: 0.29, latency: 0.04 },
        { speed: 1, kind: "cancel", at: 0.29 },
        { speed: 1, kind: "early", at: 1.2 },
        // Fire held to the latch: Ak47Weapon ends early on the latch frame itself. The audio clock
        // (render-quantum steps) may sit exactly on, a few ms past, or one quantum short of the seat.
        { speed: 1, kind: "early", at: 1.1 },
        { speed: 1, kind: "early", at: 1.105 },
        { speed: 1, kind: "early", at: 1.097, latency: 0.04 },
        { speed: 1, kind: "pause", at: 0.9, holdS: 0.5 },
        { speed: 1, kind: "pause", at: 1.13, holdS: 0.4 },
        { speed: 1, kind: "death", at: 0.5, holdS: 0.6 },
      ];
      for (const reloadCase of cases) {
        const { speed, kind } = reloadCase;
        const renderS = 3;
        const { ctx, audio, setTime } = await setup(renderS, reloadCase.latency ?? 0);
        const latency = reloadCase.latency ?? 0;
        const duration = AK47_RELOAD_DURATION_S / speed;
        const scale = duration / AK47_RELOAD_DURATION_S;
        const startAt = 0.1;
        const quantize = (seconds: number) => Math.round(seconds * 375) / 375;
        setTime(startAt);
        audio.playReloadStart(duration);
        const scheduled = [...audio.reloadVoices].map((voice) => ({
          id: voice.id, hitTime: voice.hitTime - startAt, startTime: voice.startTime - startAt,
          rate: voice.source.playbackRate.value,
        }));
        // Events land on their mark (output latency compensated), except those on the release and
        // latch marks, where a cancel decision flips: they are heard at mark + output latency.
        const expected = AK47_RELOAD_AUDIO_TIMELINE.map((event: { id: string; mark: string; offsetS: number; offsetKind: string; levelDb: number }) => ({
          id: event.id, levelDb: event.levelDb,
          atS: AK47_RELOAD_MARKS[event.mark] * scale + event.offsetS * (event.offsetKind === "timeline" ? scale : 1),
          compensationS: event.mark === "latch" || event.mark === "release" ? 0 : latency,
        }));
        const eventS = kind === "full" ? quantize(startAt + duration) : quantize(startAt + reloadCase.at! * scale);
        const holdS = reloadCase.holdS ?? 0;
        const resumeS = quantize(eventS + holdS);
        const deathCancelS = quantize(eventS + holdS / 2);
        const steps: { time: number; run: () => void }[] = [];
        if (kind === "full") steps.push({ time: eventS, run: () => audio.playReloadEnd(false) });
        if (kind === "cancel") steps.push({ time: eventS, run: () => audio.stopReload(reloadCase.committed) });
        if (kind === "early") steps.push({ time: eventS, run: () => audio.playReloadEnd(true) });
        if (kind === "pause" || kind === "death") {
          steps.push({ time: eventS, run: () => { audio.setReloadPaused(true); audio.setReloadPaused(true); } });
          if (kind === "death") steps.push({ time: deathCancelS, run: () => audio.stopReload() });
          steps.push({ time: resumeS, run: () => { audio.setReloadPaused(false); audio.setReloadPaused(false); } });
          if (kind === "pause") steps.push({ time: quantize(resumeS + duration - reloadCase.at! * scale), run: () => audio.playReloadEnd(false) });
        }
        const suspensions = steps.map((step) => ctx.suspend(step.time));
        const rendering = ctx.startRendering();
        let rescheduled: string[] = [];
        let voicesAtEnd = -1;
        const stoppedIds: string[] = [];
        for (const [index, step] of steps.entries()) {
          await suspensions[index];
          setTime(ctx.currentTime);
          if (kind === "full") voicesAtEnd = [...audio.reloadVoices].filter((voice) => voice.hitTime > ctx.currentTime).length;
          if (index === 0) {
            for (const voice of audio.reloadVoices) {
              const stop = voice.source.stop.bind(voice.source);
              voice.source.stop = (when?: number) => { stoppedIds.push(voice.id); stop(when); };
            }
          }
          step.run();
          if (step.time === resumeS && holdS > 0) rescheduled = [...audio.reloadVoices].map((voice) => voice.id);
          await ctx.resume();
        }
        const output = await rendering;
        await new Promise((resolve) => setTimeout(resolve, 0));
        const { rms, peak, peakTime } = measure(output);
        // Heard time of each event; a pause shifts everything after it by the hold.
        const at = (id: string) => {
          const { atS, compensationS } = expected.find((event: { id: string }) => event.id === id)!;
          const shift = kind === "pause" && startAt + atS > eventS ? holdS : 0;
          return startAt + atS - compensationS + shift;
        };
        const eventPeak = (id: string, window = 0.03) => peak(at(id) - 0.004, at(id) + window);
        // Longest stretch below -24 dB (vs the shot peak) between 5% of the reload and the seat, in 10 ms steps.
        let longestGapS = 0, gap = 0;
        for (let t = startAt + 0.05 * duration; t < at("magSeat"); t += 0.01) {
          gap = peak(t, t + 0.01) < shotPeak * 10 ** (-24 / 20) ? gap + 0.01 : 0;
          longestGapS = Math.max(longestGapS, gap);
        }
        if (kind === "full") listening[`reload-${speed}x`] = wavBase64(output);
        if (kind === "pause" && reloadCase.at === 0.9) listening["reload-paused-0.9s-for-0.5s"] = wavBase64(output);
        results.push({
          ...reloadCase, duration, scheduled, expected, voicesAtEnd, recordedFoley, rescheduled, stoppedIds,
          seatPeak: eventPeak("magSeat", 0.045), releasePeak: eventPeak("magRelease"), hookPeak: eventPeak("hookTick"),
          readyPeak: eventPeak("readySlap"),
          maxPeak: peak(0, renderS), maxPeakAt: peakTime() - startAt - (kind === "pause" && startAt + expected.find((event: { id: string }) => event.id === "magSeat")!.atS > eventS ? holdS : 0), longestGapS,
          afterEventRms: kind === "full" ? 0 : rms(eventS + 0.035, kind === "pause" || kind === "death" ? resumeS : renderS),
          seatRingAfterEvent: kind === "full" ? 0 : rms(eventS, eventS + 0.02),
          afterResumeRms: kind === "death" ? rms(resumeS, renderS) : 0,
          afterEndRms: rms(startAt + duration + holdS * (kind === "pause" ? 1 : 0) + 0.25, renderS),
          remaining: audio.reloadVoices.size,
        });
      }
      // Context listening file: a five-round burst, then the reload.
      {
        const { ctx, audio, setTime } = await setup(3);
        for (let i = 0; i < 5; i++) { setTime(0.1 + i * 0.1); audio.playAk47Shot(); }
        setTime(0.75);
        audio.playReloadStart(AK47_RELOAD_DURATION_S);
        listening["burst-then-reload"] = wavBase64(await ctx.startRendering());
      }
    } finally {
      window.AudioContext = originalConstructor;
    }
    return { shotPeak, results, listening };
  });
  // Listening files (master gain undone) for the human listening gate: test-results/<this test>/*.wav.
  for (const [name, base64] of Object.entries(results.listening)) {
    const body = Buffer.from(base64, "base64");
    writeFileSync(testInfo.outputPath(`${name}.wav`), body);
    await testInfo.attach(`${name}.wav`, { body, contentType: "audio/wav" });
  }
  const summary = results.results.map((result) => ({
    speed: result.speed, kind: result.kind, at: result.at, latency: result.latency, committed: result.committed,
    seatDb: 20 * Math.log10(result.seatPeak / results.shotPeak),
    maxDb: 20 * Math.log10(result.maxPeak / results.shotPeak),
    releaseDb: 20 * Math.log10(result.releasePeak / results.shotPeak),
    hookDb: 20 * Math.log10(result.hookPeak / results.shotPeak),
    readyDb: 20 * Math.log10(result.readyPeak / results.shotPeak),
    longestGapMs: Math.round(result.longestGapS * 1000),
  }));
  await testInfo.attach("reload-audio-measurements", { body: JSON.stringify({ summary, results: results.results }, null, 2), contentType: "application/json" });
  console.info("Reload audio (dB vs shot peak):", JSON.stringify(summary));
  const seatHeard = (result: (typeof results.results)[number], detail: string) => {
    // The seat is the loudest reload event, about 6 dB under the shot peak, on the latch mark.
    const seatDb = 20 * Math.log10(result.seatPeak / results.shotPeak);
    expect(seatDb, detail).toBeGreaterThan(-7.5);
    expect(seatDb, detail).toBeLessThan(-4.5);
    expect(result.maxPeak, detail).toBeCloseTo(result.seatPeak, 8);
    const seatAt = result.expected.find((event: { id: string; atS: number }) => event.id === "magSeat")!.atS;
    expect(result.maxPeakAt, detail).toBeGreaterThanOrEqual(seatAt - 0.003);
    expect(result.maxPeakAt, detail).toBeLessThan(seatAt + 0.04);
    expect(result.seatPeak, detail).toBeGreaterThan(result.hookPeak * 1.5);
  };
  for (const result of results.results) {
    const detail = JSON.stringify({ ...result, scheduled: undefined, expected: undefined });
    // The shipped CC0 foley decoded (the synthesized fallback's cloth is 0.2 s long).
    expect(result.recordedFoley, detail).toBeGreaterThan(0.21);
    // Every event is scheduled once at its scaled mark, at original pitch, and none is a bolt or charge event.
    expect(result.scheduled.map((event) => event.id), detail).toEqual(result.expected.map((event: { id: string }) => event.id));
    result.scheduled.forEach((event, i) => {
      expect(event.rate, detail).toBe(1);
      expect(event.hitTime, `${event.id} ${detail}`).toBeCloseTo(result.expected[i]!.atS - result.expected[i]!.compensationS, 4);
    });
    for (const event of result.scheduled) expect(event.id, detail).not.toMatch(/charge|bolt|ground|thud/i);
    const preRelease = result.kind === "cancel" && result.at! < 0.3;
    if (!preRelease) expect(result.releasePeak, detail).toBeGreaterThan(1e-4);
    expect(result.remaining, detail).toBe(0);
    if (result.kind === "full") {
      // The natural end cuts nothing: every event was already heard.
      expect(result.voicesAtEnd, detail).toBe(0);
      seatHeard(result, detail);
      expect(result.seatPeak, detail).toBeGreaterThan(result.releasePeak * 1.5);
      expect(result.readyPeak, detail).toBeGreaterThan(1e-4);
      // Continuous rhythm up to the seat; everything has rung out shortly after the reload ends.
      expect(result.longestGapS, detail).toBeLessThanOrEqual(0.32);
      expect(result.afterEndRms, detail).toBeLessThan(1e-7);
    }
    if (result.kind === "cancel" && result.at! < 1.1) {
      // Cancel before the latch: 5 ms fade, then silence, and no seat at all, whatever the output latency.
      expect(result.afterEventRms, detail).toBeLessThan(1e-7);
      expect(result.seatPeak, detail).toBeLessThan(1e-6);
    }
    if (preRelease) {
      // Cancel before the release mark: the old magazine stays seated, so no release click is heard,
      // whatever the output latency (at most the faded tail of the clip's quiet pre-roll).
      expect(20 * Math.log10(result.releasePeak / results.shotPeak), detail).toBeLessThan(-60);
    }
    if (result.kind === "early") {
      // Fire held to the latch: only the handguard return beat is dropped; the seat and settle play
      // even when the audio clock is still short of the seat on the latch frame.
      expect([...result.stoppedIds].sort(), detail).toEqual(["readyCloth", "readySlap"]);
    }
    if (result.kind === "early" || (result.kind === "cancel" && result.at! >= 1.1)) {
      // Past the latch on the audio clock: the seat was already heard, the ready beat never plays.
      seatHeard(result, detail);
      expect(result.readyPeak, detail).toBeLessThan(1e-6);
      expect(result.afterEndRms, detail).toBeLessThan(1e-7);
      if (result.kind === "early" || result.committed) {
        // Rounds committed: the clack and settle ring out past the cancel.
        expect(result.seatRingAfterEvent, detail).toBeGreaterThan(1e-6);
        expect(result.afterEventRms, detail).toBeGreaterThan(1e-6);
      } else {
        // The weapon has not latched (hitch): the ring-out fades with everything else.
        expect(result.afterEventRms, detail).toBeLessThan(1e-7);
      }
    }
    if (result.kind === "pause") {
      // Silent while paused; the events not yet heard resume from the held position, so the
      // seat lands on the resumed latch, the ready beat follows, and nothing is played twice.
      expect(result.afterEventRms, detail).toBeLessThan(1e-7);
      expect(result.readyPeak, detail).toBeGreaterThan(1e-4);
      expect(result.afterEndRms, detail).toBeLessThan(1e-7);
      if (result.at! < 1.1) {
        expect(result.rescheduled, detail).toEqual(["hookTick", "magSeat", "settleRattle", "readySlap", "readyCloth"]);
        seatHeard(result, detail);
      } else {
        expect(result.rescheduled, detail).toEqual(["settleRattle", "readySlap", "readyCloth"]);
      }
    }
    if (result.kind === "death") {
      // Dead (paused) mid-reload, the respawn reset cancels it: silent from the death onwards.
      expect(result.afterEventRms, detail).toBeLessThan(1e-7);
      expect(result.afterResumeRms, detail).toBeLessThan(1e-7);
      expect(result.rescheduled, detail).toEqual([]);
      expect(result.seatPeak, detail).toBeLessThan(1e-6);
    }
  }
});
