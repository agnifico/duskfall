#!/usr/bin/env python3
"""Cut AI sprite sheets into trimmed, transparent PNGs for the game.

Writes game/public/sprites/<set>/<name>.png and game/src/content/sprites.json.
Needs Pillow, numpy and scipy. The nsfw_project venv has them. From this project's root:
  ../nsfw_project/.venv/bin/python -I tools/cut_sheets.py

To add a sheet: put it in extras/sheets/<kind>/ and add a line to SHEETS below (paths are relative to extras/).
Sheets replaced by newer ones live in extras/superseded/; nothing reads them.
Single images that already have a transparent background (djv2's enemies) go in SINGLES: they are only
trimmed, shrunk and measured. `--singles` processes just those and keeps the rest of the manifest.

How a cell is cut:
  0. Sheets in OVERFLOW are cut from a window larger than the cell, because their objects (figures) spill
     past the cell's edges; only the piece whose centre lies in the cell is kept.
  1. Remove the background connected to the cell's edge (colour sampled from the edge).
  2. If what is left is framed by a flat 'card' (Grok does this), remove that too. Up to two cards.
  3. Keep the largest piece plus pieces close to it; drop far-off specks (watermarks).
  4. Remove background showing through gaps inside the object.
  5. Unmix edge pixels from the background colour, so outlines carry no pink fringe.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
EXTRAS = os.path.join(ROOT, 'extras')
PUBLIC = os.path.join(ROOT, 'game', 'public')
MANIFEST = os.path.join(ROOT, 'game', 'src', 'content', 'sprites.json')

NUV = ['palm', 'pine', 'oak', 'ancient', 'berrybush', 'driftwood', 'boulder', 'resonant',
       'cottage', 'fishinghut', 'campfire', 'chest', 'drill', 'tent', 'pillars', 'deadtree']
INDO = ['cypress', 'chinar', 'rosebush', 'pavilion', 'windcatcher', 'iwan', 'stepwell', 'carpetstall']
ITEMS = ['wood', 'stone', 'etherwood', 'silver', 'malachite', 'gold', 'redcrystal', 'birchbark',
         'acorns', 'clover', 'brownmushroom', 'redmushroom', 'bluemushroom', 'herbs', 'berries', 'resin']
NODES = ['tree', 'birch', 'oak', 'etherwood', 'stump', 'sapling', 'smallstones', 'boulder',
         'bouldercluster', 'silvervein', 'malachitevein', 'goldvein', 'redvein', 'rubble', 'berrybush', 'mushrooms']
WRECK = ['planks', 'mast', 'barrel', 'crate', 'rowboat', 'searock', 'net', 'figurehead',
         'reef', 'sandbar', 'door', 'seachest', 'wheel', 'lantern', 'seagull', 'bleachedwood']
ICONS1 = ['health', 'spirit', 'energy', 'attack', 'defence', 'speed', 'evasion', 'precision', 'crit', 'critdmg',
          'level', 'resonance', 'xp', 'coins', 'time', 'objective', 'bag', 'quests', 'character', 'map',
          'settings', 'people', 'rest', 'search']
# None: a cell left out (a redo replaces it, or the skill was dropped)
SKILLS = ['strike', None, 'whirl', 'guard', 'heavy', None, 'heal', 'focus', 'cleave', None, 'counter', None]
SKILLS_REDO = ['dash', 'sling', None, 'warcry']
LIFESKILLS = ['woodcutting', 'mining', 'herblore', 'foraging', 'fishing', 'cooking', 'smithing', 'alchemy',
              'crafting', 'farming', 'hunting', 'carpentry']
ARMOUR = ['head', 'body', 'hands', 'legs', 'feet']
GEAR = [f'{row}_{piece}' for row, extra in [('traveller', 'cloak'), ('padded', 'pouchbelt'), ('iron', 'starbelt'),
                                            ('silversteel', 'chainskirt')] for piece in ARMOUR + [extra]]
ELEM1 = [f'{row}_{piece}' for row in ['fire', 'water', 'wind', 'earth'] for piece in ARMOUR + ['bow']]
ELEM2 = [f'{row}_{piece}' for row in ['fire', 'water', 'air', 'earth'] for piece in ARMOUR + ['bow']]
TIERS = ['traveller', 'iron', 'silversteel', 'adamantine']
WEAPONS = [f'{t}_{w}' for t in TIERS for w in ['sword', 'dagger', 'mace', 'axe', 'spear', 'staff']]
OFFHAND = [f'{t}_{w}' for t in TIERS for w in ['bow', 'shield', 'quiver']]
ICONS2 = ['woodcutting', 'mining', 'herblore', 'foraging', 'fishing', 'cooking', 'smithing', 'alchemy',
          'hatchet', 'pickaxe', 'sickle', 'rod', 'tools', 'crafting', 'locked', 'unknown',
          'strike', 'dash', 'whirl', 'guard', 'heavy', 'sling', 'heal', 'focus']

# set name, file in extras/, columns, rows, object names in reading order
SHEETS = [
    ('gemini_nuv', 'sheets/props/Gemini_Generated_Image_z2yof6z2yof6z2yo.png', 4, 4, NUV),
    ('grok_nuv', 'sheets/props/rY690.png', 4, 4, NUV),
    ('gemini_indo', 'sheets/props/Gemini_Generated_Image_fiealrfiealrfiea.png', 4, 2, INDO),
    ('grok_indo', 'sheets/props/pHpuW.jpg', 4, 2, INDO),
    ('grok_items', 'sheets/items/Tx2vt.jpg', 4, 4, ITEMS),
    ('grok_nodes', 'sheets/props/mlKS4.jpg', 4, 4, NODES),
    ('grok_wreck', 'sheets/props/kpSkq.jpg', 4, 4, WRECK),
    ('icons', 'sheets/icons/icons_grok_1.jpg', 6, 4, ICONS1),
    ('icons', 'sheets/icons/icons_grok_2.jpg', 6, 4, ICONS2),
    ('skills', 'sheets/skills/rVCjL.jpg', 4, 3, SKILLS),
    ('skills', 'sheets/skills/P4CD6.jpg', 4, 1, SKILLS_REDO),
    ('lifeskills', 'sheets/skills/7Uoau.jpg', 4, 3, LIFESKILLS),
    # relics, named by Dawn's Journey's relic ids. Most from the 5×3 sheet, whose right column was cut off;
    # those, and the Dragon Rider helmet (preferred), from the 4×4 redo.
    # weapons: Gemini's sheets (Grok's zTHQI.jpg was the alternative: more uniform, less varied)
    ('weapons', 'sheets/weapons/Gemini_Generated_Image_8gzo6i8gzo6i8gzo.png', 6, 4, WEAPONS),
    ('weapons', 'sheets/weapons/Gemini_Generated_Image_w7bviow7bviow7bv.png', 3, 4, OFFHAND),
    ('relics', 'sheets/relics/LHnI3.jpg', 5, 3, ['helas_whip', 'helas_corset', 'garter_straps', 'spiked_choker', None,
                                   'the_fire_dress', 'hellfire_crown', 'command_of_hell', 'magma_fossil', None,
                                   'ring_of_the_sky', 'sky_bracers', 'sky_amulet', None, None]),
    ('relics', 'sheets/relics/zdLfV.jpg', 4, 4, [None, None, None, None, 'drops_of_fire', None, None, None,
                                   None, None, None, 'dragon_rider_helmet', None, 'seabed_fossil', 'dragon_tooth_amulet', None]),
    # armour: five pieces a set; the sixth column is a relic (base sets) or a bow (elemental sets)
    # Gemini's magenta, shadowless edits of the grey sheets (VGGtw, Fwbvp, VbU0u → rqrn8o, which had four pieces
    # redrawn in place). The base sheet's iron boots are plate here, so cphcu.jpg's redo isn't needed.
    ('gear', 'sheets/gear/Gemini_Generated_Image_ety6byety6byety6.png', 6, 4, GEAR),
    ('elem1', 'sheets/gear/Gemini_Generated_Image_6esdc76esdc76esd.png', 6, 4, ELEM1),  # Grok's own design: the lower tier
    ('elem2', 'sheets/gear/Gemini_Generated_Image_ljtt27ljtt27ljtt.png', 6, 4, ELEM2),  # Gemini's design: the higher tier  # glyph only (see GLYPH); the UI draws the disc
    ('grok_chars', 'sheets/chars/7pwSI.jpg', 2, 2, ['heroine-stand', 'heroine-walk', 'sylvie-stand', 'sylvie-walk']),
]
# set name, folder in extras/, file names without .png. Each image is one object on a transparent background.
# Left out until their backgrounds are cut: bob, inkjet_ray, rock_lion, shark_soldier.
SINGLES = [
    ('djv2', 'enemies/djv2_enemies', ['aquamech_shark', 'archangel_one', 'bear', 'bear1', 'biceon', 'coral_eyes', 'dragon',
                              'forest_prowler', 'mountain_basilisk', 'punching_tortoise', 'solis_sentinel', 'toxolotl',
                              'vanguard_siren', 'white_wyvern', 'wilhemina']),
]
MAX_SIDE = 384
DESPILL = {'grok_chars'}  # sheets with no magenta in them: remove any magenta cast entirely
OVERFLOW = {'grok_chars': 0.15, 'gear': 0.2, 'elem1': 0.2, 'elem2': 0.2, 'relics': 0.2, 'weapons': 0.2}  # sheets whose objects spill past their cells: cut from a window this much larger
# Per-set overrides for cut_cell. icons: plain grey sheet, no cards to strip (a flat silhouette is not one), and
# only near-exact grey counts as a gap. skills: badges on white, whose white highlights must never count as gaps.
# One-colour glyph sheets (light glyph on a dark disc): cut by brightness into the glyph colour on transparent.
GLYPH = {'lifeskills'}
WATERMARK = set()  # sets whose sheet has Grok's mark in the bottom-right corner: painted over with the ground first
# Something touching an object that isn't part of it (a neighbour, a watermark): rectangles (y0, y1, x0, x1) in
# sheet pixels, painted over with the ground for that object only.
HIDE = {('gear', 'silversteel_chainskirt'): [(1566, 1696, 2335, 2526), (1612, 1696, 2290, 2335)]}  # Gemini + Grok marks
# magenta sheets: pairs stay together; watermarks and stray flecks fall under min_part
GEAR_CUT = dict(cards=False, reach=0.15, min_part=0.25, key=True)
CUT = {'gear': GEAR_CUT, 'elem1': GEAR_CUT, 'elem2': GEAR_CUT, 'relics': GEAR_CUT, 'weapons': GEAR_CUT, 'icons': dict(cards=False, gap_tol=16, speck_tol=18), 'skills': dict(cards=False, gap_tol=0, speck_tol=0)}


def flood_remove(img, allowed, seeds, colour, tol):
    """Pixels close to `colour` that connect (within `allowed`) to any seed pixel."""
    d = np.linalg.norm(img - colour, axis=2)
    cand = allowed & (d < tol)
    lab, _ = ndi.label(cand)
    hit = np.unique(lab[seeds & cand])
    return np.isin(lab, hit[hit > 0])


def cut_cell(cell, inside=True, despill=False, home=None, cards=True, gap_tol=40, speck_tol=75, shadow=False, reach=0.04, gap_min=0.0, min_part=0.0, key=False):
    """home: (y0, y1, x0, x1) of the cell inside a larger window. Only pieces centred in it are kept.
    shadow: the sheet draws a soft grey drop shadow under each object; keep it as see-through black.
    reach: how far (share of the cell) a separate piece may sit from the main one and still belong (pairs).
    gap_min: smallest gap (share of the cell) that counts as background showing through (inside a bow).
    min_part: smallest separate piece, as a share of the main piece, that still belongs to it.
    key: chroma-key a magenta ground everywhere in the object, not just at its outline: any pixel with a
    magenta cast (glow, wisps, shaded crevices) is part ground, so it turns part see-through and gets its
    own colour back. Pink parts of the object itself (coral) lose some of their pink."""
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

    shade = np.zeros((H, W), bool)
    if shadow:
        # Drop shadows: grey, darker than the ground, and smooth, joined to the ground. Silver is grey too,
        # but it has texture, so the smoothness test keeps the flood out of it.
        L = cell.mean(axis=2)
        bgL = float(A.mean())
        chroma = cell.max(axis=2) - cell.min(axis=2)
        grad = ndi.gaussian_gradient_magnitude(L, 1.5)
        cand = keep & (chroma < 14) & (L < bgL - 2) & (L > 0.4 * bgL) & (grad < 2.5)
        lab_s, _ = ndi.label(cand)
        hit = np.unique(lab_s[ndi.binary_dilation(removed) & cand])
        shade = np.isin(lab_s, hit[hit > 0])
        removed |= shade
        bgcol[shade] = cell[shade]
        keep &= ~shade

    bg_colours = [A]
    for _ in range(2 if cards else 0):  # flat cards left around the object (Grok)
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
        cand = keep & (np.linalg.norm(cell - colour, axis=2) < gap_tol)
        lab2, n2 = ndi.label(cand)
        if n2:
            sz = ndi.sum(cand, lab2, range(1, n2 + 1))
            big = np.isin(lab2, 1 + np.where(sz >= max(6, gap_min * H * W))[0])
            removed |= big
            bgcol[big] = colour
            keep &= ~big

    lab, n = ndi.label(keep)
    if n == 0:
        return None
    sizes = ndi.sum(keep, lab, range(1, n + 1))
    com = ndi.center_of_mass(keep, lab, range(1, n + 1))
    if home:  # a neighbour's piece that reaches into the window belongs to the neighbour
        hy0, hy1, hx0, hx1 = home
        mine = [hy0 <= cy < hy1 and hx0 <= cx < hx1 for cy, cx in com]
    else:
        mine = [True] * n
    if not any(mine):
        return None
    main_id = 1 + max((i for i in range(n) if mine[i]), key=lambda i: sizes[i])
    obj = lab == main_id
    reach = max(4, int(reach * min(H, W)))
    # watermarks: small separate pieces in the bottom-right of the cell
    corner = [cy > 0.7 * H and cx > 0.7 * W and sz < 0.1 * sizes.max() for (cy, cx), sz in zip(com, sizes)]
    for _ in range(3):  # pull in pieces near the object (two pillars, flames over logs)
        near = ndi.binary_dilation(obj, iterations=reach)
        ids = np.unique(lab[near & keep])
        ids = [i for i in ids[ids > 0] if sizes[i - 1] >= max(30, min_part * sizes[main_id - 1]) and mine[i - 1] and (i == main_id or not corner[i - 1])]
        grown = np.isin(lab, ids)
        if grown.sum() == obj.sum():
            break
        obj = grown

    bgcol[~removed] = A  # dropped specks count as background
    # Edge pixels are a mix of object and background. Unmix each one against the background colour
    # next to it and the object colour a few pixels inside it.
    dist, (iy, ix) = ndi.distance_transform_edt(obj, return_indices=True)
    near_bg = bgcol[iy, ix]
    # Specks of background inside the object (gaps in foliage, between stones) are unmixed like edges.
    to_bg = np.min([np.linalg.norm(cell - col, axis=2) for col in bg_colours], axis=0)
    specks = obj & (to_bg < speck_tol)
    near_bg[specks] = bg_colours[0]
    inner = obj & (dist >= 4) & ~ndi.binary_dilation(specks, iterations=2)
    if inner.any():
        _, (fy, fx) = ndi.distance_transform_edt(~inner, return_indices=True)
        F = cell[fy, fx]
    else:
        F = cell
    alpha = np.where(obj, 1.0, 0.0).astype(np.float32)
    out = cell.copy()
    edge = obj & ((dist <= 4) | specks)
    P, BG, FG = cell[edge], near_bg[edge], F[edge]
    v = FG - BG
    denom = (v * v).sum(1)
    a = np.clip(((P - BG) * v).sum(1) / np.maximum(denom, 1.0), 0, 1)
    a[denom < 900] = 1.0  # object colour too close to the background to tell apart: keep as is
    a[a < 0.06] = 0
    alpha[edge] = a
    out[edge] = (P - (1 - a)[:, None] * BG) / np.maximum(a, 0.05)[:, None]
    if inside:
        # Pixels inside the object that are a blend of the local object colour and the background
        # (pink showing through foliage, between stones). Off for sheets whose objects are pink themselves.
        bg = bg_colours[-1]
        clean = (obj & (np.minimum(cell[..., 0], cell[..., 2]) - cell[..., 1] < 20)).astype(np.float32)
        cnt = ndi.uniform_filter(clean, size=9)
        local = np.stack([ndi.uniform_filter(cell[..., i] * clean, size=9) for i in range(3)], -1) / np.maximum(cnt[..., None], 1e-6)
        v = bg - local
        vv = (v * v).sum(-1)
        t = np.clip(((cell - local) * v).sum(-1) / np.maximum(vv, 1.0), 0, 1)
        off_line = np.linalg.norm(cell - local - t[..., None] * v, axis=2)
        mixed = obj & (cnt > 0.05) & (t > 0.15) & (off_line < 28) & (vv > 900)
        alpha[mixed] = np.minimum(alpha[mixed], 1 - t[mixed])
        out[mixed] = local[mixed]

    if key:
        span = max(float(min(A[0], A[2]) - A[1]), 1.0)  # how magenta the ground is
        m = np.clip((np.minimum(cell[..., 0], cell[..., 2]) - cell[..., 1]) / span, 0, 1)
        cast = obj & (m > 0.04)  # neutral greys sit near 0; JPEG noise stays under this
        ka = 1 - m[cast]
        ka[ka < 0.06] = 0
        alpha[cast] = np.minimum(alpha[cast], ka)
        out[cast] = (cell[cast] - (1 - ka)[:, None] * A) / np.maximum(ka, 0.05)[:, None]

    if despill:
        # sheets that never contain magenta (characters): take any magenta cast out of every pixel
        spill = np.minimum(out[..., 0], out[..., 2]) - out[..., 1] - 8
        cast = obj & (spill > 0)
        out[cast, 0] -= spill[cast]
        out[cast, 2] -= spill[cast]

    out[alpha <= 0] = 0
    if shadow:
        # the shadow, as black at the strength it darkened the ground, only near the object
        L = cell.mean(axis=2)
        sa = np.clip(1 - L / float(A.mean()), 0, 1)
        sa[(cell.max(axis=2) - cell.min(axis=2)) > 14] = 0
        sa[~ndi.binary_dilation(obj, iterations=max(6, int(0.08 * min(H, W))))] = 0
        sa[sa < 0.03] = 0
        put = ~obj & (sa > 0)
        out[put] = 0
        alpha[put] = sa[put]
    out = np.clip(out, 0, 255)

    ys, xs = np.where(alpha > 0.02)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([out, alpha * 255]).astype(np.uint8)[y0:y1, x0:x1]
    return rgba


def cut_glyph(cell):
    """A light one-colour glyph on darker ground: alpha from brightness, colour from the glyph's solid core."""
    L = cell.mean(axis=2)
    lo, hi = np.percentile(L, 50), np.percentile(L, 99)
    a = np.clip((L - lo - 0.25 * (hi - lo)) / (0.6 * (hi - lo)), 0, 1)
    lab, n = ndi.label(a > 0.5)
    if n == 0:
        return None
    sizes = ndi.sum(a > 0.5, lab, range(1, n + 1))
    keep = np.isin(lab, 1 + np.where(sizes >= 0.002 * a.size)[0])  # drop specks
    a = a * ndi.binary_dilation(keep, iterations=3)
    col = np.median(cell[a > 0.95], axis=0)
    ys, xs = np.where(a > 0.02)
    out = np.dstack([np.broadcast_to(col, cell.shape), a * 255]).astype(np.uint8)
    return out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def base_point(a):
    """Where the object meets the ground, as fractions of width and height: the lowest solid rows.
    Also fx: the centre of the bottom third, which for a figure is between its legs, walking or standing."""
    h, w = a.shape
    rows = np.where((a > 128).any(axis=1))[0]
    yb = rows.max()
    top = max(0, yb - int(0.06 * h))
    ys, xs = np.where(a[top:yb + 1] > 128)
    legs = max(0, yb - int(0.35 * h))
    _, lxs = np.where(a[legs:yb + 1] > 128)
    return float(xs.mean()) / w, float(yb + 1) / h, float(lxs.mean()) / w


def shrink(im):
    scale = min(1.0, MAX_SIDE / max(im.size))
    if scale < 1:  # resize premultiplied so edges do not pick up dark fringes
        im = im.convert('RGBa').resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS).convert('RGBA')
    return im


def cut_singles(manifest):
    for name, folder, names in SINGLES:
        os.makedirs(os.path.join(PUBLIC, 'sprites', name), exist_ok=True)
        for obj_name in names:
            im = Image.open(os.path.join(EXTRAS, folder, obj_name + '.png')).convert('RGBA')
            a = np.asarray(im)[..., 3]
            ys, xs = np.where(a > 5)
            im = shrink(im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)))
            bx, by, fx = base_point(np.asarray(im)[..., 3])
            rel = f'sprites/{name}/{obj_name}.png'
            im.save(os.path.join(PUBLIC, rel))
            manifest[f'{name}/{obj_name}'] = {'file': rel, 'w': im.width, 'h': im.height, 'bx': round(bx, 3), 'by': round(by, 3), 'fx': round(fx, 3)}
        print(f'  {name}: {len(names)} single images')


def main():
    if '--singles' in sys.argv:
        with open(MANIFEST) as f:
            manifest = json.load(f)
        cut_singles(manifest)
        with open(MANIFEST, 'w') as f:
            json.dump(manifest, f, indent=1)
        print(f'wrote {len(manifest)} sprites to the manifest')
        return
    manifest = {}
    for name, fname, cols, rows, names in SHEETS:
        sheet = np.asarray(Image.open(os.path.join(EXTRAS, fname)).convert('RGB'), np.float32)
        H, W, _ = sheet.shape
        if name in WATERMARK:
            sheet = sheet.copy()
            mh, mw = round(0.055 * H), round(0.11 * W)
            sheet[H - mh:, W - mw:] = np.median(sheet[H - mh:, W - 2 * mw:W - mw].reshape(-1, 3), axis=0)
        os.makedirs(os.path.join(PUBLIC, 'sprites', name), exist_ok=True)
        for k, obj_name in enumerate(names):
            if obj_name is None:
                continue
            r, c = divmod(k, cols)
            cy0, cy1 = round(r * H / rows), round((r + 1) * H / rows)
            cx0, cx1 = round(c * W / cols), round((c + 1) * W / cols)
            m = OVERFLOW.get(name, 0.0)
            my, mx = round(m * (cy1 - cy0)), round(m * (cx1 - cx0))
            wy0, wy1, wx0, wx1 = max(0, cy0 - my), min(H, cy1 + my), max(0, cx0 - mx), min(W, cx1 + mx)
            home = (cy0 - wy0, cy1 - wy0, cx0 - wx0, cx1 - wx0) if m else None
            src = sheet
            if (name, obj_name) in HIDE:
                src = sheet.copy()
                for y0, y1, x0, x1 in HIDE[name, obj_name]:
                    src[y0:y1, x0:x1] = np.median(sheet[wy0:wy0 + 4, wx0:wx1].reshape(-1, 3), axis=0)  # the ground at the window's top
            rgba = cut_glyph(src[wy0:wy1, wx0:wx1]) if name in GLYPH else cut_cell(src[wy0:wy1, wx0:wx1], inside=not name.endswith('_indo'), despill=name in DESPILL, home=home,
                            **CUT.get(name, {}))
            if rgba is None:
                print(f'  {name}/{obj_name}: nothing found')
                continue
            im = shrink(Image.fromarray(rgba))
            bx, by, fx = base_point(np.asarray(im)[..., 3])
            rel = f'sprites/{name}/{obj_name}.png'
            im.save(os.path.join(PUBLIC, rel))
            manifest[f'{name}/{obj_name}'] = {'file': rel, 'w': im.width, 'h': im.height, 'bx': round(bx, 3), 'by': round(by, 3), 'fx': round(fx, 3)}
        print(f'  {name}: {sum(n is not None for n in names)} objects')
    cut_singles(manifest)
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=1)
    print(f'wrote {len(manifest)} sprites to the manifest')


if __name__ == '__main__':
    main()
