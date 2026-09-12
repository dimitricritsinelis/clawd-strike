"""Build this frozen R7 link with the shared measured link receiver source."""
from pathlib import Path
import importlib.util
spec=importlib.util.spec_from_file_location('bz04_link',Path(__file__).resolve().parent.parent/'unit-link-west-mid/build.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
if __name__=='__main__':module.main('unit-link-north-west')
