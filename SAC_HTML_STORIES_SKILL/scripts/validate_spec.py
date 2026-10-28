#!/usr/bin/env python3
"""Valida una especificación de widget (reglas S1-S14 y las C de componentes que se
comprueban sobre la especificación) contra el JSON de metadata del modelo.

Uso:   python3 -I validate_spec.py <spec.json|ejemplo.md> <metadata.json> [--json]
       (si el primer archivo es .md se toma su primer bloque ```json)
Salida: código 0 sin errores, 1 con errores, 2 si no se puede leer algún archivo.
Importable: validate(spec, meta) -> (errores, advertencias).
Referencias: references/widget-spec-schema.md (S), references/widget-types.md (C).
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spec_lib import IDENT, derived_properties  # noqa: E402

# tipo -> (claves permitidas en `uses`, claves obligatorias). None = no se comprueba (captura).
CATALOG = {
    'kpi-card': ({'measures', 'badge'}, {'measures'}),
    'kpi-card-split': ({'measures', 'split'}, {'measures', 'split'}),
    'kpi-card-vs-target': ({'measures', 'target', 'split', 'within'}, {'measures', 'target'}),
    'kpi-card-breakdown': ({'measures', 'breakdown'}, {'measures', 'breakdown'}),
    'pyramid-bars': ({'axis', 'series', 'measures'}, {'axis', 'series', 'measures'}),
    'stacked-100-bars': ({'axis', 'series', 'measures'}, {'axis', 'series', 'measures'}),
    'stacked-bars': ({'axis', 'series', 'measures'}, {'axis', 'series', 'measures'}),
    'donut-share': ({'axis', 'measures'}, {'axis', 'measures'}),
    'bubble-matrix': ({'axis', 'x', 'y', 'size'}, {'axis', 'x', 'y', 'size'}),
    'cross-matrix': ({'rows', 'columns', 'measures', 'series'}, {'rows', 'columns', 'measures'}),
    'detail-table': ({'rows', 'measures', 'properties'}, {'rows', 'measures'}),
    'pivot-table': ({'rows', 'columns', 'measures'}, {'rows', 'measures'}),
    'bubble-map': ({'axis', 'lat', 'lng', 'measures'}, {'axis', 'lat', 'lng', 'measures'}),
    'bar-compare': ({'axis', 'measures'}, {'axis', 'measures'}),
    'variance-table': ({'rows', 'measures'}, {'rows', 'measures'}),
    'line-trend': ({'axis', 'measures', 'series'}, {'axis', 'measures'}),
    'filter-bar': (set(), set()),
    'combobox-selector': None, 'capture-list': None, 'csv-import': None, 'json-preview': None,
}
DIM_KEYS = {'axis', 'series', 'split', 'rows', 'columns', 'breakdown', 'lat', 'lng'}
MEAS_KEYS = {'measures', 'x', 'y', 'size'}
NEEDS_COMPARISON = {'bar-compare', 'variance-table'}
REQUIRED_SECTIONS = ('request', 'widget', 'model', 'hosting', 'feeds', 'measures', 'components', 'assumptions')


def as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def load_spec(path):
    text = open(path, encoding='utf-8').read()
    if path.lower().endswith('.md'):
        m = re.search(r'```json\n(.*?)\n```', text, re.S)
        if not m:
            raise ValueError('el .md no contiene un bloque ```json')
        text = m.group(1)
    return json.loads(text)


def validate(spec, meta):
    E, W = [], []
    err = lambda r, m: E.append(f'{r} {m}')
    warn = lambda r, m: W.append(f'{r} {m}')

    for k in REQUIRED_SECTIONS:
        if k not in spec:
            err('S0', f'falta la sección obligatoria "{k}"')
    if E:
        return E, W

    # ---------- índices del modelo
    dims = {d['id']: d for d in meta.get('dimensions', [])}
    mmeas = {m['id'] for m in meta.get('measures', [])}
    acct_members = {x['id'] for d in dims.values() if d.get('type') in ('account', 'accounts')
                    for x in d.get('members', []) or []}

    # ---------- índices de la especificación
    feeds = spec['feeds']
    feed_refs = {f['ref']: f for f in feeds}
    smeas = {m['id']: m for m in spec['measures']}
    groupings = {g['id'] for g in spec.get('groupings', []) or []}
    props = {p['id']: p for p in spec.get('properties', []) or []}
    roles = spec.get('memberRoles', {}) or {}
    filters = spec.get('filters', []) or []
    comps = spec['components']
    # una propiedad en un feed actúa como agrupación: sirve como eje, serie, split…
    all_dim_refs = set(feed_refs) | groupings

    # ---------- S1: refs existen en el modelo
    for f in feeds:
        ref, role = f['ref'], f.get('role')
        if role == 'dimension':
            if ref not in dims and ref not in groupings:
                err('S1', f'feed "{ref}": no es una dimensión del modelo')
        elif role == 'property':
            of = f.get('of')
            if of not in dims:
                err('S1', f'feed "{ref}": la dimensión "{of}" no existe en el modelo')
            elif ref not in [p['id'] for p in dims[of].get('properties', []) or []]:
                err('S1', f'feed "{ref}": "{of}" no tiene esa propiedad en el modelo')
        else:
            err('S1', f'feed "{ref}": role "{role}" no válido (dimension o property)')
    for m in spec['measures']:
        ref = m.get('ref')
        if m.get('role') == 'ratio':
            continue
        if not ref:
            err('S1', f'medida "{m["id"]}": role "{m.get("role")}" sin ref')
        elif ref not in mmeas and ref not in acct_members:
            err('S1', f'medida "{m["id"]}": ref "{ref}" no existe en el modelo (medidas ni miembros de cuentas)')
    for dim, rl in roles.items():
        if dim not in dims:
            if feed_refs.get(dim, {}).get('role') != 'property':
                err('S1', f'memberRoles: "{dim}" no es una dimensión del modelo ni una propiedad de feeds')
            continue  # los miembros de una propiedad no están en la metadata
        members = {x['id'] for x in dims[dim].get('members', []) or []}
        for role, ids in rl.items():
            for i in as_list(ids):
                if str(i).startswith('<'):
                    warn('S1', f'memberRoles.{dim}.{role}: "{i}" sigue por confirmar')
                elif members and i not in members:
                    err('S1', f'memberRoles.{dim}.{role}: el miembro "{i}" no existe en el modelo')
    for g in spec.get('groupings', []) or []:
        src = g.get('from')
        known = set(dims) | mmeas | {p['id'] for d in dims.values() for p in d.get('properties', []) or []}
        if src not in known:
            warn('S1', f'groupings.{g["id"]}: "from" = "{src}" no aparece en el modelo')

    # ---------- S2 / S3 / S11: feeds
    for f in feeds:
        if f.get('role') == 'property' and f.get('of') not in {r for r, x in feed_refs.items() if x.get('role') == 'dimension'}:
            err('S2', f'propiedad "{f["ref"]}": su dimensión "{f.get("of")}" no está en feeds')
    idx = [f.get('index') for f in feeds]
    if idx != list(range(len(feeds))):
        err('S3', f'feeds[].index debe ser consecutivo desde 0 (llegó {idx})')
    rank = lambda f: (2 if f.get('role') == 'property' else (1 if f.get('optional') else 0))
    ranks = [rank(f) for f in sorted(feeds, key=lambda f: f.get('index', 0))]
    if ranks != sorted(ranks):
        err('S3', 'orden de feeds: dimensiones requeridas, luego opcionales, luego propiedades')
    if len(feeds) > 8:
        warn('S11', f'{len(feeds)} feeds (el máximo recomendado es 8): considerar filtros de la story')

    # ---------- S4: filtros
    for fl in filters:
        if fl.get('target') not in feed_refs:
            err('S4', f'filtro "{fl.get("id")}": target "{fl.get("target")}" no está en feeds')
        # C16
        if fl.get('cascade'):
            tgt = feed_refs.get(fl.get('target'), {})
            if not tgt.get('hierarchy'):
                err('C16', f'filtro "{fl.get("id")}": cascade exige un feed con hierarchy')

    # ---------- S6: ratios
    for m in spec['measures']:
        if m.get('role') == 'ratio':
            for k in ('numerator', 'denominator'):
                comp = m.get(k)
                if comp in smeas:
                    continue
                if m.get('optional') and comp not in mmeas:
                    warn('S6', f'ratio opcional "{m["id"]}": {k} "{comp}" no está en el modelo; el ratio se ocultará')
                elif comp in mmeas:
                    err('S6', f'ratio "{m["id"]}": {k} "{comp}" existe en el modelo pero no está declarado en measures (el widget no lo leería)')
                else:
                    err('S6', f'ratio "{m["id"]}": {k} "{comp}" no está definido en measures ni en el modelo')

    # ---------- componentes: S5, S7, S12, C1-C16
    comp_ids = [c.get('id') for c in comps]
    if len(set(comp_ids)) != len(comp_ids):
        err('C0', 'ids de componentes repetidos')
    dim_of = lambda ref: feed_refs.get(ref, {}).get('of') if feed_refs.get(ref, {}).get('role') == 'property' else ref
    sel_groups = {}
    rows_by_layout = {}
    for c in comps:
        cid, ctype = c.get('id', '?'), c.get('type')
        uses, opts = c.get('uses', {}) or {}, c.get('options', {}) or {}
        if ctype not in CATALOG:
            err('C1', f'{cid}: type "{ctype}" no está en el catálogo')
            continue
        spec_t = CATALOG[ctype]
        if spec_t is not None:
            allowed, required = spec_t
            for k in uses:
                if k not in allowed:
                    err('C2', f'{cid} ({ctype}): la clave uses.{k} no es válida para este tipo')
            for k in required:
                if k not in uses or not as_list(uses[k]):
                    err('C4', f'{cid} ({ctype}): falta uses.{k}')
        # S5 / C3 / C10
        for k, v in uses.items():
            for ref in as_list(v):
                if k in DIM_KEYS:
                    if ref not in all_dim_refs:
                        err('S5', f'{cid}: uses.{k} = "{ref}" no es una dimensión de feeds/groupings')
                elif k in MEAS_KEYS:
                    if ref not in smeas:
                        err('S5', f'{cid}: uses.{k} = "{ref}" no es una medida de la especificación')
                elif k == 'target':
                    if ref not in props:
                        err('C7' if ctype == 'kpi-card-vs-target' else 'S5', f'{cid}: la propiedad target "{ref}" no existe')
                elif k == 'within':
                    d, _, r = str(ref).partition(':')
                    if d not in all_dim_refs:
                        err('S5', f'{cid}: within "{ref}": la dimensión "{d}" no está en feeds')
                    elif r not in (roles.get(d) or {}):
                        err('S5', f'{cid}: within "{ref}": el rol "{r}" no está en memberRoles.{d}')
                elif k == 'badge':
                    if ref not in smeas and ref not in props:
                        err('S5', f'{cid}: uses.badge = "{ref}" no existe')
                elif k == 'properties':
                    if ref not in feed_refs:
                        err('S5', f'{cid}: uses.properties = "{ref}" no está en feeds')
        for ref in as_list(c.get('requires')):
            if ref not in feed_refs and ref not in smeas and ref not in props and ref not in groupings:
                err('S5', f'{cid}: requires "{ref}" no existe en feeds, medidas ni propiedades')
        # S7 / C9
        if filters:
            used = [m for k in MEAS_KEYS for m in as_list(uses.get(k))]
            for m in used:
                if smeas.get(m, {}).get('aggregation') == 'non-additive':
                    if not opts.get('hideWhenFiltered'):
                        err('S7', f'{cid}: usa la medida non-additive "{m}" con filtros activos sin hideWhenFiltered')
                    if not any(m in str(a) for a in spec.get('assumptions', [])):
                        warn('C9', f'{cid}: declarar en assumptions el aviso de la medida non-additive "{m}"')
        # S12: los textos fijos pasan a ser propiedades derivadas (spec_lib.derived_properties)
        if not IDENT.match(str(cid)):
            err('S12', f'id de componente "{cid}": solo letras, números y _ (se usa para nombrar propiedades)')
        # C5
        grp = opts.get('selectionGroup')
        if grp:
            axis = uses.get('axis') or uses.get('rows')
            sel_groups.setdefault(grp, set()).add(dim_of(axis[0] if isinstance(axis, list) else axis))
        # C6
        if ctype == 'pyramid-bars':
            s = uses.get('series')
            s = s[0] if isinstance(s, list) else s
            if len(roles.get(s) or {}) != 2:
                err('C6', f'{cid}: pyramid-bars exige exactamente dos roles en memberRoles.{s} (o degradar a stacked-100-bars)')
        # C7
        if ctype == 'kpi-card-vs-target' and uses.get('split') and not opts.get('focus'):
            err('C7', f'{cid}: con split hace falta options.focus')
        # C8
        refs = []
        for k in ('yReference', 'xReference'):
            if isinstance(opts.get(k), str) and opts[k] not in ('median', 'mean'):
                refs.append(opts[k])
        st = opts.get('status') or {}
        for b in st.get('bands', []) or []:
            for k in ('below', 'above', 'label'):
                if isinstance(b.get(k), str):
                    refs.append(b[k])
            refs += [x for x in as_list(b.get('between')) if isinstance(x, str)]
        for r in refs:
            if r not in props:
                err('C8', f'{cid}: la propiedad "{r}" (status/referencia) no existe en properties')
            elif 'default' not in props[r]:
                err('C8', f'{cid}: la propiedad "{r}" no tiene default')
        # C11
        cmp_ = spec.get('comparison')
        if ctype in NEEDS_COMPARISON or opts.get('showDelta') or opts.get('variation'):
            if not cmp_ or cid not in as_list(cmp_.get('appliesTo')):
                err('C11', f'{cid}: requiere "comparison" con el componente en appliesTo')
        # C12
        lay = c.get('layout') or {}
        if 'span' in lay:
            rows_by_layout[lay.get('row')] = rows_by_layout.get(lay.get('row'), 0) + lay['span']
        # C19 bubble-map: coordenadas desde propiedades de la dimensión del eje
        if ctype == 'bubble-map':
            ax = (as_list(uses.get('axis')) or [None])[0]
            for k in ('lat', 'lng'):
                r = (as_list(uses.get(k)) or [None])[0]
                f = feed_refs.get(r, {})
                if r and (f.get('role') != 'property' or f.get('of') != dim_of(ax)):
                    err('C19', f'{cid}: uses.{k} = "{r}" debe ser una propiedad (feed role property) de la dimensión del eje "{ax}"')
            if (as_list(uses.get('lat')) or [None])[0] == (as_list(uses.get('lng')) or [None])[0]:
                err('C19', f'{cid}: lat y lng deben ser propiedades distintas')
            if not isinstance(opts.get('country'), str) or not opts.get('country'):
                err('C19', f'{cid}: falta options.country (nombre del país en inglés, para el contorno del mapa)')
        # C20 pivot-table
        if ctype == 'pivot-table':
            rr, cc = as_list(uses.get('rows')), as_list(uses.get('columns'))
            if set(rr) & set(cc):
                err('C20', f'{cid}: una dimensión no puede estar en filas y columnas a la vez: {sorted(set(rr) & set(cc))}')
            if len(rr) > 4 or len(cc) > 3:
                warn('C20', f'{cid}: más de 4 niveles de filas o 3 de columnas hace la tabla difícil de leer')
        # C13 / C15 / S14
        tree = opts.get('tree')
        axis_ref = uses.get('rows') if tree else (uses.get('axis') or uses.get('rows'))
        axis_ref = axis_ref[0] if isinstance(axis_ref, list) and axis_ref else axis_ref
        has_h = bool(feed_refs.get(axis_ref, {}).get('hierarchy'))
        if tree:
            if ctype not in ('detail-table', 'cross-matrix'):
                err('C13', f'{cid}: options.tree solo en detail-table o cross-matrix')
            if not has_h:
                err('C13', f'{cid}: el eje de filas "{axis_ref}" no es un feed con hierarchy')
                err('S14', f'{cid}: options.tree usa como filas un feed sin hierarchy')
        if 'level' in opts:
            if tree:
                err('C15', f'{cid}: options.level no se combina con options.tree')
            if not has_h:
                err('C15', f'{cid}: options.level exige un eje que sea un feed con hierarchy')
    for g, ds in sel_groups.items():
        if len(ds) > 1:
            err('C5', f'selectionGroup "{g}": los componentes usan dimensiones distintas {sorted(map(str, ds))}')
    for row, tot in rows_by_layout.items():
        if tot > 12:
            err('C12', f'fila {row}: la suma de span es {tot} (> 12)')

    # ---------- S8: propiedades
    for p in spec.get('properties', []) or []:
        if not p.get('appliesTo'):
            err('S8', f'propiedad "{p["id"]}": falta appliesTo')
        if 'default' not in p or p['default'] is None:
            err('S8', f'propiedad "{p["id"]}": falta default')

    # ---------- S12: propiedades derivadas
    declared = [p['id'] for p in spec.get('properties', []) or []]
    for d in derived_properties(spec):
        if d['id'] in declared:
            if d['id'] != 'nivelExpansionInicial':
                err('S12', f'la propiedad derivada "{d["id"]}" colisiona con una propiedad declarada')
    for fl in filters:
        if not IDENT.match(str(fl.get('id'))):
            err('S12', f'id de filtro "{fl.get("id")}": solo letras, números y _')
    for c in comps:
        if c.get('type') not in ('filter-bar',) and 'title' not in c:
            warn('S12', f'{c.get("id")}: sin title (el componente se dibuja sin encabezado)')

    # ---------- S9: identidad
    w = spec['widget']
    wid, tag, ver, pre = w.get('id', ''), w.get('tag', ''), w.get('version', ''), w.get('prefix', '')
    if not re.fullmatch(r'[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}', wid):
        err('S9', f'widget.id "{wid}": dominio inverso en minúsculas (por ejemplo com.empresa.nombre)')
    if tag != wid.replace('.', '-'):
        err('S9', f'widget.tag "{tag}" debe ser el id con los puntos cambiados por guiones')
    if re.search(r'(^|-)v\d+(-\d+)*$|-\d+(\.\d+)*$', tag):
        err('S9', f'widget.tag "{tag}" no debe llevar sufijo de versión')
    if not re.fullmatch(r'\d+\.\d+\.\d+', ver):
        err('S9', f'widget.version "{ver}" debe ser x.y.z')
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', pre or ''):
        err('S9', f'widget.prefix "{pre}" debe ser alfanumérico y empezar con letra')
    elif wid and pre.lower() not in wid.split('.')[-1] and wid.split('.')[-1] not in pre.lower():
        warn('S9', f'widget.prefix "{pre}" no se parece al último tramo del id "{wid.split(".")[-1]}"')
    if w.get('scope') != 'contenido':
        warn('S9', 'widget.scope debería ser "contenido" (D1)')
    base = (spec['hosting'] or {}).get('baseUrl', '')
    if not base:
        err('S9', 'hosting.baseUrl vacío (usar {{BASE_URL}} si no se conoce)')

    # ---------- S10
    if not spec['assumptions']:
        warn('S10', 'assumptions está vacío: el skill debe declarar las decisiones que tomó')

    # ---------- S13 / C14: jerarquías
    for f in feeds:
        h = f.get('hierarchy')
        if not h:
            continue
        mh = {x['id'] for x in dims.get(f['ref'], {}).get('hierarchies', []) or []}
        for hid in as_list(h.get('available')):
            if hid not in mh:
                err('S13', f'feed "{f["ref"]}": la jerarquía "{hid}" no existe en el modelo')
        if h.get('default') and h['default'] not in as_list(h.get('available')):
            err('S13', f'feed "{f["ref"]}": hierarchy.default no está en available')
        if h.get('selectable') and 'nivelExpansionInicial' not in props:
            warn('S14', f'feed "{f["ref"]}": selectable implica la propiedad nivelExpansionInicial (el skill la agrega)')
    return E, W


def main(argv):
    as_json = '--json' in argv
    args = [a for a in argv[1:] if not a.startswith('--')]
    if len(args) != 2:
        print(__doc__)
        return 2
    try:
        spec = load_spec(args[0])
        with open(args[1], encoding='utf-8') as f:
            meta = json.load(f)
    except (OSError, ValueError) as e:
        print(f'No se puede leer un archivo: {e}')
        return 2
    E, W = validate(spec, meta)
    if as_json:
        print(json.dumps({'errores': E, 'advertencias': W}, ensure_ascii=False, indent=1))
    else:
        print('ERRORES:', *(E or ['ninguno']), sep='\n  ')
        print('ADVERTENCIAS:', *(W or ['ninguna']), sep='\n  ')
        print(f'componentes: {len(spec.get("components", []))} | feeds: {len(spec.get("feeds", []))}')
    return 1 if E else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
