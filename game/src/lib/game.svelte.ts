// The one piece of reactive game state. UI reads G.s; every change goes through act(), which saves.

import { content } from '../content';
import { regen } from '../engine/actions';
import { DEV_RULES } from '../engine/rules';
import { newGame } from '../engine/state';
import type { GameState } from '../engine/types';
import { applyTheme } from '../ui/themes';
import { clearSave, loadGame, saveGame } from './save';
import { UI, showGain } from './ui.svelte';

function start(): GameState {
  const s = loadGame() ?? newGame();
  // content can change under an old save: forget a point that no longer exists
  if (s.point && !content.points[s.point]) {
    s.point = null;
    s.pos = null;
  }
  regen(s, Date.now());
  return s;
}

export const G = $state({ s: start(), now: Date.now() });

/** Before you've entered any point, the start land's title screen is all there is. */
function openStart(): void {
  if (G.s.point) return;
  const land = content.world.start ?? Object.keys(content.lands)[0];
  if (land) UI.map = { kind: 'land', land, intro: true, animate: !G.s.visitedLands[land] };
}
openStart();

setInterval(() => {
  G.now = Date.now();
  regen(G.s, G.now);
}, 1000);

/** Run a change to the game state, animate anything that landed in the bag, and save. */
export function act(fn: (s: GameState) => void): void {
  G.now = Date.now();
  const before = { ...G.s.bag };
  fn(G.s);
  for (const [item, n] of Object.entries(G.s.bag)) {
    const gained = n - (before[item] ?? 0);
    if (gained > 0) showGain(item, gained);
  }
  saveGame($state.snapshot(G.s) as GameState);
}

export function restart(): void {
  clearSave();
  G.s = newGame();
  UI.panel = null;
  UI.map = null;
  openStart();
  saveGame($state.snapshot(G.s) as GameState);
}

// ---------- dev settings: kept apart from the save, survive "New game" ----------

const DEV_KEY = 'nuvatra.dev';
interface Dev {
  on: boolean; // dev mode: shows the dev tools in Settings
  freeEnergy: boolean; // with dev mode on, walking and actions cost no energy
  angle: number; // how far the hex field is turned, in degrees
  theme: string; // colour theme id, see ui/themes.ts
}
function loadDev(): Dev {
  const base: Dev = { on: false, freeEnergy: false, angle: 0, theme: 'meadow' };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(DEV_KEY) ?? '{}') };
  } catch {
    return base;
  }
}
export const DEV = $state(loadDev());
applyTheme(DEV.theme);
DEV_RULES.freeEnergy = DEV.on && DEV.freeEnergy;

export function setDev(patch: Partial<Dev>): void {
  Object.assign(DEV, patch);
  if (patch.theme) applyTheme(patch.theme);
  DEV_RULES.freeEnergy = DEV.on && DEV.freeEnergy;
  localStorage.setItem(DEV_KEY, JSON.stringify($state.snapshot(DEV)));
}

/** Whether an energy cost is more than you have. Never, with unlimited energy on. */
export function short(cost: number): boolean {
  return !(DEV.on && DEV.freeEnergy) && cost > G.s.energy;
}
