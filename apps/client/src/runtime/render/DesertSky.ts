import { DirectionalLight, PerspectiveCamera, Scene, Vector3 } from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";

export type DesertSkyPreset = "midday" | "late-afternoon";

export type DesertSkyHandle = {
  sky: Sky;
  update: () => void;
  dispose: () => void;
};

export function installDesertSky(opts: {
  scene: Scene;
  camera: PerspectiveCamera;
  sunLight: DirectionalLight;
  preset?: DesertSkyPreset;
}): DesertSkyHandle {
  // Remove previous if it exists (hot reload safety)
  const existing = opts.scene.getObjectByName("desert-sky");
  if (existing) opts.scene.remove(existing);

  const sky = new Sky();
  sky.name = "desert-sky";
  sky.frustumCulled = false;

  // MUST be within camera.far or it clips
  sky.scale.setScalar(opts.camera.far * 0.95);

  // Keep behind all world geo
  sky.renderOrder = -1000;
  sky.material.depthWrite = false;
  sky.material.depthTest = true;
  sky.material.fog = false;

  const u = sky.material.uniforms;

  // Desert tuning:
  // - turbidity up = more dust
  // - rayleigh down = less saturated blue
  // - mie up = stronger haze / sun glow
  // NOTE: the bazaar installs this with preset "midday" (see Game.ts), so the
  // "late-afternoon" branch below and the default above are both dead for the
  // shipped map. Edit the midday values when tuning against the review cameras -
  // a change to the other branch measures as a bit-identical no-op.
  const preset = opts.preset ?? "late-afternoon";
  if (preset === "midday") {
    u["turbidity"]!.value = 6;
    // Do not raise this to deepen the sky. 1.15 -> 2.45 (with turbidity 6 -> 4.2)
    // was measured and is backwards: in this scattering model more rayleigh at a
    // near-horizon view angle brightens and WHITENS the band the street cameras
    // actually see. Sky went 226,235,242 to 237,243,246, blue-minus-red fell
    // 16.0 -> 8.9 against a target of 38.2, and the frame's p95 rose 233 -> 241.
    u["rayleigh"]!.value = 1.15;
    u["mieCoefficient"]!.value = 0.004;
    u["mieDirectionalG"]!.value = 0.82;
  } else {
    u["turbidity"]!.value = 8;
    u["rayleigh"]!.value = 2.6;
    u["mieCoefficient"]!.value = 0.005;
    u["mieDirectionalG"]!.value = 0.91;
  }

  // Keep the physical sky's cool zenith and blend only a pale atmospheric
  // horizon. The former orange horizon patch reintroduced the sunset grade
  // after the light itself had already been calibrated.
  u["horizonWarmth"] = { value: preset === "late-afternoon" ? 0.55 : 0.12 };
  // Per-channel scale on the dome's own output. The physical model renders this
  // sky too bright AND too neutral for the targets (226,235,241 against
  // 195,214,233), and its own controls cannot fix that: rayleigh whitens the
  // horizon band rather than deepening it. The needed correction is non-uniform
  // - red down hardest, blue almost untouched - so it is expressed as a tint on
  // the dome rather than as exposure, which would take the whole frame with it.
  u["skyTint"] = { value: new Vector3(0.52, 0.66, 0.85) };
  sky.material.fragmentShader = sky.material.fragmentShader
    .replace(
      "uniform vec3 up;",
      "uniform vec3 up;\nuniform float horizonWarmth;\nuniform vec3 skyTint;",
    )
    .replace(
      "gl_FragColor = vec4( retColor, 1.0 );",
      `float horizonBand = 1.0 - smoothstep(0.35, 0.75, max(direction.y, 0.0));
      vec3 warmHorizon = vec3(0.82, 0.86, 0.88);
      retColor = mix(retColor, warmHorizon, horizonBand * horizonWarmth);
      retColor *= skyTint;
      gl_FragColor = vec4( retColor, 1.0 );`,
    );

  const sunDir = new Vector3();

  const updateSun = (): void => {
    // DirectionalLight points from position -> target, but sky expects direction TO the sun.
    // So we use (sun.position - sun.target.position).
    sunDir
      .subVectors(opts.sunLight.position, opts.sunLight.target.position)
      .normalize();
    u["sunPosition"]!.value.copy(sunDir); // magnitude not important; shader normalizes
  };

  const update = (): void => {
    // Sky must follow camera translation so it never feels "near".
    // DO NOT parent sky to camera (that would rotate it with view).
    sky.position.copy(opts.camera.position);
    updateSun();
  };

  update();
  opts.scene.add(sky);

  const dispose = (): void => {
    opts.scene.remove(sky);
    sky.geometry.dispose();
    sky.material.dispose();
  };

  return { sky, update, dispose };
}
