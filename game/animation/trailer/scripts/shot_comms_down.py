"""Trailer shot: "We will try to keep in contact with you..." - night at the outpost, the big dish sends pulses
toward Earth (the blue dot), then the link drops: the pulses stop, the status light turns red and SIGNAL LOST blinks.
3 s at 24 fps. Same outpost layout as the films (mars_kit.finished_outpost)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trailer_kit import *
from mars_kit import mars_ground, finished_outpost, HAB1, HAB2
from mathutils import Vector, Matrix

NAME = 'trailer_comms_down'
opts = args()
sc = reset(NAME, 3.0)
END = sc.frame_end                       # 71
LOST = 40                                # the link drops here

g, rk, _ = mars_ground(size=1800, flat_r=110, seed=4, rocks_n=120)
base = finished_outpost(skip=('solar',))
droot, head = base['dish']
bpy.context.view_layer.update()
hub = head.matrix_world.translation.copy()
axis = (head.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized()
rot = [math.degrees(a) for a in axis.to_track_quat('Z', 'Y').to_euler()]

# night: a faint blue-grey moonless sky with stars, warm habitat lights
sun(0.18, color=(0.55, 0.65, 1.0), rot=(70, 0, 200), angle=1)
world_sky((0.05, 0.05, 0.08), (0.004, 0.006, 0.014), (0.03, 0.02, 0.02), strength=1.0, stars=1.6)
for i, (x, y) in enumerate((HAB1, HAB2)):
    ld = bpy.data.lights.new(f'hab_glow{i}', 'POINT'); ld.energy = 6000; ld.color = (1.0, 0.72, 0.42); ld.shadow_soft_size = 2
    o = bpy.data.objects.new(f'hab_glow{i}', ld); o.location = (x + 6, y - 7, 3); link(o)
ld = bpy.data.lights.new('dish_flood', 'SPOT'); ld.energy = 2500; ld.spot_size = math.radians(70); ld.color = (0.75, 0.9, 1.0)
o = bpy.data.objects.new('dish_flood', ld); o.location = hub + Vector((-6, -10, -1.2)); link(o)
o.rotation_euler = (hub - o.location).to_track_quat('-Z', 'Y').to_euler()

# Earth: a bright blue dot along the dish's line of sight
earth = sphere('earth_dot', 9, loc=tuple(hub + axis * 1400), m=emit_mat('earth_dot', (0.35, 0.62, 1.0), 25))

# radio pulses: glowing rings that fly out of the dish along its axis
bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.05, major_segments=48, minor_segments=8)
ring_src = bpy.context.active_object; ring_mesh = ring_src.data; bpy.data.objects.remove(ring_src)
ring_mesh.materials.append(emit_mat('signal', (0.45, 0.9, 1.0), 14))
LIFE = 22
spawns = [0, 7, 14, 21, 28, 35] + [-21, -14, -7]           # negatives: pulses already in flight at frame 0
for k, f0 in enumerate(spawns):
    o = bpy.data.objects.new(f'pulse_{k}', ring_mesh); link(o); o.visible_shadow = False
    for f in range(max(0, f0), min(END, f0 + LIFE) + 1, 1):
        t = (f - f0) / LIFE
        A.key(o, f, loc=tuple(hub + axis * (2.4 + 26 * t)), rot=rot, scale=(1.2 + 3.2 * t,) * 3, interp='LINEAR')
    if f0 > 0:
        A.key(o, f0 - 1, scale=(0.001,) * 3, interp='CONSTANT')
    if f0 + LIFE < END:
        A.key(o, f0 + LIFE + 1, scale=(0.001,) * 3, interp='CONSTANT')
# a last, broken pulse that fizzles
o = bpy.data.objects.new('pulse_broken', ring_mesh); link(o)
A.key(o, LOST - 1, scale=(0.001,) * 3, interp='CONSTANT')
for f in range(LOST, LOST + 8):
    s = 1.3 * (1 - (f - LOST) / 8) * (0.3 if f % 2 else 1.0)
    A.key(o, f, loc=tuple(hub + axis * (2.4 + 1.2 * (f - LOST))), rot=rot, scale=(max(0.001, s),) * 3, interp='CONSTANT')
A.key(o, LOST + 8, scale=(0.001,) * 3, interp='CONSTANT')

# camera: low, beside the dish, drifting in; habitats glowing behind
cam = camera(lens=30)
perp = Vector((axis.y, -axis.x, 0)).normalized()
side = -perp if (hub - perp * 17).y < hub.y else perp      # the side away from the greenhouse, habitats behind
p0 = hub + side * 19 - Vector((axis.x, axis.y, 0)) * 6; p0.z = 1.6
tgt = hub + axis * 7
look(cam, 0, p0, tgt, interp='LINEAR')
look(cam, END, p0 + (tgt - p0).normalized() * 3.5 + Vector((0, 0, 0.4)), tgt + Vector((0, 0, 1.0)), interp='LINEAR')
# status light on the mast: green while linked, blinking red after
mast_top = Vector(droot.location) + Vector((0, 0, 2.4)) + (Vector(p0) - Vector(droot.location)).normalized() * 0.5
green = sphere('status_green', 0.22, loc=tuple(mast_top), m=emit_mat('status_green', (0.2, 1.0, 0.35), 40))
red = sphere('status_red', 0.22, loc=tuple(mast_top), m=emit_mat('status_red', (1.0, 0.12, 0.08), 60))
A.key(green, 0, scale=(1, 1, 1), interp='CONSTANT'); A.key(green, LOST, scale=(0.001,) * 3, interp='CONSTANT')
A.key(red, 0, scale=(0.001,) * 3, interp='CONSTANT')
for f in range(LOST, END + 1, 4):
    A.key(red, f, scale=(1, 1, 1) if (f - LOST) % 8 == 0 else (0.001,) * 3, interp='CONSTANT')

print('AXIS', axis, 'CAM', p0, 'TGT', tgt)

# SIGNAL LOST, blinking, fixed in front of the camera
bpy.context.view_layer.update()
font = None
for fp in ('C:/Windows/Fonts/consolab.ttf', 'C:/Windows/Fonts/segoeuib.ttf'):
    if os.path.exists(fp): font = bpy.data.fonts.load(fp); break
cu = bpy.data.curves.new('signal_lost', 'FONT'); cu.body = 'SIGNAL LOST'; cu.align_x = 'CENTER'; cu.size = 0.15
if font: cu.font = font
txt = bpy.data.objects.new('signal_lost', cu); link(txt); txt.data.materials.append(emit_mat('lost_red', (1.0, 0.16, 0.1), 12))
txt.parent = cam; txt.location = (0, -0.16, -2.0)
A.key(txt, 0, scale=(0.001,) * 3, interp='CONSTANT')
for f in range(LOST + 2, END + 1, 3):
    A.key(txt, f, scale=(1, 1, 1) if ((f - LOST - 2) // 3) % 3 != 2 else (0.001,) * 3, interp='CONSTANT')

finish(NAME, opts)
