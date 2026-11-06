// Height layer: authored shapes from world.js, procedural detail from seeded noise.
// Plain script (window.Gen) so index.html opens straight from the file system.

(function () {
  // ---------- seeded noise ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const G = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]];

  function makeNoise(seed) {
    const rand = mulberry32(seed);
    const base = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
    const p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    function dot(h, x, y) { const g = G[h & 7]; return g[0] * x + g[1] * y; }
    function n2(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
      const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
      const u = fade(xf), v = fade(yf);
      const x1 = dot(aa, xf, yf) + u * (dot(ba, xf - 1, yf) - dot(aa, xf, yf));
      const x2 = dot(ab, xf, yf - 1) + u * (dot(bb, xf - 1, yf - 1) - dot(ab, xf, yf - 1));
      return (x1 + v * (x2 - x1)) * 1.4; // about -1..1
    }
    function fbm(x, y, oct) {
      let s = 0, a = 0.5, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f); norm += a; a *= 0.5; f *= 2; }
      return s / norm;
    }
    function ridged(x, y, oct) {
      let s = 0, a = 0.5, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) { const r = 1 - Math.abs(n2(x * f, y * f)); s += a * r * r; norm += a; a *= 0.5; f *= 2; }
      return s / norm; // 0..1, high on crests
    }
    return { n2, fbm, ridged };
  }

  // ---------- helpers ----------
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    const qx = ax + t * dx - px, qy = ay + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }

  function rasterMask(W, H, draw) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    draw(ctx);
    const d = ctx.getImageData(0, 0, W, H).data;
    const m = new Float32Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4] / 255;
    return m;
  }

  // Chamfer (3-4) distance to the nearest pixel where feature[i] is true. Result in pixels.
  function chamfer(W, H, feature) {
    const INF = 1e9, d = new Float32Array(W * H);
    for (let i = 0; i < d.length; i++) d[i] = feature[i] ? 0 : INF;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - W] + 3);
        if (x > 0) v = Math.min(v, d[i - W - 1] + 4);
        if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4);
      }
      d[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = d[i];
      if (x < W - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < H - 1) {
        v = Math.min(v, d[i + W] + 3);
        if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + W - 1] + 4);
      }
      d[i] = v;
    }
    for (let i = 0; i < d.length; i++) d[i] /= 3;
    return d;
  }

  function bilinear(f, W, H, x, y) {
    x = clamp(x, 0, W - 1.001); y = clamp(y, 0, H - 1.001);
    const xi = x | 0, yi = y | 0, tx = x - xi, ty = y - yi, i = yi * W + xi;
    const a = f[i] + tx * (f[i + 1] - f[i]);
    const b = f[i + W] + tx * (f[i + W + 1] - f[i + W]);
    return a + ty * (b - a);
  }

  // ---------- height ----------
  // opts: { seed, warp (px of coastline wander), rough (0..2 terrain noise) }
  function generate(world, opts) {
    const W = world.width, H = world.height;
    const N = makeNoise(opts.seed);

    const land = rasterMask(W, H, (ctx) => {
      for (const s of world.land.paths) ctx.fill(new Path2D(s));
      for (const [cx, cy, rx, ry] of world.land.ellipses) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
    });
    const shoal = rasterMask(W, H, (ctx) => {
      ctx.filter = 'blur(2px)';
      for (const [cx, cy, rx, ry, rot] of world.shoals) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, (rot * Math.PI) / 180, 0, Math.PI * 2); ctx.fill(); }
    });

    const isLand = new Uint8Array(W * H), isSea = new Uint8Array(W * H);
    for (let i = 0; i < land.length; i++) { isLand[i] = land[i] > 0.5; isSea[i] = !isLand[i]; }
    const toSea = chamfer(W, H, isSea);   // for land pixels: how far inland
    const toLand = chamfer(W, H, isLand); // for sea pixels: how far offshore
    const sdf = new Float32Array(W * H);
    for (let i = 0; i < sdf.length; i++) sdf[i] = isLand[i] ? toSea[i] - 0.5 : -(toLand[i] - 0.5);

    const elev = new Float32Array(W * H);
    const warp = opts.warp, rough = opts.rough;
    const wf = 1 / 110;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;

        // coastline: sample the authored distance field at a wandering position
        const wx = x + warp * N.fbm(x * wf, y * wf, 4);
        const wy = y + warp * N.fbm(x * wf + 31.7, y * wf + 17.3, 4);
        let s = bilinear(sdf, W, H, wx, wy) + 2.5 * N.fbm(x / 9, y / 9, 3);
        for (const [x1, y1, x2, y2, r] of world.bridges) s = Math.max(s, r - segDist(x, y, x1, y1, x2, y2));

        let e;
        if (s > 0) {
          const inland = 1 - Math.exp(-s / 140);
          e = 20 + Math.min(s, 6) * 12
            + 650 * inland * (0.5 + 0.5 * N.fbm(x / 260 + 5, y / 260 + 9, 3))
            + rough * 140 * N.fbm(x / 35, y / 35, 4);

          const coastFade = smooth(0, 5, s);
          let relief = 0;
          for (const r of world.ranges) {
            let d = 1e9;
            for (let k = 0; k < r.pts.length - 1; k++) {
              const [ax, ay] = r.pts[k], [bx, by] = r.pts[k + 1];
              d = Math.min(d, segDist(wx, wy, ax, ay, bx, by));
            }
            const w = r.w * (0.75 + 0.5 * (0.5 + 0.5 * N.fbm(x / 70 + 3, y / 70 + 3, 2)));
            if (d > w * 3.2) continue;
            const crest = Math.exp(-(d / w) * (d / w));
            relief += r.h * crest * (0.45 + 0.55 * N.ridged(x / 22, y / 22, 4));
          }
          for (const [px, py, h, rad] of world.peaks) {
            const d = Math.hypot(wx - px, wy - py);
            if (d > rad) continue;
            relief += h * Math.pow(1 - d / rad, 1.6) * (0.7 + 0.3 * N.ridged(x / 14, y / 14, 3));
          }
          for (const [px, py, h, rad] of world.plateaus) {
            const d = Math.hypot(wx - px, wy - py);
            if (d > rad) continue;
            relief += h * smooth(rad, rad * 0.45, d) * (0.85 + 0.15 * N.fbm(x / 40, y / 40, 3));
          }
          e += relief * coastFade;
        } else {
          const d = -s;
          e = -(40 + 160 * smooth(0, 22, d) + 3600 * (1 - Math.exp(-Math.max(0, d - 22) / 110)))
            + 180 * N.fbm(x / 60 + 11, y / 60 + 4, 3);
          const sh = shoal[i];
          if (sh > 0) e = e + (-14 + 6 * N.n2(x / 4, y / 4) - e) * sh;
        }
        elev[i] = e;
      }
    }
    return { W, H, elev };
  }

  // ---------- render ----------
  const SEA = [[-4200, [20, 46, 82]], [-2500, [30, 70, 116]], [-900, [46, 104, 152]], [-200, [80, 145, 190]], [-40, [130, 186, 214]], [0, [168, 210, 226]]];
  const LAND = [[0, [96, 140, 82]], [150, [124, 162, 96]], [450, [170, 182, 118]], [900, [198, 184, 132]], [1600, [176, 146, 104]], [2500, [140, 116, 92]], [3400, [150, 144, 140]], [4300, [225, 225, 225]], [5500, [255, 255, 255]]];
  function ramp(stops, v) {
    if (v <= stops[0][0]) return stops[0][1];
    for (let k = 1; k < stops.length; k++) {
      if (v <= stops[k][0]) {
        const [v0, c0] = stops[k - 1], [v1, c1] = stops[k], t = (v - v0) / (v1 - v0);
        return [c0[0] + t * (c1[0] - c0[0]), c0[1] + t * (c1[1] - c0[1]), c0[2] + t * (c1[2] - c0[2])];
      }
    }
    return stops[stops.length - 1][1];
  }

  // opts: { tints, shade, contours, paper, landStep, seaStep }
  function render(ctx, field, o) {
    const { W, H, elev } = field;
    const img = ctx.createImageData(W, H), px = img.data;
    const lx = -0.6, ly = -0.6, lz = 0.53; // light from the north-west
    const k = 1 / 90;                       // vertical exaggeration for shading
    const band = (e) => (e >= 0 ? Math.floor(e / o.landStep) : -1 - Math.floor(-e / o.seaStep));

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, e = elev[i], onLand = e >= 0;
        let c;
        if (o.paper) c = onLand ? [244, 238, 224] : [222, 234, 240];
        else if (o.tints) c = onLand ? ramp(LAND, e) : ramp(SEA, e);
        else c = onLand ? [200, 200, 200] : [150, 175, 195];
        c = c.slice();

        if (o.shade) {
          const xl = x > 0 ? elev[i - 1] : e, xr = x < W - 1 ? elev[i + 1] : e;
          const yu = y > 0 ? elev[i - W] : e, yd = y < H - 1 ? elev[i + W] : e;
          const dx = (Math.max(xr, 0) - Math.max(xl, 0)) * k, dy = (Math.max(yd, 0) - Math.max(yu, 0)) * k;
          const len = Math.sqrt(dx * dx + dy * dy + 4);
          const lit = (-dx * lx - dy * ly + 2 * lz) / len;
          const f = onLand ? 0.55 + 0.65 * lit : 1;
          c[0] *= f; c[1] *= f; c[2] *= f;
        }

        if (o.contours) {
          const b = band(e);
          const r = x < W - 1 ? elev[i + 1] : e, d = y < H - 1 ? elev[i + W] : e;
          const coast = (e >= 0) !== (r >= 0) || (e >= 0) !== (d >= 0);
          const crossed = b !== band(r) || b !== band(d);
          if (coast) c = o.paper ? [40, 60, 80] : [30, 40, 46];
          else if (crossed) {
            const hi = Math.max(e, r, d);
            const index = onLand ? Math.floor(hi / o.landStep) % 4 === 0 : Math.floor(-Math.min(e, r, d) / o.seaStep) % 2 === 0;
            const line = o.paper ? (onLand ? [150, 100, 60] : [110, 150, 180]) : [20, 25, 30];
            const a = index ? (o.paper ? 0.9 : 0.45) : (o.paper ? 0.45 : 0.2);
            c = [c[0] + a * (line[0] - c[0]), c[1] + a * (line[1] - c[1]), c[2] + a * (line[2] - c[2])];
          }
        }
        const j = i * 4;
        px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2]; px[j + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  window.Gen = { generate, render, chamfer };
})();
