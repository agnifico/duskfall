// Gear numbers from a formula (design/GEAR_FORMULA.md). A piece's stats come from its level, its slot and its
// set's profile, split from REF_GEAR: what the enemies expect gear of that level to add (rules.ts). Traveller's
// and Padded were set by hand and already sit on this curve, so they keep their numbers; anything with no
// stats, or marked placeholder, is filled in when content loads. A new tier is one line of data.

import type { GearSet, Item, Stats } from './types';
import { REF_GEAR } from './rules';

type Armour = 'head' | 'body' | 'hands' | 'legs' | 'feet';
/** Each armour slot's share of the set's health and of its defence (from Traveller's and Padded). */
const HP_SHARE: Record<Armour, number> = { head: 0.15, body: 0.35, hands: 0.1, legs: 0.25, feet: 0.15 };
const DEF_SHARE: Record<Armour, number> = { head: 0.18, body: 0.3, hands: 0.18, legs: 0.23, feet: 0.11 };

/** A set's leaning. heavy: iron and steel. light: leather, quick. arcane: mage cloth and scale (less defence,
 *  more elemental defence, and elemental attack spread across the pieces). */
export const PROFILES = {
  heavy: { hp: 1, pdef: 1, edef: 0.6, eatk: 0, quick: 1 },
  light: { hp: 0.85, pdef: 0.75, edef: 0.6, eatk: 0, quick: 1.6 },
  arcane: { hp: 0.8, pdef: 0.55, edef: 1, eatk: 0.25, quick: 1 },
} as const;
export type Profile = keyof typeof PROFILES;

/** Weapons by kind, as multiples of the level's reference weapon attack (from the Traveller's weapons). */
const WEAPON: Record<string, Partial<Stats>> = {
  sword: { patk: 1 },
  axe: { patk: 1.2, spd: -1 },
  mace: { patk: 1.1, critDmg: 0.1 },
  spear: { patk: 1, prc: 2 },
  dagger: { patk: 0.8, spd: 2, crit: 0.03 },
  bow: { patk: 1, prc: 3 },
  staff: { patk: 0.4, eatk: 1.4 },
};

/** Small stats (precision, speed, evasion) grow slowly with level. */
const small = (v: number, l: number) => Math.round(v * (1 + (l - 1) / 15));

/** A piece's stats, or null if the formula doesn't cover it (relics: those are made one by one). */
export function formulaStats(it: Item, profile: Profile = 'heavy'): Partial<Stats> | null {
  const l = Math.max(1, it.level ?? 1);
  const p = PROFILES[profile];
  if (it.slot === 'main') {
    const w = WEAPON[it.kind ?? ''];
    if (!w) return null;
    const out: Partial<Stats> = {};
    for (const [k, v] of Object.entries(w) as [keyof Stats, number][]) {
      if (k === 'patk' || k === 'eatk') out[k] = Math.round(v * REF_GEAR.patk(l));
      else if (k === 'crit' || k === 'critDmg') out[k] = v;
      else out[k] = small(v, l);
    }
    if (profile === 'arcane' && it.kind !== 'staff') out.eatk = Math.round(0.4 * REF_GEAR.patk(l)); // an elemental bow or blade
    return out;
  }
  if (it.slot === 'off') {
    if (it.kind === 'shield') return { hp: Math.round(0.25 * REF_GEAR.hp(l)), pdef: Math.round(0.83 * REF_GEAR.pdef(l)), edef: Math.round(0.5 * REF_GEAR.pdef(l)) };
    if (it.kind === 'quiver') return { prc: small(3, l) };
    return null;
  }
  const slot = it.slot as Armour;
  if (!(slot in HP_SHARE)) return null;
  const out: Partial<Stats> = {
    hp: Math.round(p.hp * HP_SHARE[slot] * REF_GEAR.hp(l)),
    pdef: Math.max(1, Math.round(p.pdef * DEF_SHARE[slot] * REF_GEAR.pdef(l))),
  };
  if (slot !== 'feet' && slot !== 'hands') out.edef = Math.max(1, Math.round(p.edef * DEF_SHARE[slot] * REF_GEAR.pdef(l)));
  if (slot === 'hands') out.prc = small(1 * p.quick, l);
  if (slot === 'feet') Object.assign(out, { spd: small(2 * p.quick, l), eva: small(1 * p.quick, l) });
  if (p.eatk) out.eatk = Math.round(p.eatk * HP_SHARE[slot] * REF_GEAR.patk(l));
  return out;
}

/** A full set's bonus (5 pieces), from the same curve (Padded's hand-set one sits on it). */
export function formulaSetBonus(level: number, profile: Profile = 'heavy'): Partial<Stats> {
  const p = PROFILES[profile];
  return { hp: Math.round(0.22 * p.hp * REF_GEAR.hp(level)), pdef: Math.round(0.12 * p.pdef * REF_GEAR.pdef(level)), edef: Math.round(0.12 * p.edef * REF_GEAR.pdef(level)) };
}

/** Fill in every piece that has no numbers yet, and every set with no bonus. Runs once as content loads. */
export function applyGearFormula(items: Record<string, Item>, sets: Record<string, GearSet>): void {
  const setLevel: Record<string, number> = {};
  for (const it of Object.values(items)) {
    if (!it.slot) continue;
    if (it.set) setLevel[it.set] = Math.min(setLevel[it.set] ?? Infinity, it.level ?? 1);
    const empty = !it.stats || !Object.keys(it.stats).length;
    if (!empty && !it.placeholder) continue;
    const st = formulaStats(it, (it.set && sets[it.set]?.profile) || 'heavy');
    if (!st) continue;
    it.stats = st;
    it.placeholder = false;
    it.formula = true;
  }
  for (const [id, set] of Object.entries(sets)) {
    if (set.bonuses?.length || !(id in setLevel) || !Number.isFinite(setLevel[id])) continue;
    set.bonuses = [{ pieces: 5, stats: formulaSetBonus(setLevel[id], set.profile ?? 'heavy') }];
  }
}
