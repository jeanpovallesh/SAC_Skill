#!/usr/bin/env python3
"""Valida el JSON de metadata de un modelo de SAC (reglas M1-M18).

Uso:   python3 -I validate_model_json.py <metadata.json> [--json]
Salida: código 0 sin errores, 1 con errores, 2 si el archivo no se puede leer.
Con `jsonschema` instalado, además valida la estructura contra
../schemas/model-metadata.schema.json (sin él, las mismas comprobaciones
estructurales se hacen en el código).
Importable: validate(data) -> (errores, advertencias, info, cambios).
"""
import collections
import json
import os
import re
import sys

ENUM = {
    'model_type': {'planning', 'analytic'},
    'dim_type': {'version', 'time', 'account', 'category', 'organization', 'generic'},
    'unit': {'currency', 'unit', 'number', 'percent'},
    'mtype': {'fixed', 'variable'},
    'prop_type': {'string', 'number', 'date', 'boolean'},
    'kind': {'level', 'parent-child'},
    'agg': {'additive', 'semi-additive', 'non-additive'},
    'time_agg': {'last', 'avg'},
    'good': {'up', 'down'},
}
ALIAS = {
    'scenario': 'version', 'date': 'time', 'period': 'time', 'calendar': 'time',
    'accounts': 'account', 'entity': 'organization', 'company': 'organization',
    'legal_entity': 'organization', 'other': 'generic', 'custom': 'generic',
}
SAFE_ID = re.compile(r'^[A-Za-z0-9_]+$')


def tolerant_load(text):
    """M1: lectura tolerante (esquema §5.2). Devuelve (datos, cambios)."""
    changes = []
    try:
        return json.loads(text), changes
    except json.JSONDecodeError:
        pass
    t = text
    if t.startswith('﻿'):
        t = t[1:]
        changes.append('Se quitó el BOM del inicio')
    if re.search('[“”]', t):
        t = re.sub('[“”]', '"', t)
        changes.append('Comillas tipográficas convertidas en rectas')
    t2 = re.sub(r',(\s*[}\]])', r'\1', t)
    if t2 != t:
        changes.append('Comas finales eliminadas')
        t = t2
    t3 = re.sub(r'"([A-Za-z_][\w]*):"\s*([^"\n,{}\[\]]+?)"', r'"\1": "\2"', t)
    if t3 != t:
        changes.append('Claves con los dos puntos dentro de las comillas reparadas')
        t = t3
    return json.loads(t), changes  # si aún falla, lanza JSONDecodeError (no se repara más)


def schema_errors(data):
    try:
        import jsonschema
    except ImportError:
        return None
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'schemas', 'model-metadata.schema.json')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        schema = json.load(f)
    v = jsonschema.Draft202012Validator(schema)
    out = []
    for e in sorted(v.iter_errors(data), key=lambda e: list(map(str, e.path))):
        loc = '.'.join(str(p) for p in e.path) or '(raíz)'
        out.append(f'Estructura en {loc}: {e.message[:140]}')
    return out


def validate(d):
    errs, warns, info = [], [], []
    changes = []
    if not isinstance(d, dict):
        return ['M2 la raíz debe ser un objeto'], warns, info, changes

    # M2 / M3 estructura mínima
    for k in ('schema_version', 'model', 'dimensions', 'measures'):
        if k not in d:
            errs.append(f'M2 falta "{k}"')
    if errs:
        return errs, warns, info, changes
    m = d['model'] if isinstance(d['model'], dict) else {}
    for k in ('id', 'name', 'type'):
        if not m.get(k):
            errs.append(f'M2 model.{k} vacío o ausente')
    if m.get('type') and m['type'] not in ENUM['model_type']:
        errs.append(f'M3 model.type "{m["type"]}" no válido')

    dims = d['dimensions'] if isinstance(d['dimensions'], list) else []
    meas = d['measures'] if isinstance(d['measures'], list) else []

    # M4 ids únicos entre dimensiones y medidas
    ids = [x.get('id') for x in dims] + [x.get('id') for x in meas]
    dup = [i for i, c in collections.Counter(ids).items() if c > 1]
    if dup:
        errs.append(f'M4 ids duplicados entre dimensiones y medidas: {dup}')

    types = collections.Counter()
    for dim in dims:
        did = dim.get('id', '?')
        t = dim.get('type')
        if t in ALIAS:
            changes.append(f'{did}: tipo "{t}" normalizado a "{ALIAS[t]}"')
            t = ALIAS[t]
        if t not in ENUM['dim_type']:
            errs.append(f'M5 {did}: type "{t}" no válido')
        types[t] += 1
        if dim.get('granularity') and t != 'time':
            warns.append(f'{did}: granularity solo tiene sentido en dimensiones time')

        props = dim.get('properties', []) or []
        pids = [p.get('id') for p in props]
        if len(set(pids)) != len(pids):
            errs.append(f'M4 propiedades duplicadas en {did}')
        for p in props:
            if p.get('type', 'string') not in ENUM['prop_type']:
                errs.append(f'M7 {did}.{p.get("id")}: type de propiedad no válido')

        hs = dim.get('hierarchies', []) or []
        hids = [h.get('id') for h in hs]
        if len(set(hids)) != len(hids):
            errs.append(f'M4 jerarquías duplicadas en {did}')
        defaults = [h for h in hs if h.get('default')]
        if len(defaults) > 1:
            errs.append(f'M8 {did}: más de una jerarquía default')
        if hs and not defaults:
            warns.append(f'M16 {did}: jerarquías sin default (se usará la primera)')
        for h in hs:
            if 'kind' in h and h['kind'] not in ENUM['kind']:
                errs.append(f'M7 {did}.{h.get("id")}: kind no válido')
            if 'kind' not in h:
                warns.append(f'M16 {did}.{h.get("id")}: jerarquía sin kind')
            if 'levels' in h and h.get('kind') != 'level':
                errs.append(f'M8 {did}.{h.get("id")}: levels exige kind "level"')

        mem = dim.get('members', []) or []
        mids = [x.get('id') for x in mem]
        dm = [i for i, c in collections.Counter(mids).items() if c > 1]
        if dm:
            errs.append(f'M4 miembros duplicados en {did}: {dm[:5]}')
        sm = set(mids)
        parent = {x.get('id'): x.get('parent_id') for x in mem}
        for x in mem:
            p = x.get('parent_id')
            if p and p not in sm:
                errs.append(f'M9 {did}.{x.get("id")}: parent_id "{p}" no existe')
            for pk in (x.get('properties') or {}):
                if pk not in pids:
                    errs.append(f'M9 {did}.{x.get("id")}: propiedad "{pk}" no declarada')
        for x in mids:  # ciclos
            seen, cur = set(), x
            while cur in parent and parent[cur]:
                if cur in seen:
                    errs.append(f'M9 ciclo de padres en {did} (miembro {x})')
                    break
                seen.add(cur)
                cur = parent[cur]
        if len(mem) > 200:
            warns.append(f'M17 {did}: {len(mem)} miembros (se recomienda omitirlos por encima de 200)')
        ordered = dim.get('ordered', t == 'time')
        if ordered and t != 'time' and not mem:
            warns.append(f'M18 {did}: ordered=true sin miembros que fijen el orden')
        empty = sum(1 for x in mem if not (x.get('description') or '').strip())
        if empty:
            info.append(f'{did}: {empty}/{len(mem)} miembros sin descripción (se muestra el id)')
        if hs and mem:
            roots = [x for x in mids if not parent.get(x)]
            if len(roots) > 1:
                info.append(f'{did}: {len(roots)} raíces en la jerarquía ({", ".join(map(str, roots[:6]))}{"…" if len(roots) > 6 else ""})')
        for pid in pids:
            if mem and not any(pid in (x.get('properties') or {}) for x in mem):
                info.append(f'{did}.{pid}: ningún miembro trae valor')
        if not (dim.get('description') or '').strip():
            info.append(f'{did}: sin descripción (se muestra el id)')

    if types['time'] == 0:
        warns.append('M12 no hay dimensión de tiempo (todos los modelos la traen)')
    if any(types[k] > 1 for k in ('time', 'account', 'version')):
        warns.append('M13 hay más de una dimensión time, account o version')

    mset = {x.get('id') for x in meas}
    null_dec = 0
    for ms in meas:
        mid = ms.get('id', '?')
        if ms.get('unit') not in ENUM['unit']:
            errs.append(f'M6 {mid}: unit no válida')
        if ms.get('type') not in ENUM['mtype']:
            errs.append(f'M6 {mid}: type no válido')
        if ms.get('type') == 'fixed' and not ms.get('unit_value'):
            errs.append(f'M6 {mid}: fixed exige unit_value')
        if ms.get('type') == 'variable' and ms.get('unit_value') is not None:
            errs.append(f'M6 {mid}: variable exige unit_value null')
        for f, k in (('aggregation', 'agg'), ('time_aggregation', 'time_agg'), ('good_direction', 'good')):
            if f in ms and ms[f] not in ENUM[k]:
                errs.append(f'M7 {mid}: {f} no válido')
        if ms.get('aggregation') == 'semi-additive' and 'time_aggregation' not in ms:
            warns.append(f'M15 {mid}: semi-additive sin time_aggregation (se asume last)')
        c = ms.get('components')
        if c is not None and (c.get('numerator') not in mset or c.get('denominator') not in mset):
            errs.append(f'M10 {mid}: components apunta a medidas inexistentes')
        dec = ms.get('decimals')
        if dec is None:
            null_dec += 1
        elif isinstance(dec, bool) or not isinstance(dec, int) or not 0 <= dec <= 6:
            errs.append(f'M11 {mid}: decimals debe ser un entero de 0 a 6')
    if null_dec:
        info.append(f'decimals ausente o null en {null_dec} medidas (se aplica el valor por defecto de la unidad)')

    # M14 identificadores no seguros (una sola advertencia agregada)
    bad = [i for i in ids if isinstance(i, str) and not SAFE_ID.match(i)]
    for dim in dims:
        bad += [p.get('id') for p in dim.get('properties', []) or [] if not SAFE_ID.match(str(p.get('id')))]
    if bad:
        warns.append(f'M14 {len(bad)} ids con caracteres fuera de A-Z a-z 0-9 _ (se derivará una key segura): {bad[:6]}')
    return errs, warns, info, changes


def main(argv):
    as_json = '--json' in argv
    args = [a for a in argv[1:] if not a.startswith('--')]
    if len(args) != 1:
        print(__doc__)
        return 2
    try:
        with open(args[0], encoding='utf-8') as f:
            data, changes = tolerant_load(f.read())
    except (OSError, json.JSONDecodeError) as e:
        print(f'M1 No se puede leer el archivo: {e}')
        return 2
    errs, warns, info, ch = validate(data)
    changes += ch
    se = schema_errors(data)
    if se:
        errs += se
    if as_json:
        print(json.dumps({'errores': errs, 'advertencias': warns, 'info': info, 'cambios': changes}, ensure_ascii=False, indent=1))
    else:
        print('ERRORES:', *(errs or ['ninguno']), sep='\n  ')
        print('ADVERTENCIAS:', *(warns or ['ninguna']), sep='\n  ')
        print('CAMBIOS AL LEER:', *(changes or ['ninguno']), sep='\n  ')
        print('INFO:', *(info or ['—']), sep='\n  ')
        if se is None:
            print('(jsonschema no está instalado: se omitió la validación contra el esquema JSON)')
        n_d = len(data.get('dimensions', [])) if isinstance(data, dict) else 0
        n_m = len(data.get('measures', [])) if isinstance(data, dict) else 0
        print(f'dimensiones: {n_d} | medidas: {n_m}')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
