"""Embedded Spice P2 materials derived from the existing licensed texture pack."""
from pathlib import Path
import hashlib
import json
import math

import numpy as np


FAMILIES = {'timber', 'aged_timber', 'painted_timber', 'worktop', 'plaster', 'sand', 'red', 'cloth'}
ROUGHNESS_FLOOR = {'timber': .52, 'plaster': .6, 'sand': .64, 'red': .60, 'cloth': .8, 'aged_timber': .62, 'painted_timber': .45, 'worktop': .40, 'house_plaster': .6}


def _linear(value):
    return np.where(value <= .04045, value / 12.92, ((value + .055) / 1.055) ** 2.4)


def _calibrated_albedo(source, color, grain):
    """Preserve the desired linear mean without clipping scanned highlights."""
    if not 0 <= grain <= 1 or not math.isfinite(grain):
        raise ValueError('Spice material grainMix must be finite and within 0..1')
    if len(color) != 7 or color[0] != '#':
        raise ValueError('Spice material color must use #rrggbb')
    target = _linear(np.array([int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]))
    source_linear = _linear(source[:, :3].astype(np.float64))
    mean = source_linear.mean(axis=0)
    if not np.isfinite(source_linear).all() or np.any(mean <= 0):
        raise ValueError('Spice source albedo must have finite, positive channel means')
    delta = source_linear / mean - 1
    maximum = delta.max(axis=0)
    # A single contrast bound preserves hue relationships and the requested mean.
    bounds = [(1 - target[i]) / (target[i] * maximum[i])
              for i in range(3) if target[i] > 0 and maximum[i] > 0]
    effective_grain = min(grain, *bounds) if bounds else grain
    result = target * (1 + effective_grain * delta)
    if result.min() < -1e-8 or result.max() > 1 + 1e-8:
        raise ValueError('Calibrated Spice albedo leaves the 0..1 range')
    result = np.clip(result, 0, 1)  # Floating-point endpoint noise only.
    encoded = np.where(result <= .0031308, result * 12.92, 1.055 * result ** (1 / 2.4) - .055)
    return encoded.astype(np.float32), effective_grain, target


def _pixels(image):
    values = np.empty(len(image.pixels), dtype=np.float32)
    image.pixels.foreach_get(values)
    return values.reshape((-1, 4))


def _packed_image(bpy, name, source, pixels, color_space):
    image = bpy.data.images.new(name, width=source.size[0], height=source.size[1], alpha=True)
    image.colorspace_settings.name = color_space
    image.pixels.foreach_set(pixels.ravel())
    image.pack()
    return image


def create_materials(G, settings, prefix="bz07_spice_"):
    """Return scoped private materials; G is the courtyard builder's globals dict."""
    from facade_materials import PACK, entry

    if not FAMILIES <= set(settings) or set(settings) - FAMILIES - {'house_plaster'}:
        raise ValueError('Finish recipes require the eight base families and may add house_plaster')
    bpy = G['bpy']
    source_families = json.loads((PACK / 'sources.json').read_text())['sourceFamilies']
    result = {}
    for family, recipe in settings.items():
        source_id = recipe['source']
        source_entry = entry(source_id)
        files = {channel: (PACK / relative).resolve()
                 for channel, relative in source_entry['textures']['1k'].items()}
        if set(files) != {'albedo', 'normal', 'arm'}:
            raise ValueError('Spice source must contain albedo, normal and ARM maps')
        normal_scale = float(recipe['normalScale'])
        if not math.isfinite(normal_scale) or normal_scale < 0:
            raise ValueError('Spice normalScale must be finite and nonnegative')
        material = G['pack_material'](source_id).copy()
        material.name = prefix + family
        nodes, links = material.node_tree.nodes, material.node_tree.links
        shader = nodes['Principled BSDF']
        albedo_node = next(n for n in nodes if n.type == 'TEX_IMAGE'
                           and Path(n.image.filepath_from_user()).resolve() == files['albedo'])
        source_pixels = _pixels(albedo_node.image)
        rgb, effective_grain, target = _calibrated_albedo(source_pixels, recipe['color'], float(recipe['grainMix']))
        derived_pixels = source_pixels.copy()
        derived_pixels[:, :3] = rgb
        derived = _packed_image(bpy, material.name + '-albedo', albedo_node.image, derived_pixels, 'sRGB')
        albedo_node.image = derived
        for link in list(shader.inputs['Base Color'].links):
            links.remove(link)
        shader.inputs['Base Color'].default_value = (1, 1, 1, 1)
        links.new(albedo_node.outputs['Color'], shader.inputs['Base Color'])
        arm_node = next(n for n in nodes if n.type == 'TEX_IMAGE'
                        and Path(n.image.filepath_from_user()).resolve() == files['arm'])
        arm_pixels = _pixels(arm_node.image)
        floor = ROUGHNESS_FLOOR[family]
        arm_pixels[:, 1] = floor + (1 - floor) * arm_pixels[:, 1]
        arm_node.image = _packed_image(bpy, material.name + '-arm', arm_node.image, arm_pixels, 'Non-Color')
        for node in nodes:
            if node.type == 'NORMAL_MAP':
                node.inputs['Strength'].default_value = normal_scale
            if node.type == 'MATH' and node.operation == 'MULTIPLY':
                node.inputs[1].default_value = 1
        for link in list(shader.inputs['Metallic'].links):
            links.remove(link)
        shader.inputs['Metallic'].default_value = 0
        material['tileSizeM'] = 1.8 if family in {'timber', 'aged_timber', 'painted_timber', 'worktop'} else float(source_entry['tileSizeM'])
        material['bz07SourceMaterial'] = source_id
        material['bz07SourceFiles'] = {k: str(v.relative_to(G['ROOT'])) for k, v in files.items()}
        material['bz07SourceSha256'] = {k: hashlib.sha256(v.read_bytes()).hexdigest() for k, v in files.items()}
        provenance = source_families[files['albedo'].parent.name]
        material['bz07SourceProvenance'] = json.dumps(provenance, sort_keys=True)
        material['bz07Recipe'] = json.dumps(recipe, sort_keys=True)
        material['bz07AlbedoFormula'] = 'targetLinear*(1+effectiveGrainMix*(sourceLinear/channelMean-1)); decode and encode sRGB once'
        material['bz07EffectiveGrainMix'] = effective_grain
        material['bz07TargetMeanLinear'] = target.tolist()
        material['bz07RoughnessFormula'] = 'floor+(1-floor)*sourceARM.g; scalar=1; metallic=0'
        material['bz07RoughnessFloor'] = floor
        result[family] = material
    return result


def member_uv(ob, tile_m=1.8, grain_axis=None):
    """Map continuous U grain along the member's longest local geometry axis."""
    if not math.isfinite(tile_m) or tile_m <= 0:
        raise ValueError('Spice timber UV tile size must be finite and positive')
    mesh = ob.data
    lengths = [max(v.co[i] for v in mesh.vertices) - min(v.co[i] for v in mesh.vertices)
               for i in range(3)]
    if grain_axis is not None and grain_axis not in (0, 1, 2):
        raise ValueError('Timber grain axis must be 0, 1 or 2')
    along = max(range(3), key=lambda i: lengths[i]) if grain_axis is None else grain_axis
    uv = mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        normal = max(range(3), key=lambda i: abs(polygon.normal[i]))
        u_axis = along if normal != along else (along + 1) % 3
        v_axis = next(i for i in range(3) if i not in {normal, u_axis})
        winding = 1 if (u_axis + 1) % 3 == v_axis else -1
        v_sign = winding * (1 if polygon.normal[normal] >= 0 else -1)
        for loop in polygon.loop_indices:
            point = mesh.vertices[mesh.loops[loop].vertex_index].co
            uv.data[loop].uv = (point[u_axis] / tile_m, v_sign * point[v_axis] / tile_m)


def bake_contact_occlusion(G, radius=.85, strength=.5, subdivision_prefixes=()):
    """Bake bounded local contacts after prepare_mesh; do not dissolve after this.

    Existing pigment and alpha survive in CORNER colors. Only wall fields and
    shop chambers gain a 0.45 m sampling grid; the geometry stays in place.
    This is local ambient contact, not baked sunlight or a replacement for GI.
    """
    import bmesh
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree

    if not math.isfinite(radius) or radius <= 0 or not math.isfinite(strength) or not 0 <= strength <= .5:
        raise ValueError('Contact occlusion requires positive radius and strength within 0..0.5')
    meshes = sorted((ob for ob in G['bpy'].context.scene.objects if ob.type == 'MESH'), key=lambda ob: ob.name)
    added_vertices = 0
    for ob in meshes:
        mesh = ob.data
        old = mesh.color_attributes.get('COLOR_0')
        if old and old.domain not in {'POINT', 'CORNER'}:
            raise ValueError('Unsupported contact color domain: ' + old.domain)
        values = [tuple(old.data[loop.vertex_index if old.domain == 'POINT' else loop.index].color)
                  if old else (1, 1, 1, 1) for loop in mesh.loops]
        if old:
            mesh.color_attributes.remove(old)
        colors = mesh.color_attributes.new('COLOR_0', 'FLOAT_COLOR', 'CORNER')
        for item, value in zip(colors.data, values):
            item.color = value
        mesh.color_attributes.active_color = colors
        if '-field' in ob.name or ob.name.startswith(('S_W_SHOP_', *subdivision_prefixes)):
            count = len(mesh.vertices)
            bm = bmesh.new()
            bm.from_mesh(mesh)
            # ponytail: five splits cover fields up to 14.4 m; use an adaptive
            # lightmap if future building fields exceed that authored ceiling.
            for _ in range(5):
                edges = [edge for edge in bm.edges if (ob.matrix_world.to_3x3() @ (edge.verts[1].co - edge.verts[0].co)).length > .45]
                if not edges:
                    break
                bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True)
            bm.to_mesh(mesh)
            bm.free()
            mesh.update()
            added_vertices += len(mesh.vertices) - count

    vertices, faces = [], []
    for ob in meshes:
        offset = len(vertices)
        vertices.extend(ob.matrix_world @ vertex.co for vertex in ob.data.vertices)
        faces.extend(tuple(offset + index for index in polygon.vertices) for polygon in ob.data.polygons)
    if not faces:
        return {'samples': 0, 'rays': 0, 'addedVertices': added_vertices, 'minimumFactor': 1.0}
    # Section exports omit the playable floor. Include its authored plane in
    # the occlusion query only, so wall feet receive contact from the ground.
    # No extra mesh, floor height or collision is exported.
    floor = G['A']['floor']
    if floor['kind'] == 'flat' or floor['kind'] == 'ramp' and floor.get('visual_style') != 'stairs':
        rect = floor['rect']; x, y = rect['x'], rect['y']
        X, Y = x + rect['w'], y + rect['h']
        offset = len(vertices)
        for px, py in [(x,y),(X,y),(X,Y),(x,Y)]:
            if floor['kind'] == 'flat':
                z = floor['elevationM']
            else:
                assert floor['axis'] in {'x', 'y'}
                fraction = (px-x)/rect['w'] if floor['axis'] == 'x' else (py-y)/rect['h']
                z = floor['startElevationM'] + fraction*(floor['endElevationM']-floor['startElevationM'])
            vertices.append(Vector(G['local']((px,py,z))))
        faces.append(tuple(offset + index for index in (0,1,2,3)))
    elif floor['kind'] == 'ramp' and floor.get('visual_style') == 'stairs':
        # Match buildPbrFloors.ts: treads use the higher endpoint + 3 mm,
        # overlap adjoining runs by 12 mm, and close at the downhill edge.
        rect = floor['rect']; x, y = rect['x'], rect['y']
        X, Y = x + rect['w'], y + rect['h']; axis = floor['axis']
        assert axis in {'x', 'y'}
        count = floor.get('step_count', 10)
        assert isinstance(count, int) and not isinstance(count, bool) and count > 0
        start = x if axis == 'x' else y
        length = rect['w'] if axis == 'x' else rect['h']
        delta = floor['endElevationM'] - floor['startElevationM']
        for index in range(count):
            a = start + length * index / count; b = start + length * (index + 1) / count
            z0 = floor['startElevationM'] + delta * index / count
            z1 = floor['startElevationM'] + delta * (index + 1) / count
            top, bottom = max(z0, z1) + .003, min(z0, z1)
            lo = max(start, a - (.012 if index > 0 else 0))
            hi = min(start + length, b + (.012 if index < count - 1 else 0))
            edge = b if delta < 0 else a
            if axis == 'x':
                tread = [(lo,y,top),(hi,y,top),(hi,Y,top),(lo,Y,top)]
                riser = [(edge,y,bottom),(edge,Y,bottom),(edge,Y,top),(edge,y,top)]
            else:
                tread = [(x,lo,top),(X,lo,top),(X,hi,top),(x,hi,top)]
                riser = [(x,edge,bottom),(X,edge,bottom),(X,edge,top),(x,edge,top)]
            for points in (tread, riser):
                offset = len(vertices)
                vertices.extend(Vector(G['local'](point)) for point in points)
                faces.append(tuple(offset + j for j in (0,1,2,3)))
    tree = BVHTree.FromPolygons(vertices, faces)
    directions = []
    for index in range(12):
        radial = math.sqrt((index + .5) / 12)
        angle = index * math.pi * (3 - math.sqrt(5))
        directions.append((radial * math.cos(angle), radial * math.sin(angle), math.sqrt(1 - radial * radial)))
    cache = {}
    minimum = 1.0
    for ob in meshes:
        mesh = ob.data
        colors = mesh.color_attributes['COLOR_0']
        mesh.color_attributes.active_color = colors
        normals = ob.matrix_world.to_3x3().inverted().transposed()
        for polygon in mesh.polygons:
            for loop_index in polygon.loop_indices:
                vertex = mesh.vertices[mesh.loops[loop_index].vertex_index]
                point = ob.matrix_world @ vertex.co
                normal = (normals @ (vertex.normal if polygon.use_smooth else polygon.normal)).normalized()
                key = tuple(round(value, 5) for value in (*point, *normal))
                if key not in cache:
                    reference = Vector((0, 0, 1)) if abs(normal.z) < .9 else Vector((1, 0, 0))
                    tangent = normal.cross(reference).normalized()
                    bitangent = normal.cross(tangent)
                    origin = point + normal * .003
                    blocked = 0.0
                    for x, y, z in directions:
                        hit, _, _, distance = tree.ray_cast(origin, tangent * x + bitangent * y + normal * z, radius)
                        if hit is not None:
                            blocked += 1 - min(radius, distance) / radius
                    cache[key] = 1 - strength * blocked / len(directions)
                factor = cache[key]
                minimum = min(minimum, factor)
                color = colors.data[loop_index].color
                colors.data[loop_index].color = (color[0] * factor, color[1] * factor, color[2] * factor, color[3])
    result = {'samples': len(cache), 'rays': len(cache) * len(directions),
              'addedVertices': added_vertices, 'minimumFactor': minimum}
    print('Spice local contact bake:', result, flush=True)
    return result
