<script lang="ts">
  // Everything drawn over the hex field or the map.
  // On the hex field: the full set. With the map open: the top bar and one menu button.
  import { fade } from 'svelte/transition';
  import { G } from '../../lib/game.svelte';
  import { UI } from '../../lib/ui.svelte';
  import { ED } from '../../lib/editor.svelte';
  import EditorBar from './EditorBar.svelte';
  import EventCard from './EventCard.svelte';
  import FieldTools from './FieldTools.svelte';
  import FoeCards from './FoeCards.svelte';
  import QuestTracker from './QuestTracker.svelte';
  import Gains from './Gains.svelte';
  import BenchBar from './BenchBar.svelte';
  import NewItems from './NewItems.svelte';
  import GatherPrompt from './GatherPrompt.svelte';
  import Hotbar from './Hotbar.svelte';
  import MenuDock from './MenuDock.svelte';
  import Messages from './Messages.svelte';
  import People from './People.svelte';
  import TopBar from './TopBar.svelte';
  import UiToggle from './UiToggle.svelte';
  import Vitals from './Vitals.svelte';
  import BagPanel from '../panels/BagPanel.svelte';
  import ProfilePanel from '../panels/ProfilePanel.svelte';
  import QuestsPanel from '../panels/QuestsPanel.svelte';
  import SkillsPanel from '../panels/SkillsPanel.svelte';
  import ElementsPanel from '../panels/ElementsPanel.svelte';
  import SettingsPanel from '../panels/SettingsPanel.svelte';

  const onField = $derived(!!G.s.point && !UI.map);

  // the first time you can choose an element (Heidi's Gift done, none chosen), the Elements panel opens by itself
  let offered = false;
  $effect(() => {
    if (offered || UI.bench || !G.s.tags?.infused || G.s.element || UI.panel || UI.screen) return;
    offered = true;
    UI.panel = 'elements';
  });
</script>

<div class="hud" in:fade={{ duration: 300 }}>
  <Messages />
  <Gains />
  {#if UI.bench}<BenchBar />{/if}
  <NewItems />

  {#if UI.hidden}
    {#if onField}<div class="bottom-left"><UiToggle /></div>{/if}
  {:else}
    <TopBar />
    {#if onField && ED.on}
      <EditorBar />
    {:else if onField}
      {#if !UI.bench}<QuestTracker />{/if}
      <FoeCards />
      <EventCard />
      <GatherPrompt />
      <Vitals />
      <FieldTools />
      <div class="bottom-left"><UiToggle /><Hotbar /></div>
    {/if}
    <MenuDock />
  {/if}

  {#if UI.panel === 'bag'}<BagPanel />{/if}
  {#if UI.panel === 'quests'}<QuestsPanel />{/if}
  {#if UI.panel === 'skills'}<SkillsPanel />{/if}
  {#if UI.panel === 'elements'}<ElementsPanel />{/if}
  {#if UI.panel === 'character'}<ProfilePanel who="player" />{/if}
  {#if UI.panel === 'person' && UI.person}
    {#key UI.person}<ProfilePanel who={UI.person} />{/key}
  {/if}
  {#if UI.panel === 'settings'}<SettingsPanel />{/if}
</div>

<style>
  .bottom-left {
    position: absolute;
    left: 14px;
    bottom: 14px;
    display: flex;
    align-items: flex-end;
    gap: 14px;
  }
  /* mobile: the hotbar stands up in a column above Hide, freeing the bottom edge */
  @media (max-width: 760px) {
    .bottom-left {
      flex-direction: column-reverse;
      align-items: center;
      gap: 10px;
    }
    .bottom-left :global(.hotbar) {
      flex-direction: column-reverse;
      align-items: center;
    }
  }
</style>
