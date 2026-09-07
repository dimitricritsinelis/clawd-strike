"""Build the complete Spice Street section from its construction sheet.

Run with headless Blender. KEEP dressing and runtime roofs are not exported here.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'assets/source'))
from facade_kit import Frame, Wall, export_section, wear_patch
from facade_materials import assign

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
F = Frame({'x': 21, 'y': 14, 'w': 12, 'h': 18})
W = Wall(F, (21, 15.44), (21, 30.56), faces='E')
E = Wall(F, (33, 15.44), (33, 30.56), faces='W')
PLASTER = 'ph_painted_plaster_warm'
STONE = 'ph_sandstone_blocks_05'
TRIM = 'ph_stone_trim_sandstone'
E_TRIM = 'ph_trim_sanded_01'
TIMBER = 'ph_worn_planks'
IRON = 'ph_rusty_metal_02'
AXES = (1.8, 4.68, 7.56, 10.44, 13.32)
SHOPS = (1.8, 7.56, 10.44)
W.openings = tuple(opening for a in AXES for opening in (
    (a, 2.4 if a in SHOPS else 1.15, 0, 2.7), (a, 1.6, 3.68, 1.65)))
# The two parcel boundaries are 0.02 m changes in the plaster face, not added piers.
for lo, hi, depth in ((0, 6.12, .02), (6.12, 11.88, .04), (11.88, 15.12, .02)):
    parcel = Wall(F, W.at(lo), W.at(hi), faces='E')
    openings = [(a-lo, width, sill, height) for a, width, sill, height in W.openings if lo < a < hi]
    parcel.skin(7, PLASTER, depth=depth, openings=openings)
W.plinth(.28, STONE)
W.course(3.56, TRIM)
W.coping(7, TRIM)


def ring(wall, a, z, out, radius=.05, tube=.01, name='ring-pull'):
    bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=6,
        location=F.p(*wall.at(a, out), z), major_radius=radius, minor_radius=tube)
    ob = bpy.context.object
    ob.name = name
    normal = Vector((wall.n.x, -wall.n.y, 0))
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(normal)
    bpy.ops.object.transform_apply(rotation=True)
    assign(ob, IRON)


def closed_door(wall, a, width, height, frame, store=False, wicket=False):
    timber = 'ph_weathered_brown_planks' if store else 'ph_rough_pine_door'
    wall.recess_back(a, width, height, 0, timber, out=-.055)
    # Eight planks make two four-plank store leaves or one household leaf.
    for i in range(8):
        lo = a-width/2 + width*i/8
        wall.slab(lo+.003, lo+width/8-.003, .01, height-.01, .04, timber, out=-.09, name='door-plank')
    for side in (-1, 1):
        edge = a+side*width/2
        wall.slab(min(edge, edge+side*.14), max(edge, edge+side*.14), 0, height, .12, frame, name='door-jamb')
        # Full-depth reveal connects the recessed leaf to its stone frame.
        wall.slab(min(edge, edge+side*.14), max(edge, edge+side*.14), 0, height, .09, frame, out=-.09, name='door-reveal')
        wall.wear(edge+side*.07, .9, .14, .5, 'polish', out=.125)
    wall.slab(a-width/2-.14, a+width/2+.14, height, .14, .12, frame, name='door-head')
    wall.slab(a-width/2-.14, a+width/2+.14, -.03, .04, .26, frame, out=-.14, name='threshold')
    for z in ((.55, 1.15, height-.35) if store else (.5, height-.4)):
        for lo, hi in ((a-width/2, a-.006), (a+.006, a+width/2)) if store else ((a-width/2, a+width/2),):
            wall.slab(lo+.025, hi-.025, z, .06, .02, IRON, out=-.045, name='iron-strap')
    if store:
        wall.slab(a-width/2, a+width/2, .35, .06, .06, timber, out=-.045, name='bumper')
        wall.slab(a-.09, a+.09, 1.02, .06, .03, IRON, out=-.025, name='closed-latch')
    else:
        wall.slab(a+.18, a+.24, 1.05, .1, .02, IRON, out=-.045, name='pull-plate')
        ring(wall, a+.21, 1.05, -.015)
    if wicket:
        wall.recess_back(a, .35, .35, 1.5, 'ph_dark_wood', out=-.044)
        for i in range(6):
            x = a-.16+i*.064
            wall.slab(x-.015, x+.015, 1.5, .35, .03, IRON, out=-.035, name='wicket-bar')
        for z in (1.5, 1.82):
            wall.slab(a-.175, a+.175, z, .03, .03, IRON, out=-.035, name='wicket-frame')


for a in SHOPS:
    for side in (-1, 1):
        lo = a-1.42 if side == -1 else a+1.2
        for row in range(8):
            W.slab(lo, lo+.22, row*.3375, .3375, 1.64, STONE, out=-1.35, name='shop-jamb-course')
    W.slab(a-1.45, a+1.45, 2.7, .25, 1.64, STONE, out=-1.35, name='shop-lintel')
    W.slab(a-1.2, a+1.2, 2.53, .17, 1.35, TIMBER, out=-1.35, name='shop-timber-head')
    W.recess_back(a, 2.4, 2.7, 0, 'ph_dark_wood', out=-1.355)
    W.slab(a-1.2, a+1.2, 0, .08, 1.63, TIMBER, out=-1.35, name='shop-deck')
    W.awning(a-1.25, a+1.25, 2.85, 1.10, timber=TIMBER)
    # Spice accumulates on the supported deck, not across the open recess.
    W.wear(a, .01, 2.4, .065, 'spice', out=.285)
    for edge in (a-1.31, a+1.31):
        W.wear(edge, 0, .22, .4, 'spice', out=.295)
for a in (4.68, 13.32):
    closed_door(W, a, 1.15, 2.7, TRIM)

for a in AXES:
    W.recess_back(a, 1.6, 1.65, 3.68, 'ph_worn_plaster_ochre', out=-.14)
    for lo, hi in ((a-.9, a-.8), (a+.8, a+.9)):
        W.slab(lo, hi, 3.68, 1.65, .235, TRIM, out=-.135, name='window-jamb-reveal')
    W.slab(a-.9, a+.9, 5.33, .1, .235, TRIM, out=-.135, name='window-head')
    # Sill top 3.68, underside 3.62 meets the continuous 3.50..3.62 course.
    W.slab(a-.9, a+.9, 3.62, .06, .215, TRIM, out=-.135, name='window-sill')
for a in (1.8, 7.56):
    for x in (a-.9, a+.9):
        W.slab(x-.03, x+.03, 3.29, .06, .18, TIMBER, name='sign-bracket')
W.slab(.71, .81, 3.965, .20, .02, IRON, name='lantern-wall-plate')
W.slab(.74, .78, 4.045, .04, .45, IRON, name='lantern-bracket')

# SD-17 west ends; the five existing east roof ties remain placed assets.
for y, z in ((20.581, 5.8), (26.478, 5.8), (18.162, 6), (23.756, 6.05), (28.746, 6.2)):
    a = y-15.44
    W.slab(a-.6, a+.6, z-.05, .1, .1, TIMBER, name='overhead-ledger')
    for x in (a-.45, a+.45):
        ring(W, x, z, .11, radius=.03, tube=.008, name='overhead-iron-eye')

E.skin(4.5, STONE, openings=((1.125, 1.05, 0, 2.25), (4.3425, 1.05, .45, 1.8),
    (7.56, 1.05, 0, 2.25), (10.7775, 1.05, 0, 2.25), (13.995, 1.05, .45, 1.8)))
E.plinth(.28, E_TRIM)
E.course(2.9, E_TRIM)
E.coping(4.5, E_TRIM)
for a in (.225, 14.895):
    E.pilaster(a, 4.5, STONE, width=.45, depth=.16)
for a in (1.125, 7.56):
    closed_door(E, a, 1.05, 2.25, E_TRIM, store=True, wicket=a == 7.56)
closed_door(E, 10.7775, 1.05, 2.25, E_TRIM)
for a in (4.3425, 13.995):
    E.niche(a, 1.05, 1.8, .45, E_TRIM, back=STONE)
    # Close the reveal and base around the bricked-up backing.
    for lo, hi in ((a-.685, a-.525), (a+.525, a+.685)):
        E.slab(lo, hi, .45, 1.8, .14, E_TRIM, out=-.14, name='niche-reveal')
    E.slab(a-.525, a+.525, .45, .04, .28, E_TRIM, out=-.14, name='niche-base')

# Clip base accumulation to solid wall fields; never lay translucent cards across openings.
for wall in (W, E):
    for lo, hi, bottom, top in wall._solid_rectangles(0, 15.12, .28, 1.22):
        depth = .04 if wall == W and 6.12 <= (lo+hi)/2 <= 11.88 else .02
        wall.wear((lo+hi)/2, bottom, hi-lo, top-bottom, 'dust', out=depth+.005)
    for lo, hi, bottom, top in wall._solid_rectangles(0, 15.12, 0, .28):
        wall.wear((lo+hi)/2, bottom, hi-lo, top-bottom, 'dust', out=.145)
# Light morning bleach above the west shutters; afternoon bleach spans the east upper field.
W.wear(3.06, 5.43, 6.12, 1.41, 'bleach')
W.wear(9, 5.43, 5.76, 1.41, 'bleach', out=.045)
W.wear(13.5, 5.43, 3.24, 1.41, 'bleach')
E.wear(7.56, 2.96, 14.22, 1.38, 'bleach')
for a in (1.125-.595, 1.125+.595):
    E.wear(a, 0, .14, .6, 'rut', out=.125)
# The two tie feet nearest a door: laundry 02 (0.756 m) and canopy 02 (0.2605 m).
# Their bases are fixed in Section 4; stains descend on the retained parapet.
for y, foot_z in ((23.756, 5.59), (26.478, 5.48)):
    E.wear(y-15.44, foot_z-.45, .25, .45, 'damp')

# Exact floor finish polygons from Section 6; no floor or collision mesh is replaced.
wear_patch(F, [(26.7, 14.3, 0.014), (27.3, 14.3, 0.014), (27.3, 31.7, 0.014), (26.7, 31.7, 0.014)], 'polish')
wear_patch(F, [(21.02, 15.2, 0.014), (21.6, 15.2, 0.014), (21.6, 30.8, 0.014), (21.02, 30.8, 0.014)], 'dust')
wear_patch(F, [(21.02, 16.44, 0.014), (21.4, 16.44, 0.014), (21.4, 18.04, 0.014), (21.02, 18.04, 0.014)], 'spice')
wear_patch(F, [(21.02, 22.2, 0.014), (21.4, 22.2, 0.014), (21.4, 23.8, 0.014), (21.02, 23.8, 0.014)], 'spice')
wear_patch(F, [(21.02, 25.08, 0.014), (21.4, 25.08, 0.014), (21.4, 26.68, 0.014), (21.02, 26.68, 0.014)], 'spice')
wear_patch(F, [(31.2, 15.1, 0.014), (31.25, 15.1, 0.014), (31.25, 16.565, 0.014), (31.2, 16.565, 0.014)], 'rut')
wear_patch(F, [(31.77, 15.1, 0.014), (31.82, 15.1, 0.014), (31.82, 16.565, 0.014), (31.77, 16.565, 0.014)], 'rut')
wear_patch(F, [(31.980579, 15.807976, 0.014), (32.152415, 17.207466, 0.014), (31.219421, 17.322024, 0.014), (31.047585, 15.922534, 0.014)], 'dust')
wear_patch(F, [(21.425503, 27.299699, 0.014), (22.243024, 27.170216, 0.014), (22.374497, 28.000301, 0.014), (21.556976, 28.129784, 0.014)], 'dust')
wear_patch(F, [(23.443821, 27.909431, 0.014), (23.920509, 27.666546, 0.014), (24.116179, 28.050569, 0.014), (23.639491, 28.293454, 0.014)], 'dust')
wear_patch(F, [(22.080519, 27.375324, 0.014), (23.683956, 26.945684, 0.014), (23.919481, 27.824676, 0.014), (22.316044, 28.254316, 0.014)], 'dust')
wear_patch(F, [(32.140632, 21.865095, 0.014), (32.066174, 22.394889, 0.014), (31.639368, 22.334905, 0.014), (31.713826, 21.805111, 0.014)], 'dust')
wear_patch(F, [(32.137347, 27.652583, 0.014), (32.289982, 28.184882, 0.014), (31.862653, 28.307417, 0.014), (31.710018, 27.775118, 0.014)], 'dust')
wear_patch(F, [(32.665, 20.47, 0.014), (32.665, 22.13, 0.014), (31.755, 22.13, 0.014), (31.755, 20.47, 0.014)], 'dust')
wear_patch(F, [(32.110846, 28.189027, 0.014), (32.110846, 28.650973, 0.014), (31.649154, 28.650973, 0.014), (31.649154, 28.189027, 0.014)], 'dust')
wear_patch(F, [(32.490458, 17.244444, 0.014), (32.57633, 18.225968, 0.014), (32.009542, 18.275556, 0.014), (31.92367, 17.294032, 0.014)], 'dust')
wear_patch(F, [(32.569624, 23.673138, 0.014), (32.47181, 24.603769, 0.014), (31.930376, 24.546862, 0.014), (32.02819, 23.616231, 0.014)], 'dust')
wear_patch(F, [(32.588595, 26.989735, 0.014), (32.418939, 27.787903, 0.014), (31.771405, 27.650265, 0.014), (31.941061, 26.852097, 0.014)], 'dust')
wear_patch(F, [(32.314254, 18.192992, 0.014), (32.503727, 18.952928, 0.014), (31.885746, 19.107008, 0.014), (31.696273, 18.347072, 0.014)], 'dust')
wear_patch(F, [(32.400956, 24.530825, 0.014), (32.499175, 25.150956, 0.014), (31.879044, 25.249175, 0.014), (31.780825, 24.629044, 0.014)], 'dust')
wear_patch(F, [(23.356591, 27.037388, 0.014), (24.018057, 26.860148, 0.014), (24.163409, 27.402612, 0.014), (23.501943, 27.579852, 0.014)], 'dust')

# Construction assertions operate on evaluated geometry, including bevels and cloth thickness.
scene_meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
assert sum(o.name.split('.')[0] == 'awning' for o in scene_meshes) == 3
assert sum(o.name.split('.')[0] == 'shop-deck' for o in scene_meshes) == 3
assert sum(o.name.split('.')[0] == 'window-sill' for o in scene_meshes) == 5
assert sum(o.name.split('.')[0] == 'threshold' for o in scene_meshes) == 5
graph = bpy.context.evaluated_depsgraph_get()
for ob in scene_meshes:
    evaluated = ob.evaluated_get(graph)
    points = [evaluated.matrix_world @ v.co for v in evaluated.data.vertices]
    if ob.name.split('.')[0] == 'awning':
        assert min(p.z for p in points) >= 2.45, ob.name
    if not ob.name.startswith('wear-'):
        for point in points:
            if .1 < point.z < 2.2:
                assert point.x <= .35001 or point.x >= 11.64999, (ob.name, tuple(point))
print('construction: 3 awnings >= 2.45 m; 3 decks; 5 shutter sills; 5 closed-door thresholds; low relief <= 0.35 m')
export_section(F, OUT / 'unit-spice-street.glb')
