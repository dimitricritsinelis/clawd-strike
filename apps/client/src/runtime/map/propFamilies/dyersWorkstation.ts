import { BoxGeometry, BufferGeometry, CylinderGeometry, TorusGeometry } from "three";
import { angledBoxPart, boxPart, mergeProceduralGeometry, tintGeometry } from "./propsCore";

function basinShell(x: number): BufferGeometry[] {
  const shell = new CylinderGeometry(0.16, 0.18, 0.34, 16, 1, true);
  shell.scale(1, 1, 1.55);
  shell.translate(x, -0.19, 0.02);
  const rim = new TorusGeometry(0.16, 0.018, 6, 16);
  rim.rotateX(Math.PI * 0.5);
  rim.scale(1, 1, 1.55);
  rim.translate(x, -0.02, 0.02);
  const foot = new TorusGeometry(0.175, 0.016, 6, 16);
  foot.rotateX(Math.PI * 0.5);
  foot.scale(1, 1, 1.55);
  foot.translate(x, -0.355, 0.02);
  return [shell, rim, foot];
}

export function createDyersWorkstationStoneGeometry(): BufferGeometry {
  return mergeProceduralGeometry([
    boxPart(0.96, 0.07, 0.94, 0, -0.465, 0),
    boxPart(0.94, 0.08, 0.18, 0, -0.405, -0.36),
    boxPart(0.08, 0.13, 0.72, -0.46, -0.39, 0.05),
    boxPart(0.08, 0.13, 0.72, 0.46, -0.39, 0.05),
  ]);
}

export function createDyersWorkstationIndigoBasinGeometry(): BufferGeometry {
  return mergeProceduralGeometry(basinShell(-0.22));
}

export function createDyersWorkstationMadderBasinGeometry(): BufferGeometry {
  return mergeProceduralGeometry(basinShell(0.2));
}

export function createDyersWorkstationTimberGeometry(): BufferGeometry {
  return mergeProceduralGeometry([
    boxPart(0.055, 0.86, 0.055, -0.44, 0.02, 0.32),
    boxPart(0.055, 0.86, 0.055, 0.44, 0.02, 0.32),
    boxPart(0.96, 0.055, 0.055, 0, 0.44, 0.32),
    boxPart(0.96, 0.045, 0.055, 0, 0.16, 0.32),
    boxPart(0.82, 0.045, 0.23, 0, -0.09, 0.24),
    boxPart(0.035, 0.44, 0.035, -0.34, 0.22, 0.3),
    boxPart(0.035, 0.44, 0.035, 0.34, 0.22, 0.3),
    angledBoxPart(0.025, 0.52, 0.025, -0.34, 0.02, -0.08, -0.12),
    angledBoxPart(0.1, 0.17, 0.035, -0.31, -0.22, -0.08, -0.12),
    angledBoxPart(0.025, 0.5, 0.025, 0.34, 0.03, -0.08, 0.14),
    angledBoxPart(0.1, 0.17, 0.035, 0.31, -0.2, -0.08, 0.14),
  ]);
}

export function createDyersWorkstationTextileGeometry(): BufferGeometry {
  return mergeProceduralGeometry([
    tintGeometry(boxPart(0.23, 0.49, 0.022, -0.28, 0.18, 0.285), [0.2, 0.46, 0.5]),
    tintGeometry(boxPart(0.21, 0.43, 0.024, 0, 0.2, 0.28), [0.72, 0.36, 0.24]),
    tintGeometry(boxPart(0.23, 0.52, 0.022, 0.28, 0.165, 0.285), [0.78, 0.58, 0.2]),
    tintGeometry(boxPart(0.16, 0.035, 0.12, -0.23, -0.055, 0.1), [0.16, 0.4, 0.44]),
    tintGeometry(boxPart(0.14, 0.035, 0.12, 0.25, -0.055, 0.1), [0.68, 0.3, 0.22]),
  ]);
}

function liquidSurface(x: number): BufferGeometry {
  const surface = new CylinderGeometry(0.138, 0.138, 0.012, 16);
  surface.scale(1, 1, 1.55);
  surface.translate(x, -0.025, 0.02);
  return surface;
}

export function createDyersWorkstationIndigoGeometry(): BufferGeometry {
  return liquidSurface(-0.22);
}

export function createDyersWorkstationMadderGeometry(): BufferGeometry {
  return liquidSurface(0.2);
}

export function createDyersWorkstationDrainGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [
    boxPart(0.86, 0.025, 0.16, 0, -0.415, -0.35),
    boxPart(0.04, 0.022, 0.52, -0.22, -0.41, -0.1),
    boxPart(0.04, 0.022, 0.52, 0.2, -0.41, -0.1),
    boxPart(0.035, 0.08, 0.62, -0.43, -0.4, -0.05),
    boxPart(0.035, 0.08, 0.62, 0.43, -0.4, -0.05),
  ];
  for (let x = -0.35; x <= 0.35; x += 0.1) {
    parts.push(boxPart(0.025, 0.03, 0.16, x, -0.395, -0.35));
  }
  return mergeProceduralGeometry(parts);
}

function wetPatch(
  width: number,
  depth: number,
  x: number,
  z: number,
  yawRad: number,
  tint: readonly [number, number, number],
): BufferGeometry {
  const patch = new BoxGeometry(width, 0.012, depth);
  patch.rotateY(yawRad);
  patch.translate(x, -0.421, z);
  return tintGeometry(patch, tint);
}

export function createDyersWorkstationWetApronGeometry(): BufferGeometry {
  return mergeProceduralGeometry([
    wetPatch(0.34, 0.42, -0.22, -0.01, -0.08, [0.16, 0.29, 0.36]),
    wetPatch(0.32, 0.4, 0.2, 0.01, 0.09, [0.42, 0.18, 0.14]),
    wetPatch(0.72, 0.18, 0, -0.31, -0.02, [0.22, 0.2, 0.19]),
  ]);
}
