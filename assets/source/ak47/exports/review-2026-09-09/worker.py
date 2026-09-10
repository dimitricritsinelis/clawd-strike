"""Evaluate one declared static-grip experiment in an independent Blender process."""
import argparse
import array
import hashlib
import importlib.util
import json
import math
import sys
import time
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

HERE = Path(__file__).resolve().parent


def module(name):
    spec = importlib.util.spec_from_file_location(name, HERE / (name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def mesh_hash(mesh, evaluated=False):
    h = hashlib.sha256()
    for elements, property_name, width, kind in [(mesh.vertices, 'co', 3, 'f'), (mesh.loops, 'vertex_index', 1, 'i')]:
        values = array.array(kind, [0]) * (len(elements) * width)
        elements.foreach_get(property_name, values)
        h.update(values.tobytes())
    if not evaluated:
        for uv in mesh.uv_layers:
            h.update(uv.name.encode())
            values = array.array('f', [0]) * (len(uv.data) * 2)
            uv.data.foreach_get('uv', values)
            h.update(values.tobytes())
        for vertex in mesh.vertices:
            for group in vertex.groups:
                h.update(array.array('i', [vertex.index, group.group]).tobytes())
                h.update(array.array('f', [group.weight]).tobytes())
    return h.hexdigest()


def protected_state():
    meshes = {}
    rigs = {}
    transforms = {}
    for ob in bpy.context.scene.objects:
        transforms[ob.name] = {'basis': [list(row) for row in ob.matrix_basis], 'parent': ob.parent.name if ob.parent else None, 'parentBone': ob.parent_bone}
        if ob.type == 'MESH':
            meshes[ob.name] = {'hash': mesh_hash(ob.data), 'materials': [m.name if m else None for m in ob.data.materials], 'groups': [g.name for g in ob.vertex_groups], 'shapes': [(k.name, k.value) for k in ob.data.shape_keys.key_blocks] if ob.data.shape_keys else [], 'modifiers': [(m.name, m.type, m.show_viewport, getattr(m, 'use_deform_preserve_volume', None)) for m in ob.modifiers]}
        if ob.type == 'ARMATURE':
            rigs[ob.name] = {'rest': {b.name: {'matrix': [list(row) for row in b.matrix_local], 'length': b.length, 'parent': b.parent.name if b.parent else None} for b in ob.data.bones}, 'modes': {b.name: b.rotation_mode for b in ob.pose.bones}, 'pose': {b.name: [list(row) for row in b.matrix_basis] for b in ob.pose.bones} if ob.name != 'L_Armature' else None}
    actions = {}
    for action in bpy.data.actions:
        curves = []
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        curves.append((fc.data_path, fc.array_index, [(list(p.co), list(p.handle_left), list(p.handle_right), p.interpolation) for p in fc.keyframe_points]))
        actions[action.name] = digest(curves)
    return {'meshes': meshes, 'rigs': rigs, 'objectTransforms': transforms, 'actions': actions, 'frame': bpy.context.scene.frame_current, 'fps': bpy.context.scene.render.fps / bpy.context.scene.render.fps_base}


def evaluated_hashes():
    dg = bpy.context.evaluated_depsgraph_get()
    result = {}
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ev = ob.evaluated_get(dg)
            mesh = ev.to_mesh()
            try:
                result[ob.name] = mesh_hash(mesh, evaluated=True)
            finally:
                ev.to_mesh_clear()
    return result


def render_case(out, high=False):
    s = bpy.context.scene
    # Diagnostic views supplement the original runtime camera; their geometry
    # and projection are identical for every candidate.
    for name, eye in [('back', (.03, .55, .015)), ('palm', (-.03, -.55, .015)), ('edge', (-.48, .20, -.02))]:
        key = 'Opposition review ' + name
        ob = bpy.data.objects.get(key)
        if ob is None:
            ob = bpy.data.objects.new(key, bpy.data.cameras.new(key))
            s.collection.objects.link(ob)
        ob.location = eye
        ob.rotation_euler = (Vector((.008, 0, -.06)) - ob.location).to_track_quat('-Z', 'Y').to_euler()
        ob.data.type = 'ORTHO'
        ob.data.ortho_scale = .30
    camera = bpy.data.objects['Opposition review gameplay']
    transform = (Matrix.Translation((.151-.045, -.143+.075, -.30-.035)) @ Matrix.Rotation(-.08, 4, 'X') @ Matrix.Rotation(.48, 4, 'Y') @ Matrix.Rotation(-.065-.65, 4, 'Z') @ Matrix.Scale(.90, 4) @ Matrix(((0,-1,0,0),(0,0,1,0),(-1,0,0,0),(0,0,0,1))))
    inverse = transform.inverted()
    camera.location = inverse.translation
    camera.rotation_euler = inverse.to_quaternion().to_euler()
    camera.data.type = 'PERSP'
    camera.data.sensor_fit = 'VERTICAL'
    camera.data.sensor_height = 24
    camera.data.lens = 24 / (2 * math.tan(math.radians(54) / 2))
    s.render.engine = 'CYCLES'
    s.cycles.samples = 32 if high else 12
    s.cycles.seed = 0
    s.cycles.use_denoising = True
    s.render.resolution_percentage = 100
    cameras = {}
    for name in ['back', 'palm', 'edge', 'gameplay']:
        s.camera = bpy.data.objects['Opposition review ' + name]
        s.render.resolution_x = 1280 if high else 960
        s.render.resolution_y = (720 if high else 540) if name == 'gameplay' else (960 if high else 720)
        cameras[name] = {'matrixWorld': [list(row) for row in s.camera.matrix_world], 'type': s.camera.data.type, 'lens': s.camera.data.lens, 'orthoScale': s.camera.data.ortho_scale, 'width': s.render.resolution_x, 'height': s.render.resolution_y}
        s.render.filepath = str(out / (name + '.png'))
        bpy.ops.render.render(write_still=True)
    (out / 'cameras.json').write_text(json.dumps(cameras, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--case', required=True)
    parser.add_argument('--render-only', action='store_true')
    parser.add_argument('--high', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    manifest_path = Path(args.manifest).resolve()
    manifest = json.loads(manifest_path.read_text())
    case = next(c for c in manifest['cases'] if c['id'] == args.case)
    out = Path(manifest['outputRoot']) / case['id']
    out.mkdir(parents=True, exist_ok=True)
    if args.render_only:
        render_case(out, args.high)
        return
    started = time.monotonic()
    input_path = Path(bpy.data.filepath).resolve()
    input_hash = hashlib.sha256(input_path.read_bytes()).hexdigest()
    if input_hash != manifest['baselineSHA256']:
        raise RuntimeError('Worker input differs from the immutable baseline')
    s = bpy.context.scene
    rig = bpy.data.objects['L_Armature']
    if s.frame_current != 33 or rig.animation_data.action is not None or any(not t.mute for t in rig.animation_data.nla_tracks):
        raise RuntimeError('Baseline frame/left animation state differs from the reviewed static fixture')
    before = protected_state()
    original_poses = {b.name: {'location': list(b.location), 'rotation': list(b.rotation_quaternion), 'scale': list(b.scale)} for b in rig.pose.bones}
    measurement = module('measure')
    if case.get('control', False):
        fit = None
        before_fit = None
    else:
        # Translate the complete left-arm pose, preserving wrist and cuff shape.
        root = rig.pose.bones['L_upper_arm']
        world_delta = Vector((case['handRearShiftM'], 0, 0))
        root.location += root.bone.matrix_local.to_3x3().inverted() @ (rig.matrix_world.to_3x3().inverted() @ world_delta)
        base = rig.pose.bones['L_thumb.01']
        base.rotation_quaternion = Quaternion(case['cmcQuaternion'])
        for name, angle in zip(['L_thumb.02', 'L_thumb.03'], case['flexDegrees']):
            rig.pose.bones[name].rotation_quaternion = Quaternion(manifest['flexAxesLocal'][name], math.radians(angle))
        bpy.context.view_layer.update()
        before_fit = measurement.measure_scene(out / 'before-finger-fit')
        fit = module('fit_fingers').fit_fingers(max_iterations=manifest['fingerFitIterations'], reference=manifest['fingerReference'])
    bpy.context.view_layer.update()
    after = protected_state()
    if digest(before) != digest(after):
        (out / 'protection-before.json').write_text(json.dumps(before, indent=2))
        (out / 'protection-after.json').write_text(json.dumps(after, indent=2))
        raise RuntimeError('Protected source semantics changed')
    allowed = {b.name for b in rig.pose.bones if b.name.startswith(('L_thumb.', 'L_f_'))}
    for bone in rig.pose.bones:
        old = original_poses[bone.name]
        if max(abs(a-b) for a,b in zip(bone.scale, old['scale'])) > 1e-7:
            raise RuntimeError('Unexpected bone scale change: ' + bone.name)
        if bone.name != 'L_upper_arm' and max(abs(a-b) for a,b in zip(bone.location, old['location'])) > 1e-7:
            raise RuntimeError('Unexpected joint translation: ' + bone.name)
        if bone.name not in allowed and max(abs(a-b) for a,b in zip(bone.rotation_quaternion, old['rotation'])) > 1e-7:
            raise RuntimeError('Unexpected bone rotation: ' + bone.name)
    result = measurement.measure_scene(out)
    result['experiment'] = {'case': case, 'baselineSHA256': input_hash, 'manifestSHA256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(), 'scriptsSHA256': {n: hashlib.sha256((HERE / (n + '.py')).read_bytes()).hexdigest() for n in ['worker', 'fit_fingers', 'measure']}, 'blender': bpy.app.version_string, 'protectedSemanticsHash': digest(after), 'protectedSemanticsUnchanged': True, 'evaluatedGeometryHashes': evaluated_hashes(), 'elapsedSeconds': time.monotonic() - started}
    result['fingerFit'] = fit
    result['leftPose'] = {b.name: {'matrixBasis': [list(row) for row in b.matrix_basis], 'head': list(b.head), 'tail': list(b.tail)} for b in rig.pose.bones}
    (out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    working = Path(manifest['workingRoot']) / case['id']
    working.mkdir(parents=True, exist_ok=True)
    s['grip_experiment_case'] = case['id']
    s['grip_experiment_status'] = 'Unapproved static experiment; not integrated into reload'
    bpy.ops.wm.save_as_mainfile(filepath=str(working / 'candidate.blend'))
    print(json.dumps({'case': case['id'], 'elapsedSeconds': time.monotonic()-started, 'protected': True, 'fingerFit': {k: {'status':v['status'],'gapMM':v['final']['contactGapMM']} for k,v in fit['fingers'].items()} if fit else None}), flush=True)


if __name__ == '__main__':
    main()
