"""Approved R7 Covered Souk: measured arcade, four trades and two supported spans.

The old Dyers canopy/carrier is retired by the whole-map integrator. This source
constructs its scheduled Souk replacement at the actual facade receiver planes.
"""
from pathlib import Path
import importlib.util
import json
import copy
import runpy
import sys

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
UNIT='unit-covered-souk'
spec=importlib.util.spec_from_file_location('bz04_textile',ROOT/'assets/source/unit-textile-arcade/build.py')
T=importlib.util.module_from_spec(spec);spec.loader.exec_module(T)
G=None


def validate(saved):
    if saved.get('unit')!=UNIT or T.S.digest(saved)!=saved.get('inputSha256'):
        raise ValueError('Covered Souk frozen handoff is corrupt or belongs to another unit')
    current=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if saved['inputSha256']!=current['inputSha256']:raise ValueError('Covered Souk scoped inputs changed; no output replaced')
    caps=saved['requiredCapabilities']
    assert set(caps['openingProfiles'])<={'rectangular','segmental'}
    assert not caps['openingCraftProfiles'] and not caps['glazingPatterns'] and not caps['featureKinds'] and not caps['landscapeKinds']
    assert set(caps['partKinds'])<=T.KINDS,('unsupported craft',set(caps['partKinds'])-T.KINDS)
    assert set(caps['craftRecipes'])<={'CF-BASKET','CF-CLOTH','CF-COUNTER','CF-ENVELOPE','CF-FLOOR','CF-FURNITURE','CF-JOINT','CF-OPEN','CF-ROLLED-CLOTH','CF-RUG','CF-SHADE','CF-TIMBER','CF-WEAVING'}
    area=saved['areas'][0];assert area['zone']=='COVERED_SOUK'
    assert {f['id'] for f in area['fixtures']}=={'CANOPY_SOUK_S','CANOPY_SOUK_N'}
    retired={d['id'] for d in saved['legacyDispositions'] if d['disposition']=='remove'}
    assert {'PLACE_DYERS_CANOPY_CANOPY_DYERS_01','PLACE_SUPPORT_CANOPY_DYERS_01_MOUNT_SUPPORT_CANOPY_DYERS_01'}<=retired
    return area


def setup(saved):
    global G,H,A
    H=saved;A=saved['areas'][0];T.setup(saved);G=T.G;G.OUT=OUT


def activity(group):
    face=group['receiverFace'];plane=next(f['wallPlaneM'] for f in A['faces'] if f['face']==face)
    op=next(o for o in G.PARCELS[group['receiverParcel']]['openings'] if o['id']==group['receiverOpening']);a=op['alongM'];deck=group['bbox']['min'][2]
    for item in group['instanceLayout']['parts']:
        one=dict(group,instanceLayout={'parts':[item]});one.pop('sign',None)
        kind=item['kind'];mid=item['materialId'];name=group['id']+'-'+item['id']
        lo=[item['localBox']['min'][0]+a,item['localBox']['min'][1],item['localBox']['min'][2]+deck]
        hi=[item['localBox']['max'][0]+a,item['localBox']['max'][1],item['localBox']['max'][2]+deck]
        if kind=='taut-woven-panel':
            working=lo[2]+(hi[2]-lo[2])*item['wovenFraction'];out=(lo[1]+hi[1])/2
            G.cloth_path(name,face,plane,lo[0],hi[0],[(out,working),(out,lo[2])],mid,border=.025,fringe=0)
            for i in range(item['warpCount']):
                x=lo[0]+.008+(hi[0]-lo[0]-.016)*i/(item['warpCount']-1)
                G.member(name+'-warp',G.coords(face,plane,x,out,working),G.coords(face,plane,x,out,hi[2]-.004),.008,'ph_bz04_hessian_230','receive')
            head=next(p for p in group['instanceLayout']['parts'] if p['id']=='head')['localBox']
            head_out=(head['min'][1]+head['max'][1])/2;head_z=deck+(head['min'][2]+head['max'][2])/2
            for x in (lo[0]+.03,hi[0]-.03):
                G.member(group['id']+'-attachment-weft-head',G.coords(face,plane,x,out,hi[2]-.004),G.coords(face,plane,x,head_out,head_z),.008,G.WOOD,'receive')
        elif kind=='hanging-cloth':
            out=(lo[1]+hi[1])/2;bow=min(.04,(hi[1]-lo[1]-.008)/3)
            G.cloth_path(name,face,plane,lo[0],hi[0],[(out,hi[2]),(out+bow,(lo[2]+hi[2])/2),(out,lo[2])],mid,border=.025,fringe=0)
            for x in (lo[0]+.03,hi[0]-.03):
                G.member(group['id']+'-attachment-'+item['id'],G.coords(face,plane,x,out,hi[2]-.005),G.coords(face,plane,x,-op['depthM'],hi[2]-.005),.01,G.WOOD,'receive')
        else:T.activity(one)
    T.S.activity(dict(group,instanceLayout={'parts':[]}))


def opening(face,plane,o,trim,back):
    if 'archRingM' in o and 'trimWidthM' not in o:o=dict(o,trimWidthM=o['archRingM'])
    if o['kind']=='shop':
        T.opening(face,plane,o,trim,back)
        if o['headShape']!='rectangular':T.S.close_arch_shoulders(face,plane,o,trim)
        cavity=o['shopfront']['cavity'];join=G.local(G.coords(face,plane,0,cavity['chamberFromOutM'],0))[0]
        ceiling=G.bpy.data.objects[o['id']+'-chamber-ceiling'];head=G.bpy.data.objects[o['id']+'-head']
        for vertex in ceiling.data.vertices:
            if face=='east' and vertex.co.x<join or face=='west' and vertex.co.x>join:vertex.co.x=join
        if o['headShape']!='rectangular':G.bpy.data.objects.remove(head,do_unlink=True)
        else:
            for vertex in head.data.vertices:
                if face=='east' and vertex.co.x>join or face=='west' and vertex.co.x<join:vertex.co.x=join
    else:T.S.opening(face,plane,o,trim,back)
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
    interfaces['install'](G,area,additional_units={UNIT:None,'unit-dyers-alley':None,
        'unit-dyers-dogleg':{'dd-e','dd-w'},'unit-north-court':{'nc-s'}})
    original_part=G.part
    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        if name in {'cs-s-part-2-end-closure','cs-n-part-2-end-closure'} and abs(lo[0]-42.4)<1e-5:return None
        if name=='cs-e-end-closure' and lo[0]>47.9:lo=(lo[0],lo[1],max(lo[2],7.2))
        return original_part(face,plane,name,lo,hi,mid,shadow,bevel)
    G.part=part
    T.S.build_shells(area,opening)
    G.part=original_part
    rear_entry()
    # Dogleg supplies the lower adjoining envelope; retain only the exposed
    # 7.2..8 m north step on this rear closure.
    import bmesh
    for ob in G.bpy.context.scene.objects:
        if ob.name!='cs-e-back' and not ob.name.startswith('cs-e-back.'):continue
        bm=bmesh.new();bm.from_mesh(ob.data)
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=(0,0,7.2),plane_no=(0,0,1))
        faces=[f for f in bm.faces if all(abs(G.ORIGIN[1]-v.co.y-48)<1e-5 and v.co.z<=7.2+1e-5 for v in f.verts)]
        if faces:bmesh.ops.delete(bm,geom=faces,context='FACES_ONLY')
        bm.to_mesh(ob.data);bm.free()


def rear_entry():
    parcel=G.PARCELS['cs-e'];door=next(b for b in H['buildings'] if b['id']==parcel['buildingId'])['rearServiceDoors'][0]
    # Replace the hidden rear skin around its real staff leaf; no false solid back.
    back=G.bpy.data.objects.get('cs-e-back');assert back,'missing east rear receiver'
    G.bpy.data.objects.remove(back,do_unlink=True)
    l,r=parcel['interval'];a=door['worldCenter'][1];half=door['widthM']/2+.1;top=parcel['wallTopM'];dep=parcel['shellDepthM'];mid=parcel['materialId']
    for L,R,z,Z in ((l,a-half,0,top),(a+half,r,0,top),(a-half,a+half,door['heightM']+.1,top)):
        G.part('east',53,'cs-e-back',(L,-dep,z),(R,-dep+.02,Z),mid)
    opening('west',door['worldCenter'][0],{'id':door['id'],'kind':'door','headShape':'rectangular','alongM':a,'sillM':0,'headM':door['heightM'],
        'heightM':door['heightM'],'widthM':door['widthM'],'depthM':.18,'closure':door['closure'],'closureMaterialId':G.WOOD,
        'finishLeafCount':2,'finishFamily':'workshop','frontProjectionM':0,'surroundMaterialId':mid,'revealMaterialId':mid},parcel['trimMaterialId'],mid)


def build(saved,fixture=False):
    area=copy.deepcopy(validate(saved));setup(saved)
    for face in area['faces']:
        for parcel in face['parcels']:
            for o in parcel['openings']:
                if 'archRingM' in o and 'trimWidthM' not in o:o['trimWidthM']=o['archRingM']
    shells(area)
    for group in area['activityGroups']:activity(group)
    for f in area['fixtures']:T.canopy(f)
    stats=T.S.validate_objects(area)
    if fixture:
        for ob in list(G.bpy.context.scene.objects):G.prepare_mesh(ob)
        T.S.validate_objects(area)
        warp=[ob for ob in G.bpy.context.scene.objects if '-weft-panel-warp' in ob.name]
        assert len(warp)==12,('exposed weaving warp count',len(warp))
        origin=area['sectionOriginDesign']
        for f in area['fixtures']:
            objects=[o for o in G.bpy.context.scene.objects if o.name.startswith(f['id']+'-')]
            assert len([o for o in objects if 'endpoint-ledger' in o.name and '-eye-' not in o.name])==2
            assert len([o for o in objects if '-eye-' in o.name])==4
            assert any('-bound-hem' in o.name for o in objects)
            for ob in objects:
                for v in ob.data.vertices:
                    p=(v.co.x+origin['x'],origin['y']-v.co.y,v.co.z+origin['z'])
                    assert all(f['bbox']['min'][i]-.001<=p[i]<=f['bbox']['max'][i]+.001 for i in range(3)),(f['id'],ob.name,p)
                    assert p[2]>=4.2,('overhead below protected clearance',ob.name,p)
        from mathutils import Vector
        assert len([p for f in area['faces'] for p in f['parcels']])==7
        assert len([o for f in area['faces'] for p in f['parcels'] for o in p['openings']])==12
        for group in area['activityGroups']:
            face=next(f for f in area['faces'] if f['face']==group['receiverFace'])
            o=next(o for p in face['parcels'] for o in p['openings'] if o['id']==group['receiverOpening'])
            world=G.coords(face['face'],face['wallPlaneM'],o['alongM'],-1,o['headM']-.2);start=Vector(G.local(world));hits=[]
            for ob in G.bpy.context.scene.objects:
                if not ob.name.startswith(o['id']+'-'):continue
                hit,point,normal,index=ob.ray_cast(start,Vector((0,0,1)),distance=.4)
                if hit:hits.append((point.z,ob.name))
            assert sorted(hits)[0][1]==o['id']+'-chamber-ceiling' and sum(abs(z-o['headM'])<1e-5 for z,name in hits)==1,'Overlapping showroom ceiling'
            if o['headShape']!='rectangular':assert len([ob for ob in G.bpy.context.scene.objects if ob.name.startswith(o['id']+'-spring-closure')])==2
        assert G.bpy.data.objects.get('cs-e-REAR-STAFF-DOOR-leaf-panel') is not None
        print('PASS Souk opening fixtures: four single chamber ceilings, supported spring wedges, fixed rear staff entry',flush=True)
        print('PASS Covered Souk fixtures: 29 scheduled parts, 12 exposed warps, two supported bounded spans above 4.2 m',stats,flush=True)
    else:
        G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
            {'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})


if __name__=='__main__':
    try:
        if '--handoff' not in sys.argv:raise ValueError('Requires --handoff <frozen handoff.json>')
        saved=json.loads(Path(sys.argv[sys.argv.index('--handoff')+1]).read_text());validate(saved)
        if 'check-inputs' in sys.argv:print('PASS Covered Souk frozen input, capabilities and carrier retirement schedule')
        else:build(saved,'self-test' in sys.argv)
    except Exception:
        import traceback
        traceback.print_exc();sys.exit(1)
