// Saves live in the browser (localStorage). Two slots: the game, and the dev test bench's own profile.

import type { GameState } from '../engine/types';
import { newGame, SAVE_VERSION } from '../engine/state';
import { STARTING_WEAPON } from '../engine/rules';

const SLOTS = { game: 'nuvatra.save', bench: 'nuvatra.bench' } as const;
let KEY: string = SLOTS.game;
/** Which slot loading and saving use from now on. */
export function useSlot(slot: keyof typeof SLOTS): void {
  KEY = SLOTS[slot];
}

/** v2 kept item names in the bag; v3 keeps item ids. */
const V2_ITEM_IDS: Record<string, string> = {
  'Palm wood': 'wood',
  'Pine wood': 'wood',
  Hardwood: 'wood',
  Driftwood: 'wood',
  Deadwood: 'wood',
  'Ancient heartwood': 'etherwood',
  Stone: 'stone',
  Berries: 'berries',
  'Resonant shard': 'red-crystal',
  'Crab shell': 'crab-shell',
  'Boar hide': 'boar-hide',
  'Sea glass': 'sea-glass',
  'Old coin': 'coin',
};

/** Upgrades older saves one version at a time. */
function migrate(data: any): any {
  if (data.version === 1) {
    // v2 replaced the zone screen with zoomable land maps
    if (data.view?.kind === 'zone') data.view = { kind: 'land', land: 'nuvatra' };
    data.version = 2;
  }
  if (data.version === 2) {
    const bag: Record<string, number> = {};
    for (const [name, n] of Object.entries(data.bag ?? {})) {
      const id = V2_ITEM_IDS[name] ?? name;
      bag[id] = (bag[id] ?? 0) + (n as number);
    }
    data.bag = bag;
    data.version = 3;
  }
  if (data.version === 3) {
    // v4: which map is open became UI state; the save keeps only the point you're in
    data.point = data.view?.kind === 'point' ? data.view.point : null;
    data.visitedLands = data.point || data.lastPoint ? { nuvatra: true } : {};
    delete data.view;
    delete data.lastPoint;
    data.version = 4;
  }
  if (data.version === 4) {
    // v5: you start with a weapon in hand; older saves with an empty main hand get it
    if (data.worn && !data.worn.main) data.worn.main = STARTING_WEAPON;
    data.version = 5;
  }
  return data;
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = migrate(JSON.parse(raw));
    if (data.version !== SAVE_VERSION) {
      console.warn(`save is version ${data.version}, the game reads ${SAVE_VERSION}: starting fresh`);
      return null;
    }
    return { ...newGame(), ...data }; // fields added since the save was written get defaults
  } catch (e) {
    console.warn('save could not be read', e);
    return null;
  }
}

export function saveGame(s: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('save failed', e);
  }
}

export function clearSave(): void {
  localStorage.removeItem(KEY);
}
