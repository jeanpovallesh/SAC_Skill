# Especificación de widget (widget-spec)

Referencia para SAC_HTML_STORIES_SKILL. La **especificación** es el documento intermedio entre lo que pide el usuario y los tres archivos que se entregan. Es la **única fuente de verdad**: el manifiesto, el JS principal y el JS de styling se generan desde ella, nunca por separado.

```
pedido del usuario ─► (intent-interpretation.md) ─► ESPECIFICACIÓN ─► manifiesto + JS principal + JS styling
                                                         ▲
                                              JSON de metadatos del modelo
```

Leyenda: ✅ decidido con el usuario · 📘 regla de diseño del skill · ⚠ por verificar con la sonda (ver `sac-widget-contract.md`, sección 8).

---

## 1. Principios

1. **Una especificación, tres archivos.** Si algo cambia (un feed, una propiedad, un método), cambia primero en la especificación y los archivos se regeneran. 📘
2. **Se muestra antes de generar.** El usuario ve la especificación resumida con los **supuestos** que se hicieron y puede corregirla. 📘
3. **Solo lo que el modelo tiene.** Cada `ref` de la especificación apunta a un `id` real del JSON de metadatos. Si no existe, el elemento se descarta o se marca como opcional; nunca se inventa. 📘
4. **Lo opcional se degrada con gracia.** Un componente que depende de un elemento opcional ausente se oculta, sin error. ✅
5. **Nada fijo que sea una regla de negocio.** Umbrales, metas, etiquetas y textos van como **propiedades** editables, no escritos en el código. ✅
6. **Los datos derivados necesitan fuente.** Un valor mostrado debe salir del modelo o de un cálculo declarado en la especificación. Textos analíticos libres, índices estadísticos y observaciones **quedan fuera** salvo petición explícita. ✅

---

## 2. Estructura general

```json
{
  "specVersion": "1.0",
  "request": "texto original del usuario",
  "widget":      { ... },
  "model":       { ... },
  "hosting":     { ... },
  "feeds":       [ ... ],
  "measures":    [ ... ],
  "memberRoles": { ... },
  "groupings":   [ ... ],
  "components":  [ ... ],
  "filters":     [ ... ],
  "comparison":  { ... },
  "properties":  [ ... ],
  "methods":     [ ... ],
  "events":      [ ... ],
  "theme":       { ... },
  "assumptions": [ ... ]
}
```

| Sección | Obligatoria | Para qué |
|---|---|---|
| `request` | Sí | Texto original; queda como trazabilidad |
| `widget` | Sí | Identidad del widget |
| `model` | Sí | Qué modelo y qué metadatos se usaron |
| `hosting` | Sí | URL base para generar las `url` del manifiesto |
| `feeds` | Sí | Dimensiones y propiedades que el usuario debe agregar en el Builder, en orden |
| `measures` | Sí | Medidas y cómo se agregan |
| `memberRoles` | No | Qué miembro de una dimensión cumple qué papel (por ejemplo, cuál es "Mujeres") |
| `groupings` | No | Agrupaciones derivadas (tramos etarios) cuando el modelo no las trae |
| `components` | Sí | Piezas visuales o de captura del widget |
| `filters` | No | Filtros internos del widget |
| `comparison` | No | Comparación entre periodos. Solo si el pedido la pide (ver `intent-interpretation.md`, sección 8) |
| `properties` | No | Parámetros editables en el panel de styling |
| `methods`, `events` | No | Lo que expone a SAC Script |
| `theme` | No | Colores y tipografía |
| `assumptions` | Sí | Lista de supuestos hechos, para que el usuario los confirme |

---

## 3. `widget`

```json
"widget": {
  "name": "Demografía y Equidad de Género",
  "id": "com.isitec.demografiagenero",
  "tag": "com-isitec-demografiagenero",
  "version": "1.0.0",
  "prefix": "DemografiaGenero",
  "description": "Tablero de plantilla por género, grupo etario y departamento",
  "mode": "solo-lectura",
  "scope": "contenido"
}
```

| Campo | Regla |
|---|---|
| `id` | Dominio inverso, minúsculas, estable entre versiones |
| `tag` | Derivado del `id` cambiando puntos por guiones. **Sin sufijo de versión.** El de styling es `<tag>-styling` |
| `mode` | `solo-lectura` (muestra datos), `captura` (el usuario genera datos y los entrega a la story) o `mixto` |
| `scope` | `contenido` ✅: el widget es solo el área de contenido. Navegación, encabezado, perfil y logo los resuelve la story |

---

## 4. `model` y `hosting`

```json
"model":   { "id": "MODELO_RH", "metadataRef": "modelo_rh.json" },
"hosting": { "baseUrl": "https://host.ejemplo.com/widgets/demografia", "cacheBust": "?v=1.0.0" }
```

- `baseUrl` es un **parámetro** que da el usuario cada vez. El skill compone las tres `url` del manifiesto con él. 📘
- Si no se conoce, se deja un marcador `{{BASE_URL}}` visible y se avisa; no se inventa un host.

---

## 5. `feeds`: el orden es el contrato

Cada elemento es una columna `<id del feed>_N` del binding (`dims_0`, …). El usuario las agrega **en este orden** en el Builder, y el JS verifica el mapa columna → dimensión con `binding.metadata.dimensions` (✅ sonda), sin depender solo del orden.

```json
"feeds": [
  { "index": 0, "role": "dimension", "ref": "Departamento", "label": "Departamento" },
  { "index": 1, "role": "dimension", "ref": "Genero",       "label": "Género" },
  { "index": 2, "role": "dimension", "ref": "Grupo_Etario", "label": "Grupo etario", "ordered": true },
  { "index": 3, "role": "dimension", "ref": "Sede",         "label": "Sede",     "optional": true },
  { "index": 4, "role": "property",  "ref": "Cargo", "of": "Empleado", "optional": true }
]
```

| Campo | Significado |
|---|---|
| `role` | `dimension` o `property`. Una propiedad entra como un feed más de tipo dimensión ✅ (⚠ forma exacta de la celda por confirmar) |
| `ref` | `id` de la dimensión o propiedad en el modelo |
| `of` | Solo para `property`: dimensión a la que pertenece |
| `optional` | Si falta, los componentes que lo requieren se ocultan |
| `ordered` | El orden de los miembros importa (grupos etarios, periodos). Ver 5.2 |
| `usedFor` | Opcional: `axis`, `series`, `filter`, `label` |
| `hierarchy` | Opcional, solo en `dimension`: `{ "available": ["h1", "h2"], "default": "h1", "selectable": true }`. Los ids salen de `hierarchies` de la dimensión en el modelo. Con `selectable`, el usuario elige la jerarquía en las tablas. Ver `widget-types.md`, 2.13 ✅ ⚠ |

### 5.1 Orden de los feeds 📘

Como el binding es posicional, un opcional en medio desplaza el resto. Por eso:

1. Primero las **dimensiones requeridas**.
2. Luego las **dimensiones opcionales**, por prioridad.
3. Al final las **propiedades**.

La `description` del feed `dimensions` del manifiesto se genera desde esta lista (nombre y orden) para que el usuario sepa qué agregar.

### 5.2 Orden de los miembros ⚠

SAC devuelve los miembros en el orden de la consulta. Para `ordered: true` el widget **no** debe depender de ese orden. La especificación declara el orden en `groupings` (ver 8) o `order: [...]`.

### 5.3 Límite de feeds 📘

Cada propiedad o dimensión extra consume un feed. Si la especificación supera **8 feeds**, el skill avisa y propone reducir (por ejemplo, convertir un filtro en filtro de la story).

---

## 6. `measures`

```json
"measures": [
  { "id": "Headcount", "ref": "Headcount", "role": "value", "aggregation": "additive", "required": true, "format": "integer" },
  { "id": "EdadPromedio", "role": "ratio", "numerator": "Suma_Edad", "denominator": "Headcount", "optional": true, "format": "decimal1", "unit": "años" },
  { "id": "TasaRetencion", "role": "ratio", "numerator": "Retenidos", "denominator": "Headcount_Inicial", "optional": true, "format": "percent1" }
]
```

| Campo | Regla |
|---|---|
| `aggregation` | `additive`: se puede sumar sobre cualquier subconjunto de filas. `semi-additive`: medida de foto (inventario, puntos de venta, headcount de cierre); se suma entre zonas, canales y demás dimensiones, pero **no entre periodos**: se reduce primero por periodo con `timeAgg` (`last` o `avg`). `non-additive`: **no** se puede recalcular en el navegador |
| `timeAgg` | Solo con `semi-additive`: `last` (último periodo con dato) o `avg` (promedio de periodos). Todos los modelos traen la dimensión de tiempo ✅, así que cuando el widget usa una medida semiaditiva el skill incluye `Periodo` como feed **requerido** y ordenado. Si el usuario no lo agrega en el Builder, el widget avisa en lugar de sumar entre periodos |
| `role: "ratio"` | Valor derivado: **suma del numerador / suma del denominador** sobre las filas filtradas |
| `format` | `integer`, `decimal1`, `decimal2`, `percent0`, `percent1`, `percent2`, `currency`. Las medidas con unidad variable usan el formato que entrega SAC (`formatted`) ⚠ |
| `goodDirection` | `up` o `down`: sentido favorable de la medida. Define el color de variaciones y metas (un coste que sube es desfavorable). Por defecto `up`; si no se sabe, se declara en `assumptions` |

### 6.1 Medidas no aditivas y filtros internos 📘

Los filtros internos recalculan sobre las filas que llegaron. Un promedio o una tasa que viene ya calculada **no se puede recalcular** al filtrar (el promedio de promedios es incorrecto). Regla:

- Si un valor es un promedio o una tasa, el skill pide sus **componentes aditivos** (numerador y denominador) y declara una medida `ratio`.
- Si el modelo solo tiene el valor ya calculado, se marca `non-additive` y el componente que lo use **solo se muestra sin filtros activos**, o se oculta. El skill lo declara en `assumptions`.

---

## 7. `memberRoles`

Dice qué miembro de una dimensión cumple un papel que el widget necesita saber.

```json
"memberRoles": {
  "Genero": { "mujeres": ["F"], "hombres": ["M"] },
  "Nivel_Jerarquico": { "liderazgo": ["DIR", "GER", "JEF"] }
}
```

- Los valores son **ids reales** del modelo (en minúsculas el rol, tal cual el id). Si no se conocen, quedan como `"<por confirmar>"` y el skill pregunta o toma el que coincida por descripción, declarándolo en `assumptions`.
- El widget genera series, colores y KPIs a partir de estos roles, no de textos escritos en el código.

---

## 8. `groupings` (agrupaciones derivadas)

Cuando el modelo no trae la dimensión agrupada (por ejemplo, solo hay edad):

```json
"groupings": [
  {
    "id": "Grupo_Etario",
    "from": "Edad",
    "buckets": [
      { "label": "< 25",    "max": 24 },
      { "label": "25 - 34", "min": 25, "max": 34 },
      { "label": "35 - 44", "min": 35, "max": 44 },
      { "label": "45 - 54", "min": 45, "max": 54 },
      { "label": "> 55",    "min": 55 }
    ]
  }
]
```

- Si `Grupo_Etario` ya existe en el modelo, **no** se usa `groupings`: se usa la dimensión (más barata y consistente).
- Los `buckets` fijan el orden de visualización.
- Si `from` es una propiedad o medida numérica, el agrupamiento se calcula en el navegador sobre las filas recibidas. ⚠ Solo viable con granularidad de empleado; con granularidad agregada no se puede agrupar.

---

## 9. `components`

```json
"components": [
  {
    "id": "kpiTotalGenero",
    "type": "kpi-card",
    "title": "Total Plantilla",
    "uses": { "measures": ["Headcount"], "split": "Genero" }
  },
  {
    "id": "kpiEdad",
    "type": "kpi-card",
    "title": "Edad promedio",
    "uses": { "measures": ["EdadPromedio"], "split": "Genero" },
    "requires": ["EdadPromedio"]
  }
]
```

| Campo | Significado |
|---|---|
| `type` | Tipo del catálogo (`widget-types.md`) |
| `uses` | Dimensiones y medidas que consume (`axis`, `series`, `split`, `measures`) |
| `requires` | Elementos que deben existir; si falta alguno, **el componente se oculta** ✅ |
| `options` | Parámetros del componente (orden, límites, texto de vacío) |
| `layout` | Opcional: `{ "span": 1-12, "row": n }`. Si falta, se aplican las reglas por defecto de `widget-types.md`, sección 2.11 |

Tipos conocidos hasta ahora (se detallan en `widget-types.md`): `kpi-card`, `kpi-card-split`, `kpi-card-vs-target`, `kpi-card-breakdown`, `pyramid-bars`, `stacked-bars`, `stacked-100-bars`, `donut-share`, `bubble-matrix`, `cross-matrix`, `detail-table`, `filter-bar`, `combobox-selector`, `capture-list`, `json-preview`.

Opciones transversales:

- `selectionGroup`: componentes con el mismo grupo comparten selección. Elegir un miembro en uno lo resalta en los demás. 📘
- Color de series: **estable por id de miembro** (misma paleta y mismo color para un miembro en todos los componentes), no por posición. 📘
- Todo eje mencionado en el pedido debe tener al menos un componente que lo use (regla de cobertura, ver `intent-interpretation.md`). 📘

### 9.1 Estados y reglas de lectura

Las etiquetas de estado (por ejemplo "Paridad óptima") se calculan con **umbrales que son propiedades**, no con texto escrito por fila:

```json
"options": {
  "status": {
    "metric": "shareMujeres",
    "bands": [
      { "below": "umbralParidadMin", "label": "labelBajo" },
      { "between": ["umbralParidadMin", "umbralParidadMax"], "label": "labelOptimo" },
      { "above": "umbralParidadMax", "label": "labelAlto" }
    ]
  }
}
```

Los textos libres por fila (por ejemplo un "plan de pipeline" distinto en cada departamento) **no** son derivables: se sustituyen por un estado calculado o se omiten.

---

## 10. `filters` (filtros internos del widget) ✅

```json
"filters": [
  { "id": "fSede",     "target": "Sede",         "ui": "combobox", "by": ["id", "description"], "includeAll": true },
  { "id": "fContrato", "target": "Tipo_Contrato","ui": "combobox", "by": ["id", "description"], "includeAll": true },
  { "id": "fPeriodo",  "target": "Periodo",      "ui": "combobox", "by": ["id", "description"], "includeAll": true },
  { "id": "fCargo",    "target": "Cargo", "by": "property", "of": "Empleado", "ui": "combobox" }
]
```

- Un filtro **interno consume un feed** (el `target` debe estar en `feeds`). Por eso son los mismos feeds de la sección 5, marcados `usedFor: ["filter"]`.
- Las opciones salen de las filas recibidas, no del maestro del modelo. ✅
- `by`: `id`, `description` o `property`. El selector busca por texto sobre lo que se indique (patrón del combobox con búsqueda en vivo).
- Los filtros actúan sobre **todos los componentes**, salvo que se indique `appliesTo: [...]`.
- `multi` ✅: `true` permite elegir varios miembros; dentro de un filtro rige "o" y entre filtros rige "y". Por defecto es `true` en filtros de dimensiones de contexto y `false` en `Periodo`. En dimensiones con jerarquía, `cascade: true` hace que elegir un nodo incluya a todos sus descendientes.
- **D11 (obligatorios):** los filtros de la dimensión `version` y de la `time` del modelo existen siempre, aunque no se pidan. Ambos son de selección múltiple (`multi: true`); en versión, `includeAll: false` quita "Todos" (no puede quedar vacío) y `default: "first"` elige el primer miembro. `multi: false` sigue disponible para otros filtros.
- Un filtro cuyo feed falta (opcional no agregado) no se dibuja.
- `ui`: `combobox` (selector con búsqueda en vivo, para muchos miembros) o `segmented` (botones en fila, para pocos miembros como periodos). `default` puede ser un id, `all` o `last` (último miembro de una dimensión ordenada). 📘

### 10.1 `comparison` (solo si el pedido la pide) ✅

```json
"comparison": {
  "dimension": "Periodo",
  "mode": "previous-period",
  "delta": { "absolute": true, "percent": true, "points": "ratios" },
  "appliesTo": ["kpiMargen", "barrasDepto", "tablaCanales"]
}
```

- `mode`: `previous-period` (cada periodo contra el anterior de la dimensión ordenada), `same-period-last-year`, `selected-pair` (el usuario elige base y comparación con dos selectores internos) o `versus-version` (misma lógica sobre `Version`). ✅ Implementados en el generador (`variance-table`): `versus-version` y `selected-pair`; `base` y `actual` (ids) fijan la selección inicial. El resto de modos y `bar-compare` están pendientes.
- **Sin `comparison` no hay variaciones**: los componentes muestran un solo valor, contra la meta si existe. ✅
- Requisitos: `Periodo` como feed requerido y ordenado (todos los modelos traen dimensión de tiempo ✅). El binding debe incluir ambos periodos; si llega solo uno, el widget avisa.
- Cada periodo se reduce por separado (las semiaditivas aplican `timeAgg` dentro de cada periodo) y luego se calcula la diferencia.
- Variación absoluta para importes y cantidades, relativa (%) para cambios proporcionales y en **puntos** (`pt`) para tasas y porcentajes.
- El color de la variación sale de `goodDirection` de la medida.

---

## 11. `properties`, `methods`, `events`

```json
"properties": [
  { "id": "title", "type": "string", "default": "Demografía y Equidad de Género", "label": "Título", "appliesTo": "widgetTitle" },
  { "id": "umbralParidadMin", "type": "integer", "default": 40, "label": "Paridad mínima (%)" },
  { "id": "umbralParidadMax", "type": "integer", "default": 60, "label": "Paridad máxima (%)" },
  { "id": "metaLiderazgoFemenino", "type": "number", "default": 50, "label": "Meta de mujeres en liderazgo (%)" }
]
```

- Toda propiedad lleva `appliesTo` (qué elemento o cálculo modifica). Si no se aplica a nada, el validador la rechaza (regla R7 del contrato). 📘
- Cada propiedad genera: la entrada del manifiesto, su uso en el JS principal, y el control y el `set` en el styling.
- Para widgets `solo-lectura`, `methods` y `events` pueden ser mínimos o vacíos. Para `captura`, se declara el método de salida (`getJsonString`) y, si la story necesita enterarse, un evento.
- Si algún feed tiene `hierarchy.selectable: true`, el widget cambia la jerarquía por sí mismo (`setHierarchy` + `setHierarchyLevel` sobre el origen de datos, ver `widget-types.md` 2.13) y el skill agrega la propiedad `nivelExpansionInicial` (entero, por defecto 1). El método `getSelectedHierarchy(dimension)` (devuelve `string`) y el evento `onHierarchyChange` son **opcionales**: solo si el pedido indica que la story debe enterarse.

### 11.1 Propiedades derivadas (S12) ✅

Decisión (2026-10-28): **todo título y etiqueta debe poder editarse en línea** desde el panel de styling. En la especificación se escriben como literales (`title`, etiquetas de filtro, textos de `options`) y el generador los convierte en propiedades, sin que haya que declararlas a mano:

| Texto en la especificación | Propiedad generada | Valor por defecto |
|---|---|---|
| `components[].title` | `titulo_<idComponente>` | el texto del título |
| `filters[]` (etiqueta) | `etiqueta_<idFiltro>` | `filters[].label`, o la etiqueta del feed `target` |
| `components[].options.<label\|labels\|text\|message\|footer\|note\|caption>` (cadena) | `texto_<idComponente>_<clave>` | el texto |
| `feeds[].hierarchy.selectable` | `nivelExpansionInicial` (entero, por defecto 1) | 1 |

- Las propiedades derivadas se suman a las declaradas (`widget-spec-schema` §11) en el manifiesto, el JS principal y el styling; la lista la calcula `scripts/spec_lib.py` (`derived_properties`), que usan el validador y el generador.
- Los textos que salen de los datos (nombres de miembros, medidas, unidades) **no** son propiedades.
- El panel de styling agrupa los controles: Widget · Filtros · Un grupo por componente · Umbrales y metas.

---

## 12. `theme`

```json
"theme": {
  "fontBody": "Inter, 'Segoe UI', Arial, sans-serif",
  "fontDisplay": "'Plus Jakarta Sans', Inter, 'Segoe UI', Arial, sans-serif",
  "colors": {
    "mujeres": "#ba0035", "hombres": "#1e3a8a", "positivo": "#004942",
    "superficie": "#ffffff", "fondo": "#f8f9ff", "texto": "#0b1c30"
  }
}
```

- El CSS va **incrustado** en el Web Component; no se depende de Tailwind por CDN ni de iconos externos (ver 14). ✅
- Los colores de series salen de `memberRoles`, no del orden de las filas.

---

## 13. `assumptions`

Lista obligatoria de lo que el skill decidió sin que el usuario lo dijera. Se muestra antes de generar.

```json
"assumptions": [
  "El modelo tiene Headcount como medida aditiva.",
  "Grupo_Etario existe como dimensión; no se calculan tramos.",
  "Edad promedio y retención se omiten si faltan sus componentes aditivos."
]
```

---

## 14. Traducción de la especificación a los archivos

| Sección de la especificación | Manifiesto | JS principal | JS styling |
|---|---|---|---|
| `widget` | `id`, `name`, `version`, `newInstancePrefix`, tags de `webcomponents` | `customElements.define(tag)` | `customElements.define(tag-styling)` |
| `hosting` | `url` de cada componente web | — | — |
| `feeds` | `dataBindings.<binding>.feeds[dimensions].description` (orden esperado) | Mapa `dimensions_N → rol` en `render()` | — |
| `measures` | feed `measures` (`mainStructureMember`) | Lectura de `measures_N` y cálculo de `ratio` | — |
| `memberRoles` | — | Constantes de roles | — |
| `groupings` | — | Cálculo de tramos | — |
| `components` | — | Un renderizador por `type`, ocultar si falta `requires` | — |
| `filters` | — | Combobox y lógica de filtrado | — |
| `properties` | `properties` | Aplicación en `render` | Un control y un `set` por propiedad |
| `methods`, `events` | `methods`, `events` | Métodos de clase y `dispatchEvent` | — |
| `theme` | — | CSS incrustado | CSS del panel |

Restricciones al generar el JS 📘:

- CSS incrustado en el shadow DOM; **sin Tailwind por CDN**, **sin Google Fonts**, **sin iconos de fuente**: iconos en SVG en línea y pila de fuentes con alternativas del sistema. ⚠ Confirmar con la sonda si el tenant bloquea recursos externos.
- Todo texto de datos escapado antes de insertarlo como HTML.
- Agregación en el navegador: agrupar por los ejes del componente y **sumar** las medidas aditivas sobre las filas que pasan los filtros; calcular `ratio` como suma / suma.

---

## 15. Validación de la especificación (antes de generar)

| # | Regla |
|---|---|
| S1 | Todo `ref` de `feeds` y `measures` existe en el JSON de metadatos del modelo |
| S2 | Todo `of` de una propiedad apunta a una dimensión incluida en `feeds` |
| S3 | `feeds[].index` es consecutivo desde 0; requeridos primero, luego opcionales, luego propiedades |
| S4 | Todo `target` de `filters` está en `feeds` |
| S5 | Todo elemento de `requires` y de `uses` existe en `feeds` o `measures` |
| S6 | Toda `measure` `ratio` tiene `numerator` y `denominator` definidos como medidas |
| S7 | Toda medida usada con filtros activos es `additive` o `ratio` (si es `non-additive`, el componente declara `hideWhenFiltered`) |
| S8 | Toda propiedad tiene `appliesTo` y `default` |
| S15 | **D11**: el modelo trae una dimensión `version` y una `time`; ambas están en `feeds` (requeridas, no opcionales) y cada una tiene un filtro sin `appliesTo`. Ambos `multi:true`; el de versión con `includeAll:false` (aviso si no) |
| S9 | `id`, `tag` y `prefix` son consistentes entre sí; el `tag` no lleva sufijo de versión |
| S10 | `assumptions` no está vacío cuando hubo decisiones tomadas por el skill |
| S11 | Cantidad de feeds ≤ 8; si no, se avisa |
| S12 | Todo texto visible fijo (título de componente, etiqueta de filtro, textos de `options`) es el **valor por defecto de una propiedad editable** que el generador crea (§11.1); los ids de componentes y filtros son identificadores válidos (`A-Za-z0-9_`) y no colisionan con propiedades declaradas |
| S13 | Todo id de `hierarchy.available` y `hierarchy.default` existe en `hierarchies` de esa dimensión en el modelo |
| S14 | Un componente con `options.tree` usa como filas un feed con `hierarchy`; `selectable: true` implica la propiedad `nivelExpansionInicial` y la llamada al origen de datos para cambiar la jerarquía; el método y el evento son opcionales |
