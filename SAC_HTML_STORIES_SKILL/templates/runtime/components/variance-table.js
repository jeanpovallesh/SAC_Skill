/* variance-table: compara dos miembros de una dimensión (versión por defecto) → Base · Comparar · Δ · Δ% por medida.
   Los dos miembros se eligen con selectores del componente entre los que dejan pasar los filtros del tablero (D11: la Versión
   se filtra con el filtro obligatorio; con un solo miembro seleccionado el componente pide elegir al menos dos). */
COMPONENTS['variance-table'] = {
  render: function (ctx, c) {
    var o = c.options || {}, cmp = SPEC.comparison || {}, dimRef = cmp.dimension;
    var ref = asArray(c.uses.rows)[0];
    var mids = asArray(c.uses.measures).filter(function (m) { return !o.dropColumnsWithoutData || ctx.have(m); });
    var st = ctx.state(c.id, { sort: null, dir: 1, page: 0, q: '', base: null, act: null });
    var dimLabel = (feedDef(dimRef) || {}).label || dimRef;
    var seen = new Map();
    ctx.rows.forEach(function (rec) { if (rec.sub) return; var cl = cellOf(rec, dimRef); if (!seen.has(cl.key)) seen.set(cl.key, cl.label); });
    var mem = Array.from(seen, function (e) { return { key: e[0], label: e[1] }; });
    mem.sort(function (a, b) { return cmpNatural(a.key, b.key); });
    if (mem.length < 2) return card(ctx.t(c), '<div class="empty">Selecciona al menos dos valores de «' + esc(dimLabel) + '» en el filtro para compararlos</div>');
    var has = function (k) { return mem.some(function (m) { return m.key === k; }); };
    var pref = function (id) { return id == null ? null : memberKey(id); };
    if (!has(st.base)) st.base = has(pref(cmp.base)) ? pref(cmp.base) : mem[0].key;
    if (!has(st.act) || st.act === st.base) {
      st.act = has(pref(cmp.actual)) && pref(cmp.actual) !== st.base ? pref(cmp.actual) : (mem.filter(function (m) { return m.key !== st.base; })[0] || mem[0]).key;
    }
    var lab = function (k) { return mem.filter(function (m) { return m.key === k; })[0].label; };
    var rowsOf = function (k) { return ctx.rows.filter(function (rec) { return cellOf(rec, dimRef).key === k; }); };
    var rb = rowsOf(st.base), ra = rowsOf(st.act);
    var gb = aggregate(rb, [ref], mids), ga = aggregate(ra, [ref], mids);
    var map = new Map();
    gb.list.forEach(function (g) { map.set(g.key, { cells: g.cells, b: g.v, a: {} }); });
    ga.list.forEach(function (g) { var e = map.get(g.key); if (!e) map.set(g.key, e = { cells: g.cells, b: {}, a: {} }); e.a = g.v; });
    var isPct = function (m) { return /^percent/.test((measureDef(m) || {}).format || ''); };
    var delta = function (m, b, a) {
      var d = b == null || a == null ? null : a - b;
      return { d: d, p: d == null || isPct(m) || !b ? null : d / Math.abs(b) };
    };
    var list = Array.from(map.values()).map(function (e) {
      var r = { label: e.cells[0].label, v: {} };
      mids.forEach(function (m) { var x = delta(m, e.b[m], e.a[m]); r.v[m + '|b'] = e.b[m] == null ? null : e.b[m]; r.v[m + '|a'] = e.a[m] == null ? null : e.a[m]; r.v[m + '|d'] = x.d; r.v[m + '|p'] = x.p; });
      return r;
    });
    var tot = { v: {} };
    mids.forEach(function (m) { var b = gb.total[m], a = ga.total[m], x = delta(m, b, a); tot.v[m + '|b'] = b; tot.v[m + '|a'] = a; tot.v[m + '|d'] = x.d; tot.v[m + '|p'] = x.p; });
    if (o.search === 'rows' && st.q) { var q = norm(st.q); list = list.filter(function (r) { return norm(r.label).indexOf(q) >= 0; }); }
    if (st.sort) {
      list.sort(function (a, b) {
        var x = st.sort === '_label' ? a.label : a.v[st.sort], y = st.sort === '_label' ? b.label : b.v[st.sort];
        if (typeof x === 'string') return cmpNatural(x, y) * st.dir;
        return ((x == null ? -Infinity : x) - (y == null ? -Infinity : y)) * st.dir;
      });
    } else list.sort(function (a, b) { return cmpNatural(a.label, b.label); });
    var big = {};
    mids.forEach(function (m) { big[m] = o.compact != null ? !!o.compact : isBig(list.map(function (r) { return r.v[m + '|b']; }).concat(list.map(function (r) { return r.v[m + '|a']; }))); });
    var ps = o.pageSize || 0, pages = ps ? Math.max(1, Math.ceil(list.length / ps)) : 1;
    st.page = clamp(st.page, 0, pages - 1);
    var view = ps ? list.slice(st.page * ps, st.page * ps + ps) : list;
    var dcell = function (m, r) {
      var d = r.v[m + '|d'], p = r.v[m + '|p'], dir = (measureDef(m) || {}).goodDirection || 'up';
      var cls = d == null || d === 0 ? '' : ((d > 0) === (dir === 'up') ? 'pos' : 'neg');
      var sym = d == null || d === 0 ? '' : d > 0 ? '▲ ' : '▼ ';
      var txt = d == null ? '—' : isPct(m) ? sym + (d > 0 ? '+' : '') + fmt(d * 100, 'decimal1') + ' pt' : sym + (d > 0 ? '+' : '') + fmtMeasure(d, m, ctx.rows, { compact: big[m] });
      var ptxt = p == null ? '—' : sym + (p > 0 ? '+' : '') + fmt(p, 'percent1');
      return '<td class="num ' + cls + '">' + esc(txt) + '</td><td class="num ' + (p == null ? '' : cls) + '">' + esc(ptxt) + '</td>';
    };
    var vcell = function (m, r, k) { return cellTd(r.v[m + '|' + k], m, ctx.rows, big[m]); };
    var th = function (key, label, cls) {
      var ar = st.sort === key ? (st.dir > 0 ? ' ▲' : ' ▼') : '';
      return '<th tabindex="0" class="' + cls + '" data-act="sort" data-comp="' + esc(c.id) + '" data-key="' + esc(key) + '" aria-sort="' + (st.sort === key ? (st.dir > 0 ? 'ascending' : 'descending') : 'none') + '">' + esc(label) + ar + '</th>';
    };
    var h1 = '<tr><th rowspan="2">' + esc((feedDef(ref) || {}).label || ref) + '</th>' + mids.map(function (m) { return '<th colspan="4" class="num">' + esc(mlabel(m)) + '</th>'; }).join('') + '</tr>';
    var h2 = '<tr>' + mids.map(function (m) { return th(m + '|b', lab(st.base), 'num') + th(m + '|a', lab(st.act), 'num') + th(m + '|d', 'Δ', 'num') + th(m + '|p', 'Δ %', 'num'); }).join('') + '</tr>';
    var body = view.map(function (r) {
      return '<tr><td>' + esc(r.label) + '</td>' + mids.map(function (m) { return vcell(m, r, 'b') + vcell(m, r, 'a') + dcell(m, r); }).join('') + '</tr>';
    }).join('');
    var foot = o.totalsRow ? '<tfoot><tr><td>Total</td>' + mids.map(function (m) { return vcell(m, tot, 'b') + vcell(m, tot, 'a') + dcell(m, tot); }).join('') + '</tr></tfoot>' : '';
    var opt = function (k, sel) { return mem.map(function (m) { return '<option value="' + esc(m.key) + '"' + (m.key === sel ? ' selected' : '') + '>' + esc(m.label) + '</option>'; }).join(''); };
    var tools = '<div class="tools"><label>Base <select data-act="vsel" data-which="base" data-comp="' + esc(c.id) + '" aria-label="Base">' + opt('base', st.base) + '</select></label> ' +
      '<label>Comparar <select data-act="vsel" data-which="act" data-comp="' + esc(c.id) + '" aria-label="Comparar">' + opt('act', st.act) + '</select></label>' +
      (o.search === 'rows' ? ' <input type="search" placeholder="Buscar…" aria-label="Buscar" value="' + esc(st.q) + '" data-act="q" data-comp="' + esc(c.id) + '">' : '') + '</div>';
    var pager = ps && pages > 1 ? '<div class="pager"><button data-act="pg" data-comp="' + esc(c.id) + '" data-d="-1">‹</button><span>' + (st.page + 1) + ' / ' + pages + '</span><button data-act="pg" data-comp="' + esc(c.id) + '" data-d="1">›</button></div>' : '';
    if (!list.length) return card(ctx.t(c), tools + '<div class="empty">Sin datos para la selección</div>');
    return card(ctx.t(c), tools + '<div class="tbl-w"><table><thead>' + h1 + h2 + '</thead><tbody>' + body + '</tbody>' + foot + '</table></div>' + pager);
  },
  act: function (ctx, el, c) {
    var st = ctx.state(c.id, {});
    var a = el.getAttribute('data-act');
    if (a === 'sort') { var k = el.getAttribute('data-key'); st.dir = st.sort === k ? -st.dir : 1; st.sort = k; }
    else if (a === 'pg') st.page += +el.getAttribute('data-d');
    else if (a === 'q') { st.q = el.value; st.page = 0; }
    else if (a === 'vsel') {
      var w = el.getAttribute('data-which');
      if (w === 'base') { st.base = el.value; if (st.act === st.base) st.act = null; } else st.act = el.value;
    }
    return true;
  }
};
