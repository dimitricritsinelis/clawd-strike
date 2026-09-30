"""Viewmodel v2: arm budget, finish, anatomical idle grip and the magazine-only Reload clip.

Run from the repository (always start from the v1 blend, ak47.blend at commit 828ad9c):
  Blender -b --factory-startup --python-exit-code 1 --python assets/source/ak47/viewmodel_v2.py -- \
      --in v1.blend --out assets/source/ak47/ak47.blend

Stages
1. Arm meshes are decimated from ~634k to ~110k triangles (the rifle keeps its 23k).
2. Glove, sleeve, binding and leather colours are toned down so the rifle leads;
   rifle metal is neutralised, walnut is shifted from red mahogany to brown and
   its faces are re-projected at a uniform, lengthwise grain density.
3. The idle support grip's digits are re-authored through hand_pose.py from
   grips/idle.json (thumb MCP/IP flex about the calibrated hinge, no side-bend), and the
   hand is lifted off the handguard wood (grips/idle.json placement).
4. A spare magazine (with a visible top round) is added and the Case 04 reload is replaced by one clip,
   "Reload", authored to the marks in apps/client/src/runtime/weapons/ak47ReloadMarks.ts
   (parsed here; that file is the single source of truth). Magazine change only:
   rock the old magazine out about its front lug, drop it out of frame, fetch the
   fresh one, hook, rock in, latch. No charging handle.
   The rifle tilt is authored in the clip (AK47_Rig, pivoting about the pistol grip),
   the left arm is solved by IK against hand targets with its shoulder held in camera
   space, then baked to FK with the forearm carrying the roll. Hand placements and digits come from
   grips/reload-fit.json (v3) through hand_pose.digit_quaternions: both magazines are held between a
   thumb curled on the near face (IP ~43-52 deg, MCP ~23-35 deg about the calibrated hinge) and
   fingers wrapped round the front edge; the removal thumb reaches back to the paddle only for the
   press. Folding stitch dashes of the palm overlay are pinned to the suede or removed.
"""
import importlib.util
import re
from pathlib import Path
import argparse
import colorsys
import json
import math
import sys
import bpy
import bmesh
import numpy as np
from mathutils import Euler, Matrix, Quaternion, Vector

SOURCE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--in', dest='inp', default=str(SOURCE / 'ak47.blend'))
parser.add_argument('--out', default=None)
parser.add_argument('--skip-mesh', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])

bpy.ops.wm.open_mainfile(filepath=args.inp)
scene = bpy.context.scene
if scene.get('viewmodel_v2'):
    raise RuntimeError('Input already contains viewmodel v2; start from the v1 ak47.blend (commit 828ad9c)')
FPS = 120
scene.render.fps = FPS
root = bpy.data.objects['AK47_Rig']
L = bpy.data.objects['L_Armature']
R = bpy.data.objects['R_Armature']
mag = bpy.data.objects['Magazine']
bolt = bpy.data.objects['Bolt']
report = {}

# ---------------------------------------------------------------- 1. arm budget
ARM_TARGETS = {
    'GloveAndForearm': 15000, 'Palm heel suede overlay': 6500, 'Tailored ripstop sleeve': 4000,
    'Palm overlay rolled seam': 3000, 'Palm overlay stitching': 4000, 'Palm overlay stitching.001': 4000,
    'Dorsal reinforcement': 2500, 'Cuff saddle stitch': 1600, 'Cuff saddle stitch.001': 1600,
    'Rolled cuff edge': 1600, 'Rolled cuff edge.001': 1600, 'Sleeve double topstitch': 1500,
    'Sleeve double topstitch.001': 1500, 'Raised tan wrist closure': 1400, 'Raised tan closure pull tab': 1000,
    'Index knuckle pad': 900, 'Middle knuckle pad': 900, 'Ring knuckle pad': 900, 'Little knuckle pad': 900,
}

def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)

def target_for(name):
    base = name[2:] if name.startswith('R_') else name
    base = base.replace('L_GloveAndForearm', 'GloveAndForearm').replace('Hand  - Realistic', 'GloveAndForearm')
    for key, value in ARM_TARGETS.items():
        if base == key or base.endswith(key):
            return value
    return None

arm_meshes = [o for o in scene.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
before = sum(tris(o) for o in arm_meshes)
if not args.skip_mesh:
    for ob in arm_meshes:
        target = target_for(ob.name)
        count = tris(ob)
        if not target or count <= target * 1.15:
            continue
        if ob.data.users > 1:
            ob.data = ob.data.copy()
        if ob.data.shape_keys:
            raise RuntimeError('Unexpected shape keys on ' + ob.name)
        mod = ob.modifiers.new('BudgetDecimate', 'DECIMATE')
        mod.decimate_type = 'COLLAPSE'
        mod.ratio = target / count
        mod.use_collapse_triangulate = False
        while ob.modifiers[0] != mod:
            with bpy.context.temp_override(object=ob, active_object=ob):
                bpy.ops.object.modifier_move_up(modifier=mod.name)
        with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
            bpy.ops.object.modifier_apply(modifier=mod.name)
        # Deformation weights must still sum to one after edge collapse.
        for v in ob.data.vertices:
            total = sum(g.weight for g in v.groups)
            if total > 0 and abs(total - 1) > 1e-4:
                for g in v.groups:
                    g.weight /= total
report['armTriangles'] = {'before': before, 'after': sum(tris(o) for o in arm_meshes)}

# Each stitch of the left palm overlay is a separate little dash, skinned independently of the suede it is sewn to.
# Where the thumb web and the finger-base creases compress round a held magazine, the dashes shear and drift off
# the seam (white zig-zags at game scale). Every dash now takes the skin weights of the overlay vertex it sits on,
# so it rides the suede rigidly.  (Hosts: the suede overlay, its rolled seam and the glove, nearest vertex.)
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

def pin_islands(ob, hosts):
    """Give each island of ob the skin weights of the nearest host vertex (hosts: meshes it is sewn onto)."""
    points = []
    for host in hosts:
        names = {g.index: g.name for g in host.vertex_groups}
        to_ob = ob.matrix_world.inverted() @ host.matrix_world
        for v in host.data.vertices:
            points.append((to_ob @ v.co, [(names[g.group], g.weight) for g in v.groups if g.weight > 0]))
    kd = KDTree(len(points))
    for i, (co, _) in enumerate(points):
        kd.insert(co, i)
    kd.balance()
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    seen, islands = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, comp = [v], []
        while stack:
            x = stack.pop()
            if x.index in seen:
                continue
            seen.add(x.index)
            comp.append(x.index)
            stack += [e.other_vert(x) for e in x.link_edges]
        islands.append(comp)
    bm.free()
    for comp in islands:
        centre = sum((ob.data.vertices[i].co for i in comp), Vector()) / len(comp)
        _, hi, _ = kd.find(centre)
        weights = sorted(points[hi][1], key=lambda kv: -kv[1])[:4]
        norm = sum(w for _, w in weights) or 1.
        for i in comp:
            for g in list(ob.data.vertices[i].groups):
                ob.vertex_groups[g.group].remove([i])
            for name, w in weights:
                group = ob.vertex_groups.get(name) or ob.vertex_groups.new(name=name)
                group.add([i], w / norm, 'REPLACE')
    for v in ob.data.vertices:   # deformation weights sum to one
        total = sum(g.weight for g in v.groups)
        if total > 0 and abs(total - 1) > 1e-6:
            for g in v.groups:
                g.weight /= total
    return len(islands)

# Thumb knuckles: the glove's skin blend across the thumb IP (L_thumb.02/.03) and MCP (L_thumb.01/.02) was a wide
# gradient, so a 45-55 deg IP bend rendered as one smooth banana lobe. The blend is steepened about its midpoint
# (the share of the distal bone r -> 0.5 + (r - 0.5) * k, clamped), narrowing each crease band by k; the sum of the
# pair and every other influence are unchanged. Stitch dashes take their weights from these hosts afterwards.
THUMB_CREASE_SHARPEN = {('L_thumb.02', 'L_thumb.03'): 1.8, ('L_thumb.01', 'L_thumb.02'): 1.4}

def sharpen_thumb_creases(ob):
    groups = {g.name: g for g in ob.vertex_groups}
    changed = 0
    for (near, far), k in THUMB_CREASE_SHARPEN.items():
        if near not in groups or far not in groups:
            continue
        gi_near, gi_far = groups[near].index, groups[far].index
        for v in ob.data.vertices:
            w = {g.group: g.weight for g in v.groups}
            a, b = w.get(gi_near, 0.), w.get(gi_far, 0.)
            if a <= 0 or b <= 0:
                continue
            total = a + b
            r = min(1., max(0., .5 + (b / total - .5) * k))
            groups[near].add([v.index], total * (1 - r), 'REPLACE')
            groups[far].add([v.index], total * r, 'REPLACE')
            changed += 1
    return changed

report['thumbCreaseSharpened'] = {ob.name: sharpen_thumb_creases(ob) for ob in arm_meshes
                                  if ob.name in ('L_GloveAndForearm', 'Palm heel suede overlay', 'Palm overlay rolled seam')}

report['pinnedStitchIslands'] = {n: pin_islands(bpy.data.objects[n], [bpy.data.objects['Palm heel suede overlay'], bpy.data.objects['L_GloveAndForearm'], bpy.data.objects['Palm overlay rolled seam']]) for n in ['Palm overlay stitching', 'Palm overlay stitching.001']}

# Contact markers name the skin vertex they sit on; re-seat them on the decimated surface (idle pose).
def reseat_markers():
    for ob in scene.objects:
        if ob.animation_data:
            for track in ob.animation_data.nla_tracks:
                track.mute = track.name != 'Idle'
    scene.frame_set(1)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    moved = {}
    for marker in [o for o in scene.objects if o.type == 'EMPTY' and 'sourceMesh' in o.keys()]:
        source = bpy.data.objects.get(marker['sourceMesh'])
        if not source:
            continue
        evaluated = source.evaluated_get(depsgraph).to_mesh()
        target = marker.matrix_world.translation.copy()
        best = min(range(len(evaluated.vertices)), key=lambda i: ((source.matrix_world @ evaluated.vertices[i].co) - target).length_squared)
        world = source.matrix_world @ evaluated.vertices[best].co
        moved[marker.name] = round((world - target).length * 1000, 3)
        m = marker.matrix_world.copy()
        m.translation = world
        marker.matrix_world = m
        marker['sourceVertex'] = best
        source.evaluated_get(depsgraph).to_mesh_clear()
    for ob in scene.objects:
        if ob.animation_data:
            for track in ob.animation_data.nla_tracks:
                track.mute = False
    return moved

# ---------------------------------------------------------------- 2. finish
def image_array(image):
    px = np.empty(image.size[0] * image.size[1] * 4, dtype=np.float32)
    image.pixels.foreach_get(px)
    return px.reshape((-1, 4))

def write_image(image, name, rgba):
    out = bpy.data.images.new(name, image.size[0], image.size[1], alpha=True)
    out.colorspace_settings.name = image.colorspace_settings.name
    out.pixels.foreach_set(rgba.astype(np.float32).ravel())
    out.filepath_raw = str(SOURCE / 'textures' / (name + '.png'))
    out.file_format = 'PNG'
    out.save()
    out.pack()
    return out

def luminance_tint(rgba, tint, contrast=1.0):
    lum = rgba[:, :3] @ np.array([.299, .587, .114], dtype=np.float32)
    rel = (lum / max(1e-4, float(np.median(lum)))) ** contrast
    out = rgba.copy()
    out[:, :3] = np.clip(np.outer(rel, tint), 0, 1)
    return out

def hsv_adjust(rgba, hue=0., sat=1., val=1., mask=None):
    rgb = rgba[:, :3]
    mx, mn = rgb.max(1), rgb.min(1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-6
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    rm = nz & (mx == r); gm = nz & (mx == g) & ~rm; bm = nz & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = (b - r)[gm] / d[gm] + 2
    h[bm] = (r - g)[bm] / d[bm] + 4
    h = (h / 6 + hue) % 1
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0) * sat
    v = mx * val
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    table = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    new = np.zeros_like(rgb)
    for k, (a, b2, c) in enumerate(table):
        sel = i == k
        new[sel, 0], new[sel, 1], new[sel, 2] = a[sel], b2[sel], c[sel]
    out = rgba.copy()
    if mask is None:
        out[:, :3] = np.clip(new, 0, 1)
    else:
        out[mask, :3] = np.clip(new[mask], 0, 1)
    return out

def material(name):
    return bpy.data.materials[name]

def base_image_node(mat):
    link = next(l for l in mat.node_tree.links if l.to_socket.name == 'Base Color' and l.to_node.type == 'BSDF_PRINCIPLED')
    return link.from_node

recolored = {}
def recolor(mat_names, name, fn):
    node = base_image_node(material(mat_names[0]))
    src = node.image
    if src.name not in recolored:
        recolored[src.name] = write_image(src, name, fn(image_array(src)))
    for m in mat_names:
        base_image_node(material(m)).image = recolored[src.name]

# Charcoal glove, graphite reinforcement unchanged, dark leather, muted sleeve.
recolor(['Urban Breacher glove', 'Right Urban Breacher glove'], 'v2-charcoal-glove-color',
        lambda a: luminance_tint(a, np.array([.105, .104, .098], dtype=np.float32), .9))
recolor(['Navy rolled binding'], 'v2-charcoal-binding-color',
        lambda a: luminance_tint(a, np.array([.085, .083, .080], dtype=np.float32), .8))
recolor(['Saddle leather closure'], 'v2-dark-leather-closure-color',
        lambda a: hsv_adjust(a, 0., .45, .48))
recolor(['Khaki ripstop sleeve'], 'v2-olive-ripstop-sleeve-color',
        lambda a: luminance_tint(a, np.array([.215, .205, .165], dtype=np.float32), 1.))
stitch = material('Waxed flax stitching').node_tree.nodes['Principled BSDF']
stitch.inputs['Base Color'].default_value = (.19, .17, .14, 1)
for name in ['Urban Breacher glove', 'Right Urban Breacher glove', 'Khaki ripstop sleeve', 'Graphite suede reinforcement', 'Navy rolled binding', 'Saddle leather closure']:
    principled = material(name).node_tree.nodes['Principled BSDF']
    principled.inputs['Base Color'].default_value = (1, 1, 1, 1)

# Walnut: brown rather than red mahogany, lengthwise grain at uniform density.
recolor(['Oiled walnut handguard'], 'v2-walnut-color', lambda a: hsv_adjust(a, .018, .74, .86))
TILE_M = .32
for ob in [o for o in root.children_recursive if o.type == 'MESH' and not any(m.type == 'ARMATURE' for m in o.modifiers)]:
    wood = [i for i, m in enumerate(ob.data.materials) if m and m.name == 'Oiled walnut handguard']
    if not wood or not ob.data.uv_layers:
        continue
    uv = ob.data.uv_layers.active.data
    to_rig = root.matrix_world.inverted() @ ob.matrix_world
    moved = 0
    for poly in ob.data.polygons:
        if poly.material_index not in wood:
            continue
        n = (to_rig.to_3x3() @ poly.normal).normalized()
        axis = max(range(3), key=lambda k: abs(n[k]))
        for li in poly.loop_indices:
            p = to_rig @ ob.data.vertices[ob.data.loops[li].vertex_index].co
            if axis == 0:
                u, v = p.y, p.z
            elif axis == 1:
                u, v = p.x, p.z
            else:
                u, v = p.x, p.y
            uv[li].uv = (u / TILE_M + .37, v / TILE_M * 1.6 + .21)
        moved += 1
    report.setdefault('woodFacesReprojected', {})[ob.name] = moved

# Rifle atlas: neutral dark steel instead of blue, walnut regions browner, satin roughness.
atlas = material('Material_44')
atlas_base = base_image_node(atlas).image
rgba = image_array(atlas_base)
rgb = rgba[:, :3]
sat = (rgb.max(1) - rgb.min(1)) / np.maximum(rgb.max(1), 1e-4)
warm = (rgb[:, 0] > rgb[:, 2]) & (sat > .28)
metal = ~warm
rgba = hsv_adjust(rgba, .018, .74, .9, mask=warm)
lum = rgba[:, :3] @ np.array([.299, .587, .114], dtype=np.float32)
rgba[metal, :3] = np.clip(np.outer(lum[metal], np.array([1.02, 1.0, .96], dtype=np.float32)), 0, 1)
base_image_node(atlas).image = write_image(atlas_base, 'v2-rifle-atlas-color', rgba)
orm_node = next(l.from_node for l in atlas.node_tree.links if l.to_node.type == 'SEPARATE_COLOR')
orm = image_array(orm_node.image)
orm[:, 1] = np.clip(orm[:, 1] * .92 + .09, 0, 1)
orm_node.image = write_image(orm_node.image, 'v2-rifle-atlas-orm', orm)

# ---------------------------------------------------------------- 3. anatomical idle support grip
def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

hand_pose = load_module('hand_pose', SOURCE / 'hand_pose.py')
GRIPS = {n: json.loads((SOURCE / 'grips' / f'{n}.json').read_text()) for n in ['idle', 'reach', 'remove', 'insert']}
for grip_name, grip in GRIPS.items():
    hard = [p for p in hand_pose.validate(grip['anatomy']) if not p.startswith('soft:')]
    if hard:
        raise RuntimeError(f'grips/{grip_name}.json is outside the joint limits: {hard}')
digits = [b.name for b in L.pose.bones if b.name.startswith(('L_f_', 'L_thumb.'))]
if len(digits) != 15 or any(L.pose.bones[n].rotation_mode != 'QUATERNION' for n in digits):
    raise RuntimeError('Expected 15 quaternion digit bones on L_Armature')

def show_track(name):
    for ob in scene.objects:
        if ob.animation_data:
            for track in ob.animation_data.nla_tracks:
                track.mute = track.name != name

def action_curves(action):
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                yield from bag.fcurves

# The shipped idle bent the thumb MCP/IP sideways (about bone +X); rebuild all digits anatomically.
idle_action = bpy.data.actions['Idle_LeftHand_B']
idle_quats = hand_pose.digit_quaternions(L, GRIPS['idle']['anatomy'])
written = set()
for curve in action_curves(idle_action):
    match = re.fullmatch(r'pose\.bones\["(.+)"\]\.rotation_quaternion', curve.data_path)
    if match and match.group(1) in idle_quats:
        value = idle_quats[match.group(1)][curve.array_index]
        for point in curve.keyframe_points:
            point.co[1] = point.handle_left[1] = point.handle_right[1] = value
        curve.update()
        written.add((match.group(1), curve.array_index))
if len(written) != 4 * len(digits):
    raise RuntimeError('Idle_LeftHand_B lacks digit rotation channels')

def set_action_value(action, data_path, index, value):
    for curve in action_curves(action):
        if curve.data_path == data_path and curve.array_index == index:
            for point in curve.keyframe_points:
                point.co[1] = point.handle_left[1] = point.handle_right[1] = value
            curve.update()
            return
    if abs(value - (1. if data_path.endswith('rotation_quaternion') and index == 0 else 0.)) > 1e-7:
        raise RuntimeError(f'{action.name} has no channel {data_path}[{index}]')

# The approved placement had the palm heel ~7 mm inside the handguard wood. Lift the hand off it (grips/idle.json
# placement): roll about the hand's long axis around the palm centre, then move against the palm normal. The idle arm
# is nearly straight, so the whole arm shifts with the wrist (the shoulder is off screen); the roll goes into the
# forearm twist bone (L_forearm.001) and the wrist keeps its swing, so the wrist never twists.
show_track('Idle')
scene.frame_set(1)
place = GRIPS['idle']['placement']
pbn = L.pose.bones
H0 = pbn['SupportHand'].matrix.copy()
palm_n = (H0.to_3x3() @ hand_pose.PALM_NORMAL).normalized()
pivot = H0 @ Vector(place['pivot_hand_local'])
hand_x, hand_y = (H0.to_3x3() @ Vector((1, 0, 0))).normalized(), (H0.to_3x3() @ Vector((0, 1, 0))).normalized()
H_new = (Matrix.Translation(-palm_n * place['offset_along_palm_normal_m']) @ Matrix.Translation(pivot)
         @ Matrix.Rotation(math.radians(place['roll_about_hand_y_deg']), 4, hand_y)
         @ Matrix.Rotation(math.radians(place['pitch_about_hand_x_deg']), 4, hand_x) @ Matrix.Translation(-pivot) @ H0)
shift = Matrix.Translation(H_new.translation - H0.translation)
hb = L.data.bones['SupportHand']
hand_rel = (hb.parent.matrix_local.inverted() @ hb.matrix_local).inverted()

def twist_y(q):
    return 2 * math.atan2(q.y, q.w)

forearm_old = pbn['L_forearm.001'].matrix.copy()
hand_basis_old = hand_rel @ forearm_old.inverted() @ H0
forearm_shifted = shift @ forearm_old
roll = twist_y((hand_rel @ forearm_shifted.inverted() @ H_new).to_quaternion()) - twist_y(hand_basis_old.to_quaternion())
forearm_new = forearm_shifted @ Matrix.Rotation(roll, 4, 'Y')
fb = L.data.bones['L_forearm.001']
upper_basis = L.data.bones['L_upper_arm'].matrix_local.inverted() @ shift @ pbn['L_upper_arm'].matrix
forearm_basis = (fb.parent.matrix_local.inverted() @ fb.matrix_local).inverted() @ (shift @ pbn['L_forearm'].matrix).inverted() @ forearm_new
hand_basis = hand_rel @ forearm_new.inverted() @ H_new
for bone, basis in [('L_upper_arm', upper_basis), ('L_forearm.001', forearm_basis), ('SupportHand', hand_basis)]:
    loc, rot, _ = basis.decompose()
    if rot.dot(pbn[bone].rotation_quaternion) < 0:
        rot.negate()
    for k in range(3):
        set_action_value(idle_action, f'pose.bones["{bone}"].location', k, loc[k])
    for k in range(4):
        set_action_value(idle_action, f'pose.bones["{bone}"].rotation_quaternion', k, rot[k])
report['idleForearmRollDeg'] = round(math.degrees(roll), 2)
scene.frame_set(2)
scene.frame_set(1)
bpy.context.view_layer.update()
placed = pbn['SupportHand'].matrix
if (placed.translation - H_new.translation).length > 1e-6 or placed.to_quaternion().rotation_difference(H_new.to_quaternion()).angle > 1e-5:
    raise RuntimeError('Idle hand placement did not take')
report['idleHandLiftMm'] = round((H_new.translation - H0.translation).length * 1000, 3)
_, residual = hand_pose.anatomy_from_quaternions(L, {n: L.pose.bones[n].rotation_quaternion.copy() for n in digits})
report['idleDigitResidualDeg'] = round(max(residual.values()), 4)
if report['idleDigitResidualDeg'] > 3:
    raise RuntimeError(f'Idle digits keep a non-anatomical side-bend: {residual}')
if not args.skip_mesh:
    report['markerReseatMm'] = reseat_markers()

# ---------------------------------------------------------------- 4. spare magazine
spare = mag.copy()
spare.name = 'MagazineSpare'
spare.animation_data_clear()
scene.collection.objects.link(spare)
for child in mag.children:
    if child.type != 'MESH':
        continue
    dup = child.copy()
    dup.name = 'MagazineSpare_Surfaces'
    scene.collection.objects.link(dup)
    dup.parent = spare
    dup.matrix_parent_inverse = child.matrix_parent_inverse.copy()
spare.parent = root

# The fresh magazine shows its top round (7.62x39, staggered to the near-side feed lip) so it reads as loaded;
# the magazines have no cartridge geometry of their own. Magazine-local metres: the feed lips run x -0.078..-0.033
# at z ~0.002..0.006, +-0.013 wide; the round sits between them, nose up 4 deg onto the front ramp.
def cartridge_mesh():
    # (distance from the case head, radius) in mm: rim, extractor groove, tapered body, shoulder, neck, bullet ogive
    case = [(0, 0), (0, 5.65), (1.5, 5.65), (1.5, 4.9), (2.6, 4.9), (3.1, 5.6), (30.5, 5.25), (33.0, 5.0), (34.8, 4.35), (38.6, 4.35), (38.6, 0)]
    bullet = [(38.6, 0), (38.6, 3.95), (45.0, 3.95), (49.0, 3.55), (52.0, 2.75), (54.5, 1.7), (56.0, .5), (56.2, 0)]
    head = Vector((-.0765, .003, -.0006))
    axis = Vector((math.cos(math.radians(4)), 0, math.sin(math.radians(4))))
    side = Vector((0, 1, 0))
    up = axis.cross(side).normalized() * -1
    verts, faces, mat_index = [], [], []
    segments = 20
    for part, (profile) in enumerate([case, bullet]):
        rings = []
        for x, r in profile:
            ring = []
            for k in range(segments if r > 0 else 1):
                a = 2 * math.pi * k / segments
                p = head + axis * (x / 1000) + (side * math.cos(a) + up * math.sin(a)) * (r / 1000)
                ring.append(len(verts)); verts.append(p)
            rings.append(ring)
        for r0, r1 in zip(rings, rings[1:]):
            for k in range(segments):
                a0, a1 = r0[k % len(r0)], r0[(k + 1) % len(r0)]
                b0, b1 = r1[k % len(r1)], r1[(k + 1) % len(r1)]
                quad = [a0, b0, b1, a1]
                quad = [v for i, v in enumerate(quad) if v not in quad[:i]]
                if len(quad) >= 3:
                    faces.append(quad); mat_index.append(part)
    me = bpy.data.meshes.new('MagazineSpare_TopRound')
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])   # outward, so the runtime's back-face culling keeps it
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    for i, poly in enumerate(me.polygons):
        poly.material_index = mat_index[i]
    for name, color, rough in [('Cartridge brass', (.62, .45, .20, 1), .32), ('Bullet copper jacket', (.55, .30, .17, 1), .36)]:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Metallic'].default_value = 1.
        bsdf.inputs['Roughness'].default_value = rough
        me.materials.append(mat)
    return me

top_round = bpy.data.objects.new('MagazineSpare_TopRound', cartridge_mesh())
scene.collection.objects.link(top_round)
top_round.parent = spare
top_round.matrix_parent_inverse = Matrix.Identity(4)
report['spareTopRoundTriangles'] = sum(len(p.vertices) - 2 for p in top_round.data.polygons)
HIDDEN = 1e-4
# The spare's rest state is hidden, and the glTF exporter derives its child mesh's local transform from that rest
# scale: at 1e-4 float32 put the fresh magazine ~0.4 mm off in the runtime. 5e-4 keeps it exact to ~0.1 mm and is
# still hidden (world scale < 0.001).
SPARE_HIDDEN = 5e-4
spare.scale = (SPARE_HIDDEN,) * 3
spare.location = (-.1, .15, -.6)

# ---------------------------------------------------------------- reload timeline
MARKS_TS = SOURCE.parents[2] / 'apps/client/src/runtime/weapons/ak47ReloadMarks.ts'
MARK_NAMES = ['leaveHandguard', 'grip', 'release', 'rockedOut', 'drop', 'newMagazineInView', 'hook', 'latch',
              'gripOpens', 'handOnHandguard', 'end']

def parse_marks(path):
    """AK47_RELOAD_DURATION_S and AK47_RELOAD_MARKS from the TypeScript source of truth."""
    text = path.read_text()
    duration = re.search(r'export const AK47_RELOAD_DURATION_S\s*=\s*([0-9]*\.?[0-9]+)\s*;', text)
    block = re.search(r'export const AK47_RELOAD_MARKS\s*=\s*Object\.freeze\(\{(.*?)\}\);', text, re.S)
    if not duration or not block:
        raise RuntimeError(f'Cannot parse the reload timeline from {path}')
    marks = {k: float(v) for k, v in re.findall(r'^\s*([A-Za-z_]\w*)\s*:\s*([0-9]*\.?[0-9]+)\s*,?\s*$', block.group(1), re.M)}
    duration = float(duration.group(1))
    missing = [k for k in MARK_NAMES if k not in marks]
    times = [marks.get(k, -1.) for k in MARK_NAMES]
    if missing or times[0] != 0 or any(b <= a for a, b in zip(times, times[1:])) or abs(marks['end'] - duration) > 1e-9:
        raise RuntimeError(f'Unexpected reload timeline in {path}: duration {duration}, marks {marks}, missing {missing}')
    return duration, {k: marks[k] for k in MARK_NAMES}

RELOAD_S, MK = parse_marks(MARKS_TS)
report['reloadMarks'] = {'durationSeconds': RELOAD_S, **MK}

# ---------------------------------------------------------------- rig facts
def mute_all(state):
    for ob in [L, R, mag, root, bolt, spare, bpy.data.objects['Trigger']]:
        if ob.animation_data:
            for track in ob.animation_data.nla_tracks:
                track.mute = state

def action_values(action, frame, data_path, index):
    for curve in action_curves(action):
        if curve.data_path == data_path and curve.array_index == index:
            return curve.evaluate(frame)
    return None

# The approved idle, read from the (corrected) Idle clip; the v1 Case 04 reload is discarded.
mute_all(True)
L.animation_data.action = idle_action
L.animation_data.action_slot = idle_action.slots[0]
scene.frame_set(1)
bpy.context.view_layer.update()
idle_basis = {b.name: (b.location.copy(), b.rotation_quaternion.copy(), b.scale.copy()) for b in L.pose.bones}
idle_hand = L.pose.bones['SupportHand'].matrix.copy()
idle_shoulder = L.pose.bones['L_upper_arm'].head.copy()
idle_elbow = L.pose.bones['L_forearm'].head.copy()
seat = mag.matrix_basis.copy()
# The grips are magazine-relative and were fitted with this seat, in AK47_Rig space.
arm_in_rig = root.matrix_world.inverted() @ L.matrix_world
if (seat.translation - Vector((.018, 0, .058))).length > 1e-4 or seat.to_quaternion().angle > 1e-4 \
        or arm_in_rig.translation.length > 1e-6 or arm_in_rig.to_quaternion().angle > 1e-6:
    raise RuntimeError('Magazine seat or L_Armature placement differs from the one the grips were fitted to')
for ob in [L, R, mag]:
    for track in list(ob.animation_data.nla_tracks):
        if track.name == 'Reload':
            ob.animation_data.nla_tracks.remove(track)
L.animation_data.action = None
mag.animation_data.action = None

# ---------------------------------------------------------------- motion helpers
def smooth(x):
    """Quintic ease (zero velocity and acceleration at both ends)."""
    x = min(1., max(0., x))
    return x * x * x * (x * (x * 6 - 15) + 10)

def glide(x, r=.25):
    """Constant-acceleration ramps (r of the span each) around a constant-speed middle: peak speed 1/(1-r),
    against 1.5 for the cubic ease, which keeps the ~125 deg hand turn under the per-frame arm limit."""
    x = min(1., max(0., x))
    v = 1 / (1 - r)
    if x < r:
        return v * x * x / (2 * r)
    if x > 1 - r:
        return 1 - v * (1 - x) ** 2 / (2 * r)
    return v * (x - r / 2)

def spline(keys, t):
    """Catmull-Rom through (time, Vector) keys with zero velocity at the first and last key."""
    if t <= keys[0][0]:
        return keys[0][1].copy()
    if t >= keys[-1][0]:
        return keys[-1][1].copy()
    i = max(k for k in range(len(keys) - 1) if keys[k][0] <= t)
    t0, p0 = keys[i]
    t1, p1 = keys[i + 1]
    h = t1 - t0
    s = (t - t0) / h
    m0 = (p1 - keys[i - 1][1]) / (t1 - keys[i - 1][0]) * h if i > 0 else p0 * 0
    m1 = (keys[i + 2][1] - p0) / (keys[i + 2][0] - t0) * h if i + 2 < len(keys) else p0 * 0
    s2, s3 = s * s, s * s * s
    return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * m1

def pchip(keys, t):
    """Monotone cubic (Fritsch-Carlson) through (time, value) keys, per component: no overshoot between
    keys, flat at local extremes and at both ends. Values are floats or equal-length tuples."""
    times = [k[0] for k in keys]
    values = [np.atleast_1d(np.asarray(k[1], dtype=float)) for k in keys]
    if t <= times[0]:
        return values[0].copy()
    if t >= times[-1]:
        return values[-1].copy()
    i = max(k for k in range(len(keys) - 1) if times[k] <= t)
    def slope(j):
        if j == 0 or j == len(keys) - 1:
            return values[j] * 0
        d0 = (values[j] - values[j - 1]) / (times[j] - times[j - 1])
        d1 = (values[j + 1] - values[j]) / (times[j + 1] - times[j])
        w0 = 2 * (times[j + 1] - times[j]) + (times[j] - times[j - 1])
        w1 = (times[j + 1] - times[j]) + 2 * (times[j] - times[j - 1])
        with np.errstate(divide='ignore', invalid='ignore'):
            m = (w0 + w1) / (w0 / d0 + w1 / d1)
        return np.where(d0 * d1 > 0, m, 0.)
    h = times[i + 1] - times[i]
    s = (t - times[i]) / h
    s2, s3 = s * s, s * s * s
    return ((2 * s3 - 3 * s2 + 1) * values[i] + (s3 - 2 * s2 + s) * h * slope(i)
            + (-2 * s3 + 3 * s2) * values[i + 1] + (s3 - s2) * h * slope(i + 1))

def pose_matrix(position, rotation):
    return Matrix.LocRotScale(position, rotation, Vector((1, 1, 1)))

def mix_anatomy(a, b, w):
    return {d: {k: a[d][k] + (b[d][k] - a[d][k]) * w for k in a[d]} for d in a}

def with_changes(anatomy, changes):
    out = json.loads(json.dumps(anatomy))
    for digit, joints in changes.items():
        for joint, delta in joints.items():
            out[digit][joint] += delta
    return out

GRIP_PIVOT = Vector((-.25, -.04, -.03))   # pistol grip: the right hand stays low-right while the rifle cants

def rig_matrix(loc, rot):
    turn = Euler(rot, 'XYZ').to_matrix().to_4x4()
    return Matrix.Translation(Vector(loc) + GRIP_PIVOT) @ turn @ Matrix.Translation(-GRIP_PIVOT)

# The magazine's front locking lug sits at the top of its front face (x ~0.008), hooked into the front
# of the magazine well; the magazine rocks about it (negative theta = floorplate swings forward).
LUG = Vector((.008, 0., .055))

def mag_pose(theta=0., offset=(0, 0, 0), roll=0.):
    turn = Matrix.Rotation(roll, 4, 'X') @ Matrix.Rotation(theta, 4, 'Y')
    return Matrix.Translation(LUG + Vector(offset)) @ turn @ Matrix.Translation(-LUG) @ seat

# Magazine grips v3 (grips/reload-fit.json). They supersede the placement and thumb of the approved
# remove.json/insert.json (kept for provenance): the playtest showed that grip's straight thumb lying past the
# magazine's rear edge. Both grips now hold the magazine between a thumb curled on its near (camera-side) face and
# fingers wrapped round the front edge onto the far face; the removal thumb reaches back to the paddle only for the
# press. Hand placements and digits were fitted under the exported 4-influence skinning (see the file's _meta).
FIT = json.loads((SOURCE / 'grips' / 'reload-fit.json').read_text())
HAND_IN_MAG = {n: Matrix(FIT[n]['hand_in_mag']) for n in ['remove', 'insert']}
# For the paddle press the hand leans a few mm/deg along the magazine so the thumb tip reaches the paddle while the
# fingers stay wrapped (grips/reload-fit.json remove.press_hand_in_mag); it settles back into the hold as the
# magazine starts to rock.
HAND_IN_MAG['press'] = Matrix(FIT['remove'].get('press_hand_in_mag', FIT['remove']['hand_in_mag']))

def blend_placement(a, b, w):
    la, qa, _ = a.decompose()
    lb, qb, _ = b.decompose()
    return pose_matrix(la.lerp(lb, w), qa.slerp(qb, w))

def fit_anatomy(grip, thumb):
    out = json.loads(json.dumps(FIT[grip]['fingers']))
    out['thumb'] = dict(FIT['thumb'][thumb])
    return out

for fit_name, fit_anatomy_ in [('travel', FIT['travel'])] + \
        [(f'{g}.{k}', fit_anatomy(g, k)) for g in ['remove', 'insert'] for k in FIT['thumb']]:
    hard = [p for p in hand_pose.validate(fit_anatomy_) if not p.startswith('soft:')]
    if hard:
        raise RuntimeError(f'grips/reload-fit.json {fit_name} is outside the joint limits: {hard}')
# Elbow pole offset while the hand works the magazine (elbow out and slightly up keeps the forearm roll in range).
POLE_GRIP = (0, .40, 0)
POLE_LOW = (0, .05, -.15)
# The pre-shaped hand arrives this far from its grip on the magazine and seats itself with a short slide while the
# fingers close round the front edge (AK47_Rig metres).
SLIDE = Vector(FIT.get('approach_slide_m', (.01, 0., 0.)))
ROCK_POWER = 1.6  # rock-out profile u^k from the click to rockedOut: eases out of the release, accelerating
ROCK_END = -.41   # the rock runs on past rockedOut and brakes to this angle while the pull takes over
PRESHAPE = .85   # how far the fingers are already closed when the hand arrives (it slides up along the front edge)
PRESS_SQUEEZE = (3., 5., 2.)   # finger flexion added (deg MCP/PIP/DIP) while the thumb presses the paddle
OPEN_BEFORE_CONTACT = .04   # the travelling curl opens into the grip shape only this long before the fingers touch
VIA_OUT_SCALE = .85  # the returning hand leaves along a tighter line (its thumb is tucked, the grip already open)
RETURN_UNDER = Vector((-.03, .018, -.045))   # the returning hand rises onto the handguard from here (behind and below)
VIA_OFF = Vector((0, .026, -.006))   # the travelling hand passes on the camera side of the magazine's front edge, below the receiver
TRANSIT_MAX_FACING = .35   # the travelling palm may turn toward the eye at most this much (cosine)
TRANSIT_RETURN_FACING = .15   # stricter on the way back: the regripping hand opens there

# The shooter's eye in AK47_Rig space, from the runtime viewmodel placement (weaponRoot position/roll/scale; the
# model is yawed 90 deg); used to report how far the travelling palm turns toward it.
_vm = (SOURCE.parents[2] / 'apps/client/src/runtime/weapons/Ak47AnimatedViewModel.ts').read_text()
_base = Vector([float(x) for x in re.search(r'BASE_POSITION = new Vector3\(([^)]*)\)', _vm).group(1).split(',')])
_roll = float(re.search(r'BASE_ROLL = ([-.0-9]+)', _vm).group(1))
_eye = Matrix.Rotation(-math.pi / 2, 3, 'Y') @ (Matrix.Rotation(-_roll, 3, 'Z') @ -_base) / float(re.search(r'VIEWMODEL_SCALE = ([.0-9]+)', _vm).group(1))
CAMERA_RIG = Vector((_eye.x, -_eye.z, _eye.y))

def palm_normal(m):
    return (m.to_3x3() @ hand_pose.PALM_NORMAL).normalized()

def turn_path(start, finish, x):
    """Hand orientation from start to finish (x 0..1). The palm normal follows a smooth arc bent away from the
    camera (normalised quadratic Bezier through a control that faces away from the eye) and the remaining twist
    about the palm normal is spread evenly, so the open palm is never shown to the camera on the way."""
    x = min(1., max(0., x))
    qs, qf = start.to_quaternion(), finish.to_quaternion()
    n0, n1 = palm_normal(start), palm_normal(finish)
    mid = (start.translation + finish.translation) / 2
    eye = (CAMERA_RIG - mid).normalized()
    ctrl = ((n0 + n1).normalized() - eye * .5).normalized()
    def n_at(k):
        return ((1 - k) ** 2 * n0 + 2 * k * (1 - k) * ctrl + k * k * n1).normalized()
    def swung(k):
        return n0.rotation_difference(n_at(k)) @ qs
    twist = qf @ swung(1.).inverted()
    angle = twist.angle if twist.axis.dot(n1) >= 0 else -twist.angle
    angle = (angle + math.pi) % (2 * math.pi) - math.pi
    return (Quaternion(n_at(x), angle * x) @ swung(x)).normalized()

def time_warp(keys, t):
    """Piecewise-linear map of clip time through (time, parameter) keys."""
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            return v0 + (v1 - v0) * (t - t0) / (t1 - t0)
    return keys[-1][1]

class ArcPath:
    """Catmull-Rom curve through points, travelled by arc length over [t0, t1] with a speed profile v(u), u 0..1,
    so the speed along the path is exactly the profile (no dips from uneven key spacing)."""

    def __init__(self, points, t0, t1, profile, n=400):
        chord = [0.]
        for p0, p1 in zip(points, points[1:]):
            chord.append(chord[-1] + (p1 - p0).length)
        self.keys, self.chord, self.t0, self.t1 = list(zip(chord, points)), chord, t0, t1
        samples = [spline(self.keys, chord[-1] * k / n) for k in range(n + 1)]
        arc = [0.]
        for p0, p1 in zip(samples, samples[1:]):
            arc.append(arc[-1] + (p1 - p0).length)
        self.arc_map = [(a, chord[-1] * k / n) for k, a in enumerate(arc)]
        dist = [0.]
        for k in range(n):
            dist.append(dist[-1] + profile((k + .5) / n))
        self.dist_map = [(k / n, d / dist[-1] * arc[-1]) for k, d in enumerate(dist)]

    def param(self, t):
        u = min(1., max(0., (t - self.t0) / (self.t1 - self.t0)))
        return time_warp(self.arc_map, time_warp(self.dist_map, u))

    def at(self, t):
        return spline(self.keys, self.param(t))

    def time_at(self, i):
        """Time at which the path passes its i-th point."""
        lo, hi = self.t0, self.t1
        for _ in range(40):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if self.param(mid) < self.chord[i] else (lo, mid)
        return hi

def ease_in_out(ramp_in, ramp_out):
    return lambda u: smooth(u / ramp_in) * (1 - smooth((u - (1 - ramp_out)) / ramp_out))

# ---------------------------------------------------------------- the Reload clip
def reload_clip():
    m = MK
    lh, grip, release, rocked, drop = m['leaveHandguard'], m['grip'], m['release'], m['rockedOut'], m['drop']
    in_view, hook, latch, opens, on_guard, end = m['newMagazineInView'], m['hook'], m['latch'], m['gripOpens'], m['handOnHandguard'], m['end']
    fetch = drop + .03          # the fresh magazine is taken from the pouch, off screen
    press0 = release - .04      # the thumb pushes the paddle over the last 40 ms before the click (the hand stays put)
    pull0 = release + .03       # the downward/rearward pull builds while the magazine rocks out: one accelerating arc
    turn_back = drop - .10      # while carrying, the hand hands its orientation over to the forearm
    present = fetch + .04       # ...and takes the fresh magazine's presentation before it shows (~0.65 s)
    latch_frame = 1 + round(latch * FPS)
    tilt_loc, tilt_rot = np.array(FIT['tilt']['loc']), np.array(FIT['tilt']['rot'])

    # Rifle presentation: cant up to the left hand, react to every beat with small damped motions, then untilt
    # with a damped overshoot that settles exactly on idle. drot is Euler XYZ about the pistol grip: +x rolls the
    # magazine well toward the camera, +y dips the muzzle.
    def T(scale=1., dloc=(0, 0, 0), drot=(0, 0, 0)):
        return (tilt_loc * scale + np.array(dloc), tilt_rot * scale + np.array(drot))
    # The rifle is never a posed prop: every beat of the hands reaches it as a small damped motion (2-3 deg, a few
    # mm), and between beats it drifts (the counter-roll toward the incoming magazine), so no frame is static.
    rig_keys = [
        (lh, T(0)),
        (grip - .07, T(1.035)),          # tilt-in overshoots a little...
        (grip - .02, T(.992)),           # ...and settles
        (grip + .03, T(1, (0, .0006, -.0006), (.004, .002, 0))),           # leaning into the paddle press
        (release, T(1, (0, .0008, -.0008), (.006, .003, .001))),
        (release + .012, T(1, (.0018, -.0006, .0012), (-.012, .022, .008))),   # click: a sharp 1-2 deg shake
        (release + .04, T(1, (-.0006, .0003, -.0004), (.006, -.010, -.004))),
        (rocked - .01, T(1, (0, .0004, -.0008), (.004, .002, 0))),
        (rocked + .07, T(1, (0, .0045, -.0085), (.048, .028, .012))),      # the yank: dip and roll after the magazine
        (drop + .025, T(1, (0, -.0015, .0025), (-.016, -.009, -.004))),    # damped overshoot
        (drop + .07, T(1, (0, .0005, -.0008), (.004, .002, .001))),
        (in_view - .02, T(1, (0, .0025, -.0035), (.036, .014, .006))),     # slow counter-roll toward the incoming hand
        (hook - .06, T(1, (0, .0018, -.0028), (.026, .010, .004))),
        (hook + .015, T(1, (0, .0005, .0032), (.014, -.016, 0))),           # the hook pushes the rifle up
        (latch - .04, T(1, (0, .0008, -.0012), (.010, .008, .002))),       # anticipation before the seat
        (latch + .045, T(1, (0, 0, .0042), (.016, -.046, -.006))),         # seat kick: peak 45 ms after the latch...
        (latch + .10, T(1, (0, 0, -.0014), (-.004, .015, .002))),          # ...quick damped rebound
        (latch + .15, T(1, (0, 0, .0004), (.002, -.004, 0))),
        (opens + .10, T()),
        (on_guard - .06, T(.97)),        # still presenting while the hand regrips the handguard
        (end - .14, T(-.06)),            # untilt, overshoot, settle
        (end - .06, T(.018)),
        (end, T(0)),
    ]

    def rig_at(t):
        return Vector(pchip([(k, v[0]) for k, v in rig_keys], t)), Vector(pchip([(k, v[1]) for k, v in rig_keys], t))

    remove_seated = seat @ HAND_IN_MAG['remove']
    insert_seated = seat @ HAND_IN_MAG['insert']
    idle_n = palm_normal(idle_hand)
    below_guard = idle_hand.translation + Vector((0, .03, -.04))   # down and out off the handguard, fingers clear of its far side

    # Handguard -> magazine: straight down off the wood and down the front of the magazine to just below and off
    # the grip, then up onto it while the half-closed fingers take the front edge; travelled at one smooth speed
    # profile, one direction in screen space. Magazine -> handguard is the same path reversed.
    pre_grip = Matrix.Translation(SLIDE) @ remove_seated
    post_grip = Matrix.Translation(Vector(FIT.get('leave_slide_m', SLIDE))) @ insert_seated
    # On the way the hand passes on the near (camera) side of the magazine's front edge.
    via_in = below_guard.lerp(pre_grip.translation, .55) + VIA_OFF
    via_out = below_guard.lerp(post_grip.translation, .55) + VIA_OFF * VIA_OUT_SCALE
    approach_path = ArcPath([idle_hand.translation, below_guard, via_in, pre_grip.translation, remove_seated.translation],
                            lh, grip, ease_in_out(.3, .4))
    let_go = opens + .03        # the fingers open on the magazine before the hand moves
    # back onto the handguard from below and behind (up under the wood), so the path, not an opening hand, clears it
    under_guard = idle_hand.translation + RETURN_UNDER
    leave_path = ArcPath([insert_seated.translation, post_grip.translation, via_out, under_guard, idle_hand.translation],
                         let_go, on_guard, ease_in_out(.3, .4))
    arrive, depart = approach_path.time_at(3), leave_path.time_at(1)
    report['approachArriveS'], report['leaveDepartS'] = round(arrive, 3), round(depart, 3)

    palm_to_eye = {}

    def transit(t, forearm, t0, t1, start, finish, max_facing=TRANSIT_MAX_FACING):
        """Hand orientation while travelling: the wrist relation to the forearm is interpolated, so the forearm
        carries the turn (pronation) and the wrist stays near neutral."""
        if t <= t0:
            return start.to_quaternion()
        if t >= t1:
            return finish.to_quaternion()
        w0 = (forearm(t0).inverted() @ pose_matrix(forearm(t0).translation, start.to_quaternion())).to_quaternion()
        w1 = (forearm(t1).inverted() @ pose_matrix(forearm(t1).translation, finish.to_quaternion())).to_quaternion()

        def base(x):
            tx = t0 + (t1 - t0) * x
            return (forearm(tx).to_quaternion() @ w0.slerp(w1, glide(x, .15))).normalized()

        def facing(q, tx):
            palm_centre = hand_position(tx) + q.to_matrix() @ Vector((0, .07, .02))
            eye = (rig_matrix(*rig_at(tx)).inverted() @ CAMERA_RIG - palm_centre).normalized()
            return (q.to_matrix() @ hand_pose.PALM_NORMAL).normalized().dot(eye)

        def rolled(x, roll):
            # extra turn of the hand (about its long axis, then its thumb-pinky axis), peaking mid-way, that keeps
            # the palm away from the eye
            q = base(x); w = math.sin(math.pi * x)
            q = (Quaternion(q @ Vector((0, 1, 0)), roll[0] * w) @ q).normalized()
            return (Quaternion(q @ Vector((1, 0, 0)), roll[1] * w) @ q).normalized()

        key = f'{t0:.3f}-{t1:.3f}'
        if key not in palm_to_eye:
            # the smallest turn that keeps the palm from turning toward the eye by more than TRANSIT_MAX_FACING;
            # reported: how far it still turns toward the eye (1 = facing it)
            best = None
            for size in range(0, 91, 10):
                for a_deg in range(-size, size + 1, 10):
                    for b_deg in (size - abs(a_deg), abs(a_deg) - size) if size else (0,):
                        roll = (math.radians(a_deg), math.radians(b_deg))
                        worst = max(facing(rolled(k / 16, roll), t0 + (t1 - t0) * k / 16) for k in range(1, 16))
                        if best is None or worst < best[0] - 1e-6:
                            best = (worst, roll)
                if best[0] <= max_facing:
                    break
            palm_to_eye[key] = best
            report.setdefault('transitWorstPalmToEye', {})[key] = round(best[0], 3)
            report.setdefault('transitPalmAwayTurnDeg', {})[key] = [round(math.degrees(v), 1) for v in best[1]]
        return rolled((t - t0) / (t1 - t0), palm_to_eye[key][1])

    # Old magazine: rocks out about the front lug, fast out of the release and easing off, while the pull down
    # and back-left starts 40 ms before rockedOut and accelerates out of frame: one continuous arc.
    # Rock-out: eases out of the click and accelerates into the yank (theta -0.30 at rockedOut), then runs on at
    # that speed while the pull takes over and brakes to its end angle: one accelerating pull, no linear stretch.
    rock_v = -.30 * ROCK_POWER / (rocked - release)
    rock_tau = 2 * (ROCK_END - (-.30)) / rock_v

    def theta(t):
        if t <= rocked:
            u = min(1., max(0., (t - release) / (rocked - release)))
            return -.30 * u ** ROCK_POWER
        s = min(t - rocked, rock_tau)
        return -.30 + rock_v * (s - s * s / (2 * rock_tau))

    # Down and back-left, kept low and away from the eye so the hand never fills the frame.
    pull_keys = [(pull0, (0, 0, 0))] + [(m[mark] + dt, tuple(v)) for mark, dt, v in FIT['pull']]

    def remove_him(t):
        """Hand placement on the old magazine: the hold, leaning into the press placement while the thumb works the
        paddle (as the thumb reaches, 0.25-0.30 s) and back into the hold by release + 35 ms."""
        w = smooth((t - (grip + .012)) / (release - grip - .012)) * (1 - smooth((t - release) / .035))
        return blend_placement(HAND_IN_MAG['remove'], HAND_IN_MAG['press'], w) if w > 0 else HAND_IN_MAG['remove']

    def old_rigid(t):
        return Matrix.Translation(Vector(pchip(pull_keys, t))) @ mag_pose(theta(t))

    # Fresh magazine: from the pouch (off screen) on one direct upward arc, fast through newMagazineInView and
    # braking late and hard into the lug hook (it arrives with ~30% of its speed; the hook stops it).
    # (theta, roll, offset) of the magazine along the arc, pouch side first.
    spare_path = [(-.52, .22, (-.065, .11, -.21)), (-.45, .12, (-.032, .05, -.11)), (-.37, .02, (.002, .004, -.014)),
                  (-.35, 0., (0, 0, 0))]

    def spare_key(i):
        th, rl, off = spare_path[i]
        return mag_pose(th, off, rl)

    at_pouch = (old_rigid(fetch) @ HAND_IN_MAG['remove']).translation
    # Front-loaded: quick out of the pouch so its top clears the frame edge by ~0.65 s and it is readable by
    # newMagazineInView, then one decisive push that brakes only over the last ~40 ms onto the lug (it arrives
    # with ~30% of its speed; the hook stops it).
    spare_arc = ArcPath([at_pouch] + [(spare_key(i) @ HAND_IN_MAG['insert']).translation for i in range(len(spare_path))],
                        fetch, hook, lambda u: smooth(u / .04) * (1. + 1.5 * (1 - u) ** 2) * (1 - .7 * smooth((u - .89) / .11)))

    def spare_orient(t):
        c = spare_arc.param(t)
        th = float(pchip([(spare_arc.chord[i + 1], k[0]) for i, k in enumerate(spare_path)], c)[0])
        rl = float(pchip([(spare_arc.chord[i + 1], k[1]) for i, k in enumerate(spare_path)], c)[0])
        return mag_pose(th, (0, 0, 0), rl)

    def rock_in(t):
        u = min(1., max(0., (t - hook) / (latch - hook)))
        return mag_pose(-.35 * (1 - u * u))

    def hand_position(t):
        if t <= grip:
            return approach_path.at(t)
        if t <= fetch:
            # rigid on the seated, then rocking and pulled magazine: rock and pull are one continuous arc
            return (old_rigid(t) @ remove_him(t)).translation
        if t <= hook:
            return spare_arc.at(t)
        if t <= latch:
            return (rock_in(t) @ HAND_IN_MAG['insert']).translation
        if t <= let_go:
            return insert_seated.translation.copy()
        return leave_path.at(t)

    def hand(t, forearm):
        """forearm(t): the IK forearm frame (L_forearm.001, rig space) solved for hand_position."""
        p = hand_position(t)
        if t <= grip - .015:
            # the turn onto the magazine continues through the short slide, so the forearm roll is spread out
            return pose_matrix(p, transit(t, forearm, lh + .02, grip - .015, idle_hand, remove_seated))
        if t <= grip:
            return pose_matrix(p, remove_seated.to_quaternion())
        if t <= hook:
            q_old = (old_rigid(min(t, drop)) @ remove_him(t)).to_quaternion()
            q_new = (spare_orient(t) @ HAND_IN_MAG['insert']).to_quaternion()
            if t < turn_back:
                return pose_matrix(p, q_old)
            if t >= present:
                return pose_matrix(p, q_new)
            # Carrying and fetching off screen: the hand keeps its wrist relation to the forearm and moves with
            # the arm, turning over to the fresh magazine's presentation before it comes into view.
            return pose_matrix(p, transit(t, forearm, turn_back, present,
                                          pose_matrix(p, (old_rigid(turn_back) @ HAND_IN_MAG['remove']).to_quaternion()),
                                          pose_matrix(p, (spare_orient(present) @ HAND_IN_MAG['insert']).to_quaternion())))
        if t <= latch:
            return rock_in(t) @ HAND_IN_MAG['insert']
        if t <= depart:
            return pose_matrix(p, insert_seated.to_quaternion())
        if t < on_guard:
            return pose_matrix(p, transit(t, forearm, depart - .01, on_guard - .01, insert_seated, idle_hand, TRANSIT_RETURN_FACING))
        return idle_hand.copy()

    def old_mag(t, frame, hand_m):
        if frame >= latch_frame - 2:
            return seat.copy(), (1. if frame > latch_frame else HIDDEN)     # seated again, shown after the swap
        if t <= release:
            return seat.copy(), 1.
        # Rigid in the hand from the release: no slip, then let go out of frame.
        return hand_m @ remove_him(t).inverted(), (1. if t <= drop else HIDDEN)

    def spare_mag(t, frame, hand_m):
        if frame >= latch_frame:
            return seat.copy(), (1. if frame <= latch_frame + 2 else SPARE_HIDDEN)   # both shown, co-located, for a frame
        if t > hook:
            return rock_in(t), 1.
        return hand_m @ HAND_IN_MAG['insert'].inverted(), (1. if t >= fetch else SPARE_HIDDEN)

    def opened(closed):
        """The grip with its fingers opened off the magazine (MCP -10, PIP -35, DIP -20 deg) and their spread relaxed
        70% of the way to parallel, so opening fingers never swing into each other."""
        return with_changes(closed, {d: {'mcp': -10, 'pip': -35, 'dip': -20, 'mcp_abduct': -.7 * closed[d]['mcp_abduct']}
                                     for d in ['index', 'middle', 'ring', 'pinky']})

    A = {'idle': GRIPS['idle']['anatomy'], 'reach': FIT['travel'],
         'remove': fit_anatomy('remove', 'hold'), 'insert': fit_anatomy('insert', 'insert_hold')}
    R = lambda name: fit_anatomy('remove', name)
    I = lambda name: fit_anatomy('insert', name)
    # The hand closes on the magazine with the thumb already curled on its near face. The thumb then reaches back
    # round the rear corner, puts its tip on the paddle and presses it into the click (the hand stays put), comes off
    # it the same way and is curled on the near face again by release + 35 ms: it is extended only ~50 ms. It
    # squeezes for the yank. The fresh magazine is held the same way, with a thumb press at the hook and the seat tap.
    reach0 = grip + .012
    digit_keys = [
        (grip, A['remove']), (reach0, R('hover')), (reach0 + .012, R('via')), (reach0 + .024, R('prepress')),
        (release, R('press'), 'in'),
        (release + .012, R('via')), (release + .024, R('hover')), (release + .035, A['remove']),
        (rocked + .03, A['remove']), (rocked + .07, R('squeeze')), (drop - .06, R('squeeze')), (drop - .02, A['remove']),
        (drop, opened(A['remove'])), (drop + .04, A['reach']), (fetch - .04, A['reach']), (fetch, A['insert']),
        (hook - .02, A['insert']), (hook + .015, I('insert_squeeze')), (hook + .07, A['insert']),
        (latch - .01, A['insert']), (latch + .03, I('insert_squeeze')), (opens, A['insert']),
    ]

    def preshaped(closed, k, thumb):
        """Grip shape k of the way closed from nearly closed already (PRESHAPE of the way from the opened grip)."""
        out = {'thumb': dict(thumb['thumb'])}
        open_ = opened(closed)
        for d in ['index', 'middle', 'ring', 'pinky']:
            w = PRESHAPE + (1 - PRESHAPE) * k
            out[d] = {j: open_[d][j] + (closed[d][j] - open_[d][j]) * w for j in open_[d]}
        return out

    # fingers open on the magazine (the index, under the receiver, only uncurls a little), thumb lifted off it
    let_go_shape = opened(A['insert'])
    let_go_shape['index'] = with_changes(A['insert'], {'index': {'pip': -15, 'dip': -10, 'mcp_abduct': -.35 * A['insert']['index']['mcp_abduct']}})['index']
    let_go_shape['thumb'] = dict(FIT['thumb']['insert_letgo'])
    # Travelling between handguard and magazine the hand is a loose fist (grips/reload-fit.json travel), opening into
    # the grip shape only over the last 60 ms before it touches the magazine.
    travel = A['reach']

    def fingers(t):
        if t <= grip:
            if t <= arrive - OPEN_BEFORE_CONTACT:
                # off the wood first (fingers easing off the handguard, together), then the relaxed travelling curl
                off_wood = with_changes(A['idle'], {d: {'mcp': -8, 'pip': -12, 'dip': -6, 'mcp_abduct': -.8 * A['idle'][d]['mcp_abduct']}
                                                    for d in ['index', 'middle', 'ring', 'pinky']})
                shaped = mix_anatomy(mix_anatomy(A['idle'], off_wood, smooth((t - lh) / .035)), travel, smooth((t - lh - .03) / .06))
                # the thumb stays along the handguard until the hand has dropped clear of it
                shaped['thumb'] = mix_anatomy({'t': A['idle']['thumb']}, {'t': travel['thumb']}, smooth((t - .03) / .05))['t']
                return shaped
            if t <= arrive:
                # the fingers open into the grip shape only over the last ~40 ms before they touch the magazine
                return mix_anatomy(travel, preshaped(A['remove'], 0., {'thumb': FIT['thumb']['hover']}),
                                   smooth((t - (arrive - OPEN_BEFORE_CONTACT)) / OPEN_BEFORE_CONTACT))
            k = smooth((t - arrive) / (grip - arrive))
            return mix_anatomy(preshaped(A['remove'], 0., {'thumb': FIT['thumb']['hover']}), A['remove'], k)
        if t >= opens:
            if t <= let_go:
                return mix_anatomy(A['insert'], let_go_shape, smooth((t - opens) / (let_go - opens)))
            # off the magazine the hand relaxes to the travelling curl (fingers together); it rises under the
            # handguard from below and behind still loosely curled (at most ~35% open, never splayed) and closes
            # onto the handguard grip as it lands; the thumb keeps a light curl until the last ~40 ms
            shape = mix_anatomy(let_go_shape, travel, smooth((t - let_go) / (depart + .05 - let_go)))
            landing = {d: {j: max(0., v) if j != 'mcp_abduct' else .3 * v for j, v in joints.items()}
                       for d, joints in with_changes(A['idle'], {d: {'mcp': -8, 'pip': -16, 'dip': -8}
                                                                  for d in ['index', 'middle', 'ring', 'pinky']}).items() if d != 'thumb'}
            landing['thumb'] = dict(travel['thumb'])
            shape = mix_anatomy(shape, landing, smooth((t - (on_guard - .12)) / .07))
            shape = mix_anatomy(shape, A['idle'], smooth((t - (on_guard - .045)) / .045))
            shape['thumb'] = mix_anatomy({'t': shape['thumb']}, {'t': A['idle']['thumb']}, smooth((t - (on_guard - .045)) / .045))['t']
            return shape
        shape = digit_keys[-1][1]
        for ka, kb in zip(digit_keys, digit_keys[1:]):
            if ka[0] <= t <= kb[0]:
                u = (t - ka[0]) / (kb[0] - ka[0])
                mode = kb[2] if len(kb) > 2 else 'smooth'
                shape = mix_anatomy(ka[1], kb[1], u * u if mode == 'in' else (u if mode == 'lin' else smooth(u)))
                break
        # the fingers tighten on the magazine while the thumb works the paddle (the grip never freezes before the
        # click), and let go of that squeeze as the magazine starts to rock
        w = smooth((t - grip) / (release - grip)) * (1 - smooth((t - release) / .04))
        if w > 0:
            shape = with_changes(shape, {d: {'mcp': PRESS_SQUEEZE[0] * w, 'pip': PRESS_SQUEEZE[1] * w, 'dip': PRESS_SQUEEZE[2] * w}
                                         for d in ['index', 'middle', 'ring', 'pinky']})
        return shape

    # Off screen, with the hand low and close to the shoulder, the elbow drops back so the IK plane stays stable.
    pole_keys = [(lh, (0, 0, 0)), (grip, POLE_GRIP), (rocked, POLE_GRIP), (drop, POLE_LOW), (fetch - .03, POLE_LOW),
                 (in_view + .08, POLE_GRIP), (opens, POLE_GRIP), (on_guard, (0, 0, 0))]
    return dict(end=end, rig=rig_at, position=hand_position, hand=hand, old=old_mag, spare=spare_mag, fingers=fingers,
                # The IK arm matches the FK idle arm exactly at rest (pole calibration), so the solve runs
                # throughout: the shoulder stays in camera space until the rifle has settled.
                ik=lambda t: 1.,
                shoulder=lambda t: smooth((t - lh) / (grip - lh)) * (1 - smooth((t - opens) / (on_guard - opens))),
                pole=lambda t: Vector(pchip(pole_keys, t)))

# ---------------------------------------------------------------- action writing
def write_action(name, owner, channels, frames):
    """channels: {(data_path, index): [values per frame]} written as linear keys."""
    action = bpy.data.actions.new(name)
    slot = action.slots.new(id_type='OBJECT', name=owner.name)
    layer = action.layers.new('Layer')
    strip = layer.strips.new(type='KEYFRAME')
    bag = strip.channelbag(slot, ensure=True)
    for (path, index), values in channels.items():
        curve = bag.fcurves.new(path, index=index)
        curve.keyframe_points.add(len(frames))
        flat = np.empty(len(frames) * 2, dtype=np.float32)
        flat[0::2] = frames
        flat[1::2] = values
        curve.keyframe_points.foreach_set('co', flat)
        for point in curve.keyframe_points:
            point.interpolation = 'LINEAR'
        curve.update()
    return action, slot

def push_track(owner, track_name, action, slot):
    owner.animation_data_create()
    track = owner.animation_data.nla_tracks.new()
    track.name = track_name
    strip = track.strips.new(track_name, 1, action)
    strip.action_slot = slot
    return track

def object_channels(matrices, scales=None):
    ch = {}
    prev = None
    for i, m in enumerate(matrices):
        loc, rot, scl = m.decompose()
        if prev is not None and rot.dot(prev) < 0:
            rot.negate()
        prev = rot
        s = scales[i] if scales else 1.
        for k in range(3):
            ch.setdefault(('location', k), []).append(loc[k])
            ch.setdefault(('scale', k), []).append(s)
        for k in range(4):
            ch.setdefault(('rotation_quaternion', k), []).append(rot[k])
    return ch

for ob in [root, mag, spare, bolt]:
    ob.rotation_mode = 'QUATERNION'

# ---------------------------------------------------------------- IK setup for the left arm
targets = {}
for name in ['LHandTarget', 'LShoulderAnchor', 'LElbowPole']:
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    e.rotation_mode = 'QUATERNION'
    targets[name] = e
targets['LHandTarget'].parent = root
pb = L.pose.bones
for n in ['L_upper_arm.001', 'L_forearm.001']:
    pb[n].lock_ik_x = pb[n].lock_ik_z = True
ik = pb['L_forearm.001'].constraints.new('IK')
ik.name = 'BakeIK'
ik.target = targets['LHandTarget']
ik.pole_target = targets['LElbowPole']
ik.chain_count = 4
ik.use_stretch = False
ik.use_tail = True
cr = pb['SupportHand'].constraints.new('COPY_ROTATION')
cr.name = 'BakeRot'
cr.target = targets['LHandTarget']
cl = pb['L_upper_arm'].constraints.new('COPY_LOCATION')
cl.name = 'BakeShoulder'
cl.target = targets['LShoulderAnchor']
REACH = .32 + .26

# Pole: place it off the idle elbow and calibrate the pole angle against the idle FK elbow.
mid = (idle_shoulder + idle_hand.translation) / 2
elbow_dir = (idle_elbow - mid)
elbow_dir = (elbow_dir - (idle_hand.translation - idle_shoulder).normalized() * elbow_dir.dot((idle_hand.translation - idle_shoulder).normalized())).normalized()
pole_pos = mid + elbow_dir * .35
targets['LElbowPole'].location = pole_pos
targets['LShoulderAnchor'].location = idle_shoulder
targets['LHandTarget'].matrix_basis = idle_hand
L.animation_data.action = idle_action
L.animation_data.action_slot = idle_action.slots[0]
fk_idle = {}
for con in [ik, cr, cl]:
    con.mute = True
bpy.context.view_layer.update()
fk_idle = {n: pb[n].matrix.to_quaternion() for n in ['L_upper_arm', 'L_upper_arm.001', 'L_forearm', 'L_forearm.001', 'SupportHand']}
for con in [ik, cr, cl]:
    con.mute = False
best = None
for deg in range(-180, 180, 3):
    ik.pole_angle = math.radians(deg)
    bpy.context.view_layer.update()
    err = (pb['L_forearm'].head - idle_elbow).length + (pb['SupportHand'].head - idle_hand.translation).length
    if best is None or err < best[0]:
        best = (err, deg)
for step in [1., .25, .05]:   # refine so the IK arm matches the FK idle arm and the IK ramps are seamless
    for deg in [best[1] + step * k for k in range(-3, 4)]:
        ik.pole_angle = math.radians(deg)
        bpy.context.view_layer.update()
        err = (pb['L_forearm'].head - idle_elbow).length + (pb['SupportHand'].head - idle_hand.translation).length
        if err < best[0]:
            best = (err, deg)
ik.pole_angle = math.radians(best[1])
bpy.context.view_layer.update()
ik_idle_deg = max(math.degrees(pb[n].matrix.to_quaternion().rotation_difference(fk_idle[n]).angle) for n in fk_idle)
L.animation_data.action = None
report['poleCalibration'] = {'deg': round(best[1], 3), 'idleErrorM': best[0], 'ikVsFkIdleMaxBoneDeg': round(ik_idle_deg, 3)}

for ob in [o for o in scene.objects if o.type == 'MESH']:
    for m in ob.modifiers:
        if m.type == 'ARMATURE':
            m.show_viewport = False

FOREARM_ROLL_SPLIT = .65   # share of the forearm roll taken by L_forearm; the rest by the L_forearm.001 twist bone

def axial_twist(q):
    return 2 * math.atan2(q.y, q.w)

def bake(spec, name):
    end = spec['end']
    frames = list(range(1, int(round(end * FPS)) + 2))
    times = [(f - 1) / FPS for f in frames]
    scene.frame_start, scene.frame_end = frames[0], frames[-1]
    rig_m, positions, sh, inf = [], [], [], []
    for t in times:
        loc, rot = spec['rig'](t)
        rig_m.append(rig_matrix(loc, rot))
        positions.append(spec['position'](t))
        inf.append(spec['ik'](t))
    # Shoulder anchored in camera space, dropping slightly while the hand works low; kept within reach.
    for i, t in enumerate(times):
        target_world = rig_m[i] @ positions[i]
        s = idle_shoulder + Vector((.03, -.035, -.07)) * spec['shoulder'](t)
        d = target_world - s
        limit = max(REACH * .955, (idle_hand.translation - idle_shoulder).length + 1e-4)   # idle arm is nearly straight
        if d.length > limit:
            s = s + d * (1 - limit / d.length)
        sh.append(s)
    temp = []
    def temp_action(owner, channels):
        act, slot = write_action('_tmp_' + owner.name, owner, channels, frames)
        owner.animation_data_create()
        owner.animation_data.action = act
        owner.animation_data.action_slot = slot
        temp.append(act)
    temp_action(root, object_channels(rig_m))
    temp_action(targets['LShoulderAnchor'], {('location', k): [v[k] for v in sh] for k in range(3)})
    # Pole follows the shoulder; each grip phase adds its approved elbow offset.
    pole = [s + (pole_pos - idle_shoulder) + Vector((0, 0, -.05)) * spec['shoulder'](t) + spec['pole'](t) for s, t in zip(sh, times)]
    temp_action(targets['LElbowPole'], {('location', k): [v[k] for v in pole] for k in range(3)})
    digit_q = []
    for t in times:
        digit_q.append(hand_pose.digit_quaternions(L, spec['fingers'](t)))
    arm_ch = {}
    prev = {}
    for i, t in enumerate(times):
        for bone in L.pose.bones:
            loc, q, scl = idle_basis[bone.name]
            q = digit_q[i][bone.name].copy() if bone.name in digits else q.copy()
            if bone.name in prev and q.dot(prev[bone.name]) < 0:
                q.negate()
            prev[bone.name] = q
            base = f'pose.bones["{bone.name}"].'
            for k in range(3):
                arm_ch.setdefault((base + 'location', k), []).append(loc[k])
                arm_ch.setdefault((base + 'scale', k), []).append(scl[k])
            for k in range(4):
                arm_ch.setdefault((base + 'rotation_quaternion', k), []).append(q[k])
        for con_path in ['pose.bones["L_forearm.001"].constraints["BakeIK"].influence',
                         'pose.bones["SupportHand"].constraints["BakeRot"].influence',
                         'pose.bones["L_upper_arm"].constraints["BakeShoulder"].influence']:
            arm_ch.setdefault((con_path, 0), []).append(inf[i])
    temp_action(L, arm_ch)
    # Pass 1: the arm's position solution depends only on the wrist position; read the forearm frames.
    temp_action(targets['LHandTarget'], object_channels([Matrix.Translation(p) for p in positions]))
    forearm_frames = []
    for f in frames:
        scene.frame_set(f)
        forearm_frames.append((root.matrix_world.inverted() @ L.matrix_world @ L.pose.bones['L_forearm.001'].matrix).normalized())
    forearm = lambda t: forearm_frames[min(len(frames) - 1, max(0, round(t * FPS)))]
    hand_m, old_m, old_s, spare_m, spare_s = [], [], [], [], []
    for t, f in zip(times, frames):
        h = spec['hand'](t, forearm)
        if (h.translation - positions[f - 1]).length > 1e-9:
            raise RuntimeError(f'hand orientation pass moved the wrist at {t:.3f} s')
        hand_m.append(h)
        m, s = spec['old'](t, f, h); old_m.append(m); old_s.append(s)
        m, s = spec['spare'](t, f, h); spare_m.append(m); spare_s.append(s)
    bpy.data.actions.remove(temp.pop())
    temp_action(targets['LHandTarget'], object_channels(hand_m))
    # Evaluate the constrained pose and convert it to FK.
    visual = []
    wrist_err = 0.
    for i, f in enumerate(frames):
        scene.frame_set(f)
        visual.append({b.name: b.matrix.copy() for b in L.pose.bones})
        if inf[i] > .999:
            want = hand_m[i].translation
            got = root.matrix_world.inverted() @ L.matrix_world @ L.pose.bones['SupportHand'].head
            wrist_err = max(wrist_err, (got - want).length)
    def basis_of(bone, pose, parent_pose):
        rest = bone.bone.matrix_local
        if bone.parent:
            return (bone.parent.bone.matrix_local.inverted() @ rest).inverted() @ parent_pose.inverted() @ pose
        return rest.inverted() @ pose
    # The wrist cannot twist: the hand's axial roll away from idle goes into the forearm, a quarter at
    # L_forearm and the rest at the L_forearm.001 twist bone; the hand's own pose is preserved exactly.
    hand_bone, fa, fa1 = pb['SupportHand'], pb['L_forearm'], pb['L_forearm.001']
    idle_twist = axial_twist(idle_basis['SupportHand'][1])
    rolls = []
    for i in range(len(frames)):
        v = visual[i]
        q = basis_of(hand_bone, v['SupportHand'], v['L_forearm.001']).to_quaternion()
        delta = (axial_twist(q) - idle_twist + math.pi) % (2 * math.pi) - math.pi
        if rolls:
            delta += 2 * math.pi * round((rolls[-1] - delta) / (2 * math.pi))
        rolls.append(delta)
    for i in range(len(frames)):
        v = visual[i]
        delta = rolls[i]
        v['L_forearm'] = v['L_forearm'] @ Matrix.Rotation(delta * FOREARM_ROLL_SPLIT, 4, 'Y')
        v['L_forearm.001'] = v['L_forearm.001'] @ Matrix.Rotation(delta, 4, 'Y')
    fk = {}
    prevq = {}
    for i in range(len(frames)):
        for bone in L.pose.bones:
            parent_pose = visual[i][bone.parent.name] if bone.parent else None
            loc, q, _ = basis_of(bone, visual[i][bone.name], parent_pose).decompose()
            if bone.name in digits:
                loc, q = idle_basis[bone.name][0].copy(), digit_q[i][bone.name].copy()   # exact, never translated
            if bone.name in prevq and q.dot(prevq[bone.name]) < 0:
                q.negate()
            prevq[bone.name] = q
            base = f'pose.bones["{bone.name}"].'
            for k in range(3):
                fk.setdefault((base + 'location', k), []).append(loc[k])
                fk.setdefault((base + 'scale', k), []).append(1.)
            for k in range(4):
                fk.setdefault((base + 'rotation_quaternion', k), []).append(q[k])
    for owner in [root, targets['LHandTarget'], targets['LShoulderAnchor'], targets['LElbowPole'], L]:
        owner.animation_data.action = None
    for act in temp:
        bpy.data.actions.remove(act)
    out = {}
    out[L] = write_action(name + '_LeftArm', L, fk, frames)
    out[root] = write_action(name + '_Rifle', root, object_channels(rig_m), frames)
    out[mag] = write_action(name + '_Magazine', mag, object_channels(old_m, old_s), frames)
    out[spare] = write_action(name + '_SpareMagazine', spare, object_channels(spare_m, spare_s), frames)
    # No charging-handle work: the bolt and the right hand hold their rest poses.
    out[bolt] = write_action(name + '_Bolt', bolt, object_channels([Matrix.Identity(4)] * 2), [frames[0], frames[-1]])
    idle_r = bpy.data.actions['Idle_RightHand_PistolGrip']
    r_ch = {}
    for bone in R.pose.bones:
        base = f'pose.bones["{bone.name}"].'
        for path, n in [('location', 3), ('rotation_quaternion', 4), ('scale', 3)]:
            for k in range(n):
                v = action_values(idle_r, 1, base + path, k)
                r_ch[(base + path, k)] = [v if v is not None else (1. if path != 'location' and (path == 'scale' or k == 0) else 0.)] * 2
    out[R] = write_action(name + '_RightHand', R, r_ch, [frames[0], frames[-1]])
    for owner, (act, slot) in out.items():
        push_track(owner, name, act, slot)
    return {'frames': len(frames), 'durationSeconds': (frames[-1] - 1) / FPS, 'maxWristErrorM': wrist_err,
            'forearmRollDeg': [round(math.degrees(min(rolls)), 1), round(math.degrees(max(rolls)), 1)]}

mute_all(True)
report['clips'] = {'Reload': bake(reload_clip(), 'Reload')}

# Clean up bake rig.
for bone, con in [('L_forearm.001', 'BakeIK'), ('SupportHand', 'BakeRot'), ('L_upper_arm', 'BakeShoulder')]:
    pb[bone].constraints.remove(pb[bone].constraints[con])
for e in targets.values():
    bpy.data.objects.remove(e)
for ob in [o for o in scene.objects if o.type == 'MESH']:
    for m in ob.modifiers:
        if m.type == 'ARMATURE':
            m.show_viewport = True
# Stitch dashes the held thumb still folds: where the thumb web and the finger-base creases compress, a rigid dash
# pivots across its seam (a white zig-zag at game scale). Measured on the baked clip while the hand holds a
# magazine; those dashes are removed (the seam and suede overlay stay).
def fold_worst(ob, islands, times, hosts):
    rest = np.array([list(v.co) for v in ob.data.vertices])
    rc = np.array([rest[c].mean(0) for c in islands])
    dist = np.linalg.norm(rc[:, None] - rc[None], axis=2)
    np.fill_diagonal(dist, 9.)
    nb, rd = dist.argmin(1), dist.min(1)
    def axis(pts):
        pts = pts - pts.mean(0)
        return np.linalg.eigh(pts.T @ pts)[1][:, -1]
    ra = np.array([axis(rest[c]) for c in islands])
    rseam = rc[nb] - rc
    rseam /= np.linalg.norm(rseam, axis=1)[:, None] + 1e-12
    worst = np.zeros(len(islands))
    def host_bvh(dg):
        verts, polys = [], []
        for host in hosts:
            eh = host.evaluated_get(dg).to_mesh()
            to_ob = ob.matrix_world.inverted() @ host.matrix_world
            off = len(verts)
            verts += [to_ob @ v.co for v in eh.vertices]
            polys += [[off + i for i in p.vertices] for p in eh.polygons]
            host.evaluated_get(dg).to_mesh_clear()
        return BVHTree.FromPolygons(verts, polys)
    dg = bpy.context.evaluated_depsgraph_get()
    scene.frame_set(1)
    show_track('Idle')
    scene.frame_set(1)
    dg = bpy.context.evaluated_depsgraph_get()
    rest_bvh = host_bvh(dg)
    rest_gap = np.array([rest_bvh.find_nearest(Vector(c))[3] for c in rc])
    show_track('Reload')
    for t in times:
        scene.frame_set(1 + round(t * FPS))
        dg = bpy.context.evaluated_depsgraph_get()
        em = ob.evaluated_get(dg).to_mesh()
        pts = np.array([list(v.co) for v in em.vertices])
        ob.evaluated_get(dg).to_mesh_clear()
        bvh = host_bvh(dg)
        pcs = [pts[c].mean(0) for c in islands]
        # a dash that lifts off the suede it is sewn to (more than 1.5 mm beyond its rest gap: the overlay has sunk
        # under the glove in a crease, or the dash drifted) shows as a stray white mark
        lift = np.array([bvh.find_nearest(Vector(c))[3] for c in pcs]) - rest_gap
        worst = np.maximum(worst, np.maximum(0, lift - .0015) * 1000)
        pc = np.array([pts[c].mean(0) for c in islands])
        pa = np.array([axis(pts[c]) for c in islands])
        seam = pc[nb] - pc
        seam /= np.linalg.norm(seam, axis=1)[:, None] + 1e-12
        squeeze = np.maximum(0, 1 - np.linalg.norm(pc - pc[nb], axis=1) / rd)
        turn = np.abs(np.abs((pa * seam).sum(1)) - np.abs((ra * rseam).sum(1)))
        worst = np.maximum(worst, squeeze + turn)
    return worst

def stitch_islands(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    seen, islands = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, comp = [v], []
        while stack:
            x = stack.pop()
            if x.index in seen:
                continue
            seen.add(x.index)
            comp.append(x.index)
            stack += [e.other_vert(x) for e in x.link_edges]
        islands.append(comp)
    bm.free()
    return islands

STITCH_FOLD_LIMIT = .6
BARTACK_BOX = ((.003, .024), (.041, .055), (-.012, 0.))   # L_thumb.01 rest space, metres
show_track('Reload')
held_times = [MK['release'] + .04 + k * .02 for k in range(int((MK['drop'] - .02 - MK['release'] - .04) / .02) + 1)] + \
    [MK['newMagazineInView'] + k * .02 for k in range(int((MK['gripOpens'] - MK['newMagazineInView']) / .02) + 1)]
report['stitchDashesRemoved'] = {}
for name in ['Palm overlay stitching', 'Palm overlay stitching.001']:
    ob = bpy.data.objects[name]
    islands = stitch_islands(ob)
    worst = fold_worst(ob, islands, held_times, [bpy.data.objects['Palm heel suede overlay'], bpy.data.objects['Palm overlay rolled seam']])
    # The dense bar-tack at the overlay's thenar end (L_thumb.01 space box) folds into a zig-zag whenever the thumb
    # is flexed and opposed; it goes too.
    to_thumb = L.data.bones['L_thumb.01'].matrix_local.inverted() @ L.matrix_world.inverted() @ ob.matrix_world
    for k, comp in enumerate(islands):
        c = to_thumb @ (sum((ob.data.vertices[i].co for i in comp), Vector()) / len(comp))
        if all(lo <= v <= hi for v, (lo, hi) in zip(c, BARTACK_BOX)):
            worst[k] = max(worst[k], 1.)
    drop = sorted(i for k in np.where(worst > STITCH_FOLD_LIMIT)[0] for i in islands[k])
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in drop], context='VERTS')
    bm.to_mesh(ob.data)
    bm.free()
    report['stitchDashesRemoved'][name] = int((worst > STITCH_FOLD_LIMIT).sum())
for ob in scene.objects:
    if ob.animation_data:
        for track in ob.animation_data.nla_tracks:
            track.mute = False
# Spare magazine hides in Idle, and Idle keeps the rifle at rest.
idle_spare = write_action('Idle_SpareMagazine', spare, object_channels([spare.matrix_basis.copy()] * 2, [SPARE_HIDDEN] * 2), [1, 2])
push_track(spare, 'Idle', *idle_spare)
mute_all(False)
scene.frame_start, scene.frame_end = 1, int(round(RELOAD_S * FPS)) + 1
scene['viewmodel_v2'] = True
scene['reloadMarks'] = json.dumps(report['reloadMarks'])   # build.py copies these into provenance
print('VIEWMODEL_V2 ' + json.dumps(report), flush=True)

if args.out:
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(Path(args.out).resolve()))
