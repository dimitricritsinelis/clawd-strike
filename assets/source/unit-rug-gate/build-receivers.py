"""Build only the five outside receiver shells required by the R7 Rug Gate roof."""
from pathlib import Path
import importlib.util

ROOT=Path(__file__).resolve().parents[3]
RECEIVERS={
    'unit-link-east-upper':{'leu-n'},
    'unit-link-north-east':{'lne-w'},
    'unit-link-west-upper':{'lwu-s'},
    'unit-tea-stairs':{'ts-e'},
    'unit-tea-terrace':{'tt-rug-return'},
}
ADDITIONAL_UNITS=dict(RECEIVERS,**{'unit-rug-gate':None,'unit-spawn-b-courtyard':{'B_S_EAST','B_S_WEST'}})

spec=importlib.util.spec_from_file_location('rug_receiver_geometry',ROOT/'assets/source/unit-fountain-court/build-receivers.py')
shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
shared.OUT=Path(__file__).resolve().parent
shared.PREFIX='rug-receivers-'
shared.EVIDENCE=ROOT/'artifacts/bazaar-r7-whole-map/unit-rug-gate'
shared.SOURCE_URI='repo://assets/source/unit-rug-gate/build-receivers.py'
shared.BUNDLES={'ROOF_BUNDLE_UNIT_RUG_GATE'}
shared.RECEIVERS=RECEIVERS
shared.ADDITIONAL_UNITS=ADDITIONAL_UNITS

# The Link remains level at y=72; its hidden base meets the descending Tea
# receiver only over that receiver's exact x=19..19.6 footprint.
def shop_cavity():
    load=shared.runpy.run_path(str(ROOT/'assets/source/integrate_bz04.py'))['load_handoff']
    saved=load(ROOT/'artifacts/bazaar-r7-whole-map/unit-rug-gate/handoff.json')
    face,opening=next((f,o) for f in saved['areas'][0]['faces'] for p in f['parcels'] for o in p['openings'] if o['id']=='R_W_SHOP')
    cavity=opening['shopfront']['cavity']
    assert face['face']=='west' and cavity['frontProfile']=='rectangular' and cavity['chamberWidthM']==opening['widthM']
    return saved,(face['wallPlaneM']+cavity['chamberBackOutM'],opening['alongM']-cavity['chamberWidthM']/2,opening['sillM']), (face['wallPlaneM'],opening['alongM']+cavity['chamberWidthM']/2,cavity['chamberCeilingM'])

original_module=shared.module

def module_with_grade_contact(name,path):
    loaded=original_module(name,path)
    if name!='receiver_textile':return loaded
    original_setup=loaded.setup
    def setup(saved):
        original_setup(saved)
        if saved['unit'] in {'unit-tea-terrace','unit-tea-stairs'}:
            _,low,high=shop_cavity()
            difference=shared.runpy.run_path(str(shared.INTERFACES))['difference']
            G=loaded.G;original_part=G.part
            def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
                if name not in {'tt-rug-return-base-closure','ts-e-base-closure'}:
                    return original_part(face,plane,name,lo,hi,mid,shadow,bevel)
                assert face=='east' and plane==19 and hi[2]>lo[2]
                # Both base slabs lie below the shop ceiling after the existing
                # Tea grade transform. Remove only the chamber's plan overlap.
                assert max(saved['areas'][0]['floor'].get('elevationM',0),saved['areas'][0]['floor'].get('startElevationM',0))<high[2]
                result=None
                for a,b in difference(lo,hi,(low[1],plane-high[0],lo[2]),(high[1],plane-low[0],hi[2])):
                    result=original_part(face,plane,name,a,b,mid,shadow,bevel)
                return result
            G.part=part
            return
        if saved['unit']!='unit-link-west-upper':return
        tea,_=shared.inputs('unit-tea-stairs')
        floor=tea['areas'][0]['floor']
        neighbor=next(p for f in tea['areas'][0]['faces'] for p in f['parcels'] if p['id']=='ts-e')
        assert floor['kind']=='ramp' and floor['axis']=='y'
        x,y,X,Y=neighbor['footprint']
        G=loaded.G;original_part=G.part
        def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
            if name!='lwu-s-base-closure':return original_part(face,plane,name,lo,hi,mid,shadow,bevel)
            assert face=='south' and plane==Y==72 and lo[0]==x==19 and lo[1]==-.5
            result=None
            for start,end in [(lo[0],X),(X,hi[0])]:
                result=original_part(face,plane,name,(start,lo[1],lo[2]),(end,hi[1],hi[2]),mid,shadow,bevel)
                if start>=X:continue
                for vertex in result.data.vertices:
                    worldY=G.ORIGIN[1]-vertex.co.y
                    grade=floor['startElevationM']+(worldY-floor['rect']['y'])/floor['rect']['h']*(floor['endElevationM']-floor['startElevationM'])
                    vertex.co.z+=grade
                result.data.update();G.world_uv(result,float(result.data.materials[0].get('tileSizeM',2)))
            return result
        G.part=part
    loaded.setup=setup
    return loaded

shared.module=module_with_grade_contact

original_verify=shared.verify

def verify_grade_contact(unit):
    original_verify(unit)
    if unit in {'unit-tea-terrace','unit-tea-stairs'}:
        saved,_=shared.inputs(unit);shop,low,high=shop_cavity()
        V=shared.runpy.run_path(str(ROOT/'assets/source/unit-spawn-b-courtyard/verify.py'))
        origin=saved['areas'][0]['sectionOriginDesign']
        triangles,report=V['glb'](shared.OUT/(shared.PREFIX+unit.removeprefix('unit-')+'.glb'),tuple(origin[k] for k in ('x','y','z')))
        hits=sum(V['intersects'](tri,low,high) for _,tri in triangles)
        (shared.EVIDENCE/('receiver-'+unit+'-shop-cavity.json')).write_text(shared.json.dumps({
            'status':'pass' if not hits else 'fail','inputSha256':saved['inputSha256'],'shopInputSha256':shop['inputSha256'],
            'receiverSha256':report['sha256'],'cavity':{'min':low,'max':high},'intersections':hits,
            'preserved':'Tea-facing ground contact at x19 and base fragments outside the exact rectangular shop recess'},indent=2)+'\n')
        assert hits==0, ('Tea base obstructs R_W_SHOP cavity',unit,hits)
        print('PASS exported Tea/Rug shop cavity',unit)
        return
    if unit!='unit-link-west-upper':return
    tea,_=shared.inputs('unit-tea-stairs');floor=tea['areas'][0]['floor']
    V=shared.runpy.run_path(str(ROOT/'assets/source/unit-spawn-b-courtyard/verify.py'))
    triangles,_=V['glb'](shared.OUT/'rug-receivers-link-west-upper.glb',(19,72,0))
    seam=[v for _,tri in triangles for v in tri if abs(v[0]-19)<1e-5 and 71.5-1e-5<=v[1]<71.99]
    assert seam, 'Missing graded Link/Tea contact edge'
    clearances=[]
    for x,y,z in seam:
        grade=floor['startElevationM']+(y-floor['rect']['y'])/floor['rect']['h']*(floor['endElevationM']-floor['startElevationM'])
        assert min(abs(z-grade),abs(z-grade+.02))<1e-5, ('Link/Tea contact misses grade',x,y,z,grade)
        clearances.append(z-grade)
    front=[v[2] for _,tri in triangles for v in tri if abs(v[1]-72)<1e-5]
    assert front and abs(min(front))<1e-5, 'Link front no longer meets its unchanged zero floor'
    (shared.EVIDENCE/'receiver-link-west-upper-grade-contact.json').write_text(shared.json.dumps({
        'status':'pass','neighborInputSha256':tea['inputSha256'],'neighborParcel':'ts-e',
        'seamVertexCount':len(seam),'minGradeClearanceM':min(clearances),'maxGradeClearanceM':max(clearances),
        'shapeDelta':'Split base closure at x19.6; raise x19..19.6 base by neighboring Tea grade, retaining its20mm thickness and front floor0.',
        'futureReuse':'Full Link West Upper builder must preserve this exact graded rear-base contact when replacing the dependency.'},indent=2)+'\n')
    print('PASS exported Link/Tea grade contact',len(seam),'seam vertices')

shared.verify=verify_grade_contact

if __name__=='__main__':shared.main()
