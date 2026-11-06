<script lang="ts">
  // The main menu, bottom-right. On a point: a row of buttons. On the maps: one Menu button that
  // opens the row on hover, or on tap.
  import { UI, type PanelId } from '../../lib/ui.svelte';
  import { toggleMap, togglePanel } from '../commands';

  let { collapsed = false }: { collapsed?: boolean } = $props();
  let open = $state(false);

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
        <span class="disp k">{it.key}</span>
        <span class="lbl">{it.label}</span>
      </button>
    {/each}
  </div>
  {#if collapsed}
    <button class="px btn bevel t-accent item toggle" onclick={() => (open = !open)} aria-expanded={open} title="Menu">
      <span class="disp k">≡</span>
      <span class="lbl">Menu</span>
    </button>
  {/if}
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
