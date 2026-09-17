"""Deterministic R7 B courtyard finish, including its explicitly scheduled dependencies.

Run with Blender -b --factory-startup --python this-file. All measurements come
from the controlled design. No gameplay data or user's live scene is written.
"""
from pathlib import Path
import sys, json, math, hashlib, tempfile, struct, runpy
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
FROZEN_INPUT_SHA = None
WOOD='ph_bz04_weathered_brown_planks'
IRON='ph_bz04_rusty_metal_02'
TRIM='ph_bz04_stone_trim_sandstone'


def reset(origin):
    global ORIGIN
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    ORIGIN=origin
    for key in list(bpy.context.scene.keys()):
        if key.startswith("bz04") or key == 'bazaarColorLifeApplied':del bpy.context.scene[key]
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
    # Private B finishes take precedence; other R7 areas use the approved shared craft recipes.
    finish=A.get('finishSchedule',{}).get('materials') or D.get('craftStandards',{}).get('materials',{})
    profile=finish.get({WOOD:'warmTimber',IRON:'iron','bz04_teal_timber_project_original':'opaqueTimber','bz04_ceramic_project_original':'ceramic'}.get(mid,''))
    if profile:
        original=m;m=original.copy();m.name=profile['exportName']
        nodes,links=m.node_tree.nodes,m.node_tree.links;shader=nodes['Principled BSDF']
        for link in list(shader.inputs['Metallic'].links):links.remove(link)
        shader.inputs['Metallic'].default_value=profile['metalness']
        for node in nodes:
            if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=profile.get('normalScale',0)
            if node.type=='MATH' and node.operation=='MULTIPLY':node.inputs[1].default_value=profile['roughness']
        if not shader.inputs['Roughness'].is_linked:shader.inputs['Roughness'].default_value=profile['roughness']
        for link in list(shader.inputs['Base Color'].links):links.remove(link)
        shader.inputs['Base Color'].default_value=(1,1,1,1)
        if profile.get('grainMix',0)>0:
            import numpy as np
            source=next(n.image for n in nodes if n.type=='TEX_IMAGE' and n.image.colorspace_settings.name!='Non-Color')
            pixels=np.empty(len(source.pixels),dtype=np.float32);source.pixels.foreach_get(pixels);pixels=pixels.reshape((-1,4))
            paint=np.array([_linear_channel(int(profile['paintSrgb'][i:i+2],16)) for i in (1,3,5)])
            # Image.pixels supplies normalized sRGB values for this source.
            # Decode once for the authored blend, then encode for the sRGB image.
            source_linear=np.where(pixels[:,:3]<=.04045,pixels[:,:3]/12.92,((pixels[:,:3]+.055)/1.055)**2.4)
            result_linear=paint*((1-profile['grainMix'])+profile['grainMix']*source_linear)
            pixels[:,:3]=np.where(result_linear<=.0031308,result_linear*12.92,1.055*result_linear**(1/2.4)-.055)
            baked=bpy.data.images.new(profile['exportName']+'-albedo',width=source.size[0],height=source.size[1],alpha=True)
            baked.pixels.foreach_set(pixels.ravel());baked.pack()
            tex=nodes.new('ShaderNodeTexImage');tex.image=baked;links.new(tex.outputs['Color'],shader.inputs['Base Color'])
            m['bz05SourceSha256']=hashlib.sha256(Path(source.filepath_from_user()).read_bytes()).hexdigest()
            m['bz05PaintFormula']='paintLinear*((1-grainMix)+grainMix*sourceAlbedoLinear)'
        m['bz05FinishProfile']=profile['exportName']
    elif mid=='bz04_teal_timber_project_original':
        shader=m.node_tree.nodes['Principled BSDF']
        for link in list(shader.inputs['Base Color'].links):m.node_tree.links.remove(link)
        shader.inputs['Base Color'].default_value=(1,1,1,1)
    elif mid=='bz04_fixed_glass':
        shader=m.node_tree.nodes['Principled BSDF'];shader.inputs['Base Color'].default_value=(1,1,1,1);shader.inputs['Roughness'].default_value=.3
    MATS[mid]=m;return m


def paint_object(ob, color, calibrated=False):
    rgba=tuple(_linear_channel(int(color[i:i+2],16)) for i in (1,3,5))
    if calibrated:
        recipe=D['materials']['ph_bz04_hessian_230']['baseColorRecipe']['vertexPaintRecipe']
        rgba=tuple(v/recipe['representativeNeutralGrainLinear'] for v in rgba)
    assert all(0<=v<=1 for v in rgba),(ob.name,'paint out of range',rgba)
    colors=ob.data.color_attributes.get('COLOR_0') or ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','POINT')
    for v in colors.data:v.color=(*rgba,1)


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
    if mid in ['ph_bz04_hessian_230','ph_bz04_fine_linen']:
        paint_object(ob,'#dfcfab',True)
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
    # The inner boundary is the intersection of offset halfplanes. A narrow
    # pointed crown otherwise self-intersects when independently offset vertices
    # cross the centre axis, swallowing the upper glass and twisting the frame.
    if distance<0 and len(points)>2:
        lines=[]
        for p,q in zip(points,points[1:]):
            slope=(q[1]-p[1])/(q[0]-p[0]);lines.append((slope,p[1]-slope*p[0]+distance*math.sqrt(1+slope*slope)))
        left=points[0][0]-distance;right=points[-1][0]+distance
        return [(x,min(m*x+b for m,b in lines)) for x in [left+(right-left)*i/(len(points)-1) for i in range(len(points))]]
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
    if len(cleaned)>2:return prism_profile(name,face,plane,cleaned,back,front,mid,shadow)


def closure(face,plane,o,top):
    """Build closure inside the actual aperture, using the scheduled leaf and light profiles."""
    name=o['id'];l=top[0][0];r=top[-1][0];s=o['sillM'];h=o['heightM'];dep=o['depthM']
    c=-dep+.04;wood='bz04_teal_timber_project_original' if o.get('finishMaterialProfile')=='opaqueTimber' else o['closureMaterialId']
    profile=o.get('closureProfile',{});frame=profile.get('frameWidthM',.08)
    inner=offset_top(top,-frame);leaf_top=profile.get('leafTopM',s+h-frame)
    def panel(n,x,X,z,Z,back,front,mid=wood,shadow='cast'):
        return clipped_panel(name+'-'+n,face,plane,inner,x,X,z,Z,back,front,mid,shadow)
    def b(n,lo,hi,mid=wood,shadow='cast',bevel=.003):
        return part(face,plane,name+'-'+n,lo,hi,mid,shadow,bevel)
    for x in [l,r-frame]:clipped_panel(name+'-frame-jamb',face,plane,top,x,x+frame,s,s+h,c-.025,c,wood)
    b('frame-bottom',(l,c-.025,s),(r,c,s+frame))
    for i,(p,q) in enumerate(zip(top,top[1:])):
        prism_profile(name+'-frame-head',face,plane,[inner[i],inner[i+1],q,p],c-.025,c,wood)
    text=o.get('closure','').lower()
    if 'louver' in text:
        count=o.get('panelCount',1);mullion=o.get('panelMullionM',.08)
        width=(r-l-2*frame-(count-1)*mullion)/count
        for k in range(count):
            x=l+frame+k*(width+mullion);X=x+width
            if k:panel('panel-mullion',x-mullion,x,s+frame,s+h,c-.025,c)
            for i in range(math.ceil((h-2*frame)/.08)):
                z=s+frame+.0175+i*.08
                # Extruded sloped section, including closed ends; profile never crosses the curved head.
                section=[(c-.025,z-.0175),(c,z+.0105),(c,z+.0175),(c-.025,z-.0105)]
                # Clip each slat at the exact curved head rather than deleting its full width.
                intersections=[]
                for P,Q in zip(inner,inner[1:]):
                    if P[1]>=z+.0175:intersections.append(P[0])
                    if (P[1]>=z+.0175)!=(Q[1]>=z+.0175):
                        t=(z+.0175-P[1])/(Q[1]-P[1]);intersections.append(P[0]+t*(Q[0]-P[0]))
                    if Q[1]>=z+.0175:intersections.append(Q[0])
                if not intersections:continue
                left=max(x,min(intersections));right=min(X,max(intersections))
                if right-left<.001:continue
                vs=[coords(face,plane,a,out,Z) for a in [left,right] for out,Z in section]
                mesh(name+'-louver',vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],wood)
    elif 'slat' in text:
        pitch=o.get('slatPitchM',.16);width=o.get('slatWidthM',.035)
        for i in range(math.ceil((r-l-2*frame)/pitch)):
            x=l+frame+i*pitch;panel('vertical-slat',x,min(x+width,r-frame),s+frame,s+h,c-.025,c,shadow='receive')
    else:
        count=max(1,o.get('finishLeafCount',o.get('panelCount',2 if 'double' in text else 1)))
        width=(r-l-2*frame)/count
        for k in range(count):
            x=l+frame+k*width+.003;X=l+frame+(k+1)*width-.003
            if o.get('architecturalDetail',{}).get('profile')=='planked-receiving':
                board_count=math.ceil((X-x)/.18)
                for i in range(board_count):panel('leaf-board',x+i*(X-x)/board_count+.001,x+(i+1)*(X-x)/board_count-.001,s+frame,leaf_top,c-.025,c)
                for z in [s+.45,s+h-.35]:panel('strap',x+.02,X-.02,z,z+.04,c,c+.012,IRON,'receive')
            else:
                panel('leaf-panel',x,X,s+frame,leaf_top,c-.025,c-.008)
                for L,H in [(x,x+.055),(X-.055,X)]:panel('leaf-stile',L,H,s+frame,leaf_top,c-.025,c)
                for z,Z in [(s+frame,s+frame+.07),(leaf_top-.07,leaf_top),((s+frame+leaf_top)/2-.025,(s+frame+leaf_top)/2+.025)]:panel('leaf-rail',x,X,z,Z,c-.025,c)
            hinge_x=x if k<count/2 else X-.025
            for z in [s+frame+.18,max(s+frame+.3,min(leaf_top-.28,top[0][1]-.2))]:
                b('hinge',(hinge_x,c,z),(hinge_x+.025,c+.008,z+.1),IRON,'receive',0)
            b('latch',(X-.08,c,s+frame+(leaf_top-s-frame)*.45),(X-.025,c+.01,s+frame+(leaf_top-s-frame)*.45+.025),IRON,'receive',0)
    if o.get('glazingProfile'):
        g=o['glazingProfile'];z0=g['fromZM'];z1=s+h
        assert g['pattern']=='diamond',('unsupported glazing pattern',g['pattern'])
        panel('glass-opaque-back',l+frame,r-frame,z0,z1,c-.034,c-.03,'ph_bz04_dark_wood','receive')
        b('transom',(l+frame,c-.025,z0-.035),(r-frame,c,z0+.01))
        # Diamonds are clipped against the same inward arch as their webs.
        columns=g['columnsPerLight'];rows=g['rows'];dx=(r-l-2*frame)/columns;dz=(z1-z0)/rows;web=g['webM'];sequence=g.get('paletteSequence',list(range(len(g['paletteSrgb']))))
        for row in range(-1,rows+1):
            for col in range(-1,columns+1):
                cx=l+frame+(col+.5)*dx;cz=z0+(row+.5)*dz
                poly=[(cx,cz-dz/2+web/2),(cx+dx/2-web/2,cz),(cx,cz+dz/2-web/2),(cx-dx/2+web/2,cz)]
                # Convex clipping by every head segment and rectangular lower/side limits.
                for P,Q in list(zip(inner,inner[1:]))+[((r-frame,z0),(l+frame,z0)),((l+frame,z0),(l+frame,z1)),((r-frame,z1),(r-frame,z0))]:
                    result=[]
                    def side(point):return (Q[0]-P[0])*(point[1]-P[1])-(Q[1]-P[1])*(point[0]-P[0])
                    for p,q in zip(poly,poly[1:]+poly[:1]):
                        a=side(p);b_=side(q)
                        if a<=1e-9:result.append(p)
                        if (a<=0)!=(b_<=0):
                            t=a/(a-b_);result.append(tuple(p[i]+t*(q[i]-p[i]) for i in range(2)))
                    poly=result
                    if len(poly)<3:break
                if len(poly)>=3:
                    pane=prism_profile(name+'-glass-pane',face,plane,poly,c-.02,c-.02+g['glassThicknessM'],'bz04_fixed_glass','receive')
                    paint_object(pane,g['paletteSrgb'][sequence[(row*columns+col)%len(sequence)]])
        # Web field remains timber behind the isolated glass cells.
        panel('glass-web-field',l+frame,r-frame,z0,z1,c-.028,c-.024,wood)


def portal_detail(face,plane,o,top):
    detail=o.get('architecturalDetail')
    if not detail:return
    profile=detail['profile'];name=o['id'];s=o['sillM'];l=top[0][0];r=top[-1][0];width=detail['surroundWidthM'];front=o.get('frontProjectionM',.08)
    if profile in ['planked-receiving','painted-domestic']:return
    if profile!='carved-timber-portal':raise ValueError(('unsupported portal profile',profile))
    material=detail.get('frameMaterialId',WOOD)
    # Two continuous nested bands follow the opening profile, including its head.
    for offset in [.012,.059]:
        lower=offset_top(top,offset);upper=offset_top(top,offset+.035)
        for i in range(len(top)-1):prism_profile(name+'-portal-head-band',face,plane,[lower[i],lower[i+1],upper[i+1],upper[i]],front-.018,front,material)
        for x,X in [(l-offset-.035,l-offset),(r+offset,r+offset+.035)]:part(face,plane,name+'-portal-jamb-band',(x,front-.018,s),(X,front,top[0][1]),material,bevel=.003)
    carving=detail.get('carving')
    if not carving:return
    inc=carving['incisionDepthM'];iw=carving['incisionWidthM'];pitch=carving['modulePitchM'];mw=carving['moduleWidthM'];mh=carving['moduleHeightM']
    for cx in [l-width/2,r+width/2]:
        bottom=s;z=s+.18+mh/2
        while z+mh/2<=top[0][1]-.18:
            cell_bottom=z-mh/2-.01;cell_top=z+mh/2+.01
            if cell_bottom>bottom:part(face,plane,name+'-portal-jamb',(cx-width/2,front-.024,bottom),(cx+width/2,front,cell_bottom),material)
            corners=[(cx-width/2,cell_bottom),(cx+width/2,cell_bottom),(cx+width/2,cell_top),(cx-width/2,cell_top)]
            diamond=[(cx,z-mh/2),(cx+mw/2,z),(cx,z+mh/2),(cx-mw/2,z)]
            inner=[(cx,z-mh/2+iw),(cx+mw/2-iw,z),(cx,z+mh/2-iw),(cx-mw/2+iw,z)]
            verts=[coords(face,plane,x,out,Z) for points,out in [(corners,front),(diamond,front),(inner,front-inc)] for x,Z in points]
            faces=[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]+[(4+i,4+(i+1)%4,8+(i+1)%4,8+i) for i in range(4)]+[(8,9,10,11)]
            mesh(name+'-lozenge-incision',verts,faces,material)
            part(face,plane,name+'-carving-receiver',(cx-width/2,front-.024,cell_bottom),(cx+width/2,front-inc-.001,cell_top),material)
            bottom=cell_top;z+=pitch
        if bottom<top[0][1]:part(face,plane,name+'-portal-jamb',(cx-width/2,front-.024,bottom),(cx+width/2,front,top[0][1]),material)


def shaped_opening(face,plane,o,trim,back):
    name=o['id'];a=o['alongM'];w=o['widthM'];s=o['sillM'];h=o['heightM'];dep=o['depthM'];front=o.get('frontProjectionM',.08);l=a-w/2;r=a+w/2;top=arch_points(o)
    trim=o.get('surroundMaterialId',trim);reveal=o.get('revealMaterialId',trim);sill=o.get('monolithicTrimMaterialId',o.get('sillMaterialId',trim))
    j=max(.10,o.get('trimWidthM',.1));outer=offset_top(top,j)
    receiver_front=front-.025 if o.get('architecturalDetail',{}).get('profile')=='carved-timber-portal' else front
    def b(n,lo,hi,m=trim,shadow='cast',bevel=0):return part(face,plane,name+'-'+n,lo,hi,m,shadow,bevel)
    for i,(p,q) in enumerate(zip(top,top[1:])):
        P,Q=outer[i],outer[i+1]
        prism_profile(name+'-arch-surround',face,plane,[p,q,Q,P],min(-.02,receiver_front-.01),receiver_front,trim)
        ceiling=s+h+j+.02
        prism_profile(name+'-spandrel',face,plane,[P,Q,(Q[0],ceiling),(P[0],ceiling)],-.02,0,back)
        mesh(name+'-barrel',[coords(face,plane,x,out,z) for out in [-dep,0] for x,z in [p,q]],[(0,1,3,2)],reveal)
    for L,H in [(l-j,l),(r,r+j)]:b('jamb',(L,-dep,s),(H,receiver_front,top[0][1]),reveal,bevel=.012 if o.get('finishFamily')=='domestic' else .008)
    for edge,limit in [(outer[0],l-j),(outer[-1],r+j)]:
        x0,x1=sorted([edge[0],limit])
        if x1-x0>1e-6:b('shoulder',(x0,-.02,edge[1]),(x1,0,s+h+j+.02),back)
    b('back',(l-j,-dep-.02,s),(r+j,-dep,s+h+j+.02),back)
    if o.get('galleryLight'):b('ceiling',(l,-dep,s+h),(r,-.30,s+h+.02),back)
    b('sill',(l-j,-dep,max(-.02,s-.06)),(r+j,front,max(.001,s)),sill)
    closure(face,plane,o,top)
    portal_detail(face,plane,o,top)

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


def cloth_path(name,face,plane,l,r,path,mid,thickness=.008,border=.035,color='#596778',uv_origin=(0,0),fringe=.02):
    """Closed folded textile with continuous arclength UVs and an inset bound edge."""
    lengths=[0]
    for p,q in zip(path,path[1:]):lengths.append(lengths[-1]+math.dist(p,q))
    total=lengths[-1]
    distances=sorted(set(lengths+[border,total-border,total-fringe]+[total*i/12 for i in range(13)]))
    end=total-fringe if fringe else total
    distances=[v for v in distances if 0<=v<=end]
    xs=[l,l+border,r-border,r]
    def point(x,d,back=False):
        k=next((i for i in range(len(lengths)-1) if lengths[i]<=d<=lengths[i+1]),len(lengths)-2)
        t=(d-lengths[k])/(lengths[k+1]-lengths[k]);out=path[k][0]*(1-t)+path[k+1][0]*t;z=path[k][1]*(1-t)+path[k+1][1]*t
        # Extrude into the fold, never beyond its prescribed outward envelope.
        return coords(face,plane,x,out-thickness if back else out,z)
    field_vs=[];field_fs=[];field_uv=[];edge_vs=[];edge_fs=[];edge_uv=[]
    for i,(d,D_) in enumerate(zip(distances,distances[1:])):
        for j,(x,X) in enumerate(zip(xs,xs[1:])):
            edge=j in [0,2] or d<border or D_>total-border
            vs,fs,uv=(edge_vs,edge_fs,edge_uv) if edge else (field_vs,field_fs,field_uv)
            for back in [False,True]:
                q=len(vs);vs.extend(point(a,t,back) for a,t in [(x,d),(X,d),(X,D_),(x,D_)])
                uv.extend(((a-l)/1.2+uv_origin[0],t/1.2+uv_origin[1]) for a,t in [(x,d),(X,d),(X,D_),(x,D_)])
                fs.append(tuple(q+k for k in ([0,3,2,1] if back else [0,1,2,3])))
    for side in [l,r]:
        for d,D_ in zip(distances,distances[1:]):
            q=len(edge_vs);edge_vs.extend([point(side,d),point(side,D_),point(side,D_,True),point(side,d,True)]);edge_fs.append((q,q+1,q+2,q+3));edge_uv.extend([(0,0)]*4)
    for d in [0,end]:
        q=len(edge_vs);edge_vs.extend([point(l,d),point(r,d),point(r,d,True),point(l,d,True)]);edge_fs.append((q,q+1,q+2,q+3));edge_uv.extend([(0,0)]*4)
    for vs,fs,uv,material,label in [(field_vs,field_fs,field_uv,mid,'field'),(edge_vs,edge_fs,edge_uv,'ph_bz04_hessian_230','bound-edge')]:
        if not vs:continue
        ob=mesh(name+'-'+label,vs,fs,material,'receive')
        for loop in ob.data.loops:ob.data.uv_layers.active.data[loop.index].uv=uv[loop.vertex_index]
        if label=='bound-edge':paint_object(ob,color,True)
    # Short separated threads follow the last path segment, inside the final 20 mm.
    if fringe:
        for i in range(max(2,int((r-l)/.03))):
            x=l+.01+i*(r-l-.02)/max(1,int((r-l)/.03)-1)
            ob=member(name+'-fringe',point(x,total-fringe,True),point(x,total-.003,True),.005,'ph_bz04_hessian_230','receive');paint_object(ob,color,True)


def hanging_rug(name,face,plane,lo,hi,mid,uv_origin=(0,0)):
    # One restrained gravity bow across depth; the hem and ties retain the schedule's box.
    center=(lo[1]+hi[1])/2;bow=min(.01,(hi[1]-lo[1]-.008)/2)
    path=[(center+bow*math.sin(math.pi*i/8),hi[2]-(hi[2]-lo[2])*i/8) for i in range(9)]
    cloth_path(name,face,plane,lo[0],hi[0],path,mid,uv_origin=uv_origin)


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
    elif f['kind']=='draped-rug':
        cloth_path(name,face,plane,l,r,f['foldPathOutZ'],mid,f['thicknessM'],f['borderWidthM'],f['borderColorSrgb'],fringe=f['fringeM'])
    elif f['kind']=='recessed-field':
        b('plaster-back',(l,-.10,z),(r,-.06,Z))
        for L,H in [((l,-.06,z),(l+.02,0,Z)),((r-.02,-.06,z),(r,0,Z)),((l,-.06,z),(r,0,z+.02)),((l,-.06,Z-.02),(r,0,Z))]:part(face,plane,name+'-reveal',L,H,PARCELS[f['receiverParcel']]['materialId'])


def _opening(face,plane,o,trim,back):
    if o.get("headShape","rectangular")!="rectangular":
        return shaped_opening(face,plane,o,trim,back)
    name=o['id'];a=o['alongM'];w=o['widthM'];s=o['sillM'];h=o['heightM'];top=s+h;dep=o['depthM'];l=a-w/2;r=a+w/2;kind=o['kind'];wood=o['closureMaterialId']
    trim=o.get('surroundMaterialId',trim);reveal=o.get('revealMaterialId',trim);sill=o.get('monolithicTrimMaterialId',o.get('sillMaterialId',trim))
    j=max(.10,o.get('trimWidthM',.1))
    front=o.get('frontProjectionM',.08)
    receiver_front=front-.025 if o.get('architecturalDetail',{}).get('profile')=='carved-timber-portal' else front
    def b(n,lo,hi,m=trim,shadow='cast',bevel=0):return part(face,plane,name+'-'+n,lo,hi,m,shadow,bevel)
    # The receiving chamber remains opaque; its returns physically reach the back.
    staff=o.get('shopfront',{}).get('staffAccess')
    if staff and staff['type']=='back-door':
        q=staff['localClearBox'];L=a+q['min'][0];H=a+q['max'][0];z0=s+.04;z1=z0+staff['clearHeightM']
        for lo,hi in [((l-.02,-dep-.02,s),(L,-dep,top+.02)),((H,-dep-.02,s),(r+.02,-dep,top+.02)),((L,-dep-.02,s),(H,-dep,z0)),((L,-dep-.02,z1),(H,-dep,top+.02))]:
            if all(hi[i]>lo[i] for i in range(3)):b('back',lo,hi,back)
        b('closed-staff-leaf',(L,-dep-.0175,z0),(H,-dep+.0175,z1),WOOD,bevel=.003)
        for x in [L-.05,H]:b('staff-jamb',(x,-dep-.025,z0),(x+.05,-dep+.025,z1+.05),WOOD)
        b('staff-head',(L,-dep-.025,z1),(H,-dep+.025,z1+.05),WOOD)
    else:b('back',(l-.02,-dep-.02,s),(r+.02,-dep,top+.02),back,bevel=0)
    if kind=='shop':b('chamber-ceiling',(l,-dep,top),(r,0,top+.02),back)
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
        else:b(side+'-return',(al,-dep,s),(ar,receiver_front,top),reveal,bevel=.012 if o.get('finishFamily')=='domestic' else .008)
    b('head',(l-j,-dep,top),(r+j,receiver_front,top+j),WOOD if kind=='shop' or o.get('finishFamily')=='workshop' else trim)
    if kind=='shop' or o.get('flushBase'):
        b('deck',(l,-dep,0),(r,0 if face=='north' else .20,.04),sill)
    else:
        if kind=='door':b('threshold',(l-j,-dep,max(-.02,s-.02)),(r+j,front,s+.01),sill)
        else:
            # Split the sill underside for its 8 mm drip, entirely inside the old envelope.
            b('sill',(l-j,-dep,s-.052),(r+j,front,s),sill,bevel=.008)
            for low,high in [(-dep,front-.024),(front-.016,front)]:
                if high>low:b('sill-drip',(l-j,low,s-.06),(r+j,high,s-.052),sill)
        closure(face,plane,o,arch_points(o))
    portal_detail(face,plane,o,arch_points(o))


def opening(face,plane,o,trim,back):
    before=set(bpy.context.scene.objects)
    _opening(face,plane,o,trim,back)
    if o.get('finishMaterialProfile')=='opaqueTimber' or o.get('closureMaterialId')=='bz04_teal_timber_project_original':
        for ob in set(bpy.context.scene.objects)-before:
            if ob.type=='MESH' and ob.data.materials[0]==mat('bz04_teal_timber_project_original'):
                paint_object(ob,o.get('finishPaintSrgb','#5d9c8a'))


def facade_field(face,plane,name,x,X,z,Z,mid):
    ob=mesh(name+'-field',[coords(face,plane,a,0,h) for a,h in [(x,z),(X,z),(X,Z),(x,Z)]],[(0,3,2,1) if face in ['south','east'] else (0,1,2,3)],mid)
    normal=Vector(local(coords(face,plane,0,1,0)))-Vector(local(coords(face,plane,0,0,0)))
    assert all(p.normal.dot(normal)>.999 for p in ob.data.polygons),(name,'inward exterior skin')
    return ob


def courtyard_opening(face,plane,o,trim,back):
    if o.get('architecturalDetail',{}).get('profile')=='carved-timber-portal':
        from types import SimpleNamespace
        merchant=runpy.run_path(str(ROOT/'assets/source/unit-rug-gate/build.py'))
        merchant['opening'].__globals__['G']=SimpleNamespace(**globals())
        return merchant['opening'](face,plane,o,trim,back)
    if o.get('finishMaterialProfile')=='warmTimber':o=dict(o,closureMaterialId=WOOD)
    opening(face,plane,o,trim,back)


def receiver_owned_end_caps():
    """The two installed link fronts also own caps of B's outer rear skins."""
    import bmesh
    from integrate_bz04 import load_handoff
    schedule=runpy.run_path(str(ROOT/'assets/source/unit-spawn-b-courtyard/build-receivers.py'))['RECEIVERS']
    for unit,ids in schedule.items():
        area=load_handoff(ROOT/'artifacts/bazaar-r7-whole-map'/unit/'handoff.json')['areas'][0]
        for face in area['faces']:
            for receiver in face['parcels']:
                if receiver['id'] not in ids:continue
                assert face['face']=='north'
                for parcel in (p for f in A['faces'] for p in f['parcels'] if p['buildingId']==receiver['buildingId']):
                    for ob in list(bpy.context.scene.objects):
                        if not (ob.name==parcel['id']+'-rear' or ob.name.startswith(parcel['id']+'-rear.')):continue
                        bm=bmesh.new();bm.from_mesh(ob.data);caps=[]
                        for polygon in bm.faces:
                            points=[(v.co.x+ORIGIN[0],ORIGIN[1]-v.co.y,v.co.z+ORIGIN[2]) for v in polygon.verts]
                            if all(abs(p[1]-face['wallPlaneM'])<1e-5 and receiver['interval'][0]-1e-5<=p[0]<=receiver['interval'][1]+1e-5 and receiver['floorElevationM']-1e-5<=p[2]<=receiver['wallTopM']+1e-5 for p in points):caps.append(polygon)
                        if caps:bmesh.ops.delete(bm,geom=caps,context='FACES_ONLY')
                        bm.to_mesh(ob.data);bm.free()


def courtyard():
    global part
    reset((17,78,0))
    from types import SimpleNamespace
    interfaces=runpy.run_path(str(ROOT/'assets/source/unit-fountain-court/receiver-interfaces.py'))
    receivers=runpy.run_path(str(ROOT/'assets/source/unit-spawn-b-courtyard/build-receivers.py'))['ADDITIONAL_UNITS']
    geometry=SimpleNamespace(part=part);original_part=part
    interfaces['install'](geometry,A,additional_units=receivers)
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
    shared_part=geometry.part
    def landing_part(face,plane,name,lo,hi,mid,shadow='cast',bevel=0):
        if name=='B_S_WEST-side' and abs(lo[0]-west_face['wallPlaneM'])<1e-8:
            assert face=='south'
            result=None
            for a,b in interfaces['difference'](lo,hi,(lo[0],west_wall['interval'][0]-plane,west_wall['floorElevationM']),
                    (hi[0],west_wall['interval'][1]-plane,west_wall['wallTopM'])):
                result=shared_part(face,plane,name,a,b,mid,shadow,bevel)
            return result
        if name!='B_S_WEST-rear':return shared_part(face,plane,name,lo,hi,mid,shadow,bevel)
        assert face=='south' and plane+lo[1]==landing_face['wallPlaneM']
        result=None
        for a,b in interfaces['difference'](lo,hi,(receiver_interval[0],lo[1],landing_wall['floorElevationM']),
                (receiver_interval[1],hi[1],landing_wall['wallTopM'])):
            result=shared_part(face,plane,name,a,b,mid,shadow,bevel)
        return result
    part=landing_part
    for f in A['faces']:
        face=f['face'];plane=f['wallPlaneM']
        for p in f['parcels']:
            l,r=p['interval'];height=p['wallTopM'];name=p['id'];mid=p['materialId'];trim=p['trimMaterialId'];dep=p['shellDepthM'];opens=[]
            for opening_spec in p['openings']:
                count=opening_spec.get('lightCount',1) if opening_spec.get('headShape')=='paired-pointed' else 1
                width=(opening_spec['widthM']-(count-1)*opening_spec.get('mullionM',0))/count
                for i in range(count):
                    o=dict(opening_spec)
                    if count>1:o.update(id=o['id']+'-light-'+str(i+1),widthM=width,alongM=o['alongM']-o['widthM']/2+width/2+i*(width+o['mullionM']),headShape='pointed',galleryLight='slat' in o.get('closure',''),finishLeafCount=1)
                    opens.append(o)
            masks=[dict(o,maskL=o['alongM']-o['widthM']/2-max(.1,o.get('trimWidthM',.1)),maskR=o['alongM']+o['widthM']/2+max(.1,o.get('trimWidthM',.1)),maskS=max(0,o['sillM']-.06),maskH=o['headM']+max(.1,o.get('trimWidthM',.1))+(.02 if o.get('headShape')!='rectangular' else 0)) for o in opens]
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
            for o in opens:courtyard_opening(face,plane,o,trim,mid)
    receiver_owned_end_caps()
    # The rear box's narrow side cap also meets the recessed link pier.
    import bmesh
    for ob in [o for o in bpy.context.scene.objects if o.name=='B_S_WEST-rear' or o.name.startswith('B_S_WEST-rear.')]:
        bm=bmesh.new();bm.from_mesh(ob.data)
        def on_link(face):
            points=[(v.co.x+ORIGIN[0],ORIGIN[1]-v.co.y,v.co.z+ORIGIN[2]) for v in face.verts]
            return all(abs(p[0]-west_face['wallPlaneM'])<1e-5 and west_wall['interval'][0]-1e-5<=p[1]<=west_wall['interval'][1]+1e-5 for p in points)
        caps=[f for f in bm.faces if on_link(f)]
        if caps:
            geometry=list(set(caps+[e for f in caps for e in f.edges]+[v for f in caps for v in f.verts]))
            bmesh.ops.bisect_plane(bm,geom=geometry,dist=1e-6,plane_co=(0,0,west_wall['wallTopM']-ORIGIN[2]),plane_no=(0,0,1))
            hidden=[f for f in bm.faces if on_link(f) and max(v.co.z+ORIGIN[2] for v in f.verts)<=west_wall['wallTopM']+1e-5]
            if hidden:bmesh.ops.delete(bm,geom=hidden,context='FACES_ONLY')
        bm.to_mesh(ob.data);bm.free()
    for feature in A['facadeFeatures']:facade_feature(feature)
    for g in A['activityGroups']:activity(g)
    for f in A['fixtures']:awning(f)
    part=original_part
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
        name=g['id']+'-'+item['id'];kind=item['kind'];mid=item['materialId'];before=set(bpy.context.scene.objects)
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
        elif kind=='bound-hanging-rug':
            hanging_rug(name,face,plane,lo,hi,mid,item.get('uvOriginM',(0,0)))
            for x in [lo[0]+.03,hi[0]-.03]:member(name+'-tie',coords(face,plane,x,(lo[1]+hi[1])/2,hi[2]-.01),coords(face,plane,x,-1.77,deck+2.4),.014,WOOD,'receive')
        elif kind=='horizontal-rolled-rug':
            vs=[];fs=[];cy=(lo[1]+hi[1])/2;cz=(lo[2]+hi[2])/2
            for x in [lo[0],hi[0]]:
                for j in range(24):t=j*math.pi/12;vs.append(coords(face,plane,x,cy+(hi[1]-lo[1])/2*math.cos(t),cz+(hi[2]-lo[2])/2*math.sin(t)))
            fs=[(i,(i+1)%24,(i+1)%24+24,i+24) for i in range(24)]
            # The roll face sits behind the visible spiral, with a closed cloth lip.
            for end,sign,outer_start in [(lo[0],1,0),(hi[0],-1,24)]:
                start=len(vs)
                for j in range(24):
                    t=j*math.pi/12;vs.append(coords(face,plane,end+sign*.004,cy+(hi[1]-lo[1])/2*math.cos(t),cz+(hi[2]-lo[2])/2*math.sin(t)))
                fs.extend((outer_start+j,outer_start+(j+1)%24,start+(j+1)%24,start+j) for j in range(24))
                fs.append(tuple(range(start,start+24)))
            ob=mesh(name,vs,fs,mid,'receive',True)
            for loop in ob.data.loops:
                index=loop.vertex_index;ob.data.uv_layers.active.data[loop.index].uv=((hi[0]-lo[0])*(0 if index//24 in [0,2] else 1)/1.2+item.get('uvOriginM',[0,0])[0],(index%24)/24*math.pi*(hi[1]-lo[1])/1.2)
            # Continuous visible spiral at each roll end, inset inside the cylinder envelope.
            for end in [lo[0]+.002,hi[0]-.002]:
                vertices=[];faces=[]
                for j in range(97):
                    t=j/96;angle=t*math.pi*6;radius=.12+.82*t
                    for offset in [-.0015,.0015]:
                        vertices.append(coords(face,plane,end,cy+((hi[1]-lo[1])*.5*radius+offset)*math.cos(angle),cz+((hi[2]-lo[2])*.5*radius+offset)*math.sin(angle)))
                    if j:faces.append((2*j-2,2*j-1,2*j+1,2*j))
                strand=mesh(name+'-rolled-edge',vertices,faces,'ph_bz04_hessian_230','receive');paint_object(strand,'#596778',True)
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
            if kind=='fitted-cloth-cushion' and mid=='bz04_levantine_rug_project_original':
                # Woven upholstery with a fitted bound edge, kept within its existing cushion silhouette.
                # Lower the cushion crown one millimetre so its bound seam is
                # visible without coplanar overlay or extending the target box.
                for vertex in ob.data.vertices:
                    if vertex.co.z+ORIGIN[2]>hi[2]-.001:vertex.co.z=hi[2]-.001-ORIGIN[2]
                z=hi[2]-.003
                for L,H in [((lo[0]+.025,lo[1]+.003,z),(hi[0]-.025,lo[1]+.028,z+.003)),((lo[0]+.025,hi[1]-.028,z),(hi[0]-.025,hi[1]-.003,z+.003)),((lo[0]+.003,lo[1]+.025,z),(lo[0]+.028,hi[1]-.025,z+.003)),((hi[0]-.028,lo[1]+.025,z),(hi[0]-.003,hi[1]-.025,z+.003))]:
                    edge=part(face,plane,name+'-bound-edge',L,H,'ph_bz04_hessian_230','receive');paint_object(edge,'#596778',True)
            if kind=='plank-shelf':
                for x in [lo[0]+.12,hi[0]-.12]:member(name+'-bracket',coords(face,plane,x,lo[1],lo[2]-.16),coords(face,plane,x,hi[1]-.01,lo[2]),.025,IRON,'receive')
            if 'hanging-rug' in kind:
                for x in [lo[0]+.03,hi[0]-.03]:member(name+'-tie',coords(face,plane,x,(lo[1]+hi[1])/2,hi[2]-.01),coords(face,plane,x,-1.77,deck+2.4),.014,WOOD,'receive')
            if kind=='bound-folded-textile':
                for x in [lo[0]+.12,hi[0]-.12]:b('-binding',[x,lo[1],lo[2]],[x+.018,hi[1],hi[2]],'ph_bz04_hessian_230')
        if item.get('stockColorSrgb'):
            for ob in set(bpy.context.scene.objects)-before:
                if ob.type=='MESH' and ob.data.materials[0]==mat(mid):paint_object(ob,item['stockColorSrgb'],mid in ['ph_bz04_hessian_230','ph_bz04_fine_linen'])
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
            t=0 if j==0 else 1 if j==8 else .025/dep if j==1 else 1-.025/dep if j==7 else j/8
            for i in range(17):
                u=0 if i==0 else 1 if i==16 else .025/(r-l) if i==1 else 1-.025/(r-l) if i==15 else i/16;vs.append(coords(face,plane,l+(r-l)*u,dep*t,z-drop*t-f['sagM']*math.sin(math.pi*t)*math.sin(math.pi*u)))
        for j in range(8):
            for i in range(16):q=j*17+i;fs.append((q,q+1,q+18,q+17))
        count=len(vs);vs=vs+[(x,y,h-.008) for x,y,h in vs];fs=fs+[tuple(v+count for v in reversed(face)) for face in fs]
        boundary=list(range(17))+[j*17+16 for j in range(1,9)]+list(range(8*17+15,8*17-1,-1))+[j*17 for j in range(7,0,-1)]
        for a,b in zip(boundary,boundary[1:]+boundary[:1]):fs.append((a,b,b+count,a+count))
        ob=mesh(name+'-cloth',vs,fs,f['materialId'])
        hem=f.get('hemColorSrgb',{'SHADE_B_N_TEXTILE':'#596778','SHADE_B_W_TEA':'#78978d'}.get(name,f.get('stockColorSrgb','#dfcfab')))
        # A per-face bound edge shares the cloth batch and stays on the membrane.
        existing=ob.data.color_attributes.get('COLOR_0')
        if existing:ob.data.color_attributes.remove(existing)
        colors=ob.data.color_attributes.new('COLOR_0','FLOAT_COLOR','CORNER')
        neutral=D['materials']['ph_bz04_hessian_230']['baseColorRecipe']['vertexPaintRecipe']['representativeNeutralGrainLinear']
        for poly in ob.data.polygons:
            ids=[ob.data.loops[k].vertex_index%count for k in poly.loop_indices]
            border_face=any(index%17 in [0,16] or index//17 in [0,8] for index in ids)
            color=hem if border_face else f.get('stockColorSrgb','#dfcfab');rgba=[_linear_channel(int(color[k:k+2],16))/neutral for k in (1,3,5)]
            assert max(rgba)<=1
            for index in poly.loop_indices:colors.data[index].color=(*rgba,1)
        ob.data.color_attributes.active_color=colors


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


def verify_b_shade_colors(payload,gltf):
    """Check the shipped vertex-color channel used by the runtime material."""
    raw=payload[28+struct.unpack_from('<I',payload,12)[0]:]
    neutral=D['materials']['ph_bz04_hessian_230']['baseColorRecipe']['vertexPaintRecipe']['representativeNeutralGrainLinear']
    expected=[tuple(_linear_channel(int(color[i:i+2],16))/neutral for i in (1,3,5)) for color in ('#dfcfab','#596778','#78978d')]
    actual=set()
    for node in gltf['nodes']:
        if 'mesh' not in node or node.get('extras',{}).get('bz04Shadow')!='cast':continue
        for primitive in gltf['meshes'][node['mesh']]['primitives']:
            if gltf['materials'][primitive['material']]['name']!='bz06_cream_woven_cloth':continue
            accessor=gltf['accessors'][primitive['attributes']['COLOR_0']]
            view=gltf['bufferViews'][accessor['bufferView']]
            fmt,size,scale={5126:('f',4,1),5123:('H',2,65535),5121:('B',1,255)}[accessor['componentType']]
            width={'VEC3':3,'VEC4':4}[accessor['type']];stride=view.get('byteStride',size*width)
            offset=view.get('byteOffset',0)+accessor.get('byteOffset',0)
            colors=[tuple(v/scale for v in struct.unpack_from('<'+fmt*width,raw,offset+i*stride)[:3]) for i in range(accessor['count'])]
            actual.update(colors)
            positions=gltf['accessors'][primitive['attributes']['POSITION']];position_view=gltf['bufferViews'][positions['bufferView']]
            position_offset=position_view.get('byteOffset',0)+positions.get('byteOffset',0);position_stride=position_view.get('byteStride',12)
            assert positions['componentType']==5126 and positions['count']==len(colors)
            for i,color in enumerate(colors):
                accent=next((k for k in (1,2) if max(abs(color[j]-expected[k][j]) for j in range(3))<2/65535),None)
                if accent is None:continue
                fixture=next(f for f in A['fixtures'] if f['id']==('SHADE_B_N_TEXTILE' if accent==1 else 'SHADE_B_W_TEA'))
                x,z,y=struct.unpack_from('<fff',raw,position_offset+i*position_stride);x+=ORIGIN[0];y+=ORIGIN[1]
                along=x if fixture['receiverFace']=='north' else y
                out=fixture['wallPlaneM']-y if fixture['receiverFace']=='north' else x-fixture['wallPlaneM']
                panel_edges=[fixture['interval'][0],*fixture['armAxesM'][1:-1],fixture['interval'][1]]
                assert fixture['interval'][0]-.0001<=along<=fixture['interval'][1]+.0001
                edge=min(*(abs(along-edge) for edge in panel_edges),out,fixture['projectionM']-out)
                assert -.0001<=edge<=.0251,('Exported shade hem exceeds 25 mm',fixture['id'],along,out,edge)

    assert len(actual)==3,('B shades lost their three COLOR_0 colors',actual)
    assert all(any(max(abs(a[i]-e[i]) for i in range(3))<2/65535 for a in actual) for e in expected),('B shade export paint differs from recipe',actual,expected)
    print('PASS exported B shade COLOR_0: calibrated cream, indigo and teal; colored hems stay within 25 mm on all edges',flush=True)


def export(path,bounds,tri_ceiling,primitive_ceiling,extras=None):
    path.parent.mkdir(parents=True,exist_ok=True)
    from bazaar_finish import apply as apply_bazaar_finish
    apply_bazaar_finish(globals(), path)
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];inventory=[];bpy.context.view_layer.update()
    for ob in meshes:
        prepare_mesh(ob)
        pts=[tuple(v.co) for v in ob.data.vertices];inventory.append({'id':ob.name,'material':ob.data.materials[0].name,'shadow':ob.get('bz04Shadow','cast'),'bounds':{'min':[min(v[i] for v in pts) for i in range(3)],'max':[max(v[i] for v in pts) for i in range(3)]},'triangles':sum(len(p.vertices)-2 for p in ob.data.polygons)})
    actual={'min':[min(i['bounds']['min'][j] for i in inventory) for j in (0,2,1)],'max':[max(i['bounds']['max'][j] for i in inventory) for j in (0,2,1)]};actual['min'][2],actual['max'][2]=-actual['max'][2],-actual['min'][2]
    if bounds:
        assert all(actual['min'][i]>=bounds['min'][i]-.001 and actual['max'][i]<=bounds['max'][i]+.001 for i in range(3)),(path.name,actual,bounds)
    else:bounds=actual
    bpy.context.scene['bz04VisualBounds']=bounds
    if path.stem==A['outputUnit']:
        bpy.context.scene['bz04Unit']=A['outputUnit']
        bpy.context.scene['bz04InputSha256']=FROZEN_INPUT_SHA
        bpy.context.scene['bz04FloorTreatment']=dict(A.get('floorTreatment',{}),zone=A['zone'],faces=[{'face':f['face'],'wallPlaneM':f['wallPlaneM'],'intervals':[p['interval'] for p in f['parcels']],'doors':[{k:o[k] for k in ['alongM','widthM','sillM','headM']} for p in f['parcels'] for o in p['openings'] if o['kind']=='door']} for f in A['faces']])
        bpy.context.scene['bz04BoundaryCoverage']=[{'orientation':'horizontal' if f['face'] in ['north','south'] else 'vertical','coord':f['wallPlaneM'],'start':p['interval'][0],'end':p['interval'][1]} for f in A['faces'] for p in f['parcels']]
    if extras:
        for k,v in extras.items():bpy.context.scene[k]=v
    groups={}
    for ob in meshes:groups.setdefault((ob.data.materials[0].name,ob.get('bz04Shadow','cast')),[]).append(ob)
    tris=sum(i['triangles'] for i in inventory)
    print('BUDGET',path.name,tris,len(groups),flush=True)
    section=path.stem==A['outputUnit']
    from integrate_bz04 import export_budget
    budget=export_budget(A,path.parent) if section else {'maxTriangles':tri_ceiling,'maxRenderedPrimitives':primitive_ceiling}
    if extras and extras.get('bz04SharedEnvironment'):budget.update(D['sharedEnvironment'])
    budget.update((extras or {}).get('bz04ExportBudget',{}))
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
        report={'inputSha256':FROZEN_INPUT_SHA,'designRevision':A.get('designRevision'), 'asset':str(path.relative_to(ROOT)),'triangles':tris,'primitives':len(groups),'castPrimitives':sum(s=='cast' for m,s in groups),'actualBoundsGltf':actual,'declaredBoundsGltf':bounds,'objects':inventory,'sha256':hashlib.sha256(stage.read_bytes()).hexdigest()}
        data=stage.read_bytes();g=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
        if path.stem=='unit-spawn-b-courtyard':verify_b_shade_colors(data,g)
        primitives=[(n,p) for n in g['nodes'] if 'mesh' in n for p in g['meshes'][n['mesh']]['primitives']]
        actual_triangles=sum(g['accessors'][p['indices']]['count']//3 for n,p in primitives)
        report.update(triangles=actual_triangles,sourcePolygonTriangles=tris,primitives=len(primitives),castPrimitives=sum(n.get('extras',{}).get('bz04Shadow')=='cast' for n,p in primitives),materials=[m['name'] for m in g['materials']])
        report['exportBudget']=budget
        report['budget']=runpy.run_path(str(ROOT/'assets/source/unit-spawn-b-courtyard/verify.py'))['report_budget'](report,budget)
        stage.with_suffix('.inspection.json').write_text(json.dumps(report,indent=2)+'\n')
        for suffix in ['.blend','.glb','.inspection.json']:stage.with_suffix(suffix).replace(path.with_suffix(suffix))
        REPORT.append(report)
        print('BZ04 EXPORT',path.name,actual_triangles,'triangles',len(primitives),'primitives; performance deferred; over target:',report['budget']['overTarget'],flush=True)



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
        # Shared-edge records can span the lower neighbor beyond this high cell.
        # Export only the return supported by the owning high roof footprint.
        axis=0 if x!=X else 1
        start,end=(x,X) if axis==0 else (y,Y)
        a=max(min(start,end),c['footprint'][axis]);b=min(max(start,end),c['footprint'][axis+2])
        if b<=a:continue
        a,b=(a,b) if end>start else (b,a)
        t0,t1=(a-start)/(end-start),(b-start)/(end-start)
        z0,z1=z0+(z1-z0)*t0,z0+(z1-z0)*t1
        if axis==0:x,X=a,b
        else:y,Y=a,b
        # A planar, thick return closes the height step without overlaying the lower street face.
        side=e['sideOnHighCell'];dx=.02 if side=='west' else -.02 if side=='east' else 0;dy=.02 if side=='south' else -.02 if side=='north' else 0
        vs=[(x,y,z0),(X,Y,z1),(X,Y,top),(x,y,top),(x+dx,y+dy,z0),(X+dx,Y+dy,z1),(X+dx,Y+dy,top),(x+dx,y+dy,top)]
        mesh(e['id'],vs,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],p['materialId'])
    for seam in R['sharedSameHeightSeams']:
        if seam['id'] not in bundle['ownedSameHeightSeamIds'] or len(seam['ownerIds'])<2:continue
        x,y=seam['startXY'];X,Y=seam['endXY'];z=min(seam['finishAtEdgeM']['first']+seam['finishAtEdgeM']['second'])-.02
        mid=PARCELS[cellmap[seam['roofCellIds'][0]]['sourceGeometry'][0]['parcelId']]['materialId']
        lo=[min(x,X),min(y,Y),z];hi=[max(x,X),max(y,Y),seam['capTopM']]
        axis=0 if x==X else 1
        # Seat the complete party wall within its owning bundle at outside edges.
        # A centered wall would protrude 80 mm beyond the declared 30 mm cap.
        bounds=bundle['worldBoundsDesign']
        lo[axis]=max(bounds['min'][axis],min(lo[axis]-.08,bounds['max'][axis]-.16))
        hi[axis]=lo[axis]+.16
        box(seam['id']+'-upstand',lo,hi,mid)
    owners={c['ownerId'] for c in cells}
    for c in R['collectors']:
        if c['ownerId'] not in owners:continue
        x,y,z=c['pointXYZ'];bounds=next(cell['footprint'] for cell in cells if cell['ownerId']==c['ownerId'] and cell['footprint'][0]-.001<=x<=cell['footprint'][2]+.001 and cell['footprint'][1]-.001<=y<=cell['footprint'][3]+.001)
        box(c['id'],(max(x-.045,bounds[0]),max(y-.045,bounds[1]),z-.025),(min(x+.045,bounds[2]),min(y+.045,bounds[3]),z+.002),IRON,'receive')
    path=ROOT/'assets/source'/bundle['installationOutputUnit']/bundle['plannedModelFile']
    export(path,bundle['localBoundsGltfYUp'],bundle['declaredAllocation']['triangles']['total'],bundle['declaredAllocation']['primitives']['total'],{'bz04RoofBundle':bundle['id'],'bz04RetirementCoverage':bundle['retirementScope']['coverageXY'],'bz04RoofPhasePrimitiveAllowance':bundle.get('phasePrimitiveAllowance',0)})


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
    global FROZEN_INPUT_SHA
    if '--handoff' not in sys.argv:raise ValueError('Build requires --handoff <saved handoff.json>; run construction/handoff.py first')
    saved=json.loads(Path(sys.argv[sys.argv.index('--handoff')+1]).read_text())
    encoded={k:v for k,v in saved.items() if k not in {'source','designSha256','reading','inputSha256'}}
    assert saved.get('unit')=='unit-spawn-b-courtyard' and hashlib.sha256(json.dumps(encoded,sort_keys=True,separators=(',',':')).encode()).hexdigest()==saved.get('inputSha256'),'Corrupt B frozen handoff'
    import runpy
    extract=runpy.run_path(str(ROOT/'docs/map-design/construction/handoff.py'))['extract']
    current=extract('unit-spawn-b-courtyard',D,R)
    if saved.get('inputSha256')!=current['inputSha256']:raise ValueError('Area inputs changed since handoff extraction; resolve the changed issue before building')
    FROZEN_INPUT_SHA=current['inputSha256']
    for face in A['faces']:
        for parcel in face['parcels']:
            for opening_spec in parcel['openings']:
                assert opening_spec.get('headShape','rectangular') in {'rectangular','pointed','segmental','paired-pointed'},opening_spec['id']
                assert opening_spec['depthM']>0 and opening_spec['widthM']>0 and opening_spec['heightM']>0,opening_spec['id']
    supported={'screened-balcony','timber-hood','hoist','gallery-sill','recessed-field','draped-rug'}
    unsupported=[(f['id'],f['kind']) for f in A['facadeFeatures'] if f['kind'] not in supported]
    assert not unsupported,('unsupported facade features',unsupported)
    supported_parts={'arabian-coffee-pot','bound-folded-textile','bound-hanging-rug','contained-lancet-plant','contained-soil','fitted-cloth-cushion','folded-cloth','framed-timber-end','grounded-counter-carcass','grounded-plank-chest','hollow-stone-trough','horizontal-rolled-rug','lidded-ceramic-jar','lidded-tea-canister','open-ceramic-bowl','open-ceramic-cup','plank-board','plank-shelf','stacked-ceramic-plate','timber-member'}
    assert set(saved['requiredCapabilities']['partKinds'])<=supported_parts,'Unsupported B trade geometry'
    assert A['implementationPhase']['id'] in {'B-04-only','B-05-finish-only'},'unsupported installation phase'


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
    assert not shader.inputs['Base Color'].is_linked and tuple(shader.inputs['Base Color'].default_value)==(1,1,1,1),'opaque paint requires a white untextured base'
    assert shader.inputs['Metallic'].default_value==0
    for ident in ['B_N_POTTER-L1-B1','B_N_HOUSE-L2-B1','B_N_HOUSE_DOOR','B_W_HOUSE-L1-B1']:
        spec=next(o for f in A['faces'] for p in f['parcels'] for o in p['openings'] if o['id']==ident)
        spec=dict(spec,alongM=0)
        if spec['headShape']=='paired-pointed':spec.update(headShape='pointed',widthM=.625,finishLeafCount=1)
        reset((0,0,0));courtyard_opening('north',0,spec,TRIM,'ph_bz04_painted_plaster_warm')
        for ob in list(bpy.context.scene.objects):prepare_mesh(ob)
        assert len([ob for ob in bpy.context.scene.objects if '-frame-jamb' in ob.name])==2,('missing perimeter jambs',ident)
        if 'louver' in spec['closure']:assert any('-louver' in ob.name for ob in bpy.context.scene.objects)
        if spec.get('glazingProfile'):assert any('-glass-pane' in ob.name for ob in bpy.context.scene.objects),'missing shaped glass'
        if spec.get('architecturalDetail'):
            assert any('-lozenge-incision' in ob.name for ob in bpy.context.scene.objects),'missing carving'
            detail=spec['architecturalDetail'];carving=detail['carving'];front=spec['frontProjectionM']
            for sign in (-1,1):
                along=sign*(spec['widthM']/2+detail['surroundWidthM']/2)
                for z,expected_depth in ((.205,carving['incisionDepthM']),(.275,0)):
                    surface=Vector(local(coords('north',0,along,front,z)));start=surface+Vector((0,.02,0));hits=[]
                    for ob in bpy.context.scene.objects:
                        hit,point,normal,index=ob.ray_cast(start,Vector((0,-1,0)),distance=.08)
                        if hit:hits.append((surface.y-point.y,ob.name))
                    nearest=min(depth for depth,name in hits)
                    assert abs(nearest-expected_depth)<1e-5,('B carved jamb depth',along,z,hits)
                    assert sum(abs(depth-nearest)<1e-5 for depth,name in hits)==1,('B duplicate visible jamb surface',along,z,hits)

        if spec.get('finishMaterialProfile')=='opaqueTimber':
            expected=tuple(_linear_channel(int(spec['finishPaintSrgb'][i:i+2],16)) for i in (1,3,5))
            for ob in bpy.context.scene.objects:
                if ob.data.materials[0]==mat('bz04_teal_timber_project_original'):assert all(abs(ob.data.color_attributes['COLOR_0'].data[0].color[i]-expected[i])<1e-6 for i in range(3))
    reset((0,0,0))
    assert mat(WOOD).get('bz05FinishProfile')==A['finishSchedule']['materials']['warmTimber']['exportName']
    assert mat('bz04_teal_timber_project_original').get('bz05FinishProfile')==A['finishSchedule']['materials']['opaqueTimber']['exportName']
    spec=next(o for f in A['faces'] for p in f['parcels'] for o in p['openings'] if o['id']=='B_N_TEXTILE-L1-B3')
    courtyard_opening('north',0,dict(spec,alongM=0),TRIM,'ph_bz04_beige_wall_002')
    frame=bpy.data.objects[spec['id']+'-frame-jamb']
    assert frame.data.materials[0]==mat(WOOD),'B warmTimber opening bypassed private finish'
    reset((17,78,0));rug=next(f for f in A['facadeFeatures'] if f['kind']=='draped-rug');facade_feature(rug)
    for ob in bpy.context.scene.objects:
        prepare_mesh(ob)
        for v in ob.data.vertices:
            world=(v.co.x+17,78-v.co.y,v.co.z)
            assert all(rug['bbox']['min'][i]-.001<=world[i]<=rug['bbox']['max'][i]+.001 for i in range(3)),('rug bounds',world)
    print('PASS R7 B fixtures: normals, screen voids, shaped leaves/louvers, incised portal, clipped glass, opaque paint, bounded rail rug',flush=True)


if __name__=='__main__':
    try:
        if 'self-test' in sys.argv:self_test()
        else:
            validate_inputs()
            courtyard()
            if A['implementationPhase']['id']=='B-04-only' and 'section-only' not in sys.argv:local_gate_caps()
    except Exception:
        import traceback
        traceback.print_exc()
        sys.exit(1)
