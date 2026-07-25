import { BoxGeometry, BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function createMoldedTrimGeometry(kind: "plinth" | "cornice"): BufferGeometry {
  const parts = kind === "plinth"
    ? [new BoxGeometry(1, 0.48, 0.72), new BoxGeometry(1, 0.22, 0.92), new BoxGeometry(1, 0.3, 0.82)]
    : [new BoxGeometry(1, 0.34, 0.72), new BoxGeometry(1, 0.2, 0.92), new BoxGeometry(1, 0.46, 0.8)];
  parts[0]!.translate(0, -0.26, 0.08);
  parts[1]!.translate(0, 0.35, 0);
  parts[2]!.translate(0, 0.04, 0.04);
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("[wall-detail-kit] failed to merge molded trim");
  return merged;
}
