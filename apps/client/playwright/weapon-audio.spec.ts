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
      if (!audio.closeBuffer) throw new Error("Gunshot asset did not load");
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

test("approved AK decay, enemy distance falloff, and crowded enemy mix", async ({ page }, testInfo) => {
  // Exercise real asset fetching, decoding, and Web Audio without speaker output.
  await page.route("**/__weapon_audio_test", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Weapon audio test</title>",
  }));
  await page.goto("/__weapon_audio_test");
  const results = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/audio/WeaponAudio.ts";
    const { WeaponAudio } = await import(moduleUrl);
    const sampleRate = 48000;
    const originalConstructor = window.AudioContext;
    type Shot = { time: number; enemy?: string; distance?: number };
    async function render(shots: Shot[]) {
      const ctx = new OfflineAudioContext(2, sampleRate * 5, sampleRate);
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
      if (!audio.closeBuffer || !audio.tailBuffer) throw new Error("Gunshot assets did not load");
      for (const shot of shots) {
        time = shot.time;
        if (shot.enemy) audio.playAk47ShotQuiet({ sourceId: shot.enemy, distanceM: shot.distance });
        else audio.playAk47Shot();
      }
      const output = await ctx.startRendering();
      // Allow ended callbacks to release per-shooter tracking and connected nodes.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const samples = [output.getChannelData(0), output.getChannelData(1)];
      const rms = (start: number, end: number) => {
        let energy = 0;
        const first = Math.round(start * sampleRate), last = Math.round(end * sampleRate);
        for (const channel of samples) for (let i = first; i < last; i++) energy += channel[i]! ** 2;
        return Math.sqrt(energy / ((last - first) * 2));
      };
      let peak = 0;
      for (const channel of samples) for (const value of channel) {
        if (!Number.isFinite(value)) throw new Error("Non-finite audio sample");
        peak = Math.max(peak, Math.abs(value));
      }
      const onsetSample = samples[0]!.findIndex((value, i) =>
        Math.max(Math.abs(value), Math.abs(samples[1]![i]!)) > peak * 0.01);
      return {
        samples, rms, peak, onsetS: onsetSample / sampleRate, activeEnemies: audio.enemyBursts.size,
        activePlayer: Object.keys(audio.playerBurst).length,
      };
    }
    const db = (ratio: number) => 20 * Math.log10(ratio);
    try {
      const solo = await render([{ time: 0.3 }]);
      const burstShots = Array.from({ length: 30 }, (_, i) => ({ time: 0.3 + i * 0.1 }));
      const burst = await render(burstShots);
      const distances = [-5, 0, 2, 10, 22, 42, 62, 120];
      const enemies = [];
      let nearSamples: Float32Array[] = [];
      for (const distance of distances) {
        const enemy = await render([{ time: 0.3, enemy: "a", distance }]);
        if (distance === 2) nearSamples = enemy.samples;
        enemies.push({ distance, rms: enemy.rms(0.3, 1.1), activeEnemies: enemy.activeEnemies });
      }
      // The enemy limiter's oversampling adds a short delay; align it before
      // comparing timbre, while bounding that delay to less than 3 ms.
      let nearTimbreCorrelation = 0, enemyDelaySamples = 0;
      for (let lag = 0; lag <= 128; lag++) {
        let dot = 0, playerEnergy = 0, enemyEnergy = 0;
        for (let ch = 0; ch < 2; ch++) for (let i = 0.3 * sampleRate; i < 1.1 * sampleRate; i++) {
          const player = solo.samples[ch]![i]!, enemy = nearSamples[ch]![i + lag]!;
          dot += player * enemy; playerEnergy += player ** 2; enemyEnergy += enemy ** 2;
        }
        const correlation = dot / Math.sqrt(playerEnergy * enemyEnergy);
        if (correlation > nearTimbreCorrelation) {
          nearTimbreCorrelation = correlation;
          enemyDelaySamples = lag;
        }
      }
      const crowd = await render(burstShots.flatMap((shot) => Array.from({ length: 10 }, (_, i) => ({
        time: shot.time, enemy: `enemy-${i}`, distance: 0,
      }))));
      const sameShooter = await render([{ time: 0.3, enemy: "a", distance: 2 }, { time: 0.4, enemy: "a", distance: 2 }]);
      const separateShooters = await render([{ time: 0.3, enemy: "a", distance: 2 }, { time: 0.4, enemy: "b", distance: 2 }]);
      const invalid = await render([{ time: 0.3, enemy: "a", distance: NaN }, { time: 0.4, enemy: "a", distance: Infinity }]);
      return {
        soloPeak: solo.peak,
        soloOnsetDelayMs: (solo.onsetS - 0.3) * 1000,
        soloDecayDb: db(solo.rms(0.6, 0.9) / solo.rms(0.3, 0.4)),
        soloEndedRms: solo.rms(1.1, 1.5),
        burstEndedRms: burst.rms(4.1, 4.5),
        soloRms: solo.rms(0.3, 1.1),
        enemies, nearTimbreCorrelation, enemyDelaySamples,
        crowdPeak: crowd.peak, crowdRms: crowd.rms(0.8, 3.2), playerBurstRms: burst.rms(0.8, 3.2),
        crowdActiveEnemies: crowd.activeEnemies, activePlayer: burst.activePlayer,
        independentShooterDb: db(separateShooters.rms(0.45, 0.7) / sameShooter.rms(0.45, 0.7)),
        invalidPeak: invalid.peak,
      };
    } finally {
      window.AudioContext = originalConstructor;
    }
  });
  await testInfo.attach("weapon-audio-measurements", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  console.info("Gunshot onset delay (ms):", results.soloOnsetDelayMs);
  expect(results.soloPeak).toBeGreaterThan(0);
  expect(results.soloOnsetDelayMs).toBeGreaterThanOrEqual(0);
  expect(results.soloOnsetDelayMs).toBeLessThan(15);
  expect(results.soloDecayDb).toBeLessThan(-20);
  expect(results.soloEndedRms).toBeLessThan(1e-7);
  expect(results.burstEndedRms).toBeLessThan(1e-7);
  expect(results.nearTimbreCorrelation).toBeGreaterThan(0.98);
  // The stronger mix should make both nearby and distant enemies audible,
  // while keeping individual enemies below the player's shot.
  expect(results.enemies[2]!.rms / results.soloRms).toBeGreaterThan(0.32);
  expect(results.enemies[2]!.rms / results.soloRms).toBeLessThan(0.45);
  expect(results.enemies[0]!.rms).toBeCloseTo(results.enemies[2]!.rms, 8);
  expect(results.enemies[1]!.rms).toBeCloseTo(results.enemies[2]!.rms, 8);
  for (let i = 3; i < results.enemies.length; i++) {
    expect(results.enemies[i]!.rms).toBeLessThan(results.enemies[i - 1]!.rms);
  }
  expect(results.enemies[6]!.rms / results.enemies[2]!.rms).toBeGreaterThan(0.3);
  expect(results.enemies[6]!.rms / results.enemies[2]!.rms).toBeLessThan(0.6);
  expect(results.crowdPeak).toBeLessThan(results.soloPeak * 0.65);
  expect(results.crowdRms).toBeLessThan(results.playerBurstRms * 0.6);
  expect(results.independentShooterDb).toBeGreaterThan(0.2);
  expect(results.invalidPeak).toBe(0);
  expect(results.activePlayer).toBe(0);
  expect(results.crowdActiveEnemies).toBe(0);
  for (const enemy of results.enemies) expect(enemy.activeEnemies).toBe(0);
});

test("reload clinks follow magazine motion, reload speed, and cancellation", async ({ page }) => {
  await page.route("**/__weapon_audio_test", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Reload audio test</title>",
  }));
  await page.goto("/__weapon_audio_test");
  const results = await page.evaluate(async () => {
    const audioUrl = "/src/runtime/audio/WeaponAudio.ts";
    const weaponUrl = "/src/runtime/weapons/Ak47Weapon.ts";
    const worldUrl = "/src/runtime/sim/collision/WorldColliders.ts";
    const { WeaponAudio } = await import(audioUrl);
    const { Ak47Weapon } = await import(weaponUrl);
    const { WorldColliders } = await import(worldUrl);
    const originalConstructor = window.AudioContext;
    const results = [];
    try {
      for (const speed of [1, 1.35]) for (const cancel of [false, true]) {
        const sampleRate = 48000;
        const ctx = new OfflineAudioContext(2, sampleRate * 2, sampleRate);
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
        if (!audio.reloadBuffer) throw new Error("Reload asset did not load");
        const weapon = new Ak47Weapon({ seed: 7, magazineCapacity: 3 });
        const world = new WorldColliders([], { x: -100, y: -100, w: 200, h: 200 });
        // Use the weapon's existing vector instances for its real fire input.
        const input = { ...weapon.fireInput, deltaSeconds: 1 / 240, world };
        weapon.update({ ...input, fireHeld: true });
        weapon.update({ ...input, fireHeld: false });
        weapon.setReloadSpeedMultiplier(speed);
        let duration = 0, rate = 0, ended = false;
        weapon.onReloadStart = (seconds: number) => {
          duration = seconds;
          audio.playReloadStart(seconds);
          rate = audio.activeReloadSource.playbackRate.value;
        };
        weapon.onReloadEnd = () => { ended = true; audio.playReloadEnd(); };
        weapon.onReloadCancel = () => audio.stopReload();
        weapon.queueReload();
        weapon.update({ ...input, fireHeld: false });
        const paused = cancel ? ctx.suspend(0.55 / speed) : null;
        const rendering = ctx.startRendering();
        if (paused) {
          await paused;
          time = ctx.currentTime;
          weapon.update({ ...input, fireHeld: true });
          await ctx.resume();
        }
        const output = await rendering;
        if (!cancel) {
          time = duration;
          weapon.update({ ...input, deltaSeconds: duration, fireHeld: false });
        }
        const samples = output.getChannelData(0);
        const rms = (from: number, to: number) => {
          let energy = 0;
          const first = Math.round(from / speed * sampleRate);
          const last = Math.round(to / speed * sampleRate);
          for (let i = first; i < last; i++) energy += samples[i]! ** 2;
          return Math.sqrt(energy / (last - first));
        };
        results.push({ speed, cancel, duration, rate, ended,
          approach: rms(0, 0.20), removal: rms(0.26, 0.48),
          lowered: rms(0.62, 0.70), insertion: rms(0.84, 1.10),
          afterEnd: rms(1.23, 1.45), active: audio.activeReloadSource !== null,
        });
      }
    } finally {
      window.AudioContext = originalConstructor;
    }
    return results;
  });
  for (const result of results) {
    expect(result.duration).toBeCloseTo(1.225 / result.speed, 6);
    expect(result.rate).toBeCloseTo(result.speed, 6);
    expect(result.approach).toBeLessThan(1e-7);
    expect(result.lowered).toBeLessThan(1e-7);
    expect(result.afterEnd).toBeLessThan(1e-7);
    expect(result.active).toBe(false);
    expect(result.ended).toBe(!result.cancel);
    expect(result.removal).toBeGreaterThan(0.001);
    if (!result.cancel) {
      expect(result.insertion).toBeGreaterThan(0.001);
    } else {
      expect(result.insertion).toBeLessThan(1e-7);
    }
  }
});
