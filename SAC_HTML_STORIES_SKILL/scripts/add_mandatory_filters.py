#!/usr/bin/env python3
"""D11: agrega a una especificación los feeds y filtros obligatorios de Versión y Tiempo
(las dimensiones del modelo de tipo `version` y `time`) si faltan. Idempotente.
Uso: python3 -I scripts/add_mandatory_filters.py <spec.json> <metadata.json> [--out spec.json]"""
import argparse, json, sys


def fid(name):
    return 'f' + ''.join(ch for ch in name if ch.isalnum() or ch == '_')


def patch(spec, meta):
    feeds = spec.setdefault('feeds', [])
    filters = spec.setdefault('filters', [])
    refs = {f['ref'] for f in feeds}
    added = []
    for d in meta.get('dimensions', []):
        t = d.get('type')
        if t not in ('version', 'time'):
            continue
        name = d['id']
        if name not in refs:
            feed = {'index': 0, 'role': 'dimension', 'ref': name, 'label': d.get('description') or name,
                    'usedFor': ['filter'] + (['time'] if t == 'time' else [])}
            if t == 'time':
                feed['ordered'] = True
            # después de las dimensiones requeridas, antes de las opcionales y propiedades
            pos = len([f for f in feeds if f.get('role') == 'dimension' and not f.get('optional')])
            feeds.insert(pos, feed)
            refs.add(name)
            added.append(f'feed {name}')
        if not any(x.get('target') == name for x in filters):
            if t == 'version':
                fl = {'id': fid(name), 'target': name, 'ui': 'combobox', 'by': ['id', 'description'],
                      'multi': True, 'includeAll': False, 'default': 'first'}
            else:
                fl = {'id': fid(name), 'target': name, 'ui': 'combobox', 'by': ['id', 'description'],
                      'multi': True, 'includeAll': True, 'default': 'all'}
            filters.insert(0 if t == 'version' else min(1, len(filters)), fl)
            added.append(f'filtro {fl["id"]}')
    for i, f in enumerate(feeds):
        f['index'] = i
    return added


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('spec'); ap.add_argument('metadata'); ap.add_argument('--out')
    a = ap.parse_args(argv)
    spec = json.load(open(a.spec, encoding='utf-8'))
    meta = json.load(open(a.metadata, encoding='utf-8'))
    added = patch(spec, meta)
    out = a.out or a.spec
    json.dump(spec, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('Agregado: ' + (', '.join(added) if added else 'nada (ya estaba completo)') + f' -> {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
