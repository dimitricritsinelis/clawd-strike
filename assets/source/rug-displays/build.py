"""RG-H hanging gallery and RG-R roll chest. Metres, Z up, front -Y.
Run Blender headlessly with --python this_file.py. Existing booth maps are read
as material dependencies only; the original booth source and exports stay locked.
"""
from pathlib import Path
import bpy, math, json, hashlib, shutil
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]; SOURCE=Path(__file__).resolve().parent
OUT=SOURCE/'exports';OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
bpy.context.preferences.filepaths.save_version=0
material=bpy.data.materials.new('Rugs | woven cloth and fitted timber');material.use_nodes=True
nodes=material.node_tree.nodes;links=material.node_tree.links;bs=nodes.get('Principled BSDF');deps=[]
for suffix,socket in [('albedo','Base Color'),('roughness','Roughness'),('normal','Normal')]:
    path=ROOT/f'apps/client/public/assets/models/environment/bazaar/props/textile_booth/booth_{suffix}.png'
    im=bpy.data.images.load(str(path),check_existing=False)
    if suffix!='albedo':im.colorspace_settings.name='Non-Color'
    im.scale(1024,512);im.filepath_raw=str(OUT/f'rug-{suffix}.png');im.file_format='PNG';im.save();im.pack()
    tex=nodes.new('ShaderNodeTexImage');tex.image=im
    if suffix=='normal':
        normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.5
        links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs[socket])
    else:links.new(tex.outputs['Color'],bs.inputs[socket])
    deps.append({'file':str(path.relative_to(ROOT)),'source':'repo://assets/source/textile-booth/build.py','license':'Project-Original','md5':hashlib.md5(path.read_bytes()).hexdigest(),'derivation':'Blender box-scale to 1024 x 512; source image untouched'})
def uv(u,v,t):return ((t%4+.012+u*.976)/4,(t//4+.012+v*.976)/2)
objects=[]
def box(name,loc,dim,tile=0,bevel=.004):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(material)
    axis=max(range(3),key=lambda i:dim[i])
    for p in ob.data.polygons:
        other=max((i for i in range(3) if i!=axis and abs(p.normal[i])<.9),key=lambda i:dim[i],default=(axis+1)%3)
        for li in p.loop_indices:
            co=ob.data.vertices[ob.data.loops[li].vertex_index].co
            ob.data.uv_layers.active.data[li].uv=uv(co[other]/dim[other]+.5,co[axis]/dim[axis]+.5,tile)
    if bevel:
        mod=ob.modifiers.new('Eased arris','BEVEL');mod.width=bevel;mod.segments=2
        ob.modifiers.new('Joinery normals','WEIGHTED_NORMAL')
    objects.append(ob);return ob

def rod(name,a,b,r,tile=0):
    a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=(b-a).length,location=(a+b)/2)
    ob=bpy.context.object;ob.name=name;ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();ob.data.materials.append(material)
    for q in ob.data.uv_layers.active.data:q.uv=uv(q.uv.x,q.uv.y,tile)
    objects.append(ob);return ob

def cloth(name,verts,faces,uvs,tile,thickness=.006):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();me.materials.append(material)
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);layer=me.uv_layers.new()
    for p in me.polygons:
        p.use_smooth=True
        for li in p.loop_indices:layer.data[li].uv=uv(*uvs[me.loops[li].vertex_index],tile)
    if thickness:
        mod=ob.modifiers.new('Woven edge thickness','SOLIDIFY');mod.thickness=thickness
    objects.append(ob);return ob

def chest():
    for x in [-.675,.675]:
        for y in [-.275,-.045]:box('Chest foot',(x,y,.34),(.07,.07,.68))
        box('Closed chest side',(x,-.16,.38),(.04,.22,.49))
    box('Closed back',(0,-.025,.36),(1.35,.035,.58))
    for z in [.12,.60]:box('Mortised chest rail',(0,-.295,z),(1.35,.05,.075))
    for x in [-.44,0,.44]:
        box('Framed recessed chest panel',(x,-.273,.36),(.405,.028,.40))
    for x in [-.64,-.22,.22,.64]:box('Chest stile',(x,-.29,.36),(.055,.055,.48))
    for y in [-.28,-.20,-.12,-.04]:box('Chest top board',(0,y,.675),(1.48,.078,.05))
    for x in [-.62,.62]:box('Rear rack upright',(x,-.025,1.50),(.06,.05,1.60))
    rod('Supported display top rail',(-.65,-.065,2.275),(.65,-.065,2.275),.025)
    for x in [-.61,.61]:
        rod('Rail tie bolt',(x,-.025,2.275),(x,-.083,2.275),.012,7)
        rod('Rack counter knee',(x,-.027,.88),(x,-.26,.705),.018)

def folded(x,y,z,tile):
    # Rounded folded noses, visible separate layers, seated on the chest top.
    for k in range(3):
        box('Folded rug layer',(x,y,z+.020+k*.034),(.52,.255,.036),tile,.015)
    for xx in [x-.19,x+.19]:rod('Tied folded stock',(xx,y-.132,z+.01),(xx,y-.132,z+.10),.004,5)

def gallery():
    chest();folded(-.34,-.16,.70,2);folded(.30,-.16,.70,1)
    for side,(x,y,tile,length) in enumerate([(-.28,-.13,1,1.19),(.28,-.19,2,1.10)]):
        verts=[];uvs=[];nx=14;ny=24
        for j in range(ny+1):
            t=j/ny
            for i in range(nx+1):
                u=i/nx;verts.append((x+(u-.5)*.62,y+.018*math.sin(u*math.tau*3+side)*(.3+.7*t),2.245-length*t));uvs.append((u,t))
        faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)]
        cloth('Overlapping hung rug',verts,faces,uvs,tile)
        for xx in [x-.25,x+.25]:rod('Rug suspension tie',(xx,-.065,2.295),(xx,y,2.22),.008,5)
        rod('Bound weighted hem',(x-.30,y,2.245-length),(x+.30,y,2.245-length),.008,tile)

def rolled(x,y,z,tile):
    verts=[];uvs=[];n=72
    for side in [0,1]:
        for i in range(n+1):
            a=i/n*math.pi*5;r=.028+.082*i/n
            verts.append((x-.27+side*.54,y+r*math.cos(a),z+r*math.sin(a)));uvs.append((side,i/n))
    faces=[(i,i+1,n+2+i,n+1+i) for i in range(n)]
    cloth('Spiral-wound rug bolt',verts,faces,uvs,tile,.006)

def roll_chest():
    chest();folded(0,-.16,.70,5)
    for i,z in enumerate([1.18,1.73]):
        box('Roll storage shelf',(0,-.16,z),(1.28,.30,.04))
        for x in [-.59,.59]:rod('Shelf knee',(x,-.025,z-.14),(x,-.26,z-.027),.014)
        for j,x in enumerate([-.31,.31]):rolled(x,-.16,z+.13,[1,2,3,4][i*2+j])

report={'license':'Project-Original','source':'repo://assets/source/rug-displays/build.py','sourceFrame':'+X across, +Y back, +Z up; rear Y=0','dependencies':deps,'models':{}}
for name,build in [('rug-gallery',gallery),('rug-roll-chest',roll_chest)]:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);objects.clear();build()
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')))
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True);bpy.context.view_layer.objects.active=ob
        for mod in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);ob.data.calc_loop_triangles()
    count=len(ob.data.loop_triangles);assert count<=8000,(name,count)
    bounds=[(min(v.co[i] for v in ob.data.vertices),max(v.co[i] for v in ob.data.vertices)) for i in range(3)]
    assert bounds[0][0]>=-.741 and bounds[0][1]<=.741 and bounds[1][0]>=-.322 and bounds[1][1]<=.001 and bounds[2][0]>=-.001 and bounds[2][1]<=2.31,bounds
    glb=OUT/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True)
    report['models'][name]={'triangles':count,'boundsM':bounds,'glbMd5':hashlib.md5(glb.read_bytes()).hexdigest()}
(OUT/'provenance.json').write_text(json.dumps(report,indent=2)+'\n')
PUBLIC=ROOT/'apps/client/public/assets/models/environment/bazaar/props/rug_displays';PUBLIC.mkdir(parents=True,exist_ok=True)
for path in OUT.iterdir():shutil.copy2(path,PUBLIC/path.name)
print(json.dumps(report))
