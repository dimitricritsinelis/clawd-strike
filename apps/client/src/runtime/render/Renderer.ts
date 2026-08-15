import {
  ACESFilmicToneMapping,
  Object3D,
  PCFSoftShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  type Texture,
  Vector2,
  type Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { resolveBlockoutPalette } from "./BlockoutMaterials";
import type { RuntimeLightingPreset } from "../utils/UrlParams";

const MAX_PIXEL_RATIO = 1.10;

// ── Ambient-occlusion tuning constants ──────────────────────────────
// The bazaar's key light is a high south-west sun, so the east-facing
// merchant frontages that most of the review cameras look at are lit
// almost entirely by sky and bounce. In that regime occlusion is the only
// term that separates a reveal side-face from the wall plane, a shop
// recess from its jamb, or a stall's feet from the paving. The previous
// SSAO ran at half resolution with a 25 mm falloff over blockout geometry
// only, which is contact-scale on a wall built at reveal scale — every
// opening read as a decal and every prop as a cut-out. GTAO resolves the
// same occlusion at architectural distances without the halo artifacts
// that forced the SSAO radius down in the first place.
// Radius is set from the deepest feature that has to read, not the smallest:
// a merchant bay is 1.0-2.0 m deep, so occlusion has to still be accumulating
// at a metre or the recess mouth stays as bright as the pier beside it.
//
// Held at 1.15 m. Widening to 2.0 m to chase the 1.35 m deep bay interiors was
// tried and rejected: it bought only +0.3 global std and 3 luma on one bay,
// and cost the paving 88 -> 85 against a target of 90 — a navigation surface
// this map cannot afford to dim. The bay interiors are floored by an additive
// term rather than by unoccluded ambient (a 45% albedo cut moves them 8%), so
// neither albedo nor occlusion radius is the lever that closes that gap.
const AO_RADIUS_M = 1.15;
const AO_THICKNESS_M = 0.5;
const AO_DISTANCE_EXPONENT = 1.0;
const AO_DISTANCE_FALLOFF = 1.0;
const AO_SCALE = 1.0;
const AO_SAMPLES = 24;
// Eased from 1.0. The shade-dominated cameras were CRUSHING: the prop-grounding
// closeup put 3.07% of its pixels below luminance 4 against 0.02% in its target
// (a 150x excess) and 13.52% below 16 against 4.01%, with the canopy camera at
// 0.86%/10.77% against 0.03%/0.50%. The black floor itself is right - minimum 0,
// matching the target - so the fault was how much of the frame bottoms out, and
// it concentrates exactly where occlusion accumulates: prop clusters in contact.
//
// 0.78 improves every camera on that metric (closeup 3.07 -> 2.66 below L4,
// canopy 0.86 -> 0.62, Spawn-A 2.42 -> 2.19 below L16 against a target of 2.20)
// and lands the Spawn-A median exactly on 92. Going further to 0.5 helps the
// crush more but starts pulling Spawn-A off a match it already had.
//
// Be honest about what this does and does not fix: it is worth ~13% of the crush
// gap, and it costs some contact darkening, which is a quality feature this map
// wants. The dominant cause is that shaded regions are ~35% darker than targets
// rendered with multi-bounce GI - see SCENE_ENVIRONMENT_INTENSITY in Game.ts.
//
// Do not keep easing this to chase the rest, and do not suspect the pass itself.
// GTAOPass runs in the composer with default output, so it multiplies the
// composited beauty rather than ambient alone - a reasonable thing to suspect of
// over-darkening shade. It was measured by taking this constant to 0: the canopy
// camera moved 59 -> 62 against a target of 88, the west elevation 51 -> 54
// against 77, and the grounding closeup 49 -> 51 against 83. That is 6-12% of
// each gap, while the two cameras that were already on target overshot (Spawn-A
// 103 -> 104 against 101, tea terrace 109 -> 111 against 98). Occlusion is not
// what is holding the shade down.
const AO_BLEND_INTENSITY = 0.78;
// Alpha-tested foliage renders opaque into the AO normal/depth buffer, so a
// palm crown would occlude as a solid block. The sky dome is far-field and
// contributes nothing but a spurious backface.
const AO_EXCLUDED_BRANCHES = new Set([
  "decorative-palms",
  "desert-sky",
]);

type GtaoVisibilityInternals = {
  scene: Scene;
  _visibilityCache: Object3D[];
  _overrideVisibility: () => void;
};

function isExcludedFromAo(object: Object3D): boolean {
  let current: Object3D | null = object;
  while (current) {
    if (AO_EXCLUDED_BRANCHES.has(current.name)) return true;
    current = current.parent;
  }
  return false;
}

function constrainAoOccluders(pass: GTAOPass): void {
  const internals = pass as unknown as GtaoVisibilityInternals;
  internals._overrideVisibility = (): void => {
    internals.scene.traverse((object) => {
      const renderable = object as Object3D & {
        isLine?: boolean;
        isLine2?: boolean;
        isMesh?: boolean;
        isPoints?: boolean;
      };
      if (!object.visible) return;
      const unsupportedPrimitive = renderable.isPoints || renderable.isLine || renderable.isLine2;
      const excludedMesh = renderable.isMesh && isExcludedFromAo(object);
      if (!unsupportedPrimitive && !excludedMesh) return;
      object.visible = false;
      internals._visibilityCache.push(object);
    });
  };
}

const GOLDEN_POST_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new Vector2(1, 1) },
    bloomStrength: { value: 0.015 },
    bloomThreshold: { value: 0.96 },
    // Disabled. This was the single largest obstacle to matching the targets and
    // it hid behind every other lighting experiment for a long time.
    //
    // The term adds vec3(0.82, 0.88, 0.92) * shadowLift below luma 0.07. At the
    // old 0.008 that is ~L24 in sRGB, which is exactly where the render's p1 sat
    // (24) while both targets reach 0. So NOTHING in the scene could ever be
    // black: the floor was nailed 24 levels up, and because the added colour is
    // blue-biased it also pushed the deepest shade cool. Critics kept reporting
    // deep shade as "too bright, too grey and too cool" and every fix aimed at
    // the light rig, which could not move a constant added after tone mapping.
    //
    // Removing it lands the primary camera's shadow end exactly on target:
    // min 9 -> 0 (target 0), p5 34 -> 23 (target 23), median unchanged at 92
    // (target 92), share below L16 0.04% -> 2.68% (target 2.20%). It also
    // reverses what looked like an unavoidable regression on the two supporting
    // cameras - west elevation relative contrast 0.417 -> 0.573 and canopy
    // 0.543 -> 0.668. All three cameras improve.
    //
    // Nothing crushes, which was the fear this term existed to prevent: the dark
    // regions keep 32-33 distinct code values (target 33) and normalised local
    // gradient RISES in every one of them (shopfront 0.235 -> 0.330 against a
    // target of 0.398). If crush ever does appear, fix the geometry or material
    // that is genuinely black rather than lifting the whole frame off zero.
    shadowLift: { value: 0.0 },
    vignetteStrength: { value: 0.012 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float bloomStrength;
    uniform float bloomThreshold;
    uniform float shadowLift;
    uniform float vignetteStrength;
    varying vec2 vUv;

    vec3 highlights(vec3 color) {
      float peak = max(max(color.r, color.g), color.b);
      return color * smoothstep(bloomThreshold, 1.0, peak);
    }

    void main() {
      vec2 texel = 1.0 / max(resolution, vec2(1.0));
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      float baseLuma = dot(base, vec3(0.2126, 0.7152, 0.0722));
      float toeMask = 1.0 - smoothstep(0.025, 0.07, baseLuma);
      base += vec3(0.82, 0.88, 0.92) * shadowLift * toeMask;
      vec3 bloom = highlights(texture2D(tDiffuse, vUv + vec2(texel.x * 2.0, 0.0)).rgb);
      bloom += highlights(texture2D(tDiffuse, vUv - vec2(texel.x * 2.0, 0.0)).rgb);
      bloom += highlights(texture2D(tDiffuse, vUv + vec2(0.0, texel.y * 2.0)).rgb);
      bloom += highlights(texture2D(tDiffuse, vUv - vec2(0.0, texel.y * 2.0)).rgb);
      bloom *= 0.25 * bloomStrength;

      vec2 centered = vUv * 2.0 - 1.0;
      float edge = smoothstep(0.35, 1.35, dot(centered, centered));
      float vignette = 1.0 - edge * vignetteStrength;
      gl_FragColor = vec4((base + bloom) * vignette, 1.0);
    }
  `,
};
type RendererOptions = {
  highVis: boolean;
  lightingPreset: RuntimeLightingPreset;
  ao: boolean;
  post: boolean;
  maxPixelRatio?: number | undefined;
  disableShadows?: boolean | undefined;
};

export type RendererPerfInfo = {
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
};

type WebGLContextLike = WebGLRenderingContext | WebGL2RenderingContext;

function tryCreateWebGLContext(canvas: HTMLCanvasElement): WebGLContextLike | null {
  try {
    // Skip hardware MSAA when the native DPR is high enough that supersampling
    // already suppresses aliasing.  Saves significant fill cost on high-DPI panels.
    const needsAA = (window.devicePixelRatio || 1) < 1.5;
    const attributes: WebGLContextAttributes = {
      alpha: false,
      antialias: needsAA,
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
      desynchronized: true,
    };

    const webgl2 = canvas.getContext("webgl2", attributes) as WebGL2RenderingContext | null;
    if (webgl2) return webgl2;

    const webgl1 = canvas.getContext("webgl", attributes) as WebGLRenderingContext | null;
    if (webgl1) return webgl1;

    const experimental = canvas.getContext("experimental-webgl", attributes) as WebGLRenderingContext | null;
    if (experimental) return experimental;
  } catch {
    // Ignore and treat WebGL as unavailable.
  }
  return null;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly hasWebGL: boolean;
  private contextLost = false;
  private onContextLostCallback: (() => void) | null = null;
  private onContextRestoredCallback: (() => void) | null = null;

  private readonly onContextLost = (event: Event): void => {
    // Without preventDefault the browser will not attempt a restore at all.
    event.preventDefault();
    this.contextLost = true;
    console.warn("[renderer] WebGL context lost");
    this.onContextLostCallback?.();
  };

  private readonly onContextRestored = (): void => {
    this.contextLost = false;
    console.info("[renderer] WebGL context restored");
    this.onContextRestoredCallback?.();
  };

  /** True while the GPU context is gone and draw calls would be discarded. */
  isContextLost(): boolean {
    return this.contextLost;
  }

  setContextLossHandlers(handlers: { onLost?: () => void; onRestored?: () => void }): void {
    this.onContextLostCallback = handlers.onLost ?? null;
    this.onContextRestoredCallback = handlers.onRestored ?? null;
  }

  private readonly renderer: WebGLRenderer | null;
  private composer: EffectComposer | null = null;
  private worldPass: RenderPass | null = null;
  private aoPass: GTAOPass | null = null;
  private goldenPostPass: ShaderPass | null = null;
  private environmentTarget: WebGLRenderTarget | null = null;
  private width = 1;
  private height = 1;
  private readonly effectiveMaxPixelRatio: number;
  constructor(private readonly mountEl: HTMLElement, options: RendererOptions) {
    this.effectiveMaxPixelRatio = options.maxPixelRatio ?? MAX_PIXEL_RATIO;
    const palette = resolveBlockoutPalette(options.highVis);
    const canvas = document.createElement("canvas");
    const context = tryCreateWebGLContext(canvas);

    let renderer: WebGLRenderer | null = null;
    if (context) {
      try {
        const needsAA = (window.devicePixelRatio || 1) < 1.5;
        renderer = new WebGLRenderer({
          canvas,
          context,
          antialias: needsAA,
          alpha: false,
          powerPreference: "high-performance",
        });
      } catch {
        renderer = null;
      }
    }

    this.renderer = renderer;
    this.hasWebGL = Boolean(renderer);
    this.canvas = renderer ? renderer.domElement : canvas;
    this.canvas.dataset.testid = "game-canvas";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.canvas.style.touchAction = "none";

    this.mountEl.append(this.canvas);

    // A lost context leaves the canvas frozen while the simulation keeps
    // running invisibly — the player sees a still image and keeps taking
    // damage. Preventing the default lets the browser restore the context, and
    // the flag lets the loop skip drawing into a dead context meanwhile.
    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.canvas.addEventListener("webglcontextrestored", this.onContextRestored);

    if (this.renderer) {
      this.renderer.outputColorSpace = SRGBColorSpace;
      this.renderer.toneMapping = ACESFilmicToneMapping;
      // Sunlit paving does measure hot here — 176 against a target of 142, while
      // shaded paving is already correct at 88 against 90 — but do not fix that
      // by lowering this. Dropping to 1.28 alongside a fill cut put the Spawn-A
      // camera almost exactly on its target (relative contrast 0.554 against
      // 0.552, mean 107 against 101) and was still reverted, because a blind A/B
      // fitted a single per-code-value LUT from the old render to the new one
      // with a residual under 0.8/255 on all three cameras: it was a global tone
      // curve, not a lighting change, and it cost both supporting cameras. See
      // the fill note in Game.ts for the full measurements.
      //
      // 1.42 was measured too and is not a compromise, just a partial revert —
      // every metric interpolates back toward the old values (paving 171, relC
      // 0.492) while fixing nothing. Do not "split the difference" here.
      //
      // The paving reads hot relative to the target because the frame is missing
      // its sunlit vertical surfaces, not because the curve is too high. Re-derive
      // this only after the west frontage actually receives direct sun.
      this.renderer.toneMappingExposure = 1.58;
      this.renderer.shadowMap.enabled = !options.disableShadows;
      this.renderer.shadowMap.type = PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = true;
      // Safety net: if any transmissive material ever ships again, the hidden
      // opaque-scene pre-pass it forces renders at 1/16th the pixels instead of
      // full resolution. Gameplay materials should still keep transmission at 0.
      this.renderer.transmissionResolutionScale = 0.25;
      this.renderer.info.autoReset = false;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio ?? MAX_PIXEL_RATIO));
      this.renderer.setClearColor(
        options.lightingPreset === "golden" ? 0xE6D7C2 : palette.background,
        1,
      );
    }

    this.resize();

    // ── Golden-hour composer (world-only; viewmodel is rendered directly after) ──
    if (this.renderer && options.lightingPreset === "golden" && (options.ao || options.post)) {
      const dpr = this.renderer.getPixelRatio();
      this.composer = new EffectComposer(this.renderer);
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(this.width, this.height);

      // Placeholder scene/camera — swapped each frame before render
      this.worldPass = new RenderPass(new Scene(), new PerspectiveCamera());
      this.composer.addPass(this.worldPass);

      if (options.ao) {
        // Full resolution: the occlusion this pass has to deliver is a
        // 120 mm jamb reveal and a shutter sitting proud of its recess.
        // Half-res smears both back into the wall plane.
        this.aoPass = new GTAOPass(new Scene(), new PerspectiveCamera(), this.width, this.height);
        this.aoPass.blendIntensity = AO_BLEND_INTENSITY;
        this.aoPass.updateGtaoMaterial({
          radius: AO_RADIUS_M,
          distanceExponent: AO_DISTANCE_EXPONENT,
          thickness: AO_THICKNESS_M,
          distanceFallOff: AO_DISTANCE_FALLOFF,
          scale: AO_SCALE,
          samples: AO_SAMPLES,
          screenSpaceRadius: false,
        });
        constrainAoOccluders(this.aoPass);
        this.composer.addPass(this.aoPass);
      }

      if (options.post) {
        this.goldenPostPass = new ShaderPass(GOLDEN_POST_SHADER);
        this.goldenPostPass.uniforms["resolution"]!.value.set(
          this.width * dpr,
          this.height * dpr,
        );
        this.composer.addPass(this.goldenPostPass);
      }

      // OutputPass applies tone mapping + sRGB conversion (required since Three.js r154+)
      this.composer.addPass(new OutputPass());
    }
  }

  getAspect(): number {
    return this.width / this.height;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getPixelRatioCap(): number {
    return MAX_PIXEL_RATIO;
  }

  getCurrentPixelRatio(): number {
    if (!this.renderer) return 1;
    return this.renderer.getPixelRatio();
  }

  requestShadowUpdate(): void {
    if (!this.renderer) return;
    this.renderer.shadowMap.needsUpdate = true;
  }

  getPerfInfo(): RendererPerfInfo {
    if (!this.renderer) {
      return {
        drawCalls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0,
      };
    }
    return {
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }

  resize(): void {
    const nextWidth = Math.max(1, this.mountEl.clientWidth || window.innerWidth);
    const nextHeight = Math.max(1, this.mountEl.clientHeight || window.innerHeight);

    this.width = nextWidth;
    this.height = nextHeight;
    if (this.renderer) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.effectiveMaxPixelRatio));
      this.renderer.setSize(nextWidth, nextHeight, false);
      this.composer?.setSize(nextWidth, nextHeight);
      this.aoPass?.setSize(nextWidth, nextHeight);
      const dpr = this.renderer.getPixelRatio();
      this.goldenPostPass?.uniforms["resolution"]!.value.set(nextWidth * dpr, nextHeight * dpr);
      return;
    }

    // Headless / no-WebGL fallback: keep a correctly-sized canvas for layout and overlays.
    this.canvas.width = nextWidth;
    this.canvas.height = nextHeight;
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    if (!this.renderer) return;
    this.renderer.info.reset();
    this.renderer.render(scene, camera);
  }

  renderWithViewModel(
    worldScene: Scene,
    worldCamera: PerspectiveCamera,
    viewModelScene: Scene | null,
    viewModelCamera: PerspectiveCamera | null,
    renderViewModel: boolean,
  ): void {
    if (!this.renderer) return;
    this.renderer.info.reset();

    if (this.composer && this.worldPass) {
      // Swap scene/camera into the passes for this frame
      this.worldPass.scene = worldScene;
      this.worldPass.camera = worldCamera;
      if (this.aoPass) {
        this.aoPass.scene = worldScene;
        this.aoPass.camera = worldCamera;
      }
      this.composer.render();
    } else {
      this.renderer.render(worldScene, worldCamera);
    }

    if (!renderViewModel || !viewModelScene || !viewModelCamera) return;

    // Viewmodel rendered directly — no SSAO applied to weapon
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(viewModelScene, viewModelCamera);
    this.renderer.autoClear = prevAutoClear;
  }

  async compileSceneAsync(
    worldScene: Scene,
    worldCamera: PerspectiveCamera,
    viewModelScene: Scene | null,
    viewModelCamera: PerspectiveCamera | null,
    renderViewModel: boolean,
  ): Promise<void> {
    if (!this.renderer) return;

    await this.renderer.compileAsync(worldScene, worldCamera);
    if (renderViewModel && viewModelScene && viewModelCamera) {
      await this.renderer.compileAsync(viewModelScene, viewModelCamera);
    }
  }

  getWebGLRenderer(): WebGLRenderer | null {
    return this.renderer;
  }

  createPmremEnvironment(scene: Scene, position: Vector3): Texture | null {
    if (!this.renderer) return null;

    const startedAtMs = performance.now();
    const generator = new PMREMGenerator(this.renderer);

    // Neutralise the sky dome's artistic tint for the duration of this bake.
    // fromScene() renders the dome into the cubemap, and this map's shade is lit
    // almost entirely by the resulting PMREM, so any tint applied to the dome
    // silently became a lighting change: darkening the sky to match the targets
    // dropped the whole frame's median luminance from 92 to 86 and had to be
    // paid back by raising SCENE_ENVIRONMENT_INTENSITY. Baking the untinted dome
    // separates the two - the tint stays a visual property of the sky, while the
    // irradiance it contributes stays fixed.
    const skyMaterial = (scene.getObjectByName("desert-sky") as (Object3D & {
      material?: { uniforms?: Record<string, { value: unknown }> };
    }) | undefined)?.material;
    const skyTint = skyMaterial?.uniforms?.["skyTint"]?.value as
      | { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void }
      | undefined;
    const savedTint = skyTint ? { x: skyTint.x, y: skyTint.y, z: skyTint.z } : null;
    skyTint?.set(1, 1, 1);

    try {
      const nextTarget = generator.fromScene(scene, 0, 0.1, 1500, {
        size: 256,
        position,
      });
      this.environmentTarget?.dispose();
      this.environmentTarget = nextTarget;
      console.info(
        `[runtime:ibl] generated desert-sky PMREM in ${(performance.now() - startedAtMs).toFixed(1)}ms`,
      );
      return nextTarget.texture;
    } catch (error) {
      console.warn("[runtime:ibl] failed to generate desert-sky PMREM; continuing without IBL", error);
      return null;
    } finally {
      if (skyTint && savedTint) skyTint.set(savedTint.x, savedTint.y, savedTint.z);
      generator.dispose();
    }
  }

  dispose(): void {
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.onContextLostCallback = null;
    this.onContextRestoredCallback = null;
    this.environmentTarget?.dispose();
    this.environmentTarget = null;
    this.renderer?.dispose();
  }
}
