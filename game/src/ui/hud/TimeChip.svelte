<script lang="ts">
  // Day and time of day.
  import { G } from '../../lib/game.svelte';
  import { TIME_OF_DAY } from '../placeholders';
</script>

<div class="chip px flat round t-inset">
  <i class="sun" aria-hidden="true"></i>
  <span class="lbl m">Day {G.s.day}</span>
  <span class="lbl m tod">{TIME_OF_DAY}</span>
</div>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 30px;
    padding: 0 16px 0 14px;
  }
  .sun {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: var(--energy);
    transform: rotate(45deg);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .tod {
    color: var(--hl);
  }
</style>
