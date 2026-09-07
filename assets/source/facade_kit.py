"""Kit of parts for Bazaar section models. Compose; do not model from primitives.

    import sys; sys.path.insert(0, str(REPO / 'assets/source'))
    from facade_kit import Frame, Wall, box, export_section
    F = Frame(zone_rect)                          # rect from the construction sheet: {x, y, w, h} in plan metres
    n = Wall(F, (39.56, 81.0), (45.44, 81.0), faces='S')   # a wall whose street side faces south
    n.plinth(0.44, 'ph_sandstone_blocks_05'); n.coping(4.9, 'ph_stone_trim_sandstone')
    n.arch(along=2.94, width=1.1, height=2.4, mat='ph_sandstone_blocks_05', pointed=True)
    n.awning(along0=1.0, along1=4.0, z=2.9, depth=1.3, cloth='ph_hessian_230')
    export_section(F, OUT / 'link-north-east.glb')

Plan frame: coordinates are the plan's design metres (x east, y north), as listed in the construction sheet.
The Frame maps them to the GLB so the runtime mounts the section at the zone's south-west corner
with no rotation. Every part takes pack material ids (materials.json) through facade_materials.
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from facade_materials import assign, entry  # noqa: E402

BEVEL_M = 0.012
DIRS = {'N': (0, 1), 'S': (0, -1), 'E': (1, 0), 'W': (-1, 0)}
WEAR = {
    'dust': ((0.56, 0.43, 0.29), 0.20, 0.92),
    'damp': ((0.20, 0.26, 0.21), 0.16, 0.98),
    'polish': ((0.38, 0.30, 0.21), 0.14, 0.62),
    'dye': ((0.24, 0.42, 0.38), 0.17, 0.86),
    'spice': ((0.50, 0.20, 0.09), 0.18, 0.88),
    'bleach': ((0.86, 0.82, 0.68), 0.13, 0.78),
    'rut': ((0.28, 0.24, 0.19), 0.12, 0.96),
}


class Frame:
    """Plan (x east, y north, z up) -> Blender local (x, -y, z) relative to the zone's south-west corner."""

    def __init__(self, rect):
        self.x0, self.y0 = float(rect['x']), float(rect['y'])
        self.w, self.h = float(rect['w']), float(rect['h'])

    def p(self, x, y, z=0.0):
        return Vector((x - self.x0, -(y - self.y0), z))


def _bevel(obj, width=BEVEL_M):
    mod = obj.modifiers.new('bevel', 'BEVEL')
    mod.width, mod.segments, mod.limit_method = width, 1, 'ANGLE'


def box(F, center_xy, z0, size_xyz, mat, yaw=0.0, name='part', bevel=True):
    """Axis-aligned box in the plan frame: center (x, y), base z0, size (along x, along y, height); yaw in radians about Z."""
    sx, sy, sz = size_xyz
    bpy.ops.mesh.primitive_cube_add(size=1, location=F.p(center_xy[0], center_xy[1], z0 + sz / 2))
    ob = bpy.context.object
    ob.name = name
    ob.scale = (sx, sy, sz)
    ob.rotation_euler = (0, 0, -yaw)  # plan yaw is counter-clockwise from east; local y is flipped
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    if bevel:
        _bevel(ob)
    assign(ob, mat)
    return ob


def _box_beam(F, start, end, size, mat, name):
    """Square beam between two design-space endpoints, with its local Z along the span."""
    start, end = F.p(*start), F.p(*end)
    span = end - start
    bpy.ops.mesh.primitive_cube_add(size=1, location=(start + end) / 2)
    ob = bpy.context.object
    ob.name = name
    ob.scale = (size, size, span.length)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(span.normalized())
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    _bevel(ob)
    assign(ob, mat)
    return ob


class Wall:
    """One straight wall face. start/end in plan metres; `faces` is the compass side the street is on."""

    def __init__(self, F, start_xy, end_xy, faces):
        self.F = F
        self.a, self.b = Vector((*start_xy, 0)), Vector((*end_xy, 0))
        self.length = (self.b - self.a).length
        self.t = (self.b - self.a) / self.length           # along, plan frame
        nx, ny = DIRS[faces.upper()]
        self.n = Vector((nx, ny, 0))                       # outward, toward the street
        self.faces = faces.upper()
        self.yaw = math.atan2(self.t.y, self.t.x)
        self.openings = ()

    def at(self, along, out=0.0):
        """Plan (x, y) of a point `along` metres from start, pushed `out` metres toward the street."""
        p = self.a + self.t * along + self.n * out
        return (p.x, p.y)

    def slab(self, along0, along1, z0, height, depth, mat, out=0.0, name='slab'):
        """Box hugging the face between along0 and along1; depth protrudes toward the street from `out`."""
        mid = (along0 + along1) / 2
        return box(self.F, self.at(mid, out + depth / 2), z0, (along1 - along0, depth, height), mat, yaw=self.yaw, name=name, bevel=name != 'skin')

    def _solid_rectangles(self, along0, along1, z0, height):
        cuts_a, cuts_z = {along0, along1}, {z0, z0 + height}
        for along, width, sill, opening_height in self.openings:
            left, right, top = along - width / 2, along + width / 2, sill + opening_height
            if right <= along0 or left >= along1 or top <= z0 or sill >= z0 + height:
                continue
            cuts_a.update((max(along0, left), min(along1, right)))
            cuts_z.update((max(z0, sill), min(z0 + height, top)))
        rectangles = []
        for a0, a1 in zip(sorted(cuts_a), sorted(cuts_a)[1:]):
            for bottom, top in zip(sorted(cuts_z), sorted(cuts_z)[1:]):
                middle_a, middle_z = (a0 + a1) / 2, (bottom + top) / 2
                if any(abs(middle_a - along) < width / 2 and sill < middle_z < sill + opening_height
                       for along, width, sill, opening_height in self.openings):
                    continue
                rectangles.append((a0, a1, bottom, top))
        return rectangles

    def _segmented_slab(self, along0, along1, z0, height, depth, mat, out, name):
        rectangles = self._solid_rectangles(along0, along1, z0, height)
        if len(rectangles) == 1 and rectangles[0] == (along0, along1, z0, z0 + height):
            return self.slab(along0, along1, z0, height, depth, mat, out=out, name=name)
        return [self.slab(a0, a1, bottom, top - bottom, depth, mat, out=out, name=name)
                for a0, a1, bottom, top in rectangles]

    # Horizontal bands
    def plinth(self, height, mat, depth=0.14):
        return self._segmented_slab(0, self.length, 0, height, depth, mat, 0.0, 'plinth')

    def course(self, z, mat, height=0.12, depth=0.10):
        return self._segmented_slab(-0.02, self.length + 0.02, z - height / 2, height, depth, mat, 0.0, 'course')

    def coping(self, z_top, mat, height=0.16, depth=0.18):
        return self.slab(-0.05, self.length + 0.05, z_top - height, height, depth, mat, name='coping')

    def skin(self, height, mat, z0=0.0, depth=0.02, openings=()):
        """Thin wall skin; openings are (along, width, sill, height) rectangles cut from this mesh."""
        validated = []
        for along, width, sill, opening_height in openings:
            left, right = along - width / 2, along + width / 2
            top = sill + opening_height
            if left < 0 or right > self.length or sill < z0 or top > z0 + height:
                raise ValueError('skin opening falls outside the wall')
            validated.append((along, width, sill, opening_height))
        self.openings = tuple(validated)
        return self._segmented_slab(0, self.length, z0, height, depth, mat, 0.0, 'skin')

    def wear(self, along, z0, width, height, kind, out=0.025):
        """Subtle wall overlay using a centered along/z rectangle, pushed toward the street by `out`."""
        left, right = along - width / 2, along + width / 2
        return wear_patch(self.F, [
            (*self.at(left, out), z0),
            (*self.at(left, out), z0 + height),
            (*self.at(right, out), z0 + height),
            (*self.at(right, out), z0),
        ], kind)

    # Verticals
    def pilaster(self, along, height, mat, width=0.45, depth=0.16, z0=0.0):
        return self.slab(along - width / 2, along + width / 2, z0, height, depth, mat, name='pilaster')

    def corbels(self, z, mat, spacing=0.9, width=0.18, depth=0.22, height=0.2, margin=0.5):
        along = margin
        while along <= self.length - margin:
            self.slab(along - width / 2, along + width / 2, z, height, depth, mat, name='corbel')
            along += spacing

    # Openings (faked depth: dark back panel in front of the shell, frame protruding)
    def recess_back(self, along, width, height, z0, mat='ph_worn_plaster_ochre', out=0.012):
        return self.slab(along - width / 2, along + width / 2, z0, height, 0.005, mat, out=out, name='recess-back')

    def door(self, along, width, height, timber='ph_worn_planks', frame='ph_stone_trim_sandstone', frame_w=0.14, depth=0.12):
        self.recess_back(along, width, height, 0, timber, out=-0.05)
        for k in range(5):                                   # plank lines as shallow ribs
            x = along - width / 2 + width * (k + 0.5) / 5
            self.slab(x - 0.012, x + 0.012, 0.05, height - 0.1, 0.02, timber, out=-0.045, name='door-rib')
        self.slab(along - width / 2 - frame_w, along - width / 2, 0, height + frame_w, depth, frame, name='door-jamb')
        self.slab(along + width / 2, along + width / 2 + frame_w, 0, height + frame_w, depth, frame, name='door-jamb')
        self.slab(along - width / 2 - frame_w, along + width / 2 + frame_w, height, frame_w, depth + 0.04, frame, name='door-head')

    def window(self, along, sill, width, height, frame='ph_stone_trim_sandstone', shutter='ph_worn_planks', frame_w=0.1, depth=0.1, shutters=True):
        self.recess_back(along, width, height, sill, 'ph_worn_plaster_ochre', out=-0.135)
        self.slab(along - width / 2 - frame_w, along - width / 2, sill - frame_w, height + 2 * frame_w, depth, frame, name='jamb')
        self.slab(along + width / 2, along + width / 2 + frame_w, sill - frame_w, height + 2 * frame_w, depth, frame, name='jamb')
        self.slab(along - width / 2 - frame_w, along + width / 2 + frame_w, sill + height, frame_w, depth + 0.03, frame, name='head')
        self.slab(along - width / 2 - frame_w - 0.05, along + width / 2 + frame_w + 0.05, sill - frame_w - 0.06, 0.06, depth + 0.08, frame, name='sill')
        if shutters:
            leaf = width / 2 - 0.02
            self.slab(along - width / 2, along - width / 2 + leaf, sill + 0.02, height - 0.04, 0.03, shutter, out=0.06, name='shutter')
            self.slab(along + width / 2 - leaf, along + width / 2, sill + 0.02, height - 0.04, 0.03, shutter, out=0.06, name='shutter')

    def lattice(self, along, sill, width, height, mat='ph_worn_planks', pitch=0.12, bar=0.025, depth=0.04):
        self.recess_back(along, width, height, sill, 'ph_worn_plaster_ochre')
        x = along - width / 2 + pitch / 2
        while x < along + width / 2:
            self.slab(x - bar / 2, x + bar / 2, sill, height, depth, mat, out=0.05, name='lattice-v')
            x += pitch
        z = sill + pitch / 2
        while z < sill + height:
            self.slab(along - width / 2, along + width / 2, z - bar / 2, bar, depth, mat, out=0.05 + depth, name='lattice-h')
            z += pitch

    def arch(self, along, width, height, mat, pointed=True, depth=0.16, ring=0.18, back='ph_worn_plaster_ochre', spring=None):
        """Arched opening: `depth` is total recess depth; the back sits at -depth and the ring projects at most 0.18 m."""
        max_out = min(depth, 0.18)
        back_out = max_out - depth
        self.recess_back(along, width, height, 0, back, out=back_out)
        r = width / 2
        spring = height - r * (1.25 if pointed else 1.0) if spring is None else spring
        if not 0 < spring < height:
            raise ValueError('arch spring must be between ground and crown')
        rise = height - spring
        steps = 12
        def profile(radius, rise):
            if not pointed:
                return [(radius * math.cos(math.pi * i / steps), spring + rise * math.sin(math.pi * i / steps)) for i in range(steps + 1)]
            # Two quadratic shoulders meet at a real pointed crown, with vertical spring tangents.
            points = []
            for i in range(steps + 1):
                t = min(i, steps - i) / (steps / 2)
                side = 1 if i <= steps / 2 else -1
                points.append((side * radius * (1 - t * t), spring + rise * (1.5 * t - 0.5 * t * t)))
            return points
        inner, outer = profile(r, rise), profile(r + ring, rise + ring)
        # Ring in the wall's local plane: x along the wall, z up, y toward the street.
        bm = bmesh.new()
        inner_v = [bm.verts.new((x, 0, z)) for x, z in [(r, 0)] + inner + [(-r, 0)]]
        outer_v = [bm.verts.new((x, 0, z)) for x, z in [(r + ring, 0)] + outer + [(-(r + ring), 0)]]
        for i in range(len(inner_v) - 1):
            bm.faces.new((inner_v[i], inner_v[i + 1], outer_v[i + 1], outer_v[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        # Which local side is the street: plan cross(t, n) < 0 means +Y after the plan->Blender flip.
        street = 1.0 if (self.t.x * self.n.y - self.t.y * self.n.x) < 0 else -1.0
        bmesh.ops.translate(bm, verts=bm.verts[:], vec=(0, street * back_out, 0))
        geom = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
        bmesh.ops.translate(bm, verts=[g for g in geom['geom'] if isinstance(g, bmesh.types.BMVert)], vec=(0, street * depth, 0))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        mesh = bpy.data.meshes.new('arch')
        bm.to_mesh(mesh)
        bm.free()
        ob = bpy.data.objects.new('arch', mesh)
        bpy.context.collection.objects.link(ob)
        ob.location = self.F.p(*self.at(along, 0.0))
        ob.rotation_euler = (0, 0, -self.yaw)
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.transform_apply(rotation=True)
        assign(ob, mat)
        return ob

    def niche(self, along, width, height, z0, mat, depth=0.14, back='ph_worn_plaster_ochre'):
        self.recess_back(along, width, height, z0, back, out=-0.14)
        self.slab(along - width / 2 - 0.16, along - width / 2, z0, height + 0.16, depth, mat, name='niche-jamb')
        self.slab(along + width / 2, along + width / 2 + 0.16, z0, height + 0.16, depth, mat, name='niche-jamb')
        self.slab(along - width / 2 - 0.16, along + width / 2 + 0.16, z0 + height, 0.2, depth, mat, name='niche-head')

    # Attachments
    def awning(self, along0, along1, z, depth, cloth='ph_hessian_230', timber='ph_worn_planks', sag=0.12, drop=0.25):
        """Cloth on an 0.08 m ledger, two 0.08 m square slope-following arms, and two 0.35 m run/rise knees."""
        width = along1 - along0
        self.slab(along0, along1, z - 0.04, 0.08, 0.08, timber, name='ledger')
        for along in (along0, along1):
            arm_z = z - drop * 0.40 / depth - 0.04
            _box_beam(
                self.F,
                (*self.at(along, 0.0), z - 0.04),
                (*self.at(along, depth), z - drop - 0.04),
                0.08,
                timber,
                'awning-arm',
            )
            _box_beam(
                self.F,
                (*self.at(along, 0.05), arm_z - 0.35),
                (*self.at(along, 0.40), arm_z),
                0.08,
                timber,
                'awning-knee',
            )
        nx, ny = 24, 6
        bm = bmesh.new()
        grid = [[None] * (ny + 1) for _ in range(nx + 1)]
        for i in range(nx + 1):
            u = i / nx
            for j in range(ny + 1):
                v = j / ny
                px, py = self.at(along0 + u * width, v * depth)
                pz = z - v * drop - sag * math.sin(math.pi * u) * v
                grid[i][j] = bm.verts.new(self.F.p(px, py, pz))
        for i in range(nx):
            for j in range(ny):
                bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
        mesh = bpy.data.meshes.new('awning')
        bm.to_mesh(mesh)
        bm.free()
        ob = bpy.data.objects.new('awning', mesh)
        bpy.context.collection.objects.link(ob)
        mod = ob.modifiers.new('thickness', 'SOLIDIFY')
        mod.thickness = 0.015
        assign(ob, cloth)
        return ob

    def sign(self, along, z, width, height, mat='ph_worn_planks', depth=0.05):
        self.slab(along - width / 2, along + width / 2, z, height, depth, mat, out=0.12, name='sign')
        self.slab(along - 0.03, along + 0.03, z + height, 0.06, 0.18, mat, name='sign-bracket')

    def upper_room(self, along0, along1, z0, height, depth, mat, coping_mat='ph_stone_trim_sandstone', setback=0.0):
        """Rooftop volume behind the face line (negative out = into the building). Render-only silhouette."""
        room = self.slab(along0, along1, z0, height, depth, mat, out=-(depth + setback), name='upper-room')
        self.slab(along0 - 0.05, along1 + 0.05, z0 + height - 0.14, 0.14, depth + 0.1, coping_mat, out=-(depth + setback) - 0.05, name='upper-coping')
        return room


def wear_patch(F, corners, kind):
    """Create a subtle vertex-colored patch from four design-space corners: lower-left, upper-left, upper-right, lower-right as viewed from its visible side."""
    if kind not in WEAR:
        raise ValueError(f'unknown wear kind {kind!r}; use one of {", ".join(WEAR)}')
    if len(corners) != 4:
        raise ValueError('wear_patch needs exactly four corners')
    color, opacity, roughness = WEAR[kind]
    points = [F.p(*corner) for corner in corners]
    center = sum(points, Vector()) / 4
    cols, rows = 9, 5
    mesh = bpy.data.meshes.new(f'wear-{kind}')
    verts, faces = [], []
    for i in range(cols + 1):
        u = i / cols
        for j in range(rows + 1):
            v = j / rows
            point = (
                points[0] * (1 - u) * (1 - v)
                + points[1] * (1 - u) * v
                + points[2] * u * v
                + points[3] * u * (1 - v)
            )
            edge = min(u, 1 - u, v, 1 - v)
            feather = min(1.0, edge * 6)
            if edge == 0:
                phase = math.sin((i * 17 + j * 29 + len(kind) * 11) * 1.7)
                point += (center - point).normalized() * (0.012 + (phase + 1) * 0.009)
            verts.append(point)

    for i in range(cols):
        for j in range(rows):
            start = i * (rows + 1) + j
            faces.append((start, start + 1, start + rows + 2, start + rows + 1))
    mesh.from_pydata(verts, [], faces)
    mesh.color_attributes.new('COLOR_0', 'FLOAT_COLOR', 'POINT')
    colors = mesh.color_attributes['COLOR_0']
    for i in range(cols + 1):
        u = i / cols
        for j in range(rows + 1):
            v = j / rows
            feather = min(1.0, min(u, 1 - u, v, 1 - v) * 6)
            colors.data[i * (rows + 1) + j].color = (*color, opacity * feather)
    mat = bpy.data.materials.get(f'wear_{kind}')
    if mat is None:
        mat = bpy.data.materials.new(f'wear_{kind}')
        mat.use_nodes = True
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        bsdf = nodes.get('Principled BSDF')
        vertex_color = nodes.new('ShaderNodeVertexColor')
        vertex_color.layer_name = 'COLOR_0'
        links.new(vertex_color.outputs['Color'], bsdf.inputs['Base Color'])
        links.new(vertex_color.outputs['Alpha'], bsdf.inputs['Alpha'])
        bsdf.inputs['Roughness'].default_value = roughness
        mat.surface_render_method = 'DITHERED'
    mesh.materials.append(mat)
    ob = bpy.data.objects.new(f'wear-{kind}', mesh)
    bpy.context.collection.objects.link(ob)
    return ob


def _strip_pack_images():
    """Pack materials are rebound by name at runtime; leave imported material images intact."""
    for mat in bpy.data.materials:
        try:
            entry(mat.name)
        except KeyError:
            continue
        if mat.node_tree:
            for node in list(mat.node_tree.nodes):
                if node.type == 'TEX_IMAGE':
                    mat.node_tree.nodes.remove(node)


def export_section(F, path):
    """Apply static modifiers and join the section so the GLB emits one primitive per material."""
    meshes = [ob for ob in bpy.context.scene.objects if ob.type == 'MESH']
    for ob in meshes:
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        for modifier in list(ob.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        if ob.data.color_attributes.get('COLOR_0') is None:
            colors = ob.data.color_attributes.new('COLOR_0', 'FLOAT_COLOR', 'POINT')
            for color in colors.data:
                color.color = (1.0, 1.0, 1.0, 1.0)
    if len(meshes) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for ob in meshes:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.join()
        meshes = [bpy.context.object]
    _strip_pack_images()
    bpy.ops.object.select_all(action='SELECT')
    depsgraph = bpy.context.evaluated_depsgraph_get()
    tris = sum(sum(len(p.vertices) - 2 for p in ob.evaluated_get(depsgraph).data.polygons) for ob in bpy.context.scene.objects if ob.type == 'MESH')
    # Pack textures are rebound at runtime; imported asset textures remain embedded.
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_image_format='AUTO', export_vertex_color='ACTIVE')
    primitives = sum(len(ob.data.materials) for ob in meshes)
    print(f'section: {path} {Path(path).stat().st_size / 1e6:.1f} MB, ~{tris} triangles, {primitives} material primitives, zone {F.w:.1f} x {F.h:.1f} m')
    return tris
