<script lang="ts">
  // What's around the hex field, in the theme's colours.
  //   sky: the field floats; clouds drift past below it.
  //   sea: open water around a coast, with moving light on it, a few glints, and cloud shadows passing over.
  // Everything moves with transforms only, so the browser doesn't repaint the screen to animate it.
  let { kind = 'sky' }: { kind?: 'sky' | 'sea' } = $props();

  // top (% of the screen), size (scale), seconds to cross, start offset (negative: already on its way), opacity
  const CLOUDS = [
    { top: 6, size: 1.3, dur: 150, delay: -20, op: 0.9 },
    { top: 20, size: 0.8, dur: 115, delay: -80, op: 0.75 },
    { top: 36, size: 1.6, dur: 175, delay: -125, op: 0.6 },
    { top: 54, size: 1.0, dur: 130, delay: -45, op: 0.8 },
    { top: 68, size: 1.45, dur: 165, delay: -100, op: 0.55 },
    { top: 84, size: 0.9, dur: 125, delay: -10, op: 0.7 },
  ];
  // glints on the water: left %, top %, delay s
  const GLINTS = [
    [12, 18, 0], [28, 72, 1.3], [44, 10, 2.1], [61, 86, 0.7], [77, 30, 1.8], [88, 64, 0.4], [6, 52, 2.6], [52, 46, 3.1],
  ];
</script>

<div class="backdrop {kind}" aria-hidden="true">
  {#if kind === 'sea'}
    <div class="waves a"></div>
    <div class="waves b"></div>
    {#each GLINTS as [x, y, d], i (i)}<i class="glint" style:left="{x}%" style:top="{y}%" style:animation-delay="{d}s"></i>{/each}
    {#each CLOUDS.slice(0, 4) as c, i (i)}
      <div class="cloud shadow" style:top="{c.top + 6}%" style:--size={c.size * 2} style:--dur="{c.dur * 1.3}s" style:--delay="{c.delay}s"></div>
    {/each}
  {:else}
    {#each CLOUDS as c, i (i)}
      <div class="cloud" style:top="{c.top}%" style:--size={c.size} style:--dur="{c.dur}s" style:--delay="{c.delay}s" style:opacity={c.op}></div>
    {/each}
  {/if}
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .sky {
    background: linear-gradient(to bottom, var(--sky-1), var(--sky-2));
  }
  .sea {
    background: radial-gradient(ellipse at 50% 38%, var(--sea-1), var(--sea-2) 85%);
  }

  /* a cloud: a long rounded body with two puffs on top */
  .cloud {
    position: absolute;
    left: 0;
    width: calc(190px * var(--size));
    height: calc(52px * var(--size));
    background: var(--cloud);
    border-radius: 999px;
    animation: drift var(--dur) linear var(--delay) infinite;
    will-change: transform;
  }
  .cloud::before,
  .cloud::after {
    content: '';
    position: absolute;
    background: inherit;
    border-radius: 50%;
  }
  .cloud::before {
    width: 46%;
    height: 125%;
    left: 14%;
    bottom: 32%;
  }
  .cloud::after {
    width: 34%;
    height: 95%;
    left: 50%;
    bottom: 38%;
  }
  .cloud.shadow {
    background: var(--cloud-shadow);
    filter: blur(22px);
  }
  @keyframes drift {
    from {
      transform: translateX(-110%);
    }
    to {
      transform: translateX(calc(100vw + 10%));
    }
  }

  /* moving light on the water: two sets of faint stripes sliding at different angles and speeds.
     Each slides exactly one stripe spacing along its own direction, so the loop has no seam. */
  .waves {
    position: absolute;
    inset: -60px;
  }
  .waves.a {
    background-image: repeating-linear-gradient(165deg, transparent 0, rgb(255 255 255 / 0.07) 5px, transparent 11px, transparent 46px);
    animation: wave-a 14s linear infinite;
  }
  .waves.b {
    background-image: repeating-linear-gradient(20deg, transparent 0, rgb(255 255 255 / 0.035) 4px, transparent 9px, transparent 38px);
    animation: wave-b 21s linear infinite;
  }
  @keyframes wave-a {
    to {
      transform: translate(calc(46px * 0.2588), calc(46px * 0.9659));
    }
  }
  @keyframes wave-b {
    to {
      transform: translate(calc(38px * 0.342), calc(38px * -0.9397));
    }
  }
  .glint {
    position: absolute;
    width: 6px;
    height: 2px;
    background: rgb(255 255 255 / 0.85);
    box-shadow: 0 0 0 1px rgb(255 255 255 / 0.25);
    animation: glint 3.6s steps(4) infinite;
    opacity: 0;
  }
  @keyframes glint {
    30%,
    45% {
      opacity: 1;
    }
    70% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cloud,
    .waves,
    .glint {
      animation: none;
    }
  }
</style>
