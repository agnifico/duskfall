import type { GameState } from './types';
import { MAX_ENERGY, PLAYER_STATS, RELIC_SLOTS } from './rules';
import type { Worn } from './types';

export const noneWorn = (): Worn => ({ head: null, body: null, hands: null, legs: null, feet: null, main: null, off: null, relics: Array(RELIC_SLOTS).fill(null) });

/** Bump when the save shape changes in a way old saves can't be read as. Upgrades live in lib/save.ts. */
export const SAVE_VERSION = 5;

export function newGame(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    point: null,
    pos: null,
    visitedLands: {},
    energy: MAX_ENERGY,
    lastRegen: now,
    day: 1,
    toolTier: 1,
    bag: {},
    depleted: {},
    beaten: {},
    taken: {},
    revealed: {},
    seen: {},
    rested: false,
    talk: {},
    log: ['You wake on the sand. Somewhere above the beach, smoke rises from a chimney.'],
    seq: 1,
    hp: PLAYER_STATS.hp,
    spirit: 0,
    hpAt: now,
    restAt: null,
    foes: {},
    foeRolls: {},
    fx: [],
    fxSeq: 0,
    xp: 0,
    skills: {},
    worn: noneWorn(), // no weapon at first: Sylvie's first quest gives one (design/ROADMAP.md §3)
    buffs: [],
    quests: {},
    tags: {},
    beats: [],
  };
}
