"""Export the desktop app's actual portrait and motion for the web guide."""
import sys
from pathlib import Path
sys.path.insert(0, r'C:\Zhetela')
from character_art import load_portraits, fit_art, load_standard_portrait_wave
from portrait_motion import render_pose

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
assets = Path(r'C:\Zhetela\assets')
portrait = fit_art(load_portraits(assets)[0], 192, 192)
portrait.save(out / 'portrait.webp', quality=92, method=6)
for kind in ('idle', 'speaking'):
    frames = [render_pose(portrait, kind, i/24) for i in range(24)]
    frames[0].save(out / (kind+'.webp'), save_all=True, append_images=frames[1:],
                   duration=333 if kind=='idle' else 167, loop=0, quality=85, method=4)
frames = load_standard_portrait_wave(assets, 192, 24)
frames[0].save(out/'wave.webp', save_all=True, append_images=frames[1:], duration=100,
               loop=0, quality=85, method=4)
print([(p.name,p.stat().st_size) for p in out.glob('*.webp')])
