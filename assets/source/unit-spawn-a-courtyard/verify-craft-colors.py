"""Check exported warm timber and iron pixels against their exact frozen R7 recipes."""
from pathlib import Path
import argparse
import io
import json
import struct
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[3]


def check(glb_path,handoff_path):
    raw=glb_path.read_bytes();size=struct.unpack_from('<I',raw,12)[0]
    gltf=json.loads(raw[20:20+size]);binary=raw[28+size:]
    handoff=json.loads(handoff_path.read_text())
    profiles=handoff['craftStandards']['materials']
    area=handoff['areas'][0]
    profiles=area.get('finishSchedule',{}).get('materials') or profiles
    pack=ROOT/'apps/client/public/assets/textures/environment/bazaar/walls/bazaar_wall_textures_pack_v5'
    manifest={m['id']:m for m in json.loads((pack/'materials.json').read_text())['materials']}
    result={}
    for kind in ['warmTimber','iron']:
        profile=profiles[kind]
        material=next(m for m in gltf['materials'] if m['name']==profile['exportName'])
        texture=material['pbrMetallicRoughness']['baseColorTexture']['index']
        image=gltf['images'][gltf['textures'][texture]['source']]
        view=gltf['bufferViews'][image['bufferView']];start=view.get('byteOffset',0)
        actual=np.asarray(Image.open(io.BytesIO(binary[start:start+view['byteLength']])).convert('RGBA'),dtype=float)/255
        entry=manifest[profile['sourceMaterialId']]
        source=np.asarray(Image.open(pack/entry['textures']['1k']['albedo']).convert('RGB'),dtype=float)/255
        assert actual.shape[:2]==source.shape[:2],(kind,'source resolution changed')
        linear=lambda values:np.where(values<=.04045,values/12.92,((values+.055)/1.055)**2.4)
        paint=linear(np.array([int(profile['paintSrgb'][i:i+2],16) for i in (1,3,5)],dtype=float)/255)
        expected_linear=paint*((1-profile['grainMix'])+profile['grainMix']*linear(source))
        expected=np.where(expected_linear<=.0031308,expected_linear*12.92,1.055*expected_linear**(1/2.4)-.055)
        error=np.abs(actual[:,:,:3]-expected)
        report={'actualMeanSrgb':actual[:,:,:3].mean(axis=(0,1)).tolist(),
                'requiredMeanSrgb':expected.mean(axis=(0,1)).tolist(),
                'meanAbsoluteError':float(error.mean()),'maxAbsoluteError':float(error.max()),
                'alphaPreserved':bool(np.all(actual[:,:,3]==1)),
                'status':'PASS' if error.mean()<=1/255 and error.max()<=3/255 and np.all(actual[:,:,3]==1) else 'FAIL'}
        result[kind]=report
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--glb',type=Path,default=Path(__file__).with_name('unit-spawn-a-courtyard.glb'))
    parser.add_argument('--handoff',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();result=check(args.glb,args.handoff)
    args.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
    if any(value['status']!='PASS' for value in result.values()):raise SystemExit(1)
