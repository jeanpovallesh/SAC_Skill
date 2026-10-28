#!/usr/bin/env python3
"""Fixture sintética de data binding (formato SAC verificado con la sonda) generada desde una especificación.
Uso: make_fixture.py <spec.json> <salida.json> [--seed N] [--drop ref1,ref2]"""
import json, random, sys, argparse

ap = argparse.ArgumentParser()
ap.add_argument('spec'); ap.add_argument('out')
ap.add_argument('--seed', type=int, default=7); ap.add_argument('--drop', default='')
a = ap.parse_args()
spec = json.load(open(a.spec, encoding='utf-8'))
rnd = random.Random(a.seed)
drop = set(filter(None, a.drop.split(',')))
dims = sorted([f for f in spec['feeds'] if f['role'] == 'dimension' and f['ref'] not in drop], key=lambda f: f['index'])
props = [f for f in spec['feeds'] if f['role'] == 'property' and f['ref'] not in drop]
N = {'Periodo': 3}
members = {}
for f in dims:
    n = N.get(f['ref'], 4)
    if f.get('ordered'):
        members[f['ref']] = [('2026%02d' % (i + 1), 'Mes %d' % (i + 1)) for i in range(n)]
    else:
        members[f['ref']] = [('%s_%d' % (f['ref'][:3].upper(), i + 1), '%s %d' % (f.get('label') or f['ref'], i + 1)) for i in range(n)]
values = [m for m in spec['measures'] if m['role'] == 'value' and m['ref'] not in drop]
meta_dims = {}
for i, f in enumerate(dims):
    meta_dims['dims_%d' % i] = {'id': f['ref'], 'description': f.get('label') or f['ref']}
for i, f in enumerate(props):
    meta_dims['props_%d' % i] = {'id': f['of'] + '.' + f['ref'], 'description': f.get('label') or f['ref']}
msm = {}
for i, m in enumerate(values):
    msm['measures_%d' % i] = {'id': '[Account].[parentId].&[%s]' % m['ref'], 'label': m['ref']}
rows = []
def walk(i, cur):
    if i == len(dims):
        r = {}
        for j, f in enumerate(dims):
            k, l = cur[j]
            r['dims_%d' % j] = {'id': k, 'label': l}
        for j, f in enumerate(props):
            base = cur[[d['ref'] for d in dims].index(f['of'])][0] if f['of'] in [d['ref'] for d in dims] else ''
            h = sum(ord(ch) for ch in base)
            if f['ref'].lower().startswith('lat'):
                val = '%.2f' % (2 + (h % 9))
            elif f['ref'].lower().startswith(('lon', 'lng')):
                val = '%.2f' % (-78 + (h * 7 % 6))
            else:
                val = 'B2B' if h % 2 == 0 else 'D2C'
            r['props_%d' % j] = {'id': val, 'label': val}
        for j, m in enumerate(values):
            v = rnd.uniform(100, 5000) if m.get('aggregation') != 'semi-additive' else rnd.uniform(50, 400)
            if m.get('format') == 'integer' or m.get('aggregation') == 'semi-additive':
                v = round(v)
            r['measures_%d' % j] = {'raw': v, 'formatted': '{:,.0f}'.format(v), 'unit': '$' if m.get('format') == 'currency' else ''}
        rows.append(r); return
    for mm in members[dims[i]['ref']]:
        walk(i + 1, cur + [mm])
walk(0, [])
json.dump({'state': 'success', 'data': rows, 'metadata': {'dimensions': meta_dims, 'mainStructureMembers': msm, 'feeds': {}}},
          open(a.out, 'w'), ensure_ascii=False)
print('fixture:', len(rows), 'filas,', len(dims), 'dims,', len(values), 'medidas')
