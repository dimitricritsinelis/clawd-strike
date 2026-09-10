"""Hash actual embedded image bytes; does not modify models."""
import json,struct,hashlib,collections
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=Path(__file__).resolve().parent
uses=collections.defaultdict(list)
for p in (root/'apps/client/public/assets/models/environment/bazaar').rglob('*.glb'):
 b=p.read_bytes(); jlen=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+jlen]);binary_start=28+jlen
 for i,im in enumerate(g.get('images',[])):
  if 'bufferView' not in im:continue
  v=g['bufferViews'][im['bufferView']];start=binary_start+v.get('byteOffset',0);data=b[start:start+v['byteLength']]
  uses[hashlib.sha256(data).hexdigest()].append({'glb':str(p.relative_to(root)),'image':i,'name':im.get('name'),'bytes':len(data)})
duplicates=[x for x in uses.values() if len(x)>1]
r={'scope':'All Bazaar GLBs on disk; includes retained and superseded assets, NOT active runtime residency. Exact embedded byte hashes only; recompressed equivalents are not detected.','embeddedImages':sum(len(x) for x in uses.values()),'uniqueEmbeddedImages':len(uses),'totalBytes':sum(x['bytes'] for group in uses.values() for x in group),'uniqueBytes':sum(group[0]['bytes'] for group in uses.values()),'redundantCopiesBytes':sum(sum(x['bytes'] for x in group[1:]) for group in uses.values()),'duplicateGroups':duplicates}
(out/'embedded-images.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k!='duplicateGroups'},indent=2))
