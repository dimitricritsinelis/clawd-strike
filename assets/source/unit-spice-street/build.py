"""Build the approved Spice Street section from a frozen R7 handoff.

Shared geometry/export primitives come from the courtyard builder. Roof bundles,
floor bindings and legacy producer retirement are integrated by the whole-map owner.
"""
from pathlib import Path
import importlib.util
import hashlib
import json
import math
import runpy
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
UNIT = 'unit-spice-street'
SUPPORTED_PARTS = {'carved-wood-scoop', 'ceramic-mortar-with-seated-pestle',
    'folded-cloth', 'grounded-counter-carcass', 'lidded-ceramic-jar',
    'open-cloth-sack', 'plank-board', 'plank-shelf', 'sealed-ceramic-bottle',
    'stocked-spice-tray', 'supported-brass-balance', 'timber-member'}


def inputs(path):
    saved = json.loads(Path(path).read_text())
    extract = runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']
    current = extract(UNIT, json.loads((ROOT/'docs/map-design/construction/design.json').read_text()),
        json.loads((ROOT/'docs/map-design/construction/roof-coordination.json').read_text()))
    if saved.get('unit') != UNIT or saved.get('inputSha256') != current['inputSha256']:
        raise ValueError('Spice inputs changed since frozen handoff; no output replaced')
    encoded = {k:v for k,v in saved.items() if k not in {'source','designSha256','reading','inputSha256'}}
    digest = hashlib.sha256(json.dumps(encoded,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    if digest != saved['inputSha256']:raise ValueError('Frozen Spice handoff contents do not match its hash')
    required = saved['requiredCapabilities']
    assert not set(required['partKinds']) - SUPPORTED_PARTS, required['partKinds']
    assert set(required['openingProfiles']) <= {'rectangular', 'segmental'}
    assert not required['featureKinds'] and not required['landscapeKinds']
    assert {f['kind'] for f in saved['areas'][0]['fixtures']} <= {'awning', 'canopy'}
    return saved


def configure(saved):
    global B, A, H, SOUTH_RECEIVERS, RECEIVER_INPUT_SHA, SPAWN_A_RECEIVERS, SPAWN_A_INPUT_SHA
    H = saved; A = saved['areas'][0]
    spec = importlib.util.spec_from_file_location('bz04_courtyard', ROOT/'assets/source/unit-spawn-b-courtyard/build.py')
    B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)
    B.A = A; B.OUT = OUT; B.FROZEN_INPUT_SHA=saved['inputSha256']
    B.D.update({k: saved[k] for k in ('materials', 'materialRuntimeContract', 'craftStandards')})
    B.PARCELS = {p['id']: p for f in A['faces'] for p in f['parcels']}
    SOUTH_RECEIVERS = {}; RECEIVER_INPUT_SHA = None
    SPAWN_A_RECEIVERS = {}; SPAWN_A_INPUT_SHA = None
    if A['zone']=='SPICE_STREET' and '--receiver-handoff' in sys.argv:
        path=Path(sys.argv[sys.argv.index('--receiver-handoff')+1])
        spec=importlib.util.spec_from_file_location('fountain_receiver_inputs',ROOT/'assets/source/unit-fountain-court/build.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        receiver=module.inputs(path)
        south=next(f for f in receiver['areas'][0]['faces'] if f['face']=='south')
        SOUTH_RECEIVERS={p['id']:p for p in south['parcels']}
        assert set(SOUTH_RECEIVERS)=={'F_SE','F_SW'} and south['wallPlaneM']==32
        RECEIVER_INPUT_SHA=receiver['inputSha256']
    if A['zone']=='SPICE_STREET' and '--spawn-a-handoff' in sys.argv:
        from integrate_bz04 import load_handoff
        receiver=load_handoff(Path(sys.argv[sys.argv.index('--spawn-a-handoff')+1]))
        assert receiver['unit']=='unit-spawn-a-courtyard'
        north=next(f for f in receiver['areas'][0]['faces'] if f['face']=='north')
        SPAWN_A_RECEIVERS={p['id']:p for p in north['parcels']}
        assert set(SPAWN_A_RECEIVERS)=={'A_NW_RETURN','A_NE_RETURN'} and north['wallPlaneM']==14
        SPAWN_A_INPUT_SHA=receiver['inputSha256']



def paint(ob, color, neutral=1):
    color = color.lstrip('#')
    rgb = [B._linear_channel(int(color[i:i+2], 16))/neutral for i in (0, 2, 4)]
    assert max(rgb) <= 1, (ob.name, color, neutral)
    layer = ob.data.color_attributes.get('COLOR_0') or ob.data.color_attributes.new('COLOR_0', 'FLOAT_COLOR', 'POINT')
    for c in layer.data: c.color = (*rgb, 1)


def turned(name, face, plane, lo, hi, mid, profile, color=None, soft=False):
    """Closed profile of revolution, with explicit rim/foot/lid profile breaks."""
    x,y,z = lo; X,Y,Z = hi; vertices = []; faces = []
    for radius, level in profile:
        for i in range(32):
            angle = i*math.tau/32
            irregular = 1-.025*(1-math.cos(angle*5)) if soft else 1
            vertices.append(B.coords(face,plane,(x+X)/2+(X-x)/2*radius*math.cos(angle)*irregular,
                (y+Y)/2+(Y-y)/2*radius*math.sin(angle)*irregular,z+(Z-z)*level))
    for j in range(len(profile)-1):
        for i in range(32):
            q=j*32+i; r=j*32+(i+1)%32
            faces.append((q,r,r+32,q+32))
    # Along/out has a reversed handedness on north and west receivers.
    if face in {'north','west'}:faces=[tuple(reversed(f)) for f in faces]
    ob=B.mesh(name,vertices,faces,mid,'receive',True)
    if mid=='bz04_ceramic_project_original':
        ob.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(1,1,1,1)
        paint(ob,color or '#c5a37c')
    elif color:paint(ob,color)
    return ob


def craft_part(g, item):
    face=g['receiverFace']; p=B.PARCELS[g['receiverParcel']]
    plane=next(f['wallPlaneM'] for f in A['faces'] if f['face']==face)
    opening=next(o for o in p['openings'] if o['id']==g['receiverOpening'])
    along=opening['alongM']; deck=g['bbox']['min'][2]
    lo=[item['localBox']['min'][0]+along,item['localBox']['min'][1],item['localBox']['min'][2]+deck]
    hi=[item['localBox']['max'][0]+along,item['localBox']['max'][1],item['localBox']['max'][2]+deck]
    x,y,z=lo; X,Y,Z=hi; w=X-x; d=Y-y; h=Z-z; cx=(x+X)/2; cy=(y+Y)/2
    name=g['id']+'-'+item['id']; mid=item['materialId']; kind=item['kind']; color=item.get('stockColorSrgb')
    before=set(B.bpy.context.scene.objects)
    def box(s,l,r,m=mid):
        ob=B.part(face,plane,name+s,l,r,m,'receive',.003)
        if m=='bz04_ceramic_project_original':
            ob.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(1,1,1,1)
            paint(ob,'#c5a37c')
        return ob
    def beam(s,l,r,width,m=mid):return B.member(name+s,B.coords(face,plane,*l),B.coords(face,plane,*r),width,m,'receive')
    def lathe(s,l,r,profile,m=mid,c=None,soft=False):return turned(name+s,face,plane,l,r,m,profile,c,soft)
    if kind=='grounded-counter-carcass':
        box('-top',(x,y,Z-.045),hi)
        n=math.ceil(w/.18)
        for i in range(n):box('-front-board',(x+i*w/n+.001,Y-.035,z),(x+(i+1)*w/n-.001,Y,Z-.045))
        for a in (x,X-.065):box('-side',(a,y,z),(a+.065,Y-.035,Z-.045))
        for zz in (z+.08,Z-.12):box('-rear-rail',(x,y,zz),(X,y+.04,zz+.04))
    elif kind=='plank-shelf':
        box('-board',(x,y,Z-.04),hi)
        for a in (x+.12,X-.12):
            beam('-bracket',(a,y+.014,Z-.20),(a,Y-.014,Z-.0525),.025)
            box('-back-seat',(a-.0125,y,z),(a+.0125,y+.025,Z-.04))
    elif kind in {'timber-member','plank-board'}:box('',lo,hi)
    elif kind=='stocked-spice-tray':
        box('-base',lo,(X,Y,z+.018))
        for a,b in ((x,x+.025),(X-.025,X)):box('-rim',(a,y,z+.018),(b,Y,Z))
        for a,b in ((y,y+.025),(Y-.025,Y)):box('-rim',(x+.025,a,z+.018),(X-.025,b,Z))
        ob=box('-contained-stock',(x+.026,y+.026,z+.018),(X-.026,Y-.026,Z-.012))
        paint(ob,color)
    elif kind=='carved-wood-scoop':
        lathe('-concave-bowl',lo,(x+w*.65,Y,Z),[(0,0),(.5,0),(.82,.25),(1,.9),(.85,.9),(.63,.35),(0,.22)])
        beam('-joined-handle',(x+w*.48,cy,z+h*.42),(X-.012,cy,z+h*.42),min(.024,h*.45))
    elif kind=='lidded-ceramic-jar':
        lathe('-body',lo,(X,Y,z+h*.84),[(0,0),(.58,0),(.72,.08),(1,.38),(.95,.67),(.72,.88),(.7,1),(0,1)],c=color)
        lathe('-seated-lid',(x+w*.15,y+d*.15,z+h*.82),(X-w*.15,Y-d*.15,Z),[(0,0),(1,0),(1,.3),(.82,.6),(.25,.75),(.25,1),(0,1)],c=color)
    elif kind=='sealed-ceramic-bottle':
        lathe('-body',lo,(X,Y,z+h*.90),[(0,0),(.68,0),(.91,.07),(1,.2),(.96,.67),(.38,.85),(.36,1),(0,1)],c=color)
        lathe('-seated-stopper',(cx-w*.19,cy-d*.19,z+h*.87),(cx+w*.19,cy+d*.19,Z),[(0,0),(.85,0),(.85,.7),(1,.7),(1,1),(0,1)],c=color)
    elif kind=='supported-brass-balance':
        box('-foot',(cx-w*.18,cy-d*.25,z),(cx+w*.18,cy+d*.25,z+.025))
        beam('-post',(cx,cy,z+.025),(cx,cy,Z-.014),.025)
        beam('-equal-arm',(x+.015,cy,Z-.014),(X-.015,cy,Z-.014),.025)
        for a in (x+w*.23,X-w*.23):
            radius=min(w*.20,d*.45); pan_z=z+h*.35
            lathe('-pan',(a-radius,cy-radius,pan_z),(a+radius,cy+radius,pan_z+.035),[(0,0),(.5,0),(1,1),(.85,1),(.3,.3),(0,.3)])
            for dx,dy in ((radius*.7,0),(-radius*.7,0),(0,radius*.7),(0,-radius*.7)):
                beam('-suspension',(a,cy,Z-.026),(a+dx,cy+dy,pan_z+.027),.008)
    elif kind=='open-cloth-sack':
        rim=max(.018/(w/2),.018/(d/2))
        ob=lathe('-soft-mouth',lo,hi,[(0,0),(.60,0),(.92,.12),(1,.45),(.84,.84),(.72,.98),(.72,1),(.72-rim,1),(.72-rim,.93),(.5,.87),(0,.87)],soft=True)
        neutral=H['craftStandards']['materials']['cloth']['vertexPaintRecipe']['representativeNeutralGrainLinear']
        paint(ob,'#dfcfab',neutral)
        lathe('-contained-grain',(cx-w*.26,cy-d*.26,Z-.04),(cx+w*.26,cy+d*.26,Z-.025),[(0,0),(1,0),(1,.7),(0,1)],'bz04_ceramic_project_original','#c6af78')
    elif kind=='ceramic-mortar-with-seated-pestle':
        rim=.015/(w/2)
        lathe('-bowl',lo,(X,Y,z+h*.78),[(0,0),(.65,0),(.8,.15),(1,1),(1-rim,1),(.50,.26),(0,.22)],c=color)
        beam('-seated-pestle',(cx-w*.10,cy,z+h*.25),(cx+w*.23,cy,Z-.017),.03)
    elif kind=='folded-cloth':
        # Three compressed layers with alternating fold lips, contained in the box.
        neutral=H['craftStandards']['materials']['cloth']['vertexPaintRecipe']['representativeNeutralGrainLinear']
        for i in range(3):
            ob=box('-fold-'+str(i),(x+.006*(i%2),y,z+i*h/3),(X-.006*(i%2),Y,z+(i+1)*h/3-.002))
            paint(ob,'#dfcfab',neutral)
    else:raise ValueError('Unsupported Spice craft kind '+kind)
    created=set(B.bpy.context.scene.objects)-before
    for ob in created:
        ob['bz04Part']=name
        if kind=='ceramic-mortar-with-seated-pestle' and 'pestle' in ob.name:paint(ob,color)
    assert created,name
    return created,lo,hi,face,plane


def canopy(f):
    name=f['id'];a=f['endA'];b=f['endB'];width=f['widthM']; vertices=[];faces=[]
    for i in range(25):
        t=i/24
        for j in range(5):
            u=j/4
            vertices.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t+(u-.5)*width,
                a[2]+(b[2]-a[2])*t-f['sagM']*4*t*(1-t)))
    for i in range(24):
        for j in range(4):q=i*5+j;faces.append((q,q+5,q+6,q+1))
    count=len(vertices);vertices += [(x,y,z-.008) for x,y,z in vertices]
    faces += [tuple(v+count for v in reversed(face)) for face in faces.copy()]
    boundary=list(range(5))+[i*5+4 for i in range(1,25)]+list(range(123,119,-1))+[i*5 for i in range(23,0,-1)]
    for p,q in zip(boundary,boundary[1:]+boundary[:1]):faces.append((p,q,q+count,p+count))
    ob=B.mesh(name+'-cloth',vertices,faces,f['materialId'])
    paint(ob,f['stockColorSrgb'],H['craftStandards']['materials']['cloth']['vertexPaintRecipe']['representativeNeutralGrainLinear'])
    for i,p in enumerate((a,b)):
        length=f['ledgerLengthM'];B.box(name+'-endpoint-ledger-'+str(i+1),(p[0]-.05,p[1]-length/2,p[2]-.05),(p[0]+.05,p[1]+length/2,p[2]+.05),B.WOOD)


def envelope():
    for f in A['faces']:
        face=f['face'];plane=f['wallPlaneM']
        for p in f['parcels']:
            l,r=p['interval'];z=p['floorElevationM'];top=p['wallTopM'];dep=p['shellDepthM'];mid=p['materialId'];name=p['id']
            masks=[]
            for o in p['openings']:
                trim=o.get('trimWidthM',o.get('archRingM',.1));masks.append((o['alongM']-o['widthM']/2-trim,o['alongM']+o['widthM']/2+trim,max(z,o['sillM']-.06),o['headM']+trim+(.02 if o.get('headShape','rectangular')!='rectangular' else 0)))
            for feature in A.get('facadeFeatures',[]):
                if feature['receiverParcel']==name and feature['kind']=='inscribed-panel':
                    masks.append((feature['alongM']-feature['widthM']/2,feature['alongM']+feature['widthM']/2,*feature['zM']))
            left=l+(.0075 if any(q['interval'][1]==l for q in f['parcels']) else 0)
            right=r-(.0075 if any(q['interval'][0]==r for q in f['parcels']) else 0)
            xs=sorted({left,right,*[max(left,min(right,v)) for mask in masks for v in mask[:2]]})
            for x,X in zip(xs,xs[1:]):
                zs=sorted({z,z+.12,z+.18,top,*[v for region in p['materialRegions'] for v in region['zM']],*[max(z,min(top,v)) for L,R,s,h in masks if L<(x+X)/2<R for v in (s,h)]})
                for Z,T in zip(zs,zs[1:]):
                    if any(L<(x+X)/2<R and s<(Z+T)/2<h for L,R,s,h in masks):continue
                    material=next((region['materialId'] for region in p['materialRegions'] if region['zM'][0]<=(Z+T)/2<=region['zM'][1]),mid)
                    ob=B.facade_field(face,plane,name,x,X,Z,T,material)
                    colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
                    for vertex,color in zip(ob.data.vertices,colors.data):
                        t=1-.045*max(0,min(1,(z+.18-vertex.co.z)/.06));color.color=(t,t,t,1)
            for endpoint,(x,X) in enumerate(((l,l+.02),(r-.02,r))):
                end_depths=[(-dep,-.02)]
                receiver_id={'S_E_NORTH':'F_SE','S_W_NORTH':'F_SW'}.get(name)
                receiver=SOUTH_RECEIVERS.get(receiver_id) if endpoint==1 else SPAWN_A_RECEIVERS.get({'S_E_SOUTH':'A_NE_RETURN','S_W_SOUTH':'A_NW_RETURN'}.get(name))
                if receiver:
                    # The installed adjoining receiver owns this exact overlap once.
                    # Keep every non-overlapping portion and the other end skin unchanged.
                    assert (r==32 if endpoint==1 else l==14) and receiver['wallTopM']==top
                    world_l,world_r=receiver['interval']
                    cut_l,cut_r=sorted((plane-world_l,plane-world_r) if face=='east' else (world_l-plane,world_r-plane))
                    end_depths=[(L,R) for L,R in ((-dep,min(-.02,cut_l)),(max(-dep,cut_r),-.02)) if R>L]
                for depth_l,depth_r in end_depths:
                    B.part(face,plane,name+'-end'+('.001' if endpoint else ''),(x,depth_l,z),(X,depth_r,top),mid)
            building=next(b for b in H['buildings'] if b['id']==p['buildingId'])
            rear_doors=building.get('rearServiceDoors',[]) if face=='west' else []
            if rear_doors:
                assert len(rear_doors)==1, name
                door=rear_doors[0];center=door['worldCenter'][1];half=door['widthM']/2
                for L,R,bottom,head in ((l,center-half-.1,z,top),(center+half+.1,r,z,top),(center-half-.1,center+half+.1,door['heightM']+.1,top)):
                    B.part(face,plane,name+'-rear',(L,-dep,bottom),(R,-dep+.02,head),mid)
                B.opening('east',door['worldCenter'][0],dict(id=door['id'],alongM=center,widthM=door['widthM'],
                    heightM=door['heightM'],headM=door['heightM'],sillM=z,depthM=.18,kind='door',assemblyId='SD-05',
                    closure=door['closure'],closureMaterialId=B.WOOD,finishLeafCount=2,finishFamily='workshop',
                    frontProjectionM=0,surroundMaterialId=mid,revealMaterialId=mid),p['trimMaterialId'],mid)
            else:B.part(face,plane,name+'-rear',(l,-dep,z),(r,-dep+.02,top),mid)
            B.part(face,plane,name+'-base',(l,-dep,z-.02),(r,-.02,z),mid)
            # Structural closure at the wall top meets the shared roof slab.
            B.part(face,plane,name+'-ceiling',(l,-dep,top-.02),(r,0,top),mid)
            if p['envelopeDetail']['corniceProfile']=='single-drip':
                Z,T=p['envelopeDetail']['corniceZM']
                B.part(face,plane,name+'-cornice',(l,0,Z+.008),(r,.16,T),mid)
                B.part(face,plane,name+'-drip-inner',(l,0,Z),(r,.132,Z+.008),mid)
                B.part(face,plane,name+'-drip-edge',(l,.14,Z),(r,.16,Z+.008),mid)
            elif p['envelopeDetail']['corniceProfile']=='civic-stepped':
                Z,T=p['envelopeDetail']['corniceZM']
                B.part(face,plane,name+'-cornice-lower',(l,0,Z),(r,.10,Z+.08),mid)
                B.part(face,plane,name+'-cornice-upper',(l,0,Z+.08),(r,.16,T),mid)
            for o in p['openings']:B.opening(face,plane,o,p['trimMaterialId'],mid)
            neighbour=next((q for q in f['parcels'] if q['interval'][0]==r),None)
            if neighbour:B.part(face,plane,name+'-property-joint',(r-.0075,-.02,z),(r+.0075,-.015,min(top,neighbour['wallTopM'])),mid)


def construction(export=True):
    if A['zone']=='SPICE_STREET' and (not SOUTH_RECEIVERS or not SPAWN_A_RECEIVERS):raise ValueError('Spice export requires --receiver-handoff and --spawn-a-handoff for its approved end interfaces')
    B.reset((21,14,0));envelope()
    for g in A['activityGroups']:
        for item in g['instanceLayout']['parts']:craft_part(g,item)
        s=g['sign'];a=s['centerAlongM'];z=s['centerZ'];w=s['widthM'];h=s['heightM'];out=s['frontOutM']
        ob=B.part('west',21,g['id']+'-sign',(a-w/2,.149,z-h/2),(a+w/2,out,z+h/2),B.WOOD,'receive',.003)
        paint(ob,s['paintSrgb'])
        B.text(g['id']+'-label',s['text'],'west',21,a,out+.001,z,w*.85,h*.7)
    for f in A['fixtures']:
        if f['kind']=='canopy':canopy(f)
        else:
            before=set(B.bpy.context.scene.objects);B.awning(f)
            for ob in set(B.bpy.context.scene.objects)-before:
                if ob.type=='MESH' and ob.data.materials[0]==B.mat(f['materialId']):
                    paint(ob,f['stockColorSrgb'],H['craftStandards']['materials']['cloth']['vertexPaintRecipe']['representativeNeutralGrainLinear'])
    if export:
        budget_check()
        B.export(OUT/(UNIT+'.glb'),A['exportBoundsGltfLocal'],A['budget']['maxTriangles'],A['budget']['maxRenderedPrimitives'],
            {'bz04InputSha256':H['inputSha256'],'bz04Unit':UNIT,'bz04SouthReceiverInputSha256':RECEIVER_INPUT_SHA,'bz04SpawnAReceiverInputSha256':SPAWN_A_INPUT_SHA})


def budget_check():
    groups={(ob.data.materials[0].name,ob.get('bz04Shadow','cast')) for ob in B.bpy.context.scene.objects if ob.type=='MESH'}
    materials={mid for mid,_ in groups}
    counts={'sourceMaterials':len(materials),'sourcePrimitives':len(groups),'sourceShadowPrimitives':sum(shadow=='cast' for _,shadow in groups)}
    print('SOURCE COUNTS',json.dumps(counts,sort_keys=True),flush=True)
    return counts


def self_test():
    B.reset((21,14,0));seen=set()
    for g in A['activityGroups']:
        for item in g['instanceLayout']['parts']:
            if item['kind'] in seen:continue
            seen.add(item['kind']);objects,lo,hi,face,plane=craft_part(g,item)
            for ob in objects:
                B.prepare_mesh(ob)
                for v in ob.data.vertices:
                    world=(v.co.x+21,14-v.co.y,v.co.z)
                    local=(world[1],world[0]-plane,world[2])
                    assert all(lo[i]-.001<=local[i]<=hi[i]+.001 for i in range(3)),(item['id'],ob.name,local,lo,hi)
    assert seen==SUPPORTED_PARTS
    B.reset((21,14,0));canopy(next(f for f in A['fixtures'] if f['kind']=='canopy'))
    for ob in B.bpy.context.scene.objects:
        assert min(v.co.z for v in ob.data.vertices)>=6.2919,ob.name
    print('PASS Spice fixtures: all 12 craft kinds fit their exact boxes; canopy sag/closed thickness/receivers',flush=True)


if __name__=='__main__':
    try:
        if '--handoff' not in sys.argv:raise ValueError('Requires --handoff <frozen handoff.json>')
        saved=inputs(sys.argv[sys.argv.index('--handoff')+1])
        if 'check-inputs' in sys.argv:print('PASS Spice frozen input and capability validation')
        else:
            configure(saved)
            if 'self-test' in sys.argv:self_test()
            else:construction()
    except Exception:
        import traceback
        traceback.print_exc();sys.exit(1)
