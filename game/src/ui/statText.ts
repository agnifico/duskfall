// Stat names, icons and how they read, for gear and the stat sheet. Show a stat with its icon wherever
// there's room: there are ten of them, and the icons are how players learn them.

import type { GameState, Stats } from '../engine/types';
import { wornIds } from '../engine/gear';
import { asset } from '../content';

export const STAT_NAME: Record<keyof Stats, string> = {
  hp: 'Health',
  patk: 'Physical Attack',
  eatk: 'Elemental Attack',
  pdef: 'Physical Defence',
  edef: 'Elemental Defence',
  spd: 'Speed',
  eva: 'Evasion',
  prc: 'Precision',
  crit: 'Crit Rate',
  critDmg: 'Crit Damage',
};

/** The painted icon for each stat (public/sprites/icons). Elemental ones share the physical icons for now. */
const ICON: Record<keyof Stats, string> = {
  hp: 'health',
  patk: 'attack',
  eatk: 'attack',
  pdef: 'defence',
  edef: 'defence',
  spd: 'speed',
  eva: 'evasion',
  prc: 'precision',
  crit: 'crit',
  critDmg: 'critdmg',
};
export const statIcon = (k: keyof Stats) => asset(`sprites/icons/${ICON[k]}.png`);

/** How a stat's value reads: "+3", "+2%", "+0.1×". */
export function statValue(k: keyof Stats, v: number): string {
  const n = k === 'crit' ? `${Math.round(v * 100)}%` : k === 'critDmg' ? `${v}×` : `${v}`;
  return `${v > 0 ? '+' : ''}${n}`;
}

export interface StatLine {
  key: keyof Stats;
  name: string;
  value: string;
  icon: string;
  bad: boolean; // a minus
}

/** A stat block as lines, for showing with icons. */
export function statRows(st: Partial<Stats> | undefined): StatLine[] {
  return (Object.entries(st ?? {}) as [keyof Stats, number][])
    .filter(([, v]) => v)
    .map(([k, v]) => ({ key: k, name: STAT_NAME[k] ?? k, value: statValue(k, v), icon: statIcon(k), bad: v < 0 }));
}

/** What eating or drinking it does: "Restores 40 HP", "+3 Physical Attack for 10 min". */
export function useLines(u: import('../engine/types').ItemUse | undefined): string[] {
  if (!u) return [];
  const out: string[] = [];
  if (u.hp) out.push(`Restores ${u.hp} HP`);
  if (u.energy) out.push(`Restores ${u.energy} energy`);
  if (u.spirit) out.push(`Restores ${u.spirit} Spirit`);
  if (u.buff) out.push(`${statRows(u.buff.stats).map((r) => `${r.value} ${r.name}`).join(', ')} for ${u.buff.minutes} min`);
  out.push(u.kind === 'food' ? 'Food: not in a fight. One food buff at a time.' : 'Potion: works in a fight, but takes your turn.');
  return out;
}
export const useVerb = (u: import('../engine/types').ItemUse) => (u.kind === 'food' ? 'Eat' : 'Drink');

/** "+3 Physical Defence": for places with no room for icons. */
export const statLines = (st: Partial<Stats> | undefined): string[] => statRows(st).map((r) => `${r.value} ${r.name}`);

/** How many of an item you have, counting what you're wearing: "2", "1 (equipped)", "3 (1 equipped)". */
export function haveText(s: GameState, id: string): string {
  const bag = s.bag[id] ?? 0;
  const worn = wornIds(s).filter((x) => x === id).length;
  if (!worn) return `${bag}`;
  return bag ? `${bag + worn} (${worn} equipped)` : worn === 1 ? '1 (equipped)' : `${worn} (equipped)`;
}
