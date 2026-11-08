// The message log: lines for the player to read.

import type { GameState } from './types';
import { LOG_LENGTH } from './rules';
import { track } from './telemetry';

/** A line for the player to read. The UI shows the newest one briefly. */
export function say(s: GameState, msg: string): void {
  s.log.unshift(msg);
  track('say', { text: msg });
  if (s.log.length > LOG_LENGTH) s.log.length = LOG_LENGTH;
  s.seq = (s.seq ?? 0) + 1;
}
