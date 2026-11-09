# Roadmap: from surface area to a playable slice

Written 2026-11-08, at the end of the tiles, HUD and art session. Lines marked *(proposal)* are suggestions not yet confirmed. Section 4 lists what has to be decided before the slice can be built. **Story and arcs: `design/STORY.md`** (2026-11-08: the Drill is now 15–20/25, the Mountains 25+).

---

## 0. Theme days (agreed 2026-11-09)

One theme a day, done completely that day: everything it needs and everything we can think of. Then later days
only add rows to content files and test them in the dev field. Aim: 7–10 days a month of building systems, the
rest short days that use them. Story, homestead, farming, fishing wait.

0. **Test bench.** A second player (own save slot, every item, any level, a kit in one click, all quests done)
   swapped in on the dev field; enemy spawner. *Built 2026-11-09 (slice 1).* Still to add: named save slots.
1. **Skills.** All of `SKILLS.md` plus ~20 more; statuses (stun, poison, root). Tested in one sitting.
2. **Elements** *(proposed: before enemies and gear, both depend on it)*. Matchups and set bonuses (parked P3).
3. **Enemies.** The full roster to the cap: behaviours, stats from the curve, drops; a bestiary; each seen once.
4. **Gear.** The armour ladder at every tier, weapons per kind per tier, relics, recipes, set bonuses.
5. **Gathering.** ~10 trees, ores, herbs, fish across regions; levels to the cap; what they feed.
6. **World blueprint.** Every region and point: level range, enemy and node tables, unlocks; empty points laid
   out in the editor.
7. **Art day** (likely two). One prompt batch for everything missing, then cut and tune in one pass.
8. **Numbers pass.** XP curve to the cap, gear by level, prices, drop rates; the content checker taught to flag gaps.

Caveats agreed with the plan:
- The dev field shows whether a system works, not whether the game is fun. Every two or three theme days, one real
  run from a new game, with the playtest log on.
- Themes depend on each other (elements → enemies and gear; statuses → skills and enemies): keep the order.
- A theme can take two days; finishing it beats moving on half-done.
- New mechanics will creep into "content" days; when one does, it gets its own building day.

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
| Arrival Beach + Sylvie's home | 1–5 | the two common enemies, crab runt (crab) and grunt runt (boar), Gemini art to come, toxolotl near water | Traveller's set, Sylvie's two quests, a first weapon |
| Open Plains, Pine Grove | 5–15 | bear (main enemy until ~7–10), then the dragonling (7–10 on) | Padded, Iron |
| The Drill and its village (arc 2) | 15–20/25 | to plan | Silversteel or one specialised set; basic crafting |
| Bog (side area, Verona) | to set | to plan | |
| Mountains, cave with Veres (arc 3) | 25+ | candidates: mountain basilisk, punching tortoise, white wyvern | |

- **Enemy roster (Agni, 2026-11-08):** common and easy: toxolotl (near water) plus 1–2 small land enemies (the crab runt and the grunt runt; art in 2026-11-08). **Evolved forms, named 2026-11-08, for the next area (the Drill, 15+); levels set when it's planned:** the **Crabscallion** (crab) and the **Boaring Captain** (boar), art cut as `gemini_foes/crab2` and `boar2`. Then the bear, the main enemy until about level 7–10. Then the dragonling (level 7–10 on), slightly stronger than the bear. The forest prowler's place is still open.
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
   - **Retuned 2026-11-09** (playtest: level 6 in 8 minutes, quests gave 730 of 1,170 XP): kills per level 2, 8, 10, 12, then 14 for levels 5–7, then 18 from 8; quest and daily XP scaled to match (×2 early, ×1.75 at 6, ×2.25 from 8); 1 reroll per point per cycle; no enemies at Sylvie's Home. Agni: levels 5–8 can stay lenient; it should slow before the Drill.
   - **Built 2026-11-08 as a curve** (`rules.ts`): a kill is worth `25 × 1.12^(enemy level − 1)`; a level takes 2, 4, 5, 6 kills for levels 1–4, then 8 (about one energy bar) up to the cap of 25. Enemies carry a `level` and get their XP from the curve. Quests will give XP counted in kills at their level. Still to do: enemy **stats** from the same level.
2. ~~**How locations unlock.**~~ Decided 2026-11-08: a mix of level, quest and World Resonance, place by place. Never by combat strength (stats).
3. ~~**Armour ladder.**~~ Decided 2026-11-08: **keep 1/10/20/30.** Compressing it means too much churn for a new player.
   - Traveller's is collected piece by piece over levels 1–5/6, and is strong enough to carry the player to level 10.
   - Where gear falls short, potions, food and skills fill the gap. That is where the player has to think.
4. ~~**Gear sources.**~~ Decided 2026-11-08: not one set per enemy.
   - Common enemies (toxolotl, crab runt, grunt runt) drop materials, and rarely the item those materials make.
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

- ~~**Customisable hotkey bar**~~ Built 2026-11-08: six quick slots (keys 1–6) holding skills or food and potions. Right-click a slot (or click an empty one) to pick; the bag's *To hotbar* fills the first empty slot. A new game starts with Dash, Whirl, seed bread and the minor health potion.
- **No energy friction before the Pine Grove** (Agni, 2026-11-08): about three bars in the first 30–60 minutes. Built: Sylvie gives 5 acorns (five breads) and a full energy refill at her house (end of Washed Ashore; new `energy` effect). Firewood still gives 3 seed bread.
- **Start and way out are separate** (2026-11-08): a `start` marker (invisible in play, paint it in the editor under People & exits) is where you arrive; `>` stays the way out. Arrival Beach now has a start and no way out. **The way out (`>`) is invisible in play and has no card** (M opens the map anywhere); on fog maps it shows as a beacon, revealed from the moment you arrive, to find your way back by. The editor always shows it. Placeholder sprite: the wreck lantern; a lighthouse is on the next art list.
- ~~**Campfire as a restore point**~~ Built 2026-11-08: *Warm up* fills HP, free, any time; *Stoke the fire* costs 1 wood for +10⚡, once per 15 minutes per fire (`FIRE_*` in rules.ts). A fire is the anchor for grinding one area of a point.
- ~~**Energy food ratio**~~ Built 2026-11-08: basic trees drop acorns 20% of the time; seed bread is 1 acorn + 1 wood for +10⚡. HP food: crab runts drop crab meat (60%; riled ones always), grilled crab (1 crab meat + 1 wood) gives +25 HP. Crab meat and grilled crab need icons.

- ~~**Energy rework**~~ Built 2026-11-08 (`design/ENERGY.md`): walking free; energy for gathering, crafting and cooking; bar 60, full in 20 min; XP per node by size, falling off once outgrown; nodes regrow every 15 minutes; skills to level 10; oaks need Woodcutting 5 (tool tiers no longer gate). Two grunt runts in Sylvie's forest.
- **Tool tier** still shows on the Profile and in dev Settings but no longer does anything.

- **Pine Grove arc, first pass** (2026-11-08, draft writing, Agni to revise): Heidi stands in the grove (portrait from her art; no figure yet). *The Healer in the Grove* (after Firewood: meet Heidi, drive back 3 bears; gives a Traveller's coat) and *Smoke on the Rocks* (level 8: beat the dragonling; Heidi sends you back to Sylvie, tag `drill-hint`). The grove has 2 bears and a dragonling on the rocks. Wild herbs now come from berry bushes (30%); nothing gave them before.
- **Daily quests** built (`design/QUESTS.md`), with pools for Sylvie and Heidi.
- **Hover:** only the destination hex is marked; no route line or step count. Enemy chips sit below the enemy, clear of damage numbers. "Free" tags removed. Tool tiers removed from the UI.
- **Not built: Heidi's infusion quest.** Open question on how infusion works (see below).

- **Staff path, Open Plains, levels 9–15** (2026-11-08): Sylvie's choice is sword, bow or staff (see COMBAT.md). Open Plains laid out as a first pass (about 300 hexes: sea and rocky coast west, grass middle, forest east, rough ground south toward the bog; fog with a beacon) with biceons (9), prowlers (11), a punching tortoise (12) and a mountain basilisk (14); drops reuse existing items. *The West Fields* (after Smoke on the Rocks) opens the plains, then at level 15 opens the Drill. Two plains daily quests for Sylvie. Dev mode can travel to locked maps.

- **Rock layers:** high rock `m` (height 4) and crag `k` (height 5) for the climb to the mountains; walkable.
- **Lag fix:** the field re-rendered every second (two clock reads for regrowth); it now redraws when the 15-minute cycle turns.

- **HUD:** HP and Spirit bars ported from the combat lab's HPBar (dark rounded label chip, black-edged track, inset shading, value on the bar), with the main-hand and off-hand weapons either side (click to open the inventory). Figures are 20% smaller and don't catch clicks, so hexes behind people stay clickable.

- **The structure for building areas** (2026-11-08):
  - **Level ranges:** a point's `levels: [lo, hi]`; its enemies roll at your level plus their lead over the area's easiest, never below their own level or above the top. Beach and Sylvie's 1–10, Pine Grove 5–10, Open Plains 9–15. Enemy cards and hover show the level.
  - **Gear formula** (`engine/gearFormula.ts`): any piece with no numbers gets them from its level, slot and its set's profile (heavy, light, arcane), split from REF_GEAR, the curve enemies are tuned against. Hand-set Traveller's and Padded already sit on it. Sets with no bonus get one from the same curve. Iron, Silversteel, Adamantine and the elemental sets now have numbers.
  - **Content checker:** `python3 tools/check_content.py` (broken links between files, things nothing gives, tags nothing sets). First run found blue mushrooms had no source (spirit tonic couldn't be made); now from mushroom rings.
  - **Playtest summary:** `python3 tools/playtest_summary.py [--last N | --since DATE]`: levels by active time, fights (kills, knockouts, hits per kill), energy spent and regained, gathering, quests, time by place.
  - **Area brief template:** `design/AREA_BRIEF.md`.

- **Drill arc, phase 1** (2026-11-09, brief in `design/areas/the-drill.md`): Saltmere (village hub, no fighting, Brann's shop) and the Drill (17–22: neutral Solis sentinels, crabscallions, boaring captains, prowlers, iron veins). Six people with portraits (Claudia, Cygwin and Aurelie cut from Agni's images; Marisol, Brann and Tova lettered placeholders). Three main quests, 11 village daily quests. Shops: buy from a list, sell anything with a `value`. Iron ore, the iron vein (Mining 5) and 11 Iron recipes. **Phase 2 built the same day:** the Lily Ponds (18–22, burnt woods healing, crater ponds; Verona as a normal level-24 enemy you duel in *The Girl at the Ponds*; her real boss fight comes with the combat lab's AI) and the Shoals (20–25, by Saltmere's boat; Marjane's vanguard sirens and aquamech sharks, wild coral eyes; *What Lies Beneath* sets `marjane-hint`). Villager portraits from Agni's Gemini images.

### Ideas for later (Agni, 2026-11-08)
- **Gear ladder to fill:** a heavy tier above Adamantine (level 60, later 80); a light set around level 40 (rangers are skill-led); arcane sets are hard to get and simple to use (big damage at range), and there are enough of them. **Every non-elemental tier is smithed from ore** (an iron vein first, then silver, malachite for Adamantine); pieces also turn up rarely in the world. Elemental gear drops, and becomes craftable later. That leaves enemies free to drop relics, weapons and resources.
- **Swimming / deep water:** not tied to gear. Ask why a player would go in: to shoot from the water and skirt land enemies, or for a bonus while there. Unlocked once, for good (like Dawn's Journey's exploration abilities), from the story rather than from wearing something. A boat for crossing to other regions.
- **From the combat lab, later (styling pass):** its CSS ability effects (bows, arrows, area attacks and the rest), adapted to hexes, and its button style (shape and shadow).
- **Smarter enemies** (the combat lab's AI): 3–5 enemies that target you together, so the three paths play differently and a knockout teaches you to play better.
- **Full restore from a fire, once a day**, unlocked at a higher level or as a special effect, like Sylvie's bed.
- **Other restore sources:** split fires by kind: a shrine, a spirit well for Spirit, and so on.
- **Cooking at the fire:** the fire as the cooking station.
- **Tutorial hint:** the first time your energy runs out, highlight the bread on the hotbar.
- **Special arrows:** ammo only for special shots (piercing, over obstacles), Skyrim/RuneScape style; basic shots stay free.

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
6. **Arrival Beach enemies** (Agni, 2026-11-08): two toxolotls in the shallows, a crab runt on the sand, two grunt runts in the forest (territorial, they only come at you if you step next to them). Points can now place enemies by terrain (`enemies.place`).
   - **Keep the Open Plains away from a new player.** It's the first high-level training area: prowlers kill a fresh player in a hit or two. It gets locked when the world is set up along the story (after quests and dialogue).
6. **Quests and dialogue: slice 1 built 2026-11-08** (`design/QUESTS.md`): the engine, story mode (dialogue with cinematic bars), quest banner, tracker and log, areas that open with the story, and the opening chain (Washed Ashore with the ambush, then Thinning the Wilds with the sword/bow choice, then Firewood, which opens the Pine Grove). Next slices: level bands, NPCs placed by the story, the red tint for riled enemies, Heidi's quests, image-driven scenes. Decided 2026-11-08:
   - **Level bands per area:** enemies spawn at about your level, held inside the area's band.
   - **Riled ambush enemies** for the opening.
   - **Agni redesigns Sylvie's Home and the Pine Grove** in the editor; Claude places the enemies after.
   - **Heidi** is the Pine Grove quest-giver for levels 5–10.
   - **Story mode:** dialogue hides the HUD and shows cinematic black bars, and quest starts and ends are announced.
   - **Image-driven scenes** (pictures changing under the dialogue, as in nsfw_project) get their own session, built in a dev sandbox.
   - **Choices** are recorded and steer the story (the first: sword or staff).

## 5d. Done 2026-11-08 (evening)
- **Crab and boar art** (Gemini, magenta): `extras/enemies/gemini/`, cut by `KEYED_SINGLES` in `tools/cut_sheets.py` into `sprites/gemini_foes/`. `crab2` (lobster brute) and `boar2` (boar warrior) are cut for later evolved forms.
- **Opening pictures:** picture steps in dialogue; the storm plays as four pictures before Arrival Beach. Art prompts in `prompts/items_and_opening.md`, with the 16 missing item icons.
- **Camera:** a point opens fully zoomed in on you; story beats zoom one step closer; drag off the field (or right/middle drag) to pan.
- **Arrival Beach start** moved to the sand at the water's edge.
- **Bows reach 3 hexes** (`WEAPON_RANGE` in rules.ts; a weapon's own `range` wins). **Anything you hit is riled:** it chases you anywhere on the point and never gives up, until a knockout.
- **Fixed:** narration lines were cream on cream (the first line of the opening looked empty).
- **Later the same evening:** the five opening pictures are in; the 16 item icons are in (`sprites/items2/`); Sylvie stands beside you on the beach (points' `people`); the camera follows you near the view's edge; bows hit for 65%; leaving a point mid-fight is allowed and calms the enemies; crab and boar renamed **crab runt** and **grunt runt**.

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
