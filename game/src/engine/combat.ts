// Fighting on the hex field, on ticks. Every action the player takes is one tick; after it, each enemy banks
// its speed and acts once for every full "player speed" banked (speed 10 against 20 acts every other tick).
// An enemy's next action is decided one tick ahead and shown (its intent), so the player can react: an
// attack lands only on the hexes it showed, so stepping out of them makes it miss.
// The UI never calls this directly: player actions in actions.ts call tick().

import type { Cell, Content, DamageKind, Drop, Foe, FoeData, Fx, GameState, Intent, Stats } from './types';
import { grid, hexDistance, route, shapeCells, type Grid } from './hex';
import { START_CLEAR, CYCLE_MS, DEV_RULES, FOE_DEF, FOE_DEFAULTS, FOE_HITS, FOE_HIT_SHARE, FREE_REROLLS, LEVEL_STATS, PLAYER_STATS, REF_GEAR, killXp } from './rules';
import { hash, mulberry32 } from './rng';
import { say } from './log';
import { track } from './telemetry';
import { addCombatXp, combatLevel, playerStats } from './progress';
import { onKill, peopleOn } from './story';
export { playerStats };

// ---------- the maths (design/COMBAT.md, section 3) ----------

/** Dodge chance = e ÷ (e + 100), e = (defender's evasion + ¼ speed) − (attacker's precision + ¼ speed), never below 0. */
export function dodgeChance(att: Stats, def: Stats): number {
  const e = Math.max(0, def.eva + def.spd / 4 - (att.prc + att.spd / 4));
  return e / (e + 100);
}

/** Damage before crits and dodges, by the formula under test (Settings › Dev mode). */
export function baseDamage(atk: number, def: number, formula = DEV_RULES.damage): number {
  return formula === 'ratio' ? (atk * atk) / (atk + def) : atk * (1 - def / (def + 200));
}

export interface Hit {
  dodged: boolean;
  crit: boolean;
  dmg: number;
}

/** One blow through the one damage pipeline everything uses. Physical attack meets physical defence,
 *  elemental meets elemental. */
export function rollHit(att: Stats, def: Stats, kind: DamageKind = 'physical'): Hit {
  if (Math.random() < dodgeChance(att, def)) return { dodged: true, crit: false, dmg: 0 };
  const crit = Math.random() < att.crit;
  const [a, d] = kind === 'elemental' ? [att.eatk, def.edef] : [att.patk, def.pdef];
  const dmg = baseDamage(a, d) * (crit ? att.critDmg : 1);
  return { dodged: false, crit, dmg };
}

export const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

// ---------- enemies ----------


export function foeData(c: Content, kind: string): FoeData | undefined {
  return c.props[kind]?.foe;
}

/** A standard enemy of this level, from the reference player (rules.ts › FOE_HITS, REF_GEAR). */
export function curveStats(level: number): Stats {
  const l = Math.max(1, level);
  const cut = (def: number) => 1 - def / (def + 200); // Dawn's Journey's defence: what gets through
  const def = FOE_DEF(l);
  const critAvg = 1 + PLAYER_STATS.crit * (PLAYER_STATS.critDmg - 1);
  const yourAtk = PLAYER_STATS.patk + LEVEL_STATS.patk * (l - 1) + REF_GEAR.patk(l);
  const yourHp = PLAYER_STATS.hp + LEVEL_STATS.hp * (l - 1) + REF_GEAR.hp(l);
  const yourDef = PLAYER_STATS.pdef + LEVEL_STATS.pdef * (l - 1) + REF_GEAR.pdef(l);
  const hp = FOE_HITS * yourAtk * cut(def) * critAvg;
  const atk = (FOE_HIT_SHARE * yourHp) / cut(yourDef);
  return { ...FOE_DEFAULTS, hp, patk: atk, eatk: atk, pdef: def, edef: def };
}

/** An enemy's stats: its level's curve scaled by its type's `mult`, then its own `stats` on top. Enemies with
 *  no level use their `stats` alone. */
export function foeStats(c: Content, kind: string, level?: number): Stats {
  const d = foeData(c, kind);
  if (d?.level == null) {
    const st = { ...FOE_DEFAULTS, hp: 1, ...(d?.stats ?? {}) };
    return { ...st, eatk: st.eatk ?? st.patk, edef: st.edef ?? st.pdef };
  }
  const st = curveStats(level ?? d.level);
  for (const [k, m] of Object.entries(d.mult ?? {}) as [keyof Stats, number][]) st[k] *= m;
  for (const k of ['hp', 'patk', 'eatk', 'pdef', 'edef'] as const) st[k] = Math.round(st[k]);
  return { ...st, ...(d.stats ?? {}) };
}

/** One enemy on the field's stats, at the level it rolled. */
export const statsOf = (c: Content, f: Foe) => foeStats(c, f.kind, f.level);

/** The level an enemy of this kind rolls at on a point: inside the point's range, near yours (engine/types.ts › Point.levels). */
export function foeLevelAt(s: GameState, c: Content, pointId: string, kind: string): number | undefined {
  const d = foeData(c, kind);
  const band = c.points[pointId]?.levels;
  if (d?.level == null || !band) return d?.level;
  const [lo, hi] = band;
  const lead = Math.max(0, d.level - lo); // how much harder than the area's easiest it is
  return Math.max(d.level, Math.min(hi, combatLevel(s) + lead));
}

/** What a beaten enemy leaves: each line of its drop table rolled on its own. */
export function rollDrops(c: Content, kind: string, rnd = Math.random): Record<string, number> {
  const d = foeData(c, kind);
  const table: Drop[] = d?.drops ?? (c.props[kind]?.item ? [{ item: c.props[kind].item!, chance: 1 }] : []);
  const out: Record<string, number> = {};
  for (const line of table) {
    if (rnd() >= line.chance) continue;
    const id = line.oneOf ? line.oneOf[Math.floor(rnd() * line.oneOf.length)] : line.item;
    if (!id) continue;
    const n = Array.isArray(line.n) ? line.n[0] + Math.floor(rnd() * (line.n[1] - line.n[0] + 1)) : (line.n ?? 1);
    out[id] = (out[id] ?? 0) + n;
  }
  return out;
}

/** The enemies on the point you're in. */
export function foesHere(s: GameState): Foe[] {
  return (s.point && s.foes[s.point]) || [];
}

export function foeAt(s: GameState, key: string): Foe | undefined {
  return foesHere(s).find((f) => f.pos === key);
}

/** Whether any enemy is after you. */
export function inFight(s: GameState): boolean {
  return foesHere(s).some((f) => f.engaged);
}

/** Which 15-minute cycle a moment falls in. Every point rolls fresh enemies when it changes. */
export const cycleOf = (now: number) => Math.floor(now / CYCLE_MS);
export const msToNextCycle = (now: number) => CYCLE_MS - (now % CYCLE_MS);

/** Roll a point's enemies onto its field: how many and which from its `enemies` table, on free hexes (not the
 *  way out, nor next to it or to you). Still enemies prefer to sit on a node, so they guard what you want. The
 *  same cycle and reroll always give the same result. */
export function rollFoes(s: GameState, c: Content, g: Grid, pointId: string, cycle: number, rerolls: number): void {
  const spec = c.points[pointId]?.enemies;
  s.foeRolls[pointId] = { cycle, rerolls };
  s.foes[pointId] = (s.foes[pointId] ?? []).filter((f) => f.id.startsWith('story.')); // story spawns stay until beaten
  if (!spec?.table?.length && !spec?.place?.length) return;
  const rng = mulberry32(hash(pointId) + cycle * 7919 + rerolls * 104729);
  // where you arrive stays clear for a few hexes (a new player isn't jumped on arrival); the way out, for one
  const start = g.cells.filter((x) => x.p === 'start');
  const exits = g.cells.filter((x) => x.p === '>');
  const me = s.point === pointId && s.pos ? g.byKey.get(s.pos) : undefined;
  const taken = new Set<string>(s.foes[pointId].map((f) => f.pos));
  const free = (x: Cell) =>
    c.terrain[x.t]?.cost != null &&
    !taken.has(x.key) &&
    start.every((d) => hexDistance(x, d) > START_CLEAR) &&
    exits.every((d) => hexDistance(x, d) > 1) &&
    (!me || hexDistance(x, me) > 1);
  const pick = (list: Cell[]) => list[Math.floor(rng() * list.length)];
  const kinds: { kind: string; on?: string[] }[] = [...(spec.place ?? [])];
  if (spec.table?.length) {
    const [lo, hi] = spec.count ?? [1, 1];
    const n = lo + Math.floor(rng() * (hi - lo + 1));
    for (let i = 0; i < n; i++) kinds.push({ kind: spec.table[Math.floor(rng() * spec.table.length)] });
  }
  kinds.forEach(({ kind, on }, i) => {
    const d = foeData(c, kind);
    if (!d) return;
    const ok = (x: Cell) => free(x) && (!on || on.includes(x.t));
    const onNode = g.cells.filter((x) => ok(x) && x.p && c.props[x.p]?.type === 'node');
    const empty = g.cells.filter((x) => ok(x) && !x.p);
    const at = d.behaviour === 'still' && onNode.length && rng() < 0.7 ? pick(onNode) : pick(empty.length ? empty : onNode);
    if (!at) return;
    taken.add(at.key);
    const level = foeLevelAt(s, c, pointId, kind);
    s.foes[pointId].push({ id: `${cycle}.${rerolls}.${i}`, kind, level, pos: at.key, home: at.key, hp: foeStats(c, kind, level).hp, charge: 0, engaged: false, intent: null });
  });
}

/** A story spawn: enemies appear 2–3 hexes from you, already after you (the opening ambush). */
export function spawnAround(s: GameState, c: Content, list: { kind: string; n: number }[]): void {
  if (!s.point || !s.pos) return;
  const g = grid(c, s.point, s.day);
  const me = g.byKey.get(s.pos);
  if (!me) return;
  s.foes[s.point] ??= [];
  const taken = new Set([...s.foes[s.point].map((f) => f.pos), ...peopleOn(s, c, s.point).keys()]);
  const ring = (d: number) => g.cells.filter((x) => c.terrain[x.t]?.cost != null && !x.p && !taken.has(x.key) && hexDistance(x, me) === d);
  let i = 0;
  for (const { kind, n } of list)
    for (let k = 0; k < n; k++) {
      const spots = ring(2).length ? ring(2) : ring(3);
      const at = spots[Math.floor(Math.random() * spots.length)];
      if (!at) return;
      taken.add(at.key);
      s.foes[s.point].push({ id: `story.${Date.now()}.${i++}`, kind, pos: at.key, home: at.key, hp: foeStats(c, kind).hp, charge: 0, engaged: true, intent: null });
    }
}

/** A point's enemies for the current cycle: rolled the first time you're there in it, kept until it ends.
 *  Not rolled mid-fight: a fight runs over into the next cycle. */
export function ensureFoesAt(s: GameState, c: Content, g: Grid, pointId: string, now: number): void {
  const cycle = cycleOf(now);
  if (s.foeRolls?.[pointId]?.cycle === cycle && s.foes[pointId]) return;
  if (s.point === pointId && inFight(s)) return;
  s.foeRolls ??= {};
  rollFoes(s, c, g, pointId, cycle, 0);
}

/** Rerolls left at a point this cycle. */
export function rerollsLeft(s: GameState, pointId: string, now: number): number {
  const r = s.foeRolls?.[pointId];
  return r && r.cycle === cycleOf(now) ? Math.max(0, FREE_REROLLS - r.rerolls) : FREE_REROLLS;
}

/** Why a reroll can't happen, or null. */
export function rerollBlocked(s: GameState, c: Content, pointId: string, now: number): string | null {
  if (!c.points[pointId]?.enemies) return 'No enemies here';
  if (inFight(s)) return 'Not in a fight';
  if (rerollsLeft(s, pointId, now) <= 0) return 'No rerolls left';
  return null;
}

/** Roll the point's enemies again (2 free per point per cycle). */
export function rerollFoes(s: GameState, c: Content, g: Grid, pointId: string, now: number): void {
  if (rerollBlocked(s, c, pointId, now)) return;
  const used = s.foeRolls[pointId]?.cycle === cycleOf(now) ? s.foeRolls[pointId].rerolls : 0;
  rollFoes(s, c, g, pointId, cycleOf(now), used + 1);
  say(s, 'The field shifts: new enemies.');
}

/** The hexes a territorial enemy that isn't after you yet would notice you on. */
export function noticeHexes(c: Content, g: Grid, f: Foe): Cell[] {
  const d = foeData(c, f.kind);
  const at = g.byKey.get(f.pos);
  if (!d || !at || d.behaviour !== 'territorial' || f.engaged) return [];
  const n = d.notice ?? 1;
  return g.cells.filter((x) => hexDistance(at, x) <= n && x !== at);
}

export function fx(s: GameState, key: string, text: string, kind: Fx['kind'], phase: 0 | 1 = 0, from?: string): void {
  s.fx.push({ id: ++s.fxSeq, key, text, kind, phase, from });
}

const walkable = (c: Content, x: Cell) => c.terrain[x.t]?.cost != null;

/** The next hex on an enemy's way to a cell, around other enemies and you. */
function stepToward(s: GameState, c: Content, g: Grid, f: Foe, goal: Cell): Cell | null {
  const at = g.byKey.get(f.pos);
  if (!at || at === goal) return null;
  const people = peopleOn(s, c, s.point);
  const r = route(
    g,
    at,
    goal,
    (x) => walkable(c, x) && !people.has(x.key) && (x === goal || (!foeAt(s, x.key) && x.key !== s.pos)),
    (x) => c.terrain[x.t].cost ?? 1,
  );
  const next = r?.path[0];
  if (!next || next.key === s.pos || foeAt(s, next.key)) return null;
  return next;
}

/** What an enemy would do right now. */
function decide(s: GameState, c: Content, g: Grid, f: Foe): Intent | null {
  const d = foeData(c, f.kind);
  const at = g.byKey.get(f.pos);
  const me = s.pos ? g.byKey.get(s.pos) : undefined;
  if (!d || !at || !me) return null;
  if (f.engaged) {
    const hexes = shapeCells(g, at, me, d.attack);
    if (hexes.includes(me)) return { kind: 'attack', hexes: hexes.map((x) => x.key) };
    if (d.behaviour !== 'territorial' && !f.riled) return null;
    const next = stepToward(s, c, g, f, me);
    return next ? { kind: 'move', to: next.key } : null;
  }
  if (d.behaviour === 'territorial' && f.pos !== f.home) {
    const home = g.byKey.get(f.home);
    const next = home && stepToward(s, c, g, f, home);
    return next ? { kind: 'move', to: next.key } : null;
  }
  return null;
}

/** An enemy acts: an attack lands only on the hexes it showed; a move re-picks its step, since you may have moved.
 *  Returns whether it attacked. */
function foeAct(s: GameState, c: Content, g: Grid, f: Foe, shown: Intent | null): boolean {
  const it = shown ?? decide(s, c, g, f);
  if (!it) return false;
  if (it.kind === 'attack') {
    fx(s, it.hexes[0], '', 'lunge', 1, f.pos);
    for (const k of it.hexes) fx(s, k, '', 'flash', 1);
    if (!s.pos || !it.hexes.includes(s.pos)) {
      fx(s, it.hexes[0], 'miss', 'miss', 1); // you stepped out of it
      return true;
    }
    const h = rollHit(statsOf(c, f), playerStats(s, c));
    track('hit', { by: f.kind, to: 'you', dmg: h.dodged ? 0 : h.dmg, crit: h.crit, miss: h.dodged, hp: s.hp });
    if (h.dodged) fx(s, s.pos, 'dodge', 'miss', 1);
    else {
      s.hp = Math.max(0, s.hp - h.dmg);
      fx(s, s.pos, `-${fmt(h.dmg)}${h.crit ? '!' : ''}`, 'hurt', 1);
    }
    return true;
  }
  const again = decide(s, c, g, f);
  if (again?.kind === 'move') f.pos = again.to;
  return false;
}

/** Combat XP for beating an enemy: its own number, its level's on the curve (its type's mult doesn't change
 *  it: a level is a level), or half its HP plus its attack and defence. */
export function foeXp(c: Content, kind: string, level?: number): number {
  const d = foeData(c, kind);
  if (d?.xp != null) return d.xp;
  if (d?.level != null) return killXp(level ?? d.level);
  const st = foeStats(c, kind);
  return Math.round(st.hp / 2 + st.patk + st.pdef);
}

/** The player hits an enemy, at `power` × damage. Beaten, it's gone until the next cycle and drops its item.
 *  Returns whether it landed (not dodged). */
export function playerHits(s: GameState, c: Content, f: Foe, power = 1, kind: DamageKind = 'physical'): boolean {
  const pr = c.props[f.kind];
  f.engaged = true;
  f.riled = true; // hit, anything comes after you: even a still enemy, and it won't give up
  const h = rollHit(playerStats(s, c), statsOf(c, f), kind);
  track('hit', { kind, by: 'you', to: f.kind, dmg: h.dodged ? 0 : h.dmg * power, crit: h.crit, miss: h.dodged, power, foeHp: f.hp });
  if (h.dodged) {
    fx(s, f.pos, 'miss', 'miss');
    return false;
  }
  h.dmg *= power;
  f.hp -= h.dmg;
  fx(s, f.pos, fmt(h.dmg), h.crit ? 'crit' : 'hit');
  if (f.hp > 0) return true;
  s.foes[s.point!] = foesHere(s).filter((x) => x !== f); // gone until the next cycle
  for (const [item, n] of Object.entries(rollDrops(c, f.kind))) {
    s.bag[item] = (s.bag[item] ?? 0) + n;
    track('gain', { item, n, why: `drop:${f.kind}`, point: s.point });
  }
  track('kill', { foe: f.kind, point: s.point, hp: s.hp });
  onKill(s, c, f.kind, s.point);
  say(s, `You beat the ${pr?.name ?? f.kind}.`);
  const xp = foeXp(c, f.kind, f.level);
  fx(s, s.pos!, `+${xp} xp`, 'xp');
  addCombatXp(s, xp);
  return true;
}

/** Everything that happens after one player action. Returns true if it knocked you out. */
export function tick(s: GameState, c: Content, g: Grid): boolean {
  const pspd = playerStats(s, c).spd;
  for (const f of [...foesHere(s)]) {
    const spd = statsOf(c, f).spd;
    if (!f.engaged && !f.intent && f.pos === f.home) {
      f.charge = 0; // idle enemies don't bank actions
      continue;
    }
    f.charge += spd;
    let shown = f.intent;
    let attacked = false;
    while (f.charge >= pspd && s.hp > 0) {
      f.charge -= pspd;
      attacked = foeAct(s, c, g, f, shown) || attacked;
      shown = null; // a second action in the same tick (faster than you) isn't shown ahead
    }
    f.intent = null;
    // chip damage: an enemy next to you that isn't attacking still wears you down
    const at = g.byKey.get(f.pos);
    const me = s.pos ? g.byKey.get(s.pos) : undefined;
    if (f.engaged && !attacked && at && me && hexDistance(at, me) === 1 && DEV_RULES.chip > 0 && s.hp > 0) {
      s.hp = Math.max(0, s.hp - DEV_RULES.chip);
      track('hit', { by: f.kind, to: 'you', dmg: DEV_RULES.chip, chip: true, hp: s.hp });
      fx(s, s.pos!, `-${DEV_RULES.chip}`, 'hurt', 1);
    }
  }
  if (s.hp <= 0) return true;

  const me = s.pos ? g.byKey.get(s.pos) : undefined;
  for (const f of foesHere(s)) {
    const d = foeData(c, f.kind);
    const at = g.byKey.get(f.pos);
    if (!d || !at || !me || d.behaviour !== 'territorial') continue;
    const dist = hexDistance(at, me);
    const n = d.notice ?? 1;
    const name = c.props[f.kind]?.name ?? f.kind;
    if (!f.engaged && dist <= n) {
      f.engaged = true;
      say(s, `The ${name} comes at you.`);
    } else if (f.engaged && !f.riled && dist > n + 2) {
      f.engaged = false;
      say(s, `The ${name} gives up.`);
    }
  }

  // show what each enemy will do on its next action, if it acts next tick
  for (const f of foesHere(s)) {
    const spd = statsOf(c, f).spd;
    const idle = !f.engaged && f.pos === f.home;
    f.intent = !idle && f.charge + spd >= pspd ? decide(s, c, g, f) : null;
  }
  return false;
}

/** After a knockout: the point's enemies go home, healed, and stop chasing. */
export function resetFoes(s: GameState, c: Content, pointId: string): void {
  for (const f of s.foes[pointId] ?? []) {
    f.pos = f.home;
    f.hp = statsOf(c, f).hp;
    f.engaged = false;
    f.riled = false;
    f.intent = null;
    f.charge = 0;
  }
}
