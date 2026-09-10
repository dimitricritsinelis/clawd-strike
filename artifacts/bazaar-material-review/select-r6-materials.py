from pathlib import Path
import json,copy,hashlib
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent;D=json.loads((R/'docs/map-design/construction/design.json').read_text());P=json.loads((O/'material-art-proposal.json').read_text());S=O/'r6-samples';S.mkdir(exist_ok=True)
def lin(a):return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
def srgb(a):return np.where(a<=.0031308,12.92*a,1.055*np.maximum(a,0)**(1/2.4)-.055)
def rgb(h):return np.array([int(h[i:i+2],16)/255 for i in (1,3,5)])
def hx(a):return '#'+''.join(f'{round(float(v)*255):02x}' for v in np.clip(a,0,1))
M=np.array([[.4124564,.3575761,.1804375],[.2126729,.7151522,.0721750],[.0193339,.1191920,.9503041]])
def lab(h):
 xyz=M@lin(rgb(h))/np.array([.95047,1,1.08883]);f=np.where(xyz>(6/29)**3,np.cbrt(xyz),xyz/(3*(6/29)**2)+4/29);return np.array([116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])])
def invlab(v):
 f=np.array([(v[0]+16)/116+v[1]/500,(v[0]+16)/116,(v[0]+16)/116-v[2]/200]);xyz=np.where(f>6/29,f**3,3*(6/29)**2*(f-4/29))*np.array([.95047,1,1.08883]);return hx(srgb(np.linalg.inv(M)@xyz))
def change(h,L=None,C=None):
 v=lab(h)
 if L is not None:v[0]=L
 if C is not None:v[1:]*=C/np.linalg.norm(v[1:])
 return invlab(v)
colors={'sand-plaster':change('#cbb38b',L=77),'dressed-sandstone':change('#c5b18d',L=70),'quiet-flags':change('#c7b18b',L=68.5),'rough-service-paving':change('#baa17a',L=64.5),'teal':change('#78978d',C=25),'indigo':change('#66778c',C=25)}
alias={'cream-plaster':'ph_bz04_painted_plaster_warm','sand-plaster':'ph_bz04_beige_wall_002','pale-lime':'ph_bz04_plastered_wall','faded-ochre':'ph_bz04_aged_plaster_ochre','faded-earth-red':'ph_bz04_red_plaster_weathered','dressed-sandstone':'ph_bz04_sandstone_blocks_05','service-stone':'ph_bz04_sandstone_blocks_06','quiet-flags':'bz04_court_limestone_flags_01','rough-service-paving':'bz04_large_sandstone_blocks_01','cream-woven-cloth':'ph_bz04_hessian_230'}
rows=[]
for f in P['palette']:
 if f['id'] not in alias and f['id'] not in ['teal','indigo','rust','timber','iron']:continue
 k=f['id'];mid={'bz04_craft_painted_timber':'ph_bz04_rough_pine_door','bz04_craft_dark_iron':'ph_bz04_rusty_metal_02'}.get(f['sourceMaterialId'],f['sourceMaterialId']);m=D['materials'][mid];files={a:str(Path(m['manifest']).parent/v) for a,v in m['textures'].items()};a=lin(np.asarray(Image.open(R/files['albedo']).convert('RGB'),float)/255);target=colors.get(k,f.get('targetAppearanceSrgb'));grain=.5
 if k in ['dressed-sandstone','service-stone','quiet-flags','rough-service-paving']:grain=.7
 if k in ['cream-woven-cloth','rust']:
  grain=.12;a=np.repeat((a@np.array([.2126,.7152,.0722]))[:,:,None],3,axis=2)
 if k in ['teal','indigo']:grain=0
 if k in ['timber','iron']:
  q=D['craftStandards']['materials']['warmTimber' if k=='timber' else 'iron'];grain=q['grainMix'];paint=rgb(q['paintSrgb']);target=None
 else:
  aim=lin(rgb(target));y=a@np.array([.2126,.7152,.0722]);lo,hi=np.quantile(y,[.1,.9]);central=np.median(a[(y>=lo)&(y<=hi)],axis=0);grain=min(grain,float(np.min((1-aim)/np.maximum(1-central,1e-6)))*.95);paint=srgb(aim/((1-grain)+grain*central))
 final=lin(paint)*((1-grain)+grain*a);dest=S/(k+'.png');Image.fromarray(np.uint8(np.clip(srgb(final),0,1)*255+.5)).save(dest)
 repeat=2.4 if k=='quiet-flags' else f.get('repeatM',m.get('tileSizeM',2))
 rows.append(dict(family=k,materialId=alias.get(k),sourceMaterialId=mid,sourceFiles=files,sourceHashes={t:hashlib.sha256((R/v).read_bytes()).hexdigest() for t,v in files.items()},desiredAppearanceSrgb=target,paintSrgb=hx(paint),paintLinear=[float(v) for v in lin(paint)],grainMix=float(grain),repeatM=repeat,normalScale=.18 if k in ['timber','cream-woven-cloth','rust'] else .15 if k in ['teal','indigo'] else m.get('normalScale',.3),roughness=.86 if k in ['timber','teal','indigo','iron'] else .94 if k in ['cream-woven-cloth','rust'] else m['roughness'],roughnessMode='ARM green multiplied by roughness scalar; not final constant roughness',metalness=.15 if k=='iron' else 0,sampleAlbedo=str(dest.relative_to(R)),sourceToAlbedo='paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear), source and paint decoded from sRGB once; bake output to sRGB once',macro='Retain current BZ04 per-source macro profile; no additional mask or repair allocation'))
# Exact mortar-free crop, mirrored 2x2 with tangent-normal component corrections.
m=D['materials']['ph_bz04_sandstone_blocks_05'];box=[340,195,740,290];cropfiles={}
for channel,file in m['textures'].items():
 im=Image.open(R/Path(m['manifest']).parent/file).convert('RGB').crop(box);arr=np.asarray(im).copy();tiles=[]
 for fy in [False,True]:
  rr=[]
  for fx in [False,True]:
   v=arr.copy()
   if fx:v=v[:,::-1].copy()
   if fy:v=v[::-1].copy()
   if channel=='normal':
    if fx:v[:,:,0]=255-v[:,:,0]
    if fy:v[:,:,1]=255-v[:,:,1]
   rr.append(v)
  tiles.append(np.concatenate(rr,axis=1))
 v=np.concatenate(tiles,axis=0)
 if channel=='albedo':
  a=lin(v.astype(float)/255);central=np.median(a.reshape(-1,3),axis=0);aim=lin(rgb('#c5b18d'));grain=.4;paint=aim/((1-grain)+grain*central);v=np.uint8(np.clip(srgb(paint*((1-grain)+grain*a)),0,1)*255+.5)
 dest=S/('trim-'+channel+'.png');Image.fromarray(v).save(dest);cropfiles[channel]=str(dest.relative_to(R))
trim=dict(materialId='ph_bz04_trim_sanded_01',sourceMaterialId='ph_bz04_sandstone_blocks_05',sourcePixelCropXYXY=box,sourceImageSizePx=[1024,1024],cropWorldSizeM=[.78125,.185546875],mirrorTileWorldSizeM=[1.5625,.37109375],recipe='Crop each original map identically; mirror 2x2 in X/Y. For mirrored tangent normal maps invert red on X mirror and green on Y mirror. Preserve originals. Orient crop X along trim member, Y across its face; do not stretch a wall image across sill.',albedoPaintSrgb=hx(srgb(paint)),albedoPaintLinear=paint.tolist(),grainMix=.4,desiredAppearanceSrgb='#c5b18d',roughness=.94,roughnessMode='ARM green times scalar',metalness=0,normalScale=.12,scope='Monolithic sills, threshold caps and single-piece trim faces only. Masonry arch rings retain coherent voussoir courses/joints; no mortar-free whole-ring override.',sampleFiles=cropfiles)
trim['sourceFiles']={k:str(Path(m['manifest']).parent/v) for k,v in m['textures'].items()};trim['sourceHashes']={k:hashlib.sha256((R/v).read_bytes()).hexdigest() for k,v in trim['sourceFiles'].items()};trim['exportName']='bz06_monolithic_stone_trim'
linen=copy.deepcopy(next(t for t in rows if t['family']=='cream-woven-cloth'));linen.update(family='fine-linen',materialId='ph_bz04_fine_linen',repeatM=.09,normalScale=.10,scope='Tea/domestic cushions and linen; reuse hessian scan at one third shade/sack weave scale. No leather seam or leather normal. Keep awnings and sacks at 0.27m.')
rows.append(linen)
for r in rows:
 if r['family'] in ['cream-woven-cloth','fine-linen','rust']:
  r['sourceInputMode']='neutral linear luminance replicated to RGB, weights0.2126/0.7152/0.0722';r['sourceToAlbedo']='Review bake equivalent: calibratedPaintLinear*((1-grainMix)+grainMix*linearSourceLuminance). Runtime construction uses shared neutral grain and calibrated per-part COLOR_0, white base.'
report=dict(status='R6 selected documentation recipes; bounded samples are not final-game approval',families=rows,trim=trim,accentMetrics={k:dict(hex=v,Lab=lab(v).tolist()) for k,v in colors.items() if k in ['teal','indigo']},changedTargets=colors,assignmentSources=['material-art-proposal.json','background-material-proposal.json','accent-assignments-proposal.json'])
(O/'r6-selected-materials.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(colors));print('selected families',len(rows))
