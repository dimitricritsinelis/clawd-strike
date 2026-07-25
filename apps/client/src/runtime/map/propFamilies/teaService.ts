import { BufferGeometry, CylinderGeometry } from "three";
import { boxPart, mergeProceduralGeometry } from "./propsCore";

export function createTeaServiceGeometry(): BufferGeometry {
  return mergeProceduralGeometry([
    boxPart(0.86, 0.52, 0.46, 0, -0.16, 0),
    boxPart(0.98, 0.06, 0.58, 0, 0.13, 0),
    boxPart(0.76, 0.04, 0.38, 0, -0.37, 0),
    boxPart(0.06, 0.32, 0.06, -0.36, -0.38, -0.17),
    boxPart(0.06, 0.32, 0.06, 0.36, -0.38, -0.17),
    boxPart(0.06, 0.32, 0.06, -0.36, -0.38, 0.17),
    boxPart(0.06, 0.32, 0.06, 0.36, -0.38, 0.17),
  ]);
}

export function createTeaVesselsGeometry(): BufferGeometry {
  const potBody = new CylinderGeometry(0.13, 0.16, 0.19, 12);
  potBody.translate(-0.18, 0.27, 0);
  const potLid = new CylinderGeometry(0.07, 0.1, 0.04, 12);
  potLid.translate(-0.18, 0.385, 0);
  const spout = new CylinderGeometry(0.035, 0.065, 0.2, 8);
  spout.rotateZ(-0.9);
  spout.translate(-0.02, 0.31, 0);
  const parts: BufferGeometry[] = [potBody, potLid, spout];
  for (const x of [0.08, 0.23, 0.38]) {
    const cup = new CylinderGeometry(0.055, 0.065, 0.09, 10);
    cup.translate(x, 0.235, 0.03);
    parts.push(cup);
  }
  return mergeProceduralGeometry(parts);
}
