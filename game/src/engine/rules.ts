// The numbers. Tune here.

export const MAX_ENERGY = 10;
export const REGEN_MS = 90_000; // one energy every 90 s: empty to full in 15 minutes
export const COST = { gather: 3, fight: 4, search: 2 } as const;
export const SEARCH_RADIUS = 2;
export const LOG_LENGTH = 12;

/** Developer switches the engine reads. Set by the UI from Settings › Dev mode; never saved with the game. */
export const DEV_RULES = {
  freeEnergy: false, // walking and actions cost no energy
};
