"""Finite S1 parcel roofs, setback room and assigned roof tie brackets.
Metres: source X east/Y north/Z up; export X east/Y up/Z north.
"""
from pathlib import Path
import bpy,bmesh,math,json,hashlib,shutil
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3];HERE=Path(__file__).resolve().parent;OUT=HERE/'exports';OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC';bpy.context.preferences.filepaths.save_version=0
SCALES=(1.25,2.,1.15,1.25,2.,.5,.5,.5);MATERIALS=[];dependencies=[]
for family in ['masonry','joinery']:
    mat=bpy.data.materials.new('Roof | '+family);mat.use_nodes=True;nodes,links=mat.node_tree.nodes,mat.node_tree.links;bs=nodes.get('Principled BSDF')
    for channel in ['albedo','normal','arm']:
        path=ROOT/f'apps/client/public/assets/models/environment/bazaar/props/b18_roof_access/b18 {family}_{channel}.png'
        target=OUT/path.name;shutil.copy2(path,target);im=bpy.data.images.load(str(target),check_existing=False)
        if channel!='albedo':im.colorspace_settings.name='Non-Color'
        im.pack();tex=nodes.new('ShaderNodeTexImage');tex.image=im
        if channel=='albedo':links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        elif channel=='normal':
            normal=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
        else:
            separate=nodes.new('ShaderNodeSeparateColor');links.new(tex.outputs['Color'],separate.inputs['Color']);links.new(separate.outputs['Green'],bs.inputs['Roughness']);links.new(separate.outputs['Blue'],bs.inputs['Metallic'])
        dependencies.append({'file':str(path.relative_to(ROOT)),'source':'repo://assets/source/b18-roof-access/build.py','license':'Project-Original','md5':hashlib.md5(path.read_bytes()).hexdigest()})
    MATERIALS.append(mat)
def box(name, lo, hi, tile=0, bevel=0, grain_axis=None):
    verts, faces, face_uv, vertex_index = [], [], [], {}
    scale = SCALES[tile]
    atlas_tile = tile % 4
    def vertex(co):
        key = tuple(round(value, 7) for value in co)
        if key not in vertex_index:
            vertex_index[key] = len(verts)
            verts.append(co)
        return vertex_index[key]
    def cuts(low, high):
        return [low] + [i * scale for i in range(math.floor(low / scale) + 1, math.ceil(high / scale))] + [high]
    for axis in range(3):
        remaining = [i for i in range(3) if i != axis]
        if grain_axis in remaining:
            remaining.remove(grain_axis)
            remaining.append(grain_axis)
        uaxis, vaxis = remaining
        us, vs = cuts(lo[uaxis], hi[uaxis]), cuts(lo[vaxis], hi[vaxis])
        for side in range(2):
            outward = Vector(tuple((-1 if side == 0 else 1) if i == axis else 0 for i in range(3)))
            for ua, ub in zip(us, us[1:]):
                for va, vb in zip(vs, vs[1:]):
                    coords = []
                    for u, v in [(ua, va), (ub, va), (ub, vb), (ua, vb)]:
                        co = [0, 0, 0]
                        co[axis] = (lo, hi)[side][axis]
                        co[uaxis], co[vaxis] = u, v
                        coords.append(co)
                    if (Vector(coords[1]) - Vector(coords[0])).cross(Vector(coords[2]) - Vector(coords[0])).dot(outward) < 0:
                        coords.reverse()
                    ui, vi = math.floor((ua + ub) / (2 * scale)), math.floor((va + vb) / (2 * scale))
                    faces.append([vertex(co) for co in coords])
                    face_uv.append([((atlas_tile % 2 + .008 + ((co[uaxis] / scale) - ui) * .984) / 2,
                                     (atlas_tile // 2 + .008 + ((co[vaxis] / scale) - vi) * .984) / 2) for co in coords])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(MATERIALS[tile // 4])
    uv = mesh.uv_layers.new(name='Metre-scaled PBR atlas')
    for poly, values in zip(mesh.polygons, face_uv):
        for loop, value in zip(poly.loop_indices, values):
            uv.data[loop].uv = value
    if bevel:
        mod = obj.modifiers.new('Small worked arris', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        mod.limit_method = 'ANGLE'
        mod.affect = 'EDGES'
        normal = obj.modifiers.new('Weighted planar normals', 'WEIGHTED_NORMAL')
        normal.keep_sharp = True
    return obj


def roof(width,length,base,parapet=.75,coping=.18,setback=.75):
    box('Full wall-top stone course',(0,0,base),(width,length,base+.12),1,.003)
    box('Setback flat roof slab',(setback,setback,base),(width-setback,length-setback,base+.26),2,.003)
    lo,hi=setback,width-setback; south,north=setback,length-setback
    for label,a,b in [('west',lo,lo+.22),('east',hi-.22,hi)]:
        box(label+' parapet',(a,south,base+.26),(b,north,base+.26+parapet),0,.003)
        box(label+' coping',(a-.05,south,base+.26+parapet),(b+.05,north,base+.26+parapet+coping),1,.004)
    for label,a,b in [('south',south,south+.22),('north',north-.22,north)]:
        box(label+' parapet',(lo+.22,a,base+.26),(hi-.22,b,base+.26+parapet),0,.003)
        box(label+' coping',(lo,a-.05,base+.26+parapet),(hi,b+.05,base+.26+parapet+coping),1,.004)

def parcel(length,rise):
    if rise:box('Supported parcel roof rise',(0,0,0),(4.8,length,rise),0)
    roof(4.8,length,rise)

def room():
    # 3.0 x 6.56 m northern east room. Both windows are closed and recessed.
    box('Front low wall',(0,0,0),(.20,6.56,.64),0)
    box('Front upper wall',(0,0,1.89),(.20,6.56,2.24),0)
    for a,b in [(0,1.35),(2.25,3.65),(4.55,6.56)]:box('Front window pier',(0,a,.64),(.20,b,1.89),0)
    box('Rear blank wall',(2.8,0,0),(3.,6.56,2.24),0)
    for a,b in [(0,.20),(6.36,6.56)]:box('Closed room end',(.20,a,0),(2.8,b,2.24),0)
    for y in [1.8,4.1]:
        box('Opaque window stop',(.15,y-.45,.64),(.19,y+.45,1.89),6)
        for a,b in [(y-.45,y-.37),(y+.37,y+.45)]:box('Timber window jamb',(.02,a,.64),(.16,b,1.89),4,.003)
        for a,b in [(.64,.72),(1.81,1.89)]:box('Timber window rail',(.02,y-.37,a),(.16,y+.37,b),4,.003)
        box('Closed window leaf',(.10,y-.37,.72),(.14,y+.37,1.81),4,.002)
        box('Window meeting stile',(.075,y-.02,.72),(.10,y+.02,1.81),4,.002)
        box('Seated stone sill',(0,y-.45,.61),(.25,y+.45,.67),1,.003)
    roof(3.,6.56,2.24,.30,.15,.10)

def brace(name,a,b,width=.10):
    a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cube_add(size=1,location=(a+b)*.5);ob=bpy.context.object;ob.name=name
    ob.dimensions=(width,width,(b-a).length);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();ob.data.materials.append(MATERIALS[1])
    for uv in ob.data.uv_layers.active.data:uv.uv=(.01+uv.uv.x*.48,.01+uv.uv.y*.48)

def tie(height):
    base=min(5.59,height-.07);cap=5.59-base;load=height-base;arm=max(load,cap+.07)
    box('Beam seated across two roof copings',(.45,-.07,cap),(3.75,.07,cap+.14),4,.004,0)
    box('Masonry-side post',(.48,-.07,cap+.07),(.62,.07,max(arm+.14,cap+.20)),4,.004,2)
    box('Outrigger carrying the rope end',(0,-.06,arm-.06),(.62,.06,arm+.06),4,.003,0)
    if height<5.66:box('Suspended tie hanger',(0,-.06,load-.07),(.12,.06,arm+.06),4,.003,2)
    else:brace('Roof bearing knee',(.04,0,load-.035),(1.05,0,cap+.10))
    box('Iron tie seat',(0,-.08,load-.045),(.025,.08,load+.045),5,.002)
    return base

report={'source':'repo://assets/source/bazaar-roofs/build.py','license':'Project-Original','sourceFrame':'X east/Y north/Z up; export X east/Y up/Z north','dependencies':dependencies,'models':{}}
jobs=[('spice-roof-south',lambda:parcel(6.12,.60),7.),('spice-roof-middle',lambda:parcel(5.76,1.40),7.),('spice-roof-north',lambda:parcel(3.24,0),7.),('spice-upper-room',room,4.76)]
for height in [4.9,5.55,5.9,5.95,6.1]:jobs.append((f'roof-tie-{round(height*100)}',lambda height=height:tie(height),min(5.59,height-.07)))
for name,build,base in jobs:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);build()
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE/(name+'.blend')))
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True);bpy.context.view_layer.objects.active=ob
        for mod in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bounds=[(min(v.co[i] for v in ob.data.vertices),max(v.co[i] for v in ob.data.vertices)) for i in range(3)]
    for v in ob.data.vertices:v.co.y=-v.co.y
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
    ob.data.calc_loop_triangles();count=len(ob.data.loop_triangles);assert count<=12000,(name,count)
    glb=OUT/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True)
    report['models'][name]={'triangles':count,'sourceBoundsM':bounds,'baseElevationM':base,'md5':hashlib.md5(glb.read_bytes()).hexdigest()}
(OUT/'provenance.json').write_text(json.dumps(report,indent=2)+'\n')
PUBLIC=ROOT/'apps/client/public/assets/models/environment/bazaar/props/bazaar_roofs';PUBLIC.mkdir(parents=True,exist_ok=True)
for path in OUT.iterdir():shutil.copy2(path,PUBLIC/path.name)
print(json.dumps(report))
