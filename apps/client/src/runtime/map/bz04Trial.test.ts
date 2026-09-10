import assert from "node:assert/strict";
import test from "node:test";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { bz04CourtyardVisualSegments, bz04RoofFragments } from "./bz04Trial";
import { buildAuthoredPlacements, validateBz04Bounds } from "./buildFacadeModels";
import type { PropModelLibrary } from "../render/models/PropModelLibrary";
import type { WallDetailInstance } from "./wallDetailKit";

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
