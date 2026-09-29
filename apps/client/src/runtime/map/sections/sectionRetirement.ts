import type { BoundarySegment } from "../world/buildBlockout";
import type { WallDetailInstance } from "../architecture/wallDetailKit";

export type SectionBoundaryCoverage = Pick<BoundarySegment, "orientation" | "coord" | "start" | "end">;

/** Read only the finite, exact face spans shipped by a checked section. */
export function readSectionBoundaryCoverage(value: unknown): SectionBoundaryCoverage[] {
  if (!Array.isArray(value)) throw new Error("Invalid BZ04 boundary coverage");
  return value.map((span: SectionBoundaryCoverage) => {
    if (!span || !["horizontal", "vertical"].includes(span.orientation)
      || ![span.coord, span.start, span.end].every(Number.isFinite) || span.start >= span.end) {
      throw new Error("Invalid BZ04 boundary span");
    }
    return { orientation: span.orientation, coord: span.coord, start: span.start, end: span.end };
  });
}

/** Retire only matching render spans; collision keeps the source segment array. */
export function sectionVisualSegments(segment: BoundarySegment, coverage: readonly SectionBoundaryCoverage[]): BoundarySegment[] {
  let fragments = [segment];
  for (const span of coverage) {
    if (segment.orientation !== span.orientation || Math.abs(segment.coord-span.coord) > .001) continue;
    fragments = fragments.flatMap(part => {
      if (part.end <= span.start || part.start >= span.end) return [part];
      return [
        ...(part.start < span.start ? [{ ...part, end: span.start }] : []),
        ...(part.end > span.end ? [{ ...part, start: span.end }] : []),
      ];
    });
  }
  return fragments;
}

/** Compile the installed section's measured floor treatment in world plan metres. */
export function sectionFloorTreatmentShader(value: unknown, materialId: string): string {
  if (!value || typeof value !== "object") throw new Error("Invalid BZ04 floor treatment");
  const treatment = value as {
    receiver: string;
    trafficRegion: {x:number;y:number;w:number;h:number};
    trafficRoughnessDelta: number;
    trafficAlbedoDelta: number;
    edgeDust: {widthM:number;maxAlpha:number;featherM:number};
    surfaceFinish?: {region:{x:number;y:number;w:number;h:number};contrast:number;neutralLinear:[number,number,number];featherM:number};
    faces: {face:string;wallPlaneM:number;intervals:number[][];doors:{alongM:number;widthM:number}[]}[];
  };
  if (treatment.receiver !== materialId) return "";
  const number = (v: number) => {
    if (!Number.isFinite(v)) throw new Error("Non-finite BZ04 floor dimension");
    return v.toFixed(6);
  };
  const region = treatment.trafficRegion;
  const dust = treatment.edgeDust;
  if (region.w <= 0 || region.h <= 0 || dust.widthM <= 0 || dust.featherM <= 0
    || dust.featherM > dust.widthM || dust.maxAlpha < 0 || dust.maxAlpha > 1
    || treatment.trafficAlbedoDelta !== 0) throw new Error("Unsupported BZ04 floor treatment");
  const statements = [
    `if (bz.x>=${number(region.x)} && bz.x<=${number(region.x+region.w)} && bz.y>=${number(region.y)} && bz.y<=${number(region.y+region.h)}) roughnessFactor=max(0.04,roughnessFactor+${number(treatment.trafficRoughnessDelta)});`,
    "float edgeDistance=100.0; bool doorService=false;",
  ];
  for (const face of treatment.faces) {
    if (!["north","south","east","west"].includes(face.face)) throw new Error("Invalid floor receiver face");
    const along = ["north","south"].includes(face.face) ? "bz.x" : "bz.y";
    const axis = along === "bz.x" ? "bz.y" : "bz.x";
    const out = ["north","east"].includes(face.face) ? `(${number(face.wallPlaneM)}-${axis})` : `(${axis}-${number(face.wallPlaneM)})`;
    for (const [start,end] of face.intervals) {
      if (start! >= end!) throw new Error("Invalid floor receiver interval");
      statements.push(`if (${along}>=${number(start!)} && ${along}<=${number(end!)} && ${out}>=0.0) edgeDistance=min(edgeDistance,${out});`);
    }
    for (const door of face.doors) {
      if (door.widthM <= 0) throw new Error("Invalid floor door width");
      statements.push(`doorService=doorService || (${along}>=${number(door.alongM-door.widthM/2)} && ${along}<=${number(door.alongM+door.widthM/2)} && ${out}>=0.0 && ${out}<=0.8);`);
    }
  }
  statements.push(`float edgeDust=doorService?0.0:${number(dust.maxAlpha)}*(1.0-smoothstep(${number(dust.widthM-dust.featherM)},${number(dust.widthM)},edgeDistance));`,
    "diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.60,0.56,0.50),edgeDust);");
  if (treatment.surfaceFinish !== undefined) {
    const finish = treatment.surfaceFinish;
    const bounds = finish?.region;
    if (!finish || !bounds || ![bounds.x,bounds.y,bounds.w,bounds.h,bounds.x+bounds.w,bounds.y+bounds.h,finish.contrast,finish.featherM].every(Number.isFinite)
      || bounds.w <= 0 || bounds.h <= 0 || finish.contrast < 0 || finish.contrast > 1
      || finish.featherM <= 0 || finish.featherM > Math.min(bounds.w,bounds.h)/2
      || !Array.isArray(finish.neutralLinear) || finish.neutralLinear.length !== 3
      || !Array.from(finish.neutralLinear).every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 1)) {
      throw new Error("Invalid BZ04 floor surface finish");
    }
    // Shared flagstone owns its albedo. Older section metadata is still
    // validated above, but cannot repaint individual zones of that material.
    if (materialId !== "bz04_court_limestone_flags_01") {
      // Preserve small positive feather widths instead of rounding them to zero.
      const scalar = (v: number) => v.toExponential();
      statements.push(
        `float surfaceFinishDistance=min(min(bz.x-(${scalar(bounds.x)}),${scalar(bounds.x+bounds.w)}-bz.x),min(bz.y-(${scalar(bounds.y)}),${scalar(bounds.y+bounds.h)}-bz.y));`,
        `float surfaceFinishWeight=smoothstep(0.0,${scalar(finish.featherM)},surfaceFinishDistance);`,
        `vec3 surfaceFinishNeutral=vec3(${finish.neutralLinear.map(scalar).join(",")});`,
        `diffuseColor.rgb=mix(diffuseColor.rgb,surfaceFinishNeutral+${scalar(finish.contrast)}*(diffuseColor.rgb-surfaceFinishNeutral),surfaceFinishWeight);`,
      );
    }
  }
  return `{vec2 bz=vFloorWorldPos.xz;${statements.join('\n')}}`;
}

/** Controlled B courtyard solid intervals. Collision never calls this function. */
export function courtyardVisualSegments(segment: BoundarySegment): BoundarySegment[] {
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
export function roofFragments(instance: WallDetailInstance, coverage: readonly number[][]): WallDetailInstance[] {
  if (!/roof_slab|roof_parapet|roof_coping|roof_finish/.test(instance.meshId+":"+(instance.semanticClass??""))) return [instance];
  if (Math.abs(Math.sin(instance.yawRad*2))>1e-6 || instance.pitchRad || instance.rollRad) return [instance];
  return rectangularFragments(instance, coverage);
}

function rectangularFragments(instance: WallDetailInstance, coverage: readonly number[][]): WallDetailInstance[] {
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
