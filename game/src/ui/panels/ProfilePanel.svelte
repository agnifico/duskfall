<script lang="ts">
  // A character's profile: a large image on the left, thumbnails of all their images to flip through
  // (or ← →), and who they are. Yours (C) also lists skills and tools; other people's offer a free trip to them.
  import { G } from '../../lib/game.svelte';
  import { asset, content } from '../../content';
  import * as E from '../../engine/actions';
  import { goToPerson } from '../commands';
  import Panel from './Panel.svelte';
  import { PLAYER } from '../placeholders';

  let { who }: { who: string } = $props(); // 'player', or a person's id

  const SKILLS = ['Woodcutting', 'Mining', 'Herblore'];

  const isPlayer = $derived(who === 'player');
  const npc = $derived(isPlayer ? undefined : content.npcs[who]);
  const art = $derived((isPlayer ? content.player.art : npc?.art) ?? []);
  const portrait = $derived(isPlayer ? content.player.portrait : npc?.portrait);

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

  function onkeydown(e: KeyboardEvent) {
    if (!art.length) return;
    if (e.key === 'ArrowRight') shown = (shown + 1) % art.length;
    else if (e.key === 'ArrowLeft') shown = (shown - 1 + art.length) % art.length;
  }
</script>

<svelte:window {onkeydown} />

<Panel title={isPlayer ? 'Character' : (npc?.name ?? who)} width="min(920px, 94vw)">
  <div class="profile">
    <div class="stage">
      {#if main}
        {#key main}<img src={asset(main)} alt="" />{/key}
      {/if}
      {#if art.length > 1}
        <span class="lbl count">{shown + 1} / {art.length}</span>
      {/if}
    </div>

    <div class="info">
      {#if isPlayer}
        <div class="lbl eyebrow">You</div>
        <div class="disp name">{PLAYER.name}</div>
        <div class="lbl m dim">Level {PLAYER.level} · Day {G.s.day}</div>
      {:else if npc}
        {#if npc.title}<div class="lbl m eyebrow">{npc.title}</div>{/if}
        {#if npc.text}<p class="body">{npc.text}</p>{/if}
        {#if home}<div class="lbl dim">Lives at {home}</div>{/if}
        <div>
          <button class="px btn bevel t-accent go" onclick={() => goToPerson(who)}>
            <span class="lbl m">Go to {npc.name}</span><span class="cost free">Free</span>
          </button>
        </div>
      {/if}

      {#if art.length > 1}
        <div class="lbl section">Images · ← → to flip</div>
        <div class="gallery">
          {#each art as a, i (a)}
            <button class="th" class:on={i === shown} onclick={() => (shown = i)} aria-label="Image {i + 1}">
              <img src={asset(thumb(a))} alt="" loading="lazy" />
            </button>
          {/each}
        </div>
      {/if}

      {#if isPlayer}
        <div class="lbl section">Skills</div>
        {#each SKILLS as s (s)}
          <div class="row"><span class="body">{s}</span><span class="lbl m">Lv 1</span></div>
        {/each}
        <p class="lbl dim note">Skill levels and XP aren't built yet.</p>
        <div class="lbl section">Tools</div>
        <div class="row"><span class="body">Axe and pick</span><span class="lbl m">Tier {G.s.toolTier}</span></div>
      {/if}
    </div>
  </div>
</Panel>

<style>
  .profile {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 20px;
    height: min(580px, 70vh);
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
  .info {
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 6px;
  }
  .eyebrow {
    color: var(--hl);
  }
  .name {
    font-size: 40px;
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
  .section {
    color: var(--hl);
    margin-top: 12px;
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
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
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    border-bottom: 2px solid color-mix(in srgb, var(--fg) 15%, transparent);
  }
  .note {
    margin: 4px 0 0;
  }
</style>
