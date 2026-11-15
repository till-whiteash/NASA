# Zhetalis trailer

A 35-second, 1080p trailer cut to the team's voice-over: ship, crew, the flight to Mars, building the base in
the game, hazards (radiation, dust storms), comms going down, the return to Earth and a welcome-home party,
then the title card. Subtitles are burned in, timed to the voice-over's word timings, and the Mars landing is
Ewan's live in-game landing sequence (`src/cutscenes.js` `playLanding`), captured frame by frame.

| File | What it is |
|---|---|
| `zhetalis-trailer-1080p.mp4` | The trailer: 1920×1080, 24 fps, H.264 + AAC voice-over |
| `cut-list.md` | Line-by-line cut list (written by `build_trailer.py`) |
| `voiceover-transcript.json` | Word-level timings of the voice-over (faster-whisper `small.en`, run locally) |
| `assets/voiceover.m4a` | The voice-over recording |
| `assets/BarlowCondensed-SemiBold.ttf` | Title font (SIL Open Font License, `assets/OFL.txt`) |
| `scripts/build_trailer.py` | **The edit project**: the `CUTS` table (timeline start, source clip, in-point) and the ffmpeg render |
| `scripts/make_title.py` | Title card layers (logo, ZHETALIS, TEAM ZHETALIS) in `build/` |
| `scripts/render_sources.sh` | Renders every Blender source clip into `clips/` |
| `scripts/render_range.py` | Renders a frame range of an existing film's `.blend` at 1080p without its baked captions |
| `scripts/shot_*.py` | New Blender shots, built with the films' own helpers (`../scripts/common.py`, `mars_kit.py`, `crew_kit.py`): `comms_down`, `radiation`, `return_earth`, `celebration` |
| `scripts/capture_gameplay.py` | Captures the in-game shots frame by frame from the running game: `game_build`, `game_walk`, `game_mine`, and Ewan's landing (`game_landing.mp4`, renamed to `ewan_landing.mp4`) |
| `blend/` | The new shots' `.blend` files |
| `clips/`, `build/` | Rendered source clips and title/subtitle layers (rebuildable, not committed) |

## Rebuild

From `scripts/` (Blender 5.3, ffmpeg, Python with Pillow and Playwright + Microsoft Edge):

```
sh render_sources.sh                 # Blender clips -> ../clips
python capture_gameplay.py ../clips && mv ../clips/game_landing.mp4 ../clips/ewan_landing.mp4
python make_title.py                 # title layers -> ../build
python build_trailer.py              # -> ../zhetalis-trailer-1080p.mp4 and ../cut-list.md
```

## Common changes

- **New logo:** `python make_title.py path/to/logo.png` (transparent PNG), then `python build_trailer.py`.
- **Different team name or title:** edit `TEAM` / `TITLE` at the top of `make_title.py`.
- **New voice-over:** replace `assets/voiceover.m4a`, re-time the `CUTS` table in `build_trailer.py` to the
  new word times (transcribe locally, e.g. with faster-whisper), and rebuild.
- **Subtitle text or timing:** edit the `SUBS` table in `build_trailer.py`.
- **Move a cut or swap a shot:** edit its row in `CUTS`; each cut runs until the next row's start time.
