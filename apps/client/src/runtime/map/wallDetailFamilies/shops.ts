import { BoxGeometry, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function createShopTimberBackGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let index = 0; index < 7; index += 1) {
    const plank = new BoxGeometry(0.13, 0.94, 0.12);
    plank.translate(-0.42 + index * 0.14, 0, 0);
    parts.push(plank);
  }
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("[wall-detail-kit] failed to merge shop timber back");
  return merged;
}
