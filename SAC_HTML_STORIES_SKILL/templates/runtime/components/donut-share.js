/* needs:echarts */
COMPONENTS['donut-share'] = {
  render: function (ctx, c) {
    var ax = c.uses.axis, mid = asArray(c.uses.measures)[0], o = c.options || {};
    var list = aggregate(ctx.rows, [ax], [mid]).list.map(function (g) { return { key: g.cells[0].key, label: g.cells[0].label, v: g.v[mid] }; })
      .filter(function (e) { return e.v != null && e.v > 0; }).sort(function (a, b) { return b.v - a.v; });
    var topN = o.topN || 6;
    if (list.length > topN) {
      var rest = list.slice(topN - 1), sum = rest.reduce(function (a, e) { return a + e.v; }, 0);
      list = list.slice(0, topN - 1).concat([{ key: '__otros', label: 'Otros', v: sum }]);
    }
    var total = list.reduce(function (a, e) { return a + e.v; }, 0);
    if (!total) return card(ctx.t(c), '<div class="empty">Sin datos para la selección</div>');
    var sel = ctx.group(o.selectionGroup);
    var series = [{ type: 'pie', radius: ['56%', '78%'], label: { show: false }, avoidLabelOverlap: true, itemStyle: { borderColor: THC.superficie || '#fff', borderWidth: 2 },
      data: list.map(function (e) { return { name: e.label, value: e.v, key: e.key, itemStyle: { color: colorFor(ax, e.key), opacity: dim(sel, e.key) } }; }) }];
    var opt = { aria: { enabled: true }, textStyle: baseTextStyle(), animation: false,
      tooltip: { trigger: 'item', confine: true, formatter: function (p) { return esc(p.name) + ': ' + esc(fmtMeasure(p.value, mid, ctx.rows)) + ' (' + fmt(p.value / total, 'percent1') + ')'; } },
      series: series };
    if (o.centerTotal) opt.graphic = [{ type: 'text', left: 'center', top: 'middle', style: { text: fmtMeasure(total, mid, ctx.rows, { compact: true }), fontSize: 14, fontWeight: 700, fontFamily: FONT, fill: THC.texto || '#0b1c30', textAlign: 'center' } }];
    var show = asArray(o.legend || ['share', 'value']);
    var lg = '<div class="lgl">' + list.map(function (e) {
      var on = !sel || sel === e.key;
      return '<button type="button" class="li' + (sel === e.key ? ' on' : '') + '" style="opacity:' + (on ? 1 : 0.5) + '" aria-pressed="' + (sel === e.key) + '" data-act="gsel" data-g="' + esc(o.selectionGroup || '') + '" data-k="' + esc(e.key) + '">' +
        '<i style="background:' + esc(colorFor(ax, e.key)) + '"></i><span class="nm">' + esc(e.label) + '</span>' +
        (show.indexOf('share') >= 0 ? '<span class="num">' + esc(fmt(e.v / total, 'percent1')) + '</span>' : '') +
        (show.indexOf('value') >= 0 ? '<span class="num muted">' + esc(fmtMeasure(e.v, mid, ctx.rows, { compact: true })) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
    return card(ctx.t(c), chartHost(ctx, c.id, opt, 220, o.selectionGroup ? function (p) { return { g: o.selectionGroup, k: p.data && p.data.key }; } : null) + lg);
  }
};
