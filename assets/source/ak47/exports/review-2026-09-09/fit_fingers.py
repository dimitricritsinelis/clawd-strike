"""Bounded, identical finger refit for the static hand experiment.

Call fit_fingers() after placing the hand and thumb in a disposable Blender
scene. This module does not load, save, export, or change animation tracks.
Nearest-normal offsets guide optimization; they do not certify collision.
"""
import math
import time

import bpy
import numpy as np
from mathutils import Euler, Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree


FINGERS = ('f_index', 'f_middle', 'f_ring', 'f_pinky')
LOWER_DEG = (5, -20, -30, 5, 0)
UPPER_DEG = (100, 20, 30, 105, 65)


def capture_reference():
    """Capture once on the approved baseline and reuse for every experiment."""
    rig = bpy.data.objects['L_Armature']
    body = bpy.data.objects['L_GloveAndForearm']
    magazine = bpy.data.objects['Magazine_Surfaces']
    bpy.context.view_layer.update()
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    surface = BVHTree.FromPolygons(
        [magazine.matrix_world @ v.co for v in magazine.data.vertices],
        [tuple(p.vertices) for p in magazine.data.polygons],
    )
    result = {'fingers': {}}
    baseline_surfaces = {}
    for finger in FINGERS:
        bones = [rig.pose.bones['L_' + finger + '.%02d' % i] for i in (1, 2, 3)]
        angles = [*bones[0].rotation_quaternion.to_euler('XYZ'),
                  bones[1].rotation_quaternion.to_euler('XYZ').x,
                  bones[2].rotation_quaternion.to_euler('XYZ').x]
        indices = [v.index for v in body.data.vertices if sum(
            g.weight for g in v.groups if body.vertex_groups[g.group].name.startswith('L_' + finger + '.')
        ) >= (.2 if finger == 'f_index' else .8)][::24]
        offsets = []
        for index in indices:
            point = body.matrix_world @ evaluated.data.vertices[index].co
            nearest, normal, _, _ = surface.find_nearest(point)
            offsets.append((point - nearest).dot(normal))
        neighbor_offsets = {}
        for name, other in baseline_surfaces.items():
            signed = []
            for index in indices:
                point = body.matrix_world @ evaluated.data.vertices[index].co
                nearest, normal, _, _ = other.find_nearest(point)
                signed.append((point - nearest).dot(normal))
            neighbor_offsets[name] = signed
        floor = .0039 if finger == 'f_index' else .0035
        result['fingers'][finger] = {
            'priorDegrees': [math.degrees(value) for value in angles],
            'markerWorld': list(bpy.data.objects['GripContact_' + finger].matrix_world.translation),
            'sampleIndices': indices,
            'baselineSignedOffsetsM': offsets,
            'guideFloorsM': [max(0.0, min(floor, offset)) for offset in offsets],
            'neighborSignedOffsetsM': neighbor_offsets,
        }
        selected = {v.index for v in body.data.vertices if sum(
            g.weight for g in v.groups if body.vertex_groups[g.group].name.startswith('L_' + finger + '.')
        ) > .8}
        faces = [tuple(p.vertices) for p in body.data.polygons if all(i in selected for i in p.vertices)]
        if faces:
            baseline_surfaces[finger] = BVHTree.FromPolygons(
                [body.matrix_world @ v.co for v in evaluated.data.vertices], faces)
    return result


def fit_fingers(max_iterations=60, reference=None):
    """Refit only the four left finger rotations, returning measured diagnostics.

    The cap applies to each finger. Every case starts from the same frozen
    approved-reference priors, not an earlier experiment output. Existing local locations,
    scales, hand placement, and thumb pose remain unchanged.
    """
    if isinstance(max_iterations, bool) or not isinstance(max_iterations, int) or not 1 <= max_iterations <= 60:
        raise ValueError('max_iterations must be an integer from 1 to 60')
    if reference is None or any(finger not in reference.get('fingers', {}) for finger in FINGERS):
        raise ValueError('Pass capture_reference() from the common approved baseline')
    started = time.monotonic()
    rig = bpy.data.objects['L_Armature']
    body = bpy.data.objects['L_GloveAndForearm']
    magazine = bpy.data.objects['Magazine_Surfaces']
    if rig.animation_data and (rig.animation_data.action or any(not t.mute for t in rig.animation_data.nla_tracks)):
        raise RuntimeError('Mute left-hand NLA tracks and clear its active action before fitting')
    if body.data.shape_keys and any(abs(k.value) > 1e-8 for k in body.data.shape_keys.key_blocks[1:]):
        raise RuntimeError('Finger fitting requires the unchanged, unmorphed body')
    for modifier in body.modifiers:
        if modifier.show_viewport and (modifier.type != 'ARMATURE' or modifier.object != rig or modifier.use_deform_preserve_volume):
            raise RuntimeError('Analytic LBS requires only the existing linear armature modifier')
    bpy.context.view_layer.update()
    world = rig.matrix_world.copy()
    world_inverse = world.inverted()
    mesh_to_rig = world_inverse @ body.matrix_world
    rest_inverse = {b.name: b.matrix_local.inverted() for b in rig.data.bones}
    group_names = [g.name for g in body.vertex_groups]
    surface = BVHTree.FromPolygons(
        [magazine.matrix_world @ v.co for v in magazine.data.vertices],
        [tuple(p.vertices) for p in magazine.data.polygons],
    )
    memberships = {
        finger: [v.index for v in body.data.vertices if sum(
            g.weight for g in v.groups if group_names[g.group].startswith('L_' + finger + '.')
        ) >= (.2 if finger == 'f_index' else .8)]
        for finger in (*FINGERS, 'thumb')
    }

    def evaluated_surface(indices):
        selected = set(indices)
        evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        faces = [tuple(p.vertices) for p in body.data.polygons if all(i in selected for i in p.vertices)]
        if not faces:
            return None
        return BVHTree.FromPolygons([body.matrix_world @ v.co for v in evaluated.data.vertices], faces)

    thumb_surface = evaluated_surface(memberships['thumb'])
    solved_surfaces = {}
    report = {
        'guideOnly': True,
        'collisionClaim': 'Nearest-normal offsets and proximity are optimization guides, not certified intersections.',
        'maxIterationsPerFinger': max_iterations,
        'fixedPriorsDegrees': {finger: reference['fingers'][finger]['priorDegrees'] for finger in FINGERS},
        'lowerDegrees': LOWER_DEG,
        'upperDegrees': UPPER_DEG,
        'fingers': {},
    }
    lower, upper = np.radians(LOWER_DEG), np.radians(UPPER_DEG)
    contact_weights = np.array((3.0, 8.0, 3.0))
    for finger in FINGERS:
        bones = [rig.pose.bones['L_' + finger + '.%02d' % i] for i in (1, 2, 3)]
        for bone in bones:
            if bone.rotation_mode != 'QUATERNION' or bone.constraints or bone.bone.inherit_scale != 'FULL' or not bone.bone.use_inherit_rotation:
                raise RuntimeError('Unexpected rotation/constraint/inheritance state: ' + bone.name)
        names = [b.name for b in bones]
        locations = [b.location.copy() for b in bones]
        scales = [b.scale.copy() for b in bones]
        old_basis = [b.matrix_basis.copy() for b in bones]
        old_quaternions = [list(b.rotation_quaternion) for b in bones]
        parent_matrix = bones[0].parent.matrix.copy()
        relatives = [rest_inverse[b.parent.name] @ b.bone.matrix_local for b in bones]
        marker = bpy.data.objects['GripContact_' + finger]
        marker_local = bones[2].matrix.inverted() @ world_inverse @ marker.matrix_world.translation
        frozen = reference['fingers'][finger]
        target = np.array(frozen['markerWorld'], dtype=float)
        indices = memberships[finger][::24]
        if indices != frozen['sampleIndices']:
            raise RuntimeError('Finger sample population differs from frozen reference: ' + finger)
        guide_floors = np.array(frozen['guideFloorsM'], dtype=float)
        if len(guide_floors) != len(indices) or not np.all(np.isfinite(guide_floors)):
            raise ValueError('Invalid frozen guide floors: ' + finger)
        if not indices:
            raise RuntimeError('No finger skin samples: ' + finger)
        neighbor_floors = {}
        for name in solved_surfaces:
            offsets = frozen.get('neighborSignedOffsetsM', {}).get(name)
            if offsets is None or len(offsets) != len(indices) or not np.all(np.isfinite(offsets)):
                raise ValueError('Missing or invalid frozen neighbor offsets: ' + finger + '/' + name)
            neighbor_floors[name] = np.minimum(.005, np.array(offsets, dtype=float))
        # Sparse per-influence batches avoid per-vertex Blender evaluation.
        batches = {}
        for sample_index, vertex_index in enumerate(indices):
            vertex = body.data.vertices[vertex_index]
            for group in vertex.groups:
                name = group_names[group.group]
                if group.weight <= 0 or name not in rest_inverse:
                    continue
                local = rest_inverse[name] @ mesh_to_rig @ vertex.co
                batches.setdefault(name, []).append((sample_index, (*local, 1.0), group.weight))
        batches = {name: (np.array([s[0] for s in samples]), np.array([s[1] for s in samples]), np.array([s[2] for s in samples])) for name, samples in batches.items()}
        fixed_matrices = {name: np.array(world @ rig.pose.bones[name].matrix) for name in batches if name not in names}

        def forward(bases):
            matrices = []
            parent = parent_matrix
            for relative, basis in zip(relatives, bases):
                parent = parent @ relative @ basis
                matrices.append(parent)
            return matrices

        parity = max(max(abs(a - b) for row_a, row_b in zip(actual.matrix, calculated) for a, b in zip(row_a, row_b)) for actual, calculated in zip(bones, forward(old_basis)))
        if parity > 1e-5:
            raise RuntimeError('Analytic finger FK does not match Blender: ' + finger + ' ' + str(parity))

        def skin(matrices):
            transforms = {**fixed_matrices, **{name: np.array(world @ matrix) for name, matrix in zip(names, matrices)}}
            points = np.zeros((len(indices), 3))
            for name, (sample_indices, local, weights) in batches.items():
                points[sample_indices] += (local @ transforms[name].T)[:, :3] * weights[:, None]
            return points

        evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        expected = np.array([body.matrix_world @ evaluated.data.vertices[i].co for i in indices])
        skin_parity = float(np.max(np.linalg.norm(skin(forward(old_basis)) - expected, axis=1)))
        if skin_parity > 1e-5:
            raise RuntimeError('Analytic finger skin does not match Blender: ' + finger + ' ' + str(skin_parity))
        prior = np.radians(frozen['priorDegrees'])
        angles = np.clip(prior, lower, upper)
        evaluations = 0

        def evaluate(values, details=False):
            nonlocal evaluations
            evaluations += 1
            rotations = [Euler(tuple(values[:3]), 'XYZ').to_quaternion(), Quaternion((1, 0, 0), float(values[3])), Quaternion((1, 0, 0), float(values[4]))]
            matrices = forward([Matrix.LocRotScale(loc, rot, scale) for loc, rot, scale in zip(locations, rotations, scales)])
            contact = np.array(world @ matrices[2] @ marker_local)
            points = skin(matrices)
            offsets, other_penalties, thumb_gaps = [], [], []
            for sample_index, coordinates in enumerate(points):
                point = Vector(coordinates)
                nearest, normal, _, _ = surface.find_nearest(point)
                offsets.append((point - nearest).dot(normal))
                for name, other in solved_surfaces.items():
                    nearest, normal, _, distance = other.find_nearest(point)
                    # Frozen signed floors preserve accepted spacing, including
                    # negative offsets from these open regional surfaces.
                    other_penalties.append(max(0.0, neighbor_floors[name][sample_index] - (point - nearest).dot(normal)) * 5 if distance < .015 else 0.0)
                if thumb_surface:
                    _, _, _, distance = thumb_surface.find_nearest(point)
                    thumb_gaps.append(distance)
            clearance = np.maximum(0, guide_floors - np.array(offsets)) * 5
            proximity = np.maximum(0, .003 - np.array(thumb_gaps)) * 5
            residual = np.concatenate(((contact - target) * contact_weights, clearance, other_penalties, proximity, (values - prior) * .0005))
            if details:
                return residual, {'contactGapMM': float(np.linalg.norm(contact - target) * 1000), 'markerWorld': contact.tolist(), 'minimumSignedGuideMM': float(min(offsets) * 1000), 'samplesBelowGuide': int(np.count_nonzero(clearance)), 'maximumOtherFingerGuidePenalty': float(max(other_penalties, default=0)), 'minimumThumbProximityMM': float(min(thumb_gaps) * 1000) if thumb_gaps else None}
            return residual

        initial_residual, initial_details = evaluate(angles, True)
        status = 'budget_limit'
        iterations = 0
        for iteration in range(max_iterations):
            iterations = iteration + 1
            residual = evaluate(angles)
            if float(residual @ residual) <= 1e-12:
                status = 'converged'
                break
            jacobian = np.empty((len(residual), 5))
            for axis in range(5):
                sample = angles.copy()
                sample[axis] += .002
                jacobian[:, axis] = (evaluate(sample) - residual) / .002
            gradient = -jacobian.T @ residual - (angles - prior) * .0000001
            free = ((angles > lower + .00001) | (gradient > 0)) & ((angles < upper - .00001) | (gradient < 0))
            if not np.any(free):
                status = 'stationary_at_bounds'
                break
            active = jacobian[:, free]
            step = np.zeros(5)
            step[free] = np.linalg.solve(active.T @ active + np.eye(np.count_nonzero(free)) * .000002, gradient[free])
            updated = angles.copy()
            for factor in (1, .5, .25, .125, .0625, .03125):
                trial = np.clip(angles + np.clip(step, -.12, .12) * factor, lower, upper)
                trial_residual = evaluate(trial)
                if trial_residual @ trial_residual < residual @ residual:
                    updated = trial
                    break
            if np.max(np.abs(updated - angles)) < .00001:
                best = float(residual @ residual)
                for distance in (.04, .01, .002):
                    for axis in range(5):
                        for sign in (-1, 1):
                            trial = angles.copy()
                            trial[axis] = np.clip(trial[axis] + sign * distance, lower[axis], upper[axis])
                            trial_residual = evaluate(trial)
                            score = float(trial_residual @ trial_residual)
                            if score < best:
                                best, updated = score, trial
                if np.max(np.abs(updated - angles)) < .00001:
                    status = 'stalled'
                    break
            angles = updated
        final_residual, final_details = evaluate(angles, True)
        bones[0].rotation_quaternion = Euler(tuple(angles[:3]), 'XYZ').to_quaternion()
        for bone, value in zip(bones[1:], angles[3:]):
            bone.rotation_quaternion = Quaternion((1, 0, 0), float(value))
        bpy.context.view_layer.update()
        for bone, location, scale in zip(bones, locations, scales):
            if (bone.location - location).length > 1e-7 or (bone.scale - scale).length > 1e-7:
                raise RuntimeError('Finger fitting changed a fixed local location or scale')
        actual_marker = np.array(marker.matrix_world.translation)
        final_details['markerFKParityMM'] = float(np.linalg.norm(actual_marker - np.array(final_details['markerWorld'])) * 1000)
        if final_details['markerFKParityMM'] > .01:
            raise RuntimeError('Final finger marker differs from analytic fit: ' + finger)
        result = {'priorDegrees': list(frozen['priorDegrees']), 'finalDegrees': np.degrees(angles).tolist(), 'inputQuaternions': old_quaternions, 'targetWorld': target.tolist(), 'sampleCount': len(indices), 'iterations': iterations, 'evaluations': evaluations, 'status': status, 'converged': status in ('converged', 'stationary_at_bounds'), 'budgetLimitReached': status == 'budget_limit', 'fkMaximumElementError': parity, 'skinParityMM': skin_parity * 1000, 'initialResidualSquared': float(initial_residual @ initial_residual), 'finalResidualSquared': float(final_residual @ final_residual), 'initial': initial_details, 'final': final_details}
        report['fingers'][finger] = result
        digit_indices = [v.index for v in body.data.vertices if sum(
            g.weight for g in v.groups if group_names[g.group].startswith('L_' + finger + '.')
        ) > .8]
        digit_surface = evaluated_surface(digit_indices)
        if digit_surface:
            solved_surfaces[finger] = digit_surface
    report['elapsedSeconds'] = time.monotonic() - started
    return report
