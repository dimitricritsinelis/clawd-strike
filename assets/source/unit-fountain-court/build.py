"""Approved R7 Fountain Court facades and craft, from a validated frozen handoff.

The section reuses the Spice envelope and courtyard geometry/export primitives.
Roof bundles, retained fountain, floor finish and legacy retirement are integrated
by the whole-map owner; no collider, route or playable surface is authored here.
"""
from pathlib import Path
import importlib.util
import hashlib
import json
import math
import runpy
import sys

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
UNIT='unit-fountain-court'


def inputs(path):
    saved=json.loads(Path(path).read_text())
    encoded={k:v for k,v in saved.items() if k not in {'source','designSha256','reading','inputSha256'}}
    digest=hashlib.sha256(json.dumps(encoded,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    extract=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']
    current=extract(UNIT)
    if saved.get('unit')!=UNIT or digest!=saved.get('inputSha256') or digest!=current['inputSha256']:
        raise ValueError('Fountain frozen handoff changed or is corrupt; no output replaced')
    required=saved['requiredCapabilities']
    assert set(required['openingProfiles'])<={'pointed','rectangular','segmental'}
    assert set(required['openingCraftProfiles'])<={'carved-timber-portal','dressed-stone-portal'}
    assert set(required['glazingPatterns'])<={'plaster-tracery'}
    assert set(required['featureKinds'])=={'inscribed-panel'}
    assert set(required['partKinds'])=={'contained-lancet-plant','contained-soil','hollow-stone-trough'}
    assert not required['landscapeKinds'] and not saved['areas'][0]['fixtures']
    return saved


def configure(saved):
    global S,B,A,H,BASE_OPENING,BASE_CLOSURE
    H=saved;A=saved['areas'][0]
    spec=importlib.util.spec_from_file_location('bz04_spice',ROOT/'assets/source/unit-spice-street/build.py')
    S=importlib.util.module_from_spec(spec);spec.loader.exec_module(S);S.configure(saved);B=S.B
    BASE_OPENING=B.opening;BASE_CLOSURE=B.closure
    B.opening=opening;B.closure=closure


def subtract(receiver,cutter):
    B.bpy.context.view_layer.objects.active=receiver
    modifier=receiver.modifiers.new('Authored recessed opening','BOOLEAN')
    modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
    B.bpy.ops.object.modifier_apply(modifier=modifier.name)
    B.bpy.data.objects.remove(cutter,do_unlink=True)


def stone_portal(face,plane,o):
    detail=o['architecturalDetail'];top=B.arch_points(o);width=detail['surroundWidthM'];name=o['id'];mid=detail['frameMaterialId'];s=o['sillM']
    # A raised 28 mm bead and outer dressed ring leave the 12 mm recessed band open.
    for lo,hi,label in ((0,.028,'bead'),(.040,width,'outer-ring')):
        inner=B.offset_top(top,lo);outer=B.offset_top(top,hi)
        for i in range(len(top)-1):
            B.prism_profile(name+'-'+label,face,plane,[inner[i],inner[i+1],outer[i+1],outer[i]],-.012,0,mid)
        for x,X in ((top[0][0]-hi,top[0][0]-lo),(top[-1][0]+lo,top[-1][0]+hi)):
            B.part(face,plane,name+'-'+label+'-jamb',(x,-.012,s),(X,0,top[0][1]),mid)


def opening(face,plane,o,trim,back):
    if 'archRingM' in o and 'trimWidthM' not in o:o=dict(o,trimWidthM=o['archRingM'])
    if o.get('architecturalDetail',{}).get('profile')=='dressed-stone-portal':
        shallow=dict(o);shallow.pop('architecturalDetail');shallow['frontProjectionM']=-.012
        BASE_OPENING(face,plane,shallow,trim,back);stone_portal(face,plane,o)
    else:BASE_OPENING(face,plane,o,trim,back)


def closure(face,plane,o,top):
    if o.get('finishMaterialProfile')=='warmTimber':o=dict(o,closureMaterialId=B.WOOD)
    profile=o.get('closureProfile',{});name=o['id'];s=o['sillM'];head=o['headM'];l=top[0][0];r=top[-1][0];c=-o['depthM']+.04;wood=o['closureMaterialId']
    def panel(n,x,X,z,Z,back,front,mid=wood,shadow='cast'):
        return B.clipped_panel(name+'-'+n,face,plane,top,x,X,z,Z,back,front,mid,shadow)
    if 'dadoTopM' in profile:
        # The fixed loggia is closed by stone below and slats above, never by leaves.
        z=profile['dadoTopM'];front=profile['screenOutM'];back=profile['opaqueBackOutM']
        B.part(face,plane,name+'-stone-dado',(l,back,s),(r,front,z),profile['dadoMaterialId'])
        for x,X in ((l,l+.08),(r-.08,r)):panel('screen-jamb',x,X,z,head,front-.04,front)
        panel('screen-bottom',l,r,z,z+.08,front-.04,front)
        inner=B.offset_top(top,-.08)
        for i in range(len(top)-1):B.prism_profile(name+'-screen-head',face,plane,[inner[i],inner[i+1],top[i+1],top[i]],front-.04,front,wood)
        for i in range(math.ceil((r-l-.16)/profile['screenPitchM'])):
            x=l+.08+i*profile['screenPitchM'];panel('fixed-slat',x,min(x+profile['screenBarM'],r-.08),z+.08,head-.08,front-.035,front)
    elif o.get('glazingProfile',{}).get('pattern')=='plaster-tracery':
        g=o['glazingProfile'];frame=profile['frameWidthM'];inner=B.offset_top(top,-frame);z=g['fromZM']
        plaster=o['surroundMaterialId'];field=panel('plaster-web-field',l,r,z,head,c-.035,c,plaster)
        cols=g['columnsPerLight'];pitch=(r-l-2*frame)/cols;web=g['webM']
        for i in range(cols):
            x=l+frame+i*pitch+web/2;X=l+frame+(i+1)*pitch-web/2;center=(x+X)/2
            def head_at(a):
                for p,q in zip(inner,inner[1:]):
                    if p[0]<=a<=q[0]:return p[1]+(q[1]-p[1])*(a-p[0])/(q[0]-p[0])
                raise ValueError(('glass cell outside head',a))
            cap=min(head_at(x),head_at(X),head_at(center))-.015
            spring=cap-(X-x)*.42
            arch=[(center+(X-x)/2*math.cos(math.pi-j*math.pi/16),spring+(cap-spring)*math.sin(math.pi-j*math.pi/16)) for j in range(17)]
            poly=[(x,z+frame),(X,z+frame)]+list(reversed(arch))
            cutter=B.prism_profile(name+'-cell-cutter',face,plane,poly,c-.04,c+.01,plaster,'receive');subtract(field,cutter)
            pane=B.prism_profile(name+'-glass-pane-'+str(i+1),face,plane,poly,c-.018,c-.018+g['glassThicknessM'],'bz04_fixed_glass','receive')
            B.paint_object(pane,g['paletteSrgb'][g['paletteSequence'][i]])
        panel('opaque-glass-back',l,r,z,head,-o['depthM']+.003,-o['depthM']+.008,'ph_bz04_dark_wood','receive')
    else:
        BASE_CLOSURE(face,plane,o,top)
        if 'transomPitchM' in profile:
            z=profile['leafTopM'];pitch=profile['transomPitchM'];width=profile['transomBarM']
            for i in range(math.ceil((r-l-.16)/pitch)):
                x=l+.08+i*pitch;panel('fixed-transom-vertical',x,min(x+width,r-.08),z,head-.08,c-.025,c)
            for i in range(math.ceil((head-z)/pitch)):
                Z=z+i*pitch;panel('fixed-transom-horizontal',l+.08,r-.08,Z,Z+width,c-.025,c)
            panel('transom-bearing',l+.08,r-.08,z-.025,z+.025,c-.025,c)


def inscription(f):
    face=f['receiverFace'];plane=f['wallPlaneM'];a=f['alongM'];w=f['widthM'];z,Z=f['zM'];out,front=f['outM'];name=f['id']
    panel=B.part(face,plane,name+'-receiver',(a-w/2,out,z),(a+w/2,front,Z),f['materialId'],'receive')
    curve=B.bpy.data.curves.new(name+'-cutter','FONT');curve.body=f['text'];curve.align_x='CENTER';curve.align_y='CENTER';curve.size=f['letterHeightM'];curve.extrude=f['incisionM'];curve.resolution_u=3
    ob=B.bpy.data.objects.new(name+'-cutter',curve);B.bpy.context.collection.objects.link(ob)
    ob.location=B.local(B.coords(face,plane,a,front,(z+Z)/2));ob.rotation_euler=(math.pi/2,0,{'north':math.pi,'south':0,'west':math.pi/2,'east':-math.pi/2}[face])
    B.bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);B.bpy.context.view_layer.objects.active=ob;B.bpy.ops.object.convert(target='MESH')
    # Font size is an em square, not the required visible capital height.
    height=max(v.co.y for v in ob.data.vertices)-min(v.co.y for v in ob.data.vertices)
    scale=f['letterHeightM']/height
    for vertex in ob.data.vertices:
        vertex.co.x*=scale;vertex.co.y*=scale
    subtract(panel,ob)
    from mathutils import Vector
    surface=Vector(B.local(B.coords(face,plane,a,front,0)))
    outward=Vector(B.local(B.coords(face,plane,a,front+1,0)))-surface
    colors=panel.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
    for vertex,color in zip(panel.data.vertices,colors.data):
        depth=-(vertex.co-surface).dot(outward)
        # Contact shade stays inside the real incision; the flush stone and
        # its approved material/texture scale remain unchanged.
        shade=.35 if abs(depth-f['incisionM'])<1e-5 else 1
        color.color=(shade,shade,shade,1)
    panel['bz04IncisionM']=f['incisionM']
    return panel


def inscription_fixture(f,panel):
    from mathutils import Vector
    face=f['receiverFace'];plane=f['wallPlaneM'];a=f['alongM'];front=f['outM'][1]
    surface=Vector(B.local(B.coords(face,plane,a,front,0)))
    outward=Vector(B.local(B.coords(face,plane,a,front+1,0)))-surface
    panel.data.calc_loop_triangles();cut_hits=0;flush_hits=0;cut_heights=[]
    for tri in panel.data.loop_triangles:
        vertices=[panel.data.vertices[i].co for i in tri.vertices]
        depths=[-(v-surface).dot(outward) for v in vertices]
        cut=all(abs(d-f['incisionM'])<1e-5 for d in depths)
        flush=all(abs(d)<1e-5 for d in depths)
        if not (cut or flush):continue
        center=sum(vertices,Vector())/3
        hit,point,normal,index=panel.ray_cast(center+outward*(.02+(f['incisionM'] if cut else 0)),-outward,distance=.05)
        assert hit and abs(-(point-surface).dot(outward)-(f['incisionM'] if cut else 0))<1e-5, 'Incision ray depth differs from scheduled 3 mm'
        if cut:
            cut_hits+=1;cut_heights.extend(v.z for v in vertices)
        else:flush_hits+=1
    assert cut_hits>=10 and flush_hits>=2,('Missing letter floors or flush field',cut_hits,flush_hits)
    assert abs(max(cut_heights)-min(cut_heights)-f['letterHeightM'])<1e-5,'Visible glyph height differs from scheduled 0.10 m'
    print('PASS inscription rays:',cut_hits,'letter triangles at 3 mm;',flush_hits,'flush field triangles; actual letter height 0.10 m',flush=True)


def plants(g):
    before=set(B.bpy.context.scene.objects)
    B.activity(g)
    created=set(B.bpy.context.scene.objects)-before
    for ob in created:
        if ob.name.startswith(g['id']+'-trough'):
            for modifier in ob.modifiers:
                if modifier.type=='BEVEL':modifier.width=.008
    return created


def construction(export=True):
    origin=A['sectionOriginDesign'];B.reset((origin['x'],origin['y'],origin['z']))
    interfaces=runpy.run_path(str(OUT/'receiver-interfaces.py'))
    interfaces['install'](B,A,skip={'F_SW','F_SE'})
    S.envelope()
    remove_south_internal_skins(next(face for face in A['faces'] if face['face']=='south'))
    for f in A['facadeFeatures']:inscription(f)
    for g in A['activityGroups']:plants(g)
    if export:
        S.budget_check()
        B.export(OUT/(UNIT+'.glb'),A['exportBoundsGltfLocal'],A['budget']['maxTriangles'],A['budget']['maxRenderedPrimitives'],{'bz04InputSha256':H['inputSha256'],'bz04Unit':UNIT})


def remove_south_internal_skins(south):
    if '--spice-handoff' not in sys.argv:raise ValueError('South receivers require --spice-handoff for their installed enclosure')
    from integrate_bz04 import load_handoff
    spice=load_handoff(Path(sys.argv[sys.argv.index('--spice-handoff')+1]))
    assert spice['unit']=='unit-spice-street'
    parents={p['id']:p for f in spice['areas'][0]['faces'] for p in f['parcels']}
    for parcel in south['parcels']:
        parent=parents[{'F_SW':'S_W_NORTH','F_SE':'S_E_NORTH'}[parcel['id']]]
        x,y,X,Y=parcel['footprint'];px,py,pX,pY=parent['footprint']
        assert px<=x<X<=pX and py<=y<Y<=pY and parcel['wallTopM']==parent['wallTopM']
        # These are internal partitions of the complete installed building,
        # including the side lying on its recessed street frontage.
        for suffix in ('-end','-end.001','-rear'):
            ob=B.bpy.data.objects.get(parcel['id']+suffix);assert ob is not None
            B.bpy.data.objects.remove(ob,do_unlink=True)
    return spice


def south_receivers(export=True):
    """Only the two named south receivers needed by Spawn A's Spice roof bundle."""
    south=next(face for face in A['faces'] if face['face']=='south')
    assert {p['id'] for p in south['parcels']}=={'F_SW','F_SE'}
    assert south['wallPlaneM']==32 and south['openIntervals']==[[21,33]]
    # Base-centre of the complete receiver envelope, including its scheduled drip.
    origin=(28,30.78,0)
    scoped=dict(A,faces=[south],facadeFeatures=[],activityGroups=[],fixtures=[],floorTreatment={})
    B.A=scoped;S.A=scoped;B.reset(origin);S.envelope()
    spice=remove_south_internal_skins(south)
    meshes=[ob for ob in B.bpy.context.scene.objects if ob.type=='MESH']
    assert meshes and all(ob.name.startswith(('F_SW-','F_SE-')) for ob in meshes)
    # The free model keeps only the source-authorized receiver footprints and heights.
    bounds={'min':[-8,-.02,-1.38],'max':[8,9.9,1.38]}
    for ob in meshes:
        B.prepare_mesh(ob)
        for vertex in ob.data.vertices:
            p=vertex.co
            assert bounds['min'][0]-.001<=p.x<=bounds['max'][0]+.001
            assert bounds['min'][1]-.001<=p.z<=bounds['max'][1]+.001
            assert -bounds['max'][2]-.001<=p.y<=-bounds['min'][2]+.001
    if not export:
        print('PASS Fountain south receiver fixture: only F_SW/F_SE, exact end envelopes and 9.9 m roof bearing',flush=True)
        return
    path=OUT/'fountain-south-receivers.glb'
    # Let the shared staged exporter enforce the unchanged actual-GLB ceilings.
    B.A=dict(scoped,outputUnit=path.stem)
    B.export(path,bounds,A['budget']['maxTriangles'],A['budget']['maxRenderedPrimitives'],{
        'bz04Unit':'unit-fountain-court-south-receivers','bz04SourceUnit':UNIT,
        'bz04InputSha256':H['inputSha256'],'bz04SourceParcelIds':['F_SW','F_SE'],
        'bz04SpiceEnclosureInputSha256':spice['inputSha256'],
        'bz04ReceiverFor':'ROOF_BUNDLE_UNIT_SPICE_STREET','bz04DependencyScope':'Spawn A roof receivers only',
        'bz04FloorTreatment':{},'bz04FreeModelOriginDesign':{'x':origin[0],'y':origin[1],'z':origin[2]},
        'bz04BoundaryCoverage':[{'orientation':'horizontal','coord':32,'start':p['interval'][0],'end':p['interval'][1]} for p in south['parcels']]})


def self_test():
    origin=A['sectionOriginDesign'];B.reset((origin['x'],origin['y'],origin['z']))
    for f in A['faces']:
        for p in f['parcels']:
            for o in p['openings']:
                if o.get('fixedInfill') or o.get('architecturalDetail',{}).get('profile')=='dressed-stone-portal':
                    opening(f['face'],f['wallPlaneM'],o,p['trimMaterialId'],p['materialId'])
    north=next(f for f in A['faces'] if f['face']=='north');parcel=north['parcels'][0];window=parcel['openings'][0]
    assert window['finishMaterialProfile']=='warmTimber' and window['closureMaterialId']=='ph_bz04_dark_wood'
    opening(north['face'],north['wallPlaneM'],window,parcel['trimMaterialId'],parcel['materialId'])
    frame=next(ob for ob in B.bpy.context.scene.objects if ob.name.startswith(window['id']+'-frame-jamb'))
    assert frame.data.materials[0]==B.mat(B.WOOD) and frame.data.materials[0].get('bz05FinishProfile')==H['craftStandards']['materials']['warmTimber']['exportName']
    opaque=B.bpy.data.objects['F_W_HALL-HIGH-LIGHT-opaque-glass-back']
    assert opaque.data.materials[0]==B.mat('ph_bz04_dark_wood'),'Opaque glass back lost its dark material'
    pane_count=sum(o.name.startswith('F_W_HALL-HIGH-LIGHT-glass-pane') for o in B.bpy.context.scene.objects)
    assert pane_count==3,('three real arched glass cells',pane_count)
    assert any(o.name.startswith('F_E_ARCH-stone-dado') for o in B.bpy.context.scene.objects)
    assert any(o.name.startswith('F_W_HALL-PRINCIPAL-fixed-transom-vertical') for o in B.bpy.context.scene.objects)
    panel=inscription(A['facadeFeatures'][0]);B.prepare_mesh(panel)
    inscription_fixture(A['facadeFeatures'][0],panel)
    for g in A['activityGroups']:
        for ob in plants(g):
            B.prepare_mesh(ob)
            for v in ob.data.vertices:
                world=(v.co.x+origin['x'],origin['y']-v.co.y,v.co.z+origin['z'])
                assert all(g['bbox']['min'][i]-.001<=world[i]<=g['bbox']['max'][i]+.001 for i in range(3)),(ob.name,world)
    print('PASS Fountain fixtures: three cut glass cells, fixed dado/slats, transom lattice, incised panel, grounded contained plants',flush=True)


if __name__=='__main__':
    try:
        if '--handoff' not in sys.argv:raise ValueError('Requires --handoff <frozen handoff.json>')
        saved=inputs(sys.argv[sys.argv.index('--handoff')+1])
        if 'check-inputs' in sys.argv:print('PASS Fountain frozen inputs and capability validation')
        else:
            configure(saved)
            if 'south-receivers-fixture' in sys.argv:south_receivers(False)
            elif 'south-receivers' in sys.argv:south_receivers()
            elif 'self-test' in sys.argv:self_test()
            else:construction()
    except Exception:
        import traceback
        traceback.print_exc();sys.exit(1)
