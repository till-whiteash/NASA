"""Create a Saturn V film using the original Blender launch set and camera animation.
Run Blender -b animation/blend/launch_earth.blend --python this_file -- OUTPUT_DIR [--stills].
"""
import bpy, sys, json
from pathlib import Path
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import flame
out = Path(sys.argv[sys.argv.index('--') + 1]).resolve(); out.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.frame_set(0)
flight = bpy.data.objects['sls_flight']
# Remove legacy camera-facing smoke cards whose rectangle edges show in the movie.
for name in ('steam', 'trail'):
    root = bpy.data.objects.get(name)
    if root:
        for obj in [root, *root.children_recursive]: obj.hide_render = True
for obj in list(flight.children):
    if obj.name == 'sls' or obj.name.startswith(('rs25_', 'srb_')):
        for child in [obj, *obj.children_recursive]: child.hide_render = True
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(Path(__file__).resolve().parents[2] / 'assets/nasa/saturn-v-history.glb'))
imported = set(bpy.data.objects) - before
vehicle = bpy.data.objects.new('Saturn_V_lunar_vehicle', None); scene.collection.objects.link(vehicle)
for obj in imported:
    if obj.parent not in imported: obj.parent = vehicle
bpy.context.view_layer.update()
def bounds():
    pts = [obj.matrix_world @ Vector(corner) for obj in imported if obj.type == 'MESH' for corner in obj.bound_box]
    return Vector(tuple(min(p[i] for p in pts) for i in range(3))), Vector(tuple(max(p[i] for p in pts) for i in range(3)))
lo, hi = bounds(); vehicle.scale *= 98 / (hi.z - lo.z)
bpy.context.view_layer.update(); lo, hi = bounds()
vehicle.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
vehicle.parent = flight
for i, (x, y) in enumerate([(0, 0), (-1.8, -1.8), (-1.8, 1.8), (1.8, -1.8), (1.8, 1.8)]):
    plume = flame('F1_exhaust_' + str(i), 1.4, 32, flight, (x, y, .2), color=(1, .45, .12), strength=5, alpha=.6, diamonds=3)
    for frame, size in [(0, .001), (48, .001), (72, 1), (500, 1)]:
        plume.scale = (size,) * 3; plume.keyframe_insert(data_path='scale', frame=frame)
scene.name = 'launch_moon'; scene.frame_start = 0; scene.frame_end = 500
scene.render.resolution_x = 1920; scene.render.resolution_y = 1080; scene.render.resolution_percentage = 100
scene.render.engine = 'BLENDER_EEVEE'; scene.eevee.taa_render_samples = 32; scene.eevee.shadow_pool_size = '1024'; scene.eevee.use_raytracing = False
scene.render.use_sequencer = False; scene.render.use_border = False; scene.render.use_crop_to_border = False
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'launch_moon.blend'), compress=True)
caps = {'clips': [{'name': 'launch_moon', 'start': 0, 'end': 501/24}], 'captions': [
    {'t0': 0, 't1': 4, 'phase': 'APOLLO-STYLE MOON LAUNCH', 'text': 'Saturn V: the historic Apollo Moon rocket.'},
    {'t0': 4, 't1': 10, 'phase': 'LIFTOFF', 'text': 'Five first-stage engines lift the lunar spacecraft from the pad.'},
    {'t0': 10, 't1': 501/24, 'phase': 'ASCENT', 'text': 'Climb toward Earth orbit, before the journey to the Moon.'}]}
(out / 'launch_moon.captions.json').write_text(json.dumps(caps, indent=2), encoding='utf-8')
if '--stills' in sys.argv:
    scene.render.image_settings.media_type = 'IMAGE'; scene.render.image_settings.file_format = 'PNG'
    for frame in [0, 150, 350, 490]:
        scene.frame_set(frame); scene.render.filepath = str(out / f'check-{frame:04d}.png'); bpy.ops.render.render(write_still=True)
else:
    scene.render.image_settings.media_type = 'VIDEO'; scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'; scene.render.ffmpeg.codec = 'H264'; scene.render.ffmpeg.constant_rate_factor = 'HIGH'; scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
    scene.render.filepath = str(out / 'launch_moon-hd.mp4'); scene.render.use_file_extension = False
    bpy.ops.render.render(animation=True)
