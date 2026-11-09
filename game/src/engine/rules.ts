// The numbers. Tune here.

// Energy pays for making things: gathering, crafting, cooking. Walking, talking and fighting are free (design/ENERGY.md).
export const MAX_ENERGY = 60;
/** The quick slots on the left bar (keys 1–6), and what a new game puts in them. */
export const HOTBAR_SLOTS = 6;
export const HOTBAR_START = ['skill:dash', 'skill:whirl', 'item:seed-bread', 'item:minor-health-potion', null, null];
/** A campfire: warming up fills HP, free, any time. Stoking it costs this much wood for FIRE_ENERGY ⚡, once per
 *  FIRE_MS per fire, so a fire is an anchor to grind around without becoming endless energy. */
export const FIRE_ENERGY = 15;
export const FIRE_WOOD = 1;
export const FIRE_MS = 900_000;
export const ENERGY_NOTCH = 6; // the energy bar marks every this much
export const REGEN_MS = 20_000; // one energy every 20 s: empty to full in 20 minutes, ~180 an hour
export const CRAFT_ENERGY = 1; // each thing crafted or cooked
export const FIGHT_ENERGY = 3; // each enemy you pick a fight with (hit before it came for you); ones that come at you are free
export const COST = { gather: 3, search: 2 } as const;
export const SEARCH_RADIUS = 2;
export const LOG_LENGTH = 12;

/** The heroine at the start (Dawn's Journey's base stats). */
export const PLAYER_STATS = { hp: 100, patk: 10, eatk: 10, pdef: 10, edef: 10, spd: 20, eva: 20, prc: 10, crit: 0.1, critDmg: 1.25 } as const;
/** Missing enemy stats default to these. A missing elemental attack or defence copies the physical one. */
export const FOE_DEFAULTS = { patk: 5, pdef: 5, spd: 20, eva: 0, prc: 0, crit: 0, critDmg: 1.25 } as const;
export const HP_REGEN_MS = 9_000; // one HP every 9 s outside a fight: empty to full in 15 minutes
export const CYCLE_MS = 900_000; // enemies roll fresh every 15 minutes (a full energy bar)
export const START_CLEAR = 4; // enemies roll at least this many hexes from a point's start marker
export const FREE_REROLLS = 1; // per point per cycle (2 until 2026-11-09: enemies were too plentiful)
export const KO_HP = 0.5; // knocked out, you wake with this share of your HP
export const BASIC_ATTACK = { shape: 'arc', width: 1 } as const;
/** Basic attack reach (hexes) by weapon kind; a weapon's own `range` wins. Anything else is melee: 1. */
export const WEAPON_RANGE: Record<string, number> = { bow: 3, staff: 2 };
/** A ranged basic attack hits for this share of a melee one: you can shoot without being hit, so it pays for that. */
export const RANGED_POWER = 0.8; // 0.65 at first: a level-3 boar keeps pace with you, so the bow lost every trade
/** Infusion (Heidi's gift): each basic attack that lands adds an elemental hit of this power. */
export const INFUSION_POWER = 0.3;
// full elemental armour sets (sets.json `passive`; design/ELEMENTS.md)
export const FIRE_SET_BONUS = 0.15; // elemental damage
export const WATER_SET_HEAL = 0.03; // of max HP, each elemental hit that lands
export const EARTH_SET_SHARE = 0.1; // of physical defence, added to elemental attack
export const MAX_SPIRIT = 100;
export const SPIRIT_PER_BASIC = 15; // Spirit each basic attack builds, hit or miss

// ---------- levels (engine/progress.ts) ----------
/** Life skills: total XP to reach each level, from level 1. Its length is the level cap (10 for now). */
export const SKILL_XP = [0, 60, 160, 320, 560, 920, 1460, 2260, 3460, 5260];
/** A node by its size (its ⚡ cost): XP per gather, the last level it gives full XP at, the level it needs.
 *  Past `full` it gives NODE_FALLOFF less per level, never below NODE_FLOOR: you outgrow small trees. */
export const NODE_XP: Record<number, { xp: number; full: number; need: number }> = {
  1: { xp: 4, full: 3, need: 1 }, // small tree, palm, pine, driftwood, small stones, berries, mushrooms
  2: { xp: 10, full: 5, need: 1 }, // birch, boulder
  3: { xp: 20, full: 7, need: 5 }, // oak, boulder cluster
  4: { xp: 40, full: 12, need: 10 }, // etherwood, ore
};
export const NODE_FALLOFF = 0.75;
export const NODE_FLOOR = 0.1;
export const YIELD_PER_LEVEL = 0.1; // each skill level above 1 adds this share to a ranged yield (fixed yields stay)
/** The XP curve (design/ROADMAP.md §4.1). Two knobs make it: what one kill is worth at each enemy level, and
 *  how many kills a level takes. Levels 1–8 are lenient; it slows from 8, before the Drill. Kill XP grows with
 *  enemy level, so within a stretch a level never gets harder or easier. Quests pay most of it (their XP was
 *  scaled with this curve on 2026-11-09). Retuned 2026-11-09 after a playtest reached level 6 in 8 minutes. */
export const LEVEL_CAP = 25;
export const KILL_XP_BASE = 25; // a level 1 enemy
export const KILL_XP_GROWTH = 1.12; // each enemy level is worth this much more
export const KILLS_EARLY = [2, 8, 10, 12, 14, 14, 14]; // levels 1→2 (the opening ambush) to 7→8
export const KILLS_PER_LEVEL = 18; // from level 8 on
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
