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
    this._last = null;
    this._width = 0;
    this._box.addEventListener('click', function (e) { self._onAct(e); });
    this._box.addEventListener('change', function (e) { self._onAct(e); });
    this._box.addEventListener('input', function (e) { if (e.target && e.target.getAttribute && /^(fq|q)$/.test(e.target.getAttribute('data-act') || '')) self._onAct(e); });
    this._box.addEventListener('keydown', function (e) {
      var t = e.target;
      if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('data-act') === 'sort') { e.preventDefault(); self._onAct(e); }
      if (e.key === 'Escape') { Object.keys(self._uiState).forEach(function (k) { self._uiState[k].open = false; }); self._render(); }
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
  onCustomWidgetDestroy() { if (this._ro) this._ro.disconnect(); }
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
      state: function (k, d) { return self._compState[k] || (self._compState[k] = d); }
    };
  }
  _onAct(e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    this._focusQ = el && el.getAttribute('data-act') === 'q' ? el.getAttribute('data-comp') : null;
    if (!el || !this._last || this._last.state !== 'success') return;
    if (e.type === 'change' && el.getAttribute('data-act') !== 'fopt') return;
    if (e.type === 'click' && el.getAttribute('data-act') === 'fopt') return;
    var ctx = this._ctx(this._last), changed = false;
    var act = el.getAttribute('data-act');
    if (/^f/.test(act)) changed = handleFilterAct(ctx, el);
    else {
      var cid = el.getAttribute('data-comp');
      var c = SPEC.components.filter(function (x) { return x.id === cid; })[0];
      var impl = c && COMPONENTS[c.type];
      if (impl && impl.act) changed = impl.act(ctx, el, c);
    }
    if (changed) this._render();
  }
  /* ---- render ---- */
  _render() {
    try {
      var read = readBinding(this.myDataBinding);
      if (read.state === 'loading') { this._box.classList.add('loading'); return; }   // conserva el último render
      this._box.classList.remove('loading');
      if (read.state === 'success') { this._last = read; initFilterDefaults(read.rows, this._sel, this._inited); }
      this._measure();
      this._box.innerHTML = this._html(read);
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
    var missing = read.missing.length ? '<div class="notice" role="status">Faltan feeds por asignar: ' + esc(read.missing.join(', ')) + '</div>' : '';
    var ctx = this._ctx(read);
    var parts = SPEC.components.map(function (c) {
      var ok = asArray(c.requires).every(function (r) { return ctx.have(r); });
      if (!ok) return '';
      var impl = COMPONENTS[c.type];
      var html = impl ? impl.render(ctx, c) : '<div class="notice">Componente no disponible: ' + esc(c.type) + '</div>';
      return html ? '<div class="cell s' + (c.span || defaultSpan(c.type)) + '">' + html + '</div>' : '';
    }).join('');
    if (!ctx.rows.length) parts = '<div class="cell s12"><div class="empty">Sin datos para la selección</div></div>';
    return '<div class="root"><div class="bar"></div>' + head + missing + renderFilters(ctx) + '<div class="grid">' + parts + '</div></div>';
  }
}
function defaultSpan(type) {
  return /^kpi/.test(type) ? 3 : /table|matrix/.test(type) ? 12 : 6;
}
