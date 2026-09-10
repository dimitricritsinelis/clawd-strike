import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/dimitri2/Desktop/clawdstrike'); OUT=ROOT/'artifacts/bazaar-material-review'
BASE=ROOT/'apps/client/public/assets/models/environment/bazaar/props'
items=[('wicker-basket','wicker_basket_02/wicker_basket_02_1k.gltf'),('wine-barrel','wine_barrel_01/wine_barrel_01_1k.gltf'),('ceramic-pot','ceramic_pot/ceramic_pot_1k.gltf'),('wooden-crate','wooden_crate_01/wooden_crate_01_1k.gltf')]
for name,path in items:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(BASE/path))
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
 coords=[o.matrix_world@Vector(c) for o in objs for c in o.bound_box]
 lo=Vector([min(v[i] for v in coords) for i in range(3)]);hi=Vector([max(v[i] for v in coords) for i in range(3)])
 center=(lo+hi)*.5; size=max(hi-lo)
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=True
 scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Neutral daylight');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.82,.86,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
 bpy.ops.object.light_add(type='AREA',location=center+Vector((-2,-3,5))*size);key=bpy.context.object;key.data.energy=400*size*size;key.data.shape='DISK';key.data.size=3*size;key.rotation_euler=(center-key.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=center+Vector((2.1,-3.4,2))*size);cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=size*1.7;scene.camera=cam
 scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/f'retained-{name}.png');scene.render.film_transparent=False
 print('AUDIT',name,'meshes',len(objs),'bounds',list(lo),list(hi),flush=True)
 bpy.ops.render.render(write_still=True)
