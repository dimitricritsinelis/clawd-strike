"""Apply the bounded R7 secondary facade alignment proposal to --design PATH."""
import argparse
import copy
import json
from pathlib import Path

MOVES = {
    'ss-w-HIGH-LIGHT-1': (12.5, 15), 'ss-w-HIGH-LIGHT-3': (22.5, 25),
    'cc-w-CLERESTORY-1': (35.4, 34.5), 'cc-w-CLERESTORY-2': (44.4, 43.5),
    'sn-w-L1-W1': (50.4, 52.8), 'sn-w-L1-W3': (60.8, 64), 'sn-w-L1-W5': (72.8, 75.2),
    'DA_E_WORK-CLERESTORY-1': (12.88, 14.8), 'DA_E_SAMPLES-CLERESTORY-1': (21.52, 22.8),
    'dd-w-L1-W1': (52.2, 51.85), 'dd-w-L1-W2': (59.2, 58.85), 'dd-w-L2-W1': (52.2, 55),
    'nc-ey-L1-W1': (73.7, 73.6), 'nc-ey-L1-W2': (78.2, 78.1), 'nc-ey-L2-W1': (73.7, 75.5),
    'ts-e-L1-W1': (70.4, 69), 'ts-e-L2-W1': (70.4, 69),
}
PROSE = {
    'ss-w': 'Two receiving suites retain their offset delivery doors. High lights at 15 and 25 center the pair across the continuous 10..30 facade and each complete receiving suite.',
    'cc-w': 'The high-light pair at 34.5 and 43.5 centers on 39 across the continuous 30..48 facade. The receiving door and packing workfront retain their access positions.',
    'sn-w': 'Three full receiving tenancies occupy 48..57.6, 57.6..70.4 and 70.4..80. Upper storage lights at 52.8, 64 and 75.2 center a balanced row across the 48..80 facade. Ground work windows and delivery doors retain their paired-bay positions.',
    'DA_E_WORK': 'One high louver centers at 14.8 in the complete 10..19.6 work tenancy; the workfront and separate staff entrance retain their ground positions.',
    'DA_E_SAMPLES': 'One high louver centers at 22.8 in the complete 19.6..26 sample tenancy; the workfront and separate staff entrance retain their ground positions.',
    'dd-w': 'The unequal broad and service light pair at 51.85 and 58.85 has balanced outer margins in the 48..62 facade. The single full-width drying-loft vent centers independently at 55. Ground access remains unchanged.',
    'nc-ey': 'The unequal workroom and service light pair at 73.6 and 78.1 has balanced outer margins in the 71..80 facade. The single full-width drying-loft vent centers independently at 75.5. Ground access remains unchanged.',
    'ts-e': 'The two rear lights stack at 69, centered in the visibly bounded 66..72 return. They serve the existing stock and loft rooms at their rear wall; front openings need not share this rear axis. The ground face stays closed along the grade.',
}
RENAMES = {'dd-w-L2-W1': 'dd-w-LOFT-VENT', 'nc-ey-L2-W1': 'nc-ey-LOFT-VENT'}
PIERS = {'ss-w': [10, 20, 30], 'DA_E_WORK': [10, 15.9, 19.6], 'DA_E_SAMPLES': [19.6, 23.9, 26]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--design', type=Path, required=True)
    args = parser.parse_args()
    data = json.loads(args.design.read_text())
    before = copy.deepcopy(data)
    parcels = {p['id']: p for a in data['areas'] for f in a['faces'] for p in f['parcels']}
    buildings = {b['id']: b for b in data['buildings']}
    openings = {o['id']: o for p in parcels.values() for o in p['openings']}
    original_text = {}
    for pid, prose in PROSE.items():
        p = parcels[pid]
        original_text[pid] = p.get('windowComposition', p['purpose'])
        p['purpose'] = prose
        if 'windowComposition' in p:
            p['windowComposition'] = prose
        p['structuralGrid']['program'] = prose
        if pid == 'ts-e':
            p['structuralGrid']['noOpeningReason'] = 'The closed ground wall preserves the existing stair grade; the centered upper lights serve the existing rear room receivers.'
        for o in p['openings']:
            if o['id'] not in MOVES:
                continue
            old, new = MOVES[o['id']]
            assert o['alongM'] == old and o['axisM'] == old, (o['id'], o['alongM'])
            assert o['kind'] in ('window', 'vent')
            o['alongM'] = o['axisM'] = new
            o['alignmentReason'] = prose
            if 'designNote' in o:
                o['designNote'] = 'R7 facade-section alignment; retain the existing opening size, profile, finish and sill/head datums.'
            assert p['interval'][0] < new - o['widthM']/2 < new + o['widthM']/2 < p['interval'][1]
        p['structuralGrid']['axesM'] = sorted({o['alongM'] for o in p['openings']})
        if pid in PIERS:
            p['structuralGrid']['bayEdgesM'] = PIERS[pid]

    # These are complete tenancy rooms, not rooms manufactured around old vents.
    for bid, pid, intervals in [
        ('BLD_SPICE_SERVICE_WEST', 'ss-w', [(10.1, 19.9), (20.1, 29.9)]),
        ('BLD_NORTH_SERVICE_COMPOUND', 'sn-w', [(48.1, 57.5), (57.7, 70.3), (70.5, 79.9)]),
    ]:
        b = buildings[bid]
        level = 0 if pid == 'ss-w' else 1
        for n, (lo, hi) in enumerate(intervals, 1):
            room = next(r for r in b['rooms'] if r['id'] == f'{bid}:{pid}:L{level}:R5-ROOM-{n}')
            room['boundsXYZ']['min'][1] = lo
            room['boundsXYZ']['max'][1] = hi
            room['use'] = PROSE[pid]
            if pid == 'ss-w':
                door = openings[f'ss-w-DELIVERY-{n}']
                door['roomId'] = room['id']

    changed_buildings = {parcels[p]['buildingId'] for p in PROSE}
    for bid in changed_buildings:
        b = buildings[bid]
        affected = [p for p in PROSE if parcels[p]['buildingId'] == bid]
        for pid in affected:
            old = original_text[pid]
            for room in b['rooms']:
                if room.get('referenceParcelId') == pid:
                    room['use'] = PROSE[pid]
            # Replace matching composition prose without altering other owned faces.
            for key in ('composition', 'asymmetryReason'):
                if b.get(key) == old or len(b['memberParcelIds']) == 1:
                    if key in b:
                        b[key] = PROSE[pid]
            if b.get('architecturalIntent', {}).get('composition') == old or len(b['memberParcelIds']) == 1:
                b['architecturalIntent']['composition'] = PROSE[pid]
        for elevation in b.get('elevations', []):
            if elevation['parcelId'] in PROSE:
                elevation['axesM'] = parcels[elevation['parcelId']]['structuralGrid']['axesM']
                if elevation['parcelId'] in PIERS:
                    elevation['bayEdgesM'] = PIERS[elevation['parcelId']]
        if any(pid in PIERS for pid in b.get('mainFacade', {}).get('parcelIds', [])):
            b['structuralBayEdgesM'] = sorted({edge for pid in b['mainFacade']['parcelIds'] for edge in parcels[pid]['structuralGrid']['bayEdgesM']})
        for floor in b.get('floorAxisSchedule', []):
            for facade in floor['facades']:
                if facade['parcelId'] in PROSE:
                    facade['axesM'] = sorted({o['alongM'] for o in parcels[facade['parcelId']]['openings'] if o['storey'] == floor['storey']})
            main = set(b.get('mainFacade', {}).get('parcelIds', []))
            floor['mainFacadeAxesM'] = sorted({axis for f in floor['facades'] if f['parcelId'] in main for axis in f['axesM']})
        b['primaryAxesM'] = sorted({o['alongM'] for pid in b.get('mainFacade', {}).get('parcelIds', []) for o in parcels[pid]['openings'] if o['storey'] == 0})
        b['subordinateAxesM'] = sorted({o['alongM'] for pid in b['memberParcelIds'] for o in parcels[pid]['openings'] if o['alongM'] not in b['primaryAxesM']})

    # A full-width loft vent is not the L1 workroom window's named vertical stack.
    # Exact ID replacement keeps the existing floor and detail references intact.
    def rename(value):
        if isinstance(value, dict):
            return {k: rename(v) for k, v in value.items()}
        if isinstance(value, list):
            return [rename(v) for v in value]
        return RENAMES.get(value, value) if isinstance(value, str) else value
    data = rename(data)

    # Explicit invariants catch any accidental widening of this bounded patch.
    after_parcels = {p['id']: p for a in data['areas'] for f in a['faces'] for p in f['parcels']}
    before_parcels = {p['id']: p for a in before['areas'] for f in a['faces'] for p in f['parcels']}
    allowed = {'id', 'alongM', 'axisM', 'alignmentReason', 'designNote'}
    for pid, p in after_parcels.items():
        prior = before_parcels[pid]
        if pid not in PROSE:
            assert p == prior, pid
        for key in ('roof', 'footprint', 'materialId', 'materialRegions', 'floorLevelsM', 'wallTopM', 'shellDepthM'):
            assert p.get(key) == prior.get(key), (pid, key)
        for old, new in zip(prior['openings'], p['openings']):
            if old['id'] not in MOVES:
                if old['id'] in ('ss-w-DELIVERY-1', 'ss-w-DELIVERY-2'):
                    assert {k:v for k,v in old.items() if k != 'roomId'} == {k:v for k,v in new.items() if k != 'roomId'}, old['id']
                else:
                    assert old == new, old['id']
            else:
                assert {k: v for k, v in old.items() if k not in allowed} == {k: v for k, v in new.items() if k not in allowed}, old['id']
                room = next(r for r in buildings[new['buildingId']]['rooms'] if r['id'] == new['roomId'])
                axis_index = 0 if p['face'] in ('north', 'south') else 1
                assert room['boundsXYZ']['min'][axis_index] <= new['alongM'] - new['widthM']/2
                assert room['boundsXYZ']['max'][axis_index] >= new['alongM'] + new['widthM']/2
    args.design.write_text(json.dumps(data, indent=2) + '\n')
    print(f'Applied {len(MOVES)} secondary opening moves in {len(PROSE)} parcels; ground openings, sizes, materials, footprints and roofs preserved.')


if __name__ == '__main__':
    main()
