<script lang="ts">
  // "+6 Wood" appears at the left of the screen, holds, then drops toward the bag in the bottom-left.
  // Timing must match GAIN_MS in lib/ui.svelte.ts: 180 ms in, hold, a 520 ms drop starting at 1080 ms.
  import { content } from '../../content';
  import { UI } from '../../lib/ui.svelte';
  import ItemIcon from '../ItemIcon.svelte';
</script>

<div class="gains" aria-live="polite">
  {#each UI.gains as g (g.id)}
    <div class="gain px flat t-panel" style:animation-delay="{g.delay}ms, {1080 + g.delay}ms">
      <ItemIcon id={g.item} size={30} />
      <span class="lbl l">+{g.n} {content.items[g.item]?.name ?? g.item}</span>
    </div>
  {/each}
</div>

<style>
  .gains {
    position: absolute;
    left: 24px;
    top: 42%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .gain {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 4px 14px 6px 6px;
    animation:
      gain-in 180ms ease-out both,
      gain-drop 520ms cubic-bezier(0.55, 0, 0.9, 0.45) both;
  }
  .gain span {
    color: var(--fg);
  }
  @keyframes gain-in {
    from {
      opacity: 0;
      transform: translateX(-18px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes gain-drop {
    from {
      opacity: 1;
      transform: none;
    }
    to {
      opacity: 0;
      transform: translate(8px, 38vh) scale(0.35);
    }
  }
</style>
