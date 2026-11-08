<script lang="ts" module>
  // One camera per land, kept for the session, so reopening the map shows the same view.
  const cameras = new Map<string, { x: number; y: number; z: number }>();
</script>

<script lang="ts">
  // A nation's painted map, open over the hex field. (In code a nation is a "land".)
  //   Title screen (intro): the whole land and its name. The first visit drifts slowly in.
  //   Then: zone names. Zoomed in: point pins instead. Your own point is marked "You are here".
  // Zoomed out, the painting sits against the right edge and fades into its sea colour, so it has no
  // hard border and the left side is free for text.
  // Map units are the base painting's pixels; the camera turns them into screen pixels:
  //   screen = (map - camera) * zoom + half the viewport
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import { asset, content, pointsByZone } from '../content';
  import { DEV, G } from '../lib/game.svelte';
  import type { Zone } from '../engine/types';
  import { enterLand, travelTo } from './commands';
  import { focusQuest, pointClosed } from '../engine/story';
  import { KIND_LABEL, PIN_TONE } from './types';

  let {
    landId,
    intro,
    animate,
    zone = undefined,
    focus = undefined,
  }: { landId: string; intro: boolean; animate: boolean; zone?: string; focus?: number } = $props();


  const land = $derived(content.lands[landId]);
  const W = $derived(land.map.width);
  const H = $derived(land.map.height);
  const sea = $derived(land.map.sea ?? '#0f2236');

  const INSET = 10; // px between the painting and the screen's top and bottom, zoomed all the way out
  const SAFE_TOP = 112; // px the top bar covers: zoomed in, the painting's top edge can be pulled clear of it
  const SAFE_BOTTOM = 96; // px the bottom of the HUD covers
  const MAX_ZOOM = 1.6; // screen px per map unit, before the base painting gets too soft
  const MAX_ZOOM_PATCHES = 3.5; // with detail patches, you can go further
  const PATCH_FADE: [number, number] = [0.7, 1.0]; // zoom range over which patches fade in
  const PIN_SWAP: [number, number] = [1.5, 2.0]; // zoom range (relative to "fit") where zone names give way to point pins

  let viewport: HTMLDivElement;
  let vw = $state(0);
  let vh = $state(0);
  const fit = $derived(vw && vh ? Math.min(vw / W, (vh - 2 * INSET) / H) : 0);
  const maxZ = $derived(Math.max(fit * 1.01, land.patches?.length ? MAX_ZOOM_PATCHES : MAX_ZOOM));

  /** Where the camera goes to show one zone. */
  function zoneCam(id: string | undefined) {
    const z = id ? land.zones.find((x) => x.id === id) : undefined;
    return z ? { x: z.label[0], y: z.label[1] + 60, z: fit * 2.4 } : null;
  }

  let cam = $state({ x: 0, y: 0, z: 0 });
  $effect(() => {
    // first layout: the title screen shows the whole land; a zone shows that zone; otherwise restore this land's camera
    if (cam.z === 0 && fit) {
      const whole = untrack(() => intro);
      const atZone = untrack(() => zoneCam(zone));
      cam = clamp(whole ? { x: W, y: H / 2, z: fit } : (atZone ?? cameras.get(landId) ?? { x: W, y: H / 2, z: fit }));
    }
  });

  // asked to show a zone while the map is already open (the breadcrumb): fly there
  let lastFocus = untrack(() => focus);
  $effect(() => {
    const f = focus;
    if (f === lastFocus) return;
    lastFocus = f;
    const target = untrack(() => (cam.z ? zoneCam(zone) : null));
    if (target) flyTo(target.x, target.y, target.z);
  });
  $effect(() => {
    if (cam.z && !intro) cameras.set(landId, { x: cam.x, y: cam.y, z: cam.z });
  });

  // the first visit's slow push in
  $effect(() => {
    if (!intro || !animate || !fit) return;
    const z0 = untrack(() => cam.z) || fit;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 30000);
      cam = clamp({ x: W, y: H / 2, z: z0 * (1 + 0.07 * k * k * (3 - 2 * k)) });
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });

  const rel = $derived(fit ? cam.z / fit : 1);
  const smooth = (a: number, b: number, v: number) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const pinsIn = $derived(smooth(PIN_SWAP[0], PIN_SWAP[1], rel));
  const patchIn = $derived(smooth(PATCH_FADE[0], PATCH_FADE[1], cam.z));

  const points = $derived(land.zones.filter((z) => !z.locked).flatMap((z) => pointsByZone[z.id] ?? []));
  const here = $derived(G.s.point && points.some((p) => p.id === G.s.point) ? content.points[G.s.point] : undefined);

  // only patches that are on screen and close to fading in get loaded
  const visiblePatches = $derived(
    (land.patches ?? []).filter((p) => {
      if (cam.z < PATCH_FADE[0] * 0.85) return false;
      const [x, y, w, h] = p.rect;
      const hw = vw / (2 * cam.z);
      const hh = vh / (2 * cam.z);
      return x < cam.x + hw && x + w > cam.x - hw && y < cam.y + hh && y + h > cam.y - hh;
    }),
  );

  /** Keep the camera on the painting. When the painting is narrower than the screen it sits against the right edge.
   *  When it's shorter than the screen it sits in the middle; once taller, its top and bottom edges can be pulled
   *  clear of the HUD, so nothing near them stays hidden. */
  function clamp(c: { x: number; y: number; z: number }) {
    const z = Math.min(maxZ, Math.max(fit, c.z));
    const hw = vw / (2 * z);
    const hh = vh / (2 * z);
    const x = W <= 2 * hw ? W - hw : Math.min(W - hw, Math.max(hw, c.x));
    const y = H * z <= vh - 2 * INSET + 0.5 ? H / 2 : Math.min(H - hh + SAFE_BOTTOM / z, Math.max(hh - SAFE_TOP / z, c.y));
    return { x, y, z };
  }

  const toScreen = (p: [number, number]) => [(p[0] - cam.x) * cam.z + vw / 2, (p[1] - cam.y) * cam.z + vh / 2];

  /** Zoom by a factor, keeping the map point under (sx, sy) where it is on screen. */
  function zoomAt(sx: number, sy: number, factor: number) {
    const mx = (sx - vw / 2) / cam.z + cam.x;
    const my = (sy - vh / 2) / cam.z + cam.y;
    const z = Math.min(maxZ, Math.max(fit, cam.z * factor));
    cam = clamp({ x: mx - (sx - vw / 2) / z, y: my - (sy - vh / 2) / z, z });
  }

  let anim = 0;
  function flyTo(x: number, y: number, z: number) {
    cancelAnimationFrame(anim);
    const from = { ...cam };
    const to = clamp({ x, y, z });
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 380);
      const e = 1 - Math.pow(1 - k, 3);
      cam = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z: from.z * Math.pow(to.z / from.z, e) };
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  function openZone(z: Zone) {
    const target = zoneCam(z.id);
    if (target) flyTo(target.x, target.y, target.z);
  }

  // ---------- pointer input: drag to pan, wheel or pinch to zoom ----------
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = 0; // px moved since pointer down: a drag, not a click, past a few px
  let pinchDist = 0;

  function local(e: { clientX: number; clientY: number }) {
    const r = viewport.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  function onpointerdown(e: PointerEvent) {
    if (intro) {
      enterLand();
      return;
    }
    cancelAnimationFrame(anim);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function onpointermove(e: PointerEvent) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 4 && !viewport.hasPointerCapture(e.pointerId)) viewport.setPointerCapture(e.pointerId);
    if (pointers.size === 1) {
      cam = clamp({ x: cam.x - dx / cam.z, y: cam.y - dy / cam.z, z: cam.z });
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const [sx, sy] = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      if (pinchDist) zoomAt(sx, sy, d / pinchDist);
      pinchDist = d;
    }
  }

  function onpointerup(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
  }

  $effect(() => {
    // wheel needs a non-passive listener so the page doesn't scroll
    const onwheel = (e: WheelEvent) => {
      e.preventDefault();
      if (intro) {
        enterLand();
        return;
      }
      const [sx, sy] = local(e);
      zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015));
    };
    viewport.addEventListener('wheel', onwheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onwheel);
  });

  /** Pins act on click only if the pointer didn't drag the map. */
  const tap = (fn: () => void) => () => {
    if (moved <= 4) fn();
  };
</script>

<div
  class="viewport"
  class:intro
  style:--sea={sea}
  bind:this={viewport}
  bind:clientWidth={vw}
  bind:clientHeight={vh}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  onpointercancel={onpointerup}
  role="application"
  aria-label="Map of {land.name}"
>
  {#if cam.z}
    <div class="stage" style:transform="translate({vw / 2 - cam.x * cam.z}px, {vh / 2 - cam.y * cam.z}px) scale({cam.z})">
      <img class="base edge-fade" src={asset(land.map.image)} width={W} height={H} alt="" draggable="false" />
      {#each visiblePatches as p (p.image)}
        <img
          class="patch"
          src={asset(p.image)}
          alt=""
          draggable="false"
          style:left="{p.rect[0]}px"
          style:top="{p.rect[1]}px"
          style:width="{p.rect[2]}px"
          style:height="{p.rect[3]}px"
          style:opacity={patchIn}
        />
      {/each}
    </div>

    <div class="shade" class:strong={intro}></div>
    <div class="band top"></div>
    <div class="band bottom"></div>

    {#if !intro}
      <div class="marks" in:fade={{ duration: 300 }}>
        {#each land.zones as z (z.id)}
          {@const s = toScreen(z.label)}
          <button
            class="zone"
            class:locked={!!z.locked}
            disabled={!!z.locked}
            style:left="{s[0]}px"
            style:top="{s[1]}px"
            style:opacity={1 - pinsIn}
            style:pointer-events={pinsIn > 0.7 ? 'none' : 'auto'}
            onclick={tap(() => openZone(z))}
          >
            {z.name}{#if z.locked}<small class="lbl">{z.locked}</small>{/if}
          </button>
        {/each}

        {#each points as p (p.id)}
          {@const s = toScreen(p.pin)}
          {@const closed = pointClosed(G.s, content, p.id)}
          <button
            class="map-pin"
            class:current={p.id === G.s.point}
            class:closed={!!closed}
            disabled={!!closed && !DEV.on}
            style:left="{s[0]}px"
            style:top="{s[1]}px"
            style:opacity={pinsIn}
            style:pointer-events={pinsIn < 0.3 ? 'none' : 'auto'}
            onclick={tap(() => travelTo(p.id))}
            title={closed ? `${p.name}: ${closed.toLowerCase()}.` : p.id === G.s.point ? 'Back here' : `${p.name}: ${KIND_LABEL[p.kind]}. Travel is free.`}
          >
            <span class="px shield {PIN_TONE[p.kind]}"><i></i></span>
            <span class="pin-name">{p.name}{#if closed}<small> · {closed}</small>{/if}</span>
          </button>
        {/each}

        {#if here}
          {@const s = toScreen(here.pin)}
          <div class="you-are-here" style:left="{s[0]}px" style:top="{s[1] + 34}px" style:opacity={Math.max(0.6, pinsIn)}>
            <i></i><span class="lbl">You are here</span>
          </div>
        {/if}
      </div>

      <div class="controls">
        <button class="px btn bevel t-panel" onclick={() => zoomAt(vw / 2, vh / 2, 1.5)} aria-label="Zoom in" title="Zoom in"><span class="lbl l">+</span></button>
        <button class="px btn bevel t-panel" onclick={() => zoomAt(vw / 2, vh / 2, 1 / 1.5)} aria-label="Zoom out" title="Zoom out"><span class="lbl l">−</span></button>
        <button class="px btn bevel t-panel" onclick={() => flyTo(W, H / 2, fit)} aria-label="Show the whole nation" title="Whole nation"><span class="lbl">All</span></button>
      </div>

      <div class="quest" in:fade={{ duration: 400, delay: 150 }}>
        <div class="lbl m eyebrow">Active quest</div>
        <div class="disp qt">{focusQuest(G.s, content)?.title ?? 'No quest'}</div>
        <div class="body qo">{focusQuest(G.s, content)?.objective ?? 'Explore.'}</div>
      </div>
    {/if}

    <div class="title" class:intro class:animate={intro && animate}>
      <h1 class="disp">{land.name}</h1>
      {#if land.subtitle}<div class="disp sub">{land.subtitle}</div>{/if}
      {#if intro}
        <button class="px btn bevel t-accent enter" onclick={enterLand}><span class="lbl l">Enter</span></button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .viewport {
    position: absolute;
    inset: 0;
    overflow: hidden;
    touch-action: none;
    cursor: grab;
    background: var(--sea);
    user-select: none;
  }
  .viewport:active {
    cursor: grabbing;
  }
  .viewport.intro {
    cursor: pointer;
  }
  .stage {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
    will-change: transform;
  }
  .stage img {
    position: absolute;
    left: 0;
    top: 0;
    max-width: none;
    pointer-events: none;
  }
  .patch {
    /* soft edges, so the patch melts into the base painting */
    mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent),
      linear-gradient(to bottom, transparent, #000 6%, #000 94%, transparent);
    mask-composite: intersect;
  }
  /* darkens the left, where the text sits */
  .shade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(to right, color-mix(in srgb, var(--sea) 70%, transparent), transparent 38%);
  }
  .shade.strong {
    background: linear-gradient(to right, color-mix(in srgb, var(--sea) 92%, transparent) 0%, color-mix(in srgb, var(--sea) 55%, transparent) 30%, transparent 55%),
      radial-gradient(ellipse at 65% 50%, transparent 55%, color-mix(in srgb, var(--sea) 60%, transparent));
  }
  /* soft blurred edges at the top and bottom, under the HUD */
  .band {
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
    backdrop-filter: blur(6px);
  }
  .band.top {
    top: 0;
    height: 150px;
    background: linear-gradient(to bottom, color-mix(in srgb, var(--sea) 75%, transparent), transparent);
    mask-image: linear-gradient(to bottom, #000 25%, transparent);
  }
  .band.bottom {
    bottom: 0;
    height: 130px;
    background: linear-gradient(to top, color-mix(in srgb, var(--sea) 75%, transparent), transparent);
    mask-image: linear-gradient(to top, #000 25%, transparent);
  }
  .marks {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .zone {
    position: absolute;
    transform: translate(-50%, -50%);
    background: none;
    border: 0;
    cursor: pointer;
    text-align: center;
    font: 700 19px/1.1 Georgia, 'Times New Roman', serif;
    color: #fff;
    letter-spacing: 1px;
    text-shadow: 0 2px 6px #000, 0 0 18px #000a;
  }
  .zone small {
    display: block;
    margin-top: 4px;
    color: #ffd77a;
    text-shadow: 0 1px 0 var(--map-ink);
  }
  .zone.locked {
    color: #c9cfd2;
    cursor: default;
  }
  .controls {
    position: absolute;
    right: 18px;
    top: 50%;
    translate: 0 -50%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .controls button {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    padding-bottom: 4px;
  }
  .title {
    position: absolute;
    left: 28px;
    top: 182px; /* below the portrait and the People button */
    max-width: 440px;
    pointer-events: none;
    text-shadow: 0 3px 0 var(--map-ink), 0 0 18px rgb(0 0 0 / 0.6);
  }
  .title.intro {
    top: 50%;
    left: 6vw;
    translate: 0 -50%;
  }
  .title.animate {
    animation: title-in 1.4s ease-out both;
  }
  h1 {
    margin: 0;
    font-size: 64px;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: #fff4dc;
  }
  .intro h1 {
    font-size: 128px;
    letter-spacing: 10px;
  }
  .sub {
    font-size: 26px;
    color: #f2c766;
    letter-spacing: 2px;
  }
  .intro .sub {
    font-size: 40px;
  }
  .enter {
    pointer-events: auto;
    margin-top: 36px;
    padding: 10px 22px 14px;
    text-shadow: none;
  }
  .title.animate .enter {
    animation: title-in 1s ease-out 0.9s both;
  }
  .quest {
    position: absolute;
    left: 28px;
    bottom: 26px;
    max-width: 380px;
    pointer-events: none;
    text-shadow: 0 2px 0 var(--map-ink), 0 0 14px rgb(0 0 0 / 0.7);
  }
  .eyebrow {
    color: #f2c766;
    margin-bottom: 6px;
  }
  .qt {
    font-size: 30px;
    color: #fff;
  }
  .qo {
    color: #f3e6c8;
    margin-top: 4px;
  }
  @keyframes title-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
