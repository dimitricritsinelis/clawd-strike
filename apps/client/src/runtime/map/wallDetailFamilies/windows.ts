import {
  BoxGeometry,
  BufferGeometry,
  ClampToEdgeWrapping,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshPhysicalMaterial,
  NoColorSpace,
  SRGBColorSpace,
  Shape,
  Texture,
  TextureLoader,
  Vector2,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  HERO_POINTED_ARCH_APERTURE_PANEL_BOUNDS,
  HERO_POINTED_ARCH_FRAME_APERTURE_BOUNDS,
  HERO_POINTED_ARCH_FRAME_OUTER_BOUNDS,
  POINTED_ARCH_APERTURE_PANEL_BOUNDS,
  POINTED_ARCH_FRAME_APERTURE_BOUNDS,
  POINTED_ARCH_FRAME_OUTER_BOUNDS,
  SPAWN_HERO_POINTED_ARCH_APERTURE_PANEL_BOUNDS,
  SPAWN_HERO_POINTED_ARCH_FRAME_APERTURE_BOUNDS,
  SPAWN_HERO_POINTED_ARCH_FRAME_OUTER_BOUNDS,
  SPAWN_WINDOW_POINTED_ARCH_APERTURE_PANEL_BOUNDS,
  SPAWN_WINDOW_POINTED_ARCH_FRAME_APERTURE_BOUNDS,
  SPAWN_WINDOW_POINTED_ARCH_FRAME_OUTER_BOUNDS,
} from "../pointedArchProfile";

const STAINED_GLASS_TEXTURE_BASE_URL = "/assets/textures/environment/bazaar/windows/stained_glass_panel_001";
const TEMPLATE_TEXTURE_ANISOTROPY = 8;
const templateTextureLoader = new TextureLoader();
const templateTextureCache = new Map<string, Texture>();

function applyWindowPartColor(geometry: BufferGeometry, color: readonly [number, number, number]): void {
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    colors[index * 3] = color[0];
    colors[index * 3 + 1] = color[1];
    colors[index * 3 + 2] = color[2];
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
}

function createWindowBoxPart(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  color?: readonly [number, number, number],
  pitchRad = 0,
): BufferGeometry {
  const geometry = new BoxGeometry(width, height, depth);
  if (pitchRad !== 0) geometry.rotateX(pitchRad);
  geometry.translate(x, y, z);
  if (color) applyWindowPartColor(geometry, color);
  return geometry;
}

function mergeWindowGeometry(parts: BufferGeometry[]): BufferGeometry {
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error("Failed to merge reusable window geometry.");
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createLouveredShutterGeometry(): BufferGeometry {
  const paintedFrame: readonly [number, number, number] = [0.82, 0.78, 0.66];
  const wornFrame: readonly [number, number, number] = [0.68, 0.64, 0.54];
  const agedIron: readonly [number, number, number] = [0.24, 0.25, 0.23];
  const parts: BufferGeometry[] = [
    createWindowBoxPart(0.1, 1, 0.72, -0.45, 0, 0, paintedFrame),
    createWindowBoxPart(0.1, 1, 0.72, 0.45, 0, 0, wornFrame),
    createWindowBoxPart(0.82, 0.095, 0.72, 0, 0.4525, 0, paintedFrame),
    createWindowBoxPart(0.82, 0.095, 0.72, 0, -0.4525, 0, wornFrame),
    createWindowBoxPart(0.82, 0.06, 0.78, 0, 0, 0.015, paintedFrame),
  ];

  // Two banks of pitched blades sit inside a mortised stile-and-rail frame.
  // Their real silhouette and self-shadow replace the former vertex-colored
  // slab while preserving the same unit bounds and placement contract.
  const louverYs = [-0.39, -0.31, -0.23, -0.15, -0.07, 0.07, 0.15, 0.23, 0.31, 0.39];
  for (const [index, louverY] of louverYs.entries()) {
    const tone = index % 3 === 0 ? 0.7 : (index % 3 === 1 ? 0.78 : 0.74);
    parts.push(createWindowBoxPart(
      0.8,
      0.055,
      0.66,
      0,
      louverY,
      0.015,
      [tone, tone * 0.94, tone * 0.82],
      -0.34,
    ));
  }

  // Two low-profile straps and a latch establish believable shutter hardware
  // without expanding the normalized family envelope or creating a bright
  // combat-distance accent.
  for (const hingeY of [-0.31, 0.31]) {
    parts.push(createWindowBoxPart(0.18, 0.028, 0.06, -0.34, hingeY, 0.36, agedIron));
  }
  parts.push(createWindowBoxPart(0.095, 0.032, 0.06, 0.3, 0, 0.36, agedIron));

  return mergeWindowGeometry(parts);
}

export function createInsetWindowRecessGeometry(): BufferGeometry {
  return mergeWindowGeometry([
    // The back plate is deliberately deep; the four returns make the shadow
    // read as a built reveal instead of a dark rectangle painted on the wall.
    createWindowBoxPart(0.82, 0.82, 0.08, 0, 0, -0.44),
    createWindowBoxPart(0.09, 1, 0.88, -0.455, 0, -0.02),
    createWindowBoxPart(0.09, 1, 0.88, 0.455, 0, -0.02),
    createWindowBoxPart(0.82, 0.09, 0.88, 0, -0.455, -0.02),
    createWindowBoxPart(0.82, 0.09, 0.88, 0, 0.455, -0.02),
  ]);
}

export function createTimberWindowRecessGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const plankCount = 5;
  const gap = 0.014;
  const plankWidth = (0.84 - gap * (plankCount - 1)) / plankCount;
  for (let index = 0; index < plankCount; index += 1) {
    const x = -0.42 + plankWidth * 0.5 + index * (plankWidth + gap);
    const tone = index % 2 === 0 ? 0.78 : 0.66;
    parts.push(createWindowBoxPart(
      plankWidth,
      0.82,
      0.09,
      x,
      0,
      -0.445,
      [tone, tone * 0.86, tone * 0.68],
    ));
  }
  parts.push(
    createWindowBoxPart(0.09, 1, 0.84, -0.455, 0, -0.08, [0.68, 0.58, 0.45]),
    createWindowBoxPart(0.09, 1, 0.84, 0.455, 0, -0.08, [0.74, 0.63, 0.48]),
    createWindowBoxPart(0.82, 0.09, 0.84, 0, -0.455, -0.08, [0.66, 0.56, 0.43]),
    createWindowBoxPart(0.82, 0.09, 0.84, 0, 0.455, -0.08, [0.76, 0.65, 0.5]),
    createWindowBoxPart(0.78, 0.055, 0.12, 0, 0, -0.365, [0.64, 0.54, 0.41]),
  );
  return mergeWindowGeometry(parts);
}

export function createPointedArchShape(widthHalf: number, bottomY: number, springY: number, apexY: number): Shape {
  const shape = new Shape();
  shape.moveTo(-widthHalf, bottomY);
  shape.lineTo(widthHalf, bottomY);
  shape.lineTo(widthHalf, springY);
  shape.quadraticCurveTo(widthHalf * 0.94, apexY * 0.82, 0, apexY);
  shape.quadraticCurveTo(-widthHalf * 0.94, apexY * 0.82, -widthHalf, springY);
  shape.lineTo(-widthHalf, bottomY);
  return shape;
}

function createArchitecturalArchExtrusion(
  shape: Shape,
  curveSegments: number,
  surface: "panel" | "frame",
): BufferGeometry {
  const bevelThickness = surface === "frame" ? 0.035 : 0.018;
  const geometry = new ExtrudeGeometry(shape, {
    depth: 1 - bevelThickness * 2,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: surface === "frame" ? 0.014 : 0.006,
    bevelThickness,
    curveSegments,
  });
  geometry.rotateY(Math.PI * 0.5);
  geometry.computeBoundingBox();
  const initialBounds = geometry.boundingBox;
  if (initialBounds) {
    const height = Math.max(1e-4, initialBounds.max.y - initialBounds.min.y);
    const width = Math.max(1e-4, initialBounds.max.z - initialBounds.min.z);
    geometry.scale(1, 1 / height, 1 / width);
    geometry.computeBoundingBox();
    const fittedBounds = geometry.boundingBox;
    if (fittedBounds) {
      geometry.translate(
        -(fittedBounds.min.x + fittedBounds.max.x) * 0.5,
        -(fittedBounds.min.y + fittedBounds.max.y) * 0.5,
        -(fittedBounds.min.z + fittedBounds.max.z) * 0.5,
      );
    }
  }
  applyProjectedArchUvs(geometry);
  geometry.computeVertexNormals();
  return geometry;
}

export function createPointedArchPanelGeometry(): BufferGeometry {
  return createArchitecturalArchExtrusion(createPointedArchShape(
    POINTED_ARCH_APERTURE_PANEL_BOUNDS.widthHalf,
    POINTED_ARCH_APERTURE_PANEL_BOUNDS.bottomY,
    POINTED_ARCH_APERTURE_PANEL_BOUNDS.springY,
    POINTED_ARCH_APERTURE_PANEL_BOUNDS.apexY,
  ), 24, "panel");
}

export function createPointedArchFrameGeometry(): BufferGeometry {
  const outer = createPointedArchShape(
    POINTED_ARCH_FRAME_OUTER_BOUNDS.widthHalf,
    POINTED_ARCH_FRAME_OUTER_BOUNDS.bottomY,
    POINTED_ARCH_FRAME_OUTER_BOUNDS.springY,
    POINTED_ARCH_FRAME_OUTER_BOUNDS.apexY,
  );
  const inner = createPointedArchShape(
    POINTED_ARCH_FRAME_APERTURE_BOUNDS.widthHalf,
    POINTED_ARCH_FRAME_APERTURE_BOUNDS.bottomY,
    POINTED_ARCH_FRAME_APERTURE_BOUNDS.springY,
    POINTED_ARCH_FRAME_APERTURE_BOUNDS.apexY,
  );
  outer.holes.push(inner);
  return createArchitecturalArchExtrusion(outer, 24, "frame");
}

export function createSpawnPointedArchShape(widthHalf: number, bottomY: number, springY: number, apexY: number): Shape {
  const shape = new Shape();
  shape.moveTo(-widthHalf, bottomY);
  shape.lineTo(widthHalf, bottomY);
  shape.lineTo(widthHalf, springY);
  shape.quadraticCurveTo(widthHalf * 0.82, apexY * 0.9, 0, apexY);
  shape.quadraticCurveTo(-widthHalf * 0.82, apexY * 0.9, -widthHalf, springY);
  shape.lineTo(-widthHalf, bottomY);
  return shape;
}

export function createSpawnPointedArchPanelGeometry(): BufferGeometry {
  return createArchitecturalArchExtrusion(createSpawnPointedArchShape(
    SPAWN_WINDOW_POINTED_ARCH_APERTURE_PANEL_BOUNDS.widthHalf,
    SPAWN_WINDOW_POINTED_ARCH_APERTURE_PANEL_BOUNDS.bottomY,
    SPAWN_WINDOW_POINTED_ARCH_APERTURE_PANEL_BOUNDS.springY,
    SPAWN_WINDOW_POINTED_ARCH_APERTURE_PANEL_BOUNDS.apexY,
  ), 28, "panel");
}

export function createSpawnPointedArchFrameGeometry(): BufferGeometry {
  const outer = createSpawnPointedArchShape(
    SPAWN_WINDOW_POINTED_ARCH_FRAME_OUTER_BOUNDS.widthHalf,
    SPAWN_WINDOW_POINTED_ARCH_FRAME_OUTER_BOUNDS.bottomY,
    SPAWN_WINDOW_POINTED_ARCH_FRAME_OUTER_BOUNDS.springY,
    SPAWN_WINDOW_POINTED_ARCH_FRAME_OUTER_BOUNDS.apexY,
  );
  const inner = createSpawnPointedArchShape(
    SPAWN_WINDOW_POINTED_ARCH_FRAME_APERTURE_BOUNDS.widthHalf,
    SPAWN_WINDOW_POINTED_ARCH_FRAME_APERTURE_BOUNDS.bottomY,
    SPAWN_WINDOW_POINTED_ARCH_FRAME_APERTURE_BOUNDS.springY,
    SPAWN_WINDOW_POINTED_ARCH_FRAME_APERTURE_BOUNDS.apexY,
  );
  outer.holes.push(inner);
  return createArchitecturalArchExtrusion(outer, 28, "frame");
}

export function createHeroPointedArchShape(widthHalf: number, bottomY: number, springY: number, apexY: number): Shape {
  const shape = new Shape();
  shape.moveTo(-widthHalf, bottomY);
  shape.lineTo(widthHalf, bottomY);
  shape.lineTo(widthHalf, springY);
  shape.quadraticCurveTo(widthHalf * 0.34, apexY * 0.98, 0, apexY);
  shape.quadraticCurveTo(-widthHalf * 0.34, apexY * 0.98, -widthHalf, springY);
  shape.lineTo(-widthHalf, bottomY);
  return shape;
}

export function createHeroPointedArchPanelGeometry(): BufferGeometry {
  return createArchitecturalArchExtrusion(createHeroPointedArchShape(
    HERO_POINTED_ARCH_APERTURE_PANEL_BOUNDS.widthHalf,
    HERO_POINTED_ARCH_APERTURE_PANEL_BOUNDS.bottomY,
    HERO_POINTED_ARCH_APERTURE_PANEL_BOUNDS.springY,
    HERO_POINTED_ARCH_APERTURE_PANEL_BOUNDS.apexY,
  ), 28, "panel");
}

export function createHeroPointedArchFrameGeometry(): BufferGeometry {
  const outer = createHeroPointedArchShape(
    HERO_POINTED_ARCH_FRAME_OUTER_BOUNDS.widthHalf,
    HERO_POINTED_ARCH_FRAME_OUTER_BOUNDS.bottomY,
    HERO_POINTED_ARCH_FRAME_OUTER_BOUNDS.springY,
    HERO_POINTED_ARCH_FRAME_OUTER_BOUNDS.apexY,
  );
  const inner = createHeroPointedArchShape(
    HERO_POINTED_ARCH_FRAME_APERTURE_BOUNDS.widthHalf,
    HERO_POINTED_ARCH_FRAME_APERTURE_BOUNDS.bottomY,
    HERO_POINTED_ARCH_FRAME_APERTURE_BOUNDS.springY,
    HERO_POINTED_ARCH_FRAME_APERTURE_BOUNDS.apexY,
  );
  outer.holes.push(inner);
  return createArchitecturalArchExtrusion(outer, 28, "frame");
}

export function createSpawnHeroPointedArchShape(widthHalf: number, bottomY: number, springY: number, apexY: number): Shape {
  const shape = new Shape();
  shape.moveTo(-widthHalf, bottomY);
  shape.lineTo(widthHalf, bottomY);
  shape.lineTo(widthHalf, springY);
  const shoulderLiftY = springY + (apexY - springY) * 0.46;
  shape.bezierCurveTo(widthHalf * 0.9, shoulderLiftY, widthHalf * 0.34, apexY * 0.99, 0, apexY);
  shape.bezierCurveTo(-widthHalf * 0.34, apexY * 0.99, -widthHalf * 0.9, shoulderLiftY, -widthHalf, springY);
  shape.lineTo(-widthHalf, bottomY);
  return shape;
}

export function createSpawnHeroPointedArchPanelGeometry(): BufferGeometry {
  return createArchitecturalArchExtrusion(createSpawnHeroPointedArchShape(
    SPAWN_HERO_POINTED_ARCH_APERTURE_PANEL_BOUNDS.widthHalf,
    SPAWN_HERO_POINTED_ARCH_APERTURE_PANEL_BOUNDS.bottomY,
    SPAWN_HERO_POINTED_ARCH_APERTURE_PANEL_BOUNDS.springY,
    SPAWN_HERO_POINTED_ARCH_APERTURE_PANEL_BOUNDS.apexY,
  ), 32, "panel");
}

export function createSpawnHeroPointedArchFrameGeometry(): BufferGeometry {
  const outer = createSpawnHeroPointedArchShape(
    SPAWN_HERO_POINTED_ARCH_FRAME_OUTER_BOUNDS.widthHalf,
    SPAWN_HERO_POINTED_ARCH_FRAME_OUTER_BOUNDS.bottomY,
    SPAWN_HERO_POINTED_ARCH_FRAME_OUTER_BOUNDS.springY,
    SPAWN_HERO_POINTED_ARCH_FRAME_OUTER_BOUNDS.apexY,
  );
  const inner = createSpawnHeroPointedArchShape(
    SPAWN_HERO_POINTED_ARCH_FRAME_APERTURE_BOUNDS.widthHalf,
    SPAWN_HERO_POINTED_ARCH_FRAME_APERTURE_BOUNDS.bottomY,
    SPAWN_HERO_POINTED_ARCH_FRAME_APERTURE_BOUNDS.springY,
    SPAWN_HERO_POINTED_ARCH_FRAME_APERTURE_BOUNDS.apexY,
  );
  outer.holes.push(inner);
  return createArchitecturalArchExtrusion(outer, 32, "frame");
}

export function createSpawnHeroPedimentGeometry(): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(-0.5, -0.36);
  shape.lineTo(0.5, -0.36);
  shape.lineTo(0.34, -0.14);
  shape.lineTo(0.18, 0.04);
  shape.lineTo(0, 0.5);
  shape.lineTo(-0.18, 0.04);
  shape.lineTo(-0.34, -0.14);
  shape.lineTo(-0.5, -0.36);

  const geometry = new ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
    curveSegments: 10,
  });
  geometry.rotateY(Math.PI * 0.5);
  geometry.translate(-0.5, 0, 0);
  applyProjectedArchUvs(geometry);
  return geometry;
}

export function createSpawnHeroCorbelGeometry(): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(-0.5, 0.5);
  shape.lineTo(0.5, 0.5);
  shape.lineTo(0.4, 0.08);
  shape.lineTo(0.22, -0.22);
  shape.lineTo(0.06, -0.5);
  shape.lineTo(-0.06, -0.5);
  shape.lineTo(-0.22, -0.22);
  shape.lineTo(-0.4, 0.08);
  shape.lineTo(-0.5, 0.5);

  const geometry = new ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
    curveSegments: 4,
  });
  geometry.rotateY(Math.PI * 0.5);
  geometry.translate(-0.5, 0, 0);
  applyProjectedArchUvs(geometry);
  return geometry;
}

function applyProjectedArchUvs(geometry: BufferGeometry): void {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  const position = geometry.getAttribute("position");
  if (!bbox || !position) return;

  const zRange = Math.max(1e-4, bbox.max.z - bbox.min.z);
  const yRange = Math.max(1e-4, bbox.max.y - bbox.min.y);
  const uvValues = new Float32Array(position.count * 2);

  for (let index = 0; index < position.count; index += 1) {
    const u = (position.getZ(index) - bbox.min.z) / zRange;
    const v = (position.getY(index) - bbox.min.y) / yRange;
    uvValues[index * 2] = u;
    uvValues[index * 2 + 1] = v;
  }

  geometry.setAttribute("uv", new Float32BufferAttribute(uvValues, 2));
}

export function loadTemplateTexture(relativeUrl: string, colorSpace: Texture["colorSpace"]): Texture {
  const resolvedUrl = new URL(relativeUrl, window.location.href).toString();
  const cached = templateTextureCache.get(resolvedUrl);
  if (cached) return cached;

  const texture = templateTextureLoader.load(resolvedUrl);
  texture.colorSpace = colorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = TEMPLATE_TEXTURE_ANISOTROPY;
  // TextureLoader marks the texture dirty when image data arrives. Eagerly
  // forcing an upload here races that callback and emits a renderer warning
  // on the first closeup that sees this family.
  templateTextureCache.set(resolvedUrl, texture);
  return texture;
}

type PhysicalMaterialShader = Parameters<NonNullable<MeshPhysicalMaterial["onBeforeCompile"]>>[0];

function applyStainedGlassShaderTweaks(material: MeshPhysicalMaterial, variant: "bright" | "dim" | "hero"): void {
  const isHero = variant === "hero";
  const isBright = variant === "bright" || isHero;
  const contrastBoost = isHero ? 1.34 : (isBright ? 1.18 : 1.08);
  const saturationBoost = isHero ? 1.42 : (isBright ? 1.26 : 1.12);
  const leadLumaStart = isHero ? 0.24 : (isBright ? 0.18 : 0.22);
  const leadLumaEnd = isHero ? 0.42 : (isBright ? 0.36 : 0.42);
  const leadDarken = isHero ? 0.28 : (isBright ? 0.38 : 0.48);

  const previousOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader: PhysicalMaterialShader, renderer): void => {
    previousOnBeforeCompile.call(material, shader, renderer);

    if (!shader.fragmentShader.includes("// stained-glass-color-grade")) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
// stained-glass-color-grade
{
  float stainedGlassLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 stainedGlassGray = vec3(stainedGlassLuma);
  vec3 stainedGlassContrast = clamp((diffuseColor.rgb - 0.5) * ${contrastBoost.toFixed(3)} + 0.5, 0.0, 1.0);
  vec3 stainedGlassBoosted = stainedGlassGray + (stainedGlassContrast - stainedGlassGray) * ${saturationBoost.toFixed(3)};
  float stainedGlassLeadMask = 1.0 - smoothstep(${leadLumaStart.toFixed(3)}, ${leadLumaEnd.toFixed(3)}, stainedGlassLuma);
  diffuseColor.rgb = clamp(
    mix(stainedGlassBoosted, stainedGlassBoosted * ${leadDarken.toFixed(3)}, stainedGlassLeadMask * 0.92),
    0.0,
    1.0
  );
}`,
      );

    }
  };

  const previousProgramCacheKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = (): string => `${previousProgramCacheKey()}|stained-glass:${variant}`;
  material.needsUpdate = true;
}

export function createStainedGlassMaterial(variant: "bright" | "dim" | "hero"): MeshPhysicalMaterial {
  const baseColorSource = loadTemplateTexture(
    `${STAINED_GLASS_TEXTURE_BASE_URL}/Glass_Stained_Panel_001_basecolor.png`,
    SRGBColorSpace,
  );
  const ambientOcclusionSource = loadTemplateTexture(
    `${STAINED_GLASS_TEXTURE_BASE_URL}/Glass_Stained_Panel_001_ambientOcclusion.png`,
    NoColorSpace,
  );
  const heightSource = loadTemplateTexture(
    `${STAINED_GLASS_TEXTURE_BASE_URL}/Glass_Stained_Panel_001_height.png`,
    NoColorSpace,
  );
  const metallicSource = loadTemplateTexture(
    `${STAINED_GLASS_TEXTURE_BASE_URL}/Glass_Stained_Panel_001_metallic.png`,
    NoColorSpace,
  );
  const normalSource = loadTemplateTexture(
    `${STAINED_GLASS_TEXTURE_BASE_URL}/Glass_Stained_Panel_001_normal.png`,
    NoColorSpace,
  );
  const opacitySource = loadTemplateTexture(
    `${STAINED_GLASS_TEXTURE_BASE_URL}/Glass_Stained_Panel_001_opacity.png`,
    NoColorSpace,
  );
  const roughnessSource = loadTemplateTexture(
    `${STAINED_GLASS_TEXTURE_BASE_URL}/Glass_Stained_Panel_001_roughness.png`,
    NoColorSpace,
  );
  const transmissionSource = loadTemplateTexture(
    `${STAINED_GLASS_TEXTURE_BASE_URL}/Glass_Stained_Panel_001_transmissive.png`,
    NoColorSpace,
  );

  const isHero = variant === "hero";
  const isBright = variant === "bright" || isHero;

  const material = new MeshPhysicalMaterial({
    color: isBright ? 0xffffff : 0xc3d0c8,
    roughness: isHero ? 0.24 : (isBright ? 0.3 : 0.42),
    roughnessMap: roughnessSource,
    metalness: isHero ? 0.32 : (isBright ? 0.26 : 0.2),
    metalnessMap: metallicSource,
    map: baseColorSource,
    aoMap: ambientOcclusionSource,
    aoMapIntensity: isHero ? 1.0 : 0.86,
    bumpMap: heightSource,
    bumpScale: isHero ? 0.018 : 0.012,
    normalMap: normalSource,
    normalScale: new Vector2(isHero ? 0.48 : 0.38, isHero ? 0.48 : 0.38),
    alphaMap: opacitySource,
    emissive: 0x000000,
    emissiveMap: null,
    emissiveIntensity: 0,
    transmission: isHero ? 0.18 : (isBright ? 0.12 : 0.06),
    transmissionMap: transmissionSource,
    thickness: isHero ? 0.065 : (isBright ? 0.05 : 0.035),
    ior: 1.46,
    clearcoat: isHero ? 0.52 : 0.36,
    clearcoatRoughness: isHero ? 0.28 : 0.36,
    envMapIntensity: isHero ? 1.08 : 0.92,
    specularIntensity: isHero ? 0.88 : 0.74,
    specularColor: 0xdce8ed,
    transparent: true,
    opacity: isBright ? 0.97 : 0.9,
    alphaTest: 0.035,
    side: DoubleSide,
  });
  material.toneMapped = true;
  material.depthWrite = false;
  material.userData.isWindowStainedGlass = true;
  applyStainedGlassShaderTweaks(material, variant);
  return material;
}
