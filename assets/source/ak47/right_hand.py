"""Mirror the accepted left-hand assembly and fit a right pistol-grip hand.

Run in Blender with ak47.blend open, then export with build.py. The saved blend
owns the result. This only replaces the R_Armature assembly created here.
"""
from pathlib import Path
import math
import json
import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector, Quaternion, Euler
from mathutils.bvhtree import BVHTree

SOURCE = Path(__file__).resolve().parent
scene = bpy.context.scene
scene.frame_set(1)
left = bpy.data.objects['L_Armature']
root = bpy.data.objects['AK47_Rig']
previous = bpy.data.objects.get('R_Armature')
if previous:
    for ob in [*previous.children_recursive, previous]:
        bpy.data.objects.remove(ob, do_unlink=True)
for action in list(bpy.data.actions):
    if action.users == 0 and action.name.startswith(('Idle_RightHand_PistolGrip', 'Reload_RightHand_PistolGrip')):
        bpy.data.actions.remove(action)
mirror = Matrix.Diagonal(Vector((-1, 1, 1, 1)))
names = {b.name: ('GripHand' if b.name == 'SupportHand' else b.name.replace('L_', 'R_', 1)) for b in left.data.bones}
rest = {b.name: (b.matrix_local.copy(), b.length) for b in left.data.bones}
right = left.copy()
right.data = left.data.copy()
right.name = 'R_Armature'
right.data.name = 'Right_hand_anatomical_rig'
right.animation_data_clear()
scene.collection.objects.link(right)
right.parent = root
bpy.context.view_layer.objects.active = right
bpy.ops.object.select_all(action='DESELECT')
right.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for bone in right.data.edit_bones:
    old = bone.name
    bone.matrix = mirror @ rest[old][0] @ mirror
    bone.length = rest[old][1]
    bone.name = names[old]
bpy.ops.object.mode_set(mode='OBJECT')
for bone in right.pose.bones:
    for constraint in list(bone.constraints):
        bone.constraints.remove(constraint)
    bone.matrix_basis = Matrix.Identity(4)
    bone.rotation_mode = 'QUATERNION'

for ob in list(left.children_recursive):
    if ob.type != 'MESH' or not any(m.type == 'ARMATURE' and m.object == left for m in ob.modifiers):
        continue
    copy = ob.copy()
    copy.data = ob.data.copy()
    copy.name = 'R_' + (ob.name[2:] if ob.name.startswith('L_') else ob.name)
    copy.data.name = copy.name
    copy.animation_data_clear()
    scene.collection.objects.link(copy)
    copy.parent = right
    copy.data.transform(mirror)
    bm = bmesh.new()
    bm.from_mesh(copy.data)
    bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.to_mesh(copy.data)
    bm.free()
    for group in copy.vertex_groups:
        group.name = names.get(group.name, group.name)
    for modifier in copy.modifiers:
        if modifier.type == 'ARMATURE':
            modifier.object = right
    # The left fore-end occlusion bake does not describe a pistol grip.
    for slot in copy.material_slots:
        if slot.material.name == 'Urban Breacher glove':
            material = bpy.data.materials.get('Right Urban Breacher glove')
            if material is None:
                material = slot.material.copy()
                material.name = 'Right Urban Breacher glove'
                for node in material.node_tree.nodes:
                    for socket in node.inputs:
                        if socket.name == 'Occlusion':
                            for link in list(socket.links):
                                material.node_tree.links.remove(link)
            slot.material = material
body = bpy.data.objects['R_GloveAndForearm']

# Right hand: thumb/index side is +X in the mirrored neutral palm. Palm normal
# is +Z; wrist-to-knuckles is +Y. Rotate that palm onto the gun's right side.
angle = math.radians(20)
rotation = Matrix(((-math.sin(angle), math.cos(angle), 0), (0, 0, 1), (math.cos(angle), math.sin(angle), 0)))
wrist = Vector((-.270, -.036, -.036))
arm_rotation = rotation.to_quaternion() @ Quaternion(Vector((1, 0, 0)), math.radians(-12))
direction = arm_rotation @ Vector((0, 1, 0))
def place(name, point, orientation):
    matrix = orientation.to_matrix().to_4x4()
    matrix.translation = point
    right.pose.bones[name].matrix = matrix
    bpy.context.view_layer.update()
for name, distance in [('R_upper_arm', .58), ('R_upper_arm.001', .42), ('R_forearm', .26), ('R_forearm.001', .13)]:
    place(name, wrist - direction * distance, arm_rotation)
place('GripHand', wrist, rotation.to_quaternion())

weapon = bpy.data.objects['AK47_Rig_Surfaces']
surface = BVHTree.FromPolygons([weapon.matrix_world @ v.co for v in weapon.data.vertices], [tuple(p.vertices) for p in weapon.data.polygons])

def pad(finger):
    name = 'R_' + finger + '.03'
    bone = right.data.bones[name]
    inverse = bone.matrix_local.inverted()
    target = Vector((0, bone.length * (.95 if finger == 'f_index' else .62), .007))
    candidates = []
    for v in body.data.vertices:
        weight = sum(g.weight for g in v.groups if body.vertex_groups[g.group].name == name)
        if weight > .999:
            local = inverse @ v.co
            candidates.append(((local - target).length, v, local))
    candidates.sort(key=lambda x: x[0])
    samples = candidates[:3]
    point = sum((x[2] for x in samples), Vector()) / len(samples)
    normal = sum((inverse.to_3x3() @ x[1].normal for x in samples), Vector()).normalized()
    return point, normal, [x[1].index for x in samples]

contact_data = {}
def fit(finger, target, inward, prior, lower, upper):
    bones = [right.pose.bones['R_' + finger + '.' + str(i).zfill(2)] for i in [1, 2, 3]]
    point, normal, indices = pad(finger)
    prior, lower, upper = map(lambda v: np.radians(v), [prior, lower, upper])
    values = prior.copy()
    normal_weight = .005 if finger == 'f_index' else .02
    def evaluate(v):
        bones[0].rotation_quaternion = Euler(tuple(v[:3]), 'XYZ').to_quaternion()
        for i in [1, 2]:
            bones[i].rotation_quaternion = Quaternion(Vector((1, 0, 0)), float(v[i + 2]))
        bpy.context.view_layer.update()
        p = bones[2].matrix @ point
        n = (bones[2].matrix.to_3x3() @ normal).normalized()
        return np.concatenate((np.array(p) * 3, np.array(n) * normal_weight))
    desired = np.concatenate((np.array(target) * 3, np.array(inward) * normal_weight))
    for _ in range(100):
        actual = evaluate(values)
        jacobian = np.empty((6, 5))
        for i in range(5):
            sample = values.copy(); sample[i] += .002
            jacobian[:, i] = (evaluate(sample) - actual) / .002
        gradient = jacobian.T @ (desired - actual) - (values - prior) * .0000001
        free = ((values > lower + .00001) | (gradient > 0)) & ((values < upper - .00001) | (gradient < 0))
        active = jacobian[:, free]
        step = np.zeros(5)
        step[free] = np.linalg.solve(active.T @ active + np.eye(np.count_nonzero(free)) * .000002, gradient[free])
        updated = np.clip(values + np.clip(step, -.12, .12), lower, upper)
        if np.max(np.abs(updated - values)) < .00001:
            break
        values = updated
    evaluate(values)
    gap = (bones[2].matrix @ point - target).length
    print('CONTACT', finger, 'gap', gap, 'angles', np.degrees(values).tolist(), 'point', list(bones[2].matrix @ point))
    if gap > .003:
        raise RuntimeError('Right-hand pad did not reach the grip: ' + finger)
    contact_data[finger] = {'gap': gap, 'anglesDeg': list(np.degrees(values)), 'vertices': indices, 'target': list(target)}
    for i, index in enumerate(indices):
        marker = bpy.data.objects.new('RightPad_' + finger + '_' + str(i), None)
        scene.collection.objects.link(marker)
        marker.parent = right
        marker.parent_type = 'BONE'
        marker.parent_bone = bones[2].name
        marker.location = right.data.bones[bones[2].name].matrix_local.inverted() @ body.data.vertices[index].co - Vector((0, right.data.bones[bones[2].name].length, 0))
        marker['sourceVertex'] = index
        marker['sourceMesh'] = body.name

for finger, z in [('f_middle', -.010), ('f_ring', -.032), ('f_pinky', -.053)]:
    hit, normal, _, _ = surface.ray_cast(Vector((-.1, .009, z)), Vector((-1, 0, 0)), .15)
    if hit is None:
        raise RuntimeError('No pistol-grip front surface for ' + finger)
    hit, normal, _, _ = surface.ray_cast(Vector((hit.x - .008, .1, z)), Vector((0, -1, 0)), .15)
    if hit is None:
        raise RuntimeError('No left-side wrap surface for ' + finger)
    fit(finger, hit + normal * .0005, -normal, [55, 0, 0, 55, 25], [5, -20, -30, 5, 0], [100, 20, 30, 105, 70])
# Thumb opposes the curled fingers at the upper left side of the grip.
hit, normal, _, _ = surface.ray_cast(Vector((-.198, .1, -.002)), Vector((0, -1, 0)), .15)
if hit is None:
    raise RuntimeError('No thumb opposition surface')
fit('thumb', hit + normal * .0005, -normal, [25, -15, -45, 20, 15], [-50, -70, -85, 0, 0], [65, 70, 70, 55, 65])

# Rest the index pad on the front face of the modeled trigger.
trigger = bpy.data.objects['Trigger_Surfaces']
trigger_surface = BVHTree.FromPolygons([trigger.matrix_world @ v.co for v in trigger.data.vertices], [tuple(p.vertices) for p in trigger.data.polygons])
hit, normal, _, _ = trigger_surface.ray_cast(Vector((-.08, 0, .024)), Vector((-1, 0, 0)), .1)
if hit is None:
    raise RuntimeError('No trigger contact surface')
fit('f_index', hit + normal * .0003, -normal, [25, 0, 10, 30, 15], [0, -35, -35, 0, 0], [95, 35, 35, 100, 70])

if not (right.data.bones['R_thumb.01'].head_local.x > .015
        and right.data.bones['R_f_index.01'].head_local.x > right.data.bones['R_f_pinky.01'].head_local.x + .05):
    raise RuntimeError('Mirrored anatomy is not a right hand')
# Identical rigid grip keys in both clips prevent blend/cancellation drift.
pose = {b.name: (b.location.copy(), b.rotation_quaternion.copy(), b.scale.copy()) for b in right.pose.bones}
for clip, end in [('Idle', 2), ('Reload', 148)]:
    action = bpy.data.actions.new(clip + '_RightHand_PistolGrip')
    right.animation_data_create()
    right.animation_data.action = action
    for frame in [1, end]:
        for name, (location, quaternion, scale) in pose.items():
            bone = right.pose.bones[name]
            bone.location, bone.rotation_quaternion, bone.scale = location, quaternion, scale
            for channel in ['location', 'rotation_quaternion', 'scale']:
                bone.keyframe_insert(data_path=channel, frame=frame, group=name)
    track = right.animation_data.nla_tracks.new()
    track.name = clip
    strip = track.strips.new(clip, 1, action)
    strip.action_slot = action.slots[0]
    right.animation_data.action = None
right['handedness'] = 'right; mirrored left rest mesh and skeleton across local X with corrected face winding'
right['grip_design'] = 'Palm on right/rear pistol grip; three curled fingers on front; opposed thumb on left; index pad resting against the trigger'
right['contact_validation'] = json.dumps(contact_data)
scene.frame_set(1)
bpy.context.view_layer.update()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'ak47.blend'))
print('RIGHT_HAND_AUTHORED', json.dumps(contact_data))
