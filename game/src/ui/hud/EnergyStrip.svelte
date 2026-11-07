<script lang="ts">
  // Top of the screen, under the chips: Energy as one long strip from the portrait to the map, always shown.
  // Notched every ENERGY_NOTCH so it still reads in chunks; the faint part past the fill is the next point
  // coming in. The maxes can grow later (perks), so the notches are worked out from them.
  import { DEV, G } from '../../lib/game.svelte';
  import * as E from '../../engine/actions';
  import { ENERGY_NOTCH, MAX_ENERGY, REGEN_MS } from '../../engine/rules';

  const free = $derived(DEV.on && DEV.freeEnergy); // dev mode: unlimited
  const full = $derived(G.s.energy >= MAX_ENERGY);
  const next = $derived(E.msToNextEnergy(G.s, G.now));
  const toFull = $derived(E.msToFullEnergy(G.s, G.now));
  const part = $derived(full || free ? 0 : 1 - next / REGEN_MS);
  const energy = $derived(free ? 1 : G.s.energy / MAX_ENERGY);
  const notch = $derived(`${(ENERGY_NOTCH / MAX_ENERGY) * 100}%`);

  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
</script>

<div class="strip px flat round t-inset" title="Energy: walking, gathering and searching spend it">
  <span class="lbl name">⚡ Energy</span>
  <span class="track" style:--notch={notch}>
    <b class="fill" style:width="{energy * 100}%"></b>
    <b class="coming" style:left="{energy * 100}%" style:width="{(part / MAX_ENERGY) * 100}%"></b>
    <i class="notches" aria-hidden="true"></i>
  </span>
  <span class="lbl m val">{free ? '∞' : `${G.s.energy}/${MAX_ENERGY}`}</span>
  <span class="lbl timer">
    {#if free}Dev · unlimited{:else if full}Full{:else}+1 in {mmss(next)} · full in {mmss(toFull)}{/if}
  </span>
</div>

<style>
  .strip {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 30px;
    padding: 0 16px;
    min-width: 0;
  }
  .name {
    flex: none;
    color: var(--hl);
  }
  .val {
    flex: none;
    min-width: 44px;
    text-align: right;
  }
  .timer {
    flex: none;
    color: var(--dim);
    font-size: 10px;
    white-space: nowrap;
  }
  .track {
    flex: 1;
    position: relative;
    height: 12px;
    border-radius: 2px;
    overflow: hidden;
    background: color-mix(in oklab, var(--c-inset) 70%, #000);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .fill,
  .coming {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    transition: width 0.25s;
  }
  .fill {
    background: var(--energy);
    box-shadow: inset 0 2px 0 var(--energy-hi), inset 0 -2px 0 var(--energy-lo);
  }
  .coming {
    background: var(--energy);
    opacity: 0.4;
    transition: none;
  }
  /* a thin dark line every ENERGY_NOTCH energy */
  .notches {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(to right, transparent 0 calc(var(--notch) - 2px), rgb(0 0 0 / 0.35) calc(var(--notch) - 2px) var(--notch));
  }
  @media (max-width: 760px) {
    .timer {
      display: none;
    }
  }
</style>
