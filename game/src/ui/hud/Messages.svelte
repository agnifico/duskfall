<script lang="ts">
  // The newest message ("Not enough energy…", "You notice…", "Theme: Harvest"), shown for a few
  // seconds under the top bar.
  import { untrack } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { G } from '../../lib/game.svelte';
  import { UI } from '../../lib/ui.svelte';

  let shown = $state<{ id: number; text: string } | null>(null);
  let seenGame = untrack(() => G.s.seq);
  let seenNote = untrack(() => UI.note.seq);
  let shownCount = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function show(text: string) {
    shown = { id: ++shownCount, text };
    clearTimeout(timer);
    timer = setTimeout(() => (shown = null), 3400);
  }

  $effect(() => {
    const seq = G.s.seq;
    if (seq === seenGame) return;
    seenGame = seq;
    show(untrack(() => G.s.log[0] ?? ''));
  });
  $effect(() => {
    const seq = UI.note.seq;
    if (seq === seenNote) return;
    seenNote = seq;
    show(untrack(() => UI.note.text));
  });
</script>

{#if shown}
  {#key shown.id}
    <div class="msg px flat t-panel" in:fly={{ y: -8, duration: 160 }} out:fade={{ duration: 220 }}>
      <span class="body">{shown.text}</span>
    </div>
  {/key}
{/if}

<style>
  .msg {
    position: absolute;
    top: 118px;
    left: 50%;
    translate: -50% 0;
    max-width: min(560px, 70vw);
    padding: 6px 14px 8px;
    text-align: center;
  }
  .msg span {
    color: var(--fg);
  }
</style>
