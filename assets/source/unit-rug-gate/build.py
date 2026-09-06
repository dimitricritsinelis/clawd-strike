"""Rug Gate merchant and keeper faces. Metres, Z up, street -Y; scanned CC0 PBR."""
import math
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
TEX = ROOT / 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5'

def material(asset):
    mat = bpy.data.materials.new(asset)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    for suffix, kind in [('diff', 'color'), ('nor_gl', 'normal'), ('arm', 'arm')]:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(TEX / asset / f'{asset}_{suffix}_1k.jpg'))
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
            uv.data[li].uv = (co[axes[0]] / (5 if mat.name.startswith('worn_plaster') else 2), co[axes[1]] / (5 if mat.name.startswith('worn_plaster') else 2))
    if bevel:
        mod = ob.modifiers.new('Worn stone edges', 'BEVEL')
        mod.width, mod.segments = bevel, 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


def opening(cx, z, width, height, stone, timber):
    block('Recessed timber closure',(cx,-.06,z+height/2),(width,.07,height),timber)
    for dx in (-width/2-.11,width/2+.11):
        block('Dressed opening jamb',(cx+dx,-.155,z+height/2),(.21,.29,height+.22),stone)
    for h in (z,z+height):
        block('Stone opening head and sill',(cx,-.17,h),(width+.46,.32,.19),stone)
    for dx in (-width*.3,0,width*.3):
        block('Timber shutter stile',(cx+dx,-.125,z+height/2),(.065,.10,height-.10),timber)
    for h in (z+.25,z+height-.25):
        block('Timber shutter strap',(cx,-.14,h),(width-.04,.08,.065),timber)

for side,width,height in [('west',6.88,7.),('east',4.88,4.5),('east-south',1.88,4.5)]:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    stone=material('sandstone_blocks_05');plaster=material('worn_plaster_wall');timber=material('rough_pine_door')
    block('Weathered wall face',(0,-.018,height/2),(width,.036,height),plaster)
    block('Cut stone wall foot',(0,-.105,.21),(width,.21,.42),stone)
    for z in (2.98,height-.12):
        block('Continuous stone string course',(0,-.115,z),(width,.23,.16),stone)
    for x in (-width/2+.19,width/2-.19):
        for j in range(int(height/.38)):
            block('Alternating dressed corner quoin',(x,-.10,.19+j*.38),(.36,.20,.366),stone,.008)
    if side=='west':
        # West frontage has +X toward the south; original display and service axes retained.
        opening(-1.64,.10,1.22,2.62,stone,timber)
        opening(1.64,.10,2.10,2.62,stone,timber)
        opening(-1.64,3.94,.94,1.15,stone,timber)
        opening(1.64,3.68,1.48,1.58,stone,timber)
        # Project-original mounted display and shutters remain at their existing placement.
        for x in (-2.5,-.80,.80,2.5):
            block('Upper timber corbel',(x,-.19,5.60),(.15,.28,.21),timber)
        block('Supported upper timber course',(0,-.17,5.79),(width,.34,.18),timber)
    elif side=='east':
        opening((.36373-.5)*width,.12,1.03,2.16,stone,timber)
        opening((.65164-.5)*width,.91,.87,1.30,stone,timber)
        block('Lantern wall bracket',(0,-.18,4.34),(.09,.34,.12),timber)
        for x in (-.58,.0,.58):
            block('High ventilator shadow',(x,-.049,3.67),(.20,.062,.30),timber)
    else:
        block('Quiet return pilaster',(0,-.12,height/2),(.32,.24,height),stone)
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.ops.object.join()
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    print(side,'triangles',sum(len(p.vertices)-2 for p in bpy.context.object.data.polygons))
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'rug-{side}.glb'),export_format='GLB',export_yup=True,use_selection=True)
