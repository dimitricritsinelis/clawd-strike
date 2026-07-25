import {
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import { mergeProceduralGeometry } from "./propsCore";

export type LanternVariant = "square" | "hexagonal" | "octagonal";

export type LanternGeometryOptions = {
  variant?: LanternVariant;
  suspension?: "chain" | "fixed-loop";
};

function variantSides(variant: LanternVariant): 4 | 6 | 8 {
  if (variant === "square") return 4;
  if (variant === "hexagonal") return 6;
  return 8;
}

/** A capless faceted shell: the lantern's negative space stays genuinely open. */
function openFrustumPart(
  radiusBottom: number,
  radiusTop: number,
  yBottom: number,
  yTop: number,
  sides: number,
): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index < sides; index += 1) {
    const angle = (index / sides) * Math.PI * 2;
    positions.push(
      Math.sin(angle) * radiusBottom,
      yBottom,
      Math.cos(angle) * radiusBottom,
      Math.sin(angle) * radiusTop,
      yTop,
      Math.cos(angle) * radiusTop,
    );
  }

  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    const bottom = index * 2;
    const top = bottom + 1;
    const nextBottom = next * 2;
    const nextTop = nextBottom + 1;
    indices.push(bottom, nextBottom, top, nextBottom, nextTop, top);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Four uncapped faces give a cage rail eight triangles instead of a box's 12. */
function openRailPart(
  width: number,
  depth: number,
  yBottom: number,
  yTop: number,
  x: number,
  z: number,
): BufferGeometry {
  const x0 = x - width / 2;
  const x1 = x + width / 2;
  const z0 = z - depth / 2;
  const z1 = z + depth / 2;
  const positions = [
    x0, yBottom, z0,
    x1, yBottom, z0,
    x1, yBottom, z1,
    x0, yBottom, z1,
    x0, yTop, z0,
    x1, yTop, z0,
    x1, yTop, z1,
    x0, yTop, z1,
  ];
  const indices = [
    0, 1, 4, 1, 5, 4,
    1, 2, 5, 2, 6, 5,
    2, 3, 6, 3, 7, 6,
    3, 0, 7, 0, 4, 7,
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Complete hanging-souk lantern within the original 0.52 x 0.80 x 0.52
 * instancing envelope. Two tapered metal shells, four seated cage rails, and a
 * compact ceiling stem make a strong bazaar silhouette while preserving an
 * open central light volume. The 4/6/8-sided variants are deterministic and
 * deliberately share the same placement/collision contract.
 *
 * The default totals 72 triangles. Lanterns are numerous, so this is the full
 * budget available to the family without pushing gate cameras past 1.6M tris.
 */
export function createLanternGeometry(
  options: LanternGeometryOptions = {},
): BufferGeometry {
  const variant = options.variant ?? "octagonal";
  const suspension = options.suspension ?? "chain";
  const sides = variantSides(variant);
  const railRadius = variant === "square" ? 0.17 : 0.185;
  const stemWidth = suspension === "fixed-loop" ? 0.045 : 0.026;

  return mergeProceduralGeometry([
    // Flared drip tray and tapered crown provide the characteristic profile.
    openFrustumPart(0.26, 0.17, -0.4, -0.29, sides),
    openFrustumPart(0.225, 0.075, 0.2, 0.34, sides),

    // Four structural rails leave broad, readable panel bays on every view axis.
    openRailPart(0.028, 0.028, -0.3, 0.21, -railRadius, -railRadius),
    openRailPart(0.028, 0.028, -0.3, 0.21, railRadius, -railRadius),
    openRailPart(0.028, 0.028, -0.3, 0.21, -railRadius, railRadius),
    openRailPart(0.028, 0.028, -0.3, 0.21, railRadius, railRadius),

    // The ceiling stem is visibly seated into the crown and reaches the exact
    // pre-existing top datum; width distinguishes chain and fixed-loop variants.
    openRailPart(stemWidth, stemWidth, 0.33, 0.4, 0, 0),
  ]);
}
