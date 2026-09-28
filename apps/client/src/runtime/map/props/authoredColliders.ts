import type { RuntimeColliderAabb } from "../../sim/collision/WorldColliders";
import { designToWorldVec3, designYawDegToWorldYawRad, type WorldVec3 } from "../coordinateTransforms";
import type { RuntimeAnchor, RuntimeAnchorsSpec, RuntimeBlockoutSpec } from "../types";

// The DYE_W_SHOP_2 collider takes its depth from this closed service door.
const SERVICE_DOOR_MODULE_ID = "ARCH_FRONTAGE_COVERED_SOUK_WEST_NORTH_GROUND_01";

function createColliderFromOrientedBox(
  id: string,
  center: WorldVec3,
  size: { x: number; y: number; z: number },
  yawRad: number,
): RuntimeColliderAabb {
  const halfY = size.y * 0.5;
  const absCos = Math.abs(Math.cos(yawRad));
  const absSin = Math.abs(Math.sin(yawRad));
  const halfX = absCos * size.x * 0.5 + absSin * size.z * 0.5;
  const halfZ = absSin * size.x * 0.5 + absCos * size.z * 0.5;

  return {
    id,
    kind: "prop",
    min: {
      x: center.x - halfX,
      y: center.y - halfY,
      z: center.z - halfZ,
    },
    max: {
      x: center.x + halfX,
      y: center.y + halfY,
      z: center.z + halfZ,
    },
  };
}

function cabinetCollider(anchor: RuntimeAnchor, blockout: RuntimeBlockoutSpec): RuntimeColliderAabb | null {
  const base = designToWorldVec3(anchor.pos);
  const id = `${anchor.id}-shop`;
  if (anchor.id === "DYE_E_SHOP_2" || anchor.id === "DYE_W_SHOP_1") {
    if (anchor.heightM === undefined) throw new Error("B18 north cabinet requires its authored solid height");
    const cabinetHeight = anchor.heightM;
    return createColliderFromOrientedBox(id,
      { x: base.x + (anchor.id === "DYE_E_SHOP_2" ? .33 : -.33), y: base.y + .14 + cabinetHeight * .5, z: base.z },
      { x: 1.48, y: cabinetHeight, z: .34 },
      designYawDegToWorldYawRad((anchor.yawDeg ?? 0) + 180));
  }
  if (anchor.id === "DYE_W_SHOP_2") {
    const door = blockout.architecturePlacements?.find((entry) => entry.id === SERVICE_DOOR_MODULE_ID);
    if (!door || door.kind !== "facade_module" || anchor.widthM === undefined || anchor.heightM === undefined) {
      throw new Error("Central service-door collider requires its authored door and envelope");
    }
    return createColliderFromOrientedBox(id,
      { ...base, y: base.y + anchor.heightM * .5 },
      { x: anchor.widthM, y: anchor.heightM, z: door.sizeM.depth + .04 },
      designYawDegToWorldYawRad(anchor.yawDeg));
  }
  return null;
}

/**
 * Approved cabinet collision fits that outlive the render props they were
 * measured against. Each keeps its anchor's authored position, orientation and
 * height; a map without the anchor places nothing.
 */
export function buildAuthoredPropColliders(
  blockout: RuntimeBlockoutSpec,
  anchors: RuntimeAnchorsSpec,
): RuntimeColliderAabb[] {
  return anchors.anchors
    .filter((anchor) => anchor.type.toLowerCase() === "shopfront_anchor")
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((anchor) => cabinetCollider(anchor, blockout) ?? []);
}
