"""Create the review document from inspected evidence. No active design mutations."""
from pathlib import Path
import json
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PDF = ROOT / 'output/pdf/bazaar-material-review.pdf'
PDF.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial', '/System/Library/Fonts/Supplemental/Arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold')
W, H = 1190, 842
INK, MUTED, PAPER, LINE = '#24353a', '#536b6e', '#f4f1e8', '#c3c0b3'
c = canvas.Canvas(str(PDF), pagesize=(W, H))
c.setTitle('Bazaar | R6 materials retained in the R7 design')
c.setAuthor('Codex | Art, engineering and asset review')
pages = []
def para(text, x, y, width, size=15, bold=False, color=INK, max_h=None):
    style = ParagraphStyle('body', fontName='Arial-Bold' if bold else 'Arial', fontSize=size,
                           leading=size*1.38, textColor=HexColor(color), spaceAfter=0)
    p = Paragraph(text, style)
    _, h = p.wrap(width, H)
    if max_h is not None and h > max_h:
        raise ValueError(f'Text overflow: {text[:90]} ({h} > {max_h})')
    p.drawOn(c, x, H-y-h)
    return y+h
def pic(path, x, y, width, height, border=False):
    path = Path(path)
    if not path.is_absolute(): path = ROOT/path
    iw, ih = Image.open(path).size
    s = min(width/iw, height/ih)
    dw, dh = iw*s, ih*s
    c.drawImage(str(path), x+(width-dw)/2, H-y-dh, width=dw, height=dh, mask='auto')
    if border:
        c.setStrokeColor(HexColor(LINE)); c.rect(x+(width-dw)/2, H-y-dh, dw, dh)
    return dh
def page(title, subtitle):
    if pages: c.showPage()
    pages.append(title)
    c.setFillColor(HexColor(PAPER)); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.bookmarkPage(f'p{len(pages)}'); c.addOutlineEntry(title, f'p{len(pages)}', 0)
    para(title, 42, 30, 1106, 27, True)
    para(subtitle, 42, 73, 1106, 12, color=MUTED)
    c.setStrokeColor(HexColor(LINE)); c.line(42, H-108, W-42, H-108)
    para('R6 MATERIALS RETAINED IN R7 | Alignment revision only | 10 September 2026', 42, 811, 1000, 10, color=MUTED)
    para(f'{len(pages):02}', 1110, 811, 35, 10, color=MUTED)
def rule(x, y, width):
    c.setStrokeColor(HexColor(LINE)); c.line(x, H-y, x+width, H-y)
def note(title, body, x, y, width):
    y = para(title, x, y, width, 17, True)+7
    return para(body, x, y, width, 14)+20

import hashlib
D = json.loads((ROOT/'docs/map-design/construction/design.json').read_text())
R = json.loads((OUT/'r6-selected-materials.json').read_text())
F = {f['family']:f for f in R['families']}
S = json.loads((OUT/'calibrated-swatches.json').read_text())
WEAR = D['craftStandards']['wearIntentByDistrict']['districts']
sha = hashlib.sha256((ROOT/'docs/map-design/construction/design.json').read_bytes()).hexdigest()

page('Bazaar | R6 materials retained in R7', 'Warm, sun-faded surfaces; clearer ground and wall separation; purposeful color and local wear.')
pic('docs/map-design/refs/bazaar_main_hall_reference.png',42,132,655,450)
para('FOUNDING REFERENCE',42,592,655,12,True,MUTED)
para('Cream, sand and pale ochre remain the broad fields. Related stone and paving values provide separation. Teal, indigo and rust belong to selected joinery, cloth and goods. Minor plaster erosion and sandy contacts convey a maintained desert bazaar.',42,616,655,16)
y=note('Integrated into the engineering source','R7 retains every selected R6 material assignment and recipe. This revision changes window alignment only. Sources, colors, physical UV repeats and export bindings remain in design.json and runtime-materials.md.',732,132,416)
y=note('Resolved samples','Fine linen uses the existing woven source at 0.09 m repeat. Solid-stone sills use an exact mortar-free crop, with normal-correct mirroring. Masonry arch rings retain coherent joints.',732,y,416)
y=note('Stronger color without darker paint','Teal and indigo gain chroma while retaining their previous approximate lightness. Shade comparisons show both before and selected colors. Owner assignments stay deliberate.',732,y,416)
y=note('Implementation boundary','These are selected design recipes and controlled material studies. Original source assets and the game are unchanged. The first area build still needs the consolidated game review.',732,y,416)

page('01 | Resolved source choices','Raw substrate and the former intended base color are historical comparisons. The selected treatment is now recorded in R6.')
for x,label in zip([365,590,815],['RAW SOURCE','FORMER BASE COLOR','SELECTED TREATMENT']):para(label,x,126,210,11,True,MUTED)
rows=[('Dark beige alias','The alias now resolves to the existing quieter plaster source. The selected bounded calibration makes the source produce the intended sand appearance.','sand-plaster'),('Leather used as linen','Replaced by the existing woven source. Linen and sackcloth share source files but use different physical repeats and normal strengths.','fine-linen'),('Mossy link paving','Public routes use quiet flagstone at one 2.4 m repeat. Rougher service paving remains a separate related family.','quiet-flags'),('Wall joints across solid trim','An exact crop from one stone removes mortar from monolithic sills and straight trim. Deliberately assembled arch rings keep their joints.',None)]
for i,(old,(title,body,alternative)) in enumerate(zip(S['diagnostics'],rows)):
 y=151+i*154;para(title,42,y,292,17,True);para(body,42,y+30,292,13,max_h=110)
 pic(old['raw'],365,y,195,129,True);pic(old['current'],590,y,195,129,True)
 pic(F[alternative]['sampleAlbedo'] if alternative else R['trim']['sampleFiles']['albedo'],815,y,195,129,True);rule(42,y+145,1106)
para('The source names are historical identifiers, not evidence of the surface type. Original source images and provenance remain unchanged. All new images here are derived design samples.',42,781,1106,10,color=MUTED)

roles={
'cream-plaster':'Trowelled cream is the principal warm household/trade field. Retain existing low-amplitude macro behavior.',
'sand-plaster':'Selected quieter plaster replaces the dark beige substrate. One owner field wraps its adjoining walls.',
'pale-lime':'Light relief for civic/service lime fields. Avoid near-white final output.',
'faded-ochre':'Concentrated at the existing work compounds, not an orange cast across the map.',
'faded-earth-red':'A few selected owners retain the muted merchant/household red.',
'dressed-sandstone':'Related masonry value distinct from plaster. No compulsory dark base stripe on every owner.',
'service-stone':'Keep the layered source in its selected supporting roles. Do not spread it onto new landmarks.',
'quiet-flags':'Public routes use one 2.4 m repeat, about 0.6 m courses. Flush joins and coherent unit scale.',
'rough-service-paving':'Rougher blocks follow service circulation at 2.6 m repeat. No enlarged units for artificial variation.',
'cream-woven-cloth':'Shade and sackcloth: 0.27 m repeat, normal 0.18. Neutral grain receives the desired color once.',
'fine-linen':'Domestic/tea linen: 0.09 m repeat, normal 0.10. Same source, finer physical weave; no leather seams.',
'timber':'Retain warm timber paint and bounded grain. UVs follow individual member length; retain source normal relief.',
'teal':'Selected #5d9c8a increases chroma at approximately the old L*60. Existing assigned joinery only.',
'indigo':'Selected #53799f increases chroma at approximately the old L*49. Existing assigned joinery only.',
'rust':'Only existing Spice shade SHADE_S_W_SHOP_1 gains this rust. Other shades stay cream; existing stock colors remain.',
'iron':'Retain dark restrained hardware. Use its explicit metalness and roughness recipe, with accidental map connections removed.'}
for n,group in enumerate([R['families'][:8],R['families'][8:]]):
 page(f'0{n+2} | Selected palette and physical surface roles','Left: source substrate. Right: selected base-color sample. Desired appearance is not the paint multiplier; construction values are separately recorded.')
 for i,f in enumerate(group):
  x=42+(i%2)*570;y=127+(i//2)*166;key=f['family'];para(key.replace('-',' ').title(),x,y,527,16,True)
  raw=f.get('sourceFiles',{}).get('albedo') or next(q['raw'] for q in S['families'] if q['id']==key)
  pic(raw,x,y+28,110,105,True);pic(f['sampleAlbedo'],x+121,y+28,110,105,True)
  target=f.get('desiredAppearanceSrgb');label='Desired appearance '+target if target else 'Retained R5 craft recipe'
  para(label,x+246,y+28,280,12,True);para(escape(roles[key]),x+246,y+52,280,12,max_h=103);rule(x,y+157,526)

page('04 | Whole-owner material and paving continuity','58 owners/assemblies, 25 floor areas, 15 background targets and the backlot ground are assigned in the active source.')
pic(OUT/'material-ownership-map-r6.png',42,125,770,653)
para('MAP KEY',845,127,290,14,True,MUTED)
for i,a in enumerate(D['areas']):para(f'{i+1:02} '+a['zone'].replace('_',' ').title(),845,154+i*21,303,11)
para('Keep real property, construction and repair joints. Drafting parcels do not receive arbitrary finish changes. Stone owners can continue into their bases; plaster receives its separately scheduled stone parts.',845,704,303,12)

for num,kind in [(5,'neutral'),(6,'warm')]:
 page(f'0{num} | Walls, horizontal ground and accents: {kind} light','Historical proposal on the left; selected R6 treatment on the right. Fixed scene, orientation, camera and exposure.')
 pic(OUT/f'r6-samples/wall-ground-{kind}.png',42,127,1106,610)
 para('The ground is horizontal and the wall vertical. A timber hood creates direct/shaded paint comparison. The 1.8 m neutral figure is a scale cue, not a gameplay-contrast certification. These controlled studies omit the existing runtime macro shader and are not shipped game lighting.',42,750,1106,13,max_h=55)

page('07 | Cloth, timber and monolithic trim at useful scale','Selected existing-source treatments. Small changes in weave and grain should remain subordinate at player distance.')
pic(OUT/'r6-samples/close-details.png',42,128,1106,526)
para('Fine linen',42,680,335,17,True);para('0.09 m repeat and normal 0.10. Shade/sackcloth uses 0.27 m and normal 0.18. Both retain the neutral-grain color path; paint is not multiplied twice.',42,710,335,13)
para('Timber',424,680,335,17,True);para('Lengthwise grain follows each rail or stile. The source normal is explicitly bound. Broad paint stays calm while geometry supplies rails, panels and joints.',424,710,335,13)
para('Stone trim',806,680,342,17,True);para('Crop pixels (340,195) to (740,290) from the 1024 source. Mirror albedo/ARM and correct tangent normals. UV X follows member length.',806,710,342,13)

page('08 | Close comparison: fine weave and stone grain','Macro crops confirm the physical repeat difference and the joint-free stone field. They are not a reason to exaggerate normal strength.')
pic(OUT/'r6-samples/macro-details.png',42,127,1106,645)
para('R6 keeps existing wall macro variation and only named local wear. It adds no procedural repair distribution or second full-wall mask.',42,780,1106,10,color=MUTED)

page('09 | Retained models and decorative rug','Actual existing source models, rendered for the prior review. Their shapes/materials remain retained; these are not completed R6 district assemblies.')
models=[('wicker-basket','Basket | 17,850 triangles','Honey cane fits the bazaar; reserve the costly source for its retained role.'),('wine-barrel','Barrel | 10,820 triangles','Worn timber and dull hoops fit. Do not repeat this mesh as generic shelf stock.'),('ceramic-pot','Ceramic pot | 3,592 triangles','A darker aged accent. Judge its context rather than brightening every object.'),('wooden-crate','Crate source | 6,576 triangles','The source chest; its full procedural gameplay-cover composition is separate.')]
for i,(key,title,body) in enumerate(models):
 x=42+(i%2)*570;y=125+(i//2)*290;pic(OUT/f'retained-{key}.png',x,y,526,195);para(title,x,y+202,526,16,True);para(body,x,y+228,526,12,max_h=43)
rug=next(f['raw'] for f in S['families'] if f['id']=='rug');pic(rug,42,715,68,68)
para('The existing Project-Original Levantine rug remains unmodified at 1.20 m repeat. Its rust, indigo, flax and teal supply concentrated pattern; it is not copied onto every district.',128,729,1020,13)

for offset in [0,6]:
 page(f'{10+offset//6:02} | Local wear and material transitions','Selected district intent is in craftStandards.wearIntentByDistrict. Existing exact receiver geometry, contact bands and floor treatments remain authoritative.')
 for i,row in enumerate(WEAR[offset:offset+6]):
  y=127+i*107;para(escape(row['district']),42,y,194,16,True);para(escape(row['proposedAuthoredWear']),250,y,423,12,max_h=89)
  para(escape(row['keepQuiet'])+' '+escape(row['transitionLogic']),698,y,450,11.5,max_h=89);rule(42,y+98,1106)
 para('Judge inherited scan wear and authored wear together. Numerical alpha limits are ceilings at selected receivers, not a dirt quota. Concealed roof collectors do not authorize street runoff streaks.',42,778,1106,10,max_h=29)

page('12 | Efficient source and material reuse','R6 uses existing sources and explicit derived recipes. The prior measured file inventory is a baseline, not proof of active-scene savings.')
rows=[('Existing reuse','84 installed wall/floor IDs resolve to 38 source triplets. URL texture caching already exists. Keep meaningful aliases; avoid unnecessary copies.'),('Actual duplication baseline','The prior audit found 40.54 MB redundant embedded-image bytes across 37 Bazaar GLBs, including legacy models. Check active packages before claiming recoverable savings.'),('Payload matters','The existing B roof is 11.1 MB for 816 triangles. Each 12-triangle cap is about 2.02 MB. Texture payload and material/shadow classes matter alongside mesh detail.'),('Provenance','The prior bounded audit matched 177 texture checksum records: 159 CC0-recorded and 18 Project-Original. R6 selected source hashes are rechecked; no original file is rewritten.'),('Shared cloth and paint','Neutral grain with calibrated vertex color supports multiple cloth colors without a cream-times-rust mistake. Reuse one compatible material per source/formula/PBR/shadow class.'),('Preserve batching','Reuse installed roof batching and area budgets. No material per hinge, window, pot, border or wear patch. Preserve genuinely different derived paint; do not rebind it to raw pack albedo.')]
for i,(title,body) in enumerate(rows):
 y=132+i*95;para(title,42,y,320,17,True);para(body,390,y,758,14,max_h=78);rule(42,y+83,1106)
para('GPU residency, draw calls, shadows and frame time remain implementation measurements. No compression rollout or FPS improvement is claimed by these documents.',42,731,1106,16,max_h=64)

page('13 | One consistent engineering handoff','The selected material decisions now live with the architecture. The PDFs summarize that source; the builder uses the frozen area handoff.')
left=[('Source and recipe','design.json materials and craftStandards record selected source files/hashes, desired appearance, paint/formula, UV repeat/crop, normal strength, roughness mode and metalness.'),('Resolved binding','runtime-materials.md lists source-to-export and shadow mapping. Derived bz06_* albedo must survive export/rebinding. Raw source scans remain unchanged.'),('Color ownership','Bounded wall/stone paint is baked once with white factors. Shared cloth uses neutral grain plus calibrated vertex paint. Opaque joinery keeps its explicitly assigned owner color.')]
right=[('Geometry and wear','Owner fields wrap consistently; material regions and all gameplay geometry remain fixed. Wear intent adds no unscheduled patch, spout or decoration.'),('Scoped construction','handoff.py includes material recipe modes, export names and crop requirements. Unsupported recipes must be implemented explicitly, never silently omitted or replaced with a generic alias.'),('One final implementation review','Build the complete named area, then review correctness, visuals, gameplay and performance together. Correct observed defects and rerun affected checks. No recurring review ladder.')]
for x,notes in [(42,left),(615,right)]:
 y=132
 for title,body in notes:y=note(title,body,x,y,533)+17
para('R6 resolves the previously open trim and linen design samples. User visual acceptance and actual-game appearance remain separate. The documentation update does not build or install the map.',42,709,1106,16,max_h=66)
para('Active design SHA-256: '+sha,42,781,1106,10,color=MUTED)
c.save()
(OUT/'pdf-pages.json').write_text(json.dumps({'revision':'R7 source with unchanged R6 materials','sourceSha256':sha,'pdf':str(PDF.relative_to(ROOT)),'pages':pages},indent=2)+'\n')
print(f'Created {len(pages)} selected material pages: {PDF}')
