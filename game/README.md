# Nuvatra (working title)

Svelte 5 + TypeScript + Vite. No server: saves live in the browser.

```
npm install      # once
npm run dev      # http://localhost:5181
npm run check    # types
npm run build    # static site in dist/
```

## Terms

| Level | Term | What it is | Example |
|---|---|---|---|
| 1 | **World** | The atlas of every land. | The world map |
| 2 | **Nation** | One painted map you can zoom: the unit of land, even where it isn't a nation in the story. In code it's a `land`. | Nuvatra |
| 3 | **Zone** | A named area of a nation. Not a screen of its own: the nation map shows zone names zoomed out, and their points zoomed in. | North Shore |
| 4 | **Point** | A place you enter: a small field of hexes you walk around. | Arrival Beach |

Inside a point: a **hex** is one tile. A **node** is something you gather (tree, boulder, vein). A **prop** is anything standing on a hex (node, person, chest, way out).

On screen: the **top bar** (your portrait, energy and its timer, chips for time, where you are and coins, the map corner). Under the portrait, **People** opens a list of everyone you can go to (free, from the field or the map); a name or face opens that person's **profile** (their images, who they are). Your portrait opens yours. The **event card** (right) shows what's on your hex. The **gather prompt** (bottom centre) gathers the node you're on. The **bag** button and **quick slots** are bottom left; the bag opens on the right. The **menu** is bottom right.

**The map** opens over the hex field (M, or the map in the top-right corner) and closes back to exactly where you were (M again, Back, or Esc). It switches between your nation and the world. Picking a nation on the world map shows its **title screen**; the opening animation plays only on a nation's first visit. Clicking a point's pin travels there (free); clicking your own point just closes the map.

Hotkeys: G gather · F search · B bag · P people · Q quests · C character · M map · S settings · T colour theme · ← → flip a profile's images · Esc back.

**Colour themes** (Settings, or T): Meadow, Harvest, Arcade, Forest. They live in `src/ui/px.css`: each theme sets a face and text colour per tone (the shadows and highlights are mixed from those), plus its sky, sea and cloud colours for the hex field's backdrop.

The **breadcrumb** in the top bar is clickable: World and the nation open those maps, the zone opens the nation map at that zone, and your own point takes you back to the hex field.

## Layout

| Folder | What |
|---|---|
| `src/engine/` | Rules and state: plain TypeScript, no Svelte. `actions.ts` is everything the player can do; `rules.ts` has the shared numbers. |
| `src/content/` | The world as data: `world.json`, `lands/`, `points/` (one file per point), `props.json`, `items.json`, `terrain.json`, `npcs.json`. `sprites.json` is written by `../tools/cut_sheets.py`. |
| `src/lib/` | Reactive state. `game.svelte.ts` holds the game (every change goes through `act()`, which saves and animates bag gains); `ui.svelte.ts` holds UI-only state: open panel, open map, animations; `save.ts` handles saves and upgrades old ones. |
| `src/ui/px.css` | The retro surface system and the colour themes: faces, lips, outlines, bevels, pressed states, tones, type. Start here to restyle. `themes.ts` lists the themes. |
| `src/ui/hud/` | Everything drawn over the maps. `Hud.svelte` decides what shows where. |
| `src/ui/panels/` | Bag, Quests, Character, Settings. |
| `src/ui/placeholders.ts` | Stand-ins (active quest, time of day, player) until their systems exist. |
| `public/` | Map art, portraits, cut sprites, fonts. |

## Adding content

- **A point:** add a file to `src/content/points/` whose `zone` is one of a land's zones. In `rows`, each hex is a terrain letter, optionally followed by `.` and a prop code: `g.birch`. `*` is a slot that rolls from the point's `table` each day; `>` is the way in and out. `backdrop` is what surrounds the field: `sky` (default; it floats, clouds drift below) or `sea` (open water around a coast).
- **A node:** an entry in `props.json` with `type: "node"`. `item` and `yield` (a number, or `[min, max]`) are what it gives; `cost` is energy per gather; `tier` is the tool tier it needs. `extra` is always given as well; `bonus` is a chance of something extra. `spent` is the sprite it shows once used (stump, rubble).
- **An item:** an entry in `items.json`. `sprite` is `set/name` from `sprites.json`; `icon` is an emoji fallback.
- **Sprites:** put the sheet in `../extras/`, add it to `SHEETS` in `../tools/cut_sheets.py`, and run it (see that file). `size` on a prop is its width as a share of a hex's width; `dx` and `dy` nudge it, in hex widths.
- **A character's art:** put their images in a folder in `../extras/` (with `avatar.jpg`, `full.jpg` and `side.jpg` among them) and run `../tools/import_character_art.py <folder> <id> --portrait X,Y,SIZE [--player]`. It makes a square portrait (the face crop of `avatar.jpg`), covers Grok's watermark on every image, makes thumbnails, and sets `portrait` and `art` on the character in `npcs.json` or `player.json`. `title` and `text` in `npcs.json` fill the profile.
- **Figures:** a character's figure on the hex field is `figure: { stand, walk }` (sprite ids, painted facing right; the game mirrors them to face left) in `npcs.json`, or in `player.json` for the player. `height` is in hex widths (default 1.25).
- **Growing a nation's map:** `../tools/make_nation_canvas.py` makes Gemini's input (the current map in place on a bigger sea, with shapes for new islands); after Gemini paints around it, `../tools/compose_nation.py <result>` pastes the original back at full size and moves every pin, zone label and patch by the offset (once).

Mistakes in content files are logged to the browser console, and the game runs around them.
