"""Render a facade GLB alone for a quick look before integrating it into the map.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python assets/source/preview.py -- <asset.glb> <out.png>
    ... -- <section.glb> <out.png> --section <W,H>     zone section: four views (N/E/S/W) from the zone centre

The camera stands in the street at 1.7 m eye height, 75 degree field of view, looking at the
front of the asset (glTF +Z, Blender -Y after import). Three seconds, no game boot.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
# --section W,H : zone rect size in metres (from the before shoot); camera stands at the zone centre.
section = None
if '--section' in argv:
    i = argv.index('--section')
    section = tuple(float(v) for v in argv[i + 1].split(','))
    argv = argv[:i] + argv[i + 2:]
glb, out = argv[:2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=glb)
# GLBs export without images; rebind pack materials by name so the preview shows the real textures.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from facade_materials import material as pack_material  # noqa: E402
for mat in list(bpy.data.materials):
    if mat.name.startswith('ph_') and mat.users:
        replacement = pack_material(mat.name.split('.')[0])
        for ob in bpy.context.scene.objects:
            for slot in getattr(ob, 'material_slots', []):
                if slot.material == mat:
                    slot.material = replacement

corners = [ob.matrix_world @ Vector(c) for ob in bpy.context.scene.objects if ob.type == 'MESH' for c in ob.bound_box]
lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
width, height = hi.x - lo.x, hi.z - lo.z
print(f'preview: {width:.2f} m wide, {height:.2f} m tall, relief {(-lo.y):.2f} m toward the street, base z={lo.z:.2f}')

scene = bpy.context.scene
camera = bpy.data.objects.new('preview-camera', bpy.data.cameras.new('preview-camera'))
scene.collection.objects.link(camera)
camera.data.angle = math.radians(75)
scene.camera = camera
if section:
    # Section models: stand in the middle of the zone at eye height and look N/E/S/W.
    # Local frame after import: +X east, -Y north (facade_kit.Frame flips plan y).
    centre = Vector((section[0] / 2, -section[1] / 2, 1.7))
    views = {'n': Vector((0, -1, 0)), 'e': Vector((1, 0, 0)), 's': Vector((0, 1, 0)), 'w': Vector((-1, 0, 0))}
else:
    distance = max(4.0, 0.85 * max(width, height))
    centre = Vector(((lo.x + hi.x) / 2 - 0.2 * width, lo.y - distance, 1.7))
    views = {'': Vector(((lo.x + hi.x) / 2, 0, height * 0.45)) - centre}
camera.location = centre

sun = bpy.data.objects.new('preview-sun', bpy.data.lights.new('preview-sun', 'SUN'))
sun.data.energy = 4
sun.rotation_euler = (math.radians(50), math.radians(15), math.radians(-35))
scene.collection.objects.link(sun)
world = bpy.data.worlds.new('preview-world')
world.use_nodes = True
background = world.node_tree.nodes['Background']
background.inputs['Color'].default_value = (0.55, 0.65, 0.85, 1)
background.inputs['Strength'].default_value = 0.7
scene.world = world

scene.render.resolution_x, scene.render.resolution_y = 960, 600
for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'BLENDER_WORKBENCH'):
    try:
        scene.render.engine = engine
        break
    except Exception:
        continue
stem = out[:-4] if out.endswith('.png') else out
for suffix, direction in views.items():
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'{stem}_{suffix}.png' if suffix else out
    bpy.ops.render.render(write_still=True)
    print('preview: rendered', scene.render.engine, '->', scene.render.filepath)
