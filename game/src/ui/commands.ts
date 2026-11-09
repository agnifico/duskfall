// What buttons and hotkeys do. Both go through here, so a hotkey and its button always agree.

import { DEV, G, act, setDev } from '../lib/game.svelte';
import { toggleBench } from '../lib/bench.svelte';
import { ED, closeEditor, dirty, openEditor } from '../lib/editor.svelte';
import { SCREEN_KEYS, UI, inIntro, notify, savePref, screenFromHash, type PanelId, type ScreenId } from '../lib/ui.svelte';
import { content } from '../content';
import * as E from '../engine/actions';
import { inFight } from '../engine/combat';
import * as K from '../engine/combat';
import { pointClosed } from '../engine/story';
import { nextTheme, themeOf } from './themes';

// ---------- walking, step by step ----------
// Each step is one tick, so enemies move between steps; the walk stops when the engine says so.

const STEP_MS = 170; // keep in step with the walk animation in HexView
let queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let onArrive: (() => void) | null = null; // what to do if the walk gets all the way (attack, cast)

export function stopWalk(): void {
  queue = [];
  onArrive = null;
  clearTimeout(timer);
  timer = undefined;
}

function nextStep(): void {
  timer = undefined;
  const k = queue.shift();
  if (!k || UI.map) return stopWalk();
  const go = act((s) => E.step(s, content, k, G.now));
  if (go && queue.length) timer = setTimeout(nextStep, STEP_MS);
  else {
    const then = go ? onArrive : null; // stopped early (an attack aimed at you, a find): don't follow through
    stopWalk();
    if (then) timer = setTimeout(then, STEP_MS);
  }
}

/** Walk a route of cell keys, one step at a time; `then` runs if it gets all the way. */
export function walk(keys: string[], then?: () => void): void {
  stopWalk();
  if (!keys.length) return then?.();
  queue = [...keys];
  onArrive = then ?? null;
  nextStep();
}

/** Attack an enemy: at once if it's in reach, else walk until it is, then attack. */
export function attackFoe(foeId: string, key: string): void {
  if (E.canHit(G.s, content, foeId)) return void act((s) => E.attack(s, content, foeId));
  const keys = E.approach(G.s, content, key, E.attackRange(G.s, content));
  if (!keys) return;
  walk(keys, () => E.canHit(G.s, content, foeId) && act((s) => E.attack(s, content, foeId)));
}

// ---------- skills ----------

/** A skill's slot or hotkey: self-aimed skills fire at once; others wait for a click on the field. Again cancels. */
export function pressSkill(id: string): void {
  if (UI.map || !G.s.point) return;
  if (UI.aim === id) {
    UI.aim = null;
    return;
  }
  const sk = content.skills[id];
  if (!sk) return;
  const why = E.skillBlocked(G.s, content, id);
  if (why) return notify(`${sk.name}: ${why}`);
  stopWalk();
  if (sk.aim === 'self') {
    UI.aim = null;
    act((s) => E.useSkill(s, content, id, undefined, G.now));
  } else UI.aim = id;
}

/** A quick slot (its button or its key): a skill is pressed, food or a potion is used. */
export function pressSlot(i: number): void {
  const entry = G.s.hotbar?.[i];
  if (!entry || UI.map) return;
  const [kind, id] = entry.split(':');
  if (kind === 'skill') return pressSkill(id);
  const why = E.cantUse(G.s, content, id);
  if (why) return notify(`${content.items[id]?.name ?? id}: ${why}`);
  stopWalk();
  act((s) => E.useItem(s, content, id, G.now));
}

/** A click on the field while a skill is aimed. */
export function fireAim(key: string): void {
  const id = UI.aim;
  UI.aim = null;
  if (!id) return;
  const sk = content.skills[id];
  // a targeted spell at an enemy out of reach: walk until it's in reach, then cast
  if (sk?.aim === 'target' && !E.skillHexes(G.s, content, id, key).length && K.foeAt(G.s, key)) {
    const keys = E.approach(G.s, content, key, sk.range ?? 1);
    if (keys) return walk(keys, () => E.skillHexes(G.s, content, id, key).length && act((s) => E.useSkill(s, content, id, key, G.now)));
  }
  act((s) => E.useSkill(s, content, id, key, G.now));
}

/** Run one of the actions available on the current hex, by id ("gather", "search", "talk"…). */
export function runAction(id: string): void {
  if (UI.map) return;
  const a = E.actionsHere(G.s, content, G.now).find((x) => x.id === id);
  if (a && !a.disabled) act(() => a.run(G.now));
}

export function togglePanel(p: PanelId): void {
  UI.panel = UI.panel === p ? null : p;
  UI.people = false;
}

// ---------- screens ----------
let pushed = false; // we put the screen in the history ourselves, so leaving it can go Back

/** Open a full-page screen. Not during a fight: no re-gearing between blows. */
export function openScreen(id: ScreenId): void {
  if (inFight(G.s)) {
    UI.invFocus = null;
    return notify('Not during a fight.');
  }
  UI.panel = null;
  UI.people = false;
  if (UI.screen === id) return;
  if (UI.screen && pushed) location.replace(`#/${id}`); // screen to screen: one history entry, so Back still reaches the field
  else {
    location.hash = `#/${id}`; // hashchange sets UI.screen
    pushed = true;
  }
}
export function closeScreen(): void {
  if (!UI.screen) return;
  if (pushed) history.back();
  else {
    history.replaceState(null, '', location.pathname + location.search);
    UI.screen = null;
  }
  pushed = false;
}
export const toggleScreen = (id: ScreenId) => (UI.screen === id ? closeScreen() : openScreen(id));
window.addEventListener('hashchange', () => {
  UI.screen = screenFromHash();
  if (!UI.screen) pushed = false;
});

/** Show or hide the whole UI. Hiding also closes any open panel. */
export function toggleUi(): void {
  UI.hidden = !UI.hidden;
  if (UI.hidden) {
    UI.panel = null;
    UI.people = false;
  }
}

/** The bottom-right menu: keep it expanded, or collapse it to one button (it still opens on hover). */
export function toggleMenu(): void {
  UI.menuOpen = !UI.menuOpen;
  savePref('menuOpen', UI.menuOpen);
}

/** Roll the enemies where you are again (2 free per point per cycle). */
export function rerollEnemies(): void {
  if (UI.map || !G.s.point) return;
  const why = inFight(G.s) ? 'Not in a fight' : null;
  if (why) return notify(`Reroll: ${why}`);
  stopWalk();
  act((s) => E.reroll(s, content, G.now));
}

/** Turn the hex field by some degrees. Remembered between visits. */
export function turnField(deg: number): void {
  UI.angle += deg;
  savePref('angle', UI.angle);
}

export function togglePeople(): void {
  UI.people = !UI.people;
}

/** A person's profile: their images, who they are, and a free trip to them. */
export function openPerson(npcId: string): void {
  UI.people = false;
  UI.person = npcId;
  UI.panel = 'person';
}

/** The land you're in, or the start land before you've entered anywhere. */
export function homeLand(): string | undefined {
  return (G.s.point && E.landOf(content, G.s.point)) || content.world.start;
}

let focusSeq = 0;

/** Open a land's map straight away, without its title screen; with a zone, fly to it. */
export function openLandMap(landId = homeLand(), zone?: string): void {
  if (!landId) return;
  UI.panel = null;
  UI.map = { kind: 'land', land: landId, intro: false, animate: false, zone, focus: zone ? ++focusSeq : undefined };
}

/** Back to the hex field. Only possible once you're in a point. */
export function closeMap(): void {
  if (!G.s.point) return;
  UI.map = null;
  UI.panel = null;
}

/** M, and the map in the corner: open the map of where you are; again to go back. */
export function toggleMap(): void {
  if (UI.map) closeMap();
  else openLandMap();
}

export function showWorld(): void {
  UI.panel = null;
  UI.map = { kind: 'world' };
}

/** Picking a land on the world map shows its title screen. Its animation plays the first time only. */
export function pickLand(id: string): void {
  UI.panel = null;
  UI.map = { kind: 'land', land: id, intro: true, animate: !G.s.visitedLands[id] };
}

/** From a land's title screen to its map. */
export function enterLand(): void {
  const m = UI.map;
  if (m?.kind !== 'land' || !m.intro) return;
  if (!G.s.visitedLands[m.land]) act((s) => E.markVisited(s, m.land));
  UI.map = { kind: 'land', land: m.land, intro: false, animate: false };
}

/** Go to a point from the map. The point you're already in just takes you back to it. */
export function travelTo(pointId: string): void {
  if (pointId === G.s.point) return closeMap();
  const closed = pointClosed(G.s, content, pointId);
  if (closed && !DEV.on) return notify(`${content.points[pointId]?.name}: ${closed.toLowerCase()}.`); // dev mode goes anywhere
  UI.panel = null;
  act((s) => E.enterPoint(s, content, pointId));
  UI.map = null;
}

/** Dev mode: the test bench (` or the 🧪 button): its own player in the dev field, and back to your game. */
export function toggleDevField(): void {
  if (!DEV.on && !UI.bench) return;
  if (inFight(G.s) && !UI.bench) return notify('Not during a fight.');
  toggleBench();
}

/** Going to a person is free from anywhere: questing is kept apart from adventuring. Leaving a point is always
 *  allowed, even mid-fight: it's the way out (engine/actions.ts › enterPoint). */
export function goToPerson(npcId: string): void {
  UI.panel = null;
  UI.people = false;
  act((s) => E.teleportTo(s, content, npcId));
  UI.map = null;
}

export function cycleTheme(): void {
  const id = nextTheme(DEV.theme);
  setDev({ theme: id });
  notify(`Theme: ${themeOf(id).name}`);
}

/** The map editor, in dev mode only, on the hex field. */
export function toggleEditor(): void {
  if (ED.on) {
    if (dirty() && !confirm('Leave the editor? Unsaved changes stay on screen until a reload, but are not in the file.')) return;
    return closeEditor();
  }
  if (!DEV.on || !G.s.point || UI.map) return;
  UI.panel = null;
  openEditor();
}

const EDITOR_KEYS = new Set(['e', 'h', '[', ']', 'm']);

const KEYS: Record<string, () => void> = {
  b: () => togglePanel('bag'),
  i: () => toggleScreen('inventory'),
  k: () => toggleScreen('crafting'),
  q: () => togglePanel('quests'),
  j: () => togglePanel('skills'),
  l: () => togglePanel('elements'),
  '`': toggleDevField,
  c: () => togglePanel('character'),
  p: togglePeople,
  s: () => togglePanel('settings'),
  m: toggleMap,
  g: () => runAction('gather'),
  f: () => runAction('search'),
  t: cycleTheme,
  h: toggleUi,
  r: rerollEnemies,
  e: toggleEditor,
  '[': () => turnField(-15),
  ']': () => turnField(15),
};
// 1–6: the quick slots, whatever the player put in them
for (let i = 0; i < 6; i++) KEYS[String(i + 1)] = () => pressSlot(i);

export function onKey(e: KeyboardEvent): void {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return;
  const k = e.key.toLowerCase();

  if (inIntro()) {
    // Esc goes back where you were; any other key enters the land
    if (k === 'escape') closeMap();
    else enterLand();
    e.preventDefault();
    return;
  }
  // a story beat has the screen: its own keys (Dialogue.svelte), nothing else
  if (G.s.beats?.length && !UI.map && !UI.screen) return;
  // on a screen: Esc or its own key goes back, another screen's key switches, T cycles the theme
  if (UI.screen) {
    const other = (Object.entries(SCREEN_KEYS) as [ScreenId, string][]).find(([, key]) => key === k)?.[0];
    if (k === 'escape' || other === UI.screen) closeScreen();
    else if (other) openScreen(other);
    else if (k === 't') cycleTheme();
    else return;
    e.preventDefault();
    return;
  }
  if (k === 'escape') {
    if (UI.aim) UI.aim = null;
    else if (UI.people) UI.people = false;
    else if (UI.panel) UI.panel = null;
    else if (UI.map) closeMap();
    e.preventDefault();
    return;
  }
  // in the map editor, only these game keys; its own are in EditorBar.svelte
  if (ED.on && !EDITOR_KEYS.has(k)) return;
  const fn = KEYS[k];
  if (fn) {
    e.preventDefault();
    fn();
  }
}
