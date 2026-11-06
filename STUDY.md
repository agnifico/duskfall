# Study sheet

Things this project used, to study at the end. It's a running list: new entries get added as we build.

Written for: comfortable with code in general, intermediate in UI and web design, new to game programming and game design. So it skips general coding and spends its words on graphics, game programming and design.

★ = start here · ★★ = once the ★ items are clear

## Graphics and rendering
| | Topic | In one line | Where we used it |
|---|---|---|---|
| ★ | World space vs screen space | Everything lives in one map coordinate system; the camera converts it to screen pixels. | Pins keep their map position at every zoom. |
| ★ | Camera (view) transform | `screen = (map − camera centre) × zoom + screen centre`. Panning moves the centre; zooming changes the multiplier. | Zoomable land map. |
| ★ | Level of detail (LOD) | Draw whichever version has enough detail for the current zoom; switch versions as you zoom. | Detail patches over the land map. |
| ★★ | Image pyramids, mipmaps, tiles | The same image stored at several resolutions, cut into tiles, so only on-screen tiles at the right level get loaded (Google Maps, games' textures). | The model our two-level map is a small version of. |
| ★ | Alpha blending and crossfades | Mixing two images by opacity; fading one in over a range hides the switch. | Patch fade-in between two zoom levels. |
| ★★ | Feathered masks | Soft transparency at an image's edge so it blends into what's under it. | Patch edges. |
| ★ | Painter's algorithm (depth sorting) | Draw back to front so nearer things cover farther ones. | Hex tiles, then objects, sorted by how far down the screen they sit. |
| ★ | Isometric and axonometric views | A tilted, fixed camera with no perspective; done by rotating and squashing a flat layout. | The hex field: vertical squash, plus the angle slider. |
| ★ | Sprite sheets and texture atlases | Many images in one file, cut out by position. | Grok sheets → `tools/cut_sheets.py`. |
| ★★ | Cutting sprites that overflow their cell | When an object spills past its grid cell, cut from a larger window and keep only the piece whose centre lies in the cell, so a neighbour's stray pixels stay with the neighbour. | Sylvie's head, `OVERFLOW` in `tools/cut_sheets.py`. |
| ★★ | Chroma key, alpha matting, despill | Turning a coloured background into transparency, and removing the background colour bleeding into edges. | The magenta backgrounds; edge unmixing in the cutter. |
| ★★ | Premultiplied alpha | Why resizing transparent images naively gives dark or coloured fringes, and the fix. | The cutter resizes in premultiplied mode. |
| ★ | Outpainting with paste-back | Let the AI paint around an existing picture at low resolution, then paste the original back on top at full resolution with a soft edge, so the part that matters never changes. Hide the join in plain areas (open sea). | Growing the Nuvatra map: `tools/make_nation_canvas.py`. |
| ★ | Blending seams by distance | Instead of a hard mask, fade one image into another by distance from what must stay exact (here, the shore), so two different seas meet without a rim. | `keep_alpha()` in `tools/compose_nation.py`. |
| ★★ | Segmenting by colour, then connected components | Classify pixels (sea or not), clean up with morphology (opening, hole filling), then label the separate pieces and keep only the ones you want. | Keeping Nuvatra and the turtle, dropping the small islets. |
| ★★ | Template matching | Find how two images line up by sliding one over the other and scoring the match (normalised correlation), over a range of shifts and scales. | Checking the North Shore patch sits exactly on the base map (0.98). |
| ★ | Hiding a flaw with transparency | Where a layer has a blemish and the layer beneath shows the same thing, make the blemish transparent instead of painting over it. | The patch's watermark corner. |
| ★ | Lazy loading and viewport culling | Load or draw only what's on screen or about to be. | Patches load when needed. |
| ★ | 2D rotation | Turning points around a centre with sin and cos; the basis of turning the whole hex field. | The hex field angle slider (`ui/geo.ts`). |
| ★ | Back-face culling, in 2D | Draw only the sides that face the viewer (their outward direction points down the screen). | Hex sides at any angle. |
| ★ | Zoom around a point | Keep the map point under the cursor fixed while the scale changes. | Wheel and pinch zoom on the land map. |

## Game programming
| | Topic | In one line | Where we used it |
|---|---|---|---|
| ★ | Hex grid coordinates | Offset rows are easy to author; cube or axial coordinates make distance and neighbours easy to compute. | `engine/hex.ts`. Read: Red Blob Games, "Hexagonal Grids". |
| ★ | Pathfinding (Dijkstra, then A*) | Cheapest route over a graph whose steps have different costs. | Walking costs 1 or 2 per hex. Read: Red Blob Games, "Introduction to A*". |
| ★ | Seeded randomness | The same seed gives the same "random" results, so a day's rolls are stable and reproducible. | Daily node rolls (`engine/rng.ts`). |
| ★ | Real-time timers without ticking | Store a timestamp and work out elapsed time on demand, instead of counting every second. | Energy regen (`regen()`). |
| ★ | One state object, one direction of change | All game state in one plain object; the UI reads it, actions change it, then it saves. | `lib/game.svelte.ts`, `act()`. Read: *Game Programming Patterns* (Nystrom), free online. |
| ★ | Save versioning and migration | Saves carry a version, and old versions get upgraded or reset. | `lib/save.ts`. |
| ★ | Data-driven content | The world is data files the engine reads, so adding content means adding data, not code. | `content/` JSON. |
| ★ | Fog of war | Track what the player has seen; draw everything else as unknown. | Fogged points. |
| ★ | Pointer input: drag vs click, capture, pinch | One code path for mouse and touch; a few pixels of movement turns a click into a drag; two pointers make a pinch. | `ui/LandView.svelte`. |
| ★ | Tweening and easing | Animating a value from A to B over time, with a curve that starts fast and settles. | Flying to a zone when you tap its name. |
| ★ | Two-frame walk cycles and path tweening | Move a figure hex by hex along the route it took, alternating a standing and a mid-step frame; face it by the direction of each step. Cheap, and it reads as walking. | The player's figure in `ui/HexView.svelte`. |
| ★ | Mirroring sprites | Paint one facing and flip it with a transform for the other; asymmetric details swap sides, which rarely shows at small sizes. | Left/right facing. |
| ★ | Depth-sorting moving objects with static ones | Put the player into the same back-to-front list as the props each frame, sorted by where their feet are, so she passes behind trees and in front of houses. | `drawables` in `ui/HexView.svelte`. |
| ★★ | Anchor points for sprites | Where a sprite meets the ground, measured from its pixels; for figures, the centre of the legs, so frames with different poses don't jump. | `fx` in `tools/cut_sheets.py`. |
| ★★ | Pity timers (bad-luck protection) | The chance rises after each failure and resets on success, so nobody goes too long without a find. | Herblore, planned. |

## Procedural generation (the worldgen detour)
| | Topic | In one line | Where we used it |
|---|---|---|---|
| ★★ | Noise (Perlin, fBm, ridged) | Smooth randomness layered at several scales for natural shapes; "ridged" makes mountain crests. | `worldgen/gen.js`. Read: Inigo Quilez's articles. |
| ★★ | Domain warping | Bending the input coordinates with noise so shapes wander instead of looking like blobs. | Coastlines. |
| ★★ | Distance fields and transforms | For every pixel, the distance to the nearest edge; good for coasts, shores and depths. | Chamfer distance in `worldgen`. |
| ★★ | Hillshading, contours, hypsometric tints | How maps show height: light from one side, lines of equal height, colour by height. | The three worldgen views. |
| ★ | Authored vs procedural | Fully procedural worlds tend to look generic; author the big shapes, generate the detail. | Why worldgen kept the sketch's shapes. |

## Game design
| | Topic | In one line | Where we used it |
|---|---|---|---|
| ★ | Core loop | The cycle players repeat: adventure → home → adventure. | Energy for adventure; resources for home. |
| ★ | Energy systems | Real-time limits on play: they pace sessions and give "come back later" reasons. | 10⚡, one per 90 s (the Fallen Sword model). |
| ★ | Sources and sinks | Where resources come from and what uses them up; without a sink, gathering means nothing. | Nodes as sources; tools, home and quests as sinks. |
| ★ | Gating and progression curves | Tiers unlocked by tools or levels; reward per energy rises with tier. | Tree and rock tiers. |
| ★ | Fixed vs random spawns | Fixed nodes are something to plan around; random finds reward walking. | Nodes vs herblore. |
| ★ | Rewarding discovery | Reward the first time over the hundredth. | World Resonance (Dawn's Journey). |

## UI and CSS
| | Topic | In one line | Where we used it |
|---|---|---|---|
| ★ | Design tokens as CSS custom properties | Colours and sizes named once (`--u`, `--face`, `--ink`), and every component reads them. A tone class just swaps the variables. | `ui/px.css`. |
| ★ | Outlines with chained `drop-shadow()` filters | Four one-unit shadows in four directions trace any shape's outline, including cut corners; a fifth makes the hard shadow. This is a morphological dilation done by the browser. | Every `.px` surface. |
| ★ | Painting the face on `::before` | `clip-path` would cut off an element's own filter and shadow, so the face lives on a pseudo-element that can be clipped by itself. | Bevelled panels, shield pins. |
| ★★ | Stacking contexts | `filter` and `isolation: isolate` make a new stacking context, which is what lets a `z-index: -1` pseudo-element sit behind the content but still inside its box. | `.px::before`. |
| ★ | `clip-path: polygon()` | Cutting shapes from a box: stepped pixel corners, shields. | `.bevel`, `.shield`. |
| ★★ | 9-slice frames (`border-image`) | The classic alternative for pixel UI: one small image whose corners stay fixed while its edges stretch. Worth knowing when a frame has detail CSS can't draw. | Not used; the comparison point. |
| ★ | Pressed-state affordance | A button sinks by its lip height and loses its shadow, so a press reads as physical. | `.px.btn:active`. |
| ★ | Bitmap fonts at whole-pixel sizes | Pixel fonts stay crisp only at sizes where each font pixel lands on whole screen pixels; font smoothing off. | Silkscreen 8/12/16 px, Jersey 10. |
| ★ | Deriving UI events from state changes | Compare the bag before and after an action and animate the difference, so the rules never call the UI. | `act()` in `lib/game.svelte.ts` → `hud/Gains.svelte`. |
| ★ | Svelte transitions and keyed blocks | `in:`/`out:` animate elements as they appear and leave; `{#key}` remounts a block so its animation replays. | Event card, bag bump, messages. |
| ★ | One input path for hotkeys and buttons | Both call the same command, so they can't disagree; keys are ignored while typing. | `ui/commands.ts`. |
| ★ | Overlay hit-testing (`pointer-events`) | A full-screen HUD that only its boxes can be clicked through, so the map underneath still takes drags and clicks. | `.hud` in `app.css`. |
| ★ | Theming with CSS variables | A theme is a set of variables on the root element; components only ever read variables, so switching a theme restyles everything at once. | Meadow, Harvest, Arcade, Forest in `ui/px.css`. |
| ★★ | `color-mix()` and derived palettes | Shades and highlights computed from a base colour and the theme's ink, so a palette needs only a few hand-picked colours. Mixing in `oklab` keeps the steps even. | `.px` shades. |
| ★ | Overlay navigation | The map opens over the play screen instead of replacing it, so closing it returns to the exact same state. The opened layer is UI state; where the player is stays game state. | `UI.map` vs `G.s.point`. |
| ★ | Letterboxing, and avoiding it | When an image and a screen have different shapes, either crop it (cover), fit it with bars (contain), or fit it and dress the leftover space. Here: anchored right, edges faded into a matched colour. | Land and world maps. |
| ★ | Feathered masks | `mask-image` gradients make an image's edges fade out instead of ending in a hard line. | `.edge-fade`. |
| ★ | First-run experiences | Play the long version once (tracked in the save), then a short version every time after. | A land's opening animation. |
| ★ | Fit-to-space with `viewBox` | Draw at one fixed size, then let the SVG's `viewBox` scale it to whatever box it's given; crop the `viewBox` to the content's real bounds so no space is wasted. Bounds use everything that could ever be drawn, so nothing jumps as it changes. | The hex field filling the space between the HUD's edges. |
| ★ | Animating with transforms only | Moving things with `transform` lets the GPU do it without repainting the screen; animating `background-position` or `left` repaints every frame. | Clouds, water, glints in `ui/Backdrop.svelte`. |
| ★★ | Seamless pattern loops | A repeating pattern slid by exactly one period along its own direction loops with no visible jump. | The water's moving light. |
| ★ | `prefers-reduced-motion` | Respect the system setting for less motion: stop decorative animations. | The backdrop. |
| ★ | Per-place art direction in data | Each point names its backdrop in its content file, so mood is authored alongside the layout. | `backdrop` in `content/points/*.json`. |
| ★ | Popovers that close on an outside click | Listen for pointer-down on the whole window (capture phase) while open, and close unless the press landed inside; Esc closes too. | The People list. |
| ★ | Thumbnails and lazy loading | Grids show small pre-made thumbnails and load the full image only when it's picked; `loading="lazy"` waits until a thumbnail scrolls into view. | Profile galleries (`<name>.thumb.webp`). |
| ★★ | Attract mode / title states | A first screen that shows the world and nothing else, and gives way to the UI on the first input. | The land map's opening. |

## Tools
| | Topic | In one line |
|---|---|---|
| ★ | Svelte 5 runes | `$state` (reactive data), `$derived` (computed from it), `$effect` (side effects). Deep reactivity on plain objects. |
| ★ | Vite | Dev server; `public/` for static files; `import.meta.glob` to load every file in a folder. |
