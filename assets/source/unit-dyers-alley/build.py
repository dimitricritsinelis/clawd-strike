"""Build R7 Dyers Alley sample workrooms, receiving front and domestic wing.

The historical crossing canopy/carrier belongs to Covered Souk and is retired
with that owner; this area adds only its scheduled east workroom awning.
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
OUT=Path(__file__).resolve().parent
UNIT='unit-dyers-alley'
spec=importlib.util.spec_from_file_location('dyers_alley_textile_helpers',ROOT/'assets/source/unit-textile-arcade/build.py')
T=importlib.util.module_from_spec(spec);spec.loader.exec_module(T)
S=T.S
G=None
KINDS={'stone-plinth','rounded-ceramic-vessel','lidded-ceramic-vessel','grounded-timber-table','folded-cloth','hanging-cloth','locked-timber-lattice-gate','timber-member','grounded-timber-bench'}


def validate(saved,current=None):
    if saved.get('unit')!=UNIT or len(saved.get('areas',[]))!=1:raise ValueError('Expected Dyers Alley frozen unit')
    if S.digest(saved)!=saved.get('inputSha256'):raise ValueError('Frozen handoff contents do not match inputSha256')
    current=current or runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if current['inputSha256']!=saved['inputSha256']:raise ValueError('Area inputs changed since handoff extraction')
    area=saved['areas'][0];caps=saved['requiredCapabilities']
    assert area['zone']=='DYERS_ALLEY' and area['designRevision']['id'].startswith('R7')
    assert set(caps['openingProfiles'])<={'rectangular','segmental'}
    assert set(caps['openingCraftProfiles'])<={'planked-receiving','painted-domestic'}
    assert set(caps['partKinds'])<=KINDS,('unsupported parts',set(caps['partKinds'])-KINDS)
    for key in ['glazingPatterns','featureKinds','landscapeKinds']:assert not caps[key],('unsupported capability',key)
    assert set(caps['craftRecipes'])<={'CF-CERAMIC','CF-CLOTH','CF-DYE-VESSEL','CF-ENVELOPE','CF-FLOOR','CF-FURNITURE','CF-JOINT','CF-OPEN','CF-R4-PORTAL','CF-SHADE','CF-STONE','CF-TIMBER'}
    assert len(area['fixtures'])==1 and area['fixtures'][0]['id']=='SHADE_DA_E_WORK_RECESS'
    return area


def setup(saved):
    global G
    G=S.geometry(saved);G.OUT=OUT;T.G=G
    origin=G.A['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ['x','y','z']))


def cloth(group,item):
    import bpy
    face=group['receiverFace'];plane=next(f['wallPlaneM'] for f in G.A['faces'] if f['face']==face)
    op=next(o for o in G.PARCELS[group['receiverParcel']]['openings'] if o['id']==group['receiverOpening'])
    along=op['alongM'];deck=group['bbox']['min'][2];lo=item['localBox']['min'];hi=item['localBox']['max'];name=group['id']+'-'+item['id']
    center=(lo[1]+hi[1])/2;bow=min(.005,(hi[1]-lo[1]-.018)/2)
    path=[(center+bow*math.sin(math.pi*i/2)*math.sin(math.pi*i/8),deck+hi[2]-(hi[2]-lo[2])*i/8) for i in range(9)]
    before=set(bpy.context.scene.objects)
    G.cloth_path(name,face,plane,along+lo[0],along+hi[0],path,item['materialId'],border=.025,color=item['stockColorSrgb'],fringe=0)
    for ob in set(bpy.context.scene.objects)-before:
        ob.data.materials[0]=G.mat(item['materialId']);G.paint_object(ob,item['stockColorSrgb'],True)
    rail=next((p for p in group['instanceLayout']['parts'] if p['id']=='drying-rail'),None)
    if rail:
        box=rail['localBox'];out=(box['min'][1]+box['max'][1])/2;z=deck+(box['min'][2]+box['max'][2])/2
    else:
        out=op['depthM']*-1+.025;z=deck+hi[2]+.02
        G.part(face,plane,group['id']+'-wall-rail',(along+lo[0]-.04,out-.025,z-.02),(along+hi[0]+.04,out+.025,z+.02),G.WOOD,'receive',.003)
    for a in [along+lo[0]+.025,along+hi[0]-.025]:
        G.member(group['id']+'-cloth-tie-'+item['id'],G.coords(face,plane,a,center,deck+hi[2]-.005),G.coords(face,plane,a,out,z),.01,G.WOOD,'receive')


def activity(group):
    for item in group['instanceLayout']['parts']:
        kind=item['kind'];one=dict(group,instanceLayout={'parts':[item]});one.pop('sign',None)
        if kind=='hanging-cloth':cloth(group,item)
        elif kind in {'grounded-timber-table','grounded-timber-bench'}:
            face=group['receiverFace'];plane=next(f['wallPlaneM'] for f in G.A['faces'] if f['face']==face)
            op=next(o for o in G.PARCELS[group['receiverParcel']]['openings'] if o['id']==group['receiverOpening'])
            lo,hi=item['localBox']['min'],item['localBox']['max'];deck=group['bbox']['min'][2];a=op['alongM']
            x,y,z=a+lo[0],lo[1],deck+lo[2];X,Y,Z=a+hi[0],hi[1],deck+hi[2];name=group['id']+'-'+item['id']
            def part(label,low,high):return G.part(face,plane,name+label,low,high,item['materialId'],'cast',.004)
            for i in range(3):part('-top-board',(x,y+(Y-y)*i/3,Z-.055),(X,y+(Y-y)*(i+1)/3,Z))
            for u in (x+.012,X-.087):
                for v in (y+.012,Y-.087):part('-leg',(u,v,z),(u+.075,v+.075,Z-.055))
            for v in (y+.018,Y-.056):part('-apron',(x+.08,v,Z-.15),(X-.08,v+.038,Z-.055))
            for u in (x+.018,X-.056):part('-end-bearing',(u,y+.08,Z-.15),(u+.038,Y-.08,Z-.055))
            part('-stretcher',(x+.08,(y+Y)/2-.022,z+.16),(X-.08,(y+Y)/2+.022,z+.215))
        elif kind in KINDS:S.activity(one)
        else:raise ValueError('Unsupported Dyers stock '+kind)
    if group.get('sign'):
        S.activity(dict(group,instanceLayout={'parts':[]}))


def verify_geometry(area):
    import bpy
    S.validate_objects(area)
    names=[o.name for o in bpy.context.scene.objects]
    for group in area['activityGroups']:
        assert any(name.startswith(group['id']+'-closed-work-gate-vertical-lattice') for name in names),('missing physical lattice',group['id'])
        for item in group['instanceLayout']['parts']:
            if item['kind']=='hanging-cloth':
                assert len([name for name in names if name.startswith(group['id']+'-cloth-tie-'+item['id'])])==2,('cloth lacks receiver ties',item['id'])
    assert not any('canopy-carrier' in name for name in names),'Covered Souk carrier is outside this unit'


def opening(face,plane,o,trim,back):
    T.opening(face,plane,o,trim,back)
    if o['kind']=='shop' and o['headShape']!='rectangular':
        S.close_arch_shoulders(face,plane,o,trim)
    if o['kind']=='shop':
        cavity=o['shopfront']['cavity'];join=plane-cavity['chamberFromOutM']-G.ORIGIN[0]
        ceiling=G.bpy.data.objects[o['id']+'-chamber-ceiling'];head=G.bpy.data.objects[o['id']+'-head']
        for vertex in ceiling.data.vertices:
            if vertex.co.x<join:vertex.co.x=join
        if o['headShape']=='rectangular':
            for vertex in head.data.vertices:
                if vertex.co.x>join:vertex.co.x=join
        else:
            # The shaped ring is the front head; no second rectangular beam
            # should overlap the ceiling behind the 0.28 m barrel.
            G.bpy.data.objects.remove(head,do_unlink=True)
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
    interfaces['install'](G,area,additional_units={UNIT:None,'unit-covered-souk':{'cs-s-part-2'},'unit-link-south-east':{'lse-n-part-2'}})
    S.build_shells(area,opening_builder=opening)
    import bmesh
    extract=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']
    for unit,ident,owner in [('unit-covered-souk','cs-s-part-2','da-house'),('unit-link-south-east','lse-n-part-2','da-works')]:
        receiver=extract(unit)['areas'][0]
        face,p=next((f,p) for f in receiver['faces'] for p in f['parcels'] if p['id']==ident)
        for ob in G.bpy.context.scene.objects:
            if ob.name!=owner+'-back' and not ob.name.startswith(owner+'-cornice'):continue
            bm=bmesh.new();bm.from_mesh(ob.data)
            if '-cornice' in ob.name:
                # The receiver owns the inner cap strip; the projecting
                # cornice still closes outside its facade interval.
                bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,
                    plane_co=(p['interval'][1]-G.ORIGIN[0],0,0),plane_no=(1,0,0))
            caps=[f for f in bm.faces if all(abs(G.ORIGIN[1]-v.co.y-face['wallPlaneM'])<1e-5 and p['interval'][0]-1e-5<=v.co.x+G.ORIGIN[0]<=p['interval'][1]+1e-5 and p['floorElevationM']-1e-5<=v.co.z+G.ORIGIN[2]<=p['wallTopM']+1e-5 for v in f.verts)]
            if caps:bmesh.ops.delete(bm,geom=caps,context='FACES_ONLY')
            bm.to_mesh(ob.data);bm.free()


def art_finish(area):
    from mathutils import Matrix, Vector
    from bazaar_finish import apply
    apply(G.__dict__,OUT/(UNIT+'.glb'));recipe=area['artDirectionFinish']
    assert recipe['id']=='DYERS-P3'
    spec=importlib.util.spec_from_file_location('dyers_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)
    private=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz20_dyers_')
    def finish(ob,family,factor=1):
        ob.data.materials.clear();ob.data.materials.append(private[family])
        old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
        for c in colors.data:c.color=(factor,factor,factor,1)
        ob.data.color_attributes.active_color=colors
        if family in {'timber','aged_timber','painted_timber','worktop'}:tools.member_uv(ob)
        else:G.world_uv(ob,float(private[family]['tileSizeM']))
        return ob
    def pigment(ob,family,color):
        finish(ob,family);target=private[family]['bz07TargetMeanLinear']
        rgba=[G._linear_channel(int(color[i:i+2],16))/target[k] for k,i in enumerate((1,3,5))]
        assert all(0<=v<=1 for v in rgba),(ob.name,color,rgba)
        for c in ob.data.color_attributes['COLOR_0'].data:c.color=(*rgba,1)
        return ob
    cloth_colors={g['id']+'-'+p['id']:p.get('stockColorSrgb','#b7ad90') for g in area['activityGroups'] for p in g['instanceLayout']['parts'] if p['kind'] in {'folded-cloth','hanging-cloth'}}
    for ob in list(G.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        if any(ob.name.startswith(prefix) for prefix in recipe['retireFinishPrefixes']):G.bpy.data.objects.remove(ob,do_unlink=True);continue
        material=ob.data.materials[0];source=material.get('bz04SourceMaterial',material.name)
        cloth_color=next((color for prefix,color in cloth_colors.items() if ob.name.startswith(prefix)),None)
        if cloth_color:pigment(ob,'cloth',cloth_color)
        elif ob.name.startswith('SHADE_DA_E_WORK_RECESS-cloth'):pigment(ob,'cloth',recipe['awningColorSrgb'])
        elif any(key in source for key in ('plaster','beige')):
            finish(ob,'red' if ob.name.startswith('da-works') else 'plaster' if ob.name.startswith(('da-house','life-wear-da-house')) else 'sand')
        elif any(key in source for key in ('timber','wood','plank','pine')):
            family='worktop' if '-top-board' in ob.name else 'painted_timber' if ob.name.startswith(('da-works-ENTRANCE','DA_E_YARD-ENTRANCE')) else 'aged_timber' if ob.name.startswith('G_DA') else 'timber'
            finish(ob,family,.95+.05*(sum(ob.name.encode())%7)/6)

    # Existing pairs gain real frame/rail relief while all aperture datums stay fixed.
    for face in area['faces']:
        for parcel in face['parcels']:
            for o in parcel['openings']:
                depth=-o['depthM']+.04
                for ob in G.bpy.context.scene.objects:
                    if not ob.name.startswith(o['id']+'-'):continue
                    if '-leaf-board' in ob.name:
                        low=min(v.co.y for v in ob.data.vertices);high=max(v.co.y for v in ob.data.vertices)
                        for v in ob.data.vertices:
                            if abs(v.co.y-low)<1e-6:v.co.y-=.001
                            elif abs(v.co.y-high)<1e-6:v.co.y+=.001
                        tools.member_uv(ob)
                    if not any(k in ob.name for k in ('-frame-','-leaf-stile','-leaf-rail')):continue
                    for v in ob.data.vertices:
                        out=(v.co.x+G.ORIGIN[0]-face['wallPlaneM'])*(1 if face['face']=='west' else -1)
                        if abs(out-depth)<1e-5:v.co.x+=(.019 if '-frame-' in ob.name else .027)*(1 if face['face']=='west' else -1)
                    ob.data.update();tools.member_uv(ob)
                    bevel=ob.modifiers.new('Dressed timber arris','BEVEL');bevel.width=.003;bevel.segments=2
    window=recipe['preparationWindow'];o=next(o for f in area['faces'] for p in f['parcels'] for o in p['openings'] if o['id']==window['opening'])
    l=o['alongM']-o['widthM']/2;r=o['alongM']+o['widthM']/2;depth=-o['depthM']+.04;leaf=(o['widthM']-.16)/3;hinge=l+.083
    pivot=Vector(G.local(G.coords('west',46,hinge,depth+.032,0)));rotation=Matrix.Rotation(math.radians(window['leftLeafAngleDeg']),3,'Z')
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith(o['id']+'-') or not any(k in ob.name for k in ('-leaf-','-latch')):continue
        along=sum(G.ORIGIN[1]-v.co.y for v in ob.data.vertices)/len(ob.data.vertices)
        if along>=l+.08+leaf:continue
        for v in ob.data.vertices:v.co=pivot+rotation@(v.co-pivot)
        ob.data.update()
    finish(G.bpy.data.objects[o['id']+'-back'],'aged_timber',window['backingFactor'])
    back,front=window['frontLiningOutM']
    for L,R in ((l+.015,l+.085),(r-.085,r-.015)):
        finish(G.part('west',46,'P3-DA-prep-lining-jamb',(L,back,o['sillM']+.02),(R,front,o['headM']-.07),G.WOOD,'cast',.004),'timber')
    finish(G.part('west',46,'P3-DA-prep-lining-head',(l+.015,back,o['headM']-.09),(r-.015,front,o['headM']-.015),G.WOOD,'cast',.004),'timber')
    for z in (o['sillM']+.26,o['headM']-.36):
        G.part('west',46,'P3-DA-prep-hinge-plate',(hinge-.016,depth+.003,z),(hinge+.05,depth+.034,z+.10),G.IRON,'cast',.003)
        G.member('P3-DA-prep-hinge-pin',G.coords('west',46,hinge,depth+.032,z-.008),G.coords('west',46,hinge,depth+.032,z+.108),.018,G.IRON)

    # Rebuild the existing vat inside its exact vessel envelope with a rolled rim.
    group=area['activityGroups'][0];parts=group['instanceLayout']['parts'];item=next(p for p in parts if p['id']=='dye-vessel');op=next(o for p in G.PARCELS.values() for o in p['openings'] if o['id']==group['receiverOpening'])
    name=group['id']+'-'+item['id'];lo=item['localBox']['min'];hi=item['localBox']['max'];a=op['alongM'];deck=group['bbox']['min'][2]
    for ob in list(G.bpy.context.scene.objects):
        if ob.name.startswith(name):G.bpy.data.objects.remove(ob,do_unlink=True)
    cx=a+(lo[0]+hi[0])/2;cy=(lo[1]+hi[1])/2;rx=(hi[0]-lo[0])/2;ry=(hi[1]-lo[1])/2;bottom=deck+lo[2];height=hi[2]-lo[2]
    profile=[(0,0),(.68,0),(.72,.045),(.87,.13),(.98,.48),(.94,.88),(.98,.935),(1,.955),(1,.985),(.97,1),(.89,1),(.875,.97),(.89,.925),(.865,.50),(.72,.12),(0,.12)]
    vertices=[G.coords('east',53,cx+rx*radius*math.cos(i*math.tau/40),cy+ry*radius*math.sin(i*math.tau/40),bottom+height*z) for radius,z in profile for i in range(40)]
    faces=[(j*40+i,j*40+(i+1)%40,(j+1)*40+(i+1)%40,(j+1)*40+i) for j in range(len(profile)-1) for i in range(40)]
    vat=pigment(G.mesh(name,vertices,faces,G.WOOD,'cast',True),'sand',recipe['vat']['bodyColorSrgb'])
    stoneware=vat.data.materials[0].copy();stoneware.name='bz20_dyers_stoneware';vat.data.materials[0]=stoneware
    for node in stoneware.node_tree.nodes:
        if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.22
        if node.type=='MATH' and node.operation=='MULTIPLY':node.inputs[1].default_value=.77
    stain=recipe['vat']['innerStainColorSrgb'];target=private['sand']['bz07TargetMeanLinear']
    stain_rgb=[G._linear_channel(int(stain[i:i+2],16))/target[k] for k,i in enumerate((1,3,5))]
    assert all(0<=v<=1 for v in stain_rgb)
    for index,c in enumerate(vat.data.color_attributes['COLOR_0'].data):
        if index//40>=10:c.color=(*stain_rgb,1)
    companion=G.bpy.data.objects[group['id']+'-lidded-vessel'];pigment(companion,'sand',recipe['vat']['companionColorSrgb']);companion.data.materials[0]=stoneware;companion['bz04Shadow']='cast'
    liquid=G.bpy.data.materials.new('bz20_dyers_indigo_bath');liquid.use_nodes=True;shader=liquid.node_tree.nodes['Principled BSDF'];color=recipe['vat']['dyeColorSrgb'];shader.inputs['Base Color'].default_value=tuple(G._linear_channel(int(color[i:i+2],16)) for i in (1,3,5))+(1,);shader.inputs['Roughness'].default_value=.24;shader.inputs['Metallic'].default_value=0;G.MATS[liquid.name]=liquid
    liquid_z=bottom+height-recipe['vat']['liquidBelowRimM'];verts=[G.coords('east',53,cx+rx*.865*math.cos(i*math.tau/40),cy+ry*.865*math.sin(i*math.tau/40),liquid_z) for i in range(40)]
    ob=G.mesh(name+'-contained-dye',verts,[tuple(range(40)),tuple(reversed(range(40)))],liquid.name,'receive')
    # Solve the lean from the actual inner floor and rim, allowing for the
    # blade's lower corner and the handle's 13 mm half-thickness.
    G.bpy.context.view_layer.update()
    start=Vector(G.local(G.coords('east',53,cx,cy,bottom+height+.1)))
    hit,foot,_,_=vat.ray_cast(start,Vector((0,0,-1)),distance=height+.2)
    assert hit,'Paddle requires a solid vat floor'
    floor_z=foot.z+G.ORIGIN[2]
    # Stay just below the rim edge so the ray does not depend on vertex precision.
    start=Vector(G.local(G.coords('east',53,cx,cy,bottom+height-.0001)))
    hit,rim,_,_=vat.ray_cast(start,Vector((0,-1,0)),distance=rx*1.1)
    assert hit,'Paddle requires an inner rim bearing'
    rim_along=G.ORIGIN[1]-rim.y;rim_z=rim.z+G.ORIGIN[2];base_along=cx-.06
    low,high=0,math.pi/3
    for _ in range(32):
        angle=(low+high)/2
        error=(rim_along-base_along)*math.cos(angle)-(rim_z-floor_z)*math.sin(angle)+.045*math.sin(angle)**2-.013
        if error>0:low=angle
        else:high=angle
    angle=(low+high)/2;along=Vector((math.sin(angle),math.cos(angle)));across=Vector((-along.y,along.x))
    p=Vector((base_along,floor_z+.045*along.x))
    q=p+along*((deck+recipe['vat']['paddleTopAboveDeckM']-p.y)/along.y)
    poly=[tuple(p+across*.045),tuple(p-across*.045),tuple(p+along*.24-across*.055),tuple(p+along*.24+across*.055)]
    finish(G.prism_profile('P3-DA-work-paddle-blade','east',53,poly,cy-.009,cy+.009,G.WOOD),'worktop')
    handle=p+along*.20
    finish(G.member('P3-DA-work-paddle-handle',G.coords('east',53,handle.x,cy,handle.y),G.coords('east',53,q.x,cy,q.y),.026,G.WOOD),'worktop')
    # Knees connect the existing drying rail to its grounded posts.
    group=area['activityGroups'][1];op=next(o for p in G.PARCELS.values() for o in p['openings'] if o['id']==group['receiverOpening']);a=op['alongM'];deck=group['bbox']['min'][2]
    for sign in (-1,1):
        finish(G.member('P3-DA-sample-rack-knee',G.coords('east',53,a+sign*.825,-.265,deck+1.98),G.coords('east',53,a+sign*.59,-.265,deck+2.31),.045,G.WOOD),'aged_timber')
    return tools


def finish_fixture(area):
    from mathutils import Vector
    for ob in G.bpy.context.scene.objects:
        if ob.type=='MESH':G.prepare_mesh(ob)
    S.validate_objects(area);clear=area['clearRouteRegion'];groups=area['activityGroups']
    for ob in G.bpy.context.scene.objects:
        if ob.type!='MESH':continue
        for v in ob.data.vertices:
            x,y,z=v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]
            assert not (clear['x']<x<clear['x']+clear['w'] and clear['y']<y<clear['y']+clear['h'] and 0<z<2.2),('Dyers finish intrudes into lane',ob.name)
            group=groups[0] if ob.name.startswith('P3-DA-work-') else groups[1] if ob.name.startswith('P3-DA-sample-') else None
            if group:assert all(group['bbox']['min'][i]-.001<=value<=group['bbox']['max'][i]+.001 for i,value in enumerate((x,y,z))),('Dye tools leave work bay',ob.name)
    assert not any(ob.name.startswith(prefix) for ob in G.bpy.context.scene.objects for prefix in area['artDirectionFinish']['retireFinishPrefixes'])
    group=groups[0];item=next(p for p in group['instanceLayout']['parts'] if p['id']=='dye-vessel');op=next(o for p in G.PARCELS.values() for o in p['openings'] if o['id']==group['receiverOpening']);a=op['alongM'];lo,hi=item['localBox']['min'],item['localBox']['max'];cx=a+(lo[0]+hi[0])/2;out=(lo[1]+hi[1])/2
    vat=G.bpy.data.objects[group['id']+'-dye-vessel'];start=Vector(G.local(G.coords('east',53,cx,out,1.4)))
    hit,point,_,_=vat.ray_cast(start,Vector((0,0,-1)),distance=2);assert hit and abs(point.z+G.ORIGIN[2]-(group['bbox']['min'][2]+lo[2]+.12*(hi[2]-lo[2])))<1e-5,'Vat lost its hollow interior'
    liquid=G.bpy.data.objects[vat.name+'-contained-dye'];expected=group['bbox']['min'][2]+hi[2]-area['artDirectionFinish']['vat']['liquidBelowRimM'];assert all(abs(v.co.z+G.ORIGIN[2]-expected)<1e-5 for v in liquid.data.vertices)
    blade=G.bpy.data.objects['P3-DA-work-paddle-blade'];handle=G.bpy.data.objects['P3-DA-work-paddle-handle']
    lowest=min(v.co.z for v in blade.data.vertices);floor_errors=[]
    for v in blade.data.vertices:
        if abs(v.co.z-lowest)>1e-6:continue
        hit,bearing,_,_=vat.ray_cast(v.co+Vector((0,0,.02)),Vector((0,0,-1)),distance=.04)
        assert hit,'Paddle lower edge has no vat-floor receiver'
        floor_errors.append((bearing-v.co).length)
    assert len(floor_errors)>=2 and max(floor_errors)<1e-5,('Paddle blade floats above vat floor',floor_errors)
    rim_z=group['bbox']['min'][2]+hi[2]-.0001
    hit,rim,_,_=vat.ray_cast(Vector(G.local(G.coords('east',53,cx,out,rim_z))),Vector((0,-1,0)),distance=1)
    assert hit,'Missing inner rim contact probe'
    hit,bearing,_,_=handle.ray_cast(rim+Vector((0,-.02,0)),Vector((0,1,0)),distance=.04)
    assert hit and (bearing-rim).length<1e-4,('Paddle shaft lacks rim bearing',None if not hit else (bearing-rim).length)
    print('PASS paddle bearings: floor max error',max(floor_errors),'m; inner rim error',(bearing-rim).length,'m; floor elevation',lowest+G.ORIGIN[2],flush=True)
    prep=next(o for p in G.PARCELS.values() for o in p['openings'] if o['id']=='da-works-L1-W2');panels=[ob for ob in G.bpy.context.scene.objects if ob.name.startswith(prep['id']+'-leaf-panel')];assert len(panels)==3
    assert abs(min(v.co.z+G.ORIGIN[2] for ob in panels for v in ob.data.vertices)-(prep['sillM']+.08))<1e-5
    assert abs(max(v.co.z+G.ORIGIN[2] for ob in panels for v in ob.data.vertices)-(prep['headM']-.08))<1e-5
    assert G.bpy.data.objects.get(prep['id']+'-back') and len([ob for ob in G.bpy.context.scene.objects if ob.name.startswith('P3-DA-prep-hinge-pin')])==2
    print('PASS Dyers art: hollow rolled-rim vat/contained bath, grounded sample folds, fixed window datums/opaque back, supported tools and clear lane',flush=True)


def build(saved,export=True):
    area=validate(saved);setup(saved);shells(area)
    for group in area['activityGroups']:activity(group)
    for fixture in area['fixtures']:G.awning(fixture)
    verify_geometry(area)
    if export:
        tools=art_finish(area);verify_geometry(area);prepare=G.prepare_mesh
        for ob in G.bpy.context.scene.objects:
            if ob.type=='MESH':prepare(ob)
        recipe=area['artDirectionFinish'];tools.bake_contact_occlusion(G.__dict__,recipe['contactRadiusM'],recipe['contactStrength'],subdivision_prefixes=('DA_E_WORK_RECESS','DA_E_SAMPLE_RECESS'))
        G.prepare_mesh=lambda ob:None
        try:G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],{'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})
        finally:G.prepare_mesh=prepare


def input_fixture(saved):
    validate(saved)
    for mutation in [lambda p:p.update(unit='wrong-unit'),lambda p:p['areas'][0].update(floorMaterialId='tampered')]:
        bad=copy.deepcopy(saved);mutation(bad)
        try:validate(bad,saved)
        except ValueError:pass
        else:raise AssertionError('Invalid frozen input accepted')
    bad=copy.deepcopy(saved);bad['requiredCapabilities']['partKinds'].append('unknown-part');bad['inputSha256']=S.digest(bad)
    try:validate(bad,bad)
    except AssertionError:pass
    else:raise AssertionError('Unknown part accepted')
    print('PASS Dyers Alley input fixtures: exact issue, tampering and unsupported parts')


def self_test(saved):
    input_fixture(saved);build(saved,False);area=saved['areas'][0]
    from mathutils import Vector
    for ob in G.bpy.context.scene.objects:G.prepare_mesh(ob)
    assert len([p for f in area['faces'] for p in f['parcels']])==6
    assert len([o for f in area['faces'] for p in f['parcels'] for o in p['openings']])==16
    assert sum(len(g['instanceLayout']['parts']) for g in area['activityGroups'])==17
    for group in area['activityGroups']:
        op=next(o for f in area['faces'] for p in f['parcels'] for o in p['openings'] if o['id']==group['receiverOpening'])
        start=Vector(G.local((54,op['alongM'],2.5)));hits=[]
        for ob in G.bpy.context.scene.objects:
            if not ob.name.startswith(op['id']+'-'):continue
            hit,point,normal,index=ob.ray_cast(start,Vector((0,0,1)),distance=.5)
            if hit:hits.append((point.z,ob.name))
        assert sorted(hits)[0][1]==op['id']+'-chamber-ceiling' and sum(abs(z-2.75)<1e-5 for z,name in hits)==1,'Duplicate chamber ceiling'
    sample=[ob for ob in G.bpy.context.scene.objects if ob.name.startswith('DA_E_SAMPLE_RECESS-')]
    for y in (20.15,22.89):
        start=Vector(G.local((52.9,y,2.29)));hits=[]
        for ob in sample:
            hit,point,normal,index=ob.ray_cast(start,Vector((1,0,0)),distance=.5)
            if hit:hits.append((point.x+G.ORIGIN[0],ob.name))
        assert abs(min(x for x,name in hits)-53)<1e-5 and sum(abs(x-53)<1e-5 for x,name in hits)==1,'Open or duplicated spring join'
    group=area['activityGroups'][0]
    for item in group['instanceLayout']['parts']:
        if item['kind'] not in {'rounded-ceramic-vessel','lidded-ceramic-vessel'}:continue
        ob=G.bpy.data.objects[group['id']+'-'+item['id']];lo=item['localBox']['min'];hi=item['localBox']['max'];a=12.88+(lo[0]+hi[0])/2;out=(lo[1]+hi[1])/2
        hit,point,normal,index=ob.ray_cast(Vector(G.local(G.coords('east',53,a,out,2))),Vector((0,0,-1)),distance=2)
        target=.04+(lo[2]+.12*(hi[2]-lo[2]) if item['kind']=='rounded-ceramic-vessel' else hi[2])
        assert hit and abs(point.z-target)<1e-5,('Vessel interior/lid invalid',item['id'])
    objects=list(G.bpy.context.scene.objects)
    assert len([o for o in objects if o.name.startswith('da-works-L1-W2-leaf-panel')])==3
    for ident in ('da-house-L1-W1','da-house-L1-W2','da-house-L1-W3'):
        assert len([o for o in objects if o.name.startswith(ident+'-leaf-panel')])==2
    for prefix in ('G_DA_E_WORK_RECESS-side-table','G_DA_E_SAMPLE_RECESS-folding-bench'):
        legs=[o for o in objects if o.name.startswith(prefix+'-leg')];assert len(legs)==4
        assert abs(min(v.co.z for o in legs for v in o.data.vertices)-.04)<1e-5
    shade=area['fixtures'][0]
    for ob in objects:
        if not ob.name.startswith(shade['id']+'-'):continue
        for v in ob.data.vertices:
            world=(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]);box=shade['clothBbox'] if '-cloth' in ob.name else shade['bbox']
            assert all(box['min'][i]-.001<=world[i]<=box['max'][i]+.001 for i in range(3))
    art_finish(area);finish_fixture(area)
    print('PASS Dyers: 16 openings, 17 bounded parts, two framed gates, hollow/lidded vessels, tied samples, grounded furniture and separate chamber ceilings',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('mode',choices=['build','self-test','input-fixture'],nargs='?',default='build');parser.add_argument('--handoff',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None);saved=json.loads(args.handoff.read_text())
    {'build':build,'self-test':self_test,'input-fixture':input_fixture}[args.mode](saved)
