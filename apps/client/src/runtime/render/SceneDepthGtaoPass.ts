import {
  Color,
  DepthTexture,
  NoBlending,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";

/**
 * GTAO that reads the beauty pass's own depth instead of re-rendering the
 * world into a normal/depth G-buffer.
 *
 * The stock pass draws every visible mesh a second time with a normal
 * material, then copies the frame and multiplies AO over the copy. On the
 * Bazaar at 2x DPR that second world pass and the full-resolution AO cost more
 * than the whole beauty frame (about 25 ms of a 40 ms frame on an M3 Pro).
 *
 * Here:
 * - Occlusion is computed from the exact depth the player sees, so there is no
 *   second geometry pass and no per-frame visibility traversal. Normals come
 *   from that depth at full resolution. Foliage cut-outs, double-sided cloth
 *   and decals occlude exactly as they are drawn.
 * - The horizon search and denoise run at `aoPixelRatio` (the CSS-pixel grid on
 *   Retina screens). A depth-aware upsample keeps silhouettes sharp: each
 *   full-resolution pixel only takes occlusion from low-resolution samples on
 *   its own surface.
 * - A separable 5x5 depth-aware blur replaces the stock Poisson denoise.
 * - Composite and upsample happen in one pass that writes the shaded frame into
 *   the composer's write buffer, which replaces the stock copy + blend pair.
 *
 * The composer's two render targets must carry depth textures (see
 * `attachComposerDepth`).
 */
export class SceneDepthGtaoPass extends GTAOPass {
  /** Pixel ratio of the AO grid, relative to CSS pixels. 0 disables the cap. */
  aoPixelRatio = 0;
  private devicePixelRatio = 1;
  private readonly compositeMaterial: ShaderMaterial;
  private readonly blurMaterial: ShaderMaterial;
  private boundDepth: Texture | null = null;
  private readonly previousClearColor = new Color();

  constructor(width: number, height: number) {
    super(new Scene(), new PerspectiveCamera(), width, height);
    // The stock constructor allocated a full-size normal target for its own
    // G-buffer. Keep it (the base class dereferences it) but at one texel.
    (this as unknown as { normalRenderTarget: WebGLRenderTarget }).normalRenderTarget.setSize(1, 1);
    // Normals from depth (NORMAL_VECTOR_TYPE 0), no G-buffer render. The real
    // depth texture is bound per frame, since the composer ping-pongs targets.
    this.setGBuffer(new DepthTexture(1, 1), undefined);
    // GTAO rotates its horizon slices with a 5x5 magic-square pattern, so a
    // 5x5 average on one surface cancels the pattern exactly. Run separably and
    // weight by view depth so it never averages across a silhouette. This
    // replaces the stock Poisson denoise, which re-derives a normal from nine
    // depth fetches at each of its 16 samples.
    this.blurMaterial = new ShaderMaterial({
      defines: { RADIUS: 2 },
      uniforms: {
        tAo: { value: null },
        tDepth: { value: null },
        direction: { value: new Vector2(1, 0) },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 1000 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        #include <packing>
        uniform sampler2D tAo;
        uniform sampler2D tDepth;
        uniform vec2 direction;
        uniform float cameraNear;
        uniform float cameraFar;
        varying vec2 vUv;
        float viewDepth(const in vec2 uv) {
          return -perspectiveDepthToViewZ(textureLod(tDepth, uv, 0.0).x, cameraNear, cameraFar);
        }
        void main() {
          vec2 texel = direction / vec2(textureSize(tAo, 0));
          float centerDepth = viewDepth(vUv);
          float falloff = 1.0 / (0.02 + 0.02 * centerDepth);
          float ao = 0.0;
          float weight = 0.0;
          for (int i = -RADIUS; i <= RADIUS; i++) {
            vec2 uv = vUv + float(i) * texel;
            float w = exp(-abs(viewDepth(uv) - centerDepth) * falloff);
            ao += textureLod(tAo, uv, 0.0).r * w;
            weight += w;
          }
          gl_FragColor = vec4(vec3(ao / weight), 1.0);
        }`,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    });
    this.compositeMaterial = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tAo: { value: null },
        tDepth: { value: null },
        aoSize: { value: new Vector2(1, 1) },
        intensity: { value: 1 },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 1000 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        #include <packing>
        uniform sampler2D tDiffuse;
        uniform sampler2D tAo;
        uniform sampler2D tDepth;
        uniform vec2 aoSize;
        uniform float intensity;
        uniform float cameraNear;
        uniform float cameraFar;
        varying vec2 vUv;
        float viewDepth(const in vec2 uv) {
          return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar);
        }
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          float centerDepth = viewDepth(vUv);
          // Bilinear footprint on the AO grid, reweighted by depth agreement so
          // occlusion never bleeds across a silhouette.
          vec2 p = vUv * aoSize - 0.5;
          vec2 f = fract(p);
          vec2 texel = 1.0 / aoSize;
          vec2 base = (floor(p) + 0.5) * texel;
          float tolerance = 0.002 + 0.01 * centerDepth;
          float ao = 0.0;
          float weight = 0.0;
          for (int i = 0; i < 4; i++) {
            vec2 o = vec2(float(i - (i / 2) * 2), float(i / 2));
            vec2 uv = base + o * texel;
            float w = (o.x > 0.5 ? f.x : 1.0 - f.x) * (o.y > 0.5 ? f.y : 1.0 - f.y);
            w *= 1.0 / (tolerance + abs(viewDepth(uv) - centerDepth));
            ao += texture2D(tAo, uv).r * w;
            weight += w;
          }
          ao = weight > 0.0 ? ao / weight : 1.0;
          gl_FragColor = vec4(color.rgb * mix(1.0, ao, intensity), color.a);
        }`,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    });
  }

  /** CSS size and device pixel ratio of the composer; AO follows `aoPixelRatio`. */
  setDevicePixelRatio(dpr: number): void {
    this.devicePixelRatio = Math.max(dpr, 1e-3);
    this.setSize(this.width, this.height);
  }

  override setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const scale = this.aoPixelRatio > 0 ? Math.min(1, this.aoPixelRatio / this.devicePixelRatio) : 1;
    const aoWidth = Math.max(1, Math.round(width * scale));
    const aoHeight = Math.max(1, Math.round(height * scale));
    this.gtaoRenderTarget.setSize(aoWidth, aoHeight);
    this.pdRenderTarget.setSize(aoWidth, aoHeight);
    this.gtaoMaterial.uniforms.resolution!.value.set(aoWidth, aoHeight);
    this.pdMaterial.uniforms.resolution!.value.set(aoWidth, aoHeight);
    this.compositeMaterial.uniforms.aoSize!.value.set(aoWidth, aoHeight);
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
  ): void {
    const depth = readBuffer.depthTexture;
    if (!depth) throw new Error("SceneDepthGtaoPass needs composer targets with depth textures");
    if (depth !== this.boundDepth) {
      this.boundDepth = depth;
      this.gtaoMaterial.uniforms.tDepth!.value = depth;
      this.pdMaterial.uniforms.tDepth!.value = depth;
    }
    const camera = this.camera as PerspectiveCamera;
    const gtao = this.gtaoMaterial.uniforms;
    gtao.cameraNear!.value = camera.near;
    gtao.cameraFar!.value = camera.far;
    gtao.cameraProjectionMatrix!.value.copy(camera.projectionMatrix);
    gtao.cameraProjectionMatrixInverse!.value.copy(camera.projectionMatrixInverse);
    gtao.cameraWorldMatrix!.value.copy(camera.matrixWorld);
    this.renderFullscreen(renderer, this.gtaoMaterial, this.gtaoRenderTarget, true);
    const blur = this.blurMaterial.uniforms;
    blur.tDepth!.value = depth;
    blur.cameraNear!.value = camera.near;
    blur.cameraFar!.value = camera.far;
    blur.tAo!.value = this.gtaoRenderTarget.texture;
    blur.direction!.value.set(1, 0);
    this.renderFullscreen(renderer, this.blurMaterial, this.pdRenderTarget, false);
    blur.tAo!.value = this.pdRenderTarget.texture;
    blur.direction!.value.set(0, 1);
    this.renderFullscreen(renderer, this.blurMaterial, this.gtaoRenderTarget, false);

    const composite = this.compositeMaterial.uniforms;
    composite.tDiffuse!.value = readBuffer.texture;
    composite.tAo!.value = this.gtaoRenderTarget.texture;
    composite.tDepth!.value = depth;
    composite.intensity!.value = this.blendIntensity;
    composite.cameraNear!.value = camera.near;
    composite.cameraFar!.value = camera.far;
    this.renderFullscreen(renderer, this.compositeMaterial, this.renderToScreen ? null : writeBuffer, false);
  }

  override dispose(): void {
    super.dispose();
    this.compositeMaterial.dispose();
    this.blurMaterial.dispose();
  }

  private renderFullscreen(
    renderer: WebGLRenderer,
    material: ShaderMaterial,
    target: WebGLRenderTarget | null,
    clearWhite: boolean,
  ): void {
    const quad = (this as unknown as { _fsQuad: { material: ShaderMaterial; render: (r: WebGLRenderer) => void } })._fsQuad;
    const previousAutoClear = renderer.autoClear;
    renderer.setRenderTarget(target);
    renderer.autoClear = false;
    if (clearWhite) {
      const previousAlpha = renderer.getClearAlpha();
      renderer.getClearColor(this.previousClearColor);
      renderer.setClearColor(0xffffff, 1);
      renderer.clear();
      renderer.setClearColor(this.previousClearColor, previousAlpha);
    }
    quad.material = material;
    quad.render(renderer);
    renderer.autoClear = previousAutoClear;
  }
}
