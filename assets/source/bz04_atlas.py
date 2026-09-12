"""Batch the smallest necessary set of opaque PBR materials without changing meshes.

Original repeating UVs and a per-vertex atlas rectangle survive in the GLB. The
runtime samples each rectangle with periodic UVs and the original derivatives.
"""
from pathlib import Path
import argparse
import copy
import io
import json
import math
import struct
import numpy as np
from PIL import Image
from bz04_material_recipes import linear, encoded

TYPES={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
WIDTH={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
PAD=4


def load(path):
    raw=path.read_bytes();size=struct.unpack_from('<I',raw,12)[0]
    return json.loads(raw[20:20+size]),raw[28+size:]


def image_bytes(g,data,index):
    image=g['images'][index]
    if 'uri' in image:raise ValueError('Atlas input must embed its licensed texture images')
    view=g['bufferViews'][image['bufferView']]
    return data[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]


def read_accessor(g,data,index):
    a=g['accessors'][index];v=g['bufferViews'][a['bufferView']]
    if 'sparse' in a:raise ValueError('Sparse atlas input is unsupported')
    dtype=np.dtype(TYPES[a['componentType']]).newbyteorder('<');width=WIDTH[a['type']]
    array=np.ndarray((a['count'],width),dtype=dtype,buffer=data,
        offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dtype.itemsize*width),dtype.itemsize)).copy()
    if a.get('normalized'):
        array=array.astype(np.float32)/np.iinfo(dtype).max
        if dtype.kind=='i':array=np.maximum(-1,array)
    return array


def texture(g,data,info,default,size=None):
    if info:
        if info.get('texCoord',0)!=0 or info.get('extensions'):
            raise ValueError('Atlas input requires the original UV0 without per-texture transforms')
        image=Image.open(io.BytesIO(image_bytes(g,data,g['textures'][info['index']]['source']))).convert('RGB')
    else:image=Image.new('RGB',(1,1),default)
    if size and image.size!=size:image=image.resize(size,Image.Resampling.BILINEAR)
    return np.asarray(image).astype(np.float64)/255


def pbr_maps(g,data,material):
    pbr=material.get('pbrMetallicRoughness',{})
    infos=[pbr.get('baseColorTexture'),pbr.get('metallicRoughnessTexture'),material.get('normalTexture'),material.get('occlusionTexture')]
    sizes=[]
    for info in infos:
        if info:
            image=Image.open(io.BytesIO(image_bytes(g,data,g['textures'][info['index']]['source'])))
            sizes.append(image.size)
    size=(max([s[0] for s in sizes],default=1),max([s[1] for s in sizes],default=1))
    factor=np.array(pbr.get('baseColorFactor',[1,1,1,1]))
    if factor[3]!=1 or material.get('alphaMode','OPAQUE')!='OPAQUE' or any(material.get('emissiveFactor',[0,0,0])):
        raise ValueError('Only opaque, non-emissive material batching is supported')
    albedo=encoded(linear(texture(g,data,infos[0],(255,255,255),size))*factor[:3])
    arm=texture(g,data,infos[1],(255,255,255),size).copy()
    arm[:,:,1]*=pbr.get('roughnessFactor',1);arm[:,:,2]*=pbr.get('metallicFactor',1)
    ao=texture(g,data,infos[3],(255,255,255),size)[:,:,0]
    arm[:,:,0]=1-(1-ao)*(infos[3] or {}).get('strength',1)
    normal=texture(g,data,infos[2],(128,128,255),size)*2-1
    normal[:,:,:2]*=(infos[2] or {}).get('scale',1)
    normal/=np.maximum(np.linalg.norm(normal,axis=2,keepdims=True),1e-8)
    return {'albedo':albedo,'arm':np.rint(arm*255).astype(np.uint8),'normal':np.rint((normal*.5+.5)*255).astype(np.uint8)}


def atlas_maps(tiles):
    # Shelf packing keeps small constant-color recipes tiny beside real scans.
    ordered=sorted(tiles,key=lambda i:(-tiles[i]['albedo'].shape[0],i))
    widths=[tiles[i]['albedo'].shape[1]+2*PAD for i in ordered]
    total=sum((t['albedo'].shape[0]+2*PAD)*(t['albedo'].shape[1]+2*PAD) for t in tiles.values())
    width=max(max(widths),int(math.ceil(math.sqrt(total))))
    positions={};x=y=row=0
    for i in ordered:
        h,w=tiles[i]['albedo'].shape[:2]
        if x+w+2*PAD>width:x=0;y+=row;row=0
        positions[i]=(x+PAD,y+PAD,w,h);x+=w+2*PAD;row=max(row,h+2*PAD)
    height=y+row
    if max(width,height)>8192:raise ValueError('Atlas exceeds bounded 8192-pixel source texture size')
    maps={channel:np.zeros((height,width,3),dtype=np.uint8) for channel in ('albedo','normal','arm')}
    for i,(x,y,w,h) in positions.items():
        for channel in maps:maps[channel][y-PAD:y+h+PAD,x-PAD:x+w+PAD]=np.pad(tiles[i][channel],((PAD,PAD),(PAD,PAD),(0,0)),mode='wrap')
    return maps,{i:[x/width,y/height,w/width,h/height] for i,(x,y,w,h) in positions.items()}


def batch(path,max_materials,max_primitives):
    g,data=load(path)
    records=[]
    for node in g['nodes']:
        if 'mesh' not in node:continue
        if any(k in node for k in ('matrix','translation','rotation','scale')):raise ValueError('Atlas requires baked section transforms')
        for p in g['meshes'][node['mesh']]['primitives']:
            if p.get('mode',4)!=4:raise ValueError('Atlas requires triangle primitives')
            records.append((node,p))
    used={p['material'] for _,p in records}
    groups={(p['material'],n.get('extras',{}).get('bz04Shadow','cast')) for n,p in records}
    if len(used)<=max_materials and len(groups)<=max_primitives:return None
    tiles={i:pbr_maps(g,data,g['materials'][i]) for i in used}
    # Structural surfaces keep their distinct approved world macro shaders.
    # Small craft materials have zero macro variation and can share this batch.
    candidates=sorted((i for i in used if not any(word in g['materials'][i]['name'].lower()
        for word in ('stone','plaster','lime','ochre','earth_red','trim','paving','flags'))),
        key=lambda i:(tiles[i]['albedo'].size,i))
    selected=set()
    for i in candidates:
        selected.add(i)
        result_groups={("atlas" if m in selected else m,s) for m,s in groups}
        if len(used)-len(selected)+1<=max_materials and len(result_groups)<=max_primitives:break
    if len(used)-len(selected)+1>max_materials or len(result_groups)>max_primitives:
        raise ValueError('Craft-only atlas cannot satisfy the frozen budget without changing structural shaders')
    maps,rectangles=atlas_maps({i:tiles[i] for i in selected})
    output=copy.deepcopy(g);output.update(bufferViews=[],accessors=[],buffers=[],images=[],textures=[],materials=[],meshes=[],nodes=[])
    binary=bytearray()
    def block(raw):
        binary.extend(b'\0'*((-len(binary))%4));offset=len(binary);binary.extend(raw)
        output['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(raw)})
        return len(output['bufferViews'])-1
    def accessor(array,kind):
        array=np.asarray(array,dtype='<u4' if kind=='indices' else '<f4')
        if array.ndim==1:array=array[:,None]
        entry={'bufferView':block(array.tobytes()),'componentType':5125 if kind=='indices' else 5126,'count':len(array),'type':{1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[array.shape[1]]}
        if kind=='POSITION':entry.update(min=array.min(axis=0).tolist(),max=array.max(axis=0).tolist())
        output['accessors'].append(entry);return len(output['accessors'])-1
    def add_image(raw,mime):
        output['images'].append({'bufferView':block(raw),'mimeType':mime})
        output['textures'].append({'source':len(output['images'])-1})
        return len(output['textures'])-1
    texture_cache={}
    def copy_texture(info):
        if not info:return
        old=info['index']
        if old not in texture_cache:
            source=g['textures'][old]['source'];image=g['images'][source]
            texture_cache[old]=add_image(image_bytes(g,data,source),image['mimeType'])
            if 'sampler' in g['textures'][old]:output['textures'][-1]['sampler']=g['textures'][old]['sampler']
        info['index']=texture_cache[old]
    material_map={}
    for i in sorted(used-selected):
        m=copy.deepcopy(g['materials'][i]);p=m.get('pbrMetallicRoughness',{})
        if m.get('name','').split('.')[0].startswith('ph_bz04_'):
            # Untouched pack bindings are restored by the existing runtime library.
            p.pop('baseColorTexture',None);p.pop('metallicRoughnessTexture',None)
            for key in ('normalTexture','occlusionTexture','emissiveTexture'):m.pop(key,None)
        for info in [p.get('baseColorTexture'),p.get('metallicRoughnessTexture'),m.get('normalTexture'),m.get('occlusionTexture'),m.get('emissiveTexture')]:copy_texture(info)
        material_map[i]=len(output['materials']);output['materials'].append(m)
    atlas_textures={}
    for channel,pixels in maps.items():
        stream=io.BytesIO();Image.fromarray(pixels).save(stream,format='PNG')
        atlas_textures[channel]=add_image(stream.getvalue(),'image/png')
    atlas_index=len(output['materials'])
    sources=[g['materials'][i] for i in sorted(selected)]
    output['materials'].append({'name':'bz04_pbr_atlas','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],
        'baseColorTexture':{'index':atlas_textures['albedo']},'metallicRoughnessTexture':{'index':atlas_textures['arm']},'metallicFactor':1,'roughnessFactor':1},
        'normalTexture':{'index':atlas_textures['normal']},'occlusionTexture':{'index':atlas_textures['arm']},
        'doubleSided':any(m.get('doubleSided',False) for m in sources),
        'extras':{'bz04Atlas':True,'bz04AtlasSources':sources,'bz04AtlasSize':[maps['albedo'].shape[1],maps['albedo'].shape[0]]}})
    for i in selected:material_map[i]=atlas_index
    grouped={}
    for node,p in records:grouped.setdefault((material_map[p['material']],node.get('extras',{}).get('bz04Shadow','cast')),[]).append(p)
    for (material,shadow),primitives in grouped.items():
        arrays={};indices=[];offset=0
        all_attributes=set().union(*(p['attributes'].keys() for p in primitives))
        if material==atlas_index:all_attributes.add('_BZ04_ATLAS')
        for p in primitives:
            count=g['accessors'][p['attributes']['POSITION']]['count']
            for semantic in sorted(all_attributes):
                if semantic=='_BZ04_ATLAS':array=np.tile(rectangles[p['material']],(count,1))
                elif semantic in p['attributes']:array=read_accessor(g,data,p['attributes'][semantic])
                elif semantic=='COLOR_0':array=np.ones((count,4))
                else:raise ValueError(f'Cannot invent missing vertex attribute {semantic}')
                if semantic=='COLOR_0' and array.shape[1]==3:array=np.column_stack((array,np.ones(count)))
                arrays.setdefault(semantic,[]).append(array)
            index=read_accessor(g,data,p['indices']).ravel() if 'indices' in p else np.arange(count)
            indices.append(index+offset);offset+=count
        attributes={k:accessor(np.concatenate(v),k) for k,v in arrays.items()}
        mesh=len(output['meshes']);output['meshes'].append({'primitives':[{'attributes':attributes,'indices':accessor(np.concatenate(indices),'indices'),'material':material,'mode':4}]})
        output['nodes'].append({'mesh':mesh,'name':output['materials'][material]['name']+'-'+shadow,'extras':{'bz04Shadow':shadow}})
    source_scene=g['scenes'][g.get('scene',0)]
    output['scenes']=[{'nodes':list(range(len(output['nodes']))),'extras':copy.deepcopy(source_scene.get('extras',{}))}];output['scene']=0
    output['scenes'][0]['extras']['bz04SourceMaterials']=[m['name'] for m in g['materials']]
    output['buffers']=[{'byteLength':len(binary)}]
    js=json.dumps(output,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary.extend(b'\0'*((-len(binary))%4))
    raw=struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
    path.write_bytes(raw)
    report={'sourceMaterials':[m['name'] for m in g['materials']],'batchedMaterials':[m['name'] for m in sources],
        'atlasSize':output['materials'][atlas_index]['extras']['bz04AtlasSize'],'materials':len(output['materials']),'primitives':len(output['meshes']),
        'triangles':sum(g['accessors'][p['indices']]['count']//3 for _,p in records)}
    if len(output['materials'])>max_materials or len(output['meshes'])>max_primitives:raise ValueError('Atlas failed frozen budget')
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('path',type=Path)
    parser.add_argument('--max-materials',type=int,required=True);parser.add_argument('--max-primitives',type=int,required=True)
    args=parser.parse_args();report=batch(args.path,args.max_materials,args.max_primitives)
    if report:args.path.with_suffix('.atlas.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report or {'status':'already within material/primitive budgets'}))
