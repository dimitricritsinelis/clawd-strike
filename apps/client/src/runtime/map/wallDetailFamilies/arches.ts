import { BoxGeometry, BufferGeometry, ExtrudeGeometry, Shape } from "three";

function pointedShape(widthHalf: number, bottomY: number, springY: number, apexY: number): Shape {
  const shape = new Shape();
  shape.moveTo(-widthHalf, bottomY);
  shape.lineTo(widthHalf, bottomY);
  shape.lineTo(widthHalf, springY);
  shape.quadraticCurveTo(widthHalf * 0.72, apexY * 0.9, 0, apexY);
  shape.quadraticCurveTo(-widthHalf * 0.72, apexY * 0.9, -widthHalf, springY);
  shape.lineTo(-widthHalf, bottomY);
  return shape;
}

function extrude(shape: Shape): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 24 });
  geometry.rotateY(Math.PI * 0.5);
  geometry.translate(-0.5, 0, 0);
  return geometry;
}

export function createOpenBottomArchRecessGeometry(): BufferGeometry {
  return extrude(pointedShape(0.5, -0.5, 0.05, 0.5));
}

export function createOpenBottomPointedArchFrameGeometry(): BufferGeometry {
  const outer = pointedShape(0.5, -0.5, 0.02, 0.5);
  outer.holes.push(pointedShape(0.37, -0.52, 0.02, 0.38));
  return extrude(outer);
}

export function createArchSpandrelGeometry(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}
