#!/usr/bin/env python3
"""Generate measured BZ-04 sheets and SVGs from maintained design data.

The generator only writes documents; it never invokes game compilation or builds.
Run with --check to compare temporary outputs without changing the checkout.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import math
import re
import filecmp
import tempfile
import roofs
import textwrap
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CANONICAL_CONSTRUCTION = ROOT / "docs/map-design/construction"

# The current canonical names remain the output contract for a draft issue.
SHEETS: list[tuple[str, str, list[str]]] = [
    ("unit-spawn-a-courtyard.md", "Spawn A Courtyard", ["SPAWN_A_COURTYARD"]),
    ("unit-spice-street.md", "Spice Street", ["SPICE_STREET"]),
    ("unit-fountain-court.md", "Fountain Court", ["FOUNTAIN_COURT"]),
    ("unit-textile-arcade.md", "Textile Arcade", ["TEXTILE_ARCADE"]),
    ("unit-rug-gate.md", "Rug Gate", ["RUG_GATE"]),
    ("unit-spawn-b-courtyard.md", "Spawn B Courtyard", ["SPAWN_B_COURTYARD"]),
    ("unit-service-south.md", "Service South", ["SERVICE_SOUTH"]),
    ("unit-caravan-court.md", "Caravan Court", ["CARAVAN_COURT"]),
    ("unit-tea-terrace.md", "Tea Elevation", ["TEA_RAMP", "TEA_TERRACE", "TEA_STAIRS", "TEA_LANDING"]),
    ("unit-service-north.md", "Service North", ["SERVICE_NORTH"]),
    ("unit-dyers-alley.md", "Dyers Alley", ["DYERS_ALLEY"]),
    ("unit-covered-souk.md", "Covered Souk", ["COVERED_SOUK"]),
    ("unit-dyers-dogleg.md", "Dyers Dogleg", ["DYERS_DOGLEG"]),
    ("unit-north-court.md", "North Court", ["NORTH_COURT"]),
    ("links.md", "Links", [
        "LINK_SOUTH_WEST", "LINK_SOUTH_EAST", "LINK_WEST_MID", "LINK_EAST_MID",
        "LINK_WEST_UPPER", "LINK_EAST_UPPER", "LINK_NORTH_WEST", "LINK_NORTH_EAST",
    ]),
]

FACE_ORDER = ("north", "east", "south", "west")
COLORS = ("#d7b983", "#c78d67", "#8fa8a0", "#ad7862", "#b29b71", "#8a9a7c")


def die(message: str) -> None:
    raise SystemExit(f"gen.py: {message}")


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def esc(value: Any) -> str:
    return html.escape(str(value), quote=True)


def md(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", "<br>")


def num(value: Any, fallback: float = 0.0) -> float:
    return float(value) if isinstance(value, (int, float)) and math.isfinite(value) else fallback


def fmt(value: Any, places: int = 3) -> str:
    if not isinstance(value, (int, float)) or not math.isfinite(value):
        return "—"
    return f"{value:.{places}f}".rstrip("0").rstrip(".")


def short(value: Any, limit: int = 28) -> str:
    text = str(value)
    return text if len(text) <= limit else text[:limit - 1] + "…"


def interval(value: Any) -> tuple[float, float] | None:
    if isinstance(value, list) and len(value) == 2:
        return num(value[0]), num(value[1])
    if isinstance(value, dict):
        if "worldLow" in value and "worldHigh" in value:
            return num(value["worldLow"]), num(value["worldHigh"])
        if "start" in value and "end" in value:
            return num(value["start"]), num(value["end"])
    return None


def bbox(value: Any) -> tuple[float, float, float, float, float, float] | None:
    item = as_dict(value)
    low, high = item.get("min"), item.get("max")
    if not (isinstance(low, list) and isinstance(high, list) and len(low) == 3 and len(high) == 3):
        return None
    return tuple(num(v) for v in [*low, *high])  # type: ignore[return-value]


def material_color(material_id: str, materials: dict[str, Any]) -> str:
    source = as_dict(materials.get(material_id))
    for key in ("targetAppearanceSrgb", "color", "displayColor", "swatch", "hex"):
        value = source.get(key)
        if isinstance(value, str) and value.startswith("#"):
            return value
    return {'bz04_ceramic_project_original':'#c5a37c', 'bz04_brass_project_original':'#8f7750',
            'bz04_plant_project_original':'#738565', 'bz04_soil_project_original':'#6c5a45',
            'bz04_teal_timber_project_original':'#4e7973'}.get(material_id, '#b7afa0')


@dataclass(frozen=True)
class CoverageFace:
    zone: str
    face: str
    start: float
    end: float
    floor: dict[str, Any]
    solid: list[dict[str, Any]]
    openings: list[dict[str, Any]]


def coverage_index(coverage: dict[str, Any]) -> dict[tuple[str, str], CoverageFace]:
    result: dict[tuple[str, str], CoverageFace] = {}
    for zone in as_list(coverage.get("zones")):
        z = as_dict(zone)
        zone_id = str(z.get("id", ""))
        for raw_face in as_list(z.get("faces")):
            face = as_dict(raw_face)
            plane = as_dict(face.get("wallPlane"))
            span = as_dict(plane.get("interval"))
            name = str(face.get("face", ""))
            if zone_id and name in FACE_ORDER:
                solid = as_list(face.get("solidCollisionCoverageIntervals"))
                if not solid:  # Supports the first extraction revision too.
                    solid = as_list(face.get("solidCollisionWallRuns"))
                result[(zone_id, name)] = CoverageFace(
                    zone=zone_id,
                    face=name,
                    start=num(span.get("start")),
                    end=num(span.get("end")),
                    floor=as_dict(face.get("floor")),
                    solid=[as_dict(item) for item in solid],
                    openings=[as_dict(item) for item in as_list(face.get("immutableOpeningRuns"))],
                )
    return result


def zone_rects(coverage: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {str(z.get("id")): as_dict(z.get("rect")) for z in as_list(coverage.get("zones")) if as_dict(z).get("id")}


def rect_from_route(value: Any) -> tuple[float, float, float, float] | None:
    item = as_dict(value)
    if {"x", "y", "w", "h"}.issubset(item):
        return num(item["x"]), num(item["y"]), num(item["w"]), num(item["h"])
    box = bbox(item)
    if box:
        x0, y0, _z0, x1, y1, _z1 = box
        return x0, y0, x1 - x0, y1 - y0
    return None


def routes(area: dict[str, Any]) -> list[dict[str, Any]]:
    raw = area.get("clearRouteRegions", area.get("clearRouteRegion", area.get("clearRoute")))
    values = raw if isinstance(raw, list) else [raw] if raw is not None else []
    result = []
    for index, value in enumerate(values):
        rectangle = rect_from_route(value)
        if rectangle:
            result.append({"id": as_dict(value).get("id", f"CLEAR_ROUTE_{index + 1}"), "rect": rectangle})
    return result


def opening_rows(parcel: dict[str, Any]) -> list[dict[str, Any]]:
    return [as_dict(value) for value in as_list(parcel.get("openings"))]


def area_faces(area: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {str(as_dict(face).get("face")): as_dict(face) for face in as_list(area.get("faces"))}


def face_parcels(area: dict[str, Any], face: str) -> list[dict[str, Any]]:
    return [as_dict(value) for value in as_list(area_faces(area).get(face, {}).get("parcels"))]


def polygon_points(value: Any) -> list[tuple[float, float]]:
    """Read the small polygon variants used by retained-plan annotations."""
    raw = as_dict(value).get("footprintPolygon", as_dict(value).get("polygon", value))
    if isinstance(raw, dict):
        raw = raw.get("points", raw.get("vertices", []))
    result: list[tuple[float, float]] = []
    for point in as_list(raw):
        if isinstance(point, list) and len(point) >= 2:
            result.append((num(point[0]), num(point[1])))
        elif isinstance(point, dict):
            result.append((num(point.get("x")), num(point.get("y"))))
    return result


def retained_polygons(area: dict[str, Any]) -> list[tuple[str, list[tuple[float, float]]]]:
    raw = area.get("retainedGameplay")
    items = raw if isinstance(raw, list) else [raw] if raw is not None else []
    result = []
    for index, item in enumerate(items, 1):
        data = as_dict(item)
        for polygon in as_list(data.get("polygons")) or [data]:
            points = polygon_points(polygon)
            if len(points) >= 3:
                result.append((str(data.get("id", f"RETAINED_{index}")), points))
    return result


def camera_arrows(area: dict[str, Any]) -> list[dict[str, Any]]:
    values = [{'id': view['id'], 'position': view['designPosition'],
               'direction': [-math.sin(math.radians(view['yawDeg'])), -math.cos(math.radians(view['yawDeg']))]}
              for view in area.get('criticalViews', [])
              if view.get('viewRole') == 'travel' or view['id'].endswith('-portal-context')]
    result = []
    for index, value in enumerate(values, 1):
        item = as_dict(value)
        origin = item.get("position", item.get("origin", item.get("from")))
        direction = item.get("direction", item.get("vector", item.get("to")))
        if isinstance(origin, list) and len(origin) >= 2 and isinstance(direction, list) and len(direction) >= 2:
            ox, oy = num(origin[0]), num(origin[1])
            if item.get("to") is direction:
                dx, dy = num(direction[0]) - ox, num(direction[1]) - oy
            else:
                dx, dy = num(direction[0]), num(direction[1])
            if abs(dx) + abs(dy) > .001:
                result.append({"id": str(item.get("id", f"CAM_{index}")), "x": ox, "y": oy, "dx": dx, "dy": dy})
    return result


def opening_path(opening: dict[str, Any], x, y, scale: float) -> str:
    along, width = num(opening.get("alongM")), num(opening.get("widthM"))
    sill, head = num(opening.get("sillM")), num(opening.get("headM"), num(opening.get("sillM")) + num(opening.get("heightM")))
    left, right = along - width / 2, along + width / 2
    shape = str(as_dict(as_dict(opening.get("shopfront")).get("cavity")).get("frontProfile", opening.get("headShape", "rectangular"))).lower()
    if shape == "paired-pointed":
        count = int(opening['lightCount']); pier = num(opening['mullionM'])
        light_width = (width - (count-1)*pier)/count
        return ' '.join(opening_path({**opening, 'headShape': 'pointed', 'widthM': light_width,
                                     'alongM': left + light_width/2 + i*(light_width+pier)}, x, y, scale)
                        for i in range(count))
    if shape == "circular":
        cy = (sill+head)/2; rx = abs(x(right)-x(left))/2; ry = abs(y(head)-y(sill))/2
        return f'M {x(left):.2f} {y(cy):.2f} A {rx:.2f} {ry:.2f} 0 1 1 {x(right):.2f} {y(cy):.2f} A {rx:.2f} {ry:.2f} 0 1 1 {x(left):.2f} {y(cy):.2f} Z'
    if shape in {"pointed", "pointed-arch", "ogive"}:
        spring = sill + (head - sill) * num(opening.get("archSpringRatio"), .62)
        control_z = sill + (head-sill)*num(opening.get("archControlRatio"), .88)
        return f"M {x(left):.2f} {y(sill):.2f} L {x(left):.2f} {y(spring):.2f} Q {x(along-width*.22):.2f} {y(control_z):.2f} {x(along):.2f} {y(head):.2f} Q {x(along+width*.22):.2f} {y(control_z):.2f} {x(right):.2f} {y(spring):.2f} L {x(right):.2f} {y(sill):.2f} Z"
    if shape in {"segmental", "segmental-arch", "arched"}:
        spring = sill + (head - sill) * .82
        control_z = 2*head-spring
        return f"M {x(left):.2f} {y(sill):.2f} L {x(left):.2f} {y(spring):.2f} Q {x(along):.2f} {y(control_z):.2f} {x(right):.2f} {y(spring):.2f} L {x(right):.2f} {y(sill):.2f} Z"
    return f"M {x(left):.2f} {y(sill):.2f} L {x(left):.2f} {y(head):.2f} L {x(right):.2f} {y(head):.2f} L {x(right):.2f} {y(sill):.2f} Z"


def is_bc01(parcel: dict[str, Any]) -> bool:
    return str(as_dict(parcel.get("structuralGrid")).get("assembly", "")).upper() == "BC-01"


def base_opening_joinery(opening: dict[str, Any], x, y, *, neutral: bool = False) -> list[str]:
    if opening.get('detailId') in ('B-OPEN', 'BZ-CRAFT-OPEN'):
        return b_opening_joinery(opening, x, y, neutral=neutral)
    along, width = num(opening.get("alongM")), num(opening.get("widthM"))
    sill, head = num(opening.get("sillM")), num(opening.get("headM"), num(opening.get("sillM")) + num(opening.get("heightM")))
    left, right = along - width / 2, along + width / 2
    closure = str(opening.get("closure", "closed joinery")).lower()
    fill = '#a9a79f' if neutral else ('#4e7973' if 'teal_timber' in str(opening.get('closureMaterialId')) else '#655543')
    ink = '#475255' if neutral else '#1f2f33'
    detail = '#6e7472' if neutral else '#d7c39d'
    pieces = [f'<path d="{opening_path(opening, x, y, 1)}" fill="{fill}" stroke="{ink}" stroke-width="1.5"/>']
    if "paneled" in closure:
        mid = along if "double" in closure or "leaves" in closure else None
        if mid is not None:
            pieces.append(f'<line x1="{x(mid):.2f}" y1="{y(sill):.2f}" x2="{x(mid):.2f}" y2="{y(head):.2f}" stroke="{detail}" stroke-width="1.2"/>')
        leaves = [(left, along), (along, right)] if mid is not None else [(left, right)]
        for leaf_left, leaf_right in leaves:
            inset = min((leaf_right - leaf_left) * .13, .12)
            for low_ratio, high_ratio in ((.14, .46), (.54, .86)):
                low, high = sill + (head-sill)*low_ratio, sill + (head-sill)*high_ratio
                pieces.append(f'<rect x="{x(leaf_left+inset):.2f}" y="{y(high):.2f}" width="{(leaf_right-leaf_left-2*inset)*(x(1)-x(0)):.2f}" height="{(high-low)*abs(y(1)-y(0)):.2f}" fill="none" stroke="{detail}" stroke-width="1"/>')
    elif "louver" in closure:
        for ratio in (.23, .43, .63, .83):
            z = sill + (head - sill) * ratio
            pieces.append(f'<line x1="{x(left + width*.10):.2f}" y1="{y(z):.2f}" x2="{x(right - width*.10):.2f}" y2="{y(z):.2f}" stroke="{detail}" stroke-width="1.2"/>')
    elif "woven" in closure or "screen" in closure:
        for ratio in (-.6, -.2, .2, .6):
            pieces.append(f'<line x1="{x(left + width * max(0, ratio)):.2f}" y1="{y(sill):.2f}" x2="{x(right - width * max(0, -ratio)):.2f}" y2="{y(head):.2f}" stroke="{detail}" stroke-width=".9"/>')
            pieces.append(f'<line x1="{x(left + width * max(0, ratio)):.2f}" y1="{y(head):.2f}" x2="{x(right - width * max(0, -ratio)):.2f}" y2="{y(sill):.2f}" stroke="{detail}" stroke-width=".9"/>')
    elif "double" in closure or opening.get("kind") == "door":
        pieces.append(f'<line x1="{x(along):.2f}" y1="{y(sill):.2f}" x2="{x(along):.2f}" y2="{y(head):.2f}" stroke="{detail}" stroke-width="1.2"/>')
    elif opening.get("kind") == "shop":
        counter = sill + min(.75, (head - sill) * .32)
        pieces.append(f'<line x1="{x(left):.2f}" y1="{y(counter):.2f}" x2="{x(right):.2f}" y2="{y(counter):.2f}" stroke="{detail}" stroke-width="2"/>')
    return pieces


def opening_joinery(opening, x, y, *, neutral=False):
    """Layer measured surround, lower closure and clipped fixed upper glazing."""
    detail = opening.get('architecturalDetail', {})
    path = opening_path(opening, x, y, 1)
    pieces = []
    if detail:
        width = detail['surroundWidthM'] * abs(x(1)-x(0))
        profile = detail['profile']
        surround_path = path
        omit_threshold = opening.get('kind')=='door' and detail.get('includeThreshold') is False
        if omit_threshold:
            # Open jamb/head paths have no closing sill segment; clipping also prevents cap overrun.
            surround_path = re.sub(r' Z(?= |$)', '', path)
            clip = 'surround-'+opening['id']
            left = opening['alongM']-opening['widthM']/2-detail['surroundWidthM']
            right = opening['alongM']+opening['widthM']/2+detail['surroundWidthM']
            top = opening['headM']+detail['surroundWidthM']
            pieces += [f'<defs><clipPath id="{clip}"><rect x="{x(left):.2f}" y="{y(top):.2f}" width="{x(right)-x(left):.2f}" height="{y(opening["sillM"])-y(top):.2f}"/></clipPath></defs>', f'<g clip-path="url(#{clip})">']
        tone = '#a4a4a0' if neutral else ('#b5a38b' if profile == 'dressed-stone-portal' else detail.get('frameColorSrgb', opening.get('finishSurroundSrgb', '#846a4e')))
        # The aperture fill covers the inner half of each stroke, leaving the exact exterior band.
        pieces.append(f'<path d="{surround_path}" fill="none" stroke="{tone}" stroke-width="{2*width:.2f}" stroke-linejoin="round"/>')
        if profile in ('carved-timber-portal', 'dressed-stone-portal'):
            for ratio in (.80, .45):
                pieces.append(f'<path d="{surround_path}" fill="none" stroke="{("#72726f" if neutral else "#685747")}" stroke-width="{2*width*ratio:.2f}"/>')
                pieces.append(f'<path d="{surround_path}" fill="none" stroke="{tone}" stroke-width="{max(0,2*width*ratio-1):.2f}"/>')
        carving=detail.get('carving')
        if carving and carving['pattern']=='running-lozenge':
            sill,head=opening['sillM'],opening['headM']
            spring=sill+(head-sill)*opening.get('archSpringRatio',.82 if opening['headShape']=='segmental' else 1)
            for side in (-1,1):
                u=opening['alongM']+side*(opening['widthM']/2+detail['surroundWidthM']/2)
                z=sill+.18+carving['moduleHeightM']/2
                while z+carving['moduleHeightM']/2<spring-.18:
                    dw,dh=carving['moduleWidthM']/2,carving['moduleHeightM']/2
                    points=[(u-dw,z),(u,z+dh),(u+dw,z),(u,z-dh)]
                    points=' '.join(f'{x(a):.2f},{y(b):.2f}' for a,b in points)
                    pieces.append(f'<polygon points="{points}" fill="none" stroke="{"#757570" if neutral else "#685747"}" stroke-width="{max(.3,carving["incisionWidthM"]*abs(x(1)-x(0))):.2f}"/>')
                    z+=carving['modulePitchM']
        if omit_threshold:pieces.append('</g>')
    pieces += base_opening_joinery(opening, x, y, neutral=neutral)
    if detail and not opening.get('glazingProfile') and detail['profile'] in ('carved-timber-portal','dressed-stone-portal','planked-receiving'):
        a,w,sill,head=(opening[k] for k in ('alongM','widthM','sillM','headM'))
        top=opening.get('glazingProfile',{}).get('fromZM',opening.get('closureProfile',{}).get('leafTopM',head))
        clip='relief-'+opening['id'];ink='#70706c' if neutral else '#b9a386'
        pieces += [f'<defs><clipPath id="{clip}"><path d="{path}"/></clipPath></defs>',f'<g clip-path="url(#{clip})">']
        if detail['profile']=='planked-receiving':
            for i in range(1,math.ceil(w/.16)):
                u=a-w/2+i*.16
                pieces.append(f'<path d="M {x(u):.2f} {y(sill):.2f} V {y(top):.2f}" stroke="{ink}" stroke-width=".6"/>')
        else:
            for center in (a-w/4,a+w/4):
                for low,high in ((sill+.16,sill+(top-sill)*.44),(sill+(top-sill)*.53,top-.14)):
                    if high>low:
                        pieces.append(f'<rect x="{x(center-w*.18):.2f}" y="{y(high):.2f}" width="{abs(x(w*.36)-x(0)):.2f}" height="{y(low)-y(high):.2f}" fill="none" stroke="{ink}" stroke-width="{max(.45,detail["incisionDepthM"]*abs(x(1)-x(0))):.2f}"/>')
        pieces.append('</g>')
    glass = opening.get('glazingProfile')
    if glass:
        a,w,s,h = (opening[k] for k in ('alongM','widthM','sillM','headM'))
        left,right = a-w/2,a+w/2
        bottom = glass['fromZM']; web = glass['webM']*abs(x(1)-x(0))
        clip = 'glass-'+opening['id']
        palette = ['#c4c4c0'] if neutral else glass['paletteSrgb']
        pieces += [f'<defs><clipPath id="{clip}"><path d="{path}"/></clipPath></defs>', f'<clipPath id="{clip}-upper"><rect x="{x(left):.2f}" y="{y(h):.2f}" width="{x(right)-x(left):.2f}" height="{y(bottom)-y(h):.2f}"/></clipPath><g clip-path="url(#{clip})"><g clip-path="url(#{clip}-upper)">',
                   f'<rect x="{x(left):.2f}" y="{y(h):.2f}" width="{x(right)-x(left):.2f}" height="{y(bottom)-y(h):.2f}" fill="{palette[0]}"/>']
        # Cell counts and color order are explicit source data, independently fitted to each light.
        lights=opening.get('lightCount',1);mullion=opening.get('mullionM',0)
        light_width=(w-(lights-1)*mullion)/lights
        columns,rows=glass['columnsPerLight'],glass['rows'];sequence=glass['paletteSequence']
        cell_w,cell_h=light_width/columns,(h-bottom)/rows
        for light in range(lights):
            light_left=left+light*(light_width+mullion)
            for row in range(rows):
                for col in range(columns):
                    u=light_left+col*cell_w;z=bottom+row*cell_h
                    index=sequence[(light*columns*rows+row*columns+col)%len(sequence)]
                    color='#c4c4c0' if neutral else palette[index]
                    if glass['pattern']=='diamond':
                        points=[(u,z+cell_h/2),(u+cell_w/2,z+cell_h),(u+cell_w,z+cell_h/2),(u+cell_w/2,z)]
                        shape='<polygon points="'+' '.join(f'{x(v):.2f},{y(t):.2f}' for v,t in points)+'"'
                    else:
                        pane={'alongM':u+cell_w/2,'widthM':cell_w,'sillM':z,'headM':z+cell_h,'headShape':'pointed'}
                        shape=f'<path d="{opening_path(pane,x,y,1)}"'
                    pieces.append(shape+f' fill="{color}" stroke="{("#92928e" if neutral else "#a8997e")}" stroke-width="{web:.2f}"/>')
        pieces += ['</g>', f'<path d="M {x(left):.2f} {y(bottom):.2f} H {x(right):.2f}" stroke="{("#777773" if neutral else "#806b50")}" stroke-width="{web:.2f}"/>', '</g>']
    return pieces


def b_opening_joinery(opening, x, y, *, neutral=False):
    """B-04 profiles and joinery; older area drawings retain their exact renderer."""
    a,w,s,h = (opening[k] for k in ('alongM','widthM','sillM','headM'))
    left,right=a-w/2,a+w/2; path=opening_path(opening,x,y,1)
    clip='b-clip-'+opening['id']; ink='#4c514d'; wood='#8e8d85' if neutral else opening.get('finishPaintSrgb', '#547d77' if 'teal' in opening.get('closureMaterialId','') else '#675441')
    surround='#a39276' if neutral else opening.get('finishSurroundSrgb','#a39276')
    p=[f'<defs><clipPath id="{clip}"><path d="{path}"/></clipPath></defs>',
       f'<path d="{path}" fill="{"none" if opening.get("openLattice") else "#ddd6c4"}" stroke="{surround}" stroke-width="{0 if opening.get('architecturalDetail') else max(1,abs(x(.1)-x(0))):.2f}"/>',
       f'<path d="{path}" fill="{"none" if opening.get("openLattice") else wood}" stroke="{ink}" stroke-width="1.1"/>',f'<g clip-path="url(#{clip})">']
    closure=opening['closure'].lower()
    profile=opening.get('closureProfile',{})
    if opening.get('glazingProfile'):
        top=opening['glazingProfile']['fromZM']
        # Fully glazed fixed infill has no lower door leaf or receiving-door straps.
        if top>s+.001 and not opening.get('fixedInfill'):
            count=opening.get('lightCount',2 if 'double' in closure or 'paired' in closure else 1)
            mullion=opening.get('mullionM',0);light_width=(w-(count-1)*mullion)/count
            panel_ink='#6e706c' if neutral else '#bca785'
            for i in range(count):
                lo=left+i*(light_width+mullion);hi=lo+light_width
                for low,high in ((s+(top-s)*.08,s+(top-s)*.46),(s+(top-s)*.54,s+(top-s)*.92)):
                    inset=min(.10,light_width*.14)
                    p.append(f'<rect x="{x(lo+inset):.2f}" y="{y(high):.2f}" width="{x(hi-inset)-x(lo+inset):.2f}" height="{y(low)-y(high):.2f}" fill="none" stroke="{panel_ink}" stroke-width="1"/>')
            p.append(f'<path d="M {x(a):.2f} {y(s):.2f} V {y(top):.2f}" stroke="{panel_ink}" stroke-width="1.2"/>')
    elif profile.get('leafTopM'):
        leaf_top=profile['leafTopM'];mid=x(a)
        p.append(f'<path d="M {x(left):.2f} {y(leaf_top):.2f} H {x(right):.2f} M {mid:.2f} {y(s):.2f} V {y(leaf_top):.2f}" stroke="#c7b18c" stroke-width="2"/>')
        for center in (a-w*.24,a+w*.24):
            for z in (s+.45,leaf_top-.35):
                p.append(f'<path d="M {x(center-w*.20):.2f} {y(z):.2f} H {x(center+w*.20):.2f}" stroke="#56534b" stroke-width="2"/>')
        pitch=profile.get('transomPitchM',.18)
        for i in range(1,math.ceil(w/pitch)):
            u=left+i*pitch;p.append(f'<path d="M {x(u):.2f} {y(leaf_top):.2f} V {y(h):.2f}" stroke="#c7b18c" stroke-width="1"/>')
    elif profile.get('dadoTopM') is not None:
        dado=profile['dadoTopM'];p.append(f'<rect x="{x(left):.2f}" y="{y(dado):.2f}" width="{x(right)-x(left):.2f}" height="{y(s)-y(dado):.2f}" fill="#c6b798" stroke="#8d7d64"/>')
        for i in range(1,math.ceil(w/profile.get('screenPitchM',.18))):
            u=left+i*profile.get('screenPitchM',.18);p.append(f'<path d="M {x(u):.2f} {y(dado):.2f} V {y(h):.2f}" stroke="#bba786" stroke-width="1.2"/>')
    elif opening.get('kind') in ('shop', 'niche'):
        pass  # The scheduled activity layout supplies the counter or seat, not a door panel.
    elif 'vertical slat' in closure:
        pitch=opening['slatPitchM'];slat=opening['slatWidthM']
        for i in range(1,math.ceil(w/pitch)):
            center=left+i*pitch
            p.append(f'<rect x="{x(center-slat/2):.2f}" y="{y(h):.2f}" width="{abs(x(slat)-x(0)):.2f}" height="{abs(y(h)-y(s)):.2f}" fill="#b9a485"/>')
    elif 'screen' in closure:
        # Measured B-STAR star-and-cross cells, clipped to the actual aperture.
        for i in range(math.ceil(w/.40)):
            for j in range(math.ceil((h-s)/.40)):
                cx=left+.20+i*.40;cz=s+.20+j*.40
                pts=[(cx+(.16 if k%2==0 else .08)*math.cos(k*math.pi/8),cz+(.16 if k%2==0 else .08)*math.sin(k*math.pi/8)) for k in range(16)]
                p.append('<polygon points="'+' '.join(f'{x(u):.2f},{y(v):.2f}' for u,v in pts)+'" fill="none" stroke="#c7b18c" stroke-width=".65"/>')
                for u,v in pts[::4]:
                    dx,dz=u-cx,v-cz;factor=.20/max(abs(dx),abs(dz))
                    p.append(f'<path d="M {x(u):.2f} {y(v):.2f} L {x(cx+factor*dx):.2f} {y(cz+factor*dz):.2f}" stroke="#c7b18c" stroke-width=".6"/>')
    elif 'louver' in closure:
        pitch=.08 if opening.get('finishFamily') else .14
        for j in range(1,math.ceil((h-s)/pitch)):
            z=s+j*pitch;p.append(f'<path d="M {x(left+.05):.2f} {y(z):.2f} H {x(right-.05):.2f}" stroke="#bba786" stroke-width="1"/>')
        for i in range(1,opening.get('panelCount',1)):
            center=left+w*i/opening['panelCount'];mullion=opening['panelMullionM']
            p.append(f'<rect x="{x(center-mullion/2):.2f}" y="{y(h):.2f}" width="{abs(x(mullion)-x(0)):.2f}" height="{abs(y(h)-y(s)):.2f}" fill="#bba786" stroke="#675441" stroke-width=".5"/>')
    else:
        count=opening.get('lightCount',2 if 'double' in closure else 1)
        for i in range(count):
            lo=left+i*w/count+.07;hi=left+(i+1)*w/count-.07
            for low,high in [(s+.14,s+(h-s)*.43),(s+(h-s)*.49,h-.16)]:
                p.append(f'<rect x="{x(lo):.2f}" y="{y(high):.2f}" width="{x(hi)-x(lo):.2f}" height="{y(low)-y(high):.2f}" fill="none" stroke="#bfa988" stroke-width="1"/>')
        if opening.get('finishFamily')=='domestic':
            for edge in (left+.08,right-.105):
                for z in (s+(h-s)*.25,s+(h-s)*.75):
                    p.append(f'<rect x="{x(edge):.2f}" y="{y(z+.035):.2f}" width="{abs(x(.025)-x(0)):.2f}" height="{abs(y(.07)-y(0)):.2f}" fill="#56534b"/>')
    p += ['</g>',f'<path d="{path}" fill="none" stroke="{ink}" stroke-width="1.3"/>']
    return p


def b_feature_elevation(feature, x, y, *, neutral=False):
    a,w=feature['alongM'],feature['widthM'];lo,hi=feature['zM'];left,right=a-w/2,a+w/2
    wood='#8f8d85' if neutral else feature.get('finishPaintSrgb','#77604a');p=[]
    def rect(l,r,b,t,fill=wood):
        p.append(f'<rect x="{x(l):.2f}" y="{y(t):.2f}" width="{x(r)-x(l):.2f}" height="{y(b)-y(t):.2f}" fill="{fill}" stroke="#66594a" stroke-width="1"/>')
    kind=feature['kind']
    if kind=='draped-rug':
        return b_rug_elevation(feature['id'],left,right,lo,hi,x,y,neutral=neutral)
    if kind=='inscribed-panel':
        rect(left,right,lo,hi,'#c6b798' if not neutral else '#c5c1b6')
        p.append(f'<text x="{x(a):.2f}" y="{y((lo+hi)/2):.2f}" text-anchor="middle" dominant-baseline="central" font-size="{max(5,abs(y(feature["letterHeightM"])-y(0))):.2f}" fill="#675441">{esc(feature["text"])}</text>')
        return p
    if kind=='supported-shallow-balcony':
        deck,joists,braces,rail = (feature[k] for k in ('deck','joists','braces','balustrade'))
        rect(*deck['alongBoundsM'],deck['bottomZM'],deck['topZM'])
        for c in joists['alongAxesM']:
            rect(c-joists['sectionM'][0]/2,c+joists['sectionM'][0]/2,*joists['zM'])
        for c in braces['alongAxesM']:
            rect(c-braces['sectionM']/2,c+braces['sectionM']/2,braces['lowestZM'],max(v[1] for v in braces['centerlineOutZ'])+braces['sectionM']/2)
        low,high=rail['zM'];post=rail['postSectionM'];r=rail['railSectionM']
        rect(left,right,low,low+r);rect(left,right,high-r,high)
        for c in rail['endPostAxesM']:rect(c-post/2,c+post/2,low,high)
        for i in range(1,math.ceil(w/rail['balusterPitchM'])):
            c=left+i*rail['balusterPitchM'];half=rail['balusterSectionM']/2
            if c+half<right-post:rect(c-half,c+half,low+r,high-r)
    elif kind=='screened-balcony':
        rect(left,right,3.26,3.40);rect(left,right,6.05,6.20)
        for c in [left+.08,right-.08]:rect(c-.04,c+.04,3.40,6.05)
        rect(a-.04,a+.04,3.40,4.45)
        rect(left,right,4.38,4.45);rect(left,right,3.43,3.50)
        for c in [a-.9,a+.9]:rect(c-.07,c+.07,3.12,3.40)
        screen={'id':feature['id']+'-rail','alongM':a,'widthM':w-.16,'sillM':3.50,'headM':4.38,'heightM':.88,'headShape':'rectangular','closure':'closed eight-point star screen','openLattice':True,'finishPaintSrgb':wood}
        p += b_opening_joinery(screen,x,y,neutral=neutral)
    elif kind=='recessed-field':rect(left,right,lo,hi,'#d7cbb6' if not neutral else '#d1cdc4')
    else:
        rect(left,right,lo,hi)
        if kind=='timber-hood':
            for c in [left+.12,right-.12]:rect(c-.035,c+.035,lo,hi)
    return p


def landscape_elevation(area, face, x, y, *, neutral=False):
    pieces=[]; axis=0 if face in ('north','south') else 1
    for element in area.get('landscapeElements', []):
        if element['kind']!='date-palm' or face not in element['viewFaces']:continue
        root=element['root'];crown=element['crownCenterM'];r=element['crownRadiusM'];tr=element['trunkRadiusM']
        u,z=root[axis],root[2];cu,cz=crown[axis],crown[2]
        pieces.append(f'<path d="M {x(u-tr):.2f} {y(z):.2f} L {x(cu-tr*.65):.2f} {y(cz):.2f} H {x(cu+tr*.65):.2f} L {x(u+tr):.2f} {y(z):.2f} Z" fill="{("#92928a" if neutral else "#8b7758")}"/>')
        for i in range(element['frondCount']):
            angle=math.pi*(.08+.84*i/max(1,element['frondCount']-1))
            tip_u=cu+r*math.cos(angle);tip_z=cz+r*(math.sin(angle)-.40)
            control_u=cu+(tip_u-cu)*.62;control_z=min(root[2]+element['heightM'],cz+r*.85)
            pieces.append(f'<path d="M {x(cu):.2f} {y(cz):.2f} Q {x(control_u):.2f} {y(control_z):.2f} {x(tip_u):.2f} {y(tip_z):.2f}" fill="none" stroke="{("#858981" if neutral else "#708065")}" stroke-width="{abs(x(.13)-x(0)):.2f}" stroke-linecap="round"/>')
    return pieces


def b_rug_elevation(name,left,right,bottom,top,x,y,*,neutral=False):
    """Unmodified licensed textile field, clipped to a bound cloth outline."""
    path=ROOT/'apps/client/public/assets/textures/environment/bazaar/textiles/project_original/levantine_rug_albedo_v1.jpg'
    source=base64.b64encode(path.read_bytes()).decode('ascii')
    pid='rug-'+name;pitch=abs(x(1.2)-x(0));height=abs(y(1.2)-y(0))
    outline=f'M {x(left):.2f} {y(top):.2f} H {x(right):.2f} V {y(bottom+.025):.2f} Q {x((left+right)/2):.2f} {y(bottom-.025):.2f} {x(left):.2f} {y(bottom+.025):.2f} Z'
    return [f'<defs><pattern id="{pid}" patternUnits="userSpaceOnUse" x="{x(left):.2f}" y="{y(top):.2f}" width="{pitch:.2f}" height="{height:.2f}"><image href="data:image/jpeg;base64,{source}" width="{pitch:.2f}" height="{height:.2f}"/></pattern></defs>',
            f'<path d="{outline}" fill="{"#99968d" if neutral else "url(#"+pid+")"}" stroke="{"#686862" if neutral else "#596778"}" stroke-width="{max(1,abs(x(.035)-x(0))):.2f}"/>']


def b_finish_notes(area):
    finish=area['finishSchedule']
    revision = str(as_dict(area.get('designRevision')).get('id','')).split(' ')[0]
    revision = revision if revision in ('R4','R5','R6') else 'B-05'
    lines=[f"# {revision} | B courtyard finish schedule",'', ('Retained B building layout and focal balcony, with the explicitly scheduled revised windows, surrounds and finish; no gameplay changes.' if revision in ('R4','R5','R6') else '**Proposed finish on the retained B-04 composition.** No new window shapes, routes or other-area work. The live B-04 game is the before baseline.'), '',finish['intent'],'',
           '[Finish details plate](drawings/spawn_b_courtyard-finish.svg) · [complete courtyard sheet](unit-spawn-b-courtyard.md) · [finish review cameras](unit-spawn-b-courtyard.md#fixtures-receivers-budgets-and-critical-views)', '',
           '## Window, door and reveal families','', '| Family | Receiver and trim | Joinery | Applies to |','|---|---|---|---|']
    for key,f in finish['openingFamilies'].items():lines.append(f"| `{key}` | {md(f['surround'])} | {md(f['joinery'])} | {md(f['applies'])} |")
    lines += ['', 'Each opening in the complete sheet has a finish family, paint target and named surround/reveal/sill materials. These override the old parcel-wide trim argument. Do not guess the family from the nearest building.', '',
              '## B-only material bindings','', finish['materials']['scope'],'',finish['materials']['paintFormula'],'',
              'These paint colors are proposed albedo targets, not measured final pixels. Neutral and shipped-light inspection occurs in the consolidated end review. Correct the actual material graph before adjusting a palette or attributing the dark shutters to one cause.','']
    for key,value in finish['materials'].items():
        if isinstance(value,dict):lines += [f'### {key}', '', '```json',json.dumps(value,indent=2),'```','']
        elif key not in ('scope','paintFormula'):lines += [f'**{key}:** {value}','']
    lines += ['## Rugs, shade and trade detail','']
    for key,value in finish['textiles'].items():lines += [f'**{key}:** {value}','']
    for feature in area['facadeFeatures']:
        if feature['kind']=='draped-rug':lines += ['### Exact rail-rug attachment', '', '```json',json.dumps(feature,indent=2),'```','']
    for item in finish['finishDetails']:lines += [f"**{item['id']}:** {item['instruction']}",'']
    lines += ['## Performance and efficient execution','', '```json',json.dumps(finish['performance'],indent=2),'```','',
              '## Finish acceptance','']+[f'- {value}' for value in finish['acceptance']]
    lines += ['', '## Audited B-04 baseline','', '```json',json.dumps(finish['audit'],indent=2),'```','',
              f'The linked trial records the implemented result. {revision} is documentation only until a separate implementation task builds and measures it.']
    return '\n'.join(lines)


def b_revision_notes(area):
    if area.get('zone')!='SPAWN_B_COURTYARD' or not area.get('designRevision'):return []
    revision = str(as_dict(area.get('designRevision')).get('id','')).split(' ')[0]
    revision = revision if revision in ('R4','R5','R6') else 'B-05'
    lines=[f"## {revision} building character and exact details",'',
           'This is the B-only proposal. The existing gameplay envelope, routes, floor and cover remain fixed. Profiles below replace the old repeated openings; they are not overlays.', '',
           '| Building | Composition | Reason |','|---|---|---|']
    if area.get('architectureQuestions'):
        lines[2:2]=['### Architectural questions and decisions','']+[f"- **{q['question']}** {q['decision']}" for q in area['architectureQuestions']]+['']
    if area.get('finishSchedule'):
        lines[2:2]=[f'**{revision} finish update:** [Exact finish recipes, material bindings and acceptance](unit-spawn-b-courtyard-finish.md). The B-04 composition below remains the architectural basis.','']
    for face in area['faces']:
        for p in face['parcels']:
            c=p['character'];lines.append(f"| `{p['id']}` — {md(c['name'])} | {md(c['composition'])} | {md(c['reason'])} |")
    lines += ['', '### Opening profiles and receivers', '', '| Opening | Profile / lights | Depth / front projection | Detail |','|---|---|---|---|']
    for face in area['faces']:
        for p in face['parcels']:
            for o in p['openings']:
                finish=f"; finish `{o['finishFamily']}`; {o['finishLeafCount']} leaf/leaves; surround `{o['surroundMaterialId']}`; reveal `{o['revealMaterialId']}`; sill `{o['sillMaterialId']}`; paint {o['finishPaintSrgb']}" if o.get('finishFamily') else ''
                lines.append(f"| `{o['id']}` | {o['headShape']}; {o.get('lightCount',1)} light(s); mullion {fmt(o.get('mullionM',0))} m | {fmt(o['depthM'])} / {fmt(o['frontProjectionM'])} m | B-OPEN{finish} |")
    for k,v in area['openingContract'].items():
        lines += ['',f'**{k}:**', '', '```json', json.dumps(v,indent=2), '```'] if isinstance(v,(dict,list)) else ['',f'**{k}:** '+md(v)]
    lines += ['', '### Architectural features', '', '| ID / receiver | World bounds min / max | Detail |','|---|---|---|']
    for f in area['facadeFeatures']:
        lines.append(f"| `{f['id']}` / `{f['receiverParcel']}` | {md(f['bbox'])} | {f['detail']} |")
    for note in area['detailNotes']:lines += ['',f"**{note['id']}.** {note['description']}"]
    lines += ['', '### B-only installation and reuse', '']
    for k,v in area['implementationPhase'].items():
        lines += [f'**{k}:**', '', '```json', json.dumps(v,indent=2), '```', ''] if isinstance(v,(dict,list)) else [f'**{k}:** {md(v)}','']
    lines += ['### Construction economy','',md(area['constructionEconomy']), '',
              '[B courtyard character and assembly review plate](drawings/spawn_b_courtyard-character.svg) · [monochrome composition](drawings/spawn_b_courtyard-composition.svg). These are measured design drawings, not implemented renders.', '']
    return lines


def craft_schedule_notes(area):
    schedule=area.get('craftSchedule')
    if not schedule:return []
    lines=['## R5 architecture and craftsmanship','',f"**Primary:** {schedule['primary']}", '',f"**Supporting:** {schedule['supporting']}", '',f"**Quiet fields and limits:** {schedule['quiet']}", '',
           '[Shared craft recipes and material rules](craftsmanship.md) supply exact construction. The named instance boxes, profile dimensions, colors and receivers below remain authoritative.','',
           '| Parcel / owner | Role | Envelope finish | Architectural limit |','|---|---|---|---|']
    for row in schedule['boundaryAndFloor']:
        lines.append(f"| `{row['parcelId']}` / `{row['buildingId']}` | {row['role']} | `{row['materialId']}`; {row['profile']}; CF-ENVELOPE / CF-JOINT | {md(row['geometry'])} |")
    if schedule['tradeDetails']:
        lines += ['', '| Group | Actual trade | Parts / recipes | Acceptance |','|---|---|---|---|']
        for row in schedule['tradeDetails']:lines.append(f"| `{row['groupId']}` | {md(row['trade'])} | {row['partCount']} / {', '.join(row['recipes'])} | {md(row['acceptance'])} |")
    lines += ['', '**Roof installation readiness:** '+schedule['installationReadiness'], '', '| Bundle | Required receivers | Receivers outside this area |', '|---|---|---|']
    for row in schedule['roofReceiverPrerequisites']:
        lines.append(f"| `{row['bundleId']}` | {', '.join('`'+p+'`' for p in row['requiredReceiverParcelIds'])} | {', '.join('`'+p+'`' for p in row['otherAreaReceiverIds']) or 'none'} |")
    lines += ['', '**Required craft recipes:** '+', '.join(schedule.get('requiredRecipes',[])), '',schedule['drawingRule'], '']
    return lines


def craftsmanship_notes(design):
    craft=design['craftStandards'];lines=['# R5 | Bazaar architecture and craftsmanship','',craft['benchmark'],'',
      'These are source-defined construction recipes for the proposed whole map. They do not authorize extra openings, props or neighboring-area work. Existing gameplay and global runtime limits remain fixed.','',
      '## Questions that govern the design','']+[f'- {q}' for q in craft['questions']]
    lines += ['', '## Building corners', '', craft['cornerRule'], '', '## Source traditions', '', '| Assembly | Source | Intended use |', '|---|---|---|']
    for row in craft['sourceTraditions']:
        lines.append(f"| {md(row['assembly'])} | [Reference]({row['source']}) | {md(row['use'])} |")
    lines += ['', '## Opening families','', '| Family | Receiver / trim | Joinery |','|---|---|---|']
    for name,f in craft['openingFamilies'].items():lines.append(f"| {name} | {md(f['surround'])} | {md(f['joinery'])} |")
    lines += ['', '## Measured craft recipes','']
    for name,value in craft['profiles'].items():lines += [f'### {name}', '', value, '']
    lines += ['## Material and export bindings','']
    for name,value in craft['materials'].items():
        lines += [f'### {name}', '', '```json',json.dumps(value,indent=2),'```',''] if isinstance(value,dict) else [f'**{name}:** {value}','']
    lines += ['## Whole-view composition by area','', '| Area | Primary | Supporting | Quiet fields |','|---|---|---|---|']
    for area in design['areas']:
        s=area['craftSchedule'];lines.append(f"| [{area['zone']}]({area['constructionSheet']}) | {md(s['primary'])} | {md(s['supporting'])} | {md(s['quiet'])} |")
    lines += ['', '## Required design review', '', craft.get('reviewRule',''), '', '## Common-sense placement review', '', craft.get('commonSenseRule',''), '']
    lines += ['', '## Boundary, background, performance and execution limits','',craft['boundaryRule'],'',craft.get('backgroundRule',''),'',craft['performance'],'',craft['execution'],'',
      'Complete-building plans and sections remain in [the building catalog](building-catalog.md). Area plans/elevations show every face. Per-area roof receiver lists distinguish the completed-map target from what a standalone build can safely install. Existing review manifests and trial images are historical evidence, not R5 visual acceptance.']
    return '\n'.join(lines)


def architecture_atlas_svg(design,coverage_doc):
    """A navigable overview of actual measured elevation panels, not a new design interpretation."""
    parts=svg_header(2400,2485,'R5 | Bazaar architecture and craftsmanship')
    parts.append('<text class="sub" x="48" y="82">Measured examples from the whole-map proposal · open a panel for its complete area drawing · game quality remains to be verified after construction</text>')
    issue={**design['issue'],'id':'BZ-04 / R5','landmarks':design['landmarks']};coverage=coverage_index(coverage_doc);by_zone={a['zone']:a for a in design['areas']}
    selection=[('SPAWN_A_COURTYARD','south','Arrival: portal and registry room'),('SPICE_STREET','west','Spice: room and storage hierarchy'),('FOUNTAIN_COURT','west','Guildhall: crafted portal and glass'),('TEXTILE_ARCADE','east','Textile: three workrooms, one owner'),('TEXTILE_ARCADE','west','Merchants: shared room stacks'),('COVERED_SOUK','east','Souk: larger central trading bay'),('TEA_TERRACE','east','Tea: horizontal gallery and shaded seat'),('SPAWN_B_COURTYARD','north','B: retained balcony and related upper pair'),('DYERS_DOGLEG','east','Dogleg: domestic balcony and door'),('CARAVAN_COURT','west','Caravan: grounded receiving store'),('FOUNTAIN_COURT','east','Merchant: usable entry and deep loggia'),('NORTH_COURT','west','Hammam: fixed plaster-and-glass light')]
    positions={'north':(48,115),'east':(970,115),'south':(48,750),'west':(970,750)}
    for i,(zone,face,title) in enumerate(selection):
        px=35+(i%3)*790;py=120+(i//3)*585;sx,sy=positions[face]
        full=elevation_svg(issue,by_zone[zone],coverage,design['materials']);body=full.split('>',2)[2].rsplit('</svg>',1)[0]
        body=re.sub(r'id="([^"]+)"',lambda m:f'id="atlas{i}-{m.group(1)}"',body)
        body=re.sub(r'url\(#([^)]+)\)',lambda m:f'url(#atlas{i}-{m.group(1)})',body)
        parts.append(f'<text class="label" x="{px+12}" y="{py-12}">{esc(title)}</text><a href="{zone.lower()}-elevations.svg"><svg x="{px}" y="{py}" width="770" height="535" viewBox="{sx} {sy} 870 570" overflow="hidden">{body}</svg></a>')
    return svg_footer(parts)


def region_z_interval(region: dict[str, Any], floor_z, along: float) -> tuple[float, float]:
    relative = interval(region.get("zAboveFloorM"))
    if relative is not None:
        grade = floor_z(along)
        return grade + relative[0], grade + relative[1]
    low,high=interval(region.get("zM")) or (floor_z(along), float("inf"))
    if 'floorRelativeMinM' in region: low=max(low,floor_z(along)+num(region['floorRelativeMinM']))
    return low,high


def material_region_polygons(region: dict[str, Any], left: float, right: float, wall_top: float, floor_z) -> list[list[tuple[float, float]]]:
    """Clip a material field to the actual graded wall, not its bounding rectangle."""
    relative = interval(region.get("zAboveFloorM"))
    if relative is not None:
        bottom = [(left, floor_z(left) + relative[0]), (right, floor_z(right) + relative[0])]
        top = [(right, min(wall_top, floor_z(right) + relative[1])), (left, min(wall_top, floor_z(left) + relative[1]))]
        return [[*bottom, *top]] if all(top_z > bottom_z + .0001 for (_x, bottom_z), (_x2, top_z) in zip(bottom, reversed(top))) else []
    z_low, z_high = interval(region.get("zM")) or (min(floor_z(left), floor_z(right)), wall_top)
    if z_high <= z_low:
        return []
    samples = {left, right}
    grade_left, grade_right = floor_z(left), floor_z(right)
    if abs(grade_right-grade_left) > .0001:
        for z in (z_low, z_high):
            crossing = left + (z-grade_left)*(right-left)/(grade_right-grade_left)
            if left < crossing < right:
                samples.add(crossing)
    points = sorted(samples)
    output: list[list[tuple[float, float]]] = []
    for start, end in zip(points, points[1:]):
        midpoint = (start + end) / 2
        bottom_mid, top_mid = region_z_interval(region, floor_z, midpoint)
        if min(wall_top, top_mid) <= max(floor_z(midpoint), bottom_mid) + .0001:
            continue
        lower = [(start, max(floor_z(start), region_z_interval(region, floor_z, start)[0])), (end, max(floor_z(end), region_z_interval(region, floor_z, end)[0]))]
        upper = [(end, min(wall_top, region_z_interval(region, floor_z, end)[1])), (start, min(wall_top, region_z_interval(region, floor_z, start)[1]))]
        output.append([*lower, *upper])
    return output


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value.rstrip() + "\n", encoding="utf-8")


def md_face_table(area: dict[str, Any], face: str, coverage: CoverageFace | None) -> list[str]:
    lines = [f"### `{area['zone']}` · `{face}`", ""]
    quiet = area_faces(area).get(face, {}).get("quietBackground")
    if quiet:
        lines.extend([f"Quiet background: {md(quiet)}.", ""])
    if coverage:
        floor = coverage.floor
        if floor.get("kind") == "ramp":
            grade = f"{fmt(floor.get('startElevationM'))} → {fmt(floor.get('endElevationM'))} m"
            grade += f" at {fmt(floor.get('gradeDegrees'))}°" if "gradeDegrees" in floor else ""
        else:
            grade = f"z {fmt(floor.get('elevationM'))} m"
        lines += [
            f"Protected wall interval: **{fmt(coverage.start)}..{fmt(coverage.end)} m**; floor grade: **{grade}**.",
            "",
            "| Baseline interval | Status | Notes |",
            "|---|---|---|",
        ]
        for run in coverage.solid:
            run_interval = interval(as_dict(run).get("interval"))
            ids = ", ".join(str(v) for v in as_list(as_dict(run).get("colliderIds")))
            lines.append(f"| {fmt(run_interval[0]) if run_interval else '—'}..{fmt(run_interval[1]) if run_interval else '—'} | collider-backed solid | {md(ids or 'Collision-backed baseline')} |")
        for opening in coverage.openings:
            run_interval = interval(opening.get("interval"))
            adjoining = ", ".join(str(v) for v in as_list(opening.get("adjoiningZoneIds")))
            lines.append(f"| {fmt(run_interval[0]) if run_interval else '—'}..{fmt(run_interval[1]) if run_interval else '—'} | **ZERO BUILD protected opening** | {md(adjoining or opening.get('immutableReason', 'Immutable opening'))} |")
        lines.append("")
    parcels = face_parcels(area, face)
    if not parcels:
        lines += ["No target parcel is scheduled on this face. Preserve the baseline condition above.", ""]
        return lines
    lines += [
        "| Parcel | World along (m) | Footprint x0,y0 → x1,y1 | Purpose | Wall top | Shell depth | Material | Roof levels abs. z | Notes |",
        "|---|---:|---|---|---:|---:|---|---|---|",
    ]
    for parcel in parcels:
        span = interval(parcel.get("interval"))
        roof = as_dict(parcel.get("roof"))
        roof_text = f"slab {fmt(roof.get('slabBottomM'))}..{fmt(roof.get('slabTopM'))}; parapet {fmt(roof.get('parapetTopM'))}; cap {fmt(roof.get('capTopM'))}; setback {fmt(roof.get('setbackM'))}"
        footprint = parcel.get("footprint") if isinstance(parcel.get("footprint"), list) else []
        footprint_text = "(" + ", ".join(fmt(v) for v in footprint) + ")" if len(footprint) == 4 else "—"
        lines.append(
            f"| `{md(parcel.get('id', 'UNNAMED'))}` | {fmt(span[0]) if span else '—'}..{fmt(span[1]) if span else '—'} | {footprint_text} | {md(parcel.get('purpose', '—'))} | {fmt(parcel.get('wallTopM'))} | {fmt(parcel.get('shellDepthM'))} | `{md(parcel.get('materialId', '—'))}` | {roof_text} | {md(parcel.get('notes', ''))} |"
        )
    if any(is_bc01(parcel) for parcel in parcels):
        lines += ["", "BC-01 boundary composition: 0.32 m engaged piers at the listed bay edges, fields recessed 0.045 m, 0.60 m base and 0.50 m upper band. See [the graded BC-01 standard section](drawings/bc-01-section.svg)."]
    lines += ["", "| Opening | Parcel | Kind | World along | Sill / head abs. z | W × H × D | Receiver plane | Assembly / closure / staff access | Purpose |", "|---|---|---|---:|---:|---|---|---|---|"]
    openings = [(parcel, opening) for parcel in parcels for opening in opening_rows(parcel)]
    if openings:
        for parcel, opening in openings:
            access = as_dict(as_dict(opening.get("shopfront")).get("staffAccess"))
            access_text = ""
            if access:
                access_text = f"; {md(access.get('type', 'staff access'))} clear {fmt(access.get('clearWidthM'))} m → `{md(access.get('connectedEntranceId', 'UNRESOLVED'))}`"
            craft_text = ''.join(f"; {key}: `{json.dumps(opening[key], separators=(',', ':'))}`" for key in ('architecturalDetail','glazingProfile') if key in opening)
            lines.append(
                f"| `{md(opening.get('id', 'UNNAMED'))}` | `{md(parcel.get('id', 'UNNAMED'))}` | {md(opening.get('kind', '—'))} | {fmt(opening.get('alongM'))} | {fmt(opening.get('sillM'))} / {fmt(opening.get('headM'))} | {fmt(opening.get('widthM'))} × {fmt(opening.get('heightM'))} × {fmt(opening.get('depthM'))} | {fmt(opening.get('receiverPlaneM'))} | `{md(opening.get('assemblyId', '—'))}`; {md(opening.get('closure', '—'))}{access_text}{craft_text} | {md(opening.get('purpose', ''))} |"
            )
    else:
        lines.append("| — | — | — | — | — | — | — | — | No openings scheduled |")
    lines.append("")
    return lines


def markdown_sheet(issue: dict[str, Any], title: str, areas: list[dict[str, Any]], coverage: dict[tuple[str, str], CoverageFace], materials: dict[str, Any]) -> str:
    lines = [f"# {md(issue.get('id', issue.get('title', 'Bazaar issue')))} · {title}", ""]
    lines += [
        f"Controlled issue status: **{md(issue.get('status', 'UNSPECIFIED'))}**. Readiness is recorded in [audits.md](audits.md). SVGs are measured drawings, not game renders.",
        "",
        "Read [design basis](design-basis.md), [integration contract](integration.md), and [standard details](details.md) with this sheet. The target data is the sole source for parcel, opening, roof, activity, and material values below; coverage is a protected baseline only.",
        "",
        "## Design intent", "",
    ]
    for index, area in enumerate(areas):
        lines += [f"### `{area['zone']}`", "", md(area.get("intent", "No intent supplied.")), "", f"Primary focus: {md(area.get('primaryFocus', 'Not supplied.'))}.", ""]
        lines += b_revision_notes(area)
        lines += craft_schedule_notes(area)
        for feature in area.get('facadeFeatures', []):
            if feature['kind']=='supported-shallow-balcony':
                lines += ['### Supported shallow balcony', '', '```json', json.dumps(feature,indent=2), '```', '']
        if area.get('landscapeElements'):
            lines += ['### Landscape schedule', '', 'Root and crown coordinates are absolute world metres. These bounded background elements create no playable surface.', '']
            for element in area['landscapeElements']:
                lines += ['```json', json.dumps(element,indent=2), '```', '']
    lines += ["## Site, protected faces, and parcels", ""]
    for area in areas:
        for face in FACE_ORDER:
            lines += md_face_table(area, face, coverage.get((str(area["zone"]), face)))
    lines += ["## Surface and floor treatments", "", "| Area / parcel | Receiver | Exact polygon / region | Alpha | Purpose |", "|---|---|---|---:|---|"]
    for area in areas:
        floor = as_dict(area.get("floorTreatment"))
        if floor:
            lines.append(f"| `{area['zone']}` floor | `{md(floor.get('receiver','—'))}` | {md(floor)} | — | {md(floor.get('base',''))} |")
        for face in FACE_ORDER:
            for parcel in face_parcels(area, face):
                for treatment in as_list(parcel.get("surfaceTreatments")):
                    item=as_dict(treatment)
                    lines.append(f"| `{md(parcel.get('id','UNNAMED'))}` | `{md(item.get('receiver', item.get('receiverPlane','—')))}` | {md(item.get('polygon', item.get('bounds','—')))} | {fmt(item.get('alpha'))} | {md(item.get('purpose',''))} |")
    lines += ["## Activity groups and protected route regions", "", "| Area | Group / recipe | Receiver | Bounds min → max (x, y, z) | Contents | Supports |", "|---|---|---|---|---|---|"]
    found_activity = False
    for area in areas:
        for group in as_list(area.get("activityGroups")):
            item = as_dict(group); bounds = bbox(item.get("bbox")); found_activity = True
            bounds_text = "—" if not bounds else f"({fmt(bounds[0])}, {fmt(bounds[1])}, {fmt(bounds[2])}) → ({fmt(bounds[3])}, {fmt(bounds[4])}, {fmt(bounds[5])})"
            receiver = "/".join(str(item.get(key)) for key in ("receiverFace", "receiverParcel", "receiverOpening") if item.get(key))
            lines.append(f"| `{area['zone']}` | `{md(item.get('id', 'UNNAMED'))}` / `{md(item.get('recipe', '—'))}` | {md(receiver or '—')} | {bounds_text} | {md(item.get('contents', ''))} | {md(item.get('supports', ''))} |")
        for route in routes(area):
            x, y, w, h = route["rect"]
            lines.append(f"| `{area['zone']}` | `{md(route['id'])}` | **CLEAR ROUTE** | ({fmt(x)}, {fmt(y)}) → ({fmt(x + w)}, {fmt(y + h)}) | Protected empty region | Do not place geometry |")
    if not found_activity and not any(routes(area) for area in areas):
        lines.append("| — | — | — | No activity or clear-route region supplied | — | — |")
    for area in areas:
        for group in area.get('activityGroups', []):
            layout = group.get('instanceLayout', {})
            if not layout.get('parts'): continue
            lines += ['', f"### Fixed composition `{group['id']}`", '', layout['coordinateContract'], '',
                      '| Part | Construction shape | Local min / max (along, out, above deck) | Material | Receiver / support |',
                      '|---|---|---|---|---|']
            for part in layout['parts']:
                craft=f" / `{part['craftRecipeId']}`" if part.get('craftRecipeId') else ''
                accent=f"; albedo {part['stockColorSrgb']}" if part.get('stockColorSrgb') else ''
                lines.append(f"| `{part['id']}` | {md(part['kind'])}{craft} | {md(part['localBox']['min'])} / {md(part['localBox']['max'])} | `{part['materialId']}`{accent} | {md(part['support'])} |")
    lines += ["", "## Fixtures, receivers, budgets, and critical views", "", "| Area | Fixture | Recipe | Receiver | Bounds min → max (x, y, z) | Purpose |", "|---|---|---|---|---|---|"]
    fixture_found = False
    fixture_components = []
    for area in areas:
        for fixture in as_list(area.get("fixtures")):
            item = as_dict(fixture); bounds = bbox(item.get("bbox")); fixture_found = True
            bounds_text = "—" if not bounds else f"({fmt(bounds[0])}, {fmt(bounds[1])}, {fmt(bounds[2])}) → ({fmt(bounds[3])}, {fmt(bounds[4])}, {fmt(bounds[5])})"
            receiver = "/".join(str(item.get(key)) for key in ("receiverFace", "receiverParcel", "servedOpening") if item.get(key)) or ", ".join(str(v) for v in as_list(item.get("receiverParcels")))
            lines.append(f"| `{area['zone']}` | `{md(item.get('id', 'UNNAMED'))}` | `{md(item.get('recipe', '—'))}` | {md(receiver or '—')} | {bounds_text} | {md(item.get('purpose', ''))} |")
            params = {key: item[key] for key in ('interval','ledgerZ','armAxesM','projectionM','dropM','sagM','endA','endB','widthM','ledgerLengthM','garments') if key in item}
            lines.append(f"| | `{md(item['id'])}` dimensions/supports | | | {md(params)} | Exact instance values override the standard defaults. |")
            if item.get('assemblyParts'):
                fixture_components += ['', f"**{item['id']} membrane-only bounds:** `{md(item['clothBbox'])}`. Whole-assembly bounds above include the following supports:", '', '| Component | World bounds |', '|---|---|']
                fixture_components += [f"| {part['id']} | `{md(part['bbox'])}` |" for part in item['assemblyParts']]
                fixture_components.append('')
    if not fixture_found:
        lines.append("| — | — | — | No fixtures scheduled | — | — |")
    lines += fixture_components
    lines += ["", "| Area | Triangle budget | Material bindings | Rendered primitives | Shadow primitives |", "|---|---:|---:|---:|---:|"]
    for area in areas:
        budget = as_dict(area.get("budget"))
        lines.append(f"| `{area['zone']}` | {fmt(budget.get('maxTriangles'))} | {fmt(budget.get('maxMaterials'))} | {fmt(budget.get('maxRenderedPrimitives'))} | {fmt(budget.get('maxShadowPrimitives'))} |")
    for area in areas:
        lines += ['', f"Section origin (design coordinates): `{md(area.get('sectionOriginDesign'))}`.",
                  f"Declared export bounds (glTF local x, up, north): `{md(area.get('exportBoundsGltfLocal'))}`.",
                  f"Required bindings: {', '.join('`'+value+'`' for value in area.get('requiredMaterialIds', []))}.", '']
    lines += ["", "| Camera | Area | Position (x, y, z) | Yaw / pitch / FOV | Purpose |", "|---|---|---|---|---|"]
    for area in areas:
        for view in as_list(area.get("criticalViews")):
            item = as_dict(view); pos = item.get("designPosition") if isinstance(item.get("designPosition"), list) else []
            lines.append(f"| `{md(item.get('id', 'UNNAMED'))}` | `{area['zone']}` | ({', '.join(fmt(v) for v in pos)}) | {fmt(item.get('yawDeg'))}° / {fmt(item.get('pitchDeg'))}° / {fmt(item.get('fovDeg'))}° | {md(item.get('purpose', ''))} |")
    lines += ["", "## Landmarks and shared dependencies", "", "| Landmark / dependency | Owner | Bounds or dependency | Clear void / arch profile |", "|---|---|---|---|"]
    for area in areas:
        for landmark in as_list(area.get("landmarks")):
            item=as_dict(landmark); b=bbox(item.get("bbox")); clear=bbox(as_dict(item.get("clearWalkingBox"))); arch=as_dict(item.get("innerArchProfile"))
            lines.append(f"| `{md(item.get('id','UNNAMED'))}` / `{md(item.get('recipe','—'))}` | `{md(item.get('owner','—'))}` | {b} | clear {clear}; crown {md(arch.get('crown','—'))}; cap {fmt(item.get('capTopM'))} |")
        for dep in as_list(area.get("sharedDependencies")): lines.append(f"| **shared dependency** `{md(dep)}` | `{area['zone']}` | Must remain coordinated with owner | No duplicate landmark or filled route opening |")
    lines += ['', '## Roof installation references', '', 'Install or reuse the named roof bundles through [roof-bundles.md](roof-bundles.md). These are direct asset dependencies, not permission to build another area’s facades.', '']
    for area in areas:
        lines += [f"- `{area['zone']}` cells: {', '.join('`'+value+'`' for value in area.get('roofCellIds',[]))}.",
                  f"- `{area['zone']}` bundles: {', '.join('`'+value+'`' for value in area.get('roofBundleIds',[]))}.",
                  f"- `{area['zone']}` interfaces: {', '.join('`'+value+'`' for value in area.get('roofInterfaceIds',[])) or 'No cross-bundle interface' }."]
    lines += ["", "## Material key", "", "| Alias | Source material | Color | Tile / normal / roughness / albedo |", "|---|---|---|---|"]
    used = sorted({str(parcel.get("materialId")) for area in areas for face in FACE_ORDER for parcel in face_parcels(area, face) if parcel.get("materialId")})
    for material_id in used:
        definition = as_dict(materials.get(material_id))
        color = material_color(material_id, materials)
        lines.append(f"| `{material_id}` | `{md(definition.get('sourceMaterialId','—'))}` | <span style=\"color:{color}\">■</span> `{color}` | {fmt(definition.get('tileSizeM'))} / {fmt(definition.get('normalScale'))} / {fmt(definition.get('roughness'))} / {fmt(definition.get('albedoBoost'))} |")
    if not used:
        lines.append("| — | — | No parcel material supplied |")
    zone_ids = {str(area["zone"]) for area in areas}
    skyline = [as_dict(item) for item in as_list(issue.get("skyline")) if str(as_dict(item).get("zone", as_dict(item).get("zoneId", ""))) in zone_ids]
    legacy = [as_dict(item) for item in as_list(issue.get("legacyDispositions")) if str(as_dict(item).get("zone", as_dict(item).get("zoneId", ""))) in zone_ids]
    lines += ["", "## Skyline and legacy producer dispositions", ""]
    if skyline:
        lines += ["| Skyline item | Zone | Owner | Bounds min → max (x, y, z) | Purpose / notes |", "|---|---|---|---|---|"]
        for item in skyline:
            bounds = bbox(item.get("bbox"))
            bounds_text = "—" if not bounds else f"({fmt(bounds[0])}, {fmt(bounds[1])}, {fmt(bounds[2])}) → ({fmt(bounds[3])}, {fmt(bounds[4])}, {fmt(bounds[5])})"
            lines.append(f"| `{md(item.get('id', 'UNNAMED'))}` | `{md(item.get('zone', item.get('zoneId', '—')))}` | {md(item.get('owner', '—'))} | {bounds_text} | {md(item.get('purpose', item.get('notes', '')))} |")
        lines.append("")
    if legacy:
        lines += ["| Legacy item | Zone | Existing producer | Required disposition | Replacement / notes |", "|---|---|---|---|---|"]
        for item in legacy:
            lines.append(f"| `{md(item.get('id', 'UNNAMED'))}` | `{md(item.get('zone', item.get('zoneId', '—')))}` | {md(item.get('existingProducer', item.get('producer', '—')))} | {md(item.get('disposition', '—'))} | {md(item.get('replacement', item.get('notes', '')))} |")
        lines.append("")
    if not skyline and not legacy:
        lines += ["No skyline or legacy producer disposition is supplied for these areas.", ""]
    lines += ["", "## Drawings", ""]
    for area in areas:
        stem = str(area['zone']).lower()
        lines.append(f"- [{area['zone']} dimensioned plan](drawings/{stem}-plan.svg), [{area['zone']} four elevations](drawings/{stem}-elevations.svg), and [{area['zone']} roof axonometric](drawings/{stem}-axon.svg)")
    lines += ["- [Master plan](drawings/master-plan.svg)", ""]
    return "\n".join(lines)


def svg_header(width: int, height: int, title: str) -> list[str]:
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        "<style>text{font-family:Arial,sans-serif;fill:#24353a}.title{font-size:28px;font-weight:700}.sub{font-size:15px;fill:#52676a}.label{font-size:13px}.tiny{font-size:11px;fill:#52676a}.parcel{font-size:12px;font-weight:700}.opening{font-size:10px;font-weight:700}.panel{fill:#fbfaf5;stroke:#87959a;stroke-width:1.5}.axis{stroke:#52676a;stroke-width:1}.solid{stroke:#3c5157;stroke-width:5}.open{stroke:#c2534d;stroke-width:5;stroke-dasharray:8 5}</style>",
        f'<rect width="{width}" height="{height}" fill="#f5f1e8"/>',
        "<defs><pattern id=\"zero-build\" width=\"8\" height=\"8\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\"><line x1=\"0\" y1=\"0\" x2=\"0\" y2=\"8\" stroke=\"#c2534d\" stroke-width=\"2\"/></pattern><marker id=\"camera-arrow\" markerWidth=\"8\" markerHeight=\"8\" refX=\"7\" refY=\"3\" orient=\"auto\"><path d=\"M0,0 L8,3 L0,6 Z\" fill=\"#573d7a\"/></marker></defs>",
        f'<text class="title" x="48" y="48">{esc(title)}</text>',
    ]


def svg_footer(parts: list[str]) -> str:
    parts.append("</svg>")
    return "\n".join(parts)


def area_landmarks(issue, area):
    local=area.get('landmarks',[])
    if area['zone']=='SPAWN_B_COURTYARD': return [x for x in issue.get('landmarks',[]) if x['id'] in area.get('sharedDependencies',[])]
    return local


def face_out_sign(face: str) -> int:
    """World-coordinate sign for the source's positive-out opening frame."""
    return {"north": -1, "east": -1, "south": 1, "west": 1}[face]


def local_opening_point(face: str, wall_plane: float, along: float, out: float) -> tuple[float, float]:
    if face in ("north", "south"):
        return along, wall_plane + face_out_sign(face) * out
    return wall_plane + face_out_sign(face) * out, along


def assert_drawing_frames() -> None:
    # Actual design-space fixtures: negative-out points must land inside the
    # corresponding building, not on its courtyard side.
    cases = [('north',92,20,-1.1,(20,93.1)), ('south',0,28,-1.1,(28,-1.1)),
             ('east',39,85,-1.1,(40.1,85)), ('west',17,89,-1.1,(15.9,89))]
    for face,plane,along,out,expected in cases:
        actual=local_opening_point(face,plane,along,out)
        if any(abs(a-b)>1e-9 for a,b in zip(actual,expected)):
            die(f'{face} drawing frame projects {actual}, expected {expected}')


def local_clear_box(access: dict[str, Any]) -> tuple[float, float, float, float, float, float] | None:
    return bbox(access.get("localClearBox", access.get("localclearBox")))


def plan_svg(issue: dict[str, Any], area: dict[str, Any], rect: dict[str, Any], coverage: dict[tuple[str, str], CoverageFace], materials: dict[str, Any]) -> str:
    width, height = 2000, 1320
    zx, zy, zw, zh = num(rect.get("x")), num(rect.get("y")), num(rect.get("w"), 1), num(rect.get("h"), 1)
    extents = [(zx, zy, zx + zw, zy + zh)]
    parcels = [parcel for face in FACE_ORDER for parcel in face_parcels(area, face)]
    parcel_face = {str(parcel.get("id")): face for face in FACE_ORDER for parcel in face_parcels(area, face)}
    for parcel in parcels:
        footprint = parcel.get("footprint")
        if isinstance(footprint, list) and len(footprint) == 4: extents.append(tuple(num(v) for v in footprint))
    for item in [*as_list(area.get("activityGroups")), *as_list(area.get("fixtures")), *as_list(area.get("landscapeElements"))]:
        bounds = bbox(as_dict(item).get("bbox"))
        if bounds: extents.append((bounds[0], bounds[1], bounds[3], bounds[4]))
    for route in routes(area):
        x, y, w, h = route["rect"]; extents.append((x, y, x + w, y + h))
    for _label, points in retained_polygons(area):
        extents.append((min(x for x, _y in points), min(y for _x, y in points), max(x for x, _y in points), max(y for _x, y in points)))
    min_x, min_y = min(v[0] for v in extents), min(v[1] for v in extents)
    max_x, max_y = max(v[2] for v in extents), max(v[3] for v in extents)
    margin = max(1.2, max(max_x - min_x, max_y - min_y) * .08); min_x -= margin; min_y -= margin; max_x += margin; max_y += margin
    scale = min(1080 / max(max_x - min_x, 1), 910 / max(max_y - min_y, 1)); px, py = 85, 1070
    map_x = lambda x: px + (x - min_x) * scale
    map_y = lambda y: py - (y - min_y) * scale
    parts = svg_header(width, height, f"{issue.get('id', 'Bazaar')} · {area['zone']} · Plan")
    parts += [f'<text class="sub" x="48" y="76">SCHEMA DRAWING ONLY · NOT PHOTOREAL · north up · design metres</text>', f'<rect class="panel" x="48" y="105" width="1160" height="1040" rx="8"/>']
    parts.append(f'<rect x="{map_x(zx):.2f}" y="{map_y(zy + zh):.2f}" width="{zw * scale:.2f}" height="{zh * scale:.2f}" fill="#efe4cf" stroke="#24353a" stroke-width="2"/>')
    for route in routes(area):
        rx, ry, rw, rh = route["rect"]
        parts.append(f'<rect x="{map_x(rx):.2f}" y="{map_y(ry + rh):.2f}" width="{rw * scale:.2f}" height="{rh * scale:.2f}" fill="none" stroke="#387b78" stroke-width="3" stroke-dasharray="9 5"/>')
        parts.append(f'<text class="label" x="{map_x(rx + rw / 2):.2f}" y="{map_y(ry + rh / 2):.2f}" text-anchor="middle">{esc(route["id"])}</text>')
    for label, points in retained_polygons(area):
        mapped = " ".join(f"{map_x(x):.2f},{map_y(y):.2f}" for x, y in points)
        cx, cy = sum(x for x, _y in points) / len(points), sum(y for _x, y in points) / len(points)
        parts.append(f'<polygon points="{mapped}" fill="#c2534d" fill-opacity=".16" stroke="#c2534d" stroke-width="2.5" stroke-dasharray="7 4"/><text class="tiny" x="{map_x(cx):.2f}" y="{map_y(cy):.2f}" text-anchor="middle">{esc(short(label, 18))}</text>')
    for arrow in camera_arrows(area):
        length = max(math.hypot(arrow["dx"], arrow["dy"]), .001)
        dx, dy = arrow["dx"] / length * min(2.4, length), arrow["dy"] / length * min(2.4, length)
        x1, y1, x2, y2 = map_x(arrow["x"]), map_y(arrow["y"]), map_x(arrow["x"] + dx), map_y(arrow["y"] + dy)
        parts.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="#573d7a" stroke-width="3" marker-end="url(#camera-arrow)"/><text class="tiny" x="{x1:.2f}" y="{y1-7:.2f}">{esc(short(arrow["id"], 14))}</text>')
    for face in FACE_ORDER:
        cov = coverage.get((str(area["zone"]), face))
        if not cov:
            continue
        for opening in cov.openings:
            span = interval(opening.get("interval"))
            if not span:
                continue
            a, b = span
            if face in ("west", "east"):
                xx = map_x(zx if face == "west" else zx + zw); yy = map_y(b); length = (b - a) * scale
                parts.append(f'<line class="open" x1="{xx:.2f}" y1="{yy:.2f}" x2="{xx:.2f}" y2="{yy + length:.2f}"/>')
            else:
                yy = map_y(zy if face == "south" else zy + zh); xx = map_x(a); length = (b - a) * scale
                parts.append(f'<line class="open" x1="{xx:.2f}" y1="{yy:.2f}" x2="{xx + length:.2f}" y2="{yy:.2f}"/>')
    for face in FACE_ORDER:
        cov = coverage.get((str(area["zone"]), face))
        if cov:
            for solid in cov.solid:
                run = interval(solid.get("interval"));
                if not run: continue
                if face in ("west", "east"):
                    xx = map_x(zx if face == "west" else zx + zw); parts.append(f'<line class="solid" x1="{xx:.2f}" y1="{map_y(run[0]):.2f}" x2="{xx:.2f}" y2="{map_y(run[1]):.2f}"/>')
                else:
                    yy = map_y(zy if face == "south" else zy + zh); parts.append(f'<line class="solid" x1="{map_x(run[0]):.2f}" y1="{yy:.2f}" x2="{map_x(run[1]):.2f}" y2="{yy:.2f}"/>')
    for index, parcel in enumerate(parcels, 1):
        footprint = parcel.get("footprint")
        if not isinstance(footprint, list) or len(footprint) != 4: continue
        ax, ay, bx, by = (num(v) for v in footprint); color = material_color(str(parcel.get("materialId", "")), materials)
        parts.append(f'<rect x="{map_x(ax):.2f}" y="{map_y(by):.2f}" width="{(bx-ax)*scale:.2f}" height="{(by-ay)*scale:.2f}" fill="{color}" fill-opacity=".78" stroke="#24353a"/>')
        if is_bc01(parcel):
            face = parcel_face.get(str(parcel.get("id")), "")
            grid = as_dict(parcel.get("structuralGrid")); wall_plane = num(as_dict(area_faces(area).get(face)).get("wallPlaneM"))
            inset = num(grid.get("fieldDepthM"), .045); pier_width = num(grid.get("pierWidthM"), .32)
            field_plane = wall_plane - face_out_sign(face) * inset
            run = interval(parcel.get("interval"))
            if face in ("north", "south"):
                parts.append(f'<line x1="{map_x(run[0] if run else ax):.2f}" y1="{map_y(field_plane):.2f}" x2="{map_x(run[1] if run else bx):.2f}" y2="{map_y(field_plane):.2f}" stroke="#657276" stroke-width="1.5" stroke-dasharray="4 3"/>')
            else:
                parts.append(f'<line x1="{map_x(field_plane):.2f}" y1="{map_y(run[0] if run else ay):.2f}" x2="{map_x(field_plane):.2f}" y2="{map_y(run[1] if run else by):.2f}" stroke="#657276" stroke-width="1.5" stroke-dasharray="4 3"/>')
            for edge in as_list(grid.get("bayEdgesM")):
                along = num(edge)
                pier_start=max(run[0],along-pier_width/2);pier_end=min(run[1],along+pier_width/2)
                p0, p1 = local_opening_point(face, wall_plane, pier_start, 0), local_opening_point(face, wall_plane, pier_end, -inset)
                left, right = sorted((p0[0], p1[0])); bottom, top = sorted((p0[1], p1[1]))
                parts.append(f'<rect x="{map_x(left):.2f}" y="{map_y(top):.2f}" width="{(right-left)*scale:.2f}" height="{(top-bottom)*scale:.2f}" fill="#b8ad95" stroke="#475255" stroke-width="1"/>')
        parts.append(f'<text class="parcel" x="{map_x((ax+bx)/2):.2f}" y="{map_y((ay+by)/2):.2f}" text-anchor="middle">P{index}</text>')
    for group_index, group in enumerate(as_list(area.get("activityGroups")), 1):
        item = as_dict(group); bounds = bbox(item.get("bbox"))
        if not bounds:
            continue
        gx0, gy0, _gz0, gx1, gy1, _gz1 = bounds
        parts.append(f'<rect x="{map_x(gx0):.2f}" y="{map_y(gy1):.2f}" width="{(gx1-gx0)*scale:.2f}" height="{(gy1-gy0)*scale:.2f}" fill="none" stroke="#7b5b8d" stroke-width="2" stroke-dasharray="5 4"/>')
        parts.append(f'<text class="label" x="{map_x((gx0+gx1)/2):.2f}" y="{map_y((gy0+gy1)/2):.2f}" text-anchor="middle">G{group_index}</text>')
    for index, fixture in enumerate(as_list(area.get("fixtures")), 1):
        item = as_dict(fixture); bounds = bbox(item.get("bbox"))
        if not bounds: continue
        fx0, fy0, _fz0, fx1, fy1, _fz1 = bounds
        parts.append(f'<rect x="{map_x(fx0):.2f}" y="{map_y(fy1):.2f}" width="{(fx1-fx0)*scale:.2f}" height="{(fy1-fy0)*scale:.2f}" fill="none" stroke="#b34f39" stroke-width="2"/>')
        parts.append(f'<text class="label" x="{map_x((fx0+fx1)/2):.2f}" y="{map_y((fy0+fy1)/2):.2f}" text-anchor="middle">F{index}</text>')
    for index, landmark in enumerate(area_landmarks(issue, area), 1):
        item=as_dict(landmark)
        for pier in as_list(item.get("piers")):
            b=bbox(as_dict(pier).get("bbox"))
            if b: parts.append(f'<rect x="{map_x(b[0]):.2f}" y="{map_y(b[4]):.2f}" width="{(b[3]-b[0])*scale:.2f}" height="{(b[4]-b[1])*scale:.2f}" fill="#8b7451" stroke="#24353a"/>')
        clear=bbox(item.get("clearWalkingBox"))
        if clear:
            parts.append(f'<rect x="{map_x(clear[0]):.2f}" y="{map_y(clear[4]):.2f}" width="{(clear[3]-clear[0])*scale:.2f}" height="{(clear[4]-clear[1])*scale:.2f}" fill="none" stroke="#c2534d" stroke-width="3" stroke-dasharray="8 5"/><text class="label" x="{map_x((clear[0]+clear[3])/2):.2f}" y="{map_y((clear[1]+clear[4])/2):.2f}" text-anchor="middle">LM{index} CLEAR VOID</text>')
    for element in area.get('landscapeElements', []):
        root,crown=element['root'],element['crownCenterM']
        for point,radius in ((root,element['trunkRadiusM']),(crown,element['crownRadiusM'])):
            parts.append(f'<circle cx="{map_x(point[0]):.2f}" cy="{map_y(point[1]):.2f}" r="{radius*scale:.2f}" fill="none" stroke="#708065" stroke-width="2" stroke-dasharray="4 3"/>')
        parts.append(f'<text class="tiny" x="{map_x(root[0]):.2f}" y="{map_y(root[1])+16:.2f}">{esc(element["id"])} · root / crown</text>')
    for feature in area.get('facadeFeatures', []):
        low,high=feature['bbox']['min'],feature['bbox']['max']
        parts.append(f'<rect x="{map_x(low[0]):.2f}" y="{map_y(high[1]):.2f}" width="{(high[0]-low[0])*scale:.2f}" height="{(high[1]-low[1])*scale:.2f}" fill="none" stroke="#416e84" stroke-width="2" stroke-dasharray="5 3"/>')
    if area.get('facadeFeatures'):
        parts.append('<text class="label" x="1240" y="1100">Blue dashed: scheduled architectural projections/recesses.</text>')
    parts += [
        '<text class="label" x="1240" y="145">KEY</text>',
        '<line class="solid" x1="1240" y1="180" x2="1300" y2="180"/><text class="label" x="1320" y="185">Collider-backed face</text>',
        '<line class="open" x1="1240" y1="215" x2="1300" y2="215"/><text class="label" x="1320" y="220">Zero-build protected opening</text>',
        '<rect x="1240" y="242" width="60" height="18" fill="none" stroke="#b34f39" stroke-width="2"/><text class="label" x="1320" y="257">Fixture bounds</text>',
        '<rect x="1240" y="270" width="60" height="18" fill="#c2534d" fill-opacity=".16" stroke="#c2534d" stroke-width="2" stroke-dasharray="7 4"/><text class="label" x="1320" y="285">Retained gameplay</text>',
        '<line x1="1240" y1="312" x2="1300" y2="312" stroke="#573d7a" stroke-width="3"/><text class="label" x="1320" y="317">Camera direction</text>',
        f'<text class="label" x="{px}" y="1125">N ↑ · scale {fmt(min(10, max_x-min_x))} m</text>',
    ]
    material_ids = sorted({str(parcel.get("materialId")) for face in FACE_ORDER for parcel in face_parcels(area, face) if parcel.get("materialId")})
    for index, material_id in enumerate(material_ids):
        legend_y = 365 + index * 26
        color = material_color(material_id, materials)
        parts.append(f'<rect x="1240" y="{legend_y - 14}" width="18" height="18" fill="{color}" stroke="#24353a"/><text class="label" x="1270" y="{legend_y}">M{index+1} {esc(short(material_id, 20))} · {color}</text>')
    parts.append('<text class="label" x="1240" y="570">PARCEL KEY</text>')
    for index, parcel in enumerate(parcels, 1): parts.append(f'<text class="tiny" x="1240" y="{590 + index*18}">P{index}: {esc(short(parcel.get("id", "UNNAMED")))}</text>')
    for index, group in enumerate(as_list(area.get("activityGroups")), 1): parts.append(f'<text class="tiny" x="1240" y="{760 + index*18}">G{index}: {esc(short(as_dict(group).get("id", "UNNAMED")))}</text>')
    for index, fixture in enumerate(as_list(area.get("fixtures")), 1): parts.append(f'<text class="tiny" x="1240" y="{(885 if area.get("designRevision") else 860) + index*18}">F{index}: {esc(display_label(as_dict(fixture)))}</text>')
    for index, landmark in enumerate(area_landmarks(issue, area), 1): parts.append(f'<text class="tiny" x="1240" y="{1010 + index*18}">LM{index}: {esc(short(as_dict(landmark).get("id", "UNNAMED")))}</text>')
    return svg_footer(parts)


def display_label(item: dict[str, Any]) -> str:
    """Human-facing fixture name; stable source IDs remain in SVG title metadata."""
    if item.get('displayLabel'): return str(item['displayLabel'])
    name = re.sub(r'^R[0-9]+[-_]', '', str(item.get('id', item.get('kind', 'Fixture'))))
    return name.replace('_', ' ').replace('-', ' ').title()


def elevation_svg(issue: dict[str, Any], area: dict[str, Any], coverage: dict[tuple[str, str], CoverageFace], materials: dict[str, Any], faces: Iterable[str] = FACE_ORDER) -> str:
    faces = tuple(faces)
    panel_heights = {}
    for face in faces:
        rows = [o for p in face_parcels(area, face) for o in opening_rows(p)]
        panel_heights[face] = 650 + sum(38 + 17 * len(textwrap.wrap(str(o.get('closure', o.get('kind', 'opening'))), 88) or ['']) for o in rows)
    width, height = 1900, 155 + sum(panel_heights.values()) + 28 * (len(faces) - 1)
    parts = svg_header(width, height, f"{issue.get('id', 'Bazaar')} · {area['zone']} · {faces[0].title() + chr(32) + 'elevation' if len(faces)==1 else 'Four elevations'}")
    parts.append('<text class="sub" x="48" y="76">MEASURED FACADE DRAWING · actual floor contact, opening heads and scheduled closures · absolute design elevations</text>')
    panel_y = 115
    for face in faces:
        px, py = 48, panel_y; pw, ph = 1800, 570
        panel_y += panel_heights[face] + 28
        cov = coverage.get((str(area["zone"]), face)); parcels = face_parcels(area, face)
        span_start, span_end = (cov.start, cov.end) if cov else (0.0, max([num(interval(p.get("interval"))[1]) if interval(p.get("interval")) else 0 for p in parcels] or [1]))
        max_top = max([num(as_dict(p.get("roof")).get("capTopM"), num(p.get("wallTopM"))) for p in parcels] + [7.0] + [e['root'][2]+e['heightM'] for e in area.get('landscapeElements',[]) if face in e['viewFaces']])
        graph_right = px + 1150
        scale = min((graph_right - (px + 60)) / max(span_end - span_start, 1), (ph - 155) / max(max_top, 1))
        x = lambda value: px + 60 + (value - span_start) * sx
        sx = scale
        y = lambda value: py + ph - 70 - value * scale
        parts += [f'<rect class="panel" x="{px}" y="{py}" width="{pw}" height="{panel_heights[face]}" rx="8"/>', f'<text class="title" x="{px + 28}" y="{py + 42}">{face.upper()} elevation</text>']
        floor = as_dict(area.get("floor"))
        def floor_z(along: float) -> float:
            if floor.get("kind") != "ramp": return num(floor.get("elevationM"))
            axis = floor.get('axis'); rect = as_dict(floor.get('rect', area.get('rect')))
            if axis == 'y' and face in ('north','south'):
                along = num(area['rect']['y']) + (num(area['rect']['h']) if face == 'north' else 0)
            elif axis == 'x' and face in ('east','west'):
                along = num(area['rect']['x']) + (num(area['rect']['w']) if face == 'east' else 0)
            origin = num(rect.get('y' if axis == 'y' else 'x')); length = num(rect.get('h' if axis == 'y' else 'w'), 1)
            return num(floor.get("startElevationM")) + (num(floor.get("endElevationM")) - num(floor.get("startElevationM"))) * ((along-origin)/length)
        floor_a, floor_b = floor_z(span_start), floor_z(span_end)
        if floor.get("visual_style") == "stairs" and abs(floor_b-floor_a) > .001:
            steps = int(num(floor.get("step_count"), 1)); points = []
            for step in range(steps + 1):
                along = span_start + (span_end-span_start)*step/steps; points.append(f"{x(along):.2f},{y(floor_z(along)):.2f}")
            parts.append(f'<polyline points="{" ".join(points)}" fill="none" stroke="#52676a" stroke-width="2"/>')
        else: parts.append(f'<line class="axis" x1="{x(span_start):.2f}" y1="{y(floor_a):.2f}" x2="{x(span_end):.2f}" y2="{y(floor_b):.2f}"/>')
        if face == "north" or (face == "south" and area["zone"] == "SPAWN_B_COURTYARD"):
            for landmark in area_landmarks(issue, area):
                profile=as_dict(as_dict(landmark).get("innerArchProfile")); ls=profile.get("leftSpring"); lc=profile.get("leftControl"); crown=profile.get("crown"); rc=profile.get("rightControl"); rs=profile.get("rightSpring")
                if all(isinstance(v,list) and len(v)==2 for v in (ls,lc,crown,rc,rs)):
                    cap = num(landmark.get('capTopM'))
                    parts.append(f'<path d="M {x(num(ls[0])):.2f} {y(cap):.2f} L {x(num(rs[0])):.2f} {y(cap):.2f} L {x(num(rs[0])):.2f} {y(num(rs[1])):.2f} Q {x(num(rc[0])):.2f} {y(num(rc[1])):.2f} {x(num(crown[0])):.2f} {y(num(crown[1])):.2f} Q {x(num(lc[0])):.2f} {y(num(lc[1])):.2f} {x(num(ls[0])):.2f} {y(num(ls[1])):.2f} Z" fill="#cbb99b" stroke="#766345" stroke-width="2"/>')
                    for pier in landmark.get('piers', []):
                        pb = bbox(pier['bbox'])
                        parts.append(f'<rect x="{x(pb[0]):.2f}" y="{y(pb[5]):.2f}" width="{(pb[3]-pb[0])*scale:.2f}" height="{(pb[5]-pb[2])*scale:.2f}" fill="#cbb99b" stroke="#766345"/>')
                    inner=[];outer=[]
                    for first,control,last in ((ls,lc,crown),(crown,rc,rs)):
                        for step in range(profile['segmentsPerHalf']+1):
                            t=step/profile['segmentsPerHalf'];u=1-t
                            ax=u*u*first[0]+2*u*t*control[0]+t*t*last[0];az=u*u*first[1]+2*u*t*control[1]+t*t*last[1]
                            dx=2*u*(control[0]-first[0])+2*t*(last[0]-control[0]);dz=2*u*(control[1]-first[1])+2*t*(last[1]-control[1]);length=math.hypot(dx,dz)
                            inner.append((ax,az));outer.append((ax-dz/length*profile['ringThicknessM'],az+dx/length*profile['ringThicknessM']))
                    ring=' '.join(f'{x(a):.2f},{y(z):.2f}' for a,z in [*inner,*reversed(outer)])
                    parts.append(f'<polygon points="{ring}" fill="#decbaa" stroke="#9e8766" stroke-width=".8"/>')
                    accent=landmark.get('accent',{});bounds=accent.get('bounds')
                    if face=='south' and bounds:
                        lo,hi=bounds['min'],bounds['max']
                        parts.append(f'<rect x="{x(lo[0]):.2f}" y="{y(hi[2]):.2f}" width="{x(hi[0])-x(lo[0]):.2f}" height="{y(lo[2])-y(hi[2]):.2f}" fill="{accent["colorSrgb"]}"/><text x="{x((lo[0]+hi[0])/2):.2f}" y="{y((lo[2]+hi[2])/2):.2f}" dominant-baseline="middle" text-anchor="middle" font-size="{max(3.5,abs(y(.12)-y(0))):.2f}" fill="#efe4cb">{esc(accent["text"])}</text>')
                    label='LM-01 · 0.35 m stone arch ring' + (' · inlay on reverse north face' if face=='north' else ' · north-face inlay')
                    parts.append(f'<text class="tiny" x="{x(num(crown[0])):.2f}" y="{y(cap)-8:.2f}" text-anchor="middle">{label}</text>')
        if cov:
            for solid in cov.solid:
                run = interval(solid.get("interval"))
                if run: parts.append(f'<line class="solid" x1="{x(run[0]):.2f}" y1="{y(floor_z(run[0])):.2f}" x2="{x(run[1]):.2f}" y2="{y(floor_z(run[1])):.2f}"/>')
            for opening in cov.openings:
                run = interval(opening.get("interval"))
                if run: parts.append(f'<rect x="{x(run[0]):.2f}" y="{y(floor_z(run[0]))-13:.2f}" width="{(run[1]-run[0])*sx:.2f}" height="13" fill="url(#zero-build)"/><text class="tiny" x="{(x(run[0])+x(run[1]))/2:.2f}" y="{y(floor_z(run[0]))+27:.2f}" text-anchor="middle">ZERO BUILD</text>')
        parts += landscape_elevation(area, face, x, y)
        opening_key: list[tuple[str, dict[str, Any]]] = []
        opening_clips: dict[str, str] = {}
        for index, parcel in enumerate(parcels):
            run = interval(parcel.get("interval"))
            if not run: continue
            roof = as_dict(parcel.get("roof")); wall_top = num(parcel.get("wallTopM")); slab_top = num(roof.get("slabTopM"), wall_top); parapet_top = num(roof.get("parapetTopM"), slab_top); cap_top = num(roof.get("capTopM"), parapet_top)
            floor_left, floor_right = floor_z(run[0]), floor_z(run[1])
            wall_points = f'{x(run[0]):.2f},{y(floor_left):.2f} {x(run[0]):.2f},{y(wall_top):.2f} {x(run[1]):.2f},{y(wall_top):.2f} {x(run[1]):.2f},{y(floor_right):.2f}'
            parts.append(f'<polygon points="{wall_points}" fill="#e8dfcb" stroke="#24353a" stroke-width="1.5"/>')
            regions = [as_dict(item) for item in as_list(parcel.get("materialRegions"))]
            for region in regions:
                along = interval(region.get("alongM")) or run
                left, right = max(run[0], along[0]), min(run[1], along[1])
                if right <= left: continue
                for polygon in material_region_polygons(region, left, right, wall_top, floor_z):
                    points = ' '.join(f'{x(along_value):.2f},{y(z_value):.2f}' for along_value, z_value in polygon)
                    parts.append(f'<polygon points="{points}" fill="{material_color(str(region.get("materialId", parcel.get("materialId", ""))), materials)}" fill-opacity=".82"/>')
            if is_bc01(parcel):
                grid = as_dict(parcel.get("structuralGrid")); base_height = num(grid.get("baseBandHeightM"), .60); top_height = num(grid.get("topBandHeightM"), .50)
                base_points = [(run[0], floor_z(run[0])), (run[1], floor_z(run[1])), (run[1], floor_z(run[1]) + base_height), (run[0], floor_z(run[0]) + base_height)]
                base = ' '.join(f'{x(along_value):.2f},{y(z_value):.2f}' for along_value, z_value in base_points)
                parts.append(f'<polygon points="{base}" fill="{material_color(str(parcel.get("baseMaterialId", parcel.get("materialId", ""))), materials)}" fill-opacity=".52" stroke="#766345" stroke-width="1.2"/>')
                parts.append(f'<rect x="{x(run[0]):.2f}" y="{y(wall_top):.2f}" width="{(run[1]-run[0])*scale:.2f}" height="{top_height*scale:.2f}" fill="#d9c7aa" fill-opacity=".62" stroke="#766345" stroke-width="1.2"/>')
                pier_width = num(grid.get("pierWidthM"), .32)
                for edge in as_list(grid.get("bayEdgesM")):
                    along_value = num(edge)
                    if run[0] - .001 <= along_value <= run[1] + .001:
                        pl,pr=max(run[0],along_value-pier_width/2),min(run[1],along_value+pier_width/2)
                        pts=f'{x(pl):.2f},{y(floor_z(pl)):.2f} {x(pl):.2f},{y(wall_top):.2f} {x(pr):.2f},{y(wall_top):.2f} {x(pr):.2f},{y(floor_z(pr)):.2f}'
                        parts.append(f'<polygon points="{pts}" fill="#c3b69f" fill-opacity=".82" stroke="#5e696a" stroke-width="1.4"/>')
                # The complete BC-01 detail is in the schedule; a long inline label obscures narrow returns.
            parts.append(f'<rect x="{x(run[0]):.2f}" y="{y(cap_top):.2f}" width="{(run[1]-run[0])*scale:.2f}" height="{(cap_top-wall_top)*scale:.2f}" fill="#d8c9ad" stroke="#8b7451"/>')
            for level, color2 in ((slab_top,"#d4c39e"),(parapet_top,"#e2d1ad"),(cap_top,"#8b7451")): parts.append(f'<line x1="{x(run[0]):.2f}" y1="{y(level):.2f}" x2="{x(run[1]):.2f}" y2="{y(level):.2f}" stroke="{color2}" stroke-width="2"/>')
            if parcel.get('envelopeDetail',{}).get('corniceProfile') in ('single-drip','civic-stepped'):
                parts.append(f'<rect x="{x(run[0]):.2f}" y="{y(wall_top):.2f}" width="{(run[1]-run[0])*scale:.2f}" height="{.16*scale:.2f}" fill="#c8b692" stroke="#8b7451" stroke-width=".8"/>')
            parts.append(f'<text class="parcel" x="{(x(run[0])+x(run[1]))/2:.2f}" y="{y(wall_top)+16:.2f}" text-anchor="middle">P{index+1}</text>')
            for opening in opening_rows(parcel):
                label = f"O{index+1}.{len(opening_key)+1}"
                opening_key.append((label, opening))
                shape = str(as_dict(as_dict(opening.get("shopfront")).get("cavity")).get("frontProfile", opening.get("headShape", "rectangular"))).lower()
                if shape not in {"rectangular", "rect", "square"}:
                    clip_id = f'opening-clip-{str(area["zone"]).lower()}-{face}-{len(opening_clips)+1}'
                    opening_clips[str(opening.get("id"))] = clip_id
                    parts.append(f'<defs><clipPath id="{clip_id}"><path d="{opening_path(opening, x, y, scale)}"/></clipPath></defs>')
                parts += opening_joinery(opening, x, y)
                axis = num(opening.get('axisM'), num(opening.get('alongM')))
                parts.append(f'<line x1="{x(axis):.2f}" y1="{y(num(opening.get("headM")))-14:.2f}" x2="{x(axis):.2f}" y2="{y(num(opening.get("sillM")))+8:.2f}" stroke="#496c7c" stroke-width=".7" stroke-dasharray="4 4"/>')
                parts.append(f'<text x="{x(axis):.2f}" y="{y(num(opening.get("headM")))-5:.2f}" text-anchor="middle" font-size="10" fill="#234452">{label}</text>')
            # Storey datums come from the owning building record, never inferred from windows.
            building = next((b for b in issue.get('buildings', []) if parcel.get('id') in b.get('memberParcelIds', [])), None)
            if building:
                for storey in building.get('storeys', []):
                    level = num(storey.get('floorM'))
                    if level <= 0: continue
                    parts.append(f'<line x1="{x(run[0]):.2f}" x2="{x(run[1]):.2f}" y1="{y(level):.2f}" y2="{y(level):.2f}" stroke="#416779" stroke-width=".8" stroke-dasharray="7 5"/><text x="{x(run[0])+3:.2f}" y="{y(level)-4:.2f}" font-size="10" fill="#234452">L{storey["index"]} +{fmt(level)} m</text>')
            for treatment in as_list(parcel.get('surfaceTreatments')):
                item = as_dict(treatment); polygon = as_list(item.get('polygonAlongZ'))
                if polygon:
                    points=' '.join(f'{x(num(point[0])):.2f},{y(num(point[1])):.2f}' for point in polygon if isinstance(point, list) and len(point) >= 2)
                    if points: parts.append(f'<polygon points="{points}" fill="#e6dbbf" fill-opacity=".5"/>')
        for gi,group_raw in enumerate(as_list(area.get('activityGroups')),1):
            group = as_dict(group_raw)
            if group.get('receiverFace') != face: continue
            bounds = bbox(group.get('bbox'))
            if not bounds: continue
            lo,hi=bounds[:3],bounds[3:];axis=0 if face in ('north','south') else 1
            a,b=lo[axis],hi[axis];center=(a+b)/2
            clip_id = opening_clips.get(str(group.get("receiverOpening")))
            if clip_id:
                parts.append(f'<g clip-path="url(#{clip_id})">')
            for part in sorted(group.get('instanceLayout',{}).get('parts',[]), key=lambda p:p['localBox']['min'][1]):
                part_low,part_high=part['localBox']['min'],part['localBox']['max'];left,right=center+part_low[0],center+part_high[0];bottom,top=lo[2]+part_low[2],lo[2]+part_high[2]
                color=part.get('stockColorSrgb',material_color(part['materialId'],materials));kind=part['kind']
                if part.get('finishDetail') in ('B-FINISH-TEXTILE','CF-RUG') and kind in ('bound-hanging-rug','fitted-cloth-cushion'):
                    parts += b_rug_elevation(group['id']+'-'+part['id'],left,right,bottom,top,x,y)
                elif kind=='taut-woven-panel' and part.get('wovenFraction'):
                    working=bottom+(top-bottom)*part['wovenFraction']
                    parts += b_rug_elevation(group['id']+'-weft',left,right,bottom,working,x,y)
                    for i in range(part.get('warpCount',12)):
                        u=left+(right-left)*(i+.5)/part.get('warpCount',12)
                        parts.append(f'<path d="M {x(u):.2f} {y(working):.2f} V {y(top):.2f}" stroke="#bba786" stroke-width=".8"/>')
                elif 'gate' in kind:
                    parts.append(f'<rect x="{x(left):.2f}" y="{y(top):.2f}" width="{(right-left)*scale:.2f}" height="{(top-bottom)*scale:.2f}" fill="none" stroke="#6c5944" stroke-width="2"/>')
                    for i in range(1,6):
                        ax=left+(right-left)*i/6;parts.append(f'<line x1="{x(ax):.2f}" y1="{y(bottom):.2f}" x2="{x(ax):.2f}" y2="{y(top):.2f}" stroke="#6c5944"/>')
                elif any(token in kind for token in ('pot','bowl','cup','jar','vessel','bottle','canister','plant')):
                    parts.append(f'<ellipse cx="{x((left+right)/2):.2f}" cy="{y((bottom+top)/2):.2f}" rx="{(right-left)*scale/2:.2f}" ry="{(top-bottom)*scale/2:.2f}" fill="{color}" stroke="#675c4b" stroke-width=".7"/>')
                else:
                    parts.append(f'<rect x="{x(left):.2f}" y="{y(top):.2f}" width="{(right-left)*scale:.2f}" height="{(top-bottom)*scale:.2f}" fill="{color}" stroke="#675c4b" stroke-width=".7"/>')
            if clip_id:
                parts.append('</g>')
                opening = next((item for _label, item in opening_key if str(item.get("id")) == str(group.get("receiverOpening"))), None)
                if opening:
                    parts.append(f'<path d="{opening_path(opening, x, y, scale)}" fill="none" stroke="#24353a" stroke-width="1.7"/>')
            parts.append(f'<text class="tiny" x="{x(center):.2f}" y="{y(lo[2]+.55):.2f}" text-anchor="middle">G{gi}</text>')
        for fixture in as_list(area.get("fixtures")):
            item=as_dict(fixture)
            if item.get("receiverFace") != face: continue
            run=interval(item.get("interval")); z=num(item.get("ledgerZ"));
            if run:
                sag=num(item.get('sagM'));drop=num(item.get('dropM'));mid=(run[0]+run[1])/2
                parts.append(f'<path d="M {x(run[0]):.2f} {y(z):.2f} L {x(run[1]):.2f} {y(z):.2f} L {x(run[1]):.2f} {y(z-drop):.2f} Q {x(mid):.2f} {y(z-drop-sag*2):.2f} {x(run[0]):.2f} {y(z-drop):.2f} Z" fill="{item.get('stockColorSrgb') or material_color(str(item.get('materialId', '')), materials)}" stroke="#8b7451"/>')
            if run: parts.append(f'<line x1="{x(run[0]):.2f}" y1="{y(z):.2f}" x2="{x(run[1]):.2f}" y2="{y(z):.2f}" stroke="#8b4e3f" stroke-width="4"/><text class="tiny" x="{(x(run[0])+x(run[1]))/2:.2f}" y="{y(z)-6:.2f}" text-anchor="middle">{esc(display_label(item))}<title>{esc(item.get("id", ""))}</title></text>')
        for feature in area.get('facadeFeatures', []):
            if feature['receiverFace'] == face:
                parts += b_feature_elevation(feature, x, y)
        contact=as_dict(area.get('floorContactProfile'))
        if contact.get('kind')=='stair-treads' and ((contact.get('axis')=='y' and face in ('east','west')) or (contact.get('axis')=='x' and face in ('north','south'))):
            step_points=[];previous_end=span_start
            for segment in contact['segments']:
                lo,hi=segment['intervalM'];lo=max(span_start,lo,previous_end);hi=min(span_end,hi+segment.get('nosingOverlapM',0))
                if hi>lo:step_points.extend([(lo,segment['topZM']),(hi,segment['topZM'])]);previous_end=hi
            if step_points:
                floor_bottom=min(floor_a,floor_b)
                outline=step_points+[(span_end,floor_bottom),(span_start,floor_bottom)]
                pts=' '.join(f'{x(a):.2f},{y(z):.2f}' for a,z in outline)
                parts.append(f'<polygon points="{pts}" fill="#fbfaf5"/>')
                pts=' '.join(f'{x(a):.2f},{y(z):.2f}' for a,z in step_points)
                parts.append(f'<polyline points="{pts}" fill="none" stroke="#52676a" stroke-width="1.4"/>')
        parts.append(f'<text class="tiny" x="{px + 60}" y="{py + ph - 28}">along {fmt(span_start)}..{fmt(span_end)} m · vertical absolute z</text>')
        row_height = 50
        parts.append(f'<text class="label" x="{graph_right + 22}" y="{py + 72}">PARCEL KEY</text>')
        for index, parcel in enumerate(parcels):
            run = interval(parcel.get("interval"))
            row_y = py + 98 + index * row_height
            roof = as_dict(parcel.get("roof")); key = short(parcel.get("id", "UNNAMED"), 18)
            parts.append(f'<text class="tiny" x="{graph_right + 22}" y="{row_y:.2f}">P{index+1} {esc(key)}</text>')
            parts.append(f'<text class="tiny" x="{graph_right + 22}" y="{row_y+14:.2f}">slab {fmt(roof.get("slabBottomM"))}..{fmt(roof.get("slabTopM"))}</text>')
            parts.append(f'<text class="tiny" x="{graph_right + 22}" y="{row_y+28:.2f}">parapet {fmt(roof.get("parapetTopM"))} · cap {fmt(roof.get("capTopM"))}</text>')
        # Equal horizontal/vertical drawing scale; dimensions remain valid at any print size.
        bar_m = min(5.0, max(1.0, math.floor((span_end-span_start)/4)))
        bar_y = py + ph - 15
        parts.append(f'<path d="M {x(span_start):.2f} {bar_y-5} V {bar_y+5} M {x(span_start):.2f} {bar_y} H {x(span_start+bar_m):.2f} M {x(span_start+bar_m):.2f} {bar_y-5} V {bar_y+5}" stroke="#24353a" fill="none"/><text class="tiny" x="{x(span_start+bar_m)+8:.2f}" y="{bar_y+4}">{fmt(bar_m)} m scale bar; horizontal = vertical</text>')
        parts.append(f'<text class="tiny" x="{graph_right+22}" y="{py+ph-40}">Floor at span ends: +{fmt(floor_a)} / +{fmt(floor_b)} m</text>')
        table_y = py + ph + 26
        parts.append(f'<text class="label" x="{px+28}" y="{table_y}">COMPLETE OPENING SCHEDULE · metres · axis is absolute plan coordinate; sill/head are absolute z</text>')
        table_y += 25
        for tx, heading in ((px+28,'Key / stable opening ID'),(px+410,'Storey / axis'),(px+600,'Width / sill / head'),(px+855,'Complete scheduled closure')):
            parts.append(f'<text class="tiny" x="{tx}" y="{table_y}">{heading}</text>')
        table_y += 24
        for label, opening in opening_key:
            closure_lines = textwrap.wrap(str(opening.get('closure', opening.get('kind', 'opening'))), 88) or ['']
            row_h = 38 + 17 * len(closure_lines)
            parts.append(f'<path d="M {px+28} {table_y-15} H {px+pw-28}" stroke="#d2d8d5"/>')
            parts.append(f'<text class="tiny" x="{px+28}" y="{table_y}">{label}</text><text font-size="12" x="{px+28}" y="{table_y+17}">{esc(opening.get("id", ""))}</text>')
            axis = opening.get('axisM', opening.get('alongM'))
            parts.append(f'<text class="tiny" x="{px+410}" y="{table_y}">L{opening.get("storey", "unspecified")} / {fmt(axis)}</text>')
            parts.append(f'<text class="tiny" x="{px+600}" y="{table_y}">{fmt(opening.get("widthM"))} / {fmt(opening.get("sillM"))} / {fmt(opening.get("headM"))}</text>')
            for line_index, line in enumerate(closure_lines):
                parts.append(f'<text class="tiny" x="{px+855}" y="{table_y+line_index*17}">{esc(line)}</text>')
            table_y += row_h
        if not opening_key:
            parts.append(f'<text class="tiny" x="{px+28}" y="{table_y}">No scheduled openings on this face.</text>')
    return svg_footer(parts)


def building_parcels(building: dict[str, Any], areas: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    facade = as_dict(building.get("mainFacade"))
    area = areas.get(str(facade.get("zone")))
    if not area:
        return []
    member_ids = {str(value) for value in as_list(building.get("memberParcelIds"))}
    parcel_ids = {str(value) for value in as_list(facade.get("parcelIds"))} or member_ids
    return [parcel for parcel in face_parcels(area, str(facade.get("face"))) if str(parcel.get("id")) in parcel_ids]


def building_stem(building: dict[str, Any]) -> str:
    return "building-" + str(building.get("id", "unnamed")).lower().replace("_", "-")


def building_structure_svg(issue: dict[str, Any], building: dict[str, Any], areas: dict[str, dict[str, Any]]) -> str:
    """Neutral elevation and section derived solely from a complete building record."""
    facade = as_dict(building.get("mainFacade")); parcels = building_parcels(building, areas)
    if not parcels:
        die(f"building {building.get('id')} has no main-facade parcels")
    facade_interval = interval(facade.get("interval"))
    runs = [interval(parcel.get("interval")) for parcel in parcels]
    start = facade_interval[0] if facade_interval else min(run[0] for run in runs if run)
    end = facade_interval[1] if facade_interval else max(run[1] for run in runs if run)
    storeys = sorted([as_dict(item) for item in as_list(building.get("storeys"))], key=lambda item: num(item.get("index")))
    rooms = [as_dict(item) for item in as_list(building.get("rooms"))]
    if not storeys or not rooms:
        die(f"building {building.get('id')} requires storeys and rooms for its structure drawing")
    max_top = max(num(as_dict(parcel.get("roof")).get("capTopM"), num(parcel.get("wallTopM"))) for parcel in parcels)
    min_floor = min(num(item.get("floorM")) for item in storeys)
    width, height = 2200, 1340; elevation_x, section_x, graph_y = 80, 1210, 1160
    elev_scale = min(880 / max(end - start, 1), 820 / max(max_top - min_floor, 1))
    ex = lambda value: elevation_x + 70 + (value - start) * elev_scale
    ey = lambda value: graph_y - (value - min_floor) * elev_scale
    face = str(facade.get("face"))
    depth_axis = 1 if face in ("north", "south") else 0
    along_axis = 0 if depth_axis == 1 else 1
    cut = as_dict(building.get('sectionCut'))
    cut_axis = num(cut.get('alongM'), (start + end) / 2)
    polygons = [as_list(poly) for poly in as_list(building.get('footprintPolygons'))]
    footprint_points = [point for poly in polygons
                        if poly and min(num(p[along_axis]) for p in poly) - .001 <= cut_axis <= max(num(p[along_axis]) for p in poly) + .001
                        for point in poly if isinstance(point, list) and len(point) >= 2]
    depths = [num(point[depth_axis]) for point in footprint_points]
    if not depths:
        die(f"building {building.get('id')} requires footprintPolygons for its transverse section")
    depth_start, depth_end = min(depths), max(depths)
    depth_scale = min(710 / max(depth_end - depth_start, 1), 820 / max(max_top - min_floor, 1))
    sx = lambda value: section_x + 95 + (value - depth_start) * depth_scale
    sy = lambda value: graph_y - (value - min_floor) * depth_scale
    parts = svg_header(width, height, f"{issue.get('id', 'Bazaar')} · {building.get('id')} · Structure")
    parts += [
        '<text class="sub" x="48" y="76">UNTEXTURED STRUCTURE DRAWING · neutral clay/ink · dimensions in metres · composition review only</text>',
        '<rect class="panel" x="48" y="105" width="1080" height="1165" rx="8"/><rect class="panel" x="1160" y="105" width="990" height="1165" rx="8"/>',
        f'<text id="principal-elevation" class="title" x="{elevation_x}" y="158">PRINCIPAL {esc(face.upper())} ELEVATION</text><text id="transverse-section" class="title" x="{section_x}" y="158">TRANSVERSE SECTION</text>',
        f'<text class="sub" x="{elevation_x}" y="184">{esc(str(building.get("name", building.get("use", "Building"))))}</text><text class="sub" x="{section_x}" y="184">{esc(cut.get("purpose", "Through the primary facade axis"))}</text>',
    ]
    # The elevation stays untextured: clay fields, crisp openings, datums and axes only.
    parts += landscape_elevation(areas[str(facade['zone'])], face, ex, ey, neutral=True)
    opening_by_id: dict[str, dict[str, Any]] = {}
    for parcel in parcels:
        run = interval(parcel.get("interval"))
        if not run: continue
        floor = num(parcel.get("floorElevationM"), min_floor); top = num(parcel.get("wallTopM"))
        parts.append(f'<rect x="{ex(run[0]):.2f}" y="{ey(top):.2f}" width="{(run[1]-run[0])*elev_scale:.2f}" height="{(top-floor)*elev_scale:.2f}" fill="#ddd7ca" stroke="#24353a" stroke-width="2"/>')
        roof = as_dict(parcel.get("roof"))
        parts.append(f'<rect x="{ex(run[0]):.2f}" y="{ey(num(roof.get("capTopM"))):.2f}" width="{(run[1]-run[0])*elev_scale:.2f}" height="{(num(roof.get("capTopM"))-top)*elev_scale:.2f}" fill="#d1cabb" stroke="#687477"/>')
        for level, tone in ((num(roof.get("slabTopM"), top), "#b8b5ad"), (num(roof.get("parapetTopM"), top), "#cbc6ba"), (num(roof.get("capTopM"), top), "#565d5d")):
            parts.append(f'<line x1="{ex(run[0]):.2f}" y1="{ey(level):.2f}" x2="{ex(run[1]):.2f}" y2="{ey(level):.2f}" stroke="{tone}" stroke-width="3"/>')
        for opening in opening_rows(parcel):
            opening_by_id[str(opening.get("id"))] = opening
            parts += opening_joinery(opening, ex, ey, neutral=True)
    for feature in areas[str(facade['zone'])].get('facadeFeatures', []):
        if feature['receiverParcel'] in {p['id'] for p in parcels}:
            parts += b_feature_elevation(feature, ex, ey, neutral=True)
    for storey in storeys:
        floor = num(storey.get("floorM")); ceiling = num(storey.get("ceilingM")); slab = num(storey.get("nextSlabTopM"), ceiling)
        parts.append(f'<line x1="{ex(start):.2f}" y1="{ey(floor):.2f}" x2="{ex(end):.2f}" y2="{ey(floor):.2f}" stroke="#687477" stroke-width="1.3"/><text class="tiny" x="{ex(end)+10:.2f}" y="{ey(floor)+4:.2f}">L{fmt(storey.get("index"), 0)} floor {fmt(floor)} / slab {fmt(slab)}</text>')
        parts.append(f'<text class="tiny" x="{(ex(end)+10 if building.get("designRevision") else ex(start)+8):.2f}" y="{ey((floor+ceiling)/2):.2f}">{esc(short(storey.get("use", "storey"), 24))}</text>')
    edges = [num(item) for item in as_list(building.get("structuralBayEdgesM"))]
    axes = [num(item) for item in as_list(building.get("primaryAxesM"))]
    if building.get('floorAxisSchedule'):
        for row in building['floorAxisSchedule']:
            for axis in row['mainFacadeAxesM']:
                parts.append(f'<line x1="{ex(axis):.2f}" y1="{ey(row["floorM"]):.2f}" x2="{ex(axis):.2f}" y2="{ey(row["ceilingM"]):.2f}" stroke="#929b9a" stroke-width=".8" stroke-dasharray="4 4"/><text class="tiny" x="{ex(axis):.2f}" y="{ey(row["floorM"])+15:.2f}" text-anchor="middle">{fmt(axis)}</text>')
    else:
        for index, axis in enumerate(axes, 1):
            parts.append(f'<line x1="{ex(axis):.2f}" y1="{ey(min_floor):.2f}" x2="{ex(axis):.2f}" y2="{ey(max_top):.2f}" stroke="#7a8587" stroke-width="1" stroke-dasharray="6 4"/><text class="tiny" x="{ex(axis):.2f}" y="{ey(max_top)-9:.2f}" text-anchor="middle">A{index}</text>')
        for index, axis in enumerate(as_list(building.get("subordinateAxesM")), 1):
            value = num(axis); parts.append(f'<line x1="{ex(value):.2f}" y1="{ey(min_floor):.2f}" x2="{ex(value):.2f}" y2="{ey(max_top):.2f}" stroke="#9ba3a3" stroke-width="1" stroke-dasharray="2 4"/><text class="tiny" x="{ex(value):.2f}" y="{ey(max_top)-23:.2f}" text-anchor="middle">s{index}</text>')
    dim_y = ey(min_floor) + 54
    parts.append(f'<line x1="{ex(start):.2f}" y1="{dim_y:.2f}" x2="{ex(end):.2f}" y2="{dim_y:.2f}" stroke="#899294"/><text class="label" x="{(ex(start)+ex(end))/2:.2f}" y="{dim_y+17:.2f}" text-anchor="middle">overall facade {fmt(end-start)} m · lower dimensions are ground pier bays</text>')
    for left, right in zip(edges, edges[1:]):
        parts.append(f'<line x1="{ex(left):.2f}" y1="{dim_y+30:.2f}" x2="{ex(right):.2f}" y2="{dim_y+30:.2f}" stroke="#a2aaab"/><text class="tiny" x="{(ex(left)+ex(right))/2:.2f}" y="{dim_y+44:.2f}" text-anchor="middle">{fmt(right-left)}</text>')
    principal = opening_by_id.get(str(building.get("principalEntranceId")), {})
    if principal:
        along = num(principal.get("alongM")); parts.append(f'<circle cx="{ex(along):.2f}" cy="{ey(num(principal.get("headM")))-12:.2f}" r="5" fill="#b44b42"/><text class="tiny" x="{ex(along):.2f}" y="{ey(num(principal.get("headM")))-21:.2f}" text-anchor="middle">principal entrance</text>')
    entrance = opening_by_id.get(str(cut.get('openingId')), principal)
    staff_opening = next((opening for opening in opening_by_id.values() if as_dict(as_dict(opening.get("shopfront")).get("staffAccess"))), None)
    if staff_opening is not None and not as_dict(as_dict(entrance).get("shopfront")).get("staffAccess"):
        entrance = staff_opening
    # Section: actual room envelopes establish the depth; envelope walls and entrance recess are called out.
    roof = parcels[0]['roof']; wall_top = num(parcels[0]['wallTopM'])
    parts.append(f'<rect x="{sx(depth_start):.2f}" y="{sy(wall_top):.2f}" width="{(depth_end-depth_start)*depth_scale:.2f}" height="{(wall_top-min_floor)*depth_scale:.2f}" fill="#e5e1d8" stroke="#24353a" stroke-width="2"/>')
    parts.append(f'<rect x="{sx(depth_start):.2f}" y="{sy(num(roof["slabTopM"])):.2f}" width="{(depth_end-depth_start)*depth_scale:.2f}" height="{num(roof["slabThicknessM"])*depth_scale:.2f}" fill="#818987"/>')
    for edge_start,edge_end in [(depth_start,depth_start+.16),(depth_end-.16,depth_end)]:
        parts.append(f'<rect x="{sx(edge_start):.2f}" y="{sy(num(roof["capTopM"])):.2f}" width="{(edge_end-edge_start)*depth_scale:.2f}" height="{(num(roof["capTopM"])-num(roof["slabTopM"]))*depth_scale:.2f}" fill="#a5a398" stroke="#687477"/>')
    entrance_axis = cut_axis
    section_rooms = []
    for room in rooms:
        if room.get('referenceParcelId') and room['referenceParcelId'] not in {p['id'] for p in parcels}:
            continue
        bounds = bbox(room.get("boundsXYZ"))
        if not bounds or not (bounds[along_axis] - .001 <= entrance_axis <= bounds[along_axis + 3] + .001):
            continue
        section_rooms.append((room, bounds))
    if not section_rooms:
        section_rooms = [(room, bounds) for room in rooms if (bounds := bbox(room.get("boundsXYZ")))]
    for room, bounds in section_rooms:
        left, right, bottom, top = bounds[depth_axis], bounds[depth_axis + 3], bounds[2], bounds[5]
        parts.append(f'<rect x="{sx(left):.2f}" y="{sy(top):.2f}" width="{(right-left)*depth_scale:.2f}" height="{(top-bottom)*depth_scale:.2f}" fill="#f7f4ec" stroke="#687477" stroke-width="1"/><text class="tiny" x="{(sx(left)+sx(right))/2:.2f}" y="{(sy(bottom)+sy(top))/2:.2f}" text-anchor="middle">{esc(short(room.get("use", "room"), 22))}</text>')
    for storey in storeys:
        floor = num(storey.get("floorM")); slab = num(storey.get("nextSlabTopM"), num(storey.get("ceilingM")))
        parts.append(f'<rect x="{sx(depth_start):.2f}" y="{sy(slab):.2f}" width="{(depth_end-depth_start)*depth_scale:.2f}" height="{max(2, (slab-num(storey.get("ceilingM")))*depth_scale):.2f}" fill="#818987"/>')
    recess = num(entrance.get("depthM"))
    main_area = areas[str(facade['zone'])]
    front_depth = num(area_faces(main_area)[face]['wallPlaneM'])
    inside_sign = 1 if face in ('north', 'east') else -1
    recess_end = front_depth + inside_sign * recess
    if entrance:
        sill, head = num(entrance.get("sillM")), num(entrance.get("headM"))
        parts.append(f'<path d="M {sx(front_depth):.2f} {sy(sill):.2f} L {sx(recess_end):.2f} {sy(sill):.2f} L {sx(recess_end):.2f} {sy(head):.2f} L {sx(front_depth):.2f} {sy(head):.2f}" fill="none" stroke="#b44b42" stroke-width="3"/>')
        if entrance.get('kind') == 'shop':
            shopfront = as_dict(entrance.get('shopfront')); cavity = as_dict(shopfront.get('cavity'))
            deck = sill + .04
            c0, c1 = sorted([front_depth-inside_sign*.15, front_depth+inside_sign*.55])
            w0, w1 = sorted([front_depth+inside_sign*.60, front_depth+inside_sign*1.60])
            if cavity:
                barrel_depth = num(cavity.get("frontBarrelDepthM")); chamber_from = num(cavity.get("chamberFromOutM")); chamber_back = num(cavity.get("chamberBackOutM")); chamber_ceiling = num(cavity.get("chamberCeilingM"), head)
                to_depth = lambda out: front_depth + face_out_sign(face) * out
                barrel0, barrel1 = sorted((to_depth(0), to_depth(-barrel_depth)))
                chamber0, chamber1 = sorted((to_depth(chamber_from), to_depth(chamber_back)))
                parts.append(f'<rect x="{sx(chamber0):.2f}" y="{sy(chamber_ceiling):.2f}" width="{(chamber1-chamber0)*depth_scale:.2f}" height="{(chamber_ceiling-deck)*depth_scale:.2f}" fill="#f4f1e9" stroke="#667477" stroke-width="1.3"/>')
                parts.append(f'<rect x="{sx(barrel0):.2f}" y="{sy(head):.2f}" width="{(barrel1-barrel0)*depth_scale:.2f}" height="{(head-deck)*depth_scale:.2f}" fill="#f4f1e9" stroke="#475255" stroke-width="1.5" stroke-dasharray="5 3"/>')
                parts.append(f'<text class="tiny" x="{(sx(chamber0)+sx(chamber1))/2:.2f}" y="{sy(deck+.35):.2f}" text-anchor="middle">rectangular chamber behind front arch barrel</text>')
                parts.append(f'<text class="tiny" x="{(sx(barrel0)+sx(barrel1))/2:.2f}" y="{sy(head)-7:.2f}" text-anchor="middle">{fmt(barrel_depth)} m barrel</text>')
            if as_dict(entrance.get('shopfront')).get('frontClosure') == 'locked-lattice-gate':
                gate_depth = front_depth-inside_sign*.20
                parts.append(f'<line x1="{sx(gate_depth):.2f}" y1="{sy(deck):.2f}" x2="{sx(gate_depth):.2f}" y2="{sy(deck+1.15):.2f}" stroke="#766345" stroke-width="4"/>')
            else:
                parts.append(f'<rect x="{sx(c0):.2f}" y="{sy(deck+.90):.2f}" width="{(c1-c0)*depth_scale:.2f}" height="{.90*depth_scale:.2f}" fill="#9b8c77" stroke="#4b5352"/>')
            parts.append(f'<rect x="{sx(w0):.2f}" y="{sy(deck+2.1):.2f}" width="{(w1-w0)*depth_scale:.2f}" height="{2.1*depth_scale:.2f}" fill="none" stroke="#738f91" stroke-dasharray="5 4"/><text class="tiny" x="{sx((w0+w1)/2):.2f}" y="{sy(deck+1.1):.2f}" text-anchor="middle">1.00 m working strip</text>')
            access = as_dict(shopfront.get("staffAccess"))
            access_box = local_clear_box(access)
            if access and access_box:
                out0, out1 = access_box[1], access_box[4]
                z0, z1 = deck + access_box[2], deck + access_box[5]
                depth0, depth1 = sorted((front_depth + face_out_sign(face) * out0, front_depth + face_out_sign(face) * out1))
                parts.append(f'<rect x="{sx(depth0):.2f}" y="{sy(z1):.2f}" width="{(depth1-depth0)*depth_scale:.2f}" height="{(z1-z0)*depth_scale:.2f}" fill="none" stroke="#52676a" stroke-width="2" stroke-dasharray="5 3"/>')
                parts.append(f'<text class="tiny" x="{(sx(depth0)+sx(depth1))/2:.2f}" y="{sy(z1)-6:.2f}" text-anchor="middle">{esc(str(access.get("type", "staff access")))} projected · clear {fmt(access.get("clearWidthM"))} m · see plan</text>')
    depth_dim_y = sy(min_floor) + 30
    parts.append(f'<line x1="{sx(depth_start):.2f}" y1="{depth_dim_y:.2f}" x2="{sx(depth_end):.2f}" y2="{depth_dim_y:.2f}" stroke="#899294"/><text class="label" x="{(sx(depth_start)+sx(depth_end))/2:.2f}" y="{depth_dim_y+17:.2f}" text-anchor="middle">enclosure depth {fmt(depth_end-depth_start)} m</text>')
    if entrance:
        parts.append(f'<text class="label" x="{section_x+20}" y="{graph_y+78}">section opening {fmt(entrance.get("widthM"))} W × {fmt(entrance.get("heightM"))} H × {fmt(entrance.get("depthM"))} recess</text>')
        parts.append(f'<text class="tiny" x="{section_x+20}" y="{graph_y+96}">opening support/return depth {fmt(entrance.get("depthM"))} m · closure: {esc(short(entrance.get("closure", "closed joinery"), 46))}</text>')
    if building.get('designRevision'):
        parts.append(f'<text class="tiny" x="{section_x}" y="232">Upper recesses show projected sill/head envelopes; exact curved profiles follow the instance opening schedule.</text>')
        # Draw upper recesses at the actual section axis as well as the ground entry.
        for opening in opening_by_id.values():
            if opening['storey'] == 0 or abs(opening['alongM']-cut_axis) > opening['widthM']/2: continue
            end_depth=front_depth+inside_sign*opening['depthM'];left,right=sorted([front_depth,end_depth])
            parts.append(f'<rect x="{sx(left):.2f}" y="{sy(opening["headM"]):.2f}" width="{(right-left)*depth_scale:.2f}" height="{opening["heightM"]*depth_scale:.2f}" fill="#d0c7b4" stroke="#8f5548" stroke-width="2"/>')
        for feature in main_area.get('facadeFeatures',[]):
            if feature['receiverParcel'] not in {p['id'] for p in parcels} or abs(feature['alongM']-cut_axis)>feature['widthM']/2:continue
            left,right=sorted(front_depth+face_out_sign(face)*v for v in feature['outM'])
            if feature['kind']=='supported-shallow-balcony':
                def balcony_rect(out,z):
                    l,r=sorted(front_depth+face_out_sign(face)*v for v in out)
                    parts.append(f'<rect x="{sx(l):.2f}" y="{sy(z[1]):.2f}" width="{(r-l)*depth_scale:.2f}" height="{(z[1]-z[0])*depth_scale:.2f}" fill="#99968e" stroke="#475255"/>')
                deck,joists,brace,rail=(feature[k] for k in ('deck','joists','braces','balustrade'))
                balcony_rect(deck['outM'],[deck['bottomZM'],deck['topZM']])
                balcony_rect(joists['outM'],joists['zM'])
                points=[(front_depth+face_out_sign(face)*v[0],v[1]) for v in brace['centerlineOutZ']]
                parts.append(f'<path d="M {sx(points[0][0]):.2f} {sy(points[0][1]):.2f} L {sx(points[1][0]):.2f} {sy(points[1][1]):.2f}" stroke="#6e706a" stroke-width="{brace["sectionM"]*depth_scale:.2f}"/>')
                r=rail['railSectionM'];o=rail['frontOutM'];post=rail['postSectionM']
                balcony_rect([o-post/2,o+post/2],rail['zM'])
                for z in (rail['zM'][0],rail['zM'][1]-r):balcony_rect(rail['sideOutM'],[z,z+r])
                parts.append(f'<text class="tiny" x="{section_x}" y="255">Balcony joists and braces projected from their scheduled along axes.</text>')
            elif feature['kind']=='screened-balcony':
                for low,high in [(3.26,3.40),(6.05,6.20)]:
                    parts.append(f'<rect x="{sx(left):.2f}" y="{sy(high):.2f}" width="{(right-left)*depth_scale:.2f}" height="{(high-low)*depth_scale:.2f}" fill="#8f887b" stroke="#475255"/>')
                outside=front_depth+face_out_sign(face)*.75
                parts.append(f'<path d="M {sx(outside):.2f} {sy(3.40):.2f} V {sy(6.05):.2f} M {sx(outside):.2f} {sy(4.45):.2f} H {sx(front_depth):.2f}" stroke="#67594b" stroke-width="4" fill="none"/>')
            else:
                low,high=feature['zM'];parts.append(f'<rect x="{sx(left):.2f}" y="{sy(high):.2f}" width="{(right-left)*depth_scale:.2f}" height="{(high-low)*depth_scale:.2f}" fill="#a99b84" stroke="#475255"/>')
    parts += [
        f'<text id="structural-grid" class="tiny" x="{elevation_x}" y="1242">Bay edges: {esc(", ".join(fmt(edge) for edge in edges))}</text>',
        f'<text class="tiny" x="{section_x}" y="210">Roof: {esc(short(as_dict(building.get("roofComposition")).get("form", "not supplied"), 92))}</text>',
    ]
    return svg_footer(parts)


def building_plan_svg(issue, building, areas):
    polys=building.get('footprintPolygons',[])
    points=[p for poly in polys for p in poly]
    xmin,ymin=min(p[0] for p in points),min(p[1] for p in points)
    xmax,ymax=max(p[0] for p in points),max(p[1] for p in points)
    pad=1.5;scale=min(850/(xmax-xmin+pad*2),690/(ymax-ymin+pad*2))
    x=lambda n:90+(n-xmin+pad)*scale
    y=lambda n:890-(n-ymin+pad)*scale
    parts=svg_header(1600,1100,f"{issue['id']} · {building['id']} · Building plan")
    parts += ['<text class="sub" x="48" y="76">NORTH UP · complete connected footprint · room-use bays coordinate openings; hidden partitions are not scenery</text><rect class="panel" x="48" y="105" width="1010" height="910" rx="8"/>']
    rects=[(min(p[0] for p in poly),min(p[1] for p in poly),max(p[0] for p in poly),max(p[1] for p in poly)) for poly in polys]
    for r in rects:parts.append(f'<rect x="{x(r[0]):.2f}" y="{y(r[3]):.2f}" width="{(r[2]-r[0])*scale:.2f}" height="{(r[3]-r[1])*scale:.2f}" fill="#e6e0d1"/>')
    xs=sorted({n for r in rects for n in (r[0],r[2])});ys=sorted({n for r in rects for n in (r[1],r[3])})
    occupied={(i,j) for i in range(len(xs)-1) for j in range(len(ys)-1) if any(r[0]<(xs[i]+xs[i+1])/2<r[2] and r[1]<(ys[j]+ys[j+1])/2<r[3] for r in rects)}
    for i,j in sorted(occupied):
        for neighbor,a,b in [((i-1,j),(xs[i],ys[j]),(xs[i],ys[j+1])),((i+1,j),(xs[i+1],ys[j]),(xs[i+1],ys[j+1])),((i,j-1),(xs[i],ys[j]),(xs[i+1],ys[j])),((i,j+1),(xs[i],ys[j+1]),(xs[i+1],ys[j+1]))]:
            if neighbor not in occupied:parts.append(f'<line x1="{x(a[0]):.2f}" y1="{y(a[1]):.2f}" x2="{x(b[0]):.2f}" y2="{y(b[1]):.2f}" stroke="#344548" stroke-width="2"/>')
    main=building['mainFacade'];main_ids=set(main['parcelIds']);rooms=[r for r in building.get('rooms',[]) if r.get('storey')==0 and r.get('referenceParcelId') in main_ids]
    for n,room in enumerate(rooms,1):
        b=bbox(room['boundsXYZ']);parts.append(f'<rect x="{x(b[0]):.2f}" y="{y(b[4]):.2f}" width="{(b[3]-b[0])*scale:.2f}" height="{(b[4]-b[1])*scale:.2f}" fill="none" stroke="#6d8383" stroke-dasharray="6 4"/><text class="parcel" x="{x((b[0]+b[3])/2):.2f}" y="{y((b[1]+b[4])/2):.2f}" text-anchor="middle">R{n}</text>')
    member_ids=set(building['memberParcelIds'])
    entry_points={}
    rear_doors=list(building.get('rearServiceDoors',[]))
    if building.get('rearServiceDoor'): rear_doors.append(building['rearServiceDoor'])
    for rear in rear_doors:
        point=rear['worldCenter'];entry_points[rear['id']]=(point[0],point[1])
        parts.append(f'<circle cx="{x(point[0]):.2f}" cy="{y(point[1]):.2f}" r="5" fill="#a14b3d"/><text class="label" x="{x(point[0])+8:.2f}" y="{y(point[1])-8:.2f}">rear staff entrance</text>')
    for area in areas.values():
        for face in area['faces']:
            for q in face['parcels']:
                if q['id'] not in member_ids: continue
                for o in q['openings']:
                    if o['kind']=='door': entry_points[o['id']]=local_opening_point(face['face'],face['wallPlaneM'],o['alongM'],0)
    for area in areas.values():
        for face in area['faces']:
            for q in face['parcels']:
                if q['id'] not in member_ids:continue
                for opening in q['openings']:
                    if opening.get('storey')!=0:continue
                    along=opening['alongM'];plane=face['wallPlaneM'];face_name=str(face['face']);xx,yy=(along,plane) if face_name in ('north','south') else(plane,along)
                    colour='#a14b3d' if opening['id']==building.get('principalEntranceId') else '#77715f'
                    parts.append(f'<circle cx="{x(xx):.2f}" cy="{y(yy):.2f}" r="4" fill="{colour}"/>')
                    if opening['id']==building.get('principalEntranceId'):parts.append(f'<text class="label" x="{x(xx)+8:.2f}" y="{y(yy)-8:.2f}">principal entrance</text>')
                    access = as_dict(as_dict(opening.get("shopfront")).get("staffAccess"))
                    access_box = local_clear_box(access)
                    if access and access_box:
                        corners = [
                            local_opening_point(face_name, plane, along + access_box[0], access_box[1]),
                            local_opening_point(face_name, plane, along + access_box[3], access_box[1]),
                            local_opening_point(face_name, plane, along + access_box[3], access_box[4]),
                            local_opening_point(face_name, plane, along + access_box[0], access_box[4]),
                        ]
                        mapped = ' '.join(f'{x(px):.2f},{y(py):.2f}' for px, py in corners)
                        parts.append(f'<polygon points="{mapped}" fill="#b7c8c4" fill-opacity=".30" stroke="#52676a" stroke-width="1.6" stroke-dasharray="5 3"/>')
                        route_points = []
                        for point in as_list(access.get("localRoutePoints")):
                            if isinstance(point, list) and len(point) >= 2:
                                route_points.append(local_opening_point(face_name, plane, along + num(point[0]), num(point[1])))
                            elif isinstance(point, dict):
                                route_points.append(local_opening_point(face_name, plane, along + num(point.get("alongM", point.get("along"))), num(point.get("outM", point.get("out")))))
                        if route_points:
                            if access.get('connectedEntranceId') in entry_points:
                                route_points.insert(0,entry_points[access['connectedEntranceId']])
                            mapped_route = ' '.join(f'{x(px):.2f},{y(py):.2f}' for px, py in route_points)
                            parts.append(f'<polyline points="{mapped_route}" fill="none" stroke="#52676a" stroke-width="2" stroke-dasharray="4 3"/>')
                        parts.append(f'<text class="tiny" x="{x(corners[0][0]):.2f}" y="{y(corners[0][1])-6:.2f}">{esc(str(access.get("type", "staff access")))} → {esc(str(access.get("connectedEntranceId", "UNRESOLVED")))}</text>')
        for group in area['activityGroups']:
            if group['receiverParcel'] not in member_ids:continue
            b=bbox(group['bbox']);parts.append(f'<rect x="{x(b[0]):.2f}" y="{y(b[4]):.2f}" width="{(b[3]-b[0])*scale:.2f}" height="{(b[4]-b[1])*scale:.2f}" fill="#b49777" fill-opacity=".35" stroke="#89684a"/>')
    parts += [f'<text class="label" x="95" y="955">World footprint x {fmt(xmin)}..{fmt(xmax)} · y {fmt(ymin)}..{fmt(ymax)} m</text><text class="label" x="95" y="980">N ↑ · red point = principal entrance · brown envelope = fixed trade/dressing group · dashed blue = staff-only clear box/connection</text>',f'<text class="title" x="1100" y="150">{esc(short(building.get("name",building["id"]),28))}</text>']
    for n,room in enumerate(rooms,1):
        text=str(room.get('use','Room bay'));lines=textwrap.wrap(text,width=42)
        for j,line in enumerate(lines[:2]):parts.append(f'<text class="label" x="1100" y="{200+n*44+j*15}">{"R"+str(n)+": " if j==0 else ""}{esc(line)}</text>')
    parts.append('<text class="label" x="1100" y="630">BUILDING ORDER</text>')
    notes=[building.get('use',''),f"{len(building.get('storeys',[]))} storeys; see section for floor datums",building.get('alignmentRule',''),building.get('asymmetryReason','')]
    line_no=0
    for note in notes:
        for line in textwrap.wrap(note,width=47):
            parts.append(f'<text class="tiny" x="1100" y="{660+line_no*18}">{esc(line)}</text>');line_no+=1
    return svg_footer(parts)


def building_catalog(buildings: list[dict[str, Any]]) -> str:
    lines = ["# Building structure catalog", "", "Generated from `design.json`. Structure sheets are untextured measured drawings; source data remains authoritative.", "", "| Building | Use | Storeys | Principal entrance | Grid | Plan | Principal elevation | Transverse section |", "|---|---|---:|---|---|---|---|---|"]
    for building in buildings:
        if str(building.get("kind")) != "building":
            continue
        storeys = [as_dict(item) for item in as_list(building.get("storeys"))]
        grid = " / ".join(fmt(item) for item in as_list(building.get("structuralBayEdgesM")))
        stem = building_stem(building)
        lines.append(f"| `{md(building.get('id', 'UNNAMED'))}` | {md(building.get('use', building.get('name', '—')))} | {len(storeys)} | `{md(building.get('principalEntranceId', '—'))}` | [{grid}](drawings/{stem}.svg#structural-grid) | [plan](drawings/{stem}-plan.svg) | [elevation](drawings/{stem}.svg#principal-elevation) | [section](drawings/{stem}.svg#transverse-section) |")
    revised=[b for b in buildings if b.get('designRevision')]
    if revised:
        lines += ['', '## R5 complete-building intent', '',
                  'Proposed whole-map architecture and craft. [Shared craftsmanship](craftsmanship.md) and the area sheets supply exact profiles, finishes, receivers and installation prerequisites. These are document targets, not implemented game acceptance.', '',
                  '| Building | Character | Composition | Restraint and use |', '|---|---|---|---|']
        for b in revised:
            c=b.get('character',{});intent=b.get('architecturalIntent',{})
            lines.append(f"| `{b['id']}` | {md(c.get('name',b['name']))} | {md(intent.get('composition',c.get('composition','')))} | {md(intent.get('restraint',''))} |")
    lines += ['', '## Floor-specific composition axes', '', 'Ground pier dimensions do not imply an identical window grid on every storey. These axes describe the main facade; each source floor record also lists its coordinated returns.', '', '| Building | Storey | Main facade opening axes (m) | Role |', '|---|---|---|---|']
    for building in buildings:
        for row in building.get('floorAxisSchedule',[]):
            lines.append(f"| `{building['id']}` | {row['storey']} | {', '.join(fmt(v) for v in row['mainFacadeAxesM']) or 'none'} | {row['role']} |")
    for building in buildings:
        if building.get('roomRegistry'):
            lines += ['', f"### Shared rooms: {building['name']}", '', '| Room | Storey | World bounds min / max | Use |', '|---|---|---|---|']
            for room in building['rooms']:
                lines.append(f"| `{room['id']}` | {room['storey']} | {md(room['boundsXYZ']['min'])} / {md(room['boundsXYZ']['max'])} | {md(room['use'])} |")
    return "\n".join(lines)


def bc01_section_svg(issue: dict[str, Any], areas: Iterable[dict[str, Any]]) -> str:
    """Measured BC-01 detail, using the first scheduled graded BC-01 wall as its datum."""
    source: tuple[dict[str, Any], str, dict[str, Any]] | None = None
    for area in areas:
        for face in FACE_ORDER:
            for parcel in face_parcels(area, face):
                if is_bc01(parcel) and as_dict(area.get("floor")).get("kind") == "ramp":
                    source = (area, face, parcel)
                    break
            if source:
                break
        if source:
            break
    if source is None:
        return svg_footer(svg_header(1600, 1050, f"{issue.get('id', 'Bazaar')} · BC-01 standard section"))
    area, face, parcel = source; grid = as_dict(parcel.get("structuralGrid")); run = interval(parcel.get("interval")) or (0.0, 1.0)
    floor = as_dict(area.get("floor")); rect = as_dict(floor.get("rect", area.get("rect")))
    def grade(along: float) -> float:
        axis = str(floor.get("axis")); fixed = (axis == "y" and face in ("north", "south")) or (axis == "x" and face in ("east", "west"))
        coordinate = num(rect.get(axis)) + (num(rect.get("h" if axis == "y" else "w")) if fixed and face in ("north", "east") else 0)
        if not fixed:
            coordinate = along
        origin = num(rect.get(axis)); length = num(rect.get("h" if axis == "y" else "w"), 1)
        return num(floor.get("startElevationM")) + (num(floor.get("endElevationM")) - num(floor.get("startElevationM"))) * ((coordinate-origin)/length)
    wall_top = num(parcel.get("wallTopM")); base_height = num(grid.get("baseBandHeightM"), .60); top_height = num(grid.get("topBandHeightM"), .50)
    width, height = 1800, 1120; parts = svg_header(width, height, f"{issue.get('id', 'Bazaar')} · BC-01 · graded standard section")
    parts += [
        f'<text class="sub" x="48" y="76">SOURCE DATUM: {esc(str(area.get("zone")))} {esc(face.upper())} boundary · actual grade {fmt(grade(run[0]))} → {fmt(grade(run[1]))} m · render-only composition</text>',
        '<rect class="panel" x="48" y="105" width="1040" height="930" rx="8"/><rect class="panel" x="1120" y="105" width="630" height="930" rx="8"/>',
        '<text class="title" x="95" y="158">GRADED BOUNDARY ELEVATION</text><text class="title" x="1165" y="158">PIER / FIELD SECTION</text>',
    ]
    x = lambda value: 135 + (value-run[0]) * min(820/max(run[1]-run[0], 1), 82)
    scale = min(600/max(wall_top-min(grade(run[0]), grade(run[1])), 1), 82)
    y = lambda value: 890 - value*scale
    field = [(run[0], grade(run[0])), (run[1], grade(run[1])), (run[1], wall_top), (run[0], wall_top)]
    parts.append(f'<polygon points="{" ".join(f"{x(a):.2f},{y(z):.2f}" for a,z in field)}" fill="#e8dfcb" stroke="#24353a" stroke-width="2"/>')
    base = [(run[0], grade(run[0])), (run[1], grade(run[1])), (run[1], grade(run[1])+base_height), (run[0], grade(run[0])+base_height)]
    parts.append(f'<polygon points="{" ".join(f"{x(a):.2f},{y(z):.2f}" for a,z in base)}" fill="#cbb99b" stroke="#766345" stroke-width="1.5"/>')
    parts.append(f'<rect x="{x(run[0]):.2f}" y="{y(wall_top):.2f}" width="{x(run[1])-x(run[0]):.2f}" height="{top_height*scale:.2f}" fill="#d9c7aa" stroke="#766345" stroke-width="1.5"/>')
    pier_width = num(grid.get("pierWidthM"), .32)
    for edge in as_list(grid.get("bayEdgesM")):
        along = num(edge)
        if run[0]-.001 <= along <= run[1]+.001:
            left,right=max(run[0],along-pier_width/2),min(run[1],along+pier_width/2)
            pts=f'{x(left):.2f},{y(grade(left)):.2f} {x(left):.2f},{y(wall_top):.2f} {x(right):.2f},{y(wall_top):.2f} {x(right):.2f},{y(grade(right)):.2f}'
            parts.append(f'<polygon points="{pts}" fill="#bcb09a" stroke="#475255" stroke-width="1.5"/>')
    parts += [
        f'<line x1="{x(run[0]):.2f}" y1="{y(grade(run[0])+base_height):.2f}" x2="{x(run[1]):.2f}" y2="{y(grade(run[1])+base_height):.2f}" stroke="#766345" stroke-dasharray="5 3"/>',
        f'<text class="label" x="{(x(run[0])+x(run[1]))/2:.2f}" y="{y(grade((run[0]+run[1])/2)+base_height)-8:.2f}" text-anchor="middle">0.60 m base measured above actual grade</text>',
        f'<text class="label" x="{(x(run[0])+x(run[1]))/2:.2f}" y="{y(wall_top)+18:.2f}" text-anchor="middle">0.50 m upper band</text>',
        f'<text class="tiny" x="{x(run[0]):.2f}" y="{y(grade(run[0])+base_height+1.0):.2f}">Bay edges: {esc(", ".join(fmt(edge) for edge in as_list(grid.get("bayEdgesM"))))}</text>',
    ]
    px, py, profile_scale = 1205, 470, 900
    front, field_back = px, px + num(grid.get("fieldDepthM"), .045)*profile_scale
    parts += [
        f'<rect x="{front:.2f}" y="{py:.2f}" width="{num(grid.get("fieldDepthM"), .045)*profile_scale:.2f}" height="310" fill="#bcb09a" stroke="#475255" stroke-width="2"/>',
        f'<rect x="{field_back:.2f}" y="{py+60:.2f}" width="220" height="190" fill="#e8dfcb" stroke="#475255" stroke-width="1.5"/>',
        f'<line x1="{front:.2f}" y1="{py+355:.2f}" x2="{field_back:.2f}" y2="{py+355:.2f}" stroke="#52676a"/><text class="label" x="{(front+field_back)/2:.2f}" y="{py+378:.2f}" text-anchor="middle">0.045 m recess</text>',
        f'<rect x="{px:.2f}" y="{py+470:.2f}" width="{pier_width*profile_scale:.2f}" height="52" fill="#bcb09a" stroke="#475255" stroke-width="2"/><text class="label" x="{px+pier_width*profile_scale/2:.2f}" y="{py+548:.2f}" text-anchor="middle">0.32 m engaged pier at bay edge</text>',
        '<text class="tiny" x="1165" y="900">Piers remain at the wall plane; only fields step back.</text><text class="tiny" x="1165" y="918">No route, collider, or playable elevation is added.</text>',
    ]
    return svg_footer(parts)


def master_plan_svg(issue, areas, rects, materials, buildings=(), skyline=()):
    areas=list(areas);width,height=1800,1350
    footprints=[(b.get('kind'),poly) for b in buildings for poly in b.get('footprintPolygons',[])]
    points=[pt for _,poly in footprints for pt in poly]
    points += [(r['x'],r['y']) for r in rects.values()]+[(r['x']+r['w'],r['y']+r['h']) for r in rects.values()]
    for shell in skyline:points += [shell['bbox']['min'][:2],shell['bbox']['max'][:2]]
    x0,x1=min(p[0] for p in points),max(p[0] for p in points);y0,y1=min(p[1] for p in points),max(p[1] for p in points)
    scale=min(710/(x1-x0),1040/(y1-y0));px=lambda x:75+(x-x0)*scale;py=lambda y:1190-(y-y0)*scale
    parts=svg_header(width,height,f"{issue.get('id','Bazaar')} · Master plan")
    parts.append('<text class="sub" x="48" y="76">North up · measured playable zones, closed buildings, skyline and retained cover</text><rect class="panel" x="48" y="105" width="760" height="1120" rx="8"/>')
    for shell in skyline:
        lo,hi=shell['bbox']['min'],shell['bbox']['max']
        parts.append(f'<rect x="{px(lo[0]):.2f}" y="{py(hi[1]):.2f}" width="{(hi[0]-lo[0])*scale:.2f}" height="{(hi[1]-lo[1])*scale:.2f}" fill="#e8e5de" stroke="#aca79d" stroke-dasharray="3 2"/>')
    for kind,poly in footprints:
        outline=' '.join(f'{px(x):.2f},{py(y):.2f}' for x,y in poly)
        parts.append(f'<polygon points="{outline}" fill="{"#c8b48f" if kind=="building" else "#d9cbb3"}" stroke="#8b795d" stroke-width=".8"/>')
    for index,area in enumerate(areas):
        r=rects[str(area['zone'])];x,y,w,h=(r[k] for k in ('x','y','w','h'))
        parts.append(f'<rect x="{px(x):.2f}" y="{py(y+h):.2f}" width="{w*scale:.2f}" height="{h*scale:.2f}" fill="#f6f1e6" stroke="#52676a"/>')
        for cover in area.get('retainedGameplay',[]):
            outline=' '.join(f'{px(a):.2f},{py(b):.2f}' for a,b in cover['footprintPolygon'])
            parts.append(f'<polygon points="{outline}" fill="#8a9c94" stroke="#526b60" stroke-width=".6"/>')
        parts.append(f'<text class="label" x="{px(x+w/2):.2f}" y="{py(y+h/2):.2f}" text-anchor="middle">{index+1}</text>')
    parts.append('<text class="label" x="860" y="145">Issue index</text>')
    for index,area in enumerate(areas):
        column,row=divmod(index,13);y=185+row*72;x=860+column*450
        focus=area.get('craftSchedule',{}).get('primary',area.get('primaryFocus',''))
        parts.append(f'<text class="label" x="{x}" y="{y}">{index+1:02d} · {esc(area["zone"])}</text>')
        for i,line in enumerate(textwrap.wrap(focus,42)[:2]):parts.append(f'<text class="tiny" x="{x}" y="{y+17+i*14}">{esc(line)}</text>')
    parts.append('<text class="label" x="740" y="142">N ↑</text><text class="tiny" x="75" y="1254">Cream: playable floor · Ochre: closed building · Gray dashed: skyline · Green: retained cover</text>')
    return svg_footer(parts)


def axon_svg(issue, area, materials):
    parts = svg_header(1600,1100,f"{issue['id']} · {area['zone']} · Roof and enclosure axonometric")
    parts.append('<text class="sub" x="48" y="76">MEASURED MASSING · solid envelopes and roof levels · finish details are in the elevations</text><rect class="panel" x="48" y="105" width="1500" height="930" rx="8"/>')
    parcels=[p for face in FACE_ORDER for p in face_parcels(area,face)]
    if not parcels: return svg_footer(parts)
    def raw(x,y,z): return (x-y*.65, -(x+y)*.27-z)
    vertices=[raw(x,y,z) for p in parcels for x in (p['footprint'][0],p['footprint'][2]) for y in (p['footprint'][1],p['footprint'][3]) for z in (p['floorElevationM'],p['roof']['capTopM'])]
    minx,miny=min(v[0] for v in vertices),min(v[1] for v in vertices)
    maxx,maxy=max(v[0] for v in vertices),max(v[1] for v in vertices)
    scale=min(880/(maxx-minx),720/(maxy-miny))
    def project(x,y,z):
        a,b=raw(x,y,z);return (95+(a-minx)*scale,210+(b-miny)*scale)
    def poly(points,color,opacity=1):
        pts=' '.join(f'{a:.2f},{b:.2f}' for a,b in points)
        parts.append(f'<polygon points="{pts}" fill="{color}" fill-opacity="{opacity}" stroke="#3b4646" stroke-width="1"/>')
    numbered={p['id']:i+1 for i,p in enumerate(parcels)}
    for p in sorted(parcels,key=lambda p:sum(p['footprint']),reverse=True):
        x0,y0,x1,y1=p['footprint'];z=p['roof']['capTopM'];b=p['floorElevationM'];c=material_color(p['materialId'],materials)
        poly([project(x0,y0,b),project(x1,y0,b),project(x1,y0,z),project(x0,y0,z)],c)
        poly([project(x0,y0,b),project(x0,y1,b),project(x0,y1,z),project(x0,y0,z)],c)
        poly([project(x0,y0,z),project(x1,y0,z),project(x1,y1,z),project(x0,y1,z)],'#e5d8bf')
        px,py=project((x0+x1)/2,(y0+y1)/2,z)
        parts.append(f'<text class="parcel" x="{px:.1f}" y="{py:.1f}" text-anchor="middle">P{numbered[p["id"]]}</text>')
    for feature in area.get('facadeFeatures', []):
        lo,hi=feature['bbox']['min'],feature['bbox']['max']
        corners=[project(x,y,z) for z in (lo[2],hi[2]) for x,y in [(lo[0],lo[1]),(hi[0],lo[1]),(hi[0],hi[1]),(lo[0],hi[1])]]
        for i,j in [(0,1),(1,2),(2,3),(3,0),(4,5),(5,6),(6,7),(7,4),(0,4),(1,5),(2,6),(3,7)]:
            a,b=corners[i],corners[j];parts.append(f'<path d="M {a[0]:.2f} {a[1]:.2f} L {b[0]:.2f} {b[1]:.2f}" fill="none" stroke="#416e84" stroke-width="1.6" stroke-dasharray="4 3"/>')
    if area.get('facadeFeatures'):
        parts.append('<text class="label" x="1050" y="600">Blue wireframes: bounded scheduled facade features.</text><text class="tiny" x="1050" y="624">Balcony is open joinery, not a solid box; see its section.</text>')
    parts.append('<text class="label" x="1050" y="170">NUMERIC MASSING KEY</text>')
    for i,p in enumerate(parcels,1):
        parts.append(f'<text class="label" x="1050" y="{195+i*32}">P{i}: {esc(p["id"])}</text><text class="tiny" x="1050" y="{208+i*32}">wall {fmt(p["wallTopM"])} · cap {fmt(p["roof"]["capTopM"])}</text>')
    parts.append('<text class="tiny" x="95" y="995">Footprint overlaps use the shared roof coordination schedule; no duplicate slabs or buried faces.</text>')
    return svg_footer(parts)


def validate_top_level(design: dict[str, Any]) -> None:
    if not isinstance(design.get("issue"), dict): die("input requires object field 'issue'")
    if not isinstance(design.get("areas"), list): die("input requires array field 'areas'")
    if not isinstance(design.get("materials"), dict): die("input requires object field 'materials'")


def b_character_svg(area, materials, *, neutral=False):
    """A measured, readable B-only design plate, using the same source apertures."""
    revision = str(as_dict(area.get('designRevision')).get('id','')).split(' ')[0]
    revision = revision if revision in ('R4','R5','R6') else 'B-05'
    parts=svg_header(2200,1560,(revision)+' | '+('Monochrome courtyard composition' if neutral else 'Courtyard architecture proposal'))
    parts += ['<text class="sub" x="48" y="82">FOR USER DESIGN REVIEW · Dimensions in metres · Existing gameplay and building envelopes retained</text>']
    def elevation(face,px,py,pw,ph,label):
        parcels=face_parcels(area,face);start=min(p['interval'][0] for p in parcels);end=max(p['interval'][1] for p in parcels)
        scale=min((pw-80)/(end-start),(ph-140)/11.0);x=lambda a:px+40+(a-start)*scale;y=lambda z:py+ph-65-z*scale
        parts.append(f'<rect class="panel" x="{px}" y="{py}" width="{pw}" height="{ph}" rx="8"/><text class="title" x="{px+28}" y="{py+42}">{label}</text>')
        for p in parcels:
            lo,hi=p['interval'];top=p['wallTopM'];cap=p['roof']['capTopM'];c='#d5d2c9' if neutral else material_color(p['materialId'],materials)
            parts.append(f'<rect x="{x(lo):.2f}" y="{y(top):.2f}" width="{(hi-lo)*scale:.2f}" height="{top*scale:.2f}" fill="{c}" stroke="#7b715e"/>')
            for region in p.get('materialRegions',[]):
                z0,z1=region['zM'];parts.append(f'<rect x="{x(lo):.2f}" y="{y(z1):.2f}" width="{(hi-lo)*scale:.2f}" height="{(z1-z0)*scale:.2f}" fill="{c if neutral else material_color(region["materialId"],materials)}"/>')
            parts.append(f'<rect x="{x(lo):.2f}" y="{y(cap):.2f}" width="{(hi-lo)*scale:.2f}" height="{(cap-top)*scale:.2f}" fill="#d7c5a4" stroke="#9c8b6e"/>')
            for o in p['openings']:parts.extend(opening_joinery(o,x,y,neutral=neutral))
            parts.append(f'<text class="label" x="{x((lo+hi)/2):.2f}" y="{py+ph-38}" text-anchor="middle">{esc(p["character"]["name"])}</text>')
            parts.append(f'<text class="tiny" x="{x((lo+hi)/2):.2f}" y="{py+ph-20}" text-anchor="middle">{fmt(hi-lo)} m frontage · roof {fmt(cap)} m</text>')
        for f in area['fixtures']:
            if f['receiverFace']!=face:continue
            lo,hi=f['interval'];z=f['ledgerZ'];parts.append(f'<path d="M {x(lo):.2f} {y(z):.2f} H {x(hi):.2f} L {x(hi):.2f} {y(z-.2):.2f} Q {x((lo+hi)/2):.2f} {y(z-.4):.2f} {x(lo):.2f} {y(z-.2):.2f} Z" fill="#e8d8b5" stroke="#77644a"/>')
        for f in area['facadeFeatures']:
            if f['receiverFace']==face:parts.extend(b_feature_elevation(f,x,y,neutral=neutral))
        for group in area['activityGroups']:
            if group['receiverFace']!=face:continue
            bounds=group['bbox'];axis=0 if face in ('north','south') else 1
            center=(bounds['min'][axis]+bounds['max'][axis])/2;deck=bounds['min'][2]
            for item in sorted(group.get('instanceLayout',{}).get('parts',[]), key=lambda p:p['localBox']['min'][1]):
                lo,hi=item['localBox']['min'],item['localBox']['max'];left,right=center+lo[0],center+hi[0];bottom,top=deck+lo[2],deck+hi[2]
                color='#a19b8f' if neutral else item.get('stockColorSrgb',material_color(item['materialId'],materials))
                if item.get('finishDetail')=='B-FINISH-TEXTILE' and item['kind'] in ('bound-hanging-rug','fitted-cloth-cushion'):
                    parts.extend(b_rug_elevation(group['id']+'-'+item['id'],left,right,bottom,top,x,y,neutral=neutral))
                elif any(k in item['kind'] for k in ('pot','bowl','cup','jar','plant')):
                    parts.append(f'<ellipse cx="{x((left+right)/2):.2f}" cy="{y((bottom+top)/2):.2f}" rx="{(right-left)*scale/2:.2f}" ry="{(top-bottom)*scale/2:.2f}" fill="{color}" stroke="#7d6b51" stroke-width=".6"/>')
                else:
                    parts.append(f'<rect x="{x(left):.2f}" y="{y(top):.2f}" width="{(right-left)*scale:.2f}" height="{(top-bottom)*scale:.2f}" fill="{color}" stroke="#7d6b51" stroke-width=".6"/>')
    elevation('north',40,120,1430,710,'01  NORTH | Merchant balcony between workshop and textile store')
    elevation('west',40,860,700,650,'02  WEST | Guest house and tea gallery')
    elevation('east',770,860,700,650,'03  EAST | Receiving store and packer')
    parts.append('<rect class="panel" x="1500" y="120" width="660" height="1390" rx="8"/>')
    def textblock(title,body,y0):
        parts.append(f'<text class="title" x="1530" y="{y0}">{esc(title)}</text>')
        for i,line in enumerate(textwrap.wrap(body, 70)):
            parts.append(f'<text class="sub" x="1530" y="{y0+30+i*22}">{esc(line)}</text>')
    textblock('04  BALCONY | Depth and levels', 'Timber screen and canopy create depth above the clear route. Projected side joinery shows the complete outward envelope.',166)
    # World Z vs outward projection. The diagram shows open space, not a solid balcony box.
    xx=lambda out:1780+out*210;yy=lambda z:820-(z-2.2)*115
    parts.append(f'<rect x="{xx(-.55)}" y="{yy(6.4)}" width="{.55*210}" height="{(6.4-2.2)*115}" fill="#c5b198" stroke="#66594a"/>')
    parts.append(f'<rect x="{xx(-.45)}" y="{yy(5.70)}" width="{.45*210}" height="{2.15*115}" fill="#665c4d"/>')
    for low,high in [(3.26,3.4),(6.05,6.2)]:
        parts.append(f'<rect x="{xx(-.18)}" y="{yy(high)}" width="{.96*210}" height="{(high-low)*115}" fill="#80694e" stroke="#504b41"/>')
    parts.append(f'<path d="M {xx(.75)} {yy(3.4)} V {yy(6.05)} M {xx(0)} {yy(3.12)} L {xx(.45)} {yy(3.26)} M {xx(.75)} {yy(4.45)} H {xx(0)}" stroke="#675441" stroke-width="8" fill="none"/>')
    for z,label in [(6.2,'canopy top 6.20'),(4.45,'screen rail 4.45'),(3.4,'deck top 3.40'),(3.12,'lowest brace 3.12'),(2.2,'clear volume top 2.20')]:
        parts.append(f'<path d="M {xx(.85)} {yy(z)} H 2105" stroke="#aaa18e" stroke-dasharray="4 3"/><text class="label" x="1978" y="{yy(z)-8}">{label}</text>')
    parts.append(f'<text class="label" x="1780" y="{yy(2.2)+30}">out = 0 at wall; canopy projects 0.78 m</text>')
    textblock('05  WHAT LEADS?', ('The retained merchant entrance and balcony form one address. Its matching upper timber-and-glass pair supplies a restrained second register; the quiet central field keeps the balcony prominent.' if revision in ('R4','R5','R6') else 'The merchant entrance and balcony form one address. Patterned joinery is confined to its balustrade. Plain bedroom windows and the quiet upper center support that composition.'),882)
    textblock('06  WHAT SUPPORTS IT?', 'The tea gallery is the secondary shaded space: deep recesses, solid piers and plain slats. Workshops and houses share ordinary timber openings; trade, proportion and depth give them identity.',1070)
    textblock('07  WHAT MAKES IT FINISHED?', ('Readable painted shutters, shaped surrounds, restrained fixed upper glass, stone sills, dark hardware and proper textile edges. One rug hangs on the retained merchant rail; only the scheduled revised openings change.' if revision in ('R4','R5','R6') else 'Readable painted shutters, plaster reveals, stone sills, dark hardware and proper textile edges. One rug hangs on the merchant rail. B-04 openings stay fixed; B-05 adds craft and finish.'),1270)
    if neutral:
        parts.insert(3, '<defs><filter id="monochrome"><feColorMatrix type="saturate" values="0"/></filter></defs><g filter="url(#monochrome)">')
        parts.append('</g>')
    return svg_footer(parts)


def b_finish_svg(area,materials):
    revision = str(as_dict(area.get('designRevision')).get('id','')).split(' ')[0]
    revision = revision if revision in ('R4','R5','R6') else 'B-05'
    finish=area['finishSchedule'];parts=svg_header(2000,1490,(revision)+' | B courtyard finish details')
    parts.append('<text class="sub" x="48" y="80">PROPOSED FINISH · Retained B building layout · Measured details and albedo targets, not an in-game render</text>')
    def panel(x,y,w,h,title):
        parts.append(f'<rect class="panel" x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/><text class="title" x="{x+25}" y="{y+42}">{esc(title)}</text>')
    def words(x,y,value,width=70):
        for i,line in enumerate(textwrap.wrap(value,width)):
            parts.append(f'<text class="sub" x="{x}" y="{y+i*22}">{esc(line)}</text>')
    openings={o['id']:o for f in area['faces'] for p in f['parcels'] for o in p['openings']}
    for px,oid,title,family in [(40,'B_W_HOUSE-L1-B1','01  Plaster and painted shutters','domestic'),(690,'B_N_POTTER-L1-B1','02  Working timber louvers','workshop')]:
        panel(px,120,610,690,title);o=openings[oid];left=o['alongM']-o['widthM']/2
        x=lambda u:px+65+(u-left)*175;y=lambda z:560-(z-o['sillM'])*175
        parts.append(f'<rect x="{px+35}" y="220" width="290" height="370" fill="{o["finishSurroundSrgb"]}"/>')
        parts += b_opening_joinery(o,x,y)
        parts.append(f'<rect x="{x(left-.1):.2f}" y="{y(o["sillM"]):.2f}" width="{(o["widthM"]+.2)*175:.2f}" height="10.5" fill="#c6b798" stroke="#8d7d64"/>')
        labels=['0.012 m eased plaster','0.08 m timber frame','0.008 m panel rebate','Dark iron; no bright straps'] if family=='domestic' else ['Plaster follows the wall','Louvers tilt within frame','0.08 m slat pitch','Stone sill + drip groove']
        for i,label in enumerate(labels):words(px+340,280+i*55,label,28)
        words(px+30,645,'Keep the existing opening size and recess. Finish each physical member; do not replace the window with a flat dark square.',69)
        words(px+30,733,'North trim below 2.2 m remains flush or recessed. No change to the protected clear route.',69)
    panel(1340,120,620,690,'03  Readable material targets')
    for i,key in enumerate(['warmTimber','tealTimber','iron','cloth']):
        m=finish['materials'][key];yy=215+i*90
        swatches = list(m.get('ownerPaletteSrgb', {}).values()) or [m.get('paintSrgb') or m.get('vertexPaintRecipe', {}).get('defaultDesiredSrgb', '#ffffff')]
        for si,color in enumerate(swatches):
            parts.append(f'<rect x="{1375+si*60/len(swatches)}" y="{yy}" width="{60/len(swatches)}" height="54" fill="{color}" stroke="#716958"/>')
        words(1460,yy+20,key+'  '+' / '.join(swatches),47)
        words(1460,yy+45,'roughness '+str(m['roughness'])+'; grain mix '+str(m['grainMix']),47)
    words(1375,625,'Private B material copies retain the licensed scan grain. Paint is mixed with the scan at bounded strength, so the dark source does not erase the paint.',69)
    words(1375,737,'Neutral and shipped-light views must show panel relief and color. No emission or global exposure fix.',69)
    panel(40,845,1260,600,'04  Textiles that read as cloth')
    # Measured rear frame and the revised hanging-rug rectangles.
    g=next(g for g in area['activityGroups'] if g['recipe']=='AG-RUG')
    x=lambda u:270+u*180;y=lambda z:1380-z*180
    for part in g['instanceLayout']['parts']:
        lo,hi=part['localBox']['min'],part['localBox']['max']
        if part['kind']=='timber-member':parts.append(f'<rect x="{x(lo[0]):.2f}" y="{y(hi[2]):.2f}" width="{(hi[0]-lo[0])*180:.2f}" height="{(hi[2]-lo[2])*180:.2f}" fill="#9c8060"/>')
        elif part['kind']=='bound-hanging-rug':
            parts += b_rug_elevation('finish-'+part['id'],lo[0],hi[0],lo[2],hi[2],x,y)
            for u in (lo[0]+.03,hi[0]-.03):parts.append(f'<path d="M {x(u)} {y(hi[2])} V {y(2.4)}" stroke="#73614a" stroke-width="2"/>')
    words(85,920,'Existing display frame; counter omitted for detail.',66)
    words(510,935,'One rug over the merchant rail; the remaining lattice stays visible.',72)
    x=lambda u:620+(u-26.3)*180;y=lambda z:1250-(z-3.4)*180
    screen={'id':'finish-balustrade','alongM':27.65,'widthM':2.54,'sillM':3.5,'headM':4.38,'heightM':.88,'headShape':'rectangular','closure':'screen','openLattice':True,'finishPaintSrgb':'#9c8060'}
    parts += b_opening_joinery(screen,x,y)
    rug=next(f for f in area['facadeFeatures'] if f['kind']=='draped-rug');parts += b_feature_elevation(rug,x,y)
    words(535,1320,'0.008 m cloth; 0.035 m bound edges. Keep the 1.20 m woven repeat, curve the fold onto its receiver and finish the ends. No extra ground clutter.',90)
    panel(1340,845,620,600,'05  Finish within the budget')
    words(1375,940,'B-04 measured: 47,860 triangles.',65)
    words(1375,990,f'{revision} working target: 56,000 triangles. User-authorized ceiling: 64,000. Retain the 23-primitive ceiling and global runtime limits.',65)
    words(1375,1110,'Use the allowance for frame relief, cloth folds, edges and supported joinery. Preserve the corrected lattice holes and outward normals.',65)
    words(1375,1230,'Build and integrate, then one consolidated end review. Check these details close up and in the wide view; use longer alternating performance samples.',65)
    words(1375,1360,'A percent-complete estimate is not finish acceptance.',65)
    return svg_footer(parts)


def roof_context_svg(design: dict[str, Any]) -> str:
    """Compact ownership/interface index, derived from the same roof schedule as JSON."""
    schedule = roofs.build_schedule(design)
    cells, bundles = schedule['roofCells'], schedule['roofBundles']
    x0 = min(c['footprint'][0] for c in cells); y0 = min(c['footprint'][1] for c in cells)
    x1 = max(c['footprint'][2] for c in cells); y1 = max(c['footprint'][3] for c in cells)
    scale = min(1060/(x1-x0), 1210/(y1-y0))
    x = lambda v: 70 + (v-x0)*scale
    y = lambda v: 140 + (y1-v)*scale
    parts = svg_header(1900, 1510, f"{design['issue']['revision']} · Roof ownership and interfaces")
    parts.append('<text class="sub" x="48" y="76">PLAN · north up · exact cell footprints; diagram owner colors · step returns red, same-height seams teal</text>')
    colors = {b['id']: COLORS[i%len(COLORS)] for i,b in enumerate(bundles)}
    codes = {b['id']: f'B{i+1:02}' for i,b in enumerate(bundles)}
    for c in cells:
        left,bottom,right,top = c['footprint']
        title = f"{c['id']} | owner {c['ownerId']} | {c['roofBundleId']} | cap {fmt(c['roofDatum']['capTopM'])} m"
        parts.append(f'<rect x="{x(left):.2f}" y="{y(top):.2f}" width="{(right-left)*scale:.2f}" height="{(top-bottom)*scale:.2f}" fill="{colors[c["roofBundleId"]]}" stroke="#3d4d4b" stroke-width=".65"><title>{esc(title)}</title></rect>')
        if (right-left)*scale > 15 and (top-bottom)*scale > 12:
            parts.append(f'<text x="{x((left+right)/2):.2f}" y="{y((bottom+top)/2):.2f}" font-size="9" text-anchor="middle">{c["id"].rsplit("_",1)[-1]}</text>')
    for key,color in (('stepReturnEdges','#aa4437'),('sharedSameHeightSeams','#147f88')):
        for edge in schedule[key]:
            a,b=edge['startXY'],edge['endXY']
            detail = f"{edge['id']} | {a} to {b} | " + str(edge.get('rule',edge.get('closure','')))
            parts.append(f'<path d="M {x(a[0]):.2f} {y(a[1]):.2f} L {x(b[0]):.2f} {y(b[1]):.2f}" stroke="{color}" stroke-width="2" fill="none"><title>{esc(detail)}</title></path>')
    parts.append(f'<text class="label" x="70" y="1378">N ↑ · absolute plan metres · {len(cells)} cells / {len(bundles)} installation bundles</text>')
    parts.append(f'<path d="M 70 1405 H {70+10*scale:.2f}" stroke="#24353a" stroke-width="3"/><text class="tiny" x="70" y="1427">10 m</text>')
    parts.append('<text class="label" x="1190" y="130">BUNDLE OWNERSHIP / INTERFACE INDEX</text>')
    row_y=165
    for b in bundles:
        label=b['installationOutputUnit'].removeprefix('unit-').replace('-',' ').title()
        parts.append(f'<rect x="1190" y="{row_y-12}" width="14" height="14" fill="{colors[b["id"]]}"/><text class="label" x="1215" y="{row_y}">{codes[b["id"]]} {esc(label)}</text>')
        parts.append(f'<text class="tiny" x="1215" y="{row_y+18}">Cells {esc(", ".join(v.rsplit("_",1)[-1] for v in b["roofCellIds"]))}</text>')
        parts.append(f'<text class="tiny" x="1215" y="{row_y+35}">{len(b.get("ownedStepReturnIds", []))} owned steps · {len(b.get("ownedSameHeightSeamIds", []))} owned seams · {len(b.get("interfaceIds", []))} interfaces</text>')
        row_y+=60
    parts.append(f'<text class="tiny" x="1190" y="{row_y+10}">{len(schedule["stepReturnEdges"])} step edges / {len(schedule["sharedSameHeightSeams"])} same-height seams.</text>')
    parts.append('<text class="tiny" x="1190" y="'+str(row_y+30)+'">Exact cell owners, coordinates and return levels: roof-coordination.json.</text>')
    parts.append('<text class="tiny" x="48" y="1480">Diagram only. Bundle installation ownership does not authorize constructing another area. No new roof geometry or playable elevation.</text>')
    return svg_footer(parts)


def skyline_context_svg(design: dict[str, Any]) -> str:
    """Four compass envelope projections, not camera visibility or finished facade claims."""
    targets = design['skyline']
    width,height = 1900,1570
    parts = svg_header(width,height,f"{design['issue']['revision']} · Skyline compass context")
    parts.append('<text class="sub" x="48" y="76">MEASURED BACKGROUND ENVELOPES · four compass projections · all targets shown; depth occlusion intentionally disabled</text>')
    for index,(label,axis,reverse) in enumerate((('Looking north · west left / east right',0,False),('Looking east · north left / south right',1,True),('Looking south · east left / west right',0,True),('Looking west · south left / north right',1,False))):
        px,py=48+(index%2)*925,115+(index//2)*410;pw,ph=875,370
        lower=min(t['bbox']['min'][axis] for t in targets);upper=max(t['bbox']['max'][axis] for t in targets)
        top=max(t['bbox']['max'][2] for t in targets);scale=min((pw-90)/(upper-lower),(ph-120)/top)
        x=lambda v: px+45+((upper-v) if reverse else (v-lower))*scale
        y=lambda v: py+ph-65-v*scale
        parts.append(f'<rect class="panel" x="{px}" y="{py}" width="{pw}" height="{ph}"/><text class="label" x="{px+20}" y="{py+30}">{label}</text>')
        placed_labels = []
        for ti,t in enumerate(targets):
            lo,hi=t['bbox']['min'],t['bbox']['max'];left,right=sorted([x(lo[axis]),x(hi[axis])])
            parts.append(f'<rect x="{left:.2f}" y="{y(hi[2]):.2f}" width="{right-left:.2f}" height="{(hi[2]-lo[2])*scale:.2f}" fill="{COLORS[ti%len(COLORS)]}" fill-opacity=".18" stroke="#596e70" stroke-width="1.1"><title>{esc(t["id"])} {esc(t["purpose"])}</title></rect>')
            label_x=(left+right)/2; label_y=y(hi[2])-7
            while any(abs(label_x-lx)<48 and abs(label_y-ly)<15 for lx,ly in placed_labels): label_y-=16
            placed_labels.append((label_x,label_y))
            parts.append(f'<path d="M {label_x:.2f} {y(hi[2]):.2f} V {label_y+3:.2f}" stroke="#788a89" stroke-width=".6"/><text x="{label_x:.2f}" y="{label_y:.2f}" text-anchor="middle" font-size="11">{t["id"]}</text>')
        parts.append(f'<text class="tiny" x="{px+25}" y="{py+ph-20}">Plan {"x" if axis==0 else "y"}: {fmt(lower)}..{fmt(upper)} m · z 0..{fmt(top)} m · equal axis scale</text>')
    parts.append('<text class="label" x="48" y="980">ALL SKYLINE TARGETS · shared-environment owner · coordinates are absolute design metres</text>')
    for i,t in enumerate(targets):
        px=48+(i%3)*615;py=1015+(i//3)*100
        lo,hi=t['bbox']['min'],t['bbox']['max']
        parts.append(f'<text class="label" x="{px}" y="{py}">{t["id"]} · {esc(t.get("recipe", "background"))} · {esc(t["zone"].replace("_"," ").title())}</text>')
        parts.append(f'<text class="tiny" x="{px}" y="{py+20}">x {fmt(lo[0])}..{fmt(hi[0])} · y {fmt(lo[1])}..{fmt(hi[1])} · z {fmt(lo[2])}..{fmt(hi[2])}</text>')
        for j,line in enumerate(textwrap.wrap(t['purpose'],78)):
            parts.append(f'<text font-size="11" x="{px}" y="{py+40+j*14}">{esc(line)}</text>')
    parts.append('<text class="tiny" x="48" y="1540">Envelope context only. This sheet does not certify player-view visibility, construction detail, materials or installed assets.</text>')
    return svg_footer(parts)


def render_drawings(design: dict[str, Any], coverage_doc: dict[str, Any], output: Path) -> list[Path]:
    validate_top_level(design)
    issue, materials = as_dict(design["issue"]), as_dict(design["materials"])
    issue = {**issue, 'id': str(issue['id'])+' / '+str(issue.get('revision','')), "skyline": as_list(design.get("skyline")), "legacyDispositions": as_list(design.get("legacyDispositions")), "landmarks": as_list(design.get("landmarks")), "buildings": as_list(design.get("buildings"))}
    areas = [as_dict(value) for value in as_list(design["areas"]) if as_dict(value).get("zone")]
    by_zone = {str(area["zone"]): area for area in areas}
    buildings = [as_dict(value) for value in as_list(design.get("buildings"))]
    coverage = coverage_index(coverage_doc); rects = zone_rects(coverage_doc)
    output.mkdir(parents=True, exist_ok=True)
    drawings = output / "drawings"; drawings.mkdir(exist_ok=True)
    written: list[Path] = []
    for filename, title, zone_ids in SHEETS:
        selected = [by_zone[zone] for zone in zone_ids if zone in by_zone]
        if not selected:
            print(f"warning: no supplied target areas for {filename}; not written", file=sys.stderr)
            continue
        destination = output / filename
        sheet_issue = {**issue, 'id': 'BZ-04 / '+selected[0]['designRevision']['id'], 'status': selected[0]['designRevision']['status']} if len(selected)==1 and selected[0].get('designRevision') else issue
        write_text(destination, markdown_sheet(sheet_issue, title, selected, coverage, materials)); written.append(destination)
    for area in areas:
        rect = rects.get(str(area["zone"]))
        if not rect:
            print(f"warning: {area['zone']} has no coverage rect; drawing omitted", file=sys.stderr)
            continue
        stem = str(area['zone']).lower()
        plan = drawings / f"{stem}-plan.svg"
        elevations = drawings / f"{stem}-elevations.svg"
        axon = drawings / f"{stem}-axon.svg"
        area_issue = {**issue, 'id': 'BZ-04 / '+area['designRevision']['id']} if area.get('designRevision') else issue
        write_text(plan, plan_svg(area_issue, area, rect, coverage, materials)); written.append(plan)
        write_text(elevations, elevation_svg(area_issue, area, coverage, materials)); written.append(elevations)
        for face in FACE_ORDER:
            single = drawings / f"{stem}-elevation-{face}.svg"
            write_text(single, elevation_svg(area_issue, area, coverage, materials, (face,))); written.append(single)
        write_text(axon, axon_svg(area_issue, area, materials)); written.append(axon)
        if area['zone']=='SPAWN_B_COURTYARD' and area.get('designRevision'):
            character = drawings / f'{stem}-character.svg'
            write_text(character, b_character_svg(area, materials)); written.append(character)
            composition = drawings / f'{stem}-composition.svg'
            write_text(composition, b_character_svg(area, materials, neutral=True)); written.append(composition)
        if area.get('finishSchedule'):
            finish_sheet=output/'unit-spawn-b-courtyard-finish.md'
            write_text(finish_sheet,b_finish_notes(area));written.append(finish_sheet)
            finish_drawing=drawings/f'{stem}-finish.svg'
            write_text(finish_drawing,b_finish_svg(area,materials));written.append(finish_drawing)
    master = drawings / "master-plan.svg"; write_text(master, master_plan_svg(issue, areas, rects, materials, buildings, design.get("skyline",[]))); written.append(master)
    for name, drawing in (("roof-ownership-context.svg", roof_context_svg(design)), ("skyline-compass-context.svg", skyline_context_svg(design))):
        target = drawings / name; write_text(target, drawing); written.append(target)
    bc01 = drawings / "bc-01-section.svg"; write_text(bc01, bc01_section_svg(issue, areas)); written.append(bc01)
    for building in buildings:
        if str(building.get("kind")) != "building":
            continue
        destination = drawings / f"{building_stem(building)}.svg"
        building_issue = {**issue, 'id': 'BZ-04 / '+building['designRevision']['id']} if building.get('designRevision') else issue
        write_text(destination, building_structure_svg(building_issue, building, by_zone)); written.append(destination)
        plan = drawings / f"{building_stem(building)}-plan.svg"; write_text(plan, building_plan_svg(building_issue, building, by_zone)); written.append(plan)
    catalog = output / "building-catalog.md"; write_text(catalog, building_catalog(buildings)); written.append(catalog)
    return written


def skyline(design: dict) -> str:
    targets = design["skyline"]
    removals = [x for x in design["legacyDispositions"] if x["disposition"] == "remove"]
    rows = ["# Skyline and backlot schedule", "", "Generated from `design.json`.", "", "## New skyline targets", "", "| ID | Zone | Owner | Bounds min → max | Recipe |", "|---|---|---|---|---|"]
    rows += [f"| `{x['id']}` | `{x['zone']}` | `{x['owner']}` | {x['bbox']['min']} → {x['bbox']['max']} | `{x.get('recipe', '—')}` |" for x in targets]
    background = [x for x in removals if str(x['id']).startswith('BACKGROUND_SHELL')]
    other = [x for x in removals if x not in background]
    rows += ["", "## Legacy visual removals", "", f"{len(background)} `BACKGROUND_SHELL*` removals and {len(other)} other legacy removals are scheduled; replacements must not overlay them.", "", "| ID | Zone | Existing producer | Replacement |", "|---|---|---|---|"]
    rows += [f"| `{x['id']}` | `{x['zone']}` | {x['existingProducer']} | {x['replacement']} |" for x in removals]
    ground = design["backlotGround"]
    rows += ["", "## Backlot ground", "", f"`{ground['recipe']}` owner `{ground['owner']}`, z={ground['zM']}, material `{ground['materialId']}`. Bounds {ground['bounds']}. {ground['exclude']}", ""]
    return "\n".join(rows)

def runtime_materials(design: dict) -> str:
    contract = design['materialRuntimeContract']
    lines = ['# Runtime material and draw allocation schedule', '',
             'Generated from design.json. These are implementation targets, not measurements of the current game.', '',
             '## Pack aliases', '',
             '| Alias | Source | Authored role | Exact shader overrides |', '|---|---|---|---|']
    for alias, entry in contract['wallAliasMap'].items():
        lines.append(f"| `{alias}` | `{entry['sourceMaterialId']}` | {entry.get('surfaceKind','detail')} | {md(entry['override'])} |")
    lines += ['', '## Floor aliases', '', '| Alias | Source / insert after | Macro color / roughness / frequency |', '|---|---|---|']
    for alias, entry in contract['floorAliasMap'].items():
        macro = entry['macro']
        lines.append(f"| `{alias}` | `{entry['sourceMaterialId']}` | {fmt(macro['colorAmplitude'])} / {fmt(macro['roughnessAmplitude'])} / {fmt(macro['frequency'])} |")
    lines += ['', '## Embedded original materials', '', 'These named bindings stay embedded; they do not receive the generic pack shader.', '',
              '```json', json.dumps(contract['embeddedDetailBindings'], indent=2), '```', '',
              '## Global allocation', '', '```json', json.dumps(design['performanceAllocation'], indent=2), '```', '',
              'The area sheets list exact material/shadow classes and primitive ceilings. Implement the named batching and shadow behavior in integration.md, then measure actual game performance.', '']
    craft_materials = design.get('craftStandards', {}).get('materials', {})
    if contract.get('derivedMaterialRecipes'):
        lines += ['## Selected source-to-export recipes', '',
                  'Desired appearance is a diagram/albedo target, not a second shader tint. Apply each paint formula once. Keep raw sources unchanged; new derived exports retain their own names and embedded albedo.', '',
                  '| Selected material | Desired sRGB | Normal strength | Roughness / interpretation | Source / bake / export recipe |', '|---|---|---|---|---|']
        for mid, entry in design['materials'].items():
            recipe = entry.get('baseColorRecipe')
            if not recipe: continue
            lines.append(f"| `{mid}` | `{entry.get('targetAppearanceSrgb', recipe.get('desiredAppearanceSrgb', ''))}` | {md(entry.get('normalScale', 'source'))} | {md(entry.get('roughness', 'source'))}; {md(entry.get('roughnessMode', 'See recipe'))} | {md(recipe)} |")
        lines += ['', '## Source, selected material and shadow binding', '',
                  '| Family | Source material | Selected material | Export name | Shadow class |', '|---|---|---|---|---|']
        for row in craft_materials.get('sourceToExportAndShadow', []):
            lines.append('| '+' | '.join(md(row.get(key,'')) for key in ('family','sourceMaterialId','targetMaterialId','exportName','shadowClass'))+' |')
        for key,title in (('monolithicStoneTrim','Monolithic trim crop and mirror recipe'),('fineLinen','Fine linen source and physical scale')):
            if key in craft_materials:
                lines += ['', '## '+title, '', '```json', json.dumps(craft_materials[key],indent=2), '```', '']
        lines += ['', '## Derived export binding rule', '', md(contract.get('derivedExportBindingRule','')), '',
                  '## Assignment coverage', '', '```json',json.dumps(contract.get('r6AssignmentCoverage',{}),indent=2),'```','']
    return '\n'.join(lines)

def roof_bundles(design):
    schedule=roofs.build_schedule(design)
    lines=['# Roof installation bundles', '', 'Generated from the controlled source and roof-coordination.json. Each cell belongs to exactly one bundle. The installation unit is its authoring owner, not an instruction to build that owner’s whole area.', '',
           'An area constructs or reuses only its named bundles and interfaces. Stable placement IDs prevent duplication. Inspect bounds and receivers before retiring old render components. Sections do not contain a second copy of the roof.', '']
    for bundle in schedule['roofBundles']:
        lines += [f"## {bundle['id']}", '', f"Installation owner: `{bundle['installationOutputUnit']}`. Planned model `{bundle['modelId']}` / `{bundle['plannedModelFile']}` from `{bundle['plannedBuilderTarget']}`.", '',
                  f"Cells: {', '.join('`'+value+'`' for value in bundle['roofCellIds'])}.",
                  f"Placement: `{md(bundle['baseCentrePlacement'])}`.",
                  f"World bounds: `{md(bundle['worldBoundsDesign'])}`.",
                  f"glTF local bounds: `{md(bundle['localBoundsGltfYUp'])}`.",
                  f"Owned step returns: {', '.join(bundle['ownedStepReturnIds']) or 'none'}. Owned same-height seams: {', '.join(bundle['ownedSameHeightSeamIds']) or 'none'}.", '',
                  '| Source parcel | Slab | Finish | Parapet | Cap | Collector |', '|---|---|---|---|---|---|']
        for pid,mats in bundle['componentMaterialsBySource'].items():
            lines.append('| `'+pid+'` | '+' | '.join('`'+mats.get(k,'not present')+'`' for k in ['slab','finish','parapet','cap','collector'])+' |')
        lines += ['', f"Planning ceiling: `{md(bundle['declaredAllocation'])}`.", '', bundle['retirementScope']['requiredWork'], '', bundle['retirementScope']['verification'], '']
    lines += ['## Static rendering allocation', '', '```json',json.dumps(design['roofRenderingContract'],indent=2),'```','']
    return '\n'.join(lines)

def render(design: dict, coverage: dict, output: Path) -> list[Path]:
    assert_drawing_frames()
    written = render_drawings(design, coverage, output)
    schedule = output / "skyline.md"; schedule.write_text(skyline(design), encoding="utf-8")
    materials = output / 'runtime-materials.md'; write_text(materials, runtime_materials(design))
    bundles=output/'roof-bundles.md';write_text(bundles,roof_bundles(design))
    craft=output/'craftsmanship.md';write_text(craft,craftsmanship_notes(design))
    atlas=output/'drawings/architecture-review.svg';write_text(atlas,architecture_atlas_svg(design,coverage))
    return [*written, schedule, materials,bundles,craft,atlas]

def main() -> int:
    check = argparse.ArgumentParser(); check.add_argument("--check", action="store_true"); args = check.parse_args()
    design, coverage = json.loads((HERE / "design.json").read_text()), json.loads((HERE / "coverage.json").read_text())
    if not args.check:
        print(f"wrote {len(render(design, coverage, HERE))} generated documents"); return 0
    with tempfile.TemporaryDirectory() as raw:
        temp = Path(raw); files = render(design, coverage, temp); bad = [str(p.relative_to(temp)) for p in files if not (HERE / p.relative_to(temp)).is_file() or not filecmp.cmp(p, HERE / p.relative_to(temp), shallow=False)]
    if bad: raise SystemExit("generated documents differ: " + ", ".join(bad))
    return 0

if __name__ == "__main__": raise SystemExit(main())
