"""Focused regressions for section aprons and finish receiver clearance."""
import copy
import hashlib
import json
import runpy
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import integrate_bz04
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

class FloorInstallTest(unittest.TestCase):
    def setUp(self):
        directory=TemporaryDirectory();self.addCleanup(directory.cleanup)
        self.root=Path(directory.name)
        self.addCleanup(patch.stopall);patch.object(integrate_bz04,'ROOT',self.root).start()
        self.manifest_path=self.root/'pack/materials.json';self.manifest_path.parent.mkdir()
        self.mid='bz04_court_limestone_flags_01'
        source={'id':'red_sandstone_pavement','textures':{}}
        self.entry={'manifest':'pack/materials.json','sourceMaterialId':source['id'],
                    'tileSizeM':2.15,'normalScale':.4,'roughness':.94,'aoIntensity':.25,
                    'baseColorRecipe':{'sourceFiles':{},'sourceHashes':{}}}
        for quality in ('1k','2k'):
            maps={}
            for channel in ('normal','arm'):
                relative=f'./photo-{channel}-{quality}.png';data=(quality+channel).encode()
                (self.manifest_path.parent/relative).write_bytes(data);maps[channel]=relative
                if quality=='1k':
                    self.entry['baseColorRecipe']['sourceFiles'][channel]='pack/'+Path(relative).name
                    self.entry['baseColorRecipe']['sourceHashes'][channel]=hashlib.sha256(data).hexdigest()
            source['textures'][quality]=maps
        target={'id':self.mid,'aoIntensity':.4,'textures':{quality:{channel:f'./old-{channel}-{quality}.png' for channel in ('albedo','normal','arm')} for quality in ('1k','2k')}}
        self.unrelated={'id':'unrelated','normalScale':.73,'textures':{'1k':{'albedo':'unchanged-a','normal':'unchanged-n','arm':'unchanged-r'}}}
        self.manifest={'materials':[target,source,self.unrelated]}
        self.manifest_path.write_text(json.dumps(self.manifest))
        self.baked=self.root/'assets/source/bz04-shared-environment/materials';self.baked.mkdir(parents=True)
        self.albedo=self.baked/'flags-albedo.png';self.albedo.write_bytes(b'calibrated-albedo')
        self.recipe={'textures':{'albedo':str(self.albedo.relative_to(self.root))},'sha256':{'albedo':hashlib.sha256(self.albedo.read_bytes()).hexdigest()}}
        (self.baked/'recipes.json').write_text(json.dumps({self.mid:self.recipe,'unrelated':self.recipe}))
        (self.root/'assets/source/bazaar_finish.py').write_text("FLOOR_PIGMENTS = {'bz04_court_limestone_flags_01':'#ffffff'}\n")
        self.handoff={'areas':[{'floorMaterialId':self.mid}],'materials':{self.mid:self.entry}}

    def test_flagstone_preserves_matching_source_tiers_and_other_rows(self):
        integrate_bz04.install_floor(self.handoff)
        actual=json.loads(self.manifest_path.read_text())
        row=actual['materials'][0]
        for quality in ('1k','2k'):
            self.assertEqual(row['textures'][quality],dict(self.manifest['materials'][1]['textures'][quality],albedo='./bz06-derived/flags-albedo.png'))
        for key,value in {'tileSizeM':2.15,'normalScale':.4,'roughness':.94,'aoIntensity':.25,'tintHex':'#ffffff','albedoBoost':1,'albedoGamma':1,'dustStrength':0}.items():self.assertEqual(row[key],value)
        self.assertEqual(actual['materials'][1:],self.manifest['materials'][1:])
        self.assertEqual((self.manifest_path.parent/'bz06-derived/flags-albedo.png').read_bytes(),self.albedo.read_bytes())
        first=self.manifest_path.read_bytes();integrate_bz04.install_floor(self.handoff)
        self.assertEqual(self.manifest_path.read_bytes(),first,'Repeated install changed binding')

    def test_other_floor_keeps_existing_channel_and_tier_behavior(self):
        entry=dict(self.entry,sourceMaterialId='not-needed-for-other-floors')
        integrate_bz04.install_floor({'areas':[{'floorMaterialId':'unrelated'}],'materials':{'unrelated':entry}})
        actual=json.loads(self.manifest_path.read_text())
        row=actual['materials'][2]
        self.assertEqual(row['textures'],{'1k':{'albedo':'./bz06-derived/flags-albedo.png','normal':'unchanged-n','arm':'unchanged-r'}})
        self.assertNotIn('aoIntensity',row)
        self.assertEqual(actual['materials'][:2],self.manifest['materials'][:2])

    def test_missing_source_tier_rejects_before_any_install_write(self):
        self.manifest['materials'][1]['textures'].pop('2k')
        self.manifest_path.write_text(json.dumps(self.manifest));before=self.manifest_path.read_bytes()
        with self.assertRaisesRegex(ValueError,'Missing flagstone source 2k normal'):integrate_bz04.install_floor(self.handoff)
        self.assertEqual(self.manifest_path.read_bytes(),before)
        self.assertFalse((self.manifest_path.parent/'bz06-derived').exists())

    def test_changed_source_map_rejects_before_any_install_write(self):
        (self.manifest_path.parent/'photo-normal-1k.png').write_bytes(b'changed')
        before=self.manifest_path.read_bytes()
        with self.assertRaisesRegex(ValueError,'Flagstone source texture changed'):integrate_bz04.install_floor(self.handoff)
        self.assertEqual(self.manifest_path.read_bytes(),before)
        self.assertFalse((self.manifest_path.parent/'bz06-derived').exists())

    def test_changed_baked_albedo_rejects_before_any_install_write(self):
        self.albedo.write_bytes(b'changed');before=self.manifest_path.read_bytes()
        with self.assertRaisesRegex(ValueError,'Derived floor texture changed'):integrate_bz04.install_floor(self.handoff)
        self.assertEqual(self.manifest_path.read_bytes(),before)
        self.assertFalse((self.manifest_path.parent/'bz06-derived').exists())

if __name__=='__main__':unittest.main()
