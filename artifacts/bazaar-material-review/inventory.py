"""Read-only inventory. Run: python3 artifacts/bazaar-material-review/inventory.py"""
import json,hashlib,collections,struct
from pathlib import Path
from PIL import Image,ImageStat
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
D=json.loads((ROOT/'docs/map-design/construction/design.json').read_text())
records=[]; images={}; packs={}
for manifest in (ROOT/'apps/client/public/assets/textures/environment/bazaar').rglob('materials.json'):
 entries=json.loads(manifest.read_text())['materials']; kind=manifest.parent.parent.name
 groups=collections.defaultdict(list)
 for e in entries:
  record={k:v for k,v in e.items() if k!='textures'};record['manifest']=str(manifest.relative_to(ROOT));record['tiers']={}
  for tier,maps in e['textures'].items():
   record['tiers'][tier]={}
   for channel,relative in maps.items():
    p=(manifest.parent/relative).resolve(); key=str(p.relative_to(ROOT));record['tiers'][tier][channel]=key
    if key not in images:
     with Image.open(p) as im:
      im.load();mean=ImageStat.Stat(im.convert('RGB')).mean
      images[key]={'bytes':p.stat().st_size,'width':im.width,'height':im.height,'mode':im.mode,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'meanSrgbBytes':mean,'estimatedRgba8MipBytes':round(im.width*im.height*4*4/3)}
  one=record['tiers'].get('1k',next(iter(record['tiers'].values())))
  groups[tuple(sorted(one.values()))].append(e['id']);records.append(record)
 packs[kind]={'manifestEntries':len(entries),'unique1kTriplets':len(groups),'shared1kTriplets':[{'ids':ids,'files':list(files)} for files,ids in groups.items() if len(ids)>1]}
selected=set()
def walk(v):
 if isinstance(v,dict):
  for x in v.values():walk(x)
 elif isinstance(v,list):
  for x in v:walk(x)
 elif isinstance(v,str):
  if v in D['materials']:selected.add(v)
walk(D['areas']);walk(D['skyline']);walk(D['backlotGround'])
ids={r['id']:r for r in records}
scopes={}
for name,selected_ids in [('all_manifest_ids',set(ids)),('area_skyline_ground_referenced_ids',selected&ids.keys())]:
 scopes[name]={}
 for tier in ['1k','2k']:
  files=set();resolved=collections.Counter()
  for ident in selected_ids:
   tiers=ids[ident]['tiers']; use=tier if tier in tiers else ('1k' if '1k' in tiers else '2k');resolved[use]+=1;files.update(tiers[use].values())
  scopes[name][tier]={'ids':len(selected_ids),'resolvedTierCounts':dict(resolved),'uniqueFiles':len(files),'fileBytes':sum(images[x]['bytes'] for x in files),'estimatedRgba8MipBytes':sum(images[x]['estimatedRgba8MipBytes'] for x in files),'files':sorted(files)}
hashes=collections.defaultdict(list)
for path,meta in images.items():hashes[meta['sha256']].append(path)
dupes=[paths for paths in hashes.values() if len(paths)>1]
glbs=[]
for p in (ROOT/'apps/client/public/assets/models/environment/bazaar').rglob('*.glb'):
 raw=p.read_bytes()
 if raw[:4]!=b'glTF':continue
 size,kind=struct.unpack_from('<II',raw,12); gltf=json.loads(raw[20:20+size]);embedded=[]
 for im in gltf.get('images',[]):
  if 'bufferView' in im:
   view=gltf['bufferViews'][im['bufferView']];embedded.append(view['byteLength'])
 glbs.append({'path':str(p.relative_to(ROOT)),'bytes':len(raw),'materials':[x.get('name') for x in gltf.get('materials',[])],'primitives':sum(len(m['primitives']) for m in gltf.get('meshes',[])),'images':len(gltf.get('images',[])),'embeddedImageBytes':sum(embedded)})
result={'issue':D['issue'],'measurementLimits':'File inventory only; decoded memory assumes RGBA8 plus full mip chain (4/3). Not measured residency, draw calls, transfer, or FPS. Manifest referenced IDs omit recipe-driven and retained runtime selections.','packs':packs,'scopes':scopes,'byteIdenticalDifferentPaths':dupes,'byteIdenticalRedundantBytes':sum(sum(images[x]['bytes'] for x in g[1:]) for g in dupes),'materials':records,'images':images,'areaMaterialSchedule':D['materialRuntimeContract']['areaMaterialSchedule'],'performanceAllocation':D['performanceAllocation'],'roofRenderingContract':D['roofRenderingContract'],'glbs':glbs}
(OUT/'inventory.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'packs':{k:{kk:vv for kk,vv in v.items() if kk!='shared1kTriplets'}for k,v in packs.items()},'scopes':{k:{t:{a:b for a,b in s.items() if a!='files'}for t,s in v.items()}for k,v in scopes.items()},'duplicateGroups':len(dupes),'duplicateRedundantBytes':result['byteIdenticalRedundantBytes'],'glbCount':len(glbs),'glbEmbeddedImageBytes':sum(x['embeddedImageBytes'] for x in glbs)},indent=2))
