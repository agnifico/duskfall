<script lang="ts">
  // Bottom-left: show or hide the whole UI (H), so the field can be seen on its own. On mobile it will
  // become the central button the others expand from.
  import { UI } from '../../lib/ui.svelte';
  import { toggleUi } from '../commands';
</script>

<button class="tog px btn bevel t-accent" class:on={UI.hidden} onclick={toggleUi} title="{UI.hidden ? 'Show' : 'Hide'} the UI (H)" aria-pressed={UI.hidden}>
  <span class="face">
    <span class="disp k">{UI.hidden ? '◉' : '◎'}</span>
    <span class="lbl">{UI.hidden ? 'Show' : 'Hide'}</span>
  </span>
</button>

<style>
  .tog {
    width: 62px;
    height: 62px;
    display: grid;
    place-items: center;
  }
  .face {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin-top: -4px;
  }
  .k {
    font-size: 28px;
    line-height: 1;
  }
</style>
