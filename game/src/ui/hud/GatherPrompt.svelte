<script lang="ts">
  // Bottom centre, always in the same spot: gather what you're standing on (G), and on fogged points,
  // search around you (F).
  import { G, short } from '../../lib/game.svelte';
  import { content } from '../../content';
  import * as E from '../../engine/actions';
  import { runAction } from '../commands';
  import { skillProgress } from '../../engine/progress';
  import { YIELD_PER_LEVEL } from '../../engine/rules';

  const here = $derived(E.hereCell(G.s, content));
  const pr = $derived(here ? E.visibleProp(G.s, content, here) : null);
  const acts = $derived(E.actionsHere(G.s, content, G.now));
  const gather = $derived(acts.find((a) => a.id === 'gather'));
  const search = $derived(acts.find((a) => a.id === 'search'));

  /** "5–8 Wood · maybe Birch bark" */
  const gives = $derived.by(() => {
    if (!pr || pr.type !== 'node') return '';
    const [lo, hi] = E.nodeYield(pr);
    const parts = [`${lo === hi ? lo : `${lo}–${hi}`} ${E.itemName(content, pr.item ?? pr.code)}`];
    if (pr.extra) parts.push(`${pr.extra.amount} ${E.itemName(content, pr.extra.item)}`);
    for (const b of E.bonuses(pr)) parts.push(`maybe ${E.itemName(content, b.item)}`);
    if (pr.skill) {
      const p = skillProgress(G.s, pr.skill);
      if (Array.isArray(pr.yield) && p.level > 1) parts[0] += ` +${Math.round(YIELD_PER_LEVEL * (p.level - 1) * 100)}%`;
      if (!p.max) parts.push(`${E.nodeXp(pr, p.level)} ${content.lifeskills[pr.skill]?.name ?? pr.skill} xp`);
    }
    return parts.join(' · ');
  });
</script>

{#if gather || search}
  <div class="prompt">
    {#if search}
      <button class="px btn bevel t-panel small" onclick={() => runAction('search')} title="Search nearby (F)">
        <span class="key">F</span><span class="lbl m">Search</span><span class="cost" class:short={short(search.cost)}>{search.cost}⚡</span>
      </button>
    {/if}
    {#if gather}
      <button class="px btn bevel t-accent big" disabled={!!gather.disabled} onclick={() => runAction('gather')} title="{gather.label} (G)">
        <span class="key">G</span>
        <span class="what">
          <span class="lbl l">{gather.label}</span>
          <span class="lbl sub">{gather.disabled ?? gives}</span>
        </span>
        {#if !gather.disabled}<span class="cost" class:short={short(gather.cost)}>{gather.cost}⚡</span>{/if}
      </button>
    {/if}
  </div>
{/if}

<style>
  .prompt {
    position: absolute;
    left: 50%;
    bottom: 126px;
    translate: -50% 0;
    display: flex;
    align-items: flex-end;
    gap: 12px;
  }
  .big {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px 13px;
  }
  .what {
    display: flex;
    flex-direction: column;
    gap: 5px;
    text-align: left;
  }
  .sub {
    opacity: 0.8;
  }
  .small {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px 11px;
  }
</style>
