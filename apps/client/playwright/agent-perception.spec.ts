import { expect, test } from "@playwright/test";
import { gotoAgentRuntimeViaUi } from "../scripts/lib/runtimePlaywright.mjs";

// Internal fixtures exercise the boundary implementation, not an SDK policy.
// No fixture globals are installed in the shipped runtime.
test("visible perception respects camera, rendered occlusion, live hitboxes, and action signs", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/agent-perception-test", (route) => route.fulfill({
    contentType: "text/html", body: "<html><body></body></html>",
  }));
  await page.goto("/agent-perception-test");
  const result = await page.evaluate(async () => {
    const managerUrl = "/src/runtime/enemies/EnemyManager.ts";
    const controllerUrl = "/src/runtime/enemies/EnemyController.ts";
    const visualUrl = "/src/runtime/enemies/EnemyVisual.ts";
    const worldUrl = "/src/runtime/sim/collision/WorldColliders.ts";
    const gameUrl = "/src/runtime/game/Game.ts";
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const { EnemyManager } = await import(managerUrl);
    const { EnemyController } = await import(controllerUrl);
    const { EnemyVisual } = await import(visualUrl);
    const { WorldColliders } = await import(worldUrl);
    const { Game } = await import(gameUrl);
    const { Scene, PerspectiveCamera, Mesh, BoxGeometry, MeshBasicMaterial, Group, WebGLRenderer } = await import(threeUrl);
    const scene = new Scene();
    const camera = new PerspectiveCamera(75, 1.6, 0.1, 100);
    camera.position.set(0, 1.7, 0);
    camera.rotation.order = "YXZ";
    const manager = new EnemyManager(scene);
    const bounds = { x: -100, y: -100, w: 200, h: 200 };
    manager.worldCollidersRef = new WorldColliders([], bounds);
    const controller = new EnemyController("private-enemy-name", "Private", 2, -8, 1, 2);
    manager.controllers = [controller];
    const mesh = new Mesh(new BoxGeometry(0.5, 1.8, 0.5), new MeshBasicMaterial());
    mesh.position.set(2, 2.9, -8);
    const root = new Group();
    root.add(mesh);
    scene.add(root);
    const visual = Object.create(EnemyVisual.prototype);
    visual.root = root;
    manager.visuals = [visual];
    const renderer = new WebGLRenderer();
    renderer.setSize(640, 400);
    document.body.appendChild(renderer.domElement);
    renderer.render(scene, camera);
    const initial = manager.getVisibleTargets(camera);
    const stable = manager.getVisibleTargets(camera);
    const cue = initial[0];
    if (!cue) throw new Error("Expected visible target fixture");

    // Exercise the game's actual action consumption and camera update methods.
    const game = Object.create(Game.prototype);
    Object.assign(game, {
      camera, controlMode: "agent", freezeInput: false, yaw: 0, pitch: 0,
      agentLookYawDeltaDeg: 0, agentLookPitchDeltaDeg: 0,
      agentMoveX: 0, agentMoveZ: 0, agentFireHeld: false, agentCrouchHeld: false,
      agentJumpQueued: false, agentReloadQueued: false, tickIntent: {},
    });
    game.applyAgentAction({ lookYawDelta: cue.yawOffsetDeg, lookPitchDelta: cue.pitchOffsetDeg, fire: true, jump: true });
    game.buildAgentIntent();
    game.applyLookIntent();
    const centered = manager.getVisibleTargets(camera);
    game.buildAgentIntent();
    const consumed = { ...game.tickIntent };
    game.applyAgentAction({ moveX: 0, moveZ: 0, fire: false, crouch: false });
    game.buildAgentIntent();
    const released = { ...game.tickIntent };

    // A different camera direction must produce negative offsets and handle yaw wrap.
    game.setLookAngles(-Math.PI * 2 - 0.5, 0.4);
    const negative = manager.getVisibleTargets(camera);
    game.applyAgentAction({ lookYawDelta: negative[0].yawOffsetDeg, lookPitchDelta: negative[0].pitchOffsetDeg });
    game.buildAgentIntent();
    game.applyLookIntent();
    const recentered = manager.getVisibleTargets(camera);
    game.setLookAngles(0, 0);

    const wall = { id: "private-wall", kind: "wall", min: { x: -4, y: 0, z: -4 }, max: { x: 4, y: 6, z: -3 } };
    manager.worldCollidersRef = new WorldColliders([wall], bounds);
    const collisionOccluded = manager.getVisibleTargets(camera);
    manager.worldCollidersRef = new WorldColliders([], bounds);
    const screen = new Mesh(new BoxGeometry(8, 6, 1), new MeshBasicMaterial());
    screen.position.set(0, 3, -3.5);
    scene.add(screen);
    const renderOccluded = manager.getVisibleTargets(camera);
    screen.visible = false;
    const invisibleOccluder = manager.getVisibleTargets(camera);
    // Low cover hides the torso but leaves a targetable head point.
    screen.visible = true;
    screen.scale.set(1, 0.5, 1);
    screen.position.set(0, 1.5, -7);
    const headOnly = manager.getVisibleTargets(camera);
    scene.remove(screen);

    game.setLookAngles(Math.PI, 0);
    const behind = manager.getVisibleTargets(camera);
    game.setLookAngles(-1.5, 0);
    const offscreen = manager.getVisibleTargets(camera);
    game.setLookAngles(0, -1);
    const verticallyOffscreen = manager.getVisibleTargets(camera);
    game.setLookAngles(0, 0);
    camera.far = 4;
    camera.updateProjectionMatrix();
    const beyondFar = manager.getVisibleTargets(camera);
    camera.far = 100;
    camera.updateProjectionMatrix();
    root.visible = false;
    const hiddenMesh = manager.getVisibleTargets(camera);
    root.visible = true;
    controller.applyDamage(1000);
    const dead = manager.getVisibleTargets(camera);
    renderer.dispose();
    return { initial, stable, centered, consumed, released, negative, recentered, collisionOccluded, renderOccluded, invisibleOccluder, headOnly, behind, offscreen, verticallyOffscreen, beyondFar, hiddenMesh, dead };
  });
  expect(result.initial).toHaveLength(1);
  expect(Object.keys(result.initial[0]).sort()).toEqual(["id", "pitchOffsetDeg", "yawOffsetDeg"]);
  expect(result.initial[0].id).not.toContain("private");
  expect(result.initial[0].yawOffsetDeg).toBeGreaterThan(0);
  expect(result.initial[0].pitchOffsetDeg).toBeGreaterThan(0);
  expect(result.stable).toEqual(result.initial);
  for (const centered of [result.centered, result.recentered]) {
    expect(centered).toHaveLength(1);
    expect(Math.abs(centered[0].yawOffsetDeg)).toBeLessThan(1e-6);
    expect(Math.abs(centered[0].pitchOffsetDeg)).toBeLessThan(1e-6);
  }
  expect(result.negative[0].yawOffsetDeg).toBeLessThan(0);
  expect(result.negative[0].pitchOffsetDeg).toBeLessThan(0);
  expect(result.consumed).toMatchObject({ lookYawDelta: 0, lookPitchDelta: 0, jump: false, fire: true });
  expect(result.released).toMatchObject({ moveX: 0, moveZ: 0, fire: false, crouch: false });
  expect(result.invisibleOccluder).toHaveLength(1);
  expect(result.headOnly).toHaveLength(1);
  expect(result.headOnly[0].pitchOffsetDeg).toBeGreaterThan(result.initial[0].pitchOffsetDeg);
  for (const excluded of [result.collisionOccluded, result.renderOccluded, result.behind, result.offscreen, result.verticallyOffscreen, result.beyondFar, result.hiddenMesh, result.dead]) {
    expect(excluded).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test("public perception runs with real-time SDK cadence on the full map", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await gotoAgentRuntimeViaUi(page, {
    baseUrl: testInfo.project.use.baseURL as string,
    agentName: "RealtimeProbe",
  });
  const samples = await page.evaluate(async () => {
    const observations: { latencyMs: number; state: any }[] = [];
    for (let tick = 0; tick < 64; tick += 1) {
      const started = performance.now();
      const state = JSON.parse(window.agent_observe!());
      observations.push({ latencyMs: performance.now() - started, state });
      if (!state.gameplay.alive) break;
      window.agent_apply_action!({ lookYawDelta: 6, fire: tick < 8 });
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, 125 - (performance.now() - started))));
    }
    window.agent_apply_action!({ moveX: 0, moveZ: 0, fire: false, crouch: false });
    await new Promise((resolve) => setTimeout(resolve, 125));
    return { observations, visibility: document.visibilityState };
  });
  const latencies = samples.observations.map((sample) => sample.latencyMs).sort((a, b) => a - b);
  const visibleSamples = samples.observations.filter(({ state }) => state.perception.visibleTargets.length > 0).length;
  console.log(JSON.stringify({
    observationSamples: latencies.length, visibleSamples, visibility: samples.visibility,
    medianMs: latencies[Math.floor(latencies.length / 2)],
    p95Ms: latencies[Math.floor(latencies.length * 0.95)], maxMs: latencies.at(-1),
    profile: samples.observations[0].state.profile,
  }));
  expect(samples.observations.length).toBeGreaterThan(8);
  expect(samples.observations.some(({ state }) => state.ammo.mag < 30)).toBe(true);
  for (const { state } of samples.observations) {
    expect(state.contract).toBe("public-agent-v1");
    expect(state.runtimeReady).toBe(true);
    expect(Object.keys(state.perception).sort()).toEqual(["movementBlocked", "visibleTargets"]);
    expect(state.perception.movementBlocked).toBe(false);
    for (const target of state.perception.visibleTargets) {
      expect(Object.keys(target).sort()).toEqual(["id", "pitchOffsetDeg", "yawOffsetDeg"]);
      expect(typeof target.id).toBe("string");
      expect(Number.isFinite(target.yawOffsetDeg)).toBe(true);
      expect(Number.isFinite(target.pitchOffsetDeg)).toBe(true);
    }
  }
  // Controlled QA placement proves the shipped enemy mesh is observable in the
  // full map. This is interface evidence, never an agent performance result.
  await page.goto("/?autostart=agent&name=EncounterProbe&debug=1");
  await page.waitForFunction(() => {
    const state = JSON.parse(window.agent_observe?.() ?? "null");
    return state?.mode === "runtime" && state.runtimeReady;
  });
  await page.waitForTimeout(125);
  const encounter = await page.evaluate(() => {
    const debug = JSON.parse(window.render_game_to_text!());
    for (const enemy of debug.bots.enemies) {
      if (enemy.health <= 0) continue;
      for (const [dx, dz] of [[0, 3], [3, 0], [0, -3], [-3, 0]]) {
        window.__debug_set_player_pose!({
          x: enemy.position.x + dx, y: enemy.position.y, z: enemy.position.z + dz,
          yawDeg: Math.atan2(dx, dz) * 180 / Math.PI, pitchDeg: -8,
        });
        const started = performance.now();
        const state = JSON.parse(window.agent_observe!());
        const latencyMs = performance.now() - started;
        if (state.perception.visibleTargets.length > 0) {
          return { targets: state.perception.visibleTargets, latencyMs };
        }
      }
    }
    return null;
  });
  console.log(JSON.stringify({ controlledEncounter: encounter }));
  expect(encounter).not.toBeNull();
  expect(errors).toEqual([]);
});
