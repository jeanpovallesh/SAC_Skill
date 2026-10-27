(function () {
  'use strict';

  var BUILD = 'probe-1.0.0-2026-10-27g'; // cambiar la letra final en cada republicacion para probar cache
  var TAG = 'com-isitec-sacprobe';

  var PRESETS = [
    ['Leer: jerarquías Entidad', 'ds.getHierarchies', '["Entidad"]'],
    ['Leer: nivel Entidad', 'ds.getHierarchyLevel', '["Entidad"]'],
    ['Leer: dimensiones', 'ds.getDimensions', '[]'],
    ['Leer: miembros Entidad', 'ds.getMembers', '["Entidad"]'],
    ['Nivel 2', 'ds.setHierarchyLevel', '["Entidad",2]'],
    ['Nivel 3', 'ds.setHierarchyLevel', '["Entidad",3]'],
    ['Expandir CIA_A_TOT', 'ds.expandNode', '["Entidad",{"Entidad":"CIA_A_TOT"}]'],
    ['Colapsar CIA_A_TOT', 'ds.collapseNode', '["Entidad",{"Entidad":"CIA_A_TOT"}]']
  ];
  var presetHtml = PRESETS.map(function (p, i) { return '<button data-i="' + i + '">' + p[0] + '</button>'; }).join('');

  var tpl = document.createElement('template');
  tpl.innerHTML =
    '<style>' +
    ':host{display:block;font:12px/1.4 Consolas,monospace;color:#1d2d3e}' +
    '.wrap{height:100%;display:flex;flex-direction:column;border:1px solid #d9d9d9;background:#fff}' +
    '.bar{display:flex;gap:8px;align-items:center;padding:6px 8px;background:#f5f6f7;border-bottom:1px solid #d9d9d9}' +
    '.bar b{flex:1}button{font:inherit;padding:3px 10px;cursor:pointer}' +
    '.ctl{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px;background:#fafafa;border-bottom:1px solid #d9d9d9}.ctl button{padding:2px 6px}.ctl input{font:inherit;padding:2px 4px}' +
    'pre{margin:0;padding:8px;overflow:auto;flex:1;white-space:pre-wrap;word-break:break-all}' +
    '</style><div class="wrap"><div class="bar"><b id="t"></b>' +
    '<button id="copy">Copiar reporte</button><button id="upd">Actualizar</button></div>' +
    '<div class="ctl" id="ctl">' + presetHtml + '<br><input id="m" size="22" placeholder="ds.metodo"><input id="a" size="34" placeholder="[args JSON]"><button id="run">Ejecutar</button><button id="all">Las 4 lecturas</button></div>' +
    '<pre id="out">esperando datos...</pre></div>';

  function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  function cellShape(v) {
    var t = typeOf(v);
    if (t !== 'object') return t;
    return 'object{' + Object.keys(v).join(',') + '}';
  }

  function safe(v, limit) {
    var s;
    try { s = JSON.stringify(v, null, 1); } catch (e) { s = '[no serializable: ' + e.message + ']'; }
    if (s && limit && s.length > limit) s = s.slice(0, limit) + '...[truncado ' + (s.length - limit) + ']';
    return s;
  }

  // Lista nombre -> tipo de las propiedades de un objeto y su cadena de prototipos
  function methodsOf(o) {
    var out = {}, p = o, n = 0;
    while (p && p !== Object.prototype && n < 4) {
      Object.getOwnPropertyNames(p).forEach(function (k) {
        if (k === 'constructor') return;
        try { out[k] = typeof o[k]; } catch (e) { out[k] = 'error'; }
      });
      p = Object.getPrototypeOf(p); n++;
    }
    return out;
  }

  class SacProbe extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: 'open' });
      this._root.appendChild(tpl.content.cloneNode(true));
      this._props = { probeLabel: 'sonda', maxRows: 8 };
      this._note = '';
      this._report = null;
      this._renders = 0;
      this._invokeLog = [];
      var self = this;
      this._root.getElementById('ctl').addEventListener('click', function (e) { self._onCtl(e); });
      this._root.getElementById('upd').addEventListener('click', function () { self.render(); });
      this._root.getElementById('copy').addEventListener('click', function () {
        var txt = self._reportText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).catch(function () { self._select(); });
        } else { self._select(); }
      });
    }

    _select() {
      var pre = this._root.getElementById('out');
      var r = document.createRange();
      r.selectNodeContents(pre);
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }

    // ---- hooks SAC ----
    onCustomWidgetBeforeUpdate(changed) {
      // SAC incluye myDataBinding, dataBindings y eventos en `changed`: no se copian al estado.
      this._lastChangedKeys = Object.keys(changed || {});
      var self = this;
      Object.keys(changed || {}).forEach(function (k) {
        if (k === 'myDataBinding' || k === 'dataBindings') return;
        self._props[k] = changed[k];
      });
    }
    onCustomWidgetAfterUpdate(changed) {
      if (changed && 'probeLabel' in changed) this._props.probeLabel = changed.probeLabel;
      if (changed && 'maxRows' in changed) this._props.maxRows = changed.maxRows;
      this.render();
    }
    onCustomWidgetResize() { /* sin accion */ }
    onCustomWidgetDestroy() { /* sin accion */ }

    // ---- propiedades (prueba 5: nombres de acceso) ----
    get probeLabel() { return this._props.probeLabel; }
    set probeLabel(v) { this._props.probeLabel = v; this.render(); }
    get maxRows() { return this._props.maxRows; }
    set maxRows(v) { this._props.maxRows = v; this.render(); }

    // ---- metodos publicos ----
    getProbeReport() { return this._reportText(); }
    getProbeObject() { return { build: BUILD, renders: this._renders, ok: true }; } // prueba 6
    getProbeBuild() { return BUILD; }
    setProbeNote(note) { this._note = String(note || ''); this.render(); }

    // Origen de datos desde dentro del widget (this.dataBindings)
    _getBindingObjects() {
      var dbs = this.dataBindings, db = null, ds = null, err = null;
      try {
        if (dbs && typeof dbs.getDataBinding === 'function') db = dbs.getDataBinding('myDataBinding');
        if (db && typeof db.getDataSource === 'function') ds = db.getDataSource();
      } catch (e) { err = String(e && e.message || e); }
      return { dbs: dbs, db: db, ds: ds, err: err };
    }

    _pushLog(method, args, txt) {
      var t = String(txt);
      if (t.length > 6000) t = t.slice(0, 6000) + '...[truncado ' + (t.length - 6000) + ']';
      var entry = { at: new Date().toISOString(), method: method, args: args, out: t };
      this._invokeLog.push(entry);
      if (this._invokeLog.length > 30) this._invokeLog.shift();
      return entry;
    }

    _onCtl(e) {
      var t = e && e.target, id = t && t.id, i = t && t.getAttribute && t.getAttribute('data-i');
      var root = this._root;
      if (i !== null && i !== undefined && i !== '') {
        var pr = PRESETS[parseInt(i, 10)];
        if (pr) { this.probeInvoke(pr[1], pr[2]); this.render(); }
      } else if (id === 'run') {
        this.probeInvoke(root.getElementById('m').value, root.getElementById('a').value);
        this.render();
      } else if (id === 'all') {
        for (var k = 0; k < 4; k++) this.probeInvoke(PRESETS[k][1], PRESETS[k][2]);
        this.render();
      }
    }

    // Llamada genérica desde el script de la story: probeInvoke("ds.setHierarchyLevel", '["Entidad",2]')
    probeInvoke(methodName, argsJson) {
      var out = { method: methodName };
      var holder = {}, self = this;
      try {
        var o = this._getBindingObjects();
        var name = String(methodName || '');
        var target = o.ds, fn = name;
        if (name.indexOf('db.') === 0) { target = o.db; fn = name.slice(3); }
        else if (name.indexOf('dbs.') === 0) { target = o.dbs; fn = name.slice(4); }
        else if (name.indexOf('ds.') === 0) { fn = name.slice(3); }
        if (!target) { out.error = 'objeto no disponible (' + (o.err || 'dataBindings/getDataBinding/getDataSource ausente') + ')'; return JSON.stringify(out); }
        if (typeof target[fn] !== 'function') { out.error = fn + ' no es una función'; return JSON.stringify(out); }
        var args = argsJson ? JSON.parse(argsJson) : [];
        var res = target[fn].apply(target, Array.isArray(args) ? args : [args]);
        if (res && typeof res.then === 'function') {
          out.result = '[promesa] el valor llega en "resolved"';
          res.then(function (v) {
            try { console.log('[SacProbe] ' + name + ' resolvió', v); } catch (e) { /* nada */ }
            if (holder.entry) { holder.entry.resolved = v === undefined ? '[undefined]' : safe(v, 6000); }
            try { self.render(); } catch (e4) { /* nada */ }
          }, function (e) {
            try { console.log('[SacProbe] ' + name + ' rechazó', e); } catch (e2) { /* nada */ }
            if (holder.entry) { holder.entry.rejected = String(e && e.message || e); }
            try { self.render(); } catch (e5) { /* nada */ }
          });
        } else {
          out.result = res === undefined ? null : res;
        }
        out.ok = true;
      } catch (e) {
        out.ok = false; out.error = String(e && e.message || e);
      }
      var txt; try { txt = JSON.stringify(out); } catch (e3) { txt = JSON.stringify({ method: methodName, ok: true, result: String(out.result) }); }
      holder.entry = this._pushLog(String(methodName), argsJson, txt);
      return txt;
    }

    _reportText() {
      return safe(this._report || { error: 'sin reporte aun' });
    }

    _analyze() {
      var b = this.myDataBinding;
      var rep = {
        build: BUILD,
        renders: this._renders,
        changedKeys: this._lastChangedKeys,
        invokeLog: this._invokeLog.slice(-20),
        note: this._note,
        props: this._props,
        thisKeys_dataBinding: Object.keys(this).filter(function (k) { return /binding/i.test(k); }),
        binding: null
      };
      try {
        var bo = this._getBindingObjects();
        rep.dataBindingsApi = {
          dataBindingsType: typeof bo.dbs,
          dataBindingsMembers: bo.dbs ? methodsOf(bo.dbs) : null,
          bindingObjectMembers: bo.db ? methodsOf(bo.db) : null,
          dataSourceMembers: bo.ds ? methodsOf(bo.ds) : null,
          error: bo.err
        };
      } catch (e) { rep.dataBindingsApi = { error: String(e && e.message || e) }; }
      if (!b) {
        rep.binding = 'this.myDataBinding NO existe (¿feeds sin asignar en el Builder?)';
        return rep;
      }
      rep.binding = {
        keys: Object.keys(b),
        state: b.state,
        hasMetadata: !!b.metadata,
        hasData: Array.isArray(b.data),
        rowCount: Array.isArray(b.data) ? b.data.length : null
      };

      // Estado distinto de success: mostrar mensajes y el binding completo
      if (b.state !== 'success' || b.messages) {
        rep.binding.messages = b.messages;
        rep.bindingRaw = safe(b, 4000);
      }

      // Prueba 2: metadata
      if (b.metadata) {
        rep.metadata = {
          keys: Object.keys(b.metadata),
          raw: safe(b.metadata, 6000)
        };
      }

      var data = Array.isArray(b.data) ? b.data : [];
      if (!data.length) return rep;

      // Forma de las filas y celdas (pruebas 1, 3, 8)
      var cols = {};
      var maxScan = Math.min(data.length, 500);
      for (var i = 0; i < maxScan; i++) {
        var row = data[i];
        Object.keys(row).forEach(function (k) {
          var c = cols[k] || (cols[k] = { shapes: {}, distinct: {}, nullCount: 0 });
          var v = row[k];
          var sh = cellShape(v);
          c.shapes[sh] = (c.shapes[sh] || 0) + 1;
          if (v === null || v === undefined) c.nullCount++;
          var idv = v && typeof v === 'object' ? (v.id !== undefined ? v.id : v.raw) : v;
          c.distinct[String(idv)] = true;
        });
      }
      rep.columns = {};
      Object.keys(cols).forEach(function (k) {
        var c = cols[k];
        rep.columns[k] = {
          shapes: c.shapes,
          distinctValuesInScan: Object.keys(c.distinct).length,
          nulls: c.nullCount
        };
      });

      // Prueba 8: ¿campos de jerarquia en las celdas? (cualquier clave distinta de id/label/raw/formatted)
      var extra = {};
      for (var j = 0; j < maxScan; j++) {
        Object.keys(data[j]).forEach(function (k) {
          var v = data[j][k];
          if (v && typeof v === 'object') {
            Object.keys(v).forEach(function (kk) {
              if (['id', 'label', 'raw', 'formatted'].indexOf(kk) < 0) {
                extra[k + '.' + kk] = (extra[k + '.' + kk] || 0) + 1;
              }
            });
          }
        });
      }
      rep.hierarchyOrExtraCellFields = Object.keys(extra).length ? extra : 'ninguno (solo id/label/raw/formatted)';

      // Prueba 8: filas duplicadas por combinacion de dimensiones (señal de nodos+hojas)
      var dimKeys = Object.keys(cols).filter(function (k) { return !/^measures/.test(k) && !/^props/.test(k); });
      if (b.metadata && b.metadata.feeds) {
        var fk = [];
        Object.keys(b.metadata.feeds).forEach(function (fid) {
          var f = b.metadata.feeds[fid];
          if (f && f.type === 'dimension' && !/^props/.test(fid)) fk = fk.concat(f.values || []);
        });
        if (fk.length) dimKeys = fk;
      }
      rep.dimKeysUsed = dimKeys;
      var seen = {}, dup = 0;
      for (var m = 0; m < maxScan; m++) {
        var key = dimKeys.map(function (k) { var v = data[m][k]; return v && v.id; }).join('|');
        if (seen[key]) dup++; else seen[key] = true;
      }
      rep.duplicateDimCombinations = dup;

      // Prueba 8 (doble conteo): suma de cada medida sobre TODAS las filas.
      // Si SAC entrega nodos y hojas a la vez, esta suma será mayor que el total de una tabla normal.
      var mKeys = Object.keys(cols).filter(function (k) { return /^measures/.test(k); });
      var totals = {};
      mKeys.forEach(function (k) {
        var s = 0, n = 0;
        data.forEach(function (r) {
          var c = r[k];
          var x = c && typeof c === 'object' ? c.raw : c;
          var num = typeof x === 'number' ? x : parseFloat(x);
          if (!isNaN(num)) { s += num; n++; }
        });
        totals[k] = { sumRaw: s, numericCells: n };
      });
      rep.measureTotals = totals;

      // Valores distintos por dimension (para ver si aparecen ids de nodos como Tot_Consolidado)
      rep.distinctIdsPerDimension = {};
      dimKeys.forEach(function (k) {
        var set = {};
        data.forEach(function (r) { var v = r[k]; if (v && v.id !== undefined) set[v.id] = true; });
        var ks = Object.keys(set);
        rep.distinctIdsPerDimension[k] = { count: ks.length, first: ks.slice(0, 12) };
      });

      // Nombres unicos [Dim].[Jerarquia].&[Miembro]
      var re = /^\[([^\]]+)\]\.\[([^\]]+)\]\.&\[(.*)\]$/;
      rep.parsedIds = {};
      dimKeys.forEach(function (k) {
        var out = {};
        data.forEach(function (r) {
          var v = r[k]; if (!v || typeof v.id !== 'string') return;
          var mm = re.exec(v.id);
          out[v.id] = mm ? { dimension: mm[1], hierarchy: mm[2], member: mm[3], isNode: v.isNode, isCollapsed: v.isCollapsed } : 'plano';
        });
        var ks = Object.keys(out);
        rep.parsedIds[k] = ks.slice(0, 15).reduce(function (a, id) { a[id] = out[id]; return a; }, {});
      });

      // Muestra
      var n = Math.max(1, parseInt(this._props.maxRows, 10) || 8);
      rep.sampleRows = data.slice(0, n);
      rep.totalRows = data.length;
      return rep;
    }

    render() {
      this._renders++;
      var rep;
      try { rep = this._analyze(); } catch (e) { rep = { error: String(e && e.message || e), stack: e && e.stack }; }
      this._report = rep;
      this._root.getElementById('t').textContent = 'SAC Probe · ' + BUILD + ' · ' + this._props.probeLabel;
      this._root.getElementById('out').textContent = safe(rep, 60000);
      try { console.log('[SacProbe] reporte', rep); } catch (e) { /* nada */ }
      try { this.dispatchEvent(new CustomEvent('onProbeRendered')); } catch (e) { /* nada */ }
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, SacProbe);
})();
