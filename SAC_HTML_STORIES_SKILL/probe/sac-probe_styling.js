(function () {
  'use strict';

  var TAG = 'com-isitec-sacprobe-styling';

  var tpl = document.createElement('template');
  tpl.innerHTML =
    '<style>:host{display:block;font:12px Arial,sans-serif;padding:8px}' +
    'label{display:block;margin:8px 0 2px}input{width:100%;box-sizing:border-box;padding:4px}</style>' +
    '<label for="pl">Texto de prueba (probeLabel)</label><input id="pl" type="text">' +
    '<label for="mr">Filas de muestra (maxRows)</label><input id="mr" type="number" min="1" max="50">';

  class SacProbeStyling extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: 'open' });
      this._root.appendChild(tpl.content.cloneNode(true));
      this._pl = this._root.getElementById('pl');
      this._mr = this._root.getElementById('mr');
      var self = this;
      this._pl.addEventListener('change', function () { self._fire({ probeLabel: self._pl.value }); });
      this._mr.addEventListener('change', function () { self._fire({ maxRows: parseInt(self._mr.value, 10) || 8 }); });
    }

    _fire(props) {
      this.dispatchEvent(new CustomEvent('propertiesChanged', { detail: { properties: props } }));
    }

    set probeLabel(v) { this._pl.value = v == null ? '' : v; }
    get probeLabel() { return this._pl.value; }
    set maxRows(v) { this._mr.value = v == null ? 8 : v; }
    get maxRows() { return parseInt(this._mr.value, 10) || 8; }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, SacProbeStyling);
})();
