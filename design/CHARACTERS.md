# Characters: who's who, and where their art is

Surveyed 2026-11-09. Sources:
- **DJ data:** `~/Documents/code/dawns-journey/v2/src/lib/assets/data/npcs/*.json` (name, title, description) and the bible, `~/Documents/art/dawns_journey_bible_v2.docx` (element, affiliation, location).
- **DJ art:** `~/Documents/code/dawns-journey/v2/static/images/characters/<name>/` and `static/images/sprites/npc/<name>/`.
- **Else:** `~/Documents/art/Else/characters/` (39 folders and 126 loose images).
- **Lab:** the combat lab, `~/Desktop/code/dawns-journey-combat-lab/` (`src/lib/data/characters/*.ts`, `static/characters/avatars*`, `static/sprites`).

## In Duskfall now
| Character | Title (DJ) | Element (DJ bible) | Art used here | Duskfall role |
|---|---|---|---|---|
| Heroine | | | Else `protagonist` | the player; her name means dawn |
| Sylvie | | Earth | DJ `sylvie` | arc 1 host; her family farmstead |
| Heidi | | | Else `Heidi` | Pine Grove healer, infusion |
| Claudia | Whisper of the Tundra | Water / Wind (frost mage) | `extras/` DJ-style sprites | the Drill; later the Theos sword of ice |
| Cygwin | War Cry of the Savannah | Light / Earth | `extras/` DJ-style sprites | the Drill; later the Theos sword of fauna |
| Verona | Crown of Wandering Leaves | | **DJ `verona`** (laurel crown, green jewel) | Lily Ponds; carries Xochi |
| Sister Aurelie | | | `extras/sprites_for_later/village_priestess.jpg` | Saltmere's priestess (new) |
| Marisol, Brann, Old Tova | | | Gemini portraits, 2026-11-09 | Saltmere villagers (new) |

## Waiting for their place
- **Dawn's Journey:** Hela (Dark / Fire, *the Dawn*), Veres (Dark / Wind, *The Watching Wing*), Guinevere (Light / Dark, *The Velvet Crown*), Marjane (Water, sovereign of the Marjana Trench), Minerva (Light, Saints, rapier and golden shield), Nemesis (later Ash in the NSFW project), Aoife, Alice, Bonnie.
- **The combat lab** (DJ extended): Maria Elena (fire; Iberian or desert lands), Carla (dark), Frosty (water), Jamilya (wind), June 9 (nature), Luna (water), Midorima (wind), Nephthys (water; spelled *Nepthys* in the lab), Ryoma (dark), Sefyra (light). Avatars with no character file yet: Cedric, Yara, Marina, Elena.
- **Else only:** Akari, Ariana, Citra, Hanabi (= Aoife, see below), Nyx, "fighter girl", `second_gen`.

## Problems found
1. **Verona has two looks.** DJ's art (brown hair, laurel crown, green jewel, teal cloak) fits her title; `Else/verona` is a different woman (dark hair with green ends, close to Sylvie's palette). Duskfall now uses DJ's. *Decide what `Else/verona` is.*
2. **Aoife = Hanabi.** Nine of DJ's Aoife images are in `Else/hanabi`. One character, two names. *Pick one.*
3. **Akari / Claudia:** one image is both `Else/akari/...lr5rfb...png` and `claudia4.png` (DJ and Else). *Which is it?*
4. **Claudia's and Sylvie's sprite folders share 16 identical frames** (`CLAUDIA_SPIRTES` and `SYLVIE_SPIRTE`, e.g. `1h_halfslash.png`). One was probably copied from the other.
5. **Alice has two looks:** `Else/alice` (black hair, red top, beach, pistol) and DJ (short purple hair, navy coat, pistol).
6. **Minerva:** the bible says white hair; both art sets show blonde.
7. **Young / adult mix:** DJ's `guinevere5.png` is in `Else/young_guinevere`; `young_claudia` (pale blonde, ice sword) looks like a different person from Claudia.
8. **Folder names:** `CLAUDIA_SPIRTES`, `SYLVIE_SPIRTE` (typos); `HEALER_SPRITE` (who? Heidi?); `VERES_SPRITE` and `VERES2_SPRITES` (two sets).
9. **Lab duplicates:** `avatars` and `avatars2` repeat Carla, Frosty, Sefyra, Maria Elena, Midorima and June 9; `elena.png` next to `maria_elena.png` (same person?); `maria_elena2 copy.png`.
10. **126 loose images** in `Else/characters` (`TA-…`, `player1–19`, UUIDs), some copies of filed ones. They need sorting into folders.

## Settled 2026-11-09
Verona: DJ's art is the reference. Aoife is the name (Hanabi is the same character). Akari is dropped (to be redone from scratch for the Shadowhand, under another name). Alice: hairband, short hair, a gunslinger's look. Minerva: blonde (the drift was kept). Young Guinevere, Claudia and others: story scenes only. `HEALER_SPRITE` is Heidi. The `*_SPRITE(S)` folders are LPC sheets: not usable here (outfit layers drop out when walking). The loose images in `Else/characters` are where to look for one-off characters; sorting them can wait.

## Settled 2026-11-09 (art pass)
Hela has three forms: naive (the island; red top, flame in hand), Queen of Hell (regalia: crown, armour, gown, throne), adventurer (black bodysuit, rides a bike). Everyone is drawn attractive and likeable, body-positive, never as a villain stereotype (Brann sides with the Saints and still isn't drawn as a bad man). References for each figure: `prompts/characters.md`; prompts with their pictures: `prompts/characters.html`.
