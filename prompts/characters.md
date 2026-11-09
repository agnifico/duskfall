# Character figures (Grok)

The figures that stand on the hex field. Right-facing only: the game mirrors them for left.
After generating: sheet into `extras/sheets/chars/`, add it to `SHEETS` in `tools/cut_sheets.py` with the names given, run the cutter.

## Rules (learned 2026-11-09, round 1 failed)
- **Ask for intent, not drawing instructions.** Say what the figure is for, give references, let Grok decide the rest. Add "how" only for something that went wrong on a previous run.
- **No character names in prompts.** "Heidi" pulled the cartoon child; Guinevere and Verona would pull Arthurian / other art. Say "the woman in picture 2".
- **Every character is an adult. Say so, with an age.** Grok drew the heroine and Heidi as children.
- **Say they are animation frames.** Grok drew four unrelated pictures. Say the frames swap in place, so the figure keeps the same size and spot.
- **One character per image.** Fewer references to mix up.
- **Everyone is attractive and likeable.** Body-positive: any age, build or height, but appealing in face, outfit or bearing. No one is drawn as a villain stereotype, even characters on the Saints' side (Brann). Grok's idea of beauty is odd: check old and heavy characters closely.
- **Picture 1 is always the style anchor:** `extras/sheets/chars/heroine-anchor.png`: the heroine's two frames cut from the sheet that worked (`7pwSI.jpg`). The full sheet also had Sylvie, and Grok sometimes drew Sylvie as the heroine. Prompts say to take only the style from it, not the person.

## Prompts and pictures
**All prompts live in `prompts/characters.html`** (open it in the browser): each sheet's pictures in attach order, its full prompt with a copy button, and the cutter names. Edit prompts there, not here.

Later: heroine outfits by region (same woman from her own sheet, new outfit for the land she's in; keeps her green pendant and earrings). Hela's bike as its own sheet once her adventurer form exists.
