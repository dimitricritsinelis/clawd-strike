import bpy,json,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent;Q=json.loads((O/'r6-selected-materials.json').read_text());D=json.loads((R/'docs/map-design/construction/design.json').read_text());F={x['family']:x for x in Q['families']}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(k,old=False):
 f=F[k];m=bpy.data.materials.new(k+('-prior' if old else '-selected'));m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;b=n.get('Principled BSDF');b.inputs['Metallic'].default_value=f['metalness'];t=n.new('ShaderNodeTexImage');path=O/'swatches'/(k+'-proposed.png') if old else R/f['sampleAlbedo'];t.image=bpy.data.images.load(str(path),check_existing=True);t.image.colorspace_settings.name='sRGB';l.new(t.outputs['Color'],b.inputs['Base Color']);normal=n.new('ShaderNodeTexImage');normal.image=bpy.data.images.load(str(R/f['sourceFiles']['normal']),check_existing=True);normal.image.colorspace_settings.name='Non-Color';nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=f['normalScale'];l.new(normal.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],b.inputs['Normal']);arm=n.new('ShaderNodeTexImage');arm.image=bpy.data.images.load(str(R/f['sourceFiles']['arm']),check_existing=True);arm.image.colorspace_settings.name='Non-Color';sep=n.new('ShaderNodeSeparateColor');l.new(arm.outputs['Color'],sep.inputs['Color']);mult=n.new('ShaderNodeMath');mult.operation='MULTIPLY';mult.inputs[1].default_value=f['roughness'];l.new(sep.outputs['Green'],mult.inputs[0]);l.new(mult.outputs[0],b.inputs['Roughness']);return m
M={k:mat(k) for k in F};old={k:mat(k,True) for k in ['sand-plaster','quiet-flags','dressed-sandstone','teal','indigo']}
def plain(name,col):
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);return m
ink=plain('label',(.07,.07,.065));white=plain('test silhouette',(.15,.17,.19))
def plane(name,vs,m,uvs):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],[(0,1,2,3)]);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(m);uv=me.uv_layers.new()
 for i,v in enumerate(uvs):uv.data[i].uv=v
 return ob
U=lambda w,h,rep:[(0,0),(w/rep,0),(w/rep,h/rep),(0,h/rep)]
def label(text,x,y,z,size=.16):
 bpy.ops.object.text_add(location=(x,y,z),rotation=(math.pi/2,0,0));o=bpy.context.object;o.data.body=text;o.data.size=size;o.data.materials.append(ink)
for j,isold in enumerate([True,False]):
 x=j*5.1;mm=old if isold else M;rep=3.2 if isold else 2.4
 plane('horizontal flags',[(x,-2,0),(x+4,-2,0),(x+4,2,0),(x,2,0)],mm['quiet-flags'],U(4,4,rep));plane('vertical sand',[(x,2,0),(x+4,2,0),(x+4,2,3),(x,2,3)],mm['sand-plaster'],U(4,3,2));plane('stone ground band',[(x,1.99,0),(x+4,1.99,0),(x+4,1.99,.3),(x,1.99,.3)],mm['dressed-sandstone'],U(4,.3,2));label('Prior proposal' if isold else 'Selected R6: warmer wall / quieter darker ground',x,1.95,3.2,.13)
 # Fixed neutral proxy, diagnostic only; no universal contrast pass threshold.
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.15,location=(x+3,1,1.65));bpy.context.object.data.materials.append(white)
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x+3,1,.8));ob=bpy.context.object;ob.dimensions=(.45,.25,1.4);ob.data.materials.append(white)
 for q,k in enumerate(['teal','indigo']):
  xx=x+.3+q*1.15;plane(k,[(xx,1.97,.7),(xx+.85,1.97,.7),(xx+.85,1.97,2.25),(xx,1.97,2.25)],mm[k],U(.85,1.55,2));label(k,xx,1.9,.48,.12)
 # Shading ledge exercises actual shadows on painted panels.
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x+1.2,1.65,2.45));ob=bpy.context.object;ob.dimensions=(2.7,.8,.08);ob.data.materials.append(M['timber'])
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.64,.73,.9,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.4
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.rotation_euler=(math.radians(30),math.radians(-25),math.radians(-15));sun.data.energy=2;sun.data.angle=.05
bpy.ops.object.camera_add(location=(5,-12,7));cam=bpy.context.object;cam.rotation_euler=(Vector((4.55,.5,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=11;scene.camera=cam;scene.render.resolution_x=1800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
for name,color in [('neutral',(1,1,1)),('warm',(1,.9,.75))]:
 sun.data.color=color;scene.render.filepath=str(O/'r6-samples'/('wall-ground-'+name+'.png'));bpy.ops.render.render(write_still=True)
# Close measured surface comparisons under raking light.
for ob in list(bpy.data.objects):
 if ob.type not in ['CAMERA','LIGHT']:bpy.data.objects.remove(ob,do_unlink=True)
sun.data.color=(1,1,1);sun.rotation_euler=(math.radians(72),math.radians(-40),math.radians(-20));sun.data.energy=2
# Material from exact derived trim maps.
t=Q['trim'];trim=bpy.data.materials.new('joint-free trim');trim.use_nodes=True;n=trim.node_tree.nodes;l=trim.node_tree.links;b=n.get('Principled BSDF');b.inputs['Metallic'].default_value=0
for ch,p in t['sampleFiles'].items():
 tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(R/p));tex.image.colorspace_settings.name='sRGB' if ch=='albedo' else 'Non-Color'
 if ch=='albedo':l.new(tex.outputs['Color'],b.inputs['Base Color'])
 elif ch=='normal':nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.12;l.new(tex.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],b.inputs['Normal'])
 elif ch=='arm':sep=n.new('ShaderNodeSeparateColor');l.new(tex.outputs['Color'],sep.inputs['Color']);mul=n.new('ShaderNodeMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=.94;l.new(sep.outputs['Green'],mul.inputs[0]);l.new(mul.outputs[0],b.inputs['Roughness'])
for j,(name,ma,rep) in enumerate([('Timber 1.2m; grain along members',M['timber'],1.8),('Fine linen 0.09m repeat',M['fine-linen'],.09),('Shade / sackcloth 0.27m repeat',M['cream-woven-cloth'],.27)]):
 x=j*1.5;plane(name,[(x,0,0),(x+1.2,0,0),(x+1.2,0,1),(x,0,1)],ma,U(1.2,1,rep));label(name,x,-.04,1.1,.065)
plane('Monolithic sill 1.2m by0.16m',[(0,-.25,-.5),(1.2,-.25,-.5),(1.2,-.25,-.34),(0,-.25,-.34)],trim,[(0,0),(1.2/1.5625,0),(1.2/1.5625,.16/.37109375),(0,.16/.37109375)]);label('Trim: exact mortar-free crop, 1.2m x 0.16m',0,-.3,-.2,.065)
# Cloth curvature confirms normal response separately from geometric drape.
cam.location=(2.05,-6,2.8);cam.rotation_euler=(Vector((2.05,0,.35))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=4.8;scene.render.resolution_x=2000;scene.render.resolution_y=950;scene.render.filepath=str(O/'r6-samples'/'close-details.png');bpy.ops.render.render(write_still=True)
print('R6 bounded samples complete')
# Macro crop at real dimensions: enough pixels to assess individual weave and tangent normals.
for ob in list(bpy.data.objects):
 if ob.type not in ['CAMERA','LIGHT']:bpy.data.objects.remove(ob,do_unlink=True)
for x,name,ma,w,h,rep in [(0,'Timber: 0.24 x 0.18m',M['timber'],.24,.18,1.8),(.30,'Linen: 0.12m / repeat0.09m',M['fine-linen'],.12,.12,.09),(.48,'Shade: 0.12m / repeat0.27m',M['cream-woven-cloth'],.12,.12,.27)]:
 plane(name,[(x,0,0),(x+w,0,0),(x+w,0,h),(x,0,h)],ma,U(w,h,rep));label(name,x,-.001,h+.02,.008)
plane('Trim macro',[(0,0,-.12),(.24,0,-.12),(.24,0,-.06),(0,0,-.06)],trim,[(0,0),(.24/1.5625,0),(.24/1.5625,.06/.37109375),(0,.06/.37109375)]);label('Trim: 0.24 x 0.06m',0,-.001,-.04,.008)
cam.location=(.3,-1,.20);cam.rotation_euler=(Vector((.3,0,.04))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.66;scene.render.resolution_x=2400;scene.render.resolution_y=1400;scene.cycles.use_denoising=False;scene.cycles.samples=48;scene.render.filepath=str(O/'r6-samples'/'macro-details.png');bpy.ops.render.render(write_still=True)
