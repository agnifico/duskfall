<script lang="ts">
  // The Skills panel (J): your quick slots and what goes in them, and your auto skill.
  // Hotbar: click a slot to choose it, then click a skill or an item below to put it there (× empties a slot).
  // Auto skill: one aimed skill, armed whenever you have its Spirit: a click on an enemy fires it in place of a
  // basic attack (design/SKILLS.md).
  import Panel from './Panel.svelte';
  import { G, act } from '../../lib/game.svelte';
  import { asset, content } from '../../content';
  import * as E from '../../engine/actions';
  import { HOTBAR_SLOTS } from '../../engine/rules';
  import ItemIcon from '../ItemIcon.svelte';

  const bar = $derived(Array.from({ length: HOTBAR_SLOTS }, (_, i) => G.s.hotbar?.[i] ?? null));
  let slot = $state(0);
  const skills = $derived(E.knownSkills(G.s, content));
  const usable = $derived(Object.keys(G.s.bag).filter((id) => G.s.bag[id] > 0 && content.items[id]?.use));

  function put(entry: string) {
    act((s) => E.setHotbar(s, entry, slot));
    slot = Math.min(HOTBAR_SLOTS - 1, slot + 1); // ready for the next one
  }
  const clear = (i: number) => act((s) => E.setHotbar(s, null, i));
  const setAuto = (id: string | null) => act((s) => E.setAuto(s, content, id));
  const nameOf = (entry: string) => {
    const [kind, id] = entry.split(':');
    return kind === 'skill' ? (content.skills[id]?.name ?? id) : (content.items[id]?.name ?? id);
  };
</script>

<Panel title="Skills" width="min(600px, 94vw)">
  <div class="lbl section">Hotbar · pick a slot, then what goes in it</div>
  <div class="bar">
    {#each bar as entry, i (i)}
      {@const [kind, id] = entry ? entry.split(':') : [null, null]}
      <div class="cell">
        <button class="slot px btn t-inset" class:sel={slot === i} onclick={() => (slot = i)} title={entry ? nameOf(entry) : `Slot ${i + 1}: empty`}>
          <span class="lbl n">{i + 1}</span>
          {#if kind === 'skill' && id}
            {@const sk = content.skills[id]}
            {#if sk?.badge}<img class="badge" src={asset(`sprites/skills/${sk.badge}.png`)} alt="" />{:else}<span class="emoji">{sk?.icon}</span>{/if}
          {:else if kind === 'item' && id}
            <ItemIcon {id} size={30} />
          {/if}
        </button>
        {#if entry}<button class="x lbl" onclick={() => clear(i)} title="Empty slot {i + 1}">×</button>{/if}
      </div>
    {/each}
  </div>

  <div class="lbl section">Your skills</div>
  {#each skills as id (id)}
    {@const sk = content.skills[id]}
    {@const auto = G.s.auto === id}
    <section class="skill px flat t-inset" class:auto>
      <div class="ic">{#if sk.badge}<img src={asset(`sprites/skills/${sk.badge}.png`)} alt="" />{:else}<span class="emoji">{sk.icon}</span>{/if}</div>
      <div class="grow">
        <div class="top">
          <span class="disp nm">{sk.name}</span>
          <span class="lbl sp">{sk.spirit} Spirit{sk.energy ? ` · ${sk.energy}⚡` : ''}</span>
        </div>
        <p class="body dim">{sk.text}</p>
        <div class="acts">
          <button class="px btn t-inset small" onclick={() => put(`skill:${id}`)} title="Put it in slot {slot + 1}"><span class="lbl m">To slot {slot + 1}</span></button>
          {#if E.canAuto(content, id)}
            <button class="px btn small" class:t-accent={auto} class:t-inset={!auto} onclick={() => setAuto(auto ? null : id)} title={auto ? 'Stop using it as your auto skill' : 'Make it your auto skill: a click on an enemy fires it whenever you have the Spirit'}>
              <span class="lbl m">{auto ? 'Auto: on' : 'Make auto'}</span>
            </button>
          {:else}
            <span class="lbl dim note">Fires around you: can't be auto</span>
          {/if}
        </div>
      </div>
    </section>
  {:else}
    <p class="body dim">No skills yet.</p>
  {/each}
  <p class="body dim hint">
    <b>Auto skill:</b> while you have its Spirit, clicking an enemy fires it instead of a basic attack (the cursor turns
    to a crosshair over enemies). When you run short, clicks are basic attacks again, which build Spirit back up.
  </p>

  {#if usable.length}
    <div class="lbl section">Food and potions</div>
    <div class="items">
      {#each usable as id (id)}
        <button class="item px btn t-inset" onclick={() => put(`item:${id}`)} title="Put it in slot {slot + 1}">
          <ItemIcon {id} size={26} />
          <span class="lbl m">{content.items[id].name}</span>
          <span class="lbl dim">×{G.s.bag[id]}</span>
        </button>
      {/each}
    </div>
  {/if}
</Panel>

<style>
  .section {
    margin: 4px 0 8px;
    color: var(--dim);
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 16px;
  }
  .cell {
    position: relative;
  }
  .slot {
    width: 50px;
    height: 50px;
    display: grid;
    place-items: center;
  }
  .slot.sel {
    outline: 3px solid var(--hl);
    outline-offset: 1px;
  }
  .n {
    position: absolute;
    left: 5px;
    top: 4px;
    color: var(--well-fg);
  }
  .badge {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }
  .emoji {
    font-size: 22px;
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  }
  .x {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 20px;
    height: 20px;
    border: 0;
    border-radius: 50%;
    background: #e5484d;
    color: #fff;
    cursor: pointer;
    line-height: 1;
  }
  .skill {
    display: flex;
    gap: 12px;
    padding: 10px 12px;
    margin-bottom: 8px;
  }
  .skill.auto {
    box-shadow: inset 3px 0 0 #9fd8ff;
  }
  .ic img {
    width: 44px;
    height: 44px;
    object-fit: contain;
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .nm {
    font-size: 20px;
    color: var(--hl);
  }
  .sp {
    color: #9fd8ff;
  }
  .body {
    margin: 2px 0 8px;
  }
  .acts {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .small {
    padding: 4px 10px 6px;
  }
  .note {
    font-size: 11px;
  }
  .hint {
    margin: 4px 0 16px;
    font-size: 13px;
  }
  .items {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 4px;
  }
</style>
