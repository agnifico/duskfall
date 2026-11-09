// What the UI says about each element: colour, the play style, the alignments to come, the full set's effect
// (which works only for a player of that element).
// The rules are in engine/elements.ts; the design in design/ELEMENTS.md.
import { BEATS, ELEMENTS, elementMult, type Element } from '../engine/elements';

export const ELEMENT_COLOUR: Record<Element, string> = { fire: '#e0603a', water: '#3a8fe0', air: '#9fd4d0', earth: '#8a6a3a', dark: '#5a3a8a', light: '#e8d27a' };

export const ELEMENT_INFO: Record<Element, { name: string; style: string; alignments: string; set: string }> = {
  fire: { name: 'Fire', style: 'All offence, little else. Hits hardest of all.', alignments: 'Blaze or Lightning', set: 'Elemental damage +15%.' },
  water: { name: 'Water', style: 'Sustain: healing, and wearing enemies down.', alignments: 'Flowing or Frost', set: 'Each elemental hit that lands heals 3% of your health.' },
  earth: { name: 'Earth', style: 'Defence turned into attack. Slow and certain.', alignments: 'Terra, Flora or Fauna', set: 'Elemental attack +10% of your physical defence.' },
  air: { name: 'Air', style: 'Moving and dodging. Weaker on paper, hard to pin down. No alignments: air is fluid.', alignments: 'none', set: 'Dash costs half the Spirit and goes one hex further.' },
  light: { name: 'Light', style: 'Precision. Strong against Dark, and weak to it.', alignments: 'Radiant or Dusk', set: 'No set yet.' },
  dark: { name: 'Dark', style: 'Heavy blows. Strong against Light, and weak to it.', alignments: 'its own or Dusk', set: 'No set yet.' },
};

export const elName = (e: string | null | undefined) => (e && e in ELEMENT_INFO ? ELEMENT_INFO[e as Element].name : 'None');

/** "Beats Fire · weak to Air" */
export function matchupLine(e: Element): string {
  const beats = BEATS[e].map(elName);
  const weakTo = ELEMENTS.filter((x) => BEATS[x].includes(e)).map(elName);
  const self = elementMult(e, e) < 1 ? ' · resists itself' : '';
  return `Beats ${beats.join(', ')} · weak to ${weakTo.join(', ')}${self}`;
}

/** ▲ (you hit it hard), ▼ (weak), or nothing. */
export const markOf = (m: number) => (m > 1 ? '▲' : m < 1 ? '▼' : '');
