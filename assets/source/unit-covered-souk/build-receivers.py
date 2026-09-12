"""Build the Dogleg and North receiver parcels needed by Covered Souk's roof seam."""
from pathlib import Path
import importlib.util

ROOT=Path(__file__).resolve().parents[3]
RECEIVERS={'unit-dyers-dogleg':{'dd-e','dd-w'},'unit-north-court':{'nc-s'}}
ADDITIONAL_UNITS=dict(RECEIVERS,**{'unit-covered-souk':None,'unit-dyers-alley':None})
spec=importlib.util.spec_from_file_location('covered_souk_receivers',ROOT/'assets/source/unit-fountain-court/build-receivers.py')
shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
shared.OUT=Path(__file__).resolve().parent
shared.PREFIX='covered-souk-receivers-'
shared.EVIDENCE=ROOT/'artifacts/bazaar-r7-whole-map/unit-covered-souk'
shared.SOURCE_URI='repo://assets/source/unit-covered-souk/build-receivers.py'
shared.BUNDLES={'ROOF_BUNDLE_UNIT_DYERS_DOGLEG'}
shared.RECEIVERS=RECEIVERS
shared.ADDITIONAL_UNITS=ADDITIONAL_UNITS

original_module=shared.module
def module_with_receiver_caps(name,path):
    loaded=original_module(name,path)
    if name!='receiver_textile':return loaded
    original_setup=loaded.setup
    def setup(saved):
        original_setup(saved)
        if saved['unit']!='unit-dyers-dogleg':return
        G=loaded.G;original_part=G.part
        dd=next(p for f in saved['areas'][0]['faces'] for p in f['parcels'] if p['id']=='dd-e')
        load=shared.runpy.run_path(str(ROOT/'assets/source/integrate_bz04.py'))['load_handoff']
        souk=load(ROOT/'artifacts/bazaar-r7-whole-map/unit-covered-souk/handoff.json')['areas'][0]
        cs=next(p for f in souk['faces'] for p in f['parcels'] if p['id']=='cs-e')
        assert dd['footprint'][::2]==cs['footprint'][::2] and dd['footprint'][1]==cs['footprint'][3] and dd['wallTopM']<=cs['wallTopM']
        def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
            if name=='dd-e-end-closure' and lo[0]==dd['interval'][0]:return None
            return original_part(face,plane,name,lo,hi,mid,shadow,bevel)
        G.part=part
    loaded.setup=setup
    original_shells=loaded.S.build_shells
    def shells(area,*args,**kwargs):
        original_shells(area,*args,**kwargs)
        if area['outputUnit']!='unit-dyers-dogleg':return
        import bmesh
        G=loaded.G
        for ob in list(G.bpy.context.scene.objects):
            if not ob.name.startswith(('dd-w-back','dd-e-back')):continue
            bm=bmesh.new();bm.from_mesh(ob.data)
            caps=[f for f in bm.faces if any(all(abs(G.ORIGIN[1]-v.co.y-y)<1e-5 for v in f.verts) for y in ((48,62) if ob.name.startswith('dd-w-back') else (48,)))]
            if caps:bmesh.ops.delete(bm,geom=caps,context='FACES_ONLY')
            bm.to_mesh(ob.data);bm.free()
    loaded.S.build_shells=shells
    return loaded
shared.module=module_with_receiver_caps
original_verify=shared.verify
def verify_receiver_craft(unit):
    original_verify(unit)
    if unit!='unit-dyers-dogleg':return
    saved,_=shared.inputs(unit);area=saved['areas'][0];origin=area['sectionOriginDesign']
    inspection=shared.json.loads((shared.OUT/(shared.PREFIX+unit.removeprefix('unit-')+'.inspection.json')).read_text())
    objects=inspection['objects'];checks=[]
    for feature in area['facadeFeatures']:
        matches=[o for o in objects if o['id'].startswith(feature['id']+'-')]
        assert matches, 'Missing scheduled balcony'
        for ob in matches:
            lo,hi=ob['bounds']['min'],ob['bounds']['max']
            low=[lo[0]+origin['x'],origin['y']-hi[1],lo[2]+origin['z']]
            high=[hi[0]+origin['x'],origin['y']-lo[1],hi[2]+origin['z']]
            assert all(feature['bbox']['min'][i]-.001<=low[i] and high[i]<=feature['bbox']['max'][i]+.001 for i in range(3)),ob['id']
        assert len([o for o in matches if o['id'].startswith(feature['id']+'-brace')])==2
        checks.append({'feature':feature['id'],'objects':len(matches),'bounds':'pass','braces':2})
    for group in area['activityGroups']:
        for item in group['instanceLayout']['parts']:
            if item['kind']!='locked-timber-lattice-gate':continue
            prefix=group['id']+'-'+item['id']
            for part in ['stile','rail','vertical-lattice','horizontal-lattice','hinge','locked-latch']:
                assert any(o['id'].startswith(prefix+'-'+part) for o in objects),('missing gate component',part)
            checks.append({'gate':prefix,'frameLatticeHingesLatch':'pass'})
    (shared.EVIDENCE/'receiver-dogleg-craft.json').write_text(shared.json.dumps({'status':'pass','sha256':inspection['sha256'],'checks':checks},indent=2)+'\n')
    print('PASS Dogleg receiver balcony and locked gate')
shared.verify=verify_receiver_craft

if __name__=='__main__':shared.main()
