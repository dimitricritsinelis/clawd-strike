"""Small standalone regression check for B18 roof export bounds and handedness.
Run: python3 check-export.py [export/b18-roof-access.glb]
"""
import json
import math
import struct
import sys
from pathlib import Path

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name('export') / 'b18-roof-access.glb'
data = path.read_bytes()
magic, version, length = struct.unpack_from('<III', data)
assert (magic, version, length) == (0x46546C67, 2, len(data))
json_length, kind = struct.unpack_from('<II', data, 12)
assert kind == 0x4E4F534A
model = json.loads(data[20:20 + json_length])
bin_length, kind = struct.unpack_from('<II', data, 20 + json_length)
assert kind == 0x004E4942
binary = data[28 + json_length:]
assert len(binary) == bin_length
assert len(model['meshes']) == 1 and len(model['materials']) <= 2
for node in model['nodes']:
    assert 'matrix' not in node and 'rotation' not in node, node
    assert node.get('scale', [1, 1, 1]) == [1, 1, 1], node
    assert node.get('translation', [0, 0, 0]) == [0, 0, 0], node

def accessor(index):
    item = model['accessors'][index]
    view = model['bufferViews'][item['bufferView']]
    form = {5126: 'f', 5123: 'H', 5125: 'I'}[item['componentType']]
    size = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[item['type']]
    layout = struct.Struct('<' + form * size)
    stride = view.get('byteStride', layout.size)
    start = view.get('byteOffset', 0) + item.get('byteOffset', 0)
    return [layout.unpack_from(binary, start + i * stride) for i in range(item['count'])]

def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))

def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])

def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

triangles, positions = [], []
for primitive in model['meshes'][0]['primitives']:
    points = accessor(primitive['attributes']['POSITION'])
    normals = accessor(primitive['attributes']['NORMAL'])
    uvs = accessor(primitive['attributes']['TEXCOORD_0'])
    indices = [i[0] for i in accessor(primitive['indices'])]
    assert all(math.isfinite(v) for values in points + normals + uvs for v in values)
    assert all(abs(dot(n, n) - 1) < .002 for n in normals)
    assert all(-.001 <= value <= 1.001 for uv in uvs for value in uv)
    positions.extend(points)
    for i in range(0, len(indices), 3):
        ids = indices[i:i + 3]
        tri = [points[j] for j in ids]
        normal = cross(sub(tri[1], tri[0]), sub(tri[2], tri[0]))
        assert dot(normal, normal) > 1e-20, ('degenerate', tri)
        assert dot(normal, tuple(sum(normals[j][k] for j in ids) for k in range(3))) > 0, 'reversed normals'
        triangles.append((tri, primitive['material']))
expected = [(0, 1.8), (0, 2.59), (0, 3.8)]
bounds = [(min(p[i] for p in positions), max(p[i] for p in positions)) for i in range(3)]
assert all(abs(a - b) < 1e-5 for pair, goal in zip(bounds, expected) for a, b in zip(pair, goal)), bounds
assert len(triangles) <= 12000

def ray(origin, direction):
    hits = []
    for tri, material in triangles:
        e1, e2 = sub(tri[1], tri[0]), sub(tri[2], tri[0])
        p = cross(direction, e2)
        determinant = dot(e1, p)
        if abs(determinant) < 1e-9:
            continue
        t = sub(origin, tri[0])
        u = dot(t, p) / determinant
        q = cross(t, e1)
        v = dot(direction, q) / determinant
        distance = dot(e2, q) / determinant
        if u >= -1e-6 and v >= -1e-6 and u + v <= 1.000001 and distance >= 0:
            hits.append((distance, material))
    assert hits
    distance, material = min(hits)
    return tuple(origin[i] + distance * direction[i] for i in range(3)), material

# Unrecentered local probes: west door is south of center; rear vent faces east.
door, door_material = ray((-1, 1.30, 1.30), (1, 0, 0))
plain, plain_material = ray((-1, 1.30, 2.70), (1, 0, 0))
vent, vent_material = ray((2.80, 1.68, 1.90), (-1, 0, 0))
assert abs(door[0] - .073) < 1e-5, door
assert abs(plain[0]) < 1e-5, plain
assert 1.75 <= vent[0] <= 1.79, vent
assert door_material == vent_material != plain_material
# The actual runtime recenter is x -= .9, z -= 1.9, then center (55.5,42.8).
assert tuple(round(door[i] + offset, 6) for i, offset in enumerate([54.6, 4.76, 40.9])) == (54.673, 6.06, 42.2)
for image in model.get('images', []):
    view = model['bufferViews'][image['bufferView']]
    image_data = binary[view['byteOffset']:view['byteOffset'] + view['byteLength']]
    assert image['mimeType'] == 'image/png'
    assert struct.unpack_from('>II', image_data, 16) == (1024, 1024)
print(json.dumps({'pass': True, 'triangles': len(triangles), 'materials': len(model['materials']),
                  'boundsM': bounds, 'westDoorHitM': door, 'eastVentHitM': vent,
                  'embedded1024Textures': len(model.get('images', []))}, indent=2))
