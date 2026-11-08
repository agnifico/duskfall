// Levels: your combat level (XP from beating enemies; it raises your stats, and will gate gear and places)
// and life skill levels (XP from gathering; a level raises what ranged nodes give). The tables are in rules.ts.

import type { Content, GameState, Stats } from './types';
import { COMBAT_XP, LEVEL_STATS, PLAYER_STATS, SKILL_XP, YIELD_PER_LEVEL } from './rules';
import { say } from './log';
import { track } from './telemetry';
import { gearStats } from './gear';

export interface Progress {
  level: number;
  max: boolean; // at the level cap
  into: number; // XP since this level began
  need: number; // XP this level takes in all (0 at the cap)
}

/** Where a total of XP stands on a table. */
export function progressOn(table: number[], xp: number): Progress {
  let level = 1;
  while (level < table.length && xp >= table[level]) level++;
  const max = level >= table.length;
  return { level, max, into: xp - table[level - 1], need: max ? 0 : table[level] - table[level - 1] };
}

export const combatProgress = (s: GameState) => progressOn(COMBAT_XP, s.xp ?? 0);
export const combatLevel = (s: GameState) => combatProgress(s).level;
export const skillProgress = (s: GameState, id: string) => progressOn(SKILL_XP, s.skills?.[id] ?? 0);
export const skillLevel = (s: GameState, id: string) => skillProgress(s, id).level;

/** Your stats: the base ones, plus what your level adds, plus your gear. */
export function playerStats(s: GameState, c: Content): Stats {
  const up = combatLevel(s) - 1;
  const out: Stats = { ...PLAYER_STATS };
  for (const [k, v] of Object.entries(LEVEL_STATS) as [keyof typeof LEVEL_STATS, number][]) out[k] += up * v;
  for (const [k, v] of Object.entries(gearStats(s, c)) as [keyof Stats, number][]) out[k] += v;
  return out;
}
export const maxHp = (s: GameState, c: Content) => playerStats(s, c).hp;

/** Add life skill XP; says so when it levels up. Returns the XP actually added (none past the cap). */
export function addSkillXp(s: GameState, c: Content, id: string, n: number): number {
  s.skills ??= {};
  const before = skillProgress(s, id);
  if (before.max || n <= 0) return 0;
  const was = s.skills[id] ?? 0;
  s.skills[id] = Math.min(SKILL_XP[SKILL_XP.length - 1], was + n);
  const after = skillProgress(s, id);
  track('xp', { skill: id, n: s.skills[id] - was, total: s.skills[id], level: after.level });
  if (after.level > before.level) track('level', { skill: id, level: after.level });
  if (after.level > before.level) say(s, `${c.lifeskills[id]?.name ?? id} is now level ${after.level}.${after.max ? ' That’s the most it goes for now.' : ''}`);
  return s.skills[id] - was;
}

/** Add combat XP; levelling up heals the HP it adds. */
export function addCombatXp(s: GameState, n: number): void {
  const before = combatLevel(s);
  s.xp = (s.xp ?? 0) + n;
  const after = combatLevel(s);
  track('xp', { skill: 'combat', n, total: s.xp, level: after });
  if (after > before) track('level', { skill: 'combat', level: after });
  if (after > before) {
    s.hp += (after - before) * LEVEL_STATS.hp;
    say(s, `You reach level ${after}. Health, attack and defence go up.`);
  }
}

/** A ranged yield, raised by the skill's level (fractions round up by chance). Fixed yields don't change. */
export function levelledYield(n: number, ranged: boolean, level: number, rnd = Math.random): number {
  if (!ranged || level <= 1) return n;
  const x = n * (1 + YIELD_PER_LEVEL * (level - 1));
  return Math.floor(x) + (rnd() < x - Math.floor(x) ? 1 : 0);
}
