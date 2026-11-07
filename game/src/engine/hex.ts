// Hex grids: "odd-r" offset rows (every odd row is shifted half a hex to the right), pointy-top hexes.

import type { Cell, Content, Shape } from './types';
import { hash, mulberry32 } from './rng';

export interface Grid {
  cells: Cell[];
  byKey: Map<string, Cell>;
  byRC: Map<string, Cell>;
}

const cache = new Map<string, Grid>();

/** The cells of a point on a given day. "*" slots roll from the point's table, the same way all day. */
export function grid(content: Content, pointId: string, day: number): Grid {
  const k = `${pointId}@${day}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const P = content.points[pointId];
  const rng = mulberry32(hash(pointId) + day * 977);
  const cells: Cell[] = [];
  P.rows.forEach((row, r) =>
    row.trim().split(/\s+/).forEach((tok, c) => {
      const dot = tok.indexOf('.');
      const t = dot < 0 ? tok : tok.slice(0, dot);
      let p: string | null = dot < 0 ? null : tok.slice(dot + 1);
      if (p === '*') p = P.table.length ? P.table[Math.floor(rng() * P.table.length)] : null;
      cells.push({ r, c, t, p, key: `${pointId}:${r}:${c}` });
    }),
  );
  const g: Grid = {
    cells,
    byKey: new Map(cells.map((x) => [x.key, x])),
    byRC: new Map(cells.map((x) => [`${x.r}:${x.c}`, x])),
  };
  cache.set(k, g);
  return g;
}

const EVEN: [number, number][] = [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
const ODD: [number, number][] = [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];

export function neighbours(g: Grid, x: Cell): Cell[] {
  const out: Cell[] = [];
  for (const [dc, dr] of x.r & 1 ? ODD : EVEN) {
    const n = g.byRC.get(`${x.r + dr}:${x.c + dc}`);
    if (n) out.push(n);
  }
  return out;
}

export function cube(x: Cell): [number, number, number] {
  const q = x.c - (x.r - (x.r & 1)) / 2;
  return [q, x.r, -q - x.r];
}

export function hexDistance(a: Cell, b: Cell): number {
  const A = cube(a), B = cube(b);
  return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
}

/** Cheapest walk from one cell to another. Costs are paid on entering a cell. */
export function route(
  g: Grid,
  from: Cell,
  to: Cell,
  passable: (x: Cell) => boolean,
  stepCost: (x: Cell) => number,
): { cost: number; path: Cell[] } | null {
  const best = new Map<string, number>([[from.key, 0]]);
  const prev = new Map<string, Cell>();
  const open: Cell[] = [from];
  while (open.length) {
    open.sort((a, b) => best.get(a.key)! - best.get(b.key)!);
    const u = open.shift()!;
    if (u === to) break;
    for (const v of neighbours(g, u)) {
      if (!passable(v)) continue;
      const d = best.get(u.key)! + stepCost(v);
      if (d < (best.get(v.key) ?? Infinity)) {
        best.set(v.key, d);
        prev.set(v.key, u);
        open.push(v);
      }
    }
  }
  if (!best.has(to.key)) return null;
  const path: Cell[] = [];
  for (let x: Cell | undefined = to; x && x !== from; x = prev.get(x.key)) path.unshift(x);
  return { cost: best.get(to.key)!, path };
}

// ---------- directions and attack shapes ----------
// Axial directions (q, r) in turning order: east, north-east, north-west, west, south-west, south-east.
const DIRS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

function cellAt(g: Grid, q: number, r: number): Cell | undefined {
  return g.byRC.get(`${r}:${q + (r - (r & 1)) / 2}`);
}

/** The neighbour of a cell in one of the six directions (0..5), if the field has it. */
export function stepDir(g: Grid, x: Cell, dir: number): Cell | undefined {
  const [q, r] = cube(x);
  const [dq, dr] = DIRS[((dir % 6) + 6) % 6];
  return cellAt(g, q + dq, r + dr);
}

/** Which of the six directions points most nearly from a to b. */
export function dirTo(a: Cell, b: Cell): number {
  const [aq, ar] = cube(a);
  const [bq, br] = cube(b);
  const dq = bq - aq, dr = br - ar;
  const x = Math.sqrt(3) * (dq + dr / 2);
  const y = -1.5 * dr; // up the screen is positive
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return ((Math.round(deg / 60) % 6) + 6) % 6;
}

/** The cells an attack covers, fired from `from` towards `target`. */
export function shapeCells(g: Grid, from: Cell, target: Cell, sh: Shape): Cell[] {
  const dir = dirTo(from, target);
  const out: Cell[] = [];
  if (sh.shape === 'arc') {
    const dirs = sh.width === 3 ? [dir - 1, dir, dir + 1] : [dir];
    for (const d of dirs) {
      const n = stepDir(g, from, d);
      if (n) out.push(n);
    }
  } else if (sh.shape === 'line') {
    let x: Cell | undefined = from;
    for (let i = 0; i < sh.length; i++) {
      x = x && stepDir(g, x, dir);
      if (!x) break;
      out.push(x);
    }
  } else {
    for (const x of g.cells) {
      const d = hexDistance(from, x);
      if (d > 0 && d <= sh.rings) out.push(x);
    }
  }
  return out;
}
