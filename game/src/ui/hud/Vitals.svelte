<script lang="ts">
  // Bottom centre: HP and Spirit (the things a fight changes), between the weapon in your main hand (left) and
  // your off hand (right). Click a weapon to open the inventory. Energy is in the top bar (EnergyStrip). A food
  // buff that's running sits on top, with its time left. The bars follow the Dawn's Journey combat lab's: a dark
  // rounded label chip, a black-edged track with an inset shadow, the value written on the bar.
  import { G } from '../../lib/game.svelte';
  import { content } from '../../content';
  import { MAX_SPIRIT } from '../../engine/rules';
  import { maxHp } from '../../engine/progress';
  import { statLines } from '../statText';
  import { openScreen } from '../commands';
  import ItemIcon from '../ItemIcon.svelte';

  const max = $derived(maxHp(G.s, content));
  const hp = $derived(G.s.hp / max);
  const sp = $derived((G.s.spirit ?? 0) / MAX_SPIRIT);
  const main = $derived(G.s.worn?.main ?? null);
  const off = $derived(G.s.worn?.off ?? null);
  const twoHanded = $derived(!!(main && content.items[main]?.twoHanded));
  const buffs = $derived((G.s.buffs ?? []).filter((b) => b.until > G.now));
  const left = (until: number) => {
    const sec = Math.max(0, Math.round((until - G.now) / 1000));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  };
</script>

<div class="vitals px flat t-panel">
  {#each buffs as b (b.item)}
    <div class="buff" title="{content.items[b.item]?.name}: {statLines(b.stats).join(', ')}">
      <ItemIcon id={b.item} size={18} />
      <span class="lbl">{statLines(b.stats).join(', ')}</span>
      <span class="lbl dim">{left(b.until)}</span>
    </div>
  {/each}
  <div class="body-row">
    <button class="hand px flat t-inset" onclick={() => openScreen('inventory')} title={main ? `Main hand: ${content.items[main]?.name}` : 'Main hand: empty (fists)'}>
      {#if main}<ItemIcon id={main} size={34} />{:else}<span class="lbl dim">Fists</span>{/if}
    </button>

    <div class="bars">
      <div class="row" title="Health: comes back 1 every 9 s outside a fight, or all at once at a fire or a bed">
        <span class="chip hp">HP</span>
        <div class="track">
          <div class="fill hp" class:low={hp < 0.3} style:width="{Math.max(0, hp) * 100}%"></div>
          <span class="num">{Math.ceil(G.s.hp)}/{max}</span>
        </div>
      </div>
      <div class="row thin" title="Spirit: basic attacks build it, skills spend it">
        <span class="chip sp">SP</span>
        <div class="track">
          <div class="fill sp" style:width="{sp * 100}%"></div>
          <span class="num">{G.s.spirit ?? 0}/{MAX_SPIRIT}</span>
        </div>
      </div>
    </div>

    <button
      class="hand px flat t-inset"
      class:locked={twoHanded}
      onclick={() => openScreen('inventory')}
      title={off ? `Off hand: ${content.items[off]?.name}` : twoHanded ? 'Off hand: your main weapon takes both hands' : 'Off hand: empty'}
    >
      {#if off}<ItemIcon id={off} size={34} />{:else if twoHanded}<span class="lbl dim">Both</span>{:else}<span class="lbl dim">—</span>{/if}
    </button>
  </div>
</div>

<style>
  .vitals {
    position: absolute;
    left: 50%;
    bottom: 14px;
    translate: -50% 0;
    width: min(400px, 44vw);
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .body-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .hand {
    flex: none;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    cursor: pointer;
  }
  .hand.locked {
    opacity: 0.6;
  }
  .bars {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .buff {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-bottom: 4px;
    border-bottom: 2px solid color-mix(in srgb, var(--ink) 15%, transparent);
  }
  .buff .lbl:nth-of-type(1) {
    flex: 1;
    color: color-mix(in oklab, #8fd16a 70%, var(--fg));
  }
  .dim {
    color: var(--dim);
  }

  /* the bars: from the Dawn's Journey combat lab (HPBar.svelte) */
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .chip {
    flex: none;
    min-width: 26px;
    text-align: center;
    padding: 4px 5px;
    border-radius: 4px;
    background: #000000cc;
    font-family: 'Chakra Petch', sans-serif;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.06em;
  }
  .chip.hp {
    color: #ff9696;
  }
  .chip.sp {
    color: #8fd3ff;
  }
  .row.thin .chip {
    padding: 2px 5px;
    font-size: 10px;
  }
  .track {
    position: relative;
    flex: 1;
    height: 18px;
    border-radius: 6px;
    border: 2px solid #000;
    background: color-mix(in oklab, var(--c-inset) 55%, #000);
    box-shadow: #00000056 0 -2px 0 0 inset;
    overflow: hidden;
  }
  .row.thin .track {
    height: 12px;
    border-width: 1.5px;
    border-radius: 5px;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 4px;
    transition: width 0.35s ease-in-out;
    box-shadow:
      #00000056 0 -2px 0 0 inset,
      hsla(0, 0%, 0%, 0.2) -2px 0 2px 0 inset,
      hsla(0, 0%, 0%, 0.4) 2px 0 3px 0;
  }
  .fill.hp {
    background: linear-gradient(to bottom, #f07070, #e04848);
  }
  .fill.hp.low {
    background: linear-gradient(to bottom, #ff9a5a, #e8663a);
  }
  .fill.sp {
    background: linear-gradient(to bottom, #7fd0ff, #4aa8e8);
  }
  .num {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Chakra Petch', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    text-shadow:
      0 1px 2px #000,
      1px 0 2px #000;
    pointer-events: none;
  }
  .row.thin .num {
    font-size: 9px;
  }
</style>
