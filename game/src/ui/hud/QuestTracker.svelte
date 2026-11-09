<script lang="ts">
  // The quests you're on, top left under the portrait: title, the current step, kills so far, and items carried against items asked for.
  import { G } from '../../lib/game.svelte';
  import { content } from '../../content';
  import { activeStages } from '../../engine/story';
  import { takenErrands } from '../../engine/errands';
  import { togglePanel } from '../commands';

  const list = $derived(activeStages(G.s, content));
  const errands = $derived(takenErrands(G.s, content, G.now));
</script>

{#if list.length || errands.length}
  <button class="tracker px flat t-panel" onclick={() => togglePanel('quests')} title="Your quests (Q)">
    {#each list as a (a.id)}
      <div class="q" class:main={a.q.main}>
        <div class="lbl m title">{a.q.title}</div>
        <div class="body obj">{a.st?.objective}{#if a.progress}<b> {a.progress}</b>{/if}</div>
        {#if a.items.length}
          <div class="items">
            {#each a.items as it (it.name)}<span class="body" class:got={it.have >= it.n}>{it.name} <b>{it.have}/{it.n}</b></span>{/each}
          </div>
        {/if}
      </div>
    {/each}
    {#each errands as d (d.e.id)}
      <div class="q daily">
        <div class="lbl m title">{d.e.title}</div>
        <div class="body obj">{d.ready ? `Hand in to ${content.npcs[d.npc]?.name ?? d.npc}` : d.e.kill ? 'Beat them' : `Bring ${content.items[d.e.bring?.item ?? '']?.name ?? ''}`}<b> {d.progress}</b></div>
      </div>
    {/each}
  </button>
{/if}

<style>
  .tracker {
    position: absolute;
    left: 14px;
    top: 112px;
    max-width: 300px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 12px 10px;
    border: 0;
    text-align: left;
    cursor: pointer;
    color: var(--fg);
    opacity: 0.94;
  }
  .q {
    padding-left: 8px;
    border-left: 3px solid color-mix(in srgb, var(--fg) 30%, transparent);
  }
  .q.main {
    border-left-color: var(--hl);
  }
  .q.daily {
    border-left-color: #7cc4d6;
  }
  .title {
    color: var(--hl);
  }
  .obj {
    font-size: 13px;
    line-height: 1.35;
  }
  .items {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    margin-top: 3px;
    font-size: 12px;
    opacity: 0.9;
  }
  .items b {
    color: var(--hl);
  }
  .items .got b {
    color: #6fcf7c;
  }
  .obj b {
    color: var(--hl);
  }
</style>
