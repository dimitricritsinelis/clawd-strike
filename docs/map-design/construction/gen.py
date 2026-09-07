"""Generate docs/map-design/construction/<unit>.md from map_spec.json + the HEAD schedule + compiled placements + overlay.py."""
import json, re, subprocess, sys, os
from collections import defaultdict, OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import overlay as OV

spec = json.load(open(f'{ROOT}/docs/map-design/specs/map_spec.json'))
# schedule.json snapshots the former buildings.md schedule and the compiled placements (layout-reference.md at 3ec5d36);
# regenerate the placements half with `pnpm --filter @clawd-strike/client gen:layout-reference` if the spec's dressing changes.
SNAP = os.path.join(HERE, 'schedule.json')
if os.path.exists(SNAP):
    _snap = json.load(open(SNAP)); bmd = _snap['buildings_md']; lmd = _snap['layout_reference_md']
else:
    bmd = subprocess.run(['git', 'show', 'HEAD:docs/map-design/development-plan/buildings.md'], cwd=ROOT, capture_output=True, text=True).stdout
    lmd = subprocess.run(['git', 'show', 'HEAD:docs/map-design/layout-reference.md'], cwd=ROOT, capture_output=True, text=True).stdout
    json.dump({'buildings_md': bmd, 'layout_reference_md': lmd}, open(SNAP, 'w'))

zones = {z['id']: z for z in spec['zones']}
surfaces = {s['zoneId']: s for s in spec['traversal_surfaces']}
buildings = {b['id']: b for b in spec['buildings']}
frontages = {f['id']: f for f in spec['frontages']}
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

# ---------- parse buildings.md schedule ----------
sched = {}  # frontage id -> {'reserve': (a0,aL), 'rows': [(bay, assembly, a, S, H)], 'materials': str}
composition = {}  # BLD id -> (composition, prose)
cur_b = None; cur_f = None
lines = bmd.split('\n')
for i, ln in enumerate(lines):
    m = re.match(r'^### B\d+ · (BLD_[A-Z0-9_]+)', ln)
    if m:
        cur_b = m.group(1); composition[cur_b] = {'composition': '', 'prose': [], 'fronts': []}
        continue
    if cur_b is None:
        continue
    m = re.match(r'^\*\*Composition:\*\* (.*)', ln)
    if m:
        composition[cur_b]['composition'] = m.group(1); continue
    m = re.match(r'^\*\*(public front|secondary/service wing front|compound/service wall):\*\* `F/([A-Z0-9_]+)`', ln)
    if m:
        cur_f = 'FRONTAGE_' + m.group(2); sched[cur_f] = {'role': m.group(1), 'rows': [], 'reserve': None, 'materials': ''}
        composition[cur_b]['fronts'].append(cur_f); continue
    if ln.startswith('Observed code-boundary span'):
        composition[cur_b]['prose'].append(ln); continue
    m = re.match(r'^Reserved end fields to lower assemblies: \*\*([0-9.]+) m at a=0\*\*, \*\*([0-9.]+) m at a=L\*\*', ln)
    if m and cur_f:
        sched[cur_f]['reserve'] = (float(m.group(1)), float(m.group(2))); continue
    m = re.match(r'^\| `([A-Z0-9_]+)` \| `?([A-Za-z_ ]+?)`?( sealed inspection panel)? \| ([0-9.]+) \| ([0-9.]+) / ([0-9.]+) \|', ln)
    if m and cur_f:
        sched[cur_f]['rows'].append((m.group(1), m.group(2).strip(), float(m.group(4)), float(m.group(5)), float(m.group(6)))); continue
    if ln.startswith('Material assignment:') and cur_f:
        sched[cur_f]['materials'] = ln; continue
    if ln and not ln.startswith(('|', '[', '**', '<a', '#')) and cur_f is None and not ln.startswith('Numbers B'):
        composition[cur_b]['prose'].append(ln)

# roof survey
roof = {}
for ln in lines:
    m = re.match(r'^\| B\d+ / `([A-Z0-9_]+)` \| ([0-9.]+) \| ([^|]+) \| ([^|]+) \|', ln)
    if m:
        roof['FRONTAGE_' + m.group(1)] = (float(m.group(2)), m.group(3).strip(), m.group(4).strip())

# ---------- parse compiled placements ----------
placements = []
for ln in lmd.split('\n'):
    m = re.match(r'^- `(PLACE_[A-Z0-9_]+)`: `(ASSET_[A-Z0-9_]+)` at `([A-Za-z0-9_]+)` \(([-0-9.]+), ([-0-9.]+), ([-0-9.]+)\), size ([0-9.]+)×([0-9.]+)×([0-9.]+)m, yaw ([-0-9.]+)deg', ln)
    if m:
        placements.append({'id': m.group(1), 'asset': m.group(2), 'anchor': m.group(3), 'x': float(m.group(4)), 'y': float(m.group(5)), 'z': float(m.group(6)),
                           'w': float(m.group(7)), 'd': float(m.group(8)), 'h': float(m.group(9)), 'yaw': float(m.group(10)) % 360})

def zone_of_point(x, y):
    best = None
    for z in spec['zones']:
        r = z['rect']
        if r['x'] - 1.6 <= x <= r['x'] + r['w'] + 1.6 and r['y'] - 1.6 <= y <= r['y'] + r['h'] + 1.6:
            d = min(abs(x - r['x']), abs(x - r['x'] - r['w']), abs(y - r['y']), abs(y - r['y'] - r['h']))
            if best is None or d < best[0]:
                best = (d, z['id'])
    return best[1] if best else None

by_zone_pl = defaultdict(list)
for p in placements:
    a = anchors.get(p['anchor'])
    zid = a['zone'] if a and a.get('zone') else zone_of_point(p['x'], p['y'])
    p['zone'] = zid
    by_zone_pl[zid].append(p)

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
    return f'{v:.2f}'.rstrip('0').rstrip('.') if isinstance(v, float) else str(v)

def unit_id(zid):
    return 'unit-' + zid.lower().replace('_', '-')

# ---------- sheet writer ----------
def wall_section(out, f, b):
    ax, c, a0, a1, L = span(f)
    prof = profiles[f['facadeProfileId']]; mas = massings[f['massingProfileId']]
    wall = next((w for w in b['walls'] if w.get('frontageId') == f['id']), None)
    sc = sched.get(f['id'], {'rows': [], 'reserve': None, 'materials': '', 'role': ''})
    rows = {r[0]: r for r in sc['rows']}
    ov = OV.WALLS.get(f['id'], {})
    coord = f'x = {fmt(c)}, y = {fmt(a0)} .. {fmt(a1)} (a runs south to north)' if ax == 'x' else f'y = {fmt(c)}, x = {fmt(a0)} .. {fmt(a1)} (a runs west to east)'
    out.append(f"### {f['id']}  ·  {b['id']} ({b['type']}, {b['storeys']} storey{'s' if b['storeys']>1 else ''})")
    out.append('')
    out.append(f"- **Role:** {sc.get('role') or 'face'}. {b['brief']}")
    out.append(f"- **Wall line:** {f['face']} edge of `{f['zoneId']}`; {coord}; length **{fmt(L)} m**; street side {FACE_STREET[f['face']]}; kit `Wall(F, ({fmt(a0 if ax=='y' else c)}, {fmt(c if ax=='y' else a0)}), ({fmt(a1 if ax=='y' else c)}, {fmt(c if ax=='y' else a1)}), faces='{KIT_FACES[f['face']]}')`.")
    rb = roof.get(f['id'])
    out.append(f"- **Massing `{mas['id']}`:** wall top {fmt(mas['heightM'])} m, depth {fmt(mas['depthM'])} m, roof `{mas['roofStyle']}`, roof setback {fmt(mas['roofSetbackM'])} m, parapet +{fmt(mas['parapetHeightM'])} m" + (f"; baseline survey: roof base {fmt(rb[0])}, parapet cap {rb[1]}, emitted max {rb[2]}" if rb else '') + '.')
    out.append(f"- **Facade GLB frame:** width {fmt(L)} m × height {fmt(mas['heightM'])} m; origin bottom-centre of the street face, +Z toward the street, Y up after `export_yup`.")
    out.append(f"- **Materials (profile `{prof['id']}`):** wall `{prof['materialSlots']['wall']}`, trim `{prof['materialSlots']['trim']}`, roof `{prof['materialSlots']['roof']}`, timber `{prof['materialSlots']['timber']}`, metal `{prof['materialSlots']['metal']}`, accent `{prof['materialSlots']['accent']}`." + (f" Override: {ov['materials']}" if ov.get('materials') else ''))
    gh = wall['groundHeadM'] if wall else None
    res = sc.get('reserve')
    out.append(f"- **Corners:** `{wall['corners'] if wall else 'held'}`" + (f"; solid end piers reserved: {fmt(res[0])} m at a=0, {fmt(res[1])} m at a=L" if res else '') + f". Ground head datum {fmt(gh)} m." if gh else '.')
    li = f.get('layoutIntent', {})
    if li.get('upperSillDatumsM'):
        out.append(f"- **Upper sill datums:** {', '.join(fmt(v) for v in li['upperSillDatumsM'])} m.")
    # datums
    out.append(f"- **Horizontal datums (SD-01..SD-03 unless overridden):** {ov.get('datums') or OV.default_datums(b, wall, mas, gh)}")
    out.append('')
    out.append('| Bay | Module / assembly | Variant | a (m) | World (x, y) | W × D × H (m) | Sill / head (m) | Storey | Dressing bound here |')
    out.append('|---|---|---|---:|---|---|---|---:|---|')
    bays = wall['bays'] if wall else []
    dress = wall['dressing'] if wall else []
    for bay in bays:
        r = rows.get(bay['id'])
        if r is None:  # schedule used a different bay id (e.g. BAY_NICHE_AXIS vs BAY_01): match by assembly and nearest a
            cands = [x for x in sc['rows'] if x[1] == bay['module']]
            r = min(cands, key=lambda x: abs(x[2] - bay['alongM'])) if cands and min(abs(x[2] - bay['alongM']) for x in cands) < 0.05 else None
        mod = (modules.get(r[1]) if r else None) or modules.get(bay['module'])
        wx, wy = bay_world(f, bay['alongM'])
        dims = f"{fmt(mod['dimensionsM']['width'])} × {fmt(mod['dimensionsM']['depth'])} × {fmt(mod['dimensionsM']['height'])}" if mod else '(retained code module)'
        sh = f"{fmt(r[3])} / {fmt(r[4])}" if r else ('0 / ' + fmt(mod['dimensionsM']['height']) if mod and bay['story'] == 0 and mod['kind'] in ('door', 'arch', 'shop_recess') else '—')
        var = OV.VARIANTS.get((f['id'], bay['id']), '')
        asm = r[1] if r and r[1] != bay['module'] else bay['module']
        bound = '; '.join(d['assetId'] + ' (' + d['where'] + ')' for d in dress if bay['id'] in d['where'] or ('MOUNT' in d['where'] and bay['id'].endswith(d['where'][-1]) and 'WINDOW' in bay['id'] and 'WINDOW' in d['where']))
        out.append(f"| `{bay['id']}` | `{bay['module']}`" + (f" → `{asm}`" if asm != bay['module'] else '') + f" | {var} | {fmt(bay['alongM'])} | ({fmt(wx)}, {fmt(wy)}) | {dims} | {sh} | {bay['story']} | {bound} |")
    out.append('')
    if dress:
        out.append('Bound dressing from the schedule (`walls[].dressing`): ' + '; '.join(f"`{d['assetId']}` at {d['where']}" for d in dress) + '.')
    if wall and wall.get('needs'):
        out.append('Open `needs` in the spec (close them with this sheet): ' + ', '.join(f'`{n}`' for n in wall['needs']) + '.')
    out.append('')
    comp = composition.get(b['id'], {})
    if comp.get('composition'):
        out.append(f"**Composition.** {comp['composition']}")
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
            rows.append(f"| `{a['id']}` | {a['type']} | {pos} | {dims} | {fmt(a.get('yaw_deg', 0))} | {a.get('notes','')[:140]} |")
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
        rows.append(f"| `{a['id']}` | ({fmt(p0[0])}, {fmt(p0[1])}, {fmt(z0)}) | ({fmt(p1[0])}, {fmt(p1[1])}, {fmt(z1)}) | {fmt(a.get('width_m', 0)) if a.get('width_m') else '—'} | {a.get('notes','')[:150]} |")
    if rows:
        out.append('| Span | End A (x, y, z) | End B (x, y, z) | Width | Note |')
        out.append('|---|---|---|---|---|')
        out.extend(rows); out.append('')

def sheet(unit, zids, title, also):
    out = []
    out.append(f'# {unit} · {title}')
    out.append('')
    out.append(f"Construction sheet. Read [README.md](README.md) first: it holds the coordinate conventions, the standard details (SD-xx), the clearance rules and the completion checklist that every task below assumes. Numbers here are design metres from `map_spec.json`; `pnpm map:shoot {unit} --tag r1-before` prints the same walls and must agree. Also called: {also}.")
    out.append('')
    out.append(f"**Scope lock.** Render-only work only: walls, openings, materials, awnings, signs, goods, overheads, roofs, skyline, ground finish. Colliders, routes, clear widths, cover anchors, spawns and playable elevation are protected by `pnpm map:check`. Gameplay proposals from the atlas (E1 Tea slot, G1 Textile return) are **not** in this sheet.")
    out.append('')
    intro = OV.UNITS.get(unit, {})
    if intro.get('intent'):
        out.append('## 1. Design intent'); out.append(''); out.append(intro['intent']); out.append('')
    out.append('## 2. Site'); out.append('')
    for zid in zids:
        zone_section(out, zid, unit)
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
    out.append('## 7. Roofs and skyline'); out.append('')
    out.append(intro.get('skyline') or 'Baseline roofs per the massing table above (roof base = wall top, parapet per profile, coping SD-03). No new rooftop props. Perimeter skyline placements, if any, are listed in [skyline.md](skyline.md).'); out.append('')
    out.append('## 8. Completion checks'); out.append('')
    for c in (intro.get('checks') or []) + OV.COMMON_CHECKS:
        out.append(f'- [ ] {c}')
    out.append('')
    out.append('## 9. Verification record'); out.append('')
    out.append('| Date | Check or view | Result | Evidence |'); out.append('|---|---|---|---|'); out.append('| | `pnpm map:check` | | |'); out.append('| | movement check standing and crouched | | |'); out.append('| | fresh-eyes verdict (massing / facade / materials) | | |'); out.append('')
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
    comp = composition.get(b['id'], {})
    if comp.get('composition'):
        out.append(f"**Composition.** {comp['composition']}"); out.append('')
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
