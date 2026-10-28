var TAG = 'com-isitec-echartsprobe';
var BUILD = 'echarts-probe-1.0.0-2026-10-28';
var CDN = 'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js';
var tpl = document.createElement('template');
tpl.innerHTML = '<style>:host{display:block;font:13px Arial,sans-serif;color:#0b1c30}.p{padding:12px;background:#f8f9ff}' +
  'h3{margin:0 0 8px;font-size:15px}.row{display:flex;flex-wrap:wrap;gap:12px}.c{width:340px;height:260px;background:#fff;border:1px solid #c6c6cd;border-radius:12px}' +
  'button{padding:6px 10px;border:1px solid #0051d5;background:#0051d5;color:#fff;border-radius:8px;cursor:pointer;margin:8px 8px 8px 0}' +
  'pre{background:#fff;border:1px solid #c6c6cd;border-radius:8px;padding:8px;white-space:pre-wrap;max-height:220px;overflow:auto;user-select:text}</style>' +
  '<div class="p"><h3 id="t"></h3><div class="row"><div class="c" id="a" role="img" aria-label="Dona de prueba"></div><div class="c" id="b" role="img" aria-label="Burbujas de prueba"></div></div>' +
  '<button id="cdn" type="button">Probar carga por CDN</button><button id="cp" type="button">Copiar reporte</button><pre id="r"></pre></div>';

class EChartsProbe extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.appendChild(tpl.content.cloneNode(true));
    this._props = { titulo: 'Prueba ECharts' };
    this._rep = { build: BUILD, inline: {}, cdn: { estado: 'no probado' }, env: {} };
    this._charts = [];
    var self = this;
    this._root.getElementById('cdn').addEventListener('click', function () { self._testCdn(); });
    this._root.getElementById('cp').addEventListener('click', function () {
      var t = self._text();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(function () { self._sel(); }); else self._sel();
    });
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(function () { self._charts.forEach(function (c) { try { c.resize(); } catch (e) { /* nada */ } }); });
      this._ro.observe(this);
    }
  }
  _sel() { var r = document.createRange(); r.selectNodeContents(this._root.getElementById('r')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  onCustomWidgetBeforeUpdate(changed) { if (changed && 'titulo' in changed) this._props.titulo = changed.titulo; }
  onCustomWidgetAfterUpdate(changed) { if (changed && 'titulo' in changed) this._props.titulo = changed.titulo; this._draw(); }
  onCustomWidgetResize() { this._charts.forEach(function (c) { try { c.resize(); } catch (e) { /* nada */ } }); }
  onCustomWidgetDestroy() { if (this._ro) this._ro.disconnect(); }
  getEchartsReport() { return this._text(); }
  getEchartsBuild() { return BUILD; }
  _text() { return JSON.stringify(this._rep, null, 1); }
  _draw() {
    var r = this._rep, root = this._root;
    root.getElementById('t').textContent = this._props.titulo + ' · ' + BUILD;
    var t0 = performance.now();
    try {
      r.inline.libCargada = typeof __ECH === 'object' && !!__ECH.init;
      r.inline.version = __ECH.version;
      this._charts.forEach(function (c) { try { c.dispose(); } catch (e) { /* nada */ } });
      this._charts = [];
      var A = __ECH.init(root.getElementById('a'), null, { renderer: 'svg' });
      A.setOption({ aria: { enabled: true }, tooltip: { trigger: 'item' }, legend: { bottom: 0 },
        series: [{ type: 'pie', radius: ['50%', '75%'], label: { show: false },
          data: [{ name: 'Canal 1', value: 48 }, { name: 'Canal 2', value: 31 }, { name: 'Canal 3', value: 21 }] }] });
      var B = __ECH.init(root.getElementById('b'), null, { renderer: 'svg' });
      B.setOption({ tooltip: {}, grid: { left: 40, right: 16, top: 16, bottom: 30 }, xAxis: { name: 'Volumen' }, yAxis: { name: 'Margen %' },
        series: [{ type: 'scatter', symbolSize: function (d) { return d[2]; },
          markLine: { silent: true, data: [{ yAxis: 20 }] }, data: [[10, 18, 30], [25, 24, 50], [40, 15, 20], [32, 30, 40]] }] });
      this._charts = [A, B];
      r.inline.renderMs = Math.round(performance.now() - t0);
      r.inline.svgA = !!root.getElementById('a').querySelector('svg');
      r.inline.svgB = !!root.getElementById('b').querySelector('svg');
      r.inline.ok = r.inline.svgA && r.inline.svgB;
    } catch (e) { r.inline.ok = false; r.inline.error = String(e && e.message || e); }
    r.env = { userAgent: navigator.userAgent, ancho: this.clientWidth, shadowDom: !!this.shadowRoot };
    root.getElementById('r').textContent = this._text();
  }
  _testCdn() {
    var r = this._rep, self = this, root = this._root, t0 = performance.now(), done = false;
    r.cdn = { estado: 'cargando', url: CDN };
    root.getElementById('r').textContent = this._text();
    var fin = function (estado, extra) {
      if (done) return; done = true;
      r.cdn = { estado: estado, url: CDN, ms: Math.round(performance.now() - t0), globalEcharts: typeof window.echarts, version: window.echarts && window.echarts.version };
      if (extra) r.cdn.detalle = extra;
      root.getElementById('r').textContent = self._text();
    };
    try {
      var s = document.createElement('script');
      s.src = CDN;
      s.onload = function () { fin('ok'); };
      s.onerror = function () { fin('error (bloqueado o sin red)'); };
      document.head.appendChild(s);
      setTimeout(function () { fin('timeout 8s'); }, 8000);
    } catch (e) { fin('excepción', String(e && e.message || e)); }
  }
}
if (!customElements.get(TAG)) customElements.define(TAG, EChartsProbe);
