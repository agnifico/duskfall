#!/usr/bin/env python3
"""Put a grown nation map together, after Gemini has painted around the input from make_nation_canvas.py.

  ../nsfw_project/.venv/bin/python -I tools/compose_nation.py extras/<gemini result>.png

1. Scales Gemini's result up to the new map's full size.
2. Covers Gemini's sparkle mark (bottom-right) with nearby open sea.
3. Pastes the original map back on top at full size, through the soft-edged kept area, so the island
   is exactly as it was.
4. Moves everything placed on the old map (zone labels, detail patches, every point's pin) by the
   offset, and adds zones for the new islands. This only happens once: if the nation file already has
   the new size, the content is left alone.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NATION = 'nuvatra'
NEW_ZONES = [  # zones for the new islands: id, name, which shape in the layout their label sits on
    ('pleasure-island', 'Pleasure Island', 'hela'),
    ('saints-base', "Saints' Base", 'saints'),
    ('glacier-isles', 'Glacier Isles', 'ice-2'),
]


def cover_mark(im: Image.Image, box: tuple[int, int, int, int]) -> None:
    """Cover a mark with the patch of nearby open sea whose border best matches the box's border."""
    a = np.asarray(im).astype(np.float32)
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    ring = np.ones((h, w), bool)
    ring[8:-8, 8:-8] = False
    target = a[y0:y1, x0:x1][ring]
    best = None
    for sy in range(max(0, y0 - 500), min(a.shape[0] - h, y0 + 1), 12):
        for sx in range(max(0, x0 - 900), min(a.shape[1] - w, x0 + 1), 12):
            if abs(sx - x0) < w and abs(sy - y0) < h:
                continue
            cand = a[sy:sy + h, sx:sx + w]
            if (cand[..., 1] - (cand[..., 0] + cand[..., 2]) / 2).max() > 20:  # no land
                continue
            err = np.abs(cand[ring] - target).mean()
            if best is None or err < best[0]:
                best = (err, sx, sy)
    _, sx, sy = best
    src = im.crop((sx, sy, sx + w, sy + h))
    m = Image.new('L', (w, h), 0)
    m.paste(255, (14, 14, w - 14, h - 14))
    im.paste(src, (x0, y0), m.filter(ImageFilter.GaussianBlur(7)))


def find_mark(im: Image.Image) -> tuple[int, int, int, int]:
    """Gemini's sparkle: a pale grey star near the bottom-right corner, on dark sea."""
    a = np.asarray(im).astype(np.int32)
    H, W = a.shape[:2]
    y0, x0 = H - H // 6, W - W // 10
    reg = a[y0:, x0:]
    mx, mn = reg.max(2), reg.min(2)
    m = (mx > 150) & ((mx - mn) < 45)
    ys, xs = np.where(m)
    if len(ys) == 0:
        return (0, 0, 0, 0)
    cy, cx = int(np.median(ys)), int(np.median(xs))
    r = max(30, int(0.035 * W))
    return (x0 + cx - r, y0 + cy - r, x0 + cx + r, y0 + cy + r)


def keep_alpha(original: Image.Image) -> Image.Image:
    """Where the original shows through: fully on the island, its surf and anything in KEEP_NEAR; its water
    blends into Gemini's over SHORE_BLEND px from the shore, so the two seas meet without a rim."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from make_nation_canvas import KEEP_NEAR, land_mask
    from scipy import ndimage as ndi
    land = land_mask(np.asarray(original).astype(np.int32))
    lab, n = ndi.label(land)
    sizes = ndi.sum(land, lab, range(1, n + 1))
    keep = lab == (1 + int(np.argmax(sizes)))
    for x, y in KEEP_NEAR:
        near = lab[max(0, y - 40):y + 40, max(0, x - 40):x + 40]
        for i in np.unique(near[near > 0]):
            keep |= lab == i
    d = ndi.distance_transform_edt(~keep)
    t = np.clip(1 - d / SHORE_BLEND, 0, 1)
    return Image.fromarray((t * t * (3 - 2 * t) * 255).astype(np.uint8))


SHORE_BLEND = 60  # px


def main():
    meta = json.load(open(os.path.join(ROOT, f'tools/nation_{NATION}.json')))
    result = Image.open(sys.argv[1]).convert('RGB')
    box = find_mark(result)
    if box[2] > box[0]:
        cover_mark(result, box)
    full = result.resize(tuple(meta['full']), Image.LANCZOS)

    # the original map: from its saved copy if this has run before (the source file is the new map by then)
    old_copy = os.path.join(ROOT, f'extras/{NATION}_map_before_growing.webp')
    if not os.path.exists(old_copy):
        Image.open(os.path.join(ROOT, meta['source'])).convert('RGB').save(old_copy, quality=95)
    original = Image.open(old_copy).convert('RGB')
    full.paste(original, tuple(meta['offset']), keep_alpha(original))
    full.save(os.path.join(ROOT, meta['source']), quality=84, method=6)

    a = np.asarray(full).astype(np.float32)
    edge = np.concatenate([a[:24].reshape(-1, 3), a[-24:].reshape(-1, 3), a[:, :24].reshape(-1, 3), a[:, -24:].reshape(-1, 3)])
    sea = '#%02x%02x%02x' % tuple(int(v) for v in np.median(edge, axis=0))

    # content: once only
    land_path = os.path.join(ROOT, f'game/src/content/lands/{NATION}.json')
    land = json.load(open(land_path))
    if land['map']['width'] == meta['size'][0] and land['map']['height'] == meta['size'][1]:
        ox, oy = meta['offset']
        land['map'].update({'width': meta['full'][0], 'height': meta['full'][1], 'sea': sea})
        for z in land['zones']:
            z['label'] = [z['label'][0] + ox, z['label'][1] + oy]
        for p in land.get('patches', []):
            p['rect'] = [p['rect'][0] + ox, p['rect'][1] + oy, p['rect'][2], p['rect'][3]]
        for zid, name, shape in NEW_ZONES:
            c = meta['shapes'][shape]['centre']
            land['zones'].append({'id': zid, 'name': name, 'label': [c[0], c[1]], 'locked': 'later'})
        write_json(land_path, land)
        zone_ids = {z['id'] for z in land['zones']}
        points_dir = os.path.join(ROOT, 'game/src/content/points')
        for f in sorted(os.listdir(points_dir)):
            path = os.path.join(points_dir, f)
            p = json.load(open(path))
            if p.get('zone') in zone_ids:
                p['pin'] = [p['pin'][0] + ox, p['pin'][1] + oy]
                write_json(path, p)
        print(f'moved zones, patches and pins by {ox},{oy}; sea {sea}')
    else:
        print('content already on the new map size; left alone')
    print(f'wrote {meta["source"]} at {meta["full"][0]}x{meta["full"][1]}')


def write_json(path: str, data) -> None:
    """Indented, with short lists ([x, y], tables) and one-line zone and patch entries, as the files are written by hand."""
    import re
    txt = json.dumps(data, indent=2, ensure_ascii=False)
    txt = re.sub(r'\[\n\s+(-?[\d.]+),\n\s+(-?[\d.]+)(?:,\n\s+(-?[\d.]+),\n\s+(-?[\d.]+))?\n\s+\]',
                 lambda m: '[' + ', '.join(g for g in m.groups() if g is not None) + ']', txt)
    txt = re.sub(r'"table": \[\n((?:\s+"[^"]*",?\n)*)\s+\]',
                 lambda m: '"table": [' + ', '.join(x.strip().rstrip(',') for x in m.group(1).strip().split('\n')) + ']', txt)
    txt = re.sub(r'\{\n\s+((?:"[^"]+": (?:"[^"]*"|\[[^\]]*\]|-?[\d.]+),?\n\s+){1,4}"[^"]+": (?:"[^"]*"|\[[^\]]*\]|-?[\d.]+))\n\s+\}',
                 lambda m: '{ ' + re.sub(r',\n\s+', ', ', m.group(1)) + ' }', txt)
    open(path, 'w').write(txt + '\n')


if __name__ == '__main__':
    main()
