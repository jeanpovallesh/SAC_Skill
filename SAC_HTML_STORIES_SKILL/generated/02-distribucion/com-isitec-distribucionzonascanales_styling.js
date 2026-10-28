(function () {
  'use strict';
  var TAG = "com-isitec-distribucionzonascanales-styling";
  var tpl = document.createElement('template');
  tpl.innerHTML = "<style>:host{display:block;font:12px Arial,sans-serif;padding:8px}fieldset{border:1px solid #c6c6cd;border-radius:6px;margin:0 0 8px;padding:6px 8px}legend{font-weight:600}label{display:block;margin:6px 0 2px}input[type=text],input[type=number]{width:100%;box-sizing:border-box;padding:4px}</style><fieldset><legend>Widget</legend><label for=\"title\">Título</label><input id=\"title\" type=\"text\"></fieldset><fieldset><legend>Umbrales y metas</legend><label for=\"metaMargen\">Meta de margen de contribución (%)</label><input id=\"metaMargen\" type=\"number\" step=\"any\"><label for=\"umbralDominancia\">Participación mínima para canal dominante (%)</label><input id=\"umbralDominancia\" type=\"number\" step=\"1\"><label for=\"textoDominante\">Texto de canal dominante</label><input id=\"textoDominante\" type=\"text\"><label for=\"textoMixto\">Texto de mezcla equilibrada</label><input id=\"textoMixto\" type=\"text\"></fieldset><fieldset><legend>Componente kpiMargen</legend><label for=\"titulo_kpiMargen\">Título: Margen bruto ponderado</label><input id=\"titulo_kpiMargen\" type=\"text\"></fieldset><fieldset><legend>Componente kpiCoste</legend><label for=\"titulo_kpiCoste\">Título: Coste de distribución / venta</label><input id=\"titulo_kpiCoste\" type=\"text\"></fieldset><fieldset><legend>Componente kpiMezcla</legend><label for=\"titulo_kpiMezcla\">Título: Volumen B2B vs D2C</label><input id=\"titulo_kpiMezcla\" type=\"text\"></fieldset><fieldset><legend>Componente kpiCobertura</legend><label for=\"titulo_kpiCobertura\">Título: Cobertura de puntos de venta</label><input id=\"titulo_kpiCobertura\" type=\"text\"></fieldset><fieldset><legend>Componente donaCanales</legend><label for=\"titulo_donaCanales\">Título: Reparto de cuota por canal</label><input id=\"titulo_donaCanales\" type=\"text\"></fieldset><fieldset><legend>Componente burbujasCanales</legend><label for=\"titulo_burbujasCanales\">Título: Volumen vs. margen de contribución</label><input id=\"titulo_burbujasCanales\" type=\"text\"></fieldset><fieldset><legend>Componente barras100Zona</legend><label for=\"titulo_barras100Zona\">Título: Penetración de canales por zona regional</label><input id=\"titulo_barras100Zona\" type=\"text\"></fieldset><fieldset><legend>Componente barrasMarca</legend><label for=\"titulo_barrasMarca\">Título: Canales por línea / marca</label><input id=\"titulo_barrasMarca\" type=\"text\"></fieldset><fieldset><legend>Componente matrizZonaMarca</legend><label for=\"titulo_matrizZonaMarca\">Título: Zona regional × línea / marca</label><input id=\"titulo_matrizZonaMarca\" type=\"text\"></fieldset><fieldset><legend>Componente kpiDoh</legend><label for=\"titulo_kpiDoh\">Título: Días de inventario en canal</label><input id=\"titulo_kpiDoh\" type=\"text\"></fieldset><fieldset><legend>Componente kpiMerma</legend><label for=\"titulo_kpiMerma\">Título: Tasa de mermas y devoluciones</label><input id=\"titulo_kpiMerma\" type=\"text\"></fieldset><fieldset><legend>Componente kpiFrecuencia</legend><label for=\"titulo_kpiFrecuencia\">Título: Frecuencia de despacho</label><input id=\"titulo_kpiFrecuencia\" type=\"text\"></fieldset><fieldset><legend>Componente kpiCiclo</legend><label for=\"titulo_kpiCiclo\">Título: Tiempo de ciclo de pedido</label><input id=\"titulo_kpiCiclo\" type=\"text\"></fieldset><fieldset><legend>Componente tablaCanales</legend><label for=\"titulo_tablaCanales\">Título: Detalle por canal</label><input id=\"titulo_tablaCanales\" type=\"text\"></fieldset><fieldset><legend>Filtros</legend><label for=\"etiqueta_fPeriodo\">Etiqueta del filtro Periodo</label><input id=\"etiqueta_fPeriodo\" type=\"text\"></fieldset><fieldset><legend>Diagnóstico</legend><label for=\"diagnostico\">Mostrar diagnóstico de datos</label><input id=\"diagnostico\" type=\"checkbox\"></fieldset>";

  class DistribucionZonasStyling extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: 'open' });
      this._root.appendChild(tpl.content.cloneNode(true));
      var self = this;
      this._el_title = this._root.getElementById('title');
      this._el_title.addEventListener('change', function () { self._fire({ title: self._el_title.value }); });
      this._el_metaMargen = this._root.getElementById('metaMargen');
      this._el_metaMargen.addEventListener('change', function () { var n = parseFloat(self._el_metaMargen.value); self._fire({ metaMargen: isNaN(n) ? 0 : n }); });
      this._el_umbralDominancia = this._root.getElementById('umbralDominancia');
      this._el_umbralDominancia.addEventListener('change', function () { var n = parseInt(self._el_umbralDominancia.value, 10); self._fire({ umbralDominancia: isNaN(n) ? 0 : n }); });
      this._el_textoDominante = this._root.getElementById('textoDominante');
      this._el_textoDominante.addEventListener('change', function () { self._fire({ textoDominante: self._el_textoDominante.value }); });
      this._el_textoMixto = this._root.getElementById('textoMixto');
      this._el_textoMixto.addEventListener('change', function () { self._fire({ textoMixto: self._el_textoMixto.value }); });
      this._el_titulo_kpiMargen = this._root.getElementById('titulo_kpiMargen');
      this._el_titulo_kpiMargen.addEventListener('change', function () { self._fire({ titulo_kpiMargen: self._el_titulo_kpiMargen.value }); });
      this._el_titulo_kpiCoste = this._root.getElementById('titulo_kpiCoste');
      this._el_titulo_kpiCoste.addEventListener('change', function () { self._fire({ titulo_kpiCoste: self._el_titulo_kpiCoste.value }); });
      this._el_titulo_kpiMezcla = this._root.getElementById('titulo_kpiMezcla');
      this._el_titulo_kpiMezcla.addEventListener('change', function () { self._fire({ titulo_kpiMezcla: self._el_titulo_kpiMezcla.value }); });
      this._el_titulo_kpiCobertura = this._root.getElementById('titulo_kpiCobertura');
      this._el_titulo_kpiCobertura.addEventListener('change', function () { self._fire({ titulo_kpiCobertura: self._el_titulo_kpiCobertura.value }); });
      this._el_titulo_donaCanales = this._root.getElementById('titulo_donaCanales');
      this._el_titulo_donaCanales.addEventListener('change', function () { self._fire({ titulo_donaCanales: self._el_titulo_donaCanales.value }); });
      this._el_titulo_burbujasCanales = this._root.getElementById('titulo_burbujasCanales');
      this._el_titulo_burbujasCanales.addEventListener('change', function () { self._fire({ titulo_burbujasCanales: self._el_titulo_burbujasCanales.value }); });
      this._el_titulo_barras100Zona = this._root.getElementById('titulo_barras100Zona');
      this._el_titulo_barras100Zona.addEventListener('change', function () { self._fire({ titulo_barras100Zona: self._el_titulo_barras100Zona.value }); });
      this._el_titulo_barrasMarca = this._root.getElementById('titulo_barrasMarca');
      this._el_titulo_barrasMarca.addEventListener('change', function () { self._fire({ titulo_barrasMarca: self._el_titulo_barrasMarca.value }); });
      this._el_titulo_matrizZonaMarca = this._root.getElementById('titulo_matrizZonaMarca');
      this._el_titulo_matrizZonaMarca.addEventListener('change', function () { self._fire({ titulo_matrizZonaMarca: self._el_titulo_matrizZonaMarca.value }); });
      this._el_titulo_kpiDoh = this._root.getElementById('titulo_kpiDoh');
      this._el_titulo_kpiDoh.addEventListener('change', function () { self._fire({ titulo_kpiDoh: self._el_titulo_kpiDoh.value }); });
      this._el_titulo_kpiMerma = this._root.getElementById('titulo_kpiMerma');
      this._el_titulo_kpiMerma.addEventListener('change', function () { self._fire({ titulo_kpiMerma: self._el_titulo_kpiMerma.value }); });
      this._el_titulo_kpiFrecuencia = this._root.getElementById('titulo_kpiFrecuencia');
      this._el_titulo_kpiFrecuencia.addEventListener('change', function () { self._fire({ titulo_kpiFrecuencia: self._el_titulo_kpiFrecuencia.value }); });
      this._el_titulo_kpiCiclo = this._root.getElementById('titulo_kpiCiclo');
      this._el_titulo_kpiCiclo.addEventListener('change', function () { self._fire({ titulo_kpiCiclo: self._el_titulo_kpiCiclo.value }); });
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
    set metaMargen(v) { this._el_metaMargen.value = v == null ? '' : v; }
    get metaMargen() { return this._el_metaMargen.value; }
    set umbralDominancia(v) { this._el_umbralDominancia.value = v == null ? '' : v; }
    get umbralDominancia() { return this._el_umbralDominancia.value; }
    set textoDominante(v) { this._el_textoDominante.value = v == null ? '' : v; }
    get textoDominante() { return this._el_textoDominante.value; }
    set textoMixto(v) { this._el_textoMixto.value = v == null ? '' : v; }
    get textoMixto() { return this._el_textoMixto.value; }
    set titulo_kpiMargen(v) { this._el_titulo_kpiMargen.value = v == null ? '' : v; }
    get titulo_kpiMargen() { return this._el_titulo_kpiMargen.value; }
    set titulo_kpiCoste(v) { this._el_titulo_kpiCoste.value = v == null ? '' : v; }
    get titulo_kpiCoste() { return this._el_titulo_kpiCoste.value; }
    set titulo_kpiMezcla(v) { this._el_titulo_kpiMezcla.value = v == null ? '' : v; }
    get titulo_kpiMezcla() { return this._el_titulo_kpiMezcla.value; }
    set titulo_kpiCobertura(v) { this._el_titulo_kpiCobertura.value = v == null ? '' : v; }
    get titulo_kpiCobertura() { return this._el_titulo_kpiCobertura.value; }
    set titulo_donaCanales(v) { this._el_titulo_donaCanales.value = v == null ? '' : v; }
    get titulo_donaCanales() { return this._el_titulo_donaCanales.value; }
    set titulo_burbujasCanales(v) { this._el_titulo_burbujasCanales.value = v == null ? '' : v; }
    get titulo_burbujasCanales() { return this._el_titulo_burbujasCanales.value; }
    set titulo_barras100Zona(v) { this._el_titulo_barras100Zona.value = v == null ? '' : v; }
    get titulo_barras100Zona() { return this._el_titulo_barras100Zona.value; }
    set titulo_barrasMarca(v) { this._el_titulo_barrasMarca.value = v == null ? '' : v; }
    get titulo_barrasMarca() { return this._el_titulo_barrasMarca.value; }
    set titulo_matrizZonaMarca(v) { this._el_titulo_matrizZonaMarca.value = v == null ? '' : v; }
    get titulo_matrizZonaMarca() { return this._el_titulo_matrizZonaMarca.value; }
    set titulo_kpiDoh(v) { this._el_titulo_kpiDoh.value = v == null ? '' : v; }
    get titulo_kpiDoh() { return this._el_titulo_kpiDoh.value; }
    set titulo_kpiMerma(v) { this._el_titulo_kpiMerma.value = v == null ? '' : v; }
    get titulo_kpiMerma() { return this._el_titulo_kpiMerma.value; }
    set titulo_kpiFrecuencia(v) { this._el_titulo_kpiFrecuencia.value = v == null ? '' : v; }
    get titulo_kpiFrecuencia() { return this._el_titulo_kpiFrecuencia.value; }
    set titulo_kpiCiclo(v) { this._el_titulo_kpiCiclo.value = v == null ? '' : v; }
    get titulo_kpiCiclo() { return this._el_titulo_kpiCiclo.value; }
    set titulo_tablaCanales(v) { this._el_titulo_tablaCanales.value = v == null ? '' : v; }
    get titulo_tablaCanales() { return this._el_titulo_tablaCanales.value; }
    set etiqueta_fPeriodo(v) { this._el_etiqueta_fPeriodo.value = v == null ? '' : v; }
    get etiqueta_fPeriodo() { return this._el_etiqueta_fPeriodo.value; }
    set diagnostico(v) { this._el_diagnostico.checked = !!v; }
    get diagnostico() { return this._el_diagnostico.checked; }
  }
  if (!customElements.get(TAG)) customElements.define(TAG, DistribucionZonasStyling);
})();
