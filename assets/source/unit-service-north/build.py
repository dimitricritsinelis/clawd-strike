"""Build the approved R7 north service receivers, BC-01 spine and loading fronts."""
from pathlib import Path
import argparse
import copy
import importlib.util
import json
import runpy
import sys

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
UNIT='unit-service-north'
spec=importlib.util.spec_from_file_location('service_north_receivers',ROOT/'assets/source/unit-spawn-a-courtyard/build.py')
S=importlib.util.module_from_spec(spec);spec.loader.exec_module(S)
G=None


def validate(saved,current=None):
    if saved.get('unit')!=UNIT or len(saved.get('areas',[]))!=1:raise ValueError('Expected Service North frozen unit')
    if S.digest(saved)!=saved.get('inputSha256'):raise ValueError('Frozen handoff contents do not match inputSha256')
    current=current or runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if current['inputSha256']!=saved['inputSha256']:raise ValueError('Area inputs changed since handoff extraction')
    area=saved['areas'][0]
    assert area['zone']=='SERVICE_NORTH' and area['designRevision']['id'].startswith('R7')
    caps=saved['requiredCapabilities']
    assert set(caps['openingProfiles'])<={'rectangular'}
    for key in ['openingCraftProfiles','glazingPatterns','featureKinds','landscapeKinds','partKinds']:assert not caps[key],('unsupported capability',key,caps[key])
    assert set(caps['craftRecipes'])<={'CF-ENVELOPE','CF-FLOOR','CF-JOINT','CF-OPEN'}
    assert not area['activityGroups'] and not area['fixtures']
    return area


def setup(saved):
    global G
    G=S.geometry(saved);G.OUT=OUT
    origin=G.A['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ['x','y','z']))
    return G


def opening(face,plane,o,trim,back):
    S.opening(face,plane,o,trim,back)
    if o['kind']!='door':return
    assert face=='west' and o['headShape']=='rectangular' and o['frontProjectionM']==0
    for side,along in [('left',o['alongM']-o['widthM']/2),('right',o['alongM']+o['widthM']/2)]:
        ob=G.bpy.data.objects[o['id']+'-'+side+'-return']
        modifier=next(m for m in ob.modifiers if m.type=='BEVEL');modifier.limit_method='WEIGHT'
        weights=ob.data.attributes.new('bevel_weight_edge','FLOAT','EDGE')
        for edge,weight in zip(ob.data.edges,weights.data):
            weight.value=float(all(abs(G.ORIGIN[1]-ob.data.vertices[i].co.y-along)<1e-5 and abs(G.ORIGIN[0]+ob.data.vertices[i].co.x-plane)<1e-5 for i in edge.vertices))


def shells(area):
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    interfaces['install'](G,area,additional_units={UNIT:None,'unit-caravan-court':None,'unit-service-south':None,
        'unit-link-north-west':{'lnw-n-part-2'},'unit-tea-terrace':{'tt-rug-return'},'unit-tea-stairs':{'ts-e'}})
    from integrate_bz04 import load_handoff
    caravan=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map/unit-caravan-court/handoff.json')['areas'][0]
    receiver_face,receiver=next((f,p) for f in caravan['faces'] for p in f['parcels'] if p['id']=='cc-n')
    assert receiver_face['face']=='north' and receiver_face['wallPlaneM']==48 and receiver['interval']==[10,11]
    tea=[]
    for unit,pid in [('unit-tea-ramp','tr-w'),('unit-tea-terrace','tt-w'),('unit-tea-stairs','ts-w'),('unit-tea-landing','tl-w')]:
        saved=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map'/unit/'handoff.json')
        tea_area=saved['areas'][0]
        face,wall=next((f,p) for f in tea_area['faces'] for p in f['parcels'] if p['id']==pid)
        assert face['face']=='west' and face['wallPlaneM']==11
        tea.append((wall,tea_area['floor']))
    link=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map/unit-link-north-west/handoff.json')['areas'][0]
    link_receivers={p['id']:(f,p) for f in link['faces'] for p in f['parcels'] if p['id'] in {'lnw-s','lnw-w'}}
    original_part=G.part
    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        target='lnw-s' if name=='sn-en-end-closure' else 'lnw-w' if name=='sn-n-end-closure' else None
        if target:
            receiver_face,receiver_wall=link_receivers[target]
            if abs(hi[0]-receiver_face['wallPlaneM'])<1e-8:
                a,b=interfaces['local_bounds'](face,plane,receiver_wall)
                result=None
                for low,high in interfaces['difference'](lo,hi,a,b):result=original_part(face,plane,name,low,high,mid,shadow,bevel)
                return result
        if name not in {pid+'-'+kind for pid in ['sn-es','sn-et','sn-en'] for kind in ['back','end-closure']}:
            return original_part(face,plane,name,lo,hi,mid,shadow,bevel)
        assert face=='east' and plane==10
        if name=='sn-es-end-closure' and abs(lo[0]-48)<1e-5:
            lo=(lo[0],lo[1],max(lo[2],receiver['wallTopM']))
        result=None
        for wall,floor in tea:
            a,b=max(lo[0],wall['interval'][0]),min(hi[0],wall['interval'][1])
            if b-a<=1e-8:continue
            cut_lo=max(lo[1],plane-wall['footprint'][2]);cut_hi=min(hi[1],plane-wall['footprint'][0])
            for left,right in [(lo[1],cut_lo),(cut_hi,hi[1])]:
                if right-left>1e-8:result=original_part(face,plane,name,(a,left,lo[2]),(b,right,hi[2]),mid,shadow,bevel)
            if cut_hi-cut_lo<=1e-8:continue
            top=max(lo[2],wall['wallTopM'])
            if hi[2]-top>1e-8:result=original_part(face,plane,name,(a,cut_lo,top),(b,cut_hi,hi[2]),mid,shadow,bevel)
            def grade(y):
                if floor['kind']=='flat':return floor['elevationM']
                return floor['startElevationM']+(y-floor['rect']['y'])/floor['rect']['h']*(floor['endElevationM']-floor['startElevationM'])
            # Preserve the existing buried lower shell as a closed triangle or
            # trapezoid under the exact adjacent Tea grade.
            profile=[(a,lo[2]),(b,lo[2]),(b,max(lo[2],grade(b))),(a,max(lo[2],grade(a)))]
            polygon=[]
            for point in profile:
                if not polygon or point!=polygon[-1]:polygon.append(point)
            if len(polygon)>1 and polygon[0]==polygon[-1]:polygon.pop()
            if len(polygon)>=3:result=G.prism_profile(name+'-below-grade',face,plane,polygon,cut_lo,cut_hi,mid)
        return result
    G.part=part
    S.build_shells(area,opening)
    G.part=original_part
    # Rear-box caps also lie on the newly owned recessed Link faces.
    import bmesh
    for prefix,target,axis,along_axis in [('sn-n-back','lnw-w',0,1),('sn-en-back','lnw-s',1,0)]:
        receiver_face,receiver_wall=link_receivers[target]
        for ob in list(G.bpy.context.scene.objects):
            if not ob.name.startswith(prefix):continue
            bm=bmesh.new();bm.from_mesh(ob.data);caps=[]
            for face in bm.faces:
                points=[(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]) for v in face.verts]
                if all(abs(p[axis]-receiver_face['wallPlaneM'])<1e-5
                    and receiver_wall['interval'][0]-1e-5<=p[along_axis]<=receiver_wall['interval'][1]+1e-5
                    and receiver_wall['floorElevationM']-1e-5<=p[2]<=receiver_wall['wallTopM']+1e-5 for p in points):caps.append(face)
            if caps:bmesh.ops.delete(bm,geom=caps,context='FACES_ONLY')
            bm.to_mesh(ob.data);bm.free()



def verify_geometry(area):
    import bpy
    # The quiet spine has four continuous BC-01 receivers and no invented doors.
    boundary=[p for f in area['faces'] for p in f['parcels'] if p['structuralGrid'].get('assembly')=='BC-01']
    assert len(boundary)==4 and all(not p['openings'] for p in boundary)
    names=[o.name for o in bpy.context.scene.objects]
    for p in boundary:assert any(name.startswith(p['id']+'-pier-reveal') for name in names),('missing recessed BC-01 fields',p['id'])
    for p in [p for f in area['faces'] for p in f['parcels']]:
        for o in p['openings']:
            assert any(name.startswith(o['id']) for name in names),('missing scheduled opening',o['id'])
    assert len([o for f in area['faces'] for p in f['parcels'] for o in p['openings'] if o['kind']=='door'])==3
    from mathutils import Vector
    for ob in bpy.context.scene.objects:G.prepare_mesh(ob)
    louvers=0
    for face in area['faces']:
        for parcel in face['parcels']:
            objects=[ob for ob in bpy.context.scene.objects if ob.name.startswith(parcel['id']+'-')]
            if parcel in boundary:
                for ob in objects:
                    for v in ob.data.vertices:
                        along=v.co.x+G.ORIGIN[0] if face['face'] in {'north','south'} else G.ORIGIN[1]-v.co.y
                        assert parcel['interval'][0]-.002<=along<=parcel['interval'][1]+.002,('BC-01 escaped protected span',ob.name,along)
                fields=[ob for ob in objects if ob.name.startswith(parcel['id']+'-field')]
                assert any(any(abs((face['wallPlaneM']-(v.co.x+G.ORIGIN[0]) if face['face']=='east' else face['wallPlaneM']-(G.ORIGIN[1]-v.co.y))+.045)<1e-5 for v in ob.data.vertices) for ob in fields),'BC-01 field is not recessed 45 mm'
            for o in parcel['openings']:
                if o['kind']!='door':
                    louvers+=1;assert any(ob.name.startswith(o['id']+'-louver') for ob in objects)
                    continue
                assert len([ob for ob in objects if ob.name.startswith(o['id']+'-leaf-panel')])==2
                for side,sign in [('left',-1),('right',1)]:
                    ob=bpy.data.objects[o['id']+'-'+side+'-return'];edge=o['alongM']+sign*(o['widthM']/2+max(.1,o.get('trimWidthM',.1))-.001)
                    start=Vector(G.local((face['wallPlaneM']+.1,edge,1.513)));hit,point,normal,index=ob.ray_cast(start,Vector((-1,0,0)),distance=.2)
                    assert hit and abs(point.x+G.ORIGIN[0]-face['wallPlaneM'])<1e-5,'Loading jamb leaves a wall-side seam'
                frame=bpy.data.objects[o['id']+'-frame-jamb'];assert frame.data.materials[0]==G.mat(G.WOOD)
    assert louvers==6
    rear=[ob for ob in bpy.context.scene.objects if ob.name.startswith('sn-es-back')]
    assert rear
    def rear_hit(y,z):
        return any(ob.ray_cast(Vector(G.local((11.1,y,z))),Vector((-1,0,0)),distance=.3)[0] for ob in rear)
    assert not rear_hit(50,2) and not rear_hit(55,2), 'SN rear still covers Ramp recessed fields'
    assert rear_hit(50,6.2), 'SN upper closure was removed'
    assert not rear_hit(56.7,2), 'SN rear still covers Terrace field'
    assert rear_hit(56.7,.2), 'SN Terrace below-grade backing was removed'
    assert rear_hit(55,.2), 'SN below-grade rear wedge was removed'
    primary=[ob for ob in bpy.context.scene.objects if ob.name.startswith('sn-es-field')]
    assert any(ob.ray_cast(Vector(G.local((9.9,50,2))),Vector((1,0,0)),distance=.2)[0] for ob in primary), 'SN primary face changed'



def build(saved):
    area=validate(saved);setup(saved);shells(area);verify_geometry(area)
    G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],{'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})


def input_fixture(saved):
    validate(saved)
    for mutation in [lambda p:p.update(unit='wrong-unit'),lambda p:p['areas'][0].update(floorMaterialId='tampered')]:
        bad=copy.deepcopy(saved);mutation(bad)
        try:validate(bad,saved)
        except ValueError:pass
        else:raise AssertionError('Invalid frozen input accepted')
    bad=copy.deepcopy(saved);bad['requiredCapabilities']['partKinds'].append('new-part');bad['inputSha256']=S.digest(bad)
    try:validate(bad,bad)
    except AssertionError:pass
    else:raise AssertionError('Unknown part accepted')
    print('PASS Service North input fixtures: frozen issue, tampering and unexpected part rejection')


def self_test(saved):
    input_fixture(saved);area=validate(saved);setup(saved);shells(area);verify_geometry(area)
    print('PASS Service North geometry fixtures: four BC-01 receivers, three loading fronts and exact high vents')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('mode',choices=['build','self-test','input-fixture'],nargs='?',default='build');parser.add_argument('--handoff',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None);saved=json.loads(args.handoff.read_text())
    {'build':build,'self-test':self_test,'input-fixture':input_fixture}[args.mode](saved)
