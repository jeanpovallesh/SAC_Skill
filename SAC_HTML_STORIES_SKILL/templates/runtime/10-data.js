/* ===== lectura del data binding ===== */
/* Columnas: <feedId>_<n>. El mapa columna -> dimensión sale de metadata.dimensions en cada lectura
   (el orden puede cambiar entre ejecuciones). Verificado con la sonda. */
function readBinding(binding) {
  if (!binding) return { state: 'none' };
  if (binding.state === 'loading') return { state: 'loading' };
  if (binding.state === 'error') return { state: 'error', messages: binding.messages || [] };
  var meta = binding.metadata || {};
  var data = binding.data || [];
  var feedDefs = (meta.feeds || {});
  var dimCols = {};   // columna -> ref del spec
  var present = {};   // ref -> true
  var metaDims = meta.dimensions || {};
  Object.keys(metaDims).forEach(function (col) {
    var id = norm(metaDims[col].id);
    SPEC.feeds.forEach(function (f) {
      var want = f.role === 'property' ? norm(f.of + '.' + f.ref) : norm(f.ref);
      var wantShort = norm(f.ref);
      if (id === want || (f.role === 'property' && id.slice(-wantShort.length) === wantShort && id.indexOf(norm(f.of)) === 0)) {
        dimCols[col] = f.ref; present[f.ref] = true;
      }
    });
  });
  var measCols = {};
  var msm = meta.mainStructureMembers || {};
  Object.keys(msm).forEach(function (col) {
    var key = norm(memberKey(msm[col].id));
    SPEC.measures.forEach(function (m) {
      if (m.role === 'value' && norm(m.ref) === key) { measCols[col] = m.id; present[m.id] = true; }
    });
  });
  SPEC.measures.forEach(function (m) {
    if (m.role === 'ratio' && present[m.numerator] && present[m.denominator]) present[m.id] = true;
  });
  var rows = data.map(function (r) {
    var rec = { d: {}, m: {}, sub: false };
    Object.keys(dimCols).forEach(function (col) {
      var c = r[col];
      if (!c) return;
      var cell = { id: c.id, key: memberKey(c.id), label: c.label == null || c.label === '' ? memberKey(c.id) : c.label,
        isNode: !!c.isNode, isCollapsed: c.isCollapsed !== false, parentId: c.parentId };
      rec.d[dimCols[col]] = cell;
      if (c.isNode && c.isCollapsed === false) rec.sub = true;   // fila de subtotal (nodo expandido)
    });
    Object.keys(measCols).forEach(function (col) {
      var c = r[col];
      if (c && typeof c.raw === 'number') rec.m[measCols[col]] = { raw: c.raw, formatted: c.formatted, unit: c.unit };
    });
    return rec;
  });
  var missing = SPEC.feeds.filter(function (f) { return !f.optional && !present[f.ref]; }).map(function (f) { return f.label || f.ref; });
  SPEC.measures.forEach(function (m) {
    if ((m.required || (!m.optional && m.role === 'value')) && !present[m.id]) missing.push(m.id);
  });
  return { state: 'success', rows: rows, present: present, missing: missing };
}
