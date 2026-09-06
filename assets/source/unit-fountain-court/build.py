"""Fountain Court civic and merchant faces. Metres, Z up, street -Y; scanned CC0 PBR."""
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
            uv.data[li].uv = (co[axes[0]] / 2, co[axes[1]] / 2)
    if bevel:
        mod = ob.modifiers.new('Worn stone edges', 'BEVEL')
        mod.width, mod.segments = bevel, 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


def jar(x,y,z,h,r,mat):
    # Closed merchant storage jars: lathed shoulders, neck and thick lid.
    profile=[(0,r*0.72),(h*0.12,r),(h*0.65,r),(h*0.82,r*0.60),(h*0.94,r*0.53),(h,r*0.62)]
    verts=[]
    for zz,rr in profile:
        for n in range(12):
            a=math.tau*n/12
            verts.append((x+rr*math.cos(a),y+rr*math.sin(a),z+zz))
    faces=[]
    for row in range(len(profile)-1):
        for n in range(12):
            a=row*12+n;b=row*12+(n+1)%12
            faces.append((a,b,b+12,a+12))
    faces.extend([tuple(reversed(range(12))),tuple(range(60,72))])
    mesh=bpy.data.meshes.new('Storage jar');mesh.from_pydata(verts,[],faces);mesh.update()
    ob=bpy.data.objects.new('Lidded stock jar',mesh);bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    uv=mesh.uv_layers.new()
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            co=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=(co.x*2,co.z*2)

def arch(x,z,r,thickness,mat,depth=0.34):
    for i in range(20):
        a=i*math.pi/20+0.010
        b=(i+1)*math.pi/20-0.010
        vertices=[(x+rr*math.cos(t),y,z+rr*math.sin(t)) for y in (-0.035,-depth) for rr,t in ((r,a),(r,b),(r+thickness,b),(r+thickness,a))]
        mesh=bpy.data.meshes.new('Cut voussoir')
        mesh.from_pydata(vertices,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
        ob=bpy.data.objects.new('Cut voussoir',mesh);bpy.context.collection.objects.link(ob)
        mesh.materials.append(mat)
        uv=mesh.uv_layers.new()
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                co=mesh.vertices[mesh.loops[li].vertex_index].co
                angle=(a+b)/2
                u=(co.x-x)*math.cos(angle)+(co.z-z)*math.sin(angle)
                v=-(co.x-x)*math.sin(angle)+(co.z-z)*math.cos(angle)
                uv.data[li].uv=(u/1.3+i*0.137,v/1.3)

def framed_arch(x,base,r,spring,mat):
    arch(x,spring,r,0.34,mat)
    for dx in (-r-0.17,r+0.17):
        rows=math.ceil((spring-base)/0.32)
        for j in range(rows):
            h=(spring-base)/rows
            block('Jointed arch jamb',(x+dx,-0.17,base+(j+0.5)*h),(0.34,0.34,h-0.018),mat)
        block('Arch spring capital',(x+dx,-0.17,spring),(0.46,0.34,0.18),mat)

def window(x,z,width,height,stone,timber):
    block('Dark wood window backing',(x,-0.064,z),(width,0.075,height),timber)
    for dx in (-width/2-0.09,width/2+0.09):
        block('Window jamb',(x+dx,-0.16,z),(0.18,0.32,height+0.28),stone)
    for dz in (-height/2-0.07,height/2+0.07):
        block('Window lintel and sill',(x,-0.17,z+dz),(width+0.4,0.34,0.14),stone)
    for j in range(9):
        block('Screen vertical',(x-width/2+(j+0.5)*width/9,-0.14,z),(0.035,0.09,height),timber,0)
    for j in range(12):
        block('Screen horizontal',(x,-0.185,z-height/2+(j+0.5)*height/12),(width,0.04,0.032),timber,0)

for side,width,height in [('west',5.72,9.5),('west-south',2.72,9.5),('east',5.72,7),('east-north',2.72,7)]:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    stone=material('sandstone_blocks_05');plaster=material('worn_plaster_wall');timber=material('rough_pine_door')
    civic=side.startswith('west')
    masonry=material('white_sandstone_blocks_02')
    block('Cut stone civic wall' if civic else 'Weathered merchant lime wall',(0,-0.025,height/2),(width,0.05,height),masonry if civic else plaster)
    block('Dressed stone plinth',(0,-0.125,0.18),(width,0.25,0.36),stone)
    for x in (-width/2+0.14,width/2-0.14):
        for row in range(math.ceil(height/0.46)):
            h=height/math.ceil(height/0.46)
            block('Corner ashlar',(x,-0.1,(row+0.5)*h),(0.28,0.20,h-0.013),stone)
    if civic:
        radius=1.64 if width>3 else 0.77
        framed_arch(0,0.36,radius,3.3 if width>3 else 2.9,stone)
        window(0,7.05,1.03 if width>3 else 0.85,1.72,stone,timber)
        for z in (5.40,5.72,8.85,9.22):
            block('Civic string course',(0,-0.14,z),(width,0.34,0.16),stone)
        for j in range(round(width/0.24)):
            block('Carved frieze dentil',(-width/2+0.12+j*(width-0.24)/max(1,round(width/0.24)-1),-0.17,5.58),(0.13,0.22,0.19),stone,0.005)
    else:
        centers=[-1.38,1.38] if width>3 else [0]
        for x in centers:
            framed_arch(x,0.36,0.88,2.5,stone)
            window(x,5.03,1.62,1.7,stone,timber)
        block('Gallery floor beam',(0,-0.34,3.94),(width,0.68,0.18),timber)
        block('Gallery roof beam',(0,-0.43,6.34),(width,0.86,0.18),timber)
        for x in ([-2.56,0,2.56] if width>3 else [-1.10,1.10]):
            block('Gallery support',(x,-0.43,5.1),(0.14,0.16,2.3),timber)
            brace=block('Gallery corbel',(x,-0.33,3.70),(0.15,0.68,0.13),timber)
            brace.rotation_euler.x=0.55
        for z in (3.56,6.83):
            block('Merchant string course',(0,-0.13,z),(width,0.26,0.15),stone)
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
    bpy.ops.object.join();bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    print(side,'triangles',sum(len(p.vertices)-2 for p in bpy.context.object.data.polygons))
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'fountain-{side}.glb'),export_format='GLB',export_yup=True,use_selection=True)
