"""The coordinated R7 Tea receiver sections, graded contacts and serving craft.

Each wrapper exports only its own frozen unit. Traversal surfaces, floor geometry
and collision remain runtime-owned. All input elevations are absolute metres.
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
spec=importlib.util.spec_from_file_location('bz04_spawn_a',ROOT/'assets/source/unit-spawn-a-courtyard/build.py')
S=importlib.util.module_from_spec(spec);spec.loader.exec_module(S)
UNITS={'unit-tea-ramp','unit-tea-terrace','unit-tea-stairs','unit-tea-landing'}
KINDS={'arabian-coffee-pot','fitted-cloth-cushion','folded-cloth','framed-timber-end',
       'grounded-counter-carcass','lidded-tea-canister','open-ceramic-cup','plank-board','plank-shelf','timber-member'}
G=None


def floor_at(area,y):
    floor=area['floor']
    if floor['kind']=='flat':return floor['elevationM']
    assert floor['axis']=='y'
    t=max(0,min(1,(y-floor['rect']['y'])/floor['rect']['h']))
    return floor['startElevationM']+(floor['endElevationM']-floor['startElevationM'])*t


def validate(saved,unit):
    if unit not in UNITS or saved.get('unit')!=unit or len(saved.get('areas',[]))!=1:
        raise ValueError('Expected exact coordinated Tea unit handoff')
    if S.digest(saved)!=saved.get('inputSha256'):raise ValueError('Frozen handoff contents do not match inputSha256')
    current=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](unit)
    if current['inputSha256']!=saved['inputSha256']:raise ValueError('Area inputs changed since handoff extraction')
    area=saved['areas'][0];caps=saved['requiredCapabilities']
    assert area['designRevision']['id'].startswith('R7')
    assert set(caps['openingProfiles'])<={'rectangular','segmental'}
    assert set(caps['partKinds'])<=KINDS
    assert not any(caps[k] for k in ['openingCraftProfiles','glazingPatterns','featureKinds','landscapeKinds'])
    assert all(f['kind']=='awning' for f in area['fixtures'])
    expected={'unit-tea-ramp':.7,'unit-tea-terrace':1.4,'unit-tea-stairs':.7,'unit-tea-landing':0}[unit]
    assert area['sectionOriginDesign']['z']==expected
    assert abs(floor_at(area,area['rect']['y']+area['rect']['h']/2)-expected)<1e-9
    return area


def opening(face,plane,o,trim,back):
    S.opening(face,plane,o,trim,back)
    if o['kind']=='shop':
        # The shared legacy chamber uses a zero-grade deck. This elevated area
        # replaces that one part at its authored sill without shifting openings.
        import bpy
        deck=bpy.data.objects.get(o['id']+'-deck')
        assert deck is not None
        bpy.data.objects.remove(deck,do_unlink=True)
        G.part(face,plane,o['id']+'-deck',(o['alongM']-o['widthM']/2,-o['depthM'],o['sillM']),
               (o['alongM']+o['widthM']/2,.20,o['sillM']+.04),o.get('monolithicTrimMaterialId',trim))


def shells(area):
    import bpy
    source=copy.deepcopy(area)
    is_grade=area['floor']['kind']=='ramp'
    if is_grade:
        for face in source['faces']:
            for p in face['parcels']:
                for r in p['materialRegions']:
                    if 'zAboveFloorM' in r:r['zM']=list(r['zAboveFloorM'])
                    if 'floorRelativeMinM' in r:r['zM'][0]=r['floorRelativeMinM']
    cuts=[]
    if area['floor'].get('visual_style')=='stairs':
        f=area['floor'];cuts=[f['rect']['y']+f['rect']['h']*i/f['step_count'] for i in range(1,f['step_count'])]
    original_part=G.part
    if area['zone']=='TEA_RAMP':
        interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
        interfaces['install'](G,source,additional_units={'unit-tea-ramp':None,'unit-textile-arcade':None,
            'unit-fountain-court':None,'unit-caravan-court':None,'unit-service-north':None,'unit-tea-terrace':{'tt-e'}})
        shared_part=G.part
        def ramp_part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
            # tr-w is contained by the different-owner Service North spine.
            # cc-n owns the south face below 4.5 m; the Ramp owns the exposed
            # south closure above it. Its north end and rear are internal.
            if name=='tr-w-back':return None
            if name=='tr-w-end-closure':
                if lo[0]>48.001:return None
                lo=(lo[0],lo[1],max(lo[2],4.5))
            return shared_part(face,plane,name,lo,hi,mid,shadow,bevel)
        G.part=ramp_part
    elif area['zone']=='TEA_TERRACE':
        interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
        rug=runpy.run_path(str(ROOT/'assets/source/unit-rug-gate/build-receivers.py'))
        additional=dict(rug['ADDITIONAL_UNITS'],**{'unit-tea-terrace':None,'unit-tea-ramp':None,
            'unit-service-north':None,'unit-textile-arcade':None,'unit-caravan-court':None,
            'unit-tea-stairs':{'ts-e','ts-w'},'unit-tea-landing':{'tl-w'}})
        interfaces['install'](G,source,additional_units=additional)
        shared_part=G.part;_,low,high=rug['shop_cavity']()
        def terrace_part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
            if name in {'tt-w-back','tt-w-end-closure'}:
                # The enclosing SN spine owns the lower internal volume.
                # Terrace closures above its 7 m top remain exposed and closed.
                lower=5.89965 if name=='tt-w-end-closure' and abs(lo[0]-56)<1e-5 else 7
                lo=(lo[0],lo[1],max(lo[2],lower))
            if name=='tt-rug-return-base-closure':
                result=None
                for start,end in interfaces['difference'](lo,hi,(low[1],plane-high[0],lo[2]),(high[1],plane-low[0],hi[2])):
                    result=shared_part(face,plane,name,start,end,mid,shadow,bevel)
                return result
            return shared_part(face,plane,name,lo,hi,mid,shadow,bevel)
        G.part=terrace_part
    elif area['zone'] in {'TEA_STAIRS','TEA_LANDING'}:
        interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
        rug=runpy.run_path(str(ROOT/'assets/source/unit-rug-gate/build-receivers.py'))
        additional=dict(rug['ADDITIONAL_UNITS'],**{'unit-tea-stairs':None,'unit-tea-terrace':None,
            'unit-tea-ramp':None,'unit-service-north':None,'unit-textile-arcade':None,
            'unit-tea-landing':None if area['zone']=='TEA_LANDING' else {'tl-w'}})
        interfaces['install'](G,source,additional_units=additional)
        from integrate_bz04 import load_handoff
        spine=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map/unit-service-north/handoff.json')['areas'][0]
        link=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map/unit-link-north-west/handoff.json')['areas'][0]
        link_face,link_wall=next((f,p) for f in link['faces'] for p in f['parcels'] if p['id']=='lnw-s')
        shared_part=G.part;_,low,high=rug['shop_cavity']()
        def stairs_part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
            if name in {'tl-n-back','tl-n-end-closure'}:return None
            remaining=[(lo,hi)]
            if name=='tl-w-end-closure' and abs(hi[0]-link_face['wallPlaneM'])<1e-8:
                a,b=interfaces['local_bounds'](face,plane,link_wall)
                remaining=interfaces['difference'](lo,hi,a,b)
            if name=='ts-e-base-closure':
                remaining=interfaces['difference'](lo,hi,(low[1],plane-high[0],lo[2]),(high[1],plane-low[0],hi[2]))
            elif name in {'ts-w-back','ts-w-end-closure','tl-w-back','tl-w-end-closure'}:
                for f in spine['faces']:
                    for parcel in f['parcels']:
                        if parcel['id'] not in {'sn-es','sn-et','sn-en'}:continue
                        a,b=interfaces['local_bounds'](face,plane,parcel)
                        remaining=[piece for start,end in remaining for piece in interfaces['difference'](start,end,a,b)]
            result=None
            for start,end in remaining:result=shared_part(face,plane,name,start,end,mid,shadow,bevel)
            return result
        G.part=stairs_part
    if cuts:
        boundary={p['id']:p for f in source['faces'] for p in f['parcels'] if p['structuralGrid'].get('assembly')=='BC-01'}
        cut_part=G.part
        def stair_contact_part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
            parcel=boundary.get(name.removesuffix('-pier-reveal')) if name.endswith('-pier-reveal') else None
            if parcel:
                edge=(lo[0]+hi[0])/2;l,r=parcel['interval'];grid=parcel['structuralGrid']
                real_edges=[l,r]+[max(l,min(r,a+offset)) for a in grid['bayEdgesM'] for offset in (-grid['pierWidthM']/2,grid['pierWidthM']/2)]
                # A tread cut subdivides grade-contact fields, not masonry.
                # Only a real pier boundary warrants a vertical reveal.
                if any(abs(edge-cut)<1e-6 for cut in cuts) and not any(abs(edge-real)<1e-6 for real in real_edges):return None
            return cut_part(face,plane,name,lo,hi,mid,shadow,bevel)
        G.part=stair_contact_part
    S.build_shells(source,opening,cuts)
    G.part=original_part

    if not is_grade:return
    for face in source['faces']:
        for p in face['parcels']:
            for ob in [o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(p['id']+'-')]:
                # Upper datums and apertures stay fixed. Only contact/base rows
                # follow the exact analytic grade, with tread-bound wear rows.
                midpoint=G.ORIGIN[1]-(min(v.co.y for v in ob.data.vertices)+max(v.co.y for v in ob.data.vertices))/2
                # The 2 mm base-band reveal straddles the nominal base height;
                # move both skins together so its upper edge cannot remain buried.
                reveal_mid=(min(v.co.z for v in ob.data.vertices)+max(v.co.z for v in ob.data.vertices))/2+G.ORIGIN[2]
                grade_reveal='-band-reveal' in ob.name and abs(reveal_mid-p['baseHeightM'])<1e-6
                for v in ob.data.vertices:
                    absolute=v.co.z+G.ORIGIN[2]
                    y=G.ORIGIN[1]-v.co.y
                    if absolute<=p['baseHeightM']+1e-6 or grade_reveal:
                        offset=floor_at(area,y)
                        if cuts and abs(absolute-.12)<1e-6 or cuts and abs(absolute-.18)<1e-6:
                            f=area['floor'];step=f['rect']['h']/f['step_count']
                            index=min(f['step_count']-1,max(0,int((midpoint-f['rect']['y'])/step)))
                            offset=max(floor_at(area,f['rect']['y']+index*step),floor_at(area,f['rect']['y']+(index+1)*step))
                        v.co.z+=offset
                ob.data.update()
                # UVs follow actual metres after raking, not the precursor rectangle.
                G.world_uv(ob,float(ob.data.materials[0].get('tileSizeM',2)))


def turned(name,face,plane,lo,hi,mid,profile,color=None):
    cx,cy=(lo[0]+hi[0])/2,(lo[1]+hi[1])/2;rx,ry=(hi[0]-lo[0])/2,(hi[1]-lo[1])/2
    verts=[G.coords(face,plane,cx+rx*r*math.cos(i*math.tau/32),cy+ry*r*math.sin(i*math.tau/32),lo[2]+(hi[2]-lo[2])*z) for r,z in profile for i in range(32)]
    faces=[(j*32+i,j*32+(i+1)%32,(j+1)*32+(i+1)%32,(j+1)*32+i) for j in range(len(profile)-1) for i in range(32)]
    ob=G.mesh(name,verts,faces,mid,'receive',True)
    if color:
        G.mat(mid).node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(1,1,1,1)
        G.paint_object(ob,color)
    return ob


def tube(name,face,plane,path,radii,mid):
    from mathutils import Vector
    verts=[];faces=[]
    for index,(point,radius) in enumerate(zip(path,radii)):
        tangent=Vector(path[min(index+1,len(path)-1)])-Vector(path[max(0,index-1)])
        tangent.normalize();u=Vector((0,1,0));v=tangent.cross(u).normalized()
        for i in range(8):
            p=Vector(point)+radius*(u*math.cos(i*math.tau/8)+v*math.sin(i*math.tau/8))
            verts.append(G.coords(face,plane,*p))
    for j in range(len(path)-1):
        for i in range(8):faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
    faces.extend([tuple(reversed(range(8))),tuple(range((len(path)-1)*8,len(path)*8))])
    G.mesh(name,verts,faces,mid,'receive',True)


def coffeepot(name,face,plane,lo,hi,mid):
    width,height=hi[0]-lo[0],hi[2]-lo[2];cy=(lo[1]+hi[1])/2
    bodylo=[lo[0]+width*.18,lo[1]+.005,lo[2]];bodyhi=[hi[0]-width*.25,hi[1]-.005,hi[2]]
    profile=[(0,0),(.62,0),(.87,.10),(1,.37),(.88,.56),(.45,.73),(.37,.81),(.57,.84),(.57,.87),(.18,.93),(.11,1),(0,1)]
    turned(name+'-body-lid',face,plane,bodylo,bodyhi,mid,profile)
    control=[(lo[0]+width*.69,cy,lo[2]+height*.42),(lo[0]+width*.87,cy,lo[2]+height*.49),
             (lo[0]+width*.81,cy,lo[2]+height*.75),(hi[0]-width*.025,cy,lo[2]+height*.82)]
    path=[]
    for i in range(13):
        t=i/12;path.append(tuple((1-t)**3*control[0][k]+3*(1-t)**2*t*control[1][k]+3*(1-t)*t*t*control[2][k]+t**3*control[3][k] for k in range(3)))
    tube(name+'-curved-spout',face,plane,path,[width*(.05-.03*i/12) for i in range(13)],mid)
    path=[(lo[0]+width*.23+width*.18*math.cos(math.pi/2+i*math.pi/12),cy,lo[2]+height*(.46+.24*math.sin(math.pi/2+i*math.pi/12))) for i in range(13)]
    tube(name+'-joined-handle',face,plane,path,[width*.025]*len(path),mid)


def activity(group):
    face=group['receiverFace'];plane=next(f['wallPlaneM'] for f in G.A['faces'] if f['face']==face)
    op=next(o for o in G.PARCELS[group['receiverParcel']]['openings'] if o['id']==group['receiverOpening'])
    deck=group['bbox']['min'][2]
    for item in group['instanceLayout']['parts']:
        name=group['id']+'-'+item['id'];kind=item['kind'];mid=item['materialId']
        lo=[op['alongM']+item['localBox']['min'][0],item['localBox']['min'][1],deck+item['localBox']['min'][2]]
        hi=[op['alongM']+item['localBox']['max'][0],item['localBox']['max'][1],deck+item['localBox']['max'][2]]
        one=dict(group,instanceLayout={'parts':[item]});one.pop('sign',None)
        if kind=='grounded-counter-carcass':G.activity(one)
        elif kind in {'fitted-cloth-cushion','folded-cloth','framed-timber-end','plank-board','timber-member'}:
            import bpy
            before=set(bpy.context.scene.objects);S.activity(one)
            if item.get('stockColorSrgb'):
                for ob in set(bpy.context.scene.objects)-before:G.paint_object(ob,item['stockColorSrgb'],True)
        elif kind=='arabian-coffee-pot':coffeepot(name,face,plane,lo,hi,mid)
        elif kind=='open-ceramic-cup':
            rim=.015/((hi[0]-lo[0])/2)
            turned(name,face,plane,lo,hi,mid,[(0,0),(.72,0),(.78,.10),(1,.94),(1,1),(1-rim,1),(.68-rim,.15),(0,.15)],item['stockColorSrgb'])
        elif kind=='lidded-tea-canister':
            turned(name,face,plane,lo,hi,mid,[(0,0),(.9,0),(1,.04),(1,.84),(.93,.88),(1,.91),(1,.97),(.88,1),(0,1)],item['stockColorSrgb'])
        elif kind=='plank-shelf':
            G.part(face,plane,name+'-board',(lo[0],lo[1],hi[2]-.04),hi,mid,'receive',.003)
            for x in [lo[0]+.12,hi[0]-.12]:
                G.member(name+'-wall-bracket',G.coords(face,plane,x,lo[1]+.01,lo[2]+.015),G.coords(face,plane,x,hi[1]-.015,hi[2]-.055),.025,G.IRON,'receive')
                G.part(face,plane,name+'-wall-plate',(x-.025,lo[1],lo[2]),(x+.025,lo[1]+.02,hi[2]-.04),G.IRON,'receive')
        else:raise ValueError(('unsupported Tea part',kind))
    S.activity(dict(group,instanceLayout={'parts':[]}))


def terrace_fixture(area):
    from mathutils import Vector
    for ob in G.bpy.context.scene.objects:G.prepare_mesh(ob)
    assert len(area['activityGroups'])==2 and sum(len(g['instanceLayout']['parts']) for g in area['activityGroups'])==26
    assert not G.bpy.data.objects.get('TT-RECESSED-SEAT-sill')
    counter=[ob for ob in G.bpy.context.scene.objects if ob.name.startswith('G_tt-shop-counter')]
    assert abs(min(v.co.z+G.ORIGIN[2] for ob in counter for v in ob.data.vertices)-1.44)<1e-5
    for index in (1,2,3):
        for suffix in ('body-lid','curved-spout','joined-handle'):
            assert G.bpy.data.objects.get('G_tt-shop-tea-pot-'+str(index)+'-'+suffix) is not None
    group=area['activityGroups'][0]
    for item in group['instanceLayout']['parts']:
        if item['kind'] not in {'open-ceramic-cup','lidded-tea-canister'}:continue
        ob=G.bpy.data.objects[group['id']+'-'+item['id']];lo=item['localBox']['min'];hi=item['localBox']['max']
        start=Vector(G.local(G.coords('east',19,58.01+(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,group['bbox']['min'][2]+hi[2]+.05)))
        hit,point,normal,index=ob.ray_cast(start,Vector((0,0,-1)),distance=1)
        expected=group['bbox']['min'][2]+(lo[2]+.15*(hi[2]-lo[2]) if item['kind']=='open-ceramic-cup' else hi[2])
        assert hit and abs(point.z+G.ORIGIN[2]-expected)<1e-5,('Cup hollow or canister lid missing',item['id'])
    for shelf in (1,2):
        assert len([o for o in G.bpy.context.scene.objects if o.name.startswith('G_tt-shop-tea-shelf-'+str(shelf)+'-wall-bracket')])==2
    cushion=[o for o in G.bpy.context.scene.objects if o.name.startswith('G_TT_RECESSED_SEAT-fitted-cushion')]
    assert cushion and abs(min(v.co.z+G.ORIGIN[2] for o in cushion for v in o.data.vertices)-1.9)<1e-5
    start=Vector(G.local((20,58.01,3.8)));hits=[]
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith('tt-shop-'):continue
        hit,point,normal,index=ob.ray_cast(start,Vector((0,0,1)),distance=.5)
        if hit:hits.append((point.z+G.ORIGIN[2],ob.name))
    assert sorted(hits)[0][1]=='tt-shop-chamber-ceiling' and sum(abs(z-4.1)<1e-5 for z,name in hits)==1,'Overlapping serving-bay ceiling'
    for fixture in area['fixtures']:
        cloth=next(o for o in G.bpy.context.scene.objects if o.name.startswith(fixture['id']+'-cloth'))
        assert cloth.data.color_attributes.get('COLOR_0') is not None
        for ob in G.bpy.context.scene.objects:
            if not ob.name.startswith(fixture['id']+'-'):continue
            for v in ob.data.vertices:
                world=(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]);box=fixture['clothBbox'] if '-cloth' in ob.name else fixture['bbox']
                assert all(box['min'][i]-.001<=world[i]<=box['max'][i]+.001 for i in range(3)),('Shade bounds',ob.name,world)
    print('PASS Terrace fixtures: 26 bounded parts, grounded counter/seat, 3 complete pots, 6 hollow cups, 6 lids, supported shelves, two shades and single 4.1 m chamber ceiling',flush=True)


def build(saved,unit,fixture=False):
    global G
    area=validate(saved,unit);G=S.geometry(saved);G.OUT=ROOT/'assets/source'/unit
    origin=area['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ('x','y','z')))
    point=(origin['x']+2.3,origin['y']+1.7,origin['z']+3.1)
    assert all(abs(a-b)<1e-8 for a,b in zip(G.local(point),(2.3,-1.7,3.1))), 'absolute section elevation was subtracted more than once'
    shells(area)
    if unit=='unit-tea-terrace':
        sill=G.bpy.data.objects.get('TT-RECESSED-SEAT-sill')
        assert sill is not None and G.bpy.data.objects.get('TT-RECESSED-SEAT-deck') is not None
        G.bpy.data.objects.remove(sill,do_unlink=True)
        shop=next(o for f in area['faces'] for p in f['parcels'] for o in p['openings'] if o['id']=='tt-shop')
        join=19-shop['shopfront']['cavity']['chamberFromOutM']-origin['x']
        head=G.bpy.data.objects['tt-shop-head'];ceiling=G.bpy.data.objects['tt-shop-chamber-ceiling']
        for vertex in head.data.vertices:
            if vertex.co.x>join:vertex.co.x=join
        for vertex in ceiling.data.vertices:
            if vertex.co.x<join:vertex.co.x=join
    for group in area['activityGroups']:activity(group)
    for f in area['fixtures']:G.awning(f)
    if fixture:
        import bpy
        assert all(o.type=='MESH' for o in bpy.context.scene.objects)
        if area['zone']=='TEA_TERRACE':
            deck=bpy.data.objects['tt-shop-deck']
            assert abs(min(v.co.z for v in deck.data.vertices))<1e-7
            assert abs(max(v.co.z for v in deck.data.vertices)-.04)<1e-7
            terrace_fixture(area)

        if area['floor']['kind']=='ramp':
            for ob in bpy.context.scene.objects:
                for v in ob.data.vertices:
                    y=origin['y']-v.co.y
                    assert v.co.z+origin['z']>=floor_at(area,y)-.02001,('Graded wall sinks below its floor',ob.name,y,v.co.z+origin['z'])
            for y in [area['rect']['y'],area['rect']['y']+area['rect']['h']]:
                candidates=[v.co.z+origin['z'] for o in bpy.context.scene.objects if o.name.startswith(('tr-e-field','ts-e-field')) for v in o.data.vertices if abs(origin['y']-v.co.y-y)<1e-5]
                assert candidates and abs(min(candidates)-floor_at(area,y))<1e-6,(y,min(candidates),floor_at(area,y))
        if area['zone']=='TEA_RAMP':
            assert len([p for f in area['faces'] for p in f['parcels']])==3 and not area['activityGroups'] and not area['fixtures']
            for ob in bpy.context.scene.objects:G.prepare_mesh(ob)
            for p in (p for f in area['faces'] for p in f['parcels']):
                for o in p['openings']:
                    panels=[ob for ob in bpy.context.scene.objects if ob.name.startswith(o['id']+'-leaf-panel')]
                    assert len(panels)==2 and all(ob.data.materials[0]==G.mat(G.WOOD) for ob in panels)
                    frames=[ob for ob in bpy.context.scene.objects if ob.name.startswith(o['id']+'-frame-')]
                    assert abs(min(v.co.z+origin['z'] for ob in frames for v in ob.data.vertices)-o['sillM'])<1e-5
                    assert abs(max(v.co.z+origin['z'] for ob in frames for v in ob.data.vertices)-o['headM'])<1e-5
            south=bpy.data.objects['tr-w-end-closure']
            assert abs(min(v.co.z+origin['z'] for v in south.data.vertices)-4.5)<1e-5
            assert not bpy.data.objects.get('tr-w-end-closure.001') and not bpy.data.objects.get('tr-w-back')
            for name in ('tr-e','tr-w'):
                for y in (48,56):
                    low=min(v.co.z+origin['z'] for ob in bpy.context.scene.objects if ob.name.startswith(name+'-field') for v in ob.data.vertices if abs(origin['y']-v.co.y-y)<1e-5)
                    assert abs(low-floor_at(area,y))<1e-5,(name,y,low)
            print('PASS Ramp: three paired shutters retain absolute datums; both walls meet 0..1.4 m grade; south closure starts at4.5 m; internal west skins absent',flush=True)
        if area['zone']=='TEA_STAIRS':
            assert area['floor']['step_count']==10 and not area['activityGroups'] and not area['fixtures']
            for ob in bpy.context.scene.objects:G.prepare_mesh(ob)
            for name in ('ts-e','ts-w'):
                for y in (66,72):
                    low=min(v.co.z+origin['z'] for ob in bpy.context.scene.objects if ob.name.startswith(name+'-field') for v in ob.data.vertices if abs(origin['y']-v.co.y-y)<1e-5)
                    assert abs(low-floor_at(area,y))<1e-5,(name,y,low)
            openings=[o for f in area['faces'] for p in f['parcels'] for o in p['openings']]
            assert len(openings)==2
            for o in openings:
                assert any(ob.name.startswith(o['id']+'-louver') for ob in bpy.context.scene.objects)
                frame=[ob for ob in bpy.context.scene.objects if ob.name.startswith(o['id']+'-frame-')]
                assert abs(min(v.co.z+origin['z'] for ob in frame for v in ob.data.vertices)-o['sillM'])<1e-5
                assert abs(max(v.co.z+origin['z'] for ob in frame for v in ob.data.vertices)-o['headM'])<1e-5
            assert len([ob for ob in bpy.context.scene.objects if ob.name.startswith('ts-w-pier-reveal')])==2
            print('PASS Stairs: ten tread intervals, both 1.4..0 m grade contacts, two fixed-datum louvers and only real end-pier reveals',flush=True)
        if area['zone']=='TEA_LANDING':
            parcels=[(f,p) for f in area['faces'] for p in f['parcels']]
            assert len(parcels)==2 and not area['activityGroups'] and not area['fixtures']
            for face,p in parcels:
                assert not p['openings'] and p['structuralGrid']['assembly']=='BC-01'
                objects=[ob for ob in bpy.context.scene.objects if ob.name.startswith(p['id']+'-')]
                for ob in objects:
                    G.prepare_mesh(ob)
                    for v in ob.data.vertices:
                        along=v.co.x+origin['x'] if face['face']=='north' else origin['y']-v.co.y
                        assert p['interval'][0]-.002<=along<=p['interval'][1]+.002,('Landing mouth intrusion',ob.name,along)
                assert any('-pier-reveal' in ob.name for ob in objects)
            assert not bpy.data.objects.get('tl-n-back') and not bpy.data.objects.get('tl-n-end-closure')
            print('PASS Landing: exactly two BC-01 returns, bounded solid intervals, no openings or dressing, internal north skins omitted',flush=True)
        S.validate_objects(area)
        print('PASS Tea geometry fixture',unit,'absolute asymmetric frame, graded foot or1.4m deck, explicit bounded part assemblies')
    else:
        S.validate_objects(area)
        # Preserve Landing's accepted embedded PBR regardless of whether
        # Blender assigns a numeric suffix to a pack-material name.
        if unit=='unit-tea-landing':G._strip_pack_images=lambda:None
        G.export(G.OUT/(unit+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
                 {'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})


def main(unit='unit-tea-terrace'):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['build','self-test','input-fixture'],nargs='?',default='build')
    parser.add_argument('--handoff',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    saved=json.loads(args.handoff.read_text())
    if args.mode=='input-fixture':
        validate(saved,unit);print('PASS Tea frozen issue and origin fixture',unit)
    else:build(saved,unit,args.mode=='self-test')


if __name__=='__main__':main()
