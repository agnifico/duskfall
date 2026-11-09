<script lang="ts">
  // The test bench's controls, top left, while the bench player is swapped in (lib/bench.svelte.ts):
  // your level, a full kit for it, refills, and enemies of any kind at any level.
  import { G } from '../../lib/game.svelte';
  import { combatLevel } from '../../engine/progress';
  import { LEVEL_CAP } from '../../engine/rules';
  import { clearFoes, foeKinds, kit, refill, resetBench, setLevel, spawn, type Kit } from '../../lib/bench.svelte';
  import { toggleDevField } from '../commands';

  const kinds = foeKinds();
  const lv = $derived(combatLevel(G.s));
  let foe = $state(kinds[0]?.id ?? '');
  let foeLv = $state<number | null>(null); // null: your level
  let n = $state(1);
  let sure = $state(false); // reset asks twice
  const KITS: Kit[] = ['sword', 'bow', 'staff'];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
</script>

<div class="bench px bevel t-panel">
  <div class="head">
    <span class="lbl m title">Test bench</span>
    <button class="px btn t-inset small" onclick={toggleDevField} title="Back to your game (`)"><span class="lbl">Leave</span></button>
  </div>

  <div class="row">
    <span class="lbl dim k">Level</span>
    <button class="px btn t-inset small" onclick={() => setLevel(lv - 5)}>−5</button>
    <button class="px btn t-inset small" onclick={() => setLevel(lv - 1)}>−</button>
    <span class="lbl l val">{lv}</span>
    <button class="px btn t-inset small" onclick={() => setLevel(lv + 1)}>+</button>
    <button class="px btn t-inset small" onclick={() => setLevel(lv + 5)}>+5</button>
    <span class="lbl dim">/ {LEVEL_CAP}</span>
  </div>

  <div class="row">
    <span class="lbl dim k">Kit</span>
    {#each KITS as k (k)}
      <button class="px btn t-inset small" onclick={() => kit(k)} title="Best armour and {k} for level {lv}"><span class="lbl">{cap(k)}</span></button>
    {/each}
    <button class="px btn t-inset small" onclick={refill} title="Health, Spirit and energy full"><span class="lbl">Refill</span></button>
  </div>

  <div class="row">
    <span class="lbl dim k">Enemy</span>
    <select class="px t-inset sel" bind:value={foe}>
      {#each kinds as k (k.id)}<option value={k.id}>Lv {k.level} · {k.name}</option>{/each}
    </select>
  </div>
  <div class="row">
    <span class="lbl dim k"></span>
    <span class="lbl dim">at Lv</span>
    <input class="px t-inset num" type="number" min="1" max={LEVEL_CAP} placeholder={String(lv)} bind:value={foeLv} />
    <span class="lbl dim">×</span>
    {#each [1, 2, 3] as x (x)}
      <button class="px btn small" class:t-accent={n === x} class:t-inset={n !== x} onclick={() => (n = x)}>{x}</button>
    {/each}
  </div>
  <div class="row">
    <span class="lbl dim k"></span>
    <button class="px btn t-accent small" onclick={() => spawn(foe, foeLv ?? lv, n)}><span class="lbl">Spawn</span></button>
    <button class="px btn t-inset small" onclick={clearFoes}><span class="lbl">Clear</span></button>
    <button class="px btn t-inset small reset" onclick={() => (sure ? (resetBench(), (sure = false)) : (sure = true))} onmouseleave={() => (sure = false)}>
      <span class="lbl">{sure ? 'Sure? Reset' : 'Reset bench'}</span>
    </button>
  </div>
</div>

<style>
  .bench {
    position: absolute;
    left: 14px;
    top: 112px;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px 10px;
    max-width: calc(100vw - 28px);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .title {
    color: var(--hl);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .k {
    width: 44px;
  }
  .val {
    min-width: 26px;
    text-align: center;
  }
  .small {
    padding: 3px 8px 5px;
    min-width: 26px;
  }
  .sel {
    flex: 1;
    min-width: 0;
    max-width: 230px;
    padding: 4px 6px;
    font: inherit;
    color: var(--fg);
  }
  .num {
    width: 54px;
    padding: 4px 6px;
    font: inherit;
    color: var(--fg);
  }
  .reset {
    margin-left: auto;
  }
</style>
