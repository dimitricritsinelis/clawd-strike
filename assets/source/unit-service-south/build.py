"""Service South plaster backs, high blind niches and service vents. Metres, Z up, street -Y; scanned CC0 PBR."""
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
            if texture in ('painted_plaster_wall', 'worn_plaster_wall'):
                multiply = nodes.new('ShaderNodeMixRGB')
                multiply.blend_type = 'MULTIPLY'
                multiply.inputs[0].default_value = 1
                multiply.inputs[2].default_value = (0.82, 0.66, 0.46, 1)
                links.new(tex.outputs['Color'], multiply.inputs[1])
                links.new(multiply.outputs['Color'], shader.inputs['Base Color'])
            else:
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
            scale = 4 if 'plaster' in mat.name else 2
            uv.data[li].uv = (co[axes[0]] / scale, co[axes[1]] / scale)
    if bevel:
        mod = ob.modifiers.new('Worn stone edges', 'BEVEL')
        mod.width, mod.segments = bevel, 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
plaster = material('painted_plaster_wall')
stone = material('sandstone_blocks_05')
wood = material('worn_planks')
wear = material('worn_plaster_wall')
width=15.8
# The thin skin and blind recesses leave the protected kit wall intact.
block('Blind plaster backing',(0,-0.018,2.45),(width,0.036,4.9),plaster,0)
# Three high blind niches, each at its authored quarter point.
centres=[-3.95,0,3.95]
last=-width/2
for x in centres:
    left,right=x-0.48,x+0.48
    block('Broad blank plaster',((last+left)/2,-0.125,2.45),(left-last,0.25,4.9),plaster,0)
    block('Plaster below blind niche',(x,-0.125,0.8),(0.96,0.25,1.6),plaster,0)
    block('Plaster above blind niche',(x,-0.125,4.0),(0.96,0.25,1.8),plaster,0)
    for dx in [-0.56,0.56]:
        block('Stone niche jamb',(x+dx,-0.16,2.35),(0.16,0.32,1.65),stone)
    for z in [1.55,3.17]:
        block('Niche sill lintel',(x,-0.17,z),(1.27,0.34,0.15),stone)
    last=right
block('End blank plaster',((last+width/2)/2,-0.125,2.45),(width/2-last,0.25,4.9),plaster,0)
# One closed maintenance hatch remains above the standing body envelope.
for i in range(6):
    block('Hatch plank',(-0.43+(i+0.5)*0.143,-0.045,2.44),(0.138,0.04,1.40),wood,0.003)
for z in [1.94,2.96]:
    block('Hatch brace',(0,-0.074,z),(0.84,0.04,0.09),wood,0.005)
# Louvered high vents over blank bays, with shallow stone reveals.
for x in [-6.2,2.0,6.15]:
    for dx in [-0.75,0.75]:
        block('Vent jamb',(x+dx,-0.29,3.97),(0.12,0.12,0.54),stone)
    for z in [3.68,4.25]:
        block('Vent lintel',(x,-0.29,z),(1.62,0.12,0.12),stone)
    for j in range(4):
        ob=block('Vent louver',(x,-0.29,3.78+j*0.115),(1.36,0.08,0.045),wood,0.003)
        ob.rotation_euler.x=0.35
# Worn low ashlar foundation, narrow enough to keep existing edge pottery clear.
for i in range(24):
    block('Base ashlar',(-width/2+(i+0.5)*width/24,-0.285,0.16),(width/24-0.014,0.10,0.32),stone)
for z,h,d in [(3.4,0.10,0.20),(4.74,0.14,0.24)]:
    for i in range(24):
        block('Weathered stone course',(-width/2+(i+0.5)*width/24,-0.285,z),(width/24-0.012,0.10,h),stone)
# Feather the existing scanned erosion into the plaster instead of hard patch edges.
wear.surface_render_method='DITHERED'
nodes,links=wear.node_tree.nodes,wear.node_tree.links
color=nodes.new('ShaderNodeVertexColor');color.layer_name='WeatherFade'
shader=nodes.get('Principled BSDF')
base=next(n for n in nodes if n.type=='TEX_IMAGE' and '_diff_' in n.image.name).outputs['Color']
mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
links.new(base,mix.inputs[1]);links.new(color.outputs['Color'],mix.inputs[2])
links.new(mix.outputs['Color'],shader.inputs['Base Color'])
links.new(color.outputs['Alpha'],shader.inputs['Alpha'])
for x,w,height in [(-7.0,1.4,0.88),(-4.4,1.9,0.65),(1.6,2.4,0.83),(6.8,1.6,0.85)]:
    vertices=[];faces=[]
    for j in range(5):
        for i in range(9):
            vertices.append((x-w/2+w*i/8,-0.254,0.29+height*j/4))
    for j in range(4):
        for i in range(8):
            a=j*9+i;faces.append((a,a+1,a+10,a+9))
    mesh=bpy.data.meshes.new('Scanned damp erosion')
    mesh.from_pydata(vertices,[],faces)
    ob=bpy.data.objects.new('Feathered base erosion',mesh);bpy.context.collection.objects.link(ob)
    mesh.materials.append(wear);uv=mesh.uv_layers.new()
    attr=mesh.color_attributes.new(name='WeatherFade',type='FLOAT_COLOR',domain='CORNER')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index;co=mesh.vertices[vi].co
            uv.data[li].uv=(co.x/2,co.z/2)
            i,j=vi%9,vi//9
            alpha=min(i/2,(8-i)/2,1)*[0.75,0.8,0.36,0.08,0][j]
            attr.data[li].color=(1,1,1,alpha)
# Small roof drainage outlet and wall-mounted downpipe.
for x in [-7.35]:
    block('Drain spout',(x,-0.17,4.56),(0.18,0.34,0.15),stone)
    block('Drain pipe',(x,-0.285,2.27),(0.065,0.075,4.34),wood,0.012)
    for z in [0.45,2.1,3.9]:
        block('Pipe wall strap',(x,-0.29,z),(0.14,0.10,0.045),wood,0.004)
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.ops.object.join()
bpy.context.scene.cursor.location=(0,0,0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.ops.export_scene.gltf(filepath=str(OUT/'service-south-east.glb'),export_format='GLB',export_yup=True,use_selection=True)

# The exporter omits the constant multiply; preserve it as the native glTF factor.
import json, struct
path=OUT/'service-south-east.glb'
data=path.read_bytes()
length=struct.unpack_from('<I',data,12)[0]
document=json.loads(data[20:20+length])
for mat in document['materials']:
    if any(name in mat['name'] for name in ['painted_plaster_wall','worn_plaster_wall']):
        mat['pbrMetallicRoughness']['baseColorFactor']=[0.82,0.66,0.46,1]
    if 'worn_plaster_wall' in mat['name']:
        mat['alphaMode']='BLEND'
        mat['doubleSided']=True
for mesh in document['meshes']:
    for primitive in mesh['primitives']:
        mat=document['materials'][primitive['material']]
        attributes=primitive['attributes']
        if 'worn_plaster_wall' in mat['name'] and 'COLOR_1' in attributes:
            attributes['COLOR_0']=attributes['COLOR_1']
        attributes.pop('COLOR_1',None)
payload=json.dumps(document,separators=(',',':')).encode()
payload+=b' '*((-len(payload))%4)
rest=data[20+length:]
path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(payload)+len(rest))+struct.pack('<II',len(payload),0x4e4f534a)+payload+rest)
