"""Moon mission plan (plays before the Moon mission): how you get to the Moon, with the real orbital sequence.
Earth-centred, bodies enlarged (the Moon's distance is kept at 60 Earth radii relative to the parking orbit scale only
roughly). The Moon circles Earth every 27.3 days.
1. Parking orbit: the ship circles Earth once.
2. Trans-lunar injection (TLI): a burn at the low point stretches the orbit into a long ellipse whose far end reaches the
   Moon's distance. No escape from Earth is needed - the Moon is still inside Earth's grip.
3. Translunar coast: engine off; the ship follows the ellipse (Kepler's equation), slowing as it climbs. The ship aims
   ahead: the Moon moves ~50 degrees round Earth during the ~4-day trip, so TLI happens when the Moon is that far short of
   the meeting point.
4. Lunar orbit insertion (LOI): the ship turns round and brakes so the Moon's gravity captures it into lunar orbit."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from mathutils import Vector

NAME = 'briefing_moon'
opts = args()
sc = reset(NAME, 26)
END = sc.frame_end
D = 40.0                         # Earth-Moon distance (scene units)
RP = 2.6                         # parking orbit radius (Earth's radius here is 1.6)
MOON_PERIOD, TRIP = 27.3, 4.0    # days
F_PARK, F_TLI, F_ARRIVE = 70, 140, 440
A_T = (RP + D) / 2; E_T = (D - RP) / (D + RP)
THETA0 = math.radians(200)       # where TLI happens (perigee direction)
LEAD = 360 * TRIP / MOON_PERIOD  # degrees the Moon moves during the trip (~53)

def day(f):
    if f <= F_PARK: return (f - F_PARK) * 0.02
    if f <= F_TLI: return 0.0
    if f <= F_ARRIVE: return (f - F_TLI) / (F_ARRIVE - F_TLI) * TRIP
    return TRIP + (f - F_ARRIVE) * 0.01

def moon_pos(d):                 # meets the ship at apogee (THETA0 + 180 deg) on arrival day
    a = THETA0 + math.pi - math.radians(LEAD) + math.radians(360 * d / MOON_PERIOD)
    return Vector((math.cos(a) * D, math.sin(a) * D, 0))

def transfer(f):                 # Kepler on the TLI ellipse: perigee (RP) to apogee (D) in TRIP days
    M = math.pi * (f - F_TLI) / (F_ARRIVE - F_TLI)
    Ea = M
    for _ in range(14):
        Ea -= (Ea - E_T * math.sin(Ea) - M) / (1 - E_T * math.cos(Ea))
    nu = 2 * math.atan2(math.sqrt(1 + E_T) * math.sin(Ea / 2), math.sqrt(1 - E_T) * math.cos(Ea / 2))
    r = A_T * (1 - E_T * math.cos(Ea))
    return Vector((math.cos(THETA0 + nu) * r, math.sin(THETA0 + nu) * r, 0))

def parking(f):
    a = THETA0 - math.tau * (F_TLI - f) / (F_TLI - F_PARK)
    return Vector((math.cos(a) * RP, math.sin(a) * RP, 0))

R_CAP, CAP_LAP = 1.5, 50.0
def ship_at(f):
    if f <= F_TLI: return parking(f)
    if f <= F_ARRIVE: return transfer(f)
    k = ease(min(1.0, (f - F_ARRIVE) / 24)); a = THETA0 + math.tau * (f - F_ARRIVE) / CAP_LAP
    return moon_pos(day(f)) + Vector((math.cos(a), math.sin(a), 0)) * R_CAP * k

# ---------- bodies
earth = uvsphere('earth', 1.6, m=textured('earth_map', 'earth-map.jpg'))
moon = uvsphere('moon', 0.6, m=textured('moon_map', 'moon-map.jpg'))
def ring(name, r, color, w=0.06, loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=w, major_segments=180, minor_segments=6, location=loc)
    o = bpy.context.active_object; o.name = o.data.name = name
    return setmat(o, mat(name, color, emit=color, strength=1.5))
ring('moon_orbit', D, (0.75, 0.75, 0.8), w=0.07)
park = ring('parking_orbit', RP, (0.55, 0.85, 1.0), w=0.02)
A.key(park, F_PARK - 30, scale=(0.001,) * 3, interp='LINEAR'); A.key(park, F_PARK - 10, scale=(1, 1, 1), interp='CONSTANT')
A.key(park, F_TLI + 60, scale=(1, 1, 1), interp='LINEAR'); A.key(park, F_TLI + 80, scale=(0.001,) * 3, interp='CONSTANT')

dot_mesh = sphere('dot_mesh', 0.16, m=mat('path', (1, 0.95, 0.6), emit=(1, 0.9, 0.5), strength=3), sub=1).data
bpy.data.objects.remove(bpy.data.objects['dot_mesh'])
N = 60
for i in range(1, N + 1):
    f = F_TLI + (F_ARRIVE - F_TLI) * i / N
    o = bpy.data.objects.new(f'path_dot_{i}', dot_mesh); link(o); o.location = transfer(f)
    A.key(o, round(f) - 1, scale=(0.001,) * 3, interp='CONSTANT'); A.key(o, round(f), scale=(1, 1, 1), interp='CONSTANT')

ship = cyl('ship_marker', 0.32, 1.0, m=mat('ship_white', (1, 1, 1), emit=(1, 1, 1), strength=2), r2=0.0, verts=12)
for v in ship.data.vertices:     # cone points along +X, tail at x = -0.5
    v.co = Vector((v.co.z, v.co.x, v.co.y))
burn = flame('burn', 0.2, 1.6, ship, (-0.5, 0, 0), color=(1.0, 0.6, 0.2), strength=6, diamonds=2)
burn.rotation_euler = (0, math.pi / 2, 0)
for f0, f1 in ((F_TLI - 3, F_TLI + 22), (F_ARRIVE - 4, F_ARRIVE + 16)):    # TLI burn, then the braking burn at the Moon
    A.key(burn, f0 - 1, scale=(0.001,) * 3, interp='CONSTANT'); A.key(burn, f0 + 3, scale=(1, 1, 1), interp='LINEAR')
    A.key(burn, f1 - 3, scale=(1, 1, 1), interp='LINEAR'); A.key(burn, f1, scale=(0.001,) * 3, interp='CONSTANT')
A.key(burn, 0, scale=(0.001,) * 3, interp='CONSTANT')

def ship_scale(f):
    if f <= F_TLI + 20: return 0.45
    if f <= F_TLI + 70: return 0.45 + 0.55 * ease((f - F_TLI - 20) / 50)
    if f <= F_ARRIVE - 30: return 1.0
    return 1.0 - 0.65 * ease(min(1.0, (f - F_ARRIVE + 30) / 40))

for f in range(F_PARK - 30, END + 1):
    p = ship_at(f); q = ship_at(f + 1) - ship_at(f - 1)
    heading = math.degrees(math.atan2(q.y, q.x))
    if F_ARRIVE - 10 <= f <= F_ARRIVE + 18: heading += 180 * ease(min(1.0, (f - F_ARRIVE + 10) / 8))   # turn round to brake
    A.key(ship, f, loc=tuple(p), rot=(0, 0, heading), scale=(ship_scale(f),) * 3, interp='LINEAR')
A.key(ship, F_PARK - 31, scale=(0.001,) * 3, interp='CONSTANT')
for f in range(0, END + 1, 3):
    A.key(earth, f, rot=(0, 0, f * 0.6), interp='LINEAR')
    A.key(moon, f, loc=tuple(moon_pos(day(f))), rot=(0, 0, math.degrees(math.radians(360 * day(f) / MOON_PERIOD))), interp='LINEAR')

# ---------- camera: Earth and Moon, close on the parking orbit and TLI, the long climb, then down to the Moon
cam = camera(lens=35)
look(cam, 0, (8, -70, 55), (0, 0, 0))
look(cam, F_PARK - 10, (-2, -12, 9), (0, 0.5, 0))
look(cam, F_TLI, (-4, -14, 11), (0, 0, 0))
look(cam, F_TLI + 80, (5, -62, 50), (-6, -6, 0))
mp = moon_pos(day(F_ARRIVE))
look(cam, F_ARRIVE - 40, tuple(mp * 0.5 + Vector((0, -55, 45))), tuple(mp * 0.6))
look(cam, F_ARRIVE, tuple(mp + Vector((0, -16, 13))), tuple(mp))
for f in range(F_ARRIVE + 3, END + 1, 3):
    m = moon_pos(day(f)); k = ease((f - F_ARRIVE) / 120)
    look(cam, f, tuple((m + Vector((0, -16, 13))).lerp(m + Vector((0, -5, 3.5)), k)), tuple(m), interp='LINEAR')

ld = bpy.data.lights.new('sunlight', 'SUN'); ld.energy = 4
lo = bpy.data.objects.new('sunlight', ld); lo.rotation_euler = (math.radians(55), 0, math.radians(-35)); link(lo); lo['preview_only'] = True
world_sky((0, 0, 0), (0, 0, 0), (0, 0, 0), strength=1.0, stars=0.9)

caption(cam, 'Your mission: fly to the Moon and explore its south pole', 0, F_PARK - 10)
caption(cam, 'First the ship circles Earth in a parking orbit', F_PARK - 10, F_TLI, phase='Parking orbit')
caption(cam, 'Trans-lunar injection: one burn to head for the Moon', F_TLI, F_TLI + 80, phase='TLI burn')
caption(cam, 'Aim ahead: the Moon moves while you travel', F_TLI + 80, F_TLI + 190, phase='Translunar coast')
caption(cam, 'Engine off: about four days, 384,000 km', F_TLI + 190, F_ARRIVE, phase='Translunar coast')
caption(cam, 'A braking burn puts Orion into lunar orbit', F_ARRIVE, F_ARRIVE + 80, phase='Lunar orbit insertion')
caption(cam, 'Next stop: the surface. Home again in about a week', F_ARRIVE + 80, END + 1)

run([('briefing_moon', 0, END)], opts, NAME)
