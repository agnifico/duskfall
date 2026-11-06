<script lang="ts">
  // Top-right corner.
  //   On the hex field: a small map of the nation you're in. Click it (or M) to open the map.
  //   With the map open: "Back" to where you were (or Esc), and a switch between your nation and the world.
  import { G } from '../../lib/game.svelte';
  import { UI } from '../../lib/ui.svelte';
  import { asset, content } from '../../content';
  import { closeMap, homeLand, openLandMap, showWorld, toggleMap } from '../commands';

  const land = $derived.by(() => {
    const id = UI.map?.kind === 'land' ? UI.map.land : homeLand();
    return id ? content.lands[id] : undefined;
  });
  const point = $derived(G.s.point ? content.points[G.s.point] : undefined);
  const home = $derived(homeLand());
</script>

{#if !UI.map}
  {#if land}
    <button class="thumb px btn bevel t-inset" onclick={toggleMap} title="Map (M)" aria-label="Open the map of {land.name}">
      <span class="img" style:background-image="url({asset(land.map.image)})">
        {#if point}
          <i style:left="{(point.pin[0] / land.map.width) * 100}%" style:top="{(point.pin[1] / land.map.height) * 100}%"></i>
        {/if}
      </span>
      <span class="cap"><span class="key">M</span><span class="lbl">Map</span></span>
    </button>
  {/if}
{:else}
  <div class="open">
    {#if point}
      <button class="px btn bevel t-accent back" onclick={closeMap} title="Back (Esc)">
        <span class="key">Esc</span><span class="lbl m">Back to {point.name}</span>
      </button>
    {/if}
    <div class="switch" role="tablist" aria-label="Which map">
      {#if home}
        <button
          class="px btn t-inset tab"
          class:on={UI.map.kind === 'land'}
          role="tab"
          aria-selected={UI.map.kind === 'land'}
          onclick={() => openLandMap(home)}
        >
          <span class="lbl m">{content.lands[home]?.name ?? home}</span>
        </button>
      {/if}
      <button class="px btn t-inset tab" class:on={UI.map.kind === 'world'} role="tab" aria-selected={UI.map.kind === 'world'} onclick={showWorld}>
        <span class="lbl m">World</span>
      </button>
    </div>
  </div>
{/if}

<style>
  .thumb {
    flex: none;
    width: 132px;
    padding: 4px 4px 8px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .img {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    background-size: 100% 100%;
  }
  .img i {
    position: absolute;
    width: 7px;
    height: 7px;
    transform: translate(-50%, -50%) rotate(45deg);
    background: #e0503a;
    box-shadow: 0 0 0 2px var(--map-ink);
  }
  .cap {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 2px;
  }
  .open {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px 10px 8px;
  }
  .switch {
    display: flex;
    gap: 8px;
  }
  .tab {
    padding: 6px 12px 9px;
  }
  .tab.on {
    --face: var(--c-accent);
    --fg: var(--c-accent-fg);
  }
</style>
