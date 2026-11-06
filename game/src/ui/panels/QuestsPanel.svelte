<script lang="ts">
  // Quests. (The people you can go to are in the People list under the portrait.)
  import Panel from './Panel.svelte';
  import { ACTIVE_QUEST } from '../placeholders';
</script>

<Panel title="Quests">
  <div class="lbl eyebrow">Active quest</div>
  <div class="disp qt">{ACTIVE_QUEST.title}</div>
  <p class="body">{ACTIVE_QUEST.objective}</p>
</Panel>

<style>
  .eyebrow {
    color: var(--hl);
    margin: 4px 0 8px;
  }
  .qt {
    font-size: 30px;
  }
  p {
    margin: 4px 0 20px;
  }
</style>
