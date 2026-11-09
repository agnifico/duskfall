<script lang="ts">
  // Top right, under the map corner, while you fight: one small card per enemy after you, with its picture,
  // name, level, element (▲ your elemental hits land hard, ▼ weak) and HP.
  import { G } from '../../lib/game.svelte';
  import { asset, content, sprites } from '../../content';
  import { statsOf, foesHere } from '../../engine/combat';
  import { foeElements, multOnFoe } from '../../engine/elements';
  import { ELEMENT_COLOUR, elName, markOf } from '../elementInfo';

  const foes = $derived(foesHere(G.s).filter((f) => f.engaged));
</script>

{#if foes.length}
  <div class="foes">
    {#each foes as f (f.id)}
      {@const pr = content.props[f.kind]}
      {@const sp = pr?.sprite ? sprites[pr.sprite] : undefined}
      {@const max = statsOf(content, f).hp}
      {@const els = foeElements(content, f.kind)}
      {@const m = multOnFoe(G.s, els)}
      <div class="card px flat t-inset">
        <span class="pic">
          {#if sp}<img src={asset(sp.file)} alt="" />{:else}<span class="emoji">{pr?.icon ?? '?'}</span>{/if}
        </span>
        <span class="info">
          <span class="lbl m name">{pr?.name ?? f.kind}{#if f.level ?? pr?.foe?.level} · Lv {f.level ?? pr?.foe?.level}{/if}</span>
          {#if els.length}
            <span class="lbl el" title="Its element{els.length > 1 ? 's (a matchup is the average of the two)' : ''}. {m > 1 ? 'Your elemental hits land hard on it.' : m < 1 ? 'Your elemental hits land weak on it.' : ''}">
              {#each els as el (el)}<i style:background={ELEMENT_COLOUR[el]}></i>{elName(el)} {/each}{#if markOf(m)}<b class:up={m > 1} class:down={m < 1}>{markOf(m)}</b>{/if}
            </span>
          {/if}
          <span class="track"><b style:width="{Math.max(0, f.hp / max) * 100}%"></b></span>
          <span class="lbl hpv">{Math.max(0, Math.ceil(f.hp))}/{max}</span>
        </span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .el {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--dim);
  }
  .el i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .el b.up {
    color: #4cc46a;
  }
  .el b.down {
    color: #e5484d;
  }
  .foes {
    position: absolute;
    right: 14px;
    top: 186px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 220px;
  }
  .card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px 8px 6px;
  }
  .pic {
    flex: none;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    background: color-mix(in oklab, var(--c-inset) 70%, #000);
  }
  .pic img {
    max-width: 36px;
    max-height: 36px;
  }
  .emoji {
    font-size: 24px;
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .name {
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .track {
    height: 6px;
    background: #0a1210;
    box-shadow: 0 0 0 1px var(--ink);
  }
  .track b {
    display: block;
    height: 100%;
    background: #e5484d;
    transition: width 0.25s;
  }
  .hpv {
    font-size: 10px;
    color: var(--dim);
  }
</style>
