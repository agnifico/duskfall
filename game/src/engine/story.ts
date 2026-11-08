// Quests and story beats (content/quests.json; the format is in design/QUESTS.md).
// A quest starts by itself when its `start` holds. Its stages run in order. An `auto` stage plays its dialogue
// the moment its `need` holds (a story beat); any other stage plays when you talk to its `who` with the need met,
// or plays its reminder if not. Dialogue waits in `s.beats` for the UI to show; its effects apply when it ends.
// Tags are story flags: choices made, beats seen. Areas can open with them (Point.opensWith).

import type { Beat, Cond, Content, Effect, GameState, QuestProgress } from './types';
import { say } from './log';
import { MAX_ENERGY } from './rules';
import { track } from './telemetry';
import { addCombatXp, combatLevel } from './progress';
import { wear } from './gear';
import { enterPoint } from './actions';
import { spawnAround } from './combat';
import { errandKill } from './errands';

/** Whether a condition holds. `q` is the quest whose stage asks (for kills and talks since the stage began). */
export function check(s: GameState, c: Content, cond: Cond, q?: QuestProgress): boolean {
  if ('all' in cond) return cond.all.every((x) => check(s, c, x, q));
  if ('any' in cond) return cond.any.some((x) => check(s, c, x, q));
  if ('not' in cond) return !check(s, c, cond.not, q);
  if ('talk' in cond) return !!q?.talked?.includes(cond.talk);
  if ('enter' in cond) return s.point === cond.enter;
  if ('kill' in cond) return (q?.count ?? 0) >= cond.n;
  if ('have' in cond) return (s.bag[cond.have] ?? 0) >= cond.n;
  if ('level' in cond) return combatLevel(s) >= cond.level;
  if ('tag' in cond) return !!s.tags?.[cond.tag];
  if ('notTag' in cond) return !s.tags?.[cond.notTag];
  if ('quest' in cond) return s.quests?.[cond.quest]?.state === cond.state;
  return false;
}

/** The people the story has standing on a point right now, by cell key (content/points › people). */
export function peopleOn(s: GameState, c: Content, pointId: string | null): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of (pointId && c.points[pointId]?.people) || []) if (!p.while || check(s, c, p.while)) out.set(`${pointId}:${p.at[0]}:${p.at[1]}`, p.npc);
  return out;
}

/** The kill condition inside a stage's need, if any. */
function killOf(cond: Cond): Extract<Cond, { kill: unknown }> | null {
  if ('kill' in cond) return cond;
  if ('all' in cond || 'any' in cond) {
    for (const x of 'all' in cond ? cond.all : cond.any) {
      const k = killOf(x);
      if (k) return k;
    }
  }
  return null;
}

const queued = (s: GameState, quest: string, stage: number) => s.beats.some((b) => b.quest === quest && b.stage === stage);

/** Start the quests whose start holds, and queue the auto stages whose need holds. Runs after every action. */
export function updateStory(s: GameState, c: Content): void {
  s.quests ??= {};
  s.tags ??= {};
  s.beats ??= [];
  for (const [id, q] of Object.entries(c.quests)) {
    if (s.quests[id] || !check(s, c, q.start)) continue;
    s.quests[id] = { state: 'active', stage: 0, count: 0 };
    track('quest', { id, state: 'start' });
    say(s, `New quest: ${q.title}.`);
  }
  for (const [id, p] of Object.entries(s.quests)) {
    const st = p.state === 'active' ? c.quests[id]?.stages[p.stage] : undefined;
    if (!st?.auto || queued(s, id, p.stage) || !check(s, c, st.need, p)) continue;
    if (st.say?.length) s.beats.push({ quest: id, stage: p.stage, lines: st.say, then: st.then ?? [], finish: true });
    else {
      applyEffects(s, c, st.then ?? []);
      advance(s, c, id);
      return updateStory(s, c); // the next stage may already hold
    }
  }
}

/** You talk to someone. A stage with them plays (or its reminder). False if no quest wants them. */
export function talkTo(s: GameState, c: Content, npc: string): boolean {
  for (const [id, p] of Object.entries(s.quests ?? {})) {
    const st = p.state === 'active' ? c.quests[id]?.stages[p.stage] : undefined;
    if (!st || st.auto || st.who !== npc || queued(s, id, p.stage)) continue;
    p.talked = [...(p.talked ?? []), npc];
    if (check(s, c, st.need, p)) s.beats.push({ quest: id, stage: p.stage, lines: st.say ?? [], then: st.then ?? [], finish: true });
    else {
      p.talked = p.talked.filter((x) => x !== npc); // the talk counts only alongside the rest of the need
      s.beats.push({ quest: id, stage: p.stage, lines: st.remind ?? [`${npc}: Not yet.`], then: [], finish: false });
    }
    return true;
  }
  return false;
}

/** An enemy was beaten: count it toward any stage that wants it. */
export function onKill(s: GameState, c: Content, kind: string, point: string | null): void {
  errandKill(s, c, kind, point);
  for (const [id, p] of Object.entries(s.quests ?? {})) {
    const st = p.state === 'active' ? c.quests[id]?.stages[p.stage] : undefined;
    const k = st && killOf(st.need);
    if (!k) continue;
    const kinds = Array.isArray(k.kill) ? k.kill : [k.kill];
    if (!kinds.includes('*') && !kinds.includes(kind)) continue;
    if (k.at && (!point || !k.at.includes(point))) continue;
    p.count = (p.count ?? 0) + 1;
  }
}

/** The first beat has been shown: apply its effects, and complete its stage. */
export function finishBeat(s: GameState, c: Content): void {
  const b: Beat | undefined = s.beats.shift();
  if (!b) return;
  applyEffects(s, c, b.then);
  if (b.finish) advance(s, c, b.quest);
  updateStory(s, c);
}

function advance(s: GameState, c: Content, id: string): void {
  const p = s.quests[id];
  const q = c.quests[id];
  if (!p || !q) return;
  p.stage += 1;
  p.count = 0;
  p.talked = [];
  if (p.stage >= q.stages.length) {
    p.state = 'done';
    track('quest', { id, state: 'done' });
    say(s, `Quest complete: ${q.title}.`);
  } else track('quest', { id, stage: p.stage });
}

export function applyEffects(s: GameState, c: Content, effects: Effect[]): void {
  for (const e of effects) {
    if ('give' in e) {
      s.bag[e.give] = (s.bag[e.give] ?? 0) + (e.n ?? 1);
      track('gain', { item: e.give, n: e.n ?? 1, why: 'quest' });
      if (e.wear) wear(s, c, e.give);
    } else if ('take' in e) {
      s.bag[e.take] = (s.bag[e.take] ?? 0) - e.n;
      if (s.bag[e.take] <= 0) delete s.bag[e.take];
    } else if ('xp' in e) addCombatXp(s, e.xp);
    else if ('energy' in e) s.energy = Math.min(MAX_ENERGY, s.energy + e.energy);
    else if ('tag' in e) s.tags[e.tag] = true;
    else if ('untag' in e) delete s.tags[e.untag];
    else if ('goto' in e) enterPoint(s, c, e.goto, e.at);
    else if ('spawn' in e) spawnAround(s, c, e.spawn);
    else if ('notify' in e) say(s, e.notify);
  }
}

/** Why a point is closed to you, or null. */
export function pointClosed(s: GameState, c: Content, pointId: string): string | null {
  const p = c.points[pointId];
  return p?.opensWith && !check(s, c, p.opensWith) ? (p.closedText ?? 'Not yet') : null;
}

/** The quest to show where there's room for one (map, profile): the main story's, else any. */
export function focusQuest(s: GameState, c: Content): { title: string; objective: string } | null {
  const a = activeStages(s, c);
  const f = a.find((x) => x.q.main) ?? a[0];
  return f ? { title: f.q.title, objective: f.st?.objective + (f.progress ? ` (${f.progress})` : '') } : null;
}

/** The current stage of each active quest, for the tracker and the log. */
export function activeStages(s: GameState, c: Content) {
  return Object.entries(s.quests ?? {})
    .filter(([id, p]) => p.state === 'active' && c.quests[id])
    .map(([id, p]) => {
      const q = c.quests[id];
      const st = q.stages[p.stage];
      const k = st ? killOf(st.need) : null;
      return { id, q, p, st, progress: k ? `${Math.min(p.count ?? 0, k.n)} / ${k.n}` : null };
    });
}
