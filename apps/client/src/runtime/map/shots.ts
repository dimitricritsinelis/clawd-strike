import type { CameraPose } from "../game/Game";
import { designToWorldVec3 } from "./coordinateTransforms";
import type { RuntimeShotsSpec } from "./types";

const COMPARE_ALIAS = "compare";

export type ResolvedShot = {
  active: boolean;
  id: string | null;
  cameraPose: CameraPose | null;
  freezeInput: boolean;
  warning: string | null;
};

function toCameraPose(shot: RuntimeShotsSpec["shots"][number]): CameraPose {
  return {
    pos: designToWorldVec3(shot.camera.pos),
    lookAt: designToWorldVec3(shot.camera.lookAt),
    fovDeg: shot.camera.fovDeg,
  };
}

export function resolveShot(shotsSpec: RuntimeShotsSpec, requestedShot: string | null): ResolvedShot {
  if (!requestedShot) {
    return {
      active: false,
      id: null,
      cameraPose: null,
      freezeInput: false,
      warning: null,
    };
  }

  const targetShotId = requestedShot === COMPARE_ALIAS
    ? shotsSpec.aliases?.compare
    : requestedShot;
  if (!targetShotId) {
    throw new Error(`[shot-inventory] authored alias '${requestedShot}' is not configured`);
  }

  const shot = shotsSpec.shots.find((candidate) => candidate.id === targetShotId);
  if (!shot) {
    throw new Error(
      `[shot-inventory] unknown authored shot id '${targetShotId}' requested as '${requestedShot}'`,
    );
  }

  return {
    active: true,
    id: shot.id,
    cameraPose: toCameraPose(shot),
    freezeInput: true,
    warning: null,
  };
}
