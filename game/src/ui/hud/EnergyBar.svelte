<script lang="ts">
  // The energy strip and its timer. The next segment fills as the next point of energy comes in.
  import { DEV, G } from '../../lib/game.svelte';
  import * as E from '../../engine/actions';
  import { MAX_ENERGY, REGEN_MS } from '../../engine/rules';

  const free = $derived(DEV.on && DEV.freeEnergy); // dev mode: unlimited
  const full = $derived(G.s.energy >= MAX_ENERGY);
  const next = $derived(E.msToNextEnergy(G.s, G.now));
  const toFull = $derived(E.msToFullEnergy(G.s, G.now));
  const part = $derived(full ? 0 : 1 - next / REGEN_MS);

  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
</script>

<div class="energy px flat round t-inset">
  <span class="lbl name">Energy</span>
  <div class="segs">
    {#each { length: MAX_ENERGY } as _, i (i)}
      <i class="well" class:on={i < G.s.energy}>
        {#if i === G.s.energy && part > 0}<b style:width="{part * 100}%"></b>{/if}
      </i>
    {/each}
  </div>
  <span class="lbl m count">{free ? '∞' : `${G.s.energy}/${MAX_ENERGY}`}</span>
</div>

<div class="timer px flat round t-inset">
  <i class="clock" aria-hidden="true"></i>
  {#if free}
    <span class="lbl m ready">Dev · unlimited</span>
  {:else if full}
    <span class="lbl m ready">Full</span>
  {:else}
    <span class="lbl m">+1 in {mmss(next)}</span>
    <span class="rule" aria-hidden="true"></span>
    <span class="lbl m sub">Full in {mmss(toFull)}</span>
  {/if}
</div>

<style>
  .energy {
    flex: 1;
    min-width: 220px;
    display: flex;
    align-items: center;
    gap: 14px;
    height: 36px;
    padding: 0 16px;
  }
  .name {
    color: var(--hl);
  }
  .segs {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
    height: 14px;
  }
  .segs i {
    position: relative;
    overflow: hidden;
    border-radius: 3px;
  }
  .segs i.on {
    background: var(--energy);
    box-shadow: inset 0 2px 0 var(--energy-hi), inset 0 -2px 0 var(--energy-lo);
  }
  .segs b {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: var(--energy);
    opacity: 0.5;
  }
  .count {
    min-width: 44px;
    text-align: right;
  }
  .timer {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 36px;
    padding: 0 18px 0 14px;
    white-space: nowrap;
  }
  /* a small clock face */
  .clock {
    position: relative;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px var(--fg);
  }
  .clock::before,
  .clock::after {
    content: '';
    position: absolute;
    left: 6px;
    background: var(--fg);
  }
  .clock::before {
    top: 3px;
    width: 2px;
    height: 5px;
  }
  .clock::after {
    top: 6px;
    width: 4px;
    height: 2px;
  }
  .rule {
    width: 2px;
    height: 16px;
    background: color-mix(in srgb, var(--fg) 25%, transparent);
  }
  .sub {
    color: var(--dim);
  }
  .ready {
    color: var(--hl);
  }
</style>
