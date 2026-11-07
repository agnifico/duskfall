<script lang="ts">
  // The main menu, bottom-right: one Menu button. Clicking it keeps the row of buttons expanded (remembered)
  // or collapses it again; while collapsed, the row still opens on hover, or on tap.
  import { UI, type PanelId } from '../../lib/ui.svelte';
  import { toggleMap, toggleMenu, togglePanel } from '../commands';

  let open = $state(false); // peeking: hovered or tapped while collapsed
  const collapsed = $derived(!UI.menuOpen);

  const ITEMS: { key: string; label: string; panel?: PanelId; run: () => void }[] = [
    { key: 'B', label: 'Bag', panel: 'bag', run: () => togglePanel('bag') },
    { key: 'Q', label: 'Quests', panel: 'quests', run: () => togglePanel('quests') },
    { key: 'C', label: 'Character', panel: 'character', run: () => togglePanel('character') },
    { key: 'M', label: 'Map', run: toggleMap },
    { key: 'S', label: 'Settings', panel: 'settings', run: () => togglePanel('settings') },
  ];
</script>

<nav class="dock" class:collapsed class:open onmouseleave={() => (open = false)} aria-label="Menu">
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
          {#key UI.bagBump}<span class="disp k" class:bump={UI.bagBump > 0}>{it.key}</span>{/key}
        {:else}
          <span class="disp k">{it.key}</span>
        {/if}
        <span class="lbl">{it.label}</span>
      </button>
    {/each}
  </div>
  <button
    class="px btn bevel t-accent item toggle"
    class:on={UI.menuOpen}
    onclick={() => {
      toggleMenu();
      open = false;
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
    width: 62px;
    height: 62px;
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
  .collapsed:hover .items,
  .collapsed:focus-within .items,
  .collapsed.open .items {
    display: flex;
  }
</style>
