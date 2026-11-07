<script lang="ts">
  // In the top bar's second row: the people you can go to. The button opens a list; going to anyone is free,
  // from the hex field or the map. A person's name or face opens their profile.
  import { fly } from 'svelte/transition';
  import { UI } from '../../lib/ui.svelte';
  import { asset, content } from '../../content';
  import * as E from '../../engine/actions';
  import { goToPerson, openPerson, togglePeople } from '../commands';

  const people = Object.entries(content.npcs);
  let root = $state<HTMLDivElement>();

  // a click anywhere else closes the list
  $effect(() => {
    if (!UI.people) return;
    const onDown = (e: PointerEvent) => {
      if (root && !root.contains(e.target as Node)) UI.people = false;
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  });

  /** "Sylvie's Home · The Plains" */
  function where(pointId: string): string {
    const p = content.points[pointId];
    if (!p) return '';
    const land = E.landOf(content, pointId);
    const zone = land ? content.lands[land].zones.find((z) => z.id === p.zone) : undefined;
    return zone ? `${p.name} · ${zone.name}` : p.name;
  }
</script>

{#if people.length}
  <div class="people" bind:this={root}>
    <button class="px btn bevel t-panel toggle" class:on={UI.people} onclick={togglePeople} title="People (P)" aria-expanded={UI.people}>
      <span class="lbl m">People</span>
      <span class="caret" class:open={UI.people} aria-hidden="true"></span>
    </button>

    {#if UI.people}
      <div class="list px bevel t-panel" transition:fly={{ y: -8, duration: 140 }}>
        {#each people as [id, n] (id)}
          <div class="row">
            <button class="who" onclick={() => openPerson(id)} title="{n.name}'s profile">
              <img class="face" src={asset(n.portrait)} alt="" />
              <span class="txt">
                <span class="disp name">{n.name}</span>
                {#if n.title}<span class="lbl ttl">{n.title}</span>{/if}
                <span class="lbl dim">{where(n.point)}</span>
              </span>
            </button>
            <button class="px btn bevel t-accent go" onclick={() => goToPerson(id)} title="Go to {n.name}">
              <span class="lbl m">Go to</span><span class="cost free">Free</span>
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .people {
    position: relative;
    flex: none;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 30px;
    padding: 0 12px;
  }
  .list {
    position: absolute;
    left: 0;
    top: calc(100% + 10px);
    z-index: 5;
  }
  .faces {
    display: flex;
  }
  .faces img {
    width: 20px;
    height: 20px;
    object-fit: cover;
    box-shadow: 0 0 0 2px var(--ink);
  }
  .faces img + img {
    margin-left: -6px;
  }
  .caret {
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid currentColor;
    transition: transform 120ms steps(2);
  }
  .caret.open {
    transform: rotate(180deg);
  }
  .list {
    width: 360px;
    padding: 10px 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .who {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px;
    border: 0;
    background: none;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .who:hover .name {
    color: var(--hl);
  }
  .face {
    flex: none;
    width: 52px;
    height: 52px;
    object-fit: cover;
    box-shadow: 0 0 0 2px var(--ink);
  }
  .txt {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .name {
    font-size: 26px;
  }
  .ttl {
    color: var(--hl);
  }
  .dim {
    color: var(--dim);
  }
  .go {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px 10px;
  }
</style>
