<script lang="ts">
  // The Inventory screen (I): a full page in place of the field (see ScreenId), the big form of the bag and
  // gear; the small bag (B) stays for quick looks over the field.
  // Left: you. The paper doll (armour down the left of the portrait, hands and relics on the right), then
  // the stat sheet and the sets you wear. Right: the bag, in tabs with filters, and the picked item's details.
  // Picking gear previews it: the stat sheet shows what would change, the details compare it with what it
  // replaces: 7 (+2), the change in colour. Picking something you wear previews taking it off.
  // Swapping fast: drag from the bag onto the equipped area to wear (onto a relic slot to pick which one), drag a
  // worn piece out of it to take it off, drag a relic between relic slots to swap them. Double-click works too.
  import { G, act } from '../../lib/game.svelte';
  import { UI } from '../../lib/ui.svelte';
  import { asset, content } from '../../content';
  import { ARMOUR, SLOT_NAME, activeSets, cantWear, takeOff, wear, wornAfter } from '../../engine/gear';
  import { combatProgress, playerStats } from '../../engine/progress';
  import { MAX_SPIRIT } from '../../engine/rules';
  import type { Item, Stats, Worn, WornSlot } from '../../engine/types';
  import ItemIcon from '../ItemIcon.svelte';
  import StatSheet from '../StatSheet.svelte';
  import { STAT_NAME, statIcon, statLines, statValue, useLines, useVerb } from '../statText';
  import { cantUse, useItem } from '../../engine/actions';
  import { PLAYER, TITLE } from '../placeholders';
  import Screen from './Screen.svelte';


  // The left side fits on most screens; on short ones it scrolls with no bar, and an arrow says there's more.
  let youEl = $state<HTMLElement>();
  let more = $state(false);
  const checkMore = () => youEl && (more = youEl.scrollTop + youEl.clientHeight < youEl.scrollHeight - 4);
  $effect(() => {
    if (!youEl) return;
    const ro = new ResizeObserver(checkMore);
    ro.observe(youEl);
    for (const c of youEl.children) ro.observe(c);
    return () => ro.disconnect();
  });

  // ---------- you ----------
  const lv = $derived(combatProgress(G.s));
  const stats = $derived(playerStats(G.s, content));
  const sets = $derived(activeSets(G.s, content));
  const worn = $derived(G.s.worn);
  const myName = $derived(G.s.name || PLAYER.name);
  const twoHanded = $derived(!!worn.main && !!content.items[worn.main]?.twoHanded && !content.items[worn.main]?.offhand?.length);

  // ---------- the bag: tabs and filters ----------
  type Tab = 'all' | 'general' | 'weapons' | 'armour' | 'relics';
  const TABS: [Tab, string][] = [
    ['all', 'All'],
    ['general', 'General'],
    ['weapons', 'Weapons'],
    ['armour', 'Armour'],
    ['relics', 'Relics'],
  ];
  const tabOf = (it: Item | undefined): Tab =>
    !it?.slot ? 'general' : it.slot === 'main' || it.slot === 'off' ? 'weapons' : it.slot === 'relic' ? 'relics' : 'armour';
  /** What the second filter row sorts by: slot for armour, weapon kind for weapons, food/potion/material in General. */
  const facet = (it: Item) =>
    tabOf(it) === 'armour' ? it.slot! : tabOf(it) === 'weapons' ? (it.kind ?? it.slot!) : tabOf(it) === 'general' ? (it.use?.kind ?? 'material') : '';
  const FACET_NAME: Record<string, string> = { food: 'Food', potion: 'Potions', material: 'Materials' };
  const ORDER: Record<string, number> = { head: 0, body: 1, hands: 2, legs: 3, feet: 4, main: 5, off: 6, relic: 7 };

  let tab = $state<Tab>('all');
  let kind = $state<string | null>(null);
  let element = $state<string | null>(null);
  const setTab = (t: Tab) => ((tab = t), (kind = null), (element = null));

  const owned = $derived(Object.entries(G.s.bag).filter(([id, n]) => n > 0 && content.items[id] && !content.items[id].currency));
  const inTab = $derived(owned.filter(([id]) => tab === 'all' || tabOf(content.items[id]) === tab));
  const kinds = $derived([...new Set(inTab.map(([id]) => facet(content.items[id])).filter(Boolean))]);
  const elements = $derived([...new Set(inTab.map(([id]) => content.items[id].element).filter((e): e is string => !!e))].sort());
  const shown = $derived(
    inTab
      .filter(([id]) => (!kind || facet(content.items[id]) === kind) && (!element || content.items[id].element === element))
      .sort(([a], [b]) => {
        // gear you can wear now, then gear above your level, then food and potions, then materials;
        // within those, by level, then slot
        const x = content.items[a], y = content.items[b];
        const rank = (it: Item) => (it.slot ? ((it.level ?? 1) > lv.level ? 1 : 0) : it.use ? 2 : 3);
        return rank(x) - rank(y) || (x.level ?? 1) - (y.level ?? 1) || (ORDER[x.slot ?? ''] ?? 9) - (ORDER[y.slot ?? ''] ?? 9) || x.name.localeCompare(y.name);
      }),
  );
  const MIN_CELLS = 30;
  const blanks = $derived(Math.max(0, MIN_CELLS - shown.length));
  const kindName = (k: string) => FACET_NAME[k] ?? SLOT_NAME[k] ?? k[0].toUpperCase() + k.slice(1);
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  /** Until there are element icons. */
  const ELEMENT_COLOUR: Record<string, string> = { fire: '#e0603a', water: '#3a8fe0', air: '#9fd4d0', earth: '#8a6a3a', dark: '#5a3a8a', light: '#e8d27a' };

  // ---------- what's picked ----------
  type Pick = { from: 'bag'; id: string } | { from: 'worn'; slot: WornSlot | 'relic'; i: number };
  // the Profile's Gear tab can open this page on a worn piece
  let pick = $state<Pick | null>(UI.invFocus ? { from: 'worn', ...UI.invFocus } : null);
  UI.invFocus = null;
  const wornAt = (w: Worn, slot: WornSlot | 'relic', i: number) => (slot === 'relic' ? w.relics[i] : w[slot]);
  const pickedId = $derived(!pick ? null : pick.from === 'bag' ? (G.s.bag[pick.id] > 0 ? pick.id : null) : wornAt(worn, pick.slot, pick.i));
  const item = $derived(pickedId ? content.items[pickedId] : undefined);
  const isWorn = $derived(pick?.from === 'worn');
  const why = $derived(pick?.from === 'bag' && item?.slot ? cantWear(G.s, content, pick.id) : null);

  /** What you'd wear after: this put on, or this taken off. Null if nothing would change. */
  const after = $derived.by((): { worn: Worn; back: string[] } | null => {
    if (!pick || !item?.slot) return null;
    if (pick.from === 'bag') return wornAfter(worn, content, pick.id);
    const w: Worn = { ...worn, relics: [...worn.relics] };
    if (pick.slot === 'relic') w.relics[pick.i] = null;
    else w[pick.slot] = null;
    return { worn: w, back: [] };
  });
  /** The whole-sheet change: set bonuses, two hands and all. */
  const delta = $derived.by((): Partial<Stats> => {
    if (!after) return {};
    const next = playerStats({ ...G.s, worn: after.worn }, content);
    const d: Partial<Stats> = {};
    for (const k of Object.keys(next) as (keyof Stats)[]) if (Math.abs(next[k] - stats[k]) > 1e-9) d[k] = next[k] - stats[k];
    return d;
  });
  /** This item against what it would replace, stat by stat: its value, and the change from what you wear there. */
  const compare = $derived.by(() => {
    const mine = item?.stats ?? {};
    const theirs: Partial<Record<keyof Stats, number>> = {};
    if (!isWorn) for (const id of after?.back ?? []) for (const [k, v] of Object.entries(content.items[id]?.stats ?? {}) as [keyof Stats, number][]) theirs[k] = (theirs[k] ?? 0) + v;
    const keys = (Object.keys(STAT_NAME) as (keyof Stats)[]).filter((k) => mine[k] || theirs[k]);
    return keys.map((k) => ({ k, mine: mine[k] ?? 0, d: isWorn ? 0 : (mine[k] ?? 0) - (theirs[k] ?? 0) }));
  });
  const replaces = $derived(!isWorn && after?.back.length ? after.back.map((id) => content.items[id]?.name ?? id).join(' and ') : null);

  function equip() {
    if (pick?.from !== 'bag' || why) return;
    const id = pick.id;
    const it = content.items[id];
    const i = it.slot === 'relic' ? Math.max(0, worn.relics.indexOf(null)) : 0;
    act((s) => wear(s, content, id));
    pick = { from: 'worn', slot: it.slot === 'relic' ? 'relic' : (it.slot as WornSlot), i };
  }
  function unequip() {
    if (pick?.from !== 'worn' || !pickedId) return;
    const { slot, i } = pick;
    const id = pickedId;
    act((s) => takeOff(s, slot, i));
    pick = { from: 'bag', id };
  }
  // ---------- drag and drop ----------
  type Drag = { id: string; from: Pick; x: number; y: number; x0: number; y0: number; on: boolean };
  let drag = $state<Drag | null>(null);
  let justDragged = false; // the click that ends a drag isn't a pick
  const accepts = (slotId: string) => !!drag?.on && content.items[drag.id]?.slot === slotId;

  function grab(e: PointerEvent, id: string | null, from: Pick) {
    if (!id || e.button !== 0) return;
    drag = { id, from, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, on: false };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', drop, { once: true });
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (!drag.on && Math.hypot(drag.x - drag.x0, drag.y - drag.y0) > 6) drag.on = true;
  }
  function drop(e: PointerEvent) {
    window.removeEventListener('pointermove', move);
    const d = drag;
    drag = null;
    if (!d?.on) return;
    justDragged = true;
    setTimeout(() => (justDragged = false));
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const slotEl = under?.closest<HTMLElement>('[data-slot]');
    const inDoll = !!under?.closest('.doll');
    const it = content.items[d.id];
    if (d.from.from === 'bag') {
      if (!inDoll) return;
      const index = slotEl?.dataset.slot === 'relic' && it.slot === 'relic' ? Number(slotEl.dataset.i) : undefined;
      act((s) => wear(s, content, d.id, index));
      if (!G.s.bag[d.id] || pick?.from === 'bag') pick = null;
    } else {
      const from = d.from;
      if (!inDoll) {
        act((s) => takeOff(s, from.slot, from.i));
        pick = null;
      } else if (from.slot === 'relic' && slotEl?.dataset.slot === 'relic') {
        const to = Number(slotEl.dataset.i);
        if (to !== from.i) {
          act((s) => {
            const r = s.worn.relics;
            [r[from.i], r[to]] = [r[to], r[from.i]];
          });
          pick = { from: 'worn', slot: 'relic', i: to };
        }
      }
    }
  }

  const same = (a: Pick | null, b: Pick) => !!a && JSON.stringify(a) === JSON.stringify(b);
  const toggle = (p: Pick) => {
    if (!justDragged) pick = same(pick, p) ? null : p;
  };
  const fmt = (k: keyof Stats, v: number) => statValue(k, v).replace(/^\+/, '');
  const fmtD = (k: keyof Stats, d: number) => `${d > 0 ? '+' : '−'}${statValue(k, Math.abs(d)).replace(/^\+/, '')}`;
</script>

{#snippet slot(slotId: WornSlot | 'relic', i: number, label: string, locked = false)}
  {@const id = wornAt(worn, slotId, i)}
  {@const p = { from: 'worn' as const, slot: slotId, i }}
  <button
    class="gslot"
    class:empty={!id}
    class:locked
    class:sel={same(pick, p)}
    class:ok={accepts(slotId)}
    class:lifted={drag?.on && same(drag.from, p)}
    data-slot={slotId}
    data-i={i}
    disabled={!id && !accepts(slotId)}
    onpointerdown={(e) => grab(e, id, p)}
    onclick={() => id && toggle(p)}
    ondblclick={() => id && act((s) => takeOff(s, slotId, i))}
    title={id ? `${content.items[id]?.name}: drag out to take off, or double-click` : locked ? 'Both hands are on your main weapon' : `${label}: wear something from the bag`}
  >
    {#if id}<ItemIcon {id} size={46} />{:else}<span class="lbl tiny">{locked ? '—' : label}</span>{/if}
  </button>
{/snippet}

<Screen title="Inventory" hint="Esc or I to go back · K for crafting">

  <div class="cols">
    <!-- ---------- you ---------- -->
    <section class="you" bind:this={youEl} onscroll={checkMore}>
      <div class="ident">
        <div class="line">
          <span class="disp name">{myName}</span>
          <span class="title" title="Your title: what the world calls you. It changes as your story does. {TITLE.text}"><span class="lbl dim">Title</span><span class="lbl m">{TITLE.name}</span></span>
        </div>
        <div class="line">
          <span class="lvl"><img src={asset('sprites/icons/level.png')} alt="" /><span class="lbl m">Level {lv.level}</span></span>
          <span class="track" title={lv.max ? 'The top level for now' : `${lv.into} of ${lv.need} XP to level ${lv.level + 1}`}><b style:width="{lv.max ? 100 : (lv.into / lv.need) * 100}%"></b></span>
          <span class="lbl dim">{lv.max ? 'XP max' : `${lv.into} / ${lv.need} XP`}</span>
        </div>
      </div>

      <div class="doll" class:dropping={drag?.on} class:out={drag?.on && drag.from.from === 'worn'}>
        <div class="col">
          {#each ARMOUR as k (k)}{@render slot(k, 0, SLOT_NAME[k])}{/each}
        </div>
        <div class="face">
          {#if content.player.portrait}<img src={asset(content.player.portrait)} alt="" />{/if}
        </div>
        <div class="col">
          {@render slot('main', 0, 'Main hand')}
          {@render slot('off', 0, 'Off hand', twoHanded)}
          <div class="lbl tiny rl">Relics</div>
          <div class="relics">
            {#each worn.relics as _, i (i)}{@render slot('relic', i, 'Relic')}{/each}
          </div>
        </div>
      </div>

      <StatSheet {stats} hp={G.s.hp} spirit={{ now: G.s.spirit, max: MAX_SPIRIT }} {delta} compact />

      <div class="sets">
        <span class="lbl section">Sets</span>
        {#each sets as st (st.id)}
          {@const next = st.bonuses.find((b) => !b.on)}
          <span
            class="setchip"
            title={st.bonuses.map((b) => `${b.pieces} pieces: ${statLines(b.stats).join(', ') || 'bonus to come'}${b.on ? ' (on)' : ''}`).join('\n') || 'Its bonus comes later.'}
          >
            <span class="body strong">{st.name}</span><span class="lbl m dim">{st.worn}</span>
            {#each st.bonuses.filter((b) => b.on) as b (b.pieces)}<span class="lbl on">{statLines(b.stats).join(', ')}</span>{/each}
            {#if next}<span class="lbl dim">next at {next.pieces}</span>{/if}
          </span>
        {:else}
          <span class="lbl dim">None on. Pieces of one set add a bonus together.</span>
        {/each}
      </div>
      {#if more}<button class="more lbl" onclick={() => youEl?.scrollBy({ top: 200, behavior: 'smooth' })} aria-label="Scroll down">▾ more below</button>{/if}
    </section>

    <!-- ---------- the bag ---------- -->
    <section class="bag">
      <div class="tabs" role="tablist">
        {#each TABS as [id, name] (id)}
          <button class="px btn t-inset tab" class:on={tab === id} role="tab" aria-selected={tab === id} onclick={() => setTab(id)}><span class="lbl m">{name}</span></button>
        {/each}
      </div>
      {#if kinds.length > 1}
        <div class="filters">
          {#each kinds as k (k)}
            <button class="chip lbl" class:on={kind === k} onclick={() => (kind = kind === k ? null : k)}>{kindName(k)}</button>
          {/each}
        </div>
      {/if}
      {#if elements.length}
        <div class="filters">
          {#each elements as e (e)}
            <button class="chip lbl el" class:on={element === e} onclick={() => (element = element === e ? null : e)}><i class="dot" style:background={ELEMENT_COLOUR[e]}></i>{cap(e)}</button>
          {/each}
        </div>
      {/if}
      <div class="grid">
        {#each shown as [id, n] (id)}
          {@const it = content.items[id]}
          {@const tooHigh = !!it.slot && (it.level ?? 1) > lv.level}
          <button
            class="cell"
            class:sel={pick?.from === 'bag' && pick.id === id}
            class:dimmed={tooHigh}
            class:lifted={drag?.on && drag.from.from === 'bag' && drag.id === id}
            onpointerdown={(e) => it.slot && grab(e, id, { from: 'bag', id })}
            onclick={() => toggle({ from: 'bag', id })}
            ondblclick={() => it.slot && !cantWear(G.s, content, id) && act((s) => wear(s, content, id))}
            title={it.slot ? `${it.name}: drag onto your gear to wear` : it.name}
          >
            <ItemIcon {id} size={44} />
            {#if n > 1}<span class="lbl n">{n}</span>{/if}
            {#if tooHigh}<span class="lbl req">Lv {it.level}</span>{/if}
          </button>
        {/each}
        {#each { length: blanks } as _, i (i)}<div class="cell blank"></div>{/each}
      </div>

      <div class="detail">
        {#if item && pickedId}
          <div class="dhead">
            <div class="dicon"><ItemIcon id={pickedId} size={56} /></div>
            <div class="grow">
              <div class="disp dname">{item.name}</div>
              {#if item.slot}
                <div class="chips">
                  <span class="lbl m slotname">{SLOT_NAME[item.slot]}{item.twoHanded ? ' · two hands' : ''}</span>
                  <span class="tag lbl" class:bad={(item.level ?? 1) > lv.level} title="Needs combat level {item.level ?? 1}"><img src={asset('sprites/icons/level.png')} alt="" />Lv {item.level ?? 1}</span>
                  {#if item.element}<span class="tag lbl" title="Element"><i class="dot" style:background={ELEMENT_COLOUR[item.element]}></i>{cap(item.element)}</span>{/if}
                  {#if item.set}
                    <span class="tag lbl" title="Part of a set: wearing several pieces adds a bonus">
                      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 12 L8 4 L12 12 Z" fill="none" stroke="currentColor" stroke-width="1.6" /><circle cx="8" cy="4" r="2.4" fill="currentColor" /><circle cx="4" cy="12" r="2.4" fill="currentColor" /><circle cx="12" cy="12" r="2.4" fill="currentColor" /></svg>
                      {content.sets[item.set]?.name ?? item.set}
                    </span>
                  {/if}
                </div>
              {:else}
                <div class="lbl m dim">{isWorn ? '' : `×${G.s.bag[pickedId] ?? 0} in the bag`}</div>
              {/if}
            </div>
          </div>

          {#if compare.length}
            <div class="cmp">
              {#each compare as r (r.k)}
                <div class="crow">
                  <img src={statIcon(r.k)} alt="" />
                  <span class="body cn">{STAT_NAME[r.k]}</span>
                  <span class="lbl m cv">{fmt(r.k, r.mine)}{#if r.d}<span class="d" class:up={r.d > 0} class:down={r.d < 0}> ({fmtD(r.k, r.d)})</span>{/if}</span>
                </div>
              {/each}
            </div>
            {#if replaces}<div class="lbl dim">In brackets: the change from {replaces}.</div>{/if}
          {/if}
          {#if item.use}
            {@const lines = useLines(item.use)}
            <div class="cmp">
              {#each lines.slice(0, -1) as l (l)}<div class="body cn">{l}</div>{/each}
            </div>
            <div class="lbl dim">{lines[lines.length - 1]}</div>
          {/if}
          {#if item.placeholder}<div class="body ph">Numbers to come.</div>{/if}
          {#if item.text}<p class="body">{item.text}</p>{/if}

          {#if item.use && pickedId}
            {@const no = cantUse(G.s, content, pickedId)}
            <div class="acts">
              <button class="px btn bevel t-accent act" disabled={!!no} title={no ?? useVerb(item.use)} onclick={() => act((s) => useItem(s, content, pickedId!, Date.now()))}>
                <span class="lbl m">{no ?? useVerb(item.use)}</span>
              </button>
            </div>
          {/if}
          {#if item.slot}
            <div class="acts">
              {#if isWorn}
                <button class="px btn bevel t-inset act" onclick={unequip}><span class="lbl m">Take off</span></button>
              {:else}
                <button class="px btn bevel t-accent act" disabled={!!why} title={why ?? 'Wear it (or double-click it)'} onclick={equip}><span class="lbl m">{why ?? 'Equip'}</span></button>
              {/if}
            </div>
          {/if}
        {:else}
          <p class="body dim">{owned.length ? 'Pick something to look at it. Gear shows what it would change.' : 'Empty. Gather something.'}</p>
        {/if}
      </div>
    </section>
  </div>
{#if drag?.on}
  <div class="ghost" style:left="{drag.x}px" style:top="{drag.y}px"><ItemIcon id={drag.id} size={52} /></div>
{/if}
</Screen>

<style>
  .dim {
    color: var(--dim);
  }
  .strong {
    font-weight: 600;
  }
  p {
    margin: 0;
  }
  .cols {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    gap: 24px;
  }
  .you,
  .bag {
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  /* colour zones: you on a warm inset brown, the bag on the panel, the details in a darker well */
  .you {
    position: relative;
    overflow-y: auto;
    scrollbar-width: none;
    padding: 14px 16px 12px;
    gap: 12px;
    background: color-mix(in oklab, var(--c-inset) 70%, var(--face));
    box-shadow:
      inset 0 0 0 2px color-mix(in srgb, var(--ink) 14%, transparent),
      inset 0 3px 0 color-mix(in srgb, var(--ink) 10%, transparent);
  }
  .gslot,
  .cell {
    user-select: none;
    -webkit-user-select: none;
  }
  .you::-webkit-scrollbar {
    display: none;
  }
  .more {
    position: sticky;
    bottom: 0;
    align-self: center;
    flex: none;
    padding: 3px 10px 4px;
    border: 0;
    cursor: pointer;
    color: var(--c-accent-fg);
    background: var(--c-accent);
    box-shadow: 0 2px 0 var(--ink);
  }

  /* ---------- who you are: one block, two lines ---------- */
  .ident {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: none;
  }
  .line {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .name {
    font-size: 30px;
    line-height: 1;
  }
  .title {
    display: flex;
    gap: 6px;
    align-items: baseline;
    cursor: help;
  }
  .lvl {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
  }
  .lvl img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
  .line .track {
    flex: 1;
    max-width: 260px;
  }

  /* ---------- the doll ---------- */
  /* while dragging, the equipped area lights up; slots that take the item light up more */
  .doll {
    margin: -6px;
    padding: 6px;
    outline: 3px dashed transparent;
    outline-offset: -1px;
    transition: outline-color 120ms, background 120ms;
  }
  .doll.dropping {
    outline-color: var(--c-accent);
    background: color-mix(in srgb, var(--c-accent) 12%, transparent);
  }
  .doll.out {
    outline-color: color-mix(in oklab, #d64545 70%, var(--fg));
    background: color-mix(in srgb, #d64545 6%, transparent);
  }
  .gslot.ok {
    box-shadow: inset 0 0 0 3px var(--c-accent);
    background: color-mix(in srgb, var(--well) 70%, var(--c-accent));
  }
  .gslot.lifted,
  .cell.lifted {
    opacity: 0.35;
  }
  .ghost {
    position: fixed;
    z-index: 60;
    translate: -50% -50%;
    pointer-events: none;
    scale: 1.1;
  }
  .doll {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 12px;
    align-items: stretch;
    flex: none;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .gslot {
    width: 52px;
    height: 52px;
    flex: none;
    display: grid;
    place-items: center;
    border: 0;
    padding: 0;
    cursor: pointer;
    background: var(--well);
    box-shadow:
      inset 0 2px 0 color-mix(in srgb, var(--ink) 45%, transparent),
      inset 0 -2px 0 rgb(255 255 255 / 0.12);
  }
  .gslot:hover:not(:disabled) {
    background: color-mix(in srgb, var(--well) 85%, #fff);
  }
  .gslot.sel {
    box-shadow: inset 0 0 0 3px var(--hl);
  }
  .gslot.empty {
    cursor: default;
  }
  .gslot.locked {
    opacity: 0.5;
  }
  .tiny {
    font-size: 9px;
    color: var(--well-fg);
  }
  .rl {
    margin-top: 4px;
    color: var(--dim);
  }
  .relics {
    display: grid;
    grid-template-columns: repeat(2, 52px);
    gap: 6px;
  }
  /* as tall as the armour column (5 slots), no taller */
  .face {
    justify-self: center;
    align-self: start;
    height: calc(5 * 52px + 4 * 6px);
    aspect-ratio: 3 / 4;
    max-width: 100%;
    background: var(--well);
    box-shadow: 0 0 0 3px var(--ink);
    overflow: hidden;
    min-height: 0;
  }
  .face img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
    display: block;
  }
  .track {
    position: relative;
    height: 8px;
    border-radius: 2px;
    overflow: hidden;
    background: color-mix(in oklab, var(--c-inset) 70%, #000);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .track b {
    position: absolute;
    inset: 0 auto 0 0;
    background: #8fd16a;
  }

  .section {
    color: var(--hl);
  }
  .ident {
    padding-bottom: 10px;
    border-bottom: 2px solid color-mix(in srgb, var(--ink) 14%, transparent);
  }
  .sets {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    flex: none;
  }
  .setchip {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    padding: 3px 10px 4px;
    cursor: help;
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }
  .setchip .on {
    color: color-mix(in oklab, #2f9e44 75%, var(--fg));
  }

  /* ---------- the bag ---------- */
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 4px 0 10px;
  }
  .tab {
    padding: 5px 12px 8px;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }
  .chip {
    padding: 3px 9px 4px;
    border: 0;
    cursor: pointer;
    color: var(--fg);
    background: color-mix(in srgb, var(--ink) 10%, transparent);
  }
  .chip:hover {
    background: color-mix(in srgb, var(--ink) 18%, transparent);
  }
  .chip.on {
    color: var(--c-accent-fg);
    background: var(--c-accent);
  }
  .grid {
    flex: 1 1 auto;
    min-height: 120px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
    align-content: start;
    gap: 6px;
    padding-right: 2px;
  }
  .cell {
    position: relative;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border: 0;
    padding: 0;
    cursor: pointer;
    background: var(--well);
    box-shadow:
      inset 0 2px 0 color-mix(in srgb, var(--ink) 45%, transparent),
      inset 0 -2px 0 rgb(255 255 255 / 0.12);
  }
  .cell:hover {
    background: color-mix(in srgb, var(--well) 85%, #fff);
  }
  .cell.sel {
    box-shadow: inset 0 0 0 3px var(--hl);
  }
  .cell.dimmed :global(img) {
    opacity: 0.55;
  }
  .cell.blank {
    cursor: default;
    opacity: 0.55;
  }
  .n,
  .req {
    position: absolute;
    color: #fff;
    text-shadow: 0 1px 0 var(--ink), 1px 0 0 var(--ink), -1px 0 0 var(--ink), 0 -1px 0 var(--ink);
  }
  .n {
    right: 4px;
    bottom: 3px;
  }
  .req {
    left: 3px;
    top: 2px;
    font-size: 9px;
    color: #ffb4b4;
  }

  .detail {
    flex: none;
    max-height: 46%;
    min-height: 120px;
    overflow-y: auto;
    margin-top: 12px;
    padding: 12px 14px 10px;
    background: color-mix(in oklab, var(--c-inset) 45%, var(--face));
    border-top: 3px solid var(--hl);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .dhead {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .dicon {
    width: 64px;
    height: 64px;
    flex: none;
    display: grid;
    place-items: center;
    background: var(--well);
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .dname {
    font-size: 28px;
    line-height: 1;
  }
  .cmp {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 10px;
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }
  .crow {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    align-items: center;
    gap: 8px;
    min-height: 28px;
  }
  .crow img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }
  .cn {
    font-weight: 600;
  }
  .cv {
    text-align: right;
    white-space: nowrap;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  }
  .slotname {
    margin-right: 2px;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 22px;
    padding: 0 8px;
    color: var(--fg);
    background: color-mix(in srgb, var(--ink) 12%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ink) 18%, transparent);
  }
  .tag img {
    width: 14px;
    height: 14px;
    object-fit: contain;
  }
  .tag.bad {
    color: color-mix(in oklab, #d64545 80%, var(--fg));
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex: none;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--ink) 40%, transparent);
  }
  .chip .dot {
    display: inline-block;
    margin-right: 5px;
    vertical-align: -1px;
  }
  .title {
    display: flex;
    gap: 6px;
    align-items: baseline;
    cursor: help;
  }
  .d {
    font-weight: 700;
  }
  .d.up {
    color: color-mix(in oklab, #2f9e44 70%, var(--fg));
  }
  .d.down {
    color: color-mix(in oklab, #d64545 75%, var(--fg));
  }
  .ph {
    font-style: italic;
    opacity: 0.8;
  }
  .acts {
    padding: 2px 0 6px;
  }
  .act {
    height: 34px;
    padding: 0 18px 3px;
  }

  @media (max-width: 900px) {
    .cols {
      display: flex;
      flex-direction: column;
    }
    .you {
      overflow: visible;
    }
    .grid {
      flex: none;
      max-height: 320px;
    }
    .detail {
      max-height: none;
    }
  }
</style>
