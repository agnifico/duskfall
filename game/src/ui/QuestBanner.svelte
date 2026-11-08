<script lang="ts">
  // "New quest" and "Quest complete", across the top for a few seconds. Mounted outside the HUD so it still
  // notices changes made while a story beat had the screen.
  import { fly } from 'svelte/transition';
  import { untrack } from 'svelte';
  import { G } from '../lib/game.svelte';
  import { content } from '../content';

  type Note = { id: number; kind: 'new' | 'done'; title: string; main: boolean };
  let notes = $state<Note[]>([]);
  let seen: Record<string, string> = Object.fromEntries(Object.entries(G.s.quests ?? {}).map(([id, p]) => [id, p.state]));
  let seq = 0;

  $effect(() => {
    const now = Object.entries(G.s.quests ?? {}).map(([id, p]) => [id, p.state] as const);
    for (const [id, state] of now) {
      if (seen[id] === state) continue;
      const q = content.quests[id];
      const n: Note = { id: ++seq, kind: state === 'done' ? 'done' : 'new', title: q?.title ?? id, main: !!q?.main };
      notes = untrack(() => [...notes, n]);
      setTimeout(() => (notes = notes.filter((x) => x.id !== n.id)), 3600);
    }
    seen = Object.fromEntries(now);
  });
</script>

<div class="banners">
  {#each notes as n (n.id)}
    <div class="banner px bevel" class:t-accent={n.kind === 'done'} class:t-panel={n.kind === 'new'} in:fly={{ y: -24, duration: 260 }} out:fly={{ y: -24, duration: 200 }}>
      <span class="lbl kind">{n.kind === 'new' ? (n.main ? 'New story quest' : 'New quest') : 'Quest complete'}</span>
      <span class="disp t">{n.title}</span>
    </div>
  {/each}
</div>

<style>
  .banners {
    position: absolute;
    top: 72px;
    left: 50%;
    translate: -50% 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
  }
  .banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 26px 12px;
  }
  .kind {
    color: var(--dim);
  }
  .t {
    font-size: 30px;
    line-height: 1;
    color: var(--hl);
  }
</style>
