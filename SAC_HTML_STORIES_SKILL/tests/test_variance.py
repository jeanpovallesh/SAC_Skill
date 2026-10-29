#!/usr/bin/env python3
"""Prueba de punta a punta de `variance-table` (comparación entre versiones, D11): modelo de ejemplo + dimensión Version,
spec con comparison, generación, validación del paquete y render en Chromium (Playwright). Uso: python3 -I tests/test_variance.py"""
import copy, json, os, re, subprocess, sys, tempfile
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import validate_spec as vs, add_mandatory_filters as amf  # noqa: E402

fails = []
def check(name, cond):
    print(('OK    ' if cond else 'FALLA ') + name)
    if not cond: fails.append(name)

meta = json.load(open(os.path.join(ROOT, 'examples/models/model-metadata-distribucion.json'), encoding='utf-8'))
meta['dimensions'].append({'id': 'Version', 'description': 'Versión', 'type': 'version', 'ordered': False})
spec = vs.load_spec(os.path.join(ROOT, 'examples/02-scm-distribucion-zonas-canales.md'))
spec['components'] = [c for c in spec['components'] if c['id'] in ('kpiMargen', 'tablaCanales')]
spec['filters'] = [f for f in spec.get('filters', []) if f['target'] == 'Periodo' or True]
spec['measures'] = [m for m in spec['measures']]
spec['comparison'] = {'dimension': 'Version', 'mode': 'versus-version', 'appliesTo': ['varCanales']}
spec['components'].append({'id': 'varCanales', 'type': 'variance-table', 'title': 'Real vs Presupuesto', 'uses': {'rows': 'Canal', 'measures': ['Volumen', 'CostePct']},
                           'options': {'totalsRow': True}})
amf.patch(spec, meta)
spec['feeds'] = spec['feeds']
e, w = vs.validate(spec, meta)
check('variance-table: spec válida', not e)
if e: print('   ', e)
bad = copy.deepcopy(spec); bad['comparison']['dimension'] = 'Canal'
check('variance-table: versus-version sobre dimensión no-versión -> C21', any(x.startswith('C21') for x in vs.validate(bad, meta)[0]))
bad = copy.deepcopy(spec); bad['comparison']['mode'] = 'previous-period'
check('variance-table: modo no implementado -> C21', any(x.startswith('C21') for x in vs.validate(bad, meta)[0]))

tmp = tempfile.mkdtemp(prefix='var_')
sp, mp, out = [os.path.join(tmp, n) for n in ('spec.json', 'meta.json', 'out')]
json.dump(spec, open(sp, 'w', encoding='utf-8'), ensure_ascii=False); json.dump(meta, open(mp, 'w', encoding='utf-8'), ensure_ascii=False)
py = [sys.executable, '-I']
r = subprocess.run(py + [os.path.join(ROOT, 'scripts/generate_widget.py'), sp, mp, '--out', out, '--base-url', 'https://example.invalid/x'], capture_output=True, text=True)
check('variance-table: generación', r.returncode == 0)
tag = spec['widget']['tag']; base = os.path.join(out, tag)
r = subprocess.run(py + [os.path.join(ROOT, 'scripts/validate_bundle.py'), base + '.json', base + '.js', base + '_styling.js', '--spec', sp], capture_output=True, text=True)
check('variance-table: paquete sin errores', r.returncode == 0)
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print('(sin Playwright: se omite el render)'); sys.exit(1 if fails else 0)
fx = os.path.join(tmp, 'fx.json')
subprocess.run(py + [os.path.join(ROOT, 'tests/make_fixture.py'), sp, fx], capture_output=True, check=True)
src = open(base + '.js', encoding='utf-8').read(); data = json.load(open(fx, encoding='utf-8'))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 900}); errs = []
    pg.on('pageerror', lambda x: errs.append(str(x)))
    pg.set_content('<div id=h></div>'); pg.add_script_tag(content=src)
    pg.evaluate("""([t,fx])=>{const el=document.createElement(t);document.getElementById('h').appendChild(el);el.myDataBinding=fx;el.onCustomWidgetBeforeUpdate({});el.onCustomWidgetAfterUpdate({});window.w=el}""", [tag, data])
    pg.wait_for_timeout(300)
    q = lambda js: pg.evaluate("(js)=>{const r=window.w.shadowRoot;return eval(js)}", js)
    check('variance-table: con una sola versión pide elegir dos', 'al menos dos' in q("r.textContent"))
    q("r.querySelector('[data-f=fVersion]').click()"); pg.wait_for_timeout(80)
    q("r.querySelectorAll('.pn .op input')[1].click()"); pg.wait_for_timeout(150)
    check('variance-table: con dos versiones aparecen los selectores Base/Comparar', q("r.querySelectorAll('select[data-act=vsel]').length") == 2)
    check('variance-table: columnas Δ y Δ %', q("[...r.querySelectorAll('th')].filter(t=>t.textContent.trim()==='Δ'||t.textContent.trim()==='Δ %').length") == 4)
    check('variance-table: hay filas con Δ calculado', q("[...r.querySelectorAll('tbody td.pos, tbody td.neg')].length") > 0)
    q("(()=>{const s=r.querySelectorAll('select[data-act=vsel]')[1]; s.value=s.options[0].value; s.dispatchEvent(new Event('change',{bubbles:true}))})()"); pg.wait_for_timeout(120)
    sel = q("[...r.querySelectorAll('select[data-act=vsel]')].map(s=>s.value)")
    check('variance-table: Base y Comparar nunca coinciden', len(sel) == 2 and sel[0] != sel[1])
    check('variance-table: sin errores de página', not errs)
    pg.screenshot(path=os.path.join(tmp, 'variance.png'))
print('captura:', os.path.join(tmp, 'variance.png'))
sys.exit(1 if fails else 0)
