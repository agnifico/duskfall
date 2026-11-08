<script lang="ts">
  // The quest log (Q): what you're on, with its current step, then what you've finished.
  import Panel from './Panel.svelte';
  import { G } from '../../lib/game.svelte';
  import { content } from '../../content';
  import { activeStages } from '../../engine/story';

  const active = $derived(activeStages(G.s, content).sort((a, b) => Number(!!b.q.main) - Number(!!a.q.main)));
  const done = $derived(Object.entries(G.s.quests ?? {}).filter(([id, p]) => p.state === 'done' && content.quests[id]));
</script>

<Panel title="Quests" width="min(560px, 92vw)">
  {#if active.length}
    <div class="lbl section">On now</div>
    {#each active as a (a.id)}
      <section class="q px flat t-inset" class:main={a.q.main}>
        <div class="top">
          <span class="disp qt">{a.q.title}</span>
          {#if a.q.main}<span class="lbl tag">Story</span>{/if}
        </div>
        <p class="body dim">{a.q.text}</p>
        <ol class="steps">
          {#each a.q.stages.slice(0, a.p.stage + 1) as st, i (i)}
            <li class="body" class:past={i < a.p.stage}>{st.objective}{#if i === a.p.stage && a.progress}<b> {a.progress}</b>{/if}</li>
          {/each}
        </ol>
      </section>
    {/each}
  {:else}
    <p class="body dim">No quests right now.</p>
  {/if}
  {#if done.length}
    <div class="lbl section">Finished</div>
    {#each done as [id] (id)}
      <div class="body doneq">✓ {content.quests[id].title}</div>
    {/each}
  {/if}
</Panel>

<style>
  .section {
    color: var(--hl);
    margin: 4px 0 8px;
  }
  .q {
    padding: 10px 14px 12px;
    margin-bottom: 12px;
    border-left: 4px solid color-mix(in srgb, var(--fg) 25%, transparent);
  }
  .q.main {
    border-left-color: var(--hl);
  }
  .top {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .qt {
    font-size: 26px;
  }
  .tag {
    color: var(--hl);
  }
  p {
    margin: 4px 0 8px;
  }
  .dim {
    color: var(--dim);
  }
  .steps {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .past {
    color: var(--dim);
    text-decoration: line-through;
  }
  .steps b {
    color: var(--hl);
  }
  .doneq {
    color: var(--dim);
    padding: 2px 0;
  }
</style>
