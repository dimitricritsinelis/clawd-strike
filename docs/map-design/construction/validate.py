#!/usr/bin/env python3
"""Strict, read-only validation for the Bazaar construction design issue.

Usage:
  python3 docs/map-design/construction/validate.py
  python3 docs/map-design/construction/validate.py --design PATH --coverage PATH
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
EPS = 1e-6
PLACEHOLDER = re.compile(r"\b(?:tbd|todo|placeholder|measure later|retain-top|unknown|n/?a)\b", re.I)
FACES = ("north", "east", "south", "west")


class Validator:
    def __init__(self) -> None:
        self.failures: list[str] = []

    def fail(self, path: str, message: str) -> None:
        self.failures.append(f"FAIL {path}: {message}")

    def require(self, ok: bool, path: str, message: str) -> None:
        if not ok:
            self.fail(path, message)


def obj(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def items(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def number(value: Any, fallback: float = 0.0) -> float:
    return float(value) if finite(value) else fallback


def interval(value: Any) -> tuple[float, float] | None:
    if isinstance(value, list) and len(value) == 2 and all(finite(v) for v in value):
        return float(value[0]), float(value[1])
    source = obj(value)
    if finite(source.get("start")) and finite(source.get("end")):
        return float(source["start"]), float(source["end"])
    return None


def bbox(value: Any) -> tuple[float, float, float, float, float, float] | None:
    source = obj(value)
    low, high = source.get("min"), source.get("max")
    if not (isinstance(low, list) and isinstance(high, list) and len(low) == len(high) == 3):
        return None
    if not all(finite(v) for v in [*low, *high]):
        return None
    return (*map(float, low), *map(float, high))


def overlap(a0: float, a1: float, b0: float, b1: float) -> bool:
    return min(a1, b1) - max(a0, b0) > EPS


def boxes_overlap(a: tuple[float, float, float, float, float, float],
                  b: tuple[float, float, float, float, float, float]) -> bool:
    return overlap(a[0], a[3], b[0], b[3]) and overlap(a[1], a[4], b[1], b[4]) and overlap(a[2], a[5], b[2], b[5])


def merge(spans: list[tuple[float, float]]) -> list[tuple[float, float]]:
    result: list[tuple[float, float]] = []
    for low, high in sorted(spans):
        if high <= low + EPS:
            continue
        if result and low <= result[-1][1] + EPS:
            result[-1] = (result[-1][0], max(result[-1][1], high))
        else:
            result.append((low, high))
    return result


def load(path: Path, validator: Validator) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        validator.fail(str(path), "file does not exist")
        return {}
    except json.JSONDecodeError as error:
        validator.fail(str(path), f"invalid JSON: {error}")
        return {}
    if not isinstance(data, dict):
        validator.fail(str(path), "top level must be an object")
        return {}
    return data


def coverage_faces(coverage: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    result: dict[tuple[str, str], dict[str, Any]] = {}
    for zone in items(coverage.get("zones")):
        zone_obj = obj(zone)
        zone_id = zone_obj.get("id")
        if not isinstance(zone_id, str):
            continue
        for face in items(zone_obj.get("faces")):
            face_obj = obj(face)
            name = face_obj.get("face")
            if isinstance(name, str):
                result[(zone_id, name)] = face_obj
    return result


def floor_low(face: dict[str, Any]) -> float:
    floor = obj(face.get("floor"))
    if finite(floor.get("elevationM")):
        return float(floor["elevationM"])
    values = [number(floor.get(key)) for key in ("startElevationM", "endElevationM") if finite(floor.get(key))]
    return min(values) if values else 0.0


def floor_high(face: dict[str, Any]) -> float:
    floor = obj(face.get("floor"))
    if finite(floor.get("elevationM")):
        return float(floor["elevationM"])
    values = [number(floor.get(key)) for key in ("startElevationM", "endElevationM") if finite(floor.get(key))]
    return max(values) if values else 0.0


def face_rect(face: str, wall: float, along_low: float, along_high: float,
              normal_low: float, normal_high: float) -> tuple[float, float, float, float]:
    if face in ("north", "south"):
        return along_low, normal_low, along_high, normal_high
    return normal_low, along_low, normal_high, along_high


def route_side(face: str, wall: float, rect: dict[str, Any]) -> int:
    # Direction from wall plane into the owner zone's walkable space.
    if face == "north":
        return -1
    if face == "south":
        return 1
    if face == "east":
        return -1
    return 1


def group_projection(face: str, wall: float, box_value: tuple[float, float, float, float, float, float]) -> float:
    x0, y0, _z0, x1, y1, _z1 = box_value
    if face == "north":
        return max(0.0, wall - y0)
    if face == "south":
        return max(0.0, y1 - wall)
    if face == "east":
        return max(0.0, wall - x0)
    return max(0.0, x1 - wall)


def nonblank(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip()) and not PLACEHOLDER.search(value)


def validate_partition(v: Validator, area: dict[str, Any], face: dict[str, Any],
                       covered: dict[str, Any], path: str) -> None:
    expected = [interval(obj(row).get("interval")) for row in items(covered.get("solidCollisionCoverageIntervals"))]
    expected = [span for span in expected if span]
    if not expected:
        expected = [interval(obj(row).get("interval")) for row in items(covered.get("solidCollisionWallRuns"))]
        expected = [span for span in expected if span]
    expected = merge(expected)
    open_spans = [interval(obj(row).get("interval")) for row in items(covered.get("immutableOpeningRuns"))]
    open_spans = [span for span in open_spans if span]
    parcels = [obj(row) for row in items(face.get("parcels"))]
    actual: list[tuple[float, float, dict[str, Any], int]] = []
    for index, parcel in enumerate(parcels):
        span = interval(parcel.get("interval"))
        ppath = f"{path}.parcels[{index}]"
        if not span or span[1] <= span[0] + EPS:
            v.fail(ppath + ".interval", "must be [low, high] with high > low")
            continue
        actual.append((span[0], span[1], parcel, index))
        if not any(span[0] >= low - EPS and span[1] <= high + EPS for low, high in expected):
            v.fail(ppath + ".interval", f"{span} is outside frozen solid coverage {expected}")
        for low, high in open_spans:
            if overlap(span[0], span[1], low, high):
                v.fail(ppath + ".interval", f"encroaches immutable opening [{low}, {high}]")
    actual.sort(key=lambda row: row[:2])
    for previous, current in zip(actual, actual[1:]):
        if current[0] < previous[1] - EPS:
            v.fail(path + ".parcels", f"{previous[2].get('id')} overlaps {current[2].get('id')}")
    merged_actual = merge([(low, high) for low, high, _parcel, _index in actual])
    if merged_actual != expected:
        v.fail(path + ".parcels", f"target partition {merged_actual} does not exactly equal frozen solids {expected}")


def validate_materials(v: Validator, design: dict[str, Any], root: Path) -> None:
    materials = obj(design.get("materials"))
    for material_id, entry_value in materials.items():
        entry = obj(entry_value)
        path = f"materials.{material_id}"
        if not nonblank(material_id):
            v.fail(path, "blank or placeholder material id")
        manifest = entry.get("manifest")
        if not isinstance(manifest, str) or not (root / manifest).is_file():
            v.fail(path + ".manifest", "missing manifest file")
            continue
        base = (root / manifest).parent
        textures = obj(entry.get("textures"))
        if not textures:
            v.fail(path + ".textures", "missing texture mapping")
        for kind, texture in textures.items():
            if not isinstance(texture, str) or not (base / texture).is_file():
                v.fail(f"{path}.textures.{kind}", "texture file does not exist")


def validate_legacy(v: Validator, design: dict[str, Any], runtime: dict[str, Any],
                    coverage: dict[str, Any]) -> None:
    rows = [obj(row) for row in items(design.get("legacyDispositions"))]
    by_id: dict[str, dict[str, Any]] = {}
    for index, row in enumerate(rows):
        record_id = row.get("id")
        path = f"legacyDispositions[{index}]"
        if not nonblank(record_id):
            v.fail(path + ".id", "blank or placeholder id")
            continue
        if record_id in by_id:
            v.fail(path + ".id", f"duplicate legacy disposition {record_id}")
        by_id[record_id] = row
        if not nonblank(row.get("disposition")) or not nonblank(row.get("replacement")):
            v.fail(path, "disposition and replacement must be explicit")

    for placement in items(runtime.get("dressingPlacements")):
        record = obj(placement)
        record_id = record.get("id")
        row = by_id.get(record_id)
        if not row:
            v.fail(f"legacyDispositions[{record_id}]", "missing compiled dressing disposition")
            continue
        protected = record.get("classification") == "gameplay_cover" or (
            record.get("collisionClass") not in ("none", "soft_visual", "overhead", "decorative")
            and record.get("semanticClass") == "cover"
        )
        if protected and row.get("disposition") != "retain_gameplay":
            v.fail(f"legacyDispositions[{record_id}]", "protected gameplay dressing must retain_gameplay")

    for placement in items(runtime.get("architecturePlacements")):
        record_id = obj(placement).get("id")
        if record_id not in by_id:
            v.fail(f"legacyDispositions[{record_id}]", "missing compiled architecture disposition")

    for zone in items(coverage.get("zones")):
        zone_id = obj(zone).get("id")
        for face in items(obj(zone).get("faces")):
            face_id = obj(face).get("face")
            record_id = f"BOUNDARY_{zone_id}_{face_id}"
            if record_id not in by_id:
                v.fail(f"legacyDispositions[{record_id}]", "missing boundary-face disposition")

    for index in range(120):
        record_id = f"BACKGROUND_SHELL_{index:03}"
        if record_id not in by_id:
            v.fail(f"legacyDispositions[{record_id}]", "missing legacy background-shell disposition")

    for row in rows:
        if row.get("assetId") == "ASSET_FOUNTAIN" and row.get("disposition") != "retain_gameplay":
            v.fail(f"legacyDispositions[{row.get('id')}]", "fountain must retain_gameplay")


def validate_skyline(v: Validator, design: dict[str, Any], coverage: dict[str, Any]) -> None:
    rects = [obj(zone).get("rect") for zone in items(coverage.get("zones"))]
    for index, row_value in enumerate(items(design.get("skyline"))):
        row = obj(row_value)
        path = f"skyline[{index}]"
        box = bbox(row.get("bbox"))
        if not box or not all(box[i] < box[i + 3] - EPS for i in range(3)):
            v.fail(path + ".bbox", "must be a finite non-empty numeric box")
            continue
        x0, y0, z0, x1, y1, z1 = box
        if z0 < -EPS or z1 <= z0 + EPS:
            v.fail(path + ".bbox", "invalid vertical bounds")
        for rect_value in rects:
            rect = obj(rect_value)
            x, y, w, h = (number(rect.get(k)) for k in ("x", "y", "w", "h"))
            if overlap(x0, x1, x, x + w) and overlap(y0, y1, y, y + h):
                v.fail(path + ".bbox", "skyline footprint enters a walkable zone")
                break
        if not nonblank(row.get("id")) or not nonblank(row.get("materialId")) or not nonblank(row.get("purpose")):
            v.fail(path, "id, materialId and purpose must be explicit")


def validate_documents(v: Validator, design: dict[str, Any], root: Path, coverage_path: Path) -> None:
    baseline = obj(design.get("baseline"))
    linked = baseline.get("coverage")
    if linked != coverage_path.name:
        v.fail("baseline.coverage", f"must locally link {coverage_path.name!r}, got {linked!r}")
    if not (coverage_path.parent / str(linked)).is_file():
        v.fail("baseline.coverage", "linked coverage file does not exist beside design")
    for index, area_value in enumerate(items(design.get("areas"))):
        area = obj(area_value)
        unit = area.get("outputUnit")
        path = f"areas[{index}].outputUnit"
        if not nonblank(unit):
            v.fail(path, "must name a local construction document owner")
            continue
        filename = (
            "links.md" if str(unit).startswith("unit-link-")
            else "unit-tea-terrace.md" if str(unit) in {"unit-tea-ramp", "unit-tea-stairs", "unit-tea-landing"}
            else f"{unit}.md"
        )
        if not (root / "docs/map-design/construction" / filename).is_file():
            v.fail(path, f"does not resolve local {filename}")


def point_on_solid(coverage: dict[str, Any], zone_id: str, x: float, y: float) -> bool:
    for face_value in items(next((z for z in items(coverage.get("zones")) if obj(z).get("id") == zone_id), {}).get("faces")):
        face = obj(face_value)
        plane = obj(face.get("wallPlane"))
        fixed = number(plane.get("fixedCoordinate"))
        for row in items(face.get("solidCollisionCoverageIntervals")):
            span = interval(obj(row).get("interval"))
            if not span:
                continue
            if face.get("face") in ("north", "south") and abs(y - fixed) < EPS and span[0] - EPS <= x <= span[1] + EPS:
                return True
            if face.get("face") in ("east", "west") and abs(x - fixed) < EPS and span[0] - EPS <= y <= span[1] + EPS:
                return True
    return False


def box_on_solid(coverage: dict[str, Any], zone_id: str,
                 box_value: tuple[float, float, float, float, float, float]) -> bool:
    x0, y0, _z0, x1, y1, _z1 = box_value
    zone = next((obj(z) for z in items(coverage.get("zones")) if obj(z).get("id") == zone_id), {})
    for face_value in items(zone.get("faces")):
        face = obj(face_value)
        fixed = number(obj(face.get("wallPlane")).get("fixedCoordinate"))
        for row in items(face.get("solidCollisionCoverageIntervals")):
            span = interval(obj(row).get("interval"))
            if not span:
                continue
            if face.get("face") in ("north", "south") and y0 - EPS <= fixed <= y1 + EPS and overlap(x0, x1, span[0], span[1]):
                return True
            if face.get("face") in ("east", "west") and x0 - EPS <= fixed <= x1 + EPS and overlap(y0, y1, span[0], span[1]):
                return True
    return False


def validate_landmarks(v: Validator, design: dict[str, Any], coverage: dict[str, Any],
                       materials: dict[str, Any], global_ids: set[str]) -> None:
    records = [obj(item) for item in items(design.get("landmarks"))]
    for index, landmark in enumerate(records):
        path = f"landmarks[{index}]"
        landmark_id = landmark.get("id")
        if not nonblank(landmark_id):
            v.fail(path + ".id", "blank or placeholder id")
            continue
        if landmark_id in global_ids:
            v.fail(path + ".id", f"duplicate id {landmark_id}")
        global_ids.add(landmark_id)
        if landmark.get("recipe") != "LM-01":
            continue
        zone_id = landmark.get("zone")
        if not isinstance(zone_id, str):
            v.fail(path + ".zone", "LM-01 requires a zone")
            continue
        outer = bbox(landmark.get("bbox"))
        clear = bbox(landmark.get("clearWalkingBox"))
        if not outer or not clear:
            v.fail(path, "LM-01 requires finite bbox and clearWalkingBox")
            continue
        if not all(outer[i] <= clear[i] + EPS and clear[i + 3] <= outer[i + 3] + EPS for i in range(3)):
            v.fail(path + ".clearWalkingBox", "must lie inside landmark bbox")
        if landmark.get("materialId") not in materials or landmark.get("trimMaterialId") not in materials:
            v.fail(path, "LM-01 materialId and trimMaterialId must exist")
        piers = [obj(item) for item in items(landmark.get("piers"))]
        if len(piers) != 2:
            v.fail(path + ".piers", "LM-01 requires exactly two piers")
        for pier_index, pier in enumerate(piers):
            pbox = bbox(pier.get("bbox"))
            ppath = f"{path}.piers[{pier_index}].bbox"
            if not pbox or not all(pbox[i] < pbox[i + 3] - EPS for i in range(3)):
                v.fail(ppath, "must be a finite non-empty box")
                continue
            if not all(outer[i] <= pbox[i] + EPS and pbox[i + 3] <= outer[i + 3] + EPS for i in range(3)):
                v.fail(ppath, "must lie inside landmark bbox")
            if pbox[2] > EPS or pbox[5] < clear[5] - EPS:
                v.fail(ppath, "must run from ground to at least clearWalkingBox top")
            if not box_on_solid(coverage, zone_id, pbox):
                v.fail(ppath, "does not sit in a frozen solid wall band")
            if boxes_overlap(pbox, clear):
                v.fail(ppath, "pier overlaps clearWalkingBox")
        profile = obj(landmark.get("innerArchProfile"))
        if not all(isinstance(profile.get(key), list) and len(profile[key]) == 2 and all(finite(v) for v in profile[key])
                   for key in ("leftSpring", "leftControl", "crown", "rightControl", "rightSpring")):
            v.fail(path + ".innerArchProfile", "requires five finite 2D arch profile points")
        if not finite(landmark.get("capTopM")) or number(landmark.get("capTopM")) < outer[5] - EPS:
            v.fail(path + ".capTopM", "must be finite and at or above bbox top")
        # The walking box must not touch any frozen solid wall, sampled at its four footprint corners.
        # Touching the boundary is valid. Only an interior crossing is blocked.
        inset = (clear[0]+EPS*10, clear[1]+EPS*10, clear[2],
                 clear[3]-EPS*10, clear[4]-EPS*10, clear[5])
        if box_on_solid(coverage, zone_id, inset):
            v.fail(path + ".clearWalkingBox", "touches frozen solid wall coverage")


def validate_cameras(v: Validator, design: dict[str, Any], area_by_id: dict[str, dict[str, Any]],
                     global_ids: set[str]) -> None:
    records: list[tuple[str, dict[str, Any]]] = []
    covered_parcels: set[str] = set()
    expected_parcels = {p['id'] for a in area_by_id.values() for f in a['faces'] for p in f['parcels']}
    for zone_id, area in area_by_id.items():
        for index, view_value in enumerate(items(area.get("criticalViews"))):
            records.append((f"areas[{zone_id}].criticalViews[{index}]", obj(view_value)))
    for index, view_value in enumerate(items(design.get("cameras"))):
        records.append((f"cameras[{index}]", obj(view_value)))
    for path, camera in records:
        camera_id = camera.get("id")
        if not nonblank(camera_id):
            v.fail(path + ".id", "blank or placeholder id")
            continue
        if camera_id in global_ids:
            v.fail(path + ".id", f"duplicate id {camera_id}")
        global_ids.add(camera_id)
        position = camera.get("designPosition", camera.get("position"))
        if not (isinstance(position, list) and len(position) == 3 and all(finite(n) for n in position)):
            v.fail(path + ".designPosition", "must be three finite world coordinates")
            continue
        area = area_by_id.get(str(camera.get('zone')))
        if not area:
            v.fail(path + '.zone', 'does not resolve a designed area')
            continue
        x, y, z = position
        rect, floor = area['rect'], area['floor']
        if not (rect['x']+.349 <= x <= rect['x']+rect['w']-.349 and rect['y']+.349 <= y <= rect['y']+rect['h']-.349):
            v.fail(path, 'camera must remain inside its zone with 0.35m boundary margin')
        if floor['kind'] == 'ramp':
            t = (x-rect['x'])/rect['w'] if floor['axis']=='x' else (y-rect['y'])/rect['h']
            elevation = floor['startElevationM']+(floor['endElevationM']-floor['startElevationM'])*t
        else:
            elevation = floor['elevationM']
        if abs(z-elevation-1.7) > .002:
            v.fail(path, 'camera is not 1.7m above the canonical floor grade')
        face = camera.get('targetFace')
        if face in FACES and camera.get('yawDeg') != {'north':180,'east':270,'south':0,'west':90}[face]:
            v.fail(path+'.yawDeg', 'does not face the scheduled wall in the runtime camera convention')
        if camera.get('fovDeg') != 75 or camera.get('resolution') != [1440,900]:
            v.fail(path, 'camera must use fixed 75-degree vertical FOV and 1440x900 resolution')
        if not finite(camera.get('pitchDeg')) or abs(number(camera.get('pitchDeg'))) >= 52.5:
            v.fail(path+'.pitchDeg', 'face-plane frustum must remain below a vertical ray')
        sources = set(camera.get('sourceIds', []))
        route_id = 'ROUTE:' + str(camera.get('zone'))
        allowed = expected_parcels | {'RUG-GATE-PORTAL'}
        if camera.get('viewRole') == 'travel':
            allowed.add(route_id)
            if sources != {route_id} or not obj(camera.get('inspect')).get('route') == camera.get('zone'):
                v.fail(path+'.sourceIds', 'travel pose must identify its own reviewed route')
        if not sources or not sources <= allowed:
            v.fail(path+'.sourceIds', 'must resolve target parcels, its reviewed route or the shared landmark')
        covered_parcels |= sources & expected_parcels
        for field in ("yawDeg", "pitchDeg", "fovDeg"):
            if field in camera and not finite(camera.get(field)):
                v.fail(path + "." + field, "must be finite")
    if covered_parcels != expected_parcels:
        v.fail('criticalViews', f'parcels without camera coverage: {sorted(expected_parcels-covered_parcels)}')
    for zone_id, area in area_by_id.items():
        travel = [view for view in area.get('criticalViews', []) if view.get('viewRole') == 'travel']
        if len(travel) != 2 or abs((travel[0]['yawDeg'] - travel[1]['yawDeg']) % 360) != 180:
            v.fail('criticalViews.'+zone_id, 'requires opposing forward/reverse travel views')
    all_views = {camera['id'] for _, camera in records}
    batched = set()
    for batch in design.get('cameraBatches', []):
        aliases = batch.get('aliases', [])
        if not 2 <= len(aliases) <= 12 or [a['id'] for a in aliases[:2]] != ['primary', 'context']:
            v.fail('cameraBatches.'+batch['id'], 'adapter requires primary/context first and2..12 views')
        source_ids = [a['sourceViewId'] for a in aliases]
        if len(source_ids) != len(set(source_ids)) or not set(source_ids) <= all_views:
            v.fail('cameraBatches.'+batch['id'], 'duplicate or unresolved pose alias')
        batched.update(source_ids)
    if batched != all_views:
        v.fail('cameraBatches', 'every authored pose must appear in an adapter batch')


def validate_fixtures(v: Validator, area: dict[str, Any], zone_id: str,
                      coverage_by_face: dict[tuple[str, str], dict[str, Any]],
                      parcel_index: dict[tuple[str, str, str], dict[str, Any]],
                      opening_index: dict[tuple[str, str, str, str], dict[str, Any]],
                      materials: dict[str, Any], global_ids: set[str]) -> None:
    for index, fixture_value in enumerate(items(area.get("fixtures"))):
        fixture = obj(fixture_value)
        path = f"areas[{zone_id}].fixtures[{index}]"
        fixture_id = fixture.get("id")
        if not nonblank(fixture_id):
            v.fail(path + ".id", "blank or placeholder id")
            continue
        if fixture_id in global_ids:
            v.fail(path + ".id", f"duplicate id {fixture_id}")
        global_ids.add(fixture_id)
        kind = fixture.get("kind")
        if kind not in ("awning", "canopy", "line"):
            v.fail(path + ".kind", "must be awning, canopy, or line")
            continue
        if fixture.get("materialId") not in materials:
            v.fail(path + ".materialId", "is not defined in materials")
        box_value = bbox(fixture.get("bbox"))
        if not box_value or not all(box_value[i] < box_value[i + 3] - EPS for i in range(3)):
            v.fail(path + ".bbox", "must be finite and non-empty")
            continue
        if kind == "awning":
            face = str(fixture.get("receiverFace"))
            parcel_id = str(fixture.get("receiverParcel"))
            opening_id = str(fixture.get("servedOpening"))
            parcel = parcel_index.get((zone_id, face, parcel_id))
            opening = opening_index.get((zone_id, face, parcel_id, opening_id))
            if not parcel or not opening:
                v.fail(path, "awning receiverFace/receiverParcel/servedOpening must resolve")
                continue
            covered = coverage_by_face.get((zone_id, face), {})
            wall = number(obj(covered.get("wallPlane")).get("fixedCoordinate"))
            if not finite(fixture.get("wallPlaneM")) or abs(number(fixture.get("wallPlaneM")) - wall) > .02:
                v.fail(path + ".wallPlaneM", "must equal receiver wall plane")
            ledger = fixture.get("ledgerZ")
            if not finite(ledger) or number(ledger) >= number(parcel.get("wallTopM")) - .14:
                v.fail(path + ".ledgerZ", "must be below receiver wall top with 0.14m margin")
            low = box_value[2]
            if low < 2.45 - EPS:
                v.fail(path + ".bbox", "awning low point must be >= 2.45m")
            span = interval(fixture.get("interval"))
            parcel_span = interval(parcel.get("interval"))
            if not span or not parcel_span or span[0] < parcel_span[0] - EPS or span[1] > parcel_span[1] + EPS:
                v.fail(path + ".interval", "must lie on the receiver parcel's solid span")
            # The awning may shade its served shop. It cannot cross another opening at ledger height.
            for candidate in items(parcel.get("openings")):
                other = obj(candidate)
                if other.get("id") == opening_id:
                    continue
                other_span = (number(other.get("alongM")) - number(other.get("widthM")) / 2,
                              number(other.get("alongM")) + number(other.get("widthM")) / 2)
                other_head = number(other.get("headM", number(other.get("sillM")) + number(other.get("heightM"))))
                if span and overlap(span[0], span[1], other_span[0], other_span[1]) and overlap(box_value[2], box_value[5], number(other.get("sillM")), other_head):
                    v.fail(path, f"awning intersects opening {other.get('id')}")
        else:
            receiver_ids = fixture.get("receiverParcels")
            if not (isinstance(receiver_ids, list) and len(receiver_ids) == 2 and all(isinstance(item, str) for item in receiver_ids)):
                v.fail(path + ".receiverParcels", "canopy/line requires two parcel ids")
                continue
            ends = (fixture.get("endA"), fixture.get("endB"))
            for end_index, (parcel_id, end) in enumerate(zip(receiver_ids, ends)):
                matches = [(face, parcel) for (zid, face, pid), parcel in parcel_index.items() if zid == zone_id and pid == parcel_id]
                if len(matches) != 1 or not (isinstance(end, list) and len(end) == 3 and all(finite(n) for n in end)):
                    v.fail(f"{path}.receiverParcels[{end_index}]", "must resolve one parcel with a finite endpoint")
                    continue
                face, parcel = matches[0]
                covered = coverage_by_face[(zone_id, face)]
                wall = number(obj(covered.get("wallPlane")).get("fixedCoordinate"))
                along = number(end[1] if face in ("east", "west") else end[0])
                plane = number(end[0] if face in ("east", "west") else end[1])
                pspan = interval(parcel.get("interval"))
                if abs(plane - wall) > .02 or not pspan or not (pspan[0] - EPS <= along <= pspan[1] + EPS):
                    v.fail(f"{path}.end{'AB'[end_index]}", "must sit on receiver wall inside solid parcel span")
                if number(end[2]) >= number(parcel.get("wallTopM")) - .14:
                    v.fail(f"{path}.end{'AB'[end_index]}", "ledger must be below receiver wall top with 0.14m margin")
                for opening_value in items(parcel.get("openings")):
                    opening = obj(opening_value)
                    opening_head = number(opening.get("headM", number(opening.get("sillM")) + number(opening.get("heightM"))))
                    opening_center = number(opening.get('alongM'))
                    opening_half = number(opening.get('widthM')) / 2
                    ledger_half = number(fixture.get('ledgerLengthM'), .08) / 2
                    # A ledger may occupy the solid band between storeys. Test
                    # its actual receiver rectangle, not every head above it.
                    if (overlap(along-ledger_half, along+ledger_half,
                                opening_center-opening_half-.10-.21, opening_center+opening_half+.10+.21)
                            and overlap(number(end[2])-.05, number(end[2])+.05,
                                        number(opening.get('sillM'))-.06-.21, opening_head+.10+.21)):
                        v.fail(f"{path}.end{'AB'[end_index]}", f"intersects opening clearance {opening.get('id')}")
            if kind == "canopy" and box_value[2] < 4.2 - EPS:
                v.fail(path + ".bbox", "canopy low point must be >= 4.2m")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--design", type=Path, default=ROOT / "docs/map-design/construction/design.json")
    parser.add_argument("--coverage", type=Path, default=ROOT / "docs/map-design/construction/coverage.json")
    parser.add_argument("--runtime", type=Path, default=ROOT / "apps/client/public/maps/bazaar-map/map_spec.json")
    args = parser.parse_args()
    v = Validator()
    design, coverage, runtime = load(args.design, v), load(args.coverage, v), load(args.runtime, v)
    if not design or not coverage or not runtime:
        print("\n".join(v.failures), file=sys.stderr)
        return 1

    areas = [obj(row) for row in items(design.get("areas"))]
    v.require(len(areas) == 25, "areas", f"expected exactly 25 zones, got {len(areas)}")
    area_by_id: dict[str, dict[str, Any]] = {}
    for index, area in enumerate(areas):
        path = f"areas[{index}]"
        zone_id = area.get("zone")
        if not nonblank(zone_id):
            v.fail(path + ".zone", "blank or placeholder zone id")
            continue
        if zone_id in area_by_id:
            v.fail(path + ".zone", f"duplicate zone {zone_id}")
        area_by_id[zone_id] = area
        faces = [obj(row) for row in items(area.get("faces"))]
        names = [face.get("face") for face in faces]
        if len(faces) != 4 or set(names) != set(FACES):
            v.fail(path + ".faces", f"must contain four unique faces {FACES}, got {names}")
    coverage_by_face = coverage_faces(coverage)
    if len(items(coverage.get("zones"))) != 25:
        v.fail("coverage.zones", "expected exactly 25 frozen zones")

    validate_materials(v, design, ROOT)
    global_ids: set[str] = set()
    parcel_index: dict[tuple[str, str, str], dict[str, Any]] = {}
    opening_index: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    seat_openings = {
        (str(area.get("zone")), str(group.get("receiverFace")), str(group.get("receiverParcel")), str(group.get("receiverOpening")))
        for area in areas for group_value in items(area.get("activityGroups"))
        for group in [obj(group_value)] if group.get("recipe") == "AG-SEAT"
    }

    for area_index, area in enumerate(areas):
        zone_id = str(area.get("zone", ""))
        rect = obj(area.get("rect"))
        area_path = f"areas[{area_index}]"
        if not all(finite(rect.get(key)) for key in ("x", "y", "w", "h")):
            v.fail(area_path + ".rect", "must be a finite x/y/w/h rectangle")
        for face_index, face in enumerate(items(area.get("faces"))):
            face_obj = obj(face)
            name = str(face_obj.get("face", ""))
            path = f"{area_path}.faces[{face_index}]"
            covered = coverage_by_face.get((zone_id, name))
            if not covered:
                v.fail(path, "no matching frozen coverage face")
                continue
            validate_partition(v, area, face_obj, covered, path)
            wall_plane = number(obj(covered.get("wallPlane")).get("fixedCoordinate"))
            low_floor, high_floor = floor_low(covered), floor_high(covered)
            runs = [obj(row) for row in items(covered.get("solidCollisionWallRuns"))]
            for parcel_index_num, parcel_value in enumerate(items(face_obj.get("parcels"))):
                parcel = obj(parcel_value)
                parcel_path = f"{path}.parcels[{parcel_index_num}]"
                parcel_id = parcel.get("id")
                if not nonblank(parcel_id):
                    v.fail(parcel_path + ".id", "blank or placeholder id")
                    continue
                if parcel_id in global_ids:
                    v.fail(parcel_path + ".id", f"duplicate id {parcel_id}")
                global_ids.add(parcel_id)
                parcel_index[(zone_id, name, parcel_id)] = parcel
                if not nonblank(parcel.get("purpose")) or not nonblank(parcel.get("materialId")):
                    v.fail(parcel_path, "purpose and materialId must be explicit")
                if parcel.get("materialId") not in obj(design.get("materials")):
                    v.fail(parcel_path + ".materialId", "is not defined in materials")
                span = interval(parcel.get("interval"))
                top = parcel.get("wallTopM")
                if not finite(top):
                    v.fail(parcel_path + ".wallTopM", "must be finite")
                else:
                    top_required = max((number(obj(run).get("colliderEnvelopeM", {}).get("colliderTopM"))
                                        for run in runs if span and interval(run.get('interval'))
                                        and overlap(span[0], span[1], *interval(run['interval']))), default=low_floor)
                    if float(top) + EPS < top_required:
                        v.fail(parcel_path + ".wallTopM", f"{top} is below collider top {top_required}")
                roof = obj(parcel.get("roof"))
                for key in ("slabThicknessM", "parapetHeightM", "setbackM"):
                    if not finite(roof.get(key)) or number(roof.get(key)) < 0:
                        v.fail(parcel_path + ".roof." + key, "must be finite and non-negative")
                if number(roof.get("slabThicknessM")) <= EPS:
                    v.fail(parcel_path + ".roof.slabThicknessM", "must be > 0")
                if finite(top) and finite(roof.get("slabBottomM")) and abs(number(roof["slabBottomM"]) - float(top)) > 0.02:
                    v.fail(parcel_path + ".roof.slabBottomM", "must equal wallTopM within 0.02m")
                if finite(roof.get("slabBottomM")) and finite(roof.get("slabTopM")) and abs(number(roof["slabTopM"]) - number(roof["slabBottomM"]) - number(roof.get("slabThicknessM"))) > 0.02:
                    v.fail(parcel_path + ".roof", "slabTopM must equal slabBottomM + slabThicknessM")
                if finite(roof.get("parapetTopM")) and finite(roof.get("slabTopM")) and abs(number(roof["parapetTopM"]) - number(roof["slabTopM"]) - number(roof.get("parapetHeightM"))) > 0.02:
                    v.fail(parcel_path + ".roof", "parapetTopM must equal slabTopM + parapetHeightM")
                opening_rects: list[tuple[float, float, float, float, str]] = []
                for opening_number, opening_value in enumerate(items(parcel.get("openings"))):
                    opening = obj(opening_value)
                    opath = f"{parcel_path}.openings[{opening_number}]"
                    opening_id = opening.get("id")
                    if not nonblank(opening_id):
                        v.fail(opath + ".id", "blank or placeholder id")
                        continue
                    if opening_id in global_ids:
                        v.fail(opath + ".id", f"duplicate id {opening_id}")
                    global_ids.add(opening_id)
                    opening_index[(zone_id, name, parcel_id, opening_id)] = opening
                    if opening.get("kind") not in ("door", "window", "shop", "niche", "vent"):
                        v.fail(opath + ".kind", "must be door, window, shop, niche, or vent")
                    if not nonblank(opening.get("purpose")):
                        v.fail(opath + ".purpose", "must be explicit and non-placeholder")
                    if not all(finite(opening.get(key)) for key in ("alongM", "sillM", "widthM", "heightM", "depthM")):
                        v.fail(opath, "alongM/sillM/widthM/heightM/depthM must be finite")
                        continue
                    along, sill, width, height, depth = (number(opening[key]) for key in ("alongM", "sillM", "widthM", "heightM", "depthM"))
                    if width <= 0 or height <= 0 or depth <= 0:
                        v.fail(opath, "opening dimensions must be > 0")
                    if span and (along - width / 2 < span[0] + .14 - EPS or along + width / 2 > span[1] - .14 + EPS):
                        v.fail(opath, "opening lacks required 0.14m horizontal surround")
                    seat_exception = (
                        opening.get("kind") == "niche"
                        and opening.get("flushBase") is True
                        and opening.get("assemblyId") == "SD-09-SEAT"
                        and (zone_id, name, str(parcel_id), str(opening_id)) in seat_openings
                    )
                    civic_exception = (opening.get('assemblyId') == 'SD-11-CIVIC'
                                       and opening_id in {'F_W_ARCH','F_E_ARCH'}
                                       and obj(opening.get('closureProfile')).get('dadoTopM') == 1.1)
                    lower_surround = 0.0 if opening.get("kind") in ("door", "shop") or seat_exception or civic_exception else .14
                    if sill < low_floor + lower_surround - EPS or (finite(top) and sill + height > float(top) - .14 + EPS):
                        v.fail(opath, "opening lacks required 0.14m vertical surround")
                    opening_rects.append((along - width / 2, along + width / 2, sill, sill + height, str(opening_id)))
                for left_index, left in enumerate(opening_rects):
                    for right in opening_rects[left_index + 1:]:
                        if overlap(left[0], left[1], right[0], right[1]) and overlap(left[2], left[3], right[2], right[3]):
                            v.fail(parcel_path + ".openings", f"{left[4]} overlaps {right[4]}")

                footprint = parcel.get("footprint")
                if footprint is not None:
                    if not (isinstance(footprint, list) and len(footprint) == 4 and all(finite(x) for x in footprint)):
                        v.fail(parcel_path + ".footprint", "must be [minX,minY,maxX,maxY]")
                    else:
                        x0, y0, x1, y1 = map(float, footprint)
                        if x1 <= x0 + EPS or y1 <= y0 + EPS:
                            v.fail(parcel_path + ".footprint", "must have positive area")
                        for frozen_zone in items(coverage.get("zones")):
                            frozen = obj(frozen_zone)
                            frozen_rect = obj(frozen.get("rect"))
                            rx, ry, rw, rh = (number(frozen_rect.get(key)) for key in ("x", "y", "w", "h"))
                            if overlap(x0, x1, rx, rx + rw) and overlap(y0, y1, ry, ry + rh):
                                v.fail(parcel_path + ".footprint", f"enters walkable zone {frozen.get('id')}")
                                break

        groups = [obj(row) for row in items(area.get("activityGroups"))]
        clear = obj(area.get("clearRouteRegion"))
        clear_box = None
        if all(finite(clear.get(key)) for key in ("x", "y", "w", "h")):
            clear_box = (number(clear["x"]), number(clear["y"]), number(clear["x"]) + number(clear["w"]), number(clear["y"]) + number(clear["h"]))
        for group_number, group in enumerate(groups):
            gpath = f"{area_path}.activityGroups[{group_number}]"
            group_id = group.get("id")
            if not nonblank(group_id):
                v.fail(gpath + ".id", "blank or placeholder id")
                continue
            if group_id in global_ids:
                v.fail(gpath + ".id", f"duplicate id {group_id}")
            global_ids.add(group_id)
            box_value = bbox(group.get("bbox"))
            if not box_value or not all(box_value[index] < box_value[index + 3] - EPS for index in range(3)):
                v.fail(gpath + ".bbox", "must be finite, ordered min/max coordinates")
                continue
            receiver_face, receiver_parcel, receiver_opening = group.get("receiverFace"), group.get("receiverParcel"), group.get("receiverOpening")
            parcel = parcel_index.get((zone_id, str(receiver_face), str(receiver_parcel)))
            plant_exception = group.get("recipe") == "AG-PLANT" and receiver_opening is None
            opening = opening_index.get((zone_id, str(receiver_face), str(receiver_parcel), str(receiver_opening)))
            if not parcel:
                v.fail(gpath, "receiverFace/receiverParcel does not resolve")
                continue
            covered = coverage_by_face.get((zone_id, str(receiver_face)), {})
            if plant_exception:
                if abs(box_value[2] - floor_low(covered)) > EPS:
                    v.fail(gpath + ".bbox", "AG-PLANT trough minZ must equal local floor elevation")
            elif not opening:
                v.fail(gpath, "receiverOpening does not resolve")
            wall = number(obj(covered.get("wallPlane")).get("fixedCoordinate"))
            if box_value[2] < 2.2 - EPS and not group.get("retainedGameplay") and group_projection(str(receiver_face), wall, box_value) > .30 + EPS:
                v.fail(gpath + ".bbox", "low geometry projects more than 0.30m into street")
            if clear_box and overlap(box_value[0], box_value[3], clear_box[0], clear_box[2]) and overlap(box_value[1], box_value[4], clear_box[1], clear_box[3]):
                v.fail(gpath + ".bbox", f"overlaps clear route {clear.get('id')}")

            # A closed door needs a 0.8m clear service rectangle on the walkable side.
            for face in items(area.get("faces")):
                face_obj = obj(face)
                for parcel_value in items(face_obj.get("parcels")):
                    for opening_value in items(obj(parcel_value).get("openings")):
                        door = obj(opening_value)
                        if door.get("kind") != "door":
                            continue
                        dface = str(face_obj.get("face"))
                        cface = coverage_by_face.get((zone_id, dface))
                        if not cface:
                            continue
                        dplane = number(obj(cface.get("wallPlane")).get("fixedCoordinate"))
                        along = number(door.get("alongM"))
                        half = number(door.get("widthM")) / 2 + .20
                        side = route_side(dface, dplane, rect)
                        if dface in ("north", "south"):
                            service = face_rect(dface, dplane, along - half, along + half,
                                                dplane if side > 0 else dplane - .80,
                                                dplane + .80 if side > 0 else dplane)
                        else:
                            service = face_rect(dface, dplane, along - half, along + half,
                                                dplane if side > 0 else dplane - .80,
                                                dplane + .80 if side > 0 else dplane)
                        gx0, gy0, _gz0, gx1, gy1, _gz1 = box_value
                        if overlap(gx0, gx1, service[0], service[2]) and overlap(gy0, gy1, service[1], service[3]):
                            v.fail(gpath + ".bbox", f"overlaps 0.8m service floor of door {door.get('id')}")
                            break
        validate_fixtures(v, area, zone_id, coverage_by_face, parcel_index, opening_index, obj(design.get("materials")), global_ids)

    validate_skyline(v, design, coverage)
    validate_legacy(v, design, runtime, coverage)
    validate_documents(v, design, ROOT, args.coverage)
    validate_landmarks(v, design, coverage, obj(design.get("materials")), global_ids)
    validate_cameras(v, design, area_by_id, global_ids)

    if v.failures:
        print("\n".join(v.failures), file=sys.stderr)
        print(f"{len(v.failures)} validation failure(s)", file=sys.stderr)
        return 1
    print(f"PASS design={args.design} coverage={args.coverage}: 25 zones, 100 faces, {len(global_ids)} unique target ids, {len(items(design.get('legacyDispositions')))} legacy dispositions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
