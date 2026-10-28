/* needs:echarts */
function toCoord(k) { var n = parseFloat(String(k == null ? '' : k).replace(',', '.')); return isFinite(n) ? n : null; }
COMPONENTS['bubble-map'] = {
  render: function (ctx, c) {
    var u = c.uses, o = c.options || {}, ax = u.axis, mid = asArray(u.measures)[0];
    var mapName = ensureGeo(o.country);
    if (!mapName) return card(ctx.t(c), '<div class="notice err">Contorno no disponible para "' + esc(o.country) + '"</div>');
    var list = aggregate(ctx.rows, [ax, u.lat, u.lng], [mid]).list;
    var pts = [], bad = 0, by = {};
    list.forEach(function (g) {
      var la = toCoord(g.cells[1].key), lo = toCoord(g.cells[2].key), v = g.v[mid];
      if (la == null || lo == null || la < -90 || la > 90 || lo < -180 || lo > 180) { bad++; return; }
      if (v == null) return;
      var k = g.cells[0].key;
      if (by[k]) { by[k].v += v; return; }
      by[k] = { key: k, label: g.cells[0].label, lat: la, lng: lo, v: v };
      pts.push(by[k]);
    });
    if (!pts.length) return card(ctx.t(c), '<div class="empty">Sin coordenadas válidas para la selección' + (bad ? ' (' + bad + ' miembros sin latitud o longitud)' : '') + '</div>');
    var sel = ctx.group(o.selectionGroup);
    var maxV = Math.max.apply(null, pts.map(function (p) { return Math.abs(p.v); })) || 1;
    pts.sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); });
    var opt = { aria: { enabled: true }, textStyle: baseTextStyle(), animation: false,
      tooltip: { trigger: 'item', confine: true, formatter: function (p) { return '<b>' + esc(p.name) + '</b><br>' + esc(mlabel(mid)) + ': ' + esc(fmtMeasure(p.data.raw, mid, ctx.rows)); } },
      geo: { map: mapName, roam: o.roam !== false, layoutCenter: ['50%', '50%'], layoutSize: '96%', itemStyle: { areaColor: THC.superficie2 || '#eff4ff', borderColor: THC.borde || '#9aa7c7' }, emphasis: { disabled: true }, select: { disabled: true } },
      series: [{ type: 'scatter', coordinateSystem: 'geo', data: pts.map(function (p) {
        return { name: p.label, key: p.key, raw: p.v, value: [p.lng, p.lat, p.v], symbolSize: 12 + 32 * Math.sqrt(Math.abs(p.v) / maxV),
          itemStyle: { color: colorFor(ax, p.key), opacity: sel ? dim(sel, p.key) : 0.8, borderColor: '#fff', borderWidth: 1 } }; }),
        label: { show: !!o.labels, formatter: '{b}', position: 'right', fontFamily: FONT, fontSize: 11 } }] };
    var total = pts.reduce(function (a, p) { return a + p.v; }, 0);
    var lg = '<div class="lgl">' + pts.map(function (p) {
      return '<button type="button" class="li' + (sel === p.key ? ' on' : '') + '" style="opacity:' + (!sel || sel === p.key ? 1 : 0.5) + '" aria-pressed="' + (sel === p.key) + '" data-act="gsel" data-g="' + esc(o.selectionGroup || '') + '" data-k="' + esc(p.key) + '">' +
        '<i style="background:' + esc(colorFor(ax, p.key)) + '"></i><span class="nm">' + esc(p.label) + '</span><span class="num muted">' + esc(fmtMeasure(p.v, mid, ctx.rows, { compact: true })) + '</span></button>'; }).join('') + '</div>';
    return card(ctx.t(c), chartHost(ctx, c.id, opt, o.height || 360, o.selectionGroup ? function (p) { return { g: o.selectionGroup, k: p.data && p.data.key }; } : null) + lg +
      (bad ? '<div class="kpi-s">' + bad + ' sin coordenadas</div>' : ''));
  }
};
