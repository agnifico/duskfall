# UI pass: Agni's list (2026-11-07)

**Done (2026-11-07):** enemy cards, turning the field, the Character and people pages (Profile and Images tabs), the bottom-left UI toggle, the expandable menu, HP and Spirit at the bottom centre (narrow); Energy as a long strip in the top bar, always shown (2026-11-07). Tile detailing done in code (`ui/ground.ts`, fog of war, padding). **Left:** tile detailing, the small versions of pages, the mobile pass.

Done piece by piece, every corner of the game. Systems first, fine-tuned numbers and art later.
The component checklist is `UI_COMPONENTS.md`; this is the list of changes asked for.

## The hex field
- **Tiles that read:** detail and effects on tiles so you can tell at a glance what you can walk on, what you can't (deep water vs shallows), and what's hidden (fog). A full session of its own; Claude proposes the look.
- **Turning the field** is part of the game, not a dev setting. When turned, the field may run past the screen's edges rather than shrink to fit.
- **Enemy cards in a fight:** each engaged enemy's name, icon and a mini HP bar, somewhere on screen.

## Panels
- **Character** (from the portrait, top left): details and stats at the top. Later it also holds inventory and gear. The images move to a separate page.
- **People's profiles** (Sylvie and others): the same layout, details and stats at the top, then the images.
- Most things get two forms: a full page, and a small version over the field.

## HUD layout
- **Bottom-left button:** one toggle that shows and hides the UI (it's a second Bag button today). On mobile it becomes the central button that expands the others.
- **Bottom-right menu:** inside an expandable menu, like the map corner: collapse it, expand it, or keep it expanded.
- **Move Energy and Spirit to the bottom** (bottom centre, or wherever there's room) once space frees up. Things that change every action or second sit at the bottom; top-level things (time, breadcrumb, currency) stay at the top.

## Inventory and gear (Agni, 2026-11-08)
- **A full Inventory page**, separate from the profile panel and the small bag (B): modelled on Dawn's Journey's screen. Left: portrait, vitals, level and XP, the full stat grid. Middle: worn gear and set bonuses. Right: the bag with category tabs (materials, weapons, armour, relics) and filters, an item detail panel, and Equip; swap freely.
- **Comparison, on that page only:** picking an item shows each stat against what you wear in that slot: higher in green (a green highlight, mark or plus), lower in red.
- **The small bag (B)** stays simple: All / Materials / Gear tabs (done), and item details that read well (done 2026-11-08: darker text, more room, stats with their icons).
- **Stats always with their icon** wherever there's room: there are ten, and the icons are how players learn them. Names in title case (Elemental Attack).
- **Profile › Stats, redesigned:** Health as a strip across both columns, then Spirit across both; then pairs: Physical Attack | Physical Defence, Elemental Attack | Elemental Defence, Crit Rate | Crit Damage, Evasion | Precision; Speed last, alone in one column. The profile's Gear tab gets the same care.

## For the next large UI pass (Agni, 2026-11-08)
- **Profile › Gear** should take the Inventory's form and structure: the same doll, stat sheet and set layout. For now it shows item details on hover (useful mid-fight, when the Inventory can't open) and a click opens the Inventory.
- **Drag and drop on touch** (mobile pass): dragging from the bag grid fights the grid's scrolling on phones.

## Menu (Agni, 2026-11-08)
- The bottom-right menu holds Bag and Inventory (plus Crafting, Quests, Map, Settings). **Profile has left it.** The portrait (top left) and C still open the profile panel.
- **Profile, later:** one extended, detailed page with everything about you (stats, gear, skills, and more), built once its pieces exist. It would be a screen.

## Screens and overlays (decided 2026-11-08)
- **Overlays** are quick looks over the field: the bag (B), the profile, people's profiles, Settings.
- **Screens** are full pages for deep work, in place of the field: the Inventory (I) now; crafting, homestead and skill pages later. The URL follows (`#/inventory`), Esc goes back, and screens can't be opened during a fight. The field stays mounted underneath, hidden, so coming back is instant (`UI.screen`, `openScreen` in `ui/commands.ts`).

## Mobile pass
- Readable on a phone; the hotbar may go vertical. Deferred, "very detailed".
