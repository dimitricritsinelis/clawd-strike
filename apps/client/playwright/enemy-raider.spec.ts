import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { advanceRuntime, buildRuntimeUrl, readRuntimeState, waitForRuntimeReady } from "../scripts/lib/runtimePlaywright.mjs";

test("Blender raider plants feet, animates independent clones, and retains the garage", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/enemy-raider-test", (route) => route.fulfill({
    contentType: "text/html", body: "<html><body></body></html>",
  }));
  await page.goto("/enemy-raider-test");
  const result = await page.evaluate(async () => {
    const visualUrl = "/src/runtime/enemies/EnemyVisual.ts";
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const loaderUrl = "/node_modules/three/examples/jsm/loaders/GLTFLoader.js";
    const surfaceUrl = "/src/runtime/sim/TraversalSurfaceResolver.ts";
    const { EnemyVisual, preloadEnemyVisualAssets } = await import(visualUrl);
    const { Scene, Vector3 } = await import(threeUrl);
    const { GLTFLoader } = await import(loaderUrl);
    const { TraversalSurfaceResolver } = await import(surfaceUrl);
    const scene = new Scene();
    const loader = new GLTFLoader();
    await preloadEnemyVisualAssets();
    const first = new EnemyVisual("First", scene, loader);
    const second = new EnemyVisual("Second", scene, loader);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const root = scene.children[0];
    const otherRoot = scene.children[1];
    const left = root.getObjectByName("Foot_L");
    const right = root.getObjectByName("Foot_R");
    if (!left || !right) throw new Error("Candidate failed to load skinned feet");
    const point = (bone: any) => bone.getWorldPosition(new Vector3()).toArray();
    first.update(0,0,0,0,true,1/60,true);
    // Match the renderer's world/bind-matrix update before sampling skinned vertices.
    root.updateMatrixWorld(true);
    const legLengths = ["R","L"].map(side=>{
      const hip=root.getObjectByName("Thigh_"+side).getWorldPosition(new Vector3());
      const knee=root.getObjectByName("Shin_"+side).getWorldPosition(new Vector3());
      const ankle=root.getObjectByName("Foot_"+side).getWorldPosition(new Vector3());
      return [hip.distanceTo(knee),knee.distanceTo(ankle)];
    });
    const standingHipHeight=root.getObjectByName("Thigh_R").getWorldPosition(new Vector3()).y;
    const legSamples=["Raider_High","Raider_Low"].flatMap(name=>{
      const mesh=root.getObjectByName(name);
      mesh.skeleton.update();
      const positions=mesh.geometry.getAttribute("position");
      const indices=mesh.geometry.getAttribute("skinIndex");
      const weights=mesh.geometry.getAttribute("skinWeight");
      const samples=[];
      for(let i=0;i<positions.count;i++) {
        if(positions.getY(i)<0 || positions.getY(i)>.64)continue;
        let rightWeight=0;
        for(let component=0;component<4;component++) {
          if(mesh.skeleton.bones[indices.getComponent(i,component)].name.endsWith("_R"))rightWeight+=weights.getComponent(i,component);
        }
        const foot=rightWeight>.5?right:left;
        const local=mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld)
          .applyMatrix4(foot.matrixWorld.clone().invert());
        samples.push({mesh,index:i,foot,local,boot:positions.getY(i)<=.24});
      }
      return samples;
    });
    const bootSamples=legSamples.filter(sample=>sample.boot);
    let bootDeformation=0;
    let bootWorst: unknown=null;
    const measureBoots=()=>{
      root.updateMatrixWorld(true);
      for(const sample of bootSamples) {
        sample.mesh.skeleton.update();
        const local=sample.mesh.getVertexPosition(sample.index,new Vector3()).applyMatrix4(sample.mesh.matrixWorld)
          .applyMatrix4(sample.foot.matrixWorld.clone().invert());
        const deviation=local.distanceTo(sample.local);
        if(deviation>bootDeformation) {
          bootDeformation=deviation;
          bootWorst={mesh:sample.mesh.name,index:sample.index,foot:sample.foot.name};
        }
      }
    };
    let strafeBootClearance=Infinity;
    let strafeLegClearance=Infinity;
    const measureStrafeClearance=()=>{
      root.updateMatrixWorld(true);
      for(const name of ["Raider_High","Raider_Low"]) {
        const mesh=root.getObjectByName(name);
        mesh.skeleton.update();
        let bootLeft=-Infinity,bootRight=Infinity,legLeft=-Infinity,legRight=Infinity;
        for(const sample of legSamples) {
          if(sample.mesh!==mesh)continue;
          const x=mesh.getVertexPosition(sample.index,new Vector3()).applyMatrix4(mesh.matrixWorld).x;
          if(sample.foot===right) {
            legRight=Math.min(legRight,x);
            if(sample.boot)bootRight=Math.min(bootRight,x);
          } else {
            legLeft=Math.max(legLeft,x);
            if(sample.boot)bootLeft=Math.max(bootLeft,x);
          }
        }
        strafeBootClearance=Math.min(strafeBootClearance,bootRight-bootLeft);
        strafeLegClearance=Math.min(strafeLegClearance,legRight-legLeft);
      }
    };
    second.update(3,0,0,0,true,1/60,true);
    const otherRest = point(otherRoot.getObjectByName("Foot_R"));
    const frames: { left: number[]; right: number[] }[] = [];
    for (let frame = 1; frame <= 90; frame++) {
      first.update(0,0,-frame*1.1/60,0,true,1/60,true);
      frames.push({left:point(left),right:point(right)});
      if(frame%10===0)measureBoots();
    }
    const otherAfter = point(otherRoot.getObjectByName("Foot_R"));
    const frozen = point(right);
    first.update(0,0,-90*1.1/60,0,true,0,true);
    const paused = point(right);
    const socket = root.getObjectByName("MuzzleSocket");
    const beforeFire = point(socket);
    first.triggerShotFx();
    first.update(0,0,-90*1.1/60,0,true,1/60,true);
    const afterFire = point(socket);
    const chest=root.getObjectByName("Chest");
    const torsoStart=chest.quaternion.toArray();
    for(let frame=0;frame<180;frame++) {
      if(frame%10===0)first.triggerShotFx();
      first.update(0,0,-90*1.1/60,0,true,1/60,true);
    }
    for(let frame=0;frame<90;frame++)first.update(0,0,-90*1.1/60,0,true,1/60,true);
    const torsoSettled=chest.quaternion.toArray();
    first.update(0,0,-90*1.1/60,0,true,1/60,true,undefined,30);
    const farLod = {high:root.getObjectByName("Raider_High").visible,low:root.getObjectByName("Raider_Low").visible};
    first.reset();
    first.update(0,0,0,0,true,1/60,true);
    const reset = point(right);
    const ramp = new TraversalSurfaceResolver([{id:"ramp",zoneId:"test",kind:"ramp",rect:{x:-4,y:-4,w:8,h:8},axis:"y",startElevationM:.8,endElevationM:0}]);
    const rampSamples = [];
    for (let frame=1; frame<=60; frame++) {
      const z=-frame*1.1/60;
      first.update(0,.4-z*.1,z,0,true,1/60,true,ramp);
      rampSamples.push([point(left),point(right)]);
      if(frame%10===0)measureBoots();
    }
    const slopeRotations=[];
    for(let frame=0;frame<180;frame++) {
      first.update(0,.51,-1.1,0,true,1/60,true,ramp);
      if(frame>120)slopeRotations.push(right.getWorldQuaternion(chest.quaternion.clone()).toArray());
    }
    let runLegLengthError=0;
    let passingHipHeight=Infinity;
    let passingHipSamples=0;
    for(const speed of [1.1,3]) for(const [dx,dz] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      first.reset();
      first.update(0,0,0,0,true,1/60,true);
      for(let frame=1;frame<=90;frame++) {
        first.update(dx!*frame*speed/60,0,dz!*frame*speed/60,0,true,1/60,true);
        for(const side of ["R","L"]) {
          const hip=root.getObjectByName("Thigh_"+side).getWorldPosition(new Vector3());
          const knee=root.getObjectByName("Shin_"+side).getWorldPosition(new Vector3());
          const ankle=root.getObjectByName("Foot_"+side).getWorldPosition(new Vector3());
          const phase=first.animation.motion.phase % .5;
          if(frame>30 && phase>.22 && phase<.28) {
            passingHipHeight=Math.min(passingHipHeight,hip.y);
            passingHipSamples++;
          }
          runLegLengthError=Math.max(runLegLengthError,Math.abs(hip.distanceTo(knee)-.45),Math.abs(knee.distanceTo(ankle)-.43));
        }
        if(frame%15===0)measureBoots();
        if(dx && frame%3===0)measureStrafeClearance();
      }
    }

    const animation = first.animation;
    const feet = (): { planted: boolean; position: number[] }[] => animation.legs.map((leg: any) => ({
      planted: leg.planted,
      position: leg.foot.getWorldPosition(new Vector3()).toArray() as number[],
    }));
    let plantedSamples = 0, plantedGroundError = 0, plantedFrameDrift = 0, transitionFrameTravel = 0;
    const measurePlant = (previous: ReturnType<typeof feet>, current: ReturnType<typeof feet>, slopeX: number, slopeZ: number) => {
      for (let leg = 0; leg < 2; leg++) {
        const before = previous[leg]!, after = current[leg]!;
        const p = after.position;
        if (after.planted) {
          plantedSamples++;
          plantedGroundError = Math.max(plantedGroundError, Math.abs(p[1]! - slopeX * p[0]! - slopeZ * p[2]! - .13));
        }
        if (before.planted && after.planted) {
          plantedFrameDrift = Math.max(plantedFrameDrift, Math.hypot(...p.map((value, axis) => value - before.position[axis]!)));
        }
      }
    };
    for (const axis of ["x", "y"] as const) for (const slope of [-.15, .15]) {
      const slopeX = axis === "x" ? slope : 0, slopeZ = axis === "y" ? slope : 0;
      const surface = new TraversalSurfaceResolver([{
        id: "plant-reach", zoneId: "test", kind: "ramp", rect: { x: -100, y: -100, w: 200, h: 200 },
        axis, startElevationM: -100 * slope, endElevationM: 100 * slope,
      }]);
      for (const [dx, dz] of [[0, -1.1], [0, 1.1], [-1.1, 0], [1.1, 0], [0, -3], [3, 0]]) {
        first.reset();
        first.update(0, 0, 0, 0, true, 1 / 60, true, surface);
        let previous = feet();
        for (let frame = 1; frame <= 180; frame++) {
          const x = dx! * frame / 60, z = dz! * frame / 60;
          first.update(x, slopeX * x + slopeZ * z, z, 0, true, 1 / 60, true, surface);
          const current = feet();
          if (frame > 60) measurePlant(previous, current, slopeX, slopeZ);
          previous = current;
        }
      }
    }
    for (const [dx, dz, yawRate] of [[0, 1.1, 0], [1.1, 0, 0], [0, -1.1, Math.PI]]) {
      first.reset();
      first.update(0, 0, 0, 0, true, 1 / 60, true);
      let x = 0, z = 0, yaw = 0, previous = feet();
      for (let frame = 0; frame < 150; frame++) {
        x += (frame < 90 ? 0 : dx!) / 60;
        z += (frame < 90 ? -1.1 : dz!) / 60;
        if (frame >= 90) yaw += yawRate! / 60;
        first.update(x, 0, z, yaw, true, 1 / 60, true);
        const current = feet();
        if (frame >= 90) {
          measurePlant(previous, current, 0, 0);
          for (let leg = 0; leg < 2; leg++) transitionFrameTravel = Math.max(transitionFrameTravel,
            Math.hypot(...current[leg]!.position.map((value: number, axis: number) => value - previous[leg]!.position[axis]!)));
        }
        previous = current;
      }
    }
    first.dispose(scene);
    second.update(3,0,-.1,0,true,1/60,true);
    const survivor = point(otherRoot.getObjectByName("Foot_R"));
    second.dispose(scene);
    // Cache hits resolve asynchronously too: disposal before resolution must
    // never add a model back to a detached/disposed instance.
    const pending = new EnemyVisual("Disposed",scene,loader);
    const pendingRoot=scene.children[0];
    pending.dispose(scene);
    await new Promise((resolve)=>setTimeout(resolve,0));
    const attachedAfterDispose=!!pendingRoot.getObjectByName("RaiderRig");
    history.replaceState(null,"","?raider=legacy");
    await preloadEnemyVisualAssets();
    const legacy = new EnemyVisual("Garage",scene,loader);
    await new Promise((resolve)=>setTimeout(resolve,0));
    const legacyRoot=scene.children[0];
    const legacyHasRig=!!legacyRoot.getObjectByName("RaiderRig");
    const legacyHasModel=legacyRoot.children.some((child:any)=>child.isGroup && child.children.some((c:any)=>c.type==="Group"));
    legacy.dispose(scene);
    return {plantedSamples,plantedGroundError,plantedFrameDrift,transitionFrameTravel,frames,legLengths,standingHipHeight,bootSampleCount:bootSamples.length,bootDeformation,bootWorst,runLegLengthError,passingHipHeight,passingHipSamples,strafeBootClearance,strafeLegClearance,otherRest,otherAfter,frozen,paused,beforeFire,afterFire,torsoStart,torsoSettled,slopeRotations,farLod,reset,rampSamples,survivor,attachedAfterDispose,legacyHasRig,legacyHasModel,remaining:scene.children.length};
  });
  expect(result.plantedSamples).toBeGreaterThan(1000);
  expect(result.plantedGroundError).toBeLessThan(.003);
  expect(result.plantedFrameDrift).toBeLessThan(.003);
  // Catch the original 55 cm reversal teleport without confusing this bound
  // with an artistic quality assessment.
  expect(result.transitionFrameTravel).toBeLessThan(.14);
  expect(result.otherAfter).toEqual(result.otherRest);
  expect(result.standingHipHeight).toBeGreaterThan(.945);
  expect(result.standingHipHeight).toBeLessThan(.965);
  expect(result.bootSampleCount).toBeGreaterThan(100);
  expect(result.bootDeformation,JSON.stringify(result.bootWorst)).toBeLessThan(.001);
  // At passing, the supporting leg should extend under the hip instead of
  // carrying the low contact pose through the whole gait (the squat walk).
  expect(result.passingHipSamples).toBeGreaterThan(20);
  expect(result.passingHipHeight).toBeGreaterThan(.97);
  expect(result.runLegLengthError).toBeLessThan(.001);
  expect(result.strafeBootClearance).toBeGreaterThan(.01);
  expect(result.strafeLegClearance).toBeGreaterThan(.01);
  expect(Math.abs(result.legLengths[0]![0]!-result.legLengths[1]![0]!)).toBeLessThan(.001);
  expect(Math.abs(result.legLengths[0]![1]!-result.legLengths[1]![1]!)).toBeLessThan(.001);
  expect(result.paused).toEqual(result.frozen);
  expect(result.afterFire).not.toEqual(result.beforeFire);
  expect(result.afterFire[1]).toBeGreaterThan(result.beforeFire[1]!);
  const quaternionAngle=(a:number[],b:number[])=>2*Math.acos(Math.min(1,Math.abs(a.reduce((sum,v,i)=>sum+v*b[i]!,0))));
  expect(quaternionAngle(result.torsoStart,result.torsoSettled)).toBeLessThan(.04);
  expect(Math.max(...result.slopeRotations.map(q=>quaternionAngle(q,result.slopeRotations[0]!)))).toBeLessThan(.01);
  expect(result.farLod).toEqual({high:false,low:true});
  // Mid stance in the second cycle: the boot remains fixed in world X/Z.
  const planted=result.frames.slice(65,83).map((frame)=>frame.right);
  expect(Math.max(...planted.map(p=>p[2]!))-Math.min(...planted.map(p=>p[2]!))).toBeLessThan(.008);
  expect(Math.max(...result.frames.map(frame=>frame.left[1]!))).toBeGreaterThan(.19);
  expect(Math.min(...result.frames.map(frame=>frame.right[1]!))).toBeGreaterThan(.115);
  const rampClearances=result.rampSamples.flatMap((feet)=>feet.map(p=>p[1]!-(.4-p[2]!*.1)));
  expect(Math.min(...rampClearances)).toBeGreaterThan(.11);
  expect(Math.min(...rampClearances)).toBeLessThan(.15);
  expect(result.reset[2]).toBeGreaterThan(-.5);
  expect(result.survivor.every(Number.isFinite)).toBe(true);
  expect(result.attachedAfterDispose).toBe(false);
  expect(result.legacyHasRig).toBe(false);
  expect(result.legacyHasModel).toBe(true);
  expect(result.remaining).toBe(0);
  expect(errors).toEqual([]);
});

for (const variant of ["next","legacy"]) test(`the live game loads ${variant} and keeps ten active raiders`, async ({ page }, testInfo) => {
  const errors: string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  const requests: string[]=[];
  page.on("request",request=>{if(request.url().includes("enemy_raider"))requests.push(request.url());});
  await page.goto(buildRuntimeUrl(testInfo.project.use.baseURL as string, {
    autostart:"human",agentName:"RaiderReview",extraSearchParams:{debug:1,god:1,raider:variant,vm:0},
  }), {waitUntil:"domcontentloaded"});
  await waitForRuntimeReady(page,{routeId:"raider-game"});
  await advanceRuntime(page,1000);
  const initial=await readRuntimeState(page);
  const target=initial.bots.enemies.find((enemy:any)=>enemy.health>0);
  expect(target).toBeTruthy();
  await page.evaluate((enemy:any)=>{
    window.__debug_set_player_pose?.({x:enemy.position.x,y:enemy.position.y,z:enemy.position.z-4,yawDeg:180});
  },target);
  await advanceRuntime(page,3000);
  const state=await readRuntimeState(page);
  const perf=await page.evaluate(()=>window.__debug_render_perf?.());
  const output=path.resolve("../../artifacts/raider-review");
  await mkdir(output,{recursive:true});
  await page.screenshot({path:path.join(output,`in-game-${variant}.png`)});
  await writeFile(path.join(output,`in-game-${variant}.json`),JSON.stringify({state,perf,requests,errors},null,2));
  expect(requests.some(url=>url.includes(variant==="next"?"enemy_raider_next/raider.glb":"enemy_raider/model.glb"))).toBe(true);
  expect(state.bots.aliveCount).toBe(10);
  if(variant==="next")expect(JSON.stringify(perf)).toContain("Raider_High");
  expect(errors).toEqual([]);
});

test("raider bind knees match the mesh and boots face forward at both LODs", async ({ page }) => {
  await page.route("**/raider-anatomy-test", route => route.fulfill({
    contentType: "text/html", body: "<html><body></body></html>",
  }));
  await page.goto("/raider-anatomy-test");
  const samples = await page.evaluate(async () => {
    const loaderUrl = '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
    const threeUrl = '/node_modules/.vite/deps/three.js';
    const { GLTFLoader } = await import(loaderUrl);
    const { Vector3 } = await import(threeUrl);
    const gltf = await new GLTFLoader().loadAsync('/assets/models/characters/enemy_raider_next/raider.glb');
    const results = [];
    const quantile = (values: number[], fraction: number) => {
      values.sort((a,b)=>a-b);
      const position = (values.length-1)*fraction;
      const low = Math.floor(position), blend = position-low;
      return values[low]*(1-blend)+values[Math.ceil(position)]*blend;
    };
    for (const name of ['Raider_High','Raider_Low']) {
      const mesh = gltf.scene.getObjectByName(name);
      const positions = mesh.geometry.getAttribute('position');
      const indices = mesh.geometry.getAttribute('skinIndex');
      const weights = mesh.geometry.getAttribute('skinWeight');
      for (const side of ['R','L']) {
        const kneeIndex = mesh.skeleton.bones.findIndex(bone=>bone.name==='Shin_'+side);
        const footIndex = mesh.skeleton.bones.findIndex(bone=>bone.name==='Foot_'+side);
        const knee = new Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[kneeIndex].clone().invert());
        const foot = new Vector3().setFromMatrixPosition(mesh.skeleton.boneInverses[footIndex].clone().invert());
        const slice = [], sole = [], points = [], sideWeights = [];
        for (let vertex=0;vertex<positions.count;vertex++) {
          let legWeight=0, footWeight=0;
          for(let component=0;component<4;component++) {
            const boneIndex=indices.getComponent(vertex,component);
            const weight=weights.getComponent(vertex,component);
            if(mesh.skeleton.bones[boneIndex].name.endsWith('_'+side))legWeight+=weight;
            if(boneIndex===footIndex)footWeight+=weight;
          }
          const point=new Vector3().fromBufferAttribute(positions,vertex).applyMatrix4(mesh.bindMatrix);
          points.push(point);sideWeights.push(legWeight);
          if(footWeight>.99 && point.y<foot.y-.02)sole.push(point);
        }
        // Intersect the triangle surface, so sparse distant-LOD vertices cannot
        // bias the result toward one side of the joint. Sample by edge length.
        const triangles=mesh.geometry.index;
        for(let triangle=0;triangle<(triangles?.count??positions.count);triangle+=3) {
          const corners=[0,1,2].map(corner=>triangles?triangles.getX(triangle+corner):triangle+corner);
          const intersections=[];
          for(let edge=0;edge<3;edge++) {
            const a=corners[edge],b=corners[(edge+1)%3];
            if((points[a].y-knee.y)*(points[b].y-knee.y)>=0)continue;
            const alpha=(knee.y-points[a].y)/(points[b].y-points[a].y);
            if(sideWeights[a]*(1-alpha)+sideWeights[b]*alpha<.99)continue;
            intersections.push(points[a].clone().lerp(points[b],alpha));
          }
          if(intersections.length!==2)continue;
          const steps=Math.max(1,Math.ceil(intersections[0].distanceTo(intersections[1])/.005));
          for(let step=0;step<steps;step++)slice.push(intersections[0].clone().lerp(intersections[1],(step+.5)/steps));
        }
        const center=(axis: 'x' | 'z')=>(quantile(slice.map(p=>p[axis]),.05)+quantile(slice.map(p=>p[axis]),.95))/2;
        const kneeOffset=Math.hypot(center('x')-knee.x,center('z')-knee.z);
        const meanX=sole.reduce((sum,p)=>sum+p.x,0)/sole.length;
        const meanZ=sole.reduce((sum,p)=>sum+p.z,0)/sole.length;
        let xx=0,xz=0,zz=0;
        for(const point of sole) {
          const x=point.x-meanX,z=point.z-meanZ;
          xx+=x*x;xz+=x*z;zz+=z*z;
        }
        // The long sole axis must follow the authored +X forward direction.
        // PCA ignores toe/heel sign, which is sufficient to catch ankle yaw.
        const soleHeadingDegrees=Math.abs(.5*Math.atan2(2*xz,xx-zz)*180/Math.PI);
        results.push({mesh:name,side,kneeSamples:slice.length,soleVertices:sole.length,kneeOffset,soleHeadingDegrees});
      }
    }
    return results;
  });
  expect(samples).toHaveLength(4);
  for (const sample of samples) {
    const label = JSON.stringify(sample);
    expect(sample.kneeSamples, label).toBeGreaterThan(100);
    expect(sample.soleVertices, label).toBeGreaterThan(30);
    expect.soft(sample.kneeOffset, label).toBeLessThan(.03);
    expect.soft(sample.soleHeadingDegrees, label).toBeLessThan(15);
  }
});


test("raider GLB embeds the reviewed material maps", async () => {
  const directory = path.resolve("public/assets/models/characters/enemy_raider_next");
  const glb = await readFile(path.join(directory, "raider.glb"));
  const jsonLength = glb.readUInt32LE(12);
  const document = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
  const binaryStart = 28 + jsonLength;
  const material = document.materials.find((entry: any) => entry.name === "Raider_WeatheredKhaki_PBR");
  for (const [texture, filename] of [
    [material.pbrMetallicRoughness.baseColorTexture, "raider-albedo.jpg"],
    [material.normalTexture, "raider-normal.jpg"],
    [material.pbrMetallicRoughness.metallicRoughnessTexture, "raider-orm.png"],
  ] as const) {
    const image = document.images[document.textures[texture.index].source];
    const view = document.bufferViews[image.bufferView];
    const start = binaryStart + (view.byteOffset ?? 0);
    const exported = glb.subarray(start, start + view.byteLength);
    const reviewed = await readFile(path.join(directory, filename));
    // Imported packed images used to silently export the unedited donor bytes.
    expect(exported.equals(reviewed), filename).toBe(true);
  }
});
