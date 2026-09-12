"""Focused regression for nonplayable upper-balcony door apron geometry."""
import copy
import runpy
import unittest
from pathlib import Path
from integrate_bz04 import door_service_depth

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

if __name__=='__main__':unittest.main()
