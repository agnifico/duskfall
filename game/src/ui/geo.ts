// Drawing maths for the hex view.
// The field is laid out flat, turned by an angle around its middle, then squashed vertically
// so it looks seen from above at a slant. Each hex top is lifted by its terrain height, and the
// sides facing the viewer are drawn below it.

import type { Cell } from '../engine/types';

export const R = 44; // hex radius in px
export const SQ = 0.58; // vertical squash: about a 35° view from above
export const LIFT = 8; // px per terrain height step
export const BASE = 9; // px of hex side below the lowest terrain
export const S3 = Math.sqrt(3);
export const HEXW = R * S3; // a hex's width
const PAD_TOP = 150; // room above the field for tall objects
const PAD = 50;

type P = [number, number];

export interface HexGeom {
  key: string;
  cx: number; // centre of the hex top
  cy: number;
  depth: number; // for drawing back to front: ground position down the screen
  top: string; // polygon points
  sides: { points: string; shade: number }[];
}

export interface Layout {
  hexes: Map<string, HexGeom>;
  order: HexGeom[]; // back to front
  width: number;
  height: number;
}

export const pts = (arr: P[]) => arr.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${((n >> 16) * k) | 0},${(((n >> 8) & 255) * k) | 0},${((n & 255) * k) | 0})`;
}

/** Lay out a point's hexes for a given turn of the field (degrees). */
export function layout(cells: Cell[], heightOf: (x: Cell) => number, angleDeg: number): Layout {
  const th = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(th);
  const sin = Math.sin(th);

  // flat positions of pointy-top hexes in odd-r rows, turned around the field's middle
  const flat = cells.map((x): P => [R * S3 * (x.c + 0.5 * (x.r & 1)), R * 1.5 * x.r]);
  const mx = flat.reduce((s, p) => s + p[0], 0) / flat.length;
  const my = flat.reduce((s, p) => s + p[1], 0) / flat.length;
  const turn = ([x, y]: P): P => [(x - mx) * cos - (y - my) * sin, (x - mx) * sin + (y - my) * cos];

  const raw = cells.map((x, i) => {
    const [gx, gy] = turn(flat[i]);
    const h = heightOf(x);
    const cx = gx;
    const cy = gy * SQ - h * LIFT;
    const corners = [0, 1, 2, 3, 4, 5].map((k): P => {
      const a = ((60 * k - 30) * Math.PI) / 180 + th;
      return [cx + R * Math.cos(a), cy + R * Math.sin(a) * SQ];
    });
    const drop = h * LIFT + BASE;
    const sides: { corners: P[]; shade: number }[] = [];
    for (let k = 0; k < 6; k++) {
      const a = corners[k];
      const b = corners[(k + 1) % 6];
      const nx = (a[0] + b[0]) / 2 - cx; // outward direction of this edge, on screen
      const ny = (a[1] + b[1]) / 2 - cy;
      if (ny <= 0.5) continue; // faces away from the viewer
      const len = Math.hypot(nx, ny);
      // light from the upper left: sides facing right are darker
      sides.push({ corners: [a, b, [b[0], b[1] + drop], [a[0], a[1] + drop]], shade: 0.72 - 0.14 * (nx / len) });
    }
    return { key: x.key, cx, cy, depth: gy * SQ, corners, sides, drop };
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const h of raw)
    for (const [x, y] of h.corners) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + h.drop);
    }
  const ox = PAD - minX;
  const oy = PAD_TOP - minY;
  const shift = (p: P): P => [p[0] + ox, p[1] + oy];

  const hexes = new Map<string, HexGeom>();
  for (const h of raw) {
    hexes.set(h.key, {
      key: h.key,
      cx: h.cx + ox,
      cy: h.cy + oy,
      depth: h.depth,
      top: pts(h.corners.map(shift)),
      sides: h.sides.map((s) => ({ points: pts(s.corners.map(shift)), shade: s.shade })),
    });
  }
  const order = [...hexes.values()].sort((a, b) => a.depth - b.depth || a.cx - b.cx);
  return { hexes, order, width: Math.ceil(maxX - minX + PAD * 2), height: Math.ceil(maxY - minY + PAD_TOP + PAD) };
}

/** The ground point of an object inside its hex: a little below the centre, so it reads as standing on it. */
export const groundY = (cy: number) => cy + R * SQ * 0.3;
