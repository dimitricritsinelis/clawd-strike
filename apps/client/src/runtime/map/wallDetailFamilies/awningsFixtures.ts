import { BoxGeometry, BufferGeometry, CylinderGeometry, PlaneGeometry, Shape, ExtrudeGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface SaggingAwningGeometryOptions {
  sag?: number;
  pitch?: number;
  edgeThickness?: number;
  seamCount?: number;
}

function mergeParts(parts: BufferGeometry[]): BufferGeometry {
  const normalized = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const merged = mergeGeometries(normalized, false);
  for (let index = 0; index < parts.length; index += 1) {
    parts[index]!.dispose();
    if (normalized[index] !== parts[index]) normalized[index]!.dispose();
  }
  if (!merged) throw new Error("[wall-detail-kit] failed to merge awning family geometry");
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function shapeAwningSurface(geometry: BufferGeometry, sag: number, pitch: number): void {
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const edgeTension = Math.min(1, Math.abs(x) * 2) ** 2;
    positions.setY(index, -sag * (1 - edgeTension) - pitch * (z + 0.5));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

function insetAwningBacking(geometry: BufferGeometry, thickness: number, sag: number, pitch: number): void {
  const positions = geometry.getAttribute("position");
  const depth = Math.max(0.0001, sag + pitch);
  for (let index = 0; index < positions.count; index += 1) {
    const normalizedDepth = Math.min(1, Math.max(0, -positions.getY(index) / depth));
    positions.setY(index, positions.getY(index) - thickness * (1 - normalizedDepth));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

/** Normalized to the served opening: callers set width and projection once;
 * cloth thickness, hems, and seam rhythm remain proportional to that span. */
export function createSaggingAwningGeometry(options: SaggingAwningGeometryOptions = {}): BufferGeometry {
  const sag = options.sag ?? 0.14;
  const pitch = options.pitch ?? 0.1;
  const edgeThickness = options.edgeThickness ?? 0.032;
  const seamCount = Math.max(2, Math.round(options.seamCount ?? 5));
  const top = new PlaneGeometry(1, 1, 10, 6);
  top.rotateX(-Math.PI * 0.5);
  shapeAwningSurface(top, sag, pitch);
  const underside = top.clone();
  insetAwningBacking(underside, edgeThickness, sag, pitch);

  // Lift the exposed face by the complementary amount. Together the two
  // skins retain the old zero-thickness AABB while reading as finished cloth.
  const topPositions = top.getAttribute("position");
  const depth = Math.max(0.0001, sag + pitch);
  for (let index = 0; index < topPositions.count; index += 1) {
    const normalizedDepth = Math.min(1, Math.max(0, -topPositions.getY(index) / depth));
    topPositions.setY(index, topPositions.getY(index) + edgeThickness * normalizedDepth);
  }
  topPositions.needsUpdate = true;
  top.computeVertexNormals();

  const parts: BufferGeometry[] = [top, underside];
  parts.push(
    new BoxGeometry(edgeThickness, edgeThickness * 1.8, 1),
    new BoxGeometry(edgeThickness, edgeThickness * 1.8, 1),
    new BoxGeometry(1, edgeThickness * 1.8, edgeThickness),
    new BoxGeometry(1, edgeThickness * 1.8, edgeThickness),
  );
  parts[2]!.translate(-0.5 + edgeThickness * 0.5, -pitch * 0.5 - edgeThickness * 0.5, 0);
  parts[3]!.translate(0.5 - edgeThickness * 0.5, -pitch * 0.5 - edgeThickness * 0.5, 0);
  parts[4]!.translate(0, -edgeThickness * 0.9, -0.5 + edgeThickness * 0.5);
  parts[5]!.translate(0, -pitch - edgeThickness * 0.5, 0.5 - edgeThickness * 0.5);

  for (let index = 1; index < seamCount; index += 1) {
    const x = -0.5 + index / seamCount;
    const seam = new BoxGeometry(edgeThickness * 0.42, edgeThickness * 0.55, 0.96);
    seam.translate(x, -sag * (1 - Math.min(1, Math.abs(x) * 2) ** 2) - pitch * 0.5 + 0.006, 0);
    parts.push(seam);
  }
  return mergeParts(parts);
}

export interface ScallopedValanceGeometryOptions {
  depth?: number;
  scallops?: number;
}

export function createScallopedValanceGeometry(options: ScallopedValanceGeometryOptions = {}): BufferGeometry {
  const depth = options.depth ?? 0.055;
  const scallops = Math.max(3, Math.round(options.scallops ?? 4));
  const shape = new Shape();
  shape.moveTo(-0.5, 0.5);
  shape.lineTo(0.5, 0.5);
  shape.lineTo(0.5, -0.18);
  for (let index = scallops; index >= 1; index -= 1) {
    const right = -0.5 + index / scallops;
    const left = -0.5 + (index - 1) / scallops;
    shape.quadraticCurveTo((left + right) * 0.5, -0.5, left, -0.18);
  }
  shape.closePath();
  const cloth = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.008,
    bevelThickness: 0.006,
    curveSegments: 6,
  });
  cloth.translate(0, 0, -depth * 0.5);
  cloth.scale(0.984, 0.984, 1);
  const topHem = new BoxGeometry(1, 0.045, depth * 1.3);
  topHem.translate(0, 0.475, 0);
  const leftTab = new BoxGeometry(0.055, 0.64, depth * 1.25);
  leftTab.translate(-0.472, 0.16, 0);
  const rightTab = leftTab.clone();
  rightTab.translate(0.944, 0, 0);
  return mergeParts([cloth, topHem, leftTab, rightTab]);
}

export interface AttachmentBracketGeometryOptions {
  projection?: number;
  plateHeight?: number;
}

export function createAttachmentBracketGeometry(options: AttachmentBracketGeometryOptions = {}): BufferGeometry {
  const projection = options.projection ?? 0.82;
  const plateHeight = options.plateHeight ?? 0.62;
  const parts: BufferGeometry[] = [];
  const wall = new BoxGeometry(0.14, plateHeight, 0.12);
  wall.translate(0, 0, 0.04);
  parts.push(wall);
  const arm = new BoxGeometry(0.12, 0.12, projection);
  arm.translate(0, plateHeight * 0.4, -projection * 0.5 + 0.06);
  parts.push(arm);
  const braceLength = Math.hypot(plateHeight * 0.72, projection * 0.62);
  const brace = new BoxGeometry(0.085, braceLength, 0.085);
  brace.rotateX(-Math.atan2(projection * 0.62, plateHeight * 0.72));
  brace.translate(0, -plateHeight * 0.02, -projection * 0.3);
  parts.push(brace);
  const terminal = new TorusGeometry(0.05, 0.014, 6, 12, Math.PI * 1.5);
  terminal.rotateY(Math.PI * 0.5);
  terminal.rotateZ(Math.PI * 0.5);
  terminal.translate(0, plateHeight * 0.4, -projection * 0.79);
  parts.push(terminal);
  for (const y of [-plateHeight * 0.34, plateHeight * 0.34]) {
    const bolt = new CylinderGeometry(0.026, 0.026, 0.15, 8, 1, false);
    bolt.rotateX(Math.PI * 0.5);
    bolt.translate(0, y, 0.025);
    parts.push(bolt);
  }
  const knuckle = new CylinderGeometry(0.045, 0.045, 0.14, 10, 1, false);
  knuckle.rotateZ(Math.PI * 0.5);
  knuckle.translate(0, plateHeight * 0.4, -projection * 0.86);
  parts.push(knuckle);
  return mergeParts(parts);
}
