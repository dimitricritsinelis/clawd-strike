from pathlib import Path
import json,hashlib
ROOT=Path('/Users/dimitri2/Desktop/clawdstrike');OUT=ROOT/'artifacts/bazaar-material-review';D=json.loads((ROOT/'docs/map-design/construction/design.json').read_text());P=json.loads((OUT/'material-art-proposal.json').read_text());colors={p['family']:p.get('desiredAppearanceSrgb') for p in json.loads((OUT/'r6-selected-materials.json').read_text())['families']}
assign={a['buildingId']:a for a in P['buildingAssignments']};floors={a['zone']:a for a in P['floorAssignments']};points=[p for b in D['buildings'] for poly in b['footprintPolygons'] for p in poly];minx=min(p[0] for p in points);maxx=max(p[0] for p in points);miny=min(p[1] for p in points);maxy=max(p[1] for p in points)
parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1500" viewBox="0 0 1800 1500"><rect width="1800" height="1500" fill="#f4f1e8"/><style>text{font-family:Arial,sans-serif;fill:#24353a}.title{font-size:28px;font-weight:bold}.small{font-size:15px}</style><text x="44" y="52" class="title">R6 selected material ownership and paving routes</text><text x="44" y="80" class="small">Color diagram only. Existing gameplay and building envelopes retained. Existing bases, sills and retaining stone remain separate.</text>']
for panel,(name,mode) in enumerate([('Building wall families','walls'),('Paving families','floors')]):
 px=55+panel*880;py=125;s=min(650/(maxx-minx),1100/(maxy-miny));x=lambda a:px+(a-minx)*s;y=lambda a:py+(maxy-a)*s
 parts.append(f'<text x="{px}" y="{py-16}" class="title">{name}</text>')
 for b in D['buildings']:
  color=colors[assign[b['id']]['proposedPalette']] if mode=='walls' else '#dbd4c7'
  for poly in b['footprintPolygons']:
   pts=' '.join(f'{x(a):.2f},{y(c):.2f}' for a,c in poly);parts.append(f'<polygon points="{pts}" fill="{color}" stroke="#99876c" stroke-width="1"/>')
 for i,a in enumerate(D['areas'],1):
  r=a['rect'];color=colors[floors[a['zone']]['proposedPalette']] if mode=='floors' else '#f8f5ed'
  parts.append(f'<rect x="{x(r["x"]):.2f}" y="{y(r["y"]+r["h"]):.2f}" width="{r["w"]*s:.2f}" height="{r["h"]*s:.2f}" fill="{color}" stroke="#7e847d"/><text x="{x(r["x"]+r["w"]/2):.2f}" y="{y(r["y"]+r["h"]/2):.2f}" text-anchor="middle" class="small">{i}</text>')
 legend=['cream-plaster','sand-plaster','pale-lime','faded-ochre','faded-earth-red','dressed-sandstone','service-stone'] if mode=='walls' else ['quiet-flags','rough-service-paving']
 for i,key in enumerate(legend):
  yy=1260+i*27;parts.append(f'<rect x="{px}" y="{yy-16}" width="24" height="19" fill="{colors[key]}"/><text x="{px+34}" y="{yy}" class="small">{key.replace("-"," ")}</text>')
parts.append('</svg>');(OUT/'material-ownership-map-r6.svg').write_text('\n'.join(parts))
