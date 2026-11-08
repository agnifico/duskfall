// Crafting: recipes (content/recipes.json) turn materials into food, potions and gear. Free and instant for
// now: no energy, no station, no skill level. Those come later, if they earn their place.

import type { Content, GameState } from './types';
import { say } from './log';
import { track } from './telemetry';

/** How many times you could make it with what's in your bag. */
export function maxCrafts(s: GameState, c: Content, id: string): number {
  const r = c.recipes[id];
  if (!r) return 0;
  return Math.min(...Object.entries(r.needs).map(([item, n]) => Math.floor((s.bag[item] ?? 0) / n)));
}

/** Make it `times` times, if the bag holds enough. */
export function craft(s: GameState, c: Content, id: string, times = 1): void {
  const r = c.recipes[id];
  if (!r || times < 1) return;
  if (maxCrafts(s, c, id) < times) return say(s, `Not enough to make ${times > 1 ? `${times} of those` : 'that'}.`);
  for (const [item, n] of Object.entries(r.needs)) {
    s.bag[item] -= n * times;
    if (s.bag[item] <= 0) delete s.bag[item];
  }
  const made = (r.n ?? 1) * times;
  s.bag[r.makes] = (s.bag[r.makes] ?? 0) + made;
  track('craft', { recipe: id, times, made });
  say(s, `You make ${made > 1 ? `${made} × ` : ''}${c.items[r.makes]?.name ?? r.makes}.`);
}
