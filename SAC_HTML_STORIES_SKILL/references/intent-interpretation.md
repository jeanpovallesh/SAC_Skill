# Interpretación del pedido (intent-interpretation)

Referencia para SAC_HTML_STORIES_SKILL. Explica cómo pasar de **texto libre del usuario + JSON de metadatos del modelo** a una **especificación** (`widget-spec-schema.md`) que luego genera los tres archivos.

```
pedido (texto) ─┐
                ├─► interpretar ─► especificación ─► confirmar con el usuario ─► generar y validar
metadatos del  ─┘
modelo (JSON)
```

Leyenda: ✅ decisión tomada con el usuario · 📘 regla de diseño del skill · ⚠ por afinar con modelos reales o con la sonda.

---

## 1. Principios

1. **Los ejemplos son referencia, no plantilla.** ✅ Los tableros de los ejemplos 01 y 02 enseñan composición, estilo y criterio. El resultado de un pedido nuevo sale del **pedido y del modelo**, no de copiar un ejemplo. Un ejemplo se usa para decidir qué componentes encajan, cómo se agregan los datos y qué se descarta.
2. **Cubrir todo lo que el pedido menciona.** 📘 Cada eje, medida, filtro y comportamiento pedido debe tener al menos un componente. Si falta, se agrega y se declara.
3. **Asumir y declarar; preguntar poco.** 📘 Se pregunta solo cuando la respuesta cambia los feeds, el contrato de salida o una coincidencia requerida es de baja confianza. Todo lo demás se resuelve con un valor por defecto y queda en `assumptions`.
4. **Solo lo que el modelo tiene.** 📘 Nada se inventa: ni dimensiones, ni medidas, ni textos de negocio.
5. **La especificación se muestra antes de generar.** 📘

## 2. Decisiones permanentes del usuario

Aplican a todo pedido, salvo que el usuario diga lo contrario en ese pedido.

| # | Regla | Origen |
|---|---|---|
| D1 | El widget es solo el **área de contenido**; navegación, encabezado, perfil y logo los resuelve la story | Ejemplo 01 |
| D2 | Los filtros del tablero son **filtros internos del widget** y consumen feeds | Ejemplo 01 |
| D3 | Los KPIs que dependen de datos no seguros son **opcionales**: se muestran solo si el modelo los aporta | Ejemplo 01 |
| D4 | **Sin insights**: no se generan observaciones, índices estadísticos ni textos analíticos, salvo petición explícita | Ejemplo 01 |
| D5 | Los ejemplos son **referencias de composición**, no moldes | Ejemplo 02 |
| D6 | Todos los modelos traen **dimensión de tiempo**; las medidas de saldo (inventario, puntos de venta) vienen **por periodo** y se tratan como semiaditivas | Ejemplo 02 |
| D7 | La **comparación entre periodos** solo se incluye si el usuario pide un tablero comparativo | Ejemplo 02 |
| D8 | Los filtros internos admiten **selección múltiple** (por defecto activa; `Periodo` es de selección única salvo que el pedido hable de varios periodos o pida comparar) | Catálogo de componentes |
| D9 | En captura, **no se duplican combinaciones** idénticas (comparación por ids) | Catálogo de componentes |
| D10 | En las **tablas**, el usuario puede elegir una jerarquía y los datos se muestran **de forma jerárquica** (árbol expandible) | Catálogo de componentes |
| D11 | **Filtros obligatorios de Versión y Tiempo**: aunque el pedido no los mencione, todo tablero lleva un filtro sobre la dimensión del modelo de tipo `version` y otro sobre la de tipo `time`, en todos los componentes (sin `appliesTo`). Ambos de **selección múltiple** (se necesita ver varias versiones a la vez, p. ej. Real vs Presupuesto/Proyección/Planning). Versión: sin "Todos", nunca queda vacío, por defecto el primer miembro. Tiempo: con "Todos" por defecto (las medidas de saldo usan `timeAgg`). Con varias versiones seleccionadas, un componente suma sus valores salvo que use `Version` como eje o serie; la comparación explícita entre versiones es `comparison.mode: versus-version` (D7). Se declara en `assumptions`. Se agregan con `scripts/add_mandatory_filters.py` | Pedido del usuario (2026-10-29) |

---

## 3. Entradas

### 3.1 JSON de metadatos del modelo

Esquema en `model-metadata-schema.md`. Antes de interpretar nada:

1. Validar que el JSON es válido y sigue el esquema.
2. Verificar `id` únicos y tipos permitidos.
3. Confirmar que existe al menos una dimensión de tipo `time` (D6). Si falta, avisar: es una anomalía del modelo.

### 3.2 Pedido del usuario

Puede llegar de dos formas:

- **Solo texto.** Se interpreta con las secciones 4 a 9.
- **Texto + HTML de referencia.** Se aplica además el procedimiento de la sección 10.

---

## 4. Paso 1: extraer la intención

Del texto se extraen estos elementos. Lo que no aparece queda vacío y se resuelve en el paso 4.

| Elemento | Pregunta que responde | Ejemplo en el ejemplo 01 |
|---|---|---|
| **Propósito** | ¿Qué decisión o análisis apoya? | "tablero de control de recursos humanos" |
| **Familia de widget** | ¿Muestra, captura, selecciona? | solo lectura |
| **Ejes** | ¿Por qué se desglosa? | grupo etario, departamentos |
| **Series** | ¿Qué se diferencia o compara? | hombres y mujeres |
| **Medidas o temas** | ¿Qué se mide? | (implícita: plantilla) |
| **Filtros** | ¿Qué recortes menciona? | (no los dice) |
| **Comparación** | ¿Pide comparar entre periodos o versiones? | no |
| **Comportamientos** | ¿Exporta, captura, enlaza selección? | no |
| **Estilo o restricciones** | ¿Colores, idioma, tamaño, qué excluir? | no |

### 4.1 Familia de widget

| Pista en el texto | Familia | Modo |
|---|---|---|
| tablero, dashboard, panel, reporte, indicadores, seguimiento, analizar, ver, mostrar, gráficos | Tablero analítico | `solo-lectura` |
| capturar, cargar, ingresar, registrar, alimentar, planificar, generar lista, armar combinaciones, enviar a la story | Captura | `captura` |
| seleccionar, elegir, filtrar, buscar, listado desplegable | Selector | `solo-lectura` (con método de salida si la story lo lee) |
| formulario, escribir al modelo, guardar | Entrada de datos | `mixto` ⚠ (escritura al modelo por definir) |
| un gráfico, una tabla, un KPI | Visual único | `solo-lectura` |

Si las pistas son contradictorias (por ejemplo "tablero" y "capturar"), el valor por defecto es `mixto` y se pregunta.

### 4.2 Lectura de preposiciones y conectores

| Expresión | Rol |
|---|---|
| "por X", "por X y por Y", "desglosado por", "según" | **Eje** (X, Y) |
| "diferenciación de A y B", "separado por género", "A vs B", "entre A y B" | **Serie** (la dimensión que contiene A y B) |
| "de/en/para <valor>", "solo de", "excluyendo" | **Filtro fijo** (valor concreto) |
| "filtrar por", "poder elegir", "con selector de" | **Filtro interno** (D2) |
| "para cada X", "una fila por X" | **Filas** de tabla o matriz |
| "evolución", "mensual", "a lo largo de", "tendencia" | **Eje de tiempo** |
| "comparativo", "vs periodo anterior", "variación", "crecimiento", "contra el año pasado" | **Comparación** (sección 8) |
| "top N", "los mayores", "ranking" | Orden y límite |
| "por país / zona / región" | Dimensión geográfica (ver 5.2) |
| "jerarquía", "por niveles", "árbol", "consolidado", "desglosable", "expandible", "con subtotales" | **Tabla jerárquica** (`options.tree`) sobre la dimensión mencionada, con `hierarchy.selectable`. En una tabla sobre una dimensión que tiene jerarquías en el modelo, el skill propone `tree` aunque no se diga (D10) y lo declara en `assumptions` |
| "seleccionar varias", "una o más", "múltiples" | Filtro con `multi: true` |

---

## 5. Paso 2: enlazar términos con el modelo

### 5.1 Procedimiento de coincidencia

1. **Normalizar** el término del usuario y los textos del modelo: minúsculas, sin tildes ni signos, quitar artículos y conectores, reducir plurales ("departamentos" → "departamento").
2. Probar en este orden:
   1. `id` exacto.
   2. `description` exacta.
   3. **Sinónimo** del diccionario (sección 5.3) que apunte a un `id` o `description` del modelo.
   4. **Solapamiento de palabras** (al menos la mitad de las palabras del término aparece en el `id` o la descripción).
   5. **Tipo semántico**: "fecha", "mes", "año" → dimensión `time`; "escenario", "real", "presupuesto" → `version`; "cuenta", "concepto", "rubro" → `account`.
3. Buscar también en las **propiedades** de cada dimensión ("cargo del empleado" → propiedad `Cargo` de `Empleado`).
4. Asignar **confianza**:

| Confianza | Cuándo | Acción |
|---|---|---|
| Alta | Pasos 1 o 2, o paso 3 con un único candidato | Usar y listar en la especificación |
| Media | Paso 3 con varios candidatos, o paso 4 | Usar el mejor, declarar en `assumptions` el candidato elegido y los descartados |
| Baja | Paso 5 o sin coincidencia | Elemento **requerido**: preguntar. Elemento **opcional**: omitir y declarar |

### 5.2 Casos frecuentes

- **Geografía.** "zona regional", "región", "territorio", "sede", "plaza", "ciudad" o "país" se enlazan con la dimensión cuyo `id` o descripción contenga esas palabras. "Un país" suele ser **contexto**, no un eje: el widget no lo fija. Si el modelo tiene una jerarquía geográfica, se usa la dimensión y la jerarquía queda como pendiente (⚠ cómo llegan nodos y padres en el binding se confirma con la sonda).
- **Género.** Se enlaza la dimensión y se determinan los miembros "mujeres" y "hombres" en `memberRoles`; los ids reales se confirman contra el modelo.
- **Medidas con tipo de unidad.** Si el término remite a un importe, se prefiere la medida con `unit: currency`; si remite a una cantidad, la de `unit: unit`.
- **Plurales y "y".** "canales y marcas" son **dos ejes**, no uno.
- **Dos candidatos del mismo tipo** (por ejemplo `Sociedad` y `Entidad`): preferir el de nombre más cercano al término; declarar el otro.

### 5.3 Diccionario semilla de sinónimos ⚠

Punto de partida. Se amplía con los modelos reales del usuario.

| Concepto | Sinónimos y variantes |
|---|---|
| Empleado | colaborador, persona, trabajador, plantilla, dotación, headcount, FTE |
| Género | sexo, hombres, mujeres, masculino, femenino |
| Grupo etario | edad, cohorte, rango de edad, generación, tramo etario |
| Departamento | área, gerencia, dirección, unidad, función |
| Zona regional | región, territorio, regional, plaza, sede, zona, comunidad, estado, provincia |
| Canal | canal de distribución, canal de venta, ruta al mercado, RTM |
| Marca / línea | producto, familia, categoría, portafolio, línea de producto |
| Periodo | fecha, tiempo, mes, trimestre, año, semestre, calendario |
| Versión | escenario, real, presupuesto, forecast, plan, proyección |
| Cuenta | concepto, rubro, partida |
| Sociedad / entidad | empresa, compañía, filial, razón social, unidad legal |
| Centro de costos | CeCo, centro de costo, centro de coste |
| Volumen | cantidad, unidades, cajas, toneladas, despachos |
| Facturación | ventas, ingresos, revenue, importe bruto |
| Margen | margen de contribución, rentabilidad, contribución |
| Coste | costo, gasto, opex |
| Retiros | bajas, salidas, desvinculaciones, rotación |

Las variantes en inglés (`employee`, `gender`, `region`, `channel`…) se tratan igual.

---

## 6. Paso 3: asignar roles

Cada elemento enlazado recibe un rol dentro de la especificación.

| Rol | Se convierte en |
|---|---|
| Eje | `uses.axis`, `uses.rows` o `uses.columns` de un componente |
| Serie | `uses.series` o `uses.split` |
| Medida | entrada de `measures` (con su agregación) |
| Filtro | entrada de `filters` (consume un feed) |
| Propiedad | feed de rol `property` |
| Tiempo | feed `Periodo`; filtro, eje o comparación |

**Agregación de cada medida** (⚠ se confirma contra el modelo):

| Tipo de medida | `aggregation` |
|---|---|
| Importes, cantidades, flujos del periodo | `additive` |
| Saldos y fotos: inventario, puntos de venta, headcount de cierre | `semi-additive` (D6) con `timeAgg: last` |
| Promedios y tasas | **`ratio`** con numerador y denominador aditivos |
| Un valor ya calculado sin componentes | `non-additive` (solo sin filtros activos; se declara) |

**Medida con sentido favorable.** Toda medida lleva `goodDirection`: `up` para ingresos, margen, retención; `down` para costes, mermas, tiempos de ciclo. Si no se sabe, `up` y se declara.

---

## 7. Paso 4: componer el tablero

### 7.1 Patrones de composición por defecto

Un pedido corto casi nunca enumera todos los componentes. El skill completa con el patrón que mejor encaja.

| Patrón | Se reconoce por | Composición |
|---|---|---|
| **P1. Diferenciación por serie** | "diferenciación de A y B por X y por Y" | KPIs con serie · una vista por cada eje (X, Y) · vista cruzada X × Y · filtros de contexto |
| **P2. Distribución y mezcla** | "distribución por zonas / canales / marcas" | KPIs de resumen · reparto (dona) · composición por eje (barras 100 %) · rentabilidad (burbujas, si hay medidas) · vista por cada eje mencionado · tabla de detalle |
| **P3. Comparativo** | "comparativo", "vs", "variación" | Tarjetas con variación · barras comparativas · tabla de variación (sección 8) |
| **P4. Captura** | ver sección 4.1 | Selectores con búsqueda · lista · carga de CSV · vista previa y descarga de JSON · contadores |
| **P5. Selector / filtro** | "con selector de" | Combobox con búsqueda por id, descripción o propiedad |
| **P6. Tendencia** | "evolución", "mensual" | Línea o barras por periodo · KPIs con último periodo |

Los patrones se combinan. Los componentes de los patrones P3 y P6 (`bar-compare`, `variance-table`, `line-trend`) están definidos en `widget-types.md`. Las tarjetas KPI no necesitan un tipo propio para las variaciones: las muestran cuando `comparison.appliesTo` las incluye.

### 7.2 Regla de cobertura 📘

Antes de mostrar la especificación se comprueba una tabla como esta:

| Elemento del pedido | Componente que lo cubre |
|---|---|
| eje "zonas regionales" | `barras100Zona`, `matrizZonaMarca` |
| eje "canales" | `donaCanales`, `burbujasCanales` |
| eje "líneas/marcas" | `barrasMarca`, `matrizZonaMarca` |

Una fila sin componente es un error: se agrega el componente o se declara por qué no se cubre. (En el ejemplo 02, el HTML de referencia no tenía vista por marca; la especificación la añadió.)

### 7.3 Lo que no se genera (D4) 📘

- Observaciones, hallazgos, recomendaciones y cualquier texto analítico.
- Índices estadísticos (Gini, Herfindahl, Blau).
- Textos de negocio fijos (pies legales, notas de cumplimiento).
- Etiquetas calificativas por fila ("Ruta crítica", "SLA cumplido"): se reemplazan por estados calculados con umbrales editables, o se omiten.
- Datos de maestro (operador, contrato) salvo que existan como propiedad y el usuario las pida.

Si el usuario pide expresamente alguno de estos, se genera **solo si es derivable de los datos** y se declara cómo se calcula.

### 7.4 Elementos opcionales (D3) 📘

Un componente se vuelve opcional (`requires`) cuando depende de una medida, dimensión o propiedad que el modelo puede no tener, o cuya coincidencia es de confianza media o baja. Si el elemento falta en el Builder, el componente no se dibuja y no hay error. Los feeds opcionales van al final del orden.

---

## 8. Comparación entre periodos (D7)

### 8.1 Cuándo se incluye

Solo si el pedido contiene una pista de comparación:

| Pista | `mode` |
|---|---|
| "comparativo", "vs periodo anterior", "variación", "crecimiento", "contra el mes anterior" | `previous-period` |
| "contra el año pasado", "interanual", "YoY" | `same-period-last-year` |
| "comparar enero con marzo", "elegir dos periodos" | `selected-pair` |
| "real vs presupuesto", "contra el plan" | `versus-version` ⚠ confirmar con el usuario (misma lógica sobre `Version`; es común en modelos de planificación) |

Sin pista, **no** se incluyen variaciones; los KPIs se comparan solo contra la meta (si existe).

### 8.2 Efecto en la especificación

- Aparece la sección `comparison` (ver `widget-spec-schema.md`, sección 10.1).
- `Periodo` es un feed **requerido** y ordenado. Todos los modelos lo traen (D6), pero hay que agregarlo al Builder.
- El binding debe traer **ambos periodos**. El widget avisa si solo llega uno.
- Cada periodo se reduce por separado (con `timeAgg` si hay semiaditivas) y después se calcula la diferencia.
- Variación: absoluta para importes y cantidades, relativa (%) para cambios proporcionales, en **puntos** para tasas.
- El color de la variación depende de `goodDirection`: un coste que sube es desfavorable.

### 8.3 Qué componentes cambian

| Componente | Con comparación |
|---|---|
| Tarjeta KPI | Valor actual + variación contra el periodo base |
| Barras / pirámide | Serie del periodo base junto a la actual, o marcador de referencia |
| Tabla / matriz | Columnas de valor base, valor actual y variación |
| Dona | Se mantiene para el periodo actual; la variación va en la leyenda |

---

## 9. Cuándo preguntar

Preguntar solo en estos casos (máximo **3 preguntas**, cortas, cada una con una opción por defecto):

| Caso | Ejemplo |
|---|---|
| Una coincidencia **requerida** es de confianza baja | "¿'Retiros' corresponde a la medida `Bajas` o a `Salidas_Voluntarias`?" |
| Las pistas de modo son contradictorias | "¿El widget solo muestra datos o también genera una lista para enviar a la story?" |
| La respuesta cambia los feeds o el contrato de salida | "¿Los ids de género son `F` y `M`?" |
| El pedido incluye un **mapa** | "¿De qué dimensión y de qué propiedades salen la latitud y la longitud, y en qué país se dibuja?" (obligatorio: el contorno y las coordenadas no se inventan) |
| El pedido incluye una **tabla dinámica** | "¿Qué dimensiones van en filas, cuáles en columnas y qué medidas?" (las indica el usuario; cada tabla puede variar) |
| Hay dos interpretaciones válidas de "comparativo" | "¿Comparar contra el periodo anterior o contra una versión?" |

**No** se pregunta por: estilo, orden de componentes, textos, colores, umbrales (van como propiedades editables), ni por elementos opcionales.

---

## 10. Cuando el usuario aporta un HTML de referencia

Procedimiento aplicado en los ejemplos 01 y 02:

1. **Inventariar** los componentes del HTML (tarjetas, gráficos, tablas, filtros, controles).
2. **Clasificar** cada uno en un tipo del catálogo (`widget-types.md`).
3. **Separar** lo que es navegación o decoración (barra lateral, encabezado, perfil, logo): se descarta (D1).
4. **Identificar el contenido no derivable**: textos de negocio, insights, índices, etiquetas por fila, datos de maestro. Se descartan o se sustituyen (D4).
5. **Detectar inconsistencias** internas (por ejemplo, dos valores para la misma meta) y unificarlas en una propiedad.
6. **Detectar lo fijo** (país, moneda, región, nombres de canal) y reemplazarlo por datos del modelo.
7. **Comparar con el pedido** (regla de cobertura): ¿hay un eje mencionado sin vista? Se completa.
8. **Reemplazar los recursos externos**: CSS incrustado, iconos SVG en línea, fuentes con alternativa.
9. Conservar la **paleta y la tipografía** como `theme`, y la **composición** como guía (D5).
10. Documentar lo descartado y lo añadido en una tabla, como en los ejemplos.

---

## 11. Qué se le muestra al usuario antes de generar

Resumen breve (no el JSON completo, que queda disponible si lo pide):

```
Widget: <nombre> · modo <solo-lectura | captura | mixto>

Orden de feeds en el Builder de SAC:
  1) ...  2) ...  3) ... (opcional)
Medidas: <requeridas> · <opcionales>

Componentes: <lista con una línea cada uno, marcando los opcionales>
Filtros internos: <lista>
Comparación: <sí/no y modo>
Propiedades editables: <lista corta>

Supuestos: <lista>
Preguntas abiertas: <0 a 3, cada una con su valor por defecto>
```

El usuario confirma o corrige, y recién entonces se generan los archivos y se valida el paquete.

---

## 12. Dos casos resueltos (resumen)

### 12.1 "…diferenciación de hombres y mujeres por grupo etario y por departamentos" → `examples/01-rrhh-demografia-genero.md`

| Extraído | Valor |
|---|---|
| Familia | Tablero analítico (P1), solo lectura |
| Serie | Género |
| Ejes | Grupo etario, Departamento |
| Filtros | No dichos; se agregan Sede, Contrato y Periodo por contexto (D2) |
| Comparación | No |
| Resultado | KPIs · pirámide etaria · barras por departamento · matriz cruzada |

### 12.2 "…tablero de distribuciones por zonas regionales de un país. Gráficos con canales de distribución y por líneas/marcas" → `examples/02-scm-distribucion-zonas-canales.md`

| Extraído | Valor |
|---|---|
| Familia | Tablero analítico (P2), solo lectura |
| Ejes | Zona regional, Canal, Línea/Marca |
| Serie | Canal (en composiciones) |
| Filtros | Periodo (D6) |
| Comparación | No |
| Cobertura | La vista por marca no existía en el HTML de referencia; se agrega |
| Resultado | KPIs · dona · burbujas · barras 100 % por zona y por marca · matriz Zona × Marca · KPIs operativos opcionales · tabla de detalle |

---

## 13. Errores a evitar

| Error | Consecuencia |
|---|---|
| Copiar un ejemplo en lugar de interpretar el pedido | Tableros que no responden al pedido ni al modelo |
| Inventar un elemento que el modelo no tiene | Widget que no carga datos |
| No cubrir un eje mencionado | El usuario no ve lo que pidió |
| Sumar saldos entre periodos | Cifras infladas |
| Promediar promedios con filtros activos | Cifras incorrectas |
| Fijar país, moneda o textos de negocio | Widget que solo sirve para un caso |
| Preguntar por todo | Fricción innecesaria |
| Generar insights no pedidos | Texto sin respaldo en los datos |
| Incluir variaciones sin que el usuario pida comparar | Datos adicionales y feeds de más |
| Dar la misma serie un color distinto en cada gráfico | Tablero ilegible |

---

## 14. Pendientes

1. Ampliar el diccionario de sinónimos con los modelos reales del usuario (sección 5.3).
2. Confirmar la forma en que llegan las jerarquías (nodos, padres) con la sonda.
3. Validar con datos reales los componentes de los patrones P3 y P6 (definidos en `widget-types.md`, aún sin ejemplo).
4. Decidir si "real vs presupuesto" (comparación entre versiones) entra como modo de comparación estándar.
5. Definir cómo se escribe al modelo en widgets de entrada de datos (`mixto`).
