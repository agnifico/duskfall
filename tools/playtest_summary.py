#!/usr/bin/env python3
"""Summarise playtest logs (game/playtest/*.jsonl, written in dev mode) into the numbers that set the pacing.
From the project root:
  python3 tools/playtest_summary.py              # every log, as one run
  python3 tools/playtest_summary.py --last 3     # the newest 3 log files
  python3 tools/playtest_summary.py --since 2026-11-08

Time is active time: gaps of more than 5 minutes between events count as the game sitting idle.
"""
import glob
import json
import os
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGS = os.path.join(ROOT, 'game', 'playtest')
IDLE_MS = 5 * 60_000

args = sys.argv[1:]
files = sorted(glob.glob(os.path.join(LOGS, '*.jsonl')))
if '--last' in args:
    files = files[-int(args[args.index('--last') + 1]):]
if '--since' in args:
    since = args[args.index('--since') + 1]
    files = [f for f in files if os.path.basename(f) >= since]
if not files:
    sys.exit('No playtest logs found in game/playtest/ (they are written while dev mode is on).')

events = []
for f in files:
    with open(f) as fh:
        for line in fh:
            try:
                events.append(json.loads(line))
            except ValueError:
                pass
events.sort(key=lambda e: e.get('t', 0))

# active minutes at each event
active, last, mins = 0.0, None, []
for e in events:
    t = e.get('t', 0)
    if last is not None and 0 < t - last <= IDLE_MS:
        active += (t - last) / 60_000
    last = t
    mins.append(active)

fmt = lambda m: f'{int(m // 60)}h{int(m % 60):02d}' if m >= 60 else f'{m:.0f} min'
out = []
say = out.append
say(f'# Playtest summary: {len(files)} log file(s), {len(events)} events, {fmt(active)} active\n')

# ---------- levels ----------
say('## Levels (active time when reached)')
lv = defaultdict(list)
for e, m in zip(events, mins):
    if e.get('ev') == 'level':
        lv[e.get('skill', '?')].append((e.get('level'), m))
for skill, rows in lv.items():
    say(f'- **{skill}:** ' + ', '.join(f'{l} at {fmt(m)}' for l, m in rows))
if not lv:
    say('- none')

# ---------- fights ----------
kills, kos, taken, dealt, swings, misses = Counter(), Counter(), Counter(), Counter(), Counter(), Counter()
ko_where = Counter()
for e in events:
    ev = e.get('ev')
    if ev == 'kill':
        kills[e.get('foe')] += 1
    elif ev == 'ko':
        for f in e.get('foes', []) or ['?']:
            kos[f] += 1
        ko_where[e.get('point')] += 1
    elif ev == 'hit' and e.get('to') == 'you':
        taken[e.get('by')] += e.get('dmg', 0)
    elif ev == 'hit' and e.get('by') == 'you':
        dealt[e.get('to')] += e.get('dmg', 0)
        swings[e.get('to')] += 1
        misses[e.get('to')] += 1 if e.get('miss') else 0
say('\n## Fights')
say('| enemy | kills | knocked you out | damage taken | your hits per kill | your misses |')
say('|---|---|---|---|---|---|')
for f in sorted(set(kills) | set(kos) | set(taken), key=lambda k: -kills[k]):
    per = f'{swings[f] / kills[f]:.1f}' if kills[f] else '–'
    miss = f'{100 * misses[f] / swings[f]:.0f}%' if swings[f] else '–'
    say(f'| {f} | {kills[f]} | {kos[f]} | {taken[f]:.0f} | {per} | {miss} |')
if ko_where:
    say('Knockouts by place: ' + ', '.join(f'{p} {n}' for p, n in ko_where.most_common()))

# ---------- energy ----------
spent, gained = Counter(), Counter()
for e in events:
    if e.get('ev') == 'spend' and not e.get('free'):
        spent[e.get('why', '?').split(':')[0]] += e.get('n', 0)
    elif e.get('ev') == 'regen':
        gained['regen'] += e.get('n', 0)
    elif e.get('ev') == 'use':
        gained['food/potion uses'] += 1
    elif e.get('ev') == 'fire' and e.get('kind') == 'stoke':
        gained['fire stokes'] += 1
hours = max(active / 60, 1e-9)
say('\n## Energy')
say(f'- Spent {sum(spent.values())} in all, {sum(spent.values()) / hours:.0f} per active hour: ' + ', '.join(f'{k} {v}' for k, v in spent.most_common()))
say('- Came back: ' + ', '.join(f'{k} {v}' for k, v in gained.most_common()))

# ---------- gathering and making ----------
nodes, made, gains = Counter(), Counter(), Counter()
for e in events:
    if e.get('ev') == 'gather':
        nodes[e.get('node')] += 1
    elif e.get('ev') == 'craft':
        made[e.get('recipe')] += e.get('made', 1)
    elif e.get('ev') == 'gain':
        gains[e.get('item')] += e.get('n', 0)
say('\n## Gathering and making')
say('- Gathered: ' + (', '.join(f'{k} {v}' for k, v in nodes.most_common()) or 'nothing'))
say('- Made: ' + (', '.join(f'{k} {v}' for k, v in made.most_common()) or 'nothing'))
say('- Got most of: ' + ', '.join(f'{k} {v}' for k, v in gains.most_common(10)))

# ---------- quests ----------
say('\n## Quests (active time)')
for e, m in zip(events, mins):
    if e.get('ev') == 'quest' and e.get('state'):  # stage-by-stage steps are left out: starts and ends are enough
        if e['id'] == 'washed-ashore' and e['state'] == 'start':
            say(f'- {fmt(m)}: **new game**')
        say(f'- {fmt(m)}: {e.get("id")} {e.get("state")}')
    elif e.get('ev') == 'errand':
        say(f'- {fmt(m)}: daily {e.get("id")} {e.get("step")}')

# ---------- where the time went ----------
where, prev = Counter(), None
for (e, m), (e2, m2) in zip(zip(events, mins), list(zip(events, mins))[1:]):
    p = e.get('point') or prev
    prev = p
    if p:
        where[p] += m2 - m
say('\n## Time by place')
say(', '.join(f'{p} {fmt(m)}' for p, m in where.most_common()))

print('\n'.join(out))
