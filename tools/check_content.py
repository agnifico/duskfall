#!/usr/bin/env python3
"""Check the game's content files for broken links, before playing. From the project root:
  python3 tools/check_content.py

Errors are things that will break or silently do nothing in the game (a quest giving an item that doesn't
exist, a map using an unknown prop). Warnings are things that are probably unfinished (an item nothing gives,
a tag a condition waits for that nothing ever sets). Exit code 1 if there are errors.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, 'game', 'src', 'content')
PUBLIC = os.path.join(ROOT, 'game', 'public')

errors, warnings = [], []
err = lambda where, msg: errors.append(f'{where}: {msg}')
warn = lambda where, msg: warnings.append(f'{where}: {msg}')


def load(name):
    with open(os.path.join(C, name)) as f:
        return json.load(f)


props = load('props.json')
items = {**load('items.json'), **load('gear.json')}
npcs = load('npcs.json')
quests = load('quests.json')
errands = load('errands.json')
recipes = load('recipes.json')
skills = load('skills.json')
sprites = load('sprites.json')
terrain = load('terrain.json')
sets = load('sets.json')
player = load('player.json')
points = {}
for f in glob.glob(os.path.join(C, 'points', '*.json')):
    with open(f) as fh:
        p = json.load(fh)
    points[p['id']] = p

enemies = {k for k, v in props.items() if v.get('type') == 'enemy'}
ELEMENTS = {'fire', 'water', 'earth', 'air', 'light', 'dark'}  # engine/elements.ts
public = lambda rel: os.path.exists(os.path.join(PUBLIC, rel))

# what sets tags, what gives items (for the "never" checks at the end)
tags_set, tags_wanted = set(), {}
given = {'coin'}


def effects(where, effs):
    for e in effs or []:
        if 'give' in e:
            given.add(e['give'])
            if e['give'] not in items: err(where, f'gives unknown item "{e["give"]}"')
        if 'take' in e and e['take'] not in items: err(where, f'takes unknown item "{e["take"]}"')
        if 'tag' in e: tags_set.add(e['tag'])
        if 'goto' in e and e['goto'] not in points: err(where, f'goes to unknown point "{e["goto"]}"')
        for sp in e.get('spawn', []):
            if sp['kind'] not in enemies: err(where, f'spawns unknown enemy "{sp["kind"]}"')


def cond(where, c):
    if not c: return
    for k in ('all', 'any'):
        for x in c.get(k, []): cond(where, x)
    if 'not' in c: cond(where, c['not'])
    if 'talk' in c and c['talk'] not in npcs: err(where, f'talks to unknown person "{c["talk"]}"')
    if 'enter' in c and c['enter'] not in points: err(where, f'enters unknown point "{c["enter"]}"')
    if 'wear' in c and c['wear'] not in items: err(where, f'wears unknown item "{c["wear"]}"')
    if 'have' in c and c['have'] not in items: err(where, f'needs unknown item "{c["have"]}"')
    if 'quest' in c and c['quest'] not in quests: err(where, f'waits on unknown quest "{c["quest"]}"')
    if 'tag' in c: tags_wanted.setdefault(c['tag'], where)
    if 'kill' in c:
        kinds = c['kill'] if isinstance(c['kill'], list) else [c['kill']]
        for k in kinds:
            if k != '*' and k not in enemies: err(where, f'counts kills of unknown enemy "{k}"')
        for p in c.get('at', []):
            if p not in points: err(where, f'counts kills at unknown point "{p}"')


def lines(where, ls):
    for l in ls or []:
        if isinstance(l, str):
            m = re.match(r'^([a-z][a-z0-9-]*): ', l)
            if m and m.group(1) != 'you' and m.group(1) not in npcs:
                warn(where, f'"{m.group(1)}:" isn\'t a known person, so the line shows as narration')
        elif 'choose' in l:
            for ch in l['choose']: effects(where + ' (choice)', ch.get('then'))
        elif 'image' in l and l['image'] and not public(l['image']):
            warn(where, f'picture "{l["image"]}" not in game/public yet')


# ---------- props ----------
for code, p in props.items():
    w = f'props › {code}'
    if p.get('sprite') and p['sprite'] not in sprites: err(w, f'sprite "{p["sprite"]}" not in sprites.json')
    if p.get('spent') and p['spent'] not in sprites: err(w, f'spent sprite "{p["spent"]}" not in sprites.json')
    for k in ('item',):
        if p.get(k):
            given.add(p[k])
            if p[k] not in items: err(w, f'gives unknown item "{p[k]}"')
    bonus = p.get('bonus')
    for b in (bonus if isinstance(bonus, list) else [bonus] if bonus else []):
        given.add(b['item'])
        if b['item'] not in items: err(w, f'bonus is unknown item "{b["item"]}"')
    if p.get('npc') and p['npc'] not in npcs: err(w, f'unknown person "{p["npc"]}"')
    foe = p.get('foe')
    if foe:
        els = foe.get('element') or []
        for e in ([els] if isinstance(els, str) else els):
            if e not in ELEMENTS: err(w, f'unknown element "{e}"')
        if isinstance(els, list) and len(els) > 2: err(w, 'more than two elements')
        if not foe.get('element'): warn(w, 'enemy with no element')
        for d in foe.get('drops', []):
            for i in ([d['item']] if d.get('item') else []) + d.get('oneOf', []):
                given.add(i)
                if i not in items: err(w, f'drops unknown item "{i}"')

# ---------- points ----------
for pid, p in points.items():
    w = f'points › {pid}'
    codes = set()
    for r, row in enumerate(p['rows']):
        for c, tok in enumerate(row.split()):
            if tok == '_': continue
            t, _, code = tok.partition('.')
            if t not in terrain: err(w, f'row {r} col {c}: unknown terrain "{t}"')
            if code and code != '*':
                codes.add(code)
                if code not in props: err(w, f'row {r} col {c}: unknown prop "{code}"')
    if pid != 'dev-field' and 'start' not in codes and '>' not in codes: warn(w, 'no start marker and no way out: you arrive on the first hex')
    for code in p.get('table', []):
        if code not in props: err(w, f'table has unknown prop "{code}"')
    for e in (p.get('enemies') or {}).get('place', []) + [{'kind': k} for k in (p.get('enemies') or {}).get('table', [])]:
        if e['kind'] not in enemies: err(w, f'places unknown enemy "{e["kind"]}"')
        on = e.get('on', [])
        for t in on:
            if t not in terrain: err(w, f'places {e["kind"]} on unknown terrain "{t}"')
        if on and not any(tok.split('.')[0] in on for row in p['rows'] for tok in row.split()): warn(w, f'{e["kind"]} wants terrain {on}, which this map has none of')
    for pe in p.get('people', []):
        if pe['npc'] not in npcs: err(w, f'stands unknown person "{pe["npc"]}"')
        cond(w + ' › people', pe.get('while'))
    cond(w + ' › opensWith', p.get('opensWith'))
    lv = p.get('levels')
    if lv and not (1 <= lv[0] <= lv[1]): err(w, f'level range {lv} is upside down')
    if lv:
        for e in (p.get('enemies') or {}).get('place', []):
            fl = props.get(e['kind'], {}).get('foe', {}).get('level')
            if fl and fl > lv[1]: warn(w, f'{e["kind"]} is level {fl}, above the area\'s top ({lv[1]})')

# ---------- quests, daily quests ----------
for qid, q in quests.items():
    w = f'quests › {qid}'
    cond(w + ' › start', q.get('start'))
    if q.get('giver') and q['giver'] not in npcs: err(w, f'unknown giver "{q["giver"]}"')
    for i, st in enumerate(q['stages']):
        sw = f'{w} › stage {i}'
        cond(sw, st.get('need'))
        if st.get('who') and st['who'] not in npcs: err(sw, f'unknown person "{st["who"]}"')
        if not st.get('auto') and not st.get('who'): warn(sw, 'not auto and no "who": nobody can hand it in')
        lines(sw, st.get('say'))
        lines(sw, st.get('remind'))
        effects(sw, st.get('then'))
ids = set()
for npc, pool in errands.items():
    if npc not in npcs: err(f'errands › {npc}', 'unknown person')
    for e in pool:
        w = f'errands › {e["id"]}'
        if e['id'] in ids: err(w, 'id used twice')
        ids.add(e['id'])
        if 'kill' in e: cond(w, {'kill': e['kill']['kind'], 'n': e['kill']['n'], 'at': e['kill'].get('at', [])})
        if 'bring' in e and e['bring']['item'] not in items: err(w, f'asks for unknown item "{e["bring"]["item"]}"')
        if not e.get('kill') and not e.get('bring'): warn(w, 'asks for nothing')
        effects(w, e.get('reward'))
        cond(w + ' › opens', e.get('opens'))

# ---------- recipes, skills, gear, people, sprites ----------
for rid, r in recipes.items():
    w = f'recipes › {rid}'
    given.add(r['makes'])
    if r['makes'] not in items: err(w, f'makes unknown item "{r["makes"]}"')
    for i in r['needs']:
        if i not in items: err(w, f'needs unknown item "{i}"')
for sid, s in skills.items():
    if s.get('badge') and not public(f'sprites/skills/{s["badge"]}.png'): err(f'skills › {sid}', f'badge "{s["badge"]}" has no image')
for sid in player.get('skills', []):
    if sid not in skills: err('player › skills', f'unknown skill "{sid}"')
for sid, st in sets.items():
    for b in st.get('bonuses', []):
        if b.get('passive') and b['passive'] not in ELEMENTS: err(f'sets › {sid}', f'unknown passive element "{b["passive"]}"')
for iid, it in items.items():
    w = f'items › {iid}'
    if it.get('sprite') and it['sprite'] not in sprites: err(w, f'sprite "{it["sprite"]}" not in sprites.json')
    if it.get('set') and it['set'] not in sets: err(w, f'unknown set "{it["set"]}"')
    if it.get('element') and it['element'] not in ELEMENTS: err(w, f'unknown element "{it["element"]}"')
    for g in it.get('grants', []):
        if g not in skills: err(w, f'grants unknown skill "{g}"')
for nid, n in npcs.items():
    w = f'npcs › {nid}'
    for f in [n.get('portrait')] + n.get('art', []):
        if f and not public(f): err(w, f'image "{f}" missing')
    for k in ('stand', 'walk'):
        s = (n.get('figure') or {}).get(k)
        if s and s not in sprites: err(w, f'figure "{s}" not in sprites.json')
    if not n.get('figure'): warn(w, 'no figure yet: shows as a portrait disc')
    if n.get('point') and n['point'] not in points: err(w, f'unknown point "{n["point"]}"')
for sid, s in sprites.items():
    if not public(s['file']): err(f'sprites › {sid}', f'file "{s["file"]}" missing (run tools/cut_sheets.py)')

# ---------- loose ends ----------
for t, where in tags_wanted.items():
    if t not in tags_set: warn(where, f'waits for tag "{t}", which nothing sets')
for iid, it in items.items():
    if iid in given: continue
    if it.get('slot'): continue  # gear: many pieces are for later; listed in the summary instead
    warn(f'items › {iid}', 'nothing gives it (no node, drop, recipe, quest or daily quest)')
gear_free = sorted(i for i, it in items.items() if it.get('slot') and i not in given)

# ---------- report ----------
for e in errors: print('ERROR  ' + e)
for w in warnings: print('warn   ' + w)
print(f'\n{len(errors)} errors, {len(warnings)} warnings. {len(points)} points, {len(quests)} quests, {sum(map(len, errands.values()))} daily quests, '
      f'{len(enemies)} enemies, {len(items)} items. {len(gear_free)} gear pieces have no source yet (for later areas).')
sys.exit(1 if errors else 0)
