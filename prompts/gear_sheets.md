# Gear and relic icon sheets

Drafted 2026-11-08. Gear and relics are **inventory icons**, like the `grok_items` sheet (wood, ores, mushrooms): seen from the front, not the 35° view used for things standing on the hex field. Grok paints them.

Every sheet's rows and columns mean something, so the cutter can name the files: on the armour sheets **each row is one set** and each column one slot; on the weapon sheets each row is one weapon type and each column one tier.

**After generating:** as in `hex_sprites.md`: put the sheet in `extras/`, add it to `SHEETS` in `tools/cut_sheets.py`, run the cutter.

**Do first:** sheet 1 (elemental sets). It tests whether the style holds up on fantasy materials.

## Template
Paste as one block; change only the four Row lines. For the relic sheet (glass, amber), swap the background line for pure green (#00FF00).

```
A sprite sheet of 16 separate inventory icons for a fantasy RPG, in a 4 by 4 grid of equal square cells. Square image, 1:1.

Style for every icon: hand-painted and stylised with a touch of realism, chunky readable shapes, clean silhouette, soft painterly shading, rich colours, lit from the upper left. Like item icons in a cozy fantasy RPG. Not pixel art, not low-poly, not photoreal, no outlines.

Camera for every icon: seen from the front, very slightly from above, the whole object in view, the way an item is shown in an inventory. Armour is shown on its own, not worn: no body, no mannequin, no stand. Every icon has the same camera and the same lighting.

Each row is one matching set: the four pieces in a row share the same materials, trim, rivets, colour scheme and decoration, so they read as one outfit. Each row is clearly different from the others.

Each icon sits alone in the centre of its cell, with empty space around it, not touching any other icon. No ground, no shadow, no stand.

No glow, no light rays, no sparkles, no flames, no magic effects. Elemental themes are shown only through materials, colours and shapes.

The background is one solid, flat, pure magenta colour (#FF00FF), continuous behind every icon across the whole image. Do not draw a card, panel, frame or box behind any icon. No gradient, no texture, no grid lines, no borders, no text, no labels, no numbers.

Row 1: ...
Row 2: ...
Row 3: ...
Row 4: ...
```

## Sheet 1: elemental sets (the style test)
Light armour leaning to elemental attack, precision and speed: the caster and archer line. Columns: helm, body, boots, bow.
```
Row 1 (fire): a hood of charcoal-black scale with ember-orange enamel plates shaped like flame tongues; a fitted coat of the same black scale and orange enamel, with flame-shaped shoulder plates; boots of the same, with orange enamel shin plates; a recurve bow of blackened wood with ember-orange enamel tips shaped like curling flames.
Row 2 (water): a helm of pearl-white shell and teal scale with a fin-shaped crest; a coat of overlapping teal scales with pearl-white shell shoulder plates; boots of the same teal scale and shell; a bow of pale driftwood bound with teal scale, its tips shaped like curling waves.
Row 3 (wind): a light silver-grey hood with feather-shaped plates swept back; a light coat of pale grey cloth and silver feather-shaped plates; boots of the same, with small feather shapes at the ankles; a long, slender pale bow with silver tips shaped like swept-back feathers.
Row 4 (earth and nature): a helm of dark wood and moss-green leather with a crest of carved leaves; a coat of bark-brown plates and moss-green leather, with carved leaf shapes; boots of the same bark and moss leather; a heavy bow of living dark wood with small green leaves growing along it.
```

## Sheet 2: the main ladder, tiers 1 to 4
Columns: helm, body, boots, shield.
```
Row 1 (traveller's, level 1): a patched brown cloth hood; a patched, worn travelling tunic of brown and grey cloth with a rope belt; worn soft brown leather boots; a small round shield of plain wooden planks with a rope-bound rim.
Row 2 (padded leather, level 10): a padded brown leather cap; a quilted padded leather jerkin with buckled straps; sturdy brown leather boots with buckles; a round wooden shield with a leather-wrapped rim and an iron boss.
Row 3 (iron, level 20): an open-faced iron helmet with a nose guard; an iron breastplate with shoulder plates and riveted edges; leather boots with iron shin plates; a kite shield of plain grey iron with a riveted rim.
Row 4 (silversteel, level 30): a pale, bright steel helmet with fine engraved lines; a breastplate of pale bright steel with engraved trim; boots with pale bright steel plates; a heater shield of pale bright steel with an engraved border.
```

## Sheet 3: the main ladder, tiers 5 to 8
Columns: helm, body, boots, shield. Sunforged and moonforged are the light and dark pair at the top.
```
Row 1 (adamantine, level 40): a helmet of deep green metal with bronze trim; a breastplate of deep green metal with bronze trim and layered shoulder plates; boots of the same green metal and bronze; a heater shield of deep green metal with a bronze border.
Row 2 (sangreal steel, level 50): a helmet of dark crimson steel with black trim and a swept crest; a breastplate of dark crimson steel with black trim and sharp layered plates; boots of the same crimson and black steel; a shield of crimson steel with a black border and a sharp lower point.
Row 3 (sunforged, light): a helmet of white enamel and polished gold with a sun-ray crest; a breastplate of white enamel and polished gold with a sun-ray design; boots of white enamel and gold; a round shield of white enamel and gold with a sun-ray boss.
Row 4 (moonforged, dark): a helmet of black metal with silver trim and a crescent-moon crest; a breastplate of black metal with silver trim and a crescent design; boots of black metal and silver; a round shield of black metal with a silver crescent boss.
```

## Sheet 4: weapons
Rows: weapon types. Columns: iron, silversteel, adamantine, sangreal steel.
```
Row 1: a one-handed sword in each of the four metals (plain grey iron; pale bright steel with fine engraving; deep green metal with a bronze guard; dark crimson steel with a black guard).
Row 2: a one-handed axe in each of the four metals, same order.
Row 3: a spear in each of the four metals, same order, each with a wooden shaft.
Row 4: a flanged mace in each of the four metals, same order.
```

## Sheet 5: bows, daggers and the light and dark weapons
```
Row 1: a plain wooden shortbow; a longbow of pale ash wood with steel-capped tips; a recurve bow of deep green wood with bronze fittings; a recurve bow of dark red wood with black fittings.
Row 2: a dagger in each of the four metals, same order as the weapons sheet.
Row 3: a leather quiver of arrows in each of four styles: plain brown leather; tooled leather with steel fittings; green leather with bronze fittings; dark red leather with black fittings.
Row 4: a sunforged sword of white enamel and gold; a sunforged bow of white wood and gold; a moonforged sword of black metal and silver; a moonforged bow of black wood and silver.
```

## Sheet 6: relics from Dawn's Journey
Pure green background (#00FF00): the orb's glass and the amber earrings would pick up magenta.
```
Row 1 (Hela's Toys): a coiled black leather whip with a steel-capped handle; a black ribbed leather corset with steel boning and red lacing; a pair of black silk garter straps with small steel buckles; a black leather choker with short steel spikes.
Row 2 (Sovereignty of Hell): a pair of teardrop earrings of deep orange amber set in blackened gold; a long ceremonial dress of deep red and orange cloth with layered folds shaped like flames, shown on its own; a crown of blackened gold with tall flame-shaped points set with red stones; a glass orb on a blackened gold stand with a small dark red crown shape inside the glass.
Row 3 (Primordial Fossil, Trinkets of the Sky): a fragment of dark volcanic rock with a spiral ammonite fossil and orange-red cracks; a pale blue-grey spiral ammonite fossil with a frost-white crust; a silver ring shaped like a pair of small wings; a pair of silver bracers shaped like wings.
Row 4 (Trinkets of the Sky, Dragon Rider, Motherland Calling): a silver pendant shaped like spread wings on a fine chain; a leather flying helmet with goggles and small green dragon-scale plates; a large curved dragon tooth on a leather cord; a worn battle horn with brass bands.
```
