// Crafting: recipes (content/recipes.json) turn materials into food, potions and gear. Instant; each thing made
// costs CRAFT_ENERGY ⚡. No station or skill level yet.

import type { Content, GameState } from './types';
import { CRAFT_ENERGY, DEV_RULES } from './rules';
import { spendEnergy } from './actions';
import { say } from './log';
import { track } from './telemetry';

/** How many times your bag has the materials for. */
export function materialCrafts(s: GameState, c: Content, id: string): number {
  const r = c.recipes[id];
  if (!r) return 0;
  return Math.min(...Object.entries(r.needs).map(([item, n]) => Math.floor((s.bag[item] ?? 0) / n)));
}

/** How many times you could make it: materials and energy both. */
export function maxCrafts(s: GameState, c: Content, id: string): number {
  const byEnergy = DEV_RULES.freeEnergy ? Infinity : Math.floor(s.energy / CRAFT_ENERGY);
  return Math.min(materialCrafts(s, c, id), byEnergy);
}

/** Make it `times` times, if the bag holds enough. */
export function craft(s: GameState, c: Content, id: string, times = 1, now = Date.now()): void {
  const r = c.recipes[id];
  if (!r || times < 1) return;
  if (materialCrafts(s, c, id) < times) return say(s, `Not enough to make ${times > 1 ? `${times} of those` : 'that'}.`);
  if (!spendEnergy(s, CRAFT_ENERGY * times, now, 'craft')) return;
  for (const [item, n] of Object.entries(r.needs)) {
    s.bag[item] -= n * times;
    if (s.bag[item] <= 0) delete s.bag[item];
  }
  const made = (r.n ?? 1) * times;
  s.bag[r.makes] = (s.bag[r.makes] ?? 0) + made;
  track('craft', { recipe: id, times, made });
  say(s, `You make ${made > 1 ? `${made} × ` : ''}${c.items[r.makes]?.name ?? r.makes}.`);
}
