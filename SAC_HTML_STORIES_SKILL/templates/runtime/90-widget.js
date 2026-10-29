/* ===== clase del widget ===== */
class Widget extends HTMLElement {
  constructor() {
    super();
    var self = this;
    this._root = this.attachShadow({ mode: 'open' });
    var st = document.createElement('style');
    st.textContent = buildCss();
    this._root.appendChild(st);
    this._box = document.createElement('div');
    this._box.className = 'w-lg';
    this._root.appendChild(this._box);
    this._props = {};
    PROP_DEFS.forEach(function (p) { self._props[p.id] = p.default; });
    this._sel = {};
    this._inited = {};
    this._uiState = {};
    this._compState = {};
    this._groups = {};
    this._charts = [];
    this._pending = [];
    this._last = null;
    this._width = 0;
    this._box.addEventListener('click', function (e) { self._onAct(e); });
    this._box.addEventListener('change', function (e) { self._onAct(e); });
    this._box.addEventListener('input', function (e) { if (e.target && e.target.getAttribute && /^(fq|q)$/.test(e.target.getAttribute('data-act') || '')) self._onAct(e); });
    this._box.addEventListener('keydown', function (e) {
      var t = e.target;
      if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('data-act') === 'sort') { e.preventDefault(); self._onAct(e); }
      if (e.key === 'Escape') { self._groups = {}; Object.keys(self._uiState).forEach(function (k) { self._uiState[k].open = false; }); self._render(); }
    });
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(function () { self._measure(); });
      this._ro.observe(this);
    }
  }
  /* ---- hooks SAC ---- */
  onCustomWidgetBeforeUpdate(changed) { this._merge(changed); }
  onCustomWidgetAfterUpdate(changed) { this._merge(changed); this._render(); }
  onCustomWidgetResize() { this._measure(); }
  onCustomWidgetDestroy() { if (this._ro) this._ro.disconnect(); this._charts.forEach(function (ch) { try { ch.dispose(); } catch (e) { /* nada */ } }); }
  _merge(changed) {
    var self = this;
    Object.keys(changed || {}).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(self._props, k)) self._props[k] = changed[k];   // solo propiedades conocidas
    });
  }
  _measure() {
    var w = this.clientWidth || this.getBoundingClientRect().width || 0;
    if (Math.abs(w - this._width) < 2) return;
    this._width = w;
    this._charts.forEach(function (ch) { try { ch.resize(); } catch (e) { /* nada */ } });
    this._box.className = w >= 900 ? 'w-lg' : w >= 600 ? 'w-md' : 'w-sm';
  }
  /* ---- estado auxiliar ---- */
  _ctx(read) {
    var self = this;
    var rows = applyFilters(read.rows, this._sel);
    return {
      allRows: read.rows, rows: rows, sel: this._sel, read: read,
      have: function (id) { return !!read.present[id]; },
      t: function (c) { var v = self._props['titulo_' + c.id]; return v != null && v !== '' ? v : c.title || ''; },
      label: function (f) { var v = self._props['etiqueta_' + f.id]; return v != null && v !== '' ? v : (feedDef(f.target) || {}).label || f.target; },
      prop: function (id) { return self._props[id]; },
      ui: function (k, d) { return self._uiState[k] || (self._uiState[k] = d); },
      state: function (k, d) { return self._compState[k] || (self._compState[k] = d); },
      group: function (g) { return g ? self._groups[g] || null : null; },
      charts: self._pending
    };
  }
  _onAct(e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    this._focusQ = el && el.getAttribute('data-act') === 'q' ? el.getAttribute('data-comp') : null;
    if (!el || !this._last || this._last.state !== 'success') return;
    if (e.type === 'change' && !/^(fopt|vsel)$/.test(el.getAttribute('data-act'))) return;
    if (e.type === 'click' && /^(fopt|q|fq|vsel)$/.test(el.getAttribute('data-act'))) return;
    var ctx = this._ctx(this._last), changed = false;
    var act = el.getAttribute('data-act');
    if (act === 'gsel') { changed = this._pick(el.getAttribute('data-g'), el.getAttribute('data-k')); }
    else if (/^f/.test(act)) changed = handleFilterAct(ctx, el);
    else {
      var cid = el.getAttribute('data-comp');
      var c = SPEC.components.filter(function (x) { return x.id === cid; })[0];
      var impl = c && COMPONENTS[c.type];
      if (impl && impl.act) changed = impl.act(ctx, el, c);
    }
    if (changed) this._render();
  }
  /* Vista plana: si una dimensión sin jerarquía en la especificación llega con nodos (solo raíces), pedir @FlatHierarchy.
     ⚠ no verificado en el tenant; si falla, el aviso del widget indica configurar la jerarquía plana en el Builder. */
  _ensureFlat(read) {
    try {
      var dbs = this.dataBindings;
      var db = dbs && typeof dbs.getDataBinding === 'function' ? dbs.getDataBinding('myDataBinding') : null;
      var ds = db && typeof db.getDataSource === 'function' ? db.getDataSource() : null;
      if (!ds || typeof ds.setHierarchy !== 'function') return;
      this._flat = this._flat || {};
      SPEC.feeds.filter(function (f) { return f.role === 'dimension' && !f.hierarchy; }).forEach(function (f) {
        if (this._flat[f.ref]) return;
        var hasNodes = read.rows.some(function (rec) { return rec.d[f.ref] && rec.d[f.ref].isNode; });
        if (!hasNodes) return;
        this._flat[f.ref] = true;
        var p = ds.setHierarchy(f.ref, '@FlatHierarchy');
        if (p && typeof p.catch === 'function') p.catch(function () { /* nada */ });
      }, this);
    } catch (e) { /* nada */ }
  }
  _pick(g, k) {
    if (!g) return false;
    this._groups[g] = this._groups[g] === k ? null : k;
    return true;
  }
  _mountCharts() {
    var self = this;
    this._charts.forEach(function (ch) { try { ch.dispose(); } catch (e) { /* nada */ } });
    this._charts = [];
    if (!ECH) return;
    var pend = this._pending.splice(0, this._pending.length);
    pend.forEach(function (p) {
      var host = self._box.querySelector('[data-chart="' + p.id + '"]');
      if (!host) return;
      var ch = ECH.init(host, null, { renderer: 'svg' });
      ch.setOption(p.option);
      if (p.onPick) ch.on('click', function (ev) { var r = p.onPick(ev); if (r && self._pick(r.g, r.k)) self._render(); });
      self._charts.push(ch);
    });
  }
  /* ---- render ---- */
  _render() {
    try {
      var read = readBinding(this.myDataBinding);
      if (read.state === 'loading') { this._box.classList.add('loading'); return; }   // conserva el último render
      this._box.classList.remove('loading');
      if (read.state === 'success') { this._last = read; this._ensureFlat(read); initFilterDefaults(read.rows, this._sel, this._inited); }
      this._measure();
      this._pending.length = 0;
      this._box.innerHTML = this._html(read);
      this._mountCharts();
      if (!this._shown && read.state === 'success') {   // entrada suave solo la primera vez; los re-dibujos por filtros no se animan
        this._shown = true; var bx = this._box; bx.classList.add('enter');
        setTimeout(function () { bx.classList.remove('enter'); }, 300);
      }
      var fo = this._box.querySelector('[data-act="fq"]');
      if (fo && this._uiState && Object.keys(this._uiState).some(function (k) { return this._uiState[k].keepFocus; }, this)) {
        fo.focus(); var l = fo.value.length; try { fo.setSelectionRange(l, l); } catch (e) { /* nada */ }
        Object.keys(this._uiState).forEach(function (k) { this._uiState[k].keepFocus = false; }, this);
      }
      var qi = this._box.querySelector('input[data-act="q"]');
      if (qi && this._focusQ === qi.getAttribute('data-comp')) { qi.focus(); var n = qi.value.length; try { qi.setSelectionRange(n, n); } catch (e2) { /* nada */ } }
    } catch (err) {
      this._box.innerHTML = '<div class="notice err" role="alert">Error al dibujar el widget: ' + esc(err && err.message || err) + '</div>';
    }
  }
  _html(read) {
    var head = this._props.title ? '<h2 class="wtitle">' + esc(this._props.title) + '</h2>' : '';
    if (read.state === 'none') return '<div class="root">' + head + '<div class="notice">Asigne el origen de datos y los feeds en el Builder.</div></div>';
    if (read.state === 'error') return head + '<div class="notice err" role="alert">Error en el origen de datos' + (read.messages && read.messages.length ? ': ' + esc(JSON.stringify(read.messages)) : '') + '</div>';
    if (read.state !== 'success') return head;
    if (read.missing.length) {
      var expected = SPEC.feeds.filter(function (f) { return !f.optional; }).map(function (f) { return f.ref; }).concat(SPEC.measures.filter(function (m) { return m.role === 'value' && !m.optional; }).map(function (m) { return m.ref || m.id; }));
      return '<div class="root">' + head + '<div class="notice" role="status"><b>Faltan feeds por asignar o no coinciden con el modelo:</b> ' + esc(read.missing.join(', ')) +
        '<br><span class="muted">Se esperan (ids del modelo): ' + esc(expected.join(', ')) + '</span><br><span class="muted">Se recibieron: ' + esc(read.received.join(', ') || 'nada') + '</span></div></div>';
    }
    var missing = '';
    var diag = '';
    if (this._props.diagnostico) {
      var cut = function (o) { var t = JSON.stringify(o); return t.length > 1500 ? t.slice(0, 1500) + '…' : t; };
      diag = '<details open class="notice"><summary><b>Diagnóstico</b></summary><pre style="white-space:pre-wrap;font-size:11px">' + esc(
        'versión: ' + SPEC._widget.version + '\nfilas recibidas: ' + read.nRaw + ' · celdas de medida no numéricas: ' + read.nBad +
        '\nrecibido: ' + read.received.join(', ') + '\npresente: ' + Object.keys(read.present).join(', ') +
        '\nmetadata: ' + cut(this.myDataBinding && this.myDataBinding.metadata && { dimensions: this.myDataBinding.metadata.dimensions, mainStructureMembers: this.myDataBinding.metadata.mainStructureMembers }) +
        '\nmuestra: ' + cut(read.sample)) + '</pre></details>';
    }
    var ctx = this._ctx(read);
    var cells = [];
    SPEC.components.forEach(function (c) {
      var ok = asArray(c.requires).every(function (r) { return ctx.have(r); });
      if (!ok) return;
      var impl = COMPONENTS[c.type];
      var html = impl ? impl.render(ctx, c) : '<div class="notice">Componente no disponible: ' + esc(c.type) + '</div>';
      if (html) cells.push({ c: c, html: html, kpi: /^kpi/.test(c.type) && !(c.layout && c.layout.span) });
    });
    /* Varios KPI seguidos forman una franja: un contenedor dividido por líneas de 1 px (design-guidelines §5.1) */
    var parts = [], pi = 0;
    var plain = function (x) { return '<div class="cell s' + ((x.c.layout && x.c.layout.span) || defaultSpan(x.c.type)) + '">' + x.html + '</div>'; };
    while (pi < cells.length) {
      if (!cells[pi].kpi) { parts.push(plain(cells[pi])); pi++; continue; }
      var pj = pi; while (pj < cells.length && cells[pj].kpi) pj++;
      var run = cells.slice(pi, pj), per = run.length <= 5 ? run.length : Math.ceil(run.length / 2);
      if (run.length === 1) parts.push(plain(run[0]));
      else for (var pk = 0; pk < run.length; pk += per) {
        var row = run.slice(pk, pk + per);
        parts.push('<div class="cell s12"><div class="strip" style="--n:' + row.length + '">' + row.map(function (x) { return '<div class="kc">' + x.html + '</div>'; }).join('') + '</div></div>');
      }
      pi = pj;
    }
    parts = parts.join('');
    if (!ctx.rows.length) parts = '<div class="cell s12"><div class="empty">Sin datos para la selección</div></div>';
    return '<div class="root"><div class="bar"></div>' + head + missing + diag + renderFilters(ctx) + '<div class="grid">' + parts + '</div></div>';
  }
}
function defaultSpan(type) {
  return /^kpi/.test(type) ? 3 : /bubble/.test(type) ? 6 : /table|matrix/.test(type) ? 12 : 6;
}
