<script lang="ts">
  // An item's painted icon, or its emoji when it has none yet.
  import { asset, content, sprites } from '../content';

  let { id, size = 32 }: { id: string; size?: number } = $props();

  const item = $derived(content.items[id]);
  const sprite = $derived(item?.sprite ? sprites[item.sprite] : undefined);
</script>

{#if sprite}
  <img src={asset(sprite.file)} alt={item?.name ?? id} width={size} height={size} draggable="false" />
{:else}
  <span class="emoji" style:font-size="{size * 0.75}px" style:width="{size}px" style:height="{size}px">{item?.icon ?? '❔'}</span>
{/if}

<style>
  img {
    object-fit: contain;
    display: block;
    /* the art has no shadow of its own */
    filter: drop-shadow(0 2px 0 rgb(0 0 0 / 0.3)) drop-shadow(0 4px 5px rgb(0 0 0 / 0.28));
  }
  .emoji {
    display: grid;
    place-items: center;
    line-height: 1;
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  }
</style>
