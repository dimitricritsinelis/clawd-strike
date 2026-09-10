"""Bake the user-selected Case 04 grip into the existing magazine reload.

The selected blend owns the glove and closed pose. Its original Reload action
owns the wrist/arm path. Weapon, magazine, right-hand and idle actions stay intact.
Writes an isolated review blend by default. Pass -- --install to promote the
validated result to ak47.blend after approval; build.py exports the runtime file.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import sys
import bpy
import numpy as np
from mathutils import Quaternion

SOURCE = Path(__file__).resolve().parent
SELECTED = SOURCE / 'left-hand-case04.blend'
OUT = SOURCE / 'exports/selected-case04'
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--install', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
destination = SOURCE/'ak47.blend' if args.install else OUT/'case04-reload-preview.blend'
bpy.ops.wm.open_mainfile(filepath=str(SELECTED))
scene = bpy.context.scene
rig = bpy.data.objects['L_Armature']
magazine = bpy.data.objects['Magazine']
digits = [b.name for b in rig.pose.bones if b.name.startswith(('L_f_', 'L_thumb.'))]
thumb_names = ['L_thumb.01', 'L_thumb.02', 'L_thumb.03']
if scene.frame_current != 33 or rig.animation_data.action or any(not t.mute for t in rig.animation_data.nla_tracks):
    raise RuntimeError('Selected checkpoint must have frame 33 and muted left-hand tracks')
if any(b.rotation_mode != 'QUATERNION' or b.constraints for b in rig.pose.bones):
    raise RuntimeError('Expected the verified quaternion deformation rig without constraints')
if (scene.frame_start, scene.frame_end, scene.render.fps) != (1, 148, 120):
    raise RuntimeError('The selected grip must retain the 148-frame, 120 fps reload')
bpy.context.view_layer.update()

def curve_rows(action, include=None):
    rows = []
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    if include is None or include(curve):
                        rows.append((curve.data_path, curve.array_index, [(list(k.co), list(k.handle_left), list(k.handle_right), k.interpolation) for k in curve.keyframe_points]))
    return rows

def signature(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()

def coordinates(ob):
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    values = np.empty(len(ev.data.vertices)*3, dtype=np.float64)
    ev.data.vertices.foreach_get('co', values)
    return values.reshape((-1, 3))

left_meshes = [o for o in scene.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == rig for m in o.modifiers)]
selected_surface = {o.name: coordinates(o) for o in left_meshes}
closed = {n: (rig.pose.bones[n].location.copy(), rig.pose.bones[n].rotation_quaternion.copy(), rig.pose.bones[n].scale.copy()) for n in digits}
selected_hand = rig.pose.bones['SupportHand'].matrix.copy()
selected_magazine = magazine.matrix_world.copy()
flex_axes = {}
for name in thumb_names[1:]:
    q = closed[name][1].copy()
    if q.w < 0:
        q.negate()
    flex_axes[name] = q.axis.normalized()
    rig.pose.bones[name]['flexAxisLocal'] = list(flex_axes[name])

idle_track = rig.animation_data.nla_tracks['Idle']
reload_track = rig.animation_data.nla_tracks['Reload']
reload_strip = reload_track.strips[0]
base_action = reload_strip.action
protected_actions = {a.name: signature(curve_rows(a)) for a in bpy.data.actions}
digit_paths = {f'pose.bones["{n}"].{p}' for n in digits for p in ['location', 'rotation_quaternion', 'scale']}
arm_curves = signature(curve_rows(base_action, lambda c: c.data_path not in digit_paths))
rig.animation_data.action = idle_track.strips[0].action
rig.animation_data.action_slot = rig.animation_data.action.slots[0]
scene.frame_set(1)
bpy.context.view_layer.update()
idle = {n: (rig.pose.bones[n].location.copy(), rig.pose.bones[n].rotation_quaternion.copy(), rig.pose.bones[n].scale.copy()) for n in digits}
idle_surface = {o.name: coordinates(o) for o in left_meshes}
rig.animation_data.action = base_action
rig.animation_data.action_slot = base_action.slots[0]
scene.frame_set(33)
bpy.context.view_layer.update()
if max(abs(a-b) for ra,rb in zip(selected_hand, rig.pose.bones['SupportHand'].matrix) for a,b in zip(ra,rb)) > 1e-5:
    raise RuntimeError('Selected wrist differs from the preserved reload path')
action = base_action.copy()
action.name = 'Reload_LeftHand_Case04'
rig.animation_data.action = action
rig.animation_data.action_slot = action.slots[0]

def smooth(value):
    value = min(1., max(0., value))
    return value**3 * (10 + value*(-15 + 6*value))

previous = {}
pose_samples = []
for frame in range(1, 149):
    scene.frame_set(frame)
    if frame < 33:
        amount = smooth((frame-3)/30)
        opening = smooth((frame-3)/9) * (1-smooth((frame-24)/9))
    elif frame <= 119:
        amount, opening = 1., 0.
    else:
        amount = 1-smooth((frame-119)/29)
        opening = smooth((frame-119)/7) * (1-smooth((frame-137)/11))
    for name in digits:
        bone = rig.pose.bones[name]
        bone.location = idle[name][0].lerp(closed[name][0], amount)
        bone.scale = idle[name][2].lerp(closed[name][2], amount)
        rotation = idle[name][1].slerp(closed[name][1], amount)
        joint = int(name[-2:])
        if name.startswith('L_thumb.'):
            # Open at the CMC, retaining slight curvature on the measured
            # broad-pulp hinge axes. The selected grip remains exact at contact.
            opened = Quaternion() if joint == 1 else Quaternion(flex_axes[name], math.radians(3 if joint == 2 else 2))
            rotation = rotation.slerp(opened, opening)
        else:
            release = [0, .08 if name.startswith('L_f_pinky.') else .28, .38, .18][joint] * opening
            rotation = rotation @ Quaternion((1, 0, 0), -release)
        if name in previous and rotation.dot(previous[name]) < 0:
            rotation.negate()
        bone.rotation_quaternion = rotation
        previous[name] = rotation.copy()
        for path in ['location', 'rotation_quaternion', 'scale']:
            bone.keyframe_insert(path, frame=frame, group=name)
    bpy.context.view_layer.update()
    pose_samples.append({'frame':frame, 'amount':amount, 'opening':opening, 'wrist':list(rig.pose.bones['SupportHand'].head), 'thumbQuaternions':{n:list(rig.pose.bones[n].rotation_quaternion) for n in thumb_names}})
for layer in action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for curve in bag.fcurves:
                if curve.data_path in digit_paths:
                    for point in curve.keyframe_points:
                        point.interpolation = 'LINEAR'
if arm_curves != signature(curve_rows(action, lambda c: c.data_path not in digit_paths)):
    raise RuntimeError('Authoring altered the original arm/wrist curves')
if any(protected_actions[a.name] != signature(curve_rows(a)) for a in bpy.data.actions if a.name in protected_actions):
    raise RuntimeError('Authoring altered a protected original action')

rig.animation_data.action = None
reload_strip.action = action
reload_strip.action_slot = action.slots[0]
for track in rig.animation_data.nla_tracks:
    track.mute = track.name != 'Reload'
scene.frame_set(33)
bpy.context.view_layer.update()
static_error = max(float(np.max(np.linalg.norm(coordinates(o)-selected_surface[o.name], axis=1))) for o in left_meshes)
if static_error > 1e-5:
    raise RuntimeError('Baked grip changed the selected static surface: '+str(static_error))
relative = selected_magazine.inverted() @ rig.matrix_world @ selected_hand
hold_error = 0.
for frame in range(33, 120):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    actual = magazine.matrix_world.inverted() @ rig.matrix_world @ rig.pose.bones['SupportHand'].matrix
    hold_error = max(hold_error, max(abs(a-b) for ra,rb in zip(relative, actual) for a,b in zip(ra,rb)))
if hold_error > 1e-5:
    raise RuntimeError('Selected grip slips relative to the magazine: '+str(hold_error))
endpoint_errors = {}
for frame in [1, 148]:
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    endpoint_errors[frame] = max(float(np.max(np.linalg.norm(coordinates(o)-idle_surface[o.name], axis=1))) for o in left_meshes)
if max(endpoint_errors.values()) > 1e-5:
    raise RuntimeError('Reload endpoints do not match the preserved idle surface')

sample_meshes = left_meshes + [bpy.data.objects['R_GloveAndForearm']]
source_samples = {}
for ob in sample_meshes:
    count = len(ob.data.vertices)
    indices = set(range(0, count, max(1, count//80)))
    thumb_ids = [v.index for v in ob.data.vertices if any(ob.vertex_groups[g.group].name.startswith('L_thumb.') and g.weight>.2 for g in v.groups)]
    indices.update(thumb_ids[::max(1, len(thumb_ids)//80)])
    source_samples[ob.name] = {'indices':sorted(indices), 'bindPositions':[list(ob.data.vertices[i].co) for i in sorted(indices)], 'frames':{}}
for frame in [1, 12, 18, 24, 28, 31, 33, 76, 119, 123, 126, 132, 137, 148]:
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    for ob in sample_meshes:
        values = coordinates(ob)
        record = source_samples[ob.name]
        record['frames'][frame] = {'positions':values[record['indices']].tolist(), 'matrixWorld':[list(row) for row in ob.matrix_world]}
validation = {'selectedCase':'case-04', 'selectedSource':SELECTED.name, 'selectedSourceSHA256':hashlib.sha256(SELECTED.read_bytes()).hexdigest(),
              'sourcePromoted':args.install, 'blendDestination':str(destination),
              'durationSeconds':147/120, 'contactFrames':[33,119], 'staticSurfaceMaxErrorM':static_error,
              'holdMatrixMaxError':hold_error, 'endpointSurfaceMaxErrorsM':endpoint_errors,
              'originalActionsUnchanged':True, 'armWristCurvesUnchanged':True, 'thumbFlexAxesLocal':{n:list(a) for n,a in flex_axes.items()},
              'staticContactStatus':'User-selected visual pose retained, including its recorded static contact limitations.',
              'samples':pose_samples, 'meshes':source_samples}
(OUT/'source-validation.json').write_text(json.dumps(validation, indent=2)+'\n')
for track in rig.animation_data.nla_tracks:
    track.mute = False
scene['selected_grip'] = 'Case 04, selected by user from the controlled grip comparison'
scene['review_status'] = 'User-approved Case 04 reload installed' if args.install else 'Case 04 reload preview; awaiting approval to replace the active asset'
if args.install:
    scene['grip_experiment_status'] = 'Case 04 selected and approved; experiment results retained separately'
scene.frame_set(1)
bpy.context.view_layer.update()
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(destination))
print(json.dumps({k:v for k,v in validation.items() if k not in ['samples','meshes']}), flush=True)
