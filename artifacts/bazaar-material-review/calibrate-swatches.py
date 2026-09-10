"""Review-only unlit base-color studies. Does not edit source textures or active materials."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;D=json.loads((ROOT/'docs/map-design/construction/design.json').read_text());P=json.loads((OUT/'material-art-proposal.json').read_text());(OUT/'swatches').mkdir(exist_ok=True)
def linear(a):return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
def srgb(a):return np.where(a<=.0031308,12.92*a,1.055*np.maximum(a,0)**(1/2.4)-.055)
def hexlin(h):return linear(np.array([int(h[i:i+2],16)/255 for i in (1,3,5)]))
def hexrgb(a):return '#'+''.join(f'{round(v*255):02x}' for v in np.clip(srgb(a),0,1))
def source(mid):
 if mid=='bz04_levantine_rug_project_original':return ROOT/D['materialRuntimeContract']['embeddedDetailBindings']['rugSource']
 m=D['materials'][mid];return ROOT/Path(m['manifest']).parent/m['textures']['albedo']
def load(p):return linear(np.asarray(Image.open(p).convert('RGB').resize((512,512)),dtype=np.float32)/255)
def save(a,name):
 p=OUT/'swatches'/name;Image.fromarray(np.uint8(np.clip(srgb(a),0,1)*255+.5)).save(p);return str(p.relative_to(ROOT))
lookup={'bz04_craft_painted_timber':'ph_bz04_rough_pine_door','bz04_craft_dark_iron':'ph_bz04_rusty_metal_02'}
result=[]
for family in P['palette']:
 ident=family['id'];mid=lookup.get(family['sourceMaterialId'],family['sourceMaterialId']);path=source(mid);a=load(path);target=family.get('targetAppearanceSrgb');mode='bounded-calibration';grain=.50
 if ident in ('dressed-sandstone','service-stone'):grain=.75
 if ident in ('quiet-flags','rough-service-paving'):grain=.70
 if ident=='timber':grain=.28
 if ident in ('cream-woven-cloth','rust','iron'):grain=.12
 if ident in ('teal','indigo'):grain=0;mode='opaque-paint'
 if ident=='rug':grain=1;mode='unaltered-source'
 if target:
  aim=hexlin(target);lum=a@np.array([.2126,.7152,.0722]);lo,hi=np.quantile(lum,[.10,.90]);field=a[(lum>=lo)&(lum<=hi)];central=np.median(field,axis=0)
  allowed=np.min((1-aim)/np.maximum(1-central,1e-6));grain=min(grain,max(0,float(allowed)*.95))
  term=(1-grain)+grain*a;representative=(1-grain)+grain*central;paint=aim/representative;candidate=paint*term
 else:paint=np.ones(3);candidate=a
 if ident in ('teal','indigo'):current=np.ones_like(a)*hexlin('#78978d' if ident=='teal' else '#66778c')
 elif ident in ('timber','iron','cream-woven-cloth','rust'):
  profile=D['craftStandards']['materials'][{'timber':'warmTimber','iron':'iron','cream-woven-cloth':'cloth','rust':'cloth'}[ident]]
  current=hexlin(profile['paintSrgb'])*((1-profile['grainMix'])+profile['grainMix']*a)
 elif ident=='rug':current=a
 else:
  m=D['materials'][mid];current=a*hexlin(m['tintHex']);boost=m.get('albedoBoost',1);current=current*boost/(1+(boost-1)*current)

 if family.get('retainCurrentCraftRecipe'):
  candidate=current.copy();mode='retained-R5-craft';paint=hexlin(profile['paintSrgb']);grain=profile['grainMix']
 row={**family,'resolvedSourceMaterialId':mid,'sourceFile':str(path.relative_to(ROOT)),'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sampleScope':'Unlit base-color calculation only; no PBR lighting, normal/roughness, macro shader or authored wear. One UV repeat shown as a square.','proposalMode':mode,'proposedGrainMix':round(grain,6),'calibratedPaintSrgb':hexrgb(paint),'clippedPixelFraction':float(np.mean(np.any(candidate>1,axis=2))),'raw':save(a,ident+'-raw.png'),'current':save(current,ident+'-current.png'),'proposed':save(candidate,ident+'-proposed.png')}
 result.append(row)
# Diagnostic current substrates, using the intended craft formula where it exists.
extra=[]
for label,mid,profile in [('dark-beige','ph_bz04_beige_wall_002',None),('leather-as-cloth','ph_bz04_fabric_leather_02','cloth'),('mossy-links','bz04_cobblestone_pavement',None),('wall-scan-as-trim','ph_bz04_stone_trim_white',None)]:
 a=load(source(mid));m=D['materials'][mid]
 if profile:
  c=D['craftStandards']['materials'][profile];value=hexlin(c['paintSrgb'])*((1-c['grainMix'])+c['grainMix']*a)
 else:value=a*hexlin(m['tintHex'])
 extra.append({'id':label,'sourceMaterialId':mid,'raw':save(a,label+'-raw.png'),'current':save(value,label+'-current.png')})
report={'status':'EXPERIMENTAL REVIEW SWATCHES - NOT APPROVED SHADER VALUES','sourceDesignSha256':hashlib.sha256((ROOT/'docs/map-design/construction/design.json').read_bytes()).hexdigest(),'method':'sRGB converted to linear once. Proposed paint is solved against the median central-luminance source field with the bounded paint formula; grain is reduced only to keep paint <=1 with headroom. This extends the existing craft approach experimentally to walls/floors, not an already implemented runtime path. Original sources untouched.','families':result,'diagnostics':extra}
(OUT/'calibrated-swatches.json').write_text(json.dumps(report,indent=2)+'\n');print('Created16 proposed base-color studies and4 current-substrate diagnostics. Active files unchanged.')
