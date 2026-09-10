#!/usr/bin/env python3
"""Derive the coordinated BZ-04 roof schedule from construction parcels.

The schedule is deliberately render-neutral.  A roof cell is a clip of one or
more authored parcel roof surfaces, never a replacement roof volume.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict, deque
from pathlib import Path
from typing import Any


EPS = 1e-6
HERE = Path(__file__).resolve().parent


def obj(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def rows(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def n(value: Any) -> float:
    if not finite(value):
        raise ValueError(f"expected finite number, got {value!r}")
    return float(value)


def rect(value: Any) -> tuple[float, float, float, float]:
    if not isinstance(value, list) or len(value) != 4:
        raise ValueError(f"expected [minX,minY,maxX,maxY], got {value!r}")
    x0, y0, x1, y1 = (n(item) for item in value)
    if x1 <= x0 + EPS or y1 <= y0 + EPS:
        raise ValueError(f"empty footprint {value!r}")
    return x0, y0, x1, y1


def round_number(value: float) -> float:
    # JSON floats from source should remain easy to diff without changing the
    # underlying authored datum materially.
    return round(value, 9)


def as_rect(value: tuple[float, float, float, float]) -> list[float]:
    return [round_number(part) for part in value]


def rect_area(value: tuple[float, float, float, float]) -> float:
    return (value[2] - value[0]) * (value[3] - value[1])


def rect_intersection(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> tuple[float, float, float, float] | None:
    result = (max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3]))
    return result if result[2] > result[0] + EPS and result[3] > result[1] + EPS else None


def contains(value: tuple[float, float, float, float], x: float, y: float) -> bool:
    return value[0] <= x + EPS and x <= value[2] + EPS and value[1] <= y + EPS and y <= value[3] + EPS


def shared_side(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> tuple[str, float, float, float] | None:
    """Return side on a, fixed coordinate, span start/end for an edge overlap."""
    if abs(a[2] - b[0]) <= EPS:
        lo, hi = max(a[1], b[1]), min(a[3], b[3])
        if hi > lo + EPS:
            return "east", a[2], lo, hi
    if abs(a[0] - b[2]) <= EPS:
        lo, hi = max(a[1], b[1]), min(a[3], b[3])
        if hi > lo + EPS:
            return "west", a[0], lo, hi
    if abs(a[3] - b[1]) <= EPS:
        lo, hi = max(a[0], b[0]), min(a[2], b[2])
        if hi > lo + EPS:
            return "north", a[3], lo, hi
    if abs(a[1] - b[3]) <= EPS:
        lo, hi = max(a[0], b[0]), min(a[2], b[2])
        if hi > lo + EPS:
            return "south", a[1], lo, hi
    return None


def opposite(side: str) -> str:
    return {"north": "south", "south": "north", "east": "west", "west": "east"}[side]


def edge_points(side: str, fixed: float, lo: float, hi: float) -> tuple[list[float], list[float]]:
    if side in ("east", "west"):
        return [round_number(fixed), round_number(lo)], [round_number(fixed), round_number(hi)]
    return [round_number(lo), round_number(fixed)], [round_number(hi), round_number(fixed)]


def roof_surfaces(design: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for area_index, area in enumerate(rows(design.get("areas"))):
        area = obj(area)
        zone, output_unit = area.get("zone"), area.get("outputUnit")
        if not isinstance(zone, str) or not isinstance(output_unit, str):
            raise ValueError(f"areas[{area_index}] needs zone and outputUnit")
        for face_index, face in enumerate(rows(area.get("faces"))):
            face = obj(face)
            for parcel_index, parcel in enumerate(rows(face.get("parcels"))):
                parcel = obj(parcel)
                roof = obj(parcel.get("roof"))
                parcel_id, owner = parcel.get("id"), parcel.get("buildingId")
                if not isinstance(parcel_id, str) or not isinstance(owner, str):
                    raise ValueError("roof parcel needs id and buildingId")
                footprint = rect(parcel.get("footprint"))
                required = ("slabBottomM", "slabTopM", "capTopM", "fallRatio")
                if any(not finite(roof.get(key)) for key in required):
                    raise ValueError(f"{parcel_id}.roof needs finite {', '.join(required)}")
                result.append({
                    "parcelId": parcel_id,
                    "ownerId": owner,
                    "outputUnit": output_unit,
                    "areaIndex": area_index,
                    "faceIndex": face_index,
                    "parcelIndex": parcel_index,
                    'faceInterval': parcel['interval'],
                    'facePlaneM': face['wallPlaneM'],
                    'floorElevationM': parcel['floorElevationM'],
                    'wallTopM': parcel['wallTopM'],
                    "zone": parcel.get("zone"),
                    "face": parcel.get("face"),
                    "footprint": footprint,
                    "areaM2": rect_area(footprint),
                    "roof": roof,
                    "openings": [obj(value) for value in rows(parcel.get("openings"))],
                })
    return sorted(result, key=lambda item: item["parcelId"])


def datum_key(surface: dict[str, Any]) -> tuple[Any, ...]:
    roof = surface["roof"]
    plane = obj(roof.get('finishPlane'))
    return (n(roof["slabTopM"]), n(roof["capTopM"]), str(roof.get("fallDirection", "")), n(roof["fallRatio"]),
            n(plane['constantM']), n(plane['gradientX']), n(plane['gradientY']))


def choose_surface(candidates: list[dict[str, Any]]) -> dict[str, Any]:
    # Highest finished cap wins.  At an equal cap, retain the largest authored
    # surface; parcel id is the final stable tie breaker.
    return sorted(candidates, key=lambda item: (-n(item["roof"]["capTopM"]), -item["areaM2"], item["parcelId"]))[0]


def merge_rectangles(cells: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Merge only same-owner/same-datum cells whose complete union is rectangular."""
    changed = True
    while changed:
        changed = False
        for left in range(len(cells)):
            for right in range(left + 1, len(cells)):
                a, b = cells[left], cells[right]
                if a["ownerId"] != b["ownerId"] or a["datumKey"] != b["datumKey"]:
                    continue
                ra, rb = a["rect"], b["rect"]
                union = (min(ra[0], rb[0]), min(ra[1], rb[1]), max(ra[2], rb[2]), max(ra[3], rb[3]))
                if abs(rect_area(union) - rect_area(ra) - rect_area(rb)) > EPS:
                    continue
                merged = {
                    "ownerId": a["ownerId"], "datumKey": a["datumKey"], "rect": union,
                    "clips": sorted(a["clips"] + b["clips"], key=lambda clip: (clip["parcelId"], clip["footprint"])),
                }
                cells[left] = merged
                cells.pop(right)
                changed = True
                break
            if changed:
                break
    return sorted(cells, key=lambda item: (item["ownerId"], item["rect"], item["datumKey"]))


def surface_for_clip(clips: list[dict[str, Any]], surfaces: dict[str, dict[str, Any]]) -> dict[str, Any]:
    return choose_surface([surfaces[clip["parcelId"]] for clip in clips])


def facade_masks(surfaces: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for source in surfaces:
        x0, y0, x1, y1 = source["footprint"]
        face = source["face"]
        if face == "north":
            side, fixed, span = "south", y0, [x0, x1]
        elif face == "south":
            side, fixed, span = "north", y1, [x0, x1]
        elif face == "east":
            side, fixed, span = "west", x0, [y0, y1]
        elif face == "west":
            side, fixed, span = "east", x1, [y0, y1]
        else:
            continue
        fixed = n(source['facePlaneM'])
        span = source['faceInterval']
        openings = []
        for opening in source["openings"]:
            if not isinstance(opening.get("id"), str) or not finite(opening.get("alongM")) or not finite(opening.get("widthM")):
                continue
            half = n(opening["widthM"]) / 2
            sill = n(opening.get("sillM", 0))
            head = n(opening["headM"]) if finite(opening.get("headM")) else sill + n(opening.get("heightM", 0))
            openings.append({
                "openingId": opening["id"],
                "alongM": [round_number(n(opening["alongM"]) - half), round_number(n(opening["alongM"]) + half)],
                "zM": [round_number(sill), round_number(head)],
            })
        result.append({
            "id": f"FACADE_MASK_{source['parcelId']}", "ownerId": source["ownerId"], "parcelId": source["parcelId"],
            "zone": source["zone"], "face": face, "roofBoundarySide": side,
            "wallPlaneM": round_number(fixed), "intervalM": [round_number(span[0]), round_number(span[1])],
            'fromZM': source['floorElevationM'], 'toZM': source['wallTopM'],
            "openingMasks": sorted(openings, key=lambda item: item["openingId"]),
            "rule": "No roof return may overlay this authored street facade or one of its openings.",
        })
    return result


def rear_point(source: dict[str, Any]) -> tuple[float, float, float]:
    roof, (x0, y0, x1, y1) = source["roof"], source["footprint"]
    drain = obj(roof.get("drain"))
    face = source["face"]
    along = n(drain.get("alongM")) if finite(drain.get("alongM")) else (x0 + x1) / 2 if face in ("north", "south") else (y0 + y1) / 2
    out = n(drain.get("outBehindM")) if finite(drain.get("outBehindM")) else (y1 - y0 if face in ("north", "south") else x1 - x0)
    if face == "north":
        x, y = along, y0 + out
    elif face == "south":
        x, y = along, y1 - out
    elif face == "east":
        x, y = x0 + out, along
    else:
        x, y = x1 - out, along
    z = n(drain["zM"]) if finite(drain.get("zM")) else slab_elevation_at(source, x, y)
    return x, y, z


def slab_elevation_at(source: dict[str, Any], x: float, y: float) -> float:
    """Evaluate the shared finished roof plane above the flat structural slab."""
    plane = obj(source['roof'].get('finishPlane'))
    return n(plane['constantM']) + n(plane['gradientX'])*x + n(plane['gradientY'])*y


def bundle_token(value: str) -> str:
    return "".join(character if character.isalnum() else "_" for character in value.upper())


def bundle_id_for_unit(unit: str) -> str:
    return f"ROOF_BUNDLE_{bundle_token(unit)}"


def roof_installation_contract(
    design: dict[str, Any], cells: list[dict[str, Any]], surfaces_list: list[dict[str, Any]],
    exposed: list[dict[str, Any]], steps: list[dict[str, Any]], seams: list[dict[str, Any]],
    collectors: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Give every source-derived cell one installable free-model bundle.

    This records an ownership contract only.  It deliberately does not claim a
    current builder can retire the legacy procedural roof producer.
    """
    areas = rows(design.get("areas"))
    by_zone = {area["zone"]: area for area in areas if isinstance(obj(area).get("zone"), str)}
    by_unit = {area["outputUnit"]: area for area in areas if isinstance(obj(area).get("outputUnit"), str)}
    buildings = {building["id"]: building for building in rows(design.get("buildings")) if isinstance(obj(building).get("id"), str)}
    if len(by_zone) != len(areas) or len(by_unit) != len(areas):
        raise ValueError("every area needs one unique zone and outputUnit for roof installation")

    def installation_unit(owner_id: str, source_units: set[str]) -> str:
        building = obj(buildings.get(owner_id))
        main_facade = obj(building.get("mainFacade"))
        main_zone = main_facade.get("zone")
        if isinstance(main_zone, str) and main_zone in by_zone:
            return by_zone[main_zone]["outputUnit"]
        declared_owner = building.get("owner")
        if isinstance(declared_owner, str) and declared_owner in by_unit:
            return declared_owner
        if len(source_units) == 1:
            return next(iter(source_units))
        raise ValueError(f"{owner_id} has no unambiguous roof installation output unit")

    source_geometry_by_cell: dict[str, list[dict[str, Any]]] = {}
    sources_by_id = {source['parcelId']: source for source in surfaces_list}
    installation_by_cell: dict[str, str] = {}
    for cell in cells:
        contributors: list[dict[str, Any]] = []
        for source in surfaces_list:
            overlap = rect_intersection(cell["rect"], source["footprint"])
            if source["ownerId"] != cell["ownerId"] or datum_key(source) != cell["datumKey"] or overlap is None:
                continue
            contributors.append({
                "parcelId": source["parcelId"],
                "designPointer": f"/areas/{source['areaIndex']}/faces/{source['faceIndex']}/parcels/{source['parcelIndex']}/roof",
                "zone": source["zone"], "outputUnit": source["outputUnit"],
                "worldClipXY": as_rect(overlap),
            })
        if not contributors:
            raise ValueError(f"{cell['id']} has no source geometry")
        contributors.sort(key=lambda item: (item["zone"], item["parcelId"]))
        source_geometry_by_cell[cell["id"]] = contributors
        installation_by_cell[cell["id"]] = installation_unit(cell["ownerId"], {item["outputUnit"] for item in contributors})

    contract_cells: list[dict[str, Any]] = []
    dependencies: list[dict[str, Any]] = []
    for cell in cells:
        cell_id = cell["id"]
        unit = installation_by_cell[cell_id]
        contributors = source_geometry_by_cell[cell_id]
        assignments = {item['parcelId']: obj(sources_by_id[item['parcelId']]['roof'].get('materialIds')) for item in contributors}
        if any(not assignment for assignment in assignments.values()):
            raise ValueError(f'{cell_id} requires exact roof component material assignments')
        material_ids = sorted({material for assignment in assignments.values() for material in assignment.values()})
        affected_units = sorted({unit, *(item["outputUnit"] for item in contributors)})
        bundle_id = bundle_id_for_unit(unit)
        contract_cells.append({
            "id": cell_id, "ownerId": cell["ownerId"], "footprint": as_rect(cell["rect"]),
            "roofDatum": {"slabTopM": cell["datumKey"][0], "capTopM": cell["datumKey"][1], "fallDirection": cell["datumKey"][2], "fallRatio": cell["datumKey"][3],
                          "finishPlane": {"constantM": cell["datumKey"][4], "gradientX": cell["datumKey"][5], "gradientY": cell["datumKey"][6]}},
            "clippedOriginalSurfaces": cell["clips"],
            "installationOutputUnit": unit, "roofBundleId": bundle_id,
            "modelId": f"bz04_roof_bundle_{unit.replace('-', '_')}",
            "requiredMaterialIds": material_ids,
            "requiredMaterialIdsSource": 'source parcel roof.materialIds',
            'componentMaterialsBySource': assignments,
            "materialAssignmentStatus": "Exact component materials are assigned in the source; no palette choice remains to construction.",
            "sourceGeometry": contributors,
            "affectedOutputUnits": affected_units,
            "installationScope": "Install this roof cell only through the named free-model bundle; it does not build any facade from another area.",
        })
        for dependent in affected_units:
            if dependent == unit:
                continue
            source_refs = [item for item in contributors if item["outputUnit"] == dependent]
            dependencies.append({
                "id": f"ROOF_DEP_{cell_id}_{bundle_token(dependent)}",
                "roofCellId": cell_id, "requiredBundleId": bundle_id,
                "requiredOutputUnit": unit, "dependentOutputUnit": dependent,
                "sourceGeometry": source_refs,
                "permittedScope": "The dependent area may construct or reuse this required roof bundle only when its named receiver facades/returns are already complete or an explicit dimensioned phase applies. This does not authorize building another output unit's facades.",
                "retirementRule": "Do not retire either area's legacy roof visual until the named bundle is installed and its seam interfaces are checked.",
            })

    cell_by_id = {cell["id"]: cell for cell in contract_cells}
    interface_rows: list[dict[str, Any]] = []
    for kind, records, field in (("sameHeightSeam", seams, "roofCellIds"), ("stepReturn", steps, None)):
        for record in records:
            cell_ids = rows(record.get(field)) if field else [record["highRoofCellId"], record["lowRoofCellId"]]
            bundle_ids = sorted({cell_by_id[cell_id]["roofBundleId"] for cell_id in cell_ids})
            if len(bundle_ids) < 2:
                continue
            interface_rows.append({
                "id": f"ROOF_INTERFACE_{record['id']}", "type": kind, "sourceScheduleId": record["id"],
                "roofCellIds": sorted(cell_ids), "roofBundleIds": bundle_ids,
                "outputUnits": sorted({cell_by_id[cell_id]["installationOutputUnit"] for cell_id in cell_ids}),
                "rule": record["closure"] if kind == "sameHeightSeam" else record["rule"],
            })

    cells_by_unit: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for cell in contract_cells:
        cells_by_unit[cell["installationOutputUnit"]].append(cell)
    collectors_by_unit: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for collector in collectors:
        source_units = {source["outputUnit"] for source in surfaces_list if source["ownerId"] == collector["ownerId"]}
        collectors_by_unit[installation_unit(collector["ownerId"], source_units)].append(collector)

    bundles: list[dict[str, Any]] = []
    for unit, assigned in sorted(cells_by_unit.items()):
        cell_ids = sorted(cell["id"] for cell in assigned)
        source_ids = {item["parcelId"] for cell in assigned for item in cell["sourceGeometry"]}
        source_surfaces = [source for source in surfaces_list if source["parcelId"] in source_ids]
        x0, y0 = min(cell["footprint"][0] for cell in assigned), min(cell["footprint"][1] for cell in assigned)
        x1, y1 = max(cell["footprint"][2] for cell in assigned), max(cell["footprint"][3] for cell in assigned)
        z0 = min(n(source["roof"]["slabBottomM"]) for source in source_surfaces)
        z1 = max(n(source["roof"]["capTopM"]) for source in source_surfaces)
        owned_steps = [step for step in steps if step['highRoofCellId'] in cell_ids]
        owned_seams = [seam for seam in seams if min(seam['roofCellIds']) in cell_ids]
        for step in owned_steps:
            heights=step['lowRoofSurfaceAtEdgeM']
            z0=min(z0, heights['start']-.02, heights['end']-.02)
        # The cap has a fixed0.03m overhang; return thickness stays inside its owner.
        x0-=.03; y0-=.03; x1+=.03; y1+=.03
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        boundary_segments = [edge for edge in exposed if edge["roofCellId"] in cell_ids]
        bundle_collectors = collectors_by_unit[unit]
        slab_triangles, finish_triangles = 12 * len(assigned), 2 * len(assigned)
        parapet_triangles, collector_triangles = 96 * len(boundary_segments), 256 * len(bundle_collectors)
        return_triangles=48*(len(owned_steps)+len(owned_seams))
        component_materials={source['parcelId']: obj(source['roof'].get('materialIds')) for source in source_surfaces}
        cast_materials=sorted({material for assignment in component_materials.values() for role,material in assignment.items() if role not in ('finish','collector')})
        receive_materials=sorted({material for assignment in component_materials.values() for role,material in assignment.items() if role in ('finish','collector')})
        source_units = {source["outputUnit"] for cell in assigned for source in cell["sourceGeometry"]}
        interface_ids = [row["id"] for row in interface_rows if bundle_id_for_unit(unit) in row["roofBundleIds"]]
        interfaces = [row for row in interface_rows if row["id"] in interface_ids]
        affected_units = sorted({unit, *source_units, *(other for row in interfaces for other in row["outputUnits"])})
        model_id = f"bz04_roof_bundle_{unit.replace('-', '_')}"
        bundles.append({
            "id": bundle_id_for_unit(unit), "installationOutputUnit": unit, "modelId": model_id,
            "plannedModelFile": f"roof-bundle-{unit.removeprefix('unit-')}.glb",
            "plannedBuilderTarget": f"assets/source/{unit}/build.py",
            "plannedTargetOnly": True,
            "worldBoundsDesign": {"min": [round_number(x0), round_number(y0), round_number(z0)], "max": [round_number(x1), round_number(y1), round_number(z1)]},
            "localBoundsAuthoringZUp": {"min": [round_number(x0-cx), round_number(y0-cy), 0], "max": [round_number(x1-cx), round_number(y1-cy), round_number(z1-z0)]},
            "localBoundsGltfYUp": {"min": [round_number(x0-cx), 0, round_number(y0-cy)], "max": [round_number(x1-cx), round_number(z1-z0), round_number(y1-cy)]},
            "baseCentrePlacement": {"id": f"BZ04_ROOF_BUNDLE_{bundle_token(unit)}", "modelId": model_id,
                                    "position": {"x": round_number(cx), "y": round_number(cy), "z": round_number(z0)}, "yawDeg": 180, "role": "dressing"},
            "roofCellIds": cell_ids, "requiredMaterialIds": sorted(set(cast_materials+receive_materials)),
            "requiredMaterialIdsSource": 'source parcel roof.materialIds',
            'componentMaterialsBySource': component_materials,
            "materialAssignmentStatus": "Assigned in the controlled source, including structural stone, finish, parapet and collector.",
            'ownedStepReturnIds': [step['id'] for step in owned_steps],
            'ownedSameHeightSeamIds': [seam['id'] for seam in owned_seams],
            'castMaterialIds': cast_materials, 'receiveOnlyMaterialIds': receive_materials,
            'authoringTransform': 'Blender local=(worldX-centerX, -(worldY-centerY), worldZ-baseZ); Y-up export produces glTF(eastOffset, height, northOffset). Use placement yaw180: the existing loader adds180, producing identity orientation. Never use yaw0 with this baked frame.',
            "affectedOutputUnits": affected_units, "interfaceIds": interface_ids,
            "declaredAllocation": {
                "status": "planning allocation derived from the scheduled cells; verify exported counts before any performance claim",
                "triangles": {"structuralSlabs": slab_triangles, "finishPlanes": finish_triangles, "perimeterParapets": parapet_triangles,
                              "collectors": collector_triangles, 'seamAndStepReturns':return_triangles,
                              "total": slab_triangles + finish_triangles + parapet_triangles + collector_triangles + return_triangles},
                "primitives": {"structuralCast": len(cast_materials), "finishAndCollectorReceive": len(receive_materials),
                               "total": len(cast_materials)+len(receive_materials)},
                "shadow": {"castPrimitives": len(cast_materials), "receiveOnlyPrimitives": len(receive_materials),
                           "rule": "Export by material and shadow class; the allocation is not an observed runtime measurement."},
            },
            "supportScope": "Render-only slab, finish, parapet, cap, collector and listed seam closure only. Retain gameplay colliders and the named facade/support geometry; this bundle adds no facade or playable elevation.",
            "interfaceScope": "Install and inspect only the listed interfaceIds. Cross-bundle seams and step returns retain their printed absolute coordinates; do not add a duplicate slab or facade to hide an interim mismatch.",
            "retirementScope": {
                'status':'scheduled render-only integration; no remaining design choice',
                'coverageXY':[cell['footprint'] for cell in assigned],
                'components':['roof slab','roof finish','parapet','roof coping'],
                'producerPaths':['v3Architecture.ts roof/slab/parapet mesh emission','buildBlockout.ts residual roof/coping render emission','buildProps.ts scheduled legacy roof visuals'],
                'activation':'Activate only after this exact placement/model loads and its bounds/interfaces pass. Placement upsert alone does not activate retirement.',
                'requiredWork':'At the listed render emission, subtract only this coverage from the named roof components; retain outside fragments and all wall/collider generation. Split a mixed legacy visual asset in deterministic source when needed, preserving its outside fragment and provenance. Retire complete obsolete roof assets only through their existing design disposition. No whole-neighbor facade is removed by a roof binding.',
                'verification':'Before marking the requesting area built, prove one roof surface per owned cell, sound prescribed receivers, no stale overlapping roof parts, and the unchanged runtime collider hash.'},
        })

    area_assignments: list[dict[str, Any]] = []
    for area in areas:
        area = obj(area)
        zone, unit = area["zone"], area["outputUnit"]
        relevant = [cell for cell in contract_cells if unit in cell["affectedOutputUnits"]]
        relevant_ids = sorted(cell["id"] for cell in relevant)
        bundle_ids = sorted({cell["roofBundleId"] for cell in relevant})
        dependency_ids = sorted(dep["id"] for dep in dependencies if dep["dependentOutputUnit"] == unit or dep["requiredOutputUnit"] == unit)
        area_assignments.append({"zone": zone, "roofCellIds": relevant_ids, "roofBundleIds": bundle_ids, "dependencyIds": dependency_ids})
    return contract_cells, bundles, sorted(dependencies, key=lambda item: item["id"]), sorted(interface_rows, key=lambda item: item["id"]), area_assignments


def build_schedule(design: dict[str, Any]) -> dict[str, Any]:
    owner_kinds = {b['id']: b['kind'] for b in design['buildings']}
    surfaces_list = roof_surfaces(design)
    surfaces = {surface["parcelId"]: surface for surface in surfaces_list}
    xs = sorted({coordinate for surface in surfaces_list for coordinate in (surface["footprint"][0], surface["footprint"][2])})
    ys = sorted({coordinate for surface in surfaces_list for coordinate in (surface["footprint"][1], surface["footprint"][3])})
    atoms: list[dict[str, Any]] = []
    for xi in range(len(xs) - 1):
        for yi in range(len(ys) - 1):
            cell = (xs[xi], ys[yi], xs[xi + 1], ys[yi + 1])
            candidates = [surface for surface in surfaces_list if contains(surface["footprint"], (cell[0] + cell[2]) / 2, (cell[1] + cell[3]) / 2)]
            if candidates:
                winner = choose_surface(candidates)
                atoms.append({"ownerId": winner["ownerId"], "datumKey": datum_key(winner), "rect": cell,
                              "clips": [{"parcelId": winner["parcelId"], "footprint": as_rect(cell)}]})
    cells = merge_rectangles(atoms)
    for index, cell in enumerate(cells, 1):
        cell["id"] = f"ROOF_CELL_{index:03d}"
    cell_by_id = {cell["id"]: cell for cell in cells}

    # Atomic cells preserve exact ownership boundaries while merged cells are
    # the compact schedule representation.  Attribute edges to merged cells by
    # looking up a point infinitesimally inside their rectangle.
    def merged_at(x: float, y: float) -> dict[str, Any] | None:
        for cell in cells:
            if contains(cell["rect"], x, y):
                return cell
        return None

    masks = facade_masks(surfaces_list)
    mask_lookup = {(mask["parcelId"], mask["roofBoundarySide"]): mask["id"] for mask in masks}
    exposed: list[dict[str, Any]] = []
    steps: list[dict[str, Any]] = []
    seams: list[dict[str, Any]] = []
    seen_pairs: set[tuple[str, str, str, float, float, float]] = set()
    for atom in atoms:
        source = surfaces[atom["clips"][0]["parcelId"]]
        x0, y0, x1, y1 = atom["rect"]
        for side, fixed, lo, hi, sample in (
            ("west", x0, y0, y1, (x0 - EPS * 4, (y0 + y1) / 2)),
            ("east", x1, y0, y1, (x1 + EPS * 4, (y0 + y1) / 2)),
            ("south", y0, x0, x1, ((x0 + x1) / 2, y0 - EPS * 4)),
            ("north", y1, x0, x1, ((x0 + x1) / 2, y1 + EPS * 4)),
        ):
            other = next((candidate for candidate in atoms if contains(candidate["rect"], sample[0], sample[1])), None)
            here_cell = merged_at((x0 + x1) / 2, (y0 + y1) / 2)
            if not here_cell:
                continue
            start, end = edge_points(side, fixed, lo, hi)
            if other is None:
                exposed.append({
                    "ownerId": atom["ownerId"], "roofCellId": here_cell["id"], "sourceParcelId": source["parcelId"],
                    "side": side, "startXY": start, "endXY": end,
                    "capTopM": round_number(n(source["roof"]["capTopM"])),
                    "facadeMaskIds": [mask['id'] for mask in masks
                                      if mask['roofBoundarySide'] == side and abs(mask['wallPlaneM']-fixed) <= EPS
                                      and min(mask['intervalM'][1],hi) > max(mask['intervalM'][0],lo)+EPS],
                })
                continue
            other_cell = merged_at(sample[0], sample[1])
            if not other_cell or other_cell["id"] == here_cell["id"]:
                continue
            # The same interface is visited from both atoms.  Side belongs in
            # the emitted record, not the unordered de-duplication key.
            key = tuple(sorted((here_cell["id"], other_cell["id"]))) + (round(fixed, 9), round(lo, 9), round(hi, 9))
            if key in seen_pairs:
                continue
            seen_pairs.add(key)
            other_source = surface_for_clip(other["clips"], surfaces)
            cap, other_cap = n(source["roof"]["capTopM"]), n(other_source["roof"]["capTopM"])
            if abs(cap - other_cap) <= EPS:
                seams.append({"ownerIds": sorted({atom["ownerId"], other["ownerId"]}), "roofCellIds": sorted((here_cell["id"], other_cell["id"])),
                              "side": side, "startXY": start, "endXY": end, "capTopM": round_number(cap),
                              'finishAtEdgeM': {'first': [round_number(slab_elevation_at(source, *point)) for point in (start,end)],
                                                'second': [round_number(slab_elevation_at(other_source, *point)) for point in (start,end)]},
                              'closure': ('One 0.16m party-wall upstand to the common cap; each finished surface terminates against it.'
                                          if atom['ownerId'] != other['ownerId'] and all(owner_kinds[o] == 'building' for o in (atom['ownerId'],other['ownerId']))
                                          else 'Continuous opaque finish/coping joint; no additional upstand. Close any finish-level difference with a 0.02m concealed overlap.')})
            else:
                high_atom, low_atom = (atom, other) if cap > other_cap else (other, atom)
                high_source = source if cap > other_cap else other_source
                low_source = other_source if cap > other_cap else source
                high_cell = here_cell if cap > other_cap else other_cell
                low_cell = other_cell if cap > other_cap else here_cell
                steps.append({
                    "highOwnerId": high_atom["ownerId"], "lowOwnerId": low_atom["ownerId"],
                    "highRoofCellId": high_cell["id"], "lowRoofCellId": low_cell["id"], "sideOnHighCell": side if cap > other_cap else opposite(side),
                    "startXY": start, "endXY": end, "highCapTopM": round_number(n(high_source["roof"]["capTopM"])),
                    "lowCapTopM": round_number(n(low_source["roof"]["capTopM"])),
                    "lowRoofSurfaceAtEdgeM": {"start": round_number(slab_elevation_at(low_source, start[0], start[1])),
                                              "end": round_number(slab_elevation_at(low_source, end[0], end[1]))},
                    "rule": "The low return begins at the lower finished roof at this edge, with0.02m concealed overlap; never start it at the lower cap.",
                })

    # Island membership is based on clipped owner atoms, so a buried roof can
    # never become an exposed collector island.
    by_owner: dict[str, list[int]] = defaultdict(list)
    for index, atom in enumerate(atoms):
        by_owner[atom["ownerId"]].append(index)
    collectors: list[dict[str, Any]] = []
    for owner, indexes in sorted(by_owner.items()):
        remaining = set(indexes)
        island_number = 0
        while remaining:
            island_number += 1
            start = min(remaining)
            component = {start}
            queue = deque([start])
            remaining.remove(start)
            while queue:
                current = queue.popleft()
                for candidate in list(remaining):
                    if shared_side(atoms[current]["rect"], atoms[candidate]["rect"]):
                        component.add(candidate)
                        remaining.remove(candidate)
                        queue.append(candidate)
            component_atoms = [atoms[index] for index in sorted(component)]
            component_sources = sorted({atom["clips"][0]["parcelId"] for atom in component_atoms})
            candidates = sorted((surfaces[source_id] for source_id in component_sources), key=lambda item: (-item["areaM2"], item["parcelId"]))
            chosen = candidates[0]
            if not chosen['roof'].get('collectorRequired'):
                continue
            component_edges = [edge for edge in exposed if edge['ownerId'] == owner and edge['sourceParcelId'] in component_sources]
            if not component_edges:
                continue
            # Every face of a real building shares this plane. Select the
            # lowest exposed edge; do not move a drain to an arbitrary long edge.
            edge = min(component_edges, key=lambda e: (slab_elevation_at(chosen, (e['startXY'][0]+e['endXY'][0])/2, (e['startXY'][1]+e['endXY'][1])/2), -math.dist(e['startXY'],e['endXY']), e['startXY']))
            x = (edge['startXY'][0]+edge['endXY'][0])/2
            y = (edge['startXY'][1]+edge['endXY'][1])/2
            z = slab_elevation_at(chosen, x, y)
            # An authored drain is usable only when it is on the union boundary.
            on_exposed = any(
                edge["ownerId"] == owner and edge["sourceParcelId"] in component_sources and
                ((abs(x - edge["startXY"][0]) <= EPS and abs(y - edge["startXY"][1]) <= EPS) or
                 (abs(x - edge["endXY"][0]) <= EPS and abs(y - edge["endXY"][1]) <= EPS) or
                 (min(edge["startXY"][0], edge["endXY"][0]) - EPS <= x <= max(edge["startXY"][0], edge["endXY"][0]) + EPS and
                  min(edge["startXY"][1], edge["endXY"][1]) - EPS <= y <= max(edge["startXY"][1], edge["endXY"][1]) + EPS))
                for edge in exposed
            )
            if not on_exposed:
                component_edges = [edge for edge in exposed if edge["ownerId"] == owner and edge["sourceParcelId"] in component_sources]
                if not component_edges:
                    continue
                edge = sorted(component_edges, key=lambda item: (-math.dist(item["startXY"], item["endXY"]), item["side"], item["startXY"]))[0]
                x = (edge["startXY"][0] + edge["endXY"][0]) / 2
                y = (edge["startXY"][1] + edge["endXY"][1]) / 2
                # This fallback remains on the chosen source's authored plane.
                z = n(chosen["roof"]["slabTopM"])
            collectors.append({
                "id": f"ROOF_COLLECTOR_{owner}_{island_number}", "ownerId": owner,
                "sourceParcelId": chosen["parcelId"], "pointXYZ": [round_number(x), round_number(y), round_number(z)],
                "type": "concealed rear collector", "mayUseInternalDownpipe": True,
                "rule": "Collector is on an exposed owner-island boundary; no drain is placed on a buried roof.",
            })

    for index, row in enumerate(exposed, 1): row["id"] = f"ROOF_EDGE_{index:03d}"
    for index, row in enumerate(steps, 1): row["id"] = f"ROOF_STEP_{index:03d}"
    for index, row in enumerate(seams, 1): row["id"] = f"ROOF_SEAM_{index:03d}"
    contract_cells, bundles, dependencies, interfaces, area_assignments = roof_installation_contract(
        design, cells, surfaces_list, exposed, steps, seams, collectors,
    )
    return {
        "schemaVersion": 2,
        "generatedFrom": {"design": "design.json", "derivedRoofScheduleField": design.get("derivedRoofSchedule"), "generator": "roofs.py"},
        "sourceSurfaceRule": "Each roof cell is clipped from its winning authored parcel roof surface; no independent roof boxes are defined here.",
        "installationContract": {
            "rule": "Each roof cell has exactly one installation output unit and belongs to its reusable free-model roof bundle. A dependent area activates a required bundle only after its explicit receiver prerequisites are satisfied or an authored phase applies; no automatic neighboring-facade scope is granted.",
            "placementPath": "Use the existing area package models[] and placements[] path. Its placement upsert does not retire a legacy procedural roof producer.",
            "phasingStatus": "Implementation work is explicitly scheduled per bundle: bounded render-component retirement after successful load and interface inspection; no collider change.",
        },
        "roofSurfaces": [{
            "parcelId": source["parcelId"], "ownerId": source["ownerId"], "zone": source["zone"], "face": source["face"],
            "footprint": as_rect(source["footprint"]), "originalRoof": {
                key: source["roof"].get(key) for key in ("slabBottomM", "slabTopM", "parapetTopM", "capTopM", "fallDirection", "fallRatio", "finishPlane", "collectorRequired")
            },
        } for source in surfaces_list],
        "roofCells": contract_cells,
        "roofBundles": bundles,
        "dependencyAssociations": dependencies,
        "interfaceAssociations": interfaces,
        "areaRoofAssignments": area_assignments,
        "exposedUnionBoundaryEdges": exposed, "stepReturnEdges": steps, "sharedSameHeightSeams": seams,
        "facadeMasks": masks, "collectors": collectors,
    }


def design_patch(schedule: dict[str, Any]) -> dict[str, Any]:
    assignments = {row["zone"]: {"roofCellIds": row["roofCellIds"], "roofBundleIds": row["roofBundleIds"]}
                   for row in schedule["areaRoofAssignments"]}
    return {
        "schemaVersion": 1,
        "generatedFrom": {"design": "docs/map-design/construction/design.json", "schedule": "docs/map-design/construction/roof-coordination.json", "generator": "docs/map-design/construction/roofs.py"},
        "operation": "Root applies only zones[zone].roofCellIds and zones[zone].roofBundleIds to design.json after reviewing this proposal.",
        "zones": assignments,
        "validationRecommendations": [
            "Reject dangling roofCellIds and roofBundleIds against roof-coordination.json.",
            "Require every roof cell to name exactly one roofBundleId and every bundle to contain each named cell exactly once.",
            "Require every cross-output source geometry record to have one dependency association and every dependency's required bundle to exist.",
            "Compare exported triangle, primitive and shadow counts with each bundle's declared planning allocation before any performance claim.",
            "Before retiring a legacy procedural roof producer, prove its replacement bundle is registered, placed, bounded, seam-checked and collider-neutral.",
        ],
    }


def encoded(schedule: dict[str, Any]) -> bytes:
    return (json.dumps(schedule, indent=2, sort_keys=True) + "\n").encode("utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--design", type=Path, default=HERE / "design.json")
    parser.add_argument("--output", type=Path, default=HERE / "roof-coordination.json")
    parser.add_argument("--design-patch", type=Path, default=HERE.parent.parent.parent / "artifacts/bazaar-doc-revamp/roof-ownership-design-patch.json")
    parser.add_argument("--check", action="store_true", help="compare generated bytes with the saved schedule without writing")
    args = parser.parse_args()
    try:
        schedule = build_schedule(json.loads(args.design.read_text(encoding="utf-8")))
        output = encoded(schedule)
        patch = encoded(design_patch(schedule))
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"FAIL roofs.py: {error}", file=sys.stderr)
        return 1
    if args.check:
        try:
            current = args.output.read_bytes()
            current_patch = args.design_patch.read_bytes()
        except FileNotFoundError:
            print(f"FAIL roofs.py: missing generated schedule or design patch", file=sys.stderr)
            return 1
        if current != output or current_patch != patch:
            print(f"FAIL roofs.py: generated roof schedule or design patch differs from deterministic in-memory output", file=sys.stderr)
            return 1
        print(f"PASS roofs.py --check: {len(schedule['roofCells'])} roof cells, {len(schedule['roofBundles'])} bundles, {len(schedule['dependencyAssociations'])} dependencies")
        return 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.design_patch.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(output)
    args.design_patch.write_bytes(patch)
    print(f"WROTE {args.output}: {len(schedule['roofCells'])} roof cells, {len(schedule['roofBundles'])} bundles, {len(schedule['dependencyAssociations'])} dependencies")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
