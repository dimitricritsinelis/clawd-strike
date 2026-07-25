import { BoxGeometry, BufferGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function merge(parts: BufferGeometry[], label: string): BufferGeometry {
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error("[wall-detail-kit] failed to merge " + label);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export type MerchantPotVariant = "storage-jar" | "handled-amphora" | "squat-urn";

export function createMerchantPotGeometry(
  variant: MerchantPotVariant = "storage-jar",
): BufferGeometry {
  const widestRadius = 0.48;
  const lower = new CylinderGeometry(widestRadius, 0.36, 0.3, 8);
  lower.translate(0, -0.2, 0);
  const belly = new CylinderGeometry(0.42, widestRadius, 0.28, 8);
  belly.translate(0, 0.06, 0);
  const shoulder = new CylinderGeometry(0.23, 0.42, variant === "squat-urn" ? 0.18 : 0.22, 8);
  shoulder.translate(0, variant === "squat-urn" ? 0.28 : 0.3, 0);
  const neck = new CylinderGeometry(0.19, 0.22, variant === "handled-amphora" ? 0.18 : 0.13, 8);
  neck.translate(0, variant === "handled-amphora" ? 0.48 : 0.455, 0);
  const rim = new CylinderGeometry(
    variant === "squat-urn" ? 0.295 : 0.255,
    variant === "squat-urn" ? 0.295 : 0.255,
    0.09,
    8,
  );
  rim.translate(0, variant === "handled-amphora" ? 0.585 : 0.56, 0);
  const shoulderBand = new CylinderGeometry(0.405, 0.405, 0.025, 8, 1, true);
  shoulderBand.translate(0, 0.225, 0);
  const parts: BufferGeometry[] = [lower, belly, shoulder, neck, rim, shoulderBand];
  if (variant === "handled-amphora") {
    for (const x of [-0.31, 0.31]) {
      const handle = new TorusGeometry(0.15, 0.03, 6, 12, Math.PI);
      handle.rotateY(Math.PI * 0.5);
      handle.rotateZ(x < 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
      handle.translate(x, 0.37, 0);
      parts.push(handle);
    }
  }
  return merge(parts, "merchant pot");
}

export type MerchantBasketVariant = "market-basket" | "handled-basket" | "tight-weave";

export function createMerchantBasketGeometry(
  variant: MerchantBasketVariant = "market-basket",
): BufferGeometry {
  const body = new CylinderGeometry(0.48, 0.38, 0.58, 8, 1, true);
  body.translate(0, 0.015, 0);
  const base = new CylinderGeometry(0.38, 0.38, 0.045, 8);
  base.translate(0, -0.285, 0);
  const rim = new TorusGeometry(0.48, 0.045, 4, 8);
  rim.rotateX(Math.PI * 0.5);
  rim.translate(0, 0.31, 0);
  const parts: BufferGeometry[] = [body, base, rim];
  for (const y of [-0.16, 0.16]) {
    const radius = 0.39 + (y + 0.29) / 0.6 * 0.09;
    const band = new CylinderGeometry(radius, radius, variant === "tight-weave" ? 0.026 : 0.018, 8, 1, true);
    band.translate(0, y, 0);
    parts.push(band);
  }
  const ribCount = variant === "tight-weave" ? 8 : 6;
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    const rib = new BoxGeometry(0.022, 0.54, 0.032);
    rib.rotateY(-angle);
    rib.translate(Math.cos(angle) * 0.425, 0.01, Math.sin(angle) * 0.425);
    parts.push(rib);
  }
  if (variant === "handled-basket") {
    const handle = new TorusGeometry(0.37, 0.025, 6, 18, Math.PI);
    handle.rotateZ(Math.PI * 0.5);
    handle.translate(0, 0.31, 0);
    parts.push(handle);
  }
  return merge(parts, "merchant basket");
}

export type FoldedTextileVariant = "stepped-stack" | "compact-stack" | "rolled-top";

export function createFoldedTextileGeometry(
  variant: FoldedTextileVariant = "stepped-stack",
): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let index = 0; index < 4; index += 1) {
    const taper = variant === "compact-stack" ? 0.04 : 0.08;
    const layer = new BoxGeometry(1 - index * taper, 0.2, 0.82 - index * taper * 0.5);
    layer.translate(index % 2 === 0 ? -0.02 : 0.03, -0.3 + index * 0.2, 0);
    parts.push(layer);
  }
  if (variant === "rolled-top") {
    const roll = new CylinderGeometry(0.13, 0.13, 0.78, 12);
    roll.rotateZ(Math.PI * 0.5);
    roll.translate(0, 0.4, 0);
    const tuckedEnd = new SphereGeometry(0.09, 10, 6);
    tuckedEnd.scale(0.35, 1, 1);
    tuckedEnd.translate(0.39, 0.4, 0);
    parts.push(roll, tuckedEnd);
  }
  return merge(parts, "folded textile");
}
