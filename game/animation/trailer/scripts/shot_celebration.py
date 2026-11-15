"""Trailer shot: "...you'll be claimed as pioneers of the new world." - home again: the crew of four (the films' rigged
crew, crew_kit.person) cheer in front of their scorched capsule at dusk, confetti falling and fireworks overhead.
2 s at 24 fps."""
import os, sys, random; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trailer_kit import *
from crew_kit import person, gesture
from mathutils import Vector

NAME = 'trailer_celebration'
opts = args()
sc = reset(NAME, 2.0)
END = sc.frame_end                        # 47
rnd = random.Random(7)

# deck, capsule (heat shield scorched), banner
cube('deck', (40, 30, 0.2), loc=(0, 6, -0.1), m=mat('deck', (0.07, 0.08, 0.1), rough=0.6))
cap = empty('capsule', loc=(0.9, 6.0, 0)); cap.rotation_euler = (0, 0, math.radians(18))
lathe('crew_module', [(3.0, 0.55), (2.8, 0.75), (0.55, 2.5), (0.32, 2.6)], mat('orion_hull_used', (0.42, 0.41, 0.4), rough=0.6, metal=0.2), 40).parent = cap
lathe('heat_shield', [(0.32, 2.6), (0.1, 2.35), (0.0, 1.2), (-0.04, 0.0)], mat('shield_burnt', (0.12, 0.09, 0.07), rough=0.9), 40).parent = cap
for i in range(3):                                           # flag-coloured scorch streaks on the cone
    o = cube(f'scorch{i}', (0.18, 0.05, 1.6), loc=(math.cos(i * 1.4 - 1.2) * 1.55, math.sin(i * 1.4 - 1.2) * 1.55 - 0.02, 1.4),
             m=mat('scorch', (0.25, 0.2, 0.17), rough=1.0), parent=cap)
font = None
for fp in ('C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'):
    if os.path.exists(fp): font = bpy.data.fonts.load(fp); break
cu = bpy.data.curves.new('banner', 'FONT'); cu.body = 'WELCOME HOME, PIONEERS'; cu.align_x = 'CENTER'; cu.size = 0.9; cu.extrude = 0.03
if font: cu.font = font
ban = bpy.data.objects.new('banner', cu); link(ban); ban.data.materials.append(emit_mat('banner', (1.0, 0.62, 0.25), 6))
ban.location = (0, 9.5, 4.0); ban.rotation_euler = (math.radians(90), 0, 0)

# the crew, arms up, pumping
crew = [('ch23', None), ('ch22', None), ('ch48', None), ('ch22', ('.', (0.55, 0.75, 1.0)))]
for i, (char, tint) in enumerate(crew):
    x = -2.55 + i * 1.7
    _, arm = person(f'crew_{i}', char, (x, 0.3 * abs(i - 1.5), 0), rot_z=8 * (1.5 - i), clip='idle', end=END, offset=0.2 * i, tint=tint, tex=512)
    up, spread = 128 + 6 * (i % 2), 28 + 4 * i
    pumps = [(k * 11 + 3 * i - 4, k * 11 + 3 * i + 6, (22, 0, 0)) for k in range(5)]
    gesture(arm, 'RightArm', [(-20, END + 20, (up, spread, 0))] + pumps)
    gesture(arm, 'LeftArm', [(-20, END + 20, (up, -spread, 0))] + [(a + 4, b + 4, r) for a, b, r in pumps])
    gesture(arm, 'Head', [(-20, END + 20, (-12, 0, 0))])

# confetti
colors = [(1, 0.25, 0.2), (1, 0.8, 0.15), (0.2, 0.75, 1), (0.35, 1, 0.45), (1, 0.45, 0.85), (1, 1, 1)]
cms = [mat(f'confetti{i}', c, rough=0.5, emit=c, strength=0.6) for i, c in enumerate(colors)]
for i in range(260):
    o = cube(f'confetti_{i}', (0.07, 0.11, 0.004), m=cms[i % len(cms)]); o.visible_shadow = False
    x, y, z0 = rnd.uniform(-5, 5), rnd.uniform(-3.5, 4), rnd.uniform(1.0, 6.5)
    fall, sway, spin = rnd.uniform(0.045, 0.075), rnd.uniform(0.2, 0.5), [rnd.uniform(-25, 25) for _ in range(3)]
    ph = rnd.uniform(0, 6.28)
    for f in range(0, END + 1, 6):
        z = z0 - fall * f
        if z < 0: z += 6.5
        A.key(o, f, loc=(x + sway * math.sin(ph + f * 0.2), y, z), rot=tuple(a * f + 40 * k for k, a in enumerate(spin)), interp='LINEAR')

# fireworks: sparks flying out from three bursts
for b, (cx, cz, f0, col) in enumerate(((-7, 9, -8, (1, 0.5, 0.2)), (6, 10.5, 6, (0.4, 0.8, 1)), (0, 12, 20, (1, 0.85, 0.3)))):
    sm = emit_mat(f'spark{b}', col, 40)
    for k in range(48):
        th, ph = math.acos(rnd.uniform(-1, 1)), rnd.uniform(0, 6.28)
        v = Vector((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph) * 0.3, math.cos(th))) * rnd.uniform(0.11, 0.15)
        o = sphere(f'spark{b}_{k}', 0.05, m=sm); o.visible_shadow = False
        c = Vector((cx * 1.4, 24, cz + 3))
        if f0 > 0: A.key(o, f0 - 1, loc=tuple(c), scale=(0.001,) * 3, interp='CONSTANT')
        for f in range(max(0, f0), min(END, f0 + 30) + 1, 3):
            t = f - f0
            A.key(o, f, loc=tuple(c + v * 30 * (1 - math.exp(-t / 10)) - Vector((0, 0, 0.0025 * t * t))), scale=(max(0.001, 1.6 - t / 22),) * 3, interp='LINEAR')

# dusk light
sun(2.2, color=(1.0, 0.72, 0.5), rot=(74, 0, -30), angle=2)
world_sky((0.95, 0.42, 0.22), (0.04, 0.06, 0.2), (0.1, 0.07, 0.07), strength=0.8, stars=0.25)
for i, (x, y, z, e, c) in enumerate(((-4, -4, 3, 900, (1, 0.8, 0.6)), (4, -3, 2.5, 600, (0.7, 0.8, 1.0)), (0, 3, 4, 500, (1, 0.6, 0.3)))):
    ld = bpy.data.lights.new(f'fill{i}', 'AREA'); ld.energy = e; ld.color = c; ld.size = 4
    o = bpy.data.objects.new(f'fill{i}', ld); o.location = (x, y, z); link(o)
    o.rotation_euler = (Vector((0, 0, 1.2)) - Vector((x, y, z))).to_track_quat('-Z', 'Y').to_euler()

cam = camera(lens=32)
look(cam, 0, (0.5, -6.4, 1.0), (0, 1.5, 1.75), interp='LINEAR')
look(cam, END, (0.15, -5.5, 1.1), (0, 1.5, 1.8), interp='LINEAR')

finish(NAME, opts)
