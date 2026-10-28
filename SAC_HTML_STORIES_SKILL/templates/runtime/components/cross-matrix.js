COMPONENTS['cross-matrix'] = {
  render: function (ctx, c) {
    var u = c.uses, o = c.options || {}, mid = asArray(u.measures)[0];
    var st = ctx.state(c.id, { sort: null, dir: -1, page: 0, q: '' });
    var cell = aggregate(ctx.rows, [u.rows, u.columns], [mid]).list;
    var rowT = aggregate(ctx.rows, [u.rows], [mid]);
    var colT = aggregate(ctx.rows, [u.columns], [mid]);
    var cols = colT.list.map(function (g) { return g.cells[0]; });
    var cd = feedDef(u.columns) || {};
    cols.sort(cd.ordered ? function (a, b) { return cmpNatural(a.key, b.key); } : function (a, b) { return cmpNatural(a.label, b.label); });
    var map = {};
    cell.forEach(function (g) { map[g.cells[0].key + '\u0001' + g.cells[1].key] = g.v[mid]; });
    var rows = rowT.list.map(function (g) { return { key: g.cells[0].key, label: g.cells[0].label, tot: g.v[mid] }; });
    if (o.search === 'rows' && st.q) { var q = norm(st.q); rows = rows.filter(function (r) { return norm(r.label + r.key).indexOf(q) >= 0; }); }
    var val = function (r, ck) { return ck === '_tot' ? r.tot : map[r.key + '\u0001' + ck]; };
    if (st.sort) rows.sort(function (a, b) { var x = val(a, st.sort), y = val(b, st.sort); return ((x == null ? -Infinity : x) - (y == null ? -Infinity : y)) * st.dir; });
    else rows.sort(function (a, b) { return (b.tot || 0) - (a.tot || 0); });
    var ps = o.pageSize || 0, pages = ps ? Math.max(1, Math.ceil(rows.length / ps)) : 1;
    st.page = clamp(st.page, 0, pages - 1);
    var view = ps ? rows.slice(st.page * ps, st.page * ps + ps) : rows;
    var vals = cell.map(function (g) { return g.v[mid]; }).filter(function (x) { return x != null; }).sort(function (a, b) { return a - b; });
    var heat = function (v) {
      if (!o.heat || v == null || vals.length < 2) return '';
      var lo = 0, hi = vals.length;
      while (lo < hi) { var m = (lo + hi) >> 1; if (vals[m] < v) lo = m + 1; else hi = m; }
      return ' style="background:color-mix(in srgb,var(--c-acento) ' + Math.round(lo / (vals.length - 1) * 38) + '%,var(--c-superficie))"';
    };
    var th = function (k, l, cls) { return '<th tabindex="0" class="' + cls + '" data-act="msort" data-comp="' + esc(c.id) + '" data-key="' + esc(k) + '">' + esc(l) + (st.sort === k ? (st.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>'; };
    var head = '<tr><th>' + esc((feedDef(u.rows) || {}).label || u.rows) + '</th>' + cols.map(function (k) { return th(k.key, k.label, 'num'); }).join('') + (o.rowTotal ? th('_tot', 'Total', 'num') : '') + '</tr>';
    var body = view.map(function (r) {
      return '<tr><td><i class="dot" style="background:' + esc(colorFor(u.rows, r.key)) + '"></i>' + esc(r.label) + '</td>' +
        cols.map(function (k) { var v = map[r.key + '\u0001' + k.key]; return '<td class="num"' + heat(v) + '>' + esc(fmtMeasure(v, mid, ctx.rows)) + '</td>'; }).join('') +
        (o.rowTotal ? '<td class="num"><b>' + esc(fmtMeasure(r.tot, mid, ctx.rows)) + '</b></td>' : '') + '</tr>';
    }).join('');
    var foot = o.columnTotal ? '<tfoot><tr><td>Total</td>' + cols.map(function (k) {
      var t = colT.list.filter(function (g) { return g.cells[0].key === k.key; })[0];
      return '<td class="num">' + esc(fmtMeasure(t && t.v[mid], mid, ctx.rows)) + '</td>'; }).join('') + (o.rowTotal ? '<td class="num">' + esc(fmtMeasure(colT.total[mid], mid, ctx.rows)) + '</td>' : '') + '</tr></tfoot>' : '';
    var tools = o.search === 'rows' ? '<div class="tools"><input type="search" placeholder="Buscar…" aria-label="Buscar" value="' + esc(st.q) + '" data-act="q" data-comp="' + esc(c.id) + '"></div>' : '';
    var pager = ps && pages > 1 ? '<div class="pager"><button data-act="pg" data-comp="' + esc(c.id) + '" data-d="-1">‹</button><span>' + (st.page + 1) + ' / ' + pages + '</span><button data-act="pg" data-comp="' + esc(c.id) + '" data-d="1">›</button></div>' : '';
    if (!rows.length) return card(ctx.t(c), tools + '<div class="empty">Sin datos para la selección</div>');
    return card(ctx.t(c), tools + '<div class="tbl-w"><table><thead>' + head + '</thead><tbody>' + body + '</tbody>' + foot + '</table></div>' + pager);
  },
  act: function (ctx, el, c) {
    var st = ctx.state(c.id, {}), a = el.getAttribute('data-act');
    if (a === 'msort') { var k = el.getAttribute('data-key'); st.dir = st.sort === k ? -st.dir : -1; st.sort = k; }
    else if (a === 'pg') st.page += +el.getAttribute('data-d');
    else if (a === 'q') { st.q = el.value; st.page = 0; }
    return true;
  }
};
