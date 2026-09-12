"""Build the two exact outside receiver shells required by the Dyers Alley roof."""
from pathlib import Path
import importlib.util

ROOT=Path(__file__).resolve().parents[3]
RECEIVERS={'unit-covered-souk':{'cs-s-part-2'},'unit-link-south-east':{'lse-n-part-2'}}
ADDITIONAL_UNITS=dict(RECEIVERS,**{'unit-dyers-alley':None})
spec=importlib.util.spec_from_file_location('dyers_alley_receivers',ROOT/'assets/source/unit-fountain-court/build-receivers.py')
shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
shared.OUT=Path(__file__).resolve().parent
shared.PREFIX='dyers-alley-receivers-'
shared.EVIDENCE=ROOT/'artifacts/bazaar-r7-whole-map/unit-dyers-alley'
shared.SOURCE_URI='repo://assets/source/unit-dyers-alley/build-receivers.py'
shared.BUNDLES={'ROOF_BUNDLE_UNIT_DYERS_ALLEY'}
shared.RECEIVERS=RECEIVERS
shared.ADDITIONAL_UNITS=ADDITIONAL_UNITS

original_module=shared.module
def module_with_rear_owner(name,path):
    loaded=original_module(name,path)
    if name!='receiver_textile':return loaded
    original_setup=loaded.setup
    def setup(saved):
        original_setup(saved)
        load=shared.runpy.run_path(str(ROOT/'assets/source/integrate_bz04.py'))['load_handoff']
        dyers=load(ROOT/'artifacts/bazaar-r7-whole-map/unit-dyers-alley/handoff.json')['areas'][0]
        pid=next(iter(RECEIVERS[saved['unit']]))
        parcel=next(p for f in saved['areas'][0]['faces'] for p in f['parcels'] if p['id']==pid)
        partner=next(p for f in dyers['faces'] for p in f['parcels'] if p['id']==({'cs-s-part-2':'da-house','lse-n-part-2':'da-works'}[pid]))
        assert parcel['buildingId']==partner['buildingId'] and parcel['footprint'][0]==partner['footprint'][0]
        assert parcel['wallTopM']<=partner['wallTopM']
        G=loaded.G;original_part=G.part
        def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
            # Dyers' retained rear closes this coincident exterior plane; a
            # second receiver end skin would overlap it at the same x datum.
            if name==pid+'-end-closure' and lo[0]==parcel['interval'][0]:return None
            return original_part(face,plane,name,lo,hi,mid,shadow,bevel)
        G.part=part
    loaded.setup=setup
    return loaded
shared.module=module_with_rear_owner

if __name__=='__main__':shared.main()
