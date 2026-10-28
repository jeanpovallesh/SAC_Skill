/* ===== gráficos con ECharts (incluido en este archivo, renderizador SVG) ===== */
var ECH = (typeof __ECH === 'object' && __ECH && __ECH.init) ? __ECH : null;
var FONT = TH.fontBody || "Inter,'Segoe UI',Arial,sans-serif";
function chartHost(ctx, id, option, height, onPick) {
  if (!ECH) return '<div class="notice">Librería de gráficos no disponible</div>';
  ctx.charts.push({ id: id, option: option, onPick: onPick });
  return '<div class="ch" data-chart="' + esc(id) + '" role="img" aria-label="' + esc(id) + '" style="height:' + (height || 260) + 'px"></div>';
}
function baseTextStyle() { return { fontFamily: FONT, color: THC.texto2 || '#45464d', fontSize: 12 }; }
function dim(sel, key) { return sel && sel !== key ? 0.3 : 1; }
