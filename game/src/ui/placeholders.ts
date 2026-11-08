// Stand-ins shown by the UI until the real systems exist. Each one is replaced when its system is built.

/** Until quests exist. Shown on the land map and in the Quests panel. */
export const ACTIVE_QUEST = {
  title: 'Washed Ashore',
  objective: 'Find whoever lives in the house above the beach.',
};

/** Until time of day is designed. */
export const TIME_OF_DAY = 'Morning';

/** Until World Resonance is built (Dawn's Journey's attunement level; gates places and fights). */
export const WORLD_RESONANCE = 0;

/** Until the player names themselves (GameState.name). Levels are real now: engine/progress.ts. */
export const PLAYER = { name: 'Dawn', monogram: '?' };

/** Your title: what the world calls you. It changes as the story goes (Emerging Adventurer, Chosen by Hell…).
 *  Until titles are a system, this one. */
export const TITLE = { name: 'Washed Ashore', text: 'Pulled from the sea onto Nuvatra’s north shore, with nothing but what you wore.' };
