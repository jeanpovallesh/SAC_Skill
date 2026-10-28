(function () {
  'use strict';
  var TAG = "com-isitec-sollazonascanales-styling";
  var tpl = document.createElement('template');
  tpl.innerHTML = "<style>:host{display:block;font:12px Arial,sans-serif;padding:8px}fieldset{border:1px solid #c6c6cd;border-radius:6px;margin:0 0 8px;padding:6px 8px}legend{font-weight:600}label{display:block;margin:6px 0 2px}input[type=text],input[type=number]{width:100%;box-sizing:border-box;padding:4px}</style><fieldset><legend>Widget</legend><label for=\"title\">Título</label><input id=\"title\" type=\"text\"></fieldset><fieldset><legend>Componente kpiIngresos</legend><label for=\"titulo_kpiIngresos\">Título: Ingresos</label><input id=\"titulo_kpiIngresos\" type=\"text\"></fieldset><fieldset><legend>Componente kpiGastos</legend><label for=\"titulo_kpiGastos\">Título: Gastos</label><input id=\"titulo_kpiGastos\" type=\"text\"></fieldset><fieldset><legend>Componente kpiGastoPct</legend><label for=\"titulo_kpiGastoPct\">Título: Gastos sobre ingresos</label><input id=\"titulo_kpiGastoPct\" type=\"text\"></fieldset><fieldset><legend>Componente donaCanales</legend><label for=\"titulo_donaCanales\">Título: Ingresos por canal</label><input id=\"titulo_donaCanales\" type=\"text\"></fieldset><fieldset><legend>Componente burbujasCanales</legend><label for=\"titulo_burbujasCanales\">Título: Ingresos vs. gastos sobre ingresos por canal</label><input id=\"titulo_burbujasCanales\" type=\"text\"></fieldset><fieldset><legend>Componente barras100Zona</legend><label for=\"titulo_barras100Zona\">Título: Mezcla de canales por zona</label><input id=\"titulo_barras100Zona\" type=\"text\"></fieldset><fieldset><legend>Componente matrizZonaCanal</legend><label for=\"titulo_matrizZonaCanal\">Título: Zona × canal</label><input id=\"titulo_matrizZonaCanal\" type=\"text\"></fieldset><fieldset><legend>Componente tablaCanales</legend><label for=\"titulo_tablaCanales\">Título: Detalle por canal</label><input id=\"titulo_tablaCanales\" type=\"text\"></fieldset><fieldset><legend>Filtros</legend><label for=\"etiqueta_fPeriodo\">Etiqueta del filtro Periodo</label><input id=\"etiqueta_fPeriodo\" type=\"text\"></fieldset><fieldset><legend>Diagnóstico</legend><label for=\"diagnostico\">Mostrar diagnóstico de datos</label><input id=\"diagnostico\" type=\"checkbox\"></fieldset>";

  class SollaZonasCanalesStyling extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: 'open' });
      this._root.appendChild(tpl.content.cloneNode(true));
      var self = this;
      this._el_title = this._root.getElementById('title');
      this._el_title.addEventListener('change', function () { self._fire({ title: self._el_title.value }); });
      this._el_titulo_kpiIngresos = this._root.getElementById('titulo_kpiIngresos');
      this._el_titulo_kpiIngresos.addEventListener('change', function () { self._fire({ titulo_kpiIngresos: self._el_titulo_kpiIngresos.value }); });
      this._el_titulo_kpiGastos = this._root.getElementById('titulo_kpiGastos');
      this._el_titulo_kpiGastos.addEventListener('change', function () { self._fire({ titulo_kpiGastos: self._el_titulo_kpiGastos.value }); });
      this._el_titulo_kpiGastoPct = this._root.getElementById('titulo_kpiGastoPct');
      this._el_titulo_kpiGastoPct.addEventListener('change', function () { self._fire({ titulo_kpiGastoPct: self._el_titulo_kpiGastoPct.value }); });
      this._el_titulo_donaCanales = this._root.getElementById('titulo_donaCanales');
      this._el_titulo_donaCanales.addEventListener('change', function () { self._fire({ titulo_donaCanales: self._el_titulo_donaCanales.value }); });
      this._el_titulo_burbujasCanales = this._root.getElementById('titulo_burbujasCanales');
      this._el_titulo_burbujasCanales.addEventListener('change', function () { self._fire({ titulo_burbujasCanales: self._el_titulo_burbujasCanales.value }); });
      this._el_titulo_barras100Zona = this._root.getElementById('titulo_barras100Zona');
      this._el_titulo_barras100Zona.addEventListener('change', function () { self._fire({ titulo_barras100Zona: self._el_titulo_barras100Zona.value }); });
      this._el_titulo_matrizZonaCanal = this._root.getElementById('titulo_matrizZonaCanal');
      this._el_titulo_matrizZonaCanal.addEventListener('change', function () { self._fire({ titulo_matrizZonaCanal: self._el_titulo_matrizZonaCanal.value }); });
      this._el_titulo_tablaCanales = this._root.getElementById('titulo_tablaCanales');
      this._el_titulo_tablaCanales.addEventListener('change', function () { self._fire({ titulo_tablaCanales: self._el_titulo_tablaCanales.value }); });
      this._el_etiqueta_fPeriodo = this._root.getElementById('etiqueta_fPeriodo');
      this._el_etiqueta_fPeriodo.addEventListener('change', function () { self._fire({ etiqueta_fPeriodo: self._el_etiqueta_fPeriodo.value }); });
      this._el_diagnostico = this._root.getElementById('diagnostico');
      this._el_diagnostico.addEventListener('change', function () { self._fire({ diagnostico: self._el_diagnostico.checked }); });
    }
    _fire(props) {
      this.dispatchEvent(new CustomEvent('propertiesChanged', { detail: { properties: props } }));
    }
    set title(v) { this._el_title.value = v == null ? '' : v; }
    get title() { return this._el_title.value; }
    set titulo_kpiIngresos(v) { this._el_titulo_kpiIngresos.value = v == null ? '' : v; }
    get titulo_kpiIngresos() { return this._el_titulo_kpiIngresos.value; }
    set titulo_kpiGastos(v) { this._el_titulo_kpiGastos.value = v == null ? '' : v; }
    get titulo_kpiGastos() { return this._el_titulo_kpiGastos.value; }
    set titulo_kpiGastoPct(v) { this._el_titulo_kpiGastoPct.value = v == null ? '' : v; }
    get titulo_kpiGastoPct() { return this._el_titulo_kpiGastoPct.value; }
    set titulo_donaCanales(v) { this._el_titulo_donaCanales.value = v == null ? '' : v; }
    get titulo_donaCanales() { return this._el_titulo_donaCanales.value; }
    set titulo_burbujasCanales(v) { this._el_titulo_burbujasCanales.value = v == null ? '' : v; }
    get titulo_burbujasCanales() { return this._el_titulo_burbujasCanales.value; }
    set titulo_barras100Zona(v) { this._el_titulo_barras100Zona.value = v == null ? '' : v; }
    get titulo_barras100Zona() { return this._el_titulo_barras100Zona.value; }
    set titulo_matrizZonaCanal(v) { this._el_titulo_matrizZonaCanal.value = v == null ? '' : v; }
    get titulo_matrizZonaCanal() { return this._el_titulo_matrizZonaCanal.value; }
    set titulo_tablaCanales(v) { this._el_titulo_tablaCanales.value = v == null ? '' : v; }
    get titulo_tablaCanales() { return this._el_titulo_tablaCanales.value; }
    set etiqueta_fPeriodo(v) { this._el_etiqueta_fPeriodo.value = v == null ? '' : v; }
    get etiqueta_fPeriodo() { return this._el_etiqueta_fPeriodo.value; }
    set diagnostico(v) { this._el_diagnostico.checked = !!v; }
    get diagnostico() { return this._el_diagnostico.checked; }
  }
  if (!customElements.get(TAG)) customElements.define(TAG, SollaZonasCanalesStyling);
})();
