"""Spice Street merchant faces. Metres, Z up, street -Y; scanned CC0 PBR."""
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

for side, height in [('west', 7.0), ('east', 4.5)]:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    stone=material('sandstone_blocks_05')
    plaster=material('beige_wall_002')
    timber=material('rough_pine_door')
    clay=material('brick_4_desert')
    cloth=material('fabric_leather_02')
    width=15.12
    block('Weathered plaster backing',(0,-0.025,height/2),(width,0.05,height),plaster)
    block('Stone plinth',(0,-0.12,0.14),(width,0.24,0.28),stone)
    # Five complete shallow shop/door assemblies retain authored axes.
    for i,x in enumerate([-5.76,-2.88,0,2.88,5.76]):
        shop = (side=='west' and i in (0,2,3)) or (side=='east' and i in (1,3))
        bw=2.06 if shop else 1.25
        block('Timber recess back',(x,-0.065,1.4),(bw,0.06,2.5),timber)
        for dx in (-bw/2-0.12,bw/2+0.12):
            for row in range(8):
                block('Jointed stone jamb',(x+dx,-0.145,0.22+row*0.32),(0.22,0.29,0.31),stone)
        block('Lintel',(x,-0.145,2.8),(bw+0.5,0.29,0.25),stone)
        block('Timber head',(x,-0.195,2.57),(bw,0.14,0.17),timber)
        if shop:
            for z in (0.85,1.4,1.95):
                block('Merchandise shelf',(x,-0.205,z),(bw,0.25,0.065),timber)
                for j in range(7):
                    jar(x-0.81+j*0.27,-0.21,z+0.035,0.29+0.03*((j+i)%3),0.105,clay)
            for dx in (-bw/2+0.04,bw/2-0.04):
                block('Shelf upright',(x+dx,-0.20,1.3),(0.08,0.26,2.38),timber)
            block('Counter front',(x,-0.245,0.49),(bw,0.09,0.68),timber)
            block('Counter top',(x,-0.17,0.86),(bw+0.1,0.34,0.095),timber)
            for dx in (-0.7,0,0.7):
                block('Counter panel stile',(x+dx,-0.30,0.5),(0.06,0.06,0.64),timber)
        else:
            for j in range(8):
                block('Closed door plank',(x-bw/2+bw/8*(j+0.5),-0.115,1.36),(bw/8-0.009,0.09,2.35),timber)
            for z in (0.5,2.17):
                block('Door cross rail',(x,-0.18,z),(bw,0.07,0.09),timber)
        # Fabric shade is seated on a wall ledger and an outer supported rail.
        depth=1.65 if shop else 1.25
        verts=[]
        for row in range(7):
            t=row/6
            for col in range(13):
                u=col/12
                verts.append((x+(u-0.5)*2.65,-0.06-depth*t,3.40-0.40*t-0.12*math.sin(math.pi*u)*math.sin(math.pi*t)))
        faces=[]
        for row in range(6):
            for col in range(12):
                n=row*13+col;faces.append((n,n+13,n+14,n+1))
        mesh=bpy.data.meshes.new('Tailored shade');mesh.from_pydata(verts,[],faces);mesh.update()
        ob=bpy.data.objects.new('Supported fabric awning',mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(cloth)
        uv=mesh.uv_layers.new()
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                co=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(co.x/0.8,co.y/0.8)
        bpy.context.view_layer.objects.active=ob
        mod=ob.modifiers.new('Hem thickness','SOLIDIFY');mod.thickness=0.025;bpy.ops.object.modifier_apply(modifier=mod.name)
        block('Awning wall ledger',(x,-0.11,3.4),(2.7,0.22,0.12),timber)
        block('Awning outer rail',(x,-depth,2.97),(2.7,0.10,0.12),timber)
        block('Fabric hanging hem',(x,-depth-0.03,2.88),(2.65,0.035,0.18),cloth,0.005)
        for dx in (-1.12,1.12):
            # A diagonal timber runs from the wall corbel to the outer rail.
            rise=0.39
            brace=block('Shade diagonal bracket',(x+dx,-depth/2,2.775),(0.085,math.hypot(depth,rise),0.085),timber)
            brace.rotation_euler.x=-math.atan2(rise,depth)
        if side=='west':
            z=4.64
            block('Upper stone sill',(x,-0.17,z-0.84),(1.65,0.34,0.15),stone)
            block('Upper shutter back',(x,-0.07,z),(1.35,0.09,1.5),timber)
            for dx in (-0.69,0,0.69):
                block('Window stile',(x+dx,-0.15,z),(0.085,0.17,1.57),timber)
            for dz in (-0.76,0.76):
                block('Window rail',(x,-0.15,z+dz),(1.46,0.17,0.09),timber)
            for j in range(12):
                slat=block('Shutter louver',(x,-0.15,z-0.65+j*0.118),(1.29,0.10,0.065),timber,0.005)
                slat.rotation_euler.x=0.25
    for x in (-6.95,-4.2,-1.5,1.5,4.2,6.9):
        jar(x,-0.19,0.28,0.52,0.145,clay)
    for x in (-7.38,-4.32,1.44,7.38):
        block('Parcel stone seam',(x,-0.085,height/2),(0.28,0.17,height),stone)
    for z in (3.48,height-0.12):
        block('Continuous dressed string course',(0,-0.135,z),(width,0.27,0.16),stone)
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
    bpy.ops.object.join()
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    print(side, 'triangles',sum(len(p.vertices)-2 for p in bpy.context.object.data.polygons))
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'spice-{side}.glb'),export_format='GLB',export_yup=True,use_selection=True)
