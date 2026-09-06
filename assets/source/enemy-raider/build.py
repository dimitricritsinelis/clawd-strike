"""Author the raider candidate, skin, PBR textures and in-place animation in Blender.

Run Blender --background --python assets/source/enemy-raider/build.py.
The existing source and shipping raider are read-only garage dependencies.
"""
from pathlib import Path
import bpy
import bmesh
import hashlib
import json
import math
import numpy as np
from mathutils import Matrix, Quaternion, Vector, Euler

WEAPON_OFFSET = Vector((.59, -.235, 1.445))
WEAPON_ROTATION = Euler((0, .06, -.12)).to_matrix()
MUZZLE_WORLD = WEAPON_ROTATION @ Vector((.489, 0, .0767)) + WEAPON_OFFSET

def cut_donor_rifle(body):
    image = next(node.image for node in body.data.materials[0].node_tree.nodes
                 if node.type == 'TEX_IMAGE' and any(link.to_socket.name == 'Base Color'
                 for link in node.outputs['Color'].links))
    pixels = np.asarray(image.pixels[:]).reshape(image.size[1], image.size[0], 4)
    mesh = bmesh.new()
    mesh.from_mesh(body.data)
    uv_layer = mesh.loops.layers.uv.active

    def gun_region(point):
        x, y, z = point
        axis = -.16 - .13 * x
        if x > .79 and z > 1.42:
            return True
        if .26 < x < .8 and 1.50 < z < 1.605 and abs(y-axis) < .052:
            return not (x < .4 and z > 1.56)
        if .33 < x < .58 and 1.275 < z < 1.39 and abs(y-axis) < .073:
            return True
        return .34 < x < .57 and 1.39 < z < 1.50 and abs(y-axis) < .034

    def protected_anatomy(face):
        x, y, z = face.calc_center_median()
        if z < 1.39:
            return False
        if x < .45 and z > 1.535:
            return True
        uv = sum((loop[uv_layer].uv for loop in face.loops), Vector((0, 0))) / len(face.loops)
        r, g, b, _ = pixels[int(uv.y % 1 * image.size[1]) % image.size[1],
                            int(uv.x % 1 * image.size[0]) % image.size[0]]
        warm = r > g * 1.14 and r > b * 1.4
        if warm and ((x < .45 and z > 1.52) or (.42 < x < .79 and 1.40 < z < 1.523)):
            return True
        right_glove = ((x-.395)/.132)**2 + ((y+.260)/.085)**2 + ((z-1.446)/.066)**2
        support_glove = ((x-.694)/.105)**2 + ((y+.210)/.095)**2 + ((z-1.435)/.090)**2
        return right_glove < 1 or support_glove < 1

    removed = [face for face in mesh.faces
               if gun_region(face.calc_center_median()) and not protected_anatomy(face)]
    count = len(removed)
    bmesh.ops.delete(mesh, geom=removed, context='FACES')
    mesh.to_mesh(body.data)
    mesh.free()
    return count


def repair_hand_boundaries(body):
    mesh=bmesh.new();mesh.from_mesh(body.data)
    mesh.verts.index_update();mesh.edges.index_update()
    uv_layer=mesh.loops.layers.uv.active
    # The replaced donor magazine left two isolated shards between the hands.
    seen=set();remove=[]
    for vertex in mesh.verts:
        if vertex in seen:continue
        todo=[vertex];component=[]
        while todo:
            v=todo.pop()
            if v in seen:continue
            seen.add(v);component.append(v)
            todo += [e.other_vert(v) for e in v.link_edges if e.other_vert(v) not in seen]
        if len(component)<20 and all(.50<v.co.x<.56 and 1.38<v.co.z<1.43 for v in component):
            remove += component
    removed=len(remove)
    bmesh.ops.delete(mesh,geom=remove,context='VERTS')
    # Follow face adjacency at pinched vertices, so two holes sharing a
    # vertex remain two holes rather than an invalid figure-eight polygon.
    seen=set();boundaries=[]
    for edge in mesh.edges:
        if not edge.is_boundary or edge in seen:continue
        first=edge.link_loops[0];current=first;ring=[]
        for _ in range(len(mesh.edges)):
            if current.edge in seen:break
            seen.add(current.edge);ring.append(current.edge)
            following=current.link_loop_next
            while not following.edge.is_boundary:
                following=following.link_loop_radial_next.link_loop_next
            current=following
            if current==first:break
        boundaries.append(ring)
    closed=0;new_faces=0;smoothed=0
    for loop in boundaries:
        vs=sorted({v for e in loop for v in e.verts},key=lambda v:v.index)
        firing=all(.31<v.co.x<.48 and 1.36<v.co.z<1.49 for v in vs)
        support=all(.54<v.co.x<.84 and 1.47<v.co.z<1.54 for v in vs)
        if not (firing or support):continue
        if not all(sum(1 for e in v.link_edges if e in loop)==2 for v in vs):continue
        # Relax the sawtooth cut, retaining the original grip rather than
        # projecting the hand into the rifle or changing its attachment.
        for i in range(4 if len(vs)>6 else 0):
            updates={v:v.co.lerp(sum((e.other_vert(v).co for e in v.link_edges if e in loop),Vector())/2,.5) for v in vs}
            for v,co in updates.items():v.co=co
        smoothed += len(vs)
        # Fan closure keeps each small patch on its own adjacent UV island.
        # New centers receive the same Chest weights as the existing hand.
        center=mesh.verts.new(sum((v.co for v in vs),Vector())/len(vs), vs[0])
        if support:center.co.z += .002
        for e in loop:
            adjacent=e.link_loops[0]
            va,vb=adjacent.vert,adjacent.link_loop_next.vert
            face=mesh.faces.new((vb,va,center));face.material_index=0;face.smooth=True
            uv_a,uv_b=adjacent[uv_layer].uv.copy(),adjacent.link_loop_next[uv_layer].uv.copy()
            # Keep new samples inside the neighboring authored texture island.
            uv_inside=sum((l[uv_layer].uv for l in adjacent.face.loops),Vector((0,0)))/len(adjacent.face.loops)
            for l in face.loops:
                l[uv_layer].uv = uv_b if l.vert==vb else uv_a if l.vert==va else (uv_a+uv_b)/2*.8+uv_inside*.2
            new_faces += 1
        closed +=1
    bmesh.ops.recalc_face_normals(mesh,faces=list(mesh.faces))
    mesh.to_mesh(body.data);mesh.free();body.data.update()
    return {'removed_vertices':removed,'closed_boundaries':closed,'new_faces':new_faces,'smoothed_vertices':smoothed}

def import_fitted_rifle(root):
    scene = bpy.context.scene
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(root / 'apps/client/public/assets/models/weapons/ak47/ak47.glb'))
    bpy.context.view_layer.update()
    imported = sorted(set(scene.objects) - before, key=lambda ob: ob.name)
    scale = .976 / (5.63754 - 3.72077)
    parts = []
    for ob in imported:
        if ob.type != 'MESH':
            continue
        world = ob.matrix_world.copy()
        ob.parent = None
        ob.matrix_world.identity()
        for vertex in ob.data.vertices:
            p = world @ vertex.co
            p = Vector(((p.x-3.72077)*scale-.490, (p.y+.37958)*scale,
                        (p.z-.22530)*scale+.075))
            vertex.co = WEAPON_ROTATION @ p + WEAPON_OFFSET
        parts.append(ob)
    for ob in imported:
        if ob.type != 'MESH':
            bpy.data.objects.remove(ob, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    weapon = bpy.context.object
    weapon.name = 'Raider_Rifle'
    mesh = bmesh.new()
    mesh.from_mesh(weapon.data)
    bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=.000001)
    mesh.to_mesh(weapon.data)
    mesh.free()
    triangles = sum(len(face.vertices)-2 for face in weapon.data.polygons)
    modifier = weapon.modifiers.new('Offline raider rifle budget', 'DECIMATE')
    modifier.ratio = min(1, 3800/triangles)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    weapon.data.normals_split_custom_set([(0, 0, 0)] * len(weapon.data.loops))
    weapon.data.set_sharp_from_angle(angle=math.radians(38))
    for face in weapon.data.polygons:
        face.use_smooth = True
    modifier = weapon.modifiers.new('Weighted hard-surface normals', 'WEIGHTED_NORMAL')
    modifier.keep_sharp = True
    modifier.weight = 50
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    assert sum(len(face.vertices)-2 for face in weapon.data.polygons) <= 4000
    assert len(weapon.data.materials) == 1
    return weapon

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
OUT = ROOT / 'apps/client/public/assets/models/characters/enemy_raider_next'
REVIEW = ROOT / 'artifacts/raider-review'
DONOR = ROOT / 'art-source/characters/enemy_raider/model_source_4k.glb'
for folder in [OUT, REVIEW]:
    folder.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.fps = 60
bpy.ops.import_scene.gltf(filepath=str(DONOR))
body = next(ob for ob in scene.objects if ob.type == 'MESH')
body.name = 'Raider_Low'
for vertex in body.data.vertices:
    vertex.co *= 1.8 / .9998824
    vertex.co.x += .43
    vertex.co.z += .500045955 * 1.8 / .9998824

# The donor was posed with one boot above the other. Ground each sole before
# binding; the runtime foot plane must describe both boots, not one bbox vertex.
for side in [-1,1]:
    sole = min(v.co.z for v in body.data.vertices if v.co.z < .12 and v.co.y*side > .04)
    for v in body.data.vertices:
        if v.co.z < .24 and v.co.y*side > .04:
            v.co.z -= sole * max(0,min(1,(.24-v.co.z)/.10))

removed_donor_rifle_faces = cut_donor_rifle(body)

# Weld coincident UV-seam vertices before reduction. UVs remain per corner;
# decimating disconnected seam borders would tear open the clothing.
bm = bmesh.new()
bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
bm.to_mesh(body.data)
bm.free()
body.data.validate(clean_customdata=True)
repair_hand_boundaries(body)
# Preserve the detailed source for nearby opponents. Both LODs share one
# skeleton and texture set; only one mesh renders for each opponent.
hero = body.copy()
hero.data = body.data.copy()
hero.name = 'Raider_High'
scene.collection.objects.link(hero)
# The distant LOD retains the shipping 8k triangle ceiling.
joint_group = body.vertex_groups.new(name='JointTopology')
for v in body.data.vertices:
    importance = max(math.exp(-((v.co.z - h) / .08) ** 2) for h in [.16, .50, .86])
    joint_group.add([v.index], importance, 'REPLACE')
decimate = body.modifiers.new('Offline deformation-aware LOD', 'DECIMATE')
decimate.ratio = .17
decimate.vertex_group = joint_group.name
decimate.vertex_group_factor = .35
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_apply(modifier=decimate.name)
body.data.validate(clean_customdata=True)
body.vertex_groups.clear()
# Reduction can reopen thin glove patches; close them in the distant LOD too.
repair_hand_boundaries(body)
body.data.normals_split_custom_set([(0,0,0)] * len(body.data.loops))
for surface in [body,hero]:
    for old_color in list(surface.data.color_attributes):
        surface.data.color_attributes.remove(old_color)
    surface.data.normals_split_custom_set([(0,0,0)] * len(surface.data.loops))
    for poly in surface.data.polygons:
        poly.use_smooth = True

# Keep the donor's full-resolution colour and normal detail. Cloth has a drier
# response than leather, using the authored roughness separation and wear.
material = body.data.materials[0]
material.name = 'Raider_WeatheredKhaki_PBR'
nodes = material.node_tree.nodes
principled = nodes.get('Principled BSDF')
principled.inputs['Specular IOR Level'].default_value = .28
textures = [node for node in nodes if node.type == 'TEX_IMAGE']
for node in textures:
    image = node.image
    is_color = any(link.to_socket.name == 'Base Color' for link in node.outputs['Color'].links)
    is_normal = any(link.to_node.type == 'NORMAL_MAP' for link in node.outputs['Color'].links)
    if is_color or is_normal:
        # Preserve the source JPEG bytes without another lossy encode.
        filename = 'raider-albedo.jpg' if is_color else 'raider-normal.jpg'
        image.filepath_raw = str(OUT / filename)
        (OUT / filename).write_bytes(image.packed_file.data)
        continue
    width, height = image.size
    pixels = np.array(image.pixels[:], dtype=np.float32).reshape(height, width, 4)
    roughness = pixels[:, :, 1]
    cloth = np.clip((roughness - .48) / .16, 0, 1)
    cloth = cloth * cloth * (3 - 2 * cloth)
    pixels[:, :, 1] = np.minimum(.92, roughness + cloth * .10)
    # A new data image avoids the imported image retaining its old packed bytes.
    # The ORM channels need less resolution than colour and normal detail.
    refined = bpy.data.images.new('raider-orm', width=width, height=height,
                                 alpha=False, is_data=True)
    refined.colorspace_settings.name = 'Non-Color'
    refined.pixels.foreach_set(pixels.ravel())
    refined.scale(2048, 2048)
    refined.filepath_raw = str(OUT / 'raider-orm.png')
    refined.file_format = 'PNG'
    refined.save()
    packed = (OUT / 'raider-orm.png').read_bytes()
    refined.pack(data=packed, data_len=len(packed))
    node.image = refined
for retired_map in ['raider-normal.png', 'raider-orm.jpg']:
    (OUT / retired_map).unlink(missing_ok=True)

def mat(name, color, roughness, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metal
    return m

armature = bpy.data.armatures.new('RaiderRig')
rig = bpy.data.objects.new('RaiderRig', armature)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
body.select_set(False)
bpy.ops.object.mode_set(mode='EDIT')
definition = {
    'Root': ((0,0,0), (0,0,.2), None),
    'Pelvis': ((0,0,.94), (0,0,1.07), 'Root'),
    'Spine': ((0,0,1.07), (.02,0,1.27), 'Pelvis'),
    'Chest': ((.02,0,1.27), (.08,0,1.49), 'Spine'),
    'Head': ((.18,-.10,1.55), (.25,-.10,1.78), 'Chest'),
    'Thigh_R': ((0,-.15,.94), (.17,-.155,.525), 'Pelvis'),
    'Shin_R': ((.17,-.155,.525), (0,-.16,.13), 'Thigh_R'),
    'Foot_R': ((0,-.16,.13), (.18,-.176,.13), 'Shin_R'),
    'Thigh_L': ((0,.16,.94), (.17,.16,.525), 'Pelvis'),
    'Shin_L': ((.17,.16,.525), (0,.16,.13), 'Thigh_L'),
    'Foot_L': ((0,.16,.13), (.18,.176,.13), 'Shin_L'),
}
# Bind to neutral 45 cm thighs and 43 cm shins for the selected higher hip
# pivot. Unpose the donor geometry into this frame to keep the knees aligned.
for side in ['L','R']:
    hip = Vector(definition['Thigh_'+side][0])
    ankle = Vector(definition['Foot_'+side][0])
    axis = (ankle-hip).normalized()
    bend = Vector((1,0,0))
    bend = (bend-axis*bend.dot(axis)).normalized()
    upper = .45
    distance = (ankle-hip).length
    along = (upper**2 - .43**2 + distance**2) / (2*distance)
    knee = hip + axis*along + bend*math.sqrt(upper**2-along**2)
    definition['Thigh_'+side] = (tuple(hip),tuple(knee),'Pelvis')
    definition['Shin_'+side] = (tuple(knee),tuple(ankle),'Thigh_'+side)
# Measured source-space pivots and sole headings. The source's right knee
# bends outward and both boot axes differ from their old rest foot bones.
# Preserve the actual source anatomy while bringing it into the neutral rig.
donor_legs = {
    'R': ((-.11,-.15,.92), (-.115,-.215,.50), (-.2364,-.1006,.13), -71),
    'L': ((.06,.16,.92), (.345,.16,.50), (.3627,.1969,.13), -30),
}

def limb_frame(head, tail, pole):
    axis = (tail-head).normalized()
    bend = (pole-axis*pole.dot(axis)).normalized()
    return Matrix((bend, axis, bend.cross(axis).normalized())).transposed()

def fitted_transform(head, tail, pole, target_head, target_tail):
    source = limb_frame(head, tail, pole)
    target = limb_frame(target_head, target_tail, Vector((1,0,0)))
    stretch = Matrix.Diagonal(Vector((1, (target_tail-target_head).length/(tail-head).length, 1)))
    linear = target @ stretch @ source.transposed()
    return Matrix.Translation(target_head) @ linear.to_4x4() @ Matrix.Translation(-head)

neutralize = {name: Matrix.Identity(4) for name in definition}
for side, (hip, knee, ankle, toe_yaw) in donor_legs.items():
    hip, knee, ankle = Vector(hip), Vector(knee), Vector(ankle)
    axis = (ankle-hip).normalized()
    pole = knee-hip-axis*(knee-hip).dot(axis)
    target_hip = Vector(definition['Thigh_'+side][0])
    target_knee = Vector(definition['Shin_'+side][0])
    target_ankle = Vector(definition['Foot_'+side][0])
    neutralize['Thigh_'+side] = fitted_transform(hip, knee, pole, target_hip, target_knee)
    neutralize['Shin_'+side] = fitted_transform(knee, ankle, pole, target_knee, target_ankle)
    # Boots are rigid: remove their measured yaw without stretching or tilting
    # the soles. The source-space cuff weights blend this into the shin.
    target_yaw = math.atan2(-.016 if side == 'R' else .016, .18)
    neutralize['Foot_'+side] = (Matrix.Translation(target_ankle)
        @ Matrix.Rotation(target_yaw-math.radians(toe_yaw), 4, 'Z')
        @ Matrix.Translation(-ankle))

for name, (head, tail, parent) in definition.items():
    bone = armature.edit_bones.new(name)
    bone.head, bone.tail = head, tail
    if parent:
        bone.parent = armature.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
rig.show_in_front = True
rig['heightM'] = 1.8
rig['walkStrideM'] = 1.10
rig['runStrideM'] = 1.40
rig['strafeWalkStrideM'] = .65
rig['strafeRunStrideM'] = .70
rig['footHeightM'] = .13
rig['forwardAxis'] = '+X'
rig['reviewStatus'] = 'Candidate; legacy asset retained pending user approval'

def smooth(a, b, value):
    t = max(0, min(1, (value-a)/(b-a)))
    return t*t*(3-2*t)

for surface in [body, hero]:
    groups = {name: surface.vertex_groups.new(name=name) for name in definition}
    for v in surface.data.vertices:
        x, y, z = v.co
        weights = {}
        if z < .97:
            # The original stance is staggered. Split on the anatomical diagonal,
            # not world Y alone, which otherwise attaches inner boots to both legs.
            left = smooth(-.08, .08, y + .32 * (x-.08))
            pelvis = smooth(.77, .96, z)
            shin = 1-smooth(.41, .58, z)
            # Keep the leather boot rigid. Blend into the shin only through
            # the trouser cuff, so ankle flexion cannot collapse the boot shaft.
            foot = 1-smooth(.25, .34, z)
            weights['Pelvis'] = pelvis
            for side, side_weight in [('L', left), ('R', 1-left)]:
                weights['Thigh_'+side] = (1-pelvis) * (1-shin) * side_weight
                weights['Shin_'+side] = (1-pelvis) * shin * (1-foot) * side_weight
                weights['Foot_'+side] = (1-pelvis) * shin * foot * side_weight
        else:
            chest = smooth(1.06, 1.27, z)
            head = smooth(1.54, 1.66, z) if x < .58 else 0
            weights = {'Spine': 1-chest, 'Chest': chest*(1-head), 'Head': chest*head}
        weights = sorted(((n,w) for n,w in weights.items() if w > .001), key=lambda item: -item[1])[:4]
        total = sum(w for _,w in weights)
        for name, weight in weights:
            groups[name].add([v.index], weight/total, 'REPLACE')
        # Bake the source pose correction once, using the same source-space
        # weights as the final skin. Runtime animation then uses a neutral bind.
        source_point = v.co.copy()
        v.co = sum(((neutralize[name] @ source_point) * (weight/total)
                    for name, weight in weights), Vector((0,0,0)))
    modifier = surface.modifiers.new('Raider skin deformation', 'ARMATURE')
    modifier.object = rig
    surface.parent = rig

weapon = import_fitted_rifle(ROOT)
rifle_images = sorted({node.image for mat in weapon.data.materials for node in mat.node_tree.nodes
                       if node.type == 'TEX_IMAGE' and node.image},key=lambda im:im.name)
for index,im in enumerate(rifle_images):
    im.scale(1024,1024)
    im.filepath_raw = str(OUT/f'raider-rifle-{index}.jpg')
    im.file_format = 'JPEG'
    im.save()
    im.pack()
weapon_world = weapon.matrix_world.copy()
weapon.parent = rig
weapon.parent_type = 'BONE'
weapon.parent_bone = 'Chest'
bpy.context.view_layer.update()
weapon.matrix_world = weapon_world

# Socket belongs to the animated upper body, so recoil and breathing carry FX.
socket = bpy.data.objects.new('MuzzleSocket', None)
scene.collection.objects.link(socket)
socket.parent = rig
socket.parent_type = 'BONE'
socket.parent_bone = 'Chest'
bpy.context.view_layer.update()
socket.matrix_world = Matrix.Translation(MUZZLE_WORLD)

def set_bone(name, head, tail):
    pb = rig.pose.bones[name]
    rest = armature.bones[name].matrix_local.to_quaternion()
    original = Vector(definition[name][1]) - Vector(definition[name][0])
    rotation = original.normalized().rotation_difference((Vector(tail)-Vector(head)).normalized()) @ rest
    pb.matrix = Matrix.LocRotScale(Vector(head), rotation, Vector((1,1,1)))
    bpy.context.view_layer.update()

def leg(side, ankle, pelvis_offset):
    hip = Vector(definition['Thigh_'+side][0]) + pelvis_offset
    hip.x = pelvis_offset.x
    target = Vector(ankle)
    upper = (Vector(definition['Thigh_'+side][1])-Vector(definition['Thigh_'+side][0])).length
    lower = (Vector(definition['Shin_'+side][1])-Vector(definition['Shin_'+side][0])).length
    direction = target-hip
    distance = min(direction.length, upper+lower-.0005)
    direction.normalize()
    along = (upper*upper-lower*lower+distance*distance)/(2*distance)
    bend = Vector((1,0,0))
    bend -= direction*bend.dot(direction)
    bend.normalize()
    knee = hip + direction*along + bend*math.sqrt(max(0,upper*upper-along*along))
    set_bone('Thigh_'+side, hip, knee)
    set_bone('Shin_'+side, knee, target)
    set_bone('Foot_'+side, target, target+Vector((.18, -.016 if side=='R' else .016, 0)))

def pose(phase=0, stride=0, direction=(1,0), run=False, idle_time=0):
    for pb in rig.pose.bones:
        pb.matrix_basis.identity()
    # Let the supporting leg extend as the feet pass beneath the hips.
    # The reach limit below lowers the pelvis only where the stride needs it.
    offset = Vector((0, math.sin(phase*math.tau)*.012 if stride else 0, .075 if stride else .01))
    if stride:
        offset.z += math.cos(phase*math.tau*2) * (.008 if run else .005)
    targets = []
    for side, shift in [('R',0),('L',.5)]:
        p = (phase+shift)%1
        if p <= .5:
            travel = stride*(.25-p)
            lift = 0
        else:
            t = (p-.5)*2
            travel = stride*(-.25+.5*t)
            lift = math.sin(t*math.pi)**1.4 * (.16 if run else .085)
        # Side steps land on separate lateral lanes. A shorter strafe stride
        # leaves room for the trailing boot to close without crossing the lead.
        half_stance = (.32 if run else .295) if direction[1] else .16
        ankle = (direction[0]*travel, (-half_stance if side=='R' else half_stance)+direction[1]*travel, .13+lift)
        targets.append((side, ankle))
        hip = Vector(definition['Thigh_'+side][0]) + offset
        horizontal_sq = (ankle[0]-hip.x)**2 + (ankle[1]-hip.y)**2
        # Keep both authored targets reachable with knee flexion. Clamping only
        # the knee solver while keying an unreachable ankle stretches the shin.
        max_hip_z = ankle[2] + math.sqrt(max(0, (.45+.43-.005)**2-horizontal_sq))
        offset.z = min(offset.z, max_hip_z-definition['Thigh_'+side][0][2])
    pelvis = rig.pose.bones['Pelvis']
    pelvis.location = armature.bones['Pelvis'].matrix_local.to_quaternion().inverted() @ offset
    rig.pose.bones['Spine'].rotation_mode = 'QUATERNION'
    # Raising the pelvis relaxes the knees while retaining the authored head
    # and rifle height inside the existing gameplay envelope.
    rig.pose.bones['Spine'].location = armature.bones['Spine'].matrix_local.to_quaternion().inverted() @ Vector((0,0,-max(0,offset.z)))
    rig.pose.bones['Spine'].rotation_quaternion = Quaternion((0,0,1), .004*math.sin(idle_time*math.tau/3))
    bpy.context.view_layer.update()
    for side, ankle in targets:
        leg(side, ankle, offset)

def animation(name, seconds, stride=0, direction=(1,0), run=False):
    frames = round(seconds*60)
    rig.animation_data_create()
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    for frame in range(frames+1):
        phase = frame/frames
        pose(phase, stride, direction, run, frame/60)
        for pb in rig.pose.bones:
            pb.rotation_mode = 'QUATERNION'
            pb.keyframe_insert('location', frame=frame+1)
            pb.keyframe_insert('rotation_quaternion', frame=frame+1)
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    rig.animation_data.action = None
    return action

animation('Idle', 3)
for label, direction in [('Forward',(1,0)),('Backward',(-1,0)),('Left',(0,1)),('Right',(0,-1))]:
    animation('Walk'+label, 1, .65 if direction[1] else 1.10, direction)
    animation('Run'+label, .6, .70 if direction[1] else 1.40, direction, True)
for track in rig.animation_data.nla_tracks:
    track.mute = True
pose()

scene.frame_start, scene.frame_end = 1, 181
for ob in scene.objects:
    ob.select_set(True)
# NLA export gathers named tracks. Unmute for export, then restore the review pose.
for track in rig.animation_data.nla_tracks:
    track.mute = False
bpy.ops.export_scene.gltf(filepath=str(OUT/'raider.glb'), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
    export_anim_slide_to_zero=True, export_yup=True, export_extras=True,
    export_def_bones=True)
for track in rig.animation_data.nla_tracks:
    track.mute = True
pose()

triangles = {ob.name:sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in [body,hero,weapon]}
assert triangles['Raider_Low'] + triangles['Raider_Rifle'] < 8000
assert triangles['Raider_High'] + triangles['Raider_Rifle'] < 28000
body.hide_render = True
body.hide_set(True)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.world = bpy.data.worlds.new('Studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.045,.055,.065,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .5
scene.render.resolution_x, scene.render.resolution_y = 1200, 1400
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
def area(name, location, power, size, color):
    data = bpy.data.lights.new(name,'AREA')
    data.energy, data.size, data.color = power,size,color
    ob = bpy.data.objects.new(name,data)
    scene.collection.objects.link(ob)
    ob.location = location
    ob.rotation_euler = (Vector((0,0,1))-ob.location).to_track_quat('-Z','Y').to_euler()
area('Warm key',(2,-3,3.5),450,3,(1,.89,.79))
area('Cool rim',(-2,2,2.8),350,2,(.65,.78,1))
area('Face fill',(3,1,1.7),200,2,(1,.96,.89))
bpy.ops.mesh.primitive_plane_add(size=200)
floor = bpy.context.object
floor.name = 'Review floor - not exported'
floor.data.materials.append(mat('Studio floor',(.055,.069,.075),.88))
camera_data = bpy.data.cameras.new('Review camera')
camera = bpy.data.objects.new('Review camera',camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera.location = (3.8,-4.6,2.3)
camera.rotation_euler = (Vector((.18,0,.95))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 2.15
scene.render.filepath = str(REVIEW/'blender-raider.png')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'raider.blend'))
bpy.ops.render.render(write_still=True)
for label,phase in [('contact',0),('passing',.25)]:
    pose(phase,1.10)
    scene.render.filepath = str(REVIEW/('blender-walk-'+label+'.png'))
    bpy.ops.render.render(write_still=True)
manifest = {
    'name': 'Skinned raider candidate', 'status': 'Awaiting user design approval',
    'source': 'repo://assets/source/enemy-raider/build.py',
    'sourceMd5': hashlib.md5(Path(__file__).read_bytes()).hexdigest(),
    'license': 'Existing project Tripo character; rifle derivative CC-BY-NC-4.0; new rig and motion Project-Original',
    'dependencies': [{'file':str(DONOR.relative_to(ROOT)), 'source':'Existing repository Tripo export',
        'license':'Existing project asset; no new external acquisition', 'md5':hashlib.md5(DONOR.read_bytes()).hexdigest()},
        {'file':'apps/client/public/assets/models/weapons/ak47/ak47.glb',
         'source':'https://sketchfab.com/3d-models/ak-47-384565b1779c450b90397232163e4e6d',
         'author':'lokeig','license':'CC-BY-NC-4.0',
         'md5':hashlib.md5((ROOT/'apps/client/public/assets/models/weapons/ak47/ak47.glb').read_bytes()).hexdigest()}],
    'triangles':triangles, 'bones':len(definition), 'heightM':1.8,
    'coordinates':'Blender +X forward, +Z up; glTF +X forward, +Y up. Foot plane at 0.',
    'animations':[track.name for track in rig.animation_data.nla_tracks],
    'files':[{'file':p.name,'md5':hashlib.md5(p.read_bytes()).hexdigest()} for p in sorted(OUT.iterdir()) if p.suffix in ['.glb','.jpg','.png']],
}
(OUT/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'triangles':triangles,'bytes':(OUT/'raider.glb').stat().st_size,'animations':manifest['animations']}))
