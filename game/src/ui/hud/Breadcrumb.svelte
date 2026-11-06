<script lang="ts">
  // Where you are: World › Nuvatra › North Shore › Arrival Beach.
  // The last step is in colour, every other step in the same grey; steps with onclick are clickable.
  // Unstyled container, so it can also sit in a quest card or a tooltip.
  import type { Crumb } from '../types';

  let { items, compact = false }: { items: Crumb[]; compact?: boolean } = $props();
</script>

<nav class="crumbs" class:compact aria-label="Where you are">
  {#each items as c, i (i)}
    {#if i > 0}<span class="sep" aria-hidden="true">›</span>{/if}
    {#if c.onclick}
      <button class="step lbl" class:m={!compact} class:last={i === items.length - 1} onclick={c.onclick}>{c.label}</button>
    {:else}
      <span class="step lbl" class:m={!compact} class:last={i === items.length - 1}>{c.label}</span>
    {/if}
  {/each}
</nav>

<style>
  .crumbs {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    white-space: nowrap;
    min-width: 0;
  }
  .sep,
  .step {
    color: var(--dim);
  }
  .sep {
    font: 600 13px/1 var(--font-label);
  }
  .compact .sep {
    font-size: 10px;
  }
  .step.last {
    color: var(--hl);
  }
  button.step {
    background: none;
    border: 0;
    padding: 2px 0;
    cursor: pointer;
    text-underline-offset: 3px;
  }
  button.step:hover {
    color: var(--fg);
    text-decoration: underline;
  }
  button.step.last:hover {
    color: var(--hl);
  }
</style>
