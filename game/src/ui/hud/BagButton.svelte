<script lang="ts">
  // Bottom-left: the bag. Bumps when something lands in it.
  import { UI } from '../../lib/ui.svelte';
  import { togglePanel } from '../commands';
</script>

<button class="bag px btn bevel t-accent" class:on={UI.panel === 'bag'} onclick={() => togglePanel('bag')} title="Bag (B)" aria-label="Bag">
  {#key UI.bagBump}
    <span class="face" class:bump={UI.bagBump > 0}>
      <span class="disp b">B</span>
      <span class="lbl">Bag</span>
    </span>
  {/key}
</button>

<style>
  .bag {
    width: 62px;
    height: 62px;
    display: grid;
    place-items: center;
  }
  .face {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    margin-top: -4px;
  }
  .b {
    font-size: 36px;
  }
  .bump {
    animation: bump 260ms steps(4);
  }
  @keyframes bump {
    40% {
      transform: translateY(-5px) scale(1.12);
    }
  }
</style>
