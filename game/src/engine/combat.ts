// Fighting on the hex field, on ticks. Every action the player takes is one tick; after it, each enemy banks
// its speed and acts once for every full "player speed" banked (speed 10 against 20 acts every other tick).
// An enemy's next action is decided one tick ahead and shown (its intent), so the player can react: an
// attack lands only on the hexes it showed, so stepping out of them makes it miss.
// The UI never calls this directly: player actions in actions.ts call tick().

import type { Cell, Content, DamageKind, Foe, FoeData, Fx, GameState, Intent, Stats } from './types';
import { hexDistance, route, shapeCells, type Grid } from './hex';
import { CYCLE_MS, DEV_RULES, FOE_DEFAULTS, FREE_REROLLS } from './rules';
import { hash, mulberry32 } from './rng';
import { say } from './log';
import { track } from './telemetry';
import { addCombatXp, playerStats } from './progress';
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

export function foeStats(c: Content, kind: string): Stats {
  const st = { ...FOE_DEFAULTS, ...(foeData(c, kind)?.stats ?? { hp: 1 }) };
  return { ...st, eatk: st.eatk ?? st.patk, edef: st.edef ?? st.pdef };
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
  s.foes[pointId] = [];
  if (!spec?.table.length) return;
  const rng = mulberry32(hash(pointId) + cycle * 7919 + rerolls * 104729);
  const exit = g.cells.find((x) => x.p === '>');
  const me = s.point === pointId && s.pos ? g.byKey.get(s.pos) : undefined;
  const taken = new Set<string>();
  const free = (x: Cell) =>
    c.terrain[x.t]?.cost != null &&
    !taken.has(x.key) &&
    (!exit || hexDistance(x, exit) > 1) &&
    (!me || hexDistance(x, me) > 1);
  const pick = (list: Cell[]) => list[Math.floor(rng() * list.length)];
  const [lo, hi] = spec.count;
  const n = lo + Math.floor(rng() * (hi - lo + 1));
  for (let i = 0; i < n; i++) {
    const kind = spec.table[Math.floor(rng() * spec.table.length)];
    const d = foeData(c, kind);
    if (!d) continue;
    const onNode = g.cells.filter((x) => free(x) && x.p && c.props[x.p]?.type === 'node');
    const empty = g.cells.filter((x) => free(x) && !x.p);
    const at = d.behaviour === 'still' && onNode.length && rng() < 0.7 ? pick(onNode) : pick(empty.length ? empty : onNode);
    if (!at) break;
    taken.add(at.key);
    s.foes[pointId].push({ id: `${cycle}.${rerolls}.${i}`, kind, pos: at.key, home: at.key, hp: foeStats(c, kind).hp, charge: 0, engaged: false, intent: null });
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
  const r = route(
    g,
    at,
    goal,
    (x) => walkable(c, x) && (x === goal || (!foeAt(s, x.key) && x.key !== s.pos)),
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
    if (d.behaviour !== 'territorial') return null;
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
    const h = rollHit(foeStats(c, f.kind), playerStats(s, c));
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

/** Combat XP for beating an enemy: its own number, or half its HP plus its attack and defence. */
export function foeXp(c: Content, kind: string): number {
  const d = foeData(c, kind);
  if (d?.xp != null) return d.xp;
  const st = foeStats(c, kind);
  return Math.round(st.hp / 2 + st.patk + st.pdef);
}

/** The player hits an enemy, at `power` × damage. Beaten, it's gone until the next cycle and drops its item. */
export function playerHits(s: GameState, c: Content, f: Foe, power = 1, kind: DamageKind = 'physical'): void {
  const pr = c.props[f.kind];
  f.engaged = true; // even a still enemy fights back once hit
  const h = rollHit(playerStats(s, c), foeStats(c, f.kind), kind);
  track('hit', { kind, by: 'you', to: f.kind, dmg: h.dodged ? 0 : h.dmg * power, crit: h.crit, miss: h.dodged, power, foeHp: f.hp });
  if (h.dodged) return fx(s, f.pos, 'miss', 'miss');
  h.dmg *= power;
  f.hp -= h.dmg;
  fx(s, f.pos, fmt(h.dmg), h.crit ? 'crit' : 'hit');
  if (f.hp > 0) return;
  s.foes[s.point!] = foesHere(s).filter((x) => x !== f); // gone until the next cycle
  if (pr?.item) s.bag[pr.item] = (s.bag[pr.item] ?? 0) + 1;
  if (pr?.item) track('gain', { item: pr.item, n: 1, why: `drop:${f.kind}`, point: s.point });
  track('kill', { foe: f.kind, point: s.point, hp: s.hp });
  say(s, `You beat the ${pr?.name ?? f.kind}.`);
  const xp = foeXp(c, f.kind);
  fx(s, s.pos!, `+${xp} xp`, 'xp');
  addCombatXp(s, xp);
}

/** Everything that happens after one player action. Returns true if it knocked you out. */
export function tick(s: GameState, c: Content, g: Grid): boolean {
  const pspd = playerStats(s, c).spd;
  for (const f of [...foesHere(s)]) {
    const spd = foeStats(c, f.kind).spd;
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
    } else if (f.engaged && dist > n + 2) {
      f.engaged = false;
      say(s, `The ${name} gives up.`);
    }
  }

  // show what each enemy will do on its next action, if it acts next tick
  for (const f of foesHere(s)) {
    const spd = foeStats(c, f.kind).spd;
    const idle = !f.engaged && f.pos === f.home;
    f.intent = !idle && f.charge + spd >= pspd ? decide(s, c, g, f) : null;
  }
  return false;
}

/** After a knockout: the point's enemies go home, healed, and stop chasing. */
export function resetFoes(s: GameState, c: Content, pointId: string): void {
  for (const f of s.foes[pointId] ?? []) {
    f.pos = f.home;
    f.hp = foeStats(c, f.kind).hp;
    f.engaged = false;
    f.intent = null;
    f.charge = 0;
  }
}
