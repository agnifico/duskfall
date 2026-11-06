// Everything the player can do. Each function changes the state it is given, and nothing else.

import type { Action, Cell, Content, GameState, Prop } from './types';
import { COST, DEV_RULES, LOG_LENGTH, MAX_ENERGY, REGEN_MS, SEARCH_RADIUS } from './rules';
import { grid, hexDistance, route, type Grid } from './hex';

/** A line for the player to read. The UI shows the newest one briefly. */
export function say(s: GameState, msg: string): void {
  s.log.unshift(msg);
  if (s.log.length > LOG_LENGTH) s.log.length = LOG_LENGTH;
  s.seq = (s.seq ?? 0) + 1;
}

export const itemName = (c: Content, id: string) => c.items[id]?.name ?? id;

/** How many a node gives per gather, as [min, max]. */
export function nodeYield(pr: Prop): [number, number] {
  const y = pr.yield ?? 1;
  return typeof y === 'number' ? [y, y] : y;
}

export const nodeCost = (pr: Prop) => pr.cost ?? COST.gather;

// ---------- energy ----------

export function regen(s: GameState, now: number): void {
  if (s.energy >= MAX_ENERGY) {
    s.lastRegen = now;
    return;
  }
  const ticks = Math.floor((now - s.lastRegen) / REGEN_MS);
  if (ticks <= 0) return;
  s.energy = Math.min(MAX_ENERGY, s.energy + ticks);
  s.lastRegen = s.energy >= MAX_ENERGY ? now : s.lastRegen + ticks * REGEN_MS;
}

export function msToNextEnergy(s: GameState, now: number): number {
  return s.energy >= MAX_ENERGY ? 0 : Math.max(0, REGEN_MS - (now - s.lastRegen));
}

export function msToFullEnergy(s: GameState, now: number): number {
  return s.energy >= MAX_ENERGY ? 0 : msToNextEnergy(s, now) + (MAX_ENERGY - s.energy - 1) * REGEN_MS;
}

function spend(s: GameState, n: number, now: number): boolean {
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

/** The prop on a cell as the player can see it right now: hidden, beaten or taken ones are gone. */
export function visibleProp(s: GameState, c: Content, x: Cell): Prop | null {
  if (!x.p) return null;
  const pr = c.props[x.p];
  if (!pr) return null;
  if (pr.hidden && !s.revealed[x.key]) return null;
  if (pr.type === 'enemy' && s.beaten[x.key]) return null;
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

export function enterPoint(s: GameState, c: Content, pointId: string, atKey?: string): void {
  const g = grid(c, pointId, s.day);
  const start = (atKey && g.byKey.get(atKey)) || g.cells.find((x) => x.p === '>') || g.cells[0];
  s.point = pointId;
  s.pos = start.key;
  const land = landOf(c, pointId);
  if (land) markVisited(s, land);
  look(s, g, pointId, start, 1);
}

export function teleportTo(s: GameState, c: Content, npcId: string): void {
  const npc = c.npcs[npcId];
  const at = grid(c, npc.point, s.day).cells.find((x) => x.p && c.props[x.p]?.npc === npcId);
  enterPoint(s, c, npc.point, at?.key);
  say(s, `You make your way back to ${npc.name}.`);
}

// ---------- walking inside a point ----------

export function planRoute(s: GameState, c: Content, targetKey: string) {
  const pid = currentPoint(s);
  const g = hereGrid(s, c);
  const from = hereCell(s, c);
  const to = g?.byKey.get(targetKey);
  if (!pid || !g || !from || !to) return null;
  return route(
    g,
    from,
    to,
    (x) => c.terrain[x.t]?.cost != null && isSeen(s, c, pid, x),
    (x) => c.terrain[x.t].cost ?? Infinity,
  );
}

export function moveTo(s: GameState, c: Content, targetKey: string, now: number): void {
  const pid = currentPoint(s);
  const g = hereGrid(s, c);
  const plan = planRoute(s, c, targetKey);
  if (!pid || !g || !plan || !plan.path.length) return;
  if (!spend(s, plan.cost, now)) return;
  for (const step of plan.path) {
    look(s, g, pid, step, 1);
    const pr = step.p ? c.props[step.p] : null;
    if (pr?.hidden && !s.revealed[step.key]) {
      s.revealed[step.key] = true;
      say(s, `You notice ${pr.name.toLowerCase()}.`);
    }
  }
  s.pos = targetKey;
}

// ---------- doing things ----------

function give(s: GameState, item: string, n: number): void {
  if (n > 0) s.bag[item] = (s.bag[item] ?? 0) + n;
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
          if (!spend(s, cost, now)) return;
          give(s, pr.item ?? pr.code, roll(nodeYield(pr)));
          if (pr.extra) give(s, pr.extra.item, pr.extra.amount);
          if (pr.bonus && Math.random() < pr.bonus.chance) give(s, pr.bonus.item, 1);
          s.depleted[x.key] = true;
        },
      });
  } else if (pr?.type === 'enemy') {
    out.push({
      id: 'fight',
      label: `Fight the ${pr.name}`,
      cost: COST.fight,
      run: (now) => {
        if (!spend(s, COST.fight, now)) return;
        s.beaten[x.key] = true;
        if (pr.item) give(s, pr.item, 1);
        say(s, `You beat the ${pr.name}. It'll be back tomorrow.`);
      },
    });
  } else if (pr?.type === 'secret') {
    out.push({
      id: 'take',
      label: `Take: ${pr.name}`,
      cost: 0,
      run: () => {
        s.taken[x.key] = true;
        if (pr.item) give(s, pr.item, pr.amount ?? 1);
      },
    });
  } else if (pr?.type === 'npc' && pr.npc) {
    const npcId = pr.npc;
    out.push({
      id: 'talk',
      label: `Talk to ${c.npcs[npcId].name}`,
      cost: 0,
      run: () => {
        s.talk[npcId] = (s.talk[npcId] ?? 0) + 1;
      },
    });
  } else if (pr?.type === 'rest') {
    out.push({
      id: 'rest',
      label: `Rest at ${pr.name}`,
      cost: 0,
      disabled: s.rested ? 'Already rested today' : undefined,
      run: (now) => {
        s.energy = MAX_ENERGY;
        s.lastRegen = now;
        s.rested = true;
        say(s, 'You sleep for an hour. Energy full.');
      },
    });
  }

  if (c.points[pid].fog)
    out.push({
      id: 'search',
      label: 'Search nearby',
      cost: COST.search,
      run: (now) => {
        if (!spend(s, COST.search, now)) return;
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
  return out;
}

// ---------- time ----------

export function nextDay(s: GameState, now: number): void {
  s.day++;
  s.depleted = {};
  s.beaten = {};
  s.rested = false;
  s.energy = MAX_ENERGY;
  s.lastRegen = now;
  say(s, `Day ${s.day}. Trees regrow; the tide moves things around.`);
}
