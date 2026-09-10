"""Bounded local file/hash review. Run from any directory; reads source assets only."""
import json,hashlib,collections,re
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent
B=R/'apps/client/public/assets/textures/environment/bazaar'
results=[]; covered=set(); families=[]
for manifest in B.rglob('sources.json'):
 d=json.loads(manifest.read_text())
 for family,v in d.get('sourceFamilies',{}).items():
  families.append({'family':family,'source':v.get('source'),'license':v.get('license'),'record':str(manifest.relative_to(R))})
  for tier,maps in v.get('md5',{}).items():
   for channel,expected in maps.items():
    suffix={'albedo':'diff','normal':'nor_gl','arm':'arm'}[channel]
    matches=list((manifest.parent/family).glob(f'*_{suffix}_{tier}.*'))
    if len(matches)!=1:
     results.append({'family':family,'tier':tier,'channel':channel,'status':'missing_file' if not matches else 'ambiguous_file','matches':[str(p.relative_to(R)) for p in matches],'expected':expected});continue
    p=matches[0];actual=hashlib.md5(p.read_bytes()).hexdigest();covered.add(p)
    results.append({'path':str(p.relative_to(R)),'family':family,'tier':tier,'channel':channel,'source':v.get('source'),'license':v.get('license'),'expected':expected,'actual':actual,'status':'match' if actual==expected else 'mismatch'})
 for asset in d.get('assets',[]):
  for relative in set(asset.get('files',[]))|set(asset.get('md5',{})):
   p=manifest.parent/relative;expected=asset.get('md5',{}).get(relative);actual=hashlib.md5(p.read_bytes()).hexdigest() if p.exists() else None;covered.add(p)
   results.append({'path':str(p.relative_to(R)),'family':asset['id'],'source':asset.get('source'),'license':asset.get('license'),'expected':expected,'actual':actual,'status':'missing_file' if actual is None else 'missing_hash' if expected is None else 'match' if actual==expected else 'mismatch'})
# Every image under the two pack roots, including originals beyond loader tiers.
for manifest in B.rglob('materials.json'):
 for p in manifest.parent.rglob('*'):
  if p.suffix.lower() in ['.jpg','.jpeg','.png','.webp'] and p not in covered:
   results.append({'path':str(p.relative_to(R)),'status':'missing_record'})
report={'scope':'Adjacent sources.json records for wall/floor texture packs, textiles and palms; does not validate upstream authorship or legal claims. Windows SOURCE.md and model provenance are outside this bounded sources.json check.','summary':dict(collections.Counter(x['status'] for x in results)),'families':families,'results':results}
(O/'provenance-check.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report['summary']))
I=json.loads((O/'inventory.json').read_text());M={x['id']:x for x in I['materials']};D=json.loads((R/'docs/map-design/construction/design.json').read_text());P=json.loads((O/'material-art-proposal.json').read_text());files=set();mapping=[]
for p in P['palette']:
 mid=p['sourceMaterialId'];channels=['albedo','normal','arm']
 if mid=='bz04_craft_painted_timber':mid=D['craftStandards']['materials']['opaqueTimber']['sourceMaterialId'];channels=['normal','arm']
 elif mid=='bz04_craft_dark_iron':mid=D['craftStandards']['materials']['iron']['sourceMaterialId']
 if mid=='bz04_levantine_rug_project_original':paths=[D['materialRuntimeContract']['embeddedDetailBindings']['rugSource']]
 else:paths=[M[mid]['tiers']['1k'][ch] for ch in channels]
 files.update(paths);mapping.append({'paletteId':p['id'],'sourceMaterialId':mid,'files':paths})
def stats(paths):
 total=mem=0
 for path in paths:
  f=R/path;total+=f.stat().st_size
  with Image.open(f) as im:mem+=round(im.width*im.height*4*4/3)
 return {'uniqueFiles':len(paths),'encodedBytes':total,'estimatedRgba8MipBytes':mem}
old=set(I['scopes']['area_skyline_ground_referenced_ids']['1k']['files']);r={'scope':'Approximate source-file footprint only: all 16 proposed palette families at 1k, resolving opaque timber to its two needed non-albedo maps and adding the unmodified rug. Excludes future derived bakes, repeated embedded copies, retained trim/roofs/props, unseen recipes and all runtime allocation. Comparison with current direct-reference subset is not a scene savings claim.','proposedPalette':stats(files),'currentDirectReferenceSubset':stats(old),'overlap':stats(files&old),'proposedOnly':stats(files-old),'currentOnly':stats(old-files),'mapping':mapping,'proposedFiles':sorted(files)}
(O/'palette-footprint.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in ['mapping','proposedFiles']},indent=2))
