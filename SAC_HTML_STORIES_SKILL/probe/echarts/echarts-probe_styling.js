(function () {
  'use strict';
  var TAG = 'com-isitec-echartsprobe-styling';
  var tpl = document.createElement('template');
  tpl.innerHTML = '<style>:host{display:block;font:12px Arial,sans-serif;padding:8px}label{display:block;margin:8px 0 2px}input{width:100%;box-sizing:border-box;padding:4px}</style>' +
    '<label for="titulo">Título</label><input id="titulo" type="text">';
  class EChartsProbeStyling extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: 'open' });
      this._root.appendChild(tpl.content.cloneNode(true));
      this._t = this._root.getElementById('titulo');
      var self = this;
      this._t.addEventListener('change', function () { self.dispatchEvent(new CustomEvent('propertiesChanged', { detail: { properties: { titulo: self._t.value } } })); });
    }
    set titulo(v) { this._t.value = v == null ? '' : v; }
    get titulo() { return this._t.value; }
  }
  if (!customElements.get(TAG)) customElements.define(TAG, EChartsProbeStyling);
})();
