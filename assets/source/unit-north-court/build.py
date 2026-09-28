"""Build R7 North Court: complete households, hammam entrance and dye workroom."""
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
UNIT='unit-north-court'
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
S=module('north_court_receivers',ROOT/'assets/source/unit-spawn-a-courtyard/build.py')
F=module('north_court_civic_craft',ROOT/'assets/source/unit-fountain-court/build.py')
DYE=module('north_dye_members',ROOT/'assets/source/unit-dyers-alley/build.py')
G=None


def validate(saved,current=None):
    if saved.get('unit')!=UNIT or len(saved.get('areas',[]))!=1:raise ValueError('Expected North Court frozen unit')
    if S.digest(saved)!=saved.get('inputSha256'):raise ValueError('Frozen handoff contents do not match inputSha256')
    current=current or runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if current['inputSha256']!=saved['inputSha256']:raise ValueError('Area inputs changed since handoff extraction')
    area=saved['areas'][0];caps=saved['requiredCapabilities']
    assert area['zone']=='NORTH_COURT' and area['designRevision']['id'].startswith('R7')
    assert set(caps['openingProfiles'])<={'rectangular','pointed'}
    assert set(caps['openingCraftProfiles'])<={'painted-domestic','dressed-stone-portal'}
    assert set(caps['featureKinds'])=={'inscribed-panel'}
    assert set(caps['partKinds'])<={'stone-plinth','rounded-ceramic-vessel','lidded-ceramic-vessel','grounded-timber-table','folded-cloth','locked-timber-lattice-gate'}
    assert set(caps['glazingPatterns'])=={'plaster-tracery'} and not caps['landscapeKinds'] and not area['fixtures']
    assert set(caps['craftRecipes'])<={'CF-CERAMIC','CF-CLOTH','CF-DYE-VESSEL','CF-ENVELOPE','CF-FLOOR','CF-FURNITURE','CF-INSCRIPTION','CF-JOINT','CF-OPEN','CF-R4-GLASS','CF-R4-PORTAL','CF-STONE','CF-TIMBER'}
    return area


def setup(saved):
    global G
    G=S.geometry(saved);G.OUT=OUT;DYE.G=G;DYE.S=S
    F.B=G;F.A=saved['areas'][0];F.H=saved;F.BASE_OPENING=G.opening;F.BASE_CLOSURE=G.closure
    G.opening=F.opening;G.closure=closure
    origin=G.A['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ['x','y','z']))


def closure(face,plane,opening,top):
    if opening.get('glazingProfile',{}).get('pattern')=='plaster-tracery' and not opening.get('fixedInfill'):
        # Fountain's fixed high light has no lower leaves. The hammam entrance
        # explicitly retains paneled timber below its separate upper tracery.
        lower=dict(opening);lower.pop('glazingProfile')
        if lower.get('finishMaterialProfile')=='warmTimber':lower['closureMaterialId']=G.WOOD
        F.BASE_CLOSURE(face,plane,lower,top)
        g=opening['glazingProfile'];profile=opening['closureProfile'];frame=profile['frameWidthM']
        inner=G.offset_top(top,-frame);z=g['fromZM'];name=opening['id'];c=-opening['depthM']+.04
        l,r=top[0][0],top[-1][0];head=opening['headM'];plaster=opening['surroundMaterialId']
        field=G.clipped_panel(name+'-plaster-web-field',face,plane,top,l,r,z,head,c-.035,c,plaster)
        def head_at(a):
            return next(p[1]+(q[1]-p[1])*(a-p[0])/(q[0]-p[0]) for p,q in zip(inner,inner[1:]) if p[0]<=a<=q[0])
        pitch=(r-l-2*frame)/g['columnsPerLight']
        for i in range(g['columnsPerLight']):
            x=l+frame+i*pitch+g['webM']/2;X=l+frame+(i+1)*pitch-g['webM']/2;center=(x+X)/2
            cap=head_at(center)-.015;spring=max(z+frame,cap-(X-x)*.42)
            arch=[]
            for j in range(17):
                angle=math.pi-j*math.pi/16;a=center+(X-x)/2*math.cos(angle)
                height=min(spring+(cap-spring)*math.sin(angle),head_at(a)-.015)
                assert height>=z+frame,'Glass cell cannot fit above its approved lower frame'
                arch.append((a,height))
            poly=[(x,z+frame),(X,z+frame)]+list(reversed(arch))
            cutter=G.prism_profile(name+'-cell-cutter',face,plane,poly,c-.04,c+.01,plaster,'receive');F.subtract(field,cutter)
            pane=G.prism_profile(name+'-glass-pane-'+str(i+1),face,plane,poly,c-.018,c-.018+g['glassThicknessM'],'bz04_fixed_glass','receive')
            G.paint_object(pane,g['paletteSrgb'][g['paletteSequence'][i]])
        G.clipped_panel(name+'-opaque-glass-back',face,plane,top,l,r,z,head,-opening['depthM']+.003,-opening['depthM']+.008,'ph_bz04_dark_wood','receive')
        return

    return F.closure(face,plane,opening,top)


def portal_ceiling(o):
    # A constant-width pointed crown rises farther than head + ring width.
    # Keep the wall mask and spandrels above that exact, unchanged outer ring.
    return max(o['headM']+o['trimWidthM']+.02,max(z for x,z in G.offset_top(G.arch_points(o),o['trimWidthM']))+.02)


def opening(face,plane,o,trim,back):
    if o.get('architecturalDetail',{}).get('profile')=='dressed-stone-portal':
        ceiling=portal_ceiling(o);old=o['headM']+o['trimWidthM']+.02
        prism,part=G.prism_profile,G.part
        def filled_prism(name,f,p,poly,rear,front,mid,shadow='cast'):
            if name==o['id']+'-spandrel':poly=[(x,ceiling if abs(z-old)<1e-7 else z) for x,z in poly]
            return prism(name,f,p,poly,rear,front,mid,shadow)
        def filled_part(f,p,name,lo,hi,mid,shadow='cast',bevel=0):
            if name==o['id']+'-shoulder':hi=(*hi[:2],ceiling)
            return part(f,p,name,lo,hi,mid,shadow,bevel)
        G.prism_profile=filled_prism;G.part=filled_part
        try:S.opening(face,plane,o,trim,back)
        finally:G.prism_profile=prism;G.part=part
    else:S.opening(face,plane,o,trim,back)
    if o['kind']=='shop':
        assert face=='east' and o['headShape']=='rectangular'
        join=G.local(G.coords(face,plane,0,o['shopfront']['cavity']['chamberFromOutM'],0))[0]
        for vertex in G.bpy.data.objects[o['id']+'-head'].data.vertices:
            if vertex.co.x>join:vertex.co.x=join
        for vertex in G.bpy.data.objects[o['id']+'-chamber-ceiling'].data.vertices:
            if vertex.co.x<join:vertex.co.x=join
    if o['headShape']=='rectangular' and o.get('frontProjectionM')==0:
        for side,along in [('left',o['alongM']-o['widthM']/2),('right',o['alongM']+o['widthM']/2)]:
            ob=G.bpy.data.objects.get(o['id']+'-'+side+'-return')
            if ob is None:continue
            modifier=next((m for m in ob.modifiers if m.type=='BEVEL'),None)
            if modifier is None:continue
            modifier.limit_method='WEIGHT';weights=ob.data.attributes.new('bevel_weight_edge','FLOAT','EDGE')
            point=G.local(G.coords(face,plane,along,0,0))
            for edge,weight in zip(ob.data.edges,weights.data):
                weight.value=float(all(abs(ob.data.vertices[i].co.x-point[0])<1e-5 and abs(ob.data.vertices[i].co.y-point[1])<1e-5 for i in edge.vertices))


def shells(area):
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    active=runpy.run_path(str(OUT/'build-receivers.py'))['ADDITIONAL_UNITS']
    interfaces['install'](G,area,additional_units=active)
    original=G.part
    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        # nc-n's front interval stops at the courtyard corner. Its approved
        # footprint continues behind nc-ey to the existing eastern rear plane.
        if name=='nc-n-end-closure' and abs(hi[0]-53)<1e-7:
            lo=(56.58,*lo[1:]);hi=(56.6,*hi[1:])
        elif name in {'nc-n-back','nc-n-base-closure'}:
            hi=(56.6,*hi[1:])
        return original(face,plane,name,lo,hi,mid,shadow,bevel)
    original_field=S.field
    portal=next(o for f in area['faces'] for p in f['parcels'] for o in p['openings'] if o.get('architecturalDetail',{}).get('profile')=='dressed-stone-portal')
    left=portal['alongM']-portal['widthM']/2-portal['trimWidthM'];right=portal['alongM']+portal['widthM']/2+portal['trimWidthM']
    def field(face,plane,name,l,r,z,top,mid,out=0,floor_z=0):
        if name=='nc-ws' and left-1e-7<=l and r<=right+1e-7 and abs(z-(portal['headM']+portal['trimWidthM']+.02))<1e-7:z=portal_ceiling(portal)
        return original_field(face,plane,name,l,r,z,top,mid,out,floor_z)
    G.part=part;S.field=field
    try:S.build_shells(area,opening)
    finally:G.part=original;S.field=original_field
    import bmesh
    for ob in G.bpy.context.scene.objects:
        edge=72 if ob.name.startswith('nc-wn-back') else 67 if ob.name.startswith('nc-ws-back') else 80 if ob.name.startswith('nc-ey-back') else None
        if edge is None:continue
        bm=bmesh.new();bm.from_mesh(ob.data)
        caps=[f for f in bm.faces if all(abs(G.ORIGIN[1]-v.co.y-edge)<1e-5 for v in f.verts)]
        if caps:bmesh.ops.delete(bm,geom=caps,context='FACES_ONLY')
        bm.to_mesh(ob.data);bm.free()


def verify_geometry(area):
    import bpy
    S.validate_objects(area)
    name='nc-ws-ENTRANCE'
    assert len([o for o in bpy.context.scene.objects if o.name.startswith(name+'-glass-pane')])==3,'Hammam transom must have three physical arched glass cells'
    assert any(o.name.startswith(name+'-leaf-panel') for o in bpy.context.scene.objects),'Hammam lower shutters missing'
    assert any(o.name.startswith(name+'-bead') for o in bpy.context.scene.objects),'Hammam stone bead missing'
    panel=bpy.data.objects.get('R3-HAMMAM-INSCRIPTION-receiver')
    assert panel is not None
    G.prepare_mesh(panel);F.inscription_fixture(area['facadeFeatures'][0],panel)


def finishing_press(area,finish):
    """A supported hand press and shallow finished-linen shelf in this bay only."""
    recipe=area['artDirectionFinish']['finishingPress']
    group=next(g for g in area['activityGroups'] if g['id']==recipe['group'])
    opening=next(o for p in G.PARCELS.values() for o in p['openings'] if o['id']==group['receiverOpening'])
    along=opening['alongM'];face=group['receiverFace'];plane=53
    def part(name,lo,hi,family='timber',bevel=.003):
        return finish(G.part(face,plane,name,(along+lo[0],lo[1],lo[2]),(along+hi[0],hi[1],hi[2]),G.WOOD,'cast',bevel),family)
    def member(name,a,b,width):
        return finish(G.member(name,G.coords(face,plane,along+a[0],a[1],a[2]),G.coords(face,plane,along+b[0],b[1],b[2]),width,G.WOOD,'cast'),'timber')
    top=recipe['tableTopZM'];beam_low,beam_top=recipe['beamZM']
    # Feet distribute load over the table's front and rear leg/apron lines.
    for side,(left,right) in enumerate(((-.02,.09),(.78,.89))):
        part('P3-NC-press-foot-'+str(side),(left,-.37,top),(right,.12,top+.04))
        center=(left+right)/2
        part('P3-NC-press-post-'+str(side),(center-.0375,-.20,top+.03),(center+.0375,-.08,beam_top-.025))
        target=.20 if side==0 else .67
        member('P3-NC-press-knee-'+str(side),(center,-.14,beam_low-.20),(target,-.14,beam_low+.025),.035)
    part('P3-NC-press-beam',(-.035,-.245,beam_low),(.925,-.035,beam_top))
    part('P3-NC-press-bed',(.115,-.33,top),(.745,.075,recipe['bedTopZM']),'worktop',.002)
    # Replace the loose folded display once, with four flat plies under pressure.
    linen=next(p for p in group['instanceLayout']['parts'] if p['id']=='folded-work');prefix=group['id']+'-folded-work'
    for ob in list(G.bpy.context.scene.objects):
        if ob.name.startswith(prefix):G.bpy.data.objects.remove(ob,do_unlink=True)
    lo,hi=linen['localBox']['min'],linen['localBox']['max']
    for i in range(4):
        low=recipe['bedTopZM']+(recipe['linenTopZM']-recipe['bedTopZM'])*i/4
        high=recipe['bedTopZM']+(recipe['linenTopZM']-recipe['bedTopZM'])*(i+1)/4
        ob=G.part(face,plane,prefix+'-pressed-ply-'+str(i),(along+lo[0],lo[1],low),(along+hi[0],hi[1],high),'ph_bz04_fine_linen','cast',.0005)
        finish(ob,'cloth','#adab91')
    part('P3-NC-press-platen',(.13,-.32,recipe['linenTopZM']),(.73,.065,recipe['platenTopZM']),'worktop',.002)
    center=.43;out=-.14
    part('P3-NC-press-thrust-block',(center-.052,out-.048,recipe['platenTopZM']-.003),(center+.052,out+.048,1.105),'timber',.004)
    # A real cylindrical spindle and continuous helical ridge enter the beam's
    # threaded bearing. The lower spindle is seated inside the thrust block.
    count=24;bottom=1.085;upper=recipe['screwTopZM'];radius=.031
    vertices=[G.coords(face,plane,along+center+radius*math.cos(i*math.tau/count),out+radius*math.sin(i*math.tau/count),z) for z in (bottom,upper) for i in range(count)]
    faces=[tuple(reversed(range(count))),tuple(range(count,count*2))]+[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    spindle=G.mesh('P3-NC-press-spindle',vertices,faces,G.WOOD,'cast',True);finish(spindle,'worktop')
    low,high=1.11,upper-.015;turns=(high-low)/recipe['screwPitchM'];steps=math.ceil(turns*18);vertices=[];faces=[]
    for i in range(steps+1):
        theta=math.tau*turns*i/steps;z=low+(high-low)*i/steps
        for r,dz in ((.029,-.006),(.044,0),(.029,.006)):
            vertices.append(G.coords(face,plane,along+center+r*math.cos(theta),out+r*math.sin(theta),z+dz))
    for i in range(steps):
        for j in range(3):faces.append((i*3+j,i*3+(j+1)%3,(i+1)*3+(j+1)%3,(i+1)*3+j))
    faces.extend([(2,1,0),(steps*3,steps*3+1,steps*3+2)])
    finish(G.mesh('P3-NC-press-thread',vertices,faces,G.WOOD,'cast',True),'worktop')
    member('P3-NC-press-handle',(center-.19,out,upper-.055),(center+.19,out,upper-.055),.027)

    shelf_low,shelf_top=recipe['rearShelfZM']
    part('P3-NC-finished-shelf',(-1.12,-1.89,shelf_low),(.70,-1.68,shelf_top),'aged_timber')
    for i,a in enumerate((-.96,.52)):
        part('P3-NC-finished-wall-seat-'+str(i),(a-.035,-1.90,shelf_low-.28),(a+.035,-1.875,shelf_top),'aged_timber',.001)
        member('P3-NC-finished-bracket-'+str(i),(a,-1.875,shelf_low-.23),(a,-1.71,shelf_low),.026)
    for i,(left,right,height,color) in enumerate(((-1.0,-.42,.064,'#bfb89e'),(-.28,.35,.088,'#9fa995'))):
        before=set(G.bpy.context.scene.objects)
        S.soft_cloth('P3-NC-finished-bundle-'+str(i),face,plane,(along+left,-1.865,shelf_top),(along+right,-1.705,shelf_top+height),'ph_bz04_fine_linen',True)
        for ob in set(G.bpy.context.scene.objects)-before:
            finish(ob,'cloth',color);ob['bz04Shadow']='cast'


def finishing_press_fixture(area):
    """Probe actual bearing surfaces and reserve the complete staff work strip."""
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    recipe=area['artDirectionFinish']['finishingPress'];group=next(g for g in area['activityGroups'] if g['id']==recipe['group'])
    opening=next(o for p in G.PARCELS.values() for o in p['openings'] if o['id']==group['receiverOpening']);along=opening['alongM']
    additions=[o for o in G.bpy.context.scene.objects if o.name.startswith(('P3-NC-press-','P3-NC-finished-'))]
    cloth=[o for o in G.bpy.context.scene.objects if o.name.startswith(group['id']+'-folded-work')]
    tables=[o for o in G.bpy.context.scene.objects if o.name.startswith(group['id']+'-side-table-top-board')]
    assert additions and cloth and len(tables)==3
    for ob in additions+cloth+tables:G.prepare_mesh(ob)
    for ob in additions:
        for vertex in ob.data.vertices:
            p=ob.matrix_world@vertex.co;world=(p.x+G.ORIGIN[0],G.ORIGIN[1]-p.y,p.z+G.ORIGIN[2]);out=53-world[0]
            assert all(group['bbox']['min'][i]-1e-5<=world[i]<=group['bbox']['max'][i]+1e-5 for i in range(3)),('Finishing furniture leaves group',ob.name,world)
            assert out<=-1.65+1e-5 or out>=-.55-1e-5,('Finishing furniture blocks staff strip',ob.name,out)
            assert out<.18-1e-5,('Press or shelf reaches locked gate',ob.name)
    def downward(objects,a,out,start_z):
        origin=Vector(G.local(G.coords('east',53,along+a,out,start_z)));hits=[]
        for ob in objects:
            hit,p,_,_=ob.ray_cast(origin,Vector((0,0,-1)),distance=2)
            if hit:hits.append(p.z+G.ORIGIN[2])
        assert hits,('Missing load-bearing receiver',a,out,start_z)
        return max(hits)
    # Sample both ends of each foot above the real table, including its leg lines.
    for a in (.035,.835):
        for out in (-.34,.085):assert abs(downward(tables,a,out,1.1)-recipe['tableTopZM'])<1e-5
    bed=G.bpy.data.objects['P3-NC-press-bed'];platen=G.bpy.data.objects['P3-NC-press-platen']
    assert abs(min(v.co.z for v in bed.data.vertices)+G.ORIGIN[2]-recipe['tableTopZM'])<1e-5
    assert abs(min(v.co.z for o in cloth for v in o.data.vertices)+G.ORIGIN[2]-recipe['bedTopZM'])<1e-5
    for a in (.25,.43,.60):
        assert abs(downward(cloth,a,-.14,1.2)-recipe['linenTopZM'])<1e-5,'Linen does not reach pressure platen'
    assert abs(min(v.co.z for v in platen.data.vertices)+G.ORIGIN[2]-recipe['linenTopZM'])<1e-5
    def tree(ob):
        ob.data.calc_loop_triangles()
        return BVHTree.FromPolygons([v.co for v in ob.data.vertices],[tuple(t.vertices) for t in ob.data.loop_triangles],all_triangles=True)
    def contact(first,second):
        a,b=G.bpy.data.objects[first],G.bpy.data.objects[second]
        assert tree(a).overlap(tree(b)),('Disconnected press or shelf members',first,second)
    for side in (0,1):
        contact('P3-NC-press-foot-'+str(side),'P3-NC-press-post-'+str(side))
        contact('P3-NC-press-post-'+str(side),'P3-NC-press-beam')
        contact('P3-NC-press-knee-'+str(side),'P3-NC-press-post-'+str(side))
        contact('P3-NC-press-knee-'+str(side),'P3-NC-press-beam')
        assert abs(min(v.co.z for v in G.bpy.data.objects['P3-NC-press-foot-'+str(side)].data.vertices)+G.ORIGIN[2]-recipe['tableTopZM'])<1e-5
        contact('P3-NC-finished-wall-seat-'+str(side),'P3-NC-finished-bracket-'+str(side))
        contact('P3-NC-finished-bracket-'+str(side),'P3-NC-finished-shelf')
    contact('P3-NC-press-platen','P3-NC-press-thrust-block')
    contact('P3-NC-press-spindle','P3-NC-press-thrust-block')
    contact('P3-NC-press-spindle','P3-NC-press-beam')
    contact('P3-NC-press-spindle','P3-NC-press-handle')
    for i,a in enumerate((-.71,.035)):
        bundle=[o for o in additions if o.name.startswith('P3-NC-finished-bundle-'+str(i))]
        assert bundle and abs(min(v.co.z for o in bundle for v in o.data.vertices)+G.ORIGIN[2]-recipe['rearShelfZM'][1])<1e-5
        assert abs(downward([G.bpy.data.objects['P3-NC-finished-shelf']],a,-1.78,1.7)-recipe['rearShelfZM'][1])<1e-5
    print('PASS North finishing: seated table feet/linen/platen, connected screw/frame and shelf brackets, two supported bundles, staff strip and gate clear',flush=True)


def art_finish(area):
    from bazaar_finish import apply
    apply(G.__dict__,OUT/(UNIT+'.glb'))
    tools=module('north_finish_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    recipe=area['artDirectionFinish'];private=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz23_north_')
    def finish(ob,family,color=None):
        ob.data.materials.clear();ob.data.materials.append(private[family])
        old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT');rgba=(1,1,1,1)
        if color:rgba=tuple(G._linear_channel(int(color[i:i+2],16))/private[family]['bz07TargetMeanLinear'][k] for k,i in enumerate((1,3,5)))+(1,)
        assert all(0<=c<=1 for c in rgba),(ob.name,rgba)
        for c in colors.data:c.color=rgba
        ob.data.color_attributes.active_color=colors
        if family in {'timber','aged_timber','painted_timber','worktop'}:tools.member_uv(ob)
        else:G.world_uv(ob,float(private[family]['tileSizeM']))
        return ob
    owners={p['id']:p['id'] for f in area['faces'] for p in f['parcels']}
    for face in area['faces']:
        for parcel in face['parcels']:
            for o in parcel['openings']:owners[o['id']]=parcel['id']
    stone=G.mat('ph_bz04_trim_sanded_01').copy();stone.name='bz23_north_portal_stone'
    for n in stone.node_tree.nodes:
        if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.28
    for ob in list(G.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        if any(ob.name.startswith(p) for p in recipe['retireFinishPrefixes']):G.bpy.data.objects.remove(ob,do_unlink=True);continue
        source=ob.data.materials[0].get('bz04SourceMaterial',ob.data.materials[0].name)
        owner=next((owners[p] for p in sorted(owners,key=len,reverse=True) if ob.name.removeprefix('life-wear-').startswith(p)),None)
        family=recipe['parcelFinishBindings'].get(owner)
        if family and any(k in source for k in ('plaster','beige')):finish(ob,family)
        elif ob.name.startswith('G_NC_DRY_RECESS-folded-work'):finish(ob,'cloth','#adab91')
        elif any(k in source for k in ('timber','wood','plank','pine')):
            paint=(owner=='nc-eh' or ob.name.startswith('nc-ws-ENTRANCE')) and '-leaf-' in ob.name
            finish(ob,'painted_timber' if paint else 'worktop' if '-top-board' in ob.name else 'aged_timber' if ob.name.startswith('G_') else 'timber')
        portal=ob.name.startswith('nc-ws-ENTRANCE') and any(k in ob.name for k in ('outer-ring','-bead','plaster-web-field'))
        if portal or ob.name=='R3-HAMMAM-INSCRIPTION-receiver':
            ob.data.materials.clear();ob.data.materials.append(stone);G.world_uv(ob,float(stone.get('tileSizeM',2)))
            if portal:
                old=ob.data.color_attributes.get('COLOR_0')
                if old:ob.data.color_attributes.remove(old)
                if 'plaster-web' not in ob.name:
                    for v in ob.data.vertices:
                        if abs(v.co.x)<1e-6:v.co.x+=recipe['portalProjectionM']
                    bevel=ob.modifiers.new('Dressed civic arris','BEVEL');bevel.width=.006;bevel.segments=2
    # A consistent smoked aqua transom retains its three shaped opaque cells.
    glass=G.mat('bz04_fixed_glass').copy();glass.name='bz23_north_entrance_glass'
    shader=glass.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=recipe['entranceGlass']['roughness']
    for ob in G.bpy.context.scene.objects:
        if ob.name.startswith('nc-ws-ENTRANCE-glass-pane'):
            ob.data.materials.clear();ob.data.materials.append(glass)
        if ob.name.startswith('G_NC_DRY_RECESS') and any(k in ob.name for k in ('closed-work-gate','-side-table-leg','-side-table-apron','-side-table-stretcher','-sign')) and ob.data.materials[0].name in {'bz23_north_aged_timber','bz23_north_timber'}:
            for c in ob.data.color_attributes['COLOR_0'].data:c.color=(*[v*recipe['workroomTimberFactor'] for v in c.color[:3]],c.color[3])
    center=G.bpy.data.objects['nc-ws-ENTRANCE-glass-pane-2'];z=recipe['entranceGlass']['centerDivisionZM'];cross=[]
    for edge in center.data.edges:
        p,q=[center.data.vertices[i].co for i in edge.vertices]
        if min(p.z,q.z)<=z<=max(p.z,q.z) and abs(q.z-p.z)>1e-6:
            t=(z-p.z)/(q.z-p.z);cross.append(G.ORIGIN[1]-(p.y+t*(q.y-p.y)))
    assert cross,'Centre glass division misses shaped cell'
    h=recipe['entranceGlass']['divisionHeightM']/2
    lead=G.part('west',41,'P3-NC-transom-center-lead',(min(cross),-.36,z-h),(max(cross),-.337,z+h),G.WOOD,'receive',.002)
    lead.data.materials.clear();lead.data.materials.append(G.bpy.data.materials['bz04_craft_dark_iron'])
    for face in area['faces']:
        for parcel in face['parcels']:
            for o in parcel['openings']:
                direction=G.local(G.coords(face['face'],face['wallPlaneM'],0,1,0))
                base=G.local(G.coords(face['face'],face['wallPlaneM'],0,0,0))
                axis=0 if face['face'] in {'east','west'} else 1;sign=direction[axis]-base[axis]
                for ob in G.bpy.context.scene.objects:
                    if not ob.name.startswith(o['id']+'-'):continue
                    if '-leaf-panel' in ob.name:tools.member_uv(ob,grain_axis=2)
                    if not any(k in ob.name for k in ('-frame-','-leaf-stile','-leaf-rail')):continue
                    front=max(sign*v.co[axis] for v in ob.data.vertices)
                    for v in ob.data.vertices:
                        if abs(sign*v.co[axis]-front)<1e-6:v.co[axis]+=sign*.025
                    ob.data.update();tools.member_uv(ob)
                    bevel=ob.modifiers.new('Dressed timber arris','BEVEL');bevel.width=.003;bevel.segments=2
    finishing_press(area,finish)
    return tools


def finish_fixture(area):
    objects=list(G.bpy.context.scene.objects)
    assert len([o for o in objects if o.name.startswith('G_NC_DRY_RECESS-side-table-leg')])==4
    assert len([o for o in objects if o.name.startswith('G_NC_DRY_RECESS-side-table-top-board')])==3
    assert not any(o.name.startswith(p) for o in objects for p in area['artDirectionFinish']['retireFinishPrefixes'])
    ring=[o for o in objects if o.name.startswith('nc-ws-ENTRANCE-outer-ring')]
    assert ring and abs(max(v.co.x for o in ring for v in o.data.vertices)-.13)<1e-5
    assert all(o.data.materials[0].name=='bz23_north_painted_timber' for o in objects if o.name.startswith('nc-ws-ENTRANCE-leaf-panel'))
    assert area['facadeFeatures'][0]['letterHeightM']==.16
    assert len([o for o in objects if o.name=='P3-NC-transom-center-lead'])==1
    assert all(o.data.materials[0].name=='bz23_north_entrance_glass' for o in objects if o.name.startswith('nc-ws-ENTRANCE-glass-pane'))
    finishing_press_fixture(area)
    print('PASS North P3: 130 mm civic portal, 160 mm inscription, crafted closed leaves, four table legs and three boards',flush=True)


def build(saved,export=True):
    area=copy.deepcopy(validate(saved));setup(saved);G.A=area;F.A=area
    for face in area['faces']:
        for parcel in face['parcels']:
            for o in parcel['openings']:
                if o.get('architecturalDetail',{}).get('profile')=='dressed-stone-portal':o['trimWidthM']=o['architecturalDetail']['surroundWidthM']
    shells(area)
    for group in area['activityGroups']:DYE.activity(group)
    for feature in area['facadeFeatures']:F.inscription(feature)
    tools=art_finish(area)
    verify_geometry(area)
    finish_fixture(area)
    if export:
        for ob in list(G.bpy.context.scene.objects):G.prepare_mesh(ob)
        recipe=area['artDirectionFinish'];tools.bake_contact_occlusion(G.__dict__,recipe['contactRadiusM'],recipe['contactStrength'],subdivision_prefixes=('NC_DRY_RECESS','P3-NC-press-bed','P3-NC-press-platen','P3-NC-press-beam','P3-NC-finished-shelf'))
        prepare=G.prepare_mesh;G.prepare_mesh=lambda ob:None
        try:G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],{'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})
        finally:G.prepare_mesh=prepare


def input_fixture(saved):
    validate(saved)
    bad=copy.deepcopy(saved);bad['areas'][0]['floorMaterialId']='tampered'
    try:validate(bad,saved)
    except ValueError:pass
    else:raise AssertionError('Tampered issue accepted')
    bad=copy.deepcopy(saved);bad['requiredCapabilities']['glazingPatterns'].append('unknown-pattern');bad['inputSha256']=S.digest(bad)
    try:validate(bad,bad)
    except AssertionError:pass
    else:raise AssertionError('Unknown glazing accepted')
    print('PASS North Court input fixtures: frozen issue and explicit glazing capability')


def self_test(saved):
    input_fixture(saved);build(saved,False);area=saved['areas'][0]
    assert sum(len(p['openings']) for f in area['faces'] for p in f['parcels'])==23
    assert sum(len(g['instanceLayout']['parts']) for g in area['activityGroups'])==6
    from mathutils import Vector
    for ob in G.bpy.context.scene.objects:G.prepare_mesh(ob)
    # The three glass cells must be the nearest visible surfaces in their holes.
    panes=[ob for ob in G.bpy.context.scene.objects if ob.name.startswith('nc-ws-ENTRANCE-glass-pane')]
    for pane in panes:
        center=sum((v.co for v in pane.data.vertices),Vector())/len(pane.data.vertices)
        start=Vector((1,center.y,center.z));hits=[]
        for ob in G.bpy.context.scene.objects:
            hit,point,normal,index=ob.ray_cast(start,Vector((-1,0,0)),distance=5)
            if hit:hits.append((point.x,ob.name))
        assert max(hits)[1]==pane.name,('Glass cell occluded',pane.name,max(hits))
    # The full northern roof footprint has a closed rear and east return.
    for world,direction,axis,expected in [((55,84,5),(0,1,0),1,83.6),((57,82,5),(-1,0,0),0,56.6)]:
        start=Vector(G.local(world));hits=[]
        for ob in G.bpy.context.scene.objects:
            hit,point,normal,index=ob.ray_cast(start,Vector(direction),distance=2)
            if hit:hits.append((point-start).length)
        assert hits and abs(min(hits)-abs(world[axis]-expected))<1e-5,'Northern outer envelope gap'
    print('PASS North Court geometry fixtures: three arched glass cells, dressed portal, incised HAMMAM and complete dye workroom stock')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('mode',choices=['build','self-test','input-fixture'],nargs='?',default='build');parser.add_argument('--handoff',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None);saved=json.loads(args.handoff.read_text())
    {'build':build,'self-test':self_test,'input-fixture':input_fixture}[args.mode](saved)
