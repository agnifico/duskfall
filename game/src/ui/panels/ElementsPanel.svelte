<script lang="ts">
  // The Elements panel (L): your element, choosing it (first at Heidi's Gift, then free once a week), the element
  // you defend as, the chart, and how it all works. Opens by itself the first time you can choose.
  // Rules: engine/elements.ts. Design: design/ELEMENTS.md.
  import Panel from './Panel.svelte';
  import { DEV, G, act } from '../../lib/game.svelte';
  import { UI } from '../../lib/ui.svelte';
  import { content } from '../../content';
  import { ELEMENTS, STRONG, WEAK, attune, attuneBlocked, elementMult, isElement, passives, type Element } from '../../engine/elements';
  import { ELEMENT_COLOUR, ELEMENT_INFO, elName, markOf, matchupLine } from '../elementInfo';

  const mine = $derived(isElement(G.s.element) ? G.s.element : null);
  const sets = $derived(passives(G.s, content));
  const blocked = $derived(attuneBlocked(G.s, G.now, DEV.on || UI.bench));
  let picking = $state<Element | null>(null);
  let changing = $state(false);
  const choosing = $derived(!mine || changing);

  function choose(e: Element) {
    act((s) => attune(s, e, Date.now()));
    picking = null;
    changing = false;
  }
</script>

<Panel title="Elements" width="min(680px, 94vw)">
  {#if mine && !changing}
    <section class="mine px flat t-inset" style:--el={ELEMENT_COLOUR[mine]}>
      <div class="big"><i class="orb"></i><span class="disp">{ELEMENT_INFO[mine].name}</span></div>
      <p class="body">{ELEMENT_INFO[mine].style}</p>
      <p class="lbl m dim">{matchupLine(mine)}</p>
      <div class="row">
        <button class="px btn t-inset small" disabled={!!blocked} onclick={() => (changing = true)} title={blocked ?? 'Choose another element. Free once a week.'}>
          <span class="lbl m">Re-attune</span>
        </button>
        {#if blocked}<span class="lbl dim">{blocked}</span>{/if}
      </div>
    </section>
  {/if}

  {#if choosing}
    <div class="lbl section">{mine ? 'Re-attune: choose again' : 'Choose your element'}</div>
    {#if blocked}
      <p class="body dim">{blocked}.</p>
    {:else}
      <p class="body dim">It's yours, not your gear's: your elemental hits carry it, and it decides how enemies' blows land on you. You can change it for free once a week.</p>
      <div class="grid">
        {#each ELEMENTS as e (e)}
          <button class="card px btn t-inset" class:sel={picking === e} style:--el={ELEMENT_COLOUR[e]} onclick={() => (picking = e)}>
            <span class="top"><i class="orb"></i><span class="disp nm">{ELEMENT_INFO[e].name}</span></span>
            <span class="body st">{ELEMENT_INFO[e].style}</span>
            <span class="lbl dim mu">{matchupLine(e)}</span>
          </button>
        {/each}
      </div>
      <div class="row">
        <button class="px btn t-accent" disabled={!picking} onclick={() => picking && choose(picking)}>
          <span class="lbl m">{picking ? `Become ${ELEMENT_INFO[picking].name}` : 'Pick one'}</span>
        </button>
        {#if mine}<button class="px btn t-inset" onclick={() => ((changing = false), (picking = null))}><span class="lbl m">Keep {ELEMENT_INFO[mine].name}</span></button>{/if}
      </div>
    {/if}
  {/if}

  {#if sets.size}
    <p class="body">Full sets on: {#each [...sets] as e (e)}<b style:color={ELEMENT_COLOUR[e]}>{elName(e)}</b> ({ELEMENT_INFO[e].set}) {/each}</p>
  {/if}

  <div class="lbl section">The chart · attacker down, defender across</div>
  <div class="chartwrap">
    <table class="chart">
      <thead><tr><th></th>{#each ELEMENTS as d (d)}<th style:color={ELEMENT_COLOUR[d]}>{ELEMENT_INFO[d].name}</th>{/each}</tr></thead>
      <tbody>
        {#each ELEMENTS as a (a)}
          <tr>
            <th style:color={ELEMENT_COLOUR[a]}>{ELEMENT_INFO[a].name}</th>
            {#each ELEMENTS as d (d)}
              {@const m = elementMult(a, d)}
              <td class:up={m > 1} class:down={m < 1}>{m === 1 ? '·' : `${markOf(m)} ×${m}`}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <details class="how">
    <summary class="lbl m">How elements work</summary>
    <ul class="body">
      <li><b>The loop:</b> Water beats Fire, Fire beats Earth, Earth beats Air, Air beats Water. Light and Dark beat each other. Strong is ×{STRONG}, weak is ×{WEAK}.</li>
      <li><b>Fire, Water and Earth resist themselves</b> (×{WEAK}). Air, Light and Dark don't.</li>
      <li><b>Your element is yours, not your gear's.</b> You attack and defend as it: it scales your elemental damage (spells, and the extra hit Heidi's infusion adds to basic attacks), and enemies' blows carry their element against yours. Plain physical blows of yours carry none.</li>
      <li><b>Some enemies have two elements.</b> A matchup with them is the average of the two.</li>
      <li><b>Gear is only themed.</b> A fire sword doesn't make you fire; later it will strengthen fire skills.</li>
      <li><b>A full elemental set</b> (five pieces) adds its effect, for a player of its element: {#each ELEMENTS.slice(0, 4) as e (e)}{ELEMENT_INFO[e].name}: {ELEMENT_INFO[e].set} {/each}</li>
      <li><b>Re-attuning</b> is free once a week. Later it will also mean rebuilding your skill tree, so you won't do it every fight.</li>
      <li><b>Coming:</b> alignments within each element (Fire: Blaze or Lightning; Water: Flowing or Frost; Earth: Terra, Flora or Fauna; Light and Dark meet in Dusk; Air has none), and <b>mastery</b>: it grows as you fight in an element, stays when you re-attune, and gives small perks you keep in every element.</li>
    </ul>
  </details>

  <div class="lbl section">Mastery</div>
  <p class="body dim">Not counting yet. It will grow with the elemental damage you deal in each element.</p>
</Panel>

<style>
  .section {
    margin: 14px 0 8px;
    color: var(--dim);
  }
  .mine {
    padding: 12px 14px;
    box-shadow: inset 4px 0 0 var(--el);
  }
  .big {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 26px;
  }
  .orb {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--el);
    box-shadow: 0 0 10px var(--el);
    flex: none;
  }
  .row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 10px;
  }
  .small {
    padding: 4px 10px 6px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 8px;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 10px 12px;
    text-align: left;
    box-shadow: inset 3px 0 0 var(--el);
  }
  .card.sel {
    outline: 3px solid var(--el);
    outline-offset: 1px;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .nm {
    font-size: 20px;
  }
  .st {
    font-size: 13px;
  }
  .mu {
    font-size: 11px;
  }
  .chartwrap {
    overflow-x: auto;
  }
  .chart {
    border-collapse: collapse;
    font-size: 12px;
  }
  .chart th,
  .chart td {
    padding: 4px 8px;
    text-align: center;
    white-space: nowrap;
  }
  .chart tbody th {
    text-align: right;
  }
  .chart td.up {
    color: color-mix(in oklab, #2f9e44 75%, var(--fg));
    font-weight: 700;
  }
  .chart td.down {
    color: color-mix(in oklab, #d64545 75%, var(--fg));
  }
  .how {
    margin-top: 14px;
  }
  .how summary {
    cursor: pointer;
  }
  .how ul {
    margin: 8px 0 0;
    padding-left: 18px;
    font-size: 13px;
    line-height: 1.45;
  }
  .how li {
    margin-bottom: 4px;
  }
</style>
