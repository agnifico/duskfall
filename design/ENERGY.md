# Energy, gathering and skill XP

Agreed and built 2026-11-08. Numbers live in `game/src/engine/rules.ts`. Untested: settle by playing.

## The rule
Energy pays for **making things**: gathering, crafting, cooking (and later, repeatable errands for characters). **Walking, talking and fighting are free.** The board invites clicking around, so moving must never cost.

Energy is a daily budget you choose how to spend, not a brake on grinding. The brakes are:
1. **Regrowth:** a used node comes back each 15-minute cycle (with the enemies), so a map yields only so much per hour.
2. **The XP curve:** each level needs more.
3. **Outgrowing nodes:** past its level, a node gives 25% less XP per level (floor 10%).
4. **What a material can make:** low-tier wood never becomes Iron gear.

## Numbers
- **Bar:** 60 max, +1 every 20 s (empty to full in 20 min, ~180 an hour).
- **Gathering:** 1⚡ small tree / palm / pine / driftwood / small stones / berries / mushrooms; 2⚡ birch, boulder; 3⚡ oak, boulder cluster; 4⚡ etherwood, ore.
- **Crafting and cooking:** 1⚡ per thing made.
- **Seed bread** +15⚡; **stoking a fire** +15⚡ (1 wood, once per 15 min per fire).

| Node (by ⚡ cost) | XP | Full XP up to level | Needs level |
|---|---|---|---|
| 1 | 4 | 3 | 1 |
| 2 | 10 | 5 | 1 |
| 3 | 20 | 7 | 5 |
| 4 | 40 | 12 | 10 |

A node can set its own `xp` or `need`. Tool tiers no longer gate nodes; skill levels do.

**Skill levels:** cap 10. Total XP per level: 0, 60, 160, 320, 560, 920, 1460, 2260, 3460, 5260.

## Expected pace: woodcutting only, Arrival Beach + Sylvie's Home + Pine Grove
About 30 small trees, 13 birches and 20 oaks. Simulated living off regen, choosing the best XP per ⚡:

| Level | ⚡ spent | Time |
|---|---|---|
| 5 | ~130 | ~45 min |
| 6 | ~180 | ~1¼ h |
| 8 | ~380 | ~2¼ h |
| 10 | ~1100 | ~6 h |

Mixed play (three skills and crafting) puts woodcutting 5 around reaching the Pine Grove, and 10 at roughly 15–20 hours. Bigger maps don't speed this up: one bar covers fewer nodes than the maps hold, so more trees mean more choice and more scenery.

## To watch in playtests
- Whether 60 / 20 min feels like "a fair amount per reset".
- Whether Firewood (20 wood, about 3 birches) and the starting acorns still pace the opening.
- The energy draught (+10) is now small against a 60 bar.
