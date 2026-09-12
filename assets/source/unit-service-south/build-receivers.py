"""Build the two exact outside receiver shells required by Service South's roof."""
from pathlib import Path
import importlib.util

ROOT=Path(__file__).resolve().parents[3]
RECEIVERS={'unit-caravan-court':{'cc-s'},'unit-link-south-west':{'lsw-n'}}
ADDITIONAL_UNITS=dict(RECEIVERS,**{'unit-service-south':None})

spec=importlib.util.spec_from_file_location('service_south_receivers',ROOT/'assets/source/unit-fountain-court/build-receivers.py')
shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
shared.OUT=Path(__file__).resolve().parent
shared.PREFIX='service-south-receivers-'
shared.EVIDENCE=ROOT/'artifacts/bazaar-r7-whole-map/unit-service-south'
shared.SOURCE_URI='repo://assets/source/unit-service-south/build-receivers.py'
shared.BUNDLES={'ROOF_BUNDLE_UNIT_SERVICE_SOUTH'}
shared.RECEIVERS=RECEIVERS
shared.ADDITIONAL_UNITS=ADDITIONAL_UNITS

if __name__=='__main__':shared.main()
