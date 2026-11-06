<script lang="ts">
  // The bag, sliding in on the right side of the screen, over whatever is there.
  import { fly } from 'svelte/transition';
  import { G } from '../../lib/game.svelte';
  import { UI } from '../../lib/ui.svelte';
  import { content } from '../../content';
  import ItemIcon from '../ItemIcon.svelte';

  const COLS = 5;
  const MIN_ROWS = 3;

  const items = $derived(Object.entries(G.s.bag).filter(([id, n]) => n > 0 && !content.items[id]?.currency));
  const empty = $derived(Math.max(0, Math.max(MIN_ROWS * COLS, Math.ceil(items.length / COLS) * COLS) - items.length));
  let picked = $state<string | null>(null);
  const detail = $derived(picked && G.s.bag[picked] ? content.items[picked] : undefined);
</script>

<section class="bag px bevel t-panel" transition:fly={{ x: 48, duration: 180 }} aria-label="Bag">
  <header>
    <h2 class="disp">Bag</h2>
    <span class="lbl m count">{items.length} kinds</span>
    <button class="px btn t-inset x" onclick={() => (UI.panel = null)} title="Close (B or Esc)" aria-label="Close"><span class="lbl l">×</span></button>
  </header>

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
    width: 352px;
    padding: 12px 14px 18px;
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
    min-height: 64px;
    margin-top: 12px;
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
    margin: 4px 0 0;
  }
  .hint {
    color: var(--dim);
  }
</style>
