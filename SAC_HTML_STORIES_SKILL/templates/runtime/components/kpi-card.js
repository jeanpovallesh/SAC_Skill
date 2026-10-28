COMPONENTS['kpi-card'] = {
  render: function (ctx, c) {
    var mid = asArray(c.uses.measures)[0];
    var agg = aggregate(ctx.rows, [], [mid].concat(c.uses.badge ? [c.uses.badge] : []));
    var v = agg.total[mid];
    var def = measureDef(mid) || {};
    var sub = '';
    if (c.uses.badge) sub = '<div class="kpi-s">' + esc(mlabel(c.uses.badge)) + ': ' + esc(fmtMeasure(agg.total[c.uses.badge], c.uses.badge, ctx.rows)) + '</div>';
    return card(ctx.t(c), '<div class="kpi-v">' + esc(fmtMeasure(v, mid, ctx.rows, { compact: !!(c.options || {}).compact })) + '</div>' + sub);
  }
};
