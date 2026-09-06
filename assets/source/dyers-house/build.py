"""Build the finite SC-D closed screen, in metres. Front -Y, rear plane Y=0.

blender --background --factory-startup --python build.py -- --root REPO [--clay]
The editable source retains named joinery. Only the SC-D assembly is exported.
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
for name, multiplier in [('SC-D | oiled timber and iron', 1), ('SC-D | closed dark backing', .24)]:
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
    ob.name = 'SC-D | ' + name
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
    # Clipped diagonal bars terminate inside the enclosing rails and stiles.
    xmin, xmax, zmin, zmax = low + .040, high - .040, .367, 1.244
    for direction in [-1, 1]:
        slope = direction
        intercept_min = zmin - max(slope * xmin, slope * xmax)
        intercept_max = zmax - min(slope * xmin, slope * xmax)
        count = math.ceil((intercept_max - intercept_min) / .14)
        for i in range(count):
            intercept = intercept_min + .07 + i * .14
            points = []
            for x in [xmin, xmax]:
                z = slope * x + intercept
                if zmin <= z <= zmax:
                    points.append(Vector((x, -.124 if direction == 1 else -.140, z)))
            for z in [zmin, zmax]:
                x = (z - intercept) / slope
                if xmin < x < xmax:
                    points.append(Vector((x, -.124 if direction == 1 else -.140, z)))
            if len(points) != 2 or (points[1] - points[0]).length < .025:
                continue
            a, b = points
            bar = box(f'{side} lattice {direction:+d} {i:02d}', (a + b) / 2, (.023, .020, (b - a).length), bevel=0)
            bar.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    hinge_x = low + .02 if side == 'left' else high - .02
    for index, z in enumerate([.28, 1.14]):
        box(f'{side} hinge {index} strap', (hinge_x, -.171, z), (.07, .012, .035), surface='iron', bevel=.001)
        box(f'{side} hinge {index} knuckle', (hinge_x, -.180, z), (.014, .022, .063), surface='iron', bevel=.001)
box('closed service latch bridge', (0, -.182, .285), (.105, .018, .023), surface='iron', bevel=.001)
box('service latch drop keeper', (.040, -.189, .273), (.018, .012, .049), surface='iron', bevel=.001)
for x in [-.455, .455]:
    for z in [.14, 1.30]:
        ob = bpy.data.objects.new(f'SC-D | mount corner {x:+.3f} {z:.2f}', None)
        bpy.context.collection.objects.link(ob)
        ob.location = (x, 0, z)
        ob.empty_display_size = .025
        ob.hide_render = True

# Source keeps editable objects and unapplied bevels. Review lighting is not exported.
for image in bpy.data.images:
    if image.source == 'FILE':
        image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'dyers-screen-sc-d.blend'))

bpy.ops.object.select_all(action='DESELECT')
for ob in objects:
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    for modifier in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.join()
ob = bpy.context.object
ob.name = 'dyers-screen-sc-d'
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
glb = OUT / 'dyers-screen-sc-d.glb'
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
report = {'asset': 'dyers-screen-sc-d', 'variant': 'SC-D', 'license': 'Project-Original', 'unit': 'metre', 'sourceFrame': '+X across, +Z up, front -Y; rear mounting plane Y=0; base Z=0', 'sourceBounds': bounds, 'gltfFrame': '+X across, +Y up, front +Z', 'gltfWorldBounds': gltf_bounds, 'loaderBoundsCenter': [0, .7, .12], 'loaderRecenteredRearPlane': 'local Z=-0.12', 'triangles': triangles, 'materials': len(doc['materials']), 'textureResolution': [1024, 1024], 'closedOpaqueBacking': True, 'checks': ['complete source envelope', 'actual GLB mounting bounds and untransformed axes', 'finite UVs', 'nondegenerate faces and unit normals', 'actual GLB triangle count', 'opaque materials', 'one exported mesh'], 'glbMd5': hashlib.md5(raw).hexdigest(), 'dependencies': dependencies, 'upstreamProvenance': json.loads((ROOT / 'assets/source/b18-counters/exports/provenance.json').read_text())['dependencies']}
(OUT / 'provenance.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))

# Two finite service pieces share the house's joinery and sealed backing.
for model, size in [('dyers-loft-vent',(.58,.12,.48)),('dyers-roof-hatch',(1.,1.,.18))]:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    objects.clear()
    if model.endswith('vent'):
        box('sealed vent back',(0,-.015,.24),(.58,.03,.48),backing=True,bevel=0)
        for x in [-.26,.26]:box('vent jamb',(x,-.065,.24),(.06,.11,.48))
        for z in [.035,.445]:box('vent weather rail',(0,-.06,z),(.46,.12,.07))
        for z in [.12,.20,.28,.36]:
            ob=box('downturned vent louvre',(0,-.075,z),(.46,.08,.028),bevel=.002);ob.rotation_euler.x=.20
    else:
        box('closed hatch curb',(0,0,.035),(1.,1.,.07),backing=True,bevel=.003)
        for x in [-.45,.45]:box('hatch side bearer',(x,0,.11),(.1,1.,.12))
        for i in range(7):box('closed hatch leaf board',(-.36+i*.12,0,.135),(.117,.96,.065))
        for z in [-.31,.31]:box('hatch strap',(0,z,.1725),(.80,.045,.015),'iron',bevel=.001)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / (model+'.blend')))
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True);bpy.context.view_layer.objects.active=ob
        for modifier in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    ob=bpy.context.object;ob.name=model;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(model+'.glb')),export_format='GLB',use_selection=True,export_yup=True)
PUBLIC=ROOT/'apps/client/public/assets/models/environment/bazaar/props/dyers_house'
PUBLIC.mkdir(parents=True,exist_ok=True)
for path in OUT.iterdir():
    if path.suffix in ('.png','.glb','.json'):shutil.copy2(path,PUBLIC/path.name)
