"""Repair and render the original briefing without baked captions.
Blender --background animation/blend/ares_vi_briefing.blend --python this_file -- OUTPUT_DIR [--stills]
The original scene is preserved. Browser captions come from the existing captions JSON.
"""
import bpy
import sys
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
out = Path(args[0]).resolve()
out.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
for obj in scene.objects:
    if obj.name.startswith('screen_') and not obj.name.startswith('screen_frame_'):
        normal = Vector((obj.location.x, obj.location.y, 0)).normalized()
        obj.location -= normal * .025  # image must not coincide with its metal backing
    if obj.name.startswith('tag_'):
        obj.hide_render = True  # screen-space captions replace floating, overlapping name tags
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 32
scene.eevee.shadow_pool_size = '1024'
scene.eevee.use_raytracing = False  # avoid unstable screen-space reflections on picture panels
scene.render.use_sequencer = False  # clean film; no oversized baked-in caption strips
scene.render.use_border = False
scene.render.use_crop_to_border = False
scene.render.film_transparent = False
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'briefing-hd.blend'), compress=True)
if '--stills' in args:
    scene.render.image_settings.media_type = 'IMAGE'
    scene.render.image_settings.file_format = 'PNG'
    for frame in (0, 192, 384, 576, 800, 1000, 1184):
        scene.frame_set(frame)
        scene.render.filepath = str(out / f'check-{frame:04d}.png')
        bpy.ops.render.render(write_still=True)
else:
    scene.render.image_settings.media_type = 'VIDEO'
    scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'HIGH'
    scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
    scene.render.filepath = str(out / (scene.name + '-hd.mp4'))
    scene.render.use_file_extension = False
    bpy.ops.render.render(animation=True)
