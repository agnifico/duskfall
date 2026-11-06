// UI-only state. Never saved.

export type PanelId = 'bag' | 'quests' | 'character' | 'person' | 'settings';

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
  person: null as string | null, // whose profile the 'person' panel shows
  people: false, // the People list under the portrait is open
  map: null as MapView | null, // null: you're looking at the hex field
  gains: [] as Gain[],
  bagBump: 0, // goes up each time a gain lands in the bag
  note: { seq: 0, text: '' }, // a UI message ("Theme: Harvest"), shown like game messages
});

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
