"""Zhetela art variants: more contrast, a colour accent on her stars, a small Mars mission patch, glow
versions for dark UIs, and round head-and-shoulders portraits (one rotated so her head is level).
Usage: python -I zhetela_variants.py SOURCE OUT_DIR"""
import math, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
base = Image.open(src).convert('RGBA')
W, H = base.size

# eye positions in the source (measured): left (465, 180), right (518, 155) -> face tilt about 25 degrees
EYE_L, EYE_R = (465, 180), (518, 155)
TILT = math.degrees(math.atan2(EYE_R[1] - EYE_L[1], EYE_R[0] - EYE_L[0]))   # negative = right eye higher
FACE = ((EYE_L[0] + EYE_R[0]) / 2, (EYE_L[1] + EYE_R[1]) / 2 + 30)          # roughly the nose


def contrast(img, k=1.18, sat=1.08):
    rgb, a = img.convert('RGB'), img.getchannel('A')
    rgb = ImageEnhance.Contrast(rgb).enhance(k)
    rgb = ImageEnhance.Color(rgb).enhance(sat)
    out_ = rgb.convert('RGBA'); out_.putalpha(a); return out_


def star_mask(img):
    """Small bright sparkles and the thin constellation lines on the dark dress: a white top-hat (bright detail
    smaller than about 7 px) where the surroundings are dark. Transparent pixels count as white, so the
    outline of the figure is never picked up, and the face and earrings are left alone."""
    arr = np.asarray(img).astype(np.float32)
    alpha = arr[..., 3:4] / 255
    lum = (arr[..., :3] * alpha + 255 * (1 - alpha)) @ np.array([.299, .587, .114], np.float32)
    L = Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8))
    opened = np.asarray(L.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))).astype(np.float32)
    around = np.asarray(L.filter(ImageFilter.GaussianBlur(9))).astype(np.float32)
    m = ((lum - opened) > 45) & (around < 150) & (arr[..., 3] > 220)
    m[100:330, 400:640] = False   # face, eyes and earrings stay as drawn
    m[520:615, 545:650] = False   # the hand on her hip
    m[200:330, 215:290] = False   # the waving hand
    return Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.8))


def accent_stars(img, colour):
    """Tint the dress's star sparkles and constellation lines, and add a faint glow round them."""
    mask = star_mask(img)
    tint = Image.new('RGBA', img.size, colour + (255,))
    res = img.copy()
    res.paste(Image.blend(img, tint, .55), (0, 0), mask)
    glow = Image.new('RGBA', img.size, colour + (0,))
    glow.putalpha(mask.filter(ImageFilter.GaussianBlur(3)).point(lambda v: min(255, int(v * .9))))
    glow_layer = Image.new('RGBA', img.size, (0, 0, 0, 0)); glow_layer.alpha_composite(glow)
    res = Image.alpha_composite(res, glow_layer)
    res.putalpha(img.getchannel('A'))
    return res


def mars_patch(size=72):
    """A small embroidered mission patch: navy rim, gold edge, Mars with an orbit and a star."""
    s = size * 4
    p = Image.new('RGBA', (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(p)
    d.ellipse((0, 0, s - 1, s - 1), fill=(214, 172, 86, 255))                  # gold edge
    d.ellipse((s * .06, s * .06, s * .94, s * .94), fill=(28, 36, 72, 255))     # navy field
    r = s * .26; cx = cy = s / 2
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(193, 84, 46, 255))        # Mars
    for dx, dy, rr in ((-.08, -.05, .06), (.07, .06, .045), (-.02, .1, .035)):
        d.ellipse((cx + dx * s - rr * s, cy + dy * s - rr * s, cx + dx * s + rr * s, cy + dy * s + rr * s), fill=(150, 58, 32, 255))
    d.ellipse((cx - r * .9, cy - r * .9 - r * .55, cx + r * .9, cy - r * .9 + r * .25), fill=None)
    d.arc((s * .12, s * .36, s * .88, s * .64), 200, 340, fill=(240, 220, 170, 255), width=int(s * .025))   # orbit, front half
    st = (s * .74, s * .26); k = s * .05
    d.polygon([(st[0], st[1] - k * 2), (st[0] + k * .5, st[1] - k * .5), (st[0] + k * 2, st[1]), (st[0] + k * .5, st[1] + k * .5),
               (st[0], st[1] + k * 2), (st[0] - k * .5, st[1] + k * .5), (st[0] - k * 2, st[1]), (st[0] - k * .5, st[1] - k * .5)], fill=(255, 236, 180, 255))
    return p.resize((size, size), Image.LANCZOS)


def add_patch(img, at=(548, 400), size=58):
    """On the drape over her left shoulder/chest, slightly rotated to follow the fabric."""
    patch = mars_patch(size).rotate(-12, resample=Image.BICUBIC, expand=True)
    shadow = Image.new('RGBA', patch.size, (0, 0, 0, 0)); shadow.putalpha(patch.getchannel('A').point(lambda v: v * .45))
    res = img.copy()
    res.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(2)), (at[0] - patch.width // 2 + 2, at[1] - patch.height // 2 + 3))
    res.alpha_composite(patch, (at[0] - patch.width // 2, at[1] - patch.height // 2))
    return res


def glow(img, colour, radius=18, strength=1.3):
    """A soft coloured aura behind the figure so she separates from a dark background."""
    a = img.getchannel('A').filter(ImageFilter.GaussianBlur(radius)).point(lambda v: min(255, int(v * strength)))
    aura = Image.new('RGBA', img.size, colour + (0,)); aura.putalpha(a)
    res = Image.new('RGBA', img.size, (0, 0, 0, 0)); res.alpha_composite(aura); res.alpha_composite(img)
    return res


def on_bg(img, colour):
    bg = Image.new('RGBA', img.size, colour + (255,)); bg.alpha_composite(img); return bg


def portrait(img, level, size=512, bg=(20, 27, 38), ring=(214, 172, 86), zoom=1.0):
    """Round head-and-shoulders portrait. level=True rotates about the face so the eyes are horizontal."""
    pad = 400
    big = Image.new('RGBA', (W + pad * 2, H + pad * 2), (0, 0, 0, 0)); big.alpha_composite(img, (pad, pad))
    fx, fy = FACE[0] + pad, FACE[1] + pad
    if level:
        big = big.rotate(TILT, resample=Image.BICUBIC, center=(fx, fy))   # PIL: positive = counter-clockwise
    half = int(230 / zoom)
    crop = big.crop((int(fx - half), int(fy - half * .95), int(fx + half), int(fy + half * 1.05))).resize((size, size), Image.LANCZOS)
    plate = Image.new('RGBA', (size, size), bg + (255,))
    # a soft light behind the head
    halo = Image.new('L', (size, size), 0); ImageDraw.Draw(halo).ellipse((size * .12, size * .02, size * .88, size * .78), fill=110)
    plate.paste(Image.new('RGBA', (size, size), (90, 110, 160, 255)), (0, 0), halo.filter(ImageFilter.GaussianBlur(size * .08)))
    plate.alpha_composite(crop)
    mask = Image.new('L', (size * 4, size * 4), 0); ImageDraw.Draw(mask).ellipse((8, 8, size * 4 - 8, size * 4 - 8), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    res = Image.new('RGBA', (size, size), (0, 0, 0, 0)); res.paste(plate, (0, 0), mask)
    d = ImageDraw.Draw(res); w = max(3, size // 64)
    d.ellipse((w // 2, w // 2, size - 1 - w // 2, size - 1 - w // 2), outline=ring + (255,), width=w)
    return res


GOLD, BLUE, LILAC = (255, 212, 120), (120, 200, 255), (196, 160, 255)
improved = add_patch(accent_stars(contrast(base), GOLD))
variants = {
    '01-original-for-comparison.png': base,
    '02-improved-gold-stars-mars-patch.png': improved,
    '03-improved-blue-stars-mars-patch.png': add_patch(accent_stars(contrast(base), BLUE)),
    '04-improved-gold-with-blue-glow-on-dark.png': on_bg(glow(improved, (110, 170, 255)), (16, 20, 30)),
    '05-improved-gold-with-lilac-glow-on-dark.png': on_bg(glow(improved, LILAC, 22, 1.1), (16, 20, 30)),
}
for name, img in variants.items():
    img.save(os.path.join(out, name))
portraits = {
    '10-portrait-head-level-gold.png': portrait(improved, True),
    '11-portrait-head-level-blue-ring.png': portrait(add_patch(accent_stars(contrast(base), BLUE)), True, ring=(120, 200, 255)),
    '12-portrait-original-tilt-gold.png': portrait(improved, False),
    '13-portrait-head-level-close.png': portrait(improved, True, zoom=1.45),
}
for name, img in portraits.items():
    img.save(os.path.join(out, name))
# small sizes as the game's guide box shows her
small = Image.new('RGBA', (3 * 112 + 4 * 16, 112 + 32), (20, 27, 38, 255))
for i, k in enumerate(['10-portrait-head-level-gold.png', '13-portrait-head-level-close.png', '12-portrait-original-tilt-gold.png']):
    small.alpha_composite(portraits[k].resize((112, 112), Image.LANCZOS), (16 + i * 128, 16))
small.save(os.path.join(out, '20-small-size-check.png'))
print('tilt', round(TILT, 1), 'saved', len(variants) + len(portraits) + 1, 'files to', out)
