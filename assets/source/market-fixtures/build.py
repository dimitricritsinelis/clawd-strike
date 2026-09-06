"""Finite SH-L/SH-W and SP-D/SP-G/SP-A assemblies. Metres, Z up, front -Y."""
from pathlib import Path
import bpy,math,json,hashlib,shutil,numpy as np
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3];SOURCE=Path(__file__).resolve().parent;OUT=SOURCE/'exports';OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC';bpy.context.preferences.filepaths.save_version=0
material=bpy.data.materials.new('Market | timber paint spices ceramic bronze');material.use_nodes=True
nodes,links=material.node_tree.nodes,material.node_tree.links;bs=nodes.get('Principled BSDF');dependencies=[]
for suffix,socket in [('albedo','Base Color'),('roughness','Roughness'),('normal','Normal'),('metalness','Metallic')]:
    source=ROOT/f'apps/client/public/assets/models/environment/bazaar/props/textile_booth/booth_{"roughness" if suffix=="metalness" else suffix}.png'
    im=bpy.data.images.load(str(source),check_existing=False)
    if suffix!='albedo':im.colorspace_settings.name='Non-Color'
    im.scale(1024,512);pixels=np.array(im.pixels[:],dtype=np.float32).reshape(512,1024,4);yy,xx=np.mgrid[0:256,0:256]
    if suffix=='albedo':
        wood=pixels[:256,:256,:3].copy();gray=wood.mean(axis=2)
        pixels[256:512,:256,:3]=gray[:,:,None]*np.array((.45,1.05,.88))
        for tile,col in [(1,(.57,.16,.045)),(2,(.70,.41,.065)),(3,(.59,.43,.24)),(5,(.56,.44,.27)),(6,(.48,.37,.24)),(7,(.36,.25,.11))]:
            row,column=divmod(tile,4);noise=.035*np.sin(xx*1.13+yy*.7)*np.cos(yy*1.7)
            pixels[row*256:(row+1)*256,column*256:(column+1)*256,:3]=np.array(col)*(1+noise[:,:,None])
    elif suffix=='roughness':
        pixels[:,:,:3]=.85;pixels[256:,768:,:3]=.40;pixels[256:,:256,:3]=.72
    elif suffix=='normal':
        pixels[:,:,:3]=(.5,.5,1);pixels[256:,:256,:3]=np.array(im.pixels[:],dtype=np.float32).reshape(512,1024,4)[:256,:256,:3]
    else:
        pixels[:,:,:3]=0;pixels[256:,768:,:3]=.8
    im.pixels.foreach_set(pixels.ravel());im.filepath_raw=str(OUT/f'fixture-{suffix}.png');im.file_format='PNG';im.save();im.pack()
    tex=nodes.new('ShaderNodeTexImage');tex.image=im
    if suffix=='normal':
        normal=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs[socket])
    else:links.new(tex.outputs['Color'],bs.inputs[socket])
    dependencies.append({'file':str(source.relative_to(ROOT)),'source':'repo://assets/source/textile-booth/build.py','license':'Project-Original','md5':hashlib.md5(source.read_bytes()).hexdigest()})
shadow=bpy.data.materials.new('Opaque closed backing');shadow.use_nodes=True
shadow.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.025,.02,.015,1)
shadow.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.95
def uv(u,v,t):return (((t%8)%4+.012+u*.976)/4,((t%8)//4+.012+v*.976)/2)
objects=[]
def box(name,loc,dim,tile=0,bevel=.004):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(shadow if tile==8 else material)
    axis=max(range(3),key=lambda i:dim[i])
    for p in ob.data.polygons:
        other=max((i for i in range(3) if i!=axis and abs(p.normal[i])<.9),key=lambda i:dim[i],default=(axis+1)%3)
        for li in p.loop_indices:
            co=ob.data.vertices[ob.data.loops[li].vertex_index].co
            ob.data.uv_layers.active.data[li].uv=uv(co[other]/dim[other]+.5,co[axis]/dim[axis]+.5,tile)
    if bevel:
        mod=ob.modifiers.new('Eased arris','BEVEL');mod.width=bevel;mod.segments=1
        ob.modifiers.new('Joinery normals','WEIGHTED_NORMAL')
    objects.append(ob);return ob

def rod(name,a,b,r,tile=0):
    a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=(b-a).length,location=(a+b)/2)
    ob=bpy.context.object;ob.name=name;ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();ob.data.materials.append(shadow if tile==8 else material)
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


def window(woven=False):
    t=0 if woven else 4
    box('Closed opaque backing',(0,-.014,.825),(1.46,.028,1.55),8,0)
    for x in [-.745,.745]:box('Wall-seated jamb',(x,-.08,.825),(.11,.16,1.45),t)
    box('Shouldered head',(0,-.085,1.6),(1.60,.17,.10),t)
    box('Head moulding',(0,-.19,1.575),(1.49,.035,.036),t)
    box('Sill bed',(0,-.105,.045),(1.60,.21,.09),t)
    box('Dripped sill cap',(0,-.12,.10),(1.60,.24,.04),t)
    for x in [-.35,.35]:
        for dx in [-.305,.305]:box('Closed leaf stile',(x+dx,-.145,.825),(.065,.07,1.40),t)
        for z in [.158,1.492]:box('Closed leaf rail',(x,-.145,z),(.55,.07,.065),t)
        if woven:
            for i in range(9):box('Reed warp',(x-.244+i*.061,-.151,.825),(.027,.016,1.27),5,0)
            for i in range(16):box('Reed weft',(x,-.135,.21+i*.082),(.55,.014,.027),5,0)
        else:
            for i in range(14):
                ob=box('Downturned teal louvre',(x,-.145,.235+i*.091),(.55,.062,.062),t,0);ob.rotation_euler.x=.20
        for z in [.32,1.33]:box('Forged hinge',(x+(-.30 if x<0 else .30),-.19,z),(.11,.015,.038),7,.001)
    box('Leaf latch',(0,-.20,.79),(.16,.02,.028),7,.001)

def cabinet(drawers=False):
    for x in [-.78,.78]:
        for y in [-.445,-.055]:box('Cabinet foot',(x,y,.43),(.09,.09,.86))
        box('Closed end panel',(x,-.25,.46),(.045,.33,.69))
    box('Sealed cabinet back',(0,-.025,.44),(1.55,.035,.72))
    for z in [.12,.81]:box('Front rail',(0,-.46,z),(1.57,.06,.085))
    if drawers:
        for x in [-.51,0,.51]:
            for z in [.30,.62]:
                box('Closed spice drawer',(x,-.455,z),(.475,.044,.275));rod('Bronze drawer pull',(x,-.476,z),(x,-.490,z),.023,7)
    else:
        for x in [-.39,.39]:
            box('Recessed cupboard leaf',(x,-.445,.46),(.73,.038,.63))
            for dx in [-.335,.335]:box('Leaf stile',(x+dx,-.472,.46),(.033,.026,.60))
            rod('Cupboard pull',(x+(.22 if x<0 else -.22),-.472,.49),(x+(.22 if x<0 else -.22),-.489,.49),.018,7)
    for y in [-.44,-.315,-.19,-.065]:box('Separate counter board',(0,y,.875),(1.72,.12,.05))

def bin(x,tile):
    for dx in [-.22,.22]:box('Bin side',(x+dx,-.33,.965),(.025,.28,.13))
    for y in [-.465,-.195]:box('Bin rim',(x,y,.965),(.43,.025,.13))
    verts=[];uvs=[];nx,ny=12,8
    for j in range(ny+1):
        for i in range(nx+1):
            u,v=i/nx,j/ny;verts.append((x+(u-.5)*.41,-.33+(v-.5)*.245,.987+.009*math.sin(i*2.1+j*1.7)));uvs.append((u,v))
    faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)]
    cloth('Contained spice or grain surface',verts,faces,uvs,tile,0)

def jar(x,y,z,tile=6,r=.066,h=.18):
    profile=[(0,.75),(.06,1),(.63,1),(.83,.70),(.9,.72),(.94,.87),(1,.82)];verts=[];uvs=[];faces=[];n=14
    for k,(zz,rr) in enumerate(profile):
        for i in range(n):
            a=i/n*math.tau;verts.append((x+r*rr*math.cos(a),y+r*rr*math.sin(a),z+h*zz));uvs.append((i/n,k/(len(profile)-1)))
    for k in range(len(profile)-1):
        for i in range(n):a=k*n+i;b=k*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces += [tuple(reversed(range(n))),tuple((len(profile)-1)*n+i for i in range(n))]
    cloth('Closed lidded vessel',verts,faces,uvs,tile,0);rod('Lid knob',(x,y,z+h),(x,y,z+h+.018),.012,7)

def rear_frame():
    for x in [-.74,.74]:box('Rear shelf upright',(x,-.035,1.29),(.065,.07,.82))
    box('Rear top tie',(0,-.035,1.67),(1.49,.07,.06))

def spice_drawers():
    cabinet(True);rear_frame()
    for i,x in enumerate([-.54,0,.54]):bin(x,i+1)
    box('Supported tin shelf',(0,-.11,1.40),(1.47,.20,.045))
    for x in [-.53,0,.53]:jar(x,-.11,1.425,7,.068,.18)

def grain_balance():
    cabinet()
    for i,x in enumerate([-.54,0,.54]):bin(x,3 if i!=1 else 2)
    rod('Balance column',(0,-.105,.91),(0,-.105,1.64),.022,7)
    rod('Balance beam',(-.36,-.105,1.61),(.36,-.105,1.59),.018,7)
    box('Balance counter foot',(0,-.10,.925),(.23,.16,.05),7)
    for x,z in [(-.31,1.61),(.31,1.59)]:
        for dx in [-.06,.06]:rod('Pan suspension',(x+dx,-.105,z),(x+dx,-.105,z-.18),.005,7)
        jar(x,-.105,z-.215,7,.10,.036)

def apothecary():
    cabinet();rear_frame()
    for row,z in enumerate([1.17,1.47]):
        box('Supported sample shelf',(0,-.16,z),(1.47,.30,.04))
        for i,x in enumerate([-.57,-.19,.19,.57]):jar(x,-.15,z+.025,6 if (i+row)%2 else 7,.066,.18)

report={'source':'repo://assets/source/market-fixtures/build.py','license':'Project-Original','dependencies':dependencies,'models':{}}
for name,build,budget in [('shutter-louvered',lambda:window(False),2500),('shutter-woven',lambda:window(True),2500),('spice-drawers',spice_drawers,12000),('grain-balance',grain_balance,12000),('apothecary',apothecary,12000)]:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);objects.clear();build()
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')))
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True);bpy.context.view_layer.objects.active=ob
        for mod in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);ob.data.calc_loop_triangles();count=len(ob.data.loop_triangles);assert count<=budget,(name,count)
    bounds=[(min(v.co[i] for v in ob.data.vertices),max(v.co[i] for v in ob.data.vertices)) for i in range(3)]
    glb=OUT/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True)
    report['models'][name]={'triangles':count,'boundsM':bounds,'md5':hashlib.md5(glb.read_bytes()).hexdigest()}
(OUT/'provenance.json').write_text(json.dumps(report,indent=2)+'\n')
PUBLIC=ROOT/'apps/client/public/assets/models/environment/bazaar/props/market_fixtures';PUBLIC.mkdir(parents=True,exist_ok=True)
for path in OUT.iterdir():shutil.copy2(path,PUBLIC/path.name)
print(json.dumps(report))
