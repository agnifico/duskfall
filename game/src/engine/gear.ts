// Gear: what you wear and what it adds. Worn things leave the bag and come back when taken off.
// Armour: head, body, hands, legs, feet. Main and off hand (a two-handed main hand keeps the off hand empty).
// Relics: RELIC_SLOTS of them. Gear asks for a combat level. Sets (sets.json) add a bonus at so many pieces.

import type { Content, GameState, Item, Stats, Worn, WornSlot } from './types';
import { RELIC_SLOTS } from './rules';
import { say } from './log';
import { track } from './telemetry';
import { combatLevel } from './progress';
import { noneWorn } from './state';

export const ARMOUR: WornSlot[] = ['head', 'body', 'hands', 'legs', 'feet'];
export const SLOT_NAME: Record<string, string> = { head: 'Head', body: 'Body', hands: 'Hands', legs: 'Legs', feet: 'Feet', main: 'Main hand', off: 'Off hand', relic: 'Relic' };

/** Every item id you're wearing. */
export function wornIds(s: GameState): string[] {
  const w = s.worn ?? noneWorn();
  return [...ARMOUR.map((k) => w[k]), w.main, w.off, ...w.relics].filter((x): x is string => !!x);
}

/** Pieces worn per set, and the bonuses that count. */
export function activeSets(s: GameState, c: Content): { id: string; name: string; worn: number; bonuses: { pieces: number; on: boolean; stats: Partial<Stats>; passive?: string }[] }[] {
  const n: Record<string, number> = {};
  for (const id of wornIds(s)) {
    const set = c.items[id]?.set;
    if (set) n[set] = (n[set] ?? 0) + 1;
  }
  return Object.entries(n).map(([id, worn]) => {
    const set = c.sets[id];
    return { id, name: set?.name ?? id, worn, bonuses: (set?.bonuses ?? []).map((b) => ({ ...b, on: worn >= b.pieces })) };
  });
}

/** What all your gear adds, set bonuses included. */
export function gearStats(s: GameState, c: Content): Partial<Stats> {
  const out: Partial<Record<keyof Stats, number>> = {};
  const add = (st: Partial<Stats> | undefined) => {
    for (const [k, v] of Object.entries(st ?? {}) as [keyof Stats, number][]) out[k] = (out[k] ?? 0) + v;
  };
  for (const id of wornIds(s)) add(c.items[id]?.stats);
  for (const set of activeSets(s, c)) for (const b of set.bonuses) if (b.on) add(b.stats);
  return out;
}

/** Why you can't wear it, or null. */
export function cantWear(s: GameState, c: Content, id: string): string | null {
  const it: Item | undefined = c.items[id];
  if (!it?.slot) return "That isn't something to wear";
  if (!(s.bag[id] > 0)) return 'Not in your bag';
  if ((it.level ?? 1) > combatLevel(s)) return `Needs level ${it.level}`;
  const main = s.worn.main ? c.items[s.worn.main] : undefined;
  if (it.slot === 'off' && main?.twoHanded && !main.offhand?.includes(it.kind ?? '')) return 'Your main hand takes both hands';
  return null;
}

const toBag = (s: GameState, id: string | null) => {
  if (id) s.bag[id] = (s.bag[id] ?? 0) + 1;
};

/** What you'd be wearing after putting it on, and what goes back to the bag. Pure: for wear() and for previews.
 *  A relic goes in the first free relic slot (or `index`; the first slot when all are full). */
export function wornAfter(w: Worn, c: Content, id: string, index?: number): { worn: Worn; back: string[] } {
  const worn: Worn = { ...w, relics: [...w.relics] };
  const back: string[] = [];
  const out = (x: string | null) => x && back.push(x);
  const it = c.items[id];
  if (it.slot === 'relic') {
    const i = index ?? Math.max(0, worn.relics.indexOf(null));
    out(worn.relics[i] ?? null);
    worn.relics[i] = id;
  } else {
    const slot = it.slot as WornSlot;
    out(worn[slot]);
    worn[slot] = id;
    const offKind = worn.off ? c.items[worn.off]?.kind : undefined;
    if (slot === 'main' && it.twoHanded && !it.offhand?.includes(offKind ?? '')) {
      out(worn.off);
      worn.off = null;
    }
  }
  return { worn, back };
}

/** Put it on, taking off whatever was there. A relic goes in the first free relic slot (or `index`). */
export function wear(s: GameState, c: Content, id: string, index?: number): void {
  const why = cantWear(s, c, id);
  if (why) return say(s, `${c.items[id]?.name ?? id}: ${why.toLowerCase()}.`);
  s.bag[id] -= 1;
  if (s.bag[id] <= 0) delete s.bag[id];
  const { worn, back } = wornAfter(s.worn ?? noneWorn(), c, id, index);
  s.worn = worn;
  for (const x of back) toBag(s, x);
  track('wear', { item: id, slot: c.items[id].slot });
  // a weapon's own skill goes on the hotbar, in the first empty slot, if it isn't there already
  for (const sk of c.items[id].grants ?? []) {
    const bar = s.hotbar ?? [];
    if (!bar.includes(`skill:${sk}`) && bar.indexOf(null) >= 0) bar[bar.indexOf(null)] = `skill:${sk}`;
  }
}

/** Take it off, back into the bag. */
export function takeOff(s: GameState, slot: WornSlot | 'relic', index = 0): void {
  s.worn ??= noneWorn();
  const id = slot === 'relic' ? s.worn.relics[index] : s.worn[slot];
  if (!id) return;
  toBag(s, id);
  if (slot === 'relic') s.worn.relics[index] = null;
  else s.worn[slot] = null;
  track('takeoff', { item: id, slot });
}

export const relicSlots = () => RELIC_SLOTS;
