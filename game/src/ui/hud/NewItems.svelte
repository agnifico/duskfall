<script lang="ts">
  // The first time you get an item: a card at the left with its picture, name and what it's for, in place of
  // the "+n" line. It holds long enough to read (FIRST_MS in lib/ui.svelte.ts), then goes; a click closes it.
  // At most three show; more at once (dev's "give five of each") fold into one line.
  import { fly } from 'svelte/transition';
  import { content } from '../../content';
  import { UI } from '../../lib/ui.svelte';
  import ItemIcon from '../ItemIcon.svelte';

  const MAX = 3;
  const shown = $derived(UI.firsts.slice(0, MAX));
  const more = $derived(UI.firsts.length - shown.length);
  const close = (id: number) => (UI.firsts = UI.firsts.filter((f) => f.id !== id));
</script>

<div class="firsts" aria-live="polite">
  {#each shown as f (f.id)}
    {@const it = content.items[f.item]}
    <button class="first px bevel t-panel" onclick={() => close(f.id)} title="Close" in:fly={{ x: -30, duration: 220 }} out:fly={{ x: -30, duration: 200 }}>
      <ItemIcon id={f.item} size={40} />
      <span class="what">
        <span class="lbl kind">New item</span>
        <span class="lbl l name">{it?.name ?? f.item}</span>
        {#if it?.text}<span class="body text">{it.text}</span>{/if}
      </span>
    </button>
  {/each}
  {#if more > 0}
    <button class="first more px flat t-panel" onclick={() => (UI.firsts = [])}>
      <span class="body">+{more} more new item{more === 1 ? '' : 's'} · see your bag (B)</span>
    </button>
  {/if}
</div>

<style>
  .firsts {
    position: absolute;
    left: 24px;
    bottom: 60%;
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-start;
    gap: 8px;
    max-width: min(320px, calc(100vw - 48px));
  }
  .first {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 6px 14px 8px 8px;
    border: 0;
    text-align: left;
    cursor: pointer;
    color: var(--fg);
  }
  .what {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .kind {
    color: var(--dim);
    font-size: 11px;
  }
  .name {
    color: var(--hl);
  }
  .text {
    font-size: 13px;
    line-height: 1.3;
  }
  .more {
    padding: 6px 12px;
  }
</style>
