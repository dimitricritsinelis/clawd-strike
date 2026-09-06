"""Author the close-view finish in Blender, then export with build.py.

Run once on the unrefined editable ak47.blend through Blender MCP. The saved
blend owns subsequent edits. All added surfaces retain the existing arm rig.
The material finish combines CC0 scans with original deterministic ripstop,
measured in metres. Source hashes are recorded by build.py.
"""
from pathlib import Path
import math
import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

SOURCE = Path(__file__).resolve().parent
rig = bpy.data.objects['L_Armature']
body = bpy.data.objects['L_GloveAndForearm']
if body.get('close_view_finish'):
    raise RuntimeError('Close-view finish already authored; edit the saved blend directly.')
bpy.context.scene.frame_set(1)


def texture(name, values, color=False):
    height, width = values.shape[:2]
    image = bpy.data.images.new(name, width=width, height=height, alpha=False)
    image.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
    rgba = np.ones((height, width, 4), dtype=np.float32)
    rgba[:, :, :3] = values[:, :, None] if values.ndim == 2 else values
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw = str(SOURCE / 'textures' / (name + '.png'))
    image.file_format = 'PNG'
    image.save()
    image.pack()
    return image


def material_field(kind, size=2048):
    if kind == 'walnut':
        color=bpy.data.images.load(str(SOURCE/'textures/dark_wood_diff_4k.jpg'),check_existing=True);color.pack()
        normal=bpy.data.images.load(str(SOURCE/'textures/dark_wood_nor_gl_4k.jpg'),check_existing=True)
        normal.colorspace_settings.name='Non-Color';normal.pack()
        arm=bpy.data.images.load(str(SOURCE/'textures/dark_wood_arm_4k.jpg'),check_existing=True);arm.colorspace_settings.name='Non-Color'
        pixels=np.empty(len(arm.pixels),np.float32);arm.pixels.foreach_get(pixels)
        rough=.30+pixels.reshape(arm.size[1],arm.size[0],4)[:,:,1]*.28
        return color,normal,texture('close-walnut-roughness',rough)
    if kind in ['leather', 'suede']:
        color=bpy.data.images.load(str(SOURCE/'textures/leather_red_02_coll1_4k.jpg'),check_existing=True)
        pixels=np.empty(len(color.pixels),np.float32);color.pixels.foreach_get(pixels)
        luminance=pixels.reshape(color.size[1],color.size[0],4)[:,:,:3].mean(axis=2)
        variation=np.clip(luminance/max(.01,float(luminance.mean()))*.72,.25,1)
        normal=bpy.data.images.load(str(SOURCE/'textures/leather_red_02_nor_gl_4k.jpg'),check_existing=True)
        normal.colorspace_settings.name='Non-Color';normal.pack()
        arm=bpy.data.images.load(str(SOURCE/'textures/leather_red_02_arm_4k.jpg'),check_existing=True)
        arm.colorspace_settings.name='Non-Color'
        pixels=np.empty(len(arm.pixels),np.float32);arm.pixels.foreach_get(pixels)
        rough=pixels.reshape(arm.size[1],arm.size[0],4)[:,:,1]
        rough=.72+rough*.25 if kind=='suede' else .30+rough*.55
        return texture('close-'+kind+'-color',variation,True),normal,texture('close-'+kind+'-roughness',rough)
    # A 60 mm leather swatch or 100 mm woven swatch, independently tiled.
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / size
    fine = np.sin(x * 2 * np.pi * 479 + np.sin(y * 2 * np.pi * 179)) * np.sin(y * 2 * np.pi * 487)
    warp = np.sin(x * 2 * np.pi * 180)
    weft = np.sin(y * 2 * np.pi * 180)
    over = np.sin(x * 2 * np.pi * 90) * np.sin(y * 2 * np.pi * 90)
    gridx = np.exp(-np.square(np.sin(x * 2 * np.pi * 20) * 15))
    gridy = np.exp(-np.square(np.sin(y * 2 * np.pi * 20) * 15))
    height = (warp + weft) * .10 + over * .09 + (gridx + gridy) * .14 + fine * .025
    variation = .94 + warp * .018 + weft * .018 + over * .035 + (gridx + gridy) * .08
    rough = .86 + over * .05
    amplitude = 2.2
    nx = -(np.roll(height, -1, 1) - np.roll(height, 1, 1)) * amplitude
    ny = -(np.roll(height, -1, 0) - np.roll(height, 1, 0)) * amplitude
    nz = np.ones_like(nx)
    normal = np.stack((nx, ny, nz), -1)
    normal /= np.linalg.norm(normal, axis=2)[:, :, None]
    return (texture('close-' + kind + '-color', np.clip(variation, 0, 1), True),
            texture('close-' + kind + '-normal', normal * .5 + .5),
            texture('close-' + kind + '-roughness', np.clip(rough, 0, 1)))


def tailor_glove():
    """Fit continuous finger reinforcement and a restrained, fine suede finish.

    This pass can also be applied to the saved first-pass blend without
    regenerating the rifle, sleeve, wrist closure, or animation rig.
    """
    global tree, group_names, source_weights
    tree = KDTree(len(body.data.vertices))
    for vertex in body.data.vertices:
        tree.insert(vertex.co, vertex.index)
    tree.balance()
    group_names = [group.name for group in body.vertex_groups]
    source_weights = [[(weight.group, weight.weight) for weight in vertex.groups] for vertex in body.data.vertices]
    scan = bpy.data.images.load(str(SOURCE / 'textures/leather_white_diff_4k.jpg'), check_existing=True)
    pixels = np.empty(len(scan.pixels), np.float32)
    scan.pixels.foreach_get(pixels)
    values = pixels.reshape(scan.size[1], scan.size[0], 4)[:, :, :3].mean(axis=2)
    # Preserve the scan's fine fibres without turning its tonal variation into
    # painted cracks. Large wrinkles belong to the modeled surface.
    variation = np.clip(.91 + (values / float(values.mean()) - 1) * .9, .60, 1.16)
    normal = bpy.data.images.load(str(SOURCE / 'textures/leather_white_nor_gl_4k.jpg'), check_existing=True)
    normal.colorspace_settings.name = 'Non-Color'
    normal.pack()
    arm = bpy.data.images.load(str(SOURCE / 'textures/leather_white_arm_4k.jpg'), check_existing=True)
    arm.colorspace_settings.name = 'Non-Color'
    pixels = np.empty(len(arm.pixels), np.float32)
    arm.pixels.foreach_get(pixels)
    scanned_roughness = pixels.reshape(arm.size[1], arm.size[0], 4)[:, :, 1]
    for name, tint, base_roughness in [
        ('Urban Breacher glove', (.135, .205, .29), .76),
        ('Graphite suede reinforcement', (.15, .145, .13), .84),
    ]:
        material = bpy.data.materials[name]
        nodes = material.node_tree.nodes
        prefix = 'tailored-' + name.lower().replace(' ', '-')
        nodes['Image Texture'].image = texture(prefix + '-color', variation[:, :, None] * np.array(tint), True)
        nodes['Image Texture.001'].image = normal
        nodes['Image Texture.002'].image = texture(prefix + '-roughness', base_roughness + scanned_roughness * .12)
        nodes['Normal Map'].inputs['Strength'].default_value = 1.6

    for data, original in zip(body.data.uv_layers['DetailUV'].data, body.data.uv_layers['UVMap'].data):
        data.uv = original.uv * .45

    for object in list(bpy.data.objects):
        if object.name.startswith(('Palm heel suede overlay', 'Palm overlay rolled seam', 'Palm overlay stitching')):
            bpy.data.objects.remove(object, do_unlink=True)

    surface = BVHTree.FromPolygons([v.co for v in body.data.vertices], [list(p.vertices) for p in body.data.polygons])
    selected = []
    for polygon in body.data.polygons:
        x, y, z = polygon.center
        # The curved medial boundary follows the thumb from its root to its
        # tip, then the palm continues into the four finger gripping surfaces.
        left = float(np.interp(y, [.005, .025, .050, .075, .105, .20], [-.012, -.024, -.045, -.066, -.09, -.09]))
        edge_wrap = max(0, min(1, (x - .025) / .02))
        edge_wrap = edge_wrap * edge_wrap * (3 - 2 * edge_wrap)
        if y > .005 and z > .008 - .014 * edge_wrap and x > left:
            selected.append(polygon)
    indices = sorted({i for polygon in selected for i in polygon.vertices})
    remap = {index: i for i, index in enumerate(indices)}
    patch = mesh('Palm heel suede overlay',
                 [body.data.vertices[i].co + body.data.vertices[i].normal * .0012 for i in indices],
                 [[remap[i] for i in polygon.vertices] for polygon in selected],
                 bpy.data.materials['Graphite suede reinforcement'])
    detail_uv(patch, scale=.32)
    # Preserve source weights exactly at the finger joints.
    for vertex, source_index in zip(patch.data.vertices, indices):
        for group in patch.vertex_groups:
            group.remove([vertex.index])
        for weight in body.data.vertices[source_index].groups:
            patch.vertex_groups[weight.group].add([vertex.index], weight.weight, 'REPLACE')

    edge_counts = {}
    for polygon in patch.data.polygons:
        for edge in polygon.edge_keys:
            edge_counts[edge] = edge_counts.get(edge, 0) + 1
    adjacency = {}
    for (a, b), count in edge_counts.items():
        if count == 1:
            adjacency.setdefault(a, []).append(b)
            adjacency.setdefault(b, []).append(a)
    # Smooth the actual cut edge, not only the thread laid over a jagged edge.
    for _ in range(24):
        updates = {}
        for index, neighbors in adjacency.items():
            if len(neighbors) == 2:
                point = (patch.data.vertices[neighbors[0]].co + patch.data.vertices[index].co * 2 + patch.data.vertices[neighbors[1]].co) / 4
                hit, normal, _, _ = surface.find_nearest(point)
                updates[index] = hit + normal * .0012
        for index, point in updates.items():
            patch.data.vertices[index].co = point
    patch.data.update()

    unused = {tuple(sorted((a, b))) for a, neighbors in adjacency.items() for b in neighbors}
    while unused:
        first, current = min(unused)
        loop = [first, current]
        unused.remove(tuple(sorted((first, current))))
        while current != first:
            candidates = [i for i in adjacency[current] if tuple(sorted((current, i))) in unused]
            if not candidates:
                break
            following = min(candidates)
            unused.remove(tuple(sorted((current, following))))
            current = following
            loop.append(current)
        if len(loop) < 4:
            continue
        points = [patch.data.vertices[index].co.copy() for index in loop]
        tubes('Palm overlay rolled seam', [points], .00045, bpy.data.materials['Navy rolled binding'])
        center = sum(points, Vector()) / len(points)
        for inset in [.0013, .0027]:
            seam = []
            for i, point in enumerate(points[:-1]):
                tangent = (points[(i + 1) % (len(points) - 1)] - points[i - 1 if i else -2]).normalized()
                hit, normal, _, _ = surface.find_nearest(point)
                inward = normal.cross(tangent).normalized()
                if inward.dot(center - point) < 0:
                    inward.negate()
                hit, normal, _, _ = surface.find_nearest(point + inward * inset)
                seam.append(hit + normal * .00155)
            seam.append(seam[0])
            stitches('Palm overlay stitching', seam, spacing=.0021, radius=.00018)
    solid = patch.modifiers.new('Fitted suede thickness 0.8mm', 'SOLIDIFY')
    solid.thickness = .0008
    solid.offset = -1
    bpy.context.view_layer.objects.active = patch
    bpy.ops.object.modifier_move_up(modifier=solid.name)
    apply_modifier(patch, solid)
    patch['coverage'] = 'Continuous palm, thumb and four fingertip pads'
    body['glove_finish_revision'] = 2
    for image in list(bpy.data.images):
        if image.users == 0 and image.name.startswith('tailored-'):
            bpy.data.images.remove(image)
    for data in list(bpy.data.meshes):
        if data.users == 0 and data.name.startswith(('Palm heel suede overlay', 'Palm overlay rolled seam', 'Palm overlay stitching')):
            bpy.data.meshes.remove(data)


fields = {kind: material_field(kind) for kind in ['leather', 'ripstop', 'suede', 'walnut']}


def finish_material(name, kind, color, roughness=1):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    uv = nodes.new('ShaderNodeUVMap'); uv.uv_map = 'DetailUV'
    for index, image in enumerate(fields[kind]):
        node = nodes.new('ShaderNodeTexImage'); node.image = image
        links.new(uv.outputs['UV'], node.inputs['Vector'])
        if index == 0:
            if kind != 'walnut':
                pixels = np.empty(len(image.pixels), np.float32)
                image.pixels.foreach_get(pixels)
                values = pixels.reshape(image.size[1], image.size[0], 4)[:, :, :3]
                node.image = texture(name.lower().replace(' ', '-') + '-color', values * np.array(color), True)
            links.new(node.outputs['Color'], shader.inputs['Base Color'])
        elif index == 1:
            normal = nodes.new('ShaderNodeNormalMap'); normal.uv_map = 'DetailUV'
            normal.inputs['Strength'].default_value = .72 if kind == 'leather' else .5
            links.new(node.outputs['Color'], normal.inputs['Color'])
            links.new(normal.outputs['Normal'], shader.inputs['Normal'])
        else:
            links.new(node.outputs['Color'], shader.inputs['Roughness'])
    return material


navy = finish_material('Urban Breacher glove', 'leather', (.17, .26, .37))
cloth = finish_material('Khaki ripstop sleeve', 'ripstop', (.45, .38, .29))
suede = finish_material('Graphite suede reinforcement', 'suede', (.15, .145, .13))
tan = finish_material('Saddle leather closure', 'leather', (.43, .26, .12))
binding = finish_material('Navy rolled binding', 'leather', (.08, .12, .18))
wood = finish_material('Oiled walnut handguard', 'walnut', (.40, .19, .07))
thread = bpy.data.materials.new('Waxed flax stitching'); thread.diffuse_color = (.46, .31, .15, 1)
thread.use_nodes = True
thread.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.46, .31, .15, 1)
thread.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .83

# Transfer skin weights at the authored rest surface, preserving shared bones.
tree = KDTree(len(body.data.vertices))
for vertex in body.data.vertices:
    tree.insert(vertex.co, vertex.index)
tree.balance()
group_names = [g.name for g in body.vertex_groups]
source_weights = [[(g.group, g.weight) for g in v.groups] for v in body.data.vertices]


def skin(object, bone=None):
    object.parent = rig
    for name in group_names:
        object.vertex_groups.new(name=name)
    for vertex in object.data.vertices:
        if bone:
            object.vertex_groups[bone].add([vertex.index], 1, 'REPLACE')
        else:
            _, index, _ = tree.find(vertex.co)
            for group, weight in source_weights[index]:
                object.vertex_groups[group].add([vertex.index], weight, 'REPLACE')
    modifier = object.modifiers.new('Shared hand deformation', 'ARMATURE'); modifier.object = rig


def detail_uv(object, scale=.06):
    uv = object.data.uv_layers.get('DetailUV') or object.data.uv_layers.new(name='DetailUV')
    original = object.data.uv_layers.get('UVMap') or object.data.uv_layers[0]
    for polygon in object.data.polygons:
        for li in polygon.loop_indices:
            v = object.data.vertices[object.data.loops[li].vertex_index].co
            if object == body and polygon.material_index == 0:
                uv.data[li].uv = original.data[li].uv * 1.5
            else:
                uv.data[li].uv = (v.x / scale, v.y / scale)


def mesh(name, vertices, faces, material, bone=None, deform=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces); data.update()
    object = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(object)
    data.materials.append(material)
    for polygon in data.polygons: polygon.use_smooth = True
    detail_uv(object)
    if deform: skin(object, bone)
    return object


def tubes(name, paths, radius, material, bone=None):
    vertices, faces = [], []
    for path in paths:
        if len(path) < 2: continue
        points = [Vector(p) for p in path]
        start = len(vertices)
        for i, point in enumerate(points):
            tangent = (points[min(i + 1, len(points)-1)] - points[max(0, i - 1)]).normalized()
            axis = tangent.cross(Vector((0, 0, 1)))
            if axis.length < .01: axis = tangent.cross(Vector((1, 0, 0)))
            axis.normalize(); other = tangent.cross(axis).normalized()
            for side in range(8):
                angle = side * math.tau / 8
                vertices.append(point + radius * (axis * math.cos(angle) + other * math.sin(angle)))
        for i in range(len(points)-1):
            for side in range(8):
                a = start + i * 8 + side; b = start + i * 8 + (side+1) % 8
                faces.append((a, b, b+8, a+8))
    return mesh(name, vertices, faces, material, bone)


def stitches(name, path, material=thread, bone=None, spacing=.0025, radius=.00024):
    points = [Vector(p) for p in path]
    lengths = [0]
    for a, b in zip(points, points[1:]): lengths.append(lengths[-1] + (b-a).length)
    def sample(distance):
        i = min(len(points)-2, max(0, int(np.searchsorted(lengths, distance))-1))
        return points[i].lerp(points[i+1], (distance-lengths[i]) / max(1e-8, lengths[i+1]-lengths[i]))
    paths = []
    for start in np.arange(.0005, lengths[-1] - spacing, spacing):
        a, b = sample(start), sample(start + spacing * .62)
        middle = (a+b)*.5
        radial = Vector((middle.x, 0, middle.z)).normalized()
        paths.append([a, middle + radial * .00013, b])
    return tubes(name, paths, radius, material, bone)


def apply_modifier(object, modifier):
    bpy.ops.object.select_all(action='DESELECT'); object.select_set(True)
    bpy.context.view_layer.objects.active = object
    bpy.ops.object.modifier_apply(modifier=modifier.name)


# Smooth the anatomical mesh without moving the bones or contact anchors.
subdivision = body.modifiers.new('Close-view anatomical subdivision', 'SUBSURF')
subdivision.levels = 2
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_move_up(modifier=subdivision.name)
apply_modifier(body, subdivision)
detail_uv(body)
for vertex in body.data.vertices:
    x,y,z=vertex.co
    if 0<y<.15 and z>.005:
        fold=0
        for center in [.028,.072,.117]:
            delta=(y-center-.004*math.sin(x*95))/.0035
            fold+=.00065*(math.exp(-delta*delta)-.5*math.exp(-(delta+1.4)**2))
        vertex.co+=vertex.normal*fold
body.data.update()

# Remove the straight eight-ring sleeve surface; author a tailored cloth tube.
bm = bmesh.new(); bm.from_mesh(body.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == 1], context='FACES')
bm.to_mesh(body.data); bm.free(); body.data.update()


def sleeve_point(y, angle):
    t = max(0, min(1, (-y-.055)/.526))
    rx = .030 + .022 * math.sin(t * math.pi / 2)
    rz = .0235 + .021 * math.sin(t * math.pi / 2)
    # Broad tension folds taper to the cuff; wrinkles have asymmetric crests.
    folds = .0016 * math.sin(angle*5 + y*21) * math.sin(t*math.pi)
    for center, amplitude, width, phase in [(-.081,.0028,.009,1),(-.119,.0021,.012,2.3),(-.174,.0028,.014,4.1),(-.235,.0032,.017,.3),(-.335,.0038,.021,2)]:
        delta = (y-center-.011*math.sin(angle*2+phase))/width
        folds += amplitude * (math.exp(-delta*delta)-.48*math.exp(-(delta+1.3)**2))
    return Vector(((rx+folds)*math.cos(angle), y, (rz+folds)*math.sin(angle)))


vertices, faces = [], []
rows, sides = 180, 96
for row in range(rows+1):
    y = -.581 + .526 * row/rows
    for side in range(sides): vertices.append(sleeve_point(y, math.tau*side/sides))
for row in range(rows):
    for side in range(sides):
        a=row*sides+side; b=row*sides+(side+1)%sides
        faces.append((a,b,b+sides,a+sides))
sleeve = mesh('Tailored ripstop sleeve', vertices, faces, cloth)
for polygon in sleeve.data.polygons:
    for li in polygon.loop_indices:
        co = sleeve.data.vertices[sleeve.data.loops[li].vertex_index].co
        angle=math.atan2(co.z/.035,co.x/.043)
        sleeve.data.uv_layers['DetailUV'].data[li].uv=(angle/math.tau*2.6*.42,co.y/.1*.42)
for angle in [.63, .70]:
    path=[sleeve_point(float(y),angle)*Vector((1.013,1,1.013)) for y in np.linspace(-.4,-.056,180)]
    stitches('Sleeve double topstitch',path,spacing=.0032,radius=.00018)

# Binding rolls define the sleeve/glove separation even without a color map.
for y, rx, rz in [(-.054,.0315,.0248),(-.037,.0306,.0238)]:
    path=[Vector((rx*math.cos(a),y,rz*math.sin(a))) for a in np.linspace(0,math.tau,193)]
    tubes('Rolled cuff edge',[path],.0012,binding,bone='L_forearm.001')
    seam=[Vector(((rx+.0005)*math.cos(a),y+.0015,(rz+.0005)*math.sin(a))) for a in np.linspace(0,math.tau,193)]
    stitches('Cuff saddle stitch',seam,bone='L_forearm.001')
cuff=bpy.data.objects['Bound wrist cuff']; cuff.data.materials.clear(); cuff.data.materials.append(navy)
detail_uv(cuff)

# A curved, thick strap crosses the visible wrist quadrant and ends in a tab.
def strap_point(u,v,offset=0):
    angle=-.28+u*2.30
    y=-.025+v*.014 + .002*math.sin(u*math.pi)
    return Vector(((.0305+offset)*math.cos(angle),y,(.025+offset)*math.sin(angle)))
verts, faces = [], []
for j in range(9):
    for i in range(65): verts.append(strap_point(i/64,j/8))
for j in range(8):
    for i in range(64):
        a=j*65+i; faces.append((a,a+1,a+66,a+65))
strap=mesh('Raised tan wrist closure',verts,faces,tan,bone='L_forearm.001')
solid=strap.modifiers.new('Leather thickness 1.6mm','SOLIDIFY');solid.thickness=.0016;solid.offset=0
bpy.context.view_layer.objects.active=strap;bpy.ops.object.modifier_move_up(modifier=solid.name);apply_modifier(strap,solid)
for v in [.10,.90]:
    stitches('Closure perimeter stitch',[strap_point(u,v,.0011) for u in np.linspace(.025,.975,180)],bone='L_forearm.001')
for u in [.025,.975]:
    stitches('Closure end stitch',[strap_point(u,v,.0011) for v in np.linspace(.1,.9,40)],bone='L_forearm.001',spacing=.002)

verts,faces=[],[]
for j in range(17):
    for i in range(25):
        verts.append(strap_point(.30+i/24*.32,-.18+j/16*1.36,.0014))
for j in range(16):
    for i in range(24):
        a=j*25+i;faces.append((a,a+1,a+26,a+25))
tab=mesh('Raised tan closure pull tab',verts,faces,tan,bone='L_forearm.001')
solid=tab.modifiers.new('Pull tab leather thickness','SOLIDIFY');solid.thickness=.0014;solid.offset=0
bpy.context.view_layer.objects.active=tab;bpy.ops.object.modifier_move_up(modifier=solid.name);apply_modifier(tab,solid)
for v in [-.08,1.08]:
    stitches('Closure pull tab stitch',[strap_point(u,v,.0025) for u in np.linspace(.32,.60,90)],bone='L_forearm.001',spacing=.0023)
for u in [.32,.60]:
    stitches('Closure pull tab stitch',[strap_point(u,v,.0025) for v in np.linspace(-.08,1.08,70)],bone='L_forearm.001',spacing=.0023)

# Camera-facing palm overlay: extract fitted faces from the subdivided hand.
# It wraps the heel and little-finger edge, leaving the thumb-side panel navy.
selected=[]
for p in body.data.polygons:
    c=p.center
    if .005<c.y<.112 and c.z>.007 and c.x>-.016+.022*(c.y/.112)**2: selected.append(p)
indices=sorted(set(i for p in selected for i in p.vertices)); remap={old:new for new,old in enumerate(indices)}
patch=mesh('Palm heel suede overlay',[body.data.vertices[i].co+body.data.vertices[i].normal*.0013 for i in indices],[[remap[i] for i in p.vertices] for p in selected],suede)
edge_count={}
for p in patch.data.polygons:
    for a,b in p.edge_keys:edge_count[(a,b)]=edge_count.get((a,b),0)+1
edges=[edge for edge,count in edge_count.items() if count==1]
neighbors={}
for a,b in edges:neighbors.setdefault(a,[]).append(b);neighbors.setdefault(b,[]).append(a)
boundary=[]
if neighbors:
    current=min(neighbors);previous=None
    for _ in range(len(edges)+1):
        boundary.append(patch.data.vertices[current].co + patch.data.vertices[current].normal*.0007)
        candidates=[i for i in neighbors[current] if i!=previous]
        if not candidates:break
        previous,current=current,candidates[0]
        if current==min(neighbors):boundary.append(boundary[0]);break
    # Relax the extracted boundary so polygon selection cannot produce a
    # staircase along a seam that is centimetres from the camera.
    boundary = boundary[:-1]
    for _ in range(8):
        boundary = [(boundary[i-1]+point*2+boundary[(i+1)%len(boundary)])/4 for i,point in enumerate(boundary)]
    boundary.append(boundary[0])
    tubes('Palm overlay rolled seam',[boundary],.00065,binding)
    stitches('Palm overlay stitching',boundary,spacing=.0023,radius=.00025)
solid=patch.modifiers.new('Suede thickness 1mm','SOLIDIFY');solid.thickness=.001;solid.offset=-1
bpy.context.view_layer.objects.active=patch;bpy.ops.object.modifier_move_up(modifier=solid.name);apply_modifier(patch,solid)
for name in ['Dorsal reinforcement','Index knuckle pad','Middle knuckle pad','Ring knuckle pad','Little knuckle pad']:
    ob=bpy.data.objects[name];ob.data.materials.clear();ob.data.materials.append(suede);detail_uv(ob)

# Real edge radii on the rifle; retain the authored moving parts and UVs.
original=bpy.data.images['Image_0'];pixels=np.empty(len(original.pixels),np.float32);original.pixels.foreach_get(pixels)
pixels=pixels.reshape(original.size[1],original.size[0],4)
for name in ['AK47_Rig_Surfaces','Bolt_Surfaces','Magazine_Surfaces','Trigger_Surfaces']:
    ob=bpy.data.objects[name];uv=ob.data.uv_layers.active
    wood_index=len(ob.data.materials);ob.data.materials.append(wood)
    detail=ob.data.uv_layers.new(name='DetailUV')
    for p in ob.data.polygons:
        samples=[pixels[min(1023,max(0,int(uv.data[i].uv.y*1024))),min(1023,max(0,int(uv.data[i].uv.x*1024))),:3] for i in p.loop_indices]
        r,g,b=np.mean(samples,axis=0)
        center=sum((uv.data[i].uv for i in p.loop_indices),Vector((0,0)))/len(p.loop_indices)
        handguard_island=.64<center.x<.987 and .728<center.y<.97
        if name=='AK47_Rig_Surfaces' and .04<p.center.x<.235 and (handguard_island or (r>g*1.5 and g>b*1.25 and r>.018)):
            p.material_index=wood_index
        for li in p.loop_indices:
            co=ob.matrix_world @ ob.data.vertices[ob.data.loops[li].vertex_index].co
            detail.data[li].uv=(co.x/.24,(co.z+co.y*.2)/.12)
    bevel=ob.modifiers.new('Machined edge radius 0.35mm','BEVEL');bevel.width=.00035;bevel.segments=3;bevel.limit_method='ANGLE';bevel.angle_limit=.65
    apply_modifier(ob,bevel)
    bm=bmesh.new();bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.calc_area()<1e-12],context='FACES')
    bm.to_mesh(ob.data);bm.free();ob.data.update()

# Fit wrist trim to the actual tapered wrist and interpolate its skin weights.
kd=KDTree(len(body.data.vertices))
for v in body.data.vertices:kd.insert(v.co,v.index)
kd.balance()
surface=BVHTree.FromPolygons([v.co for v in body.data.vertices],[list(p.vertices) for p in body.data.polygons])
for ob in bpy.data.objects:
    if ob.type!='MESH' or not any(ob.name.startswith(n) for n in ['Rolled cuff edge','Cuff saddle stitch','Raised tan','Closure']):continue
    for v in ob.data.vertices:
        radial=Vector((v.co.x,0,v.co.z)).normalized()
        hit,normal,_,_=surface.ray_cast(Vector((radial.x*.14,v.co.y,radial.z*.14)),-radial,.2)
        if hit is not None:
            angle=math.atan2(v.co.z,v.co.x)
            if ob.name.startswith('Raised tan'):
                baseline=1/math.sqrt((math.cos(angle)/.0305)**2+(math.sin(angle)/.025)**2)
                relief=.0019+(Vector((v.co.x,0,v.co.z)).length-baseline)
            elif ob.name.startswith('Closure pull tab'):relief=.0046
            elif ob.name.startswith('Closure'):relief=.0032
            else:relief=.0009
            v.co=hit+normal*relief
        nearest=kd.find_n(v.co,3);weights={};total=0
        for co,index,distance in nearest:
            influence=1/max(.0001,distance)**2;total+=influence
            for old in body.data.vertices[index].groups:weights[old.group]=weights.get(old.group,0)+old.weight*influence
        for group in ob.vertex_groups:group.remove([v.index])
        for index,weight in weights.items():ob.vertex_groups[index].add([v.index],weight/total,'REPLACE')

# The original UVs still own the approved idle hand/weapon contact bake.
nodes,links=navy.node_tree.nodes,navy.node_tree.links
ao=nodes.new('ShaderNodeTexImage');ao.image=bpy.data.images['Tactical idle occlusion']
uv=nodes.new('ShaderNodeUVMap');uv.uv_map='UVMap';links.new(uv.outputs['UV'],ao.inputs['Vector'])
group=nodes.new('ShaderNodeGroup');group.node_tree=bpy.data.node_groups.get('glTF Material Output')
if group.node_tree:links.new(ao.outputs['Color'],group.inputs['Occlusion'])

tailor_glove()
body['close_view_finish']=1
bpy.context.scene['close_view_finish_source']='assets/source/ak47/refine.py'
for image_name, filename in [('Tactical idle occlusion','urban-b-occlusion.png'),('Tactical atlas normal','urban-b-normal.png'),('urban-b-albedo.png','urban-b-albedo.png')]:
    bpy.data.images[image_name].filepath=str(SOURCE/'textures'/filename)
for image in list(bpy.data.images):
    if image.users == 0 and image.name.startswith('close-'):
        bpy.data.images.remove(image)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'ak47.blend'))
print('Close-view construction authored and saved.')
