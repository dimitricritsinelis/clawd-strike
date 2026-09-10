#!/usr/bin/env python3
"""Apply the bounded primary facade alignment patch to an explicitly named source."""
import argparse, copy, json
from pathlib import Path

def apply(d):
    before=copy.deepcopy(d)
    parcels={p['id']:p for a in d['areas'] for f in a['faces'] for p in f['parcels']}
    contexts={p['id']:(a['zone'],f['face']) for a in d['areas'] for f in a['faces'] for p in f['parcels']}
    openings={o['id']:(p,o) for p in parcels.values() for o in p['openings']}
    moves={
        'S_W_SOUTH-L2-W1':17.78, 'R_W_MERCHANT-L2-W1':68,
        'B_N_POTTER-COMMON-LOFT-VENT':20.65,'B_N_TEXTILE-L2-B1':35,
        'A_E_DRYING-L1-W1':4.9,'A_E_DRYING-L1-W2':2.175,'A_E_DRYING-L2-W1':4,
        'A_W_MID-L1-W1':6.5,'A_W_MID-L2-W1':6.5,
    }
    for name in ['F_E_LOGGIA-L1-W1','F_E_LOGGIA-L2-W1','cs-ws-L1-W1','cs-ws-L2-W1']:moves[name]=33.6
    for name in ['F_E_LOGGIA-RECEPTION','F_E_LOGGIA-L2-W2','cs-ws-L1-W2','cs-ws-L2-W2']:moves[name]=36.6
    changed_buildings={openings[n][0]['buildingId'] for n in moves}
    hosts={'A_E_DRYING-L1-W2':'A_E_VATS','A_W_MID-L1-W1':'A_W_NORTH','A_W_MID-L2-W1':'A_W_NORTH'}
    for name,axis in moves.items():
        p,o=openings[name]; assert o['storey']>0 and o['kind'] in ('window','vent')
        o['alongM']=o['axisM']=axis
        if name=='A_E_DRYING-L2-W1':o['widthM']=1.4
        o['alignmentReason']='R7 upper composition balances the complete visible building field independently of the retained ground entrance and trade axes.'
        if name in hosts:
            p['openings'].remove(o);p=parcels[hosts[name]];p['openings'].append(o)
        assert p['interval'][0]+.14 <= axis-o['widthM']/2+1e-9
        assert axis+o['widthM']/2 <= p['interval'][1]-.14+1e-9
    # Room volumes remain non-playable coordination records inside the unchanged shell union.
    for b in d['buildings']:
        if b['id'] not in changed_buildings:continue
        if b['id']=='BLD_A_DYEWORKS':
            for r in b['rooms']:
                if r['storey']==0:continue
                if r['storey']==2:lo,hi=.1,7.9
                elif r['id'].endswith('ROOM-1'):lo,hi=3.4,7.9
                else:lo,hi=.1,3.4;r['referenceParcelId']='A_E_VATS'
                r['boundsXYZ']['min'][:2]=[39.1,lo];r['boundsXYZ']['max'][:2]=[41.9,hi]
                r['use']=('Continuous drying loft across both facade cells, with one smaller vent centered at4m.' if r['storey']==2 else ('Dye drying workroom with the broad upper light at4.9m; internal access remains from the existing ground staff entrance.' if r['id'].endswith('ROOM-1') else 'Staff preparation room with the compact upper light at2.175m; internal circulation links the retained offset ground staff entrance.'))
        if b['id']=='BLD_A_DOMESTIC_REAR':
            for r in b['rooms']:
                if r['storey']==0:continue
                if ':A_W_MID:' in r['id']:
                    r['referenceParcelId']='A_W_NORTH';lo,hi=4,7.9
                else:lo,hi=.1,4
                r['boundsXYZ']['min'][:2]=[14.5,lo];r['boundsXYZ']['max'][:2]=[16.9,hi]
                r['use']=('North household chamber with a window at6.5m; connected internally to the unchanged middle entrance.' if lo==4 else 'South household chamber with a window at1.5m; together the two upper chamber stacks balance the complete eight-metre facade.')
        # Rebuild the existing lookup schedules from actual host membership.
        members=[parcels[n] for n in b['memberParcelIds']]
        for p in members:
            p['structuralGrid']['axesM']=sorted({o['axisM'] for o in p['openings']})
            if p['id'] in ('A_W_NORTH','A_E_VATS'):
                p['structuralGrid'].pop('openings',None)
                p['structuralGrid']['use']='Continuous building face cell hosting the scheduled upper opening; footprint and roof cell remain unchanged.'
        for e in b['elevations']:
            p=parcels[e['parcelId']];e['axesM']=sorted({o['axisM'] for o in p['openings']});e['openingIds']=[o['id'] for o in p['openings']]
        b['subordinateAxesM']=sorted({o['axisM'] for p in members for o in p['openings'] if o['storey']>0 and o['axisM'] not in b.get('primaryAxesM',[])})
        for schedule in b['floorAxisSchedule']:
            level=schedule['storey']
            for f in schedule['facades']:
                os=[o for o in parcels[f['parcelId']]['openings'] if o['storey']==level]
                f['axesM']=sorted({o['axisM'] for o in os});f['openingIds']=[o['id'] for o in os]
            main=set(b['mainFacade']['parcelIds'])
            schedule['mainFacadeAxesM']=sorted({o['axisM'] for p in members if p['id'] in main for o in p['openings'] if o['storey']==level})
        b['alignmentRule']='Upper opening groups balance the complete visible facade or established composition. Ground doors and shop axes remain independent. Existing shared physical room identities and floor levels are retained.'
    # Hard preservation assertions: no ground object, finish, footprint, roof, or gameplay changes.
    oldp={p['id']:p for a in before['areas'] for f in a['faces'] for p in f['parcels']}
    oldo={o['id']:o for p in oldp.values() for o in p['openings']}
    newo={o['id']:o for p in parcels.values() for o in p['openings']}
    assert oldo.keys()==newo.keys()
    for name,o in oldo.items():
        expected=copy.deepcopy(o)
        if name in moves:
            expected['alongM']=expected['axisM']=moves[name];expected['alignmentReason']=newo[name]['alignmentReason']
            if name=='A_E_DRYING-L2-W1':expected['widthM']=1.4
        assert expected==newo[name],name
    for name,p in parcels.items():
        for key in set(p)|set(oldp[name]):
            if key not in ('openings','structuralGrid'):assert p.get(key)==oldp[name].get(key),(name,key)
    for old,b in zip(before['buildings'],d['buildings']):
        for key in set(old)|set(b):
            if key not in ('rooms','elevations','subordinateAxesM','floorAxisSchedule','alignmentRule'):assert old.get(key)==b.get(key),(b['id'],key)
    for key in d:
        if key not in ('areas','buildings'):assert d[key]==before[key],key
    renames={name:name.rsplit('-L2-W1',1)[0]+'-COMMON-LOFT-VENT' for name in ['A_E_DRYING-L2-W1','S_W_SOUTH-L2-W1','R_W_MERCHANT-L2-W1']}
    def rename(value):
        if isinstance(value,dict):return {k:rename(v) for k,v in value.items()}
        if isinstance(value,list):return [rename(v) for v in value]
        return renames.get(value,value) if isinstance(value,str) else value
    updated=rename(d);d.clear();d.update(updated)
    return d

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--design',required=True,type=Path);args=parser.parse_args()
    d=json.loads(args.design.read_text());apply(d);args.design.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
    print('Applied primary facade alignment with geometry, ground-opening and material preservation assertions.')
