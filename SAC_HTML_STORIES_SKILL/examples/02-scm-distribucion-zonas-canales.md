# Ejemplo 02: Tablero de distribución por zonas regionales, canales y marcas

Segundo caso completo de pedido → especificación. Aporta tipos de componente nuevos (dona, burbujas, barras 100 %, tarjetas con desglose), medidas **semiaditivas** (inventario, puntos de venta) y una regla de cobertura: **verificar que cada eje del pedido tenga su vista**.

Material visual de origen: HTML de referencia aportado por el usuario (sin enlace a modelo ni a SAC). Se usa como modelo de composición y de estilo, no se copia su código.

---

## 1. Pedido del usuario

> "necesito crear un tablero de distribuciones por zonas regionales de un pais. Graficos con canales de distribución y por lineas/marcas"

## 2. Interpretación

| Elemento del pedido | Interpretación |
|---|---|
| "tablero de distribuciones" | Widget analítico de **solo lectura** sobre distribución comercial y logística |
| "por zonas regionales de un país" | Eje **Zona regional** (dimensión geográfica del modelo). El país es contexto, no un eje: el widget no lo fija |
| "gráficos con canales de distribución" | Eje **Canal**: reparto, composición por zona y rentabilidad |
| "y por líneas/marcas" | Eje **Línea/Marca** |

### Hallazgo: el HTML de referencia no cubre uno de los ejes del pedido

El HTML aporta zonas y canales, pero **no tiene ninguna vista por línea o marca** (aparece solo como opción del menú lateral). Para que el resultado cumpla el pedido, esta especificación **agrega** una vista Marca × Canal y una matriz Zona × Marca. Queda marcado como supuesto para que el usuario lo confirme.

> Regla para el skill: antes de mostrar la especificación, comprobar que **cada eje mencionado en el pedido tiene al menos un componente**. Si el material de referencia no lo cubre, se completa y se declara.

**Composición por defecto** para "distribución por zona, con gráficos por canal y por marca":

1. KPIs de resumen (rentabilidad, coste, mezcla, cobertura).
2. Reparto por canal (dona).
3. Composición de canales por zona (barras 100 %).
4. Rentabilidad por canal (burbujas: volumen, margen, facturación).
5. Vista por línea/marca y matriz Zona × Marca.
6. KPIs operativos por canal (opcionales).
7. Tabla de detalle por canal.

## 3. Qué se toma y qué se descarta del HTML de referencia

| Parte del HTML | Decisión | Motivo |
|---|---|---|
| 4 KPIs ejecutivos | Se conservan, con cálculo desde medidas | Resumen |
| Dona "Reparto de cuota por canal" con leyenda | Se conserva | Reparto por canal |
| Matriz de burbujas volumen vs. margen | Se conserva; las posiciones se **calculan** con escalas | En el HTML están colocadas a mano |
| Barras apiladas "Penetración por zona" | Se conservan como barras 100 % | Composición por zona |
| 4 tarjetas operativas (DOH, mermas, frecuencia, OCT) | Se conservan como **opcionales** | Dependen de medidas que el modelo puede no tener |
| Tabla "Acuerdos comerciales y operadores" | Se sustituye por una **tabla de detalle por canal** con medidas; las columnas de atributos (operador, modelo comercial, ventana) solo si el modelo las trae como propiedades del canal | Operador, OTIF contractual y modelo comercial no salen de medidas |
| Vista por línea/marca | **Se agrega** (no existe en el HTML) | Pedido del usuario |
| Selector "YTD / Último mes / Simulador Margen" | Se conserva el selector de periodo (control segmentado); **"Simulador Margen" queda fuera** | Es una función de simulación, no un filtro |
| Barra lateral, encabezado, perfil, buscador global, estado SLA | Se descartan | Alcance = contenido (decisión del ejemplo 01, se mantiene) |
| "Hallazgo estratégico", índice Herfindahl-Hirschman | Se descartan | Regla del ejemplo 01: sin insights ni índices (el HHI sería derivable, pero se excluye por consistencia; puede incluirse si el usuario lo pide) |
| Tres tarjetas de texto (enrutamiento, VMI, compliance) | Se descartan | Texto de negocio fijo, no sale de datos |
| Etiquetas calificativas ("Capilaridad alta", "Ruta crítica", "SLA cumplido") | Se sustituyen por estados calculados con umbrales editables, o se omiten | No derivables |
| Región y moneda fijas (España, €, comunidades autónomas) | Se descartan | El país, las zonas y la moneda salen del modelo |
| Meta de margen inconsistente (22.8 % en el KPI, 20 % en el gráfico) | **Una sola propiedad** `metaMargen` | Evitar dos reglas de negocio contradictorias |
| Tailwind por CDN, Google Fonts, Material Symbols | CSS incrustado, SVG en línea, fuentes con alternativa | Un Web Component con shadow DOM no los hereda |

## 4. Especificación resultante

```json
{
  "specVersion": "1.0",
  "request": "necesito crear un tablero de distribuciones por zonas regionales de un pais. Graficos con canales de distribución y por lineas/marcas",

  "widget": {
    "name": "Distribución por Zonas y Canales",
    "id": "com.isitec.distribucionzonascanales",
    "tag": "com-isitec-distribucionzonascanales",
    "version": "1.0.3",
    "prefix": "DistribucionZonas",
    "description": "Tablero de distribución por zona regional, canal y línea/marca",
    "mode": "solo-lectura",
    "scope": "contenido"
  },

  "model": { "id": "<id del modelo>", "metadataRef": "<archivo de metadatos>" },
  "hosting": { "baseUrl": "{{BASE_URL}}", "cacheBust": "?v=1.0.0" },

  "feeds": [
    { "index": 0, "role": "dimension", "ref": "Zona_Regional", "label": "Zona regional" },
    { "index": 1, "role": "dimension", "ref": "Canal",         "label": "Canal de distribución" },
    { "index": 2, "role": "dimension", "ref": "Marca_Linea",   "label": "Línea / Marca" },
    { "index": 3, "role": "dimension", "ref": "Periodo",       "label": "Periodo", "ordered": true, "usedFor": ["filter", "time"] },
    { "index": 4, "role": "property",  "ref": "Tipo_Canal", "of": "Canal", "label": "Tipo de canal (B2B / D2C)", "optional": true }
  ],

  "measures": [
    { "id": "Volumen",          "ref": "Volumen_Cajas",       "role": "value", "aggregation": "additive", "required": true, "format": "integer", "unit": "cajas" },
    { "id": "Facturacion",      "ref": "Facturacion_Bruta",   "role": "value", "aggregation": "additive", "optional": true, "format": "currency" },
    { "id": "MargenImporte",    "ref": "Margen_Contribucion", "role": "value", "aggregation": "additive", "optional": true, "format": "currency" },
    { "id": "CosteDistrib",     "ref": "Coste_Distribucion",  "role": "value", "aggregation": "additive", "optional": true, "format": "currency" },
    { "id": "MargenPct",   "role": "ratio", "numerator": "MargenImporte", "denominator": "Facturacion", "optional": true, "format": "percent1" },
    { "id": "CostePct",    "role": "ratio", "numerator": "CosteDistrib",  "denominator": "Facturacion", "optional": true, "format": "percent1" },
    { "id": "CosteUnit",   "role": "ratio", "numerator": "CosteDistrib",  "denominator": "Volumen",     "optional": true, "format": "currency" },

    { "id": "PuntosVenta",       "ref": "Puntos_Venta_Auditados", "role": "value", "aggregation": "semi-additive", "timeAgg": "last", "optional": true, "format": "integer" },
    { "id": "PuntosVentaActivos","ref": "Puntos_Venta_Activos",   "role": "value", "aggregation": "semi-additive", "timeAgg": "last", "optional": true, "format": "integer" },
    { "id": "PctPosActivos", "role": "ratio", "numerator": "PuntosVentaActivos", "denominator": "PuntosVenta", "optional": true, "format": "percent1" },

    { "id": "InventarioCajas",  "ref": "Inventario_Cajas",   "role": "value", "aggregation": "semi-additive", "timeAgg": "last", "optional": true, "format": "integer" },
    { "id": "DespachoDiario",   "ref": "Despacho_Diario",    "role": "value", "aggregation": "additive", "optional": true, "format": "integer" },
    { "id": "DiasInventario",   "role": "ratio", "numerator": "InventarioCajas", "denominator": "DespachoDiario", "optional": true, "format": "decimal1", "unit": "días" },

    { "id": "CajasMerma",       "ref": "Cajas_Merma_Devolucion", "role": "value", "aggregation": "additive", "optional": true, "format": "integer" },
    { "id": "PctMerma",         "role": "ratio", "numerator": "CajasMerma", "denominator": "Volumen", "optional": true, "format": "percent2" },

    { "id": "EnviosTotales",    "ref": "Envios_Totales",     "role": "value", "aggregation": "additive", "optional": true, "format": "integer" },
    { "id": "NodoSemana",       "ref": "Nodo_Semana",        "role": "value", "aggregation": "additive", "optional": true, "format": "integer" },
    { "id": "FrecuenciaSem",    "role": "ratio", "numerator": "EnviosTotales", "denominator": "NodoSemana", "optional": true, "format": "decimal1", "unit": "x/sem" },

    { "id": "HorasCiclo",       "ref": "Horas_Ciclo_Pedido", "role": "value", "aggregation": "additive", "optional": true, "format": "decimal1" },
    { "id": "PedidosTotales",   "ref": "Pedidos_Totales",    "role": "value", "aggregation": "additive", "optional": true, "format": "integer" },
    { "id": "CicloPedidoH",     "role": "ratio", "numerator": "HorasCiclo", "denominator": "PedidosTotales", "optional": true, "format": "decimal1", "unit": "h" }
  ],

  "memberRoles": {
    "Tipo_Canal": { "b2b": ["<id por confirmar>"], "d2c": ["<id por confirmar>"] }
  },

  "components": [
    { "id": "kpiMargen", "type": "kpi-card-vs-target", "title": "Margen bruto ponderado",
      "uses": { "measures": ["MargenPct"], "target": "metaMargen" }, "requires": ["MargenPct"] },

    { "id": "kpiCoste", "type": "kpi-card", "title": "Coste de distribución / venta",
      "uses": { "measures": ["CostePct"] }, "requires": ["CostePct"] },

    { "id": "kpiMezcla", "type": "kpi-card-split", "title": "Volumen B2B vs D2C",
      "uses": { "measures": ["Volumen"], "split": "Tipo_Canal" }, "requires": ["Tipo_Canal"],
      "options": { "mode": "share" } },

    { "id": "kpiCobertura", "type": "kpi-card", "title": "Cobertura de puntos de venta",
      "uses": { "measures": ["PuntosVenta"], "badge": "PctPosActivos" }, "requires": ["PuntosVenta"] },

    { "id": "donaCanales", "type": "donut-share", "title": "Reparto de cuota por canal",
      "uses": { "axis": "Canal", "measures": ["Volumen"] },
      "options": { "centerTotal": true, "legend": ["share", "value"], "selectionGroup": "canal" } },

    { "id": "burbujasCanales", "type": "bubble-matrix", "title": "Volumen vs. margen de contribución",
      "uses": { "axis": "Canal", "x": "Volumen", "y": "MargenPct", "size": "Facturacion" },
      "requires": ["MargenPct", "Facturacion"],
      "options": { "yReference": "metaMargen", "xReference": "median", "quadrantLabels": true, "selectionGroup": "canal" } },

    { "id": "barras100Zona", "type": "stacked-100-bars", "title": "Penetración de canales por zona regional",
      "uses": { "axis": "Zona_Regional", "series": "Canal", "measures": ["Volumen"] },
      "options": { "showTotal": true, "badge": "dominantChannel", "sort": "total-desc" } },

    { "id": "barrasMarca", "type": "stacked-100-bars", "title": "Canales por línea / marca",
      "uses": { "axis": "Marca_Linea", "series": "Canal", "measures": ["Volumen"] },
      "options": { "showTotal": true, "sort": "total-desc" } },

    { "id": "matrizZonaMarca", "type": "cross-matrix", "title": "Zona regional × línea / marca",
      "uses": { "rows": "Zona_Regional", "columns": "Marca_Linea", "measures": ["Volumen"] },
      "options": { "rowTotal": true, "columnTotal": true, "heat": true, "search": "rows" } },

    { "id": "kpiDoh", "type": "kpi-card-breakdown", "title": "Días de inventario en canal",
      "uses": { "measures": ["DiasInventario"], "breakdown": "Canal" }, "requires": ["DiasInventario"], "options": { "topN": 3 } },
    { "id": "kpiMerma", "type": "kpi-card-breakdown", "title": "Tasa de mermas y devoluciones",
      "uses": { "measures": ["PctMerma"], "breakdown": "Canal" }, "requires": ["PctMerma"], "options": { "topN": 3 } },
    { "id": "kpiFrecuencia", "type": "kpi-card-breakdown", "title": "Frecuencia de despacho",
      "uses": { "measures": ["FrecuenciaSem"], "breakdown": "Canal" }, "requires": ["FrecuenciaSem"], "options": { "topN": 3 } },
    { "id": "kpiCiclo", "type": "kpi-card-breakdown", "title": "Tiempo de ciclo de pedido",
      "uses": { "measures": ["CicloPedidoH"], "breakdown": "Canal" }, "requires": ["CicloPedidoH"], "options": { "topN": 3 } },

    { "id": "tablaCanales", "type": "detail-table", "title": "Detalle por canal",
      "uses": { "rows": "Canal", "measures": ["Volumen", "Facturacion", "MargenPct", "CosteUnit"] },
      "options": { "search": "rows", "pageSize": 10, "selectionGroup": "canal", "dropColumnsWithoutData": true } }
  ],

  "filters": [
    { "id": "fPeriodo", "target": "Periodo", "ui": "segmented", "by": ["id", "description"], "includeAll": true, "default": "last" }
  ],

  "properties": [
    { "id": "title", "type": "string", "default": "Distribución por Zonas y Canales", "label": "Título", "appliesTo": "tituloWidget" },
    { "id": "metaMargen", "type": "number", "default": 20, "label": "Meta de margen de contribución (%)", "appliesTo": "kpiMargen, burbujasCanales" },
    { "id": "umbralDominancia", "type": "integer", "default": 35, "label": "Participación mínima para canal dominante (%)", "appliesTo": "barras100Zona.badge" },
    { "id": "textoDominante", "type": "string", "default": "Dominante", "label": "Texto de canal dominante", "appliesTo": "barras100Zona.badge" },
    { "id": "textoMixto", "type": "string", "default": "Mix equilibrado", "label": "Texto de mezcla equilibrada", "appliesTo": "barras100Zona.badge" }
  ],

  "methods": [],
  "events": [],

  "theme": {
    "fontBody": "Inter, 'Segoe UI', Arial, sans-serif",
    "fontDisplay": "'Plus Jakarta Sans', Inter, 'Segoe UI', Arial, sans-serif",
    "colors": { "superficie": "#ffffff", "fondo": "#f8f9ff", "texto": "#0b1c30", "acento": "#0051d5", "positivo": "#006c4b", "alerta": "#ba1a1a" },
    "seriesPalette": ["#131b2e", "#0051d5", "#316bf3", "#6ffbbe", "#a3defe", "#b4c5ff", "#76777d", "#ffb3b6"],
    "seriesColorRule": "estable por id de miembro, asignado por orden de id"
  },

  "assumptions": [
    "Zona_Regional, Canal y Marca_Linea existen como dimensiones del modelo; el país no es un eje.",
    "Volumen_Cajas es una medida aditiva del modelo.",
    "La vista por línea/marca y la matriz Zona × Marca se agregan porque el HTML de referencia no las incluye y el pedido las exige.",
    "Margen, coste y facturación se piden como importes aditivos; los porcentajes se calculan como suma/suma.",
    "Puntos de venta e inventario son saldos por periodo (semiaditivos, confirmado por el usuario): con varios periodos se toma el último.",
    "Todos los modelos traen la dimensión de tiempo (confirmado), por eso Periodo es un feed requerido.",
    "Sin pedido de comparación entre periodos no se incluyen variaciones; los KPIs se comparan solo contra la meta.",
    "Los KPIs operativos (días de inventario, mermas, frecuencia, ciclo) y el KPI de mezcla B2B/D2C se omiten si faltan sus medidas o la propiedad Tipo_Canal.",
    "El selector de periodo es un filtro interno con control segmentado; 'Simulador de margen' queda fuera.",
    "Una sola meta de margen (metaMargen) alimenta el KPI y la línea de referencia del gráfico de burbujas.",
    "La moneda y el formato numérico salen del modelo; no se fija ningún país ni divisa.",
    "No se incluyen observaciones, índices (HHI), textos de negocio ni tarjetas de texto libre."
  ]
}
```

## 5. Orden de feeds para el Builder

1. Zona regional
2. Canal de distribución
3. Línea / Marca
4. Periodo
5. Tipo de canal, propiedad de Canal *(opcional)*

Medidas requeridas: Volumen_Cajas. Todas las demás son opcionales y activan sus componentes.

## 6. Lecciones para el skill

1. **Cobertura de ejes.** Cada eje del pedido debe tener al menos una vista. Si el material de referencia no la tiene, se completa y se declara en los supuestos.
2. **Hay tres tipos de agregación, no dos.** Aditiva (suma sobre todo), **semiaditiva** (foto: inventario, puntos de venta, headcount de cierre; se suma entre zonas y canales pero entre periodos se toma el último o el promedio) y no aditiva. Cada ratio se calcula con suma / suma de sus componentes ya reducidos.
3. **Color estable por miembro.** Un canal debe tener el mismo color en la dona, las barras, las burbujas y la tabla. Se asigna por id de miembro, no por la posición en cada gráfico.
4. **Posiciones calculadas, no dibujadas.** Las burbujas, las barras y los anillos se calculan con escalas desde los datos; el HTML de referencia los coloca a mano.
5. **Selección enlazada.** Elegir un canal en la dona, las burbujas o la tabla lo resalta en los demás (`selectionGroup`).
6. **Etiquetas calificativas ("Capilaridad alta", "Ruta crítica") no son datos.** Se calculan con umbrales editables o se eliminan.
7. **Atributos de maestro solo con feed.** Operador, modelo comercial o ventana de descarga requieren propiedades del canal; cada una consume un feed. Se omiten por defecto.
8. **Metas únicas.** Si el material de referencia repite una meta con valores distintos, el skill la unifica en una propiedad y lo declara.
9. **Nada fijo por país.** Zonas, moneda y unidades salen del modelo.
10. **"Simulador" no es un filtro.** Una función de simulación (what-if) es otro tipo de widget.

## 7. Pendientes

- Validar con datos reales el comportamiento de `donut-share`, `bubble-matrix`, `stacked-100-bars`, `kpi-card-breakdown` y `detail-table` (definido en `widget-types.md`).
- Las variaciones del HTML ("+1.8 pt") no se incluyen: solo se agregan si el usuario pide un tablero comparativo (ver `intent-interpretation.md`, sección 8).
