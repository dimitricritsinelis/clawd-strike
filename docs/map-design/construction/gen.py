"""Compile current map geometry and generate the construction sheets from it and overlay.py."""
import json, math, subprocess, sys, os
from collections import defaultdict, OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import overlay as OV

spec = json.load(open(f'{ROOT}/docs/map-design/specs/map_spec.json'))
# The compiler resolves layoutIntent and dressing transforms before any sheet is written.
# Historical Markdown snapshots never supply construction dimensions.
if __name__ == '__main__':
    subprocess.run(['node', 'apps/client/scripts/gen-map-runtime.mjs'], cwd=ROOT, check=True)
runtime = json.load(open(f'{ROOT}/apps/client/public/maps/bazaar-map/map_spec.json'))
zones = {z['id']: z for z in spec['zones']}
surfaces = {s['zoneId']: s for s in spec['traversal_surfaces']}
buildings = {b['id']: b for b in spec['buildings']}
frontages = {f['id']: f for f in spec['frontages']}
compiled_frontages = {f['id']: f for f in runtime['frontages']}
profiles = {p['id']: p for p in spec['facade_profiles']}
massings = {m['id']: m for m in spec['massing_profiles']}
modules = {m['id']: m for m in spec['facade_modules']}
assets = {a['id']: a for a in spec['asset_registry']}
anchors = {a['id']: a for a in spec['anchors']}
exemptions = defaultdict(list)
for e in spec['frontage_exemptions']:
    exemptions[e['zoneId']].append(e)
links = defaultdict(set)
for c in spec['explicit_connectivity']:
    a, b = c.get('from') or c.get('fromZoneId') or c.get('a'), c.get('to') or c.get('toZoneId') or c.get('b')
    if a and b:
        links[a].add(b); links[b].add(a)
placements = [dict(id=p['id'], asset=p['assetId'], anchor=p['anchorId'],
                   **p['position'], w=p['dimensionsM']['width'], d=p['dimensionsM']['depth'],
                   h=p['dimensionsM']['height'], yaw=p['yawDeg'] % 360, zone=p['zoneId'], semantic=p['semanticClass'])
              for p in runtime['dressingPlacements']]
by_zone_pl = defaultdict(list)
for p in placements:
    by_zone_pl[p['zone']].append(p)

# ---------- geometry helpers ----------
def span(f):
    z = zones[f['zoneId']]; r = z['rect']
    if f['face'] in ('east', 'west'):
        x = r['x'] + (r['w'] if f['face'] == 'east' else 0)
        y0, y1 = r['y'] + r['h'] * f['start'], r['y'] + r['h'] * f['end']
        return ('x', x, y0, y1, y1 - y0)
    y = r['y'] + (r['h'] if f['face'] == 'north' else 0)
    x0, x1 = r['x'] + r['w'] * f['start'], r['x'] + r['w'] * f['end']
    return ('y', y, x0, x1, x1 - x0)

def bay_world(f, alongM):
    ax, c, a0, a1, L = span(f)
    return (c, a0 + alongM) if ax == 'x' else (a0 + alongM, c)

FACE_STREET = {'west': '+X (street lies east of the wall)', 'east': '-X (street lies west of the wall)', 'south': '+Y (street lies north)', 'north': '-Y (street lies south)'}
KIT_FACES = {'west': 'E', 'east': 'W', 'south': 'N', 'north': 'S'}

def fmt(v):
    return f'{v:.3f}'.rstrip('0').rstrip('.') if isinstance(v, float) else str(v)

def unit_id(zid):
    return 'unit-' + zid.lower().replace('_', '-')

# ---------- sheet writer ----------
def wall_section(out, f, b):
    ax, c, a0, a1, L = span(f)
    prof = profiles[f['facadeProfileId']]; mas = massings[f['massingProfileId']]
    wall = next((w for w in b['walls'] if w.get('frontageId') == f['id']), None)
    compiled = compiled_frontages[f['id']]
    rows = {r['id']: r for r in compiled['bays']}
    ov = OV.WALLS.get(f['id'], {})
    coord = f'x = {fmt(c)}, y = {fmt(a0)} .. {fmt(a1)} (a runs south to north)' if ax == 'x' else f'y = {fmt(c)}, x = {fmt(a0)} .. {fmt(a1)} (a runs west to east)'
    out.append(f"### {f['id']}  ·  {b['id']} ({b['type']}, {b['storeys']} storey{'s' if b['storeys']>1 else ''})")
    out.append('')
    out.append(f"- **Role:** {b['type']}. {b['brief']}")
    out.append(f"- **Wall line:** {f['face']} edge of `{f['zoneId']}`; {coord}; length **{fmt(L)} m**; street side {FACE_STREET[f['face']]}; kit `Wall(F, ({fmt(a0 if ax=='y' else c)}, {fmt(c if ax=='y' else a0)}), ({fmt(a1 if ax=='y' else c)}, {fmt(c if ax=='y' else a1)}), faces='{KIT_FACES[f['face']]}')`.")
    floor = surfaces[f['zoneId']].get('elevationM', 0)
    out.append(f"- **Retained massing `{mas['id']}`:** wall top {fmt(mas['heightM'])} local / {fmt(mas['heightM'] + floor)} absolute, depth {fmt(mas['depthM'])} m; roof and parapet stay runtime-owned per section 7.")
    out.append(f"- **Authoring:** include this wall in the zone section GLB using the printed `Wall(F, ...)` frame. Heights are above this zone's floor. Cut the skin around every active bay; no separate frontage binding.")
    slots = prof['materialSlots']
    out.append(f"- **Blender materials:** wall `{slots['wall']}`, trim `{slots['trim']}`, timber `{slots['timber']}`; hardware `ph_rusty_metal_02`." + (f" Override: {ov['materials']}" if ov.get('materials') else ''))
    gh = compiled['layout']['groundHeadM']
    out.append(f"- **Corners:** `{wall['corners']}`. Ground head datum {fmt(gh)} m. Exact end piers and finish datums are in the tasks below.")
    if compiled['layout']['upperSillDatumsM']:
        out.append(f"- **Upper sill datums:** {', '.join(fmt(v) for v in compiled['layout']['upperSillDatumsM'])} m.")
    # datums
    out.append(f"- **Horizontal datums (SD-01..SD-03 unless overridden):** {ov.get('datums') or OV.default_datums(b, wall, mas, gh)}")
    out.append('')
    out.append('| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey |')
    out.append('|---|---|---|---:|---|---|---|---:|')
    bays = wall['bays'] if wall else []
    dress = wall['dressing'] if wall else []
    skin_openings = []
    for bay in bays:
        r = rows.get(bay['id'])
        var = OV.VARIANTS.get((f['id'], bay['id']), '')
        mod = modules.get(bay['module'])
        if r:
            if r['moduleId'] != bay['module']:
                raise ValueError(f"{f['id']} {bay['id']}: building module {bay['module']} differs from compiled {r['moduleId']}")
            along = r['along'] * L
            if abs(along - bay['alongM']) > 0.01:
                raise ValueError(f"{f['id']} {bay['id']}: building axis differs from compiled geometry")
            sill = r['baseElevationM']
        elif (f['id'], bay['id']) == ('FRONTAGE_DYERS_ALLEY_WEST_N', 'LOFT_VENT'):
            along, sill = bay['alongM'], anchors['DYERS_HOUSE_LOFT_VENT']['z']
            var = 'KEEP placed ASSET_DYERS_LOFT_VENT; skin rebate only'
        elif var.startswith(('SUPPRESSED', 'Not built:')):
            along, sill = bay['alongM'], None
        else:
            raise ValueError(f"{f['id']} {bay['id']}: no compiled bay or explicit retained asset")
        wx, wy = bay_world(f, along)
        dims = f"{fmt(mod['dimensionsM']['width'])} × {fmt(mod['dimensionsM']['depth'])} × {fmt(mod['dimensionsM']['height'])}" if mod else 'retained code'
        sh = f"{fmt(sill)} / {fmt(sill + mod['dimensionsM']['height'])}" if sill is not None else 'SUPPRESSED'
        out.append(f"| `{bay['id']}` | `{bay['module']}` | {var} | {fmt(along)} | ({fmt(wx)}, {fmt(wy)}) | {dims} | {sh} | {bay['story']} |")
        if sill is not None and mod['kind'] != 'column':
            skin_openings.append(tuple(round(n, 6) for n in (along, mod['dimensionsM']['width'], sill, mod['dimensionsM']['height'])))
    out.append('')
    out.append(f"Skin aperture input for `Wall.skin(..., openings=...)`: `{skin_openings}`. Values are `(along, width, sill, height)`; the wall's ordered tasks supply the jambs, closures and reveal backs.")
    out.append('')
    if dress:
        out.append('Bound dressing from the schedule (`walls[].dressing`): ' + '; '.join(f"`{d['assetId']}` at {d['where']}" for d in dress) + '.')
    out.append('')
    tasks = ov.get('tasks') or OV.default_tasks(b, f, wall, gh)
    out.append('**Construction tasks (ordered; each has an observable completion):**')
    out.append('')
    for i, t in enumerate(tasks, 1):
        out.append(f'{i}. {t}')
    out.append('')
    if ov.get('reality'):
        out.append(f"**Why it exists (reality check):** {ov['reality']}")
        out.append('')

def zone_section(out, zid, unit):
    z = zones[zid]; r = z['rect']; s = surfaces[zid]
    zo = OV.ZONES.get(zid, {})
    out.append(f"### Site · `{zid}` ({z['label']})")
    out.append('')
    elev = s.get('elevationM')
    ez = f"floor z = {fmt(elev)}" if elev is not None else f"{s['kind']} along {s['axis']}: z {fmt(s['startElevationM'])} → {fmt(s['endElevationM'])}"
    out.append(f"- Rect x {fmt(r['x'])}..{fmt(r['x']+r['w'])}, y {fmt(r['y'])}..{fmt(r['y']+r['h'])} ({fmt(r['w'])} × {fmt(r['h'])} m); {ez}; floor `{z['floorMaterialId']}`; authored clear width **{fmt(z['clearWidthM'])} m** (protected).")
    out.append(f"- Connects: {', '.join(sorted(links[zid])) or '(see plan)'}.")
    for e in exemptions.get(zid, []):
        out.append(f"- `{e['face']}` edge: exempt (`{e['reason']}`): {e['note']}")
    for fid, f in frontages.items():
        if f['zoneId'] == zid:
            out.append(f"- `{f['face']}` edge: frontage `{fid}` → `{f['buildingId']}`.")
    out.append('')

def free_placements(out, zid):
    pl = sorted(by_zone_pl.get(zid, []), key=lambda p: (p['asset'], p['id']))
    if not pl:
        return
    out.append('| Placement | Asset | Anchor | Position (x, y, z) | W × D × H | Yaw | Disposition |')
    out.append('|---|---|---|---|---|---:|---|')
    for p in pl:
        disp = OV.PLACEMENTS.get(p['id']) or OV.PLACEMENTS.get(p['asset']) or 'KEEP at this transform'
        out.append(f"| `{p['id']}` | `{p['asset']}` | `{p['anchor']}` | ({fmt(p['x'])}, {fmt(p['y'])}, {fmt(p['z'])}) | {fmt(p['w'])} × {fmt(p['d'])} × {fmt(p['h'])} | {fmt(p['yaw'])} | {disp} |")
    out.append('')

def anchor_lines(out, zid):
    rows = []
    for a in spec['anchors']:
        if a.get('zone') != zid:
            continue
        if a['type'] in ('cover_cluster', 'spawn_cover', 'open_node', 'landmark', 'hero_landmark', 'decorative_palm', 'lantern_anchor'):
            pos = f"({fmt(a['x'])}, {fmt(a['y'])}, {fmt(a.get('z', 0))})"
            dims = ' × '.join(fmt(a[k]) for k in ('width_m', 'height_m') if k in a)
            rows.append(f"| `{a['id']}` | {a['type']} | {pos} | {dims} | {fmt(a.get('yaw_deg', 0))} | {a.get('notes','')} |")
    if rows:
        out.append('| Anchor | Type | Position | W × H | Yaw | Note |')
        out.append('|---|---|---|---|---:|---|')
        out.extend(rows); out.append('')

def overheads(out, zid):
    rows = []
    for a in spec['anchors']:
        if a.get('zone') != zid or a['type'] != 'cloth_canopy_span':
            continue
        if 'frontageId' in a:
            f0 = frontages[a['frontageId']]; f1 = frontages[a['end_frontage_id']]
            ax0, c0, s0, e0, L0 = span(f0); ax1, c1, s1, e1, L1 = span(f1)
            p0 = bay_world(f0, a['along'] * L0); p1 = bay_world(f1, a['end_along'] * L1)
            z0, z1 = a['vertical_offset_m'], a['end_vertical_offset_m']
        else:
            p0 = (a['x'], a['y']); p1 = (a['end_x'], a['end_y']); z0, z1 = a['z'], a['end_z']
        rows.append(f"| `{a['id']}` | ({fmt(p0[0])}, {fmt(p0[1])}, {fmt(z0)}) | ({fmt(p1[0])}, {fmt(p1[1])}, {fmt(z1)}) | {fmt(a.get('width_m', 0)) if a.get('width_m') else '—'} | {a.get('notes','')} |")
    if rows:
        out.append('| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |')
        out.append('|---|---|---|---|---|')
        out.extend(rows); out.append('')

def floor_wear(out, zid):
    floor = surfaces[zid].get('elevationM')
    patches = list(OV.FLOOR_WEAR[zid])
    if floor is not None:
        rect = zones[zid]['rect']
        for p in by_zone_pl[zid]:
            if p['semantic'] not in ('container', 'furniture', 'cover', 'foliage') or abs(p['z'] - floor) > 0.05:
                continue
            # Contact dust extends 8 cm beyond the existing grounded footprint.
            angle = math.radians(p['yaw'])
            co, si = math.cos(angle), math.sin(angle)
            corners = []
            for x, y in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
                dx, dy = x * (p['w'] / 2 + 0.08), y * (p['d'] / 2 + 0.08)
                px, py = p['x'] + dx * co + dy * si, p['y'] - dx * si + dy * co
                corners.append((min(max(px, rect['x']), rect['x'] + rect['w']),
                                min(max(py, rect['y']), rect['y'] + rect['h']), floor))
            patches.append({'kind': 'dust', 'corners': corners})
    out.append(f"**`{zid}` floor finish** (use this zone's `F`; z is local and includes the 0.014 m render offset):")
    out.append('')
    if not patches:
        out.append('KEEP the existing grade and surface; no added wear mesh on this ramp or stair run.')
    else:
        out.append('```python')
        for patch in patches:
            corners = [tuple(round(v, 6) for v in (x, y, z - (floor or 0) + 0.014)) for x, y, z in patch['corners']]
            out.append(f"wear_patch(F, {corners}, {patch['kind']!r})")
        out.append('```')
    out.append('')

def sheet(unit, zids, title, also):
    out = []
    out.append(f'# {unit} · {title}')
    out.append('')
    out.append(f"Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the finish requirements that every task below assumes. Dimensions and transforms below are compiled from the current spec. Build these decisions without another survey or design pass. Also called: {also}.")
    out.append('')
    out.append(f"**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.")
    out.append('')
    intro = OV.UNITS.get(unit, {})
    if intro.get('intent'):
        out.append('## 1. Design intent'); out.append(''); out.append(intro['intent']); out.append('')
    out.append('## 2. Site'); out.append('')
    for zid in zids:
        zone_section(out, zid, unit)
    out.append('### Package outputs')
    out.append('')
    out.append('| Package directory | Section zone | Owned runtime faces | Section GLB |')
    out.append('|---|---|---|---|')
    for zid in zids:
        owned = sorted({f['face'] for f in frontages.values() if f['zoneId'] == zid})
        if zid in ('TEA_RAMP', 'TEA_STAIRS'):
            out.append(f"| KEEP existing runtime; no package | `{zid}` | none | none |")
        else:
            out.append(f"| `assets/source/{unit_id(zid)}/` | `{zid}` | `{json.dumps(owned)}` | `{unit_id(zid)}.glb` |")
    out.append('')
    out.append('Each package uses `section: {zoneId, modelId, faces}` with exactly the listed faces. An empty list retains all runtime walls and adds only the scheduled finish. Export with `export_section(F, path)`; never bind this plan-frame GLB through `frontages`.')
    out.append('')
    if intro.get('existing'):
        out.append(f"**Existing source.** {intro['existing']}"); out.append('')
    out.append('## 3. Walls'); out.append('')
    for zid in zids:
        for fid, f in frontages.items():
            if f['zoneId'] == zid:
                wall_section(out, f, buildings[f['buildingId']])
        for b in spec['buildings']:
            if any(fc['zoneId'] == zid for fc in b['faces']) and not any(f['buildingId'] == b['id'] for f in frontages.values()):
                code_wall_section(out, b, zid)
    out.append('## 4. Free placements (dressing, cover, landmarks)'); out.append('')
    out.append('Compiled world transforms from the spec (`dressing_placements` through their anchors). KEEP means the transform is protected or approved; REPLACE names the new asset that takes the same anchor. Anything new goes in `placements[]` of the package with the coordinates given in the tasks.'); out.append('')
    for zid in zids:
        if len(zids) > 1: out.append(f'#### `{zid}`'); out.append('')
        anchor_lines(out, zid)
        free_placements(out, zid)
    out.append('## 5. Overheads'); out.append('')
    out.append('Canopies and lines are shared by both walls (owner OWN_OVERHEAD). Ends are fixed points on the receiving wall or roof tie; the cloth hangs between them per SD-17. Hem never below 4.2 m over a route floor.'); out.append('')
    any_over = False
    for zid in zids:
        before = len(out); overheads(out, zid); any_over |= len(out) > before
    if not any_over:
        out.append('None scheduled. Do not add one.'); out.append('')
    if intro.get('overheads'):
        out.append(intro['overheads']); out.append('')
    out.append('## 6. Ground, wear and drainage'); out.append('')
    out.append(intro.get('ground') or OV.default_ground(zids)); out.append('')
    for zid in zids:
        floor_wear(out, zid)
    out.append('## 7. Roofs and skyline'); out.append('')
    out.append(intro.get('skyline') or 'Baseline roofs per the massing table above (roof base = wall top, parapet per profile, coping SD-03). No new rooftop props. Perimeter skyline placements, if any, are listed in [skyline.md](skyline.md).'); out.append('')
    out.append('## 8. Required result'); out.append('')
    for c in (intro.get('checks') or []) + OV.COMMON_CHECKS:
        out.append(f'- [ ] {c}')
    out.append('')
    out.append('Record `built` in the progress index after applying the package. Gameplay, visual and performance validation occur in the later validation task.'); out.append('')
    return '\n'.join(out) + '\n'

def code_wall_section(out, b, zid):
    z = zones[zid]; r = z['rect']
    face = next(fc['face'] for fc in b['faces'] if fc['zoneId'] == zid)
    x = r['x'] + (r['w'] if face == 'east' else 0)
    ov = OV.WALLS.get(b['id'], {})
    out.append(f"### code-owned {face} face of `{zid}`  ·  {b['id']} ({b['type']}, {b['storeys']} storeys)")
    out.append('')
    out.append(f"- **Role:** boundary identity plane owned by `pushCoreBoundaryFacadeGrammar` (no frontage record, no GLB binding). {b['brief']}")
    out.append(f"- **Wall line:** x = {fmt(x)}, y = {fmt(r['y'])} .. {fmt(r['y']+r['h'])}; length {fmt(r['h'])} m; wall top 7 m (`MASSING_MID_MIXED`). Ground head datum {fmt(b['walls'][0]['groundHeadM'])} m.")
    out.append(f"- **Placement path:** this face is not a frontage; its render-only additions go through `placements[]` (free GLBs) in the unit package, coordinates below. Do not add a frontage record.")
    out.append('')
    out.append('| Bay | Module | a (m) | World (x, y) | Storey | Sill / head (m) |')
    out.append('|---|---|---:|---|---:|---|')
    for bay in b['walls'][0]['bays']:
        sh = OV.CODE_SH.get((b['id'], bay['id']), '—')
        out.append(f"| `{bay['id']}` | `{bay['module']}` | {fmt(bay['alongM'])} | ({fmt(x)}, {fmt(r['y']+bay['alongM'])}) | {bay['story']} | {sh} |")
    out.append('')
    for d in b['walls'][0]['dressing']:
        out.append(f"- Bound dressing: `{d['assetId']}` at {d['where']}.")
    out.append('')
    out.append('**Construction tasks:**'); out.append('')
    for i, t in enumerate(ov.get('tasks', []), 1):
        out.append(f'{i}. {t}')
    out.append('')
    if ov.get('reality'):
        out.append(f"**Why it exists (reality check):** {ov['reality']}"); out.append('')

UNITS = OrderedDict([
    ('unit-spawn-a-courtyard', (['SPAWN_A_COURTYARD'], 'Spawn A courtyard', 'spawn A, A spawn, south spawn')),
    ('unit-spice-street', (['SPICE_STREET'], 'Spice Street', 'Spice Street, spice row')),
    ('unit-fountain-court', (['FOUNTAIN_COURT'], 'Fountain Court', 'Fountain Court, the fountain')),
    ('unit-textile-arcade', (['TEXTILE_ARCADE'], 'Textile Arcade', 'Textile Arcade, textiles')),
    ('unit-rug-gate', (['RUG_GATE'], 'Rug Gate', 'Rug Gate, the gate')),
    ('unit-spawn-b-courtyard', (['SPAWN_B_COURTYARD'], 'Spawn B courtyard', 'spawn B, B spawn, north spawn')),
    ('unit-service-south', (['SERVICE_SOUTH'], 'Service South', 'Service South, south service alley')),
    ('unit-caravan-court', (['CARAVAN_COURT'], 'Caravan Court', 'Caravan Court, caravan yard')),
    ('unit-tea-terrace', (['TEA_RAMP', 'TEA_TERRACE', 'TEA_STAIRS', 'TEA_LANDING'], 'Tea house, ramp, terrace, stairs and landing', 'tea house, Tea Terrace, tea ramp, tea stairs, tea landing (shoot units unit-tea-ramp, unit-tea-terrace, unit-tea-stairs, unit-tea-landing)')),
    ('unit-service-north', (['SERVICE_NORTH'], 'Service North', 'Service North, north service alley')),
    ('unit-dyers-alley', (['DYERS_ALLEY'], 'Dyers Alley', 'Dyers Alley')),
    ('unit-covered-souk', (['COVERED_SOUK'], 'Covered Dyers Souk', 'Covered Souk, Covered Dyers Souk, the souk')),
    ('unit-dyers-dogleg', (['DYERS_DOGLEG'], 'Dyers Dogleg', 'Dyers Dogleg, the dogleg')),
    ('unit-north-court', (['NORTH_COURT'], 'North Court', 'North Court')),
    ('links', (['LINK_SOUTH_WEST', 'LINK_SOUTH_EAST', 'LINK_WEST_MID', 'LINK_EAST_MID', 'LINK_WEST_UPPER', 'LINK_EAST_UPPER', 'LINK_NORTH_WEST', 'LINK_NORTH_EAST'], 'The eight link passages', 'the links, cross-links, link passages (one shoot unit per zone: unit-link-south-west, unit-link-south-east, unit-link-west-mid, unit-link-east-mid, unit-link-west-upper, unit-link-east-upper, unit-link-north-west, unit-link-north-east)')),
])

if __name__ == '__main__':
    outdir = HERE
    os.makedirs(outdir, exist_ok=True)
    for unit, (zids, title, also) in UNITS.items():
        text = sheet(unit, zids, title, also)
        open(f'{outdir}/{unit}.md', 'w').write(text)
        print(unit, len(text.splitlines()), 'lines')
    # report unassigned placements
    missing = [p['id'] for p in placements if p['zone'] is None]
    print('placements with no zone:', missing)
