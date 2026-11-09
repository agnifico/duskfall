# Combat and enemies

Agreed in brainstorming on 2026-11-07. **Built so far (2026-11-07):** steps 1 and 2 of the first slice: the tick engine on steps, still and territorial enemies with telegraphs, HP and knockouts, the basic attack (+15 Spirit), Spirit (max 100, kept between fights), the Dash (20 Spirit + 1⚡, up to 3 hexes straight) and the Whirl (40 Spirit, ×1.2 to every hex around you) in hotbar slots 1 and 2, ghost props and no field actions while an enemy is after you, chip damage (2 per tick, dev switch 0/2/4), the damage formula switch, code-drawn attack animations (lunge, sword arc, red flash, enemies answering a beat later), and step 3: the 15-minute cycle (each point's `enemies` table rolled onto free hexes per cycle, still enemies preferring nodes, beaten ones gone until the cycle ends, 2 free rerolls with R or the 🎲 button). Not built yet: legendaries and their map pins, first-kill World Resonance and the codex. Lines marked *(proposal)* came up in that brainstorm without being confirmed. The open questions at the end are meant to be settled by playing, not on paper.

Today, enemies are props (`crab`, `boar` in `content/props.json`) that you beat instantly for 4⚡. This design replaces that.

---

## 1. Enemies on the hex field

### The 15-minute cycle
- One cycle is 15 minutes (900 s). Energy refills at 1 per 90 s, so a full bar is also one cycle.
- Each point has its own enemy set **per cycle**: rolled the first time you arrive in that cycle, kept until the cycle ends, then rolled fresh. Leaving and re-entering doesn't reroll. Beaten enemies stay gone until the next cycle.
- **Reroll:** 2 free per point per cycle. After that the button greys out and shows the time to the next cycle.

### Walking is step by step
- Each hex you step onto is one **tick**, and enemies act on every tick.
- A route stops early when something needs you: an enemy reaching you, or a hidden find. You pay ⚡ only for the steps you took.

### Three kinds of enemy
| Kind | Moves | Notices you | Notes |
|---|---|---|---|
| **Still** | never | never | often sits on something you want (a node, a narrow path): go around it or fight it |
| **Territorial** | 1 hex per tick toward you | within its notice range: 1 ring for most, 2 for a few, set per enemy in the data | its range shows as a faint red tint; the route preview warns when a path crosses it; it gives up when you're 2 hexes past its range |
| **Legendary** | 2 hexes per tick | anywhere in the point | always catches you; see below |

**Riled (2026-11-08, Agni):** anything you hit, still or territorial, chases you anywhere on the point and never gives up, until a knockout resets the point. With a bow you have to reposition.

**Three paths (Agni, 2026-11-08):** Sylvie offers a sword, a bow or a staff (warrior, ranger, mage). Basic attacks are always physical. The bow keeps its distance (range 3, 80% damage; 65% lost every trade with a boar, which keeps pace with you). The staff's basic attack reaches 2. The staff is a catalyst: its basic attack is a weak physical bonk, and it grants **Spark** (20 Spirit, elemental, an enemy up to 2 hexes away, power 1.3, gives back 10 Spirit when it lands; was 10/15 until 2026-11-09, when it kept itself going forever). About two basic attacks for every three Sparks. Mage gear will trade defence for damage (1–2 shot kills). Gear can grant skills (`grants` in gear.json); a granted skill goes on the hotbar when you wear it. Spark reaches 2 hexes.

**Hybrid: infusion (built 2026-11-08).** Heidi's optional quest *Heidi's Gift* (level 6, after The Healer in the Grove: 6 wild herbs, 3 toxolotl frills) sets `infused`: every basic attack that lands adds an elemental hit at 30% (`INFUSION_POWER`). Lets a ranger or warrior play part mage.

**Kiting (playtest note, Agni 2026-11-08):** it works, but you can't step back and shoot in one turn, so kiting means moving two hexes and then shooting. Harder for a new player to see; fine for now, worth teaching later.

**Reaching (2026-11-08):** clicking an enemy out of reach (or aiming Spark at one) walks you until it's in range, then attacks or casts. The walk stops early if an attack is aimed at your hex. Spells fly as a glowing orb, arrows as a streak. Enemies roll at least 4 hexes from a point's start (`START_CLEAR`). The grunt runt is now level 2 with 80% attack: new players were dying to it too often.

**Getting away (2026-11-08):** leaving the point is always allowed, even mid-fight; the enemies there calm down, heal and go home.

### Legendaries
- **Chance:** 4% per roll, plus 2% after each roll without one; **guaranteed by the 12th roll** (4 cycles using both rerolls). The count resets when one appears.
- **Forced, with one way out:** it's visible when you arrive, so you can still turn back from the way-out hex. Once you step in, the fight is forced.
- **On the nation map:** a point holding a legendary has a glowing pin with a countdown ("legendary at The Drill, 11:20 left").

### Rewards and losing
- **First kill** of each enemy kind: World Resonance (+5, as in Dawn's Journey) and a codex entry. **Repeat kills:** drops only.
- **HP is a second resource** next to ⚡: it carries between fights, comes back slowly, and rest and food restore it (which gives cooking its purpose).
- **Knocked out:** you wake at your last rest spot (Sylvie's house). No items lost.

---

## 2. Fighting on the hex field

### Where
On the point's own hex field. When a fight starts, props turn to **ghosts**: see-through, not blocking, unusable.
- **Terrain still counts:** deep water blocks, walls block, forest and shallows cost more to cross.
- **While an enemy is on you,** you can't gather, search, take or talk. Being chased has a cost.

### The clock
**Build the fight on ticks.** Then steps or real time is a switch, not a rewrite:
- **Steps (start here):** every action you take, moving, a basic attack or a skill, is one tick, and every enemy acts after it. Basic attacks can't be spammed for free: each one takes a tick, so spamming them means trading blows.
- **Hybrid (try next):** once an enemy engages, a timer advances the ticks (*proposal:* one every 0.4 s) whether you act or not. Outside fights, still steps.
- Keep whichever plays better.

### Telegraphs
Every enemy shows what it's about to do, so you react instead of guessing:
- **On steps:** its next action shows one tick ahead: an arrow to the hex it will move to, and the hexes it will hit glowing red.
- **In the hybrid:** an attack winds up for a moment (*proposal:* 0.6 s) while its area fills with red. djv2's ground warnings already do this.
- Bigger attacks get longer warnings. A legendary's warnings are what make its fight learnable.
- Telegraphs are what make pre-emptive play work: seeing an enemy close in and firing an area attack as it arrives.

### Energy and Spirit
- **Moving costs ⚡.** A dash costs less per hex than walking.
- **Combat costs no ⚡.** Basic attacks are free and build **Spirit** (djv2's Energy, renamed so it doesn't clash with ⚡; called Focus until 2026-11-07); skills spend Spirit.
- *(proposal)* At 0 ⚡, a step costs HP instead, so you're never stuck mid-fight.
- **Ignoring an enemy** is allowed: it chips your HP every tick it's next to you. How much is tuned by feel.

### Attacks
- **Shapes on hexes:** **arc** (1 hex in a direction, or the 3 in front), **line** (straight, along one of the six directions), **area** (rings around a hex). djv2's other shapes, built from circles, capsules and wedges, can carry over later: a hex counts as hit if its centre falls inside.
- **Basic attacks:** specific to each character, melee or ranged, small damage, short range, free.
- **Reach (2026-11-08):** melee hits the hex next to you; a bow reaches any enemy you can see within 3 hexes (`WEAPON_RANGE` in rules.ts; a weapon can set its own `range`). No line-of-sight blocking yet. A ranged basic attack hits for **65%** of a melee one (`RANGED_POWER`): Agni's bow playtest took no hits at all. No ammo for basic shots; special arrows (piercing, over obstacles) are an idea for later, Skyrim/RuneScape style.
- **Skills:** cost Spirit. Sources *(not committed)*: weapons, team members, and buying them (expensive) through quests or a shop.

### Team
One character on the field at a time. Characters you acquire join the team (as in djv2). The same character can also stand in the world as an NPC; that's fine.

---

## 3. Stats

Dawn's Journey's set, with these changes.

| Stat | Start | One level point (Dawn's Journey) | How common on gear |
|---|---|---|---|
| HP / Aura Shield (Aura absorbs damage first) | 100 / 100 | +15 | uncommon (max HP, max Aura) |
| Physical and elemental attack | 10 | +10 | common |
| Physical and elemental defence | 10 | +10 | common |
| Speed | 20 | +1.5 | **rare** |
| Evasion | 20 | +1.5 | uncommon |
| Precision | 10 | +1.5 | uncommon |
| Crit chance / crit damage | 10% / 1.25× | +1% / +2% | common (to confirm) |

### Speed
- **On its own, speed is tempo:** how often you act and how far you move per tick. 20 against 10 means two actions for every one of theirs.
- **It feeds a quarter of itself into evasion and into precision.** The stat sheet shows the split: "Evasion 25 (20 + 5 from speed)".

### Dodging
Dodge chance = e ÷ (e + 100), where
e = (defender's evasion + ¼ of its speed) − (attacker's precision + ¼ of its speed), never below 0.

So 100 gives 50%, 200 gives 67%, and nothing reaches 100%. This fixes Dawn's Journey's code, which is linear: 100 evasion after precision dodges everything, though its own comment intended this curve. Between two fighters the speed shares cancel out and leave only the speed gap: the faster one dodges a little more and lands a little more.

### The triangle
- **Speed beats precision:** it acts first and more often, and its speed gap adds to its dodge.
- **Precision beats evasion:** it cancels evasion point for point.
- **Evasion beats speed:** a level point in evasion adds 1.5 evasion, while a point in speed adds under 0.4 precision.
- **The risk to watch:** speed becoming the best stat overall. Keep its share at a quarter, and give it nothing towards damage, defence or HP.

### World Resonance
Dawn's Journey's rules (+1 every 96 minutes, +5 for each first kill, quest rewards), with one change: meeting an enemy's requirement is **not** a free win. Instead you get a damage multiplier against it, so a strong player still has to swing, but one or two basic attacks clear a starter field.
- *(proposal)* Multiplier = your resonance ÷ the enemy's requirement, from ×1 up to ×5. No penalty below the requirement.

### Damage *(open: test both)*
- **Dawn's Journey's:** attack × (1 − defence ÷ (defence + 200)). Defence barely matters early: 10 cuts 5%, 30 cuts 13%, and it only halves damage at 200.
- **Ratio:** attack × attack ÷ (attack + defence). Equal attack and defence halve damage at every level, so defence matters from the first fight. The catch: doubling attack gives about 2.7× damage against the same defence, so attack bonuses on gear must stay small.
- Either way, crits, elements and the resonance multiplier multiply on top.

---

### Decided 2026-11-08: physical and elemental, levels
- **Attack and defence split in two**, as in Dawn's Journey: physical attack and defence, elemental attack and defence. Physical attack meets physical defence; elemental meets elemental. Built: `Stats.patk/eatk/pdef/edef`, `rollHit(…, kind)`, skills carry `damage` (physical if missing). An enemy's missing elemental stats copy its physical ones.
- **Basic attacks are always physical**, unless an infusion modifier says otherwise (later). Spells are almost always elemental. An elemental build is weaker in the overworld by design and leans on low-cooldown skills.
- **One combat level** from beating enemies. Each level adds 5 HP and 1 to all four attacks and defences, so you stay rounded. The combat level will gate gear and higher-level areas.
- **Later:** one free stat point per level, put into any one stat (by level 60: 60 from levels plus up to 60 more in one stat, before gear).

## 4. Worked example: the first fights

The starting heroine against two made-up enemies, on the formulas above:

| | Shore crab (common) | Wild boar (uncommon) |
|---|---|---|
| Stats | HP 30 · ATK 6 · DEF 6 · SPD 10 · EVA 5 · PRC 5 · needs resonance 10 | HP 60 · ATK 12 · DEF 12 · SPD 20 · EVA 10 · PRC 10 · needs resonance 30 |
| Your basic attack, Dawn's Journey's formula | 9.7 damage: 4 hits | 9.4 damage: 7 hits |
| Your basic attack, ratio formula | 6.3 damage: 5 hits | 4.5 damage: 14 hits, so use skills |
| You dodge | 15% | 9% |
| It dodges | 0% | 0% |
| Tempo | you act twice per crab action | even |
| With resonance (proposal) | ×3 at 30: 2 hits · ×5 at 50: 1 hit | ×2 at 60 |

At the start, defence, crit and speed's quarter share all change a fight by only a few percent. A rare +5 speed item adds about 1% dodge, so early on speed is worth its tempo, not its share.

---

## 5. Open questions: settle by playing
1. Damage formula: Dawn's Journey's or the ratio one.
2. The resonance multiplier's curve.
3. Steps or hybrid, and the hybrid's tick length.
4. In the hybrid, whether moving during a fight costs ⚡. At 0 ⚡, whether steps cost HP.
5. Chip damage.
6. Since speed is rare: can level points buy it, or only gear? Dawn's Journey's level points are also lopsided: one point doubles your starting attack but adds 7.5% to speed.
7. Whether crit is common.
8. Evasion on the field: shrinking enemies' notice range was doubted, since ranges are small. An alternative is a per-step chance to slip past unnoticed.
9. Where skills come from: weapons, team members, buying.

---

## 5b. Notes for later (from playtests)
- **Energy** is now 30, +1 every 30 s (was 10 / 90 s, too harsh). Perks and upgrades will raise the max later; the bar is one continuous fill, notched every 3.
- **Attack animations** for every character and enemy. The cheapest is drawn in code with no art: a short lunge towards the target, plus a sword-swing arc or a red flash on the hexes hit. The fuller version is 2–3 attack frames per character from Grok (wind-up, swing, follow-through), played like the walk cycle. Start with the code-drawn one; swap in frames as the art arrives.
- **Enemy art** is djv2's pixel art for now, to be redrawn through Grok in the game's style. The toxolotl has a gap in its body. Bob, inkjet ray, rock lion and shark soldier need their backgrounds cut.
- **Ground points and shadows** sit slightly off on most props and enemies: hand-tune them all in one pass, maybe with a small dev-mode editor.
- **Styling, animation and effects** need a pass, not yet.

## 6. First slice to build
- A fight engine on ticks, starting with steps; enemy actions resolved after each of yours.
- Still and territorial enemies with telegraphs; HP; knockouts.
- One basic attack (an arc of 1), one dash, one area attack, spending and building Spirit.
- The damage and dodge maths from section 3 on Dawn's Journey's stats, with the formula switchable for testing.
- The 15-minute cycle with rerolls. Legendaries next.

**Reference:** djv2, the Chessboard Battlefield (`~/Desktop/code/dawns-journey-combat-lab`, design docs in `~/Desktop/code/`). Worth carrying over: the split between shapes and behaviours, one damage pipeline that everything goes through, ground warnings, and balance runs. Port the design, not the code: djv2 is real time on square tiles.

**Where this lands in the game:** `game/src/engine/` (rules, actions, hex grid and routes), enemies as content in `game/src/content/`, the field in `game/src/ui/HexView.svelte`.

## 7. Enemy stats from level (built 2026-11-08)

Enemies get their stats from their level, tuned against a reference player of that level wearing gear for it (`rules.ts` › `FOE_HITS`, `FOE_HIT_SHARE`, `REF_GEAR`, `FOE_DEF`; `combat.ts` › `curveStats`, `foeStats`).
- **You beat an enemy of your level in about 4 hits with a weapon.** At level 1, unarmed, it's about 8 (Agni's target was 7–10 unarmed and about 4 armed).
- **Each of its hits takes about 10% of your health.**
- **Gear that lags your level** (Traveller's at level 9–10) makes it about 5 hits and 12.5% a hit: the gap that potions, food and skills fill.
- **Each type keeps its character** through `mult` (the bear: health ×1.4, defence ×1.3, slow; the prowler: health ×0.75, fast, evasive) plus explicit `stats` for speed, evasion and precision.
- **XP comes from level alone.** A tanky bear gives the same as any level 5 enemy.
- **Armour carries health.** Under Dawn's Journey's damage formula, defence barely matters early, so Traveller's (about 40 HP, plus 15 for the full set) is what makes it substantial: it cuts a level 1 enemy's hit from about 9% to about 5% of your health.

| Enemy | Level | HP | Attack | Defence | Hits to beat it: unarmed / Traveller's sword | Its hit: no armour / Traveller's |
|---|---|---|---|---|---|---|
| toxolotl | 1 | 72 | 9 | 4 | 7.2 / 3.6 | 8.6% / 5.4% |
| crab runt | 1 | 72 | 11 | 8 | 7.3 / 3.7 | 10.5% / 6.6% |
| grunt runt | 3 | 93 | 18 | 7 | 7.8 / 4.3 | 15.4% / 10.1% |
| bear | 5 | 149 | 23 | 13 | 11.1 / 6.5 | 17.9% / 12.0% |
| forest prowler | 6 | 84 | 22 | 12 | 5.8 / 3.5 | 16.4% / 11.1% |
| dragonling | 8 | 137 | 30 | 14 | 8.4 / 5.3 | 20.5% / 14.2% |

### Drops
Each line of an enemy's table rolls on its own (`foe.drops`; `combat.ts` › `rollDrops`).

| Enemy | Always | Sometimes |
|---|---|---|
| toxolotl | toxolotl frill | spirit tonic 4% |
| crab runt | 1–2 crab shells | smoked crab claw 6%, Traveller's boots 4% |
| grunt runt | 1–2 boar hides | a Traveller's head, body, hands or legs piece 5% |
| bear | 1–2 bear pelts | a Padded piece (level 10) 6% |
| forest prowler | prowler fang | Padded gloves or boots 5% |
| dragonling | dragon scale 60%, red crystal 25% | a Padded piece 8% |

Materials feed the recipes: frill goes into spirit tonics; hide, shell and bark into Traveller's; bear pelt, hide and fang into Padded.

## Elements and stats (settled 2026-11-09)
**Superseded in part by `design/ELEMENTS.md` (later 2026-11-09):** you choose your element (weapons are materials); armour and relics set the element you defend as; the chart is Water > Fire > Earth > Air > Water, Light ⇄ Dark, ×1.5 / ×0.75.
- **Stats and numbers come from the archetype:** the weapon kind (sword, bow, staff, axe…) and the armour's leaning (heavy, light, arcane): the gear formula. **Elements are not tied to stats.** (Tying them made the combinations explode: six elements × weapon kinds × tiers, and an Earth player couldn't hit hard.)
- **An element is a tag** on a weapon or piece. Every weapon kind and leaning exists in every element. The element sets matchups (Dawn's Journey's 2× / 0.5× chart, `dawns-journey/overview/elemental_effectiveness_matrix.csv`, and World Resonance), which skills a weapon can carry, and its look.
- **Each element is a play style, through its skills,** like the schools of a JRPG class system (Agni's reference: Dragon Oath, where pyromancy is all offence with little utility, while the Lotus Order and the Beggars' Alliance, ice, water or thunder, trade low but quick hits for lots of utility). Fire: offence, little utility. Water: healing and sustain. Wind: moves you around a lot. Earth: defence turned into attack (Dawn's Journey's arena has 2–3 of these, strong in combination). Light and Dark: precision and crits, to be shaped. Skill visuals follow the element.
- **A full five-piece elemental set gives a proper bonus:** the reward for committing to one element.
