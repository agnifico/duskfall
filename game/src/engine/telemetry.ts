// Playtest log: what happens, as events (what you spend, earn, level, fight). The engine only queues them;
// lib/telemetry.ts sends them to the dev server, which writes game/playtest/<session>.jsonl. Off outside dev.

export interface LogEvent {
  t: number; // ms timestamp
  ev: string;
  [k: string]: unknown;
}

export const TELEMETRY = { on: false, queue: [] as LogEvent[] };

export function track(ev: string, data: Record<string, unknown> = {}): void {
  if (TELEMETRY.on) TELEMETRY.queue.push({ t: Date.now(), ev, ...data });
}
