"""Clip internal end/back skins at the current Fountain receiver interfaces.

Only scheduled same-building parcels supply cutters. Primary facade fields,
openings and external boundaries retain their existing construction recipes.
"""
from pathlib import Path
import hashlib
import json
import re
import runpy

ROOT = Path(__file__).resolve().parents[3]


def active_parcels(additional_units=None):
    schedule = runpy.run_path(str(Path(__file__).with_name('build-receivers.py')))['RECEIVERS']
    schedule = dict(schedule, **{'unit-fountain-court': None, 'unit-spice-street': None,
                                 'unit-spawn-a-courtyard': None})
    for unit,ids in (additional_units or {}).items():
        schedule[unit] = None if ids is None or (unit in schedule and schedule[unit] is None) else set(schedule.get(unit,())) | set(ids)
    result = []
    for unit, ids in schedule.items():
        saved = json.loads((ROOT/'artifacts/bazaar-r7-whole-map'/unit/'handoff.json').read_text())
        encoded = {k:v for k,v in saved.items() if k not in {'source','designSha256','reading','inputSha256'}}
        digest = hashlib.sha256(json.dumps(encoded,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        assert saved['unit'] == unit and digest == saved['inputSha256'], 'Corrupt frozen interface handoff'
        for face in saved['areas'][0]['faces']:
            for parcel in face['parcels']:
                if ids is None or parcel['id'] in ids:
                    result.append((face,parcel))
    return result


def local_bounds(face, plane, parcel):
    x,y,X,Y = parcel['footprint']
    z,Z = parcel['floorElevationM'],parcel['wallTopM']
    return {'north': ((x,plane-Y,z),(X,plane-y,Z)),
            'south': ((x,y-plane,z),(X,Y-plane,Z)),
            'east': ((y,plane-X,z),(Y,plane-x,Z)),
            'west': ((y,x-plane,z),(Y,X-plane,Z))}[face]


def difference(lo, hi, cut_lo, cut_hi):
    """Disjoint box difference; no tolerance slivers or geometry booleans."""
    low = [max(lo[i],cut_lo[i]) for i in range(3)]
    high = [min(hi[i],cut_hi[i]) for i in range(3)]
    if any(high[i]-low[i] <= 1e-8 for i in range(3)):
        return [(lo,hi)]
    result = []
    lo,hi = list(lo),list(hi)
    for axis in range(3):
        if low[axis]-lo[axis] > 1e-8:
            end = hi.copy();end[axis] = low[axis]
            result.append((tuple(lo),tuple(end)));lo[axis] = low[axis]
        if hi[axis]-high[axis] > 1e-8:
            start = lo.copy();start[axis] = high[axis]
            result.append((tuple(start),tuple(hi)));hi[axis] = high[axis]
    return result


def pieces(face, plane, parcel, kind, lo, hi, active):
    axis = 1 if kind in {'rear','back'} else 0
    # Test the authored boundary plane, not the centre of its 20 mm skin.
    boundary = -parcel['shellDepthM'] if axis == 1 else min(parcel['interval'],key=lambda p:abs(p-lo[0]))
    result = [(lo,hi)]
    for other_face,other in active:
        if other['id'] == parcel['id'] or other['buildingId'] != parcel['buildingId']:
            continue
        low,high = local_bounds(face,plane,other)
        # A shared outside boundary still needs a skin. Only its primary face
        # can replace that skin; a coincident back/end cannot claim ownership.
        primary_axis = 0 if ((face in {'north','south'}) != (other_face['face'] in {'north','south'})) else 1
        primary = other_face['wallPlaneM']
        if axis == 1:
            primary = (plane-primary) if face in {'north','east'} else (primary-plane)
        interior = low[axis]+1e-8 < boundary < high[axis]-1e-8
        front_owned = primary_axis == axis and abs(boundary-primary) < 1e-8
        if interior or front_owned:
            result = [part for start,end in result for part in difference(start,end,low,high)]
    return result


def install(geometry, area, skip=(), additional_units=None):
    active = active_parcels(additional_units)
    own = {p['id']:p for face in area['faces'] for p in face['parcels']}
    original = geometry.part

    def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        match = re.fullmatch(r'(.+)-(end(?:-closure)?|side|rear|back)(?:\.\d+)?',name)
        if not match or match[1] not in own or match[1] in skip:
            return original(face,plane,name,lo,hi,mid,shadow,bevel)
        remaining = pieces(face,plane,own[match[1]],match[2],lo,hi,active)
        result = None
        for index,(start,end) in enumerate(remaining):
            result = original(face,plane,name if index == 0 else name+'-interface-'+str(index),start,end,mid,shadow,bevel)
        return result

    geometry.part = part


def self_test():
    active = active_parcels()
    selected = {p['id']:(f,p) for f,p in active}
    def skin(name,kind,lo,hi):
        face,parcel = selected[name]
        return pieces(face['face'],face['wallPlaneM'],parcel,kind,lo,hi,active)
    assert skin('F_W_HALL','rear',(41,-5,0),(48,-4.98,11.4)) == []
    assert skin('cc-en','back',(41,-.6,0),(48,-.58,11.4)) == []
    assert skin('F_NW','end',(20,-3.4,0),(20.02,-.02,11.1)) == []
    assert skin('F_W_HALL','end',(47.98,-5,0),(48,-.02,11.4)) == [((47.98,-1.0,0),(48,-.02,11.4))]
    outer = ((32,-5,0),(32.02,-.02,10.9))
    assert skin('F_E_LOGGIA','end',*outer) == [outer], 'Unclaimed outer end must remain'
    from types import SimpleNamespace
    calls = []
    geometry = SimpleNamespace(part=lambda *args: calls.append(args))
    area = {'faces':[{'parcels':[selected['F_W_HALL'][1]]}]}
    install(geometry,area)
    for name in ('F_W_HALL-field','F_W_HALL-HIGH-LIGHT-opaque-glass-back','F_W_HALL-PRINCIPAL-end'):
        args = ('west',20,name,(41,-.2,0),(42,0,2),'stone','receive',0)
        geometry.part(*args)
        assert calls[-1] == args, 'Primary geometry recipe changed'
    print('PASS Fountain interface fixture: reciprocal obstructing skins removed, partial and outer ends retained, primary parts unchanged')


if __name__ == '__main__':
    self_test()
