"""Caravan Court storage bays and quiet ashlar yard walls. Metres, Z up, street -Y; scanned CC0 PBR."""
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


def export(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
    bpy.ops.object.join()
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.export_scene.gltf(filepath=str(OUT/name),export_format='GLB',export_yup=True,use_selection=True)

for name,width,height in [('caravan-west.glb',15.12,4.5),('caravan-east-south.glb',4.86,4.9),('caravan-east-north.glb',5.94,4.9)]:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    stone=material('sandstone_blocks_05')
    plaster=material('painted_plaster_wall')
    wood=material('worn_planks')
    west='west' in name
    block('Ashlar wall skin',(0,-0.025,height/2),(width,0.05,height),stone,0)
    if west:
        # Closed double storage doors preserve the kit collision and wall plane.
        for bay in range(5):
            x=-width/2+(bay+0.5)*width/5
            for j in range(12):
                block('Storage door plank',(x-0.9+(j+0.5)*0.15,-0.07,1.32),(0.145,0.08,2.58),wood,0.005)
            for dx in [-1.0,1.0]:
                for row in range(6):
                    block('Worn storage jamb',(x+dx,-0.135,(row+0.5)*0.46),(0.20,0.27,0.446),stone)
            block('Storage lintel',(x,-0.14,2.86),(2.24,0.28,0.25),stone)
            for z in [0.5,1.95]:
                for dx in [-0.46,0.46]:
                    block('Door cross brace',(x+dx,-0.128,z),(0.83,0.05,0.115),wood,0.006)
            for dx in [-0.14,0.14]:
                block('Door pull',(x+dx,-0.185,1.28),(0.045,0.065,0.19),wood,0.007)
            block('Vent backing',(x,-0.065,3.66),(0.90,0.045,0.37),wood,0)
            for j in range(6):
                block('Vent stone mullion',(x-0.44+j*0.176,-0.115,3.66),(0.07,0.16,0.39),stone,0.006)
        block('Continuous storage head',(0,-0.17,3.1),(width,0.34,0.22),wood)
        for j in range(15):
            block('Head corbel',(-width/2+(j+0.5)*width/15,-0.17,2.90),(0.11,0.34,0.22),wood)
    else:
        # Broad plaster panels relieve the masonry, with shallow blind high vents.
        block('Repaired lime plaster',(0,-0.06,2.65),(width-0.56,0.07,3.8),plaster,0)
        for x in [-width*0.27,width*0.27]:
            block('Sealed high vent',(x,-0.11,3.8),(0.65,0.10,0.42),wood,0.01)
            for j in range(4):
                block('High vent slat',(x,-0.19,3.64+j*0.105),(0.64,0.055,0.04),wood,0.003)
            block('Vent lintel',(x,-0.12,4.08),(0.9,0.24,0.12),stone)
    for x in [-width/2+0.12,width/2-0.12]:
        block('End pier',(x,-0.10,height/2),(0.24,0.20,height),stone)
    n=round(width/0.65)
    for z,h,d in [(0.18,0.36,0.16),(height-0.15,0.22,0.30)]:
        for j in range(n):
            block('Coping or base block',(-width/2+(j+0.5)*width/n,-d/2,z),(width/n-0.012,d,h),stone)
    export(name)
