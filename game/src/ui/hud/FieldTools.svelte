<script lang="ts">
  // Bottom right, above the menu: tools for the field you're on.
  //   Reroll (R): roll this point's enemies again, 1 free per 15-minute cycle; then it shows the time to the
  //   next cycle, when they roll fresh anyway.
  //   Turn ([ and ]): turn the hex field; remembered.
  //   Dev mode only: the test bench and back (`).
  import { DEV, G } from '../../lib/game.svelte';
  import { UI } from '../../lib/ui.svelte';
  import { content } from '../../content';
  import * as K from '../../engine/combat';
  import { FREE_REROLLS } from '../../engine/rules';
  import { rerollEnemies, toggleDevField, turnField } from '../commands';

  const pid = $derived(G.s.point);
  const hasEnemies = $derived(!!pid && !!content.points[pid]?.enemies);
  const left = $derived(pid ? K.rerollsLeft(G.s, pid, G.now) : 0);
  const why = $derived(pid ? K.rerollBlocked(G.s, content, pid, G.now) : 'No point');
  const next = $derived(K.msToNextCycle(G.now));

  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
</script>

<div class="tools">
  {#if DEV.on || UI.bench}
    <button class="px btn bevel t-panel reroll" onclick={toggleDevField} title="Dev mode: the test bench, its own player in the dev field; again to go back to your game (`)">
      <span class="ico">🧪</span><span class="lbl m">{UI.bench ? 'Leave bench' : 'Test bench'}</span>
    </button>
  {/if}
  {#if hasEnemies}
    <button
      class="px btn bevel t-panel reroll"
      disabled={!!why}
      onclick={rerollEnemies}
      title="Roll new enemies here (R). {FREE_REROLLS} free every 15 minutes.{why ? ` ${why}.` : ''}"
    >
      <span class="ico">🎲</span>
      {#if left > 0}
        <span class="lbl m">Reroll · {left}</span>
      {:else}
        <span class="lbl m">New in {mmss(next)}</span>
      {/if}
    </button>
  {/if}
  <button class="px btn bevel t-panel b" onclick={() => turnField(-15)} title="Turn the field left ([)" aria-label="Turn the field left">⟲</button>
  <button class="px btn bevel t-panel b" onclick={() => turnField(15)} title="Turn the field right (])" aria-label="Turn the field right">⟳</button>
</div>

<style>
  .tools {
    position: absolute;
    right: 14px;
    bottom: 92px;
    display: flex;
    gap: 6px;
  }
  .b,
  .reroll {
    height: 36px;
    display: grid;
    place-items: center;
    padding-bottom: 4px;
  }
  .b {
    width: 40px;
    font-size: 20px;
    line-height: 1;
  }
  .reroll {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px 4px;
  }
  .reroll:disabled {
    opacity: 0.6;
  }
  .ico {
    font-size: 15px;
  }
</style>
