/* Tabla dinámica: filas y columnas anidadas, varias medidas, subtotales por nodo, totales y expandir/contraer.
   Cada celda se agrega con el motor (respeta saldos semiaditivos y ratios suma/suma): no suma celdas ya sumadas. */
COMPONENTS['pivot-table'] = {
  render: function (ctx, c) {
    var u = c.uses, o = c.options || {}, SEP = '\u0001';
    var R = asArray(u.rows), C = asArray(u.columns);
    var M = asArray(u.measures).filter(function (m) { return !o.dropColumnsWithoutData || ctx.have(m); });
    var st = ctx.state(c.id, { open: {}, sort: null, dir: -1, q: '', page: 0 });
    var expandLevels = st.expand != null ? st.expand : (o.expandLevels == null ? R.length : o.expandLevels);
    var IDX = {};
    var idx = function (a, b) {
      var k = a + ':' + b;
      if (!IDX[k]) {
        var m = new Map();
        aggregate(ctx.rows, R.slice(0, a).concat(C.slice(0, b)), M).list.forEach(function (g) { m.set(g.key, g); });
        IDX[k] = m;
      }
      return IDX[k];
    };
    var grand = aggregate(ctx.rows, [], M).total;
    /* ---- árbol de filas ---- */
    var rowLeaves = aggregate(ctx.rows, R, []).list;
    var nodes = {}, roots = [];
    rowLeaves.forEach(function (g) {
      for (var a = 1; a <= R.length; a++) {
        var path = g.cells.slice(0, a), key = path.map(function (x) { return x.key; }).join(SEP);
        if (!nodes[key]) {
          nodes[key] = { key: key, level: a - 1, path: path, cell: path[a - 1], kids: [] };
          if (a === 1) roots.push(nodes[key]); else nodes[path.slice(0, a - 1).map(function (x) { return x.key; }).join(SEP)].kids.push(nodes[key]);
        }
      }
    });
    /* ---- hojas de columnas ---- */
    var colLeaves = [];
    if (C.length) {
      aggregate(ctx.rows, C, []).list.forEach(function (g) { colLeaves.push({ path: g.cells, keys: g.cells.map(function (x) { return x.key; }) }); });
      var ordered = C.map(function (r) { return (feedDef(r) || {}).ordered; });
      colLeaves.sort(function (a, b) {
        for (var i = 0; i < C.length; i++) {
          var d = ordered[i] ? cmpNatural(a.keys[i], b.keys[i]) : cmpNatural(a.path[i].label, b.path[i].label);
          if (d) return d;
        }
        return 0;
      });
    } else colLeaves.push({ path: [], keys: [] });
    var val = function (node, leaf, m) {
      var g = idx(node.level + 1, C.length).get(node.path.map(function (x) { return x.key; }).concat(leaf.keys).join(SEP));
      return g ? g.v[m] : null;
    };
    var sortVal = function (node) {
      if (!st.sort) return null;
      var leaf = st.sort.col === -1 ? null : colLeaves[st.sort.col];
      if (!leaf) { var g = idx(node.level + 1, 0).get(node.key); return g ? g.v[st.sort.m] : null; }
      return val(node, leaf, st.sort.m);
    };
    var order = function (arr) {
      return arr.slice().sort(function (a, b) {
        if (st.sort) {
          var x = sortVal(a), y = sortVal(b);
          return ((x == null ? -Infinity : x) - (y == null ? -Infinity : y)) * st.dir;
        }
        return (feedDef(R[a.level]) || {}).ordered ? cmpNatural(a.cell.key, b.cell.key) : cmpNatural(a.cell.label, b.cell.label);
      });
    };
    var q = o.search === 'rows' ? norm(st.q) : '';
    var isOpen = function (n) { return n.key in st.open ? st.open[n.key] : n.level < expandLevels; };
    var vis = [];
    var walk = function (n) {
      vis.push(n);
      if (n.kids.length && isOpen(n)) order(n.kids).forEach(walk);
    };
    var rts = order(roots);
    if (q) rts = rts.filter(function (n) { return norm(n.cell.label + ' ' + n.cell.key).indexOf(q) >= 0; });
    rts.forEach(walk);
    if (!vis.length) return card(ctx.t(c), (o.search === 'rows' ? '<div class="tools"><input type="search" placeholder="Buscar…" aria-label="Buscar" value="' + esc(st.q) + '" data-act="q" data-comp="' + esc(c.id) + '"></div>' : '') + '<div class="empty">Sin datos para la selección</div>');
    var MAXR = o.maxRows || 1000, cut = vis.length > MAXR;
    if (cut) vis = vis.slice(0, MAXR);
    /* ---- cabeceras ---- */
    var idmap = {}, nid = 0, cid = esc(c.id);
    var showM = M.length > 1 || !C.length;
    var per = M.length;
    var head = '';
    for (var lv = 0; lv < C.length; lv++) {
      var h = '<tr>' + (lv === 0 ? '<th class="lbl" rowspan="' + (C.length + (showM ? 1 : 0)) + '">' + esc(R.map(function (r) { return (feedDef(r) || {}).label || r; }).join(' / ')) + '</th>' : '');
      var i = 0;
      while (i < colLeaves.length) {
        var j = i;
        while (j + 1 < colLeaves.length && colLeaves[j + 1].keys.slice(0, lv + 1).join(SEP) === colLeaves[i].keys.slice(0, lv + 1).join(SEP)) j++;
        h += '<th class="ctr" colspan="' + ((j - i + 1) * per) + '">' + esc(colLeaves[i].path[lv].label) + '</th>';
        i = j + 1;
      }
      if (o.rowTotal && lv === 0) h += '<th class="ctr" colspan="' + per + '" rowspan="' + (C.length) + '">Total</th>';
      head += h + '</tr>';
    }
    if (showM) {
      var hm = '<tr>' + (C.length ? '' : '<th class="lbl">' + esc(R.map(function (r) { return (feedDef(r) || {}).label || r; }).join(' / ')) + '</th>');
      var mh = function (ci, m) {
        var on = st.sort && st.sort.col === ci && st.sort.m === m;
        return '<th tabindex="0" class="num" data-act="psort" data-comp="' + cid + '" data-col="' + ci + '" data-m="' + esc(m) + '">' + esc(mlabel(m)) + (on ? (st.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>';
      };
      colLeaves.forEach(function (lf, ci) { M.forEach(function (m) { hm += mh(ci, m); }); });
      if (o.rowTotal) M.forEach(function (m) { hm += mh(-1, m); });
      head += hm + '</tr>';
    } else if (o.rowTotal && !C.length) { /* sin columnas ni varias medidas: el total es la única columna */ }
    /* ---- cuerpo ---- */
    var heatVals = {};
    if (o.heat) M.forEach(function (m) {
      var arr = [];
      vis.forEach(function (n) { colLeaves.forEach(function (lf) { var v = val(n, lf, m); if (v != null) arr.push(v); }); });
      heatVals[m] = arr.sort(function (a, b) { return a - b; });
    });
    var heat = function (m, v) {
      var arr = heatVals[m];
      if (!arr || v == null || arr.length < 2) return '';
      var lo = 0, hi = arr.length;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (arr[mid] < v) lo = mid + 1; else hi = mid; }
      return ' style="background:color-mix(in srgb,var(--c-acento) ' + Math.round(lo / (arr.length - 1) * 38) + '%,var(--c-superficie))"';
    };
    var bigM = {};
    M.forEach(function (m) {
      var vs = [grand[m]];
      vis.forEach(function (n) { colLeaves.forEach(function (lf) { vs.push(val(n, lf, m)); }); });
      bigM[m] = o.compact != null ? !!o.compact : isBig(vs);
    });
    var body = vis.map(function (n) {
      var id = 'n' + (nid++); idmap[id] = n.key;
      var tg = n.kids.length ? '<span class="tg" role="button" tabindex="0" aria-expanded="' + isOpen(n) + '" data-act="ptoggle" data-comp="' + cid + '" data-k="' + id + '">' + (isOpen(n) ? '▾' : '▸') + '</span>' : '<span class="tg"></span>';
      var parent = n.kids.length;
      var cells = colLeaves.map(function (lf) { return M.map(function (m) { var v = val(n, lf, m); return cellTd(v, m, ctx.rows, bigM[m], parent ? '' : heat(m, v)); }).join(''); }).join('');
      var tot = o.rowTotal ? M.map(function (m) { var g = idx(n.level + 1, 0).get(n.key); return cellTd(g && g.v[m], m, ctx.rows, bigM[m], ' style="font-weight:700"'); }).join('') : '';
      return '<tr class="' + (parent ? 'pn' : '') + '"><td class="lbl" style="padding-left:' + (10 + n.level * 16) + 'px">' + tg + esc(n.cell.label) + '</td>' + cells + tot + '</tr>';
    }).join('');
    st.idmap = idmap;
    var foot = '';
    if (o.columnTotal) {
      var ft = '<tr><td class="lbl">Total</td>';
      colLeaves.forEach(function (lf) {
        var g = idx(0, C.length).get(lf.keys.join(SEP));
        M.forEach(function (m) { ft += cellTd(g && g.v[m], m, ctx.rows, bigM[m]); });
      });
      if (o.rowTotal) M.forEach(function (m) { ft += cellTd(grand[m], m, ctx.rows, bigM[m]); });
      foot = '<tfoot>' + ft + '</tr></tfoot>';
    }
    var tools = '<div class="tools">' + (o.search === 'rows' ? '<input type="search" placeholder="Buscar…" aria-label="Buscar" value="' + esc(st.q) + '" data-act="q" data-comp="' + cid + '">' : '') +
      (R.length > 1 ? '<button type="button" data-act="pexp" data-comp="' + cid + '">Expandir todo</button><button type="button" data-act="pcol" data-comp="' + cid + '">Contraer todo</button>' : '') + '</div>';
    return card(ctx.t(c), tools + '<div class="tbl-w"><table class="pv"><thead>' + head + '</thead><tbody>' + body + '</tbody>' + foot + '</table></div>' +
      (cut ? '<div class="kpi-s">Se muestran las primeras ' + MAXR + ' filas</div>' : ''));
  },
  act: function (ctx, el, c) {
    var st = ctx.state(c.id, {}), a = el.getAttribute('data-act');
    if (a === 'ptoggle') {
      var key = (st.idmap || {})[el.getAttribute('data-k')];
      if (key == null) return false;
      var cur = key in st.open ? st.open[key] : null;
      var o = c.options || {}, lvl = key.split('\u0001').length - 1, def = lvl < (st.expand != null ? st.expand : (o.expandLevels == null ? asArray(c.uses.rows).length : o.expandLevels));
      st.open[key] = !(cur == null ? def : cur);
    } else if (a === 'pexp' || a === 'pcol') {
      st.open = {};
      st.expand = a === 'pexp' ? asArray(c.uses.rows).length : 0;
    } else if (a === 'psort') {
      var col = +el.getAttribute('data-col'), m = el.getAttribute('data-m');
      st.dir = st.sort && st.sort.col === col && st.sort.m === m ? -st.dir : -1;
      st.sort = { col: col, m: m };
    } else if (a === 'q') { st.q = el.value; }
    return true;
  }
};
