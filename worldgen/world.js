// The authored world. Everything here is placed by hand; gen.js adds the detail.
// Coordinates are the 1600 x 1000 space of ../world_layout.svg (north is up, and cold).
// Shapes are copied from that file: if a coastline changes there, change it here too.

// Plain script, not a module: modules do not load from file://.
window.WORLD = {
  width: 1600,
  height: 1000,

  // Land. Paths are SVG path strings; ellipses are [cx, cy, rx, ry].
  land: {
    paths: [
      // northern continent
      'M110,430 C80,330 100,200 170,130 C260,60 450,50 800,45 C1150,45 1380,60 1470,140 C1530,220 1530,420 1500,560 C1470,680 1420,770 1360,800 C1300,820 1230,780 1210,710 C1195,640 1220,560 1200,470 C1180,390 1150,320 1080,290 C1000,262 900,268 800,272 C680,272 600,265 560,290 C520,315 500,360 490,420 C480,470 450,500 400,490 C340,480 290,470 240,480 C180,490 130,480 110,430 Z',
      // southern continent
      'M250,660 C300,610 420,640 520,690 C620,740 720,770 820,760 C930,750 1040,720 1110,690 C1140,672 1170,668 1195,690 C1215,715 1195,760 1160,800 C1110,850 1090,920 1060,1000 L330,1000 C280,920 220,850 210,770 C205,720 215,690 250,660 Z',
      // Celtic isles (main)
      'M30,240 C50,220 80,230 82,260 C84,290 60,305 40,295 C22,285 18,255 30,240 Z',
      // Eastern isles (main)
      'M1555,230 C1575,225 1585,260 1578,300 C1572,340 1560,370 1548,372 C1540,350 1545,300 1546,270 C1547,248 1545,234 1555,230 Z',
      // Nuvatra
      'M730,445 C780,410 900,410 950,445 C990,475 985,545 945,575 C900,605 790,605 745,580 C700,555 690,480 730,445 Z',
    ],
    ellipses: [
      [55, 330, 16, 11],                                              // Celtic isles
      [560, 318, 14, 9], [595, 335, 11, 7], [630, 312, 9, 6],         // Hellenic isles
      [1570, 405, 10, 7],                                             // Eastern isles
      [1480, 880, 12, 8], [1525, 845, 9, 6], [1445, 930, 10, 7], [1540, 910, 13, 8], // Ocean isles
      [655, 515, 20, 13],                                             // Saints' forward port
      [805, 630, 15, 9], [840, 645, 12, 8], [875, 632, 10, 7],        // ice islets
    ],
  },

  // Land that must exist even if noise would open it: [x1, y1, x2, y2, radius].
  bridges: [
    [1183, 688, 1218, 712, 11], // the land bridge (where the Saints' canal will go)
  ],

  // Shallow sea floor that stays under water: ellipses [cx, cy, rx, ry, rotationDeg].
  shoals: [
    // the turtle, seen from above: shell, head, four flippers, tail
    [1010, 600, 26, 18, 0],
    [1042, 596, 8, 6, 0],
    [1030, 582, 12, 5, -35], [1030, 618, 12, 5, 35],
    [990, 586, 9, 4, 30], [990, 614, 9, 4, -30],
    [981, 601, 5, 2.5, 0],
  ],

  // Mountain ranges: a line of points, crest height in metres, half-width in pixels.
  ranges: [
    { name: 'western spine',  h: 2600, w: 20, pts: [[400, 110], [385, 220], [360, 320], [330, 420]] },
    { name: 'southern alps',  h: 3400, w: 17, pts: [[130, 335], [230, 322], [335, 332]] },
    // runs diagonally from the sea's north shore up into the polar dome
    { name: 'low divide',     h: 1300, w: 14, pts: [[690, 255], [745, 190], [805, 125], [835, 85]] },
    { name: 'great range',    h: 5200, w: 26, pts: [[1110, 140], [1200, 225], [1300, 295], [1375, 385]] },
    { name: 'plateau rim',    h: 2900, w: 16, pts: [[1150, 300], [1225, 380], [1268, 470]] },
    { name: 'east coast hills', h: 1600, w: 18, pts: [[1440, 150], [1475, 300], [1470, 470]] },
    { name: 'spice ghats',    h: 1300, w: 11, pts: [[1222, 575], [1232, 700]] },
    { name: 'delta divide',   h: 1800, w: 14, pts: [[1330, 560], [1340, 700], [1350, 790]] },
    { name: 'eastern isles spine', h: 2600, w: 7, pts: [[1556, 238], [1562, 300], [1552, 362]] },
    { name: 'atlas',          h: 3000, w: 17, pts: [[255, 682], [335, 662], [430, 685]] },
    { name: 'west coast hills', h: 1500, w: 18, pts: [[222, 760], [240, 860], [280, 950]] },
    { name: 'polar dome',     h: 2200, w: 34, pts: [[230, 78], [800, 62], [1380, 82]] },
  ],

  // Single peaks: [x, y, height m, radius px].
  peaks: [
    [840, 495, 3900, 46],  // Nuvatra's mountain (the dragon temple)
    [560, 318, 1300, 11],  // Kallisti volcano
    [700, 860, 2100, 34],  // desert massif
    [52, 262, 900, 18],    // Celtic highlands
  ],

  // Broad raised ground: [x, y, height m, radius px].
  plateaus: [
    [1250, 255, 2300, 115], // high plateau behind the great range
    [1235, 385, 1100, 72],  // Persian plateau
    [1095, 830, 1600, 75],  // southern highlands
    [840, 500, 500, 95],    // Nuvatra uplands
  ],
};
