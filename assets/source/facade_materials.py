"""Blender materials that match the map's wall palette.

    import sys; sys.path.insert(0, str(REPO / 'assets/source'))
    from facade_materials import assign, material
    assign(obj, 'ph_sandstone_blocks_05')          # world-scale UVs + pack material

Reads apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/materials.json
and builds a Principled BSDF the glTF exporter understands: albedo x tint x albedoBoost as base colour,
ARM (R occlusion, G roughness, B metalness) split into roughness/metallic, normal map with the pack's
normalScale, occlusion through the glTF Material Output group. UVs are cube-projected at tileSizeM so
textures land at the same world scale as the kit walls. Materials are cached per id within a scene.
"""
from pathlib import Path
import json

import bpy

REPO = Path(__file__).resolve().parents[2]
PACK = REPO / 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5'
_ENTRIES = {m['id']: m for m in json.loads((PACK / 'materials.json').read_text())['materials']}
_CACHE = {}


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


def material(material_id, resolution='1k'):
    if material_id in _CACHE and _CACHE[material_id].users >= 0:
        return _CACHE[material_id]
    e = entry(material_id)
    textures = e['textures'].get(resolution) or next(iter(e['textures'].values()))
    mat = bpy.data.materials.new(material_id)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes['Principled BSDF']

    albedo = nodes.new('ShaderNodeTexImage'); albedo.image = _image(textures['albedo']); albedo.location = (-700, 300)
    tint = nodes.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'; tint.location = (-350, 300)
    tint.inputs['Factor'].default_value = 1.0
    hex_tint = e.get('tintHex', '#ffffff').lstrip('#')
    boost = float(e.get('albedoBoost', 1.0))
    rgb = [min(1.0, int(hex_tint[i:i + 2], 16) / 255 * boost) for i in (0, 2, 4)]
    tint.inputs[7].default_value = (*rgb, 1.0)  # B input of the RGBA mix
    links.new(albedo.outputs['Color'], tint.inputs[6])  # A input
    links.new(tint.outputs[2], bsdf.inputs['Base Color'])

    arm = nodes.new('ShaderNodeTexImage'); arm.image = _image(textures['arm'], non_color=True); arm.location = (-700, -50)
    split = nodes.new('ShaderNodeSeparateColor'); split.location = (-350, -50)
    links.new(arm.outputs['Color'], split.inputs['Color'])
    links.new(split.outputs['Green'], bsdf.inputs['Roughness'])
    links.new(split.outputs['Blue'], bsdf.inputs['Metallic'])
    occlusion = nodes.new('ShaderNodeGroup'); occlusion.node_tree = _gltf_output_group(); occlusion.location = (0, -250)
    links.new(split.outputs['Red'], occlusion.inputs['Occlusion'])

    normal_tex = nodes.new('ShaderNodeTexImage'); normal_tex.image = _image(textures['normal'], non_color=True); normal_tex.location = (-700, -400)
    normal_map = nodes.new('ShaderNodeNormalMap'); normal_map.location = (-350, -400)
    normal_map.inputs['Strength'].default_value = float(e.get('normalScale', 0.6))
    links.new(normal_tex.outputs['Color'], normal_map.inputs['Color'])
    links.new(normal_map.outputs['Normal'], bsdf.inputs['Normal'])

    mat['tileSizeM'] = float(e['tileSizeM'])
    _CACHE[material_id] = mat
    return mat


def world_uv(obj, tile_size_m):
    """Cube-project UVs so one texture repeat covers tile_size_m metres, like the kit's world projection."""
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=tile_size_m, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    obj.select_set(False)


def assign(obj, material_id, resolution='1k'):
    mat = material(material_id, resolution)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    world_uv(obj, mat['tileSizeM'])
    return mat
