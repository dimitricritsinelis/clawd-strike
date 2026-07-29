import {
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  DataTexture,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  RGBAFormat,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeProceduralGeometry, tintGeometry } from "./propsCore";

export const FOUNTAIN_REFERENCE_DIAMETER_M = 2.2;
export const FOUNTAIN_VISUAL_HEIGHT_M = 1.32;
const FOUNTAIN_SEGMENT_COUNT = 8;
const FOUNTAIN_JOINT_M = 0.002;
export const FOUNTAIN_STONE_MATERIAL_ID = "ph_stone_trim_white";

/**
 * Single-material water inputs for the compiled fountain batch. The procedural
 * normal stays tileable while the renderer scrolls it deterministically and
 * adds a view-dependent Fresnel response.
 */
export const FOUNTAIN_WATER_MATERIAL_INPUTS = {
  // A shallow desert basin takes almost all of its colour from the stone under
  // it. The previous saturated teal, mirror-smooth and lit by a full-strength
  // sky probe, resolved into one flat cyan lid: the highest-chroma object in a
  // tan scene, with no depth behind it and a drawn line where it met the rim.
  color: 0x767469,
  // The pool and the falling jets share this material, and the jets are thin
  // ribbons. Driving see-through purely through transmission turns them into
  // near-opaque dark rods against the sky, so the alpha blend stays: it is what
  // keeps falling water reading as bright and translucent.
  opacity: 0.34,
  transparent: true,
  transmission: 0.92,
  // Enough roughness that ripples break the reflection into moving highlights
  // instead of returning one uniform sheet of sky.
  roughness: 0.24,
  metalness: 0,
  clearcoat: 0.32,
  clearcoatRoughness: 0.2,
  ior: 1.333,
  reflectivity: 0.55,
  normalScale: 0.75,
  thickness: 0.16,
  attenuationColor: 0x87857a,
  attenuationDistance: 1.25,
  envMapIntensity: 0.22,
  specularIntensity: 0.5,
  specularColor: 0xdfe8e2,
  fresnelStrength: 0.42,
  rippleScrollPerFrame: { x: 0.00045, y: 0.00031 },
  emissiveIntensity: 0,
} as const;

export function createFountainRippleNormalTexture(size = 96): DataTexture {
  const data = new Uint8Array(size * size * 4);
  const sampleHeight = (x: number, y: number): number => {
    const u = x / size;
    const v = y / size;
    const broad = Math.sin((u * 2.1 + v * 0.7) * Math.PI * 2) * 0.42;
    const crossed = Math.sin((u * -0.8 + v * 2.7) * Math.PI * 2 + 0.8) * 0.28;
    const circular = Math.sin(Math.hypot(u - 0.5, v - 0.5) * Math.PI * 18) * 0.12;
    return broad + crossed + circular;
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = sampleHeight((x - 1 + size) % size, y);
      const right = sampleHeight((x + 1) % size, y);
      const down = sampleHeight(x, (y - 1 + size) % size);
      const up = sampleHeight(x, (y + 1) % size);
      const nx = (left - right) * 0.9;
      const ny = 1;
      const nz = (down - up) * 0.9;
      const length = Math.hypot(nx, ny, nz);
      const offset = (y * size + x) * 4;
      data[offset] = Math.round((nx / length * 0.5 + 0.5) * 255);
      data[offset + 1] = Math.round((nz / length * 0.5 + 0.5) * 255);
      data[offset + 2] = Math.round((ny / length * 0.5 + 0.5) * 255);
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.name = "procedural-fountain-ripple-normal";
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(3.4, 3.4);
  texture.needsUpdate = true;
  return texture;
}

const FOUNTAIN_SEGMENT_WEAR = [
  { radialM: 0.001, topM: -0.002, tint: [0.93, 0.91, 0.86] },
  { radialM: -0.003, topM: 0.001, tint: [0.86, 0.84, 0.79] },
  { radialM: 0.002, topM: -0.004, tint: [0.9, 0.88, 0.83] },
  { radialM: -0.001, topM: 0.002, tint: [0.96, 0.94, 0.89] },
  { radialM: 0.003, topM: -0.001, tint: [0.84, 0.83, 0.79] },
  { radialM: -0.002, topM: 0.003, tint: [0.92, 0.9, 0.85] },
  { radialM: 0, topM: -0.003, tint: [0.88, 0.86, 0.81] },
  { radialM: 0.002, topM: 0, tint: [0.94, 0.92, 0.87] },
] as const;

function fountainSegmentCenterAngle(index: number): number {
  return Math.PI * 0.25 + index * Math.PI * 0.25;
}

function toNonIndexedGeometry(geometry: BufferGeometry): BufferGeometry {
  if (!geometry.index) return geometry;
  const converted = geometry.toNonIndexed();
  geometry.dispose();
  return converted;
}

function createLathedProfileGeometry(
  profile: ReadonlyArray<readonly [radiusM: number, heightM: number]>,
  radialSegments = 24,
): BufferGeometry {
  const points = profile.map(([radiusM, heightM]) => new Vector2(radiusM, heightM));
  const geometry = toNonIndexedGeometry(new LatheGeometry(points, radialSegments, 0, Math.PI * 2));
  geometry.computeVertexNormals();
  return geometry;
}

function applyWorldScaledBoxUv(geometry: BufferGeometry, tileSizeM: number): BufferGeometry {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const uv = new Float32Array(positions.count * 2);
  const scale = 1 / Math.max(0.1, tileSizeM);
  for (let triangleStart = 0; triangleStart < positions.count; triangleStart += 3) {
    const meanAbsNormalY = (
      Math.abs(normals.getY(triangleStart))
      + Math.abs(normals.getY(triangleStart + 1))
      + Math.abs(normals.getY(triangleStart + 2))
    ) / 3;
    if (meanAbsNormalY >= 0.72) {
      for (let offset = 0; offset < 3; offset += 1) {
        const index = triangleStart + offset;
        uv[index * 2] = positions.getX(index) * scale;
        uv[index * 2 + 1] = positions.getZ(index) * scale;
      }
      continue;
    }

    const meanAbsNormalX = (
      Math.abs(normals.getX(triangleStart))
      + Math.abs(normals.getX(triangleStart + 1))
      + Math.abs(normals.getX(triangleStart + 2))
    ) / 3;
    const meanAbsNormalZ = (
      Math.abs(normals.getZ(triangleStart))
      + Math.abs(normals.getZ(triangleStart + 1))
      + Math.abs(normals.getZ(triangleStart + 2))
    ) / 3;
    for (let offset = 0; offset < 3; offset += 1) {
      const index = triangleStart + offset;
      // Project each planar masonry face from its dominant horizontal axis.
      // This keeps both triangles of an octagonal face on one continuous UV
      // plane instead of drawing a diagonal cylindrical interpolation seam.
      uv[index * 2] = (meanAbsNormalX >= meanAbsNormalZ
        ? positions.getZ(index)
        : positions.getX(index)) * scale;
      uv[index * 2 + 1] = positions.getY(index) * scale;
    }
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return geometry;
}

function applyRadialFountainUv(geometry: BufferGeometry, tileSizeM: number): BufferGeometry {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const uv = new Float32Array(positions.count * 2);
  const scale = 1 / Math.max(0.1, tileSizeM);
  for (let triangleStart = 0; triangleStart < positions.count; triangleStart += 3) {
    let meanX = 0;
    let meanZ = 0;
    let meanAbsNormalY = 0;
    for (let offset = 0; offset < 3; offset += 1) {
      const index = triangleStart + offset;
      meanX += positions.getX(index) / 3;
      meanZ += positions.getZ(index) / 3;
      meanAbsNormalY += Math.abs(normals.getY(index)) / 3;
    }
    const faceAngle = Math.atan2(meanZ, meanX);
    const tangentX = -Math.sin(faceAngle);
    const tangentZ = Math.cos(faceAngle);
    const meanRadius = Math.max(0.04, Math.hypot(meanX, meanZ));
    for (let offset = 0; offset < 3; offset += 1) {
      const index = triangleStart + offset;
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      if (meanAbsNormalY >= 0.72) {
        let deltaAngle = Math.atan2(z, x) - faceAngle;
        if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
        uv[index * 2] = (faceAngle * meanRadius + deltaAngle * meanRadius) * scale;
        uv[index * 2 + 1] = Math.hypot(x, z) * scale;
      } else {
        // Every upright radial face uses its own counter-clockwise tangent and
        // the shared vertical datum, so octagonal turns cannot rotate or resize
        // the masonry/tile response from one segment to the next.
        uv[index * 2] = (x * tangentX + z * tangentZ) * scale;
        uv[index * 2 + 1] = y * scale;
      }
    }
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return geometry;
}

export function createAnnularWedgeGeometry(
  centerAngle: number,
  halfAngle: number,
  outerRadius: number,
  innerRadius: number,
  bottomY: number,
  height: number,
  bevelSize = 0,
  bevelThickness = 0,
  bevelSegments = 1,
): BufferGeometry {
  const start = centerAngle - halfAngle;
  const end = centerAngle + halfAngle;
  const shape = new Shape();
  shape.moveTo(Math.cos(start) * outerRadius, -Math.sin(start) * outerRadius);
  shape.lineTo(Math.cos(end) * outerRadius, -Math.sin(end) * outerRadius);
  shape.lineTo(Math.cos(end) * innerRadius, -Math.sin(end) * innerRadius);
  shape.lineTo(Math.cos(start) * innerRadius, -Math.sin(start) * innerRadius);
  shape.closePath();

  const indexed = new ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: bevelSize > 0,
    bevelSegments,
    bevelSize,
    bevelThickness: Math.min(bevelThickness, height * 0.22),
    curveSegments: 1,
    steps: 1,
  });
  indexed.rotateX(-Math.PI * 0.5);
  indexed.translate(0, bottomY, 0);
  const geometry = toNonIndexedGeometry(indexed);
  geometry.computeVertexNormals();
  return geometry;
}

export function createBatteredFountainWallSegment(index: number): BufferGeometry {
  const wear = FOUNTAIN_SEGMENT_WEAR[index]!;
  const center = fountainSegmentCenterAngle(index);
  const halfAngle = Math.PI * 0.125 - FOUNTAIN_JOINT_M / (2 * 1.02);
  const start = center - halfAngle;
  const end = center + halfAngle;
  const bottomY = 0.055;
  const topY = 0.335 + wear.topM;
  const outerBottom = 1.025 + wear.radialM;
  const outerTop = 0.968 + wear.radialM;
  const innerBottom = 0.735;
  const innerTop = 0.715;
  const point = (radius: number, angle: number, y: number) => [
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius,
  ] as const;
  const vertices = [
    point(outerBottom, start, bottomY),
    point(outerBottom, end, bottomY),
    point(innerBottom, end, bottomY),
    point(innerBottom, start, bottomY),
    point(outerTop, start, topY),
    point(outerTop, end, topY),
    point(innerTop, end, topY),
    point(innerTop, start, topY),
  ];
  const faceIndices = [
    0, 3, 2, 0, 2, 1,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7,
  ];
  const expandedPositions: number[] = [];
  const expandedNormals: number[] = [];
  for (let faceStart = 0; faceStart < faceIndices.length; faceStart += 6) {
    const face = faceIndices.slice(faceStart, faceStart + 6);
    const first = vertices[face[0]!]!;
    const second = vertices[face[1]!]!;
    const third = vertices[face[2]!]!;
    const normal = new Vector3(
      second[0] - first[0], second[1] - first[1], second[2] - first[2],
    ).cross(new Vector3(
      third[0] - first[0], third[1] - first[1], third[2] - first[2],
    )).normalize();
    for (const vertexIndex of face) {
      expandedPositions.push(...vertices[vertexIndex]!);
      expandedNormals.push(normal.x, normal.y, normal.z);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(expandedPositions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(expandedNormals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(new Float32Array(faceIndices.length * 2), 2));
  return tintGeometry(geometry, wear.tint);
}

export function createModularFountainStoneGeometry(): BufferGeometry {
  // One coherent Levantine/Mediterranean lathe concept. The cross-sections
  // carry the carved ogee, bead and cavetto reads in silhouette; this is a
  // genuine swept rebuild rather than another stack of primitive extrusions.
  const lowerBasin = createLathedProfileGeometry([
    [0.79, 0.01], [1.06, 0.01], [1.1, 0.035], [1.085, 0.07],
    [1.035, 0.105], [1.01, 0.17], [0.995, 0.27], [1.015, 0.315],
    [1.075, 0.345], [1.1, 0.375], [1.075, 0.405], [1.015, 0.425],
    [0.93, 0.414], [0.82, 0.382], [0.735, 0.342], [0.67, 0.29],
    [0.64, 0.22], [0.67, 0.12], [0.79, 0.01],
  ], 24);
  const pedestal = createLathedProfileGeometry([
    [0, 0.315], [0.43, 0.315], [0.49, 0.345], [0.5, 0.385],
    [0.455, 0.425], [0.35, 0.445], [0.3, 0.505], [0.255, 0.59],
    [0.245, 0.7], [0.275, 0.79], [0.34, 0.835], [0.385, 0.86],
    [0.35, 0.9], [0.18, 0.925], [0, 0.925], [0, 0.315],
  ], 24);
  const upperBasin = createLathedProfileGeometry([
    [0.15, 0.86], [0.4, 0.86], [0.47, 0.88], [0.515, 0.92],
    [0.525, 0.96], [0.5, 0.995], [0.445, 1.02], [0.37, 1.012],
    [0.31, 0.985], [0.275, 0.94], [0.25, 0.895], [0.15, 0.86],
  ], 24);
  const crown = createLathedProfileGeometry([
    [0, 0.96], [0.175, 0.96], [0.18, 1.015], [0.145, 1.055],
    [0.12, 1.17], [0.15, 1.205], [0.13, 1.245], [0.082, 1.285],
    [0.035, 1.32], [0, 1.32], [0, 0.96],
  ], 24);
  const parts = [
    tintGeometry(lowerBasin, [0.91, 0.89, 0.83]),
    tintGeometry(pedestal, [0.86, 0.84, 0.78]),
    tintGeometry(upperBasin, [0.94, 0.92, 0.86]),
    tintGeometry(crown, [0.88, 0.86, 0.8]),
  ];

  const geometry = applyRadialFountainUv(mergeProceduralGeometry(parts), 2);
  const positions = geometry.getAttribute("position");
  const colors = geometry.getAttribute("color");
  for (let index = 0; index < positions.count; index += 1) {
    const y = positions.getY(index);
    const radius = Math.hypot(positions.getX(index), positions.getZ(index));
    // Quiet, continuous base wear gives the basin contact and age without
    // repeating a rectangular masonry texture on every radial wedge.
    const angle = Math.atan2(positions.getZ(index), positions.getX(index));
    const sectorWear = 0.965 + Math.sin(angle * 8 + 0.43) * 0.018
      + Math.sin(angle * 3 - y * 11) * 0.012;
    const baseWear = y < 0.13 ? 0.88 : y < 0.25 ? 0.95 : 1;
    const exposedWear = radius > 0.94 ? 0.965 : 1;
    const wetInnerRim = (radius < 0.75 && y > 0.28) || (radius < 0.38 && y > 0.9)
      ? 0.7
      : 1;
    colors.setXYZ(
      index,
      colors.getX(index) * baseWear * exposedWear * wetInnerRim * sectorWear,
      colors.getY(index) * baseWear * exposedWear * wetInnerRim * sectorWear,
      colors.getZ(index) * baseWear * exposedWear * wetInnerRim * sectorWear,
    );
  }
  colors.needsUpdate = true;
  geometry.userData.fountainConstruction = {
    wallSegments: FOUNTAIN_SEGMENT_COUNT,
    copingSegments: FOUNTAIN_SEGMENT_COUNT,
    lowerCourseSegments: FOUNTAIN_SEGMENT_COUNT,
    shoulderSegments: FOUNTAIN_SEGMENT_COUNT,
    jointWidthM: FOUNTAIN_JOINT_M,
    finishedJointWidthM: FOUNTAIN_JOINT_M,
    deterministicWearVariants: FOUNTAIN_SEGMENT_WEAR.length,
    reliefPanels: 0,
    reliefElements: 0,
    appliedPlaques: 0,
    drainageCurbs: 0,
    centralPedestals: 1,
    upperBasinSegments: FOUNTAIN_SEGMENT_COUNT,
    materialId: FOUNTAIN_STONE_MATERIAL_ID,
    uvProjection: "radial-face-local-2m",
    batteredWallNormals: "flat-face-shared",
    geometryConcept: "four-part-curved-lathe-profile",
    radialSegments: 24,
    carvedProfile: "ogee-bead-cavetto",
  };
  return geometry;
}

export function createModularFountainTileGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  // Glazed tile, but pitched to sit inside the map's tan/ochre band. Pushed
  // toward blue it becomes the highest-chroma thing in the court the moment the
  // water above it is transparent enough to show it.
  const glazePalette = [
    [0.14, 0.24, 0.23],
    [0.21, 0.33, 0.29],
    [0.45, 0.41, 0.29],
    [0.16, 0.28, 0.26],
  ] as const;
  const basinFloor = toNonIndexedGeometry(new CircleGeometry(0.61, 32));
  basinFloor.rotateX(-Math.PI * 0.5);
  basinFloor.translate(0, 0.272, 0);
  const floorPositions = basinFloor.getAttribute("position");
  const floorColors = new Float32Array(floorPositions.count * 3);
  for (let index = 0; index < floorPositions.count; index += 1) {
    const angle = Math.atan2(floorPositions.getZ(index), floorPositions.getX(index));
    const paletteIndex = ((Math.floor((angle + Math.PI) / (Math.PI / 4)) % 4) + 4) % 4;
    const tint = glazePalette[paletteIndex]!;
    floorColors[index * 3] = tint[0];
    floorColors[index * 3 + 1] = tint[1];
    floorColors[index * 3 + 2] = tint[2];
  }
  basinFloor.setAttribute("color", new Float32BufferAttribute(floorColors, 3));
  parts.push(basinFloor);
  for (let index = 0; index < FOUNTAIN_SEGMENT_COUNT; index += 1) {
    const center = fountainSegmentCenterAngle(index);
    const halfAngle = Math.PI * 0.125 - 0.012;
    // Tile stays inside the two basins. Exterior cyan plaques previously sat
    // proud of the carved wall and read as floating plastic at SHOT_16.
    parts.push(tintGeometry(createAnnularWedgeGeometry(
      center,
      halfAngle,
      0.755,
      0.615,
      0.269,
      0.035,
      0.002,
      0.001,
      1,
    ), glazePalette[(index + 1) % glazePalette.length]!));
    parts.push(tintGeometry(createAnnularWedgeGeometry(
      center,
      halfAngle,
      0.375,
      0.245,
      0.94,
      0.035,
      0.002,
      0.001,
      1,
    ), glazePalette[(index + 2) % glazePalette.length]!));
  }

  const geometry = applyRadialFountainUv(mergeProceduralGeometry(parts), 0.32);
  const positions = geometry.getAttribute("position");
  const colors = geometry.getAttribute("color");
  for (let index = 0; index < positions.count; index += 1) {
    const angle = Math.atan2(positions.getZ(index), positions.getX(index));
    const glazeVariation = 0.94 + ((Math.floor((angle + Math.PI) / (Math.PI / 4)) + 8) % 3) * 0.025;
    colors.setXYZ(
      index,
      colors.getX(index) * glazeVariation,
      colors.getY(index) * glazeVariation,
      colors.getZ(index) * glazeVariation,
    );
  }
  colors.needsUpdate = true;
  geometry.userData.fountainTilework = {
    tileSegments: 0,
    groutJoints: FOUNTAIN_SEGMENT_COUNT * 2,
    jointWidthM: 0.009,
    basinLiningSegments: FOUNTAIN_SEGMENT_COUNT,
    basinFloorPanels: 1,
    upperBasinLiningSegments: FOUNTAIN_SEGMENT_COUNT,
    uvProjection: "radial-face-local-0.32m",
    surfaceFinish: "mottled-glaze",
    geometryConcept: "curved-lathe-zellige-inlay",
    orderedPaletteSequence: "eight-segment-blue-green-ochre",
    exteriorInlays: 0,
  };
  return geometry;
}

export function createFountainDetailGeometry(): BufferGeometry {
  const dampContactParts: BufferGeometry[] = [
    tintGeometry(createLathedProfileGeometry([
      [0.635, 0.276], [0.665, 0.286], [0.71, 0.323], [0.744, 0.353],
    ], 24), [0.46, 0.45, 0.41]),
    tintGeometry(createLathedProfileGeometry([
      [0.25, 0.945], [0.3, 0.961], [0.345, 0.992], [0.372, 1.005],
    ], 24), [0.46, 0.45, 0.41]),
  ];
  for (let index = 0; index < FOUNTAIN_SEGMENT_COUNT; index += 1) {
    const center = fountainSegmentCenterAngle(index);
    dampContactParts.push(tintGeometry(createAnnularWedgeGeometry(
      center,
      Math.PI * 0.125 - 0.001,
      1.095,
      1.05,
      0.002,
      0.004,
      0,
      0,
      1,
    ), [0.46, 0.45, 0.41]));
  }
  const geometry = mergeProceduralGeometry(dampContactParts);
  geometry.userData.fountainDetails = {
    bronzeSpouts: 0,
    bronzeRosettes: 0,
    wetStreaks: 0,
    drainageNotches: 0,
    drainageChannels: 0,
    drainBars: 0,
    dampContactSegments: FOUNTAIN_SEGMENT_COUNT,
  };
  return geometry;
}

export function createFountainWaterGeometry(): BufferGeometry {
  const surface = new CircleGeometry(0.625, 32);
  surface.rotateX(-Math.PI * 0.5);
  surface.translate(0, 0.342, 0);
  const upperSurface = new CircleGeometry(0.305, 24);
  upperSurface.rotateX(-Math.PI * 0.5);
  upperSurface.translate(0, 0.99, 0);
  const parts: BufferGeometry[] = [toNonIndexedGeometry(surface), toNonIndexedGeometry(upperSurface)];
  for (const [x, z] of [[0.43, 0], [-0.43, 0], [0, 0.43], [0, -0.43]] as const) {
    const radialLength = Math.hypot(x, z);
    const radialX = x / radialLength;
    const radialZ = z / radialLength;
    const contactX = x + radialX * 0.062;
    const contactZ = z + radialZ * 0.062;
    const jetPath = new CatmullRomCurve3([
      new Vector3(x, 0.705, z),
      new Vector3(x + radialX * 0.016, 0.61, z + radialZ * 0.016),
      new Vector3(x + radialX * 0.045, 0.47, z + radialZ * 0.045),
      new Vector3(contactX, 0.349, contactZ),
    ]);
    parts.push(toNonIndexedGeometry(new TubeGeometry(jetPath, 12, 0.009, 5, false)));
    const ripple = new TorusGeometry(0.066, 0.006, 4, 18);
    ripple.rotateX(Math.PI * 0.5);
    ripple.translate(contactX, 0.345, contactZ);
    parts.push(toNonIndexedGeometry(ripple));
    const contact = new SphereGeometry(0.024, 7, 4);
    contact.scale(1.45, 0.2, 1.45);
    contact.translate(contactX, 0.346, contactZ);
    parts.push(toNonIndexedGeometry(contact));
  }
  const geometry = mergeProceduralGeometry(parts);
  geometry.userData.fountainWater = {
    shallowSurfaces: 2,
    trickles: 4,
    drainSplashes: 4,
    spoutContactRipples: 4,
    surfaceElevationM: 0.342,
  };
  return geometry;
}

export function createFountainBronzeGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const direction of [-1, 1] as const) {
    const xRosette = new TorusGeometry(0.075, 0.018, 6, 12);
    xRosette.rotateY(Math.PI * 0.5);
    xRosette.translate(direction * 0.205, 0.78, 0);
    parts.push(xRosette);
    const xSpout = new CylinderGeometry(0.032, 0.024, 0.23, 10, 1, false);
    xSpout.rotateZ(Math.PI * 0.5);
    xSpout.translate(direction * 0.315, 0.78, 0);
    parts.push(xSpout);
    const xLip = new CylinderGeometry(0.028, 0.022, 0.12, 10, 1, false);
    xLip.translate(direction * 0.43, 0.72, 0);
    parts.push(xLip);
    const xElbow = new SphereGeometry(0.042, 10, 6);
    xElbow.scale(1, 0.82, 1);
    xElbow.translate(direction * 0.43, 0.78, 0);
    parts.push(xElbow);
    const zRosette = new TorusGeometry(0.075, 0.018, 6, 12);
    zRosette.translate(0, 0.78, direction * 0.205);
    parts.push(zRosette);
    const zSpout = new CylinderGeometry(0.032, 0.024, 0.23, 10, 1, false);
    zSpout.rotateX(Math.PI * 0.5);
    zSpout.translate(0, 0.78, direction * 0.315);
    parts.push(zSpout);
    const zLip = new CylinderGeometry(0.028, 0.022, 0.12, 10, 1, false);
    zLip.translate(0, 0.72, direction * 0.43);
    parts.push(zLip);
    const zElbow = new SphereGeometry(0.042, 10, 6);
    zElbow.scale(1, 0.82, 1);
    zElbow.translate(0, 0.78, direction * 0.43);
    parts.push(zElbow);
  }
  const finial = new SphereGeometry(0.065, 10, 6);
  finial.translate(0, 1.25, 0);
  parts.push(finial);
  const geometry = mergeProceduralGeometry(parts);
  geometry.userData.fountainBronze = {
    rosettes: 4,
    horizontalNecks: 4,
    downturnedNozzles: 4,
    elbows: 4,
  };
  return geometry;
}

/**
 * Widen the collar's vertex colour to RGBA and fade the alpha to nothing before
 * the mesh's own outer edge.
 *
 * A wetted zone that ends where its geometry ends draws a hard octagonal
 * outline on the floor, and a straight high-frequency edge does not soften with
 * distance the way an over-broad tonal wash does — it stays legible at the
 * review camera and reads as a decal laid under the fountain. Fading inside the
 * boundary means the silhouette never coincides with a polygon edge, so the
 * collar has no shape of its own.
 */
function applyRadialCollarFade(geometry: BufferGeometry): BufferGeometry {
  const positions = geometry.getAttribute("position");
  const colors = geometry.getAttribute("color");
  const FADE_START_M = 1.2;
  const FADE_END_M = 1.34;
  const rgba = new Float32Array(positions.count * 4);
  for (let index = 0; index < positions.count; index += 1) {
    const radiusM = Math.hypot(positions.getX(index), positions.getZ(index));
    const t = clamp01((radiusM - FADE_START_M) / (FADE_END_M - FADE_START_M));
    const smooth = t * t * (3 - 2 * t);
    rgba[index * 4] = colors ? colors.getX(index) : 1;
    rgba[index * 4 + 1] = colors ? colors.getY(index) : 1;
    rgba[index * 4 + 2] = colors ? colors.getZ(index) : 1;
    rgba[index * 4 + 3] = 1 - smooth;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(rgba, 4));
  return geometry;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function createFountainCourtAccentGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  // These multiply the batch colour and its albedo boost, so anything much
  // below 1 compounds into a ring markedly darker than the court it belongs to.
  // Held near neutral, the apron stays the court's paving; the damp reading
  // comes from the modest drop below, not from tinting it brown.
  const apronTints = [
    [0.9, 0.86, 0.8],
    [0.85, 0.81, 0.75],
    [0.94, 0.9, 0.84],
    [0.82, 0.78, 0.72],
  ] as const;
  // Kept nearly flush with the court. At the previous 1.8 cm and 2.6 cm the
  // ring stood proud enough to draw its own hard silhouette and cast a shadow
  // line onto the pavers, which is what made it read as a plate the fountain
  // was set down on rather than as the floor it is wetting.
  //
  // Three bands, darkest against the basin and falling off fast. Splash wets
  // the stone it lands on and little else, so an evenly tinted ring reads as a
  // smudge under the fountain; the gradient is what makes it read as water.
  // The previous ordering had its darkest course on the OUTSIDE, which is the
  // opposite of how a wetted collar actually behaves.
  const dampBands = [
    { outerM: 1.17, innerM: 1.075, riseM: 0.0025, tint: [0.63, 0.6, 0.55] },
    { outerM: 1.28, innerM: 1.17, riseM: 0.0022, tint: [0.79, 0.76, 0.71] },
    // Outer edge held at 1.36: the instanced footprint scales these radii by
    // 3 / 2.2, and the course is required to stay a tight basin-seated octagon
    // rather than spreading into the court.
    { outerM: 1.36, innerM: 1.28, riseM: 0.002, tint: [0.93, 0.91, 0.87] },
  ] as const;
  for (let index = 0; index < FOUNTAIN_SEGMENT_COUNT; index += 1) {
    const center = fountainSegmentCenterAngle(index);
    for (const [bandIndex, band] of dampBands.entries()) {
      // Per-segment jitter on the innermost band only, so the wet edge is
      // irregular the way splash is, while the outer falloff stays quiet.
      const segmentTint = bandIndex === 0
        ? apronTints[index % apronTints.length]!
        : [1, 1, 1] as const;
      parts.push(tintGeometry(createAnnularWedgeGeometry(
        center,
        Math.PI * 0.125 - 0.012,
        band.outerM,
        band.innerM,
        0.001,
        band.riseM,
        0.003,
        0.002,
        1,
      ), [
        band.tint[0]! * segmentTint[0]!,
        band.tint[1]! * segmentTint[1]!,
        band.tint[2]! * segmentTint[2]!,
      ]));
    }
  }
  for (let index = 0; index < 4; index += 1) {
    const stain = new CircleGeometry(0.11 + index * 0.008, 12);
    stain.rotateX(-Math.PI * 0.5);
    stain.scale(1.35, 1, 0.58);
    const stainAngle = index * Math.PI * 0.5 + Math.PI * 0.22;
    stain.translate(Math.cos(stainAngle) * 1.24, 0.003, Math.sin(stainAngle) * 1.24);
    // Damp patches, not soot: a wet slab loses value, it does not go black.
    parts.push(tintGeometry(toNonIndexedGeometry(stain), [0.62, 0.58, 0.52]));
  }
  const geometry = applyRadialCollarFade(
    applyWorldScaledBoxUv(mergeProceduralGeometry(parts), 1.25),
  );
  geometry.userData.fountainCourtAccent = {
    apronSegments: FOUNTAIN_SEGMENT_COUNT,
    borderCourseSegments: FOUNTAIN_SEGMENT_COUNT,
    radialDatumKeys: 0,
    zelligeKeys: 0,
    dampStains: 4,
    jointWidthM: 0.024,
    geometryConcept: "jointed-octagonal-court-course",
  };
  return geometry;
}

export function createCourtPlanterStoneGeometry(): BufferGeometry {
  const foot = new CylinderGeometry(0.48, 0.52, 0.12, 12, 1, false);
  foot.translate(0, -0.44, 0);
  const body = new CylinderGeometry(0.43, 0.48, 0.65, 12, 2, true);
  body.translate(0, -0.055, 0);
  const rim = new TorusGeometry(0.43, 0.07, 8, 16);
  rim.rotateX(Math.PI * 0.5);
  rim.translate(0, 0.3, 0);
  return mergeProceduralGeometry([foot, body, rim]);
}

export function createCourtPlanterSoilGeometry(): BufferGeometry {
  const soil = new CylinderGeometry(0.37, 0.37, 0.055, 16, 1, false);
  soil.translate(0, 0.285, 0);
  return soil;
}

export function createCourtPlanterFoliageGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let index = 0; index < 7; index += 1) {
    const angle = index * Math.PI * 2 / 7;
    const leaf = new SphereGeometry(0.12, 8, 5);
    leaf.scale(0.6, 1.4, 0.36);
    leaf.rotateZ(Math.cos(angle) * 0.62);
    leaf.rotateX(Math.sin(angle) * 0.62);
    leaf.translate(Math.cos(angle) * 0.14, 0.34 + (index % 2) * 0.05, Math.sin(angle) * 0.14);
    parts.push(leaf);
  }
  return mergeProceduralGeometry(parts);
}
