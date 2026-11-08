<script lang="ts">
  // Bottom centre, kept narrow: HP and Spirit, the things a fight changes. Energy is in the top bar
  // (EnergyStrip), always shown.
  import { G } from '../../lib/game.svelte';
  import { content } from '../../content';
  import { MAX_SPIRIT } from '../../engine/rules';
  import { maxHp } from '../../engine/progress';

  const max = $derived(maxHp(G.s, content));
  const hp = $derived(G.s.hp / max);
</script>

<div class="vitals px flat t-panel">
  <div class="row" class:low={hp < 0.3} title="Health: comes back 1 every 9 s outside a fight, or all at once with a rest">
    <span class="lbl name hp">HP</span>
    <span class="track"><b class="fill hp" style:width="{hp * 100}%"></b></span>
    <span class="lbl m val">{Math.ceil(G.s.hp)}/{max}</span>
  </div>
  <div class="row" title="Spirit: basic attacks build it, skills spend it">
    <span class="lbl name sp">Spirit</span>
    <span class="track"><b class="fill sp" style:width="{(G.s.spirit / MAX_SPIRIT) * 100}%"></b></span>
    <span class="lbl m val">{G.s.spirit}/{MAX_SPIRIT}</span>
  </div>
</div>

<style>
  .vitals {
    position: absolute;
    left: 50%;
    bottom: 14px;
    translate: -50% 0;
    width: min(300px, 34vw);
    padding: 9px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: grid;
    grid-template-columns: 40px 1fr 50px;
    align-items: center;
    gap: 8px;
  }
  .name.hp {
    color: #ff8a8d;
  }
  .name.sp {
    color: #9fd8ff;
  }
  .val {
    text-align: right;
  }
  .low .val {
    color: var(--warn);
  }
  .track {
    position: relative;
    height: 10px;
    border-radius: 2px;
    overflow: hidden;
    background: color-mix(in oklab, var(--c-inset) 70%, #000);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    transition: width 0.25s;
  }
  .fill.hp {
    background: #e5484d;
  }
  .fill.sp {
    background: #6cc4ff;
  }
</style>
