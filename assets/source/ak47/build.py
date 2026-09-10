"""Export the authored AK assembly and install its local runtime asset.

Run from the repository:
  Blender --background --python-exit-code 1 --python assets/source/ak47/build.py

reload.py authors the selected grip from left-hand-case04.blend into ak47.blend.
The Idle NLA track retains the original ready pose.
This exporter does not regenerate anatomy, solve the grip, or author reloads.
"""
from pathlib import Path
import hashlib
import json
import shutil
import bpy

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
OUT = SOURCE / 'exports'
RUNTIME = ROOT / 'apps/client/public/assets/models/weapons/ak47-next'
BLEND = SOURCE / 'ak47.blend'
OUT.mkdir(exist_ok=True)
RUNTIME.mkdir(parents=True, exist_ok=True)

def md5(path):
    return hashlib.md5(path.read_bytes()).hexdigest()

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
# ponytail: cap embedded textures at 2K for GitHub's file limit; use external
# asset storage if higher-resolution runtime textures become necessary.
for image in bpy.data.images:
    width, height = image.size
    if max(width, height) > 2048:
        scale = 2048 / max(width, height)
        image.scale(max(1, round(width * scale)), max(1, round(height * scale)))
        image.pack()
scene = bpy.context.scene
scene.frame_set(1)
root = bpy.data.objects['AK47_Rig']
rig = bpy.data.objects['L_Armature']
for name in ['MuzzleSocket', 'EjectionSocket', 'SupportGripAnchor', 'MagazineSeatedAnchor', 'MagazineGripAnchor', 'ThumbPadContact']:
    if name not in bpy.data.objects:
        raise RuntimeError('Missing authored anchor: ' + name)
if not bpy.data.objects.get('R_Armature') or not bpy.data.objects['R_Armature'].data.bones.get('GripHand'):
    raise RuntimeError('The two-hand assembly requires the mirrored right pistol-grip hand')
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for ob in [root, *root.children_recursive]:
    ob.select_set(True)
export = OUT / 'ak47.glb'
bpy.ops.export_scene.gltf(
    filepath=str(export), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='NLA_TRACKS',
    export_force_sampling=True, export_anim_slide_to_zero=True,
    export_yup=True, export_extras=True,
)
# Source-space samples allow the capture tool to test glTF skinning parity.
positions = []
weight_errors = []
for ob in root.children_recursive:
    if ob.type != 'MESH' or not any(m.type == 'ARMATURE' for m in ob.modifiers):
        continue
    evaluated = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    positions.extend([list(ob.matrix_world @ v.co) for v in mesh.vertices])
    evaluated.to_mesh_clear()
    weight_errors.extend(abs(sum(g.weight for g in v.groups) - 1) for v in ob.data.vertices)
validation = {
    'joints': {bone.name: list(bone.head) for bone in rig.pose.bones},
    'deformedPositions': positions,
    'weightMaxError': max(weight_errors),
}
(OUT / 'idle-validation.json').write_text(json.dumps(validation) + '\n')
legacy = ROOT / 'apps/client/public/assets/models/weapons/ak47/ak47.glb'
hand = SOURCE / 'hand-base-cc0.blend'
textures = ['urban-b-albedo.png', 'urban-b-normal.png', 'urban-b-occlusion.png']
material_sources = []
for asset, names in [
    ('leather_red_02', ['leather_red_02_coll1_4k.jpg', 'leather_red_02_nor_gl_4k.jpg', 'leather_red_02_arm_4k.jpg']),
    ('dark_wood', ['dark_wood_diff_4k.jpg', 'dark_wood_nor_gl_4k.jpg', 'dark_wood_arm_4k.jpg']),
    ('leather_white', ['leather_white_diff_4k.jpg', 'leather_white_nor_gl_4k.jpg', 'leather_white_arm_4k.jpg']),
]:
    for name in names:
        material_sources.append({
            'file': 'assets/source/ak47/textures/' + name,
            'source': 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/' + asset + '/' + name,
            'asset': 'https://polyhaven.com/a/' + asset,
            'license': 'CC0-1.0', 'md5': md5(SOURCE / 'textures' / name),
        })
finish_images = set()
for ob in root.children_recursive:
    if ob.type != 'MESH':
        continue
    for material in ob.data.materials:
        if not material or not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image and node.image.filepath:
                image_path = Path(bpy.path.abspath(node.image.filepath)).resolve()
                if image_path.parent == SOURCE / 'textures' and image_path.suffix == '.png':
                    finish_images.add(image_path)
manifest = {
    'name': 'AK47 Urban Breacher two-hand viewmodel',
    'source': 'repo://assets/source/ak47/build.py',
    'sourceMd5': md5(Path(__file__)),
    'blendSource': 'repo://assets/source/ak47/ak47.blend',
    'blendMd5': md5(BLEND),
    'maxEmbeddedTextureSize': 2048,
    'license': 'Existing AK: CC-BY-NC-4.0; hand topology: CC0; new rig and finish: project-original',
    'dependencies': [
        {'file': str(legacy.relative_to(ROOT)), 'source': 'https://sketchfab.com/3d-models/ak-47-384565b1779c450b90397232163e4e6d', 'author': 'lokeig', 'license': 'CC-BY-NC-4.0', 'md5': md5(legacy), 'usage': 'Existing repository weapon geometry and textures retained'},
        {'file': str(hand.relative_to(ROOT)), 'source': 'https://www.blender.org/download/demo-files/', 'author': 'Dan Ulrich / Blender Studio', 'license': 'CC0', 'md5': md5(hand), 'usage': 'Anatomical topology, mirrored and rigged as a left hand'},
    ],
    'generatedTexture': {
        'usage': 'Previous color atlas retained as the source of the idle contact-occlusion bake; live materials use the close-view finish below',
        'source': 'OpenAI built-in image_gen; user-selected B Urban Breacher design',
        'license': 'Project-original (AI-generated)',
        'prompt': 'assets/source/ak47/imagegen-prompt.txt',
        'promptMd5': md5(SOURCE / 'imagegen-prompt.txt'),
        'files': [{'file': 'assets/source/ak47/textures/' + name, 'md5': md5(SOURCE / 'textures' / name)} for name in textures],
        'derivatives': 'Tangent normals and idle contact occlusion baked in Blender from the generated atlas and source geometry',
    },
    'closeViewFinish': {
        'source': 'repo://assets/source/ak47/refine.py',
        'sourceMd5': md5(SOURCE / 'refine.py'),
        'license': 'CC0 scan derivatives and project-original geometry/ripstop',
        'materialSources': material_sources,
        'textures': [{'file': str(path.relative_to(ROOT)), 'md5': md5(path)} for path in sorted(finish_images)],
        'construction': 'Subdivided anatomical glove, fine matte suede, continuous palm/thumb/fingertip reinforcement with double stitching, sewn leather closure and pull tab, rolled cuff binding, tailored ripstop sleeve, machined rifle edge radii',
        'runtimeLighting': '4096px animated self-shadows, 16x anisotropic filtering, reduced environment fill',
    },
    'coordinates': 'Metres; Blender +X forward, +Z up, -Y right; glTF +X forward, +Y up, +Z right',
    'runtimePose': {'position': [.151, -.143, -.30], 'roll': -.065, 'modelYaw': 1.5707963267948966, 'verticalFov': 54, 'aspect': 16 / 9},
    'attachments': ['MuzzleSocket', 'EjectionSocket', 'SupportGripAnchor', 'RightGripAnchor', 'GripHand', 'MagazineSeatedAnchor', 'MagazineGripAnchor', 'ThumbPadContact', 'ThumbPadContact1', 'ThumbPadContact2'],
    'rightHand': {
        'source': 'repo://assets/source/ak47/right_hand.py',
        'sourceMd5': md5(SOURCE / 'right_hand.py'),
        'construction': 'Accepted left glove and skeleton mirrored into a right hand with corrected face winding',
        'grip': 'Right/rear palm support, three curled fingers on the pistol grip, opposed thumb, index pad resting against the trigger',
        'animation': 'Rigid pistol-grip contact throughout idle, firing and reload',
    },
    'animations': ['Idle', 'Fire', 'Reload'],
    'reload': {
        'source': 'repo://assets/source/ak47/reload.py',
        'sourceMd5': md5(SOURCE / 'reload.py'),
        'selectedCase': 'case-04',
        'selectedGripSource': 'repo://assets/source/ak47/left-hand-case04.blend',
        'selectedGripSourceMd5': md5(SOURCE / 'left-hand-case04.blend'),
        'durationSeconds': 1.225,
        'contactFrames': [33, 119],
        'magazineMotion': 'Existing magazine path and keyframes preserved',
        'handMotion': 'Release fore-end, approach from below, wrap the magazine, follow its motion, release and return to approved idle',
        'gripLayout': 'Wrist below the magazine, palm cupping its lower broad face, four fingers rising around the curved front edge, thumb wrapping around the rear corner onto the far broad face',
        'thumbMotion': 'Selected Case 04 pose retained; CMC opens toward neutral, MCP/IP use the measured broad-pulp flex axes, and the original idle pose is restored',
        'contactValidation': 'User-approved visual pose; known static contact and close-view trim limitations are documented in docs/reload_animation.md',
        'contactShading': 'Idle occlusion fades during hand travel; live self-shadows follow the reload',
    },
    'files': [{'file': export.name, 'md5': md5(export)}],
}
(OUT / 'provenance.json').write_text(json.dumps(manifest, indent=2) + '\n')
shutil.copyfile(export, RUNTIME / 'ak47.glb')
shutil.copyfile(OUT / 'provenance.json', RUNTIME / 'provenance.json')
print(json.dumps({'source': str(BLEND), 'runtime': str(RUNTIME / 'ak47.glb'), 'md5': md5(export), 'weightMaxError': validation['weightMaxError']}))
