"""Render an existing authored Blender film cleanly at 1080p; keep original animation.
Blender -b SOURCE.blend --python this_file -- OUTPUT_DIRECTORY

The films are timed 4/3 slower than their scripts (common.STRETCH), so the camera key that ends one shot and the
key that starts the next can land 1-3 frames apart, and the frames between show the camera halfway between the two
shots (a flash of a random angle). CUT_FIX snaps those frames to the next shot's camera: {film: [(first_bad, good)]}.
Find them with a per-frame camera-jump check (the frames between a big jump and the new shot's steady motion).
"""
import bpy, sys
from pathlib import Path
CUT_FIX = {
    'launch_earth': [(353, 354)],          # pad shot -> chase shot
    'failure_air_leak': [(336, 339)],      # wide shot -> close-up on the repair
    'failure_solar_panel': [(255, 256)],
}
out = Path(sys.argv[sys.argv.index('--') + 1]).resolve(); out.mkdir(parents=True, exist_ok=True)
s = bpy.context.scene


def snap_cuts(scene):
    cam = scene.camera
    for first, good in CUT_FIX.get(scene.name, []):
        scene.frame_set(good); g = cam.matrix_world.copy()
        scene.frame_set(good + 1); n = cam.matrix_world.copy()
        poses = {}
        for f in range(first, good):            # a moving shot: step back along its own motion; a still shot: hold
            m = g.copy(); m.translation = g.translation - (n.translation - g.translation) * (good - f); poses[f] = m
        poses[good] = g
        for f, m in sorted(poses.items()):
            cam.matrix_world = m
            cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f)
        for fc in cam.animation_data.action.fcurves if hasattr(cam.animation_data.action, 'fcurves') else []:
            pass
        # no blending into, between or out of the snapped frames
        from bpy_extras import anim_utils
        act = cam.animation_data.action
        cb = anim_utils.action_get_channelbag_for_slot(act, cam.animation_data.action_slot)
        for fc in cb.fcurves:
            if fc.data_path not in ('location', 'rotation_euler'): continue
            for kp in fc.keyframe_points:
                if first - 1.5 <= kp.co.x < good: kp.interpolation = 'CONSTANT'
            fc.update()
        print('snapped cut', scene.name, first, '->', good)


snap_cuts(s)
s.render.resolution_x = 1920; s.render.resolution_y = 1080; s.render.resolution_percentage = 100
s.render.engine = 'BLENDER_EEVEE'; s.eevee.taa_render_samples = 32; s.eevee.shadow_pool_size = '1024'; s.eevee.use_raytracing = False
s.render.use_sequencer = False; s.render.use_border = False; s.render.use_crop_to_border = False
s.render.image_settings.media_type = 'VIDEO'; s.render.image_settings.file_format = 'FFMPEG'
s.render.ffmpeg.format = 'MPEG4'; s.render.ffmpeg.codec = 'H264'; s.render.ffmpeg.constant_rate_factor = 'HIGH'; s.render.ffmpeg.ffmpeg_preset = 'GOOD'
s.render.filepath = str(out / (s.name + '-hd.mp4')); s.render.use_file_extension = False
if '--check' in sys.argv:                       # verify the snapped frames without rendering
    c = s.camera
    for first, good in CUT_FIX.get(s.name, []):
        for f in range(first - 1, good + 2):
            s.frame_set(f); print('CHECK', f, tuple(round(v, 1) for v in c.matrix_world.translation))
else:
    bpy.ops.render.render(animation=True)
