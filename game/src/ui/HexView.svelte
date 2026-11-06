<script lang="ts">
  // One point: hex ground drawn in code; painted objects and character figures on top, sorted back to front
  // so a figure can pass behind a tree. The player's figure walks the route hex by hex, alternating its two
  // frames and facing the way it moves; people turn to face the player.
  // Hovering a hex shows a chip over it: what's there and what walking there costs.
  // The field scales to fill the space between the HUD's edges; its backdrop (sky or sea) fills the screen.
  import { untrack } from 'svelte';
  import { DEV, G, act, short } from '../lib/game.svelte';
  import { asset, content, sprites, type Sprite } from '../content';
  import * as E from '../engine/actions';
  import { grid, route } from '../engine/hex';
  import type { Cell, Figure, Prop } from '../engine/types';
  import Backdrop from './Backdrop.svelte';
  import { HEXW, R, SQ, groundY, layout, shade, type HexGeom } from './geo';
  import { themeOf } from './themes';

  let { pointId }: { pointId: string } = $props();

  const FIGURE_H = 1.25; // a figure's height, in hex widths, unless its content says otherwise
  const STEP_MS = 170; // time to walk from one hex to the next
  const SIDESTEP = 0.26; // standing on a hex with something on it, the player stands this far to its left (hex widths)

  const g = $derived(grid(content, pointId, G.s.day));
  const L = $derived(layout(g.cells, (x) => content.terrain[x.t].height, DEV.angle));
  const here = $derived(E.hereCell(G.s, content));
  const backdrop = $derived(content.points[pointId].backdrop ?? 'sky');

  const figureH = (f: Figure | undefined) => HEXW * (f?.height ?? FIGURE_H);

  /** The top of everything that can ever be drawn on this point (every prop at full size, a figure on any hex
   *  you can walk on, the hover chip), so the view can be cropped to it without moving as fog clears. */
  const top = $derived.by(() => {
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
  });

  let hover = $state<string | null>(null);
  const plan = $derived(hover && hover !== G.s.pos ? E.planRoute(G.s, content, hover) : null);
  const onPath = $derived(new Set(plan?.path.map((p) => p.key) ?? []));

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  /** The chip over the hovered hex. */
  const chip = $derived.by(() => {
    const x = hover ? g.byKey.get(hover) : undefined;
    const hx = hover ? L.hexes.get(hover) : undefined;
    if (!x || !hx || x.key === G.s.pos) return null;
    if (!E.isSeen(G.s, content, pointId, x)) return { hx, text: '?', bad: false };
    const pr = E.visibleProp(G.s, content, x);
    const name = pr ? `${cap(pr.name)} · ` : '';
    if (!plan) return { hx, text: `${name}✕`, bad: true };
    return { hx, text: `${name}${plan.cost}⚡`, bad: short(plan.cost) };
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

  let walk = $state<{ keys: string[]; t0: number; fromSide: boolean; toSide: boolean } | null>(null);
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
      const r = route(g, a, b, (x) => content.terrain[x.t]?.cost != null, (x) => content.terrain[x.t].cost ?? 1);
      const keys = r && r.path.length ? [a.key, ...r.path.map((c) => c.key)] : [a.key, b.key];
      const A = L.hexes.get(keys[keys.length - 2]);
      const B = L.hexes.get(keys[keys.length - 1]);
      if (A && B && Math.abs(B.cx - A.cx) > 0.5) facesLeft = B.cx < A.cx;
      const t0 = performance.now();
      walk = { keys, t0, fromSide: hasProp(a.key), toSide: hasProp(b.key) };
      now = t0;
    });
  });

  // drive the walk one frame at a time
  $effect(() => {
    if (!walk) return;
    const { t0, keys } = walk;
    const total = (keys.length - 1) * STEP_MS;
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
      const p = Math.min(n, Math.max(0, (now - walk.t0) / STEP_MS));
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
          walking: Math.floor(p * 2) % 2 === 0,
        };
      }
    }
    return { x: end.cx + (E.visibleProp(G.s, content, here) ? side : 0), y: end.cy, left: facesLeft, walking: false };
  });

  // ---------- what gets drawn, back to front ----------

  type Drawable =
    | { kind: 'prop'; key: string; y: number; hx: HexGeom; cell: Cell; pr: Prop }
    | { kind: 'player'; key: string; y: number };

  const drawables = $derived.by(() => {
    const out: Drawable[] = [];
    for (const hx of L.order) {
      const cell = g.byKey.get(hx.key)!;
      const pr = E.isSeen(G.s, content, pointId, cell) ? E.visibleProp(G.s, content, cell) : null;
      if (pr) out.push({ kind: 'prop', key: hx.key, y: hx.cy, hx, cell, pr });
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

  function onclick(ev: MouseEvent) {
    const key = keyAt(ev);
    if (key && key !== G.s.pos) act((s) => E.moveTo(s, content, key, G.now));
  }
</script>

<div class="wrap">
  <Backdrop kind={backdrop} />
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <svg viewBox="0 {top} {L.width} {L.height - top}" {onclick} onmousemove={(ev) => (hover = keyAt(ev))} onmouseleave={() => (hover = null)}>
    <defs>
      <clipPath id="avatar"><circle r="18" /></clipPath>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" /></filter>
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

    {#each drawables as d (d.key)}
      {#if d.kind === 'prop'}
        {@const { hx, cell, pr } = d}
        <g class="obj" data-key={cell.key}>
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
        <g class="me">
          {#if f}
            <ellipse cx={f.gx} cy={f.gy - 1} rx={f.w * 0.5} ry={f.w * 0.17} fill="#000" opacity="0.3" filter="url(#soft)" />
            <ellipse cx={f.gx} cy={f.gy - 1} rx={f.w * 0.62} ry={f.w * 0.22} class="ring" />
            <g transform={mirror(player.left, f.gx)}>
              <image href={asset(f.sprite.file)} x={f.x} y={f.y} width={f.w} height={f.h} />
            </g>
          {:else}
            <ellipse cx={player.x} cy={player.y + 5} rx="12" ry="5" fill="#0006" />
            <rect x={player.x - 10} y={player.y - 22} width="20" height="20" fill="#ff7a45" stroke="#0a1210" stroke-width="3" />
          {/if}
        </g>
      {/if}
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
