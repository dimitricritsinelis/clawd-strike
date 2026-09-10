"""Review-only material specimens; no source edits, exports or game integration."""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
D=json.loads((ROOT/'docs/map-design/construction/design.json').read_text());C=json.loads((OUT/'calibrated-swatches.json').read_text());F={f['id']:f for f in C['families']}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def basic(color):
 m=bpy.data.materials.new('diagram backing');m.diffuse_color=(*color,1);return m
back=basic((.08,.07,.055))
selection=['cream-plaster','sand-plaster','faded-ochre','faded-earth-red','dressed-sandstone','quiet-flags','cream-woven-cloth','timber']
for i,key in enumerate(selection):
 row,col=divmod(i,4);x=col*2.55;z=3.0 if row==0 else .35;f=F[key];source=D['materials'][f['resolvedSourceMaterialId']]
 m=bpy.data.materials.new(key);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Metallic'].default_value=0
 albedo=n.new('ShaderNodeTexImage');albedo.image=bpy.data.images.load(str(ROOT/f['proposed']));albedo.image.colorspace_settings.name='sRGB';l.new(albedo.outputs['Color'],bs.inputs['Base Color'])
 normal=n.new('ShaderNodeTexImage');normal.image=bpy.data.images.load(str(ROOT/Path(source['manifest']).parent/source['textures']['normal']),check_existing=True);normal.image.colorspace_settings.name='Non-Color';normalmap=n.new('ShaderNodeNormalMap');normalmap.inputs['Strength'].default_value=.18 if key in ('cream-woven-cloth','timber') else source.get('normalScale',.3);l.new(normal.outputs['Color'],normalmap.inputs['Color']);l.new(normalmap.outputs['Normal'],bs.inputs['Normal'])
 arm=n.new('ShaderNodeTexImage');arm.image=bpy.data.images.load(str(ROOT/Path(source['manifest']).parent/source['textures']['arm']),check_existing=True);arm.image.colorspace_settings.name='Non-Color';sep=n.new('ShaderNodeSeparateColor');l.new(arm.outputs['Color'],sep.inputs['Color']);mult=n.new('ShaderNodeMath');mult.operation='MULTIPLY';mult.inputs[1].default_value=.94 if key=='cream-woven-cloth' else .86 if key=='timber' else source.get('roughness',.94);l.new(sep.outputs['Green'],mult.inputs[0]);l.new(mult.outputs[0],bs.inputs['Roughness'])
 # Deliberately fixed geometry and scale: every vertical specimen is2.0m square.
 mesh=bpy.data.meshes.new(key);mesh.from_pydata([(x,0,z),(x+2,0,z),(x+2,0,z+2),(x,0,z+2)],[],[(0,1,2,3)]);mesh.update();ob=bpy.data.objects.new(key,mesh);bpy.context.collection.objects.link(ob);ob.data.materials.append(m);uv=mesh.uv_layers.new();repeat=f.get('repeatM',source.get('tileSizeM',2));coords=[(0,0),(2/repeat,0),(2/repeat,2/repeat),(0,2/repeat)]
 for face in mesh.polygons:
  for loop in face.loop_indices:uv.data[loop].uv=coords[mesh.loops[loop].vertex_index]
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x+1,.10,z+1));support=bpy.context.object;support.dimensions=(2.03,.18,2.03);support.data.materials.append(back)
 bpy.ops.object.text_add(location=(x,-.04,z+2.15),rotation=(math.pi/2,0,0));t=bpy.context.object;t.data.body=key.replace('-',' ');t.data.size=.14;t.data.materials.append(basic((.08,.07,.055)))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.cycles.seed=0;scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast' if 'Medium High Contrast' in [] else 'None';scene.view_settings.exposure=0
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs['Strength'].default_value=.35
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.rotation_euler=(math.radians(42),math.radians(-18),math.radians(-25));sun.data.energy=3.0;sun.data.angle=.15
bpy.ops.object.camera_add(location=(4.85,-14.8,4.0));camera=bpy.context.object;target=Vector((4.85,0,2.75));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=11.4;scene.camera=camera
scene.render.resolution_x=2200;scene.render.resolution_y=1220;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
for name,sky,color in [('neutral',(.72,.78,.88,1),(1,1,1)),('warm',(.72,.78,.88,1),(1,.90,.75))]:
 bg.inputs['Color'].default_value=sky;sun.data.color=color;scene.render.filepath=str(OUT/('material-panels-'+name+'.png'));bpy.ops.render.render(write_still=True)
(OUT/'material-panel-notes.json').write_text(json.dumps({'status':'Experimental material specimens, not approved map appearance','sourceDesignSha256':C['sourceDesignSha256'],'specimens':selection,'specimenSizeM':[2,2],'calibration':'See calibrated-swatches.json; proposed base-color field, same selected source normal/roughness maps','metallic':'Constant zero for these nonmetals; no ARM blue connection','roughness':'Selected R5 scalar multiplied by ARM green; this review does not silently resolve that remaining target-vs-factor contract question','lighting':'Fixed cool sky and identical sun intensity; compare white versus warm sun color only. Exposure0, no fog or global color grade','limits':'All coupons are vertical, including paving. This is a controlled surface study, not a final scene, floor grazing-angle proof or shipped-game-lighting match.'},indent=2)+'\n')
print('Material specimen renders complete; sources unchanged.')
