<script lang="ts">
  // A character's page, in tabs. Yours: Overview (who you are, level, World Resonance, vitals, what you're
  // doing), Stats (Dawn's Journey style: icon, coloured name, value), Skills (tools on top, then the gathering
  // skills; each will open its own progression page), Fighting (your skills), Images. Other people's: Overview
  // (with a free trip to them), Stats if they fight, Images. Icons are the painted set cut from extras/icons_grok_*.jpg (public/sprites/icons).
  import { G, act } from '../../lib/game.svelte';
  import { asset, content } from '../../content';
  import * as E from '../../engine/actions';
  import { MAX_ENERGY, MAX_SPIRIT, PLAYER_STATS } from '../../engine/rules';
  import type { Stats } from '../../engine/types';
  import { goToPerson } from '../commands';
  import Panel from './Panel.svelte';
  import { ACTIVE_QUEST, PLAYER, WORLD_RESONANCE } from '../placeholders';

  let { who }: { who: string } = $props(); // 'player', or a person's id

  type Tab = 'overview' | 'stats' | 'skills' | 'fighting' | 'images';
  const GATHERING = [
    { name: 'Woodcutting', icon: 'woodcutting', text: 'Trees and driftwood.' },
    { name: 'Mining', icon: 'mining', text: 'Stones, ore and crystal.' },
    { name: 'Herblore', icon: 'herblore', text: 'Herbs found while walking.' },
  ];

  const isPlayer = $derived(who === 'player');
  const npc = $derived(isPlayer ? undefined : content.npcs[who]);
  const art = $derived((isPlayer ? content.player.art : npc?.art) ?? []);
  const portrait = $derived(isPlayer ? content.player.portrait : npc?.portrait);
  const stats = $derived<Stats | undefined>(isPlayer ? { ...PLAYER_STATS } : npc?.stats);

  const tabs = $derived.by((): { id: Tab; label: string }[] => {
    const out: { id: Tab; label: string }[] = [{ id: 'overview', label: 'Overview' }];
    if (stats) out.push({ id: 'stats', label: 'Stats' });
    if (isPlayer) out.push({ id: 'skills', label: 'Skills' }, { id: 'fighting', label: 'Fighting' });
    if (art.length) out.push({ id: 'images', label: `Images · ${art.length}` });
    return out;
  });
  let tab = $state<Tab>('overview');
  let shown = $state(0);
  const main = $derived(art[shown] ?? portrait);
  const thumb = (path: string) => path.replace(/\.webp$/, '.thumb.webp');
  const icon = (id: string) => asset(`sprites/icons/${id}.png`);

  /** "Sylvie's Home · The Plains" */
  function placeName(pointId: string | null | undefined): string {
    const p = pointId ? content.points[pointId] : undefined;
    if (!p) return '';
    const land = E.landOf(content, p.id);
    const zone = land ? content.lands[land].zones.find((z) => z.id === p.zone) : undefined;
    return zone ? `${p.name} · ${zone.name}` : p.name;
  }

  // ---------- your name, editable ----------
  const myName = $derived(G.s.name || PLAYER.name);
  let editing = $state(false);
  let draft = $state('');
  function startEdit() {
    draft = myName;
    editing = true;
  }
  function commit() {
    const n = draft.trim();
    if (n) act((s) => (s.name = n.slice(0, 24)));
    editing = false;
  }
  function onNameKey(e: KeyboardEvent) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      e.stopPropagation();
      editing = false;
    }
  }
  const focusIn = (el: HTMLInputElement) => {
    el.focus();
    el.select();
  };

  /** The stat sheet. Speed feeds a quarter of itself into evasion and precision, and the sheet shows the split. */
  const rows = $derived.by(() => {
    if (!stats) return [];
    const q = stats.spd / 4;
    return [
      { icon: 'health', name: 'Health', colour: '#2f9a5a', value: isPlayer ? `${Math.ceil(G.s.hp)} / ${stats.hp}` : `${stats.hp}`, text: 'Comes back slowly outside a fight, or all at once with a rest.' },
      ...(isPlayer ? [{ icon: 'spirit', name: 'Spirit', colour: '#3a7fc0', value: `${G.s.spirit} / ${MAX_SPIRIT}`, text: 'Built by basic attacks, spent by skills.' }] : []),
      { icon: 'attack', name: 'Attack', colour: '#4c6f99', value: `${stats.atk}`, text: 'Damage dealt by a hit.' },
      { icon: 'defence', name: 'Defence', colour: '#4c6f99', value: `${stats.def}`, text: 'Damage taken off each hit.' },
      { icon: 'speed', name: 'Speed', colour: '#7d6a4f', value: `${stats.spd}`, text: 'A quarter of it adds to evasion and precision.' },
      { icon: 'evasion', name: 'Evasion', colour: '#b8457a', value: `${stats.eva + q}`, note: `${stats.eva} + ${q} from speed`, text: 'Chance to dodge a hit.' },
      { icon: 'precision', name: 'Precision', colour: '#b8457a', value: `${stats.prc + q}`, note: `${stats.prc} + ${q} from speed`, text: 'Cuts into the other side’s evasion.' },
      { icon: 'crit', name: 'Crit rate', colour: '#5b8a4f', value: `${Math.round(stats.crit * 100)}%`, text: 'Chance a hit is critical.' },
      { icon: 'critdmg', name: 'Crit damage', colour: '#5b8a4f', value: `${stats.critDmg}×`, text: 'How much harder a critical hit lands.' },
    ];
  });

  function onkeydown(e: KeyboardEvent) {
    if (tab !== 'images' || !art.length) return;
    if (e.key === 'ArrowRight') shown = (shown + 1) % art.length;
    else if (e.key === 'ArrowLeft') shown = (shown - 1 + art.length) % art.length;
  }
</script>

<svelte:window {onkeydown} />

<Panel title={isPlayer ? 'Profile' : (npc?.name ?? who)} width="min(780px, 94vw)">
  <div class="tabs" role="tablist">
    {#each tabs as t (t.id)}
      <button class="px btn t-inset tab" class:on={tab === t.id} role="tab" aria-selected={tab === t.id} onclick={() => (tab = t.id)}>
        <span class="lbl m">{t.label}</span>
      </button>
    {/each}
  </div>

  {#if tab === 'overview'}
    <div class="page">
      <section class="who">
        {#if portrait}
          <button class="face" onclick={() => art.length && (tab = 'images')} title="See the images" aria-label="See the images">
            <img src={asset(portrait)} alt="" />
          </button>
        {/if}
        <div class="id">
          {#if isPlayer}
            <div class="lbl eyebrow">You</div>
            {#if editing}
              <input class="disp name edit" bind:value={draft} onblur={commit} onkeydown={onNameKey} maxlength="24" use:focusIn aria-label="Your name" />
            {:else}
              <button class="disp name rename" onclick={startEdit} title="Rename">{myName}<span class="pen" aria-hidden="true">✎</span></button>
            {/if}
            <div class="badges">
              <span class="badge px flat t-inset" title="Your level: XP from fights, gathering and quests raises it">
                <img src={icon('level')} alt="" /><span class="lbl m">Level {PLAYER.level}</span>
              </span>
              <span class="badge wr px flat t-inset" title="World Resonance: how attuned you are to the world. Some places and fights need more of it.">
                <img src={icon('resonance')} alt="" /><span class="lbl m">World Resonance</span><b class="lbl m">{WORLD_RESONANCE}</b>
              </span>
            </div>
            <div class="bar xp" title="{PLAYER.xp} of {PLAYER.xpNext} XP to level {PLAYER.level + 1}">
              <span class="lbl">XP</span>
              <span class="track"><b style:width="{(PLAYER.xp / PLAYER.xpNext) * 100}%"></b></span>
              <span class="lbl dim">{PLAYER.xp} / {PLAYER.xpNext}</span>
            </div>
          {:else if npc}
            {#if npc.title}<div class="lbl m eyebrow">{npc.title}</div>{/if}
            <div class="disp name">{npc.name}</div>
            {#if placeName(npc.point)}<div class="lbl dim">Lives at {placeName(npc.point)}</div>{/if}
            {#if npc.text}<p class="body">{npc.text}</p>{/if}
            <div class="go-wrap">
              <button class="px btn bevel t-accent go" onclick={() => goToPerson(who)}>
                <span class="lbl m">Go to {npc.name}</span><span class="cost free">Free</span>
              </button>
            </div>
          {/if}
        </div>
      </section>

      {#if isPlayer}
        <div class="cols">
          <section class="card px flat t-inset">
            <div class="lbl section">Vitals</div>
            <div class="bar"><span class="lbl">HP</span><span class="track"><b class="hp" style:width="{(G.s.hp / PLAYER_STATS.hp) * 100}%"></b></span><span class="lbl dim">{Math.ceil(G.s.hp)} / {PLAYER_STATS.hp}</span></div>
            <div class="bar"><span class="lbl">Spirit</span><span class="track"><b class="sp" style:width="{(G.s.spirit / MAX_SPIRIT) * 100}%"></b></span><span class="lbl dim">{G.s.spirit} / {MAX_SPIRIT}</span></div>
            <div class="bar"><span class="lbl">Energy</span><span class="track"><b class="en" style:width="{(G.s.energy / MAX_ENERGY) * 100}%"></b></span><span class="lbl dim">{G.s.energy} / {MAX_ENERGY}</span></div>
          </section>
          <section class="card px flat t-inset">
            <div class="lbl section">Now</div>
            <div class="body strong">{ACTIVE_QUEST.title}</div>
            <p class="body dim">{ACTIVE_QUEST.objective}</p>
            {#if placeName(G.s.point)}<div class="lbl dim at">At {placeName(G.s.point)} · Day {G.s.day}</div>{/if}
          </section>
        </div>
      {/if}
    </div>
  {:else if tab === 'stats'}
    <div class="list">
      {#each rows as r (r.name)}
        <div class="stat" title={r.text}>
          <img src={icon(r.icon)} alt="" />
          <span class="body sname" style:color={r.colour}>{r.name}</span>
          <span class="lbl m val">{r.value}{#if r.note}<span class="dim"> ({r.note})</span>{/if}</span>
        </div>
      {/each}
    </div>
  {:else if tab === 'skills'}
    <div class="page">
      <section class="card tools px flat t-inset">
        <div class="lbl section">Tools</div>
        <div class="tool">
          <img src={icon('tools')} alt="" />
          <div class="grow">
            <div class="body strong">Axe and pick</div>
            <div class="lbl dim">Better tools open richer nodes: tier 2 and 3 trees, rocks and veins.</div>
          </div>
          <span class="badge px flat t-panel"><span class="lbl m">Tier {G.s.toolTier}</span></span>
        </div>
      </section>
      <section>
        <div class="lbl section">Gathering</div>
        {#each GATHERING as sk (sk.name)}
          <div class="skill">
            <span class="disc"><img src={asset(`sprites/lifeskills/${sk.icon}.png`)} alt="" /></span>
            <div class="grow">
              <div class="top"><span class="body strong">{sk.name}</span><span class="lbl m">Lv 1</span></div>
              <div class="bar slim"><span class="track"><b class="en" style:width="0%"></b></span><span class="lbl dim">0 / 100</span></div>
              <div class="lbl dim">{sk.text}</div>
            </div>
            <span class="more lbl dim" title="Its own page, with what each level unlocks, comes later">›</span>
          </div>
        {/each}
        <p class="lbl dim note">Skill XP isn't built yet. Each skill will open its own page.</p>
      </section>
    </div>
  {:else if tab === 'fighting'}
    <div class="list">
      {#each content.player.skills ?? [] as id, i (id)}
        {@const sk = content.skills[id]}
        {#if sk}
          <div class="skill">
            {#if sk.badge}<img class="sbadge" src={asset(`sprites/skills/${sk.badge}.png`)} alt="" />{:else}<span class="emoji">{sk.icon}</span>{/if}
            <div class="grow">
              <div class="top"><span class="body strong">{sk.name}</span><span class="lbl m">Key {i + 1} · {sk.spirit} Spirit{sk.energy ? ` + ${sk.energy}⚡` : ''}</span></div>
              {#if sk.text}<div class="lbl dim">{sk.text}</div>{/if}
            </div>
            <span class="more lbl dim" title="Its own page comes later">›</span>
          </div>
        {/if}
      {/each}
      <p class="lbl dim note">Basic attacks build Spirit; skills spend it. More skills and their pages come later.</p>
    </div>
  {:else}
    <div class="images">
      <div class="stage">
        {#if main}
          {#key main}<img src={asset(main)} alt="" />{/key}
        {/if}
        {#if art.length > 1}<span class="lbl count">{shown + 1} / {art.length} · ← →</span>{/if}
      </div>
      <div class="gallery">
        {#each art as a, i (a)}
          <button class="th" class:on={i === shown} onclick={() => (shown = i)} aria-label="Image {i + 1}">
            <img src={asset(thumb(a))} alt="" loading="lazy" />
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Panel>

<style>
  /* buttons here carry a bevel and drop shadow: they always get room around them */
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 4px 0 20px;
  }
  .tab {
    padding: 6px 12px 9px;
  }
  .page {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .who {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }
  .face {
    flex: none;
    width: 150px;
    height: 150px;
    padding: 0;
    border: 0;
    cursor: pointer;
    background: var(--well);
    box-shadow: 0 0 0 3px var(--ink);
  }
  .face img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .id {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .eyebrow {
    color: var(--hl);
  }
  .name {
    font-size: 40px;
    line-height: 1;
  }
  .rename {
    align-self: flex-start;
    display: inline-flex;
    align-items: baseline;
    gap: 10px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    cursor: text;
    text-align: left;
  }
  .pen {
    font-size: 18px;
    color: var(--dim);
    opacity: 0;
    transition: opacity 120ms;
  }
  .rename:hover .pen,
  .rename:focus-visible .pen {
    opacity: 1;
  }
  .edit {
    width: 100%;
    max-width: 420px;
    padding: 2px 6px;
    border: 0;
    background: var(--well);
    color: var(--well-fg);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 30px;
    padding: 0 12px 0 8px;
  }
  .badge img,
  .stat img,
  .skill img,
  .tool img {
    object-fit: contain;
  }
  .badge img {
    width: 20px;
    height: 20px;
  }
  .wr b {
    padding: 1px 8px;
    background: var(--hl);
    color: var(--c-panel, #fff);
  }
  .dim {
    color: var(--dim);
  }
  .strong {
    font-weight: 600;
  }
  p {
    margin: 0;
  }
  .go-wrap {
    padding: 4px 0 6px;
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px 11px;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
  }
  .card {
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section {
    color: var(--hl);
    margin: 2px 0 4px;
  }
  .at {
    margin-top: 4px;
  }
  .bar {
    display: grid;
    grid-template-columns: 52px 1fr auto;
    align-items: center;
    gap: 10px;
  }
  .bar.xp {
    max-width: 420px;
    grid-template-columns: 24px 1fr auto;
  }
  .bar.slim {
    grid-template-columns: 1fr auto;
  }
  .track {
    position: relative;
    height: 10px;
    border-radius: 2px;
    overflow: hidden;
    background: color-mix(in oklab, var(--c-inset) 70%, #000);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .slim .track {
    height: 6px;
  }
  .track b {
    position: absolute;
    inset: 0 auto 0 0;
    background: #8fd16a;
  }
  .track b.hp {
    background: #e5484d;
  }
  .track b.sp {
    background: #6cc4ff;
  }
  .track b.en {
    background: var(--energy);
  }
  .list {
    display: flex;
    flex-direction: column;
  }
  .stat {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 8px 2px;
    border-bottom: 2px solid color-mix(in srgb, var(--fg) 12%, transparent);
  }
  .stat img {
    width: 28px;
    height: 28px;
  }
  .sname {
    font-weight: 600;
  }
  .val {
    text-align: right;
  }
  .tool,
  .skill {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .skill {
    padding: 10px 2px;
    border-bottom: 2px solid color-mix(in srgb, var(--fg) 12%, transparent);
  }
  .tool img,
  .skill img {
    flex: none;
    width: 36px;
    height: 36px;
  }
  /* adventure skills: a light glyph on a dark disc; combat skills: their own gold badge */
  .disc {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #4f4339;
    box-shadow: inset 0 0 0 2px #3a3029;
    display: grid;
    place-items: center;
  }
  .skill .disc img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  .skill img.sbadge {
    width: 44px;
    height: 44px;
  }
  .emoji {
    flex: none;
    width: 36px;
    font-size: 28px;
    text-align: center;
  }
  .grow {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .more {
    flex: none;
    font-size: 22px;
    opacity: 0.5;
  }
  .note {
    margin: 10px 0 0;
  }
  .images {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
    height: min(560px, 66vh);
  }
  .stage {
    position: relative;
    min-height: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: var(--well);
    box-shadow:
      inset 0 2px 0 color-mix(in srgb, var(--ink) 45%, transparent),
      inset 0 -2px 0 rgb(255 255 255 / 0.12);
  }
  .stage img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    animation: show 160ms ease-out;
  }
  @keyframes show {
    from {
      opacity: 0.4;
    }
  }
  .count {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 3px 6px;
    color: #fff;
    background: color-mix(in srgb, var(--ink) 70%, transparent);
  }
  .gallery {
    min-height: 0;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    align-content: start;
    gap: 6px;
    padding-right: 4px;
  }
  .th {
    aspect-ratio: 2 / 3;
    padding: 0;
    border: 0;
    overflow: hidden;
    cursor: pointer;
    background: var(--well);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ink) 30%, transparent);
  }
  .th img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
    display: block;
  }
  .th:hover {
    box-shadow: 0 0 0 2px var(--fg);
  }
  .th.on {
    box-shadow: 0 0 0 3px var(--hl);
  }
</style>
