<script lang="ts">
  // The stat sheet, shared by Profile › Stats and the Inventory page. Health across both columns, then Spirit;
  // then pairs: Physical Attack | Physical Defence, Elemental Attack | Elemental Defence, Crit Rate | Crit Damage,
  // Evasion | Precision; Speed last, alone. Every stat with its icon. `delta` (what wearing something would change)
  // shows beside each value in brackets, coloured: 12 (+2) green, 12 (−1) red. The value itself stays plain.
  import type { Stats } from '../engine/types';
  import { asset } from '../content';

  let {
    stats,
    hp,
    spirit,
    delta = {},
    compact = false,
  }: { stats: Stats; hp?: number; spirit?: { now: number; max: number }; delta?: Partial<Stats>; compact?: boolean } = $props();

  type K = keyof Stats;
  const q = $derived(stats.spd / 4); // a quarter of speed adds to evasion and precision
  const INFO: Record<K, { icon: string; name: string; colour: string; text: string }> = {
    hp: { icon: 'health', name: 'Health', colour: '#2f9a5a', text: 'Comes back slowly outside a fight, or all at once with a rest.' },
    patk: { icon: 'attack', name: 'Physical Attack', colour: '#4c6f99', text: 'Damage of basic attacks and physical skills.' },
    pdef: { icon: 'defence', name: 'Physical Defence', colour: '#4c6f99', text: 'Takes damage off physical hits.' },
    eatk: { icon: 'attack', name: 'Elemental Attack', colour: '#7a5bb8', text: 'Damage of spells and elemental skills.' },
    edef: { icon: 'defence', name: 'Elemental Defence', colour: '#7a5bb8', text: 'Takes damage off elemental hits.' },
    crit: { icon: 'crit', name: 'Crit Rate', colour: '#5b8a4f', text: 'Chance a hit is critical.' },
    critDmg: { icon: 'critdmg', name: 'Crit Damage', colour: '#5b8a4f', text: 'How much harder a critical hit lands.' },
    eva: { icon: 'evasion', name: 'Evasion', colour: '#b8457a', text: 'Chance to dodge a hit.' },
    prc: { icon: 'precision', name: 'Precision', colour: '#b8457a', text: 'Cuts into the other side’s evasion.' },
    spd: { icon: 'speed', name: 'Speed', colour: '#7d6a4f', text: 'A quarter of it adds to evasion and precision.' },
  };
  const PAIRS: K[] = ['patk', 'pdef', 'eatk', 'edef', 'crit', 'critDmg', 'eva', 'prc', 'spd'];

  const fmt = (k: K, v: number) => (k === 'crit' ? `${Math.round(v * 100)}%` : k === 'critDmg' ? `${+v.toFixed(2)}×` : `${+v.toFixed(2)}`);
  const shown = (k: K) => (k === 'eva' || k === 'prc' ? stats[k] + q : stats[k]);
  /** The change, counting speed's share into evasion and precision. */
  function change(k: K): number {
    const d = delta[k] ?? 0;
    return k === 'eva' || k === 'prc' ? d + (delta.spd ?? 0) / 4 : d;
  }
  const sign = (k: K, d: number) => `${d > 0 ? '+' : '−'}${fmt(k, Math.abs(d))}`;
  const icon = (id: string) => asset(`sprites/icons/${id}.png`);
  const note = (k: K) => (k === 'eva' || k === 'prc' ? ` (${stats[k]} + ${q} from speed)` : '');
</script>

{#snippet diff(k: K)}
  {@const d = change(k)}
  {#if d}<span class="lbl d" class:up={d > 0} class:down={d < 0}>({sign(k, d)})</span>{/if}
{/snippet}

<div class="sheet" class:compact>
  <div class="cell wide" title={INFO.hp.text}>
    <img src={icon('health')} alt="" />
    <span class="body nm" style:color={INFO.hp.colour}>Health</span>
    {#if hp !== undefined}
      <span class="track"><b class="hp" style:width="{Math.min(100, (hp / stats.hp) * 100)}%"></b></span>
    {/if}
    <span class="lbl m val">{hp !== undefined ? `${Math.ceil(hp)} / ${stats.hp}` : stats.hp}{@render diff('hp')}</span>
  </div>
  {#if spirit}
    <div class="cell wide" title="Built by basic attacks, spent by skills.">
      <img src={icon('spirit')} alt="" />
      <span class="body nm" style:color="#3a7fc0">Spirit</span>
      <span class="track"><b class="sp" style:width="{(spirit.now / spirit.max) * 100}%"></b></span>
      <span class="lbl m val">{spirit.now} / {spirit.max}</span>
    </div>
  {/if}
  {#each PAIRS as k (k)}
    <div class="cell" title={INFO[k].text + note(k)}>
      <img src={icon(INFO[k].icon)} alt="" />
      <span class="body nm" style:color={INFO[k].colour}>{INFO[k].name}</span>
      <span class="lbl m val">{fmt(k, shown(k))}{@render diff(k)}</span>
    </div>
  {/each}
</div>

<style>
  .sheet {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 18px;
  }
  .cell {
    display: grid;
    grid-template-columns: 26px 1fr auto;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    padding: 4px 2px;
    border-bottom: 2px solid color-mix(in srgb, var(--fg) 12%, transparent);
  }
  .compact .cell {
    min-height: 34px;
    gap: 8px;
  }
  .cell.wide {
    grid-column: 1 / -1;
    grid-template-columns: 26px auto 1fr auto;
  }
  img {
    width: 26px;
    height: 26px;
    object-fit: contain;
  }
  .nm {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .val {
    text-align: right;
    white-space: nowrap;
  }
  .d {
    margin-left: 5px;
    font-weight: 700;
  }
  /* mixed with the text colour, so they read on light and dark themes */
  .d.up {
    color: color-mix(in oklab, #2f9e44 75%, var(--fg));
  }
  .d.down {
    color: color-mix(in oklab, #d64545 80%, var(--fg));
  }
  .track {
    position: relative;
    height: 10px;
    margin: 0 4px;
    border-radius: 2px;
    overflow: hidden;
    background: color-mix(in oklab, var(--c-inset) 70%, #000);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .track b {
    position: absolute;
    inset: 0 auto 0 0;
  }
  .track b.hp {
    background: #e5484d;
  }
  .track b.sp {
    background: #6cc4ff;
  }
  @media (max-width: 520px) {
    .sheet {
      grid-template-columns: 1fr;
    }
  }
</style>
