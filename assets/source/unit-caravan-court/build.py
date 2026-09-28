"""Build the complete R7 Caravan Court shells and named packing workfront.

No palm or loose yard props are generated. Retained cover, coordinated roof
bundles, floor binding and legacy retirements are integrated by the whole-map owner.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import math
import runpy
import sys

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
UNIT='unit-caravan-court'
PART_KINDS={'framed-timber-trestle','lidded-wood-box','plank-worktop','slatted-wood-box','tied-cloth-parcel','timber-apron'}


def validate_handoff(saved,current=None):
    encoded={k:v for k,v in saved.items() if k not in {'source','designSha256','reading','inputSha256'}}
    digest=hashlib.sha256(json.dumps(encoded,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    current=current or runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if saved.get('unit')!=UNIT or digest!=saved.get('inputSha256') or digest!=current['inputSha256']:
        raise ValueError('Caravan Court handoff changed or is corrupt; no output replaced')
    supported={'openingProfiles':{'rectangular','segmental'},'openingCraftProfiles':{'planked-receiving'},
        'glazingPatterns':set(),'featureKinds':set(),'landscapeKinds':set(),'partKinds':PART_KINDS,
        'craftRecipes':{'CF-ENVELOPE','CF-FLOOR','CF-FURNITURE','CF-JOINT','CF-OPEN','CF-R4-PORTAL','CF-ROLLED-CLOTH','CF-TIMBER'}}
    for key,allowed in supported.items():
        if set(saved['requiredCapabilities'][key])-allowed:raise ValueError(('unsupported capability',key,saved['requiredCapabilities'][key]))
    area=saved['areas'][0]
    assert area['zone']=='CARAVAN_COURT' and not area['fixtures'] and not area.get('landscapeElements')
    return area


def geometry(saved):
    global S,G,A
    A=saved['areas'][0]
    spec=importlib.util.spec_from_file_location('bz04_flat_envelope',ROOT/'assets/source/unit-spawn-a-courtyard/build.py')
    S=importlib.util.module_from_spec(spec);spec.loader.exec_module(S);G=S.geometry(saved);G.OUT=OUT
    return G


def activity(g):
    face=g['receiverFace'];plane=next(f['wallPlaneM'] for f in A['faces'] if f['face']==face)
    op=next(o for o in G.PARCELS[g['receiverParcel']]['openings'] if o['id']==g['receiverOpening']);a=op['alongM'];deck=g['bbox']['min'][2]
    for item in g['instanceLayout']['parts']:
        lo=[item['localBox']['min'][0]+a,item['localBox']['min'][1],item['localBox']['min'][2]+deck]
        hi=[item['localBox']['max'][0]+a,item['localBox']['max'][1],item['localBox']['max'][2]+deck]
        x,y,z=lo;X,Y,Z=hi;w=X-x;d=Y-y;h=Z-z;name=g['id']+'-'+item['id'];mid=item['materialId'];kind=item['kind']
        def box(s,l,r,m=mid):return G.part(face,plane,name+s,l,r,m,'receive',.003)
        if kind=='framed-timber-trestle':
            center=(x+X)/2
            for out in (y,Y-.05):box('-grounded-leg',(center-.025,out,z),(center+.025,out+.05,Z-.04))
            box('-bearing-head',(x,y,Z-.04),hi)
            box('-stretcher',(center-.02,y+.05,z+h*.35),(center+.02,Y-.05,z+h*.35+.04))
        elif kind=='plank-worktop':
            boards=math.ceil(d/.18)
            for i in range(boards):box('-board',(x,y+i*d/boards+.001,z),(X,y+(i+1)*d/boards-.001,Z))
        elif kind=='timber-apron':box('',lo,hi)
        elif kind=='slatted-wood-box':
            thickness=.03;box('-base',lo,(X,Y,z+thickness))
            for xx in (x,X-thickness):
                for yy in (y,Y-thickness):box('-corner',(xx,yy,z+thickness),(xx+thickness,yy+thickness,Z))
            gap=.02;rows=3;row=(h-2*thickness-(rows-1)*gap)/rows
            for i in range(rows):
                zz=z+thickness+i*(row+gap)
                for yy in (y,Y-thickness):box('-slat',(x+thickness,yy,zz),(X-thickness,yy+thickness,zz+row))
                for xx in (x,X-thickness):box('-end-slat',(xx,y+thickness,zz),(xx+thickness,Y-thickness,zz+row))
            for yy in (y,Y-thickness):box('-top-frame',(x+thickness,yy,Z-thickness),(X-thickness,yy+thickness,Z))
            for xx in (x,X-thickness):box('-end-frame',(xx,y+thickness,Z-thickness),(xx+thickness,Y-thickness,Z))
        elif kind=='lidded-wood-box':
            thickness=.03;box('-base',lo,(X,Y,z+thickness))
            for yy in (y,Y-thickness):box('-side',(x,yy,z+thickness),(X,yy+thickness,Z-.035))
            for xx in (x,X-thickness):box('-end',(xx,y+thickness,z+thickness),(xx+thickness,Y-thickness,Z-.035))
            box('-lid-rebate',(x+.01,y+.01,Z-.045),(X-.01,Y-.01,Z-.035))
            boards=math.ceil(d/.18)
            for i in range(boards):box('-lid-board',(x,y+i*d/boards+.001,Z-.035),(X,y+(i+1)*d/boards-.001,Z))
        elif kind=='tied-cloth-parcel':
            # Leave a slim envelope around the compressed plies for two 18 mm ties.
            S.soft_cloth(name+'-folded-stock',face,plane,(x+.004,y+.004,z+.004),(X-.004,Y-.004,Z-.012),mid,True)
            for xx in (x+w*.23,x+w*.77):
                for yy in (y,Y-.004):box('-binding-side',(xx-.009,yy,z+.004),(xx+.009,yy+.004,Z-.006))
                box('-binding-bottom',(xx-.009,y+.004,z),(xx+.009,Y-.004,z+.004))
                box('-binding-top',(xx-.009,y+.004,Z-.012),(xx+.009,Y-.004,Z-.006))
                box('-bound-knot',(xx-.018,(y+Y)/2-.012,Z-.012),(xx+.018,(y+Y)/2+.012,Z))
        else:raise ValueError('Unsupported Caravan part kind '+kind)
    sign=g['sign'];a=sign['centerAlongM'];z=sign['centerZ'];w=sign['widthM'];h=sign['heightM'];front=sign['frontOutM']
    ob=G.part(face,plane,g['id']+'-sign',(a-w/2,.149,z-h/2),(a+w/2,front,z+h/2),G.WOOD,'receive',.003)
    G.paint_object(ob,sign['paintSrgb']);G.text(g['id']+'-label',sign['text'],face,plane,a,front+.001,z,w*.85,h*.7)


def opening(face,plane,o,trim,back):
    if o.get('finishMaterialProfile')=='warmTimber':o=dict(o,closureMaterialId=G.WOOD)
    G.opening(face,plane,o,trim,back)
    if o['id']!='CC_PACK_RECESS':return
    cavity=o['shopfront']['cavity'];assert face=='west' and cavity['frontProfile']=='rectangular'
    # The front head occupies the authored barrel; the chamber ceiling owns
    # the space behind it, instead of overlapping timber and plaster faces.
    head=G.bpy.data.objects[o['id']+'-head'];ceiling=G.bpy.data.objects[o['id']+'-chamber-ceiling']
    join=plane+cavity['chamberFromOutM']-G.ORIGIN[0]
    for vertex in head.data.vertices:
        if vertex.co.x<join:vertex.co.x=join
    for vertex in ceiling.data.vertices:
        if vertex.co.x>join:vertex.co.x=join


def art_finish(area):
    """Art-direct the packing yard without changing its maneuvering space."""
    from bazaar_finish import apply
    apply(G.__dict__,OUT/(UNIT+'.glb'))
    recipe=area['artDirectionFinish']
    spec=importlib.util.spec_from_file_location('caravan_finish_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)
    materials=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz14_caravan_')
    def finish(ob,family,factor=1):
        ob.data.materials.clear();ob.data.materials.append(materials[family])
        old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
        for color in colors.data:color.color=(factor,factor,factor,1)
        ob.data.color_attributes.active_color=colors
        if family in {'timber','aged_timber','painted_timber','worktop'}:tools.member_uv(ob)
        else:G.world_uv(ob,float(materials[family]['tileSizeM']))
        return ob
    for ob in list(G.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        material=ob.data.materials[0];source=material.get('bz04SourceMaterial',material.name)
        if '-leaf-board' in ob.name:
            low=min(v.co.y for v in ob.data.vertices);high=max(v.co.y for v in ob.data.vertices)
            for v in ob.data.vertices:v.co.y+=-.001 if abs(v.co.y-low)<1e-6 else .001 if abs(v.co.y-high)<1e-6 else 0
        if any(key in source for key in ('plaster','beige')):finish(ob,'sand' if ob.name.startswith('cc-es-part-2') else 'plaster')
        elif any(key in source for key in ('timber','wood','plank','pine')):
            family='painted_timber' if ob.name.startswith('cc-w-STAFF-DOOR') else 'worktop' if 'worktop' in ob.name else 'aged_timber' if ob.name.startswith('G_CC_PACK') else 'timber'
            finish(ob,family,.95+.05*(sum(ob.name.encode())%7)/6)
        elif ob.name.startswith('G_CC_PACK_RECESS-wrapped-order'):
            finish(ob,'cloth')
    def timber(name,lo,hi,family='aged_timber'):
        return finish(G.part('west',3,'P3-cc-'+name,lo,hi,G.WOOD,'cast',.006),family)
    shutters=recipe['packingShutters'];bottom,top=shutters['zM'];back,front=shutters['outM']
    for side,(L,R) in enumerate(shutters['intervalsM']):
        for i in range(7):timber('shutter-board',(L+(R-L)*i/7,back,bottom),(L+(R-L)*(i+1)/7,front,top))
        for z in (bottom+.1,1.35,top-.15):timber('shutter-batten',(L+.015,front,z),(R-.015,front+.035,z+.10),'timber')
        for x in (L+.18,R-.18):
            G.part('west',3,'P3-cc-shutter-hanger',(x-.025,.03,top-.13),(x+.025,.07,shutters['trackZM']+.04),G.IRON,'cast',.005)
            G.ring('P3-cc-shutter-wheel','west',3,x,.073,shutters['trackZM'],.043)
        G.ring('P3-cc-shutter-pull','west',3,(L+R)/2,front+.048,1.10,.065)
    L,R=shutters['trackAlongM'];z=shutters['trackZM']
    G.part('west',3,'P3-cc-shutter-track',(L,.015,z-.021),(R,.095,z+.021),G.IRON,'cast',.005)
    for x in (L+.12,43.1,45.7,R-.12):G.part('west',3,'P3-cc-track-cleat',(x-.045,.001,z-.06),(x+.045,.04,z+.08),G.IRON,'cast',.004)
    for x in (43.1,45.59):timber('packing-jamb',(x,-.27,.04),(x+.11,.025,2.75),'timber')
    timber('packing-lintel',(43.1,-.27,2.62),(45.7,.05,2.75),'timber')
    rack=recipe['backRack'];L,R=rack['alongM'];back,front=rack['outM']
    for x in (L,R-.075):timber('rack-upright',(x,back,.04),(x+.075,back+.075,2.59),'timber')
    for z in rack['shelfZM']:
        timber('rack-shelf',(L,back,z-.055),(R,front,z),'worktop')
        for x in (L+.02,R-.095):timber('rack-cleat',(x,back,z-.13),(x+.055,front,z-.055),'timber')
        for i in range(3):
            x=L+.10+i*.58
            S.soft_cloth('P3-cc-packed-order','west',3,(x,back+.025,z),(x+.42,front-.015,z+.24),G.WOOD,True)
    for ob in G.bpy.context.scene.objects:
        if ob.name.startswith('P3-cc-packed-order'):finish(ob,'cloth',.84+.10*(sum(ob.name.encode())%3)/2)
    # Delivery leaves carry diagonal structural bracing, unlike the nearby flat receiving panels.
    o=next(o for o in G.PARCELS['cc-w']['openings'] if o['kind']=='door');c=-o['depthM']+.04;a=o['alongM']
    timber('delivery-meeting',(a-.035,c-.005,.08),(a+.035,c+.046,o['headM']-.10),'painted_timber')
    for sign in (-1,1):
        L=a+sign*.12;R=a+sign*(o['widthM']/2-.16)
        ob=G.member('P3-cc-delivery-brace',G.coords('west',3,R,c+.038,.52),G.coords('west',3,L,c+.038,2.28),.075,G.WOOD)
        finish(ob,'painted_timber');G.ring('P3-cc-delivery-pull','west',3,a+sign*.18,c+.085,1.21,.073)
        x=a+sign*.18
        G.part('west',3,'P3-cc-pull-staple',(x-.016,c,1.27),(x+.016,c+.09,1.30),G.IRON,'receive',.004)
    # The rear guildhall gets a dressed base and two engaged piers, aligned with its solid edges.
    stone='bz14_caravan_dressed_stone';material=G.mat('ph_bz04_trim_sanded_01').copy();material.name=stone
    if 'bz04UvRepeat' in material:del material['bz04UvRepeat']
    material['tileSizeM']=.45;G.MATS[stone]=material
    landing=recipe['deliveryLanding'];L,R=landing['alongM'];back,front=landing['outM']
    for i in range(landing['columns']):
        ob=G.part('west',3,'P3-cc-delivery-landing',(L+i*(R-L)/landing['columns']+.006,back,.001),(L+(i+1)*(R-L)/landing['columns']-.006,front,landing['topZM']),stone,'receive',.002)
        G.paint_object(ob,'#b1a38a');G.world_uv(ob,.45)
    base=recipe['guildhallBase'];L,R=base['alongM'];depth=base['projectionM']
    def block(name,lo,hi,index):
        ob=G.part('east',15,'P3-cc-'+name,lo,hi,stone,'cast',.009)
        G.paint_object(ob,['#b6ac96','#bfb49f','#b2a994'][index%3]);G.world_uv(ob,.45)
    for i in range(11):block('guild-plinth',(L+i*(R-L)/11+.004,.001,.015),(L+(i+1)*(R-L)/11-.004,depth,base['plinthTopM']),i)
    for axis in base['pilasterAxesM']:
        for i in range(8):
            z=base['plinthTopM']+i*(base['pierTopM']-base['plinthTopM'])/8;Z=base['plinthTopM']+(i+1)*(base['pierTopM']-base['plinthTopM'])/8
            block('guild-pier',(axis-base['pierWidthM']/2,.001,z+.004),(axis+base['pierWidthM']/2,depth*.72,Z-.004),i)
    block('guild-base-cap',(L,.001,base['pierTopM']),(R,depth,base['pierTopM']+.14),0)
    return tools


def build(saved,export=True):
    area=validate_handoff(saved);geometry(saved);origin=area['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ('x','y','z')))
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    interfaces['install'](G,area,additional_units={UNIT:None,'unit-service-south':None})
    S.build_shells(area,opening)
    for group in area['activityGroups']:activity(group)
    if export:
        tools=art_finish(area);S.validate_objects(area)
        prepare=G.prepare_mesh
        for ob in G.bpy.context.scene.objects:
            if ob.type=='MESH':prepare(ob)
        recipe=area['artDirectionFinish'];tools.bake_contact_occlusion(G.__dict__,recipe['contactRadiusM'],recipe['contactStrength'],subdivision_prefixes=('CC_PACK_RECESS',))
        G.prepare_mesh=lambda ob:None
        try:
            G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
                {'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})
        finally:G.prepare_mesh=prepare


def self_test(saved):
    area=validate_handoff(saved);geometry(saved);origin=area['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ('x','y','z')))
    for g in area['activityGroups']:activity(g)
    for ob in list(G.bpy.context.scene.objects):G.prepare_mesh(ob)
    S.validate_objects(area)
    from mathutils import Vector
    group=area['activityGroups'][0];prefix=group['id']
    assert len(group['instanceLayout']['parts'])==7
    for side in ('left','right'):
        assert len([ob for ob in G.bpy.context.scene.objects if ob.name.startswith(prefix+'-'+side+'-trestle-grounded-leg')])==2
        head=G.bpy.data.objects[prefix+'-'+side+'-trestle-bearing-head']
        assert abs(max(v.co.z for v in head.data.vertices)-.86)<1e-5
    assert len([ob for ob in G.bpy.context.scene.objects if ob.name.startswith(prefix+'-wrapped-order-bound-knot')])==2
    def first_height(name,x,y):
        hits=[]
        start=Vector(G.local((x,y,2)))
        for ob in G.bpy.context.scene.objects:
            if not ob.name.startswith(prefix+'-'+name):continue
            hit,point,normal,index=ob.ray_cast(start,Vector((0,0,-1)),distance=2)
            if hit:hits.append(point.z)
        return max(hits)
    assert abs(first_height('packing-box',2.88,43.965)-.97)<1e-5,'Slatted box mouth is not open to its base'
    assert abs(first_height('empty-storage',2.86,44.4)-.54)<1e-5,'Storage lid missing'
    face=next(f for f in area['faces'] if f['face']=='west');parcel=face['parcels'][0];shop=next(o for o in parcel['openings'] if o['id']=='CC_PACK_RECESS')
    opening(face['face'],face['wallPlaneM'],shop,parcel['trimMaterialId'],parcel['materialId'])
    for ob in G.bpy.context.scene.objects:G.prepare_mesh(ob)
    ceiling=G.bpy.data.objects['CC_PACK_RECESS-chamber-ceiling'];head=G.bpy.data.objects['CC_PACK_RECESS-head']
    assert abs(max(v.co.x for v in ceiling.data.vertices)+.28)<1e-5
    assert abs(min(v.co.x for v in head.data.vertices)+.28)<1e-5
    ray=Vector(G.local((2,44.4,2)));hits=[]
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith('CC_PACK_RECESS-'):continue
        hit,point,normal,index=ob.ray_cast(ray,Vector((0,0,1)),distance=1)
        if hit:hits.append((point.z,ob.name))
    assert sorted(hits)[0][1]=='CC_PACK_RECESS-chamber-ceiling' and sum(abs(z-2.75)<1e-5 for z,name in hits)==1,'Duplicate or missing chamber ceiling'
    # Keep out-of-parcel BC-01 bay edges from generating a pier across a route mouth.
    G.reset(tuple(origin[k] for k in ('x','y','z')))
    boundary_area=dict(area,faces=[dict(f,parcels=[p for p in f['parcels'] if p['structuralGrid'].get('assembly')=='BC-01']) for f in area['faces']])
    S.build_shells(boundary_area,G.opening)
    for f in boundary_area['faces']:
        for p in f['parcels']:
            objects=[o for o in G.bpy.context.scene.objects if o.name.startswith(p['id']+'-')]
            for ob in objects:
                G.prepare_mesh(ob)
                for v in ob.data.vertices:
                    world=(v.co.x+origin['x'],origin['y']-v.co.y,v.co.z+origin['z']);along=world[0] if f['face'] in {'north','south'} else world[1]
                    assert p['interval'][0]-.002<=along<=p['interval'][1]+.002,(p['id'],ob.name,along)
    build(saved,False);art_finish(area);S.validate_objects(area)
    for ob in G.bpy.context.scene.objects:
        if ob.name.startswith('P3-cc-') and not ob.name.startswith('P3-cc-delivery-landing'):
            for v in ob.data.vertices:
                x,y,z=v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]
                assert not (3.3<x<14.85 and 30<y<48 and z<2.2),('New Caravan geometry enters maneuvering area',ob.name,x,y,z)
    assert all(max(v.co.z for v in ob.data.vertices)<=.00801 for ob in G.bpy.context.scene.objects if ob.name.startswith('P3-cc-delivery-landing'))
    print('PASS Caravan additions remain at the warehouse/guildhall receivers',flush=True)
    print('PASS Caravan fixtures: seven finished packing parts fit their boxes; BC-01 clipped fields preserve route mouths',flush=True)


if __name__=='__main__':
    try:
        if '--handoff' not in sys.argv:raise ValueError('Requires --handoff <frozen handoff.json>')
        saved=json.loads(Path(sys.argv[sys.argv.index('--handoff')+1]).read_text());validate_handoff(saved)
        if 'check-inputs' in sys.argv:print('PASS Caravan Court frozen input and capability validation')
        elif 'self-test' in sys.argv:self_test(saved)
        else:build(saved)
    except Exception:
        import traceback
        traceback.print_exc();sys.exit(1)
