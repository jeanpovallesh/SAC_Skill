/* ===== filtros internos (D2, D8): selección en el widget, sobre los feeds ===== */
function filterMembers(allRows, f, sel) {
  var rows = applyFilters(allRows, sel, f.id), seen = new Map();
  rows.forEach(function (rec) {
    if (rec.sub) return;
    var c = cellOf(rec, f.target);
    if (!seen.has(c.key)) seen.set(c.key, { key: c.key, label: c.label });
  });
  var list = Array.from(seen.values());
  var fd = feedDef(f.target) || {};
  list.sort(function (a, b) { return cmpNatural(a.key, b.key); });
  if (!fd.ordered) list.sort(function (a, b) { return cmpNatural(a.label, b.label); });
  return list;
}
function initFilterDefaults(allRows, sel, inited) {
  (SPEC.filters || []).forEach(function (f) {
    if (inited[f.id]) return;
    var members = filterMembers(allRows, f, {});
    if (!members.length) return;
    inited[f.id] = true;
    var s = new Set();
    var def = f.default;
    if (def === 'last') s.add(members[members.length - 1].key);
    else if (def === 'first' || (!def && f.includeAll === false)) s.add(members[0].key);
    else if (def && def !== 'all') asArray(def).forEach(function (k) { s.add(memberKey(k)); });
    sel[f.id] = s;
  });
}
function renderFilters(ctx) {
  var fs = SPEC.filters || [];
  if (!fs.length) return '';
  var out = fs.map(function (f) {
    if (!ctx.have(f.target)) return '';
    var label = ctx.label(f);
    var members = filterMembers(ctx.allRows, f, ctx.sel);
    var cur = ctx.sel[f.id] || new Set();
    var ui = ctx.ui('filter:' + f.id, { open: false, q: '' });
    if (f.ui === 'segmented') {
      var btns = (f.includeAll === false ? [] : [{ key: '', label: 'Todos' }]).concat(members).map(function (m) {
        var on = m.key === '' ? cur.size === 0 : cur.has(m.key);
        return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-act="fseg" data-f="' + esc(f.id) + '" data-k="' + esc(m.key) + '">' + esc(m.label) + '</button>';
      }).join('');
      return '<div class="f" role="group" aria-label="' + esc(label) + '"><label>' + esc(label) + '</label><div class="seg">' + btns + '</div></div>';
    }
    var single = f.multi === false;
    var txt = cur.size === 0 ? 'Todos' : (single || cur.size === 1) ? (members.filter(function (m) { return cur.has(m.key); })[0] || { label: '' }).label : cur.size + ' de ' + members.length;
    var q = norm(ui.q);
    var opts = members.filter(function (m) { return !q || norm(m.label + ' ' + m.key).indexOf(q) >= 0; }).map(function (m) {
      return '<label class="op"><input type="checkbox" data-act="fopt" data-f="' + esc(f.id) + '" data-k="' + esc(m.key) + '"' + (cur.has(m.key) ? ' checked' : '') + '> ' + esc(m.label) + '</label>';
    }).join('');
    var panel = ui.open ? '<div class="pn"><input type="search" placeholder="Buscar…" aria-label="Buscar" data-act="fq" data-f="' + esc(f.id) + '" value="' + esc(ui.q) + '">' +
      (single ? '' : '<div class="acts"><button type="button" data-act="fall" data-f="' + esc(f.id) + '">Seleccionar todo</button><button type="button" data-act="fclr" data-f="' + esc(f.id) + '">Limpiar</button></div>') + opts + '</div>' : '';
    return '<div class="f"><label>' + esc(label) + '</label><button type="button" class="sel" aria-haspopup="listbox" aria-expanded="' + ui.open + '" data-act="ftog" data-f="' + esc(f.id) + '"><span>' + esc(txt) + '</span><span>▾</span></button>' + panel + '</div>';
  }).join('');
  return out ? '<div class="fbar">' + out + '</div>' : '';
}
/* devuelve true si cambió la selección o la UI */
function handleFilterAct(ctx, el) {
  var a = el.getAttribute('data-act'), fid = el.getAttribute('data-f');
  var f = (SPEC.filters || []).filter(function (x) { return x.id === fid; })[0];
  if (!f) return false;
  var ui = ctx.ui('filter:' + fid, { open: false, q: '' });
  var cur = ctx.sel[fid] || (ctx.sel[fid] = new Set());
  if (a === 'fseg') { var k = el.getAttribute('data-k'); cur.clear(); if (k) cur.add(k); return true; }
  if (a === 'ftog') { ui.open = !ui.open; return true; }
  if (a === 'fopt') {
    var kk = el.getAttribute('data-k');
    if (f.multi === false) { var had = cur.has(kk); cur.clear(); if (!had || f.includeAll === false) cur.add(kk); ui.open = false; }
    else if (cur.has(kk)) { if (!(f.includeAll === false && cur.size === 1)) cur.delete(kk); } else cur.add(kk);
    return true;
  }
  if (a === 'fq') { ui.q = el.value; ui.keepFocus = true; return true; }
  if (a === 'fall') { filterMembers(ctx.allRows, f, ctx.sel).forEach(function (m) { cur.add(m.key); }); return true; }
  if (a === 'fclr') { cur.clear(); if (f.includeAll === false) { var m0 = filterMembers(ctx.allRows, f, ctx.sel)[0]; if (m0) cur.add(m0.key); } return true; }
  return false;
}
