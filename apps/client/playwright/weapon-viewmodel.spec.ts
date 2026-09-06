import { expect, test } from "@playwright/test";
import type { Bone, Object3D, Skeleton, SkinnedMesh } from "three";

test("Blender AK grips the magazine through reload and restores its approved idle on cancellation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/weapon-viewmodel-test", (route) => route.fulfill({
    contentType: "text/html", body: "<html><body></body></html>",
  }));
  await page.goto("/weapon-viewmodel-test");
  const result = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/weapons/Ak47AnimatedViewModel.ts";
    const { createAk47ViewModel } = await import(moduleUrl);
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const { Triangle, Euler } = await import(threeUrl);
    const vm = createAk47ViewModel({ vmDebug: false, search: "?weapon=next" });
    await vm.load();
    vm.setAspect(16 / 9);
    const camera = vm.viewModelCamera.clone(false);
    camera.rotation.set(0, 0, 0);
    vm.updateFromMainCamera(camera, 1 / 60);
    const scene = vm.viewModelScene;
    const bolt = scene.getObjectByName("Bolt");
    const magazine = scene.getObjectByName("Magazine");
    const hand = scene.getObjectByName("SupportHand");
    const flash = scene.getObjectByName("MuzzleFlame");
    const pose = scene.getObjectByName("AK47_AnimatedPose");
    const rig = scene.getObjectByName("AK47_Rig");
    const effects = scene.getObjectByName("AK47_Effects") as Object3D;
    const packageScale = {
      weapon: pose.scale.toArray(),
      rig: rig.getWorldScale(rig.position.clone()).toArray(),
      effects: effects.getWorldScale(effects.position.clone()).toArray(),
      muzzle: flash.parent.getWorldScale(flash.position.clone()).toArray(),
    };
    const gloveMaterial = (scene.getObjectByName("L_GloveAndForearm") as SkinnedMesh).material as import("three").MeshStandardMaterial;
    const handPosition = () => rig.worldToLocal(hand.getWorldPosition(hand.position.clone())).toArray();
    const handInMagazine = () => magazine.worldToLocal(hand.getWorldPosition(hand.position.clone())).toArray();
    const surfaceGap = (root: Object3D, point: import("three").Vector3): number => {
      let gap = Infinity;
      root.traverse((object: Object3D) => {
        const mesh = object as SkinnedMesh;
        if (mesh.isSkinnedMesh || !mesh.geometry) return;
        const position = mesh.geometry.getAttribute("position"), index = mesh.geometry.getIndex();
        const localPoint = mesh.worldToLocal(point.clone()), nearest = point.clone();
        const triangle = new Triangle();
        for (let i = 0; i < (index?.count ?? position.count); i += 3) {
          triangle.a.fromBufferAttribute(position, index ? index.getX(i) : i);
          triangle.b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1);
          triangle.c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2);
          triangle.closestPointToPoint(localPoint, nearest);
          gap = Math.min(gap, nearest.distanceTo(localPoint));
        }
      });
      return gap;
    };
    const rest = { bolt: bolt.position.x, magazine: magazine.position.toArray(), hand: handPosition() };
    const contactPosition = (name: string) => {
      const object = scene.getObjectByName(name) as Object3D;
      return rig.worldToLocal(object.getWorldPosition(object.position.clone()));
    };
    const elbow = scene.getObjectByName("L_forearm") as Object3D;
    const handScreen = hand.getWorldPosition(hand.position.clone()).project(vm.viewModelCamera);
    const elbowScreen = elbow.getWorldPosition(elbow.position.clone()).project(vm.viewModelCamera);
    // In the exported rig, negative Z is the rifle's left side; positive Z is right.
    const readyGrip = {
      thumbSide: contactPosition("GripContact_thumb").z,
      fingerSides: ["index", "middle", "ring", "pinky"].map((finger) => contactPosition("GripContact_f_" + finger).z),
      // The wrist stays on the near side while the knuckles cross underneath
      // the wood to the far side. Fingertip contact alone allowed a side pinch.
      palmAcrossGun: contactPosition("L_f_middle01").z - contactPosition("SupportHand").z,
      palmHeight: (contactPosition("L_f_middle01").y + contactPosition("SupportHand").y) / 2,
      armSlope: Math.abs((handScreen.x - elbowScreen.x) * vm.viewModelCamera.aspect / (handScreen.y - elbowScreen.y)),
      elbowBelowHand: elbowScreen.y < handScreen.y,
    };
    vm.triggerShotFx();
    vm.updateFromMainCamera(camera, .1);
    const fired = { bolt: bolt.position.x, flash: flash.visible, rise: pose.rotation.x };
    const frozen = { bolt: bolt.position.toArray(), pose: pose.position.toArray(), rotation: pose.rotation.toArray() };
    vm.updateFromMainCamera(camera, 0);
    const paused = { bolt: bolt.position.toArray(), pose: pose.position.toArray(), rotation: pose.rotation.toArray() };
    const lowFpsBolt: number[] = [];
    for (let shot = 0; shot < 5; shot++) {
      vm.triggerShotFx();
      vm.updateFromMainCamera(camera, .1);
      lowFpsBolt.push(bolt.position.x);
    }
    vm.updateFromMainCamera(camera, .1);
    const flashEnded = !flash.visible;
    vm.setAmmoState({ mag: 12, reserve: 90, reloading: true, reloadT01: .5 });
    vm.updateFromMainCamera(camera, 0);
    const reload = { magazine: magazine.position.toArray(), hand: handPosition(), contactAo: gloveMaterial.aoMapIntensity };
    vm.setAmmoState({ mag: 12, reserve: 90, reloading: false, reloadT01: 0 });
    vm.updateFromMainCamera(camera, 0);
    const cancelled = { magazine: magazine.position.toArray(), hand: handPosition(), contactAo: gloveMaterial.aoMapIntensity };
    const contact: number[][] = [];
    const reloadContact = { maxAnchorGap: 0, maxRotationDriftDeg: 0, maxFingerGap: 0, opposedThumb: true };
    const thumbPad = { maxGap: 0, minNormalAlignment: 1, maxMeshMismatch: 0, maxDrift: 0 };
    const padPositions = new Map<string, import("three").Vector3>();
    let gripRotation: import("three").Quaternion | null = null;
    const contactProgress = [...Array.from({ length: 87 }, (_, frame) => (32 + frame) / 147), .22, .30, .42, .55, .70, .79];
    for (const progress of contactProgress) {
      vm.setAmmoState({ mag: 12, reserve: 90, reloading: true, reloadT01: progress });
      vm.updateFromMainCamera(camera, 0);
      contact.push(handInMagazine());
      const anchor = scene.getObjectByName("MagazineGripAnchor") as Object3D;
      reloadContact.maxAnchorGap = Math.max(reloadContact.maxAnchorGap,
        hand.getWorldPosition(hand.position.clone()).distanceTo(anchor.getWorldPosition(anchor.position.clone())));
      const relativeRotation = magazine.getWorldQuaternion(magazine.quaternion.clone()).invert().multiply(hand.getWorldQuaternion(hand.quaternion.clone()));
      gripRotation ??= relativeRotation.clone();
      reloadContact.maxRotationDriftDeg = Math.max(reloadContact.maxRotationDriftDeg, relativeRotation.angleTo(gripRotation) * 180 / Math.PI);
      for (const finger of ["f_index", "f_middle", "f_ring", "f_pinky"]) {
        const marker = scene.getObjectByName("GripContact_" + finger) as Object3D;
        const position = marker.getWorldPosition(marker.position.clone());
        reloadContact.maxFingerGap = Math.max(reloadContact.maxFingerGap, surfaceGap(magazine, position));
        const side = magazine.worldToLocal(position).z;
        reloadContact.opposedThumb &&= side > .015;
      }
      const thumbBone = scene.getObjectByName("L_thumb03") as Bone;
      const glove = scene.getObjectByName("L_GloveAndForearm") as SkinnedMesh;
      const meshPositions = glove.geometry.getAttribute("position");
      for (const name of ["ThumbPadContact", "ThumbPadContact1", "ThumbPadContact2"]) {
        const marker = scene.getObjectByName(name) as Object3D;
        const worldPoint = marker.getWorldPosition(marker.position.clone());
        const localPoint = magazine.worldToLocal(worldPoint.clone());
        reloadContact.opposedThumb &&= localPoint.z < 0;
        thumbPad.maxGap = Math.max(thumbPad.maxGap, surfaceGap(magazine, worldPoint));
        const previous = padPositions.get(name);
        if (previous) thumbPad.maxDrift = Math.max(thumbPad.maxDrift, previous.distanceTo(localPoint));
        else padPositions.set(name, localPoint.clone());
        const normal = worldPoint.clone().fromArray(marker.userData.padNormalLocal)
          .applyQuaternion(thumbBone.getWorldQuaternion(thumbBone.quaternion.clone())).normalize();
        const intoLeftFace = worldPoint.clone().set(0, 0, 1)
          .applyQuaternion(magazine.getWorldQuaternion(magazine.quaternion.clone()));
        thumbPad.minNormalAlignment = Math.min(thumbPad.minNormalAlignment, normal.dot(intoLeftFace));
        // These markers must lie on the rendered skin, not merely be convenient
        // empty nodes that touch the gun while the visible thumb floats away.
        if (!previous) {
          let nearest = Infinity;
          const vertex = worldPoint.clone();
          for (let i = 0; i < meshPositions.count; i++) {
            glove.applyBoneTransform(i, vertex.fromBufferAttribute(meshPositions, i)).applyMatrix4(glove.matrixWorld);
            nearest = Math.min(nearest, vertex.distanceTo(worldPoint));
          }
          thumbPad.maxMeshMismatch = Math.max(thumbPad.maxMeshMismatch, nearest);
        }
      }
    }
    const cancellations: number[][] = [];
    for (const progress of [.05, .14, .22, .40, .55, .79, .90, .99]) {
      vm.setAmmoState({ mag: 12, reserve: 90, reloading: true, reloadT01: progress });
      vm.updateFromMainCamera(camera, 0);
      vm.setAmmoState({ mag: 12, reserve: 90, reloading: false, reloadT01: 0 });
      vm.updateFromMainCamera(camera, 0);
      cancellations.push(handPosition());
    }
    // Check fore-end contact against rigid weapon surfaces, never the hand itself.
    const foreEndFingerGaps = ["thumb", "f_index", "f_middle", "f_ring", "f_pinky"].map((finger) => {
      const marker = scene.getObjectByName("GripContact_" + finger);
      const point = marker.getWorldPosition(marker.position.clone());
      return surfaceGap(rig, point);
    });
    const skins = new Map<string, number>();
    const skeletons: Skeleton[] = [];
    scene.traverse((object: Object3D) => {
      const mesh = object as SkinnedMesh;
      if (mesh.isSkinnedMesh) {
        const id = mesh.skeleton.bones.map((bone) => bone.uuid).join();
        if (!skins.has(id)) skeletons.push(mesh.skeleton);
        skins.set(id, mesh.skeleton.bones.length);
      }
    });
    const wrists = { maxBendDeg: 0, maxRelativeRotationDeg: 0, maxScaleError: 0, maxShear: 0 };
    const thumbFlexion = { minMcpDeg: Infinity, maxMcpDeg: -Infinity, minIpDeg: Infinity, maxIpDeg: -Infinity, maxOffAxisDeg: 0 };
    const thumbOpening = { maxFreeMcpDeg: 0, maxFreeIpDeg: 0, maxClosingReverseStepDeg: 0 };
    const previousClosingFlexion = new Map<string, number>();
    const previousArmRotations = new Map<string, import("three").Quaternion>();
    let maxArmStepDeg = 0;
    for (let frame = 0; frame <= 147; frame++) {
      vm.setAmmoState({ mag: 12, reserve: 90, reloading: true, reloadT01: frame / 147 });
      vm.updateFromMainCamera(camera, 0);
      for (const [name, joint] of [["L_thumb02", "Mcp"], ["L_thumb03", "Ip"]] as const) {
        const bone = scene.getObjectByName(name) as Bone;
        const skeleton = skeletons.find((skin) => skin.bones.includes(bone))!;
        const parentIndex = skeleton.bones.indexOf(bone.parent as Bone);
        const boneIndex = skeleton.bones.indexOf(bone);
        const restLocal = skeleton.boneInverses[parentIndex]!.clone().multiply(skeleton.boneInverses[boneIndex]!.clone().invert());
        const restRotation = bone.quaternion.clone().setFromRotationMatrix(restLocal);
        const rotation = restRotation.invert().multiply(bone.quaternion);
        const angles = new Euler().setFromQuaternion(rotation, "XYZ");
        const flexion = angles.x * 180 / Math.PI;
        thumbFlexion[`min${joint}Deg`] = Math.min(thumbFlexion[`min${joint}Deg`], flexion);
        thumbFlexion[`max${joint}Deg`] = Math.max(thumbFlexion[`max${joint}Deg`], flexion);
        thumbFlexion.maxOffAxisDeg = Math.max(thumbFlexion.maxOffAxisDeg, Math.hypot(angles.y, angles.z) * 180 / Math.PI);
        if ((frame >= 11 && frame <= 23) || (frame >= 125 && frame <= 136)) {
          thumbOpening[`maxFree${joint}Deg`] = Math.max(thumbOpening[`maxFree${joint}Deg`], flexion);
        }
        if (frame >= 23 && frame <= 32) {
          const previous = previousClosingFlexion.get(joint);
          if (previous !== undefined) thumbOpening.maxClosingReverseStepDeg = Math.max(thumbOpening.maxClosingReverseStepDeg, previous - flexion);
          previousClosingFlexion.set(joint, flexion);
        }
      }
      for (const name of ["L_upper_arm", "L_forearm", "SupportHand"]) {
        const bone = scene.getObjectByName(name) as Object3D;
        const rotation = rig.getWorldQuaternion(rig.quaternion.clone()).invert().multiply(bone.getWorldQuaternion(bone.quaternion.clone()));
        const previous = previousArmRotations.get(name);
        if (previous) maxArmStepDeg = Math.max(maxArmStepDeg, rotation.angleTo(previous) * 180 / Math.PI);
        previousArmRotations.set(name, rotation);
      }
      for (const [side, handName] of [["L", "SupportHand"]]) {
        const wrist = scene.getObjectByName(handName) as Bone;
        const forearm = scene.getObjectByName(side + "_forearm") as Bone;
        const distal = scene.getObjectByName(side + "_forearm001") as Bone;
        const knuckle = scene.getObjectByName(side + "_f_middle01") as Bone;
        const position = (object: Object3D) => object.getWorldPosition(object.position.clone());
        const armDirection = position(wrist).sub(position(forearm)).normalize();
        const palmDirection = position(knuckle).sub(position(wrist)).normalize();
        wrists.maxBendDeg = Math.max(wrists.maxBendDeg, armDirection.angleTo(palmDirection) * 180 / Math.PI);
        const skeleton = skeletons.find((skin) => skin.bones.includes(wrist))!;
        // Check skeletal deformation inside the rig, excluding the intentional
        // uniform scale of the complete first-person package.
        const deformation = (bone: Bone) => rig.matrixWorld.clone().invert().multiply(bone.matrixWorld).multiply(skeleton.boneInverses[skeleton.bones.indexOf(bone)]!);
        const handMatrix = deformation(wrist);
        const handRotation = wrist.quaternion.clone().setFromRotationMatrix(handMatrix);
        const armRotation = distal.quaternion.clone().setFromRotationMatrix(deformation(distal));
        wrists.maxRelativeRotationDeg = Math.max(wrists.maxRelativeRotationDeg, handRotation.angleTo(armRotation) * 180 / Math.PI);
        const axes = [0, 1, 2].map((column) => wrist.position.clone().setFromMatrixColumn(handMatrix, column));
        wrists.maxScaleError = Math.max(wrists.maxScaleError, ...axes.map((axis) => Math.abs(axis.length() - 1)));
        wrists.maxShear = Math.max(wrists.maxShear, Math.abs(axes[0]!.dot(axes[1]!)), Math.abs(axes[0]!.dot(axes[2]!)), Math.abs(axes[1]!.dot(axes[2]!)));
      }
    }
    vm.reset();
    const sequence = () => {
      vm.updateFromMainCamera(camera, 1 / 60);
      vm.triggerShotFx();
      vm.updateFromMainCamera(camera, 1 / 60);
      return effects.children.filter((child: { geometry?: { type: string }; visible: boolean }) =>
        child.geometry?.type === "CylinderGeometry" && child.visible,
      ).map((child: { position: { toArray(): number[] }; rotation: { toArray(): unknown[] } }) => ({ position: child.position.toArray(), rotation: child.rotation.toArray() }));
    };
    const firstSequence = sequence();
    const ejectedCase = effects.children.find((child: { geometry?: { type: string }; visible: boolean }) =>
      child.geometry?.type === "CylinderGeometry" && child.visible,
    );
    const caseStart = ejectedCase.position.clone();
    for (let frame = 0; frame < 5; frame++) vm.updateFromMainCamera(camera, .1);
    const caseTravel = ejectedCase.position.clone().sub(caseStart).toArray();
    vm.updateFromMainCamera(camera, .1);
    const caseExpired = !ejectedCase.visible;
    vm.reset();
    const resetSequence = sequence();
    vm.reset();
    vm.updateFromMainCamera(camera, 1 / 60);
    vm.updateFromMainCamera(camera, 1 / 60);
    const beforeCameraKick = pose.rotation.toArray();
    vm.reset();
    vm.updateFromMainCamera(camera, 1 / 60);
    camera.rotation.x += .15;
    camera.rotation.y += .10;
    vm.setFrameInput(0, true, 0, 0);
    vm.updateFromMainCamera(camera, 1 / 60);
    const afterCameraKick = pose.rotation.toArray();
    vm.reset();
    vm.triggerShotFx();
    vm.setAmmoState({ mag: 0, reserve: 90, reloading: true, reloadT01: 0 });
    vm.updateFromMainCamera(camera, 1 / 60);
    const finalRound = { bolt: bolt.position.x, flash: flash.visible };
    const socketParent = flash.parent.name;
    const hasRightHand = Boolean(scene.getObjectByName("R_Armature") || scene.getObjectByName("GripHand"));
    const texturedMaterials = new Set<string>();
    const detailTextures: { material: string; size: number; anisotropy: number }[] = [];
    let handContactOcclusion = false;
    scene.traverse((object: Object3D) => {
      const mesh = object as SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const pbr = material as import("three").MeshStandardMaterial;
        if (pbr.map && pbr.normalMap && pbr.roughnessMap) {
          texturedMaterials.add(pbr.name);
          for (const texture of [pbr.map, pbr.normalMap, pbr.roughnessMap]) {
            detailTextures.push({ material: pbr.name, size: Math.min(texture.image.width, texture.image.height), anisotropy: texture.anisotropy });
            const uv = mesh.geometry.getAttribute(texture.channel === 0 ? "uv" : "uv" + texture.channel);
            if (!uv || uv.count !== mesh.geometry.getAttribute("position").count) throw new Error("Missing detail UVs: " + mesh.name);
          }
        }
        if (pbr.name === "Urban Breacher glove" && pbr.aoMap) handContactOcclusion = true;
      }
    });
    const construction = ["Raised_tan_wrist_closure", "Raised_tan_closure_pull_tab", "Palm_heel_suede_overlay", "Tailored_ripstop_sleeve"].map((name) => {
      const object = scene.getObjectByName(name) as SkinnedMesh;
      return { name, skinned: Boolean(object?.isSkinnedMesh), castsShadow: object?.castShadow, receivesShadow: object?.receiveShadow };
    });
    // The reinforcement must reach the actual contact points of every digit,
    // not only have vertices weighted to the hand somewhere near the palm.
    const reinforcement = scene.getObjectByName("Palm_heel_suede_overlay") as SkinnedMesh;
    const paddedPositions = reinforcement.geometry.getAttribute("position");
    const fingertipPaddingGaps = ["thumb", "f_index", "f_middle", "f_ring", "f_pinky"].map((finger) => {
      const marker = scene.getObjectByName("GripContact_" + finger) as Object3D;
      const contact = marker.getWorldPosition(marker.position.clone());
      const vertex = contact.clone();
      let gap = Infinity;
      for (let i = 0; i < paddedPositions.count; i++) {
        vertex.fromBufferAttribute(paddedPositions, i);
        reinforcement.applyBoneTransform(i, vertex).applyMatrix4(reinforcement.matrixWorld);
        gap = Math.min(gap, vertex.distanceTo(contact));
      }
      return gap;
    });
    vm.dispose();
    const legacy = createAk47ViewModel({ vmDebug: false, search: "?weapon=legacy" });
    await legacy.load();
    const legacyLoaded = legacy.getAlignmentSnapshot().loaded;
    const legacyName = legacy.constructor.name;
    legacy.dispose();
    return { packageScale, hasRightHand, texturedMaterials: [...texturedMaterials].sort(), detailTextures, handContactOcclusion, construction, fingertipPaddingGaps, rest, readyGrip, fired, frozen, paused, lowFpsBolt, flashEnded, reload, cancelled, contact, reloadContact, thumbPad, cancellations, maxArmStepDeg, foreEndFingerGaps, skins: [...skins.values()], wrists, thumbFlexion, thumbOpening, beforeCameraKick, afterCameraKick, finalRound, firstSequence, caseTravel, caseExpired, resetSequence, socketParent, legacyLoaded, legacyName };
  });
  expect(result.fired.bolt).toBeLessThan(result.rest.bolt - .01);
  expect(result.fired.rise).toBeGreaterThan(.005);
  expect(result.fired.flash).toBe(true);
  for (const scale of Object.values(result.packageScale)) {
    scale.forEach((axis) => expect(axis).toBeCloseTo(.90, 6));
  }
  expect(result.readyGrip.thumbSide).toBeLessThan(-.015);
  expect(result.readyGrip.fingerSides.every((side: number) => side > .005)).toBe(true);
  expect(result.readyGrip.palmAcrossGun, "palm must cup from near side to far side").toBeGreaterThan(.04);
  expect(result.readyGrip.palmHeight, "palm must support the underside of the wood").toBeLessThan(.039);
  // The reference forearm approaches diagonally from below; forcing a nearly
  // vertical arm encouraged the rejected side-pinching pose.
  expect(result.readyGrip.armSlope).toBeLessThan(1);
  expect(result.readyGrip.elbowBelowHand).toBe(true);
  expect(result.socketParent).toBe("MuzzleSocket");
  expect(result.frozen).toEqual(result.paused);
  expect(result.lowFpsBolt.every((x) => x < -.01)).toBe(true);
  expect(result.flashEnded).toBe(true);
  expect(result.reload.magazine).not.toEqual(result.rest.magazine);
  expect(result.reload.contactAo).toBe(0);
  expect(result.cancelled.contactAo).toBe(1);
  expect(Math.hypot(...result.reload.hand.map((value: number, i: number) => value - result.rest.hand[i]!))).toBeGreaterThan(.2);
  result.cancelled.magazine.forEach((value: number, i: number) => expect(value).toBeCloseTo(result.rest.magazine[i], 6));
  result.cancelled.hand.forEach((value: number, i: number) => expect(value).toBeCloseTo(result.rest.hand[i], 6));
  for (const pose of result.contact.slice(1)) {
    pose.forEach((value: number, i: number) => expect(Math.abs(value - result.contact[0]![i]!)).toBeLessThan(.002));
  }
  expect(result.reloadContact.maxAnchorGap).toBeLessThan(.001);
  expect(result.reloadContact.maxRotationDriftDeg).toBeLessThan(.25);
  expect(result.reloadContact.maxFingerGap).toBeLessThan(.01);
  console.info("Reload contact:", result.reloadContact, "Thumb hinges:", result.thumbFlexion);
  expect(result.reloadContact.opposedThumb).toBe(true);
  console.info("Visible thumb pad contact:", result.thumbPad);
  expect(result.thumbPad.maxGap, "three skin points must press the left face").toBeLessThan(.0015);
  expect(result.thumbPad.minNormalAlignment, "thumb pad must face into the magazine").toBeGreaterThan(.94);
  expect(result.thumbPad.maxMeshMismatch, "contact samples must coincide with rendered skin").toBeLessThan(.0001);
  expect(result.thumbPad.maxDrift, "thumb pad must not slide during the hold").toBeLessThan(.001);
  expect(result.maxArmStepDeg).toBeLessThan(10);
  console.info("Thumb hinge regression:", result.thumbFlexion);
  expect(result.thumbFlexion.minMcpDeg, "thumb MCP must not bend backward").toBeGreaterThanOrEqual(-.01);
  expect(result.thumbFlexion.minIpDeg, "thumb IP must not bend backward").toBeGreaterThanOrEqual(-.01);
  expect(result.thumbFlexion.maxMcpDeg).toBeLessThanOrEqual(55.05);
  expect(result.thumbFlexion.maxIpDeg).toBeLessThanOrEqual(65.05);
  expect(result.thumbFlexion.maxOffAxisDeg, "thumb hinges must not twist sideways").toBeLessThan(.1);
  console.info("Unloaded thumb transition:", result.thumbOpening);
  expect(result.thumbOpening.maxFreeMcpDeg, "free thumb must straighten before grasping").toBeLessThan(6);
  expect(result.thumbOpening.maxFreeIpDeg, "free thumb tip must remain nearly straight").toBeLessThan(4);
  expect(result.thumbOpening.maxClosingReverseStepDeg, "closing must flex forward into contact").toBeLessThan(.02);
  for (const pose of result.cancellations) pose.forEach((value: number, i: number) => expect(value).toBeCloseTo(result.rest.hand[i], 6));
  expect(result.foreEndFingerGaps.every((gap: number) => gap < .015), JSON.stringify(result.foreEndFingerGaps)).toBe(true);
  expect(result.skins).toHaveLength(1);
  expect(result.hasRightHand).toBe(false);
  expect(result.texturedMaterials).toEqual(["Graphite suede reinforcement", "Khaki ripstop sleeve", "Navy rolled binding", "Saddle leather closure", "Urban Breacher glove"]);
  expect(result.handContactOcclusion).toBe(true);
  expect(result.fingertipPaddingGaps.every((gap: number) => gap < .012), JSON.stringify(result.fingertipPaddingGaps)).toBe(true);
  for (const texture of result.detailTextures) {
    // Runtime textures use the approved 2K packaging budget for GitHub.
    expect(texture.size, texture.material).toBe(2048);
    expect(texture.anisotropy, texture.material).toBe(16);
  }
  for (const object of result.construction) {
    expect(object.skinned, object.name).toBe(true);
    expect(object.castsShadow, object.name).toBe(true);
    expect(object.receivesShadow, object.name).toBe(true);
  }
  expect(result.skins.every((count: number) => count >= 20)).toBe(true);
  console.info("Wrist pose regression:", result.wrists);
  expect(result.wrists.maxBendDeg, JSON.stringify(result.wrists)).toBeLessThan(30);
  expect(result.wrists.maxRelativeRotationDeg).toBeLessThan(30);
  expect(result.wrists.maxScaleError).toBeLessThan(.001);
  expect(result.wrists.maxShear).toBeLessThan(.001);
  expect(result.afterCameraKick).toEqual(result.beforeCameraKick);
  expect(result.finalRound.bolt).toBeLessThan(-.01);
  expect(result.finalRound.flash).toBe(true);
  expect(result.firstSequence).toHaveLength(1);
  expect(result.caseTravel[0], "spent case ejects to the right").toBeGreaterThan(.1);
  expect(result.caseTravel[1], "spent case falls under gravity").toBeLessThan(0);
  expect(result.caseExpired).toBe(true);
  expect(result.resetSequence).toEqual(result.firstSequence);
  expect(result.legacyLoaded).toBe(true);
  expect(result.legacyName).toBe("Ak47ViewModel");
  expect(errors).toEqual([]);
});
