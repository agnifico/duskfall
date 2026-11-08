# Area brief: the one page that makes an area

Agni writes or approves one of these; Claude builds the rest from it in one pass (a first map, enemies, drops,
items, gear, quests, daily quests, art prompts), then runs `python3 tools/check_content.py`. Agni paints the
map in the editor, makes the art, and playtests; `python3 tools/playtest_summary.py` turns the logs into numbers.

```
Area:            name, where on the land map, one map or several
Look:            terrain mix and how it flows (e.g. "sea west, grass middle, forest east, rock south")
Levels:          the range, e.g. 15–20 (enemies roll inside it, near the player's level)
Opens when:      the quest, tag or level that unlocks it
Enemies (3–4):   name, the feel (fast, tanky, ranged, territorial or still), where it lives (terrain), one material it drops
People:          who lives here, what they want, what they look like (for art)
Story beats:     2–3 main quest beats, and the one thing the player learns
Daily quests:    the kind of favours the people here ask (optional: Claude can draft)
Leaves with:     gear set or weapon, a new recipe or crafting tier, an ability
Unlocks next:    what this area opens
```

Numbers come from formulas, so the brief never needs them: enemy stats from their level (COMBAT.md › 7), gear
from its level, slot and set profile (`engine/gearFormula.ts`), XP from the kill curve.
