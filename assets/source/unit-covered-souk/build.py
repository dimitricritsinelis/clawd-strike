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
        if face=='east' and o.get('frontProjectionM'):
            for ob in G.bpy.context.scene.objects:
                if ob.name.startswith(o['id']+'-front-barrel'):
                    for v in ob.data.vertices:
                        if abs(v.co.x-(plane-G.ORIGIN[0]))<1e-6:v.co.x-=o['frontProjectionM']
                    ob.data.update()
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


def canopy(f):
    """Keep measured receivers; replace the ribbon with closed sewn panels."""
    import math
    from mathutils import Vector
    T.canopy(f)
    for suffix in ('cloth','bound-hem'):G.bpy.data.objects.remove(G.bpy.data.objects[f['id']+'-'+suffix],do_unlink=True)
    x,y,z=f['endA'];X,_,Z=f['endB'];low=y-f['widthM']/2;high=y+f['widthM']/2
    def patch(suffix,left,right,bottom,top,raised=0):
        nx=48 if right-left>.1 else 1;ny=4 if top-bottom>.1 else 1;verts=[];faces=[];row=nx+1;layer=row*(ny+1)
        for down in (0,.008):
            for j in range(ny+1):
                b=bottom+(top-bottom)*j/ny;v=(b-low)/(high-low)
                for i in range(nx+1):
                    a=left+(right-left)*i/nx;u=(a-x)/(X-x)
                    h=z+(Z-z)*u-f['sagM']*math.sin(math.pi*u)+A['artDirectionFinish']['canopyFoldM']*math.sin(math.pi*u)**2*math.cos(3*math.pi*v)**2
                    verts.append((a,b,h+raised-down))
        for j in range(ny):
            for i in range(nx):
                q=j*row+i;faces.extend([(q,q+1,q+row+1,q+row),(q+layer,q+row+layer,q+row+1+layer,q+1+layer)])
        boundary=list(range(row))+[j*row+nx for j in range(1,ny+1)]+list(range(ny*row+nx-1,ny*row-1,-1))+[j*row for j in range(ny-1,0,-1)]
        faces.extend((a,b,b+layer,a+layer) for a,b in zip(boundary,boundary[1:]+boundary[:1]))
        ob=G.mesh(f['id']+'-'+suffix,verts,faces,f['materialId'],'cast');ob['soukCloth']=True
        return ob
    seams=[low+(high-low)*i/3 for i in (1,2)]
    for i,(a,b) in enumerate(zip([low+.025]+[s+.012 for s in seams],[s-.012 for s in seams]+[high-.025])):patch('cloth-panel-'+str(i+1),x+.025,X-.025,a,b)
    for i,(a,b,c,d) in enumerate(((x,X,low,low+.025),(x,X,high-.025,high),(x,x+.025,low+.025,high-.025),(X-.025,X,low+.025,high-.025))):patch('bound-hem-'+str(i),a,b,c,d)
    for i,s in enumerate(seams):patch('sewn-seam-'+str(i),x+.025,X-.025,s-.012,s+.012,.002)
    # Resolve cloth topology before locating tie contacts on its final triangles.
    for ob in G.bpy.context.scene.objects:
        if ob.get('soukCloth') and ob.name.startswith(f['id']):G.prepare_mesh(ob)
    G.bpy.context.view_layer.update()
    for eye in [o for o in G.bpy.context.scene.objects if o.name.startswith(f['id']) and '-eye-' in o.name]:
        contact=max((v.co.copy() for v in eye.data.vertices),key=lambda p:p.z)
        world=(contact.x+G.ORIGIN[0],G.ORIGIN[1]-contact.y,contact.z+G.ORIGIN[2]);along=x+.25 if world[0]<47 else X-.25
        start=Vector(G.local((along,world[1],z+.1)));hits=[]
        for cloth in [o for o in G.bpy.context.scene.objects if o.get('soukCloth') and o.name.startswith(f['id'])]:
            hit,p,_,_=cloth.ray_cast(start,Vector((0,0,-1)),distance=1)
            if hit:hits.append((p.z,cloth.name,p.copy()))
        assert hits,('missing cloth tie receiver',eye.name)
        _,receiver,p=max(hits,key=lambda h:h[0]);end=(p.x+G.ORIGIN[0],G.ORIGIN[1]-p.y,p.z+G.ORIGIN[2])
        tie=G.member(f['id']+'-tie',world,end,.008,'ph_bz04_hessian_230','cast');tie['contactEye']=eye.name;tie['contactCloth']=receiver;tie['contactPoints']=[list(contact),list(p)]


def art_finish(area):
    from bazaar_finish import apply
    apply(G.__dict__,OUT/(UNIT+'.glb'))
    spec=importlib.util.spec_from_file_location('souk_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)
    recipe=area['artDirectionFinish'];private=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz21_souk_')
    def finish(ob,family,color=None,keep_uv=False):
        ob.data.materials.clear();ob.data.materials.append(private[family]);old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT');rgba=(1,1,1,1)
        if color:rgba=tuple(G._linear_channel(int(color[i:i+2],16))/private[family]['bz07TargetMeanLinear'][k] for k,i in enumerate((1,3,5)))+(1,)
        assert all(0<=c<=1 for c in rgba),(ob.name,rgba)
        for c in colors.data:c.color=rgba
        ob.data.color_attributes.active_color=colors
        if not keep_uv:
            if family in {'timber','aged_timber','painted_timber','worktop'}:tools.member_uv(ob)
            else:G.world_uv(ob,float(private[family]['tileSizeM']))
        return ob
    owner_prefixes=dict(recipe['parcelFinishBindings'])
    for face in area['faces']:
        for parcel in face['parcels']:
            for opening in parcel['openings']:owner_prefixes[opening['id']]=recipe['parcelFinishBindings'].get(parcel['id'],'red')
    stock={};palette=['#5f7380','#a5745c','#838971','#b7a88a']
    for group in area['activityGroups']:
        index=0
        for item in group['instanceLayout']['parts']:
            if group['id']+'-'+item['id']==recipe['preservedRugRoll']:continue
            if item['kind'] in {'rolled-textile','horizontal-rolled-rug','folded-cloth','bound-folded-textile','hanging-cloth','taut-woven-panel'}:
                stock[group['id']+'-'+item['id']]=(palette[index%4],item['kind'] in {'rolled-textile','horizontal-rolled-rug'});index+=1
    for ob in list(G.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        if any(ob.name.startswith(p) for p in recipe['retireFinishPrefixes']):G.bpy.data.objects.remove(ob,do_unlink=True);continue
        source=ob.data.materials[0].get('bz04SourceMaterial',ob.data.materials[0].name)
        cloth=next((v for p,v in stock.items() if ob.name.startswith(p) and '-warp' not in ob.name),None)
        fixture=next((f for f in area['fixtures'] if ob.name.startswith(f['id'])),None)
        if cloth:finish(ob,'cloth',*cloth)
        elif fixture and ob.get('soukCloth'):
            scale=recipe['canopyPanelValueScales'][int(ob.name.rsplit('-',1)[1])-1] if '-cloth-panel-' in ob.name else recipe['canopyBindingValueScale']
            color='#'+''.join(f'{round(int(fixture["stockColorSrgb"][i:i+2],16)*scale):02x}' for i in (1,3,5))
            finish(ob,'cloth',color)
        elif any(k in source for k in ('plaster','beige')):
            name=ob.name.removeprefix('life-wear-')
            family=next((owner_prefixes[p] for p in sorted(owner_prefixes,key=len,reverse=True) if name.startswith(p)),'red');finish(ob,family)
        elif any(k in source for k in ('timber','wood','plank','pine')):
            finish(ob,'worktop' if '-top-board' in ob.name or '-worktop' in ob.name else 'aged_timber' if ob.name.startswith(('G_','CANOPY_')) else 'timber')
    stone=G.mat('ph_bz04_trim_sanded_01').copy();stone.name='bz21_souk_dressed_stone'
    for node in stone.node_tree.nodes:
        if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.32
    def dressed(ob):
        ob.data.materials.clear();ob.data.materials.append(stone)
        old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        G.world_uv(ob,float(stone.get('tileSizeM',2)));return ob
    for ob in G.bpy.context.scene.objects:
        if ob.name.startswith('COVERED_SOUK_EAST_GROUND') and any(s in ob.name for s in ('arch-ring','arch-jamb','front-barrel','spring-closure')):dressed(ob)
    dressed(G.part('east',53,'P3-CS-floor-band',(32.015,-.02,3.82),(47.985,.075,4),'ph_bz04_trim_sanded_01','cast',.006))
    # Closed stockroom hatch: the fixed back remains; rails stand proud of its boards.
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith('cs-e-L1-W2-'):continue
        if '-leaf-panel' in ob.name:tools.member_uv(ob,grain_axis=2)
        if any(s in ob.name for s in ('-frame-','-leaf-stile','-leaf-rail')):
            low=min(v.co.x for v in ob.data.vertices)
            for v in ob.data.vertices:
                if abs(v.co.x-low)<1e-6:v.co.x-=.022
            ob.data.update();tools.member_uv(ob)
    group=next(g for g in area['activityGroups'] if g['receiverFace']=='west');deck=group['bbox']['min'][2];a=35.5
    for side in (-1,1):
        center=a+side*.835
        finish(G.part('west',41,'P3-CS-loom-foot',(center-.065,-.55,deck),(center+.065,.07,deck+.055),G.WOOD,'cast',.004),'aged_timber')
        for out in (-.52,.04):
            finish(G.member('P3-CS-loom-stay',G.coords('west',41,center,out,deck+.045),G.coords('west',41,center,-.245,deck+.46),.035,G.WOOD,'cast'),'aged_timber')
    # One fitted rug merchant leads the arcade. The folding leaves occupy the
    # front counter zone; the stock rack stays behind the clear staff strip.
    import math
    shop=recipe['rugShop'];group=next(g for g in area['activityGroups'] if g['id']==shop['group'])
    op=next(o for o in G.PARCELS[group['receiverParcel']]['openings'] if o['id']==group['receiverOpening']);a=op['alongM'];prefix='P4-CS-rug'
    def joinery(name,lo,hi,family='timber'):
        ob=G.part('east',53,prefix+'-'+name,lo,hi,G.WOOD,'cast',.004)
        return finish(ob,family,shop['joineryColor'] if family=='timber' else None)
    left,right=[a+v for v in shop['frameAlongM']];back,front=shop['frameOutM'];bottom,top=shop['frameZM']
    for L,R in [(left,left+.08),(right-.08,right)]:joinery('jamb',(L,back,bottom),(R,front,top-.09))
    joinery('header',(left,back,top-.09),(right,front,top))
    for side,hinge,sign in [('left',left+.08,1),('right',right-.08,-1)]:
        out=-.18;width=shop['shutterWidthM'];angle=math.radians(shop['shutterAngleDeg']);low,high=shop['shutterZM']
        for leaf in range(shop['shutterLeavesPerSide']):
            direction=-1 if leaf%2==0 else 1
            def leaf_part(label,u,U,z,Z,n=-.012,N=.012):
                vertices=[]
                for x,y,h in [(u,n,z),(U,n,z),(U,N,z),(u,N,z),(u,n,Z),(U,n,Z),(U,N,Z),(u,N,Z)]:
                    along=hinge+sign*(math.cos(angle)*x-direction*math.sin(angle)*y)
                    outward=out+direction*math.sin(angle)*x+math.cos(angle)*y
                    vertices.append(G.coords('east',53,along,outward,h))
                ob=G.mesh(prefix+'-'+side+'-leaf-'+str(leaf)+'-'+label,vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],G.WOOD,'cast')
                finish(ob,'timber',shop['joineryColor']);bevel=ob.modifiers.new('Shutter arris','BEVEL');bevel.width=.002;bevel.segments=1
            for u,U in [(.014,.04),(width-.04,width-.014)]:leaf_part('stile',u,U,low,high)
            for z,Z in [(low,low+.055),(high-.055,high)]:leaf_part('rail',.04,width-.04,z,Z)
            for i in range(3):
                u=.04+(width-.08)*i/3;U=.04+(width-.08)*(i+1)/3
                leaf_part('board',u+.001,U-.001,low+.055,high-.055,-.009,.007)
            for z in [low+.18,high-.18]:
                G.member(prefix+'-'+side+'-hinge',G.coords('east',53,hinge,out,z-.045),G.coords('east',53,hinge,out,z+.045),.014,G.IRON,'receive')
            hinge+=sign*math.cos(angle)*width;out+=direction*math.sin(angle)*width
    lining=shop['rearBoards'];L,R=[a+v for v in lining['alongM']]
    for i in range(lining['count']):
        l=L+(R-L)*i/lining['count'];r=L+(R-L)*(i+1)/lining['count']
        joinery('rack-back-board',(l+.002,lining['outM'][0],lining['zM'][0]),(r-.002,lining['outM'][1],lining['zM'][1]),'aged_timber')
    # A heavy rug turns over the existing top with the same tested underside
    # construction as the cutting table, fitted to this east-facing receiver.
    display=shop['display'];L,R=[a+v for v in display['alongOffsetM']]
    ob,_=T.cutting_cloth(L,R,display,face='east',plane=53,name=prefix+'-counter-display')
    ob.data.materials.clear();ob.data.materials.append(G.mat('bz04_levantine_rug_project_original'))
    maximum=max(v.uv.y for v in ob.data.uv_layers.active.data)
    for value in ob.data.uv_layers.active.data:value.uv=(value.uv.x*1.2/(R-L),value.uv.y/maximum)
    ob['bz04Shadow']='cast'
    return tools


def rug_shop_fixture(area):
    import bmesh
    from mathutils import Vector
    shop=area['artDirectionFinish']['rugShop'];group=next(g for g in area['activityGroups'] if g['id']==shop['group']);prefix='P4-CS-rug'
    objects=[o for o in G.bpy.context.scene.objects if o.name.startswith(prefix)]
    opening=next(o for o in G.PARCELS[group['receiverParcel']]['openings'] if o['id']==group['receiverOpening'])
    arch=G.arch_points(opening)
    assert objects
    for ob in objects:
        for v in ob.data.vertices:
            world=(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]);out=53-world[0]
            assert all(group['bbox']['min'][i]-.001<=world[i]<=group['bbox']['max'][i]+.001 for i in range(3)),(ob.name,'outside bay',world)
            assert not (-1.6<out<-.6 and world[2]<2.14),(ob.name,'enters staff strip',world)
            if -.28<=out<=opening['frontProjectionM']:
                segment=next(((p,q) for p,q in zip(arch,arch[1:]) if p[0]-1e-6<=world[1]<=q[0]+1e-6),None)
                assert segment,('Joinery leaves arch width',ob.name,world)
                p,q=segment;head=p[1]+(q[1]-p[1])*(world[1]-p[0])/(q[0]-p[0])
                assert world[2]<=head+1e-5,('Joinery enters arch masonry',ob.name,world,head)
    assert abs(2*shop['shutterLeavesPerSide']*shop['shutterWidthM']-(shop['frameAlongM'][1]-shop['frameAlongM'][0]-.16))<1e-6,'Folded leaves cannot close their frame'
    for item in group['instanceLayout']['parts']:
        if not (item['id'].startswith('rolled-rug') or item['id']=='bound-stock'):continue
        stock=[o for o in G.bpy.context.scene.objects if o.name.startswith(group['id']+'-'+item['id'])]
        assert stock
        minimum=min(v.co.z+G.ORIGIN[2] for ob in stock for v in ob.data.vertices)
        assert abs(minimum-(group['bbox']['min'][2]+item['localBox']['min'][2]))<1e-5,'Floating stock'
        support='counter' if item['id']=='rolled-rug-1-1' else 'lower-shelf' if item['localBox']['min'][2]<1.5 else 'upper-shelf'
        surfaces=[o for o in G.bpy.context.scene.objects if o.name.startswith(group['id']+'-'+support)]
        a=40+sum(item['localBox'][k][0] for k in ['min','max'])/2;out=sum(item['localBox'][k][1] for k in ['min','max'])/2
        start=Vector(G.local(G.coords('east',53,a,out,minimum+.001)));hits=[]
        for ob in surfaces:
            hit,point,_,_=ob.ray_cast(start,Vector((0,0,-1)),distance=.15)
            if hit:hits.append(point.z+G.ORIGIN[2])
        assert hits and abs(max(hits)-minimum)<1e-5,(item['id'],'no shelf contact',minimum,hits)
    display=G.bpy.data.objects[prefix+'-counter-display'];bm=bmesh.new();bm.from_mesh(display.data)
    assert all(e.is_manifold for e in bm.edges),'Display has open seams';assert all(f.calc_area()>1e-10 for f in bm.faces);bm.free()
    for z,direction,expected in [(1.1,-1,.95),(.93,1,.94)]:
        start=Vector(G.local(G.coords('east',53,39,-.2,z)));hit,p,_,_=display.ray_cast(start,Vector((0,0,direction)),distance=.3)
        assert hit and abs(p.z+G.ORIGIN[2]-expected)<1e-5,'Display does not seat on the .94 m top'
    print('PASS rug shop: fitted closing-width shutters, bounded clear staff strip, supported stock and closed seated display',flush=True)


def finish_fixture(area):
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    rug_shop_fixture(area)
    def tree(ob):
        ob.data.calc_loop_triangles()
        return BVHTree.FromPolygons([v.co for v in ob.data.vertices],[list(t.vertices) for t in ob.data.loop_triangles],all_triangles=True)
    for f in area['fixtures']:
        cloth=[o for o in G.bpy.context.scene.objects if o.name.startswith(f['id']) and o.get('soukCloth')]
        assert len(cloth)==9 and all(o['bz04Shadow']=='cast' for o in cloth)
        assert abs(min(v.co.z+G.ORIGIN[2] for o in cloth for v in o.data.vertices)-f['clothBbox']['min'][2])<1e-5
        # At midspan the sewn join stays above both neighbouring panel bellies.
        def height_at(y):
            start=Vector(G.local(((f['endA'][0]+f['endB'][0])/2,y,f['endA'][2]+.1)))
            hits=[ob.ray_cast(start,Vector((0,0,-1)),distance=1) for ob in cloth]
            return max(point.z for hit,point,_,_ in hits if hit)
        low=f['endA'][1]-f['widthM']/2
        assert height_at(low+f['widthM']/3)-height_at(low+f['widthM']/2)>.07,'Cloth seam must sit above its panel belly'
        panels=[o for o in cloth if '-cloth-panel-' in o.name]
        assert len({tuple(o.data.color_attributes['COLOR_0'].data[0].color) for o in panels})==3
        for ob in cloth:
            for v in ob.data.vertices:
                p=(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]);assert all(f['clothBbox']['min'][i]-1e-5<=p[i]<=f['clothBbox']['max'][i]+1e-5 for i in range(3)),(ob.name,p)
        ties=[o for o in G.bpy.context.scene.objects if o.name.startswith(f['id']+'-tie')];assert len(ties)==4
        for tie in ties:
            for receiver,p in zip((tie['contactEye'],tie['contactCloth']),tie['contactPoints']):
                assert tree(G.bpy.data.objects[receiver]).find_nearest(Vector(p))[3]<1e-5,(tie.name,receiver)
                assert tree(tie).find_nearest(Vector(p))[3]<.006,(tie.name,'disconnected tie')
        for part in f['assemblyParts'][1:]:
            lo,hi=part['bbox']['min'],part['bbox']['max']
            for face in area['faces']:
                for parcel in face['parcels']:
                    for opening in parcel['openings']:
                        for ob in G.bpy.context.scene.objects:
                            if not ob.name.startswith(opening['id']+'-'):continue
                            points=[(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]) for v in ob.data.vertices]
                            assert not all(max(lo[i],min(p[i] for p in points))<min(hi[i],max(p[i] for p in points))-1e-5 for i in range(3)),('ledger blocks opening',part['id'],ob.name)
    group=next(g for g in area['activityGroups'] if g['receiverFace']=='west');feet=[o for o in G.bpy.context.scene.objects if o.name.startswith('P3-CS-loom-foot')];assert len(feet)==2
    for ob in [o for o in G.bpy.context.scene.objects if o.name.startswith(('P3-CS-loom-foot','P3-CS-loom-stay'))]:
        for v in ob.data.vertices:
            p=(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]);assert all(group['bbox']['min'][i]-1e-5<=p[i]<=group['bbox']['max'][i]+1e-5 for i in range(3)),(ob.name,p)
    assert all(abs(min(v.co.z for v in ob.data.vertices)-group['bbox']['min'][2])<1e-5 for ob in feet)
    for ob in G.bpy.context.scene.objects:
        if ob.name.startswith('COVERED_SOUK_EAST_GROUND') and '-front-barrel' in ob.name:
            assert abs(max(53-G.ORIGIN[0]-v.co.x for v in ob.data.vertices)-.075)<1e-5,ob.name
    roll=G.bpy.data.objects[area['artDirectionFinish']['preservedRugRoll']]
    assert 'rug' in roll.data.materials[0].name and roll.data.materials[0].name!='bz21_souk_cloth','Patterned rug roll lost its approved material'
    plaster=[o for o in G.bpy.context.scene.objects if o.name.startswith('COVERED_SOUK_WEST_GROUND_01') and o.data.materials[0].name.startswith('bz21_souk_') and o.data.materials[0].name.endswith(('red','sand','plaster'))]
    assert plaster and all(o.data.materials[0].name=='bz21_souk_sand' for o in plaster),'Loom recess must share Fountain plaster'
    assert not any(o.name.startswith('life-wear-cs-ws-1-') for o in G.bpy.context.scene.objects)
    print('PASS Souk correction: exact minimum cloth clearance, raised seams and varied panels, preserved patterned roll, continuous Fountain loom plaster',flush=True)
    print('PASS Souk P3: 18 closed casting cloth patches, eight actual eye/cloth ties, clear ledger receivers, grounded bounded loom feet, raised arcade intrados',flush=True)


def build(saved,fixture=False):
    area=copy.deepcopy(validate(saved));setup(saved)
    for face in area['faces']:
        for parcel in face['parcels']:
            for o in parcel['openings']:
                if 'archRingM' in o and 'trimWidthM' not in o:o['trimWidthM']=o['archRingM']
    shells(area)
    for group in area['activityGroups']:activity(group)
    for f in area['fixtures']:canopy(f)
    tools=art_finish(area)
    stats=T.S.validate_objects(area)
    if fixture:
        for ob in list(G.bpy.context.scene.objects):G.prepare_mesh(ob)
        T.S.validate_objects(area)
        finish_fixture(area)
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
        print('PASS Covered Souk fixtures:',sum(len(g['instanceLayout']['parts']) for g in area['activityGroups']),'scheduled parts, 12 exposed warps, two supported bounded spans above 4.2 m',stats,flush=True)
    else:
        prepare=G.prepare_mesh
        for ob in list(G.bpy.context.scene.objects):prepare(ob)
        recipe=area['artDirectionFinish'];tools.bake_contact_occlusion(G.__dict__,recipe['contactRadiusM'],recipe['contactStrength'],subdivision_prefixes=tuple(g['receiverOpening'] for g in area['activityGroups'])+('P4-CS-rug','G_COVERED_SOUK_EAST_GROUND_02'))
        G.prepare_mesh=lambda ob:None
        try:G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
            {'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})
        finally:G.prepare_mesh=prepare


if __name__=='__main__':
    try:
        if '--handoff' not in sys.argv:raise ValueError('Requires --handoff <frozen handoff.json>')
        saved=json.loads(Path(sys.argv[sys.argv.index('--handoff')+1]).read_text());validate(saved)
        if 'check-inputs' in sys.argv:print('PASS Covered Souk frozen input, capabilities and carrier retirement schedule')
        else:build(saved,'self-test' in sys.argv)
    except Exception:
        import traceback
        traceback.print_exc();sys.exit(1)
