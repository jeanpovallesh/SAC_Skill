#!/usr/bin/env python3
"""Carga el JS generado en Chromium (Playwright) con una fixture y saca captura + errores de consola.
Uso: render_harness.py <widget.js> <fixture.json> <captura.png> [--width 1100] [--click selector,...]"""
import sys, json, argparse
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('js'); ap.add_argument('fixture'); ap.add_argument('png')
ap.add_argument('--width', type=int, default=1100); ap.add_argument('--tag', default=None)
a = ap.parse_args()
import re
src = open(a.js, encoding='utf-8').read()
tag = a.tag or re.search(r'var TAG = "([^"]+)"', src).group(1)
fx = json.load(open(a.fixture, encoding='utf-8'))
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': a.width, 'height': 900})
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.set_content('<body style="margin:0"><div id="h" style="width:%dpx"></div></body>' % a.width)
    pg.add_script_tag(content=src)
    pg.evaluate("""([tag, fx]) => { const el = document.createElement(tag); el.style.display='block';
      document.getElementById('h').appendChild(el); el.myDataBinding = fx;
      el.onCustomWidgetBeforeUpdate({}); el.onCustomWidgetAfterUpdate({}); window.__w = el; }""", [tag, fx])
    pg.wait_for_timeout(300)
    pg.screenshot(path=a.png, full_page=True)
    print('texto:', pg.evaluate("window.__w.shadowRoot.textContent.replace(/\\s+/g,' ').slice(0,600)"))
    b.close()
print('errores de consola:', errs or 'ninguno')
sys.exit(1 if errs else 0)
