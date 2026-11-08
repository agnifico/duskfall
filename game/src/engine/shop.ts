// Shops: a person with a `shop` (npcs.json) sells those items for coins, and buys anything with a `value`
// (items.json). Coins are the "coin" item, counted in the top bar. Buying and selling cost no energy.

import type { Content, GameState } from './types';
import { say } from './log';
import { track } from './telemetry';

export const coins = (s: GameState) => s.bag.coin ?? 0;

export function buy(s: GameState, c: Content, npc: string, item: string, n = 1): void {
  const line = c.npcs[npc]?.shop?.find((x) => x.item === item);
  if (!line || n < 1) return;
  const cost = line.price * n;
  if (coins(s) < cost) return say(s, `Not enough coins: that's ${cost}.`);
  s.bag.coin = coins(s) - cost;
  s.bag[item] = (s.bag[item] ?? 0) + n;
  track('buy', { npc, item, n, cost });
  say(s, `You buy ${n > 1 ? `${n} × ` : ''}${c.items[item]?.name ?? item} for ${cost} coins.`);
}

/** What the bag holds that a shop will buy, best price first. */
export function sellable(s: GameState, c: Content): { item: string; n: number; value: number }[] {
  return Object.entries(s.bag)
    .filter(([id, n]) => n > 0 && id !== 'coin' && (c.items[id]?.value ?? 0) > 0 && !c.items[id]?.slot)
    .map(([item, n]) => ({ item, n, value: c.items[item].value! }))
    .sort((a, b) => b.value - a.value);
}

export function sell(s: GameState, c: Content, item: string, n = 1): void {
  const v = c.items[item]?.value ?? 0;
  const have = s.bag[item] ?? 0;
  n = Math.min(n, have);
  if (v <= 0 || n < 1 || item === 'coin') return;
  s.bag[item] = have - n;
  if (s.bag[item] <= 0) delete s.bag[item];
  s.bag.coin = coins(s) + v * n;
  track('sell', { item, n, got: v * n });
  say(s, `You sell ${n > 1 ? `${n} × ` : ''}${c.items[item]?.name ?? item} for ${v * n} coins.`);
}
