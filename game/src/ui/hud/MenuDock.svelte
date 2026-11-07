<script lang="ts">
  // The main menu, bottom-right: one Menu button. Clicking it keeps the row of buttons expanded (remembered)
  // or collapses it again; while collapsed, the row still opens on hover, or on tap.
  import { UI, type PanelId } from '../../lib/ui.svelte';
  import { toggleMap, toggleMenu, togglePanel } from '../commands';
  import { asset } from '../../content';

  let open = $state(false); // peeking: hovered or tapped while collapsed
  let hold = $state(false); // just collapsed with the Menu button: no peeking until the pointer leaves
  const collapsed = $derived(!UI.menuOpen);

  const ITEMS: { key: string; label: string; icon: string; panel?: PanelId; run: () => void }[] = [
    { key: 'B', label: 'Bag', icon: 'bag', panel: 'bag', run: () => togglePanel('bag') },
    { key: 'Q', label: 'Quests', icon: 'quests', panel: 'quests', run: () => togglePanel('quests') },
    { key: 'C', label: 'Profile', icon: 'character', panel: 'character', run: () => togglePanel('character') },
    { key: 'M', label: 'Map', icon: 'map', run: toggleMap },
    { key: 'S', label: 'Settings', icon: 'settings', panel: 'settings', run: () => togglePanel('settings') },
  ];
</script>

<nav class="dock" class:collapsed class:open class:hold onmouseleave={() => ((open = false), (hold = false))} aria-label="Menu">
  <div class="items">
    {#each ITEMS as it (it.key)}
      <button
        class="px btn bevel t-panel item"
        class:on={!!it.panel && UI.panel === it.panel}
        onclick={() => {
          it.run();
          open = false;
        }}
        title="{it.label} ({it.key})"
      >
        {#if it.key === 'B'}
          {#key UI.bagBump}<img class="ic" class:bump={UI.bagBump > 0} src={asset(`sprites/icons/${it.icon}.png`)} alt="" />{/key}
        {:else}
          <img class="ic" src={asset(`sprites/icons/${it.icon}.png`)} alt="" />
        {/if}
        <span class="hk lbl">{it.key}</span>
        <span class="lbl">{it.label}</span>
      </button>
    {/each}
  </div>
  <button
    class="px btn bevel t-accent item toggle"
    class:on={UI.menuOpen}
    onclick={(e) => {
      toggleMenu();
      open = false;
      if (!UI.menuOpen) {
        hold = true;
        e.currentTarget.blur();
      }
    }}
    aria-expanded={UI.menuOpen || open}
    title={UI.menuOpen ? 'Collapse the menu' : 'Keep the menu open'}
  >
    <span class="disp k">{UI.menuOpen ? '›' : '≡'}</span>
    <span class="lbl">Menu</span>
  </button>
</nav>

<style>
  .dock {
    position: absolute;
    right: 14px;
    bottom: 14px;
    display: flex;
    align-items: flex-end;
    gap: 10px;
    pointer-events: auto; /* the gaps between buttons count as the dock, so hover doesn't drop crossing them */
  }
  .items {
    display: flex;
    gap: 10px;
  }
  .item {
    position: relative;
    width: 62px;
    height: 74px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding-bottom: 6px;
  }
  .k {
    font-size: 30px;
    color: var(--hl);
  }
  .ic {
    width: 40px;
    height: 40px;
    object-fit: contain;
    filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.25));
  }
  .hk {
    position: absolute;
    top: 3px;
    right: 5px;
    font-size: 10px;
    opacity: 0.55;
  }
  .toggle .k {
    color: inherit;
  }
  .bump {
    animation: bump 260ms steps(4);
  }
  @keyframes bump {
    40% {
      transform: translateY(-5px) scale(1.12);
    }
  }
  /* collapsed: the row only shows while hovered, focused or opened by tap */
  .collapsed .items {
    display: none;
  }
  .collapsed:not(.hold):hover .items,
  .collapsed:not(.hold):focus-within .items,
  .collapsed.open .items {
    display: flex;
  }
</style>
