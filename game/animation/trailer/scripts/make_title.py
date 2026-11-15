"""Title card layers for the trailer's last shot (1920x1080 transparent PNGs, faded in one after another by
build_trailer.py): the Zhetalis mark, the game title, and the team name underneath.
Swap the logo: pass a PNG path (white or coloured, transparent background) -> python make_title.py [logo.png]
Team name and title are below; the font is Barlow Condensed SemiBold (OFL, assets/OFL.txt)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

TITLE = 'ZHETALIS'
TEAM = 'TEAM ZHETALIS'
HERE = Path(__file__).resolve().parent
TRAILER = HERE.parent
LOGO = Path(sys.argv[1]) if len(sys.argv) > 1 else TRAILER.parents[1] / 'assets' / 'zhetalis-mark.png'
FONT = str(TRAILER / 'assets' / 'BarlowCondensed-SemiBold.ttf')
OUT = TRAILER / 'build'; OUT.mkdir(exist_ok=True)
W, H = 1920, 1080


def glow(layer, radius=18, strength=0.55):
    """Soft halo behind white artwork so it reads over a busy background."""
    a = layer.split()[3].filter(ImageFilter.GaussianBlur(radius)).point(lambda v: int(v * strength))
    halo = Image.new('RGBA', layer.size, (255, 150, 90, 0)); halo.putalpha(a)
    return Image.alpha_composite(halo, layer)


def tracked(draw, cx, y, text, font, fill, tracking):
    widths = [draw.textlength(c, font=font) for c in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = cx - total / 2
    for c, w in zip(text, widths):
        draw.text((x, y), c, font=font, fill=fill); x += w + tracking


# 1. the mark
logo = Image.open(LOGO).convert('RGBA')
k = 380 / logo.height
logo = logo.resize((int(logo.width * k), int(logo.height * k)), Image.LANCZOS)
mark = Image.new('RGBA', (W, H)); mark.paste(logo, ((W - logo.width) // 2, 120), logo)
glow(mark, 22, 0.5).save(OUT / 'title_mark.png')

# 2. the game title
t = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(t)
tracked(d, W / 2, 520, TITLE, ImageFont.truetype(FONT, 210), (255, 255, 255, 255), 26)
glow(t, 16, 0.45).save(OUT / 'title_name.png')

# 3. the team name, with a thin rule above it
s = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(s)
d.rectangle((W / 2 - 170, 800, W / 2 + 170, 803), fill=(255, 154, 90, 230))
tracked(d, W / 2, 822, TEAM, ImageFont.truetype(FONT, 60), (255, 190, 140, 255), 14)
s.save(OUT / 'title_team.png')

# preview of all three over black
prev = Image.new('RGBA', (W, H), (8, 6, 10, 255))
for p in ('title_mark', 'title_name', 'title_team'):
    prev = Image.alpha_composite(prev, Image.open(OUT / f'{p}.png'))
prev.convert('RGB').save(OUT / 'title_preview.jpg', quality=90)
print('title layers in', OUT)
