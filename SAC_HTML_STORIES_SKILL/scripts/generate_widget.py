#!/usr/bin/env python3
"""Genera los tres archivos del widget (manifiesto, JS principal, styling) desde una especificación.

Uso: python3 -I scripts/generate_widget.py <spec.(json|md)> <metadata.json> --out <carpeta> [--base-url URL]
Los archivos salen SOLO de la especificación: no se editan a mano (regenerar).
"""
import argparse, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import spec_lib                      # noqa: E402
import validate_spec                 # noqa: E402

RT = os.path.join(HERE, '..', 'templates', 'runtime')
ORDER = ['00-util.js', '10-data.js', '20-engine.js', '30-ui.js', '35-charts.js']
TYPE_MAP = {'string': 'string', 'integer': 'integer', 'number': 'number', 'boolean': 'boolean'}


def js(o):
    return json.dumps(o, ensure_ascii=False, indent=1).replace('</', '<\\/')


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def time_dim(spec):
    for f in spec.get('feeds', []):
        if 'time' in (f.get('usedFor') or []):
            return f['ref']
    return None


def split_feeds(spec):
    dims = sorted([f for f in spec['feeds'] if f['role'] == 'dimension'], key=lambda f: f['index'])
    props = sorted([f for f in spec['feeds'] if f['role'] == 'property'], key=lambda f: f['index'])
    return dims, props


def manifest(spec, base_url, names):
    w = spec['widget']
    props = spec_lib.all_properties(spec)
    pj = {}
    for p in props:
        pj[p['id']] = {'type': TYPE_MAP.get(p.get('type'), 'string'),
                       'description': p.get('label') or p['id'], 'default': p.get('default')}
    dims, fprops = split_feeds(spec)
    values = [m for m in spec['measures'] if m['role'] == 'value']
    feeds = []
    order = []
    if dims:
        feeds.append({'id': 'dims', 'description': 'Dimensiones, en este orden: ' + ', '.join('%s (%s)' % (f.get('label') or f['ref'], f['ref']) for f in dims), 'type': 'dimension'})
        order.append(('dims', [f.get('label') or f['ref'] for f in dims]))
    if fprops:
        feeds.append({'id': 'props', 'description': 'Propiedades de dimensión (agregar como dimensión): ' + ', '.join('%s (%s)' % (f.get('label') or f['ref'], f['ref']) for f in fprops), 'type': 'dimension'})
    feeds.append({'id': 'measures', 'description': 'Medidas: ' + ', '.join(m['ref'] for m in values), 'type': 'mainStructureMember'})
    methods, events = {}, {}
    for m in spec.get('methods') or []:
        nm = m.get('name') or m.get('id')
        d = {'description': m.get('description') or nm}
        if m.get('returnType'):
            d['returnType'] = m['returnType']
        if m.get('parameters'):
            d['parameters'] = m['parameters']
        methods[nm] = d
    for e in spec.get('events') or []:
        nm = e.get('name') or e.get('id')
        events[nm] = {'description': e.get('description') or nm}
    return {
        'id': w['id'], 'version': w['version'], 'name': w['name'], 'description': w.get('description', ''),
        'newInstancePrefix': w['prefix'], 'icon': '', 'vendor': 'ISITEC', 'eula': '', 'license': '',
        'webcomponents': [
            {'kind': 'main', 'tag': w['tag'], 'url': f'{base_url}/{names["main"]}', 'integrity': '', 'ignoreIntegrity': True},
            {'kind': 'styling', 'tag': w['tag'] + '-styling', 'url': f'{base_url}/{names["styling"]}', 'integrity': '', 'ignoreIntegrity': True},
        ],
        'properties': pj, 'methods': methods, 'events': events,
        'dataBindings': {'myDataBinding': {'feeds': feeds}},
    }


def group_of(p):
    pid = p['id']
    if pid == 'title':
        return 'Widget'
    if pid.startswith('etiqueta_'):
        return 'Filtros'
    m = re.match(r'(?:titulo|texto)_([A-Za-z0-9]+?)(?:_|$)', pid)
    if p.get('derived') and m:
        return 'Componente ' + m.group(1)
    return 'Umbrales y metas'


def main_js(spec, meta_hint):
    w = spec['widget']
    props = spec_lib.all_properties(spec)
    model = {'timeDim': time_dim(spec)}
    s = {k: v for k, v in spec.items() if k not in ('request', 'assumptions', 'model', 'hosting', 'widget')}
    s['_model'] = model
    s['_widget'] = {'tag': w['tag'], 'version': w['version']}
    pdefs = [{'id': p['id'], 'default': p.get('default')} for p in props]
    parts = [read(os.path.join(RT, f)) for f in ORDER]
    comp_dir = os.path.join(RT, 'components')
    used = {c['type'] for c in spec['components']}
    missing = []
    comps = []
    for t in sorted(used):
        # un archivo de componente puede registrar varios tipos
        found = False
        for fn in sorted(os.listdir(comp_dir)):
            txt = read(os.path.join(comp_dir, fn))
            if re.search(r"COMPONENTS\['" + re.escape(t) + r"'\]", txt):
                if txt not in comps:
                    comps.append(txt)
                found = True
        if not found:
            missing.append(t)
    if any('needs:echarts' in t for t in comps):
        vend = read(os.path.join(RT, '..', 'vendor', 'echarts-5.5.1.min.js'))
    else:
        vend = ''
    parts += comps + [read(os.path.join(RT, '40-filters.js')), read(os.path.join(RT, '90-widget.js'))]
    head = ("/* %s v%s · generado por SAC_HTML_STORIES_SKILL · NO editar: regenerar desde la especificación */\n"
            "(function () {\n'use strict';\nvar TAG = %s;\nvar SPEC = %s;\nvar PROP_DEFS = %s;\n") % (
        w['name'], w['version'], json.dumps(w['tag']), js(s), js(pdefs))
    tail = "\nif (!customElements.get(TAG)) customElements.define(TAG, Widget);\n})();\n"
    return head + vend + '\n' + '\n'.join(parts) + tail, missing


def styling_js(spec):
    w = spec['widget']
    props = spec_lib.all_properties(spec)
    cls = re.sub(r'[^A-Za-z0-9]', '', w['prefix']) + 'Styling'
    groups = {}
    for p in props:
        groups.setdefault(group_of(p), []).append(p)
    html = []
    for g, ps in groups.items():
        html.append('<fieldset><legend>%s</legend>' % g.replace('<', ''))
        for p in ps:
            lab = (p.get('label') or p['id']).replace('<', '&lt;').replace('"', '&quot;')
            t = p.get('type')
            if t in ('integer', 'number'):
                ctl = '<input id="%s" type="number"%s>' % (p['id'], ' step="1"' if t == 'integer' else ' step="any"')
            elif t == 'boolean':
                ctl = '<input id="%s" type="checkbox">' % p['id']
            else:
                ctl = '<input id="%s" type="text">' % p['id']
            html.append('<label for="%s">%s</label>%s' % (p['id'], lab, ctl))
        html.append('</fieldset>')
    tpl = ('<style>:host{display:block;font:12px Arial,sans-serif;padding:8px}fieldset{border:1px solid #c6c6cd;border-radius:6px;margin:0 0 8px;padding:6px 8px}'
           'legend{font-weight:600}label{display:block;margin:6px 0 2px}input[type=text],input[type=number]{width:100%;box-sizing:border-box;padding:4px}</style>'
           + ''.join(html))
    lines = []
    lines.append("(function () {\n  'use strict';\n  var TAG = %s;\n  var tpl = document.createElement('template');\n  tpl.innerHTML = %s;\n" % (json.dumps(w['tag'] + '-styling'), json.dumps(tpl, ensure_ascii=False)))
    lines.append("  class %s extends HTMLElement {\n    constructor() {\n      super();\n      this._root = this.attachShadow({ mode: 'open' });\n      this._root.appendChild(tpl.content.cloneNode(true));\n      var self = this;" % cls)
    for p in props:
        i = p['id']
        t = p.get('type')
        if t == 'boolean':
            lines.append("      this._el_%s = this._root.getElementById('%s');\n      this._el_%s.addEventListener('change', function () { self._fire({ %s: self._el_%s.checked }); });" % (i, i, i, i, i))
        elif t in ('integer', 'number'):
            conv = 'parseInt(self._el_%s.value, 10)' % i if t == 'integer' else 'parseFloat(self._el_%s.value)' % i
            lines.append("      this._el_%s = this._root.getElementById('%s');\n      this._el_%s.addEventListener('change', function () { var n = %s; self._fire({ %s: isNaN(n) ? 0 : n }); });" % (i, i, i, conv, i))
        else:
            lines.append("      this._el_%s = this._root.getElementById('%s');\n      this._el_%s.addEventListener('change', function () { self._fire({ %s: self._el_%s.value }); });" % (i, i, i, i, i))
    lines.append("    }\n    _fire(props) {\n      this.dispatchEvent(new CustomEvent('propertiesChanged', { detail: { properties: props } }));\n    }")
    for p in props:
        i = p['id']
        if p.get('type') == 'boolean':
            lines.append("    set %s(v) { this._el_%s.checked = !!v; }\n    get %s() { return this._el_%s.checked; }" % (i, i, i, i))
        else:
            lines.append("    set %s(v) { this._el_%s.value = v == null ? '' : v; }\n    get %s() { return this._el_%s.value; }" % (i, i, i, i))
    lines.append("  }\n  if (!customElements.get(TAG)) customElements.define(TAG, %s);\n})();\n" % cls)
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('spec'); ap.add_argument('meta'); ap.add_argument('--out', required=True)
    ap.add_argument('--base-url', default=None)
    a = ap.parse_args()
    spec = validate_spec.load_spec(a.spec)
    meta = json.load(open(a.meta, encoding='utf-8')) if os.path.exists(a.meta) else {}
    E, W = validate_spec.validate(spec, meta) if meta else ([], [])
    if E:
        print('La especificación tiene errores; no se genera:'); [print(' ', e) for e in E]; return 1
    base = (a.base_url or spec.get('hosting', {}).get('baseUrl') or '{{BASE_URL}}').rstrip('/')
    tag = spec['widget']['tag']
    names = {'main': tag + '.js', 'styling': tag + '_styling.js', 'manifest': tag + '.json'}
    os.makedirs(a.out, exist_ok=True)
    js_main, missing = main_js(spec, meta)
    with open(os.path.join(a.out, names['main']), 'w', encoding='utf-8') as f:
        f.write(js_main)
    with open(os.path.join(a.out, names['styling']), 'w', encoding='utf-8') as f:
        f.write(styling_js(spec))
    with open(os.path.join(a.out, names['manifest']), 'w', encoding='utf-8') as f:
        json.dump(manifest(spec, base, names), f, ensure_ascii=False, indent=2)
    print('Generado en', a.out, ':', ', '.join(names.values()))
    if missing:
        print('AVISO: tipos de componente sin plantilla (se muestran como "no disponible"):', ', '.join(missing))
    for w_ in W:
        print('aviso', w_)
    return 0


if __name__ == '__main__':
    sys.exit(main())
