"""Shared bits for the trailer's new Blender shots. They reuse the film scripts' helpers (animation/scripts/common.py,
mars_kit.py, crew_kit.py) and style, but are timed 1:1 (no STRETCH) and render clean 1080p clips without captions.
Run one:  blender -b --factory-startup -P shot_comms_down.py -- [--stills 0,40] [--video]
"""
import os, sys
_HERE = os.path.dirname(os.path.abspath(__file__))
TRAILER = os.path.dirname(_HERE)
FILM_SCRIPTS = os.path.normpath(os.path.join(_HERE, '..', '..', 'scripts'))
sys.path.insert(0, FILM_SCRIPTS)
import common
from common import *
set_stretch(1.0)
CLIPS = os.path.join(TRAILER, 'clips')


def emit_mat(name, color, strength=4.0, alpha=1.0):
    return mat(name, color, emit=color, strength=strength, alpha=alpha)


def finish(name, opts, samples=32, transparent=False):
    """Write the keys, save the .blend next to the trailer, then render stills and/or the clip."""
    A.build([(name, 0, bpy.context.scene.frame_end)])
    sc = bpy.context.scene
    render_setup(100, samples)
    sc.eevee.taa_render_samples = samples
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.5
    os.makedirs(os.path.join(TRAILER, 'blend'), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(TRAILER, 'blend', name + '.blend'), compress=True)
    if opts['stills']:
        d = os.path.join(TRAILER, 'stills'); os.makedirs(d, exist_ok=True)
        sc.render.image_settings.media_type = 'IMAGE'; sc.render.image_settings.file_format = 'PNG'
        sc.render.resolution_percentage = 50
        for f in opts['stills']:
            sc.frame_set(f); sc.render.filepath = os.path.join(d, f'{name}_{f:04d}.png')
            bpy.ops.render.render(write_still=True)
        sc.render.resolution_percentage = 100
    if opts['video']:
        os.makedirs(CLIPS, exist_ok=True)
        r = sc.render
        r.image_settings.media_type = 'VIDEO'; r.image_settings.file_format = 'FFMPEG'
        r.ffmpeg.format = 'MPEG4'; r.ffmpeg.codec = 'H264'; r.ffmpeg.constant_rate_factor = 'HIGH'; r.ffmpeg.ffmpeg_preset = 'GOOD'
        r.ffmpeg.audio_codec = 'NONE'
        r.filepath = os.path.join(CLIPS, name + '.mp4'); r.use_file_extension = False
        bpy.ops.render.render(animation=True)
