# Item icons and the opening scene (2026-11-08)

## Sheet: items without art (16, Gemini or Grok)
Attach `extras/sheets/items/Tx2vt.jpg` (wood, ores, mushrooms) as the style reference, so they sit in the same bag.

```
Inventory item icons for a fantasy RPG, matching the style of the attached sheet. 16 icons in a 4 by 4 grid, one per cell, each alone with space around it. Flat magenta #FF00FF background everywhere, no shadows, no cards or frames, no text.

Row 1: a crab shell; a rolled boar hide; a few pieces of sea glass; a soft glowing salamander frill
Row 2: a folded bear pelt; a large curved fang; a single dragon scale; a small stack of gold coins
Row 3: a round loaf of seed bread; a cup of mint tea; a smoked crab claw; a honey cake
Row 4: a small red potion; a larger red potion; a blue tonic in a tall bottle; a yellow-green energy drink in a flask
```

Order for the cutter (`ITEMS2`): crab-shell, boar-hide, sea-glass, toxolotl-frill, bear-pelt, prowler-fang, dragon-scale, coin, seed-bread, mint-tea, smoked-claw, honey-cake, minor-health-potion, health-potion, spirit-tonic, energy-draught.

## The opening: four pictures (Gemini, 16:9, one per image)
Shown full-screen under the narration, one after another. Attach the heroine's figure (`game/public/sprites/grok_chars/heroine-stand.png`) for 2–4 so she reads as the same person. Save as `game/public/story/opening-1.webp` … `opening-4.webp` (PNG is fine too; tell me and I'll convert).

1. > A painted scene for a fantasy game's opening: night, a violent storm at sea, a small sailing boat climbing a huge wave, lightning far off. Wide, dark, dramatic. 16:9.
2. > The same storm, from just under and at the surface: a young woman (the attached character) thrown into black water, the wrecked boat above her. Cold, desperate, mostly dark blues. 16:9.
3. > The same storm: above the drowning woman, a burst of fire and lightning over the water, as if something powerful has arrived. We don't see who. Fire and storm colours against the dark. 16:9.
4. > The woman carried away on a rush of wind and water through the storm, unconscious, toward a faint grey dawn on the horizon. 16:9.

## Next item icons (to batch with the next sheet)
crab meat (raw, white and pink, out of the shell); grilled crab (on a skewer or a leaf, charred).

## Next field prop
A small lighthouse or beacon tower, lit, for the way out on fog maps (hex-field prop, same view as the other props, `prompts/hex_sprites.md`).

## Drill arc: one icon and one node (2026-11-09)
- Item icon (with the next item sheet): **iron ore**, rust-red rock with dark metal flecks.
- Hex-field node (with the next node sheet, `prompts/hex_sprites.md`): **an iron vein**, a rock face streaked rust-red; plus its spent version (rubble works for now).

## Saltmere: the Saints' fountain (hex-field prop, `prompts/hex_sprites.md`)
A small stone fountain with clean water and a golden sun carved on it: the Saints' gift to the village.
