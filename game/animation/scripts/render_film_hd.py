"""Render an existing authored Blender film cleanly at 1080p; keep original animation.
Blender -b SOURCE.blend --python this_file -- OUTPUT_DIRECTORY
"""
import bpy, sys
from pathlib import Path
out = Path(sys.argv[sys.argv.index('--') + 1]).resolve(); out.mkdir(parents=True, exist_ok=True)
s = bpy.context.scene
s.render.resolution_x = 1920; s.render.resolution_y = 1080; s.render.resolution_percentage = 100
s.render.engine = 'BLENDER_EEVEE'; s.eevee.taa_render_samples = 32; s.eevee.shadow_pool_size = '1024'; s.eevee.use_raytracing = False
s.render.use_sequencer = False; s.render.use_border = False; s.render.use_crop_to_border = False
s.render.image_settings.media_type = 'VIDEO'; s.render.image_settings.file_format = 'FFMPEG'
s.render.ffmpeg.format = 'MPEG4'; s.render.ffmpeg.codec = 'H264'; s.render.ffmpeg.constant_rate_factor = 'HIGH'; s.render.ffmpeg.ffmpeg_preset = 'GOOD'
s.render.filepath = str(out / (s.name + '-hd.mp4')); s.render.use_file_extension = False
bpy.ops.render.render(animation=True)
