"""Bounded thumb movement diagnostics. Writes only the supplied output directory.

Run with Blender -b <checkpoint copy> --python diagnostics.py -- --output <dir>.
No production save, weight edits, pose search, or anatomical angle-limit claims.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree


# Historical candidate A, 2026-09-09: unapproved rear-edge CMC experiment.
# Preserve its exact matrix for the initial diagnostic comparison, independently
# of temporary files. This is not the later reviewed derived control frame.
HISTORICAL_CANDIDATE_A_CMC_BASIS = [
    [-0.046539824455976486, -0.39255401492118835, 0.9185501933097839, 0.0005731359124183655],
    [0.518486738204956, 0.776483416557312, 0.3581104278564453, 0.0028352737426757812],
    [-0.8538175225257874, 0.4929223954677582, 0.16739684343338013, -0.0007955413311719894],
    [0.0, 0.0, 0.0, 1.0],
]


def array(vertices):
    values = np.empty(len(vertices) * 3, dtype=np.float64)
    vertices.foreach_get('co', values)
    return values.reshape((-1, 3))


def normal_array(vertices):
    values = np.empty(len(vertices) * 3, dtype=np.float64)
    vertices.foreach_get('normal', values)
    return values.reshape((-1, 3))


def normalized(value):
    return value / max(np.linalg.norm(value), 1e-12)


def surface_area(points, triangles):
    p = points[triangles]
    return float(np.linalg.norm(np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0]), axis=1).sum() / 2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--renders', action='store_true')
    parser.add_argument('--axis-comparison', action='store_true')
    parser.add_argument('--high-flexion', action='store_true')
    parser.add_argument('--mirror-control', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    rig = bpy.data.objects['L_Armature']
    body = bpy.data.objects['L_GloveAndForearm']
    overlay = bpy.data.objects['Palm heel suede overlay']
    names = ['L_thumb.01', 'L_thumb.02', 'L_thumb.03']
    saved = {b.name: b.matrix_basis.copy() for b in rig.pose.bones}
    source = Path(bpy.data.filepath)
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    rest = array(body.data.vertices)
    normals = normal_array(body.data.vertices)
    body.data.calc_loop_triangles()
    triangles = np.array([t.vertices[:] for t in body.data.loop_triangles], dtype=int)
    centers = rest[triangles].mean(axis=1)
    distal = rig.data.bones[names[2]]
    start = np.array(distal.head_local)
    longitudinal = normalized(np.array(distal.tail_local) - start)
    along = (rest - start) @ longitudinal
    # An existing localized pad point seeds a broader body patch. Its surface
    # normal is independent of rig axes; never average the wrapped reinforcement.
    seed = overlay.data.vertices[9356]
    pad_seed = np.array(seed.co)
    palmar = normalized(np.array(seed.normal))
    longitudinal = normalized(longitudinal - palmar * longitudinal.dot(palmar))
    radial = normalized(np.cross(longitudinal, palmar))
    length = distal.length
    lateral = (rest - start) @ radial
    pad_mask = (np.linalg.norm(rest - pad_seed, axis=1) < .008) & (normals @ palmar > .55)
    pad_ids = np.where(pad_mask)[0]
    if len(pad_ids) < 15:
        raise RuntimeError('Insufficient independently selected palmar body vertices')
    pad_center = pad_seed
    landmark_ids = {'pad_center': int(pad_ids[np.argmin(np.linalg.norm(rest[pad_ids] - pad_center, axis=1))])}
    # Distributed anatomical boundary samples; identity remains fixed in all poses.
    for key, direction in [('pad_distal', longitudinal), ('pad_proximal', -longitudinal),
                           ('pad_radial', radial), ('pad_ulnar', -radial)]:
        target = pad_center + .0045 * direction
        landmark_ids[key] = int(pad_ids[np.argmin(np.linalg.norm(rest[pad_ids] - target, axis=1))])
    for key, target in {
        'dorsal_tip': start + longitudinal * length * .70 - palmar * .007,
        'mcp_crease': np.array(rig.data.bones[names[1]].head_local) + palmar * .007,
        'ip_crease': start + palmar * .007,
        'thenar_apex': np.array([-.032, .038, .015]),
        'web_saddle': np.array([-.040, .073, .006]),
        'web_thumb_attachment': np.array([-.050, .063, .010]),
        'web_index_attachment': np.array([-.030, .090, .006]),
    }.items():
        landmark_ids[key] = int(np.argmin(np.linalg.norm(rest - target, axis=1)))
    region_masks = {
        'distal_pad': pad_mask,
        'thenar': (rest[:, 0] > -.052) & (rest[:, 0] < -.012) & (rest[:, 1] > .020) & (rest[:, 1] < .060),
        'web': (rest[:, 0] > -.057) & (rest[:, 0] < -.023) & (rest[:, 1] > .057) & (rest[:, 1] < .095),
    }
    region_ids = {k: np.where(v)[0] for k, v in region_masks.items()}
    region_tris = {k: triangles[np.all(mask[triangles], axis=1)] for k, mask in region_masks.items()}
    sections = {}
    for label, bone_name, fraction in [('metacarpal', names[0], .6), ('proximal', names[1], .5), ('distal', names[2], .5)]:
        bone = rig.data.bones[bone_name]
        matrix = np.array(bone.matrix_local)
        local = (rest - matrix[:3, 3]) @ matrix[:3, :3]
        mask = (np.abs(local[:, 1] - bone.length * fraction) < .0015) & (np.linalg.norm(local[:, [0, 2]], axis=1) < .020)
        sections[label] = {'ids': np.where(mask)[0], 'bone': bone_name}
    over_rest = array(overlay.data.vertices)
    # Independent competing surface reference: center of the local distal suede
    # band. This is a design proxy, not an anatomical verdict. Keep both references.
    overlay.data.calc_loop_triangles()
    ot = np.array([t.vertices[:] for t in overlay.data.loop_triangles], dtype=int)
    oc = over_rest[ot].mean(axis=1)
    original_y = normalized(np.array(distal.tail_local) - start)
    projection = (oc - start) @ original_y
    distance = np.linalg.norm((oc - start) - projection[:, None] * original_y, axis=1)
    band = ot[(projection > .30 * length) & (projection < .75 * length) & (distance < .020)]
    bp = over_rest[band]
    area_vectors = np.cross(bp[:, 1] - bp[:, 0], bp[:, 2] - bp[:, 0])
    # The suede has thickness, so summing its inner/outer winding cancels.
    # Use the nearest underlying body normal for both shell layers instead.
    rest_surface = BVHTree.FromPolygons([Vector(p) for p in rest], triangles.tolist(), all_triangles=True)
    band_normals = np.array([rest_surface.find_nearest(Vector(p))[1] for p in bp.mean(axis=1)])
    band_normal = normalized(np.average(band_normals, axis=0, weights=np.linalg.norm(area_vectors, axis=1)))
    band_transverse = normalized(band_normal - original_y * band_normal.dot(original_y))
    band_center = np.average(bp.mean(axis=1), axis=0, weights=np.linalg.norm(area_vectors, axis=1))
    derived_axes = {}
    for bone_name in names[1:]:
        bone = rig.data.bones[bone_name]
        origin = np.array(bone.head_local)
        y_axis = normalized(np.array(bone.tail_local) - origin)
        t = (oc - origin) @ y_axis
        d = np.linalg.norm((oc - origin) - t[:, None] * y_axis, axis=1)
        local_band = ot[(t > .30 * bone.length) & (t < .75 * bone.length) & (d < .020)]
        local_points = over_rest[local_band]
        local_area = np.linalg.norm(np.cross(local_points[:, 1] - local_points[:, 0], local_points[:, 2] - local_points[:, 0]), axis=1)
        body_normals = np.array([rest_surface.find_nearest(Vector(p))[1] for p in local_points.mean(axis=1)])
        n = normalized(np.average(body_normals, axis=0, weights=local_area))
        transverse = normalized(n - y_axis * n.dot(y_axis))
        axis = normalized(np.cross(y_axis, transverse))
        local_axis = normalized(np.array(bone.matrix_local.to_3x3().inverted()) @ axis)
        derived_axes[bone_name] = {'pad_transverse_rest': transverse.tolist(), 'axis_rest': axis.tolist(),
            'axis_local': local_axis.tolist(), 'quaternion_35_wxyz': list(Quaternion(Vector(local_axis), math.radians(35))),
            'quaternion_65_wxyz': list(Quaternion(Vector(local_axis), math.radians(65))),
            'derivation': 'boneY cross local-distal-suede-band underlying-body transverse normal; intended pulp is explicit design inference'}
    (out / 'derived-axes.json').write_text(json.dumps(derived_axes, indent=2))
    if args.mirror_control:
        right_rig = bpy.data.objects['R_Armature']
        right_body = bpy.data.objects['R_GloveAndForearm']
        right_rest = array(right_body.data.vertices)
        reflection = np.array([-1., 1., 1.])
        if len(right_rest) != len(rest):
            raise RuntimeError('Mirrored body topology differs')
        rest_error = np.linalg.norm(right_rest - rest * reflection, axis=1)
        if rest_error.max() > 1e-6:
            raise RuntimeError('Mirrored body index correspondence is not established')
        right_body.data.calc_loop_triangles()
        right_triangles = [list(t.vertices) for t in right_body.data.loop_triangles]
        right_surface = BVHTree.FromPolygons([Vector(p) for p in right_rest], right_triangles, all_triangles=True)
        right_axes = {}
        for left_name in names[1:]:
            left_bone = rig.data.bones[left_name]
            right_name = left_name.replace('L_', 'R_')
            right_bone = right_rig.data.bones[right_name]
            ly = normalized(np.array(left_bone.tail_local) - np.array(left_bone.head_local))
            t = (oc - np.array(left_bone.head_local)) @ ly
            d = np.linalg.norm((oc - np.array(left_bone.head_local)) - t[:, None] * ly, axis=1)
            local_band = ot[(t > .30 * left_bone.length) & (t < .75 * left_bone.length) & (d < .020)]
            local_points = over_rest[local_band]
            local_area = np.linalg.norm(np.cross(local_points[:, 1] - local_points[:, 0], local_points[:, 2] - local_points[:, 0]), axis=1)
            # Use actual R geometry with corresponding triangulation. Independent
            # nearest queries can select opposite quad diagonals and perturb the
            # measured axis despite exactly mirrored surfaces.
            corresponding = np.array([triangles[rest_surface.find_nearest(Vector(p))[2]] for p in local_points.mean(axis=1)])
            rtri = right_rest[corresponding]
            rn = np.cross(rtri[:, 2] - rtri[:, 0], rtri[:, 1] - rtri[:, 0])
            rn /= np.maximum(np.linalg.norm(rn, axis=1)[:, None], 1e-12)
            n = normalized(np.average(rn, axis=0, weights=local_area))
            ry = normalized(np.array(right_bone.tail_local) - np.array(right_bone.head_local))
            transverse = normalized(n - ry * n.dot(ry))
            axis = normalized(np.cross(ry, transverse))
            local = normalized(np.array(right_bone.matrix_local.to_3x3().inverted()) @ axis)
            right_axes[right_name] = {'axis_local': local.tolist(), 'pad_transverse_rest': transverse.tolist(),
                'length_mm': right_bone.length * 1000, 'left_length_mm': left_bone.length * 1000}
        right_saved = {b.name: b.matrix_basis.copy() for b in right_rig.pose.bones}
        mirror_report = {'rest_index_mirror_max_mm': float(rest_error.max() * 1000),
            'right_axes': right_axes, 'poses': {}, 'scope': 'Entire body meshes, fully neutral arm/palm controls; finish excluded; actual right body geometry normals with corresponding triangles to avoid opposite-diagonal nearest-face ambiguity.'}
        for degrees in [0, 35, 65]:
            for armature in [rig, right_rig]:
                for bone in armature.pose.bones:
                    bone.matrix_basis = Matrix.Identity(4)
            for left_name in names[1:]:
                right_name = left_name.replace('L_', 'R_')
                rig.pose.bones[left_name].rotation_quaternion = Quaternion(Vector(derived_axes[left_name]['axis_local']), math.radians(degrees))
                right_rig.pose.bones[right_name].rotation_quaternion = Quaternion(Vector(right_axes[right_name]['axis_local']), math.radians(degrees))
            bpy.context.view_layer.update()
            lp = array(body.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices)
            rp = array(right_body.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices)
            error = np.linalg.norm(rp - lp * reflection, axis=1) * 1000
            mirror_report['poses'][str(degrees)] = {'max_mm': float(error.max()), 'mean_mm': float(error.mean()),
                'p99_mm': float(np.percentile(error, 99)), 'worst_vertex': int(error.argmax())}
        for bone in rig.pose.bones:
            bone.matrix_basis = saved[bone.name]
        for bone in right_rig.pose.bones:
            bone.matrix_basis = right_saved[bone.name]
        bpy.context.view_layer.update()
        mirror_report['source_hash_unchanged'] = hashlib.sha256(source.read_bytes()).hexdigest() == source_hash
        mirror_report['engineering_mirror_tolerance_mm'] = .01
        mirror_report['pass'] = all(p['max_mm'] < .01 for p in mirror_report['poses'].values()) and mirror_report['source_hash_unchanged']
        (out / 'mirrored-body-control.json').write_text(json.dumps(mirror_report, indent=2))
        print(json.dumps(mirror_report))
        return
    landmark_ids['suede_band_center_proxy'] = int(np.argmin(np.linalg.norm(rest - band_center, axis=1)))
    landmark_ids['opposite_band_surface_proxy'] = int(np.argmin(np.linalg.norm(rest - (start + original_y * length * .55 - band_normal * .010), axis=1)))
    index_bone = rig.data.bones['L_f_index.03']
    index_target = (np.array(index_bone.head_local) + np.array(index_bone.tail_local)) / 2 + np.array([0, 0, .008])
    landmark_ids['index_pad_proxy'] = int(np.argmin(np.linalg.norm(rest - index_target, axis=1)))
    overlay_ids = {key: int(np.argmin(np.linalg.norm(over_rest - rest[index], axis=1))) for key, index in landmark_ids.items() if key.startswith('pad_')}
    landmarks = {'body_object': body.name, 'overlay_object': overlay.name,
                 'body_landmarks': landmark_ids, 'overlay_landmarks': overlay_ids,
                 'body_pad_region': pad_ids.tolist(), 'body_regions': {k: v.tolist() for k, v in region_ids.items()},
                 'competing_surface_reference': {'distal_suede_band_area_normal': band_normal.tolist(), 'distal_suede_band_transverse_normal': band_transverse.tolist(), 'distal_suede_band_center': band_center.tolist(), 'contact_seed_normal': palmar.tolist(), 'angle_degrees': math.degrees(math.acos(float(np.clip(palmar.dot(band_normal), -1, 1)))), 'band_transverse_dot_rest_hinge_x': float(band_transverse.dot(np.array(distal.matrix_local.col[0][:3]))), 'interpretation': 'Compare local contact patch vs distal suede band; neither automatically anatomical volar.'},
                 'selection': 'Localized existing suede point 9356 seeds an 8mm body surface neighborhood; independent surface normal; four distributed 4.5mm targets; no weight thresholds or wrapped-suede centroid.',
                 'status': 'Axis comparison treats broad suede face as intended pulp by explicit design inference; old contact patch retained as separate reference. Web/crease seeds are geometric proxies.' if args.axis_comparison else 'Contact patch markers lie on suede; anatomical volar center remains unresolved versus independent distal suede-band reference. Web/crease seeds are geometric proxies.'}
    (out / 'landmarks.json').write_text(json.dumps(landmarks, indent=2))
    c0 = Matrix(HISTORICAL_CANDIDATE_A_CMC_BASIS)

    def reset(neutral=False):
        for b in rig.pose.bones:
            b.matrix_basis = saved[b.name]
        if neutral:
            for b in rig.pose.bones:
                if b.name.startswith('L_f_') or b.name.startswith('L_thumb.'):
                    b.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()

    def set_case(case):
        reset(case.get('neutral', False))
        if case.get('cmc') == 'proposed':
            rig.pose.bones[names[0]].matrix_basis = c0
        elif case.get('cmc') == 'partial':
            bone = rig.pose.bones[names[0]]
            bone.rotation_quaternion = Quaternion().slerp(c0.to_quaternion(), .5)
        if 'twist' in case:
            bone = rig.pose.bones[names[0]]
            bone.rotation_quaternion = bone.rotation_quaternion @ Quaternion((0, 1, 0), math.radians(case['twist']))
        for name, key in zip(names[1:], ['mcp', 'ip']):
            if key in case:
                axis = derived_axes[name]['axis_local'] if case.get('axis_mode') == 'derived' else (1, 0, 0)
                rig.pose.bones[name].rotation_quaternion = Quaternion(Vector(axis), math.radians(case[key]))
        bpy.context.view_layer.update()
        if case.get('pinch'):
            for i, degrees in enumerate([60, 55, 25], 1):
                rig.pose.bones[f'L_f_index.{i:02d}'].rotation_quaternion = Quaternion((1, 0, 0), math.radians(degrees))
            bpy.context.view_layer.update()
            p = array(body.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices)
            cmc = rig.pose.bones[names[0]]
            pivot = cmc.head.copy()
            a = Vector(p[landmark_ids['suede_band_center_proxy']]) - pivot
            b = Vector(p[landmark_ids['index_pad_proxy']]) - pivot
            swing = a.rotation_difference(b)
            frame = (swing.to_matrix() @ cmc.matrix.to_3x3()).to_4x4()
            frame.translation = pivot
            cmc.matrix = frame
            bpy.context.view_layer.update()

    def sample():
        evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        points = array(evaluated.data.vertices)
        if len(points) != len(rest):
            raise RuntimeError('Evaluated body topology changed')
        marks = {k: points[i] for k, i in landmark_ids.items()}
        pad_y = normalized(marks['pad_distal'] - marks['pad_proximal'])
        pad_x = normalized(marks['pad_radial'] - marks['pad_ulnar'])
        pad_normal = normalized(np.cross(pad_x, pad_y))
        eval_normals = normal_array(evaluated.data.vertices)
        result = {'landmarks': {k: v.tolist() for k, v in marks.items()},
                  'thumb_index_proxy_gap_mm': float(np.linalg.norm(marks['suede_band_center_proxy'] - marks['index_pad_proxy']) * 1000),
                  'landmark_normals': {k: eval_normals[i].tolist() for k, i in landmark_ids.items()},
                  'pad': {'center': marks['pad_center'].tolist(), 'longitudinal': pad_y.tolist(),
                          'radial': pad_x.tolist(), 'normal': pad_normal.tolist(),
                          'width_mm': float(np.linalg.norm(marks['pad_radial'] - marks['pad_ulnar']) * 1000),
                          'length_mm': float(np.linalg.norm(marks['pad_distal'] - marks['pad_proximal']) * 1000)},
                  'regions': {}, 'sections': {}, 'bones': {}}
        for name in names:
            b = rig.pose.bones[name]
            result['bones'][name] = {'head': list(b.head), 'tail': list(b.tail), 'x': list(b.x_axis), 'y': list(b.y_axis), 'z': list(b.z_axis), 'basis': [list(row) for row in b.matrix_basis]}
        for name, ids in region_ids.items():
            tri = region_tris[name]
            p = points[ids]
            covariance = np.linalg.svd(p - p.mean(axis=0), full_matrices=False)[1] / math.sqrt(max(1, len(ids)))
            result['regions'][name] = {'vertex_count': len(ids), 'area_mm2': surface_area(points, tri) * 1e6,
                'principal_spread_mm': (covariance * 1000).tolist(),
                'area_ratio_to_rest': surface_area(points, tri) / max(surface_area(rest, tri), 1e-12)}
        for name, data in sections.items():
            b = rig.pose.bones[data['bone']]
            matrix = np.array(b.matrix)
            p = (points[data['ids']] - matrix[:3, 3]) @ matrix[:3, :3]
            result['sections'][name] = {'vertex_count': len(p), 'width_mm': float(np.ptp(p[:, 0]) * 1000), 'depth_mm': float(np.ptp(p[:, 2]) * 1000)}
        over = array(overlay.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices)
        result['overlay_body_landmark_distance_mm'] = {key: float(np.linalg.norm(over[index] - marks[key]) * 1000) for key, index in overlay_ids.items()}
        return result, points

    cases = {'checkpoint': {}, 'neutral': {'neutral': True},
             'cmc_partial': {'neutral': True, 'cmc': 'partial', 'mcp': 25, 'ip': 20},
             'proposed_55_45': {'cmc': 'proposed', 'mcp': 55, 'ip': 45},
             'proposed_45_55': {'cmc': 'proposed', 'mcp': 45, 'ip': 55}}
    for context in ['neutral', 'posed']:
        for joint in ['mcp', 'ip']:
            for angle in [0, 10, 30, 45, 55]:
                cases[f'{context}_{joint}_{angle}'] = {'neutral': context == 'neutral', joint: angle}
    for context in ['neutral', 'checkpoint', 'proposed']:
        for angle in [-15, 15]:
            cases[f'{context}_twist_{angle:+d}'] = {'neutral': context == 'neutral', 'twist': angle}
            if context == 'proposed':
                cases[f'{context}_twist_{angle:+d}'].update(cmc='proposed', mcp=55, ip=45)
    if args.axis_comparison:
        cases = {'neutral': {'neutral': True}}
        for mode in ['existing', 'derived']:
            for joint in ['mcp', 'ip', 'both']:
                cases[f'{mode}_{joint}_35'] = {'neutral': True, 'axis_mode': mode,
                    'mcp': 35 if joint in ['mcp', 'both'] else 0, 'ip': 35 if joint in ['ip', 'both'] else 0}
            if args.high_flexion:
                cases[f'{mode}_both_65'] = {'neutral': True, 'axis_mode': mode, 'mcp': 65, 'ip': 65}
        if args.high_flexion:
            cases['derived_direct_pinch'] = {'neutral': True, 'axis_mode': 'derived', 'mcp': 35, 'ip': 35, 'pinch': True}
    report = {'input_sha256': source_hash, 'frame': scene.frame_current,
        'preflight_status': 'Usable controls for bounded grip experiments; finish needs review. Initial contact-frame hold resolved by reviewed derived-axis comparison; no rest-axis changes.' if args.axis_comparison else 'HOLD: independent distal suede-band and existing contact-patch frame disagree; no anatomical range or CMC factor approved.',
        'deferred': ['Matched mirrored movement control', 'Full surface-intersection certification'] if args.axis_comparison else ['Matched mirrored movement control', 'Thumb-index pinch: do not fit before resolving anatomical pad frame'],
        'limitations': ['No medical range certification', 'Fixed geometric region bounds are proxies, not segmented muscles',
                        'Cross-sections track rest-selected tissue bands, not fresh plane intersections',
                        'No solid-containment claim or contact acceptance in this diagnostic'],
        'rotation_modes': {b.name: b.rotation_mode for b in rig.pose.bones if b.name in names},
        'poses': {}}
    baseline = None
    for label, case in cases.items():
        set_case(case)
        report['poses'][label], points = sample()
        report['poses'][label]['parameters'] = case
        if label == ('neutral' if args.axis_comparison else 'checkpoint'):
            baseline = points.copy()
    reset(args.axis_comparison)
    _, repeat = sample()
    report['same_process_restore_max_mm'] = float(np.linalg.norm(repeat - baseline, axis=1).max() * 1000)
    report['source_hash_unchanged'] = hashlib.sha256(source.read_bytes()).hexdigest() == source_hash
    mirrored_report_path = out / 'mirrored-body-control.json'
    if args.axis_comparison and mirrored_report_path.exists():
        mirrored = json.loads(mirrored_report_path.read_text())
        report['mirrored_body_control_pass'] = mirrored['pass']
        if mirrored['pass']:
            report['deferred'].remove('Matched mirrored movement control')
    if report['same_process_restore_max_mm'] > .001 or not report['source_hash_unchanged']:
        raise RuntimeError('Diagnostic restore/source integrity check failed')
    (out / 'diagnostics.json').write_text(json.dumps(report, indent=2))
    if args.renders:
        # Markers are review-only objects in memory; never saved into the fixture.
        markers = []
        for key in landmark_ids:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=4, radius=.001)
            marker = bpy.context.object
            marker.name = 'Diagnostic ' + key
            marker.color = (1., .08, .04, 1.) if key.startswith('pad') else ((0., .9, 1., 1.) if 'proxy' in key else (.1, 1., .15, 1.))
            markers.append((key, marker))
        for obj in scene.objects:
            if obj.type == 'MESH' and not (obj == body or obj == overlay or obj.name.startswith('Diagnostic ')):
                obj.hide_render = True
        scene.render.engine = 'BLENDER_WORKBENCH'
        scene.display.shading.light = 'STUDIO'
        scene.display.shading.color_type = 'OBJECT'
        scene.display.shading.show_shadows = True
        scene.display.shading.show_cavity = True
        body.color = (.32, .50, .67, 1.)
        overlay.color = (.42, .43, .43, 1.)
        scene.render.resolution_x = 800
        scene.render.resolution_y = 700
        scene.render.resolution_percentage = 100
        camera = bpy.data.objects.new('Diagnostic camera', bpy.data.cameras.new('Diagnostic camera'))
        scene.collection.objects.link(camera)
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = .19
        scene.camera = camera
        for label in list(cases) if args.axis_comparison else ['neutral', 'checkpoint', 'neutral_mcp_55', 'neutral_ip_55', 'posed_mcp_55', 'posed_ip_55', 'proposed_55_45', 'proposed_45_55', 'proposed_twist_-15', 'proposed_twist_+15']:
            set_case(cases[label])
            for key, marker in markers:
                marker.location = Vector(report['poses'][label]['landmarks'][key]) + .002 * Vector(report['poses'][label]['landmark_normals'][key])
            # Camera follows the palm rigid frame, so local views match across poses.
            hand = rig.pose.bones['SupportHand'].matrix @ rig.data.bones['SupportHand'].matrix_local.inverted()
            target = hand @ Vector((-.030, .075, .010))
            for view, offset in [('palm', (0, 0, .4)), ('side', (-.4, 0, .03)), ('thumb_pulp', (.4, .1, .02))] if label == 'neutral' or args.axis_comparison else [('palm', (0, 0, .4)), ('side', (-.4, 0, .03))]:
                camera.location = target + hand.to_3x3() @ Vector(offset)
                camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
                scene.render.filepath = str(out / f'{label}-{view}.png')
                bpy.ops.render.render(write_still=True)
    reset()
    print(json.dumps({'poses': len(cases), 'output': str(out), 'restore_max_mm': report['same_process_restore_max_mm'], 'source_unchanged': report['source_hash_unchanged']}))


if __name__ == '__main__':
    main()
