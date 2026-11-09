<script lang="ts">
  // One point: hex ground drawn in code; painted objects and character figures on top, sorted back to front
  // so a figure can pass behind a tree. The player's figure walks the route hex by hex, alternating its two
  // frames and facing the way it moves; people turn to face the player.
  // Hovering a hex marks it as where you'd walk (walking is free, so no route or cost is drawn), with a chip naming
  // what's there. An enemy's chip sits below it, clear of the damage numbers floating up.
  // Enemies stand on the field too (engine/combat.ts): a territorial one's notice range is tinted red, and what
  // each enemy will do next is shown one tick ahead (an arrow for a move, red hexes for an attack). Walking goes
  // one hex per step, each a tick; clicking an enemy next to you attacks it.
  // The field scales to fill the space between the HUD's edges; its backdrop (sky or sea) fills the screen.
  import { untrack } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { DEV, G, act } from '../lib/game.svelte';
  import { ED, PLAYER, beginStroke, endStroke, isFigure, paint, pickFrom, tunePropSet, tuneSelect, tuneSprite, tuneSpriteSet } from '../lib/editor.svelte';
  import { PLAYER_SHADOW, SHADOW, shadowOf, type Shadow } from './shadow';
  import { UI } from '../lib/ui.svelte';
  import { attackFoe, fireAim, stopWalk, walk as walkRoute } from './commands';
  import { asset, content, sprites, type Sprite } from '../content';
  import * as E from '../engine/actions';
  import { grid, route } from '../engine/hex';
  import { peopleOn } from '../engine/story';
  import * as K from '../engine/combat';
  import type { Cell, Figure, Foe, Fx, Prop } from '../engine/types';
  import Backdrop from './Backdrop.svelte';
  import { HEXW, R, SQ, groundY, layout, shade, type HexGeom } from './geo';
  import { themeOf } from './themes';
  import { FOG_H, FOG_TOP, PATCH_EXTENT, edgeNeighbour, fogBlock, groundHex, mul, patchImage, shownHeight, type FogBlock } from './ground';
  import { padCells } from './pad';
  import { FIGHT_ENERGY } from '../engine/rules';
  import { foeElements, multOnFoe } from '../engine/elements';
  import { elName, markOf } from './elementInfo';

  let { pointId }: { pointId: string } = $props();

  const FIGURE_H = 1.0; // a figure's height, in hex widths, unless its content says otherwise (1.25 hid the hexes behind)
  const STEP_MS = 170; // time to walk from one hex to the next
  const DASH_MS = 110; // a dash: one quick jump from where you were to where you land
  const SIDESTEP = 0.26; // standing on a hex with something on it, the player stands this far to its left (hex widths)

  const g = $derived((void ED.v, grid(content, pointId, G.s.day))); // ED.v: the map editor changed the rows
  // the field as drawn: the point's hexes and a ragged ring of padding around them (ui/pad.ts)
  const P = $derived(content.points[pointId]);
  /** The map editor, painting or tuning (not previewing the field as it plays). */
  const editing = $derived(ED.on && !ED.preview);
  // in the map editor: two full rings of empty slots instead, to paint new hexes into
  const pad = $derived((void ED.v, editing ? padCells(pointId, g.cells, 2, false) : padCells(pointId, g.cells, P.pad ?? 2)));
  const padKeys = $derived(new Set(pad.map((x) => x.key)));
  const field = $derived.by(() => {
    const cells = [...g.cells, ...pad];
    return { cells, byKey: new Map(cells.map((x) => [x.key, x])), byRC: new Map(cells.map((x) => [`${x.r}:${x.c}`, x])) };
  });
  // the field turns smoothly to UI.angle ([ and ]); its size on screen stays what it is unturned, so a turned
  // field can run past the screen's edges instead of shrinking to fit
  const turn = new Tween(untrack(() => UI.angle), { duration: 280, easing: cubicOut });
  $effect(() => {
    turn.target = UI.angle;
  });
  /** The detailed ground (ui/ground.ts), or the old flat hexes, a dev switch while the look is trialled. */
  const detailed = $derived(!DEV.on || DEV.ground === 'detail');
  const kindOf = (x: Cell) => (padKeys.has(x.key) ? (P.fog && !ED.on ? 'fog' : x.t) : ED.on || E.isSeen(G.s, content, pointId, x) ? x.t : 'fog');
  const terrainH = (x: Cell) => content.terrain[x.t].height;
  const heightOf = (x: Cell) => (detailed ? shownHeight(kindOf(x), terrainH(x)) : terrainH(x));
  const L = $derived(layout(field.cells, heightOf, turn.current));
  // the crop is worked out with every hex at its tallest, so the view holds still as fog clears
  const cropH = (x: Cell) => Math.max(terrainH(x), FOG_H);
  const Lc = $derived(layout(field.cells, cropH, turn.current));
  const L0 = $derived(layout(field.cells, cropH, 0));
  const here = $derived(E.hereCell(G.s, content));
  const backdrop = $derived(content.points[pointId].backdrop ?? 'sky');

  const figureH = (f: Figure | undefined) => HEXW * (f?.height ?? FIGURE_H);

  /** The top of everything that can ever be drawn on this point (every prop at full size, a figure on any hex
   *  you can walk on, the hover chip), so the view can be cropped to it without moving as fog clears. */
  function topOf(L: ReturnType<typeof layout>): number {
    let t = Infinity;
    const tallest = Math.max(figureH(content.player.figure), ...Object.values(content.npcs).map((n) => figureH(n.figure)));
    for (const hx of L.order) {
      t = Math.min(t, hx.cy - R * SQ, hx.cy - 54);
      const x = field.byKey.get(hx.key)!;
      if (content.terrain[x.t]?.cost != null && !padKeys.has(x.key)) t = Math.min(t, groundY(hx.cy) - tallest);
      const pr = x.p ? content.props[x.p] : undefined;
      const sp = pr?.sprite ? sprites[pr.sprite] : undefined;
      if (pr && sp) {
        const w = HEXW * (pr.size ?? 0.8);
        let h = (w * sp.h) / sp.w;
        if (h > HEXW * 2.6) h = HEXW * 2.6;
        const y = pr.flat ? hx.cy - h / 2 : groundY(hx.cy) + (pr.dy ?? 0) * HEXW - sp.by * h;
        t = Math.min(t, y);
      }
    }
    return Math.max(0, Math.floor(t - 10));
  }
  const top = $derived(topOf(Lc));
  /** The view: the unturned field's size, centred on the turned field. */
  const base = $derived.by(() => {
    const w = L0.width;
    const h = L0.height - topOf(L0);
    return { cx: L.width / 2, cy: (top + L.height) / 2, w, h };
  });

  // ---------- zoom: the wheel (or a pinch) zooms in, toward the pointer ----------
  // A point opens fully zoomed in on you. A story beat allows one step closer and frames you above the
  // dialogue box; when it ends the view eases back out to the play zoom.
  // the closest you can zoom: about 8 hexes across on any map (bigger maps zoom further), never under 2×;
  // a story beat goes 40% closer still
  const PLAY_ZOOM = $derived(Math.min(4, Math.max(2, base.w / (HEXW * 8))));
  const STORY_ZOOM = $derived(Math.min(5, PLAY_ZOOM * 1.4));
  const STORY_AT = 0.4; // in a story beat you sit this far down the view (0.5: the middle), clear of the box
  const story = $derived(G.s.beats.length > 0);
  const zoomMax = $derived(ED.on ? 4 : story ? STORY_ZOOM : PLAY_ZOOM); // the map editor zooms further
  let zoom = $state(1);
  let gliding = false;
  let glideRaf = 0;
  $effect(() => {
    if (!gliding && zoom > zoomMax) zoom = zoomMax;
  });
  let focus = $state<[number, number]>([0, 0]); // the view's middle, from the field's middle
  let svgEl = $state<SVGSVGElement>();
  /** Keep the zoomed view inside the whole field. */
  const clampFocus = ([fx, fy]: [number, number], z: number): [number, number] => {
    const mx = (base.w - base.w / z) / 2, my = (base.h - base.h / z) / 2;
    return [Math.max(-mx, Math.min(mx, fx)), Math.max(-my, Math.min(my, fy))];
  };
  /** The focus that puts a hex `at` of the way down the view at zoom z. */
  function focusOn(key: string | null, z: number, at = 0.5): [number, number] {
    const hx = key ? L.hexes.get(key) : undefined;
    if (!hx) return [0, 0];
    return clampFocus([hx.cx - base.cx, hx.cy - base.cy + (0.5 - at) * (base.h / z)], z);
  }
  function stopGlide() {
    cancelAnimationFrame(glideRaf);
    gliding = false;
  }
  /** Ease the view to a zoom and focus. */
  function glide(z2: number, f2: [number, number], ms = 650) {
    stopGlide();
    const z1 = zoom, f1 = clampFocus(focus, zoom), t0 = performance.now();
    gliding = true;
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / ms), e = cubicOut(t);
      zoom = z1 + (z2 - z1) * e;
      focus = [f1[0] + (f2[0] - f1[0]) * e, f1[1] + (f2[1] - f1[1]) * e];
      if (t < 1) glideRaf = requestAnimationFrame(frame);
      else gliding = false;
    };
    glideRaf = requestAnimationFrame(frame);
  }
  // a new point: fully zoomed in, on you
  $effect(() => {
    void pointId;
    untrack(() => {
      stopGlide();
      zoom = ED.on ? 1 : zoomMax;
      focus = ED.on ? [0, 0] : focusOn(G.s.pos, zoom, story ? STORY_AT : 0.5);
    });
  });
  // a story beat starts or ends
  $effect(() => {
    const on = story;
    untrack(() => {
      if (ED.on) return;
      if (on) glide(STORY_ZOOM, focusOn(G.s.pos, STORY_ZOOM, STORY_AT));
      else if (zoom > PLAY_ZOOM) glide(PLAY_ZOOM, focusOn(G.s.pos, PLAY_ZOOM));
    });
  });
  $effect(() => () => cancelAnimationFrame(glideRaf));
  // follow you: when you walk near the edge of the view, it slides to keep you in its middle 60%;
  // in a fight, its middle 30%, so the fight never ends up at the edge of the screen
  const FOLLOW = 0.3;
  const FOLLOW_FIGHT = 0.15;
  $effect(() => {
    const p = player;
    if (!p || ED.on) return;
    const [px, py] = [p.x, p.y];
    const band = fighting ? FOLLOW_FIGHT : FOLLOW;
    untrack(() => {
      if (gliding || drag?.kind === 'pan') return;
      const [fx, fy] = clampFocus(focus, zoom);
      const w = base.w / zoom, h = base.h / zoom;
      const dx = px - (base.cx + fx), dy = py - (base.cy + fy);
      const sx = Math.abs(dx) > band * w ? dx - Math.sign(dx) * band * w : 0;
      const sy = Math.abs(dy) > band * h ? dy - Math.sign(dy) * band * h : 0;
      if (!sx && !sy) return;
      const to = clampFocus([fx + sx, fy + sy], zoom);
      // a long way off (you panned away, then walked): ease back; otherwise keep pace with the walk
      if (Math.hypot(sx / w, sy / h) > 0.15) glide(zoom, to, 450);
      else focus = to;
    });
  });
  // a fight starts: ease the view onto you, leaning a little towards whoever is after you
  $effect(() => {
    const on = fighting;
    untrack(() => {
      if (!on || ED.on || story || !G.s.pos) return;
      const me = L.hexes.get(G.s.pos);
      if (!me) return;
      const them = foes.filter((f) => f.engaged).flatMap((f) => L.hexes.get(f.pos) ?? []);
      const ax = them.length ? them.reduce((a, x) => a + x.cx, 0) / them.length : me.cx;
      const ay = them.length ? them.reduce((a, x) => a + x.cy, 0) / them.length : me.cy;
      // two parts you, one part them: you stay near the middle, the enemies stay on screen
      const cx = (me.cx * 2 + ax) / 3, cy = (me.cy * 2 + ay) / 3;
      glide(zoom, clampFocus([cx - base.cx, cy - base.cy], zoom), 450);
    });
  });
  const view = $derived.by(() => {
    const [fx, fy] = clampFocus(focus, zoom);
    const w = base.w / zoom, h = base.h / zoom;
    return `${base.cx + fx - w / 2} ${base.cy + fy - h / 2} ${w} ${h}`;
  });
  $effect(() => {
    const el = svgEl;
    if (!el) return;
    const onwheel = (ev: WheelEvent) => {
      ev.preventDefault();
      stopGlide();
      const z2 = Math.max(1, Math.min(zoomMax, zoom * Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.002))));
      if (z2 === zoom) return;
      const m = el.getScreenCTM();
      if (!m) return;
      const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
      // the point under the pointer stays where it is
      const [fx, fy] = clampFocus(focus, zoom);
      const c = [base.cx + fx, base.cy + fy];
      const k = zoom / z2;
      focus = clampFocus([p.x - (p.x - c[0]) * k - base.cx, p.y - (p.y - c[1]) * k - base.cy], z2);
      zoom = z2;
    };
    el.addEventListener('wheel', onwheel, { passive: false });
    return () => el.removeEventListener('wheel', onwheel);
  });

  // ---------- enemies ----------

  const seen = (key: string) => {
    const x = g.byKey.get(key);
    return !!x && E.isSeen(G.s, content, pointId, x);
  };
  const foes = $derived(G.s.point === pointId && !ED.on ? (G.s.foes[pointId] ?? []).filter((f) => seen(f.pos)) : []);
  /** Hexes where a territorial enemy would notice you. */
  const danger = $derived(new Set(foes.flatMap((f) => K.noticeHexes(content, g, f).map((x) => x.key))));
  /** Hexes an enemy's next attack will hit. */
  const threat = $derived(new Set(foes.flatMap((f) => (f.intent?.kind === 'attack' ? f.intent.hexes : []))));
  const arrows = $derived(
    foes.flatMap((f) => {
      if (f.intent?.kind !== 'move') return [];
      const A = L.hexes.get(f.pos);
      const B = L.hexes.get(f.intent.to);
      return A && B ? [{ id: f.id, x1: A.cx, y1: A.cy, x2: A.cx + (B.cx - A.cx) * 0.62, y2: A.cy + (B.cy - A.cy) * 0.62 }] : [];
    }),
  );

  let hover = $state<string | null>(null);
  const hoverFoe = $derived(hover ? K.foeAt(G.s, hover) : undefined);
  const plan = $derived(
    !UI.aim && hover && hover !== G.s.pos && !(hoverFoe && E.canHit(G.s, content, hoverFoe.id)) ? E.planRoute(G.s, content, hover) : null,
  );
  /** A skill's reach: while aiming it at the hovered hex, or while hovering its slot. */
  const aimHexes = $derived.by(() => {
    const id = UI.aim ?? UI.preview;
    if (!id) return new Set<string>();
    return new Set(E.skillHexes(G.s, content, id, hover ?? undefined).map((x) => x.key));
  });
  /** Aiming a dash: where you'd land, and who you'd hit on the way (or bounce off). */
  const dashAim = $derived.by(() => {
    const id = UI.aim;
    if (!id || content.skills[id]?.kind !== 'dash' || !hover) return null;
    const p = E.dashPlan(G.s, content, id, hover);
    return { land: p.land?.key ?? null, hits: new Set(p.hits.map((x) => x.key)) };
  });
  const fighting = $derived(K.inFight(G.s));
  const autoId = $derived(ED.on ? null : E.autoArmed(G.s, content));
  // the 15-minute cycle: changes 4 times an hour, so reading it (not the clock) keeps the field from redrawing each second
  const cycle = $derived(K.cycleOf(G.now));
  const onPath = new Set<string>(); // the route isn't drawn: just where you'd end up

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  /** In the map editor: each hex's token as written ("g.pine", "s.*"), to show "*" slots for what they are. */
  const rawTokens = $derived.by(() => {
    void ED.v;
    const out = new Map<string, string>();
    if (!ED.on) return out;
    content.points[pointId].rows.forEach((row, r) => row.trim().split(/\s+/).forEach((t, c) => out.set(`${pointId}:${r}:${c}`, t)));
    return out;
  });

  /** The chip over the hovered hex. */
  const chip = $derived.by(() => {
    const x = hover ? g.byKey.get(hover) : undefined;
    const hx = hover ? L.hexes.get(hover) : undefined;
    if (editing) {
      const ex = hover ? field.byKey.get(hover) : undefined;
      const ehx = hover ? L.hexes.get(hover) : undefined;
      if (!ex || !ehx) return null;
      const tok = padKeys.has(ex.key) ? '+' : (rawTokens.get(ex.key) ?? '');
      return { hx: ehx, text: `${tok} · ${ex.r},${ex.c}`, bad: false };
    }
    if (!x || !hx || x.key === G.s.pos) return null;
    if (UI.aim) {
      const sk = content.skills[UI.aim];
      return { hx, text: aimHexes.size ? sk.name : `${sk.name} · ✕`, bad: !aimHexes.size };
    }
    if (!E.isSeen(G.s, content, pointId, x)) return { hx, text: '?', bad: false };
    if (hoverFoe && autoId) return { hx, text: `${content.skills[autoId].name} (auto) · pick a target${hoverFoe.engaged ? '' : ` · ${FIGHT_ENERGY}⚡`}`, bad: false, below: true };
    if (hoverFoe) {
      const st = K.statsOf(content, hoverFoe);
      const lv = hoverFoe.level ?? content.props[hoverFoe.kind]?.foe?.level;
      const els = foeElements(content, hoverFoe.kind);
      const elTag = els.length ? ` · ${els.map(elName).join('/')}${markOf(multOnFoe(G.s, els))}` : '';
      const name = cap(content.props[hoverFoe.kind]?.name ?? hoverFoe.kind) + (lv ? ` · Lv ${lv}` : '') + elTag;
      const pick = hoverFoe.engaged ? '' : ` · ${FIGHT_ENERGY}⚡`; // starting a fight costs energy
      if (E.canHit(G.s, content, hoverFoe.id)) {
        const me = K.playerStats(G.s, content);
        const hit = Math.round((1 - K.dodgeChance(me, st)) * 100);
        return { hx, text: `Attack · ${K.fmt(K.baseDamage(me.patk, st.pdef))} dmg · ${hit}%${pick}`, bad: false, below: true };
      }
      return { hx, text: `${name} · ${Math.ceil(hoverFoe.hp)}/${st.hp}${pick}`, bad: false, below: true };
    }
    const pr = E.visibleProp(G.s, content, x);
    if (!plan) return { hx, text: pr ? `${cap(pr.name)} · ✕` : '✕', bad: true };
    return pr ? { hx, text: cap(pr.name), bad: false } : null;
  });

  const colourOf = (key: string) => {
    const x = field.byKey.get(key)!;
    return kindOf(x) === 'fog' ? themeOf(DEV.theme).fog : content.terrain[x.t].colour;
  };

  /** Lays a patch image on the ground: centred on the field's middle, turned with it, squashed like it. */
  const patchTransform = $derived(`translate(${L.origin[0]},${L.origin[1]}) scale(1,${SQ}) rotate(${turn.current})`);
  const mixFog = $derived(mul(themeOf(DEV.theme).fog, 1.06));
  const ground = $derived.by(() => {
    if (!detailed) return null;
    const at = (r: number, c: number) => field.byRC.get(`${r}:${c}`);
    const out = new Map<string, ReturnType<typeof groundHex>>();
    for (const hx of L.order) {
      const x = field.byKey.get(hx.key)!;
      const nb = [0, 1, 2, 3, 4, 5].map((k) => {
        const n = edgeNeighbour(x, k, at);
        return n ? { kind: kindOf(n), height: heightOf(n), pad: padKeys.has(n.key) } : undefined;
      });
      out.set(hx.key, groundHex(hx.key, kindOf(x), colourOf(hx.key), heightOf(x), hx.corners, hx.walls, nb, padKeys.has(x.key)));
    }
    return out;
  });

  // ---------- the player's walk ----------

  const hasProp = (key: string) => {
    const c = g.byKey.get(key);
    return !!c && !!E.visibleProp(G.s, content, c);
  };

  let walk = $state<{ keys: string[]; t0: number; stepMs: number; dash: boolean; fromSide: boolean; toSide: boolean } | null>(null);
  let now = $state(0);
  let facesLeft = $state(false);
  let lastPos = untrack(() => G.s.pos);

  // when the player's hex changes, walk the route between the old hex and the new one
  $effect(() => {
    const pos = G.s.pos;
    const from = lastPos;
    lastPos = pos;
    if (!pos || !from || pos === from) return;
    untrack(() => {
      const a = g.byKey.get(from);
      const b = g.byKey.get(pos);
      if (!a || !b) return;
      // a dash jumps straight there; a walk follows the route hex by hex
      const dash = G.s.fx.some((f) => f.kind === 'dash' && f.key === b.key && f.from === a.key);
      const r = dash ? null : route(g, a, b, (x) => content.terrain[x.t]?.cost != null, (x) => content.terrain[x.t].cost ?? 1);
      const keys = r && r.path.length ? [a.key, ...r.path.map((c) => c.key)] : [a.key, b.key];
      const A = L.hexes.get(keys[keys.length - 2]);
      const B = L.hexes.get(keys[keys.length - 1]);
      if (A && B && Math.abs(B.cx - A.cx) > 0.5) facesLeft = B.cx < A.cx;
      const t0 = performance.now();
      walk = { keys, t0, stepMs: dash ? DASH_MS : STEP_MS, dash, fromSide: hasProp(a.key), toSide: hasProp(b.key) };
      now = t0;
    });
  });

  // drive the walk one frame at a time
  $effect(() => {
    if (!walk) return;
    const { t0, keys, stepMs } = walk;
    const total = (keys.length - 1) * stepMs;
    let raf = 0;
    const frame = (t: number) => {
      now = t;
      if (t - t0 < total) raf = requestAnimationFrame(frame);
      else walk = null;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  /** Where the player's figure is drawn this frame. */
  const player = $derived.by(() => {
    if (!here) return null;
    const end = L.hexes.get(here.key);
    if (!end) return null;
    const side = -SIDESTEP * HEXW;
    if (walk) {
      const n = walk.keys.length - 1;
      const p = Math.min(n, Math.max(0, (now - walk.t0) / walk.stepMs));
      const i = Math.min(n - 1, Math.floor(p));
      const f = p - i;
      const A = L.hexes.get(walk.keys[i]);
      const B = L.hexes.get(walk.keys[i + 1]);
      if (A && B) {
        let off = 0;
        if (i === 0 && walk.fromSide) off += side * (1 - f);
        if (i === n - 1 && walk.toSide) off += side * f;
        return {
          x: A.cx + (B.cx - A.cx) * f + off,
          y: A.cy + (B.cy - A.cy) * f,
          left: Math.abs(B.cx - A.cx) > 0.5 ? B.cx < A.cx : facesLeft,
          walking: !walk.dash && Math.floor(p * 2) % 2 === 0,
        };
      }
    }
    return { x: end.cx + (E.visibleProp(G.s, content, here) ? side : 0), y: end.cy, left: facesLeft, walking: false };
  });

  // ---------- what gets drawn, back to front ----------

  type Drawable =
    | { kind: 'prop'; key: string; y: number; hx: HexGeom; cell: Cell; pr: Prop }
    | { kind: 'foe'; key: string; y: number; hx: HexGeom; foe: Foe }
    | { kind: 'player'; key: string; y: number }
    | { kind: 'fog'; key: string; y: number; hx: HexGeom; fog: FogBlock; real: boolean };

  const drawables = $derived.by(() => {
    const out: Drawable[] = [];
    for (const hx of L.order) {
      const cell = g.byKey.get(hx.key);
      if (!cell) continue; // padding
      let pr = ED.on ? (cell.p ? content.props[cell.p] : null) : E.isSeen(G.s, content, pointId, cell) ? E.visibleProp(G.s, content, cell) : null;
      if (pr && ED.on && ED.mode === 'paint' && ED.props === 'hidden') pr = null;
      // Tune shows what it's working on, on its hex
      if (ED.on && ED.mode === 'tune' && ED.tune.code && cell.key === ED.tune.key) pr = ED.tune.code === PLAYER ? PLAYER_PROP : (content.props[ED.tune.code] ?? pr);
      if (pr) out.push({ kind: 'prop', key: hx.key, y: hx.cy, hx, cell, pr });
    }
    // fog of war: a block over each hidden hex, sorted in with everything else so what's in front draws over it
    if (detailed)
      for (const hx of L.order) {
        const x = field.byKey.get(hx.key)!;
        if (kindOf(x) === 'fog') out.push({ kind: 'fog', key: `@fog:${hx.key}`, y: hx.cy - 0.5, hx, fog: fogBlock(hx.corners, hx.walls), real: !padKeys.has(hx.key) });
      }
    for (const f of foes) {
      const hx = L.hexes.get(f.pos);
      if (hx) out.push({ kind: 'foe', key: `@foe:${f.id}`, y: hx.cy, hx, foe: f });
    }
    // people the story stands here (Sylvie on the beach): drawn like a person on that hex
    if (!ED.on)
      for (const [key, npc] of peopleOn(G.s, content, pointId)) {
        const hx = L.hexes.get(key);
        const cell = g.byKey.get(key);
        const pr = Object.values(content.props).find((p) => p.npc === npc);
        if (hx && cell && pr) out.push({ kind: 'prop', key: `@npc:${npc}`, y: hx.cy, hx, cell, pr });
      }
    if (player) out.push({ kind: 'player', key: '@player', y: player.y + 0.5 });
    return out.sort((a, b) => a.y - b.y);
  });

  const PLAYER_PROP: Prop = { code: PLAYER, type: 'npc', name: 'you', icon: '🧍' };

  interface Placed {
    sprite: Sprite;
    x: number;
    y: number;
    w: number;
    h: number;
    faded: boolean;
    gx: number; // the ground point the sprite stands on
    gy: number;
    shadow: Shadow | null;
  }

  /** Where a prop's sprite goes: its ground point on the hex, scaled to its size class, plus hand-tuned offsets.
   *  A node used up today shows its spent sprite (stump, rubble) if it has one, otherwise it fades. */
  function place(pr: Prop, key: string, cx: number, cy: number, spent = false): Placed | null {
    void ED.v; // the map editor's tuning
    const used = spent || (pr.type === 'node' && E.isDepletedIn(G.s, key, cycle));
    const id = used && pr.spent ? pr.spent : pr.sprite;
    const sp = id ? sprites[id] : undefined;
    if (!sp) return null;
    let w = HEXW * (used && pr.spent ? 0.6 : (pr.size ?? 0.8));
    let h = (w * sp.h) / sp.w;
    if (h > HEXW * 2.6) {
      w *= (HEXW * 2.6) / h;
      h = HEXW * 2.6;
    }
    const faded = used && !pr.spent;
    const ox = (pr.dx ?? 0) * HEXW;
    const oy = (pr.dy ?? 0) * HEXW;
    if (pr.flat) return { sprite: sp, x: cx - w / 2 + ox, y: cy - h / 2 + oy, w, h, faded, gx: cx + ox, gy: cy + oy, shadow: null };
    const gx = cx + ox;
    const gy = groundY(cy) + oy;
    return { sprite: sp, x: gx - sp.bx * w, y: gy - sp.by * h, w, h, faded, gx, gy, shadow: shadowOf(sp, gx, gy, w) };
  }

  /** Where a figure goes: its legs centred on (x, the hex's ground point). */
  function placeFigure(fig: Figure | undefined, walking: boolean, x: number, cy: number, me = false) {
    void ED.v; // the map editor's tuning
    const id = walking && fig?.walk ? fig.walk : fig?.stand;
    const sp = id ? sprites[id] : undefined;
    if (!sp) return null;
    const h = figureH(fig);
    const w = (h * sp.w) / sp.h;
    const gy = groundY(cy);
    return { sprite: sp, x: x - (sp.fx ?? sp.bx) * w, y: gy - sp.by * h, w, h, gx: x, gy, shadow: shadowOf(sp, x, gy, w, me ? PLAYER_SHADOW : SHADOW) };
  }

  /** Mirror around a vertical line, to face left. */
  const mirror = (on: boolean, x: number) => (on ? `translate(${2 * x},0) scale(-1,1)` : undefined);

  function keyAt(ev: Event): string | null {
    return (ev.target as Element).closest('[data-key]')?.getAttribute('data-key') ?? null;
  }

  // ---------- clicking: aim a skill, attack, or walk (step by step, in commands.ts) ----------

  function onclick(ev: MouseEvent) {
    if (ED.on) return; // the editor works on pointer down
    if (ev.shiftKey) return; // Shift is the pan hand: letting go after a drag isn't a click
    const key = keyAt(ev);
    if (!key || key === G.s.pos) return;
    if (UI.aim) return fireAim(key);
    stopWalk();
    const f = K.foeAt(G.s, key);
    // the auto skill, when armed, takes the place of the basic attack
    const auto = f && E.autoArmed(G.s, content);
    if (auto) {
      UI.aim = auto;
      return fireAim(key);
    }
    if (f) return attackFoe(f.id, key); // in reach: attack; else walk until it is, then attack
    const p = E.planRoute(G.s, content, key);
    if (!p || !p.path.length) return;
    walkRoute(p.path.map((x) => x.key));
  }

  // ---------- the map editor ----------
  // Paint: press and drag. Alt-click picks a hex's prop as the brush (Alt+Shift: its ground).
  // Tune: click a hex to show the tuned object there (or select the prop on it); drag the sprite to move it
  // over its foot point (Shift: move the whole prop on the hex); drag the shadow, or its two handles to size it.
  // Anywhere: drag with the right or middle button to pan; or hold Space (editor) or Shift (playing) and drag.

  let painting = false;
  let lastPainted: string | null = null;
  let space = $state(false);
  let shift = $state(false); // playing: Shift held turns the cursor into a hand that pans
  type Drag =
    | { kind: 'pan'; x: number; y: number; focus: [number, number] }
    | { kind: 'tune'; part: string; shift: boolean; p: DOMPoint; w: number; h: number; id: string; code: string; s: Record<string, number> };
  let drag = $state<Drag | null>(null);

  const rcOf = (key: string) => key.split(':').slice(-2).map(Number) as [number, number];
  function svgPoint(ev: PointerEvent): DOMPoint | null {
    const m = svgEl?.getScreenCTM();
    return m ? new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse()) : null;
  }
  function paintAt(key: string | null) {
    if (!key || key === lastPainted) return;
    lastPainted = key;
    paint(pointId, ...rcOf(key));
  }

  /** What Tune is showing, where: the sprite's box, its ground point, its shadow. */
  const tuned = $derived.by(() => {
    void ED.v;
    if (!ED.on || ED.mode !== 'tune' || !ED.tune.code || !ED.tune.key) return null;
    const hx = L.hexes.get(ED.tune.key);
    const id = tuneSprite(ED.tune.code, ED.tune.spent);
    if (!hx || !id) return null;
    const code = ED.tune.code;
    if (isFigure(code)) {
      const fig = code === PLAYER ? content.player.figure : content.npcs[content.props[code].npc!]?.figure;
      const f = placeFigure(fig, false, hx.cx, hx.cy, code === PLAYER);
      return f && { id, code, hx, figure: true, x: f.x, y: f.y, w: f.w, h: f.h, gx: f.gx, gy: f.gy, shadow: f.shadow as Shadow | null };
    }
    const p = place(content.props[code], '', hx.cx, hx.cy, ED.tune.spent);
    return p && { id, code, hx, figure: false, x: p.x, y: p.y, w: p.w, h: p.h, gx: p.gx, gy: p.gy, shadow: p.shadow };
  });

  function onpointerdown(ev: PointerEvent) {
    const panButton = ev.button === 1 || ev.button === 2 || (ev.button === 0 && (space || (!ED.on && ev.shiftKey)));
    // playing: drag off the field (or with the right or middle button) to pan; clicks on hexes stay clicks
    if (panButton || (!ED.on && ev.button === 0 && !keyAt(ev))) {
      if (panButton) ev.preventDefault();
      stopGlide();
      drag = { kind: 'pan', x: ev.clientX, y: ev.clientY, focus: clampFocus(focus, zoom) };
      return;
    }
    if (!ED.on) return;
    if (ev.button !== 0 || ED.preview) return;
    const part = (ev.target as Element).closest('[data-tune]')?.getAttribute('data-tune');
    const p = svgPoint(ev);
    if (part && tuned && p) {
      const sp = sprites[tuned.id];
      const pr = content.props[tuned.code];
      const d = tuned.code === PLAYER ? PLAYER_SHADOW : SHADOW;
      drag = {
        kind: 'tune', part, shift: ev.shiftKey && !tuned.figure, p, w: tuned.w, h: tuned.h, id: tuned.id, code: tuned.code,
        s: { bx: tuned.figure ? (sp.fx ?? sp.bx) : sp.bx, by: sp.by, sx: sp.sx ?? 0, sy: sp.sy ?? 0, sw: sp.sw ?? d.sw, sh: sp.sh ?? d.sh, dx: pr?.dx ?? 0, dy: pr?.dy ?? 0 },
      };
      return;
    }
    const key = keyAt(ev);
    if (!key) return;
    if (ev.altKey) return pickFrom(pointId, ...rcOf(key), ev.shiftKey);
    if (ED.mode === 'tune') {
      const pr = g.byKey.get(key)?.p;
      const has = pr && (content.props[pr]?.sprite || content.props[pr]?.type === 'npc');
      return tuneSelect(has ? pr : ED.tune.code, key);
    }
    painting = true;
    lastPainted = null;
    beginStroke(pointId);
    paintAt(key);
  }

  function onpointermove(ev: PointerEvent) {
    if (drag?.kind === 'pan') {
      const k = svgEl?.getScreenCTM()?.a ?? 1;
      focus = clampFocus([drag.focus[0] - (ev.clientX - drag.x) / k, drag.focus[1] - (ev.clientY - drag.y) / k], zoom);
      return;
    }
    if (drag?.kind === 'tune') {
      const p = svgPoint(ev);
      if (!p) return;
      const dx = p.x - drag.p.x, dy = p.y - drag.p.y;
      const { s, w, h, id, code } = drag;
      if (drag.part === 'sprite' && drag.shift) tunePropSet(code, { dx: s.dx + dx / HEXW, dy: s.dy + dy / HEXW });
      else if (drag.part === 'sprite') tuneSpriteSet(id, { bx: s.bx - dx / w, by: s.by - dy / h });
      else if (drag.part === 'shadow') tuneSpriteSet(id, { sx: s.sx + dx / w, sy: s.sy + dy / w });
      else if (drag.part === 'sw') tuneSpriteSet(id, { sw: Math.max(0.02, s.sw + dx / w) });
      else if (drag.part === 'sh') tuneSpriteSet(id, { sh: Math.max(0.01, s.sh + dy / w) });
      return;
    }
    hover = keyAt(ev);
    if (painting) paintAt(hover);
  }

  function onpointerup() {
    drag = null;
    if (!painting) return;
    painting = false;
    endStroke();
  }

  function onkeydown(ev: KeyboardEvent) {
    if (ev.key === 'Shift') shift = true;
    if (ev.key !== ' ' || !ED.on || (ev.target as HTMLElement | null)?.closest?.('input, textarea, select')) return;
    space = true;
    (document.activeElement as HTMLElement | null)?.blur?.(); // or Space would press the last button clicked
    ev.preventDefault();
  }
  function onkeyup(ev: KeyboardEvent) {
    if (ev.key === ' ') space = false;
    if (ev.key === 'Shift') shift = false;
  }

  // ---------- what the last action did: numbers, slashes, lunges, flashes ----------
  // The enemies' turn (phase 1) plays a beat after yours, so a fight reads as blow, then answer.

  const FX_MS = 900;
  const PHASE_MS = 220;
  const TEXT = new Set(['hit', 'crit', 'miss', 'hurt', 'xp']);
  type Shown = Fx & { t0: number; delay: number };
  let shown = $state<Shown[]>([]);
  let lastFx = untrack(() => G.s.fxSeq);
  $effect(() => {
    const seq = G.s.fxSeq;
    if (seq === lastFx) return;
    untrack(() => {
      const t0 = performance.now();
      const fresh = G.s.fx.filter((f) => f.id > lastFx).map((f) => ({ ...f, t0, delay: f.phase ? PHASE_MS : 0 }));
      lastFx = seq;
      shown = [...shown, ...fresh];
      // by id: $state wraps what it holds, so the objects in `shown` aren't the ones in `fresh`
      const ids = new Set(fresh.map((f) => f.id));
      setTimeout(() => (shown = shown.filter((f) => !ids.has(f.id))), FX_MS + PHASE_MS);
    });
  });

  /** Numbers float up; several on one hex in one action stack upwards. */
  const floatsPlaced = $derived(
    shown.flatMap((f) => {
      if (!TEXT.has(f.kind)) return [];
      const hx = L.hexes.get(f.key);
      const n = shown.filter((o) => TEXT.has(o.kind) && o.key === f.key && o.id < f.id && o.t0 === f.t0).length;
      return hx ? [{ ...f, x: hx.cx, y: hx.cy - 70 - n * 18 }] : [];
    }),
  );

  /** A sword arc over a hex, curved away from the attacker. */
  const slashes = $derived(
    shown.flatMap((f) => {
      const hx = L.hexes.get(f.key);
      const from = f.from ? L.hexes.get(f.from) : undefined;
      if (f.kind !== 'slash' || !hx) return [];
      const deg = from ? (Math.atan2(hx.cy - from.cy, hx.cx - from.cx) * 180) / Math.PI : 0;
      return [{ ...f, x: hx.cx, y: hx.cy - 22, deg }];
    }),
  );

  /** An arrow in flight, from the shooter's hex to the target's, at chest height. */
  const shots = $derived(
    shown.flatMap((f) => {
      const a = (f.kind === 'shot' || f.kind === 'bolt') && f.from ? L.hexes.get(f.from) : undefined;
      const b = L.hexes.get(f.key);
      return a && b ? [{ ...f, x1: a.cx, y1: a.cy - 34, x2: b.cx, y2: b.cy - 26 }] : [];
    }),
  );

  const flashes = $derived(shown.flatMap((f) => (f.kind === 'flash' && L.hexes.get(f.key) ? [{ ...f, hx: L.hexes.get(f.key)! }] : [])));

  /** Attackers lunge a third of the way towards what they hit, by the cell they stand on. */
  const lunges = $derived.by(() => {
    const out: Record<string, { id: number; dx: number; dy: number; delay: number }> = {};
    for (const f of shown) {
      const a = f.kind === 'lunge' && f.from ? L.hexes.get(f.from) : undefined;
      const b = L.hexes.get(f.key);
      if (a && b) out[f.from!] = { id: f.id, dx: (b.cx - a.cx) * 0.35, dy: (b.cy - a.cy) * 0.35, delay: f.delay };
    }
    return out;
  });
  const lungeStyle = (l: { dx: number; dy: number; delay: number } | undefined) =>
    l ? `--dx:${l.dx}px;--dy:${l.dy}px;animation-delay:${l.delay}ms` : undefined;
</script>

<svelte:window {onpointerup} {onkeydown} {onkeyup} onblur={() => (shift = space = false)} />

<div class="wrap">
  <Backdrop kind={backdrop} />
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <svg bind:this={svgEl} viewBox={view} class:aiming={!!UI.aim} class:autoaim={!!autoId} class:editing={ED.on} class:panning={space || (shift && !ED.on) || drag?.kind === 'pan'} class:dragging={drag?.kind === 'pan'} {onclick} {onpointerdown} {onpointermove} onpointerleave={() => (hover = null)} oncontextmenu={(e) => e.preventDefault()}>
    <defs>
      <clipPath id="avatar"><circle r="18" /></clipPath>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" /></filter>
      <radialGradient id="puff">
        <stop offset="0" stop-color={mixFog} stop-opacity="0.9" />
        <stop offset="1" stop-color={mixFog} stop-opacity="0" />
      </radialGradient>
      <!-- light across the whole field from the upper left, so it reads as one surface -->
      <linearGradient id="sun" gradientUnits="userSpaceOnUse" x1="0" y1={top} x2={L.width} y2={L.height}>
        <stop offset="0" stop-color="#fff" stop-opacity="0.16" />
        <stop offset="0.5" stop-color="#fff" stop-opacity="0" />
        <stop offset="1" stop-color="#000" stop-opacity="0.1" />
      </linearGradient>
      <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="#e5484d" />
      </marker>
    </defs>

    <g class="ground" class:float={backdrop === 'sky'}>
      {#each L.order as hx (hx.key)}
        {@const col = colourOf(hx.key)}
        {@const gd = ground?.get(hx.key)}
        {#if editing && padKeys.has(hx.key)}
          <g class="cell slot" class:hot={hover === hx.key} data-key={hx.key}><polygon points={hx.top} /></g>
        {:else}
        <g class="cell" class:pad={padKeys.has(hx.key)} class:path={onPath.has(hx.key)} class:goal={hover === hx.key && !!plan} data-key={padKeys.has(hx.key) ? undefined : hx.key}>
          {#if gd}
            {#each gd.walls as w, i (i)}<polygon points={w.points} fill={w.fill} />{/each}
            {#each gd.lips as l, i (i)}<polygon points={l.points} fill={l.fill} />{/each}
            <polygon class="top" points={hx.top} fill={gd.top} />
            {#if gd.patch || gd.bands.length}
              <!-- patches and edge bands, clipped to this hex's top so they meet the next hex's without a break -->
              {@const cid = `clip-${hx.key.replace(/[^\w-]/g, '_')}`}
              <clipPath id={cid}><polygon points={hx.top} /></clipPath>
              <g clip-path="url(#{cid})" class="deco">
                {#if gd.patch}
                  <image href={patchImage(pointId, field.byKey.get(hx.key)!.t)} transform={patchTransform} x={-PATCH_EXTENT / 2} y={-PATCH_EXTENT / 2} width={PATCH_EXTENT} height={PATCH_EXTENT} preserveAspectRatio="none" />
                {/if}
                {#each gd.bands as b, i (i)}<path d={b.d} stroke={b.stroke} stroke-width={b.width} opacity={b.opacity} fill="none" stroke-linecap="round" stroke-linejoin="round" />{/each}
              </g>
            {/if}
            <polygon points={hx.top} fill="url(#sun)" class="deco" />
            {#each gd.shades as sh, i (i)}<polygon points={sh.points} fill={sh.fill ?? '#000'} opacity={sh.opacity} class="deco" />{/each}
            {#each gd.decos as d, i (i)}
              {#if d.tag === 'path'}
                <path d={d.d} stroke={d.stroke ?? 'none'} stroke-width={d.width} opacity={d.opacity} fill={d.fill ?? 'none'} stroke-linecap="round" stroke-linejoin="round" class="deco {d.cls ?? ''}" style:animation-delay="-{d.delay ?? 0}s" />
              {:else}
                <ellipse cx={d.cx} cy={d.cy} rx={d.rx} ry={d.ry} fill={d.fill} opacity={d.opacity} class="deco {d.cls ?? ''}" style:animation-delay="-{d.delay ?? 0}s" />
              {/if}
            {/each}
            {#each gd.lines as ln, i (i)}<polyline points={ln.points} stroke={ln.stroke} stroke-width={ln.width} opacity={ln.opacity} fill="none" stroke-linecap="round" class="deco" />{/each}
          {:else}
            {#each hx.sides as side, i (i)}<polygon points={side.points} fill={shade(col, side.shade)} />{/each}
            <polygon class="top" points={hx.top} fill={col} stroke={shade(col, 0.82)} />
          {/if}
          {#if editing}
            <polygon points={hx.top} class="edit-hex" class:hot={hover === hx.key} class:stage={ED.mode === 'tune' && ED.tune.key === hx.key} />
            <!-- random slots are marked only while painting, where they matter -->
            {#if ED.mode === 'paint' && rawTokens.get(hx.key)?.endsWith('.*')}<text x={hx.cx} y={hx.cy + 4} class="rand">?</text>{/if}
          {/if}
        </g>
        {/if}
      {/each}
    </g>

    <g class="overlay">
      {#each L.order as hx (hx.key)}
        {#if threat.has(hx.key)}
          <polygon class="threat" points={hx.top} />
        {:else if danger.has(hx.key)}
          <polygon class="danger" class:risky={onPath.has(hx.key)} points={hx.top} />
        {/if}
      {/each}
      {#each L.order as hx (hx.key)}
        {#if aimHexes.has(hx.key)}<polygon class="aimhex" class:land={dashAim?.land === hx.key} class:hit={dashAim?.hits.has(hx.key)} points={hx.top} />{/if}
      {/each}
      {#each flashes as f (f.id)}
        <polygon class="flash" points={f.hx.top} style:animation-delay="{f.delay}ms" />
      {/each}
      {#each arrows as a (a.id)}
        <line class="arrow" x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} marker-end="url(#arrowhead)" />
      {/each}
    </g>

    {#each drawables as d (d.key)}
      {#if d.kind === 'fog'}
        <g class="fogblock" class:cell={d.real} data-key={d.real ? d.hx.key : undefined}>
          {#each d.fog.spill as sp, i (i)}<polygon points={sp} fill={FOG_TOP} opacity={i ? 0.4 : 0.18} />{/each}
          {#each d.fog.walls as w, i (i)}<polygon points={w.points} fill={w.fill} stroke={w.fill} stroke-width="0.8" />{/each}
          <polygon points={d.fog.top} fill={FOG_TOP} stroke={FOG_TOP} stroke-width="0.8" />
        </g>
      {:else if d.kind === 'foe'}
        {@const f = d.foe}
        {@const pr = content.props[f.kind]}
        {@const st = K.statsOf(content, f)}
        <!-- placed like a prop, around (0, 0): the group moves from hex to hex -->
        {@const p = pr ? place(pr, '', 0, 0) : null}
        {@const gy = groundY(0)}
        {@const sh = p?.shadow ?? { cx: 0, cy: gy - 1, rx: 18, ry: 6, o: 0.3 }}
        {@const top = p ? p.y : -44}
        {@const lunge = lunges[f.pos]}
        <g class="foe" class:engaged={f.engaged} style:transform="translate({d.hx.cx}px, {d.hx.cy}px)" data-key={f.pos}>
          <ellipse cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry} fill="#000" opacity={sh.o} filter="url(#soft)" />
          {#if f.engaged}<ellipse cx={sh.cx} cy={sh.cy} rx={sh.rx * 1.3} ry={sh.ry * 1.33} class="foe-ring" />{/if}
          {#key lunge?.id}
            <g class:lunge={!!lunge} style={lungeStyle(lunge)}>
              {#if p}
                <!-- djv2's art faces left: turn to face the player -->
                <g transform={mirror(!!player && player.x > d.hx.cx + 1, p.gx)}>
                  <image href={asset(p.sprite.file)} x={p.x} y={p.y} width={p.w} height={p.h} />
                </g>
              {:else}
                <text y="-14" class="emoji">{pr?.icon ?? '?'}</text>
              {/if}
            </g>
          {/key}
          <g transform="translate(-18,{top - 10})">
            <rect width="36" height="6" class="hp-bg" />
            <rect width={36 * Math.max(0, f.hp / st.hp)} height="6" class="hp-fill" />
          </g>
        </g>
      {:else if d.kind === 'prop'}
        {@const { hx, cell, pr } = d}
        <g class="obj" class:ghost={fighting} class:faint={ED.on && ED.mode === 'paint' && ED.props === 'faint'} data-key={cell.key}>
          {#if pr.code === PLAYER}
            {@const f = placeFigure(content.player.figure, false, hx.cx, hx.cy, true)}
            {#if f}
              <ellipse cx={f.shadow.cx} cy={f.shadow.cy} rx={f.shadow.rx} ry={f.shadow.ry} fill="#000" opacity={f.shadow.o} filter="url(#soft)" />
              <image href={asset(f.sprite.file)} x={f.x} y={f.y} width={f.w} height={f.h} />
            {/if}
          {:else if pr.type === 'npc' && pr.npc}
            {@const npc = content.npcs[pr.npc]}
            {@const f = placeFigure(npc.figure, false, hx.cx, hx.cy)}
            {#if f}
              <ellipse cx={f.shadow.cx} cy={f.shadow.cy} rx={f.shadow.rx} ry={f.shadow.ry} fill="#000" opacity={f.shadow.o} filter="url(#soft)" />
              <g class="fig" transform={mirror(!!player && player.x < hx.cx - 1, f.gx)}>
                <image href={asset(f.sprite.file)} x={f.x} y={f.y} width={f.w} height={f.h} />
              </g>
            {:else}
              <g class="fig" transform="translate({hx.cx},{hx.cy - 18})">
                <ellipse cy="20" rx="14" ry="5" fill="#000" opacity="0.3" filter="url(#soft)" />
                <image href={asset(npc.portrait)} x="-18" y="-18" width="36" height="36" clip-path="url(#avatar)" />
                <circle r="18" fill="none" stroke="#fff" stroke-width="2.5" />
              </g>
            {/if}
          {:else}
            {@const p = place(pr, cell.key, hx.cx, hx.cy, ED.on && ED.mode === 'tune' && ED.tune.spent && cell.key === ED.tune.key)}
            {#if p}
              {#if p.shadow}
                <ellipse cx={p.shadow.cx} cy={p.shadow.cy} rx={p.shadow.rx} ry={p.shadow.ry} fill="#000" opacity={p.faded ? p.shadow.o * 0.4 : p.shadow.o} filter="url(#soft)" />
              {/if}
              <image href={asset(p.sprite.file)} x={p.x} y={p.y} width={p.w} height={p.h} opacity={p.faded ? 0.35 : 1} />
            {:else}
              <text x={hx.cx} y={hx.cy - 8} class="emoji">{pr.icon}</text>
            {/if}
          {/if}
          {#if pr.type === 'node' && (pr.tier ?? 1) > 1 && !E.isDepletedIn(G.s, cell.key, cycle)}
            <rect x={hx.cx + 11} y={hx.cy + 1} width="15" height="15" fill={pr.tier === 2 ? '#3d8bff' : '#e0a83e'} stroke="#0a1210" stroke-width="2" />
            <text x={hx.cx + 18.5} y={hx.cy + 9} class="tier">{pr.tier}</text>
          {/if}
        </g>
      {:else if player}
        {@const f = placeFigure(content.player.figure, player.walking, player.x, player.y, true)}
        {@const lunge = G.s.pos ? lunges[G.s.pos] : undefined}
        <g class="me">
          {#if f}
            <ellipse cx={f.shadow.cx} cy={f.shadow.cy} rx={f.shadow.rx} ry={f.shadow.ry} fill="#000" opacity={f.shadow.o} filter="url(#soft)" />
            <ellipse cx={f.shadow.cx} cy={f.shadow.cy} rx={f.shadow.rx * 1.24} ry={f.shadow.ry * 1.3} class="ring" />
            {#key lunge?.id}
              <g class:lunge={!!lunge} style={lungeStyle(lunge)}>
                <g transform={mirror(lunge ? lunge.dx < 0 : player.left, f.gx)}>
                  <image href={asset(f.sprite.file)} x={f.x} y={f.y} width={f.w} height={f.h} />
                </g>
              </g>
            {/key}
          {:else}
            <ellipse cx={player.x} cy={player.y + 5} rx="12" ry="5" fill="#0006" />
            <rect x={player.x - 10} y={player.y - 22} width="20" height="20" fill="#ff7a45" stroke="#0a1210" stroke-width="3" />
          {/if}
        </g>
      {/if}
    {/each}

    {#if tuned && !ED.preview}
      <!-- Tune: the box to drag the sprite by, its foot point, its shadow and the shadow's size handles -->
      {@const t = tuned}
      {@const hy = groundY(t.hx.cy)}
      <g class="tune">
        <rect class="t-box" x={t.x} y={t.y} width={t.w} height={t.h} data-tune="sprite" />
        <path class="t-hex" d="M {t.hx.cx - 5} {hy} h 10 M {t.hx.cx} {hy - 5} v 10" />
        {#if t.shadow}
          {@const sh = t.shadow}
          <ellipse class="t-shadow" cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry} data-tune="shadow" />
          <rect class="t-handle" x={sh.cx + sh.rx - 4} y={sh.cy - 4} width="8" height="8" data-tune="sw" />
          <rect class="t-handle" x={sh.cx - 4} y={sh.cy + sh.ry - 4} width="8" height="8" data-tune="sh" />
        {/if}
        <circle class="t-foot" cx={t.gx} cy={t.gy} r="3.5" />
      </g>
    {/if}

    {#each shots as f (f.id)}
      {#if f.kind === 'bolt'}
        <circle class="bolt" r="7" style="--x1:{f.x1}px;--y1:{f.y1}px;--x2:{f.x2}px;--y2:{f.y2}px;animation-delay:{f.delay}ms" />
      {:else}
        <line class="shot" x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} pathLength="100" style:animation-delay="{f.delay}ms" />
      {/if}
    {/each}

    {#each slashes as f (f.id)}
      <g transform="translate({f.x},{f.y}) rotate({f.deg})">
        <path class="slash" d="M -6 -26 Q 24 0 -6 26" style:animation-delay="{f.delay}ms" />
      </g>
    {/each}

    {#each floatsPlaced as f (f.id)}
      <text class="fx {f.kind}" x={f.x} y={f.y} style:animation-delay="{f.delay}ms">{f.text}</text>
    {/each}

    {#if chip}
      {@const w = chip.text.length * 9 + 22}
      <g class="chip" transform="translate({chip.hx.cx},{chip.hx.cy + ('below' in chip && chip.below ? 34 : -40)})">
        <rect class="chip-bg" x={-w / 2} y="-12" width={w} height="22" stroke-width="2" />
        <rect class="chip-hi" x={-w / 2 + 2} y="-10" width={w - 4} height="2" />
        <text y="0" class:bad={chip.bad}>{chip.text}</text>
      </g>
    {/if}
  </svg>
</div>

<style>
  .wrap {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 122px 48px 104px;
  }
  svg {
    position: relative; /* above the backdrop */
    overflow: visible; /* a turned field may run past the edges */
    display: block;
    flex: none;
    width: 100%;
    height: 100%;
  }
  /* on a sky backdrop the field floats: a soft shadow under the ground */
  .ground.float {
    filter: drop-shadow(0 16px 14px rgb(0 0 0 / 0.22));
  }
  .cell,
  .obj {
    cursor: pointer;
  }
  .cell.pad {
    cursor: default;
  }
  /* people don't catch clicks: the hexes behind them stay clickable (their own hex still is) */
  .fig {
    pointer-events: none;
  }
  .me {
    pointer-events: none;
  }
  .ring {
    fill: none;
    stroke: #ff7a45;
    stroke-width: 2.5;
    opacity: 0.85;
  }
  .deco {
    pointer-events: none;
  }
  .wave {
    animation: wave 4s ease-in-out infinite;
  }
  @keyframes wave {
    0%, 100% { transform: translateX(-2px); opacity: 0.15; }
    50% { transform: translateX(3px); }
  }
  .foam {
    animation: foam 3s ease-in-out infinite;
  }
  @keyframes foam {
    0%, 100% { opacity: 0.15; }
    50% { opacity: 0.6; }
  }
  .glint {
    animation: glint 5s ease-in-out infinite;
  }
  @keyframes glint {
    0%, 80%, 100% { opacity: 0; }
    88% { opacity: 0.95; }
  }
  .drift {
    animation: drift 9s ease-in-out infinite alternate;
  }
  @keyframes drift {
    from { transform: translateX(-6px); }
    to { transform: translateX(6px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .wave, .foam, .glint, .drift { animation: none; }
  }
  .cell.path .top {
    stroke: #ffffff;
    stroke-width: 2.5;
  }
  .cell.goal .top {
    stroke: #ffd77a;
    stroke-width: 3.5;
  }
  text {
    pointer-events: none;
    user-select: none;
    text-anchor: middle;
    dominant-baseline: central;
  }
  .emoji {
    font-size: 30px;
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  }
  .tier {
    font: 600 9px var(--font-label);
    fill: #fff;
  }
  .chip {
    pointer-events: none;
  }
  .overlay {
    pointer-events: none;
  }
  .danger {
    fill: #e5484d;
    opacity: 0.16;
  }
  .danger.risky {
    opacity: 0.32;
  }
  .threat {
    fill: #e5484d;
    stroke: #ff9a9d;
    stroke-width: 2;
    animation: pulse 0.9s ease-in-out infinite alternate;
  }
  @keyframes pulse {
    from {
      opacity: 0.35;
    }
    to {
      opacity: 0.7;
    }
  }
  .arrow {
    stroke: #e5484d;
    stroke-width: 5;
    stroke-linecap: round;
    opacity: 0.85;
  }
  .foe {
    cursor: pointer;
    transition: transform 170ms linear;
  }
  .foe-ring {
    fill: none;
    stroke: #e5484d;
    stroke-width: 2.5;
  }
  .hp-bg {
    fill: #0a1210;
    opacity: 0.7;
  }
  .hp-fill {
    fill: #e5484d;
  }
  svg.aiming,
  svg.aiming .cell,
  svg.aiming .obj,
  svg.aiming .foe,
  svg.autoaim .foe {
    cursor: crosshair;
  }
  /* in a fight, props fade and let clicks through: a tall tree or rock in front mustn't swallow a click on
     the enemy behind it (the hex under the click still takes it) */
  .obj.ghost {
    opacity: 0.35;
    pointer-events: none;
  }
  /* the map editor */
  .obj.faint {
    opacity: 0.25;
  }
  svg.editing .me {
    pointer-events: none;
    opacity: 0.6;
  }
  /* playing, the ground around the field pans: an open hand says so */
  svg:not(.editing),
  svg:not(.editing) .cell.pad {
    cursor: grab;
  }
  svg.panning,
  svg.panning * {
    cursor: grab !important;
  }
  svg.dragging,
  svg.dragging * {
    cursor: grabbing !important;
  }
  .edit-hex.stage {
    stroke: #ffd65c;
    stroke-width: 2.5;
    fill: rgb(255 214 92 / 0.15);
  }
  .t-box {
    fill: rgb(255 255 255 / 0.01);
    stroke: #ffd65c;
    stroke-width: 1;
    stroke-dasharray: 4 3;
    cursor: move;
  }
  .t-shadow {
    fill: rgb(255 214 92 / 0.08);
    stroke: #ffd65c;
    stroke-width: 1.5;
    cursor: move;
  }
  .t-handle {
    fill: #ffd65c;
    stroke: #0a1210;
    stroke-width: 1.5;
  }
  .t-handle:nth-of-type(2) {
    cursor: ew-resize;
  }
  .t-handle:nth-of-type(3) {
    cursor: ns-resize;
  }
  .t-foot {
    fill: #e5484d;
    stroke: #fff;
    stroke-width: 1.5;
    pointer-events: none;
  }
  .t-hex {
    stroke: #fff;
    stroke-width: 1.5;
    opacity: 0.8;
    pointer-events: none;
  }
  svg.editing,
  svg.editing .cell,
  svg.editing .obj {
    cursor: cell;
  }
  svg.editing {
    touch-action: none;
  }
  .slot polygon {
    fill: rgb(255 255 255 / 0.04);
    stroke: rgb(255 255 255 / 0.45);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .slot.hot polygon,
  .edit-hex.hot {
    fill: rgb(255 255 255 / 0.22);
    stroke: #fff;
    stroke-width: 2;
  }
  .edit-hex {
    fill: none;
    stroke: rgb(0 0 0 / 0.18);
    stroke-width: 1;
  }
  .rand {
    font: 700 13px var(--font-label);
    fill: #fff;
    stroke: #0a1210;
    stroke-width: 3;
    paint-order: stroke;
    text-anchor: middle;
    pointer-events: none;
  }
  .aimhex {
    fill: #6cc4ff;
    stroke: #c8ecff;
    stroke-width: 2;
    opacity: 0.45;
  }
  /* a dash: where you land is solid; who you'll hit on the way is red */
  .aimhex.land {
    opacity: 0.75;
    stroke: #fff;
    stroke-width: 3;
  }
  .aimhex.hit {
    fill: #e5484d;
    stroke: #ffb3b5;
  }
  .flash {
    fill: #ff5a5f;
    opacity: 0;
    animation: flash 0.4s ease-out both;
  }
  @keyframes flash {
    0% {
      opacity: 0;
    }
    25% {
      opacity: 0.75;
    }
    100% {
      opacity: 0;
    }
  }
  .slash {
    fill: none;
    stroke: #fff;
    stroke-width: 5;
    stroke-linecap: round;
    stroke-dasharray: 64;
    stroke-dashoffset: 64;
    filter: drop-shadow(0 0 4px #bfe6ff);
    animation: slash 0.32s ease-out both;
  }
  @keyframes slash {
    0% {
      stroke-dashoffset: 64;
      opacity: 1;
    }
    55% {
      stroke-dashoffset: 0;
      opacity: 1;
    }
    100% {
      stroke-dashoffset: 0;
      opacity: 0;
    }
  }
  .shot {
    stroke: #fff6dc;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 16 200;
    stroke-dashoffset: 16;
    filter: drop-shadow(0 0 3px #ffe7a8);
    animation: shot 0.22s linear both;
  }
  /* a spell: a glowing orb that flies and bursts, not a streak */
  .bolt {
    fill: #e9d4ff;
    filter: drop-shadow(0 0 4px #b77bff) drop-shadow(0 0 8px #8a4dff);
    animation: bolt 0.3s ease-in both;
  }
  @keyframes bolt {
    0% {
      transform: translate(var(--x1), var(--y1)) scale(0.6);
      opacity: 1;
    }
    80% {
      transform: translate(var(--x2), var(--y2)) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(var(--x2), var(--y2)) scale(2.2);
      opacity: 0;
    }
  }
  @keyframes shot {
    0% {
      stroke-dashoffset: 16;
      opacity: 1;
    }
    90% {
      stroke-dashoffset: -84;
      opacity: 1;
    }
    100% {
      stroke-dashoffset: -84;
      opacity: 0;
    }
  }
  .lunge {
    animation: lunge 0.26s ease-out both;
  }
  @keyframes lunge {
    0% {
      transform: translate(0, 0);
    }
    35% {
      transform: translate(var(--dx), var(--dy));
    }
    100% {
      transform: translate(0, 0);
    }
  }
  .fx {
    font: 700 18px var(--font-label);
    paint-order: stroke;
    stroke: #0a1210;
    stroke-width: 4px;
    animation: rise 0.9s ease-out both;
  }
  .fx.hit {
    fill: #fff;
  }
  .fx.crit {
    fill: #ffd77a;
    font-size: 22px;
  }
  .fx.hurt {
    fill: #ff7a7d;
  }
  .fx.miss {
    fill: #b8c4c0;
    font-size: 14px;
  }
  .fx.xp {
    fill: #9be37a;
    font-size: 13px;
    animation-duration: 1.4s;
  }
  @keyframes rise {
    0% {
      transform: translateY(0);
      opacity: 0;
    }
    8% {
      opacity: 1;
    }
    100% {
      transform: translateY(-26px);
      opacity: 0;
    }
  }
  .chip-bg {
    fill: var(--c-inset);
    stroke: var(--ink);
  }
  .chip-hi {
    fill: color-mix(in oklab, var(--c-inset) 60%, #fff);
  }
  .chip text {
    font: 600 12px var(--font-label);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    fill: var(--c-inset-fg);
  }
  .chip text.bad {
    fill: var(--warn);
  }
</style>
