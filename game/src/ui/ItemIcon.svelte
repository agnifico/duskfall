<script lang="ts">
  // An item's painted icon, or its emoji when it has none yet. Up to 64 px it uses the small .icon.webp that
  // tools/cut_sheets.py writes for item sets, so a full bag doesn't decode a hundred big PNGs.
  import { asset, content, sprites } from '../content';

  let { id, size = 32 }: { id: string; size?: number } = $props();

  const item = $derived(content.items[id]);
  const sprite = $derived(item?.sprite ? sprites[item.sprite] : undefined);
  const ICON_SETS = ['gear', 'weapons', 'relics', 'elem1', 'elem2', 'grok_items']; // keep in step with cut_sheets.py
  const file = $derived(sprite && size <= 64 && ICON_SETS.includes(item!.sprite!.split('/')[0]) ? sprite.file.replace(/\.png$/, '.icon.webp') : sprite?.file);
</script>

{#if sprite}
  <img src={asset(file!)} alt={item?.name ?? id} width={size} height={size} draggable="false" loading="lazy" decoding="async" />
{:else}
  <span class="emoji" style:font-size="{size * 0.75}px" style:width="{size}px" style:height="{size}px">{item?.icon ?? '❔'}</span>
{/if}

<style>
  img {
    object-fit: contain;
    display: block;
    /* the art has no shadow of its own */
    filter: drop-shadow(0 3px 2px rgb(0 0 0 / 0.32)); /* one filter, not two: the bag shows a hundred of these */
  }
  .emoji {
    display: grid;
    place-items: center;
    line-height: 1;
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  }
</style>
