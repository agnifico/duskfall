# Roadmap: from surface area to a playable slice

Written 2026-11-08, at the end of the tiles, HUD and art session. Lines marked *(proposal)* are suggestions not yet confirmed. Section 4 lists what has to be decided before the slice can be built.

---

## 1. Approach: stop widening, connect what exists

Most systems now exist in a first form: the hex map, tiles, combat, gathering, gear, icons and the HUD. The next step is to connect them, not to start more. That means a **vertical slice from level 1 to 15**, playable end to end across the five existing locations. Each step of the slice should have:
- enemies to fight
- quests to do
- drops to collect
- gear to wear
- food to eat
- a gate that unlocks the next location

Polish art and UI one area at a time, and only once that area plays well. Past projects stalled on visuals before the systems were done, so this order matters.

## 2. Order of work (one person, five departments)

1. **Core loop and pillars.** Mostly done: explore, gather, fight, gear up.
2. **Progression spine.** Levels → locations → enemies → drops → gear → gates. **This is next.**
3. **World and story skeleton.** Done alongside the spine, not before it. It needs who, why and the main beats per region: enough for quests to have reasons and locations to have a place. Full writing comes later.
4. **Content.** Enemies, quests, map layouts, food and items, placed to fill in the spine.
5. **Balancing.** Play it, read the telemetry (gains and drops are already logged), tune the numbers.
6. **Art and UI polish,** per area.

## 3. Progression *(proposal)*

| Location | Levels | Enemies | Leave with |
|---|---|---|---|
| Arrival Beach + Sylvie's home | 1–5 | crab, boar, and a tougher crab or boar at L4–5 as the gate check | Traveller's set, Sylvie's quest, a first weapon |
| Open Plains (unlocks at 5) | 5–9 | toxolotl, a plains enemy, boar variants | Padded leather |
| Pine Grove | 9–13 | forest prowler, bear | Iron |
| The Drill (capstone) | 13–15 | dragonling, a boss | Silversteel, or the first elemental pieces |
| Mountains, swamp edge | 15–20 | candidates: mountain basilisk, punching tortoise, white wyvern | |
| Eastern Hills, mountain cave (an NPC appears) | 20+ | | |

- **Levels 1–5:** Sylvie's quest plus the beach and home enemies take you to level 5. Two enemy types for five levels gets repetitive, so a tougher variant makes level 5 feel earned.
- **Pine Grove before the Drill:** the bear and prowler belong mid-slice, and the Drill works as the level 15 capstone.
- **Later enemies:** 15 of Dawn's Journey's enemies are already cut (`sprites/djv2/`). Candidates for the rows past level 15: siren and shark for the coast, sentinel for the Drill, wyvern for the hills.
- **Exhaustive location list:** still to write. It should cover every location the game will eventually have, built or not, each with its levels and enemies. That table becomes the reference for what drops where.

### Gear by level
- **The conflict:** the agreed armour ladder (Traveller 1, Padded 10, Iron 20, Silversteel 30…) gives the 1–15 slice only two sets.
- **Proposal:** compress the early ladder to Traveller 1, Padded 5, Iron 10, Silversteel 15, so the first hours bring regular upgrades. The table above assumes that.
- **How gear is obtained** *(proposal)*: each enemy drops pieces of one set, at about 25%. Drops favour pieces you don't own yet, and the material drop (shell, hide) stays as well. Players learn where each set comes from and farm it deliberately before a harder area.
- **Weapons** come from quests. The player starts with one Traveller's weapon so the main hand isn't empty.
- **Relics** stay rare: from bosses and secrets.
- **Later:** crafting from mined ore, which suits the ore tiers (silver ore for Silversteel, malachite for Adamantine).

## 4. Decisions to make, roughly in order

1. **Level pacing:** how long one level takes, in kills, quests and minutes. Most other numbers follow from this.
2. **How locations unlock:** level, quest, or an exploration stat like Dawn's Journey's World Resonance.
3. **Armour ladder:** compress the early tiers (section 3) or keep 1/10/20/30.
4. **Gear sources:** one set per enemy (proposal), shared loot tables, or crafting. Possibly drops now and crafting later.
5. ~~**What food is for.**~~ Decided 2026-11-08: food restores HP, ⚡ or Spirit, or gives a flat combat buff (strong early, weak later).
6. **Story skeleton:**
   - why she washed ashore
   - what she wants by level 15
   - Sylvie's part in it

   One paragraph each.
7. **Which quests give which weapons.**

## 5. Queued tasks (small, already agreed)

- **Fog of war:** when an enemy attacks you, clear the fog around it. Enemies attacking from inside fog feels unfair.
- **Gear data:**
  - ~~add `gear.json` entries for the 36 weapons~~ Done 2026-11-08 (Traveller's numbers working, the rest placeholders). Shields and quivers are off-hand; bow and staff take both hands, and a bow allows a quiver. **Daggers are main-hand for now**: an off-hand dagger (dual wield, or with a special bow) is still to do.
  - replace each enemy's single `item` with a drop table
  - give the player a starting weapon
- ~~**Skill XP**~~ Done 2026-11-08: woodcutting, mining and foraging to level 5; level adds 10% to ranged yields.
- **Icon redo:** the Profile menu icon. The dark hood reads too shady; fix it with the next painted batch.

## 5b. Done 2026-11-08 (the editor and systems session)
- **Map editor** (dev mode, E): paint, tune props' foot points and shadows, save. Arrival Beach enlarged and laid out with it.
- **Combat level** from kills: +5 HP and +1 to all four attacks and defences per level. **Stats split** into physical and elemental attack and defence; basic attacks are always physical (`design/COMBAT.md`).
- **Gear:** slots head, body, hands, legs, feet, main, off, 4 relics; 123 pieces in `gear.json`, sets in `sets.json`; Gear tab on the profile, Wear in the bag.
- **Playtest log:** in dev, everything you spend, earn, fight and level goes to `game/playtest/<session>.jsonl`, to read after a playtest.

## 5c. Next, in order (Agni, 2026-11-08)
1. **The full Inventory page** (Dawn's Journey style), with gear comparison. Agni's notes: `design/UI_PASS.md` › Inventory and gear.
2. **Using items:** food and potions (a couple of each).
3. **Crafting interface**, surface level.
4. Then the slice decisions in section 4, starting with level pacing.

## 6. Art at hand

All sprites are cut into `game/public/sprites/` and listed in `game/src/content/sprites.json`. Sources live in `extras/sheets/<kind>/`; `tools/cut_sheets.py` cuts them.

| Set | Contents |
|---|---|
| `icons/` | painted UI icons: stats, menus, tools, life skills |
| `skills/` | combat skill badges (gold ring) |
| `lifeskills/` | adventure skill glyphs (the page draws the disc) |
| `gear/` | Traveller's, Padded, Iron and Silversteel armour, plus four relics (cloak, pouch belt, star belt, chain skirt) |
| `elem1/`, `elem2/` | lower and higher elemental tiers: five armour pieces and a bow per element |
| `relics/` | 15 relics, named by Dawn's Journey's relic ids |
| `weapons/` | 36 weapons, shields and quivers |

New art is generated on flat magenta (#FF00FF) with no shadows. Shadows get added in CSS.
