"""Build this frozen R7 Tea section with the coordinated Tea geometry source."""
from pathlib import Path
import importlib.util
spec=importlib.util.spec_from_file_location('bz04_tea',Path(__file__).resolve().parent.parent/'unit-tea-terrace/build.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
if __name__=='__main__':module.main('unit-tea-stairs')
