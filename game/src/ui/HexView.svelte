<script lang="ts">
  // One point: hex ground drawn in code; painted objects and character figures on top, sorted back to front
  // so a figure can pass behind a tree. The player's figure walks the route hex by hex, alternating its two
  // frames and facing the way it moves; people turn to face the player.
  // Hovering a hex shows a chip over it: what's there and what walking there costs.
  // Enemies stand on the field too (engine/combat.ts): a territorial one's notice range is tinted red, and what
  // each enemy will do next is shown one tick ahead (an arrow for a move, red hexes for an attack). Walking goes
  // one hex per step, each a tick; clicking an enemy next to you attacks it.
  // The field scales to fill the space between the HUD's edges; its backdrop (sky or sea) fills the screen.
  import { untrack } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { DEV, G, act, short } from '../lib/game.svelte';
  import { UI } from '../lib/ui.svelte';
  import { fireAim, stopWalk, walk as walkRoute } from './commands';
  import { asset, content, sprites, type Sprite } from '../content';
  import * as E from '../engine/actions';
  import { grid, route } from '../engine/hex';
  import * as K from '../engine/combat';
  import type { Cell, Figure, Foe, Fx, Prop } from '../engine/types';
  import Backdrop from './Backdrop.svelte';
  import { HEXW, R, SQ, groundY, layout, shade, type HexGeom } from './geo';
  import { themeOf } from './themes';

  let { pointId }: { pointId: string } = $props();

  const FIGURE_H = 1.25; // a figure's height, in hex widths, unless its content says otherwise
  const STEP_MS = 170; // time to walk from one hex to the next
  const DASH_MS = 110; // a dash: one quick jump from where you were to where you land
  const SIDESTEP = 0.26; // standing on a hex with something on it, the player stands this far to its left (hex widths)

  const g = $derived(grid(content, pointId, G.s.day));
  // the field turns smoothly to UI.angle ([ and ]); its size on screen stays what it is unturned, so a turned
  // field can run past the screen's edges instead of shrinking to fit
  const turn = new Tween(untrack(() => UI.angle), { duration: 280, easing: cubicOut });
  $effect(() => {
    turn.target = UI.angle;
  });
  const heightOf = (x: Cell) => content.terrain[x.t].height;
  const L = $derived(layout(g.cells, heightOf, turn.current));
  const L0 = $derived(layout(g.cells, heightOf, 0));
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
      const x = g.byKey.get(hx.key)!;
      if (content.terrain[x.t]?.cost != null) t = Math.min(t, groundY(hx.cy) - tallest);
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
  const top = $derived(topOf(L));
  /** The view: the unturned field's size, centred on the turned field. */
  const view = $derived.by(() => {
    const w = L0.width;
    const h = L0.height - topOf(L0);
    const cx = L.width / 2;
    const cy = (top + L.height) / 2;
    return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
  });

  // ---------- enemies ----------

  const seen = (key: string) => {
    const x = g.byKey.get(key);
    return !!x && E.isSeen(G.s, content, pointId, x);
  };
  const foes = $derived(G.s.point === pointId ? (G.s.foes[pointId] ?? []).filter((f) => seen(f.pos)) : []);
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
  const fighting = $derived(K.inFight(G.s));
  const onPath = $derived(new Set(plan?.path.map((p) => p.key) ?? []));
  const risky = $derived(!!plan?.path.some((p) => danger.has(p.key)));

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  /** The chip over the hovered hex. */
  const chip = $derived.by(() => {
    const x = hover ? g.byKey.get(hover) : undefined;
    const hx = hover ? L.hexes.get(hover) : undefined;
    if (!x || !hx || x.key === G.s.pos) return null;
    if (UI.aim) {
      const sk = content.skills[UI.aim];
      return { hx, text: aimHexes.size ? sk.name : `${sk.name} · ✕`, bad: !aimHexes.size };
    }
    if (!E.isSeen(G.s, content, pointId, x)) return { hx, text: '?', bad: false };
    if (hoverFoe) {
      const st = K.foeStats(content, hoverFoe.kind);
      const name = cap(content.props[hoverFoe.kind]?.name ?? hoverFoe.kind);
      if (E.canHit(G.s, content, hoverFoe.id)) {
        const me = K.playerStats();
        const hit = Math.round((1 - K.dodgeChance(me, st)) * 100);
        return { hx, text: `Attack · ${K.fmt(K.baseDamage(me.atk, st.def))} dmg · ${hit}%`, bad: false };
      }
      return { hx, text: `${name} · ${Math.ceil(hoverFoe.hp)}/${st.hp}${plan ? ` · ${plan.cost}⚡` : ''}`, bad: !!plan && short(plan.cost) };
    }
    const pr = E.visibleProp(G.s, content, x);
    const name = pr ? `${cap(pr.name)} · ` : '';
    if (!plan) return { hx, text: `${name}✕`, bad: true };
    return { hx, text: `${risky ? '! ' : ''}${name}${plan.cost}⚡`, bad: short(plan.cost) || risky };
  });

  const colourOf = (key: string) => {
    const x = g.byKey.get(key)!;
    return E.isSeen(G.s, content, pointId, x) ? content.terrain[x.t].colour : themeOf(DEV.theme).fog;
  };

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
    | { kind: 'player'; key: string; y: number };

  const drawables = $derived.by(() => {
    const out: Drawable[] = [];
    for (const hx of L.order) {
      const cell = g.byKey.get(hx.key)!;
      const pr = E.isSeen(G.s, content, pointId, cell) ? E.visibleProp(G.s, content, cell) : null;
      if (pr) out.push({ kind: 'prop', key: hx.key, y: hx.cy, hx, cell, pr });
    }
    for (const f of foes) {
      const hx = L.hexes.get(f.pos);
      if (hx) out.push({ kind: 'foe', key: `@foe:${f.id}`, y: hx.cy, hx, foe: f });
    }
    if (player) out.push({ kind: 'player', key: '@player', y: player.y + 0.5 });
    return out.sort((a, b) => a.y - b.y);
  });

  interface Placed {
    sprite: Sprite;
    x: number;
    y: number;
    w: number;
    h: number;
    faded: boolean;
    shadow: { cx: number; cy: number; rx: number; ry: number } | null;
  }

  /** Where a prop's sprite goes: its ground point on the hex, scaled to its size class, plus hand-tuned offsets.
   *  A node used up today shows its spent sprite (stump, rubble) if it has one, otherwise it fades. */
  function place(pr: Prop, key: string, cx: number, cy: number): Placed | null {
    const used = pr.type === 'node' && !!G.s.depleted[key];
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
    if (pr.flat) return { sprite: sp, x: cx - w / 2 + ox, y: cy - h / 2 + oy, w, h, faded, shadow: null };
    const gx = cx + ox;
    const gy = groundY(cy) + oy;
    return { sprite: sp, x: gx - sp.bx * w, y: gy - sp.by * h, w, h, faded, shadow: { cx: gx + 3, cy: gy - 1, rx: w * 0.42, ry: w * 0.15 } };
  }

  /** Where a figure goes: its legs centred on (x, the hex's ground point). */
  function placeFigure(fig: Figure | undefined, walking: boolean, x: number, cy: number) {
    const id = walking && fig?.walk ? fig.walk : fig?.stand;
    const sp = id ? sprites[id] : undefined;
    if (!sp) return null;
    const h = figureH(fig);
    const w = (h * sp.w) / sp.h;
    const gy = groundY(cy);
    return { sprite: sp, x: x - (sp.fx ?? sp.bx) * w, y: gy - sp.by * h, w, h, gx: x, gy };
  }

  /** Mirror around a vertical line, to face left. */
  const mirror = (on: boolean, x: number) => (on ? `translate(${2 * x},0) scale(-1,1)` : undefined);

  function keyAt(ev: Event): string | null {
    return (ev.target as Element).closest('[data-key]')?.getAttribute('data-key') ?? null;
  }

  // ---------- clicking: aim a skill, attack, or walk (step by step, in commands.ts) ----------

  function onclick(ev: MouseEvent) {
    const key = keyAt(ev);
    if (!key || key === G.s.pos) return;
    if (UI.aim) return fireAim(key);
    stopWalk();
    const f = K.foeAt(G.s, key);
    if (f && E.canHit(G.s, content, f.id)) return act((s) => E.attack(s, content, f.id));
    const p = E.planRoute(G.s, content, key);
    if (!p || !p.path.length) return;
    if (short(p.cost)) return act((s) => E.say(s, `Not enough energy: that walk needs ${p.cost}⚡ and you have ${s.energy}.`));
    walkRoute(p.path.map((x) => x.key));
  }

  // ---------- what the last action did: numbers, slashes, lunges, flashes ----------
  // The enemies' turn (phase 1) plays a beat after yours, so a fight reads as blow, then answer.

  const FX_MS = 900;
  const PHASE_MS = 220;
  const TEXT = new Set(['hit', 'crit', 'miss', 'hurt']);
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

<div class="wrap">
  <Backdrop kind={backdrop} />
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <svg viewBox={view} class:aiming={!!UI.aim} {onclick} onmousemove={(ev) => (hover = keyAt(ev))} onmouseleave={() => (hover = null)}>
    <defs>
      <clipPath id="avatar"><circle r="18" /></clipPath>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" /></filter>
      <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="#e5484d" />
      </marker>
    </defs>

    <g class="ground" class:float={backdrop === 'sky'}>
      {#each L.order as hx (hx.key)}
        {@const col = colourOf(hx.key)}
        <g class="cell" class:path={onPath.has(hx.key)} class:goal={hover === hx.key && !!plan} data-key={hx.key}>
          {#each hx.sides as side, i (i)}<polygon points={side.points} fill={shade(col, side.shade)} />{/each}
          <polygon class="top" points={hx.top} fill={col} stroke={shade(col, 0.82)} />
        </g>
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
        {#if aimHexes.has(hx.key)}<polygon class="aimhex" points={hx.top} />{/if}
      {/each}
      {#each flashes as f (f.id)}
        <polygon class="flash" points={f.hx.top} style:animation-delay="{f.delay}ms" />
      {/each}
      {#each arrows as a (a.id)}
        <line class="arrow" x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} marker-end="url(#arrowhead)" />
      {/each}
    </g>

    {#each drawables as d (d.key)}
      {#if d.kind === 'foe'}
        {@const f = d.foe}
        {@const pr = content.props[f.kind]}
        {@const st = K.foeStats(content, f.kind)}
        {@const sp = pr?.sprite ? sprites[pr.sprite] : undefined}
        {@const gy = groundY(d.hx.cy) - d.hx.cy}
        {@const w = HEXW * (pr?.size ?? 0.8)}
        {@const h = sp ? (w * sp.h) / sp.w : 40}
        {@const top = sp ? gy - sp.by * h : -44}
        {@const lunge = lunges[f.pos]}
        <g class="foe" class:engaged={f.engaged} style:transform="translate({d.hx.cx}px, {d.hx.cy}px)" data-key={f.pos}>
          <ellipse cy={gy - 1} rx={sp ? w * 0.42 : 18} ry={sp ? w * 0.15 : 6} fill="#000" opacity="0.3" filter="url(#soft)" />
          {#if f.engaged}<ellipse cy={gy - 1} rx={sp ? w * 0.55 : 24} ry={sp ? w * 0.2 : 9} class="foe-ring" />{/if}
          {#key lunge?.id}
            <g class:lunge={!!lunge} style={lungeStyle(lunge)}>
              {#if sp}
                <!-- djv2's art faces left: turn to face the player -->
                <g transform={player && player.x > d.hx.cx + 1 ? 'scale(-1,1)' : undefined}>
                  <image href={asset(sp.file)} x={-sp.bx * w} y={top} width={w} height={h} />
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
        <g class="obj" class:ghost={fighting} data-key={cell.key}>
          {#if pr.type === 'npc' && pr.npc}
            {@const npc = content.npcs[pr.npc]}
            {@const f = placeFigure(npc.figure, false, hx.cx, hx.cy)}
            {#if f}
              <ellipse cx={f.gx} cy={f.gy - 1} rx={f.w * 0.42} ry={f.w * 0.15} fill="#000" opacity="0.32" filter="url(#soft)" />
              <g transform={mirror(!!player && player.x < hx.cx - 1, f.gx)}>
                <image href={asset(f.sprite.file)} x={f.x} y={f.y} width={f.w} height={f.h} />
              </g>
            {:else}
              <g transform="translate({hx.cx},{hx.cy - 18})">
                <ellipse cy="20" rx="14" ry="5" fill="#000" opacity="0.3" filter="url(#soft)" />
                <image href={asset(npc.portrait)} x="-18" y="-18" width="36" height="36" clip-path="url(#avatar)" />
                <circle r="18" fill="none" stroke="#fff" stroke-width="2.5" />
              </g>
            {/if}
          {:else}
            {@const p = place(pr, cell.key, hx.cx, hx.cy)}
            {#if p}
              {#if p.shadow}
                <ellipse cx={p.shadow.cx} cy={p.shadow.cy} rx={p.shadow.rx} ry={p.shadow.ry} fill="#000" opacity={p.faded ? 0.12 : 0.32} filter="url(#soft)" />
              {/if}
              <image href={asset(p.sprite.file)} x={p.x} y={p.y} width={p.w} height={p.h} opacity={p.faded ? 0.35 : 1} />
            {:else}
              <text x={hx.cx} y={hx.cy - 8} class="emoji">{pr.icon}</text>
            {/if}
          {/if}
          {#if pr.type === 'node' && (pr.tier ?? 1) > 1 && !G.s.depleted[cell.key]}
            <rect x={hx.cx + 11} y={hx.cy + 1} width="15" height="15" fill={pr.tier === 2 ? '#3d8bff' : '#e0a83e'} stroke="#0a1210" stroke-width="2" />
            <text x={hx.cx + 18.5} y={hx.cy + 9} class="tier">{pr.tier}</text>
          {/if}
        </g>
      {:else if player}
        {@const f = placeFigure(content.player.figure, player.walking, player.x, player.y)}
        {@const lunge = G.s.pos ? lunges[G.s.pos] : undefined}
        <g class="me">
          {#if f}
            <ellipse cx={f.gx} cy={f.gy - 1} rx={f.w * 0.5} ry={f.w * 0.17} fill="#000" opacity="0.3" filter="url(#soft)" />
            <ellipse cx={f.gx} cy={f.gy - 1} rx={f.w * 0.62} ry={f.w * 0.22} class="ring" />
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
      <g class="chip" transform="translate({chip.hx.cx},{chip.hx.cy - 40})">
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
  .me {
    pointer-events: none;
  }
  .ring {
    fill: none;
    stroke: #ff7a45;
    stroke-width: 2.5;
    opacity: 0.85;
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
  svg.aiming .foe {
    cursor: crosshair;
  }
  .obj.ghost {
    opacity: 0.35;
  }
  .aimhex {
    fill: #6cc4ff;
    stroke: #c8ecff;
    stroke-width: 2;
    opacity: 0.45;
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
