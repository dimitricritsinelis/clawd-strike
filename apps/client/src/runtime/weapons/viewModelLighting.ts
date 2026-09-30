import { Color, Vector3 } from "three";

/** World light sampled at the player's eye, applied to the separately rendered viewmodel. */
export type ViewModelLighting = {
  /** Unit vector from the scene toward the sun, world space. */
  sunDirection: Vector3;
  sunColor: Color;
  sunIntensity: number;
  /** False when map geometry blocks the sun from the eye. */
  sunVisible: boolean;
  skyColor: Color;
  groundColor: Color;
  hemiIntensity: number;
  ambientColor: Color;
  ambientIntensity: number;
  environmentIntensity: number;
};

export function createViewModelLighting(): ViewModelLighting {
  return {
    sunDirection: new Vector3(0, 1, 0),
    sunColor: new Color(),
    sunIntensity: 0,
    sunVisible: true,
    skyColor: new Color(),
    groundColor: new Color(),
    hemiIntensity: 0,
    ambientColor: new Color(),
    ambientIntensity: 0,
    environmentIntensity: 0,
  };
}
