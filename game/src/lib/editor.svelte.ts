// The map editor (dev mode, E). Two modes:
//   Paint: hexes and props on the live field. It edits content.points[id].rows in place, so the field redraws
//     as you paint. Painting past the top or left edge shifts the field down or right (rows by twos, so odd
//     rows stay the shifted ones), and the save's cell keys (your hex, fog, used nodes) shift with it.
//   Tune: one object's look on the field: its size and offset on the hex (props.json), and its sprite's foot
//     point and cast shadow (tuning.json, laid over the cut values; see content/index.ts).
// Save writes both through the dev server (vite-dev-save.js). Undo and redo cover paint strokes and tuning.

import { applyTune, content, tuning, type Tune } from '../content';
import * as E from '../engine/actions';
import { forget } from '../engine/hex';
import type { GameState, Prop } from '../engine/types';
import { G, act } from './game.svelte';

export type Brush =
  | { kind: 'terrain'; t: string } // set the ground, keep what's on it
  | { kind: 'prop'; code: string } // put a prop on a hex ("*" rolls from the point's table each day)
  | { kind: 'clear' } // take the prop off
  | { kind: 'remove' }; // no hex here

/** What Tune is working on: a prop code, or "@player". Staged on one hex of the field. */
export const PLAYER = '@player';

export const ED = $state({
  on: false,
  mode: 'paint' as 'paint' | 'tune',
  brush: { kind: 'terrain', t: 'g' } as Brush,
  size: 0, // brush radius in hexes: 0, 1, 2
  fill: false, // flood the connected hexes of the same ground instead
  props: 'shown' as 'shown' | 'faint' | 'hidden', // props on the field while painting
  preview: false, // the field as it plays: padding, no slots or outlines, no painting
  filter: '',
  tune: { code: null as string | null, key: null as string | null, spent: false },
  v: 0, // goes up with every change, so the field redraws
  rowsDirty: false, // the point's file
  tuneDirty: false, // tuning.json, props.json
  undos: 0,
  redos: 0,
  note: '',
});
export const dirty = () => ED.rowsDirty || ED.tuneDirty;

const changedProps = new Set<string>();

// ---------- history ----------

interface Step {
  undo: () => void;
  redo: () => void;
}
const undos: Step[] = [];
const redos: Step[] = [];
function push(step: Step) {
  undos.push(step);
  if (undos.length > 200) undos.shift();
  redos.length = 0;
  ED.undos = undos.length;
  ED.redos = 0;
}
export function undo(): void {
  const s = undos.pop();
  if (!s) return;
  closeTuneStep();
  s.undo();
  redos.push(s);
  ED.undos = undos.length;
  ED.redos = redos.length;
}
export function redo(): void {
  const s = redos.pop();
  if (!s) return;
  s.redo();
  undos.push(s);
  ED.undos = undos.length;
  ED.redos = redos.length;
}

// ---------- paint ----------

interface RowsState {
  rows: string[];
  off: [number, number]; // the field's total shift
}
let off: [number, number] = [0, 0];
let strokeStart: RowsState | null = null;
let strokeId = '';

const parse = (rows: string[]) => rows.map((r) => r.trim().split(/\s+/));
const split = (tok: string): [string, string | null] => {
  const d = tok.indexOf('.');
  return d < 0 ? [tok, null] : [tok.slice(0, d), tok.slice(d + 1)];
};

/** Move every cell key of this point in the save by (dr, dc). */
function remap(s: GameState, id: string, dr: number, dc: number): void {
  const pre = `${id}:`;
  const mv = (k: string | null) => {
    if (!k?.startsWith(pre)) return k;
    const [r, c] = k.slice(pre.length).split(':').map(Number);
    return `${id}:${r + dr}:${c + dc}`;
  };
  const rekey = (o: Record<string, true>) => Object.fromEntries(Object.keys(o).map((k) => [mv(k)!, true as const]));
  s.pos = mv(s.pos);
  s.restAt = mv(s.restAt);
  s.depleted = rekey(s.depleted);
  s.taken = rekey(s.taken);
  s.revealed = rekey(s.revealed);
  if (s.seen[id]) s.seen[id] = rekey(s.seen[id]);
  for (const f of s.foes[id] ?? []) {
    f.pos = mv(f.pos)!;
    f.home = mv(f.home)!;
  }
}
function shiftBy(id: string, dr: number, dc: number) {
  if (!dr && !dc) return;
  act((s) => remap(s, id, dr, dc));
  off = [off[0] + dr, off[1] + dc];
}

/** Trim empty rows and columns off the edges. Rows come off the top only in pairs. */
function tidy(t: string[][]): { t: string[][]; dr: number; dc: number } {
  t = t.map((r) => {
    const out = [...r];
    while (out.length && out[out.length - 1] === '_') out.pop();
    return out;
  });
  while (t.length && !t[t.length - 1].length) t.pop();
  let top = 0;
  while (top + 1 < t.length && !t[top].length && !t[top + 1].length) top += 2;
  t = t.slice(top);
  const lead = (r: string[]) => (r.length ? r.findIndex((x) => x !== '_') : Infinity);
  let left = Math.min(...t.map(lead));
  if (!isFinite(left)) left = 0;
  t = t.map((r) => r.slice(left));
  return { t, dr: -top, dc: -left };
}

function setRows(id: string, rows: string[]) {
  content.points[id].rows = rows;
  forget(id);
  ED.v++;
  ED.rowsDirty = true;
}
function restoreRows(id: string, st: RowsState) {
  shiftBy(id, st.off[0] - off[0], st.off[1] - off[1]);
  setRows(id, [...st.rows]);
}

/** Start of a click or drag: the whole stroke is one undo step. */
export function beginStroke(id: string): void {
  strokeId = id;
  strokeStart = { rows: [...content.points[id].rows], off: [...off] };
}
export function endStroke(): void {
  const before = strokeStart;
  strokeStart = null;
  if (!before) return;
  const id = strokeId;
  const after: RowsState = { rows: [...content.points[id].rows], off: [...off] };
  if (after.rows.join('\n') === before.rows.join('\n') && after.off[0] === before.off[0] && after.off[1] === before.off[1]) return;
  push({ undo: () => restoreRows(id, before), redo: () => restoreRows(id, after) });
}

// odd-r offset rows <-> axial
const toAxial = (r: number, c: number): [number, number] => [c - (r - (r & 1)) / 2, r];
const fromAxial = (q: number, r: number): [number, number] => [r, q + (r - (r & 1)) / 2];
const NEAR: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

/** The hexes a brush of radius n covers around (r, c). */
function disc(r: number, c: number, n: number): [number, number][] {
  const [q0, r0] = toAxial(r, c);
  const out: [number, number][] = [];
  for (let dq = -n; dq <= n; dq++)
    for (let dr = Math.max(-n, -dq - n); dr <= Math.min(n, -dq + n); dr++) out.push(fromAxial(q0 + dq, r0 + dr));
  return out;
}

/** The hexes joined to (r, c) with the same ground. */
function flood(t: string[][], r: number, c: number): [number, number][] {
  const at = (r: number, c: number) => t[r]?.[c] ?? '_';
  const ground = split(at(r, c))[0];
  if (ground === '_') return [[r, c]];
  const seen = new Set([`${r}:${c}`]);
  const out: [number, number][] = [];
  const queue: [number, number][] = [[r, c]];
  while (queue.length) {
    const [cr, cc] = queue.pop()!;
    out.push([cr, cc]);
    const [q, rr] = toAxial(cr, cc);
    for (const [dq, dr] of NEAR) {
      const [nr, nc] = fromAxial(q + dq, rr + dr);
      const k = `${nr}:${nc}`;
      if (seen.has(k) || at(nr, nc) === '_' || split(at(nr, nc))[0] !== ground) continue;
      seen.add(k);
      queue.push([nr, nc]);
    }
  }
  return out;
}

function stamp(cur: string, b: Brush): string {
  const [ground, prop] = cur === '_' ? [null, null] : split(cur);
  if (b.kind === 'terrain') return prop ? `${b.t}.${prop}` : b.t;
  if (b.kind === 'prop') return ground ? `${ground}.${b.code}` : cur;
  if (b.kind === 'clear') return ground ?? '_';
  return '_';
}

/** Paint the current brush at row r, column c (which may lie outside the field). */
export function paint(id: string, r: number, c: number): void {
  if (!strokeStart) beginStroke(id);
  let t = parse(content.points[id].rows);
  const b = ED.brush;
  const spread = b.kind !== 'prop';
  let cells = ED.fill && spread ? flood(t, r, c) : disc(r, c, spread ? ED.size : 0);
  // props, ground and clearing only land on hexes that exist; only ground grows the field
  if (b.kind !== 'terrain') cells = cells.filter(([r, c]) => (t[r]?.[c] ?? '_') !== '_');
  const changes = cells.map(([r, c]) => ({ r, c, tok: stamp(t[r]?.[c] ?? '_', b) })).filter((x) => x.tok !== (t[x.r]?.[x.c] ?? '_'));
  if (!changes.length) return;

  // grow up or left: shift everything so indexes stay positive
  const minR = Math.min(0, ...changes.map((x) => x.r));
  const minC = Math.min(0, ...changes.map((x) => x.c));
  const dr = minR < 0 ? 2 * Math.ceil(-minR / 2) : 0;
  const dc = -minC;
  if (dr || dc) t = [...Array.from({ length: dr }, () => [] as string[]), ...t].map((row) => [...Array(dc).fill('_'), ...row]);
  for (const x of changes) {
    const rr = x.r + dr, cc = x.c + dc;
    while (t.length <= rr) t.push([]);
    while (t[rr].length <= cc) t[rr].push('_');
    t[rr][cc] = x.tok;
  }
  const tidied = tidy(t);
  shiftBy(id, dr + tidied.dr, dc + tidied.dc);
  setRows(id, tidied.t.map((row) => (row.length ? row.join(' ') : '_')));
}

/** Pick the brush from a hex: its prop if it has one (or always its ground, with `ground`). */
export function pickFrom(id: string, r: number, c: number, ground: boolean): void {
  const tok = tokenAt(id, r, c);
  if (tok === '_') return;
  const [t, p] = split(tok);
  ED.brush = p && !ground ? { kind: 'prop', code: p } : { kind: 'terrain', t };
  ED.mode = 'paint';
}

/** The raw token on a hex, as written in the rows ("g.pine", "s.*"). */
export function tokenAt(id: string, r: number, c: number): string {
  return parse(content.points[id].rows)[r]?.[c] ?? '_';
}

// ---------- point settings ----------

export type PointSetting = 'pad' | 'fog' | 'backdrop';
export function setPoint(id: string, k: PointSetting, v: number | boolean | string): void {
  const P = content.points[id] as unknown as Record<string, unknown>;
  const before = P[k];
  const apply = (x: unknown) => {
    P[k] = x;
    ED.v++;
    ED.rowsDirty = true;
  };
  apply(v);
  push({ undo: () => apply(before), redo: () => apply(v) });
}

// ---------- tune ----------

export type PropFields = Pick<Prop, 'size' | 'dx' | 'dy' | 'flat'>;
const PROP_KEYS = ['size', 'dx', 'dy', 'flat'] as const;

/** The sprite Tune is working on, for a code (spent: the used-up look). */
export function tuneSprite(code: string | null, spent = false): string | undefined {
  if (!code) return undefined;
  if (code === PLAYER) return content.player.figure?.stand;
  const pr = content.props[code];
  if (!pr) return undefined;
  if (pr.type === 'npc' && pr.npc) return content.npcs[pr.npc]?.figure?.stand;
  return spent && pr.spent ? pr.spent : pr.sprite;
}
/** Figures are sized by their height, not by a prop's size and offsets. */
export const isFigure = (code: string | null) => code === PLAYER || content.props[code ?? '']?.type === 'npc';

const r3 = (x: number) => Math.round(x * 1000) / 1000;

interface TuneState {
  sprite?: { id: string; t: Tune | undefined };
  prop?: { code: string; f: PropFields };
}
let tuneOpen: { before: TuneState; capture: () => TuneState; timer: number } | null = null;

function snapSprite(id: string) {
  return { id, t: tuning[id] ? { ...tuning[id] } : undefined };
}
function snapProp(code: string) {
  const p = content.props[code];
  return { code, f: { size: p.size, dx: p.dx, dy: p.dy, flat: p.flat } };
}
function restoreTune(st: TuneState) {
  if (st.sprite) {
    if (st.sprite.t) tuning[st.sprite.id] = { ...st.sprite.t };
    else delete tuning[st.sprite.id];
    applyTune(st.sprite.id);
  }
  if (st.prop) {
    writeProp(st.prop.code, st.prop.f);
  }
  ED.v++;
  ED.tuneDirty = true;
}
function writeProp(code: string, f: PropFields) {
  const p = content.props[code];
  for (const k of PROP_KEYS) {
    const v = f[k];
    if (v === undefined || v === false) delete p[k];
    else (p as unknown as Record<string, unknown>)[k] = v;
  }
  changedProps.add(code);
}

/** Changes that come in a run (a drag, a slider) make one undo step: it closes after a short pause. */
function touch(st: () => TuneState) {
  if (tuneOpen) {
    clearTimeout(tuneOpen.timer);
  } else {
    tuneOpen = { before: st(), capture: st, timer: 0 };
  }
  tuneOpen.timer = window.setTimeout(closeTuneStep, 500);
}
function closeTuneStep() {
  if (!tuneOpen) return;
  clearTimeout(tuneOpen.timer);
  const { before, capture } = tuneOpen;
  tuneOpen = null;
  const after = capture();
  if (JSON.stringify(after) === JSON.stringify(before)) return;
  push({ undo: () => restoreTune(before), redo: () => restoreTune(after) });
}

/** Change a sprite's tuning. A value of undefined goes back to the cut value or the default. */
export function tuneSpriteSet(id: string, patch: Tune): void {
  if (tuneOpen && tuneOpen.before.sprite?.id !== id) closeTuneStep();
  touch(() => ({ sprite: snapSprite(id) }));
  const t = { ...(tuning[id] ?? {}) };
  for (const [k, v] of Object.entries(patch) as [keyof Tune, number | undefined][]) {
    if (v === undefined) delete t[k];
    else t[k] = r3(v);
  }
  if (Object.keys(t).length) tuning[id] = t;
  else delete tuning[id];
  applyTune(id);
  ED.v++;
  ED.tuneDirty = true;
}

/** Change a prop's size or offsets on the hex (all its copies, everywhere). */
export function tunePropSet(code: string, patch: PropFields): void {
  if (tuneOpen && tuneOpen.before.prop?.code !== code) closeTuneStep();
  touch(() => ({ prop: snapProp(code) }));
  const f = { ...snapProp(code).f };
  for (const k of PROP_KEYS) if (k in patch) (f as Record<string, unknown>)[k] = typeof patch[k] === 'number' ? r3(patch[k] as number) : patch[k];
  writeProp(code, f);
  ED.v++;
  ED.tuneDirty = true;
}

/** Select what Tune works on, and the hex it's shown on. */
export function tuneSelect(code: string | null, key?: string | null): void {
  closeTuneStep();
  ED.mode = 'tune';
  ED.tune.code = code;
  ED.tune.spent = false;
  if (key !== undefined) ED.tune.key = key;
}

// ---------- save, open, close ----------

export async function save(id: string): Promise<void> {
  closeTuneStep();
  if (!dirty()) {
    ED.note = 'Nothing to save';
    return;
  }
  ED.note = 'Saving…';
  try {
    if (ED.rowsDirty) {
      const P = content.points[id];
      const patch = { rows: P.rows, pad: P.pad ?? null, fog: P.fog, backdrop: P.backdrop ?? null };
      await post('/__dev/save-point', { id, patch });
      ED.rowsDirty = false;
    }
    if (ED.tuneDirty) {
      const props: Record<string, Record<string, number | boolean | null>> = {};
      for (const code of changedProps) {
        const p = content.props[code];
        props[code] = { size: p.size ?? null, dx: p.dx ?? null, dy: p.dy ?? null, flat: p.flat ? true : null };
      }
      await post('/__dev/save-tuning', { tuning, props });
      changedProps.clear();
      ED.tuneDirty = false;
    }
    ED.note = 'Saved';
  } catch (e) {
    ED.note = `Save failed: ${e instanceof Error ? e.message : e}`;
  }
}
async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
}

export function openEditor(): void {
  ED.on = true;
  undos.length = redos.length = 0;
  ED.undos = ED.redos = 0;
  off = [0, 0];
  ED.note = '';
  ED.preview = false;
}

/** Leave the editor: if your hex is gone, you're put on the way out; the point's enemies reroll. */
export function closeEditor(): void {
  closeTuneStep();
  ED.on = false;
  const id = G.s.point;
  if (!id) return;
  act((s) => {
    delete s.foeRolls[id];
    delete s.foes[id];
    E.enterPoint(s, content, id, s.pos ?? undefined);
  });
}

// unsaved work: the browser asks before a reload or close
window.addEventListener('beforeunload', (e) => {
  if (dirty()) e.preventDefault();
});
