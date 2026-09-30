"""Export the authored AK assembly and install its local runtime asset.

Run from the repository:
  Blender --background --python-exit-code 1 --python assets/source/ak47/build.py

viewmodel_v2.py authors the arm budget, finish, the anatomical idle support grip and
the magazine-only Reload clip into ak47.blend; glove_finish.py then adds the moulded
knuckle guards, sleeve folds and the baked glove, trim and sleeve atlases. The reload marks it was authored to are
checked here against apps/client/src/runtime/weapons/ak47ReloadMarks.ts.
This exporter does not regenerate anatomy, solve the grip, or author reloads.
Pass -- --blend PATH to export a review copy instead of ak47.blend.
"""
from pathlib import Path
import hashlib
import json
import math
import re
import shutil
import sys
import bpy

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
OUT = SOURCE / 'exports'
RUNTIME = ROOT / 'apps/client/public/assets/models/weapons/ak47-next'
BLEND = Path(sys.argv[sys.argv.index('--blend') + 1]).resolve() if '--blend' in sys.argv else SOURCE / 'ak47.blend'
OUT.mkdir(exist_ok=True)
RUNTIME.mkdir(parents=True, exist_ok=True)

def md5(path):
    return hashlib.md5(path.read_bytes()).hexdigest()

def reload_marks():
    """The marks ak47.blend was authored to; they must still match the TypeScript source of truth."""
    text = (ROOT / 'apps/client/src/runtime/weapons/ak47ReloadMarks.ts').read_text()
    duration = re.search(r'export const AK47_RELOAD_DURATION_S\s*=\s*([0-9]*\.?[0-9]+)\s*;', text)
    block = re.search(r'export const AK47_RELOAD_MARKS\s*=\s*Object\.freeze\(\{(.*?)\}\);', text, re.S)
    if not duration or not block:
        raise RuntimeError('Cannot parse ak47ReloadMarks.ts')
    marks = {k: float(v) for k, v in re.findall(r'^\s*([A-Za-z_]\w*)\s*:\s*([0-9]*\.?[0-9]+)\s*,?\s*$', block.group(1), re.M)}
    authored = json.loads(bpy.context.scene.get('reloadMarks', '{}'))
    if authored != {'durationSeconds': float(duration.group(1)), **marks}:
        raise RuntimeError(f'ak47.blend was authored to {authored}; ak47ReloadMarks.ts now says {marks}. Re-run viewmodel_v2.py.')
    return authored

def runtime_pose():
    """Viewmodel placement as the runtime applies it (Ak47AnimatedViewModel.ts is the source of truth)."""
    text = (ROOT / 'apps/client/src/runtime/weapons/Ak47AnimatedViewModel.ts').read_text()
    position = re.search(r'const BASE_POSITION = new Vector3\(([^)]*)\);', text)
    roll = re.search(r'const BASE_ROLL = (-?[0-9]*\.?[0-9]+);', text)
    scale = re.search(r'const VIEWMODEL_SCALE = ([0-9]*\.?[0-9]+);', text)
    fov = re.search(r'viewModelCamera = new PerspectiveCamera\(([0-9.]+),', text)
    yaw = re.search(r'this\.modelRoot\.rotation\.y = Math\.PI / 2;', text)
    if not (position and roll and scale and fov and yaw):
        raise RuntimeError('Cannot parse the viewmodel placement from Ak47AnimatedViewModel.ts')
    return {'position': [float(v) for v in position.group(1).split(',')], 'roll': float(roll.group(1)),
            'scale': float(scale.group(1)), 'modelYaw': math.pi / 2, 'verticalFov': float(fov.group(1)), 'aspect': 16 / 9,
            'source': 'repo://apps/client/src/runtime/weapons/Ak47AnimatedViewModel.ts'}

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
if not bpy.context.scene.get('glove_finish'):
    raise RuntimeError(str(BLEND) + ' has no glove finish; run glove_finish.py after viewmodel_v2.py')
marks = reload_marks()
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
    export_image_format='JPEG', export_jpeg_quality=90,
)

def step_magazine_scales(path):
    """The exporter samples every channel as LINEAR, so a magazine's show/hide scale key draws a part-size magazine
    between two frames (and puts the glove inside it). Magazines are shown at full size or hidden: their Reload
    scale channels are rewritten as STEP (the per-frame values are unchanged)."""
    data = path.read_bytes()
    json_len = int.from_bytes(data[12:16], 'little')
    gltf = json.loads(data[20:20 + json_len])
    rest = data[20 + json_len:]
    names = {i: node.get('name') for i, node in enumerate(gltf['nodes'])}
    stepped = 0
    for animation in gltf.get('animations', []):
        if animation.get('name') != 'Reload':
            continue
        for channel in animation['channels']:
            if channel['target']['path'] == 'scale' and names.get(channel['target'].get('node')) in ('Magazine', 'MagazineSpare'):
                animation['samplers'][channel['sampler']]['interpolation'] = 'STEP'
                stepped += 1
    if stepped != 2:
        raise RuntimeError(f'Expected the Reload scale channels of Magazine and MagazineSpare, found {stepped}')
    chunk = json.dumps(gltf, separators=(',', ':')).encode()
    chunk += b' ' * ((4 - len(chunk) % 4) % 4)
    body = len(chunk).to_bytes(4, 'little') + b'JSON' + chunk + rest
    path.write_bytes(data[:8] + (12 + len(body)).to_bytes(4, 'little') + body)

step_magazine_scales(export)
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
legacy = SOURCE / 'legacy/ak47.glb'
hand = SOURCE / 'hand-base-cc0.blend'
textures = ['urban-b-albedo.png', 'urban-b-normal.png', 'urban-b-occlusion.png']
material_sources = []
for asset, names in [
    ('leather_red_02', ['leather_red_02_coll1_4k.jpg', 'leather_red_02_nor_gl_4k.jpg', 'leather_red_02_arm_4k.jpg']),
    ('dark_wood', ['dark_wood_diff_4k.jpg', 'dark_wood_nor_gl_4k.jpg', 'dark_wood_arm_4k.jpg']),
    ('leather_white', ['leather_white_diff_4k.jpg', 'leather_white_nor_gl_4k.jpg', 'leather_white_arm_4k.jpg']),
    ('bi_stretch', ['bi_stretch_diff_2k.jpg', 'bi_stretch_nor_gl_2k.jpg', 'bi_stretch_arm_2k.jpg']),
    ('scuba_suede', ['scuba_suede_diff_2k.jpg', 'scuba_suede_nor_gl_2k.jpg', 'scuba_suede_arm_2k.jpg']),
    ('jersey_melange', ['jersey_melange_diff_2k.jpg', 'jersey_melange_nor_gl_2k.jpg', 'jersey_melange_arm_2k.jpg']),
]:
    for name in names:
        resolution = name.rsplit('_', 1)[1].split('.')[0]
        material_sources.append({
            'file': 'assets/source/ak47/textures/' + name,
            'source': 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/' + resolution + '/' + asset + '/' + name,
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
        'construction': 'Decimated anatomical glove with continuous palm/thumb/fingertip reinforcement, double stitching, sewn closure and pull tab, rolled cuff binding, tailored ripstop sleeve, machined rifle edge radii; glove, trims and sleeve finished by glove_finish.py (below)',
        'runtimeLighting': 'World-sampled sun key with shade detection, 2048px animated self-shadows, 16x anisotropic filtering',
    },
    'gloveFinish': {
        'source': 'repo://assets/source/ak47/glove_finish.py',
        'sourceMd5': md5(SOURCE / 'glove_finish.py'),
        'report': json.loads(bpy.context.scene.get('gloveFinishReport', '{}')),
        'construction': 'Moulded TPR knuckle guards (four-segment MCP bridge, flex-grooved proximal and thumb guards) on both hands; compression folds displaced into the sleeve at the cuff; charcoal knit shell with side seams, stitch rows, PIP accordion flex ribs and joint creases; ribbed elastic cuff; wolf-grey synthetic suede palm with flexion creases, silicone fingertip grip print and contact abrasion; quilted graphite dorsal panel with a printed claw mark; coyote hook-and-loop strap and embossed rubber pull tab; charcoal knit binding; olive ripstop sleeve with fold creases, drape folds, fading and dust',
        'bakes': 'Cycles in the rest pose: per-texel surface position and normal, ambient occlusion with every arm part present, high-to-low tangent normals and curvature of the sculpted guards; idle-pose contact occlusion of the left glove (with over without the rifle). The sculpt layer is evaluated on the baked surface and converted to tangent normals and cavity',
        'atlases': 'Glove (UVMap), trims and guards (BakeUV), sleeve (cylindrical BakeUV), each 2048 px colour, normal and ORM shared by both hands; ORM blue carries the left glove contact occlusion (metallic factor 0)',
        'materials': 'KHR_materials_sheen on the knit shell, cuff, suede, binding, strap and sleeve; persistent glTF occlusion on every arm material; the runtime multiplies the contact term in and fades it while the hand is away',
    },
    'coordinates': 'Metres; Blender +X forward, +Z up, -Y right; glTF +X forward, +Y up, +Z right',
    'runtimePose': runtime_pose(),
    'attachments': ['MuzzleSocket', 'EjectionSocket', 'SupportGripAnchor', 'RightGripAnchor', 'GripHand', 'MagazineSeatedAnchor', 'MagazineGripAnchor', 'ThumbPadContact', 'ThumbPadContact1', 'ThumbPadContact2'],
    'rightHand': {
        'source': 'repo://assets/source/ak47/right_hand.py',
        'sourceMd5': md5(SOURCE / 'right_hand.py'),
        'construction': 'Accepted left glove and skeleton mirrored into a right hand with corrected face winding; guards lifted onto the right glove from the left patches; trims sample the left atlases through the mirror',
        'grip': 'Right/rear palm support, three curled fingers on the pistol grip, opposed thumb, index pad resting against the trigger',
        'animation': 'Rigid pistol-grip contact throughout idle, firing and reload',
    },
    'animations': ['Idle', 'Fire', 'Reload'],
    'reload': {
        'source': 'repo://assets/source/ak47/viewmodel_v2.py',
        'sourceMd5': md5(SOURCE / 'viewmodel_v2.py'),
        'clips': {'Reload': marks['durationSeconds']},
        'timeline': 'repo://apps/client/src/runtime/weapons/ak47ReloadMarks.ts',
        'audioMarks': {k: v for k, v in marks.items() if k != 'durationSeconds'},
        'sequence': 'Magazine change only, no charging handle: the support hand drops off the handguard as a loose grasp and seats on the magazine with a short slide, fingers wrapped round the front edge; the thumb tip reaches back to the paddle and presses it into the release click while the hand stays put; right after the click the thumb comes off the paddle round the rear corner and is curled on the magazine\'s near face by release + 35 ms, so the magazine is held between thumb and fingers; the magazine rocks forward about its front lug while the pull down and back-left carries it out of the bottom-left of frame; the fresh magazine (top round showing) is held the same way, thumb curled on its near face, comes up on one front-loaded arc from off screen, slows into the lug hook (thumb press), rocks back into the latch (rounds count from the latch), a seat tap with a thumb press, then the grip opens, the hand returns and the rifle untilts with a damped overshoot',
        'magazines': 'Magazine rocks about its front lug (0.008, 0, 0.055) in AK47_Rig space; MagazineSpare is the fresh magazine with a MagazineSpare_TopRound child; the two swap invisibly at the latch, co-located at the seat',
        'rifleMotion': 'Tilt and presentation authored in the clip on AK47_Rig, pivoting about the pistol grip, with small damped reactions to the paddle push, the yank, the incoming magazine, the hook, the pre-seat anticipation and the seat tap; no runtime procedural tilt',
        'handMotion': 'Left arm solved by IK against hand targets with the shoulder held in camera space, baked to FK; the forearm carries the full roll (wrist twist 0), 0.65 of it at L_forearm and the remaining 0.35 at the L_forearm.001 twist bone; transitions travel arc-length paths at one speed profile with the wrist relation to the forearm interpolated; digit clearance and triangle crossings checked under the exported 4-influence skinning',
        'grips': {
            'helper': {'file': 'assets/source/ak47/hand_pose.py', 'md5': md5(SOURCE / 'hand_pose.py'), 'usage': 'Anatomical joint angles to digit quaternions (thumb MCP/IP flex about the calibrated pad hinge)'},
            'specs': [{'file': 'assets/source/ak47/grips/' + p.name, 'md5': md5(p)} for p in sorted((SOURCE / 'grips').glob('*.json'))],
            'usage': 'reload-fit (v3): the magazine grips in use (hand_in_mag, fingers, thumb hold/press/via/hover/squeeze/let-go states, travel shape, rifle tilt, pull path), fitted under the exported skinning; remove/insert/reach: the earlier approved grips, kept for provenance (superseded placement and thumb); idle: re-authored handguard support grip and its placement off the wood',
        },
        'armTriangles': '%d for both arms with the guards and sleeve folds (source 634k)' % json.loads(bpy.context.scene.get('gloveFinishReport', '{}')).get('armTriangles', 0),
    },
    'files': [{'file': export.name, 'md5': md5(export)}],
}
(OUT / 'provenance.json').write_text(json.dumps(manifest, indent=2) + '\n')
shutil.copyfile(export, RUNTIME / 'ak47.glb')
shutil.copyfile(OUT / 'provenance.json', RUNTIME / 'provenance.json')
print(json.dumps({'source': str(BLEND), 'runtime': str(RUNTIME / 'ak47.glb'), 'md5': md5(export), 'weightMaxError': validation['weightMaxError']}))
