/* needs:echarts */
function refValue(ctx, spec, vals, isPct) {
  if (spec == null) return null;
  if (spec === 'median' || spec === 'mean') {
    var s = vals.slice().sort(function (a, b) { return a - b; });
    if (!s.length) return null;
    return spec === 'mean' ? s.reduce(function (a, b) { return a + b; }, 0) / s.length : (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);
  }
  var n = typeof spec === 'number' ? spec : parseFloat(ctx.prop(spec));
  if (!isFinite(n)) return null;
  return isPct ? n / 100 : n;
}
COMPONENTS['bubble-matrix'] = {
  render: function (ctx, c) {
    var u = c.uses, o = c.options || {};
    var agg = aggregate(ctx.rows, [u.axis], [u.x, u.y, u.size]).list;
    var pts = agg.filter(function (g) { return g.v[u.x] != null && g.v[u.y] != null && g.v[u.size] != null; });
    if (pts.length < 2) return card(ctx.t(c), '<div class="empty">Sin datos suficientes para la selección</div>');
    var sel = ctx.group(o.selectionGroup);
    var maxS = Math.max.apply(null, pts.map(function (g) { return Math.abs(g.v[u.size]); })) || 1;
    var yPct = /^percent/.test((measureDef(u.y) || {}).format || '');
    var data = pts.map(function (g) {
      var r = 14 + 30 * Math.sqrt(Math.max(Math.abs(g.v[u.size]), 0) / maxS);
      return { name: g.cells[0].label, key: g.cells[0].key, value: [g.v[u.x], g.v[u.y], g.v[u.size]], symbolSize: r * 2,
        itemStyle: { color: colorFor(u.axis, g.cells[0].key), opacity: sel ? dim(sel, g.cells[0].key) : 0.8 } };
    }).sort(function (a, b) { return b.symbolSize - a.symbolSize; });
    var ml = [];
    var yr = refValue(ctx, o.yReference, pts.map(function (g) { return g.v[u.y]; }), yPct);
    var xr = refValue(ctx, o.xReference, pts.map(function (g) { return g.v[u.x]; }), false);
    if (yr != null) ml.push({ yAxis: yr, label: { formatter: fmt(yr, (measureDef(u.y) || {}).format), position: 'insideEndTop', fontFamily: FONT } });
    if (xr != null) ml.push({ xAxis: xr, label: { formatter: fmt(xr, (measureDef(u.x) || {}).format, { compact: true }), position: 'insideEndTop', fontFamily: FONT } });
    var rng = function (vals, ref) {
      var a = vals.concat(ref != null ? [ref] : []), lo = Math.min.apply(null, a), hi = Math.max.apply(null, a), pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
      return { min: lo - pad, max: hi + pad };
    };
    var rx0 = pts.map(function (g) { return g.v[u.x]; });
    var rx = rng(pts.map(function (g) { return g.v[u.x]; }), xr), ry = rng(pts.map(function (g) { return g.v[u.y]; }), yr);
    if (Math.min.apply(null, rx0) >= 0) rx.min = 0;
    var lab = mlabel;
    var opt = { aria: { enabled: true }, textStyle: baseTextStyle(), animation: false,
      grid: { left: 84, right: 24, top: 24, bottom: 48 },
      tooltip: { trigger: 'item', confine: true, formatter: function (p) {
        return '<b>' + esc(p.name) + '</b><br>' + esc(lab(u.x)) + ': ' + esc(fmtMeasure(p.value[0], u.x, ctx.rows)) + '<br>' + esc(lab(u.y)) + ': ' + esc(fmtMeasure(p.value[1], u.y, ctx.rows)) + '<br>' + esc(lab(u.size)) + ': ' + esc(fmtMeasure(p.value[2], u.size, ctx.rows)); } },
      xAxis: { type: 'value', name: lab(u.x), nameLocation: 'middle', nameGap: 28, min: rx.min, max: rx.max, axisLabel: { formatter: function (v) { return fmt(v, (measureDef(u.x) || {}).format, { compact: true }); } }, splitLine: { lineStyle: { color: '#e5e9f0' } } },
      yAxis: { type: 'value', name: lab(u.y), nameLocation: 'middle', nameGap: 60, min: ry.min, max: ry.max, axisLabel: { formatter: function (v) { return fmt(v, (measureDef(u.y) || {}).format); } }, splitLine: { lineStyle: { color: '#e5e9f0' } } },
      series: [{ type: 'scatter', data: data, label: { show: false },
        markLine: ml.length ? { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: THC.texto2 || '#45464d' }, data: ml } : undefined }] };
    var lg = legend(data.slice().sort(function (a, b) { return cmpNatural(a.name, b.name); }).map(function (d) { return { label: d.name, color: d.itemStyle.color }; }));
    return card(ctx.t(c), chartHost(ctx, c.id, opt, 300, o.selectionGroup ? function (p) { return { g: o.selectionGroup, k: p.data && p.data.key }; } : null) + lg);
  }
};
