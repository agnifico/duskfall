// Padding around a point's field, drawn only: the engine never sees these hexes. A field written as a few
// rows gets a ragged ring of more of the same ground around it, so its outline reads as a piece of land
// rather than a rectangle, and turning it looks right. Each padding hex takes the terrain of the field hex
// it grew from; shallows grow into deep water, a path into grass.

import type { Cell } from '../engine/types';
import { edgeNeighbour } from './ground';

const GROW: Record<string, string> = { h: 'w', p: 'g' };

/** A stable number in [0, 1) from a string. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** `ragged` off gives full rings (the map editor's empty slots). */
export function padCells(pointId: string, cells: Cell[], rings: number, ragged = true): Cell[] {
  if (rings <= 0) return [];
  const all = new Map(cells.map((x) => [`${x.r}:${x.c}`, x]));
  const at = (r: number, c: number) => all.get(`${r}:${c}`);
  const out: Cell[] = [];
  let edge = cells;
  for (let ring = 1; ring <= rings; ring++) {
    const next: Cell[] = [];
    for (const x of edge)
      for (let k = 0; k < 6; k++) {
        const [r, c] = probe(x, k);
        if (at(r, c)) continue;
        const key = `${pointId}:${r}:${c}`;
        // the outer ring is ragged: about a third of it is left off
        if (ragged && ring === rings && rings > 1 && hash(key) < 0.35) continue;
        // the first ring copies the field's edge (a path still turns to grass); further rings grow on
        const t = ring === 1 && x.t !== 'p' ? x.t : (GROW[x.t] ?? x.t);
        const n: Cell = { r, c, t, p: null, key };
        all.set(`${r}:${c}`, n);
        next.push(n);
        out.push(n);
      }
    edge = next;
  }
  return out;
}

/** The row and column next to x across edge k. */
function probe(x: Cell, k: number): [number, number] {
  let rc: [number, number] = [0, 0];
  edgeNeighbour(x, k, (r, c) => {
    rc = [r, c];
    return undefined;
  });
  return rc;
}
