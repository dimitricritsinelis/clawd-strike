const DEG_TO_RAD = Math.PI / 180;

export type DesignVec3 = {
  x: number;
  y: number;
  z: number;
};

export type WorldVec3 = {
  x: number;
  y: number;
  z: number;
};

export function designToWorldVec3(vec: DesignVec3): WorldVec3 {
  return {
    x: vec.x,
    y: vec.z,
    z: vec.y,
  };
}

export function designYawDegToWorldYawRad(yawDeg: number | undefined): number {
  // Design yaw uses 0° = +north (+Z in world space), while Three.js camera
  // and gameplay forward use yaw 0 = -Z. Rotate the authored convention by
  // 180° so 90° remains east and 270° remains west.
  return ((yawDeg ?? 0) + 180) * DEG_TO_RAD;
}
