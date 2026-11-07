# UI pass: Agni's list (2026-11-07)

**Done (2026-11-07):** enemy cards, turning the field, the Character and people pages (Profile and Images tabs), the bottom-left UI toggle, the expandable menu, HP/Spirit/Energy at the bottom centre. **Left:** tile detailing, the small versions of pages, the mobile pass.

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

## Mobile pass
- Readable on a phone; the hotbar may go vertical. Deferred, "very detailed".
