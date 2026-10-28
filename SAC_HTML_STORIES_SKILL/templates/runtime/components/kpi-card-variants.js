function memberIds(ref, role) { return asArray(((SPEC.memberRoles || {})[ref] || {})[role]).map(function (x) { return memberKey(x); }); }
function toTarget(ctx, mid, prop) {
  var n = parseFloat(ctx.prop(prop));
  if (!isFinite(n)) return null;
  return /^percent/.test((measureDef(mid) || {}).format || '') ? n / 100 : n;
}
function gapText(v, t, mid) {
  var pct = /^percent/.test((measureDef(mid) || {}).format || '');
  var d = v - t;
  var s = pct ? (d * 100).toFixed(1).replace('.', ',') + ' pt' : fmt(d, (measureDef(mid) || {}).format);
  return (d >= 0 ? '+' : '') + s;
}
COMPONENTS['kpi-card-vs-target'] = {
  render: function (ctx, c) {
    var u = c.uses, o = c.options || {}, mid = asArray(u.measures)[0];
    var v;
    if (u.split && o.focus) {
      var ids = memberIds(u.split, o.focus);
      var rows = ctx.rows;
      var g = aggregate(rows, [u.split], [mid]).list;
      var tot = g.reduce(function (a, e) { return a + (e.v[mid] || 0); }, 0);
      var foc = g.filter(function (e) { return ids.indexOf(e.cells[0].key) >= 0; }).reduce(function (a, e) { return a + (e.v[mid] || 0); }, 0);
      v = tot ? foc / tot : null;
    } else v = aggregate(ctx.rows, [], [mid]).total[mid];
    var t = toTarget(ctx, mid, u.target);
    var kind = u.split && o.focus ? 'percent1' : (measureDef(mid) || {}).format;
    var up = (o.goodDirection || 'up') === 'up';
    var ok = v != null && t != null && (up ? v >= t : v <= t);
    var body = '<div class="kpi-v">' + esc(v == null ? '—' : (u.split && o.focus ? fmt(v, 'percent1') : fmtMeasure(v, mid, ctx.rows, { compact: !!o.compact }))) + '</div>';
    if (v != null && t != null) {
      var top = Math.max(v, t) * 1.25 || 1;
      body += '<div class="prog" role="img" aria-label="' + esc(fmt(v, kind) + ' / meta ' + fmt(t, kind)) + '"><div class="pf" style="width:' + Math.min(100, v / top * 100).toFixed(1) + '%;background:var(' + (ok ? '--c-positivo' : '--c-negativo') + ')"></div><div class="pm" style="left:' + (t / top * 100).toFixed(1) + '%"></div></div>' +
        '<div class="kpi-s"><span class="' + (ok ? 'pos' : 'neg') + '">' + (ok ? '▲' : '▼') + ' ' + esc(gapText(v, t, mid)) + '</span> · Meta ' + esc(fmt(t, kind)) + '</div>';
    }
    return card(ctx.t(c), body);
  }
};
COMPONENTS['kpi-card-split'] = {
  render: function (ctx, c) {
    var u = c.uses, o = c.options || {}, mid = asArray(u.measures)[0];
    var def = measureDef(mid) || {};
    var mode = o.mode || (def.role === 'ratio' ? 'value' : 'share');
    var g = aggregate(ctx.rows, [u.split], [mid]).list.filter(function (e) { return e.cells[0].key; });
    var total = aggregate(ctx.rows, [], [mid]).total[mid];
    var sum = g.reduce(function (a, e) { return a + (e.v[mid] || 0); }, 0);
    g.sort(function (a, b) { return cmpNatural(a.cells[0].key, b.cells[0].key); });
    var body = '<div class="kpi-v">' + esc(fmtMeasure(total, mid, ctx.rows, { compact: true })) + '</div>';
    if (g.length) {
      if (mode === 'share' && sum > 0) {
        body += '<div class="hb"><div class="tr" style="width:100%">' + g.map(function (e) {
          return '<div class="sg" style="width:' + ((e.v[mid] || 0) / sum * 100).toFixed(2) + '%;background:' + esc(colorFor(u.split, e.cells[0].key)) + '"></div>'; }).join('') + '</div></div>';
      }
      body += '<div class="lgl">' + g.map(function (e) {
        return '<div class="li"><i style="background:' + esc(colorFor(u.split, e.cells[0].key)) + '"></i><span class="nm">' + esc(e.cells[0].label) + '</span>' +
          (mode === 'share' && sum > 0 ? '<span class="num">' + esc(fmt((e.v[mid] || 0) / sum, 'percent1')) + '</span>' : '') +
          '<span class="num muted">' + esc(fmtMeasure(e.v[mid], mid, ctx.rows, { compact: true })) + '</span></div>'; }).join('') + '</div>';
      if (o.showGap && g.length === 2 && g[0].v[mid] != null && g[1].v[mid] != null)
        body += '<div class="kpi-s">' + esc(fmtMeasure(Math.abs(g[0].v[mid] - g[1].v[mid]), mid, ctx.rows, { compact: true })) + '</div>';
    }
    return card(ctx.t(c), body);
  }
};
COMPONENTS['kpi-card-breakdown'] = {
  render: function (ctx, c) {
    var u = c.uses, o = c.options || {}, mid = asArray(u.measures)[0];
    var def = measureDef(mid) || {};
    var rank = o.rankBy || def.denominator || mid;
    var g = aggregate(ctx.rows, [u.breakdown], [mid, rank]).list.filter(function (e) { return e.v[mid] != null && e.v[rank]; });
    g.sort(function (a, b) { return b.v[rank] - a.v[rank]; });
    g = g.slice(0, o.topN || 3);
    var total = aggregate(ctx.rows, [], [mid]).total[mid];
    var up = (o.goodDirection || 'up') === 'up';
    var body = '<div class="kpi-v">' + esc(fmtMeasure(total, mid, ctx.rows, { compact: !!o.compact })) + '</div>' +
      '<div class="lgl">' + g.map(function (e) {
        var cls = o.colorize && total != null ? ((up ? e.v[mid] >= total : e.v[mid] <= total) ? 'pos' : 'neg') : '';
        return '<div class="li"><span class="nm">' + esc(e.cells[0].label) + '</span><span class="num ' + cls + '">' + esc(fmtMeasure(e.v[mid], mid, ctx.rows)) + '</span></div>'; }).join('') + '</div>';
    return card(ctx.t(c), body);
  }
};
