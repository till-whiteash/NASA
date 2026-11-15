"""Trailer shot: "When you return..." - the crew capsule comes home, plunging into Earth's atmosphere heat shield
first, wrapped in a glowing plasma wake, the blue limb of the atmosphere below. 2 s at 24 fps.
(Earth is shrunk so the curve shows; the capsule is an Orion-style crew module like the one on the films' SLS.)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trailer_kit import *
from mathutils import Vector, Euler

NAME = 'trailer_return_earth'
opts = args()
sc = reset(NAME, 2.0)
END = sc.frame_end                       # 47
RE, H = 1500.0, 60.0

# Earth's axis lies along Y, so the camera looks down on the tropics, and it turns under the capsule
tilt = empty('earth_axis', loc=(0, 0, -RE)); tilt.rotation_euler = (math.radians(90), 0, 0)
earth = uvsphere('earth', RE, m=textured('earth_map', 'earth-map.jpg', size=2048), seg=128, rings=64); earth.parent = tilt
A.key(earth, 0, rot=(0, 0, 70), interp='LINEAR'); A.key(earth, END, rot=(0, 0, 68.6), interp='LINEAR')
air = soften(mat('atmosphere', (0.35, 0.6, 1.0), rough=1.0, emit=(0.3, 0.55, 1.0), strength=0.8, alpha=0.25), power=4.0)
uvsphere('atmosphere', RE + 14, loc=(0, 0, -RE), m=air, seg=128, rings=64).visible_shadow = False

# the capsule: crew module (cone), heat shield in front, glowing; travel direction d
d = Vector((1, 0, -0.22)).normalized()
cap = empty('capsule')
hull = mat('orion_hull', (0.86, 0.86, 0.84), rough=0.45, metal=0.2)
body = lathe('crew_module', [(3.0, 0.55), (2.8, 0.75), (0.35, 2.5), (0.12, 2.6)], hull, 32); body.parent = cap
shield = lathe('heat_shield', [(0.12, 2.6), (-0.15, 2.35), (-0.32, 1.2), (-0.36, 0.0)],
               mat('shield_hot', (1.0, 0.55, 0.25), emit=(1.0, 0.5, 0.18), strength=18), 32); shield.parent = cap
wake = flame('plasma', 1.6, 34, cap, (0, 0, 2.6), color=(1.0, 0.42, 0.14), strength=9, alpha=0.5)
wake.rotation_euler = (math.pi, 0, 0)
wake2 = flame('plasma_outer', 2.6, 52, cap, (0, 0, 1.2), color=(1.0, 0.5, 0.28), strength=3, alpha=0.14)
bow = sphere('bow_shock', 3.1, loc=(0, 0, -0.9), m=soften(mat('bow_shock', (1.0, 0.55, 0.25), rough=1.0, emit=(1.0, 0.5, 0.2), strength=6, alpha=0.55), power=2.0), parent=cap)
bow.scale = (1, 1, 0.42); bow.visible_shadow = False
wake2.rotation_euler = (math.pi, 0, 0)
q = (-d).to_track_quat('Z', 'Y').to_euler()
rot = [math.degrees(a) for a in q]
p0 = Vector((0, 0, H)); speed = 0.9                          # m per frame in this shrunk world
for f in range(0, END + 1, 4):
    flick = 1 + 0.08 * math.sin(f * 2.3) + 0.05 * math.sin(f * 5.1)
    A.key(cap, f, loc=tuple(p0 + d * speed * f), rot=(rot[0] + 1.2 * math.sin(f * 0.7), rot[1], rot[2]), interp='LINEAR')
    A.key(wake, f, scale=(1, 1, flick), interp='LINEAR'); A.key(wake2, f, scale=(1.05, 1.05, flick * 1.1), interp='LINEAR')
for n in ('plasma_glow', 'plasma_outer_glow'):
    bpy.data.objects[n].scale = (0.35, 0.35, 0.35)
for n in ('flame_plasma', 'flame_plasma_outer', 'flame_core_plasma', 'flame_core_plasma_outer'):
    soften(bpy.data.materials[n], power=1.2)
for o in cap.children_recursive:
    o.visible_shadow = False
# hot glow light on the capsule
ld = bpy.data.lights.new('plasma_light', 'POINT'); ld.energy = 15000; ld.color = (1.0, 0.5, 0.2); ld.shadow_soft_size = 3
gl = bpy.data.objects.new('plasma_light', ld); link(gl); gl.parent = cap; gl.location = (0, 0, -3)

sun(7.0, color=(1, 0.96, 0.9), rot=(62, 0, -25), angle=0.53)
world_sky((0, 0, 0), (0, 0, 0), (0, 0, 0), strength=1.0, stars=0.9)

# camera rides alongside, a little behind, with a slight buffet
cam = camera(lens=32)
for f in range(0, END + 1, 2):
    c = p0 + d * speed * f
    sh = Vector((math.sin(f * 1.7) * 0.08, math.sin(f * 2.3) * 0.06, math.sin(f * 1.3) * 0.08))
    u = f / END
    look(cam, f, c + Vector((-20 + 6 * u, -30 + 4 * u, 4.0)) + sh * 2, c + Vector((9, 0, -4.5)), interp='LINEAR')

finish(NAME, opts)
