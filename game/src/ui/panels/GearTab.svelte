<script lang="ts">
  // Your gear: the armour down the left, hands and relics on the right, then the sets you're wearing.
  // Hovering a piece shows its details (handy mid-fight, when the Inventory screen can't open); clicking it
  // (or the button) opens the Inventory screen on it, to compare and swap there.
  // Gear art has no shadow of its own (ItemIcon adds one).
  import { G } from '../../lib/game.svelte';
  import { content } from '../../content';
  import { ARMOUR, SLOT_NAME, activeSets, gearStats } from '../../engine/gear';
  import type { WornSlot } from '../../engine/types';
  import ItemIcon from '../ItemIcon.svelte';
  import ItemCard from '../ItemCard.svelte';
  import { statLines, statRows } from '../statText';
  import { UI } from '../../lib/ui.svelte';
  import { openScreen } from '../commands';

  const worn = $derived(G.s.worn);
  const sets = $derived(activeSets(G.s, content));
  const total = $derived(statRows(gearStats(G.s, content)));
  const off = (slot: WornSlot | 'relic', i = 0) => {
    UI.invFocus = { slot, i };
    openScreen('inventory');
  };
  let hover = $state<{ id: string; at: DOMRect } | null>(null);
  const twoHanded = $derived(!!worn.main && !!content.items[worn.main]?.twoHanded && !content.items[worn.main]?.offhand?.length);
</script>

{#snippet slot(id: string | null, label: string, onclick: () => void, locked = false)}
  {@const it = id ? content.items[id] : undefined}
  <button
    class="gslot"
    class:empty={!id}
    class:locked
    disabled={!id}
    {onclick}
    onmouseenter={(e) => id && (hover = { id, at: e.currentTarget.getBoundingClientRect() })}
    onmouseleave={() => (hover = null)}
    title={it ? undefined : locked ? 'Both hands are on your main weapon' : `${label}: wear something from the bag`}
  >
    {#if id}<ItemIcon {id} size={44} />{:else}<span class="lbl dim">{locked ? '—' : label}</span>{/if}
  </button>
{/snippet}

<div class="gear">
  <div class="doll">
    <div class="col">
      {#each ARMOUR as k (k)}
        <div class="row">
          {@render slot(worn[k], SLOT_NAME[k], () => off(k))}
          <span class="lbl nm" class:dim={!worn[k]}>{worn[k] ? content.items[worn[k]!]?.name : SLOT_NAME[k]}</span>
        </div>
      {/each}
    </div>
    <div class="col">
      {#each ['main', 'off'] as const as k (k)}
        <div class="row">
          {@render slot(worn[k], SLOT_NAME[k], () => off(k), k === 'off' && twoHanded)}
          <span class="lbl nm" class:dim={!worn[k]}>{worn[k] ? content.items[worn[k]!]?.name : SLOT_NAME[k]}</span>
        </div>
      {/each}
      <div class="lbl section">Relics</div>
      <div class="relics">
        {#each worn.relics as id, i (i)}
          {@render slot(id, 'Relic', () => off('relic', i))}
        {/each}
      </div>
    </div>
  </div>

  <div class="cols">
    <section class="card px flat t-inset">
      <div class="lbl section">From gear</div>
      {#if total.length}
        {#each total as r (r.key)}<div class="srow"><img src={r.icon} alt="" /><span class="body">{r.name}</span><span class="lbl m sval" class:bad={r.bad}>{r.value}</span></div>{/each}
      {:else}
        <p class="lbl dim">Nothing yet. Wear something from the bag.</p>
      {/if}
    </section>
    <section class="card px flat t-inset">
      <div class="lbl section">Sets</div>
      {#each sets as st (st.id)}
        <div class="body strong">{st.name} · {st.worn}</div>
        {#each st.bonuses as b (b.pieces)}
          <div class="lbl" class:dim={!b.on}>{b.pieces} pieces: {statLines(b.stats).join(', ') || 'bonus to come'}</div>
        {:else}
          <div class="lbl dim">Its bonus comes later.</div>
        {/each}
      {:else}
        <p class="lbl dim">No set pieces on.</p>
      {/each}
    </section>
  </div>
  <button class="px btn bevel t-panel open-bag" onclick={() => openScreen('inventory')}><span class="lbl m">Open the inventory to wear and compare (I)</span></button>
</div>
{#if hover}<ItemCard id={hover.id} anchor={hover.at} />{/if}

<style>
  .gear {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .doll {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .nm {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dim {
    opacity: 0.6;
  }
  .gslot {
    width: 56px;
    height: 56px;
    flex: none;
    display: grid;
    place-items: center;
    border: 0;
    padding: 0;
    cursor: pointer;
    background: var(--well);
    box-shadow:
      inset 0 2px 0 color-mix(in srgb, var(--ink) 45%, transparent),
      inset 0 -2px 0 rgb(255 255 255 / 0.12);
  }
  .gslot:hover:not(:disabled) {
    background: color-mix(in srgb, var(--well) 85%, #fff);
  }
  .gslot.empty {
    cursor: default;
  }
  .gslot.empty .lbl {
    font-size: 9px;
  }
  .gslot.locked {
    opacity: 0.5;
  }
  .relics {
    display: grid;
    grid-template-columns: repeat(4, 56px);
    gap: 6px;
  }
  .section {
    margin-top: 6px;
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .card {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .srow {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    align-items: center;
    gap: 8px;
    min-height: 26px;
  }
  .srow img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }
  .sval {
    font-weight: 700;
    color: color-mix(in oklab, #2f9e44 65%, var(--fg));
  }
  .sval.bad {
    color: color-mix(in oklab, #d64545 70%, var(--fg));
  }
  .open-bag {
    align-self: flex-start;
    height: 30px;
    padding: 0 12px 3px;
  }
  @media (max-width: 560px) {
    .doll,
    .cols {
      grid-template-columns: 1fr;
    }
  }
</style>
