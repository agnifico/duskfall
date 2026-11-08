<script lang="ts">
  // The quests you're on, top left under the portrait: title, the current step, and kills so far.
  import { G } from '../../lib/game.svelte';
  import { content } from '../../content';
  import { activeStages } from '../../engine/story';
  import { togglePanel } from '../commands';

  const list = $derived(activeStages(G.s, content));
</script>

{#if list.length}
  <button class="tracker px flat t-panel" onclick={() => togglePanel('quests')} title="Your quests (Q)">
    {#each list as a (a.id)}
      <div class="q" class:main={a.q.main}>
        <div class="lbl m title">{a.q.title}</div>
        <div class="body obj">{a.st?.objective}{#if a.progress}<b> {a.progress}</b>{/if}</div>
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
  .title {
    color: var(--hl);
  }
  .obj {
    font-size: 13px;
    line-height: 1.35;
  }
  .obj b {
    color: var(--hl);
  }
</style>
