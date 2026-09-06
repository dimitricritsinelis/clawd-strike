"""Kit of parts for Bazaar section models. Compose; do not model from primitives.

    import sys; sys.path.insert(0, str(REPO / 'assets/source'))
    from facade_kit import Frame, Wall, box, export_section
    F = Frame(zone_rect)                          # rect from the before shoot: {x, y, w, h} in plan metres
    n = Wall(F, (39.56, 81.0), (45.44, 81.0), faces='S')   # a wall whose street side faces south
    n.plinth(0.44, 'ph_sandstone_blocks_05'); n.coping(4.9, 'ph_stone_trim_sandstone')
    n.arch(along=2.94, width=1.1, height=2.4, mat='ph_sandstone_blocks_05', pointed=True)
    n.awning(along0=1.0, along1=4.0, z=2.9, depth=1.3, cloth='ph_fabric_pattern_07')
    export_section(F, OUT / 'link-north-east.glb')

Plan frame: coordinates are the plan's design metres (x east, y north), exactly what map:shoot prints.
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
from facade_materials import assign  # noqa: E402

BEVEL_M = 0.012
DIRS = {'N': (0, 1), 'S': (0, -1), 'E': (1, 0), 'W': (-1, 0)}


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

    def at(self, along, out=0.0):
        """Plan (x, y) of a point `along` metres from start, pushed `out` metres toward the street."""
        p = self.a + self.t * along + self.n * out
        return (p.x, p.y)

    def slab(self, along0, along1, z0, height, depth, mat, out=0.0, name='slab'):
        """Box hugging the face between along0 and along1; depth protrudes toward the street from `out`."""
        mid = (along0 + along1) / 2
        return box(self.F, self.at(mid, out + depth / 2), z0, (along1 - along0, depth, height), mat, yaw=self.yaw, name=name)

    # Horizontal bands
    def plinth(self, height, mat, depth=0.14):
        return self.slab(0, self.length, 0, height, depth, mat, name='plinth')

    def course(self, z, mat, height=0.12, depth=0.10):
        return self.slab(-0.02, self.length + 0.02, z - height / 2, height, depth, mat, name='course')

    def coping(self, z_top, mat, height=0.16, depth=0.18):
        return self.slab(-0.05, self.length + 0.05, z_top - height, height, depth, mat, name='coping')

    def skin(self, height, mat, z0=0.0, depth=0.02):
        """Thin plaster/stone skin over the kit shell so the section owns its own wall material."""
        return self.slab(0, self.length, z0, height, depth, mat, name='skin')

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
        self.recess_back(along, width, height, 0, timber, out=0.05)
        for k in range(5):                                   # plank lines as shallow ribs
            x = along - width / 2 + width * (k + 0.5) / 5
            self.slab(x - 0.012, x + 0.012, 0.05, height - 0.1, 0.02, frame, out=0.055, name='door-rib')
        self.slab(along - width / 2 - frame_w, along - width / 2, 0, height + frame_w, depth, frame, name='door-jamb')
        self.slab(along + width / 2, along + width / 2 + frame_w, 0, height + frame_w, depth, frame, name='door-jamb')
        self.slab(along - width / 2 - frame_w, along + width / 2 + frame_w, height, frame_w, depth + 0.04, frame, name='door-head')

    def window(self, along, sill, width, height, frame='ph_stone_trim_sandstone', shutter='ph_worn_planks', frame_w=0.1, depth=0.1, shutters=True):
        self.recess_back(along, width, height, sill, 'ph_worn_plaster_ochre')
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

    def arch(self, along, width, height, mat, pointed=True, depth=0.16, ring=0.18, back='ph_worn_plaster_ochre'):
        """Arched opening: dark back panel plus an extruded ring frame; height is to the crown."""
        self.recess_back(along, width, height, 0, back)
        r = width / 2
        rise = r * (1.25 if pointed else 1.0)
        spring = height - rise
        steps = 12
        inner = [(r * math.cos(math.pi * i / steps), spring + rise * math.sin(math.pi * i / steps)) for i in range(steps + 1)]
        outer = [((r + ring) * math.cos(math.pi * i / steps), spring + (rise + ring) * math.sin(math.pi * i / steps)) for i in range(steps + 1)]
        # Ring in the wall's local plane: x along the wall, z up, y toward the street.
        bm = bmesh.new()
        inner_v = [bm.verts.new((x, 0, z)) for x, z in [(r, 0)] + inner + [(-r, 0)]]
        outer_v = [bm.verts.new((x, 0, z)) for x, z in [(r + ring, 0)] + outer + [(-(r + ring), 0)]]
        for i in range(len(inner_v) - 1):
            bm.faces.new((inner_v[i], inner_v[i + 1], outer_v[i + 1], outer_v[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        # Which local side is the street: plan cross(t, n) < 0 means +Y after the plan->Blender flip.
        street = 1.0 if (self.t.x * self.n.y - self.t.y * self.n.x) < 0 else -1.0
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
        self.recess_back(along, width, height, z0, back)
        self.slab(along - width / 2 - 0.16, along - width / 2, z0, height + 0.16, depth, mat, name='niche-jamb')
        self.slab(along + width / 2, along + width / 2 + 0.16, z0, height + 0.16, depth, mat, name='niche-jamb')
        self.slab(along - width / 2 - 0.16, along + width / 2 + 0.16, z0 + height, 0.2, depth, mat, name='niche-head')

    # Attachments
    def awning(self, along0, along1, z, depth, cloth='ph_fabric_pattern_07', timber='ph_worn_planks', sag=0.12, drop=0.25):
        """Cloth on a ledger with two timber brackets; hem drops `drop` toward the street with a sine sag."""
        width = along1 - along0
        self.slab(along0, along1, z - 0.04, 0.08, 0.08, timber, name='ledger')
        for along in (along0 + 0.1, along1 - 0.1):
            self.slab(along - 0.04, along + 0.04, z - 0.5, 0.08, depth * 0.85, timber, name='bracket')
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


def export_section(F, path):
    """Export everything in the scene as one GLB and print size, bounds and a triangle estimate."""
    bpy.ops.object.select_all(action='SELECT')
    depsgraph = bpy.context.evaluated_depsgraph_get()
    tris = sum(sum(len(p.vertices) - 2 for p in ob.evaluated_get(depsgraph).data.polygons) for ob in bpy.context.scene.objects if ob.type == 'MESH')
    # No images in the GLB: the runtime rebinds `ph_*` material names to the shared wall pack (tint, dirt, macro variation).
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_image_format='NONE')
    print(f'section: {path} {Path(path).stat().st_size / 1e6:.1f} MB, ~{tris} triangles, zone {F.w:.1f} x {F.h:.1f} m')
    return tris
