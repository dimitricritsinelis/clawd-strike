import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type InstancedMesh } from "three";
import type { WallMaterialLibrary } from "../../render/materials/WallMaterialLibrary";
import { buildWallDetailMeshes, type WallDetailInstance } from "./wallDetailKit";
import {
  buildArchitecture,
  type ArchitectureMassingPlacement,
  type ArchitecturePlacement,
  type FacadeProfile,
  type MassingProfile,
} from "./architecture";
import { buildAuthoredPlacements, buildSectionModels } from "../sections/buildFacadeModels";
import type { PropModelLibrary } from "../../render/models/PropModelLibrary";
import { parseBlockoutSpec } from "../spec/parseMapSpec";
import type { RuntimeBlockoutZone } from "../spec/types";

const massingProfiles: MassingProfile[] = [
  {
    id: "mass_mid",
    label: "Mid",
    heightM: 7,
    depthM: 3,
    roofStyle: "flat_parapet",
    roofSetbackM: 0,
    parapetHeightM: 0.42,
    upperStorySetbackM: 0,
  },
];

const materialSlots = {
  wall: "ph_lime_plaster_sun",
  trim: "ph_trim_sanded_01",
  roof: "ph_aged_plaster_ochre",
  timber: "ph_rough_pine_door",
  metal: "ph_trim_sanded_01",
  accent: "ph_band_lime_soft",
};

const facadeProfiles: FacadeProfile[] = [
  {
    id: "active_merchant",
    label: "Merchant",
    family: "active_merchant",
    massingProfileId: "mass_mid",
    materialSlots,
    moduleIds: [
      "shop_recess_market",
      "door_shop_timber",
      "door_fortified_gate",
      "window_shuttered",
      "window_screened",
      "vent_service",
      "arch_arcade",
      "column_arcade",
      "blind_niche",
    ],
  },
  {
    id: "quiet_residential",
    label: "Residential",
    family: "quiet_residential",
    massingProfileId: "mass_mid",
    materialSlots,
    moduleIds: ["door_residential_timber", "window_screened", "window_dark_recess", "blind_niche"],
  },
  {
    id: "service_storage",
    label: "Service",
    family: "service_storage",
    massingProfileId: "mass_mid",
    materialSlots,
    moduleIds: ["door_storage_heavy", "vent_service", "blind_niche"],
  },
  {
    id: "hero_courtyard",
    label: "Hero courtyard",
    family: "hero_courtyard",
    massingProfileId: "mass_mid",
    materialSlots,
    moduleIds: [
      "arch_hero_courtyard",
      "door_residential_timber",
      "window_screened",
      "window_landmark_stained",
      "blind_niche",
    ],
  },
];

const zones: RuntimeBlockoutZone[] = [{
  id: "ARBITRARY_ZONE_ID",
  type: "side_hall",
  rect: { x: 10, y: 10, w: 8, h: 12 },
  label: "Authored side-lane frontage",
  notes: "Profile—not zone id—owns the architecture.",
  facadeProfileId: "active_merchant",
}];

function massingPlacement(
  profileId = "active_merchant",
  id = "ARCH_MASSING_001",
  options: {
    heightM?: number;
    roofStyle?: "flat_parapet" | "setback_flat";
    roofSetbackM?: number;
    upperStorySetbackM?: number;
  } = {},
): ArchitecturePlacement {
  const heightM = options.heightM ?? 7;
  return {
    id,
    kind: "massing",
    frontageId: "FRONTAGE_001",
    zoneId: "ARBITRARY_ZONE_ID",
    face: "west",
    profileId,
    massingProfileId: "mass_mid",
    center: { x: 8.5, y: 16, z: heightM * 0.5 },
    sizeM: { width: 10, depth: 3, height: heightM },
    yawDeg: 90,
    materialSlots,
    roof: {
      style: options.roofStyle ?? "flat_parapet",
      setbackM: options.roofSetbackM ?? 0,
      parapetHeightM: 0.42,
      upperStorySetbackM: options.upperStorySetbackM ?? 0,
      elevationM: heightM,
    },
  };
}

function modulePlacement(
  id: string,
  moduleId: string,
  moduleKind: "shop_recess" | "door" | "window" | "vent" | "arch" | "column" | "blind_niche",
  center: { x: number; y: number; z: number },
  profileId = "active_merchant",
): ArchitecturePlacement {
  return {
    id,
    kind: "facade_module",
    frontageId: "FRONTAGE_001",
    zoneId: "ARBITRARY_ZONE_ID",
    face: "west",
    profileId,
    moduleId,
    moduleKind,
    openingType: moduleKind === "window" ? "window_void" : moduleKind === "door" ? "door_void" : "recess",
    datumId: center.z > 3 ? "STORY_1_SILL_3.35" : "GROUND_HEAD_2.70",
    columnId: `COLUMN_${id}`,
    layoutSource: "generated",
    center,
    sizeM: { width: moduleKind === "column" ? 0.4 : 1.4, depth: 0.16, height: moduleKind === "column" ? 3 : 2.2 },
    yawDeg: 90,
    materialSlot: moduleKind === "column" ? "trim" : "timber",
    collisionOpening: false,
  };
}

function build(
  placements: ArchitecturePlacement[],
  validateCutoutMassing = false,
  profiles: FacadeProfile[] = facadeProfiles,
) {
  return buildArchitecture({
    placements,
    massingProfiles,
    facadeProfiles: profiles,
    segments: [{ orientation: "vertical", coord: 10, start: 10, end: 22, outward: -1 }],
    zones,
    traversalSurfaces: [],
    wallHeightM: 9.5,
    validateCutoutMassing,
  });
}

test("massing placements set wall heights and emit no render geometry of their own", () => {
  const placements = [
    massingPlacement(),
    modulePlacement("MOD_SHOP", "shop_recess_market", "shop_recess", { x: 10, y: 14, z: 1.35 }),
    modulePlacement("MOD_DOOR", "door_shop_timber", "door", { x: 10, y: 17, z: 1.175 }),
    modulePlacement("MOD_WINDOW", "window_shuttered", "window", { x: 10, y: 17, z: 3.575 }),
  ];
  const snapshot = structuredClone(placements);
  for (const validateCutoutMassing of [false, true]) {
    const result = build(placements, validateCutoutMassing);
    assert.deepEqual(placements, snapshot, "architecture build mutated compiled placements");
    assert.deepEqual(result.segmentHeights, [7]);
    assert.deepEqual(result.instances, []);
    assert.equal(result.stats.instanceCount, 0);
    assert.equal(result.stats.segmentsDecorated, 1);
    assert.equal("colliders" in result, false);
    assert.equal("lineOfSight" in result, false);
    assert.deepEqual(result, build(placements, validateCutoutMassing));
  }
});

test("the compiled bazaar spec passes every massing check and renders only foundations and coping", () => {
  const compiled = parseBlockoutSpec(
    JSON.parse(readFileSync(new URL("../../../../public/maps/bazaar-map/map_spec.json", import.meta.url), "utf8")),
    "compiled bazaar-map/map_spec.json",
  );
  const input = {
    placements: compiled.architecturePlacements ?? [],
    zones: compiled.zones,
    traversalSurfaces: compiled.traversalSurfaces ?? [],
  };
  const snapshot = structuredClone(input);
  for (const validateCutoutMassing of [false, true]) {
    const result = buildArchitecture({
      ...input,
      massingProfiles: compiled.massingProfiles ?? [],
      facadeProfiles: compiled.facadeProfiles ?? [],
      segments: [],
      wallHeightM: compiled.defaults.wall_height,
      validateCutoutMassing,
    });
    assert.deepEqual(input, snapshot, "architecture build mutated the compiled spec");
    assert.ok(result.instances.length > 0);
    assert.ok(result.instances.every((instance) => (
      instance.moduleId === "elevation_foundation"
      || instance.moduleId === "elevation_retaining_cheek"
      || instance.moduleId === "elevation_retaining_cap"
      || instance.placementId === "ARCH_RUG_GATE_WEST_NORTH_WALL_COPING"
    )), "a massing placement emitted render geometry");
  }
});

test("massing checks reject invalid size, roof, apertures, recesses and boundary infill", () => {
  const sized = massingPlacement() as ArchitectureMassingPlacement;
  sized.sizeM.depth = 0;
  assert.throws(() => build([sized]), /'ARCH_MASSING_001' has invalid depth=0/);

  const roofless = massingPlacement() as ArchitectureMassingPlacement;
  roofless.roof.setbackM = 4.8;
  assert.throws(() => build([roofless]), /massing 'ARCH_MASSING_001' roof setback consumes the roof footprint/);

  const door = () => modulePlacement("MOD_DOOR", "door_shop_timber", "door", { x: 10, y: 16, z: 1.1 });

  const turned = massingPlacement() as ArchitectureMassingPlacement;
  turned.yawDeg = 0;
  assert.doesNotThrow(() => build([turned, door()]), "yaw is only checked with cutout massing checks");
  assert.throws(
    () => build([turned, door()], true),
    /massing 'ARCH_MASSING_001' yaw does not orient its removable face toward 'west'/,
  );

  const otherFace = door();
  if (otherFace.kind !== "facade_module") throw new Error("fixture drift");
  otherFace.face = "east";
  assert.throws(
    () => build([massingPlacement(), otherFace], true),
    /module 'MOD_DOOR' does not belong to massing 'ARCH_MASSING_001' frontage face/,
  );

  const outside = modulePlacement("MOD_OUTSIDE", "door_shop_timber", "door", { x: 10, y: 21.5, z: 1.1 });
  assert.throws(
    () => build([massingPlacement(), outside], true),
    /module 'MOD_OUTSIDE' cutout does not fit massing 'ARCH_MASSING_001' face/,
  );

  const deepShop = modulePlacement("MOD_DEEP_SHOP", "shop_recess_market", "shop_recess", { x: 10, y: 16, z: 1.35 });
  if (deepShop.kind !== "facade_module") throw new Error("fixture drift");
  deepShop.sizeM.depth = 2;
  const shallow = massingPlacement() as ArchitectureMassingPlacement;
  shallow.sizeM.depth = 2;
  assert.throws(
    () => build([shallow, deepShop], true),
    /massing depth 2 cannot back a 2m shop recess with 0.12m construction clearance/,
  );

  // A 3 cm edge strip beside a door cannot keep its 2 cm return clearance.
  const tight = massingPlacement() as ArchitectureMassingPlacement;
  tight.sizeM = { width: 1.46, depth: 3, height: 4.5 };
  tight.center = { ...tight.center, z: 2.25 };
  tight.roof.setbackM = 0;
  assert.throws(
    () => build([tight, door()], true),
    /massing 'ARCH_MASSING_001' boundary infill 1 cannot fit shared-shell return clearance/,
  );

  // A narrow edge strip needs a full-width upper mass above it.
  const narrow = massingPlacement() as ArchitectureMassingPlacement;
  narrow.sizeM = { width: 1, depth: 3, height: 4.5 };
  narrow.center = { ...narrow.center, z: 2.25 };
  const narrowDoor = door();
  const highWindow = modulePlacement("MOD_HIGH_WINDOW", "window_shuttered", "window", { x: 10, y: 16, z: 3.75 });
  if (narrowDoor.kind !== "facade_module" || highWindow.kind !== "facade_module") throw new Error("fixture drift");
  narrowDoor.sizeM = { width: 0.8, depth: 0.16, height: 2.2 };
  highWindow.sizeM = { width: 0.5, depth: 0.16, height: 1.5 };
  assert.throws(
    () => build([narrow, narrowDoor, highWindow], true),
    /boundary infill \d+ has only 0.100m tangent width; a skyline-visible corner requires at least 0.62m/,
  );
});

test("wall detail kit renders foundations, trim and coping in blockout and PBR", () => {
  const instances: WallDetailInstance[] = [
    {
      placementId: "ELEVATION_FOUNDATION:TERRACE",
      moduleId: "elevation_foundation",
      semanticClass: "terrace_retaining_mass",
      meshId: "facade_wall_shell",
      position: { x: 14, y: 0.69, z: 12 },
      scale: { x: 8, y: 1.38, z: 4 },
      yawRad: 0,
      wallMaterialId: "ph_sandstone_blocks_05",
      trimMaterialId: null,
    },
    {
      placementId: "ELEVATION_FOUNDATION:RAMP:cap:1",
      moduleId: "elevation_retaining_cap",
      semanticClass: "ramp_retaining_cap",
      meshId: "plinth_strip",
      position: { x: 17.88, y: 0.78, z: 18 },
      scale: { x: 0.24, y: 0.14, z: 8 },
      yawRad: 0,
      pitchRad: -0.17,
      wallMaterialId: null,
      trimMaterialId: "ph_sandstone_blocks_05",
    },
    {
      placementId: "ARCH_RUG_GATE_WEST_NORTH_WALL_COPING",
      moduleId: "rug_gate_connector_wall_mitred_coping",
      semanticClass: "structural_wall_top_coping",
      meshId: "roof_slab",
      position: { x: 10, y: 7.09, z: 20 },
      scale: { x: 0.38, y: 0.18, z: 4 },
      yawRad: 0,
      wallMaterialId: null,
      trimMaterialId: "ph_stone_trim_sandstone",
    },
  ];
  const baseOptions = { quality: "1k" as const, seed: 23 };
  const blockout = buildWallDetailMeshes(instances, { ...baseOptions, wallMode: "blockout", wallMaterials: null });
  assert.deepEqual(
    blockout.children.map((child) => child.name),
    ["wall-detail-facade_wall_shell", "wall-detail-plinth_strip", "wall-detail-roof_slab"],
  );
  const blockoutCoping = blockout.getObjectByName("wall-detail-roof_slab") as InstancedMesh;
  assert.deepEqual(blockoutCoping.userData.visualQaInstances[0]?.dimensions, instances[2]!.scale);
  assert.equal(blockoutCoping.userData.visualQaInstances[0]?.placementId, "ARCH_RUG_GATE_WEST_NORTH_WALL_COPING");
  assert.equal(blockoutCoping.userData.visualQa.materialMode, "blockout");
  assert.equal((blockout.getObjectByName("wall-detail-plinth_strip") as InstancedMesh).castShadow, false);
  assert.equal(blockoutCoping.castShadow, true);

  const wallMaterials = {
    getMaterialIds: () => ["ph_sandstone_blocks_04", "ph_sandstone_blocks_05", "ph_stone_trim_sandstone"],
    createStandardMaterial: () => new MeshStandardMaterial({ color: 0xb8aa92 }),
    getTileSizeM: () => 2,
  } as unknown as WallMaterialLibrary;
  const pbr = buildWallDetailMeshes(instances, { ...baseOptions, wallMode: "pbr", wallMaterials });
  assert.deepEqual(pbr.children.map((child) => child.name), [
    "wall-detail-facade_wall_shell-ph_sandstone_blocks_05",
    "wall-detail-plinth_strip-ph_sandstone_blocks_05",
    "wall-detail-roof_slab-ph_stone_trim_sandstone",
  ]);
  const [shell, trim, coping] = pbr.children as InstancedMesh[];
  const materialOf = (mesh: InstancedMesh | undefined): MeshStandardMaterial => mesh!.material as MeshStandardMaterial;
  assert.match(materialOf(shell).customProgramCacheKey(), /kit-finish:merchant-plaster/);
  assert.equal(materialOf(trim).userData.wallUvProjection, "world", "plinth trim projects its texture in world metres");
  assert.equal(trim!.userData.visualQa.uvProjection, "world");
  assert.equal(materialOf(trim).roughness, 0.86);
  assert.equal(materialOf(trim).polygonOffset, true);
  assert.equal(coping!.userData.visualQa.uvProjection, "default");
  assert.notEqual(materialOf(shell), materialOf(trim), "wall and trim finishes stay separate materials");

  const shader = {
    vertexShader: "#include <common>\n#include <worldpos_vertex>",
    fragmentShader: "#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>",
    uniforms: {},
  };
  materialOf(trim).onBeforeCompile(shader as never, {} as never);
  assert.match(shader.vertexShader, /wallProjectedUv/);
  assert.match(
    shader.vertexShader,
    /inverseTransformDirection\(transformedNormal, viewMatrix\)/,
    "world projection must reuse Three's inverse-scale-corrected normal",
  );

  const missing = buildWallDetailMeshes(
    [{ ...instances[2]!, trimMaterialId: "ph_missing" }, { ...instances[1]!, trimMaterialId: "ph_missing" }],
    { ...baseOptions, wallMode: "pbr", wallMaterials },
  );
  assert.deepEqual(missing.children.map((child) => child.name), [
    "wall-detail-roof_slab-template",
    "wall-detail-plinth_strip-ph_stone_trim_sandstone",
  ], "a missing roof material keeps the template; trim falls back to the stone trim material");
});

test("elevated terrace and ramp foundations close visible under-surface gaps without colliders", () => {
  const result = buildArchitecture({
    placements: [massingPlacement()],
    massingProfiles,
    facadeProfiles,
    segments: [{ orientation: "vertical", coord: 10, start: 10, end: 22, outward: -1 }],
    zones,
    traversalSurfaces: [
      { id: "TERRACE", zoneId: "ARBITRARY_ZONE_ID", kind: "flat", rect: { x: 10, y: 10, w: 8, h: 4 }, elevationM: 1.4 },
      {
        id: "RAMP",
        zoneId: "ARBITRARY_ZONE_ID",
        kind: "ramp",
        rect: { x: 10, y: 14, w: 8, h: 8 },
        axis: "y",
        startElevationM: 0,
        endElevationM: 1.4,
        visualStyle: "ramp",
      },
    ],
    wallHeightM: 9.5,
  });
  const foundations = result.instances.filter((instance) => instance.moduleId === "elevation_foundation");
  assert.equal(foundations.filter((instance) => instance.semanticClass === "terrace_retaining_mass").length, 1);
  assert.equal(foundations.filter((instance) => instance.semanticClass === "ramp_foundation").length, 9);
  assert.ok(foundations.every((instance) => instance.meshId === "facade_wall_shell"));
  const terraceFoundation = foundations.find((instance) => instance.semanticClass === "terrace_retaining_mass")!;
  const terraceBottomM = terraceFoundation.position.y - terraceFoundation.scale.y * 0.5;
  const terraceTopM = terraceFoundation.position.y + terraceFoundation.scale.y * 0.5;
  assert.ok(Math.abs(terraceBottomM) < 1e-6, "terrace retaining mass must remain grounded at y=0");
  assert.ok(
    terraceTopM < 1.39 && terraceTopM > 1.36,
    `terrace retaining top must clear the authored 1.4m paving plane, got ${terraceTopM}`,
  );
  const cheeks = result.instances.filter((instance) => instance.semanticClass === "ramp_retaining_cheek");
  const caps = result.instances.filter((instance) => instance.semanticClass === "ramp_retaining_cap");
  assert.equal(cheeks.length, 18);
  assert.equal(caps.length, 2);
  assert.ok(caps.every((instance) => instance.meshId === "plinth_strip"));
  assert.ok(caps.every((instance) => Math.abs(instance.pitchRad ?? 0) > 0.1));
  assert.ok(cheeks.every((instance) => instance.scale.y <= 1.4));
});

test("v3 renderer rejects unresolved modules and refuses to bury future collision openings", () => {
  const unknown = modulePlacement("MOD_UNKNOWN", "made_up_module", "window", { x: 10, y: 16, z: 4 });
  assert.throws(() => build([massingPlacement(), unknown]), /outside profile/);
  const unknownProfile = modulePlacement("MOD_NO_PROFILE", "window_screened", "window", { x: 10, y: 16, z: 4 }, "made_up_profile");
  assert.throws(() => build([massingPlacement(), unknownProfile]), /references unknown facade profile 'made_up_profile'/);
  const emptyTimber = facadeProfiles.map((profile) => ({ ...profile, materialSlots: { ...profile.materialSlots, timber: "" } }));
  const window = modulePlacement("MOD_EMPTY_SLOT", "window_screened", "window", { x: 10, y: 16, z: 4 });
  assert.throws(() => build([massingPlacement(), window], false, emptyTimber), /resolves an empty 'timber' material slot/);
  const flat = modulePlacement("MOD_FLAT", "window_screened", "window", { x: 10, y: 16, z: 4 });
  if (flat.kind !== "facade_module") throw new Error("fixture drift");
  flat.sizeM.depth = 0;
  assert.throws(() => build([massingPlacement(), flat]), /'MOD_FLAT' has invalid depth=0/);

  const connector = modulePlacement("MOD_OPEN", "door_shop_timber", "door", { x: 10, y: 16, z: 1.2 });
  if (connector.kind !== "facade_module") throw new Error("fixture drift");
  connector.collisionOpening = true;
  assert.throws(
    () => build([massingPlacement(), connector], true),
    /cannot place a closed backing volume behind collision opening 'MOD_OPEN'/,
  );
});

test("authored plaster faces use the wall wear profile in placement and section GLBs", () => {
  const placementSource = new Group();
  const placementWall = new Mesh(new BoxGeometry(6, 3, 0.1), new MeshStandardMaterial({ name: "ph_lime_plaster_sun" }));
  placementWall.position.y = 1.5;
  placementSource.add(placementWall);
  const sectionSource = new Group();
  const sectionWall = placementWall.clone();
  sectionWall.position.set(3, 1.5, 1.5);
  sectionSource.add(sectionWall);
  const models = {
    hasModel: () => true,
    instantiate: (modelId: string) => (modelId === "plaster-section" ? sectionSource : placementSource).clone(true),
  } as unknown as PropModelLibrary;
  const wallMaterials = {
    getMaterialIds: () => ["ph_lime_plaster_sun"],
    createStandardMaterial: () => new MeshStandardMaterial({ color: 0xeadfc9 }),
    getTileSizeM: () => 2,
  } as unknown as WallMaterialLibrary;

  const placementRoot = buildAuthoredPlacements([
    { id: "PLASTER", unit: "fixture", modelId: "plaster", materialIds: ["ph_lime_plaster_sun"], position: { x: 0, y: 0, z: 0 }, yawDeg: 0, role: "dressing" },
  ], models, { wallMaterials, quality: "1k", seed: 1 });
  const sectionRoot = buildSectionModels([
    { zoneId: "PLASTER", modelId: "plaster-section", origin: { x: 0, y: 0, z: 0 }, sizeM: { width: 6, depth: 3 }, faces: ["north"], materialIds: ["ph_lime_plaster_sun"] },
  ], models, { wallMaterials, quality: "1k", seed: 1 });

  for (const root of [placementRoot, sectionRoot]) {
    const material = (root.children[0]!.children[0] as Mesh).material as MeshStandardMaterial;
    assert.match(material.customProgramCacheKey(), /:wear:/, "the plaster face receives repairs, chips, and datum drips");
  }
});

test("checked ramp-edge receivers retire only covered caps and cheeks and preserve foundation bodies", () => {
  for (const axis of ["x","y"] as const) {
    const surface={id:"RAMP_RECEIVER",zoneId:"ARBITRARY_ZONE_ID",kind:"ramp" as const,
      rect:{x:10,y:14,w:8,h:8},axis,startElevationM:0,endElevationM:1.4};
    const options={placements:[massingPlacement()],massingProfiles,facadeProfiles,
      segments:[{orientation:"vertical" as const,coord:10,start:10,end:22,outward:-1 as const}],
      zones,traversalSurfaces:[surface],wallHeightM:9.5};
    const original=buildArchitecture(options);
    const coverage={orientation:axis==="y"?"vertical" as const:"horizontal" as const,
      coord:axis==="y"?18:22,start:axis==="y"?14:10,end:axis==="y"?22:18};
    const replaced=buildArchitecture({...options,bz04BoundaryCoverage:[coverage]});
    const capId="ELEVATION_FOUNDATION:RAMP_RECEIVER:cap:1";
    assert.ok(original.instances.some(i=>i.placementId===capId));
    assert.ok(!replaced.instances.some(i=>i.placementId?.startsWith(capId)));
    const preserved=(rows:typeof original.instances)=>rows.filter(i=>i.moduleId==="elevation_foundation" || i.placementId?.includes(":cap:-1") || i.placementId?.includes(":cheek:-1"));
    assert.deepEqual(preserved(replaced.instances),preserved(original.instances));
    assert.deepEqual(replaced.segmentHeights,original.segmentHeights);
    const halfway=(coverage.start+coverage.end)/2;
    const partial=buildArchitecture({...options,bz04BoundaryCoverage:[{...coverage,start:halfway}]});
    const cap=partial.instances.find(i=>i.placementId?.startsWith(capId))!;
    const oldCap=original.instances.find(i=>i.placementId===capId)!;
    assert.ok(cap);
    const component=axis==="y"?"z":"x";
    const angle=axis==="y"?-(cap.pitchRad??0):(cap.rollRad??0);
    assert.ok(Math.abs(cap.position[component]+cap.scale[component]*Math.cos(angle)/2-halfway)<1e-6);
    assert.ok(Math.abs(cap.position.y-oldCap.position.y-(cap.position[component]-oldCap.position[component])*Math.tan(angle))<1e-6);
    assert.equal(cap.scale.y,oldCap.scale.y);
    assert.equal(cap.pitchRad,oldCap.pitchRad);assert.equal(cap.rollRad,oldCap.rollRad);
    assert.deepEqual(buildArchitecture({...options,bz04BoundaryCoverage:[{...coverage,coord:coverage.coord+.1}]}).instances,original.instances);
  }
});

test("ramp foundation bodies clear both rising and falling floors without moving their footprint or base", () => {
  for (const axis of ["x","y"] as const) for (const descending of [false,true]) {
    const surface={id:"CLEAR_RAMP",zoneId:"ARBITRARY_ZONE_ID",kind:"ramp" as const,
      rect:{x:10,y:14,w:8,h:8},axis,startElevationM:descending?1.4:0,endElevationM:descending?0:1.4};
    const options={placements:[massingPlacement()],massingProfiles,facadeProfiles,
      segments:[],zones,traversalSurfaces:[surface],wallHeightM:9.5};
    const result=buildArchitecture(options);
    const bodies=result.instances.filter(i=>i.semanticClass==="ramp_foundation");
    assert.equal(bodies.length,9);
    for(const body of bodies) {
      assert.ok(body.placementId);
      const index=Number(body.placementId.split(":").at(-1))-1;
      const low=Math.min(...[index/10,(index+1)/10].map(t=>surface.startElevationM+(surface.endElevationM-surface.startElevationM)*t));
      const top=body.position.y+body.scale.y/2;
      assert.ok(Math.abs(body.position.y-body.scale.y/2)<1e-6);
      assert.ok(Math.abs(top-(low-.02))<1e-6);
      assert.equal(body.scale[axis==="x"?"x":"z"],.81);
      const component=axis==="x"?"x":"z";
      const start=axis==="x"?surface.rect.x:surface.rect.y;
      assert.ok(Math.abs(body.position[component]-(start+8*(index+.5)/10))<1e-6);
      assert.equal(body.position[axis==="x"?"z":"x"],axis==="x"?18:14);
      for(const along of [body.position[component]-body.scale[component]/2,body.position[component]+body.scale[component]/2]) {
        const floor=surface.startElevationM+(along-start)/8*(surface.endElevationM-surface.startElevationM);
        assert.ok(top<floor,`foundation top ${top} intersects floor ${floor}`);
      }
    }
    assert.equal(result.instances.filter(i=>i.semanticClass==="ramp_retaining_cap").length,2);
    const tiny=buildArchitecture({...options,traversalSurfaces:[{...surface,startElevationM:descending ? .04 : 0,endElevationM:descending ? 0 : .04}]});
    assert.equal(tiny.instances.filter(i=>i.semanticClass==="ramp_foundation").length,0,"sub-minimum bodies must not be forced through the floor");
    assert.equal(tiny.instances.filter(i=>i.semanticClass==="ramp_retaining_cap").length,2);
  }
});
