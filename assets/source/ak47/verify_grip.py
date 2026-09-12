"""Read-only near-face grip gates for an opened source or reload preview blend.

Blender -b <blend> --python-exit-code 1 --python verify_grip.py -- --output <json>
The convex magazine envelope is conservative across ribs and concavities.
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils.bvhtree import BVHTree

SOURCE = Path(__file__).resolve().parent
CENTRAL_PULP_TRANSVERSE_ORIGIN_M = -.0082
spec = importlib.util.spec_from_file_location('grip_measure', SOURCE / 'exports/review-2026-09-09/measure.py')
measure = importlib.util.module_from_spec(spec)
spec.loader.exec_module(measure)
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path)
parser.add_argument('--frames', help='Comma-separated Blender frame numbers; default samples Reload, or static frame 33')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
scene = bpy.context.scene
rig = bpy.data.objects['L_Armature']
magazine = bpy.data.objects['Magazine']
body = bpy.data.objects['L_GloveAndForearm']
meshes = [body, bpy.data.objects['Palm heel suede overlay']]
left_keys = [ob.data.shape_keys for ob in scene.objects if ob.type == 'MESH' and ob.data.shape_keys
             and any(m.type == 'ARMATURE' and m.object == rig for m in ob.modifiers)]
reloading = bool(rig.animation_data and any(t.name == 'Reload' and not t.mute for t in rig.animation_data.nla_tracks)) or any(
    keys.animation_data and 'Reload' in keys.animation_data.nla_tracks for keys in left_keys)
frames = [int(f) for f in args.frames.split(',')] if args.frames else ([1, 12, 24, 28, 31, 33, 76, 119, 123, 126, 137, 148] if reloading else [33])
report = {'inputBlend': bpy.data.filepath, 'narrowphaseSelfTest': measure.narrowphase_self_test(),
          'proxy': 'Closed convex envelope of visible magazine vertices; conservative across concavities and ribs.',
          'pulpDefinition': 'Current tessellation classified from immutable rest tissue. Central contact: distal band 0.3–0.85, absolute local X relative to frozen -8.2 mm rest-surface center <= 3.5 mm, rest normal dot new L_thumb.03 +Z >= 0.9. Broad diagnostic: band 0.25–0.9 and normal dot +Z >= 0.8. All vertices thumb weighted.',
          'centralPulpThresholds': {'transverseOriginM': CENTRAL_PULP_TRANSVERSE_ORIGIN_M, 'transverseOriginProvenance': 'rest-pulp-center.json independent rest-surface centroid', 'minimumRestAreaMM2': 40, 'minimumTransverseSpanMM': 5, 'minimumLongitudinalBoneFraction': .4, 'connectedComponents': 1, 'maximumGapMM': 1, 'minimumOpposingNormalDot': .8},
          'webDefinition': 'Frozen body edges whose endpoints lie within 55 mm of both CMC and index MCP rest heads.',
          'samples': [], 'failures': []}


def fail(message):
    report['failures'].append(message)


def convex_proxy(points):
    mesh = bmesh.new()
    try:
        for point in points:
            mesh.verts.new(point)
        bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=1e-7)
        bmesh.ops.convex_hull(mesh, input=list(mesh.verts))
        mesh.normal_update()
        mesh.verts.ensure_lookup_table()
        mesh.verts.index_update()
        vertices = [v.co.copy() for v in mesh.verts]
        triangles = [tuple(loop.vert.index for loop in triangle) for triangle in mesh.calc_loop_triangles()]
        return vertices, triangles
    finally:
        mesh.free()


distal = rig.data.bones['L_thumb.03']
cmc = rig.data.bones['L_thumb.01'].head_local
index_mcp = rig.data.bones['L_f_index.01'].head_local
def regions(definition, triangles):
    rest, thumb = definition['rest'], definition['thumb']
    thumb_faces = {i for i, t in enumerate(triangles) if any(thumb[v] for v in t)}
    pulp, central = [], []
    for i, t in enumerate(triangles):
        if not all(thumb[v] for v in t):
            continue
        a, b, c = [rest[v] for v in t]
        center = (a + b + c) / 3
        along = (center - distal.head_local).dot(distal.y_axis) / distal.length
        normal_dot = (b - a).cross(c - a).normalized().dot(distal.z_axis)
        transverse = (center - distal.head_local).dot(distal.x_axis)
        if .25 <= along <= .9 and normal_dot >= .8:
            pulp.append(i)
        if .3 <= along <= .85 and abs(transverse - CENTRAL_PULP_TRANSVERSE_ORIGIN_M) <= .0035 and normal_dot >= .9:
            central.append(i)
    return thumb_faces, pulp, central


definitions = {}
for ob in meshes:
    rest_transform = rig.matrix_world.inverted() @ ob.matrix_world
    rest = [rest_transform @ v.co for v in ob.data.vertices]
    thumb = [sum(g.weight for g in v.groups if ob.vertex_groups[g.group].name.startswith('L_thumb.')) > .01 for v in ob.data.vertices]
    web = []
    if ob == body:
        web_vertices = {i for i, p in enumerate(rest) if (p-cmc).length < .055 and (p-index_mcp).length < .055}
        web = [(e.vertices[0], e.vertices[1], (rest[e.vertices[0]]-rest[e.vertices[1]]).length)
               for e in ob.data.edges if all(i in web_vertices for i in e.vertices) and (rest[e.vertices[0]]-rest[e.vertices[1]]).length > 1e-7]
        report['webRestEdges'] = web
        if not web:
            fail('No rest web edges selected')
    definitions[ob.name] = {'rest': rest, 'thumb': thumb, 'web': web, 'polygons': [tuple(p.vertices) for p in ob.data.polygons]}

original_frame = scene.frame_current
original_subframe = scene.frame_subframe
animation_states = []
try:
    if reloading:
        for animation in [rig.animation_data, *[keys.animation_data for keys in left_keys]]:
            if not animation or 'Reload' not in animation.nla_tracks:
                continue
            animation_states.append((animation, animation.action, animation.action_slot, [(t, t.mute) for t in animation.nla_tracks]))
            animation.action = None
            for track in animation.nla_tracks:
                track.mute = track.name != 'Reload'

    for frame in frames:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        depsgraph = bpy.context.evaluated_depsgraph_get()
        visible_vertices, visible_triangles = measure._geometry(bpy.data.objects['Magazine_Surfaces'], depsgraph)
        proxy_vertices, proxy_triangles = convex_proxy(visible_vertices)
        topology = measure._topology(proxy_vertices, proxy_triangles)
        volume = sum(proxy_vertices[a].dot(proxy_vertices[b].cross(proxy_vertices[c])) / 6 for a, b, c in proxy_triangles)
        topology['closedSolidCertified'] = not any(topology[k] for k in ['boundaryEdges', 'overConnectedEdges', 'inconsistentPairedWinding', 'degenerateFaces']) and volume > 0
        topology['note'] = 'Convex hull construction with edge, winding and positive-volume audit.'
        if not topology['closedSolidCertified']:
            fail(f'Frame {frame}: magazine proxy is not a closed outward-facing solid')
        proxy_tree = BVHTree.FromPolygons(proxy_vertices, proxy_triangles, all_triangles=True)
        targets = [('visible', visible_vertices, visible_triangles), ('proxy', proxy_vertices, proxy_triangles)]
        digit_displacement = max(b.location.length for b in rig.pose.bones if b.name.startswith(('L_f_', 'L_thumb.')))
        sample = {'frame': frame, 'maxDigitDisplacementM': digit_displacement, 'proxyTopology': topology, 'proxyVolumeM3': volume, 'meshes': {}}
        if digit_displacement > 1e-7:
            fail(f'Frame {frame}: digit translation {digit_displacement:.9g} m')
        for ob in meshes:
            definition = definitions[ob.name]
            vertices, triangles = measure._geometry(ob, depsgraph)
            polygons = [tuple(p.vertices) for p in ob.evaluated_get(depsgraph).data.polygons]
            if len(vertices) != len(definition['rest']) or polygons != definition['polygons']:
                raise RuntimeError('Evaluated vertex or polygon topology changed: ' + ob.name)
            # Quad diagonals can change with deformation. Keep that exact
            # evaluated surface, but classify it only from frozen rest tissue.
            thumb_faces, pulp, central = regions(definition, triangles)
            if not pulp:
                fail(f'Frame {frame}: no rest pulp triangles selected: {ob.name}')
            skin = [tuple(vertices[v] for v in t) for t in triangles]
            tree = BVHTree.FromPolygons(vertices, triangles, all_triangles=True)
            entry = {'thumbMagazineTrianglePairs': {}, 'pulp': {}, 'thumbSelfIntersectionPairs': 0}
            if 33 <= frame <= 119:
                for label, target_vertices, target_triangles in targets:
                    target_tree = BVHTree.FromPolygons(target_vertices, target_triangles, all_triangles=True)
                    pairs = sum(bool(measure._intersection(skin[i], tuple(target_vertices[v] for v in target_triangles[j])))
                                for i, j in tree.overlap(target_tree) if i in thumb_faces)
                    entry['thumbMagazineTrianglePairs'][label] = pairs
                    if pairs:
                        fail(f'Frame {frame}: {ob.name} thumb/{label} magazine has {pairs} triangle pairs')
            pairs = 0
            for i, j in tree.overlap(tree):
                if i >= j or not ({i, j} & thumb_faces) or set(triangles[i]) & set(triangles[j]):
                    continue
                pairs += bool(measure._intersection(skin[i], skin[j]))
            entry['thumbSelfIntersectionPairs'] = pairs
            if pairs:
                fail(f'Frame {frame}: {ob.name} thumb/body has {pairs} self-intersection pairs')
            def pulp_stats(region):
                gaps, alignments, near, areas, rest_areas, centers = [], [], [], [], [], []
                edges = {}
                neighbors = {i: set() for i in region}
                for i in region:
                    a, b, c = skin[i]
                    point = (a+b+c) / 3
                    _, normal, _, gap = proxy_tree.find_nearest(point)
                    gaps.append(gap)
                    cross = (b-a).cross(c-a)
                    areas.append(cross.length*.5*1e6)
                    alignments.append(-cross.normalized().dot(normal))
                    near.append((magazine.matrix_world.to_3x3().transposed() @ normal).normalized().y > .8)
                    a, b, c = [definition['rest'][v] for v in triangles[i]]
                    rest_areas.append((b-a).cross(c-a).length*.5*1e6)
                    centers.append((a+b+c)/3-distal.head_local)
                    ids = triangles[i]
                    for first, second in zip(ids, ids[1:]+ids[:1]):
                        edge = tuple(sorted((first, second)))
                        for other in edges.get(edge, []):
                            neighbors[i].add(other)
                            neighbors[other].add(i)
                        edges.setdefault(edge, []).append(i)
                remaining = set(region)
                components = 0
                while remaining:
                    pending = [remaining.pop()]
                    components += 1
                    while pending:
                        adjacent = neighbors[pending.pop()] & remaining
                        remaining.difference_update(adjacent)
                        pending.extend(adjacent)
                transverse = [center.dot(distal.x_axis) for center in centers]
                longitudinal = [center.dot(distal.y_axis) for center in centers]
                contacts = [g <= .001 and a >= .8 and n for g, a, n in zip(gaps, alignments, near)]
                area = sum(areas)
                contact_area = sum(a for a, contact in zip(areas, contacts) if contact)
                return {'triangleCount': len(gaps), 'sourceVertexTriples': [triangles[i] for i in region],
                        'restAreaMM2': sum(rest_areas), 'posedAreaMM2': area, 'contactAreaMM2': contact_area,
                        'areaWeightedCoverage': contact_area/area if area else 0,
                        'restTransverseSpanMM': (max(transverse)-min(transverse))*1000 if transverse else 0,
                        'restLongitudinalBoneFraction': (max(longitudinal)-min(longitudinal))/distal.length if longitudinal else 0,
                        'connectedComponents': components, 'maxGapM': max(gaps, default=None),
                        'minOpposingNormalDot': min(alignments, default=None),
                        'nearFaceTriangles': sum(near), 'contactTriangles': sum(contacts)}

            entry['pulp'] = pulp_stats(pulp)
            entry['centralPulp'] = central_stats = pulp_stats(central)
            # Rolled outer edges remain diagnostics. A substantial connected
            # central strip defines contact; the under-suede body is reported.
            if ob != body:
                if central_stats['restAreaMM2'] < 40 or central_stats['restTransverseSpanMM'] < 5 or central_stats['restLongitudinalBoneFraction'] < .4 or central_stats['connectedComponents'] != 1:
                    fail(f'Frame {frame}: central pulp selection lacks required area, spans or connectivity')
                if 33 <= frame <= 119 and (not central or central_stats['contactTriangles'] != len(central)):
                    fail(f'Frame {frame}: central outer pulp is not fully within 1 mm and facing the near magazine face')
            if definition['web']:
                world_to_rig = rig.matrix_world.inverted()
                ratios = [(world_to_rig @ vertices[a] - world_to_rig @ vertices[b]).length / length for a, b, length in definition['web']]
                entry['webStretch'] = {'edgeCount': len(ratios), 'max': max(ratios), 'p95': float(np.percentile(ratios, 95))}
                if max(ratios) >= 1.6:
                    fail(f'Frame {frame}: web maximum edge stretch {max(ratios):.6g} exceeds 1.6')
            sample['meshes'][ob.name] = entry
        report['samples'].append(sample)
finally:
    for animation, action, slot, tracks in animation_states:
        animation.action = action
        if action:
            animation.action_slot = slot
        for track, mute in tracks:
            track.mute = mute
    scene.frame_set(original_frame, subframe=original_subframe)
    bpy.context.view_layer.update()

if args.output:
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'webRestEdges'}, indent=2), flush=True)
if report['failures']:
    raise RuntimeError(f'Grip verification failed: {len(report["failures"])} checks; see report')
