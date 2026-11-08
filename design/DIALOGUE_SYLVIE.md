# Sylvie's opening: dialogue draft

> **Revised flow (Agni, 2026-11-08), which overrides the scenes below where they differ.** It opens on Arrival Beach with Sylvie already there, and they talk. Three riled crabs/toxolotls converge, and you fight them (level 2). Sylvie: "let's get to my house." The scene switches to Sylvie's Home, where she asks your name (the picker; rename freely after). Quest 1 is clearing enemies around her house and on Arrival Beach (not the Pine Grove), and she gives the weapon as you set out. Then Firewood. The Pine Grove opens later, in the 5–10 stretch.

**A draft, for Agni to rewrite.** It follows `design/STORY.md` (Arc 1) and Sylvie's voice from `npcs.json`: dry, practical, warm underneath. Lines marked ▸ are what the player says. **[System]** marks what the game does at that point, for wiring the quest system.

---

## Scene 1: Arrival Beach, morning

*[System] The opening panels end (night, storm, fire and thunder). You wake on the sand at the edge of the beach. Gulls. Sylvie is walking up from the tide line.*

**Sylvie:** Don't sit up too fast. You've swallowed half the sea.
**Sylvie:** Can you stand? Good. Lean on me if you need to. Nobody washes up on this side of the island.
▸ *Where am I?*
**Sylvie:** Nuvatra. North shore. My house is just past the trees, up the slope. There's a fire and dry clothes.
**Sylvie:** Come on. Talk when you've stopped shaking.

*[System] Quest starts: **Washed Ashore**, with one step: "Go to Sylvie's house." Sylvie walks off toward the forest edge. The way to Sylvie's Home opens.*

---

## Scene 2: Sylvie's Home

*[System] Inside, or on the porch. Sylvie hands you a cup.*

**Sylvie:** Drink. It's only herbs, but it'll warm you.
**Sylvie:** I'm Sylvie. I keep the woods and grasslands on this side of the island. And you are?

*[System] **The name picker.** Choose from the list (Dawn is the default). The rest of the scene uses the name.*

**Sylvie:** {name}. Pretty. Where did you come from, {name}?
▸ *I don't… I remember a storm. Fire on the water. Thunder that didn't stop.*
**Sylvie:** There was a storm. Off the north coast, all night. I watched it from the ridge.
**Sylvie:** Funny thing. The sky over the island stayed clear. Only out there, on the water.
▸ *A ship? People?*
**Sylvie:** Just you, and some planks. Whatever you were on, the sea has it now. I'm sorry.
**Sylvie:** You can stay here as long as you like. This island's quiet. Usually.
▸ *Usually?*
**Sylvie:** The animals have been… wrong, lately. Jumpier. Meaner. I keep telling myself it's the weather.

*[System] A crash outside. The ambush: two level 1 enemies (a crab runt and a toxolotl, or two of either) by the house. You're unarmed, so each takes about 7 hits. Sylvie stays back.*

**Sylvie:** Speak of it. Stay behind me. No, wait, you can fight?

*[System] The fight. Beating both takes you to **level 2** (50 XP).*

**Sylvie:** …Well. You've done that before, whoever you are.
**Sylvie:** That's what I mean. A crab doesn't walk up to a house and pick a fight. Not on Nuvatra.

*[System] Quest complete: **Washed Ashore**.*

---

## Sylvie's first quest: Thinning the Wilds (combat)

**Sylvie:** If you're staying, I could use your hands. There's more of that out in the Pine Grove, and I can't be everywhere.
**Sylvie:** Here. It was my brother's. Better than fists.

*[System] You get the **Traveller's sword** (or the weapon of your choice, if weapon kinds become a choice). The feel target: unarmed fights took about 7 hits; now they take about 4.*

**Sylvie:** Clear out what you find. Don't go past the grove. The plains are worse, and you're not ready for them.

*[System] Quest starts: **Thinning the Wilds**. Step: beat 6 enemies in the Pine Grove. Reward: XP worth about 4 kills at that level, and 3 minor health potions.*

**On return:**
**Sylvie:** Still in one piece. I'm impressed, and I don't say that much.

---

## Sylvie's second quest: Firewood (gathering)

**Sylvie:** One more thing, and it's a dull one. The nights are getting cold, and my woodpile isn't.
**Sylvie:** Twenty wood from the trees around here. Mind the stumps; they need a day to grow back.

*[System] Quest starts: **Firewood**. Step: bring Sylvie 20 wood (it's taken from your bag). Reward: XP, seed bread ×3, and a Traveller's piece (the hood?).*

**On return:**
**Sylvie:** That'll see me through the week. Thank you, {name}. Truly.

---

## After both: the hook to the drill

**Sylvie:** There's something I haven't told you. There's a village to the north-east, at the old mine. A few weeks ago, ships came. Men in gold and white.
**Sylvie:** They put up a machine. A drill, they call it. The villagers hate it, and the animals started acting up about the same time.
**Sylvie:** Maybe that's nothing. Would you go and look? You're better at walking into trouble than I am.

*[System] Quest starts: **The Drill** (Arc 2).*

---

## Open points for Agni
1. **The level gap.** Sylvie sends you to the drill after her two quests, around level 4–5. But the Drill area is planned at levels 15–25. Which is it?
   - **a)** Sylvie sends you there at 5, and the Drill's first part is low-level: talking to Claudia and Cygwin, small jobs. The level 15–25 content comes later in the arc.
   - **b)** Something fills levels 5–15 first (Pine Grove quests, more from Sylvie, the plains), and the drill hook comes at about 15.
2. **The first weapon:** given when quest 1 starts (as drafted, so the clearing quest is the "it got easier" moment), or as its reward?
3. **Choosing a name inside the dialogue** (drafted), or before the game starts?
4. **Sylvie's brother:** I invented him so the sword has a story. Keep him, cut him, or make him a hook?
