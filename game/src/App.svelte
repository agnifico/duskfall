<script lang="ts">
  // The whole screen: the hex field you're in, the map over it when it's open, the HUD on top.
  import { G } from './lib/game.svelte';
  import { UI, inIntro } from './lib/ui.svelte';
  import WorldView from './ui/WorldView.svelte';
  import LandView from './ui/LandView.svelte';
  import HexView from './ui/HexView.svelte';
  import Hud from './ui/hud/Hud.svelte';
  import InventoryPage from './ui/panels/InventoryPage.svelte';
  import CraftingPage from './ui/panels/CraftingPage.svelte';
  import Dialogue from './ui/Dialogue.svelte';
  import QuestBanner from './ui/QuestBanner.svelte';
  import LevelUp from './ui/LevelUp.svelte';
  import { onKey } from './ui/commands';
</script>

<svelte:window onkeydown={onKey} />

<div class="screen">
  <!-- the field and map stay mounted under a screen, just hidden, so coming back is instant -->
  <div class="world" class:away={!!UI.screen}>
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

  {#if G.s.beats?.length && !UI.map}<Dialogue />{:else if !inIntro()}<Hud />{/if}
  </div>

  {#if UI.screen === 'inventory'}<InventoryPage />{/if}
  {#if UI.screen === 'crafting'}<CraftingPage />{/if}
  <QuestBanner />
  <LevelUp />
</div>

<style>
  .screen {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: linear-gradient(to bottom, var(--sky-1), var(--sky-2));
  }
  .world {
    position: absolute;
    inset: 0;
  }
  .world.away {
    visibility: hidden; /* no painting while a screen is up */
  }
  .map-layer {
    position: absolute;
    inset: 0;
  }
</style>
