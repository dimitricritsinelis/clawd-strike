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
scene.frame_set(1)
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
body = bpy.data.objects['L_GloveAndForearm']
thumb_rest = rig.data.bones['L_thumb.03'].matrix_local
thumb_pad_mesh = bpy.data.objects['Palm heel suede overlay']
pad_vertices = [thumb_pad_mesh.data.vertices[i] for i in [9356, 19670, 850]]

# Preserve the accepted idle pose exactly; this assignment only changes reload.
rig.animation_data.action = None

curves = mag_action.layers[0].strips[0].channelbag(mag_action.slots[0]).fcurves
def magazine_matrix(frame):
    values = {(fc.data_path, fc.array_index): fc.evaluate(frame) for fc in curves}
    location = Vector([values[('location', i)] for i in range(3)])
    rotation = Euler([values[('rotation_euler', i)] for i in range(3)], 'XYZ').to_matrix().to_4x4()
    rotation.translation = location
    return rotation

mag_rest = magazine_matrix(1)
# The wrist enters from below. The knuckles follow the magazine's curved
# front edge, with the back of the left hand facing the player.
grip = Matrix(((.8191520, .5735764, 0), (0, 0, -1), (-.5735764, .8191520, 0))).to_4x4()
grip.translation = Vector((-.018, .043, -.125))
grip_local = mag_rest.inverted() @ grip
rig.animation_data.action = None
hand.matrix = grip
bpy.context.view_layer.update()

# Seat the index knuckle nearer the front corner so its shorter phalanges
# can curl onto the far face instead of remaining hooked above the edge.
index_base = rig.pose.bones['L_f_index.01']
index_matrix = index_base.matrix.copy()
index_matrix.translation += Vector((.006, -.006, 0))
index_base.matrix = index_matrix
bpy.context.view_layer.update()

# Fit the closed fingers to the actual two sides of the magazine. The thumb
# braces the rear edge, opposing the fingers around the front edge.
surface_object = bpy.data.objects['Magazine_Surfaces']
surface = BVHTree.FromPolygons([surface_object.matrix_world @ v.co for v in surface_object.data.vertices],
                              [list(p.vertices) for p in surface_object.data.polygons])
finger_names = ['f_index', 'f_middle', 'f_ring', 'f_pinky']
targets = {}
# Fit the complete skin arc and keep adjacent digits separate, including the
# middle knuckle that previously crossed underneath the index.
finger_samples = {}
for finger in finger_names:
    samples = []
    for vertex in body.data.vertices:
        if sum(g.weight for g in vertex.groups if body.vertex_groups[g.group].name.startswith('L_' + finger + '.')) < (.2 if finger == 'f_index' else .8):
            continue
        samples.append([(body.vertex_groups[g.group].name, g.weight,
                         rig.data.bones[body.vertex_groups[g.group].name].matrix_local.inverted() @ vertex.co)
                        for g in vertex.groups])
    finger_samples[finger] = samples[::24]
solved_surfaces = []
for finger, height in zip(finger_names, [-.012, -.028, -.049, -.074]):
    marker = bpy.data.objects['GripContact_' + finger]
    edge, _, _, _ = surface.ray_cast(Vector((.2, 0, height)), Vector((-1, 0, 0)), .4)
    if edge is None:
        raise RuntimeError('Missing magazine front edge: ' + finger)
    hit, _, _, _ = surface.ray_cast(Vector((edge.x - .012, -.1, height)), Vector((0, 1, 0)), .2)
    if hit is None:
        raise RuntimeError('Missing magazine far face: ' + finger)
    target = hit + Vector((0, -.0105, 0))
    targets[finger] = target
    bones = [rig.pose.bones['L_' + finger + '.' + str(i).zfill(2)] for i in [1, 2, 3]]
    prior = np.radians({'f_index': [40, 0, 0, 60, 40], 'f_middle': [52, -16, 8, 27, 65], 'f_ring': [71, -9, -22, 23, 55], 'f_pinky': [66, -2, 8, 41, 29]}[finger])
    lower = np.radians([5, -20, -30, 5, 0])
    upper = np.radians([100, 20, 30, 105, 65])
    angles = np.clip(prior, lower, upper)

    def evaluate(values):
        bones[0].rotation_quaternion = Euler(tuple(values[:3]), 'XYZ').to_quaternion()
        for index in [1, 2]:
            bones[index].rotation_quaternion = Quaternion(Vector((1, 0, 0)), float(values[index + 2]))
        bpy.context.view_layer.update()
        contact = np.array(marker.matrix_world.translation) * np.array([3, 8, 3])
        clearance = []
        for sample in finger_samples[finger]:
            point = sum((rig.pose.bones[name].matrix @ local * weight for name, weight, local in sample), Vector())
            nearest, normal, _, _ = surface.find_nearest(point)
            clearance.append(max(0, (.0039 if finger == 'f_index' else .0035) - (point - nearest).dot(normal)) * 5)
            for other in solved_surfaces:
                nearest, normal, _, distance = other.find_nearest(point)
                clearance.append(max(0, .005 - (point - nearest).dot(normal)) * 5 if distance < .015 else 0)
        return np.concatenate((contact, clearance, (values-prior)*.0005))

    desired = np.concatenate((np.array(target) * np.array([3, 8, 3]), np.zeros(len(finger_samples[finger]) * (1 + len(solved_surfaces)) + 5)))
    for _ in range(250):
        point = evaluate(angles)
        error = desired - point
        jacobian = np.empty((len(desired), len(angles)))
        for index in range(len(angles)):
            sample = angles.copy(); sample[index] += .002
            jacobian[:, index] = (evaluate(sample) - point) / .002
        gradient = jacobian.T @ error - (angles - prior) * .0000001
        free = ((angles > lower + .00001) | (gradient > 0)) & ((angles < upper - .00001) | (gradient < 0))
        active = jacobian[:, free]
        step = np.zeros(5)
        step[free] = np.linalg.solve(active.T @ active + np.eye(np.count_nonzero(free)) * .000002, gradient[free])
        # Backtracking avoids oscillating across a contact boundary when a
        # nearby triangle changes the clearance gradient.
        updated = angles.copy()
        for factor in [1, .5, .25, .125, .0625, .03125]:
            trial = np.clip(angles + np.clip(step, -.12, .12) * factor, lower, upper)
            residual = desired - evaluate(trial)
            if residual @ residual < error @ error:
                updated = trial
                break
        if np.max(np.abs(updated - angles)) < .00001:
            best = error @ error
            for distance in [.04, .01, .002]:
                for axis in range(5):
                    for sign in [-1, 1]:
                        trial = angles.copy()
                        trial[axis] = np.clip(trial[axis] + sign * distance, lower[axis], upper[axis])
                        residual = desired - evaluate(trial)
                        if residual @ residual < best:
                            best, updated = residual @ residual, trial
            if np.max(np.abs(updated - angles)) < .00001:
                break
        angles = updated
    evaluate(angles)
    point = marker.matrix_world.translation
    seated, _, _, _ = surface.ray_cast(Vector((point.x, -.1, point.z)), Vector((0, 1, 0)), .2)
    if seated is None or abs(point.z - height) > .008:
        raise RuntimeError('Finger left its magazine contact band: ' + str((finger, list(point), list(np.degrees(angles)))))
    targets[finger] = seated + Vector((0, -.0105, 0))
    print('MAGAZINE_FINGER', finger, 'gap', float((marker.matrix_world.translation - targets[finger]).length), 'angles', list(np.degrees(angles)))
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    digit_vertices = {v.index for v in body.data.vertices if sum(g.weight for g in v.groups if body.vertex_groups[g.group].name.startswith('L_' + finger + '.')) > .8}
    solved_surfaces.append(BVHTree.FromPolygons([body.matrix_world @ v.co for v in evaluated.data.vertices],
        [list(p.vertices) for p in body.data.polygons if all(i in digit_vertices for i in p.vertices)]))
# Close the thumb around the rear corner onto a flat broad-face patch.
# The small CMC adjustment lets the thenar skin follow the bend without
# pinching the web or driving it through the steel. Idle remains unchanged.
thumb_bones[0].location = Vector((-.007295321673154831, .007252417504787445, -.00203490536659956))
rear, _, _, _ = surface.ray_cast(Vector((-.2, 0, -.052)), Vector((1, 0, 0)), .4)
hit, face_normal, _, _ = surface.ray_cast(Vector((rear.x + .010, -.1, -.052)), Vector((0, 1, 0)), .2)
if hit is None or face_normal.dot(Vector((0, -1, 0))) < .99:
    raise RuntimeError('Missing flat thumb contact patch on the magazine far face')
thumb_angles = np.radians([103.15217344145215, 25.21381682995155, 150.87512556750065, 71.22456745388021, 48.42194723367943])
thumb_bones[0].rotation_quaternion = Euler(tuple(thumb_angles[:3]), 'XYZ').to_quaternion()
for index in [1, 2]:
    thumb_bones[index].rotation_quaternion = Quaternion(Vector((1, 0, 0)), float(thumb_angles[index + 2]))
bpy.context.view_layer.update()
thumb_pad_error = 0
thumb_pad_alignment = 1
for vertex in pad_vertices[:3]:
    point = thumb_bones[2].matrix @ (thumb_rest.inverted() @ vertex.co)
    nearest, _, _, _ = surface.find_nearest(point)
    normal = thumb_bones[2].matrix.to_3x3() @ thumb_rest.to_3x3().inverted() @ vertex.normal
    thumb_pad_error = max(thumb_pad_error, (point - nearest).length)
    thumb_pad_alignment = min(thumb_pad_alignment, normal.normalized().dot(-face_normal))
if thumb_pad_error > .0005 or thumb_pad_alignment < .94:
    raise RuntimeError('Thumb padding is not pressed against the far face: ' + str((thumb_pad_error, thumb_pad_alignment)))
# Check the complete rendered skin, including the reinforcement thickness.
finger_clearance = {}
grip_errors = {}
for name in ['L_GloveAndForearm', 'Palm heel suede overlay']:
    mesh_object = bpy.data.objects[name]
    evaluated = mesh_object.evaluated_get(bpy.context.evaluated_depsgraph_get())
    for finger in [*finger_names, 'thumb']:
        minimum = float('inf')
        pad_gap = float('inf')
        for vertex, deformed in zip(mesh_object.data.vertices, evaluated.data.vertices):
            if sum(g.weight for g in vertex.groups if mesh_object.vertex_groups[g.group].name.startswith('L_' + finger + '.')) < (.2 if finger == 'f_index' else .8):
                continue
            point = mesh_object.matrix_world @ deformed.co
            nearest, normal, _, _ = surface.find_nearest(point)
            minimum = min(minimum, (point - nearest).dot(normal))
            if finger != 'thumb' and point.y < -.005 and sum(g.weight for g in vertex.groups if mesh_object.vertex_groups[g.group].name == 'L_' + finger + '.03') > .8:
                pad_gap = min(pad_gap, (point - nearest).length)
        if name == 'Palm heel suede overlay' and finger != 'thumb':
            grip_errors[finger] = pad_gap
        finger_clearance[name + '/' + finger] = minimum
        if minimum < -.00005:
            raise RuntimeError('Digit surface intersects magazine: ' + str((name, finger, minimum)))

grip_locations = {name: rig.pose.bones[name].location.copy() for name in ['L_f_index.01', 'L_thumb.01']}
grip_fingers = {b.name: b.rotation_quaternion.copy() for b in rig.pose.bones if b.name.startswith(('L_f_', 'L_thumb.'))}
if max(grip_errors.values()) > .0015:
    raise RuntimeError('Wrapped finger pads must contact the far face: ' + str(grip_errors))

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
                 @ Matrix.Rotation(tilt*.48, 4, 'Y')
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
    for name, location in grip_locations.items():
        rig.pose.bones[name].location = idle[name][0].lerp(location, amount)
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
            release_angle = [0, .08 if name.startswith('L_f_pinky.') else .28, .38, .18][joint] * opening
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
    marker['sourceMesh'] = thumb_pad_mesh.name
    marker['padNormalLocal'] = list((thumb_rest.to_3x3().inverted() @ vertex.normal).normalized())
    contact_normal = mag_rest.to_3x3().inverted() @ -face_normal
    marker['contactNormalMagazineLocal'] = [contact_normal.x, contact_normal.z, -contact_normal.y]
scene.frame_set(1)
bpy.context.view_layer.update()
(SOURCE / 'exports/reload-validation.json').write_text(json.dumps({
    'source': 'assets/source/ak47/reload.py', 'contactFrames': [33, 119],
    'gripErrorsM': grip_errors, 'fingerSurfaceClearanceM': finger_clearance, 'thumbPadErrorM': thumb_pad_error, 'thumbPadNormalAlignment': thumb_pad_alignment, 'samples': samples,
}, indent=2) + '\n')
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'ak47.blend'))
print(json.dumps({'frames': len(samples), 'gripErrorsM': grip_errors, 'magazineKeysPreserved': True}))
