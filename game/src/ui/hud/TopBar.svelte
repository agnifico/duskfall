<script lang="ts">
  // Top of the screen: the portrait on the left, the map corner on the right, and between them two rows:
  // the energy strip, always shown, then chips: the day, where you are, coins, XP, people.
  // Where you are shows only the point's name; hovering it (or tabbing into it) opens the whole path,
  // pushing the chips after it to the right, and each step is clickable.
  import { G } from '../../lib/game.svelte';
  import { asset, content } from '../../content';
  import { closeMap, homeLand, openLandMap, showWorld, togglePanel } from '../commands';
  import { PLAYER } from '../placeholders';
  import type { Crumb } from '../types';
  import Breadcrumb from './Breadcrumb.svelte';
  import MapCorner from './MapCorner.svelte';
  import TimeChip from './TimeChip.svelte';
  import EnergyStrip from './EnergyStrip.svelte';
  import People from './People.svelte';

  /** Where you are, whichever map is open. Each step opens that level: the world, the land, the zone,
   *  and your own point takes you back to the hex field. */
  const crumbs = $derived.by((): Crumb[] => {
    const out: Crumb[] = [{ label: 'World', onclick: showWorld }];
    const landId = homeLand();
    const land = landId ? content.lands[landId] : undefined;
    if (land) out.push({ label: land.name, onclick: () => openLandMap(land.id) });
    const p = G.s.point ? content.points[G.s.point] : undefined;
    if (land && p) {
      const zone = land.zones.find((z) => z.id === p.zone);
      if (zone) out.push({ label: zone.name, onclick: () => openLandMap(land.id, zone.id) });
      out.push({ label: p.name, onclick: closeMap });
    }
    return out;
  });

  const coins = $derived(G.s.bag['coin'] ?? 0);
  let whereOpen = $state(false);
  const shown = $derived(whereOpen ? crumbs : crumbs.slice(-1));

</script>

<header class="top">
  <button class="portrait px btn bevel t-panel" onclick={() => togglePanel('character')} title="Character (C)" aria-label="Character">
    {#if content.player.portrait}
      <img class="face" src={asset(content.player.portrait)} alt="" />
    {:else}
      <span class="disp mono">{PLAYER.monogram}</span>
    {/if}
    <span class="lvl px flat t-accent lbl m">{PLAYER.level}</span>
  </button>

  <div class="mid">
    <EnergyStrip />
    <div class="row chips">
      <TimeChip />
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="chip where px flat round t-inset"
        class:open={whereOpen}
        onmouseenter={() => (whereOpen = true)}
        onmouseleave={() => (whereOpen = false)}
        onfocusin={() => (whereOpen = true)}
        onfocusout={() => (whereOpen = false)}
      >
        <Breadcrumb items={shown} />
      </div>
      <div class="chip px flat round t-inset" title="Coins">
        <i class="coin" aria-hidden="true"></i><span class="lbl m">{coins}</span>
      </div>
      <div class="chip xp px flat round t-inset" title="Experience: {PLAYER.xp} of {PLAYER.xpNext} to level {PLAYER.level + 1}">
        <span class="lbl m">XP</span>
        <span class="track"><b style:width="{(PLAYER.xp / PLAYER.xpNext) * 100}%"></b></span>
        <span class="lbl m dim">{PLAYER.xp}/{PLAYER.xpNext}</span>
      </div>
      <People />
    </div>
  </div>

  <MapCorner />
</header>

<style>
  .top {
    position: absolute;
    left: 14px;
    right: 14px;
    top: 12px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }
  .portrait {
    flex: none;
    width: 78px;
    height: 78px;
    display: grid;
    place-items: center;
  }
  .face {
    position: absolute;
    left: 5px;
    top: 5px;
    width: calc(100% - 10px);
    height: calc(100% - 14px);
    object-fit: cover;
    box-shadow: 0 0 0 2px var(--ink);
  }
  .mono {
    font-size: 52px;
    color: var(--hl);
    margin-top: -4px;
  }
  .lvl {
    position: absolute;
    right: -6px;
    bottom: -6px;
    min-width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    padding: 0 5px;
  }
  .mid {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .row {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .chips {
    flex-wrap: nowrap;
  }
  .where {
    flex: none;
  }
  .xp {
    flex: 0 1 220px;
  }
  .xp .track {
    flex: 1;
    min-width: 40px;
    position: relative;
    height: 8px;
    border-radius: 2px;
    overflow: hidden;
    background: color-mix(in oklab, var(--c-inset) 70%, #000);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .xp .track b {
    position: absolute;
    inset: 0 auto 0 0;
    background: #8fd16a;
  }
  .dim {
    color: var(--dim);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 30px;
    padding: 0 16px;
    min-width: 0;
  }
  .coin {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #f2c14e;
    box-shadow: inset -2px -2px 0 #b8862a, inset 2px 2px 0 #fff0b8, 0 0 0 2px var(--ink);
  }
</style>
