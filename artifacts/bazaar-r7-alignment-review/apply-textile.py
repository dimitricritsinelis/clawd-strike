"""Apply R7 centered Textile and coordinated Tea reverse openings to a supplied design."""
import argparse,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--design',type=Path,required=True);args=p.parse_args();d=json.loads(args.design.read_text())
bs={b['id']:b for b in d['buildings']};ps={p['id']:p for a in d['areas'] for f in a['faces'] for p in f['parcels']}
mid={'T_W_LOOM':50.825,'T_W_DYER':56.375,'T_W_FOLDS':61.55,'T_E_LOOM':50.825,'T_E_GALLERY':56.375,'T_E_CART':61.55}
reverse={'tr-e-L1-W1':(50,1.35),'tr-e-L1-W3':(54,1.35),'tr-e-L2-W1':(52,1.25),'tr-e-L2-CENTER':(52,1.25),'TT-SITTING-GALLERY':(60,3.8),'tt-e-L2-W1':(58.545,2.3),'tt-e-L2-W3':(62.055,1.1)}
west='BLD_TEXTILE_WEST';east='BLD_TEXTILE_EAST'
# Upper central and north work/sitting areas are one actual shared hall per level.
b=bs[west]
for level in [1,2]:
 central=next(r for r in b['rooms'] if r['id']==f'{west}:L{level}:CENTRAL')
 north=next((r for r in b['rooms'] if r['id']==f'{west}:L{level}:NORTH'),None)
 central['boundsXYZ']['min'][1]=53.2
 central['boundsXYZ']['max'][1]=63.9
 next(r for r in b['rooms'] if r['id']==f'{west}:L{level}:SOUTH')['boundsXYZ']['max'][1]=53.0
 central['use']='Shared textile work and sitting hall spanning the central and north frontage fields; its rear Tea Terrace facade has a centered gallery or balanced paired lights'
 central['representedByParcelIds']=sorted(set(central.get('representedByParcelIds',[])+(['T_W_FOLDS','R_S_CAP'] if north else [])))
 b['rooms']=[r for r in b['rooms'] if r['id']!=f'{west}:L{level}:NORTH']
 for p in ps.values():
  for o in p['openings']:
   if o.get('roomId')==f'{west}:L{level}:NORTH':o['roomId']=central['id']
for p in ps.values():
 if p['buildingId'] not in [west,east]:continue
 for o in p['openings']:
  if o['storey']>0 and p['id'] in mid:
   o['alongM']=o['axisM']=mid[p['id']]
   o['alignmentReason']=f"Upper group centered in facade field {p['interval'][0]}..{p['interval'][1]} at {mid[p['id']]}; ground trade and staff thresholds retain their independent positions."
  if o['id'] in reverse:
   axis,width=reverse[o['id']];o['alongM']=o['axisM']=axis;o['widthM']=width
   if o['id']=='tr-e-L2-W1':o['id']='tr-e-L2-CENTER'
   o['alignmentReason']='The rear facade upper arrangement is balanced within its complete field; it is independent of the ground staff-door position.'
 for o in p['openings']:
  if o['storey']>0 and p['id'] in mid:o['purpose']='Upper textile work, sitting or dry-stock room daylight centered in its facade field' if o['kind']=='window' else 'High ventilation centered in the end stock-room facade field'
 if p['id'] in mid:
  p['purpose']='Continuous textile building with upper room groups centered in each facade field; ground workfront and access positions remain unchanged'
  p['windowComposition']='Center the complete upper group within the facade field, using the same axis through upper storeys. Ground doors and shop recesses do not set upper centering.'
  p['structuralGrid']['program']=p['windowComposition']
 if p['id']=='tr-e':
  p['purpose']='Rear household facade with a balanced lower pair at50/54 and one centered upper light at52 within the48..56 field'
  p['windowComposition']=p['purpose']
 if p['id']=='tt-e':
  p['purpose']='Rear sitting hall with its3.8m gallery centered at60 and upper lights of2.3m/1.1m at58.545/62.055, with their combined outside bounds centered at60 within the56..64 field; ground service and seat remain unchanged'
  p['windowComposition']=p['purpose']
 p['structuralGrid']['axesM']=sorted({o['alongM'] for o in p['openings']})
for ident in [west,east]:
 b=bs[ident];members=[ps[i] for i in b['memberParcelIds']]
 b['architecturalIntent']['composition']='Upper Textile groups center in the three complete facade fields at50.825,56.375 and61.55; independent ground doors and trade recesses remain fixed.'
 if ident==west:b['architecturalIntent']['composition']+=' South upper rooms and one shared central/north work-sitting hall coordinate the reverse faces. Tea Ramp has a balanced lower pair and centered upper light; Tea Terrace has a centered gallery and balanced upper group centered by its combined outside edges.'
 b['alignmentRule']='Center upper groups in their facade fields; opposite facades may have independently centered compositions serving the same canonical room. Ground access does not determine upper axes.'
 b['asymmetryReason']='Different front and reverse opening groups serve the shared room from separately centered facade fields; all ground access remains fixed.'
 b['subordinateAxesM']=sorted({o['alongM'] for q in members for o in q['openings'] if o['storey']>0})
 for r in b['rooms']:
  if r['storey']>0:
   if r['id'].endswith(':SOUTH'):r['use']='South textile household room with centered front group and independently balanced Tea Ramp rear lighting; Fountain return serves the same room'
   r['servedOpeningIds']=[o['id'] for q in members for o in q['openings'] if o.get('roomId')==r['id']]
 for e in b['elevations']:
  q=ps[e['parcelId']];e['openingIds']=[o['id'] for o in q['openings']];e['axesM']=sorted({o['alongM'] for o in q['openings']})
 for level in b['storeys']:level['openingDatums']=[{k:o[k] for k in ['id','sillM','headM','purpose']} for q in members for o in q['openings'] if o['storey']==level['index']]
 for row in b['floorAxisSchedule']:
  for f in row['facades']:
   oo=[o for o in ps[f['parcelId']]['openings'] if o['storey']==row['storey']];f['openingIds']=[o['id'] for o in oo];f['axesM']=sorted({o['alongM'] for o in oo})
  row['mainFacadeAxesM']=sorted({o['alongM'] for q in members if q['id'] in b['mainFacade']['parcelIds'] for o in q['openings'] if o['storey']==row['storey']})
for a in d['areas']:
 for row in a.get('craftSchedule',{}).get('boundaryAndFloor',[]):
  if row['parcelId'] in list(mid)+['tr-e','tt-e']:row['geometry']=ps[row['parcelId']]['windowComposition']
 for f in a['faces']:
  relevant=[q for q in f['parcels'] if q['id'] in list(mid)+['tr-e','tt-e']]
  if relevant:f['windowComposition']['designIntent']=' '.join(q['windowComposition'] for q in relevant)
args.design.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print('R7 Textile/Tea centering applied; canonical central+north upper rooms merged; ground program unchanged')
