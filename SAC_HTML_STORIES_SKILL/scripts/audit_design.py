#!/usr/bin/env python3
"""Auditoría de diseño de un widget ya generado (design-guidelines.md §9).
Renderiza el JS en Chromium (Playwright) con una fixture sintética a 320, 600 y 900 px y comprueba lo que se puede medir:
errores de consola, desbordes, contraste de texto, tamaño mínimo de texto, foco visible con teclado, tamaño de áreas pulsables,
descripción de los gráficos, movimiento con prefers-reduced-motion, sombras/degradados/cifras gigantes y alineación de cifras.
Deja una captura por ancho para la revisión visual (lo que no se mide: un color por miembro, variaciones, jerarquía).

Uso: audit_design.py <widget.js> <spec.json> [--out carpeta] [--widths 320,600,900]
Salida: informe en texto; código 1 si hay fallos (F), 0 si solo hay avisos (A) o todo está bien."""
import argparse, json, os, re, subprocess, sys, tempfile

ap = argparse.ArgumentParser()
ap.add_argument('js'); ap.add_argument('spec')
ap.add_argument('--out', default=None); ap.add_argument('--widths', default='320,600,900')
a = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__))
out = os.path.abspath(a.out or tempfile.mkdtemp(prefix='audit_')); os.makedirs(out, exist_ok=True)
src = open(a.js, encoding='utf-8').read()
tag = re.search(r'var TAG = "([^"]+)"', src).group(1)
fx_path = os.path.join(out, 'fixture.json')
subprocess.run([sys.executable, '-I', os.path.join(HERE, '..', 'tests', 'make_fixture.py'), a.spec, fx_path, '--seed', '7'], check=True, capture_output=True)
fx = json.load(open(fx_path, encoding='utf-8'))

from playwright.sync_api import sync_playwright  # noqa: E402

# Utilidades dentro de la página: color efectivo, contraste y chequeos sobre el shadow DOM del widget.
JS = r"""
() => {
  const root = window.__w.shadowRoot, host = window.__w;
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const bgOf = el => { const chain = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { chain.push(c); if (c.a >= 1) break; } } let b = { r: 255, g: 255, b: 255, a: 1 }; for (let i = chain.length - 1; i >= 0; i--) b = over(chain[i], b); return b; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const name = el => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '')) + ((el.textContent || '').trim().slice(0, 24) ? ' «' + el.textContent.trim().slice(0, 24) + '»' : '');
  const res = { contrast: [], small: [], overflow: [], shadow: [], gradient: [], huge: [], numAlign: [], targets: [], dots: [], charts: [], docOverflow: false };
  const all = Array.from(root.querySelectorAll('*'));
  // texto
  all.forEach(el => {
    if (el.closest('style')) return;
    const own = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own || !vis(el)) return;
    const s = getComputedStyle(el), svg = el instanceof SVGElement;
    const fg0 = parse(svg ? s.fill : s.color); if (!fg0) return;
    const bg = bgOf(el), fg = over(fg0, bg), size = parseFloat(s.fontSize), bold = parseInt(s.fontWeight) >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5, r = ratio(fg, bg);
    if (r < need) res.contrast.push(name(el) + ' → ' + r.toFixed(2) + ':1 (mín. ' + need + ')');
    if (size < 11.5 && !svg) res.small.push(name(el) + ' → ' + size + ' px');
    if (size >= 48) res.huge.push(name(el) + ' → ' + size + ' px');
  });
  // desbordes: elementos que sobresalen del widget fuera de un contenedor con desplazamiento
  const hr = host.getBoundingClientRect();
  all.forEach(el => {
    if (!vis(el) || el.closest('.ch')) return; const r = el.getBoundingClientRect();
    if (r.right <= hr.right + 1 && r.left >= hr.left - 1) return;
    for (let n = el.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n); if (/(auto|scroll|hidden)/.test(o.overflowX)) return; }
    if (getComputedStyle(el).position === 'absolute') return;   // paneles flotantes (filtros) se revisan a mano
    res.overflow.push(name(el) + ' sobresale ' + Math.round(Math.max(r.right - hr.right, hr.left - r.left)) + ' px');
  });
  res.docOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  // estructura
  root.querySelectorAll('.card,.strip').forEach(el => { const s = getComputedStyle(el); if (s.boxShadow !== 'none') res.shadow.push(name(el)); });
  all.forEach(el => { const s = getComputedStyle(el); if (/gradient/.test(s.backgroundImage) && vis(el)) res.gradient.push(name(el)); });
  root.querySelectorAll('td.num,th.num').forEach(el => { if (vis(el) && getComputedStyle(el).textAlign !== 'right') res.numAlign.push(name(el)); });
  // áreas pulsables (WCAG 2.2: 24 px)
  root.querySelectorAll('button,input,th[tabindex],[role=button]').forEach(el => { if (!vis(el)) return; const r = el.getBoundingClientRect(); if (r.height < 24 || r.width < 24) res.targets.push(name(el) + ' → ' + Math.round(r.width) + '×' + Math.round(r.height)); });
  // puntos de leyenda frente a su superficie (trazos de datos ≥ 3:1)
  root.querySelectorAll('.lg i,.li i,.dot').forEach(el => { if (!vis(el)) return; const c = parse(getComputedStyle(el).backgroundColor); if (!c) return; const r = ratio(c, bgOf(el.parentElement)); if (r < 3) res.dots.push(getComputedStyle(el).backgroundColor + ' → ' + r.toFixed(2) + ':1'); });
  // gráficos
  root.querySelectorAll('.ch').forEach(el => { const l = (el.getAttribute('aria-label') || '').trim(); if (el.getAttribute('role') !== 'img' || !l) res.charts.push(name(el) + ' sin role=img o aria-label'); });
  res.nCharts = root.querySelectorAll('.ch').length; res.nTables = root.querySelectorAll('table').length;
  return res;
}
"""
MOV = r"""
() => { const root = window.__w.shadowRoot, bad = [];
  root.querySelectorAll('*').forEach(el => { const s = getComputedStyle(el);
    const t = s.transitionProperty !== 'none' && s.transitionProperty !== 'all' ? s.transitionDuration.split(',').some(d => parseFloat(d) > 0) : (s.transitionProperty === 'all' && parseFloat(s.transitionDuration) > 0);
    const an = s.animationName !== 'none' && parseFloat(s.animationDuration) > 0;
    if (t || an) bad.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '')); });
  return bad; }
"""
FOCUS = r"""
() => { const root = window.__w.shadowRoot, el = root.activeElement; if (!el) return null; const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return { name: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '') + ((el.textContent || '').trim().slice(0, 20) ? ' «' + el.textContent.trim().slice(0, 20) + '»' : ''),
           ok: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2, w: r.width }; }
"""

fails, warns, notes = [], [], []
def F(m): fails.append(m)
def A(m): warns.append(m)
def merge(items):
    # «[320 px] texto» repetido en varios anchos → «[320, 600 px] texto»
    d = {}
    for m in items:
        mm = re.match(r'\[(\d+) px\] (.*)', m)
        if mm: d.setdefault(mm.group(2), []).append(mm.group(1))
        else: d.setdefault(m, [])
    return [('[%s px] ' % ', '.join(w) if w else '') + t for t, w in d.items()]

def load(browser, width, **kw):
    pg = browser.new_page(viewport={'width': width, 'height': 900}, **kw); errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.set_content('<body style="margin:0"><div id="h" style="width:%dpx"></div></body>' % width)
    pg.add_script_tag(content=src)
    pg.evaluate("""([tag, fx]) => { const el = document.createElement(tag); el.style.display='block';
      document.getElementById('h').appendChild(el); el.myDataBinding = fx;
      el.onCustomWidgetBeforeUpdate({}); el.onCustomWidgetAfterUpdate({}); window.__w = el; }""", [tag, fx])
    pg.wait_for_timeout(500)
    return pg, errs

with sync_playwright() as p:
    b = p.chromium.launch()
    for wd in [int(x) for x in a.widths.split(',')]:
        pg, errs = load(b, wd)
        pg.screenshot(path=os.path.join(out, 'w%d.png' % wd), full_page=True)
        r = pg.evaluate(JS); tag_w = '[%d px] ' % wd
        if errs: F(tag_w + 'errores de consola/página: ' + '; '.join(errs[:3]))
        if r['docOverflow']: F(tag_w + 'la página tiene desplazamiento horizontal')
        for x in r['overflow'][:4]: F(tag_w + 'desborde: ' + x)
        for x in r['contrast'][:5]: F(tag_w + 'contraste de texto insuficiente: ' + x)
        for x in r['small'][:4]: A(tag_w + 'texto menor de 12 px: ' + x)
        for x in r['huge'][:3]: F(tag_w + 'cifra de 48 px o más: ' + x)
        for x in r['shadow'][:3]: F(tag_w + 'sombra en tarjeta: ' + x)
        for x in r['gradient'][:3]: F(tag_w + 'degradado: ' + x)
        for x in r['numAlign'][:3]: F(tag_w + 'cifra sin alinear a la derecha: ' + x)
        for x in r['charts'][:3]: F(tag_w + 'gráfico sin descripción: ' + x)
        for x in r['targets'][:4]: A(tag_w + 'área pulsable menor de 24 px: ' + x)
        for x in sorted(set(r['dots']))[:4]: A(tag_w + 'color de datos con menos de 3:1 frente a su fondo: ' + x)
        if wd == 900: notes.append('%d gráficos, %d tablas auditados' % (r['nCharts'], r['nTables']))
        # foco con teclado (una sola vez, ancho medio)
        if wd == 600:
            seen, bad = set(), []
            for _ in range(60):
                pg.keyboard.press('Tab'); f = pg.evaluate(FOCUS)
                if not f or f['name'] in seen: break
                seen.add(f['name'])
                if not f['ok']: bad.append(f['name'])
            if not seen: F('[600 px] ningún elemento recibe foco con Tab')
            for x in bad[:4]: F('[600 px] sin foco visible con teclado: ' + x)
            notes.append('%d elementos recorridos con Tab' % len(seen))
        pg.close()
    # movimiento reducido
    pg, errs = load(b, 900, reduced_motion='reduce')
    mv = sorted(set(pg.evaluate(MOV)))
    for x in mv[:5]: F('[reduced-motion] sigue habiendo transición o animación en: ' + x)
    pg.close(); b.close()

print('Auditoría de diseño · %s · capturas en %s' % (os.path.basename(a.js), out))
for n in notes: print('  · ' + n)
fails, warns = merge(fails), merge(warns)
for m in fails: print('  F ' + m)
for m in warns: print('  A ' + m)
print('Resultado: %d fallo(s), %d aviso(s)%s' % (len(fails), len(warns), '' if fails else ' → sin fallos medibles'))
print('Revisión visual pendiente (no medible): mismo color por miembro en todo el widget, variaciones según goodDirection, jerarquía y densidad (guía §9).')
sys.exit(1 if fails else 0)
