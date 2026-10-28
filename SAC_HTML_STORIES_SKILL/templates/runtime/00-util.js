/* ===== util ===== */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function memberKey(id) {
  var m = /&\[([^\]]*)\]\s*$/.exec(String(id == null ? '' : id));
  return m ? m[1] : String(id == null ? '' : id);
}
function asArray(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }
function cmpNatural(a, b) {
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}
function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
