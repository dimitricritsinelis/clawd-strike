import { BufferGeometry, CylinderGeometry, TorusGeometry, Vector3 } from "three";
import { boxPart, mergeProceduralGeometry } from "./propsCore";

export function createCartBodyGeometry(): BufferGeometry {
  return mergeProceduralGeometry([
    boxPart(0.78, 0.08, 0.52, 0, 0.02, 0),
    boxPart(0.78, 0.07, 0.06, 0, 0.2, -0.24),
    boxPart(0.78, 0.07, 0.06, 0, 0.32, -0.24),
    boxPart(0.06, 0.31, 0.5, -0.36, 0.2, 0),
    boxPart(0.06, 0.31, 0.5, 0.36, 0.2, 0),
    boxPart(0.055, 0.055, 0.86, -0.24, -0.02, 0.55),
    boxPart(0.055, 0.055, 0.86, 0.24, -0.02, 0.55),
    boxPart(0.58, 0.045, 0.045, 0, 0.4, -0.24),
  ]);
}

export function createCartWheelGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const x = side * 0.43;
    const wheel = new TorusGeometry(0.28, 0.055, 8, 16);
    wheel.rotateY(Math.PI * 0.5);
    wheel.translate(x, -0.23, 0);
    parts.push(wheel);
    parts.push(boxPart(0.05, 0.045, 0.52, x, -0.23, 0));
    parts.push(boxPart(0.05, 0.52, 0.045, x, -0.23, 0));
    const hub = new CylinderGeometry(0.085, 0.085, 0.09, 10);
    hub.rotateZ(Math.PI * 0.5);
    hub.translate(x, -0.23, 0);
    parts.push(hub);
  }
  return mergeProceduralGeometry(parts);
}

export function createCartGeometry(): BufferGeometry {
  return mergeProceduralGeometry([createCartBodyGeometry(), createCartWheelGeometry()]);
}

export function createNormalizedCartGeometry(): BufferGeometry {
  const geometry = createCartGeometry();
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
