"""Example section model: North East Link (zone LINK_NORTH_EAST, rect x=39 y=76 w=7 h=5), north wall facing south.
Run: /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python assets/source/example-section/build.py
Dimensions are fixed in docs/map-design/construction/links.md; no new survey is required."""
import sys
from pathlib import Path
import bpy
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'assets/source'))
from facade_kit import Frame, Wall, export_section, wear_patch
OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
F = Frame({'x': 39, 'y': 76, 'w': 7, 'h': 5})
n = Wall(F, (39.56, 81.0), (45.44, 81.0), faces='S')          # frontage span, wall top 4.9 m
n.skin(4.9, 'ph_whitewashed_brick_warm', openings=((2.94, 1.05, 1.3, 1.8),))
n.plinth(0.44, 'ph_sandstone_blocks_05')
n.course(2.90, 'ph_trim_sanded_01')
n.coping(4.9, 'ph_trim_sanded_01')
n.pilaster(0.225, 4.9, 'ph_whitewashed_brick_warm', width=0.45); n.pilaster(5.655, 4.9, 'ph_whitewashed_brick_warm', width=0.45)
n.niche(along=2.94, width=1.05, height=1.8, z0=1.3, mat='ph_trim_sanded_01', back='ph_whitewashed_brick_warm')
n.slab(5.34, 5.46, 4.78, 0.12, 0.4, 'ph_trim_sanded_01', name='spout')
n.wear(along=5.4, z0=4.33, width=0.25, height=0.45, kind='damp')
wear_patch(F, [(39.2, 78.25, 0.014), (39.2, 78.75, 0.014), (45.8, 78.75, 0.014), (45.8, 78.25, 0.014)], 'polish')
export_section(F, OUT / 'link-north-east.glb')
