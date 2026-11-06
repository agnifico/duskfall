#!/usr/bin/env python3
"""Make the input image for growing a nation map with Gemini (paint around the existing map).

The current map is shrunk into place on a bigger, flat sea. Only the main island (and anything listed in
KEEP_NEAR) is kept; small islands are painted over so Gemini can redraw them. Flat coloured shapes mark the
new islands. After Gemini paints around it, tools/compose_nation.py pastes the original back at full size.

  ../nsfw_project/.venv/bin/python -I tools/make_nation_canvas.py

Writes extras/nation_canvas_<id>.png (Gemini's input), extras/nation_keep_<id>.png (the kept area, full size)
and tools/nation_<id>.json (where everything sits, for the compose step).
"""
import json
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NATION = 'nuvatra'
SOURCE = os.path.join(ROOT, 'game/public/maps/nuvatra.webp')  # the current map, 2752 x 1536
GROW = 2  # the new map is this many times the current map's width and height
OFFSET = (1650, 980)  # where the current map's top-left corner lands in the new map, in full-size pixels
OUT_SIZE = (2752, 1536)  # Gemini's 16:9 output size; the canvas is the new map at OUT_SIZE / (GROW * size)
SEA = (5, 48, 86)  # the deep sea at the current map's edges
KEEP_NEAR = [(1573, 1337)]  # also keep whatever sits here (the turtle), in current-map pixels
SHORE = 45  # px of water kept around the island, so its shallows and surf come along

# New islands, in new-map pixels: colour, centre, half-width, half-height, wobble, seed
SHAPES = [
    ('hela', (122, 28, 28), (2700, 420), 560, 280, 0.16, 3),  # north: Hela's island
    ('saints', (138, 138, 138), (820, 1500), 330, 250, 0.20, 7),  # west: the Saints' forward base
    ('ice-1', (240, 245, 250), (2280, 2720), 260, 170, 0.22, 11),  # south: the ice islands
    ('ice-2', (240, 245, 250), (2780, 2860), 220, 140, 0.25, 12),
    ('ice-3', (240, 245, 250), (3240, 2700), 170, 120, 0.25, 13),
    ('ice-4', (240, 245, 250), (1900, 2900), 120, 80, 0.12, 14),
]


def land_mask(rgb: np.ndarray) -> np.ndarray:
    """Everything that isn't sea: island, beaches, surf right at the shore."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(2), rgb.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    sea = (b > r + 25) & (b >= g - 10) & (sat > 0.3)  # deep blue and turquoise water
    sea |= (mx < 70) & (b >= r)  # the darkest open sea
    land = ~sea
    land = ndi.binary_opening(land, iterations=3)  # drop glints and wave crests
    land = ndi.binary_fill_holes(land)
    return land


def blob(cx, cy, rx, ry, wobble, seed, n=90):
    rnd = random.Random(seed)
    waves = [(rnd.randint(2, 7), rnd.uniform(0, math.tau), rnd.uniform(0.3, 1.0)) for _ in range(5)]
    pts = []
    for i in range(n):
        t = math.tau * i / n
        k = 1 + wobble * sum(a * math.sin(f * t + p) for f, p, a in waves) / len(waves) * 2
        pts.append((cx + rx * k * math.cos(t), cy + ry * k * math.sin(t)))
    return pts


def main():
    src = Image.open(SOURCE).convert('RGB')
    rgb = np.asarray(src).astype(np.int32)
    H, W = rgb.shape[:2]

    land = land_mask(rgb)
    lab, n = ndi.label(land)
    sizes = ndi.sum(land, lab, range(1, n + 1))
    keep = lab == (1 + int(np.argmax(sizes)))
    for x, y in KEEP_NEAR:
        near = lab[max(0, y - 40):y + 40, max(0, x - 40):x + 40]
        for i in np.unique(near[near > 0]):
            keep |= lab == i
    keep = ndi.binary_dilation(keep, iterations=SHORE)
    alpha = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))
    alpha.save(os.path.join(ROOT, f'extras/nation_keep_{NATION}.png'))

    # the canvas: the new map at a smaller scale
    full = (W * GROW, H * GROW)
    scale = OUT_SIZE[0] / full[0]
    canvas = Image.new('RGB', OUT_SIZE, SEA)
    small = (round(W * scale), round(H * scale))
    piece = src.resize(small, Image.LANCZOS)
    piece_alpha = alpha.resize(small, Image.LANCZOS)
    canvas.paste(piece, (round(OFFSET[0] * scale), round(OFFSET[1] * scale)), piece_alpha)

    draw = ImageDraw.Draw(canvas)
    for name, colour, (cx, cy), rx, ry, wob, seed in SHAPES:
        draw.polygon([(x * scale, y * scale) for x, y in blob(cx, cy, rx, ry, wob, seed)], fill=colour)
    canvas.save(os.path.join(ROOT, f'extras/nation_canvas_{NATION}.png'))

    with open(os.path.join(ROOT, f'tools/nation_{NATION}.json'), 'w') as f:
        json.dump({'source': os.path.relpath(SOURCE, ROOT), 'size': [W, H], 'grow': GROW, 'offset': list(OFFSET),
                   'full': list(full), 'canvas': list(OUT_SIZE), 'sea': SEA,
                   'shapes': {s[0]: {'centre': s[2], 'rx': s[3], 'ry': s[4]} for s in SHAPES}}, f, indent=1)
    print(f'kept {keep.mean():.0%} of the current map; canvas {OUT_SIZE[0]}x{OUT_SIZE[1]} for a {full[0]}x{full[1]} map')


if __name__ == '__main__':
    main()
