<script lang="ts">
  // The world map: every nation, as a shield. Picking one shows its title screen. (In code a nation is a "land".)
  // The painting sits against the right edge and fades into its sea colour, so it has no hard border.
  import { asset, content } from '../content';
  import { G } from '../lib/game.svelte';
  import * as E from '../engine/actions';
  import { pickLand } from './commands';

  const map = content.world.map;
  let vw = $state(0);
  let vh = $state(0);
  const INSET = 10; // px between the painting and the screen's top and bottom
  const k = $derived(vw && vh ? Math.min(vw / map.width, (vh - 2 * INSET) / map.height) : 0);
  const left = $derived(vw - map.width * k);
  const top = $derived((vh - map.height * k) / 2);
  const homeLand = $derived(G.s.point ? E.landOf(content, G.s.point) : undefined);
</script>

<div class="world" style:--sea={map.sea ?? '#0f2236'} bind:clientWidth={vw} bind:clientHeight={vh}>
  {#if k}
    <div class="frame" style:left="{left}px" style:top="{top}px" style:width="{map.width * k}px" style:height="{map.height * k}px">
      <img class="edge-fade" src={asset(map.image)} alt="World map" draggable="false" />
    </div>
    <div class="shade"></div>
    <div class="band top"></div>
    <div class="band bottom"></div>
    {#each content.world.lands as l (l.id)}
      {@const open = !l.locked && !!content.lands[l.id]}
      <button
        class="map-pin"
        class:current={l.id === homeLand}
        style:left="{left + l.pin[0] * k}px"
        style:top="{top + l.pin[1] * k}px"
        disabled={!open}
        onclick={() => pickLand(l.id)}
      >
        <span class="px shield {open ? 't-warm' : 't-off'}"><i></i></span>
        <span class="pin-name">{l.name}</span>
      </button>
      {#if l.id === homeLand}
        <div class="you-are-here" style:left="{left + l.pin[0] * k}px" style:top="{top + l.pin[1] * k + 34}px">
          <i></i><span class="lbl">You are here</span>
        </div>
      {/if}
    {/each}
    <div class="title">
      <h1 class="disp">The World</h1>
      <div class="disp sub">Pick a nation</div>
    </div>
  {/if}
</div>

<style>
  .world {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--sea);
  }
  .frame {
    position: absolute;
  }
  img {
    width: 100%;
    height: 100%;
    display: block;
    user-select: none;
  }
  .shade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(to right, color-mix(in srgb, var(--sea) 80%, transparent), transparent 35%);
  }
  .band {
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
    backdrop-filter: blur(6px);
  }
  .band.top {
    top: 0;
    height: 150px;
    background: linear-gradient(to bottom, color-mix(in srgb, var(--sea) 75%, transparent), transparent);
    mask-image: linear-gradient(to bottom, #000 25%, transparent);
  }
  .band.bottom {
    bottom: 0;
    height: 130px;
    background: linear-gradient(to top, color-mix(in srgb, var(--sea) 75%, transparent), transparent);
    mask-image: linear-gradient(to top, #000 25%, transparent);
  }
  .title {
    position: absolute;
    left: 28px;
    top: 182px; /* below the portrait and the People button */
    pointer-events: none;
    text-shadow: 0 3px 0 var(--map-ink), 0 0 18px rgb(0 0 0 / 0.6);
  }
  h1 {
    margin: 0;
    font-size: 64px;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: #fff4dc;
  }
  .sub {
    font-size: 26px;
    color: #f2c766;
    letter-spacing: 2px;
  }
</style>
