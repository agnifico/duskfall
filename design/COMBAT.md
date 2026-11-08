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

**Reference:** djv2, the Chessboard Battlefield (`~/Desktop/code/djv2`, design docs in `~/Desktop/code/`). Worth carrying over: the split between shapes and behaviours, one damage pipeline that everything goes through, ground warnings, and balance runs. Port the design, not the code: djv2 is real time on square tiles.

**Where this lands in the game:** `game/src/engine/` (rules, actions, hex grid and routes), enemies as content in `game/src/content/`, the field in `game/src/ui/HexView.svelte`.
