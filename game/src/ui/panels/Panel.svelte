<script lang="ts">
  // A dialog in the middle of the screen. Esc, the × or a click outside closes it.
  import type { Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { UI } from '../../lib/ui.svelte';

  let { title, width = 'min(440px, 90vw)', children }: { title: string; width?: string; children: Snippet } = $props();
  const close = () => (UI.panel = null);
</script>

<button class="backdrop" onclick={close} aria-label="Close" tabindex="-1" transition:fade={{ duration: 120 }}></button>
<div class="panel px bevel t-panel" style:width role="dialog" aria-modal="true" aria-label={title} transition:fly={{ y: 12, duration: 160 }}>
  <header>
    <h2 class="disp">{title}</h2>
    <button class="px btn t-inset x" onclick={close} title="Close (Esc)" aria-label="Close"><span class="lbl l">×</span></button>
  </header>
  <div class="body-wrap">{@render children()}</div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: color-mix(in srgb, var(--ink) 40%, transparent);
    cursor: default;
  }
  .panel {
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    max-height: 84vh;
    display: flex;
    flex-direction: column;
    padding: 14px 18px 20px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  h2 {
    margin: 0;
    font-size: 36px;
    color: var(--hl);
  }
  .x {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding-bottom: 4px;
  }
  .body-wrap {
    overflow-y: auto;
    min-height: 0;
  }
</style>
