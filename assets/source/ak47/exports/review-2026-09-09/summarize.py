"""Assemble experiment measurements and unchanged Blender renders for review."""
import csv
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent / 'run-01'
IDS = ['control'] + ['case-%02d' % i for i in range(1, 9)]
FONT = Path('/System/Library/Fonts/Supplemental/Arial.ttf')


def font(size):
    return ImageFont.truetype(str(FONT), size) if FONT.exists() else ImageFont.load_default(size=size)


def main():
    reports = {case: json.loads((ROOT/case/'result.json').read_text()) for case in IDS + ['control-repeat']}
    control = reports['control']
    repeated = reports['control-repeat']
    repeat = (control['experiment']['evaluatedGeometryHashes'] == repeated['experiment']['evaluatedGeometryHashes'] and control['leftPose'] == repeated['leftPose'])
    comparable = all(r['experiment']['baselineSHA256'] == control['experiment']['baselineSHA256'] and r['experiment']['manifestSHA256'] == control['experiment']['manifestSHA256'] and r['experiment']['scriptsSHA256'] == control['experiment']['scriptsSHA256'] and r['experiment']['protectedSemanticsHash'] == control['experiment']['protectedSemanticsHash'] for r in reports.values())
    if not repeat or not comparable:
        raise RuntimeError('Experiment inputs/protected state/repeatability mismatch')
    rows = []
    for case in IDS:
        report = reports[case]
        definition = report['experiment']['case']
        body = report['meshes']['L_GloveAndForearm']
        pad = report['meshes']['Palm heel suede overlay']['broadPulpPatch']
        fit = report['fingerFit']
        rows.append({'case': case, **definition.get('levels', {'placement':'reference','cmc':'reference','flexion':'reference'}),
                     'pulpCoveragePercent': pad['coverage']*100,
                     'largestQualifyingPulpPatchMM2': max(pad['connectedNearPatchAreasMM2'], default=0),
                     'bodyThumbAffectedTriangleAreaMM2': sum(v for k,v in body['affectedWholeTriangleAreaMM2'].items() if k.startswith('L_thumb.')),
                     'bodyHandAffectedTriangleAreaMM2': body['affectedWholeTriangleAreaMM2'].get('SupportHand',0),
                     'allLayersAffectedTriangleAreaMM2': sum(sum(m['affectedWholeTriangleAreaMM2'].values()) for m in report['meshes'].values()),
                     'fingerSurfaceIntersectionTriangles': sum(sum(v for k,v in m['intersectedTriangleCountsByBindRegion'].items() if k.startswith('L_f_')) for m in report['meshes'].values()),
                     'maxFingerMarkerDisplacementMM': max((f['final']['contactGapMM'] for f in fit['fingers'].values()), default=0) if fit else 0,
                     'fingerFitStatuses': ','.join(f['status'] for f in fit['fingers'].values()) if fit else 'reference',
                     'protected': report['experiment']['protectedSemanticsUnchanged']})
    with (ROOT/'comparison.csv').open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=rows[0].keys())
        writer.writeheader(); writer.writerows(rows)
    effects = {}
    for factor in ['placement','cmc','flexion']:
        levels = [[r['allLayersAffectedTriangleAreaMM2'] for r in rows[1:] if r[factor]==level] for level in [0,1]]
        means = [sum(v)/len(v) for v in levels]
        effects[factor] = {'lowMeanAffectedTriangleAreaMM2':means[0], 'highMeanAffectedTriangleAreaMM2':means[1], 'highMinusLowMM2':means[1]-means[0]}
    summary = {'repeatExact':repeat,'commonInputsAndProtectedState':comparable,'rows':rows,'factorEffects':effects,
               'interpretation':'Affected whole-triangle area is not penetration volume and includes tangency and overlapping garment layers. Marker displacement is not a surface contact gap. Pulp coverage is a frozen engineering proximity/orientation screen, not visual approval.',
               'reviewStatus':'Static review only; no grip selected or reload integrated.'}
    (ROOT/'comparison.json').write_text(json.dumps(summary,indent=2)+'\n')
    for view in ['back','palm','gameplay']:
        cell_w, image_h = 480, (270 if view=='gameplay' else 360)
        cell_h = image_h+74
        canvas = Image.new('RGB',(1480,3*cell_h+92),(239,241,243))
        draw = ImageDraw.Draw(canvas)
        draw.text((18,13),'Thumb grip experiment | '+view+' view',font=font(25),fill=(24,30,36))
        draw.text((18,46),'Same source, cameras and fitting method. These are unapproved static tests.',font=font(17),fill=(65,72,80))
        for index,case in enumerate(IDS):
            x=10+(index%3)*490;y=80+(index//3)*cell_h
            row=rows[index];definition=reports[case]['experiment']['case']
            title='REFERENCE | existing near-face grip' if case=='control' else f"{case.upper()} | P{row['placement']} C{row['cmc']} F{row['flexion']}"
            draw.text((x+5,y),title,font=font(20),fill=(24,30,36))
            rendered=Image.open(ROOT/case/(view+'.png')).convert('RGB')
            rendered=rendered.resize((cell_w,image_h),Image.Resampling.LANCZOS)
            canvas.paste(rendered,(x,y+30))
            label='Original checkpoint preserved' if case=='control' else f"Rear {abs(definition['handRearShiftM'])*1000:.0f} mm | MCP/IP {definition['flexDegrees'][0]}/{definition['flexDegrees'][1]} | Pulp {row['pulpCoveragePercent']:.1f}%"
            draw.text((x+5,y+image_h+37),label,font=font(15),fill=(45,54,63))
        canvas.save(ROOT/('comparison-'+view+'.png'))
    images=[('Existing X curl','existing_mcp_35-palm.png'),('Derived pad-facing curl','derived_mcp_35-palm.png')]
    canvas=Image.new('RGB',(1300,650),(239,241,243));draw=ImageDraw.Draw(canvas)
    draw.text((16,12),'Same thumb, same joints and weights | isolated MCP 35 degrees',font=font(24),fill=(24,30,36))
    for i,(label,name) in enumerate(images):
        rendered=Image.open(ROOT/'diagnostics/axis-comparison'/name).convert('RGB').resize((640,560),Image.Resampling.LANCZOS)
        canvas.paste(rendered,(10+650*i,78));draw.text((18+650*i,48),label,font=font(21),fill=(24,30,36))
    canvas.save(ROOT/'bend-direction-comparison.png')
    print(json.dumps({'repeatExact':repeat,'comparable':comparable,'factorEffects':effects,'output':str(ROOT)},indent=2))


if __name__ == '__main__':
    main()
