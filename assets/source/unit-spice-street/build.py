"""Build Spice Street, including the user-directed P2 art pilot, from a frozen handoff.

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
        frame=A['artDirectionPilot']['counter'];size=frame['frameM'];gap=frame['footGapM'];setback=frame['panelSetbackM'];overlap=frame['panelOverlapM']
        for j in range(frame['topBoardCount']):
            box('-top-board',(x,y+j*d/frame['topBoardCount']+.002,Z-.055),(X,y+(j+1)*d/frame['topBoardCount']-.002,Z))
        for a in [x+.025,X-size-.025]:
            for out in [y+.02,Y-size-.012]:box('-leg',(a,out,z),(a+size,out+size,Z-.055))
        for zz in [z+gap,Z-.14]:box('-front-rail',(x,Y-.065,zz),(X,Y-.008,zz+size))
        n=3 if g['id']=='G_S_W_SHOP_3' else 2
        for j in range(1,n):
            a=x+j*w/n-size/2;box('-mullion',(a,Y-.065,z+gap),(a+size,Y-.008,Z-.055))
        for j in range(n):
            left=x+.025+size-overlap if j==0 else x+j*w/n+size/2-overlap
            right=X-.025-size+overlap if j==n-1 else x+(j+1)*w/n-size/2+overlap
            count=max(1,math.ceil((right-left)/frame['boardWidthM']))
            for i in range(count):
                L=left+i*(right-left)/count;R=left+(i+1)*(right-left)/count
                box('-panel-board',(L+.001,Y-.065-setback,z+gap+size),(R-.001,Y-.025-setback,Z-.14))
        for a in [x+.02,X-.05]:box('-side-panel',(a,y+.10,z+gap+size),(a+.03,Y-.11,Z-.14))
        for zz in [z+gap,Z-.14]:box('-rear-rail',(x,y+.015,zz),(X,y+.07,zz+.05))
    elif kind=='plank-shelf':
        box('-board',(x,y,Z-.04),hi)
        for a in (x+.12,X-.12):
            beam('-bracket',(a,y+.014,Z-.20),(a,Y-.014,Z-.0525),.025)
            box('-back-seat',(a-.0125,y,z),(a+.0125,y+.025,Z-.04))
    elif kind in {'timber-member','plank-board'}:box('',lo,hi)
    elif kind=='stocked-spice-tray':
        box('-base',lo,(X,Y,z+.018))
        for a,b in ((x,x+.025),(X-.025,X)):box('-rim',(a,y,z+.018),(b,Y,min(Z,z+.07)))
        for a,b in ((y,y+.025),(Y-.025,Y)):box('-rim',(x+.025,a,z+.018),(X-.025,b,min(Z,z+.07)))
        if A.get('artDirectionPilot'):
            food=B.mat('bz04_spice_stock');shader=food.node_tree.nodes['Principled BSDF']
            shader.inputs['Base Color'].default_value=(1,1,1,1);shader.inputs['Roughness'].default_value=.98
            lathe('-contained-stock',(x+.026,y+.026,z+.018),(X-.026,Y-.026,Z-.008),
                  [(0,0),(1,0),(1,.18),(.70,.54),(.35,.83),(0,1)],'bz04_spice_stock',color,True)
        else:
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
        paint(ob,'#bca77e' if A.get('artDirectionPilot') else '#dfcfab',neutral)
        vertices=[];faces=[]
        for i in range(32):
            angle=i*math.tau/32
            for j in range(6):
                tube=j*math.tau/6
                vertices.append(B.coords(face,plane,cx+(w*.34+.009*math.cos(tube))*math.cos(angle),cy+(d*.34+.009*math.cos(tube))*math.sin(angle),Z-.014+.009*math.sin(tube)))
        for i in range(32):
            for j in range(6):faces.append((i*6+j,((i+1)%32)*6+j,((i+1)%32)*6+(j+1)%6,i*6+(j+1)%6))
        cuff=B.mesh(name+'-rolled-mouth',vertices,faces,mid,'cast',True)
        paint(cuff,'#bca77e',neutral)
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
            for o in p['openings']:
                B.opening(face,plane,o,p['trimMaterialId'],mid)
                if o['kind']=='shop' and A.get('artDirectionPilot'):
                    assert face=='west' and plane==21
                    # The shared builder emits a full-depth head and ceiling
                    # on the same underside plane. Give the visible soffit
                    # and shallow timber header disjoint ownership here.
                    seam=-A['artDirectionPilot']['shopHeaderDepthM']
                    head=B.bpy.data.objects[o['id']+'-head']
                    ceiling=B.bpy.data.objects[o['id']+'-chamber-ceiling']
                    for vertex in head.data.vertices:vertex.co.x=max(vertex.co.x,seam)
                    for vertex in ceiling.data.vertices:vertex.co.x=min(vertex.co.x,seam)
                    head.data.update();ceiling.data.update()
            neighbour=next((q for q in f['parcels'] if q['interval'][0]==r),None)
            if neighbour:B.part(face,plane,name+'-property-joint',(r-.0075,-.02,z),(r+.0075,-.015,min(top,neighbour['wallTopM'])),mid)


def art_direction_pilot():
    """Build the scoped P2 target with private materials and complete assemblies."""
    pilot=A.get('artDirectionPilot')
    if not pilot:return
    if pilot['id']!='SPICE-P3':raise ValueError('Unsupported Spice art-direction issue')
    from bazaar_finish import apply as apply_finish
    apply_finish(B.__dict__, OUT/(UNIT+'.glb'))
    spec=importlib.util.spec_from_file_location('spice_materials',OUT/'materials.py')
    material_tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(material_tools)
    private=material_tools.create_materials(B.__dict__,pilot['materials'])

    def assign(ob,family,variation=1):
        ob.data.materials.clear();ob.data.materials.append(private[family])
        old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
        tone=pilot['contactTone']
        for vertex,color in zip(ob.data.vertices,colors.data):
            value=variation
            if family in {'plaster','sand','red'}:
                value*=1-tone['baseStrength']*max(0,1-vertex.co.z/tone['baseHeightM'])
                # Recess depth owns the cavity tone; it is baked into this
                # section's vertices, not a global exposure or lighting change.
                if ob.name.startswith(('S_W_SHOP_','G_S_W_SHOP_')):
                    value*=max(tone['recessMinFactor'],1+min(0,vertex.co.x)*.14)
            color.color=(value,value,value,1)
        ob.data.color_attributes.active_color=colors
        if family in {'timber','aged_timber','painted_timber','worktop'} and 'B-STAR' not in ob.name:material_tools.member_uv(ob)
        else:B.world_uv(ob,float(private[family]['tileSizeM']))
        return ob

    def wood(ob):
        # Stable minor member variation preserves one timber family without
        # stamping the same shade on every plank and joint.
        factor=.92+.08*(sum(ob.name.encode())%11)/10
        family='timber'
        if 'UPPER-SCREEN' in ob.name or 'UPPER-HOOD' in ob.name:family='aged_timber'
        if ob.name.startswith(('G_S_W_SHOP_3','P2-G_S_W_SHOP_3','P3-HERBS')):family='painted_timber'
        if '-top-board' in ob.name:family='worktop'
        return assign(ob,family,factor)

    def cloth(ob,color):
        assign(ob,'cloth')
        target=private['cloth']['bz07TargetMeanLinear']
        rgba=[B._linear_channel(int(color[i:i+2],16))/target[k] for k,i in enumerate((1,3,5))]
        assert all(0<=v<=1 for v in rgba),(ob.name,'cloth pigment exceeds calibrated neutral')
        for vertex in ob.data.color_attributes['COLOR_0'].data:vertex.color=(*rgba,1)
        return ob

    for ob in list(B.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        if pilot['retireCounterLabels'] and ob.name.startswith('G_S_W_SHOP_') and ob.name.endswith(('-label','-sign')):
            B.bpy.data.objects.remove(ob,do_unlink=True);continue
        if any(ob.name.startswith(prefix) for prefix in pilot['retireFinishPrefixes']):
            B.bpy.data.objects.remove(ob,do_unlink=True);continue
        if any(ob.name.startswith(opening+'-louver') for opening in pilot['galleryScreen']['servedOpenings']):
            B.bpy.data.objects.remove(ob,do_unlink=True);continue
        mid=ob.data.materials[0];source=mid.get('bz04SourceMaterial',mid.name)
        if any(key in source for key in ('wood','timber','plank')) and not source.startswith('bz04_teal'):
            wood(ob)
        elif any(key in source for key in ('plaster','beige')):
            parcel=next((p for p in pilot['parcelFinish'] if ob.name.startswith(p+'-')),None)
            family=pilot['parcelFinish'].get(parcel,'plaster')
            if ob.name.startswith(('S_W_SHOP_2','S_W_SHOP_3')):family='sand'
            assign(ob,family)
        elif any(key in source for key in ('sandstone_blocks','dressed_sandstone','service_stone')):
            colors=ob.data.color_attributes.get('COLOR_0') or ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
            for color in colors.data:color.color=(*pilot['stonePigment'],1)
        if ob.name in {opening+'-back' for opening in pilot['galleryScreen']['servedOpenings']}:
            assign(ob,'timber',pilot['galleryScreen']['backingFactor'])
        if '-cloth' in ob.name and ob.name.startswith(('SHADE_','CANOPY_')):
            fixture=next(f for f in A['fixtures'] if ob.name.startswith(f['id']+'-cloth'))
            cloth(ob,pilot['shadeColors'][fixture['id']])
        elif 'soft-mouth' in ob.name or 'rolled-mouth' in ob.name:
            cloth(ob,'#b5a17d')

    # All three shops receive jambs, a joined header, and grain-oriented timber
    # inside their existing recesses. The original opaque chamber remains.
    for g in A['activityGroups']:
        p=B.PARCELS[g['receiverParcel']];o=next(o for o in p['openings'] if o['id']==g['receiverOpening'])
        l=o['alongM']-o['widthM']/2;r=o['alongM']+o['widthM']/2;top=o['headM']
        for a in [l-.055,r-.035]:
            wood(B.part('west',21,'P2-'+g['id']+'-jamb',(a,-.03,.04),(a+.09,.11,top),B.WOOD,'cast',.012))
        wood(B.part('west',21,'P2-'+g['id']+'-lintel',(l-.07,-.025,top-.06),(r+.07,.15,top+.12),B.WOOD,'cast',.012))

    valance=pilot['valance']
    for f in A['fixtures']:
        if f['kind']!='awning':continue
        l,r=f['interval'];out=f['projectionM'];top=f['ledgerZ']-f['dropM'];verts=[];faces=[]
        for i in range(33):
            u=i/32;a=l+(r-l)*u
            for z in [top-.008,top-valance['depthM']-valance['foldM']*math.sin(u*math.pi*5)**2]:
                verts.append(B.coords('west',21,a,out+valance['foldM']*math.sin(u*math.pi*6),z))
        count=len(verts);verts += [(x-valance['thicknessM'],y,z) for x,y,z in verts]
        for i in range(32):
            q=i*2;faces += [(q,q+2,q+3,q+1),(q+count+1,q+count+3,q+count+2,q+count)]
            faces += [(q,q+count,q+count+2,q+2),(q+1,q+3,q+count+3,q+count+1)]
        faces += [(0,1,count+1,count),(64,64+count,65+count,65)]
        ob=B.mesh('P2-'+f['id']+'-valance',verts,faces,f['materialId']);cloth(ob,pilot['shadeColors'][f['id']])
        width=valance['railWidthM'];rail_out=out-valance['foldM']-valance['thicknessM']-width/2-.008
        wood(B.member('P2-'+f['id']+'-front-rail',B.coords('west',21,l,rail_out,top-.06),B.coords('west',21,r,rail_out,top-.06),width,B.WOOD))

    # Lettering is on the front of the shade edge, where approach cameras can
    # see it. Two supported chains also identify the spice shop perpendicular
    # to the street; no sign post occupies the playable ground.
    for fascia in pilot['fascias']:
        f=next(f for f in A['fixtures'] if f['id']==fascia['fixture']);l,r=fascia['interval'];z=f['ledgerZ']-f['dropM']-.25;h=fascia['heightM'];out=f['projectionM']+.04
        wood(B.part('west',21,fascia['id']+'-board',(l,out,z),(r,out+.045,z+h),B.WOOD,'cast',.009))
        B.text(fascia['id']+'-lettering',fascia['text'],'west',21,(l+r)/2,out+.05,z+h*.5,min(r-l-.25,2.8),h*.51)
    sign=pilot['projectingSign'];x,X=sign['xM'];y=sign['yM'];z,Z=sign['zM'];depth=sign['thicknessM'];arm=sign['armHeightM']
    wood(B.box(sign['id']+'-board',(x,y-depth/2,z),(X,y+depth/2,Z),B.WOOD,'cast',.022))
    B.member(sign['id']+'-iron-arm',(20.97,y,arm),(X+.08,y,arm),.042,B.IRON)
    B.member(sign['id']+'-iron-brace',(21,y,arm-.35),(21.57,y,arm),.032,B.IRON)
    for xx in [x+.12,X-.12]:B.member(sign['id']+'-suspension',(xx,y,Z),(xx,y,arm),.012,B.IRON)
    for face,plane in [('north',y-depth/2-.002),('south',y+depth/2+.002)]:
        B.text(sign['id']+'-'+face,sign['text'],face,plane,(x+X)/2,.001,(z+Z)/2,X-x-.14,.15)

    # A single screened workroom frontage has useful depth and real support.
    # It replaces P1's decorative rooftop railing and shades the two existing
    # apertures without adding a room, balcony route or transparent wall.
    screen=pilot['galleryScreen'];l,r=screen['interval'];z,Z=screen['zM'];out=screen['outM'];w=screen['frameM'];mid=(l+r)/2
    for a in [l,mid-w/2,r-w]:
        wood(B.part('west',21,screen['id']+'-post',(a,out-w,z),(a+w,out,Z),B.WOOD,'cast',.008))
    for zz in [z,z+screen['bottomPanelHeightM'],Z-w]:
        wood(B.part('west',21,screen['id']+'-rail',(l,out-w,zz),(r,out,zz+w),B.WOOD,'cast',.008))
    wood(B.part('west',21,screen['id']+'-hood',(l-.09,-.06,Z),(r+.09,out+.17,Z+.14),B.WOOD,'cast',.015))
    for a in [l+.12,mid,r-.12]:
        # Shaped knee, housed into the wall and the lower rail.
        profile=[(z-.32,-.02),(z-.26,.05),(z-.11,out-.15),(z+.05,out-.02),(z+.10,-.02)]
        vertices=[B.coords('west',21,aa,o,h) for aa in [a-.065,a+.065] for h,o in profile]
        n=len(profile);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        wood(B.mesh(screen['id']+'-corbel',vertices,faces,B.WOOD))
    for j,(L,R) in enumerate([(l+w,mid-w/2),(mid+w/2,r-w)]):
        before=set(B.bpy.context.scene.objects)
        B.star_screen(screen['id']+'-B-STAR-side-'+str(j),'west',21,(L,z+w),(R,z+screen['bottomPanelHeightM']),out-w/2,B.WOOD)
        for ob in set(B.bpy.context.scene.objects)-before:assign(ob,'timber')
        for k in range(int((Z-z-screen['bottomPanelHeightM']-2*w)/screen['louverPitchM'])):
            zz=z+screen['bottomPanelHeightM']+w+k*screen['louverPitchM'];h=screen['louverHeightM']
            vertices=[B.coords('west',21,a,o,t) for a in [L,R] for o,t in [(out-.09,zz),(out,zz+h*.55),(out,zz+h),(out-.09,zz+h*.45)]]
            wood(B.mesh(screen['id']+'-louver',vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],B.WOOD))
    for a in [l,r-w]:
        for zz in [z,Z-w]:wood(B.part('west',21,screen['id']+'-wall-tie',(a,-.04,zz),(a+w,out-w,zz+w),B.WOOD,'cast',.006))

    hood=pilot['hood'];opening=next(o for p in B.PARCELS.values() for o in p['openings'] if o['id']==hood['opening'])
    l=opening['alongM']-opening['widthM']/2-hood['sideM'];r=opening['alongM']+opening['widthM']/2+hood['sideM'];z=opening['headM']+.18
    wood(B.part('west',21,'P2-SPICE-UPPER-HOOD',(l,-.025,z),(r,hood['projectionM'],z+hood['heightM']),B.WOOD,'cast',.012))
    for a in [l+.12,r-.12]:wood(B.member('P2-SPICE-UPPER-HOOD-knee',B.coords('west',21,a,0,z-hood['braceDropM']),B.coords('west',21,a,hood['projectionM']-.08,z-.02),.07,B.WOOD))
    finish=pilot['finishPass']
    for ob in list(B.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        if '-cloth' in ob.name and ob.name.startswith(('SHADE_','CANOPY_')):
            # Preserve the membrane and its clearance; sewn panels are pigment,
            # not floating strips or a second coincident surface.
            colors=ob.data.color_attributes['COLOR_0']
            base=tuple(colors.data[0].color)
            ob.data.color_attributes.remove(colors)
            colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','CORNER')
            for polygon in ob.data.polygons:
                center=polygon.center
                along=14-center.y
                seam=abs((along/finish['clothSeamPitchM']+.5)%1-.5)*finish['clothSeamPitchM']
                factor=.75 if seam<finish['clothHemM'] else .96+.04*math.sin(along*2.7)**2
                for index in polygon.loop_indices:colors.data[index].color=tuple(v*factor for v in base[:3])+(1,)
            ob.data.color_attributes.active_color=colors
        if ob.name.startswith('G_S_W_SHOP_') and not any(k in ob.name for k in ('suspension','pestle')):
            ob['bz04Shadow']='cast'

    # Complete the apothecary's working fittings inside the existing chamber.
    # A shallow drawer bank sits under its bottles; dried stock hangs from a
    # supported rail above staff height. Neither enters the protected street.
    g=next(g for g in A['activityGroups'] if g['id']=='G_S_W_SHOP_3')
    opening=next(o for o in B.PARCELS[g['receiverParcel']]['openings'] if o['id']==g['receiverOpening'])
    a=opening['alongM'];prefix='P3-HERBS'
    for row in range(2):
        for col in range(4):
            L=a-1.12+col*.315;Z=.17+row*.23
            wood(B.part('west',21,prefix+'-drawer',(L,-1.84,Z),(L+.299,-1.59,Z+.21),B.WOOD,'cast',.004))
            B.part('west',21,prefix+'-drawer-pull',(L+.126,-1.591,Z+.091),(L+.173,-1.561,Z+.121),B.IRON,'cast',.005)
    rail_z=finish['herbRailZM']
    wood(B.part('west',21,prefix+'-drying-rail',(a+.34,-1.64,rail_z),(a+1.08,-1.6,rail_z+.035),B.WOOD,'cast',.004))
    for L in (a+.36,a+1.05):B.member(prefix+'-rail-bracket',B.coords('west',21,L,-1.89,rail_z+.04),B.coords('west',21,L,-1.6,rail_z+.015),.022,B.IRON)
    for j in range(finish['herbBundleCount']):
        L=a+.41+j*.14;bottom=rail_z-.27-.07*(j%2)
        B.member(prefix+'-tie',B.coords('west',21,L,-1.61,rail_z),B.coords('west',21,L,-1.61,bottom+.08),.008,B.WOOD)
        for k in range(7):
            theta=k*math.tau/7;u=.03*math.cos(theta);v=.022*math.sin(theta)
            ob=turned(prefix+'-dried-leaves','west',21,(L+u-.026,-1.64+v,bottom),(L+u+.026,-1.585+v,bottom+.17),
                'bz04_ceramic_project_original',[(0,0),(.65,.1),(1,.32),(.63,.68),(0,1)],['#777954','#8b8256','#6a7454'][j%3],True)
            ob['bz04Shadow']='cast'
    # Handwritten stock tabs attach to the existing shelves, not the wall.
    for z in (.84,1.29,1.69):
        for j,label in enumerate(('MINT','SAGE','TEA')):
            L=a-1.0+j*.46
            ob=B.part('west',21,prefix+'-stock-tab',(L,-1.675,z-.06),(L+.23,-1.663,z+.005),'ph_bz04_hessian_230','receive',.001)
            cloth(ob,'#c4b58f')
            B.text(prefix+'-stock-label',label,'west',21,L+.115,-1.66,z-.027,.18,.028)

    # Reuse the installed textured sack at two uniform scales. Keep its UVs,
    # cloth profile and grain surface; the original counter bears both loads.
    from mathutils import Matrix
    props=ROOT/'apps/client/public/assets/models/environment/bazaar/props'
    stock=pilot['grainStock'];model=next(m for m in json.loads((props/'models.json').read_text())['models'] if m['id']==stock['model'])
    assert model['license']=='CC0-1.0'
    for relative,digest in model['md5'].items():
        source=(props/relative).resolve();assert source.is_relative_to(props.resolve())
        assert hashlib.md5(source.read_bytes()).hexdigest()==digest,('changed grain stock source',relative)
    group=next(g for g in A['activityGroups'] if g['id']=='G_S_W_SHOP_2')
    op=next(o for o in B.PARCELS[group['receiverParcel']]['openings'] if o['id']==group['receiverOpening'])
    for pid in stock['parts']:
        item=next(p for p in group['instanceLayout']['parts'] if p['id']==pid);prefix=group['id']+'-'+pid
        for ob in list(B.bpy.context.scene.objects):
            if ob.name.startswith(prefix):B.bpy.data.objects.remove(ob,do_unlink=True)
        before=set(B.bpy.context.scene.objects);B.bpy.ops.import_scene.gltf(filepath=str(props/model['url']))
        imported=set(B.bpy.context.scene.objects)-before;objects=sorted((o for o in imported if o.type=='MESH'),key=lambda o:o.name)
        assert objects,model['id']
        matrices={o:o.matrix_world.copy() for o in objects};points=[matrices[o]@v.co for o in objects for v in o.data.vertices]
        low=[min(p[i] for p in points) for i in range(3)];high=[max(p[i] for p in points) for i in range(3)]
        bounds=item['localBox'];size=[bounds['max'][i]-bounds['min'][i] for i in range(3)];scale=min(size[i]/(high[i]-low[i]) for i in range(3))
        for index,ob in enumerate(objects):
            for v in ob.data.vertices:
                point=matrices[ob]@v.co
                along=op['alongM']+sum(bounds[k][0] for k in ('min','max'))/2+(point.x-(low[0]+high[0])/2)*scale
                out=sum(bounds[k][1] for k in ('min','max'))/2+(point.y-(low[1]+high[1])/2)*scale
                z=group['bbox']['min'][2]+bounds['min'][2]+(point.z-low[2])*scale
                v.co=B.local(B.coords('west',21,along,out,z))
            ob.parent=None;ob.matrix_world=Matrix.Identity(4);ob.name=prefix+'-asset-'+str(index);ob['bz04Part']=prefix;ob['bz04Shadow']='cast'
            ob['sourceModelId']=model['id'];ob['sourceFilesMd5']=json.dumps(model['md5'],sort_keys=True);ob['sourceLicense']=model['license']
            for material in ob.data.materials:
                material.name='bz07_grain_'+material.name;material['sourceModelId']=model['id'];material['sourceLicense']=model['license']
        for ob in imported-set(objects):B.bpy.data.objects.remove(ob,do_unlink=True)

    # Deep articulated stonework replaces the thin drawn outline at the bulk
    # store. The original reveal and continuous backing remain behind the joints.
    portal=next(o for o in B.PARCELS['S_E_MID']['openings'] if o['id']==finish['portalOpening'])
    top=B.arch_points(portal);outer=B.offset_top(top,portal['trimWidthM']);front=portal['frontProjectionM']
    for i,(p,q) in enumerate(zip(top,top[1:])):
        P,Q=outer[i],outer[i+1];gap=.025
        mix=lambda a,b,t:tuple(a[k]+(b[k]-a[k])*t for k in range(2))
        shape=[mix(p,q,gap),mix(p,q,1-gap),mix(P,Q,1-gap),mix(P,Q,gap)]
        ob=B.prism_profile('P3-bulk-voussoir','east',33,shape,front+.001,front+.025,portal['surroundMaterialId'])
        bevel=ob.modifiers.new('Hand dressed stone edge','BEVEL');bevel.width=.008;bevel.segments=2
        paint(ob,['#c4b89f','#cbbc9f','#bdae90'][i%3])
    spring=top[0][1];n=6;l=portal['alongM']-portal['widthM']/2;r=portal['alongM']+portal['widthM']/2;w=portal['trimWidthM']
    for L,R in [(l-w,l),(r,r+w)]:
        for i in range(n):
            ob=B.part('east',33,'P3-bulk-jamb-stone',(L,front+.001,i*spring/n+.009),(R,front+.025,(i+1)*spring/n-.009),portal['surroundMaterialId'],'cast',.009)
            paint(ob,['#c4b89f','#bdae90','#cbbc9f'][(i+int(L))%3])

    # The warehouse loading hatch now has a plausible means of lifting sacks.
    jib=finish['warehouseHoist'];a=jib['alongM'];plane=jib['planeM'];top=jib['armZM'];out=jib['projectionM']
    wood(B.part('east',plane,'P3-warehouse-jib-seat',(a-.105,-.035,jib['seatZM']),(a+.105,.13,top+.12),B.WOOD,'cast',.018))
    wood(B.member('P3-warehouse-jib-arm',B.coords('east',plane,a,0,top),B.coords('east',plane,a,out,top),.12,B.WOOD))
    wood(B.member('P3-warehouse-jib-knee',B.coords('east',plane,a,.08,jib['seatZM']+.08),B.coords('east',plane,a,out-.1,top-.035),.085,B.WOOD))
    for z in [jib['seatZM']+.1,top-.15]:B.part('east',plane,'P3-warehouse-strap',(a-.125,.12,z),(a+.125,.142,z+.055),B.IRON,'cast',.005)
    B.ring('P3-warehouse-pulley','east',plane,a,out-.07,top-.19,.095,B.IRON)
    for along,drop in [(a-.08,2.95),(a+.08,6.18)]:
        ob=B.member('P3-warehouse-rope',B.coords('east',plane,along,out-.07,top-.19),B.coords('east',plane,along,.07,drop),.016,'ph_bz04_hessian_230')
        cloth(ob,'#a59876')
    B.part('east',plane,'P3-warehouse-cleat',(a-.17,.03,2.91),(a+.17,.115,2.955),B.IRON,'cast',.012)

    repair=finish['redRepair'];L,R=repair['interval'];z,Z=repair['zM']
    profile=[(L,z),(R,z),(R,Z-.31),(R-.13,Z-.30),(R-.19,Z-.16),(L+.45,Z-.12),(L+.35,Z),(L+.15,Z-.035),(L,Z-.18)]
    ob=B.prism_profile('P3-red-lime-repair','west',21,profile,.001,.008,B.PARCELS['S_W_MID']['materialId'],'receive')
    assign(ob,'sand',.82)

    B.bpy.context.scene['spiceArtDirectionPilot']=pilot['id']
    print('SPICE-P3: differentiated joinery, worked shop fittings, sewn canvas and contact depth',flush=True)


def pilot_self_test():
    """Check P2 assemblies, UV direction, private material identity and clear space."""
    construction(export=False)
    pilot=A.get('artDirectionPilot')
    if not pilot:return
    objects=[o for o in B.bpy.context.scene.objects if o.type=='MESH']
    for prefix in [f['id']+'-board' for f in pilot['fascias']]+[pilot['galleryScreen']['id']+'-post',pilot['projectingSign']['id']+'-board']:
        assert any(o.name.startswith(prefix) for o in objects),('missing pilot assembly',prefix)
    assert not any(any(o.name.startswith(p) for p in pilot['retireFinishPrefixes']) for o in objects)
    for ob in objects:
        B.prepare_mesh(ob)
        if ob.name.startswith('P2-') and not '-G_S_W_SHOP_' in ob.name:
            assert min(v.co.z for v in ob.data.vertices)>2.2,(ob.name,'new assembly below player clearance')
        assert all(all(math.isfinite(c) for c in v.co) for v in ob.data.vertices),ob.name
    for f in A['fixtures']:
        if f['kind']!='awning':continue
        cloth=next(o for o in objects if o.name=='P2-'+f['id']+'-valance')
        rail=next(o for o in objects if o.name=='P2-'+f['id']+'-front-rail')
        assert max(v.co.x for v in rail.data.vertices)<min(v.co.x for v in cloth.data.vertices),(f['id'],'rail pierces cloth')
    for g in A['activityGroups']:
        head=next(o for o in objects if o.name==g['receiverOpening']+'-head')
        ceiling=next(o for o in objects if o.name==g['receiverOpening']+'-chamber-ceiling')
        assert max(v.co.x for v in ceiling.data.vertices)<=min(v.co.x for v in head.data.vertices)+1e-6,(g['id'],'coplanar head/ceiling overlap')
    board=next(o for o in objects if 'counter-panel-board' in o.name)
    assert board.data.materials[0].name in {'bz07_spice_timber','bz07_spice_painted_timber'}
    assert board.data.materials[0]['bz07SourceMaterial']=='ph_dark_wood'
    # On the front of a vertical panel, U must vary with height, not width.
    poly=next(p for p in board.data.polygons if abs(p.normal.x)>.99)
    pairs=[(board.data.vertices[board.data.loops[i].vertex_index].co.z,board.data.uv_layers.active.data[i].uv.x) for i in poly.loop_indices]
    assert all(abs((a[0]-b[0])/1.8-(a[1]-b[1]))<1e-5 for a in pairs for b in pairs)
    # At mid-panel height, the front must be closed except for the authored
    # 2 mm board seams. This catches panels ending short of their frame stiles.
    for g in A['activityGroups']:
        item=next(p for p in g['instanceLayout']['parts'] if p['kind']=='grounded-counter-carcass')
        opening=next(o for o in B.PARCELS[g['receiverParcel']]['openings'] if o['id']==g['receiverOpening'])
        low,high=item['localBox']['min'],item['localBox']['max'];height=g['bbox']['min'][2]+.45
        cursor=opening['alongM']+low[0]+.025;end=opening['alongM']+high[0]-.025;intervals=[]
        for ob in objects:
            if not ob.name.startswith(g['id']+'-counter-'):continue
            if max(v.co.x for v in ob.data.vertices)<high[1]-.16:continue
            if not min(v.co.z for v in ob.data.vertices)<=height<=max(v.co.z for v in ob.data.vertices):continue
            along=[14-v.co.y for v in ob.data.vertices];intervals.append((min(along),max(along)))
        for left,right in sorted(intervals):
            if right<=cursor:continue
            assert left-cursor<=.0021,(g['id'],'unbacked panel gap',left-cursor)
            cursor=max(cursor,right)
        assert cursor>=end-.001,(g['id'],'open end joint')
    grain=next(g for g in A['activityGroups'] if g['id']=='G_S_W_SHOP_2')
    extents=[]
    for pid in A['artDirectionPilot']['grainStock']['parts']+['grain-scoop']:
        item=next(p for p in grain['instanceLayout']['parts'] if p['id']==pid);prefix=grain['id']+'-'+pid
        selected=[ob for ob in objects if ob.name.startswith(prefix)];assert selected,prefix
        vertices=[(14-v.co.y-23,v.co.x,v.co.z-.04) for ob in selected for v in ob.data.vertices]
        low=[min(v[i] for v in vertices) for i in range(3)];high=[max(v[i] for v in vertices) for i in range(3)]
        assert all(item['localBox']['min'][i]-.001<=low[i]<=high[i]<=item['localBox']['max'][i]+.001 for i in range(3)),(pid,low,high)
        assert abs(low[2]-.9)<1e-5,(pid,'not seated on countertop',low[2])
        assert low[1]>=-.55 and high[1]<=.15,(pid,'leaves countertop or enters staff strip')
        if pid!='grain-scoop':
            assert all(ob.get('sourceModelId')=='cc0_spice_sack' and ob.data.uv_layers.active is not None for ob in selected)
            extents.append((low,high))
    assert extents[1][0][0]-extents[0][1][0]>.1,'grain sacks intersect'
    assert extents[0][1][2]-extents[1][1][2]>.05,'grain stock lost its varied height'
    print('PASS grain stock: licensed UV assets, exact part bounds, countertop contact, separated varied sacks and supported scoop',flush=True)
    print('PASS SPICE-P2 material/UV provenance, lattice area, panel coverage, soffit ownership, required assemblies, finite geometry and cloth/rail clearance',flush=True)


def construction(export=True):
    if export and A['zone']=='SPICE_STREET' and (not SOUTH_RECEIVERS or not SPAWN_A_RECEIVERS):raise ValueError('Spice export requires --receiver-handoff and --spawn-a-handoff for its approved end interfaces')
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
    art_direction_pilot()
    if export:
        budget_check()
        # Bake after cleanup and preserve that sampling topology through export.
        # The shared exporter remains unchanged for every other area.
        spec=importlib.util.spec_from_file_location('spice_contact',OUT/'materials.py')
        material_tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(material_tools)
        prepare=B.prepare_mesh
        for ob in B.bpy.context.scene.objects:
            if ob.type=='MESH':prepare(ob)
        finish=A['artDirectionPilot']['finishPass']
        material_tools.bake_contact_occlusion(B.__dict__,finish['contactRadiusM'],finish['contactStrength'])
        B.prepare_mesh=lambda ob:None
        try:
            B.export(OUT/(UNIT+'.glb'),A['exportBoundsGltfLocal'],A['budget']['maxTriangles'],A['budget']['maxRenderedPrimitives'],
                {'bz04InputSha256':H['inputSha256'],'bz04Unit':UNIT,'bz04SouthReceiverInputSha256':RECEIVER_INPUT_SHA,'bz04SpawnAReceiverInputSha256':SPAWN_A_INPUT_SHA})
        finally:B.prepare_mesh=prepare


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
    fixture=next(f for f in A['fixtures'] if f['kind']=='canopy')
    for ob in B.bpy.context.scene.objects:
        assert min(v.co.z for v in ob.data.vertices)>=fixture['bbox']['min'][2]-.001,ob.name
    print('PASS Spice fixtures: all 12 craft kinds fit their exact boxes; canopy sag/closed thickness/receivers',flush=True)


if __name__=='__main__':
    try:
        if '--handoff' not in sys.argv:raise ValueError('Requires --handoff <frozen handoff.json>')
        saved=inputs(sys.argv[sys.argv.index('--handoff')+1])
        if 'check-inputs' in sys.argv:print('PASS Spice frozen input and capability validation')
        else:
            configure(saved)
            if 'self-test' in sys.argv:
                self_test()
                pilot_self_test()
            else:construction()
    except Exception:
        import traceback
        traceback.print_exc();sys.exit(1)
