<script lang="ts">
  // A character's page, in two tabs. Profile: who they are and their stats at the top, then (yours) skills and
  // tools, (other people's) a free trip to them. Images: a large image and thumbnails to flip through (← →).
  // Later this grows inventory and gear; a small version will sit over the field.
  import { G } from '../../lib/game.svelte';
  import { asset, content } from '../../content';
  import * as E from '../../engine/actions';
  import { MAX_ENERGY, MAX_SPIRIT, PLAYER_STATS } from '../../engine/rules';
  import type { Stats } from '../../engine/types';
  import { goToPerson } from '../commands';
  import Panel from './Panel.svelte';
  import { PLAYER } from '../placeholders';

  let { who }: { who: string } = $props(); // 'player', or a person's id

  const SKILLS = ['Woodcutting', 'Mining', 'Herblore'];

  const isPlayer = $derived(who === 'player');
  const npc = $derived(isPlayer ? undefined : content.npcs[who]);
  const art = $derived((isPlayer ? content.player.art : npc?.art) ?? []);
  const portrait = $derived(isPlayer ? content.player.portrait : npc?.portrait);
  const stats = $derived<Stats | undefined>(isPlayer ? { ...PLAYER_STATS } : npc?.stats);

  let tab = $state<'profile' | 'images'>('profile');
  let shown = $state(0);
  const main = $derived(art[shown] ?? portrait);
  const thumb = (path: string) => path.replace(/\.webp$/, '.thumb.webp');

  /** "Sylvie's Home · The Plains" */
  const home = $derived.by(() => {
    const p = npc ? content.points[npc.point] : undefined;
    if (!p) return '';
    const land = E.landOf(content, p.id);
    const zone = land ? content.lands[land].zones.find((z) => z.id === p.zone) : undefined;
    return zone ? `${p.name} · ${zone.name}` : p.name;
  });

  /** The stat sheet. Speed feeds a quarter of itself into evasion and precision, and the sheet shows the split. */
  const rows = $derived.by(() => {
    if (!stats) return [];
    const q = stats.spd / 4;
    const pct = (n: number) => `${Math.round(n * 100)}%`;
    return [
      { name: 'Attack', value: `${stats.atk}` },
      { name: 'Defence', value: `${stats.def}` },
      { name: 'Speed', value: `${stats.spd}` },
      { name: 'Evasion', value: `${stats.eva + q}`, note: `${stats.eva} + ${q} from speed` },
      { name: 'Precision', value: `${stats.prc + q}`, note: `${stats.prc} + ${q} from speed` },
      { name: 'Crit', value: `${pct(stats.crit)} · ${stats.critDmg}×` },
    ];
  });

  function onkeydown(e: KeyboardEvent) {
    if (tab !== 'images' || !art.length) return;
    if (e.key === 'ArrowRight') shown = (shown + 1) % art.length;
    else if (e.key === 'ArrowLeft') shown = (shown - 1 + art.length) % art.length;
  }
</script>

<svelte:window {onkeydown} />

<Panel title={isPlayer ? 'Character' : (npc?.name ?? who)} width="min(760px, 94vw)">
  <div class="tabs" role="tablist">
    <button class="px btn t-inset tab" class:on={tab === 'profile'} role="tab" aria-selected={tab === 'profile'} onclick={() => (tab = 'profile')}>
      <span class="lbl m">Profile</span>
    </button>
    {#if art.length}
      <button class="px btn t-inset tab" class:on={tab === 'images'} role="tab" aria-selected={tab === 'images'} onclick={() => (tab = 'images')}>
        <span class="lbl m">Images · {art.length}</span>
      </button>
    {/if}
  </div>

  {#if tab === 'profile'}
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
            <div class="disp name">{PLAYER.name}</div>
            <div class="lbl m dim">Level {PLAYER.level} · Day {G.s.day}</div>
          {:else if npc}
            {#if npc.title}<div class="lbl m eyebrow">{npc.title}</div>{/if}
            <div class="disp name">{npc.name}</div>
            {#if home}<div class="lbl dim">Lives at {home}</div>{/if}
            {#if npc.text}<p class="body">{npc.text}</p>{/if}
            <div>
              <button class="px btn bevel t-accent go" onclick={() => goToPerson(who)}>
                <span class="lbl m">Go to {npc.name}</span><span class="cost free">Free</span>
              </button>
            </div>
          {/if}
        </div>
      </section>

      <div class="cols">
        <section>
          <div class="lbl section">Stats</div>
          {#if stats}
            {#if isPlayer}
              <div class="row"><span class="body">HP</span><span class="lbl m">{Math.ceil(G.s.hp)} / {stats.hp}</span></div>
              <div class="row"><span class="body">Spirit</span><span class="lbl m">{G.s.spirit} / {MAX_SPIRIT}</span></div>
              <div class="row"><span class="body">Energy</span><span class="lbl m">{G.s.energy} / {MAX_ENERGY}</span></div>
            {:else}
              <div class="row"><span class="body">HP</span><span class="lbl m">{stats.hp}</span></div>
            {/if}
            {#each rows as r (r.name)}
              <div class="row">
                <span class="body">{r.name}</span>
                <span class="lbl m">{r.value}{#if r.note}<span class="dim"> ({r.note})</span>{/if}</span>
              </div>
            {/each}
          {:else}
            <p class="lbl dim note">Doesn't fight yet. Stats come when {npc?.name ?? 'they'} can join the team.</p>
          {/if}
        </section>

        {#if isPlayer}
          <section>
            <div class="lbl section">Skills</div>
            {#each SKILLS as s (s)}
              <div class="row"><span class="body">{s}</span><span class="lbl m">Lv 1</span></div>
            {/each}
            <p class="lbl dim note">Skill levels and XP aren't built yet.</p>
            <div class="lbl section">Fighting</div>
            {#each content.player.skills ?? [] as id, i (id)}
              {@const sk = content.skills[id]}
              {#if sk}
                <div class="row"><span class="body">{sk.icon} {sk.name}</span><span class="lbl m">{i + 1} · {sk.spirit} Spirit</span></div>
              {/if}
            {/each}
            <div class="lbl section">Tools</div>
            <div class="row"><span class="body">Axe and pick</span><span class="lbl m">Tier {G.s.toolTier}</span></div>
          </section>
        {/if}
      </div>
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
  .tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 14px;
  }
  .tab {
    padding: 6px 12px 9px;
  }
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .who {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }
  .face {
    flex: none;
    width: 120px;
    height: 120px;
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
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .eyebrow {
    color: var(--hl);
  }
  .name {
    font-size: 40px;
    line-height: 1;
  }
  .dim {
    color: var(--dim);
  }
  p {
    margin: 0;
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px 11px;
    margin-top: 4px;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 24px;
  }
  .section {
    color: var(--hl);
    margin: 6px 0 4px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 5px 0;
    border-bottom: 2px solid color-mix(in srgb, var(--fg) 15%, transparent);
  }
  .note {
    margin: 6px 0 0;
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
