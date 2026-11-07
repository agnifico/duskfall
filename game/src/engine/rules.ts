// The numbers. Tune here.

export const MAX_ENERGY = 30;
export const ENERGY_NOTCH = 3; // the energy bar marks every this much
export const REGEN_MS = 30_000; // one energy every 30 s: empty to full in 15 minutes
export const COST = { gather: 3, search: 2 } as const;
export const SEARCH_RADIUS = 2;
export const LOG_LENGTH = 12;

/** The heroine at the start (Dawn's Journey's base stats). */
export const PLAYER_STATS = { hp: 100, atk: 10, def: 10, spd: 20, eva: 20, prc: 10, crit: 0.1, critDmg: 1.25 } as const;
/** Missing enemy stats default to these. */
export const FOE_DEFAULTS = { atk: 5, def: 5, spd: 20, eva: 0, prc: 0, crit: 0, critDmg: 1.25 } as const;
export const HP_REGEN_MS = 9_000; // one HP every 9 s outside a fight: empty to full in 15 minutes
export const CYCLE_MS = 900_000; // enemies roll fresh every 15 minutes (a full energy bar)
export const FREE_REROLLS = 2; // per point per cycle
export const KO_HP = 0.5; // knocked out, you wake with this share of your HP
export const BASIC_ATTACK = { shape: 'arc', width: 1 } as const;
export const MAX_SPIRIT = 100;
export const SPIRIT_PER_BASIC = 15; // Spirit each basic attack builds, hit or miss

/** Developer switches the engine reads. Set by the UI from Settings › Dev mode; never saved with the game. */
export const DEV_RULES = {
  freeEnergy: false, // walking and actions cost no energy
  damage: 'dj' as 'dj' | 'ratio', // damage formula under test: Dawn's Journey's, or attack² ÷ (attack + defence)
  chip: 2, // HP an enemy next to you takes each tick it doesn't attack: the cost of ignoring it
};
