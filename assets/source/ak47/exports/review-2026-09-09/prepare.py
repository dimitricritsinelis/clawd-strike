"""Freeze the declared factorial inputs after the thumb-control diagnostic."""
import hashlib
import importlib.util
import itertools
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

HERE = Path(__file__).resolve().parent
OUT = HERE / 'run-01'
BASELINE = Path('/tmp/thumb-doe-20260909/baseline.blend')
axes_path = OUT / 'diagnostics/axis-comparison/derived-axes.json'
axes = json.loads(axes_path.read_text())
spec = importlib.util.spec_from_file_location('fit_fingers', HERE / 'fit_fingers.py')
fitter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fitter)
finger_reference = fitter.capture_reference()
rig = bpy.data.objects['L_Armature']
base = rig.pose.bones['L_thumb.01']
original_location = base.location.copy()
root = base.head.copy()

# Reuse the declared rear-edge clearance construction, but align the newly
# verified MCP flex axis with its bend plane. No rest bone or joint is moved.
target = Vector((-.050, -.003, -.060))
y = (target-root).normalized()
edge_tangent = Vector((-.486, 0, .874)).normalized()
x = (edge_tangent-y*edge_tangent.dot(y)).normalized()
z = x.cross(y).normalized()
x = y.cross(z).normalized()
frame = Matrix((x,y,z)).transposed().to_4x4()
frame.translation = root
base.matrix = frame
for name in ['L_thumb.02', 'L_thumb.03']:
    rig.pose.bones[name].rotation_quaternion = Quaternion()
bpy.context.view_layer.update()
joint = rig.pose.bones['L_thumb.02']
length_axis = base.y_axis.normalized()
old_hinge = joint.x_axis.normalized()
derived_hinge = (joint.matrix.to_3x3() @ Vector(axes[joint.name]['axis_local'])).normalized()
a = (derived_hinge-length_axis*derived_hinge.dot(length_axis)).normalized()
b = (old_hinge-length_axis*old_hinge.dot(length_axis)).normalized()
alignment = math.atan2(length_axis.dot(a.cross(b)), a.dot(b))
c0 = base.rotation_quaternion @ Quaternion((0,1,0), alignment)
c1 = c0 @ Quaternion((0,1,0), math.radians(15))
base.rotation_quaternion = c0
base.location = original_location
bpy.context.view_layer.update()
case_list = [{'id':'control','control':True}, {'id':'control-repeat','control':True}]
for i,(p,c,f) in enumerate(itertools.product(range(2),repeat=3),1):
    case_list.append({'id':'case-%02d'%i, 'levels':{'placement':p,'cmc':c,'flexion':f},
                      'handRearShiftM':-.015*p, 'cmcQuaternion':list([c0,c1][c]),
                      'flexDegrees':[(55,45),(45,55)][f]})
manifest={'schema':1,'baseline':str(BASELINE),'baselineSHA256':hashlib.sha256(BASELINE.read_bytes()).hexdigest(),
          'outputRoot':str(OUT),'workingRoot':'/tmp/thumb-doe-20260909/cases',
          'fingerFitIterations':60,'fingerReference':finger_reference,'flexAxesLocal':{k:v['axis_local'] for k,v in axes.items()},
          'axesDefinitionSHA256':hashlib.sha256(axes_path.read_bytes()).hexdigest(),
          'derivation':{'metacarpalTargetWorld':list(target),'fixedCMCRootWorld':list(root),
                        'edgeTangentWorld':list(edge_tangent),'hingeProjectionAlignmentDegrees':math.degrees(alignment),
                        'C0ShortestRotationDegrees':math.degrees(2*math.acos(min(1,abs(c0.w)))),
                        'C1ShortestRotationDegrees':math.degrees(2*math.acos(min(1,abs(c1.w)))),
                        'note':'Controls derive from intended broad-pulp frame; C0 aligns that hinge projection with the declared rear-edge bend plane. C1 adds 15 degrees about metacarpal length. Geometry, weights and rest frames are unchanged.'},
          'cases':case_list}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest['derivation']),flush=True)
