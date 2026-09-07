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
    const { Triangle, Euler, Raycaster, Vector2, Vector3 } = await import(threeUrl);
    const vm = createAk47ViewModel({ vmDebug: false, search: "?weapon=next" });
    await vm.load();
    vm.setAspect(16 / 9);
    const camera = vm.viewModelCamera.clone(false);
    camera.rotation.set(0, 0, 0);
    vm.updateFromMainCamera(camera, 1 / 60);
    const scene = vm.viewModelScene;
    // Sample the see-through wedge from the reported viewport. These rays
    // must hit the rendered glove, not contact markers or the rifle behind it.
    vm.setAspect(1971 / 1123);
    const gloveSurfaces = ["L_GloveAndForearm", "Palm_heel_suede_overlay"].map((name) => scene.getObjectByName(name));
    const ray = new Raycaster();
    for (const [x, y] of [[1299, 777], [1306, 782], [1316, 786]]) {
      ray.setFromCamera(new Vector2(x / 1971 * 2 - 1, 1 - y / 1123 * 2), vm.viewModelCamera);
      if (ray.intersectObjects(gloveSurfaces, false).length === 0) {
        throw new Error(`Visible gap in the thumb-to-palm glove web at ${x}, ${y}`);
      }
    }
    vm.setAspect(16 / 9);
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
    const reloadContact = { maxAnchorGap: 0, maxRotationDriftDeg: 0, maxFingerGap: 0, minFingerGap: Infinity, minPalmUpAlignment: 1, maxThumbIndexHeightGap: 0, thumbWithinFingerSpan: true, wrappedGrip: true };
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
      const wristInMagazine = magazine.worldToLocal(hand.getWorldPosition(hand.position.clone()));
      const knuckle = scene.getObjectByName("L_f_middle01") as Object3D;
      const palmUp = magazine.worldToLocal(knuckle.getWorldPosition(knuckle.position.clone())).sub(wristInMagazine).normalize();
      reloadContact.minPalmUpAlignment = Math.min(reloadContact.minPalmUpAlignment, palmUp.y);
      let frontFingerMinX = Infinity, fingerLowY = Infinity, fingerHighY = -Infinity;
      for (const finger of ["f_index", "f_middle", "f_ring", "f_pinky"]) {
        const marker = scene.getObjectByName("GripContact_" + finger) as Object3D;
        const position = marker.getWorldPosition(marker.position.clone());
        const gap = surfaceGap(magazine, position);
        reloadContact.maxFingerGap = Math.max(reloadContact.maxFingerGap, gap);
        if (finger !== 'f_index') reloadContact.minFingerGap = Math.min(reloadContact.minFingerGap, gap);
        const pointInMagazine = magazine.worldToLocal(position);
        frontFingerMinX = Math.min(frontFingerMinX, pointInMagazine.x);
        fingerLowY = Math.min(fingerLowY, pointInMagazine.y);
        fingerHighY = Math.max(fingerHighY, pointInMagazine.y);
        // Magazine thickness varies across the ribs. Check the actual surface
        // clearance and side rather than imposing the old grip's fixed width.
        reloadContact.wrappedGrip &&= pointInMagazine.z > .005;
      }
      const thumbBone = scene.getObjectByName("L_thumb03") as Bone;
      for (const name of ["ThumbPadContact", "ThumbPadContact1", "ThumbPadContact2"]) {
        const marker = scene.getObjectByName(name) as Object3D;
        const glove = scene.getObjectByName(marker.userData.sourceMesh.replaceAll(" ", "_")) as SkinnedMesh;
        const meshPositions = glove.geometry.getAttribute("position");
        const worldPoint = marker.getWorldPosition(marker.position.clone());
        const localPoint = magazine.worldToLocal(worldPoint.clone());
        reloadContact.wrappedGrip &&= localPoint.z > .005 && localPoint.x < frontFingerMinX - .015;
        reloadContact.thumbWithinFingerSpan &&= localPoint.y >= fingerLowY - .004 && localPoint.y <= fingerHighY + .004;
        const indexContact = scene.getObjectByName("GripContact_f_index") as Object3D;
        const indexPoint = magazine.worldToLocal(indexContact.getWorldPosition(indexContact.position.clone()));
        reloadContact.maxThumbIndexHeightGap = Math.max(reloadContact.maxThumbIndexHeightGap, Math.abs(indexPoint.y - localPoint.y));
        thumbPad.maxGap = Math.max(thumbPad.maxGap, surfaceGap(magazine, worldPoint));
        const previous = padPositions.get(name);
        if (previous) thumbPad.maxDrift = Math.max(thumbPad.maxDrift, previous.distanceTo(localPoint));
        else padPositions.set(name, localPoint.clone());
        const normal = worldPoint.clone().fromArray(marker.userData.padNormalLocal)
          .applyQuaternion(thumbBone.getWorldQuaternion(thumbBone.quaternion.clone())).normalize();
        const intoSurface = worldPoint.clone().fromArray(marker.userData.contactNormalMagazineLocal)
          .applyQuaternion(magazine.getWorldQuaternion(magazine.quaternion.clone()));
        thumbPad.minNormalAlignment = Math.min(thumbPad.minNormalAlignment, normal.dot(intoSurface));
        // These markers must lie on the rendered skin, not merely be convenient
        // empty nodes that touch the gun while the visible thumb floats away.
        if (!previous) {
          let nearest = Infinity;
          const vertex = worldPoint.clone();
          for (let i = 0; i < meshPositions.count; i++) {
            glove.getVertexPosition(i, vertex).applyMatrix4(glove.matrixWorld);
            nearest = Math.min(nearest, vertex.distanceTo(worldPoint));
          }
          thumbPad.maxMeshMismatch = Math.max(thumbPad.maxMeshMismatch, nearest);
        }
      }
    }
    const magazineSurface = scene.getObjectByName("Magazine_Surfaces") as SkinnedMesh;
    const surfacePositions = magazineSurface.geometry.getAttribute("position"), surfaceIndices = magazineSurface.geometry.getIndex();
    const triangles = [];
    for (let i = 0; i < (surfaceIndices?.count ?? surfacePositions.count); i += 3) {
      const triangle = new Triangle(...[0, 1, 2].map((corner) => new Vector3().fromBufferAttribute(surfacePositions, surfaceIndices ? surfaceIndices.getX(i + corner) : i + corner)));
      triangles.push({ triangle, normal: triangle.getNormal(new Vector3()) });
    }
    const fingerSurfaceClearance = ["L_GloveAndForearm", "Palm_heel_suede_overlay"].flatMap((name) => ["f_index", "f_middle", "f_ring", "f_pinky", "thumb"].map((finger) => {
      const mesh = scene.getObjectByName(name) as SkinnedMesh;
      const positions = mesh.geometry.getAttribute("position"), indices = mesh.geometry.getAttribute("skinIndex"), weights = mesh.geometry.getAttribute("skinWeight");
      const indexBones = new Set(mesh.skeleton.bones.map((bone, i) => bone.name.startsWith("L_" + finger) ? i : -1));
      let minimum = Infinity, minSurfaceGap = Infinity, checked = 0;
      const point = new Vector3(), nearest = new Vector3(), closest = new Vector3(), normal = new Vector3();
      for (let i = 0; i < positions.count; i++) {
        let influence = 0;
        for (let c = 0; c < 4; c++) if (indexBones.has(indices.getComponent(i, c))) influence += weights.getComponent(i, c);
        if (influence < (finger === "f_index" ? .2 : .8)) continue;
        mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
        magazineSurface.worldToLocal(point);
        let distance = Infinity;
        for (const surface of triangles) {
          surface.triangle.closestPointToPoint(point, nearest);
          const candidate = nearest.distanceToSquared(point);
          if (candidate < distance) { distance = candidate; closest.copy(nearest); normal.copy(surface.normal); }
        }
        minimum = Math.min(minimum, point.sub(closest).dot(normal));
        minSurfaceGap = Math.min(minSurfaceGap, Math.sqrt(distance));
        checked++;
      }
      return { name: `${name}/${finger}`, minimum, minSurfaceGap, checked };
    }));
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
    const rightGlove = scene.getObjectByName("R_GloveAndForearm") as SkinnedMesh;
    const rightSkeleton = rightGlove.skeleton;
    const bindPosition = (name: string) => {
      const bone = scene.getObjectByName(name) as Bone;
      return bone.position.clone().setFromMatrixPosition(rightSkeleton.boneInverses[rightSkeleton.bones.indexOf(bone)]!.clone().invert());
    };
    const rightPads = ["thumb", "f_index", "f_middle", "f_ring", "f_pinky"].flatMap((finger) =>
      [0, 1, 2].map((i) => scene.getObjectByName(`RightPad_${finger}_${i}`) as Object3D));
    const rightPositions = rightGlove.geometry.getAttribute("position");
    const rightGrip = {
      thumbOnRadialSide: bindPosition("R_thumb01").x > bindPosition("GripHand").x + .015,
      indexOnRadialSide: bindPosition("R_f_index01").x > bindPosition("R_f_pinky01").x + .05,
      maxPadGap: 0, maxSkinMismatch: 0, maxDrift: 0,
      maxTriggerGap: 0, maxGripPadSide: -Infinity,
    };
    const rightPadRest = rightPads.map((marker) => contactPosition(marker.name));
    for (const marker of rightPads) {
      const point = marker.getWorldPosition(marker.position.clone());
      if (marker.name.startsWith("RightPad_f_index_")) {
        rightGrip.maxTriggerGap = Math.max(rightGrip.maxTriggerGap, surfaceGap(scene.getObjectByName("Trigger_Surfaces"), point));
      } else {
        rightGrip.maxPadGap = Math.max(rightGrip.maxPadGap, surfaceGap(scene.getObjectByName("AK47_Rig_Surfaces"), point));
        if (!marker.name.startsWith("RightPad_thumb_")) {
          rightGrip.maxGripPadSide = Math.max(rightGrip.maxGripPadSide, contactPosition(marker.name).z);
        }
      }
      let nearest = Infinity;
      const vertex = point.clone();
      for (let i = 0; i < rightPositions.count; i++) {
        rightGlove.applyBoneTransform(i, vertex.fromBufferAttribute(rightPositions, i)).applyMatrix4(rightGlove.matrixWorld);
        nearest = Math.min(nearest, vertex.distanceTo(point));
      }
      rightGrip.maxSkinMismatch = Math.max(rightGrip.maxSkinMismatch, nearest);
    }
    const thumbFlexion = { minMcpDeg: Infinity, maxMcpDeg: -Infinity, minIpDeg: Infinity, maxIpDeg: -Infinity, maxOffAxisDeg: 0 };
    const thumbOpening = { maxFreeMcpDeg: 0, maxFreeIpDeg: 0, maxClosingReverseStepDeg: 0 };
    const previousClosingFlexion = new Map<string, number>();
    const previousArmRotations = new Map<string, import("three").Quaternion>();
    let maxArmStepDeg = 0;
    for (let frame = 0; frame <= 147; frame++) {
      vm.setAmmoState({ mag: 12, reserve: 90, reloading: true, reloadT01: frame / 147 });
      vm.updateFromMainCamera(camera, 0);
      rightPads.forEach((marker, i) => {
        rightGrip.maxDrift = Math.max(rightGrip.maxDrift, contactPosition(marker.name).distanceTo(rightPadRest[i]!));
      });
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
      for (const [side, handName] of [["L", "SupportHand"], ["R", "GripHand"]]) {
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
        reinforcement.getVertexPosition(i, vertex).applyMatrix4(reinforcement.matrixWorld);
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
    return { fingerSurfaceClearance, rightGrip, packageScale, hasRightHand, texturedMaterials: [...texturedMaterials].sort(), detailTextures, handContactOcclusion, construction, fingertipPaddingGaps, rest, readyGrip, fired, frozen, paused, lowFpsBolt, flashEnded, reload, cancelled, contact, reloadContact, thumbPad, cancellations, maxArmStepDeg, foreEndFingerGaps, skins: [...skins.values()], wrists, thumbFlexion, thumbOpening, beforeCameraKick, afterCameraKick, finalRound, firstSequence, caseTravel, caseExpired, resetSequence, socketParent, legacyLoaded, legacyName };
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
  // Finger centers have different pad thicknesses. Validate the rendered
  // surfaces below rather than forcing every center into a 10mm shell.
  expect(result.reloadContact.minFingerGap, "finger center markers retain pad thickness outside the surface").toBeGreaterThan(.005);
  expect(result.reloadContact.minPalmUpAlignment, "palm rises from below along the magazine").toBeGreaterThan(.85);
  expect(result.reloadContact.thumbWithinFingerSpan, "thumb opposes the four-finger grip instead of sitting outside its span").toBe(true);
  for (const surface of result.fingerSurfaceClearance) {
    expect(surface.checked, surface.name).toBeGreaterThan(500);
    expect(surface.minimum, `${surface.name} must not enter the magazine`).toBeGreaterThanOrEqual(-.00005);
    // The outer suede pads contact the metal; the glove underneath stays
    // separated by the padding thickness.
    if (surface.name.startsWith("Palm_heel_suede_overlay/")) {
      expect(surface.minSurfaceGap, `${surface.name} must retain visible pad contact`).toBeLessThan(.0015);
    }
  }
  console.info("Finger surface clearance:", result.fingerSurfaceClearance);
  console.info("Reload contact:", result.reloadContact, "Thumb hinges:", result.thumbFlexion);
  expect(result.reloadContact.wrappedGrip, "all four fingers and the thumb must close onto the far broad face").toBe(true);
  console.info("Visible thumb pad contact:", result.thumbPad);
  expect(result.thumbPad.maxGap, "three outer padding points must press the far broad face").toBeLessThan(.0005);
  expect(result.thumbPad.minNormalAlignment, "thumb pad must face into the magazine").toBeGreaterThan(.94);
  expect(result.thumbPad.maxMeshMismatch, "contact samples must coincide with rendered skin").toBeLessThan(.0001);
  expect(result.thumbPad.maxDrift, "thumb pad must not slide during the hold").toBeLessThan(.001);
  expect(result.maxArmStepDeg).toBeLessThan(10);
  console.info("Thumb hinge regression:", result.thumbFlexion);
  expect(result.thumbFlexion.minMcpDeg, "thumb MCP must not bend backward").toBeGreaterThanOrEqual(-.01);
  expect(result.thumbFlexion.minIpDeg, "thumb IP must not bend backward").toBeGreaterThanOrEqual(-.01);
  expect(result.thumbFlexion.maxMcpDeg, "closed thumb stays within its authored forward curl").toBeLessThanOrEqual(75);
  expect(result.thumbFlexion.maxIpDeg).toBeLessThanOrEqual(65.05);
  expect(result.thumbFlexion.maxOffAxisDeg, "thumb hinges must not twist sideways").toBeLessThan(.1);
  console.info("Unloaded thumb transition:", result.thumbOpening);
  expect(result.thumbOpening.maxFreeMcpDeg, "free thumb must straighten before grasping").toBeLessThan(6);
  expect(result.thumbOpening.maxFreeIpDeg, "free thumb tip must remain nearly straight").toBeLessThan(4);
  expect(result.thumbOpening.maxClosingReverseStepDeg, "closing must flex forward into contact").toBeLessThan(.02);
  for (const pose of result.cancellations) pose.forEach((value: number, i: number) => expect(value).toBeCloseTo(result.rest.hand[i], 6));
  expect(result.foreEndFingerGaps.every((gap: number) => gap < .015), JSON.stringify(result.foreEndFingerGaps)).toBe(true);
  expect(result.skins).toHaveLength(2);
  expect(result.hasRightHand).toBe(true);
  console.info("Right-hand anatomy and grip:", result.rightGrip);
  expect(result.rightGrip.thumbOnRadialSide).toBe(true);
  expect(result.rightGrip.indexOnRadialSide).toBe(true);
  expect(result.rightGrip.maxPadGap).toBeLessThan(.003);
  expect(result.rightGrip.maxSkinMismatch).toBeLessThan(.0001);
  expect(result.rightGrip.maxDrift).toBeLessThan(.00001);
  expect(result.rightGrip.maxTriggerGap, "rendered index pads rest against the trigger").toBeLessThan(.003);
  expect(result.rightGrip.maxGripPadSide, "three fingers wrap onto the left side of the grip").toBeLessThan(-.012);
  expect(result.texturedMaterials).toEqual(["Graphite suede reinforcement", "Khaki ripstop sleeve", "Navy rolled binding", "Right Urban Breacher glove", "Saddle leather closure", "Urban Breacher glove"]);
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

test("reload glove fingers do not intersect one another", async ({ page }) => {
  await page.route("**/reload-finger-test", (route) => route.fulfill({ contentType: "text/html", body: "<body></body>" }));
  await page.goto("/reload-finger-test");
  const samples = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/weapons/Ak47AnimatedViewModel.ts";
    const { createAk47ViewModel } = await import(moduleUrl);
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const { Box3, PerspectiveCamera, Ray, Triangle, Vector3 } = await import(threeUrl);
    const vm = createAk47ViewModel({ vmDebug: false, search: "" });
    await vm.load();
    const camera = new PerspectiveCamera();
    const fingers = ["thumb", "f_index", "f_middle", "f_ring", "f_pinky"];
    const surfaces = ["L_GloveAndForearm", "Palm_heel_suede_overlay"].map((name) => {
      const mesh = vm.viewModelScene.getObjectByName(name) as SkinnedMesh;
      const positions = mesh.geometry.getAttribute("position");
      const indices = mesh.geometry.getAttribute("skinIndex"), weights = mesh.geometry.getAttribute("skinWeight");
      // Only triangles belonging wholly to one digit count. This excludes the
      // shared palm/web roots where adjoining fingers legitimately meet.
      const digit = Array.from({ length: positions.count }, (_, vertex) => fingers.findIndex((finger) => {
        let influence = 0;
        for (let c = 0; c < 4; c++) {
          if (mesh.skeleton.bones[indices.getComponent(vertex, c)]!.name.startsWith("L_" + finger)) influence += weights.getComponent(vertex, c);
        }
        return influence > .8;
      }));
      const allTriangles: { indices: number[]; thumbRelated: boolean }[] = [];
      const thumbVertices = Array.from({ length: positions.count }, (_, vertex) => {
        let influence = 0;
        for (let c = 0; c < 4; c++) if (mesh.skeleton.bones[indices.getComponent(vertex, c)]!.name.startsWith("L_thumb")) influence += weights.getComponent(vertex, c);
        return influence > .01;
      });
      const triangles: number[][][] = fingers.map(() => []);
      const index = mesh.geometry.getIndex();
      for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
        const vertices = [0, 1, 2].map((corner) => index ? index.getX(i + corner) : i + corner);
        allTriangles.push({ indices: vertices, thumbRelated: vertices.some((vertex) => thumbVertices[vertex]) });
        const finger = digit[vertices[0]!]!;
        if (finger >= 0 && vertices.every((vertex) => digit[vertex] === finger)) triangles[finger]!.push(vertices);
      }
      return { mesh, positions, triangles, allTriangles };
    });
    const ray = new Ray(), hit = new Vector3(), direction = new Vector3();
    const crosses = (a: import("three").Triangle, b: import("three").Triangle) => {
      for (const [start, end] of [[a.a, a.b], [a.b, a.c], [a.c, a.a]]) {
        const length = direction.subVectors(end!, start!).length();
        ray.set(start!, direction.normalize());
        if (ray.intersectTriangle(b.a, b.b, b.c, false, hit)) {
          const distance = hit.distanceTo(start!);
          if (distance > .000001 && distance < length - .000001) return true;
        }
      }
      return false;
    };
    const samples: { progress: number; triangles: number[]; intersections: Record<string, number> }[] = [];
    for (const progress of [.08, .12, .16, .18, .22, .5, .79, .83, .87, .92]) {
      vm.setAmmoState({ mag: 12, reserve: 90, reloading: true, reloadT01: progress });
      vm.updateFromMainCamera(camera, 0);
      const digits = fingers.map((_, finger) => surfaces.flatMap(({ mesh, positions, triangles }) => triangles[finger]!.map((indices) => {
        const points = indices.map((index) => mesh.getVertexPosition(index, new Vector3()).applyMatrix4(mesh.matrixWorld));
        return { triangle: new Triangle(...points), bounds: new Box3().setFromPoints(points) };
      })));
      const names = [...fingers];
      if (progress >= .22 && progress <= .79) {
        const magazine = vm.viewModelScene.getObjectByName("Magazine_Surfaces") as SkinnedMesh;
        const positions = magazine.geometry.getAttribute("position"), index = magazine.geometry.getIndex();
        const triangles = [];
        for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
          const points = [0, 1, 2].map((corner) => new Vector3().fromBufferAttribute(positions, index ? index.getX(i + corner) : i + corner).applyMatrix4(magazine.matrixWorld));
          triangles.push({ triangle: new Triangle(...points), bounds: new Box3().setFromPoints(points) });
        }
        names.push("magazine");
        digits.push(triangles);
      }
      const cells = (bounds: import("three").Box3) => {
        const keys: string[] = [];
        for (let x = Math.floor(bounds.min.x / .01); x <= Math.floor(bounds.max.x / .01); x++)
          for (let y = Math.floor(bounds.min.y / .01); y <= Math.floor(bounds.max.y / .01); y++)
            for (let z = Math.floor(bounds.min.z / .01); z <= Math.floor(bounds.max.z / .01); z++) keys.push(`${x},${y},${z}`);
        return keys;
      };
      const grids = digits.map((digit) => {
        const grid = new Map<string, typeof digit>();
        for (const triangle of digit) for (const key of cells(triangle.bounds)) {
          const bucket = grid.get(key) ?? [];
          bucket.push(triangle);
          grid.set(key, bucket);
        }
        return grid;
      });
      const intersections: Record<string, number> = {};
      for (let first = 0; first < names.length; first++) for (let second = first + 1; second < names.length; second++) {
        let count = 0;
        for (const a of digits[first]!) {
          const candidates = new Set(cells(a.bounds).flatMap((key) => grids[second]!.get(key) ?? []));
          for (const b of candidates) {
            if (a.bounds.intersectsBox(b.bounds) && (crosses(a.triangle, b.triangle) || crosses(b.triangle, a.triangle))) count++;
          }
        }
        if (count) intersections[`${names[first]}/${names[second]}`] = count;
      }
      // A whole-digit check misses the thumb folding through its own base or
      // the palm. Check the continuous glove body against itself as well.
      if (progress === .22 || progress === .83) {
        const { mesh, positions, allTriangles } = surfaces[0]!;
        const vertices = Array.from({ length: positions.count }, (_, index) => mesh.getVertexPosition(index, new Vector3()).applyMatrix4(mesh.matrixWorld));
        const bodyTriangles = allTriangles.map((item, id) => {
          const points = item.indices.map((index) => vertices[index]!);
          return { ...item, id, triangle: new Triangle(...points), bounds: new Box3().setFromPoints(points) };
        });
        const grid = new Map<string, typeof bodyTriangles>();
        for (const triangle of bodyTriangles) for (const key of cells(triangle.bounds)) {
          const bucket = grid.get(key) ?? [];
          bucket.push(triangle); grid.set(key, bucket);
        }
        let count = 0;
        for (const a of bodyTriangles) {
          if (!a.thumbRelated) continue;
          const candidates = new Set(cells(a.bounds).flatMap((key) => grid.get(key) ?? []));
          for (const b of candidates) {
            if ((b.thumbRelated && b.id <= a.id) || a.indices.some((index) => b.indices.includes(index))) continue;
            if (a.bounds.intersectsBox(b.bounds) && (crosses(a.triangle, b.triangle) || crosses(b.triangle, a.triangle))) count++;
          }
        }
        if (count) intersections["thumb/palm self-intersection"] = count;
      }
      samples.push({ progress, triangles: digits.map((digit) => digit.length), intersections });
    }
    vm.dispose();
    return samples;
  });
  console.info("Reload finger surface intersections:", JSON.stringify(samples));
  for (const sample of samples) {
    sample.triangles.slice(0, 5).forEach((count) => expect(count).toBeGreaterThan(100));
    expect(sample.intersections, `Crossing glove surfaces at reload ${sample.progress}`).toEqual({});
  }
});

test("reload framing exposes the trigger and its contacting index finger", async ({ page }) => {
  await page.route("**/reload-visibility-test", (route) => route.fulfill({ contentType: "text/html", body: "<body></body>" }));
  await page.goto("/reload-visibility-test");
  const samples = await page.evaluate(async () => {
    const moduleUrl = "/src/runtime/weapons/Ak47AnimatedViewModel.ts";
    const { createAk47ViewModel } = await import(moduleUrl);
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const { WebGLRenderer, PerspectiveCamera, BufferAttribute, MeshBasicMaterial } = await import(threeUrl);
    const vm = createAk47ViewModel({ vmDebug: false, search: "" });
    await vm.load();
    const rig = vm.viewModelScene.getObjectByName("AK47_Rig");
    // Render object IDs through the actual depth buffer. Contact markers alone
    // passed while the player's view hid almost all of the trigger and index.
    rig.traverse((object: Object3D) => {
      const mesh = object as SkinnedMesh;
      if (!mesh.isMesh) return;
      const colors = new Float32Array(mesh.geometry.getAttribute("position").count * 3);
      const indices = mesh.geometry.getAttribute("skinIndex"), weights = mesh.geometry.getAttribute("skinWeight");
      for (let i = 0; i < colors.length / 3; i++) {
        let indexWeight = 0;
        if (mesh.isSkinnedMesh) for (let c = 0; c < 4; c++) {
          if (mesh.skeleton.bones[indices.getComponent(i, c)]!.name.startsWith("R_f_index")) indexWeight += weights.getComponent(i, c);
        }
        colors.set(mesh.name === "Trigger_Surfaces" ? [1, 0, 0] : indexWeight > .5 ? [0, 1, 0] : [.05, .05, .05], i * 3);
      }
      mesh.geometry.setAttribute("color", new BufferAttribute(colors, 3));
      mesh.material = new MeshBasicMaterial({ vertexColors: true });
    });
    const renderer = new WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    document.body.appendChild(renderer.domElement);
    const camera = new PerspectiveCamera();
    const samples: { aspect: number; progress: number; triggerPixels: number; indexPixels: number }[] = [];
    for (const height of [540, 600]) {
      renderer.setSize(960, height);
      vm.setAspect(960 / height);
      const gl = renderer.getContext(), pixels = new Uint8Array(960 * height * 4);
      for (const progress of [.16, .35, .5, .7, .8]) {
        vm.setAmmoState({ mag: 21, reserve: 90, reloading: true, reloadT01: progress });
        vm.updateFromMainCamera(camera, 0);
        renderer.render(vm.viewModelScene, vm.viewModelCamera);
        gl.readPixels(0, 0, 960, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let triggerPixels = 0, indexPixels = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i]! > 200 && pixels[i + 1]! < 50) triggerPixels++;
          if (pixels[i + 1]! > 200 && pixels[i]! < 50) indexPixels++;
        }
        samples.push({ aspect: 960 / height, progress, triggerPixels, indexPixels });
      }
    }
    vm.dispose();
    renderer.dispose();
    return samples;
  });
  for (const sample of samples) {
    expect(sample.triggerPixels, JSON.stringify(sample)).toBeGreaterThan(500);
    expect(sample.indexPixels, JSON.stringify(sample)).toBeGreaterThan(300);
  }
});
