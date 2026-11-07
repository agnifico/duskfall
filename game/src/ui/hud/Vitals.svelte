<script lang="ts">
  // Bottom centre: the things that change every action or second. HP, Spirit and Energy, each one continuous
  // bar, plus Energy's refill timer. Energy is notched every ENERGY_NOTCH so it still reads in chunks; the
  // maxes can grow later (perks), so the notches are worked out from them.
  import { DEV, G } from '../../lib/game.svelte';
  import * as E from '../../engine/actions';
  import { ENERGY_NOTCH, MAX_ENERGY, MAX_SPIRIT, PLAYER_STATS, REGEN_MS } from '../../engine/rules';

  const free = $derived(DEV.on && DEV.freeEnergy); // dev mode: unlimited
  const full = $derived(G.s.energy >= MAX_ENERGY);
  const next = $derived(E.msToNextEnergy(G.s, G.now));
  const toFull = $derived(E.msToFullEnergy(G.s, G.now));
  const part = $derived(full || free ? 0 : 1 - next / REGEN_MS);
  const energy = $derived(free ? 1 : G.s.energy / MAX_ENERGY);
  const notch = $derived(`${(ENERGY_NOTCH / MAX_ENERGY) * 100}%`);
  const hp = $derived(G.s.hp / PLAYER_STATS.hp);

  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
</script>

<div class="vitals px flat t-panel">
  <div class="row" class:low={hp < 0.3} title="Health: comes back 1 every 9 s outside a fight, or all at once with a rest">
    <span class="lbl name hp">HP</span>
    <span class="track"><b class="fill hp" style:width="{hp * 100}%"></b></span>
    <span class="lbl m val">{Math.ceil(G.s.hp)}/{PLAYER_STATS.hp}</span>
  </div>
  <div class="row" title="Spirit: basic attacks build it, skills spend it">
    <span class="lbl name sp">Spirit</span>
    <span class="track"><b class="fill sp" style:width="{(G.s.spirit / MAX_SPIRIT) * 100}%"></b></span>
    <span class="lbl m val">{G.s.spirit}/{MAX_SPIRIT}</span>
  </div>
  <div class="row" title="Energy: walking, gathering and searching spend it">
    <span class="lbl name en">Energy</span>
    <span class="track" style:--notch={notch}>
      <b class="fill en" style:width="{energy * 100}%"></b>
      <b class="coming" style:left="{energy * 100}%" style:width="{(part / MAX_ENERGY) * 100}%"></b>
      <i class="notches" aria-hidden="true"></i>
    </span>
    <span class="lbl m val">{free ? '∞' : `${G.s.energy}/${MAX_ENERGY}`}</span>
  </div>
  <div class="timer lbl">
    {#if free}Dev · unlimited{:else if full}Energy full{:else}+1 in {mmss(next)} · full in {mmss(toFull)}{/if}
  </div>
</div>

<style>
  .vitals {
    position: absolute;
    left: 50%;
    bottom: 14px;
    translate: -50% 0;
    width: min(440px, 42vw);
    padding: 10px 14px 9px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: grid;
    grid-template-columns: 52px 1fr 54px;
    align-items: center;
    gap: 10px;
  }
  .name.hp {
    color: #ff8a8d;
  }
  .name.sp {
    color: #9fd8ff;
  }
  .name.en {
    color: var(--hl);
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
  .fill,
  .coming {
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
  .fill.en {
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
  .timer {
    text-align: right;
    color: var(--dim);
    font-size: 10px;
  }
</style>
