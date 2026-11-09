<script lang="ts">
  // "New quest" and "Quest complete", across the top for a few seconds. Mounted outside the HUD so it still
  // notices changes made while a story beat had the screen.
  import { fly } from 'svelte/transition';
  import { untrack } from 'svelte';
  import { G } from '../lib/game.svelte';
  import { content } from '../content';
  import ItemIcon from './ItemIcon.svelte';

  type Reward = { item?: string; text: string };
  type Note = { id: number; kind: 'new' | 'done'; title: string; main: boolean; rewards: Reward[] };

  /** What finishing a quest hands you: its last step's XP, items and energy. */
  function rewardsOf(id: string): Reward[] {
    const st = content.quests[id]?.stages.at(-1);
    const out: Reward[] = [];
    for (const e of st?.then ?? []) {
      if ('xp' in e) out.push({ text: `+${e.xp} XP` });
      else if ('give' in e) out.push({ item: e.give, text: `${(e.n ?? 1) > 1 ? `${e.n} ` : ''}${content.items[e.give]?.name ?? e.give}` });
      else if ('energy' in e) out.push({ text: `+${e.energy}⚡` });
    }
    return out;
  }
  let notes = $state<Note[]>([]);
  let seen: Record<string, string> = Object.fromEntries(Object.entries(G.s.quests ?? {}).map(([id, p]) => [id, p.state]));
  let seq = 0;

  $effect(() => {
    const now = Object.entries(G.s.quests ?? {}).map(([id, p]) => [id, p.state] as const);
    for (const [id, state] of now) {
      if (seen[id] === state) continue;
      const q = content.quests[id];
      const done = state === 'done';
      const n: Note = { id: ++seq, kind: done ? 'done' : 'new', title: q?.title ?? id, main: !!q?.main, rewards: done ? rewardsOf(id) : [] };
      notes = untrack(() => [...notes, n]);
      setTimeout(() => (notes = notes.filter((x) => x.id !== n.id)), n.rewards.length ? 5500 : 3600); // time to read the rewards
    }
    seen = Object.fromEntries(now);
  });
</script>

<div class="banners">
  {#each notes as n (n.id)}
    <div class="banner px bevel" class:t-accent={n.kind === 'done'} class:t-panel={n.kind === 'new'} in:fly={{ y: -24, duration: 260 }} out:fly={{ y: -24, duration: 200 }}>
      <span class="lbl kind">{n.kind === 'new' ? (n.main ? 'New story quest' : 'New quest') : 'Quest complete'}</span>
      <span class="disp t">{n.title}</span>
      {#if n.rewards.length}
        <span class="rewards">
          {#each n.rewards as r, i (i)}<span class="reward lbl">{#if r.item}<ItemIcon id={r.item} size={22} />{/if}{r.text}</span>{/each}
        </span>
      {/if}
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
  .rewards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 14px;
    margin-top: 6px;
    max-width: min(520px, calc(100vw - 48px));
  }
  .reward {
    display: inline-flex;
    align-items: center;
    gap: 5px;
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
