// Plain data shapes. The engine never imports Svelte or touches the DOM.

export interface Terrain {
  name: string;
  colour: string;
  height: number; // steps of elevation, drawn as a taller hex side
  cost: number | null; // energy to step onto it; null = can't walk there
}

export type PropType = 'node' | 'enemy' | 'secret' | 'npc' | 'rest' | 'look' | 'exit';

export interface Prop {
  code: string; // filled in by the content loader from the props.json key
  type: PropType;
  name: string;
  icon: string; // emoji, used when there is no sprite
  text?: string; // what the event card says about it
  sprite?: string; // "set/name" in sprites.json
  size?: number; // drawn width as a share of a hex's width
  dx?: number; // hand-tuned offsets, in hex widths
  dy?: number;
  flat?: boolean; // lies on the ground: centred on the hex, no cast shadow

  // nodes
  tier?: number; // tool tier needed
  verb?: string; // "Chop", "Mine"
  item?: string; // item id. Also what an enemy drops and what a secret holds.
  yield?: number | [number, number]; // how many per gather: fixed, or a range
  cost?: number; // energy per gather; COST.gather if missing
  extra?: { item: string; amount: number }; // always given as well (ore veins also give stone)
  bonus?: { item: string; chance: number }; // sometimes given as well (birch bark, acorns)
  spent?: string; // sprite shown once used up today (stump, rubble); otherwise it fades

  amount?: number; // secret: how many of its item
  hidden?: boolean; // secret: invisible until found
  npc?: string; // npc: id in npcs.json
}

export interface Item {
  name: string;
  sprite?: string; // "set/name" in sprites.json
  icon?: string; // emoji, used when there is no sprite
  text?: string;
  currency?: boolean; // counted in the top bar, not kept in the bag
}

export interface MapImage {
  image: string; // in public/
  width: number; // map units: the base image's pixels
  height: number;
  sea?: string; // the colour at the painting's edges, shown around it so it has no hard border
}

/** A higher-detail painting of part of a land's map, faded in when zoomed in. */
export interface Patch {
  image: string;
  rect: [number, number, number, number]; // x, y, width, height in the land map's units
}

export interface Zone {
  id: string;
  name: string;
  label: [number, number]; // where its name sits on the land map
  locked?: string; // why it is closed, e.g. "Chapter 2"
}

export interface Land {
  id: string;
  name: string;
  subtitle?: string;
  map: MapImage;
  zones: Zone[];
  patches?: Patch[];
}

export interface LandPin {
  id: string;
  name: string;
  pin: [number, number]; // on the world map
  locked?: string;
}

export type PointKind = 'gathering' | 'secrets' | 'people';

export interface Point {
  id: string;
  name: string;
  zone: string;
  pin: [number, number]; // on its land's map
  kind: PointKind;
  fog: boolean;
  backdrop?: 'sky' | 'sea'; // what's around the hex field: clouds drifting below, or open water (default sky)
  table: string[]; // prop codes a "*" slot can roll, re-rolled each day
  rows: string[]; // hex rows: terrain letter, then optionally "." and a prop code
}

/** A character's figure on the hex field: painted facing right, mirrored to face left. */
export interface Figure {
  stand: string; // "set/name" in sprites.json
  walk?: string; // the mid-step frame, alternated with stand while walking
  height?: number; // in hex widths
}

export interface Npc {
  name: string;
  title?: string; // "Keeper of the Wilds"
  text?: string; // a few lines about them, for their profile
  portrait: string; // square face crop, in public/
  art?: string[]; // their images, in public/; the first is shown first. Thumbnails sit beside them as <name>.thumb.webp
  point: string; // where they live; going to them lands you next to them
  lines: string[];
  figure?: Figure;
}

export interface Player {
  portrait?: string;
  art?: string[];
  figure?: Figure;
}

export interface World {
  map: MapImage;
  lands: LandPin[];
  start?: string; // the land a new game opens on
}

export interface Content {
  world: World;
  lands: Record<string, Land>;
  points: Record<string, Point>;
  terrain: Record<string, Terrain>;
  props: Record<string, Prop>;
  items: Record<string, Item>;
  npcs: Record<string, Npc>;
  player: Player;
}

export interface Cell {
  r: number;
  c: number;
  t: string; // terrain id
  p: string | null; // prop code
  key: string; // "point:r:c", stable across days
}

export interface GameState {
  version: number;
  point: string | null; // where you are; null until you first enter a point
  pos: string | null; // cell key inside that point
  visitedLands: Record<string, true>; // lands whose opening has played once
  energy: number;
  lastRegen: number; // ms timestamp the next energy is counted from
  day: number;
  toolTier: number;
  bag: Record<string, number>; // item id -> count
  depleted: Record<string, true>; // nodes used up today
  beaten: Record<string, true>; // enemies beaten today
  taken: Record<string, true>; // secrets taken, for good
  revealed: Record<string, true>; // hidden things found
  seen: Record<string, Record<string, true>>; // fog: point -> cells seen
  rested: boolean;
  talk: Record<string, number>; // npc -> lines heard so far
  log: string[];
  seq: number; // messages said so far; the UI shows a new one when this changes
}

export interface Action {
  id: string;
  label: string;
  cost: number; // energy
  disabled?: string; // why it can't be done right now
  run: (now: number) => void;
}
