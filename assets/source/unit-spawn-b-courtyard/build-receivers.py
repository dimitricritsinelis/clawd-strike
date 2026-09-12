"""Build the two outside receiver shells required by the approved B courtyard roof."""
from pathlib import Path
import importlib.util
import runpy

ROOT=Path(__file__).resolve().parents[3]
RECEIVERS={'unit-link-north-east':{'lne-n'},'unit-link-north-west':{'lnw-n-part-2'}}
ADDITIONAL_UNITS=dict(runpy.run_path(str(ROOT/'assets/source/unit-rug-gate/build-receivers.py'))['ADDITIONAL_UNITS'])
ADDITIONAL_UNITS.update({'unit-spawn-b-courtyard':None,'unit-link-north-east':{'lne-w','lne-n'},'unit-link-north-west':{'lnw-n-part-2'}})

spec=importlib.util.spec_from_file_location('b_receiver_geometry',ROOT/'assets/source/unit-fountain-court/build-receivers.py')
shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
shared.OUT=Path(__file__).resolve().parent
shared.PREFIX='b-receivers-'
shared.EVIDENCE=ROOT/'artifacts/bazaar-r7-whole-map/unit-spawn-b-courtyard'
shared.SOURCE_URI='repo://assets/source/unit-spawn-b-courtyard/build-receivers.py'
shared.BUNDLES={'ROOF_BUNDLE_UNIT_SPAWN_B_COURTYARD'}
shared.RECEIVERS=RECEIVERS
shared.ADDITIONAL_UNITS=ADDITIONAL_UNITS

if __name__=='__main__':shared.main()
