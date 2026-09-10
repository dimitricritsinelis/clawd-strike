#!/usr/bin/env python3
"""Extract one area's current construction inputs without copying the whole map."""
import argparse
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def extract(unit, design=None, roof=None):
    design = design if design is not None else json.loads((HERE / 'design.json').read_text())
    areas = [a for a in design['areas'] if a['outputUnit'] == unit]
    if not areas:
        raise ValueError(f'No construction area for {unit}')
    parcel_ids = {p['id'] for a in areas for f in a['faces'] for p in f['parcels']}
    building_ids = {p.get('buildingId') for a in areas for f in a['faces'] for p in f['parcels']}
    opening_buildings = {o.get('buildingId') for a in areas for f in a['faces'] for p in f['parcels'] for o in p['openings']}
    buildings = [b for b in design['buildings'] if b['id'] in building_ids | opening_buildings]
    # Each area's own craftSchedule already carries its district composition.
    craft={k:v for k,v in design.get('craftStandards',{}).items() if k!='districtCharacter'}
    encoded = json.dumps([areas,craft])
    materials = {k:v for k,v in design['materials'].items() if f'"{k}"' in encoded}
    roof = roof if roof is not None else json.loads((HERE / 'roof-coordination.json').read_text())
    bundle_ids = {b for a in areas for b in a.get('roofBundleIds', [])}
    result = {
        'source': 'design.json (read-only extraction; never edit this output)',
        'designSha256': hashlib.sha256((HERE/'design.json').read_bytes()).hexdigest(),
        'unit': unit, 'areas': areas, 'buildings': buildings, 'materials': materials,
        'materialRuntimeContract': design['materialRuntimeContract'],
        'craftStandards': craft,
        'requiredCapabilities': {
            'openingProfiles': sorted({o.get('headShape','rectangular') for a in areas for f in a['faces'] for p in f['parcels'] for o in p['openings']}),
            'openingCraftProfiles': sorted({o['architecturalDetail']['profile'] for a in areas for f in a['faces'] for p in f['parcels'] for o in p['openings'] if o.get('architecturalDetail')}),
            'glazingPatterns': sorted({o['glazingProfile']['pattern'] for a in areas for f in a['faces'] for p in f['parcels'] for o in p['openings'] if o.get('glazingProfile')}),
            'featureKinds': sorted({f['kind'] for a in areas for f in a.get('facadeFeatures',[])}),
            'landscapeKinds': sorted({e['kind'] for a in areas for e in a.get('landscapeElements',[])}),
            'partKinds': sorted({p['kind'] for a in areas for g in a['activityGroups'] for p in g['instanceLayout']['parts']}),
            'craftRecipes': sorted({recipe for a in areas for recipe in a.get('craftSchedule',{}).get('requiredRecipes',[])}),
            'materialRecipeModes': sorted({m['baseColorRecipe']['mode'] for m in materials.values() if m.get('baseColorRecipe')}),
            'materialExportBindings': sorted({m['baseColorRecipe']['exportName'] for m in materials.values() if m.get('baseColorRecipe')}),
            'materialCropRecipes': sorted({name for name, m in materials.items() if m.get('surfaceCropRecipe')}),
        },
        'roofBundles': [b for b in roof['roofBundles'] if b['id'] in bundle_ids],
        'legacyDispositions': [d for d in design['legacyDispositions'] if d.get('zone') in {a['zone'] for a in areas}],
        'phaseRule': 'implementationPhase overrides coordination-only full-map roof references. Require the named craftSchedule roof receivers before activation; otherwise retain legacy output and report the interface deferred. Never invent a cap or expand the queue. Existing asset hashes decide reuse.',
        'reading': [*dict.fromkeys(a.get('constructionSheet',f'{unit}.md') for a in areas), 'integration.md', 'details.md', 'craftsmanship.md', 'design-basis.md',
                    *[f"drawings/{a['zone'].lower()}-{kind}.svg" for a in areas for kind in ['plan','elevations','axon']]],
    }
    inputs={k:v for k,v in result.items() if k not in ['source','designSha256','reading']}
    result['inputSha256']=hashlib.sha256(json.dumps(inputs,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--unit', required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    value = extract(args.unit)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(value, indent=2)+'\n')
    print(f"{args.unit}: {len(value['areas'])} area(s), {len(value['buildings'])} buildings; wrote {args.output}")


if __name__ == '__main__':
    main()
