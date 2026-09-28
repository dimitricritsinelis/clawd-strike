import assert from "node:assert/strict";
import test from "node:test";
import { Vector2, type WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { attachComposerDepth, Renderer } from "./Renderer";
import { SceneDepthGtaoPass } from "./SceneDepthGtaoPass";

test("AO reads the beauty depth and runs its horizon search on the CSS grid", () => {
  const renderer = {
    getPixelRatio: () => 2,
    getSize: (size: Vector2) => size.set(600, 400),
  };
  const composer = new EffectComposer(renderer as unknown as WebGLRenderer);
  const ao = new SceneDepthGtaoPass(1, 1);
  try {
    attachComposerDepth(composer);
    assert.ok(composer.renderTarget1.depthTexture && composer.renderTarget2.depthTexture,
      "both ping-pong targets must expose the depth the player sees");
    assert.equal((ao as unknown as { _renderGBuffer: boolean })._renderGBuffer, false,
      "AO must not re-render the world into its own G-buffer");
    ao.aoPixelRatio = 1;
    ao.setDevicePixelRatio(2);
    ao.setSize(1200, 800);
    assert.deepEqual([ao.width, ao.height], [1200, 800], "the pass keeps device-pixel dimensions");
    assert.deepEqual([ao.gtaoRenderTarget.width, ao.gtaoRenderTarget.height], [600, 400]);
    assert.deepEqual([ao.pdRenderTarget.width, ao.pdRenderTarget.height], [600, 400]);
    ao.setDevicePixelRatio(1);
    assert.deepEqual([ao.gtaoRenderTarget.width, ao.gtaoRenderTarget.height], [1200, 800],
      "at 1x the horizon search stays at full resolution");
  } finally {
    ao.dispose();
    composer.dispose();
  }
});

test("composer resize preserves supported MSAA and effective DPR across targets and AO", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const viewport = { devicePixelRatio: 2, innerWidth: 800, innerHeight: 500 };
  Object.defineProperty(globalThis, "window", { value: viewport, configurable: true });
  const mount = { clientWidth: 800, clientHeight: 500 };
  let pixelRatio = 1;
  let colorSamples: Int32Array | null = new Int32Array([8, 4, 2]);
  let depthSamples: Int32Array | null = new Int32Array([4, 2]);
  let queries = 0;
  const gl = {
    RENDERBUFFER: 0x8d41, RGBA16F: 0x881a, DEPTH_COMPONENT24: 0x81a6, SAMPLES: 0x80a9,
    getInternalformatParameter: (_target: number, format: number) => {
      queries += 1;
      return format === 0x881a ? colorSamples : depthSamples;
    },
  };
  let context: typeof gl | object = gl;
  const renderer = {
    capabilities: { maxSamples: 8 },
    getContext: () => context,
    getPixelRatio: () => pixelRatio,
    setPixelRatio: (value: number) => { pixelRatio = value; },
    getSize: (size: Vector2) => size.set(mount.clientWidth, mount.clientHeight),
    setSize: () => {},
  };
  const composer = new EffectComposer(renderer as unknown as WebGLRenderer);
  const ao = new SceneDepthGtaoPass(1, 1);
  composer.addPass(ao);
  const resolution = new Vector2();
  const subject = Object.create(Renderer.prototype) as Renderer;
  Object.assign(subject, {
    renderer, composer, aoPass: ao, mountEl: mount, effectiveMaxPixelRatio: 1.1,
    goldenPostPass: { uniforms: { resolution: { value: resolution } } },
  });
  const targets = [composer.renderTarget1, composer.renderTarget2];
  const disposals = [0, 0];
  targets.forEach((target, index) => target.addEventListener("dispose", () => { disposals[index]! += 1; }));
  try {
    subject.resize();
    assert.equal(pixelRatio, 1.1, "native Retina DPR must retain the existing cap");
    assert.deepEqual(targets.map(target => target.samples), [4, 4]);
    assert.ok(targets.every(target => Math.abs(target.width - 880) < 1e-6 && Math.abs(target.height - 550) < 1e-6));
    assert.ok(Math.abs(ao.width - 880) < 1e-6);
    assert.equal(ao.height, 550, "AO must not be reset to CSS dimensions");
    assert.deepEqual(resolution.toArray(), [800 * 1.1, 500 * 1.1]);

    colorSamples = new Int32Array([8, 4, 2]);
    depthSamples = new Int32Array([2]);
    renderer.capabilities.maxSamples = 3;
    const previousDisposals = [...disposals];
    subject.resize();
    assert.deepEqual(targets.map(target => target.samples), [2, 2], "use the shared format count below the hardware cap");
    assert.deepEqual(disposals, previousDisposals.map(count => count + 1), "sample changes at unchanged size must recreate both targets");
    const stableDisposals = [...disposals];
    subject.resize();
    assert.deepEqual(disposals, stableDisposals, "unchanged targets must not be discarded");

    mount.clientWidth = 600; mount.clientHeight = 400;
    viewport.devicePixelRatio = 1;
    subject.resize();
    assert.ok(targets.every(target => target.width === 600 && target.height === 400));
    assert.deepEqual([ao.width, ao.height], [600, 400]);
    assert.deepEqual(resolution.toArray(), [600, 400]);

    Object.assign(subject, { effectiveMaxPixelRatio: 2 });
    viewport.devicePixelRatio = 3;
    const previousQueries = queries;
    subject.resize();
    assert.equal(pixelRatio, 2);
    assert.deepEqual(targets.map(target => target.samples), [0, 0], "actual supersampling retains the no-extra-AA policy");
    assert.equal(queries, previousQueries);
    assert.deepEqual([ao.width, ao.height], [1200, 800]);

    viewport.devicePixelRatio = 1;
    for (const [color, depth] of [[null, null], [[1], [1]], [[4], [2]]] as const) {
      colorSamples = color ? new Int32Array(color) : null;
      depthSamples = depth ? new Int32Array(depth) : null;
      subject.resize();
      assert.deepEqual(targets.map(target => target.samples), [0, 0], "unsupported, single-sample and incompatible formats must disable MSAA");
    }
    context = {};
    subject.resize();
    assert.deepEqual(targets.map(target => target.samples), [0, 0]);
  } finally {
    ao.dispose();
    composer.dispose();
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
