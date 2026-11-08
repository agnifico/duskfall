<script lang="ts">
  // The bag, sliding in on the right side of the screen, over whatever is there. Its grid scrolls inside a
  // fixed height, so the details (and Wear) stay on screen however full it gets.
  import { fly } from 'svelte/transition';
  import { G } from '../../lib/game.svelte';
  import { UI } from '../../lib/ui.svelte';
  import { content } from '../../content';
  import ItemIcon from '../ItemIcon.svelte';
  import { act } from '../../lib/game.svelte';
  import { SLOT_NAME, cantWear, wear } from '../../engine/gear';
  import { statRows, useLines, useVerb } from '../statText';
  import * as E from '../../engine/actions';
  import { openScreen } from '../commands';

  const COLS = 5;
  const MIN_ROWS = 3;

  type Filter = 'all' | 'materials' | 'gear';
  let filter = $state<Filter>('all');
  const all = $derived(Object.entries(G.s.bag).filter(([id, n]) => n > 0 && !content.items[id]?.currency));
  const items = $derived(all.filter(([id]) => filter === 'all' || (filter === 'gear') === !!content.items[id]?.slot));
  const empty = $derived(Math.max(0, Math.max(MIN_ROWS * COLS, Math.ceil(items.length / COLS) * COLS) - items.length));
  let picked = $state<string | null>(null);
  const detail = $derived(picked && G.s.bag[picked] ? content.items[picked] : undefined);
</script>

<section class="bag px bevel t-panel" transition:fly={{ x: 48, duration: 180 }} aria-label="Bag">
  <header>
    <h2 class="disp">Bag</h2>
    <span class="lbl m count">{all.length} kinds</span>
    <button class="px btn t-inset full" onclick={() => openScreen('inventory')} title="The full inventory page, with gear comparison (I)"><span class="lbl">Full page · I</span></button>
    <button class="px btn t-inset x" onclick={() => (UI.panel = null)} title="Close (B or Esc)" aria-label="Close"><span class="lbl l">×</span></button>
  </header>

  <div class="tabs">
    {#each [['all', 'All'], ['materials', 'Materials'], ['gear', 'Gear']] as [id, name] (id)}
      <button class="px btn t-inset tab" class:on={filter === id} onclick={() => (filter = id as Filter)}><span class="lbl">{name}</span></button>
    {/each}
  </div>

  <div class="grid" style:grid-template-columns="repeat({COLS}, 1fr)">
    {#each items as [id, n] (id)}
      <button class="slot" class:sel={picked === id} onclick={() => (picked = picked === id ? null : id)} title={content.items[id]?.name ?? id}>
        <ItemIcon {id} size={40} />
        <span class="lbl n">{n}</span>
      </button>
    {/each}
    {#each { length: empty } as _, i (i)}<div class="slot blank"></div>{/each}
  </div>

  <div class="detail">
    {#if detail && picked}
      <div class="name"><span class="disp">{detail.name}</span><span class="lbl m have">×{G.s.bag[picked]}</span></div>
      {#if detail.slot}
        {@const why = cantWear(G.s, content, picked)}
        <div class="lbl m gearline">{SLOT_NAME[detail.slot]}{detail.twoHanded ? ' · two hands' : ''} · level {detail.level ?? 1}{detail.set ? ` · ${content.sets[detail.set]?.name ?? detail.set}` : ''}</div>
        {#if detail.stats && Object.keys(detail.stats).length}
          <div class="stats">
            {#each statRows(detail.stats) as r (r.key)}
              <div class="srow"><img src={r.icon} alt="" /><span class="body sname">{r.name}</span><span class="body sval" class:bad={r.bad}>{r.value}</span></div>
            {/each}
          </div>
        {/if}
        {#if detail.placeholder}<div class="body placeholder">Numbers to come.</div>{/if}
        <button class="px btn bevel t-accent wear" disabled={!!why} title={why ?? 'Wear it'} onclick={() => picked && act((s) => wear(s, content, picked!))}>
          <span class="lbl m">{why ?? 'Wear'}</span>
        </button>
      {/if}
      {#if detail.use}
        {@const why = E.cantUse(G.s, content, picked)}
        {#each useLines(detail.use) as l, i (i)}<div class="body" class:hint={i === useLines(detail.use).length - 1}>{l}</div>{/each}
        <button class="px btn bevel t-accent wear" disabled={!!why} title={why ?? useVerb(detail.use)} onclick={() => picked && act((s) => E.useItem(s, content, picked!, Date.now()))}>
          <span class="lbl m">{why ?? useVerb(detail.use)}</span>
        </button>
      {/if}
      {#if detail.text}<p class="body">{detail.text}</p>{/if}
    {:else}
      <p class="body hint">{items.length ? 'Pick something to look at it.' : 'Empty. Gather something.'}</p>
    {/if}
  </div>
</section>

<style>
  .bag {
    position: absolute;
    right: 14px;
    top: 50%;
    translate: 0 -50%;
    width: 384px;
    max-height: calc(100vh - 150px);
    display: flex;
    flex-direction: column;
    padding: 12px 14px 18px;
  }
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }
  .tab {
    flex: 1;
    height: 26px;
    padding-bottom: 3px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  h2 {
    margin: 0;
    font-size: 32px;
    color: var(--hl);
  }
  .count {
    flex: 1;
    color: var(--dim);
  }
  .full {
    height: 28px;
    padding: 0 8px 3px;
  }
  .x {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding-bottom: 4px;
  }
  .grid {
    display: grid;
    gap: 6px;
    overflow-y: auto;
    min-height: 0;
    flex: 1 1 auto;
    align-content: start;
    padding-right: 2px;
  }
  .slot {
    position: relative;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border: 0;
    padding: 0;
    cursor: pointer;
    background: var(--well);
    box-shadow:
      inset 0 2px 0 color-mix(in srgb, var(--ink) 45%, transparent),
      inset 0 -2px 0 rgb(255 255 255 / 0.12);
  }
  .slot:hover {
    background: color-mix(in srgb, var(--well) 85%, #fff);
  }
  .slot.sel {
    box-shadow: inset 0 0 0 2px var(--hl);
  }
  .slot.blank {
    cursor: default;
    opacity: 0.55;
  }
  .n {
    position: absolute;
    right: 4px;
    bottom: 3px;
    color: #fff;
    text-shadow: 0 1px 0 var(--ink), 1px 0 0 var(--ink), -1px 0 0 var(--ink), 0 -1px 0 var(--ink);
  }
  .detail {
    flex: none;
    min-height: 64px;
    max-height: 50%;
    overflow-y: auto;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 2px solid color-mix(in srgb, var(--ink) 18%, transparent);
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--fg);
  }
  .name {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .name .disp {
    font-size: 26px;
  }
  .have {
    color: var(--dim);
  }
  p {
    margin: 0;
    line-height: 1.45;
  }
  .hint {
    color: var(--dim);
  }
  .gearline {
    color: var(--fg);
    opacity: 0.85;
  }
  /* stats: icon, name, value, on a slightly darker well so they read on any theme */
  .stats {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 8px;
    background: color-mix(in srgb, var(--ink) 9%, transparent);
  }
  .srow {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    align-items: center;
    gap: 8px;
    min-height: 26px;
  }
  .srow img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }
  .sname {
    font-weight: 600;
  }
  /* mixed with the text colour, so it stays readable on light and dark themes */
  .sval {
    font-weight: 700;
    color: color-mix(in oklab, #2f9e44 65%, var(--fg));
  }
  .sval.bad {
    color: color-mix(in oklab, #d64545 70%, var(--fg));
  }
  .placeholder {
    font-style: italic;
    opacity: 0.8;
  }
  .wear {
    align-self: flex-start;
    height: 32px;
    padding: 0 16px 3px;
  }
</style>
