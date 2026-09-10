"""Apply only the BZ-04 trial's explicit bindings and legacy dispositions."""
from pathlib import Path
import argparse, json, hashlib, shutil, copy, subprocess, runpy
ROOT=Path(__file__).resolve().parents[3]
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2)+'\n')
def model(mid,file,source):return {'id':mid,'file':file,'source':'repo://'+source,'license':'Project-Original'}
UNIT = 'unit-spawn-b-courtyard'

def load_handoff(path):
 saved = json.loads(path.read_text())
 if saved.get('unit') != UNIT or len(saved.get('areas', [])) != 1 or saved['areas'][0].get('outputUnit') != UNIT or saved['areas'][0].get('zone') != 'SPAWN_B_COURTYARD':
  raise ValueError('Integration requires the exact B courtyard handoff unit')
 inputs = {k:v for k,v in saved.items() if k not in ['source', 'designSha256', 'reading', 'inputSha256']}
 digest = hashlib.sha256(json.dumps(inputs, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
 if saved.get('inputSha256') != digest:
  raise ValueError('Frozen handoff contents do not match inputSha256')
 extract = runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']
 if digest != extract(UNIT)['inputSha256']:
  raise ValueError('Area inputs changed since handoff extraction; resolve the changed issue before integration')
 if saved['areas'][0].get('implementationPhase', {}).get('id') != 'B-04-only':
  raise ValueError('Legacy integration supports only B-04-only; implement section-only finish integration for B-05/R7 first')
 return saved

def integrate(path):
 # Validate every frozen input before any copy, package write or runtime mutation.
 D = load_handoff(path)
 R = D
 A = D['areas'][0]
 unit=ROOT/'assets/source/unit-spawn-b-courtyard'
 bundles=[b for b in R['roofBundles'] if b['id']=='ROOF_BUNDLE_UNIT_SPAWN_B_COURTYARD']
 models=[model('section_unit_spawn_b_courtyard','unit-spawn-b-courtyard.glb','assets/source/unit-spawn-b-courtyard/build.py')]
 placements=[]
 for b in bundles:
  source=ROOT/'assets/source'/b['installationOutputUnit']/b['plannedModelFile']
  if source.parent!=unit:shutil.copy2(source,unit/source.name)
  models.append(model(b['modelId'],source.name,'assets/source/unit-spawn-b-courtyard/build.py'));placements.append(b['baseCentrePlacement'])
 for cap in A['implementationPhase']['roofSlices']:
  models.append(model(cap['modelId'],cap['modelId']+'.glb','assets/source/unit-spawn-b-courtyard/build.py'))
  x,y,z=cap['placement']['designCenter'];placements.append({'id':cap['modelId'].upper(),'modelId':cap['modelId'],'position':{'x':x,'y':y,'z':z},'yawDeg':180,'role':'dressing'})
 shared=ROOT/'assets/source/bz04-shared-environment/bz04-shared-environment.glb';shutil.copy2(shared,unit/shared.name)
 models.append(model('bz04_shared_environment',shared.name,'assets/source/unit-spawn-b-courtyard/build.py'))
 placements.append({'id':'BZ04_SHARED_ENVIRONMENT','modelId':'bz04_shared_environment','position':{'x':28,'y':48,'z':0},'yawDeg':180,'role':'skyline'})
 write(unit/'package.json',{'models':models,'section':{'zoneId':A['zone'],'modelId':'section_unit_spawn_b_courtyard','faces':A['sectionFaces']},'placements':placements,'sharedDependencies':A['sharedDependencies'],'roofBundleIds':[b['id'] for b in bundles],'implementationPhase':'B-04-only'})
 subprocess.run(['node','scripts/apply-facade-package.mjs','apply','unit-spawn-b-courtyard'],cwd=ROOT,check=True)
 p=ROOT/'docs/map-design/specs/map_spec.json';s=json.loads(p.read_text())
 retire={d['id'] for d in D['legacyDispositions'] if d.get('zone')==A['zone'] and d['disposition']=='remove'}
 for placement in list(s['dressing_placements']):
  kept=[anchor for anchor in placement['anchorIds'] if placement['id']+'_'+anchor not in retire]
  if not kept:s['dressing_placements'].remove(placement)
  else:placement['anchorIds']=kept
 for z in s['zones']:
  if z['id']==A['zone']:z['floorMaterialId']=A['floorMaterialId']
 # Remove empty soft-visual clusters and their unused asset allowlist entries.
 for c in list(s['dressing_clusters']):
  remaining=[p for p in s['dressing_placements'] if p['clusterId']==c['id']]
  if not remaining and c['id'].startswith('CLUSTER_SPAWN_B_'):s['dressing_clusters'].remove(c)
  elif c['id'].startswith('CLUSTER_SPAWN_B_'):
   for key,value in c.items():
    if isinstance(value,list) and any(isinstance(v,str) and v.startswith('ASSET_') for v in value):c[key]=[v for v in value if v in {p['assetId'] for p in remaining}]
 referenced={a for p in s['dressing_placements'] for a in p['anchorIds']}
 s['anchors']=[a for a in s['anchors'] if a['id'] in referenced or not any(i.endswith('_'+a['id']) for i in retire)]
 retired_assets={d.get('assetId') for d in D['legacyDispositions'] if d.get('id') in retire}|{'ASSET_HERO_ARCH'}
 used={p['assetId'] for p in s['dressing_placements']}
 s['asset_registry']=[a for a in s['asset_registry'] if a['id'] not in retired_assets or a['id'] in used]
 write(p,s)
 # Retire only the former full Rug Gate roof model when no live binding references it.
 manifest_path=ROOT/'apps/client/public/assets/models/environment/bazaar/facades/models.json'
 manifest=json.loads(manifest_path.read_text())
 used_models={p['modelId'] for p in s.get('authored_placements',[])}
 manifest['models']=[m for m in manifest['models'] if m['id']!='bz04_roof_bundle_unit_rug_gate' or m['id'] in used_models]
 write(manifest_path,manifest)
 subprocess.run(['node','apps/client/scripts/gen-map-runtime.mjs'],cwd=ROOT,check=True)

def self_test():
 from tempfile import TemporaryDirectory
 from unittest.mock import patch
 extract = runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']
 current = extract(UNIT)
 def seal(value):
  inputs = {k:v for k,v in value.items() if k not in ['source', 'designSha256', 'reading', 'inputSha256']}
  value['inputSha256'] = hashlib.sha256(json.dumps(inputs, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
  return value
 stale = copy.deepcopy(current); stale['areas'][0]['floorMaterialId'] = 'stale-fixture'; seal(stale)
 tampered = copy.deepcopy(current); tampered['areas'][0]['floorMaterialId'] = 'tampered-fixture'
 wrong = copy.deepcopy(current); wrong['unit'] = 'unit-spice-street'; seal(wrong)
 unsupported = copy.deepcopy(current); unsupported['areas'][0]['implementationPhase']['id'] = 'B-05-finish-only'; seal(unsupported)
 with TemporaryDirectory() as directory:
  for name, saved, live, expected in [('stale', stale, current, 'changed since'), ('tampered', tampered, current, 'contents do not match'), ('wrong unit', wrong, current, 'exact B courtyard'), ('unsupported phase', unsupported, unsupported, 'supports only B-04-only')]:
   path = Path(directory)/'handoff.json'; path.write_text(json.dumps(saved))
   with patch.object(runpy, 'run_path', return_value={'extract': lambda unit: live}), patch.object(shutil, 'copy2') as copied, patch.object(Path, 'write_text') as written, patch.object(Path, 'mkdir') as made, patch.object(subprocess, 'run') as applied:
    try: integrate(path)
    except ValueError as error: assert expected in str(error), error
    else: raise AssertionError(f'{name} handoff accepted')
    copied.assert_not_called(); written.assert_not_called(); made.assert_not_called(); applied.assert_not_called()
 print('PASS integration fixtures: wrong unit, tampering, stale input and unsupported phase reject before copies/writes/processes')

def main(argv=None):
 parser = argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--handoff', type=Path)
 parser.add_argument('--self-test', action='store_true')
 args = parser.parse_args(argv)
 if args.self_test: self_test(); return
 if args.handoff is None: parser.error('--handoff is required')
 integrate(args.handoff)

if __name__ == '__main__':
 main()
