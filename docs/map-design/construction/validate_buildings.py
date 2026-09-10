#!/usr/bin/env python3
"""Read-only architectural and roof-geometry checks for BZ-04.

This validator intentionally complements validate.py.  It checks authored
building ownership and geometry without changing protected map or runtime data.
"""

from __future__ import annotations

import argparse
import copy
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

import roofs


EPS = 1e-6
HERE = Path(__file__).resolve().parent


class Validator:
    def __init__(self) -> None:
        self.failures: list[str] = []

    def fail(self, path: str, message: str) -> None:
        self.failures.append(f"FAIL {path}: {message}")


def obj(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def rows(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def num(value: Any) -> float:
    return float(value) if finite(value) else 0.0


def span(value: Any) -> tuple[float, float] | None:
    if isinstance(value, list) and len(value) == 2 and all(finite(item) for item in value):
        return float(value[0]), float(value[1])
    return None


def box(value: Any) -> tuple[float, float, float, float, float, float] | None:
    source = obj(value)
    low, high = source.get("min"), source.get("max")
    if not isinstance(low, list) or not isinstance(high, list) or len(low) != 3 or len(high) != 3:
        return None
    if not all(finite(item) for item in [*low, *high]):
        return None
    result = (*map(float, low), *map(float, high))
    return result if all(result[index] < result[index + 3] - EPS for index in range(3)) else None


def footprint(value: Any) -> tuple[float, float, float, float] | None:
    if not isinstance(value, list) or len(value) != 4 or not all(finite(item) for item in value):
        return None
    x0, y0, x1, y1 = map(float, value)
    return (x0, y0, x1, y1) if x0 < x1 - EPS and y0 < y1 - EPS else None


def polygons(value: Any, v: Validator, path: str) -> list[list[tuple[float, float]]]:
    result: list[list[tuple[float, float]]] = []
    for index, raw in enumerate(rows(value)):
        if not isinstance(raw, list) or len(raw) < 3:
            v.fail(f"{path}[{index}]", "must contain at least three XY points")
            continue
        polygon: list[tuple[float, float]] = []
        for point in raw:
            if not isinstance(point, list) or len(point) != 2 or not all(finite(item) for item in point):
                v.fail(f"{path}[{index}]", "has a non-finite XY point")
                polygon = []
                break
            polygon.append((float(point[0]), float(point[1])))
        if polygon and abs(polygon_area(polygon)) <= EPS:
            v.fail(f"{path}[{index}]", "has zero area")
            polygon = []
        if polygon:
            result.append(polygon)
    return result


def polygon_area(poly: list[tuple[float, float]]) -> float:
    return sum(poly[index][0] * poly[(index + 1) % len(poly)][1] - poly[(index + 1) % len(poly)][0] * poly[index][1] for index in range(len(poly))) / 2


def orient(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def on_segment(a: tuple[float, float], b: tuple[float, float], p: tuple[float, float]) -> bool:
    return abs(orient(a, b, p)) <= EPS and min(a[0], b[0]) - EPS <= p[0] <= max(a[0], b[0]) + EPS and min(a[1], b[1]) - EPS <= p[1] <= max(a[1], b[1]) + EPS


def segments_touch(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float], d: tuple[float, float]) -> bool:
    ac, ad, ca, cb = orient(a, b, c), orient(a, b, d), orient(c, d, a), orient(c, d, b)
    if ((ac > EPS and ad < -EPS) or (ac < -EPS and ad > EPS)) and ((ca > EPS and cb < -EPS) or (ca < -EPS and cb > EPS)):
        return True
    return on_segment(a, b, c) or on_segment(a, b, d) or on_segment(c, d, a) or on_segment(c, d, b)


def point_in_polygon(point: tuple[float, float], poly: list[tuple[float, float]], include_boundary: bool = True) -> bool:
    for index, start in enumerate(poly):
        if on_segment(start, poly[(index + 1) % len(poly)], point):
            return include_boundary
    inside = False
    px, py = point
    for index, (x0, y0) in enumerate(poly):
        x1, y1 = poly[(index + 1) % len(poly)]
        if (y0 > py) != (y1 > py) and px < (x1 - x0) * (py - y0) / (y1 - y0) + x0:
            inside = not inside
    return inside


def polygons_touch(a: list[tuple[float, float]], b: list[tuple[float, float]]) -> bool:
    if any(segments_touch(p, a[(index + 1) % len(a)], q, b[(other + 1) % len(b)]) for index, p in enumerate(a) for other, q in enumerate(b)):
        return True
    return point_in_polygon(a[0], b) or point_in_polygon(b[0], a)


def polygons_overlap_area(a: list[tuple[float, float]], b: list[tuple[float, float]]) -> bool:
    # Proper edge crossing or a strict-contained vertex proves area overlap.
    for index, p in enumerate(a):
        for other, q in enumerate(b):
            ac, ad = orient(p, a[(index + 1) % len(a)], q), orient(p, a[(index + 1) % len(a)], b[(other + 1) % len(b)])
            ca, cb = orient(q, b[(other + 1) % len(b)], p), orient(q, b[(other + 1) % len(b)], a[(index + 1) % len(a)])
            if ((ac > EPS and ad < -EPS) or (ac < -EPS and ad > EPS)) and ((ca > EPS and cb < -EPS) or (ca < -EPS and cb > EPS)):
                return True
    if any(point_in_polygon(point, b, include_boundary=False) for point in a) or any(point_in_polygon(point, a, include_boundary=False) for point in b):
        return True
    # Coincident polygons have no strict vertex containment or proper edge
    # crossing.  A triangle-centroid probe catches that case while boundary
    # contact alone still remains legal.
    def probes(poly: list[tuple[float, float]]) -> list[tuple[float, float]]:
        anchor = poly[0]
        return [((anchor[0] + poly[index][0] + poly[index + 1][0]) / 3, (anchor[1] + poly[index][1] + poly[index + 1][1]) / 3)
                for index in range(1, len(poly) - 1) if abs(orient(anchor, poly[index], poly[index + 1])) > EPS]
    return any(point_in_polygon(point, b, include_boundary=False) for point in probes(a)) or any(point_in_polygon(point, a, include_boundary=False) for point in probes(b))


def coverage_planes(coverage: dict[str, Any]) -> dict[tuple[str, str], float]:
    result: dict[tuple[str, str], float] = {}
    for area in rows(coverage.get("zones")):
        area = obj(area)
        zone = area.get("id")
        for face in rows(area.get("faces")):
            face = obj(face)
            fixed = obj(face.get("wallPlane")).get("fixedCoordinate")
            if isinstance(zone, str) and isinstance(face.get("face"), str) and finite(fixed):
                result[(zone, face["face"])] = float(fixed)
    return result


def collect(design: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]], dict[str, dict[str, Any]], list[tuple[dict[str, Any], dict[str, Any], dict[str, Any]]]]:
    parcels: dict[str, dict[str, Any]] = {}
    parcel_context: dict[str, dict[str, Any]] = {}
    openings: dict[str, dict[str, Any]] = {}
    groups: list[tuple[dict[str, Any], dict[str, Any], dict[str, Any]]] = []
    for area_value in rows(design.get("areas")):
        area = obj(area_value)
        for face_value in rows(area.get("faces")):
            face = obj(face_value)
            for parcel_value in rows(face.get("parcels")):
                parcel = obj(parcel_value)
                if isinstance(parcel.get("id"), str):
                    parcels[parcel["id"]] = parcel
                    parcel_context[parcel["id"]] = {"area": area, "face": face}
                for opening_value in rows(parcel.get("openings")):
                    opening = obj(opening_value)
                    if isinstance(opening.get("id"), str):
                        openings[opening["id"]] = {"opening": opening, "parcel": parcel, "area": area, "face": face}
        for group_value in rows(area.get("activityGroups")):
            groups.append((area, obj(group_value), parcel_context))
    return parcels, parcel_context, openings, groups


def building_polygons(building: dict[str, Any], v: Validator, path: str) -> list[list[tuple[float, float]]]:
    return polygons(building.get("footprintPolygons"), v, path + ".footprintPolygons")


def validate_ownership(v: Validator, design: dict[str, Any], parcels: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    buildings: dict[str, dict[str, Any]] = {}
    memberships: dict[str, list[str]] = defaultdict(list)
    for index, raw in enumerate(rows(design.get("buildings"))):
        building = obj(raw)
        path = f"buildings[{index}]"
        building_id = building.get("id")
        if not isinstance(building_id, str) or not building_id:
            v.fail(path + ".id", "must be a non-empty id")
            continue
        if building_id in buildings:
            v.fail(path + ".id", "duplicates another building id")
        buildings[building_id] = building
        members = rows(building.get("memberParcelIds"))
        if not members:
            v.fail(path + ".memberParcelIds", "must name every owned facade parcel")
        if len(members) != len(set(members)):
            v.fail(path + ".memberParcelIds", "contains a duplicate member")
        for member in members:
            if not isinstance(member, str) or member not in parcels:
                v.fail(path + ".memberParcelIds", f"unknown parcel {member!r}")
                continue
            memberships[member].append(building_id)
            if parcels[member].get("buildingId") != building_id:
                v.fail(path + ".memberParcelIds", f"{member} has parcel buildingId {parcels[member].get('buildingId')!r}")
    for parcel_id, parcel in sorted(parcels.items()):
        owners = memberships.get(parcel_id, [])
        if len(owners) != 1:
            v.fail(f"parcels[{parcel_id}].buildingId", f"must have exactly one complete member owner, got {owners}")
        elif parcel.get("buildingId") != owners[0]:
            v.fail(f"parcels[{parcel_id}].buildingId", f"does not match member owner {owners[0]}")
    return buildings


def validate_footprints(v: Validator, buildings: dict[str, dict[str, Any]]) -> dict[str, list[list[tuple[float, float]]]]:
    all_polygons: dict[str, list[list[tuple[float, float]]]] = {}
    real: list[tuple[str, list[list[tuple[float, float]]]]] = []
    for building_id, building in buildings.items():
        path = f"buildings[{building_id}]"
        polys = building_polygons(building, v, path)
        all_polygons[building_id] = polys
        if building.get("kind") != "building":
            continue
        if not polys:
            v.fail(path + ".footprintPolygons", "real building needs a complete footprint")
            continue
        unseen = set(range(len(polys)))
        connected = {unseen.pop()}
        while True:
            additions = {candidate for candidate in unseen if any(polygons_touch(polys[candidate], polys[current]) for current in connected)}
            if not additions:
                break
            connected.update(additions)
            unseen.difference_update(additions)
        if unseen:
            v.fail(path + ".footprintPolygons", f"real building footprint is disconnected at polygon indexes {sorted(unseen)}")
        real.append((building_id, polys))
    for index, (left_id, left_polys) in enumerate(real):
        for right_id, right_polys in real[index + 1:]:
            if any(polygons_overlap_area(left, right) for left in left_polys for right in right_polys):
                v.fail(f"buildings[{left_id}].footprintPolygons", f"overlaps different real building {right_id}")
    return all_polygons


def validate_material_regions(v: Validator, design: dict[str, Any], parcels: dict[str, dict[str, Any]]) -> None:
    materials = obj(design.get("materials"))
    area_for = {p['id']: a for a in design['areas'] for f in a['faces'] for p in f['parcels']}
    ids: set[str] = set()
    for parcel_id, parcel in sorted(parcels.items()):
        parcel_span = span(parcel.get("interval"))
        floor, wall_top = parcel.get("floorElevationM"), parcel.get("wallTopM")
        for index, raw in enumerate(rows(parcel.get("materialRegions"))):
            region = obj(raw)
            path = f"parcels[{parcel_id}].materialRegions[{index}]"
            region_id = region.get("id")
            if not isinstance(region_id, str) or not region_id:
                v.fail(path + ".id", "must be non-empty")
            elif region_id in ids:
                v.fail(path + ".id", "duplicates another material region")
            else:
                ids.add(region_id)
            if region.get("materialId") not in materials:
                v.fail(path + ".materialId", "does not name an existing material")
            along, z = span(region.get("alongM")), span(region.get("zM"))
            relative = span(region.get('zAboveFloorM'))
            if relative:
                surface = area_for[parcel_id]['floor']
                high_floor = max(surface.get('startElevationM', surface.get('elevationM',0)), surface.get('endElevationM', surface.get('elevationM',0)))
                if surface.get('visual_style') == 'stairs': high_floor += .003
                if relative[0] < 0 or relative[1] <= relative[0] or high_floor+relative[1] > num(wall_top)+EPS:
                    v.fail(path+'.zAboveFloorM', 'relative material band does not fit the visible floor/wall envelope')
                z = (num(floor)+relative[0], high_floor+relative[1])
            if not along or not z or along[1] <= along[0] + EPS or z[1] <= z[0] + EPS:
                v.fail(path, "must have ordered finite alongM and zM geometry")
                continue
            if parcel_span and (along[0] < parcel_span[0] - EPS or along[1] > parcel_span[1] + EPS):
                v.fail(path + ".alongM", "extends outside its face parcel")
            if finite(floor) and finite(wall_top) and (z[0] < float(floor) - EPS or z[1] > float(wall_top) + EPS):
                v.fail(path + ".zM", "extends outside its face vertical bounds")


def axes_for(building: dict[str, Any], parcel: dict[str, Any]) -> set[float]:
    values: list[Any] = [*rows(building.get("primaryAxesM")), *rows(building.get("subordinateAxesM"))]
    grid = obj(parcel.get("structuralGrid"))
    values.extend(rows(grid.get("axesM")))
    values.extend(rows(grid.get("subordinateAxesM")))
    if finite(grid.get("principalAxisM")):
        values.append(grid["principalAxisM"])
    return {round(float(value), 6) for value in values if finite(value)}


def point_in_union(point: tuple[float, float], polyset: list[list[tuple[float, float]]]) -> bool:
    return any(point_in_polygon(point, poly) for poly in polyset)


def validate_building_architecture(v: Validator, buildings: dict[str, dict[str, Any]], all_polygons: dict[str, list[list[tuple[float, float]]]], parcels: dict[str, dict[str, Any]], openings: dict[str, dict[str, Any]]) -> None:
    for building_id, building in sorted(buildings.items()):
        if building.get("kind") != "building":
            continue
        path = f"buildings[{building_id}]"
        members = [member for member in rows(building.get("memberParcelIds")) if isinstance(member, str) and member in parcels]
        storeys = {row.get("index"): row for row in map(obj, rows(building.get("storeys"))) if isinstance(row.get("index"), int)}
        if not storeys:
            v.fail(path + ".storeys", "real building needs storey geometry")
        for storey_index, storey in sorted(storeys.items()):
            floor, ceiling, slab = storey.get("floorM"), storey.get("ceilingM"), storey.get("nextSlabTopM")
            if not all(finite(item) for item in (floor, ceiling, slab)) or not float(floor) < float(ceiling) - EPS or float(ceiling) > float(slab) + EPS:
                v.fail(path + f".storeys[{storey_index}]", "requires finite floor < ceiling <= nextSlabTopM")
        ordered_storeys = sorted(storeys.items())
        for (lower_index, lower), (upper_index, upper) in zip(ordered_storeys, ordered_storeys[1:]):
            if finite(lower.get("ceilingM")) and finite(upper.get("floorM")) and float(upper["floorM"]) < float(lower["ceilingM"]) - EPS:
                v.fail(path + f".storeys[{upper_index}].floorM", f"intersects storey {lower_index} ceiling")
        rooms: dict[str, dict[str, Any]] = {}
        for index, raw_room in enumerate(rows(building.get("rooms"))):
            room = obj(raw_room)
            rpath = path + f".rooms[{index}]"
            room_id = room.get("id")
            room_box = box(room.get("boundsXYZ"))
            if not isinstance(room_id, str) or not room_box:
                v.fail(rpath, "needs id and finite ordered boundsXYZ")
                continue
            rooms[room_id] = room
            room_storey = storeys.get(room.get("storey"))
            if not room_storey:
                v.fail(rpath + ".storey", "does not resolve a building storey")
            elif room_box[2] < num(room_storey.get("floorM")) - EPS or room_box[5] > num(room_storey.get("ceilingM")) + EPS:
                v.fail(rpath + ".boundsXYZ", "crosses its storey floor or ceiling")
            corners = ((room_box[0], room_box[1]), (room_box[0], room_box[4]), (room_box[3], room_box[1]), (room_box[3], room_box[4]))
            if not all(point_in_union(corner, all_polygons.get(building_id, [])) for corner in corners):
                v.fail(rpath + ".boundsXYZ", "is outside the combined building footprint")
        seen_stacks: dict[tuple[str, float], set[int]] = defaultdict(set)
        named_stacks: dict[tuple[str, str], set[float]] = defaultdict(set)
        for member in members:
            parcel = parcels[member]
            allowed_axes = axes_for(building, parcel)
            for opening_raw in rows(parcel.get("openings")):
                opening = obj(opening_raw)
                opath = f"parcels[{member}].openings[{opening.get('id', '?')}]"
                axis, opening_storey = opening.get("axisM"), opening.get("storey")
                if not finite(axis) or round(float(axis), 6) not in allowed_axes:
                    v.fail(opath + ".axisM", "is not on a scheduled primary, subordinate, or face structural axis")
                if finite(axis) and finite(opening.get("alongM")) and abs(float(axis) - float(opening["alongM"])) > EPS:
                    v.fail(opath, "axisM must equal the placed alongM coordinate")
                if not isinstance(opening_storey, int) or opening_storey not in storeys:
                    v.fail(opath + ".storey", "does not resolve a building storey")
                    continue
                storey = storeys[opening_storey]
                sill, head = opening.get("sillM"), opening.get("headM")
                if not finite(sill) or not finite(head):
                    v.fail(opath, "needs finite sillM and headM")
                    continue
                if opening.get("kind") == "window":
                    if float(sill) <= num(storey.get("floorM")) + EPS or float(head) >= num(storey.get("ceilingM")) - EPS:
                        v.fail(opath, "window crosses its storey floor or ceiling clearance")
                elif float(sill) < num(storey.get("floorM")) - EPS or float(head) > num(storey.get("ceilingM")) + EPS:
                    v.fail(opath, "opening crosses its storey floor or ceiling")
                if finite(axis):
                    seen_stacks[(member, round(float(axis), 6))].add(opening_storey)
                    opening_id = opening.get("id")
                    if isinstance(opening_id, str):
                        named_stacks[(member, re.sub(r"([_-])L\d+(?=[_-]|$)", r"\1", opening_id))].add(round(float(axis), 6))
                if opening.get("kind") != "window":
                    continue
                room_id = opening.get("roomId")
                room = rooms.get(room_id)
                if not room:
                    v.fail(opath + ".roomId", "does not resolve a room in its building")
                    continue
                room_box = box(room.get("boundsXYZ"))
                if not room_box or not finite(axis):
                    continue
                # Project through the face to the named room's interior normal
                # plane.  Along and Z remain authored opening coordinates, so a
                # wrongly named bay is observable instead of hidden by an AABB.
                face = parcel.get("face")
                z = (float(sill) + float(head)) / 2
                projected = (float(axis), (room_box[1] + room_box[4]) / 2) if face in ("north", "south") else ((room_box[0] + room_box[3]) / 2, float(axis))
                if not (room_box[0] - EPS <= projected[0] <= room_box[3] + EPS and room_box[1] - EPS <= projected[1] <= room_box[4] + EPS and room_box[2] - EPS <= z <= room_box[5] + EPS):
                    v.fail(opath + ".roomId", f"projected receiver point {projected[0]:.3f},{projected[1]:.3f},{z:.3f} is outside named room {room_id}")
        # An axis is a structural datum, not a per-storey offset.  The set is
        # intentionally keyed by parcel and coordinate; changing one storey's
        # coordinate off its stack also fails the grid test above.
        for (member, axis), levels in seen_stacks.items():
            if len(levels) > 1 and axis not in axes_for(building, parcels[member]):
                v.fail(f"parcels[{member}].openings", f"stacked axis {axis} is not structurally scheduled")
        for (member, stack), axes in named_stacks.items():
            if len(axes) > 1:
                v.fail(f"parcels[{member}].openings", f"stacked opening {stack} drifts across axes {sorted(axes)}")
        principal = building.get("principalEntranceId")
        if principal is None:
            continue
        entry = openings.get(principal) if isinstance(principal, str) else None
        if entry and entry["opening"].get("kind") == "door" and entry["parcel"].get("buildingId") == building_id:
            continue
        rear_ids = {row.get("id") for row in rows(building.get("rearServiceDoors")) if isinstance(obj(row).get("id"), str)}
        single_rear = obj(building.get("rearServiceDoor")).get("id")
        if isinstance(single_rear, str):
            rear_ids.add(single_rear)
        if not isinstance(principal, str) or principal not in rear_ids:
            v.fail(path + ".principalEntranceId", "must resolve an owned door or an explicit rear service door")


def local_world_box(part: tuple[float, float, float, float, float, float], opening: dict[str, Any], face: str, plane: float, deck: float) -> tuple[float, float, float, float, float, float]:
    along = num(opening.get("alongM"))
    a0, out0, z0, a1, out1, z1 = part
    if face == "north":
        return along + a0, plane - out1, deck + z0, along + a1, plane - out0, deck + z1
    if face == "south":
        return along + a0, plane + out0, deck + z0, along + a1, plane + out1, deck + z1
    if face == "east":
        return plane - out1, along + a0, deck + z0, plane - out0, along + a1, deck + z1
    return plane + out0, along + a0, deck + z0, plane + out1, along + a1, deck + z1


def arch_head_at(opening: dict[str, Any], offset: float) -> float:
    width, height = num(opening['widthM']), num(opening['heightM'])
    if abs(offset) > width/2+EPS: return -math.inf
    shape = opening.get('headShape')
    if shape == 'pointed':
        target = -abs(offset); left, right = 0.0, 1.0
        for _ in range(50):
            t=(left+right)/2
            x=(1-t)**2*(-width/2)+2*(1-t)*t*(-.22*width)
            if x < target: left=t
            else: right=t
        t=(left+right)/2
        return height*((1-t)**2*opening.get('archSpringRatio',.62)+2*(1-t)*t*opening.get('archControlRatio',.88)+t*t)
    if shape == 'segmental':
        t=(offset+width/2)/width
        return height*(.82+.72*t*(1-t))
    return height


def validate_shop_connections(v, design, parcels, buildings):
    all_openings={o['id']:(p,o) for p in parcels.values() for o in p['openings']}
    for area in design['areas']:
        for group in area['activityGroups']:
            if not group.get('receiverOpening'): continue
            parcel, opening=all_openings[group['receiverOpening']]
            if opening['kind']!='shop': continue
            path='shopfront['+opening['id']+']';shop=obj(opening.get('shopfront'));cavity=obj(shop.get('cavity'));building=buildings[parcel['buildingId']]
            required=('frontBarrelDepthM','chamberFromOutM','chamberBackOutM','chamberWidthM','chamberCeilingM')
            if not all(finite(cavity.get(k)) for k in required):
                v.fail(path+'.cavity','requires the exact barrel and rectangular chamber section');continue
            if abs(cavity['chamberFromOutM']+cavity['frontBarrelDepthM'])>EPS or cavity['chamberBackOutM']>=cavity['chamberFromOutM']:
                v.fail(path+'.cavity','barrel and chamber do not meet in the prescribed order')
            deck=group['bbox']['min'][2]
            for part in group['instanceLayout']['parts']:
                bounds=box(part['localBox'])
                if not bounds: continue
                if bounds[4]>-cavity['frontBarrelDepthM']+EPS:
                    for along in (bounds[0],(bounds[0]+bounds[3])/2,bounds[3]):
                        if deck+bounds[5]>opening['sillM']+arch_head_at(opening,along)+EPS:
                            v.fail(path+'.parts['+part['id']+']','intersects the prescribed front arch barrel');break
                elif bounds[2]+deck<opening['sillM']-EPS or bounds[5]+deck>cavity['chamberCeilingM']+EPS or max(abs(bounds[0]),abs(bounds[3]))>cavity['chamberWidthM']/2+EPS:
                    v.fail(path+'.parts['+part['id']+']','does not fit the specified rectangular rear chamber')
            access=obj(shop.get('staffAccess'));portal=box(access.get('localClearBox'))
            if not portal or num(access.get('clearWidthM'))<.8-EPS or num(access.get('clearHeightM'))<2.1-EPS:
                v.fail(path+'.staffAccess','needs a dimensioned closed staff door');continue
            if portal[5]+deck>cavity['chamberCeilingM']+EPS:
                v.fail(path+'.staffAccess','staff doorway exceeds the chamber ceiling')
            entry=access.get('connectedEntranceId');entry_record=all_openings.get(entry)
            rear={r['id'] for r in building.get('rearServiceDoors',[])}
            if building.get('rearServiceDoor'): rear.add(building['rearServiceDoor']['id'])
            if not ((entry_record and entry_record[0]['buildingId']==building['id'] and entry_record[1]['kind']=='door') or entry in rear):
                v.fail(path+'.staffAccess','does not connect to an owned exterior staff entrance')
            for part in group['instanceLayout']['parts']:
                pb=box(part['localBox'])
                if pb and all(min(pb[i+3],portal[i+3])>max(pb[i],portal[i])+EPS for i in range(3)):
                    v.fail(path+'.staffAccess','stock obstructs the staff door: '+part['id'])
            points=access.get('localRoutePoints',[]);polys=building['footprintPolygons'];plane=next(f['wallPlaneM'] for f in area['faces'] if f['face']==group['receiverFace'])
            if len(points)<2:
                v.fail(path+'.staffAccess','requires a continuous staff connection route');continue
            for first,second in zip(points,points[1:]):
                count=max(2,math.ceil(math.dist(first,second)/.20))
                for step in range(count+1):
                    a=first[0]+(second[0]-first[0])*step/count;out=first[1]+(second[1]-first[1])*step/count
                    world=local_world_box((a-.4,out-.4,0,a+.4,out+.4,.01),opening,group['receiverFace'],plane,deck)
                    if not all(point_in_union(pt,polys) for pt in ((world[0],world[1]),(world[0],world[4]),(world[3],world[1]),(world[3],world[4]))):
                        v.fail(path+'.staffAccess','0.80m staff route leaves its building footprint');break


def building_depth_at(parcel: dict[str, Any], building_members: list[dict[str, Any]], along: float) -> float:
    own = footprint(parcel.get("footprint"))
    if not own:
        return 0.0
    face = parcel.get("face")
    if face in ("north", "south"):
        spans = [(rect[1], rect[3]) for candidate in building_members if (rect := footprint(candidate.get("footprint"))) and rect[0] - EPS <= along <= rect[2] + EPS]
        base = own[1] if face == "north" else own[3]
        return max((high - base if face == "north" else base - low for low, high in spans), default=0.0)
    spans = [(rect[0], rect[2]) for candidate in building_members if (rect := footprint(candidate.get("footprint"))) and rect[1] - EPS <= along <= rect[3] + EPS]
    base = own[0] if face == "east" else own[2]
    return max((high - base if face == "east" else base - low for low, high in spans), default=0.0)


def validate_groups(v: Validator, design: dict[str, Any], parcels: dict[str, dict[str, Any]], parcel_context: dict[str, dict[str, Any]], buildings: dict[str, dict[str, Any]], coverage: dict[tuple[str, str], float]) -> None:
    for area in map(obj, rows(design.get("areas"))):
        zone = area.get("zone")
        for index, raw_group in enumerate(rows(area.get("activityGroups"))):
            group = obj(raw_group)
            path = f"areas[{zone}].activityGroups[{index}]"
            parcel_id, opening_id, face = group.get("receiverParcel"), group.get("receiverOpening"), group.get("receiverFace")
            parcel = parcels.get(parcel_id) if isinstance(parcel_id, str) else None
            if not parcel:
                continue
            opening = next((obj(value) for value in rows(parcel.get("openings")) if obj(value).get("id") == opening_id), None)
            plane = coverage.get((zone, face))
            group_box = box(group.get("bbox"))
            if group.get('recipe') == 'AG-PLANT' and opening_id is None and group_box and face in ('north','south','east','west'):
                along_axis = 0 if face in ('north','south') else 1
                opening = {'alongM': (group_box[along_axis] + group_box[along_axis+3])/2}
            layout = obj(group.get("instanceLayout"))
            if layout and (not opening or not finite(plane) or not group_box):
                v.fail(path + ".instanceLayout", "needs a valid receiver opening, face plane, and group bbox")
            if layout and opening and finite(plane) and group_box:
                for part_index, raw_part in enumerate(rows(layout.get("parts"))):
                    part = obj(raw_part)
                    part_box = box(part.get("localBox"))
                    ppath = path + f".instanceLayout.parts[{part_index}]"
                    if not part_box:
                        v.fail(ppath + ".localBox", "must be a finite ordered local box")
                        continue
                    world = local_world_box(part_box, opening, str(face), float(plane), group_box[2])
                    if any(world[offset] < group_box[offset] - EPS or world[offset + 3] > group_box[offset + 3] + EPS for offset in range(3)):
                        v.fail(ppath + ".localBox", "leaves its exact receiver-face/deck-converted group envelope")
            work = obj(group.get("workZone"))
            normal = span(work.get("normalIntervalM"))
            if normal and normal[1] - normal[0] < 1.0 - EPS:
                v.fail(path + ".workZone.normalIntervalM", "trade working zone must be at least 1m deep")
            if finite(work.get("minClearDepthM")) and float(work["minClearDepthM"]) < 1.0 - EPS:
                v.fail(path + ".workZone.minClearDepthM", "trade working zone must be at least 1m deep")
            if opening and obj(opening.get("shopfront")):
                shop = obj(opening.get("shopfront"))
                strip = span(shop.get("workingStripOutM"))
                if not strip or strip[1] - strip[0] < 1.0 - EPS:
                    v.fail(path + ".shopfront.workingStripOutM", "shopfront needs a >=1m working strip")
                required_depth = max(abs(num(shop.get("backPlaneOutM"))), abs(strip[0]) if strip else 0.0, abs(strip[1]) if strip else 0.0)
                building = buildings.get(parcel.get("buildingId"))
                member_parcels = [parcels[member] for member in rows(obj(building).get("memberParcelIds")) if member in parcels]
                if building_depth_at(parcel, member_parcels, num(opening.get("alongM"))) + EPS < required_depth:
                    v.fail(path + ".shopfront", f"building depth is below required {required_depth:.3f}m behind shopfront")


def validate_roofs(v: Validator, design: dict[str, Any], schedule_path: Path, saved_schedule: dict[str, Any] | None = None) -> None:
    try:
        expected = roofs.build_schedule(design)
        saved = saved_schedule if saved_schedule is not None else json.loads(schedule_path.read_text(encoding="utf-8"))
    except (OSError, ValueError, json.JSONDecodeError) as error:
        v.fail("roof-coordination.json", f"cannot read or derive schedule: {error}")
        return
    if roofs.encoded(saved) != roofs.encoded(expected):
        v.fail("roof-coordination.json", "does not exactly match roofs.py source-derived schedule")
    cells = rows(saved.get("roofCells"))
    rects: list[tuple[str, tuple[float, float, float, float]]] = []
    for index, raw_cell in enumerate(cells):
        cell = obj(raw_cell)
        rectangle = footprint(cell.get("footprint"))
        if not rectangle:
            v.fail(f"roofCells[{index}].footprint", "must be a finite positive rectangle")
            continue
        rects.append((str(cell.get("id")), rectangle))
    for left, (left_id, left_rect) in enumerate(rects):
        for right_id, right_rect in rects[left + 1:]:
            if min(left_rect[2], right_rect[2]) - max(left_rect[0], right_rect[0]) > EPS and min(left_rect[3], right_rect[3]) - max(left_rect[1], right_rect[1]) > EPS:
                v.fail("roofCells", f"{left_id} overlaps {right_id}")
    surfaces = rows(expected.get("roofSurfaces"))
    xs = sorted({coordinate for source in surfaces for coordinate in (source["footprint"][0], source["footprint"][2])})
    ys = sorted({coordinate for source in surfaces for coordinate in (source["footprint"][1], source["footprint"][3])})
    for xi in range(len(xs) - 1):
        for yi in range(len(ys) - 1):
            x, y = (xs[xi] + xs[xi + 1]) / 2, (ys[yi] + ys[yi + 1]) / 2
            expected_cover = any(source["footprint"][0] < x < source["footprint"][2] and source["footprint"][1] < y < source["footprint"][3] for source in surfaces)
            count = sum(rectangle[0] < x < rectangle[2] and rectangle[1] < y < rectangle[3] for _cell_id, rectangle in rects)
            if expected_cover and count != 1:
                v.fail("roofCells", f"roof union atom at {x:.3f},{y:.3f} has {count} cells; expected exactly one")
            if not expected_cover and count:
                v.fail("roofCells", f"roof cell covers source-empty atom at {x:.3f},{y:.3f}")
    cells_by_id={cell['id']:cell for cell in expected['roofCells']}
    bundles={bundle['id']:bundle for bundle in expected['roofBundles']}
    membership=defaultdict(list)
    for bundle in bundles.values():
        for cell_id in bundle['roofCellIds']: membership[cell_id].append(bundle['id'])
        if not bundle.get('requiredMaterialIds') or any(m not in design['materials'] for m in bundle['requiredMaterialIds']):
            v.fail(bundle['id'], 'roof component material assignment is unresolved')
    for cell_id,cell in cells_by_id.items():
        if membership[cell_id]!=[cell['roofBundleId']]:
            v.fail(cell_id, 'must belong to exactly one named installation bundle')
    assignments={a['zone']:a for a in expected['areaRoofAssignments']}
    for area in design['areas']:
        current=assignments[area['zone']]
        if sorted(area.get('roofCellIds',[]))!=current['roofCellIds'] or sorted(area.get('roofBundleIds',[]))!=current['roofBundleIds']:
            v.fail('areas['+area['zone']+'].roofCellIds', 'roof ownership/dependency references do not match the actual schedule')
    for dep in expected['dependencyAssociations']:
        if dep['requiredBundleId'] not in bundles or dep['roofCellId'] not in cells_by_id:
            v.fail(dep['id'], 'dangling shared roof dependency')


def validate_b_revision(v, design, parcels):
    """Validate the actual B-04 apertures, outward extents and bounded phase caps."""
    area=next(a for a in design['areas'] if a['zone']=='SPAWN_B_COURTYARD')
    if not area.get('designRevision'):return
    for face in area['faces']:
        for parcel in face['parcels']:
            for opening in parcel['openings']:
                path='B-04.openings['+opening['id']+']'
                if opening.get('headShape') not in ('rectangular','pointed','segmental','paired-pointed','circular'):
                    v.fail(path, 'unsupported aperture profile')
                if abs(opening['headM']-opening['sillM']-opening['heightM'])>EPS:
                    v.fail(path, 'head/sill disagree with aperture height')
                if opening.get('headShape')=='paired-pointed':
                    count=opening.get('lightCount');pier=opening.get('mullionM')
                    if count not in (2,3) or not finite(pier) or pier<=0 or (opening['widthM']-(count-1)*pier)/count<.45:
                        v.fail(path, 'paired lights require two/three usable lights and solid mullions')
                if opening.get('headShape')=='circular' and abs(opening['widthM']-opening['heightM'])>EPS:
                    v.fail(path, 'circular light must have equal width and height')
                if opening['depthM']>=parcel['shellDepthM']-.10:
                    v.fail(path, 'recess leaves no opaque receiving shell')
                if face['face']=='north' and opening['sillM']<2.2 and opening.get('frontProjectionM',1)>0:
                    v.fail(path, 'north low joinery projects into the unchanged clear route')
    detail_ids={d['id'] for d in area['detailNotes']}
    for feature in area.get('facadeFeatures',[]):
        path='B-04.features['+feature['id']+']';parcel=parcels.get(feature.get('receiverParcel'));bounds=box(feature.get('bbox'))
        if not parcel or not bounds or feature.get('detail') not in detail_ids:
            v.fail(path, 'feature requires an owned receiver, finite bounds and a construction detail');continue
        face=feature['receiverFace'];axis=0 if face in ('north','south') else 1;normal=1-axis;sign=-1 if face in ('north','east') else 1
        left,right=feature['alongM']-feature['widthM']/2,feature['alongM']+feature['widthM']/2
        expected=[0,0,feature['zM'][0],0,0,feature['zM'][1]]
        expected[axis],expected[axis+3]=left,right
        expected[normal],expected[normal+3]=sorted(feature['wallPlaneM']+sign*t for t in feature['outM'])
        if any(abs(a-b)>EPS for a,b in zip(bounds,expected)):
            v.fail(path, 'world bounds disagree with the local receiver frame')
        if left<parcel['interval'][0]-EPS or right>parcel['interval'][1]+EPS:
            v.fail(path, 'feature crosses a property or protected mouth')
        if feature.get('receiverFeatureId'):
            host=next((f for f in area['facadeFeatures'] if f['id']==feature['receiverFeatureId']),None)
            fold=feature.get('foldPathOutZ',[])
            if not host or host['receiverParcel']!=feature['receiverParcel'] or left<host['alongM']-host['widthM']/2 or right>host['alongM']+host['widthM']/2:
                v.fail(path, 'draped textile must fit its named host rail')
            if feature.get('receiverRailTopM')!=4.45 or not fold or not any(abs(point[1]-feature.get('thicknessM',0)-4.45)<EPS and .70<=point[0]<=.75 for point in fold):
                v.fail(path, 'draped textile lacks its measured rail-top fold')
            if any(not feature['outM'][0]<=point[0]<=feature['outM'][1] or not feature['zM'][0]<=point[1]<=feature['zM'][1] for point in fold):
                v.fail(path, 'textile fold escapes its declared bounds')
        elif not feature['outM'][0]<0 or feature['outM'][0]<-parcel['shellDepthM']:
            v.fail(path, 'feature must meet its receiving shell')
        if feature['zM'][0]<2.2 and feature['outM'][1]>0:
            v.fail(path, 'low architectural feature projects into courtyard movement space')
        embedded_rug=design['materialRuntimeContract']['embeddedDetailBindings']['rug']
        if feature['materialId'] not in design['materials'] and not (feature['kind']=='draped-rug' and feature['materialId']==embedded_rug):
            v.fail(path, 'unbound feature material')
    finish=area.get('finishSchedule')
    if finish:
        for face in area['faces']:
            for parcel in face['parcels']:
                for opening in parcel['openings']:
                    if opening.get('finishFamily') not in finish['openingFamilies']:
                        v.fail(opening['id'], 'opening lacks its finish family')
                    for key in ['surroundMaterialId','revealMaterialId','sillMaterialId']:
                        if opening.get(key) not in design['materials']:v.fail(opening['id'], 'unbound finish receiver material')
        if finish['performance']['hardTriangleLimit']!=area['budget']['maxTriangles'] or finish['performance']['maxPrimitives']!=area['budget']['maxRenderedPrimitives']:
            v.fail('B finish budget','finish and area budget disagree')
    for cap in area['implementationPhase']['roofSlices']:
        parcel=parcels[cap['sourceParcelId']];r=parcel['footprint'];bounds=box(cap['bbox'])
        expected=(r[0],r[1],parcel['roof']['slabBottomM'],r[2],r[3],parcel['roof']['slabTopM'])
        if cap['clipRect']!=r or bounds!=expected:
            v.fail('B-04.roofSlices', 'temporary cap must exactly match its B-owned supporting footprint and slab')


def validate_craft(v, design):
    craft=design.get('craftStandards')
    if not craft:return
    recipes=craft['profiles'];roof=roofs.build_schedule(design);bundles={b['id']:b for b in roof['roofBundles']}
    for building in design['buildings']:
        intent=building.get('architecturalIntent',{})
        if not intent.get('composition') or not intent.get('restraint'):
            v.fail(building['id'],'missing complete-building architectural intent')
        if building.get('roomRegistry'):
            rooms=building['rooms']
            for index,first in enumerate(rooms):
                a=box(first['boundsXYZ'])
                for second in rooms[index+1:]:
                    b=box(second['boundsXYZ'])
                    if first['storey']==second['storey'] and all(min(a[i+3],b[i+3])-max(a[i],b[i])>EPS for i in range(3)):
                        v.fail(building['id'],'canonical room registry overlaps different physical rooms')
        if building.get('floorAxisSchedule'):
            members={e['parcelId'] for e in building.get('elevations',[])}
            current={p['id']:p for area in design['areas'] for face in area['faces'] for p in face['parcels'] if p['id'] in members}
            for row in building['floorAxisSchedule']:
                for facade in row['facades']:
                    expected=sorted({o['alongM'] for o in current[facade['parcelId']]['openings'] if o['storey']==row['storey']})
                    if facade['axesM']!=expected:v.fail(building['id'],'floor-specific axes do not match the named facade openings')
    for area in design['areas']:
        s=area.get('craftSchedule',{})
        if any(not s.get(k) for k in ['primary','supporting','quiet','installationReadiness']):v.fail(area['zone'],'incomplete area craftsmanship schedule')
        for face in area['faces']:
            for parcel in face['parcels']:
                for opening in parcel['openings']:
                    if opening['storey']==0 and parcel.get('structuralGrid',{}).get('axisScope'):
                        for pier in parcel['structuralGrid'].get('bayEdgesM',[])[1:-1]:
                            if opening['alongM']-opening['widthM']/2+EPS<pier<opening['alongM']+opening['widthM']/2-EPS:
                                v.fail(opening['id'],'declared ground pier crosses an opening')
                    if opening.get('headShape')=='paired-pointed':
                        count=opening.get('lightCount',0);mullion=opening.get('mullionM',0)
                        if count not in (2,3) or mullion<=0 or (opening['widthM']-(count-1)*mullion)/max(1,count)<.45:
                            v.fail(opening['id'],'paired opening requires usable lights and solid mullions')
                    glass=opening.get('glazingProfile')
                    if glass:
                        if not opening['sillM'] <= glass['fromZM'] < opening['headM'] or glass.get('materialProfile') not in craft['materials']:
                            v.fail(opening['id'],'fixed glazing must fit its aperture and resolve its material')
                        if glass.get('columnsPerLight',0)<1 or glass.get('rows',0)<1 or not glass.get('paletteSequence'):
                            v.fail(opening['id'],'fixed glazing needs exact pane subdivision')
                    detail=opening.get('architecturalDetail',{})
                    if detail.get('profile')=='carved-timber-portal' and (detail.get('frameMaterialId') not in design['materials'] or not detail.get('frameColorSrgb')):
                        v.fail(opening['id'],'carved timber frame requires its own material and color')
        openings={o['id']:o for f in area['faces'] for p in f['parcels'] for o in p['openings']}
        for feature in area.get('facadeFeatures',[]):
            if feature['kind']!='supported-shallow-balcony':continue
            opening=openings.get(feature.get('servedOpening'))
            if not opening or abs(feature['deck']['topZM']-opening['sillM'])>EPS:
                v.fail(feature['id'],'balcony deck must meet its named closed upper door')
            if feature['braces']['lowestZM']<2.2 or feature['bbox']['min'][2]>feature['braces']['lowestZM']+EPS:
                v.fail(feature['id'],'balcony supports leave their envelope or protected headroom')
        for element in area.get('landscapeElements',[]):
            receiver=box(element.get('rootReceiver'));bounds=box(element.get('bbox'))
            if not receiver or not bounds or element.get('craftRecipeId') not in recipes:
                v.fail(element['id'],'landscape needs a finite root receiver, envelope and craft recipe');continue
            for zone in design['areas']:
                rect=zone['rect']
                if min(receiver[3],rect['x']+rect['w'])>max(receiver[0],rect['x'])+EPS and min(receiver[4],rect['y']+rect['h'])>max(receiver[1],rect['y'])+EPS:
                    v.fail(element['id'],'palm root receiver enters protected playable area')
            if not all(bounds[i]-EPS<=element['root'][i]<=bounds[i+3]+EPS for i in range(3)) or element['root'][2]+element['heightM']>bounds[5]+EPS:
                v.fail(element['id'],'palm root or crown leaves its declared envelope')
        for group in area['activityGroups']:
            for part in group['instanceLayout']['parts']:
                if part.get('craftRecipeId') not in recipes:v.fail(group['id']+'/'+part['id'],'unresolved craft recipe')
                if part['kind']=='stone-plinth' and (part.get('craftRecipeId')!='CF-STONE' or part.get('grainAxisLocal') is not None):v.fail(group['id'],'stone plinth incorrectly uses timber construction')
                if part['kind']=='hanging-cloth' and group.get('tradeProgram','').startswith('sample dye') and part['materialId']==design['materialRuntimeContract']['embeddedDetailBindings']['rug']:v.fail(group['id'],'dye sample incorrectly uses finished rug material')
        for fixture in area.get('fixtures',[]):
            parts=fixture.get('assemblyParts')
            if not parts:continue  # B-05's existing measured full envelopes remain its explicit override.
            boxes=[box(p.get('bbox')) for p in parts];full=box(fixture.get('bbox'))
            if any(b is None for b in boxes) or not full:
                v.fail(fixture['id'],'invalid complete-assembly component bounds');continue
            expected=tuple([min(b[i] for b in boxes) for i in range(3)]+[max(b[i+3] for b in boxes) for i in range(3)])
            if any(abs(a-b)>EPS for a,b in zip(full,expected)):v.fail(fixture['id'],'whole assembly bounds omit or exceed named components')
            if fixture['kind']=='canopy':
                for i,endpoint in enumerate([fixture['endA'],fixture['endB']],1):
                    part=next((p for p in parts if p['id']==f'endpoint-ledger-{i}'),None);bounds=box(part['bbox']) if part else None
                    if not bounds or abs(bounds[4]-bounds[1]-fixture['ledgerLengthM'])>EPS or bounds[5]-bounds[2]<.10-EPS:
                        v.fail(fixture['id'],'crossing-span ledger is not its complete dimensioned support')
        for prerequisite in s.get('roofReceiverPrerequisites',[]):
            bundle=bundles.get(prerequisite['bundleId'])
            if not bundle or set(prerequisite['requiredReceiverParcelIds'])!=set(bundle['componentMaterialsBySource']):v.fail(area['zone'],'roof receiver prerequisites do not cover the complete bundle')


def validate(design: dict[str, Any], coverage_data: dict[str, Any], roof_schedule: Path, saved_schedule: dict[str, Any] | None = None) -> list[str]:
    v = Validator()
    parcels, parcel_context, openings, _groups = collect(design)
    for area in design['areas']:
        if 'propertyRelationships' in area:
            v.fail(area['zone'], 'obsolete relationship copy; buildings[] is the sole building authority')
    for parcel in parcels.values():
        if any(key in parcel for key in ('representedRooms', 'buildingRelationship', 'roomRepresentation')):
            v.fail(parcel['id'], 'obsolete relationship copy; buildings[] is the sole building authority')
    buildings = validate_ownership(v, design, parcels)
    all_polygons = validate_footprints(v, buildings)
    validate_material_regions(v, design, parcels)
    validate_building_architecture(v, buildings, all_polygons, parcels, openings)
    validate_groups(v, design, parcels, parcel_context, buildings, coverage_planes(coverage_data))
    validate_shop_connections(v, design, parcels, buildings)
    validate_roofs(v, design, roof_schedule, saved_schedule)
    validate_b_revision(v, design, parcels)
    validate_craft(v, design)
    return v.failures


def self_test(design: dict[str, Any], coverage: dict[str, Any], schedule: Path) -> int:
    fixtures: list[tuple[str, Any, str]] = []
    def mutate_window(data: dict[str, Any]) -> None:
        next(o for a in data['areas'] for f in a['faces'] for p in f['parcels'] for o in p['openings'] if o['kind'] == 'window')['axisM'] += .123
    def mutate_member(data: dict[str, Any]) -> None:
        data["buildings"][0]["memberParcelIds"] = []
    def mutate_floor(data: dict[str, Any]) -> None:
        building = next(b for b in data["buildings"] if b.get("kind") == "building" and len(b.get("storeys", [])) > 1)
        building["storeys"][1]["floorM"] = building["storeys"][0]["ceilingM"] - .1
    def mutate_part(data: dict[str, Any]) -> None:
        group = next(g for a in data["areas"] for g in a.get("activityGroups", []) if g.get("instanceLayout"))
        group["instanceLayout"]["parts"][0]["localBox"]["max"][0] += 100
    def mutate_entrance(data: dict[str, Any]) -> None:
        next(b for b in data["buildings"] if b.get("kind") == "building")["principalEntranceId"] = "not-a-door"
    def mutate_arch(data):
        group=next(g for a in data['areas'] for g in a['activityGroups'] if g['id']=='G_T_E_ARCH3')
        part=next(p for p in group['instanceLayout']['parts'] if p['id']=='head')
        part['localBox']['min'][1]=-.20;part['localBox']['max'][1]=-.10
    def mutate_staff(data):
        opening=next(o for a in data['areas'] for f in a['faces'] for p in f['parcels'] for o in p['openings'] if o['kind']=='shop')
        opening['shopfront']['staffAccess']['connectedEntranceId']='missing-staff-door'
    def mutate_roof_reference(data):
        data['areas'][0]['roofCellIds']=['ROOF_CELL_DOES_NOT_EXIST']
    def mutate_relationship_copy(data):
        data['areas'][0]['propertyRelationships']={'old': 'uncoordinated prior design'}
    fixtures = [
        ("misaligned window", mutate_window, "not on a scheduled"),
        ("intersecting floor", mutate_floor, "intersects storey"),
        ("orphan facade", mutate_member, "must have exactly one complete member owner"),
        ("part leaving group", mutate_part, "leaves its exact receiver-face"),
        ("invalid principal entrance", mutate_entrance, "must resolve an owned door"),
        ('frame inside arch barrel',mutate_arch,'intersects the prescribed front arch barrel'),
        ('unconnected staff workspace',mutate_staff,'does not connect to an owned exterior staff entrance'),
        ('stale roof ownership reference',mutate_roof_reference,'roof ownership/dependency references do not match'),
        ('duplicate building authority',mutate_relationship_copy,'obsolete relationship copy'),
    ]
    if any(a.get('designRevision') for a in design['areas'] if a['zone']=='SPAWN_B_COURTYARD'):
        def b_area(data):
            return next(a for a in data['areas'] if a['zone']=='SPAWN_B_COURTYARD')
        def mutate_b_trim(data):
            next(o for f in b_area(data)['faces'] if f['face']=='north' for p in f['parcels'] for o in p['openings'] if o['storey']==0)['frontProjectionM']=.10
        def mutate_b_lights(data):
            next(o for f in b_area(data)['faces'] for p in f['parcels'] for o in p['openings'] if o['headShape']=='paired-pointed')['mullionM']=2.0
        def mutate_b_cap(data):
            b_area(data)['implementationPhase']['roofSlices'][0]['bbox']['min'][1]-=1
        fixtures += [('B low trim intrudes into route',mutate_b_trim,'north low joinery projects'),
                     ('B paired mullions consume aperture',mutate_b_lights,'usable lights'),
                     ('B cap extends beyond its support',mutate_b_cap,'supporting footprint')]
        if b_area(design).get('finishSchedule'):
            def mutate_rail_rug(data):
                next(f for f in b_area(data)['facadeFeatures'] if f['kind']=='draped-rug')['foldPathOutZ'][2][1]+=.10
            def mutate_finish_family(data):
                b_area(data)['faces'][0]['parcels'][0]['openings'][0]['finishFamily']='missing-family'
            fixtures += [('rug floats over its rail',mutate_rail_rug,'measured rail-top fold'),
                         ('unassigned finish family',mutate_finish_family,'opening lacks its finish family')]
    if design.get('craftStandards'):
        def mutate_craft_part(data):
            data['areas'][0]['activityGroups'][0]['instanceLayout']['parts'][0]['craftRecipeId']='missing-recipe'
        def mutate_full_ledger(data):
            f=next(f for a in data['areas'] for f in a.get('fixtures',[]) if f['kind']=='canopy')
            next(p for p in f['assemblyParts'] if p['id']=='endpoint-ledger-1')['bbox']['max'][1]-=.50
        def mutate_roof_receivers(data):
            data['areas'][0]['craftSchedule']['roofReceiverPrerequisites'][0]['requiredReceiverParcelIds'].pop()
        fixtures += [('missing craft recipe',mutate_craft_part,'unresolved craft recipe'),
                     ('truncated span ledger',mutate_full_ledger,'complete dimensioned support'),
                     ('missing roof receiver',mutate_roof_receivers,'roof receiver prerequisites')]
    if str(design.get('issue',{}).get('revision','')).startswith(('R4','R5')):
        def mutate_glass_head(data):
            opening=next(o for a in data['areas'] for f in a['faces'] for p in f['parcels'] for o in p['openings'] if o.get('glazingProfile'))
            opening['glazingProfile']['fromZM']=opening['headM']+.1
        def mutate_palm_root(data):
            element=next((e for a in data['areas'] for e in a.get('landscapeElements',[])),None)
            if element is None:
                element={'id':'TEST-PALM','kind':'date-palm','craftRecipeId':'CF-PLANT','root':[25.5,5.5,0],
                         'heightM':3,'bbox':{'min':[25,5,0],'max':[26,6,3]}}
                data['areas'][0].setdefault('landscapeElements',[]).append(element)
            element['rootReceiver']={'min':[25,5,0],'max':[26,6,.02]}
        def mutate_balcony_deck(data):
            feature=next(f for a in data['areas'] for f in a.get('facadeFeatures',[]) if f['kind']=='supported-shallow-balcony')
            feature['deck']['topZM']+=.2
        fixtures += [('glass outside its opening',mutate_glass_head,'fixed glazing must fit'),
                     ('palm root occupies a playable zone',mutate_palm_root,'palm root receiver enters'),
                     ('balcony misses its upper door',mutate_balcony_deck,'balcony deck must meet')]
    if str(design.get('issue',{}).get('revision','')).startswith('R5'):
        def mutate_shared_room(data):
            building=next(b for b in data['buildings'] if b.get('roomRegistry'))
            duplicate=copy.deepcopy(building['rooms'][-1]);duplicate['id']+='-DUPLICATE';building['rooms'].append(duplicate)
        def mutate_floor_axes(data):
            building=next(b for b in data['buildings'] if b.get('floorAxisSchedule'))
            building['floorAxisSchedule'][0]['facades'][0]['axesM'].append(999)
        def mutate_ground_pier(data):
            parcel=next(p for a in data['areas'] for f in a['faces'] for p in f['parcels'] if p['id']=='F_E_LOGGIA')
            parcel['structuralGrid']['bayEdgesM']=[32,33.1,39]
        fixtures += [('conflicting shared room identities',mutate_shared_room,'canonical room registry overlaps'),
                     ('stale floor-specific axes',mutate_floor_axes,'floor-specific axes do not match'),
                     ('ground pier crosses a doorway',mutate_ground_pier,'declared ground pier crosses')]
    for name, mutate, expected_failure in fixtures:
        data = copy.deepcopy(design)
        mutate(data)
        failures = validate(data, coverage, schedule, roofs.build_schedule(data))
        if not any(expected_failure in failure for failure in failures):
            print(f"FAIL --self-test: {name} mutation did not produce {expected_failure!r}", file=sys.stderr)
            return 1
    print(f"PASS --self-test: {len(fixtures)} in-memory negative fixtures rejected")
    return 0


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--design", type=Path, default=HERE / "design.json")
    parser.add_argument("--coverage", type=Path, default=HERE / "coverage.json")
    parser.add_argument("--roof-schedule", type=Path, default=HERE / "roof-coordination.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        design, coverage = load(args.design), load(args.coverage)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"FAIL validate_buildings.py: {error}", file=sys.stderr)
        return 1
    if args.self_test:
        return self_test(design, coverage, args.roof_schedule)
    failures = validate(design, coverage, args.roof_schedule)
    if failures:
        print("\n".join(failures), file=sys.stderr)
        print(f"{len(failures)} building validation failure(s)", file=sys.stderr)
        return 1
    print("PASS validate_buildings.py: building geometry, groups, and roof schedule are consistent")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
