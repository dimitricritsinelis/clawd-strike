"""Original textile booth. Run: blender -b --factory-startup --python assets/source/textile-booth/build.py
Metres, Z up, front -Y. Original cloth; timber reuses the existing CC0 Poly Haven wooden_table_02 texture. Reference (design only):
https://www.sewatelierm.com/wp-content/uploads/2022/07/630DC8BD-5477-43A2-AA5B-E8F76FE4E1FA-1024x683.jpeg
"""
import bpy, math, json, hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'apps/client/public/assets/models/environment/bazaar/props/textile_booth'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
# One original PBR atlas. Analytic weave/grain, with no unseeded variation.
N=512; size=2048
wood_path=ROOT/'apps/client/public/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_diff_1k.jpg'
wood_image=bpy.data.images.load(str(wood_path))
wood_pixels=np.array(wood_image.pixels[:]).reshape(1024,1024,4)
wood_crop=wood_pixels[234:374,40:550,:3].transpose(1,0,2)
wood_crop=wood_crop[np.linspace(0,509,N).astype(int)[:,None],np.linspace(0,139,N).astype(int)[None,:]]
albedo=np.ones((1024,2048,4),dtype=np.float32); normal=albedo.copy(); rough=albedo.copy()
y,x=np.mgrid[0:N,0:N]; u=x/(N-1); v=y/(N-1)
colors=[(.37,.235,.13),(.18,.28,.32),(.49,.22,.16),(.62,.43,.20),(.32,.40,.32),(.73,.65,.49),(.76,.71,.58),(.16,.14,.11)]
for tile,col in enumerate(colors):
 weave=.025*np.sin(x*math.pi)*np.cos(y*math.pi/2)+.018*np.sin(x*1.53)+.018*np.cos(y*1.51)
 h=.012*np.sin(x*1.53)*np.cos(y*1.51)
 c=np.broadcast_to(np.array(col),(N,N,3)).copy()
 if tile==0:
  grain=np.sin(u*185+3*np.sin(v*10)+np.sin(v*28+u*8))
  fine=np.sin(u*760+2*np.sin(v*19))
  c=wood_crop*.82
  h=.003*fine
 elif tile in (1,2,3,4,5):
  # Woven borders and small stepped diamonds; broad quiet fields remain.
  border=(abs(u-.08)<.018)|(abs(u-.92)<.018)
  line=(abs(u-.115)<.004)|(abs(u-.885)<.004)
  diamond=(abs((u*6)%1-.5)+abs((v*7)%1-.5)<.16)
  c[border]=np.array((.72,.62,.43)); c[line]=np.array((.22,.20,.16))
  if tile in (1,2,3): c[diamond]=np.array((.66,.58,.42))
  if tile==4: c[border]=np.array((.48,.52,.41))
  c*= (1+weave)[...,None]
 elif tile==6:
  stripe=(abs(u-.10)<.013)|(abs(u-.90)<.013)
  c[stripe]=(.29,.37,.35); c*=(1+weave+.025*np.sin(v*9))[...,None]
 gx,gy=np.gradient(h)
 nn=np.stack((-gy*2,-gx*2,np.ones_like(h)),axis=2); nn/=np.linalg.norm(nn,axis=2)[...,None]
 row,colid=divmod(tile,4); sl=(slice(row*N,(row+1)*N),slice(colid*N,(colid+1)*N))
 albedo[sl][:,:,:3]=np.clip(c,0,1); normal[sl][:,:,:3]=nn*.5+.5
 rough[sl][:,:,:3]=.78 if tile==0 else .94 if tile!=7 else .63

def image(name,pixels,noncolor=False):
 im=bpy.data.images.new(name,width=2048,height=1024,alpha=False)
 if noncolor: im.colorspace_settings.name='Non-Color'
 im.pixels.foreach_set(pixels.ravel()); im.filepath_raw=str(OUT/(name+'.png')); im.file_format='PNG'; im.save(); im.pack(); return im
mat=bpy.data.materials.new('Booth | original woven cloth and timber'); mat.use_nodes=True
nodes=mat.node_tree.nodes; links=mat.node_tree.links; bs=nodes.get('Principled BSDF')
for name,data,socket,noncolor in [('booth_albedo',albedo,'Base Color',False),('booth_roughness',rough,'Roughness',True),('booth_normal',normal,'Normal',True)]:
 tex=nodes.new('ShaderNodeTexImage'); tex.image=image(name,data,noncolor)
 if socket=='Normal':
  nm=nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value=.5; links.new(tex.outputs['Color'],nm.inputs['Color']); links.new(nm.outputs['Normal'],bs.inputs[socket])
 else: links.new(tex.outputs['Color'],bs.inputs[socket])

def uv_tile(u,v,t):
 return ((t%4+(0.012+u*.976))/4,(t//4+(0.012+v*.976))/2)
def mesh(name,verts,faces,uvs,tile,smooth=False):
 me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update(); ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob); me.materials.append(mat)
 uv=me.uv_layers.new()
 for poly in me.polygons:
  poly.use_smooth=smooth
  for li in poly.loop_indices: uv.data[li].uv=uv_tile(*uvs[me.loops[li].vertex_index],tile)
 return ob

def box(name,loc,dim,tile=0,bevel=.009):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); ob=bpy.context.object; ob.name=name; ob.dimensions=dim; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 ob.data.materials.append(mat)
 # Grain follows each part's longest dimension rather than world height.
 axis=max(range(3),key=lambda i:dim[i]); uv=ob.data.uv_layers.active
 for p in ob.data.polygons:
  other=max((i for i in range(3) if i!=axis and abs(p.normal[i])<.9),key=lambda i:dim[i],default=(axis+1)%3)
  for li in p.loop_indices:
   co=ob.data.vertices[ob.data.loops[li].vertex_index].co
   uv.data[li].uv=uv_tile(co[other]/dim[other]+.5,co[axis]/dim[axis]+.5,tile)
 if bevel:
  mod=ob.modifiers.new('Hand eased edges','BEVEL');mod.width=bevel;mod.segments=2
  ob.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 return ob

def rod(name,a,b,r,tile=7):
 a,b=Vector(a),Vector(b); bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=(b-a).length,location=(a+b)/2); ob=bpy.context.object;ob.name=name;ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();ob.data.materials.append(mat)
 for q in ob.data.uv_layers.active.data:q.uv=uv_tile(q.uv.x,q.uv.y,tile)
 return ob

def ribbon(name,path,width,tile,phase=0,folds=.012,nx=16):
 verts=[];uvs=[]; ny=len(path)-1
 for j,(yy,zz) in enumerate(path):
  for i in range(nx+1):
   xx=(i/nx-.5)*width
   ripple=folds*math.sin(i/nx*math.pi*8+phase)*(math.sin(j/ny*math.pi*.8)+.18)
   verts.append((xx,yy+ripple,zz+.003*math.sin(i*.6+j*.4)));uvs.append((i/nx,j/ny))
 faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)]
 ob=mesh(name,verts,faces,uvs,tile,True); sol=ob.modifiers.new('Woven thickness','SOLIDIFY');sol.thickness=.006; return ob

# Raised-panel counter, fully framed. Front projection is 0.23 m.
for xx in [-.82,.82]:
 for yy in [-.12,.29]:box('Counter leg with exposed tenon',(xx,yy,.43),(.09,.09,.86))
for z in [.13,.73]:box('Mortised front rail',(0,-.155,z),(1.66,.07,.10))
for xx in [-.54,0,.54]:
 box('Recessed panel',(xx,-.115,.43),(.49,.035,.49),bevel=.006)
 for edge in [-1,1]:box('Panel moulding',(xx+edge*.238,-.145,.43),(.018,.025,.48),bevel=.004)
for xx in [-.79,-.27,.27,.79]:box('Panel stile',(xx,-.157,.43),(.06,.06,.55))
for yy in [-.18,-.03,.12,.27]:box('Separate counter top board',(0,yy,.855),(1.84,.145,.065))
for xx in [-.82,.82]:
 for yy in [-.155,.29]:
  for z in [.15,.73]:rod('Dark timber drawbore peg',(xx,yy-.04,z),(xx,yy-.047,z),.011,0)
for xx in [-.82,.82]:box('Counter side panel',(xx,.07,.43),(.04,.35,.52))
# Two rear shelves and their supporting cheeks, contained within the stone reveal.
for xx in [-.70,.70]:box('Shelf side cheek',(xx,.28,1.42),(.055,.23,1.14))
for z in [1.06,1.55]:box('Stock shelf',(0,.235,z),(1.45,.29,.05))
# Cloth folded back on itself, compressed layers with rounded fold noses.
def folded(name,xx,yy,z,w,d,tile,phase):
 for layer in range(3):
  h=.019; path=[]
  # closed racetrack section, front curved fold and two flat layers
  for k in range(5):
   a=math.pi/2+math.pi*k/4;path.append((yy-d/2+h+h*math.cos(a),z+layer*.033+h+h*math.sin(a)))
  path += [(yy+d/2,z+layer*.033),(yy+d/2,z+layer*.033+2*h),path[0]]
  ob=ribbon(name+' folded layer',path,w,tile,phase,.003,nx=8);ob.location.x=xx
for shelf,z in enumerate([1.085,1.575]):
 for i,xx in enumerate([-.43,.04,.46]):
  for k in range(2 if i!=1 else 3):folded('Stored folded cotton',xx,.225,z+k*.101,.38 if i!=1 else .39,.235,(i+shelf*2+k)%5+1,k*.7)
for k in range(3):folded('Counter linen stack',-.52,-.025,.89+k*.10,.51,.31,[5,2,5][k],k)
# A full sample cloth hangs over the counter, with a rounded turn, weighted fall and uneven hem.
path=[(.27-.43*i/14,.898) for i in range(15)]
path += [(-.16-.075*math.sin(i/8*math.pi/2),.823+.075*math.cos(i/8*math.pi/2)) for i in range(1,9)]
path += [(-.235-.008*math.sin(i*.5),.823-.53*i/24) for i in range(1,25)]
ob=ribbon('Indigo sample draped over counter',path,.51,1,1,.016);ob.location.x=.19
# Hanging samples from a real rail below the arch spring.
rod('Display rail',(-.68,.05,2.22),(.68,.05,2.22),.018,0)
for xx in [-.64,.64]:rod('Rail wall arm',(xx,.35,2.22),(xx,.04,2.22),.013)
for i,xx in enumerate([-.46,.02,.46]):
 path=[(.05+.045*math.cos(k/8*math.pi),2.20+.045*math.sin(k/8*math.pi)) for k in range(9)]
 path += [(.005-.022*math.sin(k*.18),2.20-[.92,.84,.99][i]*k/24) for k in range(1,25)]
 ob=ribbon('Hanging sample with gathered folds',path,[.40,.36,.42][i],[2,5,4][i],i*.9,.018);ob.location.x=xx
# A fabric roll has an actual spiral cross section and visible layered ends.
def roll(xx,yy,z,tile):
 verts=[];uvs=[];steps=96
 for side in [0,1]:
  for k in range(steps+1):
   a=k/steps*math.pi*5;r=.02+.061*k/steps
   verts.append((xx-.18+side*.36,yy+r*math.cos(a),z+r*math.sin(a)));uvs.append((side,k/steps))
 faces=[(k,k+1,steps+2+k,steps+1+k) for k in range(steps)]
 ob=mesh('Spiral wound fabric bolt',verts,faces,uvs,tile,True);sol=ob.modifiers.new('Layer thickness','SOLIDIFY');sol.thickness=.004
roll(.58,.12,1.00,3);roll(.58,.10,1.15,2)
# Wall ledger, front spar, side rafters, triangular brackets: all carry load to masonry.
box('Awning rear ledger',(0,.035,3.58),(2.66,.09,.105))
box('Awning front spar',(0,-.84,3.26),(2.66,.065,.065))
for xx in [-1.19,1.19]:
 box('Bracket masonry seat',(xx,.015,3.10),(.10,.07,.62))
 rod('Awning diagonal timber brace',(xx,-.02,2.84),(xx,-.83,3.245),.037,0)
 rod('Awning side rafter',(xx,0,3.565),(xx,-.85,3.255),.027,0)
 for z in [2.87,3.36]:rod('Bracket blackened iron bolt',(xx,-.035,z),(xx,-.055,z),.015)
# Supported canopy: downhill fall, shallow tension sag, seams and soft scalloped valance.
verts=[];uvs=[];nx=64;ny=12
for j in range(ny+1):
 t=j/ny
 for i in range(nx+1):
  s=i/nx; xx=(s-.5)*2.68
  zz=3.63-.33*t-.070*math.sin(math.pi*s)*math.sin(math.pi*t)+.006*math.sin(s*math.pi*32)*math.sin(t*math.pi)
  verts.append((xx,.055-.935*t,zz));uvs.append((s,t))
faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)]
ob=mesh('Tensioned linen canopy',verts,faces,uvs,6,True);ob.modifiers.new('Bound canvas thickness','SOLIDIFY').thickness=.008
verts=[];uvs=[]
for j in range(5):
 for i in range(nx+1):
  s=i/nx;t=j/4;zz=3.30-t*(.14+.035*(.5-.5*math.cos(s*math.pi*16)))
  verts.append(((s-.5)*2.68,-.88-.007*math.sin(s*math.pi*16),zz));uvs.append((s,t))
faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(4) for i in range(nx)]
ob=mesh('Scalloped bound valance',verts,faces,uvs,6,True);ob.modifiers.new('Sewn canvas edge','SOLIDIFY').thickness=.009
for xx in [-1.32,-.66,0,.66,1.32]:
 pts=[]
 for j in range(23):
  t=j/22;s=xx/2.68+.5;pts.append((xx,.055-.935*t,3.637-.33*t-.070*math.sin(math.pi*s)*math.sin(math.pi*t)))
 for a,b in zip(pts[:-1],pts[1:]):rod('Canopy stitched seam',a,b,.0025,5)
# Editable source retains named objects and modifiers. Export merges to one PBR primitive.
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).with_name('textile_booth.blend')))
for ob in list(bpy.context.scene.objects):
 if ob.type=='MESH':
  bpy.context.view_layer.objects.active=ob;ob.select_set(True)
  for mod in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
  ob.select_set(False)
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=bpy.context.selected_objects[0];bpy.ops.object.join()
ob=bpy.context.object;ob.name='Textile merchant booth';bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# Fit checks are coupled to the authored bay, including the low walking envelope.
coords=[v.co for v in ob.data.vertices]
assert min(v.z for v in coords)>=-0.001
assert min(v.y for v in coords if v.z<2.5)>=-.29
assert max(abs(v.x) for v in coords if v.z<2.5)<=.93
assert max(v.z for v in coords)<3.7
bpy.ops.export_scene.gltf(filepath=str(OUT/'textile_booth.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=False)
manifest=ROOT/'apps/client/public/assets/models/environment/bazaar/props/models.json'
j=json.loads(manifest.read_text());j['models']=[m for m in j['models'] if m['id']!='original_textile_booth']
j['models'].append({'id':'original_textile_booth','url':'textile_booth/textile_booth.glb','scale':1,'variants':{'1k':{'url':'textile_booth/textile_booth.glb'}},'source':'repo://assets/source/textile-booth/build.py','license':'Project-Original','dependencies':[{'source':'https://polyhaven.com/a/wooden_table_02','license':'CC0-1.0','file':str(wood_path.relative_to(ROOT)),'md5':hashlib.md5(wood_path.read_bytes()).hexdigest()}],'reference':'https://www.sewatelierm.com/where-and-how-to-buy-the-best-fabrics-in-marrakech/','md5':{'textile_booth/textile_booth.glb':hashlib.md5((OUT/'textile_booth.glb').read_bytes()).hexdigest()}})
manifest.write_text(json.dumps(j,indent=2)+'\n')
print('BOOTH_EXPORT',len(ob.data.vertices),'vertices',sum(len(p.vertices)-2 for p in ob.data.polygons),'triangles')
print('BOUNDS',[(min(v[i] for v in coords),max(v[i] for v in coords)) for i in range(3)])
