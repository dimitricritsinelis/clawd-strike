"""B18 packing and dry-dye displays, in metres, +Z up, front -Y.

Run Blender with --background --factory-startup --python build.py -- --root REPO.
Named source objects stay editable. Exported components use one shared PBR atlas.
The rear mounting plane is Y=0; actual-loader bounds centers own runtime placement.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
import numpy as np
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

# Project-original woven/ceramic surface detail; installed CC0 timber only.
WOOD = ROOT / 'apps/client/public/assets/models/environment/bazaar/props/wooden_table_02/textures/wooden_table_02_diff_1k.jpg'
wood_image = bpy.data.images.load(str(WOOD))
wood = np.array(wood_image.pixels[:]).reshape(1024, 1024, 4)
crop = wood[234:374, 40:550, :3].transpose(1, 0, 2)
N = 1024
albedo = np.ones((N, N, 4), dtype=np.float32)
roughness = np.ones_like(albedo)
normal = np.ones_like(albedo)
normal[:, :, :3] = (.5, .5, 1)
roughness[:, :, :3] = .86
albedo[:, :512, :3] = crop[np.linspace(0, 509, N).astype(int)[:, None], np.linspace(0, 139, 512).astype(int)[None, :]] * .92
yy, xx = np.mgrid[0:512, 0:512]
weave = .018 * np.sin(xx * 1.53) + .015 * np.cos(yy * 1.51)
palette = [( .13,.23,.29), (.44,.18,.13), (.69,.62,.47), (.24,.33,.30), (.47,.31,.18), (.21,.27,.40)]
regions = {'wood': (0, 0, .5, 1), 'ceramic': (.5, 0, .42, .5), 'iron': (.92, 0, .08, .25), 'rope': (.92, .25, .08, .25)}
for i, color in enumerate(palette):
    lo, hi = round(i * 512 / 6), round((i + 1) * 512 / 6)
    region = albedo[512:, 512 + lo:512 + hi, :3]
    region[:] = np.array(color) * (1 + weave[:, lo:hi, None])
    region[:, 4:6] = np.array(color) * 1.26
    region[:, -6:-4] = np.array(color) * 1.26
    normal[512:, 512 + lo:512 + hi, 0] += .016 * np.sin(xx[:, lo:hi] * 1.53)
    normal[512:, 512 + lo:512 + hi, 1] += .016 * np.cos(yy[:, lo:hi] * 1.51)
    regions[f'cloth{i}'] = (.5 + lo / N, .5, (hi - lo) / N, .5)
albedo[:512, 512:942, :3] = np.array((.52, .43, .30)) * (1 + .04 * np.sin(xx[:, :430] * .083)[:, :, None] * np.cos(yy[:, :430] * .037)[:, :, None])
roughness[:512, 512:942, :3] = .61
albedo[:256, 942:, :3] = (.105, .085, .063)
roughness[:256, 942:, :3] = .47
albedo[256:512, 942:, :3] = (.59, .48, .32)

material = bpy.data.materials.new('B18 | oiled timber, dry samples and earthenware')
material.use_nodes = True
nodes, links = material.node_tree.nodes, material.node_tree.links
bsdf = nodes.get('Principled BSDF')
for name, pixels, socket, noncolor in [
    ('b18-counter-albedo', albedo, 'Base Color', False),
    ('b18-counter-roughness', roughness, 'Roughness', True),
    ('b18-counter-normal', normal, 'Normal', True),
]:
    im = bpy.data.images.new(name, width=N, height=N, alpha=False)
    if noncolor:
        im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(pixels.ravel())
    im.filepath_raw = str(OUT / f'{name}.png')
    im.file_format = 'PNG'
    im.save()
    im.pack()
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = im
    if socket == 'Normal':
        bump = nodes.new('ShaderNodeNormalMap')
        links.new(texture.outputs['Color'], bump.inputs['Color'])
        links.new(bump.outputs['Normal'], bsdf.inputs[socket])
    else:
        links.new(texture.outputs['Color'], bsdf.inputs[socket])

def uv_region(u, v, surface):
    x, y, w, h = regions[surface]
    return (x + w * (.012 + .976 * u), y + h * (.012 + .976 * v))

def box(name, center, size, surface='wood', bevel=.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(material)
    axis = max(range(3), key=lambda i: size[i])
    for polygon in ob.data.polygons:
        other = max((i for i in range(3) if i != axis and abs(polygon.normal[i]) < .9), key=lambda i: size[i], default=(axis + 1) % 3)
        for loop in polygon.loop_indices:
            co = ob.data.vertices[ob.data.loops[loop].vertex_index].co
            ob.data.uv_layers.active.data[loop].uv = uv_region(co[other] / size[other] + .5, co[axis] / size[axis] + .5, surface)
    if bevel:
        modifier = ob.modifiers.new('Eased hand-worked arris', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 2
        ob.modifiers.new('Weighted joinery normals', 'WEIGHTED_NORMAL')
    return ob

def rod(name, start, end, radius, surface='iron', segments=10):
    a, b = Vector(start), Vector(end)
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=(b-a).length, location=(a+b)/2)
    ob = bpy.context.object
    ob.name = name
    ob.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    ob.data.materials.append(material)
    for uv in ob.data.uv_layers.active.data:
        uv.uv = uv_region(uv.uv.x, uv.uv.y, surface)
    return ob

def surface_mesh(name, vertices, faces, uvs, surface, thickness=0):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(material)
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    uv = mesh.uv_layers.new()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for loop in polygon.loop_indices:
            uv.data[loop].uv = uv_region(*uvs[mesh.loops[loop].vertex_index], surface)
    if thickness:
        modifier = ob.modifiers.new('Bound woven thickness', 'SOLIDIFY')
        modifier.thickness = thickness
        modifier.offset = 0
    return ob

def cabinet(prefix, upper_height):
    # Both pairs of legs sit on the retained 140 mm threshold, behind the wall collider.
    # Y=0 is the rear plane; negative Y points toward the street.
    for x in [-.6375, .6375]:
        box(f'{prefix} | front ground leg', (x, -.315, .5025), (.085, .05, .725))
        box(f'{prefix} | rear threshold leg', (x, -.035, .5025), (.085, .07, .725))
        box(f'{prefix} | closed end panel', (x, -.1725, .5), (.045, .225, .61))
    box(f'{prefix} | closed back', (0, -.0225, .50), (1.27, .035, .66))
    for height in [.19, .79]:
        box(f'{prefix} | mortised front rail', (0, -.308, height), (1.275, .054, .085))
    for x in [-.612, 0, .612]:
        box(f'{prefix} | front stile', (x, -.31, .49), (.058, .06, .54))
    for x in [-.30, .30]:
        box(f'{prefix} | inset closed cupboard leaf', (x, -.291, .49), (.55, .035, .49))
        for side in [-1, 1]:
            box(f'{prefix} | panel bead', (x + side*.253, -.315, .49), (.014, .02, .47), bevel=.002)
        for height in [.32, .67]:
            box(f'{prefix} | forged strap hinge', (x-.22, -.333, height), (.075, .012, .023), 'iron', .002)
        rod(f'{prefix} | pull', (x+.17, -.33, .51), (x+.17, -.337, .51), .012)
    # Four top boards stay within the measured 1.48 x .34 m envelope.
    for index in range(4):
        box(f'{prefix} | counter board {index+1}', (0, -.2975 + index*.085, .8725), (1.48, .083, .055))
    for x in [-.6425, .6425]:
        box(f'{prefix} | supported rear upright', (x, -.025, (.90+upper_height)/2), (.055, .05, upper_height-.90))
        for height in [.25, .75]:
            rod(f'{prefix} | timber drawbore', (x, -.338, height), (x, -.34, height), .008, 'wood', 8)

def vessel(prefix, x, y, base):
    # Lathed closed lidded sample jars; no open bath, fluid or loose pigment.
    profile = [(0,.066),(.014,.079),(.105,.083),(.145,.059),(.16,.059),(.165,.071),(.178,.071),(.185,.061)]
    vertices, uvs, faces = [], [], []
    count = 16
    for ring, (height, radius) in enumerate(profile):
        for j in range(count):
            a = j*math.tau/count
            vertices.append((x+radius*math.cos(a), y+radius*math.sin(a), base+height))
            uvs.append((j/count, ring/(len(profile)-1)))
    for ring in range(len(profile)-1):
        for j in range(count):
            a=ring*count+j; b=ring*count+(j+1)%count
            faces.append((a,b,b+count,a+count))
    faces += [tuple(reversed(range(count))), tuple((len(profile)-1)*count+j for j in range(count))]
    surface_mesh(prefix, vertices, faces, uvs, 'ceramic')
    rod(prefix+' | lid knob',(x,y,base+.18),(x,y,base+.20),.017,'wood',10)

def dye():
    cabinet('DY-S', 2.25)
    box('DY-S | upper tie rail', (0, -.025, 2.225), (1.28,.05,.05))
    for shelf, height in enumerate([1.015, 1.94]):
        box(f'DY-S | supported sample shelf {shelf+1}', (0,-.118,height), (1.25,.222,.035))
        for x in [-.615,.615]:
            rod('DY-S | shelf knee', (x,-.026,height-.13), (x,-.18,height-.024), .012,'wood')
        for j,x in enumerate([-.45,-.15,.15,.45]):
            vessel(f'DY-S | closed sample jar {shelf*4+j+1}',x,-.116,height+.0175)
    rod('DY-S | sample rail',(-.637,-.20,1.85),(.637,-.20,1.85),.015,'wood',12)
    for x in [-.62,.62]:
        rod('DY-S | sample rail arm',(x,-.025,1.85),(x,-.20,1.85),.012,'iron')
    for i,x in enumerate([-.50,-.30,-.10,.10,.30,.50]):
        vertices,uvs,faces=[],[],[]
        nx,ny=8,14
        length=[.46,.49,.43,.47,.50,.45][i]
        for row in range(ny+1):
            t=row/ny
            for col in range(nx+1):
                u=col/nx
                vertices.append((x+(u-.5)*.16, -.215+.008*math.sin(u*math.tau*2+.35*i)*(.25+.75*t), 1.835-length*t))
                uvs.append((u,t))
        for row in range(ny):
            for col in range(nx):
                a=row*(nx+1)+col; faces.append((a,a+1,a+nx+2,a+nx+1))
        surface_mesh(f'DY-S | bound test strip {i+1}',vertices,faces,uvs,f'cloth{i}',.004)
        rod(f'DY-S | weighted hem {i+1}',(x-.076,-.215,1.835-length),(x+.076,-.215,1.835-length),.004,f'cloth{i}',8)
        for side in [-1,1]:
            rod('DY-S | rail tie',(x+side*.06,-.204,1.866),(x+side*.06,-.215,1.82),.004,'rope',6)

def packing():
    cabinet('PACK',1.675)
    box('PACK | rear packing rail',(0,-.025,1.65),(1.28,.05,.05))
    # Three bound bolts are stock for collection, each supported on the counter.
    for i,x in enumerate([-.46,0,.46]):
        box(f'PACK | folded cloth bolt {i+1}',(x,-.165,1.015),(.37,.27,.23),f'cloth{[2,3,0][i]}',.019)
        for level in range(4):
            box('PACK | visible folded edge',(x,-.303,.93+level*.047),(.337,.01,.008),f'cloth{[2,3,0][i]}',.003)
        for side in [-1,1]:
            xx=x+side*.098
            for a,b in [((xx,-.304,.905),(xx,-.304,1.132)),((xx,-.304,1.132),(xx,-.026,1.132)),((xx,-.026,1.132),(xx,-.026,.905))]:
                rod('PACK | tied stock cord',a,b,.0045,'rope',6)

collections = {}
for name, build in [('b18-dye-counter', dye), ('b18-packing-finish', packing)]:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    before = set(bpy.context.scene.objects)
    build()
    objects = [ob for ob in bpy.context.scene.objects if ob not in before]
    for ob in objects:
        for owner in list(ob.users_collection):
            owner.objects.unlink(ob)
        collection.objects.link(ob)
    # Author the mounting origin on the measured inner threshold, 140 mm above paving.
    for ob in objects:
        ob.location.z -= .14
    collections[name] = objects

bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'b18-counters.blend'))
report = {'sourceFrame': '+X across, +Y rear, +Z up; rear plane Y=0', 'unit': 'metre', 'models': {}, 'license': 'Project-Original', 'dependencies': [{'file':str(WOOD.relative_to(ROOT)),'source':'https://polyhaven.com/a/wooden_table_02','license':'CC0-1.0','md5':hashlib.md5(WOOD.read_bytes()).hexdigest()}]}
for name, objects in collections.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        bpy.context.view_layer.objects.active=ob
        ob.select_set(True)
        for modifier in list(ob.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    ob=bpy.context.object
    ob.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    coordinates=[v.co for v in ob.data.vertices]
    bounds=[(min(v[i] for v in coordinates),max(v[i] for v in coordinates)) for i in range(3)]
    triangles=sum(len(p.vertices)-2 for p in ob.data.polygons)
    assert triangles <= 12000, (name,triangles)
    assert bounds[0][0] >= -.741 and bounds[0][1] <= .741, bounds
    assert bounds[1][0] >= -.352 and bounds[1][1] <= .001, bounds
    assert bounds[2][0] >= -.001 and bounds[2][1] <= 2.251, bounds
    assert all(math.isfinite(float(c)) for v in coordinates for c in v)
    if args.clay:
        clay = bpy.data.materials.get('B18 clay') or bpy.data.materials.new('B18 clay')
        clay.diffuse_color = (.56,.56,.56,1)
        clay.use_nodes = True
        clay.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .9
        ob.data.materials.clear()
        ob.data.materials.append(clay)
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{name}.glb'), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_extras=False)
    report['models'][name]={'triangles':triangles,'materials':len(ob.data.materials),'sourceBounds':bounds,'glbMd5':hashlib.md5((OUT/f'{name}.glb').read_bytes()).hexdigest()}
(OUT/'provenance.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
