<script lang="ts">
  // Quick slots next to the bag. Empty for now: they'll hold food, tools and items to use in one tap.
  const SLOTS = 6;
</script>

<div class="hotbar" title="Quick slots: later">
  {#each { length: SLOTS } as _, i (i)}
    <div class="slot px flat t-inset"><span class="lbl n">{i + 1}</span></div>
  {/each}
</div>

<style>
  .hotbar {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    padding-bottom: 2px;
  }
  .slot {
    width: 42px;
    height: 42px;
    opacity: 0.75;
  }
  .slot::after {
    content: '';
    position: absolute;
    inset: 5px;
    background: var(--well);
    box-shadow: inset 0 2px 0 color-mix(in srgb, var(--ink) 45%, transparent);
  }
  .n {
    position: absolute;
    left: 6px;
    top: 6px;
    z-index: 1;
    color: var(--well-fg);
  }
</style>
