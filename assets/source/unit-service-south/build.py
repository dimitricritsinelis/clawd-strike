"""Build the complete approved R7 Service South section from its frozen handoff.

The shared courtyard primitives and Spawn A envelope builder preserve all open
mouths. Roof bundle/floor bindings and producer retirement are whole-map operations.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import runpy
import sys

ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
UNIT='unit-service-south'


def validate_handoff(saved,current=None):
    encoded={k:v for k,v in saved.items() if k not in {'source','designSha256','reading','inputSha256'}}
    digest=hashlib.sha256(json.dumps(encoded,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    current=current or runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if saved.get('unit')!=UNIT or digest!=saved.get('inputSha256') or digest!=current['inputSha256']:
        raise ValueError('Service South handoff changed or is corrupt; no output replaced')
    supported={'openingProfiles':{'rectangular','segmental'},'openingCraftProfiles':{'planked-receiving'},
        'glazingPatterns':set(),'featureKinds':set(),'landscapeKinds':set(),'partKinds':set(),
        'craftRecipes':{'CF-ENVELOPE','CF-FLOOR','CF-JOINT','CF-OPEN','CF-R4-PORTAL'}}
    for key,allowed in supported.items():
        if set(saved['requiredCapabilities'][key])-allowed:raise ValueError(('unsupported capability',key,saved['requiredCapabilities'][key]))
    a=saved['areas'][0]
    assert a['zone']=='SERVICE_SOUTH' and not a['fixtures'] and not a['activityGroups']
    return a


def geometry(saved):
    global S,G
    spec=importlib.util.spec_from_file_location('bz04_flat_envelope',ROOT/'assets/source/unit-spawn-a-courtyard/build.py')
    S=importlib.util.module_from_spec(spec);spec.loader.exec_module(S)
    G=S.geometry(saved);G.OUT=OUT
    return G


def receiving_opening(face,plane,o,trim,back):
    G.opening(face,plane,o,trim,back)
    if o['kind']!='door' or o['headShape']!='rectangular':return
    # Ease the aperture-facing arris only. The outside jamb boundary must
    # remain flush against the surrounding single-skin wall field.
    for side,along in [('left',o['alongM']-o['widthM']/2),('right',o['alongM']+o['widthM']/2)]:
        ob=G.bpy.data.objects[o['id']+'-'+side+'-return']
        modifier=next(m for m in ob.modifiers if m.type=='BEVEL');modifier.limit_method='WEIGHT'
        weights=ob.data.attributes.new('bevel_weight_edge','FLOAT','EDGE')
        front=plane+(o['frontProjectionM'] if face=='west' else -o['frontProjectionM'])
        for edge,weight in zip(ob.data.edges,weights.data):
            weight.value=float(all(abs(G.ORIGIN[1]-ob.data.vertices[i].co.y-along)<1e-5 and abs(G.ORIGIN[0]+ob.data.vertices[i].co.x-front)<1e-5 for i in edge.vertices))


def art_finish(area):
    """Give the closed receiving warehouses physical joinery and useful services."""
    from bazaar_finish import apply
    apply(G.__dict__,OUT/(UNIT+'.glb'))
    recipe=area['artDirectionFinish']
    spec=importlib.util.spec_from_file_location('service_finish_materials',ROOT/'assets/source/unit-spice-street/materials.py')
    tools=importlib.util.module_from_spec(spec);spec.loader.exec_module(tools)
    materials=tools.create_materials(G.__dict__,recipe['materials'],prefix='bz13_service_south_')
    def finish(ob,family,factor=1):
        ob.data.materials.clear();ob.data.materials.append(materials[family])
        old=ob.data.color_attributes.get('COLOR_0')
        if old:ob.data.color_attributes.remove(old)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
        for color in colors.data:color.color=(factor,factor,factor,1)
        ob.data.color_attributes.active_color=colors
        if family in {'timber','painted_timber','aged_timber'}:tools.member_uv(ob)
        else:G.world_uv(ob,float(materials[family]['tileSizeM']))
        return ob
    for ob in list(G.bpy.context.scene.objects):
        if ob.type!='MESH':continue
        if '-leaf-board' in ob.name:
            # Close the 2 mm open joints as tongue-and-groove boards. At oblique
            # player views those subpixel slots aliased into a black dot grid.
            low=min(v.co.y for v in ob.data.vertices);high=max(v.co.y for v in ob.data.vertices)
            for v in ob.data.vertices:v.co.y+=-.001 if abs(v.co.y-low)<1e-6 else .001 if abs(v.co.y-high)<1e-6 else 0
        material=ob.data.materials[0];source=material.get('bz04SourceMaterial',material.name)
        if any(key in source for key in ('plaster','beige')):
            finish(ob,'plaster' if ob.name.startswith('ss-e') else 'sand')
        elif any(key in source for key in ('timber','wood','plank','pine')):
            family='painted_timber' if ob.name.startswith('ss-e-ENTRANCE') else 'aged_timber' if ob.name.startswith('ss-w-DELIVERY-2') else 'timber'
            finish(ob,family,.93+.07*(sum(ob.name.encode())%9)/8)

    j=recipe['doorJoinery']
    for face in area['faces']:
        for parcel in face['parcels']:
            for o in parcel['openings']:
                if o['kind']!='door':continue
                f,plane=face['face'],face['wallPlaneM'];name=o['id'];c=-o['depthM']+.04
                left=o['alongM']-o['widthM']/2+.085;right=o['alongM']+o['widthM']/2-.085;middle=o['alongM']
                family='painted_timber' if f=='east' else 'aged_timber' if name.endswith('2') else 'timber'
                def timber(label,lo,hi):return finish(G.part(f,plane,name+'-P3-'+label,lo,hi,G.WOOD,'cast',.004),family)
                # A rebated meeting stile seals the old bright seam while preserving two leaves.
                timber('meeting-stile',(middle-.028,c-.015,.085),(middle+.028,c+j['projectionFromLeafM'],o['headM']-.08))
                for leaf,(L,R) in enumerate(((left,middle-.005),(middle+.005,right))):
                    for x in (L,R-j['stileWidthM']):
                        timber('stile',(x,c,.10),(x+j['stileWidthM'],c+j['projectionFromLeafM'],2.37))
                    for z in (.12,1.12,2.27):
                        timber('rail',(L,c,z),(R,c+j['projectionFromLeafM'],z+j['railHeightM']))
                    timber('kick-board',(L,c+j['projectionFromLeafM'],.08),(R,c+.057,.08+j['kickBoardHeightM']))
                    pull=middle+(-.14 if leaf==0 else .14)
                    G.part(f,plane,name+'-P3-pull-plate',(pull-.038,c+.047,1.22),(pull+.038,c+.06,1.38),G.IRON,'receive',.008)
                    G.ring(name+'-P3-pull',f,plane,pull,c+.081,1.27,.055)
                    for x in (L+.05,R-.05):
                        for z in (.47,o['heightM']-.33):
                            G.part(f,plane,name+'-P3-strap-rivet',(x-.009,c+.012,z-.009),(x+.009,c+.025,z+.009),G.IRON,'receive',.003)
                # Loading trolleys strike replaceable wall-mounted timber pads, clear of the apron.
                for x in (left-.37,right+.37):
                    finish(G.part(f,plane,name+'-P3-bumper',(x-j['bumperWidthM']/2,.002,.17),(x+j['bumperWidthM']/2,j['bumperProjectionM'],j['bumperTopM']),G.WOOD,'cast',.015),'timber')
                    for z in (.32,.88):G.part(f,plane,name+'-P3-bumper-bolt',(x-.014,.1,z-.014),(x+.014,.112,z+.014),G.IRON,'receive',.004)
    service=recipe['eastServices'];a=service['rainConductorAlongM'];z,Z=service['rainConductorZM'];w=service['rainConductorWidthM']
    G.part('east',10,'P3-ss-rain-conductor',(a-w/2,.022,z),(a+w/2,.105,Z),G.IRON,'cast',.018)
    for height in (.4,1.9,3.5,4.7):
        G.part('east',10,'P3-ss-rain-clip',(a-.064,.001,height-.02),(a+.064,.12,height+.02),G.IRON,'cast',.005)
    L,R=service['conduitAlongM'];height=service['conduitZM'];b=service['serviceBoxAlongM'];bottom,top=service['serviceBoxZM']
    G.member('P3-ss-service-conduit',G.coords('east',10,L,.031,height),G.coords('east',10,R,.031,height),.026,G.IRON)
    G.member('P3-ss-service-drop',G.coords('east',10,b,.031,top),G.coords('east',10,b,.031,height),.026,G.IRON)
    G.part('east',10,'P3-ss-service-box',(b-.18,.002,bottom),(b+.18,.135,top),G.IRON,'cast',.015)
    G.part('east',10,'P3-ss-service-lid',(b-.16,.135,bottom+.02),(b+.16,.147,top-.02),G.IRON,'receive',.005)
    G.part('east',10,'P3-ss-loading-light-back',(L-.21,.001,height-.14),(L+.21,.06,height+.14),G.IRON,'cast',.015)
    G.part('east',10,'P3-ss-loading-light-hood',(L-.24,.015,height+.10),(L+.24,.21,height+.15),G.IRON,'cast',.014)
    lens=G.bpy.data.materials.new('bz13_service_opal_lens');lens.use_nodes=True
    lens.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.57,.55,.45,1)
    lens.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.43
    G.MATS[lens.name]=lens
    G.part('east',10,'P3-ss-loading-light-lens',(L-.17,.06,height-.095),(L+.17,.12,height+.075),lens.name,'receive',.012)
    for i in range(3):
        x=L+(R-L)*i/2
        G.part('east',10,'P3-ss-conduit-clip',(x-.017,.001,height-.027),(x+.017,.051,height+.027),G.IRON,'receive',.003)
    # A flush dressed landing belongs only to the principal loading threshold.
    stone='bz13_service_loading_stone';material=G.mat('ph_bz04_trim_sanded_01').copy();material.name=stone
    if 'bz04UvRepeat' in material:del material['bz04UvRepeat']
    material['tileSizeM']=.55;G.MATS[stone]=material
    apron=recipe['loadingApron'];L,R=apron['alongM'];back,front=apron['outM']
    for row in range(apron['rows']):
        for column in range(apron['columns']):
            x=L+(R-L)*column/apron['columns'];X=L+(R-L)*(column+1)/apron['columns']
            o=back+(front-back)*row/apron['rows'];O=back+(front-back)*(row+1)/apron['rows']
            ob=G.part('east',10,'P3-ss-loading-apron',(x+.003,o+.003,.001),(X-.003,O-.003,apron['topZM']),stone,'receive',.002)
            G.paint_object(ob,['#bab3a2','#c0b9a8','#b4ae9e'][(row+column)%3])
            G.world_uv(ob,.55)
    drain=recipe['downpipeDrain'];L,R=drain['alongM'];back,front=drain['outM']
    G.part('east',10,'P3-ss-drain-receiver',(L,back,.001),(R,front,.004),G.IRON,'receive')
    for i in range(9):
        x=L+.012+(R-L-.024)*i/8
        G.part('east',10,'P3-ss-drain-bar',(x-.004,back,.004),(x+.004,front,drain['topZM']),stone,'receive')
    return tools


def build(saved,export=True):
    area=validate_handoff(saved);geometry(saved)
    origin=area['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ('x','y','z')))
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    interfaces['install'](G,area,additional_units={UNIT:None,'unit-caravan-court':{'cc-s'},'unit-link-south-west':{'lsw-n'}})
    S.build_shells(area,receiving_opening)
    # The north/south receiver fronts close the end caps of the retained
    # exterior rear skin. Keep its exterior faces, remove only those caps.
    import bmesh
    extract=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']
    rear=[ob for ob in G.bpy.context.scene.objects if ob.name=='ss-e-back' or ob.name.startswith('ss-e-back.')]
    for unit,ident in [('unit-caravan-court','cc-s'),('unit-link-south-west','lsw-n')]:
        receiver=extract(unit)['areas'][0]
        face,parcel=next((f,p) for f in receiver['faces'] for p in f['parcels'] if p['id']==ident)
        for ob in rear:
            bm=bmesh.new();bm.from_mesh(ob.data);caps=[]
            for polygon in bm.faces:
                points=[(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]) for v in polygon.verts]
                if all(abs(p[1]-face['wallPlaneM'])<1e-5 and parcel['interval'][0]-1e-5<=p[0]<=parcel['interval'][1]+1e-5 and parcel['floorElevationM']-1e-5<=p[2]<=parcel['wallTopM']+1e-5 for p in points):caps.append(polygon)
            if caps:bmesh.ops.delete(bm,geom=caps,context='FACES_ONLY')
            bm.to_mesh(ob.data);bm.free()

    if export:
        tools=art_finish(area);S.validate_objects(area)
        prepare=G.prepare_mesh
        for ob in G.bpy.context.scene.objects:
            if ob.type=='MESH':prepare(ob)
        recipe=area['artDirectionFinish'];tools.bake_contact_occlusion(G.__dict__,recipe['contactRadiusM'],recipe['contactStrength'])
        G.prepare_mesh=lambda ob:None
        try:
            G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
                {'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})
        finally:G.prepare_mesh=prepare


def self_test(saved):
    build(saved,False);area=saved['areas'][0];objects=list(G.bpy.context.scene.objects)
    for ob in objects:
        G.prepare_mesh(ob)
        assert min(v.co.z for v in ob.data.vertices)>=-.02001,ob.name
    doors=vents=0
    for face in area['faces']:
        for parcel in face['parcels']:
            for opening in parcel['openings']:
                prefix=opening['id'];parts=[ob for ob in objects if ob.name.startswith(prefix+'-')]
                assert parts,('Missing opening',prefix)
                if opening['kind']=='door':
                    doors+=1
                    assert opening['architecturalDetail']['profile']=='planked-receiving' and opening['trimWidthM']==.16
                    boards=[ob for ob in parts if '-leaf-board' in ob.name];straps=[ob for ob in parts if '-strap' in ob.name]
                    assert len(boards)>=10 and len(straps)==4,('Incomplete double receiving leaf',prefix)
                    for board in boards:
                        along=[G.ORIGIN[1]-v.co.y for v in board.data.vertices]
                        assert max(along)-min(along)<=.18001 and board.data.materials[0]==G.mat(G.WOOD)
                    for strap in straps:
                        assert abs(max(v.co.z for v in strap.data.vertices)-min(v.co.z for v in strap.data.vertices)-.04)<1e-5
                        assert strap.data.materials[0]==G.mat(G.IRON)
                    threshold=next(ob for ob in parts if ob.name in {prefix+'-threshold',prefix+'-sill'})
                    assert min(v.co.z for v in threshold.data.vertices)>=-.02001 and max(v.co.z for v in threshold.data.vertices)<=.01001
                else:
                    vents+=1;assert any('-louver' in ob.name for ob in parts)
            for ob in objects:
                if not ob.name.startswith(parcel['id']+'-field'):continue
                height=sum(v.co.z for v in ob.data.vertices)/len(ob.data.vertices)
                region=next(r for r in parcel['materialRegions'] if r['zM'][0]<=height<=r['zM'][1])
                assert ob.data.materials[0]==G.mat(region['materialId']),('Wrong wall region material',ob.name)
    assert doors==3 and vents==5
    assert {(o['kind'],o['headShape']) for f in area['faces'] for p in f['parcels'] for o in p['openings']}=={('door','rectangular'),('door','segmental'),('vent','rectangular')}
    assert not any(ob.name.startswith('ss-e-end-closure') for ob in objects),'Internal receiver skin retained'
    assert any(ob.name.startswith('ss-s-field') for ob in objects),'Closed south wall missing'
    art_finish(area);S.validate_objects(area)
    for face in area['faces']:
        for parcel in face['parcels']:
            for opening in parcel['openings']:
                if opening['kind']!='door':continue
                intervals=sorted((min(G.ORIGIN[1]-v.co.y for v in ob.data.vertices),max(G.ORIGIN[1]-v.co.y for v in ob.data.vertices)) for ob in G.bpy.context.scene.objects if ob.name.startswith(opening['id']+'-leaf-board'))
                for previous,current in zip(intervals,intervals[1:]):
                    if abs((previous[1]+current[0])/2-opening['alongM'])<.03:continue
                    assert abs(current[0]-previous[1])<1e-5,('Open subpixel leaf joint',opening['id'],previous,current)
    print('PASS receiving leaf joints are closed; separate leaves retain their meeting stile',flush=True)
    for o in G.bpy.context.scene.objects:
        if o.name.startswith('P3-ss-') or '-P3-' in o.name:
            for v in o.data.vertices:
                x,y,z=v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]
                assert not (4.25<x<8.75 and 10<y<30 and z<2.2),('Service finish enters route',o.name)
    print('PASS P3 service hardware stays against receivers and outside the protected route',flush=True)
    print('PASS Service South fixtures: 3 double planked doors, four dark straps each, bounded thresholds, 5 louvers, exact field materials and receiver skins',flush=True)

def verify_jamb_export(saved):
    """Ray-test the exported rectangular jamb boundary and retained inner arris."""
    area=validate_handoff(saved);origin=area['sectionOriginDesign']
    verifier=runpy.run_path(str(ROOT/'assets/source/unit-spawn-b-courtyard/verify.py'))
    triangles,_=verifier['glb'](OUT/(UNIT+'.glb'),tuple(origin[k] for k in ('x','y','z')))
    def ray(y,z,x,direction):
        hits=[]
        for material,t in triangles:
            a,b,c=t;den=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1])
            if abs(den)<1e-10:continue
            u=((y-a[1])*(c[2]-a[2])-(z-a[2])*(c[1]-a[1]))/den
            w=((b[1]-a[1])*(z-a[2])-(b[2]-a[2])*(y-a[1]))/den
            if min(u,w,1-u-w)<-1e-7:continue
            hit=a[0]+u*(b[0]-a[0])+w*(c[0]-a[0])
            if (hit-x)*direction>=0:hits.append(((hit-x)*direction,hit))
        return min(hits)[1]
    count=0
    for face in area['faces']:
        for parcel in face['parcels']:
            for o in parcel['openings']:
                if o['kind']!='door' or o['headShape']!='rectangular':continue
                plane=face['wallPlaneM'];outward=1 if face['face']=='west' else -1
                for side in (-1,1):
                    edge=o['alongM']+side*o['widthM']/2
                    for z in (.713,1.513,2.213):
                        flat=ray(edge+side*(o['trimWidthM']-.001),z,plane+outward,-outward)
                        inner=ray(edge+side*.001,z,plane+outward,-outward)
                        assert abs(flat-plane)<1e-5,('Jamb outer boundary is recessed',o['id'],side,z,flat)
                        assert .005<abs(inner-plane)<.009,('Aperture arris lost its 8 mm bevel',o['id'],side,z,inner)
                        count+=2
    print('PASS exported jamb regression:',count,'rays; outer wall joins flush, aperture arrises remain eased',flush=True)


if __name__=='__main__':
    try:
        if '--handoff' not in sys.argv:raise ValueError('Requires --handoff <frozen handoff.json>')
        saved=json.loads(Path(sys.argv[sys.argv.index('--handoff')+1]).read_text());validate_handoff(saved)
        if 'verify-jamb' in sys.argv:verify_jamb_export(saved)
        elif 'check-inputs' in sys.argv:print('PASS Service South frozen input and capability validation')
        elif 'self-test' in sys.argv:self_test(saved)
        else:build(saved)
    except Exception:
        import traceback
        traceback.print_exc();sys.exit(1)
