# Ejemplo 01: Tablero de RRHH, demografía y género

Primer caso completo de pedido → especificación. Sirve de referencia para `intent-interpretation.md` y para calibrar la composición por defecto de un tablero de recursos humanos.

Material visual de origen: HTML de referencia aportado por el usuario (no enlazado a ningún modelo ni a SAC). Se usa solo como **modelo de composición y de estilo**, no se copia su código.

---

## 1. Pedido del usuario

> "crea un tablero de control de recursos humanos con diferenciación de hombres y mujeres por grupo etario y por departamentos"

## 2. Interpretación

| Elemento del pedido | Interpretación |
|---|---|
| "tablero de control de recursos humanos" | Widget analítico de **solo lectura**, con resumen (KPIs) y vistas detalladas |
| "diferenciación de hombres y mujeres" | **Género** como serie: todos los componentes se dividen en M y H |
| "por grupo etario" | Eje **Grupo etario** (ordenado) |
| "por departamentos" | Eje **Departamento** |
| Lo que el pedido no dice pero el tablero esperado incluye | KPIs de resumen, vista cruzada Departamento × Grupo etario, y filtros (Versión y Periodo siempre —D11—, más Sede y Contrato) |

**Composición por defecto** para "diferenciación por A y por B":

1. Resumen con KPIs (totales y proporción por la serie).
2. Una vista por cada eje pedido (A y B).
3. Una vista cruzada A × B para análisis detallado.
4. Filtros internos para las dimensiones de contexto del modelo.

## 3. Decisiones tomadas con el usuario

| # | Decisión | Resultado |
|---|---|---|
| 1 | Alcance | Solo el **área de contenido**. Barra lateral, encabezado, perfil, logo y navegación los resuelve la story |
| 2 | Filtros Versión, Periodo, Sede y Contrato | **Filtros internos del widget**: consumen feeds y se dibujan dentro del widget |
| 3 | KPIs de liderazgo y retención | **Opcionales**: se muestran solo si el modelo aporta los elementos necesarios |
| 4 | Observaciones, índices (Gini, Blau) y textos analíticos | **Fuera** del widget |

## 4. Qué se toma y qué se descarta del HTML de referencia

| Parte del HTML | Decisión | Motivo |
|---|---|---|
| 4 tarjetas KPI | Se conservan (2 siempre, 2 opcionales) | Resumen del tablero |
| Pirámide por grupo etario | Se conserva | Vista del eje 1 |
| Barras apiladas por departamento | Se conservan | Vista del eje 2 |
| Matriz cruzada con búsqueda | Se conserva | Vista cruzada |
| Selectores Versión, Periodo, Sede, Contrato | Se conservan, como filtros internos | Decisión 2 |
| Barra lateral, encabezado, perfil, logo, buscador global | Se descartan | Decisión 1 |
| "Observación clave", Gini, Blau | Se descartan | Decisión 4 |
| Pie legal ("Ley 15/2022", "último corte") | Se descarta | Texto de negocio fijo; el corte de nómina no sale de los datos |
| Botones "Exportar" y "Descargar reporte ESG" | Se descartan | No pedidos; posible comportamiento futuro `export-csv` |
| Columna "Alerta / Plan Pipeline" de la matriz | Se sustituye por un **estado calculado de paridad** | El texto distinto por fila no es derivable de datos |
| Etiquetas de estado variadas ("Alineado a Mercado", "Paridad saludable"…) | Se simplifican a 3 estados con umbrales editables | Evitar reglas de negocio inventadas |
| Tailwind por CDN, Google Fonts, Material Symbols | Se sustituyen por CSS incrustado, SVG en línea y fuentes con alternativa | Un Web Component con shadow DOM no hereda esos recursos |
| Paleta (rojo mujeres `#ba0035`, azul hombres `#1e3a8a`, verde `#004942`) y fuentes | Se conservan como `theme` | Identidad visual del ejemplo |

## 5. Especificación resultante

```json
{
  "specVersion": "1.0",
  "request": "crea un tablero de control de recursos humanos con diferenciación de hombres y mujeres por grupo etario y por departamentos",

  "widget": {
    "name": "Demografía y Equidad de Género",
    "id": "com.isitec.demografiagenero",
    "tag": "com-isitec-demografiagenero",
    "version": "1.0.0",
    "prefix": "DemografiaGenero",
    "description": "Tablero de plantilla por género, grupo etario y departamento",
    "mode": "solo-lectura",
    "scope": "contenido"
  },

  "model": { "id": "<id del modelo>", "metadataRef": "<archivo de metadatos>" },
  "hosting": { "baseUrl": "{{BASE_URL}}", "cacheBust": "?v=1.0.0" },

  "feeds": [
    { "index": 0, "role": "dimension", "ref": "Departamento",  "label": "Departamento" },
    { "index": 1, "role": "dimension", "ref": "Genero",        "label": "Género" },
    { "index": 2, "role": "dimension", "ref": "Grupo_Etario",  "label": "Grupo etario", "ordered": true },
    { "index": 3, "role": "dimension", "ref": "Periodo",       "label": "Periodo",  "ordered": true, "usedFor": ["filter", "time"] },
    { "index": 4, "role": "dimension", "ref": "Version",       "label": "Versión",  "usedFor": ["filter"] },
    { "index": 5, "role": "dimension", "ref": "Sede",          "label": "Sede",     "optional": true, "usedFor": ["filter"] },
    { "index": 6, "role": "dimension", "ref": "Tipo_Contrato", "label": "Contrato", "optional": true, "usedFor": ["filter"] },
    { "index": 7, "role": "dimension", "ref": "Nivel_Jerarquico", "label": "Nivel jerárquico", "optional": true }
  ],

  "measures": [
    { "id": "Headcount",    "ref": "Headcount", "role": "value", "aggregation": "additive", "required": true, "format": "integer" },
    { "id": "Suma_Edad",         "ref": "Suma_Edad",         "role": "value", "aggregation": "additive", "optional": true, "format": "integer" },
    { "id": "Retenidos",         "ref": "Retenidos",         "role": "value", "aggregation": "additive", "optional": true, "format": "integer" },
    { "id": "Headcount_Inicial", "ref": "Headcount_Inicial", "role": "value", "aggregation": "additive", "optional": true, "format": "integer" },
    { "id": "EdadPromedio", "role": "ratio", "numerator": "Suma_Edad", "denominator": "Headcount", "optional": true, "format": "decimal1", "unit": "años" },
    { "id": "TasaRetencion","role": "ratio", "numerator": "Retenidos", "denominator": "Headcount_Inicial", "optional": true, "format": "percent1" }
  ],

  "memberRoles": {
    "Genero": { "mujeres": ["<id por confirmar>"], "hombres": ["<id por confirmar>"] },
    "Nivel_Jerarquico": { "liderazgo": ["<ids por confirmar>"] }
  },

  "components": [
    { "id": "kpiTotal", "type": "kpi-card-split", "title": "Total plantilla",
      "uses": { "measures": ["Headcount"], "split": "Genero" } },

    { "id": "kpiEdad", "type": "kpi-card-split", "title": "Edad promedio",
      "uses": { "measures": ["EdadPromedio"], "split": "Genero" },
      "requires": ["EdadPromedio"] },

    { "id": "kpiLiderazgo", "type": "kpi-card-vs-target", "title": "Mujeres en liderazgo",
      "uses": { "measures": ["Headcount"], "split": "Genero", "within": "Nivel_Jerarquico:liderazgo", "target": "metaLiderazgoFemenino" },
      "requires": ["Nivel_Jerarquico"],
      "options": { "focus": "mujeres" } },

    { "id": "kpiRetencion", "type": "kpi-card-split", "title": "Tasa de retención",
      "uses": { "measures": ["TasaRetencion"], "split": "Genero" },
      "requires": ["TasaRetencion"] },

    { "id": "piramideEtaria", "type": "pyramid-bars", "title": "Distribución por grupo etario y género",
      "uses": { "axis": "Grupo_Etario", "series": "Genero", "measures": ["Headcount"] },
      "options": { "highlightPeak": true, "showCohortTotals": true } },

    { "id": "barrasDepto", "type": "stacked-100-bars", "title": "Distribución por departamentos",
      "uses": { "axis": "Departamento", "series": "Genero", "measures": ["Headcount"] },
      "options": { "showTotal": true, "sort": "total-desc",
        "status": { "metric": "shareMujeres", "bands": [
          { "below": "umbralParidadMin", "label": "estadoBajo" },
          { "between": ["umbralParidadMin", "umbralParidadMax"], "label": "estadoOptimo" },
          { "above": "umbralParidadMax", "label": "estadoAlto" } ] },
        "footerSummary": "areasEnRango" } },

    { "id": "matrizCruzada", "type": "cross-matrix", "title": "Departamento × Grupo etario por género",
      "uses": { "rows": "Departamento", "columns": "Grupo_Etario", "series": "Genero", "measures": ["Headcount"] },
      "options": { "cellFormat": "M / H", "rowTotal": true, "search": "rows", "statusColumn": true, "pageSize": 10 } }
  ],

  "filters": [
    { "id": "fVersion",  "target": "Version",       "ui": "combobox", "by": ["id", "description"], "multi": true, "includeAll": false, "default": "first" },
    { "id": "fPeriodo",  "target": "Periodo",       "ui": "combobox", "by": ["id", "description"], "multi": true, "includeAll": true, "default": "all" },
    { "id": "fSede",     "target": "Sede",          "ui": "combobox", "by": ["id", "description"], "includeAll": true },
    { "id": "fContrato", "target": "Tipo_Contrato", "ui": "combobox", "by": ["id", "description"], "includeAll": true }
  ],

  "properties": [
    { "id": "title", "type": "string", "default": "Demografía y Equidad de Género", "label": "Título", "appliesTo": "tituloWidget" },
    { "id": "umbralParidadMin", "type": "integer", "default": 40, "label": "Paridad mínima (%)", "appliesTo": "barrasDepto.status, matrizCruzada.statusColumn" },
    { "id": "umbralParidadMax", "type": "integer", "default": 60, "label": "Paridad máxima (%)", "appliesTo": "barrasDepto.status, matrizCruzada.statusColumn" },
    { "id": "metaLiderazgoFemenino", "type": "number", "default": 50, "label": "Meta de mujeres en liderazgo (%)", "appliesTo": "kpiLiderazgo" },
    { "id": "estadoBajo",   "type": "string", "default": "Oportunidad de balance", "label": "Texto de estado: bajo",   "appliesTo": "estados" },
    { "id": "estadoOptimo", "type": "string", "default": "Paridad óptima",          "label": "Texto de estado: óptimo", "appliesTo": "estados" },
    { "id": "estadoAlto",   "type": "string", "default": "Sesgo femenino",          "label": "Texto de estado: alto",   "appliesTo": "estados" }
  ],

  "methods": [],
  "events": [],

  "theme": {
    "fontBody": "Inter, 'Segoe UI', Arial, sans-serif",
    "fontDisplay": "'Plus Jakarta Sans', Inter, 'Segoe UI', Arial, sans-serif",
    "colors": { "mujeres": "#ba0035", "hombres": "#1e3a8a", "positivo": "#004942",
                "superficie": "#ffffff", "fondo": "#f8f9ff", "texto": "#0b1c30" }
  },

  "assumptions": [
    "Headcount es una medida aditiva del modelo.",
    "Grupo_Etario existe como dimensión en el modelo; no se calculan tramos desde la edad.",
    "Genero tiene dos miembros relevantes; sus ids se confirman al enlazar con el modelo.",
    "Edad promedio y retención se calculan como suma/suma desde Suma_Edad, Retenidos y Headcount_Inicial; si el modelo no los trae, esas tarjetas se omiten.",
    "Mujeres en liderazgo requiere la dimensión Nivel_Jerarquico y sus miembros de liderazgo; si no existe, la tarjeta se omite.",
    "Los filtros Versión, Periodo, Sede y Contrato se aplican (Versión y Periodo son obligatorios en todo tablero, D11) a todos los componentes y filtran las filas recibidas; solo ven los miembros que el binding devuelve.",
    "No se incluyen observaciones, índices estadísticos ni textos analíticos."
  ]
}
```

## 6. Qué recibe el usuario para el Builder

Orden de los feeds en el Builder de SAC (generado desde `feeds`):

1. Departamento
2. Género
3. Grupo etario
4. Periodo *(obligatorio, D11)*
5. Versión *(obligatorio, D11)*
6. Sede *(opcional)*
7. Contrato *(opcional)*
8. Nivel jerárquico *(opcional)*

Medidas: Headcount *(requerida)*, Suma_Edad, Retenidos, Headcount_Inicial *(opcionales)*.

## 7. Lecciones para el skill

1. **Un pedido corto se expande.** "Diferenciación por A y por B" implica resumen + vista por A + vista por B + vista cruzada + filtros de contexto.
2. **Géneros, niveles y otros "papeles" necesitan ids reales.** Deben salir de `memberRoles` y confirmarse contra el modelo.
3. **Promedios y tasas se piden como componentes aditivos.** Con filtros internos, un valor ya calculado no sirve.
4. **Las reglas de negocio son propiedades.** Umbrales, metas y etiquetas de estado se editan en el panel de styling.
5. **Lo opcional desaparece sin ruido.** Los componentes con `requires` ausente no se dibujan.
6. **Lo que no se puede derivar de datos no se inventa.** Observaciones, índices y textos legales fijos quedan fuera.
7. **El HTML de referencia es composición y estilo, no código.** Los recursos externos se reemplazan por CSS y SVG incrustados.

## 8. Pendientes

- Confirmar con la sonda cómo llegan los datos (ver `sac-widget-contract.md`, sección 8) antes de fijar el motor de agregación.
- Validar con datos reales el comportamiento de `kpi-card-split`, `kpi-card-vs-target`, `pyramid-bars`, `stacked-100-bars` y `cross-matrix` (definido en `widget-types.md`).
- Decidir si los filtros internos deben poder sincronizarse con los filtros de la story (hoy son independientes).
