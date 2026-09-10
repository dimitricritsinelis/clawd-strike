"""Fit left glove reinforcement and rebind stitching without changing anatomy."""
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform


def repair_glove_finish(rig, body):
    def source_surface(source):
        source.data.calc_loop_triangles()
        triangles = [tuple(t.vertices) for t in source.data.loop_triangles]
        coordinates = [source.matrix_world @ v.co for v in source.data.vertices]
        return source, coordinates, triangles, BVHTree.FromPolygons(coordinates, triangles, all_triangles=True)

    def bind(vertex, target, surface, hit, triangle):
        source, coordinates, triangles, _ = surface
        indices = triangles[triangle]
        factors = barycentric_transform(hit, *(coordinates[i] for i in indices), Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
        factors = [max(0.0, value) for value in factors]
        total = sum(factors)
        weights = {}
        for index, factor in zip(indices, factors):
            for item in source.data.vertices[index].groups:
                name = source.vertex_groups[item.group].name
                if name in rig.data.bones:
                    weights[name] = weights.get(name, 0.0) + item.weight * factor / total
        weights = sorted(weights.items(), key=lambda item: item[1], reverse=True)[:4]
        total = sum(weight for _, weight in weights)
        if total <= 0:
            raise RuntimeError('No skin weights at ' + target.name)
        for group in target.vertex_groups:
            group.remove([vertex.index])
        for name, weight in weights:
            group = target.vertex_groups.get(name) or target.vertex_groups.new(name=name)
            group.add([vertex.index], weight / total, 'REPLACE')

    body_surface = source_surface(body)
    patches = ['Dorsal reinforcement', 'Index knuckle pad', 'Middle knuckle pad', 'Ring knuckle pad', 'Little knuckle pad']
    changed = []
    for name in patches:
        patch = bpy.data.objects[name]
        if patch.get('left_finish_repair_revision') == 1:
            continue
        if patch.parent != rig:
            raise RuntimeError('Unexpected reinforcement parent: ' + name)
        bpy.ops.object.select_all(action='DESELECT')
        patch.select_set(True)
        bpy.context.view_layer.objects.active = patch
        modifier = patch.modifiers.new('Refined reinforcement surface', 'SUBSURF')
        modifier.levels = modifier.render_levels = 2
        modifier.boundary_smooth = 'PRESERVE_CORNERS'
        modifier.uv_smooth = 'PRESERVE_BOUNDARIES'
        bpy.ops.object.modifier_move_to_index(modifier=modifier.name, index=0)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        inverse = patch.matrix_world.inverted()
        left_edge = min(vertex.co.x for vertex in patch.data.vertices)
        width_scale = .90 if name == 'Middle knuckle pad' else .96 if name == 'Ring knuckle pad' else 1.0
        for vertex in patch.data.vertices:
            point = vertex.co.copy()
            point.x = left_edge + (point.x - left_edge) * width_scale
            hit, normal, triangle, _ = body_surface[3].find_nearest(patch.matrix_world @ point)
            vertex.co = inverse @ (hit + normal * .001)
            bind(vertex, patch, body_surface, hit, triangle)
        patch.data.update()
        patch['left_finish_repair_revision'] = 1
        changed.append(name)

    overlay = bpy.data.objects['Palm heel suede overlay']
    surfaces = [body_surface, source_surface(overlay)]
    for name in ['Palm overlay rolled seam', 'Palm overlay stitching', 'Palm overlay stitching.001']:
        trim = bpy.data.objects.get(name)
        if trim is None or trim.get('left_finish_binding_revision') == 1:
            continue
        if trim.parent != rig:
            raise RuntimeError('Unexpected trim parent: ' + name)
        for vertex in trim.data.vertices:
            point = trim.matrix_world @ vertex.co
            choices = [(surface, surface[3].find_nearest(point)) for surface in surfaces]
            surface, (hit, _, triangle, _) = min(choices, key=lambda item: item[1][3])
            bind(vertex, trim, surface, hit, triangle)
        trim['left_finish_binding_revision'] = 1
        changed.append(name)
    bpy.context.view_layer.update()
    return changed
