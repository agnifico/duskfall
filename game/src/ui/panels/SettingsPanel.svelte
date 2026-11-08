<script lang="ts">
  // Settings: the colour theme, dev mode (and the dev tools it shows), new game, the rules.
  import { DEV, G, act, restart, setDev } from '../../lib/game.svelte';
  import * as E from '../../engine/actions';
  import { content } from '../../content';
  import { COST } from '../../engine/rules';
  import Panel from './Panel.svelte';
  import { THEMES } from '../themes';
  import { toggleEditor, travelTo } from '../commands';

  /** Dev: one of every gear piece into the bag, to try them on. */
  function giveMaterials() {
    act((s) => {
      for (const [id, it] of Object.entries(content.items)) if (!it.slot && !it.use && !it.currency) s.bag[id] = (s.bag[id] ?? 0) + 10;
    });
  }
  function giveSupplies() {
    act((s) => {
      for (const [id, it] of Object.entries(content.items)) if (it.use) s.bag[id] = (s.bag[id] ?? 0) + 5;
    });
  }
  function giveGear() {
    act((s) => {
      for (const [id, it] of Object.entries(content.items)) if (it.slot) s.bag[id] = (s.bag[id] ?? 0) + 1;
    });
  }

  function newGame() {
    if (confirm('Start a new game? This save is wiped.')) restart();
  }
</script>

<Panel title="Settings">
  <div class="lbl eyebrow">Colour theme · T cycles</div>
  <div class="seg themes">
    {#each THEMES as t (t.id)}
      <button class="px btn t-inset pick" class:on={DEV.theme === t.id} onclick={() => setDev({ theme: t.id })}>
        <span class="lbl m">{t.name}</span>
      </button>
    {/each}
  </div>

  <div class="row">
    <span class="lbl m">Dev mode</span>
    <button class="px btn t-inset pick toggle" class:on={DEV.on} aria-pressed={DEV.on} onclick={() => setDev({ on: !DEV.on })}>
      <span class="lbl m">{DEV.on ? 'On' : 'Off'}</span>
    </button>
  </div>

  {#if DEV.on}
    <div class="dev">
      <div class="row">
        <span class="lbl m">Unlimited energy</span>
        <button
          class="px btn t-inset pick toggle"
          class:on={DEV.freeEnergy}
          aria-pressed={DEV.freeEnergy}
          onclick={() => setDev({ freeEnergy: !DEV.freeEnergy })}
        >
          <span class="lbl m">{DEV.freeEnergy ? 'On' : 'Off'}</span>
        </button>
      </div>

      <div class="row">
        <span class="lbl m">Damage formula</span>
        <div class="seg">
          {#each [['dj', "DJ's"], ['ratio', 'Ratio']] as [id, name] (id)}
            <button class="px btn t-inset pick" class:on={DEV.damage === id} onclick={() => setDev({ damage: id as 'dj' | 'ratio' })}><span class="lbl m">{name}</span></button>
          {/each}
        </div>
      </div>

      <div class="row">
        <span class="lbl m">Chip damage</span>
        <div class="seg">
          {#each [0, 2, 4] as n (n)}
            <button class="px btn t-inset pick" class:on={DEV.chip === n} onclick={() => setDev({ chip: n })}><span class="lbl m">{n}</span></button>
          {/each}
        </div>
      </div>


      <div class="row">
        <span class="lbl m">Dev field</span>
        <button class="px btn bevel t-panel wide" onclick={() => travelTo('dev-field')}><span class="lbl m">Go</span></button>
      </div>

      <div class="row">
        <span class="lbl m">Gear</span>
        <button class="px btn bevel t-panel wide" onclick={giveGear}><span class="lbl m">Give one of each</span></button>
      </div>
      <div class="row">
        <span class="lbl m">Food and potions</span>
        <button class="px btn bevel t-panel wide" onclick={giveSupplies}><span class="lbl m">Give five of each</span></button>
      </div>
      <div class="row">
        <span class="lbl m">Materials</span>
        <button class="px btn bevel t-panel wide" onclick={giveMaterials}><span class="lbl m">Give ten of each</span></button>
      </div>

      <div class="row">
        <span class="lbl m">Map editor · E</span>
        <button class="px btn bevel t-panel wide" disabled={!G.s.point} onclick={toggleEditor}><span class="lbl m">Edit this point</span></button>
      </div>

      <div class="row">
        <span class="lbl m">Ground</span>
        <div class="seg">
          {#each [['flat', 'Flat'], ['detail', 'Detailed']] as [id, name] (id)}
            <button class="px btn t-inset pick" class:on={DEV.ground === id} onclick={() => setDev({ ground: id as 'flat' | 'detail' })}><span class="lbl m">{name}</span></button>
          {/each}
        </div>
      </div>


      <div class="row">
        <span class="lbl m">Day {G.s.day}</span>
        <button class="px btn bevel t-panel wide" onclick={() => act((s) => E.nextDay(s, content, G.now))}><span class="lbl m">Next day</span></button>
      </div>
    </div>
  {/if}

  <div class="row buttons">
    <button class="px btn bevel t-bad wide" onclick={newGame}><span class="lbl m">New game</span></button>
  </div>

  <div class="lbl eyebrow">Rules</div>
  <p class="body">
    Walking costs 1⚡ a hex on sand, grass or path, and 2⚡ through forest, rock or shallows. Each node shows what it costs and
    gives. Searching costs {COST.search}⚡; fighting costs nothing but your health, which comes back slowly or with a rest. Talking and going to people are free. Energy comes back
    one point every 1:30.
  </p>
  <p class="lbl dim keys">Hotkeys: 1 2 skills · [ ] turn · H hide UI · R reroll · F search · B bag · P people · Q quests · C character · M map · S settings · T theme · ← → flip images · Esc back</p>
</Panel>

<style>
  .eyebrow {
    color: var(--hl);
    margin: 6px 0 10px;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .seg {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .themes {
    margin-bottom: 16px;
  }
  .pick {
    min-width: 32px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0 10px 4px;
  }
  .pick.on {
    --face: var(--c-accent);
    --fg: var(--c-accent-fg);
  }
  .toggle {
    min-width: 56px;
  }
  /* the dev tools, set in from the rest */
  .dev {
    margin: -4px 0 14px;
    padding: 12px 12px 0;
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    box-shadow: inset 2px 0 0 var(--hl);
  }
  .buttons {
    justify-content: flex-start;
  }
  .wide {
    padding: 8px 14px 11px;
  }
  p {
    margin: 0 0 10px;
  }
  .dim {
    color: var(--dim);
  }
  .keys {
    line-height: 1.7;
  }
</style>
