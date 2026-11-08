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
/** The XP curve (design/ROADMAP.md §4.1). Two knobs make it: what one kill is worth at each enemy level, and
 *  how many kills a level takes. Levels 1–5 are quick; from 5 on every level is ~8 kills (about one energy bar),
 *  while kill XP grows, so it never gets harder or easier. Enemies and quests take their XP from the same curve. */
export const LEVEL_CAP = 25;
export const KILL_XP_BASE = 25; // a level 1 enemy
export const KILL_XP_GROWTH = 1.12; // each enemy level is worth this much more
export const KILLS_EARLY = [2, 4, 5, 6]; // levels 1→2 (the ambush at Sylvie's) to 4→5
export const KILLS_PER_LEVEL = 8; // from level 5 on
/** Combat XP for beating an enemy of this level. */
export const killXp = (level: number) => Math.round(KILL_XP_BASE * KILL_XP_GROWTH ** (Math.max(1, level) - 1));
// ---------- enemy stats from their level (engine/combat.ts › foeStats; design/COMBAT.md › 7) ----------
/** Enemies are tuned against a reference player of the same level wearing gear for that level: you beat an
 *  enemy of your level in FOE_HITS hits with a weapon (about twice that unarmed at level 1), and each of its hits
 *  takes FOE_HIT_SHARE of your health. Gear that lags your level (Traveller's at level 9) makes fights longer and
 *  costlier: that's the gap potions, food and skills fill. Each enemy type scales these with `mult`. */
export const FOE_HITS = 4;
export const FOE_HIT_SHARE = 0.1;
/** What gear for a level is expected to add: a weapon's attack, armour's health and defence, all pieces together. */
export const REF_GEAR = {
  patk: (l: number) => 10 + 0.8 * (l - 1),
  hp: (l: number) => 40 + 6 * (l - 1),
  pdef: (l: number) => 6 + 1.2 * (l - 1),
};
/** An enemy's defence at a level (physical and elemental alike), before its type's `mult`. */
export const FOE_DEF = (l: number) => 4 + 1.5 * (l - 1);

/** Your combat level: total XP to reach each level, from level 1. */
export const COMBAT_XP: number[] = (() => {
  const out = [0];
  for (let l = 1; l < LEVEL_CAP; l++) {
    const exact = KILL_XP_BASE * KILL_XP_GROWTH ** (l - 1);
    out.push(out[l - 1] + Math.round((KILLS_EARLY[l - 1] ?? KILLS_PER_LEVEL) * exact));
  }
  return out;
})();
/** What each combat level above 1 adds to your stats: all four attacks and defences, to keep you rounded. */
export const LEVEL_STATS = { hp: 5, patk: 1, eatk: 1, pdef: 1, edef: 1 } as const;

export const RELIC_SLOTS = 4; // as in Dawn's Journey
export const STARTING_WEAPON = 'traveller-sword'; // only for saves upgraded to v5; new games start unarmed

/** Developer switches the engine reads. Set by the UI from Settings › Dev mode; never saved with the game. */
export const DEV_RULES = {
  freeEnergy: false, // walking and actions cost no energy
  damage: 'dj' as 'dj' | 'ratio', // damage formula under test: Dawn's Journey's, or attack² ÷ (attack + defence)
  chip: 2, // HP an enemy next to you takes each tick it doesn't attack: the cost of ignoring it
};
