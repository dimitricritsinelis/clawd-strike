"""Anatomical joint angles -> pose-bone quaternions for the LEFT support hand (L_Armature).

    import hand_pose
    quats = hand_pose.digit_quaternions(L_Armature_object, {
        "index":  {"mcp": 40, "mcp_abduct": -5, "pip": 60, "dip": 30},
        "thumb":  {"cmc_flex": 10, "cmc_abduct": 30, "cmc_rot": 20, "mcp": 20, "ip": 15},
    })
    for name, q in quats.items():
        L.pose.bones[name].rotation_quaternion = q

Conventions (degrees; see hand_pose.md for the calibration evidence):
  * Hand frame = SupportHand bind frame: +Y wrist -> fingers, thumb on -X, pinky on +X, palm faces ~+Z
    (PALM_NORMAL, measured from the glove mesh).
  * Every flexion angle is positive toward the palm (thumb MCP/IP: toward the thumb pad) and 0 = anatomically
    straight, NOT the bind pose.  Finger MCP 0 = proximal phalanx in the palm plane; PIP/DIP/thumb MCP/IP 0 =
    collinear with the parent segment.
  * Finger mcp_abduct: 0 = parallel to the middle-finger ray (fingers together); positive = spread away from the
    middle finger (index: toward the thumb, ring/pinky: toward the ulnar edge, middle: toward the index).
  * Thumb CMC: cmc_flex = sweep in the palm plane about the palm normal, + = across the palm toward the pinky,
    0 = the bind in-plane direction (metacarpal ~28 deg radial of the index ray); cmc_abduct = palmar abduction,
    + = metacarpal lifts out of the palm plane toward the palm side, 0 = in the palm plane; cmc_rot = axial rotation
    about the metacarpal, + = pronation (nail turns from facing radially toward facing palmar, pad turns to face
    the fingers), 0 = bind roll.
  * Finger MCP is a Cardan joint (abduct about the palm normal, then flex about the moved lateral axis), so it has
    no axial twist; PIP/DIP and thumb MCP/IP are pure hinges.
  * Missing entries keep the bone's bind orientation: an absent digit or single-DOF joint returns the identity
    quaternion (= bind); an absent DOF of a multi-DOF joint (finger MCP, thumb CMC) keeps its bind value.
Only bpy/mathutils are needed; nothing here touches bone translation.
"""
import math

from mathutils import Matrix, Quaternion, Vector

HAND = 'SupportHand'
FINGERS = ('index', 'middle', 'ring', 'pinky')

# Measured in SupportHand bind space (calibration: GRIP/calib/measure.py).
# Smallest-variance axis of the glove's SupportHand-weighted vertices, signed toward the suede palm overlay.
PALM_NORMAL = Vector((-0.0539, 0.0705, 0.9960)).normalized()
# Finger PIP/DIP hinge in each bone's local frame: +X (rotation about +X moves the tip toward the palm/pad).
FINGER_HINGE = Vector((1.0, 0.0, 0.0))
# Thumb MCP/IP hinge in the thumb bone's local frame, perpendicular to the thumb pad (suede overlay on
# L_thumb.02/.03 faces local (0.948, 0, 0.320)); + rotation curls the tip toward the pad.  Local +X alone would
# bend the thumb sideways out of the palm plane.
THUMB_HINGE = Vector((0.3200, 0.0, -0.9476)).normalized()

JOINT_LIMITS = {
    'finger': {'mcp': (-10, 90), 'mcp_abduct': (-20, 20), 'pip': (0, 105), 'dip': (0, 80)},
    'thumb': {'cmc_flex': (-20, 45), 'cmc_abduct': (0, 60), 'cmc_rot': (-15, 45), 'mcp': (0, 60), 'ip': (-15, 80)},
}
TWIST_LIMIT_DEG = 5.0


def _rot(axis, deg):
    return Matrix.Rotation(math.radians(deg), 3, axis.normalized())


def _swing(a, b):
    """Minimal rotation taking unit vector a onto unit vector b."""
    return a.rotation_difference(b).to_matrix()


def _signed(a, b, axis):
    """Signed angle (deg) from a to b about axis, after projecting both perpendicular to axis."""
    axis = axis.normalized()
    pa = (a - axis * a.dot(axis)).normalized()
    pb = (b - axis * b.dot(axis)).normalized()
    return math.degrees(math.atan2(axis.dot(pa.cross(pb)), pa.dot(pb)))


def _plane(v, n):
    return (v - n * v.dot(n)).normalized()


class _Calib:
    """Bind-pose frames derived from the armature (cached per armature data block)."""

    def __init__(self, arm):
        bones = arm.bones
        H = bones[HAND].matrix_local.to_3x3()
        Hinv = H.inverted()
        n = PALM_NORMAL
        self.n = n
        mid_ray = Hinv @ (bones['L_f_middle.01'].head_local - bones[HAND].head_local)
        self.s0 = _plane(mid_ray, n)                     # zero-abduction, zero-flexion finger direction
        self.rel = {}                                    # bind orientation of each bone in its parent's frame
        for b in bones:
            if b.name.startswith(('L_f_', 'L_thumb.')):
                self.rel[b.name] = (b.parent.matrix_local.to_3x3().inverted() @ b.matrix_local.to_3x3())
        # finger MCP: Cardan decomposition of the bind orientation
        self.mcp = {}
        for f in FINGERS:
            R = self.rel[f'L_f_{f}.01']
            d = R.col[1].normalized()
            d1 = _plane(d, n)
            sign = -1.0 if f in ('ring', 'pinky') else 1.0   # + rotation about n moves tip radially (-X)
            abd = sign * _signed(self.s0, d1, n)
            lat = d1.cross(n).normalized()
            flex = _signed(d1, d, lat)
            A0 = _rot(n, -sign * abd) @ _rot(lat, -flex) @ R
            self.mcp[f] = {'A0': A0, 'sign': sign, 'abd': abd, 'flex': flex}
        # hinges (PIP, DIP, thumb MCP, thumb IP)
        self.hinge = {}
        for name, R in self.rel.items():
            if name.endswith('.01'):
                continue
            h = THUMB_HINGE if name.startswith('L_thumb') else FINGER_HINGE
            y_parent_in_child = R.inverted() @ Vector((0, 1, 0))
            flex = -_signed(Vector((0, 1, 0)), y_parent_in_child, h)   # child relative to parent about h
            B = R @ _rot(h, -flex)                                      # hinge bend removed
            side = math.degrees(B.col[1].angle(Vector((0, 1, 0))))
            A0 = _swing(B.col[1].normalized(), Vector((0, 1, 0))) @ B   # residual side-bend removed
            self.hinge[name] = {'A0': A0, 'h': h, 'flex': flex, 'side_bend': side}
        # thumb CMC
        R = self.rel['L_thumb.01']
        d = R.col[1].normalized()
        d0 = _plane(d, n)
        a0 = d0.cross(n).normalized()
        abd = _signed(d0, d, a0)
        self.cmc = {'A0': _rot(a0, -abd) @ R, 'd0': d0, 'abd': abd,
                    'yaw_from_index_ray': _signed(_plane(Hinv @ (bones['L_f_index.01'].head_local - bones[HAND].head_local), n), d0, n),
                    'yaw_from_hand_y': _signed(_plane(Vector((0, 1, 0)), n), d0, n)}   # + = radial

    def rest_angles(self):
        out = {}
        for f in FINGERS:
            m = self.mcp[f]
            out[f] = {'mcp': m['flex'], 'mcp_abduct': m['abd'], 'pip': self.hinge[f'L_f_{f}.02']['flex'],
                      'dip': self.hinge[f'L_f_{f}.03']['flex']}
        out['thumb'] = {'cmc_flex': 0.0, 'cmc_abduct': self.cmc['abd'], 'cmc_rot': 0.0,
                        'mcp': self.hinge['L_thumb.02']['flex'], 'ip': self.hinge['L_thumb.03']['flex']}
        return out


_CACHE = {}


def _calib(rig):
    arm = rig.data if hasattr(rig, 'data') else rig
    key = arm.name_full if hasattr(arm, 'name_full') else id(arm)
    if key not in _CACHE:
        _CACHE[key] = _Calib(arm)
    return _CACHE[key]


def _quat(rel, target):
    return (rel.inverted() @ target).to_quaternion().normalized()


def digit_quaternions(rig, anatomy):
    """rig: the L_Armature object (or its armature data). anatomy: see module docstring.
    Returns {bone_name: Quaternion} for all 15 digit bones (pose-bone rotation_quaternion, bone-local basis)."""
    c = _calib(rig)
    anatomy = anatomy or {}
    unknown = set(anatomy) - set(FINGERS) - {'thumb'}
    if unknown:
        raise ValueError(f'unknown digits {sorted(unknown)}')
    out = {}
    n = c.n
    for f in FINGERS:
        a = anatomy.get(f) or {}
        bad = set(a) - {'mcp', 'mcp_abduct', 'pip', 'dip'}
        if bad:
            raise ValueError(f'{f}: unknown keys {sorted(bad)}')
        m = c.mcp[f]
        name = f'L_f_{f}.01'
        if 'mcp' in a or 'mcp_abduct' in a:
            abd = a.get('mcp_abduct', m['abd'])
            flex = a.get('mcp', m['flex'])
            yaw = _rot(n, m['sign'] * abd)
            d1 = yaw @ c.s0
            lat = d1.cross(n).normalized()
            out[name] = _quat(c.rel[name], _rot(lat, flex) @ yaw @ m['A0'])
        else:
            out[name] = Quaternion()
        for key, idx in (('pip', 2), ('dip', 3)):
            name = f'L_f_{f}.0{idx}'
            out[name] = _hinge(c, name, a.get(key))
    t = anatomy.get('thumb') or {}
    bad = set(t) - {'cmc_flex', 'cmc_abduct', 'cmc_rot', 'mcp', 'ip'}
    if bad:
        raise ValueError(f'thumb: unknown keys {sorted(bad)}')
    if any(k in t for k in ('cmc_flex', 'cmc_abduct', 'cmc_rot')):
        cm = c.cmc
        d1 = _rot(n, -t.get('cmc_flex', 0.0)) @ cm['d0']        # + flex sweeps toward the pinky (+X)
        a1 = d1.cross(n).normalized()
        T = _rot(a1, t.get('cmc_abduct', cm['abd'])) @ _rot(n, -t.get('cmc_flex', 0.0)) @ cm['A0'] \
            @ _rot(Vector((0, 1, 0)), t.get('cmc_rot', 0.0))    # + about the metacarpal's distal axis = pronation
        out['L_thumb.01'] = _quat(c.rel['L_thumb.01'], T)
    else:
        out['L_thumb.01'] = Quaternion()
    out['L_thumb.02'] = _hinge(c, 'L_thumb.02', t.get('mcp'))
    out['L_thumb.03'] = _hinge(c, 'L_thumb.03', t.get('ip'))
    return out


def _hinge(c, name, deg):
    if deg is None:
        return Quaternion()
    hg = c.hinge[name]
    return _quat(c.rel[name], hg['A0'] @ _rot(hg['h'], deg))


def rest_angles(rig):
    """Anatomical angles of the bind pose (what an empty anatomy dict reproduces)."""
    return _calib(rig).rest_angles()


def anatomy_from_quaternions(rig, quats):
    """Inverse of digit_quaternions for verification: returns (anatomy, residual twist/side-bend per bone in deg)."""
    c = _calib(rig)
    n = c.n
    anat, resid = {}, {}
    for f in FINGERS:
        name = f'L_f_{f}.01'
        m = c.mcp[f]
        T = c.rel[name] @ quats.get(name, Quaternion()).to_matrix()
        d = T.col[1].normalized()
        d1 = _plane(d, n)
        abd = m['sign'] * _signed(c.s0, d1, n)
        lat = d1.cross(n).normalized()
        flex = _signed(d1, d, lat)
        rebuilt = _rot(lat, flex) @ _rot(n, m['sign'] * abd) @ m['A0']
        resid[name] = math.degrees((rebuilt.inverted() @ T).to_quaternion().angle)
        anat[f] = {'mcp': flex, 'mcp_abduct': abd}
        for key, idx in (('pip', 2), ('dip', 3)):
            nm = f'L_f_{f}.0{idx}'
            anat[f][key], resid[nm] = _hinge_inverse(c, nm, quats.get(nm, Quaternion()))
    cm = c.cmc
    T = c.rel['L_thumb.01'] @ quats.get('L_thumb.01', Quaternion()).to_matrix()
    d = T.col[1].normalized()
    d1 = _plane(d, n)
    cflex = _signed(cm['d0'], d1, -n)
    a1 = d1.cross(n).normalized()
    cabd = _signed(d1, d, a1)
    D = (_rot(a1, cabd) @ _rot(n, -cflex) @ cm['A0']).inverted() @ T      # should be pure axial rotation
    crot = _signed(Vector((1, 0, 0)), D @ Vector((1, 0, 0)), Vector((0, 1, 0)))
    resid['L_thumb.01'] = math.degrees((_rot(Vector((0, 1, 0)), crot).inverted() @ D).to_quaternion().angle)
    anat['thumb'] = {'cmc_flex': cflex, 'cmc_abduct': cabd, 'cmc_rot': crot}
    for key, nm in (('mcp', 'L_thumb.02'), ('ip', 'L_thumb.03')):
        anat['thumb'][key], resid[nm] = _hinge_inverse(c, nm, quats.get(nm, Quaternion()))
    return anat, resid


def _hinge_inverse(c, name, q):
    hg = c.hinge[name]
    D = hg['A0'].inverted() @ c.rel[name] @ q.to_matrix()      # should be a pure rotation about h
    ang = _signed(Vector((0, 1, 0)), D @ Vector((0, 1, 0)), hg['h'])
    resid = math.degrees((_rot(hg['h'], ang).inverted() @ D).to_quaternion().angle)
    return ang, resid


def validate(anatomy):
    """Return a list of human-readable violations of the CONTEXT.md quality-bar ranges.
    Hard range violations are plain strings; soft anatomical-plausibility notes start with 'soft:'."""
    problems = []
    for digit, joints in (anatomy or {}).items():
        kind = 'thumb' if digit == 'thumb' else 'finger'
        if digit not in FINGERS and digit != 'thumb':
            problems.append(f'{digit}: unknown digit')
            continue
        for k, v in (joints or {}).items():
            lim = JOINT_LIMITS[kind].get(k)
            if lim is None:
                problems.append(f'{digit}.{k}: unknown joint')
                continue
            if not isinstance(v, (int, float)) or math.isnan(v):
                problems.append(f'{digit}.{k}: not a number ({v!r})')
                continue
            lo, hi = lim
            if v < lo or v > hi:
                problems.append(f'{digit}.{k}={v} outside [{lo}, {hi}]')
        if kind == 'finger' and joints:
            if 'pip' in joints and 'dip' in joints and joints['dip'] > joints['pip'] + 1e-6:
                problems.append(f'soft: {digit}.dip ({joints["dip"]}) > pip ({joints["pip"]}); PIP normally leads in a grip')
        if kind == 'thumb' and joints:
            if joints.get('cmc_abduct', 0) >= 30 and joints.get('cmc_rot', 0) < 0:
                problems.append('soft: thumb abducted >= 30 with supination (cmc_rot < 0); opposition couples pronation')
    return problems
