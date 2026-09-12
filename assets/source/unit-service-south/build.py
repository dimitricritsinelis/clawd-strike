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


def build(saved,export=True):
    area=validate_handoff(saved);geometry(saved)
    origin=area['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ('x','y','z')))
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    interfaces['install'](G,area,additional_units={UNIT:None,'unit-caravan-court':{'cc-s'},'unit-link-south-west':{'lsw-n'}})
    S.build_shells(area,receiving_opening)
    # The north/south receiver fronts close the end caps of the retained
    # exterior rear skin. Keep its exterior faces, remove only those caps.
    import bmesh
    from integrate_bz04 import load_handoff
    rear=[ob for ob in G.bpy.context.scene.objects if ob.name=='ss-e-back' or ob.name.startswith('ss-e-back.')]
    for unit,ident in [('unit-caravan-court','cc-s'),('unit-link-south-west','lsw-n')]:
        receiver=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map'/unit/'handoff.json')['areas'][0]
        face,parcel=next((f,p) for f in receiver['faces'] for p in f['parcels'] if p['id']==ident)
        for ob in rear:
            bm=bmesh.new();bm.from_mesh(ob.data);caps=[]
            for polygon in bm.faces:
                points=[(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]) for v in polygon.verts]
                if all(abs(p[1]-face['wallPlaneM'])<1e-5 and parcel['interval'][0]-1e-5<=p[0]<=parcel['interval'][1]+1e-5 and parcel['floorElevationM']-1e-5<=p[2]<=parcel['wallTopM']+1e-5 for p in points):caps.append(polygon)
            if caps:bmesh.ops.delete(bm,geom=caps,context='FACES_ONLY')
            bm.to_mesh(ob.data);bm.free()

    if export:
        S.validate_objects(area)
        G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],
            {'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})


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
