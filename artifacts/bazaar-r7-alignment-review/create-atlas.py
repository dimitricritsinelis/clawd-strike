#!/usr/bin/env python3
"""Build the R7 atlas from final generated SVGs and fresh perspective notes.

Use the bundled Python runtime (ReportLab, Pillow, pypdf). Node/Sharp converts
SVGs automatically into tmp/pdfs/bazaar-r7-atlas. --layout-test creates temporary
source drawings and marked perspective placeholders; it cannot write the final PDF.
"""
import argparse
import hashlib
import html
import json
import math
import subprocess
import sys
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/map-design/construction'
sys.path.insert(0,str(DOC))
import gen
FINAL=ROOT/'output/pdf/bazaar-r7-complete-visual-atlas.pdf'
DEFAULT_ZONES='SPAWN_A_COURTYARD SPICE_STREET FOUNTAIN_COURT TEXTILE_ARCADE RUG_GATE SPAWN_B_COURTYARD CARAVAN_COURT TEA_TERRACE DYERS_ALLEY COVERED_SOUK DYERS_DOGLEG NORTH_COURT'.split()
INK=HexColor('#24353a');MUTED=HexColor('#62777a');PAPER=HexColor('#f4f1e8')
FONT='/System/Library/Fonts/Supplemental/Arial.ttf'
pdfmetrics.registerFont(TTFont('Atlas',FONT));pdfmetrics.registerFont(TTFont('AtlasBold','/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
BODY=ParagraphStyle('body',fontName='Atlas',fontSize=10,leading=13,textColor=INK)
SMALL=ParagraphStyle('small',parent=BODY,fontSize=9,leading=12)

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def clean(value):return str(value).replace('\u2011','-').replace('\u2013','-').replace('\u2014','-')
def para(value,style=BODY):return Paragraph(html.escape(clean(value)),style)
def title(zone):return zone.replace('_',' ').title()
def wrapped(c,value,x,y,width,size=12,leading=16,color=INK):
    style=ParagraphStyle('caption',fontName='Atlas',fontSize=size,leading=leading,textColor=color)
    p=para(value,style);_,h=p.wrap(width,10000);p.drawOn(c,x,y-h);return h

def fit_image(c,path,box):
    x,y,w,h=box;im=ImageReader(str(path));iw,ih=im.getSize();scale=min(w/iw,h/ih)
    c.drawImage(im,x+(w-iw*scale)/2,y+(h-ih*scale)/2,width=iw*scale,height=ih*scale,mask='auto')

def table_for(rows):
    headers=['Face / key','Stable opening ID','Level','Axis m','Width m','Sill z m','Head z m','Complete scheduled closure']
    data=[[para(v) for v in headers]]+[[para(v) for v in row] for row in rows]
    t=Table(data,colWidths=[68,250,48,68,65,65,65,471],repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),HexColor('#e3e7df')),('LINEBELOW',(0,0),(-1,0),.6,MUTED),('LINEBELOW',(0,1),(-1,-1),.3,HexColor('#d2d8d5')),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    return t

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=FINAL)
    parser.add_argument('--drawings',type=Path,default=DOC/'drawings')
    parser.add_argument('--perspectives',type=Path,default=ROOT/'artifacts/bazaar-r7-alignment-review/perspectives')
    parser.add_argument('--layout-test',action='store_true')
    args=parser.parse_args()
    if args.layout_test and args.output.resolve()==FINAL.resolve():raise SystemExit('--layout-test requires a scratch --output path')
    data=json.loads((DOC/'design.json').read_text());coverage=gen.coverage_index(json.loads((DOC/'coverage.json').read_text()))
    cache=ROOT/'tmp/pdfs/bazaar-r7-atlas';cache.mkdir(parents=True,exist_ok=True)
    drawings=args.drawings
    if args.layout_test:
        drawings=cache/'layout-test-svg';drawings.mkdir(exist_ok=True)
        issue={**data['issue'],'buildings':data['buildings'],'landmarks':data.get('landmarks',[])}
        for a in data['areas']:
            for face in gen.FACE_ORDER:(drawings/f"{a['zone'].lower()}-elevation-{face}.svg").write_text(gen.elevation_svg(issue,a,coverage,data['materials'],(face,)))
        covdoc=json.loads((DOC/'coverage.json').read_text())
        (drawings/'master-plan.svg').write_text(gen.master_plan_svg(issue,data['areas'],gen.zone_rects(covdoc),data['materials'],data['buildings'],data['skyline']))
        (drawings/'roof-ownership-context.svg').write_text(gen.roof_context_svg(data))
        (drawings/'skyline-compass-context.svg').write_text(gen.skyline_context_svg(data))
        b=next(a for a in data['areas'] if a['zone']=='SPAWN_B_COURTYARD')
        (drawings/'spawn_b_courtyard-character.svg').write_text(gen.b_character_svg(b,data['materials']))
        (drawings/'spawn_b_courtyard-finish.svg').write_text(gen.b_finish_svg(b,data['materials']))
    notes_path=args.perspectives/'render-notes.json'
    if args.layout_test:notes={'views':[]}
    else:
        notes=json.loads(notes_path.read_text())
        assert notes['designSha256']==digest(DOC/'design.json'),'Perspective source hash differs from active design'
        assert set(v['zone'] for v in notes['views'])==set(DEFAULT_ZONES),'Expected all 12 fresh perspectives'
        assert len(notes['views'])==12,'Expected one perspective per review zone'
    perspectives={v['zone']:v for v in notes['views']}
    sources={}
    needed=['master-plan','roof-ownership-context','skyline-compass-context','spawn_b_courtyard-character','spawn_b_courtyard-finish']
    needed += [f"{a['zone'].lower()}-elevation-{f}" for a in data['areas'] for f in gen.FACE_ORDER]
    jobs=[]
    for name in needed:
        p=drawings/(name+'.svg');sources[str(p.relative_to(ROOT))]=digest(p)
        target=cache/(name+'.png');hashfile=cache/(name+'.sha256')
        if not target.exists() or not hashfile.exists() or hashfile.read_text()!=digest(p):jobs.append({'input':str(p),'output':str(target),'hashfile':str(hashfile),'hash':digest(p)})
    jobs_path=cache/'svg-jobs.json';jobs_path.write_text(json.dumps(jobs))
    if jobs:
        sharp=ROOT/'node_modules/.pnpm/sharp@0.34.5/node_modules/sharp'
        script="const fs=require('fs');const sharp=require(process.argv[1]);(async()=>{for(const j of JSON.parse(fs.readFileSync(process.argv[2],'utf8'))){await sharp(j.input,{density:144}).png().toFile(j.output);fs.writeFileSync(j.hashfile,j.hash)}})().catch(e=>{console.error(e);process.exit(1)})"
        subprocess.run(['node','-e',script,str(sharp),str(jobs_path)],check=True)
    sheets=[];area_pages={};expected_ids=[]
    for key,label in [('master-plan','Master plan'),('roof-ownership-context','Roof ownership and interfaces'),('skyline-compass-context','Skyline compass context')]:sheets.append({'kind':'plate','key':key,'label':label,'image':cache/(key+'.png')})
    for a in data['areas']:
        zone=a['zone'];area_pages[zone]=len(sheets)+2
        sheets.append({'kind':'area','key':zone,'label':title(zone)+' - four-face overview','area':a})
        rows=[]
        for face in gen.FACE_ORDER:
            seq=0
            for pi,p in enumerate(gen.face_parcels(a,face),1):
                for o in gen.opening_rows(p):
                    seq+=1;expected_ids.append(o['id'])
                    rows.append([face.title()+f' O{pi}.{seq}',o['id'],str(o.get('storey','-')),gen.fmt(o.get('axisM',o.get('alongM'))),gen.fmt(o.get('widthM')),gen.fmt(o.get('sillM')),gen.fmt(o.get('headM')),o.get('closure',o.get('kind','opening'))])
        if rows:
            # Split by measured table height, keeping every closure complete and the header repeated.
            tables=[table_for(rows)];chunks=[]
            while tables:
                current=tables.pop(0);parts=current.split(1200,900)
                assert parts,'A single opening row exceeds a full schedule page'
                chunks.append(parts[0]);tables=parts[1:]+tables
            for i,t in enumerate(chunks):sheets.append({'kind':'schedule','key':zone+f'-schedule-{i+1}','label':title(zone)+f' - complete opening schedule {i+1}/{len(chunks)}','table':t,'area':a})
        if zone in DEFAULT_ZONES:sheets.append({'kind':'perspective','key':zone+'-perspective','label':title(zone)+' - schematic perspective','zone':zone})
    for key,label in [('spawn_b_courtyard-character','B courtyard architecture and assembly'),('spawn_b_courtyard-finish','B courtyard finish detail')]:sheets.append({'kind':'plate','key':key,'label':label,'image':cache/(key+'.png')})
    total=len(sheets)+1;args.output.parent.mkdir(parents=True,exist_ok=True)
    c=canvas.Canvas(str(args.output),pagesize=(1400,1100),pageCompression=1)
    c.setTitle('Bazaar R7 - Complete visual atlas');c.setAuthor('Clawdstrike design documentation');c.showOutline()
    def background(w,h):c.setPageSize((w,h));c.setFillColor(PAPER);c.rect(0,0,w,h,fill=1,stroke=0)
    def footer(label,page,w):
        c.setFillColor(MUTED);c.setFont('Atlas',10);c.drawString(35,22,'R7 | Documentation target, not game acceptance | '+label);c.drawRightString(w-35,22,f'{page} / {total}')
        if page>1:c.linkRect('Contents','contents',(30,12,450,38),relative=0,thickness=0)
    background(1400,1100);c.bookmarkPage('contents');c.addOutlineEntry('Contents','contents',0)
    c.setFillColor(INK);c.setFont('AtlasBold',32);c.drawString(45,1030,'Bazaar R7 | Complete visual atlas')
    wrapped(c,'25 areas / 100 face graphics / all measured openings / 12 fresh schematic perspectives / roof, skyline and B details',45,1000,1300,15,20)
    wrapped(c,'Diagrams preserve the source envelopes. Overview pages index shape, floor and ownership; companion schedules retain complete closures and measurements. Perspectives simplify stock, craft and lighting and are not game renders.',45,957,1300,12,17)
    for i,(key,label) in enumerate([('master-plan','Master plan'),('roof-ownership-context','Roof ownership and interfaces'),('skyline-compass-context','Skyline compass context')]):
        y=880-i*27;c.setFont('AtlasBold',13);c.drawString(45,y,label);c.setFont('Atlas',12);c.drawString(410,y,str(i+2));c.linkRect(label,key,(42,y-7,450,y+17),relative=0,thickness=0)
    for i,a in enumerate(data['areas']):
        col=i//13;row=i%13;x=45+col*680;y=758-row*43;zone=a['zone'];start=area_pages[zone]
        later=next((area_pages[b['zone']] for b in data['areas'][i+1:]),total-1);end=later-1
        c.setFont('AtlasBold',15);c.drawString(x,y,f'{i+1:02}  {title(zone)}');c.setFont('Atlas',12);c.drawRightString(x+610,y,f'{start}-{end}' if end>start else str(start));c.linkRect(title(zone),zone,(x,y-9,x+625,y+21),relative=0,thickness=0)
    c.setFont('AtlasBold',14);c.drawString(45,158,'B architecture / finish: '+str(total-1)+' / '+str(total))
    c.linkRect('B architecture','spawn_b_courtyard-character',(42,144,380,178),relative=0,thickness=0)
    wrapped(c,'Exact camera positions, yaw, pitch, vertical FOV and source view IDs accompany every perspective. Roof and skyline plates are envelope/coordination drawings; dimensions remain in absolute design metres.',45,124,1280,12,17)
    if args.layout_test:wrapped(c,'LAYOUT TEST - fresh perspectives pending; this file is not deliverable.',45,69,1280,15,18)
    footer('Contents',1,1400);c.showPage()
    for page,s in enumerate(sheets,2):
        kind=s['kind'];w,h=(2000,1500) if kind=='area' else (1270,1080) if kind=='schedule' else (1660,1100) if kind=='perspective' else (2000,1720)
        background(w,h);c.bookmarkPage(s['key']);c.addOutlineEntry(s['label'],s['key'],0)
        c.setFillColor(INK);c.setFont('AtlasBold',24);c.drawString(38,h-48,s['label'])
        if kind=='plate':fit_image(c,s['image'],(30,50,w-60,h-120))
        elif kind=='area':
            a=s['area'];wrapped(c,'Four measured face graphics. Complete stable opening IDs, axes, sill/head levels and closures are on the companion schedule.',40,h-75,w-80,14,19)
            for i,face in enumerate(gen.FACE_ORDER):
                px=40+(i%2)*980;py=740-(i//2)*650
                parcels=gen.face_parcels(a,face);cov=coverage.get((a['zone'],face))
                span=(cov.start,cov.end) if cov else (0,max([gen.num((p.get('interval') or [0,1])[1]) for p in parcels] or [1]))
                max_top=max([gen.num(p.get('roof',{}).get('capTopM'),gen.num(p.get('wallTopM'))) for p in parcels]+[7.0]+[e['root'][2]+e['heightM'] for e in a.get('landscapeElements',[]) if face in e['viewFaces']])
                scale=min(1090/max(span[1]-span[0],1),415/max(max_top,1));crop_width=min(1170,max(650,90+(span[1]-span[0])*scale))
                src=cache/f"{a['zone'].lower()}-elevation-{face}.png"
                # SVG converter density is exactly 2x; omit the separate right parcel key.
                with Image.open(src) as im:
                    crop=im.crop((96,230,round((48+crop_width)*2),1370));image=ImageReader(crop);iw,ih=crop.size
                    fit=min(930/iw,510/ih);c.drawImage(image,px+(930-iw*fit)/2,py+90+(510-ih*fit)/2,width=iw*fit,height=ih*fit)
                floor=a['floor'];floor_label=(f"{gen.fmt(floor.get('startElevationM'))} to {gen.fmt(floor.get('endElevationM'))} m" if floor.get('kind')=='ramp' else f"+{gen.fmt(floor.get('elevationM'))} m")
                c.setFillColor(INK);c.setFont('AtlasBold',16);c.drawString(px,py+65,face.title()+f' | span {gen.fmt(span[0])} to {gen.fmt(span[1])} m | floor '+floor_label)
                caps='; '.join(p['id']+': cap '+gen.fmt(p.get('roof',{}).get('capTopM'))+' m' for p in parcels) or 'No facade parcel; preserve scheduled connector / zero-build interface.'
                wrapped(c,caps,px,py+46,930,11,15)
        elif kind=='schedule':
            wrapped(c,'Metres. Axis is the absolute plan coordinate; sill and head are absolute z. Level is the authored storey index. O keys match the elevation on this face.',35,h-72,w-70,11,15)
            table=s['table'];_,th=table.wrap(1200,900);table.drawOn(c,35,h-133-th)
        elif kind=='perspective':
            zone=s['zone'];view=perspectives.get(zone)
            if view:
                path=args.perspectives/view['file'];sources[str(path.relative_to(ROOT))]=digest(path)
                fit_image(c,path,(35,170,w-70,h-260))
                pos=view['position'];caption=f"{view['id']} | design XYZ ({', '.join(f'{v:.3f}' for v in pos)}) m | yaw {view['yawDeg']:.2f} deg | pitch {view['pitchDeg']:.2f} deg | vertical FOV {view['verticalFovDeg']:.2f} deg"
                caption+=' | '+str(view.get('resolution','see source notes'))+' px'
                wrapped(c,caption,40,145,w-80,13,18)
                wrapped(c,'Schematic source geometry and diagram colors. Stock and craft are simplified; no source scan textures or game lighting. Nearby districts provide occlusion; distant skyline is omitted here and indexed separately.',40,95,w-80,12,17)
            else:wrapped(c,'LAYOUT TEST: fresh R7 perspective and exact camera caption pending.',80,h/2,w-160,24,30)
        footer(s['label'],page,w);c.showPage()
    c.save();pdf=PdfReader(args.output);assert len(pdf.pages)==total;assert len(pdf.outline)==total
    assert all(pdf.get_destination_page_number(v)==i for i,v in enumerate(pdf.outline))
    text='\n'.join(page.extract_text() or '' for page in pdf.pages)
    assert all(oid in text for oid in expected_ids),'Missing opening ID in PDF text'
    assert all(title(a['zone']) in (pdf.pages[0].extract_text() or '') for a in data['areas'])
    receipt={'pdf':str(args.output),'layoutTest':args.layout_test,'designSha256':digest(DOC/'design.json'),'pageCount':total,'bookmarks':len(pdf.outline),'areas':len(data['areas']),'faceGraphics':100,'openingRows':len(expected_ids),'perspectives':len(perspectives),'sourceHashes':sources,'pages':[{'page':i+2,'kind':s['kind'],'key':s['key'],'label':s['label']} for i,s in enumerate(sheets)]}
    (args.output.with_suffix('.verification.json')).write_text(json.dumps(receipt,indent=2)+'\n')
    print(f'PASS {total} pages; {len(expected_ids)} complete opening rows; {len(perspectives)} perspectives; {total} correct bookmarks. {args.output}')

if __name__=='__main__':main()
