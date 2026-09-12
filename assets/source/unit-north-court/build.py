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
    G=S.geometry(saved);G.OUT=OUT
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


def build(saved,export=True):
    area=copy.deepcopy(validate(saved));setup(saved);G.A=area;F.A=area
    for face in area['faces']:
        for parcel in face['parcels']:
            for o in parcel['openings']:
                if o.get('architecturalDetail',{}).get('profile')=='dressed-stone-portal':o['trimWidthM']=o['architecturalDetail']['surroundWidthM']
    shells(area)
    for group in area['activityGroups']:S.activity(group)
    for feature in area['facadeFeatures']:F.inscription(feature)
    verify_geometry(area)
    if export:G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],{'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})


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
