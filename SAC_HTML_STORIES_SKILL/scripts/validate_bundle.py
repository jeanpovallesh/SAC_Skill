#!/usr/bin/env python3
"""Valida el paquete de un widget de SAC: manifiesto + JS principal + JS de styling.
Reglas R1-R14 del contrato y las comprobaciones verificadas con la sonda
(references/sac-widget-contract.md §6, §3.4 y §8; widget-types.md C17).

Uso:   python3 -I validate_bundle.py <manifiesto.json> <principal.js> [<styling.js>] [--spec spec.json] [--json]
Salida: 0 sin errores, 1 con errores, 2 si no se puede leer un archivo.
Importable: validate(manifest_dict, main_js, styling_js, names, spec=None) -> (errores, advertencias)
El análisis del JS es estático (expresiones regulares y conteo de llaves): detecta los
fallos típicos de coherencia, no sustituye probar el widget en SAC.
"""
import json
import os
import re
import sys

SIMPLE = {'string', 'integer', 'number', 'boolean'}
TAG = re.compile(r'^[a-z][a-z0-9]*(-[a-z0-9]+)+$')
SEMVER = re.compile(r'^\d+\.\d+\.\d+$')
CLASS_METHOD_SKIP = {'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'constructor'}


# ---------------------------------------------------------------- utilidades de JS
def strip_comments(js):
    out, i, n, q = [], 0, len(js), None
    while i < n:
        c = js[i]
        if q:
            out.append(c)
            if c == '\\' and i + 1 < n:
                out.append(js[i + 1]); i += 2; continue
            if c == q:
                q = None
            i += 1; continue
        if c in '\'"`':
            q = c; out.append(c); i += 1; continue
        if js.startswith('//', i):
            while i < n and js[i] != '\n':
                i += 1
            continue
        if js.startswith('/*', i):
            j = js.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        out.append(c); i += 1
    return ''.join(out)


def match_brace(js, start):
    """Índice de la llave que cierra la abierta en `start` (ignora cadenas)."""
    depth, i, n, q = 0, start, len(js), None
    while i < n:
        c = js[i]
        if q:
            if c == '\\':
                i += 2; continue
            if c == q:
                q = None
            i += 1; continue
        if c in '\'"`':
            q = c
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def find_method(js, name):
    """Devuelve (cuerpo, es_async) del método de clase `name`, o None."""
    m = re.search(r'(?m)^[ \t]*(async\s+)?(?<![\w.])' + re.escape(name) + r'\s*\(([^)]*)\)\s*\{', js)
    if not m:
        return None
    end = match_brace(js, m.end() - 1)
    return js[m.end():end if end > 0 else len(js)], bool(m.group(1))


def class_methods(js):
    return {m.group(2) for m in re.finditer(r'(?m)^[ \t]*(async\s+|static\s+|get\s+|set\s+)?(\w+)\s*\([^)]*\)\s*\{', js)
            if m.group(2) not in CLASS_METHOD_SKIP}


def defined_tags(js):
    tags = re.findall(r'customElements\.define\(\s*[\'"]([^\'"]+)[\'"]', js)
    for var in re.findall(r'customElements\.define\(\s*([A-Za-z_]\w*)\s*,', js):  # define(TAG, Clase)
        m = re.search(r'\b(?:const|let|var)\s+' + re.escape(var) + r'\s*=\s*[\'"]([^\'"]+)[\'"]', js)
        if m:
            tags.append(m.group(1))
    return tags


# ---------------------------------------------------------------- validación
def validate(man, main_js, sty_js, names, spec=None):
    E, W = [], []
    err = lambda r, m: E.append(f'{r} {m}')
    warn = lambda r, m: W.append(f'{r} {m}')
    main = strip_comments(main_js)
    sty = strip_comments(sty_js) if sty_js is not None else None

    # ---- R12 identidad del manifiesto
    for k in ('id', 'version', 'name', 'newInstancePrefix'):
        if not man.get(k):
            err('R12', f'el manifiesto no tiene "{k}"')
    if man.get('id') and not re.fullmatch(r'[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+', man['id']):
        err('R12', f'id "{man["id"]}": debe ser dominio inverso en minúsculas')
    if man.get('version') and not SEMVER.match(man['version']):
        err('R12', f'version "{man["version"]}" debe ser x.y.z')
    if man.get('newInstancePrefix') and not re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', man['newInstancePrefix']):
        err('R12', 'newInstancePrefix: sin espacios ni símbolos')

    wcs = {w.get('kind'): w for w in man.get('webcomponents', []) or []}
    mw, sw = wcs.get('main'), wcs.get('styling')
    props = man.get('properties', {}) or {}
    methods = man.get('methods', {}) or {}
    events = man.get('events', {}) or {}
    bindings = man.get('dataBindings', {}) or {}
    if not mw:
        err('R12', 'falta webcomponents[kind=main]')
    if props and not sw:
        err('R12', 'hay propiedades pero no existe webcomponents[kind=styling]')
    for kind, w in wcs.items():
        url = w.get('url', '')
        if '{{BASE_URL}}' in url:
            warn('R12', f'{kind}: la url conserva el marcador {{{{BASE_URL}}}}; reemplazarlo antes de subir')
        elif not url.startswith('https://'):
            err('R12', f'{kind}: la url debe ser HTTPS ("{url[:50]}")')
        if not w.get('integrity') and w.get('ignoreIntegrity') is not True:
            warn('R12', f'{kind}: integrity vacío sin ignoreIntegrity:true')

    # ---- R3 formato de tags
    for kind, w in wcs.items():
        t = w.get('tag', '')
        if not TAG.match(t):
            err('R3', f'{kind}: tag "{t}" (minúsculas, con al menos un guion)')
        if re.search(r'(^|-)v\d+(-\d+)*$', t):
            err('R3', f'{kind}: tag "{t}" no debe llevar sufijo de versión')
    if sw and not sw.get('tag', '').endswith('-styling'):
        err('R3', f'el tag de styling "{sw.get("tag")}" debe terminar en -styling')
    if mw and sw and sw.get('tag') != mw.get('tag', '') + '-styling':
        warn('R3', 'el tag de styling debería ser el del principal más "-styling"')

    # ---- R1 / R2 tags registrados
    if mw:
        dt = defined_tags(main)
        if mw.get('tag') not in dt:
            err('R1', f'el manifiesto declara "{mw.get("tag")}" y el JS principal registra {dt or "ninguno"}')
        if len(dt) != 1:
            warn('R1', f'el JS principal debería registrar un solo elemento (registra {len(dt)})')
    if sw:
        if sty is None:
            err('R2', 'el manifiesto declara styling pero no se entregó el archivo')
        else:
            dt = defined_tags(sty)
            if sw.get('tag') not in dt:
                err('R2', f'el manifiesto declara "{sw.get("tag")}" y el styling registra {dt or "ninguno"}')

    # ---- estructura del Web Component
    for label, code in (('principal', main), ('styling', sty)):
        if code is None:
            continue
        if not re.match(r'\s*(\(\s*function|\(\s*\(\s*\)\s*=>|\(\s*async|!\s*function)', code):
            err('R-IIFE', f'el JS {label} debe ir dentro de una función autoejecutable (IIFE)')
        if 'attachShadow' not in code:
            err('R-SHADOW', f'el JS {label} debe usar shadow DOM (attachShadow)')
        if 'customElements.get' not in code:
            warn('R-SHADOW', f'el JS {label} debería proteger customElements.define con customElements.get')
        if 'extends HTMLElement' not in code:
            err('R-CLASS', f'la clase del JS {label} debe extender HTMLElement')
        if re.search(r'<script[^>]+src=|<link[^>]+href=\s*["\']https?:|@import|fonts\.googleapis|cdn\.tailwindcss', code):
            err('R-EXT', f'el JS {label} carga recursos externos (script, link, @import, fuentes web): el widget debe ser autocontenido')
        if re.search(r'localStorage|sessionStorage|document\.cookie', code):
            warn('R-STORE', f'el JS {label} usa almacenamiento del navegador; el estado del modelo no debe guardarse ahí')
    if 'onCustomWidgetAfterUpdate' not in main:
        err('R-LIFE', 'falta onCustomWidgetAfterUpdate en el JS principal')

    # ---- R4 / R5 métodos
    cm = class_methods(main)
    for name, md in methods.items():
        if name not in cm:
            err('R4', f'el método "{name}" del manifiesto no existe en la clase del JS principal')
            continue
        rt = md.get('returnType')
        if rt is not None:
            base = rt[:-2] if rt.endswith('[]') else rt
            if base not in SIMPLE:
                err('R5', f'{name}: returnType "{rt}" no es simple (string, integer, number, boolean o arreglos)')
        for p in md.get('parameters', []) or []:
            pb = p.get('type', '')
            pb = pb[:-2] if pb.endswith('[]') else pb
            if pb not in SIMPLE:
                err('R5', f'{name}: el parámetro "{p.get("name")}" tiene tipo "{p.get("type")}" no simple')
        body = find_method(main, name)
        if body:
            text, is_async = body
            if is_async or re.search(r'\breturn\s+(?:new\s+)?Promise\b|\breturn\b[^;]*\.then\s*\(|\breturn\s+await\b', text):
                err('R5', f'{name}: un método no devuelve promesas; guardar el resultado y exponerlo con un getX síncrono o un evento')
            if rt is None and re.search(r'\breturn\s+[^;\s}]', text):
                warn('R5', f'{name}: devuelve un valor pero no declara returnType')
            if rt is not None and not re.search(r'\breturn\b', text):
                err('R5', f'{name}: declara returnType "{rt}" pero no retorna nada')
            if rt in SIMPLE or (rt or '').endswith('[]'):
                if re.search(r'\breturn\s*[\{\[]', text) and not rt.endswith('[]'):
                    err('R5', f'{name}: declara "{rt}" pero devuelve un objeto o arreglo literal; usar JSON.stringify')
                if re.search(r'\breturn\s+this\.\w+\s*;', text) and rt == 'string':
                    warn('R5', f'{name}: comprobar que el campo devuelto sea una cadena (no un objeto)')

    # ---- R6 eventos
    for ev in events:
        if not re.search(r'dispatchEvent\(\s*new\s+(?:Custom)?Event\(\s*[\'"]' + re.escape(ev) + r'[\'"]', main):
            err('R6', f'el evento "{ev}" se declara pero el JS principal nunca lo dispara')

    # ---- R7 propiedades usadas en el principal
    cleaned = re.sub(r'\bthis\._props\.\w+\s*=\s*changed\.\w+\s*;?', '', main)
    cleaned = re.sub(r"['\"]\w+['\"]\s+in\s+changed", '', cleaned)
    for p in props:
        if not re.search(r'\b' + re.escape(p) + r'\b', cleaned):
            err('R7', f'la propiedad "{p}" no se usa en el JS principal')
        elif (re.match(r'(titulo|etiqueta|texto)_', p) and re.search(r'_?props\[\s*[\'"]' + p.split('_')[0] + r'_[\'"]\s*\+', main)):
            pass   # lectura dinámica de propiedades derivadas (S12): _props['titulo_' + id]
        elif not re.search(r'(?<![\w.])(?:this\.)?_?props\.' + re.escape(p) + r'\b|_?props\[[\'"]' + re.escape(p) + r'[\'"]\]|\bget\s+' + re.escape(p) + r'\b|\bthis\.' + re.escape(p) + r'\b|\bchanged\.' + re.escape(p), main):
            warn('R7', f'la propiedad "{p}" aparece en el JS principal pero no se lee desde _props: comprobar que se aplique')
        if not (props[p] or {}).get('description'):
            warn('R12', f'la propiedad "{p}" no tiene description')
        if 'default' not in (props[p] or {}):
            warn('R12', f'la propiedad "{p}" no tiene default')

    # ---- R8 / R9 styling
    if sty is not None:
        setters = set(re.findall(r'\bset\s+(\w+)\s*\(', sty))
        for p in props:
            if p not in setters:
                err('R8', f'el styling no tiene el setter "set {p}(value)"')
            if not re.search(r'id\s*=\s*["\']' + re.escape(p) + r'["\']|data-prop\s*=\s*["\']' + re.escape(p) + r'["\']|getElementById\(\s*["\']' + re.escape(p) + r'["\']|\{\s*' + re.escape(p) + r'\s*:|,\s*' + re.escape(p) + r'\s*:', sty):
                err('R8', f'el styling no tiene un control para la propiedad "{p}"')
        for s in setters:
            if s not in props:
                err('R9', f'el styling tiene el setter "{s}" que no es una propiedad del manifiesto')
        if props and 'propertiesChanged' not in sty:
            err('R9', 'el styling no dispara el evento propertiesChanged')
        for blk in re.findall(r'properties\s*:\s*\{([^}]*)\}', sty):
            for key in re.findall(r'(\w+)\s*:', blk):
                if key not in props:
                    err('R9', f'propertiesChanged envía "{key}", que no es una propiedad del manifiesto')

    # ---- R10 / R11 data binding
    for b in bindings:
        if not re.search(r'\bthis\.' + re.escape(b) + r'\b', main):
            err('R10', f'el JS principal no lee this.{b}')
    for used in set(re.findall(r'\bthis\.(\w*[Bb]inding\w*)\b(?!\s*\()', main)):
        if used not in bindings and used not in ('dataBindings',):
            err('R10', f'el JS principal lee this.{used}, que no es un binding del manifiesto ({list(bindings)})')
    feed_ids = {f['id'] for b in bindings.values() for f in b.get('feeds', [])}
    feed_types = {f['id']: f.get('type') for b in bindings.values() for f in b.get('feeds', [])}
    for pre, n in set(re.findall(r'\b([a-zA-Z]+)_(\d+)\b', main)):
        if pre in ('dimensions', 'measures', 'dims', 'props') and pre not in feed_ids:
            err('R11', f'el JS lee la columna {pre}_{n} pero el manifiesto no declara el feed "{pre}"')
    if bindings and not any(t == 'mainStructureMember' for t in feed_types.values()):
        warn('R11', 'ningún feed es de tipo mainStructureMember (medidas)')
    if spec:
        nf = len(spec.get('feeds', []))
        dim_feed_desc = ' '.join(f.get('description', '') for b in bindings.values() for f in b.get('feeds', []) if f.get('type') == 'dimension')
        if nf > 8:
            warn('R11', f'la especificación tiene {nf} feeds (>8)')
        for f in spec.get('feeds', []):
            if f['ref'].lower() not in dim_feed_desc.lower() and f['ref'].replace('_', ' ').lower() not in dim_feed_desc.lower():
                warn('R11', f'la description del feed de dimensiones no menciona "{f["ref"]}" (el usuario debe saber qué agregar y en qué orden)')

    # ---- binding: estados y copia de `changed`
    if bindings:
        if not re.search(r"state\s*(===|!==|==)\s*['\"]?(loading|success|error)|\.state\b", main):
            warn('R-STATE', 'el JS principal no revisa binding.state (success / loading / error)')
        elif 'loading' not in main:
            warn('R-STATE', 'el JS principal no trata state "loading": debe conservar el último render')
        if re.search(r'Object\.assign\(\s*\{\s*\}\s*,\s*this\._props\s*,\s*changed\w*\s*\)|\.\.\.\s*this\._props\s*,\s*\.\.\.\s*changed', main) \
                and not re.search(r'delete\s+\w+\.' + '|'.join(map(re.escape, bindings)) + r'|!==\s*[\'"](' + '|'.join(map(re.escape, bindings)) + ')', main):
            warn('R-STATE', 'onCustomWidgetBeforeUpdate copia `changed` entero: puede guardar el data binding dentro de las propiedades')

    # ---- R14 escape de textos de datos
    if re.search(r'innerHTML\s*[+]?=\s*[`\'"][^;]*\$\{', main):
        if not re.search(r'function\s+_?esc\w*|_?esc\w*\s*\(\s*\w*\s*\)\s*\{|\b_?escape\w*\s*\(', main):
            err('R14', 'se inserta HTML con interpolación (innerHTML + ${...}) y no hay función de escape')
        else:
            unescaped = [m.group(0) for m in re.finditer(r'\$\{\s*(?!_?esc|this\._?esc|String\(\s*Number|\w*\.toFixed|fmt|this\._?fmt)[^}]*(label|id|desc|name|title|text)\b[^}]*\}', main)]
            if unescaped:
                warn('R14', f'revisar {len(unescaped)} interpolación(es) con datos sin escape aparente, por ejemplo: {unescaped[0][:60]}')

    # ---- C17 jerarquías
    if re.search(r'\bsetHierarchy\s*\(', main):
        if not re.search(r"typeof\s+[\w.\[\]'\"]*setHierarchy\s*===?\s*['\"]function", main):
            err('C17', 'setHierarchy se llama sin protección con typeof … === "function"')
        if not re.search(r'\bsetHierarchyLevel\s*\(', main):
            err('C17', 'tras setHierarchy hay que volver a fijar el nivel con setHierarchyLevel (setHierarchy reinicia a la raíz)')
        if not re.search(r'catch\s*\(|\.catch\s*\(', main):
            warn('C17', 'las llamadas al origen de datos devuelven promesas: manejar el rechazo')
    for m in ('expandNode', 'collapseNode'):
        if re.search(r'\b' + m + r'\s*\(', main) and not re.search(r'typeof\s+[\w.\[\]\'"]*' + m + r'\s*===?\s*[\'"]function', main):
            err('C17', f'{m} se llama sin protección con typeof … === "function"')
    if re.search(r'getDataBinding\(', main) and not re.search(r'getDataSource\(', main):
        warn('C17', 'se obtiene el binding pero no su origen de datos (getDataSource)')

    # ---- R13 nombres de archivo
    for kind, f in (('main', names.get('main')), ('styling', names.get('styling'))):
        w = wcs.get(kind)
        if w and f:
            base = os.path.basename(w.get('url', '').split('?')[0])
            if base != f:
                err('R13', f'{kind}: la url apunta a "{base}" pero el archivo entregado se llama "{f}"')
    if man.get('id') and mw and mw.get('tag') != man['id'].replace('.', '-'):
        warn('R12', f'el tag principal "{mw.get("tag")}" no coincide con el id "{man["id"]}" (id con guiones)')
    return E, W


def main(argv):
    as_json = '--json' in argv
    spec_path = None
    args = []
    it = iter(argv[1:])
    for a in it:
        if a == '--spec':
            spec_path = next(it, None)
        elif not a.startswith('--'):
            args.append(a)
    if len(args) not in (2, 3):
        print(__doc__)
        return 2
    try:
        man = json.load(open(args[0], encoding='utf-8'))
        main_js = open(args[1], encoding='utf-8').read()
        sty_js = open(args[2], encoding='utf-8').read() if len(args) == 3 else None
        spec = json.load(open(spec_path, encoding='utf-8')) if spec_path else None
    except (OSError, ValueError) as e:
        print(f'No se puede leer un archivo: {e}')
        return 2
    names = {'main': os.path.basename(args[1]), 'styling': os.path.basename(args[2]) if len(args) == 3 else None}
    E, W = validate(man, main_js, sty_js, names, spec)
    if as_json:
        print(json.dumps({'errores': E, 'advertencias': W}, ensure_ascii=False, indent=1))
    else:
        print('ERRORES:', *(E or ['ninguno']), sep='\n  ')
        print('ADVERTENCIAS:', *(W or ['ninguna']), sep='\n  ')
    return 1 if E else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
