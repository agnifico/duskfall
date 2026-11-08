<script lang="ts">
  // The frame every full-page screen shares: a way back to the field, the title, a key hint, then the page.
  import type { Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import { closeScreen } from '../commands';

  let { title, hint, children }: { title: string; hint: string; children: Snippet } = $props();
</script>

<main class="screen-page t-panel" aria-label={title} in:fade={{ duration: 120 }}>
  <header>
    <button class="px btn bevel t-inset back" onclick={closeScreen} title="Back to the field (Esc)"><span class="lbl m">‹ Field</span></button>
    <h2 class="disp">{title}</h2>
    <span class="lbl dim hint">{hint}</span>
  </header>
  {@render children()}
</main>

<style>
  .screen-page {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    padding: 14px max(20px, calc((100vw - 1320px) / 2)) 16px;
    background: var(--face);
    color: var(--fg);
  }
  header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 10px;
  }
  h2 {
    margin: 0;
    font-size: 40px;
    color: var(--hl);
  }
  .hint {
    flex: 1;
    color: var(--dim);
  }
  .back {
    height: 32px;
    padding: 0 12px 3px;
  }
  @media (max-width: 900px) {
    .screen-page {
      overflow-y: auto;
      padding-inline: 12px;
    }
  }
</style>
