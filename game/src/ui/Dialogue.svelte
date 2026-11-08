<script lang="ts">
  // Story mode: a story beat waiting in G.s.beats takes the screen. The HUD hides, black bars close in at the top
  // and bottom, and the lines play in a box with the speaker's portrait. Click, Space or Enter goes on. Steps can
  // ask for your name (the name list) or a choice; a choice's effects apply when you pick it, the beat's own
  // effects when it ends (engine/story.ts › finishBeat). A picture step fills the screen behind the box.
  import { fly, fade } from 'svelte/transition';
  import { G, act } from '../lib/game.svelte';
  import { asset, content } from '../content';
  import { applyEffects, finishBeat } from '../engine/story';
  import { PLAYER } from './placeholders';

  const beat = $derived(G.s.beats[0]);
  let i = $state(0);
  let key = $state('');
  $effect(() => {
    const k = beat ? `${beat.quest}.${beat.stage}.${G.s.beats.length}` : '';
    if (k !== key) {
      key = k;
      i = 0;
    }
  });
  const step = $derived(beat?.lines[i]);
  /** The picture behind this step: the last image step at or before it (null clears it). */
  const image = $derived.by(() => {
    if (!beat) return null;
    for (let k = i; k >= 0; k--) {
      const l = beat.lines[k];
      if (typeof l === 'object' && 'image' in l) return l.image;
    }
    return null;
  });
  const isPicture = (l: unknown): l is { image: string | null; text?: string } => typeof l === 'object' && l !== null && 'image' in l;
  /** Steps you click through: lines and pictures (not the name list or a choice). */
  const clickable = $derived(typeof step === 'string' || isPicture(step));
  const NAMES = content.player.names ?? [PLAYER.name];
  const myName = $derived(G.s.name || NAMES[0]);

  /** "sylvie: text" → Sylvie speaks; "you: text" → you; anything else is narration. */
  const line = $derived.by(() => {
    const raw = isPicture(step) ? step.text : step; // a picture's caption can be spoken too ("sylvie: …")
    if (typeof raw !== 'string') return null;
    const m = raw.match(/^([a-z][a-z0-9-]*): (.*)$/s);
    const who = m && (m[1] === 'you' || content.npcs[m[1]]) ? m[1] : null;
    const text = (who ? m![2] : raw).replaceAll('{name}', myName);
    if (who === 'you') return { name: myName, portrait: content.player.portrait, text, you: true };
    if (who) return { name: content.npcs[who].name, portrait: content.npcs[who].portrait, text, you: false };
    return { name: '', portrait: undefined, text, you: false };
  });

  function next() {
    if (!beat) return;
    if (i + 1 < beat.lines.length) i += 1;
    else act((s) => finishBeat(s, content));
  }
  function pickName(n: string) {
    act((s) => {
      s.name = n;
      s.tags.named = true; // the name list on the Profile opens from here on
    });
    next();
  }
  function choose(k: number) {
    if (typeof step !== 'object' || !('choose' in step)) return;
    const then = step.choose[k].then;
    act((s) => applyEffects(s, content, then));
    next();
  }
  function onkeydown(e: KeyboardEvent) {
    if (!beat || !clickable) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      next();
    }
  }
</script>

<svelte:window {onkeydown} />

{#if beat && step !== undefined}
  <div class="story" transition:fade={{ duration: 200 }}>
    {#if image !== null}
      <div class="scene" transition:fade={{ duration: 500 }}>
        {#key image}
          <img src={asset(image)} alt="" transition:fade={{ duration: 700 }} onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')} />
        {/key}
      </div>
    {/if}
    <div class="bar top" transition:fly={{ y: -80, duration: 280 }}></div>
    <div class="bar bottom" transition:fly={{ y: 80, duration: 280 }}></div>

    <button class="catch" onclick={() => clickable && next()} aria-label="Go on" tabindex="-1"></button>

    {#if !isPicture(step) || line}
    <div class="box px bevel t-panel" class:narration={line && !line.name} class:you={line?.you}>
      {#if line?.portrait}
        <div class="face"><img src={asset(line.portrait)} alt="" /></div>
      {/if}
      <div class="talk">
        {#if line}
          {#if line.name}<div class="disp who">{line.name}</div>{/if}
          {#key i}<p class="body text" in:fade={{ duration: 140 }}>{line.text}</p>{/key}
          <div class="lbl dim more">{i + 1 < beat.lines.length ? 'Click or Space ›' : 'Click or Space to finish ›'}</div>
        {:else if typeof step === 'object' && 'name' in step}
          <div class="disp who">Your name</div>
          <p class="body text">Every name here means dawn, or morning. You can change it later, on your profile.</p>
          <div class="opts">
            {#each NAMES as n (n)}
              <button class="px btn bevel t-inset opt" class:on={n === myName} onclick={() => pickName(n)}><span class="lbl m">{n}</span></button>
            {/each}
          </div>
        {:else if typeof step === 'object' && 'choose' in step}
          <div class="opts">
            {#each step.choose as ch, k (k)}
              <button class="px btn bevel t-accent opt" onclick={() => choose(k)}><span class="lbl m">{ch.text}</span></button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    {/if}
  </div>
{/if}

<style>
  .story {
    position: absolute;
    inset: 0;
    z-index: 30;
  }
  /* a picture step: fills the screen behind the box, drifting slowly closer. Until its file exists, the
     dark ground shows instead */
  .scene {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: radial-gradient(ellipse at 50% 40%, #1d2a3a, #07090d 75%);
  }
  .scene img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    animation: drift 14s ease-out both;
  }
  @keyframes drift {
    from {
      scale: 1;
    }
    to {
      scale: 1.08;
    }
  }
  .catch {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }
  /* letterbox: the film-style bars */
  .bar {
    position: absolute;
    left: 0;
    right: 0;
    height: 9vh;
    background: #0b0907;
    pointer-events: none;
  }
  .bar.top {
    top: 0;
  }
  .bar.bottom {
    bottom: 0;
  }
  .box {
    position: absolute;
    left: 50%;
    bottom: calc(9vh + 18px);
    translate: -50% 0;
    width: min(860px, calc(100vw - 32px));
    min-height: 150px;
    display: flex;
    gap: 18px;
    padding: 16px 20px 18px;
  }
  /* the .px surface paints from --face/--fg, so narration sets those (a plain background never showed) */
  .box.narration {
    --face: color-mix(in srgb, #0b0907 86%, transparent);
    --fg: #f1e6cf;
  }
  .face {
    flex: none;
    width: 118px;
    height: 118px;
    overflow: hidden;
    background: var(--well);
    box-shadow: 0 0 0 3px var(--ink);
  }
  .face img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
    display: block;
  }
  .you .face {
    order: 2;
  }
  .talk {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .who {
    font-size: 28px;
    line-height: 1;
    color: var(--hl);
  }
  .text {
    margin: 0;
    font-size: 17px;
    line-height: 1.5;
  }
  .narration .text {
    font-style: italic;
  }
  .more {
    margin-top: auto;
    align-self: flex-end;
    color: var(--dim);
  }
  .narration .more {
    color: #b7a98d;
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 6px 0 4px;
  }
  .opt {
    padding: 7px 14px 10px;
  }
  @media (max-width: 600px) {
    .face {
      width: 72px;
      height: 72px;
    }
  }
</style>
