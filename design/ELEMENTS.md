# Elements

Brainstormed and agreed with Agni, 2026-11-09. Rules in code: `game/src/engine/elements.ts`; what the UI says:
`game/src/ui/elementInfo.ts`; the panel: Elements (L).

## The chart (phase A: built)

Six elements: **Fire, Water, Earth, Air, Light, Dark.**

- **The loop:** Water beats Fire (puts it out), Fire beats Earth (melts rock, burns plants and beasts), Earth beats
  Air (the immovable object), Air beats Water (scatters it).
- **Opposites are neutral:** Water and Earth, Fire and Air.
- **Light and Dark beat each other.** Neutral to the four.
- **Fire, Water and Earth resist themselves.** Air, Light and Dark don't (×1 on themselves).
- **Strong ×1.5, weak ×0.75.** Not Dawn's Journey's ×2 / ×0.5: you can't swap weapons mid-fight, so a bad
  matchup at ×0.5 would just be a slog.

## Your element (phase A: built)

- **You choose it.** First at **Heidi's Gift** (her infusion wakes your element; the Elements panel opens by
  itself), then **free once a week** (re-attuning). Until then you have none.
- **It's yours, not your gear's** (like Genshin: a weapon called Aqua-something doesn't make a character water).
  **You attack and defend as it:** it scales your elemental damage (spells, and the infusion's extra hit on basic
  attacks), and enemies' blows carry their element against yours. Plain physical blows of yours carry none.
  *(Decided 2026-11-09, replacing a first idea where armour set the element you defend as: two sources of element
  was one too many, and it would have needed six elemental sets at every tier.)*
- **Gear is themed loosely.** Neutral armour (Traveller's, Padded, Iron, Silversteel) for everyone. An elemental
  set's effect works only for a player of its element, so no element's set is simply better. A themed weapon will
  strengthen its element's skills; it never changes your element.
- **Enemies can have two elements** (the dragonling: Fire and Air). A matchup with them is **the average** of the
  two, so it stays between ×0.75 and ×1.5.
- Shown: your element over the health bar; enemies' elements on their cards and hover label, with ▲ when your
  elemental hits land hard and ▼ when weak.

## Elemental gear (phase A: set effects built)

Elemental gear leans stats toward the element's play style and gives a full-set effect (five pieces), for a
player of that element only:

| Element | Play style | Full set |
|---|---|---|
| Fire | All offence, little utility | Elemental damage +15% |
| Water | Sustain: healing, wearing down | Each elemental hit that lands heals 3% of your health |
| Earth | Defence turned into attack | Elemental attack +10% of your physical defence |
| Air | Moving and dodging; weaker on paper | Dash costs half the Spirit, reaches one hex further |
| Light | Precision | *(no set yet; crit chance)* |
| Dark | Heavy blows | *(no set yet; crit damage)* |

## Alignments (phase B: with the Skills phase)

A branch within your element, picked with level-up points; it decides which skills you get. Each one changes at
most **one** thing on the chart, at ×1.25, so the chart stays readable.

| Element | Alignments |
|---|---|
| Fire | **Blaze** (primal fire) · **Lightning** (fire at its hottest; think Avatar) |
| Water | **Flowing** (healing; the full edge over Fire) · **Frost** (control; not weak to Air, but loses its edge on Fire) |
| Earth | **Terra** (rock: not weak to Fire) · **Flora** (plants: extra weak to Fire, but beats Water) · **Fauna** (beasts: tracking and hunting) |
| Light | **Radiant** (the source) · **Dusk** |
| Dark | its own source alignment · **Dusk** |
| Air | none: air is fluid. Makes up for it with the widest skill choice and the most dodging |

- **Dusk** is where Light and Dark meet: the same alignment from either side. A Light player in Dusk gets a little
  Dark, and the other way round. Flavour, not a counter (×1 between them). Named for the game.
- **Fauna** plays the tracker, tied to fog and searching: echolocation (reveals fog), scent (enemies in fog),
  predator's mark (a marked enemy takes more), stillness (go unnoticed for some ticks), later pack call (a beast
  ally; needs summons).
- The Theos swords of Ice, Lightning and so on are story pieces (Agni wires them in the story).

**Open (Gear phase):** elemental sets exist at two tiers now. Either they scale (reforge one at a smith to your
level, same look, costs materials) or new tiers come at 40 and 60.

## Re-attuning and the skill tree (phase B)

- Free once a week. A reset means **rebuilding your skill tree** (Assassin's Creed Odyssey): the bother of it is
  why nobody re-attunes every fight.
- Facing a week of bad matchups? Do the things you're strong at first; try again next week.

## Mastery (phase C)

- One per element. Grows from **elemental damage dealt, scaled by the enemy's level** (not kills: no farming weak
  enemies).
- **Never lost on re-attuning.** Re-attuning is what makes it work: a month in Water leaves you with Water mastery.
- Each mastery level gives a **small permanent perk you keep in every element** (e.g. Water mastery 5: take 5%
  less from Fire). That's how "better tools against what you're weak to" works.

## Enemy elements (first pass, adjust freely)

crab, riled crab, toxolotl, riled toxolotl, punching tortoise, crabscallion, vanguard siren, aquamech shark: Water ·
boar, bear, biceon, boaring captain, Verona: Earth · forest prowler: Air · mountain basilisk,
coral eyes: Dark · dragonling: Fire + Air · Solis sentinel: Light (the Saints' sun).
