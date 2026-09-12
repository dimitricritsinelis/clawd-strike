"""Build R7 Dyers Alley sample workrooms, receiving front and domestic wing.

The historical crossing canopy/carrier belongs to Covered Souk and is retired
with that owner; this area adds only its scheduled east workroom awning.
"""
from pathlib import Path
import argparse
import copy
import importlib.util
import json
import math
import runpy
import sys

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
UNIT='unit-dyers-alley'
spec=importlib.util.spec_from_file_location('dyers_alley_textile_helpers',ROOT/'assets/source/unit-textile-arcade/build.py')
T=importlib.util.module_from_spec(spec);spec.loader.exec_module(T)
S=T.S
G=None
KINDS={'stone-plinth','rounded-ceramic-vessel','lidded-ceramic-vessel','grounded-timber-table','folded-cloth','hanging-cloth','locked-timber-lattice-gate','timber-member','grounded-timber-bench'}


def validate(saved,current=None):
    if saved.get('unit')!=UNIT or len(saved.get('areas',[]))!=1:raise ValueError('Expected Dyers Alley frozen unit')
    if S.digest(saved)!=saved.get('inputSha256'):raise ValueError('Frozen handoff contents do not match inputSha256')
    current=current or runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if current['inputSha256']!=saved['inputSha256']:raise ValueError('Area inputs changed since handoff extraction')
    area=saved['areas'][0];caps=saved['requiredCapabilities']
    assert area['zone']=='DYERS_ALLEY' and area['designRevision']['id'].startswith('R7')
    assert set(caps['openingProfiles'])<={'rectangular','segmental'}
    assert set(caps['openingCraftProfiles'])<={'planked-receiving','painted-domestic'}
    assert set(caps['partKinds'])<=KINDS,('unsupported parts',set(caps['partKinds'])-KINDS)
    for key in ['glazingPatterns','featureKinds','landscapeKinds']:assert not caps[key],('unsupported capability',key)
    assert set(caps['craftRecipes'])<={'CF-CERAMIC','CF-CLOTH','CF-DYE-VESSEL','CF-ENVELOPE','CF-FLOOR','CF-FURNITURE','CF-JOINT','CF-OPEN','CF-R4-PORTAL','CF-SHADE','CF-STONE','CF-TIMBER'}
    assert len(area['fixtures'])==1 and area['fixtures'][0]['id']=='SHADE_DA_E_WORK_RECESS'
    return area


def setup(saved):
    global G
    G=S.geometry(saved);G.OUT=OUT;T.G=G
    origin=G.A['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ['x','y','z']))


def cloth(group,item):
    import bpy
    face=group['receiverFace'];plane=next(f['wallPlaneM'] for f in G.A['faces'] if f['face']==face)
    op=next(o for o in G.PARCELS[group['receiverParcel']]['openings'] if o['id']==group['receiverOpening'])
    along=op['alongM'];deck=group['bbox']['min'][2];lo=item['localBox']['min'];hi=item['localBox']['max'];name=group['id']+'-'+item['id']
    center=(lo[1]+hi[1])/2;bow=min(.01,(hi[1]-lo[1]-.008)/2)
    path=[(center+bow*math.sin(math.pi*i/8),deck+hi[2]-(hi[2]-lo[2])*i/8) for i in range(9)]
    before=set(bpy.context.scene.objects)
    G.cloth_path(name,face,plane,along+lo[0],along+hi[0],path,item['materialId'],border=.025,color=item['stockColorSrgb'],fringe=0)
    for ob in set(bpy.context.scene.objects)-before:
        ob.data.materials[0]=G.mat(item['materialId']);G.paint_object(ob,item['stockColorSrgb'],True)
    rail=next((p for p in group['instanceLayout']['parts'] if p['id']=='drying-rail'),None)
    if rail:
        box=rail['localBox'];out=(box['min'][1]+box['max'][1])/2;z=deck+(box['min'][2]+box['max'][2])/2
    else:
        out=op['depthM']*-1+.025;z=deck+hi[2]+.02
        G.part(face,plane,group['id']+'-wall-rail',(along+lo[0]-.04,out-.025,z-.02),(along+hi[0]+.04,out+.025,z+.02),G.WOOD,'receive',.003)
    for a in [along+lo[0]+.025,along+hi[0]-.025]:
        G.member(group['id']+'-cloth-tie-'+item['id'],G.coords(face,plane,a,center,deck+hi[2]-.005),G.coords(face,plane,a,out,z),.01,G.WOOD,'receive')


def activity(group):
    for item in group['instanceLayout']['parts']:
        kind=item['kind'];one=dict(group,instanceLayout={'parts':[item]});one.pop('sign',None)
        if kind=='hanging-cloth':cloth(group,item)
        elif kind=='grounded-timber-bench':
            S.activity(dict(one,instanceLayout={'parts':[dict(item,kind='grounded-timber-table')]}))
        elif kind in KINDS:S.activity(one)
        else:raise ValueError('Unsupported Dyers stock '+kind)
    if group.get('sign'):
        S.activity(dict(group,instanceLayout={'parts':[]}))


def verify_geometry(area):
    import bpy
    S.validate_objects(area)
    names=[o.name for o in bpy.context.scene.objects]
    for group in area['activityGroups']:
        assert any(name.startswith(group['id']+'-closed-work-gate-vertical-lattice') for name in names),('missing physical lattice',group['id'])
        for item in group['instanceLayout']['parts']:
            if item['kind']=='hanging-cloth':
                assert len([name for name in names if name.startswith(group['id']+'-cloth-tie-'+item['id'])])==2,('cloth lacks receiver ties',item['id'])
    assert not any('canopy-carrier' in name for name in names),'Covered Souk carrier is outside this unit'


def opening(face,plane,o,trim,back):
    T.opening(face,plane,o,trim,back)
    if o['kind']=='shop' and o['headShape']!='rectangular':
        S.close_arch_shoulders(face,plane,o,trim)
    if o['kind']=='shop':
        cavity=o['shopfront']['cavity'];join=plane-cavity['chamberFromOutM']-G.ORIGIN[0]
        ceiling=G.bpy.data.objects[o['id']+'-chamber-ceiling'];head=G.bpy.data.objects[o['id']+'-head']
        for vertex in ceiling.data.vertices:
            if vertex.co.x<join:vertex.co.x=join
        if o['headShape']=='rectangular':
            for vertex in head.data.vertices:
                if vertex.co.x>join:vertex.co.x=join
        else:
            # The shaped ring is the front head; no second rectangular beam
            # should overlap the ceiling behind the 0.28 m barrel.
            G.bpy.data.objects.remove(head,do_unlink=True)
    if o['headShape']=='rectangular' and o.get('frontProjectionM')==0:
        for side,along in [('left',o['alongM']-o['widthM']/2),('right',o['alongM']+o['widthM']/2)]:
            ob=G.bpy.data.objects.get(o['id']+'-'+side+'-return')
            if ob is None:continue
            modifier=next((m for m in ob.modifiers if m.type=='BEVEL'),None)
            if modifier is None:continue
            modifier.limit_method='WEIGHT';weights=ob.data.attributes.new('bevel_weight_edge','FLOAT','EDGE')
            for edge,weight in zip(ob.data.edges,weights.data):
                weight.value=float(all(abs(G.ORIGIN[1]-ob.data.vertices[i].co.y-along)<1e-5 and abs(G.ORIGIN[0]+ob.data.vertices[i].co.x-plane)<1e-5 for i in edge.vertices))


def shells(area):
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    interfaces['install'](G,area,additional_units={UNIT:None,'unit-covered-souk':{'cs-s-part-2'},'unit-link-south-east':{'lse-n-part-2'}})
    S.build_shells(area,opening_builder=opening)
    import bmesh
    from integrate_bz04 import load_handoff
    for unit,ident,owner in [('unit-covered-souk','cs-s-part-2','da-house'),('unit-link-south-east','lse-n-part-2','da-works')]:
        receiver=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map'/unit/'handoff.json')['areas'][0]
        face,p=next((f,p) for f in receiver['faces'] for p in f['parcels'] if p['id']==ident)
        for ob in G.bpy.context.scene.objects:
            if ob.name!=owner+'-back' and not ob.name.startswith(owner+'-cornice'):continue
            bm=bmesh.new();bm.from_mesh(ob.data)
            if '-cornice' in ob.name:
                # The receiver owns the inner cap strip; the projecting
                # cornice still closes outside its facade interval.
                bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,
                    plane_co=(p['interval'][1]-G.ORIGIN[0],0,0),plane_no=(1,0,0))
            caps=[f for f in bm.faces if all(abs(G.ORIGIN[1]-v.co.y-face['wallPlaneM'])<1e-5 and p['interval'][0]-1e-5<=v.co.x+G.ORIGIN[0]<=p['interval'][1]+1e-5 and p['floorElevationM']-1e-5<=v.co.z+G.ORIGIN[2]<=p['wallTopM']+1e-5 for v in f.verts)]
            if caps:bmesh.ops.delete(bm,geom=caps,context='FACES_ONLY')
            bm.to_mesh(ob.data);bm.free()


def build(saved,export=True):
    area=validate(saved);setup(saved);shells(area)
    for group in area['activityGroups']:activity(group)
    for fixture in area['fixtures']:G.awning(fixture)
    verify_geometry(area)
    if export:
        G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],{'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})


def input_fixture(saved):
    validate(saved)
    for mutation in [lambda p:p.update(unit='wrong-unit'),lambda p:p['areas'][0].update(floorMaterialId='tampered')]:
        bad=copy.deepcopy(saved);mutation(bad)
        try:validate(bad,saved)
        except ValueError:pass
        else:raise AssertionError('Invalid frozen input accepted')
    bad=copy.deepcopy(saved);bad['requiredCapabilities']['partKinds'].append('unknown-part');bad['inputSha256']=S.digest(bad)
    try:validate(bad,bad)
    except AssertionError:pass
    else:raise AssertionError('Unknown part accepted')
    print('PASS Dyers Alley input fixtures: exact issue, tampering and unsupported parts')


def self_test(saved):
    input_fixture(saved);build(saved,False);area=saved['areas'][0]
    from mathutils import Vector
    for ob in G.bpy.context.scene.objects:G.prepare_mesh(ob)
    assert len([p for f in area['faces'] for p in f['parcels']])==6
    assert len([o for f in area['faces'] for p in f['parcels'] for o in p['openings']])==16
    assert sum(len(g['instanceLayout']['parts']) for g in area['activityGroups'])==15
    for group in area['activityGroups']:
        op=next(o for f in area['faces'] for p in f['parcels'] for o in p['openings'] if o['id']==group['receiverOpening'])
        start=Vector(G.local((54,op['alongM'],2.5)));hits=[]
        for ob in G.bpy.context.scene.objects:
            if not ob.name.startswith(op['id']+'-'):continue
            hit,point,normal,index=ob.ray_cast(start,Vector((0,0,1)),distance=.5)
            if hit:hits.append((point.z,ob.name))
        assert sorted(hits)[0][1]==op['id']+'-chamber-ceiling' and sum(abs(z-2.75)<1e-5 for z,name in hits)==1,'Duplicate chamber ceiling'
    sample=[ob for ob in G.bpy.context.scene.objects if ob.name.startswith('DA_E_SAMPLE_RECESS-')]
    for y in (20.15,22.89):
        start=Vector(G.local((52.9,y,2.29)));hits=[]
        for ob in sample:
            hit,point,normal,index=ob.ray_cast(start,Vector((1,0,0)),distance=.5)
            if hit:hits.append((point.x+G.ORIGIN[0],ob.name))
        assert abs(min(x for x,name in hits)-53)<1e-5 and sum(abs(x-53)<1e-5 for x,name in hits)==1,'Open or duplicated spring join'
    group=area['activityGroups'][0]
    for item in group['instanceLayout']['parts']:
        if item['kind'] not in {'rounded-ceramic-vessel','lidded-ceramic-vessel'}:continue
        ob=G.bpy.data.objects[group['id']+'-'+item['id']];lo=item['localBox']['min'];hi=item['localBox']['max'];a=12.88+(lo[0]+hi[0])/2;out=(lo[1]+hi[1])/2
        hit,point,normal,index=ob.ray_cast(Vector(G.local(G.coords('east',53,a,out,2))),Vector((0,0,-1)),distance=2)
        target=.04+(lo[2]+.12*(hi[2]-lo[2]) if item['kind']=='rounded-ceramic-vessel' else hi[2])
        assert hit and abs(point.z-target)<1e-5,('Vessel interior/lid invalid',item['id'])
    objects=list(G.bpy.context.scene.objects)
    assert len([o for o in objects if o.name.startswith('da-works-L1-W2-leaf-panel')])==3
    for ident in ('da-house-L1-W1','da-house-L1-W2','da-house-L1-W3'):
        assert len([o for o in objects if o.name.startswith(ident+'-leaf-panel')])==2
    for prefix in ('G_DA_E_WORK_RECESS-side-table','G_DA_E_SAMPLE_RECESS-folding-bench'):
        legs=[o for o in objects if o.name.startswith(prefix+'-leg')];assert len(legs)==4
        assert abs(min(v.co.z for o in legs for v in o.data.vertices)-.04)<1e-5
    shade=area['fixtures'][0]
    for ob in objects:
        if not ob.name.startswith(shade['id']+'-'):continue
        for v in ob.data.vertices:
            world=(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]);box=shade['clothBbox'] if '-cloth' in ob.name else shade['bbox']
            assert all(box['min'][i]-.001<=world[i]<=box['max'][i]+.001 for i in range(3))
    print('PASS Dyers: 16 openings, 15 bounded parts, two framed gates, hollow/lidded vessels, tied samples, grounded furniture and separate chamber ceilings',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('mode',choices=['build','self-test','input-fixture'],nargs='?',default='build');parser.add_argument('--handoff',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None);saved=json.loads(args.handoff.read_text())
    {'build':build,'self-test':self_test,'input-fixture':input_fixture}[args.mode](saved)
