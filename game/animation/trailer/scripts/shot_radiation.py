"""Trailer shot: "...radiation" - a solar flare: the Sun erupts and a glowing wave of charged particles races out
across space toward Mars (thin air, no global magnetic field, so the surface crew needs shielding). 1.5 s at 24 fps.
Sizes and distances are illustrative."""
import os, sys, random; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trailer_kit import *
from mathutils import Vector

NAME = 'trailer_radiation'
opts = args()
sc = reset(NAME, 1.5)
END = sc.frame_end                        # 35
rnd = random.Random(11)

SUN = Vector((-260, 120, 60))
sun_ball = uvsphere('sun_disc', 60, loc=tuple(SUN), m=emit_mat('sun_surface', (1.0, 0.5, 0.12), 7))
corona = uvsphere('corona', 95, loc=tuple(SUN), m=soften(mat('corona', (1.0, 0.5, 0.15), rough=1.0, emit=(1.0, 0.38, 0.06), strength=3, alpha=0.4), power=2.0))
corona.visible_shadow = False
sun_ball.visible_shadow = False
# flare loop bursting off the limb
flare = uvsphere('flare', 22, loc=tuple(SUN + Vector((52, -20, 10))), m=emit_mat('flare', (1.0, 0.85, 0.5), 40))
flare.visible_shadow = False
A.key(flare, 0, scale=(0.4, 0.4, 0.4), interp='LINEAR'); A.key(flare, 8, scale=(1.4, 1.1, 1.1)); A.key(flare, END, scale=(0.9, 0.8, 0.8))

mars = uvsphere('mars', 34, loc=(30, 70, -8), m=textured('mars_map', 'mars-map.jpg'))
A.key(mars, 0, rot=(0, 0, 40), interp='LINEAR'); A.key(mars, END, rot=(0, 0, 43), interp='LINEAR')

# the shock front (CME): a soft glowing shell expanding from the Sun past Mars
shell = uvsphere('cme_front', 100, loc=tuple(SUN), m=soften(mat('cme', (1.0, 0.55, 0.25), rough=1.0, emit=(1.0, 0.42, 0.1), strength=2.0, alpha=0.13), power=6.0))
shell.visible_shadow = False
A.key(shell, 0, scale=(0.8, 0.8, 0.8), interp='LINEAR'); A.key(shell, END, scale=(2.9, 2.9, 2.9), interp='LINEAR')

# particle streaks racing outward
pm = emit_mat('proton', (1.0, 0.7, 0.35), 20)
for i in range(140):
    d = (Vector((rnd.uniform(0.75, 1.0), rnd.uniform(-0.55, 0.15), rnd.uniform(-0.35, 0.25)))).normalized()
    o = cyl(f'streak_{i}', 0.25, 14, m=pm, verts=5); o.visible_shadow = False
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    f0, spd = rnd.uniform(-30, 20), rnd.uniform(14, 22)
    for f in (0, END):
        r = 60 + max(0.0, (f - f0)) * spd
        A.key(o, f, loc=tuple(SUN + d * r), interp='LINEAR')
    o.scale = (1, 1, 1)

world_sky((0, 0, 0), (0, 0, 0), (0, 0, 0), strength=1.0, stars=1.0)
lit = sun(5.0, color=(1, 0.88, 0.72))
lit.rotation_euler = (Vector((30, 70, -8)) - SUN).to_track_quat('-Z', 'Y').to_euler()

cam = camera(lens=28)
look(cam, 0, (-170, -300, 20), (-105, 95, 22), interp='LINEAR')
look(cam, END, (-160, -255, 20), (-100, 95, 22), interp='LINEAR')

finish(NAME, opts)
