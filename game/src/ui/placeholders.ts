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

/** Until the player has levels. The name is in the save (GameState.name) once you set it. */
export const PLAYER = { name: 'Washed ashore', monogram: '?', level: 1, xp: 0, xpNext: 100 };
