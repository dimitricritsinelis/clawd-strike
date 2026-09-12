"""Blender materials that match the map's wall palette.

    import sys; sys.path.insert(0, str(REPO / 'assets/source'))
    from facade_materials import assign, material
    assign(obj, 'ph_sandstone_blocks_05')          # world-scale UVs + pack material

Reads apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/materials.json
and builds a Principled BSDF the glTF exporter understands: albedo x tint x albedoBoost as base colour,
ARM (R occlusion, G roughness, B metalness) split into roughness/metallic, normal map with the pack's
normalScale, occlusion through the glTF Material Output group. UVs are world-aligned at tileSizeM so
textures land at the same world scale as the kit walls. Materials are cached per id within a scene.
"""
from pathlib import Path
import json
import hashlib

import bpy

REPO = Path(__file__).resolve().parents[2]
PACK = REPO / 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5'
_ENTRIES = {m['id']: m for m in json.loads((PACK / 'materials.json').read_text())['materials']}
_CACHE = {}
_TARGETS = json.loads((REPO / 'docs/map-design/construction/design.json').read_text())['materials']


def entry(material_id):
    if material_id not in _ENTRIES:
        raise KeyError(f"{material_id} is not in materials.json; known ids: {', '.join(sorted(_ENTRIES))}")
    return _ENTRIES[material_id]


def _image(relative, non_color=False):
    path = (PACK / relative).resolve()
    image = bpy.data.images.load(str(path), check_existing=True)
    if non_color:
        image.colorspace_settings.name = 'Non-Color'
    image.pack()
    return image


def _gltf_output_group():
    """The glTF exporter reads occlusion from a node group with this exact name."""
    group = bpy.data.node_groups.get('glTF Material Output')
    if group is None:
        group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        group.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
        group.nodes.new('NodeGroupInput')
    return group


def _linear_channel(byte):
    """Manifest hex tints are sRGB; Blender node colors and Three.js shaders use linear RGB."""
    value = byte / 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def material(material_id, resolution='1k'):
    if material_id in _CACHE and _CACHE[material_id].users >= 0:
        return _CACHE[material_id]
    target = _TARGETS.get(material_id, {})
    recipe = target.get('baseColorRecipe')
    if recipe:
        recipes = REPO / 'assets/source/bz04-shared-environment/materials/recipes.json'
        if not recipes.exists():
            raise ValueError('Run python3 assets/source/bz04_material_recipes.py before R7 construction')
        baked = json.loads(recipes.read_text())[material_id]
        digest = hashlib.sha256(json.dumps(target, sort_keys=True).encode()).hexdigest()
        if baked['sourceRecipeSha256'] != digest:
            raise ValueError(f'Stale derived material recipe: {material_id}')
        for channel, relative in baked['textures'].items():
            if hashlib.sha256((REPO / relative).read_bytes()).hexdigest() != baked['sha256'][channel]:
                raise ValueError(f'Derived material changed: {relative}')
        e = {**target, 'textures': {'1k': {k: str(REPO/v) for k,v in baked['textures'].items()}}, 'tintHex': '#ffffff', 'albedoBoost': 1}
    else:
        e = entry(material_id)
    textures = e['textures'].get(resolution) or next(iter(e['textures'].values()))
    mat = bpy.data.materials.new(recipe['exportName'] if recipe else material_id)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes['Principled BSDF']

    albedo = nodes.new('ShaderNodeTexImage'); albedo.image = _image(textures['albedo']); albedo.location = (-700, 300)
    tint = nodes.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'; tint.location = (-350, 300)
    tint.inputs['Factor'].default_value = 1.0
    hex_tint = e.get('tintHex', '#ffffff').lstrip('#')
    boost = float(e.get('albedoBoost', 1.0))
    rgb = [min(1.0, _linear_channel(int(hex_tint[i:i + 2], 16)) * boost) for i in (0, 2, 4)]
    tint.inputs[7].default_value = (*rgb, 1.0)  # B input of the RGBA mix
    links.new(albedo.outputs['Color'], tint.inputs[6])  # A input
    links.new(tint.outputs[2], bsdf.inputs['Base Color'])

    arm = nodes.new('ShaderNodeTexImage'); arm.image = _image(textures['arm'], non_color=True); arm.location = (-700, -50)
    split = nodes.new('ShaderNodeSeparateColor'); split.location = (-350, -50)
    links.new(arm.outputs['Color'], split.inputs['Color'])
    roughness = nodes.new('ShaderNodeMath'); roughness.operation = 'MULTIPLY'
    roughness.inputs[1].default_value = float(e.get('roughness', 0.95))
    links.new(split.outputs['Green'], roughness.inputs[0])
    links.new(roughness.outputs[0], bsdf.inputs['Roughness'])
    if 'metalness' in e:
        bsdf.inputs['Metallic'].default_value = e['metalness']
    else:
        links.new(split.outputs['Blue'], bsdf.inputs['Metallic'])
    occlusion = nodes.new('ShaderNodeGroup'); occlusion.node_tree = _gltf_output_group(); occlusion.location = (0, -250)
    links.new(split.outputs['Red'], occlusion.inputs['Occlusion'])

    normal_tex = nodes.new('ShaderNodeTexImage'); normal_tex.image = _image(textures['normal'], non_color=True); normal_tex.location = (-700, -400)
    normal_map = nodes.new('ShaderNodeNormalMap'); normal_map.location = (-350, -400)
    normal_map.inputs['Strength'].default_value = float(e.get('normalScale', 0.6))
    links.new(normal_tex.outputs['Color'], normal_map.inputs['Color'])
    links.new(normal_map.outputs['Normal'], bsdf.inputs['Normal'])

    mat['tileSizeM'] = float(e['tileSizeM'])
    if recipe:
        mat['bz04SourceMaterial'] = material_id
        mat['bz04RecipeMode'] = recipe['mode']
        if target.get('surfaceCropRecipe'):
            mat['bz04UvRepeat'] = target['surfaceCropRecipe']['mirrorTileWorldSizeM']
    _CACHE[material_id] = mat
    return mat


def stained_glass():
    """The retained CC0 clerestory panel, mapped once across the opening's 0..1 UVs."""
    name = 'stained_glass_panel_001'
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    folder = PACK.parent.parent / 'windows' / name
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes['Principled BSDF']
    # The sealed backing stays opaque; this is a colored-glass surface, not a new opening.
    for channel, socket in [('basecolor', 'Base Color'), ('roughness', 'Roughness'), ('metallic', 'Metallic')]:
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = bpy.data.images.load(str(folder / f'Glass_Stained_Panel_001_{channel}.png'), check_existing=True)
        if channel != 'basecolor':
            texture.image.colorspace_settings.name = 'Non-Color'
        texture.image.pack()
        links.new(texture.outputs['Color'], bsdf.inputs[socket])
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = bpy.data.images.load(str(folder / 'Glass_Stained_Panel_001_normal.png'), check_existing=True)
    texture.image.colorspace_settings.name = 'Non-Color'
    texture.image.pack()
    normal = nodes.new('ShaderNodeNormalMap')
    normal.inputs['Strength'].default_value = 0.6
    links.new(texture.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def world_uv(obj, tile_size_m):
    """World-aligned metre UVs; adjacent pieces share one continuous texture field."""
    if tile_size_m <= 0:
        raise ValueError('texture tile size must be positive')
    mesh = obj.data
    uv = mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    repeat = mesh.materials[0].get('bz04UvRepeat') if mesh.materials else None
    lengths = [max(v.co[i] for v in mesh.vertices)-min(v.co[i] for v in mesh.vertices) for i in range(3)] if repeat else None
    for face in mesh.polygons:
        normal = normal_matrix @ face.normal
        axis = max(range(3), key=lambda i: abs(normal[i]))
        for loop_index in face.loop_indices:
            point = obj.matrix_world @ mesh.vertices[mesh.loops[loop_index].vertex_index].co
            axes = (1, 2) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
            if repeat:
                along = max(axes, key=lambda i: lengths[i])
                across = next(i for i in axes if i != along)
                uv.data[loop_index].uv = (point[along]/repeat[0], point[across]/repeat[1])
            else:
                uv.data[loop_index].uv = (point[axes[0]] / tile_size_m, point[axes[1]] / tile_size_m)
    obj.select_set(False)


def assign(obj, material_id, resolution='1k'):
    mat = material(material_id, resolution)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    world_uv(obj, mat['tileSizeM'])
    return mat
