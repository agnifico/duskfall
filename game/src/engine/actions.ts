// Everything the player can do. Each function changes the state it is given, and nothing else.

import type { Action, Cell, Content, GameState, Prop } from './types';
import { BASIC_ATTACK, COST, DEV_RULES, SPIRIT_PER_BASIC, HP_REGEN_MS, KO_HP, MAX_ENERGY, MAX_SPIRIT, REGEN_MS, XP_PER_ENERGY, SEARCH_RADIUS } from './rules';
import { dirTo, grid, hexDistance, route, shapeCells, stepDir, type Grid } from './hex';
import { say } from './log';
import { track } from './telemetry';
import { addSkillXp, levelledYield, maxHp, skillLevel } from './progress';
import { talkTo } from './story';
import { ensureFoesAt, foeAt, foesHere, fx, inFight, playerHits, rerollFoes, resetFoes, tick } from './combat';

export { say };

export const itemName = (c: Content, id: string) => c.items[id]?.name ?? id;

/** How many a node gives per gather, as [min, max]. */
export function nodeYield(pr: Prop): [number, number] {
  const y = pr.yield ?? 1;
  return typeof y === 'number' ? [y, y] : y;
}

export const nodeCost = (pr: Prop) => pr.cost ?? COST.gather;
/** Skill XP for one gather. */
export const nodeXp = (pr: Prop) => pr.xp ?? XP_PER_ENERGY * nodeCost(pr);

// ---------- energy ----------

export function regen(s: GameState, now: number): void {
  if (s.energy >= MAX_ENERGY) {
    s.lastRegen = now;
    return;
  }
  const ticks = Math.floor((now - s.lastRegen) / REGEN_MS);
  if (ticks <= 0) return;
  const was = s.energy;
  s.energy = Math.min(MAX_ENERGY, s.energy + ticks);
  track('regen', { n: s.energy - was, energy: s.energy });
  s.lastRegen = s.energy >= MAX_ENERGY ? now : s.lastRegen + ticks * REGEN_MS;
}

export function msToNextEnergy(s: GameState, now: number): number {
  return s.energy >= MAX_ENERGY ? 0 : Math.max(0, REGEN_MS - (now - s.lastRegen));
}

export function msToFullEnergy(s: GameState, now: number): number {
  return s.energy >= MAX_ENERGY ? 0 : msToNextEnergy(s, now) + (MAX_ENERGY - s.energy - 1) * REGEN_MS;
}

function spend(s: GameState, n: number, now: number, why: string): boolean {
  if (n > 0) track('spend', { why, n, free: DEV_RULES.freeEnergy, point: s.point });
  if (n <= 0 || DEV_RULES.freeEnergy) return true;
  regen(s, now);
  if (s.energy < n) {
    say(s, `Not enough energy: that needs ${n}⚡ and you have ${s.energy}.`);
    return false;
  }
  if (s.energy >= MAX_ENERGY) s.lastRegen = now;
  s.energy -= n;
  return true;
}

// ---------- health ----------

/** HP comes back one point every HP_REGEN_MS, but not while an enemy is after you. */
export function regenHp(s: GameState, c: Content, now: number): void {
  if (s.hp >= maxHp(s, c) || inFight(s)) {
    s.hpAt = now;
    return;
  }
  const n = Math.floor((now - s.hpAt) / HP_REGEN_MS);
  if (n <= 0) return;
  s.hp = Math.min(maxHp(s, c), s.hp + n);
  s.hpAt += n * HP_REGEN_MS;
}

// ---------- where you are ----------

export function currentPoint(s: GameState): string | null {
  return s.point;
}

export function hereGrid(s: GameState, c: Content): Grid | null {
  const pid = currentPoint(s);
  return pid ? grid(c, pid, s.day) : null;
}

export function hereCell(s: GameState, c: Content): Cell | null {
  return (s.pos && hereGrid(s, c)?.byKey.get(s.pos)) || null;
}

export function isSeen(s: GameState, c: Content, pointId: string, x: Cell): boolean {
  return !c.points[pointId].fog || !!s.seen[pointId]?.[x.key];
}

function look(s: GameState, g: Grid, pointId: string, from: Cell, radius: number): void {
  const seen = (s.seen[pointId] ??= {});
  for (const x of g.cells) if (hexDistance(x, from) <= radius) seen[x.key] = true;
}

/** The prop on a cell as the player can see it right now: hidden or taken ones are gone. Enemies aren't
 *  props once on the field: they move, so they live in s.foes (engine/combat.ts). */
export function visibleProp(s: GameState, c: Content, x: Cell): Prop | null {
  if (!x.p) return null;
  const pr = c.props[x.p];
  if (!pr) return null;
  if (pr.hidden && !s.revealed[x.key]) return null;
  if (pr.type === 'enemy') return null;
  if (pr.type === 'secret' && s.taken[x.key]) return null;
  return pr;
}

/** The line a person said last, or null before you've talked to them. */
export function lastLine(s: GameState, c: Content, npcId: string): string | null {
  const n = s.talk[npcId] ?? 0;
  const lines = c.npcs[npcId]?.lines ?? [];
  return n > 0 && lines.length ? lines[(n - 1) % lines.length] : null;
}

// ---------- moving ----------
// Which map is open is the UI's business (lib/ui.svelte.ts). The game only knows which point you're in.

/** The land a point belongs to, through its zone. */
export function landOf(c: Content, pointId: string): string | undefined {
  const zone = c.points[pointId]?.zone;
  return Object.values(c.lands).find((l) => l.zones.some((z) => z.id === zone))?.id;
}

/** A land's opening animation plays the first time only. */
export function markVisited(s: GameState, landId: string): void {
  s.visitedLands[landId] = true;
}

export function enterPoint(s: GameState, c: Content, pointId: string, atKey?: string, now = Date.now()): void {
  const g = grid(c, pointId, s.day);
  const start = (atKey && g.byKey.get(atKey)) || g.cells.find((x) => x.p === '>') || g.cells[0];
  s.point = pointId;
  s.pos = start.key;
  track('enter', { point: pointId });
  const land = landOf(c, pointId);
  if (land) markVisited(s, land);
  look(s, g, pointId, start, 1);
  ensureFoesAt(s, c, g, pointId, now);
}

/** Make sure the point you're in has this cycle's enemies (on load, each second, a new day). */
export function ensureFoes(s: GameState, c: Content, now: number): void {
  const g = hereGrid(s, c);
  if (s.point && g) ensureFoesAt(s, c, g, s.point, now);
}

/** Reroll the enemies where you are. */
export function reroll(s: GameState, c: Content, now: number): void {
  const g = hereGrid(s, c);
  if (s.point && g) rerollFoes(s, c, g, s.point, now);
}

export function teleportTo(s: GameState, c: Content, npcId: string): void {
  const npc = c.npcs[npcId];
  const at = grid(c, npc.point, s.day).cells.find((x) => x.p && c.props[x.p]?.npc === npcId);
  enterPoint(s, c, npc.point, at?.key);
  say(s, `You make your way back to ${npc.name}.`);
}

// ---------- walking inside a point ----------

/** The route to a hex, around enemies. Targeting an enemy, the route ends next to it. */
export function planRoute(s: GameState, c: Content, targetKey: string) {
  const pid = currentPoint(s);
  const g = hereGrid(s, c);
  const from = hereCell(s, c);
  const to = g?.byKey.get(targetKey);
  if (!pid || !g || !from || !to) return null;
  const r = route(
    g,
    from,
    to,
    (x) => c.terrain[x.t]?.cost != null && isSeen(s, c, pid, x) && (x === to || !foeAt(s, x.key)),
    (x) => c.terrain[x.t].cost ?? Infinity,
  );
  if (r && foeAt(s, to.key)) {
    const last = r.path.pop()!;
    r.cost -= c.terrain[last.t].cost ?? 0;
  }
  return r;
}

/** One step onto a neighbouring hex: pays its ⚡, then the enemies act. Returns whether a walk should go on:
 *  it stops on a hidden find, when an enemy's attack is aimed at you, or when you can't step. */
export function step(s: GameState, c: Content, key: string, now: number): boolean {
  s.fx = [];
  const pid = currentPoint(s);
  const g = hereGrid(s, c);
  const from = hereCell(s, c);
  const to = g?.byKey.get(key);
  if (!pid || !g || !from || !to || hexDistance(from, to) !== 1) return false;
  const cost = c.terrain[to.t]?.cost;
  if (cost == null || foeAt(s, key)) return false;
  if (!spend(s, cost, now, 'walk')) return false;
  s.pos = key;
  look(s, g, pid, to, 1);
  let go = true;
  const pr = to.p ? c.props[to.p] : null;
  if (pr?.hidden && !s.revealed[to.key]) {
    s.revealed[to.key] = true;
    say(s, `You notice ${pr.name.toLowerCase()}.`);
    go = false;
  }
  if (afterAction(s, c, g)) return false;
  if (foesHere(s).some((f) => f.intent?.kind === 'attack' && f.intent.hexes.includes(key))) go = false;
  return go;
}

/** Whether your basic attack reaches an enemy from where you stand. */
export function canHit(s: GameState, c: Content, foeId: string): boolean {
  const g = hereGrid(s, c);
  const me = hereCell(s, c);
  const f = foesHere(s).find((x) => x.id === foeId);
  const at = f && g?.byKey.get(f.pos);
  return !!(g && me && at && shapeCells(g, me, at, BASIC_ATTACK).includes(at));
}

/** Your basic attack: free, one tick. */
export function attack(s: GameState, c: Content, foeId: string): void {
  s.fx = [];
  const g = hereGrid(s, c);
  const f = foesHere(s).find((x) => x.id === foeId);
  if (!g || !f || !canHit(s, c, foeId)) return;
  fx(s, f.pos, '', 'lunge', 0, s.pos!);
  fx(s, f.pos, '', 'slash', 0, s.pos!);
  playerHits(s, c, f);
  s.spirit = Math.min(MAX_SPIRIT, (s.spirit ?? 0) + SPIRIT_PER_BASIC);
  afterAction(s, c, g);
}

// ---------- skills ----------

/** The hexes a dash towards a cell would cross: straight on, through enemies, stopping before water, walls and
 *  fog. It can't end on an enemy, so it lands on the last free hex. */
export function dashPath(s: GameState, c: Content, skillId: string, targetKey: string): Cell[] {
  const sk = c.skills[skillId];
  const pid = currentPoint(s);
  const g = hereGrid(s, c);
  const me = hereCell(s, c);
  const to = g?.byKey.get(targetKey);
  if (!sk || !pid || !g || !me || !to || to === me) return [];
  const dir = dirTo(me, to);
  const out: Cell[] = [];
  let x: Cell | undefined = me;
  for (let i = 0; i < (sk.range ?? 2); i++) {
    x = x && stepDir(g, x, dir);
    if (!x || c.terrain[x.t]?.cost == null || !isSeen(s, c, pid, x)) break;
    out.push(x);
  }
  while (out.length && foeAt(s, out[out.length - 1].key)) out.pop();
  return out;
}

/** The hexes a skill would hit, aimed at a cell (self-aimed skills ignore it). */
export function skillHexes(s: GameState, c: Content, skillId: string, targetKey?: string): Cell[] {
  const sk = c.skills[skillId];
  const g = hereGrid(s, c);
  const me = hereCell(s, c);
  if (!sk || !g || !me) return [];
  if (sk.kind === 'dash') return targetKey ? dashPath(s, c, skillId, targetKey) : [];
  const at = (targetKey && g.byKey.get(targetKey)) || me;
  return sk.shape ? shapeCells(g, me, at, sk.shape) : [];
}

/** Why a skill can't be used right now, or null. */
export function skillBlocked(s: GameState, c: Content, skillId: string): string | null {
  const sk = c.skills[skillId];
  if (!sk) return 'Unknown skill';
  if ((s.spirit ?? 0) < sk.spirit) return `Needs ${sk.spirit} Spirit`;
  if (sk.energy && !DEV_RULES.freeEnergy && s.energy < sk.energy) return `Needs ${sk.energy}⚡`;
  return null;
}

/** Use a skill: spends its Spirit (and ⚡), takes one tick. */
export function useSkill(s: GameState, c: Content, skillId: string, targetKey: string | undefined, now: number): void {
  s.fx = [];
  const sk = c.skills[skillId];
  const pid = currentPoint(s);
  const g = hereGrid(s, c);
  const me = hereCell(s, c);
  if (!sk || !pid || !g || !me) return;
  const why = skillBlocked(s, c, skillId);
  if (why) return say(s, `${sk.name}: ${why.toLowerCase()}.`);
  if (sk.kind === 'dash') {
    const path = targetKey ? dashPath(s, c, skillId, targetKey) : [];
    if (!path.length) return say(s, "You can't dash that way.");
    if (!spend(s, sk.energy ?? 0, now, `skill:${skillId}`)) return;
    for (const x of path) {
      look(s, g, pid, x, 1);
      const pr = x.p ? c.props[x.p] : null;
      if (pr?.hidden && !s.revealed[x.key]) {
        s.revealed[x.key] = true;
        say(s, `You notice ${pr.name.toLowerCase()}.`);
      }
    }
    fx(s, path[path.length - 1].key, '', 'dash', 0, me.key);
    s.pos = path[path.length - 1].key;
  } else {
    const hexes = skillHexes(s, c, skillId, targetKey);
    for (const x of hexes) fx(s, x.key, '', 'slash', 0, me.key);
    for (const x of hexes) {
      const f = foeAt(s, x.key);
      if (f) playerHits(s, c, f, sk.power ?? 1, sk.damage ?? 'physical');
    }
  }
  s.spirit -= sk.spirit;
  track('skill', { id: skillId, spirit: sk.spirit });
  afterAction(s, c, g);
}

// ---------- food and potions ----------

/** Why you can't use it right now, or null. */
export function cantUse(s: GameState, c: Content, id: string): string | null {
  const u = c.items[id]?.use;
  if (!u) return "That isn't something to use";
  if (!(s.bag[id] > 0)) return 'Not in your bag';
  if (u.kind === 'food' && inFight(s)) return 'No eating in a fight';
  const full = (!u.hp || s.hp >= maxHp(s, c)) && (!u.energy || s.energy >= MAX_ENERGY) && (!u.spirit || s.spirit >= MAX_SPIRIT);
  if (full && !u.buff) return u.hp ? 'Your health is full' : u.energy ? 'Your energy is full' : 'Your spirit is full';
  return null;
}

/** Eat or drink it. A potion drunk in a fight takes your turn. */
export function useItem(s: GameState, c: Content, id: string, now: number): void {
  const why = cantUse(s, c, id);
  const it = c.items[id];
  if (why) return say(s, `${it?.name ?? id}: ${why.toLowerCase()}.`);
  const u = it.use!;
  s.bag[id] -= 1;
  if (s.bag[id] <= 0) delete s.bag[id];
  if (u.hp) s.hp = Math.min(maxHp(s, c), s.hp + u.hp);
  if (u.spirit) s.spirit = Math.min(MAX_SPIRIT, (s.spirit ?? 0) + u.spirit);
  if (u.energy) {
    s.energy = Math.min(MAX_ENERGY, s.energy + u.energy);
    if (s.energy >= MAX_ENERGY) s.lastRegen = now;
  }
  if (u.buff) {
    s.buffs = (s.buffs ?? []).filter((b) => b.until > now && c.items[b.item]?.use?.kind !== 'food');
    s.buffs.push({ item: id, stats: u.buff.stats, until: now + u.buff.minutes * 60_000 });
  }
  if (u.hp && s.pos) fx(s, s.pos, `+${u.hp} HP`, 'xp');
  track('use', { item: id });
  say(s, `${u.kind === 'food' ? 'You eat' : 'You drink'} the ${it.name.toLowerCase()}.`);
  const g = hereGrid(s, c);
  if (u.kind === 'potion' && g && inFight(s)) afterAction(s, c, g);
}

/** Buffs that ran out leave. */
export function expireBuffs(s: GameState, now: number): void {
  if (s.buffs?.some((b) => b.until <= now)) s.buffs = s.buffs.filter((b) => b.until > now);
}

/** The enemies' turn. Returns true if it knocked you out. */
function afterAction(s: GameState, c: Content, g: Grid): boolean {
  if (!tick(s, c, g)) return false;
  knockOut(s, c);
  return true;
}

/** The last bed you slept in, or the first bed in the world. */
function restSpot(s: GameState, c: Content): { point: string; key: string } | null {
  if (s.restAt) {
    const point = s.restAt.split(':')[0];
    if (c.points[point]) return { point, key: s.restAt };
  }
  for (const pid of Object.keys(c.points)) {
    const x = grid(c, pid, s.day).cells.find((y) => y.p && c.props[y.p]?.type === 'rest');
    if (x) return { point: pid, key: x.key };
  }
  return null;
}

/** Knocked out: the enemies here reset, and you wake at your last rest spot with part of your HP. No items lost. */
export function knockOut(s: GameState, c: Content): void {
  track('ko', { point: s.point, foes: foesHere(s).filter((f) => f.engaged).map((f) => f.kind) });
  if (s.point) resetFoes(s, c, s.point);
  s.hp = Math.ceil(maxHp(s, c) * KO_HP);
  const spot = restSpot(s, c);
  if (spot) enterPoint(s, c, spot.point, spot.key);
  say(s, 'You black out… and wake in a bed, sore. Nothing is missing from your bag.');
}

// ---------- doing things ----------

function give(s: GameState, item: string, n: number, why: string): void {
  if (n <= 0) return;
  s.bag[item] = (s.bag[item] ?? 0) + n;
  track('gain', { item, n, why, point: s.point });
}

const roll = ([lo, hi]: [number, number]) => lo + Math.floor(Math.random() * (hi - lo + 1));

// Item gains are not said: the UI animates them from the bag's change.
export function actionsHere(s: GameState, c: Content): Action[] {
  const pid = currentPoint(s);
  const x = hereCell(s, c);
  if (!pid || !x) return [];
  const out: Action[] = [];
  const pr = visibleProp(s, c, x);

  if (pr?.type === 'node') {
    const tier = pr.tier ?? 1;
    const cost = nodeCost(pr);
    const label = `${pr.verb ?? 'Gather'} ${pr.name}`;
    if (s.depleted[x.key]) out.push({ id: 'gather', label, cost, disabled: 'Regrows tomorrow', run: () => {} });
    else if (tier > s.toolTier) out.push({ id: 'gather', label, cost, disabled: `Needs a tier-${tier} tool`, run: () => {} });
    else
      out.push({
        id: 'gather',
        label,
        cost,
        run: (now) => {
          if (!spend(s, cost, now, 'gather')) return;
          const lvl = pr.skill ? skillLevel(s, pr.skill) : 1;
          const got = levelledYield(roll(nodeYield(pr)), Array.isArray(pr.yield), lvl);
          track('gather', { node: pr.code, tier, cost, n: got, skill: pr.skill, level: lvl, point: pid });
          give(s, pr.item ?? pr.code, got, `gather:${pr.code}`);
          if (pr.extra) give(s, pr.extra.item, pr.extra.amount, `extra:${pr.code}`);
          if (pr.bonus && Math.random() < pr.bonus.chance) give(s, pr.bonus.item, 1, `bonus:${pr.code}`);
          s.depleted[x.key] = true;
          if (pr.skill) {
            const xp = addSkillXp(s, c, pr.skill, nodeXp(pr));
            if (xp) fx(s, x.key, `+${xp} ${c.lifeskills[pr.skill]?.name ?? pr.skill} xp`, 'xp');
          }
        },
      });
  } else if (pr?.type === 'secret') {
    out.push({
      id: 'take',
      label: `Take: ${pr.name}`,
      cost: 0,
      run: () => {
        s.taken[x.key] = true;
        if (pr.item) give(s, pr.item, pr.amount ?? 1, `secret:${pr.code}`);
      },
    });
  } else if (pr?.type === 'npc' && pr.npc) {
    const npcId = pr.npc;
    out.push({
      id: 'talk',
      label: `Talk to ${c.npcs[npcId].name}`,
      cost: 0,
      run: () => {
        if (!talkTo(s, c, npcId)) s.talk[npcId] = (s.talk[npcId] ?? 0) + 1; // a quest stage with them, or their own lines
      },
    });
  } else if (pr?.type === 'rest') {
    out.push({
      id: 'rest',
      label: `Rest at ${pr.name}`,
      cost: 0,
      disabled: s.rested ? 'Already rested today' : undefined,
      run: (now) => {
        track('rest', { energy: s.energy, hp: s.hp });
        s.energy = MAX_ENERGY;
        s.lastRegen = now;
        s.hp = maxHp(s, c);
        s.hpAt = now;
        s.rested = true;
        s.restAt = x.key;
        say(s, 'You sleep for an hour. Energy and health full.');
      },
    });
  }

  if (c.points[pid].fog)
    out.push({
      id: 'search',
      label: 'Search nearby',
      cost: COST.search,
      run: (now) => {
        if (!spend(s, COST.search, now, 'search')) return;
        const g = grid(c, pid, s.day);
        look(s, g, pid, x, SEARCH_RADIUS);
        let found = 0;
        for (const y of g.cells) {
          const p = y.p ? c.props[y.p] : null;
          if (p?.hidden && !s.revealed[y.key] && hexDistance(x, y) <= SEARCH_RADIUS) {
            s.revealed[y.key] = true;
            found++;
          }
        }
        say(s, found ? `You search and spot ${found} thing${found > 1 ? 's' : ''}.` : 'You search. Nothing new nearby.');
      },
    });
  // with an enemy after you, the field is out of reach: gathering, taking, talking, resting
  if (inFight(s)) for (const a of out) if (!a.disabled) a.disabled = 'Not with an enemy after you';
  return out;
}

// ---------- time ----------


export function nextDay(s: GameState, c: Content, now: number): void {
  s.day++;
  track('day', { day: s.day });
  s.depleted = {};
  s.beaten = {};
  s.foes = {};
  s.foeRolls = {};
  ensureFoes(s, c, now);
  s.rested = false;
  s.energy = MAX_ENERGY;
  s.lastRegen = now;
  say(s, `Day ${s.day}. Trees regrow; the tide moves things around.`);
}
