# Catálogo de componentes (widget-types)

Referencia para SAC_HTML_STORIES_SKILL. Define **cada tipo de componente** que puede aparecer en `components` de una especificación (`widget-spec-schema.md`): qué recibe, cómo calcula, cómo se dibuja, cómo reacciona y qué estados tiene. El generador del JS principal se apoya en este documento y en el motor común de la sección 2.

Leyenda: ✅ decidido con el usuario · 📘 regla de diseño del skill · ⚠ depende de cómo llegan los datos de SAC; se confirma con la sonda (`sac-widget-contract.md`, sección 8).

---

## 1. Vocabulario de `uses` y `options`

Todos los componentes usan las mismas palabras. Cada tipo indica cuáles acepta.

| Clave | Significado | Referencia a |
|---|---|---|
| `axis` | Dimensión que forma las categorías (barras, miembros de una dona, burbujas) | `feeds` |
| `series` | Dimensión que se apila o diferencia dentro de cada categoría | `feeds` |
| `split` | Dimensión por la que se parte un valor total (tarjetas) | `feeds` |
| `rows`, `columns` | Dimensiones de filas y columnas en tablas y matrices | `feeds` |
| `breakdown` | Dimensión por la que se desglosa una tarjeta | `feeds` |
| `measures` | Medidas que muestra (la primera es la principal) | `measures` |
| `x`, `y`, `size` | Medidas de los ejes y del tamaño en un gráfico de burbujas | `measures` |
| `target` | Propiedad con la meta | `properties` |
| `badge` | Medida o regla que produce una etiqueta | `measures` / regla |
| `within` | Subconjunto de miembros de una dimensión, escrito `Dimension:rol` (por ejemplo `Nivel_Jerarquico:liderazgo`) | `memberRoles` |
| `requires` | Elementos que deben existir para que el componente se dibuje | `feeds`, `measures` |
| `layout` | Maquetación: `{ "span": 1-12, "row": n }` | sección 2.11 |
| `options.selectionGroup` | Nombre del grupo de selección enlazada | sección 2.9 |
| `options.tree` | Muestra las filas de una tabla de forma jerárquica (árbol expandible) | secciones 2.13 y 5.3 |
| `options.level` | Nivel de jerarquía que usa un componente no jerárquico (por defecto, hojas) | sección 2.13 |

---

## 2. Motor común de datos

Todos los componentes leen del **mismo conjunto de filas** ya filtrado y reducido. El motor se genera una sola vez en el JS principal; los componentes no vuelven a leer el binding.

### 2.1 Normalización de filas ✅

Cada fila de `myDataBinding.data` se convierte en un registro:

```js
{
  dims:     { Zona_Regional: {id, label, isNode, isCollapsed, parentId}, Canal: {id, label}, ... },
  props:    { Tipo_Canal: {id, label} },                               // feeds de rol "property"
  measures: { Volumen: {raw: 1234, formatted: "1,234.00", unit: "USD"}, ... }
}
```

- **Columnas.** Se llaman `<feedId>_<índice>` (`dims_0`, `props_0`, `measures_0`). El mapa columna → dimensión se lee en cada render de `metadata.dimensions` (`{id, description}`; las propiedades como `"<Dim>.<PROP>"`); el orden **puede cambiar** entre ejecuciones, así que nunca se asume por posición. Las cuentas se leen de `metadata.mainStructureMembers.<col>`.
- **Ids.** El adaptador compara sin distinguir mayúsculas y normaliza: `year` ≡ `Periodo.YEAR`, `Concepto` ≡ `@MeasureDimension`, y `[Dim].[Jer].&[Miembro]` ≡ `Miembro` (se quita el prefijo del nombre único para comparar con la metadata). Se conserva el `id` original de la celda para llamar a `expandNode`/`collapseNode`.
- **Medidas.** El valor numérico es `raw`; `formatted` (separadores de miles, sin símbolo) se usa para mostrar cuando la unidad es variable; `unit` trae la moneda ya resuelta. Una medida sin unidad no la trae vacía: se trata como ausente.
- **Propiedades.** Una propiedad sin valor llega como `{id:"", label:""}`. Una propiedad en un feed **actúa como agrupación**: agrega filas.
- **Dimensiones fuera del feed.** SAC las **suma**; no se desglosan ni se pueden recuperar en el widget.
- **Estado del binding.** `success`, `loading` (sin `data` ni `metadata`) o `error` (`messages`). Con `loading` se conserva el último render y se muestra un indicador discreto; no se vacía el widget.
- Una fila con celdas vacías en un feed requerido se descarta y se cuenta en el diagnóstico.
- Los miembros se indexan por `id`; el texto visible es `label`.

### 2.2 Filtros internos 📘

1. Se aplican todos los filtros activos (`filters`) sobre los registros: un registro pasa si, para cada filtro activo, su miembro coincide.
2. Un filtro sin selección, o con `includeAll` y valor `all`, no restringe. Con `multi` (selección múltiple ✅), un registro pasa si su miembro está **dentro del conjunto elegido**: dentro de un mismo filtro rige "o"; entre filtros distintos rige "y". En dimensiones con jerarquía y `cascade`, elegir un nodo incluye a todos sus descendientes (2.13).
3. Las opciones de cada filtro salen de los registros **sin aplicar ese mismo filtro** pero **aplicando los demás** (filtros en cascada).
4. El resultado es el conjunto `R` que consumen todos los componentes.

### 2.3 Reducción temporal ✅

Aplica solo si hay feed `Periodo`:

| Tipo de medida | Con varios periodos en `R` |
|---|---|
| `additive` | Se suma sobre todos los periodos |
| `semi-additive` | Primero se agrupa por todas las dimensiones **excepto** `Periodo`; dentro de cada grupo se toma el valor del **último periodo con dato** (`timeAgg: last`) o el promedio de los periodos (`avg`); luego se suma entre grupos |
| `non-additive` | No se recalcula; se muestra solo sin filtros activos (ver 2.5) |

El orden de los periodos sale de `Periodo.ordered` (orden de los miembros en los datos o, si lo declara la especificación, `order`). Si falta el orden y hay semiaditivas, el componente muestra aviso y no calcula.

### 2.4 Agregación ✅

```
agregar(R, ejes, medida) → Map(clave de ejes → valor)
```

1. Reducción temporal (2.3).
2. Agrupar por los ejes del componente.
3. Sumar las medidas aditivas; las semiaditivas, ya reducidas.

### 2.5 Ratios ✅

Para `role: "ratio"`: se agregan **numerador y denominador por separado** con su propia regla y luego se dividen.

- Denominador 0 o ausente → valor `null` (se muestra "—").
- Un ratio nunca se obtiene promediando ratios.
- Una medida `non-additive` que viene ya calculada solo se muestra sin filtros activos; con filtros activos el componente muestra "—" y una nota breve ("No disponible con filtros"). Se declara en `assumptions`.

### 2.6 Comparación entre periodos ✅

Solo si la especificación tiene `comparison` y el componente figura en `appliesTo`:

1. Se identifican `base` y `actual` según `mode`.
2. Se calcula cada uno con el motor completo (reducción temporal **dentro** de cada periodo) sobre las filas de ese periodo.
3. Variación: `Δ = actual − base`; `Δ% = Δ / |base|` (si `base` es 0 o `null`, no hay `Δ%`); en tasas y porcentajes, `Δ` se expresa en **puntos (pt)**.
4. Color: favorable si el signo de `Δ` coincide con `goodDirection`; desfavorable si es opuesto; neutro si `Δ = 0`.

### 2.7 Formato ✅

| `format` | Resultado |
|---|---|
| `integer` | Separador de miles, sin decimales |
| `decimal1`, `decimal2` | 1 o 2 decimales |
| `percent0`, `percent1`, `percent2` | Valor × 100 con el símbolo %, con 0, 1 o 2 decimales |
| `currency` | Moneda de la medida (`unit_value` en el modelo, o `formatted` de SAC si la unidad es variable ⚠) |

- Se usa el formateador de números del navegador con el idioma del usuario; si no hay, `es`.
- Con `unit` (por ejemplo "años", "cajas"), la unidad va en texto secundario junto al número.
- `null` se muestra "—"; nunca "0" ni "NaN".
- Valores grandes en tarjetas pueden abreviarse (K, M) solo si la opción `compact: true` está activa; en tablas siempre se muestra el número completo.

### 2.8 Colores 📘

- La paleta de series (`theme.seriesPalette`) se asigna **por id de miembro**, en orden ascendente de id, y es la misma en todos los componentes.
- Si una dimensión tiene `memberRoles` con color definido en `theme.colors` (por ejemplo `mujeres`, `hombres`), ese color manda.
- Más miembros que colores: los colores se repiten con variante de brillo, nunca se usa el mismo tono para dos miembros visibles a la vez; si no alcanza, los de menor peso se agrupan en "Otros" (2.12).
- El color nunca es el único portador de significado: las etiquetas y las leyendas siempre llevan texto.

### 2.9 Selección enlazada 📘

- Los componentes con el mismo `selectionGroup` comparten una **selección** (un miembro de la dimensión del grupo, o ninguno).
- Elegir un miembro (clic en leyenda, burbuja, fila o segmento) lo resalta en todos los componentes del grupo y atenúa el resto. Volver a elegirlo, o `Escape`, quita la selección.
- La selección **no** filtra los datos (eso lo hacen los filtros); solo resalta y, cuando el componente lo admite, muestra un detalle.
- Todos los componentes de un grupo deben usar la misma dimensión en `axis`/`rows` (regla C5).

### 2.10 Estados 📘

Cada componente puede estar en uno de estos estados y debe dibujarlos:

| Estado | Cuándo | Qué se muestra |
|---|---|---|
| `ready` | Hay datos | El componente |
| `empty` | `R` queda vacío tras filtrar | "Sin datos para la selección" y sugerencia de limpiar filtros |
| `missingFeeds` | Falta un feed **requerido** | Aviso único del widget con la lista de feeds faltantes y su orden |
| `hidden` | Falta un elemento de `requires` (opcional) | No se dibuja nada; no hay error |
| `loading` | El binding aún no tiene datos | Marcador de carga ⚠ |

El aviso `missingFeeds` es **uno por widget**, no uno por componente.

### 2.11 Maquetación y accesibilidad 📘

**Maquetación** (cuadrícula de 12 columnas, adaptable):

| Tipo | Ancho por defecto (`span`) |
|---|---|
| Tarjetas KPI | 3 (cuatro por fila; 6 en pantallas medianas; 12 en móvil) |
| Gráficos de reparto (dona, pirámide) | 4 a 7 |
| Burbujas | 8 |
| Barras apiladas | 6 a 12 |
| Matrices y tablas | 12 |
| Barra de filtros | 12, siempre arriba |

- El orden es el de `components`, con la barra de filtros primero y las tarjetas KPI antes que los gráficos.
- A anchos menores de unos 600 px, todo pasa a una columna y las tablas se desplazan horizontalmente dentro de su contenedor.
- El widget ocupa el ancho disponible; la altura crece con el contenido.

**Accesibilidad:**

- Cada componente tiene un contenedor con `role="region"` y `aria-label` = su `title`.
- Los gráficos SVG llevan `role="img"` con una descripción corta, y una **alternativa en texto** (la tabla subyacente accesible con teclado o una lista).
- Los elementos interactivos (leyendas, burbujas, filas) son enfocables con teclado y reaccionan a `Enter` y `Espacio`.
- Contraste mínimo 4.5:1 entre texto y fondo; el estado "favorable/desfavorable" siempre lleva texto o símbolo además del color.

### 2.12 Límites 📘

| Componente | Límite | Si se supera |
|---|---|---|
| Dona | 8 segmentos | Los menores se agrupan en "Otros" |
| Barras (`stacked-100-bars`, `stacked-bars`) | 12 categorías por defecto | `topN` + "Otros", o paginación si se pide |
| Burbujas | 30 burbujas | Se muestran las 30 mayores por tamaño y se avisa |
| Tabla y matriz | `pageSize` (10 por defecto) | Paginación |
| Series apiladas | 8 | Las menores se agrupan en "Otros" |

### 2.13 Jerarquías ✅

El usuario puede elegir una jerarquía en las tablas y ver los datos **de forma jerárquica**. Todo lo de esta sección está verificado con la sonda (contrato §3.4.1, §3.4.2 y §8), salvo lo marcado ⚠.

**Cómo entrega SAC una jerarquía**

- **Un nivel por lectura:** llega solo el nivel configurado (nunca el raíz y el nivel 2 juntos), sin doble conteo: el total del nivel coincide con el del raíz.
- Con jerarquía activa, el `id` de la celda es el nombre único `[Dim].[Jer].&[Miembro]` y trae `isNode`, `isCollapsed` y `parentId` (si hay padre en el nivel mostrado). Las hojas **no** traen `isNode` ni `isCollapsed`.
- Con la jerarquía plana (`@FlatHierarchy`) el `id` es el simple (`CO_A`) y no hay `isNode`, `isCollapsed` ni `parentId`.
- El adaptador de jerarquía convierte las filas de una dimensión en nodos `{ id, label, parentId, isNode, isCollapsed, isLeaf }`. Si no hay `parentId` (jerarquía plana, o el nivel raíz) los nodos son todos de primer nivel y se muestran en lista.

**El widget controla la jerarquía** (desde su propio JS; el script de la story no llega al origen de datos)

```js
const ds = this.dataBindings.getDataBinding('myDataBinding').getDataSource();
await ds.getHierarchies('Entidad');                 // [{id:'Jerraquia_Entidad'},{id:'@FlatHierarchy',description:'Presentación plana'}]
await ds.setHierarchy('Entidad', id);               // luego volver a fijar el nivel
await ds.setHierarchyLevel('Entidad', n);           // nivel 1 = raíz
await ds.expandNode('Entidad', { Entidad: idUnico });
await ds.collapseNode('Entidad', { Entidad: idUnico });
```

- Todos devuelven **promesas** (resuelven `undefined`) y, tras `setHierarchy`, `setHierarchyLevel`, `expandNode` y `collapseNode`, el binding pasa por `loading` y vuelve a `success`: se protege con `typeof … === 'function'`, `try/catch` y se espera el siguiente render.
- **`setHierarchy` reinicia la vista al nodo raíz colapsado:** tras cambiar de jerarquía se vuelve a llamar `setHierarchyLevel` (o `expandNode`).
- `expandNode` y `collapseNode` usan siempre el **nombre único** (`id` de la celda).
- El selector de jerarquía (`feeds[].hierarchy.selectable`) lista `getHierarchies(dim)`. Los ids de la especificación (`hierarchy.available`) se usan solo para filtrar o para etiquetar; se muestra `description` si existe.
- El método `getSelectedHierarchy(dimension)` y el evento `onHierarchyChange` **no son necesarios** para que funcione; solo se agregan si la story quiere enterarse. Reglas de métodos en el contrato (§2.4).
- Niveles: se muestran como "Nivel 1 … n". No se usa `fetchHierarchyLevels`. La profundidad máxima se deduce con `getMembers` (orden en árbol) o con las cadenas de `parentId`.

**Sin doble conteo (regla crítica)**

1. Con un nivel fijo (`setHierarchyLevel`), todas las filas son del mismo nivel: se suman sin más.
2. Con **nodos expandidos** (`expandNode`), SAC añade los hijos y **conserva la fila del padre**: sumar todo duplica. Una fila con `isNode && !isCollapsed` en cualquier dimensión es un **subtotal** y se **excluye** de totales, KPIs y gráficos; se usa solo para mostrar el valor del padre en una tabla en árbol.
3. Los componentes que no son tablas jerárquicas (tarjetas, dona, barras, burbujas, matrices sin `tree`) trabajan con un **nivel fijo**: `options.level` (entero desde 1 = raíz) o, si no se indica, el nivel configurado en el Builder.
4. Las medidas semiaditivas se reducen en el tiempo **antes** de agregar hacia arriba (2.3).

**Expansión**

- La expansión la hace SAC (`expandNode`/`collapseNode`); el widget no conserva un conjunto propio de ids expandidos: el estado es el que indican `isCollapsed` y la presencia de los hijos.
- Nivel inicial: propiedad `nivelExpansionInicial` (por defecto 1); el widget llama a `setHierarchyLevel` con ese valor al cargar.
- ⚠ Sin verificar: "Expandir todo" (llamadas sucesivas a `expandNode`, y si los nodos expandidos conservan su estado tras otro `expandNode` o un cambio de filtro). Hasta confirmarlo, el control se llama "Nivel n" (`setHierarchyLevel`) y la expansión es nodo a nodo.

**Cuentas (modelos basados en cuentas)**

- La dimensión de cuentas **no puede ir en un feed de dimensiones**: entra como columnas del feed de medidas (`mainStructureMember`), y su estructura sale de `metadata.mainStructureMembers` (`id` único, `label`, `isNode`, `isCollapsed`). Una tabla con cuentas en filas se construye en el cliente, transponiendo esas columnas.
- ⚠ Sin verificar: expandir cuentas con `expandNode` sobre `@MeasureDimension`.

**Filtros jerárquicos**

- Los miembros de la lista salen de `getMembers(dim)` (maestro completo, en orden de árbol, **sin padre ni nivel**) o de las filas entregadas (con `parentId` pero solo con datos). ⚠ Para sangrar por nivel hace falta el padre: se toma de las filas entregadas; los miembros sin fila se muestran sin sangría.
- Con `cascade`, elegir un nodo marca sus descendientes conocidos; un nodo con hijos parcialmente elegidos aparece indeterminado; la búsqueda muestra la ruta ("Zona Sur › Andalucía") cuando hay `parentId`.

---

## 3. Tarjetas KPI

Una tarjeta tiene título (en mayúsculas pequeñas), valor principal, unidad opcional y, según el tipo, un detalle inferior. Los iconos son SVG en línea del catálogo de `design-guidelines.md` (por definir).

### 3.1 `kpi-card`

| | |
|---|---|
| **Propósito** | Un indicador con su valor |
| **Usa** | `measures` (la primera) · opcional `badge` (medida cuyo valor aparece como etiqueta, por ejemplo `% activos`) |
| **Requiere** | La medida principal |
| **Opciones** | `compact` (abreviar K/M, por defecto `false`) · `icon` |
| **Cálculo** | Valor = agregar `R` sin ejes (un solo valor, 2.4 o 2.5) |
| **Dibujo** | Valor grande con unidad; etiqueta secundaria si hay `badge`; variación si el componente está en `comparison.appliesTo` (2.6) |
| **Estados** | Valor `null` → "—" |
| **Usado en** | Ejemplos 01 y 02 |

### 3.2 `kpi-card-split`

| | |
|---|---|
| **Propósito** | Un valor total partido por una dimensión de dos o pocos miembros |
| **Usa** | `measures` (la primera) · `split` |
| **Opciones** | `mode`: `share` (por defecto en medidas aditivas; muestra reparto) o `value` (por defecto en ratios; muestra el valor de cada miembro) · `showGap` (si hay exactamente dos miembros, diferencia entre ellos) · `icon` |
| **Cálculo** | Con `share`: total, y para cada miembro del split, su valor y su porcentaje sobre el total. Con `value`: el valor de la medida (ratio) para cada miembro, más el total general |
| **Dibujo** | Valor total · barra horizontal apilada con los miembros · leyenda con porcentaje y valor · si `showGap`, una línea con la diferencia (en las unidades de la medida) |
| **Colores** | Por rol del miembro (`memberRoles` + `theme.colors`) o paleta estable (2.8) |
| **Estados** | Sin miembros en el split → se dibuja solo el total |
| **Usado en** | Ejemplo 01 (plantilla por género, edad promedio, retención) y Ejemplo 02 (mezcla B2B/D2C) |

### 3.3 `kpi-card-vs-target`

| | |
|---|---|
| **Propósito** | Un indicador contra una meta |
| **Usa** | `measures` · `target` (propiedad con la meta) · opcional `split`, `within` |
| **Opciones** | `focus` (cuando hay `split`: el rol del miembro cuyo **peso** se mide; por ejemplo `"mujeres"`) · `icon` |
| **Cálculo** | Sin `split`: valor de la medida (valor o ratio). Con `split` y `focus`: **porcentaje que representa el miembro `focus` sobre el total**, dentro del subconjunto `within` si se indica. Brecha = valor − meta, en puntos para porcentajes |
| **Dibujo** | Valor grande · barra de progreso con **marcador en la meta** · "Brecha: ±x pt" · estado "En trayectoria" o "Por debajo" según `goodDirection` |
| **Estado calculado** | Favorable si la brecha sigue `goodDirection` (para `up`, valor ≥ meta); si no, desfavorable. Los textos de estado van como propiedades |
| **Requiere** | La medida, la propiedad `target` y, si hay `within`, la dimensión del subconjunto |
| **Usado en** | Ejemplo 01 (mujeres en liderazgo) y Ejemplo 02 (margen vs meta) |

### 3.4 `kpi-card-breakdown`

| | |
|---|---|
| **Propósito** | Un ratio general con su valor para los miembros principales de una dimensión |
| **Usa** | `measures` (un ratio) · `breakdown` |
| **Opciones** | `topN` (3 por defecto) · `rankBy` (medida para ordenar; por defecto el denominador del ratio) · `colorize` (false por defecto: si es true, colorea cada fila como favorable o desfavorable según `goodDirection`, comparada con el valor general) |
| **Cálculo** | Valor general = ratio sobre `R`; por cada miembro del breakdown, el ratio de sus filas; se ordenan por `rankBy` descendente y se toman los `topN` |
| **Dibujo** | Valor general grande con unidad · lista de `topN` filas "nombre … valor" |
| **Estados** | Miembros con denominador 0 se omiten; menos de `topN` miembros → se muestran los que haya |
| **Usado en** | Ejemplo 02 (días de inventario, mermas, frecuencia, ciclo de pedido) |

> No existe un tipo `kpi-card-delta`: cualquier tarjeta muestra variación cuando `comparison.appliesTo` la incluye (2.6).

---

## 4. Gráficos

### 4.1 `pyramid-bars`

| | |
|---|---|
| **Propósito** | Comparar dos series enfrentadas por categorías ordenadas (pirámide poblacional) |
| **Usa** | `axis` (dimensión ordenada) · `series` (con exactamente dos miembros) · `measures` |
| **Opciones** | `scale`: `absolute` (por defecto: **escala común** para todas las barras, la mayor ocupa el 100 % de su lado) o `share` (cada fila se reparte según la proporción de las dos series) · `highlightPeak` (marca la categoría de mayor total) · `showCohortTotals` · `leftRole` / `rightRole` (por defecto el primer y segundo rol de `series`; para género: `mujeres` a la izquierda y `hombres` a la derecha) |
| **Cálculo** | Para cada categoría del eje (en su orden): valor izquierdo, valor derecho, total, porcentaje de cada lado sobre el total de la categoría y porcentaje de la categoría sobre el total general |
| **Dibujo** | Una fila por categoría: izquierda `valor (%)`, etiqueta central, derecha `valor (%)`; barras enfrentadas; si `showCohortTotals`, una línea "Total: n · x % del total" |
| **Interacción** | Hover/foco muestra detalle; `highlightPeak` añade un símbolo y texto "Mayor volumen" a la categoría mayor |
| **Si `series` no tiene dos miembros** | Se degrada a `stacked-100-bars` con la misma configuración y se declara |
| **Usado en** | Ejemplo 01 (pirámide por grupo etario) |

### 4.2 `stacked-100-bars`

| | |
|---|---|
| **Propósito** | Composición porcentual de cada categoría por una serie |
| **Usa** | `axis` · `series` · `measures` |
| **Opciones** | `showTotal` (muestra el total de cada categoría) · `sort`: `total-desc` (por defecto), `total-asc`, `label`, `order` (orden de la dimensión) · `topN` · `badge`: `dominantChannel` (ver abajo) o `status` (estados por umbrales) · `status` (bandas, 4.5) · `footerSummary` (resumen al pie, por ejemplo cuántas categorías están dentro del rango) |
| **Cálculo** | Para cada categoría: total y porcentaje de cada miembro de la serie; las categorías menores que `topN` se agrupan en "Otros" |
| **Dibujo** | Una fila por categoría: título + total a la derecha; barra horizontal de ancho completo dividida por porcentaje (etiqueta dentro del segmento si el segmento tiene al menos ~8 %); línea inferior con porcentajes y la etiqueta (`badge`) |
| **`dominantChannel`** | El miembro de mayor porcentaje es **dominante** si su porcentaje ≥ `umbralDominancia` (propiedad); la etiqueta muestra `textoDominante: <miembro>`; si no, `textoMixto`. Los textos y el umbral son propiedades |
| **`status`** | Usa las bandas de 4.5 sobre el porcentaje de un miembro de la serie (`metric: "share<rol>"`) |
| **Interacción** | Clic en segmento o fila selecciona el miembro (selección enlazada si hay grupo); hover muestra valor y porcentaje |
| **Usado en** | Ejemplo 01 (barras por departamento con estado de paridad) y Ejemplo 02 (penetración por zona, canales por marca) |

### 4.3 `stacked-bars`

| | |
|---|---|
| **Propósito** | Comparar **volúmenes absolutos** de categorías, partidos por una serie |
| **Usa** | `axis` · `series` · `measures` |
| **Opciones** | Las de `stacked-100-bars`, excepto `badge: dominantChannel` |
| **Diferencia** | La longitud total de cada barra es **proporcional al valor total** (escala común); en `stacked-100-bars` todas miden lo mismo |
| **Cuándo se elige** | Cuando el pedido habla de volumen o ranking ("las áreas con más personal", "las zonas que más despachan") y no de composición |
| **Usado en** | Aún sin ejemplo |

### 4.4 `donut-share`

| | |
|---|---|
| **Propósito** | Reparto de un total entre los miembros de una dimensión |
| **Usa** | `axis` · `measures` (aditiva o semiaditiva) |
| **Opciones** | `centerTotal` (muestra el total en el centro con su unidad) · `legend`: lista con `share`, `value` o ambos · `topN` (6 por defecto; el resto en "Otros") · `selectionGroup` |
| **Cálculo** | Total = suma sobre los miembros; porcentaje de cada miembro; los miembros con valor ≤ 0 se omiten; los de menos de ~1 % se agrupan en "Otros" |
| **Dibujo** | Gráfico `pie` de ECharts (SVG) en anillo, con colores estables por miembro (2.8); centro con total; leyenda HTML debajo con color, nombre, porcentaje y valor |
| **Interacción** | Clic en segmento o leyenda selecciona el miembro; hover resalta el segmento |
| **Estados** | Total 0 → `empty` |
| **Usado en** | Ejemplo 02 |

### 4.5 Bandas de estado (reglas compartidas) 📘

Se declaran en `options.status`:

```json
"status": { "metric": "shareMujeres",
  "bands": [ { "below": "umbralParidadMin", "label": "estadoBajo" },
             { "between": ["umbralParidadMin", "umbralParidadMax"], "label": "estadoOptimo" },
             { "above": "umbralParidadMax", "label": "estadoAlto" } ] }
```

- `metric`: `share<rol>` (porcentaje de un miembro de la serie), o una medida.
- Los límites y los textos son **propiedades** (nombres como en la especificación). El estado dentro del rango lleva el color positivo del tema; fuera de rango, un tono neutro o de alerta con texto (nunca solo color).
- `footerSummary: "areasEnRango"`: texto "N de M categorías dentro del rango" calculado con las mismas bandas.

### 4.6 `bubble-matrix`

| | |
|---|---|
| **Propósito** | Comparar miembros de una dimensión en tres medidas a la vez (volumen, rentabilidad, tamaño) |
| **Usa** | `axis` (cada miembro es una burbuja) · `x` · `y` · `size` |
| **Requiere** | Las tres medidas |
| **Opciones** | `yReference` (propiedad o número: línea horizontal de meta) · `xReference` (`median`, `mean`, propiedad o número: línea vertical) · `quadrantLabels` (4 etiquetas en las esquinas) · `selectionGroup` |
| **Cálculo** | Para cada miembro: `x`, `y`, `size` (ratios con 2.5). Escala X: lineal de 0 a máximo + 10 %. Escala Y: lineal entre el mínimo y el máximo con margen del 10 %, incluyendo `yReference` si existe. Radio: raíz cuadrada del tamaño, entre 14 y 44 px |
| **Dibujo** | Gráfico `scatter` de ECharts (SVG) con ejes que incluyen las referencias · burbujas coloreadas por miembro (2.8) · líneas de referencia con su valor · leyenda HTML · nombre y valores en tooltip · ⚠ `quadrantLabels` aún no implementado (deben ser propiedades de texto editables) |
| **Etiquetas de cuadrante** | Se generan como **propiedades de texto editables** con valores genéricos (por ejemplo "Alto volumen / Alto margen"); no se fijan textos de negocio en el código |
| **Interacción** | Hover/foco: tooltip con nombre y los tres valores; clic selecciona el miembro; la selección se refleja en una barra de detalle inferior con los valores calculados (sin texto analítico) |
| **Colisiones** | Burbujas solapadas: se dibujan de mayor a menor tamaño, con transparencia parcial; el orden de enfoque con teclado es por tamaño descendente |
| **Estados** | Menos de 2 miembros → `empty`; valores `null` en `x`, `y` o `size` → esa burbuja se omite y se cuenta |
| **Usado en** | Ejemplo 02 |

---

## 5. Tablas y matrices

### 5.1 `cross-matrix`

| | |
|---|---|
| **Propósito** | Cruce de dos dimensiones, con opcionalmente una serie dentro de cada celda |
| **Usa** | `rows` · `columns` (ordenada) · `measures` · opcional `series` |
| **Opciones** | `cellFormat`: `value` (por defecto sin serie) o `a / b` (con `series` de dos miembros; el orden de los valores sigue a `leftRole`/`rightRole` y las etiquetas de columnas lo indican) · `rowTotal` · `columnTotal` · `heat` (intensidad de fondo según el valor de la celda) · `search`: `rows` (buscador por texto sobre las filas) · `pageSize` · `statusColumn` (columna final con el estado de la serie, usando 4.5) |
| **Cálculo** | Celda = agregar `R` por `(fila, columna)` (y por serie); totales de fila y de columna con la misma regla (no se suman ratios) |
| **Dibujo** | Cabecera fija con etiqueta de columna y, si hay serie, leyenda "M / H" bajo cada columna · filas con punto de color estable · total a la derecha · columna de estado si se pide |
| **Heat** | Escala por cuantiles (no por máximo único) para no aplastar valores medios; el texto siempre mantiene contraste suficiente |
| **Interacción** | Clic en cabecera ordena por esa columna; buscador filtra filas por texto (id o etiqueta); paginación si hay más de `pageSize` filas |
| **Estados** | Celda sin dato → "—" |
| **Usado en** | Ejemplo 01 (departamento × grupo etario por género), Ejemplo 02 (zona × marca) |

### 5.2 `detail-table`

| | |
|---|---|
| **Propósito** | Detalle por miembro de una dimensión con varias medidas |
| **Usa** | `rows` · `measures` (cada una es una columna) · opcional propiedades como columnas |
| **Opciones** | `search`: `rows` · `pageSize` · `selectionGroup` · `dropColumnsWithoutData` (omite columnas cuyo elemento no existe, para tolerar opcionales) · `totalsRow` (fila de totales; los ratios se recalculan con 2.5) |
| **Dibujo** | Cabecera con unidades; números alineados a la derecha con formato; texto a la izquierda; fila resaltada si coincide con la selección enlazada |
| **Columnas de maestro** | Operador, modelo comercial, etc. solo si existen como **propiedades** del miembro y están en `feeds`; cada una consume un feed |
| **Usado en** | Ejemplo 02 |

---

### 5.3 Tablas jerárquicas (`options.tree`) ✅

Aplica a `detail-table` y a `cross-matrix` (sobre sus filas). Reglas de jerarquía en 2.13.

```json
"options": {
  "tree": { "axis": "rows", "expandLevel": 1, "hierarchyControl": true, "indentPx": 16, "showLevelColumn": false }
}
```

| | |
|---|---|
| **Requiere** | Que el eje de filas sea un feed con `hierarchy` en la especificación |
| **Opciones** | `expandLevel` (nivel inicial; enlazado con la propiedad `nivelExpansionInicial`) · `hierarchyControl` (muestra el selector de jerarquía) · `indentPx` (sangría por nivel) · `showLevelColumn` (columna con el nivel del nodo) |
| **Dibujo** | Una fila por nodo visible, con **sangría por nivel**, un indicador ▸ / ▾ en los nodos que tienen hijos y un espacio equivalente en las hojas · los nodos con hijos se destacan (peso de letra mayor) y muestran **valores agregados** · las hojas se dibujan normales · al final, la fila de total general (desde hojas, 2.13) |
| **Controles** | Botones "Nivel 1 … n" (`setHierarchyLevel`; muestran un solo nivel) · expandir/contraer por nodo (▸ / ▾ → `expandNode`/`collapseNode`) · "Expandir todo" ⚠ sin verificar (2.13) · **selector de jerarquía** (`getHierarchies`) si hay más de una y `hierarchyControl` está activo |
| **Búsqueda** | Filtra por texto sobre id y etiqueta **conservando visibles los ancestros** de cada coincidencia (se expanden automáticamente); sin texto, vuelve al estado de expansión previo |
| **Orden** | Ordenar por una columna ordena a los **hermanos dentro de su padre**; el árbol no se rompe |
| **Paginación** | Se desactiva en modo árbol; el contenedor tiene altura máxima con cabecera fija y desplazamiento interno. Si hay más de unas 500 filas visibles, se dibujan solo las que caben en pantalla (virtualización) |
| **Heat** (`cross-matrix`) | La escala de intensidad se calcula **por nivel**, para que los nodos con totales altos no aplasten a las hojas |
| **Selección enlazada** | Elegir una fila selecciona el id del nodo; si el grupo usa una dimensión sin jerarquía, solo las hojas participan |
| **Teclado y accesibilidad** | Contenedor con `role="treegrid"`; cada fila con `aria-level`, `aria-expanded` (si tiene hijos) y `aria-selected`; `→` expande, `←` contrae (o sube al padre), `↑` `↓` mueven el foco, `Enter` selecciona |
| **Estados** | Sin `parentId` (jerarquía plana o un solo nivel) → lista plana sin sangría; `loading` → se conserva el último render con indicador; nodo sin datos → "—"; los subtotales (`isNode && !isCollapsed`) no entran en el total general (2.13) |
| **Usado en** | Aún sin ejemplo; patrón típico: zonas regionales, centros de costos, cuentas, organización |

---

## 6. Comparativos y tendencia (P3, P6)

Aún sin ejemplo; se definen para que el skill los pueda generar.

### 6.1 `bar-compare`

| | |
|---|---|
| **Propósito** | Comparar `base` y `actual` por categoría |
| **Usa** | `axis` · `measures` |
| **Requiere** | `comparison` en la especificación (sección 2.6) |
| **Dibujo** | Dos barras por categoría (base en tono suave, actual en tono pleno) con el valor y la variación (Δ y Δ%) al final de la fila; color de la variación según `goodDirection` |
| **Cálculo** | 2.6 para cada categoría |
| **Orden** | Por `actual` descendente (por defecto), o por variación |

### 6.2 `variance-table`

| | |
|---|---|
| **Propósito** | Tabla de variación |
| **Usa** | `rows` · `measures` |
| **Requiere** | `comparison` |
| **Columnas** | Base · Actual · Δ · Δ% (en tasas, Δ en pt) |
| **Opciones** | Las de `detail-table` |
| **Dibujo** | Δ y Δ% con color y símbolo (▲/▼) según `goodDirection`; texto además del color |

### 6.3 `line-trend`

| | |
|---|---|
| **Propósito** | Evolución de una medida en el tiempo |
| **Usa** | `axis` (la dimensión `Periodo`, ordenada) · `measures` · opcional `series` |
| **Cálculo** | Valor por periodo (y por miembro de la serie); en medidas semiaditivas, el valor **del periodo** (no se reduce entre periodos); ratios con 2.5 |
| **Dibujo** | Líneas con puntos; último punto resaltado con su valor; ejes con etiquetas legibles; hover/foco con valor del periodo |
| **Estados** | Menos de 2 periodos → se muestra como tarjeta KPI con un aviso |

---

## 7. Filtros internos ✅

### 7.1 `filter-bar`

Contenedor de todos los filtros de la especificación: una fila adaptable en la parte superior del widget. Si no hay filtros, no se dibuja.

### 7.2 Filtro `combobox`

Selector con búsqueda para dimensiones con muchos miembros (patrón del widget de captura).

- Campo de texto con flecha y botón de limpiar. Al enfocarse o hacer clic, se abre la lista.
- **Búsqueda en vivo** sobre `id` y `descripción` (y sobre el valor de una propiedad si `by` incluye `property`), sin tildes y sin distinguir mayúsculas; el texto coincidente se resalta.
- Lista con la opción `(Todos)` (si `includeAll`) y los miembros, cada uno con etiqueta e id.
- Teclado: `↓`/`↑` mueven el resaltado, `Enter` elige, `Escape` cierra. Al cerrar, el texto vuelve al valor elegido.
- Opciones y orden: cascada (2.2); orden por `order` de la dimensión o alfabético.
- **Selección múltiple** (`multi: true`) ✅: cada miembro lleva una casilla y la lista permanece abierta al elegir. El campo muestra hasta dos chips y "+N"; hay botones "Seleccionar visibles" y "Limpiar". Sin selección equivale a "Todos". Por defecto `multi` es `true` en filtros de dimensiones de contexto y `false` en `Periodo` (salvo que el pedido hable de varios periodos); con `comparison`, `Periodo` nunca es múltiple.
- `multi: false`: un único valor elegido.
- Con `cascade` en dimensiones con jerarquía, ver 2.13.

### 7.3 Filtro `segmented`

Botones en una fila, para pocos miembros (periodos, tipos).

- Un botón por miembro, más "Todos" si `includeAll`.
- `default`: `all`, `last` (último miembro ordenado) o un id.
- Con más de 6 miembros se degrada a `combobox` y se declara.
- Con `multi: true`, los botones son conmutadores (puede haber varios activos) y "Todos" los limpia. El filtro de periodo del ejemplo 02 es de selección única.

---

## 8. Componentes de captura (modo `captura` y `mixto`)

Reproducen el comportamiento del widget Generador de Combinaciones, pero **generados desde la especificación**: nada de nombres de dimensión escritos a mano.

### 8.1 `combobox-selector`

Un selector por dimensión del feed (mismo comportamiento que 7.2), usado para **construir** una combinación. Al elegir en todos, se habilita "Agregar a lista". Cada dimensión puede quedar en `(Todos)` (id vacío).

### 8.2 `capture-list`

| | |
|---|---|
| **Propósito** | Lista de las combinaciones agregadas |
| **Acciones** | "Agregar a lista" (valida que haya al menos un valor elegido), eliminar fila, "Limpiar todo" |
| **Dibujo** | Tabla con una columna por dimensión (etiqueta) y botón de quitar; estado vacío con instrucciones |
| **Contador** | "Lista: N combinación(es)" |
| **Sin duplicados** ✅ | Una combinación con los **mismos ids en todas las dimensiones** que otra de la lista no se agrega: aviso "La combinación ya existe". La comparación es por id, no por etiqueta. `(Todos)` (id vacío) cuenta como un valor más |

### 8.3 `csv-import`

| | |
|---|---|
| **Propósito** | Cargar combinaciones desde un CSV |
| **Formato** | Primera fila de cabecera; una columna por dimensión del feed. Las columnas se asocian por **nombre de cabecera** (id o etiqueta de la dimensión) y, si no coinciden, por posición |
| **Parseo** | Respeta comillas y comas dentro de comillas; separador `,` o `;` detectado automáticamente; BOM y saltos de línea de Windows |
| **Validación** | Cada id se busca en las opciones del selector de su dimensión: si existe, la **descripción se toma de las opciones** (no se repite el id); si no existe, la fila se importa con descripción igual al id y se **cuenta como advertencia** |
| **Duplicados** ✅ | Las filas repetidas dentro del archivo o ya presentes en la lista se omiten (misma regla por id que en `capture-list`) |
| **Resultado** | Aviso "N filas cargadas, D duplicadas omitidas, M con advertencias" |
| **Corrige** | Los defectos del widget original: descripción duplicando el id y parseo con `split(',')` |

### 8.4 `json-preview`

| | |
|---|---|
| **Propósito** | Generar, ver y descargar el JSON de salida |
| **Botones** | "Generar JSON" (habilitado si hay combinaciones) · vista previa en modal · "Descargar archivo" |
| **Contrato de salida** | Ver abajo |
| **Contadores** | "JSON: N combinación(es)"; si `N < lista`, el contador se marca en rojo (JSON desactualizado) |

**Contrato de salida** (las claves salen de los `id` de las dimensiones de la especificación):

```json
{
  "metadata": {
    "generadoEn": "2026-10-26T18:20:00.000Z",
    "totalCombinaciones": 2,
    "dimensiones": [ { "id": "Version", "descripcion": "Versión" }, { "id": "Periodo", "descripcion": "Periodo" } ]
  },
  "combinaciones": [
    { "Version": { "id": "V1", "descripcion": "Presupuesto" }, "Periodo": { "id": "2026.01", "descripcion": "Ene 2026" } }
  ]
}
```

**Métodos expuestos a SAC Script** (todos devuelven tipos simples):

| Método | Retorna |
|---|---|
| `getJsonString()` | El JSON de salida como cadena |
| `getCombinations()` | La lista actual de combinaciones como cadena JSON |
| `getIsJsonSynced()` | `boolean`: la cantidad de combinaciones del JSON coincide con la de la lista |
| `clearCombinations()` | Limpia lista, JSON, contadores y selectores |

**Evento opcional** `onJsonGenerated`: se dispara al generar el JSON, para que la story lo recoja sin consultar. Se declara en la especificación solo si el pedido lo sugiere ("avisar a la story").

---

## 9. Validaciones de componentes (para `validate_spec` y `validate_bundle`)

| # | Regla |
|---|---|
| C1 | `type` pertenece a este catálogo |
| C2 | Toda clave de `uses` es válida para ese tipo (sección 1 y tabla del tipo) |
| C3 | Todo `ref` de `uses` y `requires` existe en `feeds` o `measures` |
| C4 | Cada tipo recibe las claves obligatorias (`donut-share`: `axis` y una medida; `bubble-matrix`: `axis`, `x`, `y`, `size`; `kpi-card-split`: `measures` y `split`; `cross-matrix`: `rows`, `columns`, `measures`; `bar-compare`, `variance-table`: `comparison`; etc.) |
| C5 | Todos los componentes con el mismo `selectionGroup` usan la misma dimensión como `axis` o `rows` |
| C6 | `pyramid-bars`: `series` tiene dos miembros definidos en `memberRoles` (o se declara el degradado a `stacked-100-bars`) |
| C7 | `kpi-card-vs-target`: existe la propiedad `target`; con `split` hay `options.focus` |
| C8 | Toda propiedad referenciada por `status`, `target`, `yReference`, `badge` existe en `properties` con `default` |
| C9 | Las medidas `non-additive` usadas junto a filtros activos tienen aviso declarado |
| C10 | Ningún componente depende de una dimensión que no está en `feeds` |
| C11 | `bar-compare`, `variance-table`, y las variaciones en cualquier tarjeta requieren `comparison` con el componente en `appliesTo` |
| C12 | Suma de `span` por fila ≤ 12 |
| C13 | `options.tree` solo en `detail-table` o `cross-matrix`, y su eje de filas es un feed con `hierarchy` |
| C14 | `hierarchy.default` pertenece a `hierarchy.available`, y todos esos ids existen en `hierarchies` de la dimensión en el modelo |
| C15 | `options.level` solo en componentes sin `tree`, y su eje es un feed con `hierarchy` |
| C16 | `cascade` solo en filtros cuya dimensión tiene `hierarchy` |
| C17 | Si algún feed tiene `hierarchy.selectable: true`, el JS llama a `setHierarchy` y luego a `setHierarchyLevel` protegidas con `typeof`, y existe la propiedad `nivelExpansionInicial`; `getSelectedHierarchy` y `onHierarchyChange`, si se declaran, devuelven `string` y se disparan |
| C18 | Con jerarquía activa, ningún componente no jerárquico suma nodos y hojas a la vez |

---

## 10. Pendientes

1. ⚠ Cerrar con la sonda: forma de las celdas de dimensión, propiedad y medida; `formatted` frente a `raw`; estado de carga del binding; orden de los miembros; llegada de jerarquías (nodos y padres).
2. Definir `design-guidelines.md`: catálogo de iconos SVG, tokens de espaciado y tipografía, y comportamiento dentro de los contenedores de SAC.
3. ⚠ Jerarquías (2.13 y 5.3): confirmar con la sonda cómo llegan nodos, padres y niveles; cómo se aplica la jerarquía elegida (A, B o C); y si expandir un nodo exige pedir más datos al origen.
4. Definir el comportamiento de jerarquías en gráficos (hoy solo se usan hojas o un nivel fijo).
5. Definir la jerarquía de **tiempo** en columnas (Año › Trimestre › Mes) en matrices.
6. Escritura al modelo en widgets `mixto`: por definir.
