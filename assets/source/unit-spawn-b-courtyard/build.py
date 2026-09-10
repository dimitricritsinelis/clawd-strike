"""Deterministic BZ-04 courtyard trial, including its explicitly scheduled dependencies.

Run with Blender -b --factory-startup --python this-file. All measurements come
from the controlled design. No gameplay data or user's live scene is written.
"""
from pathlib import Path
import sys, json, math, hashlib, tempfile, struct
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'assets/source'))
from facade_materials import material as pack_material, world_uv, _linear_channel
from facade_kit import _strip_pack_images
D = json.loads((ROOT/'docs/map-design/construction/design.json').read_text())
R = json.loads((ROOT/'docs/map-design/construction/roof-coordination.json').read_text())
A = next(a for a in D['areas'] if a['zone']=='SPAWN_B_COURTYARD')
OUT = Path(__file__).resolve().parent
PARCELS = {p['id']:p for a in D['areas'] for f in a['faces'] for p in f['parcels']}
ORIGIN = (17,78,0)
MATS = {}
REPORT = []
WOOD='ph_bz04_weathered_brown_planks'
IRON='ph_bz04_rusty_metal_02'
TRIM='ph_bz04_stone_trim_sandstone'


def reset(origin):
    global ORIGIN
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    ORIGIN=origin
    for key in list(bpy.context.scene.keys()):
        if key.startswith("bz04"):del bpy.context.scene[key]
    # Export strips pack image nodes. Rebuild material graphs for the next asset.
    from facade_materials import _CACHE
    _CACHE.clear();MATS.clear()
    for m in list(bpy.data.materials):
        if m.users==0:bpy.data.materials.remove(m)


def mat(mid):
    if mid in MATS:return MATS[mid]
    if mid.startswith('ph_bz04_'):m=pack_material(mid)
    elif mid=='bz04_large_sandstone_blocks_01':
        from facade_materials import _ENTRIES
        import copy
        e=D['materials'][mid];manifest=ROOT/e['manifest'];entry=copy.deepcopy(next(v for v in json.loads(manifest.read_text())['materials'] if v['id']==mid))
        for tier in entry['textures'].values():
            for key,path in tier.items():tier[key]=str((manifest.parent/path).resolve())
        _ENTRIES[mid]=entry;m=pack_material(mid);del _ENTRIES[mid]
    else:
        m=bpy.data.materials.new(mid);m.use_nodes=True;b=m.node_tree.nodes['Principled BSDF']
        e=D['materialRuntimeContract']['embeddedDetailBindings']
        colors={'bz04_ceramic_project_original':'#c5a37c','bz04_brass_project_original':'#8f7750','bz04_plant_project_original':'#738565','bz04_soil_project_original':'#6c5a45','bz04_teal_timber_project_original':'#4e7973','bz04_sign_cream':'#eadfc6'}
        color=colors.get(mid,'#547d77').lstrip('#')
        b.inputs['Base Color'].default_value=(*[_linear_channel(int(color[i:i+2],16)) for i in (0,2,4)],1)
        b.inputs['Roughness'].default_value={'bz04_ceramic_project_original':.77,'bz04_brass_project_original':.48,'bz04_plant_project_original':.9,'bz04_soil_project_original':1}.get(mid,.86)
        b.inputs['Metallic'].default_value=.72 if 'brass' in mid else 0
        if mid=='bz04_teal_timber_project_original':
            src=pack_material('ph_bz04_rough_pine_door');bpy.data.materials.remove(m);m=src.copy();m.name=mid
            binding=e['closureMaterials'][mid];bsdf=m.node_tree.nodes['Principled BSDF']
            for link in list(bsdf.inputs['Metallic'].links):m.node_tree.links.remove(link)
            bsdf.inputs['Metallic'].default_value=binding['metalness']
            roughness=next(n for n in m.node_tree.nodes if n.type=='MATH' and n.operation=='MULTIPLY')
            roughness.inputs[1].default_value=binding['roughness']
            tint=m.node_tree.nodes.get('Mix')
            if tint:tint.inputs[7].default_value=(*[_linear_channel(int(color[i:i+2],16)) for i in (0,2,4)],1)
        if mid=='bz04_levantine_rug_project_original' or mid.startswith('bz04_large_'):
            if 'rug' in mid:
                path=ROOT/'apps/client/public/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg';tile=1.2
            else:
                e=D['materials'][mid];path=ROOT/Path(e['manifest']).parent/e['textures']['albedo'];tile=e['tileSizeM']
                b.inputs['Base Color'].default_value=(1,1,1,1)
            tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path),check_existing=True);tex.image.pack();m.node_tree.links.new(tex.outputs['Color'],b.inputs['Base Color']);m['tileSizeM']=tile
    MATS[mid]=m;return m


def local(p):return (p[0]-ORIGIN[0],-(p[1]-ORIGIN[1]),p[2]-ORIGIN[2])


def mesh(name, vertices, faces, mid, shadow='cast', smooth=False):
    me=bpy.data.meshes.new(name);me.from_pydata([local(p) for p in vertices],[],[tuple(reversed(f)) for f in faces]);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(mat(mid));ob['bz04Shadow']=shadow;ob['bz04Target']=name
    world_uv(ob,float(mat(mid).get('tileSizeM',2)))
    if mid in [WOOD,'ph_bz04_dark_wood','ph_bz04_worn_planks','bz04_teal_timber_project_original'] and 'B-STAR' not in name:
        # The brown/dark scans run along U; pine/teal and worn planks run along V.
        lengths=[max(v.co[i] for v in me.vertices)-min(v.co[i] for v in me.vertices) for i in range(3)]
        along=max(range(3),key=lambda i:lengths[i]);tile=float(mat(mid).get('tileSizeM',2))
        for polygon in me.polygons:
            normal=max(range(3),key=lambda i:abs(polygon.normal[i]))
            across=next(i for i in range(3) if i!=along and i!=normal) if normal!=along else (along+1)%3
            for loop in polygon.loop_indices:
                point=me.vertices[me.loops[loop].vertex_index].co
                uv=(point[along]/tile,point[across]/tile)
                me.uv_layers.active.data[loop].uv=uv if mid in [WOOD,'ph_bz04_dark_wood'] else uv[::-1]
    if smooth:
        for p in me.polygons:p.use_smooth=True
    return ob


def box(name, lo, hi, mid, shadow='cast', bevel=0):
    x,y,z=lo;X,Y,Z=hi
    assert X>x and Y>y and Z>z,(name,lo,hi)
    v=[(x,y,z),(X,y,z),(X,Y,z),(x,Y,z),(x,y,Z),(X,y,Z),(X,Y,Z),(x,Y,Z)]
    ob=mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mid,shadow)
    if bevel:
        mod=ob.modifiers.new('Dressed arris','BEVEL');mod.width=min(bevel,(X-x)/4,(Y-y)/4,(Z-z)/4);mod.segments=1
    return ob


def coords(face,plane,a,o,z):
    return {'north':(a,plane-o,z),'south':(a,plane+o,z),'east':(plane-o,a,z),'west':(plane+o,a,z)}[face]


def part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
    points=[coords(face,plane,a,o,z) for a in (lo[0],hi[0]) for o in (lo[1],hi[1]) for z in (lo[2],hi[2])]
    return box(name,[min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)],mid,shadow,bevel)


def member(name,p,q,width,mid,shadow='cast'):
    p,q=Vector(p),Vector(q);axis=(q-p).normalized();u=axis.cross(Vector((0,0,1)))
    if u.length<.01:u=axis.cross(Vector((0,1,0)))
    u.normalize();v=axis.cross(u).normalized();verts=[tuple(c+u*s*width/2+v*t*width/2) for c in (p,q) for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    return mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mid,shadow)


def ring(name,face,plane,a,o,z,r,mid=IRON):
    verts=[];faces=[]
    for i in range(16):
        t=2*math.pi*i/16
        for j in range(4):
            u=2*math.pi*j/4;rr=r+.006*math.cos(u)
            verts.append(coords(face,plane,a+rr*math.cos(t),o+.006*math.sin(u),z+rr*math.sin(t)))
    for i in range(16):
        for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,((i+1)%16)*4+(j+1)%4,((i+1)%16)*4+j))
    mesh(name,verts,faces,mid,'receive',True)


def arch_points(o):
    a=o['alongM'];w=o['widthM'];s=o['sillM'];h=o['heightM'];shape=o.get('headShape','rectangular')
    l=a-w/2;r=a+w/2
    if shape=='rectangular':return [(l,s+h),(r,s+h)]
    spring=s+h*o.get('archSpringRatio',.82 if shape=='segmental' else .74)
    if shape=='segmental':curves=[((l,spring),(a,2*(s+h)-spring),(r,spring))]
    else:curves=[((l,spring),(a-.22*w,s+h*o.get('archControlRatio',.92)),(a,s+h)),((a,s+h),(a+.22*w,s+h*o.get('archControlRatio',.92)),(r,spring))]
    points=[]
    for start,control,end in curves:
        for i in range(13):
            if points and i==0:continue
            t=i/12;points.append(tuple((1-t)**2*start[j]+2*t*(1-t)*control[j]+t*t*end[j] for j in range(2)))
    return points


def offset_top(points,distance):
    # Intersect adjacent normal-offset segments for a constant-width surround.
    result=[]
    for i,p in enumerate(points):
        tangents=[]
        for j in [max(0,i-1),min(i,len(points)-2)]:
            v=Vector(points[j+1])-Vector(points[j]);v.normalize();tangents.append(Vector((-v.y,v.x)))
        n=tangents[0]+tangents[1];n.normalize();result.append(tuple(Vector(p)+n*(distance/max(.1,n.dot(tangents[0])))))
    return result


def prism_profile(name,face,plane,poly,back,front,mid,shadow='cast'):
    from mathutils.geometry import tessellate_polygon
    n=len(poly);verts=[coords(face,plane,x,out,z) for out in [back,front] for x,z in poly]
    vectors=[Vector((x,z,0)) for x,z in poly]
    triangles=[list(t) for t in tessellate_polygon([vectors])]
    faces=[tuple(reversed(t)) for t in triangles]+[tuple(i+n for i in t) for t in triangles]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,mid,shadow)


def clipped_panel(name,face,plane,top,x0,x1,z0,z1,back,front,mid,shadow='cast'):
    poly=[(top[0][0],z0),(top[-1][0],z0)]+list(reversed(top))
    for axis,value,sign in [(0,x0,1),(0,x1,-1),(1,z0,1),(1,z1,-1)]:
        output=[]
        for p,q in zip(poly,poly[1:]+poly[:1]):
            a=(p[axis]-value)*sign;b=(q[axis]-value)*sign
            if a>=-1e-9:output.append(p)
            if (a>=0)!=(b>=0):
                t=a/(a-b);output.append(tuple(p[j]+t*(q[j]-p[j]) for j in range(2)))
        poly=output
        if len(poly)<3:return
    cleaned=[]
    for p in poly:
        if not cleaned or (Vector(p)-Vector(cleaned[-1])).length>1e-7:cleaned.append(p)
    if len(cleaned)>2:prism_profile(name,face,plane,cleaned,back,front,mid,shadow)


def shaped_opening(face,plane,o,trim,back):
    name=o['id'];a=o['alongM'];w=o['widthM'];s=o['sillM'];h=o['heightM'];dep=o['depthM'];front=o.get('frontProjectionM',.08);l=a-w/2;r=a+w/2;top=arch_points(o)
    outer=offset_top(top,.10);inner=offset_top(top,-.08)
    def b(n,lo,hi,m=trim,shadow='cast'):return part(face,plane,name+'-'+n,lo,hi,m,shadow)
    # The shaped hole and barrel are built from the same sampled profile.
    for i,(p,q) in enumerate(zip(top,top[1:])):
        P,Q=outer[i],outer[i+1]
        prism_profile(name+'-arch-surround',face,plane,[p,q,Q,P],-.02,front if front>0 else 0,trim) if front>0 else prism_profile(name+'-arch-surround',face,plane,[p,q,Q,P],-.10,0,trim)
        # Fill the shell above the outer normal offset, never leave a rectangular hole.
        ceiling=s+h+.12
        prism_profile(name+'-spandrel',face,plane,[P,Q,(Q[0],ceiling),(P[0],ceiling)],-.02,0,back)
        barrel=.30 if o.get('galleryLight') else dep
        mesh(name+'-barrel',[coords(face,plane,x,out,z) for out in [-barrel,0] for x,z in [p,q]],[(0,1,3,2)],trim)
        prism_profile(name+'-frame-head',face,plane,[inner[i],inner[i+1],q,p],-dep+.015,-dep+.04,o['closureMaterialId'])
    for L,H in [(l-.1,l),(r,r+.1)]:b('jamb',(L,-dep,s),(H,front,s+h*.74 if o.get('headShape')!='segmental' else top[0][1]))
    # Narrow fields between outer arch endpoint and the rectangular partition edge.
    for edge,limit in [(outer[0],l-.1),(outer[-1],r+.1)]:
        x0,x1=sorted([edge[0],limit])
        if x1-x0>1e-6:b('shoulder',(x0,-.02,edge[1]),(x1,0,s+h+.12),back)
    b('back',(l-.1,-dep-.02,s),(r+.1,-dep,s+h+.12),back)
    if o.get('galleryLight'):
        b('ceiling',(l,-dep,s+h),(r,-.30,s+h+.02),back)
    b('sill',(l-.1,-dep,max(-.02,s-.06)),(r+.1,front,s),trim)
    c=-dep+.04;wood=o['closureMaterialId']
    for x in [l,r-.08]:b('frame-jamb',(x,c-.025,s),(x+.08,c,s+min(h,top[0][1]-s)),wood)
    if 'slat' in o.get('closure',''):
        pitch=o.get('slatPitchM',.16);width=o.get('slatWidthM',.035)
        for i in range(math.ceil(w/pitch)):
            x=l+.08+i*pitch
            clipped_panel(name+'-vertical-slat',face,plane,inner,x,min(x+width,r-.08),s+.08,s+h,c-.025,c,wood,'receive')
        b('frame-bottom',(l,c-.025,s),(r,c,s+.08),wood)
    else:
        for i in range(8):
            x=l+i*w/8
            clipped_panel(name+'-leaf',face,plane,inner,x+.001,x+w/8-.001,s+.01,s+h,-.09,-.05,wood)
        for z in [s+.45,s+h-.35]:
            for L,H in [(l+.04,a-.02),(a+.02,r-.04)]:
                clipped_panel(name+'-strap',face,plane,inner,L,H,z,z+.05,-.05,-.036,IRON,'receive')
        for x in [a-.20,a+.20]:ring(name+'-ring',face,plane,x,-.021,s+1.05,.045)
        b('threshold',(l-.1,-dep,-.02),(r+.1,front,.01),trim)


def star_screen(name,face,plane,lo,hi,out,mid):
    from mathutils.geometry import delaunay_2d_cdt
    strips=[]
    def strip(p,q):
        p,q=Vector(p),Vector(q);v=(q-p).normalized();n=Vector((-v.y,v.x))*.011
        poly=[tuple(p+n),tuple(q+n),tuple(q-n),tuple(p-n)]
        for axis,value,sign in [(0,lo[0],1),(0,hi[0],-1),(1,lo[1],1),(1,hi[1],-1)]:
            result=[]
            for p,q in zip(poly,poly[1:]+poly[:1]):
                a=(p[axis]-value)*sign;b=(q[axis]-value)*sign
                if a>=0:result.append(p)
                if (a>=0)!=(b>=0):
                    t=a/(a-b);result.append(tuple(p[j]+t*(q[j]-p[j]) for j in range(2)))
            poly=result
            if len(poly)<3:return
        strips.append(poly)
    for i in range(math.ceil((hi[0]-lo[0])/.4)):
        for j in range(math.ceil((hi[1]-lo[1])/.4)):
            x=lo[0]+.2+i*.4;z=lo[1]+.2+j*.4
            points=[(x+(.16 if k%2==0 else .08)*math.cos(k*math.pi/8),z+(.16 if k%2==0 else .08)*math.sin(k*math.pi/8)) for k in range(16)]
            for p,q in zip(points,points[1:]+points[:1]):strip(p,q)
            for k in [0,4,8,12]:strip(points[k],(x+.2*math.cos(k*math.pi/8),z+.2*math.sin(k*math.pi/8)))
    vs=[];polys=[]
    for poly in strips:
        polys.append(list(range(len(vs),len(vs)+len(poly))));vs.extend(Vector(p) for p in poly)
    def inside(point):
        x,y=point
        for poly in strips:
            signs=[]
            for p,q in zip(poly,poly[1:]+poly[:1]):signs.append((q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0]))
            if min(signs)>=-1e-9 or max(signs)<=1e-9:return True
        return False
    vertices,_,faces,_,_,_=delaunay_2d_cdt(vs,[],polys,0,1e-7,False)
    faces=[f for f in faces if inside(sum((vertices[i] for i in f),Vector((0,0)))/len(f))]
    counts={}
    for f in faces:
        for a,b in zip(f,f[1:]+f[:1]):counts.setdefault(tuple(sorted((a,b))),[]).append((a,b))
    boundary=[pair[0] for pair in counts.values() if len(pair)==1]
    # Re-triangulate only the union boundary. Original strip intersections are
    # not constraints on its planar faces and need not survive into the mesh.
    neighbors={}
    for a,b in boundary:
        neighbors.setdefault(a,[]).append(b);neighbors.setdefault(b,[]).append(a)
    loops=[];remaining=set(tuple(sorted(e)) for e in boundary)
    while remaining:
        a,b=next(iter(remaining));loop=[a];prev=a;cur=b;remaining.remove(tuple(sorted((a,b))))
        while cur!=loop[0]:
            loop.append(cur);nxt=next(n for n in neighbors[cur] if n!=prev and tuple(sorted((cur,n))) in remaining)
            remaining.remove(tuple(sorted((cur,nxt))));prev,cur=cur,nxt
        clean=[]
        for j,i in enumerate(loop):
            before=(vertices[i]-vertices[loop[j-1]]).normalized();after=(vertices[loop[(j+1)%len(loop)]]-vertices[i]).normalized()
            if before.dot(after)<math.cos(.005):clean.append(i)
        if len(clean)>=3:loops.append(clean)
    points=[];edges=[]
    for loop in loops:
        start=len(points);points.extend(vertices[i] for i in loop)
        edges.extend((start+j,start+(j+1)%len(loop)) for j in range(len(loop)))
    vertices,_,faces,_,_,_=delaunay_2d_cdt(points,edges,[],0,1e-7,False)
    faces=[f for f in faces if inside(sum((vertices[i] for i in f),Vector((0,0)))/len(f))]
    n=len(vertices);counts={}
    for f in faces:
        for a,b in zip(f,f[1:]+f[:1]):counts.setdefault(tuple(sorted((a,b))),[]).append((a,b))
    side=[(a,b,b+n,a+n) for pair in counts.values() if len(pair)==1 for a,b in pair]
    ob=mesh(name,[coords(face,plane,v.x,o,v.y) for o in [out-.0125,out+.0125] for v in vertices],[tuple(reversed(f)) for f in faces]+[tuple(i+n for i in f) for f in faces]+side,mid,'receive')
    ob['b04PlanarUnionArea']=sum(abs((vertices[f[1]]-vertices[f[0]]).cross(vertices[f[2]]-vertices[f[0]]))*.5 for f in faces)


def facade_feature(f):
    face=f['receiverFace'];plane=f['wallPlaneM'];name=f['id'];a=f['alongM'];l=a-f['widthM']/2;r=a+f['widthM']/2;mid=f['materialId'];z,Z=f['zM'];o,O=f['outM']
    def b(n,lo,hi):return part(face,plane,name+'-'+n,lo,hi,mid)
    def beam(n,p,q,w):return member(name+'-'+n,coords(face,plane,*p),coords(face,plane,*q),w,mid)
    if f['kind']=='screened-balcony':
        b('deck',(l,-.18,3.26),(r,.75,3.4))
        for x in [a-.9,a+.9]:
            b('joist',(x-.07,-.18,3.12),(x+.07,.75,3.26))
            beam('knee',(x,-.02,3.155),(x,.55,3.225),.07)
        for x in [a-1.27,a+1.27]:
            for out in [0,.71]:b('corner-post',(x-.04,out-.04,3.4),(x+.04,out+.04,6.05))
        b('middle-post',(a-.04,.67,3.4),(a+.04,.75,4.45))
        for zz in [3.435,4.415]:
            b('front-rail',(l,.675,zz-.035),(r,.745,zz+.035))
            for x in [a-1.27,a+1.27]:b('side-rail',(x-.035,-.04,zz-.035),(x+.035,.675,zz+.035))
        for L,H in [(a-1.23,a-.04),(a+.04,a+1.23)]:star_screen(name+'-B-STAR-front',face,plane,(L,3.47),(H,4.38),.71,mid)
        for x in [a-1.27,a+1.27]:star_screen(name+'-B-STAR-side','east',x,(91.33,3.47),(91.96,4.38),0,mid)
        b('canopy',(l,-.18,6.05),(r,.78,6.2))
    elif f['kind']=='timber-hood':
        b('canopy',(l,o,Z-.08),(r,O,Z));b('fascia',(l,O-.08,Z-.12),(r,O,Z-.08))
        for x in [l+.12,r-.12]:
            b('bracket',(x-.035,o,Z-.15),(x+.035,O-.08,Z-.08));beam('knee',(x,-.02,z+.025),(x,.2,Z-.12),.04)
    elif f['kind']=='hoist':
        b('beam',(l,o,6.06),(r,O,6.24));beam('knee',(a,0,6.0),(a,.35,6.09),.06)
        verts=[coords(face,plane,a+t,.5+.08*math.cos(i*math.pi/16),6.04+.08*math.sin(i*math.pi/16)) for t in [-.03,.03] for i in range(32)]
        mesh(name+'-pulley',verts,[tuple(reversed(range(32))),tuple(range(32,64))]+[(i,(i+1)%32,(i+1)%32+32,i+32) for i in range(32)],mid)
    elif f['kind']=='gallery-sill':b('sill',(l,o,z),(r,O,Z))
    elif f['kind']=='recessed-field':
        b('plaster-back',(l,-.10,z),(r,-.06,Z))
        for L,H in [((l,-.06,z),(l+.02,0,Z)),((r-.02,-.06,z),(r,0,Z)),((l,-.06,z),(r,0,z+.02)),((l,-.06,Z-.02),(r,0,Z))]:part(face,plane,name+'-reveal',L,H,PARCELS[f['receiverParcel']]['materialId'])


def opening(face,plane,o,trim,back):
    if o.get("headShape","rectangular")!="rectangular":
        return shaped_opening(face,plane,o,trim,back)
    name=o['id'];a=o['alongM'];w=o['widthM'];s=o['sillM'];h=o['heightM'];top=s+h;dep=o['depthM'];l=a-w/2;r=a+w/2;kind=o['kind'];wood=o['closureMaterialId']
    j=.10
    front=o.get('frontProjectionM',.08)
    def b(n,lo,hi,m=trim,shadow='cast',bevel=0):return part(face,plane,name+'-'+n,lo,hi,m,shadow,bevel)
    # The receiving chamber remains opaque; its returns physically reach the back.
    b('back',(l-.02,-dep-.02,s),(r+.02,-dep,top+.02),back,bevel=0)
    staff=o.get('shopfront',{}).get('staffAccess')
    for side,al,ar in [('left',l-j,l),('right',r,r+j)]:
        if staff and staff['type']=='side-door' and abs(staff['localClearBox']['min'][0]+a-(l if side=='left' else r))<.08:
            q=staff['localClearBox'];d0=q['min'][1];d1=q['max'][1];zt=s+.04+2.1
            b(side+'-return-back',(al,-dep,s),(ar,d0,top));b(side+'-return-front',(al,d1,s),(ar,front,top));b(side+'-return-head',(al,d0,zt),(ar,d1,top))
            leaf_center=a+(q['min'][0]+q['max'][0])/2
            b('closed-staff-leaf',(leaf_center-.0175,d0,s+.04),(leaf_center+.0175,d1,zt),WOOD,bevel=.003)
            for out in [d0-.05,d1]:b('staff-jamb',(leaf_center-.025,out,s+.04),(leaf_center+.025,out+.05,zt+.05),WOOD,bevel=0)
            b('staff-head',(leaf_center-.025,d0,zt),(leaf_center+.025,d1,zt+.05),WOOD,bevel=0)
            for z in [s+.35,s+1.75]:b('staff-hinge',(leaf_center-.021,d0+.03,z),(leaf_center+.021,d0+.13,z+.025),IRON,'receive',0)
            b('staff-latch',(leaf_center-.024,d1-.15,s+1.015),(leaf_center+.024,d1-.06,s+1.065),IRON,'receive',0)
        else:b(side+'-return',(al,-dep,s),(ar,front,top),trim)
    b('head',(l-j,-dep,top),(r+j,front,top+j),WOOD if kind=='shop' else trim)
    if kind=='door':
        b('threshold',(l-j,-dep,-.02),(r+j,front,.01))
        for i in range(8):
            x=l+i*w/8;b('leaf-'+str(i),(x+.001,-.09,s+.015),(x+w/8-.001,-.05,top-.01),wood,bevel=.003)
        for z in [.45,h-.35]+([h*.5] if o['assemblyId']=='SD-06' else []):
            for x0,x1 in [(l+.04,a-.02),(a+.02,r-.04)]:b('strap',(x0,-.05,s+z),(x1,-.036,s+z+.05),IRON,'receive',0)
        for x in [a-.20,a+.20]:ring(name+'-ring',face,plane,x,-.021,s+1.05,.045)
    elif kind=='shop' or o.get('flushBase'):
        b('deck',(l,-dep,0),(r,0 if face=='north' else .20,.04),trim)
    else:
        b('sill',(l-j,-dep,s-.06),(r+j,front,s),trim)
        c=-dep+.04
        # B-OPEN: an 80 mm perimeter frame and the scheduled plain closure.
        for x in [l,r-.08]:b('frame-stile',(x,c-.025,s),(x+.08,c,top),wood)
        for z in [s,top-.08]:b('frame-rail',(l+.08,c-.025,z),(r-.08,c,z+.08),wood)
        if 'louver' in o.get('closure',''):
            panels=o.get('panelCount',2);mullion=o.get('panelMullionM',.03)
            clear=(w-.16-(panels-1)*mullion)/panels
            for panel in range(panels):
                x0=l+.08+panel*(clear+mullion);x1=x0+clear
                if panel:b('panel-mullion',(x0-mullion,c-.025,s+.08),(x0,c,top-.08),wood)
                for i in range(int((h-.16)/.07)):
                    z=s+.08+i*.07
                    mesh(name+'-louver',[coords(face,plane,x,out,Z) for out in [c-.025,c] for x,Z in [(x0,z),(x1,z),(x1,z+.035),(x0,z+.035)]],[(4,5,6,7),(0,1,5,4),(3,7,6,2)],wood)
        else:
            panels=2 if 'double' in o.get('closure','') else 1
            for k in range(panels):
                x0=l+.08+k*(w-.16)/panels;x1=l+.08+(k+1)*(w-.16)/panels
                b('panel',(x0+.003,c-.025,s+.08),(x1-.003,c-.008,top-.08),wood)
                for x in [x0,x1-.035]:b('stile',(x,c-.008,s+.08),(x+.035,c+.008,top-.08),wood)
                b('midrail',(x0,c-.008,s+h/2-.025),(x1,c+.008,s+h/2+.025),wood)


def facade_field(face,plane,name,x,X,z,Z,mid):
    ob=mesh(name+'-field',[coords(face,plane,a,0,h) for a,h in [(x,z),(X,z),(X,Z),(x,Z)]],[(0,3,2,1) if face in ['south','east'] else (0,1,2,3)],mid)
    normal=Vector(local(coords(face,plane,0,1,0)))-Vector(local(coords(face,plane,0,0,0)))
    assert all(p.normal.dot(normal)>.999 for p in ob.data.polygons),(name,'inward exterior skin')
    return ob


def courtyard():
    reset((17,78,0))
    for f in A['faces']:
        face=f['face'];plane=f['wallPlaneM']
        for p in f['parcels']:
            l,r=p['interval'];height=p['wallTopM'];name=p['id'];mid=p['materialId'];trim=p['trimMaterialId'];dep=p['shellDepthM'];opens=[]
            for opening_spec in p['openings']:
                count=opening_spec.get('lightCount',1)
                width=(opening_spec['widthM']-(count-1)*opening_spec.get('mullionM',0))/count
                for i in range(count):
                    o=dict(opening_spec)
                    if count>1:o.update(id=o['id']+'-light-'+str(i+1),widthM=width,alongM=o['alongM']-o['widthM']/2+width/2+i*(width+o['mullionM']),headShape='pointed',galleryLight=True)
                    opens.append(o)
            masks=[dict(o,maskL=o['alongM']-o['widthM']/2-.1,maskR=o['alongM']+o['widthM']/2+.1,maskS=max(0,o['sillM']-.06),maskH=o['headM']+(.12 if o.get('headShape')!='rectangular' else .1)) for o in opens]
            for feature in A['facadeFeatures']:
                if feature['receiverParcel']==name and feature['kind']=='recessed-field':masks.append(dict(maskL=feature['alongM']-feature['widthM']/2,maskR=feature['alongM']+feature['widthM']/2,maskS=feature['zM'][0],maskH=feature['zM'][1]))
            # Explicit opening masks partition the wall; no boolean tolerance or coplanar backing.
            xs=sorted(set([l,r]+[v for o in masks for v in [o['maskL'],o['maskR']]]))
            for x,X in zip(xs,xs[1:]):
                zs=sorted(set([0,.12,.18,height]+[z for region in p['materialRegions'] for z in region['zM']]+[z for o in masks if o['maskL']<(x+X)/2<o['maskR'] for z in [o['maskS'],o['maskH']]]))
                for z,Z in zip(zs,zs[1:]):
                    if X-x<1e-7 or Z-z<1e-7:continue
                    if any(o['maskL']<(x+X)/2<o['maskR'] and o['maskS']<(z+Z)/2<o['maskH'] for o in masks):continue
                    ob=facade_field(face,plane,name,x,X,z,Z,next((region['materialId'] for region in p['materialRegions'] if region['zM'][0]<=(z+Z)/2<=region['zM'][1]),mid))
                    colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
                    for v,c in zip(ob.data.vertices,colors.data):
                        t=1-.045*max(0,min(1,(.18-v.co.z)/.06));c.color=(t,t,t,1)
            # Closed outer sides/back and opaque base. No roof in the section.
            for x,X in [(l,l+.02),(r-.02,r)]:part(face,plane,name+'-side',(x,-dep,0),(X,-.02,height),mid)
            if name=='B_W_TEA':
                for L,H in [((l,-dep,0),(90,-dep+.02,height)),((91.1,-dep,0),(r,-dep+.02,height)),((90,-dep,2.5),(91.1,-dep+.02,height))]:part(face,plane,name+'-rear',L,H,mid)
                opening('east',13.4,{'id':'B_W_TEA-rear-staff-door','alongM':90.55,'widthM':1.1,'heightM':2.5,'sillM':0,'depthM':.18,'kind':'door','assemblyId':'SD-05','closureMaterialId':WOOD},trim,mid)
            else:part(face,plane,name+'-rear',(l,-dep,0),(r,-dep+.02,height),mid)
            part(face,plane,name+'-base',(l,-dep,-.02),(r,-.02,0),mid)
            # A cap is supplied solely by the coordinated roof bundle. Property joints remain recessed.
            for o in opens:opening(face,plane,o,trim,mid)
    for feature in A['facadeFeatures']:facade_feature(feature)
    for g in A['activityGroups']:activity(g)
    for f in A['fixtures']:awning(f)
    export(OUT/'unit-spawn-b-courtyard.glb',A['exportBoundsGltfLocal'],A['budget']['maxTriangles'],23)


def lathe(name,face,plane,lo,hi,mid,kind):
    a,o,z=lo;A_,O,Z=hi;cx=(a+A_)/2;cy=(o+O)/2;rx=(A_-a)/2;ry=(O-o)/2;h=Z-z
    if 'bowl' in kind or 'cup' in kind:
        profile=[(0,0),(.45,0),(.62,.2),(1,1),(.84,1),(.5,.22),(0,.16)]
    elif 'plate' in kind:profile=[(0,0),(.65,0),(.75,.15),(1,.65),(1,1),(.88,.95),(.65,.45),(0,.40)]
    else:profile=[(0,0),(.5,0),(.91,.18),(1,.5),(.56,.86),(.63,.9),(.63,.95),(.20,1),(0,1)]
    vs=[coords(face,plane,cx+rx*r*math.cos(2*math.pi*i/32),cy+ry*r*math.sin(2*math.pi*i/32),z+h*t) for r,t in profile for i in range(32)]
    fs=[(j*32+i,j*32+(i+1)%32,(j+1)*32+(i+1)%32,(j+1)*32+i) for j in range(len(profile)-1) for i in range(32)]
    mesh(name,vs,fs,mid,'receive',True)


def activity(g):
    face=g['receiverFace'];p=PARCELS[g['receiverParcel']];plane=next(f['wallPlaneM'] for f in A['faces'] if f['face']==face)
    op=next((o for o in p['openings'] if o['id']==g.get('receiverOpening')),None)
    along=op['alongM'] if op else (g['bbox']['min'][0]+g['bbox']['max'][0])/2
    deck=g['bbox']['min'][2]
    for item in g['instanceLayout']['parts']:
        lo=[item['localBox']['min'][0]+along,item['localBox']['min'][1],item['localBox']['min'][2]+deck];hi=[item['localBox']['max'][0]+along,item['localBox']['max'][1],item['localBox']['max'][2]+deck]
        name=g['id']+'-'+item['id'];kind=item['kind'];mid=item['materialId']
        def b(s,L,H,m=mid):return part(face,plane,name+s,L,H,m,'receive',.003)
        if any(k in kind for k in ['ceramic','canister']):lathe(name,face,plane,lo,hi,mid,kind)
        elif kind=='arabian-coffee-pot':
            # Body, curved spout and handle remain in the printed final envelope.
            l=lo.copy();h=hi.copy();w=hi[0]-lo[0];h[0]-=w*.22;l[0]+=w*.18
            lathe(name,face,plane,l,h,mid,'jar')
            c=(lo[1]+hi[1])/2
            member(name+'-spout',coords(face,plane,h[0]-w*.12,c,lo[2]+(hi[2]-lo[2])*.45),coords(face,plane,hi[0]-.012,c,hi[2]-.03),.024,mid,'receive')
            ring(name+'-handle',face,plane,lo[0]+w*.19,c,lo[2]+(hi[2]-lo[2])*.55,w*.16,mid)
        elif kind=='hollow-stone-trough':
            b('-base',lo,[hi[0],hi[1],lo[2]+.05]);b('-front',[lo[0],hi[1]-.05,lo[2]+.05],hi);b('-back',[lo[0],lo[1],lo[2]+.05],[hi[0],lo[1]+.05,hi[2]])
            for x in [lo[0],hi[0]-.05]:b('-end',[x,lo[1]+.05,lo[2]+.05],[x+.05,hi[1]-.05,hi[2]])
        elif kind=='contained-lancet-plant':
            cx=(lo[0]+hi[0])/2;cy=(lo[1]+hi[1])/2;height=hi[2]-lo[2];vs=[];fs=[]
            for i in range(7):
                angle=2*math.pi*i/7
                for j in range(4):
                    t=j/3;radius=math.sin(t*math.pi/2)*.42;wid=math.sin(math.pi*t)*.12
                    for sign in [-1,1]:vs.append(coords(face,plane,cx+(hi[0]-lo[0])*(radius*math.cos(angle)+sign*wid*math.sin(angle)),cy+(hi[1]-lo[1])*(radius*math.sin(angle)-sign*wid*math.cos(angle)),lo[2]+height*t*(1-.20*math.sin(angle)**2)))
                for j in range(3):q=i*8+j*2;fs.extend([(q,q+1,q+3,q+2),(q+2,q+3,q+1,q)])
            mesh(name,vs,fs,mid,'receive')
        elif kind in ['grounded-counter-carcass','grounded-plank-chest']:
            b('-top',[lo[0],lo[1],hi[2]-.045],hi)
            # Front planks and grounded rear feet; the empty staff strip stays behind.
            n=math.ceil((hi[0]-lo[0])/.18)
            for i in range(n):
                x=lo[0]+i*(hi[0]-lo[0])/n;b('-front-board',[x+.001,hi[1]-.035,lo[2]],[x+(hi[0]-lo[0])/n-.001,hi[1],hi[2]-.045])
            for x in [lo[0],hi[0]-.065]:
                b('-side',[x,lo[1],lo[2]],[x+.065,hi[1]-.035,hi[2]-.045])
            for z in [lo[2]+.08,hi[2]-.12]:b('-rail',[lo[0],lo[1],z],[hi[0],lo[1]+.04,z+.04])
        elif kind=='horizontal-rolled-rug':
            vs=[];fs=[];cy=(lo[1]+hi[1])/2;cz=(lo[2]+hi[2])/2
            for x in [lo[0],hi[0]]:
                for j in range(24):t=j*math.pi/12;vs.append(coords(face,plane,x,cy+(hi[1]-lo[1])/2*math.cos(t),cz+(hi[2]-lo[2])/2*math.sin(t)))
            fs=[(i,(i+1)%24,(i+1)%24+24,i+24) for i in range(24)]+[tuple(reversed(range(24))),tuple(range(24,48))]
            mesh(name,vs,fs,mid,'receive',True)
        else:
            ob=b('',lo,hi)
            if any(word in kind for word in ['cloth','textile','cushion','hanging-rug']):
                for mod in ob.modifiers:
                    if mod.type=='BEVEL':mod.width=min(.035,min(hi[i]-lo[i] for i in range(3))*.24);mod.segments=3
                if kind=='bound-folded-textile':
                    # The folded edges sit inside the assigned silhouette; ties
                    # compress the soft bale rather than decorate a rigid cube.
                    for level in [.25,.5,.75]:
                        z=lo[2]+(hi[2]-lo[2])*level
                        part(face,plane,name+'-fold-edge',(lo[0]+.035,hi[1]-.008,z-.003),(hi[0]-.035,hi[1]-.002,z+.003),mid,'receive')
            if kind=='plank-shelf':
                for x in [lo[0]+.12,hi[0]-.12]:member(name+'-bracket',coords(face,plane,x,lo[1],lo[2]-.16),coords(face,plane,x,hi[1]-.01,lo[2]),.025,IRON,'receive')
            if 'hanging-rug' in kind:
                for x in [lo[0]+.03,hi[0]-.03]:member(name+'-tie',coords(face,plane,x,(lo[1]+hi[1])/2,hi[2]-.01),coords(face,plane,x,-1.77,deck+2.4),.014,WOOD,'receive')
            if kind=='bound-folded-textile':
                for x in [lo[0]+.12,hi[0]-.12]:b('-binding',[x,lo[1],lo[2]],[x+.018,hi[1],hi[2]],'ph_bz04_hessian_230')
    if g.get('sign'):
        s=g['sign'];x=s['centerAlongM'];z=s['centerZ'];w=s['widthM'];h=s['heightM'];o=s['frontOutM']
        sign=part(face,plane,g['id']+'-sign',(x-w/2,o-.025,z-h/2),(x+w/2,o,z+h/2),WOOD,'receive',.003)
        # SD-15 gives accent families, not numeric sign paint. Use the issue's
        # existing rust/teal swatches; the decision is recorded in the trial log.
        tint={'rust':'#ba8d75','teal':'#547d77','indigo':'#596778'}.get(g.get('accent'),'#547d77').lstrip('#')
        rgba=tuple(_linear_channel(int(tint[i:i+2],16)) for i in (0,2,4))+(1,)
        colors=sign.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
        for c in colors.data:c.color=rgba
        for a in [x-.30,x+.30]:part(face,plane,g['id']+'-sign-stub',(a-.0175,.105,z-.0175),(a+.0175,.225,z+.0175),WOOD,'receive')
        text(g['id']+'-label',s['text'],face,plane,x,o+.001,z,w*.85,h*.70)


def text(name,label,face,plane,a,o,z,width,height):
    curve=bpy.data.curves.new(name,'FONT');curve.body=label;curve.align_x='CENTER';curve.align_y='CENTER';curve.size=height;curve.extrude=.0003;curve.resolution_u=2
    ob=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(ob);ob.location=local(coords(face,plane,a,o,z))
    # Text local +Y points up; normal points toward the street after the mirrored design frame.
    ob.rotation_euler=(math.pi/2,0,{'north':math.pi,'south':0,'west':math.pi/2,'east':-math.pi/2}[face])
    curve.materials.append(mat('ph_bz04_hessian_230'));bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.convert(target='MESH');ob.select_set(False);ob['bz04Shadow']='receive'
    if ob.dimensions.x>width and face in ['north','south']:ob.scale*=width/ob.dimensions.x


def awning(f):
    face=f['receiverFace'];plane=f['wallPlaneM'];l,r=f['interval'];z=f['ledgerZ'];dep=f['projectionM'];drop=f['dropM'];name=f['id'];axes=f['armAxesM']
    part(face,plane,name+'-ledger',(l,-.04,z-.04),(r,.04,z+.04),WOOD)
    for a in axes:
        member(name+'-arm',coords(face,plane,a,0,z-.035),coords(face,plane,a,dep-.035,z-drop-.035),.07,WOOD)
        knee_head=z-.07-.3*drop/dep
        member(name+'-knee',coords(face,plane,a,0,knee_head-.30),coords(face,plane,a,.30,knee_head),.05,WOOD)
    for l,r in zip([f['interval'][0]]+axes[1:-1],axes[1:-1]+[f['interval'][1]]):
        vs=[];fs=[]
        for j in range(9):
            t=j/8
            for i in range(17):
                u=i/16;vs.append(coords(face,plane,l+(r-l)*u,dep*t,z-drop*t-f['sagM']*math.sin(math.pi*t)*math.sin(math.pi*u)))
        for j in range(8):
            for i in range(16):q=j*17+i;fs.append((q,q+1,q+18,q+17))
        count=len(vs);vs=vs+[(x,y,h-.008) for x,y,h in vs];fs=fs+[tuple(v+count for v in reversed(face)) for face in fs]
        boundary=list(range(17))+[j*17+16 for j in range(1,9)]+list(range(8*17+15,8*17-1,-1))+[j*17 for j in range(7,0,-1)]
        for a,b in zip(boundary,boundary[1:]+boundary[:1]):fs.append((a,b,b+count,a+count))
        mesh(name+'-cloth',vs,fs,f['materialId'])
        member(name+'-hem',coords(face,plane,l,dep-.0125,z-drop-.0125),coords(face,plane,r,dep-.0125,z-drop-.0125),.025,f['materialId'])


def prepare_mesh(ob):
    if ob.modifiers:
        bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
        for mod in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    if ob.matrix_world != __import__('mathutils').Matrix.Identity(4):
        ob.data.transform(ob.matrix_world);ob.matrix_world.identity()
    import bmesh
    bm=bmesh.new();bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
    bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-7)
    if '-field' not in ob.name and 'B-STAR' not in ob.name:
        bmesh.ops.dissolve_limit(bm,angle_limit=1e-5,verts=list(bm.verts),edges=list(bm.edges),delimit={'UV'})
    if '-field' not in ob.name:bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(ob.data);bm.free()
    if not ob.data.color_attributes.get('COLOR_0'):
        c=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
        for v in c.data:v.color=(1,1,1,1)
    if ob.get('b04PlanarUnionArea') is not None:
        ob.data.calc_loop_triangles()
        normal_axis=1 if '-front' in ob.name else 0
        projected=sum(t.area for t in ob.data.loop_triangles if abs(t.normal[normal_axis])>.999)/2
        assert abs(projected-ob['b04PlanarUnionArea'])<1e-4,(ob.name,'screen voids changed',projected,ob['b04PlanarUnionArea'])


def export(path,bounds,tri_ceiling,primitive_ceiling,extras=None):
    path.parent.mkdir(parents=True,exist_ok=True)
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];inventory=[];bpy.context.view_layer.update()
    for ob in meshes:
        prepare_mesh(ob)
        pts=[tuple(v.co) for v in ob.data.vertices];inventory.append({'id':ob.name,'material':ob.data.materials[0].name,'shadow':ob.get('bz04Shadow','cast'),'bounds':{'min':[min(v[i] for v in pts) for i in range(3)],'max':[max(v[i] for v in pts) for i in range(3)]},'triangles':sum(len(p.vertices)-2 for p in ob.data.polygons)})
    actual={'min':[min(i['bounds']['min'][j] for i in inventory) for j in (0,2,1)],'max':[max(i['bounds']['max'][j] for i in inventory) for j in (0,2,1)]};actual['min'][2],actual['max'][2]=-actual['max'][2],-actual['min'][2]
    if bounds:
        assert all(actual['min'][i]>=bounds['min'][i]-.001 and actual['max'][i]<=bounds['max'][i]+.001 for i in range(3)),(path.name,actual,bounds)
    else:bounds=actual
    bpy.context.scene['bz04VisualBounds']=bounds
    if extras:
        for k,v in extras.items():bpy.context.scene[k]=v
    groups={}
    for ob in meshes:groups.setdefault((ob.data.materials[0].name,ob.get('bz04Shadow','cast')),[]).append(ob)
    tris=sum(i['triangles'] for i in inventory)
    print('BUDGET',path.name,tris,len(groups),flush=True)
    assert tris<=tri_ceiling,(path.name,tris,tri_ceiling)
    assert len(groups)<=primitive_ceiling,(path.name,len(groups),primitive_ceiling)
    with tempfile.TemporaryDirectory(prefix='.b04-export-',dir=path.parent) as raw:
        stage=Path(raw)/path.name
        bpy.ops.wm.save_as_mainfile(filepath=str(stage.with_suffix('.blend')))
        for (mid,shadow),objects in groups.items():
            bpy.ops.object.select_all(action='DESELECT')
            for o in objects:o.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            if len(objects)>1:bpy.ops.object.join()
            ob=bpy.context.object;ob.name=mid+'-'+shadow;ob['bz04Shadow']=shadow
        if not (extras and extras.get('bz04Landmark')):_strip_pack_images()
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.export_scene.gltf(filepath=str(stage),export_format='GLB',export_yup=True,use_selection=True,export_extras=True,export_vertex_color='ACTIVE')
        report={'asset':str(path.relative_to(ROOT)),'triangles':tris,'primitives':len(groups),'castPrimitives':sum(s=='cast' for m,s in groups),'actualBoundsGltf':actual,'declaredBoundsGltf':bounds,'objects':inventory,'sha256':hashlib.sha256(stage.read_bytes()).hexdigest()}
        data=stage.read_bytes();g=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
        primitives=[(n,p) for n in g['nodes'] if 'mesh' in n for p in g['meshes'][n['mesh']]['primitives']]
        actual_triangles=sum(g['accessors'][p['indices']]['count']//3 for n,p in primitives)
        assert actual_triangles<=tri_ceiling and len(primitives)<=primitive_ceiling
        report.update(triangles=actual_triangles,sourcePolygonTriangles=tris,primitives=len(primitives),castPrimitives=sum(n.get('extras',{}).get('bz04Shadow')=='cast' for n,p in primitives))
        stage.with_suffix('.inspection.json').write_text(json.dumps(report,indent=2)+'\n')
        for suffix in ['.blend','.glb','.inspection.json']:stage.with_suffix(suffix).replace(path.with_suffix(suffix))
        REPORT.append(report)
        print('BZ04 EXPORT',path.name,tris,'triangles',len(groups),'primitives',flush=True)



def roof_bundle(bundle):
    pos=bundle['baseCentrePlacement']['position'];reset((pos['x'],pos['y'],pos['z']))
    cells=[c for c in R['roofCells'] if c['id'] in bundle['roofCellIds']];cellmap={c['id']:c for c in cells}
    for c in cells:
        # Every rectangular clipping cell has one slab and one continuous finish plane.
        p=PARCELS[c['sourceGeometry'][0]['parcelId']];roof=p['roof'];m=roof['materialIds'];x,y,X,Y=c['footprint'];z=roof['slabBottomM'];Z=roof['slabTopM']
        box(c['id']+'-slab',(x,y,z),(X,Y,Z),m['slab'])
        if roof['form']=='perimeter-parapet':
            plane=roof['finishPlane'];corners=[(x,y),(X,y),(X,Y),(x,Y)];vs=[(a,b,Z) for a,b in corners]+[(a,b,plane['constantM']+plane['gradientX']*a+plane['gradientY']*b) for a,b in corners]
            mesh(c['id']+'-finish',vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m['finish'],'receive')
    for e in R['exposedUnionBoundaryEdges']:
        if e['roofCellId'] not in cellmap:continue
        p=PARCELS[e['sourceParcelId']];r=p['roof'];m=r['materialIds'];x,y=e['startXY'];X,Y=e['endXY'];x,X=sorted([x,X]);y,Y=sorted([y,Y])
        if r['form']!='perimeter-parapet':continue
        # Inward thickness at exposed boundary, with a 30 mm exterior cap drip.
        if e['side']=='north':y-=.16
        elif e['side']=='south':Y+=.16
        elif e['side']=='east':x-=.16
        else:X+=.16
        box(e['id']+'-parapet',(x,y,r['slabTopM']),(X,Y,r['parapetTopM']),m['parapet'])
        box(e['id']+'-cap',(x-.03,y-.03,r['parapetTopM']),(X+.03,Y+.03,r['capTopM']),m['cap'])
    for e in R['stepReturnEdges']:
        if e['id'] not in bundle['ownedStepReturnIds']:continue
        c=cellmap[e['highRoofCellId']];p=PARCELS[c['sourceGeometry'][0]['parcelId']];x,y=e['startXY'];X,Y=e['endXY'];low=e['lowRoofSurfaceAtEdgeM'];z0=low['start']-.02;z1=low['end']-.02;top=e['highCapTopM']
        # A planar, thick return closes the height step without overlaying the lower street face.
        side=e['sideOnHighCell'];dx=.02 if side=='west' else -.02 if side=='east' else 0;dy=.02 if side=='south' else -.02 if side=='north' else 0
        vs=[(x,y,z0),(X,Y,z1),(X,Y,top),(x,y,top),(x+dx,y+dy,z0),(X+dx,Y+dy,z1),(X+dx,Y+dy,top),(x+dx,y+dy,top)]
        mesh(e['id'],vs,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],p['materialId'])
    for seam in R['sharedSameHeightSeams']:
        if seam['id'] not in bundle['ownedSameHeightSeamIds'] or len(seam['ownerIds'])<2:continue
        x,y=seam['startXY'];X,Y=seam['endXY'];z=min(seam['finishAtEdgeM']['first']+seam['finishAtEdgeM']['second'])-.02
        mid=PARCELS[cellmap[seam['roofCellIds'][0]]['sourceGeometry'][0]['parcelId']]['materialId']
        box(seam['id']+'-upstand',(min(x,X)-(.08 if x==X else 0),min(y,Y)-(.08 if y==Y else 0),z),(max(x,X)+(.08 if x==X else 0),max(y,Y)+(.08 if y==Y else 0),seam['capTopM']),mid)
    owners={c['ownerId'] for c in cells}
    for c in R['collectors']:
        if c['ownerId'] not in owners:continue
        x,y,z=c['pointXYZ'];bounds=next(cell['footprint'] for cell in cells if cell['ownerId']==c['ownerId'] and cell['footprint'][0]-.001<=x<=cell['footprint'][2]+.001 and cell['footprint'][1]-.001<=y<=cell['footprint'][3]+.001)
        box(c['id'],(max(x-.045,bounds[0]),max(y-.045,bounds[1]),z-.025),(min(x+.045,bounds[2]),min(y+.045,bounds[3]),z+.002),IRON,'receive')
    path=ROOT/'assets/source'/bundle['installationOutputUnit']/bundle['plannedModelFile']
    export(path,bundle['localBoundsGltfYUp'],bundle['declaredAllocation']['triangles']['total'],bundle['declaredAllocation']['primitives']['total'],{'bz04RoofBundle':bundle['id'],'bz04RetirementCoverage':bundle['retirementScope']['coverageXY']})


def gateway():
    g=D['landmarks'][0];reset(tuple(g['position']));p=g['innerArchProfile'];xs=[]
    for start,control,end in [(p['leftSpring'],p['leftControl'],p['crown']),(p['crown'],p['rightControl'],p['rightSpring'])]:
        for i in range(33):
            if xs and i==0:continue
            t=i/32;xs.append(tuple((1-t)**2*start[j]+2*t*(1-t)*control[j]+t*t*end[j] for j in range(2)))
    for pier in g['piers']:box('LM01-pier',pier['bbox']['min'],pier['bbox']['max'],g['materialId'],bevel=.006)
    outer=[]
    for i,(x,z) in enumerate(xs):
        before=xs[max(0,i-1)];after=xs[min(len(xs)-1,i+1)];dx=after[0]-before[0];dz=after[1]-before[1];length=math.hypot(dx,dz)
        outer.append((x-dz/length*.35,z+dx/length*.35))
    for i in range(len(xs)-1):
        x,z=xs[i];X,Z=xs[i+1];ox,oz=outer[i];OX,OZ=outer[i+1]
        mesh('LM01-ring-'+str(i),[(x,76.7,z),(X,76.7,Z),(OX,76.7,OZ),(ox,76.7,oz),(x,77.5,z),(X,77.5,Z),(OX,77.5,OZ),(ox,77.5,oz)],[(0,1,2,3),(7,6,5,4),(0,4,5,1)],g['trimMaterialId'])
    full=[(19.7,4.2)]+outer+[(35.3,4.2)]
    for i,((x,z),(X,Z)) in enumerate(zip(full,full[1:])):
        mesh('LM01-spandrel-'+str(i),[(x,76.7,z),(X,76.7,Z),(X,76.7,7.35),(x,76.7,7.35),(x,77.5,z),(X,77.5,Z),(X,77.5,7.35),(x,77.5,7.35)],[(0,3,2,1),(4,5,6,7),(3,7,6,2)],g['materialId'])
    # Shoulder closures reach the piers and join the two ring ends.
    for x,X,h in [(19.7,21,outer[0]),(34,35.3,outer[-1])]:
        mesh('LM01-shoulder',[(x,76.7,4.2),(X,76.7,4.2),(h[0],76.7,h[1]),(x,77.5,4.2),(X,77.5,4.2),(h[0],77.5,h[1])],[(0,1,2),(5,4,3),(0,3,4,1)],g['materialId'])
    for x in [19.7,35.3]:mesh('LM01-end',[(x,76.7,4.2),(x,77.5,4.2),(x,77.5,7.35),(x,76.7,7.35)],[(0,1,2,3)],g['materialId'])
    box('LM01-cap',(19.7,76.7,7.35),(35.3,77.5,7.45),TRIM)
    accent=g['accent'];box('LM01-inlay',accent['bounds']['min'],accent['bounds']['max'],'bz04_teal_timber_project_original','receive')
    text('LM01-title','BAZAAR','south',77.5,27.5,.001,7.22,1.6,.14)
    export(ROOT/'assets/source/unit-rug-gate/bz04-rug-gate.glb',None,5000,6,{'bz04Landmark':g['id']})


def shared_environment():
    reset((28,48,0))
    for b in D['skyline']:
        x,y,z=b['bbox']['min'];X,Y,Z=b['bbox']['max'];mid=b['materialId'];name=b['id'];top=Z-.55;inset=.6
        # Complete quiet support and one setback parapet. Window surfaces are closed.
        face,plane,low,high=('south',Y,x,X) if Y<0 else ('north',y,x,X) if y>92 else ('west',X,y,Y) if X<0 else ('east',x,y,Y)
        depth=Y-y if face in ['north','south'] else X-x
        centers=[];center=low+1.20
        while center<=high-1.20+.001:centers.append(center);center+=b['windowPitchM']
        openings=[(a-b['windowWidthM']/2,a+b['windowWidthM']/2,z,z+b['windowHeightM']) for a in centers for z in b['windowRowsM']]
        ax=sorted(set([low,high]+[v for o in openings for v in o[:2]]));zz=sorted(set([0,top]+[v for o in openings for v in o[2:]]))
        for l,r in zip(ax,ax[1:]):
            for z0,z1 in zip(zz,zz[1:]):
                if any(L<(l+r)/2<H and S<(z0+z1)/2<T for L,H,S,T in openings):continue
                mesh(name+'-front',[coords(face,plane,a,0,z) for a,z in [(l,z0),(r,z0),(r,z1),(l,z1)]],[(0,1,2,3)],mid)
        for l,r in [(low,low+.02),(high-.02,high)]:part(face,plane,name+'-side',(l,-depth,0),(r,0,top),mid)
        part(face,plane,name+'-back',(low,-depth,0),(high,-depth+.02,top),mid)
        part(face,plane,name+'-roof-receiver',(low,-depth,top-.02),(high,0,top),mid)

        box(name+'-slab',(x+inset,y+inset,top),(X-inset,Y-inset,top+.10),TRIM)
        for l,h in [((x+inset,y+inset,top+.10),(X-inset,y+inset+.16,Z-.10)),((x+inset,Y-inset-.16,top+.10),(X-inset,Y-inset,Z-.10)),((x+inset,y+inset+.16,top+.10),(x+inset+.16,Y-inset-.16,Z-.10)),((X-inset-.16,y+inset+.16,top+.10),(X-inset,Y-inset-.16,Z-.10))]:
            box(name+'-parapet',l,h,mid);box(name+'-cap',(l[0]-.02,l[1]-.02,Z-.10),(h[0]+.02,h[1]+.02,Z),TRIM)
        face,plane,low,high=('south',Y,x,X) if Y<0 else ('north',y,x,X) if y>92 else ('west',X,y,Y) if X<0 else ('east',x,y,Y)
        along=low+1.20
        while along<=high-1.20+.001:
            for z in b['windowRowsM']:
                w=b['windowWidthM'];h=b['windowHeightM'];l=along-w/2;r=along+w/2
                part(face,plane,name+'-window-back',(l,-.24,z),(r,-.22,z+h),mid)
                part(face,plane,name+'-closed-window',(l+.008,-.205,z+.008),(r-.008,-.18,z+h-.008),'ph_bz04_dark_wood')
                part(face,plane,name+'-midrail',(l+.015,-.18,z+h/2-.02),(r-.015,-.16,z+h/2+.02),WOOD)
                for L,H in [((l-.10,-.22,z),(l,.08,z+h)),((r,-.22,z),(r+.10,.08,z+h)),((l-.10,-.22,z+h),(r+.10,.08,z+h+.1)),((l-.1,-.22,z-.06),(r+.1,.08,z))]:part(face,plane,name+'-frame',L,H,TRIM)
            along+=b['windowPitchM']
    g=D['backlotGround'];r=g['bounds'];excluded=[]
    for a in D['areas']:
        r0=a['rect'];excluded.append((r0['x'],r0['y'],r0['x']+r0['w'],r0['y']+r0['h']))
    excluded.extend(p['footprint'] for p in PARCELS.values());excluded.extend((b['bbox']['min'][0],b['bbox']['min'][1],b['bbox']['max'][0],b['bbox']['max'][1]) for b in D['skyline'])
    xs=sorted(set([r['x'],r['x']+r['w']]+[v for b in excluded for v in (b[0],b[2]) if r['x']<v<r['x']+r['w']]))
    ys=sorted(set([r['y'],r['y']+r['h']]+[v for b in excluded for v in (b[1],b[3]) if r['y']<v<r['y']+r['h']]))
    vs=[];fs=[]
    for x,X in zip(xs,xs[1:]):
        for y,Y in zip(ys,ys[1:]):
            if any(b[0]<(x+X)/2<b[2] and b[1]<(y+Y)/2<b[3] for b in excluded):continue
            i=len(vs);vs.extend([(x,y,0),(X,y,0),(X,Y,0),(x,Y,0)]);fs.append((i,i+1,i+2,i+3))
    mesh('BG-GROUND',vs,fs,g['materialId'],'receive')
    export(ROOT/'assets/source/bz04-shared-environment/bz04-shared-environment.glb',None,D['sharedEnvironment']['maxTriangles'],20,{'bz04SharedEnvironment':True})


def local_gate_caps():
    for cap in A['implementationPhase']['roofSlices']:
        reset(tuple(cap['placement']['designCenter']))
        box(cap['modelId'],cap['bbox']['min'],cap['bbox']['max'],cap['materialId'])
        export(OUT/(cap['modelId']+'.glb'),None,12,1,{'bz04RoofBundle':cap['modelId'],'bz04RetirementCoverage':[cap['clipRect']]})


def validate_inputs():
    if '--handoff' not in sys.argv:raise ValueError('Build requires --handoff <saved handoff.json>; run construction/handoff.py first')
    saved=json.loads(Path(sys.argv[sys.argv.index('--handoff')+1]).read_text())
    import runpy
    extract=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']
    current=extract('unit-spawn-b-courtyard',D,R)
    if saved.get('inputSha256')!=current['inputSha256']:raise ValueError('Area inputs changed since handoff extraction; resolve the changed issue before building')
    for face in A['faces']:
        for parcel in face['parcels']:
            for opening_spec in parcel['openings']:
                assert opening_spec.get('headShape','rectangular') in {'rectangular','pointed','segmental','paired-pointed'},opening_spec['id']
                assert opening_spec['depthM']>0 and opening_spec['widthM']>0 and opening_spec['heightM']>0,opening_spec['id']
    supported={'screened-balcony','timber-hood','hoist','gallery-sill','recessed-field'}
    unsupported=[(f['id'],f['kind']) for f in A['facadeFeatures'] if f['kind'] not in supported]
    assert not unsupported,('unsupported facade features',unsupported)
    assert A['implementationPhase']['id']=='B-04-only','resolve the new installation phase before building'


def self_test():
    reset((0,0,0))
    for face in ['north','south','east','west']:
        ob=facade_field(face,0,'probe-'+face,0,1,0,1,TRIM)
        prepare_mesh(ob)
        direction=Vector(local(coords(face,0,0,1,0)))-Vector(local(coords(face,0,0,0,0)))
        assert all(p.normal.dot(direction)>.999 for p in ob.data.polygons),face
    reset((0,0,0))
    star_screen('B-STAR-probe-front','north',0,(-.2,-.2),(.2,.2),0,WOOD)
    ob=bpy.data.objects['B-STAR-probe-front'];prepare_mesh(ob);bpy.context.view_layer.update()
    for x,z,expected in [(0,0,False),(.16,0,True),(.19,.19,False)]:
        assert ob.ray_cast(Vector((x,1,z)),Vector((0,-1,0)))[0] is expected,('star opening',x,z)
    for shape in ['pointed','segmental']:
        o={'id':'probe-'+shape,'alongM':0,'widthM':1.35,'sillM':0,'heightM':2.85,'depthM':.42,'headShape':shape,'kind':'door','closure':'closed double leaves','closureMaterialId':WOOD,'frontProjectionM':0}
        reset((0,0,0));shaped_opening('north',0,o,TRIM,'ph_bz04_painted_plaster_warm')
        for ob in list(bpy.context.scene.objects):prepare_mesh(ob)
        assert min(v.co.z for ob in bpy.context.scene.objects for v in ob.data.vertices)>=-.02001,'door below section base'
        assert max(arch_points(o),key=lambda p:p[1])[1]<=2.85001
    reset((0,0,0));paint=mat('bz04_teal_timber_project_original');shader=paint.node_tree.nodes['Principled BSDF']
    assert shader.inputs['Base Color'].is_linked,'preserve the authored albedo binding'
    assert shader.inputs['Metallic'].default_value==0
    print('PASS B-04 self-test: four outward skins, star voids/strips after cleanup, shaped doors, explicit material factors',flush=True)


if __name__=='__main__':
    try:
        if 'self-test' in sys.argv:self_test()
        else:
            validate_inputs()
            courtyard()
            if 'section-only' not in sys.argv:local_gate_caps()
    except Exception:
        import traceback
        traceback.print_exc()
        sys.exit(1)
