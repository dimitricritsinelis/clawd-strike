import { BufferGeometry, ExtrudeGeometry, Shape } from "three";

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

function extrude(shape: Shape | Shape[]): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 24 });
  // Facade instances use local X for width, Y for height, and Z for depth.
  geometry.translate(0, 0, -0.5);
  return geometry;
}

export function createOpenBottomArchRecessGeometry(): BufferGeometry {
  return extrude(pointedShape(0.5, -0.5, 0.05, 0.5));
}

export function createOpenBottomPointedArchFrameGeometry(): BufferGeometry {
  // Trace one open-bottom ring. A hole extending outside its outer polygon
  // is invalid for triangulation and can fill the intended opening.
  const frame = new Shape();
  frame.moveTo(-0.5, -0.5);
  frame.lineTo(-0.5, 0.02);
  frame.quadraticCurveTo(-0.36, 0.45, 0, 0.5);
  frame.quadraticCurveTo(0.36, 0.45, 0.5, 0.02);
  frame.lineTo(0.5, -0.5);
  frame.lineTo(0.37, -0.5);
  frame.lineTo(0.37, 0.02);
  frame.quadraticCurveTo(0.2664, 0.342, 0, 0.38);
  frame.quadraticCurveTo(-0.2664, 0.342, -0.37, 0.02);
  frame.lineTo(-0.37, -0.5);
  frame.closePath();
  return extrude(frame);
}

export function createArchSpandrelGeometry(): BufferGeometry {
  // Only the two upper corners outside the arch are solid masonry.
  const corners = [-1, 1].map((side) => {
    const corner = new Shape();
    corner.moveTo(side * 0.5, 0.02);
    corner.lineTo(side * 0.5, 0.5);
    corner.lineTo(0, 0.5);
    corner.quadraticCurveTo(side * 0.36, 0.45, side * 0.5, 0.02);
    corner.closePath();
    return corner;
  });
  return extrude(corners);
}
