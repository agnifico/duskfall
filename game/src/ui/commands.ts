// What buttons and hotkeys do. Both go through here, so a hotkey and its button always agree.

import { DEV, G, act, setDev } from '../lib/game.svelte';
import { UI, inIntro, notify, type PanelId } from '../lib/ui.svelte';
import { content } from '../content';
import * as E from '../engine/actions';
import { nextTheme, themeOf } from './themes';

/** Run one of the actions available on the current hex, by id ("gather", "search", "talk"…). */
export function runAction(id: string): void {
  if (UI.map) return;
  const a = E.actionsHere(G.s, content).find((x) => x.id === id);
  if (a && !a.disabled) act(() => a.run(G.now));
}

export function togglePanel(p: PanelId): void {
  UI.panel = UI.panel === p ? null : p;
  UI.people = false;
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
  UI.panel = null;
  act((s) => E.enterPoint(s, content, pointId));
  UI.map = null;
}

/** Going to a person is free from anywhere: questing is kept apart from adventuring. */
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

const KEYS: Record<string, () => void> = {
  b: () => togglePanel('bag'),
  q: () => togglePanel('quests'),
  c: () => togglePanel('character'),
  p: togglePeople,
  s: () => togglePanel('settings'),
  m: toggleMap,
  g: () => runAction('gather'),
  f: () => runAction('search'),
  t: cycleTheme,
};

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
  if (k === 'escape') {
    if (UI.people) UI.people = false;
    else if (UI.panel) UI.panel = null;
    else if (UI.map) closeMap();
    e.preventDefault();
    return;
  }
  const fn = KEYS[k];
  if (fn) {
    e.preventDefault();
    fn();
  }
}
