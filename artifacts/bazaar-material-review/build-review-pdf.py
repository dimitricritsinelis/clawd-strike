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
c.setTitle('Bazaar | Material, color and asset review')
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
    para('REVIEW PROPOSAL | R5 geometry unchanged | 09 September 2026', 42, 811, 1000, 10, color=MUTED)
    para(f'{len(pages):02}', 1110, 811, 35, 10, color=MUTED)
def rule(x, y, width):
    c.setStrokeColor(HexColor(LINE)); c.line(x, H-y, x+width, H-y)
def note(title, body, x, y, width):
    y = para(title, x, y, width, 17, True)+7
    return para(body, x, y, width, 14)+20

D = json.loads((ROOT/'docs/map-design/construction/design.json').read_text())
P = json.loads((OUT/'material-art-proposal.json').read_text())
S = json.loads((OUT/'calibrated-swatches.json').read_text())
SW = {f['id']:f for f in S['families']}
WEAR = json.loads((OUT/'wear-and-transitions-proposal.json').read_text())['districts']

page('Bazaar | Material, color and asset review', 'A warm, sun-faded bazaar with purposeful craft color and restrained signs of use.')
pic('docs/map-design/refs/bazaar_main_hall_reference.png', 42, 132, 655, 450)
para('FOUNDING REFERENCE', 42, 592, 655, 12, True, MUTED)
para('Borrow the warm light, street depth, shade and trading character. Keep cream, sand and pale ochre as the broad fields. Use cooler shadow and stone contrast; stronger color belongs mainly to joinery, cloth and goods.', 42, 616, 655, 16)
y = note('Recommendation', 'Keep the R5 architecture. Correct the material handoff before implementation; several source choices and recipe mappings still undermine the intended finish.', 732, 132, 416)
y = note('Keep', 'The owner-specific color, patterned rug, existing basket/barrel/crate, selective red and ochre buildings, and the measured R5 compositions.', 732, y, 416)
y = note('Correct', 'Dark plaster used for pale sand; leather used for linen; masonry joints on one-piece trim; mossy general-link paving; inconsistent stone-unit scales and same-owner finish breaks.', 732, y, 416)
y = note('Add character deliberately', 'Minor plaster erosion, local repairs, worn thresholds and sand in joints or sheltered contacts. Keep broad upper walls and central routes calm.', 732, y, 416)
para('Three specialist reviews: material art, engineering efficiency, and asset/model readiness. No active design, source texture or runtime changes.', 732, y, 416, 12, color=MUTED)

page('01 | Source problems and proposed corrections', 'Raw source, intended current base-color calculation, and experimental alternative. These are unlit studies, not game renders.')
cols = [365, 590, 815]
for x, label in zip(cols, ['RAW SOURCE', 'CURRENT FORMULA', 'PROPOSED ALTERNATIVE']): para(label, x, 126, 210, 11, True, MUTED)
diag_notes = [
 ('Dark beige plaster', 'The alias sounds pale, but the source is dark brown. Reuse the quieter plaster source with deliberate calibration.', 'sand-plaster'),
 ('Leather used as linen', 'Bounded paint reduces orange color. Leather seams and creases still remain the wrong physical surface. Trial the existing weave.', 'cream-woven-cloth'),
 ('Mossy general-link paving', 'Green joints suit damp cobbles. Shared quiet flags better fit the dry public routes; rough blocks remain on service routes.', 'quiet-flags'),
 ('Wall scan used as trim', 'Mortar joints cannot run through a one-piece sill. Select a clean stone field or a suitable monolithic source; the exact trim sample remains unresolved.', None),
]
for i,(row,(title,body,alt)) in enumerate(zip(S['diagnostics'],diag_notes)):
    y=151+i*154
    para(title,42,y,292,17,True); para(body,42,y+30,292,13,max_h=110)
    pic(row['raw'],cols[0],y,195,129,True);pic(row['current'],cols[1],y,195,129,True)
    if alt: pic(SW[alt]['proposed'],cols[2],y,195,129,True)
    else: para('FINAL CLOSE SAMPLE REQUIRED',cols[2],y+25,210,15,True)
    rule(42,y+145,1106)
para('Provider sources: <link href="https://polyhaven.com/a/beige_wall_002" color="#536b6e">beige wall</link> | <link href="https://polyhaven.com/a/fabric_leather_02" color="#536b6e">stitched upholstery leather</link> | <link href="https://polyhaven.com/a/cobblestone_floor_04" color="#536b6e">mossy cobbles</link>. Source images are preserved; alternatives are review files only.',42,781,1106,10,color=MUTED)

for n, group in enumerate([S['families'][:8],S['families'][8:]]):
    page(f'0{n+2} | Curated material families', 'Left patch: raw substrate. Right patch: proposed base color. Desired appearance colors are not shader multipliers; retained craft inputs are labeled separately.')
    for i,f in enumerate(group):
        x=42+(i%2)*570;y=127+(i//2)*166
        para(f['id'].replace('-',' ').title(),x,y,527,16,True)
        pic(f['raw'],x,y+28,110,105,True);pic(f['proposed'],x+121,y+28,110,105,True)
        target=f.get('targetAppearanceSrgb')
        label = f'Desired appearance {target}' if target else ('Retained paint input '+f['retainedPaintSrgb'] if f.get('retainedPaintSrgb') else 'Existing rug unchanged')
        para(escape(label),x+246,y+28,280,12,True)
        repeat=f.get('repeatM')
        para(('Trial repeat '+str(repeat)+' m. ' if repeat else '')+escape(f['proposal']),x+246,y+52,280,11,max_h=111)
        rule(x,y+157,526)

page('04 | Material ownership and route continuity', '58 building/assembly owners, 25 floor assignments and 15 background assignments. Existing stone bases and real construction joints remain distinct.')
pic(OUT/'material-ownership-map.png',42,125,770,653)
para('MAP KEY',845,127,290,14,True,MUTED)
for i,a in enumerate(D['areas']):
    para(f'{i+1:02}  '+escape(a['zone'].replace('_',' ').title()),845,154+i*21,303,11)
para('One owner finish wraps its adjoining walls. A drafting parcel is not a paint boundary. Paving changes at real court/service thresholds, with flush joins and consistent unit scale.',845,704,303,12)

for idx,kind,subtitle in [(5,'neutral','Neutral sun, fixed cool sky, fixed camera and exposure.'),(6,'warm','Same setup with warmer sun color only. No exposure, fog or grading changes.')]:
    page(f'0{idx} | Controlled material specimens: {kind} light',subtitle)
    pic(OUT/f'material-panels-{kind}.png',42,127,1106,614)
    para('Eight 2 m surface coupons use review base-color samples with selected source normal and roughness maps; nonmetal metalness is fixed to zero. The flagstone coupon is vertical and does not establish grazing-angle floor quality. Fine cloth and trim still require close samples. These studies do not prove the shipped game look.',42,751,1106,12,max_h=50)

page('07 | Existing models inspected with their actual materials', 'Read-only Blender imports under controlled studio daylight. These are existing source models, not completed R5 district assemblies.')
models=[('wicker-basket','Basket | 17,850 triangles','Honey-colored cane and supported craft detail fit. Keep selective; do not use this mesh as repeated shelf stock.'),('wine-barrel','Barrel | 10,820 triangles','Worn wood and dull hoops fit. Use the existing retained role; repeated background stock should follow its simpler authored parts.'),('ceramic-pot','Ceramic pot | 3,592 triangles','Dark olive/brown aged glaze can provide contrast. Judge it in context before a bounded lift; do not brighten every prop by quota.'),('wooden-crate','Crate source | 6,576 triangles','Reddish-golden chest with rope and latch. This preview is the source chest, not the full procedural gameplay-cover composition.')]
for i,(key,title,body) in enumerate(models):
    x=42+(i%2)*570;y=125+(i//2)*330
    pic(OUT/f'retained-{key}.png',x,y,526,239)
    para(title,x,y+245,526,16,True);para(body,x,y+273,526,12,max_h=52)

for offset in [0,6]:
    page(f'{8+offset//6:02} | Local wear and logical transitions', 'Small signs of use at named receivers. The full schedule records exact opening, floor and clear-route IDs; no scatter or new geometry is proposed.')
    for i,row in enumerate(WEAR[offset:offset+6]):
        y=127+i*107
        para(escape(row['district']),42,y,194,16,True)
        para(escape(row['proposedAuthoredWear']),250,y,423,12,max_h=89)
        para(escape(row['keepQuiet'])+' '+escape(row['transitionLogic']),698,y,450,11.5,max_h=89)
        rule(42,y+98,1106)
    para('Inherited scan wear and authored wear must be judged together. Existing edge-dust/contact alpha values are ceilings for selected patches, not a requirement to dirty every edge. Concealed rear roof collectors do not justify street-facing runoff streaks.',42,778,1106,10,max_h=29)

page('10 | Reuse, material cost and source readiness', 'Measured file inventories support the recommendations. They are not GPU residency, frame time or guaranteed active-scene savings.')
rows=[
('84 IDs / 38 source triplets','Installed wall and floor manifests already reuse sources. URL caching deduplicates those textures; removing aliases is not a proportional memory saving.'),
('54 files / 27.70 MB','Current direct area/skyline/ground source subset. Recipe-driven details and retained scene content are outside this scope.'),
('33 files / 18.96 MB','Proposed 16-family source set, including the rug. This is a source-file comparison; derived bakes, retained trim, roofs and props remain outside it.'),
('40.54 MB duplicate image bytes','Measured across all 37 Bazaar GLBs, including legacy and superseded models. Inspect selected active packages before deduplicating their identical images.'),
('11.1 MB / 816 triangles','Existing B roof bundle: texture payload dominates. Each 12-triangle B cap is about 2.02 MB. More triangles are not the only quality/performance consideration.'),
('177 checksum records matched','159 CC0-recorded and 18 Project-Original records in the audited texture scope. No missing or mismatched files. Generated flagstone is Project-Original, not a licensed scan.'),
]
for i,(title,body) in enumerate(rows):
    y=132+i*90;para(title,42,y,330,17,True);para(body,395,y,753,14,max_h=75);rule(42,y+78,1106)
para('Keep existing roof batching and per-area material/shadow limits. Share compatible source/formula/materials; avoid one material or texture bake per window, cloth color, pot or wear patch. Preserve genuine painted differences. This review introduces no compression rollout and claims no FPS improvement.',42,695,1106,16,max_h=97)

page('11 | Handoff corrections and acceptance boundary', 'Preserve the efficient process: implement the named area, review the complete result once, then quickly correct observed defects.')
left=[('Source choice and ownership','Adopt or adjust the proposed source substitutions and whole-owner material assignments. Resolve clean monolithic trim and fine domestic linen with a close sample. Conditional external candidates are metadata leads only; none are downloaded or visually approved.'),('Color and surface response','Freeze one color path per material: neutral bounded grain with desired vertex paint, or a paint-baked albedo with white vertices. Define whether roughness is a final constant or a scan multiplier. Disconnect ARM Metallic for nonmetallic surfaces.'),('Existing implementation infrastructure','Reconcile stale notes with installed wall/floor profiles and roof batching. Map old embedded names to the final craft material names, retained IDs and shadow classes. Do not rebuild infrastructure already present.')]
right=[('Asset/source readiness','Most full R5 models are not built. The current B package is B-04, not completed R5. Reconcile stale shared-environment status, Rug Gate producer ownership and the B sidecar count against the actual files.'),('Finish review during implementation','Inspect a neutral view and the existing shipped lighting at player distance and close range. Check seams, real unit scale, stone trim, cloth weave, wear accumulation and sun/shade readability. Do not change exposure to conceal a source mismatch.'),('Performance proof during implementation','Measure active renderer textures, draw/shadow calls and frame time. Existing inventory totals are bounded estimates and disk measurements. Keep gameplay, routes, cover, spawn and elevation checks unchanged.')]
for x,notes in [(42,left),(615,right)]:
    y=132
    for title,body in notes:y=note(title,body,x,y,533)+15
para('Coverage: 25 areas, 100 faces, 58 owners/assemblies, 251 openings, 30 activity groups, 271 parts across 43 kinds, 16 shades, 10 facade features, 15 retained gameplay placements and 15 skyline targets. Exact material, joinery, shade, stock, wear and source records accompany this PDF.',42,683,1106,14,max_h=76)
para('Active R5 source SHA-256: 367ac474642c0e49557ffd784262246e4d5ce6b25a35e21e231ce06ffb4fa826',42,778,1106,10,color=MUTED)

for i in range(1,4):
    page(f'Appendix {i} | Actual scheduled albedo sources', 'Raw source images from the local manifests. Labels show current alias repeat/tint metadata, not final rendered appearance. Repeated images expose intentional alias reuse.')
    pic(OUT/f'actual-albedos-{i}.jpg',42,130,1106,605)
    para('Normal, roughness, formulas and lighting are separate from these raw thumbnails. The detailed review resolves source paths and provenance. Existing source images remain unchanged.',42,754,1106,13)

c.save()
(OUT/'pdf-pages.json').write_text(json.dumps({'pdf':str(PDF.relative_to(ROOT)),'pages':pages},indent=2)+'\n')
print(f'Created {len(pages)} pages: {PDF}')
