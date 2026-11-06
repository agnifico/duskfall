<script lang="ts">
  // The card on the right that pops in when you step onto a hex with something on it:
  // a person, a place, a find, an enemy, a bed, the way out. Gathering has its own prompt.
  import { fly } from 'svelte/transition';
  import { G, short } from '../../lib/game.svelte';
  import { asset, content } from '../../content';
  import * as E from '../../engine/actions';
  import { openPerson, runAction, toggleMap } from '../commands';
  import { CARD_KIND } from '../types';

  const here = $derived(E.hereCell(G.s, content));
  const pr = $derived(here ? E.visibleProp(G.s, content, here) : null);
  const shown = $derived(pr && pr.type !== 'node' ? pr : null);
  const actions = $derived(E.actionsHere(G.s, content).filter((a) => a.id !== 'gather' && a.id !== 'search'));
  const npc = $derived(shown?.npc ? content.npcs[shown.npc] : undefined);
  const line = $derived(shown?.npc ? E.lastLine(G.s, content, shown.npc) : null);

  const VERB: Record<string, string> = { talk: 'Talk', rest: 'Rest', take: 'Take', fight: 'Fight' };
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
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
            <p class="body">{line ? `“${line}”` : 'She looks up as you come over.'}</p>
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
              {#if a.cost}<span class="cost" class:short={short(a.cost)}>{a.cost}⚡</span>
              {:else}<span class="cost free">Free</span>{/if}
            {/if}
          </button>
        {/each}
        {#if shown.type === 'exit'}
          <button class="px btn bevel t-accent act" onclick={toggleMap}>
            <span class="lbl m">Open map</span><span class="cost free">Free</span>
          </button>
        {/if}
      </div>
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
  .act {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px 10px 12px;
  }
</style>
