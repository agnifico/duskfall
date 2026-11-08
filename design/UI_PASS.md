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

## Mobile pass
- Readable on a phone; the hotbar may go vertical. Deferred, "very detailed".
