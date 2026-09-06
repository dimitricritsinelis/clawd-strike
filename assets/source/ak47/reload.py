"""Author the approved left hand around the existing magazine reload in Blender.

The magazine keys and timing are read, never rewritten. Bake a rigid magazine
grip and a continuous, fixed-length forearm path into the shared Reload NLA clip.
"""
from pathlib import Path
import json
import math
import bpy
import numpy as np
from mathutils import Vector, Matrix, Quaternion, Euler
from mathutils.bvhtree import BVHTree

SOURCE = Path(__file__).resolve().parent
scene = bpy.context.scene
rig = bpy.data.objects['L_Armature']
magazine = bpy.data.objects['Magazine']
idle_strip = rig.animation_data.nla_tracks['Idle'].strips[0]
mag_strip = magazine.animation_data.nla_tracks['Reload'].strips[0]
mag_action = mag_strip.action
for track in list(rig.animation_data.nla_tracks):
    if track.name == 'Reload':
        rig.animation_data.nla_tracks.remove(track)
    else:
        track.mute = True
rig.animation_data.action = idle_strip.action
rig.animation_data.action_slot = idle_strip.action.slots[0]
scene.frame_set(1)
bpy.context.view_layer.update()
idle = {b.name: (b.location.copy(), b.rotation_quaternion.copy(), b.scale.copy(), b.matrix.copy()) for b in rig.pose.bones}
hand = rig.pose.bones['SupportHand']
idle_hand = hand.matrix.copy()
upper_length, lower_length = .32, .26

thumb_bones = [rig.pose.bones['L_thumb.' + str(i).zfill(2)] for i in [1, 2, 3]]
thumb_marker = bpy.data.objects['GripContact_thumb']
body = bpy.data.objects['L_GloveAndForearm']
thumb_rest = rig.data.bones['L_thumb.03'].matrix_local
pad_reference = thumb_rest @ Vector((0, .013, .006))
pad_vertices = sorted(body.data.vertices, key=lambda vertex: (vertex.co - pad_reference).length)[:6]
pad_point = sum((thumb_rest.inverted() @ vertex.co for vertex in pad_vertices), Vector()) / len(pad_vertices)
pad_normal = sum((thumb_rest.to_3x3().inverted() @ vertex.normal for vertex in pad_vertices), Vector()).normalized()

def solve_thumb(target, pad_direction, closed):
    # Opposition belongs at the saddle joint. MCP and IP are forward-flexing
    # hinges; moving the tip onto a target must never reverse those hinges.
    prior = np.radians([-10, 0, -55, 22, 15] if closed else [-5, 15, 5, 12, 8])
    lower = np.radians([-55, -70, -75, 8 if closed else 0, 6 if closed else 0])
    upper = np.radians([50, 70, 75, 40 if closed else 55, 35 if closed else 65])
    angles = prior.copy()
    normal_weight = .035 if closed else 0
    position_weight = 3 if closed else 1
    desired = np.concatenate((np.array(target) * position_weight, np.array(pad_direction) * normal_weight,
                              np.array([target.y + .015, target.y + .008]) * .3 if closed else np.zeros(2)))

    def evaluate(values):
        thumb_bones[0].rotation_quaternion = Euler(tuple(values[:3]), 'XYZ').to_quaternion()
        for index in [1, 2]:
            thumb_bones[index].rotation_quaternion = Quaternion(Vector((1, 0, 0)), float(values[index + 2]))
        bpy.context.view_layer.update()
        point = thumb_bones[2].matrix @ pad_point if closed else thumb_marker.matrix_world.translation
        normal = thumb_bones[2].matrix.to_3x3() @ pad_normal if closed else Vector()
        joint_plane = np.array([thumb_bones[1].head.y, thumb_bones[2].head.y]) * .3 if closed else np.zeros(2)
        return np.concatenate((np.array(point) * position_weight, np.array(normal) * normal_weight, joint_plane))

    for _ in range(80):
        actual = evaluate(angles)
        jacobian = np.empty((8, 5))
        for index in range(5):
            sample = angles.copy(); sample[index] += .002
            jacobian[:, index] = (evaluate(sample) - actual) / .002
        gradient = jacobian.T @ (desired - actual) - (angles-prior) * .0000002
        free = ((angles > lower + .00001) | (gradient > 0)) & ((angles < upper - .00001) | (gradient < 0))
        step = np.zeros(5)
        active_jacobian = jacobian[:, free]
        step[free] = np.linalg.solve(active_jacobian.T @ active_jacobian + np.eye(np.count_nonzero(free)) * .000002, gradient[free])
        next_angles = np.clip(angles + np.clip(step, -.12, .12), lower, upper)
        if np.max(np.abs(next_angles - angles)) < .00001:
            break
        angles = next_angles
    evaluate(angles)
    error = ((thumb_bones[2].matrix @ pad_point if closed else thumb_marker.matrix_world.translation) - target).length
    if error > .003:
        raise RuntimeError('Anatomical thumb contact failed: ' + str({'closed': closed, 'error': error, 'angles': list(np.degrees(angles))}))
    return {bone.name: bone.rotation_quaternion.copy() for bone in thumb_bones}

# Retain the accepted fore-end contact, correcting the hidden reverse bend in
# the old idle thumb as well. Cancellation must not restore that bad hinge.
if 'thumb_idle_contact' not in rig:
    rig['thumb_idle_contact'] = list(thumb_marker.matrix_world.translation)
idle_thumb_target = Vector(rig['thumb_idle_contact'])
idle_thumb_normal = thumb_bones[2].matrix.col[2].to_3d().copy()
rig.animation_data.action = None
idle_thumb = solve_thumb(idle_thumb_target, idle_thumb_normal, False)
for name, rotation in idle_thumb.items():
    location, _, scale, matrix = idle[name]
    idle[name] = (location, rotation, scale, matrix)
idle_curves = idle_strip.action.layers[0].strips[0].channelbag(idle_strip.action.slots[0]).fcurves
for name, rotation in idle_thumb.items():
    for curve in idle_curves:
        if curve.data_path == 'pose.bones["' + name + '"].rotation_quaternion':
            for key in curve.keyframe_points:
                key.co.y = key.handle_left.y = key.handle_right.y = rotation[curve.array_index]

curves = mag_action.layers[0].strips[0].channelbag(mag_action.slots[0]).fcurves
def magazine_matrix(frame):
    values = {(fc.data_path, fc.array_index): fc.evaluate(frame) for fc in curves}
    location = Vector([values[('location', i)] for i in range(3)])
    rotation = Euler([values[('rotation_euler', i)] for i in range(3)], 'XYZ').to_matrix().to_4x4()
    rotation.translation = location
    return rotation

mag_rest = magazine_matrix(1)
grip = Matrix(((.5, .8660254, 0), (0, 0, -1), (-.8660254, .5, 0))).to_4x4()
grip.translation = Vector((-.068, .037, -.103))
grip_local = mag_rest.inverted() @ grip
rig.animation_data.action = None
hand.matrix = grip
bpy.context.view_layer.update()

# Fit the closed fingers to the actual two sides of the magazine. The thumb
# opposes the fingers on the near face instead of sinking into the metal.
surface_object = bpy.data.objects['Magazine_Surfaces']
surface = BVHTree.FromPolygons([surface_object.matrix_world @ v.co for v in surface_object.data.vertices],
                              [list(p.vertices) for p in surface_object.data.polygons])
finger_names = ['f_index', 'f_middle', 'f_ring', 'f_pinky']
targets = {}
for finger in finger_names:
    marker = bpy.data.objects['GripContact_' + finger]
    point = marker.matrix_world.translation.copy()
    side = -1
    hit, normal, _, _ = surface.ray_cast(Vector((point.x, side * .1, point.z)), Vector((0, -side, 0)), .2)
    if hit is None:
        raise RuntimeError('Magazine grip misses the surface: ' + finger)
    target = hit + Vector((0, side * .007, 0))
    targets[finger] = target
    bones = [rig.pose.bones['L_' + finger + '.' + str(i).zfill(2)] for i in [1, 2, 3]]
    parameters = [(0, 'X'), (1, 'X'), (2, 'X'), (0, 'Z')]
    base = [b.rotation_quaternion.copy() for b in bones]
    angles = np.zeros(len(parameters))

    def evaluate(values):
        rotations = [q.copy() for q in base]
        for value, (index, axis) in zip(values, parameters):
            rotations[index] = rotations[index] @ Quaternion(Vector({'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[axis]), float(value))
        for bone, rotation in zip(bones, rotations):
            bone.rotation_quaternion = rotation
        bpy.context.view_layer.update()
        return np.array(marker.matrix_world.translation)

    for _ in range(18):
        point = evaluate(angles)
        error = np.array(target) - point
        if np.linalg.norm(error) < .0003:
            break
        jacobian = np.empty((3, len(angles)))
        for index in range(len(angles)):
            sample = angles.copy(); sample[index] += .003
            jacobian[:, index] = (evaluate(sample) - point) / .003
        step = np.linalg.solve(jacobian.T @ jacobian + np.eye(len(angles)) * .000015,
                               jacobian.T @ error - angles * .000003)
        angles = np.clip(angles + np.clip(step, -.14, .14), -.65, .65)
    evaluate(angles)
hit, face_normal, _, _ = surface.ray_cast(Vector((-.023, .1, .007)), Vector((0, -1, 0)), .2)
if hit is None:
    raise RuntimeError('Missing thumb opposition surface on the magazine')
thumb_pad_target = hit + face_normal * .00015
closed_thumb = solve_thumb(thumb_pad_target, -face_normal, True)
thumb_pad_error = (thumb_bones[2].matrix @ pad_point - thumb_pad_target).length
thumb_pad_alignment = (thumb_bones[2].matrix.to_3x3() @ pad_normal).normalized().dot(-face_normal)
if thumb_pad_error > .0015 or thumb_pad_alignment < .94:
    raise RuntimeError('Thumb pad is not pressing the left face: ' + str((thumb_pad_error, thumb_pad_alignment)))
grip_fingers = {b.name: b.rotation_quaternion.copy() for b in rig.pose.bones if b.name.startswith(('L_f_', 'L_thumb.'))}
grip_errors = {finger: (bpy.data.objects['GripContact_' + finger].matrix_world.translation - target).length for finger, target in targets.items()}
if max(grip_errors.values()) > .003:
    raise RuntimeError('Finger grip solve did not converge: ' + str(grip_errors))

def smooth(value):
    value = max(0, min(1, value))
    return value ** 3 * (10 + value * (-15 + 6 * value))

def bezier(a, b, c, d, t):
    return a * (1-t)**3 + b * (3*(1-t)**2*t) + c * (3*(1-t)*t*t) + d * t**3

def set_bone(name, position, rotation):
    matrix = rotation.to_matrix().to_4x4()
    matrix.translation = position
    rig.pose.bones[name].matrix = matrix
    bpy.context.view_layer.update()

def camera_transform(frame):
    progress = (frame - 1) / 147
    def ease(value):
        value = max(0, min(1, value))
        return value * value * (3 - 2 * value)
    tilt = ease(progress / .16) * (1 - ease((progress - .80) / .20))
    transform = (Matrix.Translation(Vector((.151 - tilt*.045, -.143 + tilt*.075, -.30 - tilt*.035)))
                 @ Matrix.Rotation(-tilt*.08, 4, 'X')
                 @ Matrix.Rotation(tilt*.16, 4, 'Y')
                 @ Matrix.Rotation(-.065 - tilt*.65, 4, 'Z')
                 @ Matrix(((0,-1,0,0),(0,0,1,0),(-1,0,0,0),(0,0,0,1))))
    return transform

camera_upper_rotation = camera_transform(1).to_quaternion() @ idle['L_upper_arm'][3].to_quaternion()
idle_wrist_offset = idle_hand.to_quaternion().inverted() @ idle['L_forearm'][3].to_quaternion()

def arm(wrist, rotation, amount, frame):
    # A viewmodel has no visible torso anchor. Key the forearm behind the hand
    # and solve the upper arm back from its elbow, retaining both bone lengths.
    # This avoids the pole flips of a fixed-root solve as the magazine crosses
    # below the camera, while preserving the approved idle arm exactly.
    lower_rotation = rotation @ idle_wrist_offset.slerp(Quaternion(), amount)
    lower_direction = lower_rotation @ Vector((0, 1, 0))
    elbow = wrist - lower_direction * lower_length
    upper_rotation = camera_transform(frame).to_quaternion().inverted() @ camera_upper_rotation
    upper_direction = upper_rotation @ Vector((0, 1, 0))
    anchored_shoulder = elbow - upper_direction * upper_length
    set_bone('L_upper_arm', anchored_shoulder, upper_rotation)
    set_bone('L_upper_arm.001', anchored_shoulder + upper_direction * .16, upper_rotation)
    set_bone('L_forearm', elbow, lower_rotation)
    set_bone('L_forearm.001', elbow + lower_direction * .13, lower_rotation)
    set_bone('SupportHand', wrist, rotation)

action = bpy.data.actions.new('Reload_LeftHand_MagazineGrip')
rig.animation_data.action = action
samples = []
previous_rotations = {}
for frame in range(1, 149):
    scene.frame_set(frame)
    for name, (location, rotation, scale, _) in idle.items():
        bone = rig.pose.bones[name]
        bone.location = location
        bone.rotation_quaternion = rotation
        bone.scale = scale
    desired = magazine_matrix(frame) @ grip_local
    if frame < 33:
        t = smooth((frame - 3) / 30)
        wrist = bezier(idle_hand.translation,
                       idle_hand.translation + Vector((-.015, .07, -.01)),
                       grip.translation + Vector((0, .07, 0)), grip.translation, t)
        rotation = idle_hand.to_quaternion().slerp(grip.to_quaternion(), t)
        amount = t
        opening = smooth((frame-3)/9) * (1-smooth((frame-24)/9))
    elif frame <= 119:
        wrist, rotation = desired.translation, desired.to_quaternion()
        amount, opening = 1, 0
    else:
        t = smooth((frame - 119) / 29)
        wrist = bezier(grip.translation, grip.translation + Vector((0, .075, 0)),
                       idle_hand.translation + Vector((-.03, .06, -.015)), idle_hand.translation, t)
        rotation = grip.to_quaternion().slerp(idle_hand.to_quaternion(), t)
        amount = 1-t
        opening = smooth((frame-119)/7) * (1-smooth((frame-137)/11))
    if frame not in [1, 2, 3, 148]:
        arm(wrist, rotation, amount, frame)
    for name, closed in grip_fingers.items():
        rotation = idle[name][1].slerp(closed, amount)
        joint = int(name[-2:])
        if name.startswith('L_thumb.'):
            if joint == 1:
                # Open through the base, retaining a relaxed curve in the tip.
                opened = rotation
            else:
                # Off the weapon, straighten before opposing the magazine.
                # Both hinges then flex forward into the fitted contact pose.
                opened = Quaternion(Vector((1, 0, 0)), math.radians(3 if joint == 2 else 2))
            rig.pose.bones[name].rotation_quaternion = rotation.slerp(opened, opening)
        else:
            release_angle = [0, .28, .38, .18][joint] * opening
            rig.pose.bones[name].rotation_quaternion = rotation @ Quaternion(Vector((1, 0, 0)), -release_angle)
    for bone in rig.pose.bones:
        if bone.name in previous_rotations and bone.rotation_quaternion.dot(previous_rotations[bone.name]) < 0:
            bone.rotation_quaternion.negate()
        previous_rotations[bone.name] = bone.rotation_quaternion.copy()
        bone.keyframe_insert('location', frame=frame, group=bone.name)
        bone.keyframe_insert('rotation_quaternion', frame=frame, group=bone.name)
    bpy.context.view_layer.update()
    samples.append({
        'frame': frame, 'wrist': list(hand.head), 'magazine': list(magazine_matrix(frame).translation),
        'thumbFlexionDegrees': {bone.name: math.degrees(bone.rotation_quaternion.to_euler('XYZ').x) for bone in thumb_bones[1:]},
    })

for layer in action.layers:
    for strip in layer.strips:
        for slot in action.slots:
            bag = strip.channelbag(slot)
            if bag:
                for curve in bag.fcurves:
                    for point in curve.keyframe_points:
                        point.interpolation = 'LINEAR'
rig.animation_data.action = None
for track in rig.animation_data.nla_tracks:
    track.mute = False
track = rig.animation_data.nla_tracks.new()
track.name = 'Reload'
strip = track.strips.new('Reload_LeftHand_MagazineGrip', 1, action)
strip.blend_type = 'REPLACE'
strip.extrapolation = 'NOTHING'

anchor = bpy.data.objects.get('MagazineGripAnchor')
if anchor is None:
    anchor = bpy.data.objects.new('MagazineGripAnchor', None)
    scene.collection.objects.link(anchor)
anchor.parent = magazine
anchor.matrix_parent_inverse = Matrix.Identity(4)
anchor.matrix_basis = grip_local
anchor.empty_display_size = .015
for index, vertex in enumerate(pad_vertices[:3]):
    name = 'ThumbPadContact' + (str(index) if index else '')
    marker = bpy.data.objects.get(name) or bpy.data.objects.new(name, None)
    if not marker.users_collection:
        scene.collection.objects.link(marker)
    marker.parent = rig
    marker.parent_type = 'BONE'
    marker.parent_bone = 'L_thumb.03'
    marker.matrix_parent_inverse = Matrix.Identity(4)
    local = thumb_rest.inverted() @ vertex.co
    marker.location = local - Vector((0, rig.data.bones['L_thumb.03'].length, 0))
    marker.empty_display_size = .002
    marker['sourceVertex'] = vertex.index
    marker['sourceMesh'] = body.name
    marker['padNormalLocal'] = list((thumb_rest.to_3x3().inverted() @ vertex.normal).normalized())
scene.frame_set(1)
bpy.context.view_layer.update()
(SOURCE / 'exports/reload-validation.json').write_text(json.dumps({
    'source': 'assets/source/ak47/reload.py', 'contactFrames': [33, 119],
    'gripErrorsM': grip_errors, 'thumbPadErrorM': thumb_pad_error, 'thumbPadNormalAlignment': thumb_pad_alignment, 'samples': samples,
}, indent=2) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'ak47.blend'))
print(json.dumps({'frames': len(samples), 'gripErrorsM': grip_errors, 'magazineKeysPreserved': True}))
