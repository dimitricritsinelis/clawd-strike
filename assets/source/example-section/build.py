"""Example section model: North East Link (zone LINK_NORTH_EAST, rect x=39 y=76 w=7 h=5), north wall facing south.
Run: /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python assets/source/example-section/build.py
Coordinates are plan metres straight from `pnpm map:shoot link-north-east --tag r-before`."""
import sys
from pathlib import Path
import bpy
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'assets/source'))
from facade_kit import Frame, Wall, export_section
OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
F = Frame({'x': 39, 'y': 76, 'w': 7, 'h': 5})
n = Wall(F, (39.56, 81.0), (45.44, 81.0), faces='S')          # frontage span, wall top 4.9 m
n.skin(4.9, 'ph_lime_plaster_sun')
n.plinth(0.44, 'ph_sandstone_blocks_05')
n.course(3.35, 'ph_stone_trim_sandstone')
n.coping(4.9, 'ph_stone_trim_sandstone')
n.pilaster(0.3, 4.9, 'ph_sandstone_blocks_05'); n.pilaster(5.58, 4.9, 'ph_sandstone_blocks_05')
n.arch(along=2.94, width=1.0, height=2.6, mat='ph_sandstone_blocks_05', pointed=True)
n.window(along=1.35, sill=1.6, width=0.7, height=1.1, shutter='ph_weathered_brown_planks')
n.lattice(along=4.55, sill=1.7, width=0.8, height=1.0, mat='ph_dark_wood')
n.awning(along0=0.9, along1=2.1, z=2.75, depth=1.1, cloth='ph_hessian_230', timber='ph_weathered_brown_planks')
n.corbels(4.55, 'ph_stone_trim_sandstone', spacing=0.7)
export_section(F, OUT / 'link-north-east.glb')
