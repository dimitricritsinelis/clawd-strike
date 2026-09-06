"""B18 closed roof-access room, original mesh with installed CC0 PBR dependencies.
Run: blender -b --factory-startup --python build.py -- --repo /path/to/clawdstrike --clay
After clay review, omit --clay to build packed editable source and the final GLB.
Source metres: +X east, +Y north, +Z up; design origin (54.6, 40.9, 4.76).
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
import bpy
import bmesh
import numpy as np
from mathutils import Vector

args = argparse.ArgumentParser()
args.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[3])
args.add_argument('--clay', action='store_true')
args.add_argument('--render', action='store_true')
opt = args.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
ROOT = opt.repo.resolve()
HERE = Path(__file__).resolve().parent
OUT = HERE / ('clay' if opt.clay else 'export')
OUT.mkdir(parents=True, exist_ok=True)
WALLS = ROOT / 'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.context.preferences.filepaths.save_version = 0
DEPENDENCIES = []

# Each region uses its installed material's metre scale. UV seams are split at
# region repeat boundaries, so long walls never sample a neighboring atlas tile.
SCALES = (1.25, 2.0, 1.15, 1.25, 2.0, .5, .5, .5)
MATERIALS = []

def load_pixels(family, suffix):
    path = WALLS / family / f'{family}_{suffix}_1k.jpg'
    image = bpy.data.images.load(str(path), check_existing=True)
    if suffix != 'diff':
        image.colorspace_settings.name = 'Non-Color'
    pixels = np.asarray(image.pixels[:], dtype=np.float32).reshape(image.size[1], image.size[0], 4)
    DEPENDENCIES.append({'file': str(path.relative_to(ROOT)), 'source': f'https://polyhaven.com/a/{family}',
                         'license': 'CC0-1.0', 'md5': hashlib.md5(path.read_bytes()).hexdigest()})
    # Crop material surface, excluding photographed mortar and timber crossrails.
    # Repetition retains the source's native 2 m / 1024 px scale in the atlas.
    if family == 'white_sandstone_blocks_02':
        pixels = np.tile(pixels[645:709, 350:414], (16, 16, 1))
    elif family == 'rough_pine_door':
        pixels = np.tile(pixels[554:994, 40:104], (3, 16, 1))[:1024]
    return pixels

def packed_image(name, pixels, noncolor):
    image = bpy.data.images.new(name, width=1024, height=1024, alpha=False)
    if noncolor:
        image.colorspace_settings.name = 'Non-Color'
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = str(OUT / (name + '.png'))
    image.file_format = 'PNG'
    image.save()
    image.pack()
    return image

def material(name, families):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bs = nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value = .88
    if opt.clay:
        bs.inputs['Base Color'].default_value = (.48, .48, .48, 1)
        MATERIALS.append(mat)
        return
    channels = {key: np.ones((1024, 1024, 4), dtype=np.float32) for key in ('albedo', 'normal', 'arm')}
    for tile, entry in enumerate(families):
        family, tint, normal_strength, roughness = entry
        row, col = divmod(tile, 2)
        dest = (slice(row * 512, (row + 1) * 512), slice(col * 512, (col + 1) * 512))
        if family is None:
            for key in channels:
                value = tint if key == 'albedo' else ((.5, .5, 1) if key == 'normal' else (1, roughness, .75 if tile == 1 else 0))
                channels[key][dest][:, :, :3] = value
            continue
        for key, suffix in [('albedo', 'diff'), ('normal', 'nor_gl'), ('arm', 'arm')]:
            pixels = load_pixels(family, suffix)
            # Fixed 2:1 box reduction keeps the installed 1k source deterministic.
            pixels = pixels.reshape(512, 2, 512, 2, 4).mean(axis=(1, 3))
            if key == 'albedo':
                pixels[:, :, :3] *= np.asarray(tint)
            elif key == 'normal':
                vec = pixels[:, :, :3] * 2 - 1
                vec[:, :, :2] *= normal_strength
                vec /= np.linalg.norm(vec, axis=2, keepdims=True)
                pixels[:, :, :3] = vec * .5 + .5
            else:
                pixels[:, :, 1] = np.clip(pixels[:, :, 1] * roughness, .42, 1)
                pixels[:, :, 2] = 0
            channels[key][dest] = pixels
    textures = {}
    for key, pixels in channels.items():
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = packed_image(name.split(' |')[0].lower() + '_' + key, pixels, key != 'albedo')
        textures[key] = tex
    links.new(textures['albedo'].outputs['Color'], bs.inputs['Base Color'])
    normal = nodes.new('ShaderNodeNormalMap')
    links.new(textures['normal'].outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], bs.inputs['Normal'])
    sep = nodes.new('ShaderNodeSeparateColor')
    links.new(textures['arm'].outputs['Color'], sep.inputs['Color'])
    links.new(sep.outputs['Green'], bs.inputs['Roughness'])
    links.new(sep.outputs['Blue'], bs.inputs['Metallic'])
    # The glTF exporter recognizes this AO input and packs the installed ARM map.
    group = bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    if not group.interface.items_tree:
        group.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    output = nodes.new('ShaderNodeGroup')
    output.node_tree = group
    links.new(sep.outputs['Red'], output.inputs['Occlusion'])
    MATERIALS.append(mat)

material('B18 masonry | installed plaster stone ochre', [
    ('painted_plaster_wall', (.89, .85, .78), .42, .92),
    ('white_sandstone_blocks_02', (.97, .93, .86), .55, .92),
    ('worn_plaster_wall', (.84, .76, .65), .48, .92),
    (None, (.30, .28, .24), 0, .98),
])
material('B18 joinery | pine iron sealed shadow', [
    ('rough_pine_door', (.76, .70, .58), .5, .86),
    (None, (.075, .071, .063), 0, .57),
    (None, (.035, .032, .027), 0, .98),
    (None, (.25, .21, .15), 0, .87),
])

# Named solid blocks retain actual wall/stone/timber thickness in the .blend.
def box(name, lo, hi, tile=0, bevel=0, grain_axis=None):
    verts, faces, face_uv, vertex_index = [], [], [], {}
    scale = SCALES[tile]
    atlas_tile = tile % 4
    def vertex(co):
        key = tuple(round(value, 7) for value in co)
        if key not in vertex_index:
            vertex_index[key] = len(verts)
            verts.append(co)
        return vertex_index[key]
    def cuts(low, high):
        return [low] + [i * scale for i in range(math.floor(low / scale) + 1, math.ceil(high / scale))] + [high]
    for axis in range(3):
        remaining = [i for i in range(3) if i != axis]
        if grain_axis in remaining:
            remaining.remove(grain_axis)
            remaining.append(grain_axis)
        uaxis, vaxis = remaining
        us, vs = cuts(lo[uaxis], hi[uaxis]), cuts(lo[vaxis], hi[vaxis])
        for side in range(2):
            outward = Vector(tuple((-1 if side == 0 else 1) if i == axis else 0 for i in range(3)))
            for ua, ub in zip(us, us[1:]):
                for va, vb in zip(vs, vs[1:]):
                    coords = []
                    for u, v in [(ua, va), (ub, va), (ub, vb), (ua, vb)]:
                        co = [0, 0, 0]
                        co[axis] = (lo, hi)[side][axis]
                        co[uaxis], co[vaxis] = u, v
                        coords.append(co)
                    if (Vector(coords[1]) - Vector(coords[0])).cross(Vector(coords[2]) - Vector(coords[0])).dot(outward) < 0:
                        coords.reverse()
                    ui, vi = math.floor((ua + ub) / (2 * scale)), math.floor((va + vb) / (2 * scale))
                    faces.append([vertex(co) for co in coords])
                    face_uv.append([((atlas_tile % 2 + .008 + ((co[uaxis] / scale) - ui) * .984) / 2,
                                     (atlas_tile // 2 + .008 + ((co[vaxis] / scale) - vi) * .984) / 2) for co in coords])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(MATERIALS[tile // 4])
    uv = mesh.uv_layers.new(name='Metre-scaled PBR atlas')
    for poly, values in zip(mesh.polygons, face_uv):
        for loop, value in zip(poly.loop_indices, values):
            uv.data[loop].uv = value
    if bevel:
        mod = obj.modifiers.new('Small worked arris', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        mod.limit_method = 'ANGLE'
        mod.affect = 'EDGES'
        normal = obj.modifiers.new('Weighted planar normals', 'WEIGHTED_NORMAL')
        normal.keep_sharp = True
    return obj

# West wall: 230 mm masonry around a genuine closed, recessed 1.00 x 2.10 opening.
box('West plaster south pier', (0, 0, 0), (.23, .65, 2.39))
box('West plaster north field', (0, 1.95, 0), (.23, 3.8, 2.39))
box('West plaster over supported lintel', (0, .65, 2.28), (.23, 1.95, 2.39))
for side, ya, yb in [('south', .65, .8), ('north', 1.8, 1.95)]:
    box(f'Door {side} joint bed', (.004, ya, 0), (.23, yb, 2.1), 3, 0)
    for course in range(7):
        box(f'Door {side} limestone jamb course {course + 1:02d}', (0, ya + .002, course * .3 + .003), (.23, yb - .002, (course + 1) * .3 - .003), 1, .004)
box('Door stone lintel with 150 mm bearings', (0, .65, 2.10), (.23, 1.95, 2.28), 1, .007)
box('Door stone threshold grounded on retained slab', (0, .8, 0), (.23, 1.8, .045), 1, .004)
box('Closed door recessed shadow stop', (.142, .8, .045), (.172, 1.8, 2.1), 6, 0)
for label, ya, yb in [('south', .8, .865), ('north', 1.735, 1.8)]:
    box(f'Roof door pine {label} jamb', (.047, ya, .045), (.14, yb, 2.1), 4, .004, 2)
box('Roof door pine head', (.047, .865, 2.035), (.14, 1.735, 2.1), 4, .004, 1)
for plank in range(7):
    ya = .872 + plank * .122
    box(f'Closed vertical pine leaf plank {plank + 1:02d}', (.073, ya, .057), (.14, ya + .119, 2.027), 4, .002, 2)
for height in [.38, 1.70]:
    box(f'Closed leaf iron strap z{height:.2f}', (.061, .88, height), (.073, 1.46, height + .036), 5, .002, 1)
    box(f'Stone-seated hinge pin z{height:.2f}', (.043, .848, height - .018), (.078, .88, height + .058), 5, .003)
    for y in [.915, 1.10, 1.37]:
        box(f'Strap iron rivet y{y:.3f} z{height:.2f}', (.053, y - .009, height + .009), (.062, y + .009, height + .027), 5, .003)
box('Closed door latch backplate', (.055, 1.595, .99), (.073, 1.67, 1.16), 5, .005)
box('Forged pull vertical grip', (.022, 1.62, 1.02), (.039, 1.64, 1.125), 5, .005)
for z in [1.025, 1.115]:
    box(f'Pull supported return z{z:.3f}', (.030, 1.620, z), (.065, 1.640, z + .012), 5, .003)
# Blank solid ends join the west/east walls without duplicated corner volumes.
box('South blank end masonry', (.23, 0, 0), (1.57, .23, 2.39))
box('North blank end masonry', (.23, 3.57, 0), (1.57, 3.8, 2.39))
# Rear is sealed; its 0.58 x 0.48 m vent has 180 mm depth, stone head and sill.
box('East rear lower masonry', (1.57, 0, 0), (1.8, 3.8, 1.44))
box('East rear upper masonry', (1.57, 0, 1.92), (1.8, 3.8, 2.39))
box('East rear south vent shoulder', (1.57, 0, 1.44), (1.8, 1.61, 1.92))
box('East rear north vent shoulder', (1.57, 2.19, 1.44), (1.8, 3.8, 1.92))
box('Rear vent closed deep backing', (1.62, 1.61, 1.44), (1.638, 2.19, 1.92), 6, 0)
box('Rear vent limestone sill', (1.62, 1.61, 1.44), (1.8, 2.19, 1.505), 1, .004)
box('Rear vent supported stone head', (1.62, 1.61, 1.855), (1.8, 2.19, 1.92), 1, .004)
for label, ya, yb in [('south', 1.61, 1.67), ('north', 2.13, 2.19)]:
    box(f'Rear vent {label} stone jamb', (1.62, ya, 1.505), (1.8, yb, 1.855), 1, .004)
for index in range(5):
    y = 1.69 + index * .105
    box(f'Rear vent seated iron bar {index + 1:02d}', (1.754, y, 1.493), (1.772, y + .014, 1.867), 5, .002)
for index, z in enumerate([1.55, 1.68, 1.81]):
    box(f'Rear vent supported cross tie {index + 1:02d}', (1.77, 1.66, z), (1.782, 2.14, z + .012), 5, .002)
# The 200 mm flat cap stays inside the exact footprint. No extra base slab,
# interior, stair, parapet, or retained service-cluster geometry is exported.
box('Roof continuous 90 mm cap bedding', (0, 0, 2.39), (1.8, 3.8, 2.48), 2, .005)
for index in range(4):
    lo = index * .95
    hi = (index + 1) * .95
    box(f'Roof flat cap stone {index + 1:02d}', (0, lo + (.003 if index else 0), 2.48), (1.8, hi - (.003 if index < 3 else 0), 2.59), 1, .004)
# Finite joint-contact treatment follows the cap's construction, not random wear.
for index in range(1, 4):
    y = index * .95
    box(f'Roof cap recessed mortar joint {index:02d}', (.006, y - .003, 2.48), (1.794, y + .003, 2.586), 3, 0)

scene = bpy.context.scene
scene['owner'] = 'B18 / BLD_DYERS_ARCADE_E'
scene['design_origin_m'] = [54.6, 40.9, 4.76]
scene['source_axes'] = '+X east, +Y north, +Z up'
scene['export_axes'] = '+X east, +Y up, +Z north; winding-corrected coordinate conversion'
scene['retained_runtime'] = 'Original roof slab, parapets, full-footprint coping, low service cluster, backing and all collision'
scene['closed_roof_door_design'] = 'west x54.6, north42.2; rough opening 1.00 x 2.10 m'
scene['closed_rear_vent_design'] = 'east x56.4, north42.8, sill6.20; total 0.58 x 0.48 x 0.18 m'
source_objects = sorted([o for o in scene.objects if o.type == 'MESH'], key=lambda o: o.name)
coords = [o.matrix_world @ v.co for o in source_objects for v in o.data.vertices]
source_bounds = [[round(min(v[i] for v in coords), 6), round(max(v[i] for v in coords), 6)] for i in range(3)]
assert source_bounds == [[0, 1.8], [0, 3.8], [0, 2.59]], source_bounds
assert all(o.scale == Vector((1, 1, 1)) for o in source_objects)
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / ('b18-roof-access-clay.blend' if opt.clay else 'b18-roof-access.blend')))

if opt.render:
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.38, .42, .48, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
    bpy.ops.object.light_add(type='AREA', location=(-3, -4, 7))
    bpy.context.object.data.energy = 1300
    bpy.context.object.data.shape = 'DISK'
    bpy.context.object.data.size = 5
    bpy.ops.object.camera_add()
    cam = bpy.context.object
    scene.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 6.1
    for name, location in [('west-south', (-5, -4, 4.4)), ('west-north', (-5, 7.5, 4.2)), ('rear', (6, 6, 3.8))]:
        cam.location = location
        cam.rotation_euler = (Vector((.9, 1.9, 1.25)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(OUT / (name + '.png'))
        bpy.ops.render.render(write_still=True)

# The source frame is right-handed but runtime uses x=east/y=up/z=north.
# Bake only the export copy's Y-coordinate conversion, then correct winding.
# Standard glTF +Y-up conversion yields positive east/up/north coordinates.
# This is a coordinate conversion, not a mirrored placement or asset variant.
for obj in source_objects:
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    for modifier in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    mesh = obj.data
    for vert in mesh.vertices:
        vert.co.y = -vert.co.y
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
bpy.ops.object.select_all(action='DESELECT')
for obj in source_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = source_objects[0]
bpy.ops.object.join()
joined = bpy.context.object
joined.name = 'B18 closed roof-access room'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
joined.data.calc_loop_triangles()
triangles = len(joined.data.loop_triangles)
assert triangles <= 12000, triangles
assert len(joined.data.materials) <= 2, len(joined.data.materials)
path = OUT / 'b18-roof-access.glb'
bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_extras=False, export_animations=False)
report = {
    'owner': 'B18 / BLD_DYERS_ARCADE_E', 'asset': path.name, 'source': 'repo://assets/source/b18-roof-access/build.py',
    'license': 'Project-Original', 'sourceObjectCount': len(source_objects), 'triangles': triangles,
    'materials': len(joined.data.materials), 'sourceBoundsM': source_bounds,
    'exportBoundsM': [[0, 1.8], [0, 2.59], [0, 3.8]],
    'sourceOriginDesignM': [54.6, 40.9, 4.76],
    'frame': {'source': ['east', 'north', 'up'], 'glb': ['east', 'up', 'north'],
              'exportOnlyConversion': 'Y negation with face winding correction, then standard glTF +Y-up', 'runtimeScale': [1, 1, 1]},
    'mounting': {'recenterXZDesignM': [55.5, 42.8], 'baseElevationM': 4.76,
                 'westDoorCenterDesignM': [54.6, 42.2, 5.81], 'rearVentCenterDesignM': [56.4, 42.8, 6.44]},
    'atlasDerivation': {'white_sandstone_blocks_02': 'Tile native 64x64 stone-only crop x350..414, top-down y315..379; excludes mortar.',
                        'rough_pine_door': 'Tile native grain-only crop x40..104, top-down y30..470; excludes photographed crossrails.',
                        'maps': 'Installed albedo, OpenGL normal and ARM channels use identical crop and fixed 2:1 box reduction.'},
    'dependencies': sorted({d['file']: d for d in DEPENDENCIES}.values(), key=lambda d: d['file']),
    'md5': {p.name: hashlib.md5(p.read_bytes()).hexdigest() for p in [path] + sorted(OUT.glob('b18*_*.png'))},
    'clay': opt.clay,
}
(OUT / 'provenance.json').write_text(json.dumps(report, indent=2) + '\n')
print('B18_ROOF_EXPORT', json.dumps(report))
