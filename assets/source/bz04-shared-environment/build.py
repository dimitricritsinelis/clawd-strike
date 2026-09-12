"""R7 shared finishes and coordinated roof bundles, using the installed geometry tools."""
from pathlib import Path
import argparse
import copy
import hashlib
import importlib.util
import json
import sys

ROOT=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('bz04_courtyard',ROOT/'assets/source/unit-spawn-b-courtyard/build.py')
B=importlib.util.module_from_spec(spec);spec.loader.exec_module(B)


def validate():
    design=ROOT/'docs/map-design/construction/design.json'
    if hashlib.sha256(design.read_bytes()).hexdigest()!='d9ba8a7d4b4c9872e5d959d49c342c511941eb0e4f7463d79d52c932b8495bdb':
        raise ValueError('Approved R7 design changed before shared construction')
    assert len(B.R['roofCells'])==78 and len(B.R['roofBundles'])==19
    assert len(B.D['skyline'])==15
    for bundle in B.R['roofBundles']:
        for parcel,materials in bundle['componentMaterialsBySource'].items():
            for component,mid in materials.items():
                assert B.PARCELS[parcel]['roof']['materialIds'][component]==mid,(bundle['id'],parcel,component)


def shared_finish(unit):
    path=ROOT/'assets/source/bz04-shared-environment/bz04-shared-environment.glb'
    B.bpy.ops.wm.open_mainfile(filepath=str(path.with_suffix('.blend')))
    B.ORIGIN=(28,48,0);B.MATS.clear()
    from facade_materials import _CACHE
    _CACHE.clear()
    zone=next(a['zone'] for a in B.D['areas'] if a['outputUnit']==unit)
    B.A=copy.deepcopy(next(a for a in B.D['areas'] if a['outputUnit']==unit))
    B.A.pop('finishSchedule',None)
    selected={b['id'] for b in B.D['skyline'] if b.get('zone')==zone}
    before={o.name:[tuple(v.co) for v in o.data.vertices] for o in B.bpy.context.scene.objects if o.type=='MESH'}
    for ob in B.bpy.context.scene.objects:
        if ob.type!='MESH':continue
        if ob.name!='BG-GROUND' and not any(ob.name.startswith(mid+'-') for mid in selected):continue
        old=ob.data.materials[0].get('bz04SourceMaterial',ob.data.materials[0].name.split('.')[0])
        if old not in B.D['materials']:
            profiles=[*B.D['craftStandards']['materials'].values(),*[p for a in B.D['areas'] for p in a.get('finishSchedule',{}).get('materials',{}).values()]]
            old=next((p['sourceMaterialId'] for p in profiles if isinstance(p,dict) and p.get('exportName')==old and 'sourceMaterialId' in p),old)
        if old not in B.D['materials']:raise ValueError(f'Unresolved shared source material: {ob.name}: {old}')
        ob.data.materials.clear();ob.data.materials.append(B.mat(old))
        B.world_uv(ob,float(B.mat(old).get('tileSizeM',2)))
    assert before=={o.name:[tuple(v.co) for v in o.data.vertices] for o in B.bpy.context.scene.objects if o.type=='MESH'}
    budget=B.D['sharedEnvironment']
    package=json.loads((ROOT/'assets/source'/unit/'package.json').read_text())
    override=package.get('sharedExportBudgetOverride')
    if override:
        assert override.get('reason') and set(override)<= {'reason','maxShadowPrimitives'}
        assert isinstance(override['maxShadowPrimitives'],int) and override['maxShadowPrimitives']>=budget['maxShadowPrimitives']
        budget['maxShadowPrimitives']=override['maxShadowPrimitives']
    finished=set(B.bpy.context.scene.get('bz04FinishedBackgroundIds',[]))|selected
    B.export(path,None,budget['maxTriangles'],budget['maxRenderedPrimitives'],{'bz04SharedEnvironment':True,'bz04DesignRevision':B.D['areas'][0]['designRevision']['id'],'bz04FinishedBackgroundIds':sorted(finished),'bz04ExportBudget':budget})


def main():
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--roof');group.add_argument('--shared-finish',action='store_true');group.add_argument('--self-test',action='store_true')
    parser.add_argument('--unit')
    options=parser.parse_args(args);validate()
    if options.self_test:
        for bundle in B.R['roofBundles']:
            position=bundle['baseCentrePlacement']['position'];B.reset(tuple(position[k] for k in ('x','y','z')))
            p=(position['x']+.31,position['y']+.79,position['z']+.47)
            assert all(abs(a-b)<1e-8 for a,b in zip(B.local(p),(.31,-.79,.47)))
        print('PASS shared fixtures: approved source,78 cells/19 bundles,all component bindings,asymmetric frames')
    elif options.roof:
        bundle=copy.deepcopy(next(b for b in B.R['roofBundles'] if b['id']==options.roof))
        B.A=copy.deepcopy(next(a for a in B.D['areas'] if a['outputUnit']==bundle['installationOutputUnit']))
        B.A.pop('finishSchedule',None)
        package=ROOT/'assets/source'/bundle['installationOutputUnit']/'package.json'
        override=json.loads(package.read_text()).get('roofExportBudgetOverride') if package.exists() else None
        if override:
            assert override.get('reason') and set(override)<= {'reason','maxRenderedPrimitives','phasePrimitiveAllowance'}
            assert isinstance(override['maxRenderedPrimitives'],int) and override['maxRenderedPrimitives']>=bundle['declaredAllocation']['primitives']['total']
            print('Approved per-area roof primitive allowance:',override)
            bundle['declaredAllocation']['primitives']['total']=override['maxRenderedPrimitives']
            if 'phasePrimitiveAllowance' in override:
                assert isinstance(override['phasePrimitiveAllowance'],int) and override['phasePrimitiveAllowance']>=0
                bundle['phasePrimitiveAllowance']=override['phasePrimitiveAllowance']
        B.roof_bundle(bundle)
    else:
        if not options.unit:parser.error('--shared-finish requires the area --unit')
        shared_finish(options.unit)


if __name__=='__main__':main()
