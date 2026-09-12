"""Build the R7 Dogleg house, supported plain balcony and sample-drying workfront."""
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
UNIT='unit-dyers-dogleg'
spec=importlib.util.spec_from_file_location('dogleg_dye_helpers',ROOT/'assets/source/unit-dyers-alley/build.py')
DYE=importlib.util.module_from_spec(spec);spec.loader.exec_module(DYE)
S=DYE.S
G=None


def validate(saved,current=None):
    if saved.get('unit')!=UNIT or len(saved.get('areas',[]))!=1:raise ValueError('Expected Dyers Dogleg frozen unit')
    if S.digest(saved)!=saved.get('inputSha256'):raise ValueError('Frozen handoff contents do not match inputSha256')
    current=current or runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if current['inputSha256']!=saved['inputSha256']:raise ValueError('Area inputs changed since handoff extraction')
    area=saved['areas'][0];caps=saved['requiredCapabilities']
    assert area['zone']=='DYERS_DOGLEG' and area['designRevision']['id'].startswith('R7')
    assert set(caps['openingProfiles'])<={'rectangular','segmental'} and not caps['openingCraftProfiles']
    assert set(caps['featureKinds'])=={'supported-shallow-balcony'}
    assert set(caps['partKinds'])<={'timber-member','hanging-cloth','grounded-timber-bench','locked-timber-lattice-gate'}
    assert not caps['glazingPatterns'] and not caps['landscapeKinds'] and not area['fixtures']
    assert set(caps['craftRecipes'])<={'CF-CLOTH','CF-ENVELOPE','CF-FLOOR','CF-FURNITURE','CF-JOINT','CF-OPEN','CF-R4-BALCONY','CF-R4-PORTAL','CF-TIMBER'}
    return area


def setup(saved):
    global G
    DYE.setup(saved);G=DYE.G;G.OUT=OUT


def balcony(f):
    face,plane,name,mid=f['receiverFace'],f['wallPlaneM'],f['id'],f['materialId']
    def part(label,lo,hi):return G.part(face,plane,name+'-'+label,lo,hi,mid,bevel=.003)
    deck=f['deck'];l,r=deck['alongBoundsM'];out,front=deck['outM']
    part('deck',(l,out,deck['bottomZM']),(r,front,deck['topZM']))
    joists=f['joists'];w,h=joists['sectionM']
    for along in joists['alongAxesM']:
        part('joist',(along-w/2,joists['outM'][0],joists['zM'][0]),(along+w/2,joists['outM'][1],joists['zM'][1]))
    braces=f['braces']
    for along in braces['alongAxesM']:
        p,q=braces['centerlineOutZ']
        G.member(name+'-brace',G.coords(face,plane,along,p[0],p[1]),G.coords(face,plane,along,q[0],q[1]),braces['sectionM'],mid)
        part('wall-plate',(along-.06,-.08,f['zM'][0]),(along+.06,0,joists['zM'][1]))
    rail=f['balustrade'];z,Z=rail['zM'];post=rail['postSectionM'];width=rail['railSectionM'];front=rail['frontOutM']
    left,right=rail['endPostAxesM']
    for along in [left,right]:part('post',(along-post/2,front-post/2,z),(along+post/2,front+post/2,Z))
    for low,high in [(z,z+width),(Z-width,Z)]:
        part('front-rail',(l,front-width/2,low),(r,front+width/2,high))
        for along in [left,right]:part('side-rail',(along-width/2,rail['sideOutM'][0],low),(along+width/2,front-width/2,high))
    pitch=rail['balusterPitchM'];w=rail['balusterSectionM']
    count=max(1,int((right-left-post)/pitch));available=right-left-post
    for i in range(count):
        along=left+post/2+available*(i+.5)/count
        part('front-baluster',(along-w/2,front-w/2,z+width),(along+w/2,front+w/2,Z-width))
    start=rail['sideOutM'][0];end=front-post/2;count=max(1,int((end-start)/pitch))
    for along in [left,right]:
        for i in range(count):
            out=start+(end-start)*(i+.5)/count
            part('side-baluster',(along-w/2,out-w/2,z+width),(along+w/2,out+w/2,Z-width))


def verify_geometry(area):
    import bpy
    S.validate_objects(area)
    feature=area['facadeFeatures'][0];objects=[o for o in bpy.context.scene.objects if o.name.startswith(feature['id'])]
    assert objects and len([o for o in objects if '-brace' in o.name])==2
    assert any('-front-baluster' in o.name for o in objects) and not any('STAR' in o.name for o in objects)
    for ob in objects:
        G.prepare_mesh(ob)
        for vertex in ob.data.vertices:
            point=(vertex.co.x+G.ORIGIN[0],G.ORIGIN[1]-vertex.co.y,vertex.co.z+G.ORIGIN[2])
            assert all(feature['bbox']['min'][i]-.001<=point[i]<=feature['bbox']['max'][i]+.001 for i in range(3)),('balcony outside receiver envelope',ob.name,point)
    assert all(not o.get('glazingProfile') for f in area['faces'] for p in f['parcels'] for o in p['openings'])


def opening(face,plane,o,trim,back):
    S.opening(face,plane,o,trim,back)
    if o['kind']=='shop':
        assert face=='west' and o['headShape']=='rectangular'
        join=G.local(G.coords(face,plane,0,o['shopfront']['cavity']['chamberFromOutM'],0))[0]
        head=G.bpy.data.objects[o['id']+'-head'];ceiling=G.bpy.data.objects[o['id']+'-chamber-ceiling']
        for vertex in head.data.vertices:
            if vertex.co.x<join:vertex.co.x=join
        for vertex in ceiling.data.vertices:
            if vertex.co.x>join:vertex.co.x=join
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
    interfaces['install'](G,area,additional_units={UNIT:None,'unit-covered-souk':None,'unit-dyers-alley':None,'unit-north-court':{'nc-s'}})
    original_part=G.part
    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        if name=='dd-e-end-closure' and lo[0]==48:return None
        return original_part(face,plane,name,lo,hi,mid,shadow,bevel)
    G.part=part;S.build_shells(area,opening);G.part=original_part
    import bmesh
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith(('dd-w-back','dd-e-back')):continue
        bm=bmesh.new();bm.from_mesh(ob.data)
        caps=[f for f in bm.faces if any(all(abs(G.ORIGIN[1]-v.co.y-y)<1e-5 for v in f.verts) for y in ((48,62) if ob.name.startswith('dd-w-back') else (48,)))]
        if caps:bmesh.ops.delete(bm,geom=caps,context='FACES_ONLY')
        bm.to_mesh(ob.data);bm.free()


def build(saved,export=True):
    area=validate(saved);setup(saved);shells(area)
    for group in area['activityGroups']:DYE.activity(group)
    for feature in area['facadeFeatures']:balcony(feature)
    verify_geometry(area)
    if export:
        G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],{'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})


def input_fixture(saved):
    validate(saved)
    bad=copy.deepcopy(saved);bad['areas'][0]['floorMaterialId']='tampered'
    try:validate(bad,saved)
    except ValueError:pass
    else:raise AssertionError('Tampered issue accepted')
    bad=copy.deepcopy(saved);bad['requiredCapabilities']['featureKinds'].append('invented-hoist');bad['inputSha256']=S.digest(bad)
    try:validate(bad,bad)
    except AssertionError:pass
    else:raise AssertionError('Unknown feature accepted')
    print('PASS Dogleg input fixtures: frozen issue and no unsupported extra features')


def self_test(saved):
    input_fixture(saved);build(saved,False);area=saved['areas'][0]
    from mathutils import Vector
    for ob in G.bpy.context.scene.objects:G.prepare_mesh(ob)
    openings=[o for f in area['faces'] for p in f['parcels'] for o in p['openings']]
    assert len(openings)==11 and sum(len(g['instanceLayout']['parts']) for g in area['activityGroups'])==8
    door=next(o for o in openings if o['id']=='dd-e-L1-W2')
    assert door['finishPaintSrgb']=='#53799f' and door['finishMaterialProfile']=='opaqueTimber'
    expected=tuple(G._linear_channel(int(door['finishPaintSrgb'][i:i+2],16)) for i in (1,3,5))
    leaves=[ob for ob in G.bpy.context.scene.objects if ob.name.startswith(door['id']+'-leaf-panel')]
    assert len(leaves)==2
    for ob in leaves:
        assert ob.data.materials[0]==G.mat('bz04_teal_timber_project_original')
        assert all(max(abs(c.color[i]-expected[i]) for i in range(3))<1e-6 for c in ob.data.color_attributes['COLOR_0'].data)
    group=area['activityGroups'][0]
    for item in group['instanceLayout']['parts']:
        if item['kind']=='hanging-cloth':assert len([ob for ob in G.bpy.context.scene.objects if ob.name.startswith(group['id']+'-cloth-tie-'+item['id'])])==2
    start=Vector(G.local((45,52.2,2.5)));hits=[]
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith('DD_WORKS_RECESS-'):continue
        hit,point,normal,index=ob.ray_cast(start,Vector((0,0,1)),distance=.4)
        if hit:hits.append((point.z,ob.name))
    assert sorted(hits)[0][1]=='DD_WORKS_RECESS-chamber-ceiling' and sum(abs(z-2.75)<1e-5 for z,name in hits)==1,'Duplicate west chamber ceiling'
    print('PASS Dogleg: 11 openings, 8 bounded workfront parts, supported balcony, exact opaque indigo leaves, tied samples and single west chamber ceiling',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('mode',choices=['build','self-test','input-fixture'],nargs='?',default='build');parser.add_argument('--handoff',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None);saved=json.loads(args.handoff.read_text())
    {'build':build,'self-test':self_test,'input-fixture':input_fixture}[args.mode](saved)
