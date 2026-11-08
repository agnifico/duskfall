// Stat names, icons and how they read, for gear and the stat sheet. Show a stat with its icon wherever
// there's room: there are ten of them, and the icons are how players learn them.

import type { Stats } from '../engine/types';
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

/** "+3 Physical Defence": for places with no room for icons. */
export const statLines = (st: Partial<Stats> | undefined): string[] => statRows(st).map((r) => `${r.value} ${r.name}`);
