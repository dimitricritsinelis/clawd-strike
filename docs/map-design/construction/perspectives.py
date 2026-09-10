#!/usr/bin/env python3
"""Document-only source geometry previews; run with Blender -b --python this-file -- --zones ... .

No GLB export, runtime installation or .blend save. Colors are diagram colors.
Every PNG carries its scope label; render-notes.json records camera/source/omissions.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from gen import local_opening_point, material_color

DEFAULT_ZONES = 'SPAWN_A_COURTYARD SPICE_STREET FOUNTAIN_COURT TEXTILE_ARCADE RUG_GATE SPAWN_B_COURTYARD CARAVAN_COURT TEA_TERRACE DYERS_ALLEY COVERED_SOUK DYERS_DOGLEG NORTH_COURT'.split()
MATERIALS = {}
COLORS = {}
OMITTED = set()
WALLS = []
CUTS = []


def material(key):
    color = key if key.startswith('#') else material_color(key, COLORS)
    if color not in MATERIALS:
        m = bpy.data.materials.new(color)
        rgb = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
        linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
        m.diffuse_color = (*linear, 1)
        m.use_nodes = True
        bs = m.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = (*linear, 1)
        bs.inputs['Roughness'].default_value = .85
        MATERIALS[color] = m
    return MATERIALS[color]


def mesh(name, vertices, faces, color):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    bm = bmesh.new(); bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data); bm.free()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material(color))
    return obj


def cloth_surface(name, vertices, segments, color, hem=False):
    """Thin scheduled membrane, not a solid overhead slab; 8 mm downward thickness."""
    n=len(vertices)
    points=[tuple(v) for v in vertices]+[(v[0],v[1],v[2]-.008) for v in vertices]
    faces=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(segments)]
    faces += [tuple(n+v for v in reversed(f)) for f in faces[:]]
    boundary=[0,1,*range(3,n,2),*range(n-2,0,-2)]
    faces += [(a,b,b+n,a+n) for a,b in zip(boundary,boundary[1:]+boundary[:1])]
    obj=mesh(name,points,faces,color)
    if hem:
        left,right=vertices[-2:]
        mesh(name+' bound front hem',[left,right,(right[0],right[1],right[2]-.025),(left[0],left[1],left[2]-.025)],[(0,1,2,3)],color)
    return obj


def prism(name, points, low, high, color, frame=None):
    # points are a planar polygon, extrusion is along its third coordinate.
    vertices = [(x, y, z) for z in (low, high) for x, y in points]
    if frame: vertices = [frame(*v) for v in vertices]
    n = len(points)
    faces = [tuple(reversed(range(n))), tuple(range(n, n*2))]
    faces += [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)]
    return mesh(name, vertices, faces, color)


def box(name, low, high, color):
    return prism(name, [(low[0],low[1]), (high[0],low[1]), (high[0],high[1]), (low[0],high[1])], low[2], high[2], color)


def solid(obj):
    bounds=tuple(tuple(func(v.co[i] for v in obj.data.vertices) for i in range(3)) for func in (min,max))
    WALLS.append((obj,bounds))
    return obj


def frame(face, plane):
    return lambda along,z,out: (*local_opening_point(face,plane,along,out),z)


def localbox(name, lo, hi, color, face, plane):
    return prism(name, [(lo[0],lo[2]),(hi[0],lo[2]),(hi[0],hi[2]),(lo[0],hi[2])],lo[1],hi[1],color,frame(face,plane))


def beam(name, start, end, thickness, color):
    delta = Vector(end)-Vector(start)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(Vector(start)+Vector(end))/2)
    ob=bpy.context.object;ob.name=name;ob.dimensions=(thickness,thickness,delta.length)
    ob.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    ob.data.materials.append(material(color));return ob


def unify_group(objects):
    if len(objects)<2:return
    palette=list(MATERIALS.values())
    for obj in objects:
        color=obj.data.materials[0];obj.data.materials.clear()
        for m in palette:obj.data.materials.append(m)
        for polygon in obj.data.polygons:polygon.material_index=palette.index(color)
    obj=objects[0]
    for other in objects[1:]:
        bpy.context.view_layer.objects.active=obj
        mod=obj.modifiers.new('Unify schematic component contacts','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=other
        bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(other,do_unlink=True)


def subtract(obj, cutter):
    CUTS.append(cutter)


def apply_cuts():
    # Drafting parcels and return assemblies overlap. Union their solid document
    # envelopes with one shared material table before recesses so coincident skins cannot self-shadow black.
    grouped={'source shells':list(WALLS)}
    palette=list(MATERIALS.values())
    for obj,bounds in WALLS:
        color=obj.data.materials[0]
        obj.data.materials.clear()
        for m in palette:obj.data.materials.append(m)
        for polygon in obj.data.polygons:polygon.material_index=palette.index(color)
    WALLS.clear()
    for items in grouped.values():
        obj,bounds=items[0]
        low=list(bounds[0]);high=list(bounds[1])
        for other,other_bounds in items[1:]:
            bpy.context.view_layer.objects.active=obj
            mod=obj.modifiers.new('Unify measured source envelopes','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=other
            bpy.ops.object.modifier_apply(modifier=mod.name)
            bpy.data.objects.remove(other,do_unlink=True)
            low=[min(low[i],other_bounds[0][i]) for i in range(3)];high=[max(high[i],other_bounds[1][i]) for i in range(3)]
        WALLS.append((obj,(low,high)))
    for cutter in CUTS:
        low=Vector(tuple(min(v.co[i] for v in cutter.data.vertices) for i in range(3)))
        high=Vector(tuple(max(v.co[i] for v in cutter.data.vertices) for i in range(3)))
        for obj, bounds in WALLS:
            if all(high[i]>bounds[0][i]+.0001 and low[i]<bounds[1][i]-.0001 for i in range(3)):
                apply_cut(obj,cutter)
        bpy.data.objects.remove(cutter,do_unlink=True)


def apply_cut(obj, cutter):
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new('Measured recess','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)


def profiles(o):
    x,w=o['alongM'],o['widthM'];b,h=o['sillM'],o['headM'];l,r=x-w/2,x+w/2
    shape=o.get('shopfront',{}).get('cavity',{}).get('frontProfile',o.get('headShape','rectangular'))
    if shape=='paired-pointed':
        n=o['lightCount'];pier=o['mullionM'];width=(w-(n-1)*pier)/n
        return [p for i in range(n) for p in profiles({**o,'headShape':'pointed','alongM':l+width/2+i*(width+pier),'widthM':width})]
    def bez(a,c,d):
        return [tuple((1-t)**2*a[j]+2*(1-t)*t*c[j]+t*t*d[j] for j in (0,1)) for t in [i/16 for i in range(17)]]
    if shape in ('pointed','pointed-arch','ogive'):
        s=b+(h-b)*o.get('archSpringRatio',.62);c=b+(h-b)*o.get('archControlRatio',.88)
        return [[(l,b)]+bez((l,s),(x-w*.22,c),(x,h))+bez((x,h),(x+w*.22,c),(r,s))[1:]+[(r,b)]]
    if shape in ('segmental','segmental-arch','arched'):
        s=b+(h-b)*.82
        return [[(l,b)]+bez((l,s),(x,2*h-s),(r,s))+[(r,b)]]
    if shape=='circular':return [[(x+w/2*math.cos(i*math.tau/48),(b+h)/2+(h-b)/2*math.sin(i*math.tau/48)) for i in range(48)]]
    if shape!='rectangular':raise ValueError('Unsupported opening profile: '+shape)
    return [[(l,b),(l,h),(r,h),(r,b)]]


def clip_axis(poly, axis, value, keep_greater):
    result=[]
    for i, current in enumerate(poly):
        previous=poly[i-1];inside=lambda p: (p[axis]>=value if keep_greater else p[axis]<=value)
        if inside(current)!=inside(previous):
            t=(value-previous[axis])/(current[axis]-previous[axis])
            result.append(tuple(previous[j]+t*(current[j]-previous[j]) for j in (0,1)))
        if inside(current):result.append(current)
    return result


def closure_detail(o, poly, face, plane, depth):
    profile=o.get('closureProfile',{});glazing=o.get('glazingProfile',{})
    left=min(p[0] for p in poly);right=max(p[0] for p in poly)
    top=profile.get('leafTopM',o['headM']);bottom=o['sillM'];out=-depth+.014
    # Every member remains clipped to the curved source aperture.
    def patch(name, l,r,b,t,color):
        points=poly
        for axis,value,greater in ((0,l,True),(0,r,False),(1,b,True),(1,t,False)):
            points=clip_axis(points,axis,value,greater)
            if not points:return
        if len(points)>2:prism(o['id']+name,points,out,out+.012,color,frame(face,plane))
    color=o.get('finishPaintSrgb') or o.get('closureMaterialId','#806b50')
    if o.get('slatPitchM') and not glazing:
        width=o['slatWidthM'];pitch=o['slatPitchM'];axis=left+pitch/2
        # Dark backing preserves the scheduled closed nonplayable receiver.
        prism(o['id']+' screen backing',poly,-depth+.009,-depth+.013,'#504b40',frame(face,plane))
        while axis<right:
            patch(' slat',axis-width/2,axis+width/2,bottom,o['headM'],color);axis+=pitch
    count=o.get('panelCount',o.get('finishLeafCount',1)) if o.get('headShape')!='paired-pointed' else 1
    width=o.get('panelMullionM',profile.get('stileWidthM',.055))
    for i in range(1,count):
        axis=left+(right-left)*i/count
        patch(' panel mullion',axis-width/2,axis+width/2,bottom,top,'#67513b')
    if glazing:
        # Glass is diagram color on the specified opaque backing, not transmitted light.
        start=glazing['fromZM'];columns=glazing.get('columnsPerLight',2);rows=glazing.get('rows',2);web=glazing.get('webM',.045)
        palette=glazing['paletteSrgb'];sequence=glazing.get('paletteSequence',list(range(len(palette))))
        for row in range(rows):
            for col in range(columns):
                l=left+(right-left)*col/columns+web/2;r=left+(right-left)*(col+1)/columns-web/2
                b=start+(o['headM']-start)*row/rows+web/2;t=start+(o['headM']-start)*(row+1)/rows-web/2
                patch(' schematic upper pane',l,r,b,t,palette[sequence[(row*columns+col)%len(sequence)]])
        OMITTED.add('Glazing web pattern simplified to clipped pane grid: '+o['id'])


def floor_z(a,x,y):
    f=a['floor']
    if f['kind']!='ramp':return f.get('elevationM',0)
    r=f.get('rect',a['rect']);axis=f['axis'];t=((x if axis=='x' else y)-r[axis])/r['w' if axis=='x' else 'h']
    return f['startElevationM']+(f['endElevationM']-f['startElevationM'])*t


def build_area(a):
    zone=a['zone'];r=a['rect'];f=a['floor']
    points=[(r['x'],r['y']),(r['x']+r['w'],r['y']),(r['x']+r['w'],r['y']+r['h']),(r['x'],r['y']+r['h'])]
    if f.get('visual_style')=='stairs':
        axis=f['axis'];k=0 if axis=='x' else 1
        segments=a.get('floorContactProfile',{}).get('segments')
        if not segments:raise ValueError('Missing exact stair contact profile: '+zone)
        for segment in segments:
            low=[r['x'],r['y'],min(f['startElevationM'],f['endElevationM'])-.1];high=[r['x']+r['w'],r['y']+r['h'],segment['topZM']]
            low[k],high[k]=segment['intervalM'];high[k]+=segment.get('nosingOverlapM',0)
            solid(box(zone+' source tread',low,high,a['floorMaterialId']))
    else:
        ground=prism(zone+' ground',points,-.1,max(floor_z(a,x,y) for x,y in points),a['floorMaterialId'])
        for vertex in list(ground.data.vertices)[4:]:vertex.co.z=floor_z(a,vertex.co.x,vertex.co.y)
        solid(ground)
    for face_doc in a['faces']:
        face=face_doc['face']
        for p in face_doc.get('parcels',[]):
            x0,y0,x1,y1=p['footprint'];top=p['wallTopM'];bottom=p['floorElevationM'];plane={'north':y0,'south':y1,'east':x0,'west':x1}[face]
            # The whole parcel volume closes returns and backs; each front cut is a real pocket.
            wall=box(p['id'],(x0,y0,bottom),(x1,y1,top),p['materialId'])
            wall['buildingId']=p.get('buildingId',p['id'])
            WALLS.append((wall,((x0,y0,bottom),(x1,y1,top))))
            if f['kind']=='ramp':
                for v in wall.data.vertices:
                    if abs(v.co.z-bottom)<.0001:v.co.z=floor_z(a,v.co.x,v.co.y)
            for o in p.get('openings',[]):
                depth=o.get('depthM',.3);shop=o.get('shopfront',{});cavity=shop.get('cavity',{})
                for poly in profiles(o):
                    cut=prism('cut',poly,-depth,.08,p['materialId'],frame(face,plane));subtract(wall,cut)
                    if not shop:
                        closure=o.get('finishPaintSrgb') or o.get('closureMaterialId', '#775f45')
                        prism(o['id']+' recessed closure',poly,-depth-.008,-depth+.008,closure,frame(face,plane))
                        closure_detail(o,poly,face,plane,depth)
                if cavity:
                    w=cavity['chamberWidthM'];z=o['sillM'];back=cavity['chamberBackOutM'];front=cavity['chamberFromOutM']+.002
                    cut=localbox('stock chamber',(o['alongM']-w/2,back,z),(o['alongM']+w/2,front,cavity['chamberCeilingM']),p['materialId'],face,plane);subtract(wall,cut)
                localbox(o['id']+' recess floor',(o['alongM']-o['widthM']/2,shop.get('backPlaneOutM',-depth),o['sillM']-.03),(o['alongM']+o['widthM']/2,0,o['sillM']),p['materialId'],face,plane)
                # Source opening profile stays visible around the closure. Fine craft is deliberately omitted.
            roof=p['roof'];cap=roof.get('capTopM',top+.2);slab=roof.get('slabTopM',top+.18);th=roof.get('parapetThicknessM',.16)
            solid(box(p['id']+' roof slab',(x0,y0,top),(x1,y1,slab),roof.get('materialIds',{}).get('slab',p['materialId'])))
            for lo,hi in [((x0,y0,slab),(x1,y0+th,cap)),((x0,y1-th,slab),(x1,y1,cap)),((x0,y0+th,slab),(x0+th,y1-th,cap)),((x1-th,y0+th,slab),(x1,y1-th,cap))]:
                if min(hi[i]-lo[i] for i in range(3))>0:solid(box(p['id']+' parapet',lo,hi,p['materialId']))
    for g in a.get('retainedGameplay',[]):
        poly=g.get('footprintPolygon');d=g.get('dimensionsM',{});pos=g.get('position',{})
        if poly and d.get('height'):prism('Baseline cover envelope '+g['id'],poly,pos.get('z',0),pos.get('z',0)+d['height'],'#969187')
    opening_index={o['id']:o for fa in a['faces'] for p in fa.get('parcels',[]) for o in p.get('openings',[])}
    for group in a.get('activityGroups',[]):
        opening=opening_index.get(group.get('receiverOpening'))
        if not opening:OMITTED.add('Activity group without opening frame: '+group['id']);continue
        face=group['receiverFace'];plane=opening['receiverPlaneM'];along=opening['alongM'];z=group['bbox']['min'][2]
        for part in group.get('instanceLayout',{}).get('parts',[]):
            lo,hi=part['localBox']['min'],part['localBox']['max'];lo=[lo[0]+along,lo[1],lo[2]+z];hi=[hi[0]+along,hi[1],hi[2]+z]
            color=part.get('stockColorSrgb') or part.get('materialId','#897154');kind=part['kind'];name=group['id']+':'+part['id']
            if any(token in kind for token in ('pot','bowl','cup','jar','vessel','bottle','canister','ceramic','sack','basket','rolled')):
                center=frame(face,plane)((lo[0]+hi[0])/2,(lo[2]+hi[2])/2,(lo[1]+hi[1])/2)
                bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,location=center)
                ob=bpy.context.object;ob.name=name;dx=hi[0]-lo[0];dy=hi[1]-lo[1];dz=hi[2]-lo[2]
                ob.dimensions=(dx,dy,dz) if face in ('north','south') else (dy,dx,dz);ob.data.materials.append(material(color))
            elif 'plant' in kind:OMITTED.add('Plant craft omitted: '+name)
            else:localbox(name,lo,hi,color,face,plane)
    for q in a.get('fixtures',[]):
        if q['kind']=='awning':
            l,r=q['interval'];face=q['receiverFace'];plane=q['wallPlaneM'];project=q['projectionM'];z=q['ledgerZ'];verts=[]
            for i in range(17):
                t=i/16;out=t*project;zz=z-q['dropM']*t-q.get('sagM',0)*math.sin(math.pi*t)
                verts.extend([frame(face,plane)(l,zz,out),frame(face,plane)(r,zz,out)])
            cloth_surface(q['id']+' cloth',verts,16,q.get('stockColorSrgb',q['materialId']),hem=True)
            beam(q['id']+' ledger',frame(face,plane)(l,z,0),frame(face,plane)(r,z,0),.07,'#806b50')
            for axis in q['armAxesM']:
                beam(q['id']+' arm',frame(face,plane)(axis,z,0),frame(face,plane)(axis,z-q['dropM'],project),.07,'#806b50')
                if any(part['id'].startswith('arm-knee') for part in q.get('assemblyParts', [])):
                    run=.30;tip_z=z-q['dropM']*run/project
                    beam(q['id']+' knee',frame(face,plane)(axis,tip_z-.30,0),frame(face,plane)(axis,tip_z,run),.07,'#806b50')
        elif q['kind']=='canopy':
            start,end=Vector(q['endA']),Vector(q['endB']);delta=end-start;side=Vector((-delta.y,delta.x,0)).normalized()*q['widthM']/2;verts=[]
            for i in range(25):
                t=i/24;v=start+delta*t;v.z-=q.get('sagM',0)*4*t*(1-t);verts.extend([v-side,v+side])
            cloth_surface(q['id'],verts,24,q.get('stockColorSrgb',q['materialId']))
            for part in q.get('assemblyParts',[]):
                if 'ledger' in part['id']:box(part['id'],part['bbox']['min'],part['bbox']['max'],'#806b50')
        else:OMITTED.add('Unsupported fixture '+q['id'])
    for q in a.get('facadeFeatures',[]):
        before=set(bpy.data.objects);build_feature(q)
        unify_group([obj for obj in bpy.data.objects if obj not in before and obj.type=='MESH'])
    for q in a.get('landmarks',[]):build_landmark(q)
    for item in a.get('landscapeElements',[]):OMITTED.add('Landscape omitted, not relocated: '+item.get('id','unnamed'))


def build_landmark(q):
    if 'innerArchProfile' not in q:
        OMITTED.add('Unsupported landmark: '+q['id']);return
    p=q['innerArchProfile'];name=q['id'];low=q['bbox']['min'];high=q['bbox']['max']
    def bez(a,b,c):
        return [tuple((1-t)**2*a[j]+2*t*(1-t)*b[j]+t*t*c[j] for j in (0,1)) for t in [i/p['segmentsPerHalf'] for i in range(p['segmentsPerHalf']+1)]]
    curve=bez(p['leftSpring'],p['leftControl'],p['crown'])+bez(p['crown'],p['rightControl'],p['rightSpring'])[1:]
    fr=lambda along,z,depth:(along,depth,z)
    solid(prism(name+' spandrel',curve+[(p['rightSpring'][0],q['capTopM']),(p['leftSpring'][0],q['capTopM'])],low[1],high[1],q['materialId'],fr))
    for i,pier in enumerate(q['piers']):solid(box(name+' pier '+str(i),pier['bbox']['min'],pier['bbox']['max'],q['materialId']))
    outer=[]
    for i,(x,z) in enumerate(curve):
        before=curve[max(0,i-1)];after=curve[min(len(curve)-1,i+1)];dx=after[0]-before[0];dz=after[1]-before[1];length=math.hypot(dx,dz)
        outer.append((x-dz/length*p['ringThicknessM'],z+dx/length*p['ringThicknessM']))
    solid(prism(name+' measured arch ring',curve+outer[::-1],low[1]-.002,high[1]+.002,q['trimMaterialId'],fr))
    accent=q.get('accent',{});b=accent.get('bounds')
    if b:
        # The source places its readable inlay on the north face. Do not duplicate it south.
        bpy.ops.object.text_add(location=((b['min'][0]+b['max'][0])/2,b['max'][1]+.002,(b['min'][2]+b['max'][2])/2))
        text=bpy.context.object;text.name=name+' source inlay';text.data.body=accent['text'];text.data.align_x='CENTER';text.data.align_y='CENTER';text.data.size=.25;text.data.materials.append(material(accent['colorSrgb']))
        bpy.context.view_layer.update();text.scale.x=(b['max'][0]-b['min'][0])/text.dimensions.x;text.scale.y=(b['max'][2]-b['min'][2])/text.dimensions.y;text.rotation_euler=(math.pi/2,0,math.pi)


def build_feature(q):
    name=q['id'];kind=q['kind'];face=q['receiverFace'];plane=q['wallPlaneM'];color=q.get('finishPaintSrgb') or q.get('materialId','#806b50')
    l=q['alongM']-q['widthM']/2;r=l+q['widthM'];out=q['outM'];z=q['zM']
    if kind in ('screened-balcony','supported-shallow-balcony'):
        if kind=='supported-shallow-balcony':
            d=q['deck'];l,r=d['alongBoundsM'];b,t=d['bottomZM'],d['topZM'];front=q['balustrade']['frontOutM'];rail_top=q['balustrade']['zM'][1]
        else:b,t=z[0]+.12,z[0]+.3;front=out[1]-.035;rail_top=4.45
        localbox(name+' deck',(l,out[0],b),(r,out[1],t),color,face,plane)
        for axis in (l+.06,r-.06):
            beam(name+' post',frame(face,plane)(axis,t,front),frame(face,plane)(axis,z[1] if kind=='screened-balcony' else rail_top,front),.07,color)
            beam(name+' bracket',frame(face,plane)(axis,z[0],0),frame(face,plane)(axis,b,front),.08,color)
        for zz in (t+.05,rail_top-.035):beam(name+' rail',frame(face,plane)(l,zz,front),frame(face,plane)(r,zz,front),.07,color)
        n=max(2,int((r-l)/.14))
        for i in range(1,n):beam(name+' infill',frame(face,plane)(l+(r-l)*i/n,t+.05,front),frame(face,plane)(l+(r-l)*i/n,rail_top,front),.025,color)
        if kind=='screened-balcony':localbox(name+' canopy',(l,out[0],z[1]-.12),(r,out[1],z[1]),color,face,plane)
    elif kind=='draped-rug':
        path=q['foldPathOutZ'];verts=[frame(face,plane)(a,zz,o) for o,zz in path for a in (l,r)]
        mesh(name,verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(path)-1)],'#936658')
    elif kind=='recessed-field':OMITTED.add('Inset finish field omitted: '+name)
    elif kind=='inscribed-panel':
        # Source inset lettering is represented by its colored face only.
        localbox(name,(l,out[1]+.001,z[0]),(r,out[1]+.003,z[1]),color,face,plane)
    elif kind in ('timber-hood','hoist','gallery-sill'):
        box(name,q['bbox']['min'],q['bbox']['max'],color)
    else:OMITTED.add('Unsupported feature: '+name+' ('+kind+')')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--zones',nargs='+',default=DEFAULT_ZONES)
    parser.add_argument('--output',type=Path,default=ROOT.parents[2]/'artifacts/bazaar-r6-design-review/perspectives')
    parser.add_argument('--design',type=Path,default=ROOT/'design.json')
    parser.add_argument('--view-id',help='Exact criticalViews id; single zone only')
    parser.add_argument('--samples',type=int,default=24)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    raw=args.design.read_bytes();design=json.loads(raw);COLORS.update(design['materials']);areas={a['zone']:a for a in design['areas']}
    for z in args.zones:
        if z not in areas:raise ValueError('Unknown zone '+z)
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    # Build only requested districts and adjacent source districts; distant skyline is intentionally omitted.
    selected=[]
    for a in design['areas']:
        r=a['rect']
        if any(not(r['x']>areas[z]['rect']['x']+areas[z]['rect']['w']+8 or r['x']+r['w']<areas[z]['rect']['x']-8 or r['y']>areas[z]['rect']['y']+areas[z]['rect']['h']+8 or r['y']+r['h']<areas[z]['rect']['y']-8) for z in args.zones):selected.append(a)
    for a in selected:build_area(a)
    apply_cuts()
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=args.samples;scene.cycles.seed=0;scene.cycles.use_denoising=True
    scene.world.color=(.7,.7,.7);scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.78,.86,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
    bpy.ops.object.light_add(type='SUN',location=(0,0,30));sun=bpy.context.object;sun.rotation_euler=(.45,-.35,-.45);sun.data.energy=2.2;sun.data.angle=.2
    bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera
    scene.view_settings.view_transform='Standard';scene.render.image_settings.file_format='PNG';scene.render.resolution_percentage=100
    args.output.mkdir(parents=True,exist_ok=True)
    notes={'label':'Schematic design perspective - not an in-game render','revision':design['issue']['revision'],'designSha256':hashlib.sha256(raw).hexdigest(),'renderEngine':'Cycles CPU','samples':args.samples,'diagramLayerSeparationM':0.003,'clothThicknessM':0.008,'awningHemDepthM':0.025,'scheduledKneeRunRiseM':0.30,'includedZones':[a['zone'] for a in selected],'views':[], 'limitations':['Plain parcel diagram colors; material-region bands, source scan textures, weathering, lettering except the gateway inlay, metal hardware, fine carving and exact lattice/glazing web patterns are omitted.','Stock uses bounded schematic silhouettes; ceramics, vessels and rolls are simplified ellipsoids.','Baseline retained cover is a neutral oriented source envelope, not the installed mesh.','Roof slabs and perimeter parapets are schematic parcel envelopes; coordinated roof falls, collectors and hidden room partitions are omitted.','Nearby source districts are included for physical occlusion; distant skyline and background landscape are omitted. Balcony members and stock are schematic, not construction craft approval.']}
    for zone in args.zones:
        views=areas[zone]['criticalViews']
        if args.view_id:view=next(v for v in views if v['id']==args.view_id)
        elif zone=='FOUNTAIN_COURT':view=next(v for v in views if v['id']=='FOUNTAIN_COURT-west-F_W_HALL-s1-base')
        else:
            focus_face={'SPAWN_A_COURTYARD':'south','SPICE_STREET':'west','FOUNTAIN_COURT':'west','TEXTILE_ARCADE':'east','RUG_GATE':'north','SPAWN_B_COURTYARD':'north','CARAVAN_COURT':'west','TEA_TERRACE':'east','DYERS_ALLEY':'east','COVERED_SOUK':'east','DYERS_DOGLEG':'east','NORTH_COURT':'west'}.get(zone,'north')
            view=next((v for v in views if v['targetFace']==focus_face and v['id'].endswith('-base')),next(v for v in views if v['id'].endswith('travel-forward')))
        pos=view.get('designPosition',view['position']);yaw=math.radians(view['yawDeg']);pitch=math.radians(view['pitchDeg'])
        direction=Vector((-math.sin(yaw)*math.cos(pitch),-math.cos(yaw)*math.cos(pitch),math.sin(pitch)))
        camera.location=pos;camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();camera.data.type='PERSP';camera.data.sensor_fit='VERTICAL';camera.data.angle_y=math.radians(view['verticalFovDeg']);camera.data.clip_start=.03;camera.data.clip_end=250
        scene.render.resolution_x,scene.render.resolution_y=view['resolution']
        scene.render.use_stamp=True;scene.render.use_stamp_note=True;scene.render.stamp_note_text=zone+' | Schematic design perspective - not an in-game render | '+design['issue']['revision'];scene.render.stamp_font_size=18
        for prop in ('date','time','render_time','frame','scene','camera','filename','marker','hostname','memory'):setattr(scene.render,'use_stamp_'+prop,False)
        scene.render.filepath=str(args.output/(zone.lower()+'.png'));bpy.ops.render.render(write_still=True)
        caption = f"{zone} | {view['id']} | design XYZ ({', '.join(f'{v:.3f}' for v in pos)}) m | yaw {view['yawDeg']:.2f}°, pitch {view['pitchDeg']:.2f}°, vertical FOV {view['verticalFovDeg']:.2f}° | {view['resolution'][0]} × {view['resolution'][1]} px"
        (args.output/(zone.lower()+'.caption.txt')).write_text(caption+'\nSchematic design perspective; not an in-game render.\n')
        notes['views'].append({'caption':caption,'captionFile':zone.lower()+'.caption.txt','resolution':view['resolution'],'zone':zone,'id':view['id'],'position':pos,'yawDeg':view['yawDeg'],'pitchDeg':view['pitchDeg'],'verticalFovDeg':view['verticalFovDeg'],'file':zone.lower()+'.png','sourceFrameLimitations':view.get('frameLimitations'),'cameraOverride':False})
    notes['sourceSpecificOmissions']=sorted(OMITTED)
    (args.output/'render-notes.json').write_text(json.dumps(notes,indent=2)+'\n')
    print('Document perspectives:',args.output)


if __name__=='__main__':main()
