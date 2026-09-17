"""Focused regressions for section aprons and finish receiver clearance."""
import copy
import json
import runpy
import unittest
from pathlib import Path
from integrate_bz04 import door_service_depth
from bazaar_finish import REPAIRS, TEXTILES, clear_wall_rectangle

class DoorServiceDepthTest(unittest.TestCase):
    def test_only_explicit_upper_balcony_changes_the_apron(self):
        opening={'id':'door','sillM':3.6,'alongM':0,'widthM':1.5,'heightM':2.65}
        face={'face':'east','wallPlaneM':0}
        feature={'kind':'supported-shallow-balcony','servedOpening':'door',
                 'deck':{'topZM':3.6},'balustrade':{'frontOutM':.515,'railSectionM':.07}}
        area={'floor':{'kind':'flat','elevationM':0},'facadeFeatures':[feature]}
        depth=door_service_depth(area,face,opening)
        self.assertAlmostEqual(depth,.47999)
        self.assertEqual(door_service_depth(area,face,dict(opening,sillM=0)),.8)
        self.assertEqual(door_service_depth(area,face,dict(opening,id='unrelated')),.8)
        invalid=copy.deepcopy(area);invalid['facadeFeatures'][0]['balustrade']['railSectionM']=0
        with self.assertRaises(ValueError):door_service_depth(invalid,face,opening)
        V=runpy.run_path(str(Path(__file__).with_name('unit-spawn-b-courtyard')/'verify.py'))
        def hits(out,depth):
            lo,hi=V['volume']('east',0,(-.75,0,3.641),(.75,depth,5.7))
            return V['intersects']([(-out,-.5,4),(-out,.5,4),(-out,0,4.6)],lo,hi)
        self.assertTrue(hits(.515,.8))
        self.assertFalse(hits(.515,depth))
        self.assertTrue(hits(.3,depth),'an obstruction before the approved rail must still fail')

class FinishReceiverTest(unittest.TestCase):
    def test_real_finish_schedule_clears_opening_surrounds(self):
        design=json.loads((Path(__file__).resolve().parents[2]/'docs/map-design/construction/design.json').read_text())
        for area in design['areas']:
            parcels={p['id']:p for f in area['faces'] for p in f['parcels']}
            for schedule,margin in ((TEXTILES,(.14,.07)),(REPAIRS,(0,0))):
                for parcel,along,bottom,width,height,*_ in schedule.get(area['outputUnit'],[]):
                    with self.subTest(unit=area['outputUnit'],parcel=parcel):
                        clear_wall_rectangle(parcels[parcel],along,bottom,width+margin[0],height+margin[1])
        potter=next(p for a in design['areas'] for f in a['faces'] for p in f['parcels'] if p['id']=='B_N_POTTER')
        with self.assertRaisesRegex(AssertionError,'B_N_POTTER_WORK'):
            clear_wall_rectangle(potter,17.45,.65,.50,.60)

if __name__=='__main__':unittest.main()
