/* ===== UI común: tokens, estilos, colores ===== */
var TH = SPEC.theme || {};
var THC = TH.colors || {};
var SERIES = (TH.seriesPalette && TH.seriesPalette.length ? TH.seriesPalette :
  ['#0051d5', '#009668', '#ba0035', '#cc6600', '#7c3aed', '#0891b2', '#4d7c0f', '#64748b']);

function buildCss() {
  return ':host{display:block;' +
    '--c-fondo:' + (THC.fondo || '#f8f9ff') + ';--c-superficie:' + (THC.superficie || '#ffffff') + ';--c-superficie-2:' + (THC.superficie2 || '#eff4ff') + ';' +
    '--c-borde:' + (THC.borde || '#e1e6ef') + ';--c-control:' + (THC.control || '#c6c6cd') + ';--c-regla:' + (THC.regla || '#eef1f7') + ';--c-grilla:' + (THC.grilla || '#e5e7eb') + ';' +
    '--c-texto:' + (THC.texto || '#0b1c30') + ';--c-texto-2:' + (THC.texto2 || '#45464d') + ';--c-texto-3:' + (THC.texto3 || '#636b7a') + ';--c-activo:' + (THC.activo || '#e8eefb') + ';' +
    '--c-acento:' + (THC.acento || '#0051d5') + ';--c-positivo:' + (THC.positivo || '#004942') + ';--c-negativo:' + (THC.negativo || '#ba1a1a') + ';' +
    '--fuente-cuerpo:' + (TH.fontBody || "Inter,'Segoe UI',system-ui,Arial,sans-serif") + ';--fuente-titulo:' + (TH.fontDisplay || TH.fontBody || "Inter,'Segoe UI',system-ui,Arial,sans-serif") + ';' +
    '--radio:12px;--e:8px;--fs-apoyo:12px;--fs-cuerpo:14px;--fs-sub:16px;--fs-kpi:28px;--fila:36px}' +
    '*{box-sizing:border-box}table,button,input{font:inherit}' +
    '.root{background:var(--c-fondo);color:var(--c-texto);font:14px/1.4 var(--fuente-cuerpo);padding:16px;min-height:60px}' +
    '.w-sm .root{padding:12px}' +
    '.wtitle{font:600 20px/1.2 var(--fuente-titulo);margin:0 0 12px}' +
    '.grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;align-items:start}' +
    '.cell{grid-column:span 12;min-width:0}' +
    '.w-lg .s3{grid-column:span 3}.w-lg .s4{grid-column:span 4}.w-lg .s5{grid-column:span 5}.w-lg .s6{grid-column:span 6}.w-lg .s7{grid-column:span 7}.w-lg .s8{grid-column:span 8}' +
    '.w-md .s3,.w-md .s4{grid-column:span 6}.w-md .s5,.w-md .s6,.w-md .s7,.w-md .s8{grid-column:span 12}' +
    '.card{background:var(--c-superficie);border:1px solid var(--c-borde);border-radius:var(--radio);padding:16px}' +
    '.card h3{font:600 14px/1.3 var(--fuente-titulo);margin:0 0 12px;color:var(--c-texto)}' +
    '.kpi-l{font-size:12px;color:var(--c-texto-2);margin:0 0 4px}' +
    '.kpi-v{font:600 var(--fs-kpi)/1.1 var(--fuente-titulo);font-variant-numeric:tabular-nums}' +
    '.strip{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:1px;background:var(--c-borde);border:1px solid var(--c-borde);border-radius:var(--radio);overflow:hidden}' +
    '.strip>.kc{background:var(--c-superficie);min-width:0}.strip .card{border:0;border-radius:0;background:transparent;height:100%}' +
    '.w-md .strip{grid-template-columns:repeat(2,minmax(0,1fr))}.w-md .strip>.kc:last-child:nth-child(odd){grid-column:span 2}.w-sm .strip{grid-template-columns:minmax(0,1fr)}' +
    '.kpi-s{font-size:12px;color:var(--c-texto-2);margin-top:6px}' +
    '.muted{color:var(--c-texto-2)}.num{text-align:right;font-variant-numeric:tabular-nums}' +
    '.empty,.notice{padding:16px;border:1px dashed var(--c-control);border-radius:var(--radio);color:var(--c-texto-2);background:var(--c-superficie)}' +
    '.notice.err{border-color:var(--c-negativo);color:var(--c-negativo)}' +
    '.bar{height:2px;background:var(--c-acento);opacity:0;transition:opacity .15s}.loading .bar{opacity:1}' +
    '.fbar{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px}' +
    '.f{position:relative;min-width:180px}.f>label{display:block;font-size:12px;color:var(--c-texto-2);margin-bottom:4px}' +
    '.f button.sel{width:100%;text-align:left;background:var(--c-superficie);border:1px solid var(--c-control);border-radius:8px;padding:8px 10px;font:inherit;color:inherit;cursor:pointer;display:flex;justify-content:space-between;gap:8px}' +
    '.f .pn{position:absolute;z-index:5;left:0;right:0;top:100%;margin-top:4px;background:var(--c-superficie);border:1px solid var(--c-borde);border-radius:8px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);max-height:280px;overflow:auto;min-width:220px}' +
    '.f .pn input[type=search]{width:100%;padding:6px 8px;border:1px solid var(--c-control);border-radius:6px;font:inherit;margin-bottom:6px}' +
    '.f .op{display:flex;gap:8px;align-items:center;padding:4px 2px;cursor:pointer;border-radius:4px}.f .op:hover{background:var(--c-superficie-2)}' +
    '.f .acts{display:flex;gap:8px;margin-bottom:6px}.f .acts button{border:0;background:none;color:var(--c-acento);cursor:pointer;font:inherit;padding:2px}' +
    '.seg{display:flex;flex-wrap:wrap;gap:4px}.seg button{border:1px solid var(--c-control);background:var(--c-superficie);border-radius:8px;padding:6px 10px;font:inherit;cursor:pointer;color:inherit}' +
    '.seg button.on{background:var(--c-acento);border-color:var(--c-acento);color:#fff}' +
    'button:focus-visible,input:focus-visible,th[tabindex]:focus-visible{outline:2px solid var(--c-acento);outline-offset:1px}' +
    '.tbl-w{overflow:auto;max-height:480px}table{border-collapse:collapse;width:100%}' +
    'th,td{padding:8px 10px;border-bottom:1px solid var(--c-regla);white-space:nowrap}' +
    'th{position:sticky;top:0;background:var(--c-superficie);text-align:left;font-weight:600;font-size:var(--fs-apoyo);color:var(--c-texto-2);border-bottom:1px solid var(--c-borde);cursor:pointer;user-select:none}th.num{text-align:right}' +
    'tfoot td{font-weight:700;border-top:1px solid var(--c-control)}' +
    '.tools{display:flex;gap:8px;align-items:center;margin-bottom:8px}.tools input{padding:6px 8px;border:1px solid var(--c-control);border-radius:6px;font:inherit;min-width:180px}' +
    '.pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:8px;font-size:12px}.pager button{border:1px solid var(--c-control);background:var(--c-superficie);border-radius:6px;padding:4px 8px;cursor:pointer}' +
    '.hb{display:flex;align-items:center;gap:8px;margin:6px 0}.hb .lb{flex:0 0 28%;min-width:80px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.hb .tr{flex:1;display:flex;height:22px;border-radius:6px;overflow:hidden;background:var(--c-superficie-2)}.hb .sg{height:100%;min-width:1px}' +
    '.hb .tt{flex:0 0 auto;font-size:12px;color:var(--c-texto-2);min-width:56px;text-align:right}' +
    '.lg{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;font-size:12px;color:var(--c-texto-2)}.lg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}' +
    '.ch{width:100%}.lgl{display:flex;flex-direction:column;gap:2px;margin-top:8px}.li{display:flex;align-items:center;gap:8px;font-size:12px;background:none;border:0;padding:3px 2px;text-align:left;color:inherit;border-radius:4px}button.li{cursor:pointer}button.li:hover,button.li.on{background:var(--c-superficie-2)}' +
    '.li i,.dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex:0 0 auto}.dot{margin-right:8px}.li .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.li .num{min-width:48px}' +
    '.prog{position:relative;height:8px;background:var(--c-superficie-2);border-radius:4px;margin-top:10px}.prog .pf{height:100%;border-radius:4px}.prog .pm{position:absolute;top:-3px;width:2px;height:14px;background:var(--c-texto)}' +
    '.pv th.ctr{text-align:center}.pv th,.pv td{border-right:1px solid var(--c-regla)}.pv td.lbl,.pv th.lbl{position:sticky;left:0;z-index:1;background:var(--c-superficie);text-align:left}.pv th.lbl{z-index:2}.pv tr.pn td{font-weight:600;background:var(--c-fondo)}.pv tr.pn td.lbl{background:var(--c-fondo)}.tg{display:inline-block;width:16px;cursor:pointer;color:var(--c-texto-2)}' +
    '.tools button{border:1px solid var(--c-control);background:var(--c-superficie);border-radius:6px;padding:4px 8px;cursor:pointer;color:inherit}' +
    '.pos{color:var(--c-positivo)}.neg{color:var(--c-negativo)}' +
    '@media (prefers-reduced-motion:reduce){*{transition:none!important}}';
}

/* Color estable por id de miembro: roles de memberRoles primero, después la paleta */
var colorMap = {};
function colorFor(ref, key) {
  var id = ref + '|' + key;
  if (colorMap[id]) return colorMap[id];
  var roles = (SPEC.memberRoles || {})[ref] || {};
  for (var r in roles) {
    if (asArray(roles[r]).indexOf(key) >= 0 && THC[r]) return (colorMap[id] = THC[r]);
  }
  var n = Object.keys(colorMap).filter(function (k) { return k.indexOf(ref + '|') === 0; }).length;
  return (colorMap[id] = SERIES[n % SERIES.length]);
}
function card(title, body, extra) {
  return '<section class="card" role="region" aria-label="' + esc(title || '') + '"' + (extra || '') + '>' +
    (title ? '<h3>' + esc(title) + '</h3>' : '') + body + '</section>';
}
function legend(items) {
  return '<div class="lg">' + items.map(function (i) { return '<span><i style="background:' + esc(i.color) + '"></i>' + esc(i.label) + '</span>'; }).join('') + '</div>';
}

var COMPONENTS = {};
