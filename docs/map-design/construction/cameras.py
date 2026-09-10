#!/usr/bin/env python3
"""Export the authored BZ-04 poses; never move a camera to conceal a defect."""
import argparse
import hashlib
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def schedule(design):
    views = [view for area in design['areas'] for view in area['criticalViews']]
    return {
        'schemaVersion': 3,
        'source': 'docs/map-design/construction/design.json::areas[].criticalViews',
        'captureHook': 'cameras.py --capture-plan exports the existing map-polish-capture adapter schema; map:shoot does not automatically discover these poses',
        'cameraContract': design['cameraContract'],
        'views': views,
        'zeroBuildFaces': design['zeroBuildFaces'],
        'captureBatches': design['cameraBatches'],
    }


def capture_plan(design, unit):
    views = {v['id']: v for a in design['areas'] for v in a['criticalViews']}
    batches = [b for b in design['cameraBatches'] if unit is None or b['outputUnit'] == unit]
    if not batches:
        raise ValueError(f'No capture batches for {unit}')
    units = []
    for batch in batches:
        captures = []
        for alias in batch['aliases']:
            v = views[alias['sourceViewId']]
            x, y, z = v['designPosition']
            yaw, pitch = math.radians(v['yawDeg']), math.radians(v['pitchDeg'])
            # Runtime camera forward is (-sin(yaw), sin(pitch), -cos(yaw)).
            captures.append({'id': alias['id'], 'camera': {
                'designPosition': {'x': x, 'y': y, 'z': z},
                'designLookAt': {'x': x-math.sin(yaw)*math.cos(pitch),
                                 'y': y-math.cos(yaw)*math.cos(pitch), 'z': z+math.sin(pitch)},
                'playerPosition': {'x': x, 'y': z-1.7, 'z': y},
                'yawDeg': v['yawDeg'], 'pitchDeg': v['pitchDeg'], 'fovDeg': v['fovDeg'],
            }})
        # Some frozen connector rectangles overlap a court. Include only zones
        # that geometrically contain these exact poses, not every map zone.
        enclosing = set()
        for view_id in batch['viewIds']:
            x, y, _ = views[view_id]['designPosition']
            for area in design['areas']:
                r = area['rect']
                if r['x'] <= x <= r['x']+r['w'] and r['y'] <= y <= r['y']+r['h']:
                    enclosing.add(area['zone'])
        units.append({'id': batch['id'], 'zoneIds': sorted(enclosing), 'views': captures})
    runtime = ROOT / 'apps/client/public/maps/bazaar-map/map_spec.json'
    return {'authorityHash': hashlib.sha256(runtime.read_bytes()).hexdigest(),
            'authorityHashMeaning': 'SHA256 of runtime map JSON at plan export; not a measured collider hash',
            'units': units, 'contactSheets': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--capture-plan', type=Path, help='Explicit output path for an adapter plan; save and reuse for before and after')
    parser.add_argument('--unit', help='One outputUnit; omission exports all zones')
    args = parser.parse_args()
    design = json.loads((HERE / 'design.json').read_text())
    if args.capture_plan:
        if args.check:
            parser.error('--check cannot be combined with --capture-plan')
        if args.capture_plan.exists():
            parser.error('Capture plan already exists; preserve its before poses and use a new filename')
        args.capture_plan.write_text(json.dumps(capture_plan(design, args.unit), indent=2)+'\n')
        print(f'Exported adapter plan {args.capture_plan}; no game was launched')
        return
    result = json.dumps(schedule(design), indent=2)+'\n'
    target = HERE / 'cameras.json'
    if args.check:
        if target.read_text() != result:
            raise SystemExit('FAIL cameras.json differs from authored design poses')
        print('PASS camera schedule reproducibility')
    else:
        target.write_text(result)
        print('Wrote cameras.json from authored design poses')


if __name__ == '__main__':
    main()
