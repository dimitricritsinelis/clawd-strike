"""Inspect actual exported triangle intersections, frames, budgets and target coverage."""
from pathlib import Path
import json,struct,math,hashlib,sys,argparse
ROOT=Path(__file__).resolve().parents[3]

def glb(path,origin):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);data=b[28+n:]
 def read(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];types={5126:('f',4),5125:('I',4),5123:('H',2),5121:('B',1)};fmt,size=types[a['componentType']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];stride=v.get('byteStride',size*width);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
  return [struct.unpack_from('<'+fmt*width,data,offset+j*stride) for j in range(a['count'])]
 tris=[];primitive_count=0;casts=0
 for node in g['nodes']:
  if 'mesh' not in node:continue
  assert not any(k in node for k in ['matrix','translation','rotation','scale']),('Expected baked export',path,node['name'])
  for p in g['meshes'][node['mesh']]['primitives']:
   assert p.get('mode',4)==4;primitive_count+=1;casts+=node.get('extras',{}).get('bz04Shadow')=='cast';vs=read(p['attributes']['POSITION']);ids=[x[0] for x in read(p['indices'])] if 'indices' in p else range(len(vs))
   material=g['materials'][p['material']]['name']
   for j in range(0,len(ids),3):tris.append((material,[(origin[0]+vs[i][0],origin[1]+vs[i][2],origin[2]+vs[i][1]) for i in ids[j:j+3]]))
 return tris,{'path':str(path.relative_to(ROOT)),'triangles':len(tris),'primitives':primitive_count,'castPrimitives':casts,'materials':[m['name'] for m in g['materials']],'sha256':hashlib.sha256(b).hexdigest()}
def clip(poly,axis,value,sign):
 out=[]
 for p,q in zip(poly,poly[1:]+poly[:1]):
  a=(p[axis]-value)*sign;b=(q[axis]-value)*sign
  if a>=0:out.append(p)
  if (a>=0)!=(b>=0):
   t=a/(a-b);out.append(tuple(p[i]+t*(q[i]-p[i]) for i in range(3)))
 return out

def intersects(tri,lo,hi):
 if any(max(p[i] for p in tri)<=lo[i]+1e-5 or min(p[i] for p in tri)>=hi[i]-1e-5 for i in range(3)):return False
 poly=tri
 for i in range(3):
  poly=clip(poly,i,lo[i]+1e-5,1)
  if not poly:return False
  poly=clip(poly,i,hi[i]-1e-5,-1)
  if not poly:return False
 return len(poly)>=3

def volume(face,plane,lo,hi):
 def p(a,o,z):return {'north':(a,plane-o,z),'south':(a,plane+o,z),'east':(plane-o,a,z),'west':(plane+o,a,z)}[face]
 vs=[p(a,o,z) for a in [lo[0],hi[0]] for o in [lo[1],hi[1]] for z in [lo[2],hi[2]]]
 return [min(v[i] for v in vs) for i in range(3)],[max(v[i] for v in vs) for i in range(3)]
def report_budget(asset, budget):
 """Record construction costs against retained targets; performance is deferred."""
 counts={'maxTriangles':asset['triangles'],'maxMaterials':len(asset['materials']),
         'maxRenderedPrimitives':asset['primitives'],'maxShadowPrimitives':asset['castPrimitives']}
 targets={key:budget[key] for key in counts if key in budget}
 return {'status':'deferred','counts':counts,'targets':targets,
         'overTarget':[key for key,target in targets.items() if counts[key]>target]}

def self_test():
 from copy import deepcopy
 design = json.loads((ROOT/'docs/map-design/construction/design.json').read_text())
 area = next(a for a in design['areas'] if a['zone'] == 'SPAWN_B_COURTYARD')
 for budget in [area['budget'], design['sharedEnvironment']]:
  for count, ceiling in [('triangles', 'maxTriangles'), ('materials', 'maxMaterials'), ('primitives', 'maxRenderedPrimitives'), ('castPrimitives', 'maxShadowPrimitives')]:
   if ceiling not in budget:continue
   counts = {'triangles': 0, 'materials': [], 'primitives': 0, 'castPrimitives': 0}
   counts[count]=['fixture']*budget[ceiling] if count=='materials' else budget[ceiling]
   original=deepcopy(budget)
   assert report_budget(counts,budget)['overTarget']==[]
   stricter = deepcopy(budget); stricter[ceiling] -= 1
   report=report_budget(counts,stricter)
   assert report['status']=='deferred' and report['overTarget']==[ceiling]
   assert report['counts'][ceiling]==budget[ceiling] and budget==original
 # Performance deferral must not change exact obstruction detection.
 assert intersects([(-2,0,.5),(2,0,.5),(0,2,.5)],(-.1,-.1,0),(.1,.1,1))
 assert not intersects([(-2,0,2),(2,0,2),(0,2,2)],(-.1,-.1,0),(.1,.1,1))
 print('PASS budget reporting fixtures: all four overages are retained without blocking; triangle-volume checks still detect obstruction')

def main(argv=None):
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('output',type=Path,nargs='?')
 parser.add_argument('--design',type=Path,default=ROOT/'docs/map-design/construction/design.json')
 parser.add_argument('--self-test',action='store_true')
 parser.add_argument('--section-only',action='store_true',help='Verify the B finish section without reopening unchanged shared assets')
 args=parser.parse_args(argv)
 if args.self_test: self_test(); return
 if args.output is None: parser.error('output is required')
 OUT=args.output;OUT.mkdir(parents=True,exist_ok=True)
 D=json.loads(args.design.read_text());R=json.loads((ROOT/'docs/map-design/construction/roof-coordination.json').read_text());A=next(a for a in D['areas'] if a['zone']=='SPAWN_B_COURTYARD')
 assets=[];alltris=[]
 paths=[(ROOT/'assets/source/unit-spawn-b-courtyard/unit-spawn-b-courtyard.glb',(17,78,0)),(ROOT/'assets/source/unit-rug-gate/bz04-rug-gate.glb',(27.5,77.1,0)),(ROOT/'assets/source/bz04-shared-environment/bz04-shared-environment.glb',(28,48,0))]
 for b in R['roofBundles']:
  if b['id']=='ROOF_BUNDLE_UNIT_SPAWN_B_COURTYARD':
   p=b['baseCentrePlacement']['position'];paths.append((ROOT/'assets/source'/b['installationOutputUnit']/b['plannedModelFile'],(p['x'],p['y'],p['z'])))
 for cap in A['implementationPhase']['roofSlices']:
  paths.append((ROOT/'assets/source/unit-spawn-b-courtyard'/(cap['modelId']+'.glb'),cap['placement']['designCenter']))
 if args.section_only:paths=paths[:1]
 for path,origin in paths:
  tris,info=glb(path,origin);assets.append(info);alltris.extend(tris)
 checks=[('scheduled-clear-route',(25,78,.041),(31,92,2.2)),('northwest-opening',(16.7,78,.041),(17.3,81,4.2)),('northeast-opening',(38.7,78,.041),(39.3,81,4.2)),('gateway-clear-void',(21,76.7,.041),(34,78.3,4.2))]
 for f in A['faces']:
  for p in f['parcels']:
   for o in p['openings']:
    if o['kind']=='door':
     lo,hi=volume(f['face'],f['wallPlaneM'],(o['alongM']-o['widthM']/2,0,.041),(o['alongM']+o['widthM']/2,.8,2.1));checks.append((o['id']+'-service',lo,hi))
 results=[]
 for name,lo,hi in checks:
  hits=[{'material':mat,'triangle':tri} for mat,tri in alltris if intersects(tri,lo,hi)]
  results.append({'id':name,'min':lo,'max':hi,'status':'fail' if hits else 'pass','intersectingTriangles':len(hits),'examples':hits[:6]})
 # Shared ground is verified only when this run explicitly includes shared outputs.
 if not args.section_only:
  shared,_=glb(paths[2][0],paths[2][1]);ground=[t for m,t in shared if m in ['bz04_large_sandstone_blocks_01','bz06_rough_service_paving']];ground_hits=[]
  for area in D['areas']:
   r=area['rect'];lo=(r['x'],r['y'],-.001);hi=(r['x']+r['w'],r['y']+r['h'],.001)
   count=sum(intersects(t,lo,hi) for t in ground)
   if count:ground_hits.append({'zone':area['zone'],'triangles':count})
  results.append({'id':'BG-GROUND-playable-exclusions','status':'fail' if ground_hits else 'pass','hits':ground_hits})
  assets[2]['budget']=report_budget(assets[2], D['sharedEnvironment'])
 # Keep actual exported costs visible while performance work is deferred.
 assets[0]['budget']=report_budget(assets[0], A['budget'])
 if A.get('implementationPhase',{}).get('id')=='B-05-finish-only':
  proof=json.loads(paths[0][0].with_suffix('.inspection.json').read_text())
  assert proof['sha256']==assets[0]['sha256'],'inspection differs from exported section'
  import runpy
  current=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']('unit-spawn-b-courtyard',D,R)
  assert proof.get('inputSha256')==current['inputSha256'],'section was built from another handoff'
  names=[o['id'] for o in proof['objects']]
  for feature in A['facadeFeatures']:
   assert any(n.startswith(feature['id']) for n in names),('missing scheduled feature',feature['id'])
  for face in A['faces']:
   for parcel in face['parcels']:
    for opening in parcel['openings']:
     assert any(n.startswith(opening['id']) for n in names),('missing opening',opening['id'])
     if opening.get('glazingProfile'):assert any(n.startswith(opening['id']) and '-glass-pane' in n for n in names),('missing glass',opening['id'])
  expected={'bz05_b_warm_timber','bz05_b_teal_timber','bz05_b_dark_iron','bz05_b_ceramic','bz06_monolithic_stone_trim'}
  exported_materials=set(assets[0]['materials'])|set(proof.get('atlas',{}).get('sourceMaterials',[]))
  assert expected<=exported_materials,('missing finish material',expected-exported_materials)
  results.append({'id':'R7-source-feature-material-coverage','status':'pass','featureCount':len(A['facadeFeatures']),'inputSha256':proof['inputSha256']})
 report={'assets':assets,'triangleVolumeChecks':results,'allClear':all(c['status']=='pass' for c in results),'scope':'Actual GLB triangles, exact prescribed volumes; no AABB or vertex-only acceptance.'}
 (OUT/'export-verification.json').write_text(json.dumps(report,indent=2)+'\n')
 for c in results:print(c['status'].upper(),c['id'],c.get('intersectingTriangles',c.get('hits')))

 if not report['allClear']:sys.exit(1)

if __name__ == '__main__':
 main()
