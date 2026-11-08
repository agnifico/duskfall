// The detailed ground look, drawn in code (design/UI_PASS.md, "Tiles that read").
// Same-terrain neighbours share one surface: no outline between them, only where the terrain or height
// changes. Walls get their own material (dirt under grass, layered rock), a lip of the top colour hangs
// over them, and each hex's colour shifts a little, fixed by its key.

import type { Cell } from '../engine/types';
import { R, SQ } from './geo';

type P = [number, number];

/** What a terrain's walls look like. Keyed by terrain id; 'fog' is an unexplored hex. */
interface Wall {
  colour: string;
  lip?: number; // px of the top colour hanging over the wall, scalloped
  strata?: boolean; // darker layer lines across the wall
}
const WALLS: Record<string, Wall> = {
  w: { colour: '#2c6a96' },
  h: { colour: '#4f98ad' },
  s: { colour: '#c9a866', lip: 3 },
  g: { colour: '#8a6743', lip: 5 },
  p: { colour: '#8a6743', lip: 3 },
  f: { colour: '#6b4f35', lip: 5 },
  r: { colour: '#7a7268', strata: true },
  m: { colour: '#6f6a63', strata: true },
  k: { colour: '#64605b', strata: true },
};
const ROCK = new Set(['r', 'm', 'k']); // the rock layers: no wet band at the water, stones and cracks on top

const WATER = new Set(['w', 'h']);
export const FOG_H = 2; // fog is one flat cloud surface at this height, whatever is under it

/** How high a hex is drawn: fog is flat, deep water sits below the shallows. */
export const shownHeight = (kind: string, terrainH: number) => (kind === 'fog' ? FOG_H : kind === 'w' ? -0.75 : terrainH);

/** Broad colour drift across a terrain (low tint, high tint), so a big patch of grass runs from deep green to
 *  yellow-green instead of one flat colour. Mixed in by smooth noise over the field. */
const DRIFT: Record<string, [string, string]> = {
  g: ['#6a9f4c', '#b4cf68'],
  f: ['#3a6f3f', '#699944'],
  s: ['#e0b46c', '#f4e4b6'],
  p: ['#bb9560', '#dcc28c'],
  r: ['#88827a', '#b0a99c'],
  h: ['#69b4cc', '#97d4e0'],
  w: ['#2f76aa', '#4c97c6'],
};

// ---------- colour ----------

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const css = ([r, g, b]: number[]) => `rgb(${r | 0},${g | 0},${b | 0})`;
const clamp = (v: number) => Math.max(0, Math.min(255, v));
/** Mix two colours, t = 0..1 towards b. */
export const mix = (a: string, b: string, t: number) => {
  const A = rgb(a), B = rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
/** Multiply a colour's channels by k (k > 1 brightens). */
export const mul = (hex: string, k: number) => css(rgb(hex).map((v) => clamp(v * k)));

/** A stable number in [0, 1) from a string. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** Smooth value noise over the field, -1..1. */
function noise(seed: string, x: number, y: number): number {
  const at = (i: number, j: number) => hash(`${seed}|${i},${j}`) * 2 - 1;
  const one = (x: number, y: number) => {
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
  return one(x * 0.2, y * 0.2) * 0.7 + one(x * 0.5 + 9, y * 0.5 + 9) * 0.3;
}

/** A hex's top colour before its own small shift: the terrain colour drifting across the field. */
function drifted(key: string, kind: string, colour: string): string {
  const ramp = DRIFT[kind];
  if (!ramp) return colour;
  const parts = key.split(':');
  const r = +parts[parts.length - 2], c = +parts[parts.length - 1];
  const n = noise(parts[0] + kind, c + 0.5 * (r & 1), r * 0.866);
  return mix(colour, n < 0 ? ramp[0] : ramp[1], Math.min(1, Math.abs(n) * 1.1) * 0.6);
}

// ---------- neighbours by edge ----------

// Edge k of a hex runs from corner k to corner k+1 and faces 60k degrees in the unturned field
// (east, down-right, down-left, west, up-left, up-right). Rows are odd-r: odd rows sit half a hex right.
const EVEN: [number, number][] = [[0, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0]];
const ODD: [number, number][] = [[0, 1], [1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1]];
export const edgeNeighbour = (x: Cell, k: number, at: (r: number, c: number) => Cell | undefined) => {
  const [dr, dc] = (x.r & 1 ? ODD : EVEN)[k];
  return at(x.r + dr, x.c + dc);
};

// ---------- the parts of one hex ----------

export interface GroundHex {
  top: string; // fill of the top
  walls: { points: string; fill: string }[];
  lips: { points: string; fill: string }[];
  lines: { points: string; stroke: string; width: number; opacity: number }[];
  shades: { points: string; opacity: number; fill?: string }[];
  // bands along edges, drawn as wide strokes clipped to the hex's top, so they run on unbroken from hex to hex:
  // contact shadows, wet sand, foam
  bands: { d: string; stroke: string; width: number; opacity: number }[];
  decos: Deco[]; // small details on the top: tufts, flowers, pebbles, waves, foam, mist
  patch: boolean; // whether its terrain has a patch image (PATCHES)
}

export type Deco =
  | { tag: 'path'; d: string; stroke?: string; width?: number; fill?: string; opacity: number; cls?: string; delay?: number }
  | { tag: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: string; opacity: number; cls?: string; delay?: number };

/** A seeded random stream for one hex. */
function rng(key: string) {
  let a = Math.floor(hash(key + '#') * 2 ** 31) | 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whether an edge faces the light, which comes from the upper left of the screen. */
const towardLight = (a: P, b: P, c: P) => ((a[0] + b[0]) / 2 - c[0]) * -0.6 + ((a[1] + b[1]) / 2 - c[1]) * -0.8 / SQ > 0;

const pt = (p: P) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * @param kind what the hex shows: its terrain id, or 'fog'
 * @param colour its top colour (terrain or fog)
 * @param corners its six top corners on screen
 * @param sides its walls facing the viewer, as from geo.ts: [a, b, b-down, a-down] and a light factor
 * @param nb for each edge 0..5, the neighbour's kind and height, if any
 */
export function groundHex(
  key: string,
  kind: string,
  colour: string,
  height: number,
  corners: P[],
  sides: { corners: P[]; shade: number }[],
  nb: ({ kind: string; height: number; pad?: boolean } | undefined)[],
  pad = false, // padding around the field: drawn faded, with the field's edge marked
): GroundHex {
  const jitter = 1 + (hash(key) - 0.5) * (kind === 'g' || kind === 'f' ? 0.08 : 0.07);
  const base = drifted(key, kind, colour);
  const top = mul(base, jitter);
  const wall = kind === 'fog' ? { colour: css(rgb(colour).map((v) => v * 0.8)) } : (WALLS[kind] ?? { colour });
  const wallHex = wall.colour.startsWith('#') ? wall.colour : colour;
  const out: GroundHex = { top, walls: [], lips: [], lines: [], shades: [], bands: [], decos: [], patch: !pad && !!PATCHES[kind] };
  const cx = corners.reduce((s, p) => s + p[0], 0) / 6;
  const cy = corners.reduce((s, p) => s + p[1], 0) / 6;
  const c: P = [cx, cy];
  const edgeOf = (a: P) => corners.findIndex((q) => Math.abs(q[0] - a[0]) < 0.01 && Math.abs(q[1] - a[1]) < 0.01);

  for (const s of sides) {
    const [a, b, bd, ad] = s.corners;
    const n = nb[edgeOf(a)];
    const intoWater = WATER.has(kind) && n && WATER.has(n.kind);
    out.walls.push({ points: s.corners.map(pt).join(' '), fill: intoWater ? '#3b86b8' : mul(wallHex, s.shade + 0.18) });
    if (wall.strata) {
      for (const f of [0.38, 0.7]) {
        out.lines.push({ points: `${pt(lerp(a, ad, f))} ${pt(lerp(b, bd, f))}`, stroke: '#000', width: 1.2, opacity: 0.14 });
      }
    }
    if (wall.lip) {
      // a scalloped band of the top colour hanging over the wall
      const n = 6;
      const edge: P[] = [];
      for (let i = 0; i <= n; i++) {
        const p = lerp(a, b, i / n);
        const d = wall.lip * (i % 2 ? 1.5 : 0.7) * (i === 0 || i === n ? 0.6 : 1);
        edge.push([p[0], p[1] + d]);
      }
      out.lips.push({ points: [a, b, ...edge.reverse()].map(pt).join(' '), fill: mul(base, jitter * (s.shade + 0.2)) });
    }
  }

  const seg = { shadow: '', wet: '', foam: '' };
  for (let k = 0; k < 6; k++) {
    const a = corners[k];
    const b = corners[(k + 1) % 6];
    const n = nb[k];
    const line = `M${pt(a)} L${pt(b)} `;
    const facesDown = (a[1] + b[1]) / 2 > cy + 0.5;
    if (!n || n.height < height) {
      // an exposed rim: lit where it faces up, a fine light line where it turns down into a wall
      if (!facesDown) out.lines.push({ points: `${pt(a)} ${pt(b)}`, stroke: '#fff', width: 1.6, opacity: 0.32 });
      else out.lines.push({ points: `${pt(a)} ${pt(b)}`, stroke: '#fff', width: 1.2, opacity: 0.22 });
    } else if (n.height > height && towardLight(a, b, c)) {
      seg.shadow += line; // a taller neighbour on the light's side throws a soft shadow across this edge
    } else if (n.kind !== kind) {
      // same height, different ground: a faint seam
      out.lines.push({ points: `${pt(a)} ${pt(b)}`, stroke: '#000', width: 1, opacity: 0.12 });
    }
    if (n && !!n.pad !== pad) {
      // the edge of the playable field
      out.lines.push({ points: `${pt(a)} ${pt(b)}`, stroke: '#fff', width: 1.6, opacity: 0.5 });
    }
    if (n && WATER.has(kind) && !WATER.has(n.kind) && n.kind !== 'fog') {
      seg.foam += line;
      // and a fainter line further out that breathes
      const a2 = lerp(a, c, 0.22), b2 = lerp(b, c, 0.22);
      out.decos.push({ tag: 'path', d: `M${pt(lerp(a2, b2, 0.15))} L${pt(lerp(a2, b2, 0.85))}`, stroke: '#fff', width: 1.1, opacity: 0.4, cls: 'foam', delay: hash(key + k) * 3 });
    }
    if (n && !WATER.has(kind) && kind !== 'fog' && !ROCK.has(kind) && WATER.has(n.kind)) seg.wet += line; // land darkened where the water laps it
  }
  if (seg.shadow) {
    out.bands.push({ d: seg.shadow, stroke: '#000', width: 22, opacity: 0.08 });
    out.bands.push({ d: seg.shadow, stroke: '#000', width: 10, opacity: 0.09 });
  }
  if (seg.wet) out.bands.push({ d: seg.wet, stroke: '#3a2a10', width: 14, opacity: 0.15 });
  if (seg.foam) {
    out.bands.push({ d: seg.foam, stroke: '#fff', width: 11, opacity: 0.26 });
    out.bands.push({ d: seg.foam, stroke: '#fff', width: 3.5, opacity: 0.6 });
  }

  details(out, key, kind, base, corners, c);
  if (pad) fadeAll(out);
  return out;
}

/** Padding is drawn washed out: colours pulled toward grey and lightened. */
function fade(c: string): string {
  let v: number[] | null = null;
  if (c.startsWith('#')) v = rgb(c);
  else if (c.startsWith('rgb(')) v = c.slice(4, -1).split(',').map(Number);
  if (!v) return c;
  const l = v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11;
  return css(v.map((x) => clamp(x + (l - x) * 0.55 + (255 - x) * 0.12)));
}
function fadeAll(out: GroundHex) {
  out.top = fade(out.top);
  for (const w of out.walls) w.fill = fade(w.fill);
  for (const l of out.lips) l.fill = fade(l.fill);
  for (const d of out.decos) {
    if (d.tag === 'path') {
      if (d.fill) d.fill = fade(d.fill);
      if (d.stroke) d.stroke = fade(d.stroke);
    } else d.fill = fade(d.fill);
    d.opacity *= 0.7;
  }
}

/** Scatter a hex's small details, fixed by its key, turning with the field. */
function details(out: GroundHex, key: string, kind: string, colour: string, corners: P[], [cx, cy]: P) {
  const rand = rng(key);
  const th = Math.atan2((corners[0][1] - cy) / SQ, corners[0][0] - cx) + Math.PI / 6; // the field's turn
  const spot = (r0 = 0.32, r1 = 0.78): P => {
    const r = R * (r0 + (r1 - r0) * Math.sqrt(rand()));
    const a = rand() * Math.PI * 2 + th;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a) * SQ];
  };
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  // a tuft: three blades from one narrow base, fanning out \|/ and curling outward at the tips,
  // each a little off in length, lean and base height
  const f1 = (v: number) => v.toFixed(1);
  const tuft = ([x, y]: P, fill: string, s = 1) => {
    let d = '';
    for (const [i, lean, len] of [[-1, -0.7, 4.2], [0, 0.05, 5.8], [1, 0.7, 4.2]]) {
      const bx = x + i * 0.35 * s, by = y + (rand() - 0.5) * 0.7 * s;
      const a = lean + (rand() - 0.5) * 0.35;
      const l = (len + (rand() - 0.5) * 1.4) * s;
      const tx = bx + Math.sin(a) * l, ty = by - Math.cos(a) * l;
      const qx = bx + Math.sin(a) * l * 0.2, qy = by - l * 0.7; // rises first, then bends out
      const w = 0.6 * s;
      d += `M${f1(bx - w)},${f1(by)} Q${f1(qx - w * 0.5)},${f1(qy)} ${f1(tx)},${f1(ty)} Q${f1(qx + w * 0.5)},${f1(qy)} ${f1(bx + w)},${f1(by)} Z `;
    }
    out.decos.push({ tag: 'path', d, fill, opacity: 0.9 });
  };
  const dot = ([x, y]: P, r: number, fill: string, opacity = 1, ry = r * 0.75) =>
    out.decos.push({ tag: 'ellipse', cx: x, cy: y, rx: r, ry, fill, opacity });
  const pebble = (p: P, r: number) => {
    dot([p[0], p[1] + 0.8], r, '#000', 0.18);
    dot(p, r, mul(colour, 0.82));
    dot([p[0] - r * 0.25, p[1] - r * 0.3], r * 0.45, '#fff', 0.35);
  };
  // a small angular stone: a dark body and a lit top facet, like the low-poly rocks
  const stone = ([x, y]: P, r: number) => {
    const n = 5 + Math.floor(rand() * 2);
    const rot = rand() * Math.PI;
    const body: P[] = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const k = r * (0.75 + rand() * 0.35);
      body.push([x + Math.cos(a) * k, y + Math.sin(a) * k * 0.62]);
    }
    const poly = (ps: P[]) => 'M' + ps.map(([u, v]) => `${f1(u)},${f1(v)}`).join(' L') + ' Z';
    out.decos.push({ tag: 'path', d: poly(body.map(([u, v]) => [u + 0.6, v + 1.1])), fill: '#000', opacity: 0.16 });
    out.decos.push({ tag: 'path', d: poly(body), fill: mul(colour, 0.78), opacity: 1 });
    const facet = body.filter(([, v]) => v <= y + r * 0.1).map(([u, v]): P => [x + (u - x) * 0.7, y - r * 0.12 + (v - y) * 0.6]);
    if (facet.length >= 3) out.decos.push({ tag: 'path', d: poly(facet), fill: mul(colour, 1.08), opacity: 1 });
  };
  // a fine crack: a jagged line with a short branch
  const crack = ([x, y]: P) => {
    const a = rand() * Math.PI;
    const dx = Math.cos(a), dy = Math.sin(a) * SQ;
    let d = `M${f1(x - dx * 8)},${f1(y - dy * 8)}`;
    for (let i = 1; i <= 4; i++) {
      const t = -8 + i * 4;
      d += ` L${f1(x + dx * t + (rand() - 0.5) * 2.2)},${f1(y + dy * t + (rand() - 0.5) * 1.4)}`;
    }
    const bx = x + dx * 1, by = y + dy * 1;
    d += ` M${f1(bx)},${f1(by)} l${f1(-dy * 4 + 1.5)},${f1(dx * 2.5)}`;
    out.decos.push({ tag: 'path', d, stroke: mul(colour, 0.55), width: 0.9, opacity: 0.6 });
  };
  const wave = ([x, y]: P, stroke: string, opacity: number, s = 1) =>
    out.decos.push({
      tag: 'path',
      d: `M${x - 7 * s},${y} q${3.5 * s},${-2.6 * s} ${7 * s},0 q${3.5 * s},${2.6 * s} ${7 * s},0`,
      stroke,
      width: 1.5,
      opacity,
      cls: 'wave',
      delay: rand() * 4,
    });

  switch (kind) {
    case 'g':
      for (let i = 0; i < 4; i++) tuft(spot(), mul(colour, 0.76));
      // now and then a small cluster of flowers of one kind, not single spots
      if (rand() < 0.14) {
        const [x, y] = spot(0.35, 0.7);
        const c = pick(['#fff6e0', '#ffe066', '#ffb3c6', '#d6c8ff']);
        for (let i = 0, n = 3 + Math.floor(rand() * 3); i < n; i++) dot([x + (rand() - 0.5) * 9, y + (rand() - 0.5) * 4.5], 1.1, c, 0.95);
      }
      break;
    case 'f':
      // fallen leaves, mixed toward the floor's own colour so they sit in it
      for (let i = 0; i < 5; i++) dot(spot(0.25, 0.8), 2.2, mix(colour, pick(['#b0773a', '#c6964c', '#8c6034', '#86a04a']), 0.5), 0.8, 1.1);
      for (let i = 0; i < 2; i++) tuft(spot(), mul(colour, 0.74), 1.1);
      break;
    case 's':
      for (let i = 0; i < 4; i++) dot(spot(0.2, 0.85), 1, mul(colour, 0.72), 0.55);
      if (rand() < 0.2) {
        const [x, y] = spot(0.4, 0.75);
        dot([x, y + 0.6], 2.6, '#000', 0.15);
        dot([x, y], 2.6, '#f7ecdc', 1, 1.8);
      }
      break;
    case 'p':
      for (let i = 0; i < 3; i++) pebble(spot(0.2, 0.75), 1.6);
      break;
    case 'r':
    case 'm':
    case 'k':
      for (let i = 0, n = 1 + Math.floor(rand() * 3); i < n; i++) stone(spot(0.35, 0.8), 2.2 + rand() * 1.6);
      if (rand() < 0.5) crack(spot(0.2, 0.5));
      break;
    case 'h':
      for (let i = 0; i < 2; i++) wave(spot(0.15, 0.6), '#fff', 0.55, 0.8);
      {
        const [x, y] = spot(0.2, 0.7);
        out.decos.push({ tag: 'ellipse', cx: x, cy: y, rx: 1.6, ry: 1.6, fill: '#fff', opacity: 0.9, cls: 'glint', delay: rand() * 5 });
      }
      break;
    case 'w':
      for (let i = 0; i < 3; i++) wave(spot(0.1, 0.7), '#a9dcf2', 0.45, 0.9 + rand() * 0.4);
      break;
    case 'fog':
      // covered by its fog block (fogBlock)
      break;
  }
}

// ---------- patches: soft blotches of colour that run across hexes ----------

/** Which patch layers each terrain shows, and how strongly. */
export const PATCHES: Record<string, [Patch, number][]> = {
  g: [['light', 0.42], ['dark', 0.24]],
  f: [['light', 0.16], ['dark', 0.3]],
  s: [['amber', 0.42], ['light', 0.18]],
  p: [['dark', 0.12]],
};
export type Patch = 'light' | 'dark' | 'amber';
const PATCH_COLOUR: Record<Patch, [number, number, number]> = { light: [222, 238, 128], dark: [38, 84, 40], amber: [214, 150, 72] };
/** The ground area a patch image covers, centred on the field's middle, in px before the squash. */
export const PATCH_EXTENT = 1600;

/** Fast lattice value noise, -1..1, two octaves. */
function vnoise(seed: number, x: number, y: number): number {
  const h = (i: number, j: number) => {
    let t = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ seed;
    t = Math.imul(t ^ (t >>> 13), 1274126177);
    return ((t ^ (t >>> 16)) >>> 0) / 2147483648 - 1;
  };
  const one = (x: number, y: number) => {
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = h(i, j) + (h(i + 1, j) - h(i, j)) * u;
    const b = h(i, j + 1) + (h(i + 1, j + 1) - h(i, j + 1)) * u;
    return a + (b - a) * v;
  };
  return one(x, y) * 0.65 + one(x * 2.3 + 17, y * 2.3 + 5) * 0.35;
}

const patchCache = new Map<string, string>();
/** A terrain's patches as one image (a data URL): its layers from PATCHES laid over each other, drawn once per
 *  point and terrain. Each hex shows it clipped to its own top, so the browser only paints what's inside. */
export function patchImage(pointId: string, terrain: string): string {
  const k = `${pointId}/${terrain}`;
  const hit = patchCache.get(k);
  if (hit) return hit;
  const N = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(N, N);
  const scale = PATCH_EXTENT / N / 120; // one noise unit is about 1.6 hexes
  const layers = (PATCHES[terrain] ?? []).map(([kind, op]) => ({ seed: Math.floor(hash(`${pointId}/${kind}`) * 1e9), col: PATCH_COLOUR[kind], op }));
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      // "over" compositing of each layer onto a transparent pixel
      let r = 0, g = 0, b = 0, a = 0;
      for (const L of layers) {
        const t = Math.max(0, Math.min(1, (vnoise(L.seed, x * scale, y * scale) - 0.12) / 0.3));
        const la = t * t * (3 - 2 * t) * L.op;
        if (!la) continue;
        const na = la + a * (1 - la);
        r = (L.col[0] * la + r * a * (1 - la)) / na;
        g = (L.col[1] * la + g * a * (1 - la)) / na;
        b = (L.col[2] * la + b * a * (1 - la)) / na;
        a = na;
      }
      const i = (y * N + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = Math.round(a * 255);
    }
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL();
  patchCache.set(k, url);
  return url;
}

// ---------- fog of war: a dark block over each hidden hex ----------

export const FOG_UP = 16; // px the fog stands above the ground
export const FOG_TOP = '#2b3740';

/** Convex hull (monotone chain). */
function hull(ps: P[]): P[] {
  const s = [...ps].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P[] = [], hi: P[] = [];
  for (const p of s) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (const p of s.reverse()) {
    while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop();
    hi.push(p);
  }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
}

export interface FogBlock {
  top: string;
  walls: { points: string; fill: string }[];
  spill: string[]; // the block's outline, grown, for its soft edge: largest first
}

/** A hex of fog: its top lifted FOG_UP above the ground, walls down to the ground's foot, and two grown copies of
 *  its outline drawn faintly behind it. Neighbouring blocks share a colour, so their overlaps don't show. */
export function fogBlock(corners: P[], walls: { corners: P[]; shade: number }[]): FogBlock {
  const up = (p: P): P => [p[0], p[1] - FOG_UP];
  const sil = hull([...corners.map(up), ...walls.flatMap((w) => [w.corners[2], w.corners[3]])]);
  const cx = sil.reduce((s, p) => s + p[0], 0) / sil.length;
  const cy = sil.reduce((s, p) => s + p[1], 0) / sil.length;
  const grow = (k: number) => sil.map(([x, y]): P => [cx + (x - cx) * k, cy + (y - cy) * (1 + (k - 1) * 1.4)]).map(pt).join(' ');
  return {
    top: corners.map(up).map(pt).join(' '),
    walls: walls.map((w) => ({ points: [up(w.corners[0]), up(w.corners[1]), w.corners[2], w.corners[3]].map(pt).join(' '), fill: mul(FOG_TOP, w.shade + 0.12) })),
    spill: [grow(1.26), grow(1.12)],
  };
}
