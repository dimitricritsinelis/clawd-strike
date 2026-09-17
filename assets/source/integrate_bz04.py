"""Validate and apply one complete R7 section through the existing package installer."""
from pathlib import Path
import argparse
import copy
import hashlib
import json
import math
import runpy
import shutil
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SPEC = ROOT / 'docs/map-design/specs/map_spec.json'


def export_budget(area, directory):
    """Retain recorded planning allowances for reporting, never installation gates."""
    budget=copy.deepcopy(area['budget'])
    package=directory/'package.json'
    override=json.loads(package.read_text()).get('exportBudgetOverride') if package.exists() else None
    if override:
        if not override.get('reason'):raise ValueError('Budget change requires its recorded reason')
        for key,value in override.items():
            if key=='reason':continue
            if key not in ('maxMaterials','maxRenderedPrimitives','maxShadowPrimitives'):
                raise ValueError(f'Budget change is not authorized: {key}')
            if not isinstance(value,int) or value<budget[key]:raise ValueError('Invalid per-area rendering allowance')
            budget[key]=value
    return budget


def digest(value):
    inputs = {k:v for k,v in value.items() if k not in ('source','designSha256','reading','inputSha256')}
    return hashlib.sha256(json.dumps(inputs,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def load_handoff(path):
    handoff = json.loads(path.read_text())
    unit = handoff.get('unit')
    if not isinstance(unit,str) or not unit.startswith('unit-') or Path(unit).name != unit:
        raise ValueError('Invalid section unit')
    if len(handoff.get('areas',[])) != 1 or handoff['areas'][0]['outputUnit'] != unit:
        raise ValueError('Expected one exact area per section')
    current = runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](unit)
    if digest(handoff) != handoff.get('inputSha256') or digest(handoff) != current['inputSha256']:
        raise ValueError('Tampered or stale frozen handoff')
    return handoff


def door_service_depth(area,face,opening):
    """Keep ground-entry aprons; bound an explicitly served upper balcony by its rail."""
    features=[f for f in area.get('facadeFeatures',[]) if f.get('kind')=='supported-shallow-balcony' and f.get('servedOpening')==opening['id']]
    if not features:return .8
    floor=area['floor']
    if floor['kind']=='flat':ground=floor['elevationM']
    else:
        point={'x':face['wallPlaneM'] if face['face'] in {'east','west'} else opening['alongM'],
               'y':opening['alongM'] if face['face'] in {'east','west'} else face['wallPlaneM']}
        axis=floor['axis'];span=floor['rect']['w' if axis=='x' else 'h']
        ground=floor['startElevationM']+(point[axis]-floor['rect'][axis])/span*(floor['endElevationM']-floor['startElevationM'])
    if opening['sillM']<=ground:return .8
    if len(features)!=1:raise ValueError('Ambiguous balcony serving door '+opening['id'])
    feature=features[0];rail=feature['balustrade']
    values=[rail['frontOutM'],rail['railSectionM'],feature['deck']['topZM'],opening['widthM'],opening['heightM']]
    if not all(isinstance(v,(int,float)) and math.isfinite(v) and v>0 for v in values):raise ValueError('Invalid served balcony dimensions')
    if abs(feature['deck']['topZM']-opening['sillM'])>1e-5:raise ValueError('Balcony deck misses served door sill')
    depth=min(.8,rail['frontOutM']-rail['railSectionM']/2-1e-5)
    if depth<=0:raise ValueError('Balcony rail leaves no positive door apron')
    return depth


def validate_section(handoff):
    area = handoff['areas'][0]
    path = ROOT/'assets/source'/handoff['unit']/(handoff['unit']+'.glb')
    payload = path.read_bytes()
    if payload[:4] != b'glTF':
        raise ValueError('Section is not a GLB')
    data = json.loads(payload[20:20+struct.unpack_from('<I',payload,12)[0]])
    scene = data['scenes'][data.get('scene',0)]['extras']
    if scene.get('bz04InputSha256') != handoff['inputSha256'] or scene.get('bz04Unit') != handoff['unit']:
        raise ValueError('Export does not belong to the frozen area inputs')
    if scene.get('bz04VisualBounds') != area['exportBoundsGltfLocal']:
        raise ValueError('Export bounds metadata differs from approved bounds')
    verifier = runpy.run_path(str(ROOT/'assets/source/unit-spawn-b-courtyard/verify.py'))
    origin = area['sectionOriginDesign']
    triangles, report = verifier['glb'](path,(origin['x'],origin['y'],origin['z']))
    budget=export_budget(area,path.parent)
    report['budget']=verifier['report_budget'](report,budget)
    bounds = area['exportBoundsDesign']
    if any(any(p[i]<bounds['min'][i]-.001 or p[i]>bounds['max'][i]+.001 for i in range(3)) for _,tri in triangles for p in tri):
        raise ValueError('Actual section vertices escape the frozen design envelope')
    checks=[]
    for face in area['faces']:
        for parcel in face['parcels']:
            for opening in parcel['openings']:
                if opening['kind'] != 'door':
                    continue
                z = opening['sillM']
                lo,hi=verifier['volume'](face['face'],face['wallPlaneM'],
                    (opening['alongM']-opening['widthM']/2,0,z+.041),
                    (opening['alongM']+opening['widthM']/2,door_service_depth(area,face,opening),z+2.1))
                hits=sum(verifier['intersects'](tri,lo,hi) for _,tri in triangles)
                checks.append({'id':opening['id'],'intersections':hits,'depthM':door_service_depth(area,face,opening)})
                if hits:
                    raise ValueError(f"{opening['id']}: {hits} triangles obstruct the door service floor")
    report['doorServiceChecks']=checks
    floor=area['floor'];rect=floor['rect']
    def above_floor(vertex):
        x,y,z=vertex
        if floor['kind']=='flat':height=floor['elevationM']
        else:
            along=x if floor['axis']=='x' else y
            start=rect['x'] if floor['axis']=='x' else rect['y']
            extent=rect['w'] if floor['axis']=='x' else rect['h']
            height=floor['startElevationM']+(along-start)/extent*(floor['endElevationM']-floor['startElevationM'])
        return (x,y,z-height)
    raised=[(material,[above_floor(v) for v in tri]) for material,tri in triangles]
    clear=area['clearRouteRegion']
    volumes=[(clear['id'],(clear['x'],clear['y'],.041),(clear['x']+clear['w'],clear['y']+clear['h'],clear['heightM']))]
    for face in area['faces']:
        for start,end in face['openIntervals']:
            lo,hi=verifier['volume'](face['face'],face['wallPlaneM'],(start,-.01,.041),(end,.01,4.2))
            volumes.append((face['face']+'-open-'+str(start),lo,hi))
    report['routeChecks']=[]
    for name,lo,hi in volumes:
        hits=sum(verifier['intersects'](tri,lo,hi) for _,tri in raised)
        report['routeChecks'].append({'id':name,'intersections':hits})
        if hits:raise ValueError(f'{name}: {hits} exported triangles obstruct the frozen clear volume')
    return path,report


def retired_spec(source,handoff):
    spec=copy.deepcopy(source); area=handoff['areas'][0]
    retire={d['id'] for d in handoff['legacyDispositions'] if d['disposition']=='remove'}
    removed_assets=set()
    for placement in list(spec['dressing_placements']):
        kept=[a for a in placement['anchorIds'] if placement['id']+'_'+a not in retire]
        if not kept:
            removed_assets.add(placement['assetId']);spec['dressing_placements'].remove(placement)
        else:
            placement['anchorIds']=kept
    referenced={a for p in spec['dressing_placements'] for a in p['anchorIds']}
    # Retiring a visual placement never retires its independent gameplay anchor.
    classifications={ident:c['classification'] for c in source['dressing_clusters'] for ident in c.get('anchors',[])}
    protected={a['id'] for a in source['anchors'] if a['type'] in ('cover_cluster','spawn_cover','open_node','landmark')
               or a['type'] in ('shopfront_anchor','hero_landmark') and classifications.get(a['id']) not in ('soft_visual','overhead')}
    spec['anchors']=[a for a in spec['anchors'] if a['id'] in referenced or a['id'] in protected or not any(i.endswith('_'+a['id']) for i in retire)]
    retained_anchors={a['id'] for a in spec['anchors']}
    used={p['assetId'] for p in spec['dressing_placements']}
    spec['asset_registry']=[a for a in spec['asset_registry'] if a['id'] not in removed_assets or a['id'] in used]
    for cluster in list(spec['dressing_clusters']):
        cluster['anchors']=[a for a in cluster.get('anchors',[]) if a in retained_anchors or not any(i.endswith('_'+a) for i in retire)]
        remaining=[p for p in spec['dressing_placements'] if p['clusterId']==cluster['id']]
        if not remaining and any(p['clusterId']==cluster['id'] for p in source['dressing_placements']):
            spec['dressing_clusters'].remove(cluster)
        else:
            removed_here={p['assetId'] for p in source['dressing_placements'] if p['clusterId']==cluster['id']} - {p['assetId'] for p in remaining}
            for key,value in cluster.items():
                if isinstance(value,list):cluster[key]=[v for v in value if not isinstance(v,str) or v not in removed_here]
    for zone in spec['zones']:
        if zone['id']==area['zone']:zone['floorMaterialId']=area['floorMaterialId']
    for frontage in spec.get('frontages',[]):
        if frontage.get('zoneId')==area['zone']:frontage.pop('facadeModelId',None)
    return spec


def install_floor(handoff):
    mid=handoff['areas'][0]['floorMaterialId'];entry=handoff['materials'][mid]
    manifest_path=ROOT/entry['manifest'];manifest=json.loads(manifest_path.read_text())
    row=next(m for m in manifest['materials'] if m['id']==mid)
    for key in ('tileSizeM','normalScale','roughness','albedoBoost','albedoGamma','dustStrength','tintHex'):
        if key in entry:row[key]=entry[key]
    if entry.get('baseColorRecipe'):
        baked=json.loads((ROOT/'assets/source/bz04-shared-environment/materials/recipes.json').read_text())[mid]
        folder=manifest_path.parent/'bz06-derived';folder.mkdir(exist_ok=True)
        source=ROOT/baked['textures']['albedo'];target=folder/source.name
        if hashlib.sha256(source.read_bytes()).hexdigest()!=baked['sha256']['albedo']:
            raise ValueError('Derived floor texture changed')
        shutil.copy2(source,target)
        for maps in row['textures'].values():maps['albedo']='./bz06-derived/'+target.name
        pigments=runpy.run_path(str(ROOT/'assets/source/bazaar_finish.py'))['FLOOR_PIGMENTS']
        row.update(tintHex=pigments.get(mid,'#ffffff'),albedoBoost=1,albedoGamma=1,dustStrength=0)
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')


def integrate(path):
    handoff=load_handoff(path);source,report=validate_section(handoff)
    area=handoff['areas'][0];unit=handoff['unit']
    if area.get('implementationPhase'):
        raise ValueError('Phased B integration uses its dedicated guarded integrator')
    parcel_ids={p['id'] for face in area['faces'] for p in face['parcels']}
    # A complete section takes over its exact earlier roof-receiver placements.
    # Apply source bindings first; the runtime is compiled only after the new
    # section is installed, so no published runtime loses its receiver.
    for other_path in sorted((ROOT/'assets/source').glob('unit-*/package.json')):
        if other_path.parent==source.parent:continue
        other=json.loads(other_path.read_text())
        receivers=[entry for entry in other.get('dependencyReceivers',[])
                   if entry.get('parcelIds') and set(entry['parcelIds'])<=parcel_ids]
        if any(entry.get('inputSha256')!=handoff['inputSha256'] for entry in receivers):
            raise ValueError('Stale dependency receiver inputs: '+str(other_path))
        retired={entry['modelId'] for entry in receivers}
        if not retired:continue
        other['models']=[m for m in other['models'] if m['id'] not in retired]
        other['placements']=[p for p in other.get('placements',[]) if p['modelId'] not in retired]
        other['dependencyReceivers']=[r for r in other['dependencyReceivers'] if r['modelId'] not in retired]
        other_path.write_text(json.dumps(other,indent=2)+'\n')
        subprocess.run(['node','scripts/apply-facade-package.mjs','apply',other_path.parent.name],cwd=ROOT,check=True)
    spec=retired_spec(json.loads(SPEC.read_text()),handoff)
    mid='section_'+unit.replace('-','_')
    # Keep already installed roof/shared placements owned by this package.
    old=json.loads((source.parent/'package.json').read_text()) if (source.parent/'package.json').exists() else {}
    placements=old.get('placements',[])
    keep={p['modelId'] for p in placements}
    models=[m for m in old.get('models',[]) if m['id'] in keep]
    models.append({'id':mid,'file':source.name,'source':f'repo://assets/source/{unit}/build.py','license':'Project-Original'})
    package={'models':models,'section':{'zoneId':area['zone'],'modelId':mid,'faces':area['sectionFaces']},'placements':placements,'inputSha256':handoff['inputSha256']}
    if old.get('exportBudgetOverride'):package['exportBudgetOverride']=old['exportBudgetOverride']
    if old.get('roofExportBudgetOverride'):package['roofExportBudgetOverride']=old['roofExportBudgetOverride']
    if old.get('sharedExportBudgetOverride'):package['sharedExportBudgetOverride']=old['sharedExportBudgetOverride']
    if old.get('dependencyReceivers'):package['dependencyReceivers']=old['dependencyReceivers']
    (source.parent/'package.json').write_text(json.dumps(package,indent=2)+'\n')
    subprocess.run(['node','scripts/apply-facade-package.mjs','apply',unit],cwd=ROOT,check=True)
    applied=json.loads(SPEC.read_text())
    # Carry the installer's exact section bindings into the prevalidated retirements.
    for zone in spec['zones']:
        if zone['id']==area['zone']:
            written=next(z for z in applied['zones'] if z['id']==area['zone'])
            zone.update({k:written[k] for k in ('sectionModelId','sectionFaces')})
    spec['authored_placements']=applied['authored_placements']
    SPEC.write_text(json.dumps(spec,indent=2)+'\n')
    install_floor(handoff)
    subprocess.run(['node','apps/client/scripts/gen-map-runtime.mjs'],cwd=ROOT,check=True)
    report.update(inputSha256=handoff['inputSha256'],unit=unit,status='installed; integrated visual/interface checks pending')
    (path.parent/'section-integration.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ('unit','triangles','primitives','castPrimitives','budget','sha256','status')}))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--handoff',required=True,type=Path)
    parser.add_argument('--verify-only',action='store_true')
    args=parser.parse_args()
    if args.verify_only:print(json.dumps(validate_section(load_handoff(args.handoff))[1],indent=2))
    else:integrate(args.handoff)
