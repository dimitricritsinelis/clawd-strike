"""Frozen R7 Textile Arcade: complete production, display and dispatch craft."""
from pathlib import Path
import argparse
import copy
import importlib.util
import json
import math
import runpy
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
UNIT = 'unit-textile-arcade'
spec = importlib.util.spec_from_file_location('bz04_spawn_a', ROOT/'assets/source/unit-spawn-a-courtyard/build.py')
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
G = None
KINDS = {'bound-folded-textile','bound-hanging-rug','folded-cloth','framed-timber-trestle',
         'grounded-counter-carcass','grounded-plank-chest','hanging-cloth','horizontal-rolled-rug',
         'locked-timber-lattice-gate','plank-worktop','rolled-textile','taut-woven-panel',
         'timber-apron','timber-member','timber-roller','woven-basket'}


def validate(saved):
    if saved.get('unit') != UNIT or len(saved.get('areas', [])) != 1:
        raise ValueError('Expected Textile Arcade frozen unit')
    if S.digest(saved) != saved.get('inputSha256'):
        raise ValueError('Frozen handoff contents do not match inputSha256')
    current = runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if current['inputSha256'] != saved['inputSha256']:
        raise ValueError('Area inputs changed since handoff extraction')
    area = saved['areas'][0]
    assert area['zone'] == 'TEXTILE_ARCADE' and area['designRevision']['id'].startswith('R7')
    caps = saved['requiredCapabilities']
    assert set(caps['openingProfiles']) <= {'pointed','rectangular'}
    assert not caps['openingCraftProfiles']
    assert not caps['featureKinds'] and not caps['landscapeKinds'] and not caps['glazingPatterns']
    assert set(caps['partKinds']) <= KINDS, ('unsupported part kinds',set(caps['partKinds'])-KINDS)
    assert all(f['kind'] == 'canopy' for f in area['fixtures'])
    return area


def setup(saved):
    global G
    G = S.geometry(saved)
    G.OUT = OUT
    origin = G.A['sectionOriginDesign']
    G.reset(tuple(origin[k] for k in ('x','y','z')))


def opening(face, plane, o, trim, back):
    if 'archRingM' in o and 'trimWidthM' not in o:
        o = dict(o, trimWidthM=o['archRingM'])
    if o.get('finishMaterialProfile') == 'warmTimber':
        o = dict(o, closureMaterialId=G.WOOD)
    if o['kind'] != 'shop':
        return G.opening(face, plane, o, trim, back)
    if o['headShape'] == 'rectangular':
        G.opening(face,plane,o,trim,back)
        # The front header owns only the authored 280 mm mouth; the plaster
        # ceiling closes the chamber behind it, without coplanar undersides.
        assert face in {'east','west'}
        cavity=o['shopfront']['cavity'];join=G.local(G.coords(face,plane,0,cavity['chamberFromOutM'],0))[0]
        ceiling=G.bpy.data.objects[o['id']+'-chamber-ceiling'];head=G.bpy.data.objects[o['id']+'-head']
        for vertex in ceiling.data.vertices:
            if face=='east' and vertex.co.x<join or face=='west' and vertex.co.x>join:vertex.co.x=join
        for vertex in head.data.vertices:
            if face=='east' and vertex.co.x>join or face=='west' and vertex.co.x<join:vertex.co.x=join
        from mathutils import Vector
        for ob in (ceiling,head):ob.data.update();G.prepare_mesh(ob)
        for out,expected in [(cavity['chamberFromOutM']-.1,ceiling),(cavity['chamberFromOutM']/2,head)]:
            start=Vector(G.local(G.coords(face,plane,o['alongM'],out,o['headM']-.2)));hits=[]
            for ob in (ceiling,head):
                hit,point,normal,index=ob.ray_cast(start,Vector((0,0,1)),distance=.4)
                if hit:hits.append((ob,point.z))
            assert len(hits)==1 and hits[0][0]==expected and abs(hits[0][1]-o['headM'])<1e-5,('Overlapping or missing rectangular shop soffit',o['id'],out,hits)
        print('PASS rectangular shop soffit: one intended ceiling on each side of the authored join',o['id'],flush=True)
        return
    # Preserve the rectangular staff chamber and its actual side door behind
    # the specified 0.28 m shaped barrel, not an extruded arch through the stock.
    chamber = copy.deepcopy(o)
    chamber['headShape'] = 'rectangular'
    chamber['frontProjectionM'] = -o['shopfront']['cavity']['frontBarrelDepthM']
    G.opening(face, plane, chamber, trim, back)
    # The rectangular chamber ends behind the shaped front barrel. Its
    # ceiling must not emit a coplanar plaster strip through the spandrel.
    ceiling_object=G.bpy.data.objects.get(o['id']+'-chamber-ceiling')
    assert ceiling_object is not None
    G.bpy.data.objects.remove(ceiling_object,do_unlink=True)
    G.part(face,plane,o['id']+'-chamber-ceiling',
           (o['alongM']-o['widthM']/2,-o['depthM'],o['headM']),
           (o['alongM']+o['widthM']/2,chamber['frontProjectionM'],o['headM']+.02),back)
    top = G.arch_points(o)
    width = o.get('trimWidthM', .1)
    outer = G.offset_top(top, width)
    front = o.get('frontProjectionM',0)
    reveal = o.get('revealMaterialId',trim)
    trim = o.get('surroundMaterialId',trim)
    barrel = o['shopfront']['cavity']['frontBarrelDepthM']
    ceiling = o['headM']+width+.02
    parcel=next(p for f in G.A['faces'] for p in f['parcels'] if any(item['id']==o['id'] for item in p['openings']))
    def field_material(poly):
        region=next((r for r in parcel['materialRegions'] if all(r['alongM'][0]-1e-8<=a<=r['alongM'][1]+1e-8 and r['zM'][0]-1e-8<=z<=r['zM'][1]+1e-8 for a,z in poly)),None)
        assert region is not None,'Spandrel crosses a scheduled material boundary'
        return region['materialId']
    for i,(p,q) in enumerate(zip(top,top[1:])):
        P,Q = outer[i],outer[i+1]
        G.prism_profile(o['id']+'-arch-ring',face,plane,[p,q,Q,P],-.02,front,trim)
        fill=[P,Q,(Q[0],ceiling),(P[0],ceiling)]
        G.prism_profile(o['id']+'-spandrel',face,plane,fill,-.02,0,field_material(fill))
        winding=(2,3,1,0) if face in {'east','south'} else (0,1,3,2)
        ob=G.mesh(o['id']+'-front-barrel',[G.coords(face,plane,x,out,z) for out in [-barrel,0] for x,z in [p,q]],[winding],reveal)
        ob['bz04PreserveWinding']=True
    l,r = top[0][0],top[-1][0]
    for L,H in [(l-width,l),(r,r+width)]:
        G.part(face,plane,o['id']+'-arch-jamb',(L,-barrel,o['sillM']),(H,front,top[0][1]),reveal)
    for edge, limit in [(outer[0],l-width),(outer[-1],r+width)]:
        x,X = sorted([edge[0],limit])
        if X-x > 1e-7:
            G.part(face,plane,o['id']+'-arch-shoulder',(x,-.02,edge[1]),(X,0,ceiling),field_material([(x,edge[1]),(X,ceiling)]))
    S.close_arch_shoulders(face,plane,o,trim)


def roll(name, face, plane, lo, hi, mid, upright=False, spiral=False, phase=(0,0)):
    count = 32
    if upright:
        c = [(lo[0]+hi[0])/2,(lo[1]+hi[1])/2]
        point = lambda t,a: G.coords(face,plane,c[0]+(hi[0]-lo[0])/2*math.cos(a),c[1]+(hi[1]-lo[1])/2*math.sin(a),lo[2]+(hi[2]-lo[2])*t)
        length, circumference = hi[2]-lo[2],math.pi*(hi[0]-lo[0])
    else:
        c = [(lo[1]+hi[1])/2,(lo[2]+hi[2])/2]
        point = lambda t,a: G.coords(face,plane,lo[0]+(hi[0]-lo[0])*t,c[0]+(hi[1]-lo[1])/2*math.cos(a),c[1]+(hi[2]-lo[2])/2*math.sin(a))
        length, circumference = hi[0]-lo[0],math.pi*(hi[1]-lo[1])
    verts = [point(t,i*math.tau/count) for t in (0,1) for i in range(count)]
    faces = [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    inset = min(.001/max(length,1e-6),.05)
    verts += [point(t,i*math.tau/count) for t in (inset,1-inset) for i in range(count)]
    faces += [tuple(reversed(range(count*2,count*3))),tuple(range(count*3,count*4))]
    ob = G.mesh(name,verts,faces,mid,'receive',True)
    repeat = 1.2 if mid == 'bz04_levantine_rug_project_original' else float(G.mat(mid).get('tileSizeM',1.2))
    for loop in ob.data.loops:
        idx = loop.vertex_index
        end = (idx//count)%2
        ob.data.uv_layers.active.data[loop.index].uv = (length*end/repeat+phase[0],circumference*(idx%count)/count/repeat+phase[1])
    if spiral:
        for end in (0,1):
            verts=[];faces=[]
            for i in range(65):
                t=i/64;angle=t*math.pi*6;r=.09+.84*t
                for delta in (-.01,.01):
                    radius=r+delta
                    if upright:
                        p = G.coords(face,plane,c[0]+(hi[0]-lo[0])/2*radius*math.cos(angle),c[1]+(hi[1]-lo[1])/2*radius*math.sin(angle),lo[2]+(hi[2]-lo[2])*end)
                    else:
                        p = G.coords(face,plane,lo[0]+(hi[0]-lo[0])*end,c[0]+(hi[1]-lo[1])/2*radius*math.cos(angle),c[1]+(hi[2]-lo[2])/2*radius*math.sin(angle))
                    verts.append(p)
            for i in range(64):
                q=i*2;faces.extend([(q,q+1,q+3,q+2),(q+2,q+3,q+1,q)])
            edge=G.mesh(name+'-rolled-edge',verts,faces,'ph_bz04_hessian_230','receive')
            G.paint_object(edge,'#596778',True)


def basket(name,face,plane,lo,hi,mid):
    cx,cy=(lo[0]+hi[0])/2,(lo[1]+hi[1])/2
    rx,ry=(hi[0]-lo[0])/2,(hi[1]-lo[1])/2
    points=[(.72,lo[2]),(1,hi[2]-.025),(1,hi[2]),(.90,hi[2]),(.89,hi[2]-.025),(.64,lo[2]+.025)]
    verts=[G.coords(face,plane,cx+rx*r*math.cos(i*math.tau/24),cy+ry*r*math.sin(i*math.tau/24),z) for r,z in points for i in range(24)]
    faces=[(j*24+i,j*24+(i+1)%24,(j+1)*24+(i+1)%24,(j+1)*24+i) for j in range(len(points)-1) for i in range(24)]
    faces += [tuple(reversed(range(24))),tuple(range(120,144))]
    G.mesh(name,verts,faces,mid,'receive',True)
    for i in range(12):
        angle=i*math.tau/12
        G.member(name+'-rib',G.coords(face,plane,cx+rx*.72*math.cos(angle),cy+ry*.72*math.sin(angle),lo[2]+.01),
                 G.coords(face,plane,cx+(rx-.008)*math.cos(angle),cy+(ry-.008)*math.sin(angle),hi[2]-.025),.012,mid,'receive')
    for z in [lo[2]+.07,(lo[2]+hi[2])/2,hi[2]-.04]:
        r=.72+.28*(z-lo[2])/(hi[2]-lo[2])
        verts=[G.coords(face,plane,cx+(rx*r-.003)*math.cos(i*math.tau/24),cy+(ry*r-.003)*math.sin(i*math.tau/24),Z) for Z in [z-.006,z+.006] for i in range(24)]
        G.mesh(name+'-hoop',verts,[(i,(i+1)%24,(i+1)%24+24,i+24) for i in range(24)],mid,'receive',True)
    # The single sample shuttle is contained by the basket, never added as floor stock.
    G.part(face,plane,name+'-shuttle',(cx-.18,cy-.035,lo[2]+.035),(cx+.18,cy+.035,lo[2]+.065),G.WOOD,'receive',.003)


def activity(group):
    face=group['receiverFace'];plane=next(f['wallPlaneM'] for f in G.A['faces'] if f['face']==face)
    op=next(o for o in G.PARCELS[group['receiverParcel']]['openings'] if o['id']==group['receiverOpening'])
    along=op['alongM'];deck=group['bbox']['min'][2]
    for item in group['instanceLayout']['parts']:
        kind=item['kind'];mid=item['materialId'];name=group['id']+'-'+item['id']
        lo=[item['localBox']['min'][0]+along,item['localBox']['min'][1],item['localBox']['min'][2]+deck]
        hi=[item['localBox']['max'][0]+along,item['localBox']['max'][1],item['localBox']['max'][2]+deck]
        one=dict(group,instanceLayout={'parts':[item]});one.pop('sign',None)
        if kind=='grounded-counter-carcass':
            x,y,z=lo;X,Y,Z=hi;rail=.065
            def part(suffix,low,high):return G.part(face,plane,name+suffix,low,high,mid,'cast',.006)
            for j in range(3):part('-top-board',(x,y+j*(Y-y)/3+.002,Z-.05),(X,y+(j+1)*(Y-y)/3-.002,Z))
            for a in (x+.02,X-rail-.02):
                for out in (y+.02,Y-rail-.01):part('-leg',(a,out,z),(a+rail,out+rail,Z-.05))
            for level in (z+.09,Z-.14):part('-front-rail',(x,Y-.065,level),(X,Y-.01,level+rail))
            for j in range(3):
                left=x+.07+j*(X-x-.14)/3;right=x+.07+(j+1)*(X-x-.14)/3
                part('-panel',(left,Y-.08,z+.15),(right,Y-.035,Z-.14))
                if j:part('-stile',(left-.032,Y-.065,z+.09),(left+.032,Y-.01,Z-.05))
            for a in (x+.02,X-.045):part('-side',(a,y+.085,z+.15),(a+.025,Y-.095,Z-.14))
        elif kind=='grounded-plank-chest':
            G.activity(one)
        elif kind in {'timber-member','locked-timber-lattice-gate','folded-cloth'}:
            S.activity(one)
        elif kind=='framed-timber-trestle':
            copy_item=dict(item,kind='framed-timber-end')
            S.activity(dict(one,instanceLayout={'parts':[copy_item]}))
        elif kind in {'plank-worktop','timber-apron'}:
            G.part(face,plane,name,lo,hi,mid,'receive',.003)
        elif kind in {'rolled-textile','horizontal-rolled-rug','timber-roller'}:
            roll(name,face,plane,lo,hi,mid,kind=='rolled-textile',kind!='timber-roller',item.get('uvOriginM',(0,0)))
        elif kind in {'bound-hanging-rug','hanging-cloth'}:
            G.hanging_rug(name,face,plane,lo,hi,mid,item.get('uvOriginM',(0,0)))
            for x in [lo[0]+.03,hi[0]-.03]:
                target_out,target_z=(-1.77,deck+2.4) if kind=='bound-hanging-rug' else (-1.9,hi[2])
                G.member(group['id']+'-attachment-'+item['id'],G.coords(face,plane,x,(lo[1]+hi[1])/2,hi[2]-.005),G.coords(face,plane,x,target_out,target_z),.01,G.WOOD,'receive')
        elif kind=='bound-folded-textile':
            S.soft_cloth(name,face,plane,lo,hi,mid,True)
            for x in [lo[0]+.12,hi[0]-.12]:
                for L,H in [((x,lo[1],lo[2]),(x+.018,lo[1]+.008,hi[2])),((x,hi[1]-.008,lo[2]),(x+.018,hi[1],hi[2])),((x,lo[1],hi[2]-.008),(x+.018,hi[1],hi[2]))]:
                    G.part(face,plane,name+'-binding',L,H,'ph_bz04_hessian_230','receive')
        elif kind=='woven-basket':
            basket(name,face,plane,lo,hi,mid)
        elif kind=='taut-woven-panel':
            working=lo[2]+(hi[2]-lo[2])*item['wovenFraction']
            G.cloth_path(name,face,plane,lo[0],hi[0],[((lo[1]+hi[1])/2,working),((lo[1]+hi[1])/2,lo[2])],mid,border=.025,fringe=0)
            for i in range(item['warpCount']):
                x=lo[0]+.008+(hi[0]-lo[0]-.016)*i/(item['warpCount']-1)
                G.member(name+'-warp',G.coords(face,plane,x,(lo[1]+hi[1])/2,working),G.coords(face,plane,x,(lo[1]+hi[1])/2,hi[2]-.004),.008,'ph_bz04_hessian_230','receive')
            for x in [lo[0]+.03,hi[0]-.03]:
                G.member(group['id']+'-attachment-weft-head',G.coords(face,plane,x,(lo[1]+hi[1])/2,hi[2]-.004),G.coords(face,plane,x,-.445,deck+2.31),.008,G.WOOD,'receive')
        else:
            raise ValueError(f'Unsupported textile part {kind}')
    # Shared sign recipe operates independently of the part list.
    S.activity(dict(group,instanceLayout={'parts':[]}))


def canopy(fixture):
    x,y,z=fixture['endA'];X,Y,Z=fixture['endB'];width=fixture['widthM'];hem=.025
    def patch(name,rectangles,top_inset):
        vertices=[];faces=[]
        for left,right,low,high in rectangles:
            segments=24 if right-left>hem+.001 else 1;offset=len(vertices);row=segments+1
            for layer in (0,1):
                for along_y in (low,high):
                    for i in range(row):
                        along_x=left+(right-left)*i/segments;u=(along_x-x)/(X-x)
                        height=z+(Z-z)*u-fixture['sagM']*math.sin(math.pi*u)
                        vertices.append((along_x,along_y,height-(.008 if layer else top_inset)))
            for i in range(segments):
                faces.extend([(offset+i,offset+i+1,offset+row+i+1,offset+row+i),
                              (offset+2*row+i,offset+3*row+i,offset+3*row+i+1,offset+2*row+i+1)])
            boundary=list(range(row))+list(range(2*row-1,row-1,-1))
            faces.extend(tuple(offset+j for j in (a,b,b+2*row,a+2*row)) for a,b in zip(boundary,boundary[1:]+boundary[:1]))
        ob=G.mesh(fixture['id']+'-'+name,vertices,faces,fixture['materialId'])
        G.paint_object(ob,fixture['stockColorSrgb'],True)
        return ob
    low,high=y-width/2,y+width/2
    # The bound edge replaces the perimeter of the sheet. Its 1 mm raised
    # seam stays within the existing 8 mm membrane envelope, without overlays.
    patch('cloth',[(x+hem,X-hem,low+hem,high-hem)],.001)
    patch('bound-hem',[(x,X,low,low+hem),(x,X,high-hem,high),
                       (x,x+hem,low+hem,high-hem),(X-hem,X,low+hem,high-hem)],0)
    for index,part in enumerate(p for p in fixture['assemblyParts'] if p['id'].startswith('endpoint-ledger')):
        lo,hi=part['bbox']['min'],part['bbox']['max']
        G.box(fixture['id']+'-'+part['id'],lo,hi,G.WOOD)
        inward=1 if index==0 else -1;cx=(hi[0] if inward==1 else lo[0])+inward*.01
        for eye,cy in enumerate((lo[1]+.20,hi[1]-.20)):
            vertices=[];faces=[];cz=(lo[2]+hi[2])/2
            for i in range(24):
                angle=i*math.tau/24
                for j in range(8):
                    tube=j*math.tau/8;radius=.0145+.003*math.cos(tube)
                    vertices.append((cx+radius*math.cos(angle),cy+.003*math.sin(tube),cz+radius*math.sin(angle)))
            for i in range(24):
                for j in range(8):
                    faces.append((i*8+j,((i+1)%24)*8+j,((i+1)%24)*8+(j+1)%8,i*8+(j+1)%8))
            G.mesh(fixture['id']+'-'+part['id']+'-eye-'+str(eye+1),vertices,faces,G.IRON,'receive',True)


def craft_fixture(area):
    """Exercise the finished hollow basket, supported cloth and opening finish."""
    from mathutils import Vector
    group=next(g for g in area['activityGroups'] if g['id']=='G_T_E_ARCH3')
    item=next(p for p in group['instanceLayout']['parts'] if p['kind']=='woven-basket')
    body=G.bpy.data.objects[group['id']+'-'+item['id']]
    op=next(o for p in G.A['faces'] for q in p['parcels'] for o in q['openings'] if o['id']==group['receiverOpening'])
    box=item['localBox'];along=op['alongM']+(box['min'][0]+box['max'][0])/2
    out=(box['min'][1]+box['max'][1])/2;bottom=group['bbox']['min'][2]+box['min'][2]
    top=group['bbox']['min'][2]+box['max'][2]
    plane=next(f['wallPlaneM'] for f in area['faces'] if f['face']==group['receiverFace'])
    start=Vector(G.local(G.coords(group['receiverFace'],plane,along,out,top+.05)))
    hit,point,normal,index=body.ray_cast(start,Vector((0,0,-1)),distance=1)
    assert hit and abs(point.z-(bottom+.025))<1e-5,'Basket mouth is not open to its inner base'
    assert sum(o.name.startswith(body.name+'-rib') for o in G.bpy.context.scene.objects)==12
    assert sum(o.name.startswith(body.name+'-hoop') for o in G.bpy.context.scene.objects)==3
    for fixture in area['fixtures']:
        cloth=G.bpy.data.objects[fixture['id']+'-cloth']
        for vertex in cloth.data.vertices:
            world=(vertex.co.x+G.ORIGIN[0],G.ORIGIN[1]-vertex.co.y,vertex.co.z+G.ORIGIN[2])
            assert all(fixture['clothBbox']['min'][i]-1e-5<=world[i]<=fixture['clothBbox']['max'][i]+1e-5 for i in range(3))
        assert abs(min(v.co.z for v in cloth.data.vertices)-(fixture['endA'][2]-fixture['sagM']-.008))<1e-5
        assert all(G.bpy.data.objects.get(fixture['id']+'-'+p['id']) for p in fixture['assemblyParts'] if p['id'].startswith('endpoint-ledger'))
        hem=G.bpy.data.objects[fixture['id']+'-bound-hem'];box=fixture['clothBbox']
        for vertex in hem.data.vertices:
            world=(vertex.co.x+G.ORIGIN[0],G.ORIGIN[1]-vertex.co.y,vertex.co.z+G.ORIGIN[2])
            assert all(box['min'][i]-1e-5<=world[i]<=box['max'][i]+1e-5 for i in range(3))
            edge=min(world[0]-box['min'][0],box['max'][0]-world[0],world[1]-box['min'][1],box['max'][1]-world[1])
            assert edge<=.02501,'Hem escapes its 25 mm bound edge'
        eyes=[o for o in G.bpy.context.scene.objects if o.name.startswith(fixture['id']+'-endpoint-ledger') and '-eye-' in o.name]
        assert len(eyes)==4,'Canopy requires two iron eyes per ledger'
        for eye in eyes:
            ledger=next(p for p in fixture['assemblyParts'] if eye.name.startswith(fixture['id']+'-'+p['id']+'-eye-'))
            points=[(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]) for v in eye.data.vertices]
            low=[min(p[i] for p in points) for i in range(3)];high=[max(p[i] for p in points) for i in range(3)]
            assert abs(high[2]-low[2]-.035)<1e-5,'Iron eye diameter differs from 35 mm'
            center=(low[1]+high[1])/2;lo=ledger['bbox']['min'];hi=ledger['bbox']['max']
            assert min(abs(center-lo[1]-.20),abs(hi[1]-center-.20))<1e-5
            assert any(all(lo[i]<p[i]<hi[i] for i in range(3)) for p in points),'Eye has no embedded ledger contact'
            assert any(p[0]<lo[0] or p[0]>hi[0] for p in points),'Eye is buried inside ledger'
            assert all(fixture['bbox']['min'][i]-1e-5<=p[i]<=fixture['bbox']['max'][i]+1e-5 for p in points for i in range(3))
        print('PASS canopy finish: 25 mm hem inside membrane; four 35 mm eyes embedded in ledgers, 0.20 m inside ends',flush=True)
    face=next(f for f in area['faces'] if f['face']=='east');parcel=face['parcels'][0]
    window=next(o for o in parcel['openings'] if o['kind']=='window')
    opening(face['face'],face['wallPlaneM'],window,parcel['trimMaterialId'],parcel['materialId'])
    frame=next(o for o in G.bpy.context.scene.objects if o.name.startswith(window['id']+'-frame-jamb'))
    assert frame.data.materials[0]==G.mat(G.WOOD)
    assert frame.data.materials[0].get('bz05FinishProfile')==G.D['craftStandards']['materials']['warmTimber']['exportName']
    back=G.bpy.data.objects[window['id']+'-back']
    assert back.data.materials[0]==G.mat(parcel['materialId']),'Opening back changed with the timber finish'
    shop=next(o for o in parcel['openings'] if o['kind']=='shop')
    opening(face['face'],face['wallPlaneM'],shop,parcel['trimMaterialId'],parcel['materialId'])
    fills=[o for o in G.bpy.context.scene.objects if o.name.startswith(shop['id']+'-spandrel')]
    assert fills and all(o.data.materials[0]==G.mat('ph_bz04_sandstone_blocks_05') for o in fills)
    ring=next(o for o in G.bpy.context.scene.objects if o.name.startswith(shop['id']+'-arch-ring'))
    assert ring.data.materials[0]==G.mat(shop['surroundMaterialId'])
    assert abs((ring.data.vertices[0].co-ring.data.vertices[3].co).length-shop['archRingM'])<1e-5,'Arch ring differs from scheduled 0.20 m width'
    assert G.bpy.data.objects[shop['id']+'-back'].data.materials[0]==G.mat(parcel['materialId'])
    print('PASS shop spandrel: scheduled ground stone field; explicit plaster ring and chamber back preserved',flush=True)
    bolts=next(g for g in area['activityGroups'] if g['id']=='G_T_E_ARCH1')
    for item in bolts['instanceLayout']['parts']:
        if item['kind']!='rolled-textile':continue
        ends=[o for o in G.bpy.context.scene.objects if o.name.startswith(bolts['id']+'-'+item['id']+'-rolled-edge')]
        assert len(ends)==2,'Upright cloth bolt lacks its two rolled end spirals'
        z0=bolts['bbox']['min'][2]+item['localBox']['min'][2];z1=bolts['bbox']['min'][2]+item['localBox']['max'][2]
        planes=sorted(sum(v.co.z for v in ob.data.vertices)/len(ob.data.vertices) for ob in ends)
        assert abs(planes[0]-z0)<1e-5 and abs(planes[1]-z1)<1e-5
        assert all(len(ob.data.vertices)==130 for ob in ends),'Cloth end is not the existing three-turn spiral ribbon'
    print('PASS four upright cloth bolts: eight bounded spiral ends at their exact end planes',flush=True)
    print('PASS Textile craft geometry: basket ray reaches inner base,12 ribs/3 hoops,canopy sag and membrane bounds,paired ledgers,warmTimber frame and original opaque back',flush=True)


def spandrel_fixture(area):
    """Ray-test the entire front mask across the former plaster strip and top seam."""
    from mathutils import Vector
    G.reset(tuple(area['sectionOriginDesign'][k] for k in ('x','y','z')))
    S.build_shells(area,opening,parcel_ids={'T_E_CART'})
    objects=[ob for ob in G.bpy.context.scene.objects if ob.type=='MESH']
    for ob in objects:G.prepare_mesh(ob)
    face=next(f for f in area['faces'] if f['face']=='east')
    parcel=next(p for p in face['parcels'] if p['id']=='T_E_CART')
    o=next(o for o in parcel['openings'] if o['kind']=='shop')
    left=o['alongM']-o['widthM']/2-o['trimWidthM'];right=o['alongM']+o['widthM']/2+o['trimWidthM']
    top=o['headM']+o['trimWidthM']+.02;count=0
    for z in (o['headM']+.005,o['headM']+.015,top-.001,top+.001):
        for i in range(53):
            along=left+(right-left)*(i+.5)/53
            front=Vector(G.local(G.coords(face['face'],face['wallPlaneM'],along,0,z)))
            start=Vector(G.local(G.coords(face['face'],face['wallPlaneM'],along,.10,z)))
            direction=(front-start).normalized();hits=[]
            for ob in objects:
                hit,point,normal,index=ob.ray_cast(start,direction,distance=.12)
                target_out=o.get('frontProjectionM',0) if '-arch-ring' in ob.name or '-arch-jamb' in ob.name else 0
                target=Vector(G.local(G.coords(face['face'],face['wallPlaneM'],along,target_out,z)))
                if hit and (point-target).length<1e-4:hits.append(ob)
            assert hits,('Open spandrel or mask-top seam',along,z)
            assert not any('chamber-ceiling' in ob.name for ob in hits),('Chamber ceiling reaches the facade',along,z)
            assert len({ob.data.materials[0].name for ob in hits})==1,('Competing facade materials',along,z,[ob.name for ob in hits])
            count+=1
    spring=G.arch_points(o);outer=G.offset_top(spring,o['trimWidthM']);spring_rays=0
    for side,(arc,endpoint,edge) in enumerate(((spring[0],outer[0],left),(spring[-1],outer[-1],right))):
        assert endpoint[1]>arc[1]+1e-6,('Spring-gap fixture has no raised offset',side)
        for height_fraction in (.25,.5,.75):
            z=arc[1]+(endpoint[1]-arc[1])*height_fraction
            inside=arc[0]+(endpoint[0]-arc[0])*height_fraction
            for width_fraction in (.25,.5,.75):
                along=edge+(inside-edge)*width_fraction
                front=Vector(G.local(G.coords(face['face'],face['wallPlaneM'],along,o.get('frontProjectionM',0),z)))
                start=Vector(G.local(G.coords(face['face'],face['wallPlaneM'],along,o.get('frontProjectionM',0)+.02,z)))
                hits=[]
                for ob in objects:
                    hit,point,normal,index=ob.ray_cast(start,(front-start).normalized(),distance=.04)
                    if hit and (point-front).length<1e-5:hits.append(ob)
                assert hits,('Open raised arch spring',side,along,z,o.get('frontProjectionM',0))
                assert all(ob.data.materials[0]==G.mat(o['surroundMaterialId']) for ob in hits),('Spring differs from arch finish',side)
                spring_rays+=1
    print('PASS raised arch springs:',spring_rays,'rays across both ends at authored front',o.get('frontProjectionM',0),flush=True)
    print('PASS spandrel interface:',count,'front rays across full mask, no gap or competing chamber ceiling',flush=True)



def cutting_cloth(left,right,recipe,*,face="west",plane=24,name="P3-T-cutting-drape"):
    """Closed heavy cloth with an actual underside seated on the .94 m top."""
    border=.025;thickness=recipe['thicknessM'];bottom=recipe['bottomZM']
    path=[(-.35,.95),(-.1,.95),(.12,.95),(.15,.95),(.166,.946),(.18,.935),(.19,.913),(.19,.89),(.19,.80),(.19,.65),(.19,.50),(.19,bottom+.03),(.19,bottom)]
    xs=sorted(set([left,left+border,right-border,right]+[left+(right-left)*i/24 for i in range(25)]))
    width=len(xs);rows=len(path);front=[];back=[];uv=[]
    for i,x in enumerate(xs):
        u=(x-left)/(right-left);points=[];length=0
        for out,z in path:
            drop=max(0,min(1,(.89-z)/.2))
            out+=recipe['foldDepthM']*(.5+.5*math.sin(u*math.pi*6+.3))*drop
            z+=recipe['hemRiseM']*(.5+.5*math.sin(u*math.pi*3+.4))*max(0,1-(z-bottom)/.15)
            points.append((out,z))
        for j,(out,z) in enumerate(points):
            previous=points[max(0,j-1)];following=points[min(rows-1,j+1)]
            do=following[0]-previous[0];dz=following[1]-previous[1];length_tangent=math.hypot(do,dz)
            if j:length+=math.dist(points[j-1],points[j])
            front.append(G.coords(face,plane,x,out,z))
            back.append(G.coords(face,plane,x,out+thickness*dz/length_tangent,z-thickness*do/length_tangent))
            uv.append(((x-left)/1.2,length/1.2))
    count=len(front);faces=[];hems=[]
    for i in range(width-1):
        for j in range(rows-1):
            q=i*rows+j;quad=(q,q+rows,q+rows+1,q+1)
            edge=xs[i]<left+border-1e-6 or xs[i+1]>right-border+1e-6 or j==rows-2
            faces.extend([quad,tuple(v+count for v in reversed(quad))]);hems.extend([edge,edge])
    perimeter=[i*rows for i in range(width)]+[(width-1)*rows+j for j in range(1,rows)]+[i*rows+rows-1 for i in range(width-2,-1,-1)]+list(range(rows-2,0,-1))
    for a,b in zip(perimeter,perimeter[1:]+perimeter[:1]):faces.append((a,b,b+count,a+count));hems.append(True)
    ob=G.mesh(name,front+back,faces,'ph_bz04_hessian_230','cast',True)
    for loop in ob.data.loops:ob.data.uv_layers.active.data[loop.index].uv=uv[loop.vertex_index%count]
    return ob,hems


def cutting_cloth_fixture(ob,group,recipe):
    import bmesh
    from mathutils import Vector
    G.prepare_mesh(ob);bm=bmesh.new();bm.from_mesh(ob.data)
    assert all(e.is_manifold for e in bm.edges),'Cutting cloth has an open or nonmanifold seam'
    assert all(f.calc_area()>1e-10 for f in bm.faces),'Cutting cloth has a collapsed face'
    bm.free()
    for v in ob.data.vertices:
        world=(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z)
        assert all(group['bbox']['min'][i]-1e-6<=world[i]<=group['bbox']['max'][i]+1e-6 for i in range(3))
        out=world[0]-24
        assert out<=recipe['frontOutM']+1e-6 and world[2]>=recipe['bottomZM']-1e-6
        assert not (-.55<out<.15-1e-5 and .86<world[2]<.94-1e-5),'Cloth penetrates the tabletop'
    for along in [54.60,54.90,55.30]:
        for z,direction in [(1.1,-1),(.93,1)]:
            start=Vector(G.local(G.coords('west',24,along,-.2,z)))
            hit,point,normal,index=ob.ray_cast(start,Vector((0,0,direction)),distance=.3)
            assert hit and abs(point.z-(.95 if direction<0 else .94))<1e-5,'Cloth top or underside misses its support height'
    print('PASS cutting cloth: closed separated skins, seated .94 m underside, bounded folds/hem and clear tabletop',flush=True)


def art_finish(area):
    from bazaar_finish import apply
    apply(G.__dict__,OUT/(UNIT+'.glb'))
    recipe=area['artDirectionFinish']
    spec=importlib.util.spec_from_file_location('bazaar_finish_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)
    private=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz10_textile_')
    def finish(ob,family,factor=1,reproject=True):
        ob.data.materials.clear();ob.data.materials.append(private[family])
        old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
        for c in colors.data:c.color=(factor,factor,factor,1)
        ob.data.color_attributes.active_color=colors
        if not reproject:return ob
        if family in {'timber','aged_timber','painted_timber','worktop'}:tools.member_uv(ob)
        else:G.world_uv(ob,float(private[family]['tileSizeM']))
        return ob
    def cloth(ob,color):
        finish(ob,'cloth',reproject=False);mean=private['cloth']['bz07TargetMeanLinear']
        rgba=[G._linear_channel(int(color[i:i+2],16))/mean[k] for k,i in enumerate((1,3,5))]
        assert all(0<=v<=1 for v in rgba),(ob.name,color)
        for c in ob.data.color_attributes['COLOR_0'].data:c.color=(*rgba,1)
    for ob in G.bpy.context.scene.objects:
        if ob.type!='MESH':continue
        mat=ob.data.materials[0];source=mat.get('bz04SourceMaterial',mat.name)
        if any(key in source for key in ('plaster','beige')):finish(ob,'sand' if ob.name.startswith(('T_E','T_N')) else 'plaster')
        elif any(key in source for key in ('timber','wood','plank','pine')):
            family='painted_timber' if ob.name.startswith('T_E_') else 'worktop' if '-top-board' in ob.name else 'timber'
            finish(ob,family,.92+.08*(sum(ob.name.encode())%9)/8)
        if ob.name.startswith('G_T_E_ARCH1-bolt-') and '-rolled-edge' not in ob.name:
            index=int(ob.name.split('bolt-')[1].split('-')[0])-1;cloth(ob,recipe['boltColors'][index]);ob['bz04Shadow']='cast'
        elif ob.name.startswith(('G_T_W_ARCH2-cloth','G_T_W_ARCH2-folded','G_T_W_ARCH3-bale')) and '-binding' not in ob.name:
            index=2 if '-cloth-length' in ob.name else 1 if '-folded-stack' in ob.name else (int(ob.name.split('-bale-')[1][0])-1)%3
            cloth(ob,recipe['foldColors'][index]);ob['bz04Shadow']='cast'
        elif ob.name.startswith('CANOPY_TEXTILE-') and ob.name.endswith(('cloth','bound-hem')):
            cloth(ob,recipe['canopyHemColor'] if ob.name.endswith('bound-hem') else recipe['canopyColor'])
    # One rug hangs across the retail counter, with a supported turn over its
    # top and a bound hanging edge. Stock and player clearance remain separate.
    drape=recipe['heroDrape'];group=next(g for g in area['activityGroups'] if g['id']==drape['group'])
    op=next(o for p in G.PARCELS.values() for o in p['openings'] if o['id']==group['receiverOpening'])
    L,R=[op['alongM']+v for v in drape['alongOffsetM']]
    G.cloth_path('P3-T-retail-drape','west',24,L,R,[(-.27,.957),(.13,.957),(drape['outM'],.92),(drape['outM'],drape['bottomZM']+.02),(.15,drape['bottomZM'])],
        'bz04_levantine_rug_project_original',thickness=.008,border=.032,color=drape['borderColor'],fringe=.02)
    cutting=recipe['cuttingDrape']
    for ob in list(G.bpy.context.scene.objects):
        if ob.name.startswith(cutting['replaces']):G.bpy.data.objects.remove(ob,do_unlink=True)
    group=next(g for g in area['activityGroups'] if g['id']==cutting['group'])
    op=next(o for p in G.PARCELS.values() for o in p['openings'] if o['id']==group['receiverOpening'])
    L,R=[op['alongM']+v for v in cutting['alongOffsetM']]
    ob,hems=cutting_cloth(L,R,cutting);cloth(ob,cutting['color'])
    base=tuple(ob.data.color_attributes['COLOR_0'].data[0].color);mean=private['cloth']['bz07TargetMeanLinear']
    hem=tuple(G._linear_channel(int('#546c6b'[i:i+2],16))/mean[k] for k,i in enumerate((1,3,5)))+(1,)
    ob.data.color_attributes.remove(ob.data.color_attributes['COLOR_0']);colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','CORNER')
    for poly,is_hem in zip(ob.data.polygons,hems):
        for loop in poly.loop_indices:colors.data[loop].color=hem if is_hem else base
    ob.data.color_attributes.active_color=colors;cutting_cloth_fixture(ob,group,cutting)
    # Several folded lengths replace the single rigid stock block. Their flat
    # undersides bear on the top and the preceding bundle within its old box.
    item=next(p for p in group['instanceLayout']['parts'] if p['id']=='folded-stack');prefix=group['id']+'-folded-stack'
    for ob in list(G.bpy.context.scene.objects):
        if ob.name.startswith(prefix):G.bpy.data.objects.remove(ob,do_unlink=True)
    low,high=item['localBox']['min'],item['localBox']['max'];height=cutting['stackPieceHeightM']
    for i,color in enumerate(recipe['foldColors']):
        lo=(op['alongM']+low[0]+i*.012,low[1]+i*.008,group['bbox']['min'][2]+low[2]+i*height)
        hi=(op['alongM']+high[0]-(2-i)*.012,high[1]-(2-i)*.008,lo[2]+height)
        before=set(G.bpy.context.scene.objects);S.soft_cloth(prefix+'-piece-'+str(i),'west',24,lo,hi,'ph_bz04_hessian_230',True)
        for ob in set(G.bpy.context.scene.objects)-before:cloth(ob,color);ob['bz04Shadow']='cast'

    window=recipe['workingWindow'];op=next(o for p in G.PARCELS.values() for o in p['openings'] if o['id']==window['opening'])
    for ob in list(G.bpy.context.scene.objects):
        if ob.name.startswith(op['id']+'-') and any(k in ob.name for k in ('-leaf-','-hinge','-latch')):G.bpy.data.objects.remove(ob,do_unlink=True)
    finish(G.bpy.data.objects[op['id']+'-back'],'timber',.25)
    left=op['alongM']-op['widthM']/2+.08;right=op['alongM']+op['widthM']/2-.08
    bottom=op['sillM']+.08;top=op['headM']-.08;depth=-op['depthM']+.04;width=(right-left)/2-.006
    for side,(hinge,sign,angle_deg) in enumerate(zip((left,right),(1,-1),window['leafAnglesDeg'])):
        angle=math.radians(angle_deg)
        def leaf_part(name,u,U,z,Z,n=-.018,N=.018):
            coordinates=[(u,n,z),(U,n,z),(U,N,z),(u,N,z),(u,n,Z),(U,n,Z),(U,N,Z),(u,N,Z)]
            vertices=[G.coords('east',35,hinge+sign*(math.cos(angle)*a-math.sin(angle)*o),depth+math.sin(angle)*a+math.cos(angle)*o,h) for a,o,h in coordinates]
            ob=G.mesh('P3-T-work-shutter-'+str(side)+'-'+name,vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],G.WOOD)
            finish(ob,'painted_timber');lengths=[U-u,N-n,Z-z];grain=max(range(3),key=lambda i:lengths[i])
            for poly in ob.data.polygons:
                normal=min(range(3),key=lambda i:max(coordinates[v][i] for v in poly.vertices)-min(coordinates[v][i] for v in poly.vertices))
                ua=grain if grain!=normal else (normal+1)%3;va=next(i for i in range(3) if i not in {normal,ua})
                for loop in poly.loop_indices:
                    point=coordinates[ob.data.loops[loop].vertex_index];ob.data.uv_layers.active.data[loop].uv=(point[ua]/1.8,point[va]/1.8)
            bevel=ob.modifiers.new('Shutter joinery arris','BEVEL');bevel.width=.004;bevel.segments=1
        for u,U in [(0,.065),(width-.065,width)]:leaf_part('stile',u,U,bottom,top)
        for z,Z in [(bottom,bottom+.075),(top-.075,top)]:leaf_part('rail',.065,width-.065,z,Z)
        count=max(2,round((width-.13)/.15))
        for i in range(count):
            u=.065+i*(width-.13)/count;U=.065+(i+1)*(width-.13)/count
            leaf_part('board',u+.001,U-.001,bottom+.075,top-.075,-.012,.009)
        for z in [bottom+.15,top-.25]:
            G.part('east',35,'P3-T-window-hinge',(hinge-.035,depth-.025,z),(hinge+.035,depth+.035,z+.10),G.IRON,'cast',.004)
    finish(G.part('east',35,'P3-T-workroom-mullion',(op['alongM']-.028,depth-.055,bottom),(op['alongM']+.028,depth-.005,top),G.WOOD,'cast',.004),'timber')
    return tools


def build(saved, fixture=False):
    area=copy.deepcopy(validate(saved));setup(saved)
    for face in area['faces']:
        for parcel in face['parcels']:
            for aperture in parcel['openings']:
                if 'archRingM' in aperture and 'trimWidthM' not in aperture:
                    aperture['trimWidthM']=aperture['archRingM']
    if not fixture:
        interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
        interfaces['install'](G,area)
        S.build_shells(area,opening)
    for group in area['activityGroups']:
        activity(group)
    for f in area['fixtures']:
        canopy(f)
    stats=S.validate_objects(area)
    if fixture:
        import bpy
        warp=[o for o in bpy.context.scene.objects if '-weft-panel-warp' in o.name]
        assert len(warp)==12,('weaving warp count',len(warp))
        craft_fixture(area)
        assert not any('field' in o.name and 'TEXTILE_ARCADE-south' in o.name for o in bpy.context.scene.objects)
        print('PASS Textile fixture: all 43 scheduled parts bounded, 12 exposed warp threads, open woven basket, real furniture and supported canopy',stats)
        spandrel_fixture(area)
    else:
        tools=art_finish(area);prepare=G.prepare_mesh
        for ob in G.bpy.context.scene.objects:
            if ob.type=='MESH':prepare(ob)
        recipe=area['artDirectionFinish'];tools.bake_contact_occlusion(G.__dict__,recipe['contactRadiusM'],recipe['contactStrength'],subdivision_prefixes=('T_E_ARCH','T_W_ARCH'))
        G.prepare_mesh=lambda ob:None
        try:
            G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
                     {'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})
        finally:G.prepare_mesh=prepare


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['build','self-test','input-fixture'],nargs='?',default='build')
    parser.add_argument('--handoff',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    saved=json.loads(args.handoff.read_text())
    if args.mode=='input-fixture':
        validate(saved);print('PASS Textile frozen R7 inputs and explicit capabilities')
    else:
        build(saved,args.mode=='self-test')
