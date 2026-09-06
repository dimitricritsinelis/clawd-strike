"""Textile Arcade merchant faces. Metres, Z up, street -Y; scanned CC0 PBR."""
import math
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
TEX = ROOT / 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5'

def material(asset, tint=None):
    mat = bpy.data.materials.new(asset)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    for suffix, kind in [('diff', 'color'), ('nor_gl', 'normal'), ('arm', 'arm')]:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(TEX / asset / f'{asset}_{suffix}_1k.jpg'))
        tex.image.pack()
        if kind == 'color':
            if tint:
                mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*tint,1)
                links.new(tex.outputs['Color'],mix.inputs[1]);links.new(mix.outputs[0],shader.inputs['Base Color'])
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
            uv.data[li].uv = (co[axes[0]] / (5 if mat.name.startswith('worn_plaster') else 2), co[axes[1]] / (5 if mat.name.startswith('worn_plaster') else 2))
    if bevel:
        mod = ob.modifiers.new('Worn stone edges', 'BEVEL')
        mod.width, mod.segments = bevel, 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


def mesh_object(name, verts, faces, mat):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(mat)
    uv=mesh.uv_layers.new()
    for p in mesh.polygons:
        for li in p.loop_indices:
            co=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=(co.x/2,co.z/2)
    return ob

def arch(cx, mat):
    for j in range(20):
        a=math.pi*j/20+0.009;b=math.pi*(j+1)/20-0.009
        verts=[]
        for y in (-0.315,-0.065):
            for r,t in [(1.03,a),(1.03,b),(1.28,b),(1.28,a)]:
                verts.append((cx+r*math.cos(t),y,2.12+r*math.sin(t)))
        ob=mesh_object('Jointed radial arch stone',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
        bpy.context.view_layer.objects.active=ob
        mod=ob.modifiers.new('Eroded stone corners','BEVEL');mod.width=.018;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
    for dx in (-1.16,1.16):
        for row in range(7):
            block('Cut stone jamb',(cx+dx,-0.16,0.16+row*0.303),(0.25,0.30,0.291),mat)
        block('Arch spring impost',(cx+dx,-0.17,2.12),(0.38,0.32,0.14),mat)

def curtain(cx, mat, phase):
    # Regular pleats in geometry, scanned fabric surface. No generated textures.
    verts=[]
    for row in range(9):
        v=row/8
        for col in range(49):
            u=col/48
            verts.append((cx+(u-.5)*1.93,-0.082-0.07*(.5+.5*math.sin(u*math.tau*8)),1.14+v*1.71+0.035*math.cos(u*math.tau*4+phase)*(1-v)))
    faces=[]
    for row in range(8):
        for col in range(48):
            n=row*49+col;faces.append((n,n+1,n+50,n+49))
    ob=mesh_object('Hanging cloth inside trade arch',verts,faces,mat)
    for p in ob.data.polygons:p.use_smooth=True
    bpy.context.view_layer.objects.active=ob
    mod=ob.modifiers.new('Cloth thickness','SOLIDIFY');mod.thickness=.008;bpy.ops.object.modifier_apply(modifier=mod.name)

for side,height in [('west',7.0),('east',4.5)]:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    stone=material('white_sandstone_blocks_02');plaster=material('worn_plaster_wall');timber=material('rough_pine_door');fabric=material('fabric_leather_02')
    shadow=material('rough_pine_door',(.14,.12,.10));indigo=material('fabric_leather_02',(.20,.38,.52));madder=material('fabric_leather_02',(.65,.16,.10))
    width=13.44
    block('Weathered lime wall face',(0,-.018,height/2),(width,.036,height),plaster)
    block('Stone foot course',(0,-.11,.14),(width,.22,.28),stone)
    for z in (3.57,height-.13):block('Continuous carved stringcourse',(0,-.145,z),(width,.29,.20),stone)
    for i,x in enumerate([-4.82,1.6066666667,4.82]):
        block('Closed shadowed shop backing',(x,-.048,1.5),(2.06,.052,3.0),shadow)
        curtain(x,[fabric,indigo,madder][i],i)
        block('Display counter front',(x,-.245,.55),(2.0,.15,.82),timber)
        block('Display counter top',(x,-.18,1.0),(2.05,.34,.09),timber)
        for dx in (-.93,0,.93):block('Panel stile',(x+dx,-.327,.55),(.065,.035,.78),timber)
        for z in (.20,.91):block('Panel rail',(x,-.327,z),(1.96,.035,.06),timber)
        for j in range(7):
            xx=x-.81+j*.27;hh=.44+.16*((j+i)%3)
            bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.112,depth=hh,location=(xx,-.20,1.05+hh/2))
            bolt=bpy.context.object;bolt.name='Upright rolled cloth bolt';bolt.data.materials.append([fabric,indigo,madder][(j+i)%3])
            for poly in bolt.data.polygons:poly.use_smooth=True
        block('Display upper shelf',(x,-.18,2.36),(1.98,.32,.065),timber)
        for j in range(6):
            xx=x-.79+j*.31
            for k in range(2+(j%2)):block('Folded cloth stock',(xx,-.19,2.43+k*.065),(.27,.27,.06),[fabric,indigo,madder][(j+k+i)%3],.018)
        arch(x,stone)
        block('Lintel cornice',(x,-.17,3.48),(2.75,.32,.16),stone)
        # Supported awnings above head height keep the original walking envelope clear.
        depth=1.13
        verts=[]
        for row in range(7):
            t=row/6
            for col in range(25):
                u=col/24
                verts.append((x+(u-.5)*2.8,-.08-depth*t,3.65-.26*t-.12*math.sin(math.pi*t)*math.sin(math.pi*u)))
        faces=[]
        for row in range(6):
            for col in range(24):
                n=row*25+col;faces.append((n,n+25,n+26,n+1))
        ob=mesh_object('Tailored cloth shade',verts,faces,fabric)
        bpy.context.view_layer.objects.active=ob
        mod=ob.modifiers.new('Shade hem thickness','SOLIDIFY');mod.thickness=.018;bpy.ops.object.modifier_apply(modifier=mod.name)
        block('Awning ledger',(x,-.12,3.66),(2.85,.24,.12),timber)
        block('Shade outer rail',(x,-1.2,3.38),(2.85,.10,.12),timber)
        for dx in (-1.15,1.15):
            brace=block('Timber shade bracket',(x+dx,-.64,3.12),(.09,math.hypot(1.13,.48),.09),timber)
            brace.rotation_euler.x=-math.atan2(.48,1.13)
        if side=='west':
            # Preserve the mounted original screen asset, frame it at its existing axis.
            block('Upper recessed timber',(x,-.048,4.97),(1.58,.05,1.67),timber)
            for dx in (-.87,.87):block('Upper dressed jamb',(x+dx,-.14,4.97),(.18,.27,1.80),stone)
            for z in (4.12,5.82):block('Upper dressed sill',(x,-.155,z),(1.92,.30,.17),stone)
    for x in (-6.44,-1.6066666667,6.44):
        block('Arcade masonry pier',(x,-.12,height/2),(.34,.24,height),stone)
        for z in (.20,3.42):block('Pier capital',(x,-.165,z),(.52,.33,.20),stone)
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.ops.object.join()
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    print(side,'triangles',sum(len(p.vertices)-2 for p in bpy.context.object.data.polygons))
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'textile-{side}.glb'),export_format='GLB',export_yup=True,use_selection=True)
