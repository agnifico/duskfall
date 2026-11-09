# Combat skills

The locked first set (Agni, 2026-11-09). Drawn mostly from Dawn's Journey v2's arena abilities
(`~/Documents/code/dawns-journey/v2/src/lib/data/abilities.ts`), with Agni's own notes. Numbers are first guesses.

**Build only what play needs.** For now each weapon gets its first two skills. The rest wait until the
Saltmere, Shoals and Drill areas ask for them. Around the boars a player should have a few skills and learn
them well. The high-level ones (Snipe Shot and up) matter from Saltmere on.

SP = Spirit. A percentage is of a normal hit with that attack.

## By weapon

A skill comes with its weapon: wear a sword and you have the sword's skills (gear `grants`), each from its level.

### Sword
| Level | Skill | What it does |
|---|---|---|
| 1 | **Whirl** | 40 SP. 120% to all six hexes around you. Swords only. |
| 6 | **Cleave** | 25 SP. 100% to the three hexes in front. |
| 10 | Rapid Strike | 30 SP. Three hits of 45%; each can miss. |
| 16 | Execution | 45 SP. 90%, or 160% on a target under 30% HP. |
| 22 | Blooddrinker | 50 SP. 100%; heals you 40% of the damage. |

### Bow
| Level | Skill | What it does |
|---|---|---|
| 1 | **Dash** | 20 SP. Charge up to 3 hexes in a line; 60% to every enemy passed; bounce off with no room. Bows only. |
| 6 | **Piercing Shot** | 30 SP. 90% to each hex in a line of four. |
| 10 | Volley | 40 SP. 70% to a hex and the six around it, up to 3 away. |
| 15 | Snipe Shot | 75 SP. Range 7, 250%. |
| 22 | Lock On | 30 SP. Your next shot can't miss and crits. |

### Staff
| Level | Skill | What it does |
|---|---|---|
| 1 | **Spark** | 20 SP, gives 10 back when it lands. 130% elemental, range 2. |
| 6 | **Elemental Smite** | 45 SP. 80% elemental to a hex and the six around it, up to 2 away. *(Moved up from 10 when Minor Heal went to everyone.)* |
| 16 | Mending Aura | 40 SP. Heals 6% of max HP a tick for 4 ticks. |
| 22 | Soul Drain | 50 SP. 110% elemental; heals you 50% of the damage. |

### Shield (off hand, with any one-handed weapon)
| Level | Skill | What it does |
|---|---|---|
| 1 | **Fortify** | 30 SP. +10 and +5% to both defences for 5 ticks (the flat part keeps it useful at every level). |
| 12 | Shield Bash | 30 SP. 80% and pushes the enemy back a hex. |

## For everyone

| From | Skill | What it does |
|---|---|---|
| Level 6 *(proposal: Heidi teaches it)* | **Minor Heal** | 35 SP. Heals about twice your elemental attack. Not tied to the staff (Agni). |
| A quest, later | Second Wind | 50 SP. Heals 20% of max HP, once a fight. |
| A quest, later | Fury | 35 SP. +15% to both attacks for 5 ticks. |

**Bold** = build now. The rest are listed, not wired.

## Auto skill

One skill can be set as your **auto skill** (in the Skills panel, together with the hotbar). Whenever you have the
Spirit for it, it is already armed: the cursor is its crosshair over enemies, a tag says to pick a target, and a
click on an enemy fires it in place of a basic attack. With too little Spirit, clicks are basic attacks again.
It never moves you and never fires without a click.

## What the engine needs, by when

- Now: skills tied to a weapon and a level; a heal; a short buff counted in ticks (Fortify); the auto skill.
- Later: multi-hit, bonus damage on low-HP targets, life drain, a blast around a chosen hex, a push.
- Much later: statuses (stun, poison, root).
