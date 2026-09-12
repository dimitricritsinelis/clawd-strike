"""Named receiver shells required by Fountain Court's two approved roof bundles.

Reuse the area opening and graded-contact recipes. These dependency placements
are replaced atomically by each later complete section; they do not mark it built.
"""
from pathlib import Path
import argparse
import copy
import importlib.util
import json
import hashlib
import struct
import runpy
import sys

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
PREFIX='fountain-receivers-'
EVIDENCE=ROOT/'artifacts/bazaar-r7-whole-map/unit-fountain-court'
SOURCE_URI='repo://assets/source/unit-fountain-court/build-receivers.py'
INTERFACES=OUT/'receiver-interfaces.py'
ADDITIONAL_UNITS=None
BUNDLES={'ROOF_BUNDLE_UNIT_FOUNTAIN_COURT','ROOF_BUNDLE_UNIT_TEXTILE_ARCADE'}
RECEIVERS={
    'unit-caravan-court':{'cc-en','cc-es-part-2'},
    'unit-covered-souk':{'cs-wn','cs-ws'},
    'unit-link-east-mid':{'lem-n','lem-s'},
    'unit-link-west-mid':{'lwm-n','lwm-s'},
    'unit-tea-ramp':{'tr-s','tr-e'},
    'unit-tea-terrace':{'tt-e'},
    'unit-link-east-upper':{'leu-s'},
    'unit-rug-gate':{'R_E_SOUTH','R_S_CAP'},
    'unit-textile-arcade':{'T_N_CAP','T_E_LOOM','T_E_GALLERY','T_E_CART','T_W_LOOM','T_W_DYER','T_W_FOLDS'},
}


def module(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path)
    loaded=importlib.util.module_from_spec(spec);spec.loader.exec_module(loaded)
    return loaded


def inputs(unit):
    path=ROOT/'artifacts/bazaar-r7-whole-map'/unit/'handoff.json'
    saved=json.loads(path.read_text())
    extract=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']
    current=extract(unit)
    S=module('receiver_inputs','assets/source/unit-spawn-a-courtyard/build.py')
    assert saved['unit']==unit and S.digest(saved)==saved['inputSha256']==current['inputSha256'], 'Frozen receiver input changed'
    area=saved['areas'][0]
    assert area['designRevision']['id'].startswith('R7')
    selected=[(f,p) for f in area['faces'] for p in f['parcels'] if p['id'] in RECEIVERS[unit]]
    assert {p['id'] for f,p in selected}==RECEIVERS[unit]
    roof=json.loads((ROOT/'docs/map-design/construction/roof-coordination.json').read_text())
    scheduled=set().union(*(set(b['componentMaterialsBySource']) for b in roof['roofBundles'] if b['id'] in BUNDLES))
    assert RECEIVERS[unit]<=scheduled
    for f,p in selected:
        features=[feature for feature in area.get('facadeFeatures',[]) if feature['receiverParcel']==p['id']]
        assert not features or (unit=='unit-dyers-dogleg' and all(f['kind']=='supported-shallow-balcony' for f in features)), 'Receiver feature requires its area recipe'
        for o in p['openings']:
            assert o.get('headShape','rectangular') in {'rectangular','segmental','pointed'}
            assert not o.get('architecturalDetail'), 'Receiver portal requires its area recipe'
            assert not o.get('glazing'), 'Receiver glazing requires its area recipe'
        for opened in f['openIntervals']:
            span=opened['interval'] if isinstance(opened,dict) else opened
            assert min(p['interval'][1],span[1])-max(p['interval'][0],span[0])<=1e-8
    return saved,selected


def build(unit,fixture=False):
    saved,selected=inputs(unit);area=saved['areas'][0]
    for face,parcel in selected:
        for aperture in parcel['openings']:
            if 'archRingM' in aperture and 'trimWidthM' not in aperture:
                aperture['trimWidthM']=aperture['archRingM']
    T=module('receiver_textile','assets/source/unit-textile-arcade/build.py')
    T.setup(saved);G=T.G;G.OUT=OUT
    interfaces=runpy.run_path(str(INTERFACES))
    interfaces['install'](G,area,additional_units=ADDITIONAL_UNITS)
    if unit.startswith('unit-tea-'):
        tea=module('receiver_tea','assets/source/unit-tea-terrace/build.py')
        tea.S=T.S;tea.G=G
        scoped=copy.deepcopy(area)
        for face in scoped['faces']:face['parcels']=[p for p in face['parcels'] if p['id'] in RECEIVERS[unit]]
        tea.shells(scoped)
        # Flush niches already have their scheduled floor-level deck. The
        # generic arch's dropped sill must not extend below the elevated grade.
        for face,parcel in selected:
            for opening in parcel['openings']:
                if opening['kind']=='niche' and opening.get('flushBase'):
                    sill=G.bpy.data.objects.get(opening['id']+'-sill')
                    assert sill is not None and G.bpy.data.objects.get(opening['id']+'-deck') is not None
                    G.bpy.data.objects.remove(sill,do_unlink=True)
    else:
        T.S.build_shells(area,T.S.opening if unit=='unit-dyers-dogleg' else T.opening,parcel_ids=RECEIVERS[unit])
    extra_names=[]
    if unit=='unit-dyers-dogleg':
        dogleg=module('receiver_dogleg','assets/source/unit-dyers-dogleg/build.py');dogleg.G=G
        for feature in area.get('facadeFeatures',[]):
            if feature['receiverParcel'] in RECEIVERS[unit]:dogleg.balcony(feature);extra_names.append(feature['id'])
        for group in area['activityGroups']:
            if group['receiverParcel'] not in RECEIVERS[unit]:continue
            gates=[p for p in group['instanceLayout']['parts'] if p['kind']=='locked-timber-lattice-gate']
            if gates:
                one=dict(group,instanceLayout={'parts':gates});one.pop('sign',None)
                T.S.activity(one);extra_names.append(group['id'])
    objects=list(G.bpy.context.scene.objects)
    prefixes=tuple(name+'-' for f,p in selected for name in [p['id']]+[o['id'] for o in p['openings']])+tuple(name+'-' for name in extra_names)
    assert objects and all(o.type=='MESH' and o.name.startswith(prefixes) for o in objects), 'Receiver includes unrelated geometry'
    bounds=area['exportBoundsGltfLocal']
    for ob in objects:
        for vertex in ob.data.vertices:
            x,y,z=ob.matrix_world@vertex.co
            assert all(bounds['min'][i]-1e-5<=value<=bounds['max'][i]+1e-5 for i,value in enumerate((x,z,-y))), (ob.name,'outside declared section bounds')
    if fixture:
        print('PASS receiver geometry, ownership and declared bounds',unit,len(objects));return
    name=PREFIX+unit.removeprefix('unit-')
    spans=[{'orientation':'horizontal' if f['face'] in {'north','south'} else 'vertical','coord':f['wallPlaneM'],'start':p['interval'][0],'end':p['interval'][1]} for f,p in selected]
    G.export(OUT/(name+'.glb'),bounds,area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
             {'bz04InputSha256':saved['inputSha256'],'bz04ReceiverParcels':sorted(RECEIVERS[unit]),'bz04BoundaryCoverage':spans,
              'bz04DesignRevision':area['designRevision']['id'],'bz04ExportBudget':area['budget']})
    evidence={'modelId':name.replace('-','_'),'file':name+'.glb','source':SOURCE_URI,
              'license':'Project-Original','position':{k:area['sectionOriginDesign'][k] for k in ('x','y','z')},'yawDeg':180,'inputSha256':saved['inputSha256'],
              'receiverParcelIds':sorted(RECEIVERS[unit]),'boundaryCoverage':spans,
              'futureDisposition':'Replace this exact dependency placement atomically when its complete area section is installed; do not mark the complete area built.'}
    (OUT/(name+'.json')).write_text(json.dumps(evidence,indent=2)+'\n')


def verify(unit):
    """Test exported receiver triangles against their owning area's clear volumes."""
    saved,selected=inputs(unit);area=saved['areas'][0]
    path=OUT/(PREFIX+unit.removeprefix('unit-')+'.glb')
    payload=path.read_bytes();assert payload[:4]==b'glTF'
    data=json.loads(payload[20:20+struct.unpack_from('<I',payload,12)[0]])
    extras=data['scenes'][data.get('scene',0)]['extras']
    assert extras['bz04InputSha256']==saved['inputSha256']
    assert extras['bz04ReceiverParcels']==sorted(RECEIVERS[unit])
    assert extras['bz04VisualBounds']==area['exportBoundsGltfLocal']
    V=runpy.run_path(str(ROOT/'assets/source/unit-spawn-b-courtyard/verify.py'))
    origin=area['sectionOriginDesign']
    triangles,report=V['glb'](path,tuple(origin[k] for k in ('x','y','z')))
    bounds=area['exportBoundsDesign']
    assert all(all(bounds['min'][i]-.001<=p[i]<=bounds['max'][i]+.001 for i in range(3)) for _,tri in triangles for p in tri), 'Exported receiver escapes frozen bounds'
    checks=[]
    door_depth=runpy.run_path(str(ROOT/'assets/source/integrate_bz04.py'))['door_service_depth']
    for face in area['faces']:
        for parcel in face['parcels']:
            for opening in parcel['openings']:
                if opening['kind']!='door':continue
                z=opening['sillM'];a=opening['alongM'];w=opening['widthM']
                lo,hi=V['volume'](face['face'],face['wallPlaneM'],(a-w/2,0,z+.041),(a+w/2,door_depth(area,face,opening),z+2.1))
                checks.append({'id':opening['id'],'depthM':door_depth(area,face,opening),'intersections':sum(V['intersects'](tri,lo,hi) for _,tri in triangles)})
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
    raised=[[above_floor(v) for v in tri] for _,tri in triangles]
    clear=area['clearRouteRegion']
    volumes=[(clear['id'],(clear['x'],clear['y'],.041),(clear['x']+clear['w'],clear['y']+clear['h'],clear['heightM']))]
    for face in area['faces']:
        for opened in face['openIntervals']:
            start,end=opened['interval'] if isinstance(opened,dict) else opened
            lo,hi=V['volume'](face['face'],face['wallPlaneM'],(start,-.01,.041),(end,.01,4.2))
            volumes.append((face['face']+'-open-'+str(start),lo,hi))
    routes=[{'id':name,'intersections':sum(V['intersects'](tri,lo,hi) for tri in raised)} for name,lo,hi in volumes]
    report.update({'unit':unit,'receiverParcelIds':sorted(RECEIVERS[unit]),'doorServiceChecks':checks,'routeChecks':routes,
                   'sha256':hashlib.sha256(payload).hexdigest(),'inputSha256':saved['inputSha256'],
                   'status':'pass' if not any(c['intersections'] for c in checks+routes) else 'fail'})
    evidence=EVIDENCE/('receiver-'+unit+'-clearance.json')
    evidence.write_text(json.dumps(report,indent=2)+'\n')
    assert report['status']=='pass',[(c['id'],c['intersections']) for c in checks+routes if c['intersections']]
    print('PASS exported receiver triangle clearances',unit,len(checks),'doors',len(routes),'routes/openings')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['input-fixture','self-test','build','verify'])
    parser.add_argument('--unit',choices=sorted(RECEIVERS),required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    if args.mode=='input-fixture':inputs(args.unit);print('PASS exact frozen receiver schedule',args.unit)
    elif args.mode=='verify':verify(args.unit)
    else:build(args.unit,args.mode=='self-test')


if __name__=='__main__':main()
