"""Rebind the left thumb palmward and author the near-face magazine grip."""
import bpy,math,json,hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
SOURCE=Path(__file__).resolve().parent
OUT=SOURCE/'exports/near-face-grip'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'left-hand-case04.blend'))
r=bpy.data.objects['L_Armature'];s=bpy.context.scene
body=bpy.data.objects['L_GloveAndForearm']
meshes=[o for o in s.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==r for m in o.modifiers)]
closed={b.name:b.matrix_basis.copy() for b in r.pose.bones}
old_rest={b.name:b.matrix_local.copy() for b in r.data.bones}
def coords(o):
 ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get())
 return np.array([v.co[:] for v in ev.data.vertices])
for t in r.animation_data.nla_tracks:t.mute=True
r.animation_data.action=r.animation_data.nla_tracks['Idle'].strips[0].action
r.animation_data.action_slot=r.animation_data.action.slots[0]
s.frame_set(1);bpy.context.view_layer.update()
original_idle={o.name:coords(o) for o in meshes}
idle_basis={b.name:b.matrix_basis.copy() for b in r.pose.bones}
idle_matrices={b.name:b.matrix.copy() for b in r.pose.bones}
body.data.calc_loop_triangles()
old_body=[v.co.copy() for v in body.data.vertices]
body_tris=[tuple(t.vertices) for t in body.data.loop_triangles]
body_tree=BVHTree.FromPolygons(old_body,body_tris,all_triangles=True)
old_overlays={o.name:[v.co.copy() for v in o.data.vertices] for o in meshes if o!=body}
for t in r.animation_data.nla_tracks:t.mute=True
r.animation_data.action=None
for b in r.pose.bones:b.matrix_basis=Matrix.Identity(4)
bpy.context.view_layer.update()
axes=json.loads(Path('assets/source/ak47/exports/review-2026-09-09/run-01/diagnostics/axis-comparison/derived-axes.json').read_text())
# Author palm-facing thumb at a relaxed spread, before any magazine contact.
y=Vector((-.65,.76,0)).normalized();z=Vector((0,0,1));x=y.cross(z).normalized()
newframe=Matrix((x,y,z)).transposed()
pulp=Vector(axes['L_thumb.02']['pad_transverse_rest'])
head=old_rest['L_thumb.01'].translation.copy()
for i,name in enumerate(['L_thumb.01','L_thumb.02','L_thumb.03']):
 old=old_rest[name];old_y=old.col[1].to_3d()
 old_pulp=Vector(axes[name]['pad_transverse_rest']) if name in axes else pulp
 old_pulp=(old_pulp-old_y*old_pulp.dot(old_y)).normalized()
 oldframe=Matrix((old_y.cross(old_pulp).normalized(),old_y,old_pulp)).transposed()
 if i:newframe=newframe@Matrix.Rotation(math.radians(8 if i==1 else 5),3,'X')
 m=(newframe@oldframe.inverted()@old.to_3x3()).to_4x4();m.translation=head
 r.pose.bones[name].matrix=m
 bpy.context.view_layer.update()
 head=m@Vector((0,r.data.bones[name].length,0))
# Bake rotation-interpolated skinning, retaining the web volume while changing bind.
transforms={b.name:b.matrix@old_rest[b.name].inverted() for b in r.pose.bones}
poses={b.name:b.matrix.copy() for b in r.pose.bones}
for o in meshes:
 for v in o.data.vertices:
  groups=[(o.vertex_groups[g.group].name,g.weight) for g in v.groups if o.vertex_groups[g.group].name in transforms]
  # Dual quaternion blend avoids baking collapsed linear-skinning web into rest.
  qsum=np.zeros(4);dsum=np.zeros(4);ref=None
  for name,w in groups:
   m=transforms[name];q=m.to_quaternion();t=m.translation
   d=Quaternion((0,t.x,t.y,t.z))@q
   if ref is None:ref=q.copy()
   sign=1 if q.dot(ref)>=0 else -1
   qsum+=np.array(q)*w*sign;dsum+=np.array(d)*(.5*w*sign)
  norm=np.linalg.norm(qsum); q=Quaternion(qsum/norm);d=Quaternion(dsum/norm);t=d@q.conjugated()
  v.co=q@v.co+Vector((t.x,t.y,t.z))*2
# Carry the garment through the same body deformation and interpolate its weights.
new_body=[v.co.copy() for v in body.data.vertices]
body_weights=[{body.vertex_groups[g.group].name:g.weight for g in v.groups} for v in body.data.vertices]
for o in meshes:
 if o==body:continue
 for v,p in zip(o.data.vertices,old_overlays[o.name]):
  hit,normal,face,distance=body_tree.find_nearest(p)
  ids=body_tris[face];a,b,c=[old_body[i] for i in ids];A,B,C=[new_body[i] for i in ids]
  weights=barycentric_transform(hit,a,b,c,Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
  old_x=(b-a).normalized();new_x=(B-A).normalized()
  new_n=(B-A).cross(C-A).normalized()
  rotation=Matrix((new_x,new_n.cross(new_x),new_n)).transposed()@Matrix((old_x,normal.cross(old_x),normal))
  v.co=A*weights.x+B*weights.y+C*weights.z+rotation@(p-hit)
  blended={}
  for i,w in zip(ids,weights):
   for name,value in body_weights[i].items():blended[name]=blended.get(name,0)+w*value
  chosen=sorted(((name,w) for name,w in blended.items() if w>1e-7),key=lambda item:-item[1])[:4]
  total=sum(w for name,w in chosen)
  for group_index in [g.group for g in v.groups]:o.vertex_groups[group_index].remove([v.index])
  for name,w in chosen:o.vertex_groups[name].add([v.index],w/total,'REPLACE')
# Set the deformed skeleton as rest; align +X with the pulp flexion hinge.
bpy.context.view_layer.objects.active=r;r.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for eb in r.data.edit_bones:
 if eb.name.startswith('L_thumb.'):
  m=poses[eb.name];length=eb.length;eb.head=m.translation;eb.tail=m@Vector((0,length,0))
  name=eb.name
  old_pulp=Vector(axes[name]['pad_transverse_rest']) if name in axes else pulp
  new_pulp=transforms[name].to_3x3()@old_pulp
  eb.align_roll(new_pulp)
bpy.ops.object.mode_set(mode='OBJECT')
for b in r.pose.bones:b.matrix_basis=Matrix.Identity(4)
# A small thenar mound in the relaxed bind; same smooth field carries all layers.
for o in meshes:
 for v in o.data.vertices:
  p=v.co
  weight=math.exp(-((p.x+.026)/.021)**2-((p.y-.043)/.023)**2)
  palmar=max(0,min(1,(p.z+.001)/.012))
  p.z+=.004*weight*palmar
  center=Vector((-.03457,.05216,.00669));delta=p-center
  p[:]=center+delta*(1+.3*math.exp(-delta.length_squared/.014**2))
# Reconstruct the existing panel from its exact recovered source topology.
# The original vertex counts remain intact so idle surface correspondence holds.
body.data.update()
panel=bpy.data.objects['Palm heel suede overlay']
correspondence=json.loads((SOURCE/'palm-panel-map.json').read_text())
if hashlib.sha256((SOURCE/correspondence['source']).read_bytes()).hexdigest()!=correspondence['sourceSHA256']:
 raise RuntimeError('Palm panel source changed; recover its topology mapping again')
mapping=correspondence['outerToBody'];half=len(mapping)
if len(panel.data.vertices)!=2*half or len(body.data.vertices)!=correspondence['bodyVertexCount']:
 raise RuntimeError('Palm panel topology differs from the recovered source')
def set_weights(ob,index,weights):
 for gi in [g.group for g in ob.data.vertices[index].groups]:ob.vertex_groups[gi].remove([index])
 for name,weight in weights.items():ob.vertex_groups[name].add([index],weight,'REPLACE')
weights=[{body.vertex_groups[g.group].name:g.weight for g in v.groups} for v in body.data.vertices]
for i,source_index in enumerate(mapping):
 vertex=body.data.vertices[source_index]
 for offset,index in [(.00065,i),(.00025,i+half)]:
  panel.data.vertices[index].co=vertex.co+vertex.normal*offset
  set_weights(panel,index,weights[source_index])
panel.data.update()
outer_faces=[tuple(p.vertices) for p in panel.data.polygons if all(i<half for i in p.vertices)]
edge_counts={}
for face in outer_faces:
 for a,b in zip(face,face[1:]+face[:1]):
  edge=tuple(sorted((a,b)));edge_counts[edge]=edge_counts.get(edge,0)+1
adjacency={}
for (a,b),count in edge_counts.items():
 if count==1:adjacency.setdefault(a,[]).append(b);adjacency.setdefault(b,[]).append(a)
# Smooth each cut-edge vertex only on its original topological neighborhood.
# This prevents projection onto the opposing side of the thumb web.
body_neighbors=[set() for v in body.data.vertices]
body_vertex_faces=[set() for v in body.data.vertices]
for edge in body.data.edges:
 a,b=edge.vertices;body_neighbors[a].add(b);body_neighbors[b].add(a)
for polygon in body.data.polygons:
 for index in polygon.vertices:body_vertex_faces[index].add(polygon.index)
local_surfaces={}
for index in adjacency:
 source_index=mapping[index];region={source_index}
 for step in range(3):region|={j for i in region for j in body_neighbors[i]}
 faces={f for i in region for f in body_vertex_faces[i] if body.data.polygons[f].normal.dot(body.data.vertices[source_index].normal)>.25}
 vertices=sorted({i for f in faces for i in body.data.polygons[f].vertices});remap={v:i for i,v in enumerate(vertices)}
 local_surfaces[index]=BVHTree.FromPolygons([body.data.vertices[i].co for i in vertices],[[remap[i] for i in body.data.polygons[f].vertices] for f in faces])
for step in range(24):
 updates={}
 for index,neighbors in adjacency.items():
  if len(neighbors)!=2:raise RuntimeError('Palm boundary is not a simple loop')
  point=(panel.data.vertices[neighbors[0]].co+panel.data.vertices[index].co*2+panel.data.vertices[neighbors[1]].co)/4
  hit,normal,_,_=local_surfaces[index].find_nearest(point)
  updates[index]=(hit,normal)
 for index,(hit,normal) in updates.items():
  panel.data.vertices[index].co=hit+normal*.00065
  panel.data.vertices[index+half].co=hit+normal*.00025
panel.data.update()
unused={edge for edge,count in edge_counts.items() if count==1}
loops=[]
while unused:
 first,current=min(unused);loop=[first,current];unused.remove(tuple(sorted((first,current))))
 while current!=first:
  following=min(i for i in adjacency[current] if tuple(sorted((current,i))) in unused)
  unused.remove(tuple(sorted((current,following))));current=following;loop.append(current)
 loops.append(loop)
if len(loops)!=1:raise RuntimeError('Expected the original single continuous palm panel boundary')
loop=loops[0];points=[panel.data.vertices[i].co.copy() for i in loop]
seam=bpy.data.objects['Palm overlay rolled seam']
if len(seam.data.vertices)!=len(points)*8:raise RuntimeError('Palm boundary sample count changed')
def ring(point,tangent,radius):
 axis=tangent.cross(Vector((0,0,1)))
 if axis.length<.01:axis=tangent.cross(Vector((1,0,0)))
 axis.normalize();other=tangent.cross(axis).normalized()
 return [point+radius*(axis*math.cos(side*math.tau/8)+other*math.sin(side*math.tau/8)) for side in range(8)]
for i,point in enumerate(points):
 tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
 for side,coordinate in enumerate(ring(point,tangent,.00045)):
  seam.data.vertices[i*8+side].co=coordinate
  set_weights(seam,i*8+side,weights[mapping[loop[i]]])
seam.data.update()
# Sew the two inset rows along the reconstructed edge, retaining their topology.
panel_surface=BVHTree.FromPolygons([v.co for v in panel.data.vertices],outer_faces)
center=sum(points,Vector())/len(points)
for name,inset in [('Palm overlay stitching',.0013),('Palm overlay stitching.001',.0027)]:
 ob=bpy.data.objects[name];path=[]
 for i,point in enumerate(points[:-1]):
  tangent=(points[(i+1)%(len(points)-1)]-points[i-1 if i else -2]).normalized()
  normal=body.data.vertices[mapping[loop[i]]].normal
  inward=normal.cross(tangent).normalized()
  if inward.dot(center-point)<0:inward.negate()
  hit,n,_,_=panel_surface.find_nearest(point+inward*inset)
  path.append(hit+n*.00035)
 path.append(path[0]);lengths=[0.]
 for a,b in zip(path,path[1:]):lengths.append(lengths[-1]+(b-a).length)
 def sample(distance):
  index=min(len(path)-2,max(0,int(np.searchsorted(lengths,distance))-1))
  blend=(distance-lengths[index])/max(1e-10,lengths[index+1]-lengths[index])
  a=mapping[loop[index]];b=mapping[loop[index+1]]
  weight={key:(1-blend)*weights[a].get(key,0)+blend*weights[b].get(key,0) for key in weights[a].keys()|weights[b].keys()}
  return path[index].lerp(path[index+1],blend),weight
 count=len(ob.data.vertices)//24;spacing=lengths[-1]/(count+1)
 for stitch in range(count):
  a,weight_a=sample(.0005+stitch*spacing);b,weight_b=sample(.0005+(stitch+.62)*spacing)
  middle=(a+b)*.5;radial=Vector((middle.x,0,middle.z)).normalized();middle+=radial*.00013
  mid_weights={key:(weight_a.get(key,0)+weight_b.get(key,0))*.5 for key in weight_a.keys()|weight_b.keys()}
  curve=[a,middle,b]
  for j,(point,weight) in enumerate(zip(curve,[weight_a,mid_weights,weight_b])):
   tangent=(curve[min(j+1,2)]-curve[max(0,j-1)]).normalized()
   for side,coordinate in enumerate(ring(point,tangent,.00018)):
    index=stitch*24+j*8+side;ob.data.vertices[index].co=coordinate;set_weights(ob,index,weight)
 ob.data.update()

# Preserve the arm path; author fingers without translational joint fitting.
for b in r.pose.bones:
 if not b.name.startswith('L_thumb.'):b.matrix_basis=closed[b.name]
 if b.name.startswith(('L_f_','L_thumb.')):
  b.location=(0,0,0);b.lock_location=(True,True,True)
  if b.name.startswith('L_thumb.'):
   b['flexAxisLocal']=[1.,0.,0.];b['restFlexionDeg']=8. if b.name=='L_thumb.02' else 5. if b.name=='L_thumb.03' else 0.
   b.bone['flexAxisLocal']=[1.,0.,0.];b.bone['restFlexionDeg']=b['restFlexionDeg']
bpy.context.view_layer.update()
# Seat the distal pulp with a small CMC rotation about the corrected hinge.
r.pose.bones['L_thumb.01'].rotation_quaternion=Quaternion((1,0,0),math.radians(6))
r.pose.bones['L_thumb.02'].rotation_quaternion=Quaternion((1,0,0),math.radians(-5))
r.pose.bones['L_thumb.03'].rotation_quaternion=Quaternion((1,0,0),math.radians(-3))
bpy.context.view_layer.update()
natural_surface={o.name:np.array([v.co[:] for v in o.data.vertices]) for o in meshes}
# Correct only the proximal palm/CMC intrusion found by triangle inspection.
# A smooth monotone compression keeps tissue layers separate, unlike clamping.
trans={b.name:np.array(b.matrix@b.bone.matrix_local.inverted()) for b in r.pose.bones}
for o in meshes:
 count=len(o.data.vertices);skin=np.zeros((count,4,4))
 for v in o.data.vertices:
  for g in v.groups:skin[v.index]+=trans[o.vertex_groups[g.group].name]*g.weight
 target=coords(o)
 amount=np.exp(-((target[:,0]+.015)/.06)**8-((target[:,2]+.065)/.03)**8)
 corrected=.0175+.004*np.logaddexp(0,(target[:,1]-.0175)/.004)
 target[:,1]+=amount*(corrected-target[:,1])
 target=np.concatenate((target,np.ones((count,1))),axis=1)
 recovered=np.linalg.solve(skin,target[:,:,None])[:,:,0][:,:3]
 o.data.vertices.foreach_set('co',recovered.reshape(-1));o.data.update()
bpy.context.view_layer.update()
# Contact compression is a corrective, not the relaxed bind geometry.
for o in meshes:
 contact=np.array([v.co[:] for v in o.data.vertices])
 o.data.vertices.foreach_set('co',natural_surface[o.name].reshape(-1))
 o.shape_key_add(name='Basis')
 key=o.shape_key_add(name='MagazineContact');key.data.foreach_set('co',contact.reshape(-1));key.value=1
bpy.context.view_layer.update()
# Preserve the original idle through converted controls and an explicit endpoint morph.
near_closed={b.name:b.matrix_basis.copy() for b in r.pose.bones}
for o in meshes:o.data.shape_keys.key_blocks['MagazineContact'].value=0
idle_action=r.animation_data.nla_tracks['Idle'].strips[0].action.copy()
idle_action.name='Idle_NearFaceBind'
r.animation_data.action=idle_action;r.animation_data.action_slot=idle_action.slots[0]
for b in r.pose.bones:b.matrix_basis=idle_basis[b.name]
bpy.context.view_layer.update()
for name in ['L_thumb.01','L_thumb.02','L_thumb.03']:
 old=old_rest[name];old_y=old.col[1].to_3d()
 normal=Vector(axes[name]['pad_transverse_rest']) if name in axes else pulp
 normal=(normal-old_y*normal.dot(old_y)).normalized()
 target=idle_matrices[name]
 target_y=target.col[1].to_3d().normalized()
 target_z=(target.to_3x3()@old.to_3x3().inverted()@normal).normalized()
 target_x=target_y.cross(target_z).normalized();target_z=target_x.cross(target_y).normalized()
 matrix=Matrix((target_x,target_y,target_z)).transposed().to_4x4();matrix.translation=target.translation
 r.pose.bones[name].matrix=matrix
 r.pose.bones[name].location=(0,0,0)
 if name!='L_thumb.01':
  rotation=r.pose.bones[name].rotation_quaternion
  angle=2*math.atan2(rotation.x,rotation.w)
  angle=max(-math.radians(r.pose.bones[name]['restFlexionDeg']),angle)
  r.pose.bones[name].rotation_quaternion=Quaternion((1,0,0),angle)
 bpy.context.view_layer.update()
for b in r.pose.bones:
 if b.name.startswith(('L_thumb.','L_f_')):
  b.location=(0,0,0)
  for frame in [1,148]:
   for prop in ['location','rotation_quaternion','scale']:b.keyframe_insert(prop,frame=frame)
bpy.context.view_layer.update()
trans={b.name:np.array(b.matrix@b.bone.matrix_local.inverted()) for b in r.pose.bones}
for o in meshes:
 count=len(o.data.vertices);skin=np.zeros((count,4,4))
 for v in o.data.vertices:
  for g in v.groups:skin[v.index]+=trans[o.vertex_groups[g.group].name]*g.weight
 target=np.concatenate((original_idle[o.name],np.ones((count,1))),axis=1)
 recovered=np.linalg.solve(skin,target[:,: ,None])[:,:,0][:,:3]
 key=o.shape_key_add(name='IdleGripRestore')
 key.data.foreach_set('co',recovered.reshape(-1));key.value=1
bpy.context.view_layer.update()
errors={o.name:float(np.linalg.norm(coords(o)-original_idle[o.name],axis=1).max()) for o in meshes}
if max(errors.values())>1e-5:raise RuntimeError('Original idle recovery failed: '+str(errors))
(OUT/'original-idle-validation.json').write_text(json.dumps(errors,indent=2)+'\n')
r.animation_data.action=None
strip=r.animation_data.nla_tracks['Idle'].strips[0];strip.action=idle_action;strip.action_slot=idle_action.slots[0]
for o in meshes:
 o.data.shape_keys.key_blocks['IdleGripRestore'].value=0
 o.data.shape_keys.key_blocks['MagazineContact'].value=1
for b in r.pose.bones:b.matrix_basis=near_closed[b.name]
s.frame_set(33);bpy.context.view_layer.update()
for label in ['Closed near-face magazine grip','Open magazine grip']:
 action=bpy.data.actions.new(label);r.animation_data.action=action
 for bone in r.pose.bones:
  if not bone.name.startswith(('L_thumb.','L_f_')):continue
  bone.matrix_basis=near_closed[bone.name]
  if label.startswith('Open') and bone.name.startswith('L_thumb.'):
   joint=int(bone.name[-2:])
   bone.rotation_quaternion=Quaternion((0,0,1),math.radians(12)) if joint==1 else Quaternion((1,0,0),math.radians((3 if joint==2 else 2)-bone['restFlexionDeg']))
  for prop in ['rotation_quaternion','location','scale']:bone.keyframe_insert(prop,frame=1)
 action.asset_mark()
r.animation_data.action=None
for bone in r.pose.bones:bone.matrix_basis=near_closed[bone.name]
bpy.context.view_layer.update()
# Distributed points on the actual broad suede pulp, expressed in the new bone frame.
overlay=bpy.data.objects['Palm heel suede overlay'];ev=overlay.evaluated_get(bpy.context.evaluated_depsgraph_get())
points=[v.co.copy() for v in ev.data.vertices];normal=[v.normal.copy() for v in ev.data.vertices]
for index,name in enumerate(['ThumbPadContact','ThumbPadContact1','ThumbPadContact2']):
 target=Vector((-.030,.0167,-.012+index*.006))
 choices=[v.index for v in overlay.data.vertices if any(overlay.vertex_groups[g.group].name=='L_thumb.03' and g.weight>.8 for g in v.groups) and normal[v.index].y<-.8]
 vertex=min(choices,key=lambda i:(points[i]-target).length)
 marker=bpy.data.objects[name];marker.matrix_world=Matrix.Translation(points[vertex])
 marker['sourceVertex']=vertex;marker['sourceMesh']=overlay.name
 marker['padNormalLocal']=list(r.pose.bones['L_thumb.03'].matrix.to_3x3().inverted()@normal[vertex])
 marker['contactNormalMagazineLocal']=[0.,1.,0.]
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'left-hand-near-face.blend'))
import bpy, math
from pathlib import Path
from mathutils import Vector,Matrix
OUT=SOURCE/'exports/near-face-grip'
def cameras():
 for name,position in [('back',(.03,.55,.015)),('palm',(-.03,-.55,.015)),('edge',(-.55,.015,-.035))]:
  key='Opposition review '+name;o=bpy.data.objects.get(key)
  if not o:o=bpy.data.objects.new(key,bpy.data.cameras.new(key));bpy.context.scene.collection.objects.link(o)
  o.location=position;o.rotation_euler=(Vector((.008,0,-.06))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=.30
 name='Opposition review gameplay';o=bpy.data.objects.get(name)
 if not o:o=bpy.data.objects.new(name,bpy.data.cameras.new(name));bpy.context.scene.collection.objects.link(o)
 transform=(Matrix.Translation((.151-.045,-.143+.075,-.30-.035))@Matrix.Rotation(-.08,4,'X')@Matrix.Rotation(.48,4,'Y')@Matrix.Rotation(-.065-.65,4,'Z')@Matrix.Scale(.90,4)@Matrix(((0,-1,0,0),(0,0,1,0),(-1,0,0,0),(0,0,0,1))))
 inv=transform.inverted();o.location=inv.translation;o.rotation_euler=inv.to_quaternion().to_euler();o.data.sensor_fit='VERTICAL';o.data.sensor_height=24;o.data.lens=24/(2*math.tan(math.radians(54)/2))
def render(stage,views=('back','palm','edge','gameplay')):
 s=bpy.context.scene;s.render.resolution_percentage=100;s.cycles.samples=20
 for name in views:
  s.camera=bpy.data.objects['Opposition review '+name];s.render.resolution_x=1280;s.render.resolution_y=720 if name=='gameplay' else 960;s.render.filepath=str(OUT/(stage+'-'+name+'.png'));bpy.ops.render.render(write_still=True)

OUT=SOURCE/'exports/near-face-grip';cameras();render('rebound',('back','palm','gameplay'))
