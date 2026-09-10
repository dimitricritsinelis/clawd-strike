import type { BoundarySegment } from "./buildBlockout";
import type { WallDetailInstance } from "./wallDetailKit";

/** Controlled B courtyard solid intervals. Collision never calls this function. */
export function bz04CourtyardVisualSegments(segment: BoundarySegment): BoundarySegment[] {
  const faces = segment.orientation === "horizontal"
    ? [{ coord: 92, intervals: [[17,39]] }, { coord: 78, intervals: [[17,21],[34,39]] }]
    : [{ coord: 17, intervals: [[81,92]] }, { coord: 39, intervals: [[81,92]] }];
  let fragments = [segment];
  for (const face of faces) {
    if (Math.abs(segment.coord-face.coord)>0.001) continue;
    for (const [start,end] of face.intervals) fragments=fragments.flatMap(s => {
      if (s.end<=start! || s.start>=end!) return [s];
      return [ ...(s.start<start! ? [{...s,end:start!}] : []), ...(s.end>end! ? [{...s,start:end!}] : []) ];
    });
  }
  return fragments;
}

/** Subtract installed roof footprints from axis-aligned legacy roof components.
 * The remaining rectangles retain their source IDs, material and height.
 */
export function bz04RoofFragments(instance: WallDetailInstance, coverage: readonly number[][]): WallDetailInstance[] {
  if (!/roof_slab|roof_parapet|roof_coping|roof_finish/.test(instance.meshId+":"+(instance.semanticClass??""))) return [instance];
  if (Math.abs(Math.sin(instance.yawRad*2))>1e-6 || instance.pitchRad || instance.rollRad) return [instance];
  const quarter = Math.abs(Math.sin(instance.yawRad))>.5;
  const w=quarter?instance.scale.z:instance.scale.x, d=quarter?instance.scale.x:instance.scale.z;
  let rects=[[instance.position.x-w/2,instance.position.z-d/2,instance.position.x+w/2,instance.position.z+d/2]];
  for (const [x,y,X,Y] of coverage) rects=rects.flatMap(r=>{
    const [a,b,c,e]=r as [number,number,number,number];
    const l=Math.max(a,x!), s=Math.max(b,y!), h=Math.min(c,X!), n=Math.min(e,Y!);
    if(l>=h || s>=n)return [r];
    return [[a,b,l,e],[h,b,c,e],[l,b,h,s],[l,n,h,e]].filter(q=>q[2]!-q[0]!>1e-5 && q[3]!-q[1]!>1e-5);
  });
  return rects.map((r,i)=>({...instance,placementId:`${instance.placementId}:bz04-remainder-${i}`,
    position:{...instance.position,x:(r[0]!+r[2]!)/2,z:(r[1]!+r[3]!)/2},
    scale:{...instance.scale,x:quarter?r[3]!-r[1]!:r[2]!-r[0]!,z:quarter?r[2]!-r[0]!:r[3]!-r[1]!}}));
}
