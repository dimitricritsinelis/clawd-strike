import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { boxPart, mergeProceduralGeometry } from "./propsCore";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function detailBox(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  rotationZ = 0,
): BufferGeometry {
  const geometry = new BoxGeometry(width, height, depth, 1, 1, 1);
  if (rotationZ !== 0) geometry.rotateZ(rotationZ);
  geometry.translate(x, y, z);
  return geometry;
}

function normalizeGeometry(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  geometry.scale(1 / size.x, 1 / size.y, 1 / size.z);
  geometry.translate(-center.x / size.x, -center.y / size.y, -center.z / size.z);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export type CrateVariant = "horizontal-slat" | "vertical-slat" | "diagonal-braced";

export function createCrateGeometry(variant: CrateVariant = "horizontal-slat"): BufferGeometry {
  const parts: BufferGeometry[] = [boxPart(0.84, 0.84, 0.84, 0, 0, 0)];
  const face = 0.43;

  // The solid carcass preserves the collision-matched readable volume. Shallow
  // rails and slats describe joinery without the dense self-shadow of open cages.
  // These four rails intentionally retain the legacy default bounds and pivot.
  parts.push(boxPart(0.96, 0.08, 0.08, 0, -0.42, face));
  parts.push(boxPart(0.96, 0.08, 0.08, 0, 0.42, face));
  parts.push(boxPart(0.08, 0.96, 0.08, -face, 0, face));
  parts.push(boxPart(0.08, 0.96, 0.08, face, 0, face));

  if (variant === "vertical-slat") {
    for (const x of [-0.27, -0.09, 0.09, 0.27]) {
      parts.push(boxPart(0.045, 0.68, 0.018, x, 0, 0.451));
    }
  } else if (variant === "horizontal-slat") {
    for (const y of [-0.27, -0.09, 0.09, 0.27]) {
      parts.push(boxPart(0.68, 0.045, 0.018, 0, y, 0.451));
    }
  }

  if (variant === "diagonal-braced") {
    const braceLength = 0.84;
    parts.push(detailBox(0.065, braceLength, 0.025, 0, 0, 0.455, Math.PI * 0.25));
    parts.push(detailBox(0.065, braceLength, 0.025, 0, 0, 0.455, -Math.PI * 0.25));
  }
  const geometry = mergeProceduralGeometry(parts);
  geometry.computeVertexNormals();
  return geometry;
}

export function createBarrelGeometry(): BufferGeometry {
  const body = new CylinderGeometry(0.46, 0.46, 0.9, 8);
  const lowerBand = new CylinderGeometry(0.5, 0.5, 0.08, 8);
  lowerBand.translate(0, -0.34, 0);
  const upperBand = new CylinderGeometry(0.5, 0.5, 0.08, 8);
  upperBand.translate(0, 0.34, 0);
  return mergeProceduralGeometry([body, lowerBand, upperBand]);
}

export type SackVariant = "tied" | "folded-neck" | "settled";

export function createSackGeometry(variant: SackVariant = "tied"): BufferGeometry {
  const bodyScaleY = variant === "settled" ? 0.61 : 0.7;
  const shoulderY = variant === "settled" ? 0.16 : 0.22;
  const body = new SphereGeometry(0.5, 8, 6);
  body.scale(variant === "settled" ? 0.98 : 0.88, bodyScaleY, variant === "settled" ? 0.82 : 0.72);
  body.translate(variant === "folded-neck" ? -0.035 : 0, variant === "settled" ? -0.16 : -0.1, 0);
  const shoulder = new SphereGeometry(0.42, 8, 6);
  shoulder.scale(0.86, 0.4, 0.76);
  shoulder.translate(variant === "folded-neck" ? -0.025 : 0, shoulderY, 0);
  const neck = new CylinderGeometry(0.085, 0.14, 0.12, 6);
  if (variant === "folded-neck") neck.rotateZ(-0.2);
  neck.translate(variant === "folded-neck" ? -0.045 : 0, variant === "settled" ? 0.32 : 0.4, 0);
  const tie = new TorusGeometry(0.105, 0.022, 4, 6);
  tie.rotateX(Math.PI * 0.5);
  tie.translate(variant === "folded-neck" ? -0.025 : 0, variant === "settled" ? 0.275 : 0.345, 0);
  return normalizeGeometry(mergeProceduralGeometry([body, shoulder, neck, tie]));
}

export type SpiceBasketVariant = "low-round" | "deep-tapered" | "ribbed";

export function createShallowSpiceBasketGeometry(
  variant: SpiceBasketVariant = "low-round",
): BufferGeometry {
  const depthScale = variant === "deep-tapered" ? 1.75 : 1.55;
  const wall = new CylinderGeometry(0.46, 0.38, 0.3, 8, 1, true);
  const base = new CylinderGeometry(0.38, 0.38, 0.045, 8);
  base.translate(0, -0.14, 0);
  const rim = new TorusGeometry(0.46, 0.045, 4, 8);
  rim.rotateX(Math.PI * 0.5);
  rim.translate(0, 0.15, 0);
  const parts: BufferGeometry[] = [wall, base, rim];
  for (const y of [-0.06, 0.06]) {
    const weaveBand = new CylinderGeometry(0.42 + y * 0.08, 0.42 + y * 0.08, 0.018, 8, 1, true);
    weaveBand.translate(0, y, 0);
    parts.push(weaveBand);
  }
  const ribCount = variant === "ribbed" ? 8 : 6;
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    const rib = new BoxGeometry(0.025, 0.27, 0.035);
    rib.rotateY(-angle);
    rib.translate(Math.cos(angle) * 0.415, -0.005, Math.sin(angle) * 0.415);
    parts.push(rib);
  }
  const geometry = mergeProceduralGeometry(parts);
  geometry.scale(0.98, depthScale, 0.98);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export type SpiceMoundVariant = "rounded" | "conical" | "hand-scooped";

export function createSpiceMoundGeometry(variant: SpiceMoundVariant = "rounded"): BufferGeometry {
  const segments = 14;
  const radialRings = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= radialRings; ring += 1) {
    const t = ring / radialRings;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2;
      const irregularity = 1
        + Math.sin(segment * 2.7 + ring * 1.3) * 0.055
        + Math.cos(segment * 1.4 - ring * 0.8) * 0.025;
      const radius = t * 0.5 * irregularity;
      const profilePower = variant === "conical" ? 0.9 : variant === "hand-scooped" ? 0.34 : 0.48;
      const plateau = Math.pow(Math.max(0, 1 - t), profilePower);
      const scoop = variant === "hand-scooped" ? Math.max(0, 1 - t * 2.2) * 0.09 : 0;
      const surfaceRipple = Math.sin(angle * 3 + ring * 0.9) * 0.035 * (1 - t) - scoop;
      const height = clamp(plateau + surfaceRipple, 0, 1);
      positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      uvs.push(0.5 + Math.cos(angle) * t * 0.5, 0.5 + Math.sin(angle) * t * 0.5);
    }
  }
  for (let ring = 0; ring < radialRings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      const currentRing = ring * segments;
      const nextRing = (ring + 1) * segments;
      indices.push(
        currentRing + segment,
        nextRing + segment,
        nextRing + next,
        currentRing + segment,
        nextRing + next,
        currentRing + next,
      );
    }
  }
  const mound = new BufferGeometry();
  mound.setAttribute("position", new Float32BufferAttribute(positions, 3));
  mound.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  mound.setIndex(indices);
  mound.translate(0, -0.5, 0);
  mound.computeVertexNormals();
  mound.computeBoundingBox();
  mound.computeBoundingSphere();
  return mound;
}

export function createMerchantBalanceGeometry(): BufferGeometry {
  const base = new CylinderGeometry(0.28, 0.32, 0.09, 8);
  base.translate(0, -0.43, 0);
  const post = new CylinderGeometry(0.035, 0.05, 0.64, 6);
  post.translate(0, -0.08, 0);
  const beam = new BoxGeometry(0.82, 0.05, 0.055);
  beam.rotateZ(0.045);
  beam.translate(0, 0.25, 0);
  const finial = new SphereGeometry(0.085, 8, 6);
  finial.translate(0, 0.34, 0);
  const parts: BufferGeometry[] = [base, post, beam, finial];
  for (const side of [-1, 1] as const) {
    const cord = new CylinderGeometry(0.008, 0.008, 0.31, 4);
    cord.translate(side * 0.32, 0.08 + side * 0.014, 0);
    const pan = new CylinderGeometry(0.2, 0.12, 0.055, 8);
    pan.translate(side * 0.32, -0.09 + side * 0.014, 0);
    parts.push(cord, pan);
  }
  const geometry = mergeProceduralGeometry(parts);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  geometry.scale(1 / size.x, 1 / size.y, 1 / size.z);
  geometry.translate(-center.x / size.x, -center.y / size.y, -center.z / size.z);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export type PotteryVariant = "storage-jar" | "handled-amphora" | "wide-urn";

export function createPotteryGeometry(variant: PotteryVariant = "storage-jar"): BufferGeometry {
  const lowerRadius = 0.48;
  const body = new CylinderGeometry(lowerRadius, 0.36, 0.24, 8);
  body.translate(0, -0.3, 0);
  const belly = new CylinderGeometry(0.4, lowerRadius, 0.3, 8);
  belly.translate(0, -0.03, 0);
  const shoulder = new CylinderGeometry(0.2, 0.4, 0.26, 8);
  shoulder.translate(0, 0.25, 0);
  const neckHeight = variant === "handled-amphora" ? 0.18 : 0.14;
  const neck = new CylinderGeometry(0.18, 0.2, neckHeight, 8);
  neck.translate(0, variant === "handled-amphora" ? 0.47 : 0.45, 0);
  const lip = new CylinderGeometry(
    variant === "wide-urn" ? 0.25 : 0.24,
    variant === "wide-urn" ? 0.25 : 0.24,
    0.08,
    8,
  );
  lip.translate(0, variant === "handled-amphora" ? 0.55 : 0.52, 0);
  const parts: BufferGeometry[] = [body, belly, shoulder, neck, lip];
  if (variant === "handled-amphora") {
    for (const x of [-0.27, 0.27]) {
      const handle = new TorusGeometry(0.145, 0.028, 6, 12, Math.PI);
      handle.rotateY(Math.PI * 0.5);
      handle.rotateZ(x < 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
      handle.translate(x, 0.34, 0);
      parts.push(handle);
    }
  }
  const geometry = mergeProceduralGeometry(parts);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
