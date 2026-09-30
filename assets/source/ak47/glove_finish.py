"""Glove finish v3: moulded knuckle guards, baked glove/trim/sleeve atlases, sheen and persistent occlusion.

Run from the repository after viewmodel_v2.py (the input must be its output and must not already carry this stage):
  Blender -b --factory-startup --python-exit-code 1 --python assets/source/ak47/glove_finish.py -- \
      --in assets/source/ak47/ak47.blend --out assets/source/ak47/ak47.blend
then export with build.py.

Stages
1. Moulded TPR knuckle guards replace the four flat knuckle pads on both hands: a four-segment bridge over the
   MCP knuckles, a flex-grooved guard on each proximal phalanx and one on the thumb. Each piece is a constrained
   Delaunay patch lifted onto the glove, with a lip and skirt, skinned from the glove under it. The right hand's
   pieces come from the same 2D patches lifted onto the mirrored right glove, so both share topology and UVs.
2. Sleeve: where the glove cuff grips the ripstop sleeve the mesh is subdivided and displaced into compression
   folds and a bunched bulge; the topstitches ride the same displacement.
3. Bake UVs: the glove keeps its unique UVMap; all trims and guards share one trim atlas (BakeUV, islands at one
   texel density, hidden undersides shrunk); the sleeve gets a cylindrical BakeUV. The right hand's trims take the
   left's UVs through the mirror, so each atlas serves both hands.
4. Cycles bakes of the left hand in the rest pose: surface position and normal per texel, ambient occlusion with
   every arm part present, and a true high-to-low normal/curvature bake of the sculpted guards. The idle contact
   occlusion of the left glove is baked in the idle pose (with / without the rifle).
5. A sculpt layer evaluated on the baked surface (seams and stitch rows, PIP flex ribs, joint creases, quilted
   dorsal panel, silicone grip print, cuff ribbing, ripstop grid, sleeve folds, printed/embossed claw marks) is
   converted to tangent normals and cavity, and combined with CC0 scans (Poly Haven bi_stretch, scuba_suede,
   jersey_melange) into zoned colour, normal and ORM atlases. ORM: R occlusion, G roughness, B the left glove's
   contact occlusion (metallic factor 0).
6. Materials: sheen on the knit shell, cuff, binding, webbing, suede and sleeve; occlusion on every atlas.
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector, geometry
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

SOURCE = Path(__file__).resolve().parent
TEXTURES = SOURCE / 'textures'
parser = argparse.ArgumentParser()
parser.add_argument('--in', dest='inp', default=str(SOURCE / 'ak47.blend'))
parser.add_argument('--out', default=None)
parser.add_argument('--size', type=int, default=2048)
parser.add_argument('--cache', default=None, help='development only: reuse bake arrays from this directory')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
SIZE = args.size
CACHE = Path(args.cache) if args.cache else None
if CACHE:
    CACHE.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=args.inp)
scene = bpy.context.scene
if not scene.get('viewmodel_v2'):
    raise RuntimeError('Run viewmodel_v2.py first; this stage finishes its output')
if scene.get('glove_finish'):
    raise RuntimeError('Input already carries the glove finish; start from the viewmodel_v2 output')
L = bpy.data.objects['L_Armature']
R = bpy.data.objects['R_Armature']
ARMS = {'L': L, 'R': R}
MIR = np.diag([-1., 1., 1.])
report = {}
T0 = time.time()


def log(*parts):
    print('GLOVE_FINISH %7.1fs' % (time.time() - T0), *parts, flush=True)


def named(base, side):
    if base == 'GloveAndForearm':
        return side + '_GloveAndForearm'
    return base if side == 'L' else 'R_' + base


def obj(base, side='L'):
    return bpy.data.objects[named(base, side)]


for arm in ARMS.values():
    arm.data.pose_position = 'REST'
scene.frame_set(1)
bpy.context.view_layer.update()

# ---------------------------------------------------------------- numeric helpers


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0., 1.)
    return t * t * (3. - 2. * t)


def _hash(ix, iy, iz, seed):
    h = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791) ^ (seed * 1013904223)
    h &= 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h ^= h >> 16
    return (h & 0xFFFFFF).astype(np.float64) / float(0xFFFFFF) * 2. - 1.


def noise3(x, y, z, seed=0):
    """Smooth value noise in [-1, 1] (arrays of any shape)."""
    x, y, z = np.broadcast_arrays(np.asarray(x, np.float64), np.asarray(y, np.float64), np.asarray(z, np.float64))
    ix, iy, iz = np.floor(x), np.floor(y), np.floor(z)
    fx, fy, fz = x - ix, y - iy, z - iz
    ux, uy, uz = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy), fz * fz * (3 - 2 * fz)
    ix, iy, iz = ix.astype(np.int64), iy.astype(np.int64), iz.astype(np.int64)
    out = 0.
    for dx in (0, 1):
        wx = ux if dx else 1 - ux
        for dy in (0, 1):
            wy = uy if dy else 1 - uy
            for dz in (0, 1):
                wz = uz if dz else 1 - uz
                out = out + wx * wy * wz * _hash(ix + dx, iy + dy, iz + dz, seed)
    return out


def fbm3(x, y, z, seed=0, octaves=4):
    total, amp, norm = 0., 1., 0.
    for o in range(octaves):
        total = total + amp * noise3(x * 2 ** o, y * 2 ** o, z * 2 ** o, seed + 17 * o)
        norm += amp
        amp *= .5
    return total / norm


def gblur(a, sigma):
    """Gaussian blur (pixels, wrap-around) of an (H, W) or (H, W, C) array."""
    if sigma <= 0:
        return a
    if a.ndim == 3:
        return np.stack([gblur(a[..., c], sigma) for c in range(a.shape[2])], -1)
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2. * (np.pi * sigma) ** 2 * (fx * fx + fy * fy))
    return np.fft.irfft2(np.fft.rfft2(a) * g, s=(h, w))


def mblur(a, mask, sigma):
    m = mask.astype(np.float64)
    if a.ndim == 3:
        return gblur(a * m[..., None], sigma) / np.maximum(gblur(m, sigma), 1e-6)[..., None]
    return gblur(a * m, sigma) / np.maximum(gblur(m, sigma), 1e-6)


def fill(a, mask):
    """Push-pull padding: texels outside mask take the nearest coverage's values (mip-safe island edges)."""
    squeeze = a.ndim == 2
    x = a[..., None] if squeeze else a
    wt = mask.astype(np.float64)[..., None]
    pyramid = [(x * wt, wt)]
    while pyramid[-1][0].shape[0] > 1:
        s, w = pyramid[-1]
        h2, w2 = s.shape[0] // 2, s.shape[1] // 2
        pyramid.append((s.reshape(h2, 2, w2, 2, -1).sum((1, 3)), w.reshape(h2, 2, w2, 2, 1).sum((1, 3))))
    value = pyramid[-1][0] / np.maximum(pyramid[-1][1], 1e-12)
    for s, w in reversed(pyramid[:-1]):
        up = np.repeat(np.repeat(value, 2, 0), 2, 1)
        up = gblur(up, .7) if up.shape[0] >= 8 else up
        cover = np.clip(w, 0., 1.)
        value = s / np.maximum(w, 1e-12) * cover + up * (1. - cover)
    return value[..., 0] if squeeze else value


def srgb(lin):
    lin = np.clip(lin, 0., 1.)
    return np.where(lin <= .0031308, lin * 12.92, 1.055 * np.power(lin, 1 / 2.4) - .055)


def linear(c):
    c = np.asarray(c, np.float64) / 255.
    return np.where(c <= .04045, c / 12.92, np.power((c + .055) / 1.055, 2.4))


def luminance(rgb):
    return rgb @ np.array([.2126, .7152, .0722])


def sample(tex, u, v):
    """Bilinear, wrapped sample of an (H, W, C) texture at texture-space coordinates (1 = one tile)."""
    h, w = tex.shape[:2]
    x = np.asarray(u) * w - .5
    y = np.asarray(v) * h - .5
    x0, y0 = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    x0, y0 = x0 % w, y0 % h
    x1, y1 = (x0 + 1) % w, (y0 + 1) % h
    return ((tex[y0, x0] * (1 - fx) + tex[y0, x1] * fx) * (1 - fy) + (tex[y1, x0] * (1 - fx) + tex[y1, x1] * fx) * fy)


def image_array(image):
    px = np.empty(image.size[0] * image.size[1] * 4, np.float32)
    image.pixels.foreach_get(px)
    return px.reshape(image.size[1], image.size[0], 4).astype(np.float64)


def load_scan(name):
    image = bpy.data.images.load(str(TEXTURES / name), check_existing=True)
    image.colorspace_settings.name = 'Non-Color'
    data = image_array(image)[..., :3]
    bpy.data.images.remove(image)
    return data


def normalize(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def blend_normals(base, detail, strength=1.):
    """Whiteout blend of tangent-space normals (unit vectors, last axis xyz)."""
    d = detail.copy()
    d[..., :2] *= strength
    d = normalize(d)
    return normalize(np.concatenate([base[..., :2] + d[..., :2], (base[..., 2] * d[..., 2])[..., None]], -1))


def height_normal(height_m, ds):
    """Tangent-space normal (OpenGL, rows = +v) of a height field in metres over texels of ds metres."""
    gx = (np.roll(height_m, -1, 1) - np.roll(height_m, 1, 1)) * .5
    gy = (np.roll(height_m, -1, 0) - np.roll(height_m, 1, 0)) * .5
    return normalize(np.stack([-gx / ds, -gy / ds, np.ones_like(gx)], -1))


def cavity_of(height_mm, mask, sigma):
    """Positive where the surface sits below its surroundings (seams, creases), 0 on flats and ridges."""
    return np.clip(mblur(height_mm, mask, sigma) - height_mm, 0., None)


def convexity_of(height_mm, mask, sigma):
    return np.clip(height_mm - mblur(height_mm, mask, sigma), 0., None)


def save_image(name, rgb, colorspace):
    """Write an 8-bit PNG (rgb already encoded for its colour space) into textures/ and pack it."""
    h, w = rgb.shape[:2]
    rgba = np.concatenate([np.clip(rgb, 0., 1.), np.ones((h, w, 1))], -1).astype(np.float32)
    image = bpy.data.images.get(name)
    if image:
        bpy.data.images.remove(image)
    image = bpy.data.images.new(name, w, h, alpha=False)
    image.colorspace_settings.name = colorspace
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw = str(TEXTURES / (name + '.png'))
    image.file_format = 'PNG'
    image.save()
    image.pack()
    return image


# ---------------------------------------------------------------- geometry helpers


def rest_arrays(ob, side):
    """Rest vertex positions, normals and triangles of ob in canonical (left armature) space."""
    arm = ARMS[side]
    m = np.array(arm.matrix_world.inverted() @ ob.matrix_world)
    me = ob.data
    n = len(me.vertices)
    co = np.empty(n * 3)
    me.vertices.foreach_get('co', co)
    no = np.empty(n * 3)
    me.vertices.foreach_get('normal', no)
    co = co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]
    no = normalize(no.reshape(-1, 3) @ m[:3, :3].T)
    tris = np.empty(len(me.loop_triangles) * 3, np.int64)
    me.loop_triangles.foreach_get('vertices', tris)
    tris = tris.reshape(-1, 3)
    if side == 'R':
        co, no, tris = co @ MIR, no @ MIR, tris[:, ::-1].copy()
    return co, no, tris


def bvh_of(parts):
    verts, tris, base = [], [], 0
    for co, _, tr in parts:
        verts.append(co)
        tris.append(tr + base)
        base += len(co)
    verts = np.concatenate(verts)
    return BVHTree.FromPolygons([Vector(v) for v in verts], np.concatenate(tris).tolist(), all_triangles=True), verts


def barycentric(p, a, b, c):
    w = geometry.barycentric_transform(Vector(p), Vector(a), Vector(b), Vector(c),
                                       Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    return np.array(w)


def skin_from(ob, side, host, points):
    """Weights of each new vertex (canonical points) from the nearest surface point of host, top four, normalised."""
    co, _, tris = rest_arrays(host, side)
    tree = BVHTree.FromPolygons([Vector(v) for v in co], tris.tolist(), all_triangles=True)
    names = [g.name for g in host.vertex_groups]
    weights = np.zeros((len(co), len(names)))
    for v in host.data.vertices:
        for g in v.groups:
            weights[v.index, g.group] = g.weight
    groups = [ob.vertex_groups.get(n) or ob.vertex_groups.new(name=n) for n in names]
    for i, p in enumerate(points):
        location, _, face, _ = tree.find_nearest(Vector(p))
        a, b, c = tris[face]
        bary = np.clip(barycentric(location, co[a], co[b], co[c]), 0., 1.)
        w = bary[0] * weights[a] + bary[1] * weights[b] + bary[2] * weights[c]
        top = np.argsort(w)[-4:]
        wt = np.clip(w[top], 0., None)
        wt = wt / max(wt.sum(), 1e-9)
        for k, gi in enumerate(top):
            if wt[k] > 1e-4:
                groups[gi].add([i], float(wt[k]), 'REPLACE')
    for v in ob.data.vertices:
        total = sum(g.weight for g in v.groups)
        if total > 0:
            for g in v.groups:
                g.weight /= total


def link_like(ob, like):
    for collection in like.users_collection:
        collection.objects.link(ob)


def attach(ob, side):
    arm = ARMS[side]
    ob.parent = arm
    ob.parent_type = 'OBJECT'
    ob.matrix_parent_inverse = Matrix.Identity(4)
    ob.matrix_basis = Matrix.Identity(4)
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm


def new_object(name, side, verts, faces, uvs, material, like):
    """Mesh object in side's armature space from canonical verts, per-vertex BakeUV."""
    v = verts if side == 'L' else verts @ MIR
    f = [tuple(face) for face in faces] if side == 'L' else [tuple(reversed(face)) for face in faces]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v.tolist(), [], f)
    me.update()
    layer = me.uv_layers.new(name='BakeUV')
    loop_vert = np.empty(len(me.loops), np.int64)
    me.loops.foreach_get('vertex_index', loop_vert)
    layer.data.foreach_set('uv', uvs[loop_vert].ravel().astype(np.float32))
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me)
    link_like(ob, like)
    attach(ob, side)
    return ob


def uv_islands(me, layer):
    """Island index per loop triangle (loops joined where they share an edge and its UVs)."""
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv[layer]
    bm.faces.ensure_lookup_table()
    parent = list(range(len(bm.faces)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for e in bm.edges:
        if len(e.link_loops) != 2:
            continue
        l1, l2 = e.link_loops
        a1, b1 = l1[uvl].uv, l1.link_loop_next[uvl].uv
        a2, b2 = l2[uvl].uv, l2.link_loop_next[uvl].uv
        if (a1 - b2).length < 1e-5 and (b1 - a2).length < 1e-5:
            parent[find(l1.face.index)] = find(l2.face.index)
    face_island = [find(f.index) for f in bm.faces]
    bm.free()
    return np.array([face_island[t.polygon_index] for t in me.loop_triangles])


def transfer_uv(src, dst, layer='BakeUV'):
    """dst (right) takes src's (left) UVs through the mirror: each corner maps into the nearest left triangle of the
    island under its face centre (barycentric, extrapolated), so faces never straddle two islands."""
    sco, _, stris = rest_arrays(src, 'L')
    dco, _, _ = rest_arrays(dst, 'R')
    sme, dme = src.data, dst.data
    suv = np.empty(len(sme.loops) * 2)
    sme.uv_layers[layer].data.foreach_get('uv', suv)
    suv = suv.reshape(-1, 2)
    tri_loops = np.empty(len(sme.loop_triangles) * 3, np.int64)
    sme.loop_triangles.foreach_get('loops', tri_loops)
    tri_loops = tri_loops.reshape(-1, 3)
    islands = uv_islands(sme, layer)
    tree = BVHTree.FromPolygons([Vector(v) for v in sco], stris.tolist(), all_triangles=True)
    if layer not in dme.uv_layers:
        dme.uv_layers.new(name=layer)
    out = np.zeros((len(dme.loops), 2))
    # Mirroring reversed the left triangles' winding in rest_arrays only for right meshes; src is left, so stris are
    # in loop order and tri_loops line up with them.
    for poly in dme.polygons:
        verts = [dme.loops[li].vertex_index for li in poly.loop_indices]
        centre = dco[verts].mean(0)
        _, _, face, _ = tree.find_nearest(Vector(centre))
        island = islands[face]
        for li, vi in zip(poly.loop_indices, verts):
            location, _, f2, _ = tree.find_nearest(Vector(dco[vi]))
            f = f2 if islands[f2] == island else face
            a, b, c = stris[f]
            la, lb, lc = tri_loops[f]
            # the nearest point inside the triangle (decimated slivers make extrapolated coordinates explode)
            w = np.clip(barycentric(location if f == f2 else dco[vi], sco[a], sco[b], sco[c]), 0., 1.)
            w /= max(w.sum(), 1e-9)
            out[li] = w[0] * suv[la] + w[1] * suv[lb] + w[2] * suv[lc]
    dme.uv_layers[layer].data.foreach_set('uv', out.ravel().astype(np.float32))


def keep_uv(me, name):
    for layer in [l for l in me.uv_layers if l.name != name]:
        me.uv_layers.remove(layer)
    me.uv_layers[name].active = True
    me.uv_layers[name].active_render = True


# ---------------------------------------------------------------- hand model (canonical left armature space)


def bone(name):
    b = L.data.bones[name]
    return np.array(b.head_local), np.array(b.tail_local)


FINGERS = ['index', 'middle', 'ring', 'pinky']
DIGIT_BONES = {f: ['L_f_%s.0%d' % (f, i) for i in (1, 2, 3)] for f in FINGERS}
DIGIT_BONES['thumb'] = ['L_thumb.0%d' % i for i in (1, 2, 3)]
DIGITS = FINGERS + ['thumb']
overlay_co, _, _ = rest_arrays(obj('Palm heel suede overlay'), 'L')


def palmar_dir(a, b, radius=.014):
    """Direction from segment a-b toward the palm, from the palm overlay sewn on that side."""
    e = (b - a) / np.linalg.norm(b - a)
    t = np.clip((overlay_co - a) @ e / np.linalg.norm(b - a), 0, 1)
    q = a + t[:, None] * (b - a)
    d = overlay_co - q
    near = np.linalg.norm(d, axis=1) < radius
    if near.sum() < 20:
        raise RuntimeError('No palm overlay near a bone segment')
    v = d[near].mean(0)
    v -= e * (v @ e)
    return v / np.linalg.norm(v)


SEGMENTS = []
for di, digit in enumerate(DIGITS):
    s0 = 0.
    for si, name in enumerate(DIGIT_BONES[digit]):
        a, b = bone(name)
        y = (b - a) / np.linalg.norm(b - a)
        dorsal = -palmar_dir(a, b)
        x = np.cross(y, dorsal)
        SEGMENTS.append({'digit': di, 'seg': si, 'a': a, 'b': b, 'y': y, 'D': dorsal, 'X': x, 's0': s0,
                         'len': np.linalg.norm(b - a) * 1000})
        s0 += np.linalg.norm(b - a) * 1000
HAND_A, HAND_B = bone('SupportHand')
HAND_Y = (HAND_B - HAND_A) / np.linalg.norm(HAND_B - HAND_A)
HAND_D = -palmar_dir(HAND_A, HAND_B, .035)
HAND_X = np.cross(HAND_Y, HAND_D)
SEGMENTS.append({'digit': 5, 'seg': 0, 'a': HAND_A, 'b': HAND_B, 'y': HAND_Y, 'D': HAND_D, 'X': HAND_X, 's0': 0.,
                 'len': np.linalg.norm(HAND_B - HAND_A) * 1000})
FA_A = bone('L_forearm.001')[0]
FA_Y = (HAND_A - FA_A) / np.linalg.norm(HAND_A - FA_A)
FA_D = HAND_D - FA_Y * (HAND_D @ FA_Y)
FA_D /= np.linalg.norm(FA_D)
SEGMENTS.append({'digit': 6, 'seg': 0, 'a': FA_A, 'b': HAND_A, 'y': FA_Y, 'D': FA_D, 'X': np.cross(FA_Y, FA_D),
                 's0': -np.linalg.norm(HAND_A - FA_A) * 1000, 'len': np.linalg.norm(HAND_A - FA_A) * 1000})
JOINTS = {digit: [SEGMENTS[i]['s0'] for i in range(len(SEGMENTS)) if SEGMENTS[i]['digit'] == di]
          for di, digit in enumerate(DIGITS)}


def classify(P):
    """Nearest digit segment of each point: digit (0-3 fingers, 4 thumb, 5 hand, 6 forearm), segment, s (mm along the
    digit from its base joint), theta (0 on the back, +-pi on the palm side), radius (mm), and the dorsal axis."""
    n = len(P)
    out = {k: np.zeros(n) for k in ('digit', 'seg', 's', 'theta', 'radius')}
    out['D'] = np.zeros((n, 3))
    out['X'] = np.zeros((n, 3))
    for start in range(0, n, 262144):
        p = P[start:start + 262144]
        best = np.full(len(p), np.inf)
        for k, s in enumerate(SEGMENTS):
            e = s['b'] - s['a']
            t = (p - s['a']) @ e / (e @ e)
            lo = -.2 if (s['seg'] > 0 or s['digit'] >= 5) else -.06
            hi = 1.45 if s['seg'] == 2 else (1.3 if s['digit'] == 6 else 1.02)
            tc = np.clip(t, 0., 1.)
            q = s['a'] + tc[:, None] * e
            r = p - q
            d = np.linalg.norm(r, axis=1)
            d = np.where((t >= lo) & (t <= hi), d, np.inf)
            if s['digit'] == 5:
                d = d + .004    # fingers win near their base joints
            take = d < best
            best = np.where(take, d, best)
            rt = p - (s['a'] + t[:, None] * e)
            theta = np.arctan2(rt @ s['X'], rt @ s['D'])
            sl = slice(start, start + len(p))
            for key, val in (('digit', s['digit']), ('seg', s['seg']), ('s', s['s0'] + t * s['len']), ('theta', theta),
                             ('radius', np.linalg.norm(rt, axis=1) * 1000)):
                out[key][sl] = np.where(take, val, out[key][sl])
            out['D'][sl][take] = s['D']
            out['X'][sl][take] = s['X']
    return out


# ---------------------------------------------------------------- 1. moulded knuckle guards

guard_mat = bpy.data.materials.new('Moulded knuckle guard')
guard_mat.use_nodes = True


def skin_parts(side):
    return [rest_arrays(obj('GloveAndForearm', side), side), rest_arrays(obj('Dorsal reinforcement', side), side)]


def outline_capsule(a0, a1, w, step):
    """Stadium outline in (along, across) mm, counter-clockwise."""
    pts = []
    n_side = max(2, int((a1 - a0) / step))
    for i in range(n_side + 1):
        pts.append((a0 + (a1 - a0) * i / n_side, -w))
    n_cap = max(6, int(math.pi * w / step))
    for i in range(1, n_cap):
        ang = -math.pi / 2 + math.pi * i / n_cap
        pts.append((a1 + w * math.cos(ang), w * math.sin(ang)))
    for i in range(n_side + 1):
        pts.append((a1 - (a1 - a0) * i / n_side, w))
    for i in range(1, n_cap):
        ang = math.pi / 2 + math.pi * i / n_cap
        pts.append((a0 + w * math.cos(ang), w * math.sin(ang)))
    return np.array(pts)


def outline_bridge(centres, widths, mid_width, step):
    """Scalloped bridge round a polyline of knuckle centres (x across, y along the fingers), counter-clockwise."""
    c = np.array(centres)
    ext0 = c[0] + (c[0] - c[1]) / np.linalg.norm(c[0] - c[1]) * 2.5
    ext1 = c[-1] + (c[-1] - c[-2]) / np.linalg.norm(c[-1] - c[-2]) * 2.5
    poly = np.vstack([ext0, c, ext1])
    wid = [widths[0]] + list(widths) + [widths[-1]]
    dense, dw = [], []
    for i in range(len(poly) - 1):
        seg = np.linalg.norm(poly[i + 1] - poly[i])
        n = max(2, int(seg / (step * .5)))
        for k in range(n):
            t = k / n
            dense.append(poly[i] + (poly[i + 1] - poly[i]) * t)
            if 0 < i < len(poly) - 2:                                  # knuckle -> scallop -> knuckle
                base = wid[i] + (wid[i + 1] - wid[i]) * (t * t * (3 - 2 * t))
                dw.append(base + (mid_width - base) * math.sin(math.pi * t) ** 2)
            else:
                dw.append(wid[i] if i == 0 else wid[i + 1])
    dense.append(poly[-1])
    dw.append(wid[-1])
    dense, dw = np.array(dense), np.array(dw)
    tang = np.gradient(dense, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True)
    nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
    left = dense + nrm * dw[:, None]
    right = dense - nrm * dw[:, None]
    caps = []
    for end, sgn in ((-1, 1), (0, -1)):
        centre, r = dense[end], dw[end]
        base = math.atan2(nrm[end][1], nrm[end][0])
        n_cap = max(8, int(math.pi * r / step))
        caps.append([centre + r * np.array([math.cos(base - sgn * math.pi * i / n_cap), math.sin(base - sgn * math.pi * i / n_cap)])
                     for i in range(1, n_cap)])
    ring = np.vstack([right, caps[0], left[::-1], caps[1]])
    for _ in range(3):                                            # soften the scallop corners
        ring = .5 * ring + .25 * (np.roll(ring, 1, 0) + np.roll(ring, -1, 0))
    # uniform resampling
    seg = np.linalg.norm(np.roll(ring, -1, 0) - ring, axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    total = cum[-1]
    n = int(total / step)
    t = np.linspace(0, total, n, endpoint=False)
    closed = np.vstack([ring, ring[:1]])
    out = np.stack([np.interp(t, cum, closed[:, 0]), np.interp(t, cum, closed[:, 1])], 1)
    area = .5 * np.sum(out[:, 0] * np.roll(out[:, 1], -1) - np.roll(out[:, 0], -1) * out[:, 1])
    return out if area > 0 else out[::-1]


def resample_closed(ring, step):
    seg = np.linalg.norm(np.roll(ring, -1, 0) - ring, axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    n = max(8, int(cum[-1] / step))
    t = np.linspace(0, cum[-1], n, endpoint=False)
    closed = np.vstack([ring, ring[:1]])
    out = np.stack([np.interp(t, cum, closed[:, 0]), np.interp(t, cum, closed[:, 1])], 1)
    area = .5 * np.sum(out[:, 0] * np.roll(out[:, 1], -1) - np.roll(out[:, 0], -1) * out[:, 1])
    return out if area > 0 else out[::-1]


def patch_2d(outline, step):
    """Constrained Delaunay patch of an outline (mm) with a hex grid of interior points."""
    ring = resample_closed(outline, step)
    dense = resample_closed(outline, .08)
    kd = KDTree(len(dense))
    for i, p in enumerate(dense):
        kd.insert((p[0], p[1], 0), i)
    kd.balance()
    lo, hi = ring.min(0), ring.max(0)
    pts = []
    dy = step * math.sqrt(3) / 2
    for j in range(int((hi[1] - lo[1]) / dy) + 2):
        for i in range(int((hi[0] - lo[0]) / step) + 2):
            x = lo[0] + i * step + (step / 2 if j % 2 else 0)
            y = lo[1] + j * dy
            pts.append((x, y))
    pts = np.array(pts)
    inside = np.array([_inside(p, ring) for p in pts])
    dist = np.array([kd.find((p[0], p[1], 0))[2] for p in pts])
    interior = pts[inside & (dist > step * .62)]
    verts = [Vector(p) for p in ring] + [Vector(p) for p in interior]
    edges = [(i, (i + 1) % len(ring)) for i in range(len(ring))]
    out = geometry.delaunay_2d_cdt(verts, edges, [], 1, 1e-6)
    v2 = np.array([[v.x, v.y] for v in out[0]])
    faces = [tuple(f) for f in out[2]]
    ring_index = {}
    for new_i, orig in enumerate(out[3]):
        for o in orig:
            if o < len(ring):
                ring_index[o] = new_i
    loop = [ring_index[i] for i in range(len(ring))]
    d_edge = np.array([kd.find((p[0], p[1], 0))[2] for p in v2])
    d_edge[loop] = 0.
    # orient faces counter-clockwise in 2D
    fixed = []
    for f in faces:
        a, b, c = v2[f[0]], v2[f[1]], v2[f[2]]
        cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        fixed.append(f if cross > 0 else f[::-1])
    return v2, fixed, loop, d_edge


def _inside(p, ring):
    x, y = p
    xs, ys = ring[:, 0], ring[:, 1]
    xn, yn = np.roll(xs, -1), np.roll(ys, -1)
    cond = (ys > y) != (yn > y)
    xint = (xn - xs) * (y - ys) / np.where(yn - ys == 0, 1e-12, yn - ys) + xs
    return np.count_nonzero(cond & (x < xint)) % 2 == 1


def lift(v2, d_edge, loop, frame, tree, height_fn, lip, skirt=.6):
    """Lift a 2D patch (mm) onto the skin along -Z, smooth the base, offset by the height along the skin normal and
    add a skirt under the outline. Returns canonical verts, faces offset for the skirt, and planar UVs (metres)."""
    O, X, Y, Z = frame
    n = len(v2)
    base = np.zeros(n)
    nrm = np.zeros((n, 3))
    for i, (x, y) in enumerate(v2):
        origin = O + X * x * .001 + Y * y * .001 + Z * .016     # just above the back of the hand/finger
        hit, normal, _, dist = tree.ray_cast(Vector(origin), Vector(-Z), .03)
        if hit is None:
            hit, normal, _, _ = tree.find_nearest(Vector(origin - Z * .008))
        base[i] = (np.array(hit) - O) @ Z
        nrm[i] = np.array(normal)
    kd = KDTree(n)
    for i, p in enumerate(v2):
        kd.insert((p[0], p[1], 0), i)
    kd.balance()
    for _ in range(2):                                            # reject stray hits (another digit, a crease)
        med = np.array([np.median(base[[h[1] for h in kd.find_range((p[0], p[1], 0), 3.)]]) for p in v2])
        bad = np.abs(base - med) > .0012
        base[bad] = med[bad]
    smooth_base = np.zeros(n)
    smooth_n = np.zeros((n, 3))
    for i, p in enumerate(v2):
        hits = kd.find_range((p[0], p[1], 0), 5.)
        idx = np.array([h[1] for h in hits])
        w = np.exp(-np.square([h[2] for h in hits]) / (2 * 1.8 ** 2))
        smooth_base[i] = (base[idx] * w).sum() / w.sum()
        smooth_n[i] = (nrm[idx] * w[:, None]).sum(0)
    smooth_n = normalize(smooth_n)
    top_base = np.maximum(smooth_base, base) + .00022
    h = height_fn(v2, d_edge) * .001 + lip * .001
    top = O + X * (v2[:, :1] * .001) + Y * (v2[:, 1:] * .001) + Z * top_base[:, None] + smooth_n * h[:, None]
    bottom = O + X * (v2[loop, :1] * .001) + Y * (v2[loop, 1:] * .001) + Z * (base[loop, None] - skirt * .001)
    verts = np.vstack([top, bottom])
    uv = np.vstack([v2 * .001, np.zeros((len(loop), 2))])
    # skirt UVs continue outward from the outline by the wall height (continuous texture over the lip)
    ring2 = v2[loop]
    tang = np.roll(ring2, -1, 0) - np.roll(ring2, 1, 0)
    outward = normalize(np.stack([tang[:, 1], -tang[:, 0]], 1))
    wall = (top[loop] - bottom) @ Z
    uv[n:] = (ring2 + outward * (np.abs(wall)[:, None] * 1000 + .2)) * .001
    return verts, uv, n


def guard_faces(faces, loop, n):
    out = list(faces)
    m = len(loop)
    for i in range(m):
        a, b = loop[i], loop[(i + 1) % m]
        out.append((b, a, n + i, n + (i + 1) % m))
    return out


def mcp_frame():
    heads = np.array([SEGMENTS[4 * 0 + 0]['a'] if False else s['a'] for s in SEGMENTS if s['digit'] < 4 and s['seg'] == 0])
    O = heads.mean(0)
    Z = normalize(np.mean([s['D'] for s in SEGMENTS if s['digit'] < 4 and s['seg'] == 0], 0))
    X = heads[0] - heads[-1]
    X = normalize(X - Z * (X @ Z))
    Y = np.cross(Z, X)
    return O, X, Y, Z, heads


def mcp_design():
    O, X, Y, Z, heads = mcp_frame()
    centres = [((h - O) @ X * 1000, (h - O) @ Y * 1000 - 1.6) for h in heads]
    widths = [9.2, 9.6, 9.2, 8.0]
    outline = outline_bridge(centres, widths, 7.0, .5)
    c = np.array(centres)
    mids = [(c[i] + c[i + 1]) / 2 for i in range(3)]
    axes = [normalize(c[i + 1] - c[i]) for i in range(3)]

    def height(v2, d, detail):
        e = smoothstep(0, 1.9, d) ** .8
        dome = np.zeros(len(v2))
        ring = np.zeros(len(v2))
        for k, ck in enumerate(c):
            r = np.linalg.norm(v2 - ck, axis=1) / 7.8
            dome += 1.2 * np.clip(1 - r * r, 0, None) ** 1.5
        hgt = e * (1.25 + dome)
        if detail:
            groove = np.zeros(len(v2))
            for m, ax in zip(mids, axes):
                groove += np.exp(-np.square(((v2 - m) @ ax) / .55))
            hgt -= e * .85 * np.clip(groove, 0, 1)                         # four moulded segments
            hgt -= .12 * np.exp(-np.square((d - 1.15) / .28))              # moulded edge bead line
        return hgt
    return (O, X, Y, Z), outline, height


def finger_design(finger):
    s = next(s for s in SEGMENTS if s['digit'] == DIGITS.index(finger) and s['seg'] == (1 if finger == 'thumb' else 0))
    O, X, Y, Z = s['a'], s['y'], np.cross(s['D'], s['y']), s['D']
    length = s['len']
    a0, a1 = (3., length - 3.) if finger == 'thumb' else (10.6, length - 3.)
    w = {'index': 5.0, 'middle': 5.1, 'ring': 4.9, 'pinky': 4.3, 'thumb': 5.4}[finger]
    outline = outline_capsule(a0 + w, a1 - w, w, .5)
    cuts = [a0 + (a1 - a0) * f for f in (1 / 3, 2 / 3)]

    def height(v2, d, detail):
        e = smoothstep(0, 1.4, d) ** .8
        crown = 1 - .3 * np.square(v2[:, 1] / w)
        hgt = e * 1.45 * crown
        if detail:
            for cut in cuts:                                              # three flex segments
                hgt -= e * .8 * np.exp(-np.square((v2[:, 0] - cut) / .5))
            hgt -= .12 * np.exp(-np.square((d - 1.1) / .26))
        return hgt
    return (O, X, Y, Z), outline, height


GUARDS = {'Moulded knuckle guard': mcp_design()}
for finger, label in zip(DIGITS, ['Index', 'Middle', 'Ring', 'Little', 'Thumb']):
    GUARDS[label + (' finger guard' if finger != 'thumb' else ' guard')] = finger_design(finger)

GUARD_HIGH = {}
for name, (frame, outline, height) in GUARDS.items():
    low = patch_2d(outline, 1.05)
    high = patch_2d(outline, .22)
    for side in ('L', 'R'):
        parts = skin_parts(side)
        tree, _ = bvh_of(parts)
        v2, faces, loop, d = low
        verts, uv, n = lift(v2, d, loop, frame, tree, lambda q, dd: height(q, dd, False), .42)
        ob = new_object(named(name, side), side, verts, guard_faces(faces, loop, n), uv, guard_mat, obj('GloveAndForearm', side))
        skin_from(ob, side, obj('GloveAndForearm', side), verts)
        if side == 'L':
            hv2, hfaces, hloop, hd = high
            hverts, huv, hn = lift(hv2, hd, hloop, frame, tree, lambda q, dd: height(q, dd, True), .42)
            me = bpy.data.meshes.new(name + ' high')
            me.from_pydata(hverts.tolist(), [], guard_faces(hfaces, hloop, hn))
            me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
            me.update()
            hob = bpy.data.objects.new(name + ' high', me)
            scene.collection.objects.link(hob)
            hob.matrix_world = L.matrix_world.copy()
            GUARD_HIGH[name] = hob
for side in ('L', 'R'):
    for label in ['Index', 'Middle', 'Ring', 'Little']:
        ob = bpy.data.objects.get(named(label + ' knuckle pad', side))
        if ob:
            bpy.data.objects.remove(ob)
report['guards'] = {name: len(obj(name).data.polygons) for name in GUARDS}
log('guards', report['guards'])

# ---------------------------------------------------------------- 2. sleeve folds and the arm axis

ARM_POINTS = [HAND_A, bone('L_forearm.001')[0], bone('L_forearm')[0], bone('L_upper_arm.001')[0], bone('L_upper_arm')[0]]
ARM_POINTS = [p for i, p in enumerate(ARM_POINTS) if i == 0 or np.linalg.norm(p - ARM_POINTS[i - 1]) > 1e-4]
ARM_FRAMES = []
ref = HAND_D.copy()
cum = 0.
for i in range(len(ARM_POINTS) - 1):
    a, b = ARM_POINTS[i], ARM_POINTS[i + 1]
    t = (b - a) / np.linalg.norm(b - a)
    ref = ref - t * (ref @ t)
    ref /= np.linalg.norm(ref)
    ARM_FRAMES.append({'a': a, 'b': b, 't': t, 'ref': ref.copy(), 'bin': np.cross(t, ref), 's0': cum,
                       'len': np.linalg.norm(b - a) * 1000})
    cum += np.linalg.norm(b - a) * 1000


def arm_coords(P):
    """s (mm from the wrist toward the shoulder), theta (0 on the back of the forearm) and radius (mm)."""
    best = np.full(len(P), np.inf)
    s_out, th_out, r_out = np.zeros(len(P)), np.zeros(len(P)), np.zeros(len(P))
    for k, f in enumerate(ARM_FRAMES):
        e = f['b'] - f['a']
        t = (P - f['a']) @ e / (e @ e)
        lo = -1. if k == 0 else 0.
        hi = 1. if k < len(ARM_FRAMES) - 1 else 2.
        tc = np.clip(t, lo, hi)
        q = f['a'] + tc[:, None] * e
        r = P - q
        d = np.linalg.norm(r, axis=1)
        take = d < best
        best = np.where(take, d, best)
        s_out = np.where(take, f['s0'] + tc * f['len'], s_out)
        th_out = np.where(take, np.arctan2(r @ f['bin'], r @ f['ref']), th_out)
        r_out = np.where(take, d * 1000, r_out)
    return s_out, th_out, r_out


cuff_s = max(arm_coords(rest_arrays(obj(n), 'L')[0])[0].max() for n in ['Rolled cuff edge', 'Rolled cuff edge.001', 'Bound wrist cuff'])
cuff_s0 = min(arm_coords(rest_arrays(obj(n), 'L')[0])[0].min() for n in ['Rolled cuff edge', 'Rolled cuff edge.001', 'Bound wrist cuff'])
report['cuffEdgeMm'] = [round(float(cuff_s0), 2), round(float(cuff_s), 2)]


def periodic_noise(theta, y, seed, freq=1.):
    return noise3(np.cos(theta) * freq + 7., np.sin(theta) * freq + 3., y, seed)


def sleeve_geo_folds(sig, theta):
    """Low-frequency compression folds (mm) where the cuff grips the sleeve; sig = mm up the arm from the cuff."""
    env = smoothstep(0., 5., sig) * np.exp(-np.maximum(sig - 5., 0.) / 34.)
    warp = 4.2 * periodic_noise(theta, sig / 17., 11, 1.3)
    phase = 2 * np.pi * (sig + warp) / 14.
    ring = (.5 + .5 * np.cos(phase)) ** 1.5 - .42
    amp = .7 + .3 * periodic_noise(theta, sig / 40., 12, 2.)
    return env * 2.0 * amp * ring + 1.3 * np.exp(-np.square((sig - 7.) / 9.)) * smoothstep(-1., 2., sig), phase, env


def set_canonical(ob, side, co):
    arm = ARMS[side]
    m = np.array(ob.matrix_world.inverted() @ arm.matrix_world)
    local = (co if side == 'L' else co @ MIR) @ m[:3, :3].T + m[:3, 3]
    ob.data.vertices.foreach_set('co', local.ravel().astype(np.float32))
    ob.data.update()


report['sleeveTriangles'] = {}
for side in ('L', 'R'):
    ob = obj('Tailored ripstop sleeve', side)
    names = [g.name for g in ob.vertex_groups]
    before = ob.data.copy()
    host = bpy.data.objects.new('_sleeve_host_' + side, before)
    scene.collection.objects.link(host)
    host.matrix_world = ob.matrix_world.copy()
    for n in names:
        host.vertex_groups.new(name=n)
    co, _, _ = rest_arrays(ob, side)
    s, _, _ = arm_coords(co)
    sig = s - cuff_s
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    band = [e for e in bm.edges if any(-6. < sig[v.index] < 82. for v in e.verts)]
    bmesh.ops.subdivide_edges(bm, edges=band, cuts=1, use_grid_fill=True)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.normal_update()
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    ob.vertex_groups.clear()
    co2, no2, _ = rest_arrays(ob, side)
    skin_from(ob, side, host, co2)
    hco, _, htris = rest_arrays(host, side)
    tree = BVHTree.FromPolygons([Vector(v) for v in hco], htris.tolist(), all_triangles=True)
    s2, th2, _ = arm_coords(co2)
    sig2 = s2 - cuff_s
    disp, _, _ = sleeve_geo_folds(sig2, th2)
    disp = np.where((sig2 > -4.) & (sig2 < 90.), disp, 0.)
    set_canonical(ob, side, co2 + no2 * disp[:, None] * .001)
    for stitch in ['Sleeve double topstitch', 'Sleeve double topstitch.001']:
        so = obj(stitch, side)
        sco, _, _ = rest_arrays(so, side)
        near = [tree.find_nearest(Vector(p)) for p in sco]
        loc = np.array([n[0] for n in near])
        nrm = np.array([n[1] for n in near])
        ss, st, _ = arm_coords(loc)
        d, _, _ = sleeve_geo_folds(ss - cuff_s, st)
        d = np.where((ss - cuff_s > -4.) & (ss - cuff_s < 90.), d, 0.)
        set_canonical(so, side, sco + nrm * d[:, None] * .001)
    bpy.data.objects.remove(host)
    bpy.data.meshes.remove(before)
    report['sleeveTriangles'][side] = sum(len(p.vertices) - 2 for p in ob.data.polygons)
log('sleeve folds', report['sleeveTriangles'])

# ---------------------------------------------------------------- 3. bake UVs

TRIMS = ['Dorsal reinforcement', 'Palm heel suede overlay', 'Palm overlay rolled seam', 'Rolled cuff edge',
         'Rolled cuff edge.001', 'Raised tan wrist closure', 'Raised tan closure pull tab']
TRIM_ATLAS = TRIMS + list(GUARDS)


def edit(objects, fn):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    fn()
    bpy.ops.object.mode_set(mode='OBJECT')


scene.tool_settings.use_uv_select_sync = True
trim_objects = [obj(n) for n in TRIM_ATLAS]
for ob in [obj(n) for n in TRIMS]:
    me = ob.data
    layer = me.uv_layers.get('BakeUV') or me.uv_layers.new(name='BakeUV')
    me.uv_layers.active = layer
edit([obj(n) for n in TRIMS], lambda: bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.,
                                                                area_weight=0., correct_aspect=True, scale_to_bounds=False))
for ob in trim_objects:
    ob.data.uv_layers.active = ob.data.uv_layers['BakeUV']
edit(trim_objects, lambda: bpy.ops.uv.average_islands_scale())

# Undersides that face the glove are never seen: shrink their islands before packing.
occluders = bvh_of([rest_arrays(o, 'L') for o in [obj('GloveAndForearm')] + trim_objects])[0]
hidden_share = {}
for ob in trim_objects:
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    open_edges = sum(1 for e in bm.edges if e.is_boundary)
    bm.free()
    if open_edges > .02 * len(me.edges):     # open patches are seen from either side
        continue
    co, no, tris = rest_arrays(ob, 'L')
    islands = uv_islands(me, 'BakeUV')
    face_island = {}
    for t, isl in zip(me.loop_triangles, islands):
        face_island[t.polygon_index] = isl
    hidden = {}
    for poly in me.polygons:
        c = co[list(poly.vertices)].mean(0)
        n = normalize(no[list(poly.vertices)].mean(0))
        hit = occluders.ray_cast(Vector(c + n * 2e-4), Vector(n), .0025)[0]
        isl = face_island.get(poly.index, -1)
        tot, hid = hidden.get(isl, (0, 0))
        hidden[isl] = (tot + poly.area, hid + (poly.area if hit is not None else 0))
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv['BakeUV']
    bm.faces.ensure_lookup_table()
    groups = {}
    for f in bm.faces:
        groups.setdefault(face_island.get(f.index, -1), []).append(f)
    shrunk = 0
    for isl, faces in groups.items():
        tot, hid = hidden.get(isl, (1, 0))
        if hid / max(tot, 1e-12) > .7:
            loops = [l for f in faces for l in f.loops]
            centre = sum((l[uvl].uv for l in loops), Vector((0, 0))) / len(loops)
            for l in loops:
                l[uvl].uv = centre + (l[uvl].uv - centre) * .22
            shrunk += 1
    bm.to_mesh(me)
    bm.free()
    hidden_share[ob.name] = shrunk
edit(trim_objects, lambda: bpy.ops.uv.pack_islands(rotate=True, rotate_method='ANY', scale=True, merge_overlap=False,
                                                   margin_method='FRACTION', margin=.0045, shape_method='CONCAVE'))
report['hiddenIslandsShrunk'] = hidden_share
for name in TRIMS:
    transfer_uv(obj(name), obj(name, 'R'))
for name in GUARDS:
    lme, rme = obj(name).data, obj(name, 'R').data
    luv = np.empty(len(lme.loops) * 2)
    lme.uv_layers['BakeUV'].data.foreach_get('uv', luv)
    lvert = np.empty(len(lme.loops), np.int64)
    lme.loops.foreach_get('vertex_index', lvert)
    per_vertex = np.zeros((len(lme.vertices), 2))
    per_vertex[lvert] = luv.reshape(-1, 2)
    rvert = np.empty(len(rme.loops), np.int64)
    rme.loops.foreach_get('vertex_index', rvert)
    rme.uv_layers['BakeUV'].data.foreach_set('uv', per_vertex[rvert].ravel().astype(np.float32))
for name in TRIM_ATLAS:
    for side in ('L', 'R'):
        keep_uv(obj(name, side).data, 'BakeUV')


def sleeve_uv(side):
    ob = obj('Tailored ripstop sleeve', side)
    co, _, _ = rest_arrays(ob, side)
    s, th, r = arm_coords(co)
    bins = np.round(s / 6.)
    r_eff = np.array([np.median(r[bins == b]) for b in bins])
    me = ob.data
    layer = me.uv_layers.get('BakeUV') or me.uv_layers.new(name='BakeUV')
    uv = np.zeros((len(me.loops), 2))
    for poly in me.polygons:
        vs = [me.loops[li].vertex_index for li in poly.loop_indices]
        t = th[vs]
        wrap = t.max() - t.min() > np.pi
        for li, vi in zip(poly.loop_indices, vs):
            tt = th[vi] + (2 * np.pi if wrap and th[vi] < 0 else 0.)
            uv[li] = ((tt + np.pi) * r_eff[vi] * .001, s[vi] * .001)
    return ob, uv


sleeve_uvs = {side: sleeve_uv(side) for side in ('L', 'R')}
span = max(max(uv[:, 0].max() for _, uv in sleeve_uvs.values()),
           max(uv[:, 1].max() - uv[:, 1].min() for _, uv in sleeve_uvs.values()))
s_min = min(uv[:, 1].min() for _, uv in sleeve_uvs.values())
SLEEVE_SCALE = .975 / span
for side, (ob, uv) in sleeve_uvs.items():
    uv = np.stack([.012 + uv[:, 0] * SLEEVE_SCALE, .012 + (uv[:, 1] - s_min) * SLEEVE_SCALE], 1)
    ob.data.uv_layers['BakeUV'].data.foreach_set('uv', uv.ravel().astype(np.float32))
    keep_uv(ob.data, 'BakeUV')
report['sleeveMetresPerUv'] = round(1 / SLEEVE_SCALE, 4)
for side in ('L', 'R'):
    for name in ['GloveAndForearm', 'Bound wrist cuff']:
        keep_uv(obj(name, side).data, 'UVMap')
log('uvs')

# ---------------------------------------------------------------- 4. bakes

ENGINE = scene.render.engine
scene.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.refresh_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = 'GPU'
except Exception as error:   # CPU fallback
    log('cycles device', error)
    scene.cycles.device = 'CPU'
scene.cycles.use_denoising = False
scene.render.bake.margin = 0
if scene.world is None:
    scene.world = bpy.data.worlds.new('Bake world')
scene.world.light_settings.distance = .02

left_arm = [o for o in L.children if o.type == 'MESH']
rifle = [o for o in bpy.data.objects['AK47_Rig'].children_recursive
         if o.type == 'MESH' and o not in L.children_recursive and o not in R.children_recursive]
saved_hide = {o: o.hide_render for o in scene.objects}


def visible(objects):
    for o in scene.objects:
        o.hide_render = o not in objects


def bake_material(image, uv, emit=None):
    mat = bpy.data.materials.new('_bake')
    mat.use_nodes = True
    nt = mat.node_tree
    out = nt.nodes['Material Output']
    if emit:
        nt.nodes.remove(nt.nodes['Principled BSDF'])
        em = nt.nodes.new('ShaderNodeEmission')
        nt.links.new(emit(nt), em.inputs['Color'])
        nt.links.new(em.outputs[0], out.inputs['Surface'])
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = uv
    nt.links.new(uvn.outputs[0], tex.inputs[0])
    for n in nt.nodes:
        n.select = False
    tex.select = True
    nt.nodes.active = tex
    return mat


def emit_position(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    add = nt.nodes.new('ShaderNodeVectorMath')
    add.operation = 'ADD'
    add.inputs[1].default_value = (1., 1., 1.)
    nt.links.new(tc.outputs['Object'], add.inputs[0])
    return add.outputs[0]


def emit_normal(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    ma = nt.nodes.new('ShaderNodeVectorMath')
    ma.operation = 'MULTIPLY_ADD'
    ma.inputs[1].default_value = (.5, .5, .5)
    ma.inputs[2].default_value = (.5, .5, .5)
    nt.links.new(tc.outputs['Normal'], ma.inputs[0])
    return ma.outputs[0]


def emit_pointiness(nt):
    return nt.nodes.new('ShaderNodeNewGeometry').outputs['Pointiness']


def new_bake_image(name, size):
    image = bpy.data.images.new(name, size, size, alpha=True, float_buffer=True)
    image.colorspace_settings.name = 'Non-Color'
    image.pixels.foreach_set(np.zeros(size * size * 4, np.float32))
    return image


def bake(objects, uv, kind, size, emit=None, samples=16, high=None, cache=None, visible_set=None, **kw):
    """Bake objects into one image through their uv layer; returns (H, W, 4) float64."""
    if CACHE and cache and (CACHE / (cache + '.npy')).exists():
        return np.load(CACHE / (cache + '.npy')).astype(np.float64)
    image = new_bake_image('_bake_' + kind, size)
    mat = bake_material(image, uv, emit)
    saved = {}
    for ob in objects:
        saved[ob] = [s.material for s in ob.material_slots]
        if not ob.material_slots:
            ob.data.materials.append(mat)
        for s in ob.material_slots:
            s.material = mat
        ob.data.uv_layers.active = ob.data.uv_layers[uv]
    visible(visible_set if visible_set is not None else list(objects) + ([high] if high else []))
    scene.cycles.samples = samples
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True)
    if high:
        high.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.bake(type=kind, margin=0, use_clear=False, use_selected_to_active=bool(high), **kw)
    data = image_array(image)
    for ob, mats in saved.items():
        for s, m in zip(ob.material_slots, mats):
            s.material = m
        if not mats:
            ob.data.materials.clear()
    bpy.data.materials.remove(mat)
    bpy.data.images.remove(image)
    if CACHE and cache:
        np.save(CACHE / (cache + '.npy'), data.astype(np.float32))
    return data


def surface(objects, uv, size, tag):
    pos = bake(objects, uv, 'EMIT', size, emit_position, cache=tag + '-pos')
    nrm = bake(objects, uv, 'EMIT', size, emit_normal, cache=tag + '-nrm')
    cover = pos[..., 3] > .5
    m = np.array(L.matrix_world.inverted() @ objects[0].matrix_world)
    P = (pos[..., :3] - 1.) @ m[:3, :3].T + m[:3, 3]
    N = normalize((nrm[..., :3] * 2. - 1.) @ m[:3, :3].T)
    return P, N, cover


def texel_size(P, cover):
    Pf = fill(P, cover)
    du = np.linalg.norm(np.roll(Pf, -1, 1) - np.roll(Pf, 1, 1), axis=-1) * .5
    dv = np.linalg.norm(np.roll(Pf, -1, 0) - np.roll(Pf, 1, 0), axis=-1) * .5
    inner = cover & np.roll(cover, 1, 0) & np.roll(cover, -1, 0) & np.roll(cover, 1, 1) & np.roll(cover, -1, 1)
    ds = np.clip(np.minimum(du, dv), 1e-6, 1e-2)
    return fill(mblur(ds, inner, 2.), inner)


ALL_LEFT = left_arm
glove_objs = [obj('GloveAndForearm')]
cuff_objs = [obj('Bound wrist cuff')]
sleeve_objs = [obj('Tailored ripstop sleeve')]
bakes = {}
bakes['glove'] = surface(glove_objs, 'UVMap', SIZE, 'glove')
bakes['cuff'] = surface(cuff_objs, 'UVMap', SIZE, 'cuff')
bakes['sleeve'] = surface(sleeve_objs, 'BakeUV', SIZE, 'sleeve')
trim_ids = np.zeros((SIZE, SIZE), np.int64) - 1
trim_P = np.zeros((SIZE, SIZE, 3))
trim_N = np.zeros((SIZE, SIZE, 3))
for k, name in enumerate(TRIM_ATLAS):
    P, N, cover = surface([obj(name)], 'BakeUV', SIZE, 'trim%d' % k)
    trim_ids[cover] = k
    trim_P[cover] = P[cover]
    trim_N[cover] = N[cover]
bakes['trim'] = (trim_P, trim_N, trim_ids >= 0)
log('surface bakes')

ao = {}
visible_left = [o for o in left_arm]
for tag, objects, uv in (('glove', glove_objs, 'UVMap'), ('cuff', cuff_objs, 'UVMap'), ('sleeve', sleeve_objs, 'BakeUV'),
                         ('trim', trim_objects, 'BakeUV')):
    ao[tag] = bake(objects, uv, 'AO', SIZE, samples=192, cache=tag + '-ao', visible_set=visible_left)[..., 0]
log('occlusion bakes')

guard_normal = np.zeros((SIZE, SIZE, 3))
guard_normal[..., 2] = 1.
guard_point = np.full((SIZE, SIZE), .5)
for k, name in enumerate(GUARDS):
    low = obj(name)
    nrm = bake([low], 'BakeUV', 'NORMAL', SIZE, samples=16, high=GUARD_HIGH[name], cache='guard%d-nrm' % k,
               normal_space='TANGENT', cage_extrusion=.0016, max_ray_distance=.004)
    GUARD_HIGH[name].data.materials.append(bake_material(new_bake_image('_unused', 8), 'BakeUV', emit_pointiness))
    pnt = bake([low], 'BakeUV', 'EMIT', SIZE, samples=16, high=GUARD_HIGH[name], cache='guard%d-pnt' % k,
               cage_extrusion=.0016, max_ray_distance=.004)
    cover = nrm[..., 3] > .5
    guard_normal[cover] = nrm[cover][:, :3] * 2. - 1.
    guard_point[cover] = pnt[cover][:, 0]
guard_normal = normalize(guard_normal)
log('guard high-to-low bakes')

# Idle contact occlusion of the left glove: occlusion with the rifle over occlusion without it, in the idle pose.
L.data.pose_position = 'POSE'
R.data.pose_position = 'POSE'
scene.frame_set(1)
bpy.context.view_layer.update()
with_rifle = bake(glove_objs, 'UVMap', 'AO', SIZE // 2, samples=256, cache='contact-with', visible_set=visible_left + rifle)[..., 0]
without = bake(glove_objs, 'UVMap', 'AO', SIZE // 2, samples=256, cache='contact-without', visible_set=visible_left)[..., 0]
L.data.pose_position = 'REST'
R.data.pose_position = 'REST'
scene.frame_set(1)
bpy.context.view_layer.update()
contact_cover = without > 1e-3
contact = np.clip(with_rifle / np.maximum(without, 1e-3), 0., 1.)
contact = np.where(contact_cover, contact, 1.)
contact = fill(mblur(contact, contact_cover, 2.), contact_cover)
contact = np.clip(np.kron(contact, np.ones((2, 2))), 0., 1.)
contact = gblur(contact, 1.)
report['contactOcclusionMin'] = round(float(contact.min()), 3)
log('contact occlusion')

# ---------------------------------------------------------------- 5. atlases

scans = {n: {m: load_scan('%s_%s_2k.jpg' % (n, m)) for m in ('diff', 'nor_gl', 'arm')}
         for n in ('bi_stretch', 'scuba_suede', 'jersey_melange')}
for n in scans:
    nor = scans[n]['nor_gl'] * 2. - 1.
    nor[..., :2] -= nor[..., :2].reshape(-1, 2).mean(0)      # no net tilt: rotated UV islands must light alike
    scans[n]['nor'] = normalize(nor)
    lum = luminance(scans[n]['diff'])
    scans[n]['var'] = lum / lum.mean()
    scans[n]['rough'] = scans[n]['arm'][..., 1]
V, U = np.mgrid[0:SIZE, 0:SIZE].astype(np.float64)
U = (U + .5) / SIZE
V = (V + .5) / SIZE


def scan_detail(name, cover, ds, scale_boost):
    """Scan normal, albedo variation and roughness at a physical scale (the scans are ~0.265 m tiles)."""
    metres_per_uv = float(np.median(ds[cover])) * SIZE
    rep = metres_per_uv / .265 / scale_boost
    s = scans[name]
    return (normalize(sample(s['nor'], U * rep, V * rep)), sample(s['var'][..., None], U * rep, V * rep)[..., 0],
            sample(s['rough'][..., None], U * rep, V * rep)[..., 0])


def stitch_row(along, across, offset, pitch=2.9, hole=.22, thread=.34):
    """Tone-on-tone stitch row: thread dashes (+) and needle holes (-) at `offset` mm across a seam."""
    d = across - offset
    phase = np.mod(along / pitch, 1.)
    dash = smoothstep(.12, .2, phase) * (1 - smoothstep(.8, .88, phase))
    lane = np.exp(-np.square(d / thread))
    holes = np.exp(-np.square(d / hole)) * np.exp(-np.square((phase - .0) / .06) ) + \
        np.exp(-np.square(d / hole)) * np.exp(-np.square((phase - 1.) / .06))
    return lane * dash, holes


def claw_mark(x, y, size):
    """Three curved slashes (the game's claw mark), 1 inside, in mm coordinates centred on the mark."""
    x, y = x / size, y / size
    ang = math.radians(-18)
    xr, yr = x * math.cos(ang) - y * math.sin(ang), x * math.sin(ang) + y * math.cos(ang)
    mark = np.zeros_like(x)
    for k, off in enumerate((-.34, 0., .34)):
        t = np.clip(yr / .5, -1., 1.)
        centre = off + .12 * t * t - .04 * k
        width = .085 * (1 - t * t) + .01
        d = np.abs(xr - centre) - width
        inside = (np.abs(yr) < .5)
        mark = np.maximum(mark, (1 - smoothstep(-.012, .012, d)) * inside)
    return mark


def finish(tag, color_lin, rough, normal_ts, occlusion, contact_b=None):
    b = contact_b if contact_b is not None else np.zeros_like(rough)
    rgb = srgb(color_lin)
    nrm = normal_ts * .5 + .5
    orm = np.stack([np.clip(occlusion, 0., 1.), np.clip(rough, 0., 1.), np.clip(b, 0., 1.)], -1)
    return (save_image('v3-%s-color' % tag, rgb, 'sRGB'), save_image('v3-%s-normal' % tag, nrm, 'Non-Color'),
            save_image('v3-%s-orm' % tag, orm, 'Non-Color'))


atlas_images = {}


def to_img(values, mask):
    out = np.zeros(SIZE * SIZE)
    out[mask] = values
    return out.reshape(SIZE, SIZE)

# ---- glove atlas: heather knit shell with side seams, flex ribs, joint creases and wrist wrinkles; ribbed cuff.
P, N, cover = bakes['glove']
Pc, Nc, cover_c = bakes['cuff']
cuff_only = cover_c
P = np.where(cuff_only[..., None], Pc, P)
N = np.where(cuff_only[..., None], Nc, N)
cover_all = cover | cover_c
ds = texel_size(P, cover_all)
flat = cover_all.ravel()
Pf = P.reshape(-1, 3)
info = classify(Pf[flat])
th, s, rad, dig, seg = info['theta'], info['s'], info['radius'], info['digit'], info['seg']
dorsal = np.cos(th)
back = smoothstep(.2, .55, dorsal)
is_finger = dig < 4
is_thumb = dig == 4
h = np.zeros(flat.sum())
# side seams on the fingers and the thumb phalanges (the thumb metacarpal lies in the back of the hand: no seam)
arc_side = (np.abs(th) - math.radians(78)) * rad            # mm from the side seam, + toward the palm
seam_zone = is_finger | (is_thumb & (seg >= 1))
h += seam_zone * (-.36 * np.exp(-np.square(arc_side / .32)) + .18 * np.exp(-np.square((np.abs(arc_side) - 1.05) / .55)))
t_line, t_holes = stitch_row(s, -arc_side, 1.9)
h += seam_zone * (.05 * t_line - .1 * t_holes)
thr = seam_zone * t_line
# accordion flex ribs over the finger PIP and the thumb IP
flex = np.zeros_like(s)
for d_i, digit in enumerate(FINGERS):
    flex = np.where(dig == d_i, JOINTS[digit][1], flex)
flex = np.where(is_thumb, JOINTS['thumb'][2], flex)
width = np.where(is_thumb, 4.4, 5.2)
band = np.exp(-np.power(np.abs(s - flex) / width, 4)) * (is_finger | is_thumb)
rib = (.5 + .5 * np.cos(2 * np.pi * (s - flex + .25 * np.sin(th * 3.)) / 1.95)) ** 1.6
h += back * band * (.44 * rib - .12)
h -= .18 * back * (is_finger | is_thumb) * np.exp(-np.square((np.abs(s - flex) - width - .4) / .35))
# irregular compression creases at the DIP, the finger bases and the thumb MCP
dip = np.zeros_like(s)
for d_i, digit in enumerate(FINGERS):
    dip = np.where(dig == d_i, JOINTS[digit][2], dip)
warp = .9 * fbm3(Pf[flat, 0] * 180, Pf[flat, 1] * 180, Pf[flat, 2] * 180, 5)
crease_phase = lambda x: 1 - np.abs(np.sin(np.pi * x))
amp = .5 + .5 * fbm3(s / 6., th * 2.2, dig, 9)
dipband = np.exp(-np.square((s - dip) / 3.6)) * is_finger
baseband = np.exp(-np.square((s - 3.) / 4.5)) * is_finger
thumb_mcp = np.exp(-np.square((s - JOINTS['thumb'][1]) / 4.)) * is_thumb
creases = crease_phase((s + warp * 1.6) / 2.3) ** 6
h -= (dipband + baseband * .8 + thumb_mcp) * back * amp * .24 * creases
folds_lo = (dipband + baseband + thumb_mcp) * back * amp * creases
# the glove bunches just beyond the cuff that cinches it
sa, tha, ra = arm_coords(Pf[flat])
wrist_env = smoothstep(cuff_s0 - 24., cuff_s0 - 3., sa) * (1 - smoothstep(cuff_s0 - 1., cuff_s0 + 1., sa))
wrist_warp = 2.2 * periodic_noise(tha, sa / 11., 17, 1.6)
wrist = crease_phase((sa + wrist_warp) / 4.8) ** 5 * (.6 + .4 * periodic_noise(tha, sa / 20., 18, 2.5))
h -= .3 * wrist_env * wrist
folds_lo += wrist_env * wrist
# ribbed elastic cuff (its texels overwrite the hidden glove wrist)
cuff_flat = cuff_only.ravel()[flat]
rib_c = (.5 + .5 * np.cos(2 * np.pi * (tha * ra) / 2.4)) ** 1.2
h = np.where(cuff_flat, .42 * rib_c - .21 + .06 * fbm3(sa / 3., tha * 8., 0, 3), h)
thr = np.where(cuff_flat, 0., thr)
height = fill(to_img(h, flat), cover_all)
thread = to_img(thr, flat)
fold_dirt = to_img(np.where(cuff_flat, 0., folds_lo), flat)
n_sculpt = height_normal(height * .001, ds)
knit_n, knit_var, knit_rough = scan_detail('jersey_melange', cover_all, ds, 1.35)
rib_n, _, cuff_rough = scan_detail('jersey_melange', cover_all, ds, .8)
detail_n = np.where(cuff_only[..., None], rib_n, knit_n)
normal = blend_normals(n_sculpt, detail_n, .8)
cav = cavity_of(height, cover_all, 3.)
vex = convexity_of(height, cover_all, 3.)
macro = to_img(fbm3(Pf[flat, 0] * 40, Pf[flat, 1] * 40, Pf[flat, 2] * 40, 21), flat)
dust_n = to_img(fbm3(Pf[flat, 0] * 260, Pf[flat, 1] * 260, Pf[flat, 2] * 260, 33, 3), flat)
heather = np.clip(1 + .42 * (knit_var - 1), .75, 1.28)
col = np.where(cuff_only[..., None], linear([58, 57, 56]), linear([52, 51, 50])) * heather[..., None]
col = col * (1 + .05 * macro)[..., None]
col = col * (1 + .5 * np.clip(vex * 3., 0, 1))[..., None]                       # pilling/abrasion on raised knit
col = col * (1 - .4 * np.clip(cav * 2.6, 0, 1))[..., None]
col = col + (linear([82, 79, 74]) - col) * np.clip(thread, 0, 1)[..., None] * .6      # tone-on-tone thread
ao_g = np.where(cuff_only, ao['cuff'], ao['glove'])
dust = np.clip((1 - ao_g) * .6 + cav * 1.4 + fold_dirt * .35, 0, 1) * smoothstep(-.2, .6, dust_n)
col = col + (linear([120, 110, 94]) - col) * (dust * .3)[..., None]
rough = np.where(cuff_only, .84 + .08 * (cuff_rough - .5), .74 + .1 * (knit_rough - knit_rough.mean()))
rough = rough - .08 * np.clip(vex * 3, 0, 1) + .1 * dust + .05 * np.clip(thread, 0, 1)
occl = np.clip(ao_g, 0, 1) * (1 - .55 * np.clip(cav * 1.8, 0, 1))
occl = fill(np.where(cover_all, occl, 1.), cover_all)
atlas_images['glove'] = finish('glove', fill(col, cover_all), fill(rough, cover_all), normalize(fill(normal, cover_all)), occl, contact)
report['glove'] = {'coverage': round(float(cover_all.mean()), 3), 'texelMm': round(float(np.median(ds[cover_all]) * 1000), 4)}
log('glove atlas')

# ---- trim atlas
P, N, cover = bakes['trim']
ids = trim_ids
ds = texel_size(P, cover)
flat = cover.ravel()
Pf = P.reshape(-1, 3)
idf = ids.ravel()[flat]
info = classify(Pf[flat])
th, s, rad, dig, seg = info['theta'], info['s'], info['radius'], info['digit'], info['seg']
Nf = N.reshape(-1, 3)[flat]
palmar = -np.einsum('ij,ij->i', Nf, info['D'])
k_of = {n: i for i, n in enumerate(TRIM_ATLAS)}
is_overlay = idf == k_of['Palm heel suede overlay']
is_dorsal = idf == k_of['Dorsal reinforcement']
is_strap = idf == k_of['Raised tan wrist closure']
is_tab = idf == k_of['Raised tan closure pull tab']
h = np.zeros(flat.sum())
grip = np.zeros(flat.sum())
wear = np.zeros(flat.sum())
ink = np.zeros(flat.sum())
thread = np.zeros(flat.sum())
pad = np.zeros(flat.sum())
# finger and thumb flexion creases on the palm side
joint_s = np.zeros((len(s), 3))
for d_i, digit in enumerate(DIGITS):
    joint_s[dig == d_i] = JOINTS[digit]
creases = np.zeros(len(s))
for j in range(3):
    dj = s - joint_s[:, j]
    creases += np.exp(-np.square(dj / .45)) + .45 * np.exp(-np.square((np.abs(dj) - 1.6) / .35))
palm_side = smoothstep(.25, .6, palmar)
h += is_overlay * (dig < 5) * palm_side * (-.32 * np.clip(creases, 0, 1.4))
# palm: the surface the idle view shows. An inset, stitched reinforcement pad with a silicone hex print, the palm's
# flexion creases, a burnished heel and grime in the creases.
thumb_sign = 1. if (bone('L_thumb.01')[0] - HAND_A) @ HAND_X > 0 else -1.
pa = (Pf[flat] - HAND_A) @ HAND_Y * 1000
pc = (Pf[flat] - HAND_A) @ HAND_X * 1000 * thumb_sign
palm_face = -(Nf @ HAND_D)
mcp = np.array([(s_['a'] - HAND_A) @ np.array([HAND_Y, HAND_X * thumb_sign]).T * 1000 for s_ in SEGMENTS
                if s_['digit'] < 4 and s_['seg'] == 0])
order = np.argsort(mcp[:, 1])
mcp_line = np.interp(pc, mcp[order, 1], mcp[order, 0])
palm_sel = is_overlay & (palm_face > .35) & (pa < mcp_line - 3.) & ~((dig == 4) & (seg >= 1))
a_lo, a_hi = np.percentile(pa[palm_sel], [1, 99])
c_lo, c_hi = np.percentile(pc[palm_sel], [1, 99])
step = .5
ga = np.arange(a_lo - 12, a_hi + 12, step)
gc = np.arange(c_lo - 12, c_hi + 12, step)
grid = np.zeros((len(ga), len(gc)))
ia = np.clip(((pa[palm_sel] - ga[0]) / step).astype(int), 0, len(ga) - 1)
ic = np.clip(((pc[palm_sel] - gc[0]) / step).astype(int), 0, len(gc) - 1)
np.add.at(grid, (ia, ic), 1.)
pow2 = 1 << int(math.ceil(math.log2(max(grid.shape))))
padded = np.zeros((pow2, pow2))
padded[:grid.shape[0], :grid.shape[1]] = grid
closed = (gblur((padded > 0).astype(float), 1.5 / step) > .15).astype(float)
field = gblur(closed, 3.5 / step)[:grid.shape[0], :grid.shape[1]]
fa, fc = np.gradient(field, step)
fgrad = np.hypot(fa, fc)


def grid_sample(g, a, c):
    x = np.clip((a - ga[0]) / step, 0, len(ga) - 1.001)
    y = np.clip((c - gc[0]) / step, 0, len(gc) - 1.001)
    x0, y0 = x.astype(int), y.astype(int)
    fx, fy = x - x0, y - y0
    return (g[x0, y0] * (1 - fx) * (1 - fy) + g[x0 + 1, y0] * fx * (1 - fy) + g[x0, y0 + 1] * (1 - fx) * fy +
            g[x0 + 1, y0 + 1] * fx * fy)


PAD_LEVEL = .93
pad_d = (grid_sample(field, pa, pc) - PAD_LEVEL) / np.maximum(grid_sample(fgrad, pa, pc), 1e-3)   # mm inside the pad edge
on_palm = is_overlay & (palm_face > .2)
pad_d = np.where(on_palm, np.clip(pad_d, -6., 12.), -6.)
pad = smoothstep(-.25, .25, pad_d)
h += .42 * smoothstep(-.1, 1.1, pad_d) - .14 * np.exp(-np.square(pad_d / .3))       # second layer, rolled edge
centre_a, centre_c = np.median(pa[palm_sel]), np.median(pc[palm_sel])
perimeter = np.arctan2(pc - centre_c, pa - centre_a) * .5 * ((a_hi - a_lo) + (c_hi - c_lo)) / 2
for row_at in (1.5, 2.9):
    line, holes = stitch_row(perimeter, pad_d, row_at, pitch=2.6)
    h += on_palm * (.05 * line - .09 * holes)
    thread += on_palm * line
u = (pa - a_lo) / (a_hi - a_lo)
v = (pc - c_lo) / (c_hi - c_lo)


def polyline_distance(points_uv, a, c):
    pts = np.array([(a_lo + pu * (a_hi - a_lo), c_lo + pv * (c_hi - c_lo)) for pu, pv in points_uv])
    best = np.full(len(a), np.inf)
    for p0, p1 in zip(pts[:-1], pts[1:]):
        e = p1 - p0
        t = np.clip(((a - p0[0]) * e[0] + (c - p0[1]) * e[1]) / (e @ e), 0, 1)
        best = np.minimum(best, np.hypot(a - (p0[0] + t * e[0]), c - (p0[1] + t * e[1])))
    return best


palm_lines = [([(.80, 0.), (.84, .45), (.93, .64)], 1.),                       # distal transverse
              ([(.84, .99), (.74, .62), (.66, .28), (.6, .04)], .9),           # proximal transverse
              ([(.82, .95), (.6, .66), (.38, .61), (.14, .68), (-.02, .78)], 1.1)]  # thenar
palm_crease = np.zeros(len(pa))
for pts, depth in palm_lines:
    wobble = .35 * fbm3(pa / 7., pc / 7., depth * 10, 111, 2)
    dd = polyline_distance(pts, pa, pc) + wobble
    palm_crease += depth * (np.exp(-np.square(dd / .5)) + .3 * np.exp(-np.square((dd - 1.4) / .35)))
wrinkle = (1 - np.abs(fbm3(pa / 4.5, pc / 4.5, 3., 113, 3))) ** 7
palm_zone = on_palm * smoothstep(-8., -2., pad_d + 6. * (pa < mcp_line - 1))
h -= palm_zone * (.36 * np.clip(palm_crease, 0, 1.3) + .1 * wrinkle)
# silicone hex print inside the pad, and on the finger and thumb tips
row = np.round(pa / (3.1 * .866))
off = np.where(np.mod(row, 2) == 1, 1.55, 0.)
dot_d = np.hypot(pa - row * 3.1 * .866, pc - (np.round((pc - off) / 3.1) * 3.1 + off))
print_zone = smoothstep(3.6, 4.4, pad_d) * on_palm
palm_dots = (1 - smoothstep(.62, .76, dot_d)) * print_zone
tip = (dig < 5) * smoothstep(joint_s[:, 2] + 1., joint_s[:, 2] + 5., s)
row_t = np.round(s / (2.45 * .866))
off_t = np.where(np.mod(row_t, 2) == 1, 1.225, 0.)
lat_y = th * rad
tip_d = np.hypot(s - row_t * 2.45 * .866, lat_y - (np.round((lat_y - off_t) / 2.45) * 2.45 + off_t))
zone = tip * smoothstep(.45, .75, palmar)
tip_dots = (1 - smoothstep(.62 * zone - .07, .62 * zone + .07, tip_d)) * is_overlay * (zone > .15)
grip = np.clip(palm_dots + tip_dots, 0, 1)
h += .16 * grip
heel = smoothstep(.42, .05, u) * on_palm
thenar = np.exp(-np.square((u - .38) / .22) - np.square((v - .82) / .22)) * on_palm
contact_zone = np.clip(tip * smoothstep(.5, .9, palmar) + heel + .7 * thenar, 0, 1)
contact_zone = contact_zone * (.5 + .5 * fbm3(Pf[flat, 0] * 300, Pf[flat, 1] * 300, Pf[flat, 2] * 300, 41, 3))
wear += is_overlay * np.clip(contact_zone, 0, 1)
# dorsal panel: black cordura, three quilted channels with double stitching, a rolled and stitched perimeter,
# and a printed claw mark
dob = obj('Dorsal reinforcement')
dco, _, _ = rest_arrays(dob, 'L')
bm = bmesh.new()
bm.from_mesh(dob.data)
edge_pts, edge_len = [], []
run = 0.
for e in bm.edges:
    if not e.is_boundary:
        continue
    a, b = dco[e.verts[0].index], dco[e.verts[1].index]
    n = max(1, int(np.linalg.norm(b - a) / .0003))
    for k in range(n):
        edge_pts.append(a + (b - a) * (k / n))
        edge_len.append(run + np.linalg.norm(b - a) * 1000 * k / n)
    run += np.linalg.norm(b - a) * 1000
bm.free()
ekd = KDTree(len(edge_pts))
for i, p in enumerate(edge_pts):
    ekd.insert(Vector(p), i)
ekd.balance()
d_edge = np.full(len(pa), 50.)
edge_arc = np.zeros(len(pa))
P_trim = Pf[flat]
for i in np.nonzero(is_dorsal)[0]:
    _, k, dist = ekd.find(P_trim[i])
    d_edge[i] = dist * 1000
    edge_arc[i] = edge_len[k]
along_all = (dco - HAND_A) @ HAND_Y * 1000
across_all = (dco - HAND_A) @ HAND_X * 1000
x0 = .5 * (across_all.min() + across_all.max())
y_wrist = along_all.min()
along = (Pf[flat] - HAND_A) @ HAND_Y * 1000
across = (Pf[flat] - HAND_A) @ HAND_X * 1000 - x0
lines = np.array([-11.5, 0., 11.5])
dl = np.min(np.abs(across[:, None] - lines[None, :]), 1)
puff = np.sin(np.clip(dl / 11.5, 0, 1) * np.pi) ** .6
roll = smoothstep(0., 2.4, d_edge)
h += is_dorsal * (roll * (1.0 * puff - .45 * np.exp(-np.square(dl / .42))) - .55 * (1 - roll))
for off_row in (-1.25, 1.25):
    q_line, q_holes = stitch_row(along, dl * np.sign(off_row), abs(off_row))
    h += is_dorsal * roll * (.04 * q_line - .08 * q_holes)
    thread += is_dorsal * roll * q_line * .8
for row_at in (2.7, 4.0):
    p_line, p_holes = stitch_row(edge_arc, d_edge, row_at)
    h += is_dorsal * (.04 * p_line - .08 * p_holes)
    thread += is_dorsal * p_line
mark = claw_mark(across, along - (y_wrist + 21.), 17.)
crack = smoothstep(-.35, .15, fbm3(Pf[flat, 0] * 900, Pf[flat, 1] * 900, Pf[flat, 2] * 900, 51, 3))
ink += is_dorsal * mark * crack * roll
h += is_dorsal * mark * .08
# pull tab: moulded coyote TPR with a raised rim and a large embossed claw mark on its outer face
tco, tno, _ = rest_arrays(obj('Raised tan closure pull tab'), 'L')
tc = tco.mean(0)
_, _, vt = np.linalg.svd(tco - tc)
tab_x, tab_y, tab_z = vt[0], vt[1], vt[2]
away = tc - (FA_A + FA_Y * ((tc - FA_A) @ FA_Y))           # the tab's outer face points away from the wrist axis
if away @ tab_z < 0:
    tab_z = -tab_z
hx = np.abs((tco - tc) @ tab_x).max() * 1000
hy = np.abs((tco - tc) @ tab_y).max() * 1000
tx = (Pf[flat] - tc) @ tab_x * 1000
ty = (Pf[flat] - tc) @ tab_y * 1000
outer = smoothstep(.45, .8, Nf @ tab_z)
qx, qy = np.abs(tx) - (hx - 1.6), np.abs(ty) - (hy - 1.6)
inside_e = -(np.minimum(np.maximum(qx, qy), 0) + np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) - 1.6)
rim = np.exp(-np.square((inside_e - 1.) / .38))
emb = claw_mark(ty, tx, 1.45 * min(hx, hy)) * outer
h += is_tab * outer * (.35 * rim - .42 * emb)
ink += is_tab * emb * .8
# closure strap: hook-and-loop, a loop-pile face (from the knit scan below)
height = fill(to_img(h, flat), cover)
n_sculpt = height_normal(height * .001, ds)
is_g = np.isin(ids, [k_of[n] for n in GUARDS])
n_sculpt = np.where(is_g[..., None], blend_normals(guard_normal, n_sculpt, 1.), n_sculpt)
suede_n, suede_var, suede_rough = scan_detail('scuba_suede', cover, ds, 1.)
cordura_n, cordura_var, cordura_rough = scan_detail('bi_stretch', cover, ds, 3.)
jersey_n, jersey_var, jersey_rough = scan_detail('jersey_melange', cover, ds, .75)
loop_n, loop_var, _ = scan_detail('jersey_melange', cover, ds, .5)
stipple = to_img(fbm3(Pf[flat, 0] * 2600, Pf[flat, 1] * 2600, Pf[flat, 2] * 2600, 61, 2), flat)
stipple_n = height_normal(stipple * 2.2e-5, ds)


def per_id(values, default):
    out = np.zeros((SIZE, SIZE) + np.shape(default))
    out[...] = default
    for key, val in values.items():
        sel = np.isin(ids, key if isinstance(key, tuple) else (key,))
        out[sel] = val[sel] if np.ndim(val) >= 2 else val
    return out


G = tuple(k_of[n] for n in GUARDS)
B = (k_of['Palm overlay rolled seam'], k_of['Rolled cuff edge'], k_of['Rolled cuff edge.001'])
SUEDE, DORSAL, STRAP, TAB = (k_of['Palm heel suede overlay'], k_of['Dorsal reinforcement'], k_of['Raised tan wrist closure'],
                             k_of['Raised tan closure pull tab'])
detail = per_id({SUEDE: suede_n, DORSAL: cordura_n, B: jersey_n, STRAP: loop_n, TAB: stipple_n, G: stipple_n}, np.array([0., 0., 1.]))
strength = per_id({SUEDE: 1., DORSAL: 1., B: .8, STRAP: 1.5, TAB: .6, G: .8}, 1.)
normal = normalize(np.concatenate([n_sculpt[..., :2] + detail[..., :2] * strength[..., None],
                                   (n_sculpt[..., 2] * detail[..., 2])[..., None]], -1))
grip_i, wear_i, ink_i, thread_i, pad_i = (to_img(a, flat) for a in (grip, wear, ink, thread, pad))
crease_i = to_img(palm_zone * np.clip(palm_crease, 0, 1.3) + is_overlay * (dig < 5) * palm_side * np.clip(creases, 0, 1), flat)
rim_i = to_img(is_tab * outer * (rim + emb), flat)
cav = cavity_of(height, cover, 3.)
vex = convexity_of(height, cover, 3.)
curv = np.where(is_g, np.clip((guard_point - .5) * 7., -1, 1), 0.)
edge = np.clip(curv, 0, 1)
macro = to_img(fbm3(Pf[flat, 0] * 40, Pf[flat, 1] * 40, Pf[flat, 2] * 40, 71), flat)
mottle = to_img(fbm3(Pf[flat, 0] * 110, Pf[flat, 1] * 110, Pf[flat, 2] * 110, 72, 3), flat)
dust_n = to_img(fbm3(Pf[flat, 0] * 260, Pf[flat, 1] * 260, Pf[flat, 2] * 260, 73, 3), flat)
base = per_id({SUEDE: linear([102, 87, 68]), DORSAL: linear([35, 35, 36]), B: linear([31, 31, 33]),
               STRAP: linear([36, 36, 37]), TAB: linear([104, 88, 68]), G: linear([30, 30, 32])}, linear([60, 60, 60]))
var = per_id({SUEDE: suede_var, DORSAL: cordura_var, B: jersey_var, STRAP: loop_var}, 1.)
col = base * (1 + .45 * (var - 1))[..., None] * (1 + .06 * macro + .04 * mottle)[..., None]
col = col + (linear([84, 70, 54]) - col) * pad_i[..., None] * .8                                     # darker pad layer
col = col + (linear([140, 124, 102]) - col) * (wear_i * .4)[..., None] * (1 - grip_i)[..., None]   # burnished suede
col = col + (linear([68, 58, 45]) - col) * grip_i[..., None]                                        # silicone print
col = col * (1 - .28 * np.clip(crease_i, 0, 1))[..., None]                                          # creases hold grime
col = col + (per_id({TAB: linear([62, 50, 38])}, linear([98, 96, 92])) - col) * np.clip(ink_i, 0, 1)[..., None]   # claw print / debossed fill
col = col + (linear([66, 61, 54]) - col) * np.clip(thread_i, 0, 1)[..., None] * .7                  # tonal thread
col = col + (linear([128, 110, 86]) - col) * (np.clip(vex * 2.5, 0, 1) * rim_i * .6)[..., None]     # worn tab relief
col = col + (linear([74, 74, 76]) - col) * (edge * .7)[..., None]                                   # scuffed TPR edges
col = col * (1 - .38 * np.clip(cav * 2.4, 0, 1))[..., None]
dust = np.clip((1 - ao['trim']) * .6 + cav * 1.3 + crease_i * .4, 0, 1) * smoothstep(-.2, .6, dust_n)
col = col + (linear([122, 110, 92]) - col) * (dust * .3)[..., None]
rough = per_id({SUEDE: .86 + .1 * (suede_rough - .5), DORSAL: .82 + .1 * (cordura_rough - .5), B: .76 + .08 * (jersey_rough - .5),
                STRAP: .93, TAB: .55, G: .34 + .05 * to_img(fbm3(Pf[flat, 0] * 500, Pf[flat, 1] * 500, Pf[flat, 2] * 500, 81, 2), flat)}, .8)
rough = (rough - .08 * pad_i - .16 * wear_i * (1 - grip_i) - .5 * grip_i + .25 * edge + .1 * dust
         - .2 * np.clip(ink_i, 0, 1) - .1 * rim_i * np.clip(vex * 3, 0, 1))
occl = np.clip(ao['trim'], 0, 1) * (1 - .5 * np.clip(cav * 1.8, 0, 1))
occl = fill(np.where(cover, occl, 1.), cover)
atlas_images['trim'] = finish('trim', fill(col, cover), fill(np.clip(rough, .2, 1.), cover), normalize(fill(normal, cover)), occl)
report['trim'] = {'coverage': round(float(cover.mean()), 3), 'texelMm': round(float(np.median(ds[cover]) * 1000), 4)}
report['palmPad'] = {'alongMm': [round(float(a_lo), 1), round(float(a_hi), 1)], 'acrossMm': [round(float(c_lo), 1), round(float(c_hi), 1)],
                     'texels': int((pad > .5).sum())}
log('trim atlas')

# ---- sleeve atlas: olive ripstop with compression folds at the cuff, drape folds, fading and dust
P, N, cover = bakes['sleeve']
ds = texel_size(P, cover)
flat = cover.ravel()
Pf = P.reshape(-1, 3)
sa, tha, ra = arm_coords(Pf[flat])
sig = sa - cuff_s
_, phase, env = sleeve_geo_folds(sig, tha)
wrapped = np.mod(phase - np.pi, 2 * np.pi) - np.pi
h = -.55 * env * np.exp(-np.square(wrapped / .4))                       # sharp crease in each fold valley
h -= .2 * env * np.exp(-np.square((np.abs(wrapped) - 1.) / .3))        # secondary pleat either side
arc = tha * ra
xi = sig * math.cos(math.radians(24)) + arc * math.sin(math.radians(24))
drape = (1 - np.abs(2 * np.mod(xi / 31. + .45 * fbm3(sig / 60., np.cos(tha), np.sin(tha), 91), 1.) - 1)) ** 3
h += .8 * drape * smoothstep(18., 45., sig) * (1 - smoothstep(170., 260., sig)) * (.6 + .4 * periodic_noise(tha, sig / 50., 92))
h += .18 * fbm3(sig / 9., np.cos(tha) * 3, np.sin(tha) * 3, 93, 3)
uu = U.ravel()[flat] / SLEEVE_SCALE * 1000
vv = V.ravel()[flat] / SLEEVE_SCALE * 1000
gx = np.abs(np.mod(uu, 5.) - 2.5)
gy = np.abs(np.mod(vv, 5.) - 2.5)
grid_line = np.maximum(np.exp(-np.square((2.5 - gx) / .38)), np.exp(-np.square((2.5 - gy) / .38)))
h += .08 * grid_line
height = fill(to_img(h, flat), cover)
n_sculpt = height_normal(height * .001, ds)
weave_n, weave_var, weave_rough = scan_detail('bi_stretch', cover, ds, 1.2)
normal = blend_normals(n_sculpt, weave_n, .7)
cav = cavity_of(height, cover, 4.)
vex = convexity_of(height, cover, 4.)
macro = to_img(fbm3(Pf[flat, 0] * 18, Pf[flat, 1] * 18, Pf[flat, 2] * 18, 101), flat)
mottle = to_img(fbm3(Pf[flat, 0] * 90, Pf[flat, 1] * 90, Pf[flat, 2] * 90, 103, 3), flat)
top = to_img(np.cos(tha), flat)
near_cuff = to_img(np.exp(-np.maximum(sig, 0) / 60.), flat)
col = linear([82, 80, 58]) * (1 + .4 * (weave_var - 1))[..., None] * (1 + .09 * macro + .05 * mottle)[..., None]
col = col * (1 - .1 * fill(to_img(grid_line, flat), cover))[..., None]
fade = np.clip(vex * 2.2, 0, 1) * .6 + smoothstep(.2, 1., top) * .3
col = col + (linear([118, 114, 90]) - col) * (fade * .38)[..., None]
col = col * (1 - .45 * np.clip(cav * 2.2, 0, 1))[..., None]
dust = np.clip(near_cuff * .5 + (1 - ao['sleeve']) * .5 + cav * .8, 0, 1) * smoothstep(
    -.3, .6, to_img(fbm3(Pf[flat, 0] * 200, Pf[flat, 1] * 200, Pf[flat, 2] * 200, 105, 3), flat))
col = col + (linear([138, 126, 104]) - col) * (dust * .32)[..., None]
rough = .8 + .1 * (weave_rough - weave_rough.mean()) - .06 * np.clip(vex * 2, 0, 1) + .08 * dust
occl = fill(np.where(cover, np.clip(ao['sleeve'], 0, 1) * (1 - .55 * np.clip(cav * 1.6, 0, 1)), 1.), cover)
atlas_images['sleeve'] = finish('sleeve', fill(col, cover), fill(rough, cover), normalize(fill(normal, cover)), occl)
report['sleeve'] = {'coverage': round(float(cover.mean()), 3), 'texelMm': round(float(np.median(ds[cover]) * 1000), 4)}
log('sleeve atlas')

# ---------------------------------------------------------------- 6. materials


def gltf_output_group():
    group = bpy.data.node_groups.get('glTF Material Output')
    if group is None:
        group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        group.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    return group


def build_material(mat, images, uv, sheen, metallic_is_contact=False):
    color, normal_img, orm = images
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs['Surface'])
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = uv

    def tex(image):
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = image
        node.interpolation = 'Linear'
        nt.links.new(uvn.outputs[0], node.inputs[0])
        return node
    c, n, o = tex(color), tex(normal_img), tex(orm)
    nt.links.new(c.outputs['Color'], bsdf.inputs['Base Color'])
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.uv_map = uv
    nt.links.new(n.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs[0], bsdf.inputs['Normal'])
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(o.outputs['Color'], sep.inputs[0])
    nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    zero = nt.nodes.new('ShaderNodeMath')      # blue carries data (contact occlusion); metallicFactor exports as 0
    zero.operation = 'MULTIPLY'
    zero.inputs[1].default_value = 0.
    nt.links.new(sep.outputs['Blue'], zero.inputs[0])
    nt.links.new(zero.outputs[0], bsdf.inputs['Metallic'])
    group = nt.nodes.new('ShaderNodeGroup')
    group.node_tree = gltf_output_group()
    nt.links.new(sep.outputs['Red'], group.inputs['Occlusion'])
    weight, tint, roughness = sheen
    bsdf.inputs['Sheen Weight'].default_value = weight
    bsdf.inputs['Sheen Tint'].default_value = (*tint, 1.)
    bsdf.inputs['Sheen Roughness'].default_value = roughness
    return mat


GLOVE_SHEEN = (1., (.13, .128, .124), .5)
build_material(bpy.data.materials['Urban Breacher glove'], atlas_images['glove'], 'UVMap', GLOVE_SHEEN, True)
build_material(bpy.data.materials['Right Urban Breacher glove'], atlas_images['glove'], 'UVMap', GLOVE_SHEEN)
build_material(bpy.data.materials['Graphite suede reinforcement'], atlas_images['trim'], 'BakeUV', (1., (.1, .09, .075), .6))
build_material(bpy.data.materials['Navy rolled binding'], atlas_images['trim'], 'BakeUV', (1., (.1, .1, .1), .45))
build_material(bpy.data.materials['Saddle leather closure'], atlas_images['trim'], 'BakeUV', (1., (.1, .1, .1), .5))
build_material(guard_mat, atlas_images['trim'], 'BakeUV', (0., (0., 0., 0.), .5))
build_material(bpy.data.materials['Khaki ripstop sleeve'], atlas_images['sleeve'], 'BakeUV', (1., (.16, .16, .12), .55))
# Tonal thread: darker than the coyote suede, a shade above the black trims (was a pale flax that read as a pattern).
thread_mat = bpy.data.materials['Waxed flax stitching'].node_tree.nodes['Principled BSDF']
thread_mat.inputs['Base Color'].default_value = (*linear([64, 59, 52]), 1.)
thread_mat.inputs['Roughness'].default_value = .8
sleeve_thread = bpy.data.materials.new('Olive topstitch thread')
sleeve_thread.use_nodes = True
st = sleeve_thread.node_tree.nodes['Principled BSDF']
st.inputs['Base Color'].default_value = (*linear([62, 62, 45]), 1.)
st.inputs['Roughness'].default_value = .8
for side in ('L', 'R'):
    for name in ['Sleeve double topstitch', 'Sleeve double topstitch.001']:
        me = obj(name, side).data
        me.materials.clear()
        me.materials.append(sleeve_thread)
for side in ('L', 'R'):
    for name in TRIMS:
        ob = obj(name, side)
        if name == 'Palm heel suede overlay' or name == 'Dorsal reinforcement':
            ob.data.materials.clear()
            ob.data.materials.append(bpy.data.materials['Graphite suede reinforcement'])

# ---------------------------------------------------------------- clean up and save

for o, hide in saved_hide.items():
    o.hide_render = hide
for hob in GUARD_HIGH.values():
    me = hob.data
    bpy.data.objects.remove(hob)
    bpy.data.meshes.remove(me)
for arm in ARMS.values():
    arm.data.pose_position = 'POSE'
scene.render.engine = ENGINE
scene.frame_set(1)
arm_tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for arm in ARMS.values() for o in arm.children if o.type == 'MESH')
report['armTriangles'] = arm_tris
scene['glove_finish'] = True
scene['gloveFinishReport'] = json.dumps(report)
print('GLOVE_FINISH_REPORT ' + json.dumps(report), flush=True)
if args.out:
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(Path(args.out).resolve()))
