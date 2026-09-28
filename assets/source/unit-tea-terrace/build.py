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
        extract=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']
        spine=extract('unit-service-north')['areas'][0]
        link=extract('unit-link-north-west')['areas'][0]
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
            rim=.004/((hi[0]-lo[0])/2)
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


def grade_handrail(area,rail,prefix,wall_surface=0):
    """A real wall-mounted rail; stairs can recess it behind the clear-volume plane."""
    face=rail['receiverFace'];plane=rail['wallPlaneM'];low,high=rail['alongM'];wood=[]
    def point(along,out):return G.coords(face,plane,along,out,floor_at(area,along)+rail['heightAboveFloorM'])
    for name,p,q in [('run',point(low,rail['projectionM']),point(high,rail['projectionM'])),
                     ('south-return',point(low,wall_surface-.05),point(low,rail['projectionM'])),
                     ('north-return',point(high,rail['projectionM']),point(high,wall_surface-.05))]:
        ob=G.member(prefix+'-'+name,p,q,rail['widthM'],G.WOOD);wood.append(ob)
        bevel=ob.modifiers.new('Rounded hand-worn rail','BEVEL');bevel.width=.012;bevel.segments=3
    for along in rail['bracketStationsM']:
        height=floor_at(area,along)+rail['heightAboveFloorM']
        G.part(face,plane,prefix+'-wall-plate',(along-.035,wall_surface-.05,height-.16),(along+.035,wall_surface+.008,height+.012),G.IRON,'cast',.004)
        G.member(prefix+'-bracket',G.coords(face,plane,along,wall_surface+.003,height-.11),
            G.coords(face,plane,along,rail['projectionM'],height-rail['widthM']/2),.024,G.IRON)
    return wood


def ramp_art_finish(area):
    """Finish the Ramp's existing rear facade and add its supported grade rail."""
    from mathutils import Matrix, Vector
    from bazaar_finish import apply
    apply(G.__dict__,G.OUT/'unit-tea-ramp.glb')
    recipe=area['artDirectionFinish']
    assert recipe['id']=='TEA-RAMP-P3'
    spec=importlib.util.spec_from_file_location('tea_ramp_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)
    private=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz16_tea_ramp_')

    def finish(ob,family,factor=1):
        ob.data.materials.clear();ob.data.materials.append(private[family])
        old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
        for item in colors.data:item.color=(factor,factor,factor,1)
        ob.data.color_attributes.active_color=colors
        if family in {'timber','aged_timber','painted_timber','worktop'}:tools.member_uv(ob)
        else:G.world_uv(ob,float(private[family]['tileSizeM']))
        return ob

    for ob in list(G.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        if any(ob.name.startswith(prefix) for prefix in recipe['retireFinishPrefixes']):
            G.bpy.data.objects.remove(ob,do_unlink=True);continue
        material=ob.data.materials[0];source=material.get('bz04SourceMaterial',material.name)
        if any(key in source for key in ('plaster','beige')):finish(ob,'plaster')
        elif any(key in source for key in ('timber','wood','plank','pine')):finish(ob,'timber',.95+.05*(sum(ob.name.encode())%7)/6)

    windows=[o for f in area['faces'] for parcel in f['parcels'] for o in parcel['openings']]
    joinery=recipe['joinery']
    for o in windows:
        depth=-o['depthM']+.04
        for ob in list(G.bpy.context.scene.objects):
            if not ob.name.startswith(o['id']+'-'):continue
            is_frame='-frame-' in ob.name
            if not is_frame and not any(key in ob.name for key in ('-leaf-stile','-leaf-rail')):continue
            advance=joinery['frameAdvanceM'] if is_frame else joinery['leafAdvanceM']
            for v in ob.data.vertices:
                out=o['receiverPlaneM']-(v.co.x+G.ORIGIN[0])
                if abs(out-depth)<1e-5:v.co.x-=advance
            ob.data.update()
            tools.member_uv(ob)
            bevel=ob.modifiers.new('Eased shutter joinery','BEVEL');bevel.width=joinery['arrisM'];bevel.segments=2
        # The closing batten belongs to the left leaf; the right leaf can swing.
        finish(G.part('east',o['receiverPlaneM'],o['id']+'-P3-meeting-batten',
            (o['alongM']-.019,depth+.012,o['sillM']+.08),
            (o['alongM']+.019,depth+.040,o['headM']-.08),G.WOOD,'cast',.003),'timber')

    working=recipe['workingWindow'];o=next(o for o in windows if o['id']==working['opening'])
    depth=-o['depthM']+.04;hinge=o['alongM']+o['widthM']/2-.083
    pivot=Vector(G.local(G.coords('east',o['receiverPlaneM'],hinge,depth+.032,0)))
    rotation=Matrix.Rotation(math.radians(working['rightLeafAngleDeg']),3,'Z')
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith(o['id']+'-') or not any(key in ob.name for key in ('-leaf-','-latch')):continue
        along=sum(G.ORIGIN[1]-v.co.y for v in ob.data.vertices)/len(ob.data.vertices)
        if along<=o['alongM']:continue
        for vertex in ob.data.vertices:vertex.co=pivot+rotation@(vertex.co-pivot)
        ob.data.update()
        # Keep pre-rotation member UVs attached to the timber as the leaf swings.
    finish(G.bpy.data.objects[o['id']+'-back'],'timber',working['backingFactor'])
    for z in (o['sillM']+.26,o['headM']-.36):
        G.part('east',o['receiverPlaneM'],o['id']+'-P3-hinge-plate',
            (hinge-.045,depth+.002,z),(hinge+.018,depth+.034,z+.1),G.IRON,'cast',.003)
        pin=G.member(o['id']+'-P3-hinge-pin',G.coords('east',o['receiverPlaneM'],hinge,depth+.032,z-.007),
            G.coords('east',o['receiverPlaneM'],hinge,depth+.032,z+.107),.018,G.IRON)
        bevel=pin.modifiers.new('Rounded hinge pin','BEVEL');bevel.width=.006;bevel.segments=2

    for ob in grade_handrail(area,recipe['handrail'],'P3-TR-handrail'):finish(ob,'timber')
    return tools


def ramp_finish_fixture(area):
    """Check actual grade/clearance and the retained opaque working-window back."""
    from mathutils import Vector
    recipe=area['artDirectionFinish'];rail=recipe['handrail'];origin=area['sectionOriginDesign']
    objects=[ob for ob in G.bpy.context.scene.objects if ob.type=='MESH']
    for ob in objects:G.prepare_mesh(ob)
    for ob in objects:
        if not ob.name.startswith('P3-TR-handrail-'):continue
        for vertex in ob.data.vertices:
            x,y,z=vertex.co.x+origin['x'],origin['y']-vertex.co.y,vertex.co.z+origin['z']
            assert 10.949<=x<=11.18 and 48.5<=y<=55.5,('Handrail enters route or end mouth',ob.name,x,y)
            assert .80<=z-floor_at(area,y)<=1.055,('Handrail loses grade contact',ob.name,y,z)
            if ob.name in {'P3-TR-handrail-run','P3-TR-handrail-south-return','P3-TR-handrail-north-return'}:
                assert abs(z-floor_at(area,y)-rail['heightAboveFloorM'])<=rail['widthM'],('Rail no longer follows actual grade',ob.name,y,z)
    assert sum(ob.name.startswith('P3-TR-handrail-wall-plate') for ob in objects)==len(rail['bracketStationsM'])
    assert sum(ob.name.startswith('P3-TR-handrail-bracket') for ob in objects)==len(rail['bracketStationsM'])
    for o in (o for f in area['faces'] for p in f['parcels'] for o in p['openings']):
        panels=[ob for ob in objects if ob.name.startswith(o['id']+'-leaf-panel')]
        assert len(panels)==2 and all(ob.data.materials[0].name=='bz16_tea_ramp_timber' for ob in panels)
        assert abs(min(v.co.z+origin['z'] for ob in panels for v in ob.data.vertices)-(o['sillM']+.08))<1e-5
        assert abs(max(v.co.z+origin['z'] for ob in panels for v in ob.data.vertices)-(o['headM']-.08))<1e-5
    o=next(o for f in area['faces'] for p in f['parcels'] for o in p['openings'] if o['id']==recipe['workingWindow']['opening'])
    back=G.bpy.data.objects[o['id']+'-back'];point=Vector(G.local(G.coords('east',o['receiverPlaneM'],o['alongM']+.08,.3,(o['sillM']+o['headM'])/2)))
    assert back.ray_cast(point,Vector((1,0,0)),distance=1)[0],'Working window lost its opaque back'
    assert sum(ob.name.startswith(o['id']+'-P3-hinge-pin') for ob in objects)==2
    print('PASS Ramp art: supported 1 m grade rail outside x13..17 route and both mouths; three paired shutters keep datums; ajar leaf retains opaque back and two hinges',flush=True)


def stairs_art_finish(area):
    """Keep the broad descent open while completing its retaining wall and vents."""
    from bazaar_finish import apply
    apply(G.__dict__,G.OUT/'unit-tea-stairs.glb');recipe=area['artDirectionFinish']
    spec=importlib.util.spec_from_file_location('tea_stairs_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)
    private=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz18_tea_stairs_')
    def finish(ob,family):
        ob.data.materials.clear();ob.data.materials.append(private[family])
        old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
        for item in colors.data:item.color=(1,1,1,1)
        ob.data.color_attributes.active_color=colors
        if family=='timber':tools.member_uv(ob)
        else:G.world_uv(ob,float(private[family]['tileSizeM']))
        return ob
    for ob in list(G.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        material=ob.data.materials[0];source=material.get('bz04SourceMaterial',material.name)
        if any(k in source for k in ('plaster','beige')):finish(ob,'plaster')
        elif any(k in source for k in ('timber','wood','plank','pine')):finish(ob,'timber')
    for o in (o for f in area['faces'] for p in f['parcels'] for o in p['openings']):
        front=-o['depthM']+.04
        for ob in G.bpy.context.scene.objects:
            if not ob.name.startswith(o['id']+'-frame-'):continue
            for v in ob.data.vertices:
                if abs(o['receiverPlaneM']-(v.co.x+G.ORIGIN[0])-front)<1e-5:v.co.x-=recipe['ventFrameAdvanceM']
            ob.data.update();tools.member_uv(ob)
            bevel=ob.modifiers.new('Eased stock-room vent frame','BEVEL');bevel.width=.003;bevel.segments=2
    for ob in grade_handrail(area,recipe['handrail'],'P3-TS-handrail',-recipe['retainingRecessM']):finish(ob,'timber')
    return tools


def stairs_finish_fixture(area):
    from mathutils import Vector
    recipe=area['artDirectionFinish'];rail=recipe['handrail'];origin=area['sectionOriginDesign']
    for ob in G.bpy.context.scene.objects:
        if ob.type=='MESH':G.prepare_mesh(ob)
        if not ob.name.startswith('P3-TS-handrail'):continue
        for v in ob.data.vertices:
            x,y,z=v.co.x+origin['x'],origin['y']-v.co.y,v.co.z+origin['z']
            assert x<11 and 66.4<y<71.6,('Rail obstructs full-width stair route',ob.name,x,y)
            assert .94<z-floor_at(area,y)<1.2,('Rail lost its nosing pitch',ob.name,y,z)
    fields=[ob for ob in G.bpy.context.scene.objects if ob.name.startswith('ts-w-field')]
    point=Vector(G.local((11.1,69,2.2)));hits=[]
    for ob in fields:
        hit,where,normal,index=ob.ray_cast(point,Vector((-1,0,0)),distance=.4)
        if hit:hits.append(where.x+origin['x'])
    assert hits and abs(max(hits)-(11-recipe['retainingRecessM']))<1e-5,'Rail pocket is not recessed behind the full clear width'
    print('PASS Stairs art: entire handrail behind x11 clear plane; real recessed receiver and retained nosing pitch',flush=True)


def landing_art_finish(area):
    """Finish the empty turn as a repaired enclosure, with no new frontage."""
    from bazaar_finish import apply
    apply(G.__dict__,G.OUT/'unit-tea-landing.glb')
    recipe=area['artDirectionFinish']
    spec=importlib.util.spec_from_file_location('tea_landing_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)
    materials=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz19_tea_landing_')
    for ob in G.bpy.context.scene.objects:
        if ob.type!='MESH':continue
        material=ob.data.materials[0]
        source=material.get('bz04SourceMaterial',material.name)
        if 'plastered_wall' not in source:continue
        ob.data.materials.clear();ob.data.materials.append(materials['sand'])
        colors=ob.data.color_attributes.get('COLOR_0')
        if colors:
            for item in colors.data:item.color=(1,1,1,1)
        G.world_uv(ob,float(materials['sand']['tileSizeM']))
    stone=G.mat('ph_bz04_trim_sanded_01').copy();stone.name='bz19_landing_dressed_coping'
    G.MATS[stone.name]=stone
    bottom,top=recipe['copingCourseZM'];gap=recipe['copingJointM']
    for face in area['faces']:
        for parcel in face['parcels']:
            left,right=parcel['interval'];count=round((right-left)/.8)
            for index in range(count):
                lo=left+(right-left)*index/count;hi=left+(right-left)*(index+1)/count
                # Only the upper cornice projects: the complete 2.2 m clear turn stays empty.
                ob=G.part(face['face'],face['wallPlaneM'],'P3-TL-'+parcel['id']+'-coping',
                          (lo+gap/2,.001,bottom),(hi-gap/2,.045,top),stone.name,'cast',.008)
                G.paint_object(ob,('#b6aa91','#bfb29a','#afa38b')[index%3]);G.world_uv(ob,.6)
    return tools


def landing_finish_fixture(area):
    """Keep both mouth intervals and the complete landing clear after finishing."""
    from mathutils import Vector
    for ob in G.bpy.context.scene.objects:
        if ob.type!='MESH':continue
        G.prepare_mesh(ob)
        for v in ob.data.vertices:
            x,y,z=v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]
            assert not (11.001<x<18.999 and 72.001<y<76.499 and z<2.2),('Landing clear turn obstruction',ob.name,x,y,z)
    for prefix,start,direction,expected,axis in (
        ('tl-w-field',(11.1,74,2),(-1,0,0),10.86,0),
        ('tl-n-field',(18,76.3,2),(0,-1,0),76.6,1)):
        hits=[]
        for ob in G.bpy.context.scene.objects:
            if not ob.name.startswith(prefix):continue
            hit,point,normal,index=ob.ray_cast(Vector(G.local(start)),Vector(direction),distance=.5)
            if hit:hits.append(point.x+G.ORIGIN[0] if axis==0 else G.ORIGIN[1]-point.y)
        assert hits and abs(hits[0]-expected)<1e-5,('Landing recess missing',prefix,hits)
    print('PASS Landing finish: 140 mm retaining recess, 100 mm lime field; all low geometry outside the full clear turn',flush=True)


def terrace_art_finish(area):
    """Complete the tea service, shaded seat and upper household gallery."""
    from bazaar_finish import apply
    apply(G.__dict__,G.OUT/'unit-tea-terrace.glb');recipe=area['artDirectionFinish']
    spec=importlib.util.spec_from_file_location('tea_terrace_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)
    private=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz17_tea_terrace_')
    spec=importlib.util.spec_from_file_location('tea_counter_craft',ROOT/'assets/source/unit-textile-arcade/build.py')
    craft=importlib.util.module_from_spec(spec);spec.loader.exec_module(craft);craft.G=G;craft.S.G=G
    group=area['activityGroups'][0];counter=next(p for p in group['instanceLayout']['parts'] if p['kind']=='grounded-counter-carcass')
    for ob in list(G.bpy.context.scene.objects):
        if ob.name.startswith(group['id']+'-'+counter['id']):G.bpy.data.objects.remove(ob,do_unlink=True)
    one=dict(group,instanceLayout={'parts':[counter]});one.pop('sign',None);craft.activity(one)
    def finish(ob,family,factor=1):
        ob.data.materials.clear();ob.data.materials.append(private[family])
        old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
        for item in colors.data:item.color=(factor,factor,factor,1)
        ob.data.color_attributes.active_color=colors
        if family in {'timber','aged_timber','painted_timber','worktop'}:tools.member_uv(ob)
        else:G.world_uv(ob,float(private[family]['tileSizeM']))
        return ob
    brass=G.mat('bz04_brass_project_original').copy();brass.name='bz17_tea_brass'
    shader=brass.node_tree.nodes['Principled BSDF'];shader.inputs['Roughness'].default_value=.35;shader.inputs['Metallic'].default_value=.8;G.MATS[brass.name]=brass
    ceramic=G.mat('bz04_ceramic_project_original').copy();ceramic.name='bz17_tea_porcelain'
    shader=ceramic.node_tree.nodes['Principled BSDF'];shader.inputs['Roughness'].default_value=.28;G.MATS[ceramic.name]=ceramic
    for ob in list(G.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        # The original 15 mm deep, 7.5 mm half-joints alias as black dashes.
        # Fill their existing geometry flush, preserving the ownership and finish change.
        joint=recipe['filledPartyJoint']
        if ob.name.startswith(('tt-e-field','tt-rug-return-field','tt-e-party-joint','tt-rug-return-party-joint')):
            along=[G.ORIGIN[1]-v.co.y for v in ob.data.vertices]
            if min(along)<=joint['alongM']+.01 and max(along)>=joint['alongM']-.01:
                if 'party-joint' in ob.name:
                    G.bpy.data.objects.remove(ob,do_unlink=True);continue
                for v in ob.data.vertices:
                    if abs(v.co.x+G.ORIGIN[0]-19.015)<1e-5:v.co.x=19+joint['depthM']-G.ORIGIN[0]
                ob.data.update()
        material=ob.data.materials[0];source=material.get('bz04SourceMaterial',material.name)
        if ob.name.startswith('G_tt-shop-tea-pot-'):
            ob.data.materials.clear();ob.data.materials.append(brass);ob['bz04Shadow']='cast'
        elif ob.name.startswith(('G_tt-shop-cup-','G_tt-shop-tea-stock-')):
            ob.data.materials.clear();ob.data.materials.append(ceramic)
            color='#ded7c6' if '-cup-' in ob.name else '#788879' if 'stock-2-' in ob.name else '#ba9b71'
            G.paint_object(ob,color);ob['bz04Shadow']='cast'
        elif any(k in source for k in ('plaster','beige')):finish(ob,'sand' if ob.name.startswith('tt-rug-return') else 'plaster')
        elif any(k in source for k in ('timber','wood','plank','pine')):
            family='worktop' if '-top-board' in ob.name else 'painted_timber' if ob.name.startswith('tt-e-STAFF-DOOR') else 'timber'
            finish(ob,family,.96+.04*(sum(ob.name.encode())%5)/4)
    def timber(name,lo,hi,family='timber'):
        return finish(G.part('east',19,'P3-TT-'+name,lo,hi,G.WOOD,'cast',.005),family)
    door=next(o for f in area['faces'] for p in f['parcels'] for o in p['openings'] if o['id']=='tt-e-STAFF-DOOR')
    c=-door['depthM']+.04;a=door['alongM']
    timber('staff-meeting-batten',(a-.025,c-.008,door['sillM']+.08),(a+.025,c+.03,door['headM']-.08),'painted_timber')
    gallery=recipe['gallery'];o=next(o for f in area['faces'] for p in f['parcels'] for o in p['openings'] if o['id']==gallery['opening'])
    for ob in list(G.bpy.context.scene.objects):
        if ob.name.startswith(o['id']+'-') and any(k in ob.name for k in ('-frame-','-leaf-','-hinge','-latch')):G.bpy.data.objects.remove(ob,do_unlink=True)
    finish(G.bpy.data.objects[o['id']+'-back'],'aged_timber',.42)
    L,R=o['alongM']-o['widthM']/2+.075,o['alongM']+o['widthM']/2-.075;out=gallery['railOutM'];bottom=o['sillM'];top=gallery['railTopM']
    timber('gallery-floor',(L,gallery['floorOutM'][0],bottom),(R,gallery['floorOutM'][1],bottom+.05),'aged_timber')
    for x in (L,L+(R-L)/3-.035,L+2*(R-L)/3-.035,R-.07):timber('gallery-post',(x,out-.04,bottom),(x+.07,out+.04,o['headM']-.055))
    for z in (bottom+.13,top-.075):timber('gallery-rail',(L,out-.055,z),(R,out+.055,z+.075),'worktop')
    for i in range(20):
        x=L+.12+i*(R-L-.24)/19
        timber('gallery-spindle',(x-.0175,out-.022,bottom+.2),(x+.0175,out+.022,top-.075))
    timber('gallery-head',(L,out-.055,o['headM']-.065),(R,out+.055,o['headM']))
    for a in (L,R-.09):timber('gallery-head-knee',(a,out-.04,o['headM']-.28),(a+.09,out+.04,o['headM']-.055))
    L,R=gallery['benchAlongM'];back,front=gallery['benchOutM'];seat=gallery['benchTopM']
    for x in (L+.1,(L+R)/2-.04,R-.18):timber('gallery-bench-leg',(x,back+.02,bottom+.05),(x+.08,front-.02,seat-.05))
    timber('gallery-bench-seat',(L,back,seat-.05),(R,front,seat),'aged_timber')
    for x in (L+.08,R-.14):timber('gallery-bench-upright',(x,back,bottom+.05),(x+.06,back+.04,seat+.42))
    for z in (seat+.12,seat+.32):timber('gallery-bench-back',(L,back,z),(R,back+.045,z+.075))
    # Backrest uprights bear on the existing lower seat frame, behind the cushion.
    seat=recipe['seatBack'];L,R=seat['alongM'];back,front=seat['outM'];top=seat['topZM']
    for x in (L,R-.055):timber('seat-back-upright',(x,back,1.72),(x+.055,front,top))
    for z in (2.09,2.25,top-.06):timber('seat-back-slat',(L,back,z),(R,front,z+.06),'timber')
    for index,(L,R) in enumerate(((59.97,60.37),(60.78,61.18))):
        S.soft_cloth('P3-TT-back-cushion-'+str(index),'east',19,(L,-.39,1.95),(R,-.27,2.21),G.WOOD,False)
    for ob in G.bpy.context.scene.objects:
        if ob.name.startswith('P3-TT-back-cushion'):
            finish(ob,'cloth',.73)
    tray=recipe['servingTray'];L,R=tray['alongM'];back,front=tray['outM'];z,Z=tray['zM']
    G.part('east',19,'P3-TT-serving-tray',(L,back,z),(R,front,z+.005),brass.name,'receive',.004)
    for low,high in [((L,back,z+.005),(R,back+.012,Z)),((L,front-.012,z+.005),(R,front,Z)),((L,back+.012,z+.005),(L+.012,front-.012,Z)),((R-.012,back+.012,z+.005),(R,front-.012,Z))]:G.part('east',19,'P3-TT-tray-rim',low,high,brass.name,'receive',.004)
    return tools


def terrace_finish_fixture(area):
    """Check the gallery, serving surface and lower seat without altering route authority."""
    for ob in G.bpy.context.scene.objects:
        if ob.type=='MESH':G.prepare_mesh(ob)
    clear=area['clearRouteRegion']
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith('P3-TT-'):continue
        for v in ob.data.vertices:
            x,y,z=v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]
            assert not (clear['x']<x<clear['x']+clear['w'] and clear['y']<y<clear['y']+clear['h'] and 1.441<z<3.6),('Tea finish obstructs route',ob.name)
    for ob in G.bpy.context.scene.objects:
        if ob.name.startswith('G_tt-shop-cup-1-'):
            assert abs(min(v.co.z+G.ORIGIN[2] for v in ob.data.vertices)-2.345)<1e-5,'Served cup is not seated on the tray'
    joint=area['artDirectionFinish']['filledPartyJoint'];joint_fields=[]
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith(('tt-e-field','tt-rug-return-field')):continue
        along=[G.ORIGIN[1]-v.co.y for v in ob.data.vertices]
        if min(along)>=joint['alongM']-.01 and max(along)<=joint['alongM']+.01:joint_fields.append(ob)
    assert joint_fields and all(abs(v.co.x+G.ORIGIN[0]-19)<1e-5 for ob in joint_fields for v in ob.data.vertices),'Filled ownership joint is not flush'
    assert not any(ob.name.startswith('TT-SITTING-GALLERY-leaf-') for ob in G.bpy.context.scene.objects)
    back=G.bpy.data.objects['TT-SITTING-GALLERY-back']
    assert min(v.co.x+G.ORIGIN[0] for v in back.data.vertices)>=20.05-1e-5
    assert len([ob for ob in G.bpy.context.scene.objects if ob.name.startswith('P3-TT-gallery-spindle')])==20
    assert len([ob for ob in G.bpy.context.scene.objects if ob.name.startswith('P3-TT-seat-back-upright')])==2
    print('PASS Terrace art: opaque recessed gallery, supported rails/benches and serving tray remain outside the protected passage',flush=True)


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
            terrace_art_finish(area);terrace_finish_fixture(area)

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
            ramp_art_finish(area)
            ramp_finish_fixture(area)
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
            stairs_art_finish(area);stairs_finish_fixture(area)
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
            landing_art_finish(area);landing_finish_fixture(area)
        S.validate_objects(area)
        print('PASS Tea geometry fixture',unit,'absolute asymmetric frame, graded foot or1.4m deck, explicit bounded part assemblies')
    else:
        tools={'unit-tea-ramp':ramp_art_finish,'unit-tea-terrace':terrace_art_finish,'unit-tea-stairs':stairs_art_finish,'unit-tea-landing':landing_art_finish}[unit](area);S.validate_objects(area)
        prepare=G.prepare_mesh
        for ob in G.bpy.context.scene.objects:
            if ob.type=='MESH':prepare(ob)
        recipe=area['artDirectionFinish'];tools.bake_contact_occlusion(G.__dict__,recipe['contactRadiusM'],recipe['contactStrength'])
        G.prepare_mesh=lambda ob:None
        # Keep the Landing export's existing embedded-material policy.
        if unit=='unit-tea-landing':G._strip_pack_images=lambda:None
        try:
            G.export(G.OUT/(unit+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
                     {'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})
        finally:G.prepare_mesh=prepare



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
