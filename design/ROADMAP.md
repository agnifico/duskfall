# Roadmap: from surface area to a playable slice

Written 2026-11-08, at the end of the tiles, HUD and art session. Lines marked *(proposal)* are suggestions not yet confirmed. Section 4 lists what has to be decided before the slice can be built. **Story and arcs: `design/STORY.md`** (2026-11-08: the Drill is now 15–20/25, the Mountains 25+).

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
| Arrival Beach + Sylvie's home | 1–5 | the two common enemies, pinchwarden (crab) and grumbletusk (boar), Gemini art to come, toxolotl near water | Traveller's set, Sylvie's two quests, a first weapon |
| Open Plains, Pine Grove | 5–15 | bear (main enemy until ~7–10), then the dragonling (7–10 on) | Padded, Iron |
| The Drill and its village (arc 2) | 15–20/25 | to plan | Silversteel or one specialised set; basic crafting |
| Bog (side area, Verona) | to set | to plan | |
| Mountains, cave with Varys (arc 3) | 25+ | candidates: mountain basilisk, punching tortoise, white wyvern | |

- **Enemy roster (Agni, 2026-11-08):** common and easy: toxolotl (near water) plus 1–2 small land enemies (crab and boar exist as emoji only and need art). Then the bear, the main enemy until about level 7–10. Then the dragonling (level 7–10 on), slightly stronger than the bear. The forest prowler's place is still open.
- **Levels 1–5:** Sylvie's quest plus the beach and home enemies take you to level 5. Two enemy types for five levels gets repetitive, so a tougher variant makes level 5 feel earned.
- **Pine Grove before the Drill:** the bear and prowler belong mid-slice, and the Drill works as the level 15 capstone.
- **Later enemies:** 15 of Dawn's Journey's enemies are already cut (`sprites/djv2/`). Candidates for the rows past level 15: siren and shark for the coast, sentinel for the Drill, wyvern for the hills.
- **Exhaustive location list:** still to write. It should cover every location the game will eventually have, built or not, each with its levels and enemies. That table becomes the reference for what drops where.

### Gear by level
- **The conflict:** the agreed armour ladder (Traveller 1, Padded 10, Iron 20, Silversteel 30…) gives the 1–15 slice only two sets.
- **Decided 2026-11-08: keep 1/10/20/30** (see §4.3). Traveller's carries levels 1–10; potions and skills cover the gap.
- **How gear is obtained:** decided 2026-11-08, see §4.4 (commons drop materials and rarely the item; strong enemies drop gear above your level; crafting alongside).
- **Weapons** come from quests. The player starts with one Traveller's weapon so the main hand isn't empty.
- **Relics** stay rare: from bosses and secrets.
- **Later:** crafting from mined ore, which suits the ore tiers (silver ore for Silversteel, malachite for Adamantine).

## 4. Decisions to make, roughly in order

1. ~~**Level pacing.**~~ Shape decided 2026-11-08 (Agni):
   - 1→2: the first fight, two enemies that ambush you at Sylvie's house.
   - 2→4: Sylvie's two quests (one combat, one gathering), plus kills along the way.
   - 4→5: a little fighting by choice. All of 1–5 within 2–3 full energy bars.
   - 5→10 is harder than 1–5. From 10 to 20–25 each level costs about the same as at 5–10, never much harder or easier.
   - Quests give a lot of XP, and this stretch is where players learn that quests beat grinding.
   - **Built 2026-11-08 as a curve** (`rules.ts`): a kill is worth `25 × 1.12^(enemy level − 1)`; a level takes 2, 4, 5, 6 kills for levels 1–4, then 8 (about one energy bar) up to the cap of 25. Enemies carry a `level` and get their XP from the curve. Quests will give XP counted in kills at their level. Still to do: enemy **stats** from the same level.
2. ~~**How locations unlock.**~~ Decided 2026-11-08: a mix of level, quest and World Resonance, place by place. Never by combat strength (stats).
3. ~~**Armour ladder.**~~ Decided 2026-11-08: **keep 1/10/20/30.** Compressing it means too much churn for a new player.
   - Traveller's is collected piece by piece over levels 1–5/6, and is strong enough to carry the player to level 10.
   - Where gear falls short, potions, food and skills fill the gap. That is where the player has to think.
4. ~~**Gear sources.**~~ Decided 2026-11-08: not one set per enemy.
   - Common enemies (toxolotl, pinchwarden, grumbletusk) drop materials, and rarely the item those materials make.
   - Stronger enemies (bear, dragonling) drop gear above your level, which pushes you to level up.
   - Crafting runs alongside.
5. ~~**What food is for.**~~ Decided 2026-11-08: food restores HP, ⚡ or Spirit, or gives a flat combat buff (strong early, weak later).
6. **Story skeleton:** started 2026-11-08 in `design/STORY.md`: the opening, Sylvie's part, the Hela secret, names. Still open: what she wants by level 15; why Hela and the heroine are separate; the final name list.
7. **Which quests give which weapons.** Started 2026-11-08: **Sylvie's first quest gives the first weapon.** You start unarmed (new games only).
   - **Feel target:** unarmed, a toxolotl takes 7–10 hits. Tedious but safe, and it teaches the combat.
   - With the first weapon, about 4 hits.
   - This target goes into the enemy stat formula.

## 5. Queued tasks (small, already agreed)

- **Fog of war:** when an enemy attacks you, clear the fog around it. Enemies attacking from inside fog feels unfair.
- **Gear data:**
  - ~~add `gear.json` entries for the 36 weapons~~ Done 2026-11-08 (Traveller's numbers working, the rest placeholders). Shields and quivers are off-hand; bow and staff take both hands, and a bow allows a quiver. **Daggers are main-hand for now**: an off-hand dagger (dual wield, or with a special bow) is still to do.
  - **Relics that are really clothing** (Hela's corset, sky bracers, fire dress, crown, helmet…) move to armour slots (Agni, 2026-11-08). Sets mix any slots: mechanically a set is just a tag on items, armour or relic alike (already true in `gear.json`/`sets.json`); which pieces go where is a design choice, not a code rule.
  - replace each enemy's single `item` with a drop table
  - give the player a starting weapon
- ~~**Skill XP**~~ Done 2026-11-08: woodcutting, mining and foraging to level 5; level adds 10% to ranged yields.
- **Icon redo:** an **Inventory** menu icon (it borrows the bag icon). The Profile button has left the menu, so its hooded icon is only used by the profile panel now. Also an **Inventory** menu icon (it borrows the bag icon for now).

## 5b. Done 2026-11-08 (the editor and systems session)
- **Map editor** (dev mode, E): paint, tune props' foot points and shadows, save. Arrival Beach enlarged and laid out with it.
- **Combat level** from kills: +5 HP and +1 to all four attacks and defences per level. **Stats split** into physical and elemental attack and defence; basic attacks are always physical (`design/COMBAT.md`).
- **Gear:** slots head, body, hands, legs, feet, main, off, 4 relics; 123 pieces in `gear.json`, sets in `sets.json`; Gear tab on the profile, Wear in the bag.
- **Playtest log:** in dev, everything you spend, earn, fight and level goes to `game/playtest/<session>.jsonl`, to read after a playtest.

## 5c. Next, in order (Agni, 2026-11-08)
1. **The full Inventory page** (Dawn's Journey style), with gear comparison. Agni's notes: `design/UI_PASS.md` › Inventory and gear. *Built 2026-11-08 (layout B: paper doll + stat sheet left, bag + detail right; I key), waiting for Agni's look.* `ui/panels/InventoryPage.svelte`, shared `ui/StatSheet.svelte` (also Profile › Stats).
2. ~~**Using items.**~~ Built 2026-11-08 (`useItem` in `engine/actions.ts`, items in `items.json` with `use`):
   - **Food:** berries +8 HP, brown mushroom +5 HP, seed bread +5 ⚡, mint tea +25 Spirit, smoked crab claw +3 Physical Attack for 10 min, honey cake +2/+2 defence for 10 min. No eating in a fight; one food buff at a time.
   - **Potions:** minor health +40, health +90, spirit tonic +50, energy draught +10 ⚡. Usable in a fight, but drinking takes your turn.
   - Numbers untested. Sources still to decide (shops, drops, cooking); dev Settings › Give five of each. Emoji icons until a Grok sheet.
3. ~~**Crafting interface.**~~ Built 2026-11-08: the Crafting screen (K), with Cooking, Alchemy and Smithing tabs, a recipe list (makeable first) and a detail panel with have/need, quantity and Craft. 16 placeholder recipes in `content/recipes.json` (food, the 4 potions, Traveller's armour, shield, spear, bow); `engine/craft.ts`. Free and instant: no energy, stations or skill levels yet.
4. Then the slice decisions in section 4, starting with level pacing.
5. ~~**Enemy stats, curve and drops.**~~ Built 2026-11-08: stats from level against a reference player, drop tables, new materials (frill, bear pelt, prowler fang, dragon scale), Padded recipes, and Traveller's and Padded numbers. See `design/COMBAT.md` › 7.
6. **Arrival Beach enemies** (Agni, 2026-11-08): two toxolotls in the shallows, a pinchwarden on the sand, two grumbletusks in the forest (territorial, they only come at you if you step next to them). Points can now place enemies by terrain (`enemies.place`).
   - **Keep the Open Plains away from a new player.** It's the first high-level training area: prowlers kill a fresh player in a hit or two. It gets locked when the world is set up along the story (after quests and dialogue).
6. **Quests and dialogue: slice 1 built 2026-11-08** (`design/QUESTS.md`): the engine, story mode (dialogue with cinematic bars), quest banner, tracker and log, areas that open with the story, and the opening chain (Washed Ashore with the ambush, then Thinning the Wilds with the sword/bow choice, then Firewood, which opens the Pine Grove). Next slices: level bands, NPCs placed by the story, the red tint for riled enemies, Heidi's quests, image-driven scenes. Decided 2026-11-08:
   - **Level bands per area:** enemies spawn at about your level, held inside the area's band.
   - **Riled ambush enemies** for the opening.
   - **Agni redesigns Sylvie's Home and the Pine Grove** in the editor; Claude places the enemies after.
   - **Heidi** is the Pine Grove quest-giver for levels 5–10.
   - **Story mode:** dialogue hides the HUD and shows cinematic black bars, and quest starts and ends are announced.
   - **Image-driven scenes** (pictures changing under the dialogue, as in nsfw_project) get their own session, built in a dev sandbox.
   - **Choices** are recorded and steer the story (the first: sword or staff).

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
