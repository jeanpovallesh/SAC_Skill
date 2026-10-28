function renderStackedBars(ctx, c, pct) {
  var axis = c.uses.axis, series = c.uses.series, mid = asArray(c.uses.measures)[0];
  var o = c.options || {};
  var agg = aggregate(ctx.rows, [axis, series], [mid]).list;
  var cats = new Map();
  agg.forEach(function (g) {
    var k = g.cells[0].key;
    if (!cats.has(k)) cats.set(k, { key: k, label: g.cells[0].label, total: 0, segs: [] });
    var e = cats.get(k), v = g.v[mid] || 0;
    e.total += v; e.segs.push({ key: g.cells[1].key, label: g.cells[1].label, v: v });
  });
  var list = Array.from(cats.values());
  var sort = o.sort || 'total-desc';
  list.sort(sort === 'label' ? function (a, b) { return cmpNatural(a.label, b.label); } :
    sort === 'total-asc' ? function (a, b) { return a.total - b.total; } :
    sort === 'order' ? function (a, b) { return cmpNatural(a.key, b.key); } :
    function (a, b) { return b.total - a.total; });
  if (o.topN) list = list.slice(0, o.topN);
  if (!list.length) return card(ctx.t(c), '<div class="empty">Sin datos para la selección</div>');
  var maxTot = Math.max.apply(null, list.map(function (e) { return e.total; })) || 1;
  var seriesSeen = new Map();
  var bars = list.map(function (e) {
    e.segs.sort(function (a, b) { return cmpNatural(a.key, b.key); });
    var segs = e.segs.map(function (s) {
      seriesSeen.set(s.key, s.label);
      var w = pct ? (e.total ? s.v / e.total * 100 : 0) : (s.v / maxTot * 100);
      return '<div class="sg" style="width:' + w.toFixed(2) + '%;background:' + esc(colorFor(series, s.key)) + '" title="' + esc(s.label + ': ' + fmtMeasure(s.v, mid, ctx.rows)) + '"></div>';
    }).join('');
    return '<div class="hb"><span class="lb" title="' + esc(e.label) + '">' + esc(e.label) + '</span><div class="tr">' + segs + '</div>' +
      (o.showTotal ? '<span class="tt">' + esc(fmtMeasure(e.total, mid, ctx.rows, { compact: true })) + '</span>' : '') + '</div>';
  }).join('');
  var lg = legend(Array.from(seriesSeen.entries()).sort(function (a, b) { return cmpNatural(a[0], b[0]); })
    .map(function (e) { return { label: e[1], color: colorFor(series, e[0]) }; }));
  return card(ctx.t(c), bars + lg);
}
COMPONENTS['stacked-100-bars'] = { render: function (ctx, c) { return renderStackedBars(ctx, c, true); } };
COMPONENTS['stacked-bars'] = { render: function (ctx, c) { return renderStackedBars(ctx, c, false); } };
