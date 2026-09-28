import assert from "node:assert/strict";
import test from "node:test";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { bz04FloorTreatmentShader, bz04CourtyardVisualSegments, bz04ReceiverFragments, bz04RoofFragments, bz04SectionVisualSegments, readBz04BoundaryCoverage } from "./bz04Trial";
import { createV3BoundaryFinishTrim } from "./buildBlockout";
import { buildAuthoredPlacements, validateBz04Bounds } from "./buildFacadeModels";
import type { PropModelLibrary } from "../render/models/PropModelLibrary";
import type { WallDetailInstance } from "./wallDetailKit";

test("complete sections retire exact disjoint spans without changing source or other faces", () => {
  const segment = { orientation: "vertical" as const, coord: 17, start: 0, end: 20, outward: -1 as const };
  const coverage = readBz04BoundaryCoverage([
    { orientation: "vertical", coord: 17, start: 0, end: 8 },
    { orientation: "vertical", coord: 17, start: 13, end: 14 },
  ]);
  assert.deepEqual(bz04SectionVisualSegments(segment, coverage).map(s => [s.start, s.end]), [[8,13], [14,20]]);
  assert.equal(segment.end, 20);
  assert.deepEqual(bz04SectionVisualSegments({...segment, coord: 18}, coverage), [{...segment, coord:18}]);
  assert.throws(() => readBz04BoundaryCoverage([{...coverage[0], end: Infinity}]), /Invalid/);
  assert.throws(() => readBz04BoundaryCoverage([{...coverage[0], start: 8, end: 8}]), /Invalid/);
});

test("courtyard render ownership cuts only the exact solid intervals and retains the outside wall", () => {
  const segment = {orientation:"horizontal" as const,coord:78,start:10,end:45,outward:1 as const};
  assert.deepEqual(bz04CourtyardVisualSegments(segment).map(s=>[s.start,s.end]),[[10,17],[21,34],[39,45]]);
  assert.deepEqual(segment,{orientation:"horizontal",coord:78,start:10,end:45,outward:1});
  assert.deepEqual(bz04CourtyardVisualSegments({...segment,coord:77}),[{...segment,coord:77}]);
});

test("roof retirement retains the outside fragments of a rotated legacy slab and every wall", () => {
  const roof: WallDetailInstance={placementId:"roof",meshId:"roof_slab",semanticClass:"roof_slab",wallMaterialId:"ph_sandstone_blocks_05",trimMaterialId:"ph_stone_trim_sandstone",position:{x:0,y:10,z:0},scale:{x:8,y:.2,z:4},yawRad:Math.PI/2};
  const pieces=bz04RoofFragments(roof,[[-1,-2,1,2]]);
  assert.equal(pieces.reduce((area,p)=>area+p.scale.x*p.scale.z,0),24);
  assert.ok(pieces.every(p=>p.position.y===10&&p.scale.y===.2));
  const wall={...roof,meshId:"facade_wall_shell" as const,semanticClass:"wall"};
  assert.deepEqual(bz04RoofFragments(wall,[[-20,-20,20,20]]),[wall]);
});

test("mobile roof batching canonicalizes Blender suffixes, preserves receiving-only shadows and legacy models", () => {
  const make=(id:string):Group=>{
    const root=new Group();const material=new MeshStandardMaterial();material.name=id==="a"?"ph_bz04_stone_trim_sandstone":"ph_bz04_stone_trim_sandstone.001";
    const mesh=new Mesh(new BoxGeometry(1,1,1),material);mesh.position.y=.5;mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh);
    if(id!=="legacy")Object.assign(root.userData,{bz04RoofBundle:id,bz04VisualBounds:{min:[-.5,0,-.5],max:[.5,1,.5]}});
    return root;
  };
  const library={hasModel:()=>true,instantiate:make} as unknown as PropModelLibrary;
  const result=buildAuthoredPlacements(["a","b","legacy"].map((id,i)=>({id,unit:"fixture",materialIds:[],modelId:id,position:{x:i*2,y:0,z:10},yawDeg:180,role:"dressing" as const})),library,{wallMaterials:null,quality:"1k",seed:1});
  const batches=result.children.filter(c=>c.name.startsWith("bz04-roof-batch:"));
  assert.equal(batches.length,1);
  assert.equal((batches[0] as Mesh).castShadow,false);
  assert.deepEqual(batches[0]!.userData.bz04Contributors,["a","b"]);
  assert.ok(result.children.some(c=>c.name==="dressing:legacy"));
});

test("declared BZ-04 bounds reject escaped geometry and non-finite metadata", () => {
  const root=new Group();root.add(new Mesh(new BoxGeometry(1,1,1)));root.userData.bz04VisualBounds={min:[-.5,-.5,-.5],max:[.5,.5,.5]};
  assert.doesNotThrow(()=>validateBz04Bounds(root,"fixture"));
  root.children[0]!.position.x=.1;assert.throws(()=>validateBz04Bounds(root,"fixture"),/mismatch/);
  root.userData.bz04VisualBounds.max[0]=Infinity;assert.throws(()=>validateBz04Bounds(root,"fixture"),/invalid/);
});

test("roof planning overruns load during construction without losing geometry or bounds checks", () => {
  let allowance=0;
  const library={hasModel:()=>true,instantiate:(id:string)=>{
    const root=new Group();const material=new MeshStandardMaterial();material.name=id;
    root.add(new Mesh(new BoxGeometry(1,1,1),material));
    Object.assign(root.userData,{bz04RoofBundle:id,bz04VisualBounds:{min:[-.5,-.5,-.5],max:[.5,.5,.5]},bz04RoofPhasePrimitiveAllowance:id==="roof-0"?allowance:0});
    return root;
  }} as unknown as PropModelLibrary;
  const placements=Array.from({length:12},(_,i)=>({id:`roof-${i}`,modelId:`roof-${i}`,unit:"fixture",materialIds:[],position:{x:i*2,y:0,z:10},yawDeg:180,role:"dressing" as const}));
  const build=()=>buildAuthoredPlacements(placements,library,{wallMaterials:null,quality:"1k",seed:1});
  const result=build();
  assert.equal(result.userData.bz04RoofPrimitiveCounts.actual,12);
  assert.equal(result.userData.bz04RoofPrimitiveCounts.planning,11);
  assert.equal(result.userData.bz04RoofPrimitiveCounts.performanceDeferred,true);
  assert.equal(result.children.length,12);
  assert.equal(result.children.reduce((count,child)=>count+(child as Mesh).geometry.index!.count/3,0),144);
  allowance=1;assert.equal(build().userData.bz04RoofPrimitiveCounts.actual,12);
  allowance=-1;assert.throws(build,/Invalid per-area/);
});


test("receiver clipping retains exact outside strips, metadata and rotated non-crossing details", () => {
  const wall: WallDetailInstance={placementId:"backing",meshId:"facade_wall_shell",position:{x:22,y:5,z:61},scale:{x:8.4,y:7,z:3.3},yawRad:Math.PI/2,wallMaterialId:"ph_lime_plaster_sun",trimMaterialId:null,semanticClass:"wall"};
  const coverage=[{orientation:"vertical" as const,coord:19,start:56,end:64}];
  const [fragment]=bz04ReceiverFragments(wall,coverage);
  assert.ok(fragment);
  assert.ok(Math.abs(fragment.position.z-fragment.scale.x/2-64)<1e-6);
  assert.ok(Math.abs(fragment.position.z+fragment.scale.x/2-65.2)<1e-6);
  assert.equal(fragment.scale.y,wall.scale.y);assert.equal(fragment.scale.z,wall.scale.z);
  assert.equal(fragment.wallMaterialId,wall.wallMaterialId);assert.equal(fragment.semanticClass,wall.semanticClass);
  const outside={...wall,position:{...wall.position,z:70},pitchRad:.1};
  assert.equal(bz04ReceiverFragments(outside,coverage)[0],outside);
  const covered={...wall,scale:{...wall.scale,x:1},pitchRad:.1};
  assert.deepEqual(bz04ReceiverFragments(covered,coverage),[]);
  assert.throws(()=>bz04ReceiverFragments({...wall,pitchRad:.1},coverage),/crosses rotated legacy detail/);
  assert.deepEqual(bz04ReceiverFragments({...wall,rollRad:.025,semanticClass:"residential_plaster_repair"},coverage),[]);
  const outsidePatch={...outside,semanticClass:"residential_plaster_repair"};
  assert.equal(bz04ReceiverFragments(outsidePatch,coverage)[0],outsidePatch);
  assert.equal(wall.scale.x,8.4);
});


test("checked receiver junction suppresses only the synthetic boundary terminal", () => {
  const segment={orientation:"vertical" as const,coord:10,start:8,end:10,outward:-1 as const};
  const material=new MeshStandardMaterial();
  const build=(coverage: Parameters<typeof createV3BoundaryFinishTrim>[6]=[]) =>
    createV3BoundaryFinishTrim([segment],[4.9],[0],.3,material,1,coverage)!;
  const original=build();
  const replaced=build([{orientation:"horizontal",coord:10,start:3,end:10}]);
  const terminal=(root:Group)=>root.getObjectByName("map-pbr-boundary-terminal-returns-volume") as import("three").InstancedMesh;
  assert.equal(terminal(original).count,2);
  assert.equal(terminal(replaced).count,1);
  assert.deepEqual(terminal(replaced).userData.visualQaInstances.map((row:{placementId:string})=>row.placementId),
    ["V3_BOUNDARY_FINISH:10.0000:8.0000:terminal-return"]);
  for(const child of original.children.filter(c=>c.name!==terminal(original).name)) {
    const before=child as import("three").InstancedMesh;
    const after=replaced.getObjectByName(child.name) as import("three").InstancedMesh;
    assert.ok(after);assert.deepEqual(after.instanceMatrix.array,before.instanceMatrix.array);
    assert.deepEqual(after.userData,before.userData);
  }
  assert.equal(terminal(build([{orientation:"horizontal",coord:10.2,start:3,end:10}])).count,2);
  assert.equal(terminal(build([{orientation:"horizontal",coord:10,start:3,end:9}])).count,2);
  assert.deepEqual(segment,{orientation:"vertical",coord:10,start:8,end:10,outward:-1});
});


const floorTreatment = {
  receiver: "floor-fixture",
  trafficRegion: {x:21,y:14,w:12,h:18},
  trafficRoughnessDelta: -.025,
  trafficAlbedoDelta: 0,
  edgeDust: {widthM:.18,maxAlpha:.06,featherM:.06},
  faces: [],
};

function sampleFloorShader(shader: string, x: number, y: number, input: number[]) {
  const smoothstep = (low:number,high:number,value:number) => {
    const t = Math.max(0,Math.min(1,(value-low)/(high-low)));
    return t*t*(3-2*t);
  };
  return input.map((color,channel) => {
    // Execute the emitted scalar expressions; GLSL vector operations apply per channel.
    const body = shader.replace("vec2 bz=vFloorWorldPos.xz;", "")
      .replace(/vec3\(([^)]*)\)/g, (_match,values:string) => `(${values.split(",")[channel]})`)
      .replace(/\b(?:float|bool|vec3)\s+/g, "let ")
      .replace(/diffuseColor\.rgb/g, "color");
    return new Function("bz","color","roughnessFactor","min","max","smoothstep","mix", `${body};return color;`)(
      {x,y},color,.8,Math.min,Math.max,smoothstep,(a:number,b:number,t:number)=>a+(b-a)*t,
    ) as number;
  });
}

test("floor surface finish stays inside its opted-in region with a smooth boundary", () => {
  const surfaceFinish = {region:{x:21,y:14,w:12,h:18},contrast:.4,neutralLinear:[.3,.4,.5],featherM:1};
  const shader = bz04FloorTreatmentShader({...floorTreatment,surfaceFinish}, "floor-fixture");
  const input = [.8,.6,.2];
  const expected = [.5,.48,.38];
  const close = (actual:number[],target:number[]) => actual.forEach((value,i) => assert.ok(Math.abs(value-target[i]!)<1e-10));
  close(sampleFloorShader(shader,27,23,input), expected);
  for (const [x,y] of [[21,23],[33,23],[27,14],[27,32],[20.5,23],[33.5,23],[27,13.5],[27,32.5]]) {
    close(sampleFloorShader(shader,x!,y!,input), input);
  }
  close(sampleFloorShader(shader,21.5,23,input), [.65,.54,.29]);
  const nearEdge = sampleFloorShader(shader,21.001,23,input);
  assert.ok(Math.abs(nearEdge[0]!-input[0]!)<.000001);
  assert.equal(bz04FloorTreatmentShader({...floorTreatment,surfaceFinish}, "another-floor"), "");
  const identity = bz04FloorTreatmentShader({...floorTreatment,surfaceFinish:{...surfaceFinish,contrast:1}}, "floor-fixture");
  close(sampleFloorShader(identity,27,23,input), input);
  const tinyFeather = bz04FloorTreatmentShader({...floorTreatment,surfaceFinish:{...surfaceFinish,featherM:1e-8}}, "floor-fixture");
  close(sampleFloorShader(tinyFeather,27,23,input), expected);
  const negativeOrigin = bz04FloorTreatmentShader({...floorTreatment,surfaceFinish:{...surfaceFinish,region:{x:-12,y:-18,w:12,h:18}}}, "floor-fixture");
  close(sampleFloorShader(negativeOrigin,-6,-9,input), expected);
});

test("shared flagstone ignores old regional repaints while retaining traffic, edge dust and door exclusions", () => {
  const materialId = "bz04_court_limestone_flags_01";
  const treatment = {...floorTreatment, receiver:materialId, faces:[{
    face:"north",wallPlaneM:32,intervals:[[21,33]],doors:[{alongM:27,widthM:1}],
  }]};
  const shared = bz04FloorTreatmentShader(treatment, materialId);
  for (const [contrast,neutralLinear] of [[.36,[.49,.42,.32]],[.32,[.49,.42,.32]],[.55,[.34,.235,.125]],[.6,[.34,.235,.125]]] as const) {
    const shader = bz04FloorTreatmentShader({...treatment,surfaceFinish:{
      region:{x:21,y:14,w:12,h:18},contrast,neutralLinear:[...neutralLinear],featherM:1,
    }}, materialId);
    assert.equal(shader, shared);
    assert.deepEqual(sampleFloorShader(shader,27,23,[.8,.6,.2]), [.8,.6,.2]);
    assert.deepEqual(sampleFloorShader(shader,27,31.95,[.8,.6,.2]), [.8,.6,.2]);
    const dusty = sampleFloorShader(shader,24,31.95,[.8,.6,.2]);
    [.788,.5976,.218].forEach((value,i) => assert.ok(Math.abs(dusty[i]!-value)<1e-10));
  }
});

test("legacy floor treatments emit the same roughness and edge dust shader without surface finish", () => {
  const shader = bz04FloorTreatmentShader(floorTreatment, "floor-fixture");
  assert.equal(shader, `{vec2 bz=vFloorWorldPos.xz;if (bz.x>=21.000000 && bz.x<=33.000000 && bz.y>=14.000000 && bz.y<=32.000000) roughnessFactor=max(0.04,roughnessFactor+-0.025000);
float edgeDistance=100.0; bool doorService=false;
float edgeDust=doorService?0.0:0.060000*(1.0-smoothstep(0.120000,0.180000,edgeDistance));
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.60,0.56,0.50),edgeDust);}`);
  assert.deepEqual(sampleFloorShader(shader,27,23,[.8,.6,.2]), [.8,.6,.2]);
});

test("floor surface finish rejects malformed dimensions, contrast, neutral color and feather", () => {
  const valid = {region:{x:21,y:14,w:12,h:18},contrast:.4,neutralLinear:[.3,.4,.5],featherM:1};
  const malformed: unknown[] = [null,{}, {...valid,region:null},
    ...["x","y","w","h"].flatMap(key => [NaN,Infinity,-Infinity].map(value => ({...valid,region:{...valid.region,[key]:value}}))),
    ...[0,-1].flatMap(value => ["w","h"].map(key => ({...valid,region:{...valid.region,[key]:value}}))),
    ...[NaN,Infinity,-.1,1.1,"0.4"].map(contrast => ({...valid,contrast})),
    ...[NaN,Infinity,0,-1,6.1].map(featherM => ({...valid,featherM})),
    ...[null,[],new Array(3),[.3,.4],[.3,.4,.5,.6],[NaN,.4,.5],[.3,Infinity,.5],[.3,.4,-.1],[.3,1.1,.5],["0.3",.4,.5]].map(neutralLinear => ({...valid,neutralLinear})),
  ];
  for (const surfaceFinish of malformed) {
    for (const receiver of ["floor-fixture", "bz04_court_limestone_flags_01"]) {
      assert.throws(() => bz04FloorTreatmentShader({...floorTreatment,receiver,surfaceFinish}, receiver), /Invalid BZ04 floor surface finish/);
    }
  }
});
