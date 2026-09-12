"""Frozen R7 link receivers: closed scheduled spans and protected open mouths."""
from pathlib import Path
import argparse
import importlib.util
import json
import runpy
import sys

ROOT=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('bz04_spawn_a',ROOT/'assets/source/unit-spawn-a-courtyard/build.py')
S=importlib.util.module_from_spec(spec);spec.loader.exec_module(S)
UNITS={'unit-link-'+name for name in ['west-mid','east-mid','west-upper','east-upper','south-west','south-east','north-west','north-east']}


def validate(saved,unit):
    if unit not in UNITS or saved.get('unit')!=unit or len(saved.get('areas',[]))!=1:
        raise ValueError('Expected exact frozen link unit')
    if S.digest(saved)!=saved.get('inputSha256'):raise ValueError('Frozen handoff contents do not match inputSha256')
    current=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](unit)
    if current['inputSha256']!=saved['inputSha256']:raise ValueError('Area inputs changed since handoff extraction')
    area=saved['areas'][0]
    assert area['designRevision']['id'].startswith('R7')
    assert area['floor']['kind']=='flat' and area['floor']['elevationM']==0
    assert not any(saved['requiredCapabilities'][k] for k in ['openingProfiles','openingCraftProfiles','glazingPatterns','featureKinds','landscapeKinds','partKinds'])
    assert not area['activityGroups'] and not area['fixtures']
    for face in area['faces']:
        for p in face['parcels']:
            assert p['floorElevationM']==0 and not p['openings']
            for opened in face['openIntervals']:
                span=opened['interval'] if isinstance(opened,dict) else opened
                assert min(p['interval'][1],span[1])-max(p['interval'][0],span[0])<=1e-8,(p['id'],'overlaps protected mouth')
    return area


def west_upper_shells(G,area):
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    active=runpy.run_path(str(ROOT/'assets/source/unit-rug-gate/build-receivers.py'))['ADDITIONAL_UNITS']
    active.update({'unit-link-west-upper':None,'unit-tea-landing':None,'unit-tea-stairs':None,'unit-spawn-b-courtyard':None})
    interfaces['install'](G,area,additional_units=active)
    tea=json.loads((ROOT/'artifacts/bazaar-r7-whole-map/unit-tea-stairs/handoff.json').read_text())
    assert S.digest(tea)==tea['inputSha256']
    floor=tea['areas'][0]['floor'];neighbor=next(p for f in tea['areas'][0]['faces'] for p in f['parcels'] if p['id']=='ts-e')
    assert floor['kind']=='ramp' and floor['axis']=='y'
    x,y,X,Y=neighbor['footprint'];original=G.part
    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        # B and Rug own the surrounding solid volume; this current boundary
        # supplies only its recessed public front and its floor contact.
        if name in {'lwu-n-back','lwu-n-end-closure'}:return None
        if name!='lwu-s-base-closure':return original(face,plane,name,lo,hi,mid,shadow,bevel)
        assert face=='south' and plane==Y==72 and lo[0]==x==19 and lo[1]==-.5
        # Preserve the exact checked Rug dependency's 19.6 m grade split.
        result=None
        for start,end in [(lo[0],X),(X,hi[0])]:
            result=original(face,plane,name,(start,lo[1],lo[2]),(end,hi[1],hi[2]),mid,shadow,bevel)
            if start>=X:continue
            for vertex in result.data.vertices:
                worldY=G.ORIGIN[1]-vertex.co.y
                grade=floor['startElevationM']+(worldY-floor['rect']['y'])/floor['rect']['h']*(floor['endElevationM']-floor['startElevationM'])
                vertex.co.z+=grade
            result.data.update();G.world_uv(result,float(result.data.materials[0].get('tileSizeM',2)))
        return result
    G.part=part
    try:S.build_shells(area)
    finally:G.part=original
    bases=[o for o in G.bpy.context.scene.objects if o.name.startswith('lwu-s-base-closure')]
    assert len(bases)==2
    for ob in bases:
        for vertex in ob.data.vertices:
            worldX=vertex.co.x+G.ORIGIN[0];worldY=G.ORIGIN[1]-vertex.co.y
            grade=floor['startElevationM']+(worldY-floor['rect']['y'])/floor['rect']['h']*(floor['endElevationM']-floor['startElevationM']) if ob==bases[0] else 0
            assert min(abs(vertex.co.z-grade),abs(vertex.co.z-grade+.02))<1e-6,'Changed Link/Tea base grade or thickness'
    from mathutils import Vector
    start=Vector(G.local((20,76,2)));hits=[]
    for ob in G.bpy.context.scene.objects:
        G.prepare_mesh(ob)
        hit,point,normal,index=ob.ray_cast(start,Vector((0,-1,0)),distance=1)
        if hit:hits.append((point-start).length)
    assert hits and abs(min(hits)-.545)<1e-5,'BC-01 field lost its 45 mm recess'
    print('PASS Link West Upper: exact split Tea grade, 20 mm base, 45 mm field and buried north skins removed')


def east_upper_shells(G,area):
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    active=runpy.run_path(str(ROOT/'assets/source/unit-north-court/build-receivers.py'))['ADDITIONAL_UNITS']
    active.update({'unit-link-east-upper':None,'unit-textile-arcade':None})
    interfaces['install'](G,area,additional_units=active)
    original=G.part
    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        # Preserve the checked North receiver's reciprocal outer-rear ownership.
        if name in {'leu-n-part-2-end-closure','leu-s-part-3-end-closure'} and lo[0] in {37.5,38}:return None
        # This short boundary's ends are enclosed by the taller adjacent parcels.
        if name=='leu-s-part-2-end-closure':return None
        return original(face,plane,name,lo,hi,mid,shadow,bevel)
    G.part=part
    try:S.build_shells(area)
    finally:G.part=original
    from mathutils import Vector
    for x in [37.2,37.5,37.8]:
        start=Vector(G.local((x,68,2)));hits=[]
        for ob in G.bpy.context.scene.objects:
            G.prepare_mesh(ob)
            hit,point,normal,index=ob.ray_cast(start,Vector((0,1,0)),distance=2)
            if hit:hits.append((point-start).length)
        expected=1 if x==37.5 else 1.045
        assert hits and abs(min(hits)-expected)<1e-5,'Boundary pier or 45 mm recessed field changed'
    print('PASS Link East Upper: complete BC-01 field/pier, checked North reciprocal ends and prior owner interfaces')


def south_west_shells(G,area):
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    interfaces['install'](G,area,additional_units={'unit-link-south-west':None,'unit-service-south':None,'unit-spawn-a-courtyard':None,'unit-spice-street':None})
    original=G.part
    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        # Adjacent taller parcels own the enclosed contact sides. Spawn A's
        # existing rear closes the coincident outside x13.9 boundary.
        if name=='lsw-n-part-2-end-closure' and abs(lo[0]-13.6)<1e-7:return None
        if name=='lsw-s-end-closure' and abs(hi[0]-13.9)<1e-7:return None
        if name=='lsw-s-part-2-end-closure' and abs(lo[0]-13.9)<1e-7:return None
        return original(face,plane,name,lo,hi,mid,shadow,bevel)
    G.part=part
    try:S.build_shells(area)
    finally:G.part=original
    from mathutils import Vector
    samples=[((15,12,2),(0,-1,0),'ph_bz04_plastered_wall'),((12,9,2),(0,1,0),'ph_bz04_sandstone_blocks_06'),((11,9,2),(-1,0,0),'ph_bz04_sandstone_blocks_05')]
    for world,direction,material in samples:
        start=Vector(G.local(world));hits=[]
        for ob in G.bpy.context.scene.objects:
            G.prepare_mesh(ob)
            hit,point,normal,index=ob.ray_cast(start,Vector(direction),distance=2)
            if hit:hits.append(((point-start).length,ob.data.materials[0].name))
        nearest=min(hits)
        assert abs(nearest[0]-1.045)<1e-5 and nearest[1]==G.mat(material).name,('Boundary field depth/material differs from frozen region',world,nearest)
    print('PASS Link South West: three 45 mm BC-01 fields use frozen material regions, clear mouths and joined owner envelopes')


def south_east_shells(G,area):
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    interfaces['install'](G,area,additional_units={'unit-link-south-east':None,'unit-dyers-alley':None,'unit-spawn-a-courtyard':None})
    original=G.part
    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        # Preserve the Dyers receiver's checked west-end omission. Existing
        # parent rears close coincident outside boundaries; taller parcels
        # enclose the adjoining low boundary ends.
        if name=='lse-n-part-2-end-closure' and abs(lo[0]-42.4)<1e-7:return None
        if name=='lse-n-end-closure' and abs(hi[0]-42.4)<1e-7:return None
        if name=='lse-s-part-2-end-closure' and abs(lo[0]-42.2)<1e-7:return None
        if name=='lse-s-end-closure' and abs(hi[0]-42.2)<1e-7:return None
        return original(face,plane,name,lo,hi,mid,shadow,bevel)
    G.part=part
    try:S.build_shells(area)
    finally:G.part=original
    from mathutils import Vector
    samples=[((41,12,2),(0,-1,0),'ph_bz04_aged_plaster_ochre'),((44,9,2),(0,1,0),'ph_bz04_sandstone_blocks_06'),((45,9,2),(1,0,0),'ph_bz04_plastered_wall')]
    for world,direction,material in samples:
        start=Vector(G.local(world));hits=[]
        for ob in G.bpy.context.scene.objects:
            G.prepare_mesh(ob)
            hit,point,normal,index=ob.ray_cast(start,Vector(direction),distance=2)
            if hit:hits.append(((point-start).length,ob.data.materials[0].name))
        nearest=min(hits)
        assert abs(nearest[0]-1.045)<1e-5 and nearest[1]==G.mat(material).name,('Boundary field differs from frozen region',world,nearest)
    print('PASS Link South East: three 45 mm BC-01 fields, exact material regions, Dyers rear ownership and open routes')


def north_west_shells(G,area):
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    interfaces['install'](G,area,additional_units={'unit-link-north-west':None,'unit-spawn-b-courtyard':None,'unit-rug-gate':None,'unit-tea-landing':None,'unit-service-north':None})
    contacts={}
    for unit,ids in [('unit-service-north',{'sn-en','sn-n'}),('unit-tea-landing',{'tl-w'}),('unit-spawn-b-courtyard',{'B_S_WEST'})]:
        saved=json.loads((ROOT/'artifacts/bazaar-r7-whole-map'/unit/'handoff.json').read_text());assert S.digest(saved)==saved['inputSha256']
        contacts.update({p['id']:p for f in saved['areas'][0]['faces'] for p in f['parcels'] if p['id'] in ids})
    original=G.part
    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        if name=='lnw-n-end-closure' and abs(hi[0]-13.4)<1e-7:return None
        owners={'lnw-e':['B_S_WEST'],'lnw-s':['sn-en','tl-w'],'lnw-w':['sn-n']}
        pid=next((p for p in owners if name in {p+'-back',p+'-end-closure'}),None)
        if pid is None:return original(face,plane,name,lo,hi,mid,shadow,bevel)
        # These approved boundary parcels intersect distinct parent owners;
        # subtract only their exact frozen volumes from non-front skins.
        pieces=[(lo,hi)]
        for other in owners[pid]:
            low,high=interfaces['local_bounds'](face,plane,contacts[other])
            pieces=[piece for a,b in pieces for piece in interfaces['difference'](a,b,low,high)]
        result=None
        for a,b in pieces:result=original(face,plane,name,a,b,mid,shadow,bevel)
        return result
    G.part=part
    try:S.build_shells(area)
    finally:G.part=original
    from mathutils import Vector
    samples=[((12,80,2),(0,-1,0),'ph_bz04_sandstone_blocks_05'),((16,77.25,2),(1,0,0),'ph_bz04_sandstone_blocks_05'),((10.5,77,2),(0,1,0),'ph_bz04_beige_wall_002'),((11,80.5,2),(-1,0,0),'ph_bz04_sandstone_blocks_06')]
    for world,direction,material in samples:
        start=Vector(G.local(world));hits=[]
        for ob in G.bpy.context.scene.objects:
            G.prepare_mesh(ob)
            hit,point,normal,index=ob.ray_cast(start,Vector(direction),distance=2)
            if hit:hits.append(((point-start).length,ob.data.materials[0].name))
        nearest=min(hits)
        assert abs(nearest[0]-1.045)<1e-5 and nearest[1]==G.mat(material).name,('Boundary field differs from frozen region',world,nearest)
    print('PASS Link North West: four measured BC-01 fields, exact parent-volume cuts and protected mouths')


def north_east_shells(G,area):
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    active=runpy.run_path(str(ROOT/'assets/source/unit-north-court/build-receivers.py'))['ADDITIONAL_UNITS']
    active.update({'unit-link-north-east':None,'unit-north-court':None,'unit-rug-gate':None,'unit-spawn-b-courtyard':None})
    interfaces['install'](G,area,additional_units=active)
    original=G.part
    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        # The low new boundary ends meet B's existing rear at x42.6 and
        # North's existing western side at x46. Those parents close the ends.
        if name=='lne-n-part-2-end-closure':return None
        return original(face,plane,name,lo,hi,mid,shadow,bevel)
    G.part=part
    try:S.build_shells(area)
    finally:G.part=original
    from mathutils import Vector
    for x,depth,mid in [(42.63,0,'ph_bz04_sandstone_blocks_06'),(44,.045,'ph_bz04_plastered_wall'),(45.95,0,'ph_bz04_sandstone_blocks_06')]:
        start=Vector(G.local((x,80,2)));hits=[]
        for ob in G.bpy.context.scene.objects:
            G.prepare_mesh(ob)
            hit,point,normal,index=ob.ray_cast(start,Vector((0,-1,0)),distance=2)
            if hit:hits.append(((point-start).length,ob.data.materials[0].name))
        nearest=min(hits)
        assert abs(nearest[0]-(1+depth))<1e-5 and nearest[1]==G.mat(mid).name,('Boundary field/pier differs from frozen region',x,nearest)
    print('PASS Link North East: 45 mm plaster field, measured end piers and existing parent-owned side contacts')


def build(saved,unit,fixture=False):
    import bpy
    area=validate(saved,unit);G=S.geometry(saved);G.OUT=ROOT/'assets/source'/unit
    origin=area['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ('x','y','z')))
    if unit in {'unit-link-west-mid','unit-link-east-mid'}:
        interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
        interfaces['install'](G,area,additional_units={'unit-caravan-court':None} if unit=='unit-link-west-mid' else {'unit-covered-souk':None})
    if unit=='unit-link-west-upper':west_upper_shells(G,area)
    elif unit=='unit-link-east-upper':east_upper_shells(G,area)
    elif unit=='unit-link-south-west':south_west_shells(G,area)
    elif unit=='unit-link-south-east':south_east_shells(G,area)
    elif unit=='unit-link-north-west':north_west_shells(G,area)
    elif unit=='unit-link-north-east':north_east_shells(G,area)
    else:S.build_shells(area)
    owners=sorted([(p['id'],face['face'],p) for face in area['faces'] for p in face['parcels']],key=lambda row:len(row[0]),reverse=True)
    for ob in bpy.context.scene.objects:
        assert ob.type=='MESH'
        owner=next((row for row in owners if ob.name.startswith(row[0]+'-')),None)
        assert owner,('unowned link geometry',ob.name)
        name,face,p=owner
        for v in ob.data.vertices:
            along=v.co.x+origin['x'] if face in ['north','south'] else origin['y']-v.co.y
            assert p['interval'][0]-1e-5<=along<=p['interval'][1]+1e-5,(ob.name,'geometry crosses closed-span endpoint',along,p['interval'])
    S.export_budget_fixture(area)
    if fixture:
        print('PASS link fixture',unit,'all actual vertices remain within their owned closed spans; no phantom mouth closure')
    else:
        G.export(G.OUT/(unit+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
                 {'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})



def spawn_a_receiver(saved,unit):
    """Export only the two named Spawn A roof receivers, never a complete link."""
    import bpy
    receiver_ids={'unit-link-south-east':'lse-s','unit-link-south-west':'lsw-s-part-2'}
    if unit not in receiver_ids:
        raise ValueError('Only the two explicit Spawn A roof receiver parcels are authorized in this mode')
    area=validate(saved,unit);pid=receiver_ids[unit]
    face=next(f for f in area['faces'] if any(p['id']==pid for p in f['parcels']))
    p=next(p for p in face['parcels'] if p['id']==pid)
    x,y,X,Y=p['footprint'];origin=((x+X)/2,(y+Y)/2,p['floorElevationM'])
    G=S.geometry(saved);G.reset(origin)
    S.build_shells(area,parcel_ids={pid})
    objects=list(bpy.context.scene.objects)
    assert objects and all(o.type=='MESH' and o.name.startswith(pid+'-') for o in objects), 'receiver export includes another link parcel'
    maximum_out=.16 if p['envelopeDetail']['corniceProfile'] in {'single-drip','civic-stepped'} else 0
    corners=[G.local(G.coords(face['face'],face['wallPlaneM'],a,out,z)) for a in p['interval']
             for out in [-p['shellDepthM'],maximum_out] for z in [p['floorElevationM']-.02,p['wallTopM']]]
    low=[min(v[i] for v in corners) for i in range(3)];high=[max(v[i] for v in corners) for i in range(3)]
    bounds={'min':[low[0],low[2],-high[1]],'max':[high[0],high[2],-low[1]]}
    model='spawn-a-receiver-'+pid
    output=ROOT/'assets/source'/unit/(model+'.glb')
    span={'orientation':'horizontal' if face['face'] in ['north','south'] else 'vertical','coord':face['wallPlaneM'],'start':p['interval'][0],'end':p['interval'][1]}
    G.export(output,bounds,area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
             {'bz04InputSha256':saved['inputSha256'],'bz04ReceiverParcels':[pid],
              'bz04BoundaryCoverage':[span],'bz04DesignRevision':area['designRevision']['id'],
              'bz04ExportBudget':area['budget']})
    evidence={'modelId':model.replace('-','_'),'file':output.name,'source':'repo://assets/source/'+unit+'/build.py',
              'license':'Project-Original','position':dict(zip(('x','y','z'),origin)),'yawDeg':180,
              'inputSha256':saved['inputSha256'],'receiverParcelIds':[pid],
              'boundaryCoverage':[span],'futureDisposition':'Replace this exact dependency placement atomically when its full link section is installed; do not mark the full link built.'}
    (ROOT/'artifacts/bazaar-r7-whole-map'/unit/'spawn-a-receiver.json').write_text(json.dumps(evidence,indent=2)+'\n')


def main(unit='unit-link-west-mid'):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['build','self-test','input-fixture','spawn-a-receiver'],nargs='?',default='build')
    parser.add_argument('--handoff',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    saved=json.loads(args.handoff.read_text())
    if args.mode=='input-fixture':
        area=validate(saved,unit);S.export_budget_fixture(area)
        print('PASS link frozen input and protected interval fixture',unit)
    elif args.mode=='spawn-a-receiver':spawn_a_receiver(saved,unit)
    else:build(saved,unit,args.mode=='self-test')


if __name__=='__main__':main()
