COMPONENTS['detail-table'] = {
  render: function (ctx, c) {
    var o = c.options || {};
    var ref = asArray(c.uses.rows)[0];
    var mids = asArray(c.uses.measures).filter(function (m) { return !o.dropColumnsWithoutData || ctx.have(m); });
    var st = ctx.state(c.id, { sort: null, dir: 1, page: 0, q: '' });
    var agg = aggregate(ctx.rows, [ref], mids);
    var list = agg.list;
    if (o.search === 'rows' && st.q) {
      var q = norm(st.q);
      list = list.filter(function (g) { return norm(g.cells[0].label + g.cells[0].key).indexOf(q) >= 0; });
    }
    if (st.sort) {
      list = list.slice().sort(function (a, b) {
        var x = st.sort === '_label' ? a.cells[0].label : a.v[st.sort], y = st.sort === '_label' ? b.cells[0].label : b.v[st.sort];
        if (typeof x === 'string') return cmpNatural(x, y) * st.dir;
        return ((x == null ? -Infinity : x) - (y == null ? -Infinity : y)) * st.dir;
      });
    } else list = list.slice().sort(function (a, b) { return cmpNatural(a.cells[0].label, b.cells[0].label); });
    var bigM = {};
    mids.forEach(function (m) { bigM[m] = o.compact != null ? !!o.compact : isBig(list.map(function (g) { return g.v[m]; }).concat([agg.total[m]])); });
    var ps = o.pageSize || 0, pages = ps ? Math.max(1, Math.ceil(list.length / ps)) : 1;
    st.page = clamp(st.page, 0, pages - 1);
    var view = ps ? list.slice(st.page * ps, st.page * ps + ps) : list;
    var th = function (key, label, cls) {
      var ar = st.sort === key ? (st.dir > 0 ? ' ▲' : ' ▼') : '';
      return '<th tabindex="0" class="' + cls + '" data-act="sort" data-comp="' + esc(c.id) + '" data-key="' + esc(key) + '" aria-sort="' + (st.sort === key ? (st.dir > 0 ? 'ascending' : 'descending') : 'none') + '">' + esc(label) + ar + '</th>';
    };
    var head = '<tr>' + th('_label', (feedDef(ref) || {}).label || ref, '') + mids.map(function (m) { return th(m, mlabel(m), 'num'); }).join('') + '</tr>';
    var body = view.map(function (g) {
      return '<tr><td>' + esc(g.cells[0].label) + '</td>' + mids.map(function (m) { return cellTd(g.v[m], m, ctx.rows, bigM[m]); }).join('') + '</tr>';
    }).join('');
    var foot = o.totalsRow ? '<tfoot><tr><td>Total</td>' + mids.map(function (m) { return cellTd(agg.total[m], m, ctx.rows, bigM[m]); }).join('') + '</tr></tfoot>' : '';
    var tools = o.search === 'rows' ? '<div class="tools"><input type="search" placeholder="Buscar…" aria-label="Buscar" value="' + esc(st.q) + '" data-act="q" data-comp="' + esc(c.id) + '"></div>' : '';
    var pager = ps && pages > 1 ? '<div class="pager"><button data-act="pg" data-comp="' + esc(c.id) + '" data-d="-1">‹</button><span>' + (st.page + 1) + ' / ' + pages + '</span><button data-act="pg" data-comp="' + esc(c.id) + '" data-d="1">›</button></div>' : '';
    if (!list.length) return card(ctx.t(c), tools + '<div class="empty">Sin datos para la selección</div>');
    return card(ctx.t(c), tools + '<div class="tbl-w"><table><thead>' + head + '</thead><tbody>' + body + '</tbody>' + foot + '</table></div>' + pager);
  },
  act: function (ctx, el, c) {
    var st = ctx.state(c.id, {});
    var a = el.getAttribute('data-act');
    if (a === 'sort') { var k = el.getAttribute('data-key'); st.dir = st.sort === k ? -st.dir : 1; st.sort = k; }
    else if (a === 'pg') st.page += +el.getAttribute('data-d');
    else if (a === 'q') { st.q = el.value; st.page = 0; }
    return true;
  }
};
