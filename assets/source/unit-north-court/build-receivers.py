"""Build only the four outside link receiver parcels needed by North Court's roof."""
from pathlib import Path
import importlib.util
import runpy

ROOT=Path(__file__).resolve().parents[3]
RECEIVERS={'unit-link-east-upper':{'leu-n-part-2','leu-s-part-3'},'unit-link-north-east':{'lne-e','lne-s'}}
ADDITIONAL_UNITS={}
for path in ['unit-spawn-b-courtyard','unit-covered-souk']:
    for unit,ids in runpy.run_path(str(ROOT/'assets/source'/path/'build-receivers.py'))['ADDITIONAL_UNITS'].items():
        ADDITIONAL_UNITS[unit]=None if ids is None or (unit in ADDITIONAL_UNITS and ADDITIONAL_UNITS[unit] is None) else set(ADDITIONAL_UNITS.get(unit,()))|set(ids)
for unit,ids in RECEIVERS.items():
    if ADDITIONAL_UNITS.get(unit,()) is not None:ADDITIONAL_UNITS[unit]=set(ADDITIONAL_UNITS.get(unit,()))|ids
ADDITIONAL_UNITS.update({'unit-north-court':None,'unit-dyers-dogleg':None,'unit-covered-souk':None})

spec=importlib.util.spec_from_file_location('north_court_receivers',ROOT/'assets/source/unit-fountain-court/build-receivers.py')
shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
shared.OUT=Path(__file__).resolve().parent
shared.PREFIX='north-court-receivers-'
shared.EVIDENCE=ROOT/'artifacts/bazaar-r7-whole-map/unit-north-court'
shared.SOURCE_URI='repo://assets/source/unit-north-court/build-receivers.py'
shared.BUNDLES={'ROOF_BUNDLE_UNIT_NORTH_COURT'}
shared.RECEIVERS=RECEIVERS
shared.ADDITIONAL_UNITS=ADDITIONAL_UNITS
original_module=shared.module
def module_with_rear_owner(name,path):
    loaded=original_module(name,path)
    if name!='receiver_textile':return loaded
    original_setup=loaded.setup
    def setup(saved):
        original_setup(saved)
        if saved['unit']!='unit-link-east-upper':return
        parcels={p['id']:p for f in saved['areas'][0]['faces'] for p in f['parcels'] if p['id'] in RECEIVERS[saved['unit']]}
        G=loaded.G;original_part=G.part
        def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
            # North's retained outer rear planes close these coincident ends.
            for pid,p in parcels.items():
                if name==pid+'-end-closure' and lo[0]==p['interval'][0]:return None
            return original_part(face,plane,name,lo,hi,mid,shadow,bevel)
        G.part=part
    loaded.setup=setup
    return loaded
shared.module=module_with_rear_owner

if __name__=='__main__':shared.main()
