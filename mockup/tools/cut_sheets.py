#!/usr/bin/env python3
"""Cut AI sprite sheets into trimmed, transparent PNGs for the mockup, and write sprites/sprites.js.

Needs Pillow, numpy and scipy. The nsfw_project venv has them:
  ../nsfw_project/.venv/bin/python -I mockup/tools/cut_sheets.py      (from the code folder's "untitled folder")

How a cell is cut:
  1. Remove the background connected to the cell's edge (colour sampled from the edge).
  2. If what is left is framed by a flat 'card' (Grok does this), remove that too. Up to two cards.
  3. Keep the largest piece plus pieces close to it; drop far-off specks (watermarks).
  4. Remove background showing through gaps inside the object.
  5. Unmix edge pixels from the background colour, so outlines carry no pink fringe.
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
MOCKUP = os.path.dirname(HERE)
EXTRAS = os.path.join(MOCKUP, '..', 'extras')
OUT = os.path.join(MOCKUP, 'sprites')

NUV = ['palm', 'pine', 'oak', 'ancient', 'berrybush', 'driftwood', 'boulder', 'resonant',
       'cottage', 'fishinghut', 'campfire', 'chest', 'drill', 'tent', 'pillars', 'deadtree']
INDO = ['cypress', 'chinar', 'rosebush', 'pavilion', 'windcatcher', 'iwan', 'stepwell', 'carpetstall']

# set name, file in extras/, columns, rows, object names in reading order
SHEETS = [
    ('gemini_nuv', 'Gemini_Generated_Image_z2yof6z2yof6z2yo.png', 4, 4, NUV),
    ('grok_nuv', 'rY690.png', 4, 4, NUV),
    ('gemini_indo', 'Gemini_Generated_Image_fiealrfiealrfiea.png', 4, 2, INDO),
    ('grok_indo', 'pHpuW.jpg', 4, 2, INDO),
]
MAX_SIDE = 384


def flood_remove(img, allowed, seeds, colour, tol):
    """Pixels close to `colour` that connect (within `allowed`) to any seed pixel."""
    d = np.linalg.norm(img - colour, axis=2)
    cand = allowed & (d < tol)
    lab, _ = ndi.label(cand)
    hit = np.unique(lab[seeds & cand])
    return np.isin(lab, hit[hit > 0])


def cut_cell(cell):
    H, W, _ = cell.shape
    keep = np.ones((H, W), bool)
    removed = np.zeros((H, W), bool)
    bgcol = np.zeros((H, W, 3), np.float32)

    ring = np.zeros((H, W), bool)
    ring[:3, :] = ring[-3:, :] = ring[:, :3] = ring[:, -3:] = True
    A = np.median(cell[ring], axis=0)
    rem = flood_remove(cell, keep, ring, A, 48)
    removed |= rem
    bgcol[rem] = A
    keep &= ~rem

    bg_colours = [A]
    for _ in range(2):  # flat cards left around the object (Grok)
        if not keep.any():
            break
        band = ndi.binary_erosion(keep, iterations=3) & ~ndi.binary_erosion(keep, iterations=6)
        cols = cell[band]
        if len(cols) < 50:
            break
        B = np.median(cols, axis=0)
        if (np.linalg.norm(cols - B, axis=1) < 25).mean() < 0.8:
            break
        rem = flood_remove(cell, keep, band, B, 70)
        if rem.sum() < 0.02 * H * W:
            break
        removed |= rem
        bgcol[rem] = B
        keep &= ~rem
        bg_colours.append(B)

    for colour in bg_colours:  # background showing through gaps inside the object
        cand = keep & (np.linalg.norm(cell - colour, axis=2) < 40)
        lab2, n2 = ndi.label(cand)
        if n2:
            sz = ndi.sum(cand, lab2, range(1, n2 + 1))
            big = np.isin(lab2, 1 + np.where(sz >= 6)[0])
            removed |= big
            bgcol[big] = colour
            keep &= ~big

    lab, n = ndi.label(keep)
    if n == 0:
        return None
    sizes = ndi.sum(keep, lab, range(1, n + 1))
    obj = lab == (1 + int(np.argmax(sizes)))
    reach = max(4, int(0.04 * min(H, W)))
    com = ndi.center_of_mass(keep, lab, range(1, n + 1))
    # watermarks: small separate pieces in the bottom-right of the cell
    corner = [cy > 0.7 * H and cx > 0.7 * W and sz < 0.1 * sizes.max() for (cy, cx), sz in zip(com, sizes)]
    main_id = 1 + int(np.argmax(sizes))
    for _ in range(3):  # pull in pieces near the object (two pillars, flames over logs)
        near = ndi.binary_dilation(obj, iterations=reach)
        ids = np.unique(lab[near & keep])
        ids = [i for i in ids[ids > 0] if sizes[i - 1] >= 30 and (i == main_id or not corner[i - 1])]
        grown = np.isin(lab, ids)
        if grown.sum() == obj.sum():
            break
        obj = grown

    bgcol[~removed] = A  # dropped specks count as background
    # Edge pixels are a mix of object and background. Unmix each one against the background colour
    # next to it and the object colour a few pixels inside it.
    dist, (iy, ix) = ndi.distance_transform_edt(obj, return_indices=True)
    near_bg = bgcol[iy, ix]
    inner = obj & (dist >= 4)
    if inner.any():
        _, (fy, fx) = ndi.distance_transform_edt(~inner, return_indices=True)
        F = cell[fy, fx]
    else:
        F = cell
    alpha = np.where(obj, 1.0, 0.0).astype(np.float32)
    out = cell.copy()
    edge = obj & (dist <= 4)
    P, BG, FG = cell[edge], near_bg[edge], F[edge]
    v = FG - BG
    denom = (v * v).sum(1)
    a = np.clip(((P - BG) * v).sum(1) / np.maximum(denom, 1.0), 0, 1)
    a[denom < 900] = 1.0  # object colour too close to the background to tell apart: keep as is
    a[a < 0.06] = 0
    alpha[edge] = a
    out[edge] = (P - (1 - a)[:, None] * BG) / np.maximum(a, 0.05)[:, None]
    out[alpha <= 0] = 0
    out = np.clip(out, 0, 255)

    ys, xs = np.where(alpha > 0.02)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([out, alpha * 255]).astype(np.uint8)[y0:y1, x0:x1]
    return rgba


def base_point(a):
    """Where the object meets the ground, as fractions of width and height: the lowest solid rows."""
    h, w = a.shape
    rows = np.where((a > 128).any(axis=1))[0]
    yb = rows.max()
    top = max(0, yb - int(0.06 * h))
    ys, xs = np.where(a[top:yb + 1] > 128)
    return float(xs.mean()) / w, float(yb + 1) / h


def main():
    manifest = {}
    for name, fname, cols, rows, names in SHEETS:
        sheet = np.asarray(Image.open(os.path.join(EXTRAS, fname)).convert('RGB'), np.float32)
        H, W, _ = sheet.shape
        os.makedirs(os.path.join(OUT, name), exist_ok=True)
        items = []
        for k, obj_name in enumerate(names):
            r, c = divmod(k, cols)
            cy0, cy1 = round(r * H / rows), round((r + 1) * H / rows)
            cx0, cx1 = round(c * W / cols), round((c + 1) * W / cols)
            rgba = cut_cell(sheet[cy0:cy1, cx0:cx1])
            if rgba is None:
                print(f'  {name} {obj_name}: nothing found')
                items.append(None)
                continue
            im = Image.fromarray(rgba)
            scale = min(1.0, MAX_SIDE / max(im.size))
            if scale < 1:  # resize premultiplied so edges do not pick up dark fringes
                im = im.convert('RGBa').resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS).convert('RGBA')
            bx, by = base_point(np.asarray(im)[..., 3])
            rel = f'sprites/{name}/{k:02d}_{obj_name}.png'
            im.save(os.path.join(MOCKUP, rel))
            items.append({'f': rel, 'w': im.width, 'h': im.height, 'bx': round(bx, 3), 'by': round(by, 3)})
            print(f'  {name} {obj_name}: {im.width}x{im.height}')
        manifest[name] = items
    with open(os.path.join(OUT, 'sprites.js'), 'w') as f:
        f.write('// Written by tools/cut_sheets.py. Do not edit by hand.\n')
        f.write('window.SPRITES = ' + json.dumps(manifest, indent=1) + ';\n')
    print('wrote sprites/sprites.js')


if __name__ == '__main__':
    main()
