"""Build the Tea Stairs and Landing west receivers required by the Terrace roof."""
from pathlib import Path
import importlib.util

ROOT=Path(__file__).resolve().parents[3]
RECEIVERS={'unit-tea-stairs':{'ts-w'},'unit-tea-landing':{'tl-w'}}
ADDITIONAL_UNITS=dict(RECEIVERS,**{'unit-tea-terrace':None,'unit-tea-ramp':None,'unit-service-north':None})
spec=importlib.util.spec_from_file_location('terrace_receivers',ROOT/'assets/source/unit-fountain-court/build-receivers.py')
shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
shared.OUT=Path(__file__).resolve().parent
shared.PREFIX='tea-terrace-receivers-'
shared.EVIDENCE=ROOT/'artifacts/bazaar-r7-whole-map/unit-tea-terrace'
shared.SOURCE_URI='repo://assets/source/unit-tea-terrace/build-receivers.py'
shared.BUNDLES={'ROOF_BUNDLE_UNIT_TEA_TERRACE'}
shared.RECEIVERS=RECEIVERS
shared.ADDITIONAL_UNITS=ADDITIONAL_UNITS

original_module=shared.module
def module_with_spine_interface(name,path):
    loaded=original_module(name,path)
    if name!='receiver_textile':return loaded
    original_setup=loaded.setup
    def setup(saved):
        original_setup(saved)
        G=loaded.G;original_part=G.part
        load=shared.runpy.run_path(str(ROOT/'assets/source/integrate_bz04.py'))['load_handoff']
        spine=load(ROOT/'artifacts/bazaar-r7-whole-map/unit-service-north/handoff.json')['areas'][0]
        interfaces=shared.runpy.run_path(str(shared.INTERFACES))
        def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
            if name in {'ts-w-back','ts-w-end-closure','tl-w-back','tl-w-end-closure'}:
                remaining=[(lo,hi)]
                for f in spine['faces']:
                    for p in f['parcels']:
                        if p['id'] not in {'sn-es','sn-et','sn-en'}:continue
                        a,b=interfaces['local_bounds'](face,plane,p)
                        remaining=[piece for low,high in remaining for piece in interfaces['difference'](low,high,a,b)]
                result=None
                for a,b in remaining:result=original_part(face,plane,name,a,b,mid,shadow,bevel)
                return result
            return original_part(face,plane,name,lo,hi,mid,shadow,bevel)
        G.part=part
    loaded.setup=setup
    return loaded
shared.module=module_with_spine_interface
if __name__=='__main__':shared.main()
