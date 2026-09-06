"""Build the finite SC-V closed screen, in metres. Front -Y, rear plane Y=0.

blender --background --factory-startup --python build.py -- --root REPO [--clay]
The editable source retains named joinery. Only the SC-V assembly is exported.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import struct
import sys
import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--clay', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
ROOT = args.root.resolve()
SOURCE = Path(__file__).resolve().parent
OUT = SOURCE / 'exports'
OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1
bpy.context.preferences.filepaths.save_version = 0
materials = []
dependencies = []
for name, multiplier in [('SC-V | oiled timber and iron', 1), ('SC-V | closed dark backing', .24)]:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    if multiplier != 1:
        bsdf.inputs['Base Color'].default_value = (.043, .026, .014, 1)
        bsdf.inputs['Roughness'].default_value = .92
        materials.append(mat)
        continue
    for suffix, socket in [('albedo', 'Base Color'), ('roughness', 'Roughness'), ('normal', 'Normal')]:
        source = ROOT / f'assets/source/b18-counters/exports/b18-counter-{suffix}.png'
        target = OUT / source.name
        if not args.clay:
            shutil.copyfile(source, target)
        image = bpy.data.images.load(str(source), check_existing=True)
        if suffix != 'albedo':
            image.colorspace_settings.name = 'Non-Color'
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = image
        if suffix == 'normal':
            normal = nodes.new('ShaderNodeNormalMap')
            links.new(texture.outputs['Color'], normal.inputs['Color'])
            links.new(normal.outputs['Normal'], bsdf.inputs[socket])
        else:
            links.new(texture.outputs['Color'], bsdf.inputs[socket])
        if len(materials) == 0:
            dependencies.append({'file': str(source.relative_to(ROOT)), 'source': 'repo://assets/source/b18-counters/build.py', 'license': 'Project-Original', 'md5': hashlib.md5(source.read_bytes()).hexdigest()})
    materials.append(mat)

objects = []
def box(name, center, size, surface='wood', bevel=.002, backing=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    ob = bpy.context.object
    ob.name = 'SC-V | ' + name
    ob.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(materials[1 if backing else 0])
    major = max(range(3), key=lambda i: size[i])
    for polygon in ob.data.polygons:
        minor = max((i for i in range(3) if i != major and abs(polygon.normal[i]) < .9), key=lambda i: size[i], default=(major + 1) % 3)
        for loop in polygon.loop_indices:
            co = ob.data.vertices[ob.data.loops[loop].vertex_index].co
            # Grain follows the long member; one metre spans one shared atlas height.
            u = .13 + co[minor] / max(size[minor], .12) * .32
            v = .48 + co[major] / 1.5
            if surface == 'iron':
                uv = (.948 + .016 * co[minor] / size[minor], .12 + .08 * co[major] / size[major])
            else:
                uv = (max(.012, min(.488, u)), max(.012, min(.988, v)))
            ob.data.uv_layers.active.data[loop].uv = uv
    if bevel:
        mod = ob.modifiers.new('Eased joinery edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        ob.modifiers.new('Weighted joinery normals', 'WEIGHTED_NORMAL')
    objects.append(ob)
    return ob

# The four frame corners meet the rear wall plane; jamb/head shoulders hide the rebate.
box('opaque full back', (0, -.014, .70), (.88, .024, 1.30), bevel=0, backing=True)
for side, x in [('left', -.455), ('right', .455)]:
    box(side + ' mounting jamb', (x, -.082, .70), (.09, .164, 1.20))
    box(side + ' front architrave', (x, -.176, .73), (.07, .032, 1.26))
box('head with seated shoulders', (0, -.084, 1.35), (.98, .168, .10))
box('head face moulding', (0, -.184, 1.325), (.90, .028, .035), bevel=.003)
# Two parallel sill members leave an underside drip channel, with a continuous sloping cap.
box('sill rear load bearing bed', (0, -.10, .038), (1.0, .20, .076), bevel=.002)
box('sill nose below drip', (0, -.23, .048), (1.0, .020, .056), bevel=.002)
box('sill continuous weather cap', (0, -.12, .085), (1.0, .24, .030), bevel=.002)
box('sill raised inner stop', (0, -.078, .118), (.88, .105, .036))
for side, low, high in [('left', -.408, -.010), ('right', .010, .408)]:
    midpoint = (low + high) / 2
    for label, x in [('hinge stile', low + .023), ('meeting stile', high - .023)]:
        box(side + ' leaf ' + label, (x, -.137, .72), (.046, .058, 1.15))
    for label, z in [('bottom rail', .174), ('top rail', 1.266)]:
        box(side + ' leaf ' + label, (midpoint, -.137, z), (high - low - .092, .058, .058))
    box(side + ' closed lower service panel', (midpoint, -.105, .275), (high - low - .092, .026, .145), bevel=.002)
    box(side + ' service panel upper rail', (midpoint, -.137, .362), (high - low - .092, .058, .030))
    # Vertical ventilating slats are held in the existing leaf's rails.
    for i in range(7):
        x = low + .061 + i * ((high-low-.122)/6)
        box(f'{side} vertical slat {i+1}',(x,-.13,.807),(.023,.032,.874),bevel=.001)
    hinge_x = low + .02 if side == 'left' else high - .02
    for index, z in enumerate([.28, 1.14]):
        box(f'{side} hinge {index} strap', (hinge_x, -.171, z), (.07, .012, .035), surface='iron', bevel=.001)
        box(f'{side} hinge {index} knuckle', (hinge_x, -.180, z), (.014, .022, .063), surface='iron', bevel=.001)
box('closed service latch bridge', (0, -.182, .285), (.105, .018, .023), surface='iron', bevel=.001)
box('service latch drop keeper', (.040, -.189, .273), (.018, .012, .049), surface='iron', bevel=.001)
for x in [-.455, .455]:
    for z in [.14, 1.30]:
        ob = bpy.data.objects.new(f'SC-V | mount corner {x:+.3f} {z:.2f}', None)
        bpy.context.collection.objects.link(ob)
        ob.location = (x, 0, z)
        ob.empty_display_size = .025
        ob.hide_render = True

# Source keeps editable objects and unapplied bevels. Review lighting is not exported.
for image in bpy.data.images:
    if image.source == 'FILE':
        image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'textile-screen-sc-v.blend'))

bpy.ops.object.select_all(action='DESELECT')
for ob in objects:
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    for modifier in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.join()
ob = bpy.context.object
ob.name = 'textile-screen-sc-v'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
ob.data.calc_loop_triangles()
triangles = len(ob.data.loop_triangles)
bounds = [[min(v.co[i] for v in ob.data.vertices), max(v.co[i] for v in ob.data.vertices)] for i in range(3)]
assert triangles <= 2500, triangles
assert len(ob.data.materials) <= 2, len(ob.data.materials)
for actual, expected in zip(bounds, [[-.5, .5], [-.24, 0], [0, 1.4]]):
    assert all(abs(a - e) < 1e-5 for a, e in zip(actual, expected)), bounds
assert len(ob.data.uv_layers) == 1
assert all(math.isfinite(float(c)) for uv in ob.data.uv_layers.active.data for c in uv.uv)
assert all(poly.area > 0 and abs(poly.normal.length - 1) < 1e-5 for poly in ob.data.polygons)
glb = OUT / 'textile-screen-sc-v.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
raw = glb.read_bytes()
length, kind = struct.unpack_from('<II', raw, 12)
doc = json.loads(raw[20:20 + length])
assert len(doc['meshes']) == 1
assert all(not any(key in node for key in ('matrix', 'translation', 'rotation', 'scale')) for node in doc['nodes'])
position_accessors = [doc['accessors'][primitive['attributes']['POSITION']] for primitive in doc['meshes'][0]['primitives']]
gltf_bounds = [[min(accessor['min'][i] for accessor in position_accessors), max(accessor['max'][i] for accessor in position_accessors)] for i in range(3)]
for actual, expected in zip(gltf_bounds, [[-.5, .5], [0, 1.4], [0, .24]]):
    assert all(abs(a - e) < 1e-5 for a, e in zip(actual, expected)), gltf_bounds
assert len(doc['images']) == 3
assert len(doc['materials']) == 2
assert any(m.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1])[0] < .05 for m in doc['materials']), 'Runtime backing must remain dark'
assert all(m.get('alphaMode', 'OPAQUE') == 'OPAQUE' for m in doc['materials'])
assert sum(doc['accessors'][p['indices']]['count'] // 3 for p in doc['meshes'][0]['primitives']) == triangles
report = {'asset': 'textile-screen-sc-v', 'variant': 'SC-V', 'license': 'Project-Original', 'unit': 'metre', 'sourceFrame': '+X across, +Z up, front -Y; rear mounting plane Y=0; base Z=0', 'sourceBounds': bounds, 'gltfFrame': '+X across, +Y up, front +Z', 'gltfWorldBounds': gltf_bounds, 'loaderBoundsCenter': [0, .7, .12], 'loaderRecenteredRearPlane': 'local Z=-0.12', 'triangles': triangles, 'materials': len(doc['materials']), 'textureResolution': [1024, 1024], 'closedOpaqueBacking': True, 'checks': ['complete source envelope', 'actual GLB mounting bounds and untransformed axes', 'finite UVs', 'nondegenerate faces and unit normals', 'actual GLB triangle count', 'opaque materials', 'one exported mesh'], 'glbMd5': hashlib.md5(raw).hexdigest(), 'dependencies': dependencies, 'upstreamProvenance': json.loads((ROOT / 'assets/source/b18-counters/exports/provenance.json').read_text())['dependencies']}
(OUT / 'provenance.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))


# SH-P: the assigned walnut-paneled upper window, at its full native envelope.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
objects.clear()
box('SH-P opaque back',(0,-.014,.825),(1.46,.028,1.55),backing=True,bevel=0)
for x in [-.745,.745]:box('SH-P seated jamb',(x,-.08,.825),(.11,.16,1.45))
box('SH-P head',(0,-.085,1.6),(1.60,.17,.10))
box('SH-P head moulding',(0,-.19,1.575),(1.49,.035,.036))
box('SH-P sill bed',(0,-.105,.045),(1.60,.21,.09))
box('SH-P sill weather cap',(0,-.12,.10),(1.60,.24,.04))
for side,x in [('left',-.35),('right',.35)]:
    for dx in [-.305,.305]:box(side+' shutter stile',(x+dx,-.145,.825),(.065,.07,1.40))
    for z in [.158,.825,1.492]:box(side+' shutter rail',(x,-.145,z),(.55,.07,.065))
    for z in [.49,1.16]:
        box(side+' recessed walnut panel',(x,-.123,z),(.545,.03,.595),bevel=.003)
        for dx in [-.255,.255]:box(side+' panel bead',(x+dx,-.153,z),(.02,.022,.58),bevel=.001)
    for z in [.32,1.33]:box(side+' iron hinge',(x+(-.30 if x<0 else .30),-.19,z),(.11,.015,.038),'iron',bevel=.001)
box('SH-P forged latch',(0,-.20,.79),(.16,.02,.028),'iron',bevel=.001)
for x in [-.06,.06]:box('SH-P pull',(x,-.212,.835),(.018,.020,.09),'iron',bevel=.002)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'shutter-paneled.blend'))
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:
    ob.select_set(True);bpy.context.view_layer.objects.active=ob
    for modifier in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=bpy.context.object
ob.name='shutter-paneled';bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
ob.data.calc_loop_triangles();assert len(ob.data.loop_triangles)<=2500
bpy.ops.export_scene.gltf(filepath=str(OUT/'shutter-paneled.glb'),export_format='GLB',use_selection=True,export_yup=True)
PUBLIC=ROOT/'apps/client/public/assets/models/environment/bazaar/props/textile_openings'
PUBLIC.mkdir(parents=True,exist_ok=True)
for path in OUT.iterdir():
    if path.suffix in ('.png','.glb','.json'):shutil.copy2(path,PUBLIC/path.name)
