// The dev test bench: a whole second player, swapped in for the real one while you're on it. Its own save slot,
// its own bag (everything), level, gear and skills; every quest done, so no story fires and every area is open.
// Leaving swaps the real game back exactly as it was. Nothing on the bench goes into the playtest log.

import { content } from '../content';
import { COMBAT_XP, MAX_ENERGY, MAX_SPIRIT } from '../engine/rules';
import { newGame } from '../engine/state';
import { combatLevel, maxHp } from '../engine/progress';
import { foeStats } from '../engine/combat';
import { enterPoint } from '../engine/actions';
import { grid, hexDistance } from '../engine/hex';
import { peopleOn } from '../engine/story';
import { TELEMETRY } from '../engine/telemetry';
import { wear } from '../engine/gear';
import type { GameState, Item, WornSlot } from '../engine/types';
import { loadGame, saveGame, useSlot } from './save';
import { G, act } from './game.svelte';
import { UI } from './ui.svelte';

export const BENCH_POINT = 'dev-field';
export const onBench = () => UI.bench;

/** A fresh bench player: level 10, a sword, every item, all quests done (infused), standing in the dev field. */
function freshBench(): GameState {
  const s = newGame();
  s.quests = Object.fromEntries(Object.keys(content.quests).map((id) => [id, { state: 'done', stage: 0, count: 0 }])) as GameState['quests'];
  for (const [id, it] of Object.entries(content.items)) s.bag[id] = it.slot ? 1 : 20;
  s.tags = { ...(s.tags ?? {}), infused: true }; // Heidi's infusion: elemental extra hits, and an element to choose
  s.known = Object.fromEntries(Object.keys(content.items).map((id) => [id, true as const]));
  setLevelOn(s, 10);
  kitOn(s, 'sword');
  return s;
}

/** Swap the bench in (saving the real game first) or back out. */
export function toggleBench(): void {
  if (UI.bench) {
    saveGame($state.snapshot(G.s) as GameState);
    useSlot('game');
    G.s = loadGame() ?? newGame();
    UI.bench = false;
    TELEMETRY.on = import.meta.env.DEV;
  } else {
    saveGame($state.snapshot(G.s) as GameState);
    useSlot('bench');
    const s = loadGame() ?? freshBench();
    G.s = s;
    UI.bench = true;
    TELEMETRY.on = false;
    act((st) => enterPoint(st, content, BENCH_POINT)); // in at the field's start
  }
  UI.panel = null;
  UI.map = null;
}

/** Start the bench player over. */
export function resetBench(): void {
  if (!UI.bench) return;
  G.s = freshBench();
  act((st) => enterPoint(st, content, BENCH_POINT));
}

function setLevelOn(s: GameState, level: number): void {
  const l = Math.max(1, Math.min(COMBAT_XP.length, Math.round(level)));
  s.xp = COMBAT_XP[l - 1];
  s.hp = maxHp(s, content);
}

export const setLevel = (level: number) => act((s) => setLevelOn(s, level));

const ARMOUR: WornSlot[] = ['head', 'body', 'hands', 'legs', 'feet'];
export type Kit = 'sword' | 'bow' | 'staff';

/** The best piece you can wear at your level: highest level first, then the first listed. */
function best(s: GameState, fits: (it: Item) => boolean): string | null {
  const lv = combatLevel(s);
  let pick: [string, number] | null = null;
  for (const [id, it] of Object.entries(content.items))
    if (fits(it) && (it.level ?? 1) <= lv && (!pick || (it.level ?? 1) > pick[1])) pick = [id, it.level ?? 1];
  return pick?.[0] ?? null;
}

/** Put on the best armour for your level, and the best weapon of a kind. */
function kitOn(s: GameState, kind: Kit): void {
  for (const slot of ARMOUR) {
    const id = best(s, (it) => it.slot === slot && !it.element);
    if (id) {
      s.bag[id] = Math.max(1, s.bag[id] ?? 0);
      wear(s, content, id);
    }
  }
  const w = best(s, (it) => it.slot === 'main' && it.kind === kind && !it.element);
  if (w) {
    s.bag[w] = Math.max(1, s.bag[w] ?? 0);
    wear(s, content, w);
  }
  s.hp = maxHp(s, content);
}

export const kit = (kind: Kit) => act((s) => kitOn(s, kind));

/** Health, Spirit and energy full. */
export const refill = () =>
  act((s) => {
    s.hp = maxHp(s, content);
    s.spirit = MAX_SPIRIT;
    s.energy = MAX_ENERGY;
  });

/** Enemies of a kind at a level, two or three hexes from you, calm until you start on them. */
export function spawn(kind: string, level: number, n: number): void {
  act((s) => {
    if (!s.point || !s.pos) return;
    const g = grid(content, s.point, s.day);
    const me = g.byKey.get(s.pos);
    if (!me) return;
    s.foes[s.point] ??= [];
    const taken = new Set([...s.foes[s.point].map((f) => f.pos), ...peopleOn(s, content, s.point).keys(), s.pos]);
    for (let i = 0; i < n; i++) {
      const spots = [2, 3, 4].map((d) => g.cells.filter((x) => content.terrain[x.t]?.cost != null && !x.p && !taken.has(x.key) && hexDistance(x, me) === d)).find((r) => r.length);
      if (!spots) return;
      const at = spots[Math.floor(Math.random() * spots.length)];
      taken.add(at.key);
      // "story." ids outlive the 15-minute enemy cycle
      s.foes[s.point].push({ id: `story.bench.${Date.now()}.${i}`, kind, level, pos: at.key, home: at.key, hp: foeStats(content, kind, level).hp, charge: 0, engaged: false, intent: null });
    }
  });
}

export const clearFoes = () => act((s) => s.point && (s.foes[s.point] = []));

/** Every enemy kind, by level. */
export const foeKinds = () =>
  Object.entries(content.props)
    .filter(([, p]) => p.foe)
    .map(([id, p]) => ({ id, name: p.name, level: p.foe!.level ?? 1 }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
