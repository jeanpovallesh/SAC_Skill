#!/usr/bin/env python3
"""Pruebas de los validadores. Uso: python3 -I tests/test_validators.py  (desde SAC_HTML_STORIES_SKILL)"""
import copy
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import validate_model_json as vm  # noqa: E402
import validate_spec as vs  # noqa: E402

fails, total = [], 0


def check(name, cond):
    global total
    total += 1
    if not cond:
        fails.append(name)
    print(('OK   ' if cond else 'FALLA'), name)


def load(p):
    return json.load(open(os.path.join(ROOT, p), encoding='utf-8'))


# ---------- modelos
for f in ('examples/models/model-metadata-rrhh.json', 'examples/models/model-metadata-distribucion.json'):
    e, w, i, c = vm.validate(load(f))
    check(f'modelo válido: {os.path.basename(f)}', not e)

rrhh = load('examples/models/model-metadata-rrhh.json')


def neg_model(name, fn, rule):
    d = copy.deepcopy(rrhh)
    fn(d)
    e, w, i, c = vm.validate(d)
    check(f'modelo {name} -> {rule}', any(x.startswith(rule) for x in e + w))


neg_model('tipo de modelo inválido', lambda d: d['model'].__setitem__('type', 'x'), 'M3')
neg_model('ids duplicados', lambda d: d['measures'].append(copy.deepcopy(d['measures'][0])), 'M4')
neg_model('padre inexistente', lambda d: d['dimensions'][1].__setitem__('members', [{'id': 'a', 'parent_id': 'zz'}]), 'M9')
neg_model('ciclo de padres', lambda d: d['dimensions'][1].__setitem__('members', [{'id': 'a', 'parent_id': 'b'}, {'id': 'b', 'parent_id': 'a'}]), 'M9')
neg_model('ratio roto', lambda d: d['measures'][0].__setitem__('components', {'numerator': 'x', 'denominator': 'y'}), 'M10')
neg_model('decimals fuera de rango', lambda d: d['measures'][0].__setitem__('decimals', 9), 'M11')
neg_model('id inseguro', lambda d: d['measures'][0].__setitem__('id', 'Margen %'), 'M14')
neg_model('fixed sin unit_value', lambda d: d['measures'][0].update(type='fixed', unit_value=None), 'M6')
d = copy.deepcopy(rrhh)
d['dimensions'][1]['type'] = 'entity'
e, w, i, c = vm.validate(d)
check('modelo alias entity se normaliza', not any(x.startswith('M5') for x in e) and any('organization' in x for x in c))
bad = '﻿{"a":1,}'
check('lectura tolerante (BOM y coma final)', vm.tolerant_load(bad)[0] == {'a': 1})

# ---------- especificación
def spec_of(md):
    t = open(os.path.join(ROOT, md), encoding='utf-8').read()
    return json.loads(re.search(r'```json\n(.*?)\n```', t, re.S).group(1))


cases = [('examples/01-rrhh-demografia-genero.md', 'examples/models/model-metadata-rrhh.json'),
         ('examples/02-scm-distribucion-zonas-canales.md', 'examples/models/model-metadata-distribucion.json')]
for md, mt in cases:
    e, w = vs.validate(spec_of(md), load(mt))
    check(f'spec válida: {os.path.basename(md)}', not e)

s1, m1 = spec_of(cases[0][0]), load(cases[0][1])
s2, m2 = spec_of(cases[1][0]), load(cases[1][1])


def neg_spec(name, base, meta, fn, rule):
    s = copy.deepcopy(base)
    fn(s)
    e, w = vs.validate(s, meta)
    check(f'spec {name} -> {rule}', any(x.startswith(rule) for x in e + w))


neg_spec('falta sección', s1, m1, lambda s: s.pop('feeds'), 'S0')
neg_spec('feed inexistente', s1, m1, lambda s: s['feeds'][0].__setitem__('ref', 'Fantasma'), 'S1')
neg_spec('propiedad de dimensión ausente', s2, m2, lambda s: s['feeds'][-1].__setitem__('of', 'Marca_Linea'), 'S1')
neg_spec('índices rotos', s1, m1, lambda s: s['feeds'][2].__setitem__('index', 7), 'S3')
neg_spec('opcional antes de requerido', s1, m1, lambda s: s['feeds'][0].__setitem__('optional', True), 'S3')
neg_spec('filtro sin feed', s1, m1, lambda s: s['filters'][0].__setitem__('target', 'Nada'), 'S4')
neg_spec('uses con ref inexistente', s1, m1, lambda s: s['components'][0]['uses'].__setitem__('split', 'Nada'), 'S5')
neg_spec('ratio sin componentes', s2, m2, lambda s: [m for m in s['measures'] if m['role'] == 'ratio'][0].__setitem__('numerator', 'Nada'), 'S6')
neg_spec('non-additive con filtros', s2, m2, lambda s: (s['measures'][0].__setitem__('aggregation', 'non-additive')), 'S7')
neg_spec('propiedad sin default', s1, m1, lambda s: s['properties'][1].pop('default'), 'S8')
neg_spec('tag con versión', s1, m1, lambda s: s['widget'].__setitem__('tag', 'com-isitec-demografiagenero-v2'), 'S9')
neg_spec('assumptions vacío', s1, m1, lambda s: s.__setitem__('assumptions', []), 'S10')
neg_spec('tipo desconocido', s1, m1, lambda s: s['components'][0].__setitem__('type', 'radar'), 'C1')
neg_spec('clave uses inválida', s1, m1, lambda s: s['components'][0]['uses'].__setitem__('axis', 'Genero'), 'C2')
neg_spec('uses obligatorio ausente', s2, m2, lambda s: s['components'][4]['uses'].pop('axis'), 'C4')
neg_spec('pirámide sin dos roles', s1, m1, lambda s: s['memberRoles']['Genero'].pop('hombres'), 'C6')
neg_spec('tree sin hierarchy', s1, m1, lambda s: s['components'][6]['options'].__setitem__('tree', {'axis': 'rows'}), 'C13')
neg_spec('comparativo sin comparison', s2, m2, lambda s: s['components'].append({'id': 'x', 'type': 'bar-compare', 'uses': {'axis': 'Canal', 'measures': ['Volumen']}}), 'C11')
neg_spec('span > 12', s2, m2, lambda s: [s['components'][0].__setitem__('layout', {'span': 8, 'row': 1}), s['components'][1].__setitem__('layout', {'span': 8, 'row': 1})], 'C12')

# ---------- paquete (si existe el validador)
try:
    import validate_bundle as vb  # noqa: E402
except ImportError:
    vb = None
if vb:
    exec(open(os.path.join(ROOT, 'tests', 'test_bundle.py'), encoding='utf-8').read())

print(f'\n{total - len(fails)}/{total} pruebas correctas')
sys.exit(1 if fails else 0)
