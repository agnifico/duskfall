# Hex sprite sheets

Decided 2026-11-06: **Grok paints the objects.** Gemini replaces a sheet only where Grok gets it wrong, and each sheet comes from one tool.

**After generating:** put the sheet in `extras/`, add a line for it to `SHEETS` in `tools/cut_sheets.py`, then run, from this folder:

```
../nsfw_project/.venv/bin/python -I tools/cut_sheets.py
```

**Tips**
- **Always 16 objects per sheet, square.** Grok's square images are the largest (2000 px). Its wide ones come out at 1168 px.
- **Glows and magic light are added in code, never painted.** Painted glow mixes with the magenta background and can't be cut out cleanly.
- **Glass, nets and mesh pick up the magenta** (the wreckage sheet's lantern glass and net did). For a sheet of glassy or see-through things, ask for a pure green background (#00FF00) instead; the cutter reads the colour from the sheet.

## Template
Paste as one block; change only the four Row lines.

```
A sprite sheet of 16 separate game objects for a fantasy RPG, in a 4 by 4 grid of equal square cells. Square image, 1:1.

Style for every object: hand-painted and stylised with a touch of realism, chunky readable shapes, clean silhouette, soft painterly shading, rich natural colours, lit from the upper left. Like props in a cozy fantasy strategy game. Not pixel art, not low-poly, not photoreal, no outlines.

Camera for every object: the same three-quarter view from above, looking down at about 35 degrees, like an isometric game prop. Every object has the same camera angle and lighting.

Each object stands alone in the centre of its cell, with empty space around it, not touching any other object. No ground, no grass base, no tile, no platform, no shadow. Exception: objects that are part of the ground (a well, a fire pit, a pond, a plaza, a garden bed) are shaped as a flat hexagon with one point at the top and one at the bottom, seen from the same angle.

No glow, no light rays, no sparkles, no magic effects around any object. Nets, ropes, fences and meshes are drawn solid and opaque, with no background showing through them.

The background is one solid, flat, pure magenta colour (#FF00FF), continuous behind every object across the whole image. Do not draw a card, panel, frame or box behind any object. No gradient, no texture, no grid lines, no borders, no text, no labels, no numbers.

Row 1: ...
Row 2: ...
Row 3: ...
Row 4: ...
```

## Sheet: gathering nodes
Stumps, saplings and rubble are the used-up and regrowing states, so the art shows a spent node instead of fading it.
```
Row 1: a small, common leafy green tree; a slender birch tree with white bark marked with black, and light green leaves; a broad, old oak tree with a thick trunk; an etherwood tree with a white trunk and white bark and a crown of bright sky-blue leaves, coloured blue but not glowing.
Row 2: a cut tree stump with a few wood chips around it; a young sapling; a few small grey stones lying together; a single large grey boulder.
Row 3: a cluster of four grey boulders; a cluster of grey boulders streaked with bright silver veins; a cluster of grey boulders streaked with green banded malachite; a cluster of grey boulders streaked with gold veins.
Row 4: a cluster of grey boulders streaked with deep red crystal veins; a low pile of broken rock rubble; a berry bush with dark berries; a ring of brown and red mushrooms.
```

## Next sheet: Chapter 1 extras
```
Row 1: a wooden survey marker post with a small brass instrument on top; a brass surveying scope on a wooden tripod; a stack of wooden supply crates stamped with a golden sun; two wooden barrels.
Row 2: a wooden rowboat pulled up on land; a wooden signpost with two blank arrow boards, no writing; a short section of wooden fence; a stone water well shaped as a flat hexagon.
Row 3: a tide pool with rocks and starfish, shaped as a flat hexagon; a clump of tall beach grass; a clump of ferns; a mossy tree stump.
Row 4: a small vegetable bed shaped as a flat hexagon; a wooden rack with fish hung up to dry; a pile of chopped firewood; a small wooden jetty section shaped as a flat hexagon.
```
