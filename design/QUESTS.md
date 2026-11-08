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

## Story mode
While a beat plays, the HUD hides and black bars close in at the top and bottom. Click, Space or Enter goes on. Beats wait in the save, so a reload replays them.

## Areas that open with the story
A point gets `"opensWith": { condition }` and `"closedText": "Not yet"`. Until the condition holds, its map pin is greyed out with that text, and travel to it is refused. A `goto` effect still takes you there.

## Not yet
- **NPCs placed by the story.** Sylvie appears on the beach only in the dialogue, not as a figure.
- **Image-driven scenes** (their own session).
- **Level bands per area.**
- **Riled enemies' red tint.**
- **Enemy spawn zones in the editor.**
