"""Small, deterministic finish assemblies in the existing face/plane frame.

Callers select clear wall rectangles and bearing surfaces. Coordinates are
absolute design metres; these helpers never change collision or export assets.
"""
import hashlib
import math


def _rectangle(face, plane, along, bottom, width, height):
    if face not in {'north', 'south', 'east', 'west'}:
        raise ValueError('Unknown receiver face: '+str(face))
    if not all(math.isfinite(v) for v in (plane, along, bottom, width, height)):
        raise ValueError('Receiver dimensions must be finite')
    if width <= .12 or height <= .12:
        raise ValueError('Finish assembly needs at least 120 mm in each dimension')


def _color(color):
    if not isinstance(color, str) or len(color) != 7 or color[0] != '#':
        raise ValueError('Paint must be #RRGGBB')
    int(color[1:], 16)


def _surface(G, name, point, us, vs, material):
    """Closed gridded textile, preserving continuous whole-piece UV coordinates."""
    vertices = [point(u, v, back) for back in (False, True) for v in vs for u in us]
    nu, nv = len(us), len(vs)
    count = nu*nv
    faces = []
    for j in range(nv-1):
        for i in range(nu-1):
            a = j*nu+i
            faces += [(a, a+1, a+1+nu, a+nu),
                      (a+count+nu, a+count+nu+1, a+count+1, a+count)]
    boundary = (list(range(nu)) + [j*nu+nu-1 for j in range(1, nv)]
                + list(range(count-2, count-nu-1, -1))
                + [j*nu for j in range(nv-2, 0, -1)])
    faces += [(a, a+count, b+count, b) for a, b in zip(boundary, boundary[1:]+boundary[:1])]
    ob = G.mesh(name, vertices, faces, material, 'receive')
    if material == 'bz04_levantine_rug_project_original':
        uv = [(u, v) for _ in (False, True) for v in vs for u in us]
        for loop in ob.data.loops:
            ob.data.uv_layers.active.data[loop.index].uv = uv[loop.vertex_index]
    return ob


def wall_textile(G, name, face, plane, along, bottom, width, height,
                 color='#a4442c', kind='banner', hem_color='#cfaa64'):
    """Hang a rug or banner with rod, paired brackets, ties, hems and bottom weight.

    Cloth fits the supplied rectangle; hardware extends 70 mm beyond each side
    and 70 mm above it. Bracket plates bear on the wall at out=0; cloth and
    hardware remain inside out=0..0.23 m.
    """
    _rectangle(face, plane, along, bottom, width, height)
    _color(color); _color(hem_color)
    if kind not in {'rug', 'banner'}:
        raise ValueError('Textile kind must be rug or banner')
    left, top = along-width/2, bottom+height
    cloth = 'bz04_levantine_rug_project_original' if kind == 'rug' else 'ph_bz04_fine_linen'
    objects = []

    def field(u, v, back=False, lift=0):
        # Gravity bow grows below the suspension; small unequal folds break a flat sheet.
        wave = math.sin(math.pi*(1-v))
        out = .15 + .035*wave + .012*math.sin(u*math.tau*2+.4)*wave
        z = bottom+height*v + .016*math.sin(math.pi*u)*(1-v)
        return G.coords(face, plane, left+width*u, out+lift-(.006 if back else 0), z)

    us = [i/16 for i in range(17)]
    vs = [i/20 for i in range(21)]
    ob = _surface(G, name+'-field', field, us, vs, cloth)
    ob['bz04Shadow'] = 'cast'
    if kind == 'banner':
        G.paint_object(ob, color, True)
    objects.append(ob)
    # Independent sewn edging follows the same folds and covers no tiled rug fragments.
    hem_u, hem_v = min(.025/width, .06), min(.025/height, .06)
    for suffix, U, V in [
        ('left-hem', [0, hem_u], vs), ('right-hem', [1-hem_u, 1], vs),
        ('lower-hem', [hem_u]+[u for u in us if hem_u < u < 1-hem_u]+[1-hem_u], [0, hem_v]),
        ('upper-hem', [hem_u]+[u for u in us if hem_u < u < 1-hem_u]+[1-hem_u], [1-hem_v, 1]),
    ]:
        ob = _surface(G, name+'-'+suffix, lambda u,v,b: field(u,v,b,.007), U, V, 'ph_bz04_fine_linen')
        G.paint_object(ob, hem_color, True)
        objects.append(ob)
    if kind == 'banner':
        # A single woven lozenge identifies a trader without turning the cloth into signage.
        u, v = .5, .64
        du, dv = min(.12, .12/width), min(.11, .16/height)
        corners = [(u, v-dv), (u+du, v), (u, v+dv), (u-du, v)]
        verts = [field(a,b,back,.014) for back in (False,True) for a,b in corners]
        ob = G.mesh(name+'-woven-lozenge', verts,
                    [(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],
                    'ph_bz04_fine_linen','receive')
        G.paint_object(ob, hem_color, True); objects.append(ob)
    rod_z = top+.04
    objects.append(G.member(name+'-timber-rod', G.coords(face,plane,left-.06,.15,rod_z),
                            G.coords(face,plane,left+width+.06,.15,rod_z), .022, G.WOOD,'receive'))
    for index, a in enumerate((left-.035, left+width+.035)):
        objects.append(G.part(face,plane,name+f'-bracket-{index}',
                              (a-.013,0,top-.04),(a+.013,.066,top+.07),G.IRON,'receive',.003))
        objects.append(G.member(name+f'-rod-support-{index}',G.coords(face,plane,a,.055,top-.018),
                                G.coords(face,plane,a,.15,rod_z),.014,G.IRON,'receive'))
    for index, u in enumerate((.07,.34,.66,.93)):
        a = left+width*u
        path = [(.146,top-.014),(.166,rod_z),(.15,rod_z+.017),(.131,rod_z),(.144,top-.014)]
        for segment, (p,q) in enumerate(zip(path,path[1:])):
            ob = G.member(name+f'-tie-{index}-{segment}',G.coords(face,plane,a,*p),
                          G.coords(face,plane,a,*q),.007,'ph_bz04_fine_linen','receive')
            G.paint_object(ob,hem_color,True);objects.append(ob)
    objects.append(G.member(name+'-lower-weight',field(.03,.012,True),field(.97,.012,True),
                            .014,G.WOOD,'receive'))
    return objects


def plaster_loss(G, name, face, plane, along, bottom, width, height,
                 stone_material='ph_bz04_sandstone_blocks_06',
                 plaster_material='ph_bz04_aged_plaster_ochre', surface_out=0):
    """One bounded exposed-stone patch with a chipped plaster lip, without cutting wall.

    The given rectangle must be uninterrupted plaster. Geometry sits 3..12 mm
    above surface_out; the irregular edge stays inside the rectangle.
    """
    _rectangle(face,plane,along,bottom,width,height)
    if not math.isfinite(surface_out):
        raise ValueError('Wall surface offset must be finite')
    outline = [(.09,.12),(.27,.03),(.48,.09),(.66,.035),(.89,.18),(.95,.40),
               (.85,.55),(.91,.76),(.68,.95),(.45,.87),(.25,.97),(.07,.73),(.12,.48),(.025,.30)]
    # Stable radial variation changes individual chips without moving the patch
    # or changing vertex order. The 1.03 maximum keeps every edge inside its box.
    seed = hashlib.sha256(name.encode('utf-8')).digest()
    outline = [(.5+(u-.5)*(.88+.15*seed[i]/255),
                .5+(v-.5)*(.88+.15*seed[i]/255))
               for i,(u,v) in enumerate(outline)]
    inset = [(.5+(u-.5)*.92,.5+(v-.5)*.92) for u,v in outline]
    def p(uv,out):
        u,v=uv
        return G.coords(face,plane,along+(u-.5)*width,surface_out+out,bottom+v*height)
    n=len(outline)
    # A shallow closed substrate patch retains source stone grain; the raised lip supplies depth.
    vertices=[p(v,o) for o in (.003,.005) for v in inset]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    stone=G.mesh(name+'-exposed-stone',vertices,faces,stone_material,'receive')
    verts=[p(v,o) for ring,o in ((outline,.004),(inset,.011)) for v in ring]
    verts += [p(v,.003) for ring in (outline,inset) for v in ring]
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces += [(i,j,j+n,i+n),(i+2*n,i+3*n,j+3*n,j+2*n),
                  (i,i+2*n,j+2*n,j),(i+n,j+n,j+3*n,i+3*n)]
    lip=G.mesh(name+'-broken-plaster-edge',verts,faces,plaster_material,'receive')
    return [stone,lip]


def ceramic_pots(G, name, face, plane, along, bottom, width=.9, depth=.42,
                 colors=('#a14c32','#247b79','#bc8944')):
    """Three bearing-grounded glazed jars within a caller-cleared width/depth box.

    The group occupies out=0.04..depth+0.04 and height <= 0.54 m. The helper
    reuses G.lathe; it requires the existing white-base ceramic finish profile.
    """
    _rectangle(face,plane,along,bottom,width,depth)
    if width < .55 or depth < .24 or len(colors) != 3:
        raise ValueError('Three jars require width >= .55 m, depth >= .24 m, and three colors')
    for color in colors:_color(color)
    objects=[]
    for index,(u,fraction,height) in enumerate(((.17,.28,.36),(.51,.32,.54),(.83,.26,.28))):
        diameter=min(width*fraction,depth)
        a=along-width/2+width*u
        lo=(a-diameter/2,.04+(depth-diameter)/2,bottom)
        hi=(a+diameter/2,.04+(depth+diameter)/2,bottom+height)
        before=set(G.bpy.context.scene.objects)
        G.lathe(name+f'-jar-{index}',face,plane,lo,hi,'bz04_ceramic_project_original','jar')
        for ob in set(G.bpy.context.scene.objects)-before:
            G.paint_object(ob,colors[index]);objects.append(ob)
    return objects
