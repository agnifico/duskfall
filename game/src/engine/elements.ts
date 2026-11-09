// Elements (design/ELEMENTS.md). Six: Fire, Water, Earth, Air, Light, Dark.
// The loop: Water beats Fire, Fire beats Earth, Earth beats Air, Air beats Water. Light and Dark beat each other.
// Fire, Water and Earth resist themselves; Air, Light and Dark don't. Strong ×1.5, weak ×0.75.
//
// Your element is yours, not your gear's (like Genshin: a sword called Aqua-something doesn't make you water).
// You choose it at Heidi's Gift and can re-attune free once a week. You attack and defend as it: it scales your
// elemental damage, and what enemies' blows (which carry their elements) do to you. Gear is themed loosely: an
// elemental set's effect only works for a player of its element. An enemy can have two elements: a matchup
// against it, or from it, is the average of the two.

import type { Content, GameState } from './types';
import { activeSets } from './gear';

export const ELEMENTS = ['fire', 'water', 'earth', 'air', 'light', 'dark'] as const;
export type Element = (typeof ELEMENTS)[number];

export const BEATS: Record<Element, Element[]> = {
  water: ['fire'],
  fire: ['earth'],
  earth: ['air'],
  air: ['water'],
  light: ['dark'],
  dark: ['light'],
};
const SELF_RESIST = new Set<Element>(['fire', 'water', 'earth']);
export const STRONG = 1.5;
export const WEAK = 0.75;
export const REATTUNE_MS = 7 * 24 * 3600_000; // a free change of element, once a week

export const isElement = (x: unknown): x is Element => typeof x === 'string' && (ELEMENTS as readonly string[]).includes(x);

/** How hard an attack of one element lands on a defender of another (1 if either has none). */
export function elementMult(atk: Element | null | undefined, def: Element | null | undefined): number {
  if (!atk || !def) return 1;
  if (BEATS[atk].includes(def)) return STRONG;
  if (BEATS[def].includes(atk)) return WEAK;
  if (atk === def && SELF_RESIST.has(atk)) return WEAK;
  return 1;
}

/** Your element (attack and defence alike), if you've chosen one. */
export const myElement = (s: GameState): Element | null => (isElement(s.element) ? s.element : null);

/** The average of several matchups (an enemy with two elements); 1 with none. */
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 1);

/** Your elemental hit against an enemy of these elements. */
export const multOnFoe = (s: GameState, els: Element[]) => avg(els.map((e) => elementMult(myElement(s), e)));
/** An enemy's blow, of these elements, against you. */
export const multOnYou = (s: GameState, els: Element[]) => avg(els.map((e) => elementMult(e, myElement(s))));

/** An enemy's elements: none, one, or two. */
export function foeElements(c: Content, kind: string): Element[] {
  const e = c.props[kind]?.foe?.element;
  return (Array.isArray(e) ? e : e ? [e] : []).filter(isElement);
}

/** The element set effects you have on: a full elemental set (sets.json `passive`) of your own element. */
export function passives(s: GameState, c: Content): Set<Element> {
  const out = new Set<Element>();
  for (const set of activeSets(s, c))
    for (const b of set.bonuses) if (b.on && isElement(b.passive) && b.passive === myElement(s)) out.add(b.passive);
  return out;
}

/** Whether you can choose (or change) your element now, and if not, why. */
export function attuneBlocked(s: GameState, now: number, dev: boolean): string | null {
  if (dev) return null;
  if (!s.tags?.infused) return 'Heidi can wake your element first (Heidi’s Gift, in the Pine Grove)';
  if (s.element && s.elementAt && now - s.elementAt < REATTUNE_MS) {
    const days = Math.ceil((REATTUNE_MS - (now - s.elementAt)) / (24 * 3600_000));
    return `You can re-attune in ${days} day${days === 1 ? '' : 's'}`;
  }
  return null;
}

/** Choose your element. */
export function attune(s: GameState, e: Element, now: number): void {
  s.element = e;
  s.elementAt = now;
}
