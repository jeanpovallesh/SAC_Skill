(function () {
  'use strict';
  var TAG = 'com-isitec-mapsprobe-styling';
  class MapsProbeStyling extends HTMLElement {
    constructor() { super(); this._root = this.attachShadow({ mode: 'open' }); this._root.innerHTML = '<div style="font:12px Arial;padding:8px">Sin propiedades.</div>'; }
  }
  if (!customElements.get(TAG)) customElements.define(TAG, MapsProbeStyling);
})();
