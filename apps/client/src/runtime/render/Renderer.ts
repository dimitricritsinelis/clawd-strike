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
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { resolveBlockoutPalette } from "./BlockoutMaterials";
import type { RuntimeLightingPreset } from "../utils/UrlParams";

const MAX_PIXEL_RATIO = 1.10;

// ── SSAO tuning constants ───────────────────────────────────────────
const SSAO_KERNEL_RADIUS = 0.5;
const SSAO_MIN_DISTANCE = 0.002;
const SSAO_MAX_DISTANCE = 0.025;
const SSAO_STRENGTH = 0.68;
const SSAO_MAX_DETAIL_BATCH_TRIANGLES = 20_000;
const SSAO_EXCLUDED_MAP_BRANCHES = new Set([
  "decorative-palms",
]);

type SsaoVisibilityInternals = {
  scene: Scene;
  _visibilityCache: Object3D[];
  _overrideVisibility: () => void;
  copyMaterial: {
    fragmentShader: string;
    needsUpdate: boolean;
    uniforms: Record<string, { value: unknown }>;
  };
};

function belongsToStructuralSsaoSurface(object: Object3D): boolean {
  let insideMapBlockout = false;
  let insideWallDetails = false;
  let current: Object3D | null = object;
  while (current) {
    if (SSAO_EXCLUDED_MAP_BRANCHES.has(current.name)) return false;
    if (current.name === "map-blockout") insideMapBlockout = true;
    if (current.name === "map-wall-details") insideWallDetails = true;
    current = current.parent;
  }
  if (insideWallDetails) {
    const renderable = object as Object3D & {
      count?: number;
      geometry?: {
        index?: { count: number } | null;
        getAttribute?: (name: string) => { count: number } | undefined;
      };
      isInstancedMesh?: boolean;
    };
    const vertexCount = renderable.geometry?.index?.count
      ?? renderable.geometry?.getAttribute?.("position")?.count
      ?? 0;
    const instances = renderable.isInstancedMesh ? Math.max(0, renderable.count ?? 0) : 1;
    if ((vertexCount / 3) * instances > SSAO_MAX_DETAIL_BATCH_TRIANGLES) return false;
  }
  return insideMapBlockout;
}

function constrainSsaoToStructuralSurfaces(pass: SSAOPass): void {
  const internals = pass as unknown as SsaoVisibilityInternals;
  internals.copyMaterial.uniforms["aoStrength"] = { value: SSAO_STRENGTH };
  internals.copyMaterial.fragmentShader = internals.copyMaterial.fragmentShader
    .replace("uniform float opacity;", "uniform float opacity;\nuniform float aoStrength;")
    .replace(
      "vec4 texel = texture2D( tDiffuse, vUv );",
      "vec4 texel = texture2D( tDiffuse, vUv );\ntexel.rgb = mix(vec3(1.0), texel.rgb, aoStrength);",
    );
  internals.copyMaterial.needsUpdate = true;
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
      const excludedMesh = renderable.isMesh && !belongsToStructuralSsaoSurface(object);
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
    shadowLift: { value: 0.02 },
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
  private readonly renderer: WebGLRenderer | null;
  private composer: EffectComposer | null = null;
  private worldPass: RenderPass | null = null;
  private ssaoPass: SSAOPass | null = null;
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

    if (this.renderer) {
      this.renderer.outputColorSpace = SRGBColorSpace;
      this.renderer.toneMapping = ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.28;
      this.renderer.shadowMap.enabled = !options.disableShadows;
      this.renderer.shadowMap.type = PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = true;
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
        const halfW = Math.max(1, Math.floor(this.width / 2));
        const halfH = Math.max(1, Math.floor(this.height / 2));
        this.ssaoPass = new SSAOPass(new Scene(), new PerspectiveCamera(), halfW, halfH);
        this.ssaoPass.kernelRadius = SSAO_KERNEL_RADIUS;
        this.ssaoPass.minDistance = SSAO_MIN_DISTANCE;
        this.ssaoPass.maxDistance = SSAO_MAX_DISTANCE;
        constrainSsaoToStructuralSurfaces(this.ssaoPass);
        this.composer.addPass(this.ssaoPass);
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
      this.ssaoPass?.setSize(
        Math.max(1, Math.floor(nextWidth / 2)),
        Math.max(1, Math.floor(nextHeight / 2)),
      );
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
      if (this.ssaoPass) {
        this.ssaoPass.scene = worldScene;
        this.ssaoPass.camera = worldCamera;
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
      generator.dispose();
    }
  }

  dispose(): void {
    this.environmentTarget?.dispose();
    this.environmentTarget = null;
    this.renderer?.dispose();
  }
}
