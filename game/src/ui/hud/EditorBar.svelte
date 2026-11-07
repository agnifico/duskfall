<script lang="ts">
  // The map editor's panel (dev mode, E). Paint: brushes for ground and props, brush size, fill, the point's
  // settings. Tune: one object's size and offsets on the hex, its sprite's foot point and its shadow, as
  // sliders (the field has drag handles for the same). Keys are listed at the bottom of the panel.
  import { G } from '../../lib/game.svelte';
  import {
    ED, PLAYER, dirty, isFigure, redo, save, setPoint, tunePropSet, tuneSelect, tuneSprite, tuneSpriteSet, undo,
    type Brush, type PointSetting, type PropFields,
  } from '../../lib/editor.svelte';
  import { asset, content, sprites, type Tune } from '../../content';
  import { grid } from '../../engine/hex';
  import type { Prop } from '../../engine/types';
  import { PLAYER_SHADOW, SHADOW } from '../shadow';
  import { toggleEditor } from '../commands';

  const pid = $derived(G.s.point!);
  const P = $derived((void ED.v, content.points[pid]));
  const terrains = Object.entries(content.terrain);
  const all = Object.values(content.props);
  const YOU: Prop = { code: PLAYER, type: 'npc', name: 'you', icon: '🧍' };
  const groups = $derived.by(() => {
    const q = ED.filter.trim().toLowerCase();
    const hit = (p: Prop) => !q || p.code.includes(q) || p.name.toLowerCase().includes(q);
    const out: [string, Prop[]][] = [
      ['Nodes', all.filter((p) => p.type === 'node')],
      ['Things', all.filter((p) => p.type === 'look' || p.type === 'rest' || p.type === 'secret')],
      ['People & exits', all.filter((p) => p.type === 'npc' || p.type === 'exit')],
    ];
    if (ED.mode === 'tune') {
      out[2][1] = [YOU, ...out[2][1].filter((p) => p.type === 'npc')];
      out.push(['Enemies', all.filter((p) => p.type === 'enemy')]);
    }
    return out.map(([n, l]): [string, Prop[]] => [n, l.filter(hit)]).filter(([, l]) => l.length);
  });

  const same = (a: Brush, b: Brush) => JSON.stringify(a) === JSON.stringify(b);
  function choose(p: Prop) {
    if (ED.mode === 'paint') return void (ED.brush = { kind: 'prop', code: p.code });
    // Tune: show it where it already stands, else on the hex in use, else where you are
    const at = grid(content, pid, G.s.day).cells.find((x) => x.p === p.code)?.key;
    tuneSelect(p.code, at ?? ED.tune.key ?? G.s.pos);
  }
  const selected = (p: Prop) => (ED.mode === 'paint' ? same(ED.brush, { kind: 'prop', code: p.code }) : ED.tune.code === p.code);
  const thumb = (p: Prop) => {
    const id = p.code === PLAYER ? content.player.figure?.stand : p.type === 'npc' && p.npc ? content.npcs[p.npc]?.figure?.stand : p.sprite;
    return id ? sprites[id] : undefined;
  };

  // ---------- Tune ----------
  const code = $derived(ED.tune.code);
  const sid = $derived(tuneSprite(code, ED.tune.spent));
  const fig = $derived(isFigure(code));
  const pr = $derived(code && code !== PLAYER ? content.props[code] : undefined);
  const cur = $derived.by(() => {
    void ED.v;
    const sp = sid ? sprites[sid] : undefined;
    if (!sp) return null;
    const d = code === PLAYER ? PLAYER_SHADOW : SHADOW;
    return {
      bx: fig ? (sp.fx ?? sp.bx) : sp.bx,
      by: sp.by,
      sx: sp.sx ?? 0,
      sy: sp.sy ?? 0,
      sw: sp.sw ?? d.sw,
      sh: sp.sh ?? d.sh,
      so: sp.so ?? d.so,
      size: pr?.size ?? 0.8,
      dx: pr?.dx ?? 0,
      dy: pr?.dy ?? 0,
      flat: !!pr?.flat,
    };
  });
  const setS = (k: keyof Tune) => (v: number) => sid && tuneSpriteSet(sid, { [k]: v });
  const setP = (k: keyof PropFields) => (v: number) => code && tunePropSet(code, { [k]: v });
  const resetFoot = () => sid && tuneSpriteSet(sid, { bx: undefined, by: undefined });
  const resetShadow = () => sid && tuneSpriteSet(sid, { sx: undefined, sy: undefined, sw: undefined, sh: undefined, so: undefined });

  // ---------- keys ----------
  const PROPS_CYCLE = ['shown', 'faint', 'hidden'] as const;
  function onkeydown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (e.metaKey || e.ctrlKey) {
      if (k === 'z' && e.shiftKey) redo();
      else if (k === 'z') undo();
      else if (k === 'y') redo();
      else if (k === 's') save(pid);
      else return;
      return void e.preventDefault();
    }
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return;
    if (k === 't') ED.mode = ED.mode === 'paint' ? 'tune' : 'paint';
    else if (k === 'p') ED.preview = !ED.preview;
    else if (ED.mode === 'paint' && ['1', '2', '3'].includes(k)) ED.size = Number(k) - 1;
    else if (ED.mode === 'paint' && k === 'f') ED.fill = !ED.fill;
    else if (ED.mode === 'paint' && k === 'v') ED.props = PROPS_CYCLE[(PROPS_CYCLE.indexOf(ED.props) + 1) % 3];
    else if (ED.mode === 'tune' && cur && k.startsWith('arrow')) nudge(k, e.shiftKey, e.altKey);
    else return;
    e.preventDefault();
  }
  /** Arrows nudge the sprite on its foot point; Shift: the whole prop on its hex; Alt: the shadow. */
  function nudge(k: string, shift: boolean, alt: boolean) {
    if (!cur) return;
    const [x, y] = k === 'arrowleft' ? [-1, 0] : k === 'arrowright' ? [1, 0] : k === 'arrowup' ? [0, -1] : [0, 1];
    if (alt) setS('sx')(cur.sx + x * 0.01), setS('sy')(cur.sy + y * 0.01);
    else if (shift && !fig) setP('dx')(cur.dx + x * 0.01), setP('dy')(cur.dy + y * 0.01);
    else setS('bx')(cur.bx - x * 0.005), setS('by')(cur.by - y * 0.005);
  }
</script>

<svelte:window {onkeydown} />

{#snippet slider(label: string, value: number, min: number, max: number, step: number, set: (v: number) => void)}
  <label class="sl">
    <span class="lbl">{label}</span>
    <input type="range" {min} {max} {step} {value} oninput={(e) => set(+e.currentTarget.value)} />
    <input type="number" class="num" {step} value={+value.toFixed(3)} onchange={(e) => set(+e.currentTarget.value)} />
  </label>
{/snippet}

{#snippet seg<T>(options: [T, string][], value: T, set: (v: T) => void, keyHint = '')}
  <div class="seg">
    {#each options as [v, name] (name)}
      <button class="px btn t-inset pick" class:on={value === v} onclick={() => set(v)} title={keyHint}><span class="lbl">{name}</span></button>
    {/each}
  </div>
{/snippet}

<div class="bar px bevel t-panel">
  <header>
    <span class="disp title">Map editor</span>
    <span class="lbl m dim">{P?.name}</span>
  </header>

  <div class="acts">
    <button class="px btn bevel t-accent" onclick={() => save(pid)} title="Save the point, tuning and props (⌘S)"><span class="lbl m">{dirty() ? 'Save •' : 'Save'}</span></button>
    <button class="px btn bevel t-inset" disabled={!ED.undos} onclick={undo} title="Undo (⌘Z)"><span class="lbl m">↶</span></button>
    <button class="px btn bevel t-inset" disabled={!ED.redos} onclick={redo} title="Redo (⇧⌘Z)"><span class="lbl m">↷</span></button>
    <button class="px btn bevel t-inset" onclick={toggleEditor} title="Leave the editor (E)"><span class="lbl m">Done</span></button>
  </div>
  {#if ED.note}<div class="lbl m note">{ED.note}</div>{/if}

  <div class="row2">
    {@render seg([['paint', 'Paint'], ['tune', 'Tune']] as ['paint' | 'tune', string][], ED.mode, (v) => (ED.mode = v), 'T switches')}
    <button class="px btn t-inset pick prev" class:on={ED.preview} onclick={() => (ED.preview = !ED.preview)} title="See the field as it plays (P)"><span class="lbl">Preview</span></button>
  </div>

  <div class="scroll">
    {#if ED.mode === 'paint'}
      <div class="lbl eyebrow">Brush</div>
      <div class="row2">
        {@render seg([[0, '1'], [1, '7'], [2, '19']] as [number, string][], ED.size, (v) => (ED.size = v), 'Brush size: 1, 2, 3')}
        <button class="px btn t-inset pick" class:on={ED.fill} onclick={() => (ED.fill = !ED.fill)} title="Fill the joined hexes of the same ground (F)"><span class="lbl">Fill</span></button>
      </div>
      <div class="row2">
        <span class="lbl dim">Props</span>
        {@render seg(PROPS_CYCLE.map((v) => [v, v]) as [typeof ED.props, string][], ED.props, (v) => (ED.props = v), 'V cycles')}
      </div>

      <div class="lbl eyebrow">Tools</div>
      <div class="grid">
        <button class="px btn t-inset tile" class:on={same(ED.brush, { kind: 'clear' })} onclick={() => (ED.brush = { kind: 'clear' })} title="Take the prop off a hex">
          <span class="ico">⌫</span><span class="lbl">Clear</span>
        </button>
        <button class="px btn t-inset tile" class:on={same(ED.brush, { kind: 'remove' })} onclick={() => (ED.brush = { kind: 'remove' })} title="No hex here">
          <span class="ico">✕</span><span class="lbl">Remove</span>
        </button>
        <button class="px btn t-inset tile" class:on={same(ED.brush, { kind: 'prop', code: '*' })} onclick={() => (ED.brush = { kind: 'prop', code: '*' })} title="A slot that rolls from the point's table each day">
          <span class="ico">?</span><span class="lbl">Random</span>
        </button>
      </div>

      <div class="lbl eyebrow">Ground</div>
      <div class="grid">
        {#each terrains as [id, t] (id)}
          <button class="px btn t-inset tile" class:on={same(ED.brush, { kind: 'terrain', t: id })} onclick={() => (ED.brush = { kind: 'terrain', t: id })} title="{t.name} ({id})">
            <span class="sw" style:background={t.colour}></span><span class="lbl">{t.name}</span>
          </button>
        {/each}
      </div>
    {:else}
      {#if !code || !cur}
        <p class="lbl hint">Click a prop on the field, or pick one below. Click an empty hex to show it there.</p>
      {:else}
        <div class="target">
          {#if thumb(pr ?? YOU)}<img src={asset(sprites[sid!].file)} alt="" />{/if}
          <div>
            <div class="lbl m">{(pr ?? YOU).name}</div>
            <div class="lbl dim">{sid}</div>
          </div>
        </div>
        {#if pr?.spent}
          {@render seg([[false, 'Standing'], [true, 'Used up']] as [boolean, string][], ED.tune.spent, (v) => (ED.tune.spent = v))}
        {/if}

        {#if !fig && !ED.tune.spent}
          <div class="lbl eyebrow">On the hex · every {pr?.name}</div>
          {@render slider('Size', cur.size, 0.2, 2, 0.01, setP('size'))}
          {@render slider('Move x', cur.dx, -0.6, 0.6, 0.005, setP('dx'))}
          {@render slider('Move y', cur.dy, -0.6, 0.6, 0.005, setP('dy'))}
          <label class="sl"><span class="lbl">Flat</span><input type="checkbox" checked={cur.flat} onchange={(e) => code && tunePropSet(code, { flat: e.currentTarget.checked })} /><span class="lbl dim">lies on the ground, no shadow</span></label>
        {/if}

        <div class="lbl eyebrow">Foot point · this image <button class="px btn t-inset mini" onclick={resetFoot}><span class="lbl">Reset</span></button></div>
        {@render slider('Foot x', cur.bx, 0, 1, 0.005, setS('bx'))}
        {@render slider('Foot y', cur.by, 0.5, 1.15, 0.005, setS('by'))}

        {#if !cur.flat || fig}
          <div class="lbl eyebrow">Shadow · this image <button class="px btn t-inset mini" onclick={resetShadow}><span class="lbl">Reset</span></button></div>
          {@render slider('Move x', cur.sx, -0.6, 0.6, 0.005, setS('sx'))}
          {@render slider('Move y', cur.sy, -0.4, 0.4, 0.005, setS('sy'))}
          {@render slider('Width', cur.sw, 0, 1.2, 0.005, setS('sw'))}
          {@render slider('Height', cur.sh, 0, 0.6, 0.005, setS('sh'))}
          {@render slider('Dark', cur.so, 0, 0.8, 0.01, setS('so'))}
        {/if}
      {/if}
    {/if}

    <input class="filter" type="search" placeholder="Find a prop…" bind:value={ED.filter} />
    {#each groups as [name, list] (name)}
      <div class="lbl eyebrow">{name}</div>
      <div class="grid">
        {#each list as p (p.code)}
          {@const sp = thumb(p)}
          <button class="px btn t-inset tile" class:on={selected(p)} onclick={() => choose(p)} title="{p.name} ({p.code})">
            {#if sp}<img src={asset(sp.file)} alt="" />{:else}<span class="ico">{p.icon}</span>{/if}
            <span class="lbl">{p.code === PLAYER ? 'you' : p.code}</span>
          </button>
        {/each}
      </div>
    {/each}

    {#if ED.mode === 'paint' && P}
      <div class="lbl eyebrow">This point</div>
      <div class="row2">
        <span class="lbl dim">Padding</span>
        {@render seg([[0, '0'], [1, '1'], [2, '2'], [3, '3']] as [number, string][], P.pad ?? 2, (v) => setPoint(pid, 'pad' as PointSetting, v), 'Rings of drawn-only ground around the field (see it with Preview)')}
      </div>
      <div class="row2">
        <span class="lbl dim">Fog</span>
        {@render seg([[true, 'On'], [false, 'Off']] as [boolean, string][], !!P.fog, (v) => setPoint(pid, 'fog', v))}
      </div>
      <div class="row2">
        <span class="lbl dim">Backdrop</span>
        {@render seg([['sea', 'Sea'], ['sky', 'Sky']] as [string, string][], P.backdrop ?? 'sky', (v) => setPoint(pid, 'backdrop', v))}
      </div>
    {/if}

    <div class="keys lbl dim">
      {#if ED.mode === 'paint'}
        Drag: paint · Alt-click: pick prop · Alt+Shift-click: pick ground · 1 2 3: brush size · F: fill · V: props
      {:else}
        Drag box: foot point · Shift-drag: move on hex · drag shadow, or its handles · Arrows nudge (Shift: on hex, Alt: shadow)
      {/if}
      · Wheel: zoom · Right-drag or Space-drag: pan · T: paint/tune · P: preview · ⌘Z / ⇧⌘Z · ⌘S
    </div>
  </div>
</div>

<style>
  .bar {
    position: absolute;
    left: 14px;
    top: 112px;
    bottom: 14px;
    width: 268px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 10px 12px;
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .title {
    font-size: 22px;
  }
  .dim {
    opacity: 0.7;
  }
  .acts {
    display: flex;
    gap: 6px;
  }
  .acts .btn {
    height: 32px;
    padding: 0 10px 3px;
  }
  .acts .btn:first-child,
  .acts .btn:last-child {
    flex: 1;
  }
  .note {
    opacity: 0.8;
  }
  .row2 {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .row2 > .lbl {
    width: 58px;
    flex: none;
  }
  .seg {
    display: flex;
    gap: 4px;
    flex: 1;
  }
  .pick {
    flex: 1;
    height: 28px;
    padding: 0 6px 3px;
    text-transform: capitalize;
  }
  .prev {
    flex: none;
  }
  .scroll {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-right: 4px;
  }
  .eyebrow {
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 54px;
    padding: 3px 2px 6px;
    overflow: hidden;
  }
  .tile .lbl {
    font-size: 9px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile img {
    height: 30px;
    width: 40px;
    object-fit: contain;
  }
  .ico {
    font-size: 18px;
    line-height: 30px;
  }
  .sw {
    width: 28px;
    height: 22px;
    border: 2px solid rgb(0 0 0 / 0.35);
  }
  .filter {
    margin-top: 8px;
    font: 500 12px var(--font-body);
    padding: 6px 8px;
    border: 2px solid rgb(0 0 0 / 0.3);
    background: rgb(255 255 255 / 0.85);
    color: #1a1a1a;
  }
  .hint {
    line-height: 1.4;
    opacity: 0.8;
  }
  .target {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .target img {
    width: 44px;
    height: 44px;
    object-fit: contain;
  }
  .sl {
    display: grid;
    grid-template-columns: 52px 1fr 54px;
    align-items: center;
    gap: 6px;
  }
  .sl input[type='range'] {
    width: 100%;
    accent-color: #ffd65c;
  }
  .sl input[type='checkbox'] {
    justify-self: start;
  }
  .num {
    width: 100%;
    font: 500 11px var(--font-label);
    padding: 2px 4px;
    border: 1px solid rgb(0 0 0 / 0.3);
    background: rgb(255 255 255 / 0.85);
    color: #1a1a1a;
  }
  .mini {
    height: 20px;
    padding: 0 6px 2px;
  }
  .keys {
    margin-top: 10px;
    line-height: 1.5;
    font-size: 10px;
  }
</style>
