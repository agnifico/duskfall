# Quests and story: the format

Built 2026-11-08, modelled on Dawn's Journey's quests. Content goes in `game/src/content/quests.json`; the engine is `game/src/engine/story.ts`.

## A quest
```json
"firewood": {
  "title": "Firewood", "giver": "sylvie", "main": false,
  "text": "For the quest log.",
  "start": { "quest": "thinning-the-wilds", "state": "done" },
  "stages": [ … ]
}
```
- **`start`:** the quest begins by itself as soon as this holds, with a "New quest" banner.
- **`main`:** marks story quests. They show in gold in the tracker and the log.

## A stage
```json
{ "objective": "Bring Sylvie 20 wood", "who": "sylvie",
  "need": { "all": [{ "talk": "sylvie" }, { "have": "wood", "n": 20 }] },
  "remind": ["sylvie: Twenty wood. The trees round here won't mind."],
  "say": ["sylvie: That'll see me through the week."],
  "then": [{ "take": "wood", "n": 20 }, { "xp": 120 }] }
```
- **`auto: true`** makes a story beat: `say` plays the moment `need` holds. An auto stage with no `say` completes silently.
- **Without `auto`,** the stage plays when you talk to `who`: `say` if `need` holds, otherwise `remind`.
- **`then`** applies when the dialogue ends.

## Conditions (`need`, `start`, a point's `opensWith`)
| Condition | Holds when |
|---|---|
| `{ "talk": "sylvie" }` | you talk to her during this stage |
| `{ "enter": "sylvies-home" }` | you're in that point |
| `{ "kill": "boar", "n": 6, "at": ["arrival-beach"] }` | you've beaten n since the stage began. Kinds can be a list; `"*"` is any. `at` is optional |
| `{ "have": "wood", "n": 20 }` | it's in your bag (not taken; use the `take` effect) |
| `{ "level": 5 }` | your combat level is at least this |
| `{ "tag": "met-sylvie" }`, `{ "notTag": … }` | a story flag is set, or not |
| `{ "quest": "id", "state": "active" or "done" }` | another quest's state |
| `{ "all": […] }`, `{ "any": […] }`, `{ "not": … }` | combinations |

## Effects (`then`, and a choice's `then`)
`{ "give": "item", "n": 1, "wear": true }` · `{ "take": "item", "n": 20 }` · `{ "xp": 110 }` · `{ "tag": "x" }` · `{ "untag": "x" }` · `{ "goto": "point" }` (a scene jump) · `{ "spawn": [{ "kind": "riled-crab", "n": 2 }] }` (enemies appear 2–3 hexes away, already after you) · `{ "notify": "text" }`

## Dialogue lines
- `"sylvie: text"` is spoken by that person, with their portrait. `"you: text"` is the player. A line without a speaker is narration, shown on a dark box.
- `{name}` becomes the player's name.
- `{ "name": true }` opens the name list. It also sets the `named` tag, which unlocks renaming on the Profile.
- `{ "choose": [{ "text": "The sword", "then": [effects] }, …] }` offers a choice. Its effects apply when picked; record it with a tag.
- `{ "image": "story/opening-1.webp", "text": "caption" }` fills the screen with a picture (from `game/public/`), drifting slowly closer, with the caption as narration. It stays behind the lines after it until `{ "image": null }` (which can carry its own `text`) or the beat ends. A caption can be spoken (`"sylvie: …"`). Until the file exists, a dark ground shows instead. The opening uses five (`game/public/story/opening-1…5.webp`; sources in `extras/story/`).

## People placed by the story
A point's `"people": [{ "npc": "sylvie", "at": [row, col], "while": { condition } }]` stands that person on that hex while the condition holds. Nobody can walk through them. Sylvie stands on Arrival Beach until `met-sylvie`.

## Story mode
While a beat plays, the HUD hides and black bars close in at the top and bottom, and the field zooms one step closer than play allows (2.3× against 1.6×), framing you above the box; it eases back out when the beat ends. Click, Space or Enter goes on. Beats wait in the save, so a reload replays them.

## Areas that open with the story
A point gets `"opensWith": { condition }` and `"closedText": "Not yet"`. Until the condition holds, its map pin is greyed out with that text, and travel to it is refused. A `goto` effect still takes you there.

## Not yet
- **Level bands per area.**
- **Riled enemies' red tint.**
- **Enemy spawn zones in the editor.**

## Daily quests (built 2026-11-08)
People with a pool in `content/errands.json` get a **Daily quests** button on their card. Each offers 2 a day from their pool (a fixed pick per day, fresh at local midnight), from entries whose `opens` holds. Take one, do it, hand it in to them. Walking is free, so these live on the people, not at a central board. Taken ones show in the tracker (blue edge).
```json
{ "id": "sylvie.crabs", "title": "Crab Patrol", "ask": "what they say", "thanks": "on hand-in",
  "kill": { "kind": ["crab", "riled-crab"], "n": 4, "at": ["arrival-beach"] },   // or "bring": { "item": "wood", "n": 15 }
  "reward": [{ "xp": 50 }, { "give": "coin", "n": 10 }], "opens": { "quest": "thinning-the-wilds", "state": "done" } }
```
Kills count from when you take it; items are taken at hand-in. Pools: Sylvie (6, after Thinning the Wilds), Heidi (6, after The Healer in the Grove; the dragonling one from level 8). Later: affinity from hand-ins.
