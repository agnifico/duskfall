<script lang="ts">
  // An item's details as a small floating card: name, slot and level, set, stats with icons, what using it does.
  // Shown on hover (Profile › Gear), placed beside `anchor` and kept on screen.
  import { content } from '../content';
  import { SLOT_NAME } from '../engine/gear';
  import { statRows, useLines } from './statText';

  let { id, anchor }: { id: string; anchor: DOMRect } = $props();
  const it = $derived(content.items[id]);
  const W = 260;
  const left = $derived(anchor.right + 10 + W < innerWidth ? anchor.right + 10 : Math.max(8, anchor.left - 10 - W));
  const top = $derived(Math.min(anchor.top, innerHeight - 260));
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  /** Lifted to <body>: panels are translated, which would make `position: fixed` relative to them. */
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }
</script>

{#if it}
  <div class="card px flat t-panel" use:portal style:left="{left}px" style:top="{Math.max(8, top)}px" style:width="{W}px" role="tooltip">
    <div class="disp nm">{it.name}</div>
    {#if it.slot}
      <div class="lbl m dim">
        {SLOT_NAME[it.slot]}{it.twoHanded ? ' · two hands' : ''} · Lv {it.level ?? 1}{it.element ? ` · ${cap(it.element)}` : ''}
      </div>
      {#if it.set}<div class="lbl set">Set: {content.sets[it.set]?.name ?? it.set}</div>{/if}
    {/if}
    {#if statRows(it.stats).length}
      <div class="stats">
        {#each statRows(it.stats) as r (r.key)}
          <div class="row"><img src={r.icon} alt="" /><span class="body">{r.name}</span><span class="lbl m v" class:bad={r.bad}>{r.value}</span></div>
        {/each}
      </div>
    {/if}
    {#each useLines(it.use) as l (l)}<div class="body">{l}</div>{/each}
    {#if it.text}<p class="body dim">{it.text}</p>{/if}
  </div>
{/if}

<style>
  .card {
    position: fixed;
    z-index: 50;
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    pointer-events: none;
  }
  .nm {
    font-size: 24px;
    line-height: 1;
    color: var(--hl);
  }
  .dim {
    color: var(--dim);
  }
  .set {
    color: var(--hl);
  }
  .stats {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 6px;
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }
  .row {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    align-items: center;
    gap: 8px;
  }
  .row img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
  .v {
    font-weight: 700;
    color: color-mix(in oklab, #2f9e44 70%, var(--fg));
  }
  .v.bad {
    color: color-mix(in oklab, #d64545 75%, var(--fg));
  }
  p {
    margin: 2px 0 0;
    line-height: 1.4;
  }
</style>
