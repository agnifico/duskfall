// The numbers. Tune here.

export const MAX_ENERGY = 30;
export const ENERGY_NOTCH = 3; // the energy bar marks every this much
export const REGEN_MS = 30_000; // one energy every 30 s: empty to full in 15 minutes
export const COST = { gather: 3, search: 2 } as const;
export const SEARCH_RADIUS = 2;
export const LOG_LENGTH = 12;

/** The heroine at the start (Dawn's Journey's base stats). */
export const PLAYER_STATS = { hp: 100, patk: 10, eatk: 10, pdef: 10, edef: 10, spd: 20, eva: 20, prc: 10, crit: 0.1, critDmg: 1.25 } as const;
/** Missing enemy stats default to these. A missing elemental attack or defence copies the physical one. */
export const FOE_DEFAULTS = { patk: 5, pdef: 5, spd: 20, eva: 0, prc: 0, crit: 0, critDmg: 1.25 } as const;
export const HP_REGEN_MS = 9_000; // one HP every 9 s outside a fight: empty to full in 15 minutes
export const CYCLE_MS = 900_000; // enemies roll fresh every 15 minutes (a full energy bar)
export const FREE_REROLLS = 2; // per point per cycle
export const KO_HP = 0.5; // knocked out, you wake with this share of your HP
export const BASIC_ATTACK = { shape: 'arc', width: 1 } as const;
export const MAX_SPIRIT = 100;
export const SPIRIT_PER_BASIC = 15; // Spirit each basic attack builds, hit or miss

// ---------- levels (engine/progress.ts) ----------
/** Life skills: total XP to reach each level, from level 1. Its length is the level cap (5 for now). */
export const SKILL_XP = [0, 60, 160, 320, 560];
export const XP_PER_ENERGY = 10; // a gather's skill XP, per ⚡ it costs, unless the node says otherwise
export const YIELD_PER_LEVEL = 0.1; // each skill level above 1 adds this share to a ranged yield (fixed yields stay)
/** Your combat level: total XP to reach each level. */
export const COMBAT_XP = [0, 50, 130, 260, 460, 760, 1200, 1850, 2800, 4200];
/** What each combat level above 1 adds to your stats: all four attacks and defences, to keep you rounded. */
export const LEVEL_STATS = { hp: 5, patk: 1, eatk: 1, pdef: 1, edef: 1 } as const;

export const RELIC_SLOTS = 4; // as in Dawn's Journey

/** Developer switches the engine reads. Set by the UI from Settings › Dev mode; never saved with the game. */
export const DEV_RULES = {
  freeEnergy: false, // walking and actions cost no energy
  damage: 'dj' as 'dj' | 'ratio', // damage formula under test: Dawn's Journey's, or attack² ÷ (attack + defence)
  chip: 2, // HP an enemy next to you takes each tick it doesn't attack: the cost of ignoring it
};
