/* ===== motor: filtros, agregación, ratios, formato ===== */
var TIME = (SPEC._model || {}).timeDim || null;

function measureDef(id) {
  for (var i = 0; i < SPEC.measures.length; i++) if (SPEC.measures[i].id === id) return SPEC.measures[i];
  return null;
}
function feedDef(ref) {
  for (var i = 0; i < SPEC.feeds.length; i++) if (SPEC.feeds[i].ref === ref) return SPEC.feeds[i];
  return null;
}
function cellOf(rec, ref) { return rec.d[ref] || { id: '', key: '', label: '(sin valor)' }; }
function groupKey(rec, refs) { return refs.map(function (r) { return cellOf(rec, r).key; }).join('\u0001'); }

/* Filtros internos: sel[filterId] = Set de claves (vacío = todos) */
function applyFilters(rows, sel, skipId) {
  var active = (SPEC.filters || []).filter(function (f) { return f.id !== skipId && sel[f.id] && sel[f.id].size; });
  if (!active.length) return rows;
  return rows.filter(function (rec) {
    return active.every(function (f) { return sel[f.id].has(cellOf(rec, f.target).key); });
  });
}

/* Suma base de una medida de valor por grupo, respetando su agregación */
function baseByGroup(rows, refs, mid) {
  var def = measureDef(mid) || {};
  var agg = def.aggregation || 'additive';
  var useTime = agg === 'semi-additive' && TIME && refs.indexOf(TIME) < 0 && feedDef(TIME);
  var out = new Map();
  if (!useTime) {
    rows.forEach(function (rec) {
      if (rec.sub) return;
      var cell = rec.m[mid];
      if (!cell) return;
      var k = groupKey(rec, refs);
      out.set(k, (out.get(k) || 0) + cell.raw);
    });
    return out;
  }
  var per = new Map();   // grupo -> Map(periodo -> suma)
  rows.forEach(function (rec) {
    if (rec.sub) return;
    var cell = rec.m[mid];
    if (!cell) return;
    var k = groupKey(rec, refs), t = cellOf(rec, TIME).key;
    if (!per.has(k)) per.set(k, new Map());
    per.get(k).set(t, (per.get(k).get(t) || 0) + cell.raw);
  });
  per.forEach(function (byT, k) {
    var ts = Array.from(byT.keys()).sort(cmpNatural);
    if (def.timeAgg === 'avg') out.set(k, ts.reduce(function (a, t) { return a + byT.get(t); }, 0) / ts.length);
    else out.set(k, byT.get(ts[ts.length - 1]));
  });
  return out;
}

/* Agrega por grupos: devuelve lista [{key, cells:[celdas], v:{medida:valor|null}}] y totales */
function aggregate(rows, refs, mids) {
  var need = {};
  (function add(ids) {
    ids.forEach(function (id) {
      if (need[id]) return;
      var d = measureDef(id);
      need[id] = true;
      if (d && d.role === 'ratio') add([d.numerator, d.denominator]);
    });
  })(mids);
  var base = {};
  Object.keys(need).forEach(function (id) {
    var d = measureDef(id);
    if (d && d.role === 'value') base[id] = baseByGroup(rows, refs, id);
  });
  var groups = new Map();
  rows.forEach(function (rec) {
    if (rec.sub) return;
    var k = groupKey(rec, refs);
    if (!groups.has(k)) groups.set(k, { key: k, cells: refs.map(function (r) { return cellOf(rec, r); }), v: {} });
  });
  groups.forEach(function (g, k) {
    var val = function (id) {
      var d = measureDef(id);
      if (!d) return null;
      if (d.role === 'ratio') {
        var n = val(d.numerator), q = val(d.denominator);
        return n == null || q == null || q === 0 ? null : n / q;
      }
      return base[id] && base[id].has(k) ? base[id].get(k) : null;
    };
    mids.forEach(function (id) { g.v[id] = val(id); });
  });
  var list = Array.from(groups.values());
  var total = aggregateTotal(rows, mids);
  return { list: list, total: total };
}
function aggregateTotal(rows, mids) {
  var res = {};
  var g = (function () {
    var out = {};
    var need = {};
    (function add(ids) { ids.forEach(function (id) { if (need[id]) return; need[id] = true; var d = measureDef(id); if (d && d.role === 'ratio') add([d.numerator, d.denominator]); }); })(mids);
    Object.keys(need).forEach(function (id) {
      var d = measureDef(id);
      if (d && d.role === 'value') { var m = baseByGroup(rows, [], id); out[id] = m.has('') ? m.get('') : null; }
    });
    return out;
  })();
  var val = function (id) {
    var d = measureDef(id);
    if (!d) return null;
    if (d.role === 'ratio') { var n = val(d.numerator), q = val(d.denominator); return n == null || q == null || q === 0 ? null : n / q; }
    return g[id] == null ? null : g[id];
  };
  mids.forEach(function (id) { res[id] = val(id); });
  return res;
}

/* Unidad detectada en los datos para una medida */
function unitOf(rows, mid) {
  var d = measureDef(mid) || {};
  if (d.unit) return d.unit;
  if (d.role === 'ratio') return '';
  for (var i = 0; i < rows.length; i++) { var c = rows[i].m[mid]; if (c && c.unit && c.unit !== '#') return c.unit; }
  return '';
}

/* Formato */
var LOCALE = 'es';
function fmt(v, kind, opts) {
  opts = opts || {};
  if (v == null || !isFinite(v)) return '—';
  var k = kind || 'integer', f;
  if (/^percent/.test(k)) {
    var dec = +k.replace('percent', '') || 0;
    return new Intl.NumberFormat(LOCALE, { style: 'percent', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
  }
  if (opts.compact && Math.abs(v) >= 1000) {
    var abs = Math.abs(v), s = abs >= 1e9 ? [1e9, ' MM'] : abs >= 1e6 ? [1e6, ' M'] : [1e3, ' K'];
    return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(v / s[0]) + s[1];
  }
  var d2 = k === 'decimal1' ? 1 : k === 'decimal2' || k === 'currency' ? 2 : 0;
  f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: d2, maximumFractionDigits: d2 }).format(v);
  return f;
}
function fmtMeasure(v, mid, rows, opts) {
  var d = measureDef(mid) || {};
  var s = fmt(v, d.format, opts);
  var u = /^percent/.test(d.format || '') ? '' : unitOf(rows || [], mid);
  return u && s !== '—' ? s + ' ' + u : s;
}

function mlabel(id) { var d = measureDef(id) || {}; return d.label || id; }
