<script lang="ts">
  // The Crafting screen (K). Tabs per craft; the recipe list on the left (ones you can make now first, with a
  // dot), the picked recipe on the right: what it makes and does, each ingredient as have / need, how many, Craft.
  // Recipes are content/recipes.json; making is engine/craft.ts (free and instant for now).
  import { G, act } from '../../lib/game.svelte';
  import { asset, content } from '../../content';
  import { craft, maxCrafts } from '../../engine/craft';
  import { SLOT_NAME } from '../../engine/gear';
  import type { Recipe } from '../../engine/types';
  import ItemIcon from '../ItemIcon.svelte';
  import { statRows, useLines } from '../statText';
  import Screen from './Screen.svelte';

  type Craft = Recipe['craft'];
  const CRAFTS: { id: Craft; name: string; icon: string }[] = [
    { id: 'cooking', name: 'Cooking', icon: 'cooking' },
    { id: 'alchemy', name: 'Alchemy', icon: 'alchemy' },
    { id: 'smithing', name: 'Smithing', icon: 'smithing' },
  ];
  let tab = $state<Craft>('cooking');
  const order = Object.keys(content.recipes);
  const list = $derived(
    order
      .filter((id) => content.recipes[id].craft === tab)
      .map((id) => ({ id, r: content.recipes[id], max: maxCrafts(G.s, content, id) }))
      .sort((a, b) => Number(b.max > 0) - Number(a.max > 0) || order.indexOf(a.id) - order.indexOf(b.id)),
  );
  const ready = (c: Craft) => order.filter((id) => content.recipes[id].craft === c && maxCrafts(G.s, content, id) > 0).length;

  let picked = $state<string | null>(null);
  $effect(() => {
    if (!picked || content.recipes[picked]?.craft !== tab) picked = list[0]?.id ?? null;
  });
  const r = $derived(picked ? content.recipes[picked] : undefined);
  const out = $derived(r ? content.items[r.makes] : undefined);
  const max = $derived(picked ? maxCrafts(G.s, content, picked) : 0);

  let qty = $state(1);
  $effect(() => {
    void picked;
    qty = 1;
  });
  const n = $derived(Math.max(1, Math.min(qty, Math.max(1, max))));
  function make() {
    if (!picked || max < n) return;
    const id = picked;
    act((s) => craft(s, content, id, n));
    qty = 1;
  }
  const icon = (id: string) => asset(`sprites/icons/${id}.png`);
</script>

<Screen title="Crafting" hint="Esc or K to go back · I for the inventory">
  <div class="tabs" role="tablist">
    {#each CRAFTS as c (c.id)}
      {@const k = ready(c.id)}
      <button class="px btn t-inset tab" class:on={tab === c.id} role="tab" aria-selected={tab === c.id} onclick={() => (tab = c.id)}>
        <img src={icon(c.icon)} alt="" /><span class="lbl m">{c.name}</span>{#if k}<span class="lbl count">{k}</span>{/if}
      </button>
    {/each}
  </div>

  <div class="cols">
    <section class="list" aria-label="Recipes">
      {#each list as x (x.id)}
        {@const it = content.items[x.r.makes]}
        <button class="row" class:sel={picked === x.id} class:no={!x.max} onclick={() => (picked = x.id)}>
          <span class="ic"><ItemIcon id={x.r.makes} size={36} /></span>
          <span class="body nm">{it?.name ?? x.r.makes}{(x.r.n ?? 1) > 1 ? ` ×${x.r.n}` : ''}</span>
          <span class="lbl dim have" title="In your bag">{G.s.bag[x.r.makes] ? `have ${G.s.bag[x.r.makes]}` : ''}</span>
          <span class="dot" class:on={x.max > 0} title={x.max ? `You can make ${x.max}` : 'Missing ingredients'}></span>
        </button>
      {:else}
        <p class="body dim">No recipes yet.</p>
      {/each}
    </section>

    <section class="detail">
      {#if r && out && picked}
        <div class="head">
          <div class="big"><ItemIcon id={r.makes} size={72} /></div>
          <div class="grow">
            <div class="disp dname">{out.name}{(r.n ?? 1) > 1 ? ` ×${r.n}` : ''}</div>
            {#if out.slot}
              <div class="lbl m dim">{SLOT_NAME[out.slot]} · level {out.level ?? 1}{out.set ? ` · ${content.sets[out.set]?.name ?? out.set}` : ''}</div>
            {/if}
            <div class="lbl dim">You have {G.s.bag[r.makes] ?? 0}</div>
          </div>
        </div>

        {#if out.use || statRows(out.stats).length}
          <div class="does">
            {#each statRows(out.stats) as s (s.key)}
              <div class="srow"><img src={s.icon} alt="" /><span class="body">{s.name}</span><span class="lbl m up">{s.value}</span></div>
            {/each}
            {#each useLines(out.use) as l (l)}<div class="body">{l}</div>{/each}
          </div>
        {/if}
        {#if out.text}<p class="body dim flavour">{out.text}</p>{/if}

        <div class="lbl section">Needs{n > 1 ? `, for ${n}` : ''}</div>
        <div class="needs">
          {#each Object.entries(r.needs) as [item, k] (item)}
            {@const have = G.s.bag[item] ?? 0}
            {@const ok = have >= k * n}
            <div class="need" class:ok>
              <span class="ic"><ItemIcon id={item} size={32} /></span>
              <span class="body nm">{content.items[item]?.name ?? item}</span>
              <span class="lbl m amt">{have} / {k * n}</span>
              <span class="lbl mark">{ok ? '✓' : '✗'}</span>
            </div>
          {/each}
        </div>

        <div class="make">
          <div class="qty" aria-label="How many">
            <button class="px btn t-inset step" onclick={() => (qty = Math.max(1, n - 1))} disabled={n <= 1} aria-label="One fewer">−</button>
            <span class="lbl l q">{n}</span>
            <button class="px btn t-inset step" onclick={() => (qty = n + 1)} disabled={n >= max} aria-label="One more">+</button>
            <button class="px btn t-inset maxb" onclick={() => (qty = max)} disabled={max <= 1}><span class="lbl">Max {max > 1 ? max : ''}</span></button>
          </div>
          <button class="px btn bevel t-accent go" disabled={max < n || max === 0} onclick={make}>
            <span class="lbl m">{max ? `Craft${n > 1 ? ` ${n}` : ''}` : 'Missing ingredients'}</span>
          </button>
        </div>
      {:else}
        <p class="body dim">Pick a recipe.</p>
      {/if}
    </section>
  </div>
</Screen>

<style>
  .dim {
    color: var(--dim);
  }
  p {
    margin: 0;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 4px 0 12px;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px 7px 8px;
  }
  .tab img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
  .count {
    min-width: 18px;
    padding: 1px 5px;
    text-align: center;
    color: var(--c-accent-fg);
    background: var(--c-accent);
  }
  .cols {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: 24px;
  }

  /* the list: a warm inset brown, like the Inventory's left side */
  .list {
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
    background: color-mix(in oklab, var(--c-inset) 70%, var(--face));
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ink) 14%, transparent);
  }
  .row {
    display: grid;
    grid-template-columns: 44px 1fr auto 14px;
    align-items: center;
    gap: 10px;
    padding: 6px 10px 6px 6px;
    border: 0;
    text-align: left;
    cursor: pointer;
    color: var(--fg);
    background: color-mix(in srgb, var(--face) 55%, transparent);
  }
  .row:hover {
    background: var(--face);
  }
  .row.sel {
    background: var(--face);
    box-shadow: inset 3px 0 0 var(--hl), inset 0 0 0 2px color-mix(in srgb, var(--hl) 50%, transparent);
  }
  .row.no .nm,
  .row.no .ic {
    opacity: 0.6;
  }
  .ic {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    background: var(--well);
  }
  .nm {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ink) 35%, transparent);
  }
  .dot.on {
    background: var(--c-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ink) 40%, transparent);
  }

  /* the detail */
  .detail {
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 4px 4px 8px;
  }
  .head {
    display: flex;
    gap: 14px;
    align-items: center;
  }
  .big {
    width: 88px;
    height: 88px;
    flex: none;
    display: grid;
    place-items: center;
    background: var(--well);
  }
  .grow {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .dname {
    font-size: 32px;
    line-height: 1;
  }
  .does {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 12px;
    background: color-mix(in oklab, var(--c-inset) 45%, var(--face));
    border-left: 3px solid var(--hl);
  }
  .srow {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    align-items: center;
    gap: 8px;
  }
  .srow img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }
  .up {
    font-weight: 700;
    color: color-mix(in oklab, #2f9e44 70%, var(--fg));
  }
  .flavour {
    font-style: italic;
  }
  .section {
    color: var(--hl);
    margin-top: 4px;
  }
  .needs {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .need {
    display: grid;
    grid-template-columns: 44px 1fr auto 18px;
    align-items: center;
    gap: 10px;
    padding: 4px 10px 4px 4px;
    background: color-mix(in srgb, #d64545 8%, transparent);
  }
  .need.ok {
    background: color-mix(in srgb, #2f9e44 8%, transparent);
  }
  .need .ic {
    width: 40px;
    height: 40px;
  }
  .mark {
    font-weight: 700;
    color: color-mix(in oklab, #d64545 80%, var(--fg));
  }
  .need.ok .mark {
    color: color-mix(in oklab, #2f9e44 75%, var(--fg));
  }
  .make {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    padding: 6px 0 4px;
  }
  .qty {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .step {
    width: 30px;
    height: 30px;
    padding-bottom: 3px;
    font-size: 18px;
  }
  .q {
    min-width: 32px;
    text-align: center;
  }
  .maxb {
    height: 30px;
    padding: 0 10px 3px;
  }
  .go {
    height: 36px;
    padding: 0 20px 3px;
  }
  @media (max-width: 900px) {
    .cols {
      display: flex;
      flex-direction: column;
    }
    .list {
      max-height: 300px;
    }
  }
</style>
