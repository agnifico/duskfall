<script lang="ts">
  // Quick slots next to the bag. The first ones hold the player's skills (keys 1, 2…): each shows its
  // Spirit cost, greys out when you can't afford it, and lights up while it waits for you to aim it.
  // Hovering a skill shows its reach on the field. The rest will hold food, tools and items.
  import { G } from '../../lib/game.svelte';
  import { UI } from '../../lib/ui.svelte';
  import { asset, content } from '../../content';
  import * as E from '../../engine/actions';
  import { pressSkill } from '../commands';

  const SLOTS = 6;
  const skills = content.player.skills ?? [];
</script>

<div class="hotbar">
  {#each { length: SLOTS } as _, i (i)}
    {@const id = skills[i]}
    {@const sk = id ? content.skills[id] : undefined}
    {#if id && sk}
      {@const why = E.skillBlocked(G.s, content, id)}
      <button
        class="slot skill px btn t-inset"
        class:off={!!why}
        class:aiming={UI.aim === id}
        title="{sk.name} ({i + 1}): {sk.text ?? ''} {sk.spirit} Spirit{sk.energy ? ` + ${sk.energy}⚡` : ''}{why ? ` · ${why}` : ''}"
        onclick={() => pressSkill(id)}
        onmouseenter={() => (UI.preview = id)}
        onmouseleave={() => (UI.preview = null)}
      >
        <span class="lbl n">{i + 1}</span>
        {#if sk.badge}<img class="badge" src={asset(`sprites/skills/${sk.badge}.png`)} alt="" />{:else}<span class="icon">{sk.icon}</span>{/if}
        <span class="lbl cost">{sk.spirit}</span>
      </button>
    {:else}
      <div class="slot px flat t-inset empty" title="Quick slot: later"><span class="lbl n">{i + 1}</span></div>
    {/if}
  {/each}
</div>

<style>
  .hotbar {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    padding-bottom: 2px;
  }
  .slot {
    width: 42px;
    height: 42px;
  }
  .empty {
    opacity: 0.75;
  }
  .empty::after {
    content: '';
    position: absolute;
    inset: 5px;
    background: var(--well);
    box-shadow: inset 0 2px 0 color-mix(in srgb, var(--ink) 45%, transparent);
  }
  .n {
    position: absolute;
    left: 6px;
    top: 6px;
    z-index: 1;
    color: var(--well-fg);
  }
  .skill {
    display: grid;
    place-items: center;
  }
  .icon {
    font-size: 20px;
    line-height: 1;
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  }
  .badge {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }
  .cost {
    z-index: 1;
    text-shadow: 0 1px 0 #000, 0 0 3px #000;
    position: absolute;
    right: 4px;
    bottom: 3px;
    font-size: 9px;
    color: #9fd8ff;
  }
  .skill.off {
    opacity: 0.45;
  }
  .skill.aiming {
    outline: 3px solid #9fd8ff;
    outline-offset: 1px;
  }
</style>
