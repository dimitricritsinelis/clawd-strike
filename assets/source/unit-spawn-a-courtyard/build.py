"""Build the frozen R7 Spawn A receiver shells and scheduled courtyard craft.

The B courtyard module owns the shared geometry/export primitives. Roof bundles,
floor material binding and legacy producer retirement are integrated separately.
"""
from pathlib import Path
import argparse
import copy
import hashlib
import importlib.util
import json
import math
import runpy
import sys
import struct

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
UNIT = 'unit-spawn-a-courtyard'
PART_KINDS = {'fitted-cloth-cushion', 'folded-cloth', 'framed-timber-end',
              'grounded-timber-table', 'lidded-ceramic-vessel',
              'locked-timber-lattice-gate', 'plank-board',
              'rounded-ceramic-vessel', 'stone-plinth', 'timber-member'}
G = None


def digest(value):
    inputs = {k: v for k, v in value.items()
              if k not in {'source', 'designSha256', 'reading', 'inputSha256'}}
    return hashlib.sha256(json.dumps(inputs, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def validate_handoff(saved, current=None):
    if saved.get('unit') != UNIT or len(saved.get('areas', [])) != 1:
        raise ValueError('Expected the exact Spawn A unit handoff')
    if digest(saved) != saved.get('inputSha256'):
        raise ValueError('Frozen handoff contents do not match inputSha256')
    if current is None:
        current = runpy.run_path(str(ROOT / 'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if saved['inputSha256'] != current['inputSha256']:
        raise ValueError('Area inputs changed since handoff extraction')
    a = saved['areas'][0]
    if a['zone'] != 'SPAWN_A_COURTYARD' or not a['designRevision']['id'].startswith('R7'):
        raise ValueError('Expected the approved R7 Spawn A area')
    supported = {
        'openingProfiles': {'rectangular', 'pointed', 'segmental'},
        'openingCraftProfiles': {'carved-timber-portal', 'painted-domestic'},
        'glazingPatterns': set(), 'featureKinds': {'inscribed-panel'},
        'landscapeKinds': set(), 'partKinds': PART_KINDS,
        'craftRecipes': {'CF-CERAMIC', 'CF-CLOTH', 'CF-DYE-VESSEL', 'CF-ENVELOPE',
                         'CF-FLOOR', 'CF-FURNITURE', 'CF-INSCRIPTION', 'CF-JOINT',
                         'CF-OPEN', 'CF-R4-PORTAL', 'CF-STONE', 'CF-TIMBER'},
    }
    for key, allowed in supported.items():
        unsupported = set(saved['requiredCapabilities'][key]) - allowed
        if unsupported:
            raise ValueError(f'Unsupported {key}: {sorted(unsupported)}')
    for f in a['faces']:
        for p in f['parcels']:
            for o in p['openings']:
                width = o.get('trimWidthM', .1)
                if not (p['interval'][0] <= o['alongM'] - o['widthM']/2 - width
                        and o['alongM'] + o['widthM']/2 + width <= p['interval'][1]):
                    raise ValueError(f"Opening surround exceeds parcel: {o['id']}")
                if o['sillM'] < p['floorElevationM'] or o['headM'] + width > p['wallTopM']:
                    raise ValueError(f"Opening height exceeds parcel: {o['id']}")
    return a


def geometry(saved):
    global G
    spec = importlib.util.spec_from_file_location('bz04_courtyard_geometry',
        ROOT / 'assets/source/unit-spawn-b-courtyard/build.py')
    G = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(G)
    G.D = saved
    G.FROZEN_INPUT_SHA = saved['inputSha256']
    G.A = saved['areas'][0]
    G.PARCELS = {p['id']: p for a in saved['areas'] for f in a['faces'] for p in f['parcels']}
    G.OUT = OUT
    return G


def tint(ob, color):
    """A stock or painted surface uses its scheduled linear vertex color."""
    color = color.lstrip('#')
    rgba = tuple(G._linear_channel(int(color[i:i+2], 16)) for i in (0, 2, 4)) + (1,)
    layer = ob.data.color_attributes.get('COLOR_0') or ob.data.color_attributes.new('COLOR_0', 'FLOAT_COLOR', 'POINT')
    for vertex in layer.data:
        vertex.color = rgba


def field(face, plane, name, l, r, z, top, mid, out=0, floor_z=0):
    # facade_field creates a correctly wound single skin; translate its plane
    # inward for BC-01 fields while retaining the same authored world frame.
    shifted = plane + (out if face in {'south', 'west'} else -out)
    ob = G.facade_field(face, shifted, name, l, r, z, top, mid)
    colors = ob.data.color_attributes.new('COLOR_0', 'FLOAT_COLOR', 'POINT')
    for v, c in zip(ob.data.vertices, colors.data):
        t = 1 - .045 * max(0, min(1, (.18 - (v.co.z + G.ORIGIN[2] - floor_z))/.06))
        c.color = (t, t, t, 1)
    return ob




def close_arch_shoulders(face, plane, o, trim):
    if o.get('headShape','rectangular') == 'rectangular':
        return
    top = G.arch_points(o)
    width = max(.10,o.get('trimWidthM',.1))
    outer = G.offset_top(top,width)
    front = o.get('frontProjectionM',.08)
    if o.get('architecturalDetail',{}).get('profile') == 'carved-timber-portal':
        front -= .025
    # The normal-offset curve rises above its jamb spring. Close the small
    # quadrilateral below that endpoint, within the existing surround mask.
    for endpoint,arc,edge in [(outer[0],top[0],top[0][0]-width),
                              (outer[-1],top[-1],top[-1][0]+width)]:
        if endpoint[1] > arc[1]+1e-7:
            poly=[(edge,arc[1]),arc,endpoint,(edge,endpoint[1])]
            G.prism_profile(o['id']+'-spring-closure',face,plane,poly,
                            min(-.02,front-.01),front,o.get('surroundMaterialId',trim))


def opening(face, plane, o, trim, back):
    if o['kind'] == 'niche' and o.get('headShape') != 'rectangular':
        # Blind plaster niches have no operable frame, leaves or hardware.
        closure = G.closure
        try:
            G.closure = lambda *args: None
            G.shaped_opening(face, plane, o, trim, back)
            close_arch_shoulders(face,plane,o,trim)
        finally:
            G.closure = closure
        if o.get('flushBase'):
            l = o['alongM']-o['widthM']/2
            r = o['alongM']+o['widthM']/2
            G.part(face, plane, o['id']+'-deck', (l,-o['depthM'],o['sillM']),
                   (r,.20,o['sillM']+.04),o.get('monolithicTrimMaterialId',trim))
        return
    if o.get('finishMaterialProfile') == 'warmTimber' and o['closureMaterialId'] == 'ph_bz04_dark_wood':
        o = dict(o, closureMaterialId=G.WOOD)
    G.opening(face, plane, o, trim, back)
    close_arch_shoulders(face,plane,o,trim)
    profile = o.get('closureProfile', {})
    if profile.get('transom') == 'fixed timber lattice over opaque back follows the curved head':
        top = G.offset_top(G.arch_points(o),-.08)
        l,r = o['alongM']-o['widthM']/2+.08,o['alongM']+o['widthM']/2-.08
        z = profile['leafTopM']
        out = profile['opaqueBackOutM']
        wood = o['closureMaterialId']
        G.clipped_panel(o['id']+'-fixed-transom-back',face,plane,top,l,r,z,o['headM'],out+.001,out+.008,wood)
        G.part(face,plane,o['id']+'-transom-bearing',(l,out+.008,z-.035),(r,out+.04,z+.035),wood)
        width,pitch=profile['transomBarM'],profile['transomPitchM']
        for i in range(math.ceil((r-l)/pitch)):
            x=l+i*pitch
            G.clipped_panel(o['id']+'-transom-vertical',face,plane,top,x,min(r,x+width),z,o['headM'],out+.008,out+.033,wood)
        for i in range(math.ceil((o['headM']-z)/pitch)):
            height=z+i*pitch
            G.clipped_panel(o['id']+'-transom-horizontal',face,plane,top,l,r,height,height+width,out+.008,out+.033,wood)



def property_joint_spans(parcels):
    """Each owner supplies half of the 15 mm joint at an actual party line."""
    result = {p['id']: [] for p in parcels}
    ordered = sorted(parcels,key=lambda p:p['interval'][0])
    for left,right in zip(ordered,ordered[1:]):
        edge = left['interval'][1]
        if abs(edge-right['interval'][0]) > 1e-7 or left['buildingId'] == right['buildingId']:
            continue
        top = min(left['wallTopM'],right['wallTopM'])
        bottom = max(left['floorElevationM'],right['floorElevationM'])
        if top <= bottom:
            continue
        result[left['id']].append((edge-.0075,edge,bottom,top))
        result[right['id']].append((edge,edge+.0075,bottom,top))
    return result


def joint_fixture(area):
    south = next(f for f in area['faces'] if f['face']=='south')
    joints = property_joint_spans(south['parcels'])
    assert len(joints['A_S_GATE'])==2 and len(joints['A_S_WATCH'])==1 and len(joints['A_S_KEEPER'])==1
    for values in joints.values():
        assert all(abs((r-l)-.0075)<1e-8 for l,r,z,Z in values)
    west = next(f for f in area['faces'] if f['face']=='west')
    joints = property_joint_spans(west['parcels'])
    assert all(not joints[name] for name in ['A_W_SOUTH','A_W_MID','A_W_NORTH']), 'drafting parcels must not split the household facade'
    print('PASS CF-JOINT fixture:15mm complete party joints, no seam between same-building drafting parcels')


def build_shells(area, opening_builder=None, along_cuts=(), parcel_ids=None):
    """Build scheduled receiver faces with masks, grade contact and end closures."""
    opening_builder = opening_builder or opening
    for f in area['faces']:
        face, plane = f['face'], f['wallPlaneM']
        face_joints = property_joint_spans(f['parcels'])
        for p in f['parcels']:
            if parcel_ids is not None and p['id'] not in parcel_ids:
                continue
            l, r = p['interval']
            z0, top, dep = p['floorElevationM'], p['wallTopM'], p['shellDepthM']
            name, mid = p['id'], p['materialId']
            joints = face_joints[name]
            masks = []
            for o in p['openings']:
                trim = o.get('trimWidthM', .1)
                masks.append({'l': o['alongM'] - o['widthM']/2 - trim,
                              'r': o['alongM'] + o['widthM']/2 + trim,
                              'z': max(z0, o['sillM'] - .06),
                              'top': o['headM'] + trim + (.02 if o.get('headShape') != 'rectangular' else 0)})
            for feature in area.get('facadeFeatures', []):
                if feature['receiverParcel'] == name and feature['kind'] == 'inscribed-panel':
                    masks.append({'l': feature['alongM']-feature['widthM']/2,
                                  'r': feature['alongM']+feature['widthM']/2,
                                  'z': feature['zM'][0], 'top': feature['zM'][1]})
            grid = p['structuralGrid']
            boundary = grid.get('assembly') == 'BC-01'
            piers = [(max(l, x-grid['pierWidthM']/2), min(r, x+grid['pierWidthM']/2))
                     for x in grid['bayEdgesM']
                     if max(l,x-grid['pierWidthM']/2) < min(r,x+grid['pierWidthM']/2)] if boundary else []
            xs = sorted(set([l, r] + [x for m in masks for x in [m['l'], m['r']]]
                            + [x for pair in piers for x in pair] + [x for joint in joints for x in joint[:2]] + list(along_cuts)))
            xs = [x for x in xs if l <= x <= r]
            for x, X in zip(xs, xs[1:]):
                if X-x < 1e-7:
                    continue
                zs = sorted(set([z0, z0+.12, z0+.18, top]
                    + [z for region in p['materialRegions'] for z in region['zM']]
                    + [z for joint in joints for z in joint[2:]]
                    + [z for m in masks if m['l'] < (x+X)/2 < m['r'] for z in [m['z'], m['top']]]))
                for z, Z in zip(zs, zs[1:]):
                    if Z-z < 1e-7 or any(m['l'] < (x+X)/2 < m['r'] and m['z'] < (z+Z)/2 < m['top'] for m in masks):
                        continue
                    selected = next((region['materialId'] for region in p['materialRegions']
                        if region['zM'][0] <= (z+Z)/2 <= region['zM'][1]
                        and region['alongM'][0] <= (x+X)/2 <= region['alongM'][1]), mid)
                    is_pier = boundary and any(L <= (x+X)/2 <= R for L, R in piers)
                    inset = boundary and not is_pier and z >= z0+grid['baseBandHeightM'] and Z <= top-grid['topBandHeightM']
                    if is_pier:
                        selected = grid['pierMaterialId']
                    is_joint = any(L <= (x+X)/2 <= R and low <= (z+Z)/2 <= high for L,R,low,high in joints)
                    depth = -.015 if is_joint else -grid['fieldDepthM'] if inset else 0
                    field(face, plane, name, x, X, z, Z, selected, depth, z0)
                    if inset:
                        for edge in (x, X):
                            G.part(face, plane, name+'-pier-reveal', (max(l,edge-.001), -grid['fieldDepthM'], z),
                                   (min(r,edge+.001), 0, Z), selected)
                        for height in (z, Z):
                            G.part(face, plane, name+'-band-reveal', (x, -grid['fieldDepthM'], height-.001),
                                   (X, 0, height+.001), selected)
            for L,R,z,Z in joints:
                edge = L if abs(R-r)<1e-7 else R
                G.part(face,plane,name+'-party-joint-reveal',(max(l,edge-.0005),-.015,z),(min(r,edge+.0005),0,Z),mid)
            for x, X in [(l, l+.02), (r-.02, r)]:
                G.part(face, plane, name+'-end-closure', (x, -dep, z0), (X, -.02, top), mid)
            # Deep scheduled recesses can pass the shallow receiver shell into
            # the same building. Do not put its back plane through their chamber.
            rear_masks = [m for o,m in zip(p['openings'],masks) if o['depthM'] >= dep-.001]
            rear_xs = sorted(set([l,r]+[x for m in rear_masks for x in [max(l,m['l']),min(r,m['r'])]]))
            for x,X in zip(rear_xs,rear_xs[1:]):
                rear_zs = sorted(set([z0,top]+[z for m in rear_masks if m['l'] < (x+X)/2 < m['r'] for z in [m['z'],m['top']]]))
                for z,Z in zip(rear_zs,rear_zs[1:]):
                    if X-x <= 1e-7 or Z-z <= 1e-7 or any(m['l'] < (x+X)/2 < m['r'] and m['z'] < (z+Z)/2 < m['top'] for m in rear_masks):
                        continue
                    G.part(face,plane,name+'-back',(x,-dep,z),(X,-dep+.02,Z),mid)
            G.part(face, plane, name+'-base-closure', (l, -dep, z0-.02), (r, -.02, z0), mid)
            profile = p['envelopeDetail']['corniceProfile']
            if profile in {'single-drip', 'civic-stepped'}:
                for index, (z, Z, out) in enumerate([(top-.16, top-.08, .10), (top-.08, top, .16)]
                    if profile == 'civic-stepped' else [(top-.16, top, .16)]):
                    # The underside drip is an actual 8 mm recess in the cap.
                    G.part(face, plane, name+'-cornice-'+str(index), (l, -.02, z+.008), (r, out, Z), mid)
                    G.part(face, plane, name+'-cornice-bearing', (l, -.02, z), (r, out-.025, z+.008), mid)
            elif profile != 'existing-roof-cap-only':
                raise ValueError(f'Unsupported cornice {profile}')
            for o in p['openings']:
                opening_builder(face, plane, o, p['trimMaterialId'], mid)


def vessel(name, face, plane, lo, hi, mid, opened, color):
    x, y, z = lo
    X, Y, Z = hi
    cx, cy = (x+X)/2, (y+Y)/2
    rx, ry, height = (X-x)/2, (Y-y)/2, Z-z
    rim = .018/min(rx, ry)
    if opened:
        profile = [(0, 0), (.65, 0), (.88, .12), (1, .52), (.90, .90), (.90, 1),
                   (.90-rim, 1), (.90-rim, .92), (.94-rim, .52), (.74, .12), (0, .12)]
    else:
        profile = [(0, 0), (.55, 0), (.9, .18), (1, .48), (.70, .83), (.65, .87),
                   (.69, .90), (.69, .93), (.20, .96), (.16, 1), (0, 1)]
    verts = [G.coords(face, plane, cx+rx*r*math.cos(i*math.tau/32),
                     cy+ry*r*math.sin(i*math.tau/32), z+height*h)
             for r, h in profile for i in range(32)]
    faces = [(j*32+i, j*32+(i+1)%32, (j+1)*32+(i+1)%32, (j+1)*32+i)
             for j in range(len(profile)-1) for i in range(32)]
    ob = G.mesh(name, verts, faces, mid, 'receive', True)
    # CF-CERAMIC colors are desired albedo, not a second beige multiplier.
    G.mat(mid).node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (1,1,1,1)
    tint(ob, color)
    if opened:
        radius = .90-rim
        verts = [G.coords(face, plane, cx+rx*radius*math.cos(i*math.tau/32),
                         cy+ry*radius*math.sin(i*math.tau/32), Z-.04) for i in range(32)]
        ob = G.mesh(name+'-contained-dye', verts, [tuple(range(32)), tuple(reversed(range(32)))], mid, 'receive')
        tint(ob, '#393142')
        # Restrained residue is within the vessel, above the dye and below rim.
        verts = [G.coords(face, plane, cx+rx*radius*math.cos(i*math.tau/32),
                         cy+ry*radius*math.sin(i*math.tau/32), h)
                 for h in [Z-.038, Z-.025] for i in range(32)]
        ob = G.mesh(name+'-inner-residue', verts,
                    [(i, (i+1)%32, (i+1)%32+32, i+32) for i in range(32)], mid, 'receive', True)
        tint(ob, '#89787a')


def soft_cloth(name, face, plane, lo, hi, mid, folded):
    if folded:
        # Compressed 8 mm plies share their bearing surfaces inside the authored box.
        count = max(2, int((hi[2]-lo[2])/.008))
        thickness = .008
        bow = hi[2]-lo[2]-count*thickness
        for fold in range(count):
            verts = []
            for layer in (0, 1):
                for j in range(2):
                    t = j
                    for i in range(9):
                        u = i/8
                        z = lo[2]+thickness*(fold+layer)
                        if fold or layer:
                            z += bow*math.sin(math.pi*u)**2
                        verts.append(G.coords(face, plane, lo[0]+(hi[0]-lo[0])*u,
                                              lo[1]+(hi[1]-lo[1])*t, z))
            faces = []
            for j in range(1):
                for i in range(8):
                    q = j*9+i
                    faces += [(q, q+1, q+10, q+9), (q+18, q+27, q+28, q+19)]
            boundary = list(range(9))+list(range(17,8,-1))
            faces += [(a,b,b+18,a+18) for a,b in zip(boundary,boundary[1:]+boundary[:1])]
            G.mesh(name+'-fold-'+str(fold), verts, faces, mid, 'receive', True)
    else:
        # A flattened sewn cushion: curved edges, flat bearing base, no rigid box.
        cx, cy = (lo[0]+hi[0])/2, (lo[1]+hi[1])/2
        verts = []
        for z, inset in [(lo[2], .015), (lo[2]+.008, 0), (hi[2]-.008, 0), (hi[2], .015)]:
            for i in range(32):
                angle = i*math.tau/32
                u = math.copysign(abs(math.cos(angle))**.20, math.cos(angle))
                v = math.copysign(abs(math.sin(angle))**.35, math.sin(angle))
                verts.append(G.coords(face, plane, cx+((hi[0]-lo[0])/2-inset)*u,
                                      cy+((hi[1]-lo[1])/2-inset)*v, z))
        faces = [tuple(reversed(range(32))), tuple(range(96,128))]
        faces += [(j*32+i,j*32+(i+1)%32,(j+1)*32+(i+1)%32,(j+1)*32+i) for j in range(3) for i in range(32)]
        G.mesh(name, verts, faces, mid, 'receive', True)


def activity(group):
    face = group['receiverFace']
    parcel = G.PARCELS[group['receiverParcel']]
    plane = next(f['wallPlaneM'] for f in G.A['faces'] if f['face'] == face)
    opening = next(o for o in parcel['openings'] if o['id'] == group['receiverOpening'])
    along, deck = opening['alongM'], group['bbox']['min'][2]
    for item in group['instanceLayout']['parts']:
        lo = [item['localBox']['min'][0]+along, item['localBox']['min'][1], item['localBox']['min'][2]+deck]
        hi = [item['localBox']['max'][0]+along, item['localBox']['max'][1], item['localBox']['max'][2]+deck]
        name, mid, kind = group['id']+'-'+item['id'], item['materialId'], item['kind']
        def b(suffix, L, H, material=mid, bevel=.003):
            return G.part(face, plane, name+suffix, L, H, material, 'receive', bevel)
        if kind in {'rounded-ceramic-vessel', 'lidded-ceramic-vessel'}:
            vessel(name, face, plane, lo, hi, mid, kind == 'rounded-ceramic-vessel', item['stockColorSrgb'])
        elif kind == 'grounded-timber-table':
            b('-top', [lo[0],lo[1],hi[2]-.04], hi)
            for x in [lo[0], hi[0]-.05]:
                for y in [lo[1], hi[1]-.05]:
                    b('-leg', [x,y,lo[2]], [x+.05,y+.05,hi[2]-.04])
            for y in [lo[1], hi[1]-.04]:
                b('-apron-long', [lo[0]+.05,y,hi[2]-.10], [hi[0]-.05,y+.04,hi[2]-.04])
            for x in [lo[0], hi[0]-.04]:
                b('-apron-end', [x,lo[1]+.05,hi[2]-.10], [x+.04,hi[1]-.05,hi[2]-.04])
        elif kind == 'framed-timber-end':
            for y in [lo[1], hi[1]-.05]:
                b('-grounded-leg', [lo[0],y,lo[2]], [hi[0],y+.05,hi[2]-.04])
            b('-bearing-head', [lo[0],lo[1],hi[2]-.04], hi)
        elif kind == 'locked-timber-lattice-gate':
            gate = opening['shopfront']['gate']
            width = gate['frameM']
            for x in [lo[0],hi[0]-width]:
                b('-stile', [x,lo[1],lo[2]], [x+width,hi[1],hi[2]])
            for z in [lo[2],hi[2]-width]:
                b('-rail', [lo[0]+width,lo[1],z], [hi[0]-width,hi[1],z+width])
            for i in range(1, math.ceil((hi[0]-lo[0]-2*width)/gate['slatPitchM'])):
                x = lo[0]+width+i*gate['slatPitchM']
                b('-vertical-lattice', [x-gate['slatM']/2,lo[1],lo[2]+width],
                  [x+gate['slatM']/2,(lo[1]+hi[1])/2,hi[2]-width])
            for i in range(1, math.ceil((hi[2]-lo[2]-2*width)/gate['slatPitchM'])):
                z = lo[2]+width+i*gate['slatPitchM']
                b('-horizontal-lattice', [lo[0]+width,(lo[1]+hi[1])/2,z-gate['slatM']/2],
                  [hi[0]-width,hi[1],z+gate['slatM']/2])
            for z in [lo[2]+.12,hi[2]-.17]:
                b('-hinge', [lo[0],hi[1]-.007,z], [lo[0]+.10,hi[1],z+.025], G.IRON, 0)
            b('-locked-latch', [hi[0]-.14,hi[1]-.007,deck+gate['latchHeightM']],
              [hi[0]-.05,hi[1],deck+gate['latchHeightM']+.035], G.IRON, 0)
        elif kind in {'folded-cloth','fitted-cloth-cushion'}:
            soft_cloth(name, face, plane, lo, hi, mid, kind == 'folded-cloth')
        elif kind in {'plank-board','timber-member','stone-plinth'}:
            b('', lo, hi, bevel=.008 if kind == 'stone-plinth' else .003)
        else:
            raise ValueError(f'Unsupported activity kind {kind}')
    if group.get('sign'):
        sign = group['sign']
        a, z, out, w, h = sign['centerAlongM'], sign['centerZ'], sign['frontOutM'], sign['widthM'], sign['heightM']
        receiver = opening.get('shopfront',{}).get('counterFrontOutM',.15)
        on_counter = sign['mount']=='counter front' and opening.get('shopfront',{}).get('frontClosure') != 'locked-lattice-gate'
        sign_back = min(out-.025,receiver-.001) if on_counter else out-.025
        ob = G.part(face, plane, group['id']+'-sign', (a-w/2,sign_back,z-h/2),
                    (a+w/2,out,z+h/2), 'ph_bz04_worn_planks', 'receive', .003)
        tint(ob, sign['paintSrgb'])
        G.text(group['id']+'-label', sign['text'], face, plane, a, out+.001, z, w*.85, h*.70)


def inscription(feature):
    import bpy
    face, plane = feature['receiverFace'], feature['wallPlaneM']
    a, w = feature['alongM'], feature['widthM']
    z, top = feature['zM']
    out, front = feature['outM']
    panel = G.part(face, plane, feature['id'], (a-w/2,out,z), (a+w/2,front,top), feature['materialId'], 'receive')
    curve = bpy.data.curves.new(feature['id']+'-incision', 'FONT')
    curve.body, curve.align_x, curve.align_y = feature['text'], 'CENTER', 'CENTER'
    curve.size, curve.extrude, curve.resolution_u = feature['letterHeightM'], (feature['incisionM']+.001)/2, 2
    cutter = bpy.data.objects.new(feature['id']+'-letter-cutter', curve)
    bpy.context.collection.objects.link(cutter)
    cutter.location = G.local(G.coords(face, plane, a, (.001-feature['incisionM'])/2, (z+top)/2))
    cutter.rotation_euler = (math.pi/2,0, {'north':math.pi,'south':0,'west':math.pi/2,'east':-math.pi/2}[face])
    bpy.ops.object.select_all(action='DESELECT')
    cutter.select_set(True)
    bpy.context.view_layer.objects.active = cutter
    bpy.ops.object.convert(target='MESH')
    glyph_height = max(v.co.y for v in cutter.data.vertices)-min(v.co.y for v in cutter.data.vertices)
    factor = feature['letterHeightM']/glyph_height
    for v in cutter.data.vertices:
        v.co.x *= factor
        v.co.y *= factor
    bpy.context.view_layer.update()
    modifier = panel.modifiers.new('Incised civic name', 'BOOLEAN')
    modifier.operation, modifier.solver, modifier.object = 'DIFFERENCE', 'EXACT', cutter
    bpy.context.view_layer.objects.active = panel
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def validate_objects(area):
    import bpy
    bpy.context.view_layer.update()
    objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for group in area['activityGroups']:
        for item in group['instanceLayout']['parts']:
            prefix = group['id']+'-'+item['id']
            parts = [o for o in objects if o.name.startswith(prefix)]
            assert parts, ('missing scheduled part', prefix)
            face = group['receiverFace']
            plane = next(f['wallPlaneM'] for f in area['faces'] if f['face'] == face)
            op = next(o for o in G.PARCELS[group['receiverParcel']]['openings'] if o['id'] == group['receiverOpening'])
            box = item['localBox']
            expected = [G.local(G.coords(face, plane, op['alongM']+a, out, group['bbox']['min'][2]+z))
                        for a in [box['min'][0],box['max'][0]] for out in [box['min'][1],box['max'][1]] for z in [box['min'][2],box['max'][2]]]
            lo = [min(p[i] for p in expected) for i in range(3)]
            hi = [max(p[i] for p in expected) for i in range(3)]
            for ob in parts:
                for v in ob.data.vertices:
                    p = ob.matrix_world @ v.co
                    assert all(lo[i]-.001 <= p[i] <= hi[i]+.001 for i in range(3)), (prefix, tuple(p), lo, hi)
    materials = {o.data.materials[0].name for o in objects}
    shadow_materials = {o.data.materials[0].name for o in objects if o.get('bz04Shadow', 'cast') == 'cast'}
    # This is source inventory. The shared exporter records actual GLB costs;
    # performance targets do not block the construction pass.
    return {'objects': len(objects), 'sourceMaterialBindings': len(materials),
            'sourceShadowBindings': len(shadow_materials)}



def validate_export_budget(gltf, area, budget=None):
    """Report actual unbatched GLB costs without gating construction."""
    budget = budget or area['budget']
    primitives = [(n,p) for n in gltf['nodes'] if 'mesh' in n
                  for p in gltf['meshes'][n['mesh']]['primitives']]
    asset = {'triangles': sum(gltf['accessors'][p['indices']]['count']//3 for n,p in primitives),
             'materials': gltf['materials'], 'primitives': len(primitives),
             'castPrimitives': sum(n.get('extras',{}).get('bz04Shadow') == 'cast' for n,p in primitives)}
    return runpy.run_path(str(ROOT/'assets/source/unit-spawn-b-courtyard/verify.py'))['report_budget'](asset,budget)


def export_budget_fixture(area):
    gltf = {'nodes': [{'mesh':0,'extras':{'bz04Shadow':'cast'}}, {'mesh':1,'extras':{'bz04Shadow':'receive'}}],
            'meshes':[{'primitives':[{'indices':0}]},{'primitives':[{'indices':1}]}],
            'accessors':[{'count':6},{'count':3}], 'materials':[{},{}]}
    report = validate_export_budget(gltf,area)
    counts = report['counts']
    assert counts == {'maxTriangles':3,'maxMaterials':2,'maxRenderedPrimitives':2,'maxShadowPrimitives':1}
    for key, value in counts.items():
        lowered = copy.deepcopy(area)
        lowered['budget'][key] = value-1
        reduced = validate_export_budget(gltf,lowered)
        assert reduced['status']=='deferred' and key in reduced['overTarget']
        assert reduced['counts']==counts
    print('PASS actual GLB budget fixtures: triangle/material/render/shadow overages are reported without changing geometry')


def remove_internal_spice_receiver_skins():
    """The installed Spice shells enclose these two perpendicular return slices."""
    if '--spice-handoff' not in sys.argv:
        raise ValueError('Spawn A export requires --spice-handoff for its installed north enclosure')
    from integrate_bz04 import load_handoff
    spice=load_handoff(Path(sys.argv[sys.argv.index('--spice-handoff')+1]))
    assert spice['unit']=='unit-spice-street'
    parcels={p['id']:p for f in spice['areas'][0]['faces'] for p in f['parcels']}
    west=G.PARCELS['A_NW_RETURN'];east=G.PARCELS['A_NE_RETURN']
    sw=parcels['S_W_SOUTH'];se=parcels['S_E_SOUTH']
    for receiver,parent in ((west,sw),(east,se)):
        x,y,X,Y=receiver['footprint'];px,py,pX,pY=parent['footprint']
        assert py<=y<Y<=pY and receiver['wallTopM']==parent['wallTopM']
        assert px<=x<pX and min(X,pX)>x
    assert west['footprint'][2]<=sw['footprint'][2]
    assert east['footprint'][2]>se['footprint'][2]
    removed=['A_NW_RETURN-end-closure','A_NW_RETURN-end-closure.001','A_NW_RETURN-back','A_NE_RETURN-end-closure']
    for name in removed:
        ob=G.bpy.data.objects.get(name);assert ob is not None,('missing receiver skin',name)
        G.bpy.data.objects.remove(ob,do_unlink=True)
    # A_NE extends beyond the Spice building at x=37.2. Keep its exterior end
    # at x=39 and its uncovered rear strip, rather than deleting the whole back.
    back=G.bpy.data.objects.get('A_NE_RETURN-back');assert back is not None
    G.bpy.data.objects.remove(back,do_unlink=True)
    G.part('north',14,'A_NE_RETURN-back',(se['footprint'][2],-east['shellDepthM'],east['floorElevationM']),
           (east['interval'][1],-east['shellDepthM']+.02,east['wallTopM']),east['materialId'])
    G.bpy.context.scene['bz04SpiceEnclosureInputSha256']=spice['inputSha256']
    print('RECEIVER SKINS removed',removed,'clipped A_NE_RETURN-back to',se['footprint'][2],east['interval'][1],flush=True)


def build(saved):
    area = validate_handoff(saved)
    geometry(saved)
    origin = area['sectionOriginDesign']
    G.reset(tuple(origin[key] for key in ('x','y','z')))
    build_shells(area)
    remove_internal_spice_receiver_skins()
    for group in area['activityGroups']:
        activity(group)
    for fixture in area['fixtures']:
        G.awning(fixture)
    for feature in area['facadeFeatures']:
        inscription(feature)
    # Recessed closures and one-piece sills receive facade shadows; their tiny
    # internal edges do not need another shadow draw call. Architecture and shade cast.
    import bpy
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH' and ob.data.materials[0] in {G.mat('bz04_teal_timber_project_original'), G.mat('ph_bz04_trim_sanded_01')}:
            ob['bz04Shadow'] = 'receive'
    validate_objects(area)
    from integrate_bz04 import export_budget
    budget = export_budget(area,OUT)
    G.export(OUT / (UNIT+'.glb'), area['exportBoundsGltfLocal'], area['budget']['maxTriangles'],
             area['budget']['maxRenderedPrimitives'], {'bz04InputSha256': saved['inputSha256'], 'bz04DesignRevision': area['designRevision']['id'],
             'bz04DesignBudget': area['budget'], 'bz04ExportBudget': budget})
    data = (OUT/(UNIT+'.glb')).read_bytes()
    gltf = json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
    validate_export_budget(gltf,area,budget)


def input_fixture(saved):
    area = validate_handoff(saved)
    export_budget_fixture(area)
    joint_fixture(area)
    for mutate in [lambda p: p['areas'][0].update(floorMaterialId='tampered'),
                   lambda p: p.update(unit='wrong-unit')]:
        bad = copy.deepcopy(saved)
        mutate(bad)
        try:
            validate_handoff(bad, saved)
        except ValueError:
            pass
        else:
            raise AssertionError('Invalid frozen input was accepted')
    bad = copy.deepcopy(saved)
    bad['requiredCapabilities']['partKinds'].append('unknown-future-part')
    bad['inputSha256'] = digest(bad)
    try:
        validate_handoff(bad, bad)
    except ValueError as error:
        assert 'Unsupported partKinds' in str(error)
    else:
        raise AssertionError('Unknown part accepted')
    print('PASS Spawn A input fixtures: frozen issue, tamper/wrong unit rejection, explicit part capabilities')


def self_test(saved):
    input_fixture(saved)
    geometry(saved)
    G.reset((17,0,0))
    shared = saved['craftStandards']['materials']
    assert G.mat(G.WOOD).name == shared['warmTimber']['exportName']
    iron = G.mat(G.IRON).node_tree.nodes['Principled BSDF']
    assert not iron.inputs['Metallic'].is_linked and abs(iron.inputs['Metallic'].default_value-.15)<1e-7
    assert G.mat('bz04_teal_timber_project_original').name == shared['opaqueTimber']['exportName']
    for group in G.A['activityGroups']:
        activity(group)
    validate_objects(G.A)
    import bpy
    table = [o for o in bpy.context.scene.objects if o.name.startswith('G_A_E_DYE_RECESS-side-table')]
    assert len(table) == 9, ('table must have a top, four grounded legs and four aprons', len(table))
    gate = [o for o in bpy.context.scene.objects if 'closed-work-gate' in o.name]
    assert len(gate) > 15, 'gate must be framed open lattice, not solid infill'
    parcel = G.PARCELS['A_W_SOUTH']
    niche = next(o for o in parcel['openings'] if o['id'] == 'A_W_SEAT')
    opening('west',17,niche,parcel['trimMaterialId'],parcel['materialId'])
    assert not any(o.name.startswith('A_W_SEAT') and any(word in o.name for word in ['leaf','frame','hinge']) for o in bpy.context.scene.objects), 'blind seat niche must not contain shutters'
    shoulders = [o for o in bpy.context.scene.objects if o.name.startswith('A_W_SEAT-spring-closure')]
    assert len(shoulders)==2, 'both normal-offset arch springs need closed receivers'
    for shoulder in shoulders:
        assert all(v.co.x <= .001 for v in shoulder.data.vertices), 'blind-arch spring must not protrude beyond its wall plane'
    parcel = G.PARCELS['A_S_GATE']
    principal = next(o for o in parcel['openings'] if o['id'] == 'A_S_GATE-PRINCIPAL')
    opening('south',0,principal,parcel['trimMaterialId'],parcel['materialId'])
    assert any(o.name.startswith('A_S_GATE-PRINCIPAL-fixed-transom-back') for o in bpy.context.scene.objects)
    assert any(o.name.startswith('A_S_GATE-PRINCIPAL-transom-vertical') for o in bpy.context.scene.objects)
    leaf_parts = [o for o in bpy.context.scene.objects if o.name.startswith('A_S_GATE-PRINCIPAL-leaf')]
    assert leaf_parts and max(v.co.z for o in leaf_parts for v in o.data.vertices) <= 2.70001, 'leaf must stop at the fixed transom'
    print('PASS Spawn A geometry fixtures: scheduled part bounds, member furniture, open dye vessel, contacting folded cloth, empty blind niche,2.7m leaves and fixed transom')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['build','self-test','input-fixture'], nargs='?', default='build')
    parser.add_argument('--handoff', type=Path, required=True)
    parser.add_argument('--spice-handoff', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    handoff = json.loads(args.handoff.read_text())
    {'build': build, 'self-test': self_test, 'input-fixture': input_fixture}[args.mode](handoff)
