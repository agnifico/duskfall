// Trace: turn a painted map into data layers by colour.
// Every pixel gets one class; sliders set the colour rules. Plain script (window.Trace).

(function () {
  const CLASSES = [
    // id, name, preview colour
    [0, 'deep sea', [24, 52, 96]],
    [1, 'shallows', [70, 150, 200]],
    [2, 'lake', [40, 120, 220]],
    [3, 'river', [0, 190, 255]],
    [4, 'green land', [120, 180, 90]],
    [5, 'forest', [40, 100, 50]],
    [6, 'dry grass', [200, 190, 100]],
    [7, 'sand', [235, 205, 140]],
    [8, 'rock', [130, 110, 95]],
    [9, 'snow', [250, 250, 255]],
    [10, 'polar ice', [200, 225, 240]],
    [11, 'salt flat', [255, 240, 225]],
  ];
  const C = { SEA: 0, SHALLOW: 1, LAKE: 2, RIVER: 3, GREEN: 4, FOREST: 5, DRY: 6, SAND: 7, ROCK: 8, SNOW: 9, ICE: 10, SALT: 11 };
  const isWaterClass = (c) => c <= 3;

  const PARAMS = [
    // key, label, min, max, step, default
    ['waterHueMin', 'Water hue from', 140, 200, 1, 182],
    ['waterHueMax', 'Water hue to', 200, 270, 1, 250],
    ['waterSat', 'Water min saturation', 0, 1, 0.01, 0.25],
    ['shallowV', 'Shallows brighter than', 0, 1, 0.01, 0.62],
    ['seaErode', 'River max width (px)', 1, 12, 1, 4],
    ['whiteV', 'White brighter than', 0.5, 1, 0.01, 0.8],
    ['whiteS', 'White max saturation', 0, 0.5, 0.01, 0.18],
    ['iceY', 'Polar ice above (fraction of height)', 0, 0.4, 0.01, 0.12],
    ['snowNear', 'Snow within px of rock', 0, 60, 1, 24],
    ['snowRock', 'Snow needs rock share around', 0, 1, 0.01, 0.3],
    ['rockS', 'Rock max saturation', 0, 0.6, 0.01, 0.3],
    ['rockV', 'Rock darker than', 0.3, 1, 0.01, 0.8],
    ['forestV', 'Forest darker than', 0.1, 0.8, 0.01, 0.42],
    ['sandV', 'Sand brighter than', 0.3, 1, 0.01, 0.62],
    ['cleanup', 'Cleanup radius (px)', 0, 4, 1, 2],
  ];

  function hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d > 0) {
      if (mx === r) h = 60 * (((g - b) / d) % 6);
      else if (mx === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return [h, mx === 0 ? 0 : d / mx, mx];
  }

  // Keep the most common class in a (2r+1)^2 window. Water classes are left alone so rivers stay thin.
  function modeFilter(cls, W, H, r) {
    if (r <= 0) return cls;
    const out = new Uint8Array(cls), hist = new Int32Array(CLASSES.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (isWaterClass(cls[i])) continue;
      hist.fill(0);
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= H) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= W) continue;
          const c = cls[yy * W + xx]; if (!isWaterClass(c)) hist[c]++;
        }
      }
      let best = cls[i], n = -1;
      for (let c = 0; c < hist.length; c++) if (hist[c] > n) { n = hist[c]; best = c; }
      out[i] = best;
    }
    return out;
  }

  function majority3(mask, W, H) {
    const out = new Uint8Array(mask.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let n = 0, t = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        t++; n += mask[yy * W + xx];
      }
      out[y * W + x] = n * 2 > t ? 1 : 0;
    }
    return out;
  }

  // Mean of a 0/1 mask over a (2r+1)^2 box, via a summed-area table.
  function boxMean(mask, W, H, r) {
    const S = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) {
      let row = 0;
      for (let x = 0; x < W; x++) { row += mask[y * W + x]; S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + row; }
    }
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      const sum = S[y1 * (W + 1) + x1] - S[y0 * (W + 1) + x1] - S[y1 * (W + 1) + x0] + S[y0 * (W + 1) + x0];
      out[y * W + x] = sum / ((x1 - x0) * (y1 - y0));
    }
    return out;
  }

  function floodFromBorder(mask, W, H) {
    const seen = new Uint8Array(mask.length), stack = [];
    const push = (i) => { if (mask[i] && !seen[i]) { seen[i] = 1; stack.push(i); } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (stack.length) {
      const i = stack.pop(), x = i % W, y = (i / W) | 0;
      if (x > 0) push(i - 1); if (x < W - 1) push(i + 1);
      if (y > 0) push(i - W); if (y < H - 1) push(i + W);
    }
    return seen;
  }

  // img: ImageData. p: params. Returns { W, H, cls: Uint8Array, val: Uint8Array }.
  function classify(img, p) {
    const W = img.width, H = img.height, d = img.data, n = W * H;
    const cls = new Uint8Array(n), val = new Uint8Array(n);
    let water = new Uint8Array(n);
    const hs = new Float32Array(n), ss = new Float32Array(n), vs = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const [h, s, v] = hsv(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      hs[i] = h; ss[i] = s; vs[i] = v; val[i] = Math.round(v * 255);
      const white = v > p.whiteV && s < p.whiteS;
      water[i] = !white && h >= p.waterHueMin && h <= p.waterHueMax && s > p.waterSat ? 1 : 0;
    }
    water = majority3(water, W, H);

    // Sea = water reachable from the map edge through channels wider than the river width.
    const notWater = new Uint8Array(n);
    for (let i = 0; i < n; i++) notWater[i] = water[i] ? 0 : 1;
    const toShore = Gen.chamfer(W, H, notWater);
    const r = p.seaErode;
    const core = new Uint8Array(n);
    for (let i = 0; i < n; i++) core[i] = water[i] && toShore[i] > r ? 1 : 0;
    const seaCore = floodFromBorder(core, W, H);
    const lakeCore = new Uint8Array(n);
    for (let i = 0; i < n; i++) lakeCore[i] = core[i] && !seaCore[i] ? 1 : 0;
    const toSeaCore = Gen.chamfer(W, H, seaCore);
    const toLakeCore = Gen.chamfer(W, H, lakeCore);

    // Land first, so white can look for nearby rock.
    const rock = new Uint8Array(n), sand = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (water[i]) continue;
      const h = hs[i], s = ss[i], v = vs[i];
      let c;
      if (v > p.whiteV && s < p.whiteS) c = -1; // decided below
      else if ((s < p.rockS && v < p.rockV) || (h >= 15 && h < 40 && v < 0.5)) c = C.ROCK;
      else if (h >= 70 && h < 170 && v < p.forestV) c = C.FOREST;
      else if (h >= 25 && h < 55 && v > p.sandV && s > 0.2) c = C.SAND;
      else if (h >= 40 && h < 75) c = C.DRY;
      else c = C.GREEN;
      cls[i] = c < 0 ? 255 : c;
      if (c === C.ROCK) rock[i] = 1;
      if (c === C.SAND || c === C.DRY) sand[i] = 1;
    }
    // White is snow when enough of its surroundings are rock; otherwise salt.
    const toRock = Gen.chamfer(W, H, rock);
    const rockAround = boxMean(rock, W, H, 40);
    const iceLine = p.iceY * H;
    for (let i = 0; i < n; i++) {
      if (water[i]) {
        if (toSeaCore[i] <= r + 1) cls[i] = vs[i] > p.shallowV || hs[i] < 190 ? C.SHALLOW : C.SEA;
        else if (toLakeCore[i] <= r + 1) cls[i] = C.LAKE;
        else cls[i] = C.RIVER;
      } else if (cls[i] === 255) {
        const y = (i / W) | 0;
        cls[i] = y < iceLine ? C.ICE : toRock[i] <= p.snowNear && rockAround[i] >= p.snowRock ? C.SNOW : C.SALT;
      }
    }
    return { W, H, cls: modeFilter(cls, W, H, p.cleanup), val };
  }

  function preview(ctx, src, res, opacity) {
    const { W, H, cls } = res;
    const out = ctx.createImageData(W, H), o = out.data, s = src.data;
    for (let i = 0; i < W * H; i++) {
      const col = CLASSES[cls[i]][2];
      for (let k = 0; k < 3; k++) o[i * 4 + k] = s[i * 4 + k] * (1 - opacity) + col[k] * opacity;
      o[i * 4 + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }

  function counts(res) {
    const c = new Array(CLASSES.length).fill(0);
    for (const k of res.cls) c[k]++;
    return c.map((v) => v / res.cls.length);
  }

  // Pack into a PNG: red = class x 20, green = brightness. Returned as a data URL.
  function pack(res) {
    const { W, H, cls, val } = res;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), o = img.data;
    for (let i = 0; i < W * H; i++) { o[i * 4] = cls[i] * 20; o[i * 4 + 1] = val[i]; o[i * 4 + 2] = 0; o[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }

  window.Trace = { CLASSES, PARAMS, classify, preview, counts, pack };
})();
