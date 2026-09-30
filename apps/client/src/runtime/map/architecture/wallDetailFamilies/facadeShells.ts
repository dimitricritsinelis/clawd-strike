import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from "three";

function applyFacadeWearColors(geometry: BufferGeometry): void {
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  // The material owns continuous world-space wear and the installed PBR maps,
  // so the shell carries a neutral vertex color.
  colors.fill(1);
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
}

export function createFacadeWallShellGeometry(): BufferGeometry {
  const geometry = new BoxGeometry(1, 1, 1);
  applyFacadeWearColors(geometry);
  return geometry;
}
