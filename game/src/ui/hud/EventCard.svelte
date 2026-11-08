<script lang="ts">
  // The card on the right that pops in when you step onto a hex with something on it:
  // a person, a place, a find, an enemy, a bed, a fire. Gathering has its own prompt.
  // A person with a pool of daily quests gets a Daily quests button: today's offers, to take, track and hand in.
  // A person with a shop gets a Shop button: what they sell, and what they'd buy from your bag.
  import { fly } from 'svelte/transition';
  import { G, act, short } from '../../lib/game.svelte';
  import { buy, coins, sell, sellable } from '../../engine/shop';
  import ItemIcon from '../ItemIcon.svelte';
  import { errandProgress, errandState, handInErrand, offered, takeErrand } from '../../engine/errands';
  import { asset, content } from '../../content';
  import * as E from '../../engine/actions';
  import { openPerson, runAction } from '../commands';
  import { CARD_KIND } from '../types';

  const here = $derived(E.hereCell(G.s, content));
  const pr = $derived(here ? E.visibleProp(G.s, content, here) : null);
  const shown = $derived(pr && pr.type !== 'node' && pr.type !== 'exit' ? pr : null); // the way out needs no card: M opens the map anywhere
  const actions = $derived(E.actionsHere(G.s, content, G.now).filter((a) => a.id !== 'gather' && a.id !== 'search'));
  const npc = $derived(shown?.npc ? content.npcs[shown.npc] : undefined);
  const line = $derived(shown?.npc ? E.lastLine(G.s, content, shown.npc) : null);

  const VERB: Record<string, string> = { talk: 'Talk', rest: 'Rest', take: 'Take', fight: 'Fight' };
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  let showDaily = $state(false);
  const daily = $derived(shown?.npc ? offered(G.s, content, shown.npc, G.now) : []);
  const dailyWaiting = $derived(daily.filter((e) => errandState(G.s, content, e, G.now) !== 'done').length);

  let showShop = $state(false);
  let shopTab = $state<'buy' | 'sell'>('buy');
  const forSale = $derived(sellable(G.s, content));
</script>

{#if shown && here}
  {#key here.key}
    <aside class="card px bevel t-panel" in:fly={{ x: 40, duration: 220 }}>
      <div class="lbl kind">{CARD_KIND[shown.type] ?? ''}</div>

      {#if npc}
        <div class="who">
          <button class="face-btn" onclick={() => shown.npc && openPerson(shown.npc)} title="{npc.name}'s profile">
            <img class="portrait" src={asset(npc.portrait)} alt="" />
          </button>
          <div>
            <h3 class="disp">{npc.name}</h3>
            {#if npc.title}<div class="lbl ttl">{npc.title}</div>{/if}
            <p class="body">{line ? `“${line}”` : 'They look up as you come over.'}</p>
          </div>
        </div>
      {:else}
        <h3 class="disp">{cap(shown.name)}</h3>
        {#if shown.text}<p class="body">{shown.text}</p>{/if}
      {/if}

      <div class="acts">
        {#each actions as a (a.id)}
          <button class="px btn bevel t-accent act" disabled={!!a.disabled} onclick={() => runAction(a.id)}>
            <span class="lbl m">{a.disabled ?? VERB[a.id] ?? a.label}</span>
            {#if !a.disabled}
              {#if a.cost}<span class="cost" class:short={short(a.cost)}>{a.cost}⚡</span>{/if}
            {/if}
          </button>
        {/each}
        {#if npc?.shop?.length}
          <button class="px btn bevel t-inset act" class:on={showShop} onclick={() => ((showShop = !showShop), (showDaily = false))}>
            <span class="lbl m">Shop</span>
          </button>
        {/if}
        {#if npc && daily.length}
          <button class="px btn bevel t-inset act" class:on={showDaily} onclick={() => ((showDaily = !showDaily), (showShop = false))}>
            <span class="lbl m">Daily quests</span>{#if dailyWaiting}<span class="cost">{dailyWaiting}</span>{/if}
          </button>
        {/if}
      </div>

      {#if npc?.shop && showShop && shown.npc}
        {@const who = shown.npc}
        <div class="daily">
          <div class="tabs">
            <button class="px btn t-inset small" class:on={shopTab === 'buy'} onclick={() => (shopTab = 'buy')}><span class="lbl m">Buy</span></button>
            <button class="px btn t-inset small" class:on={shopTab === 'sell'} onclick={() => (shopTab = 'sell')}><span class="lbl m">Sell</span></button>
            <span class="lbl purse">{coins(G.s)} coins</span>
          </div>
          {#if shopTab === 'buy'}
            {#each npc.shop as l (l.item)}
              <div class="ware px flat t-inset">
                <ItemIcon id={l.item} size={30} />
                <span class="lbl m wname">{content.items[l.item]?.name ?? l.item}</span>
                <button class="px btn bevel t-accent small" disabled={coins(G.s) < l.price} onclick={() => act((s) => buy(s, content, who, l.item))}><span class="lbl m">{l.price}</span></button>
              </div>
            {/each}
          {:else}
            {#each forSale as l (l.item)}
              <div class="ware px flat t-inset">
                <ItemIcon id={l.item} size={30} />
                <span class="lbl m wname">{content.items[l.item]?.name ?? l.item} <span class="dim">×{l.n}</span></span>
                <button class="px btn bevel t-accent small" onclick={() => act((s) => sell(s, content, l.item))} title="Sell one"><span class="lbl m">{l.value}</span></button>
                {#if l.n > 1}<button class="px btn bevel t-inset small" onclick={() => act((s) => sell(s, content, l.item, l.n))} title="Sell all"><span class="lbl m">All</span></button>{/if}
              </div>
            {:else}
              <div class="lbl dim">Nothing they'd buy.</div>
            {/each}
          {/if}
        </div>
      {/if}

      {#if npc && showDaily && shown.npc}
        {@const who = shown.npc}
        <div class="daily">
          {#each daily as e (e.id)}
            {@const st = errandState(G.s, content, e, G.now)}
            <div class="errand px flat t-inset" class:done={st === 'done'}>
              <div class="lbl m etitle">{e.title}{#if st === 'taken' || st === 'ready'}<span class="prog">{errandProgress(G.s, e, G.now)}</span>{/if}</div>
              {#if st === 'open'}<p class="body ask">“{e.ask}”</p>{/if}
              {#if st === 'open'}
                <button class="px btn bevel t-accent small" onclick={() => act((s) => takeErrand(s, content, who, e.id, Date.now()))}><span class="lbl m">Take it</span></button>
              {:else if st === 'ready'}
                <button class="px btn bevel t-accent small" onclick={() => act((s) => handInErrand(s, content, who, e.id, Date.now()))}><span class="lbl m">Hand in</span></button>
              {:else if st === 'done'}
                <div class="lbl dim">Done for today</div>
              {/if}
            </div>
          {/each}
          <div class="lbl dim">New ones tomorrow.</div>
        </div>
      {/if}
    </aside>
  {/key}
{/if}

<style>
  .card {
    position: absolute;
    right: 14px;
    top: 50%;
    translate: 0 -50%;
    width: 300px;
    padding: 14px 16px 18px;
  }
  .kind {
    color: var(--hl);
    margin-bottom: 8px;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 30px;
  }
  p {
    margin: 0;
    color: var(--fg);
  }
  .who {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .face-btn {
    flex: none;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }
  .ttl {
    color: var(--hl);
    margin: -2px 0 6px;
  }
  .portrait {
    display: block;
    width: 72px;
    height: 72px;
    object-fit: cover;
    flex: none;
    box-shadow: 0 0 0 2px var(--ink), 0 0 0 4px var(--c-warm), 0 0 0 6px var(--ink);
    margin: 6px;
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }
  .acts:empty {
    display: none;
  }
  .daily {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
    max-height: 46vh;
    overflow-y: auto;
  }
  .tabs {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .tabs .on {
    outline: 2px solid var(--hl);
  }
  .purse {
    margin-left: auto;
    color: var(--hl);
  }
  .ware {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
  }
  .wname {
    flex: 1;
    min-width: 0;
  }
  .errand {
    padding: 8px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
  .errand.done {
    opacity: 0.6;
  }
  .etitle {
    display: flex;
    gap: 8px;
    width: 100%;
    justify-content: space-between;
  }
  .prog {
    color: var(--hl);
  }
  .ask {
    font-size: 13px;
  }
  .small {
    padding: 5px 10px 8px;
  }
  .act.on {
    outline: 2px solid var(--hl);
  }
  .act {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px 10px 12px;
  }
</style>
