// Sends the engine's playtest log (engine/telemetry.ts) to the dev server, which appends it to
// game/playtest/<session>.jsonl. Only when the game runs from the dev server. A session is one page load;
// it opens with a snapshot of the save, takes another each minute, and flushes every few seconds.

import { content } from '../content';
import { wornIds } from '../engine/gear';
import { TELEMETRY, track } from '../engine/telemetry';
import { combatLevel, maxHp } from '../engine/progress';
import { DEV, G } from './game.svelte';

const FLUSH_MS = 5_000;
const SNAPSHOT_MS = 60_000;

function snapshot(kind: string) {
  const s = G.s;
  track(kind, {
    point: s.point,
    day: s.day,
    energy: s.energy,
    hp: s.hp,
    maxHp: maxHp(s, content),
    worn: wornIds(s),
    spirit: s.spirit,
    level: combatLevel(s),
    xp: s.xp,
    skills: { ...s.skills },
    bag: { ...s.bag },
    dev: DEV.on,
    freeEnergy: DEV.on && DEV.freeEnergy,
  });
}

if (import.meta.env.DEV) {
  TELEMETRY.on = true;
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const session = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const body = () => JSON.stringify({ session, events: TELEMETRY.queue.splice(0) });
  const flush = () => {
    if (!TELEMETRY.queue.length) return;
    fetch('/__dev/telemetry', { method: 'POST', body: body() }).catch(() => {});
  };
  snapshot('session');
  const a = setInterval(flush, FLUSH_MS);
  const b = setInterval(() => snapshot('snapshot'), SNAPSHOT_MS);
  import.meta.hot?.dispose(() => (clearInterval(a), clearInterval(b))); // a hot reload mustn't stack them
  // the last few seconds, when the tab closes or reloads
  addEventListener('pagehide', () => {
    snapshot('end');
    if (TELEMETRY.queue.length) navigator.sendBeacon('/__dev/telemetry', body());
  });
}
