#!/usr/bin/env python3
"""Prueba de la auditoría de diseño (scripts/audit_design.py): el ejemplo 02 generado debe salir sin fallos, y un paquete
con defectos inyectados (sombra, degradado, texto claro, transición con movimiento reducido) debe fallar. Uso: python3 -I tests/test_audit.py"""
import json, os, subprocess, sys, tempfile
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import validate_spec as vs, add_mandatory_filters as amf  # noqa: E402

fails = []
def check(name, cond):
    print(('OK    ' if cond else 'FALLA ') + name)
    if not cond: fails.append(name)

meta = json.load(open(os.path.join(ROOT, 'examples/models/model-metadata-distribucion.json'), encoding='utf-8'))
spec = vs.load_spec(os.path.join(ROOT, 'examples/02-scm-distribucion-zonas-canales.md'))
amf.patch(spec, meta)
tmp = tempfile.mkdtemp(prefix='aud_'); py = [sys.executable, '-I']
sp, mp, out = [os.path.join(tmp, n) for n in ('spec.json', 'meta.json', 'out')]
json.dump(spec, open(sp, 'w', encoding='utf-8'), ensure_ascii=False); json.dump(meta, open(mp, 'w', encoding='utf-8'), ensure_ascii=False)
r = subprocess.run(py + [os.path.join(ROOT, 'scripts/generate_widget.py'), sp, mp, '--out', out, '--base-url', 'https://example.invalid/x'], capture_output=True, text=True)
check('auditoría: generación del ejemplo', r.returncode == 0)
js = os.path.join(out, spec['widget']['tag'] + '.js')
audit = lambda f, d: subprocess.run(py + [os.path.join(ROOT, 'scripts/audit_design.py'), f, sp, '--out', os.path.join(tmp, d)], capture_output=True, text=True)
r = audit(js, 'ok'); print(r.stdout[-700:])
check('auditoría: el ejemplo 02 no tiene fallos', r.returncode == 0 and 'Resultado: 0 fallo(s)' in r.stdout)
s = open(js, encoding='utf-8').read()
s = s.replace('.card{background:var(--c-superficie);', '.card{box-shadow:0 2px 8px #0003;background:linear-gradient(#fff,#eee);', 1).replace("'#45464d'", "'#c0c0c0'")
s = s.replace('@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}', '@media (prefers-reduced-motion:reduce){', 1)
bad = os.path.join(tmp, 'bad.js'); open(bad, 'w', encoding='utf-8').write(s)
r = audit(bad, 'bad'); o = r.stdout
check('auditoría: detecta sombra, degradado, contraste y movimiento reducido', r.returncode == 1 and all(k in o for k in ('sombra en tarjeta', 'degradado', 'contraste de texto', 'reduced-motion')))
print('\n%s' % ('todo OK' if not fails else '%d fallo(s)' % len(fails)))
sys.exit(1 if fails else 0)
