import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from "three";
import { angledBoxPart, boxPart, mergeProceduralGeometry, tintGeometry } from "./propsCore";

function coverTarpSurfaceY(u: number, v: number): number {
  const x = u - 0.5;
  const centerSag = (1 - Math.min(1, Math.abs(x) * 2)) * 0.035;
  const ripple = Math.sin(u * Math.PI * 4 + v * 0.8) * 0.026;
  const frontDrape = v > 0.9
    ? ((v - 0.9) / 0.1) * (0.3 + Math.sin(u * Math.PI * 3) * 0.025)
    : 0;
  const leftDrape = u < 0.07
    ? ((0.07 - u) / 0.07) * (0.12 + Math.sin(v * Math.PI * 2) * 0.015)
    : 0;
  const rightDrape = u > 0.93
    ? ((u - 0.93) / 0.07) * (0.075 + Math.cos(v * Math.PI * 2) * 0.008)
    : 0;
  const backDrape = v < 0.06 ? ((0.06 - v) / 0.06) * 0.12 : 0;
  const diagonalPull = (u - 0.5) * (v - 0.35) * 0.025;
  return 0.18 - centerSag + ripple - frontDrape - leftDrape - rightDrape - backDrape + diagonalPull;
}

function coverTarpSurfaceX(u: number): number {
  if (u < 0.07) return -0.43 - ((0.07 - u) / 0.07) * 0.035;
  if (u > 0.93) return 0.43 + ((u - 0.93) / 0.07) * 0.035;
  return u - 0.5;
}

function coverTarpSurfaceZ(v: number): number {
  if (v <= 0.9) return v - 0.5;
  return 0.4 + ((v - 0.9) / 0.1) * 0.035;
}

export function createCoverTarpGeometry(): BufferGeometry {
  const columns = 10;
  const rows = 7;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    const z = coverTarpSurfaceZ(v);
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const x = coverTarpSurfaceX(u);
      positions.push(x, coverTarpSurfaceY(u, v), z);
      uvs.push(u, v);
    }
  }
  const stride = columns + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * stride + column;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const hemParts: BufferGeometry[] = [geometry];
  for (let column = 0; column < columns; column += 1) {
    const u0 = column / columns;
    const u1 = (column + 1) / columns;
    const x0 = coverTarpSurfaceX(u0);
    const x1 = coverTarpSurfaceX(u1);
    const y0 = coverTarpSurfaceY(u0, 1);
    const y1 = coverTarpSurfaceY(u1, 1);
    const length = Math.hypot(x1 - x0, y1 - y0);
    const segment = new BoxGeometry(length + 0.008, 0.035, 0.045);
    segment.rotateZ(Math.atan2(y1 - y0, x1 - x0));
    segment.translate((x0 + x1) * 0.5, (y0 + y1) * 0.5, coverTarpSurfaceZ(1));
    hemParts.push(segment);
  }
  return mergeProceduralGeometry(hemParts);
}

export function createCoverCrateGeometry(variant: 0 | 1 | 2): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const postTint: [number, number, number] = variant === 1
    ? [0.48, 0.63, 0.58]
    : variant === 2
      ? [0.28, 0.23, 0.18]
      : [0.56, 0.47, 0.38];
  const plankTints: readonly [number, number, number][] = variant === 1
    ? [[0.56, 0.72, 0.65], [0.47, 0.64, 0.58], [0.62, 0.75, 0.66]]
    : [[0.72, 0.59, 0.45], [0.62, 0.5, 0.38], [0.75, 0.64, 0.5]];

  for (const x of [-0.44, 0.44]) {
    for (const z of [-0.44, 0.44]) {
      parts.push(tintGeometry(boxPart(0.11, 0.94, 0.11, x, 0, z), postTint));
    }
  }
  for (const x of [-0.3, -0.1, 0.1, 0.3]) {
    parts.push(tintGeometry(boxPart(0.19, 0.065, 0.82, x, 0.47, 0), plankTints[(Math.round((x + 0.3) * 10)) % 3]!));
    parts.push(tintGeometry(boxPart(0.19, 0.055, 0.82, x, -0.47, 0), plankTints[(Math.round((x + 0.3) * 10) + 1) % 3]!));
  }

  if (variant === 1) {
    for (const z of [-0.475, 0.475]) {
      for (const [index, x] of [-0.31, -0.105, 0.105, 0.31].entries()) {
        parts.push(tintGeometry(boxPart(0.19, 0.76, 0.055, x, 0, z), plankTints[index % 3]!));
      }
      parts.push(tintGeometry(angledBoxPart(0.055, 0.93, 0.065, 0, 0, z * 1.01, z > 0 ? -0.62 : 0.62), postTint));
    }
    for (const x of [-0.475, 0.475]) {
      for (const [index, z] of [-0.3, -0.1, 0.1, 0.3].entries()) {
        parts.push(tintGeometry(boxPart(0.055, 0.76, 0.18, x, 0, z), plankTints[index % 3]!));
      }
    }
  } else {
    const rowCount = variant === 0 ? 4 : 3;
    for (const z of [-0.475, 0.475]) {
      for (let row = 0; row < rowCount; row += 1) {
        const y = -0.32 + row * (0.64 / Math.max(1, rowCount - 1));
        parts.push(tintGeometry(boxPart(0.78, variant === 0 ? 0.17 : 0.23, 0.055, 0, y, z), plankTints[row % 3]!));
      }
      if (variant === 2) {
        parts.push(tintGeometry(angledBoxPart(0.085, 0.92, 0.07, 0, 0, z * 1.01, z > 0 ? 0.6 : -0.6), postTint));
        parts.push(tintGeometry(angledBoxPart(0.085, 0.92, 0.07, 0, 0, z * 1.012, z > 0 ? -0.6 : 0.6), postTint));
      }
    }
    for (const x of [-0.475, 0.475]) {
      for (const [index, y] of [-0.28, 0, 0.28].entries()) {
        parts.push(tintGeometry(boxPart(0.055, 0.2, 0.76, x, y, 0), plankTints[index % 3]!));
      }
      if (variant === 2) {
        for (const direction of [-1, 1] as const) {
          const sideBrace = new BoxGeometry(0.07, 0.92, 0.085);
          sideBrace.rotateX(direction * (x > 0 ? 0.62 : -0.62));
          sideBrace.translate(x * 1.01, 0, 0);
          parts.push(tintGeometry(sideBrace, postTint));
        }
      }
    }
  }
  const geometry = mergeProceduralGeometry(parts);
  geometry.computeVertexNormals();
  return geometry;
}
