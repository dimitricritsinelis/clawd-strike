"""Spawn B receiving-court stone faces. Metres, Z up, street -Y; scanned CC0 PBR."""
import math
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
TEX = ROOT / 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5/sandstone_blocks_05'

def material(texture='sandstone_blocks_05'):
    mat = bpy.data.materials.new('Scanned ' + texture)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    for suffix, kind in [('diff', 'color'), ('nor_gl', 'normal'), ('arm', 'arm')]:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(TEX.parent / texture / f'{texture}_{suffix}_1k.jpg'))
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

for side, width in [('west', 2.64), ('east', 3.74)]:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    mat = material()
    # A thin complete backing seals the blind niche without changing the kit wall.
    block('Continuous stone face', (0, -0.035, 2.45), (width, 0.07, 4.9), mat)
    block('Low weathered plinth', (0, -0.10, 0.14), (width, 0.20, 0.28), mat)
    # Shallow niche frame and voussoirs, all inside the 0.35 m walking envelope.
    radius, spring, base = 0.48, 2.26, 0.75
    for x in [-0.60, 0.60]:
        for row in range(4):
            block('Niche jamb', (x, -0.14, base+(spring-base)*(row+0.5)/4), (0.22, 0.28, (spring-base)/4-0.015), mat)
    for i in range(13):
        angle = math.pi * (i+0.5)/13
        ob = block('Niche arch stone', (0.60*math.cos(angle), -0.14, spring+0.60*math.sin(angle)), (0.145, 0.28, 0.235), mat)
        ob.rotation_euler.y = math.pi/2-angle
    block('Niche sill', (0, -0.155, base-0.06), (1.43, 0.31, 0.13), mat)
    # Shallow stone brackets support a small ledge above the blind niche.
    for x in [-0.48, 0.48]:
        block('Ledge corbel', (x, -0.16, 3.05), (0.16, 0.32, 0.24), mat)
    block('Niche weather hood', (0, -0.19, 3.20), (1.58, 0.38, 0.12), mat)
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
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'spawn-b-{side}.glb'), export_format='GLB', export_yup=True, use_selection=True)

# A low receiving-court bench sits directly against a sealed wall, away from exits.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
mat = material('worn_planks')
for y in [-0.14, 0, 0.14]:
    block('Seat plank', (0, y, 0.46), (1.8, 0.13, 0.07), mat)
for x in [-0.7, 0.7]:
    for y in [-0.14, 0.14]:
        block('Bench leg', (x, y, 0.215), (0.085, 0.085, 0.43), mat)
    block('Seat brace', (x, 0, 0.385), (0.09, 0.42, 0.09), mat)
block('Long stretcher', (0, 0, 0.19), (1.48, 0.075, 0.09), mat)
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.ops.object.join()
bpy.context.scene.cursor.location=(0,0,0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.ops.export_scene.gltf(filepath=str(OUT / 'spawn-b-bench.glb'), export_format='GLB', export_yup=True, use_selection=True)

# Small supported domestic shade; mount above door head with no low posts.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
wood = material('worn_planks')
cloth = material('fabric_leather_02')
cloth.use_nodes=True
cloth.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=0.9
for x in [-0.95, 0.95]:
    block('Wall receiver', (x, 0, 0.12), (0.11, 0.12, 0.45), wood)
    block('Shade arm', (x, -0.53, 0.22), (0.075, 1.18, 0.075), wood)
    ob=block('Diagonal brace', (x, -0.33, -0.02), (0.065, 0.82, 0.065), wood)
    ob.rotation_euler.x=-0.53
block('Front shade rail', (0,-1.06,0.22), (2.12,0.07,0.07), wood)
vertices=[]
faces=[]
for j in range(9):
    t=j/8
    for i in range(25):
        x=-1.09+2.18*i/24
        vertices.append((x,-1.13*t,0.26-0.18*math.sin(math.pi*t)+0.018*math.cos(i*math.pi/2)))
for j in range(8):
    for i in range(24):
        a=j*25+i
        faces.append((a,a+1,a+26,a+25))
mesh=bpy.data.meshes.new('Draped canvas')
mesh.from_pydata(vertices,[],faces)
ob=bpy.data.objects.new('Draped canvas',mesh)
bpy.context.collection.objects.link(ob)
ob.data.materials.append(cloth)
uv=mesh.uv_layers.new()
for poly in mesh.polygons:
    for li in poly.loop_indices:
        v=mesh.vertices[mesh.loops[li].vertex_index].co
        uv.data[li].uv=(v.x/2,v.y/2)
bpy.context.view_layer.objects.active=ob
ob.select_set(True)
mod=ob.modifiers.new('Cloth thickness','SOLIDIFY')
mod.thickness=0.005
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.join()
bpy.context.scene.cursor.location=(0,0,0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.ops.export_scene.gltf(filepath=str(OUT/'spawn-b-shade.glb'),export_format='GLB',export_yup=True,use_selection=True)

# A setback upper room makes the receiving court part of the city skyline.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
plaster=material('plastered_wall_04')
wood=material('rough_pine_door')
block('Setback room', (0,1.2,1.15), (3.2,2.4,2.3), plaster)
block('Roof cap', (0,1.2,2.34), (3.3,2.5,0.12), plaster)
for x in [-1.52,1.52]:
    block('Stepped parapet side', (x,1.2,2.52), (0.16,2.4,0.35), plaster)
block('Front parapet', (0,0.02,2.49), (3.2,0.16,0.28), plaster)
block('Rear parapet', (0,2.38,2.65), (3.2,0.16,0.6), plaster)
for x in [-0.76,0.76]:
    block('Closed wood shutter',(x,-0.045,1.35),(0.63,0.09,1.08),wood)
    for dx in [-0.38,0.38]:
        block('Window jamb',(x+dx,-0.07,1.35),(0.12,0.14,1.35),plaster)
    for z in [0.72,1.98]:
        block('Window sill lintel',(x,-0.09,z),(0.88,0.18,0.12),plaster)
    for z in [0.99,1.72]:
        block('Shutter crossbar',(x,-0.105,z),(0.60,0.045,0.065),wood)
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.ops.object.join()
bpy.context.scene.cursor.location=(0,0,0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.ops.export_scene.gltf(filepath=str(OUT/'spawn-b-upper-room.glb'),export_format='GLB',export_yup=True,use_selection=True)
