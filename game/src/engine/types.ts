// Plain data shapes. The engine never imports Svelte or touches the DOM.

export interface Terrain {
  name: string;
  colour: string;
  height: number; // steps of elevation, drawn as a taller hex side
  cost: number | null; // energy to step onto it; null = can't walk there
}

/** A gather's extra: given on top, this often. */
export type Bonus = { item: string; chance: number };

/** A daily quest: a person offers a few from their pool each day. Beat `kill` (counted from when you take it)
 *  or bring `bring` (taken when you hand it in), then hand it in to them for `reward`. */
export interface Errand {
  id: string;
  title: string;
  ask: string; // what they say when offering it
  thanks?: string; // what they say when you hand it in
  kill?: { kind: string | string[]; n: number; at?: string[] }; // "*" is any enemy
  bring?: { item: string; n: number };
  reward: Effect[];
  opens?: Cond; // offered only once this holds
}

export type PropType = 'node' | 'enemy' | 'secret' | 'npc' | 'rest' | 'fire' | 'look' | 'exit' | 'start';

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
  skill?: string; // the life skill it trains (lifeskills.json)
  xp?: number; // skill XP per gather; by its size (rules.ts › NODE_XP) if missing
  need?: number; // skill level needed to gather it; by its size if missing
  verb?: string; // "Chop", "Mine"
  item?: string; // item id. Also what an enemy drops and what a secret holds.
  yield?: number | [number, number]; // how many per gather: fixed, or a range
  cost?: number; // energy per gather; COST.gather if missing
  extra?: { item: string; amount: number }; // always given as well (ore veins also give stone)
  bonus?: Bonus | Bonus[]; // sometimes given as well (birch bark, acorns): one, or several rolled apart
  spent?: string; // sprite shown once used up today (stump, rubble); otherwise it fades

  amount?: number; // secret: how many of its item
  hidden?: boolean; // secret: invisible until found
  npc?: string; // npc: id in npcs.json
  foe?: FoeData; // enemy: how it fights
}

/** Fighting stats. Player's are in rules.ts; an enemy's in its prop's `foe.stats`. */
/** Which attack meets which defence. */
export type DamageKind = 'physical' | 'elemental';

export interface Stats {
  hp: number;
  patk: number; // physical attack: basic attacks, always (unless an infusion changes that, later)
  eatk: number; // elemental attack: spells, mostly
  pdef: number; // physical defence
  edef: number; // elemental defence
  spd: number; // tempo: actions per tick, against the player's speed
  eva: number;
  prc: number;
  crit: number; // chance, 0..1
  critDmg: number; // multiplier
}

/** Attack shapes on hexes, aimed from the attacker towards a target hex. */
export type Shape =
  | { shape: 'arc'; width: 1 | 3 } // the hex in front, or the 3 in front
  | { shape: 'line'; length: number } // straight along one of the six directions
  | { shape: 'area'; rings: number }; // every hex within `rings` of the attacker

export interface FoeData {
  /** Explicit stats. With a `level`, these override the curve (speed, evasion, precision usually); without
   *  one, they're the whole stat block (hp required). */
  stats?: Partial<Stats>;
  mult?: Partial<Stats>; // its type's character: scales the curve's stats (bear: hp 1.4; prowler: hp 0.75)
  drops?: Drop[]; // rolled one by one when it's beaten; the prop's `item` (always dropped) if missing
  res?: number; // World Resonance it asks for (not used yet)
  level?: number; // its place on the XP curve: beating it gives killXp(level) (rules.ts)
  xp?: number; // combat XP for beating it, overriding its level's; worked out from its stats if neither
  behaviour: 'still' | 'territorial'; // still: never moves or notices; territorial: chases within its notice range
  notice?: number; // territorial: rings it notices you within (default 1)
  attack: Shape;
}

/** One line of a drop table: `chance` (0–1) of `n` of `item`, or of one item picked from `oneOf`. */
export interface Drop {
  item?: string;
  oneOf?: string[];
  chance: number;
  n?: number | [number, number];
}

/** What an enemy will do on its next action, shown one tick ahead. */
export type Intent = { kind: 'move'; to: string } | { kind: 'attack'; hexes: string[] };

/** An enemy standing on the field. */
export interface Foe {
  id: string; // its spawn cell's key
  kind: string; // prop code
  pos: string; // cell key
  home: string; // where it spawned; territorial ones walk back here when they give up
  hp: number;
  charge: number; // speed banked towards its next action
  engaged: boolean; // after you
  level?: number; // rolled inside its point's level range; missing: its kind's own level
  riled?: boolean; // you hit it: it chases you anywhere on the point and never gives up (until a knockout)
  intent: Intent | null;
}

/** Something the UI shows for a moment: a number floating up (hit, crit, miss, hurt), a sword arc (slash),
 *  an attacker lunging towards a hex (lunge), a hex flashing red as an attack lands (flash), the player
 *  jumping from one hex to another (dash). */
export interface Fx {
  id: number;
  key: string; // cell it happens on
  text: string;
  kind: 'hit' | 'crit' | 'miss' | 'hurt' | 'slash' | 'lunge' | 'flash' | 'dash' | 'xp' | 'shot' | 'bolt';
  from?: string; // slash, lunge, shot: the attacker's cell
  phase: 0 | 1; // 0: your action; 1: the enemies' turn after it, shown a beat later
}

/** A skill: costs Spirit (and maybe ⚡), takes one tick. */
export interface Skill {
  name: string;
  icon: string; // emoji, shown when there's no badge
  badge?: string; // public/sprites/skills/<badge>.png
  text?: string;
  kind: 'dash' | 'attack';
  aim: 'self' | 'direction' | 'target'; // fires at once, pick a hex to aim at, or pick an enemy within `range`
  spirit: number;
  energy?: number;
  range?: number; // dash: hexes; target: reach
  refund?: number; // Spirit back when it lands (a staff's spell keeps itself going)
  shape?: Shape; // attack
  power?: number; // attack: damage multiplier per target
  damage?: DamageKind; // attack: physical if missing; spells will be elemental
}

export interface Item {
  name: string;
  sprite?: string; // "set/name" in sprites.json
  icon?: string; // emoji, used when there is no sprite
  text?: string;
  currency?: boolean; // counted in the top bar, not kept in the bag

  // gear (content/gear.json): worn in a slot, adds its stats
  slot?: Slot;
  level?: number; // combat level needed to wear it
  stats?: Partial<Stats>;
  set?: string; // sets.json: wearing enough pieces adds a bonus
  element?: string;
  twoHanded?: boolean; // main hand: the off hand stays empty…
  offhand?: string[]; // …except for these off-hand kinds (a bow allows a quiver)
  kind?: string; // weapon type: sword, axe, bow, shield…
  grants?: string[]; // skills you have while wearing it (a staff's Spark)
  range?: number; // main hand: basic attack reach in hexes; default by kind (rules.ts › WEAPON_RANGE), else 1
  placeholder?: boolean; // its numbers aren't set yet
  value?: number; // coins a shop pays for one; missing: shops won't buy it
  formula?: boolean; // its numbers came from the gear formula (engine/gearFormula.ts), not set by hand

  // food and potions: used from the bag (engine/actions.ts › useItem)
  use?: ItemUse;
}

/** What using an item does. Food can't be eaten in a fight; a potion can, and drinking it takes your turn.
 *  A buff lasts `minutes` of real time; one food buff at a time, and eating another replaces it. */
export interface ItemUse {
  kind: 'food' | 'potion';
  hp?: number;
  energy?: number;
  spirit?: number;
  buff?: { stats: Partial<Stats>; minutes: number };
}

/** A buff running on you, from food. */
export interface Buff {
  item: string;
  stats: Partial<Stats>;
  until: number; // ms timestamp
}

/** Where gear is worn. Relics have several slots (RELIC_SLOTS). */
export type Slot = 'head' | 'body' | 'hands' | 'legs' | 'feet' | 'main' | 'off' | 'relic';
export type WornSlot = Exclude<Slot, 'relic'>;

/** A gear set: names its bonuses by how many pieces you wear. */
export interface GearSet {
  name: string;
  profile?: 'heavy' | 'light' | 'arcane'; // how the gear formula leans its pieces (engine/gearFormula.ts)
  bonuses: { pieces: number; stats: Partial<Stats> }[];
}

/** What you're wearing: item ids, or null. Worn things leave the bag. */
export interface Worn {
  head: string | null;
  body: string | null;
  hands: string | null;
  legs: string | null;
  feet: string | null;
  main: string | null;
  off: string | null;
  relics: (string | null)[];
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

// ---------- quests and story (engine/story.ts, content/quests.json, design/QUESTS.md) ----------

/** A condition. Kills and talks count from when the stage began. */
export type Cond =
  | { talk: string } // you talked to this person (the stage plays when you do)
  | { enter: string } // you're in this point
  | { kill: string | string[]; n: number; at?: string[] } // beat n of these enemy kinds ('*' any), optionally only in these points
  | { have: string; n: number } // in your bag (not taken)
  | { level: number } // your combat level at least
  | { tag: string } // a story flag is set
  | { notTag: string }
  | { quest: string; state: QuestState }
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond };

/** What happens: after a stage's dialogue, or when a choice is picked. */
export type Effect =
  | { give: string; n?: number; wear?: boolean } // into the bag (and put on)
  | { take: string; n: number } // out of the bag
  | { xp: number }
  | { energy: number } // ⚡ back, up to the full bar
  | { tag: string }
  | { untag: string }
  | { goto: string; at?: string } // move to this point (a scene jump)
  | { spawn: { kind: string; n: number }[] } // enemies appear around you, already after you
  | { notify: string };

/** One step of dialogue. A string is a line: "sylvie: …", "you: …", or narration. {name} becomes your name. */
/** A dialogue step: a spoken or narrated line, the name list, a choice, or a picture. A picture fills the screen
 *  (with `text` as its caption, which can be spoken: "sylvie: …") and stays behind the lines after it until `{ "image": null }` or the beat ends. */
export type Line = string | { name: true } | { choose: { text: string; then: Effect[] }[] } | { image: string | null; text?: string };

export type QuestState = 'active' | 'done';

export interface QuestStage {
  objective: string; // for the tracker and the log
  need: Cond;
  /** Plays by itself the moment `need` is met (a story beat). Otherwise it plays when you talk to `who`. */
  auto?: boolean;
  who?: string; // the person this stage is with (talk stages; the tracker names them)
  say?: Line[]; // played when the stage completes
  remind?: Line[]; // played when you talk to `who` before `need` is met
  then?: Effect[]; // after `say`
}

export interface Quest {
  title: string;
  text: string; // for the log
  giver?: string;
  start: Cond; // starts by itself when met
  stages: QuestStage[];
  main?: boolean; // the main story (gold in the log)
}

/** Your place in one quest. */
export interface QuestProgress {
  state: QuestState;
  stage: number;
  count: number; // kills toward the current stage
  talked?: string[]; // people talked to during the current stage
}

/** A beat waiting to be shown: a stage's dialogue, whose effects apply when it ends. */
export interface Beat {
  quest: string;
  stage: number;
  lines: Line[];
  then: Effect[];
  finish: boolean; // completes the stage (false for a reminder)
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
  /** Rolled each 15-minute cycle. `place`: these always appear, each on a free hex of the given terrains (a set
   *  layout that still moves around). `table`/`count`: random ones on any free hex; repeat a code to weight it. */
  enemies?: { place?: { kind: string; on: string[] }[]; count?: [number, number]; table?: string[] };
  rows: string[]; // hex rows: terrain letter, then optionally "." and a prop code; "_" for no hex
  pad?: number; // rings of drawn-only padding around the field (default 2; 0 for none)
  opensWith?: Cond; // closed (on the map, and to travel) until this holds; the story opens it
  closedText?: string; // shown while closed ("Not yet")
  /** People the story stands here: on hex [row, col] while `while` holds (Sylvie on the beach until you've met). */
  people?: { npc: string; at: [number, number]; while?: Cond }[];
  /** The area's level range: its enemies roll at about your level (each kind keeping its lead over the area's
   *  easiest), never below their own level, never above the top. Missing: enemies keep their own levels. */
  levels?: [number, number];
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
  stats?: Stats; // once they can fight on your team
  shop?: { item: string; price: number }[]; // what they sell, for coins; anyone with a shop also buys things that have a `value`
}

export interface Player {
  names?: string[]; // the names you can choose from, all meaning dawn or morning; the first is the default
  skills?: string[]; // ids in skills.json, in hotbar order
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
  skills: Record<string, Skill>; // fighting skills
  lifeskills: Record<string, LifeSkill>;
  sets: Record<string, GearSet>;
  recipes: Record<string, Recipe>;
  quests: Record<string, Quest>;
  errands: Record<string, Errand[]>; // person -> their pool of daily quests
}

/** Something to make (content/recipes.json): uses up `needs`, gives `n` of `makes`. Free and instant for now. */
export interface Recipe {
  craft: 'cooking' | 'alchemy' | 'smithing';
  makes: string;
  n?: number; // made per craft, 1 if missing
  needs: Record<string, number>;
}

/** A gathering or making skill: woodcutting, mining… Levels come from XP (engine/progress.ts). */
export interface LifeSkill {
  name: string;
  icon: string; // sprite id
  text: string;
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
  name?: string; // the player's name, once they set one
  point: string | null; // where you are; null until you first enter a point
  pos: string | null; // cell key inside that point
  visitedLands: Record<string, true>; // lands whose opening has played once
  energy: number;
  lastRegen: number; // ms timestamp the next energy is counted from
  day: number;
  toolTier?: number; // unused: nodes are gated by skill level now (kept so old saves load)
  bag: Record<string, number>; // item id -> count
  depleted: Record<string, number | true>; // node cell -> the 15-minute cycle it was used up in (true: old saves, until the next day)
  beaten: Record<string, true>; // unused since enemies roll per cycle; kept so old saves load
  taken: Record<string, true>; // secrets taken, for good
  revealed: Record<string, true>; // hidden things found
  seen: Record<string, Record<string, true>>; // fog: point -> cells seen
  rested: boolean;
  talk: Record<string, number>; // npc -> lines heard so far
  log: string[];
  seq: number; // messages said so far; the UI shows a new one when this changes

  hp: number;
  spirit: number; // built by basic attacks, spent by skills; kept between fights
  hpAt: number; // ms timestamp the next HP is counted from
  restAt: string | null; // cell key of the last bed you slept in; knocked out, you wake there
  stoked: Record<string, number>; // campfire cell key -> when you last stoked it (ms)
  hotbar: (string | null)[]; // the quick slots, keys 1–6: "skill:dash", "item:seed-bread", or empty
  foes: Record<string, Foe[]>; // point -> enemies standing there this cycle
  foeRolls: Record<string, { cycle: number; rerolls: number }>; // point -> the cycle its enemies were rolled in, and rerolls used
  fx: Fx[]; // what the last action did, for the UI to float up
  xp: number; // combat XP; your level comes from it (engine/progress.ts)
  skills: Record<string, number>; // life skill -> XP
  worn: Worn;
  buffs: Buff[];
  quests: Record<string, QuestProgress>; // quests started (absent: not yet)
  errands?: { date: string; taken: Record<string, { count: number }>; done: string[] }; // today's daily quests (engine/errands.ts)
  tags: Record<string, true>; // story flags: choices made, beats seen
  beats: Beat[]; // story beats waiting to play (kept in the save, so a reload replays them)
  fxSeq: number;
}

export interface Action {
  id: string;
  label: string;
  cost: number; // energy
  disabled?: string; // why it can't be done right now
  run: (now: number) => void;
}
