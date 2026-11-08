// Daily quests: each person with a pool (content/errands.json) offers a couple each day, fresh at local midnight.
// Take one at their card, do it, hand it in to them. Kills count from when you take it; items are taken when you
// hand it in. Walking is free, so these live on the people themselves, not at a central board.

import type { Content, Errand, GameState } from './types';
import { hash, mulberry32 } from './rng';
import { applyEffects, check } from './story';
import { say } from './log';
import { track } from './telemetry';

export const ERRANDS_PER_DAY = 2;

/** Today, by the player's clock: daily quests turn over at local midnight. */
export function today(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Today's record (without changing the state: safe to read anywhere). */
function day(s: GameState, now: number) {
  const e = s.errands;
  return e && e.date === today(now) ? e : { date: today(now), taken: {}, done: [] as string[] };
}

/** Today's record, starting a new day if needed. Only from actions. */
function dayFor(s: GameState, now: number) {
  if (s.errands?.date !== today(now)) s.errands = { date: today(now), taken: {}, done: [] };
  return s.errands!;
}

/** What a person offers today: a fixed pick from those of their pool that are open to you. */
export function offered(s: GameState, c: Content, npc: string, now = Date.now()): Errand[] {
  const pool = (c.errands[npc] ?? []).filter((e) => !e.opens || check(s, c, e.opens));
  const rng = mulberry32(hash(`${today(now)}:${npc}`));
  const order = pool.map((e) => ({ e, k: rng() })).sort((a, b) => a.k - b.k);
  return order.slice(0, ERRANDS_PER_DAY).map((x) => x.e);
}

export type ErrandState = 'open' | 'taken' | 'ready' | 'done';

export function errandState(s: GameState, c: Content, e: Errand, now = Date.now()): ErrandState {
  const d = day(s, now);
  if (d.done.includes(e.id)) return 'done';
  const t = d.taken[e.id];
  if (!t) return 'open';
  return ready(s, e, t.count) ? 'ready' : 'taken';
}

const ready = (s: GameState, e: Errand, count: number) =>
  (!e.kill || count >= e.kill.n) && (!e.bring || (s.bag[e.bring.item] ?? 0) >= e.bring.n);

/** "2/4" for kills, "7/15" for things to bring. */
export function errandProgress(s: GameState, e: Errand, now = Date.now()): string {
  const t = day(s, now).taken[e.id];
  if (e.kill) return `${Math.min(t?.count ?? 0, e.kill.n)}/${e.kill.n}`;
  if (e.bring) return `${Math.min(s.bag[e.bring.item] ?? 0, e.bring.n)}/${e.bring.n}`;
  return '';
}

export function takeErrand(s: GameState, c: Content, npc: string, id: string, now: number): void {
  const e = offered(s, c, npc, now).find((x) => x.id === id);
  if (!e) return;
  const d = dayFor(s, now);
  if (d.taken[id] || d.done.includes(id)) return;
  d.taken[id] = { count: 0 };
  track('errand', { id, npc, step: 'take' });
  say(s, `Daily quest: ${e.title}.`);
}

export function handInErrand(s: GameState, c: Content, npc: string, id: string, now: number): void {
  const e = offered(s, c, npc, now).find((x) => x.id === id);
  const d = dayFor(s, now);
  const t = e && d.taken[id];
  if (!e || !t || !ready(s, e, t.count)) return;
  if (e.bring) {
    s.bag[e.bring.item] -= e.bring.n;
    if (s.bag[e.bring.item] <= 0) delete s.bag[e.bring.item];
  }
  delete d.taken[id];
  d.done.push(id);
  applyEffects(s, c, e.reward);
  track('errand', { id, npc, step: 'done' });
  say(s, `${c.npcs[npc]?.name ?? npc}: “${e.thanks ?? 'Thank you.'}”`);
}

/** A kill counts toward every daily quest you've taken that wants it. */
export function errandKill(s: GameState, c: Content, kind: string, point: string | null): void {
  const d = s.errands;
  if (!d) return;
  for (const [id, t] of Object.entries(d.taken)) {
    const e = Object.values(c.errands).flat().find((x) => x.id === id);
    const k = e?.kill;
    if (!k) continue;
    const kinds = Array.isArray(k.kind) ? k.kind : [k.kind];
    if (!kinds.includes('*') && !kinds.includes(kind)) continue;
    if (k.at && (!point || !k.at.includes(point))) continue;
    t.count += 1;
  }
}

/** The daily quests you've taken today, for the tracker. */
export function takenErrands(s: GameState, c: Content, now = Date.now()): { e: Errand; npc: string; progress: string; ready: boolean }[] {
  const d = day(s, now);
  return Object.entries(c.errands).flatMap(([npc, pool]) =>
    pool.filter((e) => d.taken[e.id]).map((e) => ({ e, npc, progress: errandProgress(s, e, now), ready: ready(s, e, d.taken[e.id].count) })),
  );
}
