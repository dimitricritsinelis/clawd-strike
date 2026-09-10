"""Read-only evaluated surface measurements. Import, then measure_scene(output_dir).

Distances are metres internally. A nearest-face signed offset is guidance, never
solid penetration. Triangle intersection is tested explicitly after BVH culling.
"""
import bpy
import hashlib
import json
import time
from collections import Counter, defaultdict
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

EPS = 1e-7
# Run-01 approved intended-pulp frame. This is a fixed design inference from
# axis-comparison/derived-axes.json, not the former edge-contact seed normal.
BROAD_PULP_TRANSVERSE_REST = (0.8590225216119131, 0.5115140019660191, -0.02082626121553271)
BROAD_PULP_LONGITUDINAL_BAND = (.25, .9)
BROAD_PULP_DERIVATION = 'run-01/diagnostics/axis-comparison/derived-axes.json: L_thumb.03.pad_transverse_rest; intended broad suede/pulp center approved for run-01 testing.'



def _inside(p, triangle, normal):
    return all(normal.dot((triangle[(i+1)%3]-triangle[i]).cross(p-triangle[i])) >= -EPS * normal.length * (triangle[(i+1)%3]-triangle[i]).length for i in range(3))


def _intersection(a, b):
    """Triangle/triangle narrowphase, including coplanar edge/containment cases."""
    na = (a[1]-a[0]).cross(a[2]-a[0]); nb = (b[1]-b[0]).cross(b[2]-b[0])
    if min(na.length, nb.length) < 1e-14:
        return []
    na.normalize(); nb.normalize()
    da = [(p-b[0]).dot(nb) for p in a]; db = [(p-a[0]).dot(na) for p in b]
    if min(da) > EPS or max(da) < -EPS or min(db) > EPS or max(db) < -EPS:
        return []
    points = []
    if na.cross(nb).length < 1e-6:
        if max(abs(d) for d in da) > EPS: return []
        for p in a:
            if _inside(p,b,nb): points.append(p.copy())
        for p in b:
            if _inside(p,a,na): points.append(p.copy())
        axis = max(range(3),key=lambda i:abs(na[i])); ij=[i for i in range(3) if i!=axis]
        cross=lambda u,v:u[ij[0]]*v[ij[1]]-u[ij[1]]*v[ij[0]]
        for i in range(3):
            p=a[i];r=a[(i+1)%3]-p
            for j in range(3):
                q=b[j];s=b[(j+1)%3]-q;den=cross(r,s)
                if abs(den)<1e-15:continue
                t=cross(q-p,s)/den;u=cross(q-p,r)/den
                if 0<=t<=1 and 0<=u<=1:points.append(p+r*t)
    else:
        for tri,other,n in [(a,b,nb),(b,a,na)]:
            for i in range(3):
                p=tri[i];q=tri[(i+1)%3];d0=(p-other[0]).dot(n);d1=(q-other[0]).dot(n)
                if abs(d0)<=EPS and _inside(p,other,n):points.append(p.copy())
                if d0*d1<0:
                    hit=p+(q-p)*(d0/(d0-d1))
                    if _inside(hit,other,n):points.append(hit)
    unique=[]
    for p in points:
        if not any((p-q).length<EPS for q in unique):unique.append(p)
    return unique


def narrowphase_self_test():
    a=tuple(Vector(p) for p in [(0,0,0),(1,0,0),(0,1,0)])
    cases={
        'coplanar_disjoint_overlapping_bounds': ([(.8,.8,0),(1,.8,0),(.8,1,0)],False),
        'coplanar_containment': ([(.1,.1,0),(.2,.1,0),(.1,.2,0)],True),
        'parallel_separated': ([(0,0,.1),(1,0,.1),(0,1,.1)],False),
        'transverse_crossing': ([(.2,.2,-1),(.2,.2,1),(.8,.2,0)],True),
        'vertex_touch': ([(1,0,0),(2,0,0),(1,-1,0)],True),
        'degenerate': ([(.2,.2,0),(.2,.2,0),(.2,.2,0)],False),
    }
    results={}
    for name,(points,expected) in cases.items():
        actual=bool(_intersection(a,tuple(Vector(p) for p in points)))
        if actual!=expected:raise RuntimeError('Triangle narrowphase self-test failed: '+name)
        results[name]=actual
    return results


def _geometry(ob, depsgraph):
    evaluated=ob.evaluated_get(depsgraph);mesh=evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        return ([ob.matrix_world@v.co for v in mesh.vertices], [tuple(t.vertices) for t in mesh.loop_triangles])
    finally:evaluated.to_mesh_clear()


def _topology(vertices,triangles):
    welded={};ids=[]
    for p in vertices:
        key=tuple(round(c/EPS) for c in p)
        ids.append(welded.setdefault(key,len(welded)))
    edges=defaultdict(list);degenerate=0
    for face,t in enumerate(triangles):
        v=[ids[i] for i in t]
        degenerate+=len(set(v))<3 or (vertices[t[1]]-vertices[t[0]]).cross(vertices[t[2]]-vertices[t[0]]).length<1e-14
        for a,b in zip(v,v[1:]+v[:1]):edges[tuple(sorted((a,b)))].append((face,a,b))
    boundary=sum(len(e)==1 for e in edges.values());nonmanifold=sum(len(e)>2 for e in edges.values())
    winding=sum(len(e)==2 and e[0][1:]==e[1][1:] for e in edges.values())
    return {'triangles':len(triangles),'rawVertices':len(vertices),'diagnosticWeldM':EPS,'weldedVertices':len(welded),'boundaryEdges':boundary,'overConnectedEdges':nonmanifold,'inconsistentPairedWinding':winding,'degenerateFaces':degenerate,'closedSolidCertified':False,'note':'Edge audit does not resolve T-junctions or self-intersections; no containment certification.'}


def semantic_snapshot():
    """Small semantic protection record; compare protected subsets externally."""
    result={}
    for name in ['Magazine','AK47_Rig','R_Armature','L_Armature']:
        ob=bpy.data.objects.get(name)
        if not ob:continue
        data={'matrixWorld':[list(r) for r in ob.matrix_world]}
        if ob.type=='ARMATURE':data['restBones']={b.name:{'matrix':[list(r) for r in b.matrix_local],'length':b.length} for b in ob.data.bones}
        ad=ob.animation_data
        data['animation']={'active':ad.action.name if ad and ad.action else None,'tracks':[(t.name,t.mute,[(s.action.name,s.frame_start,s.frame_end,s.blend_type) for s in t.strips]) for t in ad.nla_tracks]} if ad else None
        result[name]=data
    return result


def measure_scene(output_dir=None):
    started=time.monotonic();selftest=narrowphase_self_test();scene=bpy.context.scene;dg=bpy.context.evaluated_depsgraph_get();dg.update()
    rig=bpy.data.objects['L_Armature'];mag=bpy.data.objects['Magazine_Surfaces']
    mv,mt=_geometry(mag,dg);mtri=[tuple(mv[i] for i in t) for t in mt];tree=BVHTree.FromPolygons(mv,mt,all_triangles=True)
    invmag=mag.matrix_world.inverted()
    report={'schema':1,'inputBlend':bpy.data.filepath,'inputBlendSha256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest() if bpy.data.filepath else None,'narrowphaseSelfTest':selftest,'frame':scene.frame_current,'subframe':scene.frame_subframe,'units':'mm, mm2 unless named otherwise','epsilonM':EPS,'magazine':_topology(mv,mt),'meshes':{},'regionDefinition':{'method':'Majority of dominant bind vertex-group labels per triangle; SupportHand includes complete palm/thenar/web, never excluded by thumb-weight threshold. Labels unchanged when weights unchanged.','landmarks':{b.name:{'restHead':list(b.head_local),'restTail':list(b.tail_local)} for b in rig.data.bones if b.name.startswith('L_thumb.') or b.name=='SupportHand'}},'semantic':semantic_snapshot()}
    # Repeatable sections use current magazine coordinates; they are evidence,
    # not a capped replacement collision solid.
    sections={str(z):{'magazine':[],'glove':[]} for z in [-.03,-.06,-.09]}
    def section(vertices,triangles,key):
        local=[invmag@v for v in vertices]
        for ztext,s in sections.items():
            z=float(ztext)
            for t in triangles:
                pts=[]
                for i in range(3):
                    a=local[t[i]];b=local[t[(i+1)%3]]
                    if (a.z-z)*(b.z-z)<0:pts.append(a+(b-a)*((z-a.z)/(b.z-a.z)))
                if len(pts)==2:s[key].append([list(p) for p in pts])
    section(mv,mt,'magazine')
    for ob in scene.objects:
        if ob.type!='MESH' or not any(m.type=='ARMATURE' and m.object==rig for m in ob.modifiers):continue
        vertices,triangles=_geometry(ob,dg)
        if len(vertices)!=len(ob.data.vertices):
            raise RuntimeError('Evaluated topology differs; cannot use bind labels: '+ob.name)
        labels=[]
        for v in ob.data.vertices:
            groups=[(g.weight,ob.vertex_groups[g.group].name) for g in v.groups]
            labels.append(max(groups)[1] if groups else 'unweighted')
        regions=[]
        for t in triangles:regions.append(Counter(labels[i] for i in t).most_common(1)[0][0])
        skintri=[tuple(vertices[i] for i in t) for t in triangles]
        candidates=BVHTree.FromPolygons(vertices,triangles,all_triangles=True).overlap(tree)
        hit_faces=set();counts=Counter();examples=[];pairs=0
        for i,j in candidates:
            pts=_intersection(skintri[i],mtri[j])
            if not pts:continue
            pairs+=1;hit_faces.add(i)
            if len(examples)<32:examples.append({'skinTriangle':i,'magazineTriangle':j,'region':regions[i],'pointsMagazineLocal':[list(invmag@p) for p in pts]})
        areas=defaultdict(float)
        for i in hit_faces:
            a,b,c=skintri[i];areas[regions[i]]+=(b-a).cross(c-a).length*.5*1e6;counts[regions[i]]+=1
        offsets=defaultdict(lambda:{'minimumLocalSignedOffsetMM':1e9,'samples':0})
        for i,p in enumerate(vertices):
            q,n,_,_=tree.find_nearest(p);d=(p-q).dot(n)*1000
            offsets[labels[i]]['minimumLocalSignedOffsetMM']=min(offsets[labels[i]]['minimumLocalSignedOffsetMM'],d);offsets[labels[i]]['samples']+=1
        entry={'bindRegionLabelsSha256':hashlib.sha256(json.dumps(labels,separators=(',',':')).encode()).hexdigest(),'bindCoordinatesSha256':hashlib.sha256(json.dumps([list(v.co) for v in ob.data.vertices],separators=(',',':')).encode()).hexdigest(),'bvhCandidatePairs':len(candidates),'confirmedTrianglePairs':pairs,'intersectedSkinTriangles':len(hit_faces),'intersectedTriangleCountsByBindRegion':dict(counts),'affectedWholeTriangleAreaMM2':dict(areas),'areaMeaning':'Area of whole intersected glove triangles, not intersection area or penetration volume; tangential contact can intersect.','localSignedOffsetsGuidanceOnly':dict(offsets),'intersectionExamples':examples}
        if ob.name=='Palm heel suede overlay':
            landmark_ids=[9356,19670,850]
            old_direction=sum((ob.data.vertices[i].normal for i in landmark_ids),Vector()).normalized()
            distal=rig.data.bones['L_thumb.03']
            longitudinal=(distal.tail_local-distal.head_local).normalized()
            definitions=[('distalPadPatch',old_direction,.5),
                         ('broadPulpPatch',Vector(BROAD_PULP_TRANSVERSE_REST).normalized(),.7)]
            for patch_name,direction,cone in definitions:
                samples=[];total=contact=far=0.;contact_faces={};source_points=[]
                source_centroid=Vector();posed_centroid=Vector();source_area=0.
                for i,t in enumerate(triangles):
                    if not all(labels[v]=='L_thumb.03' for v in t):continue
                    a,b,c=[ob.data.vertices[v].co for v in t];normal=(b-a).cross(c-a).normalized()
                    center=(a+b+c)/3
                    along=(center-distal.head_local).dot(longitudinal)/distal.length
                    if patch_name=='broadPulpPatch' and not BROAD_PULP_LONGITUDINAL_BAND[0]<=along<=BROAD_PULP_LONGITUDINAL_BAND[1]:continue
                    if normal.dot(direction)<cone:continue
                    rest_area=(b-a).cross(c-a).length*.5*1e6
                    a,b,c=skintri[i];area=(b-a).cross(c-a).length*.5*1e6
                    p=(a+b+c)/3;q,n,_,distance=tree.find_nearest(p);skin_normal=(b-a).cross(c-a).normalized()
                    localnormal=(mag.matrix_world.to_3x3().transposed()@n).normalized();alignment=-skin_normal.dot(n)
                    onfar=localnormal.y<-.8;close=distance<=.0015 and alignment>=.8 and onfar
                    total+=area;far+=area*onfar;contact+=area*close
                    source_centroid+=center*rest_area;source_area+=rest_area;posed_centroid+=(invmag@p)*area;source_points.append(center)
                    if close:contact_faces[i]=area
                    samples.append({'triangle':i,'areaMM2':area,'pointMagazineLocal':list(invmag@p),'unsignedGapMM':distance*1000,'opposingNormalDot':alignment,'nearestOnFarFace':onfar})
                adjacency=defaultdict(list)
                for i in contact_faces:
                    for v in triangles[i]:adjacency[v].append(i)
                remaining=set(contact_faces);components=[]
                while remaining:
                    queue=[remaining.pop()];area=0.
                    while queue:
                        i=queue.pop();area+=contact_faces[i]
                        for v in triangles[i]:
                            for neighbor in adjacency[v]:
                                if neighbor in remaining:remaining.remove(neighbor);queue.append(neighbor)
                    components.append(area)
                entry[patch_name]={'role':'PRIMARY intended broad pulp' if patch_name=='broadPulpPatch' else 'Legacy edge-contact patch; comparison only',
                    'connectedNearPatchAreasMM2':sorted(components,reverse=True),'connectivity':'Shared source vertices; UV/topology seams may split physical patches.',
                    'restNormalConeCosine':cone,'transverseRest':list(direction),'areaMM2':total,'nearestFarFaceAreaMM2':far,'nearOpposedFarFaceAreaMM2':contact,'coverage':contact/total if total else 0,
                    'sourceCentroidM':list(source_centroid/source_area) if source_area else None,'evaluatedCentroidMagazineLocalM':list(posed_centroid/total) if total else None,
                    'centroidWeighting':{'source':'Rest triangle area','evaluated':'Evaluated triangle area'},'sourceSampleBoundsM':[[min(p[i] for p in source_points) for i in range(3)],[max(p[i] for p in source_points) for i in range(3)]] if source_points else None,
                    'sourceTriangleMembershipSha256':hashlib.sha256(json.dumps([v['triangle'] for v in samples]).encode()).hexdigest(),
                    'criteria':'Distributed triangle centroids; unsigned gap <=1.5mm, opposing normals >=.8, magazine local normal Y<-.8. Engineering screen, not anatomical/contact approval.','samples':samples}
                if patch_name=='broadPulpPatch':
                    entry[patch_name].update({'derivation':BROAD_PULP_DERIVATION,'restLongitudinalBand':list(BROAD_PULP_LONGITUDINAL_BAND),'restLongitudinalOrigin':list(distal.head_local),'restLongitudinalAxis':list(longitudinal),'restLongitudinalLengthM':distal.length,'sourceRegion':'All three triangle vertices dominantly weighted to L_thumb.03, rest centroid within longitudinal band, rest face normal within frozen cone; independent of posed steel proximity.'})
                else:
                    entry[patch_name].update({'sourceLandmarkVertices':landmark_ids,'sourceLandmarkCoordinates':[list(ob.data.vertices[i].co) for i in landmark_ids]})
        report['meshes'][ob.name]=entry
        section(vertices,triangles,'glove')
    report['crossSectionsMagazineLocalM']=sections
    report['elapsedSeconds']=time.monotonic()-started
    if output_dir:
        directory=Path(output_dir);directory.mkdir(parents=True,exist_ok=True)
        (directory/'measurement.json').write_text(json.dumps(report,indent=2))
    return report


if __name__=='__main__':
    import sys
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    print(json.dumps({'output':args[0] if args else None,'measurement':measure_scene(args[0] if args else None)['elapsedSeconds']}))
