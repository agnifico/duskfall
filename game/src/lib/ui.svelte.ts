// UI-only state. Never saved.

export type PanelId = 'bag' | 'quests' | 'character' | 'person' | 'settings';

/** Full-page screens, for deep work (inventory; later crafting, homestead, skill pages). Panels are quick looks
 *  over the field; screens replace it. The field stays mounted underneath, hidden, so coming back is instant.
 *  The URL follows (#/inventory): a reload keeps you on the screen, and Back leaves it. */
export type ScreenId = 'inventory' | 'crafting';
/** Each screen and the key that opens it (and closes it again). */
export const SCREEN_KEYS: Record<ScreenId, string> = { inventory: 'i', crafting: 'k' };
const SCREENS = Object.keys(SCREEN_KEYS) as ScreenId[];
export const screenFromHash = (): ScreenId | null => {
  const id = location.hash.replace(/^#\/?/, '') as ScreenId;
  return SCREENS.includes(id) ? id : null;
};

/** The map, open over the hex field. A land's map can first show its title screen (intro). */
export type MapView =
  | { kind: 'world' }
  | {
      kind: 'land';
      land: string;
      intro: boolean;
      animate: boolean;
      zone?: string; // fly to this zone…
      focus?: number; // …each time this number changes
    };

export interface Gain {
  id: number;
  item: string;
  n: number;
  delay: number; // ms, so several gains from one action arrive one after another
}

export const UI = $state({
  panel: null as PanelId | null,
  screen: screenFromHash() as ScreenId | null,
  person: null as string | null, // whose profile the 'person' panel shows
  invFocus: null as { slot: import('../engine/types').WornSlot | 'relic'; i: number } | null, // open the Inventory screen on this worn piece
  people: false, // the People list under the portrait is open
  map: null as MapView | null, // null: you're looking at the hex field
  gains: [] as Gain[],
  bagBump: 0, // goes up each time a gain lands in the bag
  note: { seq: 0, text: '' }, // a UI message ("Theme: Harvest"), shown like game messages
  aim: null as string | null, // a skill waiting for you to click where to aim it
  preview: null as string | null, // a skill whose reach is shown on the field (hovering its slot)
  hidden: false, // the whole UI hidden (H, or the bottom-left button)
  menuOpen: loadPref('menuOpen', false), // the bottom-right menu kept expanded
  angle: loadPref('angle', 0), // how far the hex field is turned, in degrees (not wrapped, so turning tweens the short way)
});

// ---------- UI preferences: kept in the browser, apart from the save ----------

const PREFS_KEY = 'nuvatra.ui';
function loadPref<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')[key] ?? fallback;
  } catch {
    return fallback;
  }
}
export function savePref(key: string, value: unknown): void {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    all[key] = value;
    localStorage.setItem(PREFS_KEY, JSON.stringify(all));
  } catch {
    /* private mode: not kept */
  }
}

export function notify(text: string): void {
  UI.note = { seq: UI.note.seq + 1, text };
}

const GAIN_MS = 1600; // keep in step with the animation in hud/Gains.svelte
let nextGain = 0;

/** "+n item" appears at the left of the screen, then drops toward the bag. */
export function showGain(item: string, n: number): void {
  const id = ++nextGain;
  const delay = UI.gains.length * 140;
  UI.gains.push({ id, item, n, delay });
  setTimeout(() => {
    UI.gains = UI.gains.filter((g) => g.id !== id);
    UI.bagBump++;
  }, GAIN_MS + delay);
}

/** True while a land's title screen is up: no HUD, nothing but the land and its name. */
export const inIntro = () => UI.map?.kind === 'land' && UI.map.intro;
