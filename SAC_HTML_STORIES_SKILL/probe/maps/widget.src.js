var TAG = 'com-isitec-mapsprobe';
var BUILD = 'maps-probe-1.0.0-2026-10-28';
var GEO = __GEO__;
var ZONAS = [['Antioquia', 6.25, -75.57, 51], ['Centro', 4.71, -74.07, 55], ['Occidente', 3.45, -76.53, 66], ['Oriente', 7.12, -73.12, 19], ['Norte', 10.96, -74.80, 13]];
var TILES = [
  ['OpenStreetMap', 'https://tile.openstreetmap.org/6/19/31.png'],
  ['CARTO claro', 'https://basemaps.cartocdn.com/light_all/6/19/31.png'],
  ['Esri calles', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/6/31/19']
];
var LEAFLET = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
var tpl = document.createElement('template');
tpl.innerHTML = '<style>:host{display:block;font:13px Arial,sans-serif;color:#0b1c30}.p{padding:12px;background:#f8f9ff}h3{margin:0 0 8px;font-size:15px}' +
  '.c{width:100%;max-width:560px;height:360px;background:#fff;border:1px solid #c6c6cd;border-radius:12px}button{padding:6px 10px;border:1px solid #0051d5;background:#0051d5;color:#fff;border-radius:8px;cursor:pointer;margin:8px 8px 8px 0}' +
  'pre{background:#fff;border:1px solid #c6c6cd;border-radius:8px;padding:8px;white-space:pre-wrap;max-height:240px;overflow:auto;user-select:text}</style>' +
  '<div class="p"><h3 id="t"></h3><div class="c" id="m" role="img" aria-label="Mapa de prueba"></div>' +
  '<button id="net" type="button">Probar teselas y Leaflet (red)</button><button id="cp" type="button">Copiar reporte</button><pre id="r"></pre></div>';
class MapsProbe extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.appendChild(tpl.content.cloneNode(true));
    this._rep = { build: BUILD, mapa: {}, red: { estado: 'no probado' } };
    var self = this;
    this._root.getElementById('net').addEventListener('click', function () { self._net(); });
    this._root.getElementById('cp').addEventListener('click', function () {
      var t = self._text();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(function () { self._sel(); }); else self._sel();
    });
    if (typeof ResizeObserver === 'function') { this._ro = new ResizeObserver(function () { if (self._ch) try { self._ch.resize(); } catch (e) { /* nada */ } }); this._ro.observe(this); }
  }
  _sel() { var r = document.createRange(); r.selectNodeContents(this._root.getElementById('r')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  onCustomWidgetBeforeUpdate() {}
  onCustomWidgetAfterUpdate() { this._draw(); }
  onCustomWidgetResize() { if (this._ch) try { this._ch.resize(); } catch (e) { /* nada */ } }
  onCustomWidgetDestroy() { if (this._ro) this._ro.disconnect(); }
  getMapsReport() { return this._text(); }
  _text() { return JSON.stringify(this._rep, null, 1); }
  _draw() {
    var r = this._rep, root = this._root, t0 = performance.now();
    root.getElementById('t').textContent = 'Prueba de mapas · ' + BUILD;
    try {
      __ECH.registerMap('pais', GEO);
      if (this._ch) this._ch.dispose();
      var ch = __ECH.init(root.getElementById('m'), null, { renderer: 'svg' });
      ch.setOption({ tooltip: { trigger: 'item', formatter: function (p) { return p.name + ': ' + p.value[2]; } },
        geo: { map: 'pais', roam: true, itemStyle: { areaColor: '#eff4ff', borderColor: '#9aa7c7' }, emphasis: { itemStyle: { areaColor: '#dbe6ff' }, label: { show: false } } },
        series: [{ type: 'scatter', coordinateSystem: 'geo', symbolSize: function (v) { return 10 + v[2] * 0.4; },
          itemStyle: { color: '#0051d5', opacity: 0.75 },
          data: ZONAS.map(function (z) { return { name: z[0], value: [z[2], z[1], z[3]] }; }) }] });
      this._ch = ch;
      r.mapa = { ok: !!root.getElementById('m').querySelector('svg'), ms: Math.round(performance.now() - t0), puntos: ZONAS.length, version: __ECH.version };
    } catch (e) { r.mapa = { ok: false, error: String(e && e.message || e) }; }
    root.getElementById('r').textContent = this._text();
  }
  _net() {
    var r = this._rep, root = this._root, self = this, out = { estado: 'probando', teselas: {}, leaflet: 'pendiente' }, pend = TILES.length + 1;
    r.red = out;
    var upd = function () { root.getElementById('r').textContent = self._text(); };
    var done = function () { pend--; if (!pend) { out.estado = 'listo'; } upd(); };
    TILES.forEach(function (t) {
      var img = new Image(), t0 = performance.now(), fin = false;
      var end = function (s) { if (fin) return; fin = true; out.teselas[t[0]] = s + ' (' + Math.round(performance.now() - t0) + ' ms)'; done(); };
      img.onload = function () { end('ok'); };
      img.onerror = function () { end('error/bloqueada'); };
      setTimeout(function () { end('timeout 8s'); }, 8000);
      img.src = t[1];
    });
    var fin2 = false, f2 = function (s) { if (fin2) return; fin2 = true; out.leaflet = s + (window.L ? ' · L ' + window.L.version : ''); done(); };
    try {
      var sc = document.createElement('script');
      sc.src = LEAFLET; sc.onload = function () { f2('ok'); }; sc.onerror = function () { f2('error/bloqueado'); };
      document.head.appendChild(sc); setTimeout(function () { f2('timeout 8s'); }, 8000);
    } catch (e) { f2('excepción'); }
    upd();
  }
}
if (!customElements.get(TAG)) customElements.define(TAG, MapsProbe);
