"""User-directed color and occupation pass over the installed R7 architecture.

These finishes preserve the engineering envelopes. Linear vertex pigments retain
the licensed PBR scans and survive both embedded and runtime-bound materials.
"""
from types import SimpleNamespace


PIGMENTS = {
    'ph_bz04_painted_plaster_warm': (.68, .51, .34),
    'ph_bz04_beige_wall_002': (.74, .59, .42),
    'ph_bz04_plastered_wall': (.76, .68, .51),
    'ph_bz04_aged_plaster_ochre': (.78, .60, .39),
    'ph_bz04_red_plaster_weathered': (.72, .48, .35),
    'ph_bz04_sandstone_blocks_05': (.76, .64, .46),
    'ph_bz04_sandstone_blocks_06': (.68, .55, .39),
    'ph_bz04_trim_sanded_01': (.84, .76, .61),
    'ph_bz04_rough_pine_door': (.65, .57, .45),
    'ph_bz04_worn_planks': (.70, .60, .46),
}

FLOOR_PIGMENTS = {
    'bz04_court_limestone_flags_01': '#d8c4a5',
    'bz04_large_sandstone_blocks_01': '#d4b68f',
}

# Named receivers, absolute design metres; routes and apertures stay untouched.
TEXTILES = {
    'unit-spawn-a-courtyard': [
        ('A_S_GATE', 25.30, 4.55, .95, 2.45, '#aa512d', False),
        ('A_S_GATE', 30.70, 4.55, .95, 2.45, '#277970', False),
        ('A_W_NORTH', 6.50, 2.40, 1.00, 1.48, '#ad563e', True),
    ],
    'unit-spice-street': [
        ('S_W_SOUTH', 18.62, 3.20, .85, 1.75, '#a64a32', True),
        ('S_E_NORTH', 28.40, 4.40, 1.15, 1.80, '#bb7634', False),
    ],
    'unit-fountain-court': [
        ('F_E_HOUSE', 47.25, 3.0, .80, 1.8, '#a65037', True),
        ('F_W_HALL', 41.65, 4.8, .85, 2.3, '#425d83', False),
    ],
    'unit-textile-arcade': [
        ('T_W_LOOM', 49.95, 3.15, 1.60, 1.55, '#a65037', True),
        ('T_E_CART', 63.35, 3.35, .75, 2.05, '#325e83', False),
        ('T_W_FOLDS', 60.55, 3.15, 1.40, 1.40, '#a65037', True),
    ],
    'unit-rug-gate': [
        ('R_W_MERCHANT', 68.6, 3.15, 1.30, 2.35, '#a65037', True),
        ('R_E_HOUSE', 75.0, 6.15, 1.55, 1.70, '#a65037', True),
    ],
    'unit-spawn-b-courtyard': [
        ('B_N_TEXTILE', 36.2, 3.35, .90, 2.60, '#a65037', True),
        ('B_W_HOUSE', 83.6, 3.25, .80, 2.25, '#a65037', True),
    ],
    'unit-tea-ramp': [('tr-e', 52.0, 3.5, 1.30, 1.30, '#a65037', True)],
    'unit-tea-terrace': [('tt-rug-return', 65.0, 3.0, 1.25, 2.30, '#a65037', True)],
    'unit-dyers-alley': [
        ('DA_E_WORK', 16.35, 3.0, .60, 1.65, '#375b88', False),
        ('DA_E_YARD', 27.1, 2.8, .70, 1.65, '#b87830', False),
        ('da-house', 25.0, 3.0, 1.0, 1.20, '#a65037', True),
    ],
    'unit-covered-souk': [
        ('cs-e', 37.6, 3.35, 1.20, 1.70, '#a65037', True),
        ('cs-e', 43.15, 3.35, 1.10, 1.40, '#a65037', True),
        ('cs-wn', 47.25, 2.75, .80, 1.15, '#a65037', True),
    ],
    'unit-dyers-dogleg': [
        ('dd-w', 55.4, 3.25, .85, 1.7, '#41698a', False),
        ('dd-e', 52.1, 3.0, 1.10, 1.4, '#a65037', True),
    ],
    'unit-north-court': [
        ('nc-eh', 66.5, 3.0, 1.25, 1.30, '#a65037', True),
        ('nc-ey', 76.1, 3.1, 1.00, 2.00, '#b27639', False),
    ],
}

REPAIRS = {
    'unit-spawn-a-courtyard': [('A_S_GATE', 24.6, .92, .45, .54), ('A_E_DRYING', 7.7, 1.15, .38, .72)],
    'unit-spice-street': [('S_W_NORTH', 31.50, .70, .62, .85), ('S_E_NORTH', 25.20, 1.05, .50, .62)],
    'unit-fountain-court': [('F_E_HOUSE', 44.55, .55, .55, .75), ('F_W_SERVICE', 32.65, .90, .70, .55)],
    'unit-textile-arcade': [('T_E_LOOM', 52.80, 3.52, .60, .50), ('T_W_FOLDS', 63.60, 4.62, .42, .50)],
    'unit-rug-gate': [('R_W_MERCHANT', 71.50, .60, .60, .75)],
    'unit-spawn-b-courtyard': [('B_N_POTTER', 17.45, .40, .50, .60), ('B_E_PACKER', 88.6, .95, .50, .55)],
    'unit-service-south': [('ss-e', 19.75, .48, .50, .82), ('ss-w', 12.2, .60, 1.10, .64)],
    'unit-caravan-court': [('cc-es-part-2', 32.65, .85, .72, .65), ('cc-s', 12.1, .65, .8, .8)],
    'unit-service-north': [('sn-w', 53.65, .45, .55, .92), ('sn-w', 65.5, .65, .80, .58)],
    'unit-tea-ramp': [('tr-e', 49.0, .85, .64, .75)],
    'unit-tea-terrace': [('tt-e', 63.65, 4.62, .42, .65)],
    'unit-dyers-alley': [('DA_E_WORK', 16.4, .65, .64, .7), ('da-house', 28.5, .65, .70, .55)],
    'unit-covered-souk': [('cs-e', 32.65, .55, .72, .7), ('cs-ws', 32.6, .7, .64, .65)],
    'unit-dyers-dogleg': [('dd-e', 57.0, 3.72, .72, .60)],
    'unit-north-court': [('nc-eh', 65.15, .55, .60, .70), ('nc-ey', 76.6, 3.42, .80, .6)],
}

JOINERY_COLORS = {
    'unit-spawn-a-courtyard': {'A_S_GATE-PRINCIPAL': '#755238', 'A_S_KEEPER-ENTRANCE': '#60715b'},
    'unit-spice-street': {'S_E_SOUTH-ENTRANCE': '#3c7064', 'S_E_MID-ENTRANCE': '#755038'},
    'unit-fountain-court': {'F_W_HALL-PRINCIPAL': '#4b7166', 'F_E_HOUSE-ENTRANCE': '#74513c'},
    'unit-textile-arcade': {'T_W_LOOM-STAFF-DOOR': '#496777', 'T_E_CART-STAFF-DOOR': '#60705a'},
    'unit-rug-gate': {'R_E_HOUSE-ENTRANCE': '#3c756a', 'R_W_MERCHANT-STAFF-DOOR': '#745038'},
    'unit-spawn-b-courtyard': {'B_E_STORE-DOOR': '#4b6470'},
    'unit-service-south': {'ss-e-ENTRANCE': '#416b61', 'ss-w-DELIVERY-1': '#75543d'},
    'unit-caravan-court': {'cc-w-STAFF-DOOR': '#416b61'},
    'unit-service-north': {'sn-w-DELIVERY-1': '#3c6766', 'sn-w-DELIVERY-2': '#795740', 'sn-w-DELIVERY-3': '#506773'},
    'unit-tea-terrace': {'tt-e-STAFF-DOOR': '#3a7169'},
    'unit-dyers-alley': {'DA_E_YARD-ENTRANCE': '#41756e', 'da-works-ENTRANCE': '#4a607e'},
    'unit-covered-souk': {'cs-ws-STAFF-DOOR': '#4d6f69'},
    'unit-dyers-dogleg': {'dd-e-ENTRANCE': '#3c766b', 'dd-w-STAFF-DOOR': '#84553a'},
    'unit-north-court': {'nc-ws-ENTRANCE': '#3c726b', 'nc-eh-ENTRANCE': '#486a74'},
}

CLOTH_COLORS = {
    'unit-covered-souk': {'CANOPY_SOUK_S-cloth': '#b67b38', 'CANOPY_SOUK_N-cloth': '#9b583d'},
    'unit-dyers-alley': {'SHADE_DA_E_WORK_RECESS-cloth': '#3e7b70',
        'G_DA_E_SAMPLE_RECESS-sample-1-field': '#3b5b8b', 'G_DA_E_SAMPLE_RECESS-sample-2-field': '#a14c35', 'G_DA_E_SAMPLE_RECESS-sample-3-field': '#b38036'},
    'unit-tea-terrace': {'SHADE_tt-shop-cloth': '#a45035', 'R4-SHADE-TT-RECESSED-SEAT-cloth': '#3a7b71', 'G_TT_RECESSED_SEAT-fitted-cushion': '#aa5843'},
    'unit-textile-arcade': {'CANOPY_TEXTILE-cloth': '#3f7776', 'CANOPY_TEXTILE-bound-hem': '#b78a48'},
    'unit-spice-street': {
        'CANOPY_SPICE_S-cloth': '#b9702d', 'CANOPY_SPICE_N-cloth': '#9b5430',
        'SHADE_S_W_SHOP_1-cloth': '#397c70', 'SHADE_S_W_SHOP_2-cloth': '#b2814a',
        'SHADE_S_W_SHOP_3-cloth': '#526b88',
    },
}

STOCK_COLORS = {
    'unit-tea-terrace': {'G_tt-shop-cup-1': '#317a77', 'G_tt-shop-cup-2': '#b27839',
                         'G_tt-shop-tea-stock-1': '#3c7371', 'G_tt-shop-tea-stock-2': '#994b31'},
}

GLASS = {
    'unit-spawn-a-courtyard': ['A_S_GATE-L1-W2'],
    'unit-fountain-court': ['F_E_LOGGIA-RECEPTION'],
    'unit-covered-souk': ['cs-ws-L1-W2'],
    'unit-north-court': ['nc-ws-L1-W1', 'nc-ws-L1-W2'],
}

POT_GROUPS = {
    'unit-spawn-b-courtyard': [('B_N_POTTER', 18.225, 0)],
    'unit-dyers-alley': [('DA_E_YARD', 30.9, 0)],
    'unit-covered-souk': [('cs-e', 37.3, 0)],
}


def glazing(G, opening, face, plane):
    """Fit small colored glass lights into the top of an existing closed frame."""
    left = opening['alongM']-opening['widthM']/2+.12
    right = opening['alongM']+opening['widthM']/2-.12
    top = opening['headM']-.14
    bottom = top-.36
    out = -opening['depthM']+.052
    colors = ('#bf833a', '#267b75', '#3e578a', '#267b75', '#bf833a')
    pitch = (right-left)/len(colors)
    for index, color in enumerate(colors):
        l, r = left+index*pitch, left+(index+1)*pitch
        ob = G.part(face, plane, 'life-glass-'+opening['id']+str(index), (l+.012,out,bottom), (r-.012,out+.008,top), 'bz04_fixed_glass', 'receive')
        G.paint_object(ob, color)
        G.part(face, plane, 'life-glass-mullion-'+opening['id']+str(index), (l-.009,out-.005,bottom-.025), (l+.009,out+.019,top+.025), G.IRON, 'receive')
    for z in (bottom-.025, top):
        G.part(face, plane, 'life-glass-rail-'+opening['id'], (left-.018,out-.005,z), (right+.018,out+.024,z+.025), G.WOOD, 'receive')
    G.part(face, plane, 'life-glass-edge-'+opening['id'], (right-.009,out-.005,bottom-.025), (right+.009,out+.019,top+.025), G.IRON, 'receive')


def multiply_pigment(ob, factor):
    colors = ob.data.color_attributes.get('COLOR_0')
    if colors is None:
        colors = ob.data.color_attributes.new('COLOR_0', 'FLOAT_COLOR', 'POINT')
        for color in colors.data:
            color.color = (1, 1, 1, 1)
    for color in colors.data:
        rgba = color.color[:]
        color.color = tuple(rgba[i] * factor[i] for i in range(3)) + (rgba[3],)
    ob.data.color_attributes.active_color = colors


def clear_wall_rectangle(parcel, along, bottom, width, height):
    """Reject decoration that covers any part of an aperture or its surround."""
    assert parcel['interval'][0] <= along-width/2 and along+width/2 <= parcel['interval'][1]
    for opening in parcel['openings']:
        trim = opening.get('trimWidthM', .1)
        overlap = (along-width/2 < opening['alongM']+opening['widthM']/2+trim
                   and along+width/2 > opening['alongM']-opening['widthM']/2-trim
                   and bottom < opening['headM']+trim
                   and bottom+height > opening['sillM']-.06)
        assert not overlap, (parcel['id'], 'finish overlaps opening', opening['id'])


def apply(namespace, path):
    G = SimpleNamespace(**namespace)
    if G.bpy.context.scene.get('bazaarColorLifeApplied'):
        return
    if path.stem == G.A['outputUnit']:
        from bazaar_life import wall_textile, plaster_loss, ceramic_pots
        parcels = {p['id']: (f, p) for f in G.A['faces'] for p in f['parcels']}
        for index, (parcel_id, along, bottom, width, height, color, rug) in enumerate(TEXTILES.get(path.stem, [])):
            face, parcel = parcels[parcel_id]
            assert parcel['interval'][0] <= along-width/2-.15 and along+width/2+.15 <= parcel['interval'][1]
            assert bottom+height+.15 < parcel['wallTopM']
            clear_wall_rectangle(parcel, along, bottom, width+.14, height+.07)
            wall_textile(G, 'life-'+parcel_id+'-'+str(index), face['face'], face['wallPlaneM'], along, bottom, width, height, color, kind='rug' if rug else 'banner')
        for index, (parcel_id, along, bottom, width, height) in enumerate(REPAIRS.get(path.stem, [])):
            face, parcel = parcels[parcel_id]
            clear_wall_rectangle(parcel, along, bottom, width, height)
            floor = G.A['floor']
            ground = floor.get('elevationM', 0)
            if floor['kind'] == 'ramp':
                axis = floor['axis']
                point = G.coords(face['face'], face['wallPlaneM'], along, 0, 0)
                t = (point[0 if axis == 'x' else 1]-floor['rect'][axis])/floor['rect']['w' if axis == 'x' else 'h']
                ground = floor['startElevationM']+t*(floor['endElevationM']-floor['startElevationM'])
            def receives(region):
                z = region.get('zM') or [ground+v for v in region['zAboveFloorM']]
                return region['alongM'][0] <= along <= region['alongM'][1] and z[0] <= bottom+height/2 <= z[1]
            region = next(r for r in parcel['materialRegions'] if receives(r))
            assert any(kind in region['materialId'] for kind in ('plaster', 'beige')), (parcel_id, 'plaster loss requires a plaster receiver')
            grid = parcel['structuralGrid']
            inset = -grid['fieldDepthM'] if grid.get('assembly') == 'BC-01' else 0
            plaster_loss(G, 'life-wear-'+parcel_id+'-'+str(index), face['face'], face['wallPlaneM'], along, bottom, width, height, plaster_material=region['materialId'], surface_out=inset)
        for face in G.A['faces']:
            for parcel in face['parcels']:
                for opening in parcel['openings']:
                    if opening['id'] in GLASS.get(path.stem, []):
                        glazing(G, opening, face['face'], face['wallPlaneM'])
        for parcel_id, along, bottom in POT_GROUPS.get(path.stem, []):
            face, parcel = parcels[parcel_id]
            ceramic_pots(G, 'life-stock-'+parcel_id, face['face'], face['wallPlaneM'], along, bottom, width=.85, depth=.25)
        if path.stem == 'unit-spawn-a-courtyard':
            # Glazed wares rest on the existing blind-arch sill, behind its street edge.
            ceramic_pots(G, 'life-gate-ceramics', 'south', -.24, 23.45, 1.16, width=.85, depth=.25)
    reverse = {v.get('baseColorRecipe', {}).get('exportName'): k for k, v in G.D['materials'].items()}
    changed = 0
    for ob in list(G.bpy.context.scene.objects):
        if ob.type != 'MESH' or not ob.data.materials:
            continue
        paint = next((color for opening, color in JOINERY_COLORS.get(path.stem, {}).items()
                      if ob.name.startswith((opening+'-leaf', opening+'-plank'))), None)
        if paint:
            ob.data.materials.clear()
            ob.data.materials.append(G.mat('bz04_teal_timber_project_original'))
            G.paint_object(ob, paint)
            changed += 1
            continue
        material = ob.data.materials[0]
        name = material.name.split('.')[0]
        source = material.get('bz04SourceMaterial') or reverse.get(name) or name
        color = CLOTH_COLORS.get(path.stem, {}).get(ob.name)
        if color:
            G.paint_object(ob, color, True)
        stock_color = next((color for prefix, color in STOCK_COLORS.get(path.stem, {}).items() if ob.name.startswith(prefix)), None)
        if stock_color:
            G.paint_object(ob, stock_color)
        factor = PIGMENTS.get(source)
        if path.stem == 'bz04-shared-environment' and source in FLOOR_PIGMENTS:
            color = FLOOR_PIGMENTS[source]
            factor = tuple(G._linear_channel(int(color[i:i+2],16)) for i in (1,3,5))
        if factor:
            multiply_pigment(ob, factor)
            changed += 1
    G.bpy.context.scene['bazaarColorLifeApplied'] = True
    print('COLOR LIFE', path.name, changed, 'pigmented meshes', flush=True)
