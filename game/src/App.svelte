<script lang="ts">
  // The whole screen: the hex field you're in, the map over it when it's open, the HUD on top.
  import { G } from './lib/game.svelte';
  import { UI, inIntro } from './lib/ui.svelte';
  import WorldView from './ui/WorldView.svelte';
  import LandView from './ui/LandView.svelte';
  import HexView from './ui/HexView.svelte';
  import Hud from './ui/hud/Hud.svelte';
  import { onKey } from './ui/commands';
</script>

<svelte:window onkeydown={onKey} />

<div class="screen">
  {#if G.s.point}
    {#key G.s.point}<HexView pointId={G.s.point} />{/key}
  {/if}

  {#if UI.map}
    <div class="map-layer">
      {#if UI.map.kind === 'world'}
        <WorldView />
      {:else}
        {#key UI.map.land}
          <LandView landId={UI.map.land} intro={UI.map.intro} animate={UI.map.animate} zone={UI.map.zone} focus={UI.map.focus} />
        {/key}
      {/if}
    </div>
  {/if}

  {#if !inIntro()}<Hud />{/if}
</div>

<style>
  .screen {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: linear-gradient(to bottom, var(--sky-1), var(--sky-2));
  }
  .map-layer {
    position: absolute;
    inset: 0;
  }
</style>
