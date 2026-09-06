"""Spawn A compound-wall faces. Metres, Z up, street -Y; scanned CC0 PBR."""
import math
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
TEX = ROOT / 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05'

def material():
    mat = bpy.data.materials.new('Scanned weathered sandstone')
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    for suffix, kind in [('diff', 'color'), ('nor_gl', 'normal'), ('arm', 'arm')]:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(TEX / f'sandstone_blocks_05_{suffix}_1k.jpg'))
        tex.image.pack()
        if kind == 'color':
            links.new(tex.outputs['Color'], shader.inputs['Base Color'])
        else:
            tex.image.colorspace_settings.name = 'Non-Color'
            if kind == 'normal':
                normal = nodes.new('ShaderNodeNormalMap')
                normal.inputs['Strength'].default_value = 0.65
                links.new(tex.outputs['Color'], normal.inputs['Color'])
                links.new(normal.outputs['Normal'], shader.inputs['Normal'])
            else:
                split = nodes.new('ShaderNodeSeparateColor')
                links.new(tex.outputs['Color'], split.inputs['Color'])
                links.new(split.outputs['Green'], shader.inputs['Roughness'])
                links.new(split.outputs['Blue'], shader.inputs['Metallic'])
                group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
                group.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
                ao = nodes.new('ShaderNodeGroup')
                ao.node_tree = group
                links.new(split.outputs['Red'], ao.inputs['Occlusion'])
    return mat

def block(name, pos, size, mat, bevel=0.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    # World-size planar UVs keep each scan's masonry at a consistent two-metre scale.
    uv = ob.data.uv_layers.active
    for poly in ob.data.polygons:
        axis = max(range(3), key=lambda a: abs(poly.normal[a]))
        axes = ((1,2), (0,2), (0,1))[axis]
        for li in poly.loop_indices:
            co = ob.data.vertices[ob.data.loops[li].vertex_index].co + ob.location
            uv.data[li].uv = (co[axes[0]] / 2, co[axes[1]] / 2)
    if bevel:
        mod = ob.modifiers.new('Worn stone edges', 'BEVEL')
        mod.width, mod.segments = bevel, 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

for side, width in [('west', 2.64), ('east', 4.62)]:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    mat = material()
    # A thin complete backing seals the blind niche without changing the kit wall.
    block('Continuous stone face', (0, -0.035, 2.45), (width, 0.07, 4.9), mat)
    block('Low weathered plinth', (0, -0.10, 0.14), (width, 0.20, 0.28), mat)
    # Shallow niche frame and voussoirs, all inside the 0.35 m walking envelope.
    radius, spring, base = 0.48, 2.18, 0.95
    for x in [-0.60, 0.60]:
        for row in range(4):
            block('Niche jamb', (x, -0.14, base+(spring-base)*(row+0.5)/4), (0.22, 0.28, (spring-base)/4-0.015), mat)
    for i in range(13):
        angle = math.pi * (i+0.5)/13
        ob = block('Niche arch stone', (0.60*math.cos(angle), -0.14, spring+0.60*math.sin(angle)), (0.145, 0.28, 0.235), mat)
        ob.rotation_euler.y = math.pi/2-angle
    block('Niche sill', (0, -0.155, base-0.06), (1.43, 0.31, 0.13), mat)
    # Individually jointed coping remains inside exact frontage endpoints.
    count = math.ceil(width/0.65)
    for i in range(count):
        block('Coping', (-width/2+width/count*(i+0.5), -0.13, 4.83), (width/count-0.012, 0.26, 0.14), mat)
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = next(o for o in bpy.context.scene.objects if o.type=='MESH')
    bpy.ops.object.join()
    ob=bpy.context.object
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'spawn-a-{side}.glb'), export_format='GLB', export_yup=True, use_selection=True)
