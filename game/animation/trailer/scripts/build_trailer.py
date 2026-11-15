"""Edit the Zhetalis trailer: cut the source clips to the voice-over and write a 1080p H.264 MP4.
This file IS the edit project - change the CUTS table (timeline start, source clip, in-point) and re-run:
    python build_trailer.py            -> ../zhetalis-trailer-1080p.mp4  (+ ../cut-list.md)
Sources: ../clips/*.mp4 (render_sources.sh, capture_gameplay.py), ../../previews/*-hd.mp4 (authored HD films),
title layers in ../build (make_title.py). Voice-over: ../assets/voiceover.m4a (word times: ../voiceover-transcript.json).
"""
import subprocess, json
from pathlib import Path

HERE = Path(__file__).resolve().parent
TR = HERE.parent
CLIPS, PREV, BUILD = TR / 'clips', TR.parent / 'previews', TR / 'build'
VOICE = TR / 'assets' / 'voiceover.m4a'
OUT = TR / 'zhetalis-trailer-1080p.mp4'
FPS = 24
TITLE_AT, END = 30.86, 34.86          # title card on "All the best!", held to the end

# (timeline start s, beat, spoken words, source, in-point s) - each cut runs until the next one starts
CUTS = [
    (0.00, '1 Ship',      'Welcome, future pioneers!',                'clips/launch_pad', 0.0),
    (2.16, '2 Crew',      'After careful selection,',                 'previews/ares_vi_briefing-hd', 8.6),
    (3.56, '2 Crew',      'you four are chosen',                      'previews/ares_vi_briefing-hd', 40.5),
    (4.50, '3 Flight',    'for Ares VI,',                             'clips/launch_liftoff', 0.4),
    (6.00, '3 Flight',    "humanity's colonisation of Mars.",         'clips/launch_climb', 2.6),
    (8.42, '3 Flight',    "You're tasked to set up an outpost in",    'previews/cruise_loop-hd', 7.0),
    (10.40, '3 Flight',   '500 days before the next',                 'previews/mars_approach-hd', 2.0),
    (12.56, '3 Flight',   'return window to Earth.',                  'clips/ewan_landing', 5.0),
    (14.22, '3 Flight',   'Many challenges await you.',               'clips/ewan_landing', 15.6),
    (15.70, '4 Gameplay', 'Set a base, acquire a way to obtain',      'clips/game_build', 0.0),
    (17.70, '4 Gameplay', 'breathable air,',                          'clips/game_walk', 0.3),
    (18.90, '4 Gameplay', 'food and water.',                          'clips/game_mine', 0.0),
    (20.00, '5 Hazards',  'Beware of hazards,',                       'clips/leak', 0.6),
    (21.04, '5 Hazards',  'radiation,',                               'clips/trailer_radiation', 0.0),
    (21.96, '5 Hazards',  'dust storms',                              'clips/storm_front', 2.0),
    (23.10, '5 Hazards',  'and many of which may kill you.',          'clips/storm_engulf', 1.0),
    (24.60, '6 Comms',    'We will try to keep in contact with you all throughout this mission.', 'clips/trailer_comms_down', 0.0),
    (27.36, '7 Return',   'When you return,',                         'clips/ascent_ignition', 1.6),
    (28.20, '7 Return',   "you'll be claimed as",                     'clips/trailer_return_earth', 0.3),
    (29.30, '7 Return',   'pioneers of the new world.',               'clips/trailer_celebration', 0.2),
]
TITLE_BG = ('previews/mars_approach-hd', 13.0)   # the planet behind the title, darkened
# burned-in subtitles: (start, end, text) on the voice-over's word times (voiceover-transcript.json)
SUBS = [
    (0.00, 2.05, 'Welcome, future pioneers!'),
    (2.24, 3.45, 'After careful selection,'),
    (3.62, 5.85, 'you four are chosen for Ares VI,'),
    (6.06, 8.30, "humanity's colonisation of Mars."),
    (8.50, 11.50, "You're tasked to set up an outpost in 500 days"),
    (11.58, 14.10, 'before the next return window to Earth.'),
    (14.30, 15.70, 'Many challenges await you.'),
    (15.78, 18.85, 'Set a base, acquire a way to obtain breathable air,'),
    (18.96, 19.95, 'food and water.'),
    (20.08, 22.40, 'Beware of hazards, radiation, dust storms'),
    (22.45, 24.55, 'and many of which may kill you.'),
    (24.68, 27.30, 'We will try to keep in contact with you all throughout this mission.'),
    (27.44, 30.80, "When you return, you'll be acclaimed as pioneers of the new world."),
    (30.92, 32.40, 'All the best!'),
]
# title layers fade in after TITLE_AT: (layer, delay s, fade s)
LAYERS = [('title_mark', 0.05, 0.6), ('title_name', 0.35, 0.6), ('title_team', 0.95, 0.6)]


def src(rel):
    folder, name = rel.split('/')
    return (CLIPS if folder == 'clips' else PREV) / (name + '.mp4')


def make_subs():
    from PIL import Image, ImageDraw, ImageFont
    font = ImageFont.truetype(str(TR / 'assets' / 'BarlowCondensed-SemiBold.ttf'), 54)
    d = BUILD / 'subs'; d.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, (_, _, text) in enumerate(SUBS):
        im = Image.new('RGBA', (1920, 1080)); g = ImageDraw.Draw(im)
        w = g.textlength(text, font=font); x, y = (1920 - w) / 2, 958
        g.rounded_rectangle((x - 22, y - 8, x + w + 22, y + 66), 10, fill=(0, 0, 0, 140))
        g.text((x + 2, y + 3), text, font=font, fill=(0, 0, 0, 200)); g.text((x, y), text, font=font, fill=(255, 246, 232, 255))
        p = d / f'sub_{i:02d}.png'; im.save(p); paths.append(p)
    return paths


def build():
    subs = make_subs()
    args, chains, labels = ['ffmpeg', '-v', 'error', '-y'], [], []
    fit = f'fps={FPS},scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p'
    for i, (t, _, _, rel, inp) in enumerate(CUTS):
        d = (CUTS[i + 1][0] if i + 1 < len(CUTS) else TITLE_AT) - t
        args += ['-i', str(src(rel))]
        chains.append(f'[{i}:v]trim=start={inp}:duration={d:.3f},setpts=PTS-STARTPTS,{fit}[v{i}]'); labels.append(f'[v{i}]')
    n = len(CUTS)
    # title: darkened, slowly pushing planet + logo layers
    td = END - TITLE_AT
    args += ['-i', str(src(TITLE_BG[0]))]
    chains.append(f'[{n}:v]trim=start={TITLE_BG[1]}:duration={td:.3f},setpts=PTS-STARTPTS,{fit},'
                  f"scale=w='1920*(1+0.04*t/{td})':h=-2:eval=frame,crop=1920:1080,eq=brightness=-0.16:saturation=0.8,"
                  f'vignette=PI/4[tb0]')
    for k, (layer, delay, fade) in enumerate(LAYERS):
        args += ['-loop', '1', '-framerate', str(FPS), '-t', f'{td:.3f}', '-i', str(BUILD / f'{layer}.png')]
        chains.append(f'[{n + 1 + k}:v]format=rgba,fade=in:st={delay}:d={fade}:alpha=1[l{k}]')
        chains.append(f'[tb{k}][l{k}]overlay=0:0:format=auto[tb{k + 1}]')
    chains.append(f'[tb{len(LAYERS)}]fade=out:st={td - 0.7:.3f}:d=0.7,format=yuv420p[title]'); labels.append('[title]')
    chains.append(f"{''.join(labels)}concat=n={len(labels)}:v=1:a=0[s0]")
    base = n + 1 + len(LAYERS)
    for k, ((t0, t1, _), p) in enumerate(zip(SUBS, subs)):
        args += ['-loop', '1', '-framerate', str(FPS), '-t', str(END), '-i', str(p)]
        chains.append(f"[s{k}][{base + k}:v]overlay=0:0:format=auto:enable='between(t,{t0},{t1})'[s{k + 1}]")
    chains.append(f'[s{len(SUBS)}]fade=in:st=0:d=0.35,format=yuv420p[vout]')
    a = base + len(SUBS)
    args += ['-i', str(VOICE)]
    chains.append(f'[{a}:a]apad,atrim=0:{END},afade=out:st={END - 0.5}:d=0.5[aout]')
    args += ['-filter_complex', ';'.join(chains), '-map', '[vout]', '-map', '[aout]',
             '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', str(FPS),
             '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', str(END), str(OUT)]
    subprocess.run(args, check=True)


def cut_list():
    rows = ['| # | Time | Beat | Line | Shot (source @ in-point) |', '|---|---|---|---|---|']
    names = {'clips/ewan_landing': "Ewan's in-game Mars landing (captured)", 'clips/game_build': 'gameplay: base going up',
             'clips/game_walk': 'gameplay: astronaut to the airlock', 'clips/game_mine': 'gameplay: mining with the rock pick'}
    for i, (t, beat, words, rel, inp) in enumerate(CUTS):
        e = CUTS[i + 1][0] if i + 1 < len(CUTS) else TITLE_AT
        rows.append(f'| {i + 1} | {t:05.2f}-{e:05.2f} | {beat} | {words} | {names.get(rel, '`' + rel + '`')} @ {inp:.1f} s |')
    rows.append(f'| {len(CUTS) + 1} | {TITLE_AT:05.2f}-{END:05.2f} | 8 Title | All the best! | title card (logo, ZHETALIS, TEAM ZHETALIS) over `{TITLE_BG[0]}` |')
    (TR / 'cut-list.md').write_text('# Zhetalis trailer - cut list\n\nTimes are seconds on the voice-over '
                                    '(`assets/voiceover.m4a`); each cut lands on the first word of its line.\n\n' + '\n'.join(rows) + '\n')


if __name__ == '__main__':
    build(); cut_list(); print('wrote', OUT)
