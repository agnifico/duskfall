import type { PointKind, PropType } from '../engine/types';

/** One step of a breadcrumb. Steps without onclick are plain text. */
export interface Crumb {
  label: string;
  onclick?: () => void;
}

export const KIND_LABEL: Record<PointKind, string> = {
  gathering: 'Gathering',
  secrets: 'Secrets and enemies',
  people: 'People',
};

/** Tone class of a point's shield on the land map. */
export const PIN_TONE: Record<PointKind, string> = {
  gathering: 't-good',
  secrets: 't-info',
  people: 't-warm',
};

/** The small heading on the event card. */
export const CARD_KIND: Partial<Record<PropType, string>> = {
  npc: 'Person',
  look: 'Place',
  secret: 'Find',
  enemy: 'Enemy',
  rest: 'Rest',
  exit: 'Way out',
};
