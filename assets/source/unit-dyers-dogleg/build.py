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
    assert set(caps['partKinds'])<={'timber-member','hanging-cloth','grounded-timber-bench','locked-timber-lattice-gate','folded-cloth'}
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
    for i in range(12):
        part('deck-plank',(l+(r-l)*i/12+.002,out,deck['bottomZM']),(l+(r-l)*(i+1)/12-.002,front,deck['topZM']))
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


def cloth_relief(area):
    import bmesh
    recipe=area['artDirectionFinish'];relief=recipe['clothRelief']
    group=area['activityGroups'][0];deck=group['bbox']['min'][2]
    panels=[]
    for item in group['instanceLayout']['parts']:
        if item['kind']!='hanging-cloth':continue
        lo,hi=item['localBox']['min'],item['localBox']['max']
        panels.append((group['id']+'-'+item['id'],52.2+lo[0],52.2+hi[0],deck+lo[2],deck+hi[2],False))
    linen=recipe['balconyLinen']
    panels.append(('R4-DOGLEG-HOUSE-BALCONY-linen',*linen['alongM'],min(p[1] for p in linen['pathOutZM']),max(p[1] for p in linen['pathOutZM']),True))
    for prefix,left,right,bottom,top,is_linen in panels:
        for ob in list(G.bpy.context.scene.objects):
            if not ob.name.startswith(prefix):continue
            bm=bmesh.new();bm.from_mesh(ob.data)
            bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
            across=[e for e in bm.edges if abs(e.verts[0].co.y-e.verts[1].co.y)>.06 and abs(e.verts[0].co.z-e.verts[1].co.z)<1e-6]
            bmesh.ops.subdivide_edges(bm,edges=across,cuts=15,use_grid_fill=True)
            bm.to_mesh(ob.data);bm.free()
            for v in ob.data.vertices:
                t=(G.ORIGIN[1]-v.co.y-left)/(right-left)
                drop=max(0,min(1,(top-v.co.z)/.22))
                wave=math.sin(t*math.pi*6+.35)
                delta=-relief['linenPleatDepthM']*(.5+.5*wave)*drop if is_linen else relief['dryingPleatAmplitudeM']*wave*drop
                v.co.x+=(-1 if is_linen else 1)*delta
                hem=max(0,1-(v.co.z-bottom)/.20)
                v.co.z+=relief['hemRiseM']*(.5+.5*math.sin(t*math.pi*3+.3))*hem
            ob.data.update();ob['doglegPleatedCloth']=True
            # Deformation must fit the original group and corrected balcony boxes.
            if not is_linen:
                bounds=next(item['localBox'] for item in group['instanceLayout']['parts'] if group['id']+'-'+item['id']==prefix)
                assert all(bounds['min'][1]-1e-6<=v.co.x+G.ORIGIN[0]-46<=bounds['max'][1]+1e-6 for v in ob.data.vertices),'Drying pleat escapes scheduled depth'
            assert len({round(v.co.y,5) for v in ob.data.vertices})>=16,'Cloth lacks cross-width subdivisions'


def art_finish(area):
    from bazaar_finish import apply
    apply(G.__dict__,OUT/(UNIT+'.glb'))
    spec=importlib.util.spec_from_file_location('dogleg_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)
    recipe=area['artDirectionFinish'];assert recipe['id']=='DOGLEG-P3'
    private=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz22_dogleg_')
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
    stock={g['id']+'-'+p['id']:p['stockColorSrgb'] for g in area['activityGroups'] for p in g['instanceLayout']['parts'] if p['kind'] in {'hanging-cloth','folded-cloth'}}
    for ob in list(G.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        if any(ob.name.startswith(prefix) for prefix in recipe['retireFinishPrefixes']):G.bpy.data.objects.remove(ob,do_unlink=True);continue
        source=ob.data.materials[0].get('bz04SourceMaterial',ob.data.materials[0].name)
        name=ob.name.removeprefix('life-wear-');owner=next((owners[p] for p in sorted(owners,key=len,reverse=True) if name.startswith(p)),None)
        color=next((v for p,v in stock.items() if ob.name.startswith(p)),None)
        if color:finish(ob,'cloth',color)
        elif owner=='dd-e' and any(k in source for k in ('plaster','beige')):finish(ob,'plaster')
        elif any(k in source for k in ('wood','timber','plank','pine')):
            family='painted_timber' if owner=='dd-e' and '-leaf-' in ob.name else 'worktop' if '-top-board' in ob.name else 'aged_timber' if ob.name.startswith('G_DD') else 'timber'
            finish(ob,family)
    # Rails and stiles stand proud of the closed panel; the original opaque back stays.
    for face in area['faces']:
        for parcel in face['parcels']:
            for o in parcel['openings']:
                for ob in list(G.bpy.context.scene.objects):
                    if not ob.name.startswith(o['id']+'-'):continue
                    if '-leaf-panel' in ob.name:tools.member_uv(ob,grain_axis=2)
                    if not any(k in ob.name for k in ('-frame-','-leaf-stile','-leaf-rail','-louver')):continue
                    direction=1 if face['face']=='west' else -1
                    front=max(direction*v.co.x for v in ob.data.vertices)
                    for v in ob.data.vertices:
                        if abs(direction*v.co.x-front)<1e-6:v.co.x+=direction*.025
                    ob.data.update();tools.member_uv(ob)
                    bevel=ob.modifiers.new('Dressed joinery arris','BEVEL');bevel.width=.003;bevel.segments=2
    # One linen length folds over the actual top rail, inside the balcony envelope.
    linen=recipe['balconyLinen'];before=set(G.bpy.context.scene.objects)
    G.cloth_path('R4-DOGLEG-HOUSE-BALCONY-linen','east',53,*linen['alongM'],linen['pathOutZM'],'ph_bz04_fine_linen',border=.018,color=linen['colorSrgb'],fringe=0)
    for ob in set(G.bpy.context.scene.objects)-before:finish(ob,'cloth',linen['colorSrgb'])
    cloth_relief(area)
    # Real frame bearings tie the drying rail to its existing posts.
    group=area['activityGroups'][0];a=52.2;deck=group['bbox']['min'][2]
    for sign in (-1,1):
        finish(G.member(group['id']+'-rail-brace',G.coords('west',46,a+sign*.825,-.265,deck+1.99),G.coords('west',46,a+sign*.57,-.265,deck+2.295),.035,G.WOOD),'aged_timber')
    return tools


def finish_fixture(area):
    objects=list(G.bpy.context.scene.objects)
    assert len([o for o in objects if o.name.startswith('R4-DOGLEG-HOUSE-BALCONY-deck-plank')])==12
    assert len([o for o in objects if o.name.startswith('G_DD_WORKS_RECESS-rail-brace')])==2
    assert len([o for o in objects if o.name.startswith('G_DD_WORKS_RECESS-folding-bench-leg')])==4
    assert not any(o.name.startswith(('life-dd-e-','life-dd-w-','life-wear-dd-e')) for o in objects)
    assert any(o.name.startswith('R4-DOGLEG-HOUSE-BALCONY-linen') for o in objects)
    assert any(o.name.startswith('G_DD_WORKS_RECESS-folded-batch') for o in objects)
    # Every plaster surface belonging to the house, including opening returns,
    # uses the same calibrated receiver finish rather than rectangular patches.
    for ob in objects:
        if ob.name.startswith('dd-e') and ob.data.materials[0].get('bz07SourceMaterial')=='ph_painted_plaster_warm':
            assert ob.data.materials[0].name=='bz22_dogleg_plaster'
    from mathutils import Vector
    linen=area['artDirectionFinish']['balconyLinen']
    cloth=[o for o in objects if o.name.startswith('R4-DOGLEG-HOUSE-BALCONY-linen')]
    assert all(G.ORIGIN[1]-v.co.y<54.25 for ob in cloth for v in ob.data.vertices),'Linen enters upper door service width'
    rail=[o for o in objects if o.name.startswith('R4-DOGLEG-HOUSE-BALCONY-front-rail')]
    along=sum(linen['alongM'])/2
    start=Vector(G.local(G.coords('east',53,along,.515,4.67)))
    hits=[o.ray_cast(start,Vector((0,0,-1)),distance=.04) for o in rail]
    assert any(hit and abs(point.z-4.65)<1e-5 for hit,point,normal,index in hits),'Linen has no rail bearing'
    assert any(abs(v.co.z-4.651)<1e-5 and abs((53-G.ORIGIN[0]-v.co.x)-.515)<.04 for ob in cloth for v in ob.data.vertices),'Cloth fold misses rail top'
    print('PASS Dogleg P3: 12 deck planks, bounded rail linen, two drying braces, four bench legs, folded batch, retired wall textiles',flush=True)


def build(saved,export=True):
    area=validate(saved);setup(saved);shells(area)
    for group in area['activityGroups']:DYE.activity(group)
    for feature in area['facadeFeatures']:balcony(feature)
    tools=art_finish(area)
    verify_geometry(area)
    finish_fixture(area)
    if export:
        for ob in list(G.bpy.context.scene.objects):G.prepare_mesh(ob)
        recipe=area['artDirectionFinish'];tools.bake_contact_occlusion(G.__dict__,recipe['contactRadiusM'],recipe['contactStrength'],subdivision_prefixes=('DD_WORKS_RECESS',))
        prepare=G.prepare_mesh;G.prepare_mesh=lambda ob:None
        try:
            G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],{'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})
        finally:G.prepare_mesh=prepare


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
    assert door['finishMaterialProfile']=='opaqueTimber'
    leaves=[ob for ob in G.bpy.context.scene.objects if ob.name.startswith(door['id']+'-leaf-panel')]
    assert len(leaves)==2 and all(ob.data.materials[0].name=='bz22_dogleg_painted_timber' for ob in leaves)
    group=area['activityGroups'][0]
    for item in group['instanceLayout']['parts']:
        if item['kind']=='hanging-cloth':assert len([ob for ob in G.bpy.context.scene.objects if ob.name.startswith(group['id']+'-cloth-tie-'+item['id'])])==2
    start=Vector(G.local((45,52.2,2.5)));hits=[]
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith('DD_WORKS_RECESS-'):continue
        hit,point,normal,index=ob.ray_cast(start,Vector((0,0,1)),distance=.4)
        if hit:hits.append((point.z,ob.name))
    assert sorted(hits)[0][1]=='DD_WORKS_RECESS-chamber-ceiling' and sum(abs(z-2.75)<1e-5 for z,name in hits)==1,'Duplicate west chamber ceiling'
    print('PASS Dogleg: 11 openings, 8 bounded workfront parts, supported balcony, opaque textured blue leaves, tied samples and single west chamber ceiling',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('mode',choices=['build','self-test','input-fixture'],nargs='?',default='build');parser.add_argument('--handoff',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None);saved=json.loads(args.handoff.read_text())
    {'build':build,'self-test':self_test,'input-fixture':input_fixture}[args.mode](saved)
