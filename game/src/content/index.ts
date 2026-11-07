// Loads the content files. Adding a point = adding a JSON file to points/ whose zone is in a land.

import type { Content, Figure, Item, Land, Npc, Player, Point, Prop, Skill, Terrain, World } from '../engine/types';
import world from './world.json';
import terrain from './terrain.json';
import propsRaw from './props.json';
import items from './items.json';
import npcs from './npcs.json';
import player from './player.json';
import skills from './skills.json';
import spritesRaw from './sprites.json';

const landFiles = import.meta.glob<Land>('./lands/*.json', { eager: true, import: 'default' });
const pointFiles = import.meta.glob<Point>('./points/*.json', { eager: true, import: 'default' });

const lands: Record<string, Land> = {};
for (const l of Object.values(landFiles)) lands[l.id] = l;

const points: Record<string, Point> = {};
for (const p of Object.values(pointFiles)) points[p.id] = p;

const props: Record<string, Prop> = {};
for (const [code, p] of Object.entries(propsRaw as unknown as Record<string, Omit<Prop, 'code'>>)) props[code] = { ...p, code }; // JSON reads [5, 8] as number[], not a pair

export const content: Content = {
  world: world as World,
  lands,
  points,
  terrain: terrain as Record<string, Terrain>,
  props,
  items: items as Record<string, Item>,
  npcs: npcs as Record<string, Npc>,
  player: player as Player,
  skills: skills as unknown as Record<string, Skill>,
};

/** The points in each zone, in file order. */
export const pointsByZone: Record<string, Point[]> = {};
for (const p of Object.values(points)) (pointsByZone[p.zone] ??= []).push(p);

/** Cut sprites, written by tools/cut_sheets.py. bx, by: where the object meets the ground, as fractions.
 *  fx: the centre of its bottom third, which for a figure is between its legs. */
export interface Sprite {
  file: string;
  w: number;
  h: number;
  bx: number;
  by: number;
  fx?: number;
}
export const sprites = spritesRaw as Record<string, Sprite>;

/** URL for a file in public/. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

// Content mistakes are logged, not fatal: the game still runs around them.
const zoneIds = new Set(Object.values(lands).flatMap((l) => l.zones.map((z) => z.id)));
const itemIds = new Set(Object.keys(content.items));
for (const l of content.world.lands) if (!l.locked && !lands[l.id]) console.warn(`world: land ${l.id} has no file in lands/`);
for (const p of Object.values(points)) {
  if (!zoneIds.has(p.zone)) console.warn(`point ${p.id}: zone "${p.zone}" is not in any land`);
  for (const code of p.table) if (!props[code]) console.warn(`point ${p.id}: unknown prop "${code}" in its table`);
  for (const code of p.enemies?.table ?? []) if (!props[code]?.foe) console.warn(`point ${p.id}: "${code}" in its enemies isn't an enemy`);
  for (const row of p.rows)
    for (const tok of row.trim().split(/\s+/)) {
      const dot = tok.indexOf('.');
      const t = dot < 0 ? tok : tok.slice(0, dot);
      const code = dot < 0 ? '' : tok.slice(dot + 1);
      if (!content.terrain[t]) console.warn(`point ${p.id}: unknown terrain "${t}"`);
      if (code && code !== '*' && !props[code]) console.warn(`point ${p.id}: unknown prop "${code}"`);
    }
}
for (const p of Object.values(props)) {
  for (const s of [p.sprite, p.spent]) if (s && !sprites[s]) console.warn(`prop ${p.code}: no sprite "${s}"`);
  for (const id of [p.item, p.extra?.item, p.bonus?.item]) if (id && !itemIds.has(id)) console.warn(`prop ${p.code}: unknown item "${id}"`);
}
for (const id of content.player.skills ?? []) if (!content.skills[id]) console.warn(`player: unknown skill "${id}"`);
for (const [id, it] of Object.entries(content.items)) if (it.sprite && !sprites[it.sprite]) console.warn(`item ${id}: no sprite "${it.sprite}"`);
const figures: [string, Figure | undefined][] = [['player', content.player.figure], ...Object.entries(content.npcs).map(([id, n]): [string, Figure | undefined] => [id, n.figure])];
for (const [who, f] of figures)
  for (const s of [f?.stand, f?.walk]) if (s && !sprites[s]) console.warn(`${who}'s figure: no sprite "${s}"`);
