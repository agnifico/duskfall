#!/usr/bin/env python3
"""Bring a character's art into the game: a portrait, the full set of images, and thumbnails.

  ../nsfw_project/.venv/bin/python -I tools/import_character_art.py <folder in extras, e.g. characters/mc> <character id> \\
      --portrait X,Y,SIZE [--player]

The folder holds avatar.jpg (a bust), full.jpg (full body) and side.jpg, plus any other images.
Writes game/public/characters/<id>/:
  portrait.webp       a square crop of avatar.jpg: SIZE px wide with its top-left corner at X,Y (source pixels)
  <name>.webp         every image, up to 1600 px tall, with Grok's watermark (bottom-right) covered
  <name>.thumb.webp   the same, 300 px tall
Then sets `portrait` and `art` on the character: in content/player.json with --player, otherwise on
content/npcs.json[<id>]. The art is ordered full, avatar, side, then the rest in the order they were made.
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'game/src/content')
MAX_H = 1600
THUMB_H = 300
FIRST = ['full', 'avatar', 'side']


def cover_grok(im: Image.Image) -> Image.Image:
    """Grok marks the bottom-right corner, at a size proportional to the image's width. Cover that corner
    with the strip of image just above it, blended in along its top and left edges."""
    im = im.copy()
    W, H = im.size
    x0, y0 = round(W - 0.11 * W), round(H - 0.062 * W)
    w, h = W - x0, H - y0
    src = im.crop((x0, y0 - h, W, y0))
    feather = 12
    ramp_x = np.clip(np.arange(w) / feather, 0, 1)
    ramp_y = np.clip(np.arange(h) / feather, 0, 1)
    mask = Image.fromarray((np.minimum.outer(ramp_y, ramp_x) * 255).astype(np.uint8))
    im.paste(src, (x0, y0), mask)
    return im


def fit_height(im: Image.Image, h: int) -> Image.Image:
    if im.height <= h:
        return im
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder')
    ap.add_argument('id')
    ap.add_argument('--portrait', required=True, help='X,Y,SIZE of the square face crop in avatar.jpg')
    ap.add_argument('--player', action='store_true')
    a = ap.parse_args()

    src_dir = os.path.join(ROOT, 'extras', a.folder)
    out_rel = f'characters/{a.id}'
    out_dir = os.path.join(ROOT, 'game/public', out_rel)
    os.makedirs(out_dir, exist_ok=True)

    files = [f for f in os.listdir(src_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    stem = lambda f: os.path.splitext(f)[0]
    named = [f for n in FIRST for f in files if stem(f) == n]
    rest = sorted((f for f in files if f not in named), key=lambda f: os.path.getmtime(os.path.join(src_dir, f)))

    art = []
    for f in named + rest:
        im = cover_grok(Image.open(os.path.join(src_dir, f)).convert('RGB'))
        name = stem(f)
        fit_height(im, MAX_H).save(os.path.join(out_dir, f'{name}.webp'), quality=86, method=6)
        fit_height(im, THUMB_H).save(os.path.join(out_dir, f'{name}.thumb.webp'), quality=80, method=6)
        art.append(f'{out_rel}/{name}.webp')

    x, y, size = (int(v) for v in a.portrait.split(','))
    avatar = Image.open(os.path.join(src_dir, next(f for f in files if stem(f) == 'avatar'))).convert('RGB')
    avatar.crop((x, y, x + size, y + size)).resize((512, 512), Image.LANCZOS).save(
        os.path.join(out_dir, 'portrait.webp'), quality=88, method=6)
    portrait = f'{out_rel}/portrait.webp'

    if a.player:
        path = os.path.join(CONTENT, 'player.json')
        data = json.load(open(path))
        data['portrait'], data['art'] = portrait, art
    else:
        path = os.path.join(CONTENT, 'npcs.json')
        data = json.load(open(path))
        entry = data.setdefault(a.id, {'name': a.id.capitalize(), 'point': '', 'lines': []})
        entry['portrait'], entry['art'] = portrait, art
    with open(path, 'w') as fh:
        fh.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print(f'{a.id}: portrait and {len(art)} images in public/{out_rel}; updated {os.path.relpath(path, ROOT)}')


if __name__ == '__main__':
    main()
