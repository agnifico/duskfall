<script lang="ts">
  // "Level 7": a card across the top when your combat level goes up, with what the level added and anything it
  // opened (gear you can now wear, quests that can now start). Goes on its own after a while; a click closes it.
  // Mounted outside the HUD, like the quest banner, so a level reached during a story beat still shows.
  import { fly } from 'svelte/transition';
  import { untrack } from 'svelte';
  import { G } from '../lib/game.svelte';
  import { content } from '../content';
  import { combatLevel, levelUnlocks } from '../engine/progress';
  import { LEVEL_STATS } from '../engine/rules';

  const SHOW_MS = 7000;
  type Card = { id: number; level: number; gains: string; unlocks: string[] };
  let card = $state<Card | null>(null);
  let seen = untrack(() => combatLevel(G.s));
  let seq = 0;
  let timer = 0;

  $effect(() => {
    const lv = combatLevel(G.s);
    untrack(() => {
      if (lv <= seen) {
        seen = lv; // a new game or a loaded save: no card
        return;
      }
      const ups = lv - seen;
      const unlocks = Array.from({ length: ups }, (_, i) => levelUnlocks(content, seen + 1 + i)).flat();
      const gains = `+${ups * LEVEL_STATS.hp} Health · +${ups * LEVEL_STATS.patk} to every attack and defence`;
      seen = lv;
      card = { id: ++seq, level: lv, gains, unlocks };
      clearTimeout(timer);
      timer = setTimeout(() => (card = null), SHOW_MS + unlocks.length * 1500);
    });
  });
  $effect(() => () => clearTimeout(timer));
</script>

{#if card}
  {#key card.id}
    <button class="levelup px bevel t-accent" onclick={() => (card = null)} title="Close" in:fly={{ y: -24, duration: 280 }} out:fly={{ y: -24, duration: 200 }}>
      <span class="lbl kind">Level up</span>
      <span class="disp t">Level {card.level}</span>
      <span class="body gains">{card.gains}</span>
      {#if card.unlocks.length}
        <ul class="unlocks">
          {#each card.unlocks as u (u)}<li class="body">{u}</li>{/each}
        </ul>
      {/if}
    </button>
  {/key}
{/if}

<style>
  .levelup {
    position: absolute;
    top: 150px;
    left: 50%;
    translate: -50% 0;
    z-index: 41;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    max-width: min(440px, calc(100vw - 32px));
    padding: 10px 28px 14px;
    border: 0;
    cursor: pointer;
    text-align: center;
  }
  .kind {
    color: var(--dim);
  }
  .t {
    font-size: 34px;
    line-height: 1;
    color: var(--hl);
  }
  .gains {
    font-size: 14px;
  }
  .unlocks {
    margin: 6px 0 0;
    padding: 6px 0 0;
    list-style: none;
    border-top: 2px solid color-mix(in srgb, var(--fg) 20%, transparent);
    font-size: 14px;
  }
  .unlocks li::before {
    content: '▸ ';
    color: var(--hl);
  }
</style>
