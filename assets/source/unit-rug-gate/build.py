"""Build the approved R7 Rug Gate frontage and retain its installed LM-01 portal.

The shared B geometry helpers and Spawn A receiver-shell builder are reused.
Roof bundles and cap retirement remain the whole-map integrator's responsibility.
"""
from pathlib import Path
import argparse
import copy
import hashlib
import importlib.util
import json
import runpy
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
UNIT = 'unit-rug-gate'
PART_KINDS = {'grounded-counter-carcass','timber-member','bound-hanging-rug','horizontal-rolled-rug'}
G = None
SHELL = None


def digest(saved):
    inputs={k:v for k,v in saved.items() if k not in {'source','designSha256','reading','inputSha256'}}
    return hashlib.sha256(json.dumps(inputs,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def validate_handoff(saved,current=None):
    if saved.get('unit')!=UNIT or len(saved.get('areas',[]))!=1:
        raise ValueError('Expected the exact Rug Gate handoff')
    if digest(saved)!=saved.get('inputSha256'):
        raise ValueError('Frozen handoff contents do not match inputSha256')
    current=current or runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract'](UNIT)
    if current['inputSha256']!=saved['inputSha256']:
        raise ValueError('Area inputs changed since handoff extraction')
    area=saved['areas'][0]
    if area['zone']!='RUG_GATE' or not area['designRevision']['id'].startswith('R7'):
        raise ValueError('Expected the approved R7 Rug Gate issue')
    supported={'openingProfiles':{'rectangular'},'openingCraftProfiles':{'carved-timber-portal'},'glazingPatterns':set(),'featureKinds':set(),'landscapeKinds':set(),'partKinds':PART_KINDS,
               'craftRecipes':{'CF-COUNTER','CF-ENVELOPE','CF-FLOOR','CF-JOINT','CF-OPEN','CF-R4-PORTAL','CF-RUG','CF-SHADE','CF-TIMBER'}}
    for key,allowed in supported.items():
        missing=set(saved['requiredCapabilities'][key])-allowed
        if missing:raise ValueError(f'Unsupported {key}: {sorted(missing)}')
    for face in area['faces']:
        for parcel in face['parcels']:
            for opening in parcel['openings']:
                trim=opening.get('trimWidthM',.1)
                if not parcel['interval'][0]<=opening['alongM']-opening['widthM']/2-trim<opening['alongM']+opening['widthM']/2+trim<=parcel['interval'][1]:
                    raise ValueError('Opening exceeds its receiver: '+opening['id'])
    return area


def geometry(saved):
    global G,SHELL
    def module(name,path):
        spec=importlib.util.spec_from_file_location(name,path);value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
    G=module('rug_gate_geometry',ROOT/'assets/source/unit-spawn-b-courtyard/build.py')
    G.D=saved;G.A=saved['areas'][0];G.PARCELS={p['id']:p for f in G.A['faces'] for p in f['parcels']};G.OUT=OUT;G.FROZEN_INPUT_SHA=saved['inputSha256']
    SHELL=module('rug_gate_receiver_shells',ROOT/'assets/source/unit-spawn-a-courtyard/build.py');SHELL.G=G
    return G


def opening(face,plane,o,trim,back):
    if o.get('finishMaterialProfile')=='warmTimber':o=dict(o,closureMaterialId=G.WOOD)
    G.opening(face,plane,o,trim,back)
    detail=o.get('architecturalDetail',{})
    if detail.get('profile')!='carved-timber-portal':return
    # The shared nested jamb bands cover the existing lozenge surfaces. Cut
    # their exact diamond footprints so the authored slope and 6 mm floor show.
    carving=detail['carving'];width=detail['surroundWidthM'];front=o.get('frontProjectionM',.08)
    half=o['widthM']/2;cutters=[]
    for center in (o['alongM']-half-width/2,o['alongM']+half+width/2):
        z=o['sillM']+.18+carving['moduleHeightM']/2
        while z+carving['moduleHeightM']/2<=G.arch_points(o)[0][1]-.18:
            w=carving['moduleWidthM']/2;h=carving['moduleHeightM']/2
            cutters.append(G.prism_profile(o['id']+'-band-cutter',face,plane,
                [(center,z-h),(center+w,z),(center,z+h),(center-w,z)],
                front-carving['incisionDepthM']-.001,front+.001,detail['frameMaterialId']))
            z+=carving['modulePitchM']
    G.bpy.ops.object.select_all(action='DESELECT')
    for ob in cutters:ob.select_set(True)
    G.bpy.context.view_layer.objects.active=cutters[0];G.bpy.ops.object.join();cutter=G.bpy.context.object
    for ob in list(G.bpy.context.scene.objects):
        if not ob.name.startswith(o['id']+'-portal-jamb-band'):continue
        G.prepare_mesh(ob)
        G.bpy.context.view_layer.objects.active=ob
        modifier=ob.modifiers.new('Expose scheduled lozenge incision','BOOLEAN')
        modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
        G.bpy.ops.object.modifier_apply(modifier=modifier.name)
    G.bpy.data.objects.remove(cutter,do_unlink=True)
    # Staff-side opening returns use a different shared branch; match the
    # recessed receiving plane already used by the opposite carved jamb.
    for ob in list(G.bpy.context.scene.objects):
        if ob.name.startswith(o['id']+'-right-return-front') or ob.name.startswith(o['id']+'-left-return-front'):
            for vertex in ob.data.vertices:
                if abs(vertex.co.x-(plane+front-G.ORIGIN[0]))<1e-6:vertex.co.x-=.025
    clear_flat_band_overlaps(o,face,plane)


def clear_flat_band_overlaps(o,face,plane):
    """Give the existing flat band tops sole ownership of their visible plane."""
    from mathutils import Vector
    assert face in {'west','north'},'Only the installed Rug and B merchant portals use this correction'
    l=o['alongM']-o['widthM']/2;r=o['alongM']+o['widthM']/2;front=o.get('frontProjectionM',.08)
    strips=[]
    for offset in (.012,.059):
        # The prepared bands keep their 3 mm eased arrises. Only the flat top
        # overlaps the underlying jamb/lozenge corner fields.
        strips.extend([(l-offset-.035+.003,l-offset-.003),(r+offset+.003,r+offset+.035-.003)])
    surface=Vector(G.local(G.coords(face,plane,0,front,0)))
    outward=Vector(G.local(G.coords(face,plane,0,front+1,0)))-surface
    def along(point):return G.ORIGIN[1]-point[0].y if face=='west' else G.ORIGIN[0]+point[0].x
    def clip(poly,cut,sign):
        result=[]
        for p,q in zip(poly,poly[1:]+poly[:1]):
            a=(along(p)-cut)*sign;b=(along(q)-cut)*sign
            if a>=-1e-8:result.append(p)
            if (a>=0)!=(b>=0):
                t=a/(a-b);result.append((p[0].lerp(q[0],t),p[1].lerp(q[1],t)))
        return result
    for ob in list(G.bpy.context.scene.objects):
        suffix=ob.name.removeprefix(o['id']+'-')
        if not (suffix=='portal-jamb' or suffix.startswith('portal-jamb.') or suffix.startswith('lozenge-incision')):continue
        old=ob.data;polygons=[]
        for polygon in old.polygons:
            poly=[(old.vertices[old.loops[i].vertex_index].co.copy(),old.uv_layers.active.data[i].uv.copy()) for i in polygon.loop_indices]
            pieces=[poly]
            if all(abs((point-surface).dot(outward))<1e-6 for point,uv in poly):
                for lo,hi in strips:
                    pieces=[piece for current in pieces for piece in (clip(current,lo,-1),clip(current,hi,1)) if len(piece)>=3]
            polygons.extend(pieces)
        vertices=[];faces=[];uvs=[]
        for poly in polygons:
            faces.append(tuple(range(len(vertices),len(vertices)+len(poly))))
            vertices.extend(tuple(point) for point,uv in poly);uvs.extend(tuple(uv) for point,uv in poly)
        mesh=G.bpy.data.meshes.new(ob.name+'-single-front');mesh.from_pydata(vertices,[],faces);mesh.update()
        for material in old.materials:mesh.materials.append(material)
        uv=mesh.uv_layers.new()
        for index,value in enumerate(uvs):uv.data[index].uv=value
        ob.data=mesh


def shade(fixture):
    G.awning(fixture)
    for ob in G.bpy.context.scene.objects:
        if not ob.name.startswith(fixture['id']+'-cloth'):continue
        # The existing 25 mm border grid forms a bound edge. Depress only the
        # inner top surface 1 mm, retaining the original membrane silhouette.
        for index,vertex in enumerate(ob.data.vertices):
            if index<153 and index%17 not in (0,16) and index//17 not in (0,8):vertex.co.z-=.001


def craft_fixture(area):
    from mathutils import Vector
    face=next(f for f in area['faces'] if f['face']=='west')
    parcel=next(p for p in face['parcels'] if p['id']=='R_W_MERCHANT')
    shop=next(o for o in parcel['openings'] if o['kind']=='shop')
    opening(face['face'],face['wallPlaneM'],shop,parcel['trimMaterialId'],parcel['materialId'])
    detail=shop['architecturalDetail'];carving=detail['carving'];front=shop['frontProjectionM']
    x=shop['alongM']-shop['widthM']/2-detail['surroundWidthM']/2
    z=shop['sillM']+.18+carving['moduleHeightM']/2
    surface=Vector(G.local(G.coords(face['face'],face['wallPlaneM'],x,front,z)))
    start=Vector(G.local(G.coords(face['face'],face['wallPlaneM'],x,front+.02,z)))
    direction=(surface-start).normalized();hits=[]
    for ob in G.bpy.context.scene.objects:
        if ob.type!='MESH' or not ob.name.startswith(shop['id']+'-'):continue
        G.prepare_mesh(ob)
        hit,p,n,i=ob.ray_cast(start,direction,distance=.08)
        if hit:hits.append(((p-surface).dot(direction),ob.name))
    depth,name=min(hits)
    print('CARVING RAY',depth,name,flush=True)
    assert abs(depth-carving['incisionDepthM'])<1e-5,('Carved lozenge obstructed',depth,name)
    objects=[ob for ob in G.bpy.context.scene.objects if ob.type=='MESH' and ob.name.startswith(shop['id']+'-')]
    for ob in objects:G.prepare_mesh(ob)
    probes=0
    for x in (shop['alongM']-shop['widthM']/2-.07,shop['alongM']+shop['widthM']/2+.0668):
        for z in (.205,1.713,1.75,2.413):
            surface=Vector(G.local(G.coords(face['face'],face['wallPlaneM'],x,front,z)))
            start=Vector(G.local(G.coords(face['face'],face['wallPlaneM'],x,front+.02,z)))
            direction=(surface-start).normalized();depths=[]
            for ob in objects:
                hit,point,normal,index=ob.ray_cast(start,direction,distance=.08)
                if hit:depths.append(((point-surface).dot(direction),ob.name))
            assert depths,('Missing portal surface',x,z)
            nearest=min(depth for depth,name in depths)
            visible=[name for depth,name in depths if abs(depth-nearest)<1e-5]
            assert len(visible)==1,('Duplicate visible portal surfaces',x,z,visible)
            probes+=1
    print('PASS carved portal:',probes,'incision and flat-field rays have one visible surface each',flush=True)
    window=next(o for o in parcel['openings'] if o['kind']=='window')
    opening(face['face'],face['wallPlaneM'],window,parcel['trimMaterialId'],parcel['materialId'])
    frame=G.bpy.data.objects[window['id']+'-frame-jamb']
    assert frame.data.materials[0]==G.mat(G.WOOD)
    for fixture in area['fixtures']:
        shade(fixture)
        objects=[o for o in G.bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(fixture['id']+'-')]
        assert sum('-arm' in o.name for o in objects)==2 and sum('-knee' in o.name for o in objects)==2
        for ob in objects:
            for vertex in ob.data.vertices:
                world=(G.ORIGIN[0]+vertex.co.x,G.ORIGIN[1]-vertex.co.y,G.ORIGIN[2]+vertex.co.z)
                box=fixture['clothBbox'] if '-cloth' in ob.name else fixture['bbox']
                assert all(box['min'][i]-.001<=world[i]<=box['max'][i]+.001 for i in range(3)),('shade envelope',ob.name,world)
        cloth=next(o for o in objects if '-cloth' in o.name)
        assert abs(cloth.data.vertices[1].co.z-(fixture['ledgerZ']))<1e-5
        assert cloth.data.color_attributes.get('COLOR_0') is not None
        assert abs(abs(cloth.data.vertices[1].co.y-cloth.data.vertices[0].co.y)-.025)<1e-5
        assert abs(cloth.data.vertices[18].co.z-cloth.data.vertices[171].co.z-.007)<1e-5
        for ob in objects:
            if '-arm' not in ob.name and '-knee' not in ob.name:continue
            xs=[G.ORIGIN[0]+v.co.x for v in ob.data.vertices]
            assert min(xs)<=fixture['wallPlaneM']<=max(xs),'Shade support loses wall contact'

    print('PASS Rug Gate craft: recessed carved jamb, calibrated timber, complete shade arms/knees, membrane bounds and bound edge',flush=True)


def validate_parts(area):
    import bpy
    bpy.context.view_layer.update()
    for group in area['activityGroups']:
        for item in group['instanceLayout']['parts']:
            prefix=group['id']+'-'+item['id']
            objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(prefix)]
            assert objects,('missing scheduled rug stock',prefix)
            if item['kind']=='bound-hanging-rug':
                assert any('-bound-edge' in o.name for o in objects),('missing bound border',prefix)
                assert len([o for o in objects if '-tie' in o.name])==2,('missing rail ties',prefix)
            if item['kind']=='horizontal-rolled-rug':
                assert len([o for o in objects if '-rolled-edge' in o.name])==2,('missing visible rolled ends',prefix)
        lo,hi=group['bbox']['min'],group['bbox']['max']
        for ob in bpy.context.scene.objects:
            if ob.type!='MESH' or not ob.name.startswith(group['id']):continue
            for vertex in ob.data.vertices:
                point=ob.matrix_world@vertex.co
                world=(G.ORIGIN[0]+point.x,G.ORIGIN[1]-point.y,G.ORIGIN[2]+point.z)
                assert all(lo[i]-.001<=world[i]<=hi[i]+.001 for i in range(3)),('stock envelope',ob.name,world,lo,hi)


def retained_portal():
    """Check bytes and dimensions before declaring the unchanged portal reusable."""
    path=OUT/'bz04-rug-gate.glb'
    report=json.loads(path.with_suffix('.inspection.json').read_text())
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    assert report['sha256']==digest,'Retained portal differs from its inspection record'
    expected=G.A['landmarks'][0]['bbox'];origin=G.A['landmarks'][0]['position'];bounds=report['actualBoundsGltf']
    actual={'min':[origin[0]+bounds['min'][0],origin[1]+bounds['min'][2],origin[2]+bounds['min'][1]],'max':[origin[0]+bounds['max'][0],origin[1]+bounds['max'][2],origin[2]+bounds['max'][1]]}
    assert all(abs(actual[k][i]-expected[k][i])<.001 for k in ['min','max'] for i in range(3)),('portal envelope changed',actual,expected)
    return {'asset':str(path.relative_to(ROOT)),'sha256':digest,'bounds':actual,'state':'retained installed geometry; matched-game finish review remains required'}


def mask_portal_inlay(ob,accent):
    """Remove only north-face masonry inside the exact flush inlay rectangle."""
    lo,hi=accent['bounds']['min'],accent['bounds']['max'];old=ob.data;polygons=[]
    def clip(poly,axis,value,sign):
        result=[]
        for p,q in zip(poly,poly[1:]+poly[:1]):
            a=(p[0][axis]-value)*sign;b=(q[0][axis]-value)*sign
            if a>=-1e-8:result.append(p)
            if (a>=0)!=(b>=0):
                t=a/(a-b);result.append((p[0].lerp(q[0],t),p[1].lerp(q[1],t)))
        return result
    for polygon in old.polygons:
        poly=[(old.vertices[old.loops[i].vertex_index].co.copy(),old.uv_layers.active.data[i].uv.copy()) for i in polygon.loop_indices]
        if not all(abs(point.y-(G.ORIGIN[1]-hi[1]))<1e-6 for point,uv in poly):
            polygons.append(poly);continue
        remaining=poly
        for axis,value,sign in [(0,lo[0]-G.ORIGIN[0],1),(0,hi[0]-G.ORIGIN[0],-1),(2,lo[2]-G.ORIGIN[2],1),(2,hi[2]-G.ORIGIN[2],-1)]:
            outside=clip(remaining,axis,value,-sign) if remaining else []
            if len(outside)>=3:polygons.append(outside)
            remaining=clip(remaining,axis,value,sign) if remaining else []
    vertices=[];faces=[];uvs=[]
    for poly in polygons:
        faces.append(tuple(range(len(vertices),len(vertices)+len(poly))))
        vertices.extend(tuple(point) for point,uv in poly);uvs.extend(tuple(uv) for point,uv in poly)
    mesh=G.bpy.data.meshes.new(ob.name+'-inlay-mask');mesh.from_pydata(vertices,[],faces);mesh.update()
    for material in old.materials:mesh.materials.append(material)
    uv=mesh.uv_layers.new()
    for index,value in enumerate(uvs):uv.data[index].uv=value
    ob.data=mesh


def portal_visibility_fixture(landmark):
    from mathutils import Vector
    objects=[ob for ob in G.bpy.context.scene.objects if ob.type=='MESH']
    accent=landmark['accent'];lo,hi=accent['bounds']['min'],accent['bounds']['max']
    def hits_at(x,z):
        start=Vector(G.local((x,hi[1]+.05,z)));hits=[]
        for ob in objects:
            hit,point,normal,index=ob.ray_cast(start,Vector((0,1,0)),distance=.10)
            if hit:hits.append((point.y-start.y,ob.name))
        return sorted(hits)
    for x in (lo[0]+.08,hi[0]-.08):
        hits=hits_at(x,(lo[2]+hi[2])/2)
        assert hits and hits[0][1]=='LM01-inlay',('Flush inlay hidden by masonry',hits)
    inlay=G.bpy.data.objects['LM01-inlay'];paint=tuple(G._linear_channel(int(accent['colorSrgb'][i:i+2],16)) for i in (1,3,5))
    assert all(max(abs(c.color[i]-paint[i]) for i in range(3))<1e-6 for c in inlay.data.color_attributes['COLOR_0'].data)
    title=G.bpy.data.objects['LM01-title'];title.data.calc_loop_triangles();visible=0
    front=min(v.co.y for v in title.data.vertices)
    for tri in title.data.loop_triangles:
        points=[title.data.vertices[i].co for i in tri.vertices]
        if not all(abs(p.y-front)<1e-6 for p in points):continue
        center=sum(points,Vector())/3;hits=hits_at(G.ORIGIN[0]+center.x,G.ORIGIN[2]+center.z)
        assert hits and hits[0][1]=='LM01-title',('North title is obscured',hits)
        assert len([name for depth,name in hits if abs(depth-hits[0][0])<1e-5])==1,'Duplicate title-plane surface'
        visible+=1
    assert visible>=10,'No readable front letter faces'
    print('PASS LM01 north visibility: exposed teal inset and',visible,'letter-face rays; no duplicate south label',flush=True)


def portal(saved, export=True):
    """Retain LM-01's shape while applying the approved materials and inset name."""
    validate_handoff(saved);geometry(saved)
    G.D=dict(saved,landmarks=G.A['landmarks'])
    original_text=G.text;original_mesh=G.mesh;original_export=G.export
    def inscription(name,label,face,plane,along,out,z,width,height):
        # The old lettering projected 1.3 mm beyond the exact landmark envelope.
        # Its extrusion now lies behind the approved outer face.
        return original_text(name,label,face,plane,along,-.0017,z,width,height)
    def mesh(name,*args,**kwargs):
        ob=original_mesh(name,*args,**kwargs)
        accent=G.A['landmarks'][0]['accent']
        if name=='LM01-inlay':
            # Seat the label on this 2 mm recessed face, entirely inside the
            # existing flush patch and the landmark's north envelope.
            for vertex in ob.data.vertices:
                if abs(vertex.co.y-(G.ORIGIN[1]-accent['bounds']['max'][1]))<1e-6:vertex.co.y+=.002
            G.paint_object(ob,accent['colorSrgb'])
        elif name.startswith(('LM01-ring-','LM01-spandrel-','LM01-shoulder')):
            mask_portal_inlay(ob,accent)
        return ob
    def verify_export(path,bounds,triangles,primitives,extras=None):
        import bpy
        landmark=G.A['landmarks'][0]
        for ob in list(bpy.context.scene.objects):
            if ob.type!='MESH':continue
            G.prepare_mesh(ob)
            for vertex in ob.data.vertices:
                world=(G.ORIGIN[0]+vertex.co.x,G.ORIGIN[1]-vertex.co.y,G.ORIGIN[2]+vertex.co.z)
                assert all(landmark['bbox']['min'][i]-.001<=world[i]<=landmark['bbox']['max'][i]+.001 for i in range(3)),('portal target bounds',ob.name,world)
        portal_visibility_fixture(landmark)
        if export:return original_export(path,bounds,triangles,primitives,extras)
    G.text=inscription;G.mesh=mesh;G.export=verify_export
    G.gateway()
    G.text=original_text;G.mesh=original_mesh;G.export=original_export
    if export:return retained_portal()


def build(saved):
    area=validate_handoff(saved);geometry(saved)
    origin=area['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ['x','y','z']))
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    interfaces['install'](G,area,additional_units={
        'unit-rug-gate':None,'unit-link-east-upper':{'leu-n'},'unit-link-north-east':{'lne-w'},
        'unit-link-west-upper':{'lwu-s'},'unit-tea-stairs':{'ts-e'},
        'unit-tea-terrace':{'tt-rug-return'},'unit-spawn-b-courtyard':{'B_S_EAST','B_S_WEST'}})
    from integrate_bz04 import load_handoff
    landing=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map/unit-tea-landing/handoff.json')['areas'][0]
    landing_face,landing_wall=next((f,p) for f in landing['faces'] for p in f['parcels'] if p['id']=='tl-n')
    assert landing_face['face']=='north'
    link=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map/unit-link-west-upper/handoff.json')['areas'][0]
    link_face,link_wall=next((f,p) for f in link['faces'] for p in f['parcels'] if p['id']=='lwu-n')
    assert link_face['face']=='north' and link_face['wallPlaneM']==landing_face['wallPlaneM']
    assert link_wall['interval'][0]==landing_wall['interval'][1]
    assert all(link_wall[k]==landing_wall[k] for k in ('floorElevationM','wallTopM'))
    # These adjoining recessed boundary fields jointly own the lower front.
    receiver_interval=(landing_wall['interval'][0],link_wall['interval'][1])
    north_west=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map/unit-link-north-west/handoff.json')['areas'][0]
    west_face,west_wall=next((f,p) for f in north_west['faces'] for p in f['parcels'] if p['id']=='lnw-e')
    assert west_face['face']=='east'
    shared_part=G.part
    def landing_part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        if name=='R_W_ABUTMENT-back':
            assert face=='west' and abs(plane+lo[1]-west_face['wallPlaneM'])<1e-8
            result=None
            for a,b in interfaces['difference'](lo,hi,(west_wall['interval'][0],lo[1],west_wall['floorElevationM']),
                    (west_wall['interval'][1],hi[1],west_wall['wallTopM'])):
                result=shared_part(face,plane,name,a,b,mid,shadow,bevel)
            return result
        if name!='R_W_ABUTMENT-end-closure' or abs(lo[0]-landing_face['wallPlaneM'])>1e-8:
            return shared_part(face,plane,name,lo,hi,mid,shadow,bevel)
        assert face=='west'
        result=None
        for a,b in interfaces['difference'](lo,hi,(lo[0],receiver_interval[0]-plane,landing_wall['floorElevationM']),
                (hi[0],receiver_interval[1]-plane,landing_wall['wallTopM'])):
            result=shared_part(face,plane,name,a,b,mid,shadow,bevel)
        return result
    G.part=landing_part
    SHELL.build_shells(area,opening)
    G.part=shared_part
    # The abutment's narrow end cap also yields to the link corner pier.
    import bmesh
    for ob in [o for o in G.bpy.context.scene.objects if o.name=='R_W_ABUTMENT-end-closure' or o.name.startswith('R_W_ABUTMENT-end-closure.')]:
        bm=bmesh.new();bm.from_mesh(ob.data)
        def on_link(face):
            points=[(v.co.x+G.ORIGIN[0],G.ORIGIN[1]-v.co.y,v.co.z+G.ORIGIN[2]) for v in face.verts]
            return all(abs(p[0]-west_face['wallPlaneM'])<1e-5 and west_wall['interval'][0]-1e-5<=p[1]<=west_wall['interval'][1]+1e-5 for p in points)
        caps=[f for f in bm.faces if on_link(f)]
        if caps:
            cap_geometry=list(set(caps+[e for f in caps for e in f.edges]+[v for f in caps for v in f.verts]))
            bmesh.ops.bisect_plane(bm,geom=cap_geometry,dist=1e-6,plane_co=(0,0,west_wall['wallTopM']-G.ORIGIN[2]),plane_no=(0,0,1))
            hidden=[f for f in bm.faces if on_link(f) and max(v.co.z+G.ORIGIN[2] for v in f.verts)<=west_wall['wallTopM']+1e-5]
            if hidden:bmesh.ops.delete(bm,geom=hidden,context='FACES_ONLY')
        bm.to_mesh(ob.data);bm.free()
    for group in area['activityGroups']:G.activity(group)
    for fixture in area['fixtures']:shade(fixture)
    validate_parts(area)
    portal=retained_portal()
    G.export(OUT/(UNIT+'.glb'),area['exportBoundsGltfLocal'],area['budget']['maxTriangles'],area['budget']['maxRenderedPrimitives'],{'bz04InputSha256':saved['inputSha256'],'bz04DesignRevision':area['designRevision']['id']})
    report=G.REPORT[-1];report['retainedPortal']=portal
    (OUT/(UNIT+'.inspection.json')).write_text(json.dumps(report,indent=2)+'\n')


def input_fixture(saved):
    validate_handoff(saved)
    for mutation in [lambda v:v.update(unit='wrong-unit'),lambda v:v['areas'][0].update(floorMaterialId='tampered')]:
        bad=copy.deepcopy(saved);mutation(bad)
        try:validate_handoff(bad,saved)
        except ValueError:pass
        else:raise AssertionError('Invalid frozen handoff accepted')
    bad=copy.deepcopy(saved);bad['requiredCapabilities']['partKinds'].append('unknown-part');bad['inputSha256']=digest(bad)
    try:validate_handoff(bad,bad)
    except ValueError as error:assert 'Unsupported partKinds' in str(error)
    else:raise AssertionError('Unknown part silently accepted')
    print('PASS Rug Gate input fixtures: issue identity, tamper rejection and explicit capability coverage')


def self_test(saved):
    input_fixture(saved);geometry(saved)
    origin=G.A['sectionOriginDesign'];G.reset(tuple(origin[k] for k in ['x','y','z']))
    for group in G.A['activityGroups']:G.activity(group)
    validate_parts(G.A);craft_fixture(G.A);portal(saved,export=False)
    print('PASS Rug Gate geometry fixtures: exact stock count, bound rugs, receiver ties, rolled ends and corrected portal target envelope')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['build','portal','self-test','input-fixture'],nargs='?',default='build')
    parser.add_argument('--handoff',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    saved=json.loads(args.handoff.read_text())
    {'build':build,'portal':portal,'self-test':self_test,'input-fixture':input_fixture}[args.mode](saved)
