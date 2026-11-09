<script lang="ts">
  // The quick slots (keys 1–6), set by the player. A slot holds a skill (Spirit cost, greys out when you can't
  // afford it, lights up while it waits to be aimed; hovering shows its reach) or food or a potion (count, greys
  // out when you can't use it). Click to use. Right-click any slot, or click an empty one, to pick what goes in
  // it: your skills, or anything usable in your bag. The bag's "To hotbar" fills the first empty slot.
  // The auto skill (set in the Skills panel, J) is tagged, and glows while armed.
  import { G, act } from '../../lib/game.svelte';
  import { UI } from '../../lib/ui.svelte';
  import { asset, content } from '../../content';
  import * as E from '../../engine/actions';
  import { HOTBAR_SLOTS } from '../../engine/rules';
  import { pressSlot } from '../commands';
  import ItemIcon from '../ItemIcon.svelte';

  const bar = $derived(Array.from({ length: HOTBAR_SLOTS }, (_, i) => G.s.hotbar?.[i] ?? null));
  let picking = $state<number | null>(null);

  /** What can go in a slot: your skills, then usable things in your bag. */
  const choices = $derived([
    ...E.knownSkills(G.s, content).map((id) => ({ entry: `skill:${id}`, name: content.skills[id]?.name ?? id })),
    ...Object.keys(G.s.bag)
      .filter((id) => G.s.bag[id] > 0 && content.items[id]?.use)
      .map((id) => ({ entry: `item:${id}`, name: content.items[id].name })),
  ]);

  function pick(i: number, entry: string | null) {
    act((s) => E.setHotbar(s, entry, i));
    picking = null;
  }
  function onclick(i: number) {
    if (bar[i]) pressSlot(i);
    else picking = picking === i ? null : i;
  }
  function oncontextmenu(e: MouseEvent, i: number) {
    e.preventDefault();
    picking = picking === i ? null : i;
  }
</script>

<svelte:window onpointerdown={(e) => picking !== null && !(e.target as Element).closest?.('.hotbar') && (picking = null)} />

<div class="hotbar">
  {#each bar as entry, i (i)}
    {@const [kind, id] = entry ? entry.split(':') : [null, null]}
    {@const sk = kind === 'skill' && id ? content.skills[id] : undefined}
    {@const it = kind === 'item' && id ? content.items[id] : undefined}
    <div class="cell">
      {#if sk && id}
        {@const why = E.skillBlocked(G.s, content, id)}
        <button
          class="slot skill px btn t-inset"
          class:off={!!why}
          class:aiming={UI.aim === id}
          class:auto={G.s.auto === id}
          class:armed={G.s.auto === id && !why}
          title="{sk.name} ({i + 1}): {sk.text ?? ''} {sk.spirit} Spirit{sk.energy ? ` + ${sk.energy}⚡` : ''}{why ? ` · ${why}` : ''} · right-click to change"
          onclick={() => onclick(i)}
          oncontextmenu={(e) => oncontextmenu(e, i)}
          onmouseenter={() => (UI.preview = id)}
          onmouseleave={() => (UI.preview = null)}
        >
          <span class="lbl n">{i + 1}</span>
          {#if sk.badge}<img class="badge" src={asset(`sprites/skills/${sk.badge}.png`)} alt="" />{:else}<span class="icon">{sk.icon}</span>{/if}
          <span class="lbl cost">{sk.spirit}</span>
          {#if G.s.auto === id}<span class="lbl autotag">Auto</span>{/if}
        </button>
      {:else if it && id}
        {@const n = G.s.bag[id] ?? 0}
        {@const why = E.cantUse(G.s, content, id)}
        <button
          class="slot item px btn t-inset"
          class:off={!!why}
          title="{it.name} ({i + 1}){why ? ` · ${why}` : ''} · right-click to change"
          onclick={() => onclick(i)}
          oncontextmenu={(e) => oncontextmenu(e, i)}
        >
          <span class="lbl n">{i + 1}</span>
          <ItemIcon {id} size={30} />
          <span class="lbl count" class:none={n === 0}>{n}</span>
        </button>
      {:else}
        <button class="slot px flat t-inset empty" title="Quick slot {i + 1}: click to fill it" onclick={() => onclick(i)} oncontextmenu={(e) => oncontextmenu(e, i)}>
          <span class="lbl n">{i + 1}</span>
        </button>
      {/if}

      {#if picking === i}
        <div class="picker px bevel t-panel">
          <div class="lbl dim head">Slot {i + 1}</div>
          {#each choices as ch (ch.entry)}
            <button class="px btn t-inset opt" class:on={ch.entry === entry} onclick={() => pick(i, ch.entry)}><span class="lbl m">{ch.name}</span></button>
          {:else}
            <div class="body dim">Nothing usable in your bag yet.</div>
          {/each}
          {#if entry}<button class="px btn t-inset opt clear" onclick={() => pick(i, null)}><span class="lbl m">Empty it</span></button>{/if}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .hotbar {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    padding-bottom: 2px;
  }
  .cell {
    position: relative;
  }
  .slot {
    width: 42px;
    height: 42px;
  }
  .empty {
    opacity: 0.75;
    padding: 0;
    border: 0;
    cursor: pointer;
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
  .skill,
  .item {
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
  .cost,
  .count {
    z-index: 1;
    text-shadow: 0 1px 0 #000, 0 0 3px #000;
    position: absolute;
    right: 4px;
    bottom: 3px;
    font-size: 9px;
    color: #9fd8ff;
  }
  .count {
    color: #fff;
  }
  .count.none {
    color: #ff8a7a;
  }
  .off {
    opacity: 0.45;
  }
  .skill.aiming {
    outline: 3px solid #9fd8ff;
    outline-offset: 1px;
  }
  /* the auto skill: tagged; while armed (Spirit enough) it glows, since a click on an enemy fires it */
  .autotag {
    position: absolute;
    top: -9px;
    left: 50%;
    translate: -50% 0;
    z-index: 2;
    padding: 0 4px;
    font-size: 9px;
    color: #0a1210;
    background: #9fd8ff;
  }
  .skill.armed {
    box-shadow: 0 0 0 2px #9fd8ff, 0 0 12px #9fd8ffaa;
  }
  .picker {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 0;
    z-index: 20;
    min-width: 180px;
    max-height: 320px;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .head {
    margin-bottom: 2px;
  }
  .opt {
    text-align: left;
    padding: 6px 10px 8px;
  }
  .opt.on {
    outline: 2px solid var(--hl);
  }
  .clear {
    margin-top: 4px;
  }
</style>
