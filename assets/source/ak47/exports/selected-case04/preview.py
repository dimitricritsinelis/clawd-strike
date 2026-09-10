"""Export or render the isolated Case 04 preview without installing an asset."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

OUT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('mode', choices=['export','frames'])
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
scene = bpy.context.scene
if Path(bpy.data.filepath).resolve() != OUT/'case04-reload-preview.blend':
    raise RuntimeError('Preview tools require the isolated review blend')

if args.mode == 'export':
    for image in bpy.data.images:
        width,height = image.size
        if max(width,height)>2048:
            ratio = 2048/max(width,height)
            image.scale(max(1,round(width*ratio)),max(1,round(height*ratio)))
            image.pack()
    scene.frame_set(1)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    root = bpy.data.objects['AK47_Rig']
    for ob in [root,*root.children_recursive]:
        ob.select_set(True)
    path = OUT/'case04-reload-preview.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,
        export_anim_slide_to_zero=True,export_yup=True,export_extras=True)
    report = {'previewAsset':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
              'bytes':path.stat().st_size,'installed':False,'blender':bpy.app.version_string}
    (OUT/'export.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))
else:
    rig = bpy.data.objects['L_Armature']
    rig.animation_data.action = None
    for track in rig.animation_data.nla_tracks:
        track.mute = track.name!='Reload'
    scene.render.engine='CYCLES'
    scene.cycles.samples=12
    scene.cycles.seed=0
    scene.cycles.use_denoising=True
    scene.render.resolution_percentage=100
    frames=OUT/'frames'
    frames.mkdir(exist_ok=True)
    camera=bpy.data.objects['Opposition review gameplay']
    camera.data.type='PERSP'
    camera.data.sensor_fit='VERTICAL'
    camera.data.sensor_height=24
    camera.data.lens=24/(2*math.tan(math.radians(54)/2))
    close=bpy.data.objects['Opposition review back']
    close.data.type='ORTHO'
    close.data.ortho_scale=.29
    def ease(x):
        x=max(0,min(1,x))
        return x*x*(3-2*x)
    for frame in [1,12,24,28,31,33,76,119,123,126,137,148]:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        progress=(frame-1)/147
        tilt=ease(progress/.16)*(1-ease((progress-.80)/.20))
        transform=(Matrix.Translation((.151-tilt*.045,-.143+tilt*.075,-.30-tilt*.035))
            @Matrix.Rotation(-tilt*.08,4,'X')@Matrix.Rotation(tilt*.48,4,'Y')
            @Matrix.Rotation(-.065-tilt*.65,4,'Z')@Matrix.Scale(.90,4)
            @Matrix(((0,-1,0,0),(0,0,1,0),(-1,0,0,0),(0,0,0,1))))
        inverse=transform.inverted()
        camera.location=inverse.translation
        camera.rotation_euler=inverse.to_quaternion().to_euler()
        scene.camera=camera
        scene.render.resolution_x=960
        scene.render.resolution_y=540
        scene.render.filepath=str(frames/f'{frame:03d}-gameplay.png')
        bpy.ops.render.render(write_still=True)
        hand=rig.pose.bones['SupportHand'].matrix
        target=rig.matrix_world@(hand@Vector((0,.060,.010)))
        close.location=target+Vector((.05,.55,.035))
        close.rotation_euler=(target-close.location).to_track_quat('-Z','Y').to_euler()
        scene.camera=close
        scene.render.resolution_y=720
        scene.render.filepath=str(frames/f'{frame:03d}-close.png')
        bpy.ops.render.render(write_still=True)
