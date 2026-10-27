# Esquema del JSON de metadatos del modelo (model-metadata-schema)

Referencia para SAC_HTML_STORIES_SKILL. Define el **JSON de entrada** que describe la estructura de un modelo de SAC: qué dimensiones, propiedades, jerarquías y medidas existen. El skill lo lee para enlazar el pedido del usuario con elementos reales del modelo (`intent-interpretation.md`) y para construir la especificación (`widget-spec-schema.md`).

Este JSON **describe el modelo, no el widget**. No dice qué tablero construir ni en qué orden van los feeds; eso sale del pedido del usuario.

Leyenda: ✅ decidido con el usuario · 📘 regla de diseño del skill · ⚠ por confirmar.

Ejemplos verificados: `examples/model-metadata-rrhh.json` y `examples/model-metadata-distribucion.json`.

---

## 1. Estructura canónica

```json
{
  "schema_version": "1.0",
  "model":      { ... },
  "dimensions": [ ... ],
  "measures":   [ ... ]
}
```

| Clave | Obligatoria | Contenido |
|---|---|---|
| `schema_version` | Sí | Versión de este esquema (`"1.0"`) |
| `model` | Sí | Identidad del modelo |
| `dimensions` | Sí | Lista de dimensiones |
| `measures` | Sí | Lista de medidas (puede ser vacía en un modelo que use solo cuentas) |

### 1.1 `model`

| Campo | Obligatorio | Descripción |
|---|---|---|
| `id` | Sí | Identificador técnico del modelo |
| `name` | Sí | Nombre visible |
| `type` | Sí | `planning` o `analytic` |
| `description` | No | Texto libre |

### 1.2 `dimensions[]`

| Campo | Obligatorio | Descripción |
|---|---|---|
| `id` | Sí | Identificador técnico de la dimensión (el que usa SAC) |
| `description` | No | Nombre visible; si falta, se usa `id` |
| `type` | Sí | `version`, `time`, `account`, `category`, `organization` o `generic` (ver sección 2 para alias) |
| `ordered` | No | `true` si el orden de los miembros es significativo (grupos etarios, periodos). Por defecto `true` en `time`, `false` en el resto |
| `granularity` | No | Solo en `time`: la granularidad más fina (`year`, `semester`, `quarter`, `month`, `week`, `day`). Ayuda a ordenar periodos y a calcular "mismo periodo del año anterior" |
| `synonyms` | No | Otros nombres con los que el usuario puede referirse a la dimensión |
| `properties` | No | Lista de propiedades (1.2.1) |
| `hierarchies` | No | Lista de jerarquías (1.2.2) |
| `members` | No | Lista de miembros (1.2.3) |
| `members_complete` | No | `true` si `members` contiene **todos** los miembros; por defecto `false` |

#### 1.2.1 `properties[]`

| Campo | Obligatorio | Descripción |
|---|---|---|
| `id` | Sí | Identificador técnico de la propiedad |
| `description` | No | Nombre visible |
| `type` | No | `string` (por defecto), `number`, `date` o `boolean` |
| `synonyms` | No | Otros nombres |

Una propiedad solo puede usarse en un widget si se agrega como feed (`widget-spec-schema.md`, sección 5). ✅

#### 1.2.2 `hierarchies[]`

| Campo | Obligatorio | Descripción |
|---|---|---|
| `id` | Sí | Identificador de la jerarquía |
| `description` | No | Nombre visible |
| `kind` | No | `level` (niveles fijos) o `parent-child` (profundidad variable). Si falta, el skill lo trata como desconocido y avisa |
| `default` | No | `true` en la jerarquía por defecto (como máximo una por dimensión) |
| `levels` | No | Solo con `kind: "level"`: lista `{ "id", "description" }` de arriba hacia abajo (por ejemplo Año, Trimestre, Mes) |

#### 1.2.3 `members[]` (opcional)

| Campo | Obligatorio | Descripción |
|---|---|---|
| `id` | Sí | Identificador del miembro |
| `description` | No | Texto visible |
| `parent_id` | No | Padre en la jerarquía por defecto |
| `properties` | No | Objeto `{ "<id de propiedad>": valor }` |
| `synonyms` | No | Otros nombres ("Femenino", "Mujeres") |

📘 Los miembros sirven para:

- Conocer los **ids reales** de miembros que el widget necesita (por ejemplo cuál es "Mujeres" en `memberRoles`).
- Enlazar términos del pedido con miembros ("mujeres" ↔ `F`).
- Fijar el orden de dimensiones ordenadas.

Se incluyen solo para dimensiones **pequeñas** (hasta unos 200 miembros) cuyos ids importan: género, canal, nivel jerárquico, grupo etario. Para dimensiones grandes (empleados, SKU) se omiten.

### 1.3 `measures[]`

| Campo | Obligatorio | Descripción |
|---|---|---|
| `id` | Sí | Identificador técnico de la medida |
| `description` | No | Nombre visible |
| `unit` | Sí | `currency`, `unit`, `number` o `percent` |
| `type` | Sí | `fixed` (unidad definida) o `variable` (la unidad depende de otra dimensión, por ejemplo la moneda de la sociedad) |
| `unit_value` | Si `fixed` | Moneda (`USD`) o unidad (`Kg`, `cajas`, `personas`). **`null`** en `variable` |
| `decimals` | No | Entero de 0 a 6. `null` se trata como ausente (el skill aplica el valor por defecto de la unidad y lo declara). Una `description` vacía (`""`) en dimensiones, miembros o medidas se trata como ausente y se muestra el `id` ✅ |
| `aggregation` | No | Pista de agregación: `additive`, `semi-additive` o `non-additive`. Si falta, el skill asume `additive` y lo declara en `assumptions`. Conviene declararla en saldos (inventario, puntos de venta, headcount de cierre) ✅ |
| `time_aggregation` | No | Con `semi-additive`: `last` (por defecto) o `avg` |
| `components` | No | Con `non-additive`: `{ "numerator": "<id>", "denominator": "<id>" }` si la medida es un ratio definido en el modelo a partir de otras dos |
| `good_direction` | No | `up` o `down`: sentido favorable. Por defecto `up` |
| `synonyms` | No | Otros nombres |

Si el modelo usa **cuentas** (dimensión `account`), los miembros de esa dimensión llegan al widget como una dimensión normal; las medidas del modelo, por el feed de medidas. ⚠ Se confirma con la sonda cuando el modelo tenga ambas.

---

## 2. Tipos y alias

### 2.1 Tipo de dimensión

| Tipo canónico | Alias aceptados | Uso típico |
|---|---|---|
| `version` | `scenario` | Real, presupuesto, forecast |
| `time` | `date`, `period`, `calendar` | Mes, trimestre, año |
| `account` | `accounts` | Plan de cuentas |
| `category` | — | Categoría del modelo |
| `organization` | `entity`, `company`, `legal_entity` | Sociedad, entidad |
| `generic` | `other`, `custom` | Cualquier otra dimensión |

El skill normaliza los alias y lo informa. Un tipo desconocido se trata como `generic` con aviso.

### 2.2 Otros enumerados

| Campo | Valores |
|---|---|
| `model.type` | `planning`, `analytic` |
| `measures[].unit` | `currency`, `unit`, `number`, `percent` |
| `measures[].type` | `fixed`, `variable` |
| `properties[].type` | `string`, `number`, `date`, `boolean` |
| `hierarchies[].kind` | `level`, `parent-child` |
| `measures[].aggregation` | `additive`, `semi-additive`, `non-additive` |
| `measures[].time_aggregation` | `last`, `avg` |
| `measures[].good_direction` | `up`, `down` |

---

## 3. Dónde se usa cada campo

| Campo del modelo | Se usa en |
|---|---|
| `dimensions[].id` | `feeds[].ref` y enlace con términos del pedido |
| `dimensions[].description` | `feeds[].label`; encabezados y etiquetas de las salidas JSON |
| `dimensions[].type` = `time` | Feed `Periodo`; filtros temporales; comparación; reducción de semiaditivas |
| `dimensions[].ordered`, `granularity` | `feeds[].ordered`; modos de comparación (`previous-period`, `same-period-last-year`) |
| `dimensions[].properties[]` | Feeds de rol `property` |
| `dimensions[].hierarchies[]` | `feeds[].hierarchy.available` y `default`; árbol en tablas |
| `dimensions[].members[]` | `memberRoles`; orden de grupos; coincidencia de términos |
| `dimensions[].synonyms`, `properties[].synonyms`, `measures[].synonyms` | Coincidencia de términos (`intent-interpretation.md`, 5.1) antes que el diccionario general |
| `measures[].id` | `measures[].ref` |
| `measures[].unit`, `unit_value`, `decimals` | `format` y `unit` de la medida |
| `measures[].aggregation`, `time_aggregation` | `aggregation` y `timeAgg` de la medida |
| `measures[].components` | Medida `ratio` con numerador y denominador |
| `measures[].good_direction` | `goodDirection` |

---

## 4. Reglas de validación

El skill valida antes de interpretar nada. Los **errores** detienen el proceso; las **advertencias** se informan y se continúa.

| # | Nivel | Regla |
|---|---|---|
| M1 | Error | El JSON es válido tras la lectura tolerante (sección 5.2) |
| M2 | Error | Existen `model` (`id`, `name`, `type`), `dimensions` y `measures` |
| M3 | Error | `model.type` está en su enumerado |
| M4 | Error | `id` de dimensiones, medidas y miembros únicos en su ámbito (dimensiones y medidas comparten ámbito entre sí; propiedades, jerarquías y miembros, dentro de su dimensión) |
| M5 | Error | `dimensions[].type` es válido tras normalizar alias |
| M6 | Error | `measures[].unit` y `type` válidos; `fixed` exige `unit_value` no vacío; `variable` exige `null` |
| M7 | Error | `hierarchies[].kind`, `properties[].type`, `aggregation`, `time_aggregation` y `good_direction` válidos cuando están presentes |
| M8 | Error | A lo sumo una jerarquía con `default: true` por dimensión; `levels` solo con `kind: "level"` |
| M9 | Error | Si hay `members`, todo `parent_id` existe entre los miembros de esa dimensión |
| M10 | Error | `components.numerator` y `denominator` existen entre las medidas |
| M11 | Error | `decimals` entero entre 0 y 6 |
| M12 | Advertencia | Existe al menos una dimensión `time` ✅ (todos los modelos la traen; si falta es una anomalía) |
| M13 | Advertencia | Como máximo una dimensión `time`, una `account` y una `version` ⚠ |
| M14 | Advertencia | `id` con caracteres fuera de `A-Z a-z 0-9 _` (el skill deriva una `key` segura; ver 5.3) |
| M15 | Advertencia | `semi-additive` sin `time_aggregation` (se asume `last`) |
| M16 | Advertencia | Dimensión con jerarquías y ninguna `default` (se usa la primera); jerarquía sin `kind` |
| M17 | Advertencia | `members` con más de 200 elementos (se recomienda omitirlos) |
| M18 | Advertencia | Dimensión `ordered: true` con `members` sin orden o ausentes |

---

## 5. Entrada tolerante y formato original

### 5.1 Formato original del usuario ✅

El primer formato que usó Jean Poul mezclaba español e inglés. El skill lo **normaliza** al canónico y lo informa:

| Original | Canónico |
|---|---|
| `modelo` | `model.name` (`model.id`: se deriva del nombre y se declara) |
| `tipo` | `model.type` |
| `dimensiones` | `dimensions` |
| `dimension_name` | `id` (y `description`, si no hay otro texto) |
| `dimension_type` | `type` (con alias de 2.1; `entity` → `organization`) |
| `dimension_properties[].property_name` | `properties[].id` (`type: string`) |
| `dimension_hierarchies[].hierarchie_name` (también `hierarchy_name`) | `hierarchies[].id` |
| `measures[].measure_name` | `id` |
| `measure_unit` | `unit` |
| `measure_type` | `type` |
| `measure_unit_value` | `unit_value` |

### 5.2 Lectura tolerante

Antes de validar, el skill intenta reparar errores de forma **sin ambigüedad** y los informa en una lista de cambios:

| Problema | Reparación |
|---|---|
| Comas finales en listas y objetos | Se eliminan |
| Comillas tipográficas (“ ”) | Se convierten en comillas rectas |
| BOM al inicio del archivo | Se elimina |
| Clave con los dos puntos dentro de las comillas y valor pegado (`"modelo:"nombre"`) | Se interpreta como `"modelo": "nombre"` |

Cualquier otra rotura (llaves sin cerrar, valores faltantes) **no se repara**: se informa la línea y se pide corregirlo.

### 5.3 Identificadores seguros

Para código y claves de salida, el skill deriva una `key` de cada `id`: sin tildes ni espacios, caracteres no válidos reemplazados por `_`, e iniciando con letra. El `id` original se conserva para mostrar y para enlazar con el modelo. Si dos `key` coinciden, se les añade un sufijo numérico y se informa.

### 5.4 Metadata exportada por SAC (API de importación): solo como respaldo ✅

**Decisión (2026-10-27): la entrada oficial del skill es el JSON canónico de este esquema.** Se le pide al usuario que lo entregue así, y se le da el prompt `prompt-generar-metadata-modelo.md` para generarlo con el MCP de SAC. Si en lugar de eso llega el formato físico descrito abajo, el skill lo reconoce, avisa que le faltan datos clave (miembros, descripciones, jerarquías, medidas de negocio) y **pide el canónico**. Solo lo convierte si el usuario insiste, declarando los huecos en `assumptions`.

Primer archivo real recibido (modelo `C8v8dk17…`). **No es el formato lógico** de este esquema: es la estructura física del modelo, con tres bloques (`factData`, `masterData`, `masterFactData`), cada uno con `keys[]` y `columns[]` (`columnName`, `columnDataType`, `isKey`, `propertyType`, `descriptionName`). El skill lo reconoce por la presencia de `modelId` + `factData` y lo convierte al canónico (`source: "sac-import-api-metadata"`).

| En el archivo | Canónico |
|---|---|
| `modelId` | `model.id` (el nombre no viene: se pide) |
| `factData.keys[]` | `dimensions[]`, en ese orden |
| columna clave con `propertyType: DATE` (`Periodo___CALMONTH`, 6 caracteres) | `type: time`, `granularity: month`, `ordered: true` |
| dimensión con columna `___accType` (`ACCOUNT_TYPE`) | `type: account`, `system_properties: ["ACCOUNT_TYPE"]` |
| dimensión con columna `___currency` (`CURRENCY`) | `type: organization`, `system_properties: ["CURRENCY"]` |
| dimensión llamada Version/Versión | `type: version` (confianza media: se confirma) |
| el resto de claves | `type: generic` |
| columnas `PROPERTY` de `masterData` (distintas de ID/DESCRIPTION/ACCOUNT_TYPE/CURRENCY) | `properties[]` (`type` según `columnDataType`) |
| columnas de jerarquía (si las hubiera en `masterData`) | `hierarchies[]` |
| columna decimal no clave (`SignedData`) | una medida técnica `currency` `variable` si hay dimensión con `CURRENCY`; si no, `number` |

Lo que este archivo **no dice** y el skill debe pedir o declarar:

1. Nombre del modelo y tipo (`planning` / `analytic`).
2. Los **miembros** de las dimensiones, sobre todo de la dimensión de cuentas: en un modelo con cuentas, las "medidas" de negocio son los miembros de esa dimensión, y la agregación en el tiempo se deduce de su `accType` (`INC`/`EXP` aditivas, `AST`/`LEQ` semi-aditivas con `time_aggregation: last`). Sin ellos, `aggregation` se omite y se declara en `assumptions`.
3. Descripciones legibles: `descriptionName` repite el nombre técnico.
4. Jerarquías: si `masterData` no trae columnas de jerarquía, se asumen ausentes pero **no verificadas** (la sonda lo confirma).
5. Medidas de negocio, unidades fijas y sentido favorable.

Campos informativos que el skill admite y no valida: `source`, `system_properties` (en la dimensión) y `_inferred` (qué se dedujo y con qué confianza). Ejemplo convertido: `model-metadata-C8v8dk17.json`.

### 5.5 Ids que SAC usa en tiempo de ejecución (✅ sonda, 2026-10-27)

El JSON canónico y SAC no siempre usan los mismos ids. El widget debe emparejarlos así:

| Elemento | En el JSON canónico | En SAC (ejecución) |
|---|---|---|
| Dimensión de cuentas | `Concepto` | `@MeasureDimension` (descripción `Concepto`); sus miembros llegan por el feed de medidas como `[Concepto].[parentId].&[<cuenta>]` |
| Propiedad de una dimensión | `year`, `quarter`, `date` | `Periodo.YEAR`, `Periodo.CALQUARTER`, `Periodo.DATE` (mayúsculas; el tiempo ofrece además `CALWEEK`, `DATE2`, `YEARDESC`, `HALFYEARDESC`, `QUARTERDESC`, `MONTHDESC`, `WEEK`, `DAY`, `MONTHDAYDESC`, `DAYNAME`) |
| Miembro en una dimensión **plana** | `public.Actual` | `public.Actual` |
| Miembro en una dimensión **con jerarquía** | `CIA_A` | `[Entidad].[Jerraquia_Entidad].&[CIA_A]` (el widget extrae lo que va dentro de `&[...]`) |
| Jerarquía | `Jerraquia_Entidad` | `Jerraquia_Entidad` (igual, con la errata del modelo) y además `@FlatHierarchy` (presentación plana) |

Reglas del adaptador: comparar ids **sin distinguir mayúsculas**; quitar el prefijo `[Dim].[Jer].&[` y el cierre `]` de los ids de miembro antes de enlazar con `members[]`; tratar `@MeasureDimension` como la dimensión de tipo `account`. Se prevé un campo opcional `sac_id` en dimensiones y propiedades para registrar el nombre exacto cuando difiera (⚠ pendiente).

---

## 6. Ejemplo mínimo

```json
{
  "schema_version": "1.0",
  "model": { "id": "M1", "name": "Modelo mínimo", "type": "planning" },
  "dimensions": [
    { "id": "Date", "type": "time", "granularity": "month" },
    { "id": "Region", "description": "Región", "type": "generic" }
  ],
  "measures": [
    { "id": "Ventas", "unit": "currency", "type": "fixed", "unit_value": "USD" }
  ]
}
```

Los ejemplos completos están en `examples/model-metadata-rrhh.json` (modelo de recursos humanos, base del ejemplo 01) y `examples/model-metadata-distribucion.json` (modelo de distribución, base del ejemplo 02).

---

## 7. Pendientes

1. Publicar el esquema formal como **JSON Schema** (`model-metadata.schema.json`) para usarlo en `scripts/validate_model_json.py`.
2. ⚠ Confirmar con la sonda cómo se comportan los modelos que tienen a la vez cuentas y medidas.
3. ✅ (parcial) La conversión desde la metadata de SAC está definida en 5.4; falta un script `convert_sac_metadata.py` y obtener miembros de la dimensión de cuentas (con `accType`) para derivar la agregación.
4. Decidir si las jerarquías necesitan detallar miembros por jerarquía (hoy solo `parent_id` de la jerarquía por defecto).
