"""Render a frame range of an authored Blender film cleanly at 1080p (no baked captions).
blender -b SOURCE.blend --python render_range.py -- OUTPUT.mp4 START_FRAME END_FRAME [SAMPLES]
"""
import bpy, sys
from pathlib import Path
a = sys.argv[sys.argv.index('--') + 1:]
out = Path(a[0]).resolve(); out.parent.mkdir(parents=True, exist_ok=True)
s = bpy.context.scene
s.frame_start, s.frame_end = int(a[1]), int(a[2])
s.render.resolution_x, s.render.resolution_y, s.render.resolution_percentage = 1920, 1080, 100
s.render.engine = 'BLENDER_EEVEE'; s.eevee.taa_render_samples = int(a[3]) if len(a) > 3 else 32
s.eevee.shadow_pool_size = '1024'; s.eevee.use_raytracing = False
s.render.use_sequencer = False; s.render.use_border = False; s.render.use_crop_to_border = False
s.render.image_settings.media_type = 'VIDEO'; s.render.image_settings.file_format = 'FFMPEG'
s.render.ffmpeg.format = 'MPEG4'; s.render.ffmpeg.codec = 'H264'
s.render.ffmpeg.constant_rate_factor = 'HIGH'; s.render.ffmpeg.ffmpeg_preset = 'GOOD'
s.render.ffmpeg.audio_codec = 'NONE'
s.render.filepath = str(out); s.render.use_file_extension = False
print('FPS', s.render.fps, 'range', s.frame_start, s.frame_end)
bpy.ops.render.render(animation=True)
